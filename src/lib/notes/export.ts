import type { Note } from '@/lib/notes/types';

/**
 * Formats a list of notes into clean, readable Markdown.
 */
export function notesToMarkdown(notes: Note[]): string {
  const header = `# Notewisp Notes Export\nExported on: ${new Date().toLocaleString()}\nTotal notes: ${notes.length}\n\n---\n\n`;

  const body = notes
    .map((note) => {
      const date = new Date(note.createdAt).toLocaleDateString();
      const statusBadge =
        note.status === 'done'
          ? '[Done]'
          : note.status === 'doing'
            ? '[In Progress]'
            : note.status === 'archived'
              ? '[Archived]'
              : '[To Do]';
      const pin = note.pinned ? '📌 ' : '';
      const reminder = note.remindAt
        ? ` | ⏰ Reminder: ${new Date(note.remindAt).toLocaleString()}`
        : '';

      return `## ${pin}${note.title || 'Untitled'}\n*Status: ${statusBadge} | Created: ${date}${reminder}*\n\n${note.body}\n\n---`;
    })
    .join('\n\n');

  return header + body;
}

/**
 * Triggers a client-side download of a text/markdown file.
 */
export function downloadMarkdownFile(content: string, filename = 'notewisp-notes.md'): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
