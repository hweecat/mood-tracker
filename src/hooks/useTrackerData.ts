'use client';

import { useState, useEffect } from 'react';
import { MoodEntry, CBTLog } from '@/types';

export function useTrackerData() {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [cbtLogs, setCbtLogs] = useState<CBTLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [moodRes, cbtRes] = await Promise.all([
        fetch('/api/mood'),
        fetch('/api/cbt')
      ]);
      const moodData = await moodRes.json();
      const cbtData = await cbtRes.json();
      setMoodEntries(moodData);
      setCbtLogs(cbtData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const deleteMoodEntry = async (id: string) => {
    try {
      await fetch(`/api/mood?id=${id}`, { method: 'DELETE' });
      setMoodEntries((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete mood entry:', error);
    }
  };

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
