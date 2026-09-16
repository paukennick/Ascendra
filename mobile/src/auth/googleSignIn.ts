import { useMemo } from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

// Google's own discovery document -- avoids hardcoding its OAuth endpoints.
const discovery = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

// Set once a client ID is registered in Google Cloud Console and added to
// mobile/.env.local as EXPO_PUBLIC_GOOGLE_CLIENT_ID -- see backend/.env.example
// for the matching server-side GOOGLE_OAUTH_CLIENT_IDS. Until then the sign-in
// button stays hidden rather than shipping a broken one.
export function getGoogleClientId(): string | null {
  return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || null;
}

// Requests response_type "id_token" (OpenID Connect implicit flow) rather
// than an authorization code -- Google supports this specifically so a
// public client (no secret, as a mobile app must be) can get a verifiable
// identity token directly, without a code-exchange step that would need one.
export function useGoogleAuthRequest() {
  const clientId = getGoogleClientId();
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri(), []);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId ?? "unset",
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      scopes: ["openid", "profile", "email"],
      extraParams: { nonce: Math.random().toString(36).slice(2) },
    },
    discovery
  );
  return { clientId, request, response, promptAsync };
}

export function extractIdToken(response: AuthSession.AuthSessionResult | null): string | null {
  if (response?.type !== "success") return null;
  const idToken = response.params?.id_token;
  return typeof idToken === "string" ? idToken : null;
}
