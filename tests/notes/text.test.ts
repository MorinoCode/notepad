import { describe, expect, it } from 'vitest';

import { deriveTitle, normalizeBody, toPreview, truncate } from '@/lib/notes/text';

describe('truncate', () => {
  it('leaves a short string untouched', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('appends a single ellipsis character when cutting', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcd…');
  });

  it('does not leave a trailing space before the ellipsis', () => {
    // The cut lands on the space, which is trimmed so no double space appears.
    expect(truncate('ab cd ef', 6)).toBe('ab cd…');
    expect(truncate('ab   cd', 5)).toBe('ab…');
  });

  it('returns an empty string for a non-positive limit', () => {
    expect(truncate('abc', 0)).toBe('');
  });
});

describe('normalizeBody', () => {
  it('unifies Windows and old Mac line endings', () => {
    expect(normalizeBody('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('strips trailing whitespace so Enter never leaves stray blank lines', () => {
    expect(normalizeBody('hello\n\n  ')).toBe('hello');
  });

  it('preserves leading indentation because people paste code', () => {
    expect(normalizeBody('    indented')).toBe('    indented');
  });

  it('preserves interior blank lines', () => {
    expect(normalizeBody('a\n\nb')).toBe('a\n\nb');
  });
});

describe('deriveTitle', () => {
  it('uses the first non-empty line', () => {
    expect(deriveTitle('\n\n  Buy milk \nand eggs')).toBe('Buy milk');
  });

  it('returns an empty string when there is no content', () => {
    expect(deriveTitle('   \n\n  ')).toBe('');
  });

  it('shortens a very long first line', () => {
    const title = deriveTitle('x'.repeat(500));
    expect(title.length).toBeLessThanOrEqual(120);
    expect(title.endsWith('…')).toBe(true);
  });

  it('keeps non-latin text intact', () => {
    expect(deriveTitle('خرید نان')).toBe('خرید نان');
  });
});

describe('toPreview', () => {
  it('flattens the lines after the title into one line', () => {
    expect(toPreview('Title\nfirst\n\nsecond')).toBe('first second');
  });

  it('returns an empty string for a single-line note', () => {
    expect(toPreview('Title only')).toBe('');
  });

  it('returns an empty string for a blank body', () => {
    expect(toPreview('   \n  ')).toBe('');
  });

  it('truncates a long remainder', () => {
    expect(toPreview(`Title\n${'y'.repeat(400)}`).length).toBeLessThanOrEqual(120);
  });
});
