// REQ-093: text lives in src/content/legal.ts.
import { LegalPage } from "@/components/LegalPage";
import { DISCLAIMER } from "@/content/legal";

export default function DisclaimerPage() {
  return <LegalPage doc={DISCLAIMER} />;
}
