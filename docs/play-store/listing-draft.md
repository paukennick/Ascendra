# Google Play listing draft (REQ-094, updated REQ-165)

Draft answers for the Play Console, written from `docs/legal/data-inventory.md`
and re-checked against the code on 2026-11-09 (REQ-165). Items in [brackets]
are owner decisions. Re-check every Data safety answer against the inventory
before submitting; Google treats a wrong form as a policy violation.

## Store listing

- **App name:** Ascendra
- **Category:** Education
- **Short description (80 max):** Exam prep that makes you think: guess, learn, practise and review, with an AI coach.
- **Full description:**

  Ascendra is a study companion for certification and licensing exams and degree coursework — nursing (NCLEX-RN, NCLEX-PN, CNA, CCRN), physical therapy (NPTE), health informatics, cloud (AWS, Azure, Google Cloud), CompTIA, project management (PMP, CAPM) and fitness certifications.

  Every objective follows the same loop: take a guess first, read a short explanation, work a guided problem, then solve one on your own. Your answers set a mastery level for each objective, and anything you miss comes back for review after 1, 7 and 21 days. Hands-on labs let you build something real or work a fictional case step by step. An AI coach answers questions about what you are studying.

  Ascendra is AI-assisted practice material. Courses follow each exam's official outline, deepened from reviewed open textbooks and official guidelines, but lessons, questions, labs and coach replies are written or graded with AI help and can contain mistakes — report anything that looks wrong from where you see it.

  Health courses are exam preparation only, not medical or clinical advice, and their patients and cases are fictional. Ascendra is independent and is not affiliated with or endorsed by any certification or licensing body.

- **Graphics still needed:** 512×512 icon (from `mobile/assets/icon.png`), 1024×500 feature graphic, 2–8 phone screenshots (lesson, guided question, mastery, review, coach, a lab).
- **Contact email:** [developer contact email]
- **Privacy policy URL:** https://www.ascendra-learn.com/privacy (returns 200 as of 2026-11-09; the page is rendered by the app's web export, so check its text in a browser after the backend with this PR is deployed — it must show the 2026-11-09 version)
- **Account deletion URL:** https://www.ascendra-learn.com/delete-account (returns 200 as of 2026-11-09 without sign-in; it lists the in-app steps, an email route, what is deleted and what is kept)

## Target API level

Google Play requires new apps and updates to target Android 16 (API level 36) since 2026-08-31 (extension forms to 2026-11-01 only).

- The app builds with Expo SDK 57 and React Native 0.86.3. Expo's root Gradle plugin (`expo-modules-autolinking` 57.0.13, `ExpoRootProjectPlugin`) takes `compileSdk`/`targetSdk` from React Native's version catalog (`react-native/gradle/libs.versions.toml`: `compileSdk = "36"`, `targetSdk = "36"`, `minSdk = "24"`) unless `android.targetSdkVersion` is set in `gradle.properties`. Nothing in `app.json` sets it (no `expo-build-properties`), so the build targets **API 36** by default. No change was needed.
- Verify on the first store build: the EAS Android build log prints `[ExpoRootProject] Using the following versions: … compileSdk: 36 … targetSdk: 36`, and Play Console → App bundle explorer shows "Target SDK 36".
- Android 15+ targets draw edge to edge (enforced at 36). The coach chat now keeps its message box above the navigation bar; check the other screens on a 3-button-navigation device (see the PR's test list).
- Predictive back stays off (`android.predictiveBackGestureEnabled` defaults to false in SDK 57); the system back still works through React Navigation.

## App content

- **Ads:** No.
- **Target audience:** [depends on minimum age]. If 18+ only, select 18+. If 16–17 are allowed (CNA students), the app is not "designed for children" but the families policy questions apply to the under-18 band.
- **Content rating questionnaire:** Education/reference; no violence, sexual content, gambling or user-to-user communication. Answer **yes** to the generative-AI question: the coach, lesson and question writing, and grading feedback are AI-generated.
- **Generative AI (AI-Generated Content policy):** users can flag AI output without leaving the app — "Report a problem with this lesson" (lessons), the report link after a question or lab result (questions and labs), and, new in REQ-165, **Report** under each coach reply (files a Support ticket that quotes the reply). Reports reach a person (`docs/support-process.md`) and feed the content review queue. The coach has safety guardrails (`backend/lib/coach-guard.ts`). [Confirm who reads reports and how fast.]
- **Health apps declaration:** suggested answer: **Medical → Medical Reference and Education** only. Wording if asked: "Ascendra is exam preparation for health-profession certification and licensing exams (nursing, critical care, physical therapy, fitness). It includes practice questions and practice labs built around fictional patients and clients. It does not provide diagnosis, treatment, clinical decision support or medical advice, collects no health data about users, and is not a medical device. Every user accepts a notice before use that the content is practice material, may contain errors, is not medical or clinical advice and must never be used for decisions about real patients or clients; health courses and clinical labs can't be used until it is accepted." Do **not** tick Clinical Decision Support, Physical Therapy and Rehabilitation or Activity and Fitness: those describe apps used for care or tracking, which this is not. [Owner to confirm.]
- **Government / financial / news:** No.

## Data safety

**Is data encrypted in transit?** Yes (HTTPS only).
**Can users request deletion?** Yes — in the app (Account → Delete account) and at the deletion URL.
**Is any data shared with third parties?** Suggested: **No**. Supabase, Vercel, Anthropic, Resend, Expo and Google sign-in act as service providers processing data on our behalf, which Play's definition does not count as sharing. Anthropic is the one to watch: under its commercial terms it may not train on what we send and deletes it within 30 days (longer only for legal or usage-policy reasons). Since Play's July 2026 clarification the User Data policy explicitly covers third-party AI integrations, so the app now shows that disclosure in-app on its own page before first use (below). [Owner decision: to be conservative you can declare Anthropic as "shared". If you do, list only the data types actually sent (App activity → Other user-generated content, and App interactions for the weak-topic summary), purpose App functionality. No name, email or account ID is sent.]

| Play data type | Collected | Required? | Purpose |
|---|---|---|---|
| Personal info → Email address | Yes (account email; also an address the owner grants unrestricted access to, before it has an account) | Required | Account management, App functionality, Developer communications |
| Personal info → Name | Yes (display name) | Optional | App functionality |
| Personal info → User IDs | Yes (account ID; Google account ID if linked) | Required | Account management |
| Photos and videos → Photos | Yes (profile photo) | Optional | App functionality |
| App activity → App interactions | Yes (answers, progress, study sessions, lab runs, learning milestones) | Required | App functionality, Analytics (first-party milestones only), Personalization |
| App activity → Other user-generated content | Yes (coach messages, written answers, lab answers and lab reports, support requests, lesson/question/lab/coach-reply reports) | Optional | App functionality |
| Device or other IDs | Yes (IP address and device/browser name in session and sign-in logs) | Required | Fraud prevention, security, and compliance |
| App info and performance | No (no crash reporting or analytics SDKs) | — | — |
| Financial info → Purchase history | No while paid plans are off. [When `BILLING_ENABLED` is turned on: Yes — plan, dates and status via RevenueCat/Google Play Billing; update this row and the Privacy Policy first.] | — | — |
| Location, contacts, audio, health info, messages, calendar, files | No | — | — |

Notes:
- Coach messages and written answers (including graded lab-step answers) are sent to Anthropic for processing; the in-app study notice says so on its own page before first use, with a link to the Privacy Policy.
- Health info: **No.** Clinical labs use fictional patients; the app asks people not to enter real patient details. Nothing asks for the user's own health.
- Content-review signals (`content_review_queue`) are computed from answers already listed above; no new data type.
- Unrestricted access (`account_access`, migration 056): the grantee's email, who granted it, dates and a note; covered by Email address above and by Privacy Policy section 1.
- Biometric unlock is performed by the operating system; no biometric data is collected.
- Study reminders are scheduled on the device; no push tokens are collected.
- Data is processed ephemerally? No — most is stored while the account is open (see retention in the Privacy Policy).

## In-app disclosure and consent (User Data policy)

The **study notice** (REQ-165) is shown at first launch, after the Terms and Privacy Policy and before first run, and again only when its wording changes:

1. Page 1, content disclaimer: AI-assisted practice material for exam preparation covering lessons, questions, labs, sims and the coach; may contain errors; not professional, medical or clinical advice (fictional cases, never for real patients or clients, emergency services); not affiliated with or endorsed by any exam body.
2. Page 2, on its own as the Prominent Disclosure rule requires ("cannot be included with other disclosures unrelated to personal and sensitive user data collection"): what is sent to Anthropic, why, retention, and the Privacy Policy link, with "I agree".

Acceptance is recorded once per account and version (`legal_acceptances`, document `study_notice`, migration 059), is in the data export, and is required on the server before health courses and clinical/fitness labs. If the launch check fails, the app shows the same two pages before the first request that would send the learner's text to the AI.

## Before the first upload

1. Apply migration 059 (`npm run migrate`), then deploy the backend; `/api/health` fails until 059 is applied. Ship the app update (OTA or store build) with the backend: an app older than this release can't accept the study notice and gets a "please update" 403 on health courses and clinical labs.
2. Fill the legal placeholders (operator, contact email, governing law, minimum age). Terms and Privacy are at 2026-11-09; everyone accepts them once more in the same launch flow as the study notice.
3. `eas build --platform android --profile production` (build numbers auto-increment from EAS). This is a new store build, not an OTA update, only if native config changed; REQ-165 changes no native config.
4. Upload to a **closed testing** track. Personal developer accounts created after 2023-11-13 need a closed test with **at least 12 testers opted in continuously for at least 14 days** before they can apply for production access (Play Console → Dashboard → Apply for production).
5. After Play App Signing is set up, add the Play app-signing key's SHA-1 to the Android OAuth client in Google Cloud, or Google sign-in fails on store installs.
6. Complete Play Console → App content: Data safety (above), content rating (generative AI: yes), target audience, Health apps declaration, ads (no), and confirm the account deletion URL.
