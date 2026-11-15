"""
SehatLine ML priority service (FastAPI) — now powered by the SehatLine
PyTorch deep-learning package.

    from SehatLine import SehatLine

Endpoints:
  GET  /health              → liveness + active engine
  POST /score               → score ONE patient
  POST /prioritize          → score + RANK a batch (the booking-rush case)

If the trained weights (or torch) are missing, the SehatLine package
transparently falls back to the clinical rule scorer, so the service is
always available.

Run:  uvicorn server:app --host 127.0.0.1 --port 8000
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

from SehatLine import SehatLine
from SehatLine.core import FEATURES

MODEL = SehatLine()


class Patient(BaseModel):
    id: Optional[str] = None
    age: Optional[float] = 0
    conditions: Optional[List[str]] = []
    systolic: Optional[float] = 0
    diastolic: Optional[float] = 0
    heartRate: Optional[float] = 0
    spo2: Optional[float] = 0
    bloodSugar: Optional[float] = 0
    temperature: Optional[float] = 0
    isPregnant: Optional[bool] = False
    hasDisability: Optional[bool] = False
    daysSinceLastVisit: Optional[float] = 0
    missedAppointments: Optional[float] = 0


class Batch(BaseModel):
    patients: List[Patient]


app = FastAPI(title="SehatLine Priority ML Service", version="2.0.0")


def _d(m):
    # pydantic v2 renamed .dict() -> .model_dump() (dict() is deprecated)
    return m.model_dump() if hasattr(m, "model_dump") else m.dict()


@app.get("/health")
def health():
    return {"ok": True, "engine": MODEL.engine, "features": FEATURES}


@app.post("/score")
def score(p: Patient):
    return MODEL.score(_d(p))


@app.post("/prioritize")
def prioritize(batch: Batch):
    return MODEL.prioritize([_d(p) for p in batch.patients])
