import { verifyAccessToken } from "./tokens";

export class AuthError extends Error {}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function requireUser(req: Request): Promise<AuthenticatedUser> {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new AuthError("Missing or malformed Authorization header.");
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    return { id: payload.sub, email: payload.email };
  } catch {
    throw new AuthError("Invalid or expired access token.");
  }
}
