# Interactive labs evaluation: bringing OpsForge's lab approach into Ascendra

Date: 2026-11-04. This is an evaluation only. No code, seed data or content changed in either repo, nothing was committed, and no model calls were made.

What was read:
- **OpsForge**: `P4K-M4K-LMS/AWS-Interview-Training-`, shallow clone at merge commit `2bbf15a` (PR #50). It was read but never installed, built or run.
- **Ascendra**: read at `origin/legal/codify` (`fed52fd`). That branch carries the REQ-089 lesson fixes. The review it builds on, `docs/lesson-quality-evaluation.md`, came from `lessons/quick-fixes` (`4cbd644`). Neither is in the local checkout this file was written into, so line numbers in this document refer to `fed52fd`.

## Recommendation

**Start with one policy-fixing lab for AWS IAM, graded by the server with no model calls. Build it new in Ascendra, but copy OpsForge's policy evaluator and its lab format.**

In the lab, the learner gets a short, broken access policy and a list of requests that must be allowed or refused. The learner edits the policy until every request comes out right. Ascendra's server re-runs the requests against the submitted text and decides pass or fail.

That is the right first lab for four reasons:
- **The work is checked exactly.** It is not a model's opinion, and a check costs nothing.
- **It works on a phone.** Editing a few lines of text works on a phone; a terminal does not.
- **Ascendra already stores everything else as data.** OpsForge's policy exercises are already plain data (policies, requests, expected outcome), so they fit Ascendra's database without inventing anything.
- **The links to objectives already exist.** OpsForge has already matched its six policy exercises to 18 AWS objectives across eight AWS tracks.

**Before the pilot, do step zero.** Show the 28 existing hands-on `lab_prompt`s after the solo check. They are already in the database and no screen shows them. This is the review's item B6, effort S. All 28 are on CompTIA tracks, so the AWS pilot does not touch them.

**Recommended order after that:**
1. The Linux terminal for Linux+, then Security+.
2. Unfolding clinical cases for CCRN and NCLEX, one stage at a time (the review's B3). These need clinician-reviewed cases, not generated ones.
3. Decision trees for the PM tracks.

**Pilot scope:**
- **Track:** AWS Certified Security – Specialty (`AWSSCS`). It has the most policy-shaped objectives: six of the 18 links.
- **Lab type:** policy fixing.
- **Lab count:** six, one for each OpsForge exercise pattern:
  - default deny;
  - an explicit deny beats any allow;
  - a permission boundary;
  - an organisation guardrail;
  - cross-account access;
  - tag-based access.
- **Where it shows:** a "Try it" step after the solo check, on the objectives those labs are linked to.

**Rough effort:** M, a few days. More if real IAM JSON syntax is wanted instead of OpsForge's simplified policy language; see "Build options".

## What OpsForge is, in plain terms

OpsForge is a single web page. Everything a learner does runs in the browser, and progress is saved in the browser's own storage. The one exception is an optional local proxy that sends free-text answers to Claude for grading. Nothing has a login or a shared database.

It offers four kinds of hands-on practice:

1. **Terminal missions.** The terminal is a fake Linux machine written in TypeScript. The learner types real commands into an in-memory server: files, users, processes and services. The mission checks what state that server ends up in.
2. **Code labs.** Python runs in real CPython compiled to WebAssembly (Pyodide), and Go runs in a Go interpreter compiled to WebAssembly (Yaegi). Both run in a background worker that is killed after 10 seconds. Reference tests check the code.
3. **Small simulators ("labs").** Each lab has a pure engine for one idea: policy evaluation, network paths, recovery plans, alarms, cost, deployments, encryption, messaging, autoscaling, SQL. Each comes with five to eight exercises whose expected outcomes are written as data.
4. **Incident simulations.** A simulated platform reacts to the learner's actions over time: metrics change, logs appear. The learner investigates, fixes the cause, names the root cause and writes a postmortem.

### How a lab is defined

**Terminal missions are TypeScript objects, not data files.** Each one carries:
- a briefing, objectives, lesson blocks, a glossary and four hints;
- a "world": the starting files, processes, services and network, plus any mission-specific fake programs;
- a list of checks.

Each check is a TypeScript function that looks at the final state. Examples:
- `src/domain/types.ts:270-284` defines `TerminalMission`, with `checks: Array<{ id; label; test: (ctx) => boolean | {passed, detail} }>`.
- `src/content/missions/linux.ts:75-79` is the first mission's checks. They look at command history, command output, and whether `~/ops/ack.txt` contains `READY`.
- `src/content/missions/linux.ts:139-140` checks that `~/errors.log` holds exactly 23 ERROR lines and that `~/report.txt` names the most common error.

Because checks are code, a terminal mission cannot be stored in a database row or generated by a model without first inventing a check language.

**Simulator exercises are plain data.** `src/content/study/policyExercises.ts` defines each exercise as follows:
- `policies`: id, name, kind, and the policy text;
- `editable`: which policy the learner may change;
- `requests`: each with an expected `"allow"` or `"deny"`;
- `hints`: three of them;
- `solution`: a hidden reference answer.

The engine that judges them is `src/engine/policy/evaluate.ts`. It is pure TypeScript that only imports types, and every decision comes with a trace naming the statement that decided it (`evaluate.ts:7`, `Decision` at line 54).

**Incident missions are a state machine with a data scenario.** `src/engine/sim/incident.ts` takes an action, ticks the simulation and records it (`actIncident`, line 51). It also handles the root-cause answer (line 105) and the postmortem (line 109). Its checks combine the metrics with whether the root-cause answer is right (line 118).

### What runs where, and the security model

Everything runs client-side (`docs/ARCHITECTURE.md:3`).

**Safety rules** (`ARCHITECTURE.md:74-81`):
- The terminal is a simulation that never reaches the host. Unsupported commands say `command not found`.
- Python and Go run inside WebAssembly in a worker, with no page, filesystem or network access, and are killed after 10 seconds.
- The coaching proxy keeps the Anthropic key on a server, caps requests at 200,000 characters (`server/index.ts:136`) and restricts which sites may call it.

**One real weakness for Ascendra's purposes: the learner's own browser decides "passed".** That is fine for a solo study tool. It is not fine where a pass feeds a server-side mastery score other people's progress is compared against. Ascendra moved multiple-choice grading to the server in REQ-089 for exactly this reason.

### Hints and feedback

**Terminal missions have four hint levels.** Level 4 is a full worked example, and the test suite runs it to prove it solves the mission (`ARCHITECTURE.md:85`; see `linux.ts:54`). Each check reports a label and a detail line such as "found 12 ERROR lines", so the learner sees which part is still wrong.

**Policy exercises have three hints.** They are revealed one at a time (`src/pages/PolicyLabPage.tsx:130-138`). The decision trace for every request is shown live as the learner edits.

**Every exercise has a proven solution.** A test proves that every exercise starts out failing and that its reference solution passes (`tests/policy.test.ts:112-119`). This is the single most useful authoring rule to copy.

### Progression and scoring

**Hints lower the mastery a mission earns.** Completing a mission raises skill mastery, minus up to 60% for hint level and up to 30% for extra attempts. Solving with no hints in two attempts or fewer counts as an "independent solve" and earns a bonus. Each completion doubles the review interval (`src/engine/learner/mastery.ts:40-66`).

**Retention checks reuse the mission.** The mission reopens in a fresh environment with hints disabled (`src/engine/missions/engine.ts:208-239`).

**OpsForge also has a Study area built on Ascendra's own catalog and rubric.** Nick agreed its rules on 2026-10-09 (`src/engine/study/mastery.ts`, header):
- reading alone never passes Introduced;
- **mission or lab credit reaches Guided at most**;
- self-rated open answers may reach Independent;
- Transfer-ready needs two open or scenario answers graded by the proxy.

That cap on lab credit is a decision Nick has already made once, and this document carries it over.

### How missions are authored

All authoring is by hand, in TypeScript, by the owner:
- about 34 missions across 11 mission files;
- 62 simulator exercises across 10 exercise files;
- 270 hand-curated links to Ascendra objectives in `src/content/study/links.ts` (66 to missions, 204 to labs).

Lessons in the Study area are generated offline by a script, checked against a schema, and committed. Labs and missions are never generated.

### Mobile support

**OpsForge is responsive, but its interactive parts are built for a keyboard.** The terminal is a single `<input>`. Up and down arrows recall history, and Tab completes paths and commands (`src/components/Terminal.tsx:47-77`). A phone keyboard has none of those keys.

**Its mobile testing only checked the layout.** The only mobile item in `docs/TESTING_REPORT.md:46` is "mobile layout renders".

**The Python and Go labs need WebAssembly in a browser.** As far as I know, React Native's Hermes engine does not provide WebAssembly, so on iOS and Android they could only run inside a WebView. Verify this before planning on it. A WebView is a native dependency, `react-native-webview`, which Ascendra does not have. Installing it is blocked on this machine, and it cannot ship by over-the-air update.

### License and ownership

**OpsForge has no license file, and GitHub reports none.** By default that means all rights are reserved by the copyright holder.

**The repo belongs to Nick.** It sits in the `P4K-M4K-LMS` organization, and the `gh` account on this machine (`paukennick`) is an active **admin** of that org, which is how GitHub's API reports an organization owner. The only contributors listed are `paukennick` and `claude`.

So Nick holds the rights and can reuse the code in Ascendra. Two suggestions when copying:
- Add a short provenance note naming the source commit, the way OpsForge's own `tools/ascendra-catalog/PROVENANCE.md` does for the data it took from Ascendra.
- If OpsForge stays public, consider adding a license to it so the position is explicit.

**Side finding, not blocking:** OpsForge is a **public** repo, and it holds a copy of Ascendra's seed catalog (`tools/ascendra-catalog/`, plus generated `public/study/*.json` for all 90 tracks it took). PROVENANCE.md describes the source repo as private. The files are titles, objectives and provenance, not lessons or questions. Still, the catalog is now public, and Nick may want to know.

## Ascendra's learning path today, and where labs fit

### The flow

A lesson has four steps: guess → teach → guided practice → solo check, then a done card (`mobile/app/(app)/course/[trackId]/lesson/[objectiveId].tsx:22-23`).

Since REQ-089:
- options are shuffled on every serve;
- the answer key stays on the server;
- every wrong option has its own explanation.

PBQs are separate. They are unit-level multi-part scenarios, generated and graded by Claude (`backend/app/api/pbq/route.ts`; prompts in `backend/lib/prompts.ts:374-430`).

### How mastery is set

`backend/lib/mastery.ts:62-80` turns each objective's attempt history into a status:
- **multiple choice** reaches Guided at most;
- **free response** reaches Independent when correct, and Transfer-ready when also proficient (two or more attempts, at least 85% correct, `mastery.ts:29-31`).

`recordAttemptAndUpdateMastery` (`backend/lib/grading-service.ts:43`) does three things:
- **stores the attempt**;
- **updates mastery only when the attempt names one objective** (line 73). PBQs name a unit, so they never move objective mastery.
- **adds an entry to the spaced-review list** on every non-correct verdict. A correct answer moves the open entries one step on (lines 100-140).

### The lab slot that already exists

**The schema planned for labs from day one, and they were never shown.**
- `objectives.lab_prompt` is a text column described as an "optional non-graded hands-on lab" (`backend/supabase/migrations/001_init.sql:61`).
- The attempt type already has a `'lab'` kind (`001_init.sql:127`).
- The attempt *format* is limited to `'mc' | 'open' | 'pbq'` (`001_init.sql:128`).

**There are exactly 28 lab prompts, all on the original CompTIA tracks in `backend/supabase/seed/data.ts`:**

| Track | Count | Seed lines |
|---|---|---|
| Security+ (`SECPLUS`) | 13 | 338, 362, 377, 401 |
| Linux+ (`LINUXPLUS`) | 10 | 701, 723, 744, 765, 786 |
| CySA+ (`CYSAPLUS`) | 3 | 823, 845, 865 |
| PenTest+ (`PENTESTPLUS`) | 2 | 918, 948 |

None of the 84 later tracks in `backend/supabase/seed/tracks/*.ts` has any. The only place the field appears in the app is the type, `mobile/src/types/index.ts:78`.

**They are real-world assignments, not in-app labs.** Examples:
- "Run a permission-scoped Nmap scan of your own home network…"
- "Generate an SSH key pair and configure key-based login to a test host"
- "Draft a one-page BIA outline…"

A simulator could not host most of the Security+ ones: browser certificate chains, SIEM sandboxes, sketches, playbooks. Showing them as optional "do this on your own machine" tasks (B6) is the honest use of them.

### Where labs should go

The candidate homes:

| Option | Fit | Verdict |
|---|---|---|
| New "Try it" step after solo, on objectives that have a lab | Fits the existing flow and the per-objective mastery model. Lab results land on the right objective. | **Use for the pilot** |
| Unit-level checkpoint | Good later for multi-objective labs (a whole incident, a full case). Needs a unit-to-objectives credit rule, which PBQs do not have today. | Phase 2 |
| Fold into the existing PBQ simulator | PBQs are free text graded by a model. Labs are best when the server can check them exactly. Mixing the two blurs which verdicts are exact. | No; keep separate, share the screen style |
| Separate "Labs" section per track | Useful as an index and for retries, but a lab only in a side section is easy to skip. | Later, as a list that links into the same step |

## Which lab pattern fits which tracks

| Domain | Tracks | Lab pattern | OpsForge source | How it is checked |
|---|---|---|---|---|
| Cloud identity and access | AWS (SAA, SCS, SOA, DOP, DEA, SAP, MLA, CLF), then Azure RBAC and GCP IAM | **Read and fix a policy** against required allow/deny outcomes | `engine/policy/evaluate.ts`, `content/study/policyExercises.ts` | Exact, on the server: re-run every request against the submitted policy |
| Other cloud design | AWS, Azure, GCP associate/professional | Network-path tracing, recovery planning, alarms, cost, autoscaling, deployments | `engine/network`, `dr`, `alarms`, `cost`, `autoscale`, `deploy` | Exact; same data-plus-expected-outcome shape |
| Linux and security operations | Linux+, Security+, CySA+, Server+ | **Simulated terminal** with a starting server state | `engine/terminal/shell.ts` (48 commands, 1,356 lines) | Exact; replay the command log on the server, then run state checks |
| Incident troubleshooting | AWS SOA/DOP, GCP DevOps, Azure admin | Unfolding incident: inspect, act, name the root cause | `engine/sim/model.ts`, `engine/sim/incident.ts` | Exact for actions and root cause; model or rubric for the postmortem |
| Clinical | CCRN Adult/Peds/Neo, NCLEX-RN/PN, CNA | **Unfolding case**: cues shown → learner picks what matters → priority action → the patient's next state | Same *shape* as `sim/incident.ts`, with patient state in place of platform metrics | Exact for picks and sequencing, which are authored; model grading only for "explain why" |
| Physical therapy | NPTE-PT/PTA, ABPTS specialties | Unfolding case (exam → finding → intervention choice), plus matching (finding → structure) | As above | Exact for choices |
| Project management | PMP, CAPM, PMI-ACP, PgMP, PMI-RMP, and the rest | **Decision tree**: a scenario, choices, consequences that change the project state (schedule, budget, stakeholder mood), and a debrief | `sim/incident.ts` shape; OpsForge's `agile.ts` missions | Exact per decision; model for the debrief |
| Programming | MSCS, Python, JavaScript | Code with tests | Pyodide / JS worker | Exact on web; native needs a WebView (see Mobile) |
| Fitness, health informatics | Fitness certs, MS Health Informatics | Case or decision tree (program design, workflow and data-quality choices) | As clinical | Exact for choices |

**Clinical and health tracks keep their existing gate.** Case labs on nursing and PT tracks must sit behind the acknowledgement Ascendra already enforces (`requireAcknowledgementForUnit`, used in `backend/app/api/pbq/route.ts:7-10`). Case physiology and priority answers need a clinician's review before learners see them. Generated cases would repeat the CCRN problem the review flagged: rules in the seed file never reach the prompt.

**How far the terminal already covers the 10 Linux+ prompts.** I matched each prompt against the commands OpsForge's shell handles (`shell.ts:636-1343`):
- **About four work today:**
  - `systemctl` and `journalctl` service inspection;
  - `df` and `du` disk usage;
  - `ss -tulpn` listening ports;
  - hardening SSH by editing its config and restarting it, which the world's `configCheck` hook supports (`types.ts:212`).
- **Six need new pieces:**
  - `lsblk`;
  - `useradd`/`groupadd`;
  - `ssh-keygen`;
  - `firewalld`/`nftables`;
  - running a Bash script;
  - `docker`.

  Each could be added per mission as a fake program, OpsForge's documented extension point (`ARCHITECTURE.md:87`), but each one is authoring work.

So a Linux+ terminal lab is realistic, but it is not free.

## How lab work would be checked and fed into mastery

**1. The server decides "passed", not the device.**
- **Policy labs:** the app sends the edited policy text. The server compiles it with the ported evaluator, runs the stored requests and compares each result with the stored expected outcome.
- **Terminal labs:** the app sends the list of commands typed. The simulator is deterministic, so the server can replay the commands on a fresh copy of the starting state and run the checks.

Neither costs a model call. That matches REQ-089: the answer key stays on the server.

**2. Feedback is shown live, and counted once.** The learner can see each request's decision and trace while editing, the same as OpsForge. Only the **Submit** press records an attempt. `recordAttemptAndUpdateMastery` adds a review entry for every non-correct verdict (`grading-service.ts:120-140`), so recording every edit would flood the review list.

**3. Lab credit matches the rule Nick already agreed for OpsForge: hints lower it, and the worked example caps it.**
- **Pass with no hints, two attempts or fewer:** record as `kind: 'lab'` with the strength of a free-response answer. It counts toward Independent, and toward Transfer-ready under the existing proficiency rule.
- **Pass after hints, short of the worked example:** record as a correct `open` attempt with a hint note in the evidence string.
- **Pass after the worked example:** record at multiple-choice strength, capped at Guided.
- **Fail:** record `incorrect` with the failed checks as the classification. It enters the existing 1/7/21-day review list.

**This needs one schema decision.** The `attempt_format` enum has no `'lab'` value (`001_init.sql:128`). The two choices:
- add `'lab'` and teach `suggestStatus` (`mastery.ts:62-80`) what it means;
- map lab results onto `'open'`/`'mc'` as above.

Mapping needs no migration. Adding the value keeps reports honest about where a status came from. I lean towards adding it.

**4. Unit-level labs later need a credit rule.** A multi-objective incident or case would need to say which objectives it credits, the way OpsForge's `links.ts` does by hand. PBQs today credit none.

## Mobile constraints

**Policy and decision labs:** a multi-line `TextInput` and a list of requests showing pass or fail work on a phone. Line-numbered errors help, since the evaluator already reports a line per statement. A "reset to the starting policy" button is needed.

**Terminal labs on a phone need more than OpsForge has.** At minimum:
- `autoCapitalize="none"`, `autoCorrect={false}`, `spellCheck={false}` on the input;
- a row of tap-to-insert tokens for the mission's own commands and symbols: `|`, `>`, `-`, `~`, `/`, and paths from the world;
- up/down history buttons in place of the arrow keys;
- a "complete" button in place of Tab;
- output that wraps or scrolls sideways without losing the input line;
- short missions of five to eight commands. Long typing sessions on glass lose people.

A tablet or the web export is the comfortable place for longer missions. Say so on the lab card instead of hiding the lab on phones.

**Code labs (Python and Go):** on web only, unless a WebView is added in a future native build.

**Everything else:** the ported engines are plain TypeScript with no browser APIs. `shell.ts` and `evaluate.ts` import only types. They run under Hermes, so the app can show live feedback on the device while the server stays the judge.

## Build options

| Size | Option | What it involves | Effort | Verdict |
|---|---|---|---|---|
| S | **Show the 28 existing lab prompts** (step zero) | Render `lab_prompt` after the solo check as an optional "do this yourself" task, with an "I did it" button recorded as a `lab` attempt that does not change mastery | Under a day | Do first |
| M | **Port the lab format, reuse the pure engines** (recommended) | Copy `policy/evaluate.ts` (221 lines) into `backend/lib/` with a provenance note. Add a `labs` table (objective id, kind, JSON spec, hidden solution, hints). Add `POST /api/lab` that grades on the server. Add a "Try it" step in the lesson screen. Hand-adapt the six policy exercises for `AWSSCS`. | A few days | **Pilot** |
| M+ | Same, but with **real IAM JSON** in place of OpsForge's simplified policy language | OpsForge's language is its own vendor-neutral one (`allow store:Read on store/orders/*`). It teaches the decision rules, not the syntax. Accepting real IAM JSON needs a JSON reader, AWS's action and condition-key formats, and a stricter evaluator. | About a week more | Decide after the pilot: the rules transfer to every cloud, the syntax is what the exam shows |
| L | Port the terminal simulator | Copy `shell.ts` (1,356 lines). Define terminal labs as data. Replace the TypeScript check functions with a small check vocabulary (file contains, mode equals, service status, command used). Server-side replay. Mobile terminal input. | A week or more | Phase 2, for Linux+ |
| L | Case and decision-tree engine for clinical, PT and PM | New data format: stages, cues, choices, consequences, debrief. One shared player screen. Clinician review workflow. | Weeks, mostly content | Phase 3; the review already ranks it high for nursing (B3) |
| — | Reuse OpsForge's React components | They are browser DOM plus Tailwind. The mission engine also writes to browser storage (Dexie) directly (`engine/missions/engine.ts:2`). None of it runs in React Native. | — | **No.** Reuse engines and data shapes only |

## Risks

- **Running learner code.**
  - Policy, terminal and case labs run no learner code at all; they interpret text against a simulator. That is the safest category.
  - Real Python or Go is a different risk class, and Ascendra should not run it on its Vercel server. Only run it in the learner's own browser (WebAssembly in a worker, as OpsForge does) or in a separate paid sandbox service.
  - Server replay of terminal commands needs size and step limits: a cap on commands per submission and on output size. Otherwise one request can tie up a server function.
- **Cost.**
  - Exact-checked labs cost no model calls to grade.
  - Generating labs with a model would cost per lab, and would need the solution check below.
  - Grading clinical "explain why" answers with the existing free-response grader costs the same as a free-response lesson answer today.
- **Content-authoring effort is the real cost.**
  - OpsForge's 62 exercises and about 34 missions are hand-written, each with a proven solution. Ascendra has 94 tracks and thousands of objectives.
  - Labs cannot be per objective everywhere. Target the objectives where doing beats reading.
  - Port OpsForge's rule: **no lab ships unless its starting state fails and its hidden solution passes the checker.** For any lab a model drafts, run both through the evaluator before caching it and reject it if either fails.
- **Accuracy and vendor fidelity.**
  - The simplified policy language could teach a rule that differs from real AWS behaviour. One example: OpsForge models a guardrail as a ceiling, which matches AWS service control policies, but resource-policy edge cases differ.
  - Have each pilot lab's expected outcomes checked against the AWS IAM policy evaluation logic documentation before release.
- **Clinical safety.** Case labs present patient decisions. They need clinician review, the existing acknowledgement gate, and no numeric doses unless the sources agree. That is the CCRN seed rule.
- **Mastery inflation.** If lab passes count as strongly as free-response answers regardless of hints, they become a new shortcut, the same kind the review found in multiple choice. Keep the hint and worked-example cap.

## Suggested pilot plan

1. **Step zero (S).** Show the 28 CompTIA `lab_prompt`s after the solo check, as optional real-world tasks.
2. **Pilot (M). Track `AWSSCS`, lab type policy fixing.**
   - **Six labs, adapted from OpsForge's six policy exercises.** Each is tied to the `AWSSCS` objective OpsForge already linked it to (`src/content/study/links.ts:128-133`):
     - "Designing authorization controls" → cross-account access;
     - "Designing attribute-based and role-based access control" → tags;
     - "Implementing IAM policies to least privilege, including permissions boundaries" → boundary;
     - "Analyzing authorization failures with the IAM policy simulator" → explicit deny wins;
     - "Investigating and correcting unintended permissions granted to a resource" → boundary;
     - "Organization policies that manage permissions: service control policies" → guardrail.
   - **Server-graded with no model calls.** Results are recorded as `kind: 'lab'` attempts using the credit rule above.
   - **Two possible measures:**
     - pass rate on the first submit;
     - whether learners who did the lab answer that objective's later free-response and PBQ questions better than those who did not.
3. **After the pilot,** decide whether to switch to real IAM JSON. Then extend policy labs to the other seven AWS tracks that OpsForge already links (12 more objectives), then Azure RBAC and GCP IAM.
4. **Phase 2:** a terminal lab for Linux+, starting with the four prompts the shell already covers.
5. **Phase 3:** unfolding clinical cases for CCRN, with clinician-reviewed content.

## Technical detail (skippable)

- **OpsForge stack** (`docs/ARCHITECTURE.md:7-18`):
  - React 19, Vite 8, Tailwind 4, hash routing on GitHub Pages;
  - Dexie (IndexedDB) for storage;
  - CodeMirror 6;
  - Pyodide served from `public/pyodide/`;
  - Yaegi compiled to WebAssembly from `go/runner/main.go`;
  - a Node coaching proxy at `server/index.ts` using `@anthropic-ai/sdk`;
  - an optional local race-detector service at `server/race.ts`, which runs `go build -race` on code it receives and is documented as run-on-your-own-machine only.
- **Engines that carry over without the DOM** (imports are types only):
  - `src/engine/terminal/shell.ts`;
  - `src/engine/policy/evaluate.ts`;
  - `src/engine/sim/model.ts` and `src/engine/sim/incident.ts`.
  The other simulator engines under `src/engine/*` have the same shape, but I did not check each one's imports.
- **Shell surface:** 48 documented commands. It supports pipes, redirection, environment variables, a permission model, processes and services, `sudo`, and an in-app editor action. Mission-specific programs plug in through `world.programs` (`types.ts:237-252`).
- **Ascendra pieces a pilot would touch:**
  - `backend/supabase/migrations/` (new `labs` table; possibly `'lab'` on `attempt_format`);
  - `backend/lib/` (ported evaluator and lab grader);
  - a new `backend/app/api/lab/route.ts`;
  - `backend/lib/mastery.ts` (if `'lab'` is added);
  - `mobile/app/(app)/course/[trackId]/lesson/[objectiveId].tsx` (new step after `solo`);
  - `mobile/src/types/index.ts`.
- **Ascendra platform:** Expo SDK 57, React Native 0.86.3, react-native-web 0.21 (`mobile/package.json`), Next.js 16 backend (`backend/package.json`). No `react-native-webview` dependency today.
