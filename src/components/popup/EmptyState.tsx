import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  body: string;
  icon?: ReactNode;
}

export function EmptyState({ title, body, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon !== undefined ? (
        <div className="from-accent/15 text-accent mb-1 flex size-12 items-center justify-center rounded-2xl border border-white/50 bg-gradient-to-br to-purple-500/10 shadow-xs backdrop-blur-md dark:border-white/10">
          {icon}
        </div>
      ) : null}
      <p className="text-text text-[13.5px] font-semibold tracking-tight">{title}</p>
      <p className="text-muted/80 max-w-[17rem] text-[12px] leading-relaxed">{body}</p>
    </div>
  );
}
