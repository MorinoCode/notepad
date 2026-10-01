import { cn } from '@/lib/util/cn';

export interface TagFilterBarProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
}

/**
 * Horizontal scrollable bar displaying distinct hashtag pills.
 * Clicking a pill filters the notes stream by that tag.
 */
export function TagFilterBar({ tags, selectedTag, onSelectTag }: TagFilterBarProps) {
  if (tags.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-0.5 flex items-center gap-1.5 overflow-x-auto px-0.5 py-0.5">
      {tags.map((tag) => {
        const isSelected = selectedTag === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onSelectTag(isSelected ? null : tag)}
            className={cn(
              'shrink-0 cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-150',
              isSelected
                ? 'bg-accent text-white shadow-xs'
                : 'bg-surface-muted/90 text-muted hover:bg-surface-muted hover:text-text border border-black/5 dark:border-white/5',
            )}
          >
            #{tag}
          </button>
        );
      })}
    </div>
  );
}
