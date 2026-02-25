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
