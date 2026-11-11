// REQ-217 (FAIL-1048): an id sent with a request so the server can recognise a
// repeat of it (backend: replay by client id). It must stay the same across
// retries of the same request, or a start that reached the server but whose
// answer was lost starts a second one. The id is kept in a ref and dropped only
// once the request has succeeded; a different request (another mode, another
// setting) gets its own.
export interface PendingId {
  key: string;
  id: string;
}

export function pendingIdFor(pending: PendingId | null, key: string, make: () => string): PendingId {
  return pending && pending.key === key ? pending : { key, id: make() };
}
