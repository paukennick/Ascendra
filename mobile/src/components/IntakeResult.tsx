import React from "react";
import { Linking } from "react-native";
import { useRouter } from "expo-router";
import { useBilling } from "@/billing/BillingContext";
import { Body, Button, Card, H2, Muted } from "@/components/ui";
import { SUGGESTION_NOTE, suggestionLink, type IntakeView } from "@/lib/intake";

// REQ-169: what the saved intake suggests. With paid plans off the server
// sends no plan suggestion and this shows nothing about plans. "Teaching a
// class" shows the class contact line (REQ-166's wording) instead.
export function IntakeResult({ view }: { view: IntakeView | null }) {
  const router = useRouter();
  const { config } = useBilling();
  if (!view) return null;
  const s = config.enabled ? view.planSuggestion : null;
  const contact = view.classContact;
  if (!s && !contact) return null;
  return (
    <>
      {s ? (
        <Card>
          <H2>A plan that fits</H2>
          <Body>{s.reason}</Body>
          <Muted>{SUGGESTION_NOTE}</Muted>
          <Button label="See this plan" variant="ghost" icon="arrow-right" onPress={() => router.push(suggestionLink(s))} />
        </Card>
      ) : null}
      {contact ? (
        <Card>
          <Muted>Using Ascendra with a class is a separate school arrangement. A personal plan is for your own study.</Muted>
          {contact.email ? (
            <Button
              label={contact.line}
              variant="link"
              accessibilityLabel={`${contact.line} at ${contact.email}`}
              onPress={() => Linking.openURL(`mailto:${contact.email}`)}
            />
          ) : (
            <Body>{contact.line}</Body>
          )}
        </Card>
      ) : null}
    </>
  );
}
