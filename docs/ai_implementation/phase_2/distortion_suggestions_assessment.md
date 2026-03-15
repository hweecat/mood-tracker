# Assessment: Can Users Get AI Distortion Suggestions?

**Verdict: ❌ Not yet — two critical mismatches will cause runtime failures.**

---

## Design Requirements (from docs)

| Requirement | Source |
|---|---|
| User enters Situation + Automatic Thought, clicks an "Analyze" button | [phase_2_design.md](file:///home/hweecat/playground/mood-tracker/docs/ai_implementation/phase_2/phase_2_design.md) §3.1 |
| AI returns distortion suggestions; user explicitly confirms ("Suggest & Select") | [ADR-005](file:///home/hweecat/playground/mood-tracker/docs/decisions/ADR-005-hitl-ai-integration.md) |
| Suggested distortions visually highlighted (amber borders, Brain icon) | ADR-005 §4 |
| AI suggestions stored separately from user selections | ADR-005 §3 |

## UI Implementation Status

| Feature | Status | Location |
|---|---|---|
| "Seek AI Perspective" button on Step 2 | ✅ Implemented | [CBTLogForm.tsx:186-208](file:///home/hweecat/playground/mood-tracker/.worktrees/ui/frontend/src/components/CBTLogForm.tsx#L186-L208) |
| Loading spinner + disabled state during analysis | ✅ Implemented | [CBTLogForm.tsx:189-207](file:///home/hweecat/playground/mood-tracker/.worktrees/ui/frontend/src/components/CBTLogForm.tsx#L189-L207) |
| Error display on failure | ✅ Implemented | [CBTLogForm.tsx:209](file:///home/hweecat/playground/mood-tracker/.worktrees/ui/frontend/src/components/CBTLogForm.tsx#L209) |
| Amber highlighting + Brain icon on AI-suggested distortions (Step 3) | ✅ Implemented | [CBTLogForm.tsx:245-252](file:///home/hweecat/playground/mood-tracker/.worktrees/ui/frontend/src/components/CBTLogForm.tsx#L245-L252) |
| HITL separation (`aiSuggestedDistortions` vs `distortions`) | ✅ Implemented | [CBTLogForm.tsx:29,65](file:///home/hweecat/playground/mood-tracker/.worktrees/ui/frontend/src/components/CBTLogForm.tsx#L29) |
| Reframe carousel on Step 4 | ✅ Implemented | [CBTLogForm.tsx:276-296](file:///home/hweecat/playground/mood-tracker/.worktrees/ui/frontend/src/components/CBTLogForm.tsx#L276-L296) |
| [useCBTAnalysis](file:///home/hweecat/playground/mood-tracker/.worktrees/ui/frontend/src/hooks/useCBTAnalysis.ts#17-77) hook managing API lifecycle | ✅ Implemented | [useCBTAnalysis.ts](file:///home/hweecat/playground/mood-tracker/.worktrees/ui/frontend/src/hooks/useCBTAnalysis.ts) |

## 🚨 Critical Issues

### Issue 1: Cognitive Distortion Name Mismatch (Frontend ↔ Backend)

The backend Gemini prompts use **lowercase** distortion names from [constants.py](file:///home/hweecat/playground/mood-tracker/backend/app/core/constants.py), while the frontend [types/index.ts](file:///home/hweecat/playground/mood-tracker/.worktrees/ui/frontend/src/types/index.ts) uses **Title Case** names:

| Backend ([constants.py](file:///home/hweecat/playground/mood-tracker/backend/app/core/constants.py)) | Frontend ([CognitiveDistortion](file:///home/hweecat/playground/mood-tracker/.worktrees/ui/frontend/src/types/index.ts#3-17) type) |
|---|---|
| `"all-or-nothing thinking"` | `"All-or-Nothing Thinking"` |
| `"overgeneralization"` | `"Overgeneralization"` |
| `"jumping to conclusions"` | `"Mind Reading"` / `"Fortune Telling"` ← **split** |
| `"magnification"` | `"Magnification/Minimization"` ← **different** |

**Impact:** When the backend returns `"all-or-nothing thinking"`, the frontend's `.includes(d)` check on line 233 will **never match** because `d` is `"All-or-Nothing Thinking"`. AI suggestions will silently fail to highlight in Step 3.

### Issue 2: Request Field Name Mismatch (Frontend → Backend)

The frontend sends `automaticThought` (camelCase) in the request body:

```typescript
// useCBTAnalysis.ts:42-44
body: JSON.stringify({
  situation,
  automaticThought,  // ← camelCase
}),
```

The backend schema expects `automatic_thought` (snake_case) or its camelCase alias:

```python
# cbt.py:26
class CBTAnalysisRequest(TunedBaseModel):
    automatic_thought: str  # alias_generator → "automaticThought" ✅
```

> [!NOTE]
> This one is actually **OK** because [TunedBaseModel](file:///home/hweecat/playground/mood-tracker/backend/app/schemas/base.py#4-10) uses `alias_generator=to_camel` with `populate_by_name=True`, so `automaticThought` is accepted. No issue here after closer inspection.

### Issue 2 (Revised): API Spec Doc is Outdated

The [api_spec_cbt_v1.md](file:///home/hweecat/playground/mood-tracker/docs/api_spec_cbt_v1.md) documents the endpoint as `POST /api/v1/cbt/analyze` with a different response shape (`detected_distortions`, `reframing_suggestions`). The actual implementation uses `POST /api/v1/cbt-logs/analyze` with `suggestions` and `reframes`. The spec doc should be updated.

## Summary

| Area | Working? |
|---|---|
| UI Flow (button → loading → results) | ✅ |
| HITL Pattern (suggest vs select) | ✅ |
| Visual Differentiation (amber + icons) | ✅ |
| Reframe Carousel | ✅ |
| **Distortion name matching (backend → frontend)** | **❌ Broken** |
| API spec doc accuracy | ⚠️ Outdated |

> [!CAUTION]
> **The core feature will not work at runtime.** Even though the UI is correctly wired up, the distortion names returned by Gemini (lowercase, per backend constants) will never match the frontend's Title Case [CognitiveDistortion](file:///home/hweecat/playground/mood-tracker/.worktrees/ui/frontend/src/types/index.ts#3-17) type. The amber highlights and Brain icons on Step 3 will never appear.

## Recommended Fix

Normalize distortion names at one of these boundary points:
1. **Frontend normalization** — Convert received suggestions to Title Case before matching
2. **Backend normalization** — Update [constants.py](file:///home/hweecat/playground/mood-tracker/backend/app/core/constants.py) to use Title Case to match the frontend
3. **Case-insensitive matching** — Use `.toLowerCase()` comparison in the UI
