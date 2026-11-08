import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-153: AWS Certified Cloud Practitioner (CLF-C02), foundational level.
//
// Aligned to the CLF-C02 exam guide's four domains (Cloud Concepts 24%,
// Security and Compliance 30%, Cloud Technology and Services 34%, Billing,
// Pricing, and Support 12%; 50 scored questions, scaled 100-1,000, pass 700),
// re-read 2026-11-07:
//   https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html
// Density (docs/labs.md, policy "hybrid"): one lab per domain plus six
// weighted extras -> 2 / 3 / 3 / 2. The exam is multiple choice at a working
// vocabulary level, so every lab asks the learner to apply a concept to a
// small fictional business situation: classify, match a need to a service,
// say who owns a control -- never to configure or code.
//
// Facts and the AWS pages they were checked against on 2026-11-07:
//   - Shared responsibility model ("security of the cloud" / "security in the
//     cloud"; customers patch the guest OS on EC2):
//     https://aws.amazon.com/compliance/shared-responsibility-model/
//   - Root user: MFA, no everyday use, tasks only the root user can do (close
//     the account, change account settings, restore IAM user permissions):
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-tasks.html
//   - The seven migration strategies (7 Rs):
//     https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html
//   - The six Well-Architected pillars:
//     https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html
//   - S3 storage classes, retrieval times and minimum storage durations
//     (Standard-IA and One Zone-IA 30 days, Glacier Instant and Flexible
//     Retrieval 90 days, Deep Archive 180 days; Deep Archive retrieval within
//     12 hours; objects under 128 KB are not transitioned by default):
//     https://aws.amazon.com/s3/storage-classes/
//     https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html
//   - AWS Budgets (actual and forecasted alerts) and Cost Explorer (13 months
//     of history, forecasts, filters and groupings):
//     https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html
//     https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html
//   - Dedicated Hosts for eligible bring-your-own licences (Microsoft, Oracle)
//     with AWS License Manager: https://aws.amazon.com/ec2/dedicated-hosts/
// Every lab is needs_expert_review until a person checks it.

export const AWSCLF_LABS: SeedLabSet = {
  trackCode: "AWSCLF",
  sources: [
    "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html",
    "https://aws.amazon.com/compliance/shared-responsibility-model/",
    "https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-tasks.html",
    "https://docs.aws.amazon.com/prescriptive-guidance/latest/large-migration-guide/migration-strategies.html",
    "https://aws.amazon.com/s3/storage-classes/",
    "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html",
    "https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html",
  ],
  labs: [
    // ----- Cloud Concepts (2) -----
    {
      slug: "classify-workloads-7rs",
      objective: "Migration strategies and which one fits a given workload, including database replication",
      kind: "build",
      title: "Classify four workloads against the migration strategies",
      brief:
        "Harbourline Logistics is moving its data centre to AWS next year. The IT director lists four systems. (1) A fleet of 40 Windows virtual machines running an in-house shipment tracker; nothing may change in the application before the move because the team that wrote it has left. (2) An on-premises Oracle database that the business wants to keep as a relational database but stop patching and backing up by hand. (3) A home-grown HR system that only 12 people still use; the company has already bought a subscription to a SaaS HR product. (4) A tape-backup catalogue application that nobody has opened in two years and whose data is already duplicated elsewhere. Harbourline wants the least risk and effort that still gets each system off the data-centre floor.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the migration strategy for each system and the one fact that decides it.",
          parts: [
            part(
              "Shipment tracker (40 VMs)",
              "Chooses rehost (lift and shift), because the application cannot be changed and the goal is to move it as it is.",
              "Rehost (lift and shift): the application cannot be modified, so the servers are moved to EC2 as they are, for example with AWS Application Migration Service, and modernised later if ever."
            ),
            part(
              "Oracle database",
              "Chooses replatform (lift, tinker and shift): keep a relational database but move it to a managed service such as Amazon RDS so AWS handles patching and backups; database replication (for example AWS DMS) moves the data.",
              "Replatform: move it to Amazon RDS so patching, backups and failover become AWS's job, without rewriting the application. AWS Database Migration Service replicates the data across while the old database keeps running."
            ),
            part(
              "HR system",
              "Chooses repurchase (drop and shop), because a SaaS replacement has already been bought.",
              "Repurchase: the SaaS HR product replaces the home-grown system, so the old application is not migrated at all; the data is moved into the new product."
            ),
            part(
              "Tape-backup catalogue",
              "Chooses retire, because the application is unused and its data exists elsewhere.",
              "Retire: nobody uses it and the data is duplicated, so it is decommissioned rather than moved, which also removes its licence and server cost."
            ),
          ],
        },
      ],
    },
    {
      slug: "name-the-pillar",
      objective: "Telling the pillars apart: which concern each one owns, and where two of them conflict",
      kind: "build",
      title: "Name the Well-Architected pillar behind each decision",
      brief:
        "A review of a fictional ticketing start-up, Rowan Events, produces four findings. (A) The web tier runs in one Availability Zone; the team is asked to spread it across two. (B) Deployments are done by hand from a laptop; the team is asked to script them and keep runbooks. (C) The database server is three sizes larger than its busiest hour ever needed. (D) Report generation takes nine minutes because every report re-reads the whole order table; a cache would make it seconds. The founders also ask a question: they want to keep every server running at 15% utilisation 'so it never slows down', but the finance lead wants to cut the bill.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Assign each finding to a pillar of the AWS Well-Architected Framework, then name the two pillars in the founders' disagreement and how an architect resolves it.",
          parts: [
            part(
              "Findings A and B",
              "Maps A (one AZ, spread to two) to Reliability and B (manual deployments, runbooks) to Operational Excellence.",
              "A is Reliability: running in more than one Availability Zone lets the system recover from the loss of one. B is Operational Excellence: operations as code and runbooks make releases repeatable and recoverable."
            ),
            part(
              "Findings C and D",
              "Maps C (oversized database) to Cost Optimization and D (slow reports, caching) to Performance Efficiency.",
              "C is Cost Optimization: rightsizing the database stops paying for capacity that is never used. D is Performance Efficiency: using a cache matches the resource to the access pattern instead of re-reading the table."
            ),
            part(
              "The founders' conflict",
              "Names Performance Efficiency (or Reliability) against Cost Optimization, and resolves it with a measurable target (latency or availability) plus elasticity (Auto Scaling) so capacity follows demand rather than sitting idle.",
              "Performance Efficiency pulling against Cost Optimization. The resolution is to agree a measurable target, say page loads under two seconds, then use Auto Scaling so capacity grows at peak and shrinks after, instead of paying for 85% idle servers all year."
            ),
          ],
        },
      ],
    },
    // ----- Security and Compliance (3) -----
    {
      slug: "shared-responsibility-three-services",
      objective: "How the responsibility line shifts by service: Amazon EC2 versus Amazon RDS versus AWS Lambda",
      kind: "build",
      title: "Draw the responsibility line for EC2, RDS and Lambda",
      brief:
        "Cedar & Finch, a fictional accounting firm, is adopting AWS and its compliance officer asks a simple question for three services the team plans to use: an Amazon EC2 instance running their own Linux web server, an Amazon RDS for MySQL database, and an AWS Lambda function that processes uploaded invoices. For each one she wants to know who patches the operating system, who protects the data, and who controls access. She also wants to know what never changes regardless of service.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Fill in the shared responsibility model for the three services.",
          parts: [
            part(
              "Amazon EC2",
              "States that the customer patches the guest operating system and applications, configures the security groups and firewall, encrypts data and manages IAM, while AWS secures the physical hosts, hypervisor and facilities.",
              "EC2 is infrastructure as a service: Cedar & Finch patch the Linux guest OS and web server, configure security groups, encrypt the volumes and manage IAM; AWS owns the physical servers, hypervisor, network and buildings."
            ),
            part(
              "Amazon RDS",
              "States that AWS now patches the database engine and underlying OS and handles backups when enabled, while the customer still controls network access (security groups), IAM and database users, and encryption settings.",
              "With RDS the line moves up: AWS patches the OS and MySQL engine and runs backups and failover; the firm still decides who can reach the database (security groups), manages database accounts and IAM, and turns on encryption."
            ),
            part(
              "AWS Lambda",
              "States that AWS manages the runtime, OS patching and capacity, while the customer is responsible for the function code, its IAM execution role permissions, and the data it handles.",
              "With Lambda the firm is responsible only for the code it writes, the permissions of the function's execution role and the invoice data it processes; AWS runs and patches the runtime and infrastructure underneath."
            ),
            part(
              "What never moves",
              "Says the customer always owns its data, its classification and encryption choices, and identity and access management; AWS always owns security of the cloud (physical infrastructure, global network).",
              "Whatever the service, the customer owns the data, how it is classified and encrypted, and who gets access (IAM); AWS always owns security of the cloud: the facilities, hardware and global infrastructure."
            ),
          ],
        },
      ],
    },
    {
      slug: "secure-new-account-root-user",
      objective: "Protecting the root user, and the short list of tasks only the root user can perform",
      kind: "case",
      title: "Secure a brand-new AWS account",
      brief:
        "Maple Street Bakery, a fictional small business, has just created its first AWS account using the owner's email address. The owner has been signing in with the root user every day to launch servers, and asks you to set the account up properly.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You sign in and find: the root user has no multi-factor authentication, and an access key pair for the root user was created last week so a contractor could use the CLI.",
          ask: "What do you change about the root user, and how should the owner and the contractor work from now on?",
          parts: [
            part(
              "Root user protection",
              "Enables MFA on the root user, deletes (or at least deactivates) the root user's access keys, and stops using the root user for daily work.",
              "Turn on MFA for the root user, delete the root access keys the contractor was given, and lock the root credentials away so they are used only when nothing else can do the job."
            ),
            part(
              "Everyday access",
              "Creates separate identities for people (IAM Identity Center users or IAM users with MFA) with least-privilege permissions; the contractor gets their own identity, not shared root keys.",
              "Give the owner and the contractor their own sign-ins through IAM Identity Center (or IAM users) with MFA and only the permissions each needs; nobody shares credentials, and the contractor's access can be removed when the work ends."
            ),
          ],
        },
        {
          text: "A month later the owner receives an email claiming to be from AWS saying the account will be closed unless she 'verifies' her root password at a link. The same week she genuinely needs to change the account's contact email address and close an unused second account.",
          ask: "How does she handle the email, and which of her two genuine tasks need the root user?",
          parts: [
            part(
              "The email",
              "Treats it as phishing: does not click the link or enter the password, signs in only through the known AWS console address, and reports it; notes that MFA limits the damage even if a password leaked.",
              "Phishing: do not click, do not enter credentials. Sign in by typing the AWS console address yourself and check the account there; report the message to AWS. MFA on the root user means a stolen password alone is not enough."
            ),
            part(
              "Which tasks need root",
              "Identifies that changing account settings such as the root email and closing an account are among the few tasks that require the root user, so she signs in as root with MFA, does them, and signs out.",
              "Both are on the short list only the root user can do: changing account settings like the root email, and closing an AWS account. She signs in as root with MFA, completes them, and goes back to her everyday identity."
            ),
          ],
        },
      ],
    },
    {
      slug: "match-security-finding-services",
      objective: "Services that find and report security problems: Amazon Inspector, Amazon GuardDuty, AWS Security Hub, AWS Shield",
      kind: "build",
      title: "Match each security worry to the AWS service that answers it",
      brief:
        "The new security lead at Pinecrest Media, a fictional streaming company, writes down four worries. (1) 'Some of our EC2 instances and container images probably have known software vulnerabilities and I have no list.' (2) 'If an attacker steals a key and starts mining cryptocurrency or talking to a known bad IP address from our account, I want to be told.' (3) 'Our public website must stay up through a distributed denial-of-service attack.' (4) 'We now have findings from several tools and twenty accounts; I want one place that scores them and checks us against a security standard.'",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the service for each worry and what it actually does.",
          parts: [
            part(
              "Worry 1: known vulnerabilities",
              "Chooses Amazon Inspector, a vulnerability scanner for EC2 instances, container images and Lambda functions that reports known software vulnerabilities and unintended network exposure.",
              "Amazon Inspector: it scans EC2 instances, container images in Amazon ECR and Lambda functions for known vulnerabilities (CVEs) and network exposure, and produces the list she is missing."
            ),
            part(
              "Worry 2: suspicious activity",
              "Chooses Amazon GuardDuty, a threat-detection service that analyses CloudTrail, VPC flow and DNS logs for malicious or unauthorised behaviour.",
              "Amazon GuardDuty: continuous threat detection over account activity and network logs, which produces findings such as cryptocurrency mining or communication with known malicious addresses."
            ),
            part(
              "Worry 3: DDoS",
              "Chooses AWS Shield (Standard is automatic and free; Advanced adds more protection and support) for DDoS protection.",
              "AWS Shield: Shield Standard protects every AWS customer automatically against common network-layer DDoS attacks; Shield Advanced adds larger-attack protection, visibility and response support for the website."
            ),
            part(
              "Worry 4: one view with a standard",
              "Chooses AWS Security Hub to aggregate findings from AWS and partner services across accounts and run checks against security standards.",
              "AWS Security Hub: it collects findings from Inspector, GuardDuty and other tools across all twenty accounts into one view, scores them and runs automated checks against standards such as the AWS Foundational Security Best Practices."
            ),
          ],
        },
      ],
    },
    // ----- Cloud Technology and Services (3) -----
    {
      slug: "choose-s3-storage-class",
      objective: "Object storage, and the differences between Amazon S3 storage classes",
      kind: "build",
      title: "Choose an S3 storage class for four kinds of data",
      brief:
        "Glenview Clinic Group, a fictional chain of veterinary clinics, stores four kinds of files in Amazon S3. (1) Product images for its website, viewed thousands of times a day. (2) Monthly accounting exports: downloaded rarely, but when the accountant asks for one she needs it within seconds, and the files must survive the loss of a data centre. (3) Seven years of old appointment records kept only for legal reasons; a request to see one arrives perhaps once a year and can wait until the next morning. (4) A new data-science team's working files, whose access pattern nobody can predict yet and which the team does not want to manage by hand.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick a storage class for each kind of data and give the deciding reason.",
          parts: [
            part(
              "Website images",
              "Chooses S3 Standard for frequently accessed data with millisecond access and no retrieval fee.",
              "S3 Standard: it is read constantly, so the class with the highest per-GB price but no retrieval charge and millisecond access is the cheapest overall."
            ),
            part(
              "Accounting exports",
              "Chooses S3 Standard-Infrequent Access (not One Zone-IA), because access is rare but must be immediate and the data must survive the loss of an Availability Zone; notes the per-GB retrieval charge and 30-day minimum storage duration.",
              "S3 Standard-IA: lower storage price for rarely read files, still milliseconds to retrieve, stored across at least three Availability Zones. Not One Zone-IA, which lives in a single AZ. Expect a per-GB retrieval fee and a 30-day minimum charge per object."
            ),
            part(
              "Old appointment records",
              "Chooses S3 Glacier Deep Archive (or Glacier Flexible Retrieval), explaining that retrieval in hours (Deep Archive within 12 hours) is acceptable and the storage price is the lowest; mentions the 180-day minimum.",
              "S3 Glacier Deep Archive: the lowest-cost class for data touched about once a year; a standard retrieval completes within 12 hours, which suits 'by the next morning'. Objects carry a 180-day minimum storage charge, fine for seven-year records."
            ),
            part(
              "Unpredictable working files",
              "Chooses S3 Intelligent-Tiering, which moves objects between access tiers automatically for a small monitoring charge with no retrieval fees.",
              "S3 Intelligent-Tiering: it watches each object's access and moves it between frequent, infrequent and archive-instant tiers automatically, with no retrieval charges, so the team pays less without managing lifecycle rules."
            ),
          ],
        },
      ],
    },
    {
      slug: "match-integration-service",
      objective: "Application integration: Amazon SQS, Amazon SNS, Amazon EventBridge",
      kind: "build",
      title: "Pick SQS, SNS or EventBridge for each integration",
      brief:
        "Tidewater Rentals, a fictional holiday-let company, is splitting its booking system into parts. The developers describe three needs. (1) When a booking is paid, the invoice service must process it even if it is briefly offline; no booking may be lost, and the invoice service should work through a backlog at its own pace. (2) When a booking is cancelled, three different teams' systems (housekeeping, finance, the owner-portal) all need to hear about it at the same moment. (3) When a cleaner uploads a damage report to S3, or when an EC2 instance changes state, or when a partner's SaaS tool posts an event, the operations team wants rules that route each kind of event to a different handler.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the service for each need and say what property of it makes it the right fit.",
          parts: [
            part(
              "Paid booking to invoice service",
              "Chooses Amazon SQS: a message queue that stores messages until the consumer retrieves them, so a briefly offline consumer loses nothing and works through the backlog.",
              "Amazon SQS: the booking service puts a message on a queue and the invoice service pulls messages when it is ready. Messages wait durably in the queue, so an outage of the consumer delays processing instead of losing bookings."
            ),
            part(
              "Cancellation to three teams",
              "Chooses Amazon SNS: publish/subscribe fan-out that pushes one message to many subscribers at once.",
              "Amazon SNS: one 'booking cancelled' message is published to a topic and pushed to every subscriber, so housekeeping, finance and the owner-portal all receive it at the same time without the booking service knowing about each one."
            ),
            part(
              "Routing many kinds of events",
              "Chooses Amazon EventBridge: an event bus that receives events from AWS services, your own applications and SaaS partners and routes them by rules to targets.",
              "Amazon EventBridge: an event bus with rules that match on an event's content, so S3 uploads, EC2 state changes and the partner's SaaS events each route to their own handler, and new routes are added as rules rather than code."
            ),
          ],
        },
      ],
    },
    {
      slug: "multi-az-or-multi-region",
      objective: "When a workload needs multiple Regions: disaster recovery, business continuity, latency, data sovereignty",
      kind: "build",
      title: "Decide which workloads need a second Region",
      brief:
        "Northgate Insurance, a fictional insurer based in Frankfurt, runs everything in one AWS Region in Germany. The board asks whether four systems need a second Region. (1) The customer portal, which must survive the failure of a single data centre but has no users outside Europe. (2) A new mobile app launching in Australia, where users complain that every tap takes a noticeable moment. (3) A claims archive that a national regulator says must never leave Germany. (4) The core policy database, for which the board has decided the company must keep operating even if the whole German Region were unavailable for a day.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each system, say whether multiple Availability Zones in one Region are enough or a second Region is needed, and which of the four reasons (disaster recovery, business continuity, latency, data sovereignty) applies.",
          parts: [
            part(
              "Customer portal",
              "Says multiple Availability Zones in the existing Region are enough: AZs are separate data centres, which covers the loss of one, and there is no latency or sovereignty reason for another Region.",
              "Multi-AZ is enough. Availability Zones are physically separate data centres in the Region, so running across two or three survives the loss of one. With European-only users there is no latency or legal case for a second Region."
            ),
            part(
              "Australian mobile app",
              "Says a second Region (in Australia) for latency: serving users from a Region near them cuts round-trip time.",
              "Second Region, for latency: deploying in an Australian Region puts the backend close to those users, so each request travels thousands of kilometres less. Edge services (CloudFront) help static content but the app's API should be near its users."
            ),
            part(
              "Claims archive",
              "Says it must stay in the German Region for data sovereignty, so no second Region outside Germany; resilience comes from multiple AZs within that Region.",
              "Stay in the German Region, for data sovereignty: the regulator's rule means the data cannot be replicated to another country, so resilience is built from multiple Availability Zones inside Germany and the archive is never copied abroad."
            ),
            part(
              "Core policy database",
              "Says a second Region is required for disaster recovery and business continuity, because the stated requirement is to survive a whole-Region outage, which multi-AZ cannot cover.",
              "Second Region, for disaster recovery and business continuity: the board's requirement is to keep working through the loss of the entire Region, and no number of Availability Zones in that Region meets it. Replicate the database to a second EU Region and plan the failover."
            ),
          ],
        },
      ],
    },
    // ----- Billing, Pricing, and Support (2) -----
    {
      slug: "purchasing-option-per-workload",
      objective: "Matching a purchasing option to a workload's predictability and tolerance for interruption",
      kind: "build",
      title: "Match a purchasing option to each workload",
      brief:
        "Fernhill Analytics, a fictional company, has four EC2 workloads and wants to pay as little as possible without breaking any of them. (1) A customer-facing API that has run on the same six instances around the clock for two years and will for the next three. (2) An overnight data-crunching job that can be stopped and restarted at any point with no deadline before 08:00. (3) A one-month pilot with a new customer whose traffic nobody can predict and which must not be interrupted. (4) A Microsoft SQL Server workload whose existing per-socket licences the vendor allows to be brought to the cloud only if the physical server is dedicated to Fernhill.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a purchasing option for each workload and say what it gives up.",
          parts: [
            part(
              "Steady API",
              "Chooses a Savings Plan or Reserved Instances (1- or 3-year commitment) for the steady 24/7 baseline, noting that the trade-off is a commitment even if usage falls.",
              "A Savings Plan or Reserved Instances over a 3-year term for the six always-on instances: the largest discount for steady usage, in exchange for paying the commitment whether or not the instances are still needed."
            ),
            part(
              "Overnight job",
              "Chooses Spot Instances, because the job tolerates interruption, noting that Spot capacity can be reclaimed at short notice.",
              "Spot Instances: deepest discount on spare capacity; the only cost is that AWS can reclaim them with little warning, which this restartable, deadline-free job tolerates."
            ),
            part(
              "One-month pilot",
              "Chooses On-Demand: no commitment for a short, unpredictable workload and no interruptions, accepting the highest hourly price.",
              "On-Demand: pay by the hour or second with no commitment, and the instances are never interrupted; the price per hour is the highest, which is acceptable for one month of unknown load."
            ),
            part(
              "Licensed SQL Server",
              "Chooses Dedicated Hosts, because bring-your-own per-socket or per-core licences require a physical server dedicated to the customer, with AWS License Manager to track usage.",
              "Dedicated Hosts: a whole physical server for Fernhill alone, which is what the per-socket licence terms require, with visibility of sockets and cores and AWS License Manager to track the licences. Dedicated Instances would not expose the hardware the licence counts."
            ),
          ],
        },
      ],
    },
    {
      slug: "surprise-bill-budgets-cost-explorer",
      objective: "AWS Budgets and AWS Cost Explorer, and which question each answers",
      kind: "case",
      title: "Work a surprise AWS bill with Cost Explorer and Budgets",
      brief:
        "Bluebell Learning, a fictional online tutoring company, normally spends about $4,000 a month on AWS. This month's invoice is $9,600. The finance manager has never opened the billing console and asks you to find out what happened and make sure it never surprises her again.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The invoice shows only service totals: EC2 is up by $5,200. Nobody knows which team or environment caused it.",
          ask: "Which tool do you open first, and how do you use it to find the cause?",
          parts: [
            part(
              "Tool and question",
              "Opens AWS Cost Explorer, because it answers 'what did we spend, on what, and when' over past months (up to 13 months of history) with filtering and grouping.",
              "AWS Cost Explorer: it visualises past spend (up to 13 months) and lets you filter and group it, so it answers the question 'where did the extra $5,200 go and when did it start'."
            ),
            part(
              "How to narrow it down",
              "Groups or filters EC2 cost by a dimension such as usage type, instance type, Region, linked account or a cost allocation tag (team or environment), and looks at the daily view to see when the jump began.",
              "Switch to a daily view of EC2 cost and group by instance type, Region or the 'environment' cost allocation tag; the day the line jumps and the group that carries it points to, say, a test environment left running in a Region the company does not normally use."
            ),
          ],
        },
        {
          text: "Cost Explorer shows the jump began on the 9th, in a 'staging' tagged environment, where several large instances were left running after a load test.",
          ask: "What do you set up so finance is told before the next overrun, not after the invoice?",
          parts: [
            part(
              "Tool and configuration",
              "Creates an AWS Budget (cost budget) at about the normal monthly spend with alerts at thresholds such as 80% and 100% of the amount, sent by email or SNS to finance.",
              "An AWS Budgets cost budget of $4,500 a month with alert notifications at 80% and 100%, emailed to the finance manager and the engineering lead, so the warning arrives mid-month rather than on the invoice."
            ),
            part(
              "Forecast, not just actuals",
              "Adds a forecasted-spend alert so the budget warns when the month is on track to exceed the amount, before the money is spent; optionally a budget scoped to the staging tag.",
              "Turn on a forecasted alert as well as actual: Budgets projects the month from spend so far and warns when the forecast crosses the amount, days before it is actually exceeded. A second budget filtered to the 'staging' tag catches that environment specifically."
            ),
          ],
        },
        {
          text: "Finance also asks whether, next time a team plans a new project, they can know the cost before anything is launched.",
          ask: "What do you point them to, and what is the difference from the two tools you have used?",
          parts: [
            part(
              "Estimating before spending",
              "Points to the AWS Pricing Calculator for an estimate before launching, and explains the split: Pricing Calculator estimates future cost before use, Cost Explorer analyses past and current spend, Budgets alerts against a planned amount.",
              "The AWS Pricing Calculator: it builds a cost estimate from the planned services before anything runs. Cost Explorer looks backwards at what was spent, Budgets watches spend against a plan and alerts, and the Pricing Calculator looks forward before the spend exists."
            ),
          ],
        },
      ],
    },
  ],
};
