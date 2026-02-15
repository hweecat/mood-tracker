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
    if (rating <= 3) return 'hover:bg-red-50 dark:hover:bg-red-900/20 text-[#991b1b] dark:text-[#f87171] border-red-200 dark:border-red-900/30';
    if (rating <= 7) return 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-[#854d0e] dark:text-[#facc15] border-yellow-200 dark:border-yellow-900/30';
    return 'hover:bg-green-50 dark:hover:bg-green-900/20 text-[#166534] dark:text-[#4ade80] border-green-200 dark:border-green-900/30';
  };

  const getSelectedColor = (rating: number) => {
    if (rating <= 3) return 'bg-[#b91c1c] text-white border-[#991b1b]';
    if (rating <= 7) return 'bg-[#facc15] text-[#020617] border-[#ca8a04]';
    return 'bg-[#15803d] text-white border-[#166534]';
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