'use client';

import { useState } from 'react';
import { CBTAnalysisResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1_URL = `${API_BASE_URL}/api/v1`;

interface UseCBTAnalysisReturn {
  analyze: (situation: string, automaticThought: string) => Promise<void>;
  analysis: CBTAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Hook to handle real-time AI analysis of CBT thoughts for HITL interaction.
 * Manages API calls, state, and error handling.
 */
export function useCBTAnalysis(): UseCBTAnalysisReturn {
  const [analysis, setAnalysis] = useState<CBTAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (situation: string, automaticThought: string) => {
    if (!situation || !automaticThought) {
      setError('Situation and automatic thought are required.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null); // Clear previous analysis

    try {
      const response = await fetch(`${API_V1_URL}/cbt-logs/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          situation,
          automaticThought,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `API error: ${response.status}`);
      }

      const data: CBTAnalysisResponse = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during analysis.');
      console.error('AI Analysis Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAnalysis(null);
    setError(null);
    setLoading(false);
  };

  return {
    analyze,
    analysis,
    loading,
    error,
    reset,
  };
}
