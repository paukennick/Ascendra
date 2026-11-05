// REQ-093: the single source for Ascendra's legal and policy text.
//
// Every legal page renders from here, so the Terms, the Disclaimer summary
// and the sign-up consent can never drift apart. Each document carries a
// version; the backend (backend/lib/legal.ts) holds the same versions and
// asks a user to accept again when the Terms or Privacy version changes.
// Bump a version when meaning changes, not for a typo.
//
// Every statement about data must match what the code does. The inventory
// behind these pages is docs/legal/data-inventory.md -- change both together.
//
// Items in [square brackets] are owner decisions not yet made. They render
// visibly on purpose: a placeholder that looks finished is worse than one
// that looks unfinished. Nothing here has had legal review yet.

export interface LegalSection {
  title: string;
  /** Each string is one paragraph. Lines starting with "• " render as bullets. */
  body: string[];
}

export interface LegalDoc {
  title: string;
  version: string;
  /** Human-readable date for the version. */
  updated: string;
  /** Shown under the title until legal review signs the text off. */
  status: string;
  intro?: string;
  sections: LegalSection[];
}

const DRAFT = "Draft for legal review — not yet reviewed by a lawyer.";

// Owner decisions still open. Kept in one place so each is filled in once.
export const OWNER = {
  operator: "[Operator: legal name of the business or person running Ascendra]",
  contactEmail: "[Contact email for support, privacy and legal requests]",
  governingLaw: "[State or country whose law governs these terms]",
  minimumAge: "[Minimum age to create an account]",
};

export const TERMS: LegalDoc = {
  title: "Terms of Service",
  version: "2026-11-04",
  updated: "November 4, 2026",
  status: DRAFT,
  intro:
    "These terms are the agreement between you and Ascendra's operator when you use Ascendra on the web or in the app. Please read them; creating an account means you accept them.",
  sections: [
    {
      title: "1. What Ascendra is",
      body: [
        "Ascendra is a self-study tool for exam preparation and coursework. It presents lessons, practice questions, performance-based scenarios, an AI study coach and progress tracking so you can gauge your own readiness.",
        "Lessons, practice questions, feedback and coach replies are written by an AI model (see the Disclaimer). Course outlines are built from published exam blueprints and openly licensed textbooks, as described on the Sources & Trademarks page.",
      ],
    },
    {
      title: "2. Who can use it",
      body: [
        `You must be at least ${OWNER.minimumAge} to create an account. If you are under the age of majority where you live, a parent or guardian must agree to these terms on your behalf.`,
        "One person per account. Keep your sign-in details to yourself.",
      ],
    },
    {
      title: "3. Not affiliated with any certification or licensing body",
      body: [
        "Ascendra is independent. It is not produced, endorsed or sponsored by, or affiliated with, any certification, licensing, examination or accrediting body named in its courses. Exam and credential names belong to their owners and are used only to describe what a course covers.",
        "Completing a course, reaching a mastery level or answering practice questions correctly does not guarantee that you will pass an exam, earn a credential or get any grade. Practice questions are written to resemble an exam's style and coverage; they are not taken from any real exam.",
      ],
    },
    {
      title: "4. Study material, not professional advice",
      body: [
        "Everything in Ascendra is study material. It is not medical, nursing, clinical, legal, financial or other professional advice, and it can be wrong. Courses for health professions are exam preparation only and must never be used to make decisions about a real patient; those courses ask you to acknowledge this before you start.",
      ],
    },
    {
      title: "5. Your account",
      body: [
        "You are responsible for the information you give us, for keeping your password and any signed-in device secure, and for activity under your account. Tell us at once if you think someone else has used it.",
        "You can export your data or delete your account at any time from Account settings.",
      ],
    },
    {
      title: "6. Acceptable use",
      body: [
        "Don't:",
        "• copy, scrape, resell or redistribute Ascendra's content;",
        "• try to get around sign-in, access or rate limits, or interfere with the service;",
        "• upload unlawful or infringing material, or other people's personal or patient information, including into the AI coach or a support request;",
        "• use the AI coach to produce content that breaks the law or the AI provider's usage policies.",
        "We may suspend or close an account that breaks these rules.",
      ],
    },
    {
      title: "7. Content ownership",
      body: [
        "Ascendra's software, course structure and generated content belong to its operator. You may use them for your own study. Openly licensed source material keeps its own licence (see Sources & Trademarks).",
        "What you write — answers, coach messages, support requests — stays yours. You let us store and process it to run the service, as described in the Privacy Policy.",
      ],
    },
    {
      title: "8. Reporting problems",
      body: [
        "If a lesson, question or answer looks wrong, use “Report a problem” on the lesson, or submit a ticket from Support. Reports about health content are reviewed first.",
      ],
    },
    {
      title: '9. Provided "as is"',
      body: [
        'The service and everything in it is provided "as is" and "as available", without warranties of any kind, express or implied, including accuracy, completeness and fitness for a particular exam or purpose.',
      ],
    },
    {
      title: "10. Limitation of liability",
      body: [
        "To the extent the law allows, Ascendra's operator is not liable for indirect, incidental or consequential damages arising from your use of the service, including exam outcomes, lost study time or lost data. Nothing here limits liability that cannot legally be limited.",
      ],
    },
    {
      title: "11. Changes",
      body: [
        "We may update these terms as the product changes. When the meaning changes, the date above changes and you will be asked to accept the new version the next time you open Ascendra.",
      ],
    },
    {
      title: "12. Governing law and contact",
      body: [
        `These terms are governed by the laws of ${OWNER.governingLaw}, without regard to conflict-of-law rules.`,
        `Operator: ${OWNER.operator}. Contact: ${OWNER.contactEmail}, or Support in the app.`,
      ],
    },
  ],
};

export const PRIVACY: LegalDoc = {
  title: "Privacy Policy",
  version: "2026-11-04",
  updated: "November 4, 2026",
  status: DRAFT,
  intro:
    "This policy explains what Ascendra stores about you, why, who else handles it, how long it is kept, and what you can do about it. It describes what the app actually does today.",
  sections: [
    {
      title: "1. What we collect",
      body: [
        "• Account: email address, optional display name, optional profile photo, and a hashed password (never the password itself). If you sign in with Google, the Google account's ID and email address.",
        "• Security: two-factor settings and backup codes (stored hashed or encrypted); signed-in sessions with device name, browser or app details and IP address; a log of sign-in and security events with time and IP address; short-lived codes for verifying email, resetting passwords and confirming changes.",
        "• Study activity: the courses you add or favourite, your answers to practice questions, mastery scores, review schedule, study sessions, and which course disclaimers you accepted.",
        "• AI coach: the messages you send the coach and its replies.",
        "• Support: tickets, course requests and problem reports you send, and our replies.",
        "• Agreements: which versions of these terms and this policy you accepted, and when.",
      ],
    },
    {
      title: "2. What we don't collect",
      body: [
        "No advertising or cross-site tracking, no analytics or crash-reporting trackers, and no sale or sharing of personal data for advertising. Biometric unlock is handled entirely by your device's operating system; Ascendra only learns whether it succeeded.",
      ],
    },
    {
      title: "3. Why we use it",
      body: [
        "• To run your account and keep it secure: sign-in, two-factor checks, the session list, and spotting abuse.",
        "• To teach: tracking progress, choosing what to show next, grading answers and running the AI coach.",
        "• To answer support requests and fix reported content.",
        "• To send account email: verification, password resets and security alerts. We don't send marketing email.",
      ],
    },
    {
      title: "4. Who handles it for us",
      body: [
        "We don't sell your data. These companies process it on our behalf, under their own terms. Because some are in the United States, your data may be processed there as well as in Canada:",
        "• Supabase — hosts the database holding everything above, in Canada.",
        "• Vercel — runs the website and the server the app talks to, in the United States.",
        "• Anthropic (United States) — runs the AI model. It receives the text needed for each request: your coach messages and recent coach history, written answers sent for grading, your pre-lesson guess, and answers in practice scenarios, together with the lesson or course they relate to. Lesson generation sends only the course and objective titles, not anything about you. Under Anthropic's commercial terms, API data is not used to train its models and is deleted within 30 days unless kept longer to enforce its usage policy or meet a legal duty.",
        "• Resend — sends account email, and delivers support requests to our inbox with your email address.",
        "• Expo — delivers app updates to the mobile app.",
        "• Google — only if you choose to sign in with Google.",
      ],
    },
    {
      title: "5. How long we keep it",
      body: [
        "• Account, study, coach and support data: while your account is open.",
        "• Sign-in and security event log: 90 days.",
        "• Ended or expired sessions: 30 days after they end.",
        "• Used or expired one-time codes: 7 days after they expire.",
        "Deleting your account removes everything listed in section 1 from our database straight away, including the sign-in log. Copies held elsewhere follow their own schedules: the AI provider within 30 days (as above), and the copy of any support request emailed to our support inbox until we delete it.",
      ],
    },
    {
      title: "6. Your choices and rights",
      body: [
        "From Account settings you can change your email or password, see and sign out of sessions, manage two-factor methods, download a copy of your data, or delete your account — without contacting us.",
        `For anything else — correcting data, objecting to a use, or a question this page doesn't answer — contact ${OWNER.contactEmail}. Depending on where you live, you may also have the right to complain to a data-protection authority.`,
      ],
    },
    {
      title: "7. Children",
      body: [
        `Ascendra is not meant for children under 13 and doesn't knowingly collect their data. Accounts require a minimum age of ${OWNER.minimumAge}. If you think a child has created an account, contact us and we will delete it.`,
      ],
    },
    {
      title: "8. Security",
      body: [
        "Passwords and backup codes are hashed and two-factor secrets are encrypted. In the app, sign-in tokens are kept in your device's secure storage; on the web, in browser storage that is cleared when you close the browser. The database's public data interface is switched off, so it can only be reached with our server's private credentials. No system is perfectly secure; if a breach affects your data, we will tell you as the law requires.",
      ],
    },
    {
      title: "9. Changes to this policy",
      body: [
        "When the meaning of this policy changes, the date above changes and you will be asked to accept the new version the next time you open Ascendra.",
        `Operator: ${OWNER.operator}. Contact: ${OWNER.contactEmail}.`,
      ],
    },
  ],
};

export const COOKIES: LegalDoc = {
  title: "Cookies & Device Storage",
  version: "2026-11-04",
  updated: "November 4, 2026",
  status: DRAFT,
  sections: [
    {
      title: "What we store on your device",
      body: [
        "Ascendra uses no advertising, tracking or analytics cookies. It stores only what is needed to keep you signed in:",
        "• In the mobile app: your sign-in token, kept in the operating system's secure storage (iOS Keychain or Android Keystore). If you turn on biometric unlock, a second copy of the token that your device only releases after a fingerprint, face or passcode check, plus a setting that remembers you turned it on.",
        "• On the web: your sign-in token in the browser's session storage, which the browser clears when you close it.",
      ],
    },
    {
      title: "Why there is no consent banner",
      body: [
        "Storage that is strictly necessary to keep you signed in doesn't need a consent banner. If we ever add anything optional, such as analytics, this page and a consent prompt will come first.",
      ],
    },
    {
      title: "Clearing it",
      body: [
        "Signing out removes the stored token. On the web, closing the browser does too; you can also clear the site's data in your browser settings.",
      ],
    },
  ],
};

// Disclaimer sections are the Terms' own, found by heading (without their
// number) so adding a Terms section can't silently swap one out.
function termsSection(heading: string): LegalSection {
  const s = TERMS.sections.find((x) => x.title.includes(heading));
  if (!s) throw new Error(`Terms has no section titled "${heading}"`);
  return { ...s, title: s.title.replace(/^\d+\.\s*/, "") };
}

export const DISCLAIMER: LegalDoc = {
  title: "Disclaimer",
  version: "2026-11-04",
  updated: "November 4, 2026",
  status: DRAFT,
  intro: "A summary of terms already in the Terms of Service, kept here so it is easy to find. It is not a separate agreement.",
  sections: [
    termsSection("Not affiliated"),
    termsSection("Study material"),
    {
      title: "AI-written lessons",
      body: [
        "Lessons, practice questions, explanations, grading feedback and coach replies are written by an AI model. Course outlines come from published exam blueprints and reviewed open textbooks, but the lesson text itself is not reviewed by a person before you see it, and it can contain mistakes. Check anything important against your course materials, an official source or your instructor, and report errors with “Report a problem”.",
      ],
    },
    termsSection("Provided"),
    termsSection("Limitation of liability"),
  ],
};

// Every credential provider in the catalog (credential_providers table,
// checked 2026-11-04), with the marks used in course names. Add a line when a
// course from a new provider is added.
const CREDENTIAL_OWNERS = [
  "AACN Certification Corporation and the American Association of Critical-Care Nurses (CCRN)",
  "Amazon Web Services (AWS Certified)",
  "American Association of Colleges of Nursing (The Essentials)",
  "American Board of Physical Therapy Specialties (ABPTS)",
  "American College of Sports Medicine (ACSM)",
  "American Council on Exercise (ACE)",
  "Centers for Medicare & Medicaid Services",
  "Commission on Accreditation for Health Informatics and Information Management Education (CAHIIM)",
  "Commission on Accreditation in Physical Therapy Education (CAPTE)",
  "CompTIA",
  "Federation of State Boards of Physical Therapy (FSBPT, NPTE)",
  "Google Cloud",
  "Microsoft (Azure)",
  "National Academy of Sports Medicine (NASM)",
  "National Council for Certified Personal Trainers (ISSA)",
  "National Council of State Boards of Nursing (NCSBN, NCLEX)",
  "National Strength and Conditioning Association (NSCA)",
  "Project Management Institute (PMI, PMP, CAPM)",
];

export const SOURCES: LegalDoc = {
  title: "Sources & Trademarks",
  version: "2026-11-04",
  updated: "November 4, 2026",
  status: DRAFT,
  sections: [
    {
      title: "How courses are built",
      body: [
        "Each course follows the official exam blueprint, test plan or accreditation standard for its credential. Depth comes from openly licensed textbooks and from government, standards-body and clinical-guideline sources, held to a written reliability standard: where sources disagree, the current official guideline decides, and values no guideline settles are left out. Objectives are written in our own words; no source text is copied. The sources for each course are recorded with the course.",
      ],
    },
    {
      title: "Trademarks",
      body: [
        "Exam, credential and organisation names used to describe courses are trademarks of their owners. Ascendra is not affiliated with, sponsored by or endorsed by any of them, including:",
        ...CREDENTIAL_OWNERS.map((o) => `• ${o}`),
      ],
    },
    {
      title: "Open textbooks",
      body: [
        "Course depth draws on openly licensed material, used under its licence for facts and topic structure only:",
        "• OpenStax (Rice University) nursing, anatomy and physiology texts — CC BY or CC BY-NC-SA 4.0.",
        "• Open RN (Chippewa Valley Technical College) nursing texts — CC BY 4.0.",
        "• StatPearls (NCBI Bookshelf) — CC BY-NC-ND 4.0.",
        "• Springer open-access books and other university open textbooks named in each course's sources.",
      ],
    },
  ],
};

export const ABOUT: LegalDoc = {
  title: "About Ascendra",
  version: "2026-11-04",
  updated: "November 4, 2026",
  status: "",
  sections: [
    {
      title: "What it's for",
      body: [
        "Ascendra helps people prepare for certification and licensing exams and work through degree-level coursework — nursing, critical care, physical therapy, health informatics, cloud, cybersecurity and project management — on the web and on their phone.",
      ],
    },
    {
      title: "How it teaches",
      body: [
        "Each objective runs the same loop: you guess first, then read a short explanation, then work a guided problem, then solve one on your own. Answers set a mastery level, and missed questions come back for review after 1, 7 and 21 days. An AI coach answers questions about the material you're studying.",
      ],
    },
    {
      title: "Where the content comes from",
      body: [
        "Course outlines follow official exam blueprints and accreditation standards, deepened from reviewed open textbooks and official guidelines (see Sources & Trademarks). Lessons themselves are written by AI from those outlines, so they can be wrong — report anything that looks off and it will be fixed.",
      ],
    },
    {
      title: "Who runs it",
      body: [`${OWNER.operator}. Contact ${OWNER.contactEmail}, or use Support in the app.`],
    },
  ],
};

export const FAQ: LegalDoc = {
  title: "FAQ",
  version: "2026-11-04",
  updated: "November 4, 2026",
  status: "",
  sections: [
    {
      title: "What is Ascendra?",
      body: [
        "A self-study companion for exam prep and coursework. Each objective runs a guess → teach → guided practice → solo loop, mastery is tracked per objective, missed questions come back for spaced review, and some courses include a performance-based question simulator.",
      ],
    },
    {
      title: "Is Ascendra affiliated with any certification or licensing body?",
      body: [
        "No. Ascendra is independent and is not endorsed by NCSBN, AACN, FSBPT, CompTIA, AWS, Microsoft, Google, PMI or any other body named in its courses. See Sources & Trademarks.",
      ],
    },
    {
      title: "Who writes the lessons?",
      body: [
        "An AI model writes each lesson from the course objective, and the objectives come from official exam outlines and reviewed open textbooks. Lessons are not checked by a person before you see them, so they can be wrong — use “Report a problem” on any lesson that looks off.",
      ],
    },
    {
      title: "Can I use the clinical courses at work?",
      body: [
        "No. Nursing, critical-care and physical therapy courses are exam preparation only. Follow your licence, your employer's policies and current references at the bedside.",
      ],
    },
    {
      title: "Do I need a separate account for the web and the app?",
      body: ["No — the same account works on both, and progress is shared."],
    },
    {
      title: "How does mastery work?",
      body: [
        "Each answer moves an objective's mastery level. Multiple-choice answers can take an objective up to Guided; a correct written answer is what reaches Independent. Missed questions come back for review after 1, 7 and 21 days.",
      ],
    },
    {
      title: "Can I turn on two-factor authentication?",
      body: ["Yes — in Settings, with an authenticator app or email codes. Each method gives you one-time backup codes."],
    },
    {
      title: "How do I export or delete my data?",
      body: [
        "Both are in Account: “Export my data” downloads everything tied to your account, and the Danger Zone deletes it permanently. The Privacy Policy explains what deletion removes.",
      ],
    },
    {
      title: "Why did I get signed out?",
      body: [
        "On the web, closing the browser signs you out, and an idle tab signs out after 30 minutes. In the app, closing it signs you out unless biometric unlock is on, in which case it locks instead.",
      ],
    },
    {
      title: "Something in a lesson looks wrong",
      body: [
        "Tap “Report a problem” on the lesson. Reports about health content are reviewed first, and a wrong lesson is removed and rewritten. You can follow your report under Support.",
      ],
    },
  ],
};

export const LEGAL_DOCS = { terms: TERMS, privacy: PRIVACY, cookies: COOKIES, disclaimer: DISCLAIMER, sources: SOURCES, about: ABOUT, faq: FAQ };
