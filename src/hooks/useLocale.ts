import { browser } from 'wxt/browser';

let cached: string | null = null;

const RTL_LANGUAGES = new Set(['fa', 'ar', 'he', 'ur']);

/**
 * The BCP-47 tag of the browser UI language, used for `Intl` formatting.
 *
 * Cached because it cannot change while a popup is open, and constructing
 * `Intl` formatters is comparatively expensive.
 */
export function currentLocale(): string {
  if (cached !== null) return cached;
  try {
    cached = browser.i18n.getUILanguage() || 'en';
  } catch {
    cached = 'en';
  }
  return cached;
}

/**
 * Returns true if the given locale belongs to a right-to-left language script.
 */
export function isRtlLocale(locale: string): boolean {
  const lang = locale.split(/[-_]/)[0]?.toLowerCase() ?? '';
  return RTL_LANGUAGES.has(lang);
}
