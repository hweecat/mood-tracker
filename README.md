# Mood Tracker — AI-Assisted CBT Journaling Platform

A full-stack application that integrates structured Cognitive Behavioral Therapy (CBT) journaling with AI-driven cognitive analysis. Users log journal entries, receive structured insights on cognitive distortions, and track thought patterns over time.

> **Disclaimer:** This is not a substitute for professional mental health treatment.

---

## Why This Project Exists

CBT journaling is clinically validated for building healthier thinking patterns, but the reflection loop is slow without a thinking partner. This project explores whether AI can close that gap — providing real-time analysis of cognitive distortions and thought reframing — without compromising the privacy expectations users have for mental health data.

The system is designed as a production-oriented case study in **inference-heavy, privacy-sensitive AI application architecture**, with explicit attention to latency, cost, observability, and evolvability constraints.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React / TypeScript |
| Backend API | Python (FastAPI) |
| Database | SQLite (with future plans to migrate to Postgres) |
| AI Layer | Gemini or Claude (LLM) API |
| Infrastructure | Docker Compose |
| CI | GitHub Actions |
| AI Dev Tooling | Continue.dev, Gemini |

---

## System Architecture

Detailed architectural diagrams (Component and Data Flow) can be found in [docs/diagrams/](./docs/diagrams/).

```
┌─────────────────────────────────────────────────────┐
│                   React Frontend                    │
│  Structured journaling UI · Async AI response poll │
└──────────────────────┬──────────────────────────────┘
                       │ REST
┌──────────────────────▼──────────────────────────────┐
│               Python Backend API                    │
│  Input validation · Auth · AI orchestration layer  │
└────────────┬──────────────────────┬─────────────────┘
             │                      │
┌────────────▼────────┐   ┌─────────▼──────────────────┐
│     SQLite DB       │   │     Gemini API             │
│  journal entries   │   │  Distortion classification │
│  AI analysis cache │   │  Thought reframing gen.    │
│  prompt versions   │   │  Structured JSON output    │
└─────────────────────┘   └────────────────────────────┘
```

### Component Responsibilities

**Frontend** handles structured entry collection (mood rating, situation, automatic thought, emotions) and renders AI insights asynchronously after submission — optimistic UI keeps the experience responsive even on slower inference calls.

**Backend API** owns input validation, schema enforcement, and AI orchestration. It is the sole system boundary between user data and the AI layer, ensuring raw journal text is never logged outside controlled paths.

**AI Processing Layer** applies versioned prompt templates, enforces structured JSON output from the model, and post-processes responses before storage. Structured output (vs. free-form text) was a deliberate choice — see ADR-002.

**Data Storage** persists journal entries, AI analyses, and prompt versions as distinct entities, enabling re-analysis when prompts are updated and longitudinal pattern tracking.

---

## Key Architecture Decisions

Full decision records are in [`/docs/decisions/`](./docs/decisions/). Summaries below.

### ADR-001: Synchronous AI calls for v1 (vs. async job queue)

**Context:** At launch, the user base is small and predictable latency matters more than throughput. An async job queue (Celery + Redis) would add operational complexity with no immediate benefit.

**Decision:** Synchronous AI calls with a 10-second timeout and single retry. The backend blocks until the AI response is received or times out.

**Tradeoff accepted:** This will not hold past ~50–100 concurrent users. The async job queue is on the roadmap as the first scalability intervention. We'll instrument p95 AI latency from day one so we have clear signal for when to make the switch.

**Revisit trigger:** p95 AI response latency sustained above 5 seconds, or concurrent user count exceeding 75.

---

### ADR-002: Structured JSON output from AI (vs. free-form text)

**Context:** Displaying AI insights in a structured UI (distortion type, severity, reframed thought) requires parseable output. Free-form prose would require a second parsing pass and introduces fragility.

**Decision:** Prompt templates enforce a JSON schema for all AI responses. The backend validates schema compliance before storing or serving results.

**Tradeoff accepted:** Structured prompting increases token usage slightly and constrains the model's expressiveness. For a CBT use case, structured + predictable beats expressive + brittle.

**Alternative considered:** Post-processing free-form output with a second LLM call. Rejected — doubles cost and latency, adds a failure mode.

---

### ADR-003: Raw journal text not persisted in application logs

**Context:** Journal entries contain sensitive mental health content. Standard application logging (request bodies, debug traces) would expose this data in log aggregation systems.

**Decision:** Raw journal text is explicitly excluded from all application log statements. Only entry IDs and metadata are logged. AI prompt construction happens in an isolated function that does not log inputs.

**Tradeoff accepted:** Debugging AI prompt issues requires deliberate effort — we can't grep logs for the raw text. This is the right tradeoff for a mental health product.

---

### ADR-004: Prompt versioning from the start

**Context:** AI prompts will evolve as we observe output quality. Without versioning, we lose the ability to understand why an analysis changed, run A/B comparisons, or re-analyze historical entries under an improved prompt.

**Decision:** Each `AIAnalysis` record stores a reference to the `PromptVersion` used to generate it. Prompt versions are immutable once used in production.

**Tradeoff accepted:** Slightly more complex data model upfront. The alternative — hardcoded prompts — creates an invisible dependency that becomes very painful to untangle at scale.

---

## Data Model

```
User
 └── JournalEntry
      ├── mood_rating
      ├── situation
      ├── automatic_thought
      ├── emotions[]
      └── AIAnalysis
           ├── distortions[]         ← structured, validated output
           ├── reframed_thought
           ├── severity_score
           └── prompt_version_id → PromptVersion
                                      ├── template
                                      ├── version_hash
                                      └── deployed_at
```

Separating `AIAnalysis` from `JournalEntry` as a first-class entity enables:
- Re-analysis when prompts are updated, without touching entry data
- A/B comparison of prompt versions on the same corpus
- Longitudinal tracking of distortion patterns across entries

---

## Non-Functional Requirements & How They're Addressed

### Latency

**Target:** p95 AI response < 5 seconds end-to-end.

Strategies in place: prompt size budgets (max ~800 tokens input), 10-second hard timeout, optimistic UI so users aren't staring at a spinner. Streaming responses were considered but rejected for v1 — they complicate JSON schema validation and the UI complexity isn't justified until we have user research showing it's needed.

### Cost

AI inference is the dominant cost driver. Controls in place:

- Structured prompts with explicit token budgets reduce output verbosity
- Abstraction layer around the AI client makes model swapping straightforward
- Cost-per-session tracked as a first-class metric (see Observability)

**Revisit trigger:** If cost-per-session exceeds $0.03, we evaluate prompt compression or a smaller model for classification (keeping the larger model only for reframing generation).

### Privacy

- Raw journal text excluded from application logs (ADR-003)
- No secrets committed; environment variable isolation via Docker Compose
- Input validation at API boundary before text reaches the AI layer
- Database designed to support encryption-at-rest (not yet implemented — tracked as a roadmap item with explicit priority reasoning below)

### Observability

Metrics instrumented from day one, because they drive decisions — not just monitoring:

| Metric | Decision it drives |
|---|---|
| AI latency p95 | Trigger for async queue migration (ADR-001 revisit) |
| Token usage per request | Input to prompt compression work |
| Cost per session | Trigger for model downgrade evaluation |
| AI schema validation error rate | Signal for prompt quality degradation |
| Retry rate | Signal for API reliability issues |

---

## What This Design Doesn't Solve (Yet)

Being explicit about current limitations is part of the design, not an afterthought:

**Concurrent load:** Synchronous AI calls will become a bottleneck above ~75 concurrent users. Async job queue is the planned intervention.

**Encryption-at-rest:** Not implemented in v1. Prioritized below async queue because the threat model assumes a secured deployment environment. This assumption needs revisiting before any public-facing deployment.

**User authentication:** Session management is stubbed. This was a deliberate scope decision — auth is well-understood, AI orchestration is the novel risk to explore first.

**AI hallucination / quality drift:** No automated evaluation pipeline yet. Prompt versioning (ADR-004) is the precondition for building one. The roadmap item for AI evaluation metrics depends on this foundation.

---

## Roadmap

Ordered by risk mitigation priority, not feature value:

1. **Async AI job queue** — unlocks scale beyond ~75 concurrent users; the synchronous call path is the primary architectural risk
2. **AI evaluation pipeline** — automated quality checks on distortion classification accuracy, enabled by prompt versioning already in place
3. **Encryption-at-rest** — prerequisite for any regulated or public-facing deployment
4. **Public beta** — gated on items 1–3 being production-ready

---

## Local Development

```bash
# Start all services
docker compose up

# Backend runs at http://localhost:8000
# Frontend runs at http://localhost:3000
# SQLite database stored in ./data/
```

Database migrations are in `/migrations/` and run automatically via Sqitch in the Docker orchestration.

---

## Testing Strategy

- Unit tests for input validation logic and AI response schema enforcement
- API route integration tests with mocked AI responses
- Schema contract tests to catch prompt output regressions early

Running tests:

```bash
# Backend
cd backend && pytest

# Frontend
cd frontend && npm test
```

---

## AI-Assisted Development

This project uses AI tooling (Continue.dev, Gemini) throughout the development process. Architectural decisions, prompt templates, and key design tradeoffs are documented in `/docs/` as durable artifacts — the intent is that the reasoning is legible independently of which tool generated any given piece of code.

---

## Project Structure

```
mood-tracker/
├── frontend/          # React/TypeScript UI
├── backend/           # Python API + AI orchestration
├── migrations/        # Sqitch SQL schema migrations
├── docs/
│   └── decisions/     # Architecture Decision Records (ADRs)
├── .github/workflows/ # CI pipelines
├── .continue/rules/   # AI dev tooling configuration
└── docker-compose.yml
```
