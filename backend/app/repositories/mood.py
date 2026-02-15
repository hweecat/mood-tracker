import json
from typing import List
from sqlite3 import Connection
from app.schemas.mood import MoodCreate
from app.services.ai_client import analyze_mood_note
from app.core.logging import get_logger

logger = get_logger(__name__)

def get_mood_entries(db: Connection, user_id: str) -> List[dict]:
    logger.info("Fetching mood entries", extra={"user_id": user_id})
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM mood_entries WHERE user_id = ? ORDER BY timestamp DESC", 
        (user_id,)
    )
    rows = cursor.fetchall()
    return [
        {
            **dict(row),
            "emotions": json.loads(row["emotions"]),
            "ai_analysis": json.loads(row["ai_analysis"]) if row["ai_analysis"] else None
        } 
        for row in rows
    ]

async def create_mood_entry(db: Connection, user_id: str, mood_in: MoodCreate) -> dict:
    logger.info("Creating mood entry", extra={"user_id": user_id, "mood_id": mood_in.id})
    ai_analysis = None
    if mood_in.note:
        ai_analysis = await analyze_mood_note(mood_in.note)

    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO mood_entries (id, rating, emotions, note, trigger, behavior, timestamp, user_id, ai_analysis)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            mood_in.id,
            mood_in.rating,
            json.dumps(mood_in.emotions),
            mood_in.note,
            mood_in.trigger,
            mood_in.behavior,
            mood_in.timestamp,
            user_id,
            json.dumps(ai_analysis) if ai_analysis else None
        )
    )
    db.commit()
    
    logger.info("Mood entry created successfully", extra={"mood_id": mood_in.id})
    # Return a dict that matches the MoodPublic schema
    return {
        **mood_in.model_dump(), 
        "user_id": user_id, 
        "ai_analysis": ai_analysis
    }

def delete_mood_entry(db: Connection, user_id: str, mood_id: str) -> bool:
    logger.info("Attempting to delete mood entry", extra={"user_id": user_id, "mood_id": mood_id})
    cursor = db.cursor()
    
    # Check if it exists before deleting to handle the edge case gracefully
    cursor.execute("SELECT id FROM mood_entries WHERE id = ? AND user_id = ?", (mood_id, user_id))
    if not cursor.fetchone():
        logger.info("Mood entry not found, considering delete successful (idempotent)", extra={"mood_id": mood_id})
        return True

    cursor.execute(
        "DELETE FROM mood_entries WHERE id = ? AND user_id = ?",
        (mood_id, user_id)
    )
    db.commit()
    success = cursor.rowcount > 0
    logger.info("Mood entry deletion result", extra={"mood_id": mood_id, "success": success})
    return success
