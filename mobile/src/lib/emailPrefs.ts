// REQ-197: Settings > Email -- the switches for the emails that are not
// about the account itself. Pure half; app/(app)/settings/emails.tsx is the
// screen. The server (GET/PUT /api/account/email-preferences) is the record:
// these choices follow the account to every device and to the web.

export interface EmailPrefs {
  examChanges: boolean;
  examCountdown: boolean;
  weeklyDigest: boolean;
}

export const EMAIL_PREF_ROWS: readonly { key: keyof EmailPrefs; label: string; detail: string }[] = [
  {
    key: "examChanges",
    label: "Exam change notices",
    detail: "Once, when the exam a course you study prepares you for changes its outline: what changes, the date, and what the course did about it.",
  },
  {
    key: "examCountdown",
    label: "Exam countdown",
    detail: "If you set an exam date: 14 days and 3 days before, with your readiness and your three weakest objectives.",
  },
  {
    key: "weeklyDigest",
    label: "Weekly progress digest",
    detail: "A short summary of the week you studied: questions answered and what's due next. Not sent in a week you didn't study.",
  },
];

export const ACCOUNT_EMAILS_NOTE =
  "Account emails (verification, sign-in codes, password resets, security alerts) always arrive and aren't listed here.";
export const UNVERIFIED_NOTE = "Your email address isn't verified yet, so none of these are sent until it is.";
// When the server says a kind is not being sent yet (it ships switched off
// until the Privacy Policy covers it): honest, and the choice still saves.
export const NOT_SENDING_YET = "Not being sent yet. Your choice is saved and applies once it starts.";

export function parseEmailPrefs(raw: unknown): { prefs: EmailPrefs; verified: boolean; sending: EmailPrefs } | null {
  const r = raw as { preferences?: Record<string, unknown>; emailVerified?: unknown; sending?: Record<string, unknown> } | null;
  const p = r?.preferences;
  if (!p || typeof p.examChanges !== "boolean" || typeof p.examCountdown !== "boolean" || typeof p.weeklyDigest !== "boolean") {
    return null;
  }
  return {
    prefs: { examChanges: p.examChanges, examCountdown: p.examCountdown, weeklyDigest: p.weeklyDigest },
    verified: r?.emailVerified === true,
    // An older server without `sending` was sending everything it offered.
    sending: {
      examChanges: r?.sending?.examChanges !== false,
      examCountdown: r?.sending?.examCountdown !== false,
      weeklyDigest: r?.sending?.weeklyDigest !== false,
    },
  };
}
