"""
tenant_db.py
------------------------------------------------------------
Creates and caches one SQLAlchemy engine PER BARBERSHOP, each
pointed at its own physical database (by default a separate
SQLite file under TENANTS_DIR, e.g. tenants_data/salon-almaty.db).

This is what makes tenant isolation real rather than a filtered
query: there is no shared `bookings` table with a tenant_id
column that a bug (or the platform admin) could accidentally
query across shops. Each shop's data lives in a connection the
rest of the app never even opens unless a valid JWT for THAT
shop is presented.

Engines are cached in-process (creating a SQLAlchemy engine per
request would be wasteful); sessions are created fresh per
request as usual.
------------------------------------------------------------
"""
import os
import re
import threading

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from . import models  # tenant schema (Base.metadata target)
from .config import TENANT_DATABASE_URL_TEMPLATE, TENANTS_DIR
from .database import Base as TenantBase

_engines: dict[str, "object"] = {}
_lock = threading.Lock()

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$")


def is_valid_slug(slug: str) -> bool:
    return bool(SLUG_RE.match(slug))


def slugify(shop_name: str) -> str:
    s = shop_name.strip().lower()
    # transliterate the common Cyrillic letters so shop names in Russian
    # still produce a readable, valid slug/filename
    table = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    }
    s = ''.join(table.get(ch, ch) for ch in s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    s = s or "shop"
    return s[:60]


def _tenant_db_url(slug: str) -> str:
    if TENANT_DATABASE_URL_TEMPLATE:
        return TENANT_DATABASE_URL_TEMPLATE.format(slug=slug)
    path = os.path.join(TENANTS_DIR, f"{slug}.db")
    return f"sqlite:///{path}"


def get_tenant_engine(slug: str):
    if slug in _engines:
        return _engines[slug]
    with _lock:
        if slug not in _engines:
            url = _tenant_db_url(slug)
            connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
            engine = create_engine(url, connect_args=connect_args)
            TenantBase.metadata.create_all(bind=engine)
            _engines[slug] = engine
    return _engines[slug]


def open_tenant_session(slug: str):
    """Returns a brand-new Session bound to this tenant's own database."""
    engine = get_tenant_engine(slug)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()


def provision_tenant(slug: str) -> None:
    """Creates the tenant's database file + tables and seeds a default
    Settings row, so a brand-new shop's calendar works immediately."""
    db = open_tenant_session(slug)
    try:
        if not db.query(models.Settings).first():
            db.add(models.Settings())
            db.commit()
    finally:
        db.close()


def drop_tenant_database(slug: str) -> None:
    """Used when a barbershop is permanently deleted by the superadmin."""
    with _lock:
        engine = _engines.pop(slug, None)
        if engine is not None:
            engine.dispose()
    url = _tenant_db_url(slug)
    if url.startswith("sqlite:///"):
        path = url.replace("sqlite:///", "", 1)
        if os.path.exists(path):
            os.remove(path)
