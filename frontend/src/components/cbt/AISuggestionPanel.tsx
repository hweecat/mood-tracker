import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { RationalReframe } from '@/types';
import { cn } from '@/lib/utils';

interface AISuggestionPanelProps {
  reframes: RationalReframe[];
  acceptedReframeId: string | null;
  dismissedReframeIds: string[];
  onAccept: (reframe: RationalReframe) => void;
  onEdit: (reframe: RationalReframe) => void;
  onDismiss: (reframeId: string) => void;
}

function getReframeId(reframe: RationalReframe, index: number) {
  return reframe.id ?? `reframe-${index + 1}`;
}

export function AISuggestionPanel({
  reframes,
  acceptedReframeId,
  dismissedReframeIds,
  onAccept,
  onEdit,
  onDismiss,
}: AISuggestionPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');

  const visibleReframes = reframes.filter((reframe, index) => {
    return !dismissedReframeIds.includes(getReframeId(reframe, index));
  });

  if (visibleReframes.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-label="AI suggested reframes">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
        AI Suggested Reframes
      </p>
      <div className="grid gap-3">
        {visibleReframes.map((reframe, index) => {
          const reframeId = getReframeId(reframe, index);
          const isAccepted = acceptedReframeId === reframeId;
          const isEditing = editingId === reframeId;

          return (
            <article
              key={reframeId}
              className={cn(
                'space-y-4 rounded-2xl border-2 p-4 shadow-sm',
                isAccepted
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
                  : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10'
              )}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    {reframe.perspective}
                  </h4>
                  {isAccepted && (
                    <span className="rounded-full bg-brand-700 px-2 py-1 text-[10px] font-black uppercase text-white">
                      Accepted
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap break-words text-sm font-bold leading-relaxed text-foreground">
                  {reframe.content}
                </p>
              </div>

              {isEditing && (
                <div className="space-y-3">
                  <textarea
                    aria-label={`Edit ${reframe.perspective} reframe`}
                    className="min-h-28 w-full rounded-2xl border-2 border-border bg-card p-3 text-sm font-bold text-foreground outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
                    value={draftContent}
                    onChange={event => setDraftContent(event.target.value)}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="min-h-11 flex-1 rounded-xl bg-slate-800 px-4 py-3 text-sm font-black uppercase tracking-wide text-white"
                      aria-label={`Save ${reframe.perspective} reframe edit`}
                      onClick={() => {
                        onEdit({ ...reframe, id: reframeId, content: draftContent });
                        setEditingId(null);
                      }}
                    >
                      Save Edit
                    </button>
                    <button
                      type="button"
                      className="min-h-11 flex-1 rounded-xl border-2 border-border bg-card px-4 py-3 text-sm font-black uppercase tracking-wide text-foreground"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!isEditing && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3 text-sm font-black uppercase tracking-wide text-white"
                    aria-label={`Accept ${reframe.perspective} reframe`}
                    onClick={() => onAccept({ ...reframe, id: reframeId })}
                  >
                    <Check size={16} aria-hidden="true" />
                    Accept
                  </button>
                  <button
                    type="button"
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-amber-300 bg-card px-3 py-3 text-sm font-black uppercase tracking-wide text-amber-900 dark:border-amber-700 dark:text-amber-300"
                    aria-label={`Edit ${reframe.perspective} reframe`}
                    onClick={() => {
                      setEditingId(reframeId);
                      setDraftContent(reframe.content);
                    }}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-3 text-sm font-black uppercase tracking-wide text-muted-foreground"
                    aria-label={`Dismiss ${reframe.perspective} reframe`}
                    onClick={() => onDismiss(reframeId)}
                  >
                    <X size={16} aria-hidden="true" />
                    Dismiss
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
