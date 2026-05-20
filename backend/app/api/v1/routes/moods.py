from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.db.session import get_db
from app.schemas.mood import MoodPublic, MoodCreate
from app.repositories.mood import get_mood_entries, create_mood_entry, delete_mood_entry

router = APIRouter()

@router.get("/", response_model=List[MoodPublic])
def read_moods(db = Depends(get_db)):
    return get_mood_entries(db, user_id="1")

@router.post("/", response_model=MoodPublic)
async def create_mood(mood_in: MoodCreate, db = Depends(get_db)):
    return await create_mood_entry(db, user_id="1", mood_in=mood_in)

@router.delete("/{mood_id}")
def remove_mood(mood_id: str, db = Depends(get_db)):
    if not delete_mood_entry(db, user_id="1", mood_id=mood_id):
        raise HTTPException(status_code=404, detail="Mood entry not found")
    return {"status": "success"}
