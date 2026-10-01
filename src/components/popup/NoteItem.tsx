import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button, IconButton } from '@/components/common/Button';
import {
  BellIcon,
  CheckIcon,
  CopyIcon,
  MoreIcon,
  PencilIcon,
  PinIcon,
  TrashIcon,
} from '@/components/common/Icons';
import { Menu, type MenuItem } from '@/components/common/Menu';
import { REOPEN_STATUS, StatusIcon, statusLabelKey } from '@/components/popup/statusMeta';
import { i18n } from '#i18n';
import {
  NOTE_COLORS,
  NOTE_STATUSES,
  type Note,
  type NoteColor,
  type NoteStatus,
} from '@/lib/notes/types';
import { toPreview } from '@/lib/notes/text';
import { describeReminder, formatRelative, isOverdue } from '@/lib/reminders/time';
import { cn } from '@/lib/util/cn';

export interface NoteItemProps {
  note: Note;
  locale: string;
  now: number;
  highlighted: boolean;
  onStatusChange: (status: NoteStatus) => void;
  onTogglePin: () => void;
  onColorChange?: (color: NoteColor) => void;
  onDuplicate?: () => void;
  onTagClick?: (tag: string) => void;
  onSave: (body: string) => void;
  onDelete: () => void;
}

const NOTE_COLOR_STYLES: Record<NoteColor, { border: string; bg: string }> = {
  default: {
    border: 'border-white/50 dark:border-white/10',
    bg: '',
  },
  amber: {
    border: 'border-amber-500/35 dark:border-amber-500/25',
    bg: 'bg-gradient-to-br from-amber-500/10 via-amber-500/[0.03] to-transparent',
  },
  emerald: {
    border: 'border-emerald-500/35 dark:border-emerald-500/25',
    bg: 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.03] to-transparent',
  },
  blue: {
    border: 'border-blue-500/35 dark:border-blue-500/25',
    bg: 'bg-gradient-to-br from-blue-500/10 via-blue-500/[0.03] to-transparent',
  },
  purple: {
    border: 'border-purple-500/35 dark:border-purple-500/25',
    bg: 'bg-gradient-to-br from-purple-500/10 via-purple-500/[0.03] to-transparent',
  },
  rose: {
    border: 'border-rose-500/35 dark:border-rose-500/25',
    bg: 'bg-gradient-to-br from-rose-500/10 via-rose-500/[0.03] to-transparent',
  },
};

function colorLabelKey(
  color: NoteColor,
): 'colorDefault' | 'colorAmber' | 'colorEmerald' | 'colorBlue' | 'colorPurple' | 'colorRose' {
  switch (color) {
    case 'amber':
      return 'colorAmber';
    case 'emerald':
      return 'colorEmerald';
    case 'blue':
      return 'colorBlue';
    case 'purple':
      return 'colorPurple';
    case 'rose':
      return 'colorRose';
    case 'default':
    default:
      return 'colorDefault';
  }
}

function colorDotClass(color: NoteColor): string {
  switch (color) {
    case 'amber':
      return 'bg-amber-500 border-amber-600/30';
    case 'emerald':
      return 'bg-emerald-500 border-emerald-600/30';
    case 'blue':
      return 'bg-blue-500 border-blue-600/30';
    case 'purple':
      return 'bg-purple-500 border-purple-600/30';
    case 'rose':
      return 'bg-rose-500 border-rose-600/30';
    case 'default':
    default:
      return 'bg-muted/40 border-black/10 dark:border-white/10';
  }
}

/**
 * Parses simple inline markdown: **bold**, `code`, URLs, and #hashtags, returning React nodes.
 */
function renderInlineFormatting(text: string, onTagClick?: (tag: string) => void): ReactNode {
  const parts: ReactNode[] = [];
  // Match **bold**, `code`, URLs, or #hashtags (with international/Persian Unicode support)
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s<]+|(?:^|\s)#([a-zA-Z0-9_\u0600-\u06FF]+))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="text-text font-semibold">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="text-accent-text rounded-sm bg-black/5 px-1 py-0.5 font-mono text-[11px] dark:bg-white/10"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('http://') || token.startsWith('https://')) {
      parts.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="text-accent hover:text-accent-hover font-medium break-all underline underline-offset-2"
        >
          {token}
        </a>,
      );
    } else if (match[2] !== undefined) {
      const leadingSpace = token.startsWith(' ') ? ' ' : '';
      const tag = match[2];
      parts.push(leadingSpace);
      parts.push(
        <button
          key={match.index}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onTagClick?.(tag);
          }}
          className="bg-accent/10 text-accent hover:bg-accent/20 my-0.2 py-0.2 mx-0.5 inline-flex cursor-pointer items-center rounded-full px-1.5 text-[10.5px] font-semibold transition-colors"
        >
          #{tag}
        </button>,
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

/**
 * Renders multi-line notes with structured interactive checklists and bullet points.
 */
function FormattedBody({
  body,
  onToggleCheck,
  onTagClick,
  skipFirstLine = false,
}: {
  body: string;
  onToggleCheck?: (lineIndex: number) => void;
  onTagClick?: (tag: string) => void;
  skipFirstLine?: boolean;
}) {
  const allLines = body.split('\n');
  const lines = skipFirstLine && allLines.length > 1 ? allLines.slice(1) : allLines;
  const lineOffset = skipFirstLine && allLines.length > 1 ? 1 : 0;

  return (
    <div className="flex flex-col gap-1 text-[12.5px] leading-relaxed break-words">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [ ] ')) {
          const checked = trimmed.startsWith('- [x] ');
          const content = trimmed.slice(6);
          const actualLineIndex = idx + lineOffset;
          return (
            <div key={idx} className="flex items-start gap-2 pt-0.5">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleCheck?.(actualLineIndex);
                }}
                className={cn(
                  'mt-0.5 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded border transition-all active:scale-90',
                  checked
                    ? 'border-accent bg-accent text-white shadow-xs'
                    : 'border-border-strong bg-surface hover:border-accent',
                )}
                aria-label={checked ? 'Mark as incomplete' : 'Mark as complete'}
              >
                {checked ? <CheckIcon size={11} /> : null}
              </button>
              <span
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleCheck?.(actualLineIndex);
                }}
                className={cn(
                  'flex-1 cursor-pointer select-none',
                  checked && 'text-muted line-through',
                )}
              >
                {renderInlineFormatting(content, onTagClick)}
              </span>
            </div>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <p key={idx} className="text-text pt-0.5 text-[13px] font-bold">
              {renderInlineFormatting(trimmed.slice(2), onTagClick)}
            </p>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1">
              <span className="text-accent shrink-0 select-none">•</span>
              <span className="flex-1">{renderInlineFormatting(trimmed.slice(2), onTagClick)}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="whitespace-pre-wrap">
            {renderInlineFormatting(line, onTagClick)}
          </p>
        );
      })}
    </div>
  );
}

export function NoteItem({
  note,
  locale,
  now,
  highlighted,
  onStatusChange,
  onTogglePin,
  onColorChange,
  onDuplicate,
  onTagClick,
  onSave,
  onDelete,
}: NoteItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  function startEditing() {
    setDraft(note.body);
    setEditing(true);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(note.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
    }
  }

  function handleToggleCheck(lineIndex: number) {
    const lines = note.body.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    const targetLine = lines[lineIndex];
    if (targetLine === undefined) return;
    const trimmed = targetLine.trim();
    if (trimmed.startsWith('- [ ] ')) {
      lines[lineIndex] = targetLine.replace('- [ ] ', '- [x] ');
    } else if (trimmed.startsWith('- [x] ')) {
      lines[lineIndex] = targetLine.replace('- [x] ', '- [ ] ');
    } else {
      return;
    }
    onSave(lines.join('\n'));
  }

  const title = note.title.length > 0 ? note.title : i18n.t('noteUntitled');
  const isMultiline = note.body.includes('\n');
  const hasMoreContent = isMultiline || note.body.length > note.title.length;
  const rawPreview = toPreview(note.body);
  const preview =
    rawPreview.length > 0
      ? rawPreview
      : note.body.length > note.title.length
        ? note.body.slice(note.title.replace(/…$/, '').length).trim()
        : '';
  const isDone = note.status === 'done';
  const reminderOverdue = isOverdue(note.remindAt, now);

  const noteColor = note.color ?? 'default';
  const colorStyle = NOTE_COLOR_STYLES[noteColor];

  const menuItems: MenuItem[] = [
    ...NOTE_STATUSES.map((status) => ({
      id: `status-${status}`,
      label: i18n.t('statusChangeTo', [i18n.t(statusLabelKey(status))]),
      icon: <StatusIcon status={status} size={13} />,
      selected: note.status === status,
      onSelect: () => onStatusChange(status),
    })),
    {
      id: 'pin',
      label: note.pinned ? i18n.t('noteUnpin') : i18n.t('notePin'),
      icon: <PinIcon size={13} />,
      selected: note.pinned,
      divider: true,
      onSelect: onTogglePin,
    },
    {
      id: 'duplicate',
      label: i18n.t('noteDuplicate'),
      icon: <CopyIcon size={13} />,
      onSelect: () => onDuplicate?.(),
    },
    {
      id: 'copy',
      label: copied ? i18n.t('noteCopied') : i18n.t('noteCopy'),
      icon: <CopyIcon size={13} />,
      onSelect: () => void handleCopy(),
    },
    {
      id: 'edit',
      label: i18n.t('noteEdit'),
      icon: <PencilIcon size={13} />,
      onSelect: startEditing,
    },
    ...NOTE_COLORS.map((color, idx) => ({
      id: `color-${color}`,
      label: i18n.t(colorLabelKey(color)),
      divider: idx === 0,
      icon: (
        <span className={cn('size-2.5 rounded-full border shadow-2xs', colorDotClass(color))} />
      ),
      selected: noteColor === color,
      onSelect: () => onColorChange?.(color),
    })),
    {
      id: 'delete',
      label: i18n.t('noteDelete'),
      icon: <TrashIcon size={13} />,
      danger: true,
      divider: true,
      onSelect: onDelete,
    },
  ];

  if (editing) {
    return (
      <li className="apple-card border-accent/60 bg-surface rounded-2xl border p-3 shadow-md">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onSave(draft);
              setEditing(false);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              setEditing(false);
            }
          }}
          rows={4}
          aria-label={i18n.t('noteEdit')}
          className="qn-scroll border-border/80 bg-surface-muted/60 text-text focus:border-accent w-full resize-none rounded-xl border p-2.5 text-[12.5px] leading-relaxed focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-muted text-[11px] font-medium">{i18n.t('editShortcutHint')}</span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {i18n.t('cancel')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onSave(draft);
                setEditing(false);
              }}
            >
              {i18n.t('save')}
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      id={`note-${note.id}`}
      className={cn(
        'apple-card apple-card-hover group relative flex gap-2.5 rounded-2xl border p-3 transition-all duration-200',
        colorStyle.border,
        colorStyle.bg,
        note.pinned &&
          noteColor === 'default' &&
          'to-surface border-amber-400/35 bg-gradient-to-br from-amber-500/[0.04]',
        highlighted && 'border-accent ring-accent/30 bg-accent-soft/40 ring-2',
      )}
    >
      {/* Status Check Toggle */}
      <IconButton
        label={isDone ? i18n.t('noteReopen') : i18n.t('noteMarkDone')}
        size={24}
        className={cn(
          'mt-0.5 rounded-full transition-transform active:scale-90',
          isDone ? 'text-accent' : 'text-muted/60 hover:text-accent',
        )}
        onClick={() => onStatusChange(isDone ? REOPEN_STATUS : 'done')}
      >
        <StatusIcon status={note.status} size={16} />
      </IconButton>

      {/* Note Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            className="min-w-0 flex-1 cursor-pointer text-left"
          >
            <span
              className={cn(
                'text-text block truncate text-[13px] font-semibold tracking-tight',
                isDone && 'text-muted/70 line-through',
              )}
            >
              {renderInlineFormatting(title, onTagClick)}
            </span>
          </button>

          {note.pinned ? (
            <span
              title="Pinned note"
              className="py-0.2 flex shrink-0 items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 text-[10.5px] font-semibold text-amber-500"
            >
              <PinIcon size={10} />
            </span>
          ) : null}
        </div>

        {hasMoreContent ? (
          expanded ? (
            <div className="text-text mt-1.5">
              <FormattedBody
                body={note.body}
                onToggleCheck={handleToggleCheck}
                onTagClick={onTagClick}
                skipFirstLine={isMultiline && !note.body.split('\n')[0]?.trim().startsWith('- [')}
              />
            </div>
          ) : (
            <button
              type="button"
              aria-expanded={false}
              onClick={() => setExpanded(true)}
              className="text-muted/80 hover:text-text mt-1 block w-full cursor-pointer truncate text-left text-[12px] transition-colors"
            >
              {preview.length > 0 ? preview : i18n.t('noteNoBody')}
            </button>
          )
        ) : null}

        {/* Badges / Metadata */}
        <div className="text-muted mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
          {note.remindAt !== null ? (
            <ReminderLabel
              remindAt={note.remindAt}
              now={now}
              locale={locale}
              overdue={reminderOverdue}
            />
          ) : null}
          <span className="text-muted/70 font-medium">
            {formatRelative(note.updatedAt, now, locale)}
          </span>
          {note.status !== 'open' ? (
            <span className="bg-accent/10 text-accent-text border-accent/20 py-0.2 rounded-md border px-1.5 text-[10.5px] font-semibold">
              {i18n.t(statusLabelKey(note.status))}
            </span>
          ) : null}
        </div>
      </div>

      {/* Apple-style Quick Actions on Hover & 3-dots Menu */}
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          label={copied ? i18n.t('noteCopied') : i18n.t('noteCopy')}
          size={24}
          className={cn(
            'transition-all duration-150',
            copied
              ? 'bg-emerald-500/15 text-emerald-500'
              : 'text-muted/70 hover:text-text opacity-0 group-hover:opacity-100',
          )}
          onClick={() => void handleCopy()}
        >
          {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
        </IconButton>

        <IconButton
          label={note.pinned ? i18n.t('noteUnpin') : i18n.t('notePin')}
          size={24}
          className={cn(
            'transition-all duration-150',
            note.pinned
              ? 'text-amber-500'
              : 'text-muted/70 opacity-0 group-hover:opacity-100 hover:text-amber-500',
          )}
          onClick={onTogglePin}
        >
          <PinIcon size={13} />
        </IconButton>

        <Menu
          label={i18n.t('noteActions')}
          icon={<MoreIcon size={14} />}
          items={menuItems}
          triggerSize={24}
        />
      </div>
    </li>
  );
}

function ReminderLabel({
  remindAt,
  now,
  locale,
  overdue,
}: {
  remindAt: number;
  now: number;
  locale: string;
  overdue: boolean;
}) {
  const diffMs = remindAt - now;
  const isImminent = !overdue && diffMs > 0 && diffMs <= 2 * 60 * 60 * 1000;

  let text: string;
  if (isImminent) {
    const minutes = Math.max(1, Math.ceil(diffMs / 60000));
    text = i18n.t('reminderInMinutes', [String(minutes)]);
  } else {
    const descriptor = describeReminder(remindAt, now, locale);
    text =
      descriptor.kind === 'today'
        ? i18n.t('reminderToday', [descriptor.time])
        : descriptor.kind === 'tomorrow'
          ? i18n.t('reminderTomorrowAt', [descriptor.time])
          : descriptor.dateTime;
  }

  return (
    <span
      className={cn(
        'py-0.2 flex items-center gap-1 rounded-full border px-2 text-[10.5px] font-semibold transition-colors',
        overdue
          ? 'border-warn/25 bg-warn/15 text-warn'
          : isImminent
            ? 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : 'border-accent/25 bg-accent/15 text-accent-text',
      )}
    >
      <BellIcon size={10} />
      {text}
    </span>
  );
}
