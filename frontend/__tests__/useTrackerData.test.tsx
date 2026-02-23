import { renderHook, act, waitFor } from '@testing-library/react';
import { useTrackerData } from '../src/hooks/useTrackerData';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

const API_V1_URL = 'http://localhost:8000/api/v1';

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
    
    expect(global.fetch).toHaveBeenCalledWith(`${API_V1_URL}/moods/`);
    expect(global.fetch).toHaveBeenCalledWith(`${API_V1_URL}/cbt-logs/`);
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
      body: expect.stringContaining('"situation":"Sit"'),
    }));

    expect(result.current.cbtLogs).toHaveLength(1);
    expect(result.current.cbtLogs[0].situation).toBe('Sit');
  });

  it('updates a CBT log', async () => {
    // Mock initial fetch with one log
    const initialLog = { 
        id: '1', 
        situation: 'Old Sit', 
        automaticThoughts: 'Old Auto', 
        distortions: [], 
        rationalResponse: 'Old Resp', 
        moodBefore: 5, 
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
