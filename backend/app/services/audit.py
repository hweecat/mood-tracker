import time
import uuid
import json
from typing import Optional
from sqlite3 import Connection
from app.repositories.audit import AuditRepository
from app.schemas.audit import AIAuditLogCreate
from app.core.logging import get_logger

logger = get_logger(__name__)

class AuditService:
    def __init__(self, db: Connection):
        self.repository = AuditRepository(db)

    def log_interaction(
        self,
        correlation_id: str,
        masked_payload: str,
        response_payload: Optional[str] = None,
        safety_ratings: Optional[dict] = None,
        ignored_suggestions: Optional[list] = None,
        status: str = "SUCCESS"
    ) -> str:
        log_id = str(uuid.uuid4())
        
        log_in = AIAuditLogCreate(
            id=log_id,
            correlation_id=correlation_id,
            masked_payload=masked_payload,
            response_payload=response_payload,
            safety_ratings=json.dumps(safety_ratings) if safety_ratings else None,
            ignored_suggestions=json.dumps(ignored_suggestions) if ignored_suggestions else None,
            status=status,
            timestamp=int(time.time())
        )
        
        success = self.repository.create_log(log_in)
        if success:
            logger.info("AI interaction logged successfully", extra={"log_id": log_id})
        else:
            logger.error("AI interaction logging failed", extra={"correlation_id": correlation_id})
            
        return log_id
