# User Authentication & Session Management: Implementation Plan

This document now serves two purposes:

1. preserve the **original implementation plan** for historical traceability
2. record the **current implemented auth state** so the branch docs stay operationally accurate

## Current State Addendum

The implementation in this worktree differs from the original rollout plan in a few important ways:

- Frontend auth is implemented with **NextAuth Credentials**
- Backend auth is implemented with **FastAPI JWT bearer validation**
- Password reset is implemented with **hashed reset tokens**, **SMTP delivery**, and **Mailpit** for local production-style testing
- The backend still supports a **demo-user bypass** when `ENABLE_AUTH=false`

### Current Architecture

#### Frontend session model

- `frontend/src/lib/auth.ts` configures a `CredentialsProvider`
- Login submits credentials to `POST /api/v1/auth/login`
- The backend response is parsed and the returned backend access token is stored in the NextAuth JWT/session as `session.accessToken`
- `SessionProvider` is mounted globally through `frontend/src/components/AuthProvider.tsx`
- Route protection is enforced by `frontend/src/middleware.ts`

#### Backend auth model

- `backend/app/api/v1/routes/auth.py` exposes:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/forgot-password`
  - `POST /api/v1/auth/reset-password`
- `backend/app/api/deps.py` validates bearer tokens for protected routes through `get_current_user`
- When `ENABLE_AUTH=false`, `get_current_user` returns the hardcoded demo user instead of requiring a token

#### Session + API handshake

The live auth flow is:

1. User submits `username/email + password` on `/login`
2. NextAuth `authorize()` calls backend `POST /api/v1/auth/login`
3. Backend returns a JWT in the API response
4. Frontend uses that token to call `GET /api/v1/users/me`
5. Returned user data is stored in the NextAuth session
6. Authenticated frontend API calls must include `Authorization: Bearer <session.accessToken>`

### Wire Format Notes

Backend schemas inherit from `TunedBaseModel`, which applies a camelCase alias generator. That means JSON responses are camelCase on the wire even if Python fields are snake_case internally.

Examples:

- `Token.access_token` is returned as `accessToken`
- `Token.token_type` is returned as `tokenType`
- `ForgotPasswordResponse.reset_url` is returned as `resetUrl`
- `ForgotPasswordResponse.reset_token` is returned as `resetToken`

### Current Password Reset Behavior

- `/forgot-password` accepts `identifier` (email or username)
- Always returns a generic success message
- Generates a one-time raw token
- Stores only `sha256(token)` in the database
- Expires tokens after 60 minutes
- Clears reset fields after successful password change
- Sends reset links by SMTP when `SMTP_ENABLED=true`
- Uses Mailpit at `http://localhost:8025` for local production-style testing
- Returns the raw reset link only when `PASSWORD_RESET_DEBUG=true`

### Current Operational Flags

#### Backend

- `ENABLE_AUTH`
  - `true`: backend requires bearer tokens
  - `false`: backend returns the demo user from `get_current_user`
- `PASSWORD_RESET_DEBUG`
  - `true`: `/forgot-password` returns `resetToken` and `resetUrl`
  - `false`: response stays generic
- `SMTP_ENABLED`
  - `true`: send password reset email
  - `false`: no SMTP delivery

#### Frontend

- `NEXTAUTH_SECRET` is used by NextAuth middleware/session signing
- `API_SERVER_URL` / `NEXT_PUBLIC_API_URL` control backend routing

### Current Known Constraints

- Existing JWTs are **not invalidated** after a password reset
- The backend still supports the demo-user bypass when `ENABLE_AUTH=false`
- The current architecture is hybrid:
  - NextAuth manages frontend session state
  - FastAPI/JWT remains the backend source of truth for API authorization

## Historical Record: Original Plan

The following section preserves the original implementation plan as it was authored before the final auth shape settled.

## Current Status & Todos

- [x] Create a new git worktree `auth` and a new branch `feat/auth`.
- [x] Move this plan to `docs/auth/auth_implementation_plan.md` within the new worktree.
- [x] Add `passlib[bcrypt]` and `python-jose[cryptography]` to `backend/pyproject.toml`
- [x] Update database schema in `backend/app/db/session.py` (Add `password_hash`, `created_at`)
- [x] Implement `AuthService` in `backend/app/core/security.py` (Hashing, JWT)
- [x] Create Pydantic schemas in `backend/app/schemas/user.py`
- [x] Implement `/auth/register` and `/auth/login` in `backend/app/api/v1/routes/auth.py`
- [x] Implement `get_current_user` dependency in `backend/app/api/deps.py`
- [x] Refactor `moods.py`, `cbt_logs.py`, and `users.py` to use `get_current_user`
- [x] Update `backend/app/repositories/` to handle dynamic `user_id`
- [x] Update `frontend/src/lib/auth.ts` to call Backend Login
- [x] Update `frontend/src/hooks/useTrackerData.ts` to use JWT from session
- [x] Create `frontend/src/app/register/page.tsx`
- [x] Verify implementation with integration tests
- [x] Update backend to support login via Username or Email
- [x] Update frontend login form to accept Username or Email

## 0. Git Workspace Setup
- Command: `git worktree add auth -b feat/auth`
- All subsequent commands and file edits will take place within the `auth/` worktree directory.

## 1. Backend: Core Authentication Infrastructure

### 1.1 Dependencies & Configuration
- Add `passlib[bcrypt]` and `python-jose[cryptography]` to `backend/pyproject.toml`.
- Update `backend/app/core/constants.py` (or a new `config.py`) to include:
    - `SECRET_KEY` (from environment variable)
    - `ALGORITHM = "HS256"`
    - `ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7` (1 week)

### 1.2 Database Schema Update
- Modify `backend/app/db/session.py` -> `init_db()` to add `password_hash` (TEXT) and `created_at` (INTEGER) to the `users` table.
- Implement a simple migration check to add these columns to existing databases if they are missing.

### 1.3 Security Utilities (`backend/app/core/security.py`)
- `verify_password(plain_password, hashed_password) -> bool`
- `get_password_hash(password) -> str`
- `create_access_token(data: dict, expires_delta: timedelta | None = None) -> str`

### 1.4 Pydantic Schemas (`backend/app/schemas/user.py`)
- `UserCreate(UserBase)`: email, name, password.
- `UserPublic(UserBase)`: id, email, name, image, created_at.
- `Token`: access_token, token_type.
- `TokenData`: user_id (optional).

### 1.5 Authentication Routes (`backend/app/api/v1/routes/auth.py`)
- `POST /register`: 
    - Validate email uniqueness.
    - Hash password.
    - Create user in DB.
    - Return `UserPublic`.
- `POST /login`:
    - Verify email and password.
    - Generate JWT access token.
    - Return `Token` + `UserPublic`.

### 1.6 Authentication Dependency (`backend/app/api/deps.py`)
- `get_current_user(db = Depends(get_db), token = Depends(oauth2_scheme)) -> UserPublic`:
    - Verify JWT.
    - Extract `user_id`.
    - Fetch user from DB.
    - Raise 401 if invalid.

## 2. Backend: Refactoring Existing Routes

- **`moods.py`**: Inject `current_user: UserPublic = Depends(get_current_user)` and pass `current_user.id` to repository functions.
- **`cbt_logs.py`**: Inject `current_user: UserPublic = Depends(get_current_user)` and pass `current_user.id` to repository functions.
- **`users.py`**: Refactor `/me` to return `current_user` directly.
- **Repositories**: Ensure all repository functions in `backend/app/repositories/` accept `user_id` as an argument and use it in SQL queries.

## 3. Frontend: Next-Auth & API Integration

### 3.1 Next-Auth Configuration (`frontend/src/lib/auth.ts`)
- Update `authorize`:
    - POST to `${API_BASE_URL}/api/v1/auth/login`.
    - Store the returned `access_token` in the returned user object.
- Update `jwt` callback:
    - Persist `access_token` from the backend into the Next-Auth token.
- Update `session` callback:
    - Expose `access_token` in the session object.

### 3.2 Global API Client (`frontend/src/lib/api-utils.ts`)
- Implement a helper to include the `Authorization` header automatically if a session is present.

### 3.3 Custom Hook Update (`frontend/src/hooks/useTrackerData.ts`)
- Use `useSession()` from `next-auth/react`.
- Pass the token to all API calls.
- Remove hardcoded `userId: '1'`.

### 3.4 New UI Components
- **`frontend/src/app/register/page.tsx`**: Registration page following Neo-brutalist style.
- Update **`frontend/src/app/login/page.tsx`** to handle errors and redirect correctly.

## 4. Verification & Testing

- **Backend**:
    - Unit tests for hashing and JWT logic.
    - Integration tests for `/auth/register` and `/auth/login`.
    - Protected route tests ensuring 401 for missing/invalid tokens.
    - Password reset tests (see `docs/auth/password_reset_flow.md`).
- **Frontend**:
    - Manual E2E test of the Login -> Journal -> Logout flow.
    - Verify data is correctly partitioned by user.

## 5. Rollback Strategy
- Keep the hardcoded "Demo User" (ID: 1) in the DB for now, but ensure it cannot be logged in without a password if it were to be converted.
- Backup `data/mood-tracker.db` before applying migrations.
