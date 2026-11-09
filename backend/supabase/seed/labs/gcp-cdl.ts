import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-157: Google Cloud Digital Leader.
//
// Aligned to the Cloud Digital Leader exam guide "launched on August 12,
// 2026" (PDF, read 2026-11-07): six sections at 18/18/18/18/18/10. This is a
// foundational, business-level exam, so every lab asks the learner to DO the
// thing the exam tests in scenario items: map a stated pain point to a real
// cloud benefit, pick the service model or data product that fits, classify
// a migration, read a cost-control plan, tell an SLI from an SLO from an SLA.
// No gcloud. Density (docs/labs.md, policy "hybrid"): 2 / 2 / 2 / 2 / 2 / 2.
//
// Figures used and where they were verified on 2026-11-07:
//   - Cloud Storage minimum storage durations (Nearline 30 d, Coldline 90 d,
//     Archive 365 d), access-frequency guidance and retrieval fees:
//     docs.cloud.google.com/storage/docs/storage-classes and
//     cloud.google.com/storage/pricing.
//   - Spot VMs: up to 91% off, may be preempted at any time, no SLA:
//     docs.cloud.google.com/compute/docs/instances/spot.
//   - 99.9% over 30 days is about 43.2 minutes of downtime (arithmetic; the
//     same figure appears in the Architecture Center reliability guide,
//     docs.cloud.google.com/architecture/infra-reliability-guide/building-blocks).

export const GCPCDL_LABS: SeedLabSet = {
  trackCode: "GCPCDL",
  sources: [
    source("https://services.google.com/fh/files/misc/cloud_digital_leader_exam_guide_english.pdf", "exam_outline", "2026-11-07"),
    source("https://cloud.google.com/learn/certification/cloud-digital-leader", "exam_outline", "2026-11-07"),
    source("https://docs.cloud.google.com/storage/docs/storage-classes", "reference", "2026-11-07"),
    source("https://cloud.google.com/storage/pricing", "cloud_pricing_limits", "2026-11-07"),
    source("https://docs.cloud.google.com/compute/docs/instances/spot", "reference", "2026-11-07"),
    source("https://docs.cloud.google.com/architecture/infra-reliability-guide/building-blocks", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Digital Transformation with Google Cloud (18%)
    // ----------------------------------------------------------------------
    {
      slug: "cloud-benefits-not-buzzwords",
      objective:
        "Business benefits cloud technology delivers during a digital transformation: scalability, cost-effectiveness, agility, speed, flexibility, security, global reach, high availability, data-driven insight, and strategic focus",
      kind: "build",
      title: "Turn a retailer's pain points into specific cloud benefits",
      brief:
        "Marlow & Finch is a fictional homewares retailer with 40 stores and an online shop hosted in its own small data centre. Its board has heard that \"the cloud is more agile\" and asked for a one-page case. The operations director lists three real problems. (1) Every November the web shop slows to a crawl for the two busiest weeks, and the fix in 2025 was buying 30 servers that now sit idle for 50 weeks a year. (2) Opening the first two stores in Ireland took IT nine months because the data centre is in Leeds and the point-of-sale system times out across the sea. (3) The marketing team wants to know which products sell together by region, but reports come out of a spreadsheet three weeks after month end. Write the case so that each problem is matched to the cloud benefit that actually fixes it, not to a slogan.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the one-page case: one benefit per problem, with what changes for the business, and one honest limit.",
          parts: [
            part(
              "Problem 1: the November peak",
              "Names scalability or elasticity (capacity that grows and shrinks with demand) and cost-effectiveness (paying for what is used rather than owning idle servers), and says concretely what changes: no idle 30 servers, capacity added for two weeks and released after.",
              "Scalability with pay-for-use: the web shop runs on capacity that scales out for the two peak weeks and scales back afterwards, so Marlow & Finch pays for peak servers for two weeks a year instead of owning 30 machines that idle for fifty. That is elasticity plus cost-effectiveness, not 'agility' in general."
            ),
            part(
              "Problem 2: the Irish stores",
              "Names global reach (Google Cloud regions close to the stores) and speed or agility of provisioning (infrastructure in minutes rather than a data-centre build), and ties the fix to lower latency for point-of-sale and faster store openings.",
              "Global reach and speed: run the point-of-sale back end in a Google Cloud region in Europe close to the stores (and keep the UK one for the UK), so the latency that caused the time-outs disappears, and provisioning that environment is a matter of hours rather than a nine-month data-centre project."
            ),
            part(
              "Problem 3: the slow reports",
              "Names data-driven insight (a managed data warehouse and BI so questions are answered in hours, not weeks) rather than a compute benefit, and says what the marketing team gets: regional product-affinity reports on current data.",
              "Data-driven insight: land sales data in a managed warehouse such as BigQuery and give marketing a BI tool like Looker, so 'which products sell together by region' is a query on yesterday's data instead of a spreadsheet three weeks late."
            ),
            part(
              "One honest limit",
              "States at least one real limit or cost of the move: migration effort and skills, cost that must be governed (pay-for-use can run away without budgets), a shared-responsibility security model, or dependence on network connectivity.",
              "Pay-for-use cuts idle cost but also means cost needs governing (budgets, alerts, right-sizing), and the move needs new skills and a migration plan; security becomes shared with Google rather than disappearing."
            ),
          ],
        },
      ],
    },
    {
      slug: "iaas-paas-saas-for-three-workloads",
      objective: "Benefits and tradeoffs across IaaS, PaaS, and SaaS",
      kind: "build",
      title: "Choose a service model for three workloads",
      brief:
        "Kestrel Logistics is a fictional freight company moving off its own servers. Three workloads are in scope. (1) A 15-year-old route-planning application written for a specific version of Linux with a licensed maths library; the vendor is gone, nobody can rebuild it, but it must keep running unchanged. (2) A new customer-tracking web API the in-house team is writing now; they want to write code and not manage servers, patching or scaling. (3) Company email and calendars, currently on an ageing mail server the IT team hates maintaining; there is nothing custom about how Kestrel uses email. For each workload choose IaaS, PaaS or SaaS and say what Kestrel keeps responsibility for under that model.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the service model for each workload, the reason, and what Kestrel still has to manage.",
          parts: [
            part(
              "Route-planning application",
              "Chooses IaaS (virtual machines, for example Compute Engine) because the application cannot be changed and needs a specific OS and library, and states that Kestrel still manages the OS, patching, the application and its data while Google runs the physical hardware and virtualisation.",
              "IaaS: rehost it on a virtual machine (Compute Engine) with the OS and library it needs, unchanged. Kestrel keeps the OS, patches, the application and its data; Google provides and secures the physical servers, storage and network underneath."
            ),
            part(
              "New customer-tracking API",
              "Chooses PaaS (a managed platform such as Cloud Run) because the team wants to ship code without managing servers, patching or scaling, and states that Kestrel still owns the code, its dependencies, data and access configuration.",
              "PaaS: a managed platform such as Cloud Run runs the API and handles servers, patching and scaling. Kestrel owns the application code, its libraries, the data and who is allowed to call it."
            ),
            part(
              "Email and calendars",
              "Chooses SaaS (for example Google Workspace) because the need is standard and nothing is custom, and states that Kestrel still manages users, access and its own data and policies, while the provider runs the software.",
              "SaaS: a hosted suite such as Google Workspace; nothing about Kestrel's email is custom, so there is no reason to run servers. Kestrel still manages user accounts, access, sharing policies and its data; the provider runs and updates the software."
            ),
            part(
              "The trade-off in one line",
              "States the pattern: moving from IaaS to PaaS to SaaS lowers management burden and staffing needs but reduces control and flexibility, and total cost of ownership shifts from running infrastructure to subscription or usage.",
              "From IaaS to PaaS to SaaS the provider takes on more of the stack, so Kestrel manages less and needs fewer specialist staff, but gives up control over the OS, runtime or the software itself; TCO shifts from owning and running infrastructure to paying for the service."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Exploring Data Transformation with Google Cloud (18%)
    // ----------------------------------------------------------------------
    {
      slug: "match-data-products-to-needs",
      objective:
        "Matching a business use case to the right Google Cloud data product: Cloud Storage, Spanner, Cloud SQL, AlloyDB, Bigtable, BigQuery, Firestore",
      kind: "build",
      title: "Match a Google Cloud data product to each business need",
      brief:
        "Ardent Mobility is a fictional e-scooter rental company. Its data team lists four needs. (1) Store 2 million photos riders take of parked scooters at the end of each ride; each photo is written once and read occasionally for disputes. (2) Analyse three years of ride history (hundreds of millions of rows) with SQL to answer questions like 'which districts lose money in winter' for the monthly board pack. (3) The payments ledger: relational tables, strong consistency, modest size, used by a web app in one region. (4) The scooter telemetry stream: each of 50,000 scooters sends location and battery readings every few seconds, written at very high rate and read back by time range per scooter. Choose one product for each need and give the deciding reason.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the product for each need and the one reason that decides it.",
          parts: [
            part("Ride photos", "Chooses Cloud Storage (object storage for unstructured files written once and read occasionally).", "Cloud Storage: photos are unstructured objects written once and read rarely; object storage is built for exactly that and costs far less than a database."),
            part("Three years of ride analytics", "Chooses BigQuery (serverless data warehouse for SQL analytics over very large datasets).", "BigQuery: a serverless data warehouse that runs SQL over hundreds of millions of rows for analytical questions, without servers to size."),
            part("Payments ledger", "Chooses Cloud SQL (or AlloyDB) as a managed relational database for a modest, single-region transactional workload with strong consistency, and does not reach for Spanner or BigQuery.", "Cloud SQL (PostgreSQL or MySQL): a managed relational database with transactions and strong consistency; the ledger is modest and single-region, so Spanner's global scale is not needed and BigQuery is for analytics, not transactions."),
            part("Scooter telemetry", "Chooses Bigtable (wide-column NoSQL for very high write throughput and time-series reads keyed by device and time).", "Bigtable: built for very high write rates and reads by key range, which suits time-series telemetry keyed by scooter and time."),
          ],
        },
      ],
    },
    {
      slug: "storage-class-per-dataset",
      objective: "Cloud Storage classes by cost and access frequency: Standard, Nearline, Coldline, Archive, Autoclass",
      kind: "build",
      title: "Pick a Cloud Storage class for each dataset",
      brief:
        "Bellweather Insurance, a fictional insurer, keeps four datasets in Cloud Storage and wants the cheapest class that fits each. (1) Product images served on its website all day, every day. (2) Monthly billing statement PDFs: read often in the month they are issued, then about once a month for a year when customers query a bill. (3) Scanned claim files that must be kept for the regulator's retention period and are opened perhaps once in several years, when a complaint is reopened. (4) A shared drive of documents whose access pattern nobody can predict: some files are opened daily, some never again. Cloud Storage's minimum storage durations are 30 days for Nearline, 90 days for Coldline and 365 days for Archive, and those three classes charge a per-GB retrieval fee when data is read.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the class for each dataset and justify it with access frequency and the cost catches.",
          parts: [
            part("Website product images", "Chooses Standard storage because the data is read constantly and the colder classes charge retrieval fees and minimum durations.", "Standard: read all day, so the lowest per-GB price of a colder class would be wiped out by retrieval fees; Standard has no retrieval fee and no minimum duration."),
            part("Monthly statements", "Chooses Nearline (access about once a month or less) and notes the 30-day minimum storage duration and retrieval fee are acceptable for that pattern, possibly after a first month in Standard.", "Nearline: after the issue month they are read about once a month, which is Nearline's intended pattern; the 30-day minimum and the small retrieval fee suit a bill read once a month. Keep the first month in Standard if they are read heavily then."),
            part("Scanned claim files", "Chooses Archive for data accessed less than once a year, and notes the 365-day minimum storage duration and retrieval fee are fine because reads are rare and the data must be kept anyway.", "Archive: opened less than once a year and kept for years regardless, so the 365-day minimum costs nothing extra and the retrieval fee is paid only on the rare reopened complaint."),
            part("Unpredictable shared drive", "Chooses Autoclass, explaining that it moves objects between classes automatically based on each object's access, with no retrieval fees or early-deletion charges, in exchange for a small per-object management fee.", "Autoclass: let Cloud Storage move each object to a colder class when it stops being read and back to Standard when it is read again; there are no retrieval or early-deletion charges, and the price is a small per-object management fee."),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Innovating with Google Cloud Artificial Intelligence (18%)
    // ----------------------------------------------------------------------
    {
      slug: "choose-an-ai-approach",
      objective:
        "Strategic considerations when choosing a Google Cloud AI approach: implementation speed, development effort, differentiation potential, required technical expertise, flexibility",
      kind: "build",
      title: "Choose an AI approach for three business needs",
      brief:
        "Ferncastle Bank, a fictional retail bank, has three AI requests and one small data-science team. (1) Customer service wants incoming support emails in six languages translated into English today, no data scientists available. (2) The fraud team wants a model that spots unusual card transactions using five years of the bank's own labelled fraud cases; this is where they believe they can beat competitors. (3) The HR team wants a quick internal assistant that answers staff questions from the policy handbook, built by one developer in a few weeks. For each, choose between a pre-trained API or foundation model used as-is, a custom model trained on the bank's own data, or a packaged agent-building platform, and weigh speed, effort, differentiation, expertise and flexibility.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the approach for each request and justify it against the five considerations.",
          parts: [
            part(
              "Support email translation",
              "Chooses a pre-trained API (the Translation API or a Gemini model as-is) because speed and low effort matter most, no data science skill is needed, and translation is not a differentiator.",
              "Pre-trained: the Translation API (or Gemini) translates out of the box. Fastest to implement, almost no development effort, needs no data scientists, and translation is a commodity, so there is nothing to gain from a custom model."
            ),
            part(
              "Fraud detection",
              "Chooses a custom model trained on the bank's own labelled data because differentiation and flexibility matter most and the bank has unique data and a team to use it, accepting slower delivery and higher effort.",
              "Custom model on the bank's own data (for example trained with the Agent Platform's tooling or BigQuery ML): the bank's five years of labelled fraud is the asset competitors lack, so this is where custom work pays. It costs the most time, effort and expertise, and the data-science team should be spent here."
            ),
            part(
              "HR policy assistant",
              "Chooses an agent-building platform (Gemini Enterprise Agent Platform / Agent Studio) grounded on the handbook, because one developer can build it quickly without training a model, trading some flexibility for speed.",
              "Agent platform: build an agent on the Gemini Enterprise Agent Platform grounded in the policy handbook. One developer, weeks not months, no model training; it is less flexible than a custom build but the need is standard and internal."
            ),
            part(
              "What the choices have in common",
              "Explains the principle: spend scarce expertise where the organisation's own data creates differentiation, and buy or configure where the need is generic, noting data quality and responsible-AI review apply to all three.",
              "Use ready-made AI wherever the need is generic and speed matters; reserve custom work for where the bank's own data gives it an edge. All three still need good data, human review and a responsible-AI check before customers or staff rely on them."
            ),
          ],
        },
      ],
    },
    {
      slug: "diagnose-data-quality-for-ai",
      objective:
        "Why high-quality, accurate data is a prerequisite for a working AI model, and the dimensions that make data \"high quality\": completeness, uniqueness, timeliness, validity, accuracy, consistency",
      kind: "case",
      title: "Diagnose why a churn model is failing, one data finding at a time",
      brief:
        "Lanternway Telecom is a fictional mobile carrier. Its new customer-churn model performed well in testing but its predictions in production are poor, and the business is ready to blame 'the AI'. You are asked to review the data behind it before anyone touches the model.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The data team's first review finds three things. (a) 30% of customer records have no value in the 'contract end date' field, which the model uses heavily. (b) The customer table has 1.3 million rows for 1.1 million customers: many people appear twice, once per handset. (c) The 'monthly spend' field in the training data was last refreshed eleven months ago, while the model is scoring customers on today's behaviour.",
          ask: "Name the data-quality dimension each finding breaks and the business consequence for the model.",
          parts: [
            part(
              "Finding (a)",
              "Identifies completeness (missing values in a key field) and explains the model is guessing for 30% of customers or learning from a biased subset.",
              "Completeness: a third of customers have no contract end date, so the model either guesses for them or learned from the two-thirds who happen to have it, which may not be representative."
            ),
            part(
              "Finding (b)",
              "Identifies uniqueness (duplicate customer records) and explains that duplicated customers are over-weighted and churn may be counted twice or missed when one record churns and the other does not.",
              "Uniqueness: duplicate customers mean some people count twice in training and scoring, and a customer can look both churned and retained at once, which teaches the model contradictions."
            ),
            part(
              "Finding (c)",
              "Identifies timeliness (stale data) and explains that spend from eleven months ago does not describe current behaviour, so predictions drift from reality.",
              "Timeliness: the model learned from spend as it was eleven months ago and is applied to customers whose behaviour has changed since, so its view of 'normal' is out of date."
            ),
          ],
        },
        {
          text: "A second pass finds two more issues. (d) The 'region' field holds 'North West', 'NW', 'north-west' and 'N. West' for the same area, and 'age' contains values of 0 and 207. (e) The pricing team asks whether rebuilding the model with a more powerful algorithm would fix things faster than fixing the data.",
          ask: "Classify the new findings and answer the pricing team's question.",
          parts: [
            part(
              "Finding (d)",
              "Identifies consistency (the same fact recorded in different formats) for the region values and validity or accuracy (values outside the allowed range) for the ages, and notes both need rules at the point of collection, not just a one-off clean.",
              "Region is a consistency problem: one area spelled four ways is four categories to the model. Ages of 0 and 207 are validity failures (outside any allowed range) and likely inaccurate. Both need validation rules where the data is captured, plus a clean-up of what exists."
            ),
            part(
              "Model first or data first",
              "Argues data first: a more powerful model trained on incomplete, duplicated, stale and inconsistent data learns the same flaws faster, so fixing the data is the prerequisite for any model working, and explains this is why data quality is treated as a precondition for AI.",
              "Fix the data first. A stronger algorithm cannot recover information that is missing, stale or contradictory; it will learn the flaws more precisely. High-quality data is the prerequisite for any model to work, which is why the review started with the data and not the model."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Modernize Infrastructure and Applications with Google Cloud (18%)
    // ----------------------------------------------------------------------
    {
      slug: "classify-migration-paths",
      objective:
        "Cloud migration vocabulary: workload, discovery and assessment, retire, retain, rehost, replatform, refactor, reimagine",
      kind: "build",
      title: "Assign a migration path to each workload in an inventory",
      brief:
        "Greywell Council is a fictional local authority leaving a leased data centre in 14 months. Discovery and assessment found five workloads. (1) A payroll system on Windows Server that works fine, is heavily customised and must move with no changes because the finance year-end is during the move. (2) A booking website for leisure centres built on a commercial database whose licence is up for renewal; it could run on a managed database with small changes. (3) A permit-application system written as one large program that falls over every spring; the team wants to rebuild it as services that scale independently. (4) A staff intranet that was replaced by a newer system two years ago and has had no logins since. (5) A mainframe printing system tied to physical printers in the civic centre that cannot move for contractual reasons until 2029. Assign each a path: retire, retain, rehost, replatform, refactor or reimagine.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the migration path for each of the five workloads with a one-line reason.",
          parts: [
            part("Payroll (1) and intranet (4)", "Rehosts payroll (lift and shift to virtual machines, unchanged, because of the year-end constraint) and retires the intranet (no users, replaced).", "Payroll: rehost, lift it onto Compute Engine virtual machines unchanged; the year-end leaves no room for change. Intranet: retire; it has been replaced and has no logins, so it is decommissioned, not moved."),
            part("Booking website (2)", "Replatforms it: moves to a managed database (for example Cloud SQL) with small changes to drop the expiring licence, without rewriting the application.", "Replatform: move the site onto a managed database such as Cloud SQL with minor changes, so the commercial licence is not renewed, but the application itself is not rewritten."),
            part("Permit system (3)", "Refactors (or reimagines) it: rebuilds the monolith as independently scalable services, for example containers on GKE or Cloud Run, accepting the larger effort because the current design is the problem.", "Refactor: redesign the monolith as services that scale independently (containers on GKE or Cloud Run). It is the most effort of the five, chosen because the architecture itself is what fails every spring."),
            part("Printing system (5)", "Retains it on-premises for now because of the contractual tie to physical equipment, with a review date, rather than forcing a move.", "Retain: it is tied to physical printers and a contract until 2029, so it stays where it is, with a review scheduled for when the contract allows."),
          ],
        },
      ],
    },
    {
      slug: "where-serverless-fits",
      objective: "The business case for serverless compute on Cloud Run and Cloud Run functions",
      kind: "build",
      title: "Decide where serverless compute fits in a product launch",
      brief:
        "Pinecrest Publishing, a fictional magazine group, is launching a reader app and has four components to place. (1) A public API that gets almost no traffic overnight and sharp spikes when a new issue is published. (2) A small job that must run whenever a new article image is uploaded, resizing it into three sizes. (3) A legacy print-layout engine that needs a specific Windows version and a licensed font server, running 24/7. (4) A recommendation service that must respond within tens of milliseconds and runs a model that takes about two minutes to load into memory before it can answer anything. The CTO wants to use serverless everywhere 'because it is cheaper'. Give a recommendation per component.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each component say whether serverless fits, which product, and why or why not.",
          parts: [
            part(
              "Spiky public API",
              "Chooses Cloud Run: scales from zero to many instances with demand and bills for what is used, so the quiet nights cost little and launch-day spikes are handled without capacity planning.",
              "Cloud Run fits well: it scales to zero overnight and out on publication day, and Pinecrest pays for what runs. The business case is no idle servers and no capacity planning for spikes."
            ),
            part(
              "Image resizing on upload",
              "Chooses Cloud Run functions (or a Cloud Run service) triggered by the Cloud Storage upload event: event-driven, short-lived, pay-per-use, no server to keep running.",
              "Cloud Run functions triggered by the Cloud Storage upload event: a small event-driven job is the textbook serverless case; it runs only when an image arrives and costs nothing between uploads."
            ),
            part(
              "Legacy layout engine",
              "Rejects serverless: a specific Windows version, a licensed font server and 24/7 running do not fit a stateless, container-based, scale-to-zero model; recommends a Compute Engine VM.",
              "Not serverless: it needs a specific Windows build and a licensed font server and runs all day, so there is no scale-to-zero saving and the platform cannot host it. Run it on a Compute Engine VM."
            ),
            part(
              "Recommendation service",
              "Flags the two-minute model load as a cold-start problem for scale-to-zero; recommends either Cloud Run with minimum instances kept warm (accepting an always-on cost) or GKE / Compute Engine, and says the 'cheaper' assumption does not hold when instances must stay warm.",
              "Serverless only with care: a two-minute warm-up and a tens-of-milliseconds latency target do not mix with scaling from zero. Either keep a minimum number of Cloud Run instances warm, which removes most of the cost saving, or run it on GKE or Compute Engine. 'Cheaper' is not automatic when capacity must stay on."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Trust and Security with Google Cloud (18%)
    // ----------------------------------------------------------------------
    {
      slug: "authn-authz-audit-controls",
      objective: "Authentication versus authorization versus auditing, including MFA/2SV and IAM",
      kind: "build",
      title: "Sort a security review into authentication, authorization and auditing",
      brief:
        "Harrowgate Clinics, a fictional group of dental practices, had an external security review of its Google Cloud environment. Four findings came back. (1) Staff sign in with a password only; a phished receptionist's password was used from abroad last month. (2) Every member of the IT team holds the Owner role on every project, including the two interns. (3) Nobody can say who changed the firewall rule that opened a database to the internet in March; the question went unanswered. (4) A contractor who left in January could still sign in until April. The practice manager asks you to explain which part of access security each finding belongs to and what to change.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each finding as authentication, authorization or auditing, and name the change.",
          parts: [
            part(
              "Finding 1",
              "Classifies it as authentication (proving who you are) and recommends 2-Step Verification / multi-factor authentication so a stolen password alone is not enough.",
              "Authentication: a password alone proved identity, and it was stolen. Turn on 2-Step Verification (MFA) for all staff so the phished password is useless without the second factor."
            ),
            part(
              "Finding 2",
              "Classifies it as authorization (what a signed-in identity may do) and recommends least privilege through IAM: specific predefined roles per job, granted to groups, with Owner reserved for very few people.",
              "Authorization: Owner on everything is far more than anyone's job needs. Use IAM to grant each person the narrowest predefined roles for their work, via groups, and keep Owner to one or two accountable people (never interns)."
            ),
            part(
              "Finding 3",
              "Classifies it as auditing (recording who did what, when) and recommends relying on Cloud Audit Logs, which record administrative changes such as firewall edits, retained and reviewed.",
              "Auditing: the question 'who changed the firewall rule' is answered by Cloud Audit Logs, which record admin actions with the identity, time and change. Keep them retained and reviewed so the next question can be answered."
            ),
            part(
              "Finding 4",
              "Classifies it primarily as authentication and identity lifecycle (an account that should have been disabled) with an authorization angle, and recommends a joiner/mover/leaver process in Cloud Identity so access ends when the contract does.",
              "Identity lifecycle, which is part of authentication: the contractor's account should have been suspended in January. Put a leaver process in Cloud Identity (and review access regularly) so accounts and their IAM roles end with the engagement."
            ),
          ],
        },
      ],
    },
    {
      slug: "name-the-threat-and-the-control",
      objective:
        "Common cybersecurity threats and their business impact: DDoS, ransomware, cryptomining, malware, phishing, misconfiguration, unsecured third-party systems, physical damage, LLM attacks",
      kind: "case",
      title: "Name the threat behind each incident and the control that addresses it",
      brief:
        "Oakhurst Ticketing is a fictional events company running its ticket shop on Google Cloud. Over one quarter its small IT team logs a series of incidents. You are asked to name what each one is, what it costs the business, and which Google Cloud control or practice addresses it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Week 2: on the morning a major festival goes on sale, the ticket site receives millions of requests a minute from tens of thousands of addresses and becomes unreachable for real customers for two hours.",
          ask: "What is this, what does it cost the business, and which Google Cloud product is designed to absorb it?",
          parts: [
            part(
              "Threat and impact",
              "Identifies a distributed denial-of-service (DDoS) attack and names the business impact: lost sales during the on-sale window and reputational damage.",
              "A DDoS attack: a flood of traffic from many sources to make the site unavailable. The cost is two hours of lost ticket sales on the most important morning of the quarter, plus angry customers."
            ),
            part(
              "Control",
              "Names Google Cloud Armor (with Cloud Load Balancing) as the product that provides DDoS protection and WAF rules at the edge.",
              "Google Cloud Armor in front of the load balancer: it absorbs volumetric attacks at Google's edge and lets Oakhurst add rate limits and WAF rules for the layer-7 flood."
            ),
          ],
        },
        {
          text: "Week 6: the finance manager opens an email that appears to come from the CEO asking her to approve a 'new supplier'; she enters her Google password on the linked page. Two days later the billing dashboard shows thirty large GPU virtual machines running in a region the company has never used, and the bill is climbing.",
          ask: "Name the two threats here and the controls that would have stopped each.",
          parts: [
            part(
              "First threat and control",
              "Identifies phishing (credential theft via a fake email and page) and names 2-Step Verification / MFA plus phishing-resistant sign-in as the control, with staff awareness.",
              "Phishing: a fake CEO email harvested a password. 2-Step Verification would have made the stolen password useless, ideally with a phishing-resistant second factor such as a security key, backed by staff training."
            ),
            part(
              "Second threat and control",
              "Identifies cryptomining (attacker-launched compute to mine currency at the victim's expense) and names controls such as least-privilege IAM, budget alerts and organisation policies restricting regions or resource types so a stolen account cannot do this.",
              "Cryptomining: the attacker used the account to launch GPU machines to mine currency on Oakhurst's bill. Least privilege (the finance manager's account should not be able to create VMs), an organisation policy restricting usable regions, and budget alerts to catch the spend early."
            ),
          ],
        },
        {
          text: "Week 11: a developer finds that the Cloud Storage bucket holding customer ID scans has been publicly readable since it was created, and a search engine has indexed some files. No attacker was involved.",
          ask: "What kind of threat is this, and which practice and controls prevent it?",
          parts: [
            part(
              "Threat and control",
              "Identifies misconfiguration (a human error exposing data, no attacker needed) with the business impact of a data breach and regulatory exposure, and names controls such as public access prevention and uniform bucket-level access on Cloud Storage, organisation policy to enforce them, and Security Command Center or posture checks to detect exposed buckets.",
              "Misconfiguration: nobody attacked anything; the bucket was simply left public, which is still a personal-data breach with regulatory consequences. Prevent it with public access prevention and uniform bucket-level access enforced by organisation policy, and detect it with Security Command Center's misconfiguration findings."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Scaling with Google Cloud Operations (10%)
    // ----------------------------------------------------------------------
    {
      slug: "sli-slo-sla-for-a-service",
      objective: "Core DevOps/SRE vocabulary: service level indicators, service level objectives, service level agreements",
      kind: "build",
      title: "Write the SLI, SLO and SLA for a booking service",
      brief:
        "Riverlight Hotels is a fictional hotel group whose online booking service is used by its own website and by travel agencies under contract. The operations lead has three sentences from different documents and asks you to label them and finish the set. Sentence A: 'The proportion of booking requests that return successfully within 2 seconds.' Sentence B: 'If the booking service is available less than 99.5% of the month, agencies receive a 10% credit on that month's fees.' Sentence C: '99.9% of booking requests should succeed within 2 seconds, measured over 30 days.' A month is taken as 30 days.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Label each sentence, explain how the three relate, and work out what 99.9% allows.",
          parts: [
            part(
              "Labels",
              "Labels A as the SLI (the measurement), C as the SLO (the internal target on that measurement) and B as the SLA (the contractual promise to customers with a consequence).",
              "A is the service level indicator: what is measured. C is the service level objective: the internal target for that indicator. B is the service level agreement: the external contract with agencies, with a credit if it is missed."
            ),
            part(
              "How they relate",
              "Explains that the SLO (99.9%) is deliberately stricter than the SLA (99.5%) so the team acts on its own target before the contractual one is at risk, and that both are measured by the SLI.",
              "The SLI feeds both. The SLO is set tighter than the SLA on purpose: the team reacts when 99.9% is threatened, long before the 99.5% contract and its credits are in danger."
            ),
            part(
              "What 99.9% allows",
              "Computes that 0.1% of 30 days is about 43 minutes (43.2 minutes) of failure per month, and names this the error budget the team may spend on releases and incidents.",
              "0.1% of 30 days (43,200 minutes) is 43.2 minutes a month of failing or slow requests. That is the error budget: once it is spent, releases slow down until reliability recovers."
            ),
          ],
        },
      ],
    },
    {
      slug: "cost-control-plan",
      objective: "Controlling cloud consumption: resource quota policies, budget threshold rules, Cloud Billing reports, Dynamic Workload Scheduler, Spot VMs",
      kind: "build",
      title: "Write a cost-control plan for a growing cloud bill",
      brief:
        "Stonebridge Analytics is a fictional consultancy whose Google Cloud bill doubled in six months. The finance director lists the problems: (1) nobody is warned before a month's spend passes the plan; (2) a junior analyst accidentally created 200 virtual machines in a sandbox project last month; (3) the overnight data-processing jobs can be interrupted and rerun but currently run on standard virtual machines around the clock; (4) nobody can say which client project caused the increase. The finance director wants a short plan that names a specific Google Cloud practice or tool for each problem, and understands that none of them can stop a machine that is already running.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give one tool or practice per problem and say what it does and does not do.",
          parts: [
            part(
              "Warning before overspend",
              "Names Cloud Billing budgets with threshold rules (for example alerts at 50%, 90% and 100% of the budget, including forecasted spend) and notes that a budget alerts people but does not stop spending by itself.",
              "A Cloud Billing budget per project or client with threshold rules at, say, 50%, 90% and 100% (and a forecast-based threshold) emails finance and the project owner. It warns; it does not switch anything off."
            ),
            part(
              "The 200 accidental VMs",
              "Names quotas (resource quota policies / quota limits on the sandbox project, for example on CPUs or instances) so the project cannot exceed a ceiling, plus least-privilege IAM so a junior cannot create at scale.",
              "Set a low quota on the sandbox project (for example CPUs per region) with a quota policy so the project physically cannot run 200 machines, and give the analyst a role that does not allow mass creation."
            ),
            part(
              "Overnight interruptible jobs",
              "Names Spot VMs for the interruptible batch work (deep discount, may be preempted at any time, no SLA, so only for restartable jobs) and mentions Dynamic Workload Scheduler for scheduling capacity when GPUs or TPUs are involved.",
              "Run the overnight jobs on Spot VMs: they are heavily discounted (Google says up to 91% off) because Compute Engine can take them back at any time, which these restartable jobs tolerate. If the jobs need GPUs or TPUs, Dynamic Workload Scheduler can obtain that capacity when it is needed rather than holding it all day."
            ),
            part(
              "Which client caused the increase",
              "Names Cloud Billing reports (and billing export to BigQuery) grouped by project and by labels, so each client's spend is visible and attributable, with a labelling convention as the practice.",
              "Use Cloud Billing reports filtered by project and label, and export billing data to BigQuery for detailed questions. Adopt a labelling rule (client, environment, owner) so every resource's cost can be attributed to a client."
            ),
          ],
        },
      ],
    },
  ],
};
