import {
  ArchiveIcon,
  CheckCircleIcon,
  CircleHalfIcon,
  CircleIcon,
  type IconProps,
} from '@/components/common/Icons';
import type { NoteStatus } from '@/lib/notes/types';

export interface StatusIconProps extends IconProps {
  status: NoteStatus;
}

/**
 * The glyph for a status.
 *
 * An exhaustive switch rather than a lookup object so adding a status produces a
 * compile error here instead of an undefined icon at runtime.
 */
export function StatusIcon({ status, ...props }: StatusIconProps) {
  switch (status) {
    case 'open':
      return <CircleIcon {...props} />;
    case 'doing':
      return <CircleHalfIcon {...props} />;
    case 'done':
      return <CheckCircleIcon {...props} />;
    case 'archived':
      return <ArchiveIcon {...props} />;
  }
}

/** i18n key for a status. Exhaustive for the same reason as {@link StatusIcon}. */
export function statusLabelKey(
  status: NoteStatus,
): 'statusOpen' | 'statusDoing' | 'statusDone' | 'statusArchived' {
  switch (status) {
    case 'open':
      return 'statusOpen';
    case 'doing':
      return 'statusDoing';
    case 'done':
      return 'statusDone';
    case 'archived':
      return 'statusArchived';
  }
}

/** Filter tab order, including the pseudo-status "all". */
export const FILTER_TABS = ['all', 'open', 'doing', 'done', 'archived'] as const;

export function filterLabelKey(
  filter: (typeof FILTER_TABS)[number],
): 'statusAll' | 'statusOpen' | 'statusDoing' | 'statusDone' | 'statusArchived' {
  switch (filter) {
    case 'all':
      return 'statusAll';
    case 'open':
      return 'statusOpen';
    case 'doing':
      return 'statusDoing';
    case 'done':
      return 'statusDone';
    case 'archived':
      return 'statusArchived';
  }
}

/** The status a completed note returns to when reopened. */
export const REOPEN_STATUS: NoteStatus = 'open';
