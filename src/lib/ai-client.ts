export interface AIAnalysisResult {
  sentiment_score: number;
  subjectivity: number;
  keywords: string[];
}

export async function analyzeMoodNote(text: string): Promise<AIAnalysisResult | null> {
  const url = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const apiKey = process.env.AI_SERVICE_KEY || 'development_key';

  try {
    const response = await fetch(`${url}/v1/analyze/mood`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AI-Key': apiKey,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.error(`AI Service Error: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to connect to AI Service:', error);
    return null;
  }
}
