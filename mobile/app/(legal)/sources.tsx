// REQ-093: text lives in src/content/legal.ts.
import { LegalPage } from "@/components/LegalPage";
import { SOURCES } from "@/content/legal";

export default function SourcesPage() {
  return <LegalPage doc={SOURCES} />;
}
