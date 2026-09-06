from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime

from .database import Base


class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    start_location = Column(String)
    end_location = Column(String)

    distance_km = Column(Float)

    rainfall = Column(Float, default=0)
    traffic = Column(Float, default=0)
    road_damage = Column(Float, default=0)
    landslide_history = Column(Float, default=0)
    terrain_risk = Column(Float, default=0)

    risk_score = Column(Float, default=0)

    status = Column(String, default="OPEN")

    latitude = Column(Float)
    longitude = Column(Float)


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)

    vehicle_number = Column(String, unique=True)

    vehicle_type = Column(String)

    commodity = Column(String)

    driver_name = Column(String)

    latitude = Column(Float)
    longitude = Column(Float)

    speed = Column(Float, default=0)

    status = Column(String, default="MOVING")

    destination = Column(String)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String)

    description = Column(String)

    incident_type = Column(String)

    latitude = Column(Float)
    longitude = Column(Float)

    severity = Column(String)

    reported_by = Column(String)

    resolved = Column(Boolean, default=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String)

    message = Column(String)

    severity = Column(String)

    location = Column(String)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )