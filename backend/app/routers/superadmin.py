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
from datetime import date, datetime, timedelta
import json
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import DATA_DIR
from ..deps import require_superadmin
from ..master_database import MasterSessionLocal, get_master_db
from ..master_models import LoginIndex, Tenant, PlatformTariffSettings
from ..security import hash_password
from ..tenant_db import drop_tenant_database, is_valid_slug, open_tenant_session, provision_tenant, slugify

router = APIRouter(prefix="/superadmin", tags=["superadmin"], dependencies=[Depends(require_superadmin)])


def _get_or_create_tariff_settings(db: Session) -> PlatformTariffSettings:
    settings = db.query(PlatformTariffSettings).first()
    default_tariffs = [
        {"months": 1, "price": 0.0, "name": "1 месяц (Пробный)"},
        {"months": 3, "price": 15000.0, "name": "3 месяца"},
        {"months": 6, "price": 27000.0, "name": "6 месяцев"},
        {"months": 12, "price": 48000.0, "name": "12 месяцев (1 год)"},
    ]
    if not settings:
        settings = PlatformTariffSettings(
            price_1_month=0.0,
            price_3_months=15000.0,
            price_6_months=27000.0,
            price_12_months=48000.0,
            tariffs_json=json.dumps(default_tariffs, ensure_ascii=False),
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    elif not settings.tariffs_json or settings.tariffs_json.strip() in ("", "[]"):
        settings.tariffs_json = json.dumps(default_tariffs, ensure_ascii=False)
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

    # Check dynamic tariffs first
    for t in settings.tariffs:
        if t.get("months") == months:
            price = float(t.get("price", 0.0))
            return price, (months == 1 and price == 0.0)

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

    if "tariffs" in data and data["tariffs"] is not None:
        tariffs_list = sorted(data["tariffs"], key=lambda x: x["months"])
        settings.tariffs_json = json.dumps(tariffs_list, ensure_ascii=False)
        # Sync standard fixed columns for backwards compatibility
        for t in tariffs_list:
            m = t.get("months")
            p = float(t.get("price", 0.0))
            if m == 1:
                settings.price_1_month = p
            elif m == 3:
                settings.price_3_months = p
            elif m == 6:
                settings.price_6_months = p
            elif m == 12:
                settings.price_12_months = p
    elif "tariffs_json" in data and data["tariffs_json"] is not None:
        settings.tariffs_json = data["tariffs_json"]

    # Also handle individual price updates if explicitly provided
    for field in ("price_1_month", "price_3_months", "price_6_months", "price_12_months"):
        if field in data and data[field] is not None:
            setattr(settings, field, data[field])
            try:
                curr_tariffs = json.loads(settings.tariffs_json or "[]")
                month_num = int(field.split("_")[1])
                updated = False
                for item in curr_tariffs:
                    if item.get("months") == month_num:
                        item["price"] = data[field]
                        updated = True
                if updated:
                    settings.tariffs_json = json.dumps(curr_tariffs, ensure_ascii=False)
            except Exception:
                pass

    db.commit()
    db.refresh(settings)
    return settings


@router.get("/tenants", response_model=list[schemas.TenantOut])
def list_tenants(db: Session = Depends(get_master_db)):
    return db.query(Tenant).order_by(Tenant.created_at.desc()).all()


@router.post("/tenants", response_model=schemas.TenantOut)
def create_tenant(payload: schemas.TenantCreate, db: Session = Depends(get_master_db)):
    base_slug = slugify(payload.shop_name)
    if not is_valid_slug(base_slug):
        base_slug = "shop"
    slug = _unique_slug(db, base_slug)

    if payload.parent_id:
        parent = db.query(Tenant).filter(Tenant.id == payload.parent_id).first()
        if not parent:
            raise HTTPException(status_code=400, detail="Родительский филиал не найден")
        
        payload.admin_login = f"{parent.admin_login}_branch_{slug}"
        payload.admin_password = "dummy_password"
    else:
        if not payload.admin_login or not payload.admin_password:
            raise HTTPException(status_code=400, detail="Для основной точки логин и пароль обязательны")
        if db.query(Tenant).filter(Tenant.admin_login == payload.admin_login).first():
            raise HTTPException(status_code=400, detail="Такой логин администратора уже занят")
        if db.query(LoginIndex).filter(LoginIndex.login == payload.admin_login).first():
            raise HTTPException(status_code=400, detail="Такой логин уже используется в системе")

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
        parent_id=payload.parent_id,
    )
    db.add(tenant)
    db.add(LoginIndex(login=payload.admin_login, tenant_slug=slug, role="admin"))
    db.commit()
    db.refresh(tenant)

    # Creates the shop's own, completely separate database file.
    provision_tenant(slug)
    save_snapshot(db)

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
    save_snapshot(db)
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
    save_snapshot(db)
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
    save_snapshot(db)

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

            done_paid_rows = tdb.query(models.Booking).filter(
                or_(
                    models.Booking.status == models.BookingStatus.done,
                    models.Booking.is_paid == True,
                    models.Booking.total_paid > 0,
                )
            ).all()

            done_bookings = len(done_paid_rows)

            today_bookings = tdb.query(models.Booking).filter(
                models.Booking.date == today,
                models.Booking.status.in_([
                    models.BookingStatus.pending,
                    models.BookingStatus.confirmed,
                ])
            ).count()

            revenue = sum(
                (float(b.total_paid) if (b.total_paid is not None and b.total_paid > 0) else (float(b.service.price) if b.service and b.service.price else float(b.price or 0.0)))
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
            "subscription_price": t.subscription_price or 0.0,
            "is_trial": bool(t.is_trial),
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
        "total_tariffs_paid": sum(s["subscription_price"] for s in shops),
        "today_bookings": sum(s["today_bookings"] for s in shops),
    }

    return {"shops": shops, "totals": totals}


# ============================================================ Backup & Restore
def export_platform_backup(db: Session) -> dict:
    tenants = db.query(Tenant).all()
    tariff_settings = db.query(PlatformTariffSettings).first()

    backup_data = {
        "version": "2.0",
        "exported_at": datetime.utcnow().isoformat(),
        "tariff_settings": {
            "price_1_month": tariff_settings.price_1_month if tariff_settings else 0.0,
            "price_3_months": tariff_settings.price_3_months if tariff_settings else 15000.0,
            "price_6_months": tariff_settings.price_6_months if tariff_settings else 27000.0,
            "price_12_months": tariff_settings.price_12_months if tariff_settings else 48000.0,
            "tariffs_json": tariff_settings.tariffs_json if tariff_settings else "[]",
        },
        "tenants": []
    }

    for t in tenants:
        t_dict = {
            "slug": t.slug,
            "shop_name": t.shop_name,
            "admin_login": t.admin_login,
            "admin_password_hash": t.admin_password_hash,
            "owner_name": t.owner_name,
            "phone": t.phone,
            "address": t.address,
            "lat": t.lat,
            "lng": t.lng,
            "plan_months": t.plan_months,
            "plan_start": t.plan_start.isoformat() if t.plan_start else None,
            "plan_end": t.plan_end.isoformat() if t.plan_end else None,
            "subscription_price": t.subscription_price or 0.0,
            "is_trial": bool(t.is_trial),
            "is_active": bool(t.is_active),
            "parent_id": t.parent_id,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }

        tenant_item = {
            "tenant": t_dict,
            "settings": {},
            "users": [],
            "services": [],
            "clients": []
        }

        try:
            tdb = open_tenant_session(t.slug)
            s = tdb.query(models.Settings).first()
            if s:
                tenant_item["settings"] = {
                    "shop_name": s.shop_name,
                    "work_start": s.work_start,
                    "work_end": s.work_end,
                    "slot_minutes": s.slot_minutes,
                    "currency": s.currency,
                    "phone": s.phone,
                    "address": s.address,
                    "kaspi_phone": s.kaspi_phone or "",
                    "theme": s.theme or "dark",
                    "shop_type": s.shop_type or "barbershop",
                    "price_hair_wash": s.price_hair_wash or 500.0,
                    "price_beard": s.price_beard or 1000.0,
                    "price_mask": s.price_mask or 800.0,
                    "extra_services_json": s.extra_services_json or "[]",
                }

            users = tdb.query(models.User).all()
            for u in users:
                tenant_item["users"].append({
                    "login": u.login,
                    "password_hash": u.password_hash,
                    "full_name": u.full_name,
                    "phone": u.phone,
                    "role": u.role.value if hasattr(u.role, "value") else str(u.role),
                    "is_active": bool(u.is_active),
                    "salary_type": u.salary_type or "percent",
                    "salary_amount": u.salary_amount or 50.0,
                    "barber_percent": u.barber_percent or 50.0,
                })

            services = tdb.query(models.Service).all()
            for s in services:
                tenant_item["services"].append({
                    "name": s.name,
                    "price": s.price,
                    "duration": s.duration,
                })

            clients = tdb.query(models.Client).all()
            for c in clients:
                tenant_item["clients"].append({
                    "name": c.name,
                    "phone": c.phone,
                })

            tdb.close()
        except Exception as err:
            print(f"Error exporting tenant {t.slug}: {err}")

        backup_data["tenants"].append(tenant_item)

    return backup_data


def import_platform_backup(data: dict, db: Session) -> dict:
    tenants_list = data.get("tenants", [])
    restored_count = 0

    tariff_data = data.get("tariff_settings")
    if tariff_data:
        ts = _get_or_create_tariff_settings(db)
        if "price_1_month" in tariff_data: ts.price_1_month = tariff_data["price_1_month"]
        if "price_3_months" in tariff_data: ts.price_3_months = tariff_data["price_3_months"]
        if "price_6_months" in tariff_data: ts.price_6_months = tariff_data["price_6_months"]
        if "price_12_months" in tariff_data: ts.price_12_months = tariff_data["price_12_months"]
        if "tariffs_json" in tariff_data: ts.tariffs_json = tariff_data["tariffs_json"]
        db.commit()

    for item in tenants_list:
        t_data = item.get("tenant", {})
        slug = t_data.get("slug")
        if not slug:
            continue

        existing_tenant = db.query(Tenant).filter(Tenant.slug == slug).first()
        if not existing_tenant:
            plan_start = date.fromisoformat(t_data["plan_start"]) if t_data.get("plan_start") else None
            plan_end = date.fromisoformat(t_data["plan_end"]) if t_data.get("plan_end") else None

            existing_tenant = Tenant(
                slug=slug,
                shop_name=t_data.get("shop_name", "Shop"),
                admin_login=t_data.get("admin_login", slug),
                admin_password_hash=t_data.get("admin_password_hash", ""),
                owner_name=t_data.get("owner_name"),
                phone=t_data.get("phone"),
                address=t_data.get("address"),
                lat=t_data.get("lat"),
                lng=t_data.get("lng"),
                plan_months=t_data.get("plan_months", 1),
                plan_start=plan_start,
                plan_end=plan_end,
                subscription_price=t_data.get("subscription_price", 0.0),
                is_trial=bool(t_data.get("is_trial", False)),
                is_active=bool(t_data.get("is_active", True)),
                parent_id=t_data.get("parent_id"),
            )
            db.add(existing_tenant)

            if not db.query(LoginIndex).filter(LoginIndex.login == existing_tenant.admin_login).first():
                db.add(LoginIndex(login=existing_tenant.admin_login, tenant_slug=slug, role="admin"))
            db.commit()
            db.refresh(existing_tenant)

        # Provision tenant database
        provision_tenant(slug)
        tdb = open_tenant_session(slug)
        try:
            # Settings
            s_data = item.get("settings", {})
            if s_data:
                settings_row = tdb.query(models.Settings).first()
                if not settings_row:
                    settings_row = models.Settings()
                    tdb.add(settings_row)
                for k, v in s_data.items():
                    if hasattr(settings_row, k) and v is not None:
                        setattr(settings_row, k, v)
                tdb.commit()

            # Services
            for s in item.get("services", []):
                s_name = s.get("name")
                if s_name and not tdb.query(models.Service).filter(models.Service.name == s_name).first():
                    tdb.add(models.Service(
                        name=s_name,
                        price=s.get("price", 0.0),
                        duration=s.get("duration", 30)
                    ))
            tdb.commit()

            # Barbers / Users
            for u in item.get("users", []):
                u_login = u.get("login")
                if u_login and not tdb.query(models.User).filter(models.User.login == u_login).first():
                    tdb.add(models.User(
                        login=u_login,
                        password_hash=u.get("password_hash", ""),
                        full_name=u.get("full_name", u_login),
                        phone=u.get("phone"),
                        role=models.RoleEnum.barber,
                        is_active=bool(u.get("is_active", True)),
                        salary_type=u.get("salary_type", "percent"),
                        salary_amount=u.get("salary_amount", 50.0),
                        barber_percent=u.get("barber_percent", 50.0),
                    ))
                    if not db.query(LoginIndex).filter(LoginIndex.login == u_login).first():
                        db.add(LoginIndex(login=u_login, tenant_slug=slug, role="barber"))
                        db.commit()
            tdb.commit()

            # Clients
            for c in item.get("clients", []):
                c_phone = c.get("phone")
                if c_phone and not tdb.query(models.Client).filter(models.Client.phone == c_phone).first():
                    tdb.add(models.Client(
                        name=c.get("name", "Клиент"),
                        phone=c_phone
                    ))
            tdb.commit()
            restored_count += 1
        finally:
            tdb.close()

    return {"success": True, "restored_shops": restored_count}


def save_snapshot(db: Optional[Session] = None) -> None:
    should_close = False
    if db is None:
        db = MasterSessionLocal()
        should_close = True
    try:
        backup = export_platform_backup(db)
        snapshot_paths = [
            os.path.join(DATA_DIR, "backup_snapshot.json"),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backup_snapshot.json")),
        ]
        for p in snapshot_paths:
            try:
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, "w", encoding="utf-8") as f:
                    json.dump(backup, f, ensure_ascii=False, indent=2)
            except Exception:
                pass
    except Exception as e:
        print(f"Snapshot save error: {e}")
    finally:
        if should_close:
            db.close()


def auto_restore_snapshot_if_empty() -> None:
    db = MasterSessionLocal()
    try:
        tenant_count = db.query(Tenant).count()
        if tenant_count == 0:
            snapshot_paths = [
                os.path.join(DATA_DIR, "backup_snapshot.json"),
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backup_snapshot.json")),
            ]
            for p in snapshot_paths:
                if os.path.isfile(p):
                    try:
                        with open(p, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        if data and data.get("tenants"):
                            print(f"Auto-restoring {len(data['tenants'])} barbershop(s) from {p}...")
                            import_platform_backup(data, db)
                            print("Auto-restore completed successfully!")
                            break
                    except Exception as e:
                        print(f"Failed auto-restoring snapshot from {p}: {e}")
    finally:
        db.close()


@router.get("/backup/export")
def download_backup(db: Session = Depends(get_master_db)):
    """Exports all platform tenants and operational settings as a JSON backup."""
    return export_platform_backup(db)


@router.post("/backup/import")
def upload_backup(payload: dict, db: Session = Depends(get_master_db)):
    """Restores platform tenants and data from a JSON backup."""
    res = import_platform_backup(payload, db)
    save_snapshot(db)
    return res
