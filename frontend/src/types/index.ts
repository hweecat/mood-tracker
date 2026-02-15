export type MoodRating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type CognitiveDistortion =
  | 'All-or-Nothing Thinking'
  | 'Overgeneralization'
  | 'Mental Filter'
  | 'Disqualifying the Positive'
  | 'Mind Reading'
  | 'Fortune Telling'
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