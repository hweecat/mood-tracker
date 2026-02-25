# ADR-002: Structured JSON output from AI (vs. free-form text)

## Context
Displaying AI insights in a structured UI (distortion type, severity, reframed thought) requires parseable output. Free-form prose would require a second parsing pass and introduces fragility.

## Decision
Prompt templates enforce a JSON schema for all AI responses. The backend validates schema compliance before storing or serving results.

## Tradeoff accepted
Structured prompting increases token usage slightly and constrains the model's expressiveness. For a CBT use case, structured + predictable beats expressive + brittle.

## Alternative considered
Post-processing free-form output with a second LLM call. Rejected — doubles cost and latency, adds a failure mode.
