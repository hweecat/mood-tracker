'use client';

import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { Sun, Moon, Laptop } from 'lucide-react';
import React from 'react';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Laptop },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black text-foreground border-l-4 border-brand-500 pl-3">Appearance</h3>
      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-secondary p-1.5 border border-border shadow-inner">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl p-3 text-[10px] font-black tracking-wider transition-all active:scale-95',
              theme === option.value
                ? 'bg-card text-brand-700 shadow-md border border-brand-100'
                : 'text-muted-foreground hover:bg-card/60'
            )}
          >
            <option.icon className={cn("w-5 h-5", theme === option.value ? "text-brand-600 dark:text-brand-400" : "text-muted-foreground")} />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}