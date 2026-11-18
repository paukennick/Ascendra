// REQ-339 (FAIL-2550..2559): the refresh-token state machine (tokenVault.ts),
// driven against a fake secure store and a fake server that rotates tokens
// and revokes the family on a replay outside the 10 s grace, the way
// backend/lib/auth/tokens.ts rotateRefreshToken does.
//
// Each scenario runs twice where it can: once against a model of the code
// the phone ran on 2026-11-17/18 (AuthContext at a0c9866c, identical on
// master before this fix), which reproduces Nick's sign-out, and once against
// the vault, which keeps the session.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createTokenVault,
  ReloadPendingError,
  TOKEN_KEYS,
  type Exchange,
  type ExchangeOutcome,
  type SealOptions,
  type VaultStorage,
} from "./tokenVault.ts";
import { refreshAfter401 } from "./sessionStore.ts";
import { prepareForReload, registerReloadGuard, reloadAbandoned } from "./reloadGuard.ts";

const K = TOKEN_KEYS;
const SEAL: SealOptions = { requireAuthentication: true, authenticationPrompt: "Unlock Ascendra" };

// ---------------------------------------------------------------- helpers

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

async function until(cond: () => boolean): Promise<void> {
  for (let i = 0; i < 50 && !cond(); i++) await tick();
  assert.ok(cond(), "condition not reached");
}

// The OS secure store. A sealed write waits on `prompt` when one is set (the
// Android fingerprint prompt), and `kill()` ends the process: nothing it
// writes afterwards lands, and `restart()` hands a new launch what is stored.
class FakeStore implements VaultStorage {
  data = new Map<string, string>();
  prompt: Promise<void> | null = null;
  dead = false;
  sealedWrites = 0;
  async getItem(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }
  async setItem(key: string, value: string, options?: SealOptions): Promise<void> {
    if (options?.requireAuthentication) {
      this.sealedWrites++;
      if (this.prompt) await this.prompt;
    }
    await tick();
    if (!this.dead) this.data.set(key, value);
  }
  async deleteItem(key: string): Promise<void> {
    await tick();
    if (!this.dead) this.data.delete(key);
  }
  kill(): void {
    this.dead = true;
  }
  restart(): FakeStore {
    const next = new FakeStore();
    next.data = new Map(this.data);
    return next;
  }
}

// The server. Tokens are "t0", "t1", ... in one family. Presenting the live
// token rotates it; a spent one within the grace gets a sibling; a spent one
// outside it revokes the family (401).
class FakeServer {
  now = 0;
  private n = 0;
  live: string | null;
  private spentAt = new Map<string, number>();
  revoked = false;
  sent: string[] = [];
  hold: Promise<void> | null = null;
  constructor(first = "t0") {
    this.live = first;
    this.n = Number(first.slice(1));
  }
  exchange: Exchange = async (token) => {
    this.sent.push(token);
    const res = this.rotate(token); // committed on the server before any response
    if (this.hold) await this.hold;
    await tick();
    return res;
  };
  private rotate(token: string): ExchangeOutcome {
    if (this.revoked) return { ok: false, expired: true, error: { status: 401 } };
    if (token === this.live) {
      this.spentAt.set(token, this.now);
      this.live = `t${++this.n}`;
      return { ok: true, accessToken: `a${this.n}`, refreshToken: this.live };
    }
    const spent = this.spentAt.get(token);
    if (spent === undefined) return { ok: false, expired: true, error: { status: 401, reason: "unknown" } };
    if (this.now - spent <= 10_000) return { ok: true, accessToken: "grace", refreshToken: `g${++this.n}` };
    this.revoked = true; // reuse outside the grace: theft signal
    this.live = null;
    return { ok: false, expired: true, error: { status: 401, reason: "reuse" } };
  }
}

function vaultOver(store: VaultStorage, biometric = true) {
  return createTokenVault({ storage: store, sealOptions: SEAL, biometricOn: () => biometric });
}

// A model of the phone's code before this fix (AuthContext.tsx at a0c9866c:
// storeSessionToken, refresh, unlockWithBiometric and the background handler).
function legacyApp(store: FakeStore, server: FakeServer) {
  const s = { mem: null as string | null, dirty: false, suspended: false };
  async function storeSessionToken(token: string) {
    s.dirty = false;
    try {
      await store.setItem(K.sealed, token, SEAL);
      await store.setItem(K.sessionFlag, "1");
      await store.deleteItem(K.latest);
      s.suspended = false;
      await store.deleteItem(K.plain);
    } catch {
      s.suspended = true;
      await store.setItem(K.plain, token);
      await store.deleteItem(K.sealed);
      await store.deleteItem(K.latest);
      await store.setItem(K.sessionFlag, "0");
    }
  }
  return {
    s,
    async refresh() {
      const token = s.mem ?? (await store.getItem(K.plain));
      if (!token) return false;
      const res = await server.exchange(token);
      if (!res.ok) return false;
      s.mem = res.refreshToken;
      if (!s.suspended) {
        s.dirty = true;
        await store.setItem(K.latest, res.refreshToken);
      } else await store.setItem(K.plain, res.refreshToken);
      return true;
    },
    async unlock() {
      const sealed = await store.getItem(K.sealed);
      if (!sealed) return false;
      const latest = await store.getItem(K.latest);
      const use = latest || sealed;
      s.mem = use;
      const res = await server.exchange(use);
      if (!res.ok) return false;
      s.mem = res.refreshToken;
      await storeSessionToken(res.refreshToken);
      return true;
    },
    // AppState "background": the sealed write is started, not awaited.
    background(): Promise<void> | undefined {
      if (s.dirty && s.mem) return storeSessionToken(s.mem).catch(() => undefined);
      return undefined;
    },
    storeSessionToken,
  };
}

// A launch of the fixed app, as AuthContext drives the vault.
function fixedApp(store: FakeStore, server: FakeServer) {
  const vault = vaultOver(store);
  return {
    vault,
    refresh: () => vault.refresh(server.exchange),
    async unlock() {
      const sealed = await store.getItem(K.sealed);
      if (!sealed) return false;
      const res = await vault.unlock(sealed, server.exchange);
      if (!res.ok) return false;
      await vault.seal();
      return true;
    },
    background(): Promise<unknown> | undefined {
      return vault.dirty && vault.current ? vault.seal() : undefined;
    },
  };
}

// The phone on the evening of 11-17: unlocked, sealed copy current, then a
// silent refresh that left the sealed copy behind (t1 sealed, t2 live).
async function eveningState(make: typeof legacyApp | typeof fixedApp) {
  const store = new FakeStore();
  store.data.set(K.sealed, "t0");
  store.data.set(K.sessionFlag, "1");
  const server = new FakeServer("t0");
  const app = make(store, server);
  assert.equal(await app.unlock(), true); // t0 -> t1, sealed t1
  server.now += 15 * 60_000;
  assert.ok(await app.refresh()); // t1 -> t2 (in memory and "latest")
  return { store, server, app };
}

async function nextMorningUnlock(store: FakeStore, server: FakeServer, make: typeof legacyApp | typeof fixedApp) {
  server.now += 9 * 3600_000;
  const launch = make(store.restart(), server);
  return launch.unlock();
}

// ------------------------------------------------------------- scenarios

describe("REQ-339 (FAIL-2550): a background seal that finishes after a rotation", () => {
  // Android asks for the fingerprint on every sealed write, so the background
  // seal of t2 waits on a prompt; on return a refresh rotates t2 -> t3; the
  // learner then answers the stale prompt.
  async function run(make: typeof legacyApp | typeof fixedApp, answer: "confirm" | "cancel") {
    const { store, server, app } = await eveningState(make);
    const prompt = deferred();
    store.prompt = prompt.promise;
    const writes = store.sealedWrites;
    const sealing = app.background(); // seal(t2) waits on the prompt
    await until(() => store.sealedWrites > writes);
    server.now += 4 * 3600_000; // 23:57: back in the app, access token expired
    store.prompt = null;
    assert.ok(await app.refresh()); // t2 -> t3, "latest" = t3
    if (answer === "confirm") prompt.resolve();
    else prompt.reject(new Error("canceled"));
    await sealing;
    await tick();
    store.kill(); // closed or reloaded before the next background
    return { store, server };
  }

  test("before: the stale seal deletes latest=t3 and the morning unlock replays t2 (family revoked)", async () => {
    const { store, server } = await run(legacyApp, "confirm");
    assert.equal(store.data.get(K.sealed), "t2");
    assert.equal(store.data.get(K.latest), undefined, "the newest token is gone from the phone");
    assert.equal(await nextMorningUnlock(store, server, legacyApp), false);
    assert.equal(server.revoked, true);
  });
  test("after: latest keeps t3 because the seal covered an older token, and the unlock sends t3", async () => {
    const { store, server } = await run(fixedApp, "confirm");
    assert.equal(store.data.get(K.sealed), "t2");
    assert.equal(store.data.get(K.latest), "t3");
    assert.equal(await nextMorningUnlock(store, server, fixedApp), true);
    assert.equal(server.revoked, false);
    assert.equal(server.sent.at(-1), "t3");
  });
  test("before: a canceled stale prompt puts t2 on the plain key and the resume replays it", async () => {
    const { store, server } = await run(legacyApp, "cancel");
    assert.equal(store.data.get(K.plain), "t2");
    assert.equal(store.data.get(K.sessionFlag), "0");
    server.now += 9 * 3600_000;
    const res = await server.exchange(store.data.get(K.plain)!);
    assert.equal(res.ok, false);
    assert.equal(server.revoked, true);
  });
  test("after: a canceled stale prompt puts the newest token (t3) on the plain key", async () => {
    const { store, server } = await run(fixedApp, "cancel");
    assert.equal(store.data.get(K.plain), "t3");
    assert.equal(store.data.get(K.sessionFlag), "0");
    server.now += 9 * 3600_000;
    const launch = vaultOver(store.restart());
    const res = await launch.refresh(server.exchange);
    assert.equal(res.ok, true);
    assert.equal(server.revoked, false);
  });
});

describe("REQ-339 (FAIL-2551): persist before use on the unlock path", () => {
  // The unlock rotates the token, then seals the new one, which on Android is
  // a second fingerprint prompt. The app is closed or reloaded during it.
  async function run(make: typeof legacyApp | typeof fixedApp) {
    const store = new FakeStore();
    store.data.set(K.sealed, "t0");
    store.data.set(K.sessionFlag, "1");
    const server = new FakeServer("t0");
    const app = make(store, server);
    const prompt = deferred();
    const realSet = store.setItem.bind(store);
    let sealedWrites = 0;
    store.setItem = async (key, value, options) => {
      if (options?.requireAuthentication && ++sealedWrites === 1) await prompt.promise;
      return realSet(key, value, options);
    };
    void app.unlock();
    await until(() => sealedWrites === 1); // the seal prompt is up
    store.kill();
    return { store, server };
  }
  test("before: the new token was only in memory; the next unlock replays t0", async () => {
    const { store, server } = await run(legacyApp);
    assert.equal(await nextMorningUnlock(store, server, legacyApp), false);
    assert.equal(server.revoked, true);
  });
  test("after: t1 was on the latest key before the prompt; the next unlock sends it", async () => {
    const { store, server } = await run(fixedApp);
    assert.equal(store.data.get(K.latest), "t1");
    assert.equal(await nextMorningUnlock(store, server, fixedApp), true);
    assert.equal(server.revoked, false);
  });
});

describe("REQ-339 (FAIL-2553): an update reload never cuts a refresh in half", () => {
  // useAppUpdates' silent apply: back after five minutes, a downloaded update
  // is applied at once, while the refresh that same return set off is in
  // flight. The server has rotated; the reload discards the answer.
  test("before (no guard): the reload lands mid-exchange and the next unlock replays the old token", async () => {
    const { store, server, app } = await eveningState(legacyApp);
    const hold = deferred();
    server.hold = hold.promise;
    void app.refresh(); // server rotates t2 -> t3 now
    await tick();
    store.kill(); // Updates.reloadAsync()
    hold.resolve();
    assert.equal(server.live, "t3");
    assert.equal(await nextMorningUnlock(store, server, legacyApp), false);
    assert.equal(server.revoked, true);
  });
  test("after: quiesce waits for the exchange to be stored, then the reload is safe", async () => {
    const { store, server, app } = await eveningState(fixedApp);
    const hold = deferred();
    server.hold = hold.promise;
    const inFlight = app.refresh();
    await tick();
    const quiet = app.vault.quiesce(5_000);
    let done = false;
    void quiet.then(() => (done = true));
    await tick();
    assert.equal(done, false, "still waiting on the exchange");
    hold.resolve();
    server.hold = null;
    assert.equal(await quiet, true);
    assert.equal((await inFlight).ok, true);
    assert.equal(store.data.get(K.latest), "t3");
    store.kill(); // the reload
    assert.equal(await nextMorningUnlock(store, server, fixedApp), true);
    assert.equal(server.revoked, false);
  });
  test("after: a refresh asked for once the reload is decided is refused as 'unavailable', never 'expired'", async () => {
    const { server, app } = await eveningState(fixedApp);
    assert.equal(await app.vault.quiesce(1_000), true);
    const sentBefore = server.sent.length;
    const res = await app.refresh();
    assert.equal(res.ok, false);
    assert.ok(!res.ok && res.expired === false && res.error instanceof ReloadPendingError);
    assert.equal(server.sent.length, sentBefore, "nothing was sent");
  });
  test("after: a quiesce that times out lifts the stop, so the app keeps working", async () => {
    const { server, app } = await eveningState(fixedApp);
    const hold = deferred();
    server.hold = hold.promise;
    const inFlight = app.refresh();
    await tick();
    assert.equal(await app.vault.quiesce(5), false);
    hold.resolve();
    server.hold = null;
    await inFlight;
    server.now += 20 * 60_000;
    assert.equal((await app.refresh()).ok, true);
  });
});

describe("REQ-339 (FAIL-2553): the reload guard", () => {
  test("with no session registered (signed out, web) a reload goes ahead", async () => {
    assert.equal(await prepareForReload({ silent: true }), true);
  });
  test("a silent reload the session can't settle is skipped, an asked-for one goes ahead", async () => {
    let lifted = 0;
    const off = registerReloadGuard(async () => false, () => lifted++);
    try {
      assert.equal(await prepareForReload({ silent: true }), false);
      assert.equal(await prepareForReload({ silent: false }), true);
      reloadAbandoned();
      assert.equal(lifted, 1, "a failed reload lifts the stop on refreshes");
    } finally {
      off();
    }
  });
  test("the guard is the vault's quiesce: it waits for the exchange in flight", async () => {
    const { server, app } = await eveningState(fixedApp);
    const off = registerReloadGuard((ms) => app.vault.quiesce(ms), () => app.vault.resume());
    try {
      const hold = deferred();
      server.hold = hold.promise;
      void app.refresh();
      await tick();
      const decision = prepareForReload({ silent: true });
      setTimeout(() => hold.resolve(), 20);
      assert.equal(await decision, true);
      assert.equal(app.vault.current, "t3", "the rotated token was taken in before the reload");
    } finally {
      off();
    }
  });
});

describe("REQ-339 (FAIL-2552): one exchange at a time", () => {
  test("concurrent silent refreshes share one request", async () => {
    const { server, app } = await eveningState(fixedApp);
    server.now += 20 * 60_000;
    const before = server.sent.length;
    const results = await Promise.all([app.refresh(), app.refresh(), app.refresh()]);
    assert.ok(results.every((r) => r.ok));
    assert.equal(server.sent.length - before, 1);
  });
  test("an unlock and a refresh never send at the same time, and the refresh after it uses the new token", async () => {
    const store = new FakeStore();
    store.data.set(K.sealed, "t0");
    store.data.set(K.sessionFlag, "1");
    const server = new FakeServer("t0");
    const vault = vaultOver(store);
    let inFlight = 0;
    let maxInFlight = 0;
    const exchange: Exchange = async (t) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      try {
        return await server.exchange(t);
      } finally {
        inFlight--;
      }
    };
    const a = vault.unlock("t0", exchange);
    const b = vault.refresh(exchange);
    const [ra, rb] = await Promise.all([a, b]);
    assert.ok(ra.ok && rb.ok);
    assert.equal(maxInFlight, 1);
    assert.deepEqual(server.sent, ["t0", "t1"], "the refresh waited and sent the unlock's token");
    assert.equal(server.revoked, false);
  });
  test("a 401 on a request sent with an access token that has since been replaced does not refresh again", () => {
    // The 19:49:32.151 -> .736 chained rotation: a request sent before a
    // refresh came back 401 after it and set off a second one.
    assert.equal(refreshAfter401("a1", "a2"), false);
    assert.equal(refreshAfter401("a1", "a1"), true);
    assert.equal(refreshAfter401(null, null), true);
    assert.equal(refreshAfter401("a1", null), true);
  });
});

describe("REQ-339 (FAIL-2550): seals run one after another", () => {
  test("an older seal waiting on its prompt can never overwrite a newer one", async () => {
    const { store, server, app } = await eveningState(fixedApp);
    const prompt = deferred();
    store.prompt = prompt.promise;
    const writes = store.sealedWrites;
    const first = app.vault.seal(); // seals t2, waits
    await until(() => store.sealedWrites > writes);
    store.prompt = null;
    server.now += 20 * 60_000;
    assert.ok((await app.refresh()).ok); // t3
    const second = app.vault.seal(); // queued behind the first
    prompt.resolve();
    assert.deepEqual(await Promise.all([first, second]), ["sealed", "sealed"]);
    assert.equal(store.data.get(K.sealed), "t3");
    assert.equal(store.data.get(K.latest), undefined, "latest is dropped once the seal covers it");
    assert.equal(app.vault.dirty, false);
  });
  test("a seal of the newest token clears latest and the plain key, as REQ-305 did", async () => {
    const { store, app } = await eveningState(fixedApp);
    store.data.set(K.plain, "t2");
    assert.equal(await app.vault.seal(), "sealed");
    assert.equal(store.data.get(K.sealed), "t2");
    assert.equal(store.data.has(K.latest), false);
    assert.equal(store.data.has(K.plain), false);
    assert.equal(store.data.get(K.sessionFlag), "1");
  });
});

describe("REQ-339 (FAIL-2554): fall back to the other stored token before signing out", () => {
  test("a refused latest copy falls back to the sealed one", async () => {
    const store = new FakeStore();
    store.data.set(K.sealed, "t0");
    store.data.set(K.latest, "x-unknown");
    const server = new FakeServer("t0");
    const vault = vaultOver(store);
    const res = await vault.unlock("t0", server.exchange);
    assert.equal(res.ok, true);
    assert.deepEqual(server.sent, ["x-unknown", "t0"]);
  });
  test("an unreachable server stops at the first token and keeps everything", async () => {
    const store = new FakeStore();
    store.data.set(K.sealed, "t0");
    store.data.set(K.latest, "t5");
    const vault = vaultOver(store);
    const calls: string[] = [];
    const res = await vault.unlock("t0", async (t) => {
      calls.push(t);
      return { ok: false, expired: false, error: new Error("offline") };
    });
    assert.equal(res.ok, false);
    assert.deepEqual(calls, ["t5"]);
    assert.equal(store.data.get(K.latest), "t5");
  });
  test("when every stored token is refused the result is expired (the caller signs out)", async () => {
    const store = new FakeStore();
    store.data.set(K.plain, "old");
    const vault = vaultOver(store, false);
    const res = await vault.refresh(async () => ({ ok: false, expired: true, error: { status: 401 } }));
    assert.ok(!res.ok && res.expired);
  });
  test("no stored token at all reads as expired, as planRefresh's 'none' did", async () => {
    const res = await vaultOver(new FakeStore(), false).refresh(async () => assert.fail("nothing to send"));
    assert.ok(!res.ok && res.expired);
  });
});

describe("REQ-339: the fingerprint gate still holds", () => {
  test("a refresh before any unlock this launch never reads the latest key", async () => {
    const store = new FakeStore();
    store.data.set(K.sealed, "t0");
    store.data.set(K.latest, "t1");
    store.data.set(K.sessionFlag, "1");
    const vault = vaultOver(store, true);
    const res = await vault.refresh(async () => assert.fail("must not send the plain copy"));
    assert.ok(!res.ok && res.expired);
  });
  test("with biometric unlock on, a rotation writes latest (not the plain key) and marks the seal behind", async () => {
    const store = new FakeStore();
    const server = new FakeServer("t0");
    const vault = vaultOver(store, true);
    await vault.unlock("t0", server.exchange);
    assert.equal(store.data.get(K.latest), "t1");
    assert.equal(store.data.has(K.plain), false);
    assert.equal(vault.dirty, true);
  });
  test("with it off, a rotation writes the plain key", async () => {
    const store = new FakeStore();
    store.data.set(K.plain, "t0");
    const server = new FakeServer("t0");
    const vault = vaultOver(store, false);
    assert.equal((await vault.refresh(server.exchange)).ok, true);
    assert.equal(store.data.get(K.plain), "t1");
    assert.equal(store.data.has(K.latest), false);
  });
  test("a sign-in token is stored before its seal prompt", async () => {
    const store = new FakeStore();
    const vault = vaultOver(store, true);
    await vault.adopt("s1");
    assert.equal(store.data.get(K.latest), "s1");
    assert.equal(vault.current, "s1");
  });
});

describe("REQ-339 (FAIL-2555): what the device cannot fix on its own", () => {
  test("a kill after the server rotated and before the answer arrived loses the token on both versions", async () => {
    // Recorded so nobody reads the fix as covering it: only a server-side
    // allowance can (report: proposal for the lead).
    const { store, server, app } = await eveningState(fixedApp);
    const hold = deferred();
    server.hold = hold.promise;
    void app.refresh();
    await tick();
    store.kill(); // the OS ends the app; no reload guard runs
    hold.resolve();
    assert.equal(await nextMorningUnlock(store, server, fixedApp), false);
  });
});

describe("REQ-339: the wiring (static checks; the components can't be rendered here)", () => {
  const auth = readFileSync(new URL("../auth/AuthContext.tsx", import.meta.url), "utf8");
  const updates = readFileSync(new URL("../updates/useAppUpdates.ts", import.meta.url), "utf8");
  const required = readFileSync(new URL("../components/UpdateRequired.tsx", import.meta.url), "utf8");
  const client = readFileSync(new URL("../api/client.ts", import.meta.url), "utf8");
  test("AuthContext keeps the native token only through the vault", () => {
    assert.match(auth, /createTokenVault\(/);
    assert.doesNotMatch(auth, /refreshTokenRef/);
    assert.doesNotMatch(auth, /setItem\(REFRESH_TOKEN_LATEST_KEY/);
    const unlock = auth.slice(auth.indexOf("const unlockWithBiometric = useCallback"), auth.indexOf("const unlockMethod"));
    assert.match(unlock, /vault\.unlock\(/);
    assert.doesNotMatch(unlock, /api\.post<[^>]*>\("\/api\/auth\/refresh"/, "the unlock does not post its own refresh");
  });
  test("every update reload asks the session first", () => {
    assert.match(updates, /await prepareForReload\([\s\S]{0,400}Updates\.reloadAsync\(\)/);
    assert.match(required, /await prepareForReload\([\s\S]{0,300}Updates\.reloadAsync\(\)/);
    assert.match(auth, /registerReloadGuard\(/);
  });
  test("the API client skips the refresh when the access token already changed", () => {
    assert.match(client, /refreshAfter401\(sentWith, getAccessToken\?\.\(\) \?\? null\)/);
  });
});
