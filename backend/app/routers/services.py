"""
routers/services.py
------------------------------------------------------------
Service catalog (name / price / duration).
GET is available to any authenticated user (admin or barber).
Create / update / delete are admin-only.
------------------------------------------------------------
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_tenant_db, require_tenant_admin, require_tenant_member

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[schemas.ServiceOut])
def list_services(db: Session = Depends(get_tenant_db), _payload: dict = Depends(require_tenant_member)):
    return db.query(models.Service).order_by(models.Service.name).all()


@router.post("", response_model=schemas.ServiceOut, dependencies=[Depends(require_tenant_admin)])
def create_service(payload: schemas.ServiceCreate, db: Session = Depends(get_tenant_db)):
    service = models.Service(**payload.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.put("/{service_id}", response_model=schemas.ServiceOut, dependencies=[Depends(require_tenant_admin)])
def update_service(service_id: int, payload: schemas.ServiceUpdate, db: Session = Depends(get_tenant_db)):
    service = db.query(models.Service).get(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)

    db.commit()
    db.refresh(service)
    return service


@router.delete("/{service_id}", dependencies=[Depends(require_tenant_admin)])
def delete_service(service_id: int, db: Session = Depends(get_tenant_db)):
    service = db.query(models.Service).get(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    db.delete(service)
    db.commit()
    return {"success": True}
