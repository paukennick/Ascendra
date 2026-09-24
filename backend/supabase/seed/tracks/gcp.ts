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

export const GCP_TRACKS: SeedTrack[] = [GCP_CDL_TRACK];
