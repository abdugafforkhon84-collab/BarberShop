"""
routers/auth.py
------------------------------------------------------------
Single login endpoint for all three roles - the backend figures
out who's logging in from the login itself, so the frontend
never needs to ask "are you the platform owner, a shop admin, or
a barber?":

  1. Superadmin (master DB, one account)
  2. Shop admin (master DB Tenant.admin_login/password)
  3. Barber (routed via master DB's LoginIndex to the shop's own
     database, where the actual password check happens)

Whichever it is, the JWT that comes back carries `role` and,
for admin/barber, the shop's `tenant` slug - every other route
in the app trusts that claim to pick the right database.
------------------------------------------------------------
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_token_payload
from ..master_database import get_master_db
from ..master_models import LoginIndex, PlatformAdmin, Tenant
from ..security import create_access_token, verify_password
from ..tenant_db import open_tenant_session

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), master_db: Session = Depends(get_master_db)):
    login_value = form_data.username
    password = form_data.password

    # 1) Platform owner?
    platform_admin = master_db.query(PlatformAdmin).filter(PlatformAdmin.login == login_value).first()
    if platform_admin and verify_password(password, platform_admin.password_hash):
        token = create_access_token({"sub": str(platform_admin.id), "role": "superadmin"})
        return schemas.Token(access_token=token, role="superadmin", full_name=platform_admin.full_name)

    # 2) A shop's admin?
    tenant = master_db.query(Tenant).filter(Tenant.admin_login == login_value).first()
    if tenant and verify_password(password, tenant.admin_password_hash):
        if not tenant.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Этот барбершоп отключён администратором платформы")
        token = create_access_token({"sub": str(tenant.id), "role": "admin", "tenant": tenant.slug})
        return schemas.Token(access_token=token, role="admin", tenant=tenant.slug, shop_name=tenant.shop_name, full_name=tenant.shop_name)

    # 3) A barber? -> look up which shop via the routing index, then check
    #    the password inside THAT shop's own database.
    index_entry = master_db.query(LoginIndex).filter(LoginIndex.login == login_value, LoginIndex.role == "barber").first()
    if index_entry:
        owning_tenant = master_db.query(Tenant).filter(Tenant.slug == index_entry.tenant_slug).first()
        if owning_tenant and not owning_tenant.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Этот барбершоп отключён администратором платформы")

        tenant_db = open_tenant_session(index_entry.tenant_slug)
        try:
            barber = tenant_db.query(models.User).filter(models.User.login == login_value).first()
            if barber and verify_password(password, barber.password_hash):
                if not barber.is_active:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Учётная запись отключена")
                token = create_access_token({"sub": str(barber.id), "role": "barber", "tenant": index_entry.tenant_slug})
                return schemas.Token(
                    access_token=token, role="barber", tenant=index_entry.tenant_slug,
                    shop_name=owning_tenant.shop_name if owning_tenant else None,
                    full_name=barber.full_name,
                )
        finally:
            tenant_db.close()

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")


@router.get("/me", response_model=schemas.MeOut)
def me(payload: dict = Depends(get_token_payload), master_db: Session = Depends(get_master_db)):
    role = payload.get("role")

    if role == "superadmin":
        admin = master_db.query(PlatformAdmin).filter(PlatformAdmin.id == int(payload["sub"])).first()
        if not admin:
            raise HTTPException(status_code=404, detail="Не найдено")
        return schemas.MeOut(role="superadmin", login=admin.login, full_name=admin.full_name)

    tenant_slug = payload.get("tenant")
    tenant = master_db.query(Tenant).filter(Tenant.slug == tenant_slug).first() if tenant_slug else None

    if role == "admin":
        if not tenant:
            raise HTTPException(status_code=404, detail="Барбершоп не найден")
        return schemas.MeOut(role="admin", tenant=tenant.slug, shop_name=tenant.shop_name, login=tenant.admin_login, full_name=tenant.shop_name)

    if role == "barber":
        tenant_db = open_tenant_session(tenant_slug)
        try:
            barber = tenant_db.query(models.User).filter(models.User.id == int(payload["sub"])).first()
            if not barber:
                raise HTTPException(status_code=404, detail="Не найдено")
            return schemas.MeOut(
                role="barber", tenant=tenant_slug, shop_name=tenant.shop_name if tenant else None,
                login=barber.login, full_name=barber.full_name,
            )
        finally:
            tenant_db.close()

    raise HTTPException(status_code=401, detail="Некорректный токен")
