import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator

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
