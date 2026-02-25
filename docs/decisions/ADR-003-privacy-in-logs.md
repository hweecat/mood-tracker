# ADR-003: Raw journal text not persisted in application logs

## Context
Journal entries contain sensitive mental health content. Standard application logging (request bodies, debug traces) would expose this data in log aggregation systems.

## Decision
Raw journal text is explicitly excluded from all application log statements. Only entry IDs and metadata are logged. AI prompt construction happens in an isolated function that does not log inputs.

## Tradeoff accepted
Debugging AI prompt issues requires deliberate effort — we can't grep logs for the raw text. This is the right tradeoff for a mental health product.
