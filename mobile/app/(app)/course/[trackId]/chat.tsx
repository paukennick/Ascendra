import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import type { ChatMessage } from "@/types";
import { Body, EmptyState, H1, Loading, Muted } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";

export default function ChatScreen() {
  const { trackId } = useLocalSearchParams<{ trackId: string }>();
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(() => {
    api
      .get<{ messages: ChatMessage[] }>(`/api/chat?trackId=${trackId}`)
      .then((res) => setMessages(res.messages));
  }, [trackId]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...(prev ?? []), userMsg]);
    const text = input;
    setInput("");
    setBusy(true);
    try {
      const res = await api.post<{ reply: string }>("/api/chat", { trackId, message: text });
      setMessages((prev) => [...(prev ?? []), { role: "assistant", content: res.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...(prev ?? []),
        { role: "assistant", content: `(error getting reply: ${(err as Error).message})` },
      ]);
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
      <View style={{ padding: spacing.lg, gap: spacing.xs, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.headerIcon}>
            <Feather name="message-circle" size={16} color={colors.accent} />
          </View>
          <View>
            <H1 style={{ fontSize: 19 }}>Ask the coach</H1>
            <Muted>Open Q&A — not graded, doesn't touch mastery</Muted>
          </View>
        </View>

        {!messages ? (
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
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.role === "user" ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Body style={item.role === "user" ? { color: colors.accentText } : undefined}>{item.content}</Body>
              </View>
            )}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            multiline
            placeholder="Ask anything about this track..."
            placeholderTextColor={colors.mutedDim}
            value={input}
            onChangeText={setInput}
          />
          <Pressable
            onPress={send}
            disabled={busy || !input.trim()}
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
  inputBar: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-end",
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
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
