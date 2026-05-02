# Password Reset Flow (Auth Worktree)

This document defines the password reset flow for the auth worktree implementation, including the current design decisions, API/database behavior, and operational test path.

## Goals

- Provide a secure "forgot password" + "reset password" experience for users who registered with **username + email**.
- Avoid breaking existing login/register flows while we harden auth.
- Preserve developer ergonomics: local development should be testable without a third-party email provider.

## Non-Goals (For This Iteration)

- Third-party email provider integration and rich HTML template rendering.
- Advanced bot protection (captcha), rate limiting across IPs, or device-based risk checks.
- Forced invalidation of all existing JWTs after a reset (we call this out below as a future option).

## Current State (Context)

- Backend supports `/api/v1/auth/register` and `/api/v1/auth/login` and mints JWTs.
- Frontend uses NextAuth Credentials to sign in and stores the backend JWT in `session.accessToken`.
- Database uses Sqitch migrations with SQLite.
- Backend response models are serialized to **camelCase** JSON on the wire.

## Design Decisions (Critical Rationale)

### 1. SMTP-backed prod-style testing with local mail capture

**Decision:** `POST /forgot-password` always returns `200 OK`. For production-style testing we send the reset link over SMTP to a local mail catcher (`Mailpit`). Raw reset links are only returned when `PASSWORD_RESET_DEBUG=true`.

**Why:**

- We need to exercise the real "email arrives, user clicks link" path before a production rollout.
- Returning the raw reset token in production is an account takeover vulnerability.
- Mailpit gives us safe local visibility into outbound mail without coupling this branch to a real provider.

### 2. No account enumeration

**Decision:** `POST /forgot-password` always returns the same generic response whether the identifier exists or not.

**Why:**

- Prevents attackers from probing which emails/usernames are registered.
- Matches common practice for password reset UX.

### 3. Store only a hash of reset tokens

**Decision:** Store `sha256(reset_token)` (hex string) in the database, never the raw token. Compare by hashing the provided token and matching it.

**Why:**

- Reduces blast radius of DB exposure.
- Keeps implementation simple and compatible with SQLite.

### 4. Short TTL + one-time use

**Decision:** Reset tokens expire after 60 minutes and are cleared on successful reset.

**Why:**

- Limits replay and "old link" risks.
- Keeps behavior predictable.

### 5. Identifier input accepts email or username

**Decision:** `forgot-password` accepts an `identifier` which can be an email or username.

**Why:**

- Aligns with the login UX ("Email or Username").
- Reduces support friction.

### 6. JWT invalidation after reset is deferred

**Decision:** Do not invalidate existing JWTs after reset in this iteration.

**Why:**

- Minimizes disruption: avoids changing `get_current_user` token validation semantics.
- Keeps rollout smaller while we stabilize auth.

**Future option:** Add `password_changed_at` or a `token_version` claim and reject old tokens in `get_current_user`.

## Public API Changes

### `POST /api/v1/auth/forgot-password`

Request body:

```json
{ "identifier": "email-or-username" }
```

Response:

- Always `200 OK` with a generic message.
- In debug mode only, also include one of:
  - `resetToken` (raw) and/or
  - `resetUrl` (for the frontend reset page)

Implementation note:

- The Python model fields are `reset_token` and `reset_url`
- The JSON response shape is camelCase because backend schemas inherit from `TunedBaseModel`

### `POST /api/v1/auth/reset-password`

Request body:

```json
{ "token": "raw-reset-token", "newPassword": "..." }
```

Response:

- Current implementation returns `200 OK` with `{ "message": "Password updated successfully" }`.
- `400 Bad Request` for invalid/expired token (generic message).

## Database Changes (Sqitch / SQLite)

Add the following columns to `users`:

- `password_reset_token_hash TEXT`
- `password_reset_expires_at INTEGER` (unix timestamp seconds)
- `password_reset_requested_at INTEGER` (unix timestamp seconds)

Operational notes:

- Use `ALTER TABLE ... ADD COLUMN ...` for deploy.
- Provide a revert script using the existing SQLite "recreate table" pattern used elsewhere in the repo.

## Current Implementation Notes

### Backend behavior

- `/forgot-password`
  - looks up user by email or username
  - mints a one-time reset token
  - stores only the hashed token in SQLite
  - sends the reset URL by SMTP when `SMTP_ENABLED=true`
  - returns `resetToken` and `resetUrl` only when `PASSWORD_RESET_DEBUG=true`
- `/reset-password`
  - hashes the submitted token
  - matches it against `password_reset_token_hash`
  - checks expiry
  - updates `password_hash`
  - clears reset metadata

### Frontend behavior

- `/login` links to `/forgot-password`
- `/forgot-password`
  - always shows a generic success message
  - renders a continue link only when `resetUrl` is returned in debug mode
- `/reset-password`
  - reads `token` from the query string
  - submits `newPassword` to the backend
  - redirects back to login on success

### Tests in repository

- Backend integration coverage exists in `backend/tests/integration/test_password_reset_flow.py`
- Frontend coverage exists in:
  - `frontend/__tests__/ForgotPasswordPage.test.tsx`
  - `frontend/__tests__/ResetPasswordPage.test.tsx`

## Acceptance Criteria

- A user can request a reset, reset their password, and login with the new password.
- Reset token is time-limited and one-time use.
- `/forgot-password` does not expose whether a user exists.
- No raw secrets are logged (JWTs or reset tokens).
- In Docker-based prod testing, reset emails are visible in Mailpit at `http://localhost:8025`.

## Docker Prod-Test Setup

- Backend env:
  - `SMTP_ENABLED=true`
  - `SMTP_HOST=mailpit`
  - `SMTP_PORT=1025`
  - `SMTP_FROM_EMAIL=no-reply@mindfultrack.local`
  - `SMTP_FROM_NAME=MindfulTrack`
  - `PASSWORD_RESET_DEBUG=false`
- Docker service:
  - `mailpit` on port `8025` for web UI and `1025` for SMTP.
- Test flow:
  1. Open the app and submit `/forgot-password`.
  2. Open Mailpit at `http://localhost:8025`.
  3. Open the delivered message and follow the reset link.
  4. Submit a new password and verify login succeeds with the new credential.
