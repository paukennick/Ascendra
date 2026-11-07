// REQ-119 (Audit 3 product M6): "not affiliated" lines that name the body
// whose exam a course prepares for. The in-app disclaimer only named
// CompTIA, while the catalog uses marks from AWS, Microsoft, Google, PMI,
// NCSBN and others. The course view already returns its exam's provider
// (GET /api/courses/:id -> exam.providerName, lib/exam-blueprint.ts).

export function vendorDisclaimer(
  exam: { providerName?: string | null; credentialName?: string | null } | null | undefined,
  trackType?: string | null
): string | null {
  const provider = exam?.providerName?.trim();
  if (provider) {
    const credential = exam?.credentialName?.trim();
    return (
      `Ascendra is not affiliated with or endorsed by ${provider}. ` +
      `${credential ? `${credential} and other names` : "Exam and certification names"} and trademarks belong to their owners ` +
      "and are used only to say what this course covers."
    );
  }
  if (trackType === "certification") {
    return (
      "Ascendra is not affiliated with or endorsed by the body that runs this exam. " +
      "Exam names and trademarks belong to their owners and are used only to say what this course covers."
    );
  }
  return null;
}

// The bodies named in the current catalog (credential_providers, checked
// against the seeded catalog on 2026-11-07), for the Disclaimer page.
export const TRADEMARK_OWNERS: readonly string[] = [
  "CompTIA",
  "Amazon Web Services (AWS)",
  "Microsoft",
  "Google Cloud",
  "Project Management Institute (PMI)",
  "National Council of State Boards of Nursing (NCSBN)",
  "AACN Certification Corporation",
  "American Association of Colleges of Nursing",
  "American Board of Physical Therapy Specialties (ABPTS)",
  "Federation of State Boards of Physical Therapy (FSBPT)",
  "Commission on Accreditation in Physical Therapy Education (CAPTE)",
  "Commission on Accreditation for Health Informatics and Information Management Education (CAHIIM)",
  "Centers for Medicare & Medicaid Services (CMS)",
  "National Strength and Conditioning Association (NSCA)",
  "National Academy of Sports Medicine (NASM)",
  "International Sports Sciences Association (ISSA)",
  "American Council on Exercise (ACE)",
  "American College of Sports Medicine (ACSM)",
];
