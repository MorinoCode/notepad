import { useEffect, useMemo, useRef } from 'react';

import { Button } from '@/components/common/Button';
import {
  BoldIcon,
  CodeIcon,
  LinkIcon,
  ListBulletIcon,
  ListCheckIcon,
  PlusIcon,
} from '@/components/common/Icons';
import { ReminderPicker } from '@/components/popup/ReminderPicker';
import { i18n } from '#i18n';

export interface NoteComposerProps {
  body: string;
  onBodyChange: (next: string) => void;
  remindAt: number | null;
  onRemindAtChange: (next: number | null) => void;
  onSubmit: () => void;
  busy: boolean;
  locale: string;
}

const MAX_TEXTAREA_HEIGHT = 140;

/**
 * Apple-style quick capture composer.
 * Features live word/char counters, autofocus, quick formatting micro-toolbar,
 * active tab clipping, and liquid glass styling.
 */
export function NoteComposer({
  body,
  onBodyChange,
  remindAt,
  onRemindAtChange,
  onSubmit,
  busy,
  locale,
}: NoteComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea === null) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [body]);

  const canSubmit = body.trim().length > 0 && !busy;

  const words = useMemo(() => {
    const trimmed = body.trim();
    return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
  }, [body]);
  const chars = body.length;

  function insertFormatting(prefix: string, suffix = '') {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end);

    const replacement = `${prefix}${selected}${suffix}`;
    const nextBody = body.slice(0, start) + replacement + body.slice(end);
    onBodyChange(nextBody);

    requestAnimationFrame(() => {
      textarea.focus();
      const newCursor = selected.length > 0 ? start + replacement.length : start + prefix.length;
      textarea.setSelectionRange(newCursor, newCursor);
    });
  }

  function handleInsertChecklist() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end);

    if (selected.includes('\n')) {
      const lines = selected
        .split('\n')
        .map((l) => (l.startsWith('- [ ] ') ? l : `- [ ] ${l}`))
        .join('\n');
      const next = body.slice(0, start) + lines + body.slice(end);
      onBodyChange(next);
    } else if (selected.length > 0) {
      const next = body.slice(0, start) + `- [ ] ${selected}` + body.slice(end);
      onBodyChange(next);
    } else {
      const needsNewLine = start > 0 && body[start - 1] !== '\n';
      const prefix = needsNewLine ? '\n- [ ] ' : '- [ ] ';
      const next = body.slice(0, start) + prefix + body.slice(end);
      onBodyChange(next);
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + prefix.length;
        textarea.setSelectionRange(pos, pos);
      });
    }
  }

  function handleInsertBullet() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.slice(start, end);

    if (selected.includes('\n')) {
      const lines = selected
        .split('\n')
        .map((l) => (l.startsWith('- ') ? l : `- ${l}`))
        .join('\n');
      const next = body.slice(0, start) + lines + body.slice(end);
      onBodyChange(next);
    } else if (selected.length > 0) {
      const next = body.slice(0, start) + `- ${selected}` + body.slice(end);
      onBodyChange(next);
    } else {
      const needsNewLine = start > 0 && body[start - 1] !== '\n';
      const prefix = needsNewLine ? '\n- ' : '- ';
      const next = body.slice(0, start) + prefix + body.slice(end);
      onBodyChange(next);
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + prefix.length;
        textarea.setSelectionRange(pos, pos);
      });
    }
  }

  async function handleClipTab() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) return;
      const title = (tab.title || 'Link').trim().replace(/[[\]]/g, '');
      const linkMarkdown = `[${title}](${tab.url})`;
      const textarea = textareaRef.current;
      if (!textarea) {
        onBodyChange(body ? `${body}\n${linkMarkdown}` : linkMarkdown);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const needsSpace = start > 0 && body[start - 1] !== '\n' && body[start - 1] !== ' ';
      const insert = (needsSpace ? ' ' : '') + linkMarkdown;
      const next = body.slice(0, start) + insert + body.slice(end);
      onBodyChange(next);
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + insert.length;
        textarea.setSelectionRange(pos, pos);
      });
    } catch {
      // Ignore if tab query is blocked
    }
  }

  return (
    <form
      className="apple-card focus-within:border-accent/60 flex flex-col gap-2 rounded-2xl border border-white/60 p-3 transition-all duration-200 focus-within:shadow-[0_0_0_3px_rgba(0,113,227,0.18)] dark:border-white/10"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(event) => onBodyChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (canSubmit) onSubmit();
            return;
          }

          if (event.key === 'Enter' && event.shiftKey) {
            const textarea = textareaRef.current;
            if (textarea) {
              const start = textarea.selectionStart;
              const lineStart = body.lastIndexOf('\n', start - 1) + 1;
              const currentLine = body.slice(lineStart, start);

              // Empty checklist item -> clear the item prefix
              if (/^-\s\[[ x]\]\s*$/.test(currentLine)) {
                event.preventDefault();
                const next = body.slice(0, lineStart) + body.slice(start);
                onBodyChange(next);
                requestAnimationFrame(() => {
                  textarea.setSelectionRange(lineStart, lineStart);
                });
                return;
              }

              // Checklist item with text -> continue checklist
              if (/^-\s\[[ x]\]\s.+/.test(currentLine)) {
                event.preventDefault();
                const prefix = '\n- [ ] ';
                const next = body.slice(0, start) + prefix + body.slice(start);
                onBodyChange(next);
                requestAnimationFrame(() => {
                  const pos = start + prefix.length;
                  textarea.setSelectionRange(pos, pos);
                });
                return;
              }

              // Empty bullet item -> clear bullet
              if (/^-\s*$/.test(currentLine)) {
                event.preventDefault();
                const next = body.slice(0, lineStart) + body.slice(start);
                onBodyChange(next);
                requestAnimationFrame(() => {
                  textarea.setSelectionRange(lineStart, lineStart);
                });
                return;
              }

              // Bullet item with text -> continue bullet
              if (/^-\s.+/.test(currentLine)) {
                event.preventDefault();
                const prefix = '\n- ';
                const next = body.slice(0, start) + prefix + body.slice(start);
                onBodyChange(next);
                requestAnimationFrame(() => {
                  const pos = start + prefix.length;
                  textarea.setSelectionRange(pos, pos);
                });
                return;
              }
            }
          }
        }}
        rows={2}
        placeholder={i18n.t('composerPlaceholder')}
        aria-label={i18n.t('composerPlaceholder')}
        className="qn-scroll text-text placeholder:text-muted/70 w-full resize-none bg-transparent text-[13px] leading-relaxed focus:outline-none"
      />

      {/* Formatting Micro-Toolbar & Counter */}
      <div className="text-muted/70 flex items-center justify-between gap-1">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            title={i18n.t('composerClipTab')}
            aria-label={i18n.t('composerClipTab')}
            onClick={handleClipTab}
            className="hover:text-text rounded-md p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <LinkIcon size={13} />
          </button>
          <button
            type="button"
            title={i18n.t('composerChecklist')}
            aria-label={i18n.t('composerChecklist')}
            onClick={handleInsertChecklist}
            className="hover:text-text rounded-md p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ListCheckIcon size={13} />
          </button>
          <button
            type="button"
            title={i18n.t('composerBullet')}
            aria-label={i18n.t('composerBullet')}
            onClick={handleInsertBullet}
            className="hover:text-text rounded-md p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ListBulletIcon size={13} />
          </button>
          <button
            type="button"
            title={i18n.t('composerBold')}
            aria-label={i18n.t('composerBold')}
            onClick={() => insertFormatting('**', '**')}
            className="hover:text-text rounded-md p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <BoldIcon size={13} />
          </button>
          <button
            type="button"
            title={i18n.t('composerCode')}
            aria-label={i18n.t('composerCode')}
            onClick={() => insertFormatting('`', '`')}
            className="hover:text-text rounded-md p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <CodeIcon size={13} />
          </button>
        </div>

        {chars > 0 ? (
          <span className="text-muted/80 bg-surface-muted/60 rounded-full border border-black/5 px-2 py-0.5 text-[10px] font-medium tabular-nums dark:border-white/5">
            {words === 1
              ? i18n.t('counterWord', [String(words), String(chars)])
              : i18n.t('counterWords', [String(words), String(chars)])}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-1.5 dark:border-white/5">
        <ReminderPicker value={remindAt} onChange={onRemindAtChange} locale={locale} />

        <Button
          type="submit"
          variant="primary"
          size="sm"
          busy={busy}
          disabled={!canSubmit}
          icon={<PlusIcon size={14} />}
        >
          {i18n.t('composerAdd')}
        </Button>
      </div>
    </form>
  );
}
