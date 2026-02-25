# API Specification: CBT Analysis (v1)

## 1. Overview
New endpoints added to the FastAPI backend to support Phase 2 features.

## 2. Endpoints

### 2.1 Analyze Thought
`POST /api/v1/cbt/analyze`

**Request Body:**
```json
{
  "situation": "string",
  "automatic_thought": "string"
}
```

**Successful Response (200 OK):**
```json
{
  "audit_log_id": "uuid",
  "detected_distortions": ["string"],
  "reframing_suggestions": [
    {"type": "Compassionate", "text": "string"},
    {"type": "Logical", "text": "string"},
    {"type": "Evidence-based", "text": "string"}
  ],
  "reasoning": "string"
}
```

### 2.2 Record Feedback (Ignored Suggestions)
`POST /api/v1/cbt/audit/feedback`

**Request Body:**
```json
{
  "audit_log_id": "uuid",
  "ignored_suggestions": ["string"]
}
```

## 3. Data Validation
- **Input:** Automatic thought must be between 10 and 1000 characters.
- **Output:** Validated against Pydantic models inheriting from `TunedBaseModel` (camelCase alias).
