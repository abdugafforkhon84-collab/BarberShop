"""
routers/clients.py
------------------------------------------------------------
Client management - admin only. Exposes visit stats (count,
total spent, last visit) computed from bookings.
------------------------------------------------------------
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_tenant_db, require_tenant_admin
from ..utils import booking_to_out

router = APIRouter(prefix="/clients", tags=["clients"], dependencies=[Depends(require_tenant_admin)])


@router.get("", response_model=list[schemas.ClientStats])
def list_clients(search: Optional[str] = None, db: Session = Depends(get_tenant_db)):
    query = db.query(models.Client)
    if search:
        like = f"%{search}%"
        query = query.filter((models.Client.name.ilike(like)) | (models.Client.phone.ilike(like)))

    clients = query.order_by(models.Client.name).all()
    result = []
    for c in clients:
        done_bookings = [b for b in c.bookings if b.status == models.BookingStatus.done]
        last_visit = max((b.date for b in done_bookings), default=None)
        display_phone = "" if (not c.phone or c.phone.startswith("no-phone-")) else c.phone
        result.append(schemas.ClientStats(
            id=c.id, name=c.name, phone=display_phone, created_at=c.created_at,
            visits=len(done_bookings),
            total_spent=sum(b.price for b in done_bookings),
            last_visit=last_visit,
        ))
    return result


@router.post("", response_model=schemas.ClientOut)
def create_client(payload: schemas.ClientCreate, db: Session = Depends(get_tenant_db)):
    clean_name = payload.name.strip()
    clean_phone = (payload.phone or "").strip()
    if clean_phone and not clean_phone.startswith("no-phone-"):
        if db.query(models.Client).filter(models.Client.phone == clean_phone).first():
            raise HTTPException(status_code=400, detail="Клиент с таким телефоном уже существует")
        phone_to_save = clean_phone
    else:
        import uuid
        phone_to_save = f"no-phone-{uuid.uuid4().hex[:8]}"
    client = models.Client(name=clean_name, phone=phone_to_save)
    db.add(client)
    db.commit()
    db.refresh(client)
    display_phone = "" if client.phone.startswith("no-phone-") else client.phone
    return schemas.ClientOut(id=client.id, name=client.name, phone=display_phone, created_at=client.created_at)


@router.put("/{client_id}", response_model=schemas.ClientOut)
def update_client(client_id: int, payload: schemas.ClientUpdate, db: Session = Depends(get_tenant_db)):
    client = db.query(models.Client).get(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"]:
        client.name = data["name"].strip()
    if "phone" in data:
        p = (data["phone"] or "").strip()
        if p and not p.startswith("no-phone-"):
            existing = db.query(models.Client).filter(models.Client.phone == p, models.Client.id != client_id).first()
            if existing:
                raise HTTPException(status_code=400, detail="Клиент с таким телефоном уже существует")
            client.phone = p
        elif not client.phone or not client.phone.startswith("no-phone-"):
            import uuid
            client.phone = f"no-phone-{uuid.uuid4().hex[:8]}"
    db.commit()
    db.refresh(client)
    display_phone = "" if client.phone.startswith("no-phone-") else client.phone
    return schemas.ClientOut(id=client.id, name=client.name, phone=display_phone, created_at=client.created_at)


@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_tenant_db)):
    client = db.query(models.Client).get(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    db.delete(client)
    db.commit()
    return {"success": True}


@router.get("/{client_id}/history", response_model=list[schemas.BookingOut])
def client_history(client_id: int, db: Session = Depends(get_tenant_db)):
    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.client_id == client_id)
        .order_by(models.Booking.date.desc(), models.Booking.time.desc())
        .all()
    )
    return [booking_to_out(b) for b in bookings]
