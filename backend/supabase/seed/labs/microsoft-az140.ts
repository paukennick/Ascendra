import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-156: Microsoft Certified: Azure Virtual Desktop Specialty (AZ-140).
//
// Aligned to the AZ-140 study guide (skills measured as of July 20, 2026;
// re-read 2026-11-07): Plan and implement an AVD infrastructure 40-45% /
// Identity and security 15-20% / User environments and apps 20-25% /
// Monitor and maintain 10-15%.
//   https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-140
// Density (docs/labs.md, policy "hybrid"): 3 / 2 / 2 / 2 = 9 labs
// (7 build, 2 case).
//
// Every setting, port, role name and app ID below was read on
// learn.microsoft.com on 2026-11-07 (sources[]). Names follow the current
// pages: Windows App, App attach (not "MSIX app attach"), Microsoft Entra ID,
// Microsoft Entra Kerberos. Every lab is needs_expert_review until an AVD
// administrator checks it.

export const AZ140_LABS: SeedLabSet = {
  trackCode: "AZ140",
  sources: [
    // Exam outline (checked 2026-11-07)
    source("https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-140", "exam_outline", "2026-11-07"),
    // Host pool load balancing
    source("https://learn.microsoft.com/azure/virtual-desktop/host-pool-load-balancing", "reference", "2026-11-07"),
    // FSLogix storage options, share and NTFS permissions
    source("https://learn.microsoft.com/he-il/azure/virtual-desktop/store-fslogix-profile", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/fslogix/fslogix-storage-config-ht", "reference", "2026-11-07"),
    // RDP Shortpath and RDP Multipath
    source("https://learn.microsoft.com/azure/virtual-desktop/rdp-shortpath", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/virtual-desktop/rdp-multipath", "reference", "2026-11-07"),
    // Microsoft Entra joined session hosts
    source("https://learn.microsoft.com/en-us/azure/virtual-desktop/deploy-azure-ad-joined-vm", "reference", "2026-11-07"),
    // Conditional Access for AVD
    source("https://learn.microsoft.com/en-us/azure/virtual-desktop/set-up-mfa", "reference", "2026-11-07"),
    // FSLogix configuration reference
    source("https://learn.microsoft.com/en-us/fslogix/reference-configuration-settings", "reference", "2026-11-07"),
    // App attach
    source("https://learn.microsoft.com/azure/virtual-desktop/app-attach-overview", "reference", "2026-11-07"),
    // Autoscale scaling plans
    source("https://learn.microsoft.com/he-il/azure/virtual-desktop/autoscale-scaling-plan", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-au/azure/virtual-desktop/autoscale-scenarios", "reference", "2026-11-07"),
    // Multiregion BCDR
    source("https://learn.microsoft.com/en-us/azure/architecture/example-scenario/azure-virtual-desktop/azure-virtual-desktop-multi-region-bcdr", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Unit 1: Plan and Implement an Azure Virtual Desktop Infrastructure (3)
    // ----------------------------------------------------------------------
    {
      slug: "avd-host-pool-architecture",
      objective: "Planning a host pool architecture",
      kind: "build",
      title: "Plan host pools for three groups of users",
      brief:
        "Caldera Insurance is moving 900 users to Azure Virtual Desktop. (1) 700 claims and call-centre staff use the same browser-based apps and Microsoft 365; the finance director wants the lowest running cost and is willing to accept slightly more contention at peak. (2) 150 underwriters run a memory-hungry pricing tool and complain whenever a desktop is slow; cost matters less for them. (3) 50 developers need local administrator rights and install their own tools, and each must keep the same machine from day to day. All session hosts will run a Windows 11 Enterprise multi-session image where it applies.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the host pools: type, load balancing, session limits and assignment for each group.",
          parts: [
            part(
              "Claims and call-centre staff",
              "Pooled host pool with depth-first load balancing and an explicit maximum session limit (the default 999999 must be changed), because depth-first fills hosts before starting new ones and lets more hosts be powered off; sizes the limit from monitoring.",
              "A pooled host pool, depth-first load balancing, and a maximum session limit set to a real number (depth-first requires one; the default of 999999 is only the breadth-first placeholder). Depth-first keeps new sessions on the fullest host that still has room, so fewer hosts need to run off-peak. Pick the limit from Azure Virtual Desktop Insights session and performance data, then tune it."
            ),
            part(
              "Underwriters",
              "Pooled host pool with breadth-first load balancing (even distribution, less CPU/memory contention), on larger memory-optimised session hosts, kept separate from the call-centre pool.",
              "A separate pooled host pool on memory-optimised session hosts with breadth-first load balancing, which spreads new sessions across the hosts with the fewest sessions so CPU, memory and disk are less contended. No session limit is needed for breadth-first, but a sensible ceiling still protects the pricing tool."
            ),
            part(
              "Developers",
              "Personal host pool (one user per session host, so load balancing does not apply) with direct or automatic assignment and local administrator rights granted on their own VM.",
              "A personal host pool: each developer is mapped 1:1 to a session host, so there is no load balancing, and they keep the same machine. Assign directly (or automatically on first sign-in) and grant local administrator rights on that VM only."
            ),
            part(
              "Shared behaviours to plan for",
              "Notes that a returning user is sent back to the host holding their existing (active or disconnected) session even in drain mode, that drain mode keeps new users off a host, and that lowering a session limit does not disconnect existing sessions.",
              "Reconnects always go to the host that already holds the user's active or disconnected session, even if that host is in drain mode; drain mode only stops new sessions landing there, which is how hosts are emptied for maintenance. Lowering the maximum session limit later does not affect sessions already running."
            ),
          ],
        },
      ],
    },
    {
      slug: "avd-profile-storage-plan",
      objective: "Planning storage for Azure Virtual Desktop user data",
      kind: "build",
      title: "Plan FSLogix profile storage for a hybrid organisation",
      brief:
        "Marlow & Finch Solicitors has 1,200 Azure Virtual Desktop users with hybrid identities (synchronised from on-premises Active Directory Domain Services to Microsoft Entra ID). The fee-earners are 'medium' knowledge workers in Microsoft 365; a 60-person litigation-support team works with very large document sets and is classed as a heavy workload. The firm wants a managed Azure service, no file servers to patch, zone resilience in its primary region, and user profiles that only the owning user can open. Session hosts are domain-joined to the on-premises AD DS over ExpressRoute.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the profile-storage design.",
          parts: [
            part(
              "Service and tier",
              "Chooses Azure Files Premium file shares for the FSLogix containers (the recommendation for most customers; medium and heavy workloads need Premium), with zone-redundant storage, and considers Azure NetApp Files only if the heavy team's IOPS or latency needs exceed what a Premium share gives.",
              "Azure Files Premium for the profile containers: Microsoft recommends Azure Files for most FSLogix deployments and Premium for medium and heavy workloads (standard shares are only suggested for light workloads). Use ZRS for zone resilience. Keep Azure NetApp Files (Standard/Premium/Ultra tiers, about 1 ms latency) as the step up if the litigation team's measured IOPS or latency outgrow a Premium share."
            ),
            part(
              "Identity for the share",
              "Enables identity-based SMB authentication on the storage account for the firm's identities -- on-premises AD DS authentication (or Microsoft Entra Kerberos for hybrid identities) -- so hybrid users get Kerberos access without storage keys; cloud-only accounts are not what this firm has.",
              "Turn on identity-based authentication for SMB on the storage account. With domain-joined session hosts and hybrid identities, on-premises AD DS authentication (joining the storage account to the domain) works, and Microsoft Entra Kerberos for hybrid identities is the alternative that avoids line of sight to a domain controller for the share. Users then access their container with their own Kerberos ticket, never a storage account key."
            ),
            part(
              "Share-level permissions",
              "Assigns Storage File Data SMB Share Contributor as the default share-level permission for all authenticated users, and Storage File Data SMB Share Elevated Contributor only to the admins who must set Windows ACLs.",
              "Default share-level permission: Storage File Data SMB Share Contributor for all authenticated identities. Give Storage File Data SMB Share Elevated Contributor only to the admin group that sets the NTFS ACLs, so nobody needs the storage account key for that."
            ),
            part(
              "NTFS permissions",
              "Removes inheritance on the share root and sets: CREATOR OWNER Modify on subfolders and files only; the admin group Full Control on this folder, subfolders and files; the users group Modify on this folder only -- so each user's container folder is readable by that user alone.",
              "On the share root: disable inheritance, then CREATOR OWNER = Modify, subfolders and files only; the firm's admin group = Full Control, this folder, subfolders and files; the AVD users group = Modify, this folder only. Users can create their own profile folder, and the folder they create is theirs alone. (icacls: /inheritance:r, CREATOR OWNER (OI)(CI)(IO)(M), admins (OI)(CI)(F), users (M).)"
            ),
          ],
        },
      ],
    },
    {
      slug: "rdp-shortpath-rollout",
      objective: "Planning and implementing RDP Shortpath, RDP Multipath, and quality of service (QoS) policies",
      kind: "build",
      title: "Plan RDP Shortpath for office and home users",
      brief:
        "Harrowgate Council runs Azure Virtual Desktop for 2,000 staff. Office users reach Azure over an ExpressRoute private peering; home users connect over the internet with Windows App on Windows laptops. Users on both groups report choppy Teams calls and laggy screen updates. A network engineer notes that today every session uses the TCP reverse-connect transport, that the session hosts' network security group only allows what the AVD service needs, and that the office firewall blocks all outbound UDP.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the plan to enable UDP transports for both groups and prioritise RDP traffic.",
          parts: [
            part(
              "Office users (managed network)",
              "Enables RDP Shortpath for managed networks over the ExpressRoute private connection: a UDP listener on the session hosts (port 3390 by default) with the NSG allowing that inbound UDP port from the office ranges, or the STUN variant that needs no inbound port; and gets the office firewall to allow the UDP flow.",
              "RDP Shortpath for managed networks, because the office has private connectivity (ExpressRoute private peering). Enable the Shortpath listener on the session hosts, UDP port 3390 by default, and allow that inbound UDP port from the office address ranges in the session hosts' NSG; or use the managed-network STUN option, which needs no inbound port on the hosts. Either way the office firewall must stop blocking the outbound UDP."
            ),
            part(
              "Home users (public network)",
              "Enables RDP Shortpath for public networks: a direct UDP connection via STUN when NAT allows it, otherwise a relayed UDP connection via TURN; allows from the session host subnet outbound UDP 1024-65535 (default range 49152-65535) for STUN and UDP 3478 to 51.5.0.0/16 for the STUN/TURN relay.",
              "RDP Shortpath for public networks. Windows App first tries a direct UDP path with STUN; if NAT prevents it, a relayed UDP path through TURN. On the session host VNet allow outbound UDP from the VM subnet to any destination on ports 1024-65535 (the default client range is 49152-65535) for the direct path, and outbound UDP 3478 to 51.5.0.0/16 for the STUN/TURN relay."
            ),
            part(
              "Fallback and Multipath",
              "Explains that RDP always starts with TCP reverse connect and keeps it as the fallback when UDP is blocked, and that RDP Multipath (Windows App 2.0.559.0 or later, redundant TCP paths from 2.0.1069.0) monitors several STUN/TURN/TCP paths and switches to a standby path if the active one fails, needing no configuration beyond Shortpath working.",
              "Every connection begins on the TCP reverse-connect transport and only moves to UDP if Shortpath succeeds, so a blocked UDP path degrades to TCP rather than failing. With Shortpath in place, RDP Multipath on supported Windows App versions (2.0.559.0 or later for multiple UDP paths; 2.0.1069.0 or later adds redundant TCP paths) keeps backup paths on standby and switches when the active path degrades, which cuts disconnects; it needs no setting of its own."
            ),
            part(
              "QoS",
              "Applies DSCP marking to RDP traffic through a QoS policy (Group Policy or Intune) on the session hosts for the managed-network path, honoured end to end on the council's network, noting DSCP-based QoS applies to the managed network route, not the public internet.",
              "Use a QoS policy on the session hosts to mark RDP Shortpath traffic with a DSCP value and configure the council's switches, routers and ExpressRoute path to honour it. DSCP marking only helps on the managed network: the public internet ignores it, so home users rely on Shortpath and Multipath alone."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 2: Plan and Implement Identity and Security (2)
    // ----------------------------------------------------------------------
    {
      slug: "avd-identity-scenario",
      objective: "Selecting an identity scenario for Azure Virtual Desktop -- Active Directory Domain Services, Microsoft Entra ID, and Microsoft Entra Domain Services",
      kind: "build",
      title: "Choose the identity model for two Azure Virtual Desktop deployments",
      brief:
        "Pelican Media has two projects. (A) A new, cloud-only subsidiary with 300 staff whose accounts exist only in Microsoft Entra ID; it has no Active Directory, uses Intune for devices, needs FSLogix profiles on Azure Files, and some staff connect from personal macOS laptops and the web client. (B) The parent company's 2,500 hybrid users (synchronised from on-premises AD DS) who must print to on-premises print servers and open file shares that use Windows authentication from inside their desktops; the company wants to stop depending on domain controllers reachable from Azure if it can.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the identity scenario for each project and list what it requires.",
          parts: [
            part(
              "Project A: scenario",
              "Microsoft Entra joined session hosts (cloud-only identities, no domain controllers or Entra Domain Services needed), enrolled in Intune automatically at creation; the host pool contains only Entra-joined VMs.",
              "Join the session hosts to Microsoft Entra ID directly. Entra-joined VMs remove the need for line of sight to a domain controller or for Entra Domain Services, and choosing Microsoft Entra ID at host-pool creation offers automatic Intune enrolment. Keep the host pool homogeneous: only Entra-joined hosts in it."
            ),
            part(
              "Project A: access and profiles",
              "Assigns the Virtual Machine User Login role (Virtual Machine Administrator Login for admins) to the users on the VMs or resource group where the host pool has no session host configuration, adds the custom RDP property targetisaadjoined:i:1 for the web and macOS clients (username/password only), and stores FSLogix profiles on Azure Files with Microsoft Entra Kerberos, which supports cloud-only identities.",
              "Give the user group Virtual Machine User Login at the resource group (Virtual Machine Administrator Login only for admins who need local admin), unless the host pool uses a session host configuration, which handles that. Because some users come from macOS and the web client, add targetisaadjoined:i:1 to the host pool's RDP properties; those clients can then sign in with username and password. Profiles go on Azure Files with Microsoft Entra Kerberos authentication, which is supported for cloud-only identities. Enable single sign-on for the best experience on all platforms."
            ),
            part(
              "Project B: scenario",
              "Keeps session hosts joined to Active Directory Domain Services (or Microsoft Entra Domain Services) because on-premises Kerberos resources (print servers, Windows-authenticated shares) need an AD identity with line of sight, and explains why Entra-only join does not meet that need.",
              "Project B's desktops must use Windows authentication against on-premises print servers and shares, which requires an Active Directory and line of sight to it from the session hosts. So the session hosts stay AD DS joined (domain controllers reachable from Azure over the private connection), or Microsoft Entra Domain Services if the company accepts a managed domain. Entra-joined hosts alone cannot reach those resources."
            ),
            part(
              "Project B: reducing the DC dependency",
              "Explains that hybrid users could later move to Entra-joined hosts only for the resources that do not need on-premises Kerberos, that Entra-joined hosts still need AD for on-premises resources, and recommends Microsoft Entra Kerberos for Azure Files so at least the profile share does not need a domain controller.",
              "Entra-joined hosts can serve hybrid users, but accessing on-premises resources from them still needs AD and line of sight, so the dependency cannot be removed while printing and file shares stay on-premises. What can go now: put FSLogix on Azure Files with Microsoft Entra Kerberos (hybrid identities are supported), so profile access no longer depends on a domain controller, and move the remaining Kerberos resources to Azure over time."
            ),
          ],
        },
      ],
    },
    {
      slug: "avd-conditional-access-mfa",
      objective: "Planning and implementing Microsoft Entra Conditional Access policies for connections to Azure Virtual Desktop",
      kind: "case",
      title: "Roll out multifactor authentication for Azure Virtual Desktop",
      brief:
        "Orwell Analytics has Microsoft Entra ID P1 licences and a security group, AVD-Users, containing everyone who uses Azure Virtual Desktop. Session hosts are Microsoft Entra joined with single sign-on enabled on the host pool. The security team wants every AVD connection protected by multifactor authentication (MFA), re-authentication at least once an hour, and no impact on the Azure portal sign-ins of the same people. Security Defaults are currently off and some users still have legacy per-user MFA enabled.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "A junior admin drafts one Conditional Access policy: users = AVD-Users, target resource = 'Azure Virtual Desktop' only, grant = require MFA. Before enabling it, they ask you to review it.",
          ask: "Review the draft: which target resources should be covered, and why?",
          parts: [
            part(
              "Target resources",
              "Covers both the Azure Virtual Desktop app (9cdead84-a844-4324-93f2-b2e6bb768d07: feed subscription and gateway authentication) and, because SSO is enabled, the Windows Cloud Login app (270efc09-cd0d-444b-a71f-39af4910ec45: session host sign-in), with aligned policies, preferably as two separate policies.",
              "With single sign-on two applications take part in a connection: Azure Virtual Desktop (app ID 9cdead84-a844-4324-93f2-b2e6bb768d07) handles the feed and gateway authentication, and Windows Cloud Login (270efc09-cd0d-444b-a71f-39af4910ec45) handles the sign-in to the session host. Both need Conditional Access policies that match each other, otherwise users get MFA prompts at unexpected times. Create two policies, one per app, rather than one combined policy."
            ),
            part(
              "What not to target",
              "Excludes the Azure Virtual Desktop Azure Resource Manager Provider app (50e95039-b200-4007-bc97-8d5790743a63), which only retrieves the feed and must not require MFA, and does not block the Windows 365 app (0af06dc6-e4b5-4f28-818e-e78e62d137a5), which would break AVD sign-ins.",
              "Do not add the Azure Virtual Desktop Azure Resource Manager Provider app (50e95039-b200-4007-bc97-8d5790743a63); it is used only to retrieve the user's feed and should not require MFA. And check no other policy blocks the Windows 365 app (0af06dc6-e4b5-4f28-818e-e78e62d137a5), because blocking it causes AVD sign-in failures."
            ),
          ],
        },
        {
          text: "The two policies are created. Now the security team asks for the hourly re-authentication requirement and asks whether 'Every time' should be used.",
          ask: "Configure sign-in frequency for both policies.",
          parts: [
            part(
              "Sign-in frequency",
              "Sets periodic reauthentication of 1 hour on the Azure Virtual Desktop policy and the same or stricter on the Windows Cloud Login policy, explaining that a mismatch causes unexpected mid-session or reconnect prompts and that an established connection is not interrupted when the frequency elapses.",
              "On the Azure Virtual Desktop policy set sign-in frequency to periodic reauthentication, 1 hour: MFA is required again if a new connection is launched more than an hour after the last authentication. On the Windows Cloud Login policy use a value that matches or exceeds it. A mismatch produces reauthentication prompts mid-session or on reconnect. An already-established session is not prompted when the hour passes; only a new connection is."
            ),
            part(
              "'Every time'",
              "Explains 'Every time' is supported only on the Windows Cloud Login app with SSO enabled, and that it then prompts for new connections launched 5 to 10 minutes after the last authentication.",
              "'Every time' is only supported on the Windows Cloud Login app, and only with single sign-on enabled on the host pool. If chosen there, users are prompted again when they launch a new connection more than 5 to 10 minutes after their last authentication. For an hourly requirement it is more than the team asked for, so use the 1-hour periodic setting unless they want that strictness."
            ),
          ],
        },
        {
          text: "In the pilot, several users on the Entra-joined hosts see 'The sign-in method you're trying to use isn't allowed', and one admin asks whether Windows Hello for Business can still be used.",
          ask: "Diagnose the error and finish the rollout.",
          parts: [
            part(
              "Cause and fix",
              "Identifies legacy per-user MFA enabled alongside Conditional Access as the cause on Entra-joined hosts and disables per-user MFA for those users, relying on Conditional Access only; notes Conditional Access cannot coexist with Security Defaults.",
              "The error is what users on Microsoft Entra joined session hosts get when legacy per-user MFA is enabled at the same time as Conditional Access. Disable per-user MFA for those accounts and let Conditional Access enforce MFA. Security Defaults must stay off, since Conditional Access cannot be used while they are on."
            ),
            part(
              "Strong authentication methods",
              "Excludes the Azure Windows VM Sign-In app from the Conditional Access policy if sign-in should not be restricted to strong methods like Windows Hello for Business on Entra-joined hosts, and tests location-based conditions against both apps before enforcing.",
              "To keep Windows Hello for Business usable without restricting sign-in to strong methods only, exclude the Azure Windows VM Sign-In app from the policy. Roll out to the pilot group first, test any location-based conditions against both the Azure Virtual Desktop and Windows Cloud Login apps (the IP address Conditional Access sees can differ from the client's), then expand to AVD-Users."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 3: Plan and Implement User Environments and Apps (2)
    // ----------------------------------------------------------------------
    {
      slug: "fslogix-configuration-recommendation",
      objective: "Recommending an FSLogix configuration",
      kind: "build",
      title: "Write the FSLogix configuration for a pooled host pool",
      brief:
        "Kestrel Retail is deploying a pooled Azure Virtual Desktop host pool for 800 store-support staff on Windows 11 Enterprise multi-session. Profiles will live on an Azure Files Premium share, \\\\kestrelprofiles.file.core.windows.net\\profiles, and a second share in another region will be added next year for resilience. Users run Outlook with large mailboxes and OneDrive. Earlier pilots left stale local profiles on hosts and produced profile folders named by SID that the help desk found hard to search. Containers must never exceed 50 GB.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the recommended FSLogix settings (registry values under HKLM\\SOFTWARE\\FSLogix\\Profiles) and explain each.",
          parts: [
            part(
              "Container type and location",
              "Enables Profile Container (Enabled = 1) with VHDLocations pointing at the Azure Files share (REG_SZ or MULTI_SZ; several locations separated by semicolons), and chooses VHDX (VolumeType = vhdx) rather than the default vhd.",
              "Enabled = 1 (DWORD). VHDLocations = \\\\kestrelprofiles.file.core.windows.net\\profiles (a REG_SZ; more than one path is separated by semicolons, or use MULTI_SZ). VolumeType = vhdx, since the default is vhd and VHDX is the modern format."
            ),
            part(
              "Size and growth",
              "Sets SizeInMBs to 50000 (the default is 30000; the value can be raised later but not lowered) and keeps IsDynamic = 1 so the file grows only as used.",
              "SizeInMBs = 50000 (DWORD): the default is 30000 MB, and the limit can be increased later but not decreased, so 50 GB is the cap requested. IsDynamic = 1 (the default) so the VHDX only takes the space actually used."
            ),
            part(
              "Fixing the pilot problems",
              "Sets DeleteLocalProfileWhenVHDShouldApply = 1 so a stale local profile is removed when the container should apply, and FlipFlopProfileDirectoryName = 1 so folders are named %username%_%sid% instead of %sid%_%username%.",
              "DeleteLocalProfileWhenVHDShouldApply = 1 (default 0): a matching local profile left on the host is deleted so the container attaches instead of a stale copy. FlipFlopProfileDirectoryName = 1 (default 0): the folder becomes username_SID rather than SID_username, which the help desk can search."
            ),
            part(
              "Outlook, OneDrive and the second region",
              "Keeps Outlook cached mode working inside the container, plans Cloud Cache (CCDLocations with the local share first and the remote share second) for the second region instead of plain VHDLocations, and treats ODFC as optional since Profile Container already holds Office data.",
              "Leave Outlook cached mode on so the OST lives in the container. When the second share exists, switch from VHDLocations to Cloud Cache: CCDLocations = type=smb,connectionString=\\\\kestrelprofiles...\\profiles;type=smb,connectionString=\\\\<second region share>\\profiles, with the local share first on hosts in each region, so writes go to the nearest reachable provider and replicate to the other. A separate ODFC container is optional: Profile Container already includes Office data, and splitting it only pays off if the firm wants different storage or backup for Office cache data."
            ),
          ],
        },
      ],
    },
    {
      slug: "app-attach-delivery",
      objective: "Configuring dynamic application delivery using App attach",
      kind: "build",
      title: "Deliver two line-of-business apps with App attach",
      brief:
        "Winslow Logistics has a pooled Windows 11 host pool with Microsoft Entra joined session hosts in the North Europe region. Two apps, a freight-rating tool and a customs client, are packaged as MSIX. The rating tool is needed by all 400 users in the desktop application group; the customs client is used by 40 people, half of whom only use a RemoteApp. The packaging team has produced CimFS images and asks where to store them, what permissions to set, and how to assign and update the apps.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the App attach design.",
          parts: [
            part(
              "Image format and storage",
              "Stores the CimFS disk images (recommended for Windows 11 over VHDX; VHD not recommended) on an Azure Files SMB share in the same region as the session hosts, separate from the FSLogix profile share.",
              "Use the CimFS images (recommended when hosts run Windows 11; VHDX also works, VHD is not recommended) on an Azure Files share in North Europe, the same region as the hosts. Do not put them on the FSLogix profile share; App attach images get their own share. Azure NetApp Files would require AD DS-joined hosts, which these are not."
            ),
            part(
              "Permissions for Entra-joined hosts",
              "Grants the Reader and Data Access role on the storage account to the Azure Virtual Desktop and Azure Virtual Desktop ARM Provider service principals (the hosts mount images with the computer account, one handle per host per image), noting that assigning the ARM Provider principal grants the service access to everything in that storage account.",
              "Because the hosts are Microsoft Entra joined, assign the Reader and Data Access role on the storage account to the Azure Virtual Desktop and Azure Virtual Desktop ARM Provider service principals. Images are mounted with the session host's computer account, one open handle per host per image rather than per user. Be aware that granting the ARM Provider principal gives the service access to all data in that storage account, so keep the account dedicated to App attach."
            ),
            part(
              "Assignment",
              "Explains the three conditions (package assigned to the host pool; user in a desktop or RemoteApp application group of that pool, with the App attach app added to the RemoteApp group; package assigned to the user or group), and uses on-demand registration by default.",
              "A user gets an app only when all three hold: the package is assigned to the host pool; the user is in a desktop or RemoteApp application group for that pool (for the 20 RemoteApp-only customs users, add the customs app to their RemoteApp group); and the package is assigned to the user or their group. Assign the rating tool to the all-users group and the customs client to the 40-person group; desktop users only see what is assigned to them. Keep the default on-demand registration so sign-in time is not affected."
            ),
            part(
              "Updates and certificates",
              "Updates by publishing a new image either side by side (new app, same assignments) or in place with a different version number (same version is not allowed), without deleting the old image until users have moved; makes sure the package certificate chain is trusted on the hosts and the package is timestamped.",
              "For a new release, either add a new App attach application with the new image and the same host-pool and user assignments, or update the existing one in place with a different version number (the same version number is rejected). Users pick up the new version at their next sign-in; keep the old image until nobody uses it, and set a package to inactive to hide it. The signing certificate chain must be trusted on every host, and the package should be timestamped so it outlives the certificate."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Unit 4: Monitor and Maintain an Azure Virtual Desktop Infrastructure (2)
    // ----------------------------------------------------------------------
    {
      slug: "avd-autoscale-plan",
      objective: "Implementing autoscaling in host pools",
      kind: "build",
      title: "Create a scaling plan for a pooled host pool",
      brief:
        "Greyfell Services runs a pooled host pool of 20 session hosts in UK South for 600 staff who work 08:00 to 18:00 UK time on weekdays, with a quiet overnight batch of about 20 users. The hosts are powered on 24 hours a day and the bill is too high. The host pool was created with breadth-first load balancing and the default maximum session limit. The team wants hosts powered off automatically outside working hours while guaranteeing at least a few hosts are always available, and they do not want users forcibly signed out.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the autoscale design and the prerequisites.",
          parts: [
            part(
              "Prerequisites",
              "Assigns the Desktop Virtualization Power On Off Contributor role to the Azure Virtual Desktop service principal (or the host pool's managed identity) at the subscription scope (a lower scope breaks autoscale), sets a real MaxSessionLimit on the host pool, and confirms no other scaling automation (Azure Automation, Logic Apps) targets the pool.",
              "Grant Desktop Virtualization Power On Off Contributor to the Azure Virtual Desktop service principal (or a managed identity assigned to the host pool) with the subscription as scope; assigning it at resource group, host pool or VM level stops autoscale from working. Set MaxSessionLimit on the host pool to a real number instead of the default, since the plan uses it. Remove any Azure Automation or Logic Apps scaling on the same pool: autoscale cannot share a host pool with another scaling tool."
            ),
            part(
              "Plan and schedule shape",
              "Creates a pooled scaling plan in the UK time zone (plan data in the same region as the host pool) with a weekday schedule: ramp-up before 08:00, peak from about 08:00, ramp-down from 18:00, off-peak after; the plan takes effect as soon as it is enabled.",
              "One pooled scaling plan, time zone GMT Standard Time, stored in UK South like the host pool. Weekday schedule: ramp-up starting 07:00, peak at 08:00, ramp-down at 18:00, off-peak from 19:00. Unselected days carry the last off-peak settings until the next ramp-up. The plan is live the moment it is enabled, so test on a copy first."
            ),
            part(
              "Phase settings",
              "Sets ramp-up with breadth-first, a minimum percentage of hosts (e.g. 20%) and a capacity threshold (e.g. 60%); peak keeps breadth-first and inherits the ramp-up threshold; ramp-down switches to depth-first with a lower minimum and higher threshold, with forced sign-out off (choose 'VMs have no active or disconnected sessions' or 'no active sessions'); off-peak depth-first and inherits the ramp-down threshold.",
              "Ramp-up: breadth-first, minimum percentage of hosts 20% (4 of 20), capacity threshold 60%. Peak: breadth-first; the threshold carries over from ramp-up. Ramp-down: depth-first, minimum percentage 10% (rounded up to 2 hosts), capacity threshold 90%, force logoff off, and shut down only hosts with no active or disconnected sessions. Off-peak: depth-first; the threshold carries over from ramp-down. Autoscale ignores the host pool's own load-balancing setting and applies the phase's algorithm."
            ),
            part(
              "How it behaves and what to watch",
              "Explains that hosts are turned on when used capacity exceeds the threshold and off only when sessions can be consolidated below it and the host has no sessions (never in ramp-up), that autoscale overwrites drain mode on pooled pools so maintenance hosts need exclusion tags, and that tagging every host leaves no capacity.",
              "Autoscale powers a host on when used capacity goes above the threshold in any phase, and powers one off only when all sessions would still fit under the threshold on fewer hosts and that host has no sessions, never during ramp-up. It overwrites drain mode on pooled pools, so put an exclusion tag on hosts under maintenance; but tagging all of them leaves nothing to start, giving users a 'No resources available' error. Watch Azure Virtual Desktop Insights to tune the thresholds and the session limit."
            ),
          ],
        },
      ],
    },
    {
      slug: "avd-disaster-recovery-plan",
      objective: "Planning and implementing a disaster recovery plan for Azure Virtual Desktop",
      kind: "case",
      title: "Plan disaster recovery for a two-host-pool deployment",
      brief:
        "Tolliver Engineering runs Azure Virtual Desktop in West Europe: a pooled host pool for 1,500 engineers with FSLogix profiles on Azure Files Premium, and a personal host pool for 80 CAD specialists whose workstations hold local project caches. Session hosts are built from a golden image in an Azure Compute Gallery in West Europe and are joined to AD DS, with two domain controllers in West Europe. The board wants the service to survive the loss of the West Europe region, with the pooled users back within an hour and the CAD specialists within a few hours, at a cost the finance team can accept.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "An architect proposes extending the existing pooled host pool with session hosts in North Europe so that one host pool spans both regions.",
          ask: "Assess the proposal and choose the model for the pooled users.",
          parts: [
            part(
              "Host pool topology",
              "Prefers a separate host pool in North Europe (active-passive to meet the one-hour target at lower cost, or active-active if recovery must need no admin action) over one pool spanning regions, because a cross-region pooled pool cannot enforce regional connection preferences for users.",
              "Build a second pooled host pool in North Europe rather than stretching the existing one: with one pool across regions you cannot steer pooled users to their nearest region. Given a one-hour target, an active-passive model fits: North Europe hosts are pre-built but mostly deallocated and started on failover (15 to 60 minutes depending on how ready the compute is). Active-active (both pools always serving) removes the failover step but roughly doubles compute and storage cost."
            ),
            part(
              "Images",
              "Replicates the golden image versions to a second Azure Compute Gallery (or replica) in North Europe, since the gallery is regional, so hosts in both regions deploy from the same image.",
              "Azure Compute Gallery is regional, so create a gallery (or image-version replicas) in North Europe and keep the same golden image versions in both. Hosts in either region then deploy from identical images, and the North Europe pool can be rebuilt or scaled from it."
            ),
          ],
        },
        {
          text: "Storage review: the team finds the Premium file share cannot be made geo-redundant, and asks how profiles will exist in North Europe.",
          ask: "Design profile and identity continuity for the pooled users.",
          parts: [
            part(
              "Profiles",
              "Uses FSLogix Cloud Cache with two CCDLocations (a Premium share in each region, local first on each region's hosts) because Azure Files Premium does not support GRS; adds Azure Backup for the profile shares; optionally ZRS within a region.",
              "Azure Files Premium has no GRS, so replicate with FSLogix Cloud Cache: a Premium share in each region, CCDLocations listing the local share first and the remote share second on each region's hosts (reverse the order in North Europe). Cloud Cache writes to the first reachable provider and replicates asynchronously to the other. Use ZRS on each share for zone resilience and protect both with Azure Backup against deletion or corruption."
            ),
            part(
              "Identity and network",
              "Adds at least one domain controller with global catalog and DNS in North Europe, and a spoke VNet in North Europe connected to a hub in that region with its own hybrid connectivity, firewall and management, hubs peered to each other.",
              "Sign-in fails without a reachable domain controller, so deploy at least one more DC with global catalog and DNS roles in North Europe. Give North Europe its own hub-and-spoke: the DR host pool in a spoke, connected to a North Europe hub that carries its own on-premises connectivity, firewall and management, with the two hubs connected."
            ),
          ],
        },
        {
          text: "Finally the CAD specialists: their personal desktops hold local project caches that take a day to rebuild, and the team wants to test the plan.",
          ask: "Plan recovery for the personal host pool and the test approach.",
          parts: [
            part(
              "Personal desktops",
              "Replicates the personal session host VMs with Azure Site Recovery to North Europe (personal desktops hold user state, so profiles in external storage do not cover them), accepting that extensions are not kept by replication, and does not use ASR test failover for session hosts.",
              "Personal host pool VMs carry the user's state on the disk, so protect them with Azure Site Recovery replication to North Europe; Site Recovery fails VMs over in minutes within its SLA, which meets 'a few hours'. Plan to re-apply VM extensions after failover, because replication does not preserve them. Do not run Site Recovery's test failover against session hosts: the duplicate VM conflicts with the original host registration."
            ),
            part(
              "Control plane and testing",
              "Relies on the Microsoft-managed control plane failing over on its own (no customer redundancy needed) and runs a scheduled, documented failover rehearsal of the customer-managed parts -- start the DR pool, redirect users, verify profiles and identity -- with failback steps.",
              "The AVD control plane is managed by Microsoft and fails over automatically between regions, so no customer work is needed there. The rehearsal covers what the customer owns: start and validate the North Europe pool, confirm Cloud Cache profiles open, confirm authentication against the North Europe DC, confirm app access, then document failback. Run it on a schedule and after any change to images, storage or identity."
            ),
          ],
        },
      ],
    },
  ],
};
