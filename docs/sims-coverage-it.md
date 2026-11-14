# Sim coverage: IT, cloud, security, data, project and fitness courses (REQ-297)

Written 2026-11-14 for Nick's request of the same day: "Build more sims, no
need to limit number, build what covers the material." It maps every existing
non-clinical course against his selection rule (2026-11-10: a sim fits a
sub-objective when time matters, there are cues to read, choices have
consequences, or priorities compete), shows which sims already cover which
objectives, and lists what REQ-297 added and what is left. Clinical, PT, EMS
and mental health courses are another builder's and are not in this map.

## How the map was made

- **Objectives** are each course's active sub-objectives in the seeded
  catalog (`backend/supabase/seed/catalog.ts`), 4,495 across 90 courses.
- **"Fits (keyword)"** is the generator's selection screen
  (`lib/sim/generator/selection.ts`): at least two of the four criteria
  matched by words in the objective's title. It is reproducible but blunt:
  it reads titles, not content, so it **under-counts** (most "Troubleshooting
  ..." titles match only "cues") and sometimes over-counts (a definitions
  objective that happens to say "risk" and "plan"). 536 objectives pass it.
- **Judgement.** Where this wave built a sim on an objective the screen does
  not pass, the reason is written below against Nick's rule. Those are my
  calls, not Nick's; he can overrule any of them.
- **Covered** means a seeded sim names the objective as its `objective`
  (primary). Secondary objectives are listed in the detail sections but not
  counted, because a sim teaches its primary objective and only touches its
  secondaries.
- Counts come from `lib/sim/documents.ts` before and after this branch, by a
  script over the seeded catalog (no database).

## Every course: before / after REQ-297

Columns: objectives; objectives that pass the keyword screen; sims (before /
after); objectives covered as primary (before / after); keyword-fitting
objectives covered (before / after). A band (the same incident registered to
another course's objective, as SECPLUSV8 and AWSSAP do) counts as a sim of
its course.

| Course | Objectives | Fit (keyword) | Sims | Covered | Fit covered |
|---|---|---|---|---|---|
| MSCS | 113 | 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| SECPLUS | 77 | 28 | 3 / 3 | 3 / 3 | 3 / 3 |
| SECPLUSV8 | 106 | 29 | 3 / 3 | 3 / 3 | 0 / 0 |
| PYTHON | 50 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| JAVASCRIPT | 45 | 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| LINUXPLUS | 31 | 0 | 2 / 2 | 2 / 2 | 0 / 0 |
| CYSAPLUS | 56 | 14 | 2 / 2 | 2 / 2 | 2 / 2 |
| PENTESTPLUS | 22 | 1 | 2 / 2 | 2 / 2 | 0 / 0 |
| SECURITYX | 19 | 2 | 2 / 2 | 2 / 2 | 0 / 0 |
| CMPCBS | 102 | 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| AWSCLF | 80 | 4 | 2 / 2 | 2 / 2 | 2 / 2 |
| AWSAIF | 79 | 8 | 0 / 0 | 0 / 0 | 0 / 0 |
| AWSSAA | 99 | 13 | 2 / 2 | 2 / 2 | 0 / 0 |
| AWSDVA | 114 | 2 | 2 / 2 | 2 / 2 | 2 / 2 |
| AWSSOA | 59 | 12 | 2 / 2 | 2 / 2 | 2 / 2 |
| AWSDEA | 113 | 4 | 0 / 0 | 0 / 0 | 0 / 0 |
| AWSMLA | 107 | 17 | 3 / 3 | 3 / 3 | 3 / 3 |
| AWSSAP | 115 | 19 | 1 / 1 | 1 / 1 | 0 / 0 |
| AWSDOP | 114 | 12 | 0 / 0 | 0 / 0 | 0 / 0 |
| AWSSCS | 70 | 15 | 0 / 0 | 0 / 0 | 0 / 0 |
| AWSANS | 109 | 13 | 0 / 0 | 0 / 0 | 0 / 0 |
| AZ900 | 52 | 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| AZ104 | 82 | 4 | 0 / 0 | 0 / 0 | 0 / 0 |
| AZ305 | 49 | 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| AI901 | 29 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| DP900 | 30 | 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| AZ700 | 131 | 12 | 0 / 0 | 0 / 0 | 0 / 0 |
| AZ140 | 78 | 5 | 0 / 0 | 0 / 0 | 0 / 0 |
| DP300 | 94 | 6 | 0 / 0 | 0 / 0 | 0 / 0 |
| AZ400 | 86 | 11 | 0 / 0 | 0 / 0 | 0 / 0 |
| AZ120 | 78 | 8 | 0 / 0 | 0 / 0 | 0 / 0 |
| GCPCDL | 65 | 7 | 0 / 1 | 0 / 1 | 0 / 1 |
| GCPACE | 86 | 1 | 0 / 1 | 0 / 1 | 0 / 0 |
| GCPPCA | 101 | 11 | 0 / 0 | 0 / 0 | 0 / 0 |
| GCPPDE | 70 | 8 | 0 / 0 | 0 / 0 | 0 / 0 |
| GCPDEVOPS | 79 | 10 | 0 / 0 | 0 / 0 | 0 / 0 |
| GCPSEC | 70 | 6 | 0 / 0 | 0 / 0 | 0 / 0 |
| GCPNET | 130 | 16 | 0 / 0 | 0 / 0 | 0 / 0 |
| GCPDBE | 46 | 10 | 0 / 0 | 0 / 0 | 0 / 0 |
| GCPDEV | 57 | 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| GCPMLE | 53 | 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| GCPGAIL | 50 | 5 | 0 / 0 | 0 / 0 | 0 / 0 |
| APLUS_CORE1 | 34 | 2 | 0 / 1 | 0 / 1 | 0 / 0 |
| APLUS_CORE2 | 28 | 5 | 0 / 1 | 0 / 1 | 0 / 1 |
| NETWORKPLUS | 33 | 2 | 2 / 2 | 2 / 2 | 1 / 1 |
| CLOUDPLUS | 31 | 3 | 0 / 0 | 0 / 0 | 0 / 0 |
| DATAPLUS | 18 | 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| SERVERPLUS | 20 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| PROJECTPLUS | 24 | 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| TECHPLUS | 29 | 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| AUTOOPSPLUS | 14 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| CLOUDNETX | 25 | 4 | 0 / 0 | 0 / 0 | 0 / 0 |
| SECAIPLUS | 15 | 4 | 2 / 2 | 2 / 2 | 0 / 0 |
| DATAAI | 26 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| CAPM | 30 | 6 | 0 / 0 | 0 / 0 | 0 / 0 |
| PMP | 23 | 10 | 0 / 0 | 0 / 0 | 0 / 0 |
| PMIACP | 24 | 7 | 0 / 0 | 0 / 0 | 0 / 0 |
| PGMP | 35 | 11 | 0 / 0 | 0 / 0 | 0 / 0 |
| PFMP | 34 | 12 | 0 / 0 | 0 / 0 | 0 / 0 |
| PMIRMP | 20 | 14 | 0 / 0 | 0 / 0 | 0 / 0 |
| PMISP | 27 | 3 | 0 / 0 | 0 / 0 | 0 / 0 |
| PMICP | 16 | 7 | 0 / 0 | 0 / 0 | 0 / 0 |
| PMIPMOCP | 23 | 9 | 0 / 0 | 0 / 0 | 0 / 0 |
| PMIPBA | 28 | 3 | 0 / 0 | 0 / 0 | 0 / 0 |
| PMICPMAI | 31 | 8 | 0 / 0 | 0 / 0 | 0 / 0 |
| CSPP | 21 | 7 | 0 / 0 | 0 / 0 | 0 / 0 |
| NASMCPT | 31 | 5 | 0 / 0 | 0 / 0 | 0 / 0 |
| ACECPT | 21 | 5 | 0 / 0 | 0 / 0 | 0 / 0 |
| ACSMCPT | 20 | 3 | 0 / 0 | 0 / 0 | 0 / 0 |
| NSCACSCS | 37 | 8 | 0 / 0 | 0 / 0 | 0 / 0 |
| NSCACPT | 18 | 7 | 0 / 0 | 0 / 0 | 0 / 0 |
| NCCPTCPT | 25 | 7 | 0 / 0 | 0 / 0 | 0 / 0 |
| CKA | 39 | 6 | 3 / 3 | 3 / 3 | 1 / 1 |
| CKAD | 33 | 1 | 0 / 0 | 0 / 0 | 0 / 0 |
| KCNA | 32 | 4 | 0 / 1 | 0 / 1 | 0 / 1 |
| CKS | 28 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| KCSA | 41 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| DCA | 43 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| PCA | 30 | 4 | 0 / 0 | 0 / 0 | 0 / 0 |
| OTCA | 22 | 5 | 0 / 0 | 0 / 0 | 0 / 0 |
| CGOA | 27 | 4 | 0 / 0 | 0 / 0 | 0 / 0 |
| CAPA | 16 | 3 | 0 / 0 | 0 / 0 | 0 / 0 |
| CCA | 27 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| ICA | 18 | 6 | 0 / 0 | 0 / 0 | 0 / 0 |
| KCA | 31 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| CBA | 20 | 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| CNPA | 27 | 3 | 0 / 0 | 0 / 0 | 0 / 0 |
| CNPE | 18 | 5 | 0 / 0 | 0 / 0 | 0 / 0 |
| EX188 | 32 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |
| EX280 | 54 | 2 | 0 / 0 | 0 / 0 | 0 / 0 |

## What REQ-297 added

| Course | Sim | Screen | Objective (primary) | Why it fits the rule |
|---|---|---|---|---|
| APLUS_CORE1 | `rogue-dhcp-soho-office` | terminal | Troubleshooting wired and wireless network problems: intermittent connectivity, slow transfer speeds, and limited connectivity | Judgement (the screen matches only "cues"): an upload deadline (time), ipconfig output to compare (cues), reset/static/unplug choices with side effects, office-wide disruption against one PC (priorities). The course's methodology objective passes the screen, but 220-1201's own PDF says the methodology "will not be tested", so the sim sits on the tested 5.5 objective |
| APLUS_CORE2 | `home-office-laptop-malware` | security console | Best-practice malware removal procedure (220-1202 2.6) | Keyword fit (time, cues, choices) |
| KCNA | `service-selector-no-endpoints` | terminal | Troubleshooting: where to look when a node, a Service or the control plane misbehaves, and the role of metrics-server and probes | Keyword fit (cues, choices) |
| CKA | `service-selector-no-endpoints-cka` (band of the KCNA case) | terminal | Troubleshoot services and networking: a Service with no endpoints, selector and port mismatches, ... | Keyword fit (cues, choices); the CKA objective names this exact fault |
| GCPACE | `public-bucket-customer-exports` | board | Managing and securing objects in Cloud Storage buckets, including lifecycle management policies | Judgement (the screen matches only "choices"): exposure grows by the minute (time), IAM and log evidence (cues), remove/ACL/delete choices, data exposure against the website's images (priorities) |
| GCPCDL | `bigquery-dashboard-bill` | board | Google-recommended practices for cloud financial governance, including who owns cost management | Keyword fit (choices, priorities) |

## Launch and mixed-round courses in detail

"Fits" lists keyword-fitting objectives (abridged) plus judgement additions
marked (J). "Covered by" names the sim; "2nd" means a secondary only.

**Security+ (SECPLUS, SY0-701).** 28 of 77 fit; 3 covered (phishing account
takeover 2.4, ransomware IR 4.8, cloud IAM backdoor 4.6). Uncovered fits that
would make strong console incidents: vulnerability management and
prioritization; security alerting and monitoring (alert response); host,
protocol and email defenses; change management with a backout plan; resilience
and recovery (hot/warm/cold sites); automation and orchestration (guard rails,
escalation); security awareness (responding to reported phishing); third-party
and supply-chain risk. The risk-analysis objectives (ALE/SLE/ARO, governance
documents) fit the screen's words but are calculation and policy topics a lab
covers better. SECPLUSV8 mirrors the three as bands, on V8 objectives the screen does not
pass; all 29 V8 keyword fits are uncovered.

**AWS Solutions Architect Associate (AWSSAA).** 13 of 99 fit; the two sims
(TicketBurst, NAT gateway bill) sit on objectives the screen does not pass
(single points of failure; routing that minimizes transfer cost) and touch
five more as secondaries. Uncovered fits: WAF and Shield against DDoS and
injection; GuardDuty and Macie findings; backup and replication as a security
control; Availability Zones, Regions and Route 53 in a resilient design;
load-balancing strategy; storage, backup, purchasing option, instance and
database selection on cost; throttling strategy. All suit the board.

**AWS CloudOps/SysOps (AWSSOA).** 12 of 59 fit; 2 covered (stack update
rollback, EC2 status-check recovery). Uncovered: ELB health checks; database
point-in-time restore against RTO/RPO; EBS performance and volume type;
KMS and ACM troubleshooting; Security Hub/GuardDuty/Config findings;
CloudFront caching issues; compliance with Config conformance packs.

**AWS ML Engineer Associate (AWSMLA).** 17 of 107 fit; 3 covered (drift,
endpoint scaling metrics, bias). Uncovered: real-time versus batch inference;
foundation-model selection, deployment and inference cost; training-data
integrity; security risks in ML systems; performance/time/cost trade-offs.

**AWS Cloud Practitioner (AWSCLF).** 4 of 80 fit; 2 covered (data transfer
costs, leaked access key). Uncovered: one-time operations versus repeatable
processes; when a workload needs multiple Regions.

**Google Cloud Digital Leader (GCPCDL).** 7 of 65 fit; 0 before, 1 after
(financial governance). Uncovered: why data has business value; threat
intelligence sources; security offerings and what each is for; modern
application development; compute vocabulary.

**Google Cloud Associate Cloud Engineer (GCPACE).** 1 of 86 fits by keyword
(load balancers); 0 before, 1 after (Cloud Storage security, judgement).
Judgement fits still open: load balancer choice; autoscaled managed instance
groups; Cloud Run traffic splitting during a bad release; firewall rules and
Cloud NGFW day to day; Cloud Monitoring alerts; snapshots and database
backup/restore; service account permissions and impersonation.

**A+ Core 1 and Core 2.** Core 1: 2 of 34 fit by keyword (VM resource
allocation; the troubleshooting methodology); 1 after (network problems,
judgement). Core 2: 5 of 28 fit; 1 after (malware removal). Open: Windows boot
failures and BSOD (Core 2 3.1, a terminal case in WinRE); Windows Update,
backup and System Restore; change management with a backout plan; Core 1
storage/RAID failures and printer issues (judgement).

**Network+ (NETWORKPLUS).** 2 of 33 fit; the methodology objective is
covered (branch DNS route typo) and switching/routing as a judgement fit
(VLAN trunk). Judgement fits open: wireless troubleshooting; network security
attacks and mitigations; high availability and disaster recovery.

**Linux+ (LINUXPLUS).** 0 of 31 fit by keyword; both sims are judgement fits
(storage, SELinux). Open judgement fits: boot and GRUB failures; systemd
service failures; network configuration; performance (CPU, memory, OOM).

**KCNA and CKA.** KCNA: 4 of 32 fit; 0 before, 1 after. CKA: 6 of 39 fit;
2 before (judgement), 3 after (the band covers "Service with no endpoints").
Open CKA fits: control-plane component troubleshooting (static pod
manifests); highly available control plane; storage access modes and reclaim
policies; cluster upgrades with kubeadm.

**Python, JavaScript (PYTHON, JAVASCRIPT).** 2 of 50 and 0 of 45 fit by
keyword; judgement fits include debugging from a traceback, a failing test
before a release, an async bug, a dependency conflict. No sim: the family's
screen (the data and code console) does not exist; see the proposals.

**PMP, CAPM, Project+ (and the other PMI courses).** PMP 10 of 23, CAPM 6 of
30, Project+ 1 of 24 fit. No sim: the project dashboard does not exist; see
the proposals.

**NASM CPT and the other fitness courses.** NASM 5 of 31 fit. No sim: the
client trainer does not exist; see the proposals.

## Screens that do not exist: proposals (not built)

Each would be a new renderer (screen type), as docs/sims.md 20 planned. The
engine, outcome profiles (`project`, `fitness`, `data` are already in the
engine's profile list) and pacing rules need no change; each is a JavaScript
renderer plus its bindings, validator and accessibility work, like the
terminal (REQ-237).

1. **Project dashboard** (design name `dashboard`; profile `project`, with
   CPI/SPI and stakeholder thresholds already defined). Learner-paced weeks:
   change requests, risks turning into issues, team conflict, a vendor slip,
   earned value. Unlocks, first: PMP conflict management, stakeholder
   engagement, risk register and response, issue/impediment management,
   value-based delivery, procurement and contract type, governance and
   escalation thresholds; CAPM following a risk or communication plan,
   prioritizing tasks in an adaptive project, the product roadmap; Project+
   change control; PMI-RMP (14 fits), PfMP (12), PgMP (11), PMI-ACP (7),
   PMI-CP (7), PMO-CP (9), CPMAI (8). The deferred Lakeshore clinic app
   prototype (PMP) is the first scenario. About 100 keyword fits wait on it.
2. **Data and code console** (design name `data`; profile `data`). Guided:
   pick the query or fix, read authored result tables and tracebacks, reason
   in writing; nothing the learner types runs. Unlocks: Python debugging from
   a traceback and file handling; JavaScript async and DOM bugs; Data+,
   DataAI, DP-900, DP-300 and AWS DEA data-quality and pipeline incidents;
   BigQuery and Dataflow job failures (GCPPDE); CompTIA DataAI model
   evaluation. The terminal could host some code-debugging cases as a stopgap,
   but its outcome profile and map are infrastructure-shaped; a decision for
   Nick.
3. **Client trainer** (design name `trainer`; profile `fitness`). Screen,
   assess movement, program by phase, coach through weeks; adherence, pain
   and red flags respond. Unlocks NASM (designing flexibility, core, balance
   and plyometric components from assessments; acute exercise responses), ACE
   (5), ACSM (3), NSCA-CPT (7), NSCA-CSCS (8), NCCPT (7). The deferred Dana
   knee valgus prototype (NASMCPT) is the first scenario.

## What remains on existing screens

Ordered by launch status, then fits left: SECPLUS (25 fits open, console),
AWSSAA (13, board), AWSMLA (14, board), AWSSOA (10, board or terminal),
SECPLUSV8 (29, console or bands), GCPCDL (6), GCPACE (judgement fits above),
APLUS_CORE2 (4), KCNA (3), CKA (4), then the non-launch AWS, Azure, Google
Cloud and CNCF courses (about 300 keyword fits, all board, terminal or
console shaped). At the pace of this wave (a sim with sources, six golden
paths and a behavior test each) that is weeks of authoring; the generator
(12.2) was built for exactly this breadth and its first 20 measured drafts
are still pending Nick's monthly budget.
