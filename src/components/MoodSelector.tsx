'use client';

import { cn } from '@/lib/utils';
import { MoodRating } from '@/types';
import { Smile, Frown, Meh } from 'lucide-react';

interface MoodSelectorProps {
  value: MoodRating;
  onChange: (value: MoodRating) => void;
}

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  const ratings: MoodRating[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const getIcon = (rating: number) => {
    if (rating <= 3) return <Frown className="w-5 h-5" />;
    if (rating <= 7) return <Meh className="w-5 h-5" />;
    return <Smile className="w-5 h-5" />;
  };

  const getColor = (rating: number) => {
    if (rating <= 3) return 'hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30';
    if (rating <= 7) return 'hover:bg-yellow-100 dark:hover:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/30';
    return 'hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30';
  };

  const getSelectedColor = (rating: number) => {
    if (rating <= 3) return 'bg-red-500 text-white border-red-500';
    if (rating <= 7) return 'bg-yellow-500 text-white border-yellow-500';
    return 'bg-green-500 text-white border-green-500';
  };

  return (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 w-full">
      {ratings.map((rating) => (
        <button
          key={rating}
          type="button"
          aria-label={`Rate mood as ${rating} out of 10`}
          onClick={() => onChange(rating)}
          className={cn(
            'flex flex-col items-center justify-center h-16 rounded-xl border-2 transition-all w-full',
            value === rating
              ? getSelectedColor(rating)
              : cn('bg-white dark:bg-slate-800', getColor(rating))
          )}
        >
          <span className="text-lg font-bold">{rating}</span>
          {getIcon(rating)}
        </button>
      ))}
    </div>
  );
}