/**
 * Extract distinct hashtags from text, supporting both English and Persian/Arabic characters.
 */
export function extractTags(text: string): string[] {
  const matches = text.match(/(?:^|\s)#([a-zA-Z0-9_\u0600-\u06FF]+)/g);
  if (!matches) return [];
  const tags = matches.map((m) => m.trim().slice(1).toLocaleLowerCase());
  return Array.from(new Set(tags));
}

/**
 * Collect all distinct hashtags across all notes.
 */
export function getAllTags(notes: readonly { body: string }[]): string[] {
  const all = new Set<string>();
  for (const note of notes) {
    for (const tag of extractTags(note.body)) {
      all.add(tag);
    }
  }
  return Array.from(all).sort();
}
