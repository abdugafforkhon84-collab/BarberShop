"""
config.py
------------------------------------------------------------
Reads configuration from environment variables (loaded from
.env via python-dotenv). Copy .env.example to .env and edit
as needed - see that file for all available options.

Multi-tenant layout:
  - MASTER_DATABASE_URL   - one small platform DB. Stores only
                             barbershop records (slug, name,
                             admin login/password hash,
                             active flag) and a login->tenant
                             routing index. NEVER stores any
                             business data (bookings, clients,
                             revenue, barbers, services).
  - TENANTS_DIR            - each barbershop gets its own,
                             completely separate SQLite file
                             here, e.g. tenants_data/<slug>.db.
                             Nothing outside that file can see
                             a shop's data - not even the
                             platform superadmin.
------------------------------------------------------------
"""
import os
from dotenv import load_dotenv

load_dotenv()

# ---- Platform (master) database - superadmin's own data only ----
MASTER_DATABASE_URL = os.getenv("MASTER_DATABASE_URL", "sqlite:///./master.db")

# ---- Per-tenant databases: one physical SQLite file per barbershop ----
TENANTS_DIR = os.getenv("TENANTS_DIR", os.path.join(os.path.dirname(__file__), "..", "tenants_data"))
os.makedirs(TENANTS_DIR, exist_ok=True)

# For non-SQLite tenant storage (MySQL/PostgreSQL), set a URL *template*
# containing {slug} - e.g. mysql+pymysql://root:pass@localhost/barberpro_{slug}
# Leave empty to use the default per-tenant SQLite file.
TENANT_DATABASE_URL_TEMPLATE = os.getenv("TENANT_DATABASE_URL_TEMPLATE", "")

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-to-a-long-random-secret-string")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

# The single platform owner account (creates/manages barbershops).
SUPERADMIN_LOGIN = os.getenv("SUPERADMIN_LOGIN", "superadmin")
SUPERADMIN_PASSWORD = os.getenv("SUPERADMIN_PASSWORD", "super123")

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
