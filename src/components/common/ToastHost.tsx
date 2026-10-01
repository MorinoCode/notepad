import type { ToastsController } from '@/hooks/useToasts';
import { cn } from '@/lib/util/cn';

export interface ToastHostProps {
  toasts: ToastsController['toasts'];
  onDismiss: (id: number) => void;
}

/** Bottom-anchored stack, overlaying the list so it never shifts the layout. */
export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex flex-col items-center gap-1.5 p-3"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-full border px-4 py-2 text-[12.5px] font-medium shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition-all duration-200',
            toast.tone === 'danger'
              ? 'border-danger/30 bg-danger/90 text-white'
              : 'bg-text/90 text-bg border-white/20',
          )}
        >
          <span className="flex-1 truncate">{toast.message}</span>
          {toast.action !== undefined ? (
            <button
              type="button"
              className="text-accent shrink-0 rounded-full px-2.5 py-0.5 font-semibold transition-transform hover:opacity-90 active:scale-95"
              onClick={() => {
                toast.action?.onAction();
                onDismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
