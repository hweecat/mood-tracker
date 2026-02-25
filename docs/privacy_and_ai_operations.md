# Privacy & AI Operations

## 1. PII Masking Strategy
To ensure user privacy, all text is sanitized before being sent to the Google Gemini API.

- **Mechanism:** Rule-based and Regex masking engine (`app/services/privacy.py`).
- **Scope:** Emails, Phone Numbers, Physical Addresses, and Proper Names.
- **Tokenization:** Replaces PII with tokens (e.g., `[NAME_1]`).
- **Restoration:** The `CBTAnalysisService` restores the original text in the suggestions before returning them to the user.

## 2. AI Audit Trail
For debugging, safety assessment, and performance tuning, all AI interactions are persisted.

### 2.1 Table Schema: `ai_audit_logs`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `correlation_id` | TEXT | Link to API request |
| `masked_payload` | TEXT | Prompt sent to Gemini (PII-free) |
| `response_payload` | TEXT | Full JSON response from Gemini |
| `safety_ratings` | TEXT | Harm probability metadata (JSON) |
| `ignored_suggestions`| TEXT | Array of rejected reframes (JSON) |
| `status` | TEXT | SUCCESS, BLOCKED, ERROR |
| `timestamp` | INTEGER | Unix epoch |

## 3. Security Measures
- **API Key:** Stored in `GOOGLE_API_KEY` environment variable; never exposed to frontend.
- **Data Locality:** Raw (unmasked) user text is only ever processed in-memory and never logged to persistent disk except within the final encrypted journal entry.
- **Internal Only:** The `/analyze` endpoint is rate-limited and intended for use only by the authorized application session.
