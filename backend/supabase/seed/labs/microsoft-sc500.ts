import { GENERAL_SAFETY, matchPart, numericPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-268: Microsoft Certified: Cloud and AI Security Engineer Associate
// (SC-500), the replacement of AZ-500 (retired 2026-08-31).
//
// Aligned to the SC-500 study guide (no skills-measured date printed;
// published 2026-04-26, updated 2026-07-31; read 2026-11-14): Manage
// identity, access, and governance 20-25% / Secure storage, databases, and
// networking 25-30% / Secure compute 20-25% / Manage and monitor security
// posture 20-25%. Density (docs/labs.md, "hybrid"): one lab per domain plus
// six weighted extras -> 3 / 3 / 2 / 2 = 10 labs (9 build, 1 case).
//
// Every product behavior quoted was read on learn.microsoft.com on
// 2026-11-14 (sources[] lists the pages): PIM activation limits, Key Vault
// retention, lock behavior, NSG default rule priorities, private endpoint
// DNS, user delegation SAS, JIT defaults, Trusted launch, Sentinel roles and
// automation rule order. Nothing was deployed. Organizations are fictional.

export const SC500_LABS: SeedLabSet = {
  trackCode: "SC500",
  sources: [
    source("https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-500", "exam_outline", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-configure", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/entra/id-governance/privileged-identity-management/pim-resource-roles-configure-role-settings", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/key-vault/general/soft-delete-overview", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/key-vault/general/network-security", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/lock-resources", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/storage/common/storage-sas-overview", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/defender-for-cloud/just-in-time-access-usage", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/bastion/bastion-overview", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/virtual-machines/trusted-launch", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/sentinel/roles", "reference", "2026-11-14"),
    source("https://learn.microsoft.com/en-us/azure/sentinel/automate-incident-handling-with-automation-rules", "reference", "2026-11-14"),
  ],
  labs: [
    // ---------------------------------------------- Identity, access, governance (3)
    {
      slug: "sc500-pim-standing-admins",
      objective: "Making privileged roles eligible rather than permanent with PIM activation, approval and time limits",
      kind: "case",
      title: "Replace standing Owner rights with PIM",
      brief:
        "Lighthouse Ledger (fictional) has six engineers with permanent Owner on the production subscription. An audit finds that two of them signed in from an unmanaged laptop last month, and nobody can say who changed a firewall rule on a weekend.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The CISO wants nobody to hold Owner all the time, but the on-call engineer must still be able to fix production at night.",
          ask: "Design the PIM role settings for Owner on the subscription.",
          parts: [
            part(
              "Role settings",
              "Converts the permanent assignments to eligible; requires MFA (or a Conditional Access authentication context) and a justification on activation; sets a short activation maximum (from 1 to 24 hours, e.g. 2-4); requires approval by a named group except possibly for a break-glass path; sends notifications. Keeps two excluded break-glass accounts monitored.",
              "Make the six assignments eligible, not active. Activation requires MFA (or a Conditional Access requirement such as a phishing-resistant authentication strength or a compliant device), a justification and approval from the security leads group. Activation maximum duration is short (the slider allows 1 to 24 hours; 4 hours covers a night incident). Notify the security team on every activation. Keep two emergency-access accounts outside PIM, monitored and alerting on use."
            ),
          ],
        },
        {
          text: "An engineer complains that approval takes too long at 3 a.m.",
          ask: "What do you change, and what would you refuse to change?",
          parts: [
            part(
              "Tradeoff",
              "Keeps eligibility and MFA, but adds an on-call approver rota or a less privileged eligible role (e.g. Contributor or a custom role) that activates without approval for routine fixes; refuses to return to standing Owner.",
              "Add an on-call approver rotation, and give engineers an eligible Contributor or custom operations role that can activate without approval for routine fixes, keeping approval on Owner (which can grant access). Do not return to permanent assignments: just-in-time, time-bound access is the control the audit asked for."
            ),
          ],
        },
        {
          text: "Next quarter the auditors ask who used Owner and why.",
          ask: "Where does that evidence come from?",
          parts: [
            part(
              "Evidence",
              "PIM audit history / resource audit of activation requests, approvals and justifications, plus the Azure activity log for what was changed during the activation; access reviews of eligible assignments.",
              "PIM's audit history records each activation request, approver, justification and time window; the Azure activity log shows what the activated identity changed. A recurring PIM access review confirms the eligible assignments are still needed."
            ),
          ],
        },
      ],
    },
    {
      slug: "sc500-key-vault-hardening",
      objective: "Deploying Key Vault with RBAC access, network firewall rules, soft delete and purge protection",
      kind: "build",
      title: "Deploy a Key Vault an attacker cannot quietly empty",
      brief:
        "Canopy Health Apps (fictional) is creating a new Key Vault for an App Service that reads database secrets. Requirements: the app reads secrets with its managed identity and nothing else; only the platform team manages secrets; the vault is not reachable from the internet; a deleted secret or the whole vault can be recovered for 90 days, even by an admin who wants it gone.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the access model and roles, the network setting, and the recovery settings -- noting which ones can't be changed later.",
          parts: [
            matchPart(
              "Who gets which data-plane role (Azure RBAC)",
              "App Service managed identity -> Key Vault Secrets User; platform team -> Key Vault Secrets Officer; security auditors who must see vault properties but no secret values -> Reader (control plane only).",
              "Use the Azure RBAC permission model (access policies are legacy). The app's managed identity gets Key Vault Secrets User (read secret values). The platform team gets Key Vault Secrets Officer (manage secrets). Auditors get Reader on the vault: control-plane access to properties and tags, no access to keys, secrets or certificates -- the planes are authorized independently.",
              {
                left: ["App Service managed identity", "Platform team", "Security auditors (properties only)"],
                right: ["Key Vault Secrets User", "Key Vault Secrets Officer", "Reader", "Key Vault Administrator"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "Network",
              "Disables public network access (or firewall default deny) and adds a private endpoint in the app's integrated VNet with the private DNS zone; decides deliberately on the trusted-services bypass, knowing it still applies with public access disabled.",
              "Set public network access to Disabled and reach the vault through a private endpoint in the VNet the App Service is integrated with, with the privatelink.vaultcore.azure.net DNS zone linked. The 'Allow trusted Microsoft services' bypass still applies with public access disabled, so turn it off unless a listed service needs it."
            ),
            numericPart(
              "Retention days",
              "90 days, with purge protection enabled; states that the retention period is set at creation and can't be changed afterward and that purge protection prevents permanent deletion before it ends.",
              "Soft delete keeps deleted vaults and objects recoverable for 7 to 90 days, 90 by default; the period is chosen at vault creation and cannot be changed later, and the same interval applies to purge protection. Turn purge protection on (it cannot be turned off) so not even an administrator can purge before the 90 days pass.",
              { answer: 90, tolerance: 0 }
            ),
          ],
        },
      ],
    },
    {
      slug: "sc500-resource-locks",
      objective: "Protecting critical resources with CanNotDelete and ReadOnly locks",
      kind: "build",
      title: "Choose the right lock for four resources",
      brief:
        "Marlin Logistics (fictional) wants accidental-deletion protection after a contractor deleted a production resource group. The resources: the production resource group as a whole; a storage account that apps write to every minute; an ExpressRoute circuit that must never change without a change ticket; and a dev sandbox resource group.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each resource to a lock, then say who can remove a lock and what a lock does not do.",
          parts: [
            matchPart(
              "Lock per resource",
              "Production resource group -> CanNotDelete; busy storage account -> CanNotDelete (ReadOnly would stop users listing the account keys and assigning RBAC roles on it); ExpressRoute circuit -> ReadOnly; dev sandbox -> no lock.",
              "CanNotDelete (Delete in the portal) lets users read and modify but not delete; ReadOnly allows reading only, like limiting everyone to Reader. A lock at the resource group is inherited by every resource in it, including ones added later. A ReadOnly lock on a storage account prevents users from listing the account keys (a POST operation) and from assigning RBAC roles scoped to it, so it would break anything that relies on those; CanNotDelete is the safe choice there. The sandbox needs to be deletable.",
              {
                left: ["Production resource group", "Storage account written every minute", "ExpressRoute circuit that must not change", "Dev sandbox resource group"],
                right: ["CanNotDelete", "CanNotDelete (not ReadOnly)", "ReadOnly", "No lock"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Who removes locks and the limits",
              "Removing a lock needs Microsoft.Authorization/locks/* (Owner or User Access Administrator, or a custom role); locks apply to everyone including Owners (they must delete the lock first); locks protect the control plane, not data inside the resource, and are not a substitute for RBAC or backups.",
              "Creating or deleting locks requires Microsoft.Authorization/locks/* permissions, which Owner and User Access Administrator have. A lock applies to every user, Owners included -- they must remove it first, which is the point. Locks protect Azure Resource Manager operations; they do not stop someone with data access from deleting blobs, so keep RBAC tight and backups protected."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- Storage, databases, networking (3)
    {
      slug: "sc500-nsg-rule-priority",
      objective: "Filtering traffic with NSG rules and application security groups, reading rule priority",
      kind: "build",
      title: "Find which NSG rule lets RDP in from the internet",
      brief:
        "A VM subnet at Saltbush Media (fictional) has this inbound NSG rule list. The team intended to block RDP from the internet and allow it only from the admin jump network 10.20.0.0/24.\n\nPriority | Name | Source | Port | Action\n100 | Allow-Web | Internet | 443 | Allow\n150 | Allow-Mgmt-Any | Any | 3389 | Allow\n200 | Allow-Admin-RDP | 10.20.0.0/24 | 3389 | Allow\n300 | Deny-RDP-Internet | Internet | 3389 | Deny\n65000 | AllowVNetInBound | VirtualNetwork | Any | Allow\n65500 | DenyAllInbound | Any | Any | Deny",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the rule that admits RDP from the internet, fix the list, and say how to confirm the effect.",
          parts: [
            selectPart(
              "Rule that admits internet RDP",
              "Selects only priority 150 Allow-Mgmt-Any: rules run lowest number first and stop at the first match, so 150 matches internet RDP before the 300 deny is reached.",
              "Priority 150 (Allow-Mgmt-Any) allows 3389 from Any, which includes the internet. Rules are processed in priority order, lowest number first, and processing stops at the first match, so the deny at 300 is never reached for that traffic.",
              {
                lines: [
                  "100 | Allow-Web | Internet | 443 | Allow",
                  "150 | Allow-Mgmt-Any | Any | 3389 | Allow",
                  "200 | Allow-Admin-RDP | 10.20.0.0/24 | 3389 | Allow",
                  "300 | Deny-RDP-Internet | Internet | 3389 | Deny",
                  "65000 | AllowVNetInBound | VirtualNetwork | Any | Allow",
                  "65500 | DenyAllInbound | Any | Any | Deny",
                ],
                correct: [1],
                display: "table",
                header: "Priority | Name | Source | Port | Action",
              }
            ),
            part(
              "Fix and verify",
              "Deletes rule 150 (the 200 allow and the default DenyAllInbound then do the job; 300 is optional); prefers Bastion or JIT over open RDP; verifies with Network Watcher IP flow verify or effective security rules for the VM's NIC.",
              "Delete Allow-Mgmt-Any. RDP from 10.20.0.0/24 is then allowed at 200, and internet RDP falls through to Deny-RDP-Internet at 300 (or DenyAllInbound at 65500). Better still, remove inbound RDP entirely and use Azure Bastion or JIT. Confirm with Network Watcher: IP flow verify for an internet source on 3389 should report the deny rule, and Effective security rules on the NIC shows the combined subnet and NIC rules."
            ),
          ],
        },
      ],
    },
    {
      slug: "sc500-private-endpoint-dns",
      objective: "Reaching PaaS services privately with private endpoints and exposing your own services with Private Link",
      kind: "build",
      title: "Make a storage account reachable only from the VNet",
      brief:
        "Harborview Analytics (fictional) adds a private endpoint for its storage account's blob service in the app VNet and then disables public network access. VMs in the VNet now get 'This request is not authorized' errors, and nslookup analyticsdata.blob.core.windows.net from a VM returns a public IP address.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the failure, order the fix, and say what a private endpoint actually is.",
          parts: [
            part(
              "Why it fails",
              "The VMs still resolve the public endpoint because no private DNS zone (privatelink.blob.core.windows.net) is linked to the VNet, so traffic goes to the public address, which is now blocked.",
              "The name still resolves to the storage account's public IP, so the VMs connect over the public endpoint -- which public network access now rejects. The private endpoint is fine; DNS is not pointing at it."
            ),
            orderPart(
              "Fix steps",
              "Create or use the privatelink.blob.core.windows.net private DNS zone, link it to the VNet, register the endpoint's A record (a DNS zone group does it), then verify nslookup returns the private IP before relying on it.",
              "1) Create the private DNS zone privatelink.blob.core.windows.net. 2) Link it to the app VNet. 3) Add the A record for the private endpoint (attach a DNS zone group to the endpoint so it is managed automatically). 4) From a VM, nslookup analyticsdata.blob.core.windows.net should now return the endpoint's private IP via the privatelink CNAME.",
              [
                "Create the privatelink.blob.core.windows.net private DNS zone",
                "Link the zone to the app VNet",
                "Register the endpoint's A record (DNS zone group)",
                "Check that nslookup returns the private IP",
              ]
            ),
            part(
              "What a private endpoint is",
              "A network interface with a private IP from the subnet, mapped to one sub-resource (here blob) of the service via Private Link; the IP stays fixed for its life; other sub-resources (file, queue) need their own endpoints.",
              "A private endpoint is a read-only network interface with a private IP address from your subnet, connected through Azure Private Link to one sub-resource of the service (blob here). Its IP stays the same for its lifetime. Table, queue or file access would each need their own endpoint and zone."
            ),
          ],
        },
      ],
    },
    {
      slug: "sc500-user-delegation-sas",
      objective: "Granting storage access with Entra RBAC, user delegation SAS and stored access policies",
      kind: "build",
      title: "Replace account-key SAS links with safer access",
      brief:
        "Juniper Legal (fictional) shares case documents with outside reviewers through SAS links generated with the storage account key, valid for one year. Internal apps also use the account key in their connection strings. A former contractor still has a link.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the access method for each need, and say how to cut off the old links.",
          parts: [
            matchPart(
              "Access method per need",
              "Internal apps -> managed identity with an Azure RBAC data role (e.g. Storage Blob Data Reader); outside reviewer needing one folder for a week -> short-lived user delegation SAS scoped to the container/blob; links that must be revocable early without rotating keys -> service SAS tied to a stored access policy (or user delegation SAS revoked by revoking the delegation key).",
              "Apps authenticate with managed identities and RBAC data roles -- no keys. Microsoft recommends a user delegation SAS when a SAS is needed: it is signed with Microsoft Entra credentials, not the account key. A stored access policy lets you revoke service SAS tokens by changing or deleting the policy instead of rotating the key.",
              {
                left: ["Internal apps reading documents", "An outside reviewer needs one container for a week", "SAS links that must be revocable early"],
                right: ["Managed identity + Storage Blob Data Reader", "Short-lived user delegation SAS", "Service SAS bound to a stored access policy", "Account SAS with a one-year expiry"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "Cutting off the old links",
              "Rotate (regenerate) the account key that signed them -- which invalidates every SAS signed with it and breaks apps still on that key, so move apps to identity first -- then disallow Shared Key authorization so new account-key SAS can't be made; notes SAS generation itself is not audited.",
              "SAS tokens signed with the account key stay valid until they expire or the signing key is regenerated. Move the apps to managed identity, then regenerate the key that signed the links, then disallow Shared Key access on the account so no one can mint new account-key SAS. Microsoft notes that SAS generation cannot be audited, which is another reason to keep it rare and short-lived."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- Secure compute (2)
    {
      slug: "sc500-jit-and-bastion",
      objective: "Removing public management ports with Azure Bastion and just-in-time VM access",
      kind: "build",
      title: "Close RDP to the internet without locking out admins",
      brief:
        "Ironbark Engineering's (fictional) Windows VMs each have a public IP with RDP open to the internet so contractors can work from home. Defender for Cloud flags the management ports. Admins sometimes need RDP for a few hours.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Compare JIT and Bastion for this case, give JIT's default maximum access time, and recommend a design.",
          parts: [
            part(
              "What each does",
              "JIT (Defender for Servers) keeps management ports closed by NSG/firewall rules and opens them for a requested port, source IP and time window on request; Bastion gives RDP/SSH over TLS on 443 from the portal or native client to private IPs, so VMs need no public IP.",
              "Just-in-time access keeps 3389 closed and, when an authorized user requests access, opens it for that port, source address and time window, then closes it again. Azure Bastion is a managed service in the VNet that brokers RDP and SSH over TLS on port 443 from the portal or a native client, reaching VMs by private IP, so the VMs need no public IP at all."
            ),
            numericPart(
              "JIT default maximum access",
              "3 hours (default for both RDP 3389 and SSH 22, with allowed source Any by default -- which should be narrowed).",
              "By default JIT allows a maximum of 3 hours for RDP (3389) on Windows and SSH (22) on Linux, with allowed source IP addresses set to Any; narrow the source to the requester's IP.",
              { answer: 3, tolerance: 0 }
            ),
            part(
              "Recommendation",
              "Remove the public IPs, deploy Bastion for day-to-day admin access (with Entra sign-in/MFA on the portal), and keep JIT for any remaining port that must be opened, narrowed to the requester's IP and a short window; verify with Defender recommendations clearing.",
              "Remove the VMs' public IPs and NSG rules for 3389 from the internet. Contractors use Azure Bastion (portal access already behind Microsoft Entra sign-in and MFA). If some tool still needs a directly opened port, enable JIT on that port with a source restricted to the requester and a short window. The 'management ports should be closed' recommendation should then clear."
            ),
          ],
        },
      ],
    },
    {
      slug: "sc500-trusted-launch-vms",
      objective: "Encrypting VM disks and choosing secure boot, vTPM and the Trusted launch or confidential security type",
      kind: "build",
      title: "Choose VM security features for a new image",
      brief:
        "Kestrel Robotics (fictional) is building Gen2 Windows Server and Ubuntu images for new VMs. The security team wants protection against boot kits and rootkits, measured boot evidence for attestation, and disks encrypted with keys the company controls. One Ubuntu image needs NVIDIA GRID drivers.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each requirement to the feature, and flag the one conflict.",
          parts: [
            matchPart(
              "Feature per requirement",
              "Boot kits and rootkits -> Secure Boot; measured boot evidence for attestation -> vTPM with integrity monitoring; company-controlled disk keys -> server-side encryption with customer-managed keys (disk encryption set in Key Vault); the default security type for new Gen2 VMs -> Trusted launch.",
              "Secure Boot lets only signed operating systems and drivers boot, protecting against boot kits and rootkits. The virtual TPM measures the whole boot chain and enables remote attestation; integrity monitoring reports it. Customer-managed keys in Key Vault, through a disk encryption set, put the company in control of disk encryption keys. Trusted launch, which bundles Secure Boot and vTPM, is the default for new Gen2 VMs.",
              {
                left: ["Protection against boot kits and rootkits", "Measured boot evidence for attestation", "Disk keys the company controls", "Default security type for new Gen2 VMs"],
                right: ["Secure Boot", "vTPM with integrity monitoring", "Customer-managed keys via a disk encryption set", "Trusted launch", "Public IP with an NSG"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Conflict",
              "Installing the GRID driver on Linux requires Secure Boot to be disabled, so that Ubuntu image can't have Secure Boot; document the exception and compensate (vTPM still on, tighter network and monitoring) or choose a different driver approach.",
              "Microsoft's Trusted launch page says GRID driver installation requires Secure Boot to be disabled on Linux VMs. That image needs a documented exception: keep vTPM and the other controls, isolate it on the network, and watch it closely -- or reconsider whether GRID is required."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- Security posture (2)
    {
      slug: "sc500-sentinel-least-privilege",
      objective: "Creating a Sentinel workspace and assigning Reader, Responder and Contributor roles on least privilege",
      kind: "build",
      title: "Assign Sentinel roles to a small security team",
      brief:
        "Tidewater Clinics (fictional) is turning on Microsoft Sentinel. People: a tier-1 analyst who triages and assigns incidents; a detection engineer who writes analytics rules and workbooks; an auditor who only reviews incidents; and the Sentinel service itself, which must be able to run playbooks from automation rules.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each person or identity to the least-privilege Sentinel role.",
          parts: [
            matchPart(
              "Role per person",
              "Tier-1 analyst -> Microsoft Sentinel Responder; detection engineer -> Microsoft Sentinel Contributor; auditor -> Microsoft Sentinel Reader; Sentinel running playbooks from automation rules -> Microsoft Sentinel Automation Contributor.",
              "Reader views data and incidents. Responder adds managing incidents (assign, change status). Contributor can also create and edit content such as analytics rules and workbooks. Automation Contributor allows Microsoft Sentinel to add playbooks to automation rules and is not used for user accounts. Playbook Operator lets a person list and manually run playbooks.",
              {
                left: ["Tier-1 analyst (triage, assign)", "Detection engineer (analytics rules, workbooks)", "Auditor (review only)", "Sentinel service running playbooks"],
                right: ["Microsoft Sentinel Responder", "Microsoft Sentinel Contributor", "Microsoft Sentinel Reader", "Microsoft Sentinel Automation Contributor", "Owner"],
                pairs: [0, 1, 2, 3],
              }
            ),
          ],
        },
      ],
    },
    {
      slug: "sc500-automation-rule-order",
      objective: "Automating incident handling with automation rules and playbooks",
      kind: "build",
      title: "Order automation rules so the right one runs first",
      brief:
        "Tidewater Clinics (fictional) has three automation rules on incident creation: (A) close incidents from a known noisy test host as benign; (B) assign all high-severity incidents to the on-call analyst; (C) run a playbook that enriches every remaining incident with threat intelligence; (D) post every still-open incident, with its enrichment, to the security channel. Today rule C runs first and spends money enriching test-host noise.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Set the order and explain how Sentinel decides it.",
          parts: [
            orderPart(
              "Execution order",
              "A first (suppress noise), then B (assign), then C (enrich), then D (notify), using increasing order numbers.",
              "Give A the lowest order number, then B, C and D. Closing the test-host incidents first means later rules' conditions (status not Closed) can skip them; assignment and enrichment come before the notification so the post carries the owner and the enrichment.",
              ["A: close test-host noise", "B: assign high severity to on-call", "C: enrichment playbook", "D: notify the channel about open incidents"]
            ),
            part(
              "How order works",
              "Automation rules of the same trigger run in order of their order number; rules created in the portal get one, but those created by API or CLI need it set manually, and nothing stops two rules sharing a number (then their relative order isn't guaranteed). Rule C should add a condition such as status is not Closed.",
              "The order number determines execution order. The portal assigns it; rules created through the API, CLI or templates must set it themselves. Nothing prevents two rules of the same trigger from sharing a number, in which case their order is not guaranteed -- so give each a distinct number and make C's condition exclude closed incidents."
            ),
          ],
        },
      ],
    },
  ],
};
