from typing import Dict, List


def calculate_route_score(
    risk_score: float,
    distance_km: float,
    base_delay_minutes: float,
) -> float:
    """
    Calculate a route safety score.
    Lower score = better route.
    """

    risk_component = risk_score * 0.70
    distance_component = min(distance_km, 500) * 0.05
    delay_component = min(base_delay_minutes, 180) * 0.25

    score = risk_component + distance_component + delay_component

    return round(score, 2)


def optimize_routes(
    origin: str,
    destination: str,
    routes: List[Dict],
) -> Dict:
    """
    Compare candidate routes and select the safest practical route.
    """

    if not routes:
        return {
            "success": False,
            "message": "No routes available for optimization.",
        }

    evaluated_routes = []

    for route in routes:
        risk_score = float(route.get("risk_score", 50))
        distance_km = float(route.get("distance_km", 0))
        base_delay = float(route.get("delay_minutes", 0))

        route_score = calculate_route_score(
            risk_score,
            distance_km,
            base_delay,
        )

        evaluated_routes.append(
            {
                **route,
                "optimization_score": route_score,
            }
        )

    # Lowest optimization score is the safest practical route.
    evaluated_routes.sort(
        key=lambda route: route["optimization_score"]
    )

    selected_route = evaluated_routes[0]

    return {
        "success": True,
        "origin": origin,
        "destination": destination,
        "selected_route": selected_route,
        "alternatives": evaluated_routes,
        "message": (
            f"Safer route identified from {origin} "
            f"to {destination}."
        ),
    }