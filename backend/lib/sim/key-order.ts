// REQ-227 (FAIL-1222): the key orders a stored document can come back in.
// The server keeps a scenario in a jsonb column, and jsonb does not keep the
// order of an object's keys: it returns shorter keys first, then in byte
// order. The content linter and the storage-order test use these to run a
// document the way the server would see it.

// Postgres jsonb key order: by length in bytes, then bytewise.
export function jsonbKeyOrder(keys: string[]): string[] {
  return [...keys].sort((a, b) => Buffer.byteLength(a) - Buffer.byteLength(b) || Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

// A copy of a JSON value with the keys of every object (at any depth) put in
// the given order; arrays keep their order, as jsonb arrays do.
export function withKeyOrder<T>(value: T, order: (keys: string[]) => string[]): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => withKeyOrder(v, order)) as unknown as T;
  const o = value as Record<string, unknown>;
  return Object.fromEntries(order(Object.keys(o)).map((k) => [k, withKeyOrder(o[k], order)])) as T;
}

export const reverseKeyOrder = (keys: string[]): string[] => [...keys].reverse();
