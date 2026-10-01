import { NoteItem } from '@/components/popup/NoteItem';
import { EmptyState } from '@/components/popup/EmptyState';
import { SearchIcon, CircleIcon } from '@/components/common/Icons';
import { useClock } from '@/hooks/useClock';
import { i18n } from '#i18n';
import type { StatusFilter } from '@/lib/notes/search';
import type { Note, NoteColor, NoteStatus } from '@/lib/notes/types';

export interface NoteListProps {
  notes: Note[];
  locale: string;
  filter: StatusFilter;
  searching: boolean;
  highlightedId: string | null;
  onStatusChange: (id: string, status: NoteStatus) => void;
  onTogglePin: (id: string) => void;
  onColorChange?: (id: string, color: NoteColor) => void;
  onDuplicate?: (note: Note) => void;
  onTagClick?: (tag: string) => void;
  onSave: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}

/**
 * The note list.
 *
 * Every empty state says *why* it is empty, because "no notes" and "no matches"
 * need very different actions from the user.
 */
export function NoteList({
  notes,
  locale,
  filter,
  searching,
  highlightedId,
  onStatusChange,
  onTogglePin,
  onColorChange,
  onDuplicate,
  onTagClick,
  onSave,
  onDelete,
}: NoteListProps) {
  // One clock for the whole list, so every row shows the same "now" and there is
  // a single interval rather than one per note.
  const now = useClock();

  if (notes.length === 0) {
    if (searching) {
      return (
        <EmptyState
          title={i18n.t('emptySearchTitle')}
          body={i18n.t('emptySearchBody')}
          icon={<SearchIcon size={22} />}
        />
      );
    }
    if (filter === 'archived') {
      return <EmptyState title={i18n.t('emptyArchivedTitle')} body={i18n.t('emptyArchivedBody')} />;
    }
    return (
      <EmptyState
        title={i18n.t('emptyTitle')}
        body={i18n.t('emptyBody')}
        icon={<CircleIcon size={22} />}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {notes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          locale={locale}
          now={now}
          highlighted={note.id === highlightedId}
          onStatusChange={(status) => onStatusChange(note.id, status)}
          onTogglePin={() => onTogglePin(note.id)}
          onColorChange={onColorChange ? (color) => onColorChange(note.id, color) : undefined}
          onDuplicate={onDuplicate ? () => onDuplicate(note) : undefined}
          onTagClick={onTagClick}
          onSave={(body) => onSave(note.id, body)}
          onDelete={() => onDelete(note.id)}
        />
      ))}
    </ul>
  );
}
