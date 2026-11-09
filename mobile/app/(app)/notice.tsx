import React, { useRef, useState } from "react";
import { View, type ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Button, ErrorBanner, H1, Muted, Screen } from "@/components/ui";
import { StudyNoticeBody } from "@/components/StudyNotice";
import { useOnboarding } from "@/auth/OnboardingContext";
import { useAuth } from "@/auth/AuthContext";
import { friendlyError } from "@/lib/errorMessage";
import {
  AI_DATA_HEADING,
  STUDY_NOTICE_ACCEPT_LABEL,
  STUDY_NOTICE_CONTINUE_LABEL,
  STUDY_NOTICE_TITLE,
  type NoticePage,
} from "@/lib/studyNotice";
import { spacing } from "@/lib/theme";

// REQ-165 (Nick, 2026-11-09): the study notice, asked once per account (and
// again only when its text changes), after the Terms and before first run.
// It is the one disclaimer for all content and the AI data disclosure.
// Two pages, one acceptance: the content disclaimer, then the AI data
// disclosure on its own (Play's Prominent Disclosure rule, see
// src/lib/studyNotice.ts); "I agree" on the second records it.
// Same escape hatches as the Terms prompt (agree.tsx): the Privacy Policy,
// account settings (export, delete) and sign out stay reachable.
export default function Notice() {
  const router = useRouter();
  const { acceptNotice } = useOnboarding();
  const { logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<NoticePage>("content");
  const scrollRef = useRef<ScrollView>(null);

  function show(next: NoticePage) {
    setPage(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  async function accept() {
    setError(null);
    try {
      await acceptNotice();
      // The root navigator moves on to first run if that is next; otherwise Home.
      router.replace("/");
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <Screen scrollRef={scrollRef}>
      <H1>{page === "content" ? STUDY_NOTICE_TITLE : AI_DATA_HEADING}</H1>
      <Muted>{page === "content" ? "1 of 2" : "2 of 2"}</Muted>
      <StudyNoticeBody page={page} onReadPrivacy={() => router.push("/privacy")} />
      {error ? <ErrorBanner message={error} onRetry={accept} /> : null}
      {page === "content" ? (
        <Button label={STUDY_NOTICE_CONTINUE_LABEL} icon="arrow-right" onPress={() => show("data")} />
      ) : (
        <>
          <Button label={STUDY_NOTICE_ACCEPT_LABEL} icon="check" onPress={accept} />
          <Button label="Back" variant="ghost" fullWidth={false} onPress={() => show("content")} />
        </>
      )}
      <View style={{ marginTop: spacing.md }}>
        <Muted style={{ textAlign: "center" }}>
          Rather not? You can download your data or delete your account in Account settings.
        </Muted>
        <Button label="Account settings" variant="link" fullWidth={false} onPress={() => router.push("/account")} />
        <Button label="Sign out" variant="ghost" fullWidth={false} onPress={() => logout()} />
      </View>
    </Screen>
  );
}
