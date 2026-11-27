import base64
import io
import json
import os
import re
import xml.etree.ElementTree as ET
import zipfile
from typing import Any, Dict, List, Literal, Optional
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

app = FastAPI(title="EV SmartGrid 2030 BMS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TelemetryInput(BaseModel):
    total_input_kw: float = 120.0
    traction_soc: float = 64.0
    aux_soc: float = 82.0
    grid_demand_pct: float = 55.0

@app.get("/api/health")
def health_check():
    return {"status": "online", "system": "EV SmartGrid 2030 BMS Engine"}

@app.post("/api/bms/allocate")
def allocate_dual_bank(data: TelemetryInput):
    throttle_factor = 0.75 if data.grid_demand_pct > 85 else 1.0
    effective_kw = round(data.total_input_kw * throttle_factor, 2)

    traction_kw = round(effective_kw * 0.80, 2)
    aux_kw = round(effective_kw * 0.20, 2)

    traction_remaining_kwh = max(0.0, (100 - data.traction_soc) * 0.75)
    aux_remaining_kwh = max(0.0, (100 - data.aux_soc) * 0.15)

    traction_eta_mins = round((traction_remaining_kwh / traction_kw) * 60, 1) if traction_kw > 0 else 0
    aux_eta_mins = round((aux_remaining_kwh / aux_kw) * 60, 1) if aux_kw > 0 else 0

    return {
        "effective_input_kw": effective_kw,
        "throttled": throttle_factor < 1.0,
        "allocation": {
            "main_traction_bank_kw": traction_kw,
            "main_traction_share": "80%",
            "traction_eta_mins": traction_eta_mins,
            "auxiliary_bank_kw": aux_kw,
            "auxiliary_share": "20%",
            "aux_eta_mins": aux_eta_mins,
        },
        "grid_status": "PEAK_THROTTLED" if throttle_factor < 1.0 else "OPTIMAL_FLOW"
    }

@app.post("/api/ai/advise")
async def ai_grid_advisor(data: TelemetryInput):
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured on server")

    prompt = (
        f"You are the EV SmartGrid 2030 AI BMS Controller. Analyze this live telemetry and give "
        f"a crisp 2-sentence engineering recommendation: Input={data.total_input_kw}kW, "
        f"Traction Bank (80% split) SoC={data.traction_soc}%, Aux Bank (20% split) SoC={data.aux_soc}%, "
        f"Grid Load={data.grid_demand_pct}%."
    )

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
            json={
                "model": "openai/gpt-oss-20b",
                "messages": [{"role": "user", "content": prompt}],
                "max_completion_tokens": 500,
                "reasoning_effort": "low",
                "temperature": 0.3
            }
        )
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=res.text)
        reply = res.json()["choices"][0]["message"]["content"]
        return {"recommendation": reply}


# ─────────────────────────────────────────────
#  P2P ENERGY TRANSFER  POST /api/p2p/transfer
# ─────────────────────────────────────────────

PACK_CAPACITY_KWH = 72.0  # Assumed pack size for all EVs
PLATFORM_FEE_PCT  = 0.05  # 5% service fee
MIN_RESERVE_KWH   = 5.0   # Seller must keep at least 5 kWh reserve


class P2PTransferRequest(BaseModel):
    seller_id:     str   = Field(..., description="Vehicle ID of the seller")
    buyer_id:      str   = Field(..., description="Vehicle ID of the buyer")
    seller_soc:    float = Field(..., ge=0, le=100, description="Seller's current SoC %")
    buyer_soc:     float = Field(..., ge=0, le=100, description="Buyer's current SoC %")
    energy_kwh:    float = Field(..., gt=0, description="Energy to transfer in kWh")
    price_per_kwh: float = Field(..., gt=0, description="Agreed price in ₹ per kWh")

    @validator("energy_kwh")
    def energy_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("energy_kwh must be positive")
        return v


class P2PTransferResponse(BaseModel):
    seller_id:        str
    buyer_id:         str
    energy_kwh:       float
    price_per_kwh:    float
    base_amount:      float
    service_fee:      float
    buyer_total:      float
    seller_receives:  float
    seller_soc_after: float
    buyer_soc_after:  float
    status:           str


@app.post("/api/p2p/transfer", response_model=P2PTransferResponse)
def p2p_transfer(req: P2PTransferRequest):
    # ── Validation ──────────────────────────────
    if req.seller_id == req.buyer_id:
        raise HTTPException(
            status_code=400,
            detail="Seller and Buyer must be different vehicles."
        )

    seller_kwh_available = (req.seller_soc / 100.0) * PACK_CAPACITY_KWH
    if req.energy_kwh > (seller_kwh_available - MIN_RESERVE_KWH):
        max_transferable = max(0.0, seller_kwh_available - MIN_RESERVE_KWH)
        raise HTTPException(
            status_code=422,
            detail=(
                f"{req.seller_id} only has {seller_kwh_available:.1f} kWh available. "
                f"Maximum transferable (keeping {MIN_RESERVE_KWH} kWh reserve): "
                f"{max_transferable:.1f} kWh."
            )
        )

    # ── Calculations ────────────────────────────
    base_amount     = round(req.energy_kwh * req.price_per_kwh, 2)
    service_fee     = round(base_amount * PLATFORM_FEE_PCT, 2)
    buyer_total     = round(base_amount + service_fee, 2)
    seller_receives = round(base_amount - service_fee, 2)

    seller_soc_after = round(
        ((seller_kwh_available - req.energy_kwh) / PACK_CAPACITY_KWH) * 100, 1
    )
    buyer_kwh_before = (req.buyer_soc / 100.0) * PACK_CAPACITY_KWH
    buyer_soc_after  = round(
        min(100.0, ((buyer_kwh_before + req.energy_kwh) / PACK_CAPACITY_KWH) * 100), 1
    )

    return P2PTransferResponse(
        seller_id        = req.seller_id,
        buyer_id         = req.buyer_id,
        energy_kwh       = round(req.energy_kwh, 2),
        price_per_kwh    = round(req.price_per_kwh, 2),
        base_amount      = base_amount,
        service_fee      = service_fee,
        buyer_total      = buyer_total,
        seller_receives  = seller_receives,
        seller_soc_after = seller_soc_after,
        buyer_soc_after  = buyer_soc_after,
        status           = "confirmed"
    )


# ─────────────────────────────────────────────
#  NEURO TWIN AI CO-PILOT  POST /api/chat
# ─────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=8000)


AllowedNeuroModel = Literal[
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
]

VISION_FALLBACK_MODELS = [
    "qwen/qwen3.8-27b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
]

MAX_DOC_CHARS = 4500


class NeuroChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1, max_length=25)
    telemetry: Optional[Dict[str, Any]] = None
    memories: Optional[List[str]] = None
    mode: Literal["chat", "extract_memory"] = "chat"
    model: AllowedNeuroModel = "openai/gpt-oss-20b"
    image_base64: Optional[str] = Field(default=None, max_length=6_000_000)
    images_base64: Optional[List[str]] = Field(default=None, max_length=3)
    file_text: Optional[str] = Field(default=None, max_length=10000)
    file_base64: Optional[str] = Field(default=None, max_length=8_000_000)
    file_name: Optional[str] = Field(default=None, max_length=160)


def _extract_document_text(
    file_name: Optional[str],
    file_text: Optional[str],
    file_base64: Optional[str],
) -> str:
    if file_text:
        return file_text.strip()[:MAX_DOC_CHARS]
    if not file_base64:
        return ""

    b64_data = file_base64.strip()
    if "," in b64_data and b64_data.lower().startswith("data:"):
        b64_data = b64_data.split(",", 1)[1]

    try:
        raw_bytes = base64.b64decode(b64_data, validate=False)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 document payload.")

    ext = os.path.splitext((file_name or "").lower())[1]

    if ext == ".pdf":
        if PdfReader is None:
            raise HTTPException(status_code=500, detail="pypdf dependency is not installed on server.")
        try:
            reader = PdfReader(io.BytesIO(raw_bytes))
            pages = [page.extract_text() or "" for page in reader.pages]
            extracted = re.sub(r"\n{3,}", "\n\n", "\n".join(pages)).strip()
            return (extracted or "[PDF contained no extractable text]")[:MAX_DOC_CHARS]
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Unable to parse PDF file: {exc}")

    if ext == ".docx":
        try:
            with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
                if "word/document.xml" not in zf.namelist():
                    raise ValueError("Missing word/document.xml")
                xml_bytes = zf.read("word/document.xml")
            root = ET.fromstring(xml_bytes)
            paragraphs: List[str] = []
            for p in root.iter():
                if p.tag.endswith("}p") or p.tag == "p":
                    texts = [
                        t.text
                        for t in p.iter()
                        if (t.tag.endswith("}t") or t.tag == "t") and t.text
                    ]
                    if texts:
                        paragraphs.append("".join(texts))
            extracted = "\n".join(paragraphs).strip()
            return (extracted or "[DOCX contained no extractable text]")[:MAX_DOC_CHARS]
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Unable to parse DOCX file: {exc}")

    if ext == ".pptx":
        try:
            with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
                slide_names = [
                    n for n in zf.namelist()
                    if re.match(r"^ppt/slides/slide\d+\.xml$", n)
                ]
                slide_names.sort(
                    key=lambda name: int(re.search(r"slide(\d+)\.xml$", name).group(1))
                )
                slides_out: List[str] = []
                for idx, slide_name in enumerate(slide_names, start=1):
                    root = ET.fromstring(zf.read(slide_name))
                    texts = [
                        t.text.strip()
                        for t in root.iter()
                        if (t.tag.endswith("}t") or t.tag == "t") and t.text and t.text.strip()
                    ]
                    if texts:
                        slides_out.append(f"[Slide {idx}] " + " ".join(texts))
            extracted = "\n".join(slides_out).strip()
            return (extracted or "[PPTX contained no extractable text]")[:MAX_DOC_CHARS]
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Unable to parse PPTX file: {exc}")

    return raw_bytes.decode("utf-8", errors="ignore").strip()[:MAX_DOC_CHARS]


def _parse_memory_bullets(raw_text: str) -> List[str]:
    text = raw_text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(line for line in lines if not line.strip().startswith("```")).strip()
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()][:8]
    except Exception:
        pass
    # Fallback: parse clean bullet lines
    items: List[str] = []
    for line in text.splitlines():
        cleaned = line.strip().lstrip("-*•0123456789. ").strip()
        if cleaned and len(cleaned) > 3:
            items.append(cleaned[:140])
    return items[:8]


@app.post("/api/chat")
async def neuro_twin_chat(req: NeuroChatRequest):
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured on server")

    existing_memories = [m.strip() for m in (req.memories or []) if m and m.strip()][:15]

    if req.mode == "extract_memory":
        transcript = "\n".join(
            f"{m.role.upper()}: {m.content.strip()}" for m in req.messages[-12:]
        )
        existing_block = "\n".join(f"- {m}" for m in existing_memories) or "None"
        extract_prompt = (
            "Extract ONLY durable personal/contextual memories from this conversation: "
            "1) contacts or people mentioned (names, roles, EV IDs/assignments), "
            "2) user preferences (preferred stations, charging thresholds, pricing), "
            "3) key facts worth recalling in future separate chats. "
            "Do NOT include ephemeral telemetry numbers or facts already in EXISTING_MEMORIES. "
            "Return ONLY a JSON array of 0 to 4 ultra-concise 1-line strings (each <= 95 chars). "
            "If nothing new is worth remembering, return [].\n\n"
            f"EXISTING_MEMORIES:\n{existing_block}\n\n"
            f"CONVERSATION:\n{transcript}"
        )

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "openai/gpt-oss-20b",
                        "messages": [{"role": "user", "content": extract_prompt}],
                        "max_completion_tokens": 280,
                        "reasoning_effort": "low",
                        "temperature": 0.1,
                    },
                )
        except (httpx.TimeoutException, httpx.RequestError):
            return {"memories": [], "model": "openai/gpt-oss-20b"}

        if res.status_code != 200:
            return {"memories": [], "model": "openai/gpt-oss-20b"}

        raw_mem = res.json()["choices"][0]["message"]["content"]
        return {"memories": _parse_memory_bullets(raw_mem), "model": "openai/gpt-oss-20b"}

    user_count = sum(1 for m in req.messages if m.role == "user")
    if user_count > 10:
        raise HTTPException(
            status_code=429,
            detail="Session limit reached (10/10 user messages). Start a new thread to continue."
        )

    telemetry_json = json.dumps(req.telemetry or {}, separators=(",", ":"))
    memories_block = (
        "\n".join(f"- {m}" for m in existing_memories)
        if existing_memories
        else "None stored yet."
    )
    system_prompt = (
        "You are Neuro Twin, a warm, sharp, human-like engineering and spatial co-pilot "
        "embedded inside the 'EV SmartGrid 2030 – 3D Spatial Control Center' web application. "
        "CREATOR IDENTITY: Your creator is Sudarshan, the architect of the EV SmartGrid 2030 – 3D Spatial Control Center. "
        "Whenever asked who created, built, designed, or trained you, acknowledge Sudarshan naturally and proudly—"
        "do not bring this up unnecessarily on unrelated queries. "
        "CRITICAL: You DO have persistent cross-chat memory via PERSISTENT_USER_MEMORY below. "
        "NEVER say you lack access to prior conversations. Whenever asked about previous chats, contacts, or saved facts, "
        "directly use the items in PERSISTENT_USER_MEMORY (or state clearly if empty). "
        "REGIONAL GRID CONTEXT: You operate across the **Chennai Metro Zone** (Tamil Nadu · Karnataka · Kerala Grid), serving three hubs: "
        "`A - Chennai TN` (Chennai OMR Corridor, Tamil Nadu · 150 kW Fast), `B - Bengaluru KA` (Bengaluru Electronic City, Karnataka · 240 kW Ultra-Fast), "
        "and `C - Kochi KL` (Kochi Infopark Solar Hub, Kerala · 80 kW 100% Solar). Default supercar fleet starts with **Vehicle 1** (Sudarshan · Porsche Taycan Turbo S) "
        "and **Vehicle 2** (Tanay · Maserati GranTurismo Folgore). "
        "You can answer both EV SmartGrid 2030 operational/calculation questions (using the live telemetry JSON below), "
        "uploaded screenshots/files, AND general engineering, EV physics, coding, or everyday questions naturally and concisely. "
        "FORMATTING RULE: NEVER output raw markdown pipe tables (| col | col |) and NEVER use single asterisks (*label*) for emphasis or labels. "
        "Always format structured comparisons, breakdowns, and metrics using crisp bulleted lists (`- ` prefix) with **double-asterisk bold lead-ins** (e.g., `- **Battery SoC:** 78%`). "
        "Use ₹ (Indian Rupees) for currency and kW/kWh/SoC/SoH units cleanly. "
        "When your answer focuses on a specific 3D scene tab, append a single tag at the very end on its own line in the exact format "
        "[[INSPECT:<tab_id>]] where <tab_id> is one of: dashboard, vehicles, stations, charging, energy, battery, sell-charge. "
        "Only include [[INSPECT:...]] when a 3D visual inspection in that tab is genuinely helpful. "
        "CONVERSATIONAL VEHICLE REGISTRATION: Whenever the user asks you to add, register, or onboard one or more EV vehicles into the fleet "
        "(e.g. 'Add my Porsche Taycan Turbo S for Sudarshan at Kochi KL with 78% battery'), confirm clearly in prose and append one exact JSON action tag "
        "per vehicle at the very end on its own line: "
        "[[ADD_EV:{\"model\":\"...\",\"owner\":\"...\",\"soc\":78,\"station\":\"C - Kochi KL\",\"status\":\"Charging\",\"chargeRate\":250,\"range\":410}]] "
        "using realistic defaults for any omitted fields (station one of 'A - Chennai TN', 'B - Bengaluru KA', 'C - Kochi KL'; status 'Charging', 'Connected', or 'Ready'; "
        "default soc 65, realistic range in km, realistic chargeRate in kW). Omit \"id\" unless the user gave one so sequential IDs (Vehicle 3, Vehicle 4, ...) are auto-assigned. "
        "CONVERSATIONAL VEHICLE REMOVAL: Whenever the user asks you to delete, remove, or unregister one or more EV vehicles from the fleet "
        "(by ID, model, or owner), confirm clearly in prose and append one exact JSON action tag per vehicle on its own line at the end: "
        "[[DELETE_EV:{\"query\":\"Vehicle 2\"}]] (match the vehicle's ID, model, or owner string from LIVE_TELEMETRY_SNAPSHOT). Never delete the last remaining vehicle.\n\n"
        f"PERSISTENT_USER_MEMORY:\n{memories_block}\n\n"
        f"LIVE_TELEMETRY_SNAPSHOT={telemetry_json}"
    )

    extracted_doc_text = _extract_document_text(req.file_name, req.file_text, req.file_base64)
    all_images = [img for img in (req.images_base64 or []) if img][:3]
    if not all_images and req.image_base64:
        all_images = [req.image_base64]

    trimmed_history = req.messages[-20:]
    groq_messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]

    for idx, m in enumerate(trimmed_history):
        is_last_user = idx == len(trimmed_history) - 1 and m.role == "user"
        text_content = m.content
        if is_last_user and extracted_doc_text:
            label = req.file_name or "attached_file"
            text_content = f"{text_content}\n\n[Attached File: {label}]\n{extracted_doc_text}"

        if is_last_user and all_images:
            content_parts: List[Dict[str, Any]] = [{"type": "text", "text": text_content}]
            for raw_img in all_images:
                img_url = raw_img
                if not img_url.startswith("data:image/"):
                    img_url = f"data:image/jpeg;base64,{img_url}"
                content_parts.append({"type": "image_url", "image_url": {"url": img_url}})
            groq_messages.append({"role": "user", "content": content_parts})
        else:
            groq_messages.append({"role": m.role, "content": text_content})

    if all_images:
        candidate_models = []
        if req.model in VISION_FALLBACK_MODELS:
            candidate_models.append(req.model)
        for vm in VISION_FALLBACK_MODELS:
            if vm not in candidate_models:
                candidate_models.append(vm)
    else:
        candidate_models = [req.model]

    last_error_status = 500
    last_error_detail = "Unknown Groq API error"

    for model_candidate in candidate_models:
        payload: Dict[str, Any] = {
            "model": model_candidate,
            "messages": groq_messages,
            "max_completion_tokens": 900,
            "temperature": 0.4,
        }
        if model_candidate.startswith("openai/gpt-oss"):
            payload["reasoning_effort"] = "low"

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Groq AI service timed out. Please retry.")
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail=f"Network error contacting Groq API: {exc}")

        if res.status_code == 200:
            data = res.json()
            reply = data["choices"][0]["message"]["content"]
            return {"reply": reply, "model": model_candidate, "model_used": model_candidate}

        if res.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Groq rate limit reached briefly. Please wait a moment and retry."
            )

        last_error_status = res.status_code
        last_error_detail = res.text
        lower_err = res.text.lower()
        is_model_fallback_eligible = (
            bool(all_images)
            and res.status_code in (400, 403, 404)
            and any(
                token in lower_err
                for token in (
                    "model_not_found",
                    "model_decommissioned",
                    "does not exist",
                    "not found",
                    "access",
                    "permission",
                    "not supported",
                    "unavailable",
                )
            )
        )
        if is_model_fallback_eligible:
            continue
        raise HTTPException(status_code=res.status_code, detail=res.text)

    raise HTTPException(status_code=last_error_status, detail=last_error_detail)
