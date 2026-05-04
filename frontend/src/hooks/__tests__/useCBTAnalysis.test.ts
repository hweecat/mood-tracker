import { renderHook, act } from '@testing-library/react';
import { useCBTAnalysis } from '../useCBTAnalysis';
import type { CBTAnalysisResponse } from '@/types';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      accessToken: 'test-access-token',
      user: { id: '1' },
    },
    status: 'authenticated',
  }),
}));

// Mock responses
const MOCK_SUCCESS_RESPONSE = {
  suggestions: [
    { distortion: 'All-or-Nothing Thinking', reasoning: 'Test reasoning' }
  ],
  reframes: [
    { id: 'reframe-1', perspective: 'Compassionate', content: 'Test reframe' }
  ],
  actionPlans: [
    {
      id: 'plan-1',
      title: 'Take one step',
      rationale: 'Small steps can reduce avoidance.',
      steps: ['Write one sentence about what happened.'],
      timeframe: 'today',
    }
  ],
  prompt_version: '1.0.0'
};

describe('useCBTAnalysis Hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('initially has default states', () => {
    const { result } = renderHook(() => useCBTAnalysis());
    expect(result.current.analysis).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('performs successful analysis', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SUCCESS_RESPONSE,
    } as Response);

    const { result } = renderHook(() => useCBTAnalysis());

    await act(async () => {
      await result.current.analyze('I made a mistake', "I'm a failure");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.analysis).toEqual(MOCK_SUCCESS_RESPONSE);
    expect(result.current.analysis?.actionPlans?.[0].id).toBe('plan-1');
    expect(result.current.error).toBeNull();
  });

  it('allows analysis responses without action plans', () => {
    const responseWithoutActionPlans: CBTAnalysisResponse = {
      suggestions: [
        { distortion: 'All-or-Nothing Thinking', reasoning: 'Test reasoning' }
      ],
      reframes: [
        { id: 'reframe-1', perspective: 'Compassionate', content: 'Test reframe' }
      ],
      provider: 'openai',
      model: 'gpt-5.5',
      aiAnalysisId: 'audit-1',
    };

    expect(responseWithoutActionPlans.actionPlans).toBeUndefined();
  });

  it('handles validation error (empty inputs)', async () => {
    const { result } = renderHook(() => useCBTAnalysis());

    await act(async () => {
      await result.current.analyze('', '');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Situation and automatic thought are required.');
    expect(result.current.analysis).toBeNull();
  });

  it('handles safety exception (451)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 451,
      json: async () => ({
        detail: {
          message: 'Safety trigger: High harm content',
          crisis_resources: []
        }
      }),
    } as Response);

    const { result } = renderHook(() => useCBTAnalysis());

    await act(async () => {
      await result.current.analyze('Crisis situation', "End it all");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('[object Object]');
  });

  it('handles timeout (504)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 504,
      json: async () => ({ detail: 'Analysis timed out.' }),
    } as Response);

    const { result } = renderHook(() => useCBTAnalysis());

    await act(async () => {
      await result.current.analyze('Slow situation', "Thinking slow");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Analysis timed out.');
  });

  it('handles general API errors', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Internal Server Error' }),
    } as Response);

    const { result } = renderHook(() => useCBTAnalysis());

    await act(async () => {
      await result.current.analyze('Buggy situation', "Error thought");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Internal Server Error');
  });

  it('resets state correctly', async () => {
    const { result } = renderHook(() => useCBTAnalysis());

    // Set some state
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SUCCESS_RESPONSE,
    } as Response);

    await act(async () => {
      await result.current.analyze('s', 't');
    });

    expect(result.current.analysis).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.analysis).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
