"""
routers/settings.py
------------------------------------------------------------
Read-only shop settings (working hours, slot length, currency)
available to ANY authenticated user - both the admin and every
barber need this to render the weekly calendar grid correctly.

Editing settings stays admin-only, at PUT /admin/settings
(see routers/admin.py).
------------------------------------------------------------
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_tenant_db, require_tenant_member

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=schemas.SettingsOut)
def get_settings(db: Session = Depends(get_tenant_db), _payload: dict = Depends(require_tenant_member)):
    settings = db.query(models.Settings).first()
    if not settings:
        settings = models.Settings()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings
