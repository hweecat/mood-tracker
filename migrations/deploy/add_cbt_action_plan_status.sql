-- Deploy mood-tracker:add_cbt_action_plan_status to sqlite
-- requires: cbt_logs

BEGIN;

ALTER TABLE cbt_logs
ADD COLUMN action_plan_status TEXT NOT NULL DEFAULT 'pending';

COMMIT;
