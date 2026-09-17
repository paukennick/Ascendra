import { useMemo } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

// Native-only: completes a pending in-app-browser auth session. Google
// sign-in itself is hidden on web (see getGoogleClientId below), so this
// has nothing to do there -- and web is exactly where this app is now
// served from an https:// origin for the first time (native builds only
// ever hit http://<lan-ip> during dev), so it's the prime suspect for
// anything that behaves differently only under https.
if (Platform.OS !== "web") {
  WebBrowser.maybeCompleteAuthSession();
}

// Google's own discovery document -- avoids hardcoding its OAuth endpoints.
const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

// Google requires a separate OAuth client per platform for an installed app
// (Android is keyed on package name + signing cert SHA-1, iOS on bundle ID --
// see backend/.env.example for the matching server-side
// GOOGLE_OAUTH_CLIENT_IDS, which accepts both as valid audiences). Until the
// current platform's ID is set, the sign-in button stays hidden rather than
// shipping a broken one.
//
// Must be "Android"/"iOS" OAuth client types, not "Web application" --
// Google's OAuth 2.0 policy blocks the implicit grant once it detects the
// request is coming from an installed native app, and only installed-app
// client types support a custom-scheme redirect at all.
export function getGoogleClientId(): string | null {
  // The Android/iOS client IDs below are installed-app client types tied to
  // a custom-scheme redirect (see the redirect-URI comment further down) --
  // that flow doesn't apply in an ordinary browser tab, so web needs its own
  // "Web application" client type and a different redirect entirely. Until
  // that's set up, hide the button on web rather than show one that fails.
  if (Platform.OS === "web") return null;
  const id =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS
      : process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
  return id || null;
}

// Google's native-app redirect convention differs by platform (see "OAuth
// 2.0 for Mobile & Desktop Apps" in Google's docs) -- sending the wrong one
// for a given client fails with redirect_uri_mismatch even though the client
// itself is configured correctly:
//  - iOS has no OS-level app-identity check, so Google ties the redirect
//    scheme to the client ID itself (the reversed-client-id form), which is
//    why it must also be registered as an extra scheme in app.json.
//  - Android already proves app identity via package name + signing cert, so
//    Google expects the redirect scheme to just be the app's own package
//    name -- the reversed-client-id form is not valid there.
// Both use a single slash before the path (scheme:/path), not the
// double-slash deep-link form makeRedirectUri's generic joining produces.
function nativeRedirectUri(clientId: string): string {
  if (Platform.OS === "ios") {
    const reversedClientId = `com.googleusercontent.apps.${clientId.replace(".apps.googleusercontent.com", "")}`;
    return `${reversedClientId}:/oauth2redirect`;
  }
  const androidPackage = Constants.expoConfig?.android?.package ?? "com.hel1x.ascendra";
  return `${androidPackage}:/oauth2redirect`;
}

// Requests response_type "code" with PKCE (S256) -- Google's supported flow
// for installed apps. Android/iOS client types are public clients (no
// secret), so the code is exchanged for tokens right here on-device rather
// than through a backend step, yielding the id_token that
// /api/auth/oauth/google verifies.
export function useGoogleAuthRequest() {
  const clientId = getGoogleClientId();
  const redirectUri = useMemo(
    () => (clientId ? nativeRedirectUri(clientId) : AuthSession.makeRedirectUri({ scheme: "preplms", path: "oauth2redirect" })),
    [clientId]
  );
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId ?? "unset",
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      scopes: ["openid", "profile", "email"],
    },
    discovery
  );

  async function signInAsync(): Promise<string | null> {
    const result = await promptAsync();
    if (result.type !== "success" || !request?.codeVerifier) return null;
    const tokenResponse = await AuthSession.exchangeCodeAsync(
      {
        clientId: clientId ?? "unset",
        code: result.params.code,
        redirectUri,
        extraParams: { code_verifier: request.codeVerifier },
      },
      discovery
    );
    return tokenResponse.idToken ?? null;
  }

  return { clientId, request, signInAsync };
}
