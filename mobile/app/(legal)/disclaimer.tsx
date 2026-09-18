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

// Same wording as the disclaimer sections of terms.tsx (Terms of Service &
// Disclaimer) -- this page exists so Disclaimer has its own direct link
// (sidebar, home footer) instead of being buried inside the full terms
// page. terms.tsx keeps the full text too, since that's still what
// register.tsx links to for the sign-up consent checkbox.
export default function Disclaimer() {
  return (
    <Screen>
      <H1>Disclaimer</H1>
      <Muted style={{ marginTop: spacing.xs }}>Draft — last updated September 17, 2026.</Muted>

      <Section title="Not affiliated with, and not a guarantee from, any certification body">
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

      <Section title='"As is," no professional guarantee'>
        <Body>
          The service, and everything in it — lessons, questions, explanations, the AI study
          coach, and mastery/progress figures — is provided "as is" and "as available," without
          warranty of any kind, express or implied, including accuracy, completeness, or fitness
          for a particular exam or purpose. Content may contain errors; report anything that looks
          wrong so it can be fixed, but treat every answer explanation as study material, not as
          verified professional, legal, or exam-authoritative guidance.
        </Body>
      </Section>

      <Section title="Limitation of liability">
        <Body>
          To the extent the law allows, Ascendra and its operators aren't liable for indirect,
          incidental, or consequential damages arising from your use of the service, including
          exam outcomes, lost study time, or lost data. Nothing here limits liability that can't
          legally be limited.
        </Body>
      </Section>

      <Muted style={{ marginTop: spacing.lg }}>
        This is a summary of the disclaimer terms already in the full Terms of Service, not a
        separate agreement.
      </Muted>
    </Screen>
  );
}
