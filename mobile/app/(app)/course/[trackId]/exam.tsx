import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, Switch, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import * as Crypto from "expo-crypto";
import { Stack, useFocusEffect, useLocalSearchParams, useNavigation } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { pendingIdFor, type PendingId } from "@/lib/pendingId";
import { api, ApiError } from "@/api/client";
import { ReportProblem } from "@/components/ReportProblem";
import type { ExamItem, ExamProfile, ExamResponse, ExamSessionSummary, ExamSessionView } from "@/types/exam";
import {
  Body,
  Button,
  Card,
  ChoiceSheet,
  ErrorBanner,
  H1,
  H2,
  H3,
  Loading,
  Muted,
  ProgressBar,
  Screen,
  SectionHeader,
} from "@/components/ui";
import { ExamConfidence, ExamQuestion, FlagButton } from "@/components/ExamQuestion";
import { colors, fonts, radius, spacing } from "@/lib/theme";
import { whenLabel } from "@/lib/time";
import {
  examLeaveGuard,
  FORMAT_LABEL,
  formatClock,
  isAnswered,
  navCounts,
  navLabel,
  remainingSeconds,
  submitWarning,
  timeAnnouncement,
} from "@/lib/examPractice";
import { createExamSaveQueue, unsavedMessage, type ExamSaveQueue } from "@/lib/examSaveQueue";
import { friendlyError } from "@/lib/errorMessage";
import { t } from "@/lib/i18n";

// REQ-109: timed sprints (10 mixed questions) and mock exams (the exam's
// length, weighted by its domains, its full time limit), with an untimed
// option for accessibility. Grading happens on the server at submit; the
// app never has the answers before then. Results show the score, the
// breakdown by domain and pace, how the mock compares with the readiness
// estimate, and confidence calibration.
//
// Answers are saved to the server as they are given, so leaving the screen,
// losing the connection for a moment or switching phones resumes the same
// session (the open session is offered again on the start screen).
export default function ExamScreen() {
  const { trackId, trackTitle } = useLocalSearchParams<{ trackId: string; trackTitle?: string }>();
  const [profile, setProfile] = useState<ExamProfile | null>(null);
  const [history, setHistory] = useState<ExamSessionSummary[] | null>(null);
  const [view, setView] = useState<ExamSessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sprintTimed, setSprintTimed] = useState(true);
  const [mockTimed, setMockTimed] = useState(true);

  const loadStart = useCallback(() => {
    api
      .get<{ exam: ExamProfile; sessions: ExamSessionSummary[] }>(`/api/exam/sessions?trackId=${trackId}`)
      .then((res) => {
        setProfile(res.exam);
        setHistory(res.sessions);
      })
      .catch((err) => setError(friendlyError(err)));
  }, [trackId]);

  useFocusEffect(
    useCallback(() => {
      if (!view) loadStart();
    }, [view, loadStart])
  );

  // REQ-217 (FAIL-1048): one id per start request, kept until a start succeeds.
  // A new id on every press turned a retry after a lost answer into a second
  // session; the same id lets the server answer with the first.
  const pendingStart = useRef<PendingId | null>(null);
  async function start(mode: "sprint" | "mock") {
    setBusy(true);
    setError(null);
    try {
      const timed = mode === "sprint" ? sprintTimed : mockTimed;
      pendingStart.current = pendingIdFor(pendingStart.current, `${trackId}:${mode}:${timed}`, Crypto.randomUUID);
      const res = await api.post<ExamSessionView>("/api/exam/sessions", {
        trackId,
        mode,
        timed,
        clientSessionId: pendingStart.current.id,
      });
      pendingStart.current = null;
      setView(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function open(sessionId: string) {
    setBusy(true);
    setError(null);
    try {
      setView(await api.get<ExamSessionView>(`/api/exam/sessions/${sessionId}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const title = view?.session.mode === "mock" ? "Mock exam" : view ? "Timed sprint" : "Practice exam";

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      {error ? <ErrorBanner message={error} onRetry={!view && !profile ? loadStart : undefined} /> : null}
      {!view ? (
        <StartView
          trackTitle={trackTitle}
          profile={profile}
          history={history}
          busy={busy}
          sprintTimed={sprintTimed}
          mockTimed={mockTimed}
          setSprintTimed={setSprintTimed}
          setMockTimed={setMockTimed}
          onStart={start}
          onOpen={open}
        />
      ) : view.session.status === "submitted" ? (
        <ResultsView
          view={view}
          onDone={() => {
            setView(null);
            loadStart();
          }}
        />
      ) : (
        <RunView
          view={view}
          setView={setView}
          setError={setError}
          onLeave={() => {
            setView(null);
            loadStart();
          }}
        />
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function StartView(props: {
  trackTitle?: string;
  profile: ExamProfile | null;
  history: ExamSessionSummary[] | null;
  busy: boolean;
  sprintTimed: boolean;
  mockTimed: boolean;
  setSprintTimed: (b: boolean) => void;
  setMockTimed: (b: boolean) => void;
  onStart: (mode: "sprint" | "mock") => void;
  onOpen: (id: string) => void;
}) {
  const p = props.profile;
  if (!p) return <Loading label="Loading exam details..." />;
  const open = (props.history ?? []).filter((h) => h.status === "in_progress");
  const done = (props.history ?? []).filter((h) => h.status === "submitted");
  const minutes = p.durationMinutes;
  const pace = p.secondsPerQuestion;
  return (
    <>
      <H1>{p.examCode ? `${p.examCode} practice` : "Practice exam"}</H1>
      {props.trackTitle ? <Muted>{props.trackTitle}</Muted> : null}
      <Muted>
        Question types on this exam: {p.formats.map((f) => FORMAT_LABEL[f]).join(", ")}
        {p.exhibits ? ", some with exhibits" : ""}. Practice uses only these.
      </Muted>

      {open.map((s) => (
        <Card key={s.id} elevated style={{ borderColor: colors.accent }}>
          <H3>{s.mode === "mock" ? "Mock exam in progress" : "Sprint in progress"}</H3>
          <Muted>Started {whenLabel(s.startedAt)}. Your answers are saved.</Muted>
          <Button label="Resume" icon="play" onPress={() => props.onOpen(s.id)} loading={props.busy} />
        </Card>
      ))}

      <Card>
        <H2>Timed sprint</H2>
        <Body>10 mixed questions from across the course{pace ? `, at the exam's pace (${formatClock(pace)} each)` : ""}.</Body>
        <TimedToggle value={props.sprintTimed} onChange={props.setSprintTimed} label="Timed" />
        <Button label="Start sprint" icon="zap" onPress={() => props.onStart("sprint")} loading={props.busy} />
      </Card>

      <Card>
        <H2>Mock exam</H2>
        <Body>
          {p.mockQuestions} questions, weighted by the exam's domains
          {p.questionCount ? "" : " (the exam's question count isn't published, so this uses 50)"}.
          {minutes ? ` ${minutes} minutes, like the real exam.` : " The exam's time limit isn't published, so a timed mock allows 90 seconds a question."}
        </Body>
        <Muted>Flag questions to come back to, then submit for a breakdown by domain and pace.</Muted>
        <TimedToggle
          value={props.mockTimed}
          onChange={props.setMockTimed}
          label="Timed"
          hint="Turn off for an untimed mock, for example if you get extra time on the real exam or are building up."
        />
        <Button label="Start mock exam" icon="clock" onPress={() => props.onStart("mock")} loading={props.busy} />
        {props.busy ? <Muted>Preparing questions; the first mock on a course can take a little while.</Muted> : null}
      </Card>

      {done.length ? <SectionHeader label="Past sessions" /> : null}
      {done.map((s) => (
        <Card
          key={s.id}
          onPress={() => props.onOpen(s.id)}
          accessibilityLabel={`${s.mode === "mock" ? "Mock exam" : "Sprint"}, ${whenLabel(s.submittedAt ?? s.startedAt)}, ${s.correct ?? 0} of ${s.total} right. Opens the results.`}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Body>
              {s.mode === "mock" ? "Mock exam" : "Sprint"} · {whenLabel(s.submittedAt ?? s.startedAt)}
            </Body>
            <Body style={{ fontFamily: fonts.bodyBold }}>
              {s.correct ?? 0}/{s.total}
            </Body>
          </View>
        </Card>
      ))}
    </>
  );
}

function TimedToggle({ value, onChange, label, hint }: { value: boolean; onChange: (b: boolean) => void; label: string; hint?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 }}>
        <Body>{value ? `${label}: on` : "Untimed"}</Body>
        <Switch
          value={value}
          onValueChange={onChange}
          accessibilityLabel={`${label}. ${value ? "On" : "Off, untimed"}`}
          trackColor={{ true: colors.accent, false: colors.border }}
        />
      </View>
      {hint ? <Muted style={{ fontSize: 12 }}>{hint}</Muted> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Taking the session
// ---------------------------------------------------------------------------

// REQ-113 (Audit 3 mobile L3): the clock re-rendered the whole question
// screen every second (the question, its options and a grid of up to ~90
// buttons) on cheap phones. It now owns its own tick; the screen re-renders
// only when the learner does something.
const ExamClock = React.memo(function ExamClock({
  deadlineAt,
  serverNow,
  loadedAt,
  onExpire,
}: {
  deadlineAt: string | null;
  serverNow: string;
  loadedAt: number;
  onExpire: () => void;
}) {
  const [now, setNow] = useState(Date.now());
  const remaining = remainingSeconds(deadlineAt, serverNow, loadedAt, now);
  const expired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!deadlineAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [deadlineAt]);

  useEffect(() => {
    const say = timeAnnouncement(remaining);
    if (say) AccessibilityInfo.announceForAccessibility(say);
    if (remaining === 0 && !expired.current) {
      expired.current = true;
      onExpireRef.current();
    }
  }, [remaining]);

  if (remaining == null) return <Muted>{t("exam.untimed")}</Muted>;
  return (
    <View
      style={[styles.timer, remaining <= 60 && { borderColor: colors.warn }]}
      accessible
      accessibilityLabel={t("exam.timeLeft", { clock: formatClock(remaining) })}
    >
      <Feather name="clock" size={14} color={remaining <= 60 ? colors.warn : colors.muted} />
      <Body style={{ fontFamily: fonts.monoMedium }}>{formatClock(remaining)}</Body>
    </View>
  );
});

function RunView({
  view,
  setView,
  setError,
  onLeave,
}: {
  view: ExamSessionView;
  setView: (v: ExamSessionView) => void;
  setError: (e: string | null) => void;
  onLeave: () => void;
}) {
  const [items, setItems] = useState<ExamItem[]>(view.items);
  const [index, setIndex] = useState(() => Math.max(0, view.items.findIndex((i) => !i.answered)));
  const [confirm, setConfirm] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failedSaves, setFailedSaves] = useState<number[]>([]);
  const loadedAt = useRef(Date.now());
  const shownAt = useRef(Date.now());
  const s = view.session;
  const item = items[index];

  const showResults = useCallback(async () => {
    try {
      setView(await api.get<ExamSessionView>(`/api/exam/sessions/${s.id}`));
    } catch (err) {
      setError(friendlyError(err));
    }
  }, [s.id, setView, setError]);

  // REQ-113 (Audit 3 mobile H1): saves go through one queue per session --
  // numbered, one at a time per question, failed ones kept and retried, and
  // all of them flushed before submit (src/lib/examSaveQueue.ts).
  const queue = useRef<ExamSaveQueue | null>(null);
  if (!queue.current) {
    queue.current = createExamSaveQueue({
      initialSeq: Object.fromEntries(view.items.map((i) => [i.position, i.saveSeq ?? 0])),
      send: async (position, patch) => {
        try {
          const res = await api.put<{ saved: boolean; stale?: boolean }>(`/api/exam/sessions/${s.id}/items/${position}`, patch);
          return res?.stale ? "stale" : "saved";
        } catch (err) {
          // Time is up (or the session ended elsewhere): nothing more saves.
          if (err instanceof ApiError && err.status === 409) return "ended";
          throw err;
        }
      },
      onChange: (st) => setFailedSaves(st.failed),
      onEnded: () => {
        showResults();
      },
    });
  }
  const q = queue.current;

  // While any save has failed, try again every few seconds (the banner also
  // has a button for it). Each retry carries the latest answer.
  useEffect(() => {
    if (!failedSaves.length) return;
    const timer = setInterval(() => q.retryFailed(), 5000);
    return () => clearInterval(timer);
  }, [failedSaves.length, q]);

  // Adds the time on the current question and saves the running total.
  const leaveQuestion = useCallback(() => {
    const spent = Date.now() - shownAt.current;
    shownAt.current = Date.now();
    const cur = items[index];
    if (!cur || spent < 500) return;
    const total = cur.timeSpentMs + spent;
    setItems((prev) => prev.map((x, i) => (i === index ? { ...x, timeSpentMs: total } : x)));
    q.save(cur.position, { timeSpentMs: total });
  }, [items, index, q]);

  function go(to: number) {
    if (to < 0 || to >= items.length || to === index) return;
    leaveQuestion();
    setIndex(to);
  }

  function update(patch: Partial<ExamItem>, server: Record<string, unknown>) {
    setError(null);
    setItems((prev) => prev.map((x, i) => (i === index ? { ...x, ...patch } : x)));
    q.save(item.position, server);
  }

  function answer(r: ExamResponse | null) {
    update({ response: r, answered: isAnswered(item, r) }, { response: r });
  }

  // `timeUp`: the clock ran out. Then what could be saved is submitted even
  // if some saves failed (the server grades what it has by the deadline).
  const submit = useCallback(
    async (timeUp = false) => {
      setSubmitting(true);
      setError(null);
      leaveQuestion();
      try {
        const flushed = await q.flush();
        if (flushed.ended) return showResults();
        if (flushed.unsaved.length && !timeUp) {
          setError(unsavedMessage(flushed.unsaved));
          return;
        }
        setView(await api.post<ExamSessionView>(`/api/exam/sessions/${s.id}/submit`));
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setSubmitting(false);
      }
    },
    [s.id, setView, setError, leaveQuestion, q, showResults]
  );

  // Out of time: submit what was saved.
  const onExpire = useCallback(() => {
    AccessibilityInfo.announceForAccessibility("Time is up. Submitting your answers.");
    submit(true);
  }, [submit]);

  // What "Leave anyway" does, set by whichever way out was taken.
  const pendingLeave = useRef<() => void>(onLeave);
  async function leaveWith(proceed: () => void) {
    pendingLeave.current = proceed;
    leaveQuestion();
    const flushed = await q.flush();
    if (flushed.unsaved.length) {
      setConfirmLeave(unsavedMessage(flushed.unsaved));
      return;
    }
    proceed();
  }
  function leave() {
    void leaveWith(onLeave);
  }

  // REQ-217 (FAIL-1049): the back gesture, the header's back and Android's back
  // button left the screen without saving the question on screen or warning about
  // answers that had not reached the server -- only "Leave and finish later" did.
  // Every way out now goes through the same flush and warning (the two-factor
  // screen's pattern: a "beforeRemove" listener, never held against a sign-out or lock).
  const navigation = useNavigation();
  const { status } = useAuth();
  const statusRef = useRef(status);
  statusRef.current = status;
  const allowLeave = useRef(false);
  const leaveWithRef = useRef(leaveWith);
  leaveWithRef.current = leaveWith;
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (!examLeaveGuard(allowLeave.current, statusRef.current === "signedIn")) return;
      e.preventDefault();
      void leaveWithRef.current(() => {
        allowLeave.current = true;
        navigation.dispatch(e.data.action);
      });
    });
  }, [navigation]);

  const counts = navCounts(items);
  if (!item) return <Loading />;
  return (
    <>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.muted, fontFamily: fonts.bodySemiBold }} accessibilityRole="header">
          Question {index + 1} of {items.length}
        </Text>
        <ExamClock deadlineAt={s.deadlineAt} serverNow={s.serverNow} loadedAt={loadedAt.current} onExpire={onExpire} />
      </View>
      <ProgressBar percent={Math.round((counts.answered / items.length) * 100)} />
      {failedSaves.length ? (
        <ErrorBanner message={t("exam.saveFailed")} onRetry={() => q.retryFailed()} retryLabel={t("exam.saveRetry")} />
      ) : null}
      {view.preparation && view.preparation.built < view.preparation.requested && index === 0 ? (
        <Muted>
          {view.preparation.built} of {view.preparation.requested} questions could be prepared right now, so this one is shorter
          {s.timeLimitSeconds ? " and its time is scaled to match" : ""}.
        </Muted>
      ) : null}

      <Card>
        <Muted style={{ fontSize: 12 }}>
          {item.unitTitle} · {FORMAT_LABEL[item.format]}
        </Muted>
        <ExamQuestion item={item} response={item.response} onChange={answer} />
        <ExamConfidence value={item.confidence} onChange={(n) => update({ confidence: n }, { confidence: n })} />
        <FlagButton flagged={item.flagged} onPress={() => update({ flagged: !item.flagged }, { flagged: !item.flagged })} />
      </Card>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button label="Previous" variant="ghost" icon="chevron-left" disabled={index === 0} onPress={() => go(index - 1)} />
        </View>
        <View style={{ flex: 1 }}>
          {index < items.length - 1 ? (
            <Button label="Next" icon="chevron-right" onPress={() => go(index + 1)} />
          ) : (
            <Button label="Review and submit" icon="check" onPress={() => setConfirm(true)} />
          )}
        </View>
      </View>

      <SectionHeader label="All questions" />
      <Muted>
        {counts.answered} answered · {counts.flagged} flagged
      </Muted>
      <QuestionGrid items={items} index={index} onGo={go} />
      <Button label="Submit" variant="ghost" icon="send" onPress={() => setConfirm(true)} loading={submitting} />
      <Button label="Leave and finish later" variant="link" onPress={leave} />
      <ChoiceSheet
        visible={confirm}
        title="Submit your answers?"
        message={`${submitWarning(counts)}${s.deadlineAt ? " The clock keeps running if you go back." : ""}`}
        options={[
          { label: "Submit now", variant: "primary", onPress: () => submit(false) },
          { label: "Go back", onPress: () => undefined },
        ]}
        onCancel={() => setConfirm(false)}
      />
      <ChoiceSheet
        visible={!!confirmLeave}
        title={t("exam.leaveUnsaved.title")}
        message={t("exam.leaveUnsaved.message", { message: confirmLeave ?? "" })}
        options={[
          { label: t("exam.stay"), variant: "primary", onPress: () => q.retryFailed() },
          { label: t("exam.leaveAnyway"), onPress: () => pendingLeave.current() },
        ]}
        onCancel={() => setConfirmLeave(null)}
      />
    </>
  );
}

// The jump grid, re-rendered only when an answer, flag or the current
// question changes (REQ-113 L3).
const QuestionGrid = React.memo(function QuestionGrid({
  items,
  index,
  onGo,
}: {
  items: ExamItem[];
  index: number;
  onGo: (i: number) => void;
}) {
  return (
    <View style={styles.grid}>
      {items.map((it, i) => (
        <Pressable
          key={it.position}
          onPress={() => onGo(i)}
          accessibilityRole="button"
          accessibilityLabel={navLabel(i, it)}
          accessibilityState={{ selected: i === index }}
          style={[styles.cell, it.answered && styles.cellAnswered, i === index && styles.cellCurrent]}
        >
          <Body style={{ fontFamily: fonts.monoMedium, fontSize: 14 }}>{i + 1}</Body>
          {it.flagged ? <Feather name="flag" size={11} color={colors.warn} /> : null}
        </Pressable>
      ))}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

function ResultsView({ view, onDone }: { view: ExamSessionView; onDone: () => void }) {
  const r = view.results!;
  const [showAll, setShowAll] = useState(false);
  const missed = view.items.filter((i) => i.verdict !== "correct");
  const reviewItems = showAll ? view.items : missed;
  return (
    <>
      <Card elevated style={{ borderColor: colors.accent }}>
        <Muted>{view.session.mode === "mock" ? "Mock exam" : "Sprint"} result</Muted>
        <H1>
          {r.correct} of {r.total} right ({r.percent}%)
        </H1>
        {r.partialPercent > r.percent ? (
          <Muted>
            Counting partly right answers, you had {r.partialPercent}% of the material right. The exam itself gives no partial credit.
          </Muted>
        ) : null}
        <Muted>{r.evidence.line}</Muted>
      </Card>

      {r.readiness ? (
        <Card>
          <H3>Mock score and your readiness estimate</H3>
          {r.readiness.lines.map((l) => (
            <Body key={l}>{l}</Body>
          ))}
        </Card>
      ) : null}

      <Card>
        <H3>By domain</H3>
        {r.domains.map((d) => (
          <View key={d.unitId} style={{ gap: 2 }} accessible accessibilityLabel={`${d.title}: ${d.correct} of ${d.questions} right`}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.sm }}>
              <Body style={{ flex: 1 }}>{d.title}</Body>
              <Body style={{ fontFamily: fonts.bodyBold }}>
                {d.correct}/{d.questions}
              </Body>
            </View>
            <ProgressBar percent={d.percent} height={6} />
            <Muted style={{ fontSize: 12 }}>
              about {d.averageSeconds}s a question{d.smallSample ? " · only a few questions, so read lightly" : ""}
            </Muted>
          </View>
        ))}
      </Card>

      <Card>
        <H3>Pace</H3>
        {r.pacing.lines.map((l) => (
          <Body key={l}>{l}</Body>
        ))}
      </Card>

      <Card>
        <H3>How sure you were</H3>
        {r.calibration.lines.map((l) => (
          <Body key={l}>{l}</Body>
        ))}
        {r.calibration.coaching.map((l) => (
          <Muted key={l}>{l}</Muted>
        ))}
      </Card>

      <SectionHeader label={showAll ? "Every question" : missed.length ? "Worth another look" : "Every question"} />
      {missed.length ? (
        <Muted>Each one of these is information about what to practice next, not a mark against you.</Muted>
      ) : (
        <Muted>Everything right. Nice work.</Muted>
      )}
      {(missed.length ? reviewItems : view.items).map((it) => (
        <Card key={it.position}>
          <Muted style={{ fontSize: 12 }}>
            Question {it.position + 1} · {it.unitTitle} · {FORMAT_LABEL[it.format]}
          </Muted>
          <ExamQuestion item={it} response={it.response} review />
          <ReportProblem target={{ kind: "exam", sessionId: view.session.id, position: it.position }} />
        </Card>
      ))}
      {missed.length && missed.length < view.items.length ? (
        <Button
          label={showAll ? "Show only the ones to review" : "Show every question"}
          variant="ghost"
          onPress={() => setShowAll(!showAll)}
        />
      ) : null}
      <Button label="Done" onPress={onDone} />
    </>
  );
}

const styles = {
  timer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 6 },
  cell: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cellAnswered: { backgroundColor: colors.accentDim },
  cellCurrent: { borderColor: colors.accent, borderWidth: 2 },
};
