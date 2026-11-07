// REQ-093: text lives in src/content/legal.ts.
import { LegalPage } from "@/components/LegalPage";
import { PRIVACY } from "@/content/legal";

export default function PrivacyPage() {
  return <LegalPage doc={PRIVACY} />;
}
