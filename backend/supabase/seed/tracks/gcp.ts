// Google Cloud certification tracks.
//
// Every section name, weighting, and objective below was read on 2026-09-23
// from Google's own official material -- exam guide pages at
// cloud.google.com/learn/certification/guides/<slug>, certification overview
// pages at cloud.google.com/learn/certification/<slug> for duration/price/
// format, and, where linked, the official downloadable PDF exam guide
// (services.google.com/fh/files/misc/<slug>_exam_guide_english.pdf) -- not
// from memory. Objectives are paraphrased and reworded from each guide's
// numbered considerations, not copied, the same rule AWS/Azure's tracks
// followed.
//
// Google's certification program is unlike AWS/Azure/CompTIA in two ways
// that matter here:
//
//   - No published exam code. AWS prints "CLF-C02" and Microsoft prints
//     "AZ-900" on every page that mentions the exam; Google never prints
//     anything comparable anywhere -- confirmed against three separate pages
//     plus the PDF guide for Cloud Digital Leader. These are still real,
//     proctored, scored vendor exams (delivered via Pearson VUE or
//     Webassessor), just without a SKU-style code -- credential_basis
//     'vendor_exam_unpublished_code' (migration 016/017, REQ-040) exists for
//     exactly this, so examCode is left unset rather than invented.
//
//   - The whole catalog is mid-overhaul in 2026: a vendor-delivery switch to
//     Pearson VUE, several flagship exams being actively rebuilt, and at
//     least one credential (Professional Machine Learning Engineer) reported
//     to be mid-revision by third-party sources as of this fetch. Applying
//     the same rule Azure's DP-420 rename taught: don't author a track for
//     anything confirmed mid-revision or beta rather than active on its own
//     official page. Cloud Digital Leader's own guide states it "launched on
//     August 12, 2026" -- the current, stable version, not one mid-change.

import type { SeedTrack } from "../data";

const GCP_PROVIDER = {
  providerSlug: "google-cloud",
  providerName: "Google Cloud",
  providerUrl: "https://cloud.google.com/learn/certification",
  subcategorySlug: "it-certifications",
  credentialType: "certification",
} as const;

const VERIFIED_AT = "2026-09-23T00:00:00Z";

// ---------------------------------------------------------------------------
// Foundational: Google Cloud Digital Leader
// 90 minutes, 50-60 questions, multiple choice/multiple select, $99.
// No minimum-passing-score policy is published (unlike AWS's scaled 700).
// Sections: 18% / 18% / 18% / 18% / 18% / 10%.
// ---------------------------------------------------------------------------
export const GCP_CDL_TRACK: SeedTrack = {
  code: "GCPCDL",
  title: "Google Cloud Digital Leader Coach",
  description:
    "Google Cloud Digital Leader: a working, non-technical fluency in Google Cloud -- digital and data transformation, AI, modern infrastructure, trust and security, and how organizations actually run and pay for cloud operations.",
  trackType: "certification",
  subcategorySlug: "it-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://cloud.google.com/learn/certification/guides/cloud-digital-leader",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...GCP_PROVIDER,
    credentialSlug: "cloud-digital-leader",
    credentialName: "Google Cloud Digital Leader",
    credentialUrl: "https://cloud.google.com/learn/certification/cloud-digital-leader",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    officialObjectivesUrl: "https://cloud.google.com/learn/certification/guides/cloud-digital-leader",
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "No prerequisites; aimed at anyone who wants to demonstrate knowledge of cloud computing basics and how Google Cloud products and services help an organization reach its goals.",
    durationMinutes: 90,
    questionFormat: "50-60 questions; multiple choice and multiple select",
    passingScorePolicy: "No minimum passing score is published by Google for this exam.",
  },
  units: [
    {
      title: "Digital Transformation with Google Cloud",
      weight: 18,
      gate: "Given a claimed cloud benefit, say specifically what changed for the business -- not a repeated buzzword -- and name the Google Cloud differentiator that actually applies, if any.",
      objectives: [
        "\"Cloud,\" \"agentic AI,\" \"infrastructure,\" \"digital transformation,\" \"open source,\" and \"open standard\" as distinct terms, not interchangeable buzzwords",
        "Business benefits cloud technology delivers during a digital transformation: scalability, cost-effectiveness, agility, speed, flexibility, security, global reach, high availability, data-driven insight, and strategic focus",
        "What drives organizations toward digital transformation, and the common hurdles that slow it down",
        "The risk and cost of staying on-premises rather than adopting cloud",
        "Google Cloud's stated differentiators: AI leadership, openness and interoperability, AI Hypercomputer, an AI-ready data platform, security, and its global network",
        "Business use cases and benefits distinguishing private cloud, hybrid cloud, and multicloud architectures",
        "Core networking vocabulary: IP address, DNS, latency, bandwidth",
        "How Google Cloud's global network -- regions, zones, and edge locations -- supports a digital transformation, and how the three relate",
        "Benefits and tradeoffs across IaaS, PaaS, and SaaS",
      ],
    },
    {
      title: "Exploring Data Transformation with Google Cloud",
      weight: 18,
      gate: "Given a business need, name the Google Cloud data product that actually fits it -- not just any product that could technically hold the data.",
      objectives: [
        "Why data has business value: real-time insight, trend detection, informing strategy, fueling AI",
        "Databases versus data warehouses versus data lakes, and what each is for",
        "Types of data: first-party, second-party, third-party; structured, unstructured, semi-structured",
        "An organization's data supply chain: genesis, collection, processing, storage, analysis, activation",
        "Data governance, and why it matters beyond compliance",
        "Why openness and interoperability in a data platform matter for avoiding silos and vendor lock-in",
        "Matching a business use case to the right Google Cloud data product: Cloud Storage, Spanner, Cloud SQL, AlloyDB, Bigtable, BigQuery, Firestore",
        "Core data-management vocabulary: relational versus non-relational, object storage, SQL versus NoSQL",
        "Cloud Storage classes by cost and access frequency: Standard, Nearline, Coldline, Archive, Autoclass",
        "Ways an organization can migrate or modernize an existing database into the cloud",
        "How Looker and BigQuery together turn stored data into real-time reports, dashboards, and embedded insight",
        "Why real-time streaming analytics matters for a modern business",
        "Google Cloud products that modernize a data pipeline: Pub/Sub, Dataflow, and Managed Service for Apache Spark",
      ],
    },
    {
      title: "Innovating with Google Cloud Artificial Intelligence",
      weight: 18,
      gate: "Given a business AI use case, name the Google Cloud product or concept that actually applies -- and say why data quality matters as much as model choice.",
      objectives: [
        "AI, ML, generative AI, data analytics, and business intelligence as distinct, related terms",
        "How agentic AI is reshaping specific functions: workforce productivity, customer support, sales, product innovation, operations, research",
        "Google Cloud's stated AI advantages: infrastructure built for AI, an AI-ready data cloud, first-party models, an all-in-one developer platform, pre-built agents and applications",
        "Business problems ML actually solves: replacing rule-based systems, deriving insight from large structured or unstructured datasets, scaling decisions",
        "Why high-quality, accurate data is a prerequisite for a working AI model, and the dimensions that make data \"high quality\": completeness, uniqueness, timeliness, validity, accuracy, consistency",
        "The business case for explainable and responsible AI",
        "Strategic considerations when choosing a Google Cloud AI approach: implementation speed, development effort, differentiation potential, required technical expertise, flexibility",
        "What the Gemini Enterprise Agent Platform does and where it fits a business use case",
        "Matching a Google Cloud pre-trained API or model to a use case, including Vision, Translation, and Speech-to-Text APIs, and Gemini itself",
        "Building a custom model on an organization's own data with Agent Studio or AutoML on the Agent Platform",
        "AI Hypercomputer's core components -- GPUs, TPUs, open software and standards, flexible consumption -- and the performance/efficiency case for it",
        "Running machine learning directly inside BigQuery with standard SQL, using BigQuery ML",
      ],
    },
    {
      title: "Modernize Infrastructure and Applications with Google Cloud",
      weight: 18,
      gate: "Given a workload, name the Google Cloud compute or migration approach that fits it -- and say why the near-miss alternative doesn't.",
      objectives: [
        "Cloud migration vocabulary: workload, discovery and assessment, retire, retain, rehost, replatform, refactor, reimagine",
        "Core compute vocabulary: virtual machines, containers and containerization, microservices, serverless computing, Spot VMs, Kubernetes, autoscaling, load balancing, managed services",
        "The business case for running virtual machines on Compute Engine",
        "What makes modern application development valuable: flexible architectures, faster managed-service deployment, cost optimization, scalability, resilience, operational efficiency",
        "The business case for deploying and managing containers with Google Kubernetes Engine",
        "The business case for serverless compute on Cloud Run and Cloud Run functions",
        "Google Cloud products built for multicloud and hybrid environments: AlloyDB Omni, BigQuery Omni, GKE Enterprise, Cloud SQL, Looker",
        "What an API is, and the business case for exposing or monetizing public-facing APIs",
        "The business case for managing APIs with Apigee",
      ],
    },
    {
      title: "Trust and Security with Google Cloud",
      weight: 18,
      gate: "Given a described threat or control, say which part of cloud security it belongs to, and whether that's Google's job or the customer's.",
      objectives: [
        "Common cybersecurity threats and their business impact: DDoS, ransomware, cryptomining, malware, phishing, misconfiguration, unsecured third-party systems, physical damage, LLM attacks",
        "How cloud security differs from on-premises security",
        "Why control, compliance, confidentiality, integrity, and availability all matter to a cloud security model",
        "Core security vocabulary: data loss prevention, privileged access, least privilege, zero-trust architecture, security by default, security posture, cyber resilience, firewall, encryption, decryption",
        "How encryption protects data in each usage state: in use, in transit, at rest",
        "Authentication versus authorization versus auditing, including MFA/2SV and IAM",
        "Core SecOps vocabulary: security posture, threat intelligence, threat response",
        "How Google secures every layer of its AI stack: infrastructure, data, models, platform, agents",
        "What Google Threat Intelligence draws on: Google's own global visibility, Mandiant's incident-response expertise, VirusTotal's crowdsourced threat detection",
        "What \"secure by design\" means for Google's own infrastructure: proprietary data centers, purpose-built hardware, custom security hardware and software",
        "Google's AI-focused security offerings: Gemini in Google Security Operations, AI Protection, Model Armor",
        "Google's other security offerings and what each is for: Cloud VPC, Cloud VPN, Cloud Interconnect, firewalls, Cloud Armor, Cloud Logging, IAM, Sensitive Data Protection, Confidential Computing, Certificate Manager, Identity-Aware Proxy",
        "How Google earns and maintains customer trust: transparency reports, third-party audits, digital sovereignty, data residency, compliance resource manager",
      ],
    },
    {
      title: "Scaling with Google Cloud Operations",
      weight: 10,
      gate: "Given a cost or reliability problem, name the Google Cloud practice or tool that addresses it specifically.",
      objectives: [
        "How moving from on-premises to cloud shifts CapEx to OpEx, and what that does to total cost of ownership",
        "Google-recommended practices for cloud financial governance, including who owns cost management",
        "The role people, process, and technology each play in controlling cloud cost",
        "Google Cloud's resource hierarchy -- resources, projects, folders, organization node -- and what it buys: access control, inheritance, security/compliance, visibility",
        "Controlling cloud consumption: resource quota policies, budget threshold rules, Cloud Billing reports, Dynamic Workload Scheduler, Spot VMs",
        "Core operations vocabulary: operational excellence, reliability, high availability",
        "Designing for resilience: redundancy, replication, scalable infrastructure, backups",
        "The four signals used to measure system performance and reliability: latency, traffic, saturation, errors",
        "Core DevOps/SRE vocabulary: service level indicators, service level objectives, service level agreements",
      ],
    },
  ],
};

const VERIFIED_AT_2 = "2026-09-24T00:00:00Z";

// ---------------------------------------------------------------------------
// Associate: Google Cloud Associate Cloud Engineer
// 120 minutes, 50-60 questions, multiple choice/multiple select, $125.
// No minimum-passing-score policy is published.
// Sections: 20% / 30% / 30% / 20%.
// ---------------------------------------------------------------------------
export const GCP_ACE_TRACK: SeedTrack = {
  code: "GCPACE",
  title: "Google Cloud Associate Cloud Engineer Coach",
  description:
    "Google Cloud Associate Cloud Engineer: deploying, securing, and operating applications and infrastructure on Google Cloud -- environment setup, compute/storage/networking implementation, day-2 operations, and access/security configuration.",
  trackType: "certification",
  subcategorySlug: "it-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://cloud.google.com/learn/certification/guides/cloud-engineer",
  sourceVerifiedAt: VERIFIED_AT_2,
  credential: {
    ...GCP_PROVIDER,
    credentialSlug: "associate-cloud-engineer",
    credentialName: "Google Cloud Associate Cloud Engineer",
    credentialUrl: "https://cloud.google.com/learn/certification/cloud-engineer",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    officialObjectivesUrl: "https://cloud.google.com/learn/certification/guides/cloud-engineer",
    lastVendorVerifiedAt: VERIFIED_AT_2,
    recommendedExperience:
      "6+ months of hands-on experience with Google Cloud, working with public clouds or on-premises solutions.",
    durationMinutes: 120,
    questionFormat: "50-60 questions; multiple choice and multiple select",
    passingScorePolicy: "No minimum passing score is published by Google for this exam.",
  },
  units: [
    {
      title: "Setting Up a Cloud Solution Environment",
      weight: 20,
      gate: "Given a new Google Cloud environment to stand up, name the specific step and the exact IAM/org concept it depends on -- not just \"configure access.\"",
      objectives: [
        "Building a resource hierarchy (organization, folders, projects) and applying organization policies to it",
        "Granting IAM roles to members within a project",
        "Managing users and groups in Cloud Identity, manually and via automation",
        "Enabling APIs within a project",
        "Provisioning and setting up Google Cloud Observability products",
        "Assessing quotas and requesting increases",
        "Setting up a standalone organization",
        "Setting up cloud networking as part of environment setup",
        "Verifying product availability across regions and zones",
        "Configuring Cloud Asset Inventory, and using Gemini Cloud Assist to analyze resources",
        "Configuring Workforce Identity Federation",
        "Creating billing accounts and linking projects to them",
        "Establishing billing budgets and alerts",
        "Setting up billing exports",
      ],
    },
    {
      title: "Planning and Implementing a Cloud Solution",
      weight: 30,
      gate: "Given a workload's shape, pick the specific Google Cloud compute, storage, or networking product that fits it -- and the tool used to provision it as code.",
      objectives: [
        "Choosing the right compute option for a workload: Compute Engine, GKE, Cloud Run, Cloud Run functions, or Agent Runtime on the Gemini Enterprise Agent Platform",
        "Launching a compute instance: availability policy, SSH keys",
        "Choosing Compute Engine storage: zonal Persistent Disk, regional Persistent Disk, Google Cloud Hyperdisk",
        "Creating an autoscaled managed instance group from an instance template",
        "Configuring OS Login and VM Manager",
        "Using Spot VM instances and custom machine types",
        "Installing and configuring kubectl",
        "Deploying a GKE cluster: Autopilot, regional, and private cluster configurations",
        "Deploying a containerized application to GKE",
        "Deploying an application to serverless compute, including processing Google Cloud events via Pub/Sub, Cloud Storage notifications, or Eventarc",
        "Choosing between GPUs and TPUs for a workload",
        "Choosing and deploying data products: Cloud SQL, BigQuery, Firestore, Spanner, Bigtable, AlloyDB, Dataflow, Pub/Sub, Managed Service for Apache Kafka, Memorystore",
        "Choosing and deploying storage products and Cloud Storage classes: Standard, Nearline, Coldline, Archive",
        "Loading data: command-line upload, loading from Cloud Storage, Storage Transfer Service",
        "Maintaining multi-region redundancy across data solutions",
        "Creating a VPC with subnets: custom mode, Shared VPC, VPC Network Peering",
        "Creating and applying VPC firewall rules and Cloud NGFW policies (action, source, destination, targets, protocols, ports)",
        "Using tags and service accounts in Cloud NGFW policy rules",
        "Establishing network connectivity: Cloud VPN, VPC Network Peering, Cloud Interconnect",
        "Choosing and deploying load balancers",
        "Differentiating Network Service Tiers",
        "Infrastructure-as-code tooling: Fabric FAST, Config Connector, Terraform, Helm",
        "AI-assisted planning and implementation: Gemini CLI, Google Antigravity, Gemini Cloud Assist, Application Design Center",
      ],
    },
    {
      title: "Ensuring Successful Operation of a Cloud Solution",
      weight: 30,
      gate: "Given a running system that needs day-2 attention, name the specific console/CLI action and where it shows up in monitoring or logging.",
      objectives: [
        "Remotely connecting to a Compute Engine instance",
        "Viewing currently running Compute Engine instances",
        "Working with snapshots and images: create, view, delete, schedule",
        "Viewing running GKE cluster inventory: nodes, Pods, Services",
        "Configuring GKE access to Artifact Registry",
        "Working with GKE node pools: add, edit, remove, autoscale",
        "Working with Kubernetes resources: Pods, Services, StatefulSets",
        "Managing horizontal and vertical Pod autoscaling",
        "Managing GKE Autopilot Pod resource requests",
        "Deploying new versions of a Cloud Run application, and adjusting traffic-splitting across Cloud Run, Cloud Run functions, and GKE",
        "Configuring autoscaling for a Cloud Run application",
        "Attaching GPUs and TPUs to running workloads",
        "Deploying an agent to Agent Runtime on the Gemini Enterprise Agent Platform",
        "Managing notebooks in Gemini Enterprise Agent Platform Workbench and BigQuery",
        "Managing developer environments with Cloud Workstations",
        "Managing and securing objects in Cloud Storage buckets, including lifecycle management policies",
        "Executing queries against data instances: Cloud SQL, BigQuery, Bigtable, Spanner, Firestore, AlloyDB",
        "Estimating the cost of data storage resources",
        "Backing up and restoring database instances",
        "Reviewing job status for Dataflow and BigQuery",
        "Using Database Center to manage the Google Cloud database fleet",
        "Configuring customer-managed encryption keys (CMEK)",
        "Resizing a subnet's IPv4 address range",
        "Reserving static external or internal IP addresses",
        "Adding custom static routes in a VPC",
        "Using Cloud DNS and Cloud NAT",
        "Managing VPC firewall rules and Cloud NGFW policies day-to-day",
        "Creating Cloud Monitoring alerts based on resource metrics",
        "Creating and ingesting Cloud Monitoring custom metrics",
        "Configuring audit logs: VPC Flow Logs, audit logs, firewall logs",
        "Exporting logs to external systems, including on-premises and BigQuery",
        "Configuring log buckets, log analytics, and log routers",
        "Viewing and filtering logs, and inspecting specific log message details, in Cloud Logging",
        "Using diagnostic tools to investigate an application issue: Cloud Trace, Cloud Profiler, Query Insights, index advisor",
        "Viewing the Personalized Service Health dashboard",
        "Configuring and deploying Ops Agent, and deploying the Managed Service for Prometheus",
        "Using Gemini Cloud Assist for monitoring, and Active Assist to optimize resource utilization",
        "Using Cloud Hub to monitor active events and application health",
      ],
    },
    {
      title: "Configuring Access and Security",
      weight: 20,
      gate: "Given an access requirement, say whether it belongs on a user's IAM role or a service account -- and which specific mechanism narrows it to least privilege.",
      objectives: [
        "Viewing and creating IAM policies",
        "Attaching roles and understanding policy inheritance in the organization hierarchy",
        "Managing IAM role types and defining custom roles",
        "Creating service accounts, including Google-managed ones",
        "Using service accounts in IAM policies with minimum permissions",
        "Assigning service accounts to resources",
        "Managing a service account's IAM permissions",
        "Managing service account impersonation",
        "Creating and managing short-lived service account credentials",
        "Using a Google Cloud service account with a GKE application",
        "Provisioning Workload Identity Federation for workloads",
      ],
    },
  ],
};

const VERIFIED_AT_3 = "2026-09-24T00:00:00Z";

// ---------------------------------------------------------------------------
// Professional: Google Cloud Professional Cloud Architect
// 120 minutes, 50-60 questions (2 case studies, 20-30% of the exam), $200.
// Case studies referenced by the exam guide (fictitious businesses used to
// give exam questions context): Altostrat Media, Cymbal Retail, EHR
// Healthcare, KnightMotives Automotive.
// Sections: 25% / 17.5% / 17.5% / 15% / 12.5% / 12.5%.
// ---------------------------------------------------------------------------
export const GCP_PCA_TRACK: SeedTrack = {
  code: "GCPPCA",
  title: "Google Cloud Professional Cloud Architect Coach",
  description:
    "Google Cloud Professional Cloud Architect: designing, building, and managing secure, scalable, cost-effective solutions on Google Cloud, anchored in the Well-Architected Framework's six pillars, plus the exam's own recurring case studies (Altostrat Media, Cymbal Retail, EHR Healthcare, KnightMotives Automotive).",
  trackType: "certification",
  subcategorySlug: "it-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://cloud.google.com/learn/certification/guides/cloud-architect",
  sourceVerifiedAt: VERIFIED_AT_3,
  credential: {
    ...GCP_PROVIDER,
    credentialSlug: "cloud-architect",
    credentialName: "Google Cloud Professional Cloud Architect",
    credentialUrl: "https://cloud.google.com/learn/certification/cloud-architect",
    basis: "vendor_exam_unpublished_code",
    status: "active",
    officialObjectivesUrl: "https://cloud.google.com/learn/certification/guides/cloud-architect",
    lastVendorVerifiedAt: VERIFIED_AT_3,
    recommendedExperience:
      "3+ years of industry experience, including 1+ year designing and managing solutions using Google Cloud. Experience with common open-source technologies and multitiered distributed application design across legacy, multicloud, or hybrid environments.",
    durationMinutes: 120,
    questionFormat:
      "50-60 questions; multiple choice and multiple response; includes 2 case studies (fictitious businesses) comprising 20-30% of the exam",
    passingScorePolicy: "No minimum passing score is published by Google for this exam.",
  },
  units: [
    {
      title: "Designing and Planning a Cloud Solution Architecture",
      weight: 25,
      gate: "Given a business requirement, not a technical one, translate it into an architecture decision -- and say which Well-Architected Framework pillar that decision actually serves.",
      objectives: [
        "Matching a cloud architecture to a business use case and product strategy",
        "Identifying functional versus non-functional requirements",
        "Building a business continuity plan into the architecture",
        "Weighing cost optimization against other requirements",
        "Supporting the application design layer from the infrastructure",
        "Choosing integration patterns with external systems",
        "Planning how data moves through the architecture",
        "Naming a design decision's real trade-off, not just its benefit",
        "Choosing a workload disposition strategy: build, buy, modify, or deprecate",
        "Choosing success measurements: KPIs, ROI, and other metrics",
        "Designing for security and compliance from the start",
        "Designing for observability from the start",
        "Applying the Well-Architected Framework's six pillars to a design decision",
        "Designing for high availability and failover",
        "Designing for the flexibility of cloud resources",
        "Designing for scalability against growth requirements",
        "Designing for performance and latency",
        "Using Gemini Cloud Assist during architecture design",
        "Designing backup and recovery into the solution",
        "Designing integration with on-premises or multicloud environments",
        "Choosing Google Cloud AI/ML solutions for a design: Gemini LLMs, Agent Builder, Model Garden, Gemini models, AI Hypercomputer",
        "Designing cloud-native networking: VPC, peering, firewalls, load balancers, routing, container networking, Shared VPC, Private Service Connect",
        "Choosing a data processing solution",
        "Choosing the appropriate storage type: object, file, or database",
        "Mapping compute needs to platform products: GKE, Cloud Run, Cloud Run functions",
        "Choosing compute resources: Spot VMs, custom machine types, specialized workloads",
        "Integrating a new solution with existing systems as part of a migration plan",
        "Assessing and migrating systems and data with Google Cloud Migration Center",
        "Using migration methodologies, workload testing, network planning, and dependency planning",
        "Determining a migration's software license implications and financial impact",
        "Anticipating cloud and technology improvements over a solution's life",
        "Designing for the evolution of business needs",
        "Applying a cloud-first design approach to future decisions",
      ],
    },
    {
      title: "Managing and Provisioning a Cloud Solution Infrastructure",
      weight: 17.5,
      gate: "Given a provisioning task, say which layer it belongs to -- network topology, storage, compute, or ML pipeline -- and the specific Google Cloud mechanism that implements it.",
      objectives: [
        "Extending network topology to on-premises environments",
        "Extending network topology to a multicloud environment, including Google Cloud-to-Google Cloud communication",
        "Building security protection into network topology: intrusion protection, access control, firewalls",
        "Designing VPC topology and load balancing for cloud, internet, and cloud-adjacent access",
        "Allocating data storage",
        "Provisioning data processing and compute together",
        "Configuring security and access management for storage systems",
        "Configuring data transfer and latency",
        "Setting data retention and lifecycle management policy",
        "Planning for data growth",
        "Configuring data protection: backup and recovery",
        "Provisioning compute resources",
        "Configuring compute volatility: Spot versus standard",
        "Configuring cloud-native networking for compute resources: Compute Engine, GKE, serverless networking, Google Cloud VMware Engine",
        "Orchestrating infrastructure, configuring resources, and managing patches",
        "Orchestrating containers",
        "Configuring serverless compute",
        "Using Agent Platform Pipelines to automate and orchestrate the ML lifecycle",
        "Preparing for Agent Platform data integration",
        "Using AI Hypercomputer for ML/AI workloads: integrating GPUs and TPUs in training/serving, optimizing consumption models, running large-scale training",
        "Differentiating the Google AI APIs: Search, Conversation, Vision, Image, Video, Audio",
        "Integrating Gemini Enterprise features -- AI Agents and NotebookLM -- into a workflow",
        "Integrating a Model Garden AI model into the solution",
      ],
    },
    {
      title: "Designing for Security and Compliance",
      weight: 17.5,
      gate: "Given a security or compliance requirement, name the specific Google Cloud control that satisfies it -- not a generic 'add security review' answer.",
      objectives: [
        "Designing IAM for a solution",
        "Designing a resource hierarchy: organizations, folders, projects",
        "Designing data security: key management, encryption, secret management",
        "Designing for separation of duties",
        "Designing security controls: auditing, VPC Service Controls, context-aware access, organization policy, hierarchical firewall policy",
        "Managing customer-managed encryption keys with Cloud KMS",
        "Designing secure remote access: Identity-Aware Proxy, service account impersonation, Chrome Enterprise Premium, Workload Identity Federation",
        "Securing the software supply chain",
        "Securing AI: Model Armor, Sensitive Data Protection, secure model deployment",
        "Designing for legislation and regulation: health record privacy, children's privacy, data privacy, data ownership, data sovereignty",
        "Designing for commercial compliance: handling credit card data and PII",
        "Aligning a design with industry certifications like SOC 2",
        "Designing for audits, including log retention",
      ],
    },
    {
      title: "Analyzing and Optimizing Technical and Business Processes",
      weight: 15,
      gate: "Given an organizational or process problem (not an infrastructure one), say what a Professional Cloud Architect is actually being asked to advise on.",
      objectives: [
        "Analyzing the software development lifecycle",
        "Analyzing CI/CD processes",
        "Applying troubleshooting and root-cause-analysis best practices",
        "Testing and validating software and infrastructure",
        "Designing a service catalog and provisioning process",
        "Planning for disaster recovery",
        "Managing stakeholders: influencing and facilitation",
        "Managing organizational change",
        "Assessing team skills readiness",
        "Analyzing decision-making processes",
        "Managing customer success",
        "Optimizing cost and resources: CapEx versus OpEx",
        "Planning for business continuity",
      ],
    },
    {
      title: "Managing Implementation",
      weight: 12.5,
      gate: "Given a deployment in progress, say what a Professional Cloud Architect advises the dev/ops teams to do -- not do it for them.",
      objectives: [
        "Advising on application and infrastructure deployment",
        "Applying API management best practices with Apigee",
        "Choosing testing frameworks: load, unit, integration",
        "Choosing data and system migration/management tooling",
        "Using Gemini Cloud Assist during implementation",
        "Using Cloud Shell Editor, Cloud Code, and the Cloud Shell Terminal",
        "Using Google Cloud SDKs: gcloud, gsutil, bq",
        "Using Cloud Emulators: Bigtable, Spanner, Pub/Sub, Firestore",
        "Using Infrastructure as Code, including Terraform",
        "Following Google API access best practices",
        "Using Google API client libraries",
      ],
    },
    {
      title: "Ensuring Solution and Operations Excellence",
      weight: 12.5,
      gate: "Given a production solution, say how a Professional Cloud Architect verifies it's actually reliable -- not just that it was designed to be.",
      objectives: [
        "Applying the operational excellence pillar's principles and recommendations",
        "Monitoring and logging with Google Cloud Observability",
        "Profiling and benchmarking a solution",
        "Designing alerting strategies",
        "Managing deployment and release",
        "Assisting with the support of deployed solutions",
        "Evaluating quality control measures",
        "Ensuring production reliability: chaos engineering, penetration testing, load testing",
      ],
    },
  ],
};

export const GCP_TRACKS: SeedTrack[] = [GCP_CDL_TRACK, GCP_ACE_TRACK, GCP_PCA_TRACK];
