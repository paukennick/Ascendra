import React, { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, Text, TextInput, View, type LayoutChangeEvent } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Body, IconButton, MIN_TOUCH, Muted } from "@/components/ui";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import {
  COMMAND_MAX,
  INTERACTIVE_HINT,
  MARK_LABEL,
  NUMERIC_MAX,
  dragSteps,
  encodeMatch,
  encodeOrder,
  encodeSelect,
  keyText,
  matchFrom,
  matchMarks,
  moveItem,
  moveTo,
  orderFrom,
  orderItemA11y,
  orderMarks,
  selectFrom,
  selectLineA11y,
  selectMarks,
  setPair,
  toggleLine,
  type InteractiveInput,
  type InteractiveKey,
  type Mark,
} from "@/lib/labInteractive";

// REQ-189: the controls for interactive lab parts, and how a graded one is
// shown. Plain React Native (no gesture library), so it runs the same on
// iOS, Android and web. Every control is reachable without dragging: order
// has up/down buttons and screen-reader actions; match and select are taps.
// Touch targets are at least 48 dp (ui.tsx MIN_TOUCH, above the 44 pt
// minimum); state is always written out, never colour alone.

type Props = {
  label: string;
  input: InteractiveInput;
  value: string;
  onChange: (v: string) => void;
};

export function InteractivePartField({ label, input, value, onChange }: Props) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 }} accessibilityRole="header">
        {label}
      </Text>
      <Muted style={{ fontSize: 12 }}>{INTERACTIVE_HINT[input.type]}</Muted>
      {input.type === "order" ? <OrderField label={label} input={input} value={value} onChange={onChange} /> : null}
      {input.type === "match" ? <MatchField label={label} input={input} value={value} onChange={onChange} /> : null}
      {input.type === "select" ? <SelectField label={label} input={input} value={value} onChange={onChange} /> : null}
      {input.type === "command" ? <CommandField label={label} input={input} value={value} onChange={onChange} /> : null}
      {input.type === "numeric" ? <NumericField label={label} input={input} value={value} onChange={onChange} /> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Order: drag by the handle, or the up/down buttons, or screen-reader actions
// ---------------------------------------------------------------------------

function OrderField({ label, input, value, onChange }: Props & { input: Extract<InteractiveInput, { type: "order" }> }) {
  const ids = orderFrom(value, input);
  const text = useMemo(() => new Map(input.items.map((c) => [c.id, c.text])), [input]);
  const [rowH, setRowH] = useState(56);
  const [drag, setDrag] = useState<{ index: number; dy: number } | null>(null);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const commit = (next: string[]) => onChange(encodeOrder(next));

  return (
    <View accessibilityLabel={`${label}: ${ids.length} items to order`} style={{ gap: spacing.xs }}>
      {ids.map((id, i) => (
        <OrderRow
          key={id}
          text={text.get(id) ?? ""}
          index={i}
          count={ids.length}
          dragging={drag?.index === i ? drag.dy : null}
          onLayout={(e) => setRowH(e.nativeEvent.layout.height + spacing.xs)}
          onDrag={(dy) => setDrag({ index: i, dy })}
          onDrop={(dy) => {
            setDrag(null);
            commit(moveTo(idsRef.current, i, i + dragSteps(dy, rowH)));
          }}
          onMove={(delta) => commit(moveItem(idsRef.current, i, delta))}
        />
      ))}
    </View>
  );
}

function OrderRow({
  text,
  index,
  count,
  dragging,
  onLayout,
  onDrag,
  onDrop,
  onMove,
}: {
  text: string;
  index: number;
  count: number;
  dragging: number | null;
  onLayout: (e: LayoutChangeEvent) => void;
  onDrag: (dy: number) => void;
  onDrop: (dy: number) => void;
  onMove: (delta: -1 | 1) => void;
}) {
  // Handlers read through a ref so the responder (made once) calls the
  // current row's callbacks after a re-order.
  const cb = useRef({ onDrag, onDrop });
  cb.current = { onDrag, onDrop };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_e, g) => cb.current.onDrag(g.dy),
        onPanResponderRelease: (_e, g) => cb.current.onDrop(g.dy),
        onPanResponderTerminate: () => cb.current.onDrop(0),
      }),
    []
  );
  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityLabel={orderItemA11y(text, index, count)}
      accessibilityHint="Swipe up or down with one finger to hear the actions to move it."
      accessibilityActions={[
        { name: "moveUp", label: "Move up" },
        { name: "moveDown", label: "Move down" },
      ]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === "moveUp") onMove(-1);
        if (e.nativeEvent.actionName === "moveDown") onMove(1);
      }}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          minHeight: MIN_TOUCH,
          paddingLeft: spacing.xs,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: dragging !== null ? colors.accent : colors.border,
          backgroundColor: dragging !== null ? colors.cardPressed : colors.cardAlt,
        },
        dragging !== null ? { transform: [{ translateY: dragging }], zIndex: 10 } : null,
      ]}
    >
      <View
        {...pan.panHandlers}
        importantForAccessibility="no-hide-descendants"
        style={{ width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center", cursor: "grab" } as object}
      >
        <Feather name="menu" size={18} color={colors.muted} />
      </View>
      <Text style={{ color: colors.mutedDim, fontFamily: fonts.monoMedium, width: 22 }}>{index + 1}.</Text>
      <Body style={{ flex: 1, paddingVertical: spacing.sm }}>{text}</Body>
      <View style={{ flexDirection: "row" }} importantForAccessibility="no-hide-descendants">
        <IconButton icon="chevron-up" size={MIN_TOUCH} accessibilityLabel={`Move ${text} up`} disabled={index === 0} onPress={() => onMove(-1)} />
        <IconButton icon="chevron-down" size={MIN_TOUCH} accessibilityLabel={`Move ${text} down`} disabled={index === count - 1} onPress={() => onMove(1)} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Match: for each left item, tap one of the right options
// ---------------------------------------------------------------------------

function MatchField({ input, value, onChange }: Props & { input: Extract<InteractiveInput, { type: "match" }> }) {
  const pairs = matchFrom(value, input);
  const usedBy = new Map(Object.entries(pairs).map(([l, r]) => [r, l]));
  const leftText = new Map(input.left.map((c) => [c.id, c.text]));
  return (
    <View style={{ gap: spacing.md }}>
      {input.leftHeading || input.rightHeading ? (
        <Muted style={{ fontSize: 12 }}>
          {input.leftHeading ?? "Item"} {"->"} {input.rightHeading ?? "Match"}
        </Muted>
      ) : null}
      {input.left.map((l) => (
        <View key={l.id} style={{ gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }}>
          <Body>{l.text}</Body>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }} accessibilityRole="radiogroup" accessibilityLabel={`Match for ${l.text}`}>
            {input.right.map((r) => {
              const on = pairs[l.id] === r.id;
              const other = !on && usedBy.has(r.id) ? leftText.get(usedBy.get(r.id)!) : null;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => onChange(encodeMatch(setPair(pairs, l.id, r.id)))}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${r.text}${other ? `, now matched to ${other}` : ""}`}
                  style={({ pressed }) => ({
                    minHeight: MIN_TOUCH,
                    justifyContent: "center",
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    borderColor: on ? colors.accent : colors.border,
                    backgroundColor: on ? colors.accentDim : colors.cardAlt,
                    opacity: pressed ? 0.8 : other ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: colors.text, fontFamily: on ? fonts.bodySemiBold : fonts.body, fontSize: 14 }}>
                    {on ? "[x] " : ""}
                    {r.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Muted style={{ fontSize: 12 }}>{pairs[l.id] ? `Matched: ${input.right.find((r) => r.id === pairs[l.id])?.text}` : "Not matched yet"}</Muted>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Select / hotspot: tap the lines that are the problem
// ---------------------------------------------------------------------------

function SelectField({ input, value, onChange }: Props & { input: Extract<InteractiveInput, { type: "select" }> }) {
  const picked = selectFrom(value, input);
  const mono = input.display !== "list";
  return (
    <View style={{ gap: 2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: mono ? colors.bg : colors.cardAlt, padding: spacing.xs }}>
      {input.header ? (
        <Text style={{ color: colors.muted, fontFamily: fonts.monoMedium, fontSize: 12, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }} accessibilityRole="header">
          {input.header}
        </Text>
      ) : null}
      {input.lines.map((c, i) => {
        const on = picked.includes(c.id);
        return (
          <Pressable
            key={c.id}
            onPress={() => onChange(encodeSelect(toggleLine(picked, c.id), input))}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={selectLineA11y(c.text, i, on)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              minHeight: MIN_TOUCH,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: on ? colors.warn : "transparent",
              backgroundColor: on ? colors.warnDim : pressed ? colors.cardPressed : "transparent",
            })}
          >
            <Feather name={on ? "check-square" : "square"} size={16} color={on ? colors.warn : colors.mutedDim} />
            <Text style={{ color: colors.mutedDim, fontFamily: fonts.mono, fontSize: 11, width: 20 }}>{i + 1}</Text>
            <Text style={{ flex: 1, color: colors.text, fontFamily: mono ? fonts.mono : fonts.body, fontSize: mono ? 13 : 14 }}>{c.text}</Text>
          </Pressable>
        );
      })}
      <Muted style={{ fontSize: 12, padding: spacing.xs }}>{picked.length ? `${picked.length} line${picked.length === 1 ? "" : "s"} selected` : "No line selected yet"}</Muted>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Command and numeric
// ---------------------------------------------------------------------------

function CommandField({ label, input, value, onChange }: Props & { input: Extract<InteractiveInput, { type: "command" }> }) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: MIN_TOUCH, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.bg }}
    >
      <Text style={{ color: colors.good, fontFamily: fonts.monoMedium, fontSize: 14 }} importantForAccessibility="no">
        {input.prompt}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        accessibilityLabel={`${label}. Terminal command, checked and never run.`}
        placeholder="type the command"
        placeholderTextColor={colors.mutedDim}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        autoComplete="off"
        maxLength={COMMAND_MAX}
        style={{ flex: 1, color: colors.text, fontFamily: fonts.mono, fontSize: 14, paddingVertical: 12 }}
      />
    </View>
  );
}

function NumericField({ label, input, value, onChange }: Props & { input: Extract<InteractiveInput, { type: "numeric" }> }) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: MIN_TOUCH, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.bg }}
    >
      <TextInput
        value={value}
        onChangeText={onChange}
        accessibilityLabel={`${label}. A number${input.unit ? ` in ${input.unit}` : ""}.`}
        placeholder="0"
        placeholderTextColor={colors.mutedDim}
        keyboardType="numbers-and-punctuation"
        inputMode="decimal"
        autoCorrect={false}
        maxLength={NUMERIC_MAX}
        style={{ flex: 1, color: colors.text, fontFamily: fonts.mono, fontSize: 16, paddingVertical: 12 }}
      />
      {input.unit ? <Text style={{ color: colors.muted, fontFamily: fonts.body, fontSize: 14 }}>{input.unit}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// A graded interactive part: the learner's control marked against the key
// ---------------------------------------------------------------------------

const MARK_COLOR: Record<Mark, string> = { right: colors.good, wrong: colors.warn, missed: colors.warn, neutral: colors.mutedDim };
const MARK_ICON: Record<Mark, React.ComponentProps<typeof Feather>["name"]> = {
  right: "check",
  wrong: "x",
  missed: "alert-circle",
  neutral: "minus",
};

function MarkedLine({ mark, children, a11y }: { mark: Mark; children: React.ReactNode; a11y: string }) {
  return (
    <View accessible accessibilityLabel={a11y} style={{ flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
      <Feather name={MARK_ICON[mark]} size={13} color={MARK_COLOR[mark]} style={{ marginTop: 3 }} />
      <Text style={{ flex: 1, color: colors.text, fontSize: 13, fontFamily: fonts.body }}>{children}</Text>
    </View>
  );
}

export function InteractiveResult({ input, response, interactiveKey }: { input: InteractiveInput; response: string; interactiveKey: InteractiveKey | undefined }) {
  if (!interactiveKey || interactiveKey.type !== input.type) return null;
  if (input.type === "order" && interactiveKey.type === "order") {
    return (
      <View style={{ gap: 2 }}>
        {orderMarks(response, input, interactiveKey).map((m, i) => (
          <MarkedLine key={m.id} mark={m.mark} a11y={`Position ${i + 1}: ${m.text}. ${m.mark === "right" ? "Right place" : `Belongs at ${m.should}`}.`}>
            {i + 1}. {m.text}
            {m.mark === "right" ? "" : ` (belongs at ${m.should})`}
          </MarkedLine>
        ))}
      </View>
    );
  }
  if (input.type === "match" && interactiveKey.type === "match") {
    return (
      <View style={{ gap: 2 }}>
        {matchMarks(response, input, interactiveKey).map((m) => (
          <MarkedLine key={m.left} mark={m.mark} a11y={`${m.left}: you chose ${m.got ?? "nothing"}. ${m.mark === "right" ? "Right" : `The match is ${m.want}`}.`}>
            {m.left}: {m.got ?? "(not matched)"}
            {m.mark === "right" ? "" : ` -- match is ${m.want}`}
          </MarkedLine>
        ))}
      </View>
    );
  }
  if (input.type === "select" && interactiveKey.type === "select") {
    return (
      <View style={{ gap: 2 }}>
        {selectMarks(response, input, interactiveKey).map((m, i) => (
          <MarkedLine key={m.id} mark={m.mark} a11y={`Line ${i + 1}: ${m.text}. ${MARK_LABEL[m.mark] || "Fine, not selected"}.`}>
            <Text style={{ fontFamily: input.display === "list" ? fonts.body : fonts.mono }}>{m.text}</Text>
            {MARK_LABEL[m.mark] ? ` -- ${MARK_LABEL[m.mark]}` : ""}
          </MarkedLine>
        ))}
      </View>
    );
  }
  return <Muted style={{ fontSize: 13, color: colors.text }}>Accepted: {keyText(interactiveKey, input)}</Muted>;
}
