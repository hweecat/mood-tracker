export type MoodRating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type CognitiveDistortion =
  | 'All-or-Nothing Thinking'
  | 'Overgeneralization'
  | 'Mental Filter'
  | 'Disqualifying the Positive'
  | 'Mind Reading'
  | 'Fortune Telling'
  | 'Catastrophizing'
  | 'Magnification/Minimization'
  | 'Emotional Reasoning'
  | 'Should Statements'
  | 'Labeling'
  | 'Personalization'
  | 'Control Fallacies'
  | 'Fallacy of Fairness';

export interface MoodEntry {
  id: string;
  userId: string;
  timestamp: number;
  rating: MoodRating;
  emotions: string[];
  note?: string;
  trigger?: string;
  behavior?: string;
  aiAnalysis?: {
    sentimentScore: number;
    subjectivity: number;
    keywords: string[];
  } | null;
}

export interface DistortionSuggestion {
  id?: string;
  distortion: CognitiveDistortion;
  reasoning: string;
  confidence?: number;
}

export interface RationalReframe {
  id?: string;
  perspective: string;
  content: string;
}

export interface ActionPlanSuggestion {
  id?: string;
  title: string;
  rationale?: string;
  steps: string[];
  timeframe?: string;
}

export interface CrisisResource {
  name?: string;
  phone?: string;
  url?: string;
  description?: string;
}

export type AIFeedbackSource = 'accepted_ai' | 'edited_ai' | 'user_original';

export interface CBTAnalysisResponse {
  analysisId?: string;
  aiAnalysisId?: string;
  suggestions: DistortionSuggestion[];
  reframes: RationalReframe[];
  actionPlans?: ActionPlanSuggestion[];
  promptVersion?: string;
  prompt_version?: string;
}

export interface CBTLog {
  id: string;
  userId: string;
  timestamp: number;
  situation: string;
  automaticThoughts: string;
  distortions: CognitiveDistortion[];
  rationalResponse: string;
  moodBefore: MoodRating;
  moodAfter?: MoodRating;
  behavioralLink?: string;
  actionPlanStatus?: 'pending' | 'completed';
  // HITL Metadata
  aiAnalysisId?: string | null;
  aiSuggestedDistortions?: CognitiveDistortion[];
  acceptedDistortionsPayload?: DistortionSuggestion[];
  ignoredDistortionsPayload?: DistortionSuggestion[];
  acceptedReframeId?: string | null;
  acceptedReframePayload?: RationalReframe | null;
  dismissedReframeIds?: string[];
  ignoredReframeIds?: string[];
  ignoredReframesPayload?: RationalReframe[];
  rationalResponseSource?: AIFeedbackSource;
  acceptedActionPlanId?: string | null;
  acceptedActionPlan?: ActionPlanSuggestion | null;
  acceptedActionPlanPayload?: ActionPlanSuggestion | null;
  actionPlanSource?: AIFeedbackSource;
  feedbackSource?: AIFeedbackSource;
  aiAnalysis?: CBTAnalysisResponse | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface UserData {
  moodEntries: MoodEntry[];
  cbtLogs: CBTLog[];
}
