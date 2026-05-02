# Auth Changelog

All notable changes to the auth worktree implementation are documented here.

This changelog focuses on the **auth feature surface** (auth routes, auth-dependent data access, and supporting schema changes) rather than AI features or general UI work.

## Unreleased

### Added

- Password reset flow (dev-mode link delivery):
  - `POST /api/v1/auth/forgot-password` mints one-time reset tokens without account enumeration.
  - `POST /api/v1/auth/reset-password` validates token + expiry and updates `password_hash`.
  - New UI pages: `/forgot-password` and `/reset-password`, plus a login-page link.
- Local production-style email testing for password reset:
  - Backend SMTP mailer for reset emails.
  - Docker `mailpit` service for inbox inspection at `http://localhost:8025`.
  - `SMTP_ENABLED`/`SMTP_HOST`/`SMTP_PORT`/`SMTP_FROM_*` environment configuration.

### Changed

- Authentication logging: stopped logging JWT values on login (logs user id only).
- Password reset behavior now prefers SMTP delivery and only returns raw reset links when `PASSWORD_RESET_DEBUG=true`.
- Auth documentation now reflects the current implemented model:
  - NextAuth Credentials for frontend session handling
  - backend-issued JWTs for API authorization
  - camelCase auth payloads on the wire

### Database

- Sqitch change `add_password_reset_fields` adds:
  - `users.password_reset_token_hash`
  - `users.password_reset_expires_at`
  - `users.password_reset_requested_at`

## 2026-03-16

### Database

- Sqitch change `add_cbt_action_plan_status` persists CBT action plan completion state:
  - `cbt_logs.action_plan_status` (default `pending`)

## 2026-03-15

### Database

- Sqitch change `add_user_auth_fields` adds required auth fields to users:
  - `users.username`, `users.password_hash`, `users.created_at`
