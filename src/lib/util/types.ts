/**
 * Compile-time assertion that a hand-written interface and the runtime schema
 * that validates it have not drifted apart.
 *
 * This is mutual assignability rather than exact type identity on purpose:
 * identity also distinguishes `readonly` modifiers, and the domain types use
 * `readonly` deliberately. Mutual assignability still catches everything that
 * matters — a field that exists on one side only, a widened type, or a field that
 * became optional on one side, all fail to compile.
 *
 * Usage: `const check: Matches<SchemaOutput, Interface> = true;`
 */
export type Matches<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
