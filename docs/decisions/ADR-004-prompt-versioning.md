# ADR-004: Prompt versioning from the start

## Context
AI prompts will evolve as we observe output quality. Without versioning, we lose the ability to understand why an analysis changed, run A/B comparisons, or re-analyze historical entries under an improved prompt.

## Decision
Each `AIAnalysis` record stores a reference to the `PromptVersion` used to generate it. Prompt versions are immutable once used in production.

## Tradeoff accepted
Slightly more complex data model upfront. The alternative — hardcoded prompts — creates an invisible dependency that becomes very painful to untangle at scale.
