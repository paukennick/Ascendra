// REQ-094: public account-deletion page for the Google Play listing. Play
// requires a web URL where people can learn how to delete their account and
// data without reinstalling the app. Plain server-rendered HTML so it works
// with no JavaScript and no sign-in.
//
// What deletion removes must match docs/legal/data-inventory.md and the
// Privacy Policy (mobile/src/content/legal.ts).
export const metadata = {
  title: "Delete your Ascendra account",
  description: "How to delete your Ascendra account and the data stored with it.",
};

export default function DeleteAccountPage() {
  // SUPPORT_EMAIL is the address support requests already go to. Until it is
  // set, the placeholder shows so the page never names a wrong address.
  const contact = process.env.SUPPORT_EMAIL || "[Contact email for support, privacy and legal requests]";
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24, maxWidth: 640, lineHeight: 1.5 }}>
      <h1>Delete your Ascendra account</h1>

      <h2>In the app (fastest)</h2>
      <ol>
        <li>Sign in to Ascendra on your phone or at this website.</li>
        <li>Open <strong>Account</strong>.</li>
        <li>Under <strong>Danger zone</strong>, choose <strong>Delete account</strong> and confirm with your password.</li>
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
        <li>Study data: courses you added, favourites, answers, mastery scores, review schedule and study sessions.</li>
        <li>AI coach conversations, support requests and lesson reports.</li>
        <li>Records of which terms, policies and course disclaimers you accepted.</li>
      </ul>

      <h2>What is kept, and for how long</h2>
      <ul>
        <li>Nothing about you stays in our database after deletion.</li>
        <li>Text recently sent to our AI provider is deleted by them within 30 days.</li>
        <li>Copies of support requests that were emailed to our support inbox stay there until we delete them.</li>
      </ul>

      <p>
        See the full <a href="/privacy">Privacy Policy</a> for details.
      </p>
    </main>
  );
}
