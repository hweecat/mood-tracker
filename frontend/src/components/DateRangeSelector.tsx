'use client';

import { useState, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type PresetOption = '7days' | '30days' | '90days' | 'alltime' | 'custom';

const PRESET_LABELS: Record<PresetOption, string> = {
  '7days': 'Last 7 days',
  '30days': 'Last 30 days',
  '90days': 'Last 90 days',
  'alltime': 'All time',
  'custom': 'Custom range'
};

export function DateRangeSelector({ value, onChange, className }: DateRangeSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetOption>('7days');
  const [customStartDate, setCustomStartDate] = useState(format(value.startDate, 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(value.endDate, 'yyyy-MM-dd'));

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('mood-chart-date-range');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedPreset(parsed.preset || '7days');
        if (parsed.startDate && parsed.endDate) {
          setCustomStartDate(parsed.startDate);
          setCustomEndDate(parsed.endDate);
          onChange({
            startDate: new Date(parsed.startDate),
            endDate: endOfDay(new Date(parsed.endDate))
          });
        }
      } catch (e) {
        console.error('Failed to load date range preference:', e);
      }
    }
  }, [onChange]);

  // Save preference when it changes
  const savePreference = (preset: PresetOption, startDate?: Date, endDate?: Date) => {
    const pref = {
      preset,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined
    };
    localStorage.setItem('mood-chart-date-range', JSON.stringify(pref));
  };

  const handlePresetChange = (preset: PresetOption) => {
    setSelectedPreset(preset);
    const now = new Date();
    let newRange: DateRange;

    switch (preset) {
      case '7days':
        newRange = {
          startDate: startOfDay(subDays(now, 6)),
          endDate: endOfDay(now)
        };
        break;
      case '30days':
        newRange = {
          startDate: startOfDay(subDays(now, 29)),
          endDate: endOfDay(now)
        };
        break;
      case '90days':
        newRange = {
          startDate: startOfDay(subDays(now, 89)),
          endDate: endOfDay(now)
        };
        break;
      case 'alltime':
        // Use a very old date for "all time"
        newRange = {
          startDate: new Date(2020, 0, 1),
          endDate: endOfDay(now)
        };
        break;
      case 'custom':
        // Keep current dates for custom
        newRange = value;
        break;
      default:
        return;
    }

    if (preset !== 'custom') {
      setCustomStartDate(format(newRange.startDate, 'yyyy-MM-dd'));
      setCustomEndDate(format(newRange.endDate, 'yyyy-MM-dd'));
    }

    onChange(newRange);
    savePreference(preset, newRange.startDate, newRange.endDate);
  };

  const handleCustomDateChange = (type: 'start' | 'end', date: string) => {
    if (type === 'start') {
      setCustomStartDate(date);
    } else {
      setCustomEndDate(date);
    }

    const start = type === 'start' ? new Date(date) : value.startDate;
    const end = type === 'end' ? new Date(date) : value.endDate;

    if (start && end && start <= end) {
      onChange({
        startDate: startOfDay(start),
        endDate: endOfDay(end)
      });
      savePreference('custom', start, end);
      setSelectedPreset('custom');
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <label htmlFor="date-range" className="text-xs font-bold text-foreground uppercase tracking-wider">
          Date Range
        </label>
        <select
          id="date-range"
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value as PresetOption)}
          className="flex-1 px-4 py-2 text-sm font-bold bg-card border-2 border-border rounded-2xl hover:border-brand-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500 transition-all cursor-pointer"
        >
          {Object.entries(PRESET_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {selectedPreset === 'custom' && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex-1">
            <label htmlFor="start-date" className="sr-only">Start date</label>
            <input
              id="start-date"
              type="date"
              value={customStartDate}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              max={customEndDate}
              className="w-full px-3 py-2 text-sm font-bold bg-card border-2 border-border rounded-xl hover:border-brand-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500 transition-all"
            />
          </div>
          <span className="text-xs font-bold text-muted-foreground">to</span>
          <div className="flex-1">
            <label htmlFor="end-date" className="sr-only">End date</label>
            <input
              id="end-date"
              type="date"
              value={customEndDate}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              min={customStartDate}
              className="w-full px-3 py-2 text-sm font-bold bg-card border-2 border-border rounded-xl hover:border-brand-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500 transition-all"
            />
          </div>
        </div>
      )}
    </div>
  );
}