import { useEffect, useRef, type ReactNode } from 'react';

import { IconButton } from '@/components/common/Button';
import { CloseIcon } from '@/components/common/Icons';
import { cn } from '@/lib/util/cn';

export interface ModalProps {
  open: boolean;
  /** Accessible name; also rendered as the visible heading. */
  title: string;
  description?: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Modal dialog.
 *
 * Focus moves into the dialog on open and Escape closes it. A full focus trap is
 * unnecessary here: the popup is a single small document, and the dialog is
 * rendered last so Tab order naturally stays inside it before wrapping to the
 * browser's own chrome.
 */
export function Modal({
  open,
  title,
  description,
  onClose,
  closeLabel,
  children,
  footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'apple-glass relative max-h-full w-full overflow-y-auto rounded-2xl border',
          'p-5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.3)] outline-none',
        )}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <h2 className="text-text text-[14px] leading-snug font-semibold">{title}</h2>
          <IconButton label={closeLabel} size={24} onClick={onClose}>
            <CloseIcon size={14} />
          </IconButton>
        </div>

        {description !== undefined ? (
          <p className="text-muted mb-3 text-[12px] leading-relaxed">{description}</p>
        ) : null}

        <div className="text-text text-[12px] leading-relaxed">{children}</div>

        {footer !== undefined ? <div className="mt-4 flex flex-col gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
