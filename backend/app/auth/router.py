
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import DriverRegistration

from .security import (
    create_access_token,
    get_current_user,
    require_roles,
)


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


# =========================================================
# DEMO USERS
# =========================================================

USERS = {
    "admin@nerlogix.demo": {
        "id": 1,
        "name": "Government Administrator",
        "password": "admin123",
        "role": "GOVERNMENT_ADMIN",
        "department": "NER Government Operations",
    },
    "field@nerlogix.demo": {
        "id": 2,
        "name": "Field Officer",
        "password": "field123",
        "role": "FIELD_OFFICER",
        "department": "Field Operations",
    },
    "driver@nerlogix.demo": {
        "id": 3,
        "name": "Logistics Driver",
        "password": "driver123",
        "role": "DRIVER",
        "department": "Essential Logistics",
    },
}


# =========================================================
# SCHEMAS
# =========================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class DriverRegistrationRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    license_number: str
    vehicle_number: str
    vehicle_type: str
    department: str = "Essential Logistics"


class DriverRegistrationResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    license_number: str
    vehicle_number: str
    vehicle_type: str
    department: str
    status: str
    rejection_reason: Optional[str] = None


class RejectDriverRequest(BaseModel):
    reason: Optional[str] = "Registration rejected by administrator"


# =========================================================
# HELPER FUNCTION
# =========================================================

def registration_to_response(
    registration: DriverRegistration,
):
    return {
        "id": registration.id,
        "name": registration.name,
        "email": registration.email,
        "phone": registration.phone,
        "license_number": registration.license_number,
        "vehicle_number": registration.vehicle_number,
        "vehicle_type": registration.vehicle_type,
        "department": registration.department,
        "status": registration.status,
        "rejection_reason": registration.rejection_reason,
    }


# =========================================================
# DRIVER REGISTRATION
# =========================================================

@router.post(
    "/register-driver",
    response_model=DriverRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_driver(
    registration: DriverRegistrationRequest,
    db: Session = Depends(get_db),
):
    email = str(registration.email).lower().strip()

    # Check demo users
    if email in USERS:
        raise HTTPException(
            status_code=400,
            detail="This email is already registered",
        )

    # Check existing driver registration
    existing_registration = (
        db.query(DriverRegistration)
        .filter(DriverRegistration.email == email)
        .first()
    )

    if existing_registration:
        if existing_registration.status == "PENDING":
            raise HTTPException(
                status_code=400,
                detail="A registration request is already pending",
            )

        if existing_registration.status == "APPROVED":
            raise HTTPException(
                status_code=400,
                detail="This driver is already approved",
            )

        if existing_registration.status == "REJECTED":
            raise HTTPException(
                status_code=400,
                detail=(
                    "This registration was rejected. "
                    "Contact the administrator."
                ),
            )

    # Check duplicate license number
    existing_license = (
        db.query(DriverRegistration)
        .filter(
            DriverRegistration.license_number
            == registration.license_number.strip()
        )
        .first()
    )

    if existing_license:
        raise HTTPException(
            status_code=400,
            detail="This license number is already registered",
        )

    # Check duplicate vehicle number
    existing_vehicle = (
        db.query(DriverRegistration)
        .filter(
            DriverRegistration.vehicle_number
            == registration.vehicle_number.strip()
        )
        .first()
    )

    if existing_vehicle:
        raise HTTPException(
            status_code=400,
            detail="This vehicle number is already registered",
        )

    new_registration = DriverRegistration(
        name=registration.name.strip(),
        email=email,
        phone=registration.phone.strip(),
        password=registration.password,
        license_number=registration.license_number.strip(),
        vehicle_number=registration.vehicle_number.strip(),
        vehicle_type=registration.vehicle_type.strip(),
        department=registration.department.strip(),
        status="PENDING",
    )

    db.add(new_registration)
    db.commit()
    db.refresh(new_registration)

    return registration_to_response(new_registration)


# =========================================================
# LOGIN
# =========================================================

@router.post(
    "/login",
    response_model=LoginResponse,
)
def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db),
):
    email = str(credentials.email).lower().strip()

    # -----------------------------------------------------
    # FIRST: CHECK DEMO USERS
    # -----------------------------------------------------

    user = USERS.get(email)

    if user:
        if credentials.password != user["password"]:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password",
            )

        token = create_access_token(
            user_id=user["id"],
            email=email,
            role=user["role"],
            name=user["name"],
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": email,
                "role": user["role"],
                "department": user["department"],
            },
        }

    # -----------------------------------------------------
    # SECOND: CHECK REGISTERED DRIVER
    # -----------------------------------------------------

    driver = (
        db.query(DriverRegistration)
        .filter(DriverRegistration.email == email)
        .first()
    )

    if not driver:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if credentials.password != driver.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    if driver.status == "PENDING":
        raise HTTPException(
            status_code=403,
            detail=(
                "Your registration is still pending. "
                "Please wait for administrator approval."
            ),
        )

    if driver.status == "REJECTED":
        raise HTTPException(
            status_code=403,
            detail=(
                "Your driver registration was rejected. "
                f"Reason: {driver.rejection_reason or 'Not specified'}"
            ),
        )

    if driver.status != "APPROVED":
        raise HTTPException(
            status_code=403,
            detail="Your account is not active",
        )

    driver_id = 1000 + driver.id

    token = create_access_token(
        user_id=driver_id,
        email=driver.email,
        role="DRIVER",
        name=driver.name,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": driver_id,
            "name": driver.name,
            "email": driver.email,
            "role": "DRIVER",
            "department": driver.department,
        },
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get("/me")
def get_me(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email = current_user.get("email")

    # Demo user
    user = USERS.get(email)

    if user:
        return {
            "id": user["id"],
            "name": user["name"],
            "email": email,
            "role": user["role"],
            "department": user["department"],
        }

    # Registered driver
    driver = (
        db.query(DriverRegistration)
        .filter(DriverRegistration.email == email)
        .first()
    )

    if not driver:
        raise HTTPException(
            status_code=401,
            detail="User no longer exists",
        )

    if driver.status != "APPROVED":
        raise HTTPException(
            status_code=403,
            detail="Driver account is not approved",
        )

    return {
        "id": 1000 + driver.id,
        "name": driver.name,
        "email": driver.email,
        "role": "DRIVER",
        "department": driver.department,
    }


# =========================================================
# ADMIN: GET DRIVER REGISTRATIONS
# =========================================================

@router.get(
    "/admin/driver-registrations",
    response_model=list[DriverRegistrationResponse],
)
def get_driver_registrations(
    current_user=Depends(
        require_roles("GOVERNMENT_ADMIN")
    ),
    db: Session = Depends(get_db),
):
    registrations = (
        db.query(DriverRegistration)
        .order_by(DriverRegistration.created_at.desc())
        .all()
    )

    return [
        registration_to_response(registration)
        for registration in registrations
    ]


# =========================================================
# ADMIN: APPROVE DRIVER
# =========================================================

@router.patch(
    "/admin/driver-registrations/{registration_id}/approve",
    response_model=DriverRegistrationResponse,
)
def approve_driver(
    registration_id: int,
    current_user=Depends(
        require_roles("GOVERNMENT_ADMIN")
    ),
    db: Session = Depends(get_db),
):
    registration = (
        db.query(DriverRegistration)
        .filter(DriverRegistration.id == registration_id)
        .first()
    )

    if not registration:
        raise HTTPException(
            status_code=404,
            detail="Driver registration not found",
        )

    if registration.status == "APPROVED":
        raise HTTPException(
            status_code=400,
            detail="Driver is already approved",
        )

    registration.status = "APPROVED"
    registration.rejection_reason = None
    registration.reviewed_at = datetime.utcnow()
    registration.reviewed_by = current_user.get(
        "email",
        "administrator",
    )

    db.commit()
    db.refresh(registration)

    return registration_to_response(registration)


# =========================================================
# ADMIN: REJECT DRIVER
# =========================================================

@router.patch(
    "/admin/driver-registrations/{registration_id}/reject",
    response_model=DriverRegistrationResponse,
)
def reject_driver(
    registration_id: int,
    request: RejectDriverRequest,
    current_user=Depends(
        require_roles("GOVERNMENT_ADMIN")
    ),
    db: Session = Depends(get_db),
):
    registration = (
        db.query(DriverRegistration)
        .filter(DriverRegistration.id == registration_id)
        .first()
    )

    if not registration:
        raise HTTPException(
            status_code=404,
            detail="Driver registration not found",
        )

    if registration.status == "REJECTED":
        raise HTTPException(
            status_code=400,
            detail="Driver is already rejected",
        )

    registration.status = "REJECTED"
    registration.rejection_reason = request.reason
    registration.reviewed_at = datetime.utcnow()
    registration.reviewed_by = current_user.get(
        "email",
        "administrator",
    )

    db.commit()
    db.refresh(registration)

    return registration_to_response(registration)


# =========================================================
# AUTH TEST ENDPOINTS
# =========================================================

@router.get("/protected-test")
def protected_test(
    current_user=Depends(get_current_user),
):
    return {
        "success": True,
        "message": "JWT authentication successful",
        "user": current_user,
    }


@router.get("/admin-test")
def admin_test(
    current_user=Depends(
        require_roles("GOVERNMENT_ADMIN")
    ),
):
    return {
        "success": True,
        "message": "Government Admin authorization successful",
        "user": current_user,
    }


@router.get("/field-test")
def field_test(
    current_user=Depends(
        require_roles(
            "GOVERNMENT_ADMIN",
            "FIELD_OFFICER",
        )
    ),
):
    return {
        "success": True,
        "message": "Field Officer authorization successful",
        "user": current_user,
    }


@router.get("/driver-test")
def driver_test(
    current_user=Depends(
        require_roles(
            "GOVERNMENT_ADMIN",
            "DRIVER",
        )
    ),
):
    return {
        "success": True,
        "message": "Driver authorization successful",
        "user": current_user,
    }