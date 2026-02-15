from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.db.session import get_db
from app.schemas.cbt import CBTLogPublic, CBTLogCreate
from app.repositories.cbt import get_cbt_logs, create_cbt_log, update_cbt_log, delete_cbt_log

router = APIRouter()

@router.get("/", response_model=List[CBTLogPublic])
def read_cbt_logs(db = Depends(get_db)):
    return get_cbt_logs(db, user_id="1")

@router.post("/", response_model=CBTLogPublic)
def create_cbt(log_in: CBTLogCreate, db = Depends(get_db)):
    return create_cbt_log(db, user_id="1", log_in=log_in)

@router.put("/{log_id}", response_model=CBTLogPublic)
def update_cbt(log_id: str, log_in: CBTLogPublic, db = Depends(get_db)):
    if not update_cbt_log(db, user_id="1", log_in=log_in):
        raise HTTPException(status_code=404, detail="CBT log not found")
    return log_in

@router.delete("/{log_id}")
def remove_cbt(log_id: str, db = Depends(get_db)):
    if not delete_cbt_log(db, user_id="1", log_id=log_id):
        raise HTTPException(status_code=404, detail="CBT log not found")
    return {"status": "success"}
