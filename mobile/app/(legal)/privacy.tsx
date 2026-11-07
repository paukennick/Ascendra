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

// REQ-119 (Audit 3 product H3): the AI section now says what the code
// actually sends to Anthropic, and the retention section says what the code
// actually keeps. Sources checked 2026-11-07 (see CHANGELOG / REQ-119):
//   - Anthropic Commercial Terms of Service, section B ("Anthropic may not
//     train models on Customer Content from Services"), effective
//     June 17, 2025: https://www.anthropic.com/legal/commercial-terms
//   - Anthropic Privacy Center, "How long do you store my organization's
//     data?" (updated July 1, 2026): API inputs and outputs deleted within
//     30 days, longer for Usage Policy enforcement (up to 2 years when
//     flagged) or where the law requires:
//     https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data
// Still a draft for legal review: contact address, data location, age and
// billing sections are not ours to invent.
export default function Privacy() {
  return (
    <Screen>
      <H1>Privacy Policy</H1>
      <Muted style={{ marginTop: spacing.xs }}>
        Draft for legal review — last updated November 7, 2026. Plain-language summary written against
        what the app actually stores and sends today.
      </Muted>

      <Section title="1. What we collect">
        <Sub title="Account info">
          <Body>
            Email address, display name (optional), profile picture (optional), and a hashed password —
            we never store your password itself. If you sign in with Google, we store the linked Google
            account identifier, not your Google password. We also record which version of these terms
            you agreed to, and when.
          </Body>
        </Sub>
        <Sub title="Security & sign-in">
          <Body>
            Two-factor authentication setup (authenticator-app or email-code method) and backup codes,
            in hashed/encrypted form; sign-in and security events (e.g. new device, password change)
            with approximate timing, IP address and device/browser info, kept so we can show you your
            active sessions, limit repeated attempts and flag suspicious activity; and short-lived
            tokens used to verify your email, reset your password, or confirm changes to your account.
          </Body>
        </Sub>
        <Sub title="Study activity">
          <Body>
            The lessons, questions, reviews, practice exams and scenarios you've attempted, your
            answers (including anything you type), how confident you said you were, and the mastery
            scores and study plan calculated from them, so we can show your progress and pick what
            to show you next. If you use Ask the coach, we store the messages you send it and its
            replies. If you choose to tell us how a real exam went, we store the date, the result
            and any score you enter.
          </Body>
        </Sub>
        <Sub title="Learning milestones">
          <Body>
            A short record of milestones — a lesson started or finished, a review or practice exam
            done, a placement check finished, the welcome steps completed, an exam result reported —
            with the time and the course it belongs to. It holds no answer text. We use it, only
            ourselves, to see whether Ascendra is helping people learn (for example, how many new
            learners finish a first lesson).
          </Body>
        </Sub>
        <Sub title="Support requests">
          <Body>
            What you write in a support ticket or course request, with your account email so we can
            reply.
          </Body>
        </Sub>
      </Section>

      <Section title="2. What we don't collect">
        <Body>
          No advertising or cross-site tracking, no sale of your data, and no third-party analytics
          or crash-reporting services as of this writing. Study reminders, if you turn them on, are
          scheduled on your phone; we don't receive them and use no push service. See the Cookies &
          Storage page for exactly what's stored on your device.
        </Body>
      </Section>

      <Section title="3. Why we collect it">
        <Body>
          To run your account and keep it secure (authentication, MFA, session/device list,
          fraud/abuse detection); to deliver the study experience (progress tracking, mastery
          scoring, grading written answers, the AI coach); to check, in aggregate, that the app is
          actually helping people learn; and to send account-related email (verification, password
          reset, security alerts) — never marketing email without your separate opt-in.
        </Body>
      </Section>

      <Section title="4. Who we share it with">
        <Body>
          We don't sell your data. It's shared only with the vendors that run the service on our
          behalf, under their own data-processing terms:
        </Body>
        <Body>• Supabase — hosts the database (all data described above).</Body>
        <Body>• Vercel — hosts the app and API.</Body>
        <Body>• Resend — sends verification, password-reset and security emails, and forwards support requests to us.</Body>
        <Body>• Google — only if you choose to sign in or link your account with Google.</Body>
        <Body>• Anthropic — the AI provider (Claude models). What it receives is described in section 5.</Body>
      </Section>

      <Section title="5. AI features and what they send">
        <Body>
          Some features send text to Anthropic to be processed by an AI model. Your name, email
          address and account ID are not sent with these requests.
        </Body>
        <Sub title="Features that send what you type">
          <Body>
            • Ask the coach: your message, the earlier messages in that course's conversation (up to
            the last 40), the course and unit titles, and a short summary of your weakest topics and
            recent kinds of mistakes in that course.
          </Body>
          <Body>
            • Grading and feedback on written answers: lesson answers you write in your own words,
            your first guess in a lesson, "explain it back" explanations, lab reports, scenario
            (PBQ) answers, written review answers and unit-check answers. Each is sent with the
            question and the course material it is graded against.
          </Body>
        </Sub>
        <Sub title="Features that send no personal data">
          <Body>
            Writing lessons, practice and exam-style questions, comparison cards, "Quiz me" questions
            and practice scenarios. These are created from the course's published topics and shared
            by everyone studying that course.
          </Body>
        </Sub>
        <Sub title="Training and retention at Anthropic">
          <Body>
            Under Anthropic's commercial terms, Anthropic may not train its models on what we send.
            Anthropic says it deletes these inputs and outputs from its systems within 30 days, but
            may keep them longer where the law requires or to enforce its usage policy (up to 2 years
            for content its safety systems flag).
          </Body>
        </Sub>
        <Sub title="What we keep">
          <Body>
            We keep your answers, the feedback and your coach conversations with your account, as
            described in section 6. For each AI request we also log counts only — which feature, how
            many tokens, how long it took, whether it worked — never the text.
          </Body>
        </Sub>
      </Section>

      <Section title="6. How long we keep it">
        <Body>
          Account and study data (including answers, coach conversations, milestones and exam
          results) for as long as your account is open. Deleting your account removes your profile,
          study history, milestones, exam results, support requests and MFA credentials.
        </Body>
        <Body>
          Short-lived tokens stop working after they expire (hours to a day), but the expired
          records are not yet purged automatically; they are deleted with your account.
        </Body>
        <Body>
          Sign-in and rate-limit records (the email address or account ID used, IP address and
          time) and the AI request counts in section 5 are kept after an account is deleted, with
          the link to the account removed. We don't yet purge them on a schedule. [Retention period
          to confirm.]
        </Body>
      </Section>

      <Section title="7. Your controls">
        <Body>
          From Account settings you can change your email or password, view and revoke active
          sessions, manage or remove two-factor methods, export your data (including milestones,
          exam results and which terms you agreed to), or delete your account — all without
          contacting us. You can change or delete a reported exam result at any time, and turn study
          reminders off in Settings. If you'd rather ask us directly, or have a question this page
          doesn't answer: [privacy contact email to confirm].
        </Body>
      </Section>

      <Divider style={{ marginTop: spacing.xl }} />
      <Section title="8. Changes to this policy">
        <Body>
          If this policy changes in a material way, we'll update the date above and ask you to
          agree to the new version the next time you open the app.
        </Body>
      </Section>
    </Screen>
  );
}
