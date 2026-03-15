'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MoodEntry, CBTLog } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_V1_URL = `${API_BASE_URL}/api/v1`;

/**
 * Custom hook to manage mood entries and CBT logs.
 * Handles fetching, adding, updating, and deleting data from the API.
 */
export function useTrackerData() {
  const { data: session, status } = useSession();
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [cbtLogs, setCbtLogs] = useState<CBTLog[]>([]);
  const [loading, setLoading] = useState(true);

  const accessToken = session?.accessToken;

  /**
   * Fetches all mood and CBT data for the current user.
   */
  const fetchData = useCallback(async () => {
    if (status !== 'authenticated' || !accessToken) {
      setLoading(false);
      return;
    }

    try {
      const [moodRes, cbtRes] = await Promise.all([
        fetch(`${API_V1_URL}/moods/`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }),
        fetch(`${API_V1_URL}/cbt-logs/`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
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
      }
      
      if (Array.isArray(cbtData)) {
        setCbtLogs(cbtData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [status, accessToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Adds a new mood entry.
   */
  const addMoodEntry = async (entry: Omit<MoodEntry, 'id' | 'timestamp' | 'userId'>) => {
    if (!accessToken) return;

    const newEntry: MoodEntry = {
      ...entry,
      id: crypto.randomUUID(),
      userId: session?.user?.id || '',
      timestamp: Date.now(),
    };

    try {
      const res = await fetch(`${API_V1_URL}/moods/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(newEntry),
      });
      const savedEntry = await res.json();
      setMoodEntries((prev) => [savedEntry, ...prev]);
    } catch (error) {
      console.error('Failed to save mood entry:', error);
    }
  };

  /**
   * Adds a new CBT log.
   */
  const addCBTLog = async (log: Omit<CBTLog, 'id' | 'timestamp' | 'userId'>) => {
    if (!accessToken) return;

    const newLog: CBTLog = {
      ...log,
      id: crypto.randomUUID(),
      userId: session?.user?.id || '',
      timestamp: Date.now(),
    };

    try {
      const res = await fetch(`${API_V1_URL}/cbt-logs/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(newLog),
      });
      const savedLog = await res.json();
      setCbtLogs((prev) => [savedLog, ...prev]);
    } catch (error) {
      console.error('Failed to save CBT log:', error);
    }
  };

  /**
   * Updates an existing CBT log.
   */
  const updateCBTLog = async (log: CBTLog) => {
    if (!accessToken) return;

    try {
      await fetch(`${API_V1_URL}/cbt-logs/${log.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(log),
      });
      setCbtLogs((prev) => prev.map((item) => (item.id === log.id ? log : item)));
    } catch (error) {
      console.error('Failed to update CBT log:', error);
    }
  };

  /**
   * Deletes a mood entry by ID.
   */
  const deleteMoodEntry = async (id: string) => {
    if (!accessToken) return;

    try {
      await fetch(`${API_V1_URL}/moods/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setMoodEntries((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete mood entry:', error);
    }
  };

  /**
   * Deletes a CBT log by ID.
   */
  const deleteCBTLog = async (id: string) => {
    if (!accessToken) return;

    try {
      await fetch(`${API_V1_URL}/cbt-logs/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
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
