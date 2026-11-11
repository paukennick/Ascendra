import { cookies } from "next/headers";

// REQ-219 (FAIL-1107): the verify-email page that spends a set_password link
// shows a link to choose a password, and needs the one-hour reset token for
// it. The token used to ride in the redirect's query string
// (/verify-email?result=set_password&reset=<token>), where request logs,
// error reports and browser history keep it. It now goes in a short-lived
// httpOnly cookie scoped to /verify-email, set by the server action and read
// by the page; no URL carries it until the learner follows the link on that
// page. A browser that refuses the cookie gets the page without the link
// and is pointed to "Forgot password".
export const RESET_HANDOFF_COOKIE = "asc_reset_handoff";
const RESET_TOKEN = /^[A-Za-z0-9_-]{20,128}$/;
const MAX_AGE_SECONDS = 10 * 60;

interface Store {
  set(token: string): Promise<void>;
  get(): Promise<string | null>;
}

const nextStore: Store = {
  async set(token) {
    (await cookies()).set(RESET_HANDOFF_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/verify-email",
      maxAge: MAX_AGE_SECONDS,
    });
  },
  async get() {
    return (await cookies()).get(RESET_HANDOFF_COOKIE)?.value ?? null;
  },
};

// Tests run outside a request, where cookies() throws.
let store: Store = nextStore;
export function __setResetHandoffForTest(next: Store | null): void {
  store = next ?? nextStore;
}

export async function stashResetToken(token: string): Promise<void> {
  if (RESET_TOKEN.test(token)) await store.set(token);
}

// The stashed token if it is well formed, else null.
export async function readResetToken(): Promise<string | null> {
  const t = await store.get().catch(() => null);
  return t && RESET_TOKEN.test(t) ? t : null;
}
