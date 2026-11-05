# Google Play listing draft (REQ-094)

Draft answers for the Play Console, written from `docs/legal/data-inventory.md`.
Items in [brackets] are owner decisions. Re-check every Data safety answer
against the inventory before submitting; Google treats a wrong form as a
policy violation.

## Store listing

- **App name:** Ascendra
- **Category:** Education
- **Short description (80 max):** Exam prep that makes you think: guess, learn, practise and review, with an AI coach.
- **Full description:**

  Ascendra is a study companion for certification and licensing exams and degree coursework — nursing (NCLEX-RN, NCLEX-PN, CNA, CCRN), physical therapy (NPTE), health informatics, cloud (AWS, Azure, Google Cloud), CompTIA, project management (PMP, CAPM) and fitness certifications.

  Every objective follows the same loop: take a guess first, read a short explanation, work a guided problem, then solve one on your own. Your answers set a mastery level for each objective, and anything you miss comes back for review after 1, 7 and 21 days. An AI coach answers questions about what you are studying.

  Courses follow each exam's official outline, deepened from reviewed open textbooks and official guidelines. Lessons are written by AI and can contain mistakes — report anything that looks wrong from the lesson itself.

  Health courses are exam preparation only, not clinical guidance. Ascendra is independent and is not affiliated with or endorsed by any certification or licensing body.

- **Graphics still needed:** 512×512 icon (from `mobile/assets/icon.png`), 1024×500 feature graphic, 2–8 phone screenshots (lesson, guided question, mastery, review, coach).
- **Contact email:** [developer contact email]
- **Privacy policy URL:** https://backend-mauve-mu-18.vercel.app/privacy (only correct once PR #9 is merged, the web export is refreshed and the backend redeployed)
- **Account deletion URL:** https://backend-mauve-mu-18.vercel.app/delete-account

## App content

- **Ads:** No.
- **Target audience:** [depends on minimum age]. If 18+ only, select 18+. If 16–17 are allowed (CNA students), the app is not "designed for children" but the families policy questions apply to the under-18 band.
- **Content rating:** Education/reference; no violence, sexual content, gambling or user-to-user communication. The AI coach is a generative-AI feature — answer the questionnaire's AI question "yes".
- **Health apps declaration:** if prompted, the app provides health education and exam preparation, not medical advice, diagnosis or treatment.
- **Government / financial / news:** No.

## Data safety

**Is data encrypted in transit?** Yes (HTTPS only).
**Can users request deletion?** Yes — in the app (Account → Delete account) and at the deletion URL.
**Is any data shared with third parties?** No. Processors acting for us (Supabase, Vercel, Anthropic, Resend, Expo, Google sign-in) are not "sharing" under Play's definition.

| Play data type | Collected | Required? | Purpose |
|---|---|---|---|
| Personal info → Email address | Yes | Required | Account management, App functionality, Developer communications |
| Personal info → Name | Yes (display name) | Optional | App functionality |
| Personal info → User IDs | Yes (account ID; Google account ID if linked) | Required | Account management |
| Photos and videos → Photos | Yes (profile photo) | Optional | App functionality |
| App activity → App interactions | Yes (answers, progress, study sessions) | Required | App functionality, Personalization |
| App activity → Other user-generated content | Yes (coach messages, written answers, support requests, lesson reports) | Optional | App functionality |
| Device or other IDs | Yes (IP address and device/browser name in session and sign-in logs) | Required | Fraud prevention, security, and compliance |
| App info and performance | No (no crash reporting or analytics) | — | — |
| Location, contacts, audio, health info, financial, messages, calendar, files | No | — | — |

Notes:
- Coach messages and written answers are sent to Anthropic for processing; under its commercial terms they are not used for training and are deleted within 30 days.
- Biometric unlock is performed by the operating system; no biometric data is collected.
- Data is processed ephemerally? No — most is stored while the account is open (see retention in the Privacy Policy).

## Before the first upload

1. Merge PRs #5–#10 in order, set `CRON_SECRET`, deploy the backend.
2. Fill the legal placeholders (operator, contact email, governing law, minimum age) and bump `TERMS`/`PRIVACY` versions only if meaning changes.
3. `eas build --platform android --profile production` (build numbers now auto-increment from EAS).
4. Upload to a **closed testing** track; new personal developer accounts need 12+ testers opted in for 14 consecutive days before production access.
5. After Play App Signing is set up, add the Play app-signing key's SHA-1 to the Android OAuth client in Google Cloud, or Google sign-in fails on store installs.
