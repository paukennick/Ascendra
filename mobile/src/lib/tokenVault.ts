// REQ-339 (FAIL-2550..2559, Nick 2026-11-18: "Did something change with
// biometric login again? I just had to use my username and password again.").
//
// The native app's refresh-token storage as one small state machine, so every
// path that rotates, seals or reads the token follows the same rules and can
// be tested without a phone (tokenVault.test.ts). AuthContext owns the React
// state; this owns the token.
//
// The server rotates the refresh token on every use and treats a replay of a
// spent token (after a 10 s grace) as theft: it revokes the whole family and
// the learner signs in with a password. So the one thing this module must
// never do is lose the newest token or put an older one in front of it. The
// rules, each with the failure it closes:
//
// 1. One exchange at a time (FAIL-2552). Every exchange -- a silent refresh,
//    a resume, the biometric unlock -- runs under one lock, and concurrent
//    silent refreshes share one request. The unlock used to post its own
//    /api/auth/refresh outside the refresh dedupe.
// 2. Persist before use (FAIL-2551). A rotated token is written to a plain
//    secure-store key ("latest" with biometric unlock on, the plain key
//    otherwise) before the exchange returns. The unlock path used to keep the
//    new token only in memory until a second fingerprint prompt sealed it, so
//    a kill or reload during that prompt lost it.
// 3. Seal the newest, and only delete what the seal covers (FAIL-2550). A
//    background seal can wait on its Android prompt until the learner is
//    back; a rotation can land meanwhile. A seal that finishes after the
//    token has moved on keeps the "latest" copy (it holds the newer token)
//    and stays dirty. A failed seal keeps the newest token on the plain key,
//    not the one it tried to seal. Seals run one after another, so an older
//    one can never overwrite a newer one.
// 4. Never reload under a live exchange (FAIL-2553). `quiesce()` stops new
//    exchanges and waits for the one in flight to be persisted; the update
//    hook calls it before Updates.reloadAsync. The silent apply on return
//    after five minutes used to reload while the refresh that same return
//    triggered was in flight: the server rotated, the app never stored it.
// 5. Fall back before signing out (FAIL-2554). When the server refuses the
//    token sent (401), any other distinct stored token is tried once, newest
//    first, before the device signs out.
//
// What this cannot fix on its own: a response lost because the OS killed the
// app after the server rotated and before rule 2's write finished. Only the
// server can tell that apart from theft (see the proposal in the REQ-339
// report; the lead decides).

export const TOKEN_KEYS = {
  plain: "ascendra_refresh_token",
  sealed: "ascendra_refresh_token_secure",
  latest: "ascendra_refresh_token_latest",
  sessionFlag: "ascendra_biometric_session",
} as const;

export interface SealOptions {
  requireAuthentication?: boolean;
  authenticationPrompt?: string;
}

// src/lib/secureStorage.ts has this shape.
export interface VaultStorage {
  getItem(key: string, options?: SealOptions): Promise<string | null>;
  setItem(key: string, value: string, options?: SealOptions): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

export type ExchangeOutcome =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; expired: boolean; error: unknown };

// Sends one refresh token to /api/auth/refresh. `expired` is true only for the
// server's 401 (sessionStore.refreshFailure).
export type Exchange = (refreshToken: string) => Promise<ExchangeOutcome>;

export class ReloadPendingError extends Error {
  constructor() {
    super("The app is restarting to apply an update.");
    this.name = "ReloadPendingError";
  }
}

export class NoStoredSessionError extends Error {
  constructor() {
    super("No session is stored on this device.");
    this.name = "NoStoredSessionError";
  }
}

export interface VaultOptions {
  storage: VaultStorage;
  sealOptions: SealOptions;
  biometricOn: () => boolean;
  // The sealed-session flag was written ("1" sealed, "0" none).
  onSessionFlag?: (flag: "0" | "1") => void;
  warn?: (message: string, err: unknown) => void;
}

export type SealResult = "sealed" | "suspended" | "skipped";

export interface TokenVault {
  // The newest token this app launch knows (null until a sign-in or unlock).
  readonly current: string | null;
  // The sealed copy is behind the newest token.
  readonly dirty: boolean;
  // A seal failed this launch: rotations go to the plain key until one works.
  readonly suspended: boolean;
  // A sign-in handed this device a token: kept and persisted before anything
  // else (rule 2). The caller seals it afterwards when biometric unlock is on.
  adopt(token: string): Promise<void>;
  // A silent refresh or a resume (rules 1, 2, 5).
  refresh(exchange: Exchange): Promise<ExchangeOutcome>;
  // The biometric unlock, once the sealed key's OS prompt has passed and
  // returned `sealedToken` (rules 1, 2, 5).
  unlock(sealedToken: string, exchange: Exchange): Promise<ExchangeOutcome>;
  // Writes the newest token to the sealed key (rule 3).
  seal(): Promise<SealResult>;
  // Stops new exchanges and waits for the one in flight (rule 4). Resolves
  // true once idle, false if `timeoutMs` passed first (the stop is lifted
  // again then, so the caller can skip its reload).
  quiesce(timeoutMs: number): Promise<boolean>;
  // Lifts quiesce() (a reload that did not happen).
  resume(): void;
  // Forgets the in-memory token (sign-out). Storage is the caller's.
  reset(): void;
  // Biometric unlock was switched on or off by the caller (which moved the
  // token between keys itself).
  markSealedClean(): void;
}

export function createTokenVault(opts: VaultOptions): TokenVault {
  const { storage, sealOptions } = opts;
  const warn = opts.warn ?? (() => undefined);
  let current: string | null = null;
  let dirty = false;
  let suspended = false;
  let stopped = false;
  let lock: Promise<unknown> = Promise.resolve();
  let sealChain: Promise<unknown> = Promise.resolve();
  let sharedRefresh: Promise<ExchangeOutcome> | null = null;

  function exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = lock.then(fn, fn);
    lock = run.catch(() => undefined);
    return run;
  }

  // Resolves once nothing is queued on the lock any more.
  async function drain(): Promise<void> {
    let seen: Promise<unknown>;
    do {
      seen = lock;
      await seen;
    } while (seen !== lock);
  }

  async function write(key: string, value: string): Promise<boolean> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await storage.setItem(key, value);
        return true;
      } catch (err) {
        if (attempt === 1) warn(`Could not store the session (${key}):`, err);
      }
    }
    return false;
  }

  async function read(key: string): Promise<string | null> {
    return storage.getItem(key).catch(() => null);
  }

  async function setFlag(flag: "0" | "1"): Promise<void> {
    await storage.setItem(TOKEN_KEYS.sessionFlag, flag).catch((err) => warn("Could not store the session flag:", err));
    opts.onSessionFlag?.(flag);
  }

  // Rule 2: memory and a plain key both hold the new token before anyone
  // uses it. With biometric unlock on (and sealing working) it goes to
  // "latest" and the sealed copy is marked behind; otherwise the plain key.
  async function persistRotated(token: string): Promise<void> {
    current = token;
    if (opts.biometricOn() && !suspended) {
      dirty = true;
      if (!(await write(TOKEN_KEYS.latest, token))) {
        // Never leave an older "latest" in front of a newer sealed copy.
        await storage.deleteItem(TOKEN_KEYS.latest).catch(() => undefined);
      }
    } else {
      await write(TOKEN_KEYS.plain, token);
    }
  }

  async function tryInOrder(candidates: (string | null | undefined)[], exchange: Exchange): Promise<ExchangeOutcome> {
    const tokens = [...new Set(candidates.filter((t): t is string => typeof t === "string" && t.length > 0))];
    if (tokens.length === 0) return { ok: false, expired: true, error: new NoStoredSessionError() };
    let last: ExchangeOutcome = { ok: false, expired: true, error: new NoStoredSessionError() };
    for (const token of tokens) {
      if (stopped) return { ok: false, expired: false, error: new ReloadPendingError() };
      const res = await exchange(token);
      if (res.ok) {
        await persistRotated(res.refreshToken);
        return res;
      }
      last = res;
      // Unreachable, a timeout, a 5xx: says nothing about the session. Keep
      // every token and let the caller offer a retry.
      if (!res.expired) return res;
    }
    return last;
  }

  function refresh(exchange: Exchange): Promise<ExchangeOutcome> {
    if (stopped) return Promise.resolve({ ok: false, expired: false, error: new ReloadPendingError() });
    if (sharedRefresh) return sharedRefresh;
    const run = exclusive(async () => {
      // Newest first. Memory is the newest this launch has seen; "latest" is
      // read only once this launch has passed a sign-in or unlock, or with
      // biometric unlock off, so it never skips the fingerprint gate.
      const gateOpen = current !== null || !opts.biometricOn();
      const latest = gateOpen ? await read(TOKEN_KEYS.latest) : null;
      const plain = await read(TOKEN_KEYS.plain);
      return tryInOrder([current, latest, plain], exchange);
    });
    sharedRefresh = run;
    const clear = () => {
      if (sharedRefresh === run) sharedRefresh = null;
    };
    run.then(clear, clear);
    return run;
  }

  function unlock(sealedToken: string, exchange: Exchange): Promise<ExchangeOutcome> {
    if (stopped) return Promise.resolve({ ok: false, expired: false, error: new ReloadPendingError() });
    return exclusive(async () => {
      // The OS prompt has passed. "latest" is never older than the sealed copy
      // (rule 3), so it goes first; the sealed copy is the fallback.
      const latest = await read(TOKEN_KEYS.latest);
      return tryInOrder([latest, sealedToken], exchange);
    });
  }

  async function sealNow(): Promise<SealResult> {
    const token = current;
    if (!token || !opts.biometricOn()) return "skipped";
    try {
      // May wait on the OS prompt (Android asks for every write).
      await storage.setItem(TOKEN_KEYS.sealed, token, sealOptions);
    } catch {
      await exclusive(async () => {
        suspended = true;
        const newest = current ?? token;
        // The session moves to the plain key: the newest token, not the one
        // this seal tried, which may be behind by now.
        if (await write(TOKEN_KEYS.plain, newest)) {
          if ((await read(TOKEN_KEYS.latest)) !== null) await storage.deleteItem(TOKEN_KEYS.latest).catch(() => undefined);
        }
        await storage.deleteItem(TOKEN_KEYS.sealed).catch(() => undefined);
        await setFlag("0");
        dirty = false;
      });
      return "suspended";
    }
    await exclusive(async () => {
      await setFlag("1");
      const moved = current !== token;
      // "latest" and the plain key are dropped only when the sealed copy is
      // at least as new as what they hold: they hold this token, or this
      // token is still the newest. Otherwise they hold the newer token.
      const latest = await read(TOKEN_KEYS.latest);
      if (latest !== null && (latest === token || !moved)) await storage.deleteItem(TOKEN_KEYS.latest).catch(() => undefined);
      const plain = await read(TOKEN_KEYS.plain);
      if (plain !== null && (plain === token || !moved)) await storage.deleteItem(TOKEN_KEYS.plain).catch(() => undefined);
      if (!moved) {
        dirty = false;
        suspended = false;
      }
    });
    return "sealed";
  }

  function seal(): Promise<SealResult> {
    const run = sealChain.then(sealNow, sealNow);
    sealChain = run.catch(() => undefined);
    return run;
  }

  // Only the lock blocks a reload: exchanges and the storage steps around
  // them. A seal waiting on its OS prompt does not, because by rule 2 the
  // newest token is already on a plain key while it waits.
  async function quiesce(timeoutMs: number): Promise<boolean> {
    stopped = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(false), timeoutMs);
    });
    const ok = await Promise.race([drain().then(() => true), timedOut]);
    if (timer !== undefined) clearTimeout(timer);
    if (!ok) stopped = false;
    return ok;
  }

  return {
    get current() {
      return current;
    },
    get dirty() {
      return dirty;
    },
    get suspended() {
      return suspended;
    },
    async adopt(token: string) {
      await exclusive(async () => {
        suspended = false;
        await persistRotated(token);
      });
    },
    refresh,
    unlock,
    seal,
    quiesce,
    resume() {
      stopped = false;
    },
    reset() {
      current = null;
      dirty = false;
    },
    markSealedClean() {
      dirty = false;
      suspended = false;
    },
  };
}
