import { View } from "react-native";
import { Screen, H1, H2, Body, Muted, Divider } from "@/components/ui";
import { spacing } from "@/lib/theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
      <H2>{title}</H2>
      {children}
    </View>
  );
}

export default function Terms() {
  return (
    <Screen>
      <H1>Terms of Service & Disclaimer</H1>
      <Muted style={{ marginTop: spacing.xs }}>
        Draft — last updated September 17, 2026. This is a starting point for legal review, not
        finished legal advice; the bracketed items still need an owner to fill in.
      </Muted>

      <Section title="1. What Ascendra is">
        <Body>
          Ascendra is a self-study exam-preparation and coursework tool. It presents lessons,
          practice questions (including performance-based scenarios modeled on exams such as
          CompTIA Security+), and progress tracking so you can gauge your own readiness.
        </Body>
      </Section>

      <Section title="2. Not affiliated with, and not a guarantee from, any certification body">
        <Body>
          Ascendra is an independent study aid. It is not produced, endorsed, sponsored, or
          affiliated with CompTIA or any other certification, examination, or accrediting body
          named or implied by its course content. Certification and exam names are the property
          of their respective owners and are used only to describe what a course covers.
        </Body>
        <Body>
          Completing a course, reaching a mastery score, or answering practice questions correctly
          does not guarantee you will pass any exam, earn any certification, or achieve any
          particular grade. Practice content is written to resemble real exam style and coverage,
          but it is not sourced from, and is not a copy of, any live exam.
        </Body>
      </Section>

      <Section title='3. "As is," no professional guarantee'>
        <Body>
          The service, and everything in it — lessons, questions, explanations, the AI study
          coach, and mastery/progress figures — is provided "as is" and "as available," without
          warranty of any kind, express or implied, including accuracy, completeness, or fitness
          for a particular exam or purpose. Content may contain errors; report anything that looks
          wrong so it can be fixed, but treat every answer explanation as study material, not as
          verified professional, legal, or exam-authoritative guidance.
        </Body>
      </Section>

      <Section title="4. Your account">
        <Body>
          You're responsible for the accuracy of the information you give us, for keeping your
          password and any device you leave signed in secure, and for the activity that happens
          under your account. Tell us right away if you believe your account has been accessed
          without your permission.
        </Body>
        <Body>
          You can export your data or delete your account at any time from Account settings. See
          the Privacy Policy for what deleting your account does and doesn't remove.
        </Body>
      </Section>

      <Section title="5. Acceptable use">
        <Body>
          Don't use Ascendra to scrape, resell, or redistribute its course content; attempt to
          bypass account, billing, or access controls; upload unlawful or infringing material
          (including into the AI study coach); or interfere with the service for other users.
        </Body>
      </Section>

      <Section title="6. Limitation of liability">
        <Body>
          To the extent the law allows, Ascendra and its operators aren't liable for indirect,
          incidental, or consequential damages arising from your use of the service, including
          exam outcomes, lost study time, or lost data. Nothing here limits liability that can't
          legally be limited.
        </Body>
      </Section>

      <Section title="7. Changes">
        <Body>
          We may update these terms as the product changes. Material changes will be reflected
          here with a new "last updated" date; continued use after a change means you accept the
          update.
        </Body>
      </Section>

      <Divider style={{ marginTop: spacing.xl }} />
      <Section title="8. Governing law & contact">
        <Body>
          These terms are governed by the laws of [jurisdiction — state/country to confirm],
          without regard to conflict-of-law rules. Questions about these terms: [support/legal
          contact email to confirm].
        </Body>
      </Section>
    </Screen>
  );
}
