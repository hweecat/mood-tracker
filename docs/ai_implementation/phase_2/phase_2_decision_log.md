# Phase 2 Decision Log

## Decision 1: Fixed Suggestion Count
- **Selection:** Exactly 3 reframing suggestions.
- **Reasoning:** Ensures UI consistency and provides enough variety (Compassionate, Logical, Evidence-based) without overwhelming the user during a period of emotional distress.

## Decision 2: Persistence of Ignored Suggestions
- **Selection:** Store in `ai_audit_logs`, not the primary `cbt_logs` table.
- **Reasoning:** Keeps the primary user data clean and focused on their personal journey, while still allowing developers to analyze "rejection rates" for specific AI suggestions via the audit trail.

## Decision 3: Safety Handling
- **Selection:** Multi-tier fallback based on `safetyRatings`.
- **Reasoning:** High-harm probability must be treated as a clinical priority (Crisis Resources), while lower-level blocks should still provide an empathetic, albeit generic, response to maintain user trust.

## Decision 4: Masked PII in Audit Logs
- **Selection:** Persistent logs store the PII-free version of the text.
- **Reasoning:** Allows for robust debugging of model reasoning and safety triggers without creating a new repository of sensitive user information.

## Decision 5: PII Masking Scope (Email & Phone)
- **Selection:** Strict regex-based masking for emails and phone numbers.
- **Reasoning:** These are high-risk identifiers that are easily identifiable via regular expressions and must never be sent to external AI providers.

## Decision 6: Location Retention
- **Selection:** Do not mask general locations (cities, states, regions) or street names (for now).
- **Reasoning:** Maintaining geographic context can be relevant for the AI to understand environmental stressors, and the risk of re-identification from a city name alone is relatively low compared to the benefit of contextual accuracy.

## Decision 7: Common-Name Dictionary for Names
- **Selection:** Use a dictionary-based approach for masking proper names.
- **Reasoning:** While proper names are difficult to capture via regex, a dictionary of common names provides a high-signal, low-complexity first layer of protection without the overhead of heavy NLP models.

## Decision 8: In-Memory De-masking
- **Selection:** PII restoration mappings are stored strictly in-memory during the request lifecycle.
- **Reasoning:** Ensures that while the user receives a personalized response, the mapping itself is never persisted, adhering to the principle of data minimization and reducing the attack surface for sensitive data leaks.
