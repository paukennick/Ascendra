import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-172: CompTIA Tech+ (FC0-U71).
//
// Aligned to comptia.org's Tech+ page (re-read 2026-11-09: FC0-U71 and the
// renewable FC0-U71-CE, launched July 16, 2024, no retirement date listed;
// domains Tech concepts and terminology 13% / Infrastructure 24% /
// Applications and software 18% / Software development concepts 13% / Data
// and database fundamentals 13% / Security 19%; maximum 70 questions, 60
// minutes, 650 on 100-900) and CompTIA's FC0-U71 exam objectives document
// (version 1.2, same weights). CompTIA's partner page lists different
// weights (14/22/18/14/14/18); the candidate-facing page and the objectives
// PDF agree with each other and with the track, so they are used.
// Density ("hybrid"): 1 / 1 / 1 / 2 / 1 / 2 = 8 labs (6 build, 2 case).
// A beginner exam: labs apply one idea at a time with no trick facts. The
// units and conversions used (1 byte = 8 bits, decimal KB/MB/GB) are the
// exam's own conventions.

const CHECKED = "2026-11-09";

export const TECHPLUS_LABS: SeedLabSet = {
  trackCode: "TECHPLUS",
  sources: [
    source("https://www.comptia.org/en/certifications/tech/", "exam_outline", CHECKED),
    source("https://lecbyo.files.cmp.optimizely.com/download/61a4296ef29311eea8adea242fd2debe", "exam_outline", CHECKED),
  ],
  labs: [
    {
      slug: "techplus-troubleshooting-no-internet",
      objective: "Troubleshooting methodology: identifying problems, testing theories, implementing solutions, and documenting findings",
      kind: "case",
      title: "A laptop that can't get online",
      brief:
        "You help at the front desk of Willowbank Library (fictional). A volunteer says: 'My laptop won't get on the internet.' Other people in the room are browsing normally on the library Wi-Fi.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The volunteer is waiting at the desk with the laptop.",
          ask: "What do you do first, following the troubleshooting methodology?",
          parts: [
            part(
              "Identify the problem",
              "Gathers information before changing anything: asks questions (when it started, what changed, any error message), checks whether it affects only this device, and duplicates the problem.",
              "Ask when it stopped working, whether anything changed (updates, new settings), and what message appears. Note that others are online, so it's likely this laptop only. Try opening a web page myself to see the problem."
            ),
            part(
              "Theory",
              "States a probable cause based on the facts, starting with the simple and obvious (for example Wi-Fi turned off / airplane mode, connected to the wrong network).",
              "Theory: the laptop isn't connected to the library Wi-Fi -- for example airplane mode is on or it joined a different network."
            ),
          ],
        },
        {
          text: "The Wi-Fi icon shows airplane mode is on. You turn it off and connect to the library network, and web pages load.",
          ask: "What do you do to finish the job?",
          parts: [
            part(
              "Verify and prevent",
              "Verifies full functionality with the user (opens the sites they need) and, if relevant, explains how to avoid a repeat (the airplane mode key or shortcut).",
              "Ask the volunteer to open the sites they need to confirm it works, and show them the airplane mode key so they can switch it back themselves."
            ),
            part(
              "Document",
              "Documents the findings, actions and outcome (for example in a log or ticket) so others can learn from it.",
              "Write it in the help-desk log: symptom (no internet on one laptop), cause (airplane mode on), fix (turned off, reconnected), result (working, user shown the key)."
            ),
          ],
        },
      ],
    },
    {
      slug: "techplus-printer-setup",
      objective: "Peripheral setup: printers, scanners, monitors, and driver installation",
      kind: "build",
      title: "Set up a shared office printer",
      brief:
        "Moorfield Dental (fictional) bought a printer-scanner with USB, Ethernet and Wi-Fi. Four computers in the office need to print to it, and the receptionist's computer needs to scan. The printer came with a setup disc, but the computers have no disc drive.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the setup steps.",
          parts: [
            part(
              "Connection",
              "Chooses a network connection (Ethernet or Wi-Fi) so all four computers can share it, rather than USB to one computer, and gives the printer a fixed or reserved IP address.",
              "Connect the printer to the office network by Ethernet (more reliable than Wi-Fi) and give it a reserved IP address in the router so computers always find it."
            ),
            part(
              "Drivers",
              "Gets the current driver/software from the manufacturer's website (or the operating system's built-in driver) instead of the disc, and installs it on each computer, adding the printer by network/IP.",
              "Download the latest driver package from the manufacturer's support site (no disc drive needed, and it's newer than the disc), install it on each of the four computers, and add the printer by its network address."
            ),
            part(
              "Test and scanning",
              "Prints a test page from each computer and sets up scanning on the receptionist's computer (scanner driver/app, scan to a folder or email), testing a scan.",
              "Print a test page from all four computers. On the receptionist's computer install the scanning app from the same package, set scans to save to a 'Scans' folder, and test one scan."
            ),
          ],
        },
      ],
    },
    {
      slug: "techplus-browser-shared-computer",
      objective: "Web browser features: private browsing, add-ons, password management, and cache clearing",
      kind: "build",
      title: "Make a shared browser safe and working again",
      brief:
        "At Elmstead Community Centre (fictional), one computer is shared by everyone. Problems: users log in to webmail and the next person finds them still logged in; the browser has three toolbars nobody remembers installing and pop-ups appear; and the centre's own booking website shows last month's timetable even though the site was updated.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write what you change in the browser to fix each problem.",
          parts: [
            part(
              "Logged-in users",
              "Recommends private/incognito browsing for users (it doesn't keep history, cookies or sign-ins after the window closes), turns off the browser's offer to save passwords on the shared machine, and notes private mode does not hide activity from the network or the websites.",
              "Set the shortcut to open a private (incognito) window, which forgets cookies and sign-ins when closed; disable 'offer to save passwords'. Remind users private mode doesn't hide what they do from the network or websites -- they should still log out."
            ),
            part(
              "Unwanted add-ons",
              "Removes or disables the unknown extensions/add-ons and toolbars, resets settings if needed, and limits who can install add-ons.",
              "Open the extensions page, remove the three unknown toolbars, reset the browser's settings to clear changed search/home pages, and only allow the staff account to install add-ons."
            ),
            part(
              "Old timetable",
              "Clears the cache (cached images and files) or forces a reload so the browser fetches the updated page.",
              "Clear the browser's cached images and files (or press the hard-reload shortcut) so it downloads the current timetable instead of the stored copy."
            ),
          ],
        },
      ],
    },
    {
      slug: "techplus-language-categories",
      objective: "Programming languages: interpreted, compiled, scripting, markup, and assembly",
      kind: "build",
      title: "Sort five pieces of code by language category",
      brief:
        "A new IT apprentice at Copperfield Ltd (fictional) finds five files: (1) index.html describing a web page's headings and links; (2) backup.ps1, a PowerShell file run by the scheduler each night to copy files; (3) payroll.c, which must be turned into an .exe before it runs; (4) report.py, run line by line by the Python program; (5) boot.asm with lines like 'MOV AX, 1'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the category of each file and explain the difference between compiled and interpreted.",
          parts: [
            part(
              "Categories",
              "Correctly assigns: 1 markup, 2 scripting, 3 compiled, 4 interpreted (Python, also commonly called a scripting language), 5 assembly.",
              "1 index.html -- markup (describes structure, isn't a program). 2 backup.ps1 -- scripting (automates tasks). 3 payroll.c -- compiled language (C). 4 report.py -- interpreted (Python). 5 boot.asm -- assembly (close to machine code, one instruction per line)."
            ),
            part(
              "Compiled vs interpreted",
              "Explains that compiled code is translated into machine code ahead of time into an executable that runs without the compiler, while interpreted code is translated and run by an interpreter each time it runs.",
              "Compiled: a compiler translates all the source into machine code once, producing a program (.exe) that runs on its own -- usually faster. Interpreted: an interpreter reads and runs the code each time, so the interpreter must be installed, but changes run without a build step."
            ),
          ],
        },
      ],
    },
    {
      slug: "techplus-programming-concepts",
      objective: "Programming concepts: variables, constants, arrays, functions, and objects",
      kind: "build",
      title: "Read a short program and name its parts",
      brief:
        "Cafe owner Rosa (fictional) has this pseudocode for her till:\nTAX_RATE = 0.08 (never changes)\nprices = [3.50, 2.00, 4.25]\nfunction totalWithTax(list): sum = 0; for each p in list: sum = sum + p; return sum * (1 + TAX_RATE)\norder = totalWithTax(prices)\nShe also has a 'Customer' item with a name, a loyalty-points value and an action addPoints().",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Identify each programming concept in the code and work out the value of order.",
          parts: [
            part(
              "Constant, variable, array",
              "TAX_RATE is a constant (value fixed), sum and order are variables (values change/are assigned), prices is an array (an ordered list of values accessed by position).",
              "TAX_RATE -- constant. sum and order -- variables. prices -- an array of three numbers."
            ),
            part(
              "Function and object",
              "totalWithTax is a function (named, reusable block that takes a parameter and returns a value); Customer is an object (properties name and points, plus a method addPoints).",
              "totalWithTax -- a function: takes list as input, returns the total. Customer -- an object with properties (name, loyalty points) and a method (addPoints)."
            ),
            part(
              "Result",
              "Calculates 3.50 + 2.00 + 4.25 = 9.75, then 9.75 x 1.08 = 10.53.",
              "Sum = 9.75; 9.75 x 1.08 = 10.53, so order = 10.53."
            ),
          ],
        },
      ],
    },
    {
      slug: "techplus-database-design",
      objective: "Database concepts: relational vs. non-relational, tables, rows, fields, and primary/foreign keys",
      kind: "build",
      title: "Turn a club spreadsheet into two tables",
      brief:
        "Riverside Running Club (fictional) tracks races in one spreadsheet. Each row repeats the member's name, email and phone, then the race name, date and finish time. When a member changes email, someone must edit dozens of rows, and the rows often disagree.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design a simple relational database for the club.",
          parts: [
            part(
              "Tables and fields",
              "Splits into at least two tables -- Members (one row per member: name, email, phone) and Results (one row per race result: race name, date, finish time) -- so member details are stored once.",
              "Members: MemberID, Name, Email, Phone. Results: ResultID, MemberID, RaceName, RaceDate, FinishTime. Each member's details exist in one row only."
            ),
            part(
              "Keys",
              "Gives each table a primary key (unique ID) and puts the member's primary key in Results as a foreign key linking each result to one member.",
              "Primary keys: MemberID in Members, ResultID in Results. Results.MemberID is a foreign key pointing to Members.MemberID."
            ),
            part(
              "Why it helps",
              "Explains that updating an email now changes one row and results stay consistent, and briefly contrasts with a non-relational (document) store that would suit flexible, unstructured data.",
              "Changing an email edits one row in Members, so all results stay correct. A non-relational store (for example documents) fits data without a fixed structure; this club's data has a clear structure, so relational fits."
            ),
          ],
        },
      ],
    },
    {
      slug: "techplus-cia-auth-case",
      objective: "Security concepts: confidentiality, integrity, availability, authentication, and authorization",
      kind: "case",
      title: "Three incidents at a small shop",
      brief:
        "Hartley Hardware (fictional) has a small online shop and an office network.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "This week: (1) a customer list was emailed to the wrong person; (2) someone changed prices on the website without permission; (3) the website was down for six hours after a power cut.",
          ask: "Which part of the CIA triad did each incident affect?",
          parts: [
            part(
              "CIA mapping",
              "1 confidentiality (data seen by someone not allowed), 2 integrity (data changed without authorisation), 3 availability (system not usable when needed).",
              "1 -- confidentiality. 2 -- integrity. 3 -- availability."
            ),
          ],
        },
        {
          text: "Investigation shows the price change came from a sales assistant's account. All staff share one admin login to the website, and every account can edit prices.",
          ask: "What do you change, using authentication and authorization?",
          parts: [
            part(
              "Authentication",
              "Gives each person their own account (no shared login) with strong passwords and multifactor authentication, so the system can confirm who is logging in.",
              "Create a separate login for each person, require strong passwords and multifactor authentication -- authentication proves who you are, and personal accounts show who made a change."
            ),
            part(
              "Authorization",
              "Applies least privilege: only the manager role can change prices; sales assistants get view/order permissions only.",
              "Authorization decides what each person can do: give only the manager the price-editing permission and sales assistants view and order-entry only."
            ),
          ],
        },
      ],
    },
    {
      slug: "techplus-password-policy",
      objective: "Password practices: length, complexity, privacy, reuse, and password managers",
      kind: "build",
      title: "Write password guidance for a charity",
      brief:
        "Greenacre Animal Rescue (fictional) has 15 volunteers. A review found passwords like 'Rescue2024', the same password used for email and the donations site, and a sticky note with the admin password on the office monitor.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write short password guidance for the volunteers.",
          parts: [
            part(
              "Length and complexity",
              "Recommends long passwords or passphrases (length matters most) that avoid names, dates and words linked to the organisation, with complexity where systems require it.",
              "Use a passphrase of at least 15 characters, such as four random unrelated words; avoid the charity's name, pet names, years or 'Password1'-style patterns."
            ),
            part(
              "No reuse, use a manager",
              "Says each account must have its own password and recommends a password manager to generate and store them, protected by one strong master password and MFA.",
              "Never reuse a password across sites -- one breach would unlock the others. Use the charity's password manager to generate and store a unique password per site; protect it with a strong master passphrase and MFA."
            ),
            part(
              "Privacy",
              "Never write passwords on notes or share them; shared accounts move into the password manager's shared vault; passwords are changed if exposed (the admin password on the sticky note must be changed now).",
              "No sticky notes or sharing by message. Put shared logins in a shared vault in the manager. Change the admin password today because it was on display, and change any password you think was seen."
            ),
          ],
        },
      ],
    },
  ],
};
