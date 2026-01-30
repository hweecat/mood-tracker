import { renderHook, act, waitFor } from '@testing-library/react';
import { useTrackerData } from '../src/hooks/useTrackerData';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

describe('useTrackerData', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches data on mount', async () => {
    const mockMoods = [{ id: '1', rating: 5, emotions: ['Happy'], note: 'Good', timestamp: 123 }];
    const mockCBT = [{ id: '1', situation: 'Test', automaticThoughts: 'Auto', distortions: [], rationalResponse: 'Resp', moodBefore: 5, timestamp: 123 }];

    (global.fetch as Mock)
      .mockResolvedValueOnce({
        json: async () => mockMoods,
      })
      .mockResolvedValueOnce({
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
  });

  it('adds a mood entry', async () => {
     // Mock initial fetch
    (global.fetch as Mock)
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [] });

    const { result } = renderHook(() => useTrackerData());
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock POST request
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const newEntry = { rating: 8 as const, emotions: ['Excited'], note: 'Great' };

    await act(async () => {
      await result.current.addMoodEntry(newEntry);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/mood', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"rating":8'),
    }));

    expect(result.current.moodEntries).toHaveLength(1);
    expect(result.current.moodEntries[0].rating).toBe(8);
  });

  it('adds a CBT log', async () => {
     // Mock initial fetch
    (global.fetch as Mock)
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [] });

    const { result } = renderHook(() => useTrackerData());
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock POST request
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const newLog = { 
        situation: 'Sit', 
        automaticThoughts: 'Auto', 
        distortions: [], 
        rationalResponse: 'Resp', 
        moodBefore: 5 as const
    };

    await act(async () => {
      await result.current.addCBTLog(newLog);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/cbt', expect.objectContaining({
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
        timestamp: 123 
    };

    (global.fetch as Mock)
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [initialLog] });

    const { result } = renderHook(() => useTrackerData());
    
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock PUT request
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const updatedLog = { ...initialLog, situation: 'New Sit' };

    await act(async () => {
      await result.current.updateCBTLog(updatedLog);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/cbt', expect.objectContaining({
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