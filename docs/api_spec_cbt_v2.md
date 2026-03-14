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
  "suggestions": [
    {
      "distortion": "string",
      "reasoning": "string",
      "confidence": 0.95
    }
  ],
  "reframes": [
    {
      "perspective": "Compassionate",
      "content": "string"
    },
    {
      "perspective": "Logical",
      "content": "string"
    },
    {
      "perspective": "Evidence-based",
      "content": "string"
    }
  ],
  "promptVersion": "1.0.0"
}
```

## 3. Data Validation
- **Input:** Validated via `CBTAnalysisRequest` (Pydantic). Supports camelCase for frontend compatibility.
- **Output:** Validated via `CBTAnalysisResponse` (Pydantic). All fields are camelCase.
- **Errors:**
    - `451`: Safety exception (high-harm content). Includes `crisisResources`.
    - `504`: AI Timeout (10s).
    - `503`: General AI service failure.
