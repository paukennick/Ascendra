import { GENERAL_SAFETY, matchPart, numericPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-268: Microsoft Certified: Azure AI Cloud Developer Associate (AI-200),
// the replacement of AZ-204 (retired 2026-07-31).
//
// Aligned to the AI-200 study guide (no skills-measured date printed;
// published 2026-04-15, updated 2026-11-05; read 2026-11-14): Develop
// containerized solutions 20-25% / Develop AI solutions by using Azure data
// management services 25-30% / Connect to and consume Azure services 20-25% /
// Secure, monitor, and troubleshoot 20-25%. Density (docs/labs.md,
// "hybrid"): one lab per domain plus six weighted extras -> 3 / 3 / 2 / 2 =
// 10 labs, all build.
//
// Every service behavior quoted was read on learn.microsoft.com on
// 2026-11-14 (sources[] lists the pages): Key Vault references and their
// 24-hour refresh, Container Apps revision modes, traffic weights and KEDA
// Service Bus rules, Cosmos DB partitioning and consistency levels, pgvector
// operators, Service Bus dead-lettering, Event Grid retry defaults, and the
// AppRequests table. The pgvector SQL uses only operators listed on the
// Azure page; it was not run (pgvector is not installed on the local test
// server). Organizations are fictional.

export const AI200_LABS: SeedLabSet = {
  trackCode: "AI200",
  sources: [
    source("https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/ai-200", "exam_outline", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/container-apps/revisions", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/container-apps/traffic-splitting", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/container-apps/scale-app", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/cosmos-db/index-policy", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/postgresql/extensions/how-to-use-pgvector", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-dead-letter-queues", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/service-bus-messaging/compare-messaging-services", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/event-grid/delivery-and-retry", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/key-vault/secrets/tutorial-rotation", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/apprequests", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/kusto/query/", "reference", "2026-11-14"),
  ],
  labs: [
    // ---------------------------------------------- Containerized solutions (3)
    {
      slug: "ai200-app-service-key-vault-reference",
      objective: "Running a container on App Service with app settings and Key Vault-backed secrets",
      kind: "build",
      title: "Move a container's database password out of its app settings",
      brief:
        "Bluegill Recipes' (fictional) summarizer container runs on App Service. Its DB_PASSWORD is a plain-text app setting, and the security team wants it in Key Vault (RBAC permission model), rotated monthly, with no code change.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Order the setup, write the app setting value, and say when the app sees a rotated secret.",
          parts: [
            orderPart(
              "Setup steps",
              "Enable a managed identity on the app; grant it Key Vault Secrets User on the vault; store the password as a secret; set DB_PASSWORD to a Key Vault reference; confirm the reference resolves.",
              "1) Turn on a system-assigned (or attach a user-assigned) managed identity for the app. 2) Assign that identity Key Vault Secrets User on the vault (RBAC model; with access policies it would be Get on secrets). 3) Create the secret, e.g. db-password. 4) Change the app setting to a Key Vault reference. 5) Check the setting shows as resolved in the portal; the container still reads the environment variable DB_PASSWORD.",
              [
                "Enable a managed identity on the app",
                "Grant the identity Key Vault Secrets User on the vault",
                "Store the password as a Key Vault secret",
                "Set DB_PASSWORD to a Key Vault reference",
                "Confirm the reference shows as resolved",
              ]
            ),
            part(
              "Setting value",
              "@Microsoft.KeyVault(SecretUri=https://<vault>.vault.azure.net/secrets/db-password) or @Microsoft.KeyVault(VaultName=<vault>;SecretName=db-password), with no version so rotation is picked up.",
              "@Microsoft.KeyVault(VaultName=bluegill-kv;SecretName=db-password)\n(or SecretUri=https://bluegill-kv.vault.azure.net/secrets/db-password). Leave the version out so the app follows the latest version."
            ),
            numericPart(
              "Hours until a rotated secret is used",
              "Within 24 hours (App Service caches references and refetches every 24 hours); any configuration change restarts the app and refetches immediately.",
              "Unversioned references move to the latest version within 24 hours, because App Service caches Key Vault references and refetches them every 24 hours. Any configuration change restarts the app and refetches at once -- so a rotation job can touch a setting to force it.",
              { answer: 24, tolerance: 0 }
            ),
          ],
        },
      ],
    },
    {
      slug: "ai200-keda-service-bus-scale",
      objective: "Scaling a Container App on queue length or HTTP load with KEDA scale rules",
      kind: "build",
      title: "Scale a summarization worker on its Service Bus queue",
      brief:
        "Bluegill Recipes' (fictional) worker container reads jobs from the Service Bus queue summarize-jobs. Each replica can handle about 5 queued messages at a time. Overnight the queue is empty for hours; at lunchtime it reaches 200 messages. The team wants zero cost when idle and at most 20 replicas.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe the scale rule and limits, compute the replicas at 200 messages, and say how the rule authenticates.",
          parts: [
            part(
              "Rule and limits",
              "A custom KEDA scale rule of type azure-servicebus with queueName summarize-jobs and messageCount 5; min replicas 0 and max replicas 20; notes that scaling to zero means no usage charges but adds start-up latency for the first job.",
              "Custom scale rule: type azure-servicebus, metadata queueName: summarize-jobs, messageCount: \"5\". Scale limits: minimum 0 replicas, maximum 20. At zero replicas there are no usage charges; the first message after idle waits for a replica to start, so set min to 1 if that latency matters."
            ),
            numericPart(
              "Replicas at 200 messages",
              "20 (200 / 5 = 40 wanted, capped at the maximum of 20).",
              "KEDA targets about one replica per 5 messages: 200 / 5 = 40, which the max-replicas limit caps at 20.",
              { answer: 20, tolerance: 0 }
            ),
            part(
              "Authentication",
              "Authenticates the scaler with a managed identity granted a Service Bus data role (or a connection string stored as a Container Apps secret), never a literal connection string in the rule.",
              "Give the scale rule an identity (the app's managed identity with Azure Service Bus Data Receiver/Owner as the scaler requires) or reference a Container Apps secret holding the connection string. Never paste the connection string into the rule's metadata."
            ),
          ],
        },
      ],
    },
    {
      slug: "ai200-revision-traffic-split",
      objective: "Deploying to Container Apps environments and splitting traffic between revisions",
      kind: "build",
      title: "Canary a new model version with revision weights",
      brief:
        "Bluegill Recipes' (fictional) API container app runs in the default revision mode. The team wants to send 10% of traffic to a new revision that calls a newer model, watch errors for a day, then move everyone over -- and be able to roll back instantly.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Say what must change about the revision mode, give the traffic command, and describe the rollback.",
          parts: [
            part(
              "Revision mode",
              "The default is single revision mode, which replaces the old revision once the new one is ready; canary needs multiple revision mode so two revisions are active at once.",
              "Single revision mode (the default) activates the new revision and moves all traffic to it once its replicas are running, then deprovisions the old one -- no split is possible. Switch the app to multiple revision mode so both revisions stay active."
            ),
            part(
              "Traffic command",
              "az containerapp ingress traffic set with --revision-weight old=90 new=10 (or --label-weight with labels); weights must total 100.",
              "az containerapp ingress traffic set --name bluegill-api --resource-group rg-bluegill --revision-weight bluegill-api--v1=90 bluegill-api--v2=10\n\nThe weights of all rules must add up to 100. Labels (--label-weight stable=90 canary=10) keep the command stable across deployments."
            ),
            part(
              "Promotion and rollback",
              "Promote by moving weight to 100 on the new revision; roll back by setting the old revision back to 100 (it is still active), then deactivate the bad revision; a label URL lets testers hit the canary directly.",
              "After a clean day, set v2=100 (and later deactivate v1). If errors rise, set v1=100 immediately -- v1 is still running, so rollback is a traffic change, not a redeploy. A revision label also gives the canary its own URL for direct testing."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- Data management services (3)
    {
      slug: "ai200-cosmos-partition-key",
      objective: "Querying Cosmos DB for NoSQL from the SDK with a partition key that keeps queries in one partition",
      kind: "build",
      title: "Choose a partition key for chat history",
      brief:
        "Bluegill Recipes' (fictional) assistant stores chat messages in Cosmos DB for NoSQL: { id, userId, conversationId, role, text, ts }. The app's main reads are \"load the last 50 messages of one conversation\" and \"list a user's conversations\". Millions of users; a few users have thousands of conversations.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Rate the candidate keys and choose one, then say what happens to a query that omits the partition key.",
          parts: [
            matchPart(
              "Candidate keys",
              "/id -> great write spread and point reads, but every conversation query is cross-partition; /role -> only a few values, so hot partitions; /conversationId -> high cardinality and matches the main read, so conversation loads stay in one partition; /userId -> matches the second read, but a heavy user concentrates data and load in one logical partition (hierarchical keys /userId then /conversationId are an option).",
              "A good key has many values AND matches how queries filter. /id spreads writes perfectly, but any query that filters on other properties becomes cross-partition. /role has three values -- hot partitions. /conversationId matches the hottest read. /userId fits listing conversations but lets one heavy user dominate a partition.",
              {
                left: ["/id", "/role", "/conversationId", "/userId"],
                right: [
                  "Even writes, but conversation queries go cross-partition",
                  "Too few values: hot partitions",
                  "Matches the main read and has many values",
                  "Matches listing, but heavy users concentrate load",
                ],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Query without the key",
              "A query that doesn't filter on the partition key fans out to every physical partition (cross-partition), costing more RUs and latency; supply the key (e.g. queryItems with a partitionKey option or WHERE c.conversationId = @id) and use point reads (id + key) where possible.",
              "Without the partition key the query is sent to every physical partition and the RU charge and latency grow with the container. Pass the key (the SDK's partition key option, or WHERE c.conversationId = @id) so it hits one logical partition; reading one item by id plus partition key is a point read, the cheapest operation."
            ),
          ],
        },
      ],
    },
    {
      slug: "ai200-cosmos-consistency-and-index",
      objective: "Cutting RU cost with indexing policies and choosing a consistency level for the read pattern",
      kind: "build",
      title: "Lower RU cost without breaking read-your-writes",
      brief:
        "Bluegill Recipes' (fictional) chat container indexes every property, including a large text field and a 1,536-number embedding, and the account uses Strong consistency in one region. Writes cost far more RUs than expected. Users must always see their own last message when the page reloads.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Order the consistency levels, pick one for this app, and change the indexing policy.",
          parts: [
            orderPart(
              "Consistency levels, strongest to weakest",
              "Strong, Bounded staleness, Session, Consistent prefix, Eventual.",
              "Strong > Bounded staleness > Session > Consistent prefix > Eventual.",
              ["Strong", "Bounded staleness", "Session", "Consistent prefix", "Eventual"]
            ),
            part(
              "Level for this app",
              "Session: within a client session it guarantees read-your-writes (users see their own message), at lower cost and latency than Strong; notes the session token must be shared if several clients write for one user.",
              "Session consistency guarantees read-your-writes and write-follows-reads within a client session -- exactly \"users see their own last message\" -- while costing less than Strong. If the web tier spreads one user over several SDK clients, pass the session token along."
            ),
            part(
              "Indexing policy",
              "Excludes the large text field and the embedding array from the range index (excludedPaths such as /text/? and /embedding/*), keeps paths used in filters and ORDER BY, and adds a vector index (and vector embedding policy) for the embedding instead of indexing each number.",
              "\"excludedPaths\": [ { \"path\": \"/text/?\" }, { \"path\": \"/embedding/*\" } ]\n\nKeep included paths for conversationId, userId and ts (used in filters and ORDER BY). Index the embedding with a vector index (flat, quantizedFlat or DiskANN) defined alongside a vector embedding policy, rather than as 1,536 range-indexed numbers. Fewer indexed paths means fewer RUs per write."
            ),
          ],
        },
      ],
    },
    {
      slug: "ai200-pgvector-rag-filter",
      objective: "Building a RAG retrieval query that combines vector similarity with metadata filters",
      kind: "build",
      title: "Retrieve the right recipe chunks for one tenant",
      brief:
        "Bluegill Recipes (fictional) stores document chunks in Azure Database for PostgreSQL:\n\nchunks(id bigint, tenant_id int, lang text, content text, embedding vector(1536))\n\nThe assistant must return the 5 chunks most similar (by cosine distance) to the question's embedding, only for the asking tenant and in English. The embeddings come from a model that recommends cosine similarity.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Enable the extension, write the retrieval query, and say how to keep it fast.",
          parts: [
            part(
              "Enabling pgvector",
              "Adds vector to the server's allowlist (azure.extensions) and runs CREATE EXTENSION vector in each database that needs it -- the extension's name is vector, not pgvector.",
              "On Azure Database for PostgreSQL flexible server, first allowlist the extension (server parameter azure.extensions; SHOW azure.extensions checks it), then in the database run CREATE EXTENSION vector; -- repeated for every database that needs it."
            ),
            part(
              "Retrieval query",
              "Filters on tenant_id and lang in WHERE, orders by embedding <=> $1 (cosine distance; smaller is closer), LIMIT 5, and returns content (and the distance).",
              "SELECT id, content, embedding <=> $1 AS distance\nFROM chunks\nWHERE tenant_id = $2 AND lang = 'en'\nORDER BY embedding <=> $1\nLIMIT 5;\n\n<=> is cosine distance (<-> is Euclidean, <#> negative inner product). Distance, unlike similarity, is smaller for closer vectors, so ascending order gives the best matches. The tenant filter is also a security boundary: never retrieve across tenants and filter afterward."
            ),
            part(
              "Keeping it fast",
              "Creates an approximate index matching the operator (e.g. HNSW with vector_cosine_ops) plus a B-tree on (tenant_id, lang); notes that ANN indexes trade recall for speed and that a selective metadata filter can return fewer than 5 rows from an ANN scan, so test recall; sizes memory for the index.",
              "CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);\nCREATE INDEX ON chunks (tenant_id, lang);\n\nThe vector index must use the operator class of the query's operator (cosine here). Approximate indexes trade some recall for speed; with a very selective tenant filter, check that the query still returns 5 good rows, and give the server enough memory to keep the index cached."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- Connect to and consume services (2)
    {
      slug: "ai200-service-bus-dead-letter",
      objective: "Handling poison messages through the dead-letter queue and resubmitting them",
      kind: "build",
      title: "Find out why summarization jobs keep vanishing",
      brief:
        "Bluegill Recipes' (fictional) worker receives jobs from the summarize-jobs queue in peek-lock mode. Jobs with a corrupt PDF crash the worker before it settles the message. Operators notice those jobs disappear from the queue after a while and never finish.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain where the jobs went, give the default delivery limit, and describe how to handle them properly.",
          parts: [
            numericPart(
              "Default maximum delivery count",
              "10, the default maximum delivery count for a queue or subscription.",
              "Each time a peek-locked message is abandoned or its lock expires (as when the worker crashes before settling), its delivery count rises. Past the maximum delivery count -- 10 by default -- Service Bus moves it to the dead-letter queue with reason MaxDeliveryCountExceeded. This cannot be turned off.",
              { answer: 10, tolerance: 0 }
            ),
            part(
              "Where they went",
              "The dead-letter sub-queue (summarize-jobs/$deadletterqueue), reason MaxDeliveryCountExceeded; the SDK reaches it with the dead-letter subqueue option.",
              "They are in summarize-jobs/$deadletterqueue with DeadLetterReason MaxDeliveryCountExceeded. With the SDK, create a receiver with the dead-letter subqueue option (for .NET, SubQueue.DeadLetter) instead of building the path."
            ),
            part(
              "Proper handling",
              "Catch the bad-input error and explicitly dead-letter the message with a reason and description (rather than crashing and burning ten retries); monitor the DLQ count with an alert; after fixing the cause, resubmit by receiving from the DLQ and sending a copy to the main queue, then completing the DLQ message.",
              "Validate the PDF; on a permanent failure call dead-letter on the message with a reason such as CorruptPdf, so it does not retry ten times. Alert on the DLQ message count. After a fix, a repair tool reads each dead-lettered message, sends a new copy to summarize-jobs, and completes the dead-lettered one -- there is no automatic cleanup or retry of the DLQ: messages stay there until a receiver completes them."
            ),
          ],
        },
      ],
    },
    {
      slug: "ai200-event-grid-retry",
      objective: "Routing custom events with Event Grid subscriptions, filters and retry policies",
      kind: "build",
      title: "Route upload events and decide what happens on failure",
      brief:
        "When a user uploads a recipe file, Bluegill Recipes (fictional) wants three reactions: a thumbnail function for images only, a summarization job that must not be lost and may take minutes, and a webhook to a partner that is sometimes down for hours.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the routing for each reaction, then give Event Grid's default retry limits and what happens when they run out.",
          parts: [
            matchPart(
              "Routing per reaction",
              "Thumbnails -> Event Grid subscription to BlobCreated with a subject filter (e.g. ends with .jpg/.png) to a Function; summarization -> Event Grid delivers to a Service Bus queue that the worker reads (durable, high-value work item); partner webhook -> Event Grid webhook subscription with a retry policy and a dead-letter destination.",
              "Event Grid distributes lightweight event notifications and supports filters on event type and subject. A summarization job is a high-value message that must be processed reliably, which is Service Bus's role, so Event Grid delivers into a queue. The partner webhook relies on Event Grid's retries and dead-lettering.",
              {
                left: ["Thumbnail for images only", "Summarization job that must not be lost", "Partner webhook that is sometimes down"],
                right: ["Event Grid subscription with a subject filter to a Function", "Event Grid to a Service Bus queue read by the worker", "Event Grid webhook with retry policy and dead-letter storage", "Poll the storage account every minute"],
                pairs: [0, 1, 2],
              }
            ),
            numericPart(
              "Default maximum delivery attempts",
              "30, with a default event time-to-live of 1,440 minutes (24 hours); delivery stops at whichever limit is reached first.",
              "Defaults: up to 30 delivery attempts and an event time-to-live of 1,440 minutes (24 hours), with exponential backoff; Event Grid stops at whichever limit comes first.",
              { answer: 30, tolerance: 0 }
            ),
            part(
              "When retries run out",
              "Without dead-lettering configured, the event is dropped; with a dead-letter destination (a storage container), it is written there for later processing; some configuration errors (deleted endpoint) skip retries.",
              "If no dead-letter destination is configured, Event Grid drops the event. Configure a storage container as the dead-letter destination so undelivered events are kept for replay. Errors that retrying cannot fix, such as a deleted endpoint, go straight to dead-lettering (or are dropped without it)."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- Secure, monitor, troubleshoot (2)
    {
      slug: "ai200-key-vault-rotation",
      objective: "Reading secrets from Key Vault with a managed identity and planning their rotation",
      kind: "build",
      title: "Plan rotation for a single-credential database password",
      brief:
        "Bluegill Recipes' (fictional) Function app reads a SQL login password from Key Vault through its managed identity. The database supports only one active password for that login. Policy: rotate every 60 days without downtime.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe the automated rotation flow and how the app avoids reading a stale password.",
          parts: [
            orderPart(
              "Rotation flow",
              "Key Vault raises a near-expiry event; Event Grid triggers a rotation function; the function generates a new password and sets it on the database; it stores the password as a new secret version with a new expiry; apps pick up the latest version.",
              "1) The secret is near its expiry date, and Key Vault publishes a near-expiry event. 2) Event Grid triggers the rotation function. 3) The function creates a new password and sets it on the SQL login. 4) It writes that password as a new version of the secret with the next expiry date. 5) Apps reading the unversioned secret get the new value.",
              [
                "Key Vault publishes a secret near-expiry event",
                "Event Grid triggers the rotation function",
                "The function sets a new password on the database",
                "The function stores it as a new secret version",
                "Apps read the latest version",
              ]
            ),
            part(
              "Avoiding stale reads",
              "Read the secret without pinning a version and cache it briefly; on an authentication failure, re-read from Key Vault and retry once; for App Service Key Vault references, know the up-to-24-hour refresh (or restart); with a single credential there is a short window -- the two-credential pattern removes it.",
              "Fetch the unversioned secret with the managed identity (DefaultAzureCredential and the Key Vault secrets client), cache it for minutes, not days, and on a login failure re-read and retry once. If the app uses Key Vault references in app settings, the cached value can lag up to 24 hours unless the app restarts. With one credential there is a brief gap between the database change and the app's next read; resources that allow two credentials can rotate them alternately to avoid it."
            ),
          ],
        },
      ],
    },
    {
      slug: "ai200-kql-failing-dependency",
      objective: "Analyzing logs and metrics with KQL to find errors, slow calls and their causes",
      kind: "build",
      title: "Write the KQL that finds which operation is failing",
      brief:
        "Bluegill Recipes' (fictional) API sends OpenTelemetry data to Application Insights (workspace-based). Since this morning users see intermittent 500 errors. The AppRequests table has columns TimeGenerated, OperationName, ResultCode, Success, DurationMs and AppRoleName.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write a query for the last 6 hours that ranks operations by failure count with their failure rate and 95th-percentile duration.",
          parts: [
            part(
              "Query",
              "AppRequests | where TimeGenerated > ago(6h) | summarize total = count(), failed = countif(Success == false), p95 = percentile(DurationMs, 95) by OperationName, AppRoleName | extend failRate = round(100.0 * failed / total, 1) | where failed > 0 | order by failed desc (or top 10 by failed).",
              "AppRequests\n| where TimeGenerated > ago(6h)\n| summarize total = count(),\n            failed = countif(Success == false),\n            p95 = percentile(DurationMs, 95)\n    by OperationName, AppRoleName\n| extend failRate = round(100.0 * failed / total, 1)\n| where failed > 0\n| order by failed desc\n\nEach operator takes the table from the previous one through the pipe."
            ),
            selectPart(
              "Lines that would break or mislead the query",
              "Selects the line using a SQL-style WHERE clause and the line that divides integers without converting (100 * failed / total, which truncates); the others are valid KQL.",
              "KQL has no SELECT ... WHERE syntax at the start; a query begins with the table and pipes. 100 * failed / total divides longs and truncates (e.g. 0 instead of 2.5), so multiply by 100.0. The remaining lines are valid.",
              {
                lines: [
                  "AppRequests",
                  "SELECT * FROM AppRequests WHERE Success = false",
                  "| where TimeGenerated > ago(6h)",
                  "| extend failRate = 100 * failed / total",
                  "| order by failed desc",
                ],
                correct: [1, 3],
                display: "config",
              }
            ),
            part(
              "Next step",
              "Pivots to the failing operation's dependencies or exceptions (AppDependencies / AppExceptions joined on OperationId, or the end-to-end transaction view) to find the downstream call that fails, using the trace correlation OpenTelemetry provides.",
              "Take the top OperationName and look at its AppDependencies and AppExceptions for the same period, joined on OperationId (or open one failed request in the end-to-end transaction view). OpenTelemetry's trace context ties the request to the downstream call -- for example a database or model endpoint timing out."
            ),
          ],
        },
      ],
    },
  ],
};
