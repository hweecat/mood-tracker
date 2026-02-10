'use client';

import { MoodEntry, CBTLog } from '@/types';
import { format } from 'date-fns';
import { Smile, Brain, Edit2, Lightbulb, Target, TrendingUp, Zap, Activity, ChevronDown, Search, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';

interface HistoryViewProps {
  moodEntries: MoodEntry[];
  cbtLogs: CBTLog[];
  onEditCBT?: (log: CBTLog) => void;
  onDeleteMood?: (id: string) => void;
  onDeleteCBT?: (id: string) => void;
}

const DISTORTION_INSIGHTS: Record<string, string> = {
  'All-or-Nothing Thinking': 'Try identifying "shades of gray" and middle-ground outcomes.',
  'Overgeneralization': 'Look for specific exceptions that challenge the "always" or "never" narrative.',
  'Mental Filter': 'Make a conscious effort to list positive details you might be overlooking.',
  'Disqualifying the Positive': 'Practice accepting compliments and acknowledging your successes as valid.',
  'Jumping to Conclusions': 'Pause to distinguish between your interpretations and the verifiable facts.',
  'Magnification/Minimization': 'Try the "Time Machine" technique: will this matter in a year? Focus on your strengths.',
  'Emotional Reasoning': 'Remind yourself that "feeling it doesn\'t make it a fact." ',
  'Should Statements': 'Try replacing "should" with "I would prefer" to reduce self-imposed pressure.',
  'Labeling': 'Describe the specific behavior instead of assigning a global label to yourself or others.',
  'Personalization': 'List three other factors that contributed to the situation besides yourself.',
};

const PAGE_SIZE = 10;

export function HistoryView({ moodEntries, cbtLogs, onEditCBT, onDeleteMood, onDeleteCBT }: HistoryViewProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Generate unique months from entries for the filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    [...moodEntries, ...cbtLogs].forEach(entry => {
      months.add(format(entry.timestamp, 'yyyy-MM'));
    });
    return Array.from(months).sort().reverse();
  }, [moodEntries, cbtLogs]);

  // Combine, filter, and sort
  const filteredEntries = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return [
      ...moodEntries.map(e => ({ ...e, type: 'mood' as const })),
      ...cbtLogs.map(l => ({ ...l, type: 'cbt' as const }))
    ]
    .filter(item => {
      // Month Filter
      if (selectedMonth !== 'all') {
        const itemMonth = format(item.timestamp, 'yyyy-MM');
        if (itemMonth !== selectedMonth) return false;
      }

      // Search Query
      if (!query) return true;
      if (item.type === 'mood') {
        return (
          item.note?.toLowerCase().includes(query) ||
          item.trigger?.toLowerCase().includes(query) ||
          item.behavior?.toLowerCase().includes(query) ||
          item.emotions.some(e => e.toLowerCase().includes(query))
        );
      } else {
        return (
          item.situation.toLowerCase().includes(query) ||
          item.automaticThoughts.toLowerCase().includes(query) ||
          item.rationalResponse.toLowerCase().includes(query) ||
          item.distortions.some(d => d.toLowerCase().includes(query))
        );
      }
    })
    .sort((a, b) => b.timestamp - a.timestamp);
  }, [moodEntries, cbtLogs, searchQuery, selectedMonth]);

  const displayedEntries = filteredEntries.slice(0, visibleCount);
  const hasMore = filteredEntries.length > visibleCount;

  // Calculate high-level summary metrics for CBT
  const avgImprovement = cbtLogs.length > 0
    ? cbtLogs.reduce((acc, l) => acc + ((l.moodAfter || l.moodBefore) - l.moodBefore), 0) / cbtLogs.length
    : 0;

  const distortionCounts = cbtLogs.reduce((acc, log) => {
    log.distortions.forEach(d => { acc[d] = (acc[d] || 0) + 1; });
    return acc;
  }, {} as Record<string, number>) || {};

  const topDistortions = Object.entries(distortionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  const getGeneralInsight = () => {
    if (topDistortions.length === 0) return 'Continue journaling to identify your cognitive patterns.';
    const topDistortionName = topDistortions[0][0];
    return DISTORTION_INSIGHTS[topDistortionName] || 'Focus on gathering objective evidence to challenge negative thoughts.';
  };

  const handleDelete = (id: string, type: 'mood' | 'cbt') => {
    if (confirm('Are you sure you want to delete this entry? This action cannot be undone.')) {
      if (type === 'mood' && onDeleteMood) onDeleteMood(id);
      if (type === 'cbt' && onDeleteCBT) onDeleteCBT(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="search"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border-2 border-border focus:border-brand-500 outline-none transition-all shadow-sm text-foreground placeholder:text-muted-foreground font-medium"
            aria-label="Search history"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-6 py-4 rounded-2xl bg-card border-2 border-border focus:border-brand-500 outline-none transition-all shadow-sm text-foreground font-bold appearance-none cursor-pointer hover:bg-secondary min-w-[160px]"
          aria-label="Filter by month"
        >
          <option value="all">All Time</option>
          {availableMonths.map(month => (
            <option key={month} value={month}>
              {format(new Date(month + '-01'), 'MMMM yyyy')}
            </option>
          ))}
        </select>
      </div>

      {/* Journal Summary Section */}
      {!searchQuery && cbtLogs.length > 0 && visibleCount <= PAGE_SIZE && (
        <div className="bg-black rounded-[2.5rem] p-8 text-white shadow-2xl border-b-8 border-slate-900">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-600 rounded-xl shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Journal Summary</h3>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/20 shadow-inner">
                <p className="text-xs font-black text-[#e2e8f0] uppercase tracking-widest mb-1">CBT Efficiency</p>
                <p className="text-2xl font-black text-white">+{avgImprovement.toFixed(1)} <span className="text-xs font-bold text-[#bae6fd] uppercase">relief</span></p>
              </div>
              <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/20 shadow-inner">
                <p className="text-xs font-black text-[#e2e8f0] uppercase tracking-widest mb-1">Key Pattern</p>
                <p className="text-sm font-black text-white truncate mt-1">{topDistortions[0]?.[0] || 'Identifying...'}</p>
              </div>
            </div>
            
            <div className="space-y-3 bg-[#0d0d0d] rounded-2xl p-5 border border-white/10">
              <p className="text-xs font-black text-[#e2e8f0] uppercase tracking-widest">Core Insight & Next Step</p>
              <ul className="space-y-3">
                <li className="flex gap-3 items-start">
                  <Lightbulb className="w-5 h-5 text-amber-300 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-white leading-relaxed font-bold">
                    <span className="text-white font-black text-xs bg-[#333333] px-2 py-0.5 rounded mr-2 uppercase tracking-tighter">Insight</span> 
                    {getGeneralInsight()}
                  </p>
                </li>
                {cbtLogs[0]?.behavioralLink && (
                  <li className="flex gap-3 items-start">
                    <Target className="w-5 h-5 text-green-300 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-white leading-relaxed font-bold">
                      <span className="text-white font-black text-xs bg-[#333333] px-2 py-0.5 rounded mr-2 uppercase tracking-tighter">Action</span> 
                      {cbtLogs[0].behavioralLink}
                    </p>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="space-y-8">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-16 px-6 bg-secondary rounded-3xl border-2 border-dashed border-border shadow-sm">
            <p className="text-muted-foreground font-black uppercase tracking-widest text-sm">No entries found</p>
            <p className="text-foreground mt-2 text-sm font-medium leading-relaxed">
              {searchQuery ? 'Try adjusting your search terms.' : 'Start journaling to see your history here!'}
            </p>
          </div>
        ) : (
          displayedEntries.map((entry) => (
            <div key={`${entry.type}-${entry.id}`} className="card p-0 hover:shadow-xl transition-all border-2 border-border group relative bg-card rounded-[2.5rem] overflow-hidden shadow-sm">
              
              {/* Header Section */}
              <div className="flex justify-between items-start p-6 bg-muted/50 border-b-2 border-border">
                <div className="flex items-center gap-4">
                  {entry.type === 'mood' ? (
                    <div className="p-3 bg-white dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-2xl border-2 border-blue-100 dark:border-transparent shadow-sm">
                      <Smile className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="p-3 bg-white dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-2xl border-2 border-purple-100 dark:border-transparent shadow-sm">
                      <Brain className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-black text-foreground text-xl tracking-tight leading-none mb-1">
                      {entry.type === 'mood' ? 'Mood Check-in' : 'CBT Journal Entry'}
                    </h4>
                    <p className="text-xs text-muted-foreground font-black tracking-widest bg-muted px-2 py-0.5 rounded inline-block uppercase">
                      {format(entry.timestamp, 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "px-4 py-2 rounded-full text-base font-black border-2 shadow-sm",
                    entry.type === 'mood' 
                      ? (entry.rating >= 7 ? "bg-green-100 text-green-900 border-green-300" : entry.rating <= 3 ? "bg-red-100 text-red-900 border-red-300" : "bg-yellow-100 text-yellow-900 border-yellow-300")
                      : "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-transparent"
                  )}>
                    {entry.type === 'mood' 
                      ? entry.rating 
                      : (entry.moodAfter ? `${entry.moodBefore} → ${entry.moodAfter}` : entry.moodBefore)}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {entry.type === 'cbt' && onEditCBT && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          const { type: _type, ...logData } = entry;
                          onEditCBT(logData as CBTLog);
                        }}
                        className="p-2 text-muted-foreground hover:text-brand-700 hover:bg-muted rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none focus-visible:ring-4 focus-visible:ring-brand-500"
                        aria-label="Edit entry"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                    {(onDeleteMood || onDeleteCBT) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(entry.id, entry.type);
                        }}
                        className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none focus-visible:ring-4 focus-visible:ring-red-500"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Section */}
              <div className="p-8">
                {entry.type === 'mood' && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                      {entry.emotions.map(e => (
                        <span key={e} className="text-xs bg-muted text-foreground px-3 py-1.5 rounded-xl font-bold border-2 border-border shadow-sm">
                          {e}
                        </span>
                      ))}
                    </div>
                    {(entry.trigger || entry.behavior) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {entry.trigger && (
                          <div className="flex items-center gap-3 p-4 bg-secondary rounded-[1.5rem] border-2 border-border shadow-sm">
                            <Zap className="w-5 h-5 text-amber-700 dark:text-amber-500 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest text-[#334155] dark:text-[#cbd5e1]">Trigger</p>
                              <p className="text-sm font-black text-foreground leading-tight">{entry.trigger}</p>
                            </div>
                          </div>
                        )}
                        {entry.behavior && (
                          <div className="flex items-center gap-3 p-4 bg-secondary rounded-[1.5rem] border-2 border-border shadow-sm">
                            <Activity className="w-5 h-5 text-brand-700 dark:text-brand-500 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest text-[#334155] dark:text-[#cbd5e1]">Behavior</p>
                              <p className="text-sm font-black text-foreground leading-tight">{entry.behavior}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {entry.note && (
                      <div className="p-5 bg-muted/30 rounded-[1.5rem] border-l-8 border-border italic text-base text-foreground leading-relaxed font-medium shadow-inner">
                        &quot;{entry.note}&quot;
                      </div>
                    )}
                  </div>
                )}

                {entry.type === 'cbt' && (
                  <div className="space-y-6">
                    <div className="bg-secondary/50 rounded-[2rem] p-8 border-2 border-border shadow-inner">
                      <p className="text-xs font-black text-muted-foreground uppercase text-center border-b-2 border-border pb-3 mb-6 tracking-[0.2em]">Synthesis</p>
                      <div className="space-y-8">
                        <div className="flex gap-5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#cbd5e1] dark:bg-[#64748b] mt-2 flex-shrink-0 shadow-sm" />
                          <div className="space-y-2">
                            <p className="font-black text-foreground text-xs tracking-widest uppercase underline underline-offset-8 decoration-[#e2e8f0] decoration-2">Situation</p>
                            <p className="text-base text-foreground leading-relaxed font-black">{entry.situation || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex gap-5">
                          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 dark:bg-purple-400 mt-2 flex-shrink-0 shadow-sm" />
                          <div className="space-y-2">
                            <p className="font-black text-foreground text-xs tracking-widest uppercase underline underline-offset-8 decoration-purple-300 decoration-2">Insight</p>
                            <p className="text-base text-foreground leading-relaxed font-black">
                              {entry.automaticThoughts || 'No automatic thoughts recorded'} 
                              {entry.distortions.length > 0 && (
                                <span className="block mt-2 text-purple-950 dark:text-purple-300 font-black bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded-xl border-2 border-purple-200 dark:border-transparent text-sm w-fit">
                                  {entry.distortions.join(', ')}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-5">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-2 flex-shrink-0 shadow-sm" />
                          <div className="space-y-2">
                            <p className="font-black text-foreground text-xs tracking-widest uppercase underline underline-offset-8 decoration-blue-300 decoration-2">Reframed</p>
                            <p className="text-base text-foreground leading-relaxed font-black italic bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-[1.5rem] border-2 border-blue-100 dark:border-transparent">
                              &quot;{entry.rationalResponse || 'No reframe provided'}&quot;
                            </p>
                          </div>
                        </div>
                        {entry.behavioralLink && (
                          <div className="flex gap-5">
                            <div className="w-2.5 h-2.5 rounded-full bg-green-600 dark:bg-green-400 mt-2 flex-shrink-0 shadow-sm" />
                            <div className="space-y-2">
                              <p className="font-black text-foreground text-xs tracking-widest uppercase underline underline-offset-8 decoration-green-300 decoration-2">Action Plan</p>
                              <p className="text-base text-foreground leading-relaxed font-black text-brand-800 dark:text-brand-400 bg-brand-50/50 dark:bg-transparent p-3 rounded-2xl border-2 border-brand-200 dark:border-transparent shadow-sm">
                                {entry.behavioralLink}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {hasMore && (
          <button
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
            className="w-full py-6 flex items-center justify-center gap-3 bg-card border-2 border-border rounded-[2.5rem] text-foreground font-black uppercase tracking-widest hover:bg-secondary transition-all active:scale-[0.98] shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-brand-500"
          >
            <ChevronDown size={24} />
            Load More History
          </button>
        )}
      </div>
    </div>
  );
}