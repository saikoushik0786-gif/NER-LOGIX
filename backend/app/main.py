from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List

from .database import Base, engine
from .services.risk_engine import calculate_risk
from .services.route_optimizer import optimize_routes


# =========================================================
# DATABASE
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="NER-LOGIX API",
    description=(
        "AI-Powered Logistics and Accessibility "
        "Intelligence Platform for North Eastern Region"
    ),
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "NER-LOGIX",
        "message": "Backend is running successfully",
    }


# =========================================================
# AI RISK PREDICTION
# =========================================================

class RiskRequest(BaseModel):
    rainfall: float = Field(
        default=0,
        ge=0,
        le=100,
        description="Rainfall severity from 0 to 100",
    )

    road_damage: float = Field(
        default=0,
        ge=0,
        le=100,
        description="Road damage severity from 0 to 100",
    )

    landslide_history: float = Field(
        default=0,
        ge=0,
        le=100,
        description="Historical landslide risk from 0 to 100",
    )

    traffic: float = Field(
        default=0,
        ge=0,
        le=100,
        description="Traffic congestion from 0 to 100",
    )

    terrain: float = Field(
        default=0,
        ge=0,
        le=100,
        description="Terrain difficulty from 0 to 100",
    )


@app.post("/api/risk/predict")
def predict_risk(data: RiskRequest):

    result = calculate_risk(
        data.model_dump()
    )

    return {
        "success": True,
        **result,
    }


# =========================================================
# ROUTE OPTIMIZER
# =========================================================

class RouteCandidate(BaseModel):
    route_id: str

    name: str

    distance_km: float = Field(
        ge=0,
        description="Route distance in kilometres",
    )

    estimated_minutes: float = Field(
        ge=0,
        description="Estimated travel time in minutes",
    )

    delay_minutes: float = Field(
        ge=0,
        description="Expected additional delay in minutes",
    )

    risk_score: float = Field(
        ge=0,
        le=100,
        description="AI route risk score",
    )

    road_condition: str = Field(
        default="Good",
        description="Current road condition",
    )


class RouteOptimizationRequest(BaseModel):

    origin: str

    destination: str

    routes: List[RouteCandidate]


@app.post("/api/routes/optimize")
def optimize_route(
    request: RouteOptimizationRequest,
):

    result = optimize_routes(
        origin=request.origin,
        destination=request.destination,
        routes=[
            route.model_dump()
            for route in request.routes
        ],
    )

    return result


# =========================================================
# ROOT ENDPOINT
# =========================================================

@app.get("/")
def root():
    return {
        "application": "NER-LOGIX",
        "status": "running",
        "version": "1.0.0",
        "modules": [
            "AI Risk Prediction",
            "Route Optimization",
        ],
        "docs": "/docs",
    }