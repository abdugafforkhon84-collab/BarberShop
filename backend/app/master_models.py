"""
master_models.py
------------------------------------------------------------
Tables in the PLATFORM (master) database. This is the only
database the superadmin can query - and by design it holds
nothing but provisioning/routing metadata:

- PlatformAdmin : the single platform-owner account
- Tenant        : one row per barbershop ("точка") - its name,
                  slug (also its DB filename), the ADMIN login
                  the superadmin handed that shop's owner, and
                  whether it's active. Also stores owner info,
                  location, and subscription plan metadata.
                  NOT a shred of business data (bookings, clients,
                  barbers, revenue) lives here or is reachable from here.
- LoginIndex    : a tiny login -> tenant routing table so the
                  login endpoint knows which tenant database to
                  check a BARBER's password against, without
                  scanning every shop's database on every login.
                  It stores only "this login string belongs to
                  this shop" - no password, no name, no business
                  data of any kind.
------------------------------------------------------------
"""
from datetime import datetime, date

from sqlalchemy import Boolean, Column, DateTime, Date, Float, Integer, String

from .master_database import MasterBase


class PlatformAdmin(MasterBase):
    __tablename__ = "platform_admins"

    id = Column(Integer, primary_key=True, index=True)
    login = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False, default="Владелец платформы")
    created_at = Column(DateTime, default=datetime.utcnow)


class Tenant(MasterBase):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(80), unique=True, nullable=False, index=True)
    shop_name = Column(String(150), nullable=False)

    admin_login = Column(String(100), unique=True, nullable=False, index=True)
    admin_password_hash = Column(String(255), nullable=False)

    # Owner / contact info
    owner_name = Column(String(150), nullable=True)
    phone = Column(String(30), nullable=True)

    # Location
    address = Column(String(255), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)

    # Subscription plan
    plan_months = Column(Integer, nullable=True)   # 1 | 3 | 6 | 12
    plan_start = Column(Date, nullable=True)
    plan_end = Column(Date, nullable=True)
    subscription_price = Column(Float, default=0.0, nullable=False) # total amount paid to platform
    is_trial = Column(Boolean, default=False, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PlatformTariffSettings(MasterBase):
    """Tariff prices managed by the Superadmin."""
    __tablename__ = "platform_tariff_settings"

    id = Column(Integer, primary_key=True, index=True)
    price_1_month = Column(Float, default=0.0, nullable=False)    # 1-month trial / promo
    price_3_months = Column(Float, default=15000.0, nullable=False)  # 3 months
    price_6_months = Column(Float, default=27000.0, nullable=False)  # 6 months
    price_12_months = Column(Float, default=48000.0, nullable=False) # 12 months
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LoginIndex(MasterBase):
    """Routing only: login -> (tenant slug, role). No passwords, no PII beyond the login string itself."""
    __tablename__ = "login_index"

    id = Column(Integer, primary_key=True, index=True)
    login = Column(String(100), unique=True, nullable=False, index=True)
    tenant_slug = Column(String(80), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "admin" | "barber"

