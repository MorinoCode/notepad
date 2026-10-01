import { Modal } from '@/components/common/Modal';
import { i18n } from '#i18n';

export interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const shortcuts = [
    { keys: ['Enter'], desc: i18n.t('shortcutAddNote') },
    { keys: ['Shift', 'Enter'], desc: i18n.t('shortcutNewLine') },
    { keys: ['Ctrl / ⌘', 'Shift', 'Y'], desc: i18n.t('shortcutOpenPopup') },
    { keys: ['Ctrl / ⌘', 'Enter'], desc: i18n.t('shortcutSaveEdit') },
    { keys: ['Esc'], desc: i18n.t('shortcutEscape') },
  ];

  return (
    <Modal
      open={open}
      title={i18n.t('shortcutsTitle')}
      description={i18n.t('shortcutsDesc')}
      closeLabel={i18n.t('close')}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2 pt-1">
        {shortcuts.map((item, index) => (
          <div
            key={index}
            className="bg-surface-muted/60 flex items-center justify-between gap-3 rounded-xl border border-white/40 px-3 py-2 text-[12px] dark:border-white/5"
          >
            <span className="text-muted font-medium">{item.desc}</span>
            <div className="flex shrink-0 items-center gap-1">
              {item.keys.map((k, i) => (
                <kbd
                  key={i}
                  className="border-border-strong bg-surface text-text rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold shadow-xs"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
