// AWS certification tracks.
//
// Every domain name, weighting, question count, and passing score below was
// read on 2026-09-18 from the official AWS exam guides published at
// docs.aws.amazon.com/aws-certification -- not from memory. Objectives are
// written from each guide's task statements and their knowledge/skills bullets,
// reworded into narrow single-concept objectives because the lesson format
// (guess/teach/fade/solo) needs one idea per objective, and paraphrased rather
// than copied because the guides are AWS's own material.
//
// Two facts that were wrong in older notes and are corrected here:
//   - "AWS Certified SysOps Administrator - Associate" is now "AWS Certified
//     CloudOps Engineer - Associate".
//   - AWS Certified Advanced Networking - Specialty retires 2026-12-31, and
//     AWS Certified Developer - Associate moves from DVA-C02 to DVA-C03
//     (registration opens 2026-10-27, last day for DVA-C02 is 2026-11-30 --
//     corrected from 2026-12-01 on 2026-11-07, see the DVA block).
//
// REQ-102 pass, 2026-11-07: every exam code below was re-checked against
// AWS's exam-guide index,
// https://docs.aws.amazon.com/aws-certification/latest/examguides/aws-certification-exam-guides.html
// (CLF-C02, AIF-C01, SAA-C03, SOA-C03, DEA-C01, DVA-C02/C03, MLA-C02,
// SAP-C02/C03, DOP-C02, SCS-C03, ANS-C01 all listed). Changes made in that
// pass: AWSSAP moved to SAP-C03 (see its block), DVA-C02's last day
// corrected, MLA-C02's GA date recorded. Tracks not touched were confirmed
// by exam code only; their domain weights were not re-read this pass.
// REQ-104 (2026-11-07): AWSDVA moved to DVA-C03 the same way (see its block).
//
// Re-verify each track's `credential.lastVendorVerifiedAt` against the live
// exam guide before a release; migration 007 refuses to store any exam record
// outside 'draft' status without both an objectives URL and that timestamp.

import type { SeedTrack, UnitSource } from "../data";

// ---------------------------------------------------------------------------
// REQ-235 (batch H wave 1, "make holds rare"): dated unit sources for the two
// launch AWS courses. Each unit names its exam-guide domain page with the
// official task statements (headings only: the guides are AWS's material,
// so the knowledge/skills bullets stay paraphrased in the objectives), and
// the AWS documentation pages that settle the limits and defaults a writer
// is most likely to remember from an older version. Every value below was
// read on the page named, on 2026-11-11, not from memory. The lesson writer
// and the fact-checker get both (lib/current-facts.ts).
// ---------------------------------------------------------------------------
const B11 = "2026-11-11";
const SAA_GUIDE = "https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03";
const MLA_GUIDE = "https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-02/machine-learning-engineer-associate-02";
const guide = (base: string, n: number, title: string, outline: string[]): UnitSource => ({
  title,
  url: `${base}-domain${n}.html`,
  kind: "exam_outline",
  checkedAt: B11,
  outline,
});
const doc = (title: string, url: string, keyValues: string[], kind: UnitSource["kind"] = "reference"): UnitSource => ({ title, url, kind, checkedAt: B11, keyValues });

export const AWS_SAA_UNIT_SOURCES: Record<string, UnitSource[]> = {
  "Design Secure Architectures": [
    guide(SAA_GUIDE, 1, "SAA-C03 exam guide, Domain 1", [
      "Task 1.1: Design secure access to AWS resources",
      "Task 1.2: Design secure workloads and applications",
      "Task 1.3: Determine appropriate data security controls",
    ]),
    doc("AWS KMS Developer Guide, Rotate AWS KMS keys", "https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html", [
      "automatic rotation of a customer managed key generates new key material every year by default (365 days); a custom rotation period can be set, and on-demand rotation is available whether or not automatic rotation is on",
      "AWS managed keys are rotated automatically every year",
    ]),
    doc("AWS Certificate Manager User Guide, certificate characteristics and managed renewal", "https://docs.aws.amazon.com/acm/latest/userguide/acm-certificate-characteristics.html", [
      "ACM certificates are valid for 198 days",
      "ACM renews Amazon-issued certificates it manages: automatically with DNS validation, by email notice otherwise; imported certificates are not eligible for managed renewal",
    ]),
  ],
  "Design Resilient Architectures": [
    guide(SAA_GUIDE, 2, "SAA-C03 exam guide, Domain 2", [
      "Task 2.1: Design scalable and loosely coupled architectures",
      "Task 2.2: Design highly available and/or fault-tolerant architectures",
    ]),
    doc("Disaster Recovery of Workloads on AWS (whitepaper), Disaster recovery options in the cloud", "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html", [
      "four DR strategies, cheapest and slowest first: backup and restore, pilot light, warm standby, multi-site active/active",
    ]),
    doc("Amazon SQS Developer Guide, message quotas", "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html", [
      "maximum message size 1 MiB (1,048,576 bytes); larger payloads use the Extended Client Library with Amazon S3",
      "message retention: default 4 days, minimum 60 seconds, maximum 14 days",
      "visibility timeout: default 30 seconds, minimum 0, maximum 12 hours",
    ]),
    doc("AWS Lambda Developer Guide, Lambda quotas", "https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html", [
      "function timeout up to 900 seconds (15 minutes) for standard functions",
      "function memory 128 MB to 10,240 MB in 1-MB increments",
    ]),
  ],
  "Design High-Performing Architectures": [
    guide(SAA_GUIDE, 3, "SAA-C03 exam guide, Domain 3", [
      "Task 3.1: Determine high-performing and/or scalable storage solutions",
      "Task 3.2: Design high-performing and elastic compute solutions",
      "Task 3.3: Determine high-performing database solutions",
      "Task 3.4: Determine high-performing and/or scalable network architectures",
      "Task 3.5: Determine high-performing data ingestion and transformation solutions",
    ]),
    doc("Amazon EBS User Guide, Amazon EBS volume types and General Purpose SSD volumes", "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html", [
      "gp3: baseline 3,000 IOPS and 125 MiB/s at any size; up to 80,000 IOPS and 2,000 MiB/s; 1 GiB-64 TiB",
      "gp2: up to 16,000 IOPS; io1: up to 64,000 IOPS; io2 Block Express: up to 256,000 IOPS and 4,000 MiB/s on Nitro-based instances, 99.999% durability, Multi-Attach supported",
    ]),
  ],
  "Design Cost-Optimized Architectures": [
    guide(SAA_GUIDE, 4, "SAA-C03 exam guide, Domain 4", [
      "Task 4.1: Design cost-optimized storage solutions",
      "Task 4.2: Design cost-optimized compute solutions",
      "Task 4.3: Design cost-optimized database solutions",
      "Task 4.4: Design cost-optimized network architectures",
    ]),
    doc("Amazon S3 User Guide, Understanding and managing Amazon S3 storage classes", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html", [
      "minimum storage duration: S3 Standard-IA and S3 One Zone-IA 30 days; S3 Glacier Instant Retrieval and S3 Glacier Flexible Retrieval 90 days; S3 Glacier Deep Archive 180 days; S3 Standard, S3 Intelligent-Tiering and S3 Express One Zone none",
      "minimum billable object size 128 KB for Standard-IA, One Zone-IA and Glacier Instant Retrieval",
      "S3 One Zone-IA and S3 Express One Zone store data in one Availability Zone; the other classes in at least 3",
    ]),
    doc("Amazon EC2 User Guide, Spot Instance interruption notices", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html", [
      "a Spot Instance interruption notice is given two minutes before Amazon EC2 stops or terminates the instance",
    ]),
    doc("Savings Plans User Guide, What are Savings Plans?", "https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html", [
      "a Savings Plan commits to a consistent amount of compute usage (measured per hour) for a one- or three-year term",
    ]),
  ],
};

export const AWS_MLA_UNIT_SOURCES: Record<string, UnitSource[]> = {
  "Data Preparation for ML and AI": [
    guide(MLA_GUIDE, 1, "MLA-C02 exam guide, Domain 1", [
      "Task 1.1: Collect and store data",
      "Task 1.2: Perform data transformation, feature engineering, and pre-processing",
      "Task 1.3: Validate data quality and manage bias",
    ]),
    doc("Amazon SageMaker AI Developer Guide, Pre-training Data Bias", "https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-measure-data-bias.html", [
      "SageMaker Clarify pre-training bias metrics include Class Imbalance (CI), Difference in Proportions of Labels (DPL), Kullback-Leibler Divergence (KL), Jensen-Shannon Divergence (JS) and Lp-norm",
    ]),
  ],
  "ML Model and Foundation Model Development": [
    guide(MLA_GUIDE, 2, "MLA-C02 exam guide, Domain 2", [
      "Task 2.1: Choose appropriate modeling approaches for ML and AI solutions",
      "Task 2.2: Train, fine-tune, and customize models for ML and AI solutions",
      "Task 2.3: Analyze and evaluate the performance of ML and AI systems",
    ]),
  ],
  "Deployment and Orchestration of ML and AI Workflows": [
    guide(MLA_GUIDE, 3, "MLA-C02 exam guide, Domain 3", [
      "Task 3.1: Manage deployment infrastructure for ML and AI model types",
      "Task 3.2: Provision and configure resources for ML and AI workloads based on existing architecture and requirements",
      "Task 3.3: Implement automated orchestration and continuous integration and continuous delivery (CI/CD) pipelines for MLOps and AI workloads",
    ]),
    doc("Amazon SageMaker AI Developer Guide, Inference options in Amazon SageMaker AI", "https://docs.aws.amazon.com/sagemaker/latest/dg/deploy-model-options.html", [
      "real-time inference: payloads up to 25 MB, processing up to 60 seconds (8 minutes for streaming responses)",
      "serverless inference: payloads up to 4 MB, processing up to 60 seconds; suits intermittent or unpredictable traffic; optional Provisioned Concurrency",
      "asynchronous inference: payloads up to 1 GB, processing up to one hour, can scale to 0 instances; the request payload is placed in Amazon S3",
      "batch transform: offline inference on datasets of GBs, processing times of days, no persistent endpoint",
    ]),
  ],
  "Operating, Monitoring, and Securing ML and AI Solutions": [
    guide(MLA_GUIDE, 4, "MLA-C02 exam guide, Domain 4", [
      "Task 4.1: Monitor ML and AI model inference and performance",
      "Task 4.2: Optimize and manage ML and AI infrastructure costs and performance",
      "Task 4.3: Secure ML and AI workloads and model endpoints",
    ]),
    doc("Amazon SageMaker AI Developer Guide, Data and model quality monitoring with Amazon SageMaker Model Monitor", "https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor.html", [
      "Model Monitor's four monitor types: data quality, model quality, bias drift and feature attribution drift",
      "the page states that Amazon SageMaker Model Monitor is no longer open to new customers (read 2026-11-11); do not present it as available to a new account",
    ]),
  ],
};

const AWS_PROVIDER = {
  providerSlug: "aws",
  providerName: "Amazon Web Services",
  providerUrl: "https://aws.amazon.com/certification/",
  subcategorySlug: "aws-certifications",
  credentialType: "certification",
} as const;

const VERIFIED_AT = "2026-09-18T00:00:00Z";

// ---------------------------------------------------------------------------
// Foundational: AWS Certified Cloud Practitioner (CLF-C02)
// 90 minutes, 65 questions (50 scored, 15 unscored), scaled 100-1000, pass 700.
// Domains: 24% / 30% / 34% / 12%.
// ---------------------------------------------------------------------------
export const AWS_CLF_TRACK: SeedTrack = {
  code: "AWSCLF",
  title: "Prep for the AWS Certified Cloud Practitioner (CLF-C02) Exam",
  description:
    "AWS Certified Cloud Practitioner (CLF-C02): the whole AWS Cloud at a working vocabulary level -- value and economics, security and compliance, the core service catalog, and how billing and support actually work.",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl:
    "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...AWS_PROVIDER,
    credentialSlug: "certified-cloud-practitioner",
    credentialName: "AWS Certified Cloud Practitioner",
    credentialUrl: "https://aws.amazon.com/certification/certified-cloud-practitioner/",
    examCode: "CLF-C02",
    status: "active",
    officialObjectivesUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Up to 6 months of exposure to AWS Cloud design, implementation, or operations. Coding, architecture design, troubleshooting, implementation, and load testing are explicitly out of scope.",
    durationMinutes: 90,
    questionFormat:
      "65 questions (50 scored, 15 unscored); multiple choice and multiple response",
    passingScorePolicy:
      "Scaled score 100-1000; minimum passing score 700; compensatory scoring, so no per-domain minimum",
  },
  units: [
    {
      title: "Cloud Concepts",
      weight: 24,
      gate: "Given a business situation, say what the AWS Cloud actually buys the customer -- naming the specific benefit and the cost that changes shape -- instead of reciting 'scalable and flexible'.",
      objectives: [
        "The value proposition of the AWS Cloud: capital expense traded for variable expense",
        "What global infrastructure buys you: deployment speed and reach into new geographies",
        "High availability, elasticity, and agility as three distinct advantages, not synonyms",
        "The six pillars of the AWS Well-Architected Framework",
        "Telling the pillars apart: which concern each one owns, and where two of them conflict",
        "Cloud adoption strategies, and the AWS Cloud Adoption Framework (AWS CAF) as a framework for planning that adoption",
        "Business outcomes AWS CAF targets: reduced risk, ESG performance, revenue, operational efficiency",
        "Migration strategies and which one fits a given workload, including database replication",
        "Resources that support a migration journey",
        "Fixed costs versus variable costs",
        "The on-premises costs that a cloud migration is meant to remove",
        "Licensing strategies: bring your own license (BYOL) versus included licenses",
        "Rightsizing, and why it is a recurring exercise rather than a one-time one",
        "Benefits of automation",
        "Economies of scale, and how AWS's scale reaches the customer as lower prices",
      ],
    },
    {
      title: "Security and Compliance",
      weight: 30,
      gate: "Given a service and a security task, say who owns it -- you or AWS -- and name the AWS service or control that does the work. This is the heaviest-weighted domain after services.",
      objectives: [
        "The AWS shared responsibility model: security *of* the cloud versus security *in* the cloud",
        "Customer responsibilities, AWS responsibilities, and the controls the two share",
        "How the responsibility line shifts by service: Amazon EC2 versus Amazon RDS versus AWS Lambda",
        "Where to find AWS compliance evidence: AWS Artifact",
        "Compliance obligations that vary by geography, by industry, and across individual AWS services",
        "Services that find and report security problems: Amazon Inspector, Amazon GuardDuty, AWS Security Hub, AWS Shield",
        "Encryption at rest and encryption in transit as two separate decisions",
        "Governance and audit services: monitoring with Amazon CloudWatch, auditing with AWS CloudTrail, configuration history with AWS Config, and reporting with access reports",
        "Where to capture and find logs associated with cloud security",
        "AWS Identity and Access Management: users, groups, roles, and policies",
        "Managed policies versus custom policies, written to least privilege",
        "Protecting the root user, and the short list of tasks only the root user can perform",
        "Authentication methods: MFA, AWS IAM Identity Center, cross-account IAM roles",
        "Credential handling: access keys, password policies, AWS Secrets Manager, AWS Systems Manager",
        "Federated identity management",
        "Network protection services: AWS WAF, AWS Shield, AWS Firewall Manager",
        "Third-party security products available through AWS Marketplace",
        "Where AWS publishes security information: AWS Security Center, the AWS Security Blog, AWS Knowledge Center",
        "AWS Trusted Advisor as a security check, not just a cost tool",
      ],
    },
    {
      title: "Cloud Technology and Services",
      weight: 34,
      gate: "Given a described need, name the AWS service that fits and say why the near-miss alternative is wrong. Breadth is the whole point of this domain -- it is the largest slice of the exam.",
      objectives: [
        "Ways to provision and operate: the AWS Management Console, the CLI, SDKs and APIs, and infrastructure as code",
        "One-time operations versus repeatable processes, and which access method suits each",
        "Deployment models: cloud, hybrid, and on-premises",
        "Regions, Availability Zones, and edge locations, and how the three relate",
        "High availability built from multiple Availability Zones that share no single point of failure",
        "When a workload needs multiple Regions: disaster recovery, business continuity, latency, data sovereignty",
        "Amazon EC2 instance families, and matching one to a workload's shape",
        "Container services: Amazon ECS and Amazon EKS",
        "Serverless compute: AWS Lambda and AWS Fargate",
        "Auto scaling as the mechanism that delivers elasticity",
        "What a load balancer is for",
        "Choosing between a database you host on EC2 and a managed AWS database",
        "Relational databases: Amazon RDS and Amazon Aurora",
        "NoSQL: Amazon DynamoDB",
        "In-memory: Amazon ElastiCache",
        "Database migration tooling: AWS DMS and the AWS Schema Conversion Tool",
        "VPC components: subnets, route tables, internet gateways, NAT gateways",
        "Security inside a VPC: security groups versus network ACLs",
        "What Amazon Route 53 does",
        "Connectivity into AWS: AWS Site-to-Site VPN and AWS Direct Connect",
        "Object storage, and the differences between Amazon S3 storage classes",
        "Block storage: Amazon EBS versus instance store",
        "File storage: Amazon EFS and Amazon FSx",
        "Cached and hybrid file storage: AWS Storage Gateway",
        "S3 lifecycle policies, and use cases for AWS Backup",
        "AI/ML services and the task each performs, including Amazon SageMaker AI and Amazon Lex",
        "Analytics services: Amazon Athena, Amazon Kinesis, AWS Glue, Amazon Quick (formerly Amazon QuickSight)",
        "Application integration: Amazon SQS, Amazon SNS, Amazon EventBridge",
        "Business applications: Amazon Connect and Amazon SES",
        "Developer tools: AWS CodeBuild, AWS CodePipeline, AWS X-Ray",
        "End-user computing: Amazon WorkSpaces, Amazon AppStream 2.0, WorkSpaces Secure Browser",
        "Frontend, mobile, and IoT: AWS Amplify and AWS IoT Core",
      ],
    },
    {
      title: "Billing, Pricing, and Support",
      weight: 12,
      gate: "Given a workload's predictability and a budget problem, pick the purchasing option and the cost tool that address it, and name the support plan a given customer needs.",
      objectives: [
        "Compute purchasing options: On-Demand, Reserved Instances, Spot Instances, Savings Plans, Dedicated Hosts, Dedicated Instances, Capacity Reservations",
        "Matching a purchasing option to a workload's predictability and tolerance for interruption",
        "Reserved Instance flexibility, and how Reserved Instances behave inside AWS Organizations",
        "Data transfer costs: inbound, outbound, Region to Region, and within a Region",
        "Pricing across storage options and tiers",
        "AWS Budgets and AWS Cost Explorer, and which question each answers",
        "AWS Pricing Calculator for estimating before you spend",
        "AWS Organizations consolidated billing and cost allocation",
        "Cost allocation tags and the AWS Cost and Usage Report",
        "AWS Support options: customer service and communities, Basic Support, AWS Business Support+, AWS Enterprise Support, AWS Unified Operations (Developer, Business and Enterprise On-Ramp end on 2027-01-01)",
        "Technical resources: whitepapers, blogs, AWS Prescriptive Guidance, AWS Knowledge Center, AWS re:Post",
        "AWS Trusted Advisor, the AWS Health Dashboard, and the AWS Health API",
        "The AWS Partner Network, AWS Marketplace, and AWS Professional Services",
        "Reporting abuse of AWS resources to the AWS Trust and Safety team",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Associate: AWS Certified Solutions Architect - Associate (SAA-C03)
// 130 minutes, 65 questions (50 scored, 15 unscored), scaled 100-1000, pass 720.
// Domains: 30% / 26% / 24% / 20%.
// ---------------------------------------------------------------------------
export const AWS_SAA_TRACK: SeedTrack = {
  code: "AWSSAA",
  // REQ-257 (Nick, 2026-11-12): level-aware lessons switched on once its Key terms were written.
  levelFlow: true,
  title: "Prep for the AWS Certified Solutions Architect - Associate (SAA-C03) Exam",
  description:
    "AWS Certified Solutions Architect - Associate (SAA-C03): designing solutions against the Well-Architected Framework -- secure, resilient, high-performing, and cost-optimized architectures, and knowing which trade-off a requirement is really asking for.",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl:
    "https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...AWS_PROVIDER,
    credentialSlug: "certified-solutions-architect-associate",
    credentialName: "AWS Certified Solutions Architect - Associate",
    credentialUrl:
      "https://aws.amazon.com/certification/certified-solutions-architect-associate/",
    examCode: "SAA-C03",
    status: "active",
    officialObjectivesUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "At least 1 year of hands-on experience designing cloud solutions that use AWS services.",
    durationMinutes: 130,
    questionFormat:
      "65 questions (50 scored, 15 unscored); multiple choice and multiple response",
    passingScorePolicy:
      "Scaled score 100-1000; minimum passing score 720; compensatory scoring, so no per-domain minimum",
  },
  units: [
    {
      title: "Design Secure Architectures",
      sources: AWS_SAA_UNIT_SOURCES["Design Secure Architectures"],
      weight: 30,
      gate: "Given a design with a security hole, name the missing control, the AWS service that provides it, and the specific failure it prevents -- and say whether the fix belongs in identity, network, or data.",
      objectives: [
        "Applying IAM security practices to users and the root user, including MFA",
        "A flexible authorization model built from IAM users, groups, roles, and policies",
        "Role-based access across accounts: AWS STS, role switching, cross-account roles",
        "Security across many accounts: AWS Organizations, AWS Control Tower, service control policies",
        "Resource-based policies, and when they beat an identity-based policy",
        "Federating a directory service with IAM roles",
        "Reading the shared responsibility model as a design constraint",
        "VPC security components: security groups, network ACLs, route tables, NAT gateways",
        "Network segmentation with public and private subnets",
        "Controlling ports, protocols, and traffic to and from AWS resources",
        "Protecting applications from external threats: AWS WAF and AWS Shield against DDoS and injection",
        "Application configuration and credentials: AWS Secrets Manager and Systems Manager Parameter Store",
        "Application user authentication with Amazon Cognito",
        "Threat and data-exposure detection: Amazon GuardDuty and Amazon Macie",
        "Securing external network connections: AWS Site-to-Site VPN and AWS Direct Connect",
        "AWS service endpoints and private access with AWS PrivateLink and VPC endpoints",
        "Encrypting data at rest with AWS KMS, and writing key policies that hold",
        "Encrypting data in transit with TLS certificates from AWS Certificate Manager",
        "Rotating encryption keys and renewing certificates before they expire",
        "Data classification and retention, expressed as lifecycle and access policies",
        "Data backup, replication, and recovery as a security control, not just an availability one",
        "Aligning AWS technologies to a stated compliance requirement",
      ],
    },
    {
      title: "Design Resilient Architectures",
      sources: AWS_SAA_UNIT_SOURCES["Design Resilient Architectures"],
      weight: 26,
      gate: "Given an RTO and RPO, pick the disaster recovery strategy that meets them at the lowest cost, and point at the single points of failure your design removed.",
      objectives: [
        "Multi-tier architectures, and what belongs in each tier",
        "Microservice design principles: stateless versus stateful workloads",
        "Event-driven architecture with Amazon EventBridge",
        "Decoupling with queues and pub/sub: Amazon SQS and Amazon SNS",
        "Workflow orchestration with AWS Step Functions",
        "API creation and management with Amazon API Gateway",
        "Horizontal scaling versus vertical scaling",
        "When to use containers, and orchestrating them with Amazon ECS or Amazon EKS",
        "When to use serverless: AWS Lambda and AWS Fargate",
        "Migrating an existing application into containers",
        "Caching strategies, including edge caching with a CDN",
        "Read replicas, and the specific problem they solve",
        "Matching storage type -- object, file, block -- to a workload",
        "Using purpose-built AWS services instead of forcing one service to do everything",
        "Offloading work to managed AI services such as Amazon Comprehend and Amazon Polly instead of building and operating it yourself",
        "Availability Zones, Regions, and Amazon Route 53 in a resilient design",
        "Designing out single points of failure",
        "Load balancing for availability: Application, Network, and Gateway Load Balancers",
        "Disaster recovery strategies: backup and restore, pilot light, warm standby, active-active failover",
        "RTO and RPO, and letting them choose the DR strategy rather than the other way round",
        "Failover strategies and the health checks that trigger them",
        "Data durability and availability: replication, versioning, backups",
        "Immutable infrastructure and automation that keeps infrastructure integrity",
        "Service quotas and throttling, including quotas in a standby environment",
        "Connection pooling and proxies, such as Amazon RDS Proxy",
        "Workload visibility with AWS X-Ray",
        "Raising the reliability of legacy applications you are not allowed to change",
      ],
    },
    {
      title: "Design High-Performing Architectures",
      sources: AWS_SAA_UNIT_SOURCES["Design High-Performing Architectures"],
      weight: 24,
      gate: "Given a performance requirement and a metric, choose the compute, storage, database, and network configuration that meets it -- and name the metric you would watch to know it worked.",
      objectives: [
        "Choosing a storage service for performance: Amazon S3, Amazon EBS, Amazon EFS, Amazon FSx",
        "EBS volume types and Provisioned IOPS",
        "Hybrid storage that meets a performance requirement",
        "Storage that can scale to accommodate future demand",
        "Selecting compute options and EC2 instance types against a requirement",
        "Sizing a serverless resource, including how much memory a Lambda function needs",
        "Amazon EC2 Auto Scaling and AWS Auto Scaling: the metrics and conditions that trigger scaling",
        "Decoupling workloads so components scale independently",
        "Batch and big-data compute: AWS Batch and Amazon EMR",
        "Distributed computing across the AWS global infrastructure and edge services",
        "Choosing a database type: relational, non-relational, in-memory, serverless",
        "Choosing a database engine, and homogeneous versus heterogeneous migration",
        "Database capacity planning: capacity units, instance types, Provisioned IOPS",
        "Configuring read replicas to meet a requirement",
        "Integrating caching with Amazon ElastiCache for read-intensive access patterns",
        "Database connections and proxies under load",
        "Network topology design: subnet tiers, routing, IP addressing",
        "Edge acceleration: Amazon CloudFront and AWS Global Accelerator",
        "Network connection options: AWS VPN, AWS Direct Connect, AWS PrivateLink",
        "Selecting a load balancing strategy for performance",
        "Designing streaming ingestion with Amazon Kinesis",
        "Data transfer services: AWS DataSync, AWS Storage Gateway",
        "Transforming data with AWS Glue, including format changes such as CSV to Parquet",
        "Building and securing a data lake, including AWS Lake Formation",
        "Querying and visualizing: Amazon Athena and Amazon Quick (formerly Amazon QuickSight)",
        "Securing the access points where data is ingested",
      ],
    },
    {
      title: "Design Cost-Optimized Architectures",
      sources: AWS_SAA_UNIT_SOURCES["Design Cost-Optimized Architectures"],
      weight: 20,
      gate: "Given a running architecture and a bill, name the three changes that cut the most cost without breaking the stated requirements, and say what each one gives up.",
      objectives: [
        "Selecting the most cost-effective storage service for a workload",
        "S3 storage tiering and object lifecycles, including cold and archival tiers",
        "Sizing storage correctly, and knowing when storage auto scaling is required",
        "Block storage cost: HDD versus SSD volume types",
        "The lowest-cost way to move a workload's data into AWS storage: AWS DataSync, AWS Transfer Family, AWS Storage Gateway",
        "Selecting a backup or archival solution on cost",
        "Access options that shift cost, such as a Requester Pays S3 bucket",
        "Batch versus individual upload strategies",
        "Purchasing options on cost: On-Demand, Spot Instances, Reserved Instances, Savings Plans",
        "Selecting instance family and size for cost",
        "Scaling methods that cut spend, including EC2 hibernation",
        "Cost-effective compute choice: AWS Lambda versus Amazon EC2 versus AWS Fargate",
        "Availability targets by workload class: production versus non-production",
        "Hybrid and edge compute options, including AWS Outposts",
        "Cost-effective database service and type, including serverless and purpose-built engines such as time-series and columnar",
        "Backup and retention policy design, including snapshot frequency",
        "Migrating database schemas and data between engines or locations",
        "NAT gateway cost: one shared gateway versus one per Availability Zone",
        "Routing that minimizes transfer cost: VPC endpoints, VPC peering, AWS Transit Gateway, cross-AZ and cross-Region traffic",
        "Choosing between AWS Direct Connect, VPN, and the public internet on cost",
        "CDN and edge caching to cut origin cost",
        "Selecting a throttling strategy and bandwidth allocation",
        "Choosing a load balancer type -- Application, Network, or Gateway -- on cost, not just capability",
        "Cost visibility: AWS Cost Explorer, AWS Budgets, the AWS Cost and Usage Report, cost allocation tags, multi-account billing",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Foundational: AWS Certified AI Practitioner (AIF-C01)
// 90 minutes, 65 questions (50 scored, 15 unscored), scaled 100-1000, pass 700.
// Domains: 20% / 24% / 28% / 14% / 14%.
//
// This guide has been revised since the exam launched: it now covers agentic
// AI, Model Context Protocol, Amazon Bedrock AgentCore, Strands Agents, and
// context engineering. It is also the one AWS exam that uses ordering and
// matching question types alongside multiple choice and multiple response.
// ---------------------------------------------------------------------------
export const AWS_AIF_TRACK: SeedTrack = {
  code: "AWSAIF",
  title: "Prep for the AWS Certified AI Practitioner (AIF-C01) Exam",
  description:
    "AWS Certified AI Practitioner (AIF-C01): AI, ML, and generative AI on AWS for the person who uses these systems rather than builds them -- foundation models, prompt engineering, RAG and agents, responsible AI, and the security and governance around it all.",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl:
    "https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01.html",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...AWS_PROVIDER,
    credentialSlug: "certified-ai-practitioner",
    credentialName: "AWS Certified AI Practitioner",
    credentialUrl: "https://aws.amazon.com/certification/certified-ai-practitioner/",
    examCode: "AIF-C01",
    status: "active",
    officialObjectivesUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/ai-practitioner-01/ai-practitioner-01.html",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Up to 6 months of exposure to AI/ML technologies on AWS, as a user rather than a builder. Coding models, feature engineering, hyperparameter tuning, building ML pipelines, and implementing governance frameworks are out of scope.",
    durationMinutes: 90,
    questionFormat:
      "65 questions (50 scored, 15 unscored); multiple choice, multiple response, ordering, and matching",
    passingScorePolicy:
      "Scaled score 100-1000; minimum passing score 700; compensatory scoring, so no per-domain minimum",
  },
  units: [
    {
      title: "Fundamentals of AI and ML",
      weight: 20,
      gate: "Given a business problem, say whether AI/ML is the right tool at all, which technique fits, and which AWS managed service you would reach for -- including the cases where the honest answer is that a rule beats a prediction.",
      objectives: [
        "Core vocabulary: AI, machine learning, deep learning, neural networks, computer vision, natural language processing",
        "Model, algorithm, training, and inferencing as four distinct things",
        "Bias, fairness, and fit as properties you can measure",
        "Large language models, generative AI, and agentic AI defined",
        "How AI, ML, deep learning, generative AI, and agentic AI relate, and where each stops",
        "Types of inferencing: batch, real-time, asynchronous, serverless",
        "Data types in AI models: labeled and unlabeled, structured and unstructured, tabular, time-series, image, text",
        "Learning types: supervised, unsupervised, reinforcement learning",
        "Where AI/ML adds value: assisting human decisions, scaling a solution, automation",
        "When an AI/ML solution is the wrong answer: cost-benefit, and needing a specific outcome instead of a prediction",
        "Choosing a technique for a use case: regression, classification, clustering",
        "Real-world applications: computer vision, NLP, speech recognition, recommendation, fraud detection, forecasting, knowledge bases, agentic AI",
        "What the AWS managed AI services do: Amazon SageMaker AI, Amazon Transcribe, Amazon Translate, Amazon Comprehend, Amazon Lex, Amazon Polly",
        "Traditional ML model versus foundation model, decided by regulation, explainability, and operational constraints",
        "The components of an AI/ML pipeline, and what each one contributes",
        "Where foundation models come from: open-source pre-trained models versus training a custom model",
        "Putting a model into production: managed API service versus self-hosted API",
        "AWS services and features at each stage of an AI/ML pipeline, including Amazon Bedrock, Amazon Quick, Kiro, and Amazon SageMaker AI",
        "MLOps fundamentals: experimentation, repeatable processes, scalable systems, technical debt, production readiness, model monitoring, retraining",
        "Model performance metrics (accuracy, precision, recall, F1) against business metrics (cost per user, development cost, ROI, customer feedback)",
      ],
    },
    {
      title: "Fundamentals of Generative AI",
      weight: 24,
      gate: "Explain what a token is, what it costs you, and how that cost shapes a design -- then name the AWS service you would build a given generative AI application on, and the limitation that would sink it.",
      objectives: [
        "Tokens, chunking, embeddings, and vectors",
        "Prompt engineering as a discipline, not a trick",
        "Transformer-based large language models, foundation models, multi-modal models, diffusion models",
        "Generative AI use cases: image, video, and audio generation; summarization; assistants; translation; code generation; customer service; search; recommendation",
        "The foundation-model lifecycle: data selection, model selection, pre-training, fine-tuning, evaluation, deployment, feedback",
        "Token-based pricing, and how it drives both cost and inference performance",
        "The role of context engineering in foundation-model applications",
        "Agentic AI concepts: multi-agent system patterns, memory management, tool use, workflow orchestration",
        "Model Context Protocol (MCP) and how it connects agents to external systems",
        "Advantages of generative AI: adaptability, responsiveness, conversational ability, content generation",
        "Disadvantages of generative AI: hallucination, poor interpretability, inaccuracy, nondeterminism",
        "Choosing a generative AI model: type, performance, capability, constraints, compliance, cost, latency, complexity",
        "Business value and metrics for generative AI applications: ROI, efficiency, conversion rate, average revenue per user, customer lifetime value",
        "AWS services for building generative AI applications: Amazon Bedrock, Amazon SageMaker AI, SageMaker JumpStart, Amazon Quick, Kiro, Strands Agents, Amazon Bedrock AgentCore",
        "Why building on AWS generative AI services lowers the barrier: accessibility, efficiency, cost-effectiveness, speed to market",
        "What AWS infrastructure contributes to a generative AI workload: security, compliance, responsibility, safety",
        "Cost trade-offs across AWS generative AI services: responsiveness, availability, redundancy, regional coverage, token pricing, provisioned throughput, custom models",
      ],
    },
    {
      title: "Applications of Foundation Models",
      weight: 28,
      gate: "Given a requirement, choose between prompt engineering, RAG, fine-tuning, and pre-training -- and defend the choice on cost and on how fresh the knowledge has to be. This is the heaviest domain on the exam.",
      objectives: [
        "Selection criteria for a foundation model: cost, modality, latency, multilingual support, model size, complexity, customization, input/output length, prompt caching",
        "Inference parameters and what they change: temperature, input and output length",
        "Retrieval Augmented Generation (RAG) and its business applications, including Amazon Bedrock Knowledge Bases",
        "AWS services that store embeddings in vector databases: Amazon OpenSearch Service, Amazon Aurora, Amazon Neptune, Amazon RDS for PostgreSQL",
        "Cost trade-offs across customization approaches: pre-training, fine-tuning, in-context learning, RAG, model distillation",
        "What an AI agent is, and the business applications agents are suited to",
        "Prompt constructs: context, instruction, negative prompts",
        "Prompt techniques: zero-shot, single-shot, few-shot, chain-of-thought, prompt templates",
        "Prompt engineering best practices: specificity, concision, experimentation, guardrails, discovery",
        "Risks and limits of prompt engineering: exposure, poisoning, hijacking, jailbreaking",
        "Prompt versioning and management with Amazon Bedrock Prompt Management",
        "Key elements of training a foundation model: pre-training, fine-tuning, continuous pre-training, distillation",
        "Methods of fine-tuning: instruction tuning, domain adaptation, transfer learning, continuous pre-training",
        "Preparing data to fine-tune a model: curation, governance, size, labeling, representativeness, RLHF",
        "Approaches to evaluating a foundation model: human-in-the-loop, benchmark datasets, Amazon Bedrock Model Evaluation",
        "Evaluation metrics: ROUGE, BLEU, BERTScore, and LLM-as-a-judge",
        "Deciding whether a model meets the business objective, not just the benchmark",
        "Evaluating whole applications built on foundation models: RAG pipelines, agents, workflows",
        "Business alignment metrics for AI applications: task completion rate, user satisfaction, cost per interaction",
      ],
    },
    {
      title: "Guidelines for Responsible AI",
      weight: 14,
      gate: "Given a model that behaves badly for one group of users, name what went wrong -- dataset, bias, variance, or missing guardrail -- and the tool that would have caught it before launch.",
      objectives: [
        "Features of responsible AI: bias, fairness, inclusivity, robustness, safety, veracity",
        "Using Amazon Bedrock Guardrails to enforce responsible-AI features",
        "Responsible model selection, including environmental and sustainability considerations",
        "Legal risks of generative AI: intellectual property infringement claims, biased outputs, hallucinations, loss of customer trust, end-user risk",
        "Dataset characteristics that matter: inclusivity, diversity, curated sources, balance",
        "Bias and variance and their effects: harm to demographic groups, inaccuracy, overfitting, underfitting",
        "Detecting and monitoring bias and truthfulness: label-quality analysis, human audits, subgroup analysis",
        "Transparent and explainable models versus models that are neither",
        "Tools for transparency: Amazon SageMaker Model Cards, Amazon Bedrock Model Evaluations, open-source models, data and licensing",
        "The trade-off between model safety and transparency, including interpretability against performance",
        "Human-centered design for explainable AI: user-feedback mechanisms, transparency about AI decisions",
      ],
    },
    {
      title: "Security, Compliance, and Governance for AI Solutions",
      weight: 14,
      gate: "Given an AI application handling customer data, name the controls that keep the data in bounds -- identity, encryption, network path, logging -- and the governance artifact that proves it to an auditor.",
      objectives: [
        "AWS services and features that secure AI systems: IAM roles and policies, encryption, Amazon Macie, AWS PrivateLink, Amazon Bedrock Guardrails",
        "The AWS shared responsibility model applied to an AI workload",
        "Identity and policy controls for agents: Amazon Bedrock AgentCore Identity and AgentCore policy",
        "Source citation and documenting data origins: data lineage, data cataloging, Amazon SageMaker Model Cards",
        "Secure data engineering: data quality assessment, privacy-enhancing technologies, data access control, data integrity",
        "Security and privacy risks specific to AI: application security, prompt injection, data leakage, toxicity, output filtering and validation",
        "General protections that still apply: encryption at rest and in transit, threat detection, vulnerability management, infrastructure protection",
        "Audit trail and logging requirements for AI interactions",
        "Hallucination detection and grounding: RAG grounding, output validation, confidence scoring",
        "Governance and compliance services: AWS Config, Amazon Inspector, AWS Artifact, AWS CloudTrail, AWS Trusted Advisor",
        "Data governance strategies: data lifecycles, logging, residency, monitoring, observation, retention",
        "Following governance protocols: policies, review cadence and strategy, transparency standards, team training, and the Generative AI Security Scoping Matrix",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Associate: AWS Certified Developer - Associate (DVA-C03)
//
// REQ-104 (2026-11-07): moved from DVA-C02 to DVA-C03. Sources, all read
// 2026-11-07:
//   - DVA-C03 exam guide (HTML, and the PDF it links, which was used as the
//     verbatim text for every task and skill below):
//     https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/developer-associate-03.html
//     https://docs.aws.amazon.com/pdfs/aws-certification/latest/developer-associate-03/developer-associate-03.pdf
//     "Registration for the updated version of the exam (DVA-C03) opened on
//     October 27, 2026. The last day to take the current version of the
//     exam (DVA-C02) is November 30, 2026."
//     50 scored + 15 unscored questions; two response types only, multiple
//     choice and multiple response (no ordering, matching or case-study
//     items, unlike some other 2026 AWS exams); scaled 100-1000, minimum
//     passing score 720, compensatory scoring. Domains 30/26/22/22.
//   - DVA-C02 -> DVA-C03 comparison: C02 "in use until November 30, 2026",
//     C03 "in use beginning December 1, 2026"; added, moved and merged skills:
//     https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/dva-03-comparison.html
//   - Per-domain skills: .../developer-associate-03/developer-associate-03-domain1.html
//     through -domain4.html under the same docs path (same text as the PDF).
//   - In-scope services list (used only where an objective names a service
//     the skill itself does not -- each such objective is marked
//     "in-scope list" in a comment):
//     https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/dva-03-in-scope-services.html
//   - Duration 130 minutes -- NOT in the exam guide, which states no time
//     limit. Taken from the AWS certification page
//     (https://aws.amazon.com/de/certification/certification-levels/certified-developer-associate,
//     "130 minutes", "65 questions"; its links point at the DVA-C03 guide).
//     That page does not name the version in its text, so treat the 130 as
//     unverified for C03 specifically until the English page or a C03
//     announcement states it.
//
// HOW THE SWITCH IS MODELLED -- exactly as AWSSAP's SAP-C02 -> SAP-C03:
//   - The four DVA-C02 units stay at sort_order 0-3 with retiredAt set; their
//     objective rows and every learner's mastery, attempts, error log and
//     cached lessons on them are kept. retiredAt is 2026-12-01T12:00Z: the
//     moment 2026-11-30 (DVA-C02's last day) has ended in UTC-12, the last
//     time zone to finish it.
//   - One deviation from SAP: three C03 domains keep C02's exact names
//     ("Development with AWS Services", "Security", "Troubleshooting and
//     Optimization"), and both sets are listed until retirement. So the
//     retired C02 unit titles carry a " (DVA-C02)" suffix -- otherwise the
//     course page and attempt/error history (which show unit titles) would
//     show two indistinguishable "Security" units. Row ids are unchanged
//     (units are matched by sort_order, not title), so no history moves.
//   - The four DVA-C03 domains are new units at sort_order 4-7. Mastery is
//     NOT copied across: C03 merged and moved skills (comparison page), so a
//     C02 objective has no one-to-one C03 counterpart, and carried-over
//     mastery would claim evidence the learner never produced.
//   - credential_exams gets a new DVA-C03 row; the DVA-C02 row is kept,
//     marked superseded_by DVA-C03 with retirement_date 2026-11-30.
//
// AI content is now scored: C02's unscored "emerging topics" became scored
// skills (1.1.9, 1.1.10, 3.2.5, 3.3.9, 4.1.5, 4.3.6) and a whole new task,
// 2.3 (AI security). The guide puts FM selection, prompt engineering, RAG
// design and guardrail/AI-governance design out of scope, so those
// objectives stay at the developer's level: call, secure, filter, log.
// Amazon Q Developer, named in C02, is not in C03's in-scope list (Kiro and
// Amazon Bedrock / AgentCore are), so no C03 objective names it.
// ---------------------------------------------------------------------------
const DVA_C02_RETIRED_AT = "2026-12-01T12:00:00Z";
const DVA_VERIFIED_AT = "2026-11-07T00:00:00Z";

export const AWS_DVA_TRACK: SeedTrack = {
  code: "AWSDVA",
  title: "Prep for the AWS Certified Developer - Associate (DVA-C03) Exam",
  description:
    "AWS Certified Developer - Associate (DVA-C03): writing, securing, testing, deploying, and debugging applications on AWS -- Lambda and event-driven code, DynamoDB and caching, IAM, encryption and secrets, securing calls to AI services, containers and CI/CD with rollback, and observability and optimization, with AI-assisted development throughout.",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl:
    "https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/developer-associate-03.html",
  sourceVerifiedAt: DVA_VERIFIED_AT,
  contentReviewDueAt: "2027-06-01T00:00:00Z",
  credential: {
    ...AWS_PROVIDER,
    credentialSlug: "certified-developer-associate",
    credentialName: "AWS Certified Developer - Associate",
    credentialUrl: "https://aws.amazon.com/certification/certified-developer-associate/",
    examCode: "DVA-C03",
    status: "active",
    effectiveDate: "2026-12-01", // first C03 exam day; dva-03-comparison.html
    officialObjectivesUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/developer-associate-03.html",
    lastVendorVerifiedAt: DVA_VERIFIED_AT,
    recommendedExperience:
      "1 or more years of hands-on experience developing and maintaining applications with AWS services; proficiency in at least one high-level programming language; experience with application development tools, including AI tools. Out of scope: designing architectures, designing and creating CI/CD pipelines, administering IAM users and groups, administering servers and operating systems, selecting foundation models, prompt engineering and RAG design, designing AI safety frameworks, guardrails and AI governance, designing ETL pipelines, and designing AWS networking.",
    durationMinutes: 130, // certification page; the exam guide states no time limit -- see block comment
    questionFormat:
      "65 questions (50 scored, 15 unscored); multiple choice and multiple response only -- no ordering, matching, or case-study items",
    passingScorePolicy:
      "Scaled score 100-1000; minimum passing score 720; compensatory scoring, so no per-domain minimum",
    supersedes: { examCode: "DVA-C02", lastExamDate: "2026-11-30" },
  },
  units: [
    {
      title: "Development with AWS Services (DVA-C02)",
      retiredAt: DVA_C02_RETIRED_AT, // DVA-C02 domain; see block comment
      weight: 32,
      gate: "Write a Lambda function that talks to DynamoDB and a queue, and explain every configuration choice you made -- memory, timeout, concurrency, partition key, retry behavior -- in terms of what would break without it.",
      objectives: [
        "Architectural patterns in application code: event-driven, microservices, monolithic, choreography, orchestration, fanout",
        "Stateful versus stateless components",
        "Tightly coupled versus loosely coupled components",
        "Synchronous versus asynchronous patterns",
        "Writing fault-tolerant, resilient application code in a high-level language",
        "Creating, extending, and maintaining APIs: request and response transformations, validation rules, status code overrides",
        "Writing and running unit tests in a development environment, including with AWS SAM",
        "Writing code against messaging services",
        "Calling AWS services from code with the service APIs and the AWS SDKs",
        "Handling streaming data with AWS services",
        "Implementing event-driven patterns with Amazon EventBridge",
        "Resilient integration with third-party services: retry logic, circuit breakers, error-handling patterns",
        "Using Amazon Q Developer to assist with development",
        "Reaching private resources inside a VPC from Lambda code",
        "Configuring a Lambda function: memory, concurrency, timeout, runtime, handler, layers, extensions, triggers, destinations",
        "Environment variables and parameters in a Lambda function",
        "Handling the Lambda event lifecycle and errors: Lambda destinations and dead-letter queues",
        "Writing and running test code for Lambda with AWS services and tools",
        "Integrating Lambda functions with other AWS services",
        "Tuning a Lambda function for performance",
        "Processing and transforming data in near real time with Lambda",
        "Amazon DynamoDB keys and indexing",
        "High-cardinality partition keys, and why they keep partition access balanced",
        "Database consistency models: strongly consistent versus eventually consistent",
        "Query versus scan, and the cost of reaching for scan",
        "Serializing and deserializing data to persist it to a data store",
        "Using, managing, and maintaining data stores, including data lifecycles",
        "Using data caching services",
        "Choosing a specialized data store for an access pattern, such as Amazon OpenSearch Service",
      ],
    },
    {
      title: "Security (DVA-C02)",
      retiredAt: DVA_C02_RETIRED_AT, // DVA-C02 domain; see block comment
      weight: 26,
      gate: "Given application code holding a secret, a token, and customer PII, say where each one should actually live, which AWS service holds it, and who can decrypt it.",
      objectives: [
        "Federated access through an identity provider: Amazon Cognito and IAM",
        "Securing applications with bearer tokens",
        "Configuring programmatic access to AWS",
        "Making authenticated calls to AWS services from code",
        "Assuming an IAM role from an application",
        "Defining permissions for IAM principals",
        "Application-level authorization for fine-grained access control",
        "Cross-service authentication in a microservice architecture",
        "Encryption at rest and encryption in transit, defined precisely",
        "Certificate management, including AWS Private CA",
        "Client-side encryption versus server-side encryption",
        "Using encryption keys to encrypt and decrypt data",
        "Generating certificates and SSH keys for development purposes",
        "Using encryption across account boundaries",
        "Enabling and disabling key rotation",
        "Data classification: personally identifiable information and protected health information",
        "Encrypting environment variables that contain sensitive data",
        "Using secret management services rather than secrets in code",
        "Sanitizing sensitive data, and application-level data masking",
        "Data access patterns for multi-tenant applications",
      ],
    },
    {
      title: "Deployment (DVA-C02)",
      retiredAt: DVA_C02_RETIRED_AT, // DVA-C02 domain; see block comment
      weight: 24,
      gate: "Take a working application from a laptop to production through a pipeline: package it, template it, stage it, release it with a strategy you can name, and roll it back.",
      objectives: [
        "Managing the code module's dependencies inside the package: environment variables, configuration files, container images",
        "Organizing files and directory structure for deployment",
        "Using code repositories in deployment environments",
        "Applying an application's resource requirements, such as memory and cores",
        "Preparing environment-specific configuration, including with AWS AppConfig",
        "Testing deployed code with AWS services and tools",
        "Writing integration tests and mocking APIs for external dependencies",
        "Testing against development endpoints, such as Amazon API Gateway stages",
        "Deploying stack updates to an existing environment, such as a SAM template to a different staging environment",
        "Testing event-driven applications",
        "Creating application test events: JSON payloads for Lambda, API Gateway, and SAM resources",
        "Deploying API resources to different environments",
        "Approved-version environments for integration testing: Lambda aliases, container image tags, AWS Amplify branches, AWS Copilot environments",
        "Implementing and deploying infrastructure as code: AWS SAM and AWS CloudFormation templates",
        "Managing development, test, and production inside a single service such as API Gateway",
        "Managing application environments across AWS services more broadly, not just within a single service",
        "Generating automated tests with Amazon Q Developer",
        "Lambda deployment packaging options",
        "API Gateway stages and custom domains",
        "Updating existing infrastructure as code templates",
        "Configuring deployment strategies: blue/green, canary, rolling",
        "Committing code to a repository to invoke build, test, and deployment actions",
        "Using orchestrated workflows to deploy code to different environments",
        "Rolling an application back using an existing deployment strategy",
        "Labels and branches for version and release management",
        "Dynamic deployments driven by runtime configuration, such as API Gateway stage variables in Lambda",
      ],
    },
    {
      title: "Troubleshooting and Optimization (DVA-C02)",
      retiredAt: DVA_C02_RETIRED_AT, // DVA-C02 domain; see block comment
      weight: 18,
      gate: "Given a slow or failing application, find the cause from metrics, logs, and traces -- then name the specific optimization and the number you expect it to move.",
      objectives: [
        "Debugging code to identify defects",
        "Interpreting application metrics, logs, and traces together",
        "Querying logs to find the relevant data",
        "Implementing custom metrics, including the CloudWatch embedded metric format",
        "Reviewing application health with dashboards and insights",
        "Troubleshooting deployment failures from service output logs",
        "Debugging service integration issues",
        "Logging, monitoring, and observability as three different things",
        "An effective logging strategy that records application behavior and state",
        "Structured logging for application events and user actions",
        "Emitting custom metrics from application code",
        "Adding annotations for tracing services",
        "Implementing tracing with AWS services and tools",
        "Notification alerts for specific events, such as quota limits or deployment completion",
        "Configuring application health checks and readiness probes",
        "Concurrency, defined and then configured",
        "Profiling application performance",
        "Determining the minimum memory and compute an application needs",
        "Subscription filter policies to optimize messaging",
        "Caching content based on request headers",
        "Application-level caching for performance",
        "Optimizing application resource usage",
        "Analyzing performance issues and finding bottlenecks in application logs",
      ],
    },
    // ----- DVA-C03 domains (sort_order 4-7). Objectives paraphrase the
    // skills in each task of the DVA-C03 guide, one idea apiece; the skill
    // number each one comes from is in the trailing comment.
    {
      // https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/developer-associate-03-domain1.html
      title: "Development with AWS Services",
      weight: 30,
      gate: "Build a small event-driven feature end to end -- an API that accepts work, a queue or event bus that carries it, a Lambda function that processes it into DynamoDB -- and explain each coupling, retry, key, and configuration choice in terms of what would break without it.",
      objectives: [
        "Tightly coupled versus loosely coupled systems", // 1.1.1
        "Decoupling system components with AWS services", // 1.1.1
        "Synchronous versus asynchronous patterns, and when each fits", // 1.1.2
        "Synchronous request-response through Amazon API Gateway", // 1.1.2
        "Asynchronous processing with Amazon SQS", // 1.1.2
        "Event-driven workflows with Amazon EventBridge", // 1.1.2, 1.1.8
        "Fault-tolerant, resilient application code", // 1.1.3
        "Retry with backoff when a call fails", // 1.1.3
        "Graceful degradation when a dependency is unavailable", // 1.1.3
        "Creating, extending, and maintaining APIs", // 1.1.4
        "Request and response transformations in an API", // 1.1.4
        "Enforcing validation rules on API requests", // 1.1.4
        "Calling AWS services from code with the service APIs and the AWS SDKs", // 1.1.5
        "Managing streaming data with AWS services such as Amazon Kinesis and Amazon Data Firehose", // 1.1.6; services from the in-scope list
        "Serializing and deserializing data to integrate application code with AWS services", // 1.1.7 (moved from C02 1.3)
        "Amazon S3 Event Notifications as an event source", // 1.1.8
        "Event-driven patterns with Amazon SQS and Amazon SNS", // 1.1.8
        "Spec-driven code generation with AI-assisted development tools such as Kiro", // 1.1.9; Kiro from the in-scope list
        "Automated code review and security scanning with AI-assisted tools", // 1.1.9
        "Intelligent code completion and AI refactoring suggestions -- and checking what they produce", // 1.1.9
        "Integrating managed AWS AI services into an application", // 1.1.10
        "Calling Amazon Bedrock models from application code", // 1.1.10; Bedrock from the in-scope list
        "Giving a Lambda function access to private resources in a VPC", // 1.2.1
        "Configuring a Lambda function: memory, concurrency, timeout, runtime, handler", // 1.2.2
        "Lambda layers and extensions", // 1.2.2
        "Environment variables and parameters in a Lambda function", // 1.2.2
        "Handling Lambda event lifecycles and errors with destinations and dead-letter queues", // 1.2.3
        "Integrating Lambda with AWS services through code, event source mappings, and destinations", // 1.2.4
        "Lambda integrations with API Gateway and Amazon DynamoDB", // 1.2.4
        "Managing data lifecycles: S3 Lifecycle policies, TTL, and retention periods", // 1.3.1
        "Choosing a data store by access pattern: Amazon ElastiCache, DynamoDB, Amazon S3, Amazon RDS", // 1.3.2
        "Choosing the caching solution that fits the data store you picked", // 1.3.3
        "DynamoDB keys, attributes, and indexes", // 1.3.4
        "High-cardinality partition keys, and why they keep partition access balanced", // 1.3.4
        "DynamoDB read consistency: strongly consistent versus eventually consistent reads", // 1.3.4
        "DynamoDB query versus scan, and the cost of reaching for scan", // 1.3.4
      ],
    },
    {
      // https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/developer-associate-03-domain2.html
      title: "Security",
      weight: 26,
      gate: "Given an application that signs users in, stores customer PII, holds a database secret, and sends user text to a foundation model, say where each credential and piece of data lives, who can decrypt or read it, and what stops it leaking into the model, its training data, or the logs.",
      objectives: [
        "Implementing identity federation", // 2.1.1
        "Amazon Cognito user pools and identity pools for application sign-in and AWS credentials", // 2.1.1; Cognito from the in-scope list
        "Fine-grained access control in an application", // 2.1.2
        "Security tokens, including bearer tokens, for securing applications", // 2.1.2
        "Multi-factor authentication (MFA) as an access control", // 2.1.2
        "Configuring programmatic access to AWS", // 2.1.3
        "Presigned URLs for secure, time-limited access with Amazon S3 and Amazon CloudFront", // 2.1.4 (new in C03)
        "Making authenticated calls to AWS services", // 2.1.5
        "Defining permissions for IAM principals: users, roles, and services", // 2.1.6
        "Resource-based permissions, and how they combine with identity-based ones", // 2.1.6
        "Assuming an IAM role through AWS STS", // 2.1.7; STS from the in-scope list
        "Encryption at rest and encryption in transit, defined precisely", // 2.2.1
        "Certificate management with AWS Certificate Manager and AWS Private CA", // 2.2.2
        "Client-side versus server-side encryption, and choosing between them", // 2.2.3
        "Using encryption keys to encrypt and decrypt data with AWS KMS", // 2.2.4; KMS from the in-scope list
        "Generating certificates and SSH keys for development purposes", // 2.2.5
        "Identifying sensitive data: personally identifiable information (PII) and protected health information (PHI)", // 2.2.6
        "Masking sensitive data and limiting who can access it", // 2.2.6
        "Using secret management services such as AWS Secrets Manager instead of secrets in code", // 2.2.7
        "Requesting and managing access to AI services, such as Amazon Bedrock model access", // 2.3.1
        "Private connectivity to AI services through VPC endpoints (AWS PrivateLink)", // 2.3.2
        "Making sure AI service inputs and outputs are not used to train models", // 2.3.2
        "Content filtering on AI model inputs and outputs", // 2.3.3
        "Sensitive information detection and PII/PHI redaction in AI inputs and outputs", // 2.3.3
        "Denied topic policies for AI applications", // 2.3.3
        "Protecting AI applications from prompt injection and manipulation", // 2.3.3
        "Tool-use authorization for AI agents", // 2.3.4
        "Session isolation between AI agent sessions", // 2.3.4
        "Human-in-the-loop approval for sensitive AI agent actions", // 2.3.4
        "Keeping sensitive content out of monitoring logs when calling AI services", // 2.3.5
      ],
    },
    {
      // https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/developer-associate-03-domain3.html
      title: "Testing and Deployment",
      weight: 22,
      gate: "Take a working service from a laptop to production: package it (zip or container image), test it with real test events and mocked dependencies, template it, push it through a pipeline across environments with a release strategy you can name, and roll it back.",
      objectives: [
        "Managing a code module's dependencies inside the package: environment variables, configuration files, container images", // 3.1.1
        "Building container images for deployment with Dockerfiles", // 3.1.2 (new in C03)
        "Managing container images in Amazon ECR: image tagging and lifecycle policies", // 3.1.2 (new in C03)
        "Using code repositories in deployment environments", // 3.1.3
        "Environment-specific configuration with AWS AppConfig", // 3.1.4
        "Environment-specific configuration and secrets with Systems Manager Parameter Store and Secrets Manager", // 3.1.4
        "Environment-specific configuration through API Gateway and Lambda settings", // 3.1.4
        "API Gateway stages, stage-specific URLs, and endpoints", // 3.1.5 (moved from C02 3.4)
        "Developing and validating tests with AWS SAM, including local unit tests", // 3.2.1 (SAM unit testing moved from C02 1.1)
        "Validating infrastructure code with AWS CDK and AWS CloudFormation tests", // 3.2.1
        "Mocking external dependencies with API Gateway", // 3.2.2
        "Creating application test events: JSON payloads for Lambda functions and API Gateway APIs", // 3.2.3
        "Lambda aliases as application environments", // 3.2.4
        "Container image tags as application environments", // 3.2.4
        "AWS Amplify branches and AWS Copilot environments", // 3.2.4
        "Separate API Gateway APIs per environment", // 3.2.4
        "Generating tests with AWS AI tools", // 3.2.5 (new in C03)
        "Automating test execution, result analysis, regression testing, and coverage tracking with AI tools", // 3.2.5 (new in C03)
        "Lambda deployment packaging: .zip files, container images, and layers", // 3.3.1
        "Deploying containers on Amazon ECS: task definitions and the AWS Fargate launch type", // 3.3.2 (new in C03)
        "Deploying containers on Amazon EKS: manifests and rolling updates", // 3.3.2 (new in C03)
        "Using infrastructure as code templates: AWS CloudFormation and AWS SAM", // 3.3.3
        "Deploying application revisions to target environments with AWS CodeDeploy", // 3.3.4
        "Orchestrating CI/CD with AWS CodePipeline: starting from a linked repository and promoting through environments", // 3.3.5
        "Deployment strategies: blue/green, canary, and rolling", // 3.3.6
        "Automatic and manual rollback with AWS CloudFormation and AWS CodeDeploy", // 3.3.7
        "Source control labels and branches for versions and releases", // 3.3.8
        "AWS AI tools in CI/CD: deployment approvals, environment provisioning, and post-deployment validation", // 3.3.9 (new in C03)
      ],
    },
    {
      // https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/developer-associate-03-domain4.html
      title: "Troubleshooting and Optimization",
      weight: 22,
      gate: "Given a slow or failing application, find the cause from its metrics, logs, and traces (and say what an AI troubleshooting suggestion got right or wrong), then name the specific optimization -- concurrency, memory, messaging, or caching -- and the number you expect it to move.",
      objectives: [
        "Debugging application code to identify defects", // 4.1.1
        "Debugging service integration issues", // 4.1.1
        "Interpreting application metrics, logs, and traces together", // 4.1.2
        "Querying logs in Amazon CloudWatch Logs to find the relevant data", // 4.1.3; CloudWatch Logs from the in-scope list
        "Troubleshooting deployment failures from output logs", // 4.1.4
        "Using AWS AI tools to analyze errors and suggest fixes -- and verifying the suggestion", // 4.1.5 (new in C03)
        "A logging strategy that records application behavior and state", // 4.2.1
        "Structured logging for application events and user actions", // 4.2.1
        "Emitting custom metrics from application code", // 4.2.2
        "Notification alerts for specific actions, such as quota limits and deployment completions", // 4.2.3
        "Implementing tracing with AWS services and tools such as AWS X-Ray", // 4.2.4; X-Ray from the in-scope list
        "Monitoring workload health: application health checks, liveness probes, and readiness probes", // 4.2.5
        "Lambda provisioned concurrency", // 4.3.1
        "Amazon EC2 Auto Scaling as a concurrency lever", // 4.3.1
        "Thread pool and connection pool management", // 4.3.1
        "Optimizing memory and compute for an application, including Lambda performance tuning", // 4.3.2 (Lambda tuning moved from C02 1.2)
        "Optimizing messaging with SQS queues and SNS fan-out", // 4.3.3
        "Caching with Amazon ElastiCache, DynamoDB Accelerator (DAX), and Amazon CloudFront", // 4.3.4
        "Detecting performance bottlenecks with Amazon CloudWatch", // 4.3.5
        "Using AWS AI tools to find optimization opportunities: bottlenecks, resource usage, and code efficiency", // 4.3.6 (new in C03)
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Associate: AWS Certified CloudOps Engineer - Associate (SOA-C03)
// 130 minutes, 65 questions (50 scored, 15 unscored), scaled 100-1000, pass 720.
// Domains: 22% / 22% / 22% / 16% / 18%.
//
// Formerly AWS Certified SysOps Administrator - Associate; AWS renamed the
// credential with this exam version. The guide still lives at the old
// sysops-administrator-associate-03 URL. Existing SysOps Administrator -
// Associate holders keep their credential for its full three years and do not
// need to retake it.
//
// SOA-C02's hands-on exam labs are gone: SOA-C03 is multiple choice and
// multiple response only.
// ---------------------------------------------------------------------------
export const AWS_SOA_TRACK: SeedTrack = {
  code: "AWSSOA",
  title: "Prep for the AWS Certified CloudOps Engineer - Associate (SOA-C03) Exam",
  description:
    "AWS Certified CloudOps Engineer - Associate (SOA-C03), formerly SysOps Administrator - Associate: running workloads day to day -- monitoring and remediation, reliability and backups, provisioning and automation, security and compliance, and networking when the packets do not arrive.",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl:
    "https://docs.aws.amazon.com/aws-certification/latest/sysops-administrator-associate-03/sysops-administrator-associate-03.html",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...AWS_PROVIDER,
    credentialSlug: "certified-cloudops-engineer-associate",
    credentialName: "AWS Certified CloudOps Engineer - Associate",
    credentialUrl:
      "https://aws.amazon.com/certification/certified-cloudops-engineer-associate/",
    examCode: "SOA-C03",
    status: "active",
    officialObjectivesUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/sysops-administrator-associate-03/sysops-administrator-associate-03.html",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "1 year of deployment, management, troubleshooting, networking, and security on AWS, plus at least 1 year in a related operations role such as system administrator. Designing architectures, designing CI/CD pipelines, designing hybrid networking, software development, capacity planning, and cost analysis are out of scope.",
    durationMinutes: 130,
    questionFormat:
      "65 questions (50 scored, 15 unscored); multiple choice and multiple response -- the SOA-C02 hands-on exam labs have been removed",
    passingScorePolicy:
      "Scaled score 100-1000; minimum passing score 720; compensatory scoring, so no per-domain minimum",
  },
  units: [
    {
      title: "Monitoring, Logging, Analysis, Remediation, and Performance Optimization",
      weight: 22,
      gate: "Given a workload that is slow or silent, say which metric or log would have told you first, wire the alarm that catches it next time, and name the automation that fixes it without a human.",
      objectives: [
        "Configuring monitoring and logging with Amazon CloudWatch, AWS CloudTrail, and Amazon Managed Service for Prometheus",
        "Monitoring different workload shapes -- serverless, compute, AI -- and what changes between them",
        "Installing and managing the CloudWatch agent on EC2 instances, Amazon ECS clusters, and Amazon EKS clusters",
        "Configuring CloudWatch alarms, including composite alarms and the actions they can invoke",
        "Troubleshooting an alarm that never fires, or fires on the wrong thing",
        "Invoking AWS services from an alarm directly or through Amazon EventBridge",
        "Building customizable, shareable CloudWatch dashboards spanning multiple accounts and Regions",
        "Sending notifications to Amazon SNS from AWS services and from alarms",
        "Analyzing performance metrics and automating remediation with CloudWatch, AWS Lambda, AWS Systems Manager, and CloudTrail",
        "Automated remediation with newer AWS operations tooling, including Kiro and the AWS DevOps Agent",
        "Routing, enriching, and delivering events with EventBridge, and debugging event bus rules",
        "Creating and running custom and predefined Systems Manager Automation runbooks",
        "Optimizing compute and remediating performance problems using performance metrics, resource tags, and AWS tools",
        "Analyzing Amazon EBS performance metrics and choosing volume types for performance and cost",
        "S3 performance strategies: multipart uploads, S3 Transfer Acceleration, AWS DataSync, S3 Lifecycle policies",
        "Selecting and optimizing shared storage: Amazon EFS, Amazon FSx, and EFS lifecycle policies",
        "Monitoring Amazon RDS with Performance Insights and CloudWatch alarms, and acting on proactive recommendations",
        "Using Amazon RDS Proxy to fix connection-driven performance problems",
        "Optimizing EC2 instances with their attached storage and networking, including placement groups",
      ],
    },
    {
      title: "Reliability and Business Continuity",
      weight: 22,
      gate: "Given an RTO and an RPO, configure the backup and failover that meet them -- then prove it by describing the restore, not the backup.",
      objectives: [
        "Configuring and managing scaling mechanisms in compute environments",
        "Caching to support dynamic scalability: Amazon CloudFront and Amazon ElastiCache",
        "Configuring and managing scaling in AWS managed databases: Amazon RDS and Amazon DynamoDB",
        "Configuring and troubleshooting Elastic Load Balancing health checks",
        "Configuring and troubleshooting Amazon Route 53 health checks",
        "Configuring fault-tolerant systems with Multi-AZ deployments",
        "Automating snapshots and backups with AWS Backup across EC2 instances, RDS DB instances, EBS volumes, S3 buckets, and DynamoDB tables",
        "Restoring databases, including point-in-time restore, against RTO, RPO, and cost requirements",
        "Implementing versioning on storage services: Amazon S3 and Amazon FSx",
        "Following disaster recovery procedures: backup and restore, pilot light, warm standby, active/active",
      ],
    },
    {
      title: "Deployment, Provisioning, and Automation",
      weight: 22,
      gate: "Stand up an environment from a template, break it deliberately with a subnet that is too small or a missing permission, and read the failure back to its cause.",
      objectives: [
        "Creating and managing AMIs and container images, including with EC2 Image Builder",
        "Creating and managing AWS resources with AWS CloudFormation and the AWS CDK",
        "Identifying and remediating deployment issues: subnet sizing, CloudFormation errors, permissions problems",
        "Provisioning and sharing resources across Regions and accounts with AWS Resource Access Manager and CloudFormation StackSets",
        "Implementing deployment strategies and the services that carry them out",
        "Using and managing third-party automation tooling, such as Terraform and Git",
        "Automating operational processes with AWS Systems Manager",
        "Event-driven automation with AWS Lambda, S3 Event Notifications, EventBridge, and the AWS DevOps Agent",
      ],
    },
    {
      title: "Security and Compliance",
      weight: 16,
      gate: "Given an access denial or an audit finding, trace it to the policy, condition, or control that caused it, and remediate without opening the door wider than needed.",
      objectives: [
        "Implementing IAM features: password policies, MFA, roles, federated identity, resource policies, policy conditions",
        "Troubleshooting and auditing access with CloudTrail, IAM Access Analyzer, and the IAM policy simulator",
        "Implementing multi-account strategies securely: AWS Organizations, service control policies, IAM Identity Center",
        "Remediating based on AWS Trusted Advisor security checks",
        "Enforcing compliance and continuous monitoring, including Region and service selection and AWS Config conformance packs",
        "Implementing and enforcing a data classification scheme",
        "Implementing, configuring, and troubleshooting encryption at rest with AWS KMS",
        "Implementing, configuring, and troubleshooting encryption in transit with AWS Certificate Manager",
        "Storing secrets securely with AWS services",
        "Configuring reports and remediating findings from AWS Security Hub, Amazon GuardDuty, AWS Config, Amazon Inspector, and AWS Security Agent",
      ],
    },
    {
      title: "Networking and Content Delivery",
      weight: 18,
      gate: "Given 'it cannot reach the database', work the path -- security group, network ACL, route table, gateway, DNS -- and name the log that proves where it stopped.",
      objectives: [
        "Configuring a VPC: subnets, route tables, network ACLs, security groups, NAT gateways, internet gateway, egress-only internet gateway",
        "Configuring private connectivity: VPC endpoints, AWS PrivateLink, VPC peering",
        "Auditing network protection services in a single account: Route 53 Resolver DNS Firewall, AWS WAF, AWS Shield, AWS Network Firewall",
        "Optimizing the cost of a network architecture",
        "Configuring DNS, including Route 53 Resolver",
        "Implementing Route 53 routing policies, configurations, and query logging",
        "Configuring content and service distribution: Amazon CloudFront and AWS Global Accelerator",
        "Troubleshooting VPC configurations: subnets, route tables, network ACLs, security groups, transit gateways, NAT gateways",
        "Collecting and interpreting networking logs: VPC flow logs, ELB access logs, AWS WAF web ACL logs, CloudFront logs, container logs",
        "Identifying and remediating CloudFront caching issues",
        "Identifying and troubleshooting hybrid connectivity and private connectivity issues",
        "Configuring and analyzing CloudWatch network monitoring services",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Associate: AWS Certified Data Engineer - Associate (DEA-C01)
// 65 questions (50 scored, 15 unscored), scaled 100-1000, pass 720.
// Domains: 34% / 26% / 22% / 18%.
//
// durationMinutes is deliberately omitted: the exam guide does not state it,
// and it was not verified against the certification page on 2026-09-18.
//
// This guide has been revised since launch -- it now covers vector index types
// (HNSW, IVF), open table formats (Apache Iceberg), integrating LLMs into data
// processing, and Amazon SageMaker Unified Studio and SageMaker Catalog.
// ---------------------------------------------------------------------------
export const AWS_DEA_TRACK: SeedTrack = {
  code: "AWSDEA",
  title: "Prep for the AWS Certified Data Engineer - Associate (DEA-C01) Exam",
  description:
    "AWS Certified Data Engineer - Associate (DEA-C01): building data pipelines that survive production -- ingestion and transformation, choosing and cataloging data stores, operating and monitoring pipelines, and the security and governance around the data itself.",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl:
    "https://docs.aws.amazon.com/aws-certification/latest/data-engineer-associate-01/data-engineer-associate-01.html",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...AWS_PROVIDER,
    credentialSlug: "certified-data-engineer-associate",
    credentialName: "AWS Certified Data Engineer - Associate",
    credentialUrl: "https://aws.amazon.com/certification/certified-data-engineer-associate/",
    examCode: "DEA-C01",
    status: "active",
    officialObjectivesUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/data-engineer-associate-01/data-engineer-associate-01.html",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "The equivalent of 2-3 years in data engineering plus 1-2 years hands-on with AWS services. ML training and inference, language-specific syntax, and drawing business conclusions from data are out of scope.",
    questionFormat:
      "65 questions (50 scored, 15 unscored); multiple choice and multiple response",
    passingScorePolicy:
      "Scaled score 100-1000; minimum passing score 720; compensatory scoring, so no per-domain minimum",
  },
  units: [
    {
      title: "Data Ingestion and Transformation",
      weight: 34,
      gate: "Given a source, a volume, and a latency requirement, design the pipeline -- streaming or batch, which transformation service, how it is orchestrated, and what happens when it fails halfway. This is the largest domain on the exam.",
      objectives: [
        "Reading from streaming sources: Amazon Kinesis, Amazon MSK, Amazon DynamoDB Streams, AWS DMS, AWS Glue, Amazon Redshift",
        "Reading from batch sources: Amazon S3, AWS Glue, Amazon EMR, AWS DMS, Amazon Redshift, AWS Lambda, Amazon AppFlow",
        "Configuration options that matter for batch ingestion",
        "Consuming data APIs",
        "Scheduling jobs and crawlers with Amazon EventBridge, Apache Airflow, or time-based schedules",
        "Setting up event triggers: Amazon S3 Event Notifications and EventBridge",
        "Invoking a Lambda function from Kinesis",
        "Allowlisting IP addresses so connections to data sources succeed",
        "Throttling and rate limits in DynamoDB, Amazon RDS, and Kinesis, and how to work within them",
        "Managing fan-in and fan-out for streaming data distribution",
        "Replayability of an ingestion pipeline",
        "Stateful versus stateless data transactions",
        "Optimizing container usage for processing performance with Amazon EKS and Amazon ECS",
        "Connecting to data sources over JDBC and ODBC",
        "Integrating data from multiple sources",
        "Optimizing cost while processing data",
        "Choosing a transformation service for the requirement: Amazon EMR, AWS Glue, Lambda, Amazon Redshift",
        "Transforming data between formats, such as CSV to Apache Parquet",
        "Troubleshooting and debugging transformation failures and performance problems",
        "Creating data APIs so other systems can reach the data",
        "Volume, velocity, and variety, and structured versus unstructured data",
        "Integrating large language models into data processing",
        "Orchestrating ETL workflows with Lambda, EventBridge, Amazon MWAA, AWS Step Functions, and AWS Glue workflows",
        "Building pipelines for performance, availability, scalability, resiliency, and fault tolerance",
        "Implementing and maintaining serverless workflows",
        "Sending alerts from a pipeline with Amazon SNS and Amazon SQS",
        "Optimizing code to cut ingestion and transformation runtime",
        "Configuring Lambda functions for the concurrency and performance a pipeline needs",
        "Languages and frameworks for data engineering: Python, SQL, Scala, R, Java, Bash, PowerShell",
        "Software engineering practice applied to pipelines: version control, testing, logging, monitoring",
        "Infrastructure as code for repeatable deployment: AWS CloudFormation and the AWS CDK",
        "Packaging and deploying serverless data pipelines with AWS SAM",
        "Using and mounting storage volumes from within a Lambda function",
        "Continuous integration and delivery for data pipelines",
        "Distributed computing, and the data structures and algorithms behind pipeline work",
      ],
    },
    {
      title: "Data Store Management",
      weight: 26,
      gate: "Choose the store and the schema for a described access pattern, then say how the catalog finds it, how the data ages out, and what happens when the schema changes underneath you.",
      objectives: [
        "Choosing storage services for cost and performance: Amazon Redshift, Amazon EMR, AWS Lake Formation, Amazon RDS, Amazon DynamoDB, Kinesis Data Streams, Amazon MSK",
        "Configuring storage services for a specific access pattern",
        "Matching a store to a use case, such as Amazon MemoryDB for fast key/value access",
        "Vector index types -- HNSW and IVF -- including HNSW with Amazon Aurora PostgreSQL",
        "Integrating migration tools such as AWS Transfer Family into a processing system",
        "Remote access and federation: Amazon Redshift federated queries, materialized views, Redshift Spectrum",
        "Managing locks that block data access in Amazon Redshift and Amazon RDS",
        "Managing open table formats, such as Apache Iceberg",
        "Using data catalogs to consume data from its source",
        "Building and referencing a technical data catalog: AWS Glue Data Catalog and the Apache Hive metastore",
        "Discovering schemas and populating catalogs with AWS Glue crawlers",
        "Synchronizing partitions with a data catalog",
        "Creating source and target connections for cataloging",
        "Creating and managing business data catalogs, including Amazon SageMaker Catalog",
        "Load and unload operations between Amazon S3 and Amazon Redshift",
        "S3 Lifecycle policies for changing storage tier and expiring data by age",
        "Managing S3 versioning and DynamoDB TTL",
        "Deleting data to meet business and legal requirements",
        "Protecting data with appropriate resiliency and availability",
        "Designing schemas for Amazon Redshift, DynamoDB, and Lake Formation",
        "Addressing changes to the characteristics of data as schemas evolve",
        "Schema conversion with AWS SCT and AWS DMS Schema Conversion",
        "Establishing data lineage with Amazon SageMaker ML Lineage Tracking and SageMaker Catalog",
        "Indexing, partitioning strategies, compression, and other data optimization techniques",
        "Vectorization concepts, including Amazon Bedrock knowledge bases",
      ],
    },
    {
      title: "Data Operations and Support",
      weight: 22,
      gate: "Given a pipeline that ran but produced wrong numbers, find it -- with logs, a query, and a data quality rule -- and say which check should have caught it before anyone looked at a dashboard.",
      objectives: [
        "Orchestrating data pipelines with Amazon MWAA and AWS Step Functions",
        "Troubleshooting Amazon managed workflows",
        "Calling AWS SDKs from code to drive data services",
        "Processing data with the features of Amazon EMR, Amazon Redshift, and AWS Glue",
        "Consuming and maintaining data APIs",
        "Preparing data for transformation with AWS Glue DataBrew and Amazon SageMaker Unified Studio",
        "Querying data with Amazon Athena",
        "Automating data processing with AWS Lambda",
        "Managing events and schedulers with Amazon EventBridge",
        "Visualizing data with AWS Glue DataBrew and Amazon QuickSight",
        "Verifying and cleaning data with Lambda, Athena, QuickSight, Jupyter notebooks, and SageMaker Data Wrangler",
        "Using SQL in Amazon Redshift and Athena to query data and create views",
        "Exploring data in Athena notebooks that run Apache Spark",
        "Trade-offs between provisioned services and serverless services",
        "Data aggregation, rolling averages, grouping, and pivoting",
        "Extracting logs for audits",
        "Deploying logging and monitoring that makes a pipeline auditable and traceable",
        "Using notifications during monitoring to send alerts",
        "Troubleshooting pipeline performance issues",
        "Tracking API calls with AWS CloudTrail",
        "Troubleshooting and maintaining AWS Glue and Amazon EMR pipelines",
        "Logging application data to Amazon CloudWatch Logs",
        "Analyzing logs with Athena, Amazon EMR, Amazon OpenSearch Service, and CloudWatch Logs Insights",
        "Running data quality checks during processing, such as checking for empty fields",
        "Defining data quality rules and investigating data consistency with DataBrew",
        "Data sampling techniques",
        "Implementing mechanisms that handle data skew",
      ],
    },
    {
      title: "Data Security and Governance",
      weight: 18,
      gate: "Given a data lake several teams share, say who can read what, how it is encrypted, where the PII is, which Regions it may not leave, and which log proves all of it to an auditor.",
      objectives: [
        "Updating VPC security groups to permit data access",
        "Creating and updating IAM groups, roles, endpoints, and services",
        "Creating and rotating credentials with AWS Secrets Manager",
        "Setting up IAM roles for access from AWS Lambda, Amazon API Gateway, the AWS CLI, and CloudFormation",
        "Applying IAM policies to roles, endpoints, and services, including S3 Access Points and AWS PrivateLink",
        "Managed versus unmanaged services, and what each leaves you responsible for",
        "Domains, domain units, and projects in SageMaker Unified Studio",
        "Writing custom IAM policies when a managed policy does not fit",
        "Storing application and database credentials in Secrets Manager or Systems Manager Parameter Store",
        "Granting database users, groups, and roles access and authority, as in Amazon Redshift",
        "Managing permissions through AWS Lake Formation for Amazon Redshift, Amazon EMR, Amazon Athena, and Amazon S3",
        "Role-based, tag-based, and attribute-based authorization",
        "Constructing custom policies that hold to least privilege",
        "Data masking and anonymization to satisfy compliance law or company policy",
        "Using AWS KMS keys to encrypt and decrypt data",
        "Configuring encryption across AWS account boundaries",
        "Encrypting data in transit, or before transit",
        "Tracking API calls with AWS CloudTrail, and centralizing queries with CloudTrail Lake",
        "Storing and analyzing logs: CloudWatch Logs, Athena, CloudWatch Logs Insights, Amazon OpenSearch Service, and Amazon EMR for large log volumes",
        "Granting permissions for data sharing, such as Amazon Redshift data sharing",
        "Identifying PII with Amazon Macie and AWS Lake Formation",
        "Preventing backups or replication of data into disallowed AWS Regions",
        "Maintaining data sovereignty",
        "Reviewing configuration changes in an account with AWS Config",
        "Managing data access through Amazon SageMaker Catalog projects",
        "Governance frameworks and data sharing patterns",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Associate: AWS Certified Machine Learning Engineer - Associate (MLA-C02)
// Beta. 170 minutes, 85 questions in the beta form (50 scored; beta forms
// carry extra unscored items with extra time), scaled 100-1000, pass 720.
// Domains: 28% / 24% / 24% / 24%.
//
// This track deliberately teaches MLA-C02, not the outgoing MLA-C01:
//   - 2026-09-28 is the last day to sit MLA-C01 in English.
//   - 2026-09-29 beta delivery of MLA-C02 begins.
//   - GA: AWS's September 2026 certification-updates post says "GA delivery
//     of MLA-C02 begins January 14, 2027" in all languages, and MLA-C01
//     retires everywhere that day
//     (https://aws.amazon.com/blogs/training-and-certification/september-2026-new-offerings/,
//     read 2026-11-07). UNCONFIRMED ON THE EXAM PAGE: the certification page
//     (https://aws.amazon.com/certification/certified-machine-learning-engineer-associate/,
//     read 2026-11-07) still says GA registration and delivery dates are
//     "TBD" and still shows "ME1-C02" in its code row, and the MLA-C02
//     announcement post only says "early 2027". So status stays 'beta', the
//     GA question count/duration are not recorded (only the beta form's
//     are), and the review date is set to that announced GA day.
//   - The exam guide itself (same docs URL as below, read 2026-11-07) is
//     unchanged from the version this track was written from: 50 scored +
//     15 unscored, pass 720, weights 28/24/24/24.
//   - MLA-C01 remains available in Japanese, Korean, and Simplified Chinese
//     until MLA-C02 reaches general availability.
// Anyone starting this course now in English will sit MLA-C02.
//
// The refresh folds generative AI through every domain -- Amazon Bedrock, RAG,
// agentic workflows, foundation models -- and renames the domains accordingly.
// MLA-C01 used ordering and matching question types; MLA-C02 is back to
// multiple choice and multiple response only.
//
// One discrepancy to watch: the AWS certification page's overview table shows
// the code as "ME1-C02" in the code row while calling the exam MLA-C02
// everywhere else. The exam guide says MLA-C02, so that is what is recorded
// here. Re-check at general availability.
// ---------------------------------------------------------------------------
export const AWS_MLA_TRACK: SeedTrack = {
  code: "AWSMLA",
  // REQ-258 (Nick, 2026-11-12): level-aware lessons switched on once its Key terms were written.
  levelFlow: true,
  title: "Prep for the AWS Certified Machine Learning Engineer - Associate (MLA-C02) Exam",
  description:
    "AWS Certified Machine Learning Engineer - Associate (MLA-C02): building and running ML and generative AI systems on AWS -- data preparation, training and fine-tuning, deploying models, agents and RAG pipelines, and then monitoring, costing, and securing all of it in production.",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl:
    "https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-02/machine-learning-engineer-associate-02.html",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: "2027-01-14T00:00:00Z",
  credential: {
    ...AWS_PROVIDER,
    credentialSlug: "certified-machine-learning-engineer-associate",
    credentialName: "AWS Certified Machine Learning Engineer - Associate",
    credentialUrl:
      "https://aws.amazon.com/certification/certified-machine-learning-engineer-associate/",
    examCode: "MLA-C02",
    status: "beta",
    effectiveDate: "2026-09-29",
    officialObjectivesUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-02/machine-learning-engineer-associate-02.html",
    lastVendorVerifiedAt: "2026-11-07T00:00:00Z",
    recommendedExperience:
      "At least 1 year using Amazon SageMaker AI, Amazon Bedrock, and other AWS services for ML engineering, plus at least 1 year in a related role such as backend developer, DevOps developer, data engineer, or data scientist, with experience in both traditional ML and generative AI.",
    durationMinutes: 170,
    questionFormat:
      "85 questions in the beta form (50 scored; beta adds extra unscored items with extra time); multiple choice and multiple response",
    passingScorePolicy:
      "Scaled score 100-1000; minimum passing score 720; compensatory scoring. The pass/fail designation does not apply to the beta form -- beta results arrive after the beta period.",
  },
  units: [
    {
      title: "Data Preparation for ML and AI",
      sources: AWS_MLA_UNIT_SOURCES["Data Preparation for ML and AI"],
      weight: 28,
      gate: "Take a raw, messy, multimodal dataset to something trainable: stored in the right format, features engineered, documents chunked for retrieval, PII masked, bias and class imbalance measured rather than assumed. Largest domain on the exam.",
      objectives: [
        "Extracting data from sources: Amazon S3, Amazon EBS, Amazon EFS, Amazon RDS, Amazon DynamoDB, Amazon OpenSearch Service",
        "Making storage decisions on cost, performance, data structure, and compliance",
        "Troubleshooting ingestion and storage problems involving capacity and scalability",
        "Ingesting from AWS streaming sources: Amazon Kinesis, Apache Flink, Apache Kafka",
        "Choosing data formats for the access pattern: Apache Parquet, JSON, CSV, ORC",
        "Merging data from multiple sources with AWS Glue, Apache Spark, or code",
        "Configuring scalable vector databases for AI applications: OpenSearch Service, Amazon RDS with pgvector, Amazon S3",
        "Ingesting and storing diverse data types: text, images, audio",
        "Ingesting data into SageMaker Feature Store",
        "Transforming data with AWS Glue, AWS Glue DataBrew, Spark on Amazon EMR, and SageMaker Data Wrangler",
        "Creating and managing features with SageMaker Feature Store",
        "Transforming streaming data with AWS Lambda and Spark",
        "Feature engineering: scaling, standardization, feature splitting, binning, log transformation, normalization",
        "Configuring and using embedding models to turn text and images into numerical representations",
        "Advanced text pre-processing: tokenization and domain-specific augmentation",
        "Preparing documents for Retrieval Augmented Generation: chunking strategies and metadata extraction",
        "Masking, redacting, and anonymizing data",
        "Preparing data for foundation-model fine-tuning, continuous pre-training, and distillation",
        "Validating data quality with DataBrew and AWS Glue Data Quality",
        "Labeling and annotating data",
        "Identifying and mitigating sources of bias: dataset splitting, shuffling, augmentation",
        "Applying bias metrics across numeric, text, and image assets in multimodal data",
        "Resolving class imbalance in numeric, text, and image datasets",
        "Validating AI training data integrity: prompt-response pair validation, content safety screening",
        "Cleaning data: detecting outliers, imputing missing values, deduplication",
      ],
    },
    {
      title: "ML Model and Foundation Model Development",
      sources: AWS_MLA_UNIT_SOURCES["ML Model and Foundation Model Development"],
      weight: 24,
      gate: "Given a business problem, choose between an AWS AI service, a built-in algorithm, a fine-tuned foundation model, and a RAG pipeline -- then prove the choice with an evaluation metric that actually matches the task.",
      objectives: [
        "Evaluating and selecting foundation models in Amazon Bedrock against task requirements and performance criteria",
        "Fine-tuning strategies for pre-trained foundation models",
        "Comparing ML models, generative AI models, algorithms, and solution templates on interpretability, domain performance, and latency",
        "Trade-offs between custom solutions, managed services, pre-trained models, and foundation models",
        "Selecting a Retrieval Augmented Generation architecture pattern for the use case",
        "Trade-offs between ML model performance, training time, and cost",
        "Trade-offs between AI model performance, latency, and cost",
        "Applying AWS AI services to business problems: Amazon Textract, Amazon Rekognition, Amazon Comprehend, Amazon Transcribe",
        "Using SageMaker AI built-in algorithms and common ML libraries",
        "Configuring SageMaker AI script mode with supported frameworks",
        "Hyperparameter optimization with SageMaker AI automatic model tuning",
        "Reducing training time with early stopping and distributed training",
        "Preventing overfitting, underfitting, and catastrophic forgetting",
        "Combining multiple ML models to improve performance or reduce cost",
        "Adjusting fundamental hyperparameters: epoch, steps, batch size",
        "Customizing AI solutions with task-specific prompt engineering and fine-tuning",
        "Optimizing retrieval components and embedding models",
        "Running reproducible experiments with MLflow on SageMaker AI, Amazon Bedrock evaluations, and Bedrock Prompt Management",
        "Creating performance baselines and implementing drift detection",
        "Comparing a shadow variant against the production variant",
        "Explaining model outputs",
        "Debugging model convergence issues",
        "Model evaluation techniques for traditional ML and for generative models",
        "Human evaluation frameworks: human-in-the-loop workflows and text generation quality assessment",
        "NLP evaluation metrics: BLEU, ROUGE, BERTScore, semantic similarity",
        "AI evaluation: model output assessment, content quality validation, bias detection, LLM-as-a-judge frameworks",
        "Configuring RAG system monitoring, including retrieval accuracy assessment",
      ],
    },
    {
      title: "Deployment and Orchestration of ML and AI Workflows",
      sources: AWS_MLA_UNIT_SOURCES["Deployment and Orchestration of ML and AI Workflows"],
      weight: 24,
      gate: "Put a model, a knowledge base, and an agent into production behind a pipeline that can retrain, re-index, redeploy, and roll back without a human editing anything by hand.",
      objectives: [
        "Selecting appropriate compute environments and deployment targets",
        "Selecting deployment orchestrators and multi-model or multi-container deployment strategies",
        "Selecting inference strategies: real-time versus batch",
        "Evaluating and selecting foundation-model deployment options",
        "Bringing models built outside AWS into SageMaker AI or Amazon Bedrock Custom Model Import",
        "Deploying and configuring agents: task scoping, tool and service integration, agent communication protocols",
        "Configuring foundation-model deployment, model hosting, and resource allocation",
        "Applying RAG system configurations: retrieval strategies and reranking",
        "Balancing on-demand against provisioned resources for performance and cost",
        "Automating compute provisioning with communication between stacks and orchestration services",
        "Building and maintaining containers for ML and AI workloads",
        "Configuring SageMaker AI endpoints inside a VPC",
        "Deploying and hosting models programmatically with the SageMaker AI SDK, the AWS CLI, and Boto3",
        "Selecting the metrics that drive auto scaling",
        "Creating and managing Amazon Bedrock knowledge bases: vector database configuration, document indexing, retrieval optimization",
        "Implementing retrieval pipelines that meet the business need",
        "Implementing agent state management",
        "Scaling GPU workloads for AI",
        "Deploying agentic workflow infrastructure",
        "Automated deployment strategies and rollback actions",
        "Configuring and troubleshooting AWS CodeBuild, CodeCommit, CodeDeploy, CodePipeline, and CodeConnections",
        "Configuring training and inference jobs",
        "Automated testing strategies inside CI/CD for ML and AI workloads",
        "Building and integrating mechanisms to retrain models",
        "Managing model versions for repeatability and audit with SageMaker Model Registry and MLflow on SageMaker AI",
        "Managing prompts with Amazon Bedrock Prompt Management",
        "Automated agent deployment pipelines and agent version management",
        "AI model testing frameworks, including prompt testing",
        "Automating foundation-model deployment with fine-tuned model versioning",
        "Pipeline orchestration for RAG updates and knowledge base refresh cycles",
      ],
    },
    {
      title: "Operating, Monitoring, and Securing ML and AI Solutions",
      sources: AWS_MLA_UNIT_SOURCES["Operating, Monitoring, and Securing ML and AI Solutions"],
      weight: 24,
      gate: "Given a deployed AI system, say what you watch, what tells you the model has drifted or an agent is failing silently, what it costs per token, and which control stops it leaking customer data.",
      objectives: [
        "Monitoring production model performance with Amazon CloudWatch generative AI observability, Amazon Bedrock Model Evaluation, and drift detection pipelines",
        "Monitoring workflows for anomalies and errors in data processing or model inference",
        "Detecting changes in data distribution that degrade model performance",
        "Monitoring production performance with A/B testing",
        "Monitoring and automating agent performance and coordination: coordination failure detection, truncated streaming, tool failures",
        "Performance monitoring specific to foundation models, such as Amazon Bedrock evaluations",
        "Selecting inference instance families for performance and cost",
        "Troubleshooting resources with Amazon CloudWatch, Amazon Bedrock AgentCore Observability, and AWS X-Ray",
        "Setting up dashboards for performance metrics",
        "Optimizing capacity for cost, performance, and reliability",
        "Optimizing costs and setting cost quotas with AWS cost management tools",
        "Cutting infrastructure cost through purchasing options",
        "Evaluating the cost of running foundation-model inference in production",
        "Monitoring agent resource consumption patterns",
        "Managing foundation-model inference cost through usage optimization",
        "AI-specific cost patterns: token usage optimization, embedding computation cost, vector database storage",
        "Securing CI/CD pipelines against code and image vulnerabilities with Amazon Inspector (code, container image and Lambda scanning); Amazon CodeGuru Security reached end of support on 2025-11-20",
        "Configuring least-privilege access to ML and AI artifacts",
        "Configuring IAM policies and roles for users and applications in ML and AI systems",
        "Monitoring, auditing, compliance, and logging with AWS CloudTrail and AWS Config",
        "Troubleshooting and debugging security issues in ML and AI systems",
        "Creating VPCs, subnets, and security groups that isolate ML and AI systems",
        "Identifying and mitigating security risks and vulnerabilities in ML and AI systems",
        "Choosing a credential type to reach foundation models: Amazon Bedrock API keys versus IAM credentials",
        "Implementing safeguards and sensitive data protection with Amazon Bedrock Guardrails",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Professional: AWS Certified Solutions Architect - Professional (SAP-C03)
//
// REQ-102 (2026-11-07): moved from SAP-C02 to SAP-C03. Sources, all read
// 2026-11-07:
//   - Exam-guide index, "Being retired. Registration for SAP-C03 opens
//     October 27, 2026. Last day to take SAP-C02 is November 16, 2026":
//     https://docs.aws.amazon.com/aws-certification/latest/examguides/aws-certification-exam-guides.html
//   - SAP-C02 -> SAP-C03 comparison, "SAP-C02 ... in use until November 16,
//     2026. The SAP-C03 exam begins November 17, 2026", plus the full list
//     of added, merged and removed skills used to plan the units below:
//     https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/sap-03-comparison.html
//   - SAP-C03 exam guide: 65 scored + 10 unscored questions, multiple choice
//     and multiple response, scaled 100-1000, minimum passing score 720
//     (SAP-C02 was 750), compensatory scoring; five domains 25/25/15/15/20:
//     https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03.html
//     (pass mark cross-checked in the PDF,
//     https://docs.aws.amazon.com/pdfs/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03.pdf)
//   - Duration 180 minutes and 75 questions -- the exam guide does not state
//     a time limit; taken from the certification page
//     (https://aws.amazon.com/certification/certified-solutions-architect-professional/?trk=public_profile_certification-title)
//     and the AWS T&C September 2026 post
//     (https://aws.amazon.com/blogs/training-and-certification/september-2026-new-offerings/).
//   - Per-domain skills: .../solutions-architect-professional-03-domain1.html
//     through -domain5.html under the same docs path.
//
// HOW THE SWITCH IS MODELLED (learner history preserved, nothing deleted):
//   - The four SAP-C02 units stay at sort_order 0-3 with retiredAt set.
//     Their objective rows -- and every learner's mastery, attempts, error
//     log and cached lessons on them -- are kept; the app stops listing
//     them once retiredAt passes. retiredAt is 2026-11-17T12:00Z, i.e.
//     after 2026-11-16 (SAP-C02's last day) has ended in every time zone,
//     so a learner sitting SAP-C02 before then keeps the C02 units.
//   - The five SAP-C03 domains are new units at sort_order 4-8 with new
//     objective rows. Mastery is NOT copied from C02 objectives onto C03
//     ones: the domains were restructured (no one-to-one map exists, per
//     the comparison page) and carried-over mastery would claim evidence
//     the learner never produced on that objective.
//   - credential_exams gets a new SAP-C03 row; the SAP-C02 row is kept,
//     marked superseded_by SAP-C03 with retirement_date 2026-11-16.
//   - Until 2026-11-17T12:00Z both sets are listed (registration for C03 is
//     already open, so a learner starting now should study C03). Exam
//     domains / readiness use the C03 units only.
//
// Removed in C03 (comparison page section 4): C02 Task 2.1's "application
// upgrade path" and "delegating to AWS", and C02 Task 4.2's "migration-tool
// security". AWS notes these may still be implicit in other skills.
// ---------------------------------------------------------------------------
const SAP_C02_RETIRED_AT = "2026-11-17T12:00:00Z";
const SAP_VERIFIED_AT = "2026-11-07T00:00:00Z";

export const AWS_SAP_TRACK: SeedTrack = {
  code: "AWSSAP",
  title: "Prep for the AWS Certified Solutions Architect - Professional (SAP-C03) Exam",
  description:
    "AWS Certified Solutions Architect - Professional (SAP-C03): architecture at organizational scale -- cloud-native and AI-integrated designs, hybrid and multi-account networks, security, compliance and governance, cost-optimized design, resilience, migration and disaster recovery, and operational excellence through automation.",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl:
    "https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03.html",
  sourceVerifiedAt: SAP_VERIFIED_AT,
  contentReviewDueAt: "2027-05-17T00:00:00Z",
  credential: {
    ...AWS_PROVIDER,
    credentialSlug: "certified-solutions-architect-professional",
    credentialName: "AWS Certified Solutions Architect - Professional",
    credentialUrl:
      "https://aws.amazon.com/certification/certified-solutions-architect-professional/",
    examCode: "SAP-C03",
    status: "active",
    effectiveDate: "2026-11-17", // GA delivery; sap-03-comparison.html
    officialObjectivesUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03.html",
    lastVendorVerifiedAt: SAP_VERIFIED_AT,
    recommendedExperience:
      "2 or more years of experience using AWS services to design and implement cloud solutions. Out of scope: in-depth operating system knowledge; AI/ML model training, fine-tuning, and data science workflows; security incident forensics and detailed threat investigation; application code development and debugging.",
    durationMinutes: 180, // certification page + T&C blog; the exam guide states no time limit
    questionFormat:
      "75 questions (65 scored, 10 unscored); multiple choice and multiple response",
    passingScorePolicy:
      "Scaled score 100-1000; minimum passing score 720; compensatory scoring, so no per-domain minimum",
    supersedes: { examCode: "SAP-C02", lastExamDate: "2026-11-16" },
  },
  units: [
    {
      title: "Design Solutions for Organizational Complexity",
      retiredAt: SAP_C02_RETIRED_AT, // SAP-C02 domain; see block comment
      weight: 26,
      gate: "Given an enterprise with many accounts, an on-premises data center, and a compliance auditor, design the network, the identity model, the account structure, and the cost visibility -- and say which requirement each piece answers.",
      objectives: [
        "Evaluating connectivity options among multiple VPCs",
        "Connectivity for on-premises, co-location, and cloud integration: AWS Direct Connect and AWS VPN",
        "Transitive routing, and the cases where it does not work the way people expect",
        "Hybrid DNS: Amazon Route 53 Resolver and on-premises DNS integration",
        "Network segmentation: subnetting, IP addressing, connectivity among VPCs",
        "Selecting AWS Regions and Availability Zones against network and latency requirements",
        "Troubleshooting traffic flows with AWS tools",
        "Using service endpoints for service integrations",
        "Network traffic monitoring",
        "Evaluating cross-account access management",
        "Integrating third-party identity providers with IAM and AWS IAM Identity Center",
        "Deploying encryption strategies for data at rest and in transit with AWS KMS and AWS Certificate Manager",
        "A strategy for centralized security event notification and auditing with CloudTrail, IAM Access Analyzer, AWS Security Hub, and Amazon Inspector",
        "Route tables, security groups, and network ACLs as organization-wide controls",
        "Designing disaster recovery to stated RTO and RPO, including AWS Elastic Disaster Recovery",
        "Disaster recovery patterns at scale: pilot light, warm standby, multi-site",
        "Architectures that recover from failure automatically",
        "Scale-up against scale-out when choosing the optimal architecture",
        "Designing an effective backup and restoration strategy",
        "Choosing an account structure for organizational requirements with AWS Organizations and AWS Control Tower",
        "A strategy for central logging and multi-account event notifications",
        "Developing a multi-account governance model",
        "Sharing AWS resources across environments",
        "Cost and usage monitoring: AWS Trusted Advisor, AWS Pricing Calculator, AWS Cost Explorer, AWS Budgets",
        "Purchasing options and their effect on cost and performance: Reserved Instances, Savings Plans, Spot Instances",
        "Rightsizing visibility with AWS Compute Optimizer and Amazon S3 Storage Lens",
        "A tagging strategy that maps costs to business units",
      ],
    },
    {
      title: "Design for New Solutions",
      retiredAt: SAP_C02_RETIRED_AT, // SAP-C02 domain; see block comment
      weight: 29,
      gate: "Take a green-field requirement with a deployment need, a continuity need, a security need, a reliability target, a performance objective, and a budget -- and design one architecture that satisfies all six without pretending they do not conflict. Heaviest domain on the exam.",
      objectives: [
        "Infrastructure as code and change management with AWS CloudFormation",
        "Continuous integration and delivery in a solution design",
        "Configuration management with AWS Systems Manager",
        "Selecting services for deployment strategies and appropriate rollback mechanisms",
        "Determining an application or upgrade path for new services and features",
        "Adopting managed services to reduce provisioning and patching overhead",
        "Configuring disaster recovery solutions, including data and database replication",
        "Performing disaster recovery testing rather than assuming it works",
        "Architecting automated, cost-effective backup across Availability Zones and Regions",
        "Designing for application and infrastructure availability through a disruption",
        "Centralized monitoring that recovers proactively from system failures",
        "Specifying IAM users and roles that hold to least privilege",
        "Specifying inbound and outbound network flows with security group and network ACL rules",
        "Attack mitigation for large-scale web applications: AWS Shield, AWS WAF, Amazon GuardDuty, AWS Security Hub",
        "Developing encryption strategies for data at rest and in transit",
        "Specifying service endpoints for service integrations",
        "Credential management services",
        "Patch management that keeps the solution compliant with organizational standards",
        "Designing highly available application environments from business requirements",
        "Advanced techniques for designing for failure and seamless recoverability",
        "Implementing loosely coupled dependencies with Amazon SNS, Amazon SQS, and AWS Step Functions",
        "Operating and maintaining high availability: application failover and database failover",
        "Auto scaling policies and events",
        "DNS routing policies: latency-based, geolocation, and simple routing",
        "Multi-AZ and multi-Region architectures",
        "Service quotas and limits as a design constraint",
        "Designing large-scale architectures for a variety of access patterns",
        "Designing an elastic architecture from business objectives",
        "Caching, buffering, and replicas applied to performance objectives",
        "A methodology for selecting purpose-built services",
        "Instance families, storage options, and purpose-built databases chosen for performance",
        "Designing a rightsizing strategy",
        "Identifying appropriate pricing models: Reserved Instances and AWS Savings Plans",
        "Storage tiering and data transfer modeling to reduce cost",
        "Implementing controls for expenditure and usage awareness",
      ],
    },
    {
      title: "Continuous Improvement for Existing Solutions",
      retiredAt: SAP_C02_RETIRED_AT, // SAP-C02 domain; see block comment
      weight: 25,
      gate: "Given an architecture already in production, find what is weakest across operations, security, performance, reliability, and cost -- and order the fixes by what the business would feel first.",
      objectives: [
        "Determining the most appropriate logging and monitoring strategy with Amazon CloudWatch",
        "Alerting and automatic remediation strategies",
        "Evaluating current deployment processes for improvement opportunities",
        "Prioritizing opportunities for automation within a solution stack",
        "Recommending AWS solutions for configuration management automation, such as AWS Systems Manager",
        "Deployment strategies already in place: blue/green, all-at-once, rolling",
        "Engineering failure scenarios to exercise recovery actions",
        "Evaluating secure management of secrets and credentials with Systems Manager and AWS Secrets Manager",
        "Auditing an environment for least privilege access",
        "Reviewing implemented solutions for security at every layer",
        "Reviewing comprehensive traceability of users and services",
        "Automated monitoring and remediation with AWS Config rules",
        "Prioritizing automated responses to detected vulnerabilities",
        "Designing and implementing patch and update processes",
        "Designing and implementing a backup process against data retention, sensitivity, and regulatory requirements",
        "Translating business requirements into measurable metrics, SLAs, and KPIs",
        "High-performing systems architecture: auto scaling, instance fleets, placement groups",
        "Global and edge offerings: AWS Global Accelerator, Amazon CloudFront, edge computing services",
        "Identifying and examining performance bottlenecks",
        "Testing potential remediation solutions and making a recommendation",
        "Proposing adoption of new technologies and managed services",
        "Assessing solutions and rightsizing against requirements",
        "Understanding application growth and usage trends",
        "Evaluating an existing architecture for the parts that are not reliable enough",
        "Remediating single points of failure",
        "Enabling data replication, self-healing, and elastic features and services",
        "Analyzing usage reports to find underutilized and overutilized resources",
        "Using AWS solutions to identify unused resources",
        "Designing billing alarms based on expected usage patterns",
        "Investigating AWS Cost and Usage Reports at a granular level",
        "Using tagging for cost allocation and reporting",
      ],
    },
    {
      title: "Accelerate Workload Migration and Modernization",
      retiredAt: SAP_C02_RETIRED_AT, // SAP-C02 domain; see block comment
      weight: 20,
      gate: "Given a portfolio of legacy applications, classify each against the 7Rs, pick the transfer mechanism and target platform for the ones that move, and name the two worth modernizing rather than lifting.",
      objectives: [
        "Completing an application migration assessment with AWS Migration Hub",
        "Portfolio assessment and asset planning",
        "Evaluating applications against the seven common migration strategies (7Rs)",
        "Evaluating total cost of ownership",
        "Prioritizing and sequencing workloads through wave planning",
        "Data migration options: AWS DataSync, AWS Transfer Family, AWS Snow Family, Amazon S3 Transfer Acceleration",
        "Application migration tools: AWS Application Discovery Service and AWS Application Migration Service",
        "Database migration tools: AWS DMS and AWS SCT",
        "Networking and DNS during a migration: AWS Direct Connect, AWS Site-to-Site VPN, Amazon Route 53",
        "Identity services during a migration: AWS IAM Identity Center and AWS Directory Service",
        "Applying appropriate security methods to the migration tools themselves",
        "Selecting a governance model with AWS Control Tower and AWS Organizations",
        "Selecting the compute platform for a migrated workload: Amazon EC2, AWS Elastic Beanstalk",
        "Selecting a container hosting platform: Amazon ECS, Amazon EKS, AWS Fargate, Amazon ECR",
        "Selecting storage: Amazon EBS, Amazon EFS, Amazon FSx, Amazon S3, Storage Gateway Volume Gateway",
        "Selecting a database platform: Amazon RDS, Amazon DynamoDB, Amazon OpenSearch Service, or self-managed on EC2",
        "Identifying opportunities to decouple application components",
        "Identifying opportunities for serverless solutions with AWS Lambda",
        "Identifying opportunities for purpose-built databases: DynamoDB, Amazon Aurora Serverless, Amazon ElastiCache",
        "Selecting the appropriate application integration service: Amazon SQS, Amazon SNS, Amazon EventBridge, AWS Step Functions",
      ],
    },
    // ----- SAP-C03 domains (sort_order 4-8). Objectives paraphrase the
    // skills in each domain page of the SAP-C03 guide, one idea apiece.
    {
      // https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03-domain1.html
      title: "Architecture Design and Implementation Built for the Cloud",
      weight: 25,
      gate: "Given a product requirement, design the cloud-native shape end to end -- event flow, compute and scaling model, network, data layer, and where an AI service or agent fits -- and defend each choice against the requirement it answers.",
      objectives: [
        "Event-driven architectures and their messaging guarantees: idempotency, ordering, and delivery with EventBridge, SQS FIFO and standard queues, SNS, and Kinesis partition keys",
        "Stateless application design with state externalized to DynamoDB, Amazon S3, or ElastiCache",
        "Serverless data processing pipelines: Kinesis Data Streams, AWS Glue, Amazon Athena, AWS Lambda",
        "Durable multi-step workflows with AWS Step Functions and durable Lambda functions",
        "Cross-account and cross-Region event routing with event buses and event forwarding",
        "Container orchestration for microservices on Amazon EKS, Amazon ECS, and AWS Fargate",
        "Service mesh communication and observability with Amazon VPC Lattice and ECS Service Connect",
        "Container image management in Amazon ECR: security scanning and lifecycle policies",
        "Auto scaling for serverless and container workloads: Lambda concurrency, Horizontal Pod Autoscaler, Cluster Autoscaler, ECS service scaling, Application Auto Scaling",
        "Ingress patterns: Application Load Balancer, Network Load Balancer, AWS Load Balancer Controller, Amazon API Gateway",
        "Edge architectures for latency: CloudFront Functions and Lambda@Edge",
        "Real-time designs with WebSocket and publish-subscribe patterns, including API Gateway WebSocket APIs",
        "Multi-tenant architectures and tenant isolation: siloed versus pooled resources, Cognito tenant context, row-level security, per-tenant encryption",
        "Generative AI integration with Amazon Bedrock, including multi-account deployment patterns",
        "AI agent architectures that call tools: Amazon Bedrock AgentCore and Bedrock Knowledge Bases",
        "ML inference architectures on Amazon SageMaker AI endpoints",
        "Retrieval Augmented Generation architectures: ingestion and retrieval strategies over vector stores",
        "Redundant hybrid connectivity with failover: AWS Direct Connect, AWS VPN, AWS Transit Gateway",
        "Data synchronization for hybrid workloads: AWS DataSync, AWS Storage Gateway, AWS Transfer Family",
        "Modernizing legacy systems through integration and data transformation: API Gateway, Lambda, Amazon MQ",
        "Hybrid DNS: Route 53 Resolver endpoints, private hosted zones, split-horizon DNS, conditional forwarding",
        "Hybrid compute: EKS Anywhere, ECS Anywhere, AWS Outposts, AWS Local Zones",
        "Multi-VPC and multi-account connectivity: VPC peering and AWS PrivateLink",
        "VPC design: subnet strategy, IP address management with VPC IPAM, network segmentation",
        "Network security architecture: AWS Network Firewall, AWS WAF, Gateway Load Balancer, security groups, network ACLs, VPC Flow Logs",
        "IPv6 adoption and dual-stack migration strategy",
        "Global traffic routing for multi-Region applications: Route 53 routing policies and AWS Global Accelerator",
        "Data lake and lakehouse design: Amazon S3, AWS Lake Formation, Redshift Spectrum, Apache Iceberg",
        "Real-time and batch analytics pipelines: Amazon EMR, Amazon Redshift, Amazon MSK, Amazon AppFlow",
        "Choosing a database by access pattern, consistency, and scale: RDS, Aurora, DynamoDB, Redshift",
        "Database scaling for high availability: read replicas, Aurora Global Database, DynamoDB global tables, RDS Multi-AZ",
        "Storage architecture by access pattern and performance: Amazon S3, EBS, EFS, FSx",
        "Caching to meet performance targets: ElastiCache and DynamoDB Accelerator (DAX)",
        "Data cataloging and cross-account data sharing: Glue Data Catalog, Lake Formation, AWS Clean Rooms",
      ],
    },
    {
      // https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03-domain2.html
      title: "Security, Compliance, and Governance",
      weight: 25,
      gate: "Given a regulated, multi-account organization that is adding generative AI, design the identity model, encryption, guardrails, logging, and compliance evidence -- and say which control stops which failure.",
      objectives: [
        "Identity federation with standard protocols: IAM Identity Center, SAML 2.0, OpenID Connect, SCIM",
        "Application authentication and authorization: Cognito user pools and identity pools, OAuth 2.0, EKS Pod Identity",
        "Least-privilege access: cross-account roles, temporary credentials, permissions boundaries, external IDs, session policies, ABAC",
        "Data perimeter controls and external-access validation: IAM Access Analyzer, VPC endpoint policies, AWS Verified Access",
        "Workload identity for hybrid and multi-cloud environments with IAM Roles Anywhere",
        "Encryption at rest with customer managed KMS keys and automatic key rotation",
        "Encryption in transit and certificate management: TLS 1.3, AWS Certificate Manager, AWS Private CA",
        "Dedicated hardware security modules with AWS CloudHSM for regulatory requirements",
        "Post-quantum cryptography strategy: AWS KMS with ML-DSA and ML-KEM",
        "Organization structure, guardrails, landing zones, and automated account provisioning: AWS Organizations, OUs, Control Tower, Account Factory",
        "Centralized logging and configuration management, including AI model invocation logs: CloudTrail organization trails, Config aggregation, GuardDuty, Security Lake, Security Hub, CloudWatch Logs",
        "Cross-account resource sharing with AWS RAM and Transit Gateway",
        "Policy enforcement with service control policies (SCPs) and resource control policies (RCPs)",
        "Automated compliance monitoring with AWS Config rules and Security Hub CSPM",
        "Automated vulnerability scanning and patching: Amazon Inspector and Systems Manager Patch Manager",
        "Meeting data protection requirements through encryption, access control, and audit logging",
        "Regulatory requirements such as data sovereignty controls",
        "Audit trail management for regulated workloads, including AI services",
        "Data residency controls: Region-specific deployments and transfer restrictions",
        "Compliance evidence collection and reporting with AWS Artifact",
        "Risk assessment for cloud architectures: threat modeling and mitigation strategies",
        "Content filtering and compliance controls for generative AI with Amazon Bedrock Guardrails",
        "Access control for generative and agentic AI applications with Bedrock AgentCore Identity",
        "Human oversight of AI operations: approval workflows built with AWS Step Functions",
      ],
    },
    {
      // https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03-domain3.html
      title: "Cost-Optimized Architecture Design",
      weight: 15,
      gate: "Given a running architecture and its bill, find where the money goes -- compute, data transfer, storage, observability, AI tokens -- and redesign it cheaper without breaking a stated performance or resilience requirement.",
      objectives: [
        "Choosing purchase options by usage pattern: On-Demand, Reserved Instances, Savings Plans, Spot, and provisioned capacity",
        "Cost-optimized compute choices: Graviton instances, Step Functions Standard versus Express, Lambda",
        "Rightsizing and scaling from performance metrics: Compute Optimizer, scheduled scaling, target tracking, Fargate Spot",
        "Cost optimization for AI/ML workloads: service tier selection, batching, and caching in Bedrock and SageMaker AI",
        "Content delivery design for cost: CloudFront origins, caching, Origin Shield, and failover",
        "Reducing data transfer cost: private connectivity, VPC endpoints versus NAT gateways, AZ-aware and Region-aware traffic",
        "Cost-aware multi-Region replication: S3 Cross-Region Replication and DynamoDB global tables",
        "Cost-effective network design: Transit Gateway data processing charges versus PrivateLink pricing",
        "Data transfer cost for AI/ML, including cross-Region inference routing",
        "Tagging strategy for cost allocation by business unit, project, and environment",
        "Cost reporting and analytics from detailed billing data: Cost Explorer and Cost and Usage Reports",
        "Policy-based tag enforcement: SCPs, Config rules, and tag policies",
        "Chargeback and showback: cost categories, split cost allocation, Bedrock token usage monitoring",
        "Cost monitoring and alerting: AWS Budgets thresholds and Cost Anomaly Detection",
        "Storage tiering and lifecycle policies: S3 Intelligent-Tiering, S3 Lifecycle, Glacier storage classes, EFS lifecycle",
        "Block storage cost: EBS gp3 versus gp2 versus Provisioned IOPS, and provisioning the IOPS actually needed",
        "Database cost: DynamoDB capacity modes, RDS reserved instances, Aurora Serverless and I/O-Optimized, Database Savings Plans",
        "Cost-optimized backup and disaster recovery retention with AWS Backup and Data Lifecycle Manager",
        "Cost-effective observability: log filtering, metric aggregation, and retention tuning",
      ],
    },
    {
      // https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03-domain4.html
      title: "Resilience, Migration, and Business Continuity",
      weight: 15,
      gate: "Given a legacy portfolio and a stated RTO/RPO, plan the migration waves and strategy per workload, then design and prove the disaster recovery and ransomware protection -- with a test, not an assumption.",
      objectives: [
        "Discovery and portfolio assessment: mapping dependencies and planning migration waves",
        "Rehosting with AWS Transform MGN (formerly AWS Application Migration Service) and AWS Transform",
        "Database and data migration strategy: AWS Database Migration Service and AWS DataSync",
        "Replatforming onto managed services to cut operational overhead: RDS, Aurora, ECS, Lambda",
        "Refactoring: microservices decomposition, serverless adoption, and the strangler fig pattern",
        "Modernizing legacy workloads: mainframes, applications, and databases",
        "Designing disaster recovery to business requirements: RTO, RPO, and cost",
        "Continuous replication for fast recovery with AWS Elastic Disaster Recovery",
        "Disaster recovery assessment and recovery procedures: AWS Resilience Hub and Systems Manager runbooks",
        "Multi-Region disaster recovery with replication and failover: Route 53 health checks, Global Accelerator, Application Recovery Controller",
        "Disaster recovery testing and validation with AWS Resilience Hub",
        "Multi-cluster container strategies for high availability and DR on EKS and ECS",
        "Centralized backup governance and cross-account backup policies with AWS Backup",
        "Failover testing and measuring recovery time: AWS Fault Injection Service and Route 53 health checks",
        "Resilient architecture: redundancy, fault tolerance, and self-healing",
        "Protecting data from ransomware and accidental deletion: S3 Object Lock, EBS snapshot lock, Backup Vault Lock",
        "Chaos engineering with controlled failure: Fault Injection Service experiment templates and steady-state hypotheses",
      ],
    },
    {
      // https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03-domain5.html
      title: "Operational Excellence and Automation",
      weight: 20,
      gate: "Given a multi-account estate deployed by hand, design the IaC, pipelines, observability, and automated remediation that let it be changed, watched, and repaired safely -- including how an AI workload is evaluated and monitored.",
      objectives: [
        "Infrastructure as code, declarative and imperative: AWS CloudFormation and AWS CDK",
        "Policy as code for proactive validation, enforcement, and drift remediation: CloudFormation Hooks, CDK aspects, Config rules, SCPs",
        "Secrets in infrastructure code: AWS Secrets Manager and Systems Manager Parameter Store",
        "Multi-account and multi-Region infrastructure deployment with CloudFormation StackSets",
        "CI/CD orchestration: CodePipeline, CodeBuild, CodeDeploy, CodeCommit",
        "Pipeline security: vulnerability scanning and artifact signing with Amazon Inspector and ECR image scanning",
        "Multi-account and multi-Region pipelines: role delegation and artifact promotion",
        "Evaluating AI/ML applications and validating their outputs with Amazon Bedrock Evaluations",
        "Deployment strategies with rollback: blue/green, canary, rolling",
        "Observability through metrics, logs, and distributed tracing: CloudWatch, X-Ray, AWS Distro for OpenTelemetry",
        "Monitoring containerized applications with Container Insights on ECS and EKS",
        "Multi-account log aggregation: CloudWatch Logs subscriptions and archival S3 storage tiers",
        "Alerting: CloudWatch alarms, Amazon SNS, Systems Manager",
        "Monitoring AI/ML workloads: model performance, agent performance, inference latency, and drift",
        "User experience monitoring: CloudWatch Synthetics and CloudWatch RUM",
        "Service-level objectives with measurable indicators and alerts: CloudWatch Application Signals",
        "Health monitoring, capacity planning, and operational response: CloudWatch alarms, EventBridge, Systems Manager, Service Quotas",
        "Controlled remediation with safety limits: circuit breakers, rate limits, bulkheads, retries with exponential backoff",
        "Auto scaling policies: target tracking, scheduled, and predictive scaling",
        "Automated failure recovery: health checks and replacement for Auto Scaling, ECS tasks, and Lambda retries",
        "Automated runbooks and incident response for patching, remediation, and scaling",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Professional: AWS Certified DevOps Engineer - Professional (DOP-C02)
// 180 minutes, 75 questions (65 scored, 10 unscored), scaled 100-1000,
// pass 750. Domains: 22% / 17% / 15% / 15% / 14% / 17%.
//
// No version change announced. The only retirement on the certification page
// is the Korean-language delivery of the exam, ending 2026-12-31; the exam
// itself continues.
// ---------------------------------------------------------------------------
export const AWS_DOP_TRACK: SeedTrack = {
  code: "AWSDOP",
  title: "Prep for the AWS Certified DevOps Engineer - Professional (DOP-C02) Exam",
  description:
    "AWS Certified DevOps Engineer - Professional (DOP-C02): automating the whole delivery path -- CI/CD pipelines and artifacts, infrastructure as code across many accounts, resilient and scalable systems, monitoring and logging, incident response, and security controls applied by machine rather than by hand.",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl:
    "https://docs.aws.amazon.com/aws-certification/latest/devops-engineer-professional-02/devops-engineer-professional-02.html",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...AWS_PROVIDER,
    credentialSlug: "certified-devops-engineer-professional",
    credentialName: "AWS Certified DevOps Engineer - Professional",
    credentialUrl:
      "https://aws.amazon.com/certification/certified-devops-engineer-professional/",
    examCode: "DOP-C02",
    status: "active",
    officialObjectivesUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/devops-engineer-professional-02/devops-engineer-professional-02.html",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "2 or more years provisioning, operating, and managing AWS environments, plus experience with the software development lifecycle and programming or scripting. Advanced networking, deep security advisory work, database performance tuning, and full-stack application development are out of scope.",
    durationMinutes: 180,
    questionFormat:
      "75 questions (65 scored, 10 unscored); multiple choice and multiple response",
    passingScorePolicy:
      "Scaled score 100-1000; minimum passing score 750; compensatory scoring, so no per-domain minimum",
  },
  units: [
    {
      title: "SDLC Automation",
      weight: 22,
      gate: "Build a pipeline that takes a commit to production on its own -- builds, tests at the right stages, versioned artifacts, a deployment strategy that can roll back -- and explain what each stage would have caught. Largest domain on the exam.",
      objectives: [
        "Software development lifecycle concepts, phases, and models",
        "Pipeline deployment patterns for single-account and multi-account environments",
        "Configuring code, image, and artifact repositories",
        "Using version control to integrate pipelines with application environments",
        "Setting up build processes with AWS CodeBuild",
        "Managing build and deployment secrets with AWS Secrets Manager and Systems Manager Parameter Store",
        "Determining a deployment strategy with AWS CodeDeploy",
        "Types of tests -- unit, integration, acceptance, user interface, security scans -- and where each belongs in a pipeline",
        "Running builds and tests on pull requests and code merges",
        "Running load and stress tests, performance benchmarking, and application testing at scale",
        "Measuring application health from application exit codes",
        "Automating unit tests and code coverage",
        "Invoking AWS services from inside a pipeline for testing",
        "Artifact use cases, secure management, and lifecycle considerations",
        "Creating and configuring artifact repositories: AWS CodeArtifact, Amazon S3, Amazon ECR",
        "Configuring build tools to generate artifacts with CodeBuild and AWS Lambda",
        "Automating EC2 instance and container image builds with EC2 Image Builder",
        "Deployment methodologies per platform: Amazon EC2, Amazon ECS, Amazon EKS, AWS Lambda",
        "Mutable deployment patterns against immutable ones",
        "Application storage patterns: Amazon EFS, Amazon S3, Amazon EBS",
        "Configuring security permissions for access to artifact repositories",
        "Configuring deployment agents, including the CodeDeploy agent",
        "Using blue/green and canary deployment methods",
        "Troubleshooting deployment issues",
      ],
    },
    {
      title: "Configuration Management and IaC",
      weight: 17,
      gate: "Stand up a new account that is governed from birth -- templates, guardrails, patching, and drift handling -- without a person clicking through the console.",
      objectives: [
        "Infrastructure as code options and tools for AWS",
        "Composing and deploying IaC templates: AWS SAM, AWS CloudFormation, the AWS CDK",
        "Applying CloudFormation StackSets across multiple accounts and Regions",
        "Change management processes for IaC-based platforms",
        "Determining the right configuration management service: AWS Systems Manager (including AppConfig and State Manager) and AWS Config -- AWS OpsWorks reached end of life on 2024-05-26",
        "Building infrastructure patterns, governance controls, and security standards into reusable templates with AWS Service Catalog, CloudFormation modules, and the CDK",
        "AWS account structures and the practices around them",
        "Standardizing and automating account provisioning and configuration",
        "Creating, consolidating, and centrally managing accounts with AWS Organizations and AWS Control Tower",
        "IAM for multi-account and complex organizations: service control policies and role assumption",
        "Governance and security controls at scale: AWS Config, Control Tower, Security Hub, Amazon Detective, Amazon GuardDuty, Service Catalog",
        "Automating system inventory, configuration, and patch management with Systems Manager and AWS Config",
        "Developing Lambda automations for complex scenarios with the AWS SDKs and AWS Step Functions",
        "Driving instance and application configuration to a desired state with Systems Manager State Manager and AppConfig",
        "Maintaining software compliance with Systems Manager",
      ],
    },
    {
      title: "Resilient Cloud Solutions",
      weight: 15,
      gate: "Given a resiliency requirement expressed in business terms, build the multi-AZ or multi-Region answer, then test the failover rather than assuming it works.",
      objectives: [
        "Multi-AZ and multi-Region deployments at the compute layer and the data layer",
        "Translating business requirements into technical resiliency needs, including SLAs",
        "Replication and failover methods for stateful services",
        "Identifying and remediating single points of failure in existing workloads",
        "Enabling cross-Region capabilities where they exist: Amazon DynamoDB, Amazon RDS, Amazon Route 53, Amazon S3, Amazon CloudFront",
        "Configuring load balancing across Availability Zones",
        "Configuring applications for multiple Availability Zones and Regions while minimizing downtime",
        "Choosing the metrics that should drive scaling",
        "Identifying and remediating scaling issues",
        "Selecting auto scaling, load balancing, and caching solutions for the workload",
        "Deploying container-based applications on Amazon ECS and Amazon EKS",
        "Configuring serverless applications: Amazon API Gateway, AWS Lambda, AWS Fargate",
        "Deploying workloads across Regions for global scalability",
        "Disaster recovery concepts and strategies that meet RTO and RPO: pilot light, warm standby",
        "Testing failover of Multi-AZ and multi-Region workloads",
        "Cross-Region backup and recovery with AWS Backup, Amazon S3, and Systems Manager",
        "Configuring a load balancer to recover from backend failure",
      ],
    },
    {
      title: "Monitoring and Logging",
      weight: 15,
      gate: "Given a distributed system, decide what to collect, where it is stored and encrypted, which alarm fires, and what that alarm does on its own without waking anyone.",
      objectives: [
        "Amazon CloudWatch metrics: namespaces, metrics, dimensions, resolution",
        "Securely storing and managing logs",
        "Encryption options for logs and metrics at rest and in transit, including AWS KMS",
        "IAM roles and permissions that allow log collection",
        "Creating CloudWatch metrics from log events with metric filters",
        "Creating CloudWatch metric streams to Amazon S3 or Amazon Data Firehose",
        "Collecting custom metrics with the CloudWatch agent",
        "Managing log storage lifecycles: S3 lifecycle policies and CloudWatch log group retention",
        "Processing log data with CloudWatch Logs subscriptions into Amazon Kinesis, Lambda, or Amazon OpenSearch Service",
        "Searching log data with filter and pattern syntax and CloudWatch Logs Insights",
        "Anomaly detection alarms",
        "Common metrics and logs that signal trouble: EC2 CPU utilization, RDS queue length, Application Load Balancer 5xx errors",
        "Amazon Inspector assessment templates and AWS Config rules as monitoring inputs",
        "AWS CloudTrail log events",
        "Building CloudWatch dashboards and Amazon QuickSight visualizations",
        "Associating CloudWatch alarms with standard and custom metrics",
        "Configuring AWS X-Ray for containers, Amazon API Gateway, and Lambda",
        "Analyzing real-time log streams with Amazon Kinesis Data Streams",
        "Analyzing logs with Amazon Athena and CloudWatch Logs Insights",
        "Event-driven, asynchronous monitoring patterns: S3 Event Notifications and EventBridge into Amazon SNS or Lambda",
        "Auto scaling capabilities across services: EC2 Auto Scaling groups, RDS storage auto scaling, DynamoDB, ECS capacity providers, EKS autoscalers",
        "Alert notification and action capabilities: alarms to Amazon SNS or Lambda, EC2 automatic recovery",
        "Configuring EventBridge to notify on a particular event pattern",
        "Installing and configuring agents on EC2 instances: the SSM Agent and the CloudWatch agent",
        "Configuring AWS Config rules to remediate issues",
        "Configuring health checks in Application Load Balancer target groups and Amazon Route 53",
      ],
    },
    {
      title: "Incident and Event Response",
      weight: 14,
      gate: "Given an event -- a health notification, a config drift, a failed deployment -- wire the response that handles it automatically, and trace a failure that got through back to its root cause.",
      objectives: [
        "AWS services that generate, capture, and process events: AWS Health, Amazon EventBridge, AWS CloudTrail",
        "Event-driven architectures: fan-out, event streaming, queuing",
        "Integrating AWS event sources into a response workflow",
        "Building event processing workflows with Amazon SQS, Amazon Kinesis, Amazon SNS, AWS Lambda, and AWS Step Functions",
        "Fleet management services: AWS Systems Manager and AWS Auto Scaling",
        "Applying configuration changes to systems",
        "Modifying infrastructure configurations in response to events",
        "Remediating a non-desired system state",
        "Root cause analysis with AWS metrics and logging services, including Amazon CloudWatch and AWS X-Ray",
        "Service health services: AWS Health, CloudWatch, Systems Manager OpsCenter",
        "Analyzing failed deployments in AWS CodePipeline, CodeBuild, CodeDeploy, CloudFormation, and CloudWatch synthetic monitoring",
        "Analyzing incidents in failed processes: auto scaling, Amazon ECS, Amazon EKS",
      ],
    },
    {
      title: "Security and Compliance",
      weight: 17,
      gate: "Enforce identity, data protection, and auditing across many accounts by automation -- then show the log and the finding that would surface a violation the day it happens.",
      objectives: [
        "IAM entities for human and machine access: users, groups, roles, identity providers, identity-based policies, resource-based policies, session policies",
        "Identity federation with IAM identity providers and AWS IAM Identity Center",
        "Delegating permission management with IAM permissions boundaries",
        "Service control policies in AWS Organizations",
        "Designing policies that enforce least privilege access",
        "Implementing role-based and attribute-based access control patterns",
        "Automating credential rotation for machine identities with AWS Secrets Manager",
        "Managing access with MFA, AWS STS, and IAM profiles",
        "Network security components: security groups, network ACLs, routing, AWS Network Firewall, AWS WAF, AWS Shield",
        "Certificates and public key infrastructure",
        "Data management: classification, encryption, key management, access controls",
        "Automating security controls across multi-account and multi-Region environments with AWS Security Hub, AWS Organizations, AWS Control Tower, and Systems Manager",
        "Combining security controls into defense in depth",
        "Automating discovery of sensitive data at scale with Amazon Macie",
        "Encrypting data in transit and at rest with AWS KMS, AWS CloudHSM, and AWS Certificate Manager",
        "Security auditing services and features: AWS CloudTrail, AWS Config, VPC Flow Logs, CloudFormation drift detection",
        "Services that identify vulnerabilities and security events: Amazon GuardDuty, Amazon Inspector, IAM Access Analyzer, AWS Config",
        "Common cloud security threats: insecure web traffic, exposed AWS access keys, S3 buckets left public or unencrypted",
        "Configuring alerting on unexpected or anomalous security events",
        "Configuring service and application logging, then analyzing logs, metrics, and security findings",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Specialty: AWS Certified Security - Specialty (SCS-C03)
// 170 minutes, 65 questions (50 scored, 15 unscored), scaled 100-1000,
// pass 750. Domains: 16% / 14% / 18% / 20% / 18% / 14%.
//
// Note the exam code: this is SCS-C03, not SCS-C02. Older material still
// refers to SCS-C02, which is superseded. The guide includes an appendix
// comparing the two versions.
//
// One of the AWS exams that uses ordering and matching question types on top
// of multiple choice and multiple response.
// ---------------------------------------------------------------------------
export const AWS_SCS_TRACK: SeedTrack = {
  code: "AWSSCS",
  title: "Prep for the AWS Certified Security - Specialty (SCS-C03) Exam",
  description:
    "AWS Certified Security - Specialty (SCS-C03): securing AWS at depth -- detection and logging pipelines, incident response and forensics, infrastructure and network controls, identity and authorization at scale, data protection and key management, and multi-account governance.",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl:
    "https://docs.aws.amazon.com/aws-certification/latest/security-specialty-03/security-specialty-03.html",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...AWS_PROVIDER,
    credentialSlug: "certified-security-specialty",
    credentialName: "AWS Certified Security - Specialty",
    credentialUrl: "https://aws.amazon.com/certification/certified-security-specialty/",
    examCode: "SCS-C03",
    status: "active",
    officialObjectivesUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/security-specialty-03/security-specialty-03.html",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "The equivalent of 3-5 years securing cloud solutions, including identity at scale, multi-account governance, supply chain risk, vulnerability management, layer 3-7 firewall rules, incident root cause analysis, responding to audits, and encryption at rest and in transit. Designing cryptographic algorithms, packet-level traffic analysis, architecting whole cloud deployments, end-user compute, and ML training are out of scope.",
    durationMinutes: 170,
    questionFormat:
      "65 questions (50 scored, 15 unscored); multiple choice, multiple response, ordering, and matching",
    passingScorePolicy:
      "Scaled score 100-1000; minimum passing score 750; compensatory scoring, so no per-domain minimum",
  },
  units: [
    {
      title: "Detection",
      weight: 16,
      gate: "Given an account or organization, design what gets logged, where it lands, and what fires an alert -- then explain why a missing log is itself a finding, and fix it.",
      objectives: [
        "Analyzing workloads to determine what actually needs monitoring",
        "Designing workload monitoring strategies, including resource health checks",
        "Aggregating security and monitoring events",
        "Metrics, alerts, and dashboards that surface anomalies: Amazon GuardDuty, Amazon Security Lake, AWS Security Hub, Amazon Macie",
        "Automating regular assessments and investigations with AWS Config conformance packs, Security Hub, and Systems Manager State Manager",
        "Identifying log sources and storage against requirements",
        "Configuring logging for AWS services: an organization-wide CloudTrail trail, a dedicated CloudWatch logging account, the CloudWatch Logs agent",
        "Log storage and security data lakes with Amazon Security Lake, and integration with third-party security tools",
        "Analyzing logs with CloudWatch Logs Insights, Amazon Athena, and Security Hub findings",
        "Normalizing, parsing, and correlating logs with Amazon OpenSearch Service, AWS Lambda, and Amazon Managed Grafana",
        "Choosing network log sources for the threat: VPC flow logs, transit gateway flow logs, Amazon Route 53 Resolver logs",
        "Analyzing resource functionality, permissions, and configuration when logs are missing: Lambda, Amazon API Gateway, CloudFront",
        "Remediating misconfigured logging, including CloudWatch agent configuration",
      ],
    },
    {
      title: "Incident Response",
      weight: 14,
      gate: "Run an incident end to end: preserve the evidence, scope the blast radius from findings, contain and eradicate, recover, and name the root cause -- with the automation that would do most of it next time.",
      objectives: [
        "Designing response plans and runbooks, including with Systems Manager OpsCenter",
        "Preparing services for incidents: provisioning access ahead of time, deploying security tools, minimizing blast radius, configuring AWS Shield Advanced",
        "Testing and validating an incident response plan with AWS Fault Injection Service and AWS Resilience Hub",
        "Automating remediation with Systems Manager, AWS Step Functions, Lambda, Automated Forensics Orchestrator for Amazon EC2, and Amazon Application Recovery Controller",
        "Capturing and storing system and application logs as forensic artifacts",
        "Searching and correlating logs for security events across applications and AWS services",
        "Validating findings from AWS security services to assess scope and impact",
        "Containing and eradicating threats, then recovering: network containment controls and restoring backups",
        "Conducting root cause analysis, including with Amazon Detective",
      ],
    },
    {
      title: "Infrastructure Security",
      weight: 18,
      gate: "Harden the edge, the compute, and the network path for one application -- and for each control, name the attack it stops and how you would prove it is working.",
      objectives: [
        "Defining and selecting edge security strategies for the anticipated threats",
        "Implementing network edge protection: AWS WAF, CloudFront headers, Shield Advanced, Amazon S3 CORS, AWS IoT policies, defenses for the OWASP Top 10",
        "Edge controls and rules by geography, geolocation, rate limiting, and client fingerprinting",
        "Integrating AWS edge services with third-party services, including OCSF-format ingestion and third-party WAF rules",
        "Designing hardened EC2 AMIs and container images with Systems Manager and EC2 Image Builder",
        "Applying instance profiles, service roles, and execution roles to authorize compute workloads",
        "Scanning compute for known vulnerabilities: Amazon Inspector for container images and Lambda, GuardDuty runtime monitoring",
        "Deploying patches across compute with Systems Manager Patch Manager and continuous validation",
        "Configuring secure administrative access: Systems Manager Session Manager and EC2 Instance Connect",
        "Finding and remediating vulnerabilities inside the pipeline with Amazon Q Developer and Amazon Inspector code scanning (Amazon CodeGuru Security, named in older material, reached end of support on 2025-11-20)",
        "Protections and guardrails for generative AI applications, including the OWASP Top 10 for LLM Applications",
        "Designing and troubleshooting network controls that permit or prevent traffic: security groups, network ACLs, AWS Network Firewall",
        "Secure connectivity between hybrid and multi-cloud networks: AWS Site-to-Site VPN, AWS Direct Connect, MACsec",
        "Security requirements for communication between hybrid environments and AWS, including AWS Verified Access",
        "Network segmentation from security requirements: north/south and east/west protection, isolated subnets",
        "Identifying unnecessary network access with AWS Verified Access, Network Access Analyzer, and Amazon Inspector network reachability findings",
      ],
    },
    {
      title: "Identity and Access Management",
      weight: 20,
      gate: "Given an access that should not have worked, find the policy that allowed it -- identity, resource, boundary, session, or trust -- and close it without breaking what should still work. Heaviest domain on the exam.",
      objectives: [
        "Designing identity solutions for human, application, and system authentication: AWS IAM Identity Center, Amazon Cognito, MFA, external identity provider integration",
        "Configuring mechanisms that issue temporary credentials: AWS STS and Amazon S3 presigned URLs",
        "Troubleshooting authentication with CloudTrail, Amazon Cognito, IAM Identity Center permission sets, and AWS Directory Service",
        "Designing authorization controls: Amazon Verified Permissions, IAM paths, IAM Roles Anywhere, resource policies for cross-account access, IAM role trust policies",
        "Designing attribute-based and role-based access control, including access driven by tags",
        "Designing, reading, and implementing IAM policies to least privilege, including permissions boundaries and session policies",
        "Analyzing authorization failures with the IAM policy simulator and IAM Access Analyzer",
        "Investigating and correcting unintended permissions granted to a resource, service, or entity",
      ],
    },
    {
      title: "Data Protection",
      weight: 18,
      gate: "For a dataset with a compliance obligation, specify encryption in transit, encryption at rest, key custody, retention, and integrity protection -- and say who could decrypt it and how you would know if they did.",
      objectives: [
        "Requiring encryption on connection: Elastic Load Balancing security policies and enforced TLS configuration",
        "Secure and private access paths: AWS PrivateLink, VPC endpoints, AWS Client VPN, AWS Verified Access",
        "Inter-resource encryption in transit: inter-node encryption for Amazon EMR, Amazon EKS, and SageMaker AI, and Nitro encryption",
        "Encryption at rest: choosing between AWS KMS and AWS CloudHSM, and client-side against server-side encryption",
        "Protecting data integrity: S3 Object Lock, S3 Glacier Vault Lock, versioning, digital code signing, file validation",
        "Automatic lifecycle management and retention: S3 Lifecycle policies, Amazon EFS lifecycle policies, Amazon FSx for Luster backup policies",
        "Secure replication and backup, including ransomware protection, with AWS Backup, Amazon Data Lifecycle Manager, and AWS DataSync",
        "Managing and rotating credentials and secrets with AWS Secrets Manager",
        "Managing and rotating imported key material, and configuring external key stores",
        "How imported key material differs from AWS-generated key material",
        "Masking sensitive data with CloudWatch Logs data protection policies and Amazon SNS message data protection",
        "Creating and managing encryption keys and certificates across one or many Regions with KMS customer managed keys and AWS Private Certificate Authority",
      ],
    },
    {
      title: "Security Foundations and Governance",
      weight: 14,
      gate: "Set the organization up so a new account is secure the hour it is created -- controls, policies, root access, tagging, shared resources -- and produce the evidence an auditor would ask for.",
      objectives: [
        "Deploying and configuring organizations with AWS Organizations",
        "Implementing and managing AWS Control Tower in new and existing environments, with optional and custom controls",
        "Organization policies that manage permissions: service control policies, resource control policies, AI service opt-out policies, declarative policies",
        "Centrally managing security services through delegated administrator accounts",
        "Managing root user credentials: centralizing root access for member accounts, managing MFA, designing break-glass procedures",
        "Deploying resources consistently and securely with infrastructure as code: CloudFormation StackSets, CloudFormation Guard, cfn-lint, third-party IaC tools",
        "Using tags to group resources by department, cost center, and environment",
        "Deploying and enforcing policies and configurations centrally with AWS Firewall Manager",
        "Sharing resources securely across accounts with AWS Service Catalog and AWS Resource Access Manager",
        "Detecting and remediating noncompliant resources with AWS Config and AWS Security Hub, and sending notifications",
        "Collecting and organizing audit evidence with AWS Audit Manager and AWS Artifact",
        "Evaluating architecture against AWS security best practices with the AWS Well-Architected Tool",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Specialty: AWS Certified Advanced Networking - Specialty (ANS-C01)
// 170 minutes, 65 questions (50 scored, 15 unscored), scaled 100-1000,
// pass 700. Domains: 30% / 26% / 20% / 24%.
//
// RETIRING: the last day to take this exam is 2026-12-31. Credentials earned
// before then stay valid for their full three years. The track is seeded so
// people already studying can finish, and the exam record carries the
// retirement date so it can be surfaced in the UI and archived afterwards.
//
// Unusual among AWS exams: the guide lists only multiple response and matching
// question types -- no plain multiple choice. (REQ-114, re-checked
// 2026-11-07: the certification page says "65 questions, either multiple
// choice or multiple response", but the exam guide's "Response types" still
// names only multiple response and matching. The guide is the detailed
// source, so the formats stay as it states them.)
// REQ-114 (Audit 3 M1): passing score corrected 700 -> 750, per the guide:
// "The minimum passing score is 750." (fetched 2026-11-07).
const ANS_VERIFIED_AT = "2026-11-07T00:00:00Z";
// ---------------------------------------------------------------------------
export const AWS_ANS_TRACK: SeedTrack = {
  code: "AWSANS",
  title: "Prep for the AWS Certified Advanced Networking - Specialty (ANS-C01) Exam",
  description:
    "AWS Certified Advanced Networking - Specialty (ANS-C01): hybrid and cloud networking at scale -- designing edge, DNS, load balancing and hybrid routing, implementing it across accounts and Regions, operating and troubleshooting it, and securing it. Note that this exam retires 2026-12-31.",
  trackType: "certification",
  subcategorySlug: "aws-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl:
    "https://docs.aws.amazon.com/aws-certification/latest/advanced-networking-specialty-01/advanced-networking-specialty-01.html",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...AWS_PROVIDER,
    credentialSlug: "certified-advanced-networking-specialty",
    credentialName: "AWS Certified Advanced Networking - Specialty",
    credentialUrl:
      "https://aws.amazon.com/certification/certified-advanced-networking-specialty/",
    examCode: "ANS-C01",
    status: "transitioning",
    retirementDate: "2026-12-31",
    officialObjectivesUrl:
      "https://docs.aws.amazon.com/aws-certification/latest/advanced-networking-specialty-01/advanced-networking-specialty-01.html",
    lastVendorVerifiedAt: ANS_VERIFIED_AT,
    recommendedExperience:
      "5 or more years of networking experience, including 2 or more years of cloud and hybrid networking.",
    durationMinutes: 170,
    questionFormat:
      "65 questions (50 scored, 15 unscored); multiple response and matching",
    passingScorePolicy:
      "Scaled score 100-1000; minimum passing score 750; compensatory scoring, so no per-domain minimum",
  },
  units: [
    {
      title: "Network Design",
      weight: 30,
      gate: "Given a global application with an on-premises data center and many accounts, design the edge, the DNS, the load balancing, the hybrid routing, and the visibility -- and justify each against a stated latency, availability, or address-space constraint. Largest domain on the exam.",
      objectives: [
        "Design patterns for content distribution with Amazon CloudFront",
        "Design patterns for global traffic management with AWS Global Accelerator",
        "Integrating edge services with Elastic Load Balancing and Amazon API Gateway",
        "Evaluating global inbound and outbound internet traffic to choose a distribution solution",
        "DNS protocol fundamentals: records, TTL, zones, delegation, DNSSEC",
        "Amazon Route 53 features: alias records, traffic policies, resolvers, health checks",
        "Using Route 53 public hosted zones and private hosted zones",
        "Using Route 53 Resolver endpoints in hybrid and AWS architectures",
        "Using Route 53 for global traffic management, and managing domain registration",
        "DNS logging and monitoring",
        "How load balancing works at layers 3, 4, and 7, and selecting the right load balancer",
        "Internal against external load balancers, and load balancer scaling factors",
        "Load balancer configuration: proxy protocol, cross-zone load balancing, session affinity, routing algorithms",
        "Target group configuration: TCP, GENEVE, IP targets against instance targets",
        "Encryption and authentication at the load balancer: TLS termination against TLS passthrough",
        "Load balancer integrations: Global Accelerator, CloudFront, AWS WAF, Route 53, Amazon EKS, AWS Certificate Manager, and the AWS Load Balancer Controller",
        "Integrating auto scaling with load balancing",
        "Integrating load balancers with existing application deployments",
        "Visibility with Amazon CloudWatch metrics, agents, logs, alarms, dashboards, and insights",
        "Visibility with AWS Transit Gateway Network Manager and VPC Reachability Analyzer",
        "Flow logs, traffic mirroring, and access logging for load balancers and CloudFront",
        "Identifying logging and monitoring requirements, and capturing a baseline of network performance",
        "Recommending the metrics that give the clearest visibility into network status",
        "Routing fundamentals: static against dynamic routing, and BGP",
        "Layer 1 and layer 2 concepts for physical interconnects: VLANs, link aggregation groups, optics, jumbo frames",
        "Encapsulation and encryption technologies: GRE and IPsec",
        "Identifying the requirements for hybrid connectivity before designing it",
        "Designing redundant hybrid connectivity with AWS Direct Connect and AWS Site-to-Site VPN",
        "Designing BGP routing with BGP attributes to shape traffic: load sharing and active/passive",
        "Integrating SD-WAN with AWS, including Transit Gateway Connect and overlay networks",
        "Connectivity patterns across accounts, Regions, and VPCs: VPC peering, Transit Gateway, AWS PrivateLink",
        "VPC sharing in a multi-account setup",
        "Designing around overlapping IP address space with NAT, PrivateLink, and Transit Gateway routing",
      ],
    },
    {
      title: "Network Implementation",
      weight: 26,
      gate: "Actually build it: physical interconnect, routing protocol, hub-and-spoke topology, hybrid DNS, and the automation that reproduces the whole thing -- then prove connectivity with a tool rather than a ping.",
      objectives: [
        "Configuring the physical requirements of hybrid connectivity: Letter of Authorization documents, colocation facilities, Direct Connect",
        "Configuring static and dynamic routing protocols for hybrid connectivity",
        "Layer 2 and layer 3 configuration: VLANs, IP addressing, gateways, routing, switching",
        "Implementing VPNs, including accelerated VPN and VPN security",
        "Connecting existing on-premises networks to the AWS Cloud",
        "Connecting existing on-premises name resolution to AWS: conditional forwarding, hosted zones, resolvers",
        "Configuring and implementing load balancing solutions, including reverse proxies",
        "Traffic management and SD-WAN with Transit Gateway Connect",
        "Multi-account networking with AWS Organizations and AWS Resource Access Manager: shared Transit Gateway, Direct Connect, VPC, Route 53",
        "Testing and validating connectivity between environments with Route Analyzer and Reachability Analyzer",
        "Configuring network monitoring and logging for AWS networking services",
        "Inter-VPC and multi-account connectivity: VPC peering, Transit Gateway, VPN, third-party and SD-WAN solutions, MPLS",
        "Private application connectivity with AWS PrivateLink",
        "Configuring a hub-and-spoke architecture with Transit Gateway or a transit VPC",
        "Configuring hybrid connectivity with existing third-party vendor solutions",
        "Configuring single-VPC and multi-VPC designs: DHCP, routing, security groups",
        "Implementing security between network boundaries with security groups, network ACLs, and AWS Network Firewall",
        "Authentication and authorization in network access: SAML and Active Directory",
        "Choosing between private hosted zones and public hosted zones",
        "Altering traffic management through DNS: latency, geography, weighting",
        "DNS delegation and conditional forwarding",
        "DNS record types: A, AAAA, TXT, pointer records, alias records",
        "Configuring DNSSEC on Route 53",
        "Sharing DNS services between accounts with AWS RAM",
        "Inbound and outbound resolver endpoints, and when each is required",
        "Configuring DNS monitoring and logging on Route 53",
        "Infrastructure as code for networks: the AWS CDK, AWS CloudFormation, the AWS CLI, SDKs, and APIs",
        "Event-driven network automation",
        "The problems hardcoded instructions cause in network IaC templates",
        "Creating repeatable network configurations and automating the optimization of network resources",
        "Weighing risk against cost to keep a cloud network as cheap as possible while automating it",
      ],
    },
    {
      title: "Network Management and Operation",
      weight: 20,
      gate: "Given 'the link is slow' or 'that host is unreachable', find it with flow logs, Reachability Analyzer, and Network Manager -- then make the network faster or cheaper without redesigning it.",
      objectives: [
        "Routing protocols used in AWS hybrid networks, including BGP over Direct Connect",
        "Connectivity methods: Direct Connect gateway, Transit Gateway, virtual interfaces",
        "How limits and quotas affect networking services: bandwidth limits and route limits",
        "Maintaining private access to custom services with AWS PrivateLink and VPC peering",
        "Using route tables and automatic propagation to direct traffic",
        "Optimizing routing over dynamic and static protocols: route summarization and CIDR overlap",
        "Setting up private or public access to AWS services over Direct Connect and VPN",
        "Inter-Regional and intra-Regional communication patterns",
        "Network performance metrics and reachability constraints, including routing and packet size",
        "Collecting and analyzing logs and metrics with CloudWatch, VPC flow logs, and VPC Traffic Mirroring",
        "Mapping network topology with Transit Gateway Network Manager",
        "Analyzing packets to identify packet-shaping issues with VPC Traffic Mirroring",
        "Troubleshooting connectivity caused by misconfiguration with Reachability Analyzer",
        "Verifying that a configuration meets design requirements, and automating verification of connectivity intent as configurations change",
        "Troubleshooting packet size mismatches inside a VPC",
        "Choosing between VPC peering, proxy patterns, and Transit Gateway from the requirements",
        "Reducing bandwidth utilization: unicast against multicast, and CloudFront",
        "Cost-effective connectivity options for data transfer between a VPC and on-premises environments",
        "Selecting the right network interface for performance: elastic network interface, Elastic Network Adapter, Elastic Fabric Adapter",
        "Implementing multicast within a VPC and on-premises",
        "Route 53 high-availability features: DNS load balancing with health checks, latency records, and weighted record sets",
        "Creating Route 53 hosted zones and records to optimize application availability, such as a private zonal DNS entry that routes traffic across Availability Zones",
        "Optimizing subnets for auto scaling, and preventing IP address depletion with secondary CIDRs",
        "Configuring jumbo frame support across connection types",
        "Improving network performance and application availability with AWS Global Accelerator",
      ],
    },
    {
      title: "Network Security, Compliance, and Governance",
      weight: 24,
      gate: "Build the threat model for a given network architecture, put the inbound, outbound, and east-west controls in place, encrypt what crosses the wire, and show the audit trail that proves all of it.",
      objectives: [
        "Threat models that follow from application architecture, and the common threats against each",
        "Securing inbound traffic flows into AWS: AWS WAF, AWS Shield, AWS Network Firewall",
        "Securing outbound traffic flows from AWS: Network Firewall, proxies, Gateway Load Balancers",
        "Securing inter-VPC traffic within and across accounts: security groups, network ACLs, VPC endpoint policies",
        "Network architectures that meet security and compliance requirements: untrusted network, perimeter VPC, three-tier",
        "Developing a threat model and identifying mitigations for a given architecture",
        "Testing compliance against the original requirements, including failover and resiliency tests",
        "Automating security incident reporting and alerting",
        "Network monitoring and logging services: CloudWatch, AWS CloudTrail, VPC Traffic Mirroring, VPC flow logs, Transit Gateway Network Manager",
        "Creating and analyzing VPC flow logs, including base and extended fields",
        "Creating and analyzing network traffic mirroring",
        "Implementing automated alarms and custom metrics with CloudWatch",
        "Correlating and analyzing information across single or multiple AWS log sources",
        "Log creation and delivery: VPC flow logs, load balancer access logs, CloudFront access logs, delivery through Amazon Kinesis and CloudWatch",
        "Auditing network security configuration with AWS Firewall Manager, security groups, and AWS Trusted Advisor",
        "Network encryption options on AWS, and encryption under the shared responsibility model",
        "Implementing encryption in transit: IPsec and TLS across CloudFront, Application and Network Load Balancers, VPN over Direct Connect, AWS managed databases, Amazon S3, and Transit Gateway",
        "VPN connectivity over Direct Connect",
        "Implementing certificate management with AWS Certificate Manager and AWS Private Certificate Authority",
        "Implementing secure DNS communications, including DNSSEC",
      ],
    },
  ],
};

// All AWS tracks, in the order AWS itself presents the certification path:
// foundational, associate, professional, specialty.
export const AWS_TRACKS: SeedTrack[] = [
  AWS_CLF_TRACK,
  AWS_AIF_TRACK,
  AWS_SAA_TRACK,
  AWS_DVA_TRACK,
  AWS_SOA_TRACK,
  AWS_DEA_TRACK,
  AWS_MLA_TRACK,
  AWS_SAP_TRACK,
  AWS_DOP_TRACK,
  AWS_SCS_TRACK,
  AWS_ANS_TRACK,
];
