import { useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { ActionPlanSuggestion } from '@/types';
import { cn } from '@/lib/utils';

interface ActionPlanPickerProps {
  actionPlans: ActionPlanSuggestion[];
  acceptedActionPlanId: string | null;
  onAccept: (plan: ActionPlanSuggestion, actionText: string) => void;
  onEdit: (plan: ActionPlanSuggestion, actionText: string) => void;
}

function getActionPlanId(plan: ActionPlanSuggestion, index: number) {
  return plan.id ?? `action-plan-${index + 1}`;
}

function actionPlanText(plan: ActionPlanSuggestion) {
  return plan.steps.join('\n');
}

export function ActionPlanPicker({
  actionPlans,
  acceptedActionPlanId,
  onAccept,
  onEdit,
}: ActionPlanPickerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');

  if (actionPlans.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-label="AI action plan suggestions">
      <p className="text-[10px] font-black uppercase tracking-wider text-brand-700 dark:text-brand-300">
        AI Action Plan Suggestions
      </p>
      <div className="grid gap-3">
        {actionPlans.map((plan, index) => {
          const planId = getActionPlanId(plan, index);
          const isAccepted = acceptedActionPlanId === planId;
          const isEditing = editingId === planId;

          return (
            <article
              key={planId}
              className={cn(
                'space-y-4 rounded-2xl border-2 p-4 shadow-sm',
                isAccepted
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
                  : 'border-border bg-secondary/60 dark:bg-slate-900/30'
              )}
            >
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <h4 className="break-words text-sm font-black uppercase tracking-wide text-foreground">
                    {plan.title}
                  </h4>
                  {plan.timeframe && (
                    <span className="w-fit rounded-full border border-border bg-card px-2 py-1 text-[10px] font-black uppercase text-muted-foreground">
                      {plan.timeframe}
                    </span>
                  )}
                </div>
                {plan.rationale && (
                  <p className="break-words text-sm font-bold leading-relaxed text-muted-foreground">
                    {plan.rationale}
                  </p>
                )}
                <ul className="space-y-2">
                  {plan.steps.map(step => (
                    <li key={step} className="break-words text-sm font-bold leading-relaxed text-foreground">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {isEditing && (
                <div className="space-y-3">
                  <textarea
                    aria-label={`Edit ${plan.title} action plan`}
                    className="min-h-28 w-full rounded-2xl border-2 border-border bg-card p-3 text-sm font-bold text-foreground outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
                    value={draftText}
                    onChange={event => setDraftText(event.target.value)}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="min-h-11 flex-1 rounded-xl bg-slate-800 px-4 py-3 text-sm font-black uppercase tracking-wide text-white"
                      aria-label={`Save ${plan.title} action plan edit`}
                      onClick={() => {
                        onEdit({ ...plan, id: planId }, draftText);
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3 text-sm font-black uppercase tracking-wide text-white"
                    aria-label={`Accept ${plan.title} action plan`}
                    onClick={() => onAccept({ ...plan, id: planId }, actionPlanText(plan))}
                  >
                    <Check size={16} aria-hidden="true" />
                    Accept
                  </button>
                  <button
                    type="button"
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-3 text-sm font-black uppercase tracking-wide text-foreground"
                    aria-label={`Edit ${plan.title} action plan`}
                    onClick={() => {
                      setEditingId(planId);
                      setDraftText(actionPlanText(plan));
                    }}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    Edit
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
