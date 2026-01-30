'use client';

import React, { useMemo } from 'react';
import { MoodEntry, CBTLog, CognitiveDistortion } from '@/types';
import { useTheme } from '@/components/ThemeProvider';
import { 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  Activity, 
  ArrowUpRight, 
  BarChart3,
  Calendar
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from '@/lib/utils';

interface InsightsViewProps {
  moodEntries: MoodEntry[];
  cbtLogs: CBTLog[];
}

export function InsightsView({ moodEntries, cbtLogs }: InsightsViewProps) {
  const { resolvedTheme } = useTheme();
  
  // 1. Distortion Frequency
  const distortionData = useMemo(() => {
    const counts = cbtLogs.reduce((acc, log) => {
      log.distortions.forEach(d => {
        acc[d] = (acc[d] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [cbtLogs]);

  // 2. Emotion Frequency
  const emotionData = useMemo(() => {
    const counts = moodEntries.reduce((acc, entry) => {
      entry.emotions.forEach(e => {
        acc[e] = (acc[e] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [moodEntries]);

  // 3. Dynamic Trigger Analysis (Combined Mood and CBT)
  const triggerData = useMemo(() => {
    type UnifiedEntry = { trigger?: string; rating: number };
    
    const moodSource: UnifiedEntry[] = moodEntries.map(e => ({ trigger: e.trigger, rating: e.rating }));
    const cbtSource: UnifiedEntry[] = cbtLogs.map(l => ({ 
      trigger: l.situation.length < 20 ? l.situation : l.situation.substring(0, 15) + '...',
      rating: l.moodBefore 
    }));

    const stats = [...moodSource, ...cbtSource].reduce((acc, entry) => {
      const t = entry.trigger;
      if (t) {
        if (!acc[t]) acc[t] = { count: 0, totalMood: 0 };
        acc[t].count += 1;
        acc[t].totalMood += entry.rating;
      }
      return acc;
    }, {} as Record<string, { count: number, totalMood: number }>);

    return Object.entries(stats)
      .map(([name, stats]) => ({ 
        name, 
        count: stats.count, 
        avgMood: stats.totalMood / stats.count 
      }))
      .sort((a, b) => b.count - a.count) // Most frequent triggers first
      .slice(0, 5);
  }, [moodEntries, cbtLogs]);

  // 4. Progress Metrics
  const avgImprovement = useMemo(() => {
    const avgMoodBefore = cbtLogs.length > 0 
      ? cbtLogs.reduce((acc, l) => acc + l.moodBefore, 0) / cbtLogs.length 
      : 0;
    const avgMoodAfter = cbtLogs.length > 0 
      ? cbtLogs.reduce((acc, l) => acc + (l.moodAfter || l.moodBefore), 0) / cbtLogs.length 
      : 0;
    return avgMoodAfter - avgMoodBefore;
  }, [cbtLogs]);

  const COLORS = ['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316'];

  if (moodEntries.length === 0 && cbtLogs.length === 0) {
    return (
      <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] border-4 border-dashed border-slate-200 dark:border-slate-800 shadow-inner">
        <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-slate-200 dark:border-slate-700">
          <BarChart3 className="text-slate-400 dark:text-slate-600 w-10 h-10" />
        </div>
        <h3 className="text-xl font-black text-slate-950 dark:text-slate-200 tracking-tight">No data to analyze yet</h3>
        <p className="text-slate-800 dark:text-slate-500 max-w-xs mx-auto mt-3 font-bold">Start journaling and checking in to see your personalized mental health insights here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-200 dark:border-slate-800 shadow-xl border-b-8 border-green-500/20">
          <div className="p-2.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-2xl w-fit mb-4 border-2 border-green-200 dark:border-transparent">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="text-4xl font-black text-slate-950 dark:text-slate-100 tracking-tighter">+{avgImprovement.toFixed(1)}</div>
          <div className="text-[11px] font-black text-slate-600 dark:text-slate-500 mt-2">Avg. Relief</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border-2 border-slate-200 dark:border-slate-800 shadow-xl border-b-8 border-blue-500/20">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-2xl w-fit mb-4 border-2 border-blue-200 dark:border-transparent">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="text-4xl font-black text-slate-950 dark:text-slate-100 tracking-tighter">{moodEntries.length + cbtLogs.length}</div>
          <div className="text-[11px] font-black text-slate-600 dark:text-slate-500 mt-2">Total Entries</div>
        </div>
      </div>

      {/* Cognitive Distortions Chart */}
      <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center gap-3 mb-8 border-b-4 border-slate-50 dark:border-slate-800 pb-5">
          <AlertTriangle className="w-6 h-6 text-purple-600 dark:text-purple-500" />
          <h3 className="font-black text-slate-950 dark:text-slate-100 text-sm">Cognitive Distortions</h3>
        </div>
        {distortionData.length > 0 ? (
          <div className="h-[280px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distortionData} layout="vertical" margin={{ left: 30, right: 30, top: 0, bottom: 0 }}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  horizontal={true} 
                  vertical={false} 
                  stroke={resolvedTheme === 'dark' ? "#334155" : "#e2e8f0"} 
                />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 10, fill: resolvedTheme === 'dark' ? '#94a3b8' : '#334155', fontWeight: '900' }} 
                  width={140}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: resolvedTheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }}
                  contentStyle={{ 
                    backgroundColor: resolvedTheme === 'dark' ? '#000000' : '#ffffff',
                    borderRadius: '16px', 
                    border: `2px solid ${resolvedTheme === 'dark' ? '#334155' : '#e2e8f0'}`, 
                    boxShadow: '0 20px 25px -5px rgb(0 0, 0 / 0.1)' 
                  }}
                  itemStyle={{ color: resolvedTheme === 'dark' ? '#f8fafc' : '#0f172a', fontWeight: '900', fontSize: '10px' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                  {distortionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-700 dark:text-slate-500 text-sm italic font-black bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">Complete CBT logs to identify distortions.</div>
        )}
      </section>

      {/* Emotion Triggers & Behavioral Links */}
      <div className="grid sm:grid-cols-2 gap-8">
        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-6 border-b-4 border-slate-50 dark:border-slate-800 pb-4">
            <Zap className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            <h3 className="font-black text-slate-950 dark:text-slate-100 text-xs">Frequent Triggers</h3>
          </div>
          <div className="space-y-5">
            {triggerData.length > 0 ? triggerData.map((t) => (
              <div key={t.name} className="space-y-2">
                <div className="flex justify-between text-[11px] font-black">
                  <span className="text-slate-900 dark:text-slate-300 truncate max-w-[120px]">{t.name}</span>
                  <span className="text-slate-700 dark:text-slate-500 font-black">{t.count}x</span>
                </div>
                <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex border-2 border-slate-300 dark:border-transparent shadow-inner">
                  <div 
                    className={cn(
                      "h-full shadow-[inset_0_0_8px_rgba(0,0,0,0.1)]",
                      t.avgMood <= 4 ? "bg-red-600" : t.avgMood <= 7 ? "bg-amber-500" : "bg-green-600"
                    )}
                    style={{ width: `${(t.avgMood / 10) * 100}%` }}
                  />
                </div>
              </div>
            )) : <div className="text-xs text-slate-700 dark:text-slate-500 italic font-black text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">No triggers recorded yet.</div>}
          </div>
          <p className="text-[10px] font-black text-slate-600 dark:text-slate-600 mt-6 italic text-center bg-slate-50 dark:bg-slate-800/30 py-2 rounded-lg">Mood Impact Scale (1-10)</p>
        </section>

        <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-6 border-b-4 border-slate-50 dark:border-slate-800 pb-4">
            <Activity className="w-6 h-6 text-brand-600 dark:text-brand-500" />
            <h3 className="font-black text-slate-950 dark:text-slate-100 text-xs">Common Emotions</h3>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {emotionData.length > 0 ? emotionData.map((e) => (
              <div 
                key={e.name}
                className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center gap-3 shadow-md active:scale-95 transition-all"
              >
                <span className="text-xs font-black text-slate-950 dark:text-slate-200 tracking-tight">{e.name}</span>
                <span className="text-xs font-black text-white bg-slate-900 dark:text-brand-400 dark:bg-black px-2 py-1 rounded-lg border border-slate-700 dark:border-transparent">{e.value}</span>
              </div>
            )) : <div className="text-xs text-slate-700 dark:text-slate-500 italic font-black text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl w-full">No emotions recorded yet.</div>}
          </div>
        </section>
      </div>

      {/* Thought Patterns / Behavioral Insights */}
      <section className="bg-slate-950 dark:bg-black p-8 rounded-[2.5rem] text-white shadow-2xl border-b-8 border-slate-800 dark:border-slate-900">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-500 rounded-xl">
            <ArrowUpRight className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-black text-xs text-slate-300">Actionable Insights</h3>
        </div>
        <div className="space-y-6">
          {cbtLogs.length > 0 && distortionData.length > 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border-2 border-white/10 shadow-inner">
              <p className="text-base leading-relaxed text-slate-100 font-medium">
                Your most frequent cognitive distortion is <span className="font-black text-brand-400 underline decoration-brand-400 decoration-4 underline-offset-8 tracking-tight">{distortionData[0]?.name}</span>. 
                When you experience this, your mood improves by average <span className="font-black text-green-400 text-xl">{(cbtLogs.filter(l => l.distortions.includes(distortionData[0]?.name as CognitiveDistortion)).reduce((acc, l) => acc + (l.moodAfter || l.moodBefore) - l.moodBefore, 0) / Math.max(1, cbtLogs.filter(l => l.distortions.includes(distortionData[0]?.name as CognitiveDistortion)).length)).toFixed(1)}</span> points after reframing.
              </p>
            </div>
          ) : null}
          <div className="flex items-center justify-center gap-4 py-2 opacity-60">
            <div className="h-px bg-slate-700 flex-1" />
            <p className="text-[10px] text-slate-400 font-black italic">Keep journaling to unlock more patterns</p>
            <div className="h-px bg-slate-700 flex-1" />
          </div>
        </div>
      </section>
    </div>
  );
}
