// REQ-113 (Audit 3 mobile L2): groundwork for other languages.
//
// The app has about 870 hard-coded English strings and no translation
// library. Full localisation is a later piece of work; this is the shape it
// will grow from, applied to the screens and messages this change touched
// (exam saving, unit check, Home's review card, the error banner, the study
// plan's date picker):
//   - every string lives in one dictionary, under a stable key;
//   - t(key, params) fills {name} placeholders, so word order can change per
//     language without code changes;
//   - counts go through plural(), so a language with other plural rules
//     gets its own forms (Intl.PluralRules), not English "s" logic in code;
//   - dates and month names come from Intl in the device's locale
//     (src/lib/datePicker.ts), not from code.
// A second language is a second dictionary with the same keys; missing keys
// fall back to English rather than showing a key.

export type Locale = string;

const en = {
  "error.retry": "Try again",
  "error.retryLabel": "Try again: {what}",
  "exam.saveFailed": "Some answers aren't saved yet. Retrying when the connection is back; you can keep going.",
  "exam.saveRetry": "Retry saving now",
  "exam.saving": "Saving your answers...",
  "exam.unsaved.one": "Your answer to question {list} isn't saved yet. Check your connection and try again; your answers are still here.",
  "exam.unsaved.other": "Your answers to questions {list} aren't saved yet. Check your connection and try again; your answers are still here.",
  "exam.leaveUnsaved.title": "Some answers aren't saved",
  "exam.leaveUnsaved.message": "{message} If you leave now, those changes may not be kept.",
  "exam.leaveAnyway": "Leave anyway",
  "exam.stay": "Stay and retry",
  "exam.timeLeft": "Time left {clock}",
  "exam.untimed": "Untimed",
  "unitCheck.title": "Unit check",
  "unitCheck.preparing": "Preparing your unit check...",
  "unitCheck.whatItChecks": "What this checks: {gate}",
  "unitCheck.notYet.title": "Not yet",
  "unitCheck.notYet.message": "Study every objective in this unit first ({studied} of {total} so far).",
  "unitCheck.placeholder": "Answer each part above",
  "unitCheck.answerLabel": "Your answer to the unit check",
  "unitCheck.submit": "Check my answer",
  "unitCheck.correct": "You used this unit somewhere new. That is the goal.",
  "unitCheck.notYetResult": "Useful to know. The parts marked to work on are the ones to revisit.",
  "unitCheck.unscored": "This check wasn't scored part by part, so read the feedback below for what to revisit.",
  "unitCheck.back": "Back to Review",
  "unitCheck.later": "Try a new scenario later",
  "unitCheck.draftKept": "Your answer is saved on this device until you send it.",
  "home.review.title": "Today's review",
  "home.review.forToday": "{count} for today",
  "home.review.unitChecks.one": "1 unit check ready",
  "home.review.unitChecks.other": "{count} unit checks ready",
  "home.review.a11y": "Today's review. {line}. Opens Review.",
  "menu.review": "Review",
  "plan.examDate": "Exam date (optional)",
  "plan.pickDate": "Choose a date",
  "plan.noDate": "No date set",
  "plan.clearDate": "Clear date",
  "date.previousMonth": "Previous month",
  "date.nextMonth": "Next month",
  "date.pick": "Choose this date",
  "date.cancel": "Cancel",
  "date.selected": "{date}, selected",
  "date.unavailable": "{date}, not available",
} as const;

export type MessageKey = keyof typeof en;
type Dictionary = Partial<Record<MessageKey, string>>;

const dictionaries: Record<string, Dictionary> = { en };
let current: Locale = "en";

export function setLocale(locale: Locale): void {
  current = locale;
}
export function registerDictionary(locale: Locale, dict: Dictionary): void {
  dictionaries[locale] = dict;
}

const lang = (locale: Locale) => locale.split(/[-_]/)[0];

export function t(key: MessageKey, params: Record<string, string | number> = {}, locale: Locale = current): string {
  const template = dictionaries[locale]?.[key] ?? dictionaries[lang(locale)]?.[key] ?? en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

// Picks `<key>.one` / `<key>.other` (and any other CLDR category a
// dictionary provides, e.g. ".few") by the locale's plural rules.
export function plural(base: string, count: number, params: Record<string, string | number> = {}, locale: Locale = current): string {
  let category = "other";
  try {
    category = new Intl.PluralRules(locale).select(count);
  } catch {
    category = count === 1 ? "one" : "other";
  }
  const dict = dictionaries[locale] ?? dictionaries[lang(locale)] ?? {};
  const key = (`${base}.${category}` in dict || `${base}.${category}` in en ? `${base}.${category}` : `${base}.other`) as MessageKey;
  return t(key, { count, ...params }, locale);
}
