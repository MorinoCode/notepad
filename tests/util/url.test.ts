import { describe, expect, it } from 'vitest';

import { extensionPageUrl, publicAssetUrl } from '@/lib/util/url';

/*
 * Assertions stay structural rather than comparing against a hard-coded
 * `chrome-extension://<id>/...` prefix, because the id differs between the real
 * browser and the test mock. What matters is the path shape.
 */
describe('publicAssetUrl', () => {
  it('resolves a public asset to an absolute extension URL', () => {
    const url = publicAssetUrl('icon/128.png');

    expect(url).toMatch(/^[a-z-]+:\/\//);
    expect(url.endsWith('/icon/128.png')).toBe(true);
  });

  it('normalizes a leading slash so the path never doubles up', () => {
    expect(publicAssetUrl('/icon/128.png')).toBe(publicAssetUrl('icon/128.png'));
    expect(publicAssetUrl('//icon/128.png')).not.toContain('//icon');
  });

  it('is stable for the same input', () => {
    expect(publicAssetUrl('icon/16.png')).toBe(publicAssetUrl('icon/16.png'));
  });
});

describe('extensionPageUrl', () => {
  it('returns a page URL with no fragment by default', () => {
    expect(extensionPageUrl('options.html').endsWith('/options.html')).toBe(true);
  });

  it('appends a fragment route for deep links', () => {
    const url = extensionPageUrl('popup.html', '#note/abc-123');

    expect(url.endsWith('/popup.html#note/abc-123')).toBe(true);
  });

  it('accepts an encoded id without mangling it', () => {
    const url = extensionPageUrl('popup.html', '#note/a%20b');
    expect(url.endsWith('/popup.html#note/a%20b')).toBe(true);
  });
});
