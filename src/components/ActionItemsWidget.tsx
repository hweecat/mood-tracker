'use client';

import { CBTLog } from '@/types';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface ActionItemsWidgetProps {
  cbtLogs: CBTLog[];
  onToggleStatus: (log: CBTLog) => void;
}

export function ActionItemsWidget({ cbtLogs, onToggleStatus }: ActionItemsWidgetProps) {
  // Filter logs that have an actionable plan
  const actionItems = cbtLogs
    .filter(log => log.behavioralLink && log.behavioralLink.trim().length > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5); // Show only recent 5

  const pendingCount = actionItems.filter(i => i.actionPlanStatus !== 'completed').length;

  if (actionItems.length === 0) return null;

  return (
    <div className="bg-card dark:bg-card rounded-[2.5rem] p-6 border-2 border-border shadow-sm">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
          Action Plan
          {pendingCount > 0 && (
            <Badge variant="default" className="text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              {pendingCount} Pending
            </Badge>
          )}
        </h3>
      </div>

      <div className="space-y-3">
        {actionItems.map(log => {
          const isCompleted = log.actionPlanStatus === 'completed';
          return (
            <div 
              key={log.id}
              className={cn(
                "group flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                isCompleted 
                  ? "bg-secondary border-transparent" 
                  : "bg-card border-border hover:border-brand-500 shadow-sm"
              )}
              onClick={() => onToggleStatus(log)}
            >
              <button 
                aria-label={isCompleted ? "Mark as pending" : "Mark as completed"}
                className={cn(
                  "mt-1 flex-shrink-0 transition-colors",
                  isCompleted ? "text-green-500" : "text-muted-foreground group-hover:text-brand-500"
                )}
              >
                {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-bold leading-snug transition-all",
                  isCompleted ? "text-muted-foreground line-through" : "text-card-foreground"
                )}>
                  {log.behavioralLink}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    From {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                  {/* Optional: Add a link to view the full entry context */}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
