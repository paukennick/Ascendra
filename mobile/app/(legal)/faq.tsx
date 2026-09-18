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

export default function Faq() {
  return (
    <Screen>
      <H1>FAQ</H1>
      <Muted style={{ marginTop: spacing.xs }}>Draft — last updated September 17, 2026.</Muted>

      <Section title="What is Ascendra?">
        <Body>
          A self-study companion for exam prep and coursework. It walks each topic through an
          adaptive guess → teach → guided practice → solo teaching loop, tracks mastery per
          objective on a 0–4 scale, schedules spaced review, and includes a performance-based
          question (PBQ) simulator for exams that use them.
        </Body>
      </Section>

      <Section title="Is Ascendra affiliated with CompTIA or any certification body?">
        <Body>
          No. Ascendra is independent and isn't produced, endorsed, or affiliated with CompTIA or
          any other certification or exam body. See the Disclaimer for the full wording.
        </Body>
      </Section>

      <Section title="Do I need a separate account for the web app and the mobile app?">
        <Body>
          No — the same account and password work on both. Progress, mastery, and favorites are
          shared, since both read and write the same account data.
        </Body>
      </Section>

      <Section title="How does mastery tracking work?">
        <Body>
          Each objective moves through the guess → teach → guided → solo stages as you answer
          correctly; a "proficient" objective needs at least 2 attempts and 85%+ accuracy. Ascendra
          also schedules spaced review at 1, 7, and 21 days so mastered material doesn't quietly
          decay.
        </Body>
      </Section>

      <Section title="Can I turn on two-factor authentication?">
        <Body>
          Yes — from Settings, you can enable authenticator-app (TOTP) or email-code
          verification, either of which issues its own set of one-time backup codes.
        </Body>
      </Section>

      <Section title="How do I export or delete my data?">
        <Body>
          Both are in Account: "Export my data" downloads everything tied to your account, and
          the Danger Zone section lets you permanently delete it. See the Privacy Policy for
          exactly what deleting your account does and doesn't remove.
        </Body>
      </Section>

      <Section title="Why did I get signed out?">
        <Body>
          On the web app, closing the browser signs you out (your session doesn't persist across
          browser restarts), and an inactive tab signs out automatically after 30 minutes. On
          mobile, closing the app signs you out unless you've enabled biometric unlock, in which
          case it locks instead and asks you to unlock next time you open it.
        </Body>
      </Section>

      <Section title="Something looks wrong in a lesson or practice question">
        <Body>
          Treat explanations as study material rather than verified exam-authoritative guidance —
          see the Disclaimer — but please report anything that looks incorrect so it can be fixed.
        </Body>
      </Section>
    </Screen>
  );
}
