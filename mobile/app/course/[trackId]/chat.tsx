import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "@/api/client";
import type { ChatMessage } from "@/types";
import { Body, Button, Card, H1, Muted, Loading } from "@/components/ui";
import { colors } from "@/lib/theme";

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
    >
      <View style={{ padding: 16, gap: 8, flex: 1 }}>
        <H1>Ask the coach</H1>
        <Muted>Open Q&A — not graded, doesn't touch mastery or the error log.</Muted>

        {!messages ? (
          <Loading />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, i) => String(i)}
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => (
              <Card
                style={{
                  backgroundColor: item.role === "user" ? colors.cardAlt : colors.card,
                  alignSelf: item.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                }}
              >
                <Body>{item.content}</Body>
              </Card>
            )}
          />
        )}

        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 10,
              color: colors.text,
              maxHeight: 100,
            }}
            multiline
            placeholder="Ask anything about this track..."
            placeholderTextColor={colors.muted}
            value={input}
            onChangeText={setInput}
          />
          <Button label={busy ? "..." : "Send"} onPress={send} disabled={busy || !input.trim()} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
