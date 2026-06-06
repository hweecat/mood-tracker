import { ReactNode } from 'react';

interface CBTStepShellProps {
  title: string;
  step: number;
  totalSteps: number;
  headerActions?: ReactNode;
  children: ReactNode;
  actions: ReactNode;
}

export function CBTStepShell({
  title,
  step,
  totalSteps,
  headerActions,
  children,
  actions,
}: CBTStepShellProps) {
  return (
    <section className="w-full overflow-hidden rounded-2xl border-2 border-border bg-card text-card-foreground shadow-xl sm:rounded-3xl">
      <div className="flex flex-col gap-4 border-b-2 border-border bg-[#f8fafc] p-4 dark:bg-[#1e293b] sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <h2 className="min-w-0 text-xl font-black uppercase text-foreground sm:text-2xl">
          {title}
        </h2>
        <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
          {headerActions}
          <span className="shrink-0 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs font-black uppercase text-foreground shadow-sm">
            Step {step} / {totalSteps}
          </span>
        </div>
      </div>

      <div className="space-y-6 px-4 pt-4 sm:px-6 sm:pt-5">
        <div
          className="h-3 w-full overflow-hidden rounded-full border-2 border-border bg-secondary p-0.5 shadow-inner"
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-brand-700 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(2,132,199,0.6)]"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>

        <div className="min-h-[360px] pb-2 sm:min-h-[400px]">{children}</div>

        <div
          role="group"
          aria-label="CBT step actions"
          className="sticky bottom-0 z-20 -mx-4 border-t-2 border-border bg-card/95 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-6 sm:p-4"
        >
          <div className="flex flex-col-reverse gap-3 sm:flex-row">{actions}</div>
        </div>
      </div>
    </section>
  );
}
