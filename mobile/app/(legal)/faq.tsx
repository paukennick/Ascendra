// REQ-093: text lives in src/content/legal.ts.
import { LegalPage } from "@/components/LegalPage";
import { FAQ } from "@/content/legal";

export default function FaqPage() {
  return <LegalPage doc={FAQ} />;
}
