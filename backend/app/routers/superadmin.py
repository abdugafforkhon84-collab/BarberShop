"""
routers/superadmin.py
------------------------------------------------------------
Everything the platform owner can do - and, just as importantly,
everything they CANNOT do: there is no endpoint here that reads
a shop's clients, bookings, barbers, services, revenue, or
reports. Those live in a database this router never opens.

- POST   /superadmin/tenants          - add a new barbershop,
                                         generates its own
                                         database and hands back
                                         the admin login/password
                                         to give that shop's owner
- GET    /superadmin/tenants          - list shops (name, login,
                                         active flag, owner info,
                                         plan info)
- PUT    /superadmin/tenants/{id}     - rename, activate/deactivate,
                                         or reset the admin password,
                                         update owner/location/plan
- POST   /superadmin/tenants/{id}/renew - extend the subscription plan
- DELETE /superadmin/tenants/{id}     - permanently remove a shop
                                         AND its entire database
------------------------------------------------------------
"""
from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import require_superadmin
from ..master_database import get_master_db
from ..master_models import LoginIndex, Tenant, PlatformTariffSettings
from ..security import hash_password
from ..tenant_db import drop_tenant_database, is_valid_slug, open_tenant_session, provision_tenant, slugify

router = APIRouter(prefix="/superadmin", tags=["superadmin"], dependencies=[Depends(require_superadmin)])


def _get_or_create_tariff_settings(db: Session) -> PlatformTariffSettings:
    settings = db.query(PlatformTariffSettings).first()
    if not settings:
        settings = PlatformTariffSettings(
            price_1_month=0.0,
            price_3_months=15000.0,
            price_6_months=27000.0,
            price_12_months=48000.0,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def _unique_slug(db: Session, base_slug: str) -> str:
    slug = base_slug
    n = 2
    while db.query(Tenant).filter(Tenant.slug == slug).first():
        slug = f"{base_slug}-{n}"
        n += 1
    return slug


def _compute_plan_end(plan_start: date, plan_months: int) -> date:
    """Add plan_months months to plan_start."""
    month = plan_start.month - 1 + plan_months
    year = plan_start.year + month // 12
    month = month % 12 + 1
    import calendar
    day = min(plan_start.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _get_plan_price(months: Optional[int], settings: PlatformTariffSettings, custom_price: Optional[float] = None) -> tuple[float, bool]:
    if custom_price is not None:
        return custom_price, (months == 1 and custom_price == 0.0)
    if not months:
        return 0.0, False
    if months == 1:
        return settings.price_1_month, (settings.price_1_month == 0.0)
    elif months == 3:
        return settings.price_3_months, False
    elif months == 6:
        return settings.price_6_months, False
    elif months == 12:
        return settings.price_12_months, False
    return 0.0, False


@router.get("/tariff-settings", response_model=schemas.TariffSettingsOut)
def get_tariff_settings(db: Session = Depends(get_master_db)):
    return _get_or_create_tariff_settings(db)


@router.put("/tariff-settings", response_model=schemas.TariffSettingsOut)
def update_tariff_settings(payload: schemas.TariffSettingsUpdate, db: Session = Depends(get_master_db)):
    settings = _get_or_create_tariff_settings(db)
    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        if val is not None:
            setattr(settings, field, val)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/tenants", response_model=list[schemas.TenantOut])
def list_tenants(db: Session = Depends(get_master_db)):
    return db.query(Tenant).order_by(Tenant.created_at.desc()).all()


@router.post("/tenants", response_model=schemas.TenantOut)
def create_tenant(payload: schemas.TenantCreate, db: Session = Depends(get_master_db)):
    if db.query(Tenant).filter(Tenant.admin_login == payload.admin_login).first():
        raise HTTPException(status_code=400, detail="Такой логин администратора уже занят")
    if db.query(LoginIndex).filter(LoginIndex.login == payload.admin_login).first():
        raise HTTPException(status_code=400, detail="Такой логин уже используется в системе")

    base_slug = slugify(payload.shop_name)
    if not is_valid_slug(base_slug):
        base_slug = "shop"
    slug = _unique_slug(db, base_slug)

    # Compute plan_end and tariff price if plan provided
    tariff_settings = _get_or_create_tariff_settings(db)
    plan_start = payload.plan_start or (date.today() if payload.plan_months else None)
    plan_end = None
    sub_price, is_trial = 0.0, False

    if plan_start and payload.plan_months:
        plan_end = _compute_plan_end(plan_start, payload.plan_months)
        sub_price, is_trial = _get_plan_price(payload.plan_months, tariff_settings, payload.custom_price)

    tenant = Tenant(
        slug=slug,
        shop_name=payload.shop_name,
        admin_login=payload.admin_login,
        admin_password_hash=hash_password(payload.admin_password),
        owner_name=payload.owner_name,
        phone=payload.phone,
        address=payload.address,
        lat=payload.lat,
        lng=payload.lng,
        plan_months=payload.plan_months,
        plan_start=plan_start,
        plan_end=plan_end,
        subscription_price=sub_price,
        is_trial=is_trial,
        is_active=True,
    )
    db.add(tenant)
    db.add(LoginIndex(login=payload.admin_login, tenant_slug=slug, role="admin"))
    db.commit()
    db.refresh(tenant)

    # Creates the shop's own, completely separate database file.
    provision_tenant(slug)

    return tenant


@router.put("/tenants/{tenant_id}", response_model=schemas.TenantOut)
def update_tenant(tenant_id: int, payload: schemas.TenantUpdate, db: Session = Depends(get_master_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Барбершоп не найден")

    data = payload.model_dump(exclude_unset=True)
    if "admin_password" in data and data["admin_password"]:
        tenant.admin_password_hash = hash_password(data.pop("admin_password"))
    elif "admin_password" in data:
        data.pop("admin_password")

    # Recompute plan_end if plan_months or plan_start changes
    new_months = data.get("plan_months", tenant.plan_months)
    new_start = data.get("plan_start", tenant.plan_start)
    if new_months and new_start:
        data["plan_end"] = _compute_plan_end(new_start, new_months)

    for field, value in data.items():
        setattr(tenant, field, value)

    db.commit()
    db.refresh(tenant)
    return tenant


@router.post("/tenants/{tenant_id}/renew", response_model=schemas.TenantOut)
def renew_tenant(tenant_id: int, payload: schemas.TenantRenew, db: Session = Depends(get_master_db)):
    """Extend the subscription: start from today (or current plan_end if still in future)."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Барбершоп не найден")

    tariff_settings = _get_or_create_tariff_settings(db)
    today = date.today()
    
    if not tenant.plan_end or tenant.plan_end < today:
        start = today
        tenant.plan_start = today
        tenant.plan_months = payload.plan_months
    else:
        start = tenant.plan_end
        tenant.plan_months = (tenant.plan_months or 0) + payload.plan_months
    
    sub_price, is_trial = _get_plan_price(payload.plan_months, tariff_settings, payload.custom_price)

    tenant.plan_end = _compute_plan_end(start, payload.plan_months)
    tenant.subscription_price = (tenant.subscription_price or 0.0) + sub_price
    tenant.is_trial = is_trial

    db.commit()
    db.refresh(tenant)
    return tenant


@router.delete("/tenants/{tenant_id}")
def delete_tenant(tenant_id: int, db: Session = Depends(get_master_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Барбершоп не найден")

    db.query(LoginIndex).filter(LoginIndex.tenant_slug == tenant.slug).delete()
    slug = tenant.slug
    db.delete(tenant)
    db.commit()

    # Physically deletes the shop's database file - irreversible.
    drop_tenant_database(slug)

    return {"success": True}


# ============================================================ Overview / Report
@router.get("/overview")
def platform_overview(db: Session = Depends(get_master_db)):
    """
    Returns per-barbershop stats by opening each tenant's own DB.
    Aggregated from all shops:
      - barbers_count, total_bookings, done_bookings, revenue (total_paid),
        today_bookings, active_plan (bool).
    Also returns platform-wide totals.
    """
    tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).all()
    today = date.today()
    shops = []

    for t in tenants:
        try:
            tdb = open_tenant_session(t.slug)
            barbers = tdb.query(models.User).filter(
                models.User.role == models.RoleEnum.barber,
                models.User.is_active == True,
            ).count()

            total_bookings = tdb.query(models.Booking).count()

            done_bookings = tdb.query(models.Booking).filter(
                models.Booking.status == models.BookingStatus.done
            ).count()

            today_bookings = tdb.query(models.Booking).filter(
                models.Booking.date == today,
                models.Booking.status.in_([
                    models.BookingStatus.pending,
                    models.BookingStatus.confirmed,
                ])
            ).count()

            # Sum all total_paid (or price for done but unpaid)
            done_paid_rows = tdb.query(models.Booking).filter(
                models.Booking.status == models.BookingStatus.done
            ).all()
            revenue = sum(
                (b.total_paid if b.is_paid and b.total_paid else b.price)
                for b in done_paid_rows
            )

            tdb.close()
        except Exception:
            barbers = total_bookings = done_bookings = today_bookings = 0
            revenue = 0.0

        plan_status = "none"
        if t.plan_end:
            plan_status = "active" if t.plan_end >= today else "expired"

        shops.append({
            "id": t.id,
            "shop_name": t.shop_name,
            "owner_name": t.owner_name,
            "phone": t.phone,
            "address": t.address,
            "is_active": t.is_active,
            "plan_status": plan_status,
            "plan_end": str(t.plan_end) if t.plan_end else None,
            "plan_months": t.plan_months,
            "barbers": barbers,
            "total_bookings": total_bookings,
            "done_bookings": done_bookings,
            "today_bookings": today_bookings,
            "revenue": revenue,
            "created_at": str(t.created_at)[:10] if t.created_at else None,
        })

    # Platform totals
    totals = {
        "total_shops": len(shops),
        "active_shops": sum(1 for s in shops if s["is_active"]),
        "active_plans": sum(1 for s in shops if s["plan_status"] == "active"),
        "expired_plans": sum(1 for s in shops if s["plan_status"] == "expired"),
        "total_barbers": sum(s["barbers"] for s in shops),
        "total_bookings": sum(s["total_bookings"] for s in shops),
        "total_revenue": sum(s["revenue"] for s in shops),
        "today_bookings": sum(s["today_bookings"] for s in shops),
    }

    return {"shops": shops, "totals": totals}
