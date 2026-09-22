"""
utils.py
------------------------------------------------------------
Small shared helpers used by several routers: converting a
Booking ORM row into the BookingOut schema, and computing
report summaries for both the admin and barber dashboards.
------------------------------------------------------------
"""
from collections import defaultdict
from datetime import date
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import models, schemas


def create_booking_record(
    db: Session,
    payload: schemas.BookingCreate,
    *,
    barber_id_override: Optional[int] = None,
    force_status: Optional[models.BookingStatus] = None,
) -> models.Booking:
    """
    Shared booking-creation logic used by both the admin router
    (which can assign any barber, or leave it unassigned) and the
    barber router (a barber booking a client themselves - always
    assigned to their own id, confirmed immediately since there is
    no one else who needs to "accept" it).
    service_id is optional: admin can create a booking with just
    client name + phone (no service chosen yet).
    """
    # Resolve service if provided
    service = None
    if payload.service_id:
        service = db.query(models.Service).get(payload.service_id)
        if not service:
            raise HTTPException(status_code=404, detail="Услуга не найдена")

    client_id = payload.client_id
    if not client_id:
        if not (payload.client_name and payload.client_phone):
            raise HTTPException(status_code=400, detail="Укажите клиента (существующего или нового)")
        existing = db.query(models.Client).filter(models.Client.phone == payload.client_phone).first()
        if existing:
            client_id = existing.id
        else:
            new_client = models.Client(name=payload.client_name, phone=payload.client_phone)
            db.add(new_client)
            db.commit()
            db.refresh(new_client)
            client_id = new_client.id

    barber_id = barber_id_override if barber_id_override is not None else payload.barber_id

    if force_status is not None:
        status = force_status
    else:
        status = models.BookingStatus.pending if barber_id else models.BookingStatus.confirmed

    booking = models.Booking(
        client_id=client_id,
        barber_id=barber_id,
        service_id=payload.service_id,
        date=payload.date,
        time=payload.time,
        duration=payload.duration or (service.duration if service else 30),
        price=payload.price if payload.price is not None else (service.price if service else 0.0),
        status=status,
        comment=payload.comment,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


def booking_to_out(b: models.Booking) -> schemas.BookingOut:
    import json as _json
    try:
        extra = _json.loads(b.extra_services) if b.extra_services else []
    except Exception:
        extra = []
    return schemas.BookingOut(
        id=b.id, client_id=b.client_id, client_name=b.client.name, client_phone=b.client.phone,
        barber_id=b.barber_id, barber_name=b.barber.full_name if b.barber else None,
        barber_percent=b.barber.barber_percent if b.barber else None,
        service_id=b.service_id, service_name=b.service.name if b.service else None,
        date=b.date, time=b.time, duration=b.duration, price=b.price,
        status=b.status, comment=b.comment, created_at=b.created_at,
        extra_services=extra,
        payment_method=b.payment_method,
        is_paid=b.is_paid or False,
        total_paid=b.total_paid,
    )


def build_admin_summary(db: Session, date_from: date, date_to: date) -> schemas.AdminReportSummary:
    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.date >= date_from, models.Booking.date <= date_to)
        .all()
    )

    revenue = 0.0
    done_count = cancelled_count = pending_count = 0
    service_counts: dict[str, int] = defaultdict(int)
    barber_revenue: dict[str, float] = defaultdict(float)
    daily_revenue: dict[str, float] = defaultdict(float)
    client_ids = set()

    for b in bookings:
        client_ids.add(b.client_id)
        if b.status == models.BookingStatus.done:
            done_count += 1
            amt = b.total_paid if (b.is_paid and b.total_paid is not None) else b.price
            revenue += amt
            if b.service:
                service_counts[b.service.name] += 1
            if b.barber:
                barber_revenue[b.barber.full_name] += amt
            daily_revenue[b.date.isoformat()] += amt
        elif b.status == models.BookingStatus.cancelled:
            cancelled_count += 1
        elif b.status == models.BookingStatus.pending:
            pending_count += 1

    top_service = max(service_counts, key=service_counts.get) if service_counts else None
    top_barber = max(barber_revenue, key=barber_revenue.get) if barber_revenue else None

    return schemas.AdminReportSummary(
        revenue=round(revenue, 2),
        done_count=done_count,
        cancelled_count=cancelled_count,
        pending_count=pending_count,
        clients_count=len(client_ids),
        average_check=round(revenue / done_count, 2) if done_count else 0,
        top_service=top_service,
        top_barber=top_barber,
        daily_revenue=dict(daily_revenue),
    )


def build_barber_summary(db: Session, barber_id: int, date_from: date, date_to: date) -> schemas.BarberReportSummary:
    bookings = (
        db.query(models.Booking)
        .filter(
            models.Booking.barber_id == barber_id,
            models.Booking.date >= date_from,
            models.Booking.date <= date_to,
        )
        .all()
    )

    accepted = declined = done = pending = 0
    revenue = 0.0
    daily_revenue: dict[str, float] = defaultdict(float)

    for b in bookings:
        if b.status == models.BookingStatus.confirmed:
            accepted += 1
        elif b.status == models.BookingStatus.cancelled:
            declined += 1
        elif b.status == models.BookingStatus.pending:
            pending += 1
        elif b.status == models.BookingStatus.done:
            accepted += 1
            done += 1
            amt = b.total_paid if (b.is_paid and b.total_paid is not None) else b.price
            revenue += amt
            daily_revenue[b.date.isoformat()] += amt

    return schemas.BarberReportSummary(
        accepted_count=accepted,
        declined_count=declined,
        done_count=done,
        pending_count=pending,
        revenue=revenue,
        daily_revenue=dict(daily_revenue),
    )
