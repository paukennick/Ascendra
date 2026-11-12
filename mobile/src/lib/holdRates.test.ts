// REQ-235: the owner's hold-rate view -- parsing and wording, and the wiring
// rule that it lives on the owner-only Access screen.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { holdLine, kindLine, parseHoldRates, reasonsLine } from "./holdRates.ts";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, "..", "..", rel), "utf8");

describe("hold rates (REQ-235)", () => {
  test("parses the server's report and drops anything malformed", () => {
    const r = parseHoldRates({
      asOf: "2026-11-11T00:00:00Z",
      courses: [
        { code: "SECPLUS", title: "Security+", kinds: [{ kind: "lesson", stored7: 9, held7: 1, stored30: 30, held30: 3 }, { kind: "bogus" }], topReasons: [{ reason: "writer_unsure", n: 2 }, { reason: "??", n: 9 }] },
        { title: "no code" },
        null,
      ],
    });
    assert.equal(r.courses.length, 1);
    assert.deepEqual(r.courses[0].kinds, [{ kind: "lesson", stored7: 9, held7: 1, stored30: 30, held30: 3 }]);
    assert.deepEqual(r.courses[0].topReasons, [{ reason: "writer_unsure", n: 2 }]);
    assert.deepEqual(parseHoldRates(null), { asOf: "", courses: [] });
  });

  test("words the rate as held over everything written", () => {
    assert.equal(holdLine(9, 1), "1 of 10 held (10%)");
    assert.equal(holdLine(0, 0), "nothing generated");
    assert.equal(kindLine({ kind: "pbq", stored7: 0, held7: 1, stored30: 3, held30: 1 }), "Scenario tasks (PBQ): 7 days 1 of 1 held (100%); 30 days 1 of 4 held (25%)");
    assert.equal(reasonsLine({ topReasons: [{ reason: "checker_disagreed", n: 4 }, { reason: "content_rule", n: 0 }] }), "Top reasons (30 days): fact-check picked another answer 4");
    assert.equal(reasonsLine({ topReasons: [] }), null);
  });

  test("the view is on the owner-only Access screen and reads the owner-only route", () => {
    const screen = read("app/(app)/settings/access.tsx");
    assert.match(screen, /<HoldRates \/>/);
    assert.ok(screen.indexOf("<HoldRates />") > screen.indexOf("if (!showAccessSettings(user))"), "rendered only after the owner check");
    assert.match(read("src/components/HoldRates.tsx"), /\/api\/access\/hold-rates/);
  });
});
