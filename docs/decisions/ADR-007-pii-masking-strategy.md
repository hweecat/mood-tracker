# ADR-007: PII Masking & In-Memory De-masking Strategy

## Status: Supersedes ADR-003 (extends)

## Context
While ADR-003 established that raw journal text should not be persisted in application logs, Phase 2 introduces external AI providers (Gemini). Sending raw user text containing personally identifiable information (PII) to external providers poses a significant privacy risk.

## Decision
We implement a multi-layered PII masking and in-memory de-masking strategy for all external AI interactions and audit logs.

1.  **Regex-Based Redaction**: Automatic masking of Emails and Phone Numbers.
2.  **Dictionary-Based Masking**: Masking of proper names using a dictionary of common names to balance privacy and performance.
3.  **Context Retention**: General locations (cities, states) and street names are intentionally retained to preserve the stressors/context for AI analysis.
4.  **In-Memory De-masking**: A mapping of masked values to original PII is maintained strictly in-memory during the request lifecycle to allow personalizing the final response to the user without ever persisting the PII mapping.
5.  **PII-Free Audit Logs**: Persistent `ai_audit_logs` store the masked version of the text, ensuring that debugging information does not contain sensitive user data.

## Rationale
- **Data Minimization**: Adheres to privacy-by-design principles by ensuring external providers only see the minimum necessary information.
- **Security**: Reduces the attack surface by avoiding persistent storage of PII mappings.
- **Traceability**: Allows for robust debugging of model reasoning via masked audit logs without compromising user privacy.

## Tradeoffs
- **Complexity**: Adds overhead to the request/response lifecycle for masking and restoration.
- **Dictionary Limitations**: Dictionary-based masking may miss unique or uncommon names, but provides a high-signal first layer without the overhead of heavy NLP models.

## Revisit Trigger
- Detection of sensitive data leaks in audit logs.
- Availability of a local, highly secure NLU-based PII redaction service.
