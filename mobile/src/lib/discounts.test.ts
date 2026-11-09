// REQ-166: verified group discounts in the app -- the pure parts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  DISCOUNTS_OFF,
  activeLine,
  parseDiscountStatus,
  playOptionFor,
  plansDiscountLine,
  settingsRowValue,
  verifyResultMessage,
  type DiscountStatus,
} from "./discounts.ts";

const on: DiscountStatus = {
  available: true,
  groups: [{ id: "military", label: "Military and veterans", who: "w", percent: 20, note: null, provider: "ID.me" }],
  verifications: [],
  active: null,
  whatWeCheck: "c",
  whatWeStore: "s",
  terms: ["t"],
  classContact: null,
};

describe("REQ-166 discounts in the app", () => {
  test("anything but a well-formed available answer is off", () => {
    for (const bad of [null, undefined, "x", {}, { available: false }, { available: true }, { available: true, groups: [] }]) {
      assert.deepEqual(parseDiscountStatus(bad), DISCOUNTS_OFF);
    }
    assert.equal(parseDiscountStatus(on).available, true);
  });

  test("settings row and active line", () => {
    assert.equal(settingsRowValue(on), "Verify for a discount");
    const active = { group: "military" as const, label: "Military and veterans", percent: 20, expiresAt: "2027-11-09T12:00:00Z", web: true, playOfferId: "verified-military", appStoreCodes: true };
    assert.equal(settingsRowValue({ ...on, active }), "20% off");
    assert.match(activeLine(active, "en-US"), /^Military and veterans: 20% off, verified until Nov 9, 2027$/);
    assert.equal(activeLine(null), "");
  });

  test("plans line per platform; nothing without a discount", () => {
    assert.equal(plansDiscountLine(on, "ios"), null);
    const active = { group: "nurse" as const, label: "Nurses", percent: 20, expiresAt: "2027-01-01T00:00:00Z", web: false, playOfferId: "verified-nurse", appStoreCodes: true };
    const s = { ...on, active };
    assert.match(plansDiscountLine(s, "ios")!, /offer code/);
    assert.match(plansDiscountLine(s, "android")!, /applied when you choose a plan/);
    assert.match(plansDiscountLine(s, "web")!, /isn't available on the web/);
    assert.match(plansDiscountLine({ ...s, active: { ...active, web: true } }, "web")!, /applied at checkout/);
  });

  test("verification results", () => {
    assert.equal(verifyResultMessage("verified")?.ok, true);
    for (const r of ["not_verified", "taken", "expired", "failed"]) assert.equal(verifyResultMessage(r)?.ok, false, r);
    assert.equal(verifyResultMessage(null), null);
    assert.equal(verifyResultMessage("anything"), null);
  });

  test("Play offer option by offer id, never another offer", () => {
    const opts = [{ id: "monthly" }, { id: "monthly:intro" }, { id: "monthly:verified-nurse" }];
    assert.deepEqual(playOptionFor(opts, "verified-nurse"), { id: "monthly:verified-nurse" });
    assert.equal(playOptionFor(opts, "verified-military"), null);
    assert.equal(playOptionFor(opts, null), null);
    assert.equal(playOptionFor(null, "x"), null);
  });
});
