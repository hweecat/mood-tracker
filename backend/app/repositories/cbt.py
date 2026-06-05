import json
import sqlite3
from typing import Any, List
from sqlite3 import Connection
from app.schemas.cbt import CBTLogPublic, CBTLogCreate
from app.schemas.ai_audit import AIFeedbackEventCreate
from app.repositories.ai_audit import create_ai_feedback_event
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
            rational_response, mood_before, mood_after, behavioral_link, action_plan_status, user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            log_in.action_plan_status,
            user_id
        )
    )
    db.commit()
    _capture_ai_feedback_event(db, user_id=user_id, log_in=log_in)
    logger.info("CBT log created successfully", extra={"log_id": log_in.id})
    return {**log_in.model_dump(), "user_id": user_id}


def _capture_ai_feedback_event(db: Connection, user_id: str, log_in: CBTLogCreate) -> None:
    if not (log_in.ai_analysis_id or log_in.feedback_source):
        return

    accepted_distortions = log_in.accepted_distortions_payload or [
        {"distortion": distortion} for distortion in log_in.distortions
    ]
    suggested_distortions = log_in.ai_suggested_distortions or []
    ignored_distortions = log_in.ignored_distortions_payload or [
        {"distortion": distortion}
        for distortion in suggested_distortions
        if distortion not in log_in.distortions
    ]
    ignored_reframes = log_in.ignored_reframes_payload or [
        {"id": reframe_id}
        for reframe_id in (log_in.ignored_reframe_ids or [])
    ]
    audit_log = _verified_user_audit_log(
        db,
        audit_log_id=log_in.ai_analysis_id,
        user_id=user_id,
    )
    ai_response_payload = _decode_mapping(audit_log["response_payload"]) if audit_log else {}

    create_ai_feedback_event(
        db,
        AIFeedbackEventCreate(
            audit_log_id=audit_log["id"] if audit_log else None,
            user_id=user_id,
            cbt_log_id=log_in.id,
            ai_suggestions_payload=_list_of_mappings(
                ai_response_payload.get("suggestions")
                or ai_response_payload.get("distortions")
            ),
            ai_reframes_payload=_list_of_mappings(ai_response_payload.get("reframes")),
            ai_action_plans_payload=_list_of_mappings(
                ai_response_payload.get("actionPlans")
                or ai_response_payload.get("action_plans")
                or ai_response_payload.get("actionPlansPayload")
            ),
            accepted_distortions_payload=accepted_distortions,
            ignored_distortions_payload=ignored_distortions,
            accepted_reframe_payload=(
                log_in.accepted_reframe_payload
                if log_in.accepted_reframe_payload is not None
                else (
                    {"id": log_in.accepted_reframe_id}
                    if log_in.accepted_reframe_id
                    else None
                )
            ),
            ignored_reframes_payload=ignored_reframes,
            user_rational_response=log_in.rational_response,
            accepted_action_plan_payload=(
                log_in.accepted_action_plan_payload
                if log_in.accepted_action_plan_payload is not None
                else (
                    {"id": log_in.accepted_action_plan_id}
                    if log_in.accepted_action_plan_id
                    else None
                )
            ),
            user_action_plan=log_in.behavioral_link,
            source=log_in.feedback_source or "user_original",
        ),
    )


def _verified_user_audit_log(
    db: Connection,
    audit_log_id: str | None,
    user_id: str,
) -> sqlite3.Row | None:
    if not audit_log_id or not _table_exists(db, "ai_audit_logs"):
        return None

    row = db.execute(
        "SELECT id, response_payload FROM ai_audit_logs WHERE id = ? AND user_id = ?",
        (audit_log_id, user_id),
    ).fetchone()
    return row


def _decode_mapping(payload: Any) -> dict[str, Any]:
    if isinstance(payload, dict):
        return payload
    if not isinstance(payload, str):
        return {}
    try:
        decoded = json.loads(payload)
    except json.JSONDecodeError:
        return {}
    return decoded if isinstance(decoded, dict) else {}


def _list_of_mappings(payload: Any) -> list[dict[str, Any]] | None:
    if not isinstance(payload, list):
        return None
    return [item for item in payload if isinstance(item, dict)]


def _table_exists(db: Connection, table_name: str) -> bool:
    row = db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None

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
            action_plan_status = ?,
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
            log_in.action_plan_status,
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

    _delete_feedback_events_for_cbt_log(db, user_id=user_id, log_id=log_id)

    cursor.execute(
        "DELETE FROM cbt_logs WHERE id = ? AND user_id = ?",
        (log_id, user_id)
    )
    db.commit()
    success = cursor.rowcount > 0
    logger.info("CBT log deletion result", extra={"log_id": log_id, "success": success})
    return success


def _delete_feedback_events_for_cbt_log(
    db: Connection,
    user_id: str,
    log_id: str,
) -> None:
    if not _table_exists(db, "ai_feedback_events"):
        return

    try:
        db.execute(
            "DELETE FROM ai_feedback_events WHERE cbt_log_id = ? AND user_id = ?",
            (log_id, user_id),
        )
    except sqlite3.OperationalError:
        logger.warning(
            "AI feedback cleanup skipped because feedback schema is unavailable",
            extra={"log_id": log_id},
        )
