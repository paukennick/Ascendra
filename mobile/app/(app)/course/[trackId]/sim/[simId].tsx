import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import { Badge, Body, Button, Card, ErrorBanner, H1, H2, Loading, Muted, Screen } from "@/components/ui";
import { colors, spacing } from "@/lib/theme";
import { friendlyError } from "@/lib/errorMessage";
import { capsHeaders } from "@/sim/runtime/caps.ts";
import { alarmTexts, runView, vitalsSentence } from "@/sim/runtime/view.ts";
import { announce, newAnnouncer } from "@/sim/runtime/announcer.ts";
import { useSimRun } from "@/sim/useSimRun";
import { ActionBar, DebriefView, EventLog, PromptCard, ReasoningCard, TopologyPanel, VitalsPanel, WaitsRow } from "@/sim/SimPanels";

// REQ-190 (docs/sims.md 8): one simulation. The brief, then the run: the
// clock and Pause on top, the vitals (bedside) or the architecture (board),
// skips while something is pending, the action groups, decision cards and
// the written-reasoning box (both stop the clock), the event log; then the
// server's debrief. Content is served under the one study notice (REQ-165):
// the server refuses a clinical sim until it is accepted, and its message is
// shown as is.

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
  const router = useRouter();
  const { simId, title } = useLocalSearchParams<{ trackId: string; simId: string; title?: string }>();
  const [info, setInfo] = useState<SimInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const sim = useSimRun(simId);
  const announcer = useRef(newAnnouncer());

  const load = useCallback(() => {
    setLoadError(null);
    api
      .get<SimInfo>(`/api/sims/${simId}`, { headers: capsHeaders() })
      .then(setInfo)
      .catch((err) => setLoadError(friendlyError(err)));
  }, [simId]);
  useEffect(load, [load]);

  const s = sim.session;
  const view = s && sim.status !== "done" ? runView(s.run) : null;

  // Screen-reader announcements: alarms at once, news at most every 10 s.
  useEffect(() => {
    if (!view || !s) return;
    const r = announce(announcer.current, { alarms: alarmTexts(view.tiles), log: s.run.log, nowMs: Date.now(), typing: !!view.reasoning });
    announcer.current = r.state;
    for (const a of r.out) AccessibilityInfo.announceForAccessibility(a.text);
  });

  const running = sim.status === "ready" && !!view && !view.ended;
  const turns = view?.mode === "turns";

  return (
    <Screen>
      <Stack.Screen options={{ title: info?.sim.title ?? title ?? "Simulation" }} />
      {loadError ? <ErrorBanner message={loadError} onRetry={load} /> : null}
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
              {info.openRun ? <Button label="Start over" variant="link" size="sm" fullWidth={false} onPress={() => sim.start(true)} /> : null}
            </>
          )}
        </>
      ) : null}

      {sim.status === "loading" ? <Loading label="Loading the run..." /> : null}

      {s && view ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <View accessible accessibilityLabel={`Sim time ${view.clock}. ${view.phaseLabel}.${sim.paused && view.mode === "running" ? " Paused." : ""}`}>
              <H2>{view.clock}</H2>
              <Muted style={{ fontSize: 12 }}>{view.phaseLabel}{view.blocked ? " · clock stopped" : sim.paused && view.mode === "running" ? " · paused" : ""}</Muted>
            </View>
            {view.mode === "running" && !view.ended ? (
              sim.paused ? (
                <Button label="Run the clock" icon="play" fullWidth={false} disabled={!running} onPress={sim.resume} />
              ) : (
                <Button label="Pause" icon="pause" variant="ghost" fullWidth={false} onPress={() => sim.pause("learner")} />
              )
            ) : null}
          </View>
          {sim.notice ? <Card><View accessibilityLiveRegion="polite"><Muted>{sim.notice}</Muted></View></Card> : null}
          {sim.status === "lease_lost" ? <Button label="Continue on this device" icon="smartphone" onPress={() => sim.start(false)} /> : null}
          {view.banner ? <Card><View accessibilityLiveRegion="polite"><Body>{view.banner}</Body></View></Card> : null}

          <VitalsPanel tiles={view.tiles} onRead={() => AccessibilityInfo.announceForAccessibility(vitalsSentence(view.tiles))} />
          {view.infusions ? <Muted>{view.infusions}</Muted> : null}
          <TopologyPanel zones={view.board.zones} meters={view.board.meters} />

          {view.prompt ? <PromptCard prompt={view.prompt} onChoose={(c) => sim.command({ type: "choose", prompt: view.prompt!.id, choice: c })} /> : null}
          {view.reasoning ? (
            <ReasoningCard
              key={view.reasoning.id}
              question={view.reasoning.question}
              onSubmit={sim.submitReasoning}
              onSkip={() => sim.closeReasoning(false)}
              onContinue={() => sim.closeReasoning(true)}
            />
          ) : null}

          <WaitsRow run={s.run} waits={view.waits} turns={turns} disabled={!running || (!turns && sim.paused)} onSkip={sim.skipTo} />
          {view.mode === "running" && sim.paused && !view.blocked ? <Muted>Run the clock to act. Pause any time; pausing is never scored.</Muted> : null}
          <ActionBar run={s.run} groups={view.groups} onCommand={sim.command} disabled={!running || view.blocked || (view.mode === "running" && sim.paused)} />
          {view.outputs.map((o) => <Card key={o.key}><Body>{o.text}</Body></Card>)}
          <EventLog log={view.log} finding={view.finding} />
          {sim.status === "finishing" ? <Loading label="Confirming the ending with the server..." /> : null}
          {!view.ended ? <Button label="End the run" variant="link" size="sm" fullWidth={false} accessibilityLabel="End the run early. Nothing is recorded for mastery." onPress={() => { sim.quit(); }} /> : null}
        </>
      ) : null}

      {sim.status === "done" && sim.debrief ? (
        <DebriefView d={sim.debrief} onAgain={() => sim.start(true)} onBack={() => router.back()} />
      ) : null}
    </Screen>
  );
}
