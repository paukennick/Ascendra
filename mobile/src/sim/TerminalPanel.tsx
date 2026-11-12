import React, { useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Body, Button, Card, H3, Muted, TextField, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { TERMINAL_TONE_WORDS, commandProblem, matchCommand, suggestCommands, type TerminalCommand, type TerminalView } from "./runtime/terminalView.ts";
import type { CommandInput } from "./runtime/session.ts";
import type { TerminalTone } from "./engine/v1/types.ts";

// REQ-237 (docs/sims.md 13, 20, 22.10): the terminal and network screen.
// Three blocks in reading order (and web keyboard order): the map (nodes and
// links, each with a status in words and a tone shown as a word plus a
// color, never color alone), the transcript (command output and lines that
// appear on their own, oldest first, monospace), and the command line. The
// command line is a bounded command set, not a shell: a typed line runs only
// when it is exactly one of the phase's commands, picked suggestions run the
// same command, and anything else is answered here and sends nothing. The
// same commands stay in the action list (ActionBar) for picking. Every
// element is at least 48 dp (MIN_TOUCH). "Read the terminal" speaks it all.

const TONE_COLOR: Record<TerminalTone, string> = { up: colors.good, degraded: colors.warn, down: colors.bad, out: colors.accent };
const MONO = { bg: "#0B0C10", text: "#E6E8EF", dim: "#A6A9B6", err: "#F08A8A" };

function Pill({ tone }: { tone: TerminalTone }) {
  const c = TONE_COLOR[tone];
  return (
    <View style={{ borderWidth: 1, borderColor: c, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, alignSelf: "flex-start" }}>
      <Muted style={{ fontSize: 12, color: c, fontWeight: "700" }}>{TERMINAL_TONE_WORDS[tone]}</Muted>
    </View>
  );
}

export function TerminalPanel({
  v,
  commands,
  onCommand,
  disabled,
  onRead,
}: {
  v: TerminalView | null;
  commands: TerminalCommand[];
  onCommand: (c: CommandInput) => boolean;
  disabled: boolean;
  onRead: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  if (!v) return null;

  const run = (cmd: TerminalCommand | null, line: string) => {
    const why = cmd ? commandProblem(commands, cmd.text) : commandProblem(commands, line);
    if (why) {
      setProblem(why);
      // An error is spoken at once (13.2), not queued behind polite news.
      AccessibilityInfo.announceForAccessibility(why);
      return;
    }
    const c = cmd ?? matchCommand(commands, line)!;
    if (onCommand({ type: "act", action: c.action, ...(c.params ? { params: c.params } : {}) })) {
      setTyped("");
      setProblem(null);
    } else {
      const msg = `${c.text}: not accepted now.`;
      setProblem(msg);
      AccessibilityInfo.announceForAccessibility(msg);
    }
  };
  const suggestions = suggestCommands(commands, typed);

  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <H3>{v.downCount ? `Map (${v.downCount} down)` : "Map"}</H3>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {v.nodes.map((n) => (
            <View
              key={n.id}
              accessible
              accessibilityLabel={n.a11y}
              style={{ flexGrow: 1, flexBasis: "45%", minWidth: 150, minHeight: MIN_TOUCH, borderWidth: n.tone === "down" ? 2 : 1, borderColor: n.tone === "up" ? colors.borderLight : TONE_COLOR[n.tone], borderRadius: radius.sm, padding: spacing.sm, gap: 2 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }}>
                <Muted style={{ fontSize: 12 }}>{n.kind}</Muted>
                <Pill tone={n.tone} />
              </View>
              <Body style={{ fontWeight: "700", fontFamily: "monospace" }}>{n.label}</Body>
              <Muted>{n.status}</Muted>
            </View>
          ))}
        </View>
        {v.links.map((l) => (
          <View key={l.id} accessible accessibilityLabel={l.a11y} style={{ minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2 }}>
            <Pill tone={l.tone} />
            <View style={{ flex: 1 }}>
              <Body>{`${l.from} ↔ ${l.to}: ${l.label}`}</Body>
              <Muted style={{ fontSize: 12 }}>{l.status}</Muted>
            </View>
          </View>
        ))}
        {v.meters.map((m) => (
          <View key={m.id} accessible accessibilityLabel={`${m.label}: ${m.text}`} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
            <Muted style={{ fontSize: 12 }}>{m.label}</Muted>
            <Body>{m.text}</Body>
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <H3>Terminal</H3>
        <View style={{ backgroundColor: MONO.bg, borderRadius: radius.sm, padding: spacing.sm, gap: spacing.xs }}>
          {v.transcript.length ? null : <Muted style={{ color: MONO.dim }}>No output yet. Run a command.</Muted>}
          {v.transcript.map((e) => (
            <View key={e.key} accessible accessibilityLabel={e.a11y} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
              <Muted style={{ fontSize: 11, color: MONO.dim }}>{`${e.time}${e.kind === "line" ? (e.error ? " · error" : " · log") : ""}`}</Muted>
              <Body style={{ fontFamily: "monospace", fontSize: 13, color: e.error ? MONO.err : MONO.text }}>{e.text}</Body>
            </View>
          ))}
        </View>
        <View accessible accessibilityLabel={`Prompt: ${v.prompt}`}>
          <Muted style={{ fontFamily: "monospace" }}>{v.prompt}</Muted>
        </View>
        <TextField
          label="Command"
          value={typed}
          onChangeText={(t) => {
            setTyped(t);
            if (problem) setProblem(null);
          }}
          placeholder="Type a command, or pick one below"
          autoCapitalize="none"
          maxLength={200}
          returnKeyType="go"
          onSubmitEditing={() => run(null, typed)}
        />
        {problem ? (
          <View accessibilityLiveRegion="assertive">
            <Muted style={{ color: colors.bad }}>{problem}</Muted>
          </View>
        ) : null}
        <Button label="Run" icon="corner-down-left" fullWidth={false} disabled={disabled || !typed.trim()} onPress={() => run(null, typed)} accessibilityLabel={`Run ${typed.trim() || "the typed command"}`} />
        {suggestions.map((c) => (
          <Button
            key={`${c.action}:${c.text}`}
            label={c.text}
            variant="ghost"
            size="sm"
            disabled={disabled || !c.available}
            onPress={() => run(c, c.text)}
            accessibilityLabel={c.available ? `Run ${c.text}` : `${c.text}. Not available${c.why ? `: ${c.why}` : ""}`}
          />
        ))}
      </View>
      <Button label="Read the terminal" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel="Read the map, the meters and the latest output aloud" />
    </Card>
  );
}
