import { describe, expect, it } from 'vitest';

import { extractTags, getAllTags } from '@/lib/notes/tags';

describe('extractTags', () => {
  it('extracts single and multiple tags', () => {
    expect(extractTags('Hello #work and #ideas')).toEqual(['work', 'ideas']);
  });

  it('supports Persian/Arabic hashtags', () => {
    expect(extractTags('جلسه کاری #پروژه_جدید با تیم')).toEqual(['پروژه_جدید']);
  });

  it('deduplicates tags and lowercases them', () => {
    expect(extractTags('#test #Test #TEST')).toEqual(['test']);
  });

  it('returns empty array when no tags are present', () => {
    expect(extractTags('plain text with no tags')).toEqual([]);
  });
});

describe('getAllTags', () => {
  it('aggregates tags from multiple notes', () => {
    const notes = [
      { body: 'Task 1 #work' },
      { body: 'Task 2 #personal #work' },
      { body: 'Task 3 #shopping' },
    ];
    expect(getAllTags(notes)).toEqual(['personal', 'shopping', 'work']);
  });
});
