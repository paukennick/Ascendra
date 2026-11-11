// REQ-212: the login workflows on Android. FAIL-1002 .. FAIL-1004 name the
// defects; each describe says which. Device behaviour (the OS prompt, the
// autofill service) can't run here, so the wiring is pinned by reading the
// source, the way f5WebA11y.test.ts does.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { keepsBiometricPreference, launchStateFor, showBiometricSignIn, type SealedSessionEnd } from "./sessionStore.ts";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const auth = read("../auth/AuthContext.tsx");
const login = read("../../app/(auth)/login.tsx");
const register = read("../../app/(auth)/register.tsx");
const mfa = read("../../app/(auth)/mfa-challenge.tsx");
const forgot = read("../../app/(auth)/forgot-password.tsx");
const ui = read("../components/ui.tsx");

function between(src: string, start: string, end: string): string {
  const a = src.indexOf(start);
  assert.ok(a >= 0, `missing ${start}`);
  const b = src.indexOf(end, a + start.length);
  assert.ok(b > a, `missing ${end} after ${start}`);
  return src.slice(a, b);
}

// The TextField whose label is `label`, as written in a screen.
function field(src: string, label: string): string {
  const a = src.indexOf(`label="${label}"`);
  assert.ok(a >= 0, `no field labelled ${label}`);
  return src.slice(a, src.indexOf("/>", a));
}

describe("biometrics stay on when leaving the lock for sign-in or Create account (FAIL-1002)", () => {
  test("only Sign out of all devices turns the preference off", () => {
    const reasons: SealedSessionEnd[] = ["logout", "passwordInstead", "sealedTokenMissing", "sealedTokenRejected"];
    for (const r of reasons) assert.equal(keepsBiometricPreference(r), true, r);
    assert.equal(keepsBiometricPreference("logoutAll"), false);
  });
  test("after 'Use password instead' the next launch goes to sign-in, and the preference is kept", () => {
    // endSealedSession writes "0" and leaves BIOMETRIC_ENABLED_KEY alone.
    assert.equal(launchStateFor(true, "0"), "resume");
  });
  test("useFallbackSignIn and unlockWithBiometric end the sealed session without dropping the preference", () => {
    const fallback = between(auth, "const useFallbackSignIn = useCallback", "}, [");
    assert.match(fallback, /endSealedSession\("passwordInstead"\)/);
    const unlock = between(auth, "const unlockWithBiometric = useCallback", "const unlockMethod =");
    assert.match(unlock, /endSealedSession\("sealedTokenMissing"\)/);
    assert.match(unlock, /endSealedSession\("sealedTokenRejected"\)/);
    assert.doesNotMatch(unlock + fallback, /BIOMETRIC_ENABLED_KEY/);
  });
  test("the preference key is deleted only by disableBiometric and the logoutAll branch", () => {
    const deletes = auth.match(/deleteItem\(BIOMETRIC_ENABLED_KEY\)/g) ?? [];
    assert.equal(deletes.length, 2);
    const end = between(auth, "const endSealedSession = useCallback", "}, []);");
    assert.ok(end.indexOf("keepsBiometricPreference(reason)") < end.indexOf("deleteItem(BIOMETRIC_ENABLED_KEY)"));
    assert.match(between(auth, "const logoutAll = useCallback", "}, ["), /endSealedSession\("logoutAll"\)/);
    assert.doesNotMatch(auth, /clearBiometricEnrollment/);
  });
  test("no auth screen touches biometric state on its own", () => {
    for (const name of readdirSync(new URL("../../app/(auth)/", import.meta.url))) {
      const src = read(`../../app/(auth)/${name}`);
      assert.doesNotMatch(src, /disableBiometric|useFallbackSignIn|BIOMETRIC_/, name);
    }
  });
});

describe("the login screen's biometric button needs a sealed session (FAIL-1003)", () => {
  test("shown only with hardware, the preference, and a sealed session", () => {
    assert.equal(showBiometricSignIn(true, true, "1"), true);
    assert.equal(showBiometricSignIn(true, true, null), true, "installs from before the flag");
    assert.equal(showBiometricSignIn(true, true, "0"), false, "after a logout there is nothing to unlock");
    assert.equal(showBiometricSignIn(false, true, "1"), false);
    assert.equal(showBiometricSignIn(true, false, "1"), false);
  });
  test("login.tsx gates the button on biometricSignInReady", () => {
    assert.match(login, /\{biometricSignInReady \? \(/);
    assert.doesNotMatch(login, /biometricAvailable && biometricEnabled/);
    assert.match(auth, /biometricSignInReady: showBiometricSignIn\(biometricAvailable, biometricEnabled, biometricSessionFlag\)/);
  });
  test("every write of the sealed-session flag updates the state the button reads", () => {
    const writes = auth.match(/setItem\(BIOMETRIC_SESSION_KEY, "[01]"\)/g) ?? [];
    const mirrors = auth.match(/setBiometricSessionFlag\("[01]"\)/g) ?? [];
    assert.ok(writes.length >= 5);
    assert.ok(mirrors.length >= writes.length, `${mirrors.length} state updates for ${writes.length} writes`);
  });
});

describe("autofill hints reach the native field (FAIL-1004 and the reported login autofill)", () => {
  test("login pairs username with current-password, both opted in to Android autofill", () => {
    const email = field(login, "Email");
    assert.match(email, /autoComplete="username"/);
    assert.match(email, /textContentType="username"/);
    assert.match(email, /importantForAutofill="yes"/);
    assert.match(email, /keyboardType="email-address"/);
    const pw = field(login, "Password");
    assert.match(pw, /autoComplete="current-password"/);
    assert.match(pw, /textContentType="password"/);
    assert.match(pw, /importantForAutofill="yes"/);
    assert.match(pw, /secureTextEntry/);
  });
  test("register pairs username with new-password", () => {
    assert.match(field(register, "Email"), /autoComplete="username"/);
    assert.match(field(register, "Password"), /autoComplete="new-password"/);
    assert.match(field(register, "Confirm password"), /autoComplete="new-password"/);
  });
  test("forgot-password keeps the plain email hint", () => {
    assert.match(forgot, /autoComplete="email"/);
  });
  test("the MFA code field has an Android hint (textContentType alone is iOS-only)", () => {
    assert.match(mfa, /autoComplete=\{useBackupCode \? "off" : "one-time-code"\}/);
  });
  test("TextField forwards the autofill props and nothing overrides them", () => {
    const tf = between(ui, "export function TextField(", "export function Checkbox(");
    for (const p of ["textContentType", "autoComplete", "importantForAutofill", "keyboardType"]) {
      assert.match(tf, new RegExp(`\\| "${p}"`), `${p} is in the passthrough type`);
    }
    const input = between(tf, "<TextInput", "/>");
    assert.match(input, /\{\.\.\.rest\}\s*$/, "rest is spread last, so the screen's hints win");
    assert.doesNotMatch(tf, /importantForAutofill=|autoComplete=/, "the wrapper sets no autofill prop of its own");
  });
  test("nothing above the screens excludes them from autofill", () => {
    const layout = read("../../app/_layout.tsx");
    assert.doesNotMatch(layout + ui, /importantForAutofill="no/);
  });
  test("the website's asset links name this app's package", () => {
    const links = JSON.parse(read("../../../backend/public/.well-known/assetlinks.json"));
    const app = JSON.parse(read("../../app.json"));
    const pkgs = links.map((s: { target: { package_name: string } }) => s.target.package_name);
    assert.ok(pkgs.includes(app.expo.android.package));
    assert.ok(links.some((s: { relation: string[] }) => s.relation.includes("delegate_permission/common.get_login_creds")));
  });
});
