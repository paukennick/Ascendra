import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-157: Google Cloud Professional Cloud Developer.
//
// Aligned to the Professional Cloud Developer exam guide (PDF, read
// 2026-11-07): four sections at 32/23/24/21. Developer-level: the learner
// designs authentication, schemas, build and test pipelines, Cloud Run
// deployments and triggers, Kubernetes probes, retry logic, and reads traces
// and logs to fix a real problem. Commands and flags were checked against the
// installed Google Cloud SDK (570.0.0) help on 2026-11-07.
// Density (docs/labs.md, policy "hybrid"): 3 / 2 / 3 / 2.
//
// Figures: Cloud Run concurrency default 80 per instance, up to 1,000
// (docs.cloud.google.com/run/docs/about-concurrency); gcloud storage sign-url
// allows at most 12 hours when signing with a system-managed key (SDK help).
// Everything else is long-stable behaviour (ADC lookup order, Workload
// Identity Federation, Spanner/Bigtable key design, Kubernetes probe
// semantics, CloudEvents types, Pub/Sub at-least-once delivery).

export const GCPDEV_LABS: SeedLabSet = {
  trackCode: "GCPDEV",
  sources: [
    source("https://services.google.com/fh/files/misc/professional_cloud_developer_exam_guide_english.pdf", "exam_outline", "2026-11-07"),
    source("https://cloud.google.com/learn/certification/cloud-developer", "exam_outline", "2026-11-07"),
    source("https://docs.cloud.google.com/run/docs/about-concurrency", "reference", "2026-11-07"),
    source("https://docs.cloud.google.com/sdk/gcloud/reference", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Designing Highly Scalable, Secure, and Reliable Cloud-Native Applications (32%)
    // ----------------------------------------------------------------------
    {
      slug: "authentication-design-no-keys",
      objective:
        "Authenticating to Google Cloud services: Application Default Credentials, JWT, OAuth 2.0, Cloud SQL/AlloyDB Auth Proxy, Identity Platform, Workload Identity Federation",
      kind: "build",
      title: "Design authentication for an app with no downloaded keys",
      brief:
        "Saltmarsh Books is a fictional online bookshop. Its order service runs on Cloud Run and talks to Cloud SQL for PostgreSQL, Pub/Sub and Cloud Storage. Its web and mobile customers sign in with email/password and Google accounts. Deployments run from GitHub Actions. Today the code loads a service-account JSON key from an environment variable, the database password is in the same file, GitHub holds another JSON key as a secret, and customer sign-in is a home-grown password table. Security has banned downloaded service-account keys. Design how each party authenticates.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design authentication for the service to Google APIs, the service to the database, the CI pipeline, and end users, with the reason for each.",
          parts: [
            part(
              "Service to Google Cloud APIs",
              "Attaches a dedicated service account to the Cloud Run service and uses Application Default Credentials in the client libraries, which obtain short-lived tokens from the runtime's metadata server; removes the JSON key and explains ADC also works locally via gcloud auth application-default login, so no code change between laptop and cloud.",
              "Give the Cloud Run service its own service account (--service-account) with the roles it needs on the topic and bucket, and let the client libraries use Application Default Credentials: on Cloud Run ADC finds the attached account's short-lived token through the metadata server, and on a laptop it finds the developer's credentials from gcloud auth application-default login. The JSON key and its environment variable go away, and the code does not change between environments."
            ),
            part(
              "Service to Cloud SQL",
              "Connects through the Cloud SQL Auth Proxy or the Cloud SQL connector library (Cloud Run's built-in Cloud SQL connection) with IAM database authentication, so the service account's identity replaces the password and connections are encrypted; the database password is removed from configuration.",
              "Use Cloud Run's Cloud SQL connection (the Auth Proxy mechanism) or the Cloud SQL connector in the app, with IAM database authentication: the service account itself is the database user, authenticating with a short-lived IAM token over an encrypted connection. There is no password to store, so it leaves the config entirely."
            ),
            part(
              "GitHub Actions deployments",
              "Uses Workload Identity Federation: a workload identity pool and an OIDC provider trusting GitHub's token issuer with an attribute condition limiting it to the repository, and lets the pipeline impersonate the deployer service account; deletes the key held in GitHub.",
              "Create a workload identity pool with an OIDC provider for GitHub's token issuer (gcloud iam workload-identity-pools providers create-oidc --issuer-uri=... --attribute-mapping=... --attribute-condition limited to the Saltmarsh repository), and grant that pool's principal the right to impersonate the deployer service account. GitHub exchanges its own short-lived OIDC token for Google credentials at run time; the stored JSON key is deleted."
            ),
            part(
              "Customers",
              "Uses Identity Platform (Firebase Authentication) for email/password and Google sign-in, issuing ID tokens (JWTs) the service verifies on each request; explains the service checks the token's signature, issuer, audience and expiry rather than keeping its own password table, and that OAuth 2.0 underlies the Google sign-in flow.",
              "Move customer sign-in to Identity Platform with the email/password and Google providers. Clients receive an ID token (a signed JWT); the order service verifies its signature, issuer, audience and expiry on every request with the Admin SDK or a JWT library. Google sign-in is an OAuth 2.0 flow handled by Identity Platform, and the home-grown password table is retired."
            ),
          ],
        },
      ],
    },
    {
      slug: "schema-design-spanner-bigtable-firestore",
      objective: "Designing schemas for structured databases (AlloyDB, Spanner) and unstructured databases (Bigtable, Firestore)",
      kind: "build",
      title: "Design keys and schemas for three data stores",
      brief:
        "Pelorus Fitness is a fictional wearable company. Three stores need schemas. (1) Spanner holds Orders and OrderItems; the first draft uses an auto-incrementing integer OrderId as the primary key and a separate OrderItems table joined by OrderId. (2) Bigtable holds sensor readings: 2 million devices each write a reading every 10 seconds, and the main query is 'readings for one device over a time range'; the first draft uses the timestamp as the row key. (3) Firestore holds user profiles with each user's list of workouts; the first draft stores all workouts in an array field on the user document, and users can have thousands of workouts. Fix each design and explain the failure you avoided.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Redesign each schema: Spanner keys and table relationship, Bigtable row key, Firestore structure.",
          parts: [
            part(
              "Spanner primary key",
              "Replaces the monotonically increasing integer with a key that spreads writes, such as a UUID (version 4) stored as STRING or a bit-reversed sequence value, and explains that sequential keys concentrate writes on one split (hotspot) because Spanner ranges rows by key.",
              "Do not use an incrementing integer as the first key column: Spanner stores rows in key order across splits, so every new order lands on the same split and the write throughput collapses to one server. Use a UUID v4 as OrderId (STRING(36)) or a bit-reversed SEQUENCE value, which scatters inserts across splits."
            ),
            part(
              "Spanner OrderItems relationship",
              "Makes OrderItems an interleaved child table of Orders (PRIMARY KEY (OrderId, LineNumber), INTERLEAVE IN PARENT Orders) so an order's items are stored physically with the order and read in one locality, rather than a separate top-level table joined by foreign key.",
              "Declare OrderItems with PRIMARY KEY (OrderId, LineNumber) and INTERLEAVE IN PARENT Orders ON DELETE CASCADE. The items are then stored next to their order, so fetching an order with its lines reads one locality instead of joining two distant tables; a plain foreign key is fine for unrelated tables but not for a strict parent-child."
            ),
            part(
              "Bigtable row key",
              "Replaces the timestamp key (which hotspots on the newest rows and does not group by device) with a key that leads with a well-distributed device identifier followed by a timestamp (for example deviceId#reversedTimestamp or deviceId#timestamp), so one device's readings over a range are a contiguous scan; warns against leading with time or a sequential ID.",
              "Row key: deviceId#timestamp (or deviceId#reverse-timestamp when the newest readings are read most). All of one device's readings are then adjacent, so 'device X from 09:00 to 10:00' is a single contiguous row-range scan, and 2 million devices spread writes across the whole key space. A timestamp-first key puts every current write on one tablet and scatters a device's history everywhere."
            ),
            part(
              "Firestore structure",
              "Moves workouts out of the array into a subcollection under each user document (users/{uid}/workouts/{workoutId}), because documents have a size limit and arrays force reading and rewriting the whole document; subcollections allow querying, paging and independent writes.",
              "Make workouts a subcollection: users/{uid}/workouts/{workoutId}. A document has a hard size limit and an array of thousands of workouts means every read pulls all of them and every new workout rewrites the whole document. A subcollection lets the app query and page workouts, write one at a time, and keep the profile document small."
            ),
          ],
        },
      ],
    },
    {
      slug: "gradual-rollout-with-shared-database",
      objective: "Using traffic-splitting strategies on Cloud Run or GKE: gradual rollouts, rollbacks, A/B testing",
      kind: "case",
      title: "Run a gradual rollout of a Cloud Run service that shares a database",
      brief:
        "Saltmarsh Books (fictional) is releasing version 3 of its order service on Cloud Run. Version 3 renames the database column shipping_cost to delivery_fee and adds a new checkout flow the product team wants to A/B test on 20% of users before deciding. The service runs in one region with a 99.9% SLO.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The developer plans to run the column rename as a migration during the deploy and then split traffic 80/20 between the old and new revisions.",
          ask: "What is wrong with that plan, and how do you sequence the change so two revisions can serve at once?",
          parts: [
            part(
              "The problem",
              "Spots that during a traffic split both revisions read the same database, so renaming the column breaks the old revision (and a rollback) immediately; a split is only safe when the schema is compatible with both versions.",
              "The moment the column is renamed, the 80% of traffic on the old revision fails, and so would a rollback. A traffic split means two versions share one schema, so every schema change must work for both."
            ),
            part(
              "Expand and contract",
              "Sequences it as expand/contract: add delivery_fee alongside shipping_cost (dual-write or backfill), deploy v3 reading the new column while v2 still uses the old, split traffic, and only after v2 is retired drop shipping_cost in a later release.",
              "Expand first: add delivery_fee, backfill it from shipping_cost and have the code (or a trigger) write both. Deploy v3 to read and write delivery_fee while v2 keeps using shipping_cost. Split traffic and roll out. Contract last: once v2 is gone and nothing reads shipping_cost, drop it in a separate release."
            ),
          ],
        },
        {
          text: "With the schema made compatible, v3 is deployed with --no-traffic and the tag beta. The product team wants exactly their chosen 20% test cohort to see the new checkout, and wants to measure conversion for both groups.",
          ask: "How do you give the cohort v3 and measure the test, and what traffic split do you set?",
          parts: [
            part(
              "Routing the cohort",
              "Explains a percentage split is random per request, not per user, so an A/B test by cohort should route the cohort deliberately: the front end (or an API gateway) sends cohort users to the tagged revision's URL (beta---service-url), while the main URL serves v2; alternatively implements the A/B inside one revision with a feature flag keyed on user ID.",
              "Cloud Run's percentage split assigns requests at random, so one user could see both checkouts. For a true cohort test, route the 20% cohort to the tag URL (beta---<service-url>) from the front end or gateway while everyone else uses the main URL with 100% on v2, or ship the new checkout behind a feature flag keyed on user ID inside one revision. The traffic split stays 100% on v2 (gcloud run services update-traffic order --to-revisions=order-v2=100) during the test."
            ),
            part(
              "Measuring",
              "Tags requests or events with the variant (revision or flag) in structured logs and a conversion metric per variant (log-based or custom metric), and watches error rate and latency per revision from Cloud Run's built-in metrics, deciding on a predefined sample size and period.",
              "Log the variant on each checkout event and build a per-variant conversion metric (log-based or a custom metric), alongside Cloud Run's per-revision request count, error rate and latency. Decide in advance how many sessions and how many days the test needs; do not stop early because one day looks good."
            ),
          ],
        },
        {
          text: "The test wins and the team starts the gradual rollout: 10%, 50%, 100%. At 50%, Cloud Run's metrics show v3's 5xx rate at 2.1% against 0.05% for v2, and error budget is burning fast.",
          ask: "What do you do immediately, and what do you check before trying again?",
          parts: [
            part(
              "Immediate action",
              "Rolls back by routing 100% to the previous revision in one command (gcloud run services update-traffic --to-revisions=<v2>=100), without redeploying, because the previous revision still exists; stops the rollout before more budget burns.",
              "gcloud run services update-traffic order --region=REGION --to-revisions=order-v2=100. The old revision is still there, so this is instant and needs no build. Then stop the rollout and look."
            ),
            part(
              "Before retrying",
              "Investigates why 10% passed and 50% did not: likely a load-dependent cause such as connection pool size per instance times instance count exceeding the database's limit, concurrency settings, or a dependency quota; compares v3 and v2 logs filtered by revision, fixes, and repeats the canary with a longer bake at each step.",
              "Something that only shows at scale: with more v3 instances, per-instance connection pools may exceed the database's connection limit, or v3's concurrency and CPU settings differ, or a quota on a dependency was hit. Filter logs and traces by revision to compare v3 with v2 at the failing minute, fix the cause, and redo the rollout with a longer soak at 10% and 25% before 50%."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Building and Testing Applications (23%)
    // ----------------------------------------------------------------------
    {
      slug: "cloud-build-to-artifact-registry",
      objective: "Building and storing containers from source code with Cloud Build and Artifact Registry",
      kind: "build",
      title: "Build a container with Cloud Build and store it in Artifact Registry",
      brief:
        "Quayside Analytics, a fictional company, has a Node.js service in a Git repository with a Dockerfile. Requirements: images are built by Cloud Build on every push to main, stored in a private Docker repository in Artifact Registry in europe-west1 for project qa-ci, tagged with the commit SHA so every image is traceable to a commit, with vulnerability scanning on, and with the Cloud Build service account allowed to push and the production runtime's service account allowed only to pull. Write the repository setup, the cloudbuild.yaml, and the IAM.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the Artifact Registry setup, the build configuration, the IAM grants, and the traceability design.",
          parts: [
            part(
              "Repository",
              "Creates a Docker-format Artifact Registry repository in europe-west1 with gcloud artifacts repositories create --repository-format=docker --location=europe-west1 (optionally --immutable-tags), and enables the Container Scanning API so pushed images are scanned automatically.",
              "gcloud artifacts repositories create apps --repository-format=docker --location=europe-west1 --description=\"Quayside images\" --immutable-tags\nEnable the Container Scanning API (gcloud services enable containerscanning.googleapis.com) so Artifact Analysis scans each pushed image for vulnerabilities. Images will live at europe-west1-docker.pkg.dev/qa-ci/apps/IMAGE."
            ),
            part(
              "cloudbuild.yaml",
              "Writes steps using the docker builder to build and push with tags europe-west1-docker.pkg.dev/$PROJECT_ID/apps/svc:$COMMIT_SHA (or $SHORT_SHA), lists the image under images: so Cloud Build records it, and uses built-in substitutions; alternatively gcloud builds submit --tag for a one-off.",
              "steps:\n- name: gcr.io/cloud-builders/docker\n  args: ['build', '-t', 'europe-west1-docker.pkg.dev/$PROJECT_ID/apps/svc:$COMMIT_SHA', '-t', 'europe-west1-docker.pkg.dev/$PROJECT_ID/apps/svc:$SHORT_SHA', '.']\nimages:\n- 'europe-west1-docker.pkg.dev/$PROJECT_ID/apps/svc:$COMMIT_SHA'\n- 'europe-west1-docker.pkg.dev/$PROJECT_ID/apps/svc:$SHORT_SHA'\nListing the images makes Cloud Build push them and record their digests in the build result. A trigger on push to main runs it; for a one-off, gcloud builds submit --tag europe-west1-docker.pkg.dev/qa-ci/apps/svc:dev ."
            ),
            part(
              "IAM",
              "Grants the Cloud Build service account roles/artifactregistry.writer on the repository and the production runtime service account roles/artifactregistry.reader on it (repository-level bindings), not project-wide and not admin.",
              "gcloud artifacts repositories add-iam-policy-binding apps --location=europe-west1 --member=serviceAccount:BUILD_SA --role=roles/artifactregistry.writer\ngcloud artifacts repositories add-iam-policy-binding apps --location=europe-west1 --member=serviceAccount:RUNTIME_SA --role=roles/artifactregistry.reader\nWriter for the builder, reader for the runtime, both scoped to this repository only."
            ),
            part(
              "Traceability",
              "Tags with the commit SHA (and never only 'latest'), deploys by digest where possible, keeps tags immutable, and uses Cloud Build's provenance and the build log to link an image digest to its commit and build; notes 'latest' tags defeat traceability and rollback.",
              "Every image carries the full commit SHA as a tag and is deployed by digest (image@sha256:...), with immutable tags so a tag cannot be moved to a different image. Cloud Build's build record and provenance tie the digest to the commit and the build that produced it. A moving 'latest' tag would make 'what is running' unanswerable."
            ),
          ],
        },
      ],
    },
    {
      slug: "integration-tests-in-cloud-build",
      objective: "Executing automated integration tests in Cloud Build",
      kind: "build",
      title: "Run integration tests against emulators in Cloud Build",
      brief:
        "Quayside Analytics (fictional) wants its Cloud Build pipeline to run integration tests that exercise the service against Firestore and Pub/Sub before an image is pushed. The team's constraints: tests must not touch the real project's data, must not need a service-account key, must fail the build when a test fails, and the only secret the tests need (a third-party API token) must come from Secret Manager, not the repository. Design the pipeline steps.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe the emulator steps, how the tests reach them, the secret handling, and how failure is enforced.",
          parts: [
            part(
              "Emulators as build steps",
              "Starts the Firestore and Pub/Sub emulators in background build steps (for example gcloud emulators firestore start --host-port=0.0.0.0:8080 from the gcloud builder, and gcloud beta emulators pubsub start) that share the build's network, so the test step can reach them by the step's container name; uses waitFor so the emulators start first.",
              "Two steps using the gcloud builder start the emulators and keep running: gcloud emulators firestore start --host-port=0.0.0.0:8080 and gcloud beta emulators pubsub start --host-port=0.0.0.0:8085, each with an id and run in the background. Steps in a build share one Docker network (cloudbuild), so the test step reaches them by the step's container name. The test step lists both in waitFor."
            ),
            part(
              "Pointing the tests at the emulators",
              "Sets FIRESTORE_EMULATOR_HOST and PUBSUB_EMULATOR_HOST (and a throwaway project ID) in the test step's env, which makes the client libraries use the emulators with no credentials, so no real data and no key are involved.",
              "In the test step's env set FIRESTORE_EMULATOR_HOST=firestore:8080, PUBSUB_EMULATOR_HOST=pubsub:8085 and GOOGLE_CLOUD_PROJECT=test-project. The client libraries switch to the emulators automatically and skip authentication, so no key and no production data."
            ),
            part(
              "The secret",
              "Uses availableSecrets in cloudbuild.yaml referencing the Secret Manager version and exposes it to the test step via secretEnv, with the Cloud Build service account granted Secret Accessor on that secret; the value never appears in the repository or logs.",
              "availableSecrets:\n  secretManager:\n  - versionName: projects/$PROJECT_ID/secrets/partner-api-token/versions/latest\n    env: PARTNER_TOKEN\nand on the test step: secretEnv: ['PARTNER_TOKEN']. Grant the build service account roles/secretmanager.secretAccessor on that one secret. Cloud Build injects it as an environment variable at run time and masks it in logs."
            ),
            part(
              "Failing the build",
              "Relies on a non-zero exit code from the test runner failing the step and therefore the build, orders the push step after the tests, and puts the image push in images: or a later step so nothing is pushed when tests fail; optionally uploads the test report as an artifact.",
              "Cloud Build stops the build when a step exits non-zero, so the test runner's own failure exit is enough; the build step pushes the image only in a step (or the images: list) that comes after the tests, so a red test means no image. Save the JUnit report with artifacts: to a bucket for the record."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Configuring Cloud-Native Applications for Deployment (24%)
    // ----------------------------------------------------------------------
    {
      slug: "cloud-run-deploy-from-source",
      objective: "Deploying an application to Cloud Run from source code",
      kind: "build",
      title: "Deploy a service to Cloud Run from source with production settings",
      brief:
        "Pelorus Fitness (fictional) has a Python Flask API in a directory with a requirements.txt and no Dockerfile. It must run as the Cloud Run service api in europe-west1 (project pf-prod), accept requests only from the company's load balancer and internal callers (not the public internet), run as the service account api-sa@pf-prod.iam.gserviceaccount.com, read its database password from the Secret Manager secret db-password as an environment variable, keep at least one instance warm because the first request after idle is slow, cap scale at 20 instances, and handle up to 40 requests per instance at a time because each request is memory-heavy.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the deploy command, explain how the container is built from source, and justify the scaling and concurrency choices.",
          parts: [
            part(
              "The command",
              "Uses gcloud run deploy api --source . --region=europe-west1 with --service-account, --set-secrets=DB_PASSWORD=db-password:latest, --ingress=internal-and-cloud-load-balancing, --no-allow-unauthenticated, --min-instances=1, --max-instances=20 and --concurrency=40.",
              "gcloud run deploy api --source . --region=europe-west1 --project=pf-prod --service-account=api-sa@pf-prod.iam.gserviceaccount.com --set-secrets=DB_PASSWORD=db-password:latest --ingress=internal-and-cloud-load-balancing --no-allow-unauthenticated --min-instances=1 --max-instances=20 --concurrency=40"
            ),
            part(
              "How source becomes a container",
              "Explains that with --source and no Dockerfile, Cloud Build uses Google Cloud's buildpacks to detect the Python runtime from requirements.txt, build an image, push it to Artifact Registry and deploy it; a Dockerfile, if present, would be used instead; the app must listen on the PORT environment variable.",
              "There is no Dockerfile, so Cloud Build runs Google Cloud's buildpacks: they detect Python from requirements.txt, build an image, push it to an Artifact Registry repository in the project and deploy that image. If a Dockerfile existed it would be used instead. The app must listen on the port in the PORT environment variable or the revision will fail to start."
            ),
            part(
              "Secret and identity",
              "Explains --set-secrets mounts a Secret Manager version as the env var at start, that api-sa needs roles/secretmanager.secretAccessor on db-password, and that using a dedicated service account (not the default compute account) scopes what the service can reach.",
              "--set-secrets makes Cloud Run read db-password at instance start and expose it as DB_PASSWORD; api-sa needs roles/secretmanager.secretAccessor on that secret. Running as api-sa rather than the default Compute Engine account means the service holds only the permissions the API needs."
            ),
            part(
              "Scaling and concurrency",
              "Justifies min-instances=1 (one warm instance avoids the cold start, at the cost of paying for an idle instance), max-instances=20 (protects downstream systems and the bill), and concurrency=40 below the default of 80 because requests are memory-heavy, noting Cloud Run allows up to 1,000 per instance and that lower concurrency means more instances for the same traffic.",
              "min-instances=1 keeps one instance warm so the slow first request disappears, which costs an always-on instance. max-instances=20 stops a traffic spike from overrunning the database or the budget. concurrency=40 is half the default of 80 because each request uses a lot of memory; Cloud Run allows up to 1,000, but lower concurrency simply means more instances for the same load, which is the right trade here."
            ),
          ],
        },
      ],
    },
    {
      slug: "eventarc-and-pubsub-triggers",
      objective: "Invoking Cloud Run services with triggers: Eventarc, Pub/Sub",
      kind: "build",
      title: "Trigger a Cloud Run service from Cloud Storage and Pub/Sub events",
      brief:
        "Quayside Analytics (fictional) has a Cloud Run service ingest in europe-west1 (project qa-prod) that must run (a) whenever a file is finalised in the bucket qa-landing and (b) whenever a message is published to the Pub/Sub topic orders. The service must not be publicly invokable; only the triggers may call it. The team also asks what happens if the service throws an error while handling an event, and how to avoid processing the same file twice.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Configure both triggers, the identity and permissions, and explain delivery semantics and idempotency.",
          parts: [
            part(
              "Cloud Storage trigger via Eventarc",
              "Creates an Eventarc trigger with --event-filters type=google.cloud.storage.object.v1.finalized and bucket=qa-landing, --destination-run-service=ingest, --location=europe-west1 and --service-account for a trigger identity; notes the Cloud Storage service agent needs the Pub/Sub Publisher role for these events.",
              "gcloud eventarc triggers create landing-finalized --location=europe-west1 --destination-run-service=ingest --destination-run-region=europe-west1 --event-filters=\"type=google.cloud.storage.object.v1.finalized\" --event-filters=\"bucket=qa-landing\" --service-account=trigger-sa@qa-prod.iam.gserviceaccount.com\nThe Cloud Storage service agent must hold roles/pubsub.publisher so it can emit the events Eventarc transports."
            ),
            part(
              "Pub/Sub trigger",
              "Either creates an Eventarc trigger with type=google.cloud.pubsub.topic.v1.messagePublished using --transport-topic=orders (an existing topic), or a push subscription on orders whose --push-endpoint is the service URL with --push-auth-service-account so the push carries an OIDC token.",
              "gcloud eventarc triggers create orders-published --location=europe-west1 --destination-run-service=ingest --destination-run-region=europe-west1 --event-filters=\"type=google.cloud.pubsub.topic.v1.messagePublished\" --transport-topic=orders --service-account=trigger-sa@qa-prod.iam.gserviceaccount.com\n(Equivalent: a push subscription on orders with --push-endpoint=SERVICE_URL --push-auth-service-account=trigger-sa@..., which signs each push with an OIDC token.)"
            ),
            part(
              "Identity and permissions",
              "Deploys the service with --no-allow-unauthenticated and grants the trigger service account roles/run.invoker on the service (gcloud run services add-iam-policy-binding) and roles/eventarc.eventReceiver; nothing else can call it.",
              "The service is deployed with --no-allow-unauthenticated. Grant trigger-sa roles/run.invoker on ingest (gcloud run services add-iam-policy-binding ingest --region=europe-west1 --member=serviceAccount:trigger-sa@qa-prod.iam.gserviceaccount.com --role=roles/run.invoker) and roles/eventarc.eventReceiver on the project. Eventarc and Pub/Sub then authenticate as trigger-sa; the public cannot invoke the service."
            ),
            part(
              "Errors and duplicates",
              "Explains delivery is at-least-once: a non-2xx response makes Pub/Sub redeliver (with backoff, and optionally to a dead-letter topic after N attempts), so the handler must be idempotent, for example keyed on the object's bucket/name/generation or the message ID, recording processed keys before side effects; returns 2xx only after success.",
              "Both paths deliver at least once. If ingest returns an error, Pub/Sub retries the push with backoff; configure a dead-letter topic with --dead-letter-topic and --max-delivery-attempts so a poison message is parked, not retried forever. Because retries and duplicates are normal, make the handler idempotent: use the object's bucket, name and generation (or the Pub/Sub message ID) as a processing key, check and record it before doing the work, and return 2xx only when the work is done."
            ),
          ],
        },
      ],
    },
    {
      slug: "kubernetes-probes-for-availability",
      objective: "Implementing Kubernetes health checks to increase application availability",
      kind: "build",
      title: "Write the probes for a slow-starting service on GKE",
      brief:
        "Saltmarsh Books (fictional) runs its catalogue service on GKE. It takes 40 to 90 seconds to start because it loads a search index, listens on port 8080, exposes /healthz (returns 200 once the process is up) and /ready (returns 200 only when the index is loaded and the database is reachable). Today the Deployment has no probes, so rollouts send traffic to pods that cannot answer yet, and a pod that deadlocks keeps receiving requests until someone notices. A previous attempt added a liveness probe with a 10-second initial delay, which restarted every pod in a loop. Write the probes and explain each number.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the startupProbe, readinessProbe and livenessProbe, explain why the earlier attempt looped, and name one pitfall.",
          parts: [
            part(
              "Startup probe",
              "Adds a startupProbe on /healthz (or /ready) with periodSeconds and failureThreshold that together allow at least the 90-second worst case (for example periodSeconds 5, failureThreshold 24 = 120 s), explaining that while it runs, liveness and readiness are disabled.",
              "startupProbe:\n  httpGet: { path: /healthz, port: 8080 }\n  periodSeconds: 5\n  failureThreshold: 24\nThat allows up to 120 seconds for the slowest start. Until the startup probe succeeds, Kubernetes holds off the liveness and readiness probes, so a slow start is never mistaken for a hang."
            ),
            part(
              "Readiness probe",
              "Adds a readinessProbe on /ready with a short period (for example 5-10 s) and a small failureThreshold, explaining that failing readiness removes the pod from Service endpoints without restarting it, which is right for 'index not loaded' or 'database unreachable'.",
              "readinessProbe:\n  httpGet: { path: /ready, port: 8080 }\n  periodSeconds: 5\n  failureThreshold: 3\nReadiness decides whether the pod receives traffic. When /ready fails, the pod is taken out of the Service's endpoints but not restarted, which is exactly right for a loaded-index or database dependency that may come back."
            ),
            part(
              "Liveness probe and why the loop happened",
              "Adds a livenessProbe on /healthz with a moderate period and failureThreshold (for example period 10 s, failureThreshold 3) so a deadlocked process is restarted, and explains the earlier loop: a 10-second initial delay on a 40-90 second start meant liveness failed before the app was up and kubelet killed it every time; the startup probe fixes that.",
              "livenessProbe:\n  httpGet: { path: /healthz, port: 8080 }\n  periodSeconds: 10\n  failureThreshold: 3\nThe old probe started checking 10 seconds in, the app needed 40-90, so every pod was killed before it could answer, restarted, and killed again. With the startup probe gating liveness, this probe only runs once the process is up, and three consecutive failures (30 seconds) mean a genuine hang worth a restart."
            ),
            part(
              "Pitfall",
              "Names a pitfall: liveness checks that test dependencies (database, downstream) cause restart storms when a dependency is down, so liveness should check only the process itself while readiness checks dependencies; or probes with timeouts shorter than the handler's response time under load.",
              "Never put dependency checks in liveness: if the database goes down and /healthz checked it, every pod would be restarted in a storm, making the outage worse. Liveness checks only that the process is alive; readiness checks the dependencies. Also keep timeoutSeconds generous enough that a busy pod is not marked dead for being slow."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Integrating Applications with Google Cloud Services (21%)
    // ----------------------------------------------------------------------
    {
      slug: "retry-with-exponential-backoff",
      objective: "Handling API errors with exponential backoff",
      kind: "build",
      title: "Write the retry policy for a service that calls Google Cloud APIs",
      brief:
        "Pelorus Fitness (fictional) has a sync service that writes workout records to Firestore and uploads files to Cloud Storage. Under load it sees occasional 429 and 503 responses and, in one incident, retried a failing call in a tight loop 10,000 times in a minute, which made the throttling worse. It also once retried a request that had actually succeeded and created a duplicate record. Write the retry policy the team should implement (or configure in the client library) and explain each rule.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify what to retry, how to back off, when to stop, and how to make retries safe.",
          parts: [
            part(
              "What to retry",
              "Retries transient failures only: HTTP 429 (rate limited), 5xx such as 500/502/503/504 (and gRPC UNAVAILABLE, RESOURCE_EXHAUSTED, DEADLINE_EXCEEDED where appropriate), and network timeouts; does not retry 400, 401, 403, 404 or 409-type errors, which will not succeed on repeat.",
              "Retry only what can succeed next time: 429 and 5xx responses (gRPC UNAVAILABLE, RESOURCE_EXHAUSTED, ABORTED, and DEADLINE_EXCEEDED for idempotent calls) and connection timeouts. Never retry 400, 401, 403, 404 or a validation error: repeating them only adds load."
            ),
            part(
              "How to back off",
              "Uses truncated exponential backoff with jitter: wait base x 2^n plus a random component, cap the wait at a maximum (for example tens of seconds), and honour a Retry-After header if present; explains jitter prevents synchronised retry storms from many clients.",
              "Truncated exponential backoff with full jitter: on attempt n wait a random time between 0 and min(cap, base x 2^n), for example base 1 second and a cap of about 32-64 seconds, and honour Retry-After when the response includes it. Doubling spreads retries out; the random jitter stops thousands of clients retrying in lockstep, which is what turned one throttle into a storm."
            ),
            part(
              "When to stop",
              "Caps total attempts or total elapsed time (a retry deadline), then surfaces the error to the caller or a dead-letter path, and adds a circuit breaker or concurrency limit so a struggling dependency is not hammered.",
              "Give each operation a total retry deadline (for example 60 seconds or 5 attempts), after which the error is returned or the item is parked for later. Add a circuit breaker: if most calls to a dependency are failing, stop calling for a while instead of retrying 10,000 times a minute."
            ),
            part(
              "Making retries safe",
              "Requires idempotency for anything retried: use deterministic document IDs or a client-generated idempotency key for Firestore writes, resumable uploads or object generation preconditions for Cloud Storage, so a retry of a request that actually succeeded cannot create a duplicate; notes most Google client libraries implement this backoff for idempotent calls when configured.",
              "Only retry what is idempotent, or make it so: write the workout with a deterministic document ID (user + workout ID) so a repeated write overwrites rather than duplicates; for Cloud Storage use resumable uploads and generation-match preconditions so a retried upload does not clobber or duplicate. The Google client libraries already implement this backoff for idempotent operations when configured, so prefer their retry settings to a hand-rolled loop."
            ),
          ],
        },
      ],
    },
    {
      slug: "diagnose-latency-with-observability",
      objective: "Identifying and resolving issues using Google Cloud Observability",
      kind: "case",
      title: "Find and fix a latency regression with traces, logs and Error Reporting",
      brief:
        "Saltmarsh Books (fictional) deployed a new revision of its order service on Cloud Run yesterday. Since then the p95 latency of GET /orders/{id} has risen from 120 ms to 1.4 s and customers are complaining, but the error rate is unchanged. The service calls Firestore and an internal inventory service; it emits OpenTelemetry traces to Cloud Trace and structured logs.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You open Cloud Trace and filter to GET /orders/{id} with latency over one second. A slow trace shows the root span at 1.38 s, under it one 30 ms span for the inventory call, and then 48 consecutive Firestore 'get document' spans of about 25 ms each.",
          ask: "What does the waterfall tell you, and what is the likely code change?",
          parts: [
            part(
              "Reading the waterfall",
              "Identifies an N+1 pattern: dozens of sequential small Firestore reads whose durations add up to the latency (48 x 25 ms = 1.2 s), not one slow dependency; the inventory call is fine; the problem is in how the new code fetches data.",
              "Forty-eight sequential 25-millisecond reads are 1.2 seconds on their own: this is an N+1 problem, a loop fetching one document per order line, not a slow backend. Firestore and the inventory service are each healthy; the new revision changed how data is read."
            ),
            part(
              "Confirming it",
              "Correlates the trace to logs via the trace ID (logs carrying logging.googleapis.com/trace show the request's log lines next to the spans) and compares a trace from the previous revision, which should show one batched read, to confirm the regression came with the deploy.",
              "Open the trace's correlated logs (the structured logs carry the trace ID, so Logs Explorer shows this request's lines) to see which code path ran, then pull a trace from the previous revision for the same endpoint: if it shows one batched read where the new one shows 48, the deploy is the cause."
            ),
          ],
        },
        {
          text: "The previous revision's trace shows a single 'batch get' span of 40 ms. The new code iterates over order lines and calls get() for each product. Meanwhile Error Reporting shows a new error group, 'DeadlineExceeded in getProduct', with 300 occurrences in the last hour, which nobody noticed because the service's overall error rate is still low.",
          ask: "Fix the latency, and say what to do about the error group and the fact nobody noticed it.",
          parts: [
            part(
              "The fix",
              "Replaces the per-line reads with a single batched read (getAll / batch get of all product documents) or a query, optionally concurrent reads, and verifies with a new trace that the endpoint is back to one short Firestore span; rolls back traffic first if the fix will take time.",
              "Route traffic back to the previous revision now, then fix the code to fetch all product documents in one batched read (getAll on the list of references) or run the reads concurrently, redeploy, and confirm with a fresh trace that the request shows one short Firestore span and p95 is back near 120 ms."
            ),
            part(
              "Error group and detection",
              "Treats DeadlineExceeded as the same problem's tail (slow fan-out reads hitting the client deadline), links the error group to the fix and marks it resolved so a recurrence reopens it, and adds alerting: an Error Reporting notification for new error groups and an SLO-based latency alert, since the error-rate alert alone missed this.",
              "DeadlineExceeded is the tail of the same fan-out: the slowest requests ran past the Firestore client deadline. After the fix, mark the error group resolved in Error Reporting so a recurrence reopens and notifies. And change detection: turn on notifications for new error groups, and add a latency SLO (for example 99% of GET /orders under 300 ms) with a burn-rate alert, because a 10x latency increase with a flat error rate is exactly what an error-rate alert cannot see."
            ),
          ],
        },
      ],
    },
  ],
};
