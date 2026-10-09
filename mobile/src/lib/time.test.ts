import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { whenLabel } from "./time.ts";

const NOW = Date.UTC(2026, 9, 8, 12, 0, 0);
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("whenLabel", () => {
  test("buckets from just now through days", () => {
    assert.equal(whenLabel(ago(10_000), NOW), "just now");
    assert.equal(whenLabel(ago(5 * 60_000), NOW), "5 min ago");
    assert.equal(whenLabel(ago(3 * 3_600_000), NOW), "3 hr ago");
    assert.equal(whenLabel(ago(24 * 3_600_000), NOW), "1 day ago");
    assert.equal(whenLabel(ago(3 * 86_400_000), NOW), "3 days ago");
  });

  test("falls back to a calendar date past a week, and to empty on garbage", () => {
    assert.match(whenLabel(ago(30 * 86_400_000), NOW), /Sep/);
    assert.equal(whenLabel("not a date", NOW), "");
  });
});
