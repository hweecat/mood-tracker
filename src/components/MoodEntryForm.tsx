'use client';

import { useState } from 'react';
import { MoodRating } from '@/types';
import { MoodSelector } from './MoodSelector';
import { cn } from '@/lib/utils';

interface MoodEntryFormProps {
  onSubmit: (entry: { rating: MoodRating; emotions: string[]; note: string; trigger?: string; behavior?: string }) => void;
}

const COMMON_EMOTIONS = [
  'Anxious', 'Sad', 'Angry', 'Happy', 'Calm', 'Stressed', 
  'Excited', 'Tired', 'Lonely', 'Frustrated', 'Grateful', 'Overwhelmed'
];

const COMMON_TRIGGERS = [
  'Work', 'Relationship', 'Health', 'Social', 'Sleep', 'Finance', 'Weather'
];

const COMMON_BEHAVIORS = [
  'Exercise', 'Meditation', 'Socializing', 'Resting', 'Working', 'Hobbies'
];

export function MoodEntryForm({ onSubmit }: MoodEntryFormProps) {
  const [rating, setRating] = useState<MoodRating>(5);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [trigger, setTrigger] = useState('');
  const [behavior, setBehavior] = useState('');

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev => 
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ rating, emotions: selectedEmotions, note, trigger, behavior });
    // Reset form
    setRating(5);
    setSelectedEmotions([]);
    setNote('');
    setTrigger('');
    setBehavior('');
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-10 bg-card border-2 border-border shadow-2xl p-8 rounded-[2.5rem]">
      <div className="space-y-5">
        <p className="text-sm font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-500 pl-4 block">
          How are you feeling right now?
        </p>
        <div className="pt-2">
          <MoodSelector value={rating} onChange={setRating} />
        </div>
      </div>

      <div className="space-y-5">
        <p className="text-sm font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-500 pl-4 block">
          Select Emotions
        </p>
        <div className="flex flex-wrap gap-2.5">
          {COMMON_EMOTIONS.map(emotion => (
            <button
              key={emotion}
              type="button"
              onClick={() => toggleEmotion(emotion)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all active:scale-90 shadow-md outline-none focus-visible:ring-4 focus-visible:ring-brand-500",
                selectedEmotions.includes(emotion)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-brand-500"
              )}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-10">
        <div className="space-y-5">
          <p className="text-xs font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-500 pl-4 block">Trigger</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {COMMON_TRIGGERS.map(t => (
              <button 
                key={t}
                type="button"
                onClick={() => setTrigger(t)}
                className={cn(
                  "text-[10px] px-3 py-1.5 rounded-xl border-2 font-black uppercase tracking-wider transition-all active:scale-95 outline-none focus-visible:ring-4 focus-visible:ring-brand-500",
                  trigger === t 
                    ? "bg-brand-600 text-white border-brand-700 shadow-md" 
                    : "bg-secondary border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            id="trigger-input"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="What caused this feeling?"
            className="w-full p-4 rounded-2xl border-2 border-border bg-secondary text-foreground outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-bold placeholder:text-muted-foreground shadow-inner transition-all"
            aria-label="Trigger"
          />
        </div>

        <div className="space-y-5">
          <p className="text-xs font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-500 pl-4 block">Behavior</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {COMMON_BEHAVIORS.map(b => (
              <button 
                key={b}
                type="button"
                onClick={() => setBehavior(b)}
                className={cn(
                  "text-[10px] px-3 py-1.5 rounded-xl border-2 font-black uppercase tracking-wider transition-all active:scale-95 outline-none focus-visible:ring-4 focus-visible:ring-brand-500",
                  behavior === b 
                    ? "bg-brand-600 text-white border-brand-700 shadow-md" 
                    : "bg-secondary border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {b}
              </button>
            ))}
          </div>
          <input
            type="text"
            id="behavior-input"
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            placeholder="What did you do in response?"
            className="w-full p-4 rounded-2xl border-2 border-border bg-secondary text-foreground outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 text-sm font-bold placeholder:text-muted-foreground shadow-inner transition-all"
            aria-label="Behavior"
          />
        </div>
      </div>

      <div className="space-y-5">
        <label htmlFor="notes-textarea" className="text-xs font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-500 pl-4 block">
          Personal Notes
        </label>
        <textarea
          id="notes-textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Capture your thoughts here..."
          className="w-full min-h-[150px] p-5 rounded-[2rem] border-2 border-border bg-secondary/50 text-foreground outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none placeholder:text-muted-foreground font-bold italic shadow-inner leading-relaxed"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-[0.3em] py-5 px-8 rounded-[2rem] transition-all shadow-2xl active:scale-[0.98] border-b-8 border-primary/50 text-lg outline-none focus-visible:ring-4 focus-visible:ring-brand-500"
      >
        Complete Mood Check-in
      </button>
    </form>
  );
}