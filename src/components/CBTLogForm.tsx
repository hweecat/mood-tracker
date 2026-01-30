'use client';

import { useState, useEffect } from 'react';
import { CognitiveDistortion, MoodRating, CBTLog } from '@/types';
import { MoodSelector } from './MoodSelector';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';
import { RotateCcw, Info, X } from 'lucide-react';
import { CBT_DISTORTIONS } from '@/lib/cbt-content';

const DISTORTIONS = CBT_DISTORTIONS.map(d => d.name) as CognitiveDistortion[];

interface CBTLogFormProps {
  initialData?: CBTLog;
  onSubmit: (log: Omit<CBTLog, 'id' | 'timestamp' | 'userId'>) => void;
  onCancel?: () => void;
}

const DEFAULT_FORM_DATA = {
  situation: '',
  automaticThoughts: '',
  distortions: [] as CognitiveDistortion[],
  rationalResponse: '',
  moodBefore: 5 as MoodRating,
  moodAfter: 5 as MoodRating,
  behavioralLink: '',
  actionPlanStatus: 'pending' as 'pending' | 'completed',
};

export function CBTLogForm({ initialData, onSubmit, onCancel }: CBTLogFormProps) {
  // Use local storage for drafts if not editing an existing entry
  const [draftData, setDraftData] = useLocalStorage('cbt-draft-data', DEFAULT_FORM_DATA);
  const [draftStep, setDraftStep] = useLocalStorage('cbt-draft-step', 1);

  const [step, setStep] = useState(initialData ? 1 : draftStep);
  const [formData, setFormData] = useState(initialData ? {
    situation: initialData.situation,
    automaticThoughts: initialData.automaticThoughts,
    distortions: initialData.distortions,
    rationalResponse: initialData.rationalResponse,
    moodBefore: initialData.moodBefore,
    moodAfter: initialData.moodAfter || 5,
    behavioralLink: initialData.behavioralLink || '',
    actionPlanStatus: initialData.actionPlanStatus || 'pending',
  } : draftData);

  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  // Sync state to draft storage if not in edit mode
  useEffect(() => {
    if (!initialData) {
      setDraftData(formData);
      setDraftStep(step);
    }
  }, [formData, step, initialData, setDraftData, setDraftStep]);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const clearDraft = () => {
    if (confirm('Are you sure you want to clear your current journaling progress?')) {
      setFormData(DEFAULT_FORM_DATA);
      setStep(1);
      setDraftData(DEFAULT_FORM_DATA);
      setDraftStep(1);
    }
  };

  const toggleDistortion = (distortion: CognitiveDistortion) => {
    setFormData(prev => ({
      ...prev,
      distortions: prev.distortions.includes(distortion)
        ? prev.distortions.filter(d => d !== distortion)
        : [...prev.distortions, distortion]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    
    // Reset and clear draft
    if (!initialData) {
      setDraftData(DEFAULT_FORM_DATA);
      setDraftStep(1);
    }
    setStep(1);
    setFormData(DEFAULT_FORM_DATA);
  };

  return (
    <div className="card space-y-0 bg-card border-2 border-border shadow-2xl rounded-[2.5rem] overflow-hidden p-0">
      {/* Header Section with Distinct Background */}
      <div className="flex justify-between items-center p-8 bg-muted/50 border-b-2 border-border">
        <h2 className="text-2xl font-black text-foreground tracking-tighter">
          {initialData ? 'Edit CBT Journal Entry' : 'CBT Journal Entry'}
        </h2>
        <div className="flex items-center gap-3">
          {!initialData && (formData.situation || step > 1) && (
            <button 
              onClick={clearDraft}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              title="Clear Draft"
            >
              <RotateCcw size={18} />
            </button>
          )}
          <span className="text-xs font-black text-foreground uppercase tracking-widest bg-card px-4 py-1.5 rounded-full border-2 border-border shadow-sm">
            Step {step} / 5
          </span>
        </div>
      </div>

      <div className="px-8 pt-6 pb-8 space-y-8">
        <div className="w-full bg-secondary h-4 rounded-full overflow-hidden border-2 border-border shadow-inner p-0.5">
          <div 
            className="bg-brand-600 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(2,132,199,0.6)]" 
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        <div className="min-h-[400px]">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="space-y-5">
                <label className="text-sm font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-500 pl-4 block">1. The Situation</label>
                <p className="text-sm text-muted-foreground font-bold italic leading-relaxed bg-secondary/50 p-4 rounded-2xl border-l-4 border-border shadow-inner">What specifically happened that triggered your distress?</p>
                <textarea
                  className="w-full min-h-[150px] p-5 rounded-[2rem] border-2 border-border bg-card text-foreground outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 font-bold placeholder:text-muted-foreground shadow-lg transition-all"
                  value={formData.situation}
                  onChange={e => setFormData({...formData, situation: e.target.value})}
                  placeholder="e.g., I was overlooked for a promotion I worked hard for..."
                />
              </div>
              <div className="space-y-5 pt-6 border-t-2 border-border">
                <label className="text-sm font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-muted-foreground pl-4 block">Initial Mood</label>
                <div className="pt-2">
                  <MoodSelector 
                    value={formData.moodBefore} 
                    onChange={val => setFormData({...formData, moodBefore: val})} 
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="space-y-5">
                <label className="text-sm font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-500 pl-4 block">2. Automatic Thoughts</label>
                <p className="text-sm text-muted-foreground font-bold italic leading-relaxed bg-secondary/50 p-4 rounded-2xl border-l-4 border-border shadow-inner">What is your inner critic telling you? Capture the raw thoughts exactly as they appear.</p>
                <textarea
                  className="w-full min-h-[200px] p-5 rounded-[2rem] border-2 border-border bg-card text-foreground outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 font-bold placeholder:text-muted-foreground shadow-lg transition-all"
                  value={formData.automaticThoughts}
                  onChange={e => setFormData({...formData, automaticThoughts: e.target.value})}
                  placeholder="e.g., I'm incompetent. Everyone else is better than me. I'll never succeed."
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="space-y-5">
                <label className="text-sm font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-500 pl-4 block">3. Identification</label>
                <p className="text-sm text-muted-foreground font-bold italic leading-relaxed bg-secondary/50 p-4 rounded-2xl border-l-4 border-border shadow-inner">Which cognitive distortions (logical errors) can you spot in those thoughts?</p>
                
                {activeInfo && (
                   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200" onClick={() => setActiveInfo(null)}>
                     <div className="bg-card p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-3 relative" onClick={e => e.stopPropagation()}>
                       <button onClick={() => setActiveInfo(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X size={20}/></button>
                       <h3 className="text-xl font-black text-brand-600">{activeInfo}</h3>
                       <p className="text-card-foreground leading-relaxed">
                         {CBT_DISTORTIONS.find(d => d.name === activeInfo)?.definition}
                       </p>
                       <div className="bg-secondary p-3 rounded-xl">
                         <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Example</span>
                         <p className="text-sm italic text-foreground mt-1">&quot;{CBT_DISTORTIONS.find(d => d.name === activeInfo)?.example}&quot;</p>
                       </div>
                     </div>
                   </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {DISTORTIONS.map(d => (
                    <div key={d} className="flex gap-2 items-stretch">
                      <button
                        type="button"
                        onClick={() => toggleDistortion(d)}
                        className={cn(
                          "flex-1 px-5 py-4 rounded-2xl text-left text-sm transition-all border-2 active:scale-[0.98] font-bold shadow-md outline-none focus-visible:ring-4 focus-visible:ring-brand-500",
                          formData.distortions.includes(d)
                            ? "bg-slate-900 text-white border-slate-950 dark:bg-brand-600 dark:border-brand-700 ring-4 ring-brand-500/20"
                            : "bg-card text-foreground border-border hover:border-brand-500 hover:bg-secondary"
                        )}
                      >
                        {d}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setActiveInfo(d)}
                        className="px-4 rounded-2xl bg-secondary text-muted-foreground hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all border-2 border-transparent active:scale-95 flex items-center justify-center"
                        aria-label={`Info about ${d}`}
                      >
                        <Info size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="space-y-5">
                <label className="text-sm font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-brand-500 pl-4 block">4. Rational Challenge</label>
                <p className="text-sm text-muted-foreground font-bold italic leading-relaxed bg-secondary/50 p-4 rounded-2xl border-l-4 border-border shadow-inner">Look at the evidence. What is a more objective, realistic, and compassionate way to view the situation?</p>
                <textarea
                  className="w-full min-h-[200px] p-5 rounded-[2rem] border-2 border-border bg-card text-foreground outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 font-bold placeholder:text-muted-foreground shadow-lg transition-all"
                  value={formData.rationalResponse}
                  onChange={e => setFormData({...formData, rationalResponse: e.target.value})}
                  placeholder="e.g., While this promotion didn't happen, my performance reviews have been consistently high..."
                />
              </div>
              <div className="space-y-5 pt-6 border-t-2 border-border">
                <label className="text-sm font-bold text-foreground uppercase tracking-[0.2em] border-l-8 border-muted-foreground pl-4 block">Mood After Reframing</label>
                <div className="pt-2">
                  <MoodSelector 
                    value={formData.moodAfter} 
                    onChange={val => setFormData({...formData, moodAfter: val})} 
                  />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="space-y-5">
                <label className="text-sm font-bold text-foreground uppercase tracking-wider border-l-8 border-brand-500 pl-4 block">5. Actionable Plan</label>
                <p className="text-sm text-muted-foreground font-bold italic leading-relaxed bg-secondary/50 p-4 rounded-2xl border-l-4 border-border shadow-inner">What is one concrete action you can take to move forward constructively?</p>
                <textarea
                  className="w-full min-h-[150px] p-5 rounded-[2rem] border-2 border-border bg-card text-foreground outline-none focus:ring-4 focus:ring-brand-500/20 focus:border-brand-500 font-bold placeholder:text-muted-foreground shadow-lg transition-all"
                  value={formData.behavioralLink}
                  onChange={e => setFormData({...formData, behavioralLink: e.target.value, actionPlanStatus: 'pending'})}
                  placeholder="e.g., I will schedule a meeting with my manager to ask for specific feedback on areas for growth."
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-5 pt-8 border-t-4 border-border">
          {(onCancel || step > 1) && (
            <button
              type="button"
              onClick={step > 1 ? prevStep : onCancel}
              className="flex-1 py-5 px-8 rounded-[2rem] border-4 border-border font-black uppercase tracking-widest text-foreground hover:bg-secondary transition-all active:scale-95 shadow-md shadow-slate-100 dark:shadow-none outline-none focus-visible:ring-4 focus-visible:ring-brand-500"
            >
              {step > 1 ? 'Back' : 'Cancel'}
            </button>
          )}
          {step < 5 ? (
            <button
              onClick={nextStep}
              disabled={step === 1 && !formData.situation}
              className="flex-[2] py-5 px-8 rounded-[2rem] bg-slate-950 dark:bg-brand-600 text-white font-black uppercase tracking-widest hover:bg-black dark:hover:bg-brand-700 transition-all disabled:opacity-20 active:scale-95 shadow-2xl border-b-8 border-slate-800 dark:border-brand-800 outline-none focus-visible:ring-4 focus-visible:ring-brand-500"
            >
              Next Step
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="flex-[2] py-5 px-8 rounded-[2rem] bg-green-600 text-white font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-2xl active:scale-95 border-b-8 border-green-800 outline-none focus-visible:ring-4 focus-visible:ring-brand-500"
            >
              {initialData ? 'Update Journal' : 'Finalize Entry'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
