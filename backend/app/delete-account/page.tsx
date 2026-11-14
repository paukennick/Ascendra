// REQ-094: public account-deletion page for the Google Play listing. Play
// requires a web URL where people can learn how to delete their account and
// data without reinstalling the app. Plain server-rendered HTML so it works
// with no JavaScript and no sign-in.
//
// What deletion removes must match docs/legal/data-inventory.md and the
// Privacy Policy (mobile/src/content/legal.ts).
import { supportEmail } from "@/lib/support-contact";
import { RETENTION } from "@/lib/retention";

export const metadata = {
  title: "Delete your Ascendra account",
  description: "How to delete your Ascendra account and the data stored with it.",
};

export default function DeleteAccountPage() {
  // REQ-205: SUPPORT_EMAIL overrides the default address (lib/support-contact.ts);
  // the page never shows a placeholder.
  const contact = supportEmail();
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 640, lineHeight: 1.5 }}>
      <h1>Delete your Ascendra account</h1>

      <h2>In the app (fastest)</h2>
      <ol>
        <li>Sign in to Ascendra on your phone or at this website.</li>
        <li>Open <strong>Account</strong>.</li>
        <li>Under <strong>Danger zone</strong>, choose <strong>Delete account</strong> and confirm it&apos;s you: your password, or, for an account without one, Google or a code.</li>
      </ol>
      <p>Your account is deleted immediately. If you want a copy of your data first, use <strong>Export my data</strong> on the same screen.</p>

      <h2>Without the app</h2>
      <p>
        Email <strong>{contact}</strong> from the address on your account and ask for it to be deleted. We will confirm
        and delete it within 30 days.
      </p>

      <h2>What is deleted</h2>
      <ul>
        <li>Your profile: email address, display name, photo and password.</li>
        <li>Sign-in data: sessions, two-factor settings and backup codes, linked Google sign-in, and the sign-in log.</li>
        <li>Study data: courses you added, favorites, your study profile, answers (lessons, reviews, practice exams, labs and sims), mastery scores, review schedule, study sessions and any exam results you reported.</li>
        <li>AI coach conversations, support requests and lesson reports.</li>
        <li>The note you wrote on any question you reported.</li>
        <li>Records of which terms, policies and study notice you accepted (and any older course disclaimers), that you confirmed your age, the date of birth you gave for mental health courses, and each 18+ acknowledgment you made for a mental health course.</li>
      </ul>

      <h2>What is kept, and for how long</h2>
      <ul>
        <li>
          AI request counts (which feature, how many tokens, how long it took, whether it worked; never the text),
          with the link to your account removed: {RETENTION.aiCallsMonths} months after each request, then deleted.
        </li>
        <li>
          The record that a question was reported (the question, the reason chosen and the date), with your note
          erased and no link to you: kept with no end date so the fix is not lost. It holds nothing about you.
        </li>
        <li>
          Backups already made: the encrypted nightly backups for at most 30 days after you delete your account, and
          copies we make inside our database before a major update for at most 37 days. We delete them as a whole, and
          if we ever restore one we delete the accounts that were deleted after it was made.
        </li>
        <li>Text recently sent to our AI provider is deleted by them within 30 days.</li>
        <li>Error reports sent to Sentry, our error-reporting service, follow Sentry&apos;s own schedule. They hold no account ID or name.</li>
        <li>
          Anonymous page-view and speed figures from the website&apos;s cookieless analytics at Vercel were never linked to
          your account, so there is nothing to find or remove by account; Vercel keeps them under its own schedule.
        </li>
        <li>
          Email you sent to our support address, and copies of support requests emailed to our support inbox, stay
          there until we delete them. There is no fixed period; ask at the address above and we will delete yours.
        </li>
        <li>Billing records: paid plans are not switched on, so there are none.</li>
      </ul>

      <p>
        See the full <a href="/privacy">Privacy Policy</a> for details.
      </p>
    </main>
  );
}
