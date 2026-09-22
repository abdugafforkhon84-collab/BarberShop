"""
routers/barber.py
------------------------------------------------------------
Everything a barber profile can do.
Each endpoint receives current_user (models.User) from the
require_tenant_barber dependency which resolves the tenant DB
itself, so we REUSE that same db session via a helper wrapper.
------------------------------------------------------------
"""
import json
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_tenant_db, require_tenant_barber
from ..utils import booking_to_out, build_barber_summary, create_booking_record

router = APIRouter(prefix="/barber", tags=["barber"])


def _own_booking(db: Session, booking_id: int, barber_id: int) -> models.Booking:
    booking = db.query(models.Booking).get(booking_id)
    if not booking or booking.barber_id != barber_id:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return booking


@router.get("/requests", response_model=list[schemas.BookingOut])
def list_requests(
    status: Optional[models.BookingStatus] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    query = db.query(models.Booking).filter(models.Booking.barber_id == current_user.id)
    if status:
        query = query.filter(models.Booking.status == status)
    if date_from:
        query = query.filter(models.Booking.date >= date_from)
    if date_to:
        query = query.filter(models.Booking.date <= date_to)
    bookings = query.order_by(models.Booking.date.desc(), models.Booking.time.asc()).all()
    return [booking_to_out(b) for b in bookings]


@router.get("/history", response_model=list[schemas.BookingOut])
def barber_history(
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    """Full history of this barber's bookings, newest first."""
    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.barber_id == current_user.id)
        .order_by(models.Booking.date.desc(), models.Booking.time.desc())
        .all()
    )
    return [booking_to_out(b) for b in bookings]


@router.post("/bookings", response_model=schemas.BookingOut)
def create_own_booking(
    payload: schemas.BookingCreate,
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    """A barber books a client directly - confirmed immediately."""
    booking = create_booking_record(
        db, payload,
        barber_id_override=current_user.id,
        force_status=models.BookingStatus.confirmed,
    )
    return booking_to_out(booking)


@router.put("/bookings/{booking_id}", response_model=schemas.BookingOut)
def update_own_booking(
    booking_id: int,
    payload: schemas.BookingUpdate,
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    booking = _own_booking(db, booking_id, current_user.id)
    data = payload.model_dump(exclude_unset=True)
    data.pop("barber_id", None)

    if "extra_services" in data and isinstance(data["extra_services"], list):
        data["extra_services"] = json.dumps(data["extra_services"])

    for field, value in data.items():
        setattr(booking, field, value)
    db.commit()
    db.refresh(booking)
    return booking_to_out(booking)


@router.delete("/bookings/{booking_id}")
def delete_own_booking(
    booking_id: int,
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    booking = _own_booking(db, booking_id, current_user.id)
    db.delete(booking)
    db.commit()
    return {"success": True}


@router.patch("/bookings/{booking_id}/status", response_model=schemas.BookingOut)
def update_own_booking_status(
    booking_id: int,
    payload: schemas.BookingStatusUpdate,
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    """Barber cancels or marks booking as rescheduled from the history view."""
    booking = _own_booking(db, booking_id, current_user.id)
    allowed = {models.BookingStatus.cancelled, models.BookingStatus.rescheduled}
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail="Разрешено только: cancelled, rescheduled")
    booking.status = payload.status
    db.commit()
    db.refresh(booking)
    return booking_to_out(booking)


@router.post("/requests/{booking_id}/accept", response_model=schemas.BookingOut)
def accept_request(
    booking_id: int,
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    booking = _own_booking(db, booking_id, current_user.id)
    booking.status = models.BookingStatus.confirmed
    db.commit()
    db.refresh(booking)
    return booking_to_out(booking)


@router.post("/requests/{booking_id}/decline", response_model=schemas.BookingOut)
def decline_request(
    booking_id: int,
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    booking = _own_booking(db, booking_id, current_user.id)
    booking.status = models.BookingStatus.cancelled
    db.commit()
    db.refresh(booking)
    return booking_to_out(booking)


@router.post("/requests/{booking_id}/complete", response_model=schemas.BookingOut)
def complete_request(
    booking_id: int,
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    booking = _own_booking(db, booking_id, current_user.id)
    booking.status = models.BookingStatus.done
    db.commit()
    db.refresh(booking)
    return booking_to_out(booking)


@router.post("/requests/{booking_id}/pay", response_model=schemas.BookingOut)
def pay_booking(
    booking_id: int,
    payload: schemas.BookingPayRequest,
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    """Mark a booking as paid. If service_id is provided, updates the booking's service too."""
    booking = _own_booking(db, booking_id, current_user.id)
    if booking.status != models.BookingStatus.done:
        raise HTTPException(status_code=400, detail="Можно оплатить только выполненный заказ")

    # Update service if provided (barber selects service at payment time)
    if payload.service_id:
        service = db.query(models.Service).filter(models.Service.id == payload.service_id).first()
        if service:
            booking.service_id = service.id
            booking.price = service.price
            booking.duration = service.duration

    booking.extra_services = json.dumps(payload.extra_services)
    booking.payment_method = payload.payment_method
    booking.is_paid = True
    booking.total_paid = payload.total_paid

    db.commit()
    db.refresh(booking)
    return booking_to_out(booking)


@router.get("/reports/summary", response_model=schemas.BarberReportSummary)
def barber_reports_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    date_to = date_to or date.today()
    date_from = date_from or (date_to - timedelta(days=30))
    return build_barber_summary(db, current_user.id, date_from, date_to)


@router.get("/services", response_model=list[schemas.ServiceOut])
def barber_services(
    _: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    return db.query(models.Service).order_by(models.Service.name).all()


@router.get("/settings", response_model=schemas.SettingsOut)
def barber_settings(
    _: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    """Read shop settings - barbers need extra-service prices."""
    settings = db.query(models.Settings).first()
    if not settings:
        settings = models.Settings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/clients")
def barber_list_clients(
    search: str = "",
    _: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    """Barbers can look up existing clients when booking."""
    query = db.query(models.Client)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (models.Client.name.ilike(like)) | (models.Client.phone.ilike(like))
        )
    return [
        {"id": c.id, "name": c.name, "phone": c.phone}
        for c in query.order_by(models.Client.name).limit(30).all()
    ]


@router.post("/clients")
def barber_create_client(
    payload: schemas.ClientCreate,
    _: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    """Barber creates a new client during booking."""
    existing = db.query(models.Client).filter(models.Client.phone == payload.phone).first()
    if existing:
        return {"id": existing.id, "name": existing.name, "phone": existing.phone}
    client = models.Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return {"id": client.id, "name": client.name, "phone": client.phone}


@router.get("/payments", response_model=list[schemas.PaymentOut])
def own_payments(
    current_user: models.User = Depends(require_tenant_barber),
    db: Session = Depends(get_tenant_db),
):
    payments = (
        db.query(models.Payment)
        .filter(models.Payment.barber_id == current_user.id)
        .order_by(models.Payment.created_at.desc())
        .all()
    )
    return [
        schemas.PaymentOut(
            id=p.id, barber_id=p.barber_id, barber_name=current_user.full_name,
            amount=p.amount, period_from=p.period_from, period_to=p.period_to,
            status=p.status, comment=p.comment, created_at=p.created_at,
        )
        for p in payments
    ]
