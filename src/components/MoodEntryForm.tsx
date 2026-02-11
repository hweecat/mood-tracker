'use client';

import { useState } from 'react';
import { MoodRating } from '@/types';
import { MoodSelector } from './MoodSelector';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

interface MoodEntryFormProps {
  onSubmit: (entry: { rating: MoodRating; emotions: string[]; note: string; trigger?: string; behavior?: string }) => void;
}
// ... (rest of constants)
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
    <Card className="space-y-10">
      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="space-y-5">
          <CardTitle>How are you feeling right now?</CardTitle>
          <div className="pt-2">
            <MoodSelector value={rating} onChange={setRating} />
          </div>
        </div>

        <div className="space-y-5">
          <CardTitle>Select Emotions</CardTitle>
          <div className="flex flex-wrap gap-2.5">
            {COMMON_EMOTIONS.map(emotion => (
              <Button
                key={emotion}
                type="button"
                variant={selectedEmotions.includes(emotion) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleEmotion(emotion)}
                className="h-auto py-2.5 rounded-2xl"
              >
                {emotion}
                {selectedEmotions.includes(emotion) && <span className="sr-only"> (Selected)</span>}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-10">
          <div className="space-y-5">
            <label id="trigger-label" htmlFor="trigger-input" className="text-sm font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-600 pl-4 block">Trigger</label>
            <div className="flex flex-wrap gap-2 mb-4" role="group" aria-labelledby="trigger-label">
              {COMMON_TRIGGERS.map(t => (
                <button 
                  key={t}
                  type="button"
                  onClick={() => setTrigger(t)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-xl border-2 font-black uppercase tracking-wider transition-all active:scale-95 outline-none focus-visible:ring-4 focus-visible:ring-brand-500",
                    trigger === t 
                      ? "bg-brand-700 text-white border-brand-800 shadow-md" 
                      : "bg-secondary border-border text-foreground hover:bg-muted"
                  )}
                >
                  {t}
                  {trigger === t && <span className="sr-only"> (Selected)</span>}
                </button>
              ))}
            </div>
            <Input
              id="trigger-input"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              placeholder="What caused this feeling?"
              aria-labelledby="trigger-label"
            />
          </div>

          <div className="space-y-5">
            <label id="behavior-label" htmlFor="behavior-input" className="text-sm font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-600 pl-4 block">Behavior</label>
            <div className="flex flex-wrap gap-2 mb-4" role="group" aria-labelledby="behavior-label">
              {COMMON_BEHAVIORS.map(b => (
                <button 
                  key={b}
                  type="button"
                  onClick={() => setBehavior(b)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-xl border-2 font-black uppercase tracking-wider transition-all active:scale-95 outline-none focus-visible:ring-4 focus-visible:ring-brand-500",
                    behavior === b 
                      ? "bg-brand-700 text-white border-brand-800 shadow-md" 
                      : "bg-secondary border-border text-foreground hover:bg-muted"
                  )}
                >
                  {b}
                  {behavior === b && <span className="sr-only"> (Selected)</span>}
                </button>
              ))}
            </div>
            <Input
              id="behavior-input"
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
              placeholder="What did you do in response?"
              aria-labelledby="behavior-label"
            />
          </div>
        </div>

        <div className="space-y-5">
          <label htmlFor="notes-textarea" className="text-sm font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-600 pl-4 block">
            Personal Notes
          </label>
          <textarea
            id="notes-textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Capture your thoughts here..."
            className="w-full min-h-[150px] p-5 rounded-[2rem] border-2 border-border bg-[#f8fafc] dark:bg-[#1e293b] text-[#0f172a] dark:text-[#f8fafc] outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none placeholder:text-muted-foreground font-bold italic shadow-inner leading-relaxed"
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full"
        >
          Complete Mood Check-in
        </Button>
      </form>
    </Card>
  );
}