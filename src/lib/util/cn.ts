type ClassValue = string | false | null | undefined;

/**
 * Join class names, dropping anything falsy.
 *
 * A hand-rolled helper instead of `clsx`/`tailwind-merge`: this project never
 * produces conflicting Tailwind classes (variants are chosen, not layered), so a
 * dependency would only add bundle weight.
 */
export function cn(...values: ClassValue[]): string {
  let result = '';
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      result = result.length === 0 ? value : `${result} ${value}`;
    }
  }
  return result;
}
