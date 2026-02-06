'use client';

import { useState, useEffect } from 'react';
import { MoodEntry, CBTLog } from '@/types';

/**
 * Custom hook to manage mood entries and CBT logs.
 * Handles fetching, adding, updating, and deleting data from the API.
 */
export function useTrackerData() {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [cbtLogs, setCbtLogs] = useState<CBTLog[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Fetches all mood and CBT data for the current user.
   */
  const fetchData = async () => {
    try {
      const [moodRes, cbtRes] = await Promise.all([
        fetch('/api/mood'),
        fetch('/api/cbt')
      ]);
      
      if (!moodRes.ok || !cbtRes.ok) {
        console.error('Fetch failed:', moodRes.status, cbtRes.status);
        setLoading(false);
        return;
      }

      const moodData = await moodRes.json();
      const cbtData = await cbtRes.json();
      
      if (Array.isArray(moodData)) {
        setMoodEntries(moodData);
      } else {
        console.error('Mood data is not an array:', moodData);
      }
      
      if (Array.isArray(cbtData)) {
        setCbtLogs(cbtData);
      } else {
        console.error('CBT data is not an array:', cbtData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /**
   * Adds a new mood entry.
   * @param entry - The mood entry data (without ID and timestamp).
   */
  const addMoodEntry = async (entry: Omit<MoodEntry, 'id' | 'timestamp' | 'userId'>) => {
    const newEntry: MoodEntry = {
      ...entry,
      id: crypto.randomUUID(),
      userId: '', // Placeholder, will be set by server
      timestamp: Date.now(),
    };

    try {
      await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
      setMoodEntries((prev) => [newEntry, ...prev]);
    } catch (error) {
      console.error('Failed to save mood entry:', error);
    }
  };

  /**
   * Adds a new CBT log.
   * @param log - The CBT log data (without ID and timestamp).
   */
  const addCBTLog = async (log: Omit<CBTLog, 'id' | 'timestamp' | 'userId'>) => {
    const newLog: CBTLog = {
      ...log,
      id: crypto.randomUUID(),
      userId: '', // Placeholder, will be set by server
      timestamp: Date.now(),
    };

    try {
      await fetch('/api/cbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });
      setCbtLogs((prev) => [newLog, ...prev]);
    } catch (error) {
      console.error('Failed to save CBT log:', error);
    }
  };

  /**
   * Updates an existing CBT log.
   * @param log - The complete CBT log to update.
   */
  const updateCBTLog = async (log: CBTLog) => {
    try {
      await fetch('/api/cbt', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
      setCbtLogs((prev) => prev.map((item) => (item.id === log.id ? log : item)));
    } catch (error) {
      console.error('Failed to update CBT log:', error);
    }
  };

  /**
   * Deletes a mood entry by ID.
   * @param id - The UUID of the mood entry.
   */
  const deleteMoodEntry = async (id: string) => {
    try {
      await fetch(`/api/mood?id=${id}`, { method: 'DELETE' });
      setMoodEntries((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete mood entry:', error);
    }
  };

  /**
   * Deletes a CBT log by ID.
   * @param id - The UUID of the CBT log.
   */
  const deleteCBTLog = async (id: string) => {
    try {
      await fetch(`/api/cbt?id=${id}`, { method: 'DELETE' });
      setCbtLogs((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete CBT log:', error);
    }
  };

  return {
    moodEntries,
    cbtLogs,
    addMoodEntry,
    addCBTLog,
    updateCBTLog,
    deleteMoodEntry,
    deleteCBTLog,
    fetchData,
    loading,
  };
}
