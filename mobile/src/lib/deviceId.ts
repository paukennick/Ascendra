// REQ-306 (Nick 2026-11-16: "active sessions should stack"): a random id for
// this install (phone) or this browser (web), sent as X-Ascendra-Device. The
// server ends this device's older session when it signs in again, so Active
// sessions shows one row per device. It is not a fingerprint: it is random,
// stored only on the device, and a reinstall or cleared site data makes a new
// one.
export const DEVICE_ID_HEADER = "X-Ascendra-Device";
export const DEVICE_ID_KEY = "ascendra_device_id";
const DEVICE_ID_RE = /^[A-Za-z0-9_-]{16,64}$/;

export function isDeviceId(value: unknown): value is string {
  return typeof value === "string" && DEVICE_ID_RE.test(value);
}

// 32 hex characters from 16 random bytes.
export function newDeviceId(randomBytes: (n: number) => Uint8Array): string {
  return Array.from(randomBytes(16), (b) => b.toString(16).padStart(2, "0")).join("");
}
