import { GENERAL_SAFETY, part, type SeedLabSet, matchPart } from "./types";
import { source } from "../sources";

// REQ-155: Microsoft Certified: Azure Fundamentals (AZ-900).
//
// Aligned to the AZ-900 study guide, skills measured as of July 20, 2026
// (Describe cloud concepts 25-30% / Describe Azure architecture and services
// 35-40% / Describe Azure management and governance 30-35%), re-read on
// 2026-11-07:
//   https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900
// Density (docs/labs.md, policy "hybrid") for the seed's unit weights 28/39/33:
// 3 / 2 / 3. AZ-900 is a fundamentals exam, so every lab is a build lab or a
// short case that asks the learner to APPLY a concept to a stated scenario
// (pick a service type, a redundancy option, a governance control, a cost
// tool) and say why -- never to configure anything. The exam's own wording
// is "identify appropriate use cases", so the labs land on those bullets.
//
// Sources behind the figures (all learn.microsoft.com, checked 2026-11-07;
// kinds for the REQ-142 source shape once PR #44 lands: the study guide is
// exam_outline, the rest reference / cloud_pricing_limits):
//   storage redundancy durability (LRS 11 nines, ZRS 12, GRS/GZRS 16; paired
//   secondary; RA- read access): /azure/storage/common/storage-redundancy
//   management groups (10,000 per directory, six levels of depth excluding
//   root and subscription, one parent, root can't be deleted; RBAC and policy
//   inherit): /azure/governance/management-groups/overview
//   policy effects and their evaluation order: /azure/governance/policy/concepts/effect-basics
//   locks (CanNotDelete, ReadOnly, inheritance, Owner/UAA can manage):
//   /azure/azure-resource-manager/management/lock-resources
//   built-in roles (Owner, Contributor, Reader, User Access Administrator):
//   /azure/role-based-access-control/built-in-roles
//   savings plans vs reservations (1- or 3-year terms; flexibility vs deeper
//   discount): /azure/cost-management-billing/savings-plan/savings-plan-overview
//   Azure Monitor alert types, action groups, processing rules:
//   /azure/azure-monitor/alerts/alerts-overview

export const AZ900_LABS: SeedLabSet = {
  trackCode: "AZ900",
  sources: [
    source("https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900", "exam_outline", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/governance/management-groups/overview", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-basics", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/savings-plan-overview", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Cloud Concepts (3)
    // ----------------------------------------------------------------------
    {
      slug: "service-type-for-each-workload",
      objective: "Choosing the right cloud service type -- IaaS, PaaS, or SaaS -- for a given use case",
      kind: "build",
      title: "Pick IaaS, PaaS or SaaS for four workloads",
      brief:
        "Harbourline Logistics, a fictional freight company, is moving four things to the cloud. (1) A 15-year-old Windows dispatch application that needs a specific OS patch level and a licensed third-party driver; the vendor will only support it on a server the company controls. (2) A new customer-tracking web API the in-house team is writing; they want to push code and have the platform handle the OS, patching and scaling. (3) Company email and calendars, currently on an aging on-premises mail server nobody wants to maintain. (4) A nightly job that converts 2,000 scanned delivery notes to PDF and runs for about 20 minutes; it should cost nothing when idle. For each, name the cloud service type, an Azure service that fits, and who patches the operating system under the shared responsibility model.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the service-type recommendation for each of the four workloads.",
          parts: [
            part(
              "Legacy dispatch application",
              "Chooses IaaS (Azure Virtual Machines) because the app needs control of the OS, patch level and drivers, and states that the customer patches the guest OS while Microsoft runs the physical hosts and network.",
              "IaaS: an Azure virtual machine. The vendor needs a controlled OS build and a custom driver, which only a VM gives. Under shared responsibility Microsoft owns the datacenter, hosts and hypervisor; Harbourline owns the guest OS, patching, the application and its data."
            ),
            part(
              "New customer-tracking API",
              "Chooses PaaS (Azure App Service, or a similar managed application platform) because the team wants to deploy code without managing servers, and states that Microsoft patches the OS and runtime while the customer owns the code, configuration and data.",
              "PaaS: Azure App Service. The team deploys code; the platform patches the OS and runtime and scales out. Microsoft is responsible for the OS and platform; Harbourline for the application code, its settings, identities and data."
            ),
            part(
              "Email and calendars",
              "Chooses SaaS (for example Microsoft 365 / Exchange Online) because the company wants a finished service with nothing to maintain, and states that the provider owns the whole stack and the customer owns accounts, access and data.",
              "SaaS: a hosted email service such as Exchange Online in Microsoft 365. Nothing to patch or scale; Harbourline manages users, access and information protection, and the data stays theirs."
            ),
            part(
              "Nightly PDF conversion job",
              "Chooses serverless / PaaS (Azure Functions, or a similar consumption-billed compute) because the job is short, event- or schedule-driven, and should cost nothing while idle; notes that consumption-based billing charges per execution rather than for a running server.",
              "Serverless PaaS: Azure Functions on a consumption plan, triggered on a schedule. It runs for the 20 minutes the job needs and is billed per execution, so an idle night costs nothing -- unlike a VM that is billed while it is running whether or not it is busy."
            ),
          ],
        },
      ],
    },
    {
      slug: "cloud-model-for-each-situation",
      objective: "Public, private, and hybrid cloud models, and which situations fit each",
      kind: "build",
      title: "Choose public, private or hybrid for three organizations",
      brief:
        "You advise three fictional organizations. Meridian Credit Union is bound by a regulator's rule that customer account data must stay in a facility the credit union owns and audits, but its staff want a modern self-service portal for provisioning internal test environments. Pine Street Bakery, with six shops, has no IT staff and wants a point-of-sale back end, a website and email with no servers to run. Northwind Hospital keeps its patient-record system in its own datacenter for the next five years under an existing contract, but wants to burst its research analytics into cloud compute at month-end and back up the record system off-site. For each, recommend a cloud deployment model and justify it against the stated constraint.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Recommend a deployment model for each organization and give the deciding reason.",
          parts: [
            matchPart("Deployment model for each organization", "Meridian: private; Pine Street: public; Northwind: hybrid. All three right is met; two is partly there.", "Meridian Credit Union -> private cloud (the data must stay in a facility it owns, with self-service on top). Pine Street Bakery -> public cloud (no IT staff, no servers, pay as you go). Northwind Hospital -> hybrid cloud (records stay on premises under contract; analytics bursts and backups go to the public cloud).", {"leftHeading": "Organisation", "rightHeading": "Deployment model", "left": ["Meridian Credit Union", "Pine Street Bakery", "Northwind Hospital"], "right": ["Private cloud", "Public cloud", "Hybrid cloud"], "pairs": [0, 1, 2]}),
            part("Deciding reasons", "Justifies each against its stated constraint: Meridian Credit Union: Recommends a private cloud (cloud-style self-service and automation on infrastructure the credit union owns and controls, for example with Azure Stack HCI / Azure Local or a similar on-premises platform) because the regulation fixes where the data lives, while still delivering the self-service the staff want. Pine Street Bakery: Recommends public cloud, citing no capital spend, no servers to maintain, pay-as-you-go pricing and SaaS options for email and web, which fit an organization with no IT staff. Northwind Hospital: Recommends hybrid cloud: the record system stays on-premises for the contract term while analytics bursts to public cloud and backups go off-site to cloud storage; names a connection (VPN or ExpressRoute) and, optionally, Azure Arc to manage both sides as one estate.", "Meridian Credit Union: Private cloud: the regulator fixes the location and control of the data, so public cloud is out for that workload, but a private cloud still gives staff self-service provisioning and automation on hardware the credit union owns and audits (Azure Local / Azure Stack HCI is one way to run that with Azure tooling). Pine Street Bakery: Public cloud: no hardware, no capital outlay, no staff needed to run servers. Email and the website come as SaaS, the point-of-sale back end as PaaS, all billed for what is used. Northwind Hospital: Hybrid cloud: the patient-record system stays in the hospital datacenter until the contract ends, connected to Azure over VPN or ExpressRoute; month-end analytics bursts to Azure compute and the record system is backed up to Azure Storage. Azure Arc can bring the on-premises servers under the same management and policy as the cloud resources."),
          ],
        },
      ],
    },
    {
      slug: "pricing-model-for-each-workload",
      objective: "The consumption-based (pay-as-you-go) pricing model, and comparing it against other cloud pricing models",
      kind: "build",
      title: "Match a pricing approach to each workload",
      brief:
        "Tollgate Analytics, a fictional company, reviews its Azure bill. (1) A set of virtual machines for its core platform has run around the clock, at the same size, for two years and will run for at least three more. (2) A new product team's compute use changes every month: some months App Service, some months VMs of different sizes, some months containers, but the total hourly spend is fairly steady. (3) A proof-of-concept machine-learning environment will exist for six weeks and may be deleted at any time. (4) A data-processing job can run at any time of day, tolerates being stopped and restarted, and has no deadline. Recommend a pricing approach for each and explain what each gives up compared with plain pay-as-you-go.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the pricing recommendation for each of the four workloads.",
          parts: [
            part(
              "Steady core VMs",
              "Recommends an Azure Reservation (reserved VM instances) on a one- or three-year term for a fixed size and region, noting the deeper discount in exchange for committing to that specific resource, size and region.",
              "A reservation (1- or 3-year) for those VM sizes in that region: the usage is stable and predictable, which is exactly what a reservation rewards with the deepest discount. The trade-off is that the commitment is tied to that resource, size and region."
            ),
            part(
              "Variable product-team compute",
              "Recommends an Azure savings plan for compute (a fixed dollar-per-hour commitment for one or three years that applies across eligible compute services and regions), because the spend is steady but the services and sizes change.",
              "A savings plan for compute: commit to a fixed amount per hour for 1 or 3 years and the discount applies automatically across VMs, App Service, Container Apps and other eligible compute wherever they run. Less discount than a reservation, but the flexibility fits a team that changes services monthly."
            ),
            part(
              "Six-week proof of concept",
              "Recommends plain pay-as-you-go (consumption-based) with no commitment, because the environment is short-lived and may be deleted early; a term commitment would outlive it.",
              "Pay-as-you-go: six weeks is far shorter than any commitment term and the environment may be deleted at any point. The higher unit price buys the freedom to stop paying the moment it is gone."
            ),
            part(
              "Interruptible processing job",
              "Recommends Azure Spot Virtual Machines (unused capacity at a steep discount that Azure can evict when it needs the capacity), noting the job tolerates eviction and has no deadline.",
              "Spot VMs: the job can be stopped and restarted and has no deadline, so it can use spare capacity at a large discount and simply resume if Azure evicts it. Not for anything that must finish on time."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Azure Architecture and Services (2)
    // ----------------------------------------------------------------------
    {
      slug: "storage-redundancy-for-four-datasets",
      objective: "Redundancy options for Azure Storage",
      kind: "build",
      title: "Choose a storage redundancy option for four datasets",
      brief:
        "Cobalt Media, a fictional publisher, is creating storage accounts for four datasets. (1) Rendering scratch files that are regenerated nightly; losing them costs an hour of compute, nothing more, and the budget is tight. (2) The master archive of every published issue, which must survive the loss of an entire Azure region. (3) Subscriber records that must survive the loss of a datacenter within the region but whose regulator forbids a copy leaving the region. (4) A product catalog that the website reads constantly; it must survive a regional outage and the site must keep reading it from the second region during that outage even before any failover. Recommend a redundancy option for each and explain what it protects against.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the redundancy option for each dataset and the failure it protects against.",
          parts: [
            matchPart("Redundancy for each dataset", "(1) LRS, (2) GRS or GZRS, (3) ZRS, (4) RA-GRS or RA-GZRS. All four right is met; two or three is partly there.", "(1) LRS: cheapest, copies in one datacenter -- enough for files that are regenerated. (2) GRS or GZRS: asynchronous copy to the paired region, so a regional loss is survived. (3) ZRS: synchronous copies across availability zones inside the region, never leaving it. (4) RA-GRS or RA-GZRS: the secondary is readable at the -secondary endpoint before any failover.", {"leftHeading": "Dataset", "rightHeading": "Redundancy option", "left": ["(1) Rendering scratch files, regenerated nightly", "(2) Master archive, must survive losing a region", "(3) Subscriber records, no copy may leave the region", "(4) Product catalog, readable from the second region during an outage"], "right": ["LRS (locally redundant)", "GRS or GZRS (geo-redundant)", "ZRS (zone-redundant)", "RA-GRS or RA-GZRS (read-access geo-redundant)"], "pairs": [0, 1, 2, 3]}),
            part("What each protects against", "Says what each option protects against: Rendering scratch files: Chooses locally redundant storage (LRS): copies within a single datacenter in the primary region, the lowest cost, protecting against drive and rack failure but not a datacenter or regional outage. Master archive: Chooses geo-redundant storage (GRS or GZRS), explaining that data is copied asynchronously to the paired secondary region so it survives a regional outage, and that the secondary is only readable after a failover unless an RA- option is chosen. Subscriber records: Chooses zone-redundant storage (ZRS): synchronous copies across three or more availability zones in the primary region, surviving a datacenter (zone) failure while keeping every copy inside the region to satisfy the regulator. Product catalog: Chooses read-access geo-redundant storage (RA-GRS or RA-GZRS) because the website must read from the secondary region during an outage without waiting for a failover; mentions the -secondary endpoint.", "Rendering scratch files: LRS: the data is replicated within one physical datacenter in the primary region -- the cheapest option, fine for files that can be regenerated. It survives hardware failure, not the loss of the datacenter or region. Master archive: GRS (or GZRS for zone protection in the primary as well): replicated to the paired secondary region, which Azure determines from the primary and which cannot be changed. The data survives the loss of the whole primary region. Without the RA- variant the secondary is not readable until an account failover. Subscriber records: ZRS: replicated synchronously across three or more availability zones in the primary region, so a datacenter failure is survived, and no copy ever leaves the region -- which is what the regulator requires. Durability is designed at twelve nines a year versus eleven for LRS. Product catalog: RA-GZRS (or RA-GRS): the secondary region's copy is always readable through the account's -secondary endpoint, so the site keeps reading the catalog during a primary-region outage, before and without an account failover. Writes still need a failover."),
          ],
        },
      ],
    },
    {
      slug: "resource-hierarchy-for-a-company",
      objective: "The hierarchy connecting resource groups, subscriptions, and management groups",
      kind: "build",
      title: "Design the resource hierarchy for a growing company",
      brief:
        "Fairweather Outdoor, a fictional retailer, has one Azure subscription with 340 resources in three resource groups, created by whoever needed them. It is about to add a second business unit (wholesale), a separate development team, and a regulated payments system that must be isolated for audit. Finance wants to see cost by business unit; security wants one place to require that every resource is created in approved regions and that every production resource gets a tag naming its owner, without having to repeat the rule in each subscription. Propose a hierarchy of management groups, subscriptions and resource groups, and say where the region rule and the owner-tag rule should be applied so they are inherited.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the hierarchy proposal.",
          parts: [
            part(
              "Management groups",
              "Proposes management groups under the root (for example one per business unit, or Platform / Landing zones with Prod and Non-prod), explains that subscriptions are placed under them, and notes the tree can be up to six levels deep (excluding root and subscription) with one parent per group or subscription.",
              "Under the tenant root management group: a Fairweather group containing Retail, Wholesale and Shared Services groups; under each, Production and Non-production child groups. Each subscription has exactly one parent, and the tree can go six levels deep below the root (not counting the subscription level), so this is well within limits."
            ),
            part(
              "Subscriptions",
              "Uses separate subscriptions as the boundary for billing and isolation: at least one per business unit, a separate development subscription, and a dedicated subscription for the regulated payments system; explains that cost rolls up per subscription so finance can see spend by unit.",
              "Separate subscriptions: Retail-Prod, Wholesale-Prod, Dev (shared by the development team), and Payments-Prod on its own so the audited system is isolated from everything else. Each subscription's cost rolls up to finance by business unit, and each sits under the matching management group."
            ),
            part(
              "Resource groups",
              "Organizes resource groups by application or workload lifecycle inside each subscription (resources that are deployed, updated and deleted together), rather than by resource type, and notes a resource belongs to exactly one resource group.",
              "Inside each subscription, one resource group per application or environment slice -- rg-storefront-prod, rg-inventory-prod -- so everything in a group shares a lifecycle and can be managed, tagged or deleted together. A resource lives in exactly one resource group."
            ),
            part(
              "Where to apply the rules",
              "Applies the approved-regions rule and the owner-tag rule as Azure Policy assignments at a management group (for example the top Fairweather group, or Production for the tag rule) so every subscription and resource beneath inherits them, and notes that RBAC role assignments at a management group inherit the same way.",
              "Assign the allowed-locations policy at the Fairweather management group: it is inherited by every management group, subscription and resource below, and a subscription owner cannot remove it. Assign the require-owner-tag policy at the Production groups. Role assignments made at a management group inherit down in the same way, so the central security team can be given Reader across everything in one assignment."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Azure Management and Governance (3)
    // ----------------------------------------------------------------------
    {
      slug: "cost-control-plan",
      objective: "Cost management capabilities in Azure",
      kind: "build",
      title: "Write a cost-control plan for an overspending subscription",
      brief:
        "Lantern Learning, a fictional online school, spent twice its monthly Azure budget last month and found out from the invoice. The subscription holds a production website, several test environments that developers forget to delete, and a data warehouse that is sized for peak exam week all year. The finance lead wants: to know before the bill arrives when spend is heading over budget; to see which team is spending what; a way to estimate the cost of a planned new service before building it; and suggestions for trimming the existing bill. Name the Azure capability for each need and how it would be used here.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the capability for each need and describe how Lantern Learning would use it.",
          parts: [
            part(
              "Warning before the bill",
              "Uses a Cost Management budget on the subscription (or resource group) with alert thresholds (for example at 50, 80 and 100 percent of the amount, and a forecast alert) that notify the finance lead by email or an action group.",
              "Create a monthly budget in Microsoft Cost Management at the subscription scope, with alerts at, say, 80 and 100 percent of actual spend and a forecast alert when the month is projected to exceed it; alerts go to the finance lead and the platform team."
            ),
            part(
              "Spend by team",
              "Uses tags (for example team or cost-center) applied consistently to resources or resource groups, then groups Cost Management's cost analysis by that tag; may mention a policy to require the tag.",
              "Tag every resource group with a team tag (and enforce it with Azure Policy), then in cost analysis group costs by that tag to see each team's share. Resource groups per team make the view cleaner still."
            ),
            part(
              "Estimating a new service",
              "Uses the Azure pricing calculator to model the planned service's size, region, hours and tier before building; may mention the Total Cost of Ownership calculator for comparing with on-premises.",
              "Use the Azure pricing calculator: add the planned services with their region, tier, instance count and hours, and save the estimate for the business case. (The TCO calculator is the one for comparing against running it on-premises.)"
            ),
            part(
              "Trimming the existing bill",
              "Uses Azure Advisor's cost recommendations (right-size or shut down under-used VMs, buy reservations or savings plans for steady workloads, delete unattached disks or idle resources) and applies them to the forgotten test environments and the oversized warehouse.",
              "Open Azure Advisor's Cost recommendations: it flags under-utilized VMs to resize or shut down, idle resources to delete (the forgotten test environments) and steady usage that would be cheaper on a reservation or savings plan. Scale the warehouse down outside exam week, or schedule it, rather than paying for peak all year."
            ),
          ],
        },
      ],
    },
    {
      slug: "governance-with-policy-and-locks",
      objective: "The purpose of Azure Policy",
      kind: "case",
      title: "Bring an untidy subscription under governance",
      brief:
        "Quayside Insurance, a fictional firm, audits its main Azure subscription. It finds virtual machines in four regions although company data must stay in two approved regions, 60 percent of resources with no cost-center tag, several storage accounts that allow public blob access, and a production SQL database that an engineer deleted by mistake last quarter and had to restore. You are asked to put controls in place that stop these things recurring without making the platform team review every deployment by hand.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The team wants the region rule and the public-access rule enforced on anything created from now on, but they are nervous about breaking existing workloads on day one.",
          ask: "Which control applies, which effects would you use, and how do you avoid breaking existing resources?",
          parts: [
            part(
              "Control and effects for new resources",
              "Uses Azure Policy: a Deny effect for the allowed-locations rule and for public blob access on new or updated resources, so a non-compliant deployment is refused rather than reviewed by hand.",
              "Azure Policy, assigned at the subscription (or a management group above it). Assign the built-in allowed-locations definition and a definition that blocks public blob access on storage accounts, both with the Deny effect: a deployment outside the two regions, or a storage account allowing public access, simply fails."
            ),
            part(
              "Protecting existing workloads",
              "Starts the same definitions in Audit (or evaluates compliance first) so existing non-compliant resources are reported, not broken, and uses exemptions or a remediation plan before switching to Deny; notes Deny only applies to create and update requests, not to resources already deployed.",
              "Assign the definitions in Audit first (or review the compliance report) so the existing out-of-region VMs and open storage accounts are listed as non-compliant without being touched; fix or exempt them, then change the effect to Deny. Deny blocks only new create or update requests, so nothing already running is removed by it."
            ),
          ],
        },
        {
          text: "Three months on, the compliance view shows 95 percent of new resources tagged, but hundreds of older resources still have no cost-center tag and finance needs the tag on all of them.",
          ask: "How do you get the tag onto existing resources and keep it on new ones, without hand-editing hundreds of resources?",
          parts: [
            part(
              "Tagging existing and new resources",
              "Uses a policy with the Modify effect (adding the tag, for example inheriting it from the resource group) plus a remediation task to apply it to existing resources, rather than Deny; distinguishes Audit (report only), Deny (block) and Modify / DeployIfNotExists (change or deploy, remediable).",
              "A Modify-effect policy that adds the cost-center tag -- inheriting it from the resource group is the usual pattern -- assigned at the subscription. Modify applies to new and updated resources on the way in, and a remediation task applies it to the hundreds of existing resources. Audit would only report the gap and Deny would only block new untagged resources, so neither fixes the backlog."
            ),
          ],
        },
        {
          text: "Finally, the engineer who deleted the production database asks for a safeguard that works even for people who hold Contributor on the resource group.",
          ask: "What stops an accidental deletion, and what should the team know about how it behaves?",
          parts: [
            part(
              "Safeguard against deletion",
              "Applies a resource lock of type CanNotDelete (Delete) on the production database or its resource group, explaining that locks apply to all users regardless of RBAC role, are inherited by child resources, and must be removed (by someone with Owner or User Access Administrator rights) before a deliberate deletion.",
              "A Delete (CanNotDelete) lock on the production database, or on the resource group so it is inherited by everything inside. Locks override role permissions -- a Contributor can still change the database but cannot delete it -- and only someone with Microsoft.Authorization/locks permission (Owner, User Access Administrator) can remove the lock when a deletion is intended. A ReadOnly lock would be too strong here: it blocks updates too."
            ),
          ],
        },
      ],
    },
    {
      slug: "monitoring-tool-for-each-need",
      objective: "Azure Monitor, including Log Analytics, Monitor alerts, and Application Insights",
      kind: "build",
      title: "Pick the monitoring tool for each operations need",
      brief:
        "Sable Point Ferries, a fictional operator, runs a booking website on Azure App Service with an Azure SQL database and a few virtual machines. The operations lead lists five needs. (A) Be paged when a VM's CPU stays above 90 percent for ten minutes. (B) Search three months of web-server logs for every request from one customer's account to investigate a complaint. (C) Understand why checkout became slow last Tuesday: which page, which database call, how long each step took. (D) Know when Microsoft has an outage or planned maintenance in the region that affects their services. (E) Get a prioritized list of reliability and security improvements for what they already run. For each need, name the Azure Monitor component or related Azure tool and what it would do here.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the tool for each of the five needs and what it would show or do.",
          parts: [
            matchPart("Tool for each need", "A metric alert, B Log Analytics with KQL, C Application Insights, D Service Health, E Advisor. Azure Policy enforces rules and answers none of the five. All five right is met; three or four is partly there.", "A: a metric alert rule on Percentage CPU over a ten-minute window, with an action group that pages. B: Log Analytics and a KQL query over three months. C: Application Insights request and dependency timings for that checkout. D: Azure Service Health for issues and planned maintenance in their regions. E: Azure Advisor recommendations. Azure Policy enforces rules rather than monitoring.", {"leftHeading": "Need", "rightHeading": "Tool", "left": ["A: page when a VM's CPU stays above 90% for ten minutes", "B: search three months of web-server logs for one customer", "C: why checkout was slow last Tuesday, step by step", "D: Microsoft outages or maintenance affecting our region", "E: a prioritized list of reliability and security improvements"], "right": ["Azure Monitor metric alert with an action group", "Log Analytics workspace and a KQL query", "Application Insights", "Azure Service Health", "Azure Advisor", "Azure Policy"], "pairs": [0, 1, 2, 3, 4]}),
            part("What each shows or does", "Says what each tool would show or do here: A: paging on sustained high CPU: Uses an Azure Monitor metric alert rule on the VM's Percentage CPU metric with a threshold and window, tied to an action group that notifies (SMS, email, push, voice) or triggers automation. B: searching months of logs: Uses Log Analytics (a Log Analytics workspace that collects the logs) and a Kusto Query Language (KQL) query filtered on the customer's account over the three-month range. C: a slow checkout investigation: Uses Application Insights (application performance monitoring) to see request duration, dependency calls such as the SQL query, and the end-to-end transaction or application map for that time. D: Microsoft-side outages and maintenance: Uses Azure Service Health, which reports service issues, planned maintenance and health advisories affecting the customer's own regions and services, with alerts configurable. E: prioritized improvement list: Uses Azure Advisor, which gives recommendations across reliability, security, performance, cost and operational excellence for existing resources.", "A: paging on sustained high CPU: An Azure Monitor metric alert rule on the VM's CPU metric (above 90 percent, evaluated over a 10-minute window), with an action group that sends the on-call engineer an SMS or push notification and could also call a webhook or runbook. B: searching months of logs: Azure Monitor Logs: send the App Service and web-server logs to a Log Analytics workspace with enough retention, then run a KQL query filtering on the customer's account ID across the three months. C: a slow checkout investigation: Application Insights on the web app: its performance view and end-to-end transaction details show the checkout request, each dependency call (including the SQL query) and how long each took last Tuesday, with the application map showing where the time went. D: Microsoft-side outages and maintenance: Azure Service Health: it shows service issues, planned maintenance and advisories for the regions and services Sable Point actually uses, and a Service Health alert can notify the team when one is posted. E: prioritized improvement list: Azure Advisor: it analyses the deployed resources and lists recommendations by category -- reliability, security, performance, cost, operational excellence -- so the team can work through the high-impact items first."),
          ],
        },
      ],
    },
  ],
};
