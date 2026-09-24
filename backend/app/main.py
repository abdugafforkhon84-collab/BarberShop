"""
main.py
------------------------------------------------------------
FastAPI application entrypoint for the multi-tenant BarberPro
platform.

Run with:
    uvicorn app.main:app --reload

Three layers, three databases:
  1. Superadmin (platform owner) - one seeded account, lives in
     the master database. Creates/manages barbershops. Cannot
     see any shop's business data.
  2. Shop admin - one per barbershop, created by the superadmin
     via POST /superadmin/tenants. Credentials live in the
     master DB (Tenant.admin_login/admin_password_hash); the
     shop's own database (created automatically) holds nothing
     about the admin at all - only that shop's barbers, clients,
     bookings, services, payments and settings.
  3. Barbers - created by a shop's own admin, stored only in
     that shop's database.

On first run this will:
  1. Create the master DB tables.
  2. Seed the single superadmin account (login/password from
     .env, defaults to superadmin / super123).

Per-tenant databases are created on demand (see tenant_db.py) -
there is nothing to seed globally for them; a brand-new shop
starts empty and its own admin adds barbers/services from there.
------------------------------------------------------------
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS, SUPERADMIN_LOGIN, SUPERADMIN_PASSWORD
from .master_database import MasterBase, MasterSessionLocal, master_engine
from .master_models import PlatformAdmin
from .routers import admin, auth, barber, clients, services, settings as settings_router, superadmin
from .security import hash_password

MasterBase.metadata.create_all(bind=master_engine)

app = FastAPI(title="BarberPro API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(superadmin.router)
app.include_router(admin.router)
app.include_router(barber.router)
app.include_router(clients.router)
app.include_router(services.router)
app.include_router(settings_router.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "BarberPro API"}

# Serve frontend statically in production
import os
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.isdir(frontend_dist):
    # Serve assets directly
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        
    @app.api_route("/{path_name:path}", methods=["GET"])
    def catch_all(path_name: str):
        # Don't intercept API calls
        if path_name.startswith("api/"):
            return {"detail": "Not Found"}
            
        file_path = os.path.join(frontend_dist, path_name)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # SPA fallback
        return FileResponse(os.path.join(frontend_dist, "index.html"))

def seed_platform_admin() -> None:
    db = MasterSessionLocal()
    try:
        if not db.query(PlatformAdmin).first():
            db.add(PlatformAdmin(
                login=SUPERADMIN_LOGIN,
                password_hash=hash_password(SUPERADMIN_PASSWORD),
                full_name="Владелец платформы",
            ))
            db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    from .migrate_master import migrate_master_db
    migrate_master_db()
    seed_platform_admin()


