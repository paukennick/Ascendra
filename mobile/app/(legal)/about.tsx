// REQ-093: text lives in src/content/legal.ts.
import { LegalPage } from "@/components/LegalPage";
import { ABOUT } from "@/content/legal";

export default function AboutPage() {
  return <LegalPage doc={ABOUT} />;
}
