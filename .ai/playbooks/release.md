# Release Playbook

Use this before merge, publish, package handoff, or public release.

## Checklist

- Requirements are complete or explicitly deferred.
- README and design docs match current behavior.
- Ship notes done (see "Ship notes" below): What's new, in-app text and docs
  for every learner-facing change; `lib/ship-notes.test.ts` passes.
- Changelog is updated when public release notes are desired.
- Ignored local session files are not staged.
- Validation passes or failures are documented.
- Testing quality checklist is satisfied for risk-bearing changes.
- Maintenance impact checklist is satisfied for changes to released behavior.
- SCM checklist is satisfied for release, dependency, build, generated, or
  configuration artifact changes.
- Quality attribute checklist is satisfied for quality-sensitive releases.
- Professional practice checklist is satisfied before final reporting.
- Economics decision checklist is satisfied for major scope, cost, or tradeoff
  decisions.
- Engineering foundations checklist is satisfied for high-impact releases.
- No failure is left `open` without a decision, and every `fixed` failure has a
  root cause, a regression test or reason, and a prevention (`omni failure check`).
- Known risks and follow-ups are stated.
- Commit sentence is ready.
- Pull request summary is ready.

## Ship notes (REQ-228)

Nick, 2026-11-10: "Update What's new and the associated docs whenever a
shipment goes out, update the in-app documents." Do this in the PR that
makes the change, not after the release. What's new sat at 2026-11-07
through two releases because it was left for later (FAIL-1261).

1. **Tag the CHANGELOG entry.** Right after the REQ id: `(learner-facing)`
   when a learner can see or feel the change, `(internal)` when they can't
   (CI, ops, docs, agents, a feature still switched off). Other ids may share
   the parentheses: `- REQ-300 (learner-facing; FAIL-1400; migration 080):`.
2. **Write the What's new note** for a learner-facing entry, in
   `backend/lib/release-notes.ts` (header rules there: newest first, id is
   the release date, plain warm words, only what master really ships). Put
   the REQ id in the note's `covers`. Gate an item on a feature flag with
   `requires`; add a gate to `RELEASE_NOTE_GATES` for a new flag. Several
   PRs released together may share one note. When a change is too small to
   announce, write `No What's new:` and the reason in the CHANGELOG entry.
3. **Update every in-app text that describes the changed behavior**, in the
   same PR:
   - FAQ and About (`mobile/src/content/legal.ts`; bump their `version` and
     `updated`); the lesson's level advice (`mobile/src/lib/masteryAdvice.ts`);
     review, plan, lab, sim and course copy; empty states; notices.
   - Emails (`backend/lib/email.ts`, `service-email-copy.ts`) and the public
     pages the backend serves (`backend/app/*/page.tsx`, delete-account
     included).
   - The coach's description of how the app works (`coachRules`,
     `backend/lib/prompts.ts`).
   - Terms, Privacy, Cookies and the study notice are versioned legal text:
     don't edit them in passing. Write the stale point down for Nick; it goes
     in with the next legal version (`.ai/checklists/pre-completion.md`,
     legal items).
4. **Update the docs that describe it**: README (feature list and course
   counts, which `backend/supabase/seed/catalog.ts` gives), `docs/*.md`
   for the area (labs, sims, billing, content review, support process,
   runbooks), `docs/legal/data-inventory.md` for any migration (bump its
   "up to migration NNN"), and `docs/play-store/listing-draft.md` when
   courses, features or collected data change.
5. **CI checks the parts a machine can**: `backend/lib/ship-notes.test.ts`
   fails on an untagged new CHANGELOG entry, a learner-facing one no note
   covers, conflict markers in `.ai/` or docs, and a data inventory older
   than the newest migration. The rest (does the FAQ still say what the code
   does?) is this list.

## OmniContext Public Package Check

Run:

```bash
./omni doctor
```

Confirm that `.codex-local/` remains ignored if local session notes exist.
