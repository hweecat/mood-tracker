# Proposed Naming & Structure Improvements

This document outlines refinements to the project's naming conventions and directory structure to improve clarity, maintainability, and idiomatic consistency across the Python and TypeScript stacks.

## 1. Unified Naming Bridge (Snake vs. Camel Case)

To resolve the friction between Python's `snake_case` and TypeScript's `camelCase` without manual mapping in every CRUD operation, we will implement a Pydantic `alias_generator`.

### Strategy:
*   **Backend:** Use `snake_case` for all internal Python logic and database columns.
*   **API:** Automatically convert to `camelCase` when sending JSON to the frontend.
*   **Implementation:**
    ```python
    from pydantic import BaseModel, ConfigDict
    from pydantic.alias_generators import to_camel

    class TunedBaseModel(BaseModel):
        model_config = ConfigDict(
            alias_generator=to_camel,
            populate_by_name=True,
            from_attributes=True,
        )
    ```
*   **Outcome:** Backend uses `ai_analysis`, Frontend receives `aiAnalysis`.

## 2. Semantic Directory Refinement

Rename generic directories to industry-standard terms that better describe their responsibility.

| Current Path | Proposed Path | Reason |
| :--- | :--- | :--- |
| `backend/app/crud/` | `backend/app/repositories/` | "Repository" is the standard term for the data access layer. |
| `backend/app/lib/` | `backend/app/services/` | "Service" better describes functional logic like AI/NLP engines. |
| `backend/app/api/v1/endpoints/` | `backend/app/api/v1/routes/` | "Routes" is more common for web API entry points. |

## 3. Clearer Model Suffixes

Adopt specific suffixes for Pydantic/TypeScript models to clarify their role in the data lifecycle.

*   **`Create` (e.g., `MoodCreate`):** Minimal fields required for a new entry (input validation).
*   **`Public` (e.g., `MoodPublic`):** Data as returned to the user, including ID, timestamp, and AI metadata.
*   **`Update` (e.g., `MoodUpdate`):** All fields optional, used for partial updates (PATCH/PUT).
*   **`InDB` (e.g., `MoodInDB`):** Exact mapping of the database row.

## 4. Frontend Consistency

*   **API Hooks:** Keep using `useTrackerData` but ensure it maps 1:1 with the Backend "Routes".
*   **Service Layer:** If logic grows complex, extract fetch calls from hooks into `frontend/src/services/api.ts`.

## 5. Summary of Naming Standards

| Layer | Convention | Example |
| :--- | :--- | :--- |
| **Python Variables** | `snake_case` | `sentiment_score` |
| **TypeScript Variables** | `camelCase` | `sentimentScore` |
| **React Components** | `PascalCase` | `MoodChart.tsx` |
| **CSS/Tailwind** | `kebab-case` | `shadow-neo-lg` |
| **Database Columns** | `snake_case` | `user_id` |
