export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export function getUserAgent(req: Request): string | null {
  return req.headers.get("user-agent");
}

// REQ-306: the session meta every sign-in and refresh adds: this device's
// random id (X-Ascendra-Device, validated in lib/auth/tokens.ts) and whether
// the caller is the web app (14-day sessions).
export const DEVICE_ID_HEADER = "x-ascendra-device";
export function getDeviceId(req: Request): string | null {
  return req.headers.get(DEVICE_ID_HEADER)?.trim() || null;
}
