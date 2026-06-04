BEGIN;

SELECT
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
FROM ai_audit_logs
WHERE 0;

SELECT
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
FROM ai_feedback_events
WHERE 0;

COMMIT;
