# Lockdown and database password rotation (2026-11-10)

For Nick, one evening, phone or desktop. REQ-207. Do the steps in order. Each
step says what you will see, how long, and how to undo it.

Menu names in GitHub, Supabase and Vercel move around. If a label is not
where this says, look for the same words nearby.

## Read this first

- Total time: about 60 to 90 minutes. Only step 3 breaks the live app: from the
  password reset until the new Vercel deployment is Ready, expect **2 to 5
  minutes of errors** (sign-in and anything that needs the database fails).
- You need: GitHub (repo admin), Supabase (project owner), Vercel (project
  owner), your password manager open, and a second browser tab or device.
- Never paste a password or connection string into chat, a ticket, a commit,
  or a workflow log. Only into the password manager, GitHub secrets, Vercel
  env vars, and the Supabase password box.
- Placeholders: `<ref>` is the Supabase project reference (the part of the
  dashboard URL after `/project/`), `<region-host>` is the pooler host
  Supabase shows (like `aws-0-us-west-1.pooler.supabase.com`), `<PW>` is the
  new database password.
- The GitHub repo is public, so anything you commit or paste in an issue is
  world-readable. That is one more reason for the secret rules above.

### The order, and why

0. Prepare the new password and strings (nothing breaks).
1. GitHub: environments, branch rule, rulesets (nothing breaks, but see the
   backup warning in 1.0).
2. Confirm the fix branch is released (migration 071 and the workflow changes).
3. Reset the password, update Vercel and GitHub (the outage window).
4. Reviewer gate on, prove it, delete the old repository secret.
5. Optional, another day: run the app as `app_runtime`.

---

## Step 0. Prepare (no outage)

1. In the password manager create an item "Ascendra DB (postgres)".
2. Generate a password: **32 characters, letters and digits only** (symbols
   such as `@`, `/`, `#`, `%` break connection strings). Save the item
   **before** you use the password anywhere.
3. In Supabase: top bar **Connect**, type **URI**. Read the host and the
   username form from the tabs. Write these two lines into the same item,
   with your `<PW>` in place:
   - **Transaction pooler** (the live app):
     `postgres://postgres.<ref>:<PW>@<region-host>:6543/postgres`
   - **Session pooler** (GitHub migrations and backups):
     `postgres://postgres.<ref>:<PW>@<region-host>:5432/postgres`

The host is the same in both. The port is the only difference: 6543 is
transaction mode, 5432 is session mode. Do not add `?pgbouncer=true`; that
option is for a different database library and this app does not need it
(see the pooler report linked at the bottom).

Rollback: nothing to undo. Delete the item if you stop.

---

## Step 1. GitHub: protect the production database secret

Why: today anyone who can push a branch named `ops/...` or edit a workflow can
make GitHub Actions run with the production database URL. After this, the URL
exists only inside environments, only `master` and `ops/*` can use it, and
the migration environment needs your approval.

### 1.0 Warning about the nightly backup

`db-backup.yml` (nightly) and `backup-housekeeping.yml` (weekly) run by
themselves. A required reviewer would make them wait for you and the backups
would quietly stop. So the fix branch moves both to their own environment,
`production-backup`, with no reviewer. Create it in 1.1. Turn on the reviewer
(step 4) only after the fix branch is on `master`.

**If the fix branch merges before `production-backup` exists with its
`PROD_DATABASE_URL` secret (1.1), the nightly backup and the weekly clean-up
fail on their next run** (the workflow names an environment that has no
secret). Create it first.

Until you reset the password in step 3, the new environment secrets you add
below hold a password that does not work yet. A nightly backup that fires in
that gap would fail. Do steps 1 to 3 in one sitting.

### 1.1 Create the `production-backup` environment (no reviewers)

1. GitHub, the repository, **Settings** (on a phone: the `...` menu, then
   Settings).
2. Left menu: **Environments**, **New environment**, name exactly
   `production-backup`, **Configure environment**.
3. Leave **Required reviewers** unticked.
4. **Deployment branches and tags**: change to **Selected branches and
   tags**, **Add deployment branch or tag rule**, `master`, **Add rule**.
5. **Environment secrets**, **Add environment secret**: Name
   `PROD_DATABASE_URL`, Value: the **Session pooler** string from step 0.
   **Add secret**.

### 1.2 Add the secret to `production-database`

1. **Settings**, **Environments**, open `production-database` (it exists; the
   workflows already name it).
2. **Environment secrets**, **Add environment secret**: Name
   `PROD_DATABASE_URL`, Value: the **Session pooler** string from step 0.
3. Do **not** delete the repository-level `PROD_DATABASE_URL` yet. You delete
   it in step 4.

### 1.3 Branch rule on the environment

Still in `production-database`:

1. **Deployment branches and tags**: **Selected branches and tags**.
2. **Add deployment branch or tag rule**: `ops/*`, **Add rule**.
3. Again: `master`, **Add rule**. (`master` is needed because "Lesson fixes" is
   started by hand from `master`. `migrate-production` only triggers on the
   two `ops/` branches, never on `master`.)

### 1.4 Rulesets for `master` and `ops/*`

**Settings**, left menu **Rules**, **Rulesets**, **New ruleset**, **New branch
ruleset**.

**Ruleset A: `protect-master`**

1. Name `protect-master`. Enforcement status **Active**.
2. **Bypass list**: leave it **empty**. Admins are then bound too, which is
   what makes the test below meaningful.
3. **Target branches**, **Add target**, **Include by pattern**, `master`.
4. Tick **Restrict deletions**, **Block force pushes**, **Require a pull
   request before merging** (approvals 0 is fine for a one-person repo; the
   point is nothing is pushed straight to `master`), and **Require status
   checks to pass** (add the CI jobs: Backend, Database, Mobile; search for
   them in the box).
5. **Create**.

**Ruleset B: `protect-ops`**

1. Name `protect-ops`. Enforcement **Active**. Bypass list empty.
2. Target: **Include by pattern**, `ops/*`.
3. Tick **Block force pushes** only. Do not tick restrict creations or
   updates: you create and update these branches to start a deploy. The
   reviewer in step 4 is the real gate.
4. **Create**.

The runbook (`docs/deploy-runbook-integration.md`) says to push the ops branch
with `--force`. With ruleset B, push normally:
`git push origin <commit>:refs/heads/ops/migrate-production`. That works when
the commit is a descendant of the last one pushed, which is always true when
you deploy forward from `master`.

### 1.5 Prove the rulesets (two quick tests)

Test 1, `master` is closed. On your computer, in a clone of the repo:

```
git checkout -b ruleset-test master
git commit --allow-empty -m "ruleset test"
git push origin ruleset-test:master
```

Expected: the push is **rejected**, with `GH013: Repository rule violations`
and "Changes must be made through a pull request". If it goes through, the
ruleset is not Active or the pattern is wrong. Fix it, and undo the empty
commit with a pull request, not a force push. Then `git checkout master` and
`git branch -D ruleset-test`.

Test 2, ops branches cannot be rewritten:

```
git push origin master:refs/heads/ops/ruleset-test
git push --force origin HEAD~1:refs/heads/ops/ruleset-test
```

The first creates a harmless branch (no workflow listens to that name). The
second must be **rejected** (non-fast-forward / rule violation). Delete the
branch: GitHub, **Branches**, bin icon next to `ops/ruleset-test`.

### Rollback for step 1

- Rulesets: **Rules**, **Rulesets**, open one, Enforcement **Disabled** (or
  delete). Immediate.
- Environment branch rules: back to **No restriction**.
- Secrets: the repository-level `PROD_DATABASE_URL` is still there until
  step 4, and workflows can read either.
- Nothing in step 1 touches the app or the database.

---

## Step 2. Confirm the fix branch is released

1. Vercel, **Deployments**: the production deployment is from a commit that
   contains `backend/supabase/migrations/071_app_runtime_role.sql`.
2. GitHub, **Actions**: the file `db-backup.yml` on `master` says
   `environment: production-backup` (Code tab, `.github/workflows`).
3. `https://<your-domain>/api/health` shows `"status":"ok"`.

If the migration has not been applied yet, you apply it after step 3 (step 4
does it with the approval gate). If the branch is not on `master`, **stop
here** and finish on the evening it ships: the backup workflows would be
looking in the wrong environment.

---

## Step 3. Reset the password and update everything (the outage)

Have these tabs open first: Supabase, Vercel (project, Settings, Environment
Variables), GitHub (Settings, Environments), password manager.

### 3.1 Reset (the outage starts)

1. Supabase, the project, **Project Settings** (gear), **Database**.
2. **Database password**, **Reset database password**.
3. Paste the password from step 0. **Reset password**.
4. From now on new connections with the old password fail. Connections already
   open keep working for a short while, so errors start gradually.

### 3.2 Vercel: transaction pooler, then redeploy

1. Vercel, project, **Settings**, **Environment Variables**.
2. `DATABASE_URL` (Production): three-dot menu, **Edit**. Paste the
   **Transaction pooler** string from step 0. Only **Production** ticked.
   **Save**.
3. **Deployments**, top (current production) deployment, three-dot menu,
   **Redeploy**.
4. Wait for **Ready** (2 to 4 minutes). The errors stop when it is Ready.

Why a redeploy: a deployment captures its variables when it is built. And
"Instant Rollback" to an older deployment would bring back the OLD password,
so it is not a way back from this step.

### 3.3 GitHub: session pooler (port 5432)

Migrations, the seed and backups use temp tables and long sessions, which
transaction mode does not give them. They stay on 5432. The strings are
already in place from step 1, with the right password now that you reset.
Nothing to paste, but check once:

1. **Settings**, **Environments**, `production-database`, secret
   `PROD_DATABASE_URL` shows "Updated just now" (from 1.2).
2. Same for `production-backup`.

### 3.4 Checks

1. `https://<your-domain>/api/health` returns `"status":"ok"` (can take up to
   30 seconds after Ready; the result is cached).
2. Sign in with your own account. Open a course, open a lesson, answer one
   question. That write runs inside a transaction and takes a database lock,
   which is the part a wrong pooler setup breaks.
3. Open the account page.
4. Vercel, **Logs** (Runtime), last 10 minutes: no `password authentication
   failed`, no `prepared statement`, no `too many connections`, no `timeout
   expired`.
5. GitHub, **Actions**, "Nightly database backup", **Run workflow** (on
   `master`). Expected: green. Red with "password authentication failed" means
   the `production-backup` secret is wrong (1.1.5).
6. Supabase logs: no repeated authentication failures from an address you do
   not recognise.

### Rollback for step 3

The old password is gone and you do not want it back (it is what you are
rotating). If the app is still down after Ready:

1. Check the string for typos: port `6543`, username `postgres.<ref>`, the new
   password, no space or line break at the end.
2. If the transaction pooler itself is the problem, put the **Session pooler**
   (port 5432) string into Vercel `DATABASE_URL` and **Redeploy**. That is
   the setup that ran before tonight, with the new password.
3. If you lost the new password, reset again (3.1) with a fresh one and redo
   3.2 and the two GitHub secrets.

---

## Step 4. Turn on the approval gate and prove it

Only now, with the fix branch on `master` and the new password working.

### 4.1 Required reviewer

1. Settings, Environments, `production-database`, **Required reviewers**: tick.
2. Add your own account. Add a second person if you ever have one.
3. Leave **Prevent self-review** unticked. You are the only person; ticking it
   would lock you out of your own deploys.
4. **Save protection rules**.

### 4.2 Test: nothing runs without you

```
git push origin master:refs/heads/ops/migrate-production
```

GitHub, **Actions**, "Migrate production database": the job sits at **Waiting**
with "Review pending deployments". Open it, **Review deployments**, tick
`production-database`, write a comment, **Reject**. Expected: the run fails
and nothing touched the database.

Then do it for real: push again, **Approve and deploy**. Expected: the log
says "Schema is current", or it applies `071_app_runtime_role.sql` if that was
pending. The log header says Environment `production-database`.

### 4.3 Delete the old repository secret

Only after 4.2 passed: **Settings**, **Secrets and variables**, **Actions**,
**Repository secrets**, bin icon next to `PROD_DATABASE_URL`, confirm.

### Rollback for step 4

Untick Required reviewers and **Save** (immediate). Re-add the repository
secret if you deleted it.

---

## Step 5 (optional, another day). Run the app as `app_runtime`

Why: the app connects as `postgres`, which can drop tables, change any grant
and read the rollback backups. Migration 071 made `app_runtime`, a role that
can only read and write the app's own tables. If the database URL ever
leaks, this limits the damage. Do it when step 3 has been stable for a day.
Needs migration 071 applied.

### 5.1 Give the role a password

1. Password manager: new item "Ascendra DB (app_runtime)", 32 characters,
   letters and digits only. Save it.
2. Supabase, **SQL Editor**, **New query**. Paste this, replacing the word
   PASSWORD with the password (keep the quotes):

```
alter role app_runtime login password 'PASSWORD';
```

3. **Run**. Expect "Success. No rows returned." Close the tab without saving
   the query (or delete it from the history).

### 5.2 Point Vercel at it

1. String (transaction pooler; note the username is `app_runtime.<ref>`):
   `postgres://app_runtime.<ref>:<APP_PW>@<region-host>:6543/postgres`
2. Vercel, **Environment Variables**, `DATABASE_URL` (Production), **Edit**,
   paste, **Save**.
3. Leave the GitHub secrets alone. Migrations and backups stay on `postgres`.
4. **Deployments**, current production, **Redeploy**, wait for Ready. The old
   login still works, so the old deployment serves until the new one is
   Ready: no outage.

### 5.3 Checks

The list in 3.4. Also: Vercel logs have no `permission denied for table` or
`permission denied for function`. If one appears, note the name and use the
rollback; do not grant things by hand.

### Rollback for step 5

1. Vercel `DATABASE_URL`: put back the `postgres` **Transaction pooler**
   string from step 0, **Save**, **Redeploy** (no outage, same reason).
2. Optional tidy-up, SQL Editor:
   `alter role app_runtime nologin password null;`

Later migrations that add a table or function end with
`select app_runtime_sync();`. CI fails if one does not, so you hear about it
before production does.

---

## Stop if

- Step 1 Test 1 lets the push through. The ruleset is not protecting `master`.
- `/api/health` is not `ok` before step 3. Fix that first, or you cannot tell
  what the reset broke.
- You cannot open the password manager on a second device. Do not reset until
  you can.

## Where each setting lives afterwards

- Vercel `DATABASE_URL` (Production): transaction pooler, port 6543, user
  `postgres.<ref>` (or `app_runtime.<ref>` after step 5).
- GitHub `production-database`, secret `PROD_DATABASE_URL`: session pooler,
  port 5432, user `postgres.<ref>`.
- GitHub `production-backup`, secret `PROD_DATABASE_URL`: the same string.
- GitHub `RECHECK_DATABASE_URL` (repository secret): unchanged. Different
  role, different password.
- Optional TLS pinning (`DATABASE_CA_CERT` in Vercel): a separate change, see
  [db-tls.md](db-tls.md).

Why the transaction pooler is safe for this app:
[2026-11-10-transaction-pooler-session-state.md](2026-11-10-transaction-pooler-session-state.md).
