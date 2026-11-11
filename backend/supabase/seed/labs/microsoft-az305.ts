import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-155: Microsoft Certified: Azure Solutions Architect Expert (AZ-305).
//
// Aligned to the AZ-305 study guide, skills measured as of April 17, 2026
// (Design identity, governance, and monitoring solutions 25-30% / Design
// data storage solutions 20-25% / Design business continuity solutions
// 15-20% / Design infrastructure solutions 30-35%), re-read on 2026-11-07:
//   https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-305
// Density (docs/labs.md, policy "hybrid") for the seed's unit weights
// 27.5/22.5/17.5/32.5: 3 / 2 / 1 / 3. AZ-305 is a design exam: every lab asks
// the learner to RECOMMEND a solution for stated business and technical
// requirements and to say why the plausible alternative falls short, which
// is how the exam's case-study items are written. Facts are kept to
// long-stable service behaviour and figures verified on Microsoft Learn.
//
// Sources behind the figures (learn.microsoft.com, checked 2026-11-07):
//   management groups: 10,000 per directory, six levels of depth (excluding
//   root and subscription), one parent, RBAC and policy inherit:
//   /azure/governance/management-groups/overview
//   Key Vault tiers (Standard FIPS 140 Level 1 software; Premium FIPS 140-3
//   Level 3 HSM-protected keys), RBAC vs access policy authorisation:
//   /azure/key-vault/general/overview; Managed HSM single-tenant, FIPS 140-3
//   Level 3, local RBAC: /azure/key-vault/managed-hsm/overview
//   hybrid authentication (PHS, PTA, federation; PHS as backup; PTA for
//   immediate on-premises policy enforcement; federation for third-party MFA
//   / sAMAccountName sign-in): /entra/identity/hybrid/connect/choose-ad-authn
//   Azure SQL vCore tiers (General Purpose 4 TB one replica; Business
//   Critical 4 TB three replicas, one free read replica, in-memory; Hyperscale
//   128 TB, zero to four HA replicas (readable) plus up to 30 named
//   replicas; backups 1-35 days PITR, up to 10 years
//   LTR; serverless autoscale per-second billing):
//   /azure/azure-sql/database/service-tiers-sql-database-vcore
//   blob access tiers (hot/cool/cold/archive; 30/90/180-day minimums;
//   archive offline, rehydrate up to 15 hours; archive not an account
//   default): /azure/storage/blobs/access-tiers-overview
//   storage redundancy durability and RA- read access: /azure/storage/common/storage-redundancy
//   Azure SQL HADR RTO/RPO (geo-replication / failover groups RTO < 60 s,
//   RPO >= 0; zone-redundant RTO < 30 s RPO 0; geo-restore minutes-hours;
//   failover groups add listener endpoints and group failover):
//   /azure/azure-sql/database/business-continuity-high-availability-disaster-recover-hadr-overview
//   Site Recovery (crash-consistent every 5 min, app-consistent hourly
//   minimum, any two regions, one-hour RTO SLA): /azure/site-recovery/azure-to-azure-common-questions
//   Azure Backup soft delete 14 days default, 14-180: /azure/backup/secure-by-default
//   compute decision tree and hosting-model comparison: /azure/architecture/guide/technology-choices/compute-decision-tree
//   load-balancing options (global vs regional, HTTP(S) vs non-HTTP(S),
//   Front Door + Application Gateway pattern): /azure/architecture/guide/technology-choices/load-balancing-overview
//   Azure Migrate (appliance discovery, assessment readiness/sizing/cost,
//   dependency analysis, business case, Database Migration Service, App
//   Service Migration Assistant): /azure/migrate/migrate-services-overview

export const AZ305_LABS: SeedLabSet = {
  trackCode: "AZ305",
  sources: [
    source("https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-305", "exam_outline", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/governance/management-groups/overview", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/key-vault/general/overview", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/key-vault/managed-hsm/overview", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/choose-ad-authn", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tiers-sql-database-vcore", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/azure-sql/database/business-continuity-high-availability-disaster-recover-hadr-overview", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-common-questions", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/backup/secure-by-default", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/compute-decision-tree", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/load-balancing-overview", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/migrate/migrate-services-overview", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Design Identity, Governance, and Monitoring Solutions (3)
    // ----------------------------------------------------------------------
    {
      slug: "landing-zone-hierarchy-and-tags",
      objective: "Recommending a structure for management groups, subscriptions, and resource groups, plus a resource-tagging strategy",
      kind: "build",
      title: "Design the management-group hierarchy and tagging for a multinational",
      brief:
        "Aldergate Foods, a fictional food manufacturer, is adopting Azure across three business units (Bakery, Beverages, Logistics) in Europe and North America. Requirements: central IT runs shared identity, connectivity (hub networks, firewalls) and monitoring, and nobody else may change them; each business unit must be able to run production and non-production workloads with its own cost visibility; a small sandbox area must exist where engineers can experiment with few restrictions; data residency rules (EU data stays in EU regions) must be enforced centrally and must not be removable by a subscription owner; finance needs to report cost by business unit, environment, cost center and application owner. Recommend the hierarchy and the tagging strategy, and justify the two decisions an alternative design would get wrong.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the hierarchy and tagging recommendation.",
          parts: [
            part(
              "Management-group tree",
              "Recommends a tree under the tenant root modeled on the Azure landing zone pattern: a top-level company group; a Platform group with child groups (or subscriptions) for Identity, Management and Connectivity; a Landing Zones group with children per business unit (or per archetype such as Corp/Online) and Prod/Non-prod beneath; a Sandbox group; and optionally a Decommissioned group. Notes the depth limit of six levels excluding root and subscription, one parent per group.",
              "Tenant root -> Aldergate (company) -> Platform (children: Identity, Management, Connectivity), Landing Zones (children: Bakery, Beverages, Logistics, each with Prod and Non-prod), Sandbox, Decommissioned. That is four levels below the root, inside the six-level limit (root and subscription not counted), and each group has exactly one parent. Platform holds the shared services central IT owns; business units live only under Landing Zones."
            ),
            part(
              "Subscriptions and resource groups",
              "Uses subscriptions as the unit of isolation and billing: one per Platform function, one per business unit per environment (and per region where residency demands), one or more sandbox subscriptions with budgets; resource groups per application/workload lifecycle inside each subscription.",
              "Subscriptions: sub-identity, sub-management, sub-connectivity under Platform; sub-bakery-prod-eu, sub-bakery-prod-na, sub-bakery-nonprod and the same pattern for Beverages and Logistics under their groups; sub-sandbox-01.. under Sandbox with a budget and auto-expiry policy. Inside each subscription a resource group per application (rg-orders-api, rg-orders-db) so deployments, access and deletion follow the application's lifecycle."
            ),
            part(
              "Where controls attach",
              "Assigns Azure Policy for data residency (allowed locations, EU regions) at the EU landing-zone group or the business-unit groups so it is inherited and cannot be removed by a subscription owner; gives central IT Owner/Contributor on Platform only and business units no rights there; applies lighter policy to Sandbox; explains that policy and RBAC assigned at a management group are inherited by all children.",
              "Allowed-locations (EU regions) policy assigned with Deny at the groups that hold EU subscriptions; a subscription owner inherits it and cannot remove an assignment made above them. Central IT holds Owner on Platform; business-unit teams hold Contributor on their own groups and nothing on Platform, so the hubs and firewalls cannot be altered by them. Sandbox gets Audit-mode policies and budgets rather than Deny, which is the whole point of having it as a separate branch."
            ),
            part(
              "Tagging strategy",
              "Defines a small mandatory tag set matching finance's reporting needs (for example BusinessUnit, Environment, CostCentre, Owner, plus Application/Workload and DataClassification), applied at resource group and inherited to resources via a Modify policy, with Deny for missing mandatory tags on resource groups and consistent allowed values.",
              "Mandatory tags: BusinessUnit (Bakery/Beverages/Logistics), Environment (prod/nonprod/sandbox), CostCentre (finance code), Owner (a team alias, not a person), Application. Optional: DataClassification, Criticality. Enforce with policy: Deny a resource group without the mandatory tags; Modify to inherit them onto resources so nobody tags 400 resources by hand; constrain values with allowed lists so cost analysis groups cleanly by BusinessUnit and Environment."
            ),
            part(
              "What the alternative gets wrong",
              "Names at least two failure modes of a flatter or per-team design: one subscription per business unit for all environments mixes prod and non-prod cost and blast radius; placing shared networking in a business unit subscription lets that unit change it; assigning residency policy per subscription lets owners remove it; tagging by person rather than team rots.",
              "A single subscription per business unit mixes production and non-production cost and blast radius and forces one policy posture on both. Putting the hub network in Bakery's subscription makes Bakery's Contributors able to change the firewall everyone depends on. Assigning the residency policy per subscription lets each subscription Owner remove it, which the requirement forbids. Tagging Owner with a named person breaks the first time they leave; a team alias does not."
            ),
          ],
        },
      ],
    },
    {
      slug: "secrets-keys-certificates-design",
      objective: "Recommending a solution to manage secrets, certificates, and keys",
      kind: "build",
      title: "Recommend the secrets, keys and certificates design for a payments platform",
      brief:
        "Corvid Payments, a fictional card processor, is designing on Azure. Requirements: application secrets (database connection strings, third-party API keys) must never be stored in code or configuration files and must be rotatable without redeploying; the keys that encrypt cardholder data must be protected by hardware security modules validated to FIPS 140-3 Level 3, and the auditors want the processor's own administrators -- not any Azure subscription administrator -- to be the only people able to manage those keys; public TLS certificates for 30 customer-facing domains must renew automatically; non-secret settings (feature switches, endpoint URLs) must be managed centrally too; and a deleted secret must be recoverable for a period while a malicious purge must be impossible. Recommend the design, and say which service you would NOT use for which part and why.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the recommendation for secrets, keys, certificates and configuration.",
          parts: [
            part(
              "Application secrets",
              "Recommends Azure Key Vault for secrets, accessed by applications through managed identities (no credentials in code), with Azure RBAC as the authorization model (data-plane roles such as Key Vault Secrets User) and versioned secrets referenced by URI so rotation does not require redeployment; may mention Key Vault references from App Service / Functions.",
              "Azure Key Vault holds the connection strings and API keys. Each app authenticates with its managed identity -- Microsoft Entra authentication, nothing stored in code -- and is granted a data-plane role such as Key Vault Secrets User using Azure RBAC (preferred over the legacy access-policy model because one model covers management and data access). Apps read secrets by URI, so a new secret version is picked up on the next read or by a Key Vault reference in App Service settings; rotation is a vault operation, not a deployment."
            ),
            part(
              "Cardholder encryption keys",
              "Recommends Azure Key Vault Managed HSM (single-tenant, FIPS 140-3 Level 3 validated HSMs, local RBAC that subscription or resource-group administrators cannot override) for the cardholder keys, explaining why Key Vault Premium (also FIPS 140-3 Level 3 HSM-backed keys, but multi-tenant service with Azure RBAC) does not meet the administrator-isolation requirement.",
              "Azure Key Vault Managed HSM for the cardholder keys: a single-tenant HSM cluster with a customer-specific security domain, FIPS 140-3 Level 3 validated hardware, and its own local RBAC model, so the designated HSM administrators control the keys and even a management-group or subscription Owner cannot override them -- exactly the auditors' condition. Key Vault Premium would satisfy the FIPS 140-3 Level 3 HSM requirement for keys, but it is a multi-tenant service governed by Azure RBAC, so an Azure administrator with sufficient rights could grant themselves access; it fails the isolation requirement, not the hardware one."
            ),
            part(
              "Public TLS certificates",
              "Recommends Key Vault certificates with an integrated public certificate authority so enrollment and renewal are automated, bound to the front end (App Service, Application Gateway or Front Door) from the vault; notes App Service managed certificates or Front Door managed certificates as alternatives where they cover the need.",
              "Key Vault certificates with an integrated public CA: Key Vault handles enrollment and automatic renewal of the 30 certificates, and the front end (Application Gateway, Front Door or App Service) binds the certificate from the vault so a renewed version is picked up without a manual re-import. Where a front end offers its own managed certificate (Front Door or App Service managed certificates) that is acceptable for simple domains, but a single vault keeps all 30 under one renewal policy and one audit log."
            ),
            part(
              "Non-secret configuration",
              "Recommends Azure App Configuration for feature flags and settings, with Key Vault references for anything secret, rather than putting non-secret settings in Key Vault.",
              "Azure App Configuration for feature switches and endpoint URLs: it is built for hierarchical, labeled configuration and feature management with change notification, and it can hold Key Vault references so an app gets secrets and settings through one client. Key Vault is the wrong tool for high-volume non-secret settings; App Configuration is the wrong tool for secrets."
            ),
            part(
              "Recovery and anti-purge",
              "Enables soft delete (recoverable deleted objects and vaults for a retention period) and purge protection (nothing can be permanently deleted until the retention period ends, even by an administrator) on the vault and the Managed HSM; notes purge protection cannot be turned off once enabled.",
              "Turn on soft delete and purge protection for the key vault and the Managed HSM. Soft delete keeps deleted secrets, keys, certificates and the vault itself recoverable for the retention period; purge protection forbids a permanent purge during that period for everyone, including administrators, and once enabled it cannot be switched off -- which is what makes a malicious purge impossible rather than merely unlikely."
            ),
          ],
        },
      ],
    },
    {
      slug: "hybrid-authentication-design",
      objective: "Recommending an authentication solution",
      kind: "case",
      title: "Recommend an authentication design for a hybrid enterprise",
      brief:
        "Stonebridge Engineering, a fictional firm with 9,000 staff, runs on-premises Active Directory Domain Services and is moving collaboration and several line-of-business apps to Microsoft 365 and Azure. The security team's rules: account disablements and password policy changes made on-premises must take effect in the cloud immediately; users must not get a second password; the company must stay able to sign in to cloud apps if the on-premises datacenter is offline; and the board wants phishing-resistant sign-in for administrators within a year.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The identity team has Microsoft Entra Connect ready and asks which sign-in method to configure.",
          ask: "Recommend the primary authentication method and explain why the alternatives do not fit.",
          parts: [
            part(
              "Primary method",
              "Recommends pass-through authentication (PTA) with agents on several on-premises servers, because PTA validates the password against on-premises AD at sign-in time and therefore enforces on-premises account state, password policy and sign-in hours immediately, whereas password hash synchronization (PHS) applies such changes only after the next sync; rules out federation (AD FS) as unnecessary infrastructure when there is no requirement Entra ID cannot meet natively.",
              "Pass-through authentication, with at least three PTA agents on-premises for resilience. PTA checks the password against on-premises AD at the moment of sign-in, so a disabled account or a changed password policy is enforced immediately -- the security team's rule. Password hash synchronization would be simpler but does not immediately enforce on-premises account states; it relies on the sync cycle. Federation with AD FS would also enforce on-premises policy but means running and securing a federation farm, and nothing here (no third-party MFA provider, no sAMAccountName-only sign-in) requires it. Users keep one password either way, which satisfies the no-second-password rule."
            ),
          ],
        },
        {
          text: "During a review, the operations director asks what happens to cloud sign-in if the datacenter loses power, as it did for six hours last winter.",
          ask: "What do you add to the design, and how does the switch happen?",
          parts: [
            part(
              "Resilience",
              "Enables password hash synchronization alongside PTA as a backup authentication method, explaining that failover to PHS is not automatic and must be switched in Microsoft Entra Connect, and that PHS also enables leaked-credential detection in Entra ID Protection; may mention Staged Rollout for testing.",
              "Enable password hash synchronization as well -- Microsoft's guidance is to use or enable PHS whichever primary method you choose. If the datacenter and its PTA agents go dark, the identity team switches the sign-in method to PHS in Microsoft Entra Connect; the switch is a manual step, not automatic, so it belongs in the runbook. PHS running in parallel also feeds Entra ID Protection's leaked-credentials detection, which PTA alone does not."
            ),
          ],
        },
        {
          text: "The board's deadline approaches. The 60 administrators currently sign in with passwords plus SMS codes.",
          ask: "Recommend how administrators should authenticate and how to enforce it.",
          parts: [
            part(
              "Phishing-resistant admin sign-in",
              "Recommends passwordless, phishing-resistant methods -- FIDO2 security keys or passkeys, or certificate-based authentication, with Windows Hello for Business on managed devices -- enforced through Conditional Access with an authentication-strength policy for the administrator roles; moves away from SMS; may add Privileged Identity Management for just-in-time elevation.",
              "Move administrators to passkeys/FIDO2 security keys (or certificate-based authentication) and Windows Hello for Business on their managed workstations, all of which are phishing-resistant; SMS codes are not. Enforce it with a Conditional Access policy targeting the privileged directory roles that requires the Phishing-resistant MFA authentication strength, so a password-plus-SMS sign-in is refused for those accounts. Pair it with Privileged Identity Management so the roles are activated just in time rather than held permanently."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Design Data Storage Solutions (2)
    // ----------------------------------------------------------------------
    {
      slug: "relational-platform-and-tier",
      objective: "Recommending a solution for storing relational data",
      kind: "build",
      title: "Recommend a relational platform and tier for three applications",
      brief:
        "Halvorsen Retail, a fictional chain, is moving three SQL Server databases to Azure. (1) The point-of-sale ledger: 1.8 TB, heavy OLTP from 600 stores, must tolerate a datacenter failure with no data loss and keep latency low; reports run against it during the day and slow down sales. (2) A legacy warehouse application that uses SQL Agent jobs, cross-database queries, CLR assemblies and Service Broker, and whose vendor will not change the code. (3) An internal HR reporting database, 40 GB, used a few hours a day on weekdays; the team wants to stop paying for an idle server at night and weekends. Recommend a deployment option and service/compute tier for each, and name the alternative you rejected.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the recommendation for each of the three databases.",
          parts: [
            part(
              "Point-of-sale ledger",
              "Recommends Azure SQL Database (single database) in the Business Critical tier with zone redundancy, citing local SSD storage and low latency for high-rate OLTP, three replicas with one free read-only replica to offload the daytime reports (read scale-out), and zone-redundant HA for datacenter failure with RPO 0; may mention Hyperscale as the alternative if growth beyond 4 TB is expected.",
              "Azure SQL Database, vCore, Business Critical, zone-redundant. Business Critical is built for OLTP with high transaction rates and low I/O latency (local SSD), keeps three replicas, and includes one read scale-out replica at no extra charge -- point the daytime reports at the read-only replica so they stop slowing sales. Zone-redundant configuration survives a datacenter (zone) failure with zero data loss. At 1.8 TB it fits the 4 TB Business Critical limit; if the ledger were heading past 4 TB, Hyperscale (up to 128 TB, zero to four high-availability replicas that also serve reads, plus up to 30 named replicas for read scale-out) would be the choice instead. General Purpose was rejected: remote storage, one replica, no read scale-out."
            ),
            part(
              "Legacy warehouse application",
              "Recommends Azure SQL Managed Instance because it has near-complete SQL Server engine compatibility -- SQL Agent, cross-database queries, CLR, Service Broker -- which Azure SQL Database lacks, while remaining a managed PaaS; names SQL Server on an Azure VM as the fallback only if something still is not supported.",
              "Azure SQL Managed Instance: it keeps the SQL Server surface the vendor's code depends on -- SQL Agent jobs, cross-database queries, CLR assemblies, Service Broker -- as a managed service with automated backups and patching. Azure SQL Database does not support those features, so it is out. SQL Server on an Azure VM would run the code unchanged but hands the OS, patching and HA back to the team; it is the fallback only if Managed Instance's compatibility assessment flags something unsupported."
            ),
            part(
              "HR reporting database",
              "Recommends Azure SQL Database in the General Purpose tier with the serverless compute tier, which autoscales compute and bills per second for compute used, with auto-pause during idle periods so nights and weekends cost storage only; notes the resume delay on first connection as the trade-off and rejects a provisioned instance.",
              "Azure SQL Database, General Purpose, serverless compute. Serverless autoscales vCores with demand and bills compute per second, and with auto-pause enabled the database pauses after the configured idle period so overnight and at weekends only storage is billed. The trade-off is a resume delay on the first connection after a pause, which an internal reporting app tolerates. A provisioned General Purpose database would bill the full compute 24 hours a day for a workload used a few hours on weekdays."
            ),
          ],
        },
      ],
    },
    {
      slug: "unstructured-storage-balancing-cost",
      objective: "Recommending a data storage solution that balances features, performance, and cost",
      kind: "build",
      title: "Recommend storage for four unstructured datasets",
      brief:
        "Pelican Imaging, a fictional medical-imaging provider, needs storage for four datasets. (1) 600 TB of historical scans that must be retained for 10 years, are retrieved perhaps twice a month, and a retrieval wait of a day is acceptable. (2) 40 TB of scans from the last 90 days that radiologists open constantly from a web viewer. (3) A data-science platform that runs analytics over petabytes of files organized in deep folder hierarchies and needs POSIX-like directory operations and fine-grained ACLs. (4) A legacy Windows application cluster that must mount a shared file system over SMB from several VMs, with low latency. Finance wants the lowest cost that meets each requirement and asks what each choice costs them in other ways.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Recommend the storage service, tier and redundancy for each dataset, and the trade-off of each.",
          parts: [
            part(
              "Historical scans",
              "Recommends Azure Blob Storage in the archive tier (offline, lowest storage price), explaining that reads need rehydration which can take up to 15 hours, that blobs have a 180-day minimum stay, and that archive is set per blob or by a lifecycle policy rather than as the account default; chooses a geo-redundant option for a 10-year medical record.",
              "Azure Blob Storage, archive tier, in a GRS/GZRS account: the cheapest place to keep 600 TB for a decade. Archive is offline -- a scan must be rehydrated to an online tier before it can be read, up to 15 hours at standard priority, which a one-day wait tolerates -- and it carries a 180-day minimum, irrelevant for 10-year retention. Archive cannot be the account's default tier; a lifecycle rule moves scans into it. Cost in other ways: per-GB retrieval fees and the rehydration delay."
            ),
            part(
              "Recent scans",
              "Recommends Blob Storage in the hot tier (or premium block blobs if the viewer needs consistently low latency), noting hot has no minimum retention and the highest storage price but the lowest access cost, with a lifecycle rule to cool/archive after 90 days; cool tier rejected for constant access because of its access charges and 30-day minimum.",
              "Blob Storage, hot tier (premium block blob account only if the viewer's latency tests demand it). Hot has no early-deletion minimum and the lowest read cost, which suits scans opened constantly; a lifecycle rule tiers them to cool or archive once they pass 90 days. Cool would cost less to store but more per read and has a 30-day minimum -- wrong for data read many times a day."
            ),
            part(
              "Analytics platform",
              "Recommends Azure Data Lake Storage Gen2 (a storage account with hierarchical namespace enabled) for directory semantics, atomic directory operations and POSIX-style ACLs at petabyte scale, rather than a flat blob container or a file share.",
              "Azure Data Lake Storage Gen2: a storage account with the hierarchical namespace enabled, so folders are real objects with atomic rename/move and POSIX-like ACLs down to file level, at blob prices and scale. A flat blob namespace fakes folders with prefixes and cannot rename a directory atomically; Azure Files could do directories but not at petabyte analytics scale or cost."
            ),
            part(
              "Windows SMB cluster",
              "Recommends Azure Files with a premium (SSD) file share for low-latency SMB from multiple VMs, with identity-based authentication (Active Directory / Entra) for NTFS-style permissions; mentions Azure NetApp Files as the step up if the latency or throughput needs exceed what Azure Files premium offers.",
              "Azure Files, premium tier (SSD-backed) SMB share, mounted by all cluster VMs, with identity-based access so the application keeps its Windows ACL model. Standard-tier shares are cheaper but HDD-backed, so latency suffers. If the cluster's I/O profile exceeds Azure Files premium, Azure NetApp Files is the higher-performance (and higher-cost) managed option."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Design Business Continuity Solutions (1)
    // ----------------------------------------------------------------------
    {
      slug: "recovery-design-for-stated-objectives",
      objective: "Recommending a recovery solution for Azure and hybrid workloads that meets stated recovery objectives",
      kind: "case",
      title: "Design recovery to meet three sets of RTO and RPO",
      brief:
        "Ironbark Logistics, a fictional carrier, runs three workloads in Azure's UK South region and one on-premises. The business sets objectives for a regional disaster: the shipment-tracking web app and its Azure SQL database -- RTO 1 hour, RPO 1 minute; the dispatch system on four Azure VMs with SQL Server on one of them -- RTO 4 hours, RPO 1 hour; a document archive of 200 TB of blobs -- RTO 24 hours, RPO 24 hours; and an on-premises warehouse-management server (VMware) -- RTO 8 hours, RPO 1 hour. Separately, anyone deleting a backup by mistake or malice must not be able to make it unrecoverable.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Start with the shipment-tracking app and its Azure SQL database, which carry the tightest objectives.",
          ask: "Recommend the recovery design for the app and database, and say why a backup-based approach cannot meet it.",
          parts: [
            part(
              "Database",
              "Recommends an auto-failover group for the Azure SQL database to a second region (continuous asynchronous replication; RTO typically under 60 seconds, RPO equal to or greater than zero depending on un-replicated changes), explaining the failover group's read-write listener keeps connection strings unchanged and fails over a group of databases together; notes active geo-replication alone lacks the listener and group failover.",
              "A failover group between UK South and a second region (UK West or another EU region). It uses active geo-replication underneath -- continuous asynchronous replication, failover typically under 60 seconds, RPO at or near zero depending on what had not yet replicated -- and adds the read-write and read-only listener endpoints so the app's connection string never changes, plus group failover for every database in it. Plain active geo-replication would meet the time targets but has no listener and no group failover. Geo-restore from geo-redundant backups is the alternative that fails: minutes-to-hours of both downtime and data loss, far outside a one-minute RPO."
            ),
            part(
              "Web app",
              "Recommends deploying the web app in both regions (active-passive or active-active) behind a global entry point such as Azure Front Door (or Traffic Manager) with health probes, so failover is automatic within the one-hour RTO; notes redeploying from backup after a disaster would not meet it.",
              "Run the web tier in both regions -- App Service in UK South and the second region deployed from the same pipeline -- behind Azure Front Door with health probes, so when UK South fails traffic moves to the surviving region automatically, well inside the one-hour RTO. Restoring the app from a backup into a new region after the fact involves provisioning time and human steps that a one-hour target cannot absorb."
            ),
          ],
        },
        {
          text: "Next, the dispatch VMs and the document archive.",
          ask: "Recommend the recovery design for the four VMs (including SQL Server) and for the 200 TB of blobs.",
          parts: [
            part(
              "Dispatch VMs",
              "Recommends Azure Site Recovery Azure-to-Azure replication to a second region with a recovery plan ordering the VMs, crash-consistent points every five minutes and app-consistent snapshots at the hourly minimum for the SQL Server VM (meeting the one-hour RPO), and test failovers to evidence the four-hour RTO (Site Recovery's RTO SLA is one hour); notes Azure Backup alone would meet RPO 1 hour only with hourly backups and would not meet the RTO as cleanly.",
              "Azure Site Recovery replicating the four VMs to the second region with a recovery plan (SQL VM first). Crash-consistent recovery points are created every five minutes; set app-consistent snapshots to the hourly minimum so the SQL Server VM has a consistent point at most an hour old -- that is the one-hour RPO. Site Recovery's RTO SLA is one hour and a recovery plan brings the VMs up in minutes, comfortably inside four hours; prove it with a test failover into an isolated network. Azure Backup alone restores from vault recovery points, which is slower and offers no orchestrated plan."
            ),
            part(
              "Document archive",
              "Recommends geo-redundant blob storage (GRS or GZRS, or the RA- variant) so the data already exists in the secondary region, with account failover (or RA- read access) as the recovery action; notes asynchronous replication means some recent writes may be lost but the 24-hour RPO allows it; may add blob soft delete / versioning for accidental deletion.",
              "Store the archive in a GZRS (or GRS) account: Azure replicates it asynchronously to the paired region, so in a disaster the recovery action is an account failover (or, with RA-GZRS, reading from the secondary endpoint straight away). Replication lag means a few recent writes could be lost, which a 24-hour RPO accepts, and the data is designed for sixteen nines of durability. Copying 200 TB to another region with a backup tool would cost more and move slower than letting the account do it."
            ),
          ],
        },
        {
          text: "Finally, the on-premises VMware server, and the demand that backups cannot be made unrecoverable.",
          ask: "Recommend the hybrid recovery design and the backup protection controls.",
          parts: [
            part(
              "On-premises VMware server",
              "Recommends Azure Site Recovery (VMware to Azure) replicating the server to Azure with app-consistent snapshots at an hourly frequency for the one-hour RPO, failover into Azure within the eight-hour RTO, and a test failover to prove it; distinguishes this from Azure Backup (MARS/MABS), which protects data but does not bring the server up in Azure quickly.",
              "Azure Site Recovery for VMware: replicate the warehouse-management server to Azure (replication appliance on-premises), app-consistent snapshots hourly for the one-hour RPO, and a recovery plan that fails it over into an Azure VNet -- far inside eight hours -- then fail back when the datacenter returns. Azure Backup for the server (MABS or the MARS agent) would protect its data but restoring a server from backup into Azure is a rebuild, not a failover, so it is the complement, not the recovery mechanism."
            ),
            part(
              "Backup protection",
              "Recommends Azure Backup with soft delete (14 days by default, extendable to 180) so deleted backup data stays recoverable, plus immutable vaults (WORM, locked) and multi-user authorization (Resource Guard) for critical operations, and geo-redundant vault storage with cross-region restore.",
              "Back everything up to Recovery Services / Backup vaults with soft delete on: deleted backup items stay recoverable for 14 days by default (extendable to 180), at no extra cost for the default period, and in regions where it is always-on it cannot be disabled. Add vault immutability (locked, so retention cannot be shortened or recovery points deleted early) and multi-user authorization with Resource Guard so a single compromised administrator cannot perform destructive vault operations alone. Use geo-redundant vault storage with cross-region restore so the backups themselves survive the regional disaster."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Design Infrastructure Solutions (3)
    // ----------------------------------------------------------------------
    {
      slug: "compute-for-four-workloads",
      objective: "Specifying compute-solution components based on workload requirements",
      kind: "build",
      title: "Specify compute for four workloads",
      brief:
        "Tamarind Software, a fictional company, is designing compute for four workloads. (1) A customer web portal (.NET) the team wants to deploy from Git with built-in autoscale, staging slots and managed TLS, and no servers to patch. (2) A set of 40 containerized microservices that need service discovery, scale-to-zero for idle services, and event-driven scaling from queue length, without the team operating Kubernetes. (3) An overnight risk simulation that runs 5,000 independent tasks on hundreds of cores for three hours and then needs nothing until the next night. (4) A legacy Windows service that requires a specific GPU driver, registry changes and a third-party agent installed on the OS, and must stay up through a single-host failure. For each, specify the compute service, the key component choices, and the alternative you rejected.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify the compute solution for each workload.",
          parts: [
            part(
              "Customer web portal",
              "Specifies Azure App Service (Standard or Premium plan) for managed web hosting with deployment from Git, built-in autoscale, deployment slots and managed certificates; rejects VMs (OS to patch) and Kubernetes (operational overhead for one web app).",
              "Azure App Service on a Premium (or Standard) plan: Git-based deployment, autoscale rules, deployment slots for staged releases and managed TLS certificates come with the platform, and Microsoft patches the OS. VMs would hand the team the operating system to maintain; AKS would be a whole platform to run for a single web application."
            ),
            part(
              "Containerized microservices",
              "Specifies Azure Container Apps -- serverless containers with built-in service discovery, scale-to-zero and KEDA-based event-driven scaling (for example from queue length) on managed infrastructure -- rejecting AKS because the team does not want to operate Kubernetes and Container Instances because it has no orchestration or autoscale.",
              "Azure Container Apps: it runs the 40 containers with built-in service discovery and ingress, scales each app on HTTP traffic or KEDA event sources such as queue length, and scales idle services to zero so they cost nothing, all without a Kubernetes cluster to manage. AKS gives full Kubernetes control the team explicitly does not want to operate; Azure Container Instances runs single container groups with no built-in autoscale or discovery."
            ),
            part(
              "Overnight risk simulation",
              "Specifies Azure Batch (pools that scale out to hundreds of cores for the run and back to zero afterwards, with job and task scheduling for the 5,000 independent tasks, optionally Spot/low-priority nodes), rejecting always-on VMs or a scale set kept running.",
              "Azure Batch: define a pool that autoscales to hundreds of cores when the job is submitted and back to zero when the 5,000 tasks finish, with Batch handling task scheduling, retries and output collection; Spot (low-priority) nodes cut the cost of work that can be retried. A permanent VM scale set would bill all day for three hours of use; Functions have execution-time limits unsuited to long numeric tasks."
            ),
            part(
              "Legacy Windows GPU service",
              "Specifies Azure Virtual Machines of a GPU-enabled size with full OS control for the driver, registry and agent, deployed for availability -- at least two instances across availability zones (or an availability set) behind a load balancer so a single host failure does not take it down; rejects PaaS options that do not expose the OS.",
              "Azure Virtual Machines in a GPU size (an N-series family) because the workload needs the operating system: a specific GPU driver, registry edits and a third-party agent. Deploy two instances across availability zones (or an availability set if zones are unavailable) behind an internal Standard Load Balancer so one host or zone failing leaves the service up. App Service and Container Apps do not expose the OS for drivers and agents, so they cannot host it."
            ),
          ],
        },
      ],
    },
    {
      slug: "load-balancing-and-routing-design",
      objective: "Recommending a load-balancing and routing solution",
      kind: "build",
      title: "Recommend load balancing and routing for a global application",
      brief:
        "Juniper Health Portal, a fictional provider, serves a patient web portal (HTTPS) from two Azure regions (West Europe and East US) on App Service, a regional set of internal microservice VMs (HTTP on port 8080) in each region, a licensing server reached over a custom TCP protocol on port 7000 by partner clinics worldwide, and an internal SQL Server Always On availability group on VMs that needs a listener IP. Requirements: patients must be routed to the nearest healthy region with TLS terminated at the edge and a web application firewall; inside each region HTTP traffic to the microservices needs path-based routing and WAF; the TCP licensing service must fail over between regions; the SQL listener must be reachable only from inside the VNet. Recommend the load-balancing service for each layer and explain why the other three would be wrong there.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Recommend the service for each layer with the reason the others do not fit.",
          parts: [
            part(
              "Patient portal, global entry",
              "Recommends Azure Front Door (global, HTTP(S), Layer 7) with TLS termination, WAF policy and latency-based routing with health probes across the two regions; explains Traffic Manager is DNS-only (slower failover because of DNS caching, no TLS termination or WAF) and Application Gateway and Load Balancer are regional.",
              "Azure Front Door (Premium if managed WAF rules or Private Link to the App Service origins are wanted): a global Layer-7 entry point that terminates TLS at the edge, applies a WAF policy, and routes each patient to the nearest healthy region using health probes. Traffic Manager is DNS-based, so it cannot terminate TLS or run a WAF and fails over only as fast as clients honor DNS TTLs; Application Gateway and Load Balancer live in one region each."
            ),
            part(
              "Microservices inside each region",
              "Recommends Azure Application Gateway v2 (WAF_v2) in each region for regional Layer-7 path-based routing to the VM backend pools with WAF; notes the common pattern is Front Door in front of Application Gateway, and that Load Balancer cannot route on URL paths.",
              "Azure Application Gateway WAF_v2 in each region, with path-based rules sending /api/appointments and /api/records to the right backend pools of microservice VMs and a WAF policy on the listener; Front Door routes to the regional Application Gateway, which is the documented global-plus-regional pattern. Azure Load Balancer works at Layer 4 and cannot see URL paths; Front Door is global and does not sit inside a VNet in front of VMs."
            ),
            part(
              "TCP licensing service across regions",
              "Recommends Azure Traffic Manager (DNS-based, any protocol, global) with a public Standard Load Balancer in each region for port 7000, or alternatively Azure Load Balancer's cross-region (global tier) option; explains Front Door and Application Gateway only accept HTTP(S) so cannot carry the custom TCP protocol.",
              "Azure Traffic Manager with Priority or Performance routing, with endpoints that are public Standard Load Balancers in each region fronting the licensing VMs on TCP 7000. Traffic Manager works on DNS, so it is protocol-agnostic and handles failover for non-HTTP(S) traffic; the cross-region (global) Azure Load Balancer is the Layer-4 alternative with a single anycast IP. Front Door and Application Gateway are Layer-7 HTTP(S) proxies and cannot carry a custom TCP protocol."
            ),
            part(
              "SQL listener",
              "Recommends an internal Standard Load Balancer with a private frontend IP as the Always On availability group listener, reachable only within the VNet (and peered or VPN-connected networks), with a health probe on the listener port; rules out any public or Layer-7 option.",
              "An internal Standard Load Balancer: its frontend is a private IP in the data subnet that becomes the availability group listener address, with a health probe on the probe port the cluster exposes and a rule for 1433. It is reachable only inside the VNet and connected networks; a public load balancer would expose it, and the Layer-7 services do not speak TDS."
            ),
          ],
        },
      ],
    },
    {
      slug: "migration-assessment-case",
      objective: "Evaluating on-premises servers, data, and applications for migration",
      kind: "case",
      title: "Assess a datacenter for migration to Azure",
      brief:
        "Fennimore Insurance, a fictional firm, must leave its leased datacenter in 14 months. It runs about 380 VMware virtual machines, 45 SQL Server instances, a dozen .NET web applications on IIS, and a 90 TB file archive. Nobody has an accurate inventory, and the board wants a cost comparison and a plan before approving budget.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The program lead asks how to get an accurate picture of what exists and what it depends on, without installing agents on 380 servers.",
          ask: "Recommend the discovery approach and what it should capture.",
          parts: [
            part(
              "Discovery",
              "Recommends an Azure Migrate project with the Azure Migrate appliance deployed in the VMware environment for agentless discovery of servers, performance data, SQL Server instances and web apps, plus agentless dependency analysis to map which servers talk to which; mentions the Collector / import option for restricted networks.",
              "Create an Azure Migrate project and deploy the Azure Migrate appliance into vCenter. It discovers the 380 VMs with their configuration and performance history, finds the SQL Server instances and databases and the IIS web apps, and runs agentless dependency analysis so the team can see which servers communicate and group them into applications before anything moves. No agents on the servers. If a segment of the network cannot reach Azure, the Azure Migrate Collector captures a point-in-time snapshot for import instead."
            ),
          ],
        },
        {
          text: "Discovery has run for six weeks. The board now wants the cost comparison and to know which servers are ready to move as they are.",
          ask: "Recommend how to produce the business case and the assessments, and how you would classify the estate.",
          parts: [
            part(
              "Business case and assessments",
              "Uses Azure Migrate's business case (on-premises TCO versus Azure, year-over-year cash flow, CapEx to OpEx) for the board, and assessments per workload type: Azure VM assessment (readiness, right-sized SKU from performance data, cost), Azure SQL assessment (readiness for SQL Database / Managed Instance / SQL on VM and recommended configuration), and web-app assessment for App Service; recommends performance-based sizing over as-is sizing.",
              "Run the Azure Migrate business case: it compares the datacenter's total cost of ownership with Azure, shows year-over-year cash flows and the CapEx-to-OpEx shift the board asked for. Then assessments: an Azure VM assessment over the 380 servers using performance-based sizing (so idle servers get smaller SKUs), an Azure SQL assessment over the 45 instances to see which are ready for Azure SQL Database or Managed Instance and which need SQL Server on a VM, and a web-app assessment to see which IIS apps can land on App Service."
            ),
            part(
              "Classifying the estate",
              "Groups workloads by Cloud Adoption Framework migration approach -- rehost (lift and shift to VMs), refactor/replatform (to PaaS such as App Service or Azure SQL), rearchitect, rebuild, replace (SaaS), retire -- using the assessment readiness and dependency groups to decide, with a bias to rehost for the deadline and refactor where PaaS readiness is high.",
              "Sort each application group into the Cloud Adoption Framework's options: retire what nobody uses (discovery will find some); replace with SaaS where it exists; rehost the bulk of the VMs as Azure VMs to meet the 14-month deadline; replatform the SQL instances that assess as ready for Managed Instance or SQL Database and the IIS apps that assess as App Service-ready; defer rearchitecting to after the exit. Readiness flags and dependency groups decide which bucket each lands in."
            ),
          ],
        },
        {
          text: "The plan is approved. Three details remain: how the databases physically move, how the 90 TB archive gets to Azure before the lease ends, and how to avoid a big-bang cutover.",
          ask: "Recommend the migration tools and the wave approach.",
          parts: [
            part(
              "Databases and archive",
              "Recommends Azure Database Migration Service for the SQL Server databases (online or offline migration to Azure SQL Database, Managed Instance or SQL on VM), the App Service Migration Assistant or Azure Migrate's agentless App Service migration for the .NET apps, and for the 90 TB archive an offline transfer with Azure Data Box (or AzCopy over ExpressRoute if bandwidth allows) into blob storage.",
              "Azure Database Migration Service moves the SQL databases to the target chosen by the assessment -- Managed Instance, SQL Database or SQL on an Azure VM -- with online migration for the ones that cannot take a long outage. The IIS apps assessed as ready go through the App Service Migration Assistant (or Azure Migrate's agentless App Service migration for ASP.NET apps on VMware). The 90 TB archive goes by Azure Data Box: order devices, copy locally, ship, and Microsoft loads it into the target storage account, which beats pushing 90 TB over the office link against a deadline."
            ),
            part(
              "Waves",
              "Plans migration in waves using dependency groups: pilot a low-risk application first, then move each dependency group together (so chatty servers are never split across the WAN), using Azure Migrate's replication (Site Recovery-based) with test migrations before each cutover, and leaving the most complex or most critical groups until the process is proven.",
              "Migrate by dependency group, not by server list: start with a low-risk internal app as the pilot, run a test migration in an isolated Azure network, then cut it over and learn. Each later wave moves a whole dependency group together so tightly coupled servers never end up either side of the WAN. Azure Migrate's server migration replicates continuously, so cutover windows are short and can be rehearsed with test migrations; the core policy systems go last, once the runbook is proven."
            ),
          ],
        },
      ],
    },
  ],
};
