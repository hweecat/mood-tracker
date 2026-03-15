# User Authentication & Session Management: Implementation Plan

## Current Status & Todos

- [ ] Create a new git worktree `auth` and a new branch `feat/auth`.
- [ ] Move this plan to `docs/auth_implementation_plan.md` within the new worktree.
- [ ] Add `passlib[bcrypt]` and `python-jose[cryptography]` to `backend/pyproject.toml`
- [ ] Update database schema in `backend/app/db/session.py` (Add `password_hash`, `created_at`)
- [ ] Implement `AuthService` in `backend/app/core/security.py` (Hashing, JWT)
- [ ] Create Pydantic schemas in `backend/app/schemas/user.py`
- [ ] Implement `/auth/register` and `/auth/login` in `backend/app/api/v1/routes/auth.py`
- [ ] Implement `get_current_user` dependency in `backend/app/api/deps.py`
- [ ] Refactor `moods.py`, `cbt_logs.py`, and `users.py` to use `get_current_user`
- [ ] Update `backend/app/repositories/` to handle dynamic `user_id`
- [ ] Update `frontend/src/lib/auth.ts` to call Backend Login
- [ ] Update `frontend/src/hooks/useTrackerData.ts` to use JWT from session
- [ ] Create `frontend/src/app/register/page.tsx`
- [ ] Verify implementation with integration tests

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
- **Frontend**:
    - Manual E2E test of the Login -> Journal -> Logout flow.
    - Verify data is correctly partitioned by user.

## 5. Rollback Strategy
- Keep the hardcoded "Demo User" (ID: 1) in the DB for now, but ensure it cannot be logged in without a password if it were to be converted.
- Backup `data/mood-tracker.db` before applying migrations.
