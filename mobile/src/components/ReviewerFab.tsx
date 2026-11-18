import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Button, Chip, ErrorBanner, H2, IconButton, Muted, TextField } from "@/components/ui";
import { SheetModal } from "@/components/SheetModal";
import { useWideWeb } from "@/components/WebColumn";
import { friendlyError } from "@/lib/errorMessage";
import { feedbackHref } from "@/lib/reviewers";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { isReducedMotion } from "@/lib/useReducedMotion";
import { knownCourseTitle, rememberCourseTitle, useCurrentFacts, type ScreenTimer } from "@/lib/reviewerFacts";
import {
  buildQuickContext,
  canSeeFab,
  contextLine,
  FAB_A11Y_LABEL,
  FAB_LABEL,
  fabOnRoute,
  isTimedRoute,
  QUICK_NOTE_MAX,
  QUICK_NOTE_SENT,
  QUICK_TAG_LABEL,
  QUICK_TAGS,
  quickNotePayload,
  quickNoteProblem,
  timerNotice,
  type ContextTitles,
  type QuickTag,
} from "@/lib/quickNote";

// REQ-332 (Nick, 2026-11-17 19:48 PT): reviewer feedback one tap away on every
// signed-in screen. Mounted ONCE, in app/(app)/_layout.tsx, below the stack
// (a test checks), so it never remounts with a screen and keeps a draft note
// while the reviewer moves around.
//
// It never covers content or controls: the button sits in its own gutter
// under the screen -- the stack is shortened by the gutter's height, so the
// screen's last line and its bottom buttons end above it. The gutter includes
// the bottom safe area, lives inside the content column beside the desktop
// sidebar (REQ-328), and steps aside while the keyboard is up. Nothing at all
// renders for anyone who isn't a reviewer or an owner (the server checks too).
//
// On a timed screen (practice exam, sim) the button is a small icon. Opening
// the note never ends, submits or navigates: it is a sheet over the screen,
// which stays mounted with all of its state. A sim's clock is paused while the
// sheet is open (the engine's own learner pause, never scored) and runs again
// on close; the practice exam's deadline is the server's and cannot stop, so
// the sheet says the clock is still running.

export const FAB_GUTTER = 52;

// Native: is the keyboard up, and how tall (Android edge-to-edge doesn't
// resize a sheet for it)? Web (narrow): is a text field focused outside the sheet?
function useKeyboard(): { up: boolean; height: number } {
  const [state, setState] = useState({ up: false, height: 0 });
  useEffect(() => {
    if (Platform.OS === "web") {
      if (typeof document === "undefined") return;
      const isField = (el: Element | null) =>
        !!el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["checkbox", "radio", "button", "submit"].includes((el as HTMLInputElement).type)));
      const check = () => setState({ up: isField(document.activeElement), height: 0 });
      const onOut = () => setTimeout(check, 0);
      document.addEventListener("focusin", check);
      document.addEventListener("focusout", onOut);
      return () => {
        document.removeEventListener("focusin", check);
        document.removeEventListener("focusout", onOut);
      };
    }
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => setState({ up: true, height: e.endCoordinates?.height ?? 0 }));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setState({ up: false, height: 0 }));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return state;
}

export function ReviewerFeedbackFab() {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const wide = useWideWeb();
  const keyboard = useKeyboard();
  const { facts: shownFacts, timer, live } = useCurrentFacts();
  const pillRef = useRef<View>(null);

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [tag, setTag] = useState<QuickTag | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [snap, setSnap] = useState<ReturnType<typeof buildQuickContext> | null>(null);
  const [titles, setTitles] = useState<ContextTitles>({});
  const pausedTimer = useRef<ScreenTimer | null>(null);
  const [pausedBySheet, setPausedBySheet] = useState(false);

  const allowed = status === "signedIn" && canSeeFab(user);
  const shown = allowed && fabOnRoute(pathname);
  const compact = isTimedRoute(pathname);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const openSheet = useCallback(() => {
    const extra = live?.() ?? null;
    // The screen's facts plus the ones read now (a sim's tick and clock).
    const sim = shownFacts?.sim && extra?.sim ? { ...shownFacts.sim, ...extra.sim } : shownFacts?.sim ?? extra?.sim ?? null;
    const facts = extra ? { ...shownFacts, ...extra, sim } : shownFacts;
    const built = buildQuickContext({ pathname, params: params as Record<string, string | string[] | undefined>, facts });
    setSnap(built);
    setProblem(null);
    const known: ContextTitles = {
      courseTitle: facts?.courseTitle ?? knownCourseTitle(built.trackId),
      unitTitle: facts?.unitTitle ?? null,
      lessonTitle: facts?.lessonTitle ?? null,
      simTitle: facts?.sim?.title ?? null,
      labTitle: facts?.lab?.title ?? null,
    };
    setTitles(known);
    // Titles the screen didn't know: the same lookup the full form uses.
    if ((built.trackId && !known.courseTitle) || (built.simId && !known.simTitle)) {
      const q = [built.trackId ? `trackId=${encodeURIComponent(built.trackId)}` : "", built.simId ? `simId=${encodeURIComponent(built.simId)}` : ""].filter(Boolean).join("&");
      api
        .get<{ context: { trackId: string | null; trackTitle: string | null; simTitle: string | null } }>(`/api/reviewer/feedback?${q}`)
        .then((r) => {
          if (r.context.trackId && r.context.trackTitle) rememberCourseTitle(r.context.trackId, r.context.trackTitle);
          setTitles((t) => ({ ...t, courseTitle: t.courseTitle ?? r.context.trackTitle, simTitle: t.simTitle ?? r.context.simTitle }));
        })
        .catch(() => undefined);
    }
    // A running sim clock stops while the reviewer writes.
    pausedTimer.current = null;
    if (timer?.kind === "sim" && timer.running && timer.pause) {
      timer.pause();
      pausedTimer.current = timer;
    }
    setPausedBySheet(!!pausedTimer.current);
    setOpen(true);
  }, [pathname, params, shownFacts, live, timer]);

  const close = useCallback((opts: { resume: boolean } = { resume: true }) => {
    setOpen(false);
    if (opts.resume && pausedTimer.current?.resume) pausedTimer.current.resume();
    pausedTimer.current = null;
    setPausedBySheet(false);
    if (Platform.OS === "web") setTimeout(() => (pillRef.current as unknown as HTMLElement | null)?.focus?.(), 0);
  }, []);

  const send = useCallback(async () => {
    const p = quickNoteProblem(note);
    if (p) return setProblem(p);
    if (!snap) return;
    setSending(true);
    setProblem(null);
    try {
      await api.post("/api/reviewer/feedback", quickNotePayload(note, tag, snap));
      setNote("");
      setTag(null);
      close();
      setFlash(QUICK_NOTE_SENT);
      AccessibilityInfo.announceForAccessibility(QUICK_NOTE_SENT);
    } catch (err) {
      setProblem(friendlyError(err, { kept: true }));
    } finally {
      setSending(false);
    }
  }, [note, tag, snap, close]);

  const fullForm = useCallback(() => {
    const target = feedbackHref({ trackId: snap?.trackId ?? null, simId: snap?.simId ?? null });
    // Leaving the screen: a paused sim stays paused (the reviewer runs it again).
    close({ resume: false });
    router.push(target as never);
  }, [snap, close, router]);

  if (!shown) return null;
  const notice = timerNotice(timer ? { kind: timer.kind, running: timer.running } : null, pausedBySheet);
  const hideGutter = keyboard.up && !open && !wide;
  const androidLift = Platform.OS === "android" ? keyboard.height : 0;

  return (
    <>
      {hideGutter ? null : (
        <View style={[styles.gutter, { height: FAB_GUTTER + insets.bottom, paddingBottom: insets.bottom, paddingRight: (wide ? spacing.xl : spacing.md) + insets.right }]}>
          {flash ? (
            <View accessibilityLiveRegion="polite" style={styles.flash}>
              <Muted style={{ fontSize: 13 }}>{flash}</Muted>
            </View>
          ) : null}
          <Pressable
            ref={pillRef}
            onPress={openSheet}
            accessibilityRole="button"
            accessibilityLabel={FAB_A11Y_LABEL}
            hitSlop={compact ? 6 : 4}
            style={({ pressed }) => [compact ? styles.dot : styles.pill, pressed && { opacity: 0.75 }]}
            testID="reviewer-fab"
          >
            <Feather name="message-square" size={compact ? 16 : 15} color={colors.text} />
            {compact ? null : <Text style={styles.pillText}>{FAB_LABEL}</Text>}
          </Pressable>
        </View>
      )}
      {open ? (
        <SheetModal transparent visible animationType={isReducedMotion() ? "none" : wide ? "fade" : "slide"} onRequestClose={() => close()}>
          <View style={[styles.backdrop, wide ? styles.backdropWide : null]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityRole="button" accessibilityLabel="Close the quick note" />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={wide ? styles.panelWrapWide : styles.panelWrap} pointerEvents="box-none">
              <View
                style={[wide ? styles.panelWide : styles.sheet, { paddingBottom: wide ? spacing.lg : spacing.xl + (androidLift || insets.bottom) }]}
                accessibilityViewIsModal
                {...({ role: "dialog", "aria-modal": true, "aria-label": "Quick note for reviewers" } as object)}
              >
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: spacing.md }}>
                  <View style={styles.headRow}>
                    <H2>Quick note</H2>
                    <IconButton icon="x" onPress={() => close()} accessibilityLabel="Close the quick note" size={36} />
                  </View>
                  <Muted>{snap ? contextLine(snap.context, titles) : ""}</Muted>
                  {notice ? (
                    <View style={styles.notice} accessibilityLiveRegion="polite">
                      <Feather name="clock" size={14} color={colors.warn} />
                      <Muted style={{ flex: 1, color: colors.text }}>{notice}</Muted>
                    </View>
                  ) : null}
                  <TextField
                    label="What's wrong, or your note (required)"
                    value={note}
                    onChangeText={(t) => {
                      setNote(t);
                      if (problem) setProblem(null);
                    }}
                    placeholder="For example: the dose in step 3 doesn't match the label"
                    multiline
                    minHeight={110}
                    maxLength={QUICK_NOTE_MAX}
                    autoCapitalize="sentences"
                    autoFocus
                  />
                  <View style={{ gap: spacing.xs }}>
                    <Muted>Tag (optional)</Muted>
                    <View style={styles.tags}>
                      {QUICK_TAGS.map((t) => (
                        <Chip key={t} label={QUICK_TAG_LABEL[t]} active={tag === t} onPress={() => setTag(tag === t ? null : t)} />
                      ))}
                    </View>
                  </View>
                  {problem ? <ErrorBanner message={problem} /> : null}
                  <Button label="Send" icon="send" loading={sending} onPress={send} />
                  <Button label="Full feedback form" variant="link" size="sm" fullWidth={false} icon="external-link" onPress={fullForm} />
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </SheetModal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  gutter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    backgroundColor: colors.bg,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pillText: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  flash: { flexShrink: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  backdropWide: { flexDirection: "row", justifyContent: "flex-end", alignItems: "stretch" },
  panelWrap: { width: "100%", maxHeight: "92%" },
  panelWrapWide: { width: 440, maxWidth: "100%", height: "100%" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  panelWide: {
    flex: 1,
    backgroundColor: colors.card,
    padding: spacing.lg,
    borderLeftWidth: 1,
    borderColor: colors.border,
  },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  notice: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warn,
    backgroundColor: colors.warnDim,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
