# Rolling back recent migrations

REQ-207. Every migration here is additive and re-runnable, and the code that
needs one fails closed or degrades when it is absent, so the first rollback
is almost always the **code** (Vercel Instant Rollback), not the schema. These
are the schema rollbacks for when you do want one. Take a fresh backup first
(`docs/operations-runbook.md`, "Backups").

Run a script with:

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f backend/scripts/<file>
```

`--single-transaction` makes any error leave everything as it was. Use the
owner login (the `PROD_DATABASE_URL` string), never `app_runtime`.

| Migration | What it added | Rollback |
| --- | --- | --- |
| 064 | `content_recheck` role, `exec_checks`, `exec_check_runs` | `scripts/rollback-064.sql` |
| 065 | `subject_tracks.hidden_at` | notes below |
| 067 | sim item kind in three check constraints, `item_flags.context` | notes below |
| 071 | `app_runtime`, `app_runtime_sync()`, hardened functions | `scripts/rollback-071.sql` |

Migrations 066 and 068 to 070 belong to other work and carry their own
rollback notes in their file headers.

## Order

Newest first: 071 before 064. `rollback-071.sql` refuses while anything is
connected as `app_runtime`, so point `DATABASE_URL` back at the owner login
and redeploy first (the lockdown guide, step 5 rollback).
`rollback-064.sql` refuses while a LOGIN user is still a member of
`content_recheck`; drop that user first.

## 065, `subject_tracks.hidden_at`

Hidden tracks (the two Red Hat courses and Docker, REQ-194) come back by
clearing the column; nothing needs the column dropped:

```
update subject_tracks set hidden_at = null where hidden_at is not null;
```

Dropping it is a forward migration after the code that reads it is gone
(the course list, study paths and progress queries filter on it), and the seed writes it (seed.ts checks for
it), so roll the code back first:

```
alter table subject_tracks drop column if exists hidden_at;
delete from schema_migrations where filename = '065_track_hidden_at.sql';
```

## 067, sim item kind

With `SIMS_ENABLED` off nothing writes kind `sim` and the previous backend
runs unchanged on this schema, so switch off and leave it. A full removal
deletes or re-kinds every `sim` row before the constraints go; the exact
statements are in the 067 file header.

## 071, what the rollback leaves

`scripts/rollback-071.sql` does not undo the `REVOKE EXECUTE ... FROM PUBLIC`
and the fixed `search_path` on the project's functions. Nothing depends on
the old state. The per-function statements to undo them are in its header.

## Tested

`backend/lib/rollback-scripts.dbtest.ts` runs both scripts on a migrated
database inside a transaction it rolls back, and checks what each removes and
that 064's refuses while a member role exists.
