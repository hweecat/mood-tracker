# ADR-009: NextAuth Session Wrapper Around Backend JWT Auth

## Status

Accepted

## Context

The auth worktree introduces:

- backend-issued JWT login
- protected FastAPI routes using bearer token validation
- NextAuth-based frontend session management
- password reset via one-time reset tokens

Earlier planning considered moving to a pure JWT-only frontend model. The implemented branch did not take that route. The frontend is currently built around NextAuth session state and route middleware, while the backend remains the source of truth for API authorization.

Password reset also needed a production-like test path without requiring a real third-party email provider.

## Decision

We keep the current hybrid auth model:

1. **Frontend session handling uses NextAuth Credentials**
   - Login is initiated from the frontend via NextAuth.
   - NextAuth stores the backend-issued access token in the session as `session.accessToken`.
   - Frontend route protection is enforced by NextAuth middleware.

2. **Backend API authorization uses bearer JWTs**
   - `POST /api/v1/auth/login` mints the backend JWT.
   - Protected backend routes validate the token via `get_current_user`.
   - When `ENABLE_AUTH=false`, the backend may still return the legacy demo user.

3. **CamelCase is the wire-level JSON contract**
   - Backend schemas inherit from `TunedBaseModel`.
   - Auth payloads are serialized as camelCase JSON (`accessToken`, `tokenType`, `resetUrl`, `resetToken`).
   - Frontend code must treat that camelCase response shape as canonical.

4. **Password reset uses hashed tokens and SMTP delivery**
   - `forgot-password` always returns a generic success message.
   - Raw reset tokens are stored only as hashes in the database.
   - SMTP delivery is enabled with `SMTP_ENABLED=true`.
   - Mailpit is used for local production-style testing.
   - Raw `resetUrl`/`resetToken` values are returned only when `PASSWORD_RESET_DEBUG=true`.

## Rationale

- Preserves existing NextAuth-oriented frontend ergonomics.
- Keeps backend API authorization explicit and testable.
- Avoids coupling local testing to a real email provider.
- Supports realistic password reset verification through Mailpit.
- Minimizes additional churn while auth hardening remains in active development.

## Consequences

### Positive

- Clear separation between browser session handling and backend API authorization.
- Password reset can be tested through an inbox-like flow rather than only debug JSON payloads.
- Protected frontend pages and protected backend routes can be reasoned about independently.

### Negative

- The auth model is hybrid and therefore more fragile at the frontend/backend handoff.
- A successful backend login can still appear to fail if the frontend reads the wrong token field name.
- Existing JWTs are not invalidated after password reset.

## Operational Notes

- Public frontend routes:
  - `/login`
  - `/register`
  - `/forgot-password`
  - `/reset-password`
- Local prod-style reset email testing:
  - Mailpit UI at `http://localhost:8025`
- Important env flags:
  - `ENABLE_AUTH`
  - `PASSWORD_RESET_DEBUG`
  - `SMTP_ENABLED`

## Revisit Trigger

Revisit this ADR if:

- the hybrid session/JWT handoff causes repeated regressions
- non-browser clients become a primary use case
- post-reset JWT invalidation becomes a requirement
- the team decides to simplify to a single frontend auth abstraction
