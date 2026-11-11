import { GENERAL_SAFETY, part, matchPart, numericPart, orderPart, selectPart, commandPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-234: CompTIA A+ Core 2 (220-1202, V15).
//
// Aligned to CompTIA's own exam objectives document for 220-1202 V15
// ("Exam Objectives Document Version 4.0", downloaded from CompTIA's file
// host and read in full on 2026-11-11): Operating Systems 28%, Security
// 28%, Software Troubleshooting 23%, Operational Procedures 21%. CompTIA's
// 220-1202 page (read 2026-11-11) lists V15 as current, launched 2025-03-25,
// retirement estimated 2028, no successor announced.
//   https://lecbyo.files.cmp.optimizely.com/download/cefedfb2b8a511ef809306d06d323538
//   https://www.comptia.org/en-us/certifications/a/core-2-v15/
// Objective 2.6 in V15 lists a TEN-step SOHO malware removal procedure
// (investigate and verify; quarantine; disable System Restore in Windows
// Home; remediate; update anti-malware; scan and removal techniques such as
// safe mode or a preinstallation environment; reimage/reinstall; schedule
// scans and run updates; enable System Restore and create a restore point
// in Windows Home; educate the end user). The course objective's title
// still summarizes the older seven-step list; the malware lab teaches the
// V15 list and the discrepancy is reported for the course owner (REQ-234).
//
// Density (docs/labs.md, policy "hybrid"): 3 / 3 / 2 / 2 = 10.
// Values quoted as a standard (Windows 11 minimum requirements, Windows 10
// end of support, NIST SP 800-63B-4 password rules, share-plus-NTFS
// permission rule, command syntax, the 3-2-1 backup rule) are sourced per
// lab in value-sources.ts. Every organization and person is fictional.

export const APLUS_CORE2_LABS: SeedLabSet = {
  trackCode: "APLUS_CORE2",
  sources: [
    source("https://lecbyo.files.cmp.optimizely.com/download/cefedfb2b8a511ef809306d06d323538", "exam_outline", "2026-11-11"),
    source("https://www.comptia.org/en-us/certifications/a/core-2-v15/", "exam_outline", "2026-11-11"),
  ],
  labs: [
    // -----------------------------------------------------------------------
    // Operating Systems (28%) -- 3 labs
    // -----------------------------------------------------------------------
    {
      slug: "aplus2-windows-commands",
      objective: "Using the Windows command line and PowerShell for common administrative tasks",
      kind: "build",
      title: "Run the right Windows commands for four help-desk tickets",
      brief:
        "You are on the help desk at the fictional Copperleaf Logistics, a Windows domain. Four tickets are open. (1) A new hire needs the department share \\\\FS01\\Projects mapped as drive P: and kept after sign-out. (2) IT just changed a Group Policy setting and a user's PC must pick it up now rather than at the next refresh. (3) After that, the user says the new desktop wallpaper policy did not apply; you need a summary of which policies applied to the user and computer. (4) A PC shows random 'file is corrupt' errors in Windows components after a power cut; you want Windows to check and repair its protected system files. All commands run in an elevated command prompt.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the command for each ticket and say what to check in its output.",
          parts: [
            commandPart(
              "(1) Map P: to the Projects share",
              "net use P: \\\\FS01\\Projects /persistent:yes is met (case does not matter).",
              "net use P: \\\\FS01\\Projects /persistent:yes maps the share as P: and remembers it at the next sign-in. Check with net use (lists P: as OK) and in File Explorer.",
              { accepted: ["net use P: \\\\FS01\\Projects /persistent:yes"], prompt: "C:\\>", ignoreCase: true }
            ),
            commandPart(
              "(2) Apply Group Policy now",
              "gpupdate /force is met.",
              "gpupdate /force reapplies all policy settings now, not only changed ones. Some settings say a sign-out or restart is needed; do it if asked.",
              { accepted: ["gpupdate /force"], prompt: "C:\\>", ignoreCase: true }
            ),
            commandPart(
              "(3) Which policies applied",
              "gpresult /r is met.",
              "gpresult /r shows the Resultant Set of Policy summary for the user and computer: which GPOs applied and which were filtered out (and why, such as security filtering or the wrong OU). If the wallpaper GPO is missing, check where the user's account sits in Active Directory and the GPO's filtering.",
              { accepted: ["gpresult /r"], prompt: "C:\\>", ignoreCase: true }
            ),
            commandPart(
              "(4) Repair protected system files",
              "sfc /scannow is met.",
              "sfc /scannow scans all protected system files and replaces corrupted ones from the cached copy. Read the result line: no integrity violations, found and repaired, or found but could not repair (then the component store itself may need repair and a reboot).",
              { accepted: ["sfc /scannow"], prompt: "C:\\>", ignoreCase: true }
            ),
          ],
        },
      ],
    },
    {
      slug: "aplus2-win10-to-win11-upgrade",
      objective: "Comparing Windows editions and performing OS installations or upgrades, in-place vs. clean",
      kind: "case",
      title: "Move a small office from Windows 10 Home to Windows 11 Pro",
      brief:
        "The fictional Bramble Hill Accounting has eight desktops bought in 2019 running Windows 10 Home, which are in a workgroup. The partners want them joined to a new domain, the disks encrypted with BitLocker, and the machines on a supported version of Windows. Each PC has a quad-core 64-bit CPU, 8 GB RAM, a 256 GB SSD and UEFI firmware; the staff keep client files in their Documents folders and use one accounting application whose vendor supports Windows 11.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The owner asks whether they can 'just stay on Windows 10 Home a while longer' and what needs to change.",
          ask: "Explain the support situation and why Home will not meet their goals.",
          parts: [
            part(
              "Support status",
              "States that Windows 10 reached end of support on October 14, 2025, so without paid Extended Security Updates the PCs no longer get security fixes, which is a risk for client financial data.",
              "Windows 10 reached end of support on October 14, 2025. Since then it receives no security updates unless the PCs are enrolled in Microsoft's paid Extended Security Updates program. For a firm holding client financial data, running unpatched is not acceptable, so the goal is Windows 11."
            ),
            part(
              "Edition",
              "Explains that Home cannot join a domain and lacks BitLocker management and the Group Policy Editor (gpedit.msc), so they need Pro (or Enterprise), Windows 11 Pro being the natural target for eight PCs.",
              "Windows Home cannot join an Active Directory domain and does not include BitLocker drive encryption management or the Group Policy Editor. Pro (or Enterprise under volume licensing) does. For eight PCs, Windows 11 Pro is the fit."
            ),
          ],
        },
        {
          text: "PC Health Check reports on the first PC: 'TPM 2.0 must be supported and enabled on this PC. Secure Boot must be supported.' Everything else passes. The firmware setup shows a 'PTT' option (Disabled) and Boot mode: Legacy/CSM. The disk is partitioned MBR.",
          ask: "What do you change so the PC meets Windows 11's requirements, and what is the risk?",
          parts: [
            part(
              "Firmware changes",
              "Enables the firmware TPM (PTT on Intel, fTPM on AMD) to provide TPM 2.0, and switches from Legacy/CSM to UEFI boot with Secure Boot enabled; notes that the MBR system disk must be converted to GPT first (for example with MBR2GPT) or the PC will not boot in UEFI mode.",
              "Windows 11 requires TPM 2.0 and UEFI, Secure Boot capable firmware. Enable PTT (Intel's firmware TPM) to expose TPM 2.0. Then the boot mode: the disk is MBR, which boots only in Legacy/CSM mode, so convert it to GPT first (Microsoft's MBR2GPT tool can do it without wiping, after a backup), then switch the firmware to UEFI and enable Secure Boot. Switching to UEFI before converting leaves the PC unable to boot."
            ),
            part(
              "Other requirements",
              "Confirms the rest against Windows 11's published minimums (64-bit CPU of 1 GHz or faster with 2 or more cores on the compatible list, 4 GB RAM, 64 GB storage, DirectX 12 graphics) and that the accounting application supports Windows 11.",
              "The remaining minimums are met: a compatible 64-bit CPU with at least 2 cores at 1 GHz or faster, 4 GB RAM (they have 8), 64 GB storage (they have 256 GB), DirectX 12/WDDM 2.0 graphics. The accounting vendor supports Windows 11, the other compatibility check that matters."
            ),
          ],
        },
        {
          text: "The PCs now pass. The partners want this done over one weekend with the least disruption, and IT would prefer each PC to start clean before joining the domain.",
          ask: "Choose in-place upgrade or clean install, and give the plan.",
          parts: [
            part(
              "Choice and reasoning",
              "Compares the two: an in-place upgrade keeps apps, settings and files (faster, less disruption) while a clean install wipes the disk (cleaner, needs reinstalling apps and restoring files); chooses one with a reason that fits (for example clean install of Windows 11 Pro from a standard image because they are joining a domain anyway, or in-place upgrade to Pro then Windows 11 to save time), and either way backs up user files first.",
              "Either is defensible. A clean install of Windows 11 Pro gives a standard, known build before joining the domain, removes years of clutter and gets local accounts replaced by domain accounts anyway, at the cost of reinstalling the accounting application and restoring files. An in-place upgrade (Home to Pro with a Pro key, then to Windows 11) keeps everything and is quicker per PC. Here the clean install fits, because the domain join changes the user profiles regardless. In both cases back up each user's Documents and the accounting data first and test the restore."
            ),
            orderPart(
              "Weekend plan for each PC",
              "All in order is met; one pair swapped is partly there.",
              "Back up first, then the firmware and disk changes, then install, join the domain and encrypt, then restore data and verify with the user on Monday.",
              [
                "Back up the user's files and the accounting data, and verify the backup",
                "Convert the disk to GPT, then enable UEFI, Secure Boot and the TPM",
                "Install Windows 11 Pro from the standard image",
                "Join the domain and apply Group Policy",
                "Turn on BitLocker and store the recovery key in the domain",
                "Reinstall the accounting application and restore the user's files",
                "Have the user sign in and confirm files and the application work",
              ]
            ),
          ],
        },
      ],
    },
    {
      slug: "aplus2-linux-desktop-commands",
      objective: "Identifying macOS and Linux features, file systems, best practices, and common commands",
      kind: "build",
      title: "Do four routine tasks on a Linux desktop",
      brief:
        "The fictional Thistle Design studio runs a Debian-based Linux desktop for its print workstation. You are signed in as the user 'tech', who has sudo rights. Four requests: (1) The file /srv/print/rates.txt must be readable and writable by its owner, readable by the 'design' group and not accessible to anyone else. (2) Ownership of that file must move to user 'maria' and group 'design'. (3) The workstation is warning that the disk is nearly full; find how full each mounted filesystem is in readable units. (4) Install the latest updates for every installed package.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the command for each request.",
          parts: [
            commandPart(
              "(1) Set the permissions",
              "chmod 640 /srv/print/rates.txt (with or without sudo) is met.",
              "sudo chmod 640 /srv/print/rates.txt: 6 = read + write for the owner, 4 = read for the group, 0 = nothing for others. If tech does not own the file, sudo is needed.",
              { accepted: ["sudo chmod 640 /srv/print/rates.txt", "chmod 640 /srv/print/rates.txt", "sudo chmod u=rw,g=r,o= /srv/print/rates.txt", "chmod u=rw,g=r,o= /srv/print/rates.txt"], prompt: "$" }
            ),
            commandPart(
              "(2) Change owner and group",
              "sudo chown maria:design /srv/print/rates.txt is met; changing ownership needs root.",
              "sudo chown maria:design /srv/print/rates.txt sets user and group in one command. Only root can give a file to another user, hence sudo.",
              { accepted: ["sudo chown maria:design /srv/print/rates.txt"], prompt: "$" }
            ),
            commandPart(
              "(3) Disk usage per filesystem",
              "df -h is met.",
              "df -h lists each mounted filesystem with size, used, available and use% in human-readable units (G, M). To find what is filling a directory afterwards, du -sh on candidate folders.",
              { accepted: ["df -h"], optionAliases: { "--human-readable": "-h" }, prompt: "$" }
            ),
            part(
              "(4) Update every package",
              "Refreshes the package lists and upgrades with apt using sudo: sudo apt update then sudo apt upgrade (or full-upgrade), noting that dnf is the equivalent on Fedora/RHEL-family systems.",
              "sudo apt update (refresh the list of available versions from the repositories), then sudo apt upgrade (install the newer versions). On a Fedora or RHEL-family system the equivalent is sudo dnf upgrade. Reboot if a new kernel was installed."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Security (28%) -- 3 labs
    // -----------------------------------------------------------------------
    {
      slug: "aplus2-harden-front-desk-pc",
      objective: "Configuring Windows security settings: Windows Defender/Firewall, BitLocker, and User Account Control",
      kind: "build",
      title: "Harden a shared front-desk PC and fix a share's permissions",
      brief:
        "The fictional Maple Street Physiotherapy clinic has a Windows 11 Pro front-desk PC in the waiting area, used by three receptionists who currently share one local administrator account named 'frontdesk'. The PC stores a daily schedule export with patient names. A folder on the clinic's file server, \\\\FS1\\Schedules, is shared with the share permission 'Everyone: Full Control'; its NTFS permissions give the 'Reception' group Read and 'Managers' Modify. A receptionist says she cannot save a change to the schedule file over the network, and the manager wants receptionists to stay read-only.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the hardening settings for the PC and explain the share's effective permissions.",
          parts: [
            part(
              "Accounts and UAC",
              "Gives each receptionist their own standard (non-administrator) account, removes daily use of the shared admin account (renames or disables it, keeps a separate IT admin with a strong password), keeps User Account Control on at its default or higher so admin actions prompt, and sets a short screen-lock timeout because the PC faces the public.",
              "Create a standard account for each receptionist (individual accountability, no admin rights). Stop using 'frontdesk' as an administrator: disable it and keep a separate IT administrator account with a strong, unique password. Keep User Account Control enabled at the default level or higher, so anything needing admin rights prompts for admin credentials. Set the screen to lock after a few minutes of inactivity, and teach Windows+L when stepping away."
            ),
            part(
              "Defender, firewall and BitLocker",
              "Confirms Microsoft Defender Antivirus is on with current definitions, the Windows Defender Firewall is on for all profiles (with only needed exceptions), and turns on BitLocker for the system drive using the TPM, saving the recovery key somewhere other than the PC (domain, Microsoft Entra ID or a secured printout), because the disk holds patient names.",
              "Defender Antivirus on, real-time protection on, definitions updating. Windows Defender Firewall on for domain, private and public profiles; allow only what the clinic's apps need. BitLocker on the C: drive using the TPM (Windows 11 Pro has it), with the recovery key stored off the PC (in Active Directory or Entra ID, or printed and locked away), because a stolen PC would otherwise expose patient names."
            ),
            selectPart(
              "Effective permission over the network",
              "Selects 'Read' for a Reception member: when share and NTFS permissions combine over the network, the more restrictive applies, so Full Control (share) and Read (NTFS) gives Read.",
              "Share and NTFS permissions are independent and, for access over the network, the more restrictive of the two applies. Share Full Control combined with NTFS Read gives a Reception member Read: she cannot save, which matches what the manager wants. Managers get Modify (the NTFS permission is the more restrictive one).",
              {
                display: "list",
                header: "Effective permission for a Reception member over \\\\FS1\\Schedules",
                lines: ["Full Control", "Modify", "Read", "No access"],
                correct: [2],
              }
            ),
            part(
              "Tidy the share",
              "Recommends tightening the share permission itself (for example Authenticated Users: Change, or Everyone: Read plus Managers: Change) instead of relying on NTFS alone, while still controlling detailed access with NTFS permissions.",
              "Leaving 'Everyone: Full Control' on the share works only because NTFS is stricter. Better practice: set the share permission to something like Authenticated Users: Change (no one needs Full Control over the network to change permissions), and keep the detailed rules in NTFS: Reception Read, Managers Modify. That way a mistaken NTFS change does not open the folder to everyone."
            ),
          ],
        },
      ],
    },
    {
      slug: "aplus2-soho-password-and-router-policy",
      objective: "SOHO network and workstation security best practices: password policies, account management, and firewall rules",
      kind: "build",
      title: "Write a small office's password and router policy",
      brief:
        "The fictional Wren & Ash law office (nine staff) asks you for a one-page security baseline. Today: passwords must be 8 characters with a capital, a number and a symbol and are changed every 60 days; staff write them on sticky notes. Microsoft 365 sign-in has no multifactor authentication. A former paralegal who left in March still has an active account. The SOHO router still has its factory admin password, firmware from three years ago, UPnP on, WPS on, and a port forward of TCP 3389 to the senior partner's PC 'so she can work from home'. Wi-Fi uses WPA2-Personal with a password shared with visiting clients.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the baseline: passwords and sign-in, account management, and the router and Wi-Fi settings.",
          parts: [
            part(
              "Passwords and sign-in",
              "Turns on MFA for Microsoft 365, and replaces the composition-and-rotation rule with length-based rules consistent with NIST SP 800-63B-4 (at least 15 characters for a password used alone, at least 8 if it is only used with MFA; no forced complexity mix; no periodic forced changes, but change on evidence of compromise; check against a list of common or breached passwords), and gives staff a password manager instead of sticky notes.",
              "Turn on multifactor authentication for every Microsoft 365 account first. Passwords: follow NIST SP 800-63B-4: a password used on its own must be at least 15 characters (8 is the floor only where it is always paired with MFA); allow long passphrases; do not require a mix of character types and do not force changes every 60 days, but force a change if a password may be compromised; block common and breached passwords. Give staff a password manager so nothing is written on notes."
            ),
            part(
              "Account management",
              "Disables the former paralegal's account immediately (and reviews what it accessed), creates an off-boarding checklist so accounts are disabled on the last day, applies least privilege (staff use standard accounts, admin rights only for IT), and reviews accounts periodically.",
              "Disable the former paralegal's account today, check its recent sign-ins and mailbox rules, and transfer what the firm needs. Add an off-boarding checklist: disable accounts and collect devices on the last day. Everyday accounts are standard users; administrator rights only for IT accounts. Review the list of accounts every quarter."
            ),
            part(
              "Router and Wi-Fi",
              "Changes the router's default admin password, updates its firmware, disables UPnP and WPS, removes the RDP port forward (replacing it with a VPN or a secure remote-access service), keeps the firewall denying inbound by default, moves staff Wi-Fi to WPA3 (or WPA2/WPA3) with a password not shared with clients, and gives visitors a separate isolated guest network.",
              "Router: new strong admin password; latest firmware and automatic updates if offered; UPnP off (devices cannot open ports themselves); WPS off; delete the TCP 3389 forward, because RDP exposed to the internet is a common ransomware entry point; the partner works from home through a VPN or a secured remote-access service with MFA. Firewall: deny unsolicited inbound by default. Wi-Fi: staff network on WPA3-Personal (or WPA2/WPA3 mixed if older devices need it) with a password only staff know; visitors on a separate guest SSID isolated from the office LAN."
            ),
          ],
        },
      ],
    },
    {
      slug: "aplus2-social-engineering-week",
      objective: "Common social-engineering attacks: phishing, shoulder surfing, tailgating, and impersonation",
      kind: "case",
      title: "Handle a week of social-engineering attempts at a clinic",
      brief:
        "You support the fictional Riverbend Family Clinic, 30 staff in a two-floor building with a badge-controlled staff entrance. On Monday the office manager forwards you several odd events from the past few days and asks what they are and what to do.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Events: (a) An email that looks like it is from the clinic's CEO asks the finance clerk to urgently change a supplier's bank details before Friday's payment run; the reply-to address is a free webmail account. (b) A caller says he is from 'IT support at the EHR vendor' and asks a nurse to read him the six-digit code just texted to her phone. (c) A man in a delivery vest followed a nurse through the badge door carrying boxes. (d) A poster in the waiting room with a QR code saying 'Scan to update your patient portal password' that nobody at the clinic put up.",
          ask: "Name the attack in each event.",
          parts: [
            matchPart(
              "Attack types",
              "(a) business email compromise or whaling-style impersonation of an executive, (b) vishing, (c) tailgating, (d) QR code phishing. All four right is met; two or three is partly there.",
              "(a) Business email compromise: impersonating the CEO to redirect a payment. (b) Vishing: voice phishing, here to steal a one-time MFA code. (c) Tailgating: following an authorized person through a controlled door. (d) QR code phishing: a code leading to a fake sign-in page.",
              {
                leftHeading: "Event",
                rightHeading: "Attack",
                left: ["(a) 'CEO' email to change supplier bank details", "(b) Caller asking for the texted code", "(c) Man following a nurse through the badge door", "(d) Unofficial QR code poster"],
                right: ["Business email compromise", "Vishing", "Tailgating", "QR code phishing", "Shoulder surfing", "Dumpster diving"],
                pairs: [0, 1, 2, 3],
              }
            ),
          ],
        },
        {
          text: "You learn that the nurse in (b) did read out the code, and her account then signed in from an unfamiliar location. The finance clerk had not yet changed the bank details. Two patients say they scanned the QR code and typed their portal passwords.",
          ask: "What do you do now, in order of urgency?",
          parts: [
            part(
              "Contain the compromised account",
              "Treats the nurse's account as compromised: resets her password, revokes active sessions, re-registers or reviews her MFA methods, checks for new mailbox forwarding rules or data access, and reports it under the clinic's incident process (patient data may be involved).",
              "First the nurse's account: reset the password, sign out all sessions, review and reset her MFA methods, look for new inbox rules or forwarding and for records she accessed after the strange sign-in. Report it through the clinic's incident response process and to the privacy officer, because patient health information may have been exposed."
            ),
            part(
              "Payment, portal and premises",
              "Has finance verify the bank-detail request by calling the supplier on a known phone number (not one in the email) and requires a call-back rule for any payment change; removes the QR poster and has the portal vendor reset the two patients' passwords and check their accounts; reviews camera footage and tells staff not to hold the badge door.",
              "Finance: do not change the details; confirm with the supplier by calling a number from the existing supplier file, and adopt a rule that bank-detail changes always need a call-back. Take down the QR poster, keep it as evidence, and ask the portal vendor to reset the two patients' passwords and review their accounts; tell the patients what happened. Building: check the camera footage for the 'delivery' visitor and what he accessed."
            ),
          ],
        },
        {
          text: "The manager asks how to make this less likely next time.",
          ask: "Give the prevention plan.",
          parts: [
            part(
              "Prevention",
              "Gives short targeted training with real examples (never read out MFA codes, verify requests by a known channel, challenge or escort tailgaters, do not trust posted QR codes), simple reporting (a 'report phish' button or one contact), technical controls (external-sender banners, phishing-resistant MFA or number matching, email filtering), and a visitor policy.",
              "Training: a 15-minute session using these exact events: IT and vendors never ask for MFA codes; verify any money or credential request through a known number; do not hold the badge door, direct visitors to reception; do not scan QR codes for passwords. Make reporting easy: one email address or a report button, and thank people who report. Technical: tag external emails, filter look-alike domains, move to number-matching or phishing-resistant MFA. Physical: visitor sign-in and escort, and a sign at the staff door."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Software Troubleshooting (23%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "aplus2-malware-removal-pos",
      objective: "Best-practice malware removal procedure: investigate and verify symptoms, quarantine, disable System Restore, remediate, schedule scans and run updates, re-enable System Restore and create a restore point, and educate the user",
      kind: "case",
      title: "Remove malware from a shop's office PC",
      brief:
        "The fictional Hilltop Bike Shop has one Windows 11 Home PC in the back office used for email, ordering and the shop's online banking. The owner says that since yesterday the browser opens pages he did not ask for, there are pop-ups claiming 'Your PC is infected, call this number', the home page changed, and the PC is slow. He admits he installed a 'free PDF converter' from a pop-up ad two days ago.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The PC is still connected to the shop's Wi-Fi and to a mapped drive on the shop's NAS that holds invoices.",
          ask: "What do you do first?",
          parts: [
            part(
              "Investigate, verify and quarantine",
              "Confirms the symptoms are malware (unwanted redirection, fake security alerts, changed home page, the unknown installed program) rather than a normal problem, then quarantines the PC: disconnects it from the network (Wi-Fi off, unplug cable) and the NAS so it cannot spread, and tells the owner not to call the number or use online banking from it.",
              "Verify: browser redirection, fake antivirus pop-ups with a phone number, a changed home page and a new 'PDF converter' in Apps are classic signs of malware (likely adware or a potentially unwanted program bundled with something worse). Quarantine: turn off Wi-Fi and unplug any cable so it is off the network and away from the NAS. Tell the owner not to call the number and not to use banking from this PC until it is clean."
            ),
          ],
        },
        {
          text: "The PC is now isolated.",
          ask: "Put the rest of CompTIA's V15 malware removal steps in order.",
          parts: [
            orderPart(
              "Removal procedure",
              "The order from objective 2.6 of 220-1202 V15 is met; one pair swapped is partly there.",
              "After investigating and quarantining: disable System Restore (Windows Home), remediate (uninstall the PUP, update the anti-malware, scan and remove, using safe mode or a preinstallation environment where needed, and reimage if it cannot be cleaned), then schedule scans and run updates, enable System Restore and create a clean restore point, and educate the user.",
              [
                "Disable System Restore",
                "Remediate: uninstall the unwanted program and update the anti-malware software",
                "Scan and remove, using safe mode or a preinstallation environment as needed",
                "Reimage or reinstall if the system cannot be cleaned",
                "Schedule scans and run updates",
                "Enable System Restore and create a restore point",
                "Educate the end user",
              ]
            ),
            part(
              "Why System Restore is disabled, then re-enabled",
              "Explains restore points taken while infected can contain the malware and let it come back if someone restores to them, so they are cleared by disabling System Restore; once the PC is clean it is re-enabled and a new clean restore point created.",
              "Restore points made while the PC was infected can include the malware; restoring to one later would reinfect it. Disabling System Restore removes those points. When the PC is clean, enable it again and create a fresh restore point so there is a clean one to return to."
            ),
          ],
        },
        {
          text: "Scans in safe mode remove the converter and two browser extensions; a second full scan is clean, and updates are installed. Before reconnecting, you notice the owner's saved browser passwords included the bank and the supplier portals.",
          ask: "Finish the job.",
          parts: [
            part(
              "Credentials, verification and user education",
              "Has the owner change the bank, email and supplier passwords from a clean device (and turn on MFA), checks the NAS invoices and scans the NAS share, resets the browser settings, verifies normal operation, and teaches him to install software only from trusted sources and to close (not click) fake alerts; documents everything.",
              "Assume saved passwords were stolen: from a clean device, change the bank, email and supplier portal passwords and turn on MFA; ask the bank to watch the account. Scan the NAS share from a clean machine and check the invoices open. Reset the browser to defaults and remove any leftover extensions. Reconnect and verify: no pop-ups, normal speed, correct home page. Educate: install software only from the vendor's own site or the Microsoft Store, never from pop-up ads; fake 'call this number' alerts are scams, close the tab. Document the symptoms, what was removed and the steps taken."
            ),
          ],
        },
      ],
    },
    {
      slug: "aplus2-bsod-after-driver",
      objective: "Troubleshooting common Windows problems: slow performance, application crashes, boot failures, and blue screen errors",
      kind: "case",
      title: "Recover a PC that blue-screens after a driver update",
      brief:
        "A Windows 11 Pro desktop at the fictional Lantern Books warehouse ran a graphics driver update downloaded from a third-party 'driver updater' site yesterday. This morning it shows a blue screen (stop code VIDEO_TDR_FAILURE) a few seconds after sign-in and restarts, over and over. The user needs it for the shipping labels by noon.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "After two failed starts, Windows shows the Windows Recovery Environment (WinRE).",
          ask: "How do you get into Windows to fix it?",
          parts: [
            part(
              "Getting in",
              "Uses WinRE's Startup Settings to boot into Safe Mode (which loads only basic drivers, so the faulty graphics driver does not load), and keeps System Restore or uninstalling the latest update as next options.",
              "In WinRE choose Troubleshoot > Advanced options > Startup Settings > Restart, then Safe Mode. Safe Mode uses the basic display driver, so the new graphics driver that triggers VIDEO_TDR_FAILURE does not load. If Safe Mode also fails, System Restore to a point before yesterday is the next option."
            ),
          ],
        },
        {
          text: "The PC starts in Safe Mode. Device Manager shows the graphics adapter with the new driver version dated yesterday.",
          ask: "Fix the cause and confirm.",
          parts: [
            part(
              "Fix",
              "Rolls back the graphics driver in Device Manager (or uninstalls it and installs the manufacturer's or Windows Update driver), removes the third-party driver-updater tool, restarts normally and confirms no blue screen and that label printing works.",
              "Device Manager > Display adapters > the adapter > Properties > Driver > Roll Back Driver (or uninstall the device's driver and install the version from the PC or graphics card maker, or Windows Update). Uninstall the 'driver updater' program. Restart normally, sign in, use the PC for a while and print a shipping label to confirm."
            ),
            part(
              "Confirm with the logs",
              "Checks Event Viewer (System log) and Reliability Monitor for the earlier BugCheck entries and confirms none after the fix, and runs sfc /scannow if system file corruption is suspected.",
              "Event Viewer > Windows Logs > System shows BugCheck events at each crash this morning; after the rollback none appear. Reliability Monitor gives the same picture on a timeline. If anything else misbehaves, run sfc /scannow to check system files."
            ),
          ],
        },
        {
          text: "Two weeks later the same PC is slow to start and sluggish all day, with no crashes. Task Manager's Startup apps tab lists 14 enabled apps, including three 'PC optimizer' tools and two updaters for software no longer used. The disk shows 96% full.",
          ask: "Fix the slow performance.",
          parts: [
            part(
              "Performance fix",
              "Disables unneeded startup apps in Task Manager, uninstalls the optimizer tools and unused software, frees disk space (Disk Cleanup or Storage settings, move or delete large files), checks for malware given the optimizer tools, and measures the result (startup time, Task Manager resource use).",
              "In Task Manager > Startup apps, disable what is not needed at sign-in; uninstall the three 'PC optimizer' tools and the unused programs (such tools are often unwanted programs themselves, so run a full scan). Free disk space with Disk Cleanup or Settings > Storage: a nearly full system disk slows Windows and blocks updates. Re-measure: time to a usable desktop and Task Manager's CPU, memory and disk use."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Operational Procedures (21%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "aplus2-backup-schedule-restore",
      objective: "Workstation backup and recovery: full, incremental, and differential backups, and testing restores",
      kind: "build",
      title: "Design a backup schedule and work out a restore",
      brief:
        "The fictional Fieldstone Engineering's design workstation holds about 600 GB of project files that change daily. Today the backup software runs a full backup every Sunday night to a USB drive that sits beside the PC, and incremental backups Monday to Saturday nights. The disk failed on Thursday at 14:00 and the owner wants to know what has to be restored, and how to stop this setup from losing everything to a fire or ransomware. No one has ever tested a restore.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Work out the restore, compare backup types, and write the improved plan.",
          parts: [
            numericPart(
              "Backup sets to restore",
              "4 (Sunday's full, then the Monday, Tuesday and Wednesday incrementals) is met.",
              "4 sets: Sunday's full backup, then the incrementals from Monday, Tuesday and Wednesday nights, in order. Thursday's work since Wednesday night is lost.",
              { answer: 4, tolerance: 0 }
            ),
            part(
              "Incremental versus differential",
              "Explains that each incremental holds changes since the last backup of any kind (small, fast, but every one since the full is needed to restore), while a differential holds all changes since the last full (grows each day, but a restore needs only the full plus the latest differential: 2 sets here), and that a full backup copies everything.",
              "Full: everything, every time; simplest restore, most space and time. Incremental: only what changed since the last backup (full or incremental); fastest nightly, but a restore needs the full and every incremental since, in order (4 sets here, and one damaged set breaks the chain). Differential: everything changed since the last full; it grows through the week, but a restore needs only the full plus the latest differential (Sunday's full and Wednesday's differential, 2 sets)."
            ),
            part(
              "Improved plan",
              "Applies the 3-2-1 rule (three copies of the data, on two different media types, one copy off site), adds an off-site or cloud copy that ransomware on the PC cannot reach (offline, immutable or versioned), keeps a rotation such as grandfather-father-son for history, and schedules regular test restores.",
              "Follow the 3-2-1 rule: three copies of the data (the original plus two backups), on two different media types, with one copy off site. Keep the nightly job to the USB drive for fast restores but rotate drives so one is always disconnected, and add a nightly cloud or off-site backup with versioning or immutability so ransomware on the PC cannot encrypt it. Keep history with a grandfather-father-son rotation (daily, weekly, monthly sets)."
            ),
            part(
              "Testing restores",
              "Schedules test restores (for example monthly: restore sample files and periodically a full restore to spare hardware), checks the restored files open, and records the time it took.",
              "Once a month restore a handful of project files to a different folder and open them; twice a year restore the whole workstation image to a spare disk and time it. Record each test. A backup that has never been restored is not known to work."
            ),
          ],
        },
      ],
    },
    {
      slug: "aplus2-change-request-firmware",
      objective: "Change-management best practices: purpose and scope of change, risk analysis, and a backout plan",
      kind: "build",
      title: "Write the change request for a firewall firmware update",
      brief:
        "The fictional Oakmont Credit Union branch has one firewall appliance that every teller PC, the ATM link and the phones depend on. The vendor has released a firmware update fixing a security flaw that is being exploited; your manager asks you to install it. Branch hours are 09:00-17:00 Monday to Saturday. The firewall can export its configuration, and the vendor's notes say the update takes about 15 minutes with two reboots and that the previous firmware image can be reinstalled.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the change request.",
          parts: [
            part(
              "Purpose, scope and change type",
              "States the purpose (fix an actively exploited vulnerability), the scope (the one firewall, its firmware only, no rule changes), the affected systems (all branch traffic: tellers, ATM link, phones), and classifies it (a normal change scheduled soon, or an emergency change if policy treats active exploitation that way), with the change board's approval.",
              "Purpose: install firmware version X to fix a vulnerability the vendor says is being actively exploited. Scope: the branch firewall's firmware only; no rule or configuration changes. Affected systems: all branch network traffic, including teller PCs, the ATM link and phones, during the reboots. Type: an expedited normal change approved by the change board, or an emergency change if policy treats active exploitation that way."
            ),
            part(
              "Risk analysis and schedule",
              "Names the risks (outage during reboots, failed upgrade, configuration not carried over, new bugs) with a risk level, schedules a maintenance window outside branch hours (for example Saturday after 17:00 or Sunday), notifies the branch and the ATM provider, and names who does it and who peer-reviews.",
              "Risks: about 15 minutes of outage with two reboots; the upgrade could fail or the configuration might not carry over; new firmware might introduce a bug. Risk level: medium (single device everything depends on, but tested rollback). Window: Sunday 08:00-10:00 with the branch closed; notify the branch manager and the ATM network provider in advance. Responsible: you, with a second technician peer-reviewing the plan and on call."
            ),
            part(
              "Backout plan",
              "Exports and saves the current configuration and records the current firmware version before starting, defines when to back out (for example, traffic tests fail after 30 minutes), and how: reinstall the previous firmware image and restore the saved configuration.",
              "Before: export the configuration to a secure location, note the current firmware version and download the current firmware image. Backout trigger: any test in the checklist still failing 30 minutes after the upgrade. Backout: reinstall the previous firmware image, restore the exported configuration, reboot and rerun the tests, then report to the change board."
            ),
            part(
              "Testing and sign-off",
              "Lists the post-change tests (internet from a teller PC, the ATM link up, a phone call, VPN to head office, firewall logs normal), gets end-user acceptance on Monday morning, and records the outcome in the change record.",
              "After the upgrade: confirm the new firmware version; from a teller PC reach the core banking system and the internet; confirm the ATM link is up with the provider; make a test phone call; check the VPN to head office and that the firewall logs show normal traffic. Monday 09:00: the branch manager confirms tellers work (end-user acceptance). Close the change record with the result and any lessons."
            ),
          ],
        },
      ],
    },
  ],
};
