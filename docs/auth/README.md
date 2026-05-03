# Auth Docs

Auth-related documentation lives in this folder to keep the top-level `docs/` focused on broader system documentation.

## Documents

- `auth_implementation_plan.md`: Implementation plan and status for auth hardening.
- `auth_implementation_plan_assessment.md`: Assessment and design decisions/tradeoffs for the auth approach.
- `password_reset_flow.md`: Password reset flow plan, design rationale, and task/test breakdown.
- `CHANGELOG.md`: Auth feature changelog (schema, endpoints, and UI touchpoints).

## Related ADR

- `../decisions/ADR-009-auth-session-and-password-reset.md`: Current auth/session architecture and password reset delivery decision record.

## Local Prod-Test Notes

- Password reset emails can be exercised locally through Mailpit.
- After starting the auth stack, open `http://localhost:8025` to inspect reset emails.
