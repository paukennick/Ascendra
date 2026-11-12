// REQ-206 (batch F5): the pure rules behind the web-screen and accessibility
// fixes. FAIL-920 .. FAIL-939 name the defects; each describe says which.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { courseHome, goBackOr, HOME, type BackRouter } from "./goBack.ts";
import { isNotFound, NOT_FOUND_ACTION_LABEL } from "./notFound.ts";
import { HISTORY_KINDS, historyKindLabel } from "./historyKinds.ts";
import { DEFAULT_REMINDERS, reminderRowValue } from "./reminders.ts";
import { RESENT_MESSAGE } from "./verifyEmailPending.ts";
import { contrastRatio, blend, BADGE_WASH, ensureContrast } from "./contrast.ts";
import { colors } from "./theme.ts";
import { titleForPath } from "./routeTitles.ts";
import { followUpDraftKey, guessDraftKey } from "./drafts.ts";
import { localDataOwner } from "./localData.ts";
import {
  clearMfaHandoff,
  clearVerifyEmailHandoff,
  getMfaHandoff,
  getVerifyEmailHandoff,
  mfaHandoffFrom,
  setMfaHandoff,
  setVerifyEmailHandoff,
} from "./handoff.ts";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function fakeRouter(canGoBack: boolean) {
  const calls: string[] = [];
  const r: BackRouter = {
    canGoBack: () => canGoBack,
    back: () => void calls.push("back"),
    replace: (href) => void calls.push(`replace ${href}`),
  };
  return { r, calls };
}

describe("FAIL-921: Back after a reload or deep link", () => {
  test("goes back when there is a screen to return to", () => {
    const { r, calls } = fakeRouter(true);
    goBackOr(r, "/course/c1");
    assert.deepEqual(calls, ["back"]);
  });
  test("replaces with the parent when there is nothing to go back to", () => {
    const { r, calls } = fakeRouter(false);
    goBackOr(r, courseHome("c1"));
    assert.deepEqual(calls, ["replace /course/c1"]);
  });
  test("the course parent encodes the id and home is the root", () => {
    assert.equal(courseHome("a b/c"), "/course/a%20b%2Fc");
    assert.equal(HOME, "/");
  });
});

describe("FAIL-926: a missing thing offers a way out, not Retry", () => {
  test("only a 404 is not-found", () => {
    assert.equal(isNotFound({ status: 404 }), true);
    assert.equal(isNotFound(Object.assign(new Error("x"), { status: 404 })), true);
    assert.equal(isNotFound({ status: 500 }), false);
    assert.equal(isNotFound(new Error("Network")), false);
    assert.equal(isNotFound(null), false);
    assert.equal(isNotFound("404"), false);
  });
  test("the label says where it goes", () => {
    assert.equal(NOT_FOUND_ACTION_LABEL, "Go to my courses");
  });
});

describe("FAIL-936: history shows words, not stored ids", () => {
  test("every filter has a label that is not the raw id", () => {
    for (const k of HISTORY_KINDS) {
      const label = historyKindLabel(k);
      if (k !== "all" && k !== "review" && k !== "pbq") assert.notEqual(label, k, k);
      assert.ok(!/^[a-z]+$/.test(label) || label === k, label);
      assert.match(label, /^[A-Z]/);
    }
    assert.equal(historyKindLabel("unitcheck"), "Unit checks");
    assert.equal(historyKindLabel("labtask"), "Lab tasks");
  });
  test("an unknown kind is tidied, never shown with underscores", () => {
    assert.equal(historyKindLabel("new_kind"), "New kind");
    assert.equal(historyKindLabel(""), "Other");
  });
});

describe("FAIL-935: the reminders row shows the saved state", () => {
  test("off, on with the time, loading and unsupported", () => {
    assert.equal(reminderRowValue({ ...DEFAULT_REMINDERS, enabled: false }, true), "Off");
    assert.match(reminderRowValue({ ...DEFAULT_REMINDERS, enabled: true, time: 19 * 60 }, true), /^On, .*7.*(PM|19)/);
    assert.equal(reminderRowValue(null, true), "");
    assert.equal(reminderRowValue({ ...DEFAULT_REMINDERS, enabled: true }, false), "Phone app only");
  });
});

describe("FAIL-937: the 'Suggested' badge reaches 4.5:1 on the plan option it sits on", () => {
  test("on the accent-tinted option the text is lifted to AA", () => {
    const wash = blend(colors.accent, BADGE_WASH, colors.accentDim);
    // What the badge drew before: text lifted against a card, wash on the option.
    const before = contrastRatio(ensureContrast(colors.accent, blend(colors.accent, BADGE_WASH, colors.card), 4.5), wash);
    assert.ok(before < 4.5, `expected the old rule to miss AA, got ${before}`);
    const after = contrastRatio(ensureContrast(colors.accent, wash, 4.5), wash);
    assert.ok(after >= 4.5, `got ${after}`);
  });
});

describe("FAIL-938: the resend message says what is true", () => {
  test("each link lasts 24 hours from when it was sent; no claim about older links", () => {
    assert.match(RESENT_MESSAGE, /24 hours/);
    assert.doesNotMatch(RESENT_MESSAGE, /older links/i);
  });
});

describe("FAIL-927: every page has a title", () => {
  const appDir = new URL("../../app/", import.meta.url).pathname;
  function routes(dir: string, prefix: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        const seg = /^\(.*\)$/.test(name) ? "" : "/" + name.replace(/^\[.*\]$/, "abc");
        out.push(...routes(full, prefix + seg));
      } else if (name.endsWith(".tsx") && !name.startsWith("_") && !name.startsWith("+")) {
        const base = name.replace(/\.tsx$/, "").replace(/^\[.*\]$/, "abc");
        out.push(base === "index" ? prefix || "/" : `${prefix}/${base}`);
      }
    }
    return out;
  }
  test("every route file maps to a real title, not the bare app name", () => {
    const paths = routes(appDir, "");
    assert.ok(paths.length > 40, `found ${paths.length} routes`);
    const bare = paths.filter((p) => titleForPath(p) === "Ascendra" && p !== "/lock" && p !== "/lock/");
    assert.deepEqual(bare, []);
  });
  test("format, trailing slash and query", () => {
    assert.equal(titleForPath("/login"), "Log in | Ascendra");
    assert.equal(titleForPath("/course/abc/exam/?x=1"), "Practice exam | Ascendra");
    assert.equal(titleForPath("/nope"), "Ascendra");
  });
});

describe("FAIL-934: the email and challenge token stay out of the URL", () => {
  test("held in memory and cleared", () => {
    setVerifyEmailHandoff("  a@b.test ");
    assert.equal(getVerifyEmailHandoff(), "a@b.test");
    clearVerifyEmailHandoff();
    assert.equal(getVerifyEmailHandoff(), null);
    setMfaHandoff({ challengeToken: "t", totp: true, email: false });
    assert.deepEqual(getMfaHandoff(), { challengeToken: "t", totp: true, email: false });
    clearMfaHandoff();
    assert.equal(getMfaHandoff(), null);
  });
  test("a login result becomes a handoff only with a token", () => {
    assert.deepEqual(mfaHandoffFrom({ mfaRequired: true, challengeToken: "c", mfaMethods: { email: true } }), {
      challengeToken: "c",
      totp: false,
      email: true,
    });
    assert.equal(mfaHandoffFrom({ mfaRequired: true }), null);
    assert.equal(mfaHandoffFrom({ mfaRequired: false, challengeToken: "c" }), null);
  });
  test("no screen puts either in route params", () => {
    const dir = new URL("../../app/(auth)/", import.meta.url);
    for (const f of ["login.tsx", "register.tsx"]) {
      const src = readFileSync(new URL(f, dir), "utf8");
      assert.doesNotMatch(src, /params:\s*\{[^}]*(challengeToken|email:)/s, f);
    }
  });
});

describe("FAIL-939: typed text survives a reload and is swept at sign-out", () => {
  test("the dispute and guess drafts are keyed to the user so the logout sweep finds them", () => {
    assert.equal(localDataOwner(followUpDraftKey("u1", "o1", "fade")), "u1");
    assert.equal(localDataOwner(guessDraftKey("u1", "o.1")), "u1");
    assert.notEqual(followUpDraftKey("u1", "o1", "fade"), followUpDraftKey("u1", "o1", "solo"));
  });
});

describe("FAIL-922..925: wiring that the keyboard and screen readers depend on (static)", () => {
  const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
  test("signed-in screens wait for the session before they mount", () => {
    const layout = read("app/(app)/_layout.tsx");
    assert.match(layout, /status === "loading" \|\| status === "locked"/);
  });
  test("the register Terms checkbox is its own control and the links are outside it", () => {
    const reg = read("app/(auth)/register.tsx");
    assert.match(reg, /<Checkbox/);
    assert.doesNotMatch(reg, /accessibilityRole="checkbox"/);
    const ui = read("src/components/ui.tsx");
    assert.match(ui, /export function Checkbox/);
    assert.match(ui, /accessibilityRole="checkbox"/);
    assert.match(ui, /checkboxHit: \{ width: MIN_TOUCH, height: MIN_TOUCH/);
  });
  test("Enter submits login, register, reset, MFA and the lock", () => {
    for (const f of ["app/(auth)/login.tsx", "app/(auth)/register.tsx", "app/(auth)/forgot-password.tsx", "app/(auth)/mfa-challenge.tsx", "src/components/AppLock.tsx"]) {
      assert.match(read(f), /onSubmitEditing/, f);
    }
    assert.match(read("src/components/ui.tsx"), /enterKeyHint=\{returnKeyType\}/);
  });
  test("headings carry a role and a level, and the screen is the main landmark", () => {
    const ui = read("src/components/ui.tsx");
    assert.match(ui, /role: "heading", "aria-level": level/);
    assert.match(ui, /role="main"/);
  });
  test("every Back goes through the fallback helper; none calls router.back() directly", () => {
    const dirs = ["app/(app)", "app/(auth)"];
    const offenders: string[] = [];
    const walk = (rel: string) => {
      const base = new URL(`../../${rel}/`, import.meta.url);
      for (const name of readdirSync(base)) {
        const p = `${rel}/${name}`;
        if (statSync(new URL(`../../${p}`, import.meta.url)).isDirectory()) walk(p);
        else if (name.endsWith(".tsx") && /router\.back\(\)/.test(read(p))) offenders.push(p);
      }
    };
    dirs.forEach(walk);
    assert.deepEqual(offenders, []);
  });
});

describe("FAIL-928..933, 938: roles, labels, wording and structure (static)", () => {
  const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
  test("FAIL-928: the current choice in the lock sheet is marked by a check and 'selected', not color alone", () => {
    assert.match(read("app/(app)/settings.tsx"), /selected: o === lockAfter/);
    const ui = read("src/components/ui.tsx");
    assert.match(ui, /selected\?: boolean/);
    assert.match(ui, /shownIcon = icon \?\? \(selected \? "check" : undefined\)/);
  });
  test("FAIL-930: the avatar, name, Mastery rows, biometric switch and 'All' chips are named controls", () => {
    const account = read("app/(app)/account.tsx");
    assert.match(account, /accessibilityLabel="Change profile photo"/);
    assert.match(account, /Display name: /);
    // REQ-250: the row also says when the lesson has a saved place.
    assert.match(read("app/(app)/course/[trackId]/progress.tsx"), /accessibilityLabel=\{`\$\{o\.title\}, \$\{status\}(\$\{saved \? `\. \$\{SAVED_PLACE_LABEL\}` : ""\})?\. Open lesson`\}/);
    assert.match(read("app/(app)/settings.tsx"), /accessibilityRole="switch"/);
    const explore = read("app/(app)/explore.tsx");
    assert.match(explore, /All categories/);
    assert.match(explore, /All verification states/);
  });
  test("FAIL-931: the idle warning is counted while locked and shown on the lock", () => {
    const auth = read("src/auth/AuthContext.tsx");
    assert.doesNotMatch(auth, /!appLockedRef\.current && remaining <= WEB_IDLE_WARNING_LEAD_MS/);
    assert.match(auth, /remaining <= WEB_IDLE_WARNING_LEAD_MS \? Math\.ceil/);
    assert.match(read("src/components/AppLock.tsx"), /signed out in under a minute/);
    assert.match(read("app/_layout.tsx"), /webIdleWarningSecondsLeft !== null && !appLocked/);
  });
  test("FAIL-932: signing out of every device asks first", () => {
    const account = read("app/(app)/account.tsx");
    assert.match(account, /onPress=\{confirmLogoutAll\}/);
    assert.doesNotMatch(account, /onPress=\{\(\) => logoutAll\(\)\}/);
  });
  test("FAIL-933: the course card's star is not inside a pressable card", () => {
    const card = read("src/components/CourseCard.tsx");
    assert.doesNotMatch(card, /<Card onPress/);
    assert.match(card, /<Card>/);
  });
  test("FAIL-938: one 'Sign out' wording, no '--' in a button label, content width capped", () => {
    for (const f of ["app/(app)/account.tsx", "src/components/Sidebar.tsx", "src/components/AppLock.tsx"]) {
      assert.doesNotMatch(read(f), /label="Log out/, f);
    }
    assert.doesNotMatch(read("src/lib/studyNotice.ts"), /_LABEL = ".*--/);
    assert.doesNotMatch(read("src/components/labReport.tsx"), /label="[^"]*--/);
    assert.match(read("src/components/ui.tsx"), /CONTENT_MAX_WIDTH = 720/);
  });
  test("FAIL-929: verdicts, coach replies and the resend notice go through a live announcement", () => {
    for (const f of ["app/(app)/course/[trackId]/lesson/[objectiveId].tsx", "app/(app)/course/[trackId]/compare.tsx", "app/(app)/course/[trackId]/pbq.tsx", "app/(app)/course/[trackId]/chat.tsx", "app/(auth)/verify-email-pending.tsx"]) {
      assert.match(read(f), /<LiveAnnouncement/, f);
    }
  });
});
