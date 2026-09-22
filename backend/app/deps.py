"""
deps.py
------------------------------------------------------------
Auth dependencies for all three layers of the app:

- get_token_payload    - decodes the JWT once; every other guard
                          below builds on this (FastAPI caches
                          dependency results per request, so the
                          token is only decoded once per call).
- require_superadmin     - platform owner only (master DB).
- get_tenant_db            - resolves the "tenant" claim in the
                             token to that shop's OWN database and
                             yields a session scoped to it. Used
                             by every admin/barber route.
- require_tenant_admin      - role must be "admin" (a shop owner).
                              No DB row is fetched for them - a
                              tenant admin lives only in the master
                              Tenant table (see auth.py), never
                              inside their own shop's database.
- require_tenant_barber       - role must be "barber"; fetches
                                the actual barber row from the
                                shop's own database, so routes get
                                a real models.User with .id, etc.
------------------------------------------------------------
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from . import models
from .master_database import get_master_db
from .master_models import PlatformAdmin
from .security import decode_access_token
from .tenant_db import open_tenant_session

# tokenUrl is only used by FastAPI's interactive docs to know where to log in
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Не удалось подтвердить учётные данные",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_token_payload(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        return decode_access_token(token)
    except JWTError:
        raise credentials_exception


# ============================================================ Superadmin (master DB)
def require_superadmin(
    payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_master_db),
) -> PlatformAdmin:
    if payload.get("role") != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступ только для владельца платформы")
    admin = db.query(PlatformAdmin).filter(PlatformAdmin.id == int(payload.get("sub", 0))).first()
    if not admin:
        raise credentials_exception
    return admin


# ============================================================ Tenant DB resolution
def get_tenant_db(payload: dict = Depends(get_token_payload)):
    tenant_slug = payload.get("tenant")
    if not tenant_slug:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Требуется контекст барбершопа")
    db = open_tenant_session(tenant_slug)
    try:
        yield db
    finally:
        db.close()


def require_tenant_admin(
    payload: dict = Depends(get_token_payload),
    _db: Session = Depends(get_tenant_db),  # ensures the tenant resolves to a real DB
) -> dict:
    if payload.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступ только для администратора барбершопа")
    return payload


def require_tenant_member(
    payload: dict = Depends(get_token_payload),
    _db: Session = Depends(get_tenant_db),
) -> dict:
    """Either the shop's admin or one of its barbers - used for endpoints
    both roles may read, like the service catalog and shop settings."""
    if payload.get("role") not in ("admin", "barber"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступ только для сотрудников барбершопа")
    return payload


def require_tenant_barber(
    payload: dict = Depends(get_token_payload),
    db: Session = Depends(get_tenant_db),
) -> models.User:
    if payload.get("role") != "barber":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Доступ только для барбера")
    user = db.query(models.User).filter(models.User.id == int(payload.get("sub", 0))).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user
