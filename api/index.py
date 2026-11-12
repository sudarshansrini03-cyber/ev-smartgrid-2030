import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
                "model": "llama-3.1-8b-instant",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 120,
                "temperature": 0.3
            }
        )
        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=res.text)
        reply = res.json()["choices"][0]["message"]["content"]
        return {"recommendation": reply}
