import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Button, MIN_TOUCH } from "@/components/ui";
import { addMonths, longDate, monthGrid, monthTitle, parseIso, weekdayNames } from "@/lib/datePicker";
import { t } from "@/lib/i18n";
import { isReducedMotion } from "@/lib/useReducedMotion";
import { colors, fonts, radius, spacing } from "@/lib/theme";

// REQ-113 (Audit 3 mobile L2): a date field that opens a month grid, in
// place of typing YYYY-MM-DD. No native picker dependency (none is
// installed, and a JS grid behaves the same on Android, iOS and web). The
// value stays an ISO date for the API; what the learner sees and hears is the
// date written out in their locale. Every day is a 48 dp button with a
// spoken date and selected/disabled state.
export function DateField({
  label,
  value,
  onChange,
  min,
  error,
}: {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  min?: string | null;
  error?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const shown = value && parseIso(value) ? longDate(value) : null;
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label} importantForAccessibility="no">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown ?? t("plan.noDate")}`}
        accessibilityHint={t("plan.pickDate")}
        style={({ pressed }) => [styles.field, error ? { borderColor: colors.bad } : null, pressed && { opacity: 0.8 }]}
      >
        <Feather name="calendar" size={16} color={colors.muted} />
        <Text style={[styles.value, !shown && { color: colors.mutedDim }]}>{shown ?? t("plan.pickDate")}</Text>
      </Pressable>
      {value ? <Button label={t("plan.clearDate")} variant="link" fullWidth={false} onPress={() => onChange(null)} /> : null}
      {error ? (
        <Text style={{ color: colors.bad, fontSize: 12 }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      {open ? (
        <MonthSheet
          initial={value}
          min={min ?? null}
          onPick={(iso) => {
            setOpen(false);
            onChange(iso);
          }}
          onCancel={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}

function MonthSheet({
  initial,
  min,
  onPick,
  onCancel,
}: {
  initial: string | null;
  min: string | null;
  onPick: (iso: string) => void;
  onCancel: () => void;
}) {
  const start = parseIso(initial) ?? parseIso(min) ?? (() => {
    const d = new Date();
    return { y: d.getFullYear(), m0: d.getMonth(), d: d.getDate() };
  })();
  const [month, setMonth] = useState({ y: start.y, m0: start.m0 });
  const weeks = useMemo(() => monthGrid(month.y, month.m0, { min }), [month, min]);
  const names = useMemo(() => weekdayNames(0), []);
  const minMonth = parseIso(min);
  const atMin = !!minMonth && month.y * 12 + month.m0 <= minMonth.y * 12 + minMonth.m0;

  return (
    <Modal transparent visible animationType={isReducedMotion() ? "none" : "fade"} onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityRole="button" accessibilityLabel={t("date.cancel")}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Pressable
              onPress={() => setMonth(addMonths(month.y, month.m0, -1))}
              disabled={atMin}
              accessibilityRole="button"
              accessibilityLabel={t("date.previousMonth")}
              accessibilityState={{ disabled: atMin }}
              style={[styles.nav, atMin && { opacity: 0.4 }]}
            >
              <Feather name="chevron-left" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.title} accessibilityRole="header" accessibilityLiveRegion="polite">
              {monthTitle(month.y, month.m0)}
            </Text>
            <Pressable
              onPress={() => setMonth(addMonths(month.y, month.m0, 1))}
              accessibilityRole="button"
              accessibilityLabel={t("date.nextMonth")}
              style={styles.nav}
            >
              <Feather name="chevron-right" size={20} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {names.map((n, i) => (
              <Text key={i} style={styles.weekday}>
                {n}
              </Text>
            ))}
          </View>
          {weeks.map((w, wi) => (
            <View key={wi} style={styles.row}>
              {w.map((c) => {
                const selected = c.iso === initial;
                const label = longDate(c.iso);
                return (
                  <Pressable
                    key={c.iso}
                    onPress={() => onPick(c.iso)}
                    disabled={c.disabled}
                    accessibilityRole="button"
                    accessibilityLabel={c.disabled ? t("date.unavailable", { date: label }) : selected ? t("date.selected", { date: label }) : label}
                    accessibilityState={{ disabled: c.disabled, selected }}
                    style={[styles.day, selected && styles.daySelected]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !c.inMonth && { color: colors.muted },
                        c.disabled && { color: colors.mutedDim, textDecorationLine: "line-through" },
                        selected && { color: colors.accentText, fontFamily: fonts.bodyBold },
                      ]}
                    >
                      {c.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <Button label={t("date.cancel")} variant="ghost" onPress={onCancel} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: MIN_TOUCH,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.cardAlt,
  },
  value: { color: colors.text, fontFamily: fonts.body, fontSize: 15, flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  nav: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  title: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 17 },
  row: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", color: colors.muted, fontFamily: fonts.monoMedium, fontSize: 12, paddingVertical: 4 },
  day: { flex: 1, minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
  daySelected: { backgroundColor: colors.accent },
  dayText: { color: colors.text, fontFamily: fonts.body, fontSize: 15 },
});
