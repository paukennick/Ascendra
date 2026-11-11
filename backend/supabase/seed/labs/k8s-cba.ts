import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Certified Backstage Associate (CBA).
//
// Aligned to the four CBA domains (Backstage Development Workflow 24%,
// Backstage Infrastructure 22%, Backstage Catalog 22%, Customizing Backstage
// 32%), read on 2026-11-08 from github.com/cncf/curriculum
// (CBA_Curriculum.pdf) and training.linuxfoundation.org. Density
// (docs/labs.md, hybrid): 3 / 2 / 2 / 3.
//
// Labs write catalog-info.yaml, app-config.yaml, TypeScript/React fragments
// and yarn/backstage-cli commands against authored CLI and log output. They
// follow the current Backstage framework (the new backend system and
// Yarn workspaces); every lab is needs_expert_review.

export const CBA_LABS: SeedLabSet = {
  trackCode: "CBA",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/CBA_Curriculum.pdf", "exam_outline", "2026-11-08"),
    source("https://training.linuxfoundation.org/certification/certified-backstage-associate-cba/", "exam_outline", "2026-11-08"),
    source("https://backstage.io/docs/features/software-catalog/descriptor-format", "reference", "2026-11-08"),
    source("https://backstage.io/docs/deployment/", "reference", "2026-11-08"),
  ],
  labs: [
    // ----------------------------------------------------------------- 24%
    {
      slug: "run-locally-first-day",
      objective: "Build and run Backstage projects locally: create-app, yarn install, yarn start and yarn dev, and the app-config files the dev server reads",
      kind: "build",
      title: "Get a Backstage app running locally and explain what each step did",
      brief:
        "The fictional fintech Keld Capital has a Backstage repository (created with create-app some months ago) and a new platform engineer on day one. The engineer must get it running against the local SQLite database with the GitHub integration token from their own environment, and explain to the team's wiki what yarn install, yarn start/yarn dev, and the app-config files actually do.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the commands in order, the app-config.local.yaml you would create, and a short explanation of the moving parts.",
          parts: [
            part(
              "Prerequisites and install",
              "Node.js LTS (the version in .nvmrc or package.json engines), Yarn (the version pinned by packageManager / .yarnrc.yml, installed via corepack), then yarn install at the repo root, which installs every workspace package from the lockfile; explains the monorepo's Yarn workspaces and why the lockfile matters.",
              "nvm use                       # Node version from .nvmrc\ncorepack enable && yarn --version   # the Yarn version pinned in package.json's packageManager field\nyarn install                  # or yarn install --immutable in CI\nThe repository is a Yarn workspaces monorepo: packages/app (frontend), packages/backend, and plugins/*. yarn install resolves the whole tree from yarn.lock so every developer gets identical @backstage/* versions -- the versions must stay aligned across packages, which is why upgrades go through backstage-cli versions:bump rather than hand-editing."
            ),
            part(
              "Local configuration",
              "An app-config.local.yaml (gitignored) that overrides what the developer needs: the GitHub integration token from an environment variable and a guest auth provider, with the default app-config.yaml providing baseUrl, SQLite database and catalog locations; explains the config file layering (app-config.yaml, then app-config.local.yaml, then app-config.production.yaml when selected) and ${ENV} substitution.",
              "app-config.local.yaml:\nintegrations:\n  github:\n    - host: github.com\n      token: ${GITHUB_TOKEN}\nauth:\n  providers:\n    guest: {}\nThe dev server loads app-config.yaml and then overlays app-config.local.yaml (gitignored, per developer). Values like ${GITHUB_TOKEN} are substituted from the environment at load time, so secrets never land in Git. app-config.yaml already sets app.baseUrl and backend.baseUrl (http://localhost:3000 and :7007), backend.database.client better-sqlite3 for local work, and the catalog's initial locations. Production uses app-config.production.yaml selected with --config."
            ),
            part(
              "Start the app",
              "export GITHUB_TOKEN=...; yarn start (or yarn dev in older templates) runs the backend and frontend together in development mode with hot reload: the backend on 7007 and the app dev server on 3000; explains what is watched and that backstage-cli repo start is what the script calls.",
              "export GITHUB_TOKEN=ghp_...   # the engineer's own token, scoped to read repos\nyarn start\nThe root start script runs backstage-cli repo start, which launches packages/backend (Node, port 7007, with the new backend system wiring plugins from packages/backend/src/index.ts) and the frontend dev server (webpack/rspack, port 3000) together, both watching for changes. Open http://localhost:3000, sign in as guest, and the catalog shows the entities from the configured locations. In templates that still have separate scripts, yarn dev does the same; yarn start may start only the frontend."
            ),
            part(
              "What to tell the wiki",
              "A short explanation: the frontend is a React single-page app that calls backend plugins over HTTP on 7007 (proxied by the dev server); the backend hosts plugins such as catalog, auth, scaffolder, techdocs; configuration is layered YAML with environment substitution; SQLite is for local only; the token in app-config.local.yaml never leaves the laptop.",
              "Backstage is two processes in development: a React app (packages/app) served on 3000 and a Node backend (packages/backend) on 7007 that hosts the backend plugins -- catalog, auth, scaffolder, techdocs, proxy. The frontend talks to the backend's plugin APIs over HTTP. Configuration is YAML in layers with ${ENV} substitution: shared defaults in app-config.yaml, your local overrides in app-config.local.yaml (never committed), production values in app-config.production.yaml. SQLite is a convenience for laptops; production uses PostgreSQL."
            ),
          ],
        },
      ],
    },
    {
      slug: "typescript-compile-errors",
      objective: "Compile a Backstage project with TypeScript: yarn tsc, type checking across packages, and common type errors in plugins",
      kind: "case",
      title: "Fix a Backstage build that fails on types after a dependency bump",
      brief:
        "After running backstage-cli versions:bump, the CI pipeline at the fictional retailer Oakfield Stores fails at the type-check step. The developer who ran the bump asks for help reading the errors.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ yarn tsc\nyarn run v4.x\n$ tsc\nplugins/cost-insights-custom/src/components/CostCard.tsx:14:10 - error TS2305: Module '\"@backstage/core-components\"' has no exported member 'InfoCardProps'.\n\n14 import { InfoCardProps } from '@backstage/core-components';\n            ~~~~~~~~~~~~~\n\nplugins/cost-insights-custom/src/plugin.ts:9:3 - error TS2322: Type '{ id: string; apis: ApiFactory<...>[]; }' is not assignable to type 'PluginConfig<...>'.\n  Object literal may only specify known properties, and 'apis' does not exist in type 'PluginConfig<...>'.\n\npackages/backend/src/index.ts:22:17 - error TS2339: Property 'add' does not exist on type 'Backend'. Did you mean 'start'?\n\nFound 3 errors in 3 files.\nerror Command failed with exit code 2.\n\n$ git diff --stat HEAD~1 -- '**/package.json' | tail -1\n 9 files changed, 71 insertions(+), 71 deletions(-)",
          ask: "Explain how type checking works across the monorepo, what each error means after the bump, and how to fix them.",
          parts: [
            part(
              "How yarn tsc works here",
              "The root tsconfig.json includes every workspace package, so one tsc run type-checks the frontend, the backend and all plugins against the @backstage/* types now in node_modules; after a versions:bump the installed packages' types changed, so code that compiled against old types fails -- type errors are the upgrade's to-do list, not a broken toolchain.",
              "yarn tsc runs the TypeScript compiler once from the repo root with a tsconfig that includes packages/* and plugins/*, emitting no JS (noEmit) -- it only checks types. Every package compiles against the type declarations of the @backstage/* versions in node_modules, which versions:bump just changed in nine package.json files. The three errors are places where the code uses APIs that moved or were renamed between the old and new Backstage releases. The build is not broken; the upgrade is incomplete."
            ),
            part(
              "Error 1 and 2: renamed export and changed plugin API",
              "TS2305 'no exported member' means the type was renamed or removed in the new core-components version -- check the package's changelog/API report and import the current name (or derive props with React.ComponentProps<typeof InfoCard>); TS2322 in plugin.ts means createPlugin's config shape changed and apis belongs elsewhere (registered through the plugin's apis in the frontend system or via createApiFactory in the expected field) -- fix per the migration note.",
              "Error 1: @backstage/core-components no longer exports InfoCardProps under that name. Read the package's CHANGELOG.md in node_modules (or the API report) for the rename; the robust fix is type InfoCardProps = React.ComponentProps<typeof InfoCard> so your code stops depending on an exported alias. Error 2: createPlugin's PluginConfig type changed and no longer accepts apis in the way the plugin was written; the changelog's migration note says where API factories now go (for the legacy frontend system, apis: [createApiFactory(...)] is still valid in the current major -- so check that the import of createApiFactory and the factory shape match the new types; if the project moved to the new frontend system, APIs are provided through extensions instead). Fix the code to the documented shape rather than casting it away."
            ),
            part(
              "Error 3: backend API",
              "backend.add is the new backend system's method on the object returned by createBackend(); TS2339 saying it does not exist (and suggesting start) means packages/backend/src/index.ts is mixing the old and new backend systems or the import of createBackend is from the wrong package after the bump -- fix by importing createBackend from @backstage/backend-defaults and keeping backend.add(import('@backstage/plugin-catalog-backend')) style registrations.",
              "In the new backend system, packages/backend/src/index.ts looks like:\nimport { createBackend } from '@backstage/backend-defaults';\nconst backend = createBackend();\nbackend.add(import('@backstage/plugin-app-backend'));\nbackend.add(import('@backstage/plugin-catalog-backend'));\n...\nbackend.start();\nIf TypeScript says add does not exist on Backend, the backend variable is not the new-system object: either createBackend is imported from an old location (the bump moved it to @backstage/backend-defaults) or the file still uses the legacy createServiceBuilder pattern with a renamed variable. Align the import and the registrations, run yarn tsc again, and run yarn backstage-cli repo lint --fix for the mechanical parts."
            ),
            part(
              "Working method",
              "Fix errors in dependency order (core libraries, then plugins, then app/backend), re-run yarn tsc after each, read the @backstage package changelogs the bump printed, and run the app (yarn start) because type-correct code can still misbehave at runtime; commit the bump and the fixes together so the repo never sits in a non-compiling state.",
              "Order: fix shared/plugin code first, then the app and backend that import it; re-run yarn tsc after each change (it is fast on incremental runs). versions:bump prints the changed packages -- read each one's CHANGELOG.md for migration notes before guessing. When tsc is clean, yarn start and click through the affected pages: a changed default or a renamed config key will not show up as a type error. Commit the bump and the fixes as one change so main always compiles."
            ),
          ],
        },
        {
          text: "Types compile. The developer then runs yarn install --immutable in CI and gets:\n\n$ yarn install --immutable\n➤ YN0028: The lockfile would have been modified by this install, which is explicitly forbidden.\n\n$ git status --short\n M yarn.lock",
          ask: "Explain the error and the right fix, and the rule for lockfiles in Backstage repos.",
          parts: [
            part(
              "The immutable install",
              "--immutable makes Yarn fail if resolving dependencies would change yarn.lock; the bump changed package.json ranges but the updated lockfile was not committed (or install was not re-run locally), so CI's resolution differs; fix by running yarn install locally, reviewing and committing yarn.lock together with the package.json changes.",
              "YN0028 means the committed yarn.lock does not match what package.json now asks for: the bump edited nine package.json files, the local yarn install updated yarn.lock, but the lockfile change was left out of the commit (git status shows it modified). --immutable is CI's guard against exactly this -- an install that silently resolves different versions than developers have. Run yarn install locally, inspect the yarn.lock diff (it should only touch the bumped @backstage packages and their transitive deps), and commit it with the bump."
            ),
            part(
              "The rule",
              "yarn.lock is always committed and always changes together with package.json; never delete it to 'fix' an install; CI installs with --immutable; dependency upgrades of @backstage packages go through backstage-cli versions:bump so all packages move together, followed by yarn install, yarn tsc, yarn test and a commit containing both the manifests and the lockfile.",
              "Lockfile discipline for a Backstage monorepo: package.json and yarn.lock change in the same commit; CI uses yarn install --immutable so drift fails fast; @backstage/* versions are bumped as a set with backstage-cli versions:bump (optionally --release next for pre-releases), never one package at a time, because they are released and tested together; after the bump: yarn install, yarn tsc, yarn test, yarn build:all, then commit everything. Deleting yarn.lock to make an error go away is how two developers end up running different Backstage versions."
            ),
          ],
        },
      ],
    },
    {
      slug: "docker-image-for-backstage",
      objective: "Use Docker to build a container image of a Backstage project: yarn build:backend, the Dockerfile the CLI generates, host versus multi-stage builds and runtime configuration",
      kind: "build",
      title: "Build a production container image of the backend",
      brief:
        "The fictional logistics firm Thorne Freight wants a CI job that builds a Backstage backend image. They want the smallest reasonable image, the frontend served by the backend, production configuration selectable at run time, and no secrets baked in.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the build steps and Dockerfile approach (host build or multi-stage), the runtime configuration, and how to verify the image.",
          parts: [
            part(
              "Host build: compile, then package",
              "The template's packages/backend/Dockerfile expects a host build: yarn install, yarn tsc, yarn build:backend (which bundles the backend and includes the frontend build via the app-backend plugin), then docker build from the repo root with the Dockerfile that copies the backend's dist bundle (skeleton.tar.gz and bundle.tar.gz) and yarn.lock into a node image and runs yarn install --production; explains why the two tarballs exist.",
              "yarn install --immutable\nyarn tsc\nyarn build:backend          # bundles packages/backend/dist/{skeleton,bundle}.tar.gz (frontend built in via app-backend)\ndocker build . -f packages/backend/Dockerfile -t registry.thorne.example/backstage:1.14.0\nThe generated Dockerfile starts FROM a node image, copies yarn.lock, package.json and the skeleton tarball (the package.json files of every workspace, so dependency installation is cached separately from source), runs yarn install --production, then copies the bundle tarball (compiled code) and app-config files. The frontend is served by the backend's app-backend plugin, so one image serves both. This 'host build' keeps the image build fast and small because compilation happens in CI, not in the image."
            ),
            part(
              "Multi-stage alternative",
              "A multi-stage Dockerfile that runs yarn install, tsc and build:backend in a builder stage and copies the artifacts into a slim runtime stage; the trade-off is reproducibility without needing Node on the CI host versus longer image builds and a larger build cache; either way the runtime stage installs only production dependencies.",
              "FROM node:20-bookworm-slim AS build\nWORKDIR /app\nCOPY . .\nRUN corepack enable && yarn install --immutable && yarn tsc && yarn build:backend\n\nFROM node:20-bookworm-slim\nWORKDIR /app\nRUN apt-get update && apt-get install -y --no-install-recommends python3 g++ build-essential && rm -rf /var/lib/apt/lists/*   # native deps (better-sqlite3/isolated-vm) if used\nCOPY --from=build /app/yarn.lock /app/package.json /app/.yarnrc.yml ./\nCOPY --from=build /app/.yarn ./.yarn\nCOPY --from=build /app/packages/backend/dist/skeleton.tar.gz ./\nRUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz && yarn workspaces focus --all --production\nCOPY --from=build /app/packages/backend/dist/bundle.tar.gz /app/app-config*.yaml ./\nRUN tar xzf bundle.tar.gz && rm bundle.tar.gz\nCMD [\"node\", \"packages/backend\", \"--config\", \"app-config.yaml\", \"--config\", \"app-config.production.yaml\"]\nMulti-stage needs no Node on the CI runner and is self-contained, at the cost of slower builds; the host build is the documented default. Both end with only production dependencies in the final image."
            ),
            part(
              "Runtime configuration without secrets",
              "The container's CMD passes --config app-config.yaml --config app-config.production.yaml; production values reference ${ENV} variables (POSTGRES_HOST, POSTGRES_PASSWORD, GITHUB_TOKEN, BACKEND_SECRET) injected by the orchestrator at run time; app.baseUrl and backend.baseUrl set to the public URLs; nothing sensitive in the image.",
              "app-config.production.yaml (committed, no secrets):\napp:\n  baseUrl: https://backstage.thorne.example\nbackend:\n  baseUrl: https://backstage.thorne.example\n  listen: ':7007'\n  database:\n    client: pg\n    connection:\n      host: ${POSTGRES_HOST}\n      port: ${POSTGRES_PORT}\n      user: ${POSTGRES_USER}\n      password: ${POSTGRES_PASSWORD}\n  auth:\n    keys:\n    - secret: ${BACKEND_SECRET}\nintegrations:\n  github:\n  - host: github.com\n    token: ${GITHUB_TOKEN}\nThe image carries the config files but every secret is a ${VARIABLE} resolved when the process starts, from Kubernetes Secrets or the platform's secret store. Never COPY an app-config.local.yaml into the image and never bake tokens into ENV instructions -- they are readable with docker history."
            ),
            part(
              "Verify",
              "docker run with the required environment variables (or a compose file) and curl /healthcheck on 7007 and the frontend root; docker image ls for size; check the image contains no local config (docker run --rm image ls app-config*); scan the image; push by digest for the deployment.",
              "docker run --rm -p 7007:7007 -e POSTGRES_HOST=... -e POSTGRES_PASSWORD=... -e BACKEND_SECRET=$(openssl rand -hex 32) -e GITHUB_TOKEN=... registry.thorne.example/backstage:1.14.0\ncurl -s localhost:7007/healthcheck             # {\"status\":\"ok\"}\ncurl -sI localhost:7007/ | head -1              # 200: the frontend is served by the backend\ndocker run --rm registry.thorne.example/backstage:1.14.0 ls app-config*   # no app-config.local.yaml\ndocker image ls registry.thorne.example/backstage   # a few hundred MB with slim base and production deps only\nScan (trivy image ...) and push; deploy by digest so the Helm chart or manifests reference exactly what was verified."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 22%
    {
      slug: "configure-for-environments",
      objective: "Configure Backstage: app-config.yaml and environment overlays (app-config.production.yaml), secrets via environment variables, and the configuration schema",
      kind: "build",
      title: "Lay out configuration for local, staging and production",
      brief:
        "The fictional university consortium Marlow Alliance runs Backstage locally, in staging and in production. Today a single app-config.yaml holds everything including a hard-coded GitHub token, and staging accidentally points at the production PostgreSQL. They want a clean layout, secrets out of Git, and a way to catch configuration mistakes before deploy.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the configuration files and their contents, explain how Backstage merges them and validates them, and show how to catch the staging mistake.",
          parts: [
            part(
              "File layout and merge order",
              "app-config.yaml for shared, non-secret defaults; app-config.local.yaml (gitignored) for developers; app-config.staging.yaml and app-config.production.yaml for environment differences, each selected with --config at start; explains later files override earlier ones key by key (deep merge), arrays are replaced not merged, and the dev server reads app-config.yaml plus app-config.local.yaml automatically.",
              "app-config.yaml                 # shared defaults: app.title, catalog rules, plugin settings, integrations host list\napp-config.local.yaml           # gitignored developer overrides (guest auth, local token)\napp-config.staging.yaml         # staging URLs and database host\napp-config.production.yaml      # production URLs and database host\nStart: node packages/backend --config app-config.yaml --config app-config.staging.yaml\nFiles are deep-merged in the order given, so a later file overrides only the keys it sets; lists (such as catalog.locations) are replaced wholesale by a later file, not appended -- a common surprise. The dev command reads app-config.yaml and app-config.local.yaml by default."
            ),
            part(
              "Secrets via environment and includes",
              "Replace the hard-coded token with ${GITHUB_TOKEN}; database credentials with ${POSTGRES_*}; optionally $include or $file to read a value from a mounted file (e.g. a Kubernetes Secret volume); explains substitution happens at load, that missing variables fail fast, and that the backend treats keys marked secret in the schema as never visible to the frontend.",
              "integrations:\n  github:\n  - host: github.com\n    token: ${GITHUB_TOKEN}\nbackend:\n  database:\n    client: pg\n    connection:\n      host: ${POSTGRES_HOST}\n      user: ${POSTGRES_USER}\n      password: ${POSTGRES_PASSWORD}\n  auth:\n    keys:\n    - secret: ${BACKEND_SECRET}\n# or read from a mounted Secret file:\n#     password:\n#       $file: /run/secrets/postgres-password\n${VAR} is replaced when the config loads; an unset variable is an error at startup, which is better than a silent empty password. $file and $include pull values or whole YAML fragments from files, which fits Kubernetes Secret volumes. Keys the configuration schema marks with visibility: secret are stripped from the config the frontend receives, so a token can never leak to the browser even if referenced in a frontend-visible section."
            ),
            part(
              "Schema validation",
              "Every plugin ships a config.d.ts schema describing its keys and visibility; backstage-cli config:check --config ... validates the merged configuration against the combined schema and fails on unknown or mistyped keys; backstage-cli config:print --config ... prints the effective merged config with secrets redacted; run both in CI per environment.",
              "yarn backstage-cli config:check --config app-config.yaml --config app-config.staging.yaml\nyarn backstage-cli config:print --config app-config.yaml --config app-config.staging.yaml --frontend   # what the browser would see; secrets redacted\nThe check loads every installed plugin's config.d.ts schema (frontend and backend), merges them and validates the resolved configuration: a typo like backend.databse or a string where a number is expected fails the job. config:print shows the merged result per environment, which is how staging-pointing-at-production becomes visible in a review."
            ),
            part(
              "Catching the staging mistake",
              "Put the database host in the environment-specific file (or as ${POSTGRES_HOST} set differently per environment) so staging cannot inherit production's host from a shared file; add a CI step running config:print for staging and asserting the host matches the staging pattern; optionally use a different database name/user per environment so a wrong host still fails authentication.",
              "The bug came from a shared app-config.yaml holding backend.database.connection.host. Move the host out of the shared file: either into app-config.staging.yaml and app-config.production.yaml explicitly, or as ${POSTGRES_HOST} provided by each environment's Secret. Then a CI guard per environment:\nyarn backstage-cli config:print --config app-config.yaml --config app-config.staging.yaml | yq '.backend.database.connection.host' | grep -q 'staging' || { echo 'staging config points at a non-staging database'; exit 1; }\nGive each environment its own database user and database name too, so even a wrong host fails to authenticate instead of writing to production."
            ),
          ],
        },
      ],
    },
    {
      slug: "deploy-to-production",
      objective: "Plan and deploy Backstage to production: PostgreSQL instead of SQLite, the backend container behind an ingress, Helm chart or manifests, and health endpoints",
      kind: "case",
      title: "Diagnose a production Backstage that keeps losing its catalog",
      brief:
        "The fictional media group Fenby Press deployed Backstage to Kubernetes last month. Users report that search results and the catalog 'reset' after every deploy, and sign-in sometimes fails right after a rollout.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n backstage get deploy,svc,ingress\nNAME                        READY   UP-TO-DATE   AVAILABLE   AGE\ndeployment.apps/backstage   2/2     2            2           31d\n\nNAME                TYPE        CLUSTER-IP     PORT(S)    AGE\nservice/backstage   ClusterIP   10.96.40.12    7007/TCP   31d\n\nNAME                                  CLASS   HOSTS                     ADDRESS        PORTS   AGE\ningress.networking.k8s.io/backstage   nginx   backstage.fenby.example   203.0.113.20   80,443  31d\n\n$ kubectl -n backstage exec deploy/backstage -- cat app-config.production.yaml | grep -A4 database\n  database:\n    client: better-sqlite3\n    connection: ':memory:'\n\n$ kubectl -n backstage get secret backstage-env -o jsonpath='{.data}' | jq 'keys'\n[\"GITHUB_TOKEN\"]\n\n$ kubectl -n backstage logs deploy/backstage --tail=1 | grep -i auth\n{\"level\":\"warn\",\"message\":\"Generated a secret for service-to-service authentication, this is only safe in development and not in production\"}",
          ask: "Explain each symptom from the evidence and specify the production-grade fix.",
          parts: [
            part(
              "Catalog and search resetting",
              "The database is SQLite in memory inside each Pod: every entity, search index and location registration lives in process memory and is lost on restart, and the two replicas each have their own; production needs PostgreSQL with client pg and shared credentials, so state is durable and shared across replicas.",
              "client: better-sqlite3 with connection ':memory:' means every backend replica keeps the whole database in RAM: the catalog, search index, auth sessions and scaffolder tasks. A deploy restarts the Pods and the data is gone; with two replicas, each has a different in-memory copy, so requests bounce between two inconsistent catalogs. Production requires PostgreSQL:\nbackend:\n  database:\n    client: pg\n    connection:\n      host: ${POSTGRES_HOST}\n      port: 5432\n      user: ${POSTGRES_USER}\n      password: ${POSTGRES_PASSWORD}\nBackstage creates one database per plugin (backstage_plugin_catalog, ...) by default, so the user needs CREATE DATABASE rights or pluginDivisionMode: schema to share one database."
            ),
            part(
              "Sign-in failing after rollout",
              "The backend auto-generates a service-to-service secret at startup because backend.auth.keys is not configured; each replica and each restart gets a different key, so tokens issued by one Pod are rejected by another and sessions break after deploys; fix by setting backend.auth.keys[].secret from a stable Secret (BACKEND_SECRET) shared by all replicas, and configure a real auth provider with sign-in resolvers.",
              "The warning says it: with no backend.auth.keys configured, every backend process generates its own random key for signing service and user tokens. Behind a Service that spreads requests over two Pods, a token signed by Pod A is invalid on Pod B, and a rollout replaces both keys at once -- hence sign-in failures right after deploys. Add BACKEND_SECRET to the Kubernetes Secret (openssl rand -hex 32) and reference it:\nbackend:\n  auth:\n    keys:\n    - secret: ${BACKEND_SECRET}\nAll replicas then share one signing key across restarts. Also check auth.providers in production uses a real provider (GitHub, OIDC) with a signIn resolver, not guest."
            ),
            part(
              "The rest of the production checklist",
              "Postgres credentials and GitHub token in the Secret, resources and readiness/liveness probes on /healthcheck (port 7007), backend.baseUrl/app.baseUrl set to the public HTTPS URL and backend.cors matching, TLS on the Ingress, a PodDisruptionBudget, and the Helm chart (backstage/backstage) or manifests in Git; explains the probes and base URLs.",
              "Secret backstage-env gains POSTGRES_HOST/USER/PASSWORD and BACKEND_SECRET. Deployment: readinessProbe and livenessProbe httpGet /healthcheck on 7007, resources requests/limits, 2+ replicas with a PodDisruptionBudget. Config: app.baseUrl and backend.baseUrl both https://backstage.fenby.example, backend.cors.origin the same, backend.listen ':7007'. Ingress: TLS with a certificate, class nginx as now. Use the community Helm chart (backstage/backstage) or the manifests the docs describe, and keep them in Git with the image pinned by digest. After the change: a deploy keeps the catalog, search keeps its index, and sign-in survives rollouts."
            ),
          ],
        },
        {
          text: "PostgreSQL and the shared key are in place. The next week, after a scale-up to four replicas, the scaffolder page shows some tasks as 'not found' when refreshed, and TechDocs pages are sometimes missing.",
          ask: "Explain what still assumes a single instance and fix it.",
          parts: [
            part(
              "Scaffolder tasks",
              "Scaffolder task state is in the database (fine), but task logs and the working directory are local to the Pod that runs the task; with four replicas a refresh may hit a Pod that did not run the task; fix by ensuring task events are stored in the database (the default with Postgres) and by consistent routing or a shared workspace, and check the scaffolder's backend.workingDirectory is writable; or run the scaffolder with sticky sessions / a single dedicated instance.",
              "Scaffolder task metadata and events go to the database once Postgres is configured, so 'task not found' points at a replica still on a different store or a stale deployment -- verify every replica loads the same config (kubectl rollout status, and check the backend database tables backstage_plugin_scaffolder.tasks are filling from all Pods). Task execution itself happens on one Pod using a local working directory (backend.workingDirectory); that is fine as long as the task's status and logs are read from the shared database. If the organization runs an old scaffolder setup that logs to disk, upgrade it, or use session affinity on the Service as a stopgap."
            ),
            part(
              "TechDocs",
              "TechDocs built on the fly are stored on the Pod's local filesystem (publisher type local) so each replica has a different set; fix by setting techdocs.publisher to an external store (awsS3, googleGcs, azureBlobStorage or an S3-compatible bucket) and preferably techdocs.builder external with CI generating docs, so every replica reads the same published site.",
              "techdocs:\n  builder: external          # docs built in CI and published, not on request\n  publisher:\n    type: awsS3              # or googleGcs / azureBlobStorage / S3-compatible\n    awsS3:\n      bucketName: fenby-techdocs\n      region: eu-west-2\nWith publisher type local, generated sites live on whichever Pod built them; four replicas means a page exists on one Pod and not the others. An object-store publisher gives one shared location, and builder: external moves generation into CI (techdocs-cli generate && publish) so the backend only serves. Until then, a single replica or session affinity hides the symptom but not the cause."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 22%
    {
      slug: "troubleshoot-entity-ingestion",
      objective: "Troubleshoot entity ingestion: processing errors, orphaned entities, schema validation failures and refresh intervals",
      kind: "case",
      title: "Find out why a service never appears in the catalog",
      brief:
        "A team at the fictional insurer Danbury Mutual added a catalog-info.yaml to their repository and registered it, but the component does not show in Backstage. A second team's component shows an 'orphan' warning.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Registered location: https://github.com/danbury-mutual/claims-api/blob/main/catalog-info.yaml\n\ncatalog-info.yaml:\napiVersion: backstage.io/v1alpha1\nkind: component\nmetadata:\n  name: Claims API\n  description: Handles claim intake\nspec:\n  type: service\n  lifecycle: production\n  owner: claims-team\n\n$ kubectl -n backstage logs deploy/backstage | grep -i 'claims-api' | tail -2\n{\"level\":\"warn\",\"plugin\":\"catalog\",\"message\":\"Failed to process location url:https://github.com/danbury-mutual/claims-api/blob/main/catalog-info.yaml; caused by InputError: Malformed envelope, /kind must be equal to one of the allowed values\"}\n{\"level\":\"warn\",\"plugin\":\"catalog\",\"message\":\"... /metadata/name must match pattern \\\"^[a-zA-Z0-9][-a-zA-Z0-9_.]{0,61}[a-zA-Z0-9]$\\\"\"}",
          ask: "Explain the validation failures and fix the file, then explain how the catalog processes a location and where errors become visible.",
          parts: [
            part(
              "Schema failures",
              "kind must be a known kind with exact casing -- Component, not component; metadata.name must match the entity name pattern (no spaces; letters, digits, -, _, . up to 63 characters) -- claims-api, not 'Claims API'; the human-readable name belongs in metadata.title; owner should reference a Group or User entity (group:default/claims-team) that exists.",
              "apiVersion: backstage.io/v1alpha1\nkind: Component\nmetadata:\n  name: claims-api\n  title: Claims API\n  description: Handles claim intake\n  annotations:\n    github.com/project-slug: danbury-mutual/claims-api\nspec:\n  type: service\n  lifecycle: production\n  owner: group:default/claims-team\nTwo schema rules were broken: kind is case-sensitive (Component), and metadata.name is an identifier -- no spaces, the regex in the log -- while metadata.title carries the display name. owner is an entity reference; if the Group claims-team does not exist in the catalog the component still ingests but shows a broken owner link, so make sure the Group entity is registered too."
            ),
            part(
              "How a location is processed",
              "The catalog's processing loop reads the location (via the GitHub integration), parses the YAML envelope, validates against the entity schema, runs processors (which emit relations and may fetch more locations), then stores the entity; errors at parse/validation attach to the Location entity as processing errors and appear in the logs and on the entity page under 'processing errors'; the loop retries on the refresh interval.",
              "Registering a URL creates a Location entity. The catalog's processing engine periodically (the refresh interval, by default every few minutes) fetches the URL through the configured GitHub integration (which is why the token matters), parses the YAML, validates the envelope and the kind's schema, runs the processors -- adding relations such as ownedBy and dependsOn, resolving placeholders like $text -- and writes the final entity. A validation failure stops at that stage: the Location entity gets a processing error (visible in the UI on the Location's page and via the catalog API's error status), and the log lines above are the same message. Fixing the file in Git and waiting one refresh cycle -- or clicking Refresh on the Location -- clears it."
            ),
          ],
        },
        {
          text: "claims-api now appears. The second team's component, billing-worker, shows the banner 'This entity is not referenced by any location and is therefore not receiving updates' and its Edit link points at a repository that was renamed from billing-worker to billing-engine last month.",
          ask: "Explain orphaned entities and the right clean-up, and how to avoid the problem with automated discovery.",
          parts: [
            part(
              "Orphans",
              "An orphan is an entity whose originating Location no longer emits it -- here the repository (and thus the catalog-info URL) moved, so the Location fails and the previously ingested entity remains in the database without a source; it is stale and will not update; the fix is to register the new URL (which yields an entity with the same name and takes over) and to delete the dead Location, or enable orphan-entity deletion (catalog.orphanStrategy: delete) so stale entities are removed automatically.",
              "The old Location points at a URL that 404s since the rename, so processing emits nothing; the entity billing-worker that it had produced stays in the catalog as an orphan -- data without a parent, never refreshed. Clean-up: register https://github.com/danbury-mutual/billing-engine/blob/main/catalog-info.yaml (if the entity keeps metadata.name billing-worker, the new Location adopts it; if the name changed, the old entity remains orphaned until removed), then unregister the dead Location. Setting catalog.orphanStrategy: delete makes the catalog delete orphans automatically on the next processing cycle -- choose it once the team is comfortable that nothing important is only reachable as an orphan."
            ),
            part(
              "Automated discovery",
              "Replace per-repo manual registration with an entity provider -- GitHub discovery (catalog.providers.github with organization, filters and a schedule) -- so renamed or new repos with catalog-info.yaml are found automatically and removed when gone; manual registration stays for one-offs; explains providers versus processors.",
              "catalog:\n  providers:\n    github:\n      danbury:\n        organization: danbury-mutual\n        catalogPath: /catalog-info.yaml\n        filters:\n          branch: main\n          repository: '.*'\n        schedule:\n          frequency: {minutes: 30}\n          timeout: {minutes: 3}\nAn entity provider scans the GitHub organization on a schedule and emits a Location for every repository that has a catalog-info.yaml at the path, adding new repos, following renames (the provider sees billing-engine and drops billing-worker's old URL) and removing locations for deleted repos. Providers are the source of locations; processors transform entities after they are read. Manual Register remains available for repositories outside the organization."
            ),
          ],
        },
      ],
    },
    {
      slug: "model-the-catalog",
      objective: "Populate the Backstage Catalog: catalog-info.yaml files, static locations in app-config, and the entity model's apiVersion, kind, metadata and spec",
      kind: "build",
      title: "Model a product as catalog entities with relations and annotations",
      brief:
        "The fictional ticketing company Rowan Live wants its 'Checkout' product in Backstage: a System called checkout owned by the Payments team, containing a Component checkout-api (a service written in Go, in GitHub repo rowan-live/checkout-api, deployed to Kubernetes with label app=checkout-api), which provides an OpenAPI API checkout-v1 and depends on a Resource, a PostgreSQL database named checkout-db. Documentation lives in the api repo under docs/. The Payments team itself is not yet in the catalog.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the catalog-info.yaml entities (several documents), the Group, and the annotations that light up the plugins, and explain the relations they create.",
          parts: [
            part(
              "Group and System",
              "A Group payments-team (spec.type team, members or a parent) registered from an org location, and a System checkout owned by group:default/payments-team; explains owner creates an ownedBy relation and systems group components, APIs and resources into a product view.",
              "---\napiVersion: backstage.io/v1alpha1\nkind: Group\nmetadata:\n  name: payments-team\n  description: Owns checkout and payments\nspec:\n  type: team\n  children: []\n---\napiVersion: backstage.io/v1alpha1\nkind: System\nmetadata:\n  name: checkout\n  description: Ticket checkout and payment\nspec:\n  owner: group:default/payments-team\nThe Group must exist or every owner reference shows as unresolved. spec.owner yields the ownedBy/ownerOf relations; a System is the product-level grouping whose page lists the Components, APIs and Resources that declare spec.system: checkout."
            ),
            part(
              "Component with annotations",
              "A Component checkout-api with spec.type service, lifecycle production, owner, system checkout, providesApis [checkout-v1], dependsOn [resource:checkout-db]; annotations github.com/project-slug for the GitHub plugins, backstage.io/techdocs-ref: dir:. for TechDocs, backstage.io/kubernetes-label-selector or backstage.io/kubernetes-id for the Kubernetes plugin, and backstage.io/source-location implicitly from the file's location.",
              "---\napiVersion: backstage.io/v1alpha1\nkind: Component\nmetadata:\n  name: checkout-api\n  title: Checkout API\n  description: Serves the checkout flow\n  annotations:\n    github.com/project-slug: rowan-live/checkout-api\n    backstage.io/techdocs-ref: dir:.\n    backstage.io/kubernetes-label-selector: app=checkout-api\n  tags: [go, grpc]\nspec:\n  type: service\n  lifecycle: production\n  owner: group:default/payments-team\n  system: checkout\n  providesApis: [checkout-v1]\n  dependsOn: [resource:checkout-db]\nAnnotations are how plugins find their data: github.com/project-slug powers the GitHub actions/insights tabs; backstage.io/techdocs-ref: dir:. tells TechDocs the mkdocs.yml and docs/ sit next to this file; the Kubernetes annotation lets the Kubernetes plugin list the Pods with that label. providesApis and dependsOn become providesApi/apiProvidedBy and dependsOn/dependencyOf relations, drawn in the graph."
            ),
            part(
              "API and Resource",
              "An API checkout-v1 with spec.type openapi, lifecycle, owner, system and definition (inline or $text pointing at an openapi.yaml in the repo); a Resource checkout-db with spec.type database, owner and system; explains $text/$json placeholders are resolved by the placeholder processor at ingest.",
              "---\napiVersion: backstage.io/v1alpha1\nkind: API\nmetadata:\n  name: checkout-v1\n  description: Checkout public API\nspec:\n  type: openapi\n  lifecycle: production\n  owner: group:default/payments-team\n  system: checkout\n  definition:\n    $text: ./openapi/checkout-v1.yaml\n---\napiVersion: backstage.io/v1alpha1\nkind: Resource\nmetadata:\n  name: checkout-db\n  description: PostgreSQL for checkout\nspec:\n  type: database\n  owner: group:default/payments-team\n  system: checkout\nThe API entity renders the OpenAPI definition in the API tab; $text is resolved relative to the catalog-info.yaml at processing time, so the spec stays in its own file. The Resource gives dependsOn a real target so the dependency graph shows the database."
            ),
            part(
              "Registering",
              "Either register the repository's catalog-info.yaml URL manually, add it to catalog.locations in app-config (type url, with rules allowing the kinds), or rely on GitHub discovery; Groups usually come from an org provider (GitHub org, LDAP) or a static org file; catalog.rules must allow Group and System kinds for the location or they are rejected.",
              "app-config.yaml:\ncatalog:\n  rules:\n  - allow: [Component, System, API, Resource, Location, Group, User]\n  locations:\n  - type: url\n    target: https://github.com/rowan-live/checkout-api/blob/main/catalog-info.yaml\n  - type: url\n    target: https://github.com/rowan-live/org/blob/main/groups.yaml\n    rules:\n    - allow: [Group, User]\nBy default the catalog allows only Component, API, Location and a few kinds; Group, User and System need an explicit rule or the ingest is refused with a policy error. Teams are usually fed by an org entity provider (catalog.providers.githubOrg or LDAP) rather than hand-written files, so payments-team's members stay current."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 32%
    {
      slug: "frontend-vs-backend-plugin",
      objective: "Understand frontend versus backend plugins: what runs in the browser, what runs in Node, and how a plugin's frontend talks to its backend",
      kind: "case",
      title: "Decide where each part of a new feature lives",
      brief:
        "The fictional energy retailer Caldbeck Power wants an 'On-call' feature in Backstage: an entity tab showing who is on call for the component right now, pulled from their paging provider's API (which needs an API key), with a button to page the team. A junior developer proposes putting everything in the frontend and calling the paging API directly from the browser.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Pull request from the junior developer (abridged):\n\n// plugins/oncall/src/api/pagerClient.ts\nconst API_KEY = 'pd_live_3f9a...';\nexport async function whoIsOnCall(service: string) {\n  const res = await fetch(`https://api.pagerprovider.example/v1/oncalls?service=${service}`, {\n    headers: { Authorization: `Token ${API_KEY}` },\n  });\n  return res.json();\n}\nexport async function pageTeam(service: string) {\n  return fetch(`https://api.pagerprovider.example/v1/incidents`, { method: 'POST', headers: { Authorization: `Token ${API_KEY}` }, body: JSON.stringify({ service }) });\n}\n\nDescription: 'Everything is in the frontend plugin so we do not need a backend. The key is read-only for schedules and can create incidents.'",
          ask: "Review the proposal: explain why it is wrong and split the feature into frontend and backend responsibilities, describing how the two halves communicate.",
          parts: [
            part(
              "Why not all in the frontend",
              "The browser cannot hold the paging API key without exposing it to every user (and to view-source), CORS would block direct calls, and rate limits and auditing need a server; frontend plugins are React code shipped to every browser, so secrets and privileged actions belong in a backend plugin.",
              "A frontend plugin is JavaScript delivered to every user's browser: anything in it -- including an API key in config or code -- is readable by anyone who can open the portal. Calling the paging provider directly also meets CORS restrictions and gives no central place to audit who paged whom or to rate-limit. Secrets and privileged calls live in Node, in a backend plugin, which runs on the server with access to configuration marked secret."
            ),
            part(
              "Backend plugin",
              "A backend plugin oncall-backend (created with backstage-cli new) exposing HTTP routes such as GET /api/oncall/:entityRef and POST /api/oncall/:entityRef/page, reading the API key from config (oncall.apiKey with visibility secret in config.d.ts), using the auth and httpAuth services to identify the caller, and registered with backend.add(import('@internal/plugin-oncall-backend')).",
              "plugins/oncall-backend: created with yarn new (backend-plugin). Its plugin.ts uses createBackendPlugin with deps on coreServices.httpRouter, coreServices.rootConfig, coreServices.logger and coreServices.httpAuth, and registers an Express router: GET /oncall/:kind/:namespace/:name fetches the schedule from the paging provider with the key from config.getString('oncall.apiKey'), and POST /oncall/.../page triggers a page after checking the caller's identity via httpAuth.credentials(req). config.d.ts declares oncall.apiKey with visibility: secret so it never reaches the frontend. packages/backend/src/index.ts gains backend.add(import('@internal/plugin-oncall-backend')). The route is served under /api/oncall."
            ),
            part(
              "Frontend plugin",
              "A frontend plugin oncall with an API client (created via createApiRef/createApiFactory) that calls the backend through discoveryApi.getBaseUrl('oncall') and fetchApi (which attaches the user's Backstage token), a React card/tab component for the entity page using useEntity(), and registration in packages/app's EntityPage; explains discovery and identity.",
              "plugins/oncall: an OncallApi with createApiRef({id: 'plugin.oncall.service'}), implemented with discoveryApi.getBaseUrl('oncall') to find the backend route and fetchApi.fetch(...) so the user's Backstage identity token is sent automatically; a factory via createApiFactory wiring in discoveryApiRef and fetchApiRef. UI: an EntityOnCallCard that reads the current entity with useEntity() and calls the API, plus a Page button. In packages/app/src/components/catalog/EntityPage.tsx the card is placed on the service entity page. The frontend never sees the provider key; it only sees what the backend returns."
            ),
          ],
        },
        {
          text: "The team accepts the split but asks: 'Do we really need a backend plugin? The proxy plugin is already installed -- could we just forward the paging API through it?'",
          ask: "Answer with the proxy configuration and say what it can and cannot do for this feature.",
          parts: [
            part(
              "The proxy alternative and when it is enough",
              "For read-only access to a third-party API, the backend proxy plugin can forward /api/proxy/oncall to the provider and inject the key from config (proxy.endpoints with headers) -- no backend code -- but it cannot implement the page action with authorization and auditing, so here a real backend plugin is the right call.",
              "app-config.yaml:\nproxy:\n  endpoints:\n    /oncall:\n      target: https://api.pagerprovider.example/v1\n      headers:\n        Authorization: Token ${ONCALL_API_KEY}\n      allowedMethods: [GET]\nThe proxy plugin forwards /api/proxy/oncall/* to the provider with the key added server-side -- a zero-code way to let the frontend read schedules safely. It stops at forwarding: the 'page the team' button needs a server-side decision (who may page what, logged), which only a backend plugin provides. Pattern: proxy for simple reads, backend plugin when there is logic, secrets with authorization, or writes."
            ),
          ],
        },
      ],
    },
    {
      slug: "customize-entity-page-react",
      objective: "Make changes to React code in the Backstage app: packages/app's App.tsx, Root sidebar, entity page layout and custom components",
      kind: "build",
      title: "Reshape the entity page and sidebar for service teams",
      brief:
        "Service teams at the fictional retailer Hollin & Daughters find the default entity page cluttered. They want, for Components of type service: an Overview tab with the About card, the on-call card and the Kubernetes card; a separate Dependencies tab; the CI/CD tab removed; and a new sidebar entry 'Runbooks' linking to an internal page. Other component types should keep the default layout.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Show the React changes in packages/app and explain the Backstage components used.",
          parts: [
            part(
              "Entity page structure",
              "EntityPage.tsx uses EntitySwitch with EntitySwitch.Case if={isComponentType('service')} to pick a layout per kind/type; each layout is an EntityLayout with EntityLayout.Route children (path, title) holding Grid content; the default case keeps the existing layouts.",
              "// packages/app/src/components/catalog/EntityPage.tsx\nconst serviceEntityPage = (\n  <EntityLayout>\n    <EntityLayout.Route path=\"/\" title=\"Overview\">\n      {serviceOverviewContent}\n    </EntityLayout.Route>\n    <EntityLayout.Route path=\"/dependencies\" title=\"Dependencies\">\n      <Grid container spacing={3}>\n        <Grid item xs={12} md={6}><EntityDependsOnComponentsCard variant=\"gridItem\" /></Grid>\n        <Grid item xs={12} md={6}><EntityDependsOnResourcesCard variant=\"gridItem\" /></Grid>\n      </Grid>\n    </EntityLayout.Route>\n    <EntityLayout.Route path=\"/api\" title=\"API\">{apiContent}</EntityLayout.Route>\n    <EntityLayout.Route path=\"/docs\" title=\"Docs\">{techdocsContent}</EntityLayout.Route>\n  </EntityLayout>\n);\n\nconst componentPage = (\n  <EntitySwitch>\n    <EntitySwitch.Case if={isComponentType('service')}>{serviceEntityPage}</EntitySwitch.Case>\n    <EntitySwitch.Case if={isComponentType('website')}>{websiteEntityPage}</EntitySwitch.Case>\n    <EntitySwitch.Case>{defaultEntityPage}</EntitySwitch.Case>\n  </EntitySwitch>\n);\nEntitySwitch picks the first matching case; removing the CI/CD EntityLayout.Route from serviceEntityPage drops that tab for services only, while websites and the default keep theirs."
            ),
            part(
              "Overview content with cards",
              "A Grid with EntityAboutCard, the custom EntityOnCallCard and EntityKubernetesContent (or the Kubernetes card), each in Grid items; wrapped in EntitySwitch where a card should appear only if an annotation exists (isKubernetesAvailable); explains the grid and conditional rendering helpers.",
              "const serviceOverviewContent = (\n  <Grid container spacing={3} alignItems=\"stretch\">\n    {entityWarningContent}\n    <Grid item md={6} xs={12}><EntityAboutCard variant=\"gridItem\" /></Grid>\n    <Grid item md={6} xs={12}><EntityOnCallCard /></Grid>\n    <EntitySwitch>\n      <EntitySwitch.Case if={isKubernetesAvailable}>\n        <Grid item xs={12}><EntityKubernetesContent refreshIntervalMs={30000} /></Grid>\n      </EntitySwitch.Case>\n    </EntitySwitch>\n  </Grid>\n);\nCards are React components exported by plugins; Grid (Material UI) lays them out responsively. The EntitySwitch around the Kubernetes content shows it only when the entity carries the Kubernetes annotation, so services without it do not get an empty card. entityWarningContent keeps the orphan/processing-error banners."
            ),
            part(
              "Sidebar entry",
              "In Root.tsx (packages/app/src/components/Root), add a SidebarItem with an icon, to=\"/runbooks\" (or an external href) and text \"Runbooks\" inside the SidebarGroup/SidebarScrollWrapper; for an internal route add a Route in App.tsx pointing at a page component; for an external link use an anchor-style SidebarItem.",
              "// packages/app/src/components/Root/Root.tsx\nimport MenuBookIcon from '@material-ui/icons/MenuBook';\n...\n<SidebarGroup label=\"Menu\" icon={<MenuIcon />}>\n  <SidebarItem icon={HomeIcon} to=\"catalog\" text=\"Home\" />\n  <SidebarItem icon={CreateComponentIcon} to=\"create\" text=\"Create...\" />\n  <SidebarItem icon={MenuBookIcon} to=\"runbooks\" text=\"Runbooks\" />\n  ...\n</SidebarGroup>\n// packages/app/src/App.tsx\n<Route path=\"/runbooks\" element={<RunbooksPage />} />\nSidebarItem renders a navigation entry; to is an app route (relative), so App.tsx needs a matching Route rendering RunbooksPage (a simple component with Page/Header/Content from core-components and a Link to the internal wiki, or an iframe if policy allows). For a plain external link, SidebarItem accepts an absolute URL in to."
            ),
            part(
              "Checking the change",
              "yarn tsc and yarn start, open a service entity and confirm tabs; check a website entity still has the default tabs; yarn test for existing app tests; keep the change small and in one PR with screenshots.",
              "yarn tsc && yarn start, then open /catalog/default/component/checkout-api: tabs Overview, Dependencies, API, Docs -- no CI/CD; the Overview shows About, On-call and (if annotated) Kubernetes. Open a website-type component and confirm it still shows the default tabs. yarn test runs the app's existing tests (EntityPage has none by default; the cards' plugins have their own). One PR, screenshots in the description, so the teams who asked can confirm."
            ),
          ],
        },
      ],
    },
    {
      slug: "new-plugin-and-theme",
      objective: "Create a new plugin with backstage-cli: scaffolding a frontend or backend plugin, its API client and router, and registering it with the app and backend",
      kind: "build",
      title: "Scaffold a plugin pair and give the portal the company look",
      brief:
        "The fictional airline Wardell Air wants a 'Flight Status' plugin: a page listing today's operational incidents from an internal API (needs a service token), plus the portal restyled in the company's colors with their logo. The platform team wants to use the CLI scaffolding rather than hand-writing boilerplate.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the scaffolding commands and the key files for the backend plugin, the frontend plugin and the theme, and explain how each is registered.",
          parts: [
            part(
              "Scaffold with the CLI",
              "yarn new (backstage-cli new) and choose backend-plugin (id flight-status) and plugin (frontend, id flight-status); the CLI creates plugins/flight-status-backend and plugins/flight-status with package.json, src/plugin.ts(x), a dev setup and tests, wired as workspace packages; explains the generated structure.",
              "yarn new          # select 'backend-plugin', id: flight-status  -> plugins/flight-status-backend\nyarn new          # select 'plugin', id: flight-status          -> plugins/flight-status\nEach is a Yarn workspace package (@internal/plugin-flight-status-backend, @internal/plugin-flight-status). The backend package has src/plugin.ts (createBackendPlugin), src/service/router.ts (Express router) and a dev/ harness; the frontend has src/plugin.ts (createPlugin, routable extension), src/routes.ts, src/components/ with an example page and tests, and src/api/ to add. yarn install links them into the monorepo."
            ),
            part(
              "Backend plugin: router and config",
              "plugin.ts registers an init with deps (httpRouter, logger, rootConfig, httpAuth) and mounts createRouter; the router reads flightStatus.apiToken (declared secret in config.d.ts) and exposes GET /incidents calling the internal API; packages/backend/src/index.ts adds backend.add(import('@internal/plugin-flight-status-backend')); explains the httpRouter prefix /api/flight-status and that httpRouter.addAuthPolicy can allow unauthenticated access if needed (not here).",
              "// plugins/flight-status-backend/src/plugin.ts\nexport const flightStatusPlugin = createBackendPlugin({\n  pluginId: 'flight-status',\n  register(env) {\n    env.registerInit({\n      deps: { httpRouter: coreServices.httpRouter, logger: coreServices.logger, config: coreServices.rootConfig, httpAuth: coreServices.httpAuth },\n      async init({ httpRouter, logger, config, httpAuth }) {\n        httpRouter.use(await createRouter({ logger, config, httpAuth }));\n      },\n    });\n  },\n});\n// src/service/router.ts: router.get('/incidents', async (req, res) => { await httpAuth.credentials(req); const token = config.getString('flightStatus.apiToken'); ... fetch internal API ... res.json(incidents); });\n// config.d.ts: flightStatus: { apiToken: string } with /** @visibility secret */\n// packages/backend/src/index.ts\nbackend.add(import('@internal/plugin-flight-status-backend'));\nThe router is served at /api/flight-status; httpAuth.credentials rejects unauthenticated callers by default, so only signed-in portal users reach the incidents endpoint, and the token stays server-side."
            ),
            part(
              "Frontend plugin: API client, page, registration",
              "An api/FlightStatusApi.ts with createApiRef and a client using discoveryApi.getBaseUrl('flight-status') and fetchApi; createApiFactory in plugin.ts providing it; a FlightStatusPage component using useApi(flightStatusApiRef) and core-components (Page, Header, Content, Table); the routable extension exported and added to App.tsx as a Route, plus a SidebarItem.",
              "// plugins/flight-status/src/api.ts\nexport const flightStatusApiRef = createApiRef<FlightStatusApi>({ id: 'plugin.flight-status.service' });\nexport class FlightStatusClient implements FlightStatusApi {\n  constructor(private readonly deps: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {}\n  async listIncidents() {\n    const base = await this.deps.discoveryApi.getBaseUrl('flight-status');\n    const res = await this.deps.fetchApi.fetch(`${base}/incidents`);\n    if (!res.ok) throw await ResponseError.fromResponse(res);\n    return res.json();\n  }\n}\n// src/plugin.ts\nexport const flightStatusPlugin = createPlugin({\n  id: 'flight-status',\n  routes: { root: rootRouteRef },\n  apis: [createApiFactory({ api: flightStatusApiRef, deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef }, factory: ({ discoveryApi, fetchApi }) => new FlightStatusClient({ discoveryApi, fetchApi }) })],\n});\nexport const FlightStatusPage = flightStatusPlugin.provide(createRoutableExtension({ name: 'FlightStatusPage', component: () => import('./components/FlightStatusPage').then(m => m.FlightStatusPage), mountPoint: rootRouteRef }));\n// packages/app/src/App.tsx\n<Route path=\"/flight-status\" element={<FlightStatusPage />} />\n// Root.tsx: <SidebarItem icon={FlightIcon} to=\"flight-status\" text=\"Flight Status\" />\nThe page component calls useApi(flightStatusApiRef).listIncidents() with useAsync and renders a Table from @backstage/core-components inside Page/Header/Content."
            ),
            part(
              "Theme and logo",
              "A theme created with createUnifiedTheme (and themes.light as a base) setting palette primary/secondary and navigation colors, passed to createApp's themes array with a UnifiedThemeProvider; the logo by replacing LogoFull and LogoIcon in packages/app/src/components/Root; explains that Backstage components read the theme, so Material UI components across plugins follow it.",
              "// packages/app/src/theme/wardell.ts\nexport const wardellTheme = createUnifiedTheme({\n  ...themes.light,\n  palette: {\n    ...themes.light.getTheme('v5')?.palette,\n    primary: { main: '#0B3D91' },\n    secondary: { main: '#E8B130' },\n    navigation: { background: '#0B3D91', indicator: '#E8B130', color: '#ffffff', selectedColor: '#E8B130' },\n  },\n  fontFamily: 'Inter, Roboto, sans-serif',\n});\n// App.tsx\ncreateApp({\n  apis,\n  themes: [{ id: 'wardell', title: 'Wardell Air', variant: 'light', Provider: ({ children }) => <UnifiedThemeProvider theme={wardellTheme} children={children} /> }],\n  ...\n});\nLogo: edit packages/app/src/components/Root/LogoFull.tsx and LogoIcon.tsx to render the company SVG. Because Backstage core components and Material UI read from the theme provider, every plugin's cards, tables and buttons pick up the palette without per-plugin changes."
            ),
          ],
        },
      ],
    },
  ],
};
