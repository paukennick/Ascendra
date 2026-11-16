import { GENERAL_SAFETY, matchPart, numericPart, orderPart, part, type SeedLabSet } from "./types";
import { source } from "../sources";
import { CISSP_OUTLINE_URL, CISSP_PAGE_URL } from "../tracks/isc2";

// REQ-271: CISSP, outline effective 2024-04-15 (read 2026-11-14; a new
// outline takes effect 2027-04-15, so the set is rechecked by 2027-01-15).
// Eight domains at 16 / 10 / 13 / 13 / 13 / 12 / 13 / 10. Density
// (docs/labs.md, policy "hybrid"): 2 / 1 / 2 / 2 / 2 / 2 / 2 / 1 = 14, one
// lab per objective.
//
// CISSP asks for a manager's judgment: the labs score the reasoning (risk,
// business need, least disruption) as much as the term. Figures in the
// quantitative risk lab are scenario data; the formulas (SLE = asset value
// x exposure factor, ALE = SLE x ARO) are the standard quantitative risk
// definitions the CBK uses. Fictional organizations; documentation IP
// ranges; .example domains. Every lab is needs_expert_review.

const CHECKED = "2026-11-14";
const RECHECK = "2027-01-15";

export const CISSP_LABS: SeedLabSet = {
  trackCode: "CISSP",
  sources: [source(CISSP_OUTLINE_URL, "exam_outline", CHECKED, RECHECK), source(CISSP_PAGE_URL, "exam_outline", CHECKED, RECHECK)],
  labs: [
    // ----- Domain 1: Security and Risk Management (2)
    {
      slug: "cissp-ale-control-value",
      objective:
        "Calculate quantitative risk with asset value, exposure factor, single loss expectancy (SLE), annualized rate of occurrence (ARO) and annualized loss expectancy (ALE), and judge whether a control is worth its cost",
      kind: "case",
      title: "Decide whether a control is worth its cost",
      brief:
        "Halvorsen Freight (fictional) runs a customer portal valued at $400,000 (rebuild cost plus lost business). A successful web attack is estimated to damage 25% of that value. Threat intelligence and the company's own history suggest one such attack every two years.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Use the standard quantitative risk formulas: single loss expectancy (SLE) = asset value x exposure factor; annualized loss expectancy (ALE) = SLE x annualized rate of occurrence (ARO).",
          ask: "Calculate the SLE and the ALE before any new control.",
          parts: [
            numericPart(
              "SLE",
              "$400,000 x 0.25 = $100,000. Met within $1.",
              "SLE = asset value x exposure factor = $400,000 x 0.25 = $100,000 per occurrence.",
              { answer: 100000, tolerance: 1, unit: "USD" }
            ),
            numericPart(
              "ALE before the control",
              "One attack every two years is an ARO of 0.5; ALE = $100,000 x 0.5 = $50,000. Met within $1.",
              "ARO = 1 attack / 2 years = 0.5 a year. ALE = SLE x ARO = $100,000 x 0.5 = $50,000 a year.",
              { answer: 50000, tolerance: 1, unit: "USD" }
            ),
          ],
        },
        {
          text: "A web application firewall service costs $18,000 a year and is expected to cut the ARO to 0.1 (one success every ten years). The exposure factor is unchanged.",
          ask: "What is the control worth per year, and should the company buy it?",
          parts: [
            numericPart(
              "Annual value of the control",
              "ALE before ($50,000) minus ALE after ($100,000 x 0.1 = $10,000) minus the annual cost ($18,000) = $22,000. Met within $1.",
              "ALE after = $100,000 x 0.1 = $10,000. Value of the control = ALE before - ALE after - annual cost = $50,000 - $10,000 - $18,000 = $22,000 a year.",
              { answer: 22000, tolerance: 1, unit: "USD" }
            ),
            part(
              "Decision",
              "Recommends buying it because its value is positive ($22,000 a year), while noting the estimates' uncertainty and the qualitative factors (reputation, regulatory exposure) the numbers leave out.",
              "Buy it: it saves more than it costs, about $22,000 a year. Say plainly that the exposure factor and ARO are estimates, so the figure is a guide; and that a breach of customer data also carries reputation and regulatory costs the formula does not capture, which only strengthens the case."
            ),
          ],
        },
      ],
    },
    {
      slug: "cissp-transborder-breach",
      objective:
        "Analyze legal, regulatory and compliance issues: cybercrime and data breaches, licensing and intellectual property, import/export controls, transborder data flow, and privacy laws such as the GDPR and the California Consumer Privacy Act",
      kind: "case",
      title: "Work through a cross-border data decision and a breach",
      brief:
        "Brightline Learning (fictional), based in the United States, sells online courses to students in the European Union and California. Marketing wants to move all student records to a cheaper analytics vendor in another country.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The vendor stores data in a country the company has not assessed, and its contract says nothing about security or data location.",
          ask: "What legal and compliance issues do you raise before the move, as the security manager?",
          parts: [
            part(
              "Issues to raise",
              "Raises transborder data flow (EU personal data leaving to a third country needs a lawful transfer mechanism under the GDPR), the vendor acting as processor (a contract with security and processing terms), Californian students' rights under the CCPA, and an assessment of the vendor's security; and says legal/privacy counsel decides the mechanism.",
              "Transborder data flow: EU students' personal data may only go to another country under a lawful GDPR transfer mechanism, so legal and privacy counsel must confirm one exists before anything moves. The vendor would process data on Brightline's behalf, so it needs a contract with processing instructions, security obligations and breach notification terms. Californian students keep their CCPA rights, which the vendor must support. And the vendor's security needs assessing before it gets the data, not after."
            ),
          ],
        },
        {
          text: "Six months later (the move went ahead with a contract), the vendor reports that an attacker copied student names, emails and course histories two days ago.",
          ask: "What do you do first, and who decides on notifications?",
          parts: [
            part(
              "First steps",
              "Activates incident response with the vendor under the contract, gets scope (whose data, which jurisdictions, when), preserves evidence, and brings in legal/privacy counsel immediately because breach-notification deadlines may already be running.",
              "Invoke the contract's incident terms and work with the vendor to establish scope: which students, from which jurisdictions, what data and when. Make sure evidence is preserved. Bring in legal and privacy counsel at once, because notification clocks may already be running."
            ),
            part(
              "Who decides",
              "States that the decision to notify regulators and individuals rests with the organization (as controller) on counsel's advice, not with the vendor or the security team alone; deadlines vary by law and counsel confirms them.",
              "Brightline, as the organization responsible for the students' data, decides on notifications to regulators and students, on legal counsel's advice. Security supplies the facts. Deadlines differ by law and jurisdiction, so counsel confirms which apply rather than the security team guessing."
            ),
          ],
        },
      ],
    },

    // ----- Domain 2: Asset Security (1)
    {
      slug: "cissp-data-roles",
      objective:
        "Manage the data life cycle and data roles -- owners, controllers, custodians, processors, users and subjects -- from collection and location through maintenance, retention, remanence and destruction",
      kind: "build",
      title: "Name the data roles and end a data set's life safely",
      brief:
        "Crestview Health Partners (fictional) collects patient survey responses. The Vice President of Patient Experience is accountable for the data; the IT operations team runs the database and its backups; an outside survey company collects responses on Crestview's instructions; patients fill in the surveys.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each party to its data role, then say how the data's life ends when retention expires.",
          parts: [
            matchPart(
              "Data roles",
              "VP -> data owner; IT operations -> custodian; survey company -> processor; patients -> data subjects. All four right is met; three is partly there.",
              "The VP is the data owner: accountable for the data, deciding its classification and who may use it. IT operations is the custodian: it runs the day-to-day protection (the database, backups, access settings). The survey company is a processor: it handles the data only on Crestview's instructions. The patients are the data subjects: the data is about them. Crestview as an organization is the controller, deciding why and how the data is processed.",
              {
                leftHeading: "Party",
                rightHeading: "Role",
                left: ["VP of Patient Experience", "IT operations team", "Outside survey company", "Patients"],
                right: ["Data owner", "Data custodian", "Data processor", "Data subjects", "Data controller"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "End of life",
              "Retention expiry triggers destruction approved by the owner; covers every copy (database, backups, the processor's copies) and data remanence (sanitize or destroy media so data cannot be recovered), with a record of destruction.",
              "When retention expires the owner approves destruction, and it has to reach every copy: the database, the backups and the survey company's copies (the contract should require it to delete and confirm). Deleting rows is not enough because of data remanence, so storage that held the data is sanitized or destroyed by a method that prevents recovery, and the destruction is recorded."
            ),
          ],
        },
      ],
    },

    // ----- Domain 3: Security Architecture and Engineering (2)
    {
      slug: "cissp-blp-biba",
      objective: "Interpret security models such as Bell-LaPadula (confidentiality) and Biba (integrity), including their star properties",
      kind: "build",
      title: "Read the rules of Bell-LaPadula and Biba",
      brief:
        "A defense contractor (fictional) has levels Secret above Confidential. An analyst is cleared at Confidential. Decide what each model allows.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each rule to what it means, then say which model a payroll system that must stop low-trust input corrupting records would use.",
          parts: [
            matchPart(
              "Model rules",
              "BLP simple security: no read up; BLP star property: no write down; Biba simple integrity: no read down; Biba star integrity: no write up. All four right is met; two or three is partly there.",
              "Bell-LaPadula protects confidentiality: its simple security property forbids reading up (the Confidential analyst cannot read Secret), and its star property forbids writing down (a Secret subject cannot write into a Confidential object, which would leak). Biba protects integrity and inverts both: its simple integrity property forbids reading down (no relying on less trustworthy data), and its star integrity property forbids writing up (a low-integrity subject cannot corrupt high-integrity data).",
              {
                leftHeading: "Rule",
                rightHeading: "Meaning",
                left: [
                  "Bell-LaPadula simple security property",
                  "Bell-LaPadula star (*) property",
                  "Biba simple integrity property",
                  "Biba star (*) integrity property",
                ],
                right: ["No read up", "No write down", "No read down", "No write up"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Which model for payroll",
              "Chooses Biba (integrity): low-integrity sources must not write up into high-integrity payroll records; Bell-LaPadula would address secrecy, not corruption.",
              "Biba. The concern is integrity -- untrusted input changing pay records -- and Biba's no-write-up rule is exactly that control. Bell-LaPadula would keep salaries secret but says nothing about who may corrupt them."
            ),
          ],
        },
      ],
    },
    {
      slug: "cissp-crypto-selection",
      objective:
        "Select cryptographic solutions: the cryptographic life cycle, symmetric, asymmetric, elliptic-curve and quantum methods, public key infrastructure, key management, and digital signatures and certificates",
      kind: "case",
      title: "Choose the cryptography for a document system",
      brief:
        "Tidewater Legal (fictional) is building a system for sending contracts to clients. Contracts must stay confidential in transit and at rest, and clients must be able to prove a contract came from the firm unchanged.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The architect proposes encrypting each contract with the client's public key and calling that a signature.",
          ask: "What is wrong with the proposal, and what does each goal need?",
          parts: [
            part(
              "The flaw",
              "Encrypting with the recipient's public key gives confidentiality only; anyone can do it, so it proves nothing about the sender. A signature is made with the sender's private key over a hash of the document.",
              "Anyone can encrypt with the client's public key, so that proves nothing about who sent the contract -- it gives confidentiality, not origin. A digital signature is a hash of the contract signed with the firm's private key; the client verifies it with the firm's public key, which proves origin and integrity and supports non-repudiation."
            ),
            matchPart(
              "Goal to mechanism",
              "Bulk confidentiality -> symmetric encryption (e.g., AES) of the contract; key exchange -> asymmetric (the recipient's public key wraps the symmetric key); origin and integrity -> digital signature with the firm's private key; trust in the firm's public key -> a certificate from a trusted CA (PKI). All four right is met.",
              "Encrypt the contract itself with a symmetric algorithm such as AES (fast for bulk data); wrap that symmetric key with the client's public key (asymmetric key exchange); sign a hash of the contract with the firm's private key; and publish the firm's public key in a certificate from a trusted certificate authority so clients know it is really the firm's. This hybrid design is how TLS and secure email work.",
              {
                leftHeading: "Goal",
                rightHeading: "Mechanism",
                left: [
                  "Keep the contract confidential (bulk data)",
                  "Get the content-encryption key to the client safely",
                  "Prove the contract came from the firm unchanged",
                  "Let clients trust that the firm's public key is genuine",
                ],
                right: [
                  "Symmetric encryption such as AES",
                  "Wrap the key with the client's public key",
                  "Sign a hash with the firm's private key",
                  "A certificate from a trusted certificate authority",
                  "Hash the contract with no key",
                ],
                pairs: [0, 1, 2, 3],
              }
            ),
          ],
        },
        {
          text: "The firm keeps signed contracts for 30 years and asks what key management it needs over that time.",
          ask: "Name the key management practices that matter over the cryptographic life cycle.",
          parts: [
            part(
              "Key management",
              "Protects private keys (e.g., in an HSM), rotates keys on a schedule and on compromise, revokes compromised certificates, keeps old public keys/certificates to verify old signatures, and plans for algorithm change (crypto agility, including quantum-resistant algorithms over a 30-year horizon).",
              "Keep the signing key in a hardware security module with tight access; rotate keys on a schedule and immediately on suspected compromise, revoking the certificate; archive old certificates so 30-year-old signatures can still be verified; and plan for algorithms to change over three decades -- including a move to quantum-resistant algorithms -- by designing the system so algorithms can be swapped and documents re-signed or time-stamped."
            ),
          ],
        },
      ],
    },

    // ----- Domain 4: Communication and Network Security (2)
    {
      slug: "cissp-osi-layers",
      objective:
        "Apply secure design principles to network architecture: the OSI and TCP/IP models, IPv4 and IPv6, secure protocols (IPsec, SSH, TLS), and multilayer and converged protocols",
      kind: "build",
      title: "Place devices and protocols on the OSI model",
      brief:
        "To reason about where a control acts, the network team at Quarry Point Bank (fictional) wants each function placed on the OSI model.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each function to its OSI layer, then explain one risk of a converged protocol.",
          parts: [
            matchPart(
              "OSI layer",
              "Signal on copper or fiber -> 1 Physical; a switch forwarding by MAC address -> 2 Data link; a router forwarding by IP address, and IPsec -> 3 Network; TCP ports and reliable delivery -> 4 Transport; an HTTP request -> 7 Application. All five right is met; three or four is partly there.",
              "Layer 1 (Physical) carries the signal on copper, fiber or radio. Layer 2 (Data link) is where a switch forwards frames by MAC address. Layer 3 (Network) is where routers forward by IP address, and where IPsec protects packets. Layer 4 (Transport) is TCP and UDP: ports, and with TCP reliable ordered delivery. Layer 7 (Application) is the protocol the application speaks, such as HTTP.",
              {
                leftHeading: "Function",
                rightHeading: "OSI layer",
                left: [
                  "Signal on copper or fiber",
                  "A switch forwarding frames by MAC address",
                  "A router forwarding by IP address; IPsec",
                  "TCP ports and reliable delivery",
                  "An HTTP request",
                ],
                right: ["1 Physical", "2 Data link", "3 Network", "4 Transport", "7 Application", "6 Presentation"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Converged protocol risk",
              "Explains a converged protocol (e.g., iSCSI or VoIP carried over the IP network) shares the data network's exposure, so storage or voice traffic needs its own segment and protection (e.g., a dedicated VLAN, authentication, encryption).",
              "Converged protocols carry something that used to have its own network over IP -- iSCSI puts storage on the data network, VoIP puts the phones there. They inherit the data network's attackers: anyone who can reach the iSCSI target can try to mount the bank's disks. Keep them on dedicated segments, authenticate (for example CHAP for iSCSI), and encrypt where the protocol allows."
            ),
          ],
        },
      ],
    },
    {
      slug: "cissp-segmentation-design",
      objective:
        "Design network segmentation -- physical, logical (VLANs, VPNs, virtual routing and forwarding) and micro-segmentation -- and control north-south and east-west traffic",
      kind: "case",
      title: "Segment a flat network after a lateral-movement scare",
      brief:
        "Sunridge Manufacturing (fictional) has one flat network: office PCs, the ERP database, the payment terminals and the plant's control systems all talk freely. A penetration test reached the ERP database from a receptionist's PC in an hour.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Leadership asks for a segmentation design that does not stop the plant.",
          ask: "Propose the segments and how traffic between them is controlled.",
          parts: [
            part(
              "Segments",
              "Separates at least: office users, servers/ERP, payment card systems, plant control (OT, ideally physically or strongly separated with a DMZ between IT and OT), and management; uses VLANs/VRFs with firewalls between them.",
              "Office users; servers including the ERP database; the payment terminals (their own zone, which also shrinks the card-data compliance scope); the plant's control systems, separated from IT by a DMZ so nothing goes straight from office to OT; and a management network for admin interfaces. Build them as VLANs or VRFs with a firewall between every pair."
            ),
            part(
              "Controlling traffic",
              "Default-deny between segments with only named flows allowed (e.g., ERP clients to the ERP application tier, not straight to the database); east-west controls inside the server segment (micro-segmentation) so one server cannot reach every other; north-south through the perimeter firewall; monitoring at the boundaries.",
              "Default deny between segments, then allow only named flows: office PCs to the ERP application front end on its port, never straight to the database. Inside the server segment add micro-segmentation so east-west traffic between servers is limited to what each needs. North-south traffic to and from the internet still goes through the perimeter firewall. Monitor the inter-segment firewalls, because blocked attempts are a good early signal."
            ),
          ],
        },
        {
          text: "The plant manager worries the change will break production.",
          ask: "How do you roll it out without stopping the plant?",
          parts: [
            part(
              "Safe rollout",
              "Discovers and documents existing OT flows first (passive monitoring), builds rules in monitor/log-only mode, cuts over in a maintenance window with a rollback plan, and involves plant engineering.",
              "First observe: record which OT systems actually talk to which IT systems, passively. Write the rules from that, run them in log-only mode to see what would have been blocked, fix the gaps, then enforce in a planned maintenance window with plant engineering present and a rollback plan ready."
            ),
          ],
        },
      ],
    },

    // ----- Domain 5: IAM (2)
    {
      slug: "cissp-authorization-mechanisms",
      objective:
        "Choose and implement authorization mechanisms: role-based, rule-based, mandatory, discretionary, attribute-based and risk-based access control, with policy decision and enforcement points",
      kind: "build",
      title: "Choose authorization mechanisms and place the decision point",
      brief:
        "Orchard Bay Hospital (fictional) wants nurses to open a patient's record only while assigned to that patient's ward, from a hospital-managed device, and wants extra checks when a login looks unusual.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each requirement to the mechanism that fits, then explain where the decision and the enforcement happen.",
          parts: [
            matchPart(
              "Mechanism",
              "Access by job (nurse, physician) -> RBAC; ward assignment plus managed device -> ABAC; step-up when a login looks unusual -> risk-based; clearance labels enforced by the system -> MAC. All four right is met; three is partly there.",
              "Granting the nurse functions to everyone in the Nurse job is role-based access control. 'Only while assigned to the patient's ward, from a managed device' depends on attributes of the user, resource and context -- attribute-based access control. Extra checks when a sign-in looks unusual is risk-based access control. Classification labels the system enforces regardless of owners is mandatory access control (not what the hospital described, but it is the remaining pair).",
              {
                leftHeading: "Requirement",
                rightHeading: "Mechanism",
                left: [
                  "Nurses get nurse functions because of their job",
                  "Only patients on the nurse's assigned ward, from a managed device",
                  "Step-up authentication when a sign-in looks unusual",
                  "Labels set centrally that owners cannot override",
                ],
                right: ["Role-based (RBAC)", "Attribute-based (ABAC)", "Risk-based", "Mandatory (MAC)", "Discretionary (DAC)"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Decision and enforcement points",
              "The policy decision point (PDP) evaluates the policy with the attributes and returns permit or deny; the policy enforcement point (PEP), in front of the records application or API gateway, intercepts the request and enforces the answer; both log decisions.",
              "A policy decision point evaluates the request against the policy, using the nurse's role, ward assignment, device status and sign-in risk, and returns permit or deny. A policy enforcement point sits in the request path -- in the records application or an API gateway in front of it -- asks the decision point, and allows or blocks. Keeping them apart lets the hospital change policy in one place; both should log every decision for audit."
            ),
          ],
        },
      ],
    },
    {
      slug: "cissp-access-review-service-accounts",
      objective:
        "Manage the identity and access provisioning life cycle: access reviews, provisioning and deprovisioning, role transitions, privilege escalation and service accounts",
      kind: "case",
      title: "Run a quarterly access review with a service account problem",
      brief:
        "You run the quarterly access review for the finance system at Larkspur Retail (fictional).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The export shows: (a) a buyer who moved to marketing six months ago still has the Approve Payments role; (b) 'svc-reporting', a service account with domain admin rights, password last changed four years ago, used by a nightly report; (c) two administrators who use sudo to run commands as root, with no record of what they ran.",
          ask: "Name the problem in each finding and what you change.",
          parts: [
            part(
              "(a) Role transition",
              "Privilege creep from a role transition: remove Approve Payments now, and fix the mover process so old roles are removed on transfer.",
              "Privilege creep: the mover kept a payment approval role from the old job, which also breaks separation of duties. Remove it now, and fix the transfer process so old access is taken away when a new role is granted."
            ),
            part(
              "(b) Service account",
              "Over-privileged, unrotated service account: reduce to the least privilege the report needs, rotate the credential (ideally managed/automatically rotated), name an owner, block interactive login, and monitor its use.",
              "A service account with domain admin rights for a report is far beyond least privilege, and a four-year-old password is a gift to an attacker. Give it only the read access the report needs, move it to a managed credential that rotates automatically, assign a named owner, deny interactive sign-in, and alert on any use outside the nightly job."
            ),
            part(
              "(c) Privilege escalation",
              "Unaudited privilege escalation: log sudo use (commands, user, time) to a central log the admins cannot alter, limit sudo to the commands needed, and review it.",
              "Privilege escalation without accountability: anyone with sudo can do anything as root and nobody can tell who did what. Restrict sudo to the commands each admin needs, send sudo logs to a central system the admins cannot edit, and review them, so escalation is both limited and attributable."
            ),
          ],
        },
        {
          text: "The finance director asks why these were not caught earlier.",
          ask: "What would you change about the review itself?",
          parts: [
            part(
              "Better reviews",
              "Reviews done by data/business owners (not IT alone) who attest; include service and privileged accounts; event-driven checks on role change in addition to quarterly; track findings to closure.",
              "Have the business owner of the finance system attest to each user's access, not only IT. Put service and privileged accounts in scope explicitly. Add event-driven checks -- a transfer or role change triggers a review the same week -- instead of relying on the quarter. And track each finding until it is closed."
            ),
          ],
        },
      ],
    },

    // ----- Domain 6: Security Assessment and Testing (2)
    {
      slug: "cissp-select-tests",
      objective:
        "Select security control tests: vulnerability assessment, penetration testing with red, blue and purple teams, log reviews, synthetic transactions, code review, misuse case testing, coverage analysis, interface testing, breach attack simulation and compliance checks",
      kind: "build",
      title: "Pick the right test for each question",
      brief:
        "Bluestone Insurance (fictional) has a list of questions from its risk committee. Each is best answered by a different kind of test.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each question to the test that answers it best.",
          parts: [
            matchPart(
              "Question to test",
              "Is the claims portal up and responding correctly every 5 minutes? -> synthetic transactions; could a real attacker get from the internet to policyholder data? -> penetration test; what happens if a user enters a negative claim amount? -> misuse case testing; do our detections fire against known techniques, continuously? -> breach attack simulation; which known flaws exist across 2,000 servers? -> vulnerability assessment. All five right is met; three or four is partly there.",
              "Scripted logins that exercise the portal on a schedule are synthetic transactions. Whether a skilled attacker could actually reach the data is a penetration test. Testing what the application does with input a user should never give is misuse case testing. Continuously replaying known attack techniques to check detections is breach attack simulation. Finding known flaws across a large estate is a vulnerability assessment (scanning), which finds but does not exploit.",
              {
                leftHeading: "Question",
                rightHeading: "Test",
                left: [
                  "Is the claims portal up and answering correctly every 5 minutes?",
                  "Could a real attacker get from the internet to policyholder data?",
                  "What happens if a user enters a negative claim amount?",
                  "Do our detections fire against known attack techniques, continuously?",
                  "Which known flaws exist across 2,000 servers?",
                ],
                right: ["Synthetic transactions", "Penetration test", "Misuse case testing", "Breach attack simulation", "Vulnerability assessment", "Compliance check"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
          ],
        },
      ],
    },
    {
      slug: "cissp-report-exception-disclosure",
      objective: "Analyze test output and write the report: remediation, exception handling and ethical disclosure",
      kind: "case",
      title: "Turn test findings into a report, an exception and a disclosure",
      brief:
        "An authorized penetration test of Coralline Payments (fictional) found three issues: (1) an internet-facing admin panel with a default password; (2) an outdated library in the mobile app with a known high-severity flaw, fix due in the next release in 8 weeks; (3) a flaw in a commercial product the company uses, which the vendor does not appear to know about.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The CIO wants one page.",
          ask: "Prioritize the findings and write the remediation line for the first.",
          parts: [
            orderPart(
              "Priority",
              "Default password on the internet-facing admin panel first (exposed, trivially exploited); then the library flaw (known, high severity, scheduled fix); then the vendor product flaw (needs coordinated disclosure, may need a workaround). In this order is met.",
              "The default password on an exposed admin panel is trivially exploitable today. The mobile library is high severity but has a scheduled fix and may need compensating measures in the meantime. The product flaw matters but is handled through the vendor; its own workaround may move it up if exposure is high.",
              ["Default password on the internet-facing admin panel", "Outdated mobile library with a known high-severity flaw", "Previously unknown flaw in a vendor's product", "Cosmetic finding: verbose server banner"]
            ),
            part(
              "Remediation line",
              "Change the default password immediately, restrict the panel to the admin network/VPN, enable MFA, and check logs for prior access.",
              "Admin panel: change the default credentials today, take the panel off the internet (admin network or VPN only), turn on multi-factor authentication, and review its access logs for any earlier use of the default password."
            ),
          ],
        },
        {
          text: "The product team asks to leave the library flaw for 8 weeks, and the testers ask what to do about the vendor flaw.",
          ask: "How do you handle the exception and the disclosure?",
          parts: [
            part(
              "Exception",
              "A formal, time-bound exception: documented risk, compensating controls (e.g., server-side checks, monitoring), approval by the risk owner, an expiry date matching the release, and tracking to closure.",
              "Grant a formal exception, not a quiet delay: record the risk and the business reason, the compensating controls in the meantime (server-side validation, extra monitoring for abuse), approval by the accountable risk owner, and an expiry tied to the release. Track it so it closes, rather than renewing silently."
            ),
            part(
              "Ethical disclosure",
              "Report the flaw privately to the vendor through its disclosure channel with the details it needs, agree a coordinated timeline before any public detail, and apply workarounds meanwhile; do not publish or exploit it beyond the authorized test.",
              "Report it privately to the vendor through its security contact or disclosure program, with enough detail to reproduce, and agree a coordinated disclosure timeline before anything is public. Apply any workaround internally in the meantime. The testers do not publish it or use it outside the authorized scope."
            ),
          ],
        },
      ],
    },

    // ----- Domain 7: Security Operations (2)
    {
      slug: "cissp-recovery-sites",
      objective: "Implement recovery strategies: backup storage, hot, warm and cold recovery sites, multiple processing sites, high availability and fault tolerance",
      kind: "case",
      title: "Match recovery sites to recovery time objectives",
      brief:
        "Granite State Utilities (fictional) has three systems with business impact analysis results: customer outage reporting (RTO 1 hour), billing (RTO 3 days), and the archive of old engineering drawings (RTO 3 weeks).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The CFO wants one recovery site for everything, the cheapest.",
          ask: "Match each system to a recovery strategy and explain why one site does not fit all.",
          parts: [
            matchPart(
              "Strategy per system",
              "Outage reporting (1 hour) -> hot site or active-active processing; billing (3 days) -> warm site; drawings archive (3 weeks) -> cold site plus off-site backups. All three right is met.",
              "A one-hour RTO needs a hot site (equipment running, data replicated) or active-active processing at two sites. A three-day RTO fits a warm site: equipment and connectivity in place, data restored from backup when needed. A three-week RTO can use a cold site -- space, power and cooling -- with equipment procured and data restored from off-site backups.",
              {
                leftHeading: "System",
                rightHeading: "Strategy",
                left: ["Outage reporting (RTO 1 hour)", "Billing (RTO 3 days)", "Engineering drawings archive (RTO 3 weeks)"],
                right: ["Hot site or active-active processing", "Warm site", "Cold site with off-site backups", "Mobile site"],
                pairs: [0, 1, 2],
              }
            ),
            part(
              "Why not one site",
              "Cheapest (cold) misses the 1-hour RTO; hot for everything overspends on systems that can wait; the cost should follow each system's BIA-derived RTO.",
              "The cheapest option, a cold site, cannot bring outage reporting back in an hour. Putting everything in a hot site meets every RTO but pays hot-site prices for an archive that can wait three weeks. Matching the strategy to each system's RTO from the business impact analysis spends where downtime actually hurts."
            ),
          ],
        },
        {
          text: "For the outage reporting system the architect proposes RAID and a second power supply in one server, and calls it 'high availability'.",
          ask: "What does that give, and what is missing?",
          parts: [
            part(
              "Fault tolerance vs HA",
              "RAID and redundant power give component fault tolerance in one server; they do not survive the loss of the server or the site, so high availability needs redundant servers (clustering/failover) and the hot site for site loss.",
              "RAID and dual power supplies give fault tolerance for a disk or power supply inside one server. They do nothing if the server's motherboard dies or the building floods. High availability needs a second server with failover (a cluster or load-balanced pair), and site loss needs the hot or active-active site."
            ),
          ],
        },
      ],
    },
    {
      slug: "cissp-dr-test-types",
      objective: "Implement disaster recovery processes and test the plan with read-throughs, walkthroughs, simulations, parallel tests and full interruption tests",
      kind: "build",
      title: "Order disaster recovery tests by disruption",
      brief:
        "Kestrel Airlines (fictional) has a new disaster recovery plan for its reservation system and wants a test program that builds confidence without risking flights.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Order the test types from least to most disruptive, then say which one you would not run on the reservation system yet and why.",
          parts: [
            orderPart(
              "Least to most disruptive",
              "Read-through (checklist); walkthrough (tabletop); simulation; parallel test; full interruption test. In this order is met; one swap is partly there.",
              "A read-through has owners review the plan on their own. A walkthrough (tabletop) gathers the team to step through a scenario together. A simulation acts out a scenario with more realism but without failing over. A parallel test brings up the recovery site and processes real work there while production keeps running. A full interruption test shuts production down and runs on the recovery site -- the only true test, and the riskiest.",
              ["Read-through (checklist review)", "Walkthrough (tabletop)", "Simulation", "Parallel test", "Full interruption test"]
            ),
            part(
              "Not yet",
              "Holds off the full interruption test until the lower tests pass and leadership accepts the risk; a failed full interruption would itself cause the outage; a parallel test first proves the recovery site can process real transactions.",
              "Not the full interruption test, not yet. If the recovery site fails during it, the test itself grounds the reservation system. Prove the plan step by step -- read-through, walkthrough, simulation -- then a parallel test that shows the recovery site can process real bookings while production runs. Only after that, with leadership accepting the risk and a rollback ready, consider a full interruption."
            ),
          ],
        },
      ],
    },

    // ----- Domain 8: Software Development Security (1)
    {
      slug: "cissp-appsec-testing-tools",
      objective:
        "Apply security controls in development ecosystems: languages, libraries, tool sets, IDEs, runtimes, CI/CD, configuration management, code repositories, and SAST, DAST, software composition analysis and IAST",
      kind: "build",
      title: "Place application security tests in a CI/CD pipeline",
      brief:
        "The product team at Mariner Health Apps (fictional) has a pipeline: commit, build, deploy to test, then to production. They want the four application security testing types each in the right place.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each testing type to what it examines and where it runs, then name one control for the pipeline itself.",
          parts: [
            matchPart(
              "Testing type",
              "SAST -> source code without running it, at commit or build; SCA -> third-party libraries for known vulnerabilities and licenses, at build; DAST -> the running app from the outside, in the test environment; IAST -> agents inside the running app during tests. All four right is met.",
              "Static application security testing reads the source code without running it, so it fits at commit or build. Software composition analysis inventories third-party libraries and flags known vulnerabilities and license problems, at build. Dynamic testing attacks the running application from outside, so it needs the deployed test environment. Interactive testing instruments the running application from inside while tests exercise it, combining code-level detail with runtime behavior.",
              {
                leftHeading: "Test",
                rightHeading: "What it examines, and where",
                left: ["SAST", "Software composition analysis (SCA)", "DAST", "IAST"],
                right: [
                  "Source code, not running; at commit or build",
                  "Third-party libraries and licenses; at build",
                  "The running app from outside; in test",
                  "Agents inside the running app during tests",
                  "Production traffic only; after release",
                ],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Protecting the pipeline",
              "Names a pipeline control: protected branches with required review, least-privilege pipeline credentials kept in a secrets manager, signed builds/artifacts, or restricting who can change pipeline definitions.",
              "Any of: protect the main branch so changes need review and passing checks; give the pipeline least-privilege credentials from a secrets manager rather than hard-coded keys; sign build artifacts and verify signatures before deploy; restrict who can edit the pipeline definitions, since whoever controls the pipeline controls production."
            ),
          ],
        },
      ],
    },
  ],
};
