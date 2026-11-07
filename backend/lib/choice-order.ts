import { createHash, createHmac } from "node:crypto";

// REQ-097: the order a lesson check's choices are shown in, and the identity
// of a check item.
//
// Choices are stored in the order the model wrote them, and the model tends to
// put the right answer first (the prompt's example once showed index 0), so
// "always pick A" beat chance. Each learner now sees a shuffled order that is
// fixed for that learner and item: a reload, a resume on another device or a
// retried submit shows the same order, and the server can map a submitted
// position back to the stored choice without remembering anything.

// order[shownPosition] = storedIndex. Fisher-Yates driven by SHA-256 of the
// seed; a fresh digest is chained in if the bytes run out (never, for 4).
export function presentationOrder(seed: string, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let digest = createHash("sha256").update(seed, "utf8").digest();
  let pos = 0;
  for (let i = n - 1; i > 0; i--) {
    if (pos + 4 > digest.length) {
      digest = createHash("sha256").update(digest).digest();
      pos = 0;
    }
    const r = digest.readUInt32BE(pos);
    pos += 4;
    const j = r % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// The seed is an HMAC under a server secret, so the order can't be worked out
// from ids the learner can see (their user id, the objective id and the
// question text are all in the app). Without the secret, "seed = the ids"
// let anyone recompute the shuffle and read the answer's position off the
// stored order the model tends to use. Stable for one learner, objective,
// stage and question as long as the secret doesn't change.
//
// Key: CHOICE_ORDER_SECRET if set, otherwise a key derived from
// AUTH_JWT_SECRET (an HMAC of a fixed label, so the JWT secret itself is
// never used directly for a second purpose). Rotating either reshuffles
// every learner's choices, which only matters for a lesson open mid-answer.
export function choiceOrderKey(env: Record<string, string | undefined> = process.env): Buffer {
  const own = env.CHOICE_ORDER_SECRET;
  if (own) return Buffer.from(own, "utf8");
  const jwt = env.AUTH_JWT_SECRET;
  if (!jwt) throw new Error("CHOICE_ORDER_SECRET or AUTH_JWT_SECRET must be set to order lesson choices.");
  return createHmac("sha256", jwt).update("ascendra/choice-order/v1", "utf8").digest();
}

export function presentationSeed(userId: string, objectiveId: string, stage: string, question: string): string {
  return createHmac("sha256", choiceOrderKey())
    .update(`${userId}\n${objectiveId}\n${stage}\n${question}`, "utf8")
    .digest("hex");
}

export function shuffleForPresentation<T>(items: T[], order: number[]): T[] {
  return order.map((i) => items[i]);
}

// Shown position of the stored correct index (what the app may mark once the
// answer is graded).
export function shownIndexOf(order: number[], storedIndex: number): number {
  return order.indexOf(storedIndex);
}

// Stored index for a shown position, or null if the position is out of range.
export function storedIndexAt(order: number[], shownIndex: unknown): number | null {
  if (!Number.isInteger(shownIndex)) return null;
  const i = shownIndex as number;
  return i >= 0 && i < order.length ? order[i] : null;
}

// One check item = one stage of one generated lesson. md5 so the same key
// can be written in SQL (lesson_item_key in migration 029) for backfills.
export function lessonItemKey(stage: string, question: string): string {
  return createHash("md5").update(`${stage}\n${question}`, "utf8").digest("hex");
}
