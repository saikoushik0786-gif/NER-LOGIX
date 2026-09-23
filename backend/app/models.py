from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Text,
)

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


class DriverRegistration(Base):
    """
    Stores driver registration requests.

    status values:
    - PENDING
    - APPROVED
    - REJECTED
    """

    __tablename__ = "driver_registrations"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    email = Column(String, unique=True, nullable=False, index=True)

    phone = Column(String, nullable=False)

    password = Column(String, nullable=False)

    license_number = Column(String, nullable=False)

    vehicle_number = Column(String, nullable=False)

    vehicle_type = Column(String, nullable=False)

    department = Column(
        String,
        default="Essential Logistics"
    )

    status = Column(
        String,
        default="PENDING",
        nullable=False
    )

    rejection_reason = Column(String, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    reviewed_at = Column(
        DateTime,
        nullable=True
    )

    reviewed_by = Column(
        String,
        nullable=True
    )


class FieldReport(Base):
    """
    Stores field reports submitted by field officers.

    status values:
    - PENDING
    - APPROVED
    - REJECTED
    """

    __tablename__ = "field_reports"

    id = Column(Integer, primary_key=True, index=True)

    # Incident information
    incident_type = Column(
        String,
        nullable=False
    )

    severity = Column(
        String,
        nullable=False
    )

    location = Column(
        String,
        nullable=False
    )

    reporter = Column(
        String,
        nullable=False
    )

    # Geo-location
    latitude = Column(
        Float,
        nullable=False
    )

    longitude = Column(
        Float,
        nullable=False
    )

    # Report description
    description = Column(
        Text,
        nullable=True
    )

    # Uploaded image
    image_filename = Column(
        String,
        nullable=True
    )

    image_path = Column(
        String,
        nullable=True
    )

    # Admin review
    status = Column(
        String,
        default="PENDING",
        nullable=False
    )

    review_note = Column(
        Text,
        nullable=True
    )

    reviewed_by = Column(
        String,
        nullable=True
    )

    # Timestamps
    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    reviewed_at = Column(
        DateTime,
        nullable=True
    )