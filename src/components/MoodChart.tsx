'use client';

import { MoodEntry } from '@/types';
import { format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { useEffect, useState, useMemo } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { DateRangeSelector } from '@/components/DateRangeSelector';
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

interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function MoodChart({ entries }: MoodChartProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    startDate: startOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)),
    endDate: endOfDay(new Date())
  }));

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine actual start date (handle "All Time" logic)
  const actualStartDate = useMemo(() => {
    // Check if it's the "All Time" placeholder (Jan 1, 2000)
    const isAllTimePlaceholder = dateRange.startDate.getFullYear() === 2000 && 
                                 dateRange.startDate.getMonth() === 0 && 
                                 dateRange.startDate.getDate() === 1;

    if (isAllTimePlaceholder && entries.length > 0) {
      const earliestTimestamp = Math.min(...entries.map(e => e.timestamp));
      return startOfDay(new Date(earliestTimestamp));
    }
    return dateRange.startDate;
  }, [dateRange.startDate, entries]);

  // Get all days in the selected range
  const daysInRange = eachDayOfInterval({
    start: actualStartDate,
    end: dateRange.endDate
  });

  // Limit to reasonable number of points for performance
  const maxDays = 365;
  const displayDays = daysInRange.length > maxDays ? daysInRange.slice(-maxDays) : daysInRange;

  // Process data for the selected range
  const data = displayDays.map(day => {
    const dayEntries = entries.filter(e => {
      const entryDate = startOfDay(new Date(e.timestamp));
      const currentDay = startOfDay(day);
      return entryDate.getTime() === currentDay.getTime();
    });

    const averageRating = dayEntries.length > 0
      ? dayEntries.reduce((acc, curr) => acc + curr.rating, 0) / dayEntries.length
      : null;

    return {
      date: format(day, displayDays.length > 60 ? 'MMM dd' : 'MMM d'),
      rating: averageRating ? parseFloat(averageRating.toFixed(1)) : null,
      fullDate: format(day, 'yyyy-MM-dd')
    };
  });

  const isDark = resolvedTheme === 'dark';

  // Get range label for display
  const getRangeLabel = () => {
    const { startDate, endDate } = dateRange;
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 7) {
      return 'Last 7 Days';
    } else if (daysDiff <= 30) {
      return 'Last 30 Days';
    } else if (daysDiff <= 90) {
      return 'Last 90 Days';
    } else if (daysDiff <= 365) {
      return `Last ${daysDiff} Days`;
    } else {
      return `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`;
    }
  };

  if (!mounted) {
    return (
      <div className="card h-[300px] w-full flex items-center justify-center bg-card text-card-foreground">
        <div className="text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  return (
    <section aria-label="Mood Trend Chart" className="card w-full bg-card text-card-foreground border border-border shadow-sm rounded-2xl">
      <div className="p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Mood Trend ({getRangeLabel()})
          </h3>
          <div className="w-full sm:w-auto">
            <DateRangeSelector
              value={dateRange}
              onChange={setDateRange}
            />
          </div>
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#475569' }}
                dy={10}
                interval={displayDays.length > 7 ? 'preserveStartEnd' : 0}
                minTickGap={20}
              />
              <YAxis
                domain={[1, 10]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#475569' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? '#334155' : '#e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: isDark ? '#f8fafc' : '#0f172a'
                }}
                labelFormatter={(value) => {
                  const item = data.find(d => d.date === value);
                  return item?.fullDate || value;
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
      </div>
    </section>
  );
}
