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
// Merged 2026-11-07 (release/2026-11-07): line B's single source (REQ-093)
// now also carries line A's text -- the Practice labs terms (REQ-125), the
// trademark owners list (REQ-119, M6, from src/lib/vendor.ts), and the
// privacy facts about AI features, learning milestones, exam results and
// on-device study data (REQ-119, H3). Terms and Privacy are a new version,
// so every account is asked to agree once.
//
// Items in [square brackets] are owner decisions not yet made. They render
// visibly on purpose: a placeholder that looks finished is worse than one
// that looks unfinished. Nothing here has had legal review yet.

import { TRADEMARK_OWNERS } from "../lib/vendor";

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
  version: "2026-11-07",
  updated: "November 7, 2026",
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
        "Ascendra is independent. It is not produced, endorsed or sponsored by, or affiliated with, any certification, licensing, examination or accrediting body named in its courses. Exam and credential names and trademarks belong to their owners and are used only to describe what a course covers. Each course page names the body behind its exam, and the Disclaimer and Sources & Trademarks pages list them all.",
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
      // REQ-125: added 2026-11-07 when every lab was made available before
      // expert review. Draft wording for the lawyer, like the rest.
      title: "5. Practice labs",
      body: [
        "Hands-on labs (build, case and self-reported labs) are educational practice for exam preparation. Their people, organisations and cases are fictional; some labs have not yet been reviewed by a subject-matter expert, and any lab may contain errors. Labs are not professional advice of any kind, including medical, nursing, physical-therapy, fitness, legal, security or engineering advice.",
        "Do not rely on a lab, its model answers or its feedback to make real-world decisions, including about a patient, a client, a system or an organisation. Follow your program, your employer's or facility's policies, licensed supervisors and current guidelines. In an emergency, call your local emergency services. If a lab looks wrong, use “Report a problem” on the lab.",
      ],
    },
    {
      title: "6. Your account",
      body: [
        "You are responsible for the information you give us, for keeping your password and any signed-in device secure, and for activity under your account. Tell us at once if you think someone else has used it.",
        "You can export your data or delete your account at any time from Account settings.",
      ],
    },
    {
      title: "7. Acceptable use",
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
      title: "8. Content ownership",
      body: [
        "Ascendra's software, course structure and generated content belong to its operator. You may use them for your own study. Openly licensed source material keeps its own licence (see Sources & Trademarks).",
        "What you write — answers, coach messages, support requests — stays yours. You let us store and process it to run the service, as described in the Privacy Policy.",
      ],
    },
    {
      title: "9. Reporting problems",
      body: [
        "If a lesson, question, lab or answer looks wrong, use “Report a problem” on it, or submit a ticket from Support. Reports about health content are reviewed first.",
      ],
    },
    {
      title: '10. Provided "as is"',
      body: [
        'The service and everything in it is provided "as is" and "as available", without warranties of any kind, express or implied, including accuracy, completeness and fitness for a particular exam or purpose.',
      ],
    },
    {
      title: "11. Limitation of liability",
      body: [
        "To the extent the law allows, Ascendra's operator is not liable for indirect, incidental or consequential damages arising from your use of the service, including exam outcomes, lost study time or lost data. Nothing here limits liability that cannot legally be limited.",
      ],
    },
    {
      title: "12. Changes",
      body: [
        "We may update these terms as the product changes. When the meaning changes, the date above changes and you will be asked to accept the new version the next time you open Ascendra.",
      ],
    },
    {
      title: "13. Governing law and contact",
      body: [
        `These terms are governed by the laws of ${OWNER.governingLaw}, without regard to conflict-of-law rules.`,
        `Operator: ${OWNER.operator}. Contact: ${OWNER.contactEmail}, or Support in the app.`,
      ],
    },
  ],
};

// REQ-119 (Audit 3 product H3) facts kept from line A: the AI section says
// what the code actually sends to Anthropic, and the retention section what
// the code actually keeps. Sources checked 2026-11-07:
//   - Anthropic Commercial Terms of Service, section B ("Anthropic may not
//     train models on Customer Content from Services"), effective
//     June 17, 2025: https://www.anthropic.com/legal/commercial-terms
//   - Anthropic Privacy Center, "How long do you store my organization's
//     data?" (updated July 1, 2026): API inputs and outputs deleted within
//     30 days, longer for Usage Policy enforcement (up to 2 years when
//     flagged) or where the law requires:
//     https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data
// REQ-122 DRAFT [when payments launch]: add to section 4, once
// BILLING_ENABLED is turned on (docs/billing.md, launch checklist), and have
// it reviewed with the auto-renewal and refund terms: "• Apple App Store,
// Google Play and RevenueCat -- if you subscribe in the app: your store
// handles the payment; we receive your plan, its dates and status, never
// your card details. • Stripe -- if you subscribe on the web: Stripe
// handles the payment and your card; we receive your plan, its dates,
// status and a Stripe customer id." Not shown yet: no payment is taken
// while paid plans are off.
export const PRIVACY: LegalDoc = {
  title: "Privacy Policy",
  version: "2026-11-07",
  updated: "November 7, 2026",
  status: DRAFT,
  intro:
    "This policy explains what Ascendra stores about you, why, who else handles it, how long it is kept, and what you can do about it. It describes what the app actually stores and sends today.",
  sections: [
    {
      title: "1. What we collect",
      body: [
        "• Account: email address, optional display name, optional profile photo, and a hashed password (never the password itself). If you sign in with Google, the Google account's ID and email address.",
        "• Security: two-factor settings and backup codes (stored hashed or encrypted); signed-in sessions with device name, browser or app details and IP address; a log of sign-in and security events with time and IP address, used to show your sessions, limit repeated attempts and flag suspicious activity; short-lived codes for verifying email, resetting passwords and confirming changes.",
        "• Study activity: the courses you add or favourite; the lessons, questions, reviews, practice exams, scenarios and labs you've attempted; your answers (including anything you type) and how confident you said you were; the mastery levels, review schedule and study plan calculated from them; study sessions; and which course and lab disclaimers you accepted. If you choose to tell us how a real exam went, the date, the result and any score you enter.",
        "• Learning milestones: a short record of milestones — a lesson started or finished, a review or practice exam done, a placement check finished, the welcome steps completed, an exam result reported — with the time and the course it belongs to. It holds no answer text. We use it, only ourselves, to see whether Ascendra is helping people learn (for example, how many new learners finish a first lesson).",
        "• AI coach: the messages you send the coach and its replies.",
        "• Support: tickets, course requests and problem reports about a lesson, question or lab that you send, with your account email so we can reply, and our replies.",
        "• Agreements: which versions of these terms and this policy you accepted, how (at sign-up or in the app) and when.",
      ],
    },
    {
      title: "2. What we don't collect",
      body: [
        "No advertising or cross-site tracking, no analytics or crash-reporting trackers, and no sale or sharing of personal data for advertising. Biometric unlock is handled entirely by your device's operating system; Ascendra only learns whether it succeeded. Study reminders, if you turn them on, are scheduled on your phone; we don't receive them and use no push service.",
      ],
    },
    {
      title: "3. Why we use it",
      body: [
        "• To run your account and keep it secure: sign-in, two-factor checks, the session list, and spotting abuse.",
        "• To teach: tracking progress, choosing what to show next, grading answers and running the AI coach.",
        "• To check, in aggregate and only ourselves, that Ascendra is actually helping people learn.",
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
        "• Anthropic (United States) — the AI provider (Claude models). What it receives is described in section 5.",
        "• Resend — sends account email, and delivers support requests to our inbox with your email address.",
        "• Expo — delivers app updates to the mobile app.",
        "• Google — only if you choose to sign in with Google.",
      ],
    },
    {
      title: "5. AI features and what they send",
      body: [
        "Some features send text to Anthropic to be processed by an AI model. Your name, email address and account ID are not sent with these requests.",
        "Features that send what you type:",
        "• Ask the coach: your message, the earlier messages in that course's conversation (up to the last 40), the course and unit titles, and a short summary of your weakest topics and recent kinds of mistakes in that course.",
        "• Grading and feedback on written answers: lesson answers you write in your own words, your first guess in a lesson, \"explain it back\" explanations, lab reports, scenario (PBQ) answers, written review answers and unit-check answers. Each is sent with the question and the course material it is graded against.",
        "Features that send no personal data: writing lessons, practice and exam-style questions, comparison cards, \"Quiz me\" questions and practice scenarios. These are created from the course's published topics and shared by everyone studying that course.",
        "Under Anthropic's commercial terms, Anthropic may not train its models on what we send. Anthropic says it deletes these inputs and outputs from its systems within 30 days, but may keep them longer where the law requires or to enforce its usage policy (up to 2 years for content its safety systems flag).",
        "We keep your answers, the feedback and your coach conversations with your account, as described in section 6. For each AI request we also log counts only — which feature, how many tokens, how long it took, whether it worked — never the text.",
      ],
    },
    {
      title: "6. How long we keep it",
      body: [
        "• Account, study (including answers, milestones and exam results), coach and support data: while your account is open.",
        "• Sign-in and security event log: 90 days.",
        "• Ended or expired sessions: 30 days after they end.",
        "• Used or expired one-time codes: 7 days after they expire.",
        "• Email address change requests (so the link we send to your old address can still cancel one): 30 days after they expire.",
        "Deleting your account removes everything listed in section 1 from our database straight away, including the sign-in log. The AI request counts in section 5 are kept after an account is deleted, with the link to the account removed. [Retention period for AI request counts to confirm.] Copies held elsewhere follow their own schedules: the AI provider within 30 days (as above), and the copy of any support request emailed to our support inbox until we delete it.",
      ],
    },
    {
      title: "7. Your choices and rights",
      body: [
        "From Account settings you can change your email or password, see and sign out of sessions, manage two-factor methods, download a copy of your data (including milestones, exam results and which terms you agreed to), or delete your account — without contacting us. You can change or delete a reported exam result at any time, and turn study reminders off in Settings.",
        `For anything else — correcting data, objecting to a use, or a question this page doesn't answer — contact ${OWNER.contactEmail}. Depending on where you live, you may also have the right to complain to a data-protection authority.`,
      ],
    },
    {
      title: "8. Children",
      body: [
        `Ascendra is not meant for children under 13 and doesn't knowingly collect their data. Accounts require a minimum age of ${OWNER.minimumAge}. If you think a child has created an account, contact us and we will delete it.`,
      ],
    },
    {
      title: "9. Security",
      body: [
        "Passwords and backup codes are hashed and two-factor secrets are encrypted. In the app, sign-in tokens are kept in your device's secure storage; on the web, in browser storage that is cleared when you close the browser. The database's public data interface is switched off, so it can only be reached with our server's private credentials. No system is perfectly secure; if a breach affects your data, we will tell you as the law requires.",
      ],
    },
    {
      title: "10. Changes to this policy",
      body: [
        "When the meaning of this policy changes, the date above changes and you will be asked to accept the new version the next time you open Ascendra.",
        `Operator: ${OWNER.operator}. Contact: ${OWNER.contactEmail}.`,
      ],
    },
  ],
};

export const COOKIES: LegalDoc = {
  title: "Cookies & Device Storage",
  version: "2026-11-07",
  updated: "November 7, 2026",
  status: DRAFT,
  sections: [
    {
      title: "What we store on your device",
      body: [
        "Ascendra uses no advertising, tracking or analytics cookies. To keep you signed in it stores:",
        "• In the mobile app: your sign-in token, kept in the operating system's secure storage (iOS Keychain or Android Keystore). If you turn on biometric unlock, a second copy of the token that your device only releases after a fingerprint, face or passcode check, plus a setting that remembers you turned it on.",
        "• On the web: your sign-in token in the browser's session storage, which the browser clears when you close it.",
        "It also keeps your own study work in progress on the device, so nothing is lost if the app closes: unsent answer drafts, your place in a lesson or scenario, and your study reminder settings. Drafts and reminder settings stay on the device; your place in a lesson is also saved to your account so it follows you to another device. Signing out removes all of it from the device.",
      ],
    },
    {
      title: "Why there is no consent banner",
      body: [
        "Storage that is strictly necessary to keep you signed in and keep your own work doesn't need a consent banner. If we ever add anything optional, such as analytics, this page and a consent prompt will come first.",
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
  version: "2026-11-07",
  updated: "November 7, 2026",
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
    termsSection("Practice labs"),
    // REQ-119 (Audit 3 product M6, FAIL-406): the owners of the marks the
    // catalog uses, not only CompTIA (src/lib/vendor.ts TRADEMARK_OWNERS).
    {
      title: "Trademarks",
      body: [
        "Names, exam titles and marks used in Ascendra's courses belong to their owners, including:",
        ...TRADEMARK_OWNERS.map((o) => `• ${o}`),
        "None of them produces, reviews or endorses Ascendra.",
      ],
    },
    termsSection("Provided"),
    termsSection("Limitation of liability"),
  ],
};

// The trademark owners list is src/lib/vendor.ts TRADEMARK_OWNERS (one list
// since the 2026-11-07 merge; line B's CREDENTIAL_OWNERS was folded into it).
export const SOURCES: LegalDoc = {
  title: "Sources & Trademarks",
  version: "2026-11-07",
  updated: "November 7, 2026",
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
        ...TRADEMARK_OWNERS.map((o) => `• ${o}`),
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
  version: "2026-11-07",
  updated: "November 7, 2026",
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
        "Each objective runs the same loop: you guess first, then read a short explanation, then work a guided problem, then solve one on your own. Your answers are evidence for a mastery level, and Today's review brings objectives back on a widening schedule. Some courses add practice exams, scenario questions and hands-on labs. An AI coach answers questions about the material you're studying.",
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
  version: "2026-11-07",
  updated: "November 7, 2026",
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
        "No. Ascendra is independent and is not endorsed by NCSBN, AACN, FSBPT, CompTIA, AWS, Microsoft, Google, PMI or any other body named in its courses; their names and trademarks belong to them. Each course page names the body behind its exam, and the Disclaimer and Sources & Trademarks pages list them all.",
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
        "Each answer is evidence for that objective's mastery level, weighted by the kind of question and by whether you had help (choices on screen, or a question you've seen before, count for less). Independent needs about 70% weighted accuracy; Transfer-ready needs 80% and a second kind of answer on a later day. Objectives you've reached come back in Today's review after 1, 3, 7, 21 and 60 days, and a miss brings a question back sooner.",
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
        "Tap “Report a problem with this lesson” on the lesson, or “Report a problem with this question” under a question you've answered. Reports about health content are reviewed first, and a wrong lesson is removed and rewritten. You can follow a lesson report under Support.",
      ],
    },
  ],
};

export const LEGAL_DOCS = { terms: TERMS, privacy: PRIVACY, cookies: COOKIES, disclaimer: DISCLAIMER, sources: SOURCES, about: ABOUT, faq: FAQ };
