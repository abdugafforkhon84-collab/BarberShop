"""
database.py
------------------------------------------------------------
Declarative base for the TENANT schema (users/barbers, clients,
services, bookings, payments, settings - see models.py).

This module used to also own a single global engine/session -
that's gone now that the app is multi-tenant: every barbershop
gets its own physical database file, created and connected to
on demand by tenant_db.py. `Base` here is only the shared table
metadata that gets stamped into each tenant's own database.
------------------------------------------------------------
"""
from sqlalchemy.orm import declarative_base

Base = declarative_base()
