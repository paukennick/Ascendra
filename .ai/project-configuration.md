# Project Configuration

Fill these values before using this workspace on a specific project. These
settings correspond to `.ai/rules/universal-engineering-ruleset.json`.

## Required Project Values

- `project_name`: `prep-lms (Ascendra)`
- `repository_type`: `mixed` -- Next.js API+web backend (`backend/`) plus an Expo/React Native mobile app (`mobile/`) that also exports to web and is served same-origin by the backend.
- `primary_language_or_stack`: `TypeScript -- Next.js 16 App Router (backend/) and Expo Router (mobile/)`
- `package_manager`: `npm`
- `build_command`: `backend: npm run build --prefix backend. mobile: no local build script -- native ships via eas build, web via mobile's export step copied into backend/public (see backend/scripts/build-webapp.sh).`
- `test_command`: `none configured -- no test runner or test files exist yet in either package.`
- `lint_command`: `none configured -- no ESLint config exists yet in either package.`
- `typecheck_command`: `npm run typecheck --prefix backend && npm run typecheck --prefix mobile (both tsc --noEmit)`
- `changelog_location`: `none -- no CHANGELOG.md exists in this repo`
- `documentation_locations`: `README.md; backend/supabase/migrations/ (data model of record); no formalized architecture or API doc -- API routes are self-documented under backend/app/api/**/route.ts`
- `branching_or_pr_standard`: `trunk-based -- commits go directly to master, no PR workflow observed in history`
- `comment_style`: `Minimal by default -- only non-obvious WHY (constraint, invariant, workaround), never restating WHAT the code does; no JSDoc/docstring blocks`
- `requirement_id_prefix`: `REQ`

## Default Safety Flags

- `allow_broad_refactor`: `false`
- `allow_dependency_changes`: `false`
- `allow_schema_changes`: `false`
- `allow_destructive_data_changes`: `false`
- `require_user_confirmation_for_destructive_actions`: `true`

## Per-Task Requirement Template

- `id`: `REQ-###`
- `category`: `<CATEGORY>`
- `title`: `<SHORT_TITLE>`
- `description`: `<CLEAR_DESCRIPTION_OF_THE_CHANGE>`
- `priority`: `<critical | high | medium | low>`
- `minimum_access_scope`: `<specific file/module/component/table/config/test/doc>`
- `do_not_access`: `<specific excluded area>`
- `acceptance_criteria`: `<observable completion criteria>`
- `validation_required`: `<build | test | lint | typecheck | manual_verification | data_validation | security_review>`
- `documentation_required`: `<changelog | readme | architecture | api | data_model | deployment | none>`
- `risk_notes`: `<known risk, dependency, assumption, or follow-up>`
