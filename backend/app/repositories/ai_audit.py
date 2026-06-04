import json
import time
import uuid
from typing import Any
from sqlite3 import Connection

from app.schemas.ai_audit import AIAuditLogCreate, AIFeedbackEventCreate


def _serialize_json(payload: Any | None) -> str | None:
    if payload is None:
        return None
    return json.dumps(payload, sort_keys=True)


def create_ai_audit_log(db: Connection, audit_in: AIAuditLogCreate) -> str:
    row_id = str(uuid.uuid4())
    created_at = audit_in.created_at or int(time.time())

    db.execute(
        """
        INSERT INTO ai_audit_logs (
            id,
            correlation_id,
            user_id,
            entry_type,
            entry_id,
            operation,
            provider,
            model,
            prompt_version_id,
            masked_request_payload,
            response_payload,
            safety_ratings,
            safety_tier,
            latency_ms,
            status,
            error_code,
            schema_version,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            row_id,
            audit_in.correlation_id,
            audit_in.user_id,
            audit_in.entry_type,
            audit_in.entry_id,
            audit_in.operation,
            audit_in.provider,
            audit_in.model,
            audit_in.prompt_version_id,
            _serialize_json(audit_in.masked_request_payload),
            _serialize_json(audit_in.response_payload),
            _serialize_json(audit_in.safety_ratings),
            audit_in.safety_tier,
            audit_in.latency_ms,
            audit_in.status,
            audit_in.error_code,
            audit_in.schema_version,
            created_at,
        ),
    )
    db.commit()
    return row_id


def create_ai_feedback_event(db: Connection, feedback_in: AIFeedbackEventCreate) -> str:
    row_id = str(uuid.uuid4())
    created_at = feedback_in.created_at or int(time.time())

    db.execute(
        """
        INSERT INTO ai_feedback_events (
            id,
            audit_log_id,
            user_id,
            cbt_log_id,
            ai_suggestions_payload,
            ai_reframes_payload,
            ai_action_plans_payload,
            accepted_distortions_payload,
            ignored_distortions_payload,
            accepted_reframe_payload,
            ignored_reframes_payload,
            user_rational_response,
            accepted_action_plan_payload,
            user_action_plan,
            source,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            row_id,
            feedback_in.audit_log_id,
            feedback_in.user_id,
            feedback_in.cbt_log_id,
            _serialize_json(feedback_in.ai_suggestions_payload),
            _serialize_json(feedback_in.ai_reframes_payload),
            _serialize_json(feedback_in.ai_action_plans_payload),
            _serialize_json(feedback_in.accepted_distortions_payload),
            _serialize_json(feedback_in.ignored_distortions_payload),
            _serialize_json(feedback_in.accepted_reframe_payload),
            _serialize_json(feedback_in.ignored_reframes_payload),
            feedback_in.user_rational_response,
            _serialize_json(feedback_in.accepted_action_plan_payload),
            feedback_in.user_action_plan,
            feedback_in.source,
            created_at,
        ),
    )
    db.commit()
    return row_id
