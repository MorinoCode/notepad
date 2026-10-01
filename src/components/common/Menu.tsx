import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { IconButton } from '@/components/common/Button';
import { cn } from '@/lib/util/cn';

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  /** Renders a check mark, used for the currently active status. */
  selected?: boolean;
  divider?: boolean;
  onSelect: () => void;
}

export interface MenuProps {
  /** Accessible name for the trigger button. */
  label: string;
  icon: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  triggerSize?: 20 | 24 | 28 | 32;
}

/**
 * Dropdown menu with the keyboard behaviour users expect from a native menu:
 * arrows move, Home/End jump, Escape closes and returns focus to the trigger.
 */
export function Menu({ label, icon, items, align = 'end', triggerSize = 28 }: MenuProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) containerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, []);

  // Close on an outside pointer press. `pointerdown` fires before focus moves,
  // so the menu never lingers on screen behind the newly focused element.
  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node) === true) return;
      close(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, close]);

  //
  // Opening lands on the selected item when there is one, otherwise the first.
  // Choosing it here rather than in an effect avoids a second render pass just
  // to move the highlight.
  //
  const openMenu = useCallback(() => {
    const selected = items.findIndex((item) => item.selected === true);
    setActiveIndex(selected === -1 ? 0 : selected);
    setOpen(true);
  }, [items]);

  // Move real DOM focus with the active index so screen readers follow along.
  useEffect(() => {
    if (!open) return;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    buttons?.[activeIndex]?.focus();
  }, [open, activeIndex]);

  return (
    <div ref={containerRef} className="relative">
      <IconButton
        label={label}
        size={triggerSize}
        active={open}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openMenu())}
      >
        {icon}
      </IconButton>

      {open ? (
        <div
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            'apple-glass absolute z-20 mt-1.5 min-w-48 rounded-xl p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.16)]',
            align === 'end' ? 'right-0' : 'left-0',
          )}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const delta = event.key === 'ArrowDown' ? 1 : -1;
              setActiveIndex((current) => (current + delta + items.length) % items.length);
            } else if (event.key === 'Home') {
              event.preventDefault();
              setActiveIndex(0);
            } else if (event.key === 'End') {
              event.preventDefault();
              setActiveIndex(items.length - 1);
            } else if (event.key === 'Escape' || event.key === 'Tab') {
              if (event.key === 'Escape') event.preventDefault();
              close(event.key === 'Escape');
            }
          }}
        >
          {items.map((item, index) => (
            <div key={item.id} className="contents">
              {item.divider ? (
                <div className="my-1 border-t border-black/5 dark:border-white/5" />
              ) : null}
              <button
                type="button"
                role="menuitem"
                tabIndex={index === activeIndex ? 0 : -1}
                aria-checked={item.selected === true ? true : undefined}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-all duration-150',
                  item.danger
                    ? 'text-danger hover:bg-danger-soft active:scale-[0.98]'
                    : 'text-text hover:bg-accent/10 hover:text-accent-text active:scale-[0.98]',
                )}
                onClick={() => {
                  item.onSelect();
                  close(true);
                }}
              >
                {item.icon !== undefined ? (
                  <span className="grid size-4 shrink-0 place-items-center opacity-85">
                    {item.icon}
                  </span>
                ) : null}
                <span className="flex-1 truncate">{item.label}</span>
                {item.selected === true ? (
                  <span aria-hidden="true" className="text-accent text-[11px] font-bold">
                    ✓
                  </span>
                ) : null}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
