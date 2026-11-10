// REQ-199: the on-device command journal (src/sim/runtime/journal.ts), the
// sim route's protection from over-the-air reloads and the logout sweep's
// knowledge of the journal key. The server half of "an identical resend is
// accepted" is pinned against Postgres in backend/lib/sims.dbtest.ts.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stateHash } from "./engine/v1/engine.ts";
import type { Command, ScenarioDoc } from "./engine/v1/types.ts";
import { accepted, issue, openSession, type RunPayload, type Session } from "./runtime/session.ts";
import {
  canonicalCommand,
  discardNotice,
  journalKey,
  journalWriter,
  loadJournal,
  makeJournal,
  parseJournal,
  planJournal,
  JOURNAL_MAX_COMMANDS,
  SEND_BATCH,
  type Journal,
  type JournalBackend,
} from "./runtime/journal.ts";
import { holdsUnsavedWork } from "../updates/protectedRoutes.ts";
import { localDataOwner, userLocalDataKeys } from "../lib/localData.ts";

const here = dirname(fileURLToPath(import.meta.url));
const seeds = join(here, "..", "..", "..", "backend", "supabase", "seed", "sims");
const read = (p: string) => JSON.parse(readFileSync(p, "utf8"));

async function ticketburst(): Promise<ScenarioDoc> {
  const { spliceModules } = await import("../../../backend/lib/sim/modules.ts");
  const course = "AWSSAA";
  const slug = "ticketburst-launch-day";
  const source = read(join(seeds, course, `${slug}.sim.json`));
  return spliceModules(source, (ref: string) => read(join(seeds, "modules", `${ref}.module.json`))).doc as ScenarioDoc;
}

// Device storage that survives a "kill" (the Map outlives the session).
function memoryBackend(): JournalBackend & { data: Map<string, string>; writes: number } {
  const data = new Map<string, string>();
  const b = {
    data,
    writes: 0,
    async get(k: string) {
      return data.get(k) ?? null;
    },
    async set(k: string, v: string) {
      b.writes++;
      data.set(k, v);
    },
    async remove(k: string) {
      data.delete(k);
    },
  };
  return b;
}

// The step route's acceptance rule, in memory: idempotent by seq (an
// identical resend is accepted), a changed resend is seq_conflict, a gap is
// seq_gap (backend/lib/sims.ts sync()).
function fakeServer(seed: number) {
  const stored: Command[] = [];
  return {
    stored,
    payload(over: Partial<RunPayload["run"]> = {}, clientHash = "h1"): RunPayload {
      return {
        run: { id: "run1", simId: "sim1", versionId: "v1", version: 1, status: "open", seed, leaseEpoch: 2, lastSeq: stored.length, lastTick: stored.at(-1)?.tick ?? 0, engineVersion: "1.0", ...over },
        clientHash,
        commands: stored.slice(),
        graded: [],
      };
    },
    step(commands: Command[]): { acceptedThrough: number } | { code: string } {
      for (const c of commands) {
        if (c.seq <= stored.length) {
          if (canonicalCommand(stored[c.seq - 1]) !== canonicalCommand(c)) return { code: "seq_conflict" };
          continue;
        }
        if (c.seq !== stored.length + 1) return { code: "seq_gap" };
        stored.push(structuredClone(c));
      }
      return { acceptedThrough: stored.length };
    },
  };
}

const META = { runId: "run1", versionId: "v1", clientHash: "h1" };
const KEY = journalKey("user-1", "sim1");

async function issueAndJournal(s: Session, w: ReturnType<typeof journalWriter>, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    assert.equal(issue(s, { type: "act", action: "toggleBackup" }).ok, true);
    // Write-ahead: on the device before anything is sent.
    await w.save(makeJournal("sim1", META, s.pending, Date.now()));
  }
}

describe("the command journal", () => {
  test("kill mid-run: unsent commands survive on the device and replay to the same state", async () => {
    const doc = await ticketburst();
    const server = fakeServer(42);
    const disk = memoryBackend();
    let w = journalWriter(disk, KEY);
    let s = openSession(server.payload(), doc);
    await issueAndJournal(s, w, 3);
    // Only the first command reached the server before the app died.
    const r = server.step(s.pending.slice(0, 1));
    assert.ok("acceptedThrough" in r);
    accepted(s, r.acceptedThrough);
    await w.save(makeJournal("sim1", META, s.pending, Date.now()));
    const before = stateHash(s.run.state);
    const unsent = s.pending.map((c) => c.seq);
    assert.deepEqual(unsent, [2, 3]);

    // The kill: the session and writer are gone; only the device storage remains.
    s = null as unknown as Session;
    w = journalWriter(disk, KEY);
    const j = await loadJournal(disk, KEY, "sim1");
    assert.ok(j, "the journal is on the device");
    assert.deepEqual(j.commands.map((c) => c.seq), [2, 3]);

    const p = server.payload();
    const plan = planJournal(j, p);
    assert.equal(plan.kind, "replay");
    if (plan.kind !== "replay") return;
    const resumed = openSession({ ...p, commands: [...p.commands, ...plan.commands] }, doc);
    resumed.pending = plan.commands.slice();
    assert.equal(stateHash(resumed.run.state), before, "the resumed run is exactly where the learner left it");

    const sent = server.step(resumed.pending);
    assert.ok("acceptedThrough" in sent);
    accepted(resumed, sent.acceptedThrough);
    await w.save(makeJournal("sim1", META, resumed.pending, Date.now()));
    assert.equal(disk.data.has(KEY), false, "an acknowledged journal is removed");
    assert.equal(server.stored.length, 3);
  });

  test("duplicate replay is idempotent: a resend after a lost acknowledgement adds nothing", async () => {
    const doc = await ticketburst();
    const server = fakeServer(7);
    const disk = memoryBackend();
    const w = journalWriter(disk, KEY);
    const s = openSession(server.payload(), doc);
    await issueAndJournal(s, w, 2);
    // The server stored both, but the acknowledgement never arrived.
    server.step(s.pending);
    const j = (await loadJournal(disk, KEY, "sim1"))!;
    assert.equal(planJournal(j, server.payload()).kind, "acknowledged", "nothing left to send");
    // A resend of the same commands anyway (another flush racing) is accepted
    // and stores nothing twice, whatever the key order.
    const reordered = j.commands.map((c) => Object.fromEntries(Object.entries(c).reverse()) as unknown as Command);
    const again = server.step(reordered);
    assert.deepEqual(again, { acceptedThrough: 2 });
    assert.equal(server.stored.length, 2);
    // Half-acknowledged: only the tail is replayed.
    const server2 = fakeServer(7);
    server2.step(j.commands.slice(0, 1));
    const plan = planJournal(j, server2.payload());
    assert.equal(plan.kind, "replay");
    assert.deepEqual(plan.kind === "replay" && plan.commands.map((c) => c.seq), [2]);
  });

  test("a stale journal is discarded with a plain reason, never sent", async () => {
    const doc = await ticketburst();
    const server = fakeServer(9);
    const disk = memoryBackend();
    const w = journalWriter(disk, KEY);
    const s = openSession(server.payload(), doc);
    await issueAndJournal(s, w, 2);
    const j = (await loadJournal(disk, KEY, "sim1"))!;

    // The run ended (or was restarted) on another device: the start route returned another run.
    assert.deepEqual(planJournal(j, server.payload({ id: "run2" })), { kind: "discard", reason: "ended", lost: 2 });
    assert.deepEqual(planJournal(j, server.payload({ status: "ended" })), { kind: "discard", reason: "ended", lost: 2 });
    // A different sim version (or client document).
    assert.deepEqual(planJournal(j, server.payload({ versionId: "v2" })), { kind: "discard", reason: "version", lost: 2 });
    assert.deepEqual(planJournal(j, server.payload({}, "h2")), { kind: "discard", reason: "version", lost: 2 });
    // Another device took the lease and acted: a different command at seq 1.
    const other = fakeServer(9);
    other.step([{ seq: 1, tick: 0, type: "pause", reason: "learner" } as Command]);
    assert.deepEqual(planJournal(j, other.payload()), { kind: "discard", reason: "moved_on", lost: 2 });
    // Another device ran the clock past the journal's first unsent command.
    assert.deepEqual(planJournal(j, server.payload({ lastTick: 30 })), { kind: "discard", reason: "moved_on", lost: 2 });

    for (const reason of ["ended", "version", "moved_on", "refused", "lease_lost"] as const) {
      const text = discardNotice(reason, 2);
      assert.match(text, /2 actions/);
      assert.doesNotMatch(text, /seq|lease|epoch|hash|journal/i, "no internal words");
    }
    assert.match(discardNotice("ended", 1), /1 action /);
  });

  test("only a well-formed journal for this sim is read; anything else is removed", async () => {
    const disk = memoryBackend();
    const good = makeJournal("sim1", META, [{ seq: 1, tick: 0, type: "resume" } as Command], 1);
    assert.ok(parseJournal(JSON.stringify(good), "sim1"));
    assert.equal(parseJournal(JSON.stringify(good), "sim2"), null, "another sim's journal");
    assert.equal(parseJournal("{not json", "sim1"), null);
    assert.equal(parseJournal(JSON.stringify({ ...good, format: 2 }), "sim1"), null);
    const gap: Journal = { ...good, commands: [{ seq: 1, tick: 0, type: "resume" } as Command, { seq: 3, tick: 0, type: "resume" } as Command] };
    assert.equal(parseJournal(JSON.stringify(gap), "sim1"), null, "out-of-order commands");
    disk.data.set(KEY, "garbage");
    assert.equal(await loadJournal(disk, KEY, "sim1"), null);
    assert.equal(disk.data.has(KEY), false, "an unreadable entry does not linger");
    assert.equal(planJournal(null, fakeServer(1).payload()).kind, "none");
  });

  test("writes land in order, storage failures never throw, and a logged-out user's journal is not written back", async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow: JournalBackend = {
      async get() {
        return null;
      },
      async set(k, v) {
        await gate;
        order.push(`set ${JSON.parse(v).commands.length}`);
      },
      async remove() {
        order.push("remove");
      },
    };
    const w = journalWriter(slow, KEY);
    const a = w.save(makeJournal("sim1", META, [{ seq: 1, tick: 0, type: "resume" } as Command], 1));
    const b = w.save(null);
    release();
    await Promise.all([a, b]);
    assert.deepEqual(order, ["set 1", "remove"], "the acknowledgement's removal is never overtaken");

    const broken: JournalBackend = {
      get: () => Promise.reject(new Error("blocked")),
      set: () => Promise.reject(new Error("quota")),
      remove: () => Promise.reject(new Error("blocked")),
    };
    await journalWriter(broken, KEY).save(makeJournal("sim1", META, [{ seq: 1, tick: 0, type: "resume" } as Command], 1));
    assert.equal(await loadJournal(broken, KEY, "sim1"), null);

    const disk = memoryBackend();
    await journalWriter(disk, KEY, () => false).save(makeJournal("sim1", META, [{ seq: 1, tick: 0, type: "resume" } as Command], 1));
    assert.equal(disk.writes, 0);
  });
});

describe("around the journal", () => {
  test("a send never exceeds the step route's per-request limit, and a journal never exceeds a run", async () => {
    const { SIM_LIMITS } = await import("../../../backend/lib/sim/server-run.ts");
    assert.equal(SEND_BATCH, SIM_LIMITS.commandsPerRequest);
    assert.equal(JOURNAL_MAX_COMMANDS, SIM_LIMITS.commandsPerRun);
  });

  test("the sim route is protected from over-the-air reloads; the list is not", () => {
    assert.equal(holdsUnsavedWork("/course/t1/sim/s1"), true);
    assert.equal(holdsUnsavedWork("/course/t1/sims"), false);
    for (const p of ["/course/t1/lesson/o1", "/course/t1/pbq", "/course/t1/chat"]) assert.equal(holdsUnsavedWork(p), true);
  });

  test("the logout sweep owns the journal key", () => {
    assert.equal(localDataOwner(journalKey("u1", "s1")), "u1");
    assert.deepEqual(userLocalDataKeys([journalKey("u1", "s1"), journalKey("u2", "s1"), "ascendra.theme"], "u1"), [journalKey("u1", "s1")]);
  });
});
