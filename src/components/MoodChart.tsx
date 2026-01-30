'use client';

import { MoodEntry } from '@/types';
import { format, subDays, startOfDay } from 'date-fns';
import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface MoodChartProps {
  entries: MoodEntry[];
}

export function MoodChart({ entries }: MoodChartProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Process data for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    return startOfDay(date);
  }).reverse();

  const data = last7Days.map(day => {
    const dayEntries = entries.filter(e => 
      startOfDay(new Date(e.timestamp)).getTime() === day.getTime()
    );
    
    const averageRating = dayEntries.length > 0
      ? dayEntries.reduce((acc, curr) => acc + curr.rating, 0) / dayEntries.length
      : null;

    return {
      date: format(day, 'MMM d'),
      rating: averageRating ? parseFloat(averageRating.toFixed(1)) : null,
    };
  });

  const isDark = resolvedTheme === 'dark';

  if (!mounted) {
    return (
      <div className="card h-[300px] w-full flex items-center justify-center bg-card text-card-foreground">
        <div className="text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="card h-[300px] w-full bg-card text-card-foreground border border-border shadow-sm p-6 rounded-2xl">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Mood Trend (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }}
            dy={10}
          />
          <YAxis 
            domain={[1, 10]} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748b' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderRadius: '12px', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              color: isDark ? '#f8fafc' : '#0f172a'
            }}
          />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#0ea5e9"
            strokeWidth={3}
            dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: isDark ? '#1e293b' : '#fff' }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
