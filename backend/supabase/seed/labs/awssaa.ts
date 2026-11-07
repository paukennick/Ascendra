import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-123 pilot: AWS Certified Solutions Architect - Associate (SAA-C03).
//
// Aligned to the SAA-C03 exam guide's four domains and their task statements
// (Design Secure Architectures 30%, Design Resilient Architectures 26%, Design
// High-Performing Architectures 24%, Design Cost-Optimized Architectures 20%):
//   https://docs.aws.amazon.com/aws-certification/latest/examguides/solutions-architect-associate-03.html
// Density (docs/labs.md, policy "hybrid"): one lab per domain plus six
// weighted extras -> 3 / 3 / 2 / 2. The skills chosen are the ones the exam
// asks a candidate to DO in scenario items: scope a policy, lay out a VPC,
// pick a DR strategy from RTO/RPO, match storage and databases to stated
// requirements, and cut cost without breaking a requirement.
// Facts kept to long-stable behaviour (IAM policy grammar, security group vs
// NACL statefulness, the AWS DR strategy tiers, S3 lifecycle minimum storage
// durations); every lab is needs_expert_review until a person checks it.

export const AWSSAA_LABS: SeedLabSet = {
  trackCode: "AWSSAA",
  sources: ["https://docs.aws.amazon.com/aws-certification/latest/examguides/solutions-architect-associate-03.html"],
  labs: [
    {
      slug: "least-privilege-lambda-policy",
      objective: "A flexible authorization model built from IAM users, groups, roles, and policies",
      kind: "build",
      title: "Write a least-privilege policy for a Lambda function",
      brief:
        "Brightline Media runs a Lambda function, thumbnailer, in one account. It reads images from the uploads/ prefix of the S3 bucket brightline-media-prod and writes one item per image to the DynamoDB table ImageIndex in us-east-1 (account 111122223333). The bucket uses SSE-S3 encryption. A developer proposes attaching AdministratorAccess to the function \"for now\" and storing an access key in an environment variable so the code can sign requests.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the access design for the function: how it gets credentials, and the policy statements it needs.",
          parts: [
            part(
              "How the function gets credentials",
              "Uses an IAM execution role assumed by the Lambda service (temporary credentials from STS), and rejects long-term access keys in environment variables.",
              "Give the function an IAM execution role that Lambda assumes; the SDK picks up the role's temporary credentials automatically. No access keys in environment variables -- they are long-term secrets that can leak and are never rotated."
            ),
            part(
              "S3 statement",
              "Allows only s3:GetObject (read) on the objects under uploads/ (an object ARN such as arn:aws:s3:::brightline-media-prod/uploads/*), not s3:* and not the whole bucket.",
              '{"Effect":"Allow","Action":"s3:GetObject","Resource":"arn:aws:s3:::brightline-media-prod/uploads/*"}'
            ),
            part(
              "DynamoDB statement",
              "Allows only the write action it needs (dynamodb:PutItem) on the ImageIndex table ARN in that account and Region, not dynamodb:* or every table.",
              '{"Effect":"Allow","Action":"dynamodb:PutItem","Resource":"arn:aws:dynamodb:us-east-1:111122223333:table/ImageIndex"}'
            ),
            part(
              "What is left out and why",
              "Explains at least one deliberate exclusion: no wildcard actions or resources, no AdministratorAccess, and no KMS permission because SSE-S3 needs none (a KMS key would need kms:Decrypt).",
              "No AdministratorAccess or wildcards: anything beyond GetObject on uploads/ and PutItem on one table widens the blast radius if the function is compromised. No kms:Decrypt either -- SSE-S3 is handled by S3; it would only be needed with an SSE-KMS key. Logging permissions come from the basic execution managed policy."
            ),
          ],
        },
      ],
    },
    {
      slug: "three-tier-vpc-security",
      objective: "VPC security components: security groups, network ACLs, route tables, NAT gateways",
      kind: "build",
      title: "Lay out security groups and routes for a three-tier VPC",
      brief:
        "A three-tier web app is moving into a new VPC that spans two Availability Zones. Users reach it over HTTPS through an internet-facing Application Load Balancer. The application tier runs on EC2 instances listening on port 8080. The database is Amazon RDS for PostgreSQL (port 5432). Application instances must download OS patches from the internet, but nothing on the internet may open a connection to them or to the database.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the network controls for the three tiers.",
          parts: [
            part(
              "Subnets and placement",
              "Puts the ALB in public subnets in both AZs and the application instances and the database in private subnets in both AZs.",
              "Public subnets (one per AZ) hold the ALB and a NAT gateway; private app subnets (one per AZ) hold the EC2 instances; private data subnets (one per AZ) hold RDS."
            ),
            part(
              "Security group rules",
              "ALB SG allows inbound 443 from 0.0.0.0/0; app SG allows inbound 8080 only from the ALB's security group (a SG reference, not a CIDR); DB SG allows 5432 only from the app SG.",
              "sg-alb: inbound TCP 443 from 0.0.0.0/0. sg-app: inbound TCP 8080 from sg-alb. sg-db: inbound TCP 5432 from sg-app. Outbound left at the default (security groups are stateful, so replies are allowed automatically)."
            ),
            part(
              "Route tables",
              "Public subnets route 0.0.0.0/0 to an internet gateway; private app subnets route 0.0.0.0/0 to a NAT gateway in a public subnet (one per AZ for resilience); database subnets need no internet route.",
              "Public route table: 0.0.0.0/0 -> internet gateway. Private app route tables: 0.0.0.0/0 -> the NAT gateway in the same AZ's public subnet. Data route table: local route only."
            ),
            part(
              "Security group vs network ACL",
              "States that security groups are stateful and evaluate allow rules at the instance level, while network ACLs are stateless subnet-level rules with allow and deny that need return traffic (ephemeral ports) allowed explicitly.",
              "Security groups are stateful and allow-only, attached to instances; network ACLs are stateless, apply to whole subnets, support explicit deny and need return traffic on ephemeral ports allowed both ways. Here the SGs do the work; NACLs can stay at the default or add a subnet-level deny."
            ),
          ],
        },
      ],
    },
    {
      slug: "leaked-access-key-response",
      objective: "Applying IAM security practices to users and the root user, including MFA",
      kind: "case",
      title: "Respond to an access key leaked in a public repository",
      brief:
        "On a Monday morning you are told that an IAM user's access key for the company's production account was committed to a public code repository on Friday night. The user, deploy-bot, has broad EC2 and S3 permissions. You are the architect on call.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The key is still active. Nobody has looked at the account's activity since Friday.",
          ask: "What do you do first, and what do you look at?",
          parts: [
            part(
              "Containment",
              "Deactivates (then deletes) the exposed access key immediately, before investigating.",
              "Deactivate the access key now (then delete it once nothing legitimate depends on it) -- every minute it stays active it can be used."
            ),
            part(
              "Investigation",
              "Reviews AWS CloudTrail for API calls made with that key since the leak (and checks for new IAM users, keys or roles created by it).",
              "Search CloudTrail event history for the key's access key ID since Friday: what was called, from where, and whether it created users, keys, roles or resources that would keep access after the key is gone."
            ),
          ],
        },
        {
          text: "CloudTrail shows the key launched 40 large EC2 instances in a Region the company never uses, and Amazon GuardDuty has findings about cryptocurrency-mining activity on them.",
          ask: "How do you clean up and stop this from happening in Regions you don't use?",
          parts: [
            part(
              "Clean-up",
              "Terminates the unauthorised instances (after preserving evidence if required) and removes anything else the attacker created.",
              "Snapshot or record what forensics needs, then terminate the instances in that Region and delete any users, keys, roles or other resources the attacker created."
            ),
            part(
              "Region guardrail",
              "Uses an AWS Organizations service control policy (SCP) to deny actions in Regions the company does not use.",
              "Attach an SCP to the organisation's accounts that denies requests outside the approved Regions (with exceptions for global services), so even a leaked credential with EC2 rights cannot launch there."
            ),
          ],
        },
        {
          text: "Leadership asks how to make long-term keys like this unnecessary.",
          ask: "What do you change for people and for automation?",
          parts: [
            part(
              "Automation credentials",
              "Replaces long-term access keys for automation with IAM roles and temporary credentials (for example an instance profile, a CI/CD role assumed via OIDC federation, or a role the pipeline assumes).",
              "Run deployments with an IAM role the pipeline assumes (for example through OIDC federation from the CI system) so it gets short-lived credentials; no access keys to commit."
            ),
            part(
              "Human access",
              "Moves people to federated or IAM Identity Center sign-in with MFA, keeps the root user locked away with MFA and no access keys, and applies least privilege.",
              "People sign in through IAM Identity Center (or federation) with MFA and get permission sets scoped to their job; the root user has MFA, no access keys and is used only for the few tasks that need it."
            ),
          ],
        },
      ],
    },
    {
      slug: "dr-strategy-from-rto-rpo",
      objective: "RTO and RPO, and letting them choose the DR strategy rather than the other way round",
      kind: "build",
      title: "Choose a disaster recovery strategy from RTO and RPO",
      brief:
        "An order-management application runs in one AWS Region on EC2 behind an Application Load Balancer, with an Amazon Aurora MySQL database and product images in Amazon S3. The business sets a recovery time objective (RTO) of 1 hour and a recovery point objective (RPO) of 15 minutes for a Region-wide outage, and wants the lowest cost that meets both.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the DR design.",
          parts: [
            part(
              "Strategy and why",
              "Chooses pilot light (data replicated continuously, core infrastructure minimal or off in the recovery Region) and explains that backup and restore cannot meet a 15-minute RPO / 1-hour RTO reliably, while warm standby or multi-site cost more than needed.",
              "Pilot light. Backup and restore typically recovers in hours and loses data back to the last backup, so it misses both targets; warm standby and active-active meet them but keep more capacity running than a 1-hour RTO requires. Pilot light keeps the data live in the second Region and scales the app up on failover, which fits tens-of-minutes recovery."
            ),
            part(
              "Data replication",
              "Replicates the database continuously to the recovery Region (for example Aurora Global Database or a cross-Region read replica) and replicates the S3 objects (S3 Cross-Region Replication).",
              "Aurora Global Database (or a cross-Region replica) keeps the database seconds behind; S3 Cross-Region Replication copies the images; AMIs and launch templates are copied to the recovery Region."
            ),
            part(
              "Failover",
              "Describes how traffic moves: promote the replica, scale out the app tier (Auto Scaling from a pre-built launch template/AMI) and switch DNS with Amazon Route 53 failover routing driven by health checks.",
              "On failover: promote the secondary database, raise the Auto Scaling group's desired capacity in the recovery Region, and let a Route 53 failover record (with health checks on the primary) send users to the recovery ALB."
            ),
            part(
              "Proving it works",
              "Plans regular DR tests that measure actual recovery time and data loss against the targets, and checks service quotas in the recovery Region are high enough for full capacity.",
              "Run a scheduled failover drill, time it against the 1-hour RTO and measure data loss against 15 minutes; confirm EC2 and other service quotas in the recovery Region can take the full fleet before you need them."
            ),
          ],
        },
      ],
    },
    {
      slug: "decouple-orders-sqs-sns",
      objective: "Decoupling with queues and pub/sub: Amazon SQS and Amazon SNS",
      kind: "build",
      title: "Decouple an order service with SNS and SQS",
      brief:
        "When an order is placed, the order service calls the inventory, email and analytics services one after another over HTTP. When the analytics service is slow, checkout times out and customers see errors, even though analytics is not needed to complete an order. Each downstream service must still receive every order, and a failed message must not be lost.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Redesign the integration.",
          parts: [
            part(
              "Pattern",
              "Publishes each order once to an SNS topic that fans out to one SQS queue per consuming service, so the order service no longer waits on consumers.",
              "Order service publishes an OrderPlaced message to an SNS topic; inventory, email and analytics each subscribe their own SQS queue and process at their own pace. Checkout only waits for the publish."
            ),
            part(
              "Failure handling",
              "Configures a dead-letter queue with a redrive policy (maximum receives) on each queue so poison messages are set aside, not lost or retried forever.",
              "Each queue has a dead-letter queue; after a set number of failed receives the message moves there for inspection and replay instead of blocking the queue."
            ),
            part(
              "Visibility timeout",
              "Sets the visibility timeout longer than the time a consumer needs to process a message, explaining that otherwise the message becomes visible again and is processed twice.",
              "Visibility timeout comfortably above the worst-case processing time, so a message being worked on is not handed to another consumer mid-way."
            ),
            part(
              "Duplicates and ordering",
              "Explains that standard queues deliver at least once (and not strictly in order), so consumers must be idempotent, or uses FIFO queues where order and exactly-once processing matter.",
              "Standard queues can deliver a message more than once and out of order, so consumers are idempotent (for example keyed on order ID). If inventory needs strict order per product, use an SNS FIFO topic with SQS FIFO queues and a message group ID."
            ),
          ],
        },
      ],
    },
    {
      slug: "remove-single-points-of-failure",
      objective: "Designing out single points of failure",
      kind: "case",
      title: "Remove the single points of failure from a growing web app",
      brief:
        "A booking site runs on one EC2 instance with its database on a single-AZ Amazon RDS instance in the same Availability Zone. Users sign in, and the app keeps their session in the instance's memory.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "An Availability Zone has a brief impairment and the whole site is down for 40 minutes.",
          ask: "What do you change in the web tier first?",
          parts: [
            part(
              "Web tier",
              "Runs the app in an Auto Scaling group across at least two AZs behind an Application Load Balancer with health checks.",
              "An Auto Scaling group spanning two or more AZs behind an ALB; health checks replace failed instances and the ALB stops sending traffic to an impaired AZ."
            ),
          ],
        },
        {
          text: "The web tier now survives losing an AZ, but during a test the database becomes unreachable when its AZ is impaired.",
          ask: "How do you make the database survive an AZ failure?",
          parts: [
            part(
              "Database",
              "Enables RDS Multi-AZ (a synchronous standby in another AZ with automatic failover behind the same endpoint), and does not rely on a read replica for this.",
              "Turn on RDS Multi-AZ: a standby in another AZ kept in sync, with automatic failover; the app keeps the same DNS endpoint. A read replica scales reads but is not the automatic failover target."
            ),
            part(
              "What the app must tolerate",
              "Notes the app must reconnect after failover (DNS endpoint moves; connections drop briefly).",
              "Connections drop for the failover period and the endpoint's DNS points at the new primary, so the app needs connection retries and should not cache the old IP."
            ),
          ],
        },
        {
          text: "After the next failover test, users are signed out whenever the Auto Scaling group replaces an instance.",
          ask: "Why does that happen, and what fixes it?",
          parts: [
            part(
              "Cause and fix",
              "Identifies in-memory sessions as state tied to one instance and moves session state to a shared store such as Amazon ElastiCache or DynamoDB, making the web tier stateless.",
              "Sessions live in one instance's memory, so they die with it. Store sessions in ElastiCache or DynamoDB so any instance can serve any user; the web tier becomes stateless and safe to replace."
            ),
          ],
        },
      ],
    },
    {
      slug: "match-databases-to-requirements",
      objective: "Choosing a database type: relational, non-relational, in-memory, serverless",
      kind: "build",
      title: "Match a database to each stated requirement",
      brief:
        "A retail platform has four data needs. (1) Shopping carts: key-value access by cart ID, single-digit-millisecond latency at very high request rates, no joins. (2) Payments ledger: multi-table transactions with strong consistency and reporting queries that join several tables. (3) A live game leaderboard updated thousands of times a second with sub-millisecond reads of the top 100. (4) An internal reporting app with SQL, used a few hours a week at unpredictable times; the team wants to stop paying for an idle database.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a service for each need and give the deciding reason.",
          parts: [
            part("Shopping carts", "Chooses Amazon DynamoDB, citing key-value access at scale with consistent low latency.", "Amazon DynamoDB: key-value lookups by cart ID with single-digit-millisecond latency at any scale and no joins needed."),
            part("Payments ledger", "Chooses a relational engine (Amazon RDS or Amazon Aurora) for ACID transactions and joins.", "Amazon Aurora (or Amazon RDS): relational, ACID transactions across tables and SQL joins for reporting."),
            part("Leaderboard", "Chooses an in-memory store (Amazon ElastiCache with a Redis-compatible engine, using sorted sets) for sub-millisecond reads.", "Amazon ElastiCache with a Redis-compatible engine: in-memory sorted sets keep the ranking and return the top 100 in under a millisecond."),
            part("Reporting app", "Chooses a serverless relational option (Aurora Serverless v2) that scales capacity with demand instead of a fixed-size instance.", "Aurora Serverless v2: SQL-compatible, capacity scales with load, so the team stops paying for a large idle instance."),
          ],
        },
      ],
    },
    {
      slug: "match-storage-to-workloads",
      objective: "Choosing a storage service for performance: Amazon S3, Amazon EBS, Amazon EFS, Amazon FSx",
      kind: "build",
      title: "Choose storage for four workloads",
      brief:
        "An engineering firm moves four workloads to AWS. (1) A fleet of Linux web servers in three Availability Zones needs one shared POSIX file system that grows on its own. (2) Windows application servers need SMB file shares joined to the company's Active Directory. (3) A high-performance computing job needs a very high-throughput scratch file system that loads input data from and writes results to Amazon S3. (4) A single database server on EC2 needs a block volume with consistent, provisioned IOPS.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the storage service for each workload and the deciding reason.",
          parts: [
            part("Shared Linux file system", "Chooses Amazon EFS (NFS, multi-AZ, elastic).", "Amazon EFS: managed NFS that many Linux instances across AZs can mount at once and that grows and shrinks automatically."),
            part("Windows SMB shares", "Chooses Amazon FSx for Windows File Server (SMB, Active Directory integration).", "Amazon FSx for Windows File Server: native SMB shares with Active Directory integration for Windows workloads."),
            part("HPC scratch", "Chooses Amazon FSx for Lustre linked to the S3 bucket.", "Amazon FSx for Lustre: a parallel file system built for high throughput that can import from and export to S3."),
            part("Database block volume", "Chooses Amazon EBS with a provisioned-IOPS SSD volume type (io2, or gp3 with provisioned IOPS) attached to the instance.", "Amazon EBS provisioned-IOPS SSD (io2), or gp3 with IOPS set, attached to the database instance for consistent low-latency block I/O."),
          ],
        },
      ],
    },
    {
      slug: "s3-lifecycle-for-logs",
      objective: "S3 storage tiering and object lifecycles, including cold and archival tiers",
      kind: "build",
      title: "Write an S3 lifecycle plan for application logs",
      brief:
        "An application writes about 2 TB of logs a month to S3. Logs are read often during the first 30 days (troubleshooting), rarely for the rest of the first year (occasional audits that can wait a few minutes), and after a year only for legal holds, when retrieval within 12 hours is acceptable. Regulations require keeping logs for 7 years and then deleting them.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the lifecycle rules and explain the cost trade-offs.",
          parts: [
            part(
              "Transitions",
              "Keeps new logs in S3 Standard, moves them to S3 Standard-IA (or Glacier Instant Retrieval) after 30 days, and to S3 Glacier Deep Archive after 365 days.",
              "Day 0-30: S3 Standard. Day 30: transition to S3 Standard-IA. Day 365: transition to S3 Glacier Deep Archive (standard retrieval completes within 12 hours, which meets the legal-hold need at the lowest storage price)."
            ),
            part(
              "Expiration",
              "Adds an expiration action at about 7 years (2,555 days) so logs are deleted when retention ends.",
              "Expire objects at 2,555 days (7 years) so nothing is kept, or paid for, past the retention requirement."
            ),
            part(
              "Cost catches",
              "Names at least one catch: minimum storage duration charges (for example 30 days for Standard-IA, 180 days for Deep Archive), per-GB retrieval fees, or small-object overhead in the IA and archive classes.",
              "Each class has a minimum storage duration (Standard-IA 30 days, Deep Archive 180 days) and retrieval charges, and very small objects cost more per GB in IA/archive classes; logs aggregated into larger objects avoid that overhead."
            ),
          ],
        },
      ],
    },
    {
      slug: "ec2-purchasing-options",
      objective: "Purchasing options on cost: On-Demand, Spot Instances, Reserved Instances, Savings Plans",
      kind: "build",
      title: "Pick the cheapest purchasing option for each workload",
      brief:
        "A company's EC2 bill has four parts. (1) A web fleet whose baseline of 20 instances runs around the clock all year, with more instances at peak. (2) A nightly image-processing batch that can be stopped and restarted at any point and has no deadline before morning. (3) A two-week marketing campaign with unpredictable traffic that must not be interrupted. (4) Development servers used only on weekdays from 08:00 to 18:00.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a purchasing approach for each part and say what it gives up.",
          parts: [
            part("Steady web baseline", "Covers the 24/7 baseline with a Savings Plan or Reserved Instances (1- or 3-year commitment) and leaves the peak On-Demand or Spot, noting the commitment trade-off.", "A Compute Savings Plan (or Reserved Instances) sized to the 20-instance baseline for a 1- or 3-year term; peaks stay On-Demand. Gives up flexibility: you pay the commitment even if usage drops."),
            part("Interruptible batch", "Uses Spot Instances and notes they can be interrupted with a two-minute warning, which this job tolerates.", "Spot Instances (ideally across several instance types): the deepest discount, and an interruption only delays a job that can restart."),
            part("Short campaign", "Uses On-Demand (with Auto Scaling) because a short, uninterruptible, unpredictable workload does not suit a long commitment or Spot.", "On-Demand with Auto Scaling: no commitment for two weeks and no interruptions; pays the highest unit price for that flexibility."),
            part("Office-hours dev", "Stops the servers outside working hours (for example with a scheduler) and runs them On-Demand rather than committing for 24/7.", "On-Demand, stopped automatically outside 08:00-18:00 on weekdays (for example with AWS Instance Scheduler) -- about 50 of 168 hours a week instead of paying for all of them."),
          ],
        },
      ],
    },
  ],
};
