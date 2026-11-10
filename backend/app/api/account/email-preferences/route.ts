import { ok, badRequest, unauthorized, serverError, readJson } from "@/lib/http";
import { requireUser, AuthError } from "@/lib/auth/requireUser";
import { queryOne } from "@/lib/db";
import { digestRefusal, getEmailPreferences, serviceEmailsEnabled, setEmailPreferences, validatePreferences } from "@/lib/service-emails";

export const dynamic = "force-dynamic";

async function verified(userId: string): Promise<boolean> {
  const row = await queryOne<{ v: boolean }>(`select email_verified_at is not null as v from app_users where id = $1`, [userId]);
  return row?.v === true;
}

// Whether the daily run sends anything yet (SERVICE_EMAILS_ENABLED, and for
// the digest its postal address and sender), so Settings never implies mail
// that is not going out.
function sending() {
  const on = serviceEmailsEnabled();
  return { examChanges: on, examCountdown: on, weeklyDigest: on && !digestRefusal(process.env) };
}

// GET /api/account/email-preferences -- REQ-197: the learner's switches for
// the non-account emails (exam change notices, exam countdown, weekly
// digest) and whether their address is verified (nothing is sent until it is).
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return ok({ preferences: await getEmailPreferences(user.id), emailVerified: await verified(user.id), sending: sending() });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}

// PUT /api/account/email-preferences { examChanges?, examCountdown?, weeklyDigest? }
export async function PUT(req: Request) {
  try {
    const user = await requireUser(req);
    const v = validatePreferences(await readJson(req));
    if (!v.ok) return badRequest(v.error);
    return ok({
      preferences: await setEmailPreferences(user.id, v.value),
      emailVerified: await verified(user.id),
      sending: sending(),
    });
  } catch (err) {
    if (err instanceof AuthError) return unauthorized(err.message);
    return serverError(err);
  }
}
