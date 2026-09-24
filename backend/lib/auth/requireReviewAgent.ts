import { timingSafeEqual } from "crypto";

// REQ-042: the quarterly catalog-review Managed Agent authenticates with a
// static machine credential (CATALOG_REVIEW_AGENT_TOKEN), not a user
// session -- requireUser's JWT flow is for people who log in, this is for
// one scheduled agent calling two endpoints. Kept separate rather than
// folded into requireUser so the two never get confused for each other.
export class ReviewAgentAuthError extends Error {}

export function requireReviewAgent(req: Request): void {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new ReviewAgentAuthError("Missing or malformed Authorization header.");
  }
  const token = header.slice("Bearer ".length).trim();
  const expected = process.env.CATALOG_REVIEW_AGENT_TOKEN;
  if (!expected) {
    throw new ReviewAgentAuthError("CATALOG_REVIEW_AGENT_TOKEN is not configured.");
  }
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);
  // Different-length buffers would throw inside timingSafeEqual rather than
  // just compare false, so check length first -- still constant-time for
  // the case that actually matters (an attacker holding a same-length guess).
  if (tokenBuf.length !== expectedBuf.length || !timingSafeEqual(tokenBuf, expectedBuf)) {
    throw new ReviewAgentAuthError("Invalid review agent token.");
  }
}
