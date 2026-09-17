import { View } from "react-native";
import { Screen, H1, H2, Body, Muted } from "@/components/ui";
import { spacing } from "@/lib/theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
      <H2>{title}</H2>
      {children}
    </View>
  );
}

export default function Cookies() {
  return (
    <Screen>
      <H1>Cookies & Local Storage</H1>
      <Muted style={{ marginTop: spacing.xs }}>
        Draft — last updated September 17, 2026.
      </Muted>

      <Section title="What we actually use">
        <Body>
          Ascendra doesn't use advertising or cross-site tracking cookies, and doesn't run
          third-party analytics. The only thing stored on your device is a single, strictly
          necessary sign-in session: on the phone/tablet app it lives in the OS's secure
          credential store (iOS Keychain / Android Keystore, via Expo SecureStore); in a browser
          it's the closest browser-native equivalent. Nothing here is used to track you across
          other sites or shared with advertisers.
        </Body>
      </Section>

      <Section title="Why we don't ask for cookie consent">
        <Body>
          Because that stored session is strictly necessary to keep you signed in — the
          equivalent of a login cookie — it doesn't require a consent banner under current cookie
          law. If we ever add analytics, crash reporting, or anything non-essential that sets
          cookies or similar storage, this page (and a consent prompt) will be updated before that
          ships.
        </Body>
      </Section>

      <Section title="Clearing it">
        <Body>
          Signing out, or clearing your browser's site data for this app, removes the stored
          session immediately.
        </Body>
      </Section>
    </Screen>
  );
}
