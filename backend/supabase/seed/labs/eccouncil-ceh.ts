import { GENERAL_SAFETY, matchPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";
import { CEH_BLUEPRINT_URL, CEH_CERT_URL } from "../tracks/eccouncil";

// REQ-273: EC-Council CEH (312-50, v13), Exam Blueprint v5.0 (read
// 2026-11-14). Nine domains at 6 / 17 / 15 / 24 / 14 / 5 / 10 / 5 / 5 as
// printed. Density (docs/labs.md, policy "hybrid"): 1 / 2 / 2 / 3 / 2 / 1 /
// 2 / 1 / 1 = 15, one lab per objective.
//
// SAFETY, as PENTESTPLUS: every lab is set in an authorized engagement or in
// the learner's own lab, and teaches recognition, interpretation,
// prioritization and the countermeasure. No lab gives working exploitation
// steps, payloads or commands to run against a system; the tool output shown
// is authored, not captured from a real system. Fictional organizations;
// IP addresses from documentation (RFC 5737) and private (RFC 1918) ranges;
// .example domains. Every lab is needs_expert_review.

const CHECKED = "2026-11-14";
const RECHECK = "2027-02-14";

export const CEH_LABS: SeedLabSet = {
  trackCode: "CEH",
  sources: [source(CEH_BLUEPRINT_URL, "exam_outline", CHECKED, RECHECK), source(CEH_CERT_URL, "exam_outline", CHECKED, RECHECK)],
  labs: [
    // ----- Domain 1: Information Security and Ethical Hacking Overview (1)
    {
      slug: "ceh-engagement-kill-chain",
      objective: "Apply hacking methodologies and frameworks -- the CEH ethical hacking framework, the Cyber Kill Chain and MITRE ATT&CK -- to plan an engagement",
      kind: "case",
      title: "Frame an engagement before any testing starts",
      brief:
        "Your small consultancy has been asked by Harrowgate Bank (fictional) to 'hack us and see what you find'. The request came by phone from the IT manager.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Before anything else, your lead asks what must be in place for this to be ethical hacking and not an attack.",
          ask: "List what you need before any testing.",
          parts: [
            part(
              "Before testing",
              "Written authorization from someone with authority over the systems (not just a phone call); an agreed scope (in and out of scope systems, third-party hosted assets need their owner's permission); rules of engagement (dates, times, techniques allowed, emergency contacts, data handling); and a non-disclosure agreement and reporting terms.",
              "Written authorization signed by someone with the authority to grant it -- a phone call from the IT manager is not enough. An agreed scope listing what is in and out (systems hosted by a third party need that provider's permission too). Rules of engagement: testing windows, allowed and forbidden techniques (for example no denial of service), emergency contacts and what happens if you find evidence of a real attacker. And confidentiality and reporting terms for whatever data you see."
            ),
          ],
        },
        {
          text: "With the paperwork signed, the bank asks you to explain your plan using the Cyber Kill Chain, which its board has heard of.",
          ask: "Put the Cyber Kill Chain phases in order.",
          parts: [
            orderPart(
              "Cyber Kill Chain",
              "Reconnaissance; weaponization; delivery; exploitation; installation; command and control; actions on objectives. All in order is met; one swap is partly there.",
              "Lockheed Martin's Cyber Kill Chain runs: reconnaissance, weaponization, delivery, exploitation, installation, command and control (C2), and actions on objectives. For defenders, the point is that breaking any link stops the chain; your report can show where the bank's controls broke it and where they did not. MITRE ATT&CK then gives the finer-grained technique names for each step you test.",
              ["Reconnaissance", "Weaponization", "Delivery", "Exploitation", "Installation", "Command and control", "Actions on objectives"]
            ),
          ],
        },
      ],
    },

    // ----- Domain 2: Reconnaissance Techniques (2)
    {
      slug: "ceh-passive-vs-active-recon",
      objective: "Plan passive footprinting with search engines, web services, social networking sites and people search services",
      kind: "build",
      title: "Sort reconnaissance into passive and active",
      brief:
        "For an authorized test of Calloway Outdoor (fictional, calloway.example), the rules of engagement allow only passive footprinting in week one: nothing that sends traffic to the client's systems.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the activities that are NOT allowed in week one, then name a countermeasure for what passive footprinting found.",
          parts: [
            selectPart(
              "Not passive",
              "Selects the activities that touch the client's systems: port scanning the web server, a DNS zone transfer request to the client's name server, and banner grabbing on the mail server. Selecting those three is met; two is partly there; selecting search-engine, WHOIS, job-posting or social-network research lowers the score.",
              "Port scanning, asking the client's own name server for a zone transfer, and connecting to grab banners all send traffic to the client, so they are active and wait for week two. Searching the web, reading WHOIS registration records, job postings and staff profiles on social networks, and certificate transparency logs use third-party sources and never touch the client's systems.",
              {
                display: "list",
                lines: [
                  "Search engine queries for documents on calloway.example",
                  "Reading WHOIS registration records for the domain",
                  "Port scanning the public web server",
                  "Reading job postings that name the company's firewall and email products",
                  "Requesting a DNS zone transfer from the company's name server",
                  "Reviewing staff profiles on professional social networks",
                  "Banner grabbing on the mail server",
                  "Searching certificate transparency logs for subdomains",
                ],
                correct: [2, 4, 6],
              }
            ),
            part(
              "Countermeasure",
              "Names a countermeasure for exposed information: e.g., remove product names from job postings, staff guidance on what to share on social media, WHOIS privacy, removing metadata from published documents.",
              "For example: write job postings without naming the exact firewall and mail products; give staff guidance on what not to post about internal systems; strip author and software metadata from documents before publishing; use registration privacy for WHOIS. None of these hides a company completely, but they cut what an attacker learns for free."
            ),
          ],
        },
      ],
    },
    {
      slug: "ceh-interpret-scan",
      objective: "Interpret scan output, including scans that try to get past IDS and firewalls, and recommend scanning countermeasures",
      kind: "case",
      title: "Read a scan of a lab server",
      brief:
        "In your own practice lab you scanned a server you built, 10.10.20.15, with a version scan. The authored output is below.\n\nPORT     STATE    SERVICE   VERSION\n21/tcp   open     ftp       vsftpd 3.0.5 (anonymous login allowed)\n22/tcp   open     ssh       OpenSSH 9.6\n23/tcp   open     telnet    Linux telnetd\n80/tcp   open     http      Apache httpd 2.4.62\n443/tcp  open     https     Apache httpd 2.4.62\n3306/tcp open     mysql     MySQL 8.0.39\n8080/tcp filtered http-proxy",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The server is meant to be a public web server.",
          ask: "Select the findings a tester would report as the most significant exposures.",
          parts: [
            selectPart(
              "Significant exposures",
              "Selects anonymous FTP, Telnet, and MySQL reachable from outside. Selecting those three is met; two is partly there; selecting SSH, HTTP/HTTPS or the filtered port lowers the score.",
              "Anonymous FTP lets anyone read (or perhaps write) files. Telnet sends credentials in clear text and has no place on a public server. A database listening to the network should be reachable only by the application, not from outside. SSH, HTTP and HTTPS are expected on a web server (SSH ideally restricted to admin addresses). 'Filtered' on 8080 means a firewall dropped the probe; it is not open.",
              {
                display: "table",
                header: "PORT     STATE    SERVICE   VERSION",
                lines: [
                  "21/tcp   open     ftp       vsftpd 3.0.5 (anonymous login allowed)",
                  "22/tcp   open     ssh       OpenSSH 9.6",
                  "23/tcp   open     telnet    Linux telnetd",
                  "80/tcp   open     http      Apache httpd 2.4.62",
                  "443/tcp  open     https     Apache httpd 2.4.62",
                  "3306/tcp open     mysql     MySQL 8.0.39",
                  "8080/tcp filtered http-proxy",
                ],
                correct: [0, 2, 5],
              }
            ),
          ],
        },
        {
          text: "A second scan from a different lab machine, using fragmented packets and a slow timing profile, shows the same results, but the lab's IDS logged nothing.",
          ask: "What does that tell you, and what countermeasures do you recommend for the server and the monitoring?",
          parts: [
            part(
              "Interpretation",
              "The IDS was evaded by fragmentation and slow timing, so scanning is not being detected; detection needs reassembly and low-and-slow correlation.",
              "Fragmentation and slow timing slipped past the IDS: it either is not reassembling fragments or only alerts on fast bursts. A real attacker scanning slowly would go unnoticed."
            ),
            part(
              "Countermeasures",
              "Server: disable telnet and anonymous FTP (use SFTP), bind MySQL to localhost or the app network, restrict SSH by source; firewall default-deny with only 80/443 public. Monitoring: enable fragment reassembly/normalization, add correlation for slow scans over long windows, and alert on connections to closed ports.",
              "On the server: turn off Telnet and anonymous FTP (use SFTP if file transfer is needed), bind MySQL to localhost or the application network only, allow SSH only from admin addresses, and keep a default-deny firewall that publishes only 80 and 443. On monitoring: turn on fragment reassembly or traffic normalization in the IDS, and add a rule that counts connection attempts to many ports from one source over hours, not seconds."
            ),
          ],
        },
      ],
    },

    // ----- Domain 3: System Hacking Phases and Attack Techniques (2)
    {
      slug: "ceh-vuln-report-prioritize",
      objective: "Interpret vulnerability assessment types, scoring systems such as CVSS, assessment tools and reports",
      kind: "case",
      title: "Prioritize a vulnerability report beyond the CVSS number",
      brief:
        "An authorized assessment of Wexford Clinics (fictional) produced three findings: (A) CVSS base 9.8, remote code execution in a print server on an isolated lab network with no internet access; (B) CVSS base 7.5, a flaw in the internet-facing VPN appliance that is listed in CISA's Known Exploited Vulnerabilities catalog; (C) CVSS base 5.3, a web server revealing its exact version.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The clinic's IT lead plans to fix them in CVSS order.",
          ask: "Put them in the order you would recommend and explain why it differs from CVSS order.",
          parts: [
            orderPart(
              "Recommended order",
              "B (actively exploited, internet-facing) first; A (critical but isolated) second; C (information disclosure) last. In this order is met.",
              "The VPN flaw comes first: it is internet-facing and known to be exploited in the wild, so attackers are using it now. The 9.8 print server flaw is severe but sits on an isolated network, which lowers its real exposure; fix it next. The version disclosure helps an attacker plan but is not itself a way in.",
              [
                "B: VPN appliance flaw, CVSS 7.5, known exploited, internet-facing",
                "A: print server RCE, CVSS 9.8, isolated network",
                "C: web server version disclosure, CVSS 5.3",
                "None: accept all three as residual risk",
              ]
            ),
            part(
              "Why not CVSS order",
              "Explains the CVSS base score measures technical severity, not the organization's risk; exploitation in the wild, exposure and asset value change priority.",
              "A CVSS base score describes how severe a flaw is in general. It does not know that one system is unreachable from the internet or that another flaw is being exploited right now. Priority comes from severity combined with exposure, active exploitation and the asset's value."
            ),
          ],
        },
        {
          text: "The report's executive summary says only '47 vulnerabilities found'.",
          ask: "What should a useful assessment report give the clinic instead?",
          parts: [
            part(
              "Useful report",
              "An executive summary of the top risks in business terms; findings ranked by risk with evidence, affected assets, CVSS and context; clear remediation steps and owners; and notes on false positives verified and scope limits.",
              "A short summary of the few findings that matter most and what they could mean for the clinics; each finding with the evidence, the affected systems, its score and its context (exposed? exploited?); a specific remediation and suggested owner; and a note on what was out of scope and which scanner results were checked and found to be false positives."
            ),
          ],
        },
      ],
    },
    {
      slug: "ceh-system-hacking-phases-defense",
      objective:
        "Analyze the system hacking phases: gaining access, password cracking, exploitation, privilege escalation, maintaining access, executing applications, hiding files, persistence and clearing logs",
      kind: "build",
      title: "Map each system hacking phase to the evidence it leaves",
      brief:
        "After an authorized red team exercise at Linden Grove Council (fictional), the blue team wants to know what evidence each phase of the red team's work should have left for detection.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each phase to the defender's best evidence of it, then name one control that breaks the clearing-logs phase.",
          parts: [
            matchPart(
              "Phase to evidence",
              "Password cracking/guessing -> bursts of failed logons then a success; privilege escalation -> a standard account added to an admin group; persistence -> a new scheduled task or service; clearing logs -> a 'security log cleared' event or a gap in logs. All four right is met; three is partly there.",
              "Online password guessing leaves a run of failed logons followed by a success. Privilege escalation often shows as an account gaining admin group membership or a process suddenly running with higher rights. Persistence shows as a new scheduled task, service, or run key that survives reboot. Clearing logs leaves its own trace -- Windows records that the security log was cleared -- or a suspicious gap.",
              {
                leftHeading: "Phase",
                rightHeading: "Evidence",
                left: ["Password guessing", "Privilege escalation", "Maintaining access (persistence)", "Clearing logs"],
                right: [
                  "Many failed logons, then a success",
                  "A standard account added to an administrators group",
                  "A new scheduled task or service that survives reboot",
                  "A 'security log cleared' event, or a gap in the logs",
                  "A routine antivirus definition update",
                ],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Breaking log clearing",
              "Forward logs in near real time to a central log server or SIEM the attacker's account cannot alter, and alert on log-clearing events.",
              "Send logs off the host as they are written, to a central server or SIEM the compromised account cannot change, and alert on any log-clearing event. Clearing the local log then only removes a copy, and the act itself raises an alarm."
            ),
          ],
        },
      ],
    },

    // ----- Domain 4: Network and Perimeter Hacking (3)
    {
      slug: "ceh-arp-poisoning-detect",
      objective:
        "Recognize sniffing attacks -- MAC flooding, DHCP starvation, ARP poisoning, spoofing and DNS poisoning -- and choose detection techniques and countermeasures",
      kind: "case",
      title: "Spot ARP poisoning in a lab ARP table",
      brief:
        "In your own lab network (10.0.0.0/24), the gateway is 10.0.0.1 with MAC 00:1a:2b:3c:4d:01. A workstation's ARP table, taken after a user reported slow and odd web sessions, is below (authored).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "ARP table on workstation 10.0.0.42:",
          ask: "Select the entries that show the poisoning.",
          parts: [
            selectPart(
              "Poisoned entries",
              "Selects the gateway entry carrying another host's MAC and that host's own entry with the same MAC (two IPs, one MAC, one of them the gateway). Selecting both is met; one is partly there.",
              "The gateway 10.0.0.1 should have MAC 00-1a-2b-3c-4d-01, but the table shows 00-1a-2b-3c-4d-77 -- the same MAC as 10.0.0.77. One machine is claiming to be the gateway, so the workstation sends its traffic there first: a man-in-the-middle by ARP poisoning. The other entries have their own MACs.",
              {
                display: "table",
                header: "Internet Address   Physical Address    Type",
                lines: [
                  "10.0.0.1           00-1a-2b-3c-4d-77   dynamic",
                  "10.0.0.20          00-1a-2b-3c-4d-20   dynamic",
                  "10.0.0.31          00-1a-2b-3c-4d-31   dynamic",
                  "10.0.0.77          00-1a-2b-3c-4d-77   dynamic",
                  "10.0.0.255         ff-ff-ff-ff-ff-ff   static",
                ],
                correct: [0, 3],
              }
            ),
          ],
        },
        {
          text: "You confirm 10.0.0.77 is answering for the gateway.",
          ask: "Choose detection and countermeasures for the network.",
          parts: [
            part(
              "Detection and countermeasures",
              "Dynamic ARP inspection on the switches (with DHCP snooping bindings), port security, ARP monitoring tools alerting on IP-MAC changes, static ARP entries for critical hosts where practical, and encryption (TLS/VPN) so intercepted traffic is unreadable.",
              "Turn on dynamic ARP inspection on the switches, backed by DHCP snooping, so replies that do not match a known binding are dropped; add port security; run an ARP monitor that alerts when an IP's MAC changes; consider static entries for the gateway on critical hosts; and keep traffic encrypted (TLS, VPN) so anything intercepted is unreadable."
            ),
          ],
        },
      ],
    },
    {
      slug: "ceh-social-engineering-techniques",
      objective:
        "Recognize social engineering techniques, insider threats, impersonation on social networking sites and identity theft, and design countermeasures",
      kind: "build",
      title: "Name the social engineering technique",
      brief:
        "Staff at Bramble Mutual (fictional) reported five incidents last month. Name the technique in each, then design one countermeasure.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each report to its technique, then propose a countermeasure for the payment request.",
          parts: [
            matchPart(
              "Technique",
              "Caller posing as IT asking for a password -> vishing (pretexting by phone); following an employee through a badge door -> tailgating; a text with a parcel-delivery link -> smishing; an email to the CFO from a look-alike CEO address asking for an urgent transfer -> whaling/business email compromise; a USB stick labeled 'Salaries' left in the parking lot -> baiting. All five right is met; three or four is partly there.",
              "A phone call pretending to be IT is vishing, a voice pretext. Walking in behind someone through a badge door is tailgating. A text message with a malicious link is smishing. A targeted email to an executive from a look-alike address demanding a payment is whaling, a form of business email compromise. A labeled USB stick left to be found is baiting.",
              {
                leftHeading: "Report",
                rightHeading: "Technique",
                left: [
                  "A caller claiming to be IT asks for a password to 'fix your mailbox'",
                  "Someone follows an employee through a badge-controlled door",
                  "A text about a missed parcel with a link",
                  "The CFO gets an urgent transfer request from a look-alike CEO address",
                  "A USB stick labeled 'Salaries' is left in the parking lot",
                ],
                right: ["Vishing", "Tailgating", "Smishing", "Whaling (business email compromise)", "Baiting", "Shoulder surfing"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Countermeasure for the payment request",
              "A process control: payment or bank-detail changes verified out of band through a known number, with dual approval, plus external-sender tagging and executive awareness training.",
              "Make it a process control, not only training: any new payment or change of bank details is confirmed by calling a known number (never one from the email) and needs a second approver. Add banners marking external email and look-alike domain alerts, and brief executives, who are the main targets."
            ),
          ],
        },
      ],
    },
    {
      slug: "ceh-ddos-types-protection",
      objective: "Analyze DoS and DDoS attacks and botnets, and select DoS/DDoS protection",
      kind: "build",
      title: "Classify DDoS attacks and choose protection",
      brief:
        "Starling Tickets (fictional) suffered three disruptions during a big sale. The network team describes each.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each event to its DDoS category, then select protection for the application-layer attack.",
          parts: [
            matchPart(
              "Category",
              "Huge UDP reflection traffic filling the internet link -> volumetric; floods of half-open TCP connections exhausting the firewall's state table -> protocol; thousands of bots requesting the costly search page -> application layer. All three right is met.",
              "Reflected UDP traffic that fills the link is a volumetric attack, measured in bits per second. A SYN flood leaving half-open connections exhausts state in firewalls and servers -- a protocol attack, measured in packets per second. Bots hammering an expensive page with valid-looking requests is an application-layer attack, measured in requests per second, and is the hardest to tell from real customers.",
              {
                leftHeading: "Event",
                rightHeading: "Category",
                left: [
                  "UDP reflection traffic saturates the internet link",
                  "Half-open TCP connections fill the firewall's state table",
                  "Thousands of bots request the costly search page",
                ],
                right: ["Volumetric", "Protocol", "Application layer", "Physical"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "Application-layer protection",
              "Web application firewall/bot management with rate limiting per client, challenge for suspicious clients, caching or a CDN for heavy pages, and autoscaling with limits; notes that volumetric attacks need upstream scrubbing (ISP or DDoS protection service).",
              "Put the site behind a web application firewall or bot management service with per-client rate limits and challenges for suspicious clients, cache the search results or serve them through a content delivery network, and let the back end scale within a cost ceiling. The volumetric attack needs a different answer: upstream scrubbing by the ISP or a DDoS protection service, because no on-site device helps once the link itself is full."
            ),
          ],
        },
      ],
    },

    // ----- Domain 5: Web Application Hacking (2)
    {
      slug: "ceh-sqli-types",
      objective:
        "Recognize SQL injection types -- in-band, blind (inferential) and out-of-band -- and the SQL injection methodology and evasion techniques",
      kind: "build",
      title: "Tell SQL injection types apart from their symptoms",
      brief:
        "During an authorized test of a deliberately vulnerable training app in your own lab, you note how the app reacts to different test inputs. Classify each observation; no payloads are needed.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each observation to the SQL injection type it indicates.",
          parts: [
            matchPart(
              "Type",
              "Database error text shown on the page -> in-band (error-based); extra rows from another table appear in the results -> in-band (union-based); page content changes only with true/false conditions -> blind boolean-based; page responds after a deliberate delay -> blind time-based; the database server makes a DNS request to an outside host -> out-of-band. All five right is met; three or four is partly there.",
              "When the app shows database error messages, data can come back through them: in-band, error-based. Results with rows from other tables are in-band, union-based. If nothing is shown but the page differs between a true and a false condition, it is blind, boolean-based; if only response time changes, blind, time-based. When the database is made to contact an outside server (for example by DNS) to carry the data, it is out-of-band.",
              {
                leftHeading: "Observation",
                rightHeading: "Type",
                left: [
                  "The page shows the database's error message",
                  "Rows from another table appear in the search results",
                  "Only the page content changes between true and false conditions",
                  "Only the response time changes with the condition",
                  "The database server sends a DNS lookup to an outside host",
                ],
                right: ["In-band, error-based", "In-band, union-based", "Blind, boolean-based", "Blind, time-based", "Out-of-band"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Why blind is still serious",
              "Explains that blind injection still lets an attacker extract data one bit/condition at a time (slowly, often with automation), so hiding error messages is not a fix.",
              "Blind injection still leaks data -- one true-or-false answer or one delay at a time, which tools automate. Hiding error messages only turns error-based into blind; the fix is in how the query is built."
            ),
          ],
        },
      ],
    },
    {
      slug: "ceh-sqli-fix-code",
      objective: "Implement SQL injection countermeasures such as parameterized queries, input validation and least-privilege database accounts",
      kind: "build",
      title: "Find and fix the injectable query",
      brief:
        "A developer at Quill Books (fictional) asks you to review this login code from their own app before release. It is Python with a database driver that supports parameters.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the vulnerable line, then describe the fix and two further defenses.",
          parts: [
            selectPart(
              "Vulnerable line",
              "Selects the line that builds the SQL string by concatenating user input. Met when only that line is selected.",
              "Line 4 pastes the username and password straight into the SQL text, so input containing quote characters changes the query's meaning. The other lines are not the cause.",
              {
                display: "config",
                lines: [
                  "def login(db, username, password):",
                  "    if len(username) > 64:",
                  "        return None",
                  "    sql = \"SELECT id FROM users WHERE name = '\" + username + \"' AND pw_hash = '\" + hash_pw(password) + \"'\"",
                  "    row = db.execute(sql).fetchone()",
                  "    return row[0] if row else None",
                ],
                correct: [3],
              }
            ),
            part(
              "The fix",
              "Uses a parameterized query (placeholders with values passed separately), e.g. db.execute(\"SELECT id FROM users WHERE name = ? AND pw_hash = ?\", (username, hash_pw(password))); explains the driver sends values as data, never as SQL.",
              "Use a parameterized query: db.execute(\"SELECT id FROM users WHERE name = ? AND pw_hash = ?\", (username, hash_pw(password))) (the placeholder style depends on the driver). The values travel separately from the SQL text, so the database treats them as data and they can never change the query's structure."
            ),
            part(
              "Defense in depth",
              "Two more of: the app's database account has least privilege (read only on needed tables), allow-list input validation, generic error messages, a WAF as an extra layer, and storing passwords with a proper password hashing algorithm.",
              "Run the app with a database account that can only read the tables it needs; validate input against an allow-list of expected characters and lengths; show generic error messages; and, as an extra layer only, a web application firewall. (Also make sure hash_pw uses a slow, salted password-hashing algorithm.)"
            ),
          ],
        },
      ],
    },

    // ----- Domain 6: Wireless Network Hacking (1)
    {
      slug: "ceh-wireless-evil-twin",
      objective: "Analyze wireless threats, the wireless hacking methodology and Bluetooth attacks, and secure wireless networks with countermeasures and security tools",
      kind: "case",
      title: "Assess an office's wireless after an evil twin report",
      brief:
        "Juniper Dental (fictional) runs one Wi-Fi network, 'JuniperStaff', on WPA2-Personal with a passphrase that has not changed in five years and is written on the break room wall. A patient waiting room is next to the staff area.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "A staff member's phone connected to a second 'JuniperStaff' network with a stronger signal, and a login page asked for her email password.",
          ask: "What happened, and why did the phone connect?",
          parts: [
            part(
              "What happened",
              "An evil twin: a rogue access point broadcasting the same network name, with a captive portal to harvest credentials; devices join known names automatically, and with a shared passphrase that is widely known the attacker can even impersonate the network fully.",
              "An evil twin: someone set up an access point with the same name and a stronger signal, plus a fake login page to collect passwords. Phones rejoin networks by name automatically, and because the passphrase is on the wall, the attacker can run a twin that accepts the same passphrase, so it looks completely normal to devices."
            ),
          ],
        },
        {
          text: "The owner asks what to change.",
          ask: "Recommend wireless security changes.",
          parts: [
            part(
              "Recommendations",
              "Move staff Wi-Fi to WPA3-Enterprise or WPA2/WPA3-Enterprise with 802.1X and certificate validation (or at least WPA3-Personal with a new, private passphrase); separate guest network; wireless intrusion detection for rogue APs; staff guidance never to enter passwords on Wi-Fi login pages; remove the posted passphrase.",
              "Move staff Wi-Fi to enterprise authentication (802.1X, WPA3-Enterprise where devices support it) with devices set to validate the server certificate, so a twin cannot impersonate it; failing that, WPA3-Personal with a new passphrase nobody posts on a wall. Give patients a separate guest network. Use wireless intrusion detection to spot rogue access points broadcasting the staff name. And tell staff that the real network never asks for an email password on a web page."
            ),
          ],
        },
      ],
    },

    // ----- Domain 7: Mobile Platform, IoT, and OT Hacking (2)
    {
      slug: "ceh-mobile-mdm",
      objective: "Analyze mobile attack vectors against Android and iOS, and apply mobile device management and mobile security guidelines",
      kind: "case",
      title: "Close mobile attack vectors with device management",
      brief:
        "Field sales staff at Thornbury Medical Supplies (fictional) use personal phones for company email and the customer database app. An authorized assessment found: some phones are rooted or jailbroken, several sideloaded a 'free VPN' app from outside the official store, and two phones have no screen lock.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The sales director wants to keep personal phones.",
          ask: "Name the attack vector behind each finding.",
          parts: [
            part(
              "Attack vectors",
              "Rooting/jailbreaking removes the OS sandbox and security controls; sideloaded apps bypass store review and may be malicious (a 'free VPN' can see traffic); no screen lock exposes data on a lost or stolen device.",
              "A rooted or jailbroken phone has its security model removed: apps can escape their sandbox and read other apps' data. Sideloaded apps skip the store's review, and a 'free VPN' is placed exactly where it can read or redirect traffic. A phone with no screen lock gives anyone who picks it up the email and customer data."
            ),
          ],
        },
        {
          text: "The sales director agrees to controls as long as the company cannot see or wipe staff's personal photos and messages.",
          ask: "Propose a device management approach that respects personal ownership.",
          parts: [
            part(
              "MDM approach",
              "Enroll BYOD phones in MDM/mobile application management with a work profile or managed apps only; compliance rules block rooted/jailbroken devices, require a screen lock and current OS, block access from non-compliant devices (conditional access); selective wipe of work data only; acceptable use policy agreed by staff.",
              "Use mobile device management with a separate work profile (or app-level management) so only company apps and data are managed, not personal photos. Set compliance rules: no rooted or jailbroken devices, a screen lock, a current operating system, apps only from official stores in the work profile. Conditional access blocks email and the customer app on any phone that fails. A lost phone gets a selective wipe of company data only. Staff agree to this in a BYOD policy."
            ),
          ],
        },
      ],
    },
    {
      slug: "ceh-ot-countermeasures",
      objective: "Analyze OT concepts and attacks -- industrial control systems, SCADA and PLCs -- and choose OT countermeasures",
      kind: "case",
      title: "Choose OT countermeasures without stopping the plant",
      brief:
        "An authorized assessment of Elmsford Water (fictional) found: the SCADA engineering workstation can browse the internet; a vendor reaches the PLCs over a remote desktop tool that is always on; and the PLCs accept program changes from any host on the control network with no authentication.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The plant engineer warns that active scanning once crashed a PLC.",
          ask: "Explain why OT assessment and defense differ from IT, given that warning.",
          parts: [
            part(
              "OT is different",
              "OT puts availability and safety first; legacy devices can fail under scans or patches; changes need engineering approval and maintenance windows; so assessment favors passive monitoring and defenses favor segmentation and access control over frequent patching.",
              "In a water plant, availability and physical safety come first, ahead of confidentiality. Many controllers are old and fragile -- a scan can crash one -- and patching needs vendor support and a maintenance window. So assessment leans on passive traffic monitoring and configuration review, and defense leans on segmentation, access control and monitoring rather than frequent patches."
            ),
          ],
        },
        {
          text: "The utility's manager accepts that plan and asks for one countermeasure per finding, each one that can be applied without stopping the plant.",
          ask: "Choose a countermeasure for each finding.",
          parts: [
            matchPart(
              "Countermeasure",
              "Engineering workstation on the internet -> remove internet access, segment it into the control zone; vendor's always-on remote access -> brokered, MFA-protected access through a DMZ jump host enabled only on request and monitored; unauthenticated PLC changes -> restrict programming to authorized engineering hosts, use the controller's key switch/write protection and monitor for program changes. All three right is met.",
              "Take the engineering workstation off the internet and keep it inside the control zone. Replace the vendor's always-on tool with remote access brokered through a DMZ jump host, protected by multi-factor authentication, switched on only when a job is approved, and recorded. Limit who can program the PLCs to named engineering hosts, use the controllers' run-mode key switch or write protection, and alert on any program download.",
              {
                leftHeading: "Finding",
                rightHeading: "Countermeasure",
                left: [
                  "SCADA engineering workstation can browse the internet",
                  "Vendor's always-on remote desktop to the PLCs",
                  "PLCs accept program changes from any host",
                ],
                right: [
                  "Remove internet access; keep it in the control zone",
                  "Brokered, MFA-protected access through a DMZ jump host, on request",
                  "Allow programming only from named engineering hosts; use write protection; alert on downloads",
                  "Run a weekly active vulnerability scan of every PLC",
                ],
                pairs: [0, 1, 2],
              }
            ),
          ],
        },
      ],
    },

    // ----- Domain 8: Cloud Computing (1)
    {
      slug: "ceh-cloud-exposed-storage",
      objective: "Analyze cloud threats and cloud hacking techniques, and apply cloud security controls",
      kind: "case",
      title: "Trace a cloud compromise from a leaked key",
      brief:
        "During an authorized cloud assessment for Pelham Analytics (fictional), you find an access key for a cloud identity in a public code repository. The identity has full administrator permissions. A storage bucket holding customer exports is also readable by anyone on the internet.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The rules of engagement say: report critical exposures to the client's emergency contact immediately, and do not use found credentials.",
          ask: "What do you do with the key, and why?",
          parts: [
            part(
              "Handling the key",
              "Does not use the key (outside the rules of engagement); reports it immediately to the emergency contact so the client can deactivate and rotate it and review the identity's activity logs; records where and when it was found.",
              "Do not use it -- the rules forbid it, and using it could harm the client and blur what an attacker did versus what you did. Call the emergency contact now so the client deactivates and replaces the key and reviews the cloud audit logs for any use by someone else. Record exactly where and when you found it."
            ),
          ],
        },
        {
          text: "The client has rotated the key and asks for the lasting fixes.",
          ask: "Apply cloud security controls to both findings.",
          parts: [
            part(
              "Cloud controls",
              "Least-privilege identities (no admin keys for applications; short-lived role credentials instead of long-lived keys); secret scanning in repositories; block public access on storage by default and review bucket policies; encryption and logging of storage access; continuous configuration monitoring (CSPM) and alerts.",
              "Give applications short-lived credentials from roles instead of long-lived access keys, scoped to what they need -- never administrator. Turn on secret scanning in the code repositories so a key is caught before it is pushed. Enable the account-wide setting that blocks public access to storage and review every bucket policy; log and alert on storage access. Add continuous configuration monitoring so the next public bucket or over-privileged identity is flagged the day it appears."
            ),
          ],
        },
      ],
    },

    // ----- Domain 9: Cryptography (1)
    {
      slug: "ceh-apply-pki-email-disk",
      objective: "Apply public key infrastructure, email encryption and disk encryption",
      kind: "build",
      title: "Choose the encryption for each need",
      brief:
        "Ashdown Legal (fictional) lists four needs: laptops that may be stolen, sending confidential email to clients, proving the firm's website is genuine, and checking that a downloaded installer was not altered.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each need to the protection that fits, then explain what PKI adds to the email option.",
          parts: [
            matchPart(
              "Need to protection",
              "Stolen laptops -> full-disk encryption (e.g., BitLocker or FileVault with TPM/pre-boot protection); confidential client email -> S/MIME or PGP email encryption; genuine website -> a TLS certificate from a trusted CA; unaltered installer -> verify a published hash or code signature. All four right is met; three is partly there.",
              "Full-disk encryption protects data on a stolen laptop. S/MIME (with certificates) or PGP encrypts and signs email end to end. A TLS certificate issued by a trusted certificate authority lets browsers confirm the website is the firm's. Comparing the installer's hash with the published value, or checking its code signature, shows it was not altered.",
              {
                leftHeading: "Need",
                rightHeading: "Protection",
                left: [
                  "Laptops that may be stolen",
                  "Confidential email to clients",
                  "Proving the website is genuine",
                  "Checking a downloaded installer was not altered",
                ],
                right: [
                  "Full-disk encryption",
                  "S/MIME or PGP email encryption",
                  "A TLS certificate from a trusted certificate authority",
                  "Verify the published hash or code signature",
                  "Base64 encoding",
                ],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "What PKI adds",
              "PKI binds each person's public key to their identity through certificates signed by a CA, so senders know they are encrypting to the right person and recipients can verify signatures; it also handles expiry and revocation.",
              "Encryption needs the right public key. Public key infrastructure binds each person's public key to their identity in a certificate signed by a trusted certificate authority, so the firm knows it is encrypting to the real client and the client can verify the firm's signature. PKI also handles expiry and revocation when a key is lost."
            ),
          ],
        },
      ],
    },
  ],
};
