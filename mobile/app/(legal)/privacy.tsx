import { View } from "react-native";
import { Screen, H1, H2, H3, Body, Muted, Divider } from "@/components/ui";
import { spacing } from "@/lib/theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
      <H2>{title}</H2>
      {children}
    </View>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4, marginTop: spacing.sm }}>
      <H3>{title}</H3>
      {children}
    </View>
  );
}

export default function Privacy() {
  return (
    <Screen>
      <H1>Privacy Policy</H1>
      <Muted style={{ marginTop: spacing.xs }}>
        Draft — last updated September 17, 2026. Plain-language starting point for legal review,
        written against what the app actually stores today.
      </Muted>

      <Section title="1. What we collect">
        <Sub title="Account info">
          <Body>
            Email address, display name (optional), and a hashed password — we never store your
            password itself. If you sign in with Google, we store the linked Google account
            identifier, not your Google password.
          </Body>
        </Sub>
        <Sub title="Security & sign-in">
          <Body>
            Two-factor authentication setup (authenticator-app or email-code method) and backup
            codes, in hashed/encrypted form; sign-in and security events (e.g. new device,
            password change) with approximate timing and device/browser info, kept so we can show
            you your active sessions and flag suspicious activity; and short-lived tokens used to
            verify your email, reset your password, or confirm changes to your account.
          </Body>
        </Sub>
        <Sub title="Study activity">
          <Body>
            Which lessons and practice questions you've attempted, your answers, and the mastery
            scores calculated from them, so we can show your progress and pick what to show you
            next. If you use the Ask Coach AI study assistant, we store the messages you send it
            and its replies, to keep your conversation history.
          </Body>
        </Sub>
      </Section>

      <Section title="2. What we don't collect">
        <Body>
          No advertising or cross-site tracking, no sale of your data, and no third-party
          analytics trackers as of this writing. See the Cookies & Storage page for exactly what's
          stored on your device.
        </Body>
      </Section>

      <Section title="3. Why we collect it">
        <Body>
          To run your account and keep it secure (authentication, MFA, session/device list,
          fraud/abuse detection); to deliver the study experience (progress tracking, mastery
          scoring, the AI coach); and to send account-related email (verification, password reset,
          security alerts) — never marketing email without your separate opt-in.
        </Body>
      </Section>

      <Section title="4. Who we share it with">
        <Body>
          We don't sell your data. It's shared only with the vendors that run the service on our
          behalf, under their own data-processing terms:
        </Body>
        <Body>• Supabase — hosts the database (all data described above).</Body>
        <Body>• Vercel — hosts the app and API.</Body>
        <Body>• Resend — sends verification, password-reset, and security emails.</Body>
        <Body>• Google — only if you choose to sign in or link your account with Google.</Body>
        <Body>
          • [AI provider to confirm] — processes messages you send to the Ask Coach assistant.
        </Body>
      </Section>

      <Section title="5. How long we keep it">
        <Body>
          Account and study data for as long as your account is open. Security event logs and
          short-lived tokens (email verification, password reset) expire automatically or are
          purged on a rolling basis. Deleting your account removes your profile, study history,
          and MFA credentials; anything we're legally required to retain (e.g. fraud/abuse
          records) is kept only as long as that requirement lasts.
        </Body>
      </Section>

      <Section title="6. Your controls">
        <Body>
          From Account settings you can change your email or password, view and revoke active
          sessions, manage or remove two-factor methods, export your data, or delete your account
          — all without contacting us. If you'd rather ask us directly, or have a question this
          page doesn't answer: [privacy contact email to confirm].
        </Body>
      </Section>

      <Divider style={{ marginTop: spacing.xl }} />
      <Section title="7. Changes to this policy">
        <Body>
          If this policy changes in a material way, we'll update the date above and, for
          significant changes, notify you directly.
        </Body>
      </Section>
    </Screen>
  );
}
