import { IconButton } from '@/components/common/Button';
import {
  ChevronDownIcon,
  FileDownIcon,
  KeyboardIcon,
  LogoIcon,
  SettingsIcon,
} from '@/components/common/Icons';
import { UsageMeter } from '@/components/popup/UsageMeter';
import { i18n } from '#i18n';

export interface HeaderProps {
  activeCount: number;
  limit: number | null;
  isPaid: boolean;
  view: 'notes' | 'settings';
  onUpgrade: () => void;
  onToggleView: () => void;
  onOpenShortcuts?: () => void;
  onExportNotes?: () => void;
}

export function Header({
  activeCount,
  limit,
  isPaid,
  view,
  onUpgrade,
  onToggleView,
  onOpenShortcuts,
  onExportNotes,
}: HeaderProps) {
  const showSettings = view === 'settings';

  return (
    <header className="apple-glass sticky top-0 z-20 flex items-center justify-between gap-2 border-b px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <div className="from-accent/20 relative flex size-7 items-center justify-center rounded-lg border border-white/40 bg-gradient-to-br to-purple-500/20 shadow-xs dark:border-white/10">
          <LogoIcon size={17} className="text-accent" />
        </div>
        <h1 className="text-text truncate text-[13.5px] font-semibold tracking-tight">
          {i18n.t('extName')}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <UsageMeter activeCount={activeCount} limit={limit} isPaid={isPaid} onUpgrade={onUpgrade} />

        {onExportNotes !== undefined && view === 'notes' ? (
          <IconButton label={i18n.t('exportMarkdown')} size={28} onClick={onExportNotes}>
            <FileDownIcon size={14} />
          </IconButton>
        ) : null}

        {onOpenShortcuts !== undefined && view === 'notes' ? (
          <IconButton label={i18n.t('shortcutsTitle')} size={28} onClick={onOpenShortcuts}>
            <KeyboardIcon size={14} />
          </IconButton>
        ) : null}

        <IconButton
          label={i18n.t('settings')}
          size={28}
          active={showSettings}
          aria-expanded={showSettings}
          onClick={onToggleView}
        >
          {showSettings ? <ChevronDownIcon size={15} /> : <SettingsIcon size={15} />}
        </IconButton>
      </div>
    </header>
  );
}
