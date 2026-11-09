import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { friendlyError } from "@/lib/errorMessage";
import * as Crypto from "expo-crypto";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import type { ChatMessage } from "@/types";
import { Body, Button, EmptyState, ErrorBanner, H1, Loading, Muted } from "@/components/ui";
import { CHAT_DRAFT_MAX, chatDraftKey, chatDraftPayload, chatDraftText } from "@/lib/drafts";
import { colors, radius, spacing } from "@/lib/theme";
import { useStoredDraft } from "@/lib/useStoredDraft";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReportCoachReply } from "@/components/ReportCoachReply";

export default function ChatScreen() {
  // REQ-084: `prefill` and `unitId` arrive from the "Ask the coach about
  // this" shortcut inside a lesson, so the thread opens with the objective
  // already named and the server gets the unit for its framing.
  const { trackId, trackTitle, prefill, unitId } = useLocalSearchParams<{
    trackId: string;
    trackTitle?: string;
    prefill?: string;
    unitId?: string;
  }>();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState(prefill ?? "");
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // REQ-113 (Audit 3 mobile M7): a failed reply used to be added to the
  // thread as if the coach had said "(error getting reply: ...)".
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  // The id of the message last sent, kept until it gets a reply. Sending the
  // same text again after a failure reuses it, so if the first request did
  // reach the server the stored reply comes back instead of a duplicate.
  const pendingRef = useRef<{ id: string; text: string } | null>(null);
  // REQ-165: the coach reply being reported, if any (index into messages).
  const [reporting, setReporting] = useState<number | null>(null);
  // REQ-165: edge-to-edge (Android 15+ targets, enforced at API 36) draws
  // under the navigation bar; keep the message box above it.
  const insets = useSafeAreaInsets();

  // REQ-131: an unsent message survives leaving the screen. Per user and
  // course; a prefill from the lesson shortcut wins over an older draft, and
  // emptying the box (what a send does) clears it.
  const { user } = useAuth();
  useStoredDraft(
    user && trackId ? chatDraftKey(user.id, trackId) : null,
    chatDraftPayload(input, prefill),
    (stored) => {
      if (!stored || prefill) return;
      const text = chatDraftText(stored);
      if (text) setInput((current) => current || text);
    }
  );

  const load = useCallback(() => {
    setLoadError(null);
    api
      .get<{ messages: ChatMessage[] }>(`/api/chat?trackId=${trackId}`)
      .then((res) => setMessages(res.messages))
      .catch((err) => setLoadError(friendlyError(err)));
  }, [trackId]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!input.trim()) return;
    setSendError(null);
    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...(prev ?? []), userMsg]);
    const text = input;
    setInput("");
    setBusy(true);
    const clientMessageId =
      pendingRef.current?.text === text ? pendingRef.current.id : Crypto.randomUUID();
    pendingRef.current = { id: clientMessageId, text };
    try {
      const res = await api.post<{ reply: string }>("/api/chat", { trackId, unitId, message: text, clientMessageId });
      pendingRef.current = null;
      setMessages((prev) => [...(prev ?? []), { role: "assistant", content: res.reply }]);
    } catch (err) {
      // Take the unanswered message back out of the thread; its text goes
      // back in the box below, ready to send again.
      setMessages((prev) => (prev && prev[prev.length - 1] === userMsg ? prev.slice(0, -1) : prev));
      setSendError(friendlyError(err, { kept: true }));
      // The draft is only meant to be cleared by a *successful* send: put the
      // text back (unless they've started something new) so it isn't lost and
      // sending it again reuses its clientMessageId.
      setInput((current) => current || text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={{ padding: spacing.lg, paddingBottom: spacing.lg + insets.bottom, gap: spacing.xs, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.headerIcon}>
            <Feather name="message-circle" size={16} color={colors.accent} />
          </View>
          <View>
            <H1 style={{ fontSize: 19 }}>Ask the coach</H1>
            <Muted>{trackTitle ? `${trackTitle} · ` : ""}Open Q&A — not graded, doesn't touch mastery</Muted>
            <Muted style={{ fontSize: 12 }}>Replies are written by AI and can be wrong. Report one with the flag under it.</Muted>
          </View>
        </View>
        {/* REQ-110: the coach quizzes the learner on their weakest objectives. */}
        <Button
          label="Quiz me on my weak spots"
          icon="help-circle"
          size="sm"
          variant="ghost"
          fullWidth={false}
          onPress={() => router.push({ pathname: `/course/${trackId}/quiz`, params: { trackTitle } })}
        />

        {!messages && loadError ? (
          <View style={{ gap: spacing.sm, paddingVertical: spacing.md }}>
            <ErrorBanner message={loadError} />
            <Button label="Try again" icon="refresh-cw" fullWidth={false} onPress={load} />
          </View>
        ) : !messages ? (
          <Loading />
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <EmptyState icon="message-square" title="No messages yet" message="Ask anything about this course — concepts, exam strategy, or a concept you're stuck on." />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            // REQ-077: a reply takes several seconds; nothing in the list
            // acknowledged the send before this, so it read as dropped.
            ListFooterComponent={
              busy ? (
                <View style={[styles.bubble, styles.bubbleAssistant, { flexDirection: "row", alignItems: "center", gap: 8 }]}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Muted>Coach is thinking...</Muted>
                </View>
              ) : null
            }
            renderItem={({ item, index }) => (
              <View
                style={[
                  styles.bubble,
                  item.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Body style={item.role === "user" ? { color: colors.accentText } : undefined}>{item.content}</Body>
                {item.role === "assistant" ? (
                  <Pressable
                    onPress={() => setReporting(index)}
                    accessibilityRole="button"
                    accessibilityLabel="Report this reply"
                    hitSlop={12}
                    style={styles.reportLink}
                  >
                    <Feather name="flag" size={12} color={colors.mutedDim} />
                    <Muted style={{ fontSize: 12 }}>Report</Muted>
                  </Pressable>
                ) : null}
              </View>
            )}
          />
        )}

        {reporting !== null && messages?.[reporting]?.role === "assistant" ? (
          <ReportCoachReply
            key={reporting}
            trackId={trackId}
            trackTitle={trackTitle}
            reply={messages[reporting].content}
            onClose={() => setReporting(null)}
          />
        ) : null}
        {sendError ? <ErrorBanner message={sendError} onRetry={send} /> : null}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            accessibilityLabel="Message to the coach"
            multiline
            placeholder="Ask anything about this track..."
            maxLength={CHAT_DRAFT_MAX}
            placeholderTextColor={colors.mutedDim}
            value={input}
            onChangeText={setInput}
            // REQ-077: on web, Enter sends and Shift+Enter inserts a newline,
            // the convention every chat UI on the desktop follows. Native
            // keyboards keep their return key as a newline.
            onKeyPress={(e) => {
              if (Platform.OS !== "web") return;
              const native = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
              if (native.key === "Enter" && !native.shiftKey) {
                e.preventDefault();
                if (!busy && input.trim()) send();
              }
            }}
          />
          {/* REQ-113 (Audit 3 mobile H4): labelled, with a role and state, and
              a 48 dp touch target around the 36 dp circle. */}
          <Pressable
            onPress={send}
            disabled={busy || !input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: busy || !input.trim(), busy }}
            hitSlop={6}
            style={[styles.sendButton, (busy || !input.trim()) && { opacity: 0.4 }]}
          >
            <Feather name="send" size={17} color={colors.accentText} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: "88%",
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  reportLink: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 6 },
  inputBar: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-end",
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.xl,
    padding: 6,
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
