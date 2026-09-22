"""
models.py
------------------------------------------------------------
SQL tables for ONE BARBERSHOP'S OWN DATABASE (see tenant_db.py -
every shop gets a separate physical database using this exact
schema, so nothing here is ever shared across shops):

- users     : barber accounts for THIS shop only. The shop's own
              admin account is NOT stored here - it lives in the
              platform's master database (see master_models.Tenant)
              so a barbershop's database contains nothing but that
              shop's own operational data.
- clients   : end customers of this barbershop
- services  : service catalog with price + duration
- bookings  : appointments; linked to a client, a service, and
              optionally a barber; carries a status workflow,
              extra_services (JSON), payment_method, is_paid, total_paid
- payments  : payouts made to a barber ("выплаты")
- settings  : single-row table of shop-wide settings
------------------------------------------------------------
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, Float, ForeignKey, Integer,
    String, Text, Time,
)
from sqlalchemy.orm import relationship

from .database import Base


class RoleEnum(str, enum.Enum):
    # "admin" is kept for backward-compatible schema shape but is never
    # written to a tenant database - a shop's admin identity lives only
    # in the master DB's Tenant row (see master_models.py).
    admin = "admin"
    barber = "barber"


class BookingStatus(str, enum.Enum):
    pending = "pending"          # ожидает решения барбера
    confirmed = "confirmed"      # барбер принял заявку
    done = "done"                # услуга выполнена
    cancelled = "cancelled"      # отменено / отказ барбера
    rescheduled = "rescheduled"  # перенесено


class User(Base):
    """Admin and barber accounts share one table, split by `role`."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    login = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=True)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.barber)
    is_active = Column(Boolean, default=True, nullable=False)
    # Barber's commission percentage (e.g. 50 means 50% of booking price)
    barber_percent = Column(Float, nullable=False, default=50.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    bookings = relationship("Booking", back_populates="barber", foreign_keys="Booking.barber_id")
    payments = relationship("Payment", back_populates="barber", cascade="all, delete-orphan")


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    bookings = relationship("Booking", back_populates="client", cascade="all, delete-orphan")


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    price = Column(Float, nullable=False, default=0)
    duration = Column(Integer, nullable=False, default=30)  # minutes

    bookings = relationship("Booking", back_populates="service")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=True)

    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    duration = Column(Integer, nullable=False, default=30)
    price = Column(Float, nullable=False, default=0)
    status = Column(Enum(BookingStatus), nullable=False, default=BookingStatus.pending)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Payment / extra services
    # extra_services: JSON string like '["hair_wash","beard","mask"]'
    extra_services = Column(Text, nullable=True, default="[]")
    payment_method = Column(String(20), nullable=True)  # "cash" | "phone"
    is_paid = Column(Boolean, nullable=False, default=False)
    total_paid = Column(Float, nullable=True)

    client = relationship("Client", back_populates="bookings")
    barber = relationship("User", back_populates="bookings", foreign_keys=[barber_id])
    service = relationship("Service", back_populates="bookings")


class Payment(Base):
    """A payout ("выплата") made by the admin to a barber."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    barber_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    period_from = Column(Date, nullable=False)
    period_to = Column(Date, nullable=False)
    status = Column(String(20), nullable=False, default="paid")  # paid | pending
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    barber = relationship("User", back_populates="payments")


class Settings(Base):
    """Single-row table holding shop-wide settings, edited on the admin's Settings page."""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, default=1)
    shop_name = Column(String(150), nullable=False, default="BarberPro")
    work_start = Column(String(5), nullable=False, default="08:00")
    work_end = Column(String(5), nullable=False, default="22:00")
    slot_minutes = Column(Integer, nullable=False, default=30)
    currency = Column(String(10), nullable=False, default="₸")
    phone = Column(String(30), nullable=True)
    address = Column(String(255), nullable=True)

    # Extra service prices (used by barber payment screen)
    price_hair_wash = Column(Float, nullable=False, default=500.0)
    price_beard = Column(Float, nullable=False, default=1000.0)
    price_mask = Column(Float, nullable=False, default=800.0)
