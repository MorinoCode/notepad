import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'danger';
  action?: ToastAction;
}

export interface ToastInput {
  message: string;
  tone?: 'info' | 'danger';
  action?: ToastAction;
  durationMs?: number;
}

export interface ToastsController {
  toasts: Toast[];
  push: (input: ToastInput) => number;
  dismiss: (id: number) => void;
}

/** Long enough to notice and undo a delete, short enough not to linger. */
const DEFAULT_TOAST_DURATION_MS = 5000;

/**
 * A tiny toast queue.
 *
 * Its real job is the undo affordance: deleting a note shows a toast with an
 * Undo button, which is a better experience than a confirmation dialog and
 * removes the risk of a mis-click destroying data.
 */
export function useToasts(): ToastsController {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  // Clear pending timers on unmount so a closed popup cannot fire a stale update.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) window.clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      const id = nextId.current;
      nextId.current += 1;

      setToasts((current) => [
        ...current,
        {
          id,
          message: input.message,
          tone: input.tone ?? 'info',
          ...(input.action ? { action: input.action } : {}),
        },
      ]);

      timers.current.set(
        id,
        window.setTimeout(() => dismiss(id), input.durationMs ?? DEFAULT_TOAST_DURATION_MS),
      );
      return id;
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}
