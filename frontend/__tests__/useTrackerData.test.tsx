import { renderHook, act, waitFor } from '@testing-library/react';
import { useTrackerData } from '../src/hooks/useTrackerData';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

const API_V1_URL = 'http://localhost:8000/api/v1';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      accessToken: 'test-access-token',
      user: { id: '1' },
    },
    status: 'authenticated',
  }),
}));

describe('useTrackerData', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Global fetch mock is set up in vitest.setup.ts
  });

  it('fetches data on mount', async () => {
    const mockMoods = [{ id: '1', rating: 5, emotions: ['Happy'], note: 'Good', timestamp: 123, userId: '1' }];
    const mockCBT = [{ id: '1', situation: 'Test', automaticThoughts: 'Auto', distortions: [], rationalResponse: 'Resp', moodBefore: 5, timestamp: 123, userId: '1' }];

    (global.fetch as Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockMoods,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCBT,
      });

    const { result } = renderHook(() => useTrackerData());

    // Initial state
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.moodEntries).toEqual(mockMoods);
    expect(result.current.cbtLogs).toEqual(mockCBT);
    
    expect(global.fetch).toHaveBeenCalledWith(`${API_V1_URL}/moods/`, {
      headers: { Authorization: 'Bearer test-access-token' },
    });
    expect(global.fetch).toHaveBeenCalledWith(`${API_V1_URL}/cbt-logs/`, {
      headers: { Authorization: 'Bearer test-access-token' },
    });
  });

  it('adds a mood entry', async () => {
     // Mock initial fetch
    (global.fetch as Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useTrackerData());
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newEntry = { rating: 8 as const, emotions: ['Excited'], note: 'Great' };
    const savedEntry = { ...newEntry, id: 'uuid', timestamp: 123456, userId: '1' };

    // Mock POST request
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => savedEntry,
    });

    await act(async () => {
      await result.current.addMoodEntry(newEntry);
    });

    expect(global.fetch).toHaveBeenCalledWith(`${API_V1_URL}/moods/`, expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-access-token',
      }),
      body: expect.stringContaining('"rating":8'),
    }));

    expect(result.current.moodEntries).toHaveLength(1);
    expect(result.current.moodEntries[0].rating).toBe(8);
  });

  it('adds a CBT log', async () => {
     // Mock initial fetch
    (global.fetch as Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useTrackerData());
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newLog = { 
        situation: 'Sit', 
        automaticThoughts: 'Auto', 
        distortions: [], 
        rationalResponse: 'Resp', 
        moodBefore: 5 as const
    };
    const savedLog = { ...newLog, id: 'uuid', timestamp: 123456, userId: '1' };

    // Mock POST request
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => savedLog,
    });

    await act(async () => {
      await result.current.addCBTLog(newLog);
    });

    expect(global.fetch).toHaveBeenCalledWith(`${API_V1_URL}/cbt-logs/`, expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-access-token',
      }),
      body: expect.stringContaining('"situation":"Sit"'),
    }));

    expect(result.current.cbtLogs).toHaveLength(1);
    expect(result.current.cbtLogs[0].situation).toBe('Sit');
  });

  it('preserves CBT audit metadata fields in the create request body', async () => {
     // Mock initial fetch
    (global.fetch as Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { result } = renderHook(() => useTrackerData());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const newLog = {
      situation: 'Sit',
      automaticThoughts: 'Auto',
      distortions: ['All-or-Nothing Thinking' as const],
      rationalResponse: 'Resp',
      moodBefore: 5 as const,
      aiAnalysisId: 'audit-1',
      acceptedDistortionsPayload: [
        { id: 'suggestion-1', distortion: 'All-or-Nothing Thinking' as const, reasoning: 'Reason' },
      ],
      ignoredDistortionsPayload: [
        { id: 'suggestion-2', distortion: 'Catastrophizing' as const, reasoning: 'Other reason' },
      ],
      acceptedReframePayload: {
        id: 'reframe-1',
        perspective: 'Balanced',
        content: 'Resp',
      },
      ignoredReframesPayload: [
        {
          id: 'reframe-2',
          perspective: 'Compassionate',
          content: 'Alternative',
        },
      ],
      acceptedActionPlanPayload: {
        id: 'plan-1',
        title: 'Take a step',
        steps: ['Send one email'],
      },
      feedbackSource: 'edited_ai' as const,
    };
    const savedLog = { ...newLog, id: 'uuid', timestamp: 123456, userId: '1' };

    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => savedLog,
    });

    await act(async () => {
      await result.current.addCBTLog(newLog);
    });

    const createRequest = (global.fetch as Mock).mock.calls.find(
      ([url, options]) => url === `${API_V1_URL}/cbt-logs/` && options?.method === 'POST'
    );
    const body = JSON.parse(createRequest?.[1]?.body);

    expect(body).toEqual(expect.objectContaining({
      aiAnalysisId: 'audit-1',
      acceptedDistortionsPayload: newLog.acceptedDistortionsPayload,
      ignoredDistortionsPayload: newLog.ignoredDistortionsPayload,
      acceptedReframePayload: newLog.acceptedReframePayload,
      ignoredReframesPayload: newLog.ignoredReframesPayload,
      acceptedActionPlanPayload: newLog.acceptedActionPlanPayload,
      feedbackSource: 'edited_ai',
    }));
  });

  it('updates a CBT log', async () => {
    // Mock initial fetch with one log
    const initialLog = { 
        id: '1', 
        situation: 'Old Sit', 
        automaticThoughts: 'Old Auto', 
        distortions: [], 
        rationalResponse: 'Old Resp', 
        moodBefore: 5 as const,
        timestamp: 123,
        userId: '1'
    };

    (global.fetch as Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [initialLog] });

    const { result } = renderHook(() => useTrackerData());
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock PUT request
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...initialLog, situation: 'New Sit' }),
    });

    const updatedLog = { ...initialLog, situation: 'New Sit' };

    await act(async () => {
      await result.current.updateCBTLog(updatedLog);
    });

    expect(global.fetch).toHaveBeenCalledWith(`${API_V1_URL}/cbt-logs/1`, expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-access-token',
      }),
      body: expect.stringContaining('"situation":"New Sit"'),
    }));

    expect(result.current.cbtLogs).toHaveLength(1);
    expect(result.current.cbtLogs[0].situation).toBe('New Sit');
  });

  it('handles fetch errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    (global.fetch as Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useTrackerData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.moodEntries).toEqual([]);
    
    consoleSpy.mockRestore();
  });
});
