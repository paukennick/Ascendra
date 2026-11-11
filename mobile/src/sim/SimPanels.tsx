import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, Text, View } from "react-native";
import { SheetModal } from "@/components/SheetModal";
import Feather from "@expo/vector-icons/Feather";
import { Badge, Body, Button, Card, Chip, ErrorBanner, H2, H3, Muted, TextField, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { friendlyError } from "@/lib/errorMessage";
import { useStoredDraft } from "@/lib/useStoredDraft";
import type { Run } from "./engine/v1/engine.ts";
import type { ActionParam, WaitInfo } from "./engine/v1/types.ts";
import { slotChoices, waitLabel, type ActionView, type RunView, type SessionView, type TileView, type ZoneView } from "./runtime/view.ts";
import { cprCommandText, measureTaps, MEASURE_EVERY_MS, STOP_AFTER_MS, tapFeedback, windowAfter, type TapMeasure } from "./runtime/tapPad.ts";
import type { CommandInput } from "./runtime/session.ts";
import type { CalmOffer, ChapterOffer, LaunchChoice, LaunchView, PaceOption, TeachFeedback, TeachOffer } from "./runtime/pacing.ts";
import type { Pace } from "./engine/v1/types.ts";
import type { ReasoningResult, SimDebrief } from "./useSimRun";

// REQ-190 (docs/sims.md 8, 13): the sim screen's panels. Every panel reads
// the view model (src/sim/runtime/view.ts) and emits commands; none holds a
// rule. Accessibility: every control is a labelled button of at least 48 dp
// (MIN_TOUCH, above the 44 pt minimum); each vital tile and each topology
// zone is one accessible element with its value and state in words; alarms
// change text and border, never flash; the compression pad has a non-tap
// alternative (the paced form), scored as its own mode.

const MONITOR = { bg: "#0B0C10", card: "#12141B", text: "#F2F2F5", dim: "#A6A9B6" };
const TILE_COLOUR: Record<TileView["colour"], string> = {
  ecg: "#5BC998",
  art: "#E38484",
  cvp: "#7FB7F0",
  pa: "#E3AC56",
  spo2: "#7FD6E3",
  neutral: "#C9CBD6",
};

const now = (): number => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now());

export function VitalsPanel({ tiles, onRead }: { tiles: TileView[]; onRead: () => void }) {
  if (!tiles.length) return null;
  return (
    <View style={{ backgroundColor: MONITOR.bg, borderRadius: radius.md, padding: spacing.sm, gap: spacing.sm }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {tiles.map((t) => (
          <View
            key={t.id}
            accessible
            accessibilityLabel={t.a11y}
            style={{
              flexGrow: 1,
              flexBasis: "45%",
              minWidth: 140,
              minHeight: MIN_TOUCH,
              backgroundColor: MONITOR.card,
              borderRadius: radius.sm,
              padding: spacing.sm,
              borderWidth: 2,
              borderColor: t.alarm ? colors.bad : "transparent",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: TILE_COLOUR[t.colour], fontWeight: "700", fontSize: 13 }}>{t.label}</Text>
              {t.alarm ? <Text style={{ color: colors.bad, fontWeight: "700", fontSize: 12 }}>{t.alarm === "low" ? "LOW" : "HIGH"}</Text> : null}
            </View>
            <Text style={{ color: MONITOR.text, fontSize: 28, fontWeight: "700" }}>
              {t.text}
              {t.trend ? <Text style={{ fontSize: 14, color: MONITOR.dim }}>{t.trend === "rising" ? " ▲ rising" : " ▼ falling"}</Text> : null}
            </Text>
            <Text style={{ color: MONITOR.dim, fontSize: 12 }}>{t.unit}{t.sub ? ` · ${t.sub}` : ""}</Text>
          </View>
        ))}
      </View>
      <Button label="Read vitals" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel="Read all vitals aloud" />
    </View>
  );
}

export function TopologyPanel({ zones, meters }: { zones: ZoneView[]; meters: { id: string; label: string; text: string }[] }) {
  if (!zones.length) return null;
  return (
    <Card>
      <H2>Architecture</H2>
      {meters.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {meters.map((m) => (
            <View key={m.id} accessible accessibilityLabel={`${m.label}: ${m.text}`} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
              <Muted style={{ fontSize: 12 }}>{m.label}</Muted>
              <Body style={{ fontWeight: "700" }}>{m.text}</Body>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {zones.map((z) => (
          <View
            key={z.id}
            accessible
            accessibilityLabel={z.a11y}
            style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150, minHeight: 64, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
          >
            <Muted style={{ fontSize: 12 }}>{z.label}</Muted>
            {z.items.length ? z.items.map((it) => <Body key={it} style={{ fontSize: 14 }}>{it}</Body>) : <Muted style={{ fontSize: 13 }}>Empty</Muted>}
          </View>
        ))}
      </View>
    </Card>
  );
}

// REQ-225: a client session's wait is the conversation going on ("Let the
// conversation continue (about 3 min)"), so it is shown as its own label,
// with no "Advance to" in front (`plain`).
export function WaitsRow({ run, waits, turns, onSkip, disabled, plain }: { run: Run; waits: WaitInfo[]; turns: boolean; onSkip: (w: WaitInfo) => void; disabled: boolean; plain?: boolean }) {
  if (!waits.length) return null;
  const verb = plain ? "" : turns ? "Advance to" : "Skip to";
  return (
    <View style={{ gap: spacing.xs }}>
      {waits.slice(0, 3).map((w) => {
        const l = waitLabel(run, w);
        return (
          <Button
            key={`${w.timer}:${w.instance}`}
            label={verb ? `${verb}: ${l.label}` : l.label}
            accessibilityLabel={verb ? `${verb} ${l.a11y}` : l.a11y}
            icon="fast-forward"
            variant="ghost"
            disabled={disabled}
            onPress={() => onSkip(w)}
          />
        );
      })}
    </View>
  );
}

// REQ-225 (docs/sims.md 8.2, 13, 20.2): the client session. The client's
// name and presentation, what they said last, each client state as a word
// with a bar (the word carries the meaning, the bar never does alone), what
// the clinician knows so far (an alert note gets a border and the word
// "Alert", never colour alone), and the documentation so far. Every block
// is one accessible element; "Read the client" speaks all of it on demand.
export function SessionPanel({ v, said, onRead }: { v: SessionView | null; said: string | null; onRead: () => void }) {
  if (!v) return null;
  return (
    <Card>
      <View accessible accessibilityRole="header" accessibilityLabel={`${v.name}. ${v.presentation}`} style={{ gap: 2 }}>
        <H2>{v.name}</H2>
        <Body>{v.presentation}</Body>
      </View>
      {said ? (
        <View accessible accessibilityLabel={`Last said: ${said}`} style={{ borderLeftWidth: 3, borderLeftColor: colors.accent, paddingLeft: spacing.sm, gap: 2 }}>
          <Muted style={{ fontSize: 12 }}>Last said</Muted>
          <Body>{said}</Body>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {v.gauges.map((g) => (
          <View
            key={g.id}
            accessible
            accessibilityLabel={g.a11y}
            style={{ flexGrow: 1, flexBasis: "45%", minWidth: 140, minHeight: MIN_TOUCH, borderWidth: 1, borderColor: colors.borderLight, borderRadius: radius.sm, padding: spacing.sm, gap: 4 }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }}>
              <Muted style={{ fontSize: 12 }}>{g.label}</Muted>
              <Muted style={{ fontSize: 12 }}>{g.value === null ? "--" : `${Math.round(g.value)} of ${g.max}`}</Muted>
            </View>
            <Body style={{ fontWeight: "700" }}>{g.word}</Body>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" }}>
              <View style={{ width: `${Math.round(g.fraction * 100)}%`, height: 6, backgroundColor: colors.accent }} />
            </View>
          </View>
        ))}
      </View>
      {v.notes.length ? (
        <View style={{ gap: spacing.xs }}>
          <H3>What you know so far</H3>
          {v.notes.map((n) => (
            <View
              key={n.id}
              accessible
              accessibilityLabel={n.a11y}
              style={{ minHeight: MIN_TOUCH, justifyContent: "center", borderWidth: n.alert ? 2 : 0, borderColor: n.alert ? colors.bad : "transparent", borderRadius: radius.sm, padding: n.alert ? spacing.sm : 0 }}
            >
              <Muted style={{ fontSize: 12 }}>{n.alert ? `Alert · ${n.label}` : n.label}</Muted>
              <Body>{n.text}</Body>
            </View>
          ))}
        </View>
      ) : null}
      {v.record && v.record.items.length ? (
        <View accessible accessibilityLabel={`${v.record.label}: ${v.record.items.join(". ")}`} style={{ gap: 2 }}>
          <H3>{v.record.label}</H3>
          {v.record.items.map((it) => <Muted key={it}>{it}</Muted>)}
        </View>
      ) : null}
      <Button label="Read the client" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel="Read the client's presentation and state aloud" />
    </Card>
  );
}

// One spoken summary of the session panel, for "Read the client" (13.1).
export function sessionSentence(v: SessionView, said: string | null): string {
  return [`${v.name}. ${v.presentation}`, said ? `Last said: ${said}` : null, ...v.gauges.map((g) => g.a11y), ...v.notes.map((n) => n.a11y)].filter(Boolean).join(". ") + ".";
}

// REQ-209 (docs/sims.md 5.4a): the pace choice. Two buttons, one selected;
// Pause stays on the clock row at every speed (WCAG 2.2.1).
export function PaceControl({ options, onPick, disabled }: { options: PaceOption[]; onPick: (p: Pace) => void; disabled?: boolean }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Clock speed" style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {options.map((o) => (
          <Button key={o.pace} label={o.label} accessibilityLabel={o.a11y} variant={o.selected ? "primary" : "ghost"} size="sm" fullWidth={false} disabled={disabled} onPress={() => onPick(o.pace)} />
        ))}
      </View>
      <Muted style={{ fontSize: 12 }}>{options.find((o) => o.selected)?.hint}</Muted>
    </View>
  );
}

// REQ-209 (5.4a, 5.4b): asked once, before the clock first runs.
export function LaunchCard({ view, choice, onChoice, onStart }: { view: LaunchView; choice: LaunchChoice; onChoice: (c: LaunchChoice) => void; onStart: () => void }) {
  return (
    <Card elevated>
      <H2>Before you start</H2>
      <H3>Where to begin</H3>
      {view.starts.map((st) => (
        <Button
          key={st.id}
          label={st.label}
          accessibilityLabel={`${st.label}. ${st.summary}${choice.start === st.id ? " Selected." : ""}`}
          variant={choice.start === st.id ? "primary" : "ghost"}
          onPress={() => onChoice({ ...choice, start: st.id })}
        />
      ))}
      <Muted>{view.starts.find((st) => st.id === choice.start)?.summary}</Muted>
      <H3>How fast the clock runs</H3>
      <PaceControl options={view.paces} onPick={(p) => onChoice({ ...choice, pace: p })} />
      <Muted style={{ fontSize: 12 }}>Only the waiting changes. The patient, the timings and the scoring are the same at either speed, and you can change speed or pause at any time.</Muted>
      <Button label="Start" icon="play" onPress={onStart} />
    </Card>
  );
}

// REQ-209 (5.4c): offered after about 30 quiet real seconds when nothing is
// alarming, pending or due soon. It is the existing skip, so it stops early on
// any alarm or result.
export function SkipOffer({ offer, onSkip, disabled }: { offer: CalmOffer; onSkip: () => void; disabled: boolean }) {
  return (
    <Card>
      <View accessibilityLiveRegion="polite">
        <Muted>Quiet for a while. Nothing is alarming or due soon.</Muted>
      </View>
      <Button label={offer.label} accessibilityLabel={offer.a11y} icon="fast-forward" variant="ghost" disabled={disabled} onPress={onSkip} />
    </Card>
  );
}

// REQ-209 (5.4d): a prediction while a named wait runs. Answered by choice;
// not scored; the clock keeps running (pause any time).
export function TeachingCard({ offer, feedback, onAnswer, onDismiss }: { offer: TeachOffer | null; feedback: TeachFeedback | null; onAnswer: (choice: string) => void; onDismiss: () => void }) {
  if (feedback) {
    return (
      <Card>
        <View accessibilityLiveRegion="polite" style={{ gap: spacing.xs }}>
          <Badge label="Prediction (not scored)" color={colors.accent} icon="help-circle" />
          <Body>{feedback.headline}</Body>
          <Body>{feedback.explain}</Body>
          <Muted style={{ fontSize: 12 }}>Source: {feedback.source.cite}</Muted>
        </View>
        <Button label="Got it" variant="ghost" size="sm" fullWidth={false} onPress={onDismiss} />
      </Card>
    );
  }
  if (!offer) return null;
  return (
    <Card>
      <Badge label="While you wait: a prediction (not scored)" color={colors.accent} icon="help-circle" />
      <H3>{offer.ask}</H3>
      {offer.choices.map((c) => <Button key={c.id} label={c.label} variant="ghost" onPress={() => onAnswer(c.id)} />)}
    </Card>
  );
}

// REQ-209 (5.4e): the clock is paused at the break. Either choice keeps the
// run saved; "later" can be picked up on any device.
export function ChapterCard({ offer, onContinue, onLater }: { offer: ChapterOffer; onContinue: () => void; onLater: () => void }) {
  return (
    <Card elevated>
      <View accessibilityLiveRegion="polite" style={{ gap: spacing.xs }}>
        <Badge label="Chapter done: the clock is paused" color={colors.good} icon="check-circle" />
        <H2>{offer.title}</H2>
        <Muted>Your run is saved. You can carry on now, or stop here and pick it up later on this or another device.</Muted>
      </View>
      <Button label={offer.continueLabel} icon="play" accessibilityLabel={`Continue. ${offer.a11y}`} onPress={onContinue} />
      <Button label={offer.laterLabel} icon="bookmark" variant="ghost" onPress={onLater} />
    </Card>
  );
}

export function ActionBar({ run, groups, onCommand, disabled }: { run: Run; groups: RunView["groups"]; onCommand: (c: CommandInput) => boolean; disabled: boolean }) {
  const [group, setGroup] = useState<string | null>(null);
  const [action, setAction] = useState<ActionView | null>(null);
  if (!groups.length) return null;
  const open = groups.find((g) => g.group === group) ?? null;
  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }} accessibilityRole="toolbar">
        {groups.map((g) => (
          <Button key={g.group} label={g.group} fullWidth={false} disabled={disabled} onPress={() => setGroup(g.group)} accessibilityLabel={`${g.group}: ${g.actions.length} actions`} />
        ))}
      </View>
      <Sheet visible={!!open && !action} title={open?.group ?? ""} onClose={() => setGroup(null)}>
        {open?.actions.map((a) => (
          <View key={a.id} style={{ gap: 2 }}>
            <Button
              label={a.label}
              variant="ghost"
              disabled={!a.available || disabled}
              accessibilityLabel={a.available ? a.label : `${a.label}. Not available${a.why ? `: ${a.why}` : ""}`}
              onPress={() => {
                if (a.kind === "plain") {
                  onCommand({ type: "act", action: a.id });
                  setGroup(null);
                } else setAction(a);
              }}
            />
            {!a.available && a.why ? <Muted style={{ fontSize: 12 }}>{a.why}</Muted> : null}
          </View>
        ))}
      </Sheet>
      <Sheet visible={!!action} title={action?.label ?? ""} onClose={() => setAction(null)}>
        {action?.kind === "tapPad" ? (
          <CompressionPad action={action} onCommand={onCommand} onDone={() => { setAction(null); setGroup(null); }} />
        ) : action ? (
          <ParamForm run={run} action={action} onSubmit={(params) => {
            if (onCommand({ type: "act", action: action.id, params })) {
              setAction(null);
              setGroup(null);
            }
          }} />
        ) : null}
      </Sheet>
    </>
  );
}

function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!visible) return null;
  return (
    <SheetModal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: "85%", padding: spacing.md, gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <H3>{title}</H3>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" }}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}>{children}</ScrollView>
        </View>
      </View>
    </SheetModal>
  );
}

// Choices, forms (every field picked from its options), slot placement and
// typed commands. Never a free number (docs/sims.md 4.1).
function ParamForm({ run, action, onSubmit }: { run: Run; action: ActionView; onSubmit: (params: Record<string, string>) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setValues((cur) => ({ ...cur, [k]: v }));
  const needed: string[] = [];
  const body = action.params.map((p: ActionParam) => {
    switch (p.kind) {
      case "choice":
        needed.push(p.id);
        return (
          <View key={p.id} style={{ gap: spacing.xs }}>
            <Body>{p.label}</Body>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              {p.options.map((o) => <Chip key={o.value} label={o.label} active={values[p.id] === o.value} onPress={() => set(p.id, o.value)} />)}
            </View>
          </View>
        );
      case "form":
        return (
          <View key={p.id} style={{ gap: spacing.sm }}>
            <Body>{p.label}</Body>
            {p.fields.map((f) => {
              needed.push(f.id);
              return (
                <View key={f.id} style={{ gap: spacing.xs }}>
                  <Muted>{f.label}</Muted>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                    {f.options.map((o) => <Chip key={o.value} label={o.label} active={values[f.id] === o.value} onPress={() => set(f.id, o.value)} />)}
                  </View>
                </View>
              );
            })}
          </View>
        );
      case "slot": {
        needed.push(p.id, `${p.id}.slot`);
        const choices = slotChoices(run, p);
        const chosen = choices.find((c) => c.id === values[p.id]);
        return (
          <View key={p.id} style={{ gap: spacing.xs }}>
            <Body>Component</Body>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              {choices.map((c) => <Chip key={c.id} label={c.name} active={values[p.id] === c.id} onPress={() => { set(p.id, c.id); set(`${p.id}.slot`, ""); }} />)}
            </View>
            {chosen ? (
              <>
                <Body>Where</Body>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                  {chosen.slots.map((s) => <Chip key={s} label={s} active={values[`${p.id}.slot`] === s} onPress={() => set(`${p.id}.slot`, s)} />)}
                </View>
              </>
            ) : null}
          </View>
        );
      }
      case "command":
      case "query":
        needed.push(p.id);
        return <TextField key={p.id} label={p.label} value={values[p.id] ?? ""} onChangeText={(v) => set(p.id, v)} maxLength={200} />;
      default:
        return <Muted key={(p as { id: string }).id}>This control is not available in this version of the app.</Muted>;
    }
  });
  const ready = needed.every((k) => (values[k] ?? "").trim().length > 0);
  return (
    <>
      {body}
      <Button label="Confirm" icon="check" disabled={!ready} onPress={() => onSubmit(values)} />
    </>
  );
}

// Tap the beat. A measurement (integer rate and longest pause) is sent every
// 15 s while tapping and when the learner stops. Screen-reader users are
// pointed to the paced form, which is scored as its own mode.
function CompressionPad({ action, onCommand, onDone }: { action: ActionView; onCommand: (c: CommandInput) => boolean; onDone: () => void }) {
  const param = action.params[0];
  const taps = useRef<number[]>([]);
  const windowStart = useRef<number | null>(null);
  const [live, setLive] = useState<TapMeasure | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [screenReader, setScreenReader] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => undefined);
  }, []);

  const send = (end: number) => {
    const win = windowStart.current === null ? [] : windowAfter(taps.current, windowStart.current);
    const m = measureTaps(win, end);
    windowStart.current = null;
    taps.current = [];
    if (!m) return;
    if (onCommand({ type: "act", action: action.id, params: { [param.id]: cprCommandText(m) } })) {
      const text = `Sent: ${tapFeedback(m)}`;
      setSent(text);
      AccessibilityInfo.announceForAccessibility(text);
    }
  };

  useEffect(() => {
    const id = setInterval(() => {
      const t = now();
      const last = taps.current[taps.current.length - 1];
      if (windowStart.current === null || last === undefined) return;
      if (t - windowStart.current >= MEASURE_EVERY_MS || t - last >= STOP_AFTER_MS) send(t);
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ gap: spacing.sm }}>
      <Body>Tap the pad in time with your compressions: 100 to 120 a minute, and keep pauses under 10 seconds.</Body>
      {screenReader ? (
        <Card>
          <Body>With a screen reader on, use "Compressions (paced, no tapping)" in the same menu instead. It is scored as its own mode.</Body>
        </Card>
      ) : null}
      <Pressable
        onPressIn={() => {
          const t = now();
          if (windowStart.current === null) windowStart.current = t;
          taps.current.push(t);
          setLive(measureTaps(windowAfter(taps.current, windowStart.current), t));
        }}
        accessibilityRole="button"
        accessibilityLabel="Compression pad. Tap at the compression rate."
        accessibilityHint="If you use a screen reader, choose the paced compressions instead."
        style={({ pressed }) => ({
          minHeight: 180,
          borderRadius: radius.lg,
          backgroundColor: pressed ? colors.accentDim : colors.cardAlt,
          borderWidth: 2,
          borderColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        <Feather name="heart" size={40} color={colors.accent} />
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginTop: spacing.sm }}>{live ? `${live.rate} / min` : "Tap"}</Text>
      </Pressable>
      <View accessibilityLiveRegion="polite"><Muted>{sent ?? tapFeedback(live)}</Muted></View>
      <Button label="Done" variant="ghost" onPress={() => { send(now()); onDone(); }} />
    </View>
  );
}

export function PromptCard({ prompt, onChoose }: { prompt: NonNullable<RunView["prompt"]>; onChoose: (choice: string) => void }) {
  return (
    <Card elevated>
      <View accessibilityLiveRegion="polite" style={{ gap: spacing.xs }}>
        <Badge label="Decision: the clock is stopped" color={colors.accent} icon="pause" />
        <H2>{prompt.title}</H2>
        <Body>{prompt.context}</Body>
      </View>
      {prompt.choices.map((c) => <Button key={c.id} label={c.label} variant="ghost" onPress={() => onChoose(c.id)} />)}
    </Card>
  );
}

export function ReasoningCard({
  question,
  draftKey = null,
  onSubmit,
  onSkip,
  onContinue,
}: {
  question: string;
  // REQ-217 (FAIL-1050): where the typed answer is kept on the device, so a
  // killed app or a failed send doesn't lose it (null: not kept).
  draftKey?: string | null;
  onSubmit: (answer: string) => Promise<ReasoningResult>;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReasoningResult | null>(null);
  useStoredDraft(draftKey, result ? null : answer.trim() ? answer : null, (stored) => {
    if (stored) setAnswer((current) => current || stored);
  });
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await onSubmit(answer));
    } catch (err) {
      setError(friendlyError(err, { kept: true }));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card elevated>
      <Badge label="Written reasoning: the clock is stopped" color={colors.accent} icon="edit-3" />
      <H2>{question}</H2>
      {result ? (
        <View accessibilityLiveRegion="polite" style={{ gap: spacing.xs }}>
          <Body>{result.status === "grader_failed" ? "The grader could not be reached. This answer is left out of your score." : result.feedback}</Body>
          {result.fixNext ? <Muted>Next: {result.fixNext}</Muted> : null}
          <Muted style={{ color: colors.text }}>Model answer:{"\n"}{result.modelAnswer}</Muted>
          <Button label="Continue the run" icon="play" onPress={onContinue} />
        </View>
      ) : (
        <>
          <TextField label="Your reasoning" value={answer} onChangeText={setAnswer} multiline minHeight={110} maxLength={2000} autoCapitalize="sentences" placeholder="What is happening, and what do you do first?" />
          <Muted style={{ fontSize: 12 }}>Graded against the course rubric. This is fictional practice; don't enter real people's details.</Muted>
          {error ? <ErrorBanner message={error} onRetry={submit} /> : null}
          <Button label="Submit" icon="send" loading={busy} disabled={busy || !answer.trim()} onPress={submit} />
          <Button label="Skip this question" variant="link" size="sm" accessibilityLabel="Skip this question. It counts as missed." onPress={onSkip} />
        </>
      )}
    </Card>
  );
}

export function EventLog({ log, finding }: { log: RunView["log"]; finding: string | null }) {
  const [open, setOpen] = useState(true);
  return (
    <Card>
      {finding ? (
        <View accessible accessibilityLabel={`Latest finding: ${finding}`} style={{ gap: 2 }}>
          <Muted style={{ fontSize: 12 }}>Latest finding</Muted>
          <Body>{finding}</Body>
        </View>
      ) : null}
      <Button label={open ? "Hide the event log" : "Show the event log"} variant="link" size="sm" fullWidth={false} onPress={() => setOpen(!open)} />
      {open
        ? log.map((l) => (
            <View key={l.key} accessible accessibilityLabel={`${l.time}, ${l.kind === "alarm" ? "alarm, " : ""}${l.text}`} style={{ flexDirection: "row", gap: spacing.sm }}>
              <Muted style={{ fontSize: 12, minWidth: 56 }}>{l.time}</Muted>
              <Body style={{ flex: 1, fontSize: 14, color: l.kind === "alarm" || l.kind === "bad" ? colors.bad : l.kind === "good" ? colors.good : colors.text }}>
                {l.kind === "alarm" ? "Alarm: " : ""}
                {l.text}
              </Body>
            </View>
          ))
        : null}
    </Card>
  );
}

const RATING_LABEL: Record<string, string> = { good: "Good", mediocre: "Mediocre", bad: "Bad" };
const SCORE_LABEL: Record<string, string> = { met: "Met", partial: "Partly there", missed: "Not yet", na: "Not applicable", grader_failed: "Not graded" };

export function DebriefView({ d, onAgain, onBack }: { d: SimDebrief; onAgain: () => void; onBack: () => void }) {
  const quit = d.endReason === "learner_quit";
  return (
    <>
      <Card elevated>
        <View accessibilityLiveRegion="polite" style={{ gap: spacing.xs }}>
          <H2>{quit ? "Run ended early" : `${RATING_LABEL[d.rating ?? ""] ?? "Done"}: ${d.headline}`}</H2>
          {d.processScore !== null ? <Body>Process score {d.processScore} of 100{d.outcomeClass ? ` · outcome: ${d.outcomeClass}` : ""}</Body> : null}
          {d.body ? <Body>{d.body}</Body> : null}
          {d.rating === "bad" ? <Muted>The most useful kind of run to learn from.</Muted> : null}
          {d.attempt?.assisted ? <Muted>A repeat run counts lightly toward mastery.</Muted> : null}
          {quit ? <Muted>Nothing was recorded for mastery.</Muted> : null}
        </View>
      </Card>
      {d.pacing || d.focusedStart || d.calmSkips || d.chapters?.length ? (
        <Card>
          <H2>How this run was paced</H2>
          {d.pacing ? <Body>{d.pacing.note}</Body> : null}
          {d.focusedStart ? <Body>Started with "{d.focusedStart.label}" at {d.focusedStart.time}. Timing targets still count from the start of the case, and anything that start skipped is left out of your score, not counted against you.</Body> : null}
          {d.calmSkips ? <Muted>You took the "Skip to the next change" offer {d.calmSkips === 1 ? "once" : `${d.calmSkips} times`}.</Muted> : null}
          {d.chapters?.map((c) => <Muted key={c.chapter}>{c.time} {c.choice === "later" ? "Saved to finish later after" : "Finished"}: {c.label}</Muted>)}
        </Card>
      ) : null}
      {d.teaching?.length ? (
        <Card>
          <H2>Your predictions (not scored)</H2>
          {d.teaching.map((t) => (
            <View key={t.prompt} accessible accessibilityLabel={`${t.ask} You chose: ${t.chosen}. The evidence points to: ${t.expected}.`} style={{ gap: 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
              <Body>{t.ask}</Body>
              <Muted style={{ color: t.matched ? colors.good : colors.warn }}>You chose: {t.chosen}{t.matched ? "" : `. The evidence points to: ${t.expected}`}</Muted>
            </View>
          ))}
        </Card>
      ) : null}
      {d.criteria.length ? (
        <Card>
          <H2>What was scored</H2>
          {d.criteria.filter((c) => c.score !== "na").map((c) => (
            <View key={c.id} accessible accessibilityLabel={`${c.label}${c.critical ? ", critical" : ""}: ${SCORE_LABEL[c.score]}. ${c.why}`} style={{ gap: 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
              <Body>{c.label}{c.critical ? " (critical)" : ""}</Body>
              <Muted style={{ color: c.score === "met" ? colors.good : colors.warn }}>{SCORE_LABEL[c.score]}{c.why ? ` · ${c.why}` : ""}</Muted>
            </View>
          ))}
        </Card>
      ) : null}
      {d.kpis.length ? (
        <Card>
          <H2>Key numbers</H2>
          {d.kpis.map((k) => (
            <View key={k.id} accessible accessibilityLabel={`${k.label}: ${k.value}${k.expert ? `. Expert: ${k.expert}` : ""}`}>
              <Body>{k.label}: {k.value}</Body>
              {k.expert ? <Muted>Expert: {k.expert}</Muted> : null}
            </View>
          ))}
        </Card>
      ) : null}
      {d.reasoningAnswers.map((a) => (
        <Card key={a.moment}>
          <H2>{a.question}</H2>
          <Muted>Your answer: {a.answer.trim() || "(not answered)"}</Muted>
          <Body>{a.feedback}</Body>
          <Muted style={{ color: colors.text }}>Model answer:{"\n"}{a.modelAnswer}</Muted>
        </Card>
      ))}
      <Card>
        <H2>What you did</H2>
        {d.timeline.map((t, i) => <Muted key={i} style={{ fontSize: 13 }}>{t.time} {t.text}</Muted>)}
        {d.pausedSeconds ? <Muted>Paused for {Math.round(d.pausedSeconds / 60)} min in total (never scored).</Muted> : null}
        {d.expertPath.length ? (
          <>
            <H3>Expert path</H3>
            {d.expertPath.map((e, i) => <Muted key={i} style={{ fontSize: 13 }}>{e.at} {e.text}</Muted>)}
          </>
        ) : null}
        <Muted style={{ fontSize: 12 }}>Seed {d.seed}</Muted>
      </Card>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <Button label="Back to simulations" fullWidth={false} onPress={onBack} />
        <Button label="Try it again" variant="ghost" fullWidth={false} accessibilityLabel="Try this simulation again. A repeat counts lightly." onPress={onAgain} />
      </View>
    </>
  );
}
