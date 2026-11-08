// REQ-093: text lives in src/content/legal.ts.
import { LegalPage } from "@/components/LegalPage";
import { COOKIES } from "@/content/legal";

export default function CookiesPage() {
  return <LegalPage doc={COOKIES} />;
}
