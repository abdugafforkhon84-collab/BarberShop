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

# ---- Persistent data directory (for SQLite master.db and tenants_data) ----
# Supports Render Persistent Disk (/var/data), custom DATA_DIR, or local backend folder
DATA_DIR = os.getenv("DATA_DIR") or os.getenv("RENDER_DATA_DIR")
if DATA_DIR:
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
    except Exception:
        DATA_DIR = None

if not DATA_DIR:
    if os.path.isdir("/var/data"):
        DATA_DIR = "/var/data"
    else:
        DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

try:
    os.makedirs(DATA_DIR, exist_ok=True)
except Exception:
    pass

# ---- Platform (master) database - superadmin's own data only ----
raw_master_db = os.getenv("MASTER_DATABASE_URL", "").strip()
if not raw_master_db:
    default_master_path = os.path.join(DATA_DIR, "master.db").replace("\\", "/")
    MASTER_DATABASE_URL = f"sqlite:///{default_master_path}"
else:
    if raw_master_db.startswith("postgres://"):
        raw_master_db = raw_master_db.replace("postgres://", "postgresql://", 1)
    MASTER_DATABASE_URL = raw_master_db

# ---- Per-tenant databases: one physical SQLite file per barbershop ----
TENANTS_DIR = os.getenv("TENANTS_DIR", os.path.join(DATA_DIR, "tenants_data"))
os.makedirs(TENANTS_DIR, exist_ok=True)

# For non-SQLite tenant storage (MySQL/PostgreSQL), set a URL *template*
# containing {slug} - e.g. mysql+pymysql://root:pass@localhost/barberpro_{slug}
# Leave empty to use the default per-tenant SQLite file.
TENANT_DATABASE_URL_TEMPLATE = os.getenv("TENANT_DATABASE_URL_TEMPLATE", "")

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-to-a-long-random-secret-string")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))

# The single platform owner account (creates/manages barbershops).
SUPERADMIN_LOGIN = os.getenv("SUPERADMIN_LOGIN", "superadmin")
SUPERADMIN_PASSWORD = os.getenv("SUPERADMIN_PASSWORD", "super123")

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
