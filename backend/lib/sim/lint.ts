// REQ-162 (docs/sims.md 4.4, 16): the content linter over the seeded
// documents, shared by `npm run sims:lint`, `npm run sims:validate` and the
// test that runs it under `npm test`. Layer 1 is the zod schema (document and
// golden file); layers 2-3 are the engine's lintScenario with the golden
// paths replayed, the bounded path search and the source re-check dates.
import { readFileSync } from "node:fs";
import { compileEntry } from "./documents.ts";
import type { DocumentEntry } from "./documents.ts";
import { goldenFileSchema, schemaProblems } from "./schema.ts";
import { lintScenario, replayGolden, replayGoldenPath } from "./engine/v1/validate.ts";
import { parseCached, parseTemplate, stateHash } from "./engine/v1/index.ts";
import { parseDuration } from "./engine/v1/engine.ts";
import type { Ast, TemplatePart } from "./engine/v1/parser.ts";
import { jsonbKeyOrder, reverseKeyOrder, withKeyOrder } from "./key-order.ts";
import type { GoldenFile, GoldenResult, SafetyFamily } from "./engine/v1/validate.ts";
import type { Problem, ScenarioDoc } from "./engine/v1/types.ts";

export interface DocumentReport {
  entry: DocumentEntry;
  doc: ScenarioDoc | null;
  golden: GoldenFile | null;
  problems: Problem[];
  goldenResults: GoldenResult[];
}

// REQ-232: a physical therapy treatment session is clinical (its course sits
// under healthcare, so the seed derives "clinical" too).
export function safetyFamilyOf(doc: ScenarioDoc): SafetyFamily {
  if (doc.outcome?.profile === "clinical" || doc.outcome?.profile === "physical-therapy") return "clinical";
  if (doc.outcome?.profile === "fitness") return "fitness";
  // REQ-314: the facility profile is a general-family (security) course's.
  return "general";
}

function readJson(path: string, problems: Problem[], label: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    problems.push({ level: "error", path: label, message: `cannot read: ${(e as Error).message}` });
    return null;
  }
}

// REQ-227 (FAIL-1222): an ending set whose result depends on key order is an
// error. The engine checks endings in the document's `endingOrder` (minor 2),
// or, without one, in the key order of `endings`, which the server's jsonb
// column does not keep. So a document without `endingOrder` is replayed with
// its keys as written, reversed and in jsonb order, and every golden path
// must end the same way (ending, class, rating, score and state hash) in all
// three. A document with `endingOrder` cannot depend on key order (the engine
// reads the list), so it is not replayed here; the storage-order test replays
// it anyway. Only the golden paths are searched: an overlap no path reaches
// is not seen, which is why a new document declares `endingOrder` (the
// validator requires it from minor 2 whenever two endings have a `when`).
export function endingOrderProblems(doc: ScenarioDoc, golden: GoldenFile | null): Problem[] {
  if (doc.endingOrder !== undefined || !golden) return [];
  const orders: [string, (keys: string[]) => string[]][] = [
    ["as written", (k) => k],
    ["reversed", reverseKeyOrder],
    ["jsonb", jsonbKeyOrder],
  ];
  const problems: Problem[] = [];
  const copies = orders.map(([label, order]) => ({ label, doc: withKeyOrder(JSON.parse(JSON.stringify(doc)) as ScenarioDoc, order) }));
  for (const p of golden.paths) {
    const seen = copies.map((c) => {
      const r = replayGoldenPath(c.doc, structuredClone(p), (run) => stateHash(run.state));
      const d = r.debrief;
      return { label: c.label, key: r.error ? `error ${r.error}` : `${d.ending} / ${d.outcomeClass} / ${d.rating} / ${d.processScore} / ${r.stateHash}`, ending: r.error ? "error" : d.ending ?? "no ending" };
    });
    if (new Set(seen.map((x) => x.key)).size > 1) {
      problems.push({
        level: "error",
        path: `endings`,
        message: `golden path ${p.id} ends differently depending on key order (${seen.map((x) => `${x.label}: ${x.ending}`).join("; ")}); declare endingOrder (engine minor 2) so the order is explicit`,
      });
    }
  }
  return problems;
}

// REQ-236 (FAIL-1361): the engine reads some expressions as sim seconds
// whatever the unit a param declares (a unit is display and lint metadata
// only). A "1440 min" day given to `schedule.after` became 24 minutes. So a
// named value (param, state variable or derived value) that declares a time
// unit other than seconds may not be read where the engine reads seconds:
//   - `schedule.after` given as an expression (engine.ts scheduleTimer);
//   - a console alert's or event's `at` (sorted and shown as sim seconds);
//   - a template slot, table column or KPI with a format that takes seconds
//     (clock, clocks, date, dateShort, datetime, time, duration, min).
// Store the value in seconds (unit "s") and show it with |min or |duration.
// A rate (mL/min) or a non-time unit is not a duration, so it is not checked
// here (unitsLint in the engine warns about rates times dt). Lint layer only:
// the engine and its stepping are unchanged.
const SECONDS_UNITS = new Set(["s", "sec", "secs", "second", "seconds"]);
const OTHER_TIME_UNITS = new Set(["ms", "min", "mins", "minute", "minutes", "h", "hr", "hrs", "hour", "hours", "d", "day", "days", "wk", "week", "weeks"]);
export const SECONDS_FORMATS = new Set(["clock", "clocks", "date", "dateShort", "datetime", "time", "duration", "min"]);

export function isNonSecondTimeUnit(unit: string | undefined): boolean {
  if (typeof unit !== "string") return false;
  const u = unit.trim().toLowerCase();
  return !SECONDS_UNITS.has(u) && OTHER_TIME_UNITS.has(u);
}

function namesOf(ast: Ast, out: Set<string>): void {
  if (ast.k === "name") out.add(ast.name);
  for (const v of Object.values(ast)) {
    if (Array.isArray(v)) for (const x of v) if (x && typeof x === "object" && "k" in x) namesOf(x as Ast, out);
    if (v && typeof v === "object" && !Array.isArray(v) && "k" in v) namesOf(v as Ast, out);
  }
}

export function secondsUnitProblems(doc: ScenarioDoc): Problem[] {
  const problems: Problem[] = [];
  const unitOf = (n: string): string | undefined =>
    doc.params?.[n]?.unit ?? (doc.state?.[n] as { unit?: string } | undefined)?.unit ?? (doc.derived?.[n] as { unit?: string } | undefined)?.unit;
  const check = (path: string, expr: string, reads: string): void => {
    let ast: Ast;
    try {
      ast = parseCached(expr);
    } catch {
      return; // the validator reports a bad expression
    }
    const names = new Set<string>();
    namesOf(ast, names);
    for (const n of names) {
      const unit = unitOf(n);
      if (isNonSecondTimeUnit(unit)) {
        problems.push({
          level: "error",
          path,
          message: `"${n}" has unit "${unit}", but ${reads} is read in seconds whatever the unit says (FAIL-1361); store it in seconds with unit "s" and show it with |min or |duration`,
        });
      }
    }
  };
  const checkTemplate = (path: string, tpl: string): void => {
    if (tpl.indexOf("{") < 0) return;
    let parts: TemplatePart[];
    try {
      parts = parseTemplate(tpl);
    } catch {
      return; // not a template (a command pattern) or reported by the validator
    }
    for (const p of parts) if ("expr" in p && p.format && SECONDS_FORMATS.has(p.format)) check(path, p.src, `the |${p.format} format`);
  };
  const walk = (x: unknown, path: string): void => {
    if (typeof x === "string") return checkTemplate(path, x);
    if (Array.isArray(x)) return x.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (!x || typeof x !== "object") return;
    const o = x as Record<string, unknown>;
    // an effect: { schedule, after }; a literal duration ("8min") carries its own unit
    if (typeof o.schedule === "string" && typeof o.after === "string" && parseDuration(o.after) === null) check(`${path}.after`, o.after, "schedule.after");
    // a table column or a KPI: { label, value, format } ("duration" KPIs)
    if (typeof o.value === "string" && typeof o.format === "string" && typeof o.label === "string" && SECONDS_FORMATS.has(o.format)) check(`${path}.value`, o.value, `a value with the "${o.format}" format`);
    for (const k of Object.keys(o)) walk(o[k], path ? `${path}.${k}` : k);
  };
  walk(doc, "");
  const con = doc.screen?.console;
  (con?.alerts ?? []).forEach((a, i) => check(`screen.console.alerts[${i}].at`, a.at, "a console alert's at"));
  (con?.events ?? []).forEach((e, i) => check(`screen.console.events[${i}].at`, e.at, "a console event's at"));
  // REQ-237: a terminal output line's `at` is sim seconds too.
  (doc.screen?.terminal?.lines ?? []).forEach((l, i) => check(`screen.terminal.lines[${i}].at`, l.at, "a terminal line's at"));
  // REQ-311: the dashboard's issue and event times and the desk's ticket
  // times and due times are sim seconds too.
  (doc.screen?.dashboard?.issues ?? []).forEach((x, i) => check(`screen.dashboard.issues[${i}].at`, x.at, "a dashboard issue's at"));
  (doc.screen?.dashboard?.events ?? []).forEach((x, i) => check(`screen.dashboard.events[${i}].at`, x.at, "a dashboard event's at"));
  (doc.screen?.desk?.tickets ?? []).forEach((x, i) => {
    check(`screen.desk.tickets[${i}].at`, x.at, "a ticket's at");
    check(`screen.desk.tickets[${i}].due`, x.due, "a ticket's due");
  });
  // REQ-313: a tabletop inject's `at` is sim seconds of scenario time too.
  (doc.screen?.tabletop?.injects ?? []).forEach((j, i) => check(`screen.tabletop.injects[${i}].at`, j.at, "a tabletop inject's at"));
  // REQ-314: the facility console's alarms and door log, and the trainer's journal.
  (doc.screen?.facility?.alarms ?? []).forEach((a, i) => check(`screen.facility.alarms[${i}].at`, a.at, "a facility alarm's at"));
  (doc.screen?.facility?.doors ?? []).forEach((d, i) => check(`screen.facility.doors[${i}].at`, d.at, "a door log line's at"));
  (doc.screen?.trainer?.journal ?? []).forEach((j, i) => check(`screen.trainer.journal[${i}].at`, j.at, "a trainer journal entry's at"));
  // one problem per place and name
  const seen = new Set<string>();
  return problems.filter((p) => {
    const key = `${p.path}\u0000${p.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// REQ-237 (FAIL-1440): a backslash escape in a document string. Inside an
// expression's string literal (a template slot, a condition) the parser keeps
// the character after a backslash and drops the backslash, so "\\n" renders
// as the letter n, not a line break; outside a slot it renders as a visible
// backslash. Neither is ever what an author means: write a real line break
// (the JSON escape \n is one) instead.
export function backslashEscapeProblems(doc: ScenarioDoc): Problem[] {
  const out: Problem[] = [];
  const walk = (x: unknown, path: string): void => {
    if (typeof x === "string") {
      if (/\\[nrt"\\]/.test(x)) out.push({ level: "error", path, message: "contains a backslash escape (\\n, \\t, \\\"); the expression language drops the backslash and keeps the letter, so write a real line break or the character itself (FAIL-1440)" });
      return;
    }
    if (Array.isArray(x)) return x.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (x && typeof x === "object") for (const [k, v] of Object.entries(x as Record<string, unknown>)) walk(v, path ? `${path}.${k}` : k);
  };
  walk(doc, "");
  return out;
}

// REQ-313 (docs/sims.md 22.26; Nick, 2026-11-16: limit trademarks): the
// governance, exercise and professional-ethics sims name no certifying
// body's mark in what a learner reads. The objective titles are the catalog's
// (owned by the course, not the sim) and the sources are citations, so both
// are left out; everything else a learner can see is checked.
export const CERT_MARKS: readonly RegExp[] = [/\bISC2\b/i, /\(ISC\)/i, /\bISACA\b/i, /\bEC-Council\b/i, /\bCompTIA\b/i, /\bCISSP\b/, /\bCISM\b/, /\bCEH\b/, /\bSecurity\+/, /Certified in Cybersecurity/i];
const MARK_PROFILES = new Set(["governance", "exercise", "professional-ethics"]);
const NOT_LEARNER_TEXT = new Set(["objective", "secondaryObjectives", "sources", "source", "slug"]);

// REQ-309 (wave 2026-11-17): every sim, whatever its profile, names no mark of
// an exam body whose trademark policy allows no use without written
// permission (the "permission" bodies of lib/catalog-trademarks.test.ts:
// ISC2, EC-Council, ISACA, BCEN, NBCC, NASM, ACE, ASQ, ANCC, AANPCB, the
// Python Institute, ABPTS/APTA and PeopleCert). One pattern per body, copied
// from that test (lib/sim/cert-marks.test.ts fails if they drift), except
// three acronyms that mean something else wherever sims use them and are
// left out of the ABPTS and ISACA patterns: GCS (the Glasgow Coma Scale), ECS
// (Amazon's container service) and CISA (the US Cybersecurity and
// Infrastructure Security Agency). "ACE inhibitor" is a drug class, not the
// American Council on Exercise. Sources stay out of the check: whether a
// citation may name a publisher's document is Nick's decision (REQ-309).
export const PERMISSION_BODY_MARKS: readonly { body: string; marks: RegExp }[] = [
  { body: "ISC2", marks: /ISC2|\(ISC\)|CISSP|Certified in Cybersecurity|Certified Information Systems Security Professional|\bCC\b|\bCBK\b/ },
  { body: "EC-Council", marks: /EC-Council|\bC\|?EH\b|Certified Ethical Hacker|312-50/ },
  { body: "ISACA", marks: /ISACA|\bCISM\b|Certified Information Security Manager|COBIT/ },
  { body: "BCEN", marks: /BCEN|\bCEN\b|Certified Emergency Nurse|Board of Certification for Emergency Nursing/ },
  { body: "NBCC", marks: /NBCC|\bNCE\b|NCMHCE|National Counselor Examination|National Clinical Mental Health Counseling Examination|\bNCC\b/ },
  { body: "NASM", marks: /NASM|AFAA|Certified Nutrition Coach|\bCNC\b/ },
  { body: "ACE", marks: /\bACE\b|American Council on Exercise/ },
  { body: "ASQ", marks: /\bASQ\b|American Society for Quality|CSSGB|Certified Six Sigma/ },
  { body: "ANCC", marks: /ANCC|American Nurses Credentialing Center|FNP-BC|\bANA\b/ },
  { body: "AANPCB", marks: /AANPCB|\bNPCB\b|\bAANP\b|American Academy of Nurse Practitioners|\bFNP-C\b|\bNP-C\b/ },
  { body: "Python Institute", marks: /Python Institute|OpenEDG|PCEP|PCAP|PCPP/ },
  { body: "ABPTS (APTA)", marks: /ABPTS|American Board of Physical Therapy Specialties|\bAPTA\b|\b(OCS|NCS|CCS|PCS|SCS|WCS|PWCS)\b/ },
  { body: "PeopleCert", marks: /ITIL|PeopleCert|PRINCE2|AXELOS/ },
];
const MARK_HOMONYMS = /\bACE inhibitors?\b/g;

export function certMarkProblems(doc: ScenarioDoc): Problem[] {
  const strict = MARK_PROFILES.has(doc.outcome?.profile);
  const out: Problem[] = [];
  const walk = (x: unknown, path: string): void => {
    if (typeof x === "string") {
      const hit = strict ? CERT_MARKS.find((r) => r.test(x)) : undefined;
      if (hit) {
        out.push({ level: "error", path, message: `names a certifying body's mark (${hit.source}); learner-facing sim text says "your professional code of ethics" or the course's topic instead (REQ-313)` });
        return;
      }
      const plain = x.replace(MARK_HOMONYMS, "");
      const body = PERMISSION_BODY_MARKS.find((b) => b.marks.test(plain));
      if (body) out.push({ level: "error", path, message: `names a mark of ${body.body} (${plain.match(body.marks)?.[0]}), whose policy allows no use without written permission; describe the role or the topic instead (REQ-309)` });
      return;
    }
    if (Array.isArray(x)) return x.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (x && typeof x === "object") for (const [k, v] of Object.entries(x as Record<string, unknown>)) if (!NOT_LEARNER_TEXT.has(k)) walk(v, path ? `${path}.${k}` : k);
  };
  walk(doc, "");
  return out;
}

// REQ-312 (docs/sims.md 22.25): on the data and code console nothing the
// learner types reaches the engine. A data-screen document may not use the
// typed `command` or `query` params; every learner input is a choice (an
// editable cell is an action with one choice param, checked by the
// validator), a form of choices, a pick or a slot.
export function dataConsoleProblems(doc: ScenarioDoc): Problem[] {
  if (doc.screen?.type !== "data") return [];
  const out: Problem[] = [];
  for (const [id, a] of Object.entries(doc.actions ?? {})) {
    (a.params ?? []).forEach((p, i) => {
      if (p.kind === "command" || p.kind === "query") out.push({ level: "error", path: `actions.${id}.params[${i}]`, message: `a ${p.kind} param takes typed text; on the data console every input is an authored choice and nothing typed is executed (REQ-312)` });
    });
  }
  return out;
}

// REQ-314 (docs/sims.md 22.27): the sandbox report is defensive only. A
// malware analysis sim teaches reading a report and acting on it; it never
// carries anything a reader could run or reach. In every learner-visible
// string (everything but `sources`, `safetyNote` and `scoring.modelReasoning`
// is checked, which over-covers on purpose) of a document that uses the
// sandbox screen: no live link (http:// or https:// must be defanged as
// hxxp), no encoded blob (a run of 40 or more base64 characters), no
// script-host switches that run encoded or downloaded code, no script tags
// and no PE header bytes; every IPv4 address is from the documentation
// ranges (RFC 5737) or private space, and every domain in the network calls
// and the domain or URL indicators is a reserved name (RFC 2606, RFC 6761).
// Other screens are not checked: the security console's incidents already
// follow the documentation-range rule in their own tests.
const DOC_IPV4 = [/^192\.0\.2\./, /^198\.51\.100\./, /^203\.0\.113\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^127\./];
const RESERVED_DOMAIN = /(^|\.)(example\.(com|net|org)|[a-z0-9-]+\.(example|test|invalid|localhost))$/;
export function sandboxSafetyProblems(doc: ScenarioDoc): Problem[] {
  if (!doc.screen?.sandbox && doc.screen?.type !== "sandbox-report") return [];
  const out: Problem[] = [];
  const bad = (path: string, message: string): void => {
    out.push({ level: "error", path, message: `${message} (the sandbox report is defensive only, docs/sims.md 22.27)` });
  };
  const skip = new Set(["sources", "safetyNote", "modelReasoning", "source", "url"]);
  const walk = (x: unknown, path: string): void => {
    if (typeof x === "string") {
      if (/https?:\/\//i.test(x)) bad(path, "has a live link; defang it (hxxp://, example[.]com)");
      if (/[A-Za-z0-9+/]{40,}={0,2}/.test(x) && !/^[0-9a-f]{40,64}$/i.test(x.match(/[A-Za-z0-9+/]{40,}={0,2}/)?.[0] ?? "")) bad(path, "has an encoded blob (40+ base64 characters); describe it instead");
      if (/-e(nc(odedcommand)?)?\s+[A-Za-z0-9+/=]{8,}|downloadstring|invoke-expression|\biex\s*\(|frombase64string/i.test(x)) bad(path, "has a runnable script-host command line; describe what it does instead");
      if (/<script|4d5a9000|\\x4d\\x5a/i.test(x)) bad(path, "has script or executable bytes");
      for (const ip of x.match(/\b\d{1,3}(\.\d{1,3}){3}\b/g) ?? []) if (!DOC_IPV4.some((r) => r.test(ip))) bad(path, `IPv4 ${ip} is not a documentation (RFC 5737) or private address`);
      return;
    }
    if (Array.isArray(x)) return x.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (x && typeof x === "object") for (const [k, v] of Object.entries(x as Record<string, unknown>)) if (!skip.has(k)) walk(v, path ? `${path}.${k}` : k);
  };
  walk(doc, "");
  const sb = doc.screen.sandbox;
  const domainCheck = (text: string, path: string): void => {
    const plain = text.replace(/\[\.\]/g, ".").replace(/\{[^}]*\}/g, "");
    for (const m of plain.match(/\b[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}\b/gi) ?? []) {
      if (/^\d+(\.\d+)+$/.test(m) || /\.(exe|dll|ps1|js|vbs|bat|cmd|tmp|dat|lnk|docm|xlsm|zip|iso|txt|log|evtx|pcap|json|yar|yml)$/i.test(m)) continue;
      if (!RESERVED_DOMAIN.test(m.toLowerCase())) bad(path, `domain ${m} is not a reserved name (example.com, .example, .test, .invalid)`);
    }
  };
  (sb?.network ?? []).forEach((n, i) => domainCheck(n.dest, `screen.sandbox.network[${i}].dest`));
  (sb?.indicators ?? []).forEach((n, i) => {
    if (n.type === "domain" || n.type === "url") domainCheck(n.value, `screen.sandbox.indicators[${i}].value`);
  });
  return out;
}

// `full` false = schema only (sims:validate); true adds the semantic and
// content layers, golden replays and the path search (sims:lint).
export function checkDocument(entry: DocumentEntry, opts: { full: boolean; now?: string; searchNodes?: number }): DocumentReport {
  const problems: Problem[] = [];
  const compiled = compileEntry(entry);
  problems.push(...compiled.problems);
  const raw = compiled.problems.some((p) => p.level === "error") ? null : compiled.doc;
  const rawGolden = entry.golden ? readJson(entry.golden, problems, "golden") : null;
  let doc: ScenarioDoc | null = null;
  let golden: GoldenFile | null = null;
  if (raw) {
    const sp = schemaProblems(raw);
    for (const m of sp) problems.push({ level: "error", path: "schema", message: m });
    if (!sp.length) doc = raw as ScenarioDoc;
    if (doc && doc.slug !== entry.slug) problems.push({ level: "error", path: "slug", message: `document slug ${doc.slug} does not match its file name ${entry.slug}` });
  }
  if (entry.golden && rawGolden) {
    const g = goldenFileSchema.safeParse(rawGolden);
    if (!g.success) for (const i of g.error.issues) problems.push({ level: "error", path: `golden.${i.path.join(".")}`, message: i.message });
    else golden = rawGolden as GoldenFile;
    if (golden && golden.slug !== entry.slug) problems.push({ level: "error", path: "golden.slug", message: `golden slug ${golden.slug} does not match ${entry.slug}` });
  }
  if (!entry.golden) problems.push({ level: "error", path: "golden", message: "every seeded document needs a golden file (9.2: Good, Mediocre and Bad paths)" });
  let goldenResults: GoldenResult[] = [];
  if (opts.full && doc) {
    goldenResults = golden ? replayGolden(doc, golden) : [];
    problems.push(...lintScenario(doc, { now: opts.now, safetyFamily: safetyFamilyOf(doc), golden, goldenResults, searchNodes: opts.searchNodes ?? 4000 }));
    problems.push(...endingOrderProblems(doc, golden));
    problems.push(...secondsUnitProblems(doc));
    problems.push(...backslashEscapeProblems(doc));
    problems.push(...dataConsoleProblems(doc));
    problems.push(...certMarkProblems(doc));
    problems.push(...sandboxSafetyProblems(doc));
  }
  return { entry, doc, golden, problems, goldenResults };
}

export function formatReport(r: DocumentReport): string[] {
  const out: string[] = [];
  const errors = r.problems.filter((p) => p.level === "error").length;
  const warnings = r.problems.length - errors;
  out.push(`${r.entry.course}/${r.entry.slug}: ${errors} error(s), ${warnings} warning(s)`);
  for (const p of r.problems) out.push(`  ${p.level === "error" ? "ERROR" : "warn "} ${p.path}: ${p.message}`);
  for (const g of r.goldenResults) {
    const d = g.debrief;
    out.push(`  golden ${g.path.id}: ${d.ending} / ${d.outcomeClass} / ${d.rating} (score ${d.processScore})${g.mismatches.length ? `, ${g.mismatches.length} mismatch(es)` : ""}${g.error ? `, error ${g.error}` : ""}`);
  }
  return out;
}
