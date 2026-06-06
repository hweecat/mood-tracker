'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { CBTAnalysisResponse, CrisisResource } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1_URL = `${API_BASE_URL}/api/v1`;

interface UseCBTAnalysisReturn {
  analyze: (situation: string, automaticThought: string) => Promise<void>;
  analysis: CBTAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  crisisResources: CrisisResource[];
  reset: () => void;
}

interface StructuredErrorDetail {
  message?: unknown;
  detail?: unknown;
  trigger?: unknown;
  crisis_resources?: unknown;
  crisisResources?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeCrisisResources(resources: unknown): CrisisResource[] {
  if (!Array.isArray(resources)) {
    return [];
  }

  return resources
    .filter(isRecord)
    .map(resource => ({
      name: typeof resource.name === 'string' ? resource.name : undefined,
      phone: typeof resource.phone === 'string' ? resource.phone : undefined,
      url: typeof resource.url === 'string' ? resource.url : undefined,
      description: typeof resource.description === 'string' ? resource.description : undefined,
    }))
    .filter(resource => resource.name || resource.phone || resource.url || resource.description);
}

function parseErrorResponse(errorData: unknown, status: number): { message: string; crisisResources: CrisisResource[] } {
  if (!isRecord(errorData)) {
    return { message: `API error: ${status}`, crisisResources: [] };
  }

  const detail = errorData.detail;
  if (typeof detail === 'string') {
    return { message: detail, crisisResources: [] };
  }

  if (isRecord(detail)) {
    const structuredDetail = detail as StructuredErrorDetail;
    const message =
      typeof structuredDetail.message === 'string'
        ? structuredDetail.message
        : typeof structuredDetail.detail === 'string'
          ? structuredDetail.detail
          : `API error: ${status}`;
    const crisisResources = normalizeCrisisResources(
      structuredDetail.crisis_resources ?? structuredDetail.crisisResources
    );

    return { message, crisisResources };
  }

  return { message: `API error: ${status}`, crisisResources: [] };
}

/**
 * Hook to handle real-time AI analysis of CBT thoughts for HITL interaction.
 * Manages API calls, state, and error handling with authentication.
 */
export function useCBTAnalysis(): UseCBTAnalysisReturn {
  const [analysis, setAnalysis] = useState<CBTAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crisisResources, setCrisisResources] = useState<CrisisResource[]>([]);
  const { data: session, status } = useSession();

  const analyze = async (situation: string, automaticThought: string) => {
    if (!situation || !automaticThought) {
      setError('Situation and automatic thought are required.');
      return;
    }

    if (status !== 'authenticated' || !session?.accessToken) {
      setError('You must be logged in to use AI analysis.');
      return;
    }

    setLoading(true);
    setError(null);
    setCrisisResources([]);
    setAnalysis(null); // Clear previous analysis

    try {
      const response = await fetch(`${API_V1_URL}/cbt-logs/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          situation,
          automaticThought,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        const errorData = await response.json();
        const parsedError = parseErrorResponse(errorData, response.status);
        setCrisisResources(parsedError.crisisResources);
        throw new Error(parsedError.message);
      }

      const data: CBTAnalysisResponse = await response.json();
      setAnalysis(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred during analysis.';
      setError(errorMessage);
      console.error('AI Analysis Error');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setAnalysis(null);
    setError(null);
    setCrisisResources([]);
    setLoading(false);
  };

  return {
    analyze,
    analysis,
    loading,
    error,
    crisisResources,
    reset,
  };
}
