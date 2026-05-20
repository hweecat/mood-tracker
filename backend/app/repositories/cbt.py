import json
from typing import List
from sqlite3 import Connection
from app.schemas.cbt import CBTLogPublic, CBTLogCreate
from app.core.logging import get_logger

logger = get_logger(__name__)

def get_cbt_logs(db: Connection, user_id: str) -> List[dict]:
    logger.info("Fetching CBT logs", extra={"user_id": user_id})
    cursor = db.cursor()
    cursor.execute(
        "SELECT * FROM cbt_logs WHERE user_id = ? ORDER BY timestamp DESC",
        (user_id,)
    )
    rows = cursor.fetchall()
    return [
        {
            **dict(row),
            "distortions": json.loads(row["distortions"]),
            "automatic_thoughts": row["automatic_thoughts"],
            "rational_response": row["rational_response"],
            "mood_before": row["mood_before"],
            "mood_after": row["mood_after"],
            "behavioral_link": row["behavioral_link"]
        }
        for row in rows
    ]

def create_cbt_log(db: Connection, user_id: str, log_in: CBTLogCreate) -> dict:
    logger.info("Creating CBT log", extra={"user_id": user_id, "log_id": log_in.id})
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO cbt_logs (
            id, timestamp, situation, automatic_thoughts, distortions, 
            rational_response, mood_before, mood_after, behavioral_link, user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            log_in.id,
            log_in.timestamp,
            log_in.situation,
            log_in.automatic_thoughts,
            json.dumps(log_in.distortions),
            log_in.rational_response,
            log_in.mood_before,
            log_in.mood_after,
            log_in.behavioral_link,
            user_id
        )
    )
    db.commit()
    logger.info("CBT log created successfully", extra={"log_id": log_in.id})
    return {**log_in.model_dump(), "user_id": user_id}

def update_cbt_log(db: Connection, user_id: str, log_in: CBTLogPublic) -> bool:
    logger.info("Updating CBT log", extra={"user_id": user_id, "log_id": log_in.id})
    cursor = db.cursor()
    cursor.execute(
        """
        UPDATE cbt_logs 
        SET 
            situation = ?, 
            automatic_thoughts = ?, 
            distortions = ?, 
            rational_response = ?, 
            mood_before = ?, 
            mood_after = ?, 
            behavioral_link = ?,
            timestamp = ?
        WHERE id = ? AND user_id = ?
        """,
        (
            log_in.situation,
            log_in.automatic_thoughts,
            json.dumps(log_in.distortions),
            log_in.rational_response,
            log_in.mood_before,
            log_in.mood_after,
            log_in.behavioral_link,
            log_in.timestamp,
            log_in.id,
            user_id
        )
    )
    db.commit()
    success = cursor.rowcount > 0
    logger.info("CBT log update result", extra={"log_id": log_in.id, "success": success})
    return success

def delete_cbt_log(db: Connection, user_id: str, log_id: str) -> bool:
    logger.info("Attempting to delete CBT log", extra={"user_id": user_id, "log_id": log_id})
    cursor = db.cursor()
    
    # Check if it exists before deleting to handle the edge case gracefully
    cursor.execute("SELECT id FROM cbt_logs WHERE id = ? AND user_id = ?", (log_id, user_id))
    if not cursor.fetchone():
        logger.info("CBT log not found, considering delete successful (idempotent)", extra={"log_id": log_id})
        return True

    cursor.execute(
        "DELETE FROM cbt_logs WHERE id = ? AND user_id = ?",
        (log_id, user_id)
    )
    db.commit()
    success = cursor.rowcount > 0
    logger.info("CBT log deletion result", extra={"log_id": log_id, "success": success})
    return success
