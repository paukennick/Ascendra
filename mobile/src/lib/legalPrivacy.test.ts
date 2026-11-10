// REQ-205: the app's half of the legal and privacy batch -- the 16+
// confirmation, the web data download, the legal version header, and the
// legal text itself. Pure modules and source checks, like the other app tests.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AGE_CONFIRMATION_CODE,
  AGE_CONFIRMATION_ERROR,
  AGE_CONFIRMATION_LABEL,
  MINIMUM_AGE,
  ageCheckError,
  ageField,
  isAgeConfirmationRequired,
} from "./ageConfirmation.ts";
import { downloadJson, exportFileName, type DownloadAnchor, type DownloadEnv } from "./accountExport.ts";
import { LEGAL_VERSION_HEADER, TERMS_VERSION } from "./legal.ts";

const root = join(import.meta.dirname, "..", "..");
const read = (...p: string[]) => readFileSync(join(root, ...p), "utf8");

describe("I am 16 or older (FAIL-906)", () => {
  test("the label, the minimum and the error say 16", () => {
    assert.equal(MINIMUM_AGE, 16);
    assert.equal(AGE_CONFIRMATION_LABEL, "I am 16 or older");
    assert.match(AGE_CONFIRMATION_ERROR, /16 or older/);
  });
  test("an unticked box is an error and sends nothing; a ticked box sends the boolean true", () => {
    assert.equal(ageCheckError(false), AGE_CONFIRMATION_ERROR);
    assert.equal(ageCheckError(true), null);
    assert.deepEqual(ageField(false), {});
    assert.deepEqual(ageField(true), { ageConfirmed: true });
  });
  test("the Google flow recognises only the server's age answer", () => {
    assert.equal(AGE_CONFIRMATION_CODE, "age_confirmation_required");
    assert.equal(isAgeConfirmationRequired({ status: 400, data: { code: "age_confirmation_required" } }), true);
    assert.equal(isAgeConfirmationRequired({ status: 400, data: { code: "other" } }), false);
    assert.equal(isAgeConfirmationRequired({ status: 401, data: { code: "age_confirmation_required" } }), false);
    assert.equal(isAgeConfirmationRequired(new Error("x")), false);
    assert.equal(isAgeConfirmationRequired(null), false);
  });
  test("the checkbox is accessible: a checkbox role, a label, a checked state, a 44-point target", () => {
    const box = read("src", "components", "AgeCheckbox.tsx");
    assert.match(box, /accessibilityRole="checkbox"/);
    assert.match(box, /accessibilityLabel=\{AGE_CONFIRMATION_LABEL\}/);
    assert.match(box, /accessibilityState=\{\{ checked \}\}/);
    assert.match(box, /minHeight: 44/);
  });
  test("email sign-up asks, refuses without it, and sends it", () => {
    const reg = read("app", "(auth)", "register.tsx");
    assert.match(reg, /<AgeCheckbox checked=\{ageOk\}/);
    assert.match(reg, /ageCheckError\(ageOk\)/);
    assert.match(reg, /TERMS_VERSION, ageOk\)/);
    const ctx = read("src", "auth", "AuthContext.tsx");
    assert.match(ctx, /\.\.\.ageField\(ageConfirmed\)/);
    assert.equal(ctx.match(/\.\.\.ageField\(ageConfirmed\)/g)?.length, 2, "register and Google");
  });
  test("first-time Google sign-up shows the confirmation when the server asks, then retries with the same sign-in", () => {
    const login = read("app", "(auth)", "login.tsx");
    assert.match(login, /isAgeConfirmationRequired\(err\)/);
    assert.match(login, /setGoogleToken\(idToken\)/);
    assert.match(login, /<AgeCheckbox checked=\{ageOk\}/);
    assert.match(login, /finishGoogle\(googleToken, true\)/);
    assert.match(login, /ageCheckError\(ageOk\)/);
  });
  test("no date of birth is asked for anywhere in sign-up", () => {
    for (const f of [["app", "(auth)", "register.tsx"], ["app", "(auth)", "login.tsx"], ["src", "components", "AgeCheckbox.tsx"]]) {
      assert.doesNotMatch(read(...f), /birth|\bDOB\b|birthday/i, f.join("/"));
    }
  });
});

describe("Export my data downloads a JSON file on the web (FAIL-905)", () => {
  function fakeEnv() {
    const log: string[] = [];
    const anchor: DownloadAnchor = { href: "", download: "", style: { display: "" }, click: () => void log.push(`click ${anchor.href} ${anchor.download}`) };
    let text = "";
    let type = "";
    let deferred: (() => void) | null = null;
    const env: DownloadEnv = {
      makeBlob: (t, ty) => {
        text = t;
        type = ty;
        return { blob: true };
      },
      createObjectURL: () => "blob:test-1",
      revokeObjectURL: (u) => void log.push(`revoke ${u}`),
      createAnchor: () => anchor,
      append: () => void log.push("append"),
      remove: () => void log.push("remove"),
      defer: (fn) => {
        deferred = fn;
      },
    };
    return { env, log, anchor, get text() { return text; }, get type() { return type; }, flush: () => deferred?.() };
  }
  test("a Blob of the JSON, an object URL, a hidden link that is clicked, then cleaned up", () => {
    const f = fakeEnv();
    downloadJson({ profile: { email: "a@b.test", avatar_data_url: "data:image/jpeg;base64,AAAA" } }, "ascendra-data-export-2026-11-10.json", f.env);
    assert.equal(f.type, "application/json");
    assert.deepEqual(JSON.parse(f.text), { profile: { email: "a@b.test", avatar_data_url: "data:image/jpeg;base64,AAAA" } });
    assert.equal(f.anchor.download, "ascendra-data-export-2026-11-10.json");
    assert.equal(f.anchor.style?.display, "none");
    assert.deepEqual(f.log, ["append", "click blob:test-1 ascendra-data-export-2026-11-10.json", "remove"]);
    f.flush();
    assert.equal(f.log.at(-1), "revoke blob:test-1", "the URL is released afterwards");
  });
  test("the file is named for the day", () => {
    assert.equal(exportFileName(new Date("2026-11-10T08:00:00Z")), "ascendra-data-export-2026-11-10.json");
  });
  test("the account screen downloads on the web and still shares on the phone", () => {
    const src = read("app", "(app)", "account.tsx");
    assert.match(src, /Platform\.OS === "web"/);
    assert.match(src, /downloadJson\(data, exportFileName\(\), browserDownloadEnv\(\)\)/);
    assert.match(src, /Share\.share\(/);
    assert.ok(src.indexOf("downloadJson(") < src.indexOf("Share.share("), "web is handled before the share sheet");
  });
});

describe("the legal version the app shows (FAIL-901)", () => {
  test("the app sends the legal version on every request, and it is the text it carries", () => {
    assert.equal(LEGAL_VERSION_HEADER, "X-Ascendra-Legal");
    assert.equal(TERMS_VERSION, "2026-11-10");
    assert.match(read("src", "api", "client.ts"), /\[LEGAL_VERSION_HEADER\]: TERMS_VERSION/);
    const backend = readFileSync(join(root, "..", "backend", "lib", "legal.ts"), "utf8");
    assert.match(backend, new RegExp(`LEGAL_VERSION_HEADER = "${LEGAL_VERSION_HEADER}"`));
  });
  test("both documents carry the new version and date", () => {
    const content = read("src", "content", "legal.ts");
    for (const n of ["TERMS", "PRIVACY"]) {
      const m = content.match(new RegExp(`export const ${n}: LegalDoc = \\{[\\s\\S]*?version: "([^"]+)",\\s*updated: "([^"]+)"`));
      assert.deepEqual([m?.[1], m?.[2]], ["2026-11-10", "November 10, 2026"], n);
    }
  });
  test("no placeholder, no draft banner; Nick's decisions are filled in", () => {
    const content = read("src", "content", "legal.ts");
    assert.doesNotMatch(content, /\[(Operator|Contact|State or country|Minimum age|Retention)[^\]]*\]/);
    assert.doesNotMatch(content, /Draft for legal review/);
    assert.doesNotMatch(read("src", "components", "LegalPage.tsx"), /doc\.status/);
    assert.match(content, /operator: "Nicholas Pauken"/);
    assert.match(content, /governingLaw: "the State of Washington, USA"/);
    assert.match(content, /minimumAge: "16"/);
    assert.match(content, /AI_COUNTS_MONTHS = 12/);
  });
});
