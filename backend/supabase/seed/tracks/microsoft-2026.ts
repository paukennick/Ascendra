// REQ-266 / REQ-268: three Microsoft certifications built on Nick's approval
// of 2026-11-14, kept in their own file (beside tracks/azure.ts) so parallel
// builders do not edit the same lines.
//
// Status check first (Nick asked for it before anything was built), all read
// 2026-11-14 as raw HTML on learn.microsoft.com and techcommunity.microsoft.com:
//   - Azure Security Engineer Associate (AZ-500): the certification page says
//     "This certification, related exam, and renewal assessments was retired
//     on August 31, 2026."
//   - Azure Developer Associate (AZ-204): the certification page says "This
//     certification and the renewal assessment are retired." Microsoft's
//     Skills Hub post "The AI job boom is here. Are you ready to showcase your
//     skills?" (timeline updated May 28, 2026) gives its retirement as
//     July 31, 2026.
//   - The same post names the replacements: AZ-204 -> Azure AI Cloud
//     Developer Associate (AI-200), "exam expected to go live in July 2026";
//     AZ-500 -> Cloud and AI Security Engineer Associate (SC-500), "training
//     and exam expected to be available in July 2026".
//   - Both replacement certification pages are live (exam scheduling through
//     Pearson VUE, 120 minutes each) and neither page nor study guide marks
//     the exam as beta. SC-500's page says its practice assessment "is not
//     currently available"; that the exam is out of beta is our reading of
//     the pages and the post, not a sentence Microsoft prints.
//   - Microsoft's catalog API (learn.microsoft.com/api/catalog/?type=
//     certifications,exams) lists both replacements and the Power BI Data
//     Analyst Associate with no retirement date.
// So AZ-500 and AZ-204 are NOT built (both retired); their replacements
// SC-500 and AI-200 are, as Nick's brief allows ("if one is retiring or
// replaced, build the replacement"). tracks/azure.ts's header used to say
// AZ-204 and AZ-500 retired "with no active replacement exam"; that is
// corrected there (FAIL-1800).
//
// Study guides read in full, 2026-11-14:
//   - PL-300: "Skills measured as of April 20, 2026"; four domains at
//     25-30 / 25-30 / 25-30 / 15-20%; passing score 700; no retirement
//     notice. Certification page: 100 minutes, renewal every 12 months.
//   - SC-500 ("Implementing End-to-End Security Controls for Cloud and AI
//     Workloads"): prints no "skills measured as of" date (page ms.date
//     2026-04-26, updated 2026-07-31) and no change log; four domains at
//     20-25 / 25-30 / 20-25 / 20-25%; passing score 700.
//   - AI-200: prints no "skills measured as of" date (page ms.date
//     2026-04-15, updated 2026-11-05) and no change log; four domains at
//     20-25 / 25-30 / 20-25 / 20-25%; passing score 700.
//
// Domain weights follow tracks/azure.ts "Domain weights" (REQ-102): the range
// midpoint when the midpoints total 100 (PL-300: 27.5 / 27.5 / 27.5 / 17.5),
// otherwise the midpoints scaled to 100 and rounded by largest remainder,
// every value inside its published range (SC-500 and AI-200: 24 / 29 / 24 /
// 23).
//
// Outline statements: each unit carries the guide's subheadings and the
// skills-measured bullets under them as `outline` (task statements, REQ-235).
// Objectives are our own wording. Key values come from the Microsoft Learn
// pages named in each unit's sources, all read 2026-11-14.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
// 12 months, the default re-check for an exam outline (REQ-244, DP-300).
const REVIEW_DUE_AT = "2027-11-14T00:00:00Z";

const MS_PROVIDER = {
  providerSlug: "microsoft",
  providerName: "Microsoft",
  providerUrl: "https://learn.microsoft.com/en-us/credentials/",
  subcategorySlug: "azure-certifications",
  credentialType: "certification",
} as const;

const NOTICE = "Independently developed exam prep; not affiliated with or endorsed by Microsoft. Microsoft and Azure are trademarks of the Microsoft group of companies.";

const GUIDE = "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/";
const L = "https://learn.microsoft.com/en-us/";

const outline = (exam: string, domain: string, statements: string[], keyValues: string[]): UnitSource => ({
  title: `Exam ${exam} study guide: ${domain}`,
  ...source(`${GUIDE}${exam.toLowerCase()}`, "exam_outline", CHECKED),
  outline: statements,
  keyValues,
});
const doc = (title: string, path: string, keyValues: string[]): UnitSource => ({
  title,
  ...source(`${L}${path}`, "reference", CHECKED),
  keyValues,
});

// ---------------------------------------------------------------------------
// PL-300: Microsoft Certified: Power BI Data Analyst Associate
// ---------------------------------------------------------------------------
const PL300_FORMAT = "PL-300: 100 minutes, passing score 700; skills measured as of April 20, 2026 (Microsoft does not publish a question count); the certification renews every 12 months through a free online assessment";

const PL300_DOCS = {
  storage: doc("Power BI: table storage mode", "power-bi/transform-model/desktop-storage-mode", [
    "A table's storage mode is Import, DirectQuery, Dual or Direct Lake; Dual acts as Import or DirectQuery depending on the query and keeps relationships to DirectQuery tables regular",
    "Direct Lake reads Delta tables in OneLake without importing them; a refresh of a Direct Lake model (a reframing) loads the latest data by default",
  ]),
  calculate: doc("DAX: CALCULATE function", "dax/calculate-function-dax", ["CALCULATE evaluates an expression in a modified filter context; its filter arguments can be Boolean expressions, table expressions or filter modifier functions"]),
  dateTable: doc("Power BI: design guidance for date tables", "power-bi/guidance/model-date-tables", [
    "A marked date table needs a date column with unique values, no BLANKs and no missing dates, spanning full years (not necessarily calendar years)",
  ]),
  rls: doc("Row-level security (RLS) with Power BI", "fabric/security/service-admin-row-level-security", [
    "RLS restricts only users with Viewer permission; it does not apply to workspace Admin, Member or Contributor roles, so test it by assigning people the Viewer role",
    "RLS still applies to Viewers who also have Build permission on the semantic model",
  ]),
  gateway: doc("What is an on-premises data gateway?", "data-integration/gateway/service-gateway-onprem", [
    "A gateway is needed to refresh or query data sources the Power BI service cannot reach directly, such as on-premises databases; Microsoft supports only the last six monthly gateway releases",
  ]),
};

export const PL300_TRACK: SeedTrack = {
  code: "PL300",
  title: "Exam Prep for Power BI Data Analyst Associate (PL-300)",
  description: `Microsoft Certified: Power BI Data Analyst Associate (PL-300): preparing data with Power Query, modeling it with relationships, date tables and DAX measures, building and enhancing reports (including Copilot features), and managing workspaces, apps, refresh, row-level security and sensitivity labels. ${NOTICE}`,
  trackType: "certification",
  subcategorySlug: "azure-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://learn.microsoft.com/en-us/credentials/certifications/data-analyst-associate/",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  credential: {
    ...MS_PROVIDER,
    credentialSlug: "data-analyst-associate",
    credentialName: "Microsoft Certified: Power BI Data Analyst Associate",
    credentialUrl: "https://learn.microsoft.com/en-us/credentials/certifications/data-analyst-associate/",
    examCode: "PL-300",
    status: "active",
    objectivesRevision: "Skills measured as of April 20, 2026",
    officialObjectivesUrl: `${GUIDE}pl-300`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Works with business stakeholders, analytics engineers and data engineers to deliver insights; proficient with Power Query and Data Analysis Expressions (DAX).",
    durationMinutes: 100,
    questionFormat: "Microsoft does not publish an exact question count for PL-300",
    passingScorePolicy: "Minimum passing score 700",
  },
  units: [
    {
      title: "Prepare the Data",
      weight: 27.5,
      gate: "Given messy source files and a reporting need, choose the connection and storage mode, profile and clean the data in Power Query, and shape it into fact and dimension tables with working keys -- explaining each step's effect on refresh.",
      sources: [
        outline(
          "PL-300",
          "Prepare the data (25-30%)",
          [
            "Get or connect to data: Identify and connect to data sources or a shared semantic model; Change data source settings, including credentials and privacy levels; Choose between DirectLake, DirectQuery, and Import; Create and modify parameters",
            "Profile and clean the data: Evaluate data, including data statistics and column properties; Resolve inconsistencies, unexpected or null values, and data quality issues; Resolve data import errors",
            "Transform and load the data: Select appropriate column data types; Create and transform columns; Group and aggregate rows; Pivot, unpivot, and transpose data; Convert semi-structured data to a table; Create fact tables and dimension tables; Identify when to use reference or duplicate queries and the resulting impact; Merge and append queries; Identify and create appropriate keys for relationships; Configure data loading for queries",
          ],
          [PL300_FORMAT]
        ),
        PL300_DOCS.storage,
      ],
      objectives: [
        "Connecting Power BI Desktop to files, databases and an existing shared semantic model",
        "Setting data source credentials and privacy levels so that queries combine sources safely",
        "Choosing Import, DirectQuery or Direct Lake storage for a stated data size and freshness need",
        "Parameterizing a query (a server name, a date range) and changing the parameter later",
        "Profiling columns for distribution, quality and statistics before transforming them",
        "Cleaning nulls, inconsistent values and import errors in Power Query",
        "Setting column data types and adding custom, conditional and split columns",
        "Grouping and aggregating rows, and pivoting, unpivoting or transposing a table into shape",
        "Flattening JSON or other semi-structured data into a table",
        "Splitting a wide extract into a fact table and dimension tables",
        "Choosing a reference or a duplicate query and predicting what each does to refresh",
        "Combining queries with merge (a join) and append (a union)",
        "Building surrogate or natural keys that relationships can use",
        "Disabling load for staging queries that only feed other queries",
      ],
    },
    {
      title: "Model the Data",
      weight: 27.5,
      gate: "Given a star schema and a set of business questions, set the relationships and their filter direction, add a marked date table, and write the DAX measures (including CALCULATE and time intelligence) that answer the questions -- then find and fix the slowest one.",
      sources: [
        outline(
          "PL-300",
          "Model the data (25-30%)",
          [
            "Design and implement a data model: Configure table and column properties; Implement role-playing dimensions; Define a relationship's cardinality and cross-filter direction; Create a common date table; Identify use cases for calculated columns and calculated tables",
            "Create model calculations by using DAX: Create single aggregation measures; Use the CALCULATE function; Implement time intelligence measures; Use basic statistical functions; Create semi-additive measures; Create a measure by using quick measures; Create calculated tables or columns; Create calculation groups",
            "Optimize model performance: Improve performance by identifying and removing unnecessary rows and columns; Identify poorly performing measures, relationships, and visuals by using Performance Analyzer and DAX query view; Improve performance by reducing granularity",
          ],
          [PL300_FORMAT]
        ),
        PL300_DOCS.calculate,
        PL300_DOCS.dateTable,
      ],
      objectives: [
        "Setting table and column properties such as data category, format, sort-by column and hidden fields",
        "Modeling a role-playing date dimension with inactive relationships and USERELATIONSHIP",
        "Setting relationship cardinality and single or both-direction cross-filtering for a stated question",
        "Building and marking a shared date table",
        "Deciding between a measure, a calculated column and a calculated table",
        "Writing aggregation measures with SUM, AVERAGE, COUNTROWS and DISTINCTCOUNT",
        "Changing filter context with CALCULATE and filter modifiers such as ALL and REMOVEFILTERS",
        "Writing time intelligence measures for year-to-date and prior-period comparisons",
        "Applying statistical DAX functions such as MEDIAN and STDEV.P",
        "Writing semi-additive measures, such as a closing balance, that must not sum over time",
        "Generating a quick measure and reading the DAX it writes",
        "Creating calculation groups to reuse one time calculation across many measures",
        "Shrinking a model by removing unused columns and rows and reducing granularity",
        "Diagnosing slow visuals and measures with Performance Analyzer and DAX query view",
      ],
    },
    {
      title: "Visualize and Analyze the Data",
      weight: 27.5,
      gate: "Given a business question and a model, build a report page whose visuals, filters, drillthrough and bookmarks answer it, make it usable on mobile and with a screen reader, and use analytics features to point out the trend or outlier that matters.",
      sources: [
        outline(
          "PL-300",
          "Visualize and analyze the data (25-30%)",
          [
            "Create reports: Select an appropriate visual; Format and configure visuals; Create a narrative visual with Copilot; Apply and customize a theme; Apply conditional formatting; Apply slicing and filtering; Use Copilot to create a new report page; Use Copilot to suggest content for a new report page; Configure the report page; Choose when to use a paginated report; Create visual calculations by using DAX",
            "Enhance reports for usability and storytelling: Configure bookmarks; Create custom tooltips; Edit and configure interactions between visuals; Configure navigation for a report; Apply sorting to visuals; Configure sync slicers; Group and layer visuals by using the Selection pane; Configure drillthrough navigation, including pages, filters, and buttons; Configure export settings; Design reports for mobile devices; Enable personalization in a report, including personalized visuals; Design and configure Power BI reports for accessibility; Configure automatic page refresh",
            "Identify patterns and trends: Use the Analyze feature in Power BI; Use grouping, binning, and clustering; Use AI visuals; Use reference lines, error bars, and forecasting; Detect outliers and anomalies; Use Copilot to summarize the underlying semantic model",
          ],
          [PL300_FORMAT]
        ),
      ],
      objectives: [
        "Picking the visual type that fits a comparison, trend, composition or distribution question",
        "Formatting visuals and applying a report theme and conditional formatting",
        "Filtering a report with slicers, visual, page and report filters",
        "Using Copilot to draft a report page, suggest content and write a narrative visual, and checking what it produced",
        "Deciding when a paginated report fits better than an interactive one",
        "Writing visual calculations in DAX for running totals and comparisons inside a visual",
        "Building bookmarks, buttons and page navigation for a guided story",
        "Designing custom report-page tooltips and editing how visuals cross-filter each other",
        "Configuring drillthrough pages, sync slicers and the Selection pane",
        "Designing for mobile layouts, accessibility and personalized visuals",
        "Setting export options and automatic page refresh",
        "Finding patterns with Analyze, grouping, binning, clustering and AI visuals",
        "Adding reference lines, error bars and forecasts, and flagging outliers and anomalies",
      ],
    },
    {
      title: "Manage and Secure Power BI",
      weight: 17.5,
      gate: "Given a team that must share a report with internal viewers who each see only their region, set up the workspace, roles, app, refresh (with a gateway where needed) and row-level security, and prove the security works by testing it as a Viewer.",
      sources: [
        outline(
          "PL-300",
          "Manage and secure Power BI (15-20%)",
          [
            "Create and manage workspaces and assets: Create and configure a workspace; Configure and update an app; Publish, import, or update items in a workspace; Create dashboards; Choose a distribution method; Configure subscriptions and data alerts; Promote or certify Power BI content; Identify when a gateway is required; Configure a semantic model scheduled refresh",
            "Secure and govern Power BI items: Assign workspace roles; Configure item-level access; Configure access to semantic models; Implement row-level security roles; Configure row-level security group membership; Apply sensitivity labels",
          ],
          [PL300_FORMAT]
        ),
        PL300_DOCS.gateway,
        PL300_DOCS.rls,
      ],
      objectives: [
        "Creating a workspace and publishing, importing or updating its items",
        "Packaging content as an app and updating it for its audience",
        "Pinning visuals to a dashboard and setting subscriptions and data alerts",
        "Choosing a distribution method (app, sharing, embedding) for a stated audience",
        "Endorsing content as promoted or certified",
        "Deciding when an on-premises data gateway is required and scheduling a semantic model refresh",
        "Assigning workspace roles and item-level and semantic model permissions on least privilege",
        "Implementing row-level security roles with DAX filters and mapping groups to them",
        "Applying sensitivity labels to reports and semantic models",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// SC-500: Microsoft Certified: Cloud and AI Security Engineer Associate
// (replaces AZ-500, retired 2026-08-31)
// ---------------------------------------------------------------------------
const SC500_FORMAT = [
  "SC-500: 120 minutes, passing score 700; the study guide prints no skills-measured date (published 2026-04-26, updated 2026-07-31) and Microsoft does not publish a question count",
  "SC-500 replaces Azure Security Engineer Associate (AZ-500), which retired on 2026-08-31",
];

const SC500_DOCS = {
  pim: doc("What is Microsoft Entra Privileged Identity Management?", "entra/id-governance/privileged-identity-management/pim-configure", [
    "PIM gives just-in-time, time-bound privileged access to Microsoft Entra and Azure resources with approval and audit; it requires Microsoft Entra ID Governance licensing",
  ]),
  keyVault: doc("Azure Key Vault soft-delete overview", "azure/key-vault/general/soft-delete-overview", [
    "Deleted vaults, keys, secrets and certificates stay recoverable for 7 to 90 days (90 by default); the retention period is set when the vault is created and cannot be changed afterward, and the same interval applies to purge protection",
  ]),
  locks: doc("Lock your Azure resources", "azure/azure-resource-manager/management/lock-resources", [
    "A CanNotDelete (Delete) lock allows reads and changes but not deletion; a ReadOnly lock allows reads only, like restricting every user to Reader",
  ]),
  nsg: doc("Azure network security groups overview", "azure/virtual-network/network-security-groups-overview", [
    "NSG rule priorities run from 100 to 4096; lower numbers are processed first and processing stops at the first match; default rules have the lowest priority",
  ]),
  bastion: doc("What is Azure Bastion?", "azure/bastion/bastion-overview", [
    "Azure Bastion gives RDP and SSH to VMs over TLS on port 443 from the portal or a native client, so the VMs need no public IP address",
  ]),
  jit: doc("Defender for Cloud: just-in-time VM access", "azure/defender-for-cloud/just-in-time-access-usage", [
    "Just-in-time access opens management ports on a VM only on request, for the chosen ports, source and time, instead of leaving allow rules open",
  ]),
  sentinelRoles: doc("Roles and permissions in the Microsoft Sentinel platform", "azure/sentinel/roles", [
    "Microsoft Sentinel Reader views data and incidents; Microsoft Sentinel Responder adds managing incidents; Microsoft Sentinel Contributor can also create and edit analytics rules, workbooks and other content",
  ]),
};

export const SC500_TRACK: SeedTrack = {
  code: "SC500",
  title: "Exam Prep for Microsoft Cloud and AI Security Engineer Associate (SC-500)",
  description: `Microsoft Certified: Cloud and AI Security Engineer Associate (SC-500), the successor to the retired Azure Security Engineer Associate (AZ-500): identity, Key Vault and governance controls; securing storage, databases and networks; securing AI workloads, servers and application platforms; and managing posture with Defender for Cloud, Microsoft Sentinel and Security Copilot. ${NOTICE}`,
  trackType: "certification",
  subcategorySlug: "azure-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://learn.microsoft.com/en-us/credentials/certifications/cloud-and-ai-security-engineer-associate/",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  credential: {
    ...MS_PROVIDER,
    credentialSlug: "cloud-and-ai-security-engineer-associate",
    credentialName: "Microsoft Certified: Cloud and AI Security Engineer Associate",
    credentialUrl: "https://learn.microsoft.com/en-us/credentials/certifications/cloud-and-ai-security-engineer-associate/",
    examCode: "SC-500",
    status: "active",
    versionNote:
      "The SC-500 study guide prints no 'skills measured as of' date or change log; the guide read 2026-11-14 was published 2026-04-26 and last updated 2026-07-31. SC-500 replaces AZ-500 (retired 2026-08-31).",
    officialObjectivesUrl: `${GUIDE}sc-500`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Practical experience administering Azure and hybrid compute, network and storage; strong familiarity with Microsoft Entra ID and familiarity with Microsoft 365 administration.",
    durationMinutes: 120,
    questionFormat: "Microsoft does not publish an exact question count for SC-500; the exam may include interactive components",
    passingScorePolicy: "Minimum passing score 700",
  },
  units: [
    {
      title: "Manage Identity, Access, and Governance",
      weight: 24,
      gate: "Given an Azure tenant with standing admin rights, shared secrets in app settings and no guardrails, name the specific Entra, Key Vault, RBAC and Policy controls that fix each gap, in the order you would apply them.",
      sources: [
        outline(
          "SC-500",
          "Manage identity, access, and governance (20-25%)",
          [
            "Secure access to resources by using Microsoft Entra ID: Implement and configure Privileged Identity Management (PIM); Implement conditional access policies; Implement and configure authentication methods, including multifactor authentication (MFA) and passwordless; Implement and configure identity for applications, including enterprise applications and app registrations; Manage OAuth permission grants and consent settings; Implement and configure managed identities for Azure resources",
            "Secure secrets and keys by using Azure Key Vault: Deploy Key Vault; Configure Key Vault settings; Configure access to Key Vault; Configure firewall settings on Key Vault; Manage keys, secrets, and certificates; Scan for secrets by using Defender Cloud Security Posture Management (Defender CSPM); Implement Defender for Key Vault",
            "Implement governance to enforce security and regulatory compliance: Implement and configure security controls by using Azure Policy, including built-in and custom policy definitions; Evaluate regulatory compliance by using Microsoft Defender for Cloud; Implement and configure security controls in Defender for Cloud, including security standards and recommendations; Implement resource locks; Manage Azure built-in role assignments; Manage custom roles, including Azure roles and Microsoft Entra roles; Evaluate and remediate overprivileged access assignments by using Azure role-based access control (RBAC); Configure security controls for backup protection by using Azure Backup security features; Implement and configure security controls by using infrastructure as code",
          ],
          SC500_FORMAT
        ),
        SC500_DOCS.pim,
        SC500_DOCS.keyVault,
        SC500_DOCS.locks,
      ],
      objectives: [
        "Making privileged roles eligible rather than permanent with PIM activation, approval and time limits",
        "Writing conditional access policies that require MFA or compliant devices for stated risk conditions",
        "Rolling out phishing-resistant and passwordless authentication methods",
        "Securing app registrations and enterprise applications, including OAuth consent and permission grants",
        "Replacing stored credentials with system- or user-assigned managed identities",
        "Deploying Key Vault with RBAC access, network firewall rules, soft delete and purge protection",
        "Managing keys, secrets and certificates, and finding exposed secrets with Defender CSPM",
        "Turning on Defender for Key Vault and acting on its alerts",
        "Enforcing guardrails with built-in and custom Azure Policy definitions",
        "Measuring regulatory compliance and acting on security recommendations in Defender for Cloud",
        "Protecting critical resources with CanNotDelete and ReadOnly locks",
        "Assigning built-in roles, building custom Azure and Entra roles, and removing overprivileged assignments",
        "Hardening backups with Azure Backup security features such as soft delete and multi-user authorization",
        "Encoding security controls in infrastructure as code so they deploy the same way every time",
      ],
    },
    {
      title: "Secure Storage, Databases, and Networking",
      weight: 29,
      gate: "Given a web app whose storage account, Azure SQL database and VMs are reachable from the internet, design the network and data controls that leave only the intended paths open, and show how you would prove which rule allows or blocks a given flow.",
      sources: [
        outline(
          "SC-500",
          "Secure storage, databases, and networking (25-30%)",
          [
            "Implement security for storage accounts: Implement and configure security for storage accounts; Configure Azure Storage firewall rules; Implement Defender for Storage threat protection configurations; Manage access to storage, including access policies",
            "Implement security for databases: Implement platform-level security configurations in Azure SQL; Configure database auditing for Azure SQL Database and Azure SQL Managed Instance; Configure Defender for Databases protection across Azure database services",
            "Implement security for Azure network services: Implement and manage network security groups (NSGs) and application security groups (ASGs); Implement and configure network access policies by using Azure Virtual Network Manager; Configure security for an Azure Virtual WAN; Implement and configure security for virtual private network (VPN) connections; Implement and configure Microsoft Entra Private Access; Configure Azure private endpoints to secure access to Azure platform as a service (PaaS) resources; Configure Azure Private Link services to secure access to network resources; Implement and configure Azure Firewall; Evaluate effective security rules by using Azure Network Watcher diagnostics",
          ],
          SC500_FORMAT
        ),
        SC500_DOCS.nsg,
      ],
      objectives: [
        "Hardening storage accounts: disabling shared key and public blob access, and requiring secure transfer",
        "Restricting storage network access with firewall rules and trusted-service exceptions",
        "Configuring Defender for Storage malware scanning and threat detection",
        "Granting storage access with Entra RBAC, user delegation SAS and stored access policies",
        "Securing Azure SQL with Entra-only authentication, firewall rules and transparent data encryption",
        "Auditing Azure SQL Database and Managed Instance to a Log Analytics workspace or storage",
        "Enabling Defender for Databases across Azure SQL, open-source databases and Cosmos DB",
        "Filtering traffic with NSG rules and application security groups, reading rule priority",
        "Applying organization-wide security admin rules with Azure Virtual Network Manager",
        "Securing Virtual WAN hubs and site-to-site and point-to-site VPN connections",
        "Replacing broad VPN access with Microsoft Entra Private Access per application",
        "Reaching PaaS services privately with private endpoints and exposing your own services with Private Link",
        "Inspecting and filtering traffic centrally with Azure Firewall rules and policies",
        "Troubleshooting effective security rules with Network Watcher IP flow verify and effective rules",
      ],
    },
    {
      title: "Secure Compute",
      weight: 24,
      gate: "Given a workload that runs AI agents on Foundry, VMs and containers behind an API, name the specific control for each risk -- data overexposure, agent identity, model abuse, VM management ports, container image flaws -- and where its alerts land.",
      sources: [
        outline(
          "SC-500",
          "Secure compute (20-25%)",
          [
            "Implement security for AI: Identify overexposure of data in SharePoint; Identify risks related to Microsoft Copilot and AI apps by using Microsoft Purview Data Security Posture Management (DSPM); Enable and configure real-time protection for Microsoft Copilot Studio agents; Implement conditional access for Microsoft Entra Agent ID; Analyze blast radius for security risks related to Entra Agent ID by using Defender XDR; Manage Entra Agent ID access; Configure and deploy AI Gateway in Azure API Management for Microsoft Foundry; Enable Defender for AI Service in Cloud Workload Protection in Defender for Cloud; Configure guardrails for agent security in Foundry; Monitor AI security by using the Data and AI security dashboard in Defender for Cloud; Manage agents in Microsoft 365 admin center",
            "Implement security for servers and virtual machines (VMs): Implement and configure disk encryption; Plan and implement Azure Bastion; Enable and enforce use of just-in-time (JIT) VM access; Extend security controls to hybrid and multicloud servers by using Azure Arc; Onboard servers to Defender for Servers in Defender for Cloud, including hybrid and multicloud scenarios; Configure Defender for Servers settings, including vulnerability scanning, and endpoint detection and response (EDR); Implement and manage agentless scanning for VMs in Defender for Servers; Configure security features on a VM, including secure boot, virtual Trusted Platform Module (vTPM), integrity monitoring, and security type; Enforce security configuration of Azure-managed servers by using Azure Machine Configuration",
            "Implement security for application platform services: Detect misconfigurations and runtime risks in container workloads by using Defender for Containers; Implement and configure security controls for Azure Kubernetes Service (AKS); Implement and configure security controls for Azure Container Registry; Implement and configure security controls for Azure Container Instances and Azure Container Apps; Implement and configure security controls for Azure Functions, including authentication and network access; Implement and configure security controls for Azure Logic Apps; Implement and configure security controls for Azure App Service; Implement and configure Azure Web Application Firewall; Implement security policies for back-end API protection by using API Management",
          ],
          SC500_FORMAT
        ),
        SC500_DOCS.bastion,
        SC500_DOCS.jit,
      ],
      objectives: [
        "Finding overshared SharePoint content and Copilot and AI app data risks with Purview DSPM",
        "Protecting Copilot Studio agents with real-time protection and managing agents in the Microsoft 365 admin center",
        "Governing agent identities with Entra Agent ID access controls, conditional access and Defender XDR blast-radius analysis",
        "Fronting Foundry models with the AI gateway in API Management and setting agent guardrails in Foundry",
        "Turning on Defender for AI services and watching the Data and AI security dashboard",
        "Encrypting VM disks and choosing secure boot, vTPM and the Trusted launch or confidential security type",
        "Removing public management ports with Azure Bastion and just-in-time VM access",
        "Extending Defender for Servers to hybrid and multicloud machines through Azure Arc",
        "Configuring Defender for Servers vulnerability scanning, EDR and agentless scanning",
        "Enforcing OS configuration baselines with Azure Machine Configuration",
        "Securing AKS, Container Registry, Container Instances and Container Apps, and acting on Defender for Containers findings",
        "Securing Functions, Logic Apps and App Service with authentication and private network access",
        "Blocking web attacks with Web Application Firewall and protecting back-end APIs with API Management policies",
      ],
    },
    {
      title: "Manage and Monitor Security Posture",
      weight: 23,
      gate: "Given a multicloud estate with no central monitoring, plan the Defender for Cloud plans, connectors, Sentinel workspace, data collection, roles, automation and retention that would let a small team see and respond to a stated attack -- and what Security Copilot adds.",
      sources: [
        outline(
          "SC-500",
          "Manage and monitor security posture (20-25%)",
          [
            "Manage security posture by using Defender for Cloud: Identify security risks by using Defender CSPM; Evaluate compliance against security frameworks by using Defender for Cloud; Enable and configure Defender for Cloud workload protection plans; Connect hybrid cloud and multicloud environments to Defender for Cloud, including Amazon Web Services (AWS) and Google Cloud Platform (GCP); Configure Microsoft Defender Vulnerability Management settings for Azure VMs; Discover unprotected assets and vulnerabilities by using Microsoft Defender External Attack Surface Management (EASM)",
            "Implement activity and event collection in Microsoft Sentinel: Create and connect workspaces in Microsoft Sentinel; Assign roles in Microsoft Sentinel; Implement and use content hub solutions; Configure and use Microsoft data connectors for Azure resources; Implement and configure syslog and Common Event Format (CEF) event collections; Implement and configure collection of Windows Security events by using data collection rules, including Windows Event Forwarding (WEF); Create custom log tables in the workspace to store ingested data; Implement automation rules and playbooks in Microsoft Sentinel; Implement data retention in Microsoft Sentinel data stores; Query Microsoft Purview Audit in Defender XDR",
            "Implement Microsoft Security Copilot: Configure workspaces for Security Copilot; Manage permissions and roles in Security Copilot; Enable and configure plugins; Enable and configure Microsoft agents and Security Store agents",
          ],
          SC500_FORMAT
        ),
        SC500_DOCS.sentinelRoles,
      ],
      objectives: [
        "Prioritizing risks with Defender CSPM attack paths and the cloud security explorer",
        "Assessing compliance against frameworks such as the Microsoft cloud security benchmark",
        "Choosing and enabling Defender for Cloud workload protection plans",
        "Connecting AWS, Google Cloud and on-premises machines to Defender for Cloud",
        "Configuring Defender Vulnerability Management for Azure VMs and finding exposed assets with Defender EASM",
        "Creating a Sentinel workspace and assigning Reader, Responder and Contributor roles on least privilege",
        "Installing content hub solutions and connecting Azure data connectors",
        "Collecting syslog, CEF and Windows Security events with data collection rules",
        "Storing custom data in custom log tables and setting retention per table",
        "Automating incident handling with automation rules and playbooks",
        "Searching Microsoft Purview Audit records from Defender XDR",
        "Setting up Security Copilot workspaces, roles, plugins and agents",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// AI-200: Microsoft Certified: Azure AI Cloud Developer Associate
// (replaces AZ-204, retired 2026-07-31)
// ---------------------------------------------------------------------------
const AI200_FORMAT = [
  "AI-200: 120 minutes, passing score 700; the study guide prints no skills-measured date (published 2026-04-15, updated 2026-11-05) and Microsoft does not publish a question count",
  "AI-200 replaces Azure Developer Associate (AZ-204), which retired on 2026-07-31; candidates are expected to be proficient in Python",
];

const AI200_DOCS = {
  keda: doc("Scaling in Azure Container Apps", "azure/container-apps/scale-app", [
    "Container Apps scales with KEDA (Kubernetes Event-driven Autoscaling) on HTTP traffic, queue messages, CPU, memory and event sources such as Service Bus and Event Hubs",
  ]),
  cosmosConsistency: doc("Azure Cosmos DB: consistency levels", "azure/cosmos-db/consistency-levels", [
    "Azure Cosmos DB offers five consistency levels, strongest to weakest: Strong, Bounded staleness, Session, Consistent prefix and Eventual",
  ]),
  cosmosVector: doc("Azure Cosmos DB: integrated vector store", "azure/cosmos-db/vector-search", [
    "Cosmos DB for NoSQL vector indexes are flat (exact kNN), quantizedFlat (compressed exact search) and DiskANN (approximate search at scale)",
  ]),
  pgvector: doc("Azure Database for PostgreSQL: vector search with pgvector", "azure/postgresql/extensions/how-to-use-pgvector", [
    "The pgvector extension adds a vector type and similarity search to PostgreSQL; it must be allow-listed and created (CREATE EXTENSION vector) before use",
  ]),
  serviceBus: doc("Service Bus dead-letter queues", "azure/service-bus-messaging/service-bus-dead-letter-queues", [
    "A message whose delivery count exceeds the maximum (10 by default) moves to the dead-letter queue with reason MaxDeliveryCountExceeded; this cannot be turned off",
  ]),
  functions: doc("Azure Functions scale and hosting", "azure/azure-functions/functions-scale", [
    "The Consumption plan is legacy: new serverless function apps should use the Flex Consumption plan, and Linux apps on the Consumption plan retire on 2028-09-30",
  ]),
  appConfig: doc("What is Azure App Configuration?", "azure/azure-app-configuration/overview", [
    "App Configuration centrally stores application settings and feature flags; it complements Azure Key Vault, which is where application secrets are stored",
  ]),
  kql: doc("Kusto Query Language (KQL) overview", "kusto/query/", [
    "A KQL query is read-only; operators are chained with | so each step filters or shapes the table the previous step produced",
  ]),
};

export const AI200_TRACK: SeedTrack = {
  code: "AI200",
  title: "Exam Prep for Azure AI Cloud Developer Associate (AI-200)",
  description: `Microsoft Certified: Azure AI Cloud Developer Associate (AI-200), the successor to the retired Azure Developer Associate (AZ-204): containerized apps on Container Registry, App Service, Container Apps and AKS; AI data solutions on Cosmos DB, PostgreSQL with pgvector and Azure Managed Redis; Service Bus, Event Grid and Azure Functions; and Key Vault, App Configuration, OpenTelemetry and KQL. ${NOTICE}`,
  trackType: "certification",
  subcategorySlug: "azure-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-cloud-developer-associate/",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  credential: {
    ...MS_PROVIDER,
    credentialSlug: "azure-ai-cloud-developer-associate",
    credentialName: "Microsoft Certified: Azure AI Cloud Developer Associate",
    credentialUrl: "https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-cloud-developer-associate/",
    examCode: "AI-200",
    status: "active",
    versionNote:
      "The AI-200 study guide prints no 'skills measured as of' date or change log; the guide read 2026-11-14 was published 2026-04-15 and last updated 2026-11-05. AI-200 replaces AZ-204 (retired 2026-07-31).",
    officialObjectivesUrl: `${GUIDE}ai-200`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Contributes to every phase of building AI solutions on Azure with an emphasis on back-end services; proficient with Azure and third-party SDKs, Azure data, messaging and monitoring services, vector databases, Python and containerized applications.",
    durationMinutes: 120,
    questionFormat: "Microsoft does not publish an exact question count for AI-200; the exam may include interactive components",
    passingScorePolicy: "Minimum passing score 700",
  },
  units: [
    {
      title: "Develop Containerized Solutions on Azure",
      weight: 24,
      gate: "Given a Python API and a background worker, build and version their images in Container Registry, choose App Service, Container Apps or AKS for each with a reason, configure secrets and scaling, and diagnose a failed revision from its logs.",
      sources: [
        outline(
          "AI-200",
          "Develop containerized solutions on Azure (20-25%)",
          [
            "Implement container application hosting: Build, store, version, and manage container images by using Azure Container Registry; Build and run images by using Azure Container Registry Tasks; Deploy containers to Azure App Service, including configuring App Service to supply environment variables and secrets",
            "Implement container-orchestrated solutions: Deploy applications to Azure Container Apps, including environment configuration and revision management; Implement event-driven scaling by using Kubernetes Event‑driven Autoscaling (KEDA) in Container Apps; Deploy and manage applications to Azure Kubernetes Service (AKS) by using manifest files; Monitor and troubleshoot solutions on AKS and Container Apps by inspecting logs, events, and end-to-end connectivity",
          ],
          AI200_FORMAT
        ),
        AI200_DOCS.keda,
      ],
      objectives: [
        "Building, tagging and storing container images in Azure Container Registry",
        "Automating image builds with Container Registry Tasks",
        "Running a container on App Service with app settings and Key Vault-backed secrets",
        "Deploying to Container Apps environments and splitting traffic between revisions",
        "Scaling a Container App on queue length or HTTP load with KEDA scale rules",
        "Deploying and updating an AKS workload from Kubernetes manifests",
        "Troubleshooting AKS and Container Apps from logs, events and connectivity checks",
      ],
    },
    {
      title: "Develop AI Solutions by Using Azure Data Management Services",
      weight: 29,
      gate: "Given a retrieval-augmented app that must search product documents by meaning and filter by tenant, choose Cosmos DB, PostgreSQL with pgvector or Redis for each job, design the schema and vector index, and explain the cost and latency tradeoffs of your choices.",
      sources: [
        outline(
          "AI-200",
          "Develop AI solutions by using Azure data management services (25-30%)",
          [
            "Develop AI solutions by using Azure Cosmos DB for NoSQL: Connect to Azure Cosmos DB for NoSQL by using the SDK and run queries; Optimize query performance and Request Units (RUs) consumption by using indexing policies and consistency levels; Store and retrieve embeddings and execute vector similarity search for semantic retrieval; Implement a change feed processor to detect and handle new or updated items",
            "Develop AI solutions by using Azure Database for PostgreSQL: Connect and query Azure Database for PostgreSQL by using SDKs; Model schemas and implement indexing strategies, including designing tables and choosing appropriate data types; Implement indexing strategies, including optimizing query latency and reducing pgvector compute overhead; Configure compute, memory, and storage resources to support vector workloads; Run vector similarity search, including storing embeddings, semantic retrieval, and implementing retrieval-augmented generation (RAG) patterns by using metadata filter; Implement connection optimization to improve throughput and minimize latency",
            "Integrate Azure Managed Redis in AI solutions: Implement Azure Managed Redis data operations, including caching, expiration, and invalidation; Implement vector indexing to enable similarity search",
          ],
          AI200_FORMAT
        ),
        AI200_DOCS.cosmosConsistency,
        AI200_DOCS.cosmosVector,
        AI200_DOCS.pgvector,
      ],
      objectives: [
        "Querying Cosmos DB for NoSQL from the SDK with a partition key that keeps queries in one partition",
        "Cutting RU cost with indexing policies and choosing a consistency level for the read pattern",
        "Storing embeddings in Cosmos DB and running vector similarity queries with a vector index",
        "Reacting to new and changed items with the change feed processor",
        "Connecting to Azure Database for PostgreSQL from an SDK and designing tables with suitable data types",
        "Indexing vectors with pgvector (HNSW or IVFFlat) and trading recall against query cost",
        "Sizing PostgreSQL compute, memory and storage for a vector workload",
        "Building a RAG retrieval query that combines vector similarity with metadata filters",
        "Pooling and reusing database connections to raise throughput",
        "Caching results in Azure Managed Redis with expiration and invalidation",
        "Indexing vectors in Azure Managed Redis for low-latency similarity search",
      ],
    },
    {
      title: "Connect to and Consume Azure Services",
      weight: 24,
      gate: "Given an upload that must trigger summarization, retries and a notification, choose between Service Bus, Event Grid and Functions triggers for each step, handle poison messages, and deploy the function app to the right hosting plan.",
      sources: [
        outline(
          "AI-200",
          "Connect to and consume Azure services (20-25%)",
          [
            "Develop event- and message-based AI solutions: Queue and process back-end operations by using Azure Service Bus, including dead-letter queue handling, messages, topics, and subscriptions; Implement event-driven workflows by using Azure Event Grid, including filters, custom events, and retries",
            "Develop and implement Azure Functions: Build serverless APIs, including implementing triggers and bindings; Configure and deploy function apps",
          ],
          AI200_FORMAT
        ),
        AI200_DOCS.serviceBus,
        AI200_DOCS.functions,
      ],
      objectives: [
        "Sending and receiving Service Bus messages through queues, topics and subscriptions",
        "Handling poison messages through the dead-letter queue and resubmitting them",
        "Routing custom events with Event Grid subscriptions, filters and retry policies",
        "Writing serverless APIs with Azure Functions triggers and input and output bindings",
        "Configuring and deploying function apps on the Flex Consumption plan",
      ],
    },
    {
      title: "Secure, Monitor, and Troubleshoot Azure Solutions",
      weight: 23,
      gate: "Given a service that keeps its connection strings in code and fails intermittently in production, move its secrets and settings to the right stores with rotation, instrument it with OpenTelemetry, and write the KQL query that finds the failing dependency.",
      sources: [
        outline(
          "AI-200",
          "Secure, monitor, and troubleshoot Azure solutions (20-25%)",
          [
            "Implement secure Azure solutions: Secure secrets by using Azure Key Vault, including rotation and retrieval; Store and retrieve app configuration information by using Azure App Configuration",
            "Monitor and troubleshoot Azure solutions: Trace distributed systems by using OpenTelemetry SDKs; Write KQL queries to analyze logs and metrics",
          ],
          AI200_FORMAT
        ),
        SC500_DOCS.keyVault,
        AI200_DOCS.appConfig,
        AI200_DOCS.kql,
      ],
      objectives: [
        "Reading secrets from Key Vault with a managed identity and planning their rotation",
        "Centralizing settings and feature flags in App Configuration with Key Vault references",
        "Tracing requests across services with the OpenTelemetry SDK and Azure Monitor",
        "Analyzing logs and metrics with KQL to find errors, slow calls and their causes",
      ],
    },
  ],
};

export const MICROSOFT_2026_TRACKS: SeedTrack[] = [PL300_TRACK, SC500_TRACK, AI200_TRACK];
