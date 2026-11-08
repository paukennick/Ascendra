import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { bandOf, calibrate } from "./exam-calibration";

const n = (count: number, confidence: number | null, correct: boolean) =>
  Array.from({ length: count }, () => ({ confidence, correct }));

describe("calibrate", () => {
  test("bands", () => {
    assert.equal(bandOf(1), "unsure");
    assert.equal(bandOf(2), "unsure");
    assert.equal(bandOf(3), "middle");
    assert.equal(bandOf(4), "sure");
    assert.equal(bandOf(5), "sure");
  });

  test("the plain-language lines count right answers per band", () => {
    const c = calibrate([...n(9, 5, true), ...n(1, 4, false), ...n(4, 2, true), ...n(6, 1, false)]);
    assert.deepEqual(c.lines, ["When you were sure, you were right 9 of 10.", "When you were unsure, you were right 4 of 10."]);
    assert.equal(c.rated, 20);
    assert.equal(c.bands.find((b) => b.band === "sure")!.accuracyPercent, 90);
    assert.equal(c.bands.find((b) => b.band === "middle")!.accuracyPercent, null);
  });

  test("confident misses get gentle, specific coaching", () => {
    const c = calibrate([...n(3, 5, true), ...n(3, 5, false)]);
    assert.match(c.coaching.join(" "), /most useful misses/);
    assert.doesNotMatch(c.coaching.join(" "), /fail|bad|poor/i);
  });

  test("right when unsure: you know more than you think", () => {
    const c = calibrate([...n(4, 1, true), ...n(1, 2, false)]);
    assert.match(c.coaching.join(" "), /know more than/);
  });

  test("well calibrated", () => {
    const c = calibrate([...n(9, 5, true), ...n(1, 5, false), ...n(1, 1, true), ...n(4, 1, false)]);
    assert.match(c.coaching.join(" "), /sense of what you don't know is accurate/);
  });

  test("too few rated answers asks for more, unrated ones are counted apart", () => {
    const c = calibrate([...n(2, 4, true), ...n(5, null, true)]);
    assert.equal(c.rated, 2);
    assert.equal(c.unrated, 5);
    assert.match(c.coaching[0], /Rate how sure/);
  });

  test("out-of-range confidence is ignored, never thrown", () => {
    const c = calibrate([{ confidence: 0, correct: true }, { confidence: 9, correct: false }]);
    assert.equal(c.rated, 0);
  });
});
