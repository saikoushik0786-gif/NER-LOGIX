from typing import List

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.route_optimizer import optimize_routes


router = APIRouter(
    prefix="/api/routes",
    tags=["Route Optimizer"],
)


class RouteCandidate(BaseModel):
    route_id: str
    name: str

    distance_km: float = Field(
        ge=0,
        description="Route distance in kilometres",
    )

    estimated_minutes: float = Field(
        ge=0,
        description="Estimated travel time",
    )

    delay_minutes: float = Field(
        ge=0,
        description="Expected additional delay",
    )

    risk_score: float = Field(
        ge=0,
        le=100,
        description="AI route risk score",
    )

    road_condition: str = "Good"


class RouteOptimizationRequest(BaseModel):
    origin: str
    destination: str

    routes: List[RouteCandidate]


@router.post("/optimize")
def optimize_route(request: RouteOptimizationRequest):

    result = optimize_routes(
        origin=request.origin,
        destination=request.destination,
        routes=[
            route.model_dump()
            for route in request.routes
        ],
    )

    return result