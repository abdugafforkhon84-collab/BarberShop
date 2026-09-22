"""
schemas.py
------------------------------------------------------------
Pydantic v2 models used for request validation and response
serialization across all routers.
------------------------------------------------------------
"""
from datetime import date as dt_date, datetime, time as dt_time
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from .models import BookingStatus, RoleEnum


# ---------------------------------------------------------------- Auth
class LoginRequest(BaseModel):
    login: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str  # "superadmin" | "admin" | "barber"
    tenant: Optional[str] = None  # barbershop slug, absent for superadmin
    shop_name: Optional[str] = None
    full_name: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    login: str
    full_name: str
    phone: Optional[str] = None
    role: RoleEnum
    is_active: bool
    barber_percent: float = 50.0
    created_at: datetime


class MeOut(BaseModel):
    """Generic 'who am I' response - shape is the same whether the
    caller is the superadmin, a shop admin, or a barber."""
    role: str
    tenant: Optional[str] = None
    shop_name: Optional[str] = None
    login: str
    full_name: str


# ---------------------------------------------------------------- Superadmin: tenants & tariff pricing
class TenantCreate(BaseModel):
    shop_name: str = Field(min_length=2, max_length=150)
    admin_login: str = Field(min_length=3, max_length=100)
    admin_password: str = Field(min_length=4, max_length=100)
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    plan_months: Optional[int] = Field(default=None, ge=1)
    plan_start: Optional[dt_date] = None
    plan_end: Optional[dt_date] = None
    custom_price: Optional[float] = None


class TenantUpdate(BaseModel):
    shop_name: Optional[str] = None
    is_active: Optional[bool] = None
    admin_password: Optional[str] = Field(default=None, min_length=4, max_length=100)
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    plan_months: Optional[int] = None
    plan_start: Optional[dt_date] = None
    plan_end: Optional[dt_date] = None
    subscription_price: Optional[float] = None
    is_trial: Optional[bool] = None


class TenantRenew(BaseModel):
    plan_months: int = Field(ge=1)
    custom_price: Optional[float] = None


class TenantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    slug: str
    shop_name: str
    admin_login: str
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    plan_months: Optional[int] = None
    plan_start: Optional[dt_date] = None
    plan_end: Optional[dt_date] = None
    subscription_price: float = 0.0
    is_trial: bool = False
    is_active: bool
    created_at: datetime


class TariffSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    price_1_month: float = 0.0
    price_3_months: float = 15000.0
    price_6_months: float = 27000.0
    price_12_months: float = 48000.0
    updated_at: datetime


class TariffSettingsUpdate(BaseModel):
    price_1_month: Optional[float] = Field(default=None, ge=0)
    price_3_months: Optional[float] = Field(default=None, ge=0)
    price_6_months: Optional[float] = Field(default=None, ge=0)
    price_12_months: Optional[float] = Field(default=None, ge=0)



# ---------------------------------------------------------------- Barbers (admin managed)
class BarberCreate(BaseModel):
    login: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=4, max_length=100)
    full_name: str
    phone: Optional[str] = None
    barber_percent: float = Field(default=50.0, ge=0, le=100)


class BarberUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=4, max_length=100)
    barber_percent: Optional[float] = Field(default=None, ge=0, le=100)


class BarberOut(UserOut):
    pass


# ---------------------------------------------------------------- Clients
class ClientCreate(BaseModel):
    name: str
    phone: str


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    created_at: datetime


class ClientStats(ClientOut):
    visits: int = 0
    total_spent: float = 0
    last_visit: Optional[dt_date] = None


# ---------------------------------------------------------------- Services
class ServiceCreate(BaseModel):
    name: str
    price: float = Field(ge=0)
    duration: int = Field(ge=5, default=30)


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    duration: Optional[int] = Field(default=None, ge=5)


class ServiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    price: float
    duration: int


# ---------------------------------------------------------------- Bookings
class BookingCreate(BaseModel):
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    barber_id: Optional[int] = None
    service_id: Optional[int] = None
    date: dt_date
    time: dt_time
    duration: Optional[int] = None
    price: Optional[float] = None
    comment: Optional[str] = None


class BookingUpdate(BaseModel):
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    barber_id: Optional[int] = None
    service_id: Optional[int] = None
    date: Optional[dt_date] = None
    time: Optional[dt_time] = None
    duration: Optional[int] = None
    price: Optional[float] = None
    status: Optional[BookingStatus] = None
    comment: Optional[str] = None
    extra_services: Optional[List[str]] = None
    payment_method: Optional[str] = None
    is_paid: Optional[bool] = None
    total_paid: Optional[float] = None


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class BookingPayRequest(BaseModel):
    """Request body for the barber's pay endpoint."""
    service_id: Optional[int] = None          # set/update the booking's service when paying
    extra_services: List[str] = Field(default_factory=list)  # ["hair_wash", "beard", "mask"]
    payment_method: str  # "cash" | "phone"
    total_paid: float


class BookingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    client_id: int
    client_name: str
    client_phone: str
    barber_id: Optional[int] = None
    barber_name: Optional[str] = None
    barber_percent: Optional[float] = None
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    date: dt_date
    time: dt_time
    duration: int
    price: float
    status: BookingStatus
    comment: Optional[str] = None
    extra_services: Optional[List[str]] = None
    payment_method: Optional[str] = None
    is_paid: bool = False
    total_paid: Optional[float] = None
    created_at: datetime


# ---------------------------------------------------------------- Payments
class PaymentCreate(BaseModel):
    barber_id: int
    amount: float = Field(gt=0)
    period_from: dt_date
    period_to: dt_date
    status: str = "paid"
    comment: Optional[str] = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    barber_id: int
    barber_name: str
    amount: float
    period_from: dt_date
    period_to: dt_date
    status: str
    comment: Optional[str] = None
    created_at: datetime


class BarberBalanceOut(BaseModel):
    barber_id: int
    barber_name: str
    barber_percent: float
    total_earned: float
    total_paid: float
    balance: float


# ---------------------------------------------------------------- Settings
class SettingsUpdate(BaseModel):
    shop_name: Optional[str] = None
    work_start: Optional[str] = None
    work_end: Optional[str] = None
    slot_minutes: Optional[int] = None
    currency: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    price_hair_wash: Optional[float] = None
    price_beard: Optional[float] = None
    price_mask: Optional[float] = None


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    shop_name: str
    work_start: str
    work_end: str
    slot_minutes: int
    currency: str
    phone: Optional[str] = None
    address: Optional[str] = None
    price_hair_wash: float = 500.0
    price_beard: float = 1000.0
    price_mask: float = 800.0
    plan_months: Optional[int] = None
    plan_start: Optional[dt_date] = None
    plan_end: Optional[dt_date] = None
    subscription_price: Optional[float] = 0.0
    is_trial: Optional[bool] = False



# ---------------------------------------------------------------- Reports
class AdminReportSummary(BaseModel):
    revenue: float
    done_count: int
    cancelled_count: int
    pending_count: int
    clients_count: int
    average_check: float
    top_service: Optional[str] = None
    top_barber: Optional[str] = None
    daily_revenue: dict[str, float]


class BarberReportSummary(BaseModel):
    accepted_count: int
    declined_count: int
    done_count: int
    pending_count: int
    revenue: float
    daily_revenue: dict[str, float]
