import { useRef } from 'react';

import { IconButton } from '@/components/common/Button';
import { CloseIcon, SearchIcon } from '@/components/common/Icons';
import { i18n } from '#i18n';

export interface SearchBarProps {
  value: string;
  onChange: (next: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative flex w-full items-center">
      <SearchIcon size={14} className="text-muted/70 pointer-events-none absolute left-3" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value.length > 0) {
            event.stopPropagation();
            onChange('');
          }
        }}
        placeholder={i18n.t('searchPlaceholder')}
        aria-label={i18n.t('searchPlaceholder')}
        className="apple-input placeholder:text-muted/65 focus:border-accent/60 h-8 w-full rounded-full border border-white/50 pr-8 pl-8.5 text-[12.5px] focus:shadow-[0_0_0_3px_rgba(0,113,227,0.15)] focus:outline-none dark:border-white/10"
      />
      {value.length > 0 ? (
        <div className="absolute right-1.5">
          <IconButton
            label={i18n.t('searchClear')}
            size={22}
            className="text-muted hover:text-text"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
          >
            <CloseIcon size={12} />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}
