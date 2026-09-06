def clamp(value: float) -> float:
    """Keep a value between 0 and 100."""
    return max(0.0, min(100.0, value))


def calculate_risk(data: dict) -> dict:
    """
    AI-style logistics risk scoring engine.

    Factors:
    - Rainfall: 30%
    - Road damage: 25%
    - Landslide history: 20%
    - Traffic: 10%
    - Terrain difficulty: 15%
    """

    rainfall = clamp(float(data.get("rainfall", 0)))
    road_damage = clamp(float(data.get("road_damage", 0)))
    landslide_history = clamp(float(data.get("landslide_history", 0)))
    traffic = clamp(float(data.get("traffic", 0)))
    terrain = clamp(float(data.get("terrain", 0)))

    score = (
        rainfall * 0.30
        + road_damage * 0.25
        + landslide_history * 0.20
        + traffic * 0.10
        + terrain * 0.15
    )

    score = round(clamp(score), 1)

    if score <= 30:
        level = "Low"
        recommendation = "Route is currently safe for normal transportation."
    elif score <= 60:
        level = "Medium"
        recommendation = "Proceed with caution and monitor road conditions."
    elif score <= 80:
        level = "High"
        recommendation = "Consider an alternate route and issue a warning."
    else:
        level = "Critical"
        recommendation = "Avoid this route and immediately use an alternate route."

    factors = {
        "rainfall": rainfall,
        "road_damage": road_damage,
        "landslide_history": landslide_history,
        "traffic": traffic,
        "terrain": terrain,
    }

    return {
        "risk_score": score,
        "risk_level": level,
        "factors": factors,
        "recommendation": recommendation,
    }