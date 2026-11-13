// REQ-253: the "Key terms" button and sheet. A constant reference available at
// every step of a lesson: one tap opens a sheet listing the words the lesson
// uses, each with a plain sentence, an everyday example and the exam's wording
// (GET /api/objectives/:id/primer, written once per lesson and shared).
//
// Reusable and self-contained: <KeyTermsButton objectiveId=... /> anywhere in
// a lesson screen. `initiallyOpen` opens the sheet once when it mounts (the
// levels work shows it to New learners at the start of a lesson). The terms
// load when the sheet first opens, are kept on the device per learner
// (src/lib/keyTerms.ts), and open from that copy when offline.
import React, { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { SheetModal } from "@/components/SheetModal";
import { Body, Button, Muted, MIN_TOUCH } from "@/components/ui";
import { friendlyError } from "@/lib/errorMessage";
import { localDataGuard } from "@/lib/localData";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import {
  INITIAL_KEY_TERMS,
  KEY_TERMS_EMPTY_ERROR,
  KEY_TERMS_HINT,
  KEY_TERMS_LABEL,
  KEY_TERMS_LOADING,
  KEY_TERMS_OFFLINE,
  keyTermsStorageKey,
  keyTermsView,
  parseCached,
  parsePrimer,
  serializeCached,
  sheetTitleA11y,
  termA11yLabel,
  type KeyTermsState,
} from "@/lib/keyTerms";

// Loads the terms for one objective: the device copy first, then the server.
export function useKeyTerms(objectiveId: string) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<KeyTermsState>(INITIAL_KEY_TERMS);
  const started = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const key = keyTermsStorageKey(userId, objectiveId);
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const cached = parseCached(await AsyncStorage.getItem(key).catch(() => null), objectiveId);
      if (cached) setState((s) => ({ ...s, cached }));
    } catch {
      // no device copy
    }
    try {
      const fresh = parsePrimer(await api.get<unknown>(`/api/objectives/${objectiveId}/primer`));
      if (!fresh) throw new Error(KEY_TERMS_EMPTY_ERROR);
      setState((s) => ({ ...s, fresh, loading: false, error: null }));
      if (localDataGuard.mayWrite(key)) AsyncStorage.setItem(key, serializeCached(fresh)).catch(() => undefined);
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: friendlyError(err) || KEY_TERMS_EMPTY_ERROR }));
    }
  }, [objectiveId, userId]);

  // Once per objective; a retry calls load again.
  const ensure = useCallback(() => {
    if (started.current === objectiveId) return;
    started.current = objectiveId;
    void load();
  }, [load, objectiveId]);

  useEffect(() => {
    started.current = null;
    setState(INITIAL_KEY_TERMS);
  }, [objectiveId]);

  return { view: keyTermsView(state), ensure, retry: load };
}

export function KeyTermsButton({
  objectiveId,
  initiallyOpen = false,
  onOpenChange,
}: {
  objectiveId: string;
  initiallyOpen?: boolean;
  // REQ-252: told when the sheet opens and closes, so the lesson can log
  // key_terms_opened / key_terms_closed (with how long it stayed open).
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const { view, ensure, retry } = useKeyTerms(objectiveId);
  const openedOnce = useRef(false);

  useEffect(() => {
    if (initiallyOpen && !openedOnce.current) {
      openedOnce.current = true;
      ensure();
      setOpen(true);
      onOpenChange?.(true);
    }
  }, [initiallyOpen, ensure, onOpenChange]);

  const show = () => {
    ensure();
    setOpen(true);
    onOpenChange?.(true);
  };
  const hide = () => {
    setOpen(false);
    onOpenChange?.(false);
  };

  return (
    <>
      <Pressable
        onPress={show}
        accessibilityRole="button"
        accessibilityLabel={KEY_TERMS_LABEL}
        accessibilityHint={KEY_TERMS_HINT}
        hitSlop={4}
        style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
      >
        <Feather name="bookmark" size={16} color={colors.link} />
        <Text style={styles.buttonText}>{KEY_TERMS_LABEL}</Text>
      </Pressable>
      <KeyTermsSheet visible={open} onClose={hide} view={view} onRetry={retry} />
    </>
  );
}

export function KeyTermsSheet({
  visible,
  onClose,
  view,
  onRetry,
}: {
  visible: boolean;
  onClose: () => void;
  view: ReturnType<typeof keyTermsView>;
  onRetry: () => void | Promise<unknown>;
}) {
  const reduced = useReducedMotion();
  if (!visible) return null;
  return (
    <SheetModal transparent visible animationType={reduced ? "none" : "slide"} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close key terms" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <Text style={styles.kicker}>Lesson reference</Text>
          <Text
            style={styles.title}
            accessibilityRole="header"
            accessibilityLabel={view.kind === "ready" ? sheetTitleA11y(view.primer.terms.length) : KEY_TERMS_LABEL}
          >
            {KEY_TERMS_LABEL}
          </Text>
          {view.kind === "loading" ? (
            <View style={styles.center} accessible accessibilityRole="progressbar" accessibilityLabel={KEY_TERMS_LOADING}>
              <ActivityIndicator color={colors.accent} />
              <Muted>{KEY_TERMS_LOADING}</Muted>
            </View>
          ) : view.kind === "error" ? (
            <View style={styles.center} accessibilityLiveRegion="polite">
              <Body style={{ color: colors.bad, textAlign: "center" }}>{view.message}</Body>
              <Button label="Try again" icon="refresh-cw" fullWidth={false} onPress={onRetry} accessibilityLabel="Try loading the key terms again" />
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ gap: spacing.md, paddingTop: spacing.sm }} showsVerticalScrollIndicator={false}>
              {view.offline ? <Muted>{KEY_TERMS_OFFLINE}</Muted> : null}
              {view.primer.terms.map((t) => (
                <View key={t.term} style={styles.term} accessible accessibilityLabel={termA11yLabel(t)}>
                  <Text style={styles.termName}>{t.term}</Text>
                  <Body style={styles.plain}>{t.plain}</Body>
                  {t.example ? (
                    <Text style={styles.detail}>
                      <Text style={styles.detailLabel}>Example: </Text>
                      {t.example}
                    </Text>
                  ) : null}
                  {t.examWording ? (
                    <Text style={styles.detail}>
                      <Text style={styles.detailLabel}>On the exam: </Text>
                      {t.examWording}
                    </Text>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          )}
          <View style={{ marginTop: spacing.md }}>
            <Button label="Back to the lesson" accessibilityLabel="Close key terms and go back to the lesson" onPress={onClose} />
          </View>
        </View>
      </View>
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  buttonPressed: { backgroundColor: colors.cardPressed },
  buttonText: { color: colors.link, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "88%",
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  kicker: { fontFamily: fonts.monoMedium, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: colors.link },
  title: { color: colors.text, fontFamily: fonts.displaySemiBold, fontSize: 19, marginBottom: spacing.sm },
  center: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  term: { gap: 4, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  termName: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 16 },
  plain: { color: colors.text, fontSize: 15, lineHeight: 22 },
  detail: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  detailLabel: { color: colors.mutedDim, fontFamily: fonts.bodySemiBold },
});
