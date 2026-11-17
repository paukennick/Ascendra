// REQ-314 (docs/sims.md 22.27): the facility console's view model, pure, like
// the security console's. Everything is read from `screen.facility` over the
// run: the site line, the alarm panel (open alarms first, spoken at once like
// a monitor alarm), the zones with a status in words and a tone, the badge and
// door log (newest first), the cameras described in words, the environment
// read-outs with their safe range, and the people on site. No rule of its own.
import type { Run } from "../engine/v1/engine.ts";
import type { ConsoleSeverity, DoorResult, FacilityAlarmKind, FacilityTone } from "../engine/v1/types.ts";
import { burst, clockAt, oneOf, seconds, text, truthy, value } from "./bindings.ts";

export const FACILITY_TONE_WORDS: Record<FacilityTone, string> = { secure: "secure", watch: "under watch", alarm: "in alarm", locked: "locked down" };
export const DOOR_RESULT_WORDS: Record<DoorResult, string> = { granted: "access granted", denied: "access denied", forced: "door forced open", held: "door held open", tailgate: "tailgating detected" };
export const ALARM_KIND_WORDS: Record<FacilityAlarmKind, string> = { intrusion: "Intrusion", door: "Door", duress: "Duress", fire: "Fire", power: "Power", hvac: "Cooling", water: "Water leak", other: "Alarm" };
const SEVERITY_WORDS: Record<ConsoleSeverity, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
const SEVERITY_RANK: Record<ConsoleSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const TONES: readonly FacilityTone[] = ["secure", "watch", "alarm", "locked"];
const RESULTS: readonly DoorResult[] = ["granted", "denied", "forced", "held", "tailgate"];

export interface FacilityAlarmView { id: string; kind: FacilityAlarmKind; severity: ConsoleSeverity; title: string; detail: string | null; status: string; open: boolean; time: string; at: number; a11y: string }
export interface FacilityZoneView { id: string; label: string; spokenLabel: string; kind: string; status: string; tone: FacilityTone; a11y: string }
export interface DoorLineView { id: string; reader: string; text: string; result: DoorResult; time: string; at: number; a11y: string }
export interface CameraView { id: string; label: string; spokenLabel: string; view: string; a11y: string }
export interface EnvView { id: string; label: string; spokenLabel: string; text: string; out: "low" | "high" | null; a11y: string }
export interface PersonView { id: string; label: string; status: string; flag: boolean; a11y: string }

export interface FacilityView {
  site: { name: string; status: string };
  alarms: FacilityAlarmView[];
  zones: FacilityZoneView[];
  doors: DoorLineView[];
  cameras: CameraView[];
  environment: EnvView[];
  people: PersonView[];
  meters: { id: string; label: string; text: string }[];
  openCount: number;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function facilityView(run: Run, doorLimit = 40): FacilityView | null {
  const f = run.c.doc.screen.facility;
  if (!f) return null;
  const alarms = f.alarms
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => truthy(run, a.when))
    .map(({ a, i }) => {
      const at = seconds(run, a.at);
      const open = truthy(run, a.open);
      const title = text(run, a.title);
      const status = text(run, a.status);
      const detail = a.detail ? text(run, a.detail) : null;
      const time = clockAt(run, at);
      return {
        i,
        v: { id: a.id, kind: a.kind, severity: a.severity, title, detail, status, open, time, at, a11y: `${SEVERITY_WORDS[a.severity] ?? a.severity} ${(ALARM_KIND_WORDS[a.kind] ?? "alarm").toLowerCase()} alarm at ${time}: ${title}. ${status}.${detail ? ` ${detail}` : ""}` },
      };
    })
    .sort((x, y) => Number(y.v.open) - Number(x.v.open) || y.v.at - x.v.at || (SEVERITY_RANK[x.v.severity] ?? 9) - (SEVERITY_RANK[y.v.severity] ?? 9) || x.i - y.i)
    .map((x) => x.v);
  const zones = f.zones.map((z) => {
    const tone = oneOf(value(run, z.tone), TONES, "watch");
    const status = text(run, z.status);
    return { id: z.id, label: z.label, spokenLabel: z.spokenLabel, kind: z.kind, status, tone, a11y: `${z.spokenLabel}, ${z.kind}: ${FACILITY_TONE_WORDS[tone]}. ${status}` };
  });
  const doors = f.doors
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => truthy(run, d.when))
    .map(({ d, i }) => {
      const at = seconds(run, d.at);
      const result = oneOf(value(run, d.result), RESULTS, "granted");
      const t = text(run, d.text);
      const time = clockAt(run, at);
      return { i, v: { id: d.id, reader: d.reader, text: t, result, time, at, a11y: `${time}, ${d.reader}: ${DOOR_RESULT_WORDS[result]}. ${t}` } };
    })
    .sort((x, y) => y.v.at - x.v.at || y.i - x.i)
    .slice(0, doorLimit)
    .map((x) => x.v);
  const cameras = f.cameras
    .filter((c) => truthy(run, c.when, true))
    .map((c) => {
      const view = text(run, c.view);
      return { id: c.id, label: c.label, spokenLabel: c.spokenLabel, view, a11y: `Camera ${c.spokenLabel}: ${view}` };
    });
  const environment = f.environment.map((e) => {
    const v = num(value(run, e.value));
    const shown = v === null ? "no reading" : `${v.toFixed(e.precision ?? 0)} ${e.unit}`;
    const out = v === null ? null : e.low !== undefined && v < e.low ? "low" : e.high !== undefined && v > e.high ? "high" : null;
    const range = e.low !== undefined || e.high !== undefined ? ` Safe range ${e.low ?? "-"} to ${e.high ?? "-"} ${e.unit}.` : "";
    return { id: e.id, label: e.label, spokenLabel: e.spokenLabel, text: shown, out, a11y: `${e.spokenLabel}: ${shown}${out ? `, too ${out}` : ""}.${range}` } as EnvView;
  });
  const people = (f.people ?? [])
    .filter((p) => truthy(run, p.when))
    .map((p) => {
      const label = text(run, p.label);
      const status = text(run, p.status);
      const flag = truthy(run, p.flag);
      return { id: p.id, label, status, flag, a11y: `${flag ? "Needs attention. " : ""}${label}: ${status}` };
    });
  const meters = (f.meters ?? []).map((m) => ({ id: m.id, label: m.label, text: text(run, m.value) }));
  return { site: { name: f.site.name, status: text(run, f.site.status) }, alarms, zones, doors, cameras, environment, people, meters, openCount: alarms.filter((a) => a.open).length };
}

// Spoken at once (13.2): open alarms, an environment reading out of its safe
// range, and a person flagged as needing attention. The text is stable while
// the condition holds, so it is spoken when it starts and again as cleared.
export function facilityAlarmTexts(v: FacilityView | null): string[] {
  if (!v) return [];
  return [
    ...v.alarms.filter((a) => a.open).map((a) => `${SEVERITY_WORDS[a.severity]} ${ALARM_KIND_WORDS[a.kind].toLowerCase()} alarm: ${a.title}`),
    ...v.environment.filter((e) => e.out).map((e) => `${e.spokenLabel} too ${e.out}`),
    ...v.people.filter((p) => p.flag).map((p) => `${p.label} needs attention`),
  ];
}

// Polite news (at most one sentence per 10 s, the announcer's rate): a zone's
// tone, a closed alarm's new status, a camera's new view, and new door log
// lines summarized as one sentence.
export function facilityNews(prev: FacilityView | null, next: FacilityView | null): string[] {
  if (!prev || !next) return [];
  const out: string[] = [];
  for (const z of next.zones) {
    const p = prev.zones.find((x) => x.id === z.id);
    if (p && p.tone !== z.tone) out.push(`${z.spokenLabel} now ${FACILITY_TONE_WORDS[z.tone]}.`);
  }
  for (const a of next.alarms) {
    if (a.open) continue;
    const p = prev.alarms.find((x) => x.id === a.id);
    if (p && p.status !== a.status) out.push(`Alarm ${a.title}: ${a.status}.`);
  }
  for (const c of next.cameras) {
    const p = prev.cameras.find((x) => x.id === c.id);
    if (!p || p.view !== c.view) out.push(`Camera ${c.spokenLabel}: ${c.view}`);
  }
  const seen = new Set(prev.doors.map((d) => d.id));
  out.push(...burst(next.doors.filter((d) => !seen.has(d.id)).map((d) => d.a11y), "New door log line.", "new door log lines."));
  return out;
}

// "Read the facility": the whole screen in a few sentences.
export function facilitySentence(v: FacilityView): string {
  const open = v.alarms.filter((a) => a.open);
  const parts: string[] = [`${v.site.name}: ${v.site.status}.`];
  parts.push(open.length ? `${open.length} open ${open.length === 1 ? "alarm" : "alarms"}: ${open.map((a) => `${SEVERITY_WORDS[a.severity]} ${ALARM_KIND_WORDS[a.kind].toLowerCase()}, ${a.title}`).join("; ")}.` : "No open alarms.");
  parts.push(`Zones: ${v.zones.map((z) => `${z.spokenLabel} ${FACILITY_TONE_WORDS[z.tone]}`).join("; ")}.`);
  if (v.environment.length) parts.push(`Environment: ${v.environment.map((e) => `${e.spokenLabel} ${e.text}${e.out ? `, too ${e.out}` : ""}`).join("; ")}.`);
  const flagged = v.people.filter((p) => p.flag);
  if (flagged.length) parts.push(`Needs attention: ${flagged.map((p) => p.label).join("; ")}.`);
  for (const m of v.meters) parts.push(`${m.label}: ${m.text}.`);
  if (v.doors.length) parts.push(`Latest door log line: ${v.doors[0].a11y}`);
  return parts.join(" ");
}
