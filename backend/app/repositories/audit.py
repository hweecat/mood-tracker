import json
from typing import Optional
from sqlite3 import Connection
from app.schemas.audit import AIAuditLogCreate
from app.core.logging import get_logger

logger = get_logger(__name__)

class AuditRepository:
    def __init__(self, db: Connection):
        self.db = db

    def create_log(self, log_in: AIAuditLogCreate) -> bool:
        logger.info("Creating AI audit log", extra={
            "correlation_id": log_in.correlation_id,
            "status": log_in.status
        })
        try:
            cursor = self.db.cursor()
            cursor.execute(
                """
                INSERT INTO ai_audit_logs (
                    id, correlation_id, masked_payload, response_payload, 
                    safety_ratings, ignored_suggestions, status, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    log_in.id,
                    log_in.correlation_id,
                    log_in.masked_payload,
                    log_in.response_payload,
                    log_in.safety_ratings,
                    log_in.ignored_suggestions,
                    log_in.status,
                    log_in.timestamp
                )
            )
            self.db.commit()
            return True
        except Exception as e:
            logger.error("Failed to create AI audit log", extra={"error": str(e)})
            return False

    def get_log_by_id(self, log_id: str) -> Optional[dict]:
        cursor = self.db.cursor()
        cursor.execute("SELECT * FROM ai_audit_logs WHERE id = ?", (log_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
