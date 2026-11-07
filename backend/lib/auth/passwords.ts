import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// REQ-116 (audit 3, low): a sign-in for an address with no password (no
// account, or Google-only) used to answer in a few milliseconds, against
// ~300 ms for a real bcrypt check, which told anyone which addresses were
// registered. Those paths now spend the same bcrypt work comparing against
// a fixed hash of the same cost. The hash is made once per process.
let dummyHash: Promise<string> | null = null;
export async function verifyDummyPassword(password: string): Promise<void> {
  dummyHash ??= bcrypt.hash("ascendra-timing-equaliser", SALT_ROUNDS);
  await bcrypt.compare(password, await dummyHash);
}
