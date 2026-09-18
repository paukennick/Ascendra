// Handles deep links the OS hands to the app before the router tries to
// match them to a screen.
//
// The bug this exists to fix: Google sign-in on Android redirects to
// com.hel1x.ascendra:/oauth2redirect (see src/auth/googleSignIn.ts). That
// scheme is registered in app.json, so Android launches the app with that
// URL -- and Expo Router, which owns linking, looks for a route named
// "oauth2redirect", finds none, and renders "Unmatched Route -- this page
// could not be found". The user picks their Google account and lands on a
// dead end.
//
// WebBrowser.maybeCompleteAuthSession() does not save us here. It resolves
// the pending auth session, but the router has already taken the incoming
// URL and navigated to a route that does not exist.
//
// So the OAuth redirect is swallowed: it is an authorization callback, not a
// destination. expo-auth-session's own listener still receives it and
// resolves promptAsync, which is what actually completes the sign-in. We
// just tell the router to stay somewhere real while that happens.

const OAUTH_REDIRECT_PATHS = ["oauth2redirect", "oauthredirect"];

function isOAuthCallback(path: string): boolean {
  // The path arrives in several shapes depending on how the OS and the
  // scheme joined it: "oauth2redirect", "/oauth2redirect", or a full
  // "com.hel1x.ascendra:/oauth2redirect?code=...". Match on the segment
  // rather than trying to normalise all of them.
  const withoutQuery = path.split("?")[0].split("#")[0];
  const segments = withoutQuery.split(/[:/]+/).filter(Boolean);
  const last = segments[segments.length - 1]?.toLowerCase();
  return !!last && OAUTH_REDIRECT_PATHS.includes(last);
}

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  if (isOAuthCallback(path)) {
    // Back to the screen the sign-in was started from. If the session is
    // still alive, promptAsync resolves and AuthContext flips to signedIn,
    // and the root layout moves the user on from there. If the app was cold
    // started by this link the in-flight promise is gone, and the login
    // screen is the correct place to land rather than a 404.
    return "/login";
  }
  return path;
}
