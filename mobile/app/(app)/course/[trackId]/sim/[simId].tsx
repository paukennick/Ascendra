import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { Alert } from "@/lib/alert";
import { reasoningDraftKey } from "@/lib/drafts";
import { Badge, Body, Button, Card, ErrorBanner, H1, H2, Loading, Muted, Screen } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { friendlyError } from "@/lib/errorMessage";
import { capsHeaders } from "@/sim/runtime/caps.ts";
import { alarmTexts, runView, sessionAlarmTexts, sessionNews, vitalsSentence, type SessionView } from "@/sim/runtime/view.ts";
import { announce, newAnnouncer } from "@/sim/runtime/announcer.ts";
import { useSimRun } from "@/sim/useSimRun";
import { ConsolePanel } from "@/sim/ConsolePanel";
import { consoleAlarmTexts, consoleNews, consoleSentence, type ConsoleView } from "@/sim/runtime/consoleView.ts";
import { ReportProblem } from "@/components/ReportProblem";
import { localHash } from "@/sim/runtime/session.ts";
import { ActionBar, ChapterCard, DebriefView, EventLog, LaunchCard, PaceControl, PromptCard, ReasoningCard, SessionPanel, SkipOffer, TeachingCard, TopologyPanel, VitalsPanel, WaitsRow, sessionSentence } from "@/sim/SimPanels";
import { launchView, needsLaunchChoice, paceChangeable, paceOptions, simClock, teachFeedback, teachOffer, type LaunchChoice } from "@/sim/runtime/pacing.ts";
import { useGoBack } from "@/lib/useGoBack";
import { isNotFound } from "@/lib/notFound";
import { LoadError } from "@/components/LoadError";

// REQ-190 (docs/sims.md 8): one simulation. The brief, then the run: the
// clock and Pause on top, the vitals (bedside) or the architecture (board),
// skips while something is pending, the action groups, decision cards and
// the written-reasoning box (both stop the clock), the event log; then the
// server's debrief. REQ-225: a client session shows the client
// (SessionPanel) where the vitals or the architecture would be. Content is
// served under the one study notice (REQ-165): the server refuses a clinical
// sim until it is accepted, and its message is shown as is.

interface SimInfo {
  sim: {
    id: string;
    title: string;
    screenType: string;
    objectiveTitle: string;
    access: "full" | "sample" | "locked";
    brief: { situation: string; handover?: string[]; howItWorks?: string[] };
    runnable: boolean;
  };
  openRun: { id: string; lastTick: number } | null;
  lastFinished: { id: string; rating: string | null } | null;
}

export default function SimScreen() {
  const { trackId, simId, title } = useLocalSearchParams<{ trackId: string; simId: string; title?: string }>();
  const goBack = useGoBack(`/course/${encodeURIComponent(trackId)}/sims`);
  const [notFound, setNotFound] = useState(false);
  const [info, setInfo] = useState<SimInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sim = useSimRun(simId);
  const { user } = useAuth();
  const announcer = useRef(newAnnouncer());
  // REQ-225: the client session as last announced, to speak what changed.
  const lastSession = useRef<SessionView | null>(null);
  // REQ-231: the security console as last announced, to speak what changed.
  const lastConsole = useRef<ConsoleView | null>(null);
  // REQ-209: the launch card's pick; the scenario's default pace until changed.
  const [pick, setPick] = useState<LaunchChoice | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    setNotFound(false);
    api
      .get<SimInfo>(`/api/sims/${simId}`, { headers: capsHeaders() })
      .then(setInfo)
      .catch((err) => {
        setLoadError(friendlyError(err));
        setNotFound(isNotFound(err));
      });
  }, [simId]);
  useEffect(load, [load]);

  const s = sim.session;
  const view = s && sim.status !== "done" ? runView(s.run) : null;

  // Screen-reader announcements: alarms at once, news at most every 10 s.
  useEffect(() => {
    if (!view || !s) return;
    const news = [...sessionNews(lastSession.current, view.session), ...consoleNews(lastConsole.current, view.console)];
    lastSession.current = view.session;
    lastConsole.current = view.console;
    const r = announce(announcer.current, { alarms: [...alarmTexts(view.tiles), ...sessionAlarmTexts(view.session), ...consoleAlarmTexts(view.console)], log: s.run.log, nowMs: Date.now(), typing: !!view.reasoning, news });
    announcer.current = r.state;
    for (const a of r.out) AccessibilityInfo.announceForAccessibility(a.text);
  });

  const running = sim.status === "ready" && !!view && !view.ended;
  const turns = view?.mode === "turns";
  // REQ-209: pacing is offered only where the server says so (a running phase in
  // a clinical or fitness track); everything below is absent otherwise.
  const pacing = s?.pacing ?? null;
  const launching = !!s && !!pacing && !!view && sim.status === "ready" && needsLaunchChoice(s.run, pacing);
  const choice: LaunchChoice = pick ?? { pace: pacing?.defaultPace ?? 1, start: "full" };
  const clock = s && pacing ? simClock(s.run, pacing) : null;
  const teach = s && pacing && !launching && !view?.blocked ? teachOffer(s.run, pacing) : null;
  const feedback = s && sim.teachResult ? teachFeedback(s.doc, sim.teachResult.prompt, sim.teachResult.choice) : null;
  const chapter = launching ? null : sim.chapter;

  return (
    <Screen>
      <Stack.Screen options={{ title: info?.sim.title ?? title ?? "Simulation" }} />
      {loadError ? <LoadError message={loadError} notFound={notFound} onRetry={load} /> : null}
      {!info && !loadError ? <Loading label="Opening the simulation..." /> : null}

      {info && !s && sim.status !== "loading" ? (
        <>
          <View style={{ gap: spacing.xs }}>
            <H1>{info.sim.title}</H1>
            <Muted>{info.sim.objectiveTitle}</Muted>
            {info.sim.access === "sample" ? <Badge label="Sample simulation" color={colors.good} icon="gift" /> : null}
          </View>
          <Card elevated>
            <H2>The situation</H2>
            <Body>{info.sim.brief.situation}</Body>
            {(info.sim.brief.handover ?? []).map((h, i) => <Body key={i}>{h}</Body>)}
          </Card>
          {info.sim.brief.howItWorks?.length ? (
            <Card>
              <H2>How it works</H2>
              {info.sim.brief.howItWorks.map((h, i) => <Muted key={i}>{h}</Muted>)}
            </Card>
          ) : null}
          {!info.sim.runnable && !info.openRun ? (
            <Card>
              <Body>Update the app to open this simulation.</Body>
            </Card>
          ) : (
            <>
              {sim.error ? <ErrorBanner message={sim.error} onRetry={() => sim.start(false)} /> : null}
              <Button label={info.openRun ? "Continue the run" : "Start the simulation"} icon="play" onPress={() => sim.start(false)} />
              {info.openRun ? (
                <Button
                  label="Start over"
                  variant="link"
                  size="sm"
                  fullWidth={false}
                  onPress={() =>
                    // REQ-217 (FAIL-1052): it throws away the run in progress.
                    Alert.alert("Start over?", "This discards the run in progress and begins a new one. Nothing from the discarded run counts toward mastery.", [
                      { text: "Keep my run", style: "cancel" },
                      { text: "Start over", style: "destructive", onPress: () => void sim.start(true) },
                    ])
                  }
                />
              ) : null}
            </>
          )}
        </>
      ) : null}

      {sim.status === "loading" ? <Loading label="Loading the run..." /> : null}

      {s && view ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <View accessible accessibilityLabel={`${clock ? clock.spoken : `Sim time ${view.clock}`}. ${view.phaseLabel}.${sim.paused && view.mode === "running" ? " Paused." : ""}`}>
              {clock ? <H1>{clock.text}</H1> : <H2>{view.clock}</H2>}
              <Muted style={{ fontSize: 12 }}>
                {clock ? `Sim time · ${clock.elapsed} · ` : ""}
                {view.phaseLabel}{view.blocked ? " · clock stopped" : sim.paused && view.mode === "running" ? " · paused" : ""}
                {pacing?.eligible && view.mode === "running" && s ? ` · ${s.run.pace === 3 ? "study pace 3x" : "exam realism 1x"}` : ""}
              </Muted>
            </View>
            {view.mode === "running" && !view.ended && !launching ? (
              sim.paused ? (
                <Button label="Run the clock" icon="play" fullWidth={false} disabled={!running} onPress={sim.resume} />
              ) : (
                <Button label="Pause" icon="pause" variant="ghost" fullWidth={false} onPress={() => sim.pause("learner")} />
              )
            ) : null}
          </View>
          {s && pacing && launching ? (
            <LaunchCard
              view={launchView(s.doc, pacing, choice)}
              choice={choice}
              onChoice={setPick}
              onStart={() => { sim.launch(choice); setPick(null); }}
            />
          ) : null}
          {s && pacing && !launching && paceChangeable(s.run, pacing) && view.mode === "running" ? (
            <PaceControl options={paceOptions(s.run.pace)} onPick={sim.choosePace} />
          ) : null}
          {chapter ? <ChapterCard offer={chapter} onContinue={() => void sim.answerChapter("continue")} onLater={() => void sim.answerChapter("later")} /> : null}
          {sim.savedLater ? (
            <Card elevated>
              <View accessibilityLiveRegion="polite">
                <Body>Saved. Your run is waiting at this point, on this or any other device. Open the simulation again and choose "Continue the run".</Body>
              </View>
              <Button label="Back to simulations" onPress={goBack} />
              <Button label="Keep going now" variant="link" size="sm" fullWidth={false} onPress={sim.keepGoing} />
            </Card>
          ) : null}
          {sim.notice ? <Card><View accessibilityLiveRegion="polite"><Muted>{sim.notice}</Muted></View></Card> : null}
          {/* REQ-217 (FAIL-1053): a reload that failed left this view frozen with nothing said. */}
          {sim.status === "error" && sim.error ? <ErrorBanner message={sim.error} onRetry={() => sim.start(false)} retryLabel="Reload the run" /> : null}
          {sim.status === "lease_lost" ? <Button label="Continue on this device" icon="smartphone" onPress={() => sim.start(false)} /> : null}
          {view.banner ? <Card><View accessibilityLiveRegion="polite"><Body>{view.banner}</Body></View></Card> : null}

          <VitalsPanel tiles={view.tiles} onRead={() => AccessibilityInfo.announceForAccessibility(vitalsSentence(view.tiles))} />
          <SessionPanel v={view.session} said={view.finding} onRead={() => view.session && AccessibilityInfo.announceForAccessibility(sessionSentence(view.session, view.finding))} />
          {view.infusions ? <Muted>{view.infusions}</Muted> : null}
          <TopologyPanel zones={view.board.zones} meters={view.board.meters} />
          <ConsolePanel v={view.console} onRead={() => view.console && AccessibilityInfo.announceForAccessibility(consoleSentence(view.console))} />

          {view.prompt ? <PromptCard prompt={view.prompt} onChoose={(c) => sim.command({ type: "choose", prompt: view.prompt!.id, choice: c })} /> : null}
          {view.reasoning ? (
            <ReasoningCard
              key={view.reasoning.id}
              question={view.reasoning.question}
              draftKey={user ? reasoningDraftKey(user.id, s.runId, view.reasoning.id) : null}
              onSubmit={sim.submitReasoning}
              onSkip={() => sim.closeReasoning(false)}
              onContinue={() => sim.closeReasoning(true)}
            />
          ) : null}

          {sim.calm && running && !sim.paused && !chapter ? <SkipOffer offer={sim.calm} disabled={!running} onSkip={() => void sim.skipTo(sim.calm!.wait, { calm: true })} /> : null}
          {teach || feedback ? <TeachingCard offer={teach} feedback={feedback} onAnswer={(c) => sim.answerTeach(teach!.id, c)} onDismiss={sim.dismissTeach} /> : null}
          <WaitsRow run={s.run} waits={view.waits} turns={turns} plain={!!view.session || !!view.console} disabled={!running || (!turns && sim.paused) || !!chapter} onSkip={(w) => void sim.skipTo(w)} />
          {view.mode === "running" && sim.paused && !view.blocked ? <Muted>Run the clock to act. Pause any time; pausing is never scored.</Muted> : null}
          <ActionBar run={s.run} groups={view.groups} onCommand={sim.command} disabled={!running || view.blocked || launching || !!chapter || (view.mode === "running" && sim.paused)} />
          {view.outputs.map((o) => <Card key={o.key}><Body>{o.text}</Body></Card>)}
          <EventLog log={view.log} finding={view.finding} />
          {sim.status === "finishing" ? <Loading label="Confirming the ending with the server..." /> : null}
          {!view.ended ? <Button label="End the run" variant="link" size="sm" fullWidth={false} accessibilityLabel="End the run early. Nothing is recorded for mastery." onPress={() => {
            // REQ-217 (FAIL-1052): ending early records nothing for mastery; one tap shouldn't do it.
            Alert.alert("End the run?", "Nothing from this run is recorded for mastery.", [
              { text: "Keep going", style: "cancel" },
              { text: "End the run", style: "destructive", onPress: () => { sim.quit(); } },
            ]);
          }} /> : null}
          {/* REQ-199: the moment the learner saw (tick, state hash) goes with the report. */}
          <ReportProblem
            key={`report-${s.runId}`}
            target={{ kind: "sim", runId: s.runId }}
            resolve={() => ({ kind: "sim", runId: s.runId, tick: s.run.state.tick, stateHash: localHash(s) })}
          />
        </>
      ) : null}

      {sim.status === "done" && sim.debrief ? (
        <>
          {sim.notice ? <Card><View accessibilityLiveRegion="polite"><Muted>{sim.notice}</Muted></View></Card> : null}
          <DebriefView d={sim.debrief} onAgain={() => sim.start(true)} onBack={goBack} />
          <ReportProblem key={`report-${sim.debrief.runId}`} target={{ kind: "sim", runId: sim.debrief.runId }} />
        </>
      ) : null}
    </Screen>
  );
}
