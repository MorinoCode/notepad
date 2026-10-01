/** Hard limits that keep a single note from bloating extension storage. */
export const MAX_BODY_LENGTH = 20_000;
export const MAX_TITLE_LENGTH = 120;

/** Shorten `value`, appending an ellipsis only when something was actually cut. */
export function truncate(value: string, maxLength: number): string {
  if (maxLength <= 0) return '';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Normalize a note body: unify line endings, cap the length and drop trailing
 * whitespace so pressing Enter after a blank line does not leave stray newlines.
 * Leading indentation is preserved because some users paste code.
 */
export function normalizeBody(body: string, maxLength: number = MAX_BODY_LENGTH): string {
  return body.replace(/\r\n?/g, '\n').slice(0, maxLength).replace(/\s+$/u, '');
}

/** The first non-empty line of a body, used as the list title. */
export function deriveTitle(body: string, maxLength: number = MAX_TITLE_LENGTH): string {
  const line = body
    .split('\n')
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.length > 0);
  return line === undefined ? '' : truncate(line, maxLength);
}

/**
 * The remainder of a note after its title line, flattened into a single line so
 * it can be rendered as a one-line preview.
 */
export function toPreview(body: string, maxLength = MAX_TITLE_LENGTH): string {
  const lines = body.split('\n').map((line) => line.trim());
  const firstContentIndex = lines.findIndex((line) => line.length > 0);
  if (firstContentIndex === -1) return '';
  const rest = lines.slice(firstContentIndex + 1).filter((line) => line.length > 0);
  return truncate(rest.join(' '), maxLength);
}
