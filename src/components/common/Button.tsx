import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/util/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover shadow-[0_2px_8px_rgba(0,113,227,0.28)] hover:shadow-[0_4px_14px_rgba(0,113,227,0.4)] active:scale-[0.97]',
  secondary:
    'bg-surface-elevated text-text hover:bg-surface border border-border shadow-xs active:scale-[0.97]',
  ghost: 'text-muted hover:bg-surface-muted hover:text-text active:scale-[0.96]',
  danger:
    'bg-danger-soft text-danger hover:bg-danger hover:text-white shadow-xs active:scale-[0.97]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7.5 px-3 text-[12px] gap-1.5 rounded-lg',
  md: 'h-9 px-4 text-[13px] gap-2 rounded-xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Renders a spinner and blocks interaction. */
  busy?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  busy = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled === true || busy}
      aria-busy={busy || undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-150',
        'disabled:pointer-events-none disabled:scale-100 disabled:opacity-40',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {busy ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: Variant;
  size?: number;
  active?: boolean;
}

/**
 * Icon-only button with Apple haptic-like active scale.
 */
export function IconButton({
  label,
  variant = 'ghost',
  size = 28,
  active = false,
  className,
  children,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      style={{ width: size, height: size }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-all duration-150',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANTS[variant],
        active && 'bg-accent-soft text-accent-text border-accent/20 border',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 animate-spin rounded-full border-[2px] border-current border-t-transparent"
    />
  );
}
