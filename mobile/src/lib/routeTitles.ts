// REQ-206 (FAIL-927): a web page's title is what a screen reader says when it
// loads, what the tab and history show, and what a bookmark is called. expo-router
// turns the automatic title off, so every page was just "Ascendra". This maps
// a path to its title; app/_layout.tsx sets document.title from it on web.

const APP = "Ascendra";

const ROUTES: [RegExp, string][] = [
  [/^\/$/, "My courses"],
  [/^\/login$/, "Log in"],
  [/^\/register$/, "Create account"],
  [/^\/forgot-password$/, "Reset password"],
  [/^\/verify-email-pending$/, "Verify your email"],
  [/^\/mfa-challenge$/, "Two-factor verification"],
  [/^\/lock$/, "Locked"],
  [/^\/explore$/, "Explore courses"],
  [/^\/review$/, "Review"],
  [/^\/review-session$/, "Today's review"],
  [/^\/review-coverage$/, "Terms you know"],
  [/^\/unit-check$/, "Unit check"],
  [/^\/account$/, "Account"],
  [/^\/account\/sessions$/, "Active sessions"],
  [/^\/account\/change-password$/, "Change password"],
  [/^\/account\/change-email$/, "Change email"],
  [/^\/settings$/, "Settings"],
  [/^\/settings\/mfa$/, "Two-factor authentication"],
  [/^\/settings\/reminders$/, "Study reminders"],
  [/^\/settings\/emails$/, "Email"],
  [/^\/settings\/study-profile$/, "Study profile"],
  [/^\/settings\/free-course$/, "Your free course"],
  [/^\/settings\/access$/, "Access"],
  [/^\/settings\/discount$/, "Verified discount"],
  [/^\/plans$/, "Plans"],
  [/^\/support$/, "Support"],
  [/^\/whats-new$/, "What's new"],
  [/^\/agree$/, "Before you continue"],
  [/^\/notice$/, "Before you start"],
  [/^\/welcome$/, "Welcome"],
  [/^\/course\/[^/]+$/, "Course"],
  [/^\/course\/[^/]+\/lesson\/[^/]+$/, "Lesson"],
  [/^\/course\/[^/]+\/explain\/[^/]+$/, "Explain it back"],
  [/^\/course\/[^/]+\/lab\/[^/]+$/, "Lab"],
  [/^\/course\/[^/]+\/labs$/, "Labs"],
  [/^\/course\/[^/]+\/sim\/[^/]+$/, "Simulation"],
  [/^\/course\/[^/]+\/sims$/, "Simulations"],
  [/^\/course\/[^/]+\/pbq$/, "PBQ simulator"],
  [/^\/course\/[^/]+\/chat$/, "Ask the coach"],
  [/^\/course\/[^/]+\/progress$/, "Mastery"],
  [/^\/course\/[^/]+\/history$/, "Answer history"],
  [/^\/course\/[^/]+\/exam$/, "Practice exam"],
  [/^\/course\/[^/]+\/compare$/, "Compare look-alikes"],
  [/^\/course\/[^/]+\/plan$/, "Study plan"],
  [/^\/course\/[^/]+\/placement$/, "Placement check"],
  [/^\/course\/[^/]+\/quiz$/, "Quiz me"],
  [/^\/course\/[^/]+\/outcome$/, "I took the exam"],
  [/^\/about$/, "About"],
  [/^\/cookies$/, "Cookies"],
  [/^\/disclaimer$/, "Disclaimer"],
  [/^\/faq$/, "FAQ"],
  [/^\/privacy$/, "Privacy Policy"],
  [/^\/sources$/, "Sources"],
  [/^\/terms$/, "Terms of Service"],
];

// "<page> | Ascendra"; an unknown path is just "Ascendra".
export function titleForPath(pathname: string): string {
  const path = pathname.split("?")[0].split("#")[0];
  const clean = path.length > 1 ? path.replace(/\/+$/, "") : path || "/";
  const hit = ROUTES.find(([re]) => re.test(clean));
  return hit ? `${hit[1]} | ${APP}` : APP;
}
