import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SheetModal } from "@/components/SheetModal";
import { Body, Button, Checkbox, ErrorBanner, Muted, TextField } from "@/components/ui";
import { OWNER } from "@/content/legal";
import { digitsOnly } from "@/lib/dateOfBirth";
import {
  MATURE_ATTESTATION_STATEMENT,
  MATURE_CONFIRM_LABEL,
  MATURE_DECLINE_LABEL,
  MATURE_DOB_INTRO,
  MATURE_NOTICE_LINES,
  MATURE_NOTICE_TITLE,
  MATURE_UNDERAGE_CLOSE_LABEL,
  MATURE_UNDERAGE_LINES,
  MATURE_UNDERAGE_TITLE,
  validateMatureForm,
  type NoticeMode,
} from "@/lib/matureContent";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";

// What the sheet sends: the attestation, and the date of birth the first time.
export type MatureSheetSubmit = { attested: true; dateOfBirth?: string };

// REQ-224 / REQ-259: the 18+ mature-content notice (text and form rules in
// src/lib/matureContent.ts), shown by MatureContentProvider over the intake
// form, or over any screen whose request the server refused for a missing
// acknowledgement of that course. The first time it also asks for a date of
// birth (day, month, year: number boxes that work on a phone and the web);
// every time it has the attestation checkbox. "Not now" sends nothing. When
// the account's date of birth makes it under 18 there is no form, only a kind
// message. A SheetModal, so it hides under the app lock (REQ-192).
export function MatureContentSheet({
  visible,
  mode,
  courseTitle,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  mode: NoticeMode;
  courseTitle?: string;
  busy: boolean;
  error: string | null;
  onConfirm: (form: MatureSheetSubmit) => void;
  onCancel: () => void;
}) {
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [ticked, setTicked] = useState(false);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [errors, setErrors] = useState<{ dateOfBirth?: string; attested?: string }>({});
  useEffect(() => {
    if (!visible) {
      setTicked(false);
      setDay("");
      setMonth("");
      setYear("");
      setErrors({});
    }
  }, [visible]);
  if (!visible) return null;

  const submit = () => {
    const result = validateMatureForm({ needsDateOfBirth: mode === "form_with_dob", day, month, year, attested: ticked });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    onConfirm(result.body);
  };

  const blocked = mode === "blocked";
  return (
    <SheetModal transparent visible animationType={reduced ? "none" : "slide"} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityRole="button" accessibilityLabel="Close without confirming" />
        <View style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }]} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={{ gap: spacing.sm }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title} accessibilityRole="header">
              {blocked ? MATURE_UNDERAGE_TITLE : MATURE_NOTICE_TITLE}
            </Text>
            {blocked ? (
              MATURE_UNDERAGE_LINES(OWNER.contactEmail).map((line) => (
                <Body key={line} style={{ fontSize: 15, lineHeight: 22 }}>
                  {line}
                </Body>
              ))
            ) : (
              <>
                {courseTitle ? <Muted>{courseTitle}</Muted> : null}
                {MATURE_NOTICE_LINES.map((line) => (
                  <Body key={line} style={{ fontSize: 15, lineHeight: 22 }}>
                    {line}
                  </Body>
                ))}
                {mode === "form_with_dob" ? (
                  <View style={{ gap: spacing.xs }} accessibilityRole="none">
                    <Body style={{ fontSize: 15, lineHeight: 22 }}>{MATURE_DOB_INTRO}</Body>
                    <View style={{ flexDirection: "row", gap: spacing.sm }} role="group" aria-label="Date of birth">
                      <View style={{ flex: 1 }}>
                        <TextField label="Day" placeholder="DD" value={day} onChangeText={(t) => setDay(digitsOnly(t, 2))} keyboardType="number-pad" maxLength={2} onSubmitEditing={submit} returnKeyType="done" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextField label="Month" placeholder="MM" value={month} onChangeText={(t) => setMonth(digitsOnly(t, 2))} keyboardType="number-pad" maxLength={2} onSubmitEditing={submit} returnKeyType="done" />
                      </View>
                      <View style={{ flex: 1.4 }}>
                        <TextField
                          label="Year"
                          placeholder="YYYY"
                          value={year}
                          onChangeText={(t) => setYear(digitsOnly(t, 4))}
                          keyboardType="number-pad"
                          maxLength={4}
                         
                          onSubmitEditing={submit}
                          returnKeyType="done"
                        />
                      </View>
                    </View>
                    {errors.dateOfBirth ? (
                      <Text style={{ color: colors.bad, fontSize: 13 }} accessibilityLiveRegion="polite" role="alert">
                        {errors.dateOfBirth}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                <Checkbox checked={ticked} onChange={setTicked} label={MATURE_ATTESTATION_STATEMENT} error={!!errors.attested} />
                {errors.attested ? (
                  <Text style={{ color: colors.bad, fontSize: 13 }} accessibilityLiveRegion="polite" role="alert">
                    {errors.attested}
                  </Text>
                ) : null}
                {error ? <ErrorBanner message={error} /> : null}
              </>
            )}
          </ScrollView>
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            {blocked ? (
              <Button label={MATURE_UNDERAGE_CLOSE_LABEL} onPress={onCancel} />
            ) : (
              <>
                <Button label={MATURE_CONFIRM_LABEL} icon="check" loading={busy} disabled={!ticked} onPress={submit} />
                <Button label={MATURE_DECLINE_LABEL} variant="ghost" onPress={onCancel} accessibilityLabel="Not now, don't open mature content" />
              </>
            )}
          </View>
        </View>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "92%",
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  title: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 20 },
});
