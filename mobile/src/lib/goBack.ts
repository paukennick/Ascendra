// REQ-206 (FAIL-921): `router.back()` does nothing when there is nowhere to
// go back to -- a reloaded tab, a deep link, a link opened in a new tab. Every
// "Back to ..." button then looked dead. This is the rule for all of them:
// go back when the stack has a screen to return to, otherwise replace the
// current screen with its natural parent.
//
// The router is passed in (not imported) so the rule can be tested without
// Expo; src/lib/useGoBack.ts binds it to the real one.

export interface BackRouter {
  canGoBack(): boolean;
  back(): void;
  replace(href: string): void;
}

export function goBackOr(router: BackRouter, fallback: string): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

// The parents the screens fall back to.
export const HOME = "/";
export const courseHome = (trackId: string) => `/course/${encodeURIComponent(trackId)}`;
