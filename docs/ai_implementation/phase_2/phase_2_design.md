# Phase 2 Design: Cognitive Intelligence

## 1. Overview
Phase 2 transforms MindfulTrack into an active therapeutic assistant by integrating the Google Gemini API. The system will provide real-time assistance in identifying cognitive distortions and suggesting rational reframes for automatic thoughts.

## 2. Technical Stack
- **LLM Provider:** Google Gemini API (`gemini-1.5-flash`).
- **SDK:** `google-generative-ai` (Python).
- **Format:** Structured JSON Outputs using `response_schema`.
- **Latency Target:** < 3.0s for end-to-end analysis.

## 3. Core Features

### 3.1 Automated Distortion Detection
- **Input:** User's "Situation" and "Automatic Thought".
- **Logic:** Gemini classifies the thought into one or more of the 13 predefined cognitive distortions.
- **Output:** A list of detected distortions with a brief "Reasoning" for each.

### 3.2 Rational Reframing Engine
- **Quantity:** Exactly 3 suggestions per request (Product Design Decision).
- **Variety:** Gemini is instructed to provide three distinct perspectives (e.g., Compassionate, Logical, Evidence-based).
- **User Agency:** Suggestions are populated into the form but remain fully editable by the user.

## 4. Safety & Fallback Logic
The system evaluates `safetyRatings` from Gemini for every request.

| Harm Probability | Action |
| :--- | :--- |
| **High** | Block response, log details, and trigger `CrisisResources` in the UI. |
| **Medium/Low** | Log details and provide a category-specific "Empathetic Fallback" message. |
| **Negligible** | Proceed with standard analysis. |

## 5. Success Metrics
- **Extraction Accuracy:** > 85% alignment with clinical definitions.
- **UI Responsiveness:** Analysis button remains active with a loading state; timeout handled at 10s.
- **Safety Reliability:** 100% of high-harm probability prompts correctly identified and routed.
