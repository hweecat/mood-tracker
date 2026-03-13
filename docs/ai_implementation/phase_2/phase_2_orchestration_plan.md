# Phase 2 Orchestration Plan: Parallel Development via Worktrees

This document outlines the strategy for implementing Phase 2: Cognitive Intelligence using Git Worktrees to manage three parallel development streams.

## 1. Core Strategy: The "Contract-First" Approach
To ensure parallel streams don't diverge, we will define a shared API schema in the `main` branch before splitting. This serves as the single source of truth for both frontend and backend teams.

## 2. Worktree Configuration

| Directory | Branch | Responsibility | Sparse Checkout |
| :--- | :--- | :--- | :--- |
| `.worktrees/gemini` | `feat/gemini-integration` | **The Brain**: Gemini logic. | `backend/` |
| `.worktrees/pii` | `feat/pii-masking` | **The Shield**: PII/Privacy. | `backend/` |
| `.worktrees/ui` | `feat/ai-ui-components` | **The Face**: UI Components. | `frontend/` |

## 3. Development Streams

### Stream A: Gemini Integration
- **Key Files**: `backend/app/services/ai_client.py`, `backend/app/api/v1/routes/cbt_logs.py`.
- **Goals**: 
    - Initialize `google-generative-ai` client.
    - Implement distortion detection and rational reframing logic.
    - Handle safety fallbacks and structured JSON outputs.

### Stream B: PII Masking & Privacy
- **Key Files**: `backend/app/api/middleware.py`, `backend/app/services/pii_service.py`.
- **Goals**:
    - Build regex-based or library-based PII redaction (names, dates, locations).
    - Implement FastAPI middleware to intercept AI-bound requests.
    - Log PII-free payloads to `ai_audit_logs`.

### Stream C: AI UI Components
- **Key Files**: `frontend/src/components/CBTLogForm.tsx`, `frontend/src/hooks/useCBTAnalysis.ts`.
- **Goals**:
    - Add "Analyze with AI" triggers in the CBT journaling flow.
    - Implement selection UI for AI-generated rational reframes.
    - Add optimistic UI and loading shimmer states.

## 4. Convergence & Integration Path
1. **Schema Finalization**: Commit shared Pydantic models to `main`.
2. **Backend Shielding**: Merge `feat/pii-masking` into `feat/gemini-integration` once both are verified.
3. **Frontend Hook-up**: Point `feat/ai-ui-components` to the live backend endpoints.
4. **Final Merge**: All branches merge back to `main` after end-to-end integration testing.

## 5. Initialization Commands
```bash
# Initialize internal worktrees
mkdir -p .worktrees
git worktree add .worktrees/ui feat/ai-ui-components
git worktree add .worktrees/gemini feat/gemini-integration
git worktree add .worktrees/pii feat/pii-masking

# Configure Sparse Checkout for UI (Frontend only)
cd .worktrees/ui && git sparse-checkout set frontend && cd ../..

# Configure Sparse Checkout for Backend streams
cd .worktrees/gemini && git sparse-checkout set backend && cd ../..
cd .worktrees/pii && git sparse-checkout set backend && cd ../..
```
