// REQ-217 (FAIL-1062): the pure half of src/lib/useKeyboardOverlap.ts.

// The API level from which Android no longer resizes for the keyboard.
export const EDGE_TO_EDGE_API = 35;

export function needsManualKeyboardAvoidance(os: string, version: string | number): boolean {
  return os === "android" && Number(version) >= EDGE_TO_EDGE_API;
}

// How far the keyboard's top edge is above the bottom of the view (screen
// coordinates); 0 when it doesn't reach it.
export function keyboardOverlap(viewBottom: number, keyboardTop: number): number {
  if (!Number.isFinite(viewBottom) || !Number.isFinite(keyboardTop)) return 0;
  return Math.max(0, Math.round(viewBottom - keyboardTop));
}

