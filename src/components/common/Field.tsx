import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/util/cn';

export interface FieldGroupProps {
  title: string;
  hint?: string;
  children: ReactNode;
}

export function FieldGroup({ title, hint, children }: FieldGroupProps) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-muted/80 pl-1 text-[11px] font-semibold tracking-wider uppercase">
          {title}
        </h3>
        {hint !== undefined ? <p className="text-muted mt-0.5 pl-1 text-[11px]">{hint}</p> : null}
      </div>
      <div className="apple-card flex flex-col divide-y divide-black/5 overflow-hidden rounded-2xl border border-white/60 shadow-xs dark:divide-white/5 dark:border-white/10">
        {children}
      </div>
    </section>
  );
}

export interface FieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  children?: ReactNode;
}

export function Field({ label, hint, htmlFor, children }: FieldProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <div className="min-w-0">
        <label
          htmlFor={htmlFor}
          className="text-text block text-[12.5px] font-medium tracking-tight"
        >
          {label}
        </label>
        {hint !== undefined ? (
          <p className="text-muted/80 mt-0.5 text-[11px] leading-snug">{hint}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (next: T) => void;
}

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="apple-input border-border/80 bg-surface-muted/80 text-text focus:border-accent h-7.5 cursor-pointer rounded-lg border px-2.5 text-[12px] font-medium outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );
}

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

/**
 * Apple iOS-style switch toggle.
 */
export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative h-5.5 w-10 rounded-full transition-colors duration-200',
          'peer-focus-visible:outline-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
          checked ? 'bg-accent shadow-xs' : 'bg-black/15 dark:bg-white/20',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-4.5 rounded-full bg-white shadow-sm transition-all duration-200',
            checked ? 'left-5' : 'left-0.5',
          )}
        />
      </span>
    </label>
  );
}
