from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .database import get_db
from .models import Alert, FieldReport
from .auth.security import get_current_user, require_roles


# =========================================================
# FIELD REPORTS ROUTER
# =========================================================

router = APIRouter(
    prefix="/api/reports",
    tags=["Field Reports"],
)


# =========================================================
# IMAGE UPLOAD SETTINGS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = (
    BASE_DIR
    / "uploads"
    / "field_reports"
)

UPLOAD_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB


# =========================================================
# HELPER - CONVERT REPORT TO JSON
# =========================================================

def report_to_response(report: FieldReport):
    return {
        "id": report.id,

        "incident_type": report.incident_type,

        "severity": report.severity,

        "location": report.location,

        "reporter": report.reporter,

        "latitude": report.latitude,

        "longitude": report.longitude,

        "description": report.description,

        "image_filename": report.image_filename,

        "image_url": (
            f"/api/reports/{report.id}/image"
            if report.image_filename
            else None
        ),

        "status": report.status,

        "review_note": report.review_note,

        "reviewed_by": report.reviewed_by,

        "created_at": report.created_at,

        "reviewed_at": report.reviewed_at,
    }


# =========================================================
# IMAGE VALIDATION
# =========================================================

def validate_image(image: UploadFile):

    if not image:
        return

    if image.content_type not in ALLOWED_IMAGE_TYPES:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only JPG, PNG and WEBP "
                "images are allowed."
            ),
        )


# =========================================================
# SAVE IMAGE
# =========================================================

def save_image(
    image: UploadFile,
    report_id: int,
) -> Optional[str]:

    if not image:
        return None

    validate_image(image)

    extension = ALLOWED_IMAGE_TYPES[
        image.content_type
    ]

    filename = (
        f"report_{report_id}_"
        f"{uuid4().hex}"
        f"{extension}"
    )

    destination = UPLOAD_DIR / filename

    total_size = 0

    try:

        with destination.open("wb") as output:

            while True:

                chunk = image.file.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                total_size += len(chunk)

                if total_size > MAX_IMAGE_SIZE:

                    raise HTTPException(
                        status_code=(
                            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
                        ),
                        detail=(
                            "Image size must be "
                            "5 MB or less."
                        ),
                    )

                output.write(chunk)

    except Exception:

        if destination.exists():
            destination.unlink()

        raise

    return filename


# =========================================================
# CREATE FIELD REPORT
# =========================================================

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
async def create_field_report(

    incident_type: str = Form(...),

    severity: str = Form(...),

    location: str = Form(...),

    reporter: str = Form(...),

    latitude: float = Form(...),

    longitude: float = Form(...),

    description: str = Form(""),

    image: Optional[UploadFile] = File(None),

    current_user=Depends(
        require_roles(
            "FIELD_OFFICER",
            "GOVERNMENT_ADMIN",
        )
    ),

    db: Session = Depends(get_db),
):

    """
    Submit a new field report.

    Every report starts as PENDING.

    A Government Administrator must approve
    the report before it becomes operational.
    """

    severity_value = (
        severity.strip().upper()
    )

    allowed_severities = {
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

    if severity_value not in allowed_severities:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Severity must be "
                "Low, Medium, High or Critical."
            ),
        )

    if not -90 <= latitude <= 90:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Latitude must be between "
                "-90 and 90."
            ),
        )

    if not -180 <= longitude <= 180:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Longitude must be between "
                "-180 and 180."
            ),
        )

    report = FieldReport(

        incident_type=(
            incident_type.strip()
        ),

        severity=severity_value,

        location=location.strip(),

        reporter=reporter.strip(),

        latitude=latitude,

        longitude=longitude,

        description=description.strip(),

        status="PENDING",

        created_at=datetime.utcnow(),
    )

    db.add(report)

    db.commit()

    db.refresh(report)

    try:

        image_filename = save_image(
            image,
            report.id,
        )

        if image_filename:

            report.image_filename = (
                image_filename
            )

            db.commit()

            db.refresh(report)

    except Exception:

        db.delete(report)

        db.commit()

        raise

    return {
        "success": True,

        "message": (
            "Field report submitted "
            "for administrator review."
        ),

        "report": report_to_response(
            report
        ),
    }


# =========================================================
# LIST FIELD REPORTS
# =========================================================

@router.get("")
def get_field_reports(

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):

    """
    Government administrators can see
    all field reports.

    Field officers can see their own reports.
    """

    query = db.query(FieldReport)

    role = current_user.get("role")

    if role == "FIELD_OFFICER":

        query = query.filter(
            FieldReport.reporter
            == current_user.get("name")
        )

    elif role != "GOVERNMENT_ADMIN":

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "You do not have permission "
                "to view field reports."
            ),
        )

    reports = (
        query
        .order_by(
            FieldReport.created_at.desc()
        )
        .all()
    )

    return {
        "success": True,

        "count": len(reports),

        "reports": [
            report_to_response(report)
            for report in reports
        ],
    }


# =========================================================
# GET SINGLE FIELD REPORT
# =========================================================

@router.get("/{report_id}")
def get_field_report(

    report_id: int,

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):

    report = (
        db.query(FieldReport)
        .filter(
            FieldReport.id == report_id
        )
        .first()
    )

    if not report:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Field report not found.",
        )

    role = current_user.get("role")

    if (
        role == "FIELD_OFFICER"
        and report.reporter
        != current_user.get("name")
    ):

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "You can only view "
                "your own field reports."
            ),
        )

    if role not in {
        "FIELD_OFFICER",
        "GOVERNMENT_ADMIN",
    }:

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "You do not have permission "
                "to view this report."
            ),
        )

    return {
        "success": True,

        "report": report_to_response(
            report
        ),
    }


# =========================================================
# VIEW UPLOADED IMAGE
# =========================================================

@router.get("/{report_id}/image")
def get_field_report_image(

    report_id: int,

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):

    report = (
        db.query(FieldReport)
        .filter(
            FieldReport.id == report_id
        )
        .first()
    )

    if not report:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Field report not found.",
        )

    if not report.image_filename:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "No image was uploaded "
                "for this report."
            ),
        )

    role = current_user.get("role")

    if (
        role == "FIELD_OFFICER"
        and report.reporter
        != current_user.get("name")
    ):

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "You can only view images "
                "from your own reports."
            ),
        )

    if role not in {
        "FIELD_OFFICER",
        "GOVERNMENT_ADMIN",
    }:

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "You do not have permission "
                "to view this image."
            ),
        )

    image_path = (
        UPLOAD_DIR
        / report.image_filename
    )

    if not image_path.exists():

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Uploaded image file was "
                "not found on the server."
            ),
        )

    return FileResponse(
        image_path
    )


# =========================================================
# APPROVE FIELD REPORT - ADMIN ONLY
# =========================================================

@router.patch(
    "/{report_id}/approve"
)
def approve_field_report(

    report_id: int,

    review_note: Optional[str] = Form(
        None
    ),

    current_user=Depends(
        require_roles(
            "GOVERNMENT_ADMIN"
        )
    ),

    db: Session = Depends(get_db),
):

    report = (
        db.query(FieldReport)
        .filter(
            FieldReport.id == report_id
        )
        .first()
    )

    if not report:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Field report not found.",
        )

    if report.status != "PENDING":

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                f"This report is already "
                f"{report.status.lower()}."
            ),
        )

    report.status = "APPROVED"

    report.review_note = (
        review_note
        or "Approved by administrator"
    ).strip()

    report.reviewed_by = (
        current_user.get("name")
    )

    report.reviewed_at = (
        datetime.utcnow()
    )

    # =====================================================
    # HIGH / CRITICAL REPORTS CREATE ALERTS
    # =====================================================

    if report.severity in {
        "HIGH",
        "CRITICAL",
    }:

        alert = Alert(

            title=(
                f"Field Report: "
                f"{report.incident_type}"
            ),

            message=(
                report.description
                or (
                    "Approved "
                    f"{report.severity.lower()} "
                    "field report."
                )
            ),

            severity=report.severity,

            location=report.location,
        )

        db.add(alert)

    db.commit()

    db.refresh(report)

    return {
        "success": True,

        "message": (
            "Field report approved "
            "successfully."
        ),

        "report": report_to_response(
            report
        ),
    }


# =========================================================
# REJECT FIELD REPORT - ADMIN ONLY
# =========================================================

@router.patch(
    "/{report_id}/reject"
)
def reject_field_report(

    report_id: int,

    reason: str = Form(...),

    current_user=Depends(
        require_roles(
            "GOVERNMENT_ADMIN"
        )
    ),

    db: Session = Depends(get_db),
):

    report = (
        db.query(FieldReport)
        .filter(
            FieldReport.id == report_id
        )
        .first()
    )

    if not report:

        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail="Field report not found.",
        )

    if report.status != "PENDING":

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                f"This report is already "
                f"{report.status.lower()}."
            ),
        )

    reason = reason.strip()

    if not reason:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "A rejection reason "
                "is required."
            ),
        )

    report.status = "REJECTED"

    report.review_note = reason

    report.reviewed_by = (
        current_user.get("name")
    )

    report.reviewed_at = (
        datetime.utcnow()
    )

    db.commit()

    db.refresh(report)

    return {
        "success": True,

        "message": (
            "Field report rejected "
            "successfully."
        ),

        "report": report_to_response(
            report
        ),
    }