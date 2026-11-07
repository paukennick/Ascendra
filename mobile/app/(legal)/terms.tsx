// REQ-093: text lives in src/content/legal.ts.
import { LegalPage } from "@/components/LegalPage";
import { TERMS } from "@/content/legal";

export default function TermsPage() {
  return <LegalPage doc={TERMS} />;
}
