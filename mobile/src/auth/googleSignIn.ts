import { useMemo } from "react";
import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

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
// client types support the custom-scheme redirect the authorization-code+PKCE
// grant below relies on.
export function getGoogleClientId(): string | null {
  const id =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS
      : process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
  return id || null;
}

// Requests response_type "code" with PKCE (S256) -- Google's supported flow
// for installed apps. Android/iOS client types are public clients (no
// secret), so the code is exchanged for tokens right here on-device rather
// than through a backend step, yielding the id_token that
// /api/auth/oauth/google verifies.
export function useGoogleAuthRequest() {
  const clientId = getGoogleClientId();
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri({ scheme: "preplms" }), []);
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
