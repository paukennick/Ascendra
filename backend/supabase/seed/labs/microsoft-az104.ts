import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-155: Microsoft Certified: Azure Administrator Associate (AZ-104).
//
// Aligned to the AZ-104 study guide, skills measured as of October 26, 2023
// (Manage Azure identities and governance 20-25% / Implement and manage
// storage 15-20% / Deploy and manage Azure compute resources 20-25% /
// Implement and manage virtual networking 15-20% / Monitor and maintain
// Azure resources 10-15%), re-read on 2026-11-07:
//   https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104
// Density (docs/labs.md, policy "hybrid") for the seed's unit weights
// 24/19/24/19/14: 3 / 2 / 2 / 2 / 2. AZ-104 is an administration exam, so the
// labs ask for the real artefact an administrator produces: a role
// assignment with a scope, a policy assignment, a SAS design, a lifecycle
// policy, a Bicep change and its deployment command, NSG rules with
// priorities, an alert rule with an action group, a Site Recovery failover
// plan. CLI is shown in reference answers; the criteria accept the portal or
// PowerShell equivalent, because the exam does.
//
// Two objectives in the seed track are NOT in the official guide
// ("Configuring encryption at host for Azure virtual machines" -- the guide
// says "Configure Azure Disk Encryption" -- and "Configuring soft delete for
// blobs and containers"); no lab is placed on them (reported to the lead).
//
// Sources behind the figures (learn.microsoft.com, checked 2026-11-07):
//   built-in roles and their descriptions: /azure/role-based-access-control/built-in-roles
//   management-group inheritance of RBAC and policy: /azure/governance/management-groups/overview
//   policy effects and evaluation order: /azure/governance/policy/concepts/effect-basics
//   locks: /azure/azure-resource-manager/management/lock-resources
//   savings plans vs reservations: /azure/cost-management-billing/savings-plan/savings-plan-overview
//   SAS types, stored access policies (service SAS only, five per container),
//   best practices: /azure/storage/common/storage-sas-overview
//   lifecycle policy actions, run conditions, filters: /azure/storage/blobs/lifecycle-management-policy-structure
//   access tiers (cool 30 / cold 90 / archive 180-day minimums; archive
//   rehydration up to 15 hours; archive not an account default): /azure/storage/blobs/access-tiers-overview
//   Bicep deployment with az deployment group create: /azure/azure-resource-manager/bicep/deploy-cli
//   deployment slots (Standard/Premium/Isolated; swap steps; sticky settings;
//   swap with preview; auto swap; rollback = swap again; traffic %): /azure/app-service/deploy-staging-slots
//   NSG default rules, priority 100-4096, service tags, stateful: /azure/virtual-network/network-security-groups-overview
//   routing: longest prefix, user > BGP > system, IP forwarding, 0.0.0.0/0 UDR:
//   /azure/virtual-network/virtual-networks-udr-overview
//   alert rule types, action groups, processing rules, states: /azure/azure-monitor/alerts/alerts-overview
//   and /azure/azure-monitor/alerts/alerts-processing-rules
//   Site Recovery Azure-to-Azure: crash-consistent points every 5 minutes,
//   app-consistent hourly minimum, 1-day default retention, reprotect, any
//   two regions, one-hour RTO SLA: /azure/site-recovery/azure-to-azure-common-questions
//   Azure Backup soft delete 14 days default, 14-180 configurable: /azure/backup/secure-by-default

export const AZ104_LABS: SeedLabSet = {
  trackCode: "AZ104",
  sources: [
    "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-104",
    "https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles",
    "https://learn.microsoft.com/en-us/azure/governance/management-groups/overview",
    "https://learn.microsoft.com/en-us/azure/governance/policy/concepts/effect-basics",
    "https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources",
    "https://learn.microsoft.com/en-us/azure/cost-management-billing/savings-plan/savings-plan-overview",
    "https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview",
    "https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure",
    "https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview",
    "https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/deploy-cli",
    "https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots",
    "https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview",
    "https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview",
    "https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview",
    "https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-processing-rules",
    "https://learn.microsoft.com/en-us/azure/site-recovery/azure-to-azure-common-questions",
    "https://learn.microsoft.com/en-us/azure/backup/secure-by-default",
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Manage Azure Identities and Governance (3)
    // ----------------------------------------------------------------------
    {
      slug: "role-assignments-at-the-right-scope",
      objective: "Assigning roles at different scopes",
      kind: "build",
      title: "Assign built-in roles at the right scope for four people",
      brief:
        "Orchard Street Analytics, a fictional company, has one subscription (sub-prod) containing the resource groups rg-web-prod, rg-data-prod and rg-shared-net. Four access requests arrive. (1) Dana, a new operations engineer, must be able to start, stop, resize and manage the disks of the VMs in rg-web-prod only, with no rights over the virtual network in rg-shared-net. (2) An external auditor must be able to view every resource in the whole subscription but change nothing. (3) Priya, the team lead, must be able to grant other people access to rg-data-prod but should not be able to change the data resources themselves. (4) A deployment pipeline's identity must create and manage any resource in rg-web-prod but must not be able to hand out access. Nobody is to receive Owner. For each request give the built-in role, the scope, and the command or portal step.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the four role assignments: role, scope, and how you create each.",
          parts: [
            part(
              "Dana (VM operations)",
              "Assigns Virtual Machine Contributor (not Contributor) at the rg-web-prod resource-group scope, explaining that it manages VMs and disks but grants no access to the virtual network or storage the VMs use; shows a create step such as az role assignment create with --assignee, --role and --scope, or the portal's Access control (IAM) blade on the resource group.",
              'Virtual Machine Contributor at scope /subscriptions/<sub-prod>/resourceGroups/rg-web-prod. That role creates and manages VMs and their disks but, by its own description, gives no management access to the virtual network or storage account -- which is what is wanted. az role assignment create --assignee dana@orchardstreet.example --role "Virtual Machine Contributor" --scope /subscriptions/<id>/resourceGroups/rg-web-prod'
            ),
            part(
              "External auditor",
              "Assigns Reader at the subscription scope, explaining it is inherited by every resource group and resource below and allows viewing only.",
              'Reader at the subscription scope: az role assignment create --assignee <auditor object id> --role Reader --scope /subscriptions/<id>. Reader views all resources and makes no changes, and an assignment at the subscription is inherited by every resource group and resource in it.'
            ),
            part(
              "Priya (grant access, not change data)",
              "Assigns User Access Administrator (or the narrower Role Based Access Control Administrator) at the rg-data-prod scope, explaining that it manages role assignments without granting rights over the resources themselves; does not use Owner.",
              'Role Based Access Control Administrator (or User Access Administrator) at /subscriptions/<id>/resourceGroups/rg-data-prod. Either role manages access by assigning Azure roles and neither lets Priya change the databases or storage; Owner is deliberately avoided because it would give both. Role Based Access Control Administrator is the narrower of the two (it cannot manage access through other means such as policy).'
            ),
            part(
              "Deployment pipeline identity",
              "Assigns Contributor at the rg-web-prod scope to the pipeline's service principal or managed identity, explaining Contributor manages all resources but cannot assign roles (unlike Owner).",
              'Contributor at /subscriptions/<id>/resourceGroups/rg-web-prod, assigned to the pipeline\'s managed identity or service principal: az role assignment create --assignee <principal object id> --role Contributor --scope /subscriptions/<id>/resourceGroups/rg-web-prod. Contributor has full access to manage resources but does not allow assigning roles in Azure RBAC, so the pipeline cannot hand out access.'
            ),
          ],
        },
      ],
    },
    {
      slug: "policy-assignments-for-a-subscription",
      objective: "Implementing and managing Azure Policy",
      kind: "build",
      title: "Design the Azure Policy assignments for a subscription",
      brief:
        "Kestrel Robotics, a fictional manufacturer, hands you four governance requirements for its production subscription. (1) Resources may only be created in the regions West Europe and North Europe. (2) Every resource group must carry a costCentre tag; if a resource inside a group lacks it, the tag should be copied from the resource group automatically, including on the 400 resources that already exist. (3) Every virtual machine should have the Azure Monitor agent installed, and VMs that already exist without it should be fixed, not just reported. (4) The security team wants to know about any storage account that still allows public blob access, but they are not yet ready to block them. Write the policy design: for each requirement name the effect, the scope, and whether a remediation task is needed; then describe how a legitimate exception (a single test resource group that must live in UK South) is handled without weakening the rule.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the policy design for the four requirements and the exception.",
          parts: [
            part(
              "Allowed regions",
              "Assigns the built-in allowed-locations definition with the Deny effect at the subscription (or a management group above it) with the two regions as the parameter value, so non-compliant deployments are refused.",
              'Assign the built-in "Allowed locations" definition at the subscription scope with the listOfAllowedLocations parameter set to westeurope and northeurope. Its effect is Deny: any create or update outside those regions fails. No remediation task -- Deny does nothing to existing resources; the compliance view lists them.'
            ),
            part(
              "Cost-centre tag inheritance",
              "Uses a Modify effect policy (for example the built-in 'Inherit a tag from the resource group if missing') assigned at the subscription, with a managed identity, plus a remediation task so the 400 existing resources get the tag; may pair it with a Deny or Audit for the resource groups themselves.",
              'Two assignments: a "Require a tag on resource groups" (Deny) for costCentre, and the built-in "Inherit a tag from the resource group if missing" with the Modify effect, parameter costCentre, assigned at the subscription with a system-assigned managed identity holding the rights to tag resources. Modify adds the tag to new and updated resources on the way in; a remediation task applies it to the 400 existing ones.'
            ),
            part(
              "Monitoring agent on every VM",
              "Uses a DeployIfNotExists effect policy (or the built-in initiative that deploys the Azure Monitor agent) with a managed identity, and creates a remediation task for existing VMs; explains DeployIfNotExists evaluates after the resource is created and deploys the missing related resource.",
              'Assign the built-in initiative/definition that deploys the Azure Monitor agent to virtual machines (effect DeployIfNotExists) at the subscription, with a managed identity that can install extensions. DeployIfNotExists runs after a VM is created or updated and deploys the extension if it is missing; a remediation task does the same for VMs that already exist. AuditIfNotExists would only report.'
            ),
            part(
              "Public blob access visibility",
              "Uses the Audit effect (report non-compliance without blocking) for storage accounts allowing public blob access, with the plan to change the effect to Deny later.",
              'Assign the storage-account public-access definition with its effect parameter set to Audit. The compliance dashboard then lists every account that allows public blob access and nothing is blocked; when the team is ready, change the assignment\'s effect to Deny.'
            ),
            part(
              "Handling the UK South exception",
              "Creates a policy exemption for the test resource group (with a category such as Waiver or Mitigated, an expiry date and a reason) rather than editing the allowed-locations list or excluding the scope permanently; notes an exclusion on the assignment's notScopes is the cruder alternative.",
              'Add a policy exemption on the allowed-locations assignment scoped to that one test resource group, category Waiver, with an expiry date and the reason recorded. The rule stays Deny for everything else and the exemption shows up in compliance reporting. Excluding the resource group from the assignment (notScopes) also works but is silent and permanent; widening the allowed list to UK South would weaken the rule for everyone.'
            ),
          ],
        },
      ],
    },
    {
      slug: "budget-advisor-cost-case",
      objective: "Managing costs with alerts, budgets, and Azure Advisor recommendations",
      kind: "case",
      title: "Get a subscription's spend under control",
      brief:
        "Bramblewood Health Software, a fictional company, gives you its non-production subscription. Last month's bill was 240 percent of the amount finance planned for, and nobody was warned. The subscription contains about 60 VMs used by developers, three Azure SQL databases, and a large number of managed disks. Resource groups are tagged with a team tag, mostly correctly.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Finance asks for a warning system first: they want to know during the month, not after it, and they want the engineering manager notified as well as themselves.",
          ask: "Set up the warning system. What do you create, at what scope, with what thresholds and recipients?",
          parts: [
            part(
              "Budget and alerts",
              "Creates a Cost Management budget at the subscription scope for the planned monthly amount with alert conditions at more than one threshold (for example actual 80 percent and 100 percent and a forecasted 100 percent) sending to an action group or email recipients that include finance and the engineering manager.",
              "A monthly budget in Cost Management at the subscription scope set to the planned amount, with alert conditions at 80 percent and 100 percent of actual cost and a forecast condition at 100 percent. Alerts go to an action group containing the finance mailbox and the engineering manager (email, plus SMS if they want paging), so the warning arrives mid-month when the forecast crosses the line."
            ),
          ],
        },
        {
          text: "The budget alert fires on day 12. In cost analysis you group by the team tag and see the data-platform team is responsible for 70 percent of spend. Azure Advisor's cost recommendations list eleven VMs as under-utilised, twenty unattached managed disks, and two SQL databases suitable for a reservation.",
          ask: "What do you do with each Advisor recommendation, and how do you find out who owns the eleven VMs?",
          parts: [
            part(
              "Acting on the recommendations",
              "Right-sizes or shuts down (deallocates, or schedules auto-shutdown for) the under-utilised VMs after confirming with their owners; deletes the unattached disks after checking they are not needed; and considers a reservation or savings plan for the steady SQL usage; notes Advisor recommendations can be postponed or dismissed if judged wrong.",
              "Under-utilised VMs: resize them to the smaller SKU Advisor proposes, or set auto-shutdown for dev machines that run overnight unused; deallocate rather than stop from inside the OS so compute billing ends. Unattached disks: confirm with owners, snapshot if in doubt, then delete -- they bill while attached to nothing. SQL reservation: the two databases run steadily, so buy a reserved capacity term (or a savings plan for databases) for them. Recommendations you disagree with can be postponed or dismissed in Advisor."
            ),
            part(
              "Finding the owners",
              "Uses cost analysis or the resource list filtered by the team tag (and the resource group / owner tag) to attribute the VMs, and fixes missing tags so attribution works next time.",
              "In cost analysis, group the eleven VMs by the team tag and resource group to see which team each belongs to; where the tag is missing, the resource group name and activity log (who created it) point to the owner. Add the missing team tags, and consider a policy that inherits the tag from the resource group so this does not recur."
            ),
          ],
        },
        {
          text: "Month end: spend is down to 110 percent of plan. Finance now wants one more thing: a hard stop. They ask whether a budget can simply switch the subscription off when the limit is reached.",
          ask: "Explain what a budget can and cannot do, and propose how to get closer to a hard stop.",
          parts: [
            part(
              "What a budget does and the closest thing to a hard stop",
              "States that a budget alerts (and can trigger an action group) but does not itself stop resources or cap billing; proposes an action group with an automation runbook, Logic App or Azure Function that deallocates tagged non-production VMs when the 100 percent alert fires, with the caveats of what that automation should exclude.",
              "A budget is a monitoring tool: when a threshold is crossed it notifies and can call an action group, but it never caps spending or turns anything off by itself. To approximate a hard stop, attach an action group to the 100 percent threshold that runs an Automation runbook (or Logic App / Function) which deallocates VMs carrying an environment=dev tag, leaving the shared SQL databases and anything tagged keep-running untouched. Make the exclusions explicit and tell the teams it exists."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Implement and Manage Storage (2)
    // ----------------------------------------------------------------------
    {
      slug: "sas-design-for-a-partner",
      objective: "Creating and using shared access signature (SAS) tokens",
      kind: "build",
      title: "Design SAS access for a partner and an app",
      brief:
        "Greywater Studios, a fictional animation house, has a storage account gwstudiosprod with a blob container renders. Two needs: (1) an external colour-grading partner must be able to download (read and list) the files under renders/episode-07/ for the next 14 days, from their office only, and the studio must be able to cut the access off at once if the contract ends early -- without rotating the account keys that other systems depend on. (2) The studio's own web app, which signs in with a managed identity, must hand browsers a short-lived link to download a single render file; the security team has banned storing account keys in the app. For each need, say which kind of SAS to use, how it is created and constrained, and how it would be revoked. State the general rules you apply to every SAS you issue.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the SAS design for the partner and the app, and your standing rules.",
          parts: [
            part(
              "Partner access",
              "Uses a service SAS on the renders container (read and list permissions) tied to a stored access policy that holds the 14-day expiry, with the partner's IP range in the signed IP field and HTTPS only; explains that revoking means deleting or editing the stored access policy, not regenerating the account key.",
              "A service SAS on the renders container with permissions r (read) and l (list), HTTPS only, the signed IP restricted to the partner's office range, and -- the important part -- associated with a stored access policy on the container that carries the 14-day start and expiry. Up to five stored access policies can exist per container. If the contract ends early, delete (or shorten) that stored access policy and every SAS issued under it stops working immediately; the account keys are untouched. (Scope the prefix by issuing the SAS per blob or by agreeing the partner reads only that folder; a container SAS grants the whole container, so a dedicated container per episode is the cleaner cut.)"
            ),
            part(
              "App-issued download links",
              "Uses a user delegation SAS, signed with a user delegation key obtained with the app's Microsoft Entra managed identity (which needs a role granting generateUserDelegationKey, such as Storage Blob Data Contributor/Reader plus the delegation permission), with a short expiry on the single blob; notes it is Microsoft's recommended SAS type and that stored access policies do not apply to it.",
              "A user delegation SAS per blob: the app's managed identity requests a user delegation key from the blob service (it needs an Azure RBAC role that includes Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey, for example Storage Blob Data Contributor or Storage Blob Delegator) and signs a read-only SAS on the one file with an expiry of a few minutes. No account key ever touches the app, and Microsoft recommends user delegation SAS for exactly this reason. Revocation: revoke the user delegation key (which invalidates every SAS signed with it) or remove the identity's role; stored access policies cannot be used with this type."
            ),
            part(
              "Standing rules for every SAS",
              "Lists at least three: HTTPS only, least privilege (read-only where possible, narrowest resource), near-term expiry, a start time a little in the past to allow clock skew, a revocation plan, and never sharing a SAS over an insecure channel; may mention preferring user delegation SAS and avoiding account SAS unless service-level operations are needed.",
              "Always HTTPS; grant the least permission on the narrowest resource (one blob rather than a container, read rather than write); use near-term expiry on ad hoc SAS; set the start time about 15 minutes in the past to absorb clock skew; have a revocation plan before issuing (stored access policy for service SAS, key revocation for user delegation SAS, key rotation as the last resort for account SAS); prefer user delegation SAS; reserve account SAS for cases that need account-level operations across services."
            ),
          ],
        },
      ],
    },
    {
      slug: "blob-lifecycle-policy-for-footage",
      objective: "Configuring blob lifecycle management",
      kind: "build",
      title: "Write a blob lifecycle policy for raw footage",
      brief:
        "Greywater Studios stores raw camera footage as block blobs in the container footage of a general-purpose v2 account. Editors work on a shoot's files heavily for about a month after upload, occasionally for the next six months, and after that the files are kept for legal reasons for seven years and almost never opened; when they are, a wait of several hours is acceptable. Finance wants storage cost minimised; the legal team insists nothing is deleted before seven years. Some blobs are rehydrated for a documentary now and then, and those must not be sent straight back to the archive the next day. Write the lifecycle rule (the actual JSON or an exact description of each action and its condition), then explain two things the team must know about how the policy behaves.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the lifecycle rule and the two behaviour notes.",
          parts: [
            part(
              "The rule",
              "Writes a rule filtered to blockBlob with prefixMatch footage/ whose baseBlob actions move to cool after about 30 days since modification, to archive after about 180-210 days, and delete after about 2,555 days (7 years), with daysAfterLastTierChangeGreaterThan on the archive action so rehydrated blobs are not re-archived immediately; conditions use daysAfterModificationGreaterThan (or creation).",
              '{"rules":[{"name":"footage-tiering","enabled":true,"type":"Lifecycle","definition":{"filters":{"blobTypes":["blockBlob"],"prefixMatch":["footage/"]},"actions":{"baseBlob":{"tierToCool":{"daysAfterModificationGreaterThan":30},"tierToArchive":{"daysAfterModificationGreaterThan":210,"daysAfterLastTierChangeGreaterThan":30},"delete":{"daysAfterModificationGreaterThan":2555}}}}}]} -- hot for the first month of editing, cool for the six months of occasional use, archive after that, deleted at seven years. The daysAfterLastTierChangeGreaterThan clause keeps a blob rehydrated for the documentary online for at least 30 days before it can be archived again.'
            ),
            part(
              "Behaviour note: tiers and minimums",
              "States the early-deletion minimums the tiers carry (cool 30 days, cold 90 days, archive 180 days) and that archive is offline -- reads need rehydration, which can take up to 15 hours at standard priority -- so the policy's day counts should not move data to a tier it will leave before the minimum.",
              "Each tier below hot has a minimum stay: 30 days in cool, 90 in cold, 180 in archive; moving or deleting earlier incurs an early-deletion charge for the remaining days. Archive is offline: a blob cannot be read until it is rehydrated to an online tier, which can take up to 15 hours (standard priority), so the seven-year legal copies are only right for archive because a wait of hours is acceptable. Archive cannot be the account's default tier; it is set per blob or by a rule like this one."
            ),
            part(
              "Behaviour note: how and when it runs",
              "Explains that the policy runs on a schedule (not instantly), that it cannot rehydrate blobs from archive (a Set Blob Tier or copy is needed for that), that filters combine with AND and prefixMatch must start with the container name, and that if several actions apply the least expensive wins.",
              "The policy is evaluated on a schedule, so a blob crossing a threshold today may move in a later run, not at once. It will never move a blob out of archive -- rehydration is a Set Blob Tier or Copy Blob operation you run yourself. prefixMatch entries must begin with the container name (footage/...), multiple filters are ANDed, and if two actions match the same blob the cheaper tier wins."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Deploy and Manage Azure Compute Resources (2)
    // ----------------------------------------------------------------------
    {
      slug: "modify-and-deploy-a-bicep-file",
      objective: "Modifying an existing Bicep file",
      kind: "build",
      title: "Modify a Bicep file and deploy it safely",
      brief:
        "A colleague at Tidewater Engineering, a fictional firm, leaves you this Bicep file, main.bicep:\n\nresource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {\n  name: 'tidewaterlogsdev'\n  location: 'westeurope'\n  sku: { name: 'Standard_LRS' }\n  kind: 'StorageV2'\n  properties: { allowBlobPublicAccess: false }\n}\n\nIt is deployed once per environment by hand. You are asked to: make the storage account name and the SKU parameters (the name must stay globally unique and lowercase; the SKU must only ever be Standard_LRS or Standard_GRS); take the location from the resource group instead of hard-coding it; add a tag environment whose value is passed in; output the account's primary blob endpoint; and deploy it to the resource group rg-logs-test with a preview of the changes before anything is created. Write the modified file and the deployment commands.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the modified Bicep and the commands you run.",
          parts: [
            part(
              "Parameters and validation",
              "Adds param declarations for the account name (string, with @minLength/@maxLength and a description, or a uniqueString-based default) and the SKU with an @allowed decorator listing Standard_LRS and Standard_GRS, and an environment parameter; uses them in the resource.",
              "@minLength(3)\n@maxLength(24)\n@description('Globally unique, lowercase letters and numbers only')\nparam storageAccountName string\n\n@allowed(['Standard_LRS', 'Standard_GRS'])\nparam skuName string = 'Standard_LRS'\n\nparam environment string\n\nThe resource then uses name: storageAccountName and sku: { name: skuName }. @allowed makes any other SKU fail at validation time, before deployment."
            ),
            part(
              "Location, tag and output",
              "Replaces the hard-coded location with resourceGroup().location (optionally via a location parameter defaulting to it), adds tags: { environment: environment } on the resource, and declares an output such as output blobEndpoint string = sa.properties.primaryEndpoints.blob.",
              "param location string = resourceGroup().location\n\nresource sa 'Microsoft.Storage/storageAccounts@2023-05-01' = {\n  name: storageAccountName\n  location: location\n  tags: { environment: environment }\n  sku: { name: skuName }\n  kind: 'StorageV2'\n  properties: { allowBlobPublicAccess: false }\n}\n\noutput blobEndpoint string = sa.properties.primaryEndpoints.blob"
            ),
            part(
              "Preview, then deploy",
              "Runs a what-if preview (az deployment group what-if, or az deployment group create --what-if / -c, or the PowerShell -WhatIf equivalent) against rg-logs-test, then az deployment group create with --template-file main.bicep and --parameters (inline key=value or a .bicepparam file), and checks provisioningState Succeeded; may mention Incremental is the default mode.",
              "Preview first: az deployment group what-if --resource-group rg-logs-test --template-file main.bicep --parameters storageAccountName=tidewaterlogstest skuName=Standard_LRS environment=test. Review the Create/Modify/Delete list, then deploy: az deployment group create --resource-group rg-logs-test --template-file main.bicep --parameters storageAccountName=tidewaterlogstest skuName=Standard_LRS environment=test (or --parameters test.bicepparam, which names the template itself). Success shows \"provisioningState\": \"Succeeded\" and the blobEndpoint output. Deployment mode stays Incremental, so nothing else in the resource group is removed."
            ),
          ],
        },
      ],
    },
    {
      slug: "deployment-slots-release",
      objective: "Configuring deployment slots for an App Service",
      kind: "case",
      title: "Release a web app through deployment slots",
      brief:
        "Marigold Bookings, a fictional travel site, runs its web app on Azure App Service. Every release so far has been a direct deploy to production with a few minutes of errors while the app warmed up, and one release had to be rolled back by redeploying the old package, which took 40 minutes. The app has an app setting ApiBaseUrl that differs between test and production, and a connection string to the production database.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The team is on the Basic (B1) App Service plan. They ask you to set up a staging slot so the next release can be tested before it goes live.",
          ask: "What must change before a slot can be created, and how do you set up the slot and its settings?",
          parts: [
            part(
              "Plan and slot creation",
              "States that deployment slots need the Standard, Premium or Isolated tier (Basic has none), so the plan must be scaled up first; then creates a staging slot (portal Deployment slots > Add, or az webapp deployment slot create), optionally cloning configuration from production.",
              "Scale the plan from B1 to at least Standard (S1): slots are only available in Standard, Premium and Isolated, and Standard allows up to five. Then add a slot named staging (Deployment > Deployment slots > Add slot, cloning settings from production; or az webapp deployment slot create --name marigold --resource-group rg-web --slot staging --configuration-source marigold)."
            ),
            part(
              "Settings that must not swap",
              "Marks ApiBaseUrl and the production connection string as deployment slot settings (sticky) so they stay with their slot during a swap, and explains the default: app settings and connection strings swap unless marked, while custom domains, TLS bindings, scale settings and managed identities never swap.",
              "In each slot's Environment variables, tick \"Deployment slot setting\" on ApiBaseUrl and on the database connection string so they stick to the slot: staging keeps its test API URL and production keeps its production connection string when the code swaps. Unmarked app settings and connection strings travel with the swap; custom domains, TLS/SSL bindings, scale settings and managed identities never do."
            ),
          ],
        },
        {
          text: "The new build is deployed to staging and tested. The release manager wants zero downtime and wants to be sure the app has production settings applied before it serves a single customer.",
          ask: "How do you perform the swap, and what does App Service do during it?",
          parts: [
            part(
              "Swap with preview and what happens",
              "Uses swap with preview (multi-phase swap): phase one applies production's slot settings to staging and restarts it so the team can validate staging with production configuration; Complete swap then switches routing; explains the warm-up (instances restarted and requested before routing changes) and that production stays online throughout.",
              "Start a swap with preview from staging to production. Phase one: App Service applies production's slot-specific settings to the staging instances and restarts them; the team hits the staging URL and confirms the app runs with production configuration. Then Complete swap: App Service waits until every staging instance has restarted and answered a warm-up request, then switches the routing rules so production now serves the warmed-up code; the old production code lands in the staging slot. Production never goes offline, and Cancel swap at phase one puts staging's own settings back."
            ),
          ],
        },
        {
          text: "Twenty minutes after the swap, customers report a checkout bug that testing missed.",
          ask: "How do you roll back, and what would you change so the next release exposes fewer customers to a bug like this?",
          parts: [
            part(
              "Rollback",
              "Swaps the slots again immediately, which puts the previous production code back in production (the old build is still in the staging slot), instead of redeploying a package.",
              "Swap staging and production again: the previous build is sitting in staging after the first swap, so swapping back restores it in seconds -- no 40-minute redeploy."
            ),
            part(
              "Reducing exposure next time",
              "Uses slot traffic routing to send a small percentage of production traffic (for example 10 percent) to the new build in staging before the full swap, noting clients are pinned to a slot for the session via the x-ms-routing-name cookie, and that testers can opt in with ?x-ms-routing-name=staging; may mention auto swap for fully automated pipelines (not on Linux).",
              "Before the next swap, set Traffic % on the staging slot to 10 so a tenth of real customers hit the new build while 90 percent stay on the current one; a client is pinned to its slot for about an hour by the x-ms-routing-name cookie, and testers can force the new build with ?x-ms-routing-name=staging. Watch the error rate, then raise the percentage or swap fully. Setting 0 percent keeps the slot private to the team while still reachable by that query string."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Implement and Manage Virtual Networking (2)
    // ----------------------------------------------------------------------
    {
      slug: "nsg-rules-for-a-two-tier-app",
      objective: "Creating and configuring network security groups (NSGs) and application security groups",
      kind: "build",
      title: "Write the NSG rules for a two-tier application",
      brief:
        "Saltmarsh Finance, a fictional company, has a VNet 10.20.0.0/16 with subnets snet-web 10.20.1.0/24 and snet-db 10.20.2.0/24. Three web VMs and two database VMs (PostgreSQL on TCP 5432) run there. Requirements: the internet may reach the web VMs on 443 only; the web VMs may reach the database VMs on 5432 and nothing else may; administrators connect to any VM over SSH (22) only through Azure Bastion (deployed in AzureBastionSubnet 10.20.250.0/26), never from the internet; the database VMs must not be able to reach the internet. The team will add web and database VMs over time and does not want to edit IP addresses in rules each time. Write the NSG design: which NSGs, where they attach, the rules with priorities and sources/destinations, and what the default rules already do for you.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the NSG and ASG design with the rule table.",
          parts: [
            part(
              "ASGs and attachment",
              "Creates application security groups (for example asg-web and asg-db) and attaches each VM's NIC to the right one so rules reference the ASG rather than IPs; attaches one NSG per subnet (or per NIC) and notes an NSG can be associated to subnets and NICs and that rules are stateful.",
              "Two application security groups, asg-web and asg-db, with each VM's network interface placed in the right one; new VMs just join the ASG and inherit the rules. One NSG per subnet: nsg-web on snet-web and nsg-db on snet-db. NSGs are stateful, so only the request direction needs a rule; return traffic is allowed automatically."
            ),
            part(
              "Inbound rules",
              "Lists custom inbound rules with priorities in the 100-4096 range: on nsg-web allow TCP 443 from Internet (service tag) to asg-web, allow TCP 22 from the AzureBastionSubnet range (or the Bastion subnet's prefix) to asg-web; on nsg-db allow TCP 5432 from asg-web to asg-db and TCP 22 from the Bastion subnet; relies on the default DenyAllInbound (65500) for everything else, or adds an explicit deny.",
              "nsg-web inbound: 100 Allow TCP 443 source Internet -> destination asg-web; 110 Allow TCP 22 source 10.20.250.0/26 (AzureBastionSubnet) -> asg-web. nsg-db inbound: 100 Allow TCP 5432 source asg-web -> asg-db; 110 Allow TCP 22 source 10.20.250.0/26 -> asg-db; 4000 Deny any source VirtualNetwork -> asg-db (optional, to override the default AllowVnetInBound so other VNet hosts cannot reach the database). Everything else falls to the default DenyAllInbound at 65500. Custom priorities must be 100-4096; lower numbers are evaluated first and processing stops at the first match."
            ),
            part(
              "Outbound rule for the database tier",
              "Adds an outbound rule on nsg-db denying traffic to the Internet service tag (priority below the default AllowInternetOutBound at 65001), keeping VirtualNetwork traffic allowed; may note that platform services needed for patching would need a specific allow or a route through a firewall/NAT gateway.",
              "nsg-db outbound: 100 Deny any from asg-db to destination service tag Internet. That overrides the default AllowInternetOutBound (65001) while the default AllowVnetOutBound (65000) still lets the database answer the web tier. If the database VMs need OS updates, allow the specific service tag or route them through Azure Firewall rather than opening the internet again."
            ),
            part(
              "What the defaults already do",
              "Explains the default rules (AllowVnetInBound 65000, AllowAzureLoadBalancerInBound 65001, DenyAllInbound 65500; AllowVnetOutBound 65000, AllowInternetOutBound 65001, DenyAllOutBound 65500), that they cannot be deleted but can be overridden by higher-priority rules, and why the AllowVnetInBound default means intra-VNet traffic is allowed unless denied.",
              "Every NSG ships with default rules that cannot be removed: inbound AllowVnetInBound (65000), AllowAzureLoadBalancerInBound (65001) and DenyAllInbound (65500); outbound AllowVnetOutBound (65000), AllowInternetOutBound (65001) and DenyAllOutBound (65500). Because AllowVnetInBound comes before the deny, anything inside the VNet can reach the database VMs unless a higher-priority custom rule denies it -- which is why nsg-db carries the explicit VirtualNetwork deny at 4000. The internet is already blocked inbound by DenyAllInbound; the 443 rule opens only what is needed."
            ),
          ],
        },
      ],
    },
    {
      slug: "diagnose-vm-connectivity",
      objective: "Troubleshooting network connectivity",
      kind: "case",
      title: "Diagnose why a VM cannot reach the database",
      brief:
        "At Saltmarsh Finance a new application VM, vm-app-03 (10.20.1.7, in snet-web), cannot connect to the database VM vm-db-01 (10.20.2.5) on TCP 5432, although vm-app-01 and vm-app-02 in the same subnet can. All three web VMs have the same NSG on the subnet. A route table is associated with snet-web that sends 0.0.0.0/0 to a firewall appliance at 10.20.3.4 in snet-fw. You have Network Watcher enabled in the region.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You start with the two things most likely to differ between vm-app-03 and its siblings.",
          ask: "Which Network Watcher tools do you run first, against what, and what would each tell you?",
          parts: [
            part(
              "First checks",
              "Runs IP flow verify (source vm-app-03 10.20.1.7, destination 10.20.2.5, TCP 5432, outbound) to see whether an NSG rule allows or denies and which rule, and checks effective security rules on vm-app-03's NIC (looking for an NSG attached to the NIC itself that the siblings lack); also checks effective routes / next hop for 10.20.2.5.",
              "IP flow verify on vm-app-03 for outbound TCP 10.20.1.7 -> 10.20.2.5:5432: it reports Allow or Deny and names the NSG rule responsible. Effective security rules for vm-app-03's NIC: since the subnet NSG is identical for all three VMs, a difference must come from an NSG attached to vm-app-03's NIC, which effective rules will show. Then Next hop (or effective routes) for destination 10.20.2.5 from vm-app-03, to see whether the packet goes VirtualNetwork or VirtualAppliance."
            ),
          ],
        },
        {
          text: "IP flow verify says Allow. Effective security rules show nothing unusual. Next hop for 10.20.2.5 from vm-app-03 returns VirtualAppliance 10.20.3.4 -- and the same query from vm-app-01 returns VirtualNetwork. Effective routes on vm-app-03 list a user-defined route 10.20.2.0/24 -> 10.20.3.4 that does not appear on vm-app-01.",
          ask: "Explain why vm-app-03 behaves differently, and why the traffic is being dropped rather than just taking a longer path.",
          parts: [
            part(
              "Why the routes differ",
              "Deduces that vm-app-03's NIC is in a different subnet, or a second route table with the 10.20.2.0/24 route is associated to the subnet/NIC it uses (route tables attach to subnets, so vm-app-03 must actually be in a subnet with a different route table, or the route was added after and the siblings' effective routes are stale); explains route selection: longest prefix match first, and for equal prefixes user-defined beats BGP beats system, so the /24 UDR overrides the system VNet route.",
              "A route table is associated to a subnet, not a VM, so if vm-app-03 sees a route the siblings do not, its NIC is in a different subnet (for example a snet-web-2 created for it with a second route table), or a new route table was associated to its subnet. Azure picks routes by longest prefix match first and then, for the same prefix, user-defined over BGP over system; 10.20.2.0/24 as a UDR is both more specific than and higher priority than the system route for the VNet, so the database traffic is sent to the appliance instead of directly."
            ),
            part(
              "Why it is dropped",
              "Explains that sending traffic via the appliance only works if the NVA's NIC has IP forwarding enabled, the NVA permits and forwards the flow, and the return path is symmetric (the database's subnet must also route back through the appliance, or the NVA must SNAT), otherwise the reply bypasses the appliance and the stateful NVA drops the asymmetric flow.",
              "The appliance at 10.20.3.4 either is not forwarding this flow (its NIC needs Azure's Enable IP forwarding plus forwarding in the OS, and a rule allowing 5432) or the path is asymmetric: vm-db-01's subnet has no route back through the appliance, so its replies go straight to 10.20.1.7 and a stateful firewall that never saw the reply direction drops the session. Either way the SYN from vm-app-03 never completes."
            ),
          ],
        },
        {
          text: "The owner confirms vm-app-03 was placed in a new subnet, snet-web2, which has a route table meant for a different project. The design intent is that web VMs reach the database directly and only internet-bound traffic goes through the firewall.",
          ask: "What is the fix, and how do you prove it worked?",
          parts: [
            part(
              "Fix",
              "Either moves vm-app-03's NIC to snet-web (same subnet and route table as its siblings) or corrects snet-web2's route table so it matches the intended design: remove the 10.20.2.0/24 route (or set its next hop to Virtual network), keeping only 0.0.0.0/0 -> 10.20.3.4; notes that a change to the route table applies to every VM in that subnet.",
              "Correct the design, not the symptom: either move vm-app-03's NIC into snet-web so it inherits the right NSG and route table, or edit snet-web2's route table to remove the 10.20.2.0/24 -> 10.20.3.4 route (leaving 0.0.0.0/0 -> 10.20.3.4 for internet egress), remembering that everything in snet-web2 shares that table. If a project genuinely needs database traffic inspected, it needs a symmetric return route on snet-db too."
            ),
            part(
              "Proof",
              "Re-runs Next hop (expecting VirtualNetwork) and IP flow verify, then tests the actual TCP connection (Connection troubleshoot in Network Watcher, or a client test from the VM), and optionally sets up Connection Monitor to watch 5432 reachability continuously.",
              "Re-run Next hop from vm-app-03 to 10.20.2.5 and expect VirtualNetwork; re-run IP flow verify for Allow; then use Network Watcher Connection troubleshoot from vm-app-03 to 10.20.2.5:5432 (or psql from the VM) to confirm the handshake completes. Add a Connection Monitor test for web-to-database 5432 so the next regression is caught before a user reports it."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Monitor and Maintain Azure Resources (2)
    // ----------------------------------------------------------------------
    {
      slug: "alert-rules-and-action-groups",
      objective: "Setting up alert rules, action groups, and alert processing rules in Azure Monitor",
      kind: "build",
      title: "Build the alerting for a production VM fleet",
      brief:
        "Wrenfield Payroll, a fictional company, runs twelve production VMs that send logs and metrics to a Log Analytics workspace. Operations wants: (1) a page to the on-call engineer when any VM's average CPU is above 85 percent for 15 minutes, resolving automatically when it drops; (2) an email to the security team whenever more than 20 failed Windows sign-ins (event ID 4625) are logged on one VM within 10 minutes; (3) a notification when anyone deletes a VM in the subscription; (4) silence for all VM alert notifications every Sunday 02:00-04:00 during patching, without disabling or editing the alert rules. Design the alert rules, the action groups and the processing rule.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the alert design: rules, action groups, and the maintenance-window rule.",
          parts: [
            part(
              "CPU alert",
              "Creates a metric alert rule on the Percentage CPU metric scoped to the twelve VMs (multi-resource, same region) with a static threshold greater than 85, aggregation Average, lookback/aggregation granularity 15 minutes, a frequency such as 5 minutes, and a severity chosen for paging; relies on metric alerts being stateful (fired then resolved when the condition clears).",
              "A metric alert rule, scope the twelve VMs (a multi-resource metric alert covering them all), signal Percentage CPU, condition Average greater than 85 over a 15-minute aggregation granularity, checked every 5 minutes, severity set to the level the team pages on. Metric alerts are stateful: the alert fires once, and is set to resolved automatically once the condition is no longer met."
            ),
            part(
              "Failed sign-in alert",
              "Creates a log search alert rule on the workspace with a KQL query over SecurityEvent (or Event) where EventID == 4625, summarised by Computer over a 10-minute window, with a threshold of more than 20 results per computer (split by dimension), evaluated every 5-10 minutes.",
              "A log search alert rule on the Log Analytics workspace: SecurityEvent | where EventID == 4625 | summarize Failures = count() by Computer, with the measure Failures, split by the Computer dimension, threshold greater than 20, aggregation period 10 minutes, evaluated every 5 minutes. Each VM that crosses 20 gets its own alert."
            ),
            part(
              "VM deletion alert",
              "Creates an activity log alert rule at the subscription scope for the Administrative category, operation Delete Virtual Machine (Microsoft.Compute/virtualMachines/delete), status Succeeded (or Started).",
              "An activity log alert rule scoped to the subscription: category Administrative, operation name Delete Virtual Machine (Microsoft.Compute/virtualMachines/delete), status Succeeded. It fires when the activity log records that event, whoever did it."
            ),
            part(
              "Action groups",
              "Defines separate action groups: an on-call group with SMS/voice/push (Azure mobile app) notifications and possibly a webhook or ITSM action for the CPU alert; an email group for security; a notification group for the deletion alert; notes action groups are reusable across rules and support email, SMS, push, voice, webhooks, Logic Apps, Functions, runbooks, ITSM and Event Hubs.",
              "ag-oncall: SMS and Azure mobile app push to the on-call engineer (plus a webhook to the paging tool if they have one), used by the CPU rule. ag-security: email to the security team mailbox, used by the sign-in rule. ag-platform: email to the platform team for the deletion rule. Action groups are reused across rules and can also trigger automation runbooks, Azure Functions, Logic Apps, Event Hubs or ITSM tickets."
            ),
            part(
              "Sunday maintenance window",
              "Creates an alert processing rule scoped to the twelve VMs (or their resource group) with the Suppress notifications action and a recurring weekly schedule Sunday 02:00-04:00, explaining it removes action groups from fired alerts in that window without changing the alert rules and the alerts are still recorded.",
              "An alert processing rule, scope the VMs' resource group, action Suppress notifications, schedule recurring weekly on Sunday 02:00-04:00 in the team's time zone. During the window fired alerts lose their action groups -- nobody is paged -- but the alerts still fire and are listed in the portal, and the alert rules themselves are untouched. Suppression takes priority over any other processing rule that adds action groups."
            ),
          ],
        },
      ],
    },
    {
      slug: "site-recovery-regional-failover",
      objective: "Performing a failover to a secondary region with Site Recovery",
      kind: "case",
      title: "Fail a workload over to a secondary region with Site Recovery",
      brief:
        "Wrenfield Payroll runs its payroll application on four Azure VMs (two web, one app, one SQL Server VM) in North Europe. The business requires that a regional outage lose no more than an hour of work and that the application be usable again within two hours. Nothing has been set up for regional recovery yet; the SQL Server VM must come back with a consistent database.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You are asked to set up disaster recovery to West Europe and to meet the stated recovery objectives.",
          ask: "What do you create, where, and how do you configure replication so the objectives are met?",
          parts: [
            part(
              "Vault and replication",
              "Creates a Recovery Services vault in the target region (not in the source region, so it survives the outage), enables Azure-to-Azure replication for the four VMs to West Europe with a target resource group, VNet and storage, and notes any two regions can be used (pairing is not required).",
              "Create a Recovery Services vault in West Europe (it must be outside the source region or it would be lost with it), then enable replication for the four VMs: source North Europe, target West Europe, with a target resource group, a target virtual network mapped to the production one, and cache storage in the source region. Site Recovery can replicate between any two Azure regions, so the paired region is a sensible default, not a requirement."
            ),
            part(
              "Recovery points for the objectives",
              "Sets a replication policy with app-consistent snapshots enabled at an hourly frequency (the minimum) for the SQL Server VM so the database is recoverable consistently, and retention long enough for the business; explains crash-consistent points are generated every five minutes automatically and the one-hour RPO is met by continuous replication plus hourly app-consistent points.",
              "Replication policy: app-consistent snapshot frequency 1 hour (the minimum available, and the one SQL Server needs because it captures in-memory transactions through VSS), recovery point retention at least 24 hours. Crash-consistent points are taken every five minutes regardless. That gives a consistent database point at most an hour old, inside the one-hour data-loss limit, with the five-minute crash-consistent points available for the web and app VMs."
            ),
          ],
        },
        {
          text: "Replication is healthy. The change board will not approve the design until it has been proven without touching production.",
          ask: "How do you prove it, and what do you use the result for?",
          parts: [
            part(
              "Test failover",
              "Runs a test failover of a recovery plan (all four VMs in order) to an isolated test VNet in West Europe, validates the application there, then cleans up the test failover; uses the job duration to estimate RTO against the two-hour target and the recovery point chosen to show RPO; notes production replication continues unaffected.",
              "Build a recovery plan grouping the four VMs (SQL first, then app, then web) and run a Test failover into a separate test VNet in West Europe so nothing collides with production. Log in, run payroll test transactions, confirm the database is consistent, then Cleanup test failover. The Site Recovery job shows how long the plan took to bring the VMs up -- that is the evidence against the two-hour RTO -- and replication to West Europe keeps running throughout. Site Recovery's own RTO SLA is one hour."
            ),
          ],
        },
        {
          text: "Six months later North Europe suffers a prolonged outage. Leadership declares a disaster.",
          ask: "Walk through the failover, which recovery point you choose, and what happens afterwards to get back to North Europe.",
          parts: [
            part(
              "Failover",
              "Starts a failover of the recovery plan from the vault (it does not need the source region to be reachable), chooses a recovery point: Latest (lowest RPO, processes pending data, slower) versus Latest processed (faster, slightly more data loss) versus the latest app-consistent point for the SQL VM; commits the failover after validation and repoints DNS/users.",
              "In the vault, run Failover on the recovery plan -- it works even though North Europe is unreachable. Recovery point: Latest (lowest RPO) processes all pending data first and costs some recovery time; Latest processed is quickest but may lose a few more minutes; for the SQL VM choose the latest app-consistent point so the database is clean. Validate, then Commit the failover (which discards the other recovery points) and switch DNS to the West Europe front end."
            ),
            part(
              "Afterwards: reprotect and failback",
              "Explains the VMs in West Europe are now unprotected and must be re-protected (replication reversed to North Europe) once that region is back, that only differences are synchronised if the source disks still exist, and that failback is then another failover in the opposite direction.",
              "After failover the VMs running in West Europe are unprotected. When North Europe is healthy again, Re-protect them: Site Recovery reverses replication to North Europe, synchronising only the changed data if the original disks still exist (usually a few hours). Once in sync, failback is simply a planned failover back to North Europe, followed by re-protecting again toward West Europe so the design is whole."
            ),
          ],
        },
      ],
    },
  ],
};
