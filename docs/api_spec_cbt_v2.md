# API Specification: CBT Analysis (v2)

## 1. Overview
Actual implementation of the Phase 2 AI-powered CBT analysis endpoints.

## 2. Endpoints

### 2.1 Analyze Thought
`POST /api/v1/cbt-logs/analyze`

**Request Body:**
```json
{
  "situation": "string",
  "automaticThought": "string"
}
```

**Successful Response (200 OK):**
```json
{
  "analysisId": "audit-1",
  "aiAnalysisId": "audit-1",
  "provider": "gemini",
  "model": "gemini-1.5-flash",
  "suggestions": [
    {
      "id": "suggestion-1",
      "distortion": "string",
      "reasoning": "string",
      "confidence": 0.95
    }
  ],
  "reframes": [
    {
      "id": "reframe-1",
      "perspective": "Compassionate",
      "content": "string"
    },
    {
      "id": "reframe-2",
      "perspective": "Logical",
      "content": "string"
    },
    {
      "id": "reframe-3",
      "perspective": "Evidence-based",
      "content": "string"
    }
  ],
  "actionPlans": [
    {
      "id": "plan-1",
      "title": "Review one problem",
      "rationale": "A small review step can turn the setback into useful information.",
      "steps": [
        "Choose one missed question and identify the first confusing step."
      ],
      "timeframe": "today"
    }
  ],
  "promptVersion": "1.0.0"
}
```

**Response Field Notes:**
- `analysisId` is the persisted AI audit/analysis identifier for HITL feedback attribution. `aiAnalysisId` is retained as a compatibility alias when present.
- `provider` and `model` identify the LLM provider result that produced the response after provider fallback orchestration.
- `suggestions[].id`, `reframes[].id`, and `actionPlans[].id` are stable response-local ids. Providers may return ids directly; otherwise the backend assigns deterministic ids such as `suggestion-1`, `reframe-1`, and `plan-1`.
- `actionPlans` contains zero to three optional self-help plans. Existing clients may ignore this field.

## 3. Data Validation
- **Input:** Validated via `CBTAnalysisRequest` (Pydantic). Supports camelCase for frontend compatibility.
- **Output:** Validated via `CBTAnalysisResponse` (Pydantic). All fields are camelCase, including `analysisId`, `aiAnalysisId`, `promptVersion`, and `actionPlans`.
- **Errors:**
    - `451`: Safety exception (high-harm content). Includes `crisisResources`.
    - `504`: AI Timeout (10s).
    - `503`: General AI service failure.
