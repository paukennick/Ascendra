# Sim coverage: the seven technology courses of REQ-264..268 (REQ-269)

Written 2026-11-14 for Nick's instruction of the same day: sims for the new
courses follow coverage, not a count; build a sim for every objective that
fits the selection rule on a screen that already exists, and propose a screen
where a whole family needs one that does not.

Courses: PCEP, PCAP (Python Institute), SQL (SQL Fundamentals Coach), TSNODE
(TypeScript & Node.js Programming Coach), PL300 (Power BI Data Analyst),
SC500 (Cloud and AI Security Engineer) and AI200 (Azure AI Cloud Developer).

## How the map was made

- **Objectives** are each course's active sub-objectives in the seeded
  catalog (`backend/supabase/seed/catalog.ts`): 287 across the seven courses.
- **Keyword screen** is the generator's `selectionFor`
  (`lib/sim/generator/selection.ts`, two of Nick's four criteria matched by
  words in the title). It passes only 12 of the 287 here, because these
  titles are written as skills ("Writing ...", "Configuring ...") rather than
  as situations; it under-counts badly for these courses, so it is shown but
  not used to decide.
- **Fits (judgement)** applies Nick's rule (2026-11-10) to what the objective
  is about: a sim fits when an incident or task built on it has at least two
  of time that matters, cues to read, choices with consequences, and
  competing priorities. These are my calls, not Nick's; he can overrule any.
- **Screen**: an existing renderer that can carry the case (terminal,
  security console, architecture board), or **data and code console**, the
  renderer designed in docs/sims.md 20.1 but not built.
- **Covered** means a seeded sim names the objective as its primary
  `objective`; secondaries are noted but not counted.

## Summary

| Course | Objectives | Keyword screen | Fits (judgement) | Fits on an existing screen | Sims | Covered |
|---|---|---|---|---|---|---|
| PCEP | 34 | 1 | 2 | 0 | 0 | 0 |
| PCAP | 42 | 0 | 6 | 3 | 0 | 0 |
| SQL | 44 | 1 | 8 | 8 | 2 | 2 |
| TSNODE | 37 | 0 | 8 | 8 | 2 | 2 |
| PL300 | 50 | 1 | 10 | 0 | 0 | 0 |
| SC500 | 53 | 8 | 22 | 22 | 2 | 2 |
| AI200 | 27 | 1 | 11 | 11 | 2 | 2 |
| **Total** | **287** | **12** | **67** | **52** | **8** | **8** |

So 8 of the 52 objectives that fit an existing screen are covered; 44 remain
as candidates below, and 15 need the data and code console. This wave built
two per course where a screen fits (one commit per course); the rest is the
list for the next waves.

## Built in REQ-269

| Course / slug | Screen | Objective (primary) | Critical criteria | Steps name |
|---|---|---|---|---|
| SQL/sql-slow-login-seq-scan | terminal | Read EXPLAIN output to tell a sequential scan from an index scan, and recognize filters that cannot use an index | read the plan first; no blocking lock (no VACUUM FULL, no plain CREATE INDEX); fixed within 30 min | sql-slow-login |
| SQL/sql-flash-sale-oversold | terminal | Prevent a lost update with SELECT ... FOR UPDATE or a single atomic UPDATE, and compare isolation levels | stopped selling within 10 min; atomic or row-locked fix; no deleted orders or invented stock | sql-oversold |
| TSNODE/node-env-file-silent-exit | terminal | Read configuration from process.env and --env-file, and exit with a meaningful code on failure | read the journal first; no purged queue; sending within 30 min | node-envfile |
| TSNODE/node-type-stripping-enum-crash | terminal | Run TypeScript with Node.js type stripping, and recognize the syntax it rejects | read the error first; back within 20 min; no runtime swap | node-enum |
| SC500/sc500-illicit-consent-grant | security console | Securing app registrations and enterprise applications, including OAuth consent and permission grants | cut off within 25 min; disable, not delete; scope from current permissions | sc500-consent |
| SC500/sc500-backup-vault-sabotage | security console | Hardening backups with Azure Backup security features such as soft delete and multi-user authorization | account blocked within 15 min; backups recoverable and protected; MUA before soft delete is lost | sc500-backup |
| AI200/ai200-containerapp-keyvault-revision | terminal | Troubleshooting AKS and Container Apps from logs, events and connectivity checks | system log first; Key Vault Secrets User at vault scope only; ready within 30 min | ai200-aca |
| AI200/ai200-kql-checkout-latency | terminal | Analyzing logs and metrics with KQL to find errors, slow calls and their causes | dependency query before fixing; fixed within 30 min; no needless scale-out | ai200-kql |

Secondary objectives: SQL B-tree costs and transactions; TSNODE as const over
enums; SC500 role assignments; AI200 Key Vault with managed identity, and
OpenTelemetry tracing.

## Candidates on existing screens (not yet built)

**PCAP** (terminal: a Python service or job failing on a server)
- Diagnose syntax, runtime and logic errors from tracebacks and step-by-step tracing, then verify the fix with tests (a nightly job's traceback, a deadline)
- Install, list, remove and pin packages with python -m pip and a requirements.txt file (an unpinned upgrade breaks a deploy)
- Inspect a module with dir() and diagnose an import failure from sys.path and the package layout (ModuleNotFoundError after a restructure)

**SQL** (terminal, psql)
- Insert, update and delete rows safely, including RETURNING and INSERT ... ON CONFLICT (an UPDATE without WHERE in production)
- Link tables with FOREIGN KEY constraints and choose ON DELETE RESTRICT, CASCADE or SET NULL (a cascade deletes order history)
- Group statements into a transaction with BEGIN, COMMIT, ROLLBACK and SAVEPOINT, and explain atomicity (a half-applied data fix)
- Diagnose a NOT IN filter that returns nothing because the list contains a NULL, and fix it with NOT EXISTS (a report due to finance)
- Recognize row multiplication when joining to a many-side table and correct the totals it inflates (inflated revenue before a board pack)
- Design a multicolumn index whose column order matches the query's filters and sort (a slow dashboard query under load)

**TSNODE** (terminal)
- Explain how the event loop runs timers, I/O callbacks and promise jobs, and why blocking it stalls every request (a synchronous parse stalls the API)
- Process large data with streams and pipeline instead of loading it into memory (an export runs the service out of memory)
- Emit and handle events with EventEmitter, including error events (an unhandled 'error' event crashes the worker)
- Call another service with fetch, check response.ok, and set a timeout with AbortSignal (a hung dependency holds every request)
- Choose status codes and error responses that tell the client what went wrong without leaking internals (stack traces with connection strings in 500s)
- Choose a Node.js release line for production from the LTS schedule (a security release lands on an end-of-life line)

**SC500** (security console unless noted)
- Making privileged roles eligible rather than permanent with PIM activation, approval and time limits
- Writing conditional access policies that require MFA or compliant devices for stated risk conditions
- Rolling out phishing-resistant and passwordless authentication methods
- Replacing stored credentials with system- or user-assigned managed identities
- Managing keys, secrets and certificates, and finding exposed secrets with Defender CSPM
- Turning on Defender for Key Vault and acting on its alerts
- Protecting critical resources with CanNotDelete and ReadOnly locks
- Hardening storage accounts: disabling shared key and public blob access, and requiring secure transfer
- Configuring Defender for Storage malware scanning and threat detection
- Auditing Azure SQL Database and Managed Instance to a Log Analytics workspace or storage
- Filtering traffic with NSG rules and application security groups, reading rule priority
- Troubleshooting effective security rules with Network Watcher IP flow verify and effective rules (terminal)
- Removing public management ports with Azure Bastion and just-in-time VM access
- Configuring Defender for Servers vulnerability scanning, EDR and agentless scanning
- Securing AKS, Container Registry, Container Instances and Container Apps, and acting on Defender for Containers findings
- Blocking web attacks with Web Application Firewall and protecting back-end APIs with API Management policies
- Protecting Copilot Studio agents with real-time protection and managing agents in the Microsoft 365 admin center
- Governing agent identities with Entra Agent ID access controls, conditional access and Defender XDR blast-radius analysis
- Prioritizing risks with Defender CSPM attack paths and the cloud security explorer
- Automating incident handling with automation rules and playbooks

**AI200** (terminal unless noted)
- Scaling a Container App on queue length or HTTP load with KEDA scale rules (a backlog grows before a deadline)
- Handling poison messages through the dead-letter queue and resubmitting them
- Routing custom events with Event Grid subscriptions, filters and retry policies
- Cutting RU cost with indexing policies and choosing a consistency level for the read pattern (429s during a sale)
- Caching results in Azure Managed Redis with expiration and invalidation (stale prices after a change)
- Pooling and reusing database connections to raise throughput (connection exhaustion)
- Building a RAG retrieval query that combines vector similarity with metadata filters (answers cite another tenant's documents)
- Sizing PostgreSQL compute, memory and storage for a vector workload (architecture board)
- Deploying to Container Apps environments and splitting traffic between revisions (a canary that goes bad)

## Needs a screen that does not exist: the data and code console (proposal)

PL300 has no objective that the existing screens can carry honestly: its
work is reading a report, a model and its numbers, then deciding what ships
to a stakeholder. PCEP and the code-reading half of PCAP are the same family
on the code side. docs/sims.md 20.1 already designs this renderer (authored
result tables over read-only catalogues, guided choices, a deadline, a
written-reasoning moment; nothing the learner types is executed; outcome
profile `data`). It was never built. Proposed: build it as `data-console@1`,
behind `SIMS_RENDERERS`, with these first cases:

- PL300: Diagnosing slow visuals and measures with Performance Analyzer and DAX query view; Implementing row-level security roles with DAX filters and mapping groups to them (a region manager sees every region); Deciding when an on-premises data gateway is required and scheduling a semantic model refresh (a refresh fails before the board meeting); Writing semi-additive measures, such as a closing balance, that must not sum over time; Changing filter context with CALCULATE and filter modifiers such as ALL and REMOVEFILTERS; Setting relationship cardinality and single or both-direction cross-filtering for a stated question; Choosing Import, DirectQuery or Direct Lake storage for a stated data size and freshness need; Cleaning nulls, inconsistent values and import errors in Power Query; Assigning workspace roles and item-level and semantic model permissions on least privilege; Applying sensitivity labels to reports and semantic models
- PCEP: Handle runtime errors with try and one or more specific except branches, and trace the flow when one is raised; Read and write CSV rows with csv.reader and csv.writer, converting each field to the right type
- PCAP: Review a proposed change, respond to feedback, and use CI results to decide whether it is ready to merge; Validate AI-generated code before using it: run and test it, confirm every API it calls exists, and keep secrets and personal data out of prompts; Coordinate changes in a shared repository with branches, clear commits and pull requests, and resolve merge conflicts

This is a decision for Nick: the renderer is new work (a screen, its
accessibility pass and its tests), not a scenario.

## Update, REQ-312 (2026-11-16): the data and code console is built

Nick approved building every proposed screen (2026-11-16). The console is
`screen.type: "data"` (`data@1`, docs/sims.md 22.25). Built on it for the
courses in this document:

| Course / slug | Kind | Objective (primary) |
|---|---|---|
| PL300/pl300-rls-region-manager | authored | Implementing row-level security roles with DAX filters and mapping groups to them |
| PL300/pl300-stock-on-hand-summed | authored | Writing semi-additive measures, such as a closing balance, that must not sum over time |
| SQL/sql-not-in-null-empty-list | authored | Diagnose a NOT IN filter that returns nothing because the list contains a NULL, and fix it with NOT EXISTS |
| PCAP/py-import-crash-traceback-pcap | band of PYTHON/py-import-crash-traceback | Diagnose syntax, runtime and logic errors from tracebacks and step-by-step tracing, then verify the fix with tests |
| PCEP/py-import-crash-traceback-pcep | band of PYTHON/py-import-crash-traceback | Handle runtime errors with try and one or more specific except branches, and trace the flow when one is raised |
| TSNODE/js-rate-board-zero-percent-tsnode | band of JAVASCRIPT/js-rate-board-zero-percent | Call another service with fetch, check response.ok, and set a timeout with AbortSignal |

The PYTHON and JAVASCRIPT launch-course cases these bands reuse, and the
CSSGB cases, are in docs/sims.md 22.25. Still candidates on the console: the
other eight PL300 objectives listed above, PCEP CSV conversion, PCAP review
and CI, AI-generated code and merge conflicts, and the SQL row-multiplication
case (better here than on the terminal: the inflated totals are a table).
