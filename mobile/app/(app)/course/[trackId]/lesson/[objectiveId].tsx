import React, { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { friendlyError } from "@/lib/errorMessage";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { MisconceptionNote, RefresherOffer, UnderstandingActions } from "@/components/Understanding";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import type { GradeResult, LessonContent, MasteryStatus, NextObjective } from "@/types";
import { masteryAdvice, SOLO_HINT_NOTE, SOLO_OPEN_NOTE } from "@/lib/masteryAdvice";
import { ReportProblem } from "@/components/ReportProblem";
import { ReportLessonProblem } from "@/components/ReportLessonProblem";
import {
  Badge,
  Body,
  Button,
  Card,
  ErrorBanner,
  H2,
  LiveAnnouncement,
  Loading,
  Muted,
  Screen,
  SectionHeader,
  VERDICT_LABEL,
  VerdictBadge,
} from "@/components/ui";
import { colors, fonts, masteryColor, masteryIcon, radius, spacing } from "@/lib/theme";
import { normalizeLabPrompt, stepAfterSolo, stepsFor, type ProgressStep, type Step } from "@/lib/lesson-steps";
import {
  EMPTY_TEACH,
  FRESH_POSITION,
  RESUME_SERVER_WAIT_MS,
  anonSnapshotKeys,
  answerSignature,
  attemptIdFor,
  emptyCheck,
  isResumable,
  lessonFingerprint,
  newerSnapshot,
  OPEN_ANSWER_MAX,
  parseSnapshot,
  samePosition,
  settleWithin,
  shouldAdoptLateServer,
  snapshotStorageKey,
  toLocalClock,
  type CheckKind,
  type CheckState,
  type LessonSnapshot,
  type Position,
  type TeachState,
} from "@/lib/lessonProgress";
import { regenerateErrorMessage } from "@/lib/regenerateError";
import { hasFullAi, REGENERATE_PREVIEW_NOTE } from "@/lib/aiAccess";
import { planCourseReturn } from "@/lib/courseReturn";
import { routePath } from "@/lib/navPlan";
import {
  MISS_FRAMING,
  REVISE_NOTE,
  TRY_AGAIN_NOTE,
  assistNote,
  choiceMarks,
  describeMark,
  gradeSubmitError,
  isMiss,
  offerRereadAfterCheck,
  offerRevision,
  offerTryAgain,
  reasonRows,
  soloOutcome,
  startRevision,
  type ChoiceMark,
  type MarkTone,
} from "@/lib/lessonFeedback";
import { Collapsible, FeedbackPanel, NextStep, OptionReasons } from "@/components/feedback";
import { TeachCards } from "@/components/teachCards";
import { LabCard } from "@/components/labReport";
import {
  FULL_EXAMPLE_NOTE,
  SKIP_GUIDED_NOTE,
  fadingPlan,
  usableCards,
  type GuessMatch,
  type LearnerHistory,
  type TeachCards as TeachCardsData,
} from "@/lib/lessonExperience";
import { useStoredDraft } from "@/lib/useStoredDraft";
import { followUpDraftKey, guessDraftKey } from "@/lib/drafts";
// REQ-252: learner levels (the level-aware flow is per course; Python and
// JavaScript in phase 1) and the progress signals for newer learners.
import {
  FULL_EXAMPLE_LEVEL_NOTE,
  SKIP_GUIDED_LEVEL_NOTE,
  STANDARD_FLOW,
  beforeAfter,
  canDoSentence,
  comebackLine,
  hunchQuestion,
  ladderFor,
  lessonFlowFor,
  levelFadingPlan,
  parseLevelChange,
  parseLevelState,
  type LevelChange,
  type LevelState,
} from "@/lib/learnerLevel";
import { DoneProgress, HunchNote, HunchStep, LadderView, LevelChip, LevelNotice } from "@/components/LearnerLevel";

// REQ-101 (FAIL-093): device copies once written under "anon" are removed
// the first time a lesson opens in this app run.
let anonKeysCleared = false;

// REQ-096: the step list is no longer fixed -- an objective with a lab
// prompt the learner may be shown gets a fifth, optional "Try it" step after
// the solo check (src/lib/lesson-steps.ts).

export default function LessonFlow() {
  const { trackId, objectiveId, unitId, objectiveTitle } = useLocalSearchParams<{
    trackId: string;
    objectiveId: string;
    unitId?: string;
    objectiveTitle?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  // REQ-201: false when AI_ACCESS_MODE keeps new lesson versions to the AI pilot.
  const fullAi = hasFullAi(user);
  // REQ-101 (FAIL-093): no "anon" fallback. Logging out re-renders this
  // screen with no user before it is navigated away; with the fallback it
  // wrote a device copy under "anon" and sent a save that 401'd. Nothing is
  // read or saved without a signed-in user.
  const userId = user?.id ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("guess");
  const [guess, setGuess] = useState("");
  // REQ-206 (FAIL-939): the guess box survives a reload (see guessDraftKey).
  useStoredDraft(
    user && objectiveId ? guessDraftKey(user.id, objectiveId) : null,
    step === "guess" && guess.trim() ? guess : null,
    (stored) => {
      // Only while still at the guess: a guess restored into a lesson already
      // past it would count as one the learner made.
      if (stored && step === "guess") setGuess((current) => current || stored.slice(0, OPEN_ANSWER_MAX));
    }
  );
  const [confidence, setConfidence] = useState<number | null>(null);
  // Feedback on the guess itself, generated once it's submitted (never for
  // "I don't know -- just teach me", since there's nothing to compare then).
  // Fetched in the background after moving to "teach" rather than blocking
  // the guess screen on it -- submitting a guess was instant before this,
  // and staring at a spinner there to wait on an Anthropic call would be a
  // felt regression. See guessFeedbackPrompt in backend/lib/prompts.ts for
  // why this deliberately never touches attempts/mastery.
  const [guessFeedback, setGuessFeedback] = useState<string | null>(null);
  const [guessFeedbackLoading, setGuessFeedbackLoading] = useState(false);
  // REQ-106: which Teach card is showing, the self-explanation answer, and
  // the guess-match signal -- saved with the position. learnerHistory comes
  // with the lesson (read-only, from the server) and, with the guess match,
  // decides the optional Guided suggestion (fadingPlan).
  const [teachState, setTeachState] = useState<TeachState>(EMPTY_TEACH);
  const [learnerHistory, setLearnerHistory] = useState<LearnerHistory | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  // True once guess+teach have come back but fade/solo are still generating
  // in the background (server returns them early instead of blocking on the
  // full ~20s generation). Gates the move into the fade step below.
  const [practicePending, setPracticePending] = useState(false);
  const [practiceLoading, setPracticeLoading] = useState(false);
  // REQ-113 (Audit 3 mobile M4): a failure loading the practice steps used to
  // set the screen-wide error, replacing the whole lesson with a banner and
  // no Retry. It now shows under the explanation, with Retry, and says the
  // learner's place is saved. `practiceNext` is what Retry carries on to.
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const practiceNext = useRef<"fade" | "solo">("fade");
  // "Regenerate lesson" (done screen). Regeneration is per learner: it only
  // changes this learner's copy. The ref is the real double-tap guard (state
  // updates land a render late, so two quick taps could both pass a check on
  // `regenerating`); the state drives the button's loading/disabled look. Its
  // failure shows as a banner on the done screen -- not via `error`, which
  // replaces the whole screen and is for a lesson that failed to load.
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const regenInFlight = useRef(false);
  // REQ-074: the objective after this one in course order, from the same
  // prefetch call that warms its cache -- drives "Next objective" on the
  // done screen so finishing a lesson doesn't dead-end on the dashboard.
  const [next, setNext] = useState<NextObjective | null>(null);
  // Mastery status reached, fetched once the learner lands on "done" so the
  // screen can say what the work just earned and how to go further.
  const [reached, setReached] = useState<MasteryStatus | null>(null);
  // Saving is held off until the saved position (if any) has been restored
  // for this objective, so the fresh "guess" state on mount can't overwrite
  // it first. Holds the objectiveId it was restored for.
  const restoredFor = useRef<string | null>(null);
  // The step last saved for this objective. The account copy is deleted
  // only when the learner moves out of a saved step (finished, or
  // regenerated back to Guess) -- never just because a lesson opened at
  // Guess, which happens when the account copy couldn't be read.
  const lastSavedStep = useRef<string | null>(null);
  // Mirrors restoredFor for rendering, so the guess screen doesn't flash
  // before jumping to the resumed step.
  const [restoring, setRestoring] = useState(true);
  // REQ-127: graded state of the Guided and Solo checks, lifted up from
  // CheckStep so it is saved with the position and an answered check comes
  // back answered instead of being asked (and recorded) a second time.
  const [checks, setChecks] = useState<Partial<Record<CheckKind, CheckState>>>({});
  const setCheck = useCallback((kind: CheckKind, state: CheckState) => {
    setChecks((prev) => ({ ...prev, [kind]: state }));
  }, []);
  // REQ-101 (FAIL-094): the restore keys on the lesson's fingerprint, not the
  // lesson object. ensurePracticeReady replaces the object with the same
  // content (plus fade/solo), which re-ran the restore and fetched the
  // position a second time.
  const lessonKey = lesson ? lessonFingerprint(lesson) : null;
  // REQ-101 (FAIL-091): where the restore left the learner (null once they
  // have moved), and the snapshot it applied. Saving is skipped while the
  // position is still the restored one -- re-saving it would only stamp an
  // old place with a new savedAt -- and a late account copy is adopted only
  // while this is non-null.
  const restoredPosition = useRef<Position | null>(FRESH_POSITION);
  const appliedSnapshot = useRef<LessonSnapshot | null>(null);

  useEffect(() => {
    if (anonKeysCleared) return;
    anonKeysCleared = true;
    AsyncStorage.getAllKeys()
      .then((keys) => {
        const anon = anonSnapshotKeys(keys);
        return anon.length ? AsyncStorage.multiRemove(anon) : undefined;
      })
      .catch(() => {});
  }, []);

  // REQ-096: the objective's optional hands-on lab text, or null. From the
  // lesson GET (beside `lesson`), so it survives a regenerate. The server
  // leaves it out when the lab card's rules (plan, and for clinical / fitness
  // the study notice, REQ-165) wouldn't show it.
  const [labPrompt, setLabPrompt] = useState<string | null>(null);
  const [labSaving, setLabSaving] = useState(false);
  const [labError, setLabError] = useState<string | null>(null);

  // REQ-252: this learner's level for the lesson's unit, and whether the
  // course has the level-aware flow on. Until it arrives (or if it fails) the
  // lesson is today's standard one.
  const [levelState, setLevelState] = useState<LevelState | null>(null);
  const [levelLoaded, setLevelLoaded] = useState(false);
  const [levelNotice, setLevelNotice] = useState<LevelChange | null>(null);
  const levelChecked = useRef<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLevelLoaded(false);
    setLevelNotice(null);
    levelChecked.current = null;
    const q = unitId ? `?unitId=${encodeURIComponent(unitId)}` : "";
    api
      .get<unknown>(`/api/courses/${trackId}/level${q}`)
      .then((res) => !cancelled && setLevelState(parseLevelState(res)))
      .catch(() => !cancelled && setLevelState(null))
      .finally(() => !cancelled && setLevelLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [trackId, unitId, objectiveId]);
  const flow = levelState ? lessonFlowFor(levelState.effective, levelState.levelFlow) : STANDARD_FLOW;
  const flowOn = !!levelState?.levelFlow;
  // REQ-252 (design 8): first-party lesson step events, fire and forget,
  // each once per screen visit. Never answer text (the server keeps only
  // fixed keys).
  const loggedEvents = useRef<Set<string>>(new Set());
  const guessShownAt = useRef<number | null>(null);
  const logLessonEvent = useCallback(
    (event: string, detail: Record<string, unknown> = {}, onceKey: string = event) => {
      if (!userIdRef.current || loggedEvents.current.has(onceKey)) return;
      loggedEvents.current.add(onceKey);
      api
        .post(`/api/objectives/${objectiveId}/lesson-event`, {
          event,
          detail: { ...detail, level: levelState?.effective, flow: flowOn },
        })
        .catch(() => {});
    },
    [objectiveId, levelState?.effective, flowOn]
  );
  const guessSeconds = () => (guessShownAt.current ? Math.round((Date.now() - guessShownAt.current) / 1000) : undefined);

  const loadLesson = useCallback(() => {
    setError(null);
    setLesson(null);
    api
      .get<{
        lesson: LessonContent;
        practicePending?: boolean;
        learnerHistory?: LearnerHistory | null;
        labPrompt?: string | null;
      }>(`/api/objectives/${objectiveId}/lesson`)
      .then((res) => {
        setLesson(res.lesson);
        setPracticePending(!!res.practicePending);
        setLearnerHistory(res.learnerHistory ?? null);
        setLabPrompt(normalizeLabPrompt(res.labPrompt));
      })
      .catch((err) => setError(friendlyError(err)));
  }, [objectiveId]);

  useEffect(() => {
    loadLesson();
    setStep("guess");
    setGuess("");
    setConfidence(null);
    setGuessFeedback(null);
    setGuessFeedbackLoading(false);
    setTeachState(EMPTY_TEACH);
    setLearnerHistory(null);
    setLabPrompt(null);
    setLabSaving(false);
    setLabError(null);
    setNext(null);
    setReached(null);
    setChecks({});
    loggedEvents.current = new Set();
    guessShownAt.current = null;
    restoredFor.current = null;
    lastSavedStep.current = null;
    restoredPosition.current = FRESH_POSITION;
    appliedSnapshot.current = null;
    setRestoring(true);
  }, [loadLesson]);

  // Resume where the learner left off (see src/lib/lessonProgress.ts).
  // Runs once per objective, after its lesson content has loaded.
  useEffect(() => {
    if (!lessonKey || !userId || restoredFor.current === objectiveId) return;
    let cancelled = false;
    const key = snapshotStorageKey(userId, objectiveId);

    // Puts the learner at `snap`. fade/solo need the practice content; if
    // it's still generating, wait for it the same way the "Next" button
    // does, and fall back to the teach step if it can't be had. Returns the
    // step landed on, or null if the effect was cancelled meanwhile.
    const apply = async (snap: LessonSnapshot): Promise<Position | null> => {
      setGuess(snap.guess);
      setGuessFeedback(snap.guessFeedback);
      setConfidence(snap.confidence);
      setChecks(snap.checks);
      setTeachState(snap.teach ?? EMPTY_TEACH);
      let target = snap.step;
      if (target !== "teach" && practicePending) {
        const ready = await ensurePracticeReady();
        if (cancelled) return null;
        if (!ready) target = "teach";
      }
      setStep(target);
      return { step: target, guess: snap.guess, confidence: snap.confidence, checks: snap.checks, teach: snap.teach ?? EMPTY_TEACH };
    };

    (async () => {
      // REQ-127: the account copy and the device copy are both read; the
      // newer valid one wins. Either can be missing (first visit, offline,
      // a position saved before this existed) without blocking the lesson.
      // REQ-101: the account copy is waited on for RESUME_SERVER_WAIT_MS at
      // most; after that the device copy is used and the account copy is
      // considered again when it arrives.
      const serverRead = api
        .get<{ progress: unknown }>(`/api/objectives/${objectiveId}/progress`)
        .then((r) => parseSnapshot(toLocalClock(r.progress, Date.now()), lessonKey, Date.now()))
        .catch(() => null);
      const [first, local] = await Promise.all([
        settleWithin(serverRead, RESUME_SERVER_WAIT_MS),
        AsyncStorage.getItem(key)
          .then((raw) => parseSnapshot(raw, lessonKey, Date.now()))
          .catch(() => null),
      ]);
      if (cancelled) return;
      const snap = newerSnapshot(first.settled ? first.value : null, local);
      let position: Position | null = FRESH_POSITION;
      if (snap) {
        // Set before applying, so the save effect doesn't take the restore
        // itself for a move.
        restoredPosition.current = {
          step: snap.step,
          guess: snap.guess,
          confidence: snap.confidence,
          checks: snap.checks,
          teach: snap.teach ?? EMPTY_TEACH,
        };
        position = await apply(snap);
        if (!position) return;
      } else {
        // Only the device copy is cleared here. An unreadable account copy
        // may just mean the request failed, and deleting on that basis could
        // wipe a place saved from another device.
        AsyncStorage.removeItem(key).catch(() => {});
      }
      restoredPosition.current = position;
      appliedSnapshot.current = snap;
      lastSavedStep.current = snap ? snap.step : null;
      restoredFor.current = objectiveId;
      setRestoring(false);

      if (first.settled) return;
      const late = await first.later;
      if (cancelled) return;
      if (!shouldAdoptLateServer(late, appliedSnapshot.current, restoredPosition.current === null)) return;
      restoredPosition.current = {
        step: late.step,
        guess: late.guess,
        confidence: late.confidence,
        checks: late.checks,
        teach: late.teach ?? EMPTY_TEACH,
      };
      const adopted = await apply(late);
      if (!adopted) return;
      // The account copy already holds this place; it only needs saving again
      // if the practice fallback moved it to "teach".
      if (adopted.step === late.step) restoredPosition.current = adopted;
      appliedSnapshot.current = late;
      lastSavedStep.current = late.step;
    })();
    return () => {
      cancelled = true;
    };
    // ensurePracticeReady/practicePending are read once at restore time on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonKey, objectiveId, userId]);

  // Persist the position on every change once restored. "guess" and "done"
  // clear it: nothing to resume before the guess, and a finished objective
  // should reopen as a fresh attempt.
  //
  // The device copy is written at once; the account copy is debounced so
  // typing an answer doesn't send a request per keystroke. Leaving the
  // screen flushes the pending account save rather than dropping it.
  const pendingServerSave = useRef<{ timer: ReturnType<typeof setTimeout>; send: () => void } | null>(null);
  const flushServerSave = useCallback(() => {
    const p = pendingServerSave.current;
    if (!p) return;
    clearTimeout(p.timer);
    pendingServerSave.current = null;
    p.send();
  }, []);
  useEffect(() => flushServerSave, [flushServerSave, objectiveId]);

  useEffect(() => {
    const cancelPending = () => {
      if (pendingServerSave.current) {
        clearTimeout(pendingServerSave.current.timer);
        pendingServerSave.current = null;
      }
    };
    // Signed out (FAIL-093): drop the pending save rather than send it.
    if (!userId) {
      cancelPending();
      return;
    }
    if (!lessonKey || restoredFor.current !== objectiveId) return;
    const position: Position = { step, guess, confidence, checks, teach: teachState };
    if (restoredPosition.current && samePosition(position, restoredPosition.current)) return;
    restoredPosition.current = null;
    const key = snapshotStorageKey(userId, objectiveId);
    const path = `/api/objectives/${objectiveId}/progress`;
    cancelPending();
    if (!isResumable(step)) {
      AsyncStorage.removeItem(key).catch(() => {});
      // REQ-101 (FAIL-092): clearedAt lets the server ignore a save that was
      // sent before this delete but arrives after it.
      if (lastSavedStep.current && isResumable(lastSavedStep.current)) {
        api.delete(path, { clearedAt: Date.now() }).catch(() => {});
      }
      lastSavedStep.current = step;
      return;
    }
    lastSavedStep.current = step;
    const snap: LessonSnapshot = {
      v: 2,
      step,
      guess,
      guessFeedback,
      confidence,
      lessonKey,
      checks,
      teach: teachState,
      savedAt: Date.now(),
    };
    AsyncStorage.setItem(key, JSON.stringify(snap)).catch(() => {});
    const send = () => {
      if (userIdRef.current !== userId) return;
      api.put(path, snap).catch(() => {});
    };
    pendingServerSave.current = { timer: setTimeout(flushServerSave, 800), send };
  }, [lessonKey, objectiveId, userId, step, guess, guessFeedback, confidence, checks, teachState, flushServerSave]);

  useEffect(() => {
    // Fire-and-forget: nudges the server to start warming the cache for
    // whatever objective comes next in course order, as early as possible --
    // the learner spends real time on guess/teach/fade/solo here first, which
    // is normally more than enough head start for it to finish invisibly.
    // Errors are swallowed on purpose; this is a pure optimization with no
    // effect on the current objective if it fails or the next one doesn't
    // exist.
    api
      .post<{ next: NextObjective | null }>(`/api/objectives/${objectiveId}/lesson/prefetch-next`)
      .then((res) => setNext(res.next ?? null))
      .catch(() => {});
  }, [objectiveId]);

  useEffect(() => {
    if (step !== "done") return;
    api
      .get<{ mastery: { status: MasteryStatus } }>(`/api/objectives/${objectiveId}/mastery`)
      .then((res) => setReached(res.mastery.status))
      .catch(() => setReached(null));
  }, [step, objectiveId]);

  // REQ-252 (design 8): where learners stop. A step reached, each Teach card
  // reached, and the guess shown (with when, for the time spent on it).
  useEffect(() => {
    if (!lesson || restoring || !levelLoaded) return;
    if (step === "guess") {
      if (guessShownAt.current === null) guessShownAt.current = Date.now();
      logLessonEvent("guess_shown", { kind: flow.oneTapHunch && lesson && hunchQuestion(lesson) ? "option" : "typed" });
    } else {
      logLessonEvent("lesson_step_reached", { step }, `step:${step}`);
    }
  }, [step, lesson, restoring, levelLoaded, flow.oneTapHunch, logLessonEvent]);
  useEffect(() => {
    if (step !== "teach" || restoring) return;
    logLessonEvent("teach_card_viewed", { card: teachState.card }, `card:${teachState.card}`);
  }, [step, teachState.card, restoring, logLessonEvent]);

  // REQ-252: after a solo answer, the unit may move up a level from the
  // evidence (backend lib/learner-level.ts). Asked once per lesson visit, on
  // the done screen; a change comes back as a notice with Undo.
  useEffect(() => {
    if (step !== "done" || !checks.solo?.result || !unitId || levelChecked.current === objectiveId) return;
    levelChecked.current = objectiveId;
    api
      .post<{ change: unknown }>(`/api/courses/${trackId}/level/check`, { unitId })
      .then((res) => setLevelNotice(parseLevelChange(res.change)))
      .catch(() => {});
  }, [step, checks.solo?.result, unitId, trackId, objectiveId]);
  async function answerLevelNotice(action: "seen" | "undo") {
    if (!levelNotice) return;
    const res = await api.post<unknown>(`/api/courses/${trackId}/level/changes/${levelNotice.id}`, { action });
    const next = parseLevelState(res);
    if (next && unitId) setLevelState({ ...next, effective: next.units.find((u) => u.unitId === unitId)?.level ?? next.courseLevel ?? next.suggestion.level });
    setLevelNotice(null);
  }
  function openLevelSettings() {
    router.push({ pathname: `/course/${trackId}/level`, params: unitId ? { unitId } : {} });
  }

  // Called right before advancing past "teach". Usually a no-op: the learner
  // spends real time reading guess+teach, which is normally longer than
  // whatever's left of the fade/solo generation. If it isn't ready yet, this
  // re-fetches and the server awaits its own in-flight generation before
  // responding, so it resolves once fade/solo actually exist rather than
  // polling.
  async function ensurePracticeReady() {
    if (!practicePending) return true;
    setPracticeLoading(true);
    setPracticeError(null);
    try {
      const res = await api.get<{ lesson: LessonContent; practicePending?: boolean }>(
        `/api/objectives/${objectiveId}/lesson`
      );
      setLesson(res.lesson);
      setPracticePending(!!res.practicePending);
      return !res.practicePending;
    } catch (err) {
      setPracticeError(friendlyError(err));
      return false;
    } finally {
      setPracticeLoading(false);
    }
  }

  async function regenerateLesson() {
    if (regenInFlight.current) return;
    regenInFlight.current = true;
    setRegenerating(true);
    setRegenError(null);
    try {
      // Use the POST response directly rather than re-fetching -- fade/solo
      // are still generating in the background, so a GET right now would
      // wait on that or hand back the pre-regenerate lesson.
      const res = await api.post<{ lesson: LessonContent; practicePending?: boolean }>(
        `/api/objectives/${objectiveId}/lesson`
      );
      setLesson(res.lesson);
      setPracticePending(!!res.practicePending);
      setGuess("");
      setConfidence(null);
      setGuessFeedback(null);
      setGuessFeedbackLoading(false);
      setChecks({});
      setTeachState(EMPTY_TEACH);
      setStep("guess");
    } catch (err) {
      // Nothing was reset: the learner keeps the finished lesson they have.
      setRegenError(regenerateErrorMessage(err));
    } finally {
      regenInFlight.current = false;
      setRegenerating(false);
    }
  }

  // Moves to "teach" immediately either way -- getting to the explanation
  // was instant before this feature existed, and it stays instant. A
  // non-blank guess kicks off feedback in the background; it fills into its
  // slot on the teach screen once ready instead of being waited on here.
  function submitGuess() {
    setStep("teach");
    if (!guess.trim()) return;
    logLessonEvent("guess_answered", { kind: "typed", seconds: guessSeconds() });
    setGuessFeedbackLoading(true);
    api
      .post<{ feedback: string; guessMatch?: GuessMatch | null }>(`/api/objectives/${objectiveId}/guess-feedback`, {
        guess: guess.trim(),
      })
      .then((res) => {
        setGuessFeedback(res.feedback);
        // REQ-106: only steers the optional Guided suggestion; never shown.
        const match = res.guessMatch ?? null;
        setTeachState((t) => ({ ...t, guessMatch: match }));
      })
      // Silent on purpose: this is a nice-to-have on top of the lesson, not
      // something that should surface an error banner over the real content.
      .catch(() => {})
      .finally(() => setGuessFeedbackLoading(false));
  }

  function skipGuess() {
    logLessonEvent("guess_skipped", { seconds: guessSeconds() });
    setStep("teach");
  }

  // REQ-252: the one-tap hunch (New, level-aware flow). No model call and
  // nothing graded: the pick is kept as the guess (for before/after) and
  // the screen answers with one line.
  function pickHunch(source: "guided" | "lesson", choice: string) {
    logLessonEvent("guess_answered", { kind: "option", seconds: guessSeconds() });
    setGuess(choice);
    setTeachState((t) => ({ ...t, hunch: source }));
    setStep("teach");
  }
  function noIdeaHunch() {
    logLessonEvent("guess_answered", { kind: "no_idea", seconds: guessSeconds() });
    setGuess("");
    setTeachState((t) => ({ ...t, hunch: "no_idea" }));
    setStep("teach");
  }

  // REQ-101 (FAIL-095): a fresh, ungraded Solo check on the same question.
  // The new clientAttemptId makes it a new attempt; the server records it as
  // a repeat (assisted), which TRY_AGAIN_NOTE tells the learner up front.
  function tryAgain() {
    // REQ-252: a later right answer is credited as a comeback.
    setTeachState((t) => ({ ...t, soloRetried: true }));
    setCheck("solo", emptyCheck("solo"));
    setStep("solo");
  }

  // REQ-101 (FAIL-096): see src/lib/courseReturn.ts.
  function backToCourse() {
    const state = navigation.getState();
    const stackPaths = (state?.routes ?? [])
      .slice(0, (state?.index ?? 0) + 1)
      .map((r) => routePath(r.name, r.params as Record<string, unknown> | undefined))
      .filter((p): p is string => p !== null);
    if (planCourseReturn(trackId, stackPaths) === "dismissTo") router.dismissTo(`/course/${trackId}`);
    else router.push(`/course/${trackId}`);
  }

  const headerTitle = objectiveTitle ?? "Lesson";
  const notYet = soloOutcome(checks.solo) === "not-yet";
  // REQ-106 (research #12): a suggestion only; the learner always chooses.
  // REQ-252: with the level-aware flow on, New sees the full worked example
  // and Experienced is offered "Skip guided" by default (still a choice).
  const plan = levelFadingPlan(flow, { guessed: !!guess.trim(), guessMatch: teachState.guessMatch, history: learnerHistory });
  const hunch = lesson && flow.oneTapHunch ? hunchQuestion(lesson) : null;
  const cards = lesson ? usableCards(lesson.teachCards) : null;
  const guidedSkipped = !checks.fade?.result && (step === "solo" || step === "lab" || step === "done");
  const scrollToTop = useCallback(() => scrollRef.current?.scrollTo({ y: 0, animated: false }), []);
  async function goToGuided() {
    practiceNext.current = "fade";
    if (await ensurePracticeReady()) setStep("fade");
  }
  async function skipToSolo() {
    logLessonEvent("guided_skipped");
    practiceNext.current = "solo";
    if (await ensurePracticeReady()) setStep("solo");
  }
  const practiceErrorView = practiceError ? (
    <ErrorBanner
      message={`${practiceError} Your place in this lesson is saved.`}
      onRetry={() => (practiceNext.current === "solo" ? skipToSolo() : goToGuided())}
    />
  ) : null;

  if (error) {
    return (
      <Screen>
        <Stack.Screen options={{ title: headerTitle }} />
        <ErrorBanner message={error} onRetry={loadLesson} />
      </Screen>
    );
  }
  if (!lesson || restoring || (!levelLoaded && step === "guess")) {
    return (
      <Screen>
        <Stack.Screen options={{ title: headerTitle }} />
        <Loading label={lesson ? "Picking up where you left off..." : "Generating lesson (first visit only)..."} />
      </Screen>
    );
  }

  return (
    <Screen scrollRef={scrollRef}>
      <Stack.Screen options={{ title: headerTitle }} />
      <StepHeader step={step} steps={stepsFor(labPrompt)} guidedSkipped={guidedSkipped} />
      {/* REQ-252: the learner's level for this unit (pilot courses), one tap
          to change it; New learners see the mastery ladder fill as they go. */}
      {levelState && flowOn ? (
        <View style={styles.levelRow}>
          <LevelChip level={levelState.effective} onPress={openLevelSettings} />
          {/* PRIMERS SLOT (REQ-252, feature/primers, migration 079): the
              "Key terms" button goes here, beside the level chip, so it is
              reachable on every step. New learners (flow.oneTapHunch, i.e.
              levelState.effective === "new" with the flow on) see it opened
              once at the start. Log key_terms_opened / key_terms_closed
              (with { seconds }) through logLessonEvent. */}
        </View>
      ) : null}
      {flow.oneTapHunch && step !== "guess" && step !== "done" ? (
        <LadderView
          compact
          ladder={ladderFor({
            status: null,
            reachedTeach: true,
            explainDone: teachState.explainDone,
            guidedVerdict: checks.fade?.result?.verdict ?? null,
            soloVerdict: checks.solo?.result?.verdict ?? null,
          })}
        />
      ) : null}

      {step === "guess" && hunch ? (
        // REQ-252: New learners in a pilot course: one tap, no typing.
        <HunchStep
          question={hunch}
          onPick={(c) => pickHunch(hunch.source, c)}
          onNoIdea={noIdeaHunch}
          onSkip={skipGuess}
        />
      ) : null}

      {step === "guess" && !hunch && (
        <GuessStep
          prompt={lesson.guessPrompt}
          value={guess}
          onChange={setGuess}
          onSubmit={submitGuess}
          onSkip={skipGuess}
        />
      )}

      {step === "teach" && (
        <Card elevated>
          <View style={styles.cardHeadingRow}>
            <Feather name="book-open" size={18} color={colors.accent} />
            <H2>Teaching</H2>
          </View>
          {teachState.hunch ? (
            <HunchNote hunch={teachState.hunch} choice={guess} />
          ) : guess ? (
            <>
              <Muted>Your guess</Muted>
              <Body>{guess}</Body>
              {guessFeedbackLoading ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Muted style={{ fontSize: 12 }}>Comparing your guess to what's true...</Muted>
                </View>
              ) : guessFeedback ? (
                <View style={styles.guessFeedback}>
                  <View style={styles.cardHeadingRow}>
                    <Feather name="message-circle" size={14} color={colors.accent} />
                    <Muted style={{ color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 12 }}>
                      On your guess
                    </Muted>
                  </View>
                  <Body style={{ fontSize: 14 }}>{guessFeedback}</Body>
                </View>
              ) : null}
            </>
          ) : null}
          {cards ? (
            // REQ-106: short cards. The way on to practice sits under the last card.
            <TeachCards
              data={cards}
              state={teachState}
              onChange={setTeachState}
              onCardChange={scrollToTop}
              footer={
                <>
                  <TeachFooter
                    plan={plan}
                    skipNote={flow.offerSkipGuided ? SKIP_GUIDED_LEVEL_NOTE : SKIP_GUIDED_NOTE}
                    loading={practiceLoading}
                    onGuided={goToGuided}
                    onSkip={skipToSolo}
                    onCoach={() =>
                      router.push({
                        pathname: `/course/${trackId}/chat`,
                        params: { unitId, prefill: `About "${headerTitle}": ` },
                      })
                    }
                  />
                  {practiceErrorView}
                </>
              }
            />
          ) : (
            // A lesson cached before cards: one block of text, as before.
            <>
              <Muted>Explanation</Muted>
              <Body>{lesson.teach}</Body>
              <TeachFooter
                plan={plan}
                skipNote={flow.offerSkipGuided ? SKIP_GUIDED_LEVEL_NOTE : SKIP_GUIDED_NOTE}
                loading={practiceLoading}
                onGuided={goToGuided}
                onSkip={skipToSolo}
                onCoach={() =>
                  router.push({
                    pathname: `/course/${trackId}/chat`,
                    params: { unitId, prefill: `About "${headerTitle}": ` },
                  })
                }
              />
              {practiceErrorView}
            </>
          )}
        </Card>
      )}

      {step === "fade" && plan === "full-example" && !checks.fade?.result ? (
        // REQ-106 (research #12): new to this and the guess missed -- the full
        // worked example, every step, before one with a step missing. Open by
        // default, one tap to hide; nothing is required.
        <Card>
          <Muted style={{ fontSize: 12 }}>{flow.fullExampleFirst ? FULL_EXAMPLE_LEVEL_NOTE : FULL_EXAMPLE_NOTE}</Muted>
          <Collapsible label="Full worked example" initiallyOpen>
            <FullExample cards={cards} teach={lesson.teach} />
          </Collapsible>
        </Card>
      ) : null}

      {step === "fade" && (
        <CheckStep
          kind="fade"
          // Reaching this step is gated on ensurePracticeReady() resolving
          // practicePending to false, so these are guaranteed populated.
          promptText={lesson.fadeProblem!}
          choices={lesson.fadeChoices!}
          objectiveId={objectiveId}
          unitId={unitId}
          trackId={trackId}
          confidence={confidence}
          setConfidence={setConfidence}
          state={checks.fade ?? emptyCheck("fade")}
          onStateChange={(st) => setCheck("fade", st)}
          onDone={() => setStep("solo")}
          // REQ-133: back to the explanation; the guess and the graded
          // answer are kept, so coming forward again shows the same result.
          onReread={() => setStep("teach")}
        />
      )}

      {step === "solo" && guidedSkipped && !checks.solo?.result ? (
        // REQ-106: skipping Guided was a choice; it stays reversible.
        <Button label="Do guided practice first" variant="link" icon="compass" onPress={() => setStep("fade")} />
      ) : null}

      {step === "solo" && (
        <CheckStep
          kind="solo"
          // Populated alongside fadeProblem above -- reaching solo means fade
          // already resolved, so these came from the same generation.
          promptText={lesson.soloCheck!}
          // REQ-134: not in the lesson payload; fetched as a hint on demand.
          choices={null}
          objectiveId={objectiveId}
          unitId={unitId}
          trackId={trackId}
          confidence={confidence}
          setConfidence={setConfidence}
          state={checks.solo ?? emptyCheck("solo")}
          onStateChange={(st) => setCheck("solo", st)}
          onDone={() => setStep(stepAfterSolo(labPrompt))}
          onTryAgain={tryAgain}
        />
      )}

      {step === "lab" && labPrompt ? (
        <LabStep
          prompt={labPrompt}
          saving={labSaving}
          error={labError}
          onSkip={() => setStep("done")}
          onDid={async () => {
            setLabSaving(true);
            setLabError(null);
            try {
              await api.post(`/api/objectives/${objectiveId}/lab`);
              setStep("done");
            } catch (err) {
              // Skip stays available: a failed save must never trap the learner.
              setLabError(friendlyError(err));
            } finally {
              setLabSaving(false);
            }
          }}
        />
      ) : null}

      {step === "done" && (
        <Card elevated style={{ alignItems: "center", gap: spacing.sm }}>
          {/* REQ-133: complete vs not-yet is derived from the stored Solo
              result (checks.solo), so it is the same after a resume and is
              never "complete" for a missed or ungraded Solo check. */}
          <View style={notYet ? styles.doneIconNotYet : styles.doneIcon}>
            <Feather name={notYet ? "alert-circle" : "check"} size={28} color={notYet ? colors.warn : colors.good} />
          </View>
          <H2>{notYet ? "Not yet" : "Objective complete"}</H2>
          {notYet ? (
            <Muted style={{ textAlign: "center" }}>Not yet — this one will come back for review.</Muted>
          ) : null}
          {reached ? (
            <Badge
              label={reached}
              color={masteryColor[reached] ?? colors.mutedDim}
              icon={(masteryIcon[reached] ?? "circle") as React.ComponentProps<typeof Feather>["name"]}
            />
          ) : null}
          {notYet ? null : <Muted style={{ textAlign: "center" }}>{masteryAdvice(reached)}</Muted>}
          {/* REQ-252: an automatic level change is never silent. */}
          {levelNotice ? (
            <LevelNotice
              change={levelNotice}
              flow={flowOn}
              onSeen={() => answerLevelNotice("seen")}
              onUndo={() => answerLevelNotice("undo")}
            />
          ) : null}
          {/* REQ-252: progress signals for the pilot courses. */}
          {flowOn ? (
            <DoneProgress
              canDo={
                checks.solo?.result?.verdict === "correct"
                  ? canDoSentence(headerTitle, { hinted: checks.solo.result.assistReason === "hint" })
                  : null
              }
              beforeAfter={beforeAfter({
                guess,
                teach: teachState,
                guided: checks.fade,
                solo: checks.solo,
                guidedChoices: lesson.fadeChoices,
              })}
              comeback={comebackLine({
                title: headerTitle,
                guided: checks.fade,
                solo: checks.solo,
                soloRetried: teachState.soloRetried === true,
              })}
              ladder={ladderFor({
                status: reached,
                reachedTeach: true,
                explainDone: teachState.explainDone,
                guidedVerdict: checks.fade?.result?.verdict ?? null,
                soloVerdict: checks.solo?.result?.verdict ?? null,
              })}
            />
          ) : null}
          {notYet ? (
            <>
              <Button label="Try again" icon="rotate-ccw" onPress={tryAgain} />
              <Muted style={{ textAlign: "center", fontSize: 12 }}>{TRY_AGAIN_NOTE}</Muted>
              <Button
                label="Re-read the explanation"
                icon="book-open"
                variant="ghost"
                // Keeps the guess and the graded checks (all lifted state),
                // so this is a detour, not a reset. The Solo step then
                // offers "Try again" (offerTryAgain).
                onPress={() => setStep("teach")}
              />
              {/* REQ-201: regenerating is limited preview outside the AI pilot. */}
              {fullAi ? (
                <Button
                  label="Try a different question"
                  variant="ghost"
                  icon="refresh-cw"
                  accessibilityLabel="Try a different question (regenerates this lesson)"
                  loading={regenerating}
                  disabled={regenerating}
                  // Same guarded handler as "Regenerate lesson" below.
                  onPress={regenerateLesson}
                />
              ) : null}
            </>
          ) : null}
          {next ? (
            <Button
              label="Next objective"
              icon="arrow-right"
              variant={notYet ? "ghost" : "primary"}
              onPress={() =>
                router.replace({
                  pathname: `/course/${trackId}/lesson/${next.id}`,
                  params: { unitId: next.unit_id, objectiveTitle: next.title },
                })
              }
            />
          ) : null}
          {next ? (
            <Muted style={{ textAlign: "center", fontSize: 12 }} numberOfLines={2}>
              Up next: {next.title}
            </Muted>
          ) : null}
          <UnderstandingActions trackId={trackId} objectiveId={objectiveId} objectiveTitle={headerTitle} status={reached} />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <Button
              label="Back to course"
              icon="arrow-left"
              variant={next || notYet ? "ghost" : "primary"}
              fullWidth={false}
              // REQ-131: pop back to this course's dashboard when it is the
              // nearest one in the stack; REQ-101: otherwise push.
              onPress={backToCourse}
            />
            <Button
              label="Ask the coach"
              variant="ghost"
              fullWidth={false}
              icon="message-circle"
              onPress={() =>
                router.push({
                  pathname: `/course/${trackId}/chat`,
                  params: { unitId, prefill: `About "${headerTitle}": ` },
                })
              }
            />
            {notYet || !fullAi ? null : (
              <Button
                label="Regenerate lesson"
                variant="ghost"
                fullWidth={false}
                icon="refresh-cw"
                loading={regenerating}
                disabled={regenerating}
                onPress={regenerateLesson}
              />
            )}
          </View>
          {regenError ? <ErrorBanner message={regenError} /> : null}
          {/* REQ-201: say why there is no "Regenerate lesson", without a plan or price. */}
          {!fullAi && !notYet ? <Muted>{REGENERATE_PREVIEW_NOTE}</Muted> : null}
          {/* REQ-106 (research #7): optional lab and lab report. */}
          <LabCard objectiveId={objectiveId} userId={userId} />
        </Card>
      )}

      {/* REQ-093: lesson-wide report at any step, filed as a Support ticket
          (the per-question report, REQ-114, sits under each answered check). */}
      <ReportLessonProblem objectiveId={objectiveId} objectiveTitle={headerTitle} stage={step} />
    </Screen>
  );
}

const STEP_META: Record<Step, { label: string; icon: React.ComponentProps<typeof Feather>["name"] }> = {
  guess: { label: "Guess", icon: "help-circle" },
  teach: { label: "Teach", icon: "book-open" },
  fade: { label: "Guided", icon: "compass" },
  solo: { label: "Solo", icon: "check-circle" },
  lab: { label: "Try it", icon: "terminal" },
  done: { label: "Done", icon: "flag" },
};

function StepHeader({ step, steps, guidedSkipped }: { step: Step; steps: ProgressStep[]; guidedSkipped: boolean }) {
  // "done" isn't in the list, so every step reads as past once it's reached.
  const activeIndex = step === "done" ? steps.length : steps.indexOf(step as ProgressStep);
  // REQ-096: five items at the usual width crowd a 320dp screen.
  const itemWidth = steps.length > 4 ? 52 : undefined;
  return (
    <View style={styles.stepper}>
      {steps.map((s, i) => {
        const meta = STEP_META[s];
        const isActive = s === step;
        const isPast = activeIndex > i;
        // REQ-106: a skipped Guided step is shown as skipped, not as done.
        const skipped = s === "fade" && isPast && guidedSkipped;
        const color = isActive ? colors.accent : skipped ? colors.mutedDim : isPast ? colors.good : colors.mutedDim;
        return (
          <React.Fragment key={s}>
            <View
              style={[styles.stepItem, itemWidth ? { width: itemWidth } : null]}
              accessible
              accessibilityLabel={`${meta.label}: ${isActive ? "current step" : skipped ? "skipped" : isPast ? "done" : "not started"}`}
            >
              <View
                style={[
                  styles.stepDot,
                  { borderColor: color, backgroundColor: isActive || (isPast && !skipped) ? color : "transparent" },
                ]}
              >
                <Feather
                  name={skipped ? "skip-forward" : isPast ? "check" : meta.icon}
                  size={13}
                  color={isActive || (isPast && !skipped) ? colors.accentText : color}
                />
              </View>
              <Muted style={{ color, fontSize: 11 }}>{meta.label}</Muted>
            </View>
            {i < steps.length - 1 ? (
              <View style={[styles.stepLine, { backgroundColor: isPast ? colors.good : colors.border }]} />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// REQ-096: the optional hands-on lab. Nothing here is graded or checked --
// the note says so plainly, and "I did it" is only a record that the learner
// did it. REQ-165: no per-lab disclaimer (the study notice covers labs).
// One calm card, one primary action; Skip is the quieter
// ghost button, and no motion beyond the buttons' own press feedback.
function LabStep({
  prompt,
  saving,
  error,
  onSkip,
  onDid,
}: {
  prompt: string;
  saving: boolean;
  error: string | null;
  onSkip: () => void;
  onDid: () => void;
}) {
  return (
    <Card elevated>
      <SectionHeader label="Try it yourself · optional" style={{ marginTop: 0, marginBottom: 0 }} />
      <Body>{prompt}</Body>
      <Muted style={{ fontSize: 12 }}>Your mastery won't change. This is practice the app can't check.</Muted>
      {error ? <ErrorBanner message={error} /> : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button label="I did it" icon="check" fullWidth={false} loading={saving} onPress={onDid} />
        <Button label="Skip" variant="ghost" fullWidth={false} disabled={saving} onPress={onSkip} />
      </View>
    </Card>
  );
}

// REQ-106: the way on from Teach. With a strong history and a close guess
// the learner may skip Guided (research #12); it is offered, never applied.
function TeachFooter({
  plan,
  skipNote,
  loading,
  onGuided,
  onSkip,
  onCoach,
}: {
  plan: ReturnType<typeof fadingPlan>;
  // REQ-252: why skipping is offered (a close guess, or the Experienced level).
  skipNote: string;
  loading: boolean;
  onGuided: () => void;
  onSkip: () => void;
  onCoach: () => void;
}) {
  return (
    <>
      {plan === "offer-skip" ? (
        <View style={styles.suggestion}>
          <Muted style={{ color: colors.text, fontSize: 13 }}>{skipNote}</Muted>
          <Button label="Skip guided — go straight to the solo check" icon="skip-forward" loading={loading} onPress={onSkip} />
          <Button label="Do guided practice" variant="ghost" icon="compass" loading={loading} onPress={onGuided} />
        </View>
      ) : (
        <Button label="Next: guided practice" icon="arrow-right" loading={loading} onPress={onGuided} />
      )}
      <Button label="Ask the coach about this" variant="link" icon="message-circle" onPress={onCoach} />
    </>
  );
}

// The whole worked example for a learner who is new to the objective. From
// the example card when the lesson has cards; otherwise the lesson's full
// explanation, which contains it.
function FullExample({ cards, teach }: { cards: TeachCardsData | null; teach: string }) {
  const example = cards?.cards.find((c) => c.kind === "example");
  if (!example) return <Body>{teach}</Body>;
  return (
    <View style={{ gap: 6 }}>
      {example.body ? <Body>{example.body}</Body> : null}
      {(example.steps ?? []).map((st, i) => (
        <Body key={i}>
          {i + 1}. {st}
        </Body>
      ))}
    </View>
  );
}

function GuessStep({
  prompt,
  value,
  onChange,
  onSubmit,
  onSkip,
}: {
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <Card elevated>
      <View style={styles.cardHeadingRow}>
        <Feather name="help-circle" size={18} color={colors.accent} />
        <H2>Before we teach this — take a guess</H2>
      </View>
      <Body>{prompt}</Body>
      <TextInput
        multiline
        accessibilityLabel="Your guess"
        accessibilityHint="Leave it blank if you don't know"
        placeholder="Your guess (or leave blank if you don't know)"
        placeholderTextColor={colors.mutedDim}
        maxLength={OPEN_ANSWER_MAX}
        value={value}
        onChangeText={onChange}
        style={styles.input}
      />
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Button label="Submit my guess" fullWidth={false} icon="send" onPress={onSubmit} disabled={!value.trim()} />
        <Button label="I don't know — just teach me" variant="ghost" fullWidth={false} onPress={onSkip} />
      </View>
    </Card>
  );
}

// Handles both the "fade" (guided practice) and "solo" (independent) check steps. The
// learner picks the answer type themselves via the mode toggle below -- both formats
// grade the same underlying question, so there's no mastery gate on which one is
// available. Guided defaults to multiple-choice; REQ-133: Solo defaults to free
// response and shows the choices only behind an explicit "Show choices (hint)".
// The "guess" step (above) and PBQ scenarios
// (pbq.tsx) are the two cases where the format isn't a choice: guessing before being
// taught has nothing to pick from, and a PBQ's multi-part scenario doesn't reduce to MC.
function CheckStep({
  kind,
  promptText,
  choices: givenChoices,
  objectiveId,
  unitId,
  trackId,
  confidence,
  setConfidence,
  state,
  onStateChange,
  onDone,
  onReread,
  onTryAgain,
}: {
  kind: "fade" | "solo";
  promptText: string;
  // Guided: from the lesson, already in this learner's shown order. Solo:
  // null -- fetched from the hint endpoint only when asked for (REQ-134).
  choices: string[] | null;
  objectiveId: string;
  unitId?: string;
  trackId: string;
  confidence: number | null;
  setConfidence: (n: number) => void;
  state: CheckState;
  onStateChange: (s: CheckState) => void;
  onDone: () => void;
  // REQ-133: back to the explanation after a missed Guided item.
  onReread?: () => void;
  // REQ-101: a fresh try at a missed Solo check (offerTryAgain).
  onTryAgain?: () => void;
}) {
  // REQ-127: answer, mode and graded result live in the parent so they are
  // saved with the lesson position (see LessonFlow).
  const { mode, picked, openAnswer, result } = state;
  // REQ-105: set once the learner chose to revise a missed free-response
  // answer; its feedback stays on screen while revising and after.
  const firstResult = state.firstResult ?? null;
  const revising = !!firstResult && !result;
  const update = (patch: Partial<CheckState>) => onStateChange({ ...state, ...patch });
  const setMode = (m: "mc" | "open") => update({ mode: m });
  const setPicked = (i: number) => update({ picked: i });
  const setOpenAnswer = (t: string) => update({ openAnswer: t });
  const [followUp, setFollowUp] = useState("");
  const [followUpSent, setFollowUpSent] = useState(false);
  // REQ-206 (FAIL-939): kept on the device until sent.
  const { user: followUpUser } = useAuth();
  useStoredDraft(
    followUpUser ? followUpDraftKey(followUpUser.id, objectiveId, kind) : null,
    followUp.trim() ? followUp : null,
    (stored) => {
      if (stored) setFollowUp((current) => current || stored.slice(0, OPEN_ANSWER_MAX));
    }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A failed submit leaves the answer as it was and offers "Retry", which
  // resends with the same clientAttemptId; no verdict is shown until the
  // server has graded it.
  const [submitFailed, setSubmitFailed] = useState(false);
  const router = useRouter();

  // REQ-134: the Solo choices come from the server, which records the hint
  // before sending them. Re-fetched after a resume (same order, nothing new
  // recorded) whenever the check is in multiple-choice mode.
  const [hintChoices, setHintChoices] = useState<string[] | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const choices = givenChoices ?? hintChoices;
  const loadHint = useCallback(async () => {
    setHintLoading(true);
    setError(null);
    try {
      const res = await api.post<{ choices: string[] }>(`/api/objectives/${objectiveId}/hint`, { stage: "solo" });
      setHintChoices(res.choices);
      return true;
    } catch (err) {
      setError(gradeSubmitError(err));
      return false;
    } finally {
      setHintLoading(false);
    }
  }, [objectiveId]);
  useEffect(() => {
    if (kind === "solo" && mode === "mc" && !hintChoices && !hintLoading && !error) loadHint();
  }, [kind, mode, hintChoices, hintLoading, error, loadHint]);
  async function showHint() {
    if (hintChoices || (await loadHint())) setMode("mc");
  }

  // Grading is server-side: the request names the check and carries the
  // answer, nothing else (no question, no key). The verdict, the key and the
  // explanation come back together.
  async function submit(format: "mc" | "open") {
    if (format === "mc" ? picked == null : !openAnswer.trim()) return;
    setBusy(true);
    setError(null);
    setSubmitFailed(false);
    // Same answer resent after a failure keeps its id, so if the first
    // request did reach the server this one gets that result back instead
    // of a second recorded attempt.
    const signature = answerSignature(format, picked, openAnswer);
    const clientAttemptId = attemptIdFor(state, signature, Crypto.randomUUID);
    const sent = { ...state, clientAttemptId, sentSignature: signature };
    onStateChange(sent);
    try {
      const res = await api.post<GradeResult>("/api/grade", {
        clientAttemptId,
        format,
        kind: "lesson",
        stage: kind,
        objectiveId,
        unitId,
        ...(format === "mc" ? { chosenIndex: picked } : { answer: openAnswer }),
        // REQ-105: a revision names the missed attempt it revises.
        ...(format === "open" && firstResult?.attemptId ? { retryOf: firstResult.attemptId } : {}),
        confidence,
      });
      onStateChange({
        ...sent,
        result: {
          verdict: res.verdict,
          feedback: res.feedback,
          missedParts: res.missedParts ?? [],
          correctIndex: res.correctIndex ?? null,
          correctAnswer: res.correctAnswer ?? null,
          why: res.why ?? null,
          assistReason: res.assistReason ?? null,
          optionReasons: res.optionReasons ?? null,
          modelAnswer: res.modelAnswer ?? null,
          fixNext: res.fixNext ?? null,
          attemptId: res.attempt?.id ?? null,
          diagnosis: res.diagnosis ?? null,
        },
      });
    } catch (err) {
      setError(gradeSubmitError(err));
      setSubmitFailed(true);
    } finally {
      setBusy(false);
    }
  }
  const submitMC = () => submit("mc");
  const submitOpen = () => submit("open");
  const submitLabel = submitFailed ? "Retry" : "Submit";
  const submitIcon = submitFailed ? "refresh-cw" : "send";

  // REQ-074: used to send only "Follow-up on graded answer: <text>", so the
  // coach had no idea which question, answer or verdict was being disputed
  // and nothing told the learner the message had gone anywhere. Now carries
  // the full context and flips into a "sent" state with a link to the thread.
  async function sendFollowUp() {
    if (!followUp.trim() || !result) return;
    setBusy(true);
    const answerText = mode === "mc" && picked != null && choices ? choices[picked] : openAnswer;
    const message =
      `Follow-up on a graded ${kind === "fade" ? "guided practice" : "solo check"} answer.\n` +
      `Question: ${promptText}\n` +
      `My answer: ${answerText}\n` +
      `Verdict: ${result.verdict}. Feedback given: ${result.feedback}\n` +
      `My follow-up: ${followUp.trim()}`;
    try {
      await api.post(`/api/chat`, { trackId, message });
      setFollowUp("");
      setFollowUpSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card elevated>
      <View style={styles.cardHeadingRow}>
        <Feather name={kind === "fade" ? "compass" : "check-circle"} size={18} color={colors.accent} />
        <H2>{kind === "fade" ? "Guided practice" : "Solo check"}</H2>
      </View>
      <Body>{promptText}</Body>

      {!result && revising && firstResult ? (
        // REQ-105: revising a missed free-response answer, with the first
        // answer's feedback and model answer still in view.
        <View style={{ gap: 8 }}>
          <FeedbackPanel title="Feedback on your first answer" result={firstResult} />
          <Muted style={{ fontSize: 12 }}>{REVISE_NOTE}</Muted>
          <TextInput
            multiline
            accessibilityLabel="Your revised answer"
            placeholder="Revise your answer"
            placeholderTextColor={colors.mutedDim}
            value={openAnswer}
            onChangeText={setOpenAnswer}
            style={styles.input}
          />
          <Button
            label={submitFailed ? "Retry" : "Submit revision"}
            icon={submitIcon}
            loading={busy}
            onPress={submitOpen}
            disabled={busy || !openAnswer.trim()}
          />
          {error ? <ErrorBanner message={error} /> : null}
        </View>
      ) : null}

      {!result && !revising && (
        <>
          {kind === "fade" ? (
            <>
              {/* REQ-113 (M8): the selected format was shown by colour only. */}
              <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel="Answer format">
                <FormatOption label="Multiple choice" selected={mode === "mc"} onPress={() => setMode("mc")} />
                <FormatOption label="Free response" selected={mode === "open"} onPress={() => setMode("open")} />
              </View>
              <Muted style={{ fontSize: 12 }}>
                Guided practice is scaffolded, so it earns up to Guided in either format. The solo check is where
                Independent is earned.
              </Muted>
            </>
          ) : (
            // REQ-133: Solo is unassisted. Free response first; the choices
            // are an explicit hint the learner has to ask for. The mode
            // (open/mc) is the saved state, so a revealed hint survives resume.
            <Muted style={{ fontSize: 12 }}>
              {mode === "mc"
                ? SOLO_HINT_NOTE
                : SOLO_OPEN_NOTE}
            </Muted>
          )}

          {mode === "mc" && !choices ? (
            hintLoading ? (
              <Loading label="Loading the choices..." />
            ) : (
              <Button label="Load the choices" icon="refresh-cw" variant="ghost" onPress={loadHint} />
            )
          ) : mode === "mc" && choices ? (
            <View style={{ gap: 8 }} accessibilityRole="radiogroup">
              {choices.map((c, i) => (
                <Pressable
                  key={i}
                  onPress={() => setPicked(i)}
                  accessibilityRole="radio"
                  accessibilityLabel={c}
                  accessibilityState={{ selected: picked === i }}
                  style={[styles.choice, picked === i && styles.choiceActive]}
                >
                  <View style={[styles.radio, picked === i && styles.radioActive]}>
                    {picked === i ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Body style={{ flex: 1 }}>{c}</Body>
                </Pressable>
              ))}
              <ConfidencePicker value={confidence} onChange={setConfidence} />
              <Button label={submitLabel} icon={submitIcon} loading={busy} onPress={submitMC} disabled={busy || picked == null} />
              {kind === "solo" ? (
                <Button
                  label="Answer in free response instead"
                  variant="link"
                  icon="edit-3"
                  onPress={() => setMode("open")}
                />
              ) : null}
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <TextInput
                multiline
                accessibilityLabel="Your answer"
                placeholder="Your answer"
                placeholderTextColor={colors.mutedDim}
                maxLength={OPEN_ANSWER_MAX}
                value={openAnswer}
                onChangeText={setOpenAnswer}
                style={styles.input}
              />
              <ConfidencePicker value={confidence} onChange={setConfidence} />
              <Button label={submitLabel} icon={submitIcon} loading={busy} onPress={submitOpen} disabled={busy || !openAnswer.trim()} />
              {kind === "solo" ? (
                <>
                  <Button
                    label="Show choices (hint)"
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    icon="help-circle"
                    loading={hintLoading}
                    disabled={hintLoading}
                    accessibilityLabel="Show choices as a hint. Any answer to this question then counts toward Guided at most."
                    onPress={showHint}
                  />
                  <Muted style={{ fontSize: 12 }}>
                    Showing the choices is a hint: any answer to this question after that, in either format, counts
                    toward Guided at most.
                  </Muted>
                </>
              ) : null}
            </View>
          )}


          {error ? <ErrorBanner message={error} /> : null}
        </>
      )}

      <LiveAnnouncement message={result ? `${VERDICT_LABEL[result.verdict] ?? result.verdict}. ${result.feedback}` : null} />
      {result && (
        <View style={{ gap: 8 }}>
          {/* REQ-133: the options stay on screen after grading so the learner
              can see which one they chose and which was right. */}
          {mode === "mc" && picked != null && choices ? (
            <GradedChoices choices={choices} picked={picked} correctIndex={result.correctIndex ?? null} verdict={result.verdict} />
          ) : null}
          {/* REQ-105: a revision keeps the first answer's feedback reachable. */}
          {firstResult ? (
            <Collapsible label="Feedback on your first answer">
              <FeedbackPanel result={firstResult} />
            </Collapsible>
          ) : null}
          <VerdictBadge verdict={result.verdict} />
          {isMiss(result.verdict) && !firstResult ? (
            <Muted style={{ fontSize: 12 }}>{MISS_FRAMING}</Muted>
          ) : null}
          <Body>{result.feedback}</Body>
          {result.missedParts && result.missedParts.length > 0 ? (
            <Muted>Missed: {result.missedParts.join(", ")}</Muted>
          ) : null}
          {isMiss(result.verdict) && result.fixNext ? <NextStep text={result.fixNext} /> : null}
          {/* REQ-105: why each option is or isn't right, the learner's pick
              and the correct one first. A lesson cached before option
              reasons existed has none: its single explanation shows instead. */}
          {mode === "mc" && choices ? (
            <OptionReasons
              rows={reasonRows(result.optionReasons, choices.length, picked, result.correctIndex ?? null, result.verdict)}
              choices={choices}
              fallbackWhy={result.why ?? null}
            />
          ) : null}
          {/* REQ-111: the likely mix-up, and a refresher of a weak prerequisite. */}
          <MisconceptionNote diagnosis={result.diagnosis} />
          <RefresherOffer objectiveId={objectiveId} verdict={result.verdict} />
          {/* REQ-114: report a wrong key or unclear question on this check. */}
          <ReportProblem target={{ kind: "lesson", objectiveId, stage: kind }} />
          {/* REQ-134: the key arrives only with the verdict. After a
              free-response miss, show the expected answer too. */}
          {mode === "open" && result.verdict !== "correct" && result.correctAnswer ? (
            <Muted>
              Expected answer: {result.correctAnswer}
              {result.why ? ` -- ${result.why}` : ""}
            </Muted>
          ) : null}
          {mode === "open" && result.modelAnswer ? (
            <Collapsible label="Show a model answer">
              <Body>{result.modelAnswer}</Body>
            </Collapsible>
          ) : null}
          {offerRevision(mode, result, firstResult) ? (
            <>
              <Button
                label="Revise my answer"
                icon="edit-3"
                accessibilityLabel="Revise my answer once, with this feedback in view. This practice won't raise your level."
                onPress={() => {
                  setError(null);
                  setSubmitFailed(false);
                  onStateChange(startRevision(state));
                }}
              />
              <Muted style={{ fontSize: 12 }}>{REVISE_NOTE}</Muted>
            </>
          ) : null}
          {assistNote(result.assistReason) ? (
            <Muted style={{ fontSize: 12 }}>{assistNote(result.assistReason)}</Muted>
          ) : kind === "fade" && result.verdict === "correct" ? (
            <Muted style={{ fontSize: 12 }}>
              Guided practice earns Guided. The solo check, answered in free response without the hint, is what earns
              Independent.
            </Muted>
          ) : null}

          {onReread && offerRereadAfterCheck(kind, result.verdict) ? (
            <>
              <Button label="Re-read the explanation" icon="book-open" onPress={onReread} />
              <Button label="Continue" icon="arrow-right" variant="ghost" onPress={onDone} />
            </>
          ) : onTryAgain && offerTryAgain(kind, result.verdict) && !offerRevision(mode, result, firstResult) ? (
            <>
              <Button
                label="Try again"
                icon="rotate-ccw"
                onPress={() => {
                  setFollowUp("");
                  setFollowUpSent(false);
                  setError(null);
                  setSubmitFailed(false);
                  onTryAgain();
                }}
              />
              <Muted style={{ fontSize: 12 }}>{TRY_AGAIN_NOTE}</Muted>
              <Button label="Continue" icon="arrow-right" variant="ghost" onPress={onDone} />
            </>
          ) : (
            <Button label="Continue" icon="arrow-right" onPress={onDone} />
          )}

          {followUpSent ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Feather name="check" size={14} color={colors.good} />
              <Muted style={{ flex: 1 }}>Sent to the coach with your question, answer and verdict.</Muted>
              <Button
                label="Open chat"
                variant="link"
                fullWidth={false}
                onPress={() => router.push({ pathname: `/course/${trackId}/chat` })}
              />
            </View>
          ) : (
            <>
              <Muted>Dispute or ask about this verdict</Muted>
              <TextInput
                accessibilityLabel="Dispute or ask about this verdict"
                placeholder="e.g. I think my answer covered that — here's why..."
                placeholderTextColor={colors.mutedDim}
                maxLength={OPEN_ANSWER_MAX}
                value={followUp}
                onChangeText={setFollowUp}
                style={styles.input}
              />
              <Button
                label="Send to the coach"
                variant="ghost"
                icon="corner-up-right"
                onPress={sendFollowUp}
                loading={busy}
                disabled={busy || !followUp.trim()}
              />
            </>
          )}
          {error ? <ErrorBanner message={error} /> : null}
        </View>
      )}
    </Card>
  );
}

// REQ-133: the answer options after grading. Not interactive. The learner's
// choice and the correct one are marked with colour AND an icon AND a text
// tag (and a spoken label), so no mark depends on colour alone. Which option
// gets which mark is decided by choiceMarks() in src/lib/lessonFeedback.ts.
const MARK_ICON: Record<ChoiceMark, React.ComponentProps<typeof Feather>["name"]> = {
  none: "circle",
  "picked-correct": "check-circle",
  "picked-incorrect": "x-circle",
  "correct-answer": "check-circle",
};
const TONE_COLOR: Record<MarkTone, string> = { good: colors.good, warn: colors.warn, bad: colors.bad, neutral: colors.mutedDim };
const TONE_DIM: Record<MarkTone, string> = { good: colors.goodDim, warn: colors.warnDim, bad: colors.badDim, neutral: "transparent" };

function GradedChoices({
  choices,
  picked,
  correctIndex,
  verdict,
}: {
  choices: string[];
  picked: number;
  correctIndex: number | null;
  verdict: string;
}) {
  const marks = choiceMarks(choices.length, picked, correctIndex, verdict);
  return (
    <View style={{ gap: 8 }}>
      {choices.map((c, i) => {
        const d = describeMark(marks[i]);
        const tone: MarkTone = d?.tone ?? "neutral";
        return (
          <View
            key={i}
            accessible
            accessibilityLabel={d ? `${d.a11y}. ${c}` : c}
            accessibilityState={{ disabled: true, selected: i === picked }}
            style={[styles.choice, d && { borderColor: TONE_COLOR[tone], backgroundColor: TONE_DIM[tone] }]}
          >
            <Feather name={MARK_ICON[marks[i]]} size={18} color={TONE_COLOR[tone]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Body>{c}</Body>
              {d ? (
                <Muted style={{ color: TONE_COLOR[tone], fontFamily: fonts.bodySemiBold, fontSize: 12 }}>{d.tag}</Muted>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Sits ABOVE the submit button (it used to sit below it, so most answers
// went in before confidence was ever set). Confidence is stored with every
// attempt for calibration -- a confident wrong answer is a stronger signal
// than a hesitant one.
// REQ-113 (Audit 3 mobile M8, M9): read as "1"..."5" with no role, label or
// selected state, and ~39 dp tall. Now radio buttons with a spoken scale, as
// the exam's picker already was, and 48 dp.
function ConfidencePicker({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <Muted>How confident are you?</Muted>
      <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="radiogroup" accessibilityLabel="How confident are you?">
        {["1", "2", "3", "4", "5"].map((label, idx) => (
          <Pressable
            key={label}
            onPress={() => onChange(idx + 1)}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === idx + 1 }}
            accessibilityLabel={`Confidence ${idx + 1} of 5${idx === 0 ? ", guessing" : idx === 4 ? ", certain" : ""}`}
            style={[styles.confidence, value === idx + 1 && styles.confidenceActive]}
          >
            <Body style={value === idx + 1 ? { color: colors.accentText, fontFamily: fonts.bodyBold } : undefined}>{label}</Body>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Muted style={{ fontSize: 12 }}>guessing</Muted>
        <Muted style={{ fontSize: 12 }}>certain</Muted>
      </View>
    </View>
  );
}

function FormatOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.formatOption, selected && styles.formatOptionOn, pressed && { opacity: 0.8 }]}
    >
      <Feather name={selected ? "check-circle" : "circle"} size={14} color={selected ? colors.accentText : colors.muted} />
      <Text style={[styles.formatText, selected && { color: colors.accentText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardHeadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  // REQ-252: the level chip and the Key terms slot under the step header.
  levelRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  // Sits apart from the plain guess/explanation text below it so it reads as
  // commentary on what was just typed, not a continuation of it.
  guessFeedback: {
    backgroundColor: colors.accentDim,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
    marginTop: 4,
  },
  stepper: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 4 },
  suggestion: { gap: spacing.sm, backgroundColor: colors.accentDim, borderRadius: radius.md, padding: spacing.sm },
  stepItem: { alignItems: "center", gap: 4, width: 56 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: { flex: 1, height: 2, marginTop: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    padding: 10,
    color: colors.text,
    backgroundColor: colors.cardAlt,
    minHeight: 70,
    textAlignVertical: "top",
  },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
  },
  choiceActive: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.mutedDim,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.accent },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },
  confidence: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    paddingVertical: 8,
  },
  formatOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.cardAlt,
  },
  formatOptionOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  formatText: { color: colors.text, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  confidenceActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  doneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.goodDim,
    alignItems: "center",
    justifyContent: "center",
  },
  // REQ-133: neutral/warning counterpart for a Solo check that wasn't right.
  doneIconNotYet: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.warnDim,
    alignItems: "center",
    justifyContent: "center",
  },
});
