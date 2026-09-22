"""
routers/admin.py
------------------------------------------------------------
Everything a SHOP admin can do, scoped entirely to their own
barbershop's database (resolved from the "tenant" claim in
their JWT via get_tenant_db - see deps.py):

- /admin/barbers      - add / list / update / deactivate barbers
                         (barbers log in with the login+password
                         the admin sets here)
- /admin/bookings      - full CRUD over client bookings, records
                         ("записи клиентов"), optionally assigning
                         a barber
- /admin/reports        - revenue / stats summary ("отчет")
- /admin/payments        - payouts to barbers ("выплаты")
- /admin/settings          - shop-wide settings ("настройки")

Note: services ("услуги") CRUD lives in routers/services.py
(shared GET for barbers, admin-only writes) to avoid duplicating
the endpoint under two prefixes.

Barber accounts are also mirrored into the platform's master-DB
LoginIndex (login -> this tenant) so the login endpoint can route
a barber's login attempt to the right shop database without
scanning every shop. That index carries no password and no
business data - see master_models.LoginIndex.
------------------------------------------------------------
"""
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_tenant_db, get_token_payload, require_tenant_admin
from ..master_database import get_master_db
from ..master_models import LoginIndex, Tenant
from ..security import hash_password
from ..utils import booking_to_out, build_admin_summary, create_booking_record

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_tenant_admin)])


# ============================================================ Barbers
@router.get("/barbers", response_model=list[schemas.BarberOut])
def list_barbers(db: Session = Depends(get_tenant_db)):
    return db.query(models.User).filter(models.User.role == models.RoleEnum.barber).order_by(models.User.full_name).all()


@router.post("/barbers", response_model=schemas.BarberOut)
def create_barber(
    payload: schemas.BarberCreate,
    token_payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_tenant_db),
    master_db: Session = Depends(get_master_db),
):
    if db.query(models.User).filter(models.User.login == payload.login).first():
        raise HTTPException(status_code=400, detail="Такой логин уже занят")
    if master_db.query(LoginIndex).filter(LoginIndex.login == payload.login).first():
        raise HTTPException(status_code=400, detail="Такой логин уже используется в системе")

    barber = models.User(
        login=payload.login,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=models.RoleEnum.barber,
        is_active=True,
        barber_percent=payload.barber_percent if hasattr(payload, 'barber_percent') else 50.0,
    )
    db.add(barber)
    db.commit()
    db.refresh(barber)

    # Register in the platform's login-routing index so this barber can log in.
    master_db.add(LoginIndex(login=payload.login, tenant_slug=token_payload["tenant"], role="barber"))
    master_db.commit()

    return barber


@router.put("/barbers/{barber_id}", response_model=schemas.BarberOut)
def update_barber(barber_id: int, payload: schemas.BarberUpdate, db: Session = Depends(get_tenant_db)):
    barber = db.query(models.User).filter(models.User.id == barber_id, models.User.role == models.RoleEnum.barber).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Барбер не найден")

    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        barber.password_hash = hash_password(data.pop("password"))
    for field, value in data.items():
        if field != "password":
            setattr(barber, field, value)

    db.commit()
    db.refresh(barber)
    return barber


@router.delete("/barbers/{barber_id}")
def delete_barber(
    barber_id: int,
    db: Session = Depends(get_tenant_db),
    master_db: Session = Depends(get_master_db),
):
    barber = db.query(models.User).filter(models.User.id == barber_id, models.User.role == models.RoleEnum.barber).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Барбер не найден")

    master_db.query(LoginIndex).filter(LoginIndex.login == barber.login, LoginIndex.role == "barber").delete()
    master_db.commit()

    db.delete(barber)
    db.commit()
    return {"success": True}


# ============================================================ Bookings ("записи клиентов")
@router.get("/bookings", response_model=list[schemas.BookingOut])
def list_bookings(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    barber_id: Optional[int] = None,
    status: Optional[models.BookingStatus] = None,
    db: Session = Depends(get_tenant_db),
):
    query = db.query(models.Booking)
    if date_from:
        query = query.filter(models.Booking.date >= date_from)
    if date_to:
        query = query.filter(models.Booking.date <= date_to)
    if barber_id:
        query = query.filter(models.Booking.barber_id == barber_id)
    if status:
        query = query.filter(models.Booking.status == status)

    bookings = query.order_by(models.Booking.date.desc(), models.Booking.time.asc()).all()
    return [booking_to_out(b) for b in bookings]


@router.post("/bookings", response_model=schemas.BookingOut)
def create_booking(payload: schemas.BookingCreate, db: Session = Depends(get_tenant_db)):
    booking = create_booking_record(db, payload)
    return booking_to_out(booking)


@router.put("/bookings/{booking_id}", response_model=schemas.BookingOut)
def update_booking(booking_id: int, payload: schemas.BookingUpdate, db: Session = Depends(get_tenant_db)):
    import json as _json
    booking = db.query(models.Booking).get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    data = payload.model_dump(exclude_unset=True)

    # Serialize extra_services list → JSON string for SQLite storage
    if "extra_services" in data and isinstance(data["extra_services"], list):
        data["extra_services"] = _json.dumps(data["extra_services"])

    for field, value in data.items():
        setattr(booking, field, value)

    db.commit()
    db.refresh(booking)
    return booking_to_out(booking)


@router.delete("/bookings/{booking_id}")
def delete_booking(booking_id: int, db: Session = Depends(get_tenant_db)):
    booking = db.query(models.Booking).get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Запись не найдена")
    db.delete(booking)
    db.commit()
    return {"success": True}


# ============================================================ Reports ("отчет")
@router.get("/reports/summary", response_model=schemas.AdminReportSummary)
def reports_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_tenant_db),
):
    date_to = date_to or date.today()
    date_from = date_from or (date_to - timedelta(days=30))
    return build_admin_summary(db, date_from, date_to)


# ============================================================ Payments ("выплаты")
@router.get("/payments/balances", response_model=list[schemas.BarberBalanceOut])
def get_payment_balances(db: Session = Depends(get_tenant_db)):
    barbers = db.query(models.User).filter(
        models.User.role == models.RoleEnum.barber,
        models.User.is_active == True
    ).all()
    
    res = []
    for barber in barbers:
        # Calculate earned from completed, paid bookings
        bookings = db.query(models.Booking).filter(
            models.Booking.barber_id == barber.id,
            models.Booking.is_paid == True
        ).all()
        
        total_earned = 0.0
        for b in bookings:
            amount = b.total_paid if b.total_paid is not None else b.price
            total_earned += float(amount) * (float(barber.barber_percent) / 100.0)
            
        # Calculate already paid
        payments = db.query(models.Payment).filter(
            models.Payment.barber_id == barber.id
        ).all()
        
        total_paid = sum(p.amount for p in payments)
        balance = total_earned - total_paid
        
        res.append(schemas.BarberBalanceOut(
            barber_id=barber.id,
            barber_name=barber.full_name,
            barber_percent=barber.barber_percent,
            total_earned=round(total_earned, 2),
            total_paid=round(total_paid, 2),
            balance=round(balance, 2)
        ))
        
    return res


@router.get("/payments", response_model=list[schemas.PaymentOut])
def list_payments(barber_id: Optional[int] = None, db: Session = Depends(get_tenant_db)):
    query = db.query(models.Payment)
    if barber_id:
        query = query.filter(models.Payment.barber_id == barber_id)
    payments = query.order_by(models.Payment.created_at.desc()).all()
    return [
        schemas.PaymentOut(
            id=p.id, barber_id=p.barber_id, barber_name=p.barber.full_name,
            amount=p.amount, period_from=p.period_from, period_to=p.period_to,
            status=p.status, comment=p.comment, created_at=p.created_at,
        )
        for p in payments
    ]


@router.post("/payments", response_model=schemas.PaymentOut)
def create_payment(payload: schemas.PaymentCreate, db: Session = Depends(get_tenant_db)):
    barber = db.query(models.User).filter(models.User.id == payload.barber_id, models.User.role == models.RoleEnum.barber).first()
    if not barber:
        raise HTTPException(status_code=404, detail="Барбер не найден")

    payment = models.Payment(**payload.model_dump())
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return schemas.PaymentOut(
        id=payment.id, barber_id=payment.barber_id, barber_name=barber.full_name,
        amount=payment.amount, period_from=payment.period_from, period_to=payment.period_to,
        status=payment.status, comment=payment.comment, created_at=payment.created_at,
    )


@router.delete("/payments/{payment_id}")
def delete_payment(payment_id: int, db: Session = Depends(get_tenant_db)):
    payment = db.query(models.Payment).get(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Выплата не найдена")
    db.delete(payment)
    db.commit()
    return {"success": True}


# ============================================================ Settings ("настройки")
@router.get("/settings", response_model=schemas.SettingsOut)
def get_settings(
    token_payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_tenant_db),
    master_db: Session = Depends(get_master_db),
):
    settings = db.query(models.Settings).first()
    if not settings:
        settings = models.Settings()
        db.add(settings)
        db.commit()
        db.refresh(settings)

    slug = token_payload.get("tenant")
    tenant = master_db.query(Tenant).filter(Tenant.slug == slug).first() if slug else None

    res = schemas.SettingsOut.model_validate(settings)
    if tenant:
        res.shop_name = tenant.shop_name or settings.shop_name
        res.plan_months = tenant.plan_months
        res.plan_start = tenant.plan_start
        res.plan_end = tenant.plan_end
        res.subscription_price = tenant.subscription_price or 0.0
        res.is_trial = tenant.is_trial or False
    return res


@router.put("/settings", response_model=schemas.SettingsOut)
def update_settings(
    payload: schemas.SettingsUpdate,
    token_payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_tenant_db),
    master_db: Session = Depends(get_master_db),
):
    settings = db.query(models.Settings).first()
    if not settings:
        settings = models.Settings()
        db.add(settings)

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)

    slug = token_payload.get("tenant")
    tenant = master_db.query(Tenant).filter(Tenant.slug == slug).first() if slug else None
    if tenant:
        if "shop_name" in data and data["shop_name"]:
            tenant.shop_name = data["shop_name"]
        if "phone" in data and data["phone"]:
            tenant.phone = data["phone"]
        if "address" in data and data["address"]:
            tenant.address = data["address"]
        master_db.commit()

    res = schemas.SettingsOut.model_validate(settings)
    if tenant:
        res.shop_name = tenant.shop_name or settings.shop_name
        res.plan_months = tenant.plan_months
        res.plan_start = tenant.plan_start
        res.plan_end = tenant.plan_end
        res.subscription_price = tenant.subscription_price or 0.0
        res.is_trial = tenant.is_trial or False
    return res

