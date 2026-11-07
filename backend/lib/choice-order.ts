import { createHash } from "node:crypto";

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

// REQ-098: ids are lowercased, so the lesson GET, the hint route and
// /api/grade derive the same order however the app spelled the objective id
// (iOS prints UUIDs in uppercase).
export function presentationSeed(userId: string, objectiveId: string, stage: string, question: string): string {
  return `${userId.toLowerCase()}\n${objectiveId.toLowerCase()}\n${stage}\n${question}`;
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
