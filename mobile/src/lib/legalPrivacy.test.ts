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
  test("the Google flow recognizes only the server's age answer", () => {
    assert.equal(AGE_CONFIRMATION_CODE, "age_confirmation_required");
    assert.equal(isAgeConfirmationRequired({ status: 400, data: { code: "age_confirmation_required" } }), true);
    assert.equal(isAgeConfirmationRequired({ status: 400, data: { code: "other" } }), false);
    assert.equal(isAgeConfirmationRequired({ status: 401, data: { code: "age_confirmation_required" } }), false);
    assert.equal(isAgeConfirmationRequired(new Error("x")), false);
    assert.equal(isAgeConfirmationRequired(null), false);
  });
  test("the checkbox is accessible: it is the shared Checkbox (REQ-206): a checkbox role, a label, a checked state, a 44-point target", () => {
    const box = read("src", "components", "AgeCheckbox.tsx");
    assert.match(box, /<Checkbox checked=\{checked\} onChange=\{\(\) => onToggle\(\)\} label=\{AGE_CONFIRMATION_LABEL\}/);
    const ui = read("src", "components", "ui.tsx");
    const shared = ui.slice(ui.indexOf("export function Checkbox"), ui.indexOf("function colorForPercent"));
    assert.match(shared, /accessibilityRole="checkbox"/);
    assert.match(shared, /accessibilityLabel=\{label\}/);
    assert.match(shared, /accessibilityState=\{\{ checked \}\}/);
    assert.ok(Number(/MIN_TOUCH = (\d+)/.exec(ui)?.[1]) >= 44, "the shared target is at least 44 points");
    assert.match(ui, /checkboxHit: \{ width: MIN_TOUCH, height: MIN_TOUCH/);
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
  test("Google sign-in hands its MFA challenge over in memory, like password sign-in (FAIL-895)", () => {
    // finishGoogle (REQ-205) was written while /mfa-challenge still read its token from the URL;
    // REQ-206 moved that screen to the in-memory handoff, which a URL-param push never fills.
    const login = read("app", "(auth)", "login.tsx");
    const fn = login.slice(login.indexOf("const finishGoogle"), login.indexOf("const onGooglePress"));
    assert.match(fn, /mfaHandoffFrom\(result\)/);
    assert.match(fn, /setMfaHandoff\(mfa\)/);
    assert.doesNotMatch(fn, /challengeToken:/);
    assert.doesNotMatch(login, /params:\s*\{\s*challengeToken/);
    const challenge = read("app", "(auth)", "mfa-challenge.tsx");
    assert.match(challenge, /getMfaHandoff\(\)/);
    assert.doesNotMatch(challenge, /useLocalSearchParams/);
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
    // REQ-261: the newer of the Terms (2026-11-13) and the Privacy Policy (2026-11-14).
    assert.equal(TERMS_VERSION, "2026-11-14");
    assert.match(read("src", "api", "client.ts"), /\[LEGAL_VERSION_HEADER\]: TERMS_VERSION/);
    const backend = readFileSync(join(root, "..", "backend", "lib", "legal.ts"), "utf8");
    assert.match(backend, new RegExp(`LEGAL_VERSION_HEADER = "${LEGAL_VERSION_HEADER}"`));
  });
  test("each document carries its own version and date: the Terms stay 2026-11-13, the Privacy Policy and Cookies are 2026-11-14 (REQ-261)", () => {
    const content = read("src", "content", "legal.ts");
    const expected: Record<string, [string, string]> = {
      TERMS: ["2026-11-13", "November 13, 2026"],
      PRIVACY: ["2026-11-14", "November 14, 2026"],
      COOKIES: ["2026-11-14", "November 14, 2026"],
    };
    for (const [n, want] of Object.entries(expected)) {
      const m = content.match(new RegExp(`export const ${n}: LegalDoc = \\{[\\s\\S]*?version: "([^"]+)",\\s*updated: "([^"]+)"`));
      assert.deepEqual([m?.[1], m?.[2]], want, n);
    }
  });
  test("REQ-260: the date of birth asked for mental health courses is disclosed, never denied", () => {
    const content = read("src", "content", "legal.ts");
    assert.doesNotMatch(content, /don't ask for (or keep )?(your|a) date of birth/);
    assert.match(content, /your date of birth \(asked once, the first time\)/);
    assert.match(content, /true to the best of your knowledge/);
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

// REQ-261: website analytics (Vercel Web Analytics and Speed Insights on the
// web app, src/lib/webAnalytics.web.ts) are disclosed, and the policy never
// mentions them without the facts that make them acceptable: cookieless, and
// off for Global Privacy Control and Do Not Track.
describe("website analytics in the policy (REQ-261)", () => {
  // src/content/legal.ts imports a sibling without an extension, which Node
  // can't load, so the documents are read from the source: each `export const
  // NAME: LegalDoc`, its `version`, and its sections' titles and paragraphs
  // (the quoted or template strings on a line of their own).
  type Doc = { version: string; sections: { title: string; body: string[] }[] };
  const source = read("src", "content", "legal.ts");
  const parse = (name: string): Doc => {
    const start = source.indexOf(`export const ${name}: LegalDoc`);
    assert.ok(start >= 0, name);
    const rest = source.slice(start + 10);
    const end = rest.search(/\nexport const |\n\/\/ Disclaimer sections/);
    const chunk = source.slice(start, end < 0 ? undefined : start + 10 + end);
    const parts = chunk.split(/\n\s+title: "/).slice(1);
    return {
      version: /version: "([^"]+)"/.exec(chunk)![1],
      sections: parts.map((part) => ({
        title: part.slice(0, part.indexOf('"')),
        body: [...part.matchAll(/^\s+(?:"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`),$/gm)].map((m) => (m[1] ?? m[2]).replace(/\\"/g, '"')),
      })),
    };
  };
  const PRIVACY = parse("PRIVACY");
  const COOKIES = parse("COOKIES");
  const TERMS = parse("TERMS");
  const DISCLAIMER = parse("DISCLAIMER");
  const FAQ = parse("FAQ");
  const paragraphs = (doc: { sections: { title: string; body: string[] }[] }) =>
    doc.sections.flatMap((sec) => sec.body.map((text) => ({ section: sec.title, text })));
  const COOKIELESS = /cookieless|no cookies|sets? no cookies|store nothing on your device|stores nothing on your device/i;
  const mentions = [...paragraphs(PRIVACY).map((p) => ({ doc: "Privacy", ...p })), ...paragraphs(COOKIES).map((p) => ({ doc: "Cookies", ...p }))].filter((p) => /analytics/i.test(p.text));

  test("every paragraph that says analytics also says cookieless and Global Privacy Control and Do Not Track", () => {
    assert.ok(mentions.length >= 4, "Privacy 2 and 4, and Cookies twice, mention it");
    for (const p of mentions) {
      assert.match(p.text, COOKIELESS, `${p.doc} ${p.section}: cookieless`);
      assert.match(p.text, /Global Privacy Control/, `${p.doc} ${p.section}: Global Privacy Control`);
      assert.match(p.text, /Do Not Track/, `${p.doc} ${p.section}: Do Not Track`);
    }
  });

  test("it is disclosed in Privacy sections 2, 3, 4 and 6 and in the Cookies page", () => {
    const at = (n: number) => PRIVACY.sections.find((sec) => sec.title.startsWith(`${n}.`))!.body.join("\n");
    assert.match(at(2), /Vercel's cookieless website analytics/);
    assert.match(at(2), /mobile app has no analytics software/);
    assert.match(at(3), /which pages of the website are used and how fast they load/);
    assert.match(at(4), /Vercel — runs the website[^\n]*Web Analytics and Speed Insights/);
    assert.match(at(6), /page-view and speed figures[^\n]*not linked to your account/);
    assert.ok(COOKIES.sections.some((sec) => /Website analytics store nothing on your device/.test(sec.title)));
  });

  test("section 4 says what a page view sends, after the redaction, and what the app does not send", () => {
    const vercel = PRIVACY.sections.find((sec) => sec.title.startsWith("4."))!.body.find((t) => t.startsWith("• Vercel"))!;
    for (const fact of [
      /query string and anything after a # removed/,
      /any part that looks like an ID or a token replaced \(for example \/course\/:id\/lesson\/:id\)/,
      /the site that sent you \(the referrer\)/,
      /how fast the page loaded and which element of the page was slowest/,
      /browser, operating system, device type and approximate location/,
      /sets no cookies and stores nothing on your device/,
      /hash of the request that it discards after 24 hours/,
      /cannot identify you or follow you across sites/,
      /receives no name, email address or account ID from us/,
    ]) assert.match(vercel, fact);
  });

  test("the retention and deletion lists say the figures are anonymous and not linked to the account", () => {
    const six = PRIVACY.sections.find((sec) => sec.title.startsWith("6."))!.body;
    assert.equal(six.filter((t) => /page-view and speed figures/.test(t) && /not linked to your account|never linked to your account/.test(t)).length, 2);
  });

  test("the Cookies page keeps its promise: nothing optional is stored without a consent prompt first", () => {
    const banner = COOKIES.sections.find((sec) => sec.title === "Why there is no consent banner")!.body.join(" ");
    assert.match(banner, /store nothing on your device/);
    assert.match(banner, /does store data on your device and isn't strictly necessary, this page and a consent prompt will come first/);
    assert.doesNotMatch(COOKIES.sections.map((sec) => sec.body.join(" ")).join(" "), /If we ever add anything optional, such as analytics/);
  });

  test("the old claims are gone, and no other document mentions analytics", () => {
    const all = JSON.stringify(PRIVACY);
    assert.doesNotMatch(all, /no analytics trackers/);
    for (const [name, doc] of Object.entries({ TERMS, DISCLAIMER, FAQ })) assert.doesNotMatch(JSON.stringify(doc), /analytics/i, name);
  });

  test("only the Privacy Policy and Cookies moved; the Terms are unchanged by this", () => {
    assert.equal(TERMS.version, "2026-11-13");
    assert.equal(PRIVACY.version, "2026-11-14");
    assert.equal(COOKIES.version, "2026-11-14");
  });
});
