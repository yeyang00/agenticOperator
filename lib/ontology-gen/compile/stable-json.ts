/**
 * Deterministic JSON.stringify per spec §8.4.
 *
 * Sorts object keys alphabetically; drops `undefined` values (vs. `null` which
 * is preserved); arrays preserve their order. Same input always produces the
 * same string.
 */

export function stableJson(value: unknown, indent: number): string {
  return JSON.stringify(value, sortedReplacer, indent);
}

function sortedReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    );
  }
  return value;
}
