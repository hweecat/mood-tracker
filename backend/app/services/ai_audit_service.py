from app.core.logging import get_logger
from app.db.session import get_db
from app.repositories.ai_audit import create_ai_audit_log
from app.schemas.ai_audit import AIAuditLogCreate

logger = get_logger(__name__)


def record_ai_audit_log(audit_in: AIAuditLogCreate) -> str | None:
    db_gen = get_db()
    try:
        db = next(db_gen)
        row_id = create_ai_audit_log(db, audit_in)
        logger.info(
            "AI audit log created",
            extra={
                "audit_log_id": row_id,
                "correlation_id": audit_in.correlation_id,
                "provider": audit_in.provider,
                "model": audit_in.model,
                "operation": audit_in.operation,
                "status": audit_in.status,
                "latency_ms": audit_in.latency_ms,
            },
        )
        return row_id
    except Exception as exc:
        logger.error(
            "Failed to create AI audit log",
            extra={"error_type": type(exc).__name__},
        )
        return None
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass
