"""
master_database.py
------------------------------------------------------------
Engine/session for the platform (master) database - this is
the ONE database the superadmin's own account and the list of
barbershops (tenants) live in. It never contains business data;
see tenant_db.py for the per-shop databases.
------------------------------------------------------------
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import MASTER_DATABASE_URL

connect_args = {"check_same_thread": False} if MASTER_DATABASE_URL.startswith("sqlite") else {}

master_engine = create_engine(MASTER_DATABASE_URL, connect_args=connect_args)
MasterSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=master_engine)

MasterBase = declarative_base()


def get_master_db():
    """FastAPI dependency that yields a master-DB session and always closes it."""
    db = MasterSessionLocal()
    try:
        yield db
    finally:
        db.close()
