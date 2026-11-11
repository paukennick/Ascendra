import { ok, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { checkReauth, reauthFailure } from "@/lib/auth/reauth";

export const dynamic = "force-dynamic";

// POST /api/auth/unlock { reauth } | { googleIdToken } -- REQ-177: the app's
// lock screen (after time away, mobile/src/lib/autoLock.ts) for a learner
// without biometric unlock. Confirms it's them the same way as changing the
// email address (lib/auth/reauth.ts): the password, an authenticator or
// backup code, or a fresh Google sign-in, under the same per-account try
// budget. Nothing about the session changes; the app removes its lock.
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJson(req);
    const result = await checkReauth(user.id, body ?? {});
    if (!result.ok) return reauthFailure(result);
    return ok({ unlocked: true });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
