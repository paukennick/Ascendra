// For a screen that re-fetches when a filter changes: two requests can be in
// flight at once and answer in either order. The answer history list showed
// the attempts of whichever filter answered LAST, not the one selected
// (Audit 2 mobile item 13, FAIL-068). Each request takes a ticket; only the
// newest ticket may apply its response.

export interface LatestRequest {
  begin(): number;
  isLatest(ticket: number): boolean;
}

export function createLatestRequest(): LatestRequest {
  let latest = 0;
  return {
    begin() {
      latest += 1;
      return latest;
    },
    isLatest(ticket) {
      return ticket === latest;
    },
  };
}
