# ADR-001: Synchronous AI calls for v1 (vs. async job queue)

## Context
At launch, the user base is small and predictable latency matters more than throughput. An async job queue (Celery + Redis) would add operational complexity with no immediate benefit.

## Decision
Synchronous AI calls with a 10-second timeout and single retry. The backend blocks until the AI response is received or times out.

## Tradeoff accepted
This will not hold past ~50–100 concurrent users. The async job queue is on the roadmap as the first scalability intervention. We'll instrument p95 AI latency from day one so we have clear signal for when to make the switch.

## Revisit trigger
p95 AI response latency sustained above 5 seconds, or concurrent user count exceeding 75.
