-- Verify mood-tracker:add_cbt_action_plan_status on sqlite

BEGIN;

SELECT action_plan_status FROM cbt_logs WHERE 0;

COMMIT;
