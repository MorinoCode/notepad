import { browser } from 'wxt/browser';

/**
 * Absolute URL for a static file shipped in `public/`.
 *
 * WXT narrows `browser.runtime.getURL` to the paths it can statically see — the
 * HTML and JS entrypoints — because those are the only ones that break when a
 * file is renamed. Files under `public/` (icons, for instance) are referenced by
 * string from APIs like `notifications.create`, so the narrowing is widened once,
 * here, instead of at every call site.
 */
export function publicAssetUrl(path: string): string {
  const getUrl = browser.runtime.getURL as unknown as (path: string) => string;
  return getUrl(`/${path.replace(/^\/+/, '')}`);
}

/** Href for an extension page, optionally with a fragment route. */
export function extensionPageUrl(page: 'popup.html' | 'options.html', hash = ''): string {
  return browser.runtime.getURL(`/${page}${hash}`);
}
