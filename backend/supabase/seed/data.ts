import type { SourceRef } from "./sources";

// Seed data ported from mscs-coach.html (WEEKS/COURSES) and security-plus-coach.html
// (DOMAINS), trimmed of narrative fields not needed by the schema (deliverables,
// resources links, STEP-specific notes) but keeping every real week/domain title and
// every real objective so the seeded dataset is genuinely usable, not a placeholder.

export interface SeedUnit {
  title: string;
  rangeLabel?: string;
  weight?: number;
  gate?: string;
  objectives: string[];
  labs?: (string | null)[]; // parallel to objectives, Security+ only
  // REQ-102 (migration 033): when an exam version changes, the outgoing
  // version's units are not deleted or rewritten in place -- rewriting an
  // objective's title would silently re-point every learner's mastery and
  // attempts at different content, and deleting would cascade their mastery
  // away. Instead the unit stays at its array position (its sort_order, and
  // so its row identity) with retiredAt set; the seed stamps retired_at on
  // the unit and every objective in it, and the app stops listing it once
  // that moment has passed. Successor units are appended after it.
  retiredAt?: string; // ISO timestamp
  // REQ-195: retire single objectives inside a unit that stays taught.
  // Parallel to `objectives`: a timestamp retires that objective (it keeps
  // its sort_order, row id and learners' history, as a retired unit's
  // objectives do); null or missing leaves it active. A retired objective
  // keeps its slot in `objectives` -- never remove or reorder it, since
  // objectives are matched to their rows by position.
  objectiveRetiredAt?: (string | null)[];
  // REQ-195: the open textbooks or other references this unit is taught
  // from, dated (REQ-142). Seed-only: the generation prompt's current-facts
  // block names them for the unit (lib/current-facts.ts) and the currency
  // report dates them.
  sources?: UnitSource[];
}

export interface UnitSource extends SourceRef {
  title: string;
  // REQ-220 (FAIL-1141): the values this unit's lessons and checks must use,
  // as read at the source on checkedAt (a dose, a sequence, a threshold).
  // The lesson writer and the fact-checker are given them
  // (lib/current-facts.ts), so a lesson cannot teach an older value than the
  // course's own lab.
  keyValues?: string[];
  // REQ-235: the official outline statements this unit is built on, as
  // printed at this source on checkedAt (an exam guide's task statements, an
  // exam objective's numbered heading, a regulation's curriculum line). The
  // lesson writer and the fact-checker are given the same statements
  // (lib/current-facts.ts), so both work from the outline's own wording, not
  // from our paraphrased objective titles. Headings only where the outline is
  // copyrighted (the repo's paraphrase rule, e.g. tracks/nursing.ts header);
  // full text where it is public domain (42 CFR).
  outline?: string[];
}

// Vendor exam a certification track is aligned to. Mirrors the credential_*
// tables added by migration 007 so a seeded certification track can say which
// exam revision it teaches, where the official objectives live, and when a
// human last checked them against the vendor -- the tables enforce that any
// exam not marked 'draft' carries both an objectives URL and a verified date.
export interface SeedCredential {
  providerSlug: string;
  providerName: string;
  providerUrl?: string;
  subcategorySlug: string; // education_subcategories.slug
  credentialSlug: string;
  credentialName: string;
  credentialType: string; // e.g. "certification"
  credentialUrl?: string;
  // What kind of authority governs this qualification (migration 014).
  // Defaults to a vendor exam, which is what every AWS/CompTIA track is.
  // REQ-040: vendor_exam_unpublished_code is a real, proctored vendor exam
  // (same shape as vendor_exam) whose vendor never publishes an exam code --
  // Google Cloud's certifications, unlike AWS/Azure's. examCode stays unset
  // for these; the DB's identity check accepts basis alone as sufficient.
  basis?:
    | "vendor_exam"
    | "accreditation_standard"
    | "regulatory_licensure"
    | "vendor_exam_unpublished_code";
  // Required for a vendor exam, absent for a degree or a state licence --
  // those are identified by standardName instead.
  examCode?: string;
  examRevision?: string;
  // The governing document when there is no exam blueprint: the AACN
  // Essentials, a federal regulation, a state nurse practice act.
  standardName?: string;
  standardRevision?: string;
  objectivesRevision?: string;
  // REQ-142: why no outline version is recorded, when the publisher prints
  // none (Google's unversioned exam guides, ABPTS outlines that name no DSP
  // edition). Seed-only; npm run currency:report lists these with the reason
  // instead of as missing a version.
  versionNote?: string;
  status: "draft" | "active" | "transitioning" | "beta" | "retired" | "archived";
  effectiveDate?: string; // ISO date
  retirementDate?: string; // ISO date
  officialObjectivesUrl: string;
  lastVendorVerifiedAt: string; // ISO timestamp
  recommendedExperience?: string;
  durationMinutes?: number;
  questionFormat?: string;
  passingScorePolicy?: string;
  // REQ-102: the exam version this one replaces on the same credential.
  // The seed marks that older credential_exams row superseded_by this one
  // and records its last test date, rather than leaving it looking current.
  supersedes?: { examCode: string; lastExamDate: string };
  // REQ-102: domain weights must total 100. A few vendors print weights
  // that do not (AACN's "may not equal 100 due to rounding", PMI's CSPP at
  // 101, ABPTS's CCS rows at 85). Those are kept exactly as printed, and
  // this field says why -- the blueprint test accepts a non-100 total only
  // when it is explained here.
  publishedWeightsNote?: string;
  // REQ-220 (FAIL-1136): what the track's unit weights are. "exam_blueprint"
  // (the default) means the vendor publishes them and the exam is built to
  // them. "study_emphasis" means the weights are our own judgment (no body
  // publishes a blueprint, e.g. 42 CFR 483.152 sets nurse-aide hours without
  // apportioning them): the seed then leaves exam_domains.weight_percent
  // null, and the app never presents the weights as "% of the exam"
  // (lib/readiness.ts, lib/coach-context.ts).
  domainWeights?: "exam_blueprint" | "study_emphasis";
}

export interface CurriculumSource {
  kind: "language_reference" | "degree_plan" | "self_defined";
  name: string;
  version: string;
  url: string;
  checkedAt: string; // YYYY-MM-DD
  recheckBy?: string; // YYYY-MM-DD; default checkedAt + 12 months
}

export interface SeedTrack {
  code: string;
  title: string;
  description: string;
  trackType: "graduate" | "certification";
  units: SeedUnit[];
  // Taxonomy alignment (migration 007). Optional so the original nine tracks
  // keep seeding unchanged; certification tracks added from here on set it.
  subcategorySlug?: string;
  freshnessModel?:
    | "certification_aligned"
    | "technology_aligned"
    | "academic_foundational";
  credential?: SeedCredential;
  sourceUrl?: string;
  sourceVerifiedAt?: string; // ISO timestamp
  // The seed writes both dates with coalesce (seed-lib.ts): a value can be
  // set but never cleared. To end a review, set a later contentReviewDueAt;
  // deleting the line leaves the old date in the database and the course
  // shows "Review due" for good (FAIL-1540, DP-300).
  contentReviewDueAt?: string; // ISO timestamp
  // REQ-142: what a course with no exam is built on, so the currency report
  // dates it instead of listing it as a course with no outline. Seed-only (no
  // column): the app's Verified / Review due badges still read sourceUrl.
  //   language_reference  a language's official documentation or standard
  //   degree_plan         a school's published degree plan
  //   self_defined        a syllabus the course defines itself
  curriculum?: CurriculumSource;

  // Disclaimer gate (migration 012). Set on tracks where acting on wrong
  // content has real-world consequences -- the nursing tracks -- so the
  // learner has to accept a course-specific disclaimer before any lesson is
  // taught. disclaimerKey names wording that lives in the app; bump
  // disclaimerVersion when that wording materially changes and everyone is
  // asked again rather than being treated as having agreed to new text.
  requiresAcknowledgement?: boolean;
  // REQ-252 (migration 078): switch on the level-aware lesson flow (the
  // one-tap hunch and full worked example for New learners, "Skip guided"
  // offered to Experienced ones). Python and JavaScript (phase 1), then DPT, PTPREREQ,
  // CCRNADULT and AWSSAA (REQ-257), then AWSMLA, SECPLUS and CNA (REQ-258), as
  // their Key terms were written. The
  // seed sets subject_tracks.level_flow and never clears it.
  levelFlow?: boolean;
  disclaimerKey?: string;
  disclaimerVersion?: number;

  // REQ-194 (migration 065): taken out of the catalog without deleting it.
  // Once passed, the course is not listed or newly startable; learners who
  // already studied it keep it. Units, objectives and labs are still seeded,
  // so removing this line and re-seeding brings the course back.
  hiddenAt?: string; // ISO timestamp
  hiddenReason?: string; // seed-only, why (with the guideline URL)
}

// REQ-245: the MSCS bridge checked against current sources on 2026-11-11.
// It has no exam, so its frame is the ACM/IEEE-CS/AAAI curriculum guideline
// CS2023 (Computer Science Curricula 2023, January 2024; the full report
// read as HTML from csed.acm.org), whose knowledge units name every topic in
// these units except two that the standard texts below carry: the
// comparison-sort lower bound (MIT 6.006 Lecture 5) and multiversion
// concurrency control (Database System Concepts 7e, 18.7). Each unit's
// sources and key values are in MSCS_UNIT_SOURCES after the track; every one
// was read on the date it carries. One objective was reworded (FAIL-1561);
// the units, their order and the other objectives are unchanged.
const MSCS_CHECKED = "2026-11-11";
const MSCS_VERIFIED_AT = "2026-11-11T00:00:00Z";

export const MSCS_TRACK: SeedTrack = {
  code: "MSCS",
  title: "MSCS Foundations Coach",
  description:
    "15-week graduate-CS bridge covering algorithms, data structures, discrete math, OS, computer architecture, database theory, ML math, cybersecurity, HCI/UX, and big data.",
  trackType: "graduate",
  subcategorySlug: "software-engineering",
  freshnessModel: "academic_foundational",
  // REQ-245: verified 2026-11-11 against the dated unit sources below
  // (MSCS_UNIT_SOURCES); reviewed yearly like the other academic courses.
  sourceVerifiedAt: MSCS_VERIFIED_AT,
  contentReviewDueAt: "2027-11-11T00:00:00Z",
  // REQ-142: no exam -- a 15-week bridge the course defines itself (its units
  // below are the syllabus). Recorded so the currency report dates it rather
  // than listing it as a course with no outline.
  curriculum: {
    kind: "self_defined",
    name: "MSCS Foundations Coach 15-week bridge syllabus",
    // REQ-245 (Nick, 2026-11-11): for any learner, so weeks are numbered,
    // not dated (the units were labeled for one Sept 15-Dec 28, 2026 run).
    version: "15-week plan",
    url: "https://github.com/paukennick/Ascendra/blob/master/backend/supabase/seed/data.ts",
    checkedAt: MSCS_CHECKED,
  },
  units: [
    {
      title: "Complexity & computational thinking",
      rangeLabel: "Week 1",
      gate: "Given unfamiliar short Python functions, estimate time and auxiliary-space complexity and justify each answer.",
      objectives: [
        "Define an algorithm and input size",
        "Distinguish correctness from efficiency",
        "Use Big-O, Big-Omega, and Big-Theta",
        "Compare constant, logarithmic, linear, linearithmic, quadratic, exponential, factorial growth",
        "Analyze simple loop and recursive patterns",
        "Distinguish time and space complexity",
      ],
    },
    {
      title: "Core data structures",
      rangeLabel: "Week 2",
      gate: "Choose a data structure for a new problem, defend the choice, and explain the cost of rejected alternatives.",
      objectives: [
        "Explain arrays, linked lists, stacks, queues, deques, hash tables, sets, trees, heaps",
        "Compare access/search/insert/delete/space cost",
        "Explain why hash-table ops are average-case O(1), not guaranteed",
        "Explain tree balance and heap invariants",
      ],
    },
    {
      title: "Discrete mathematics I",
      rangeLabel: "Week 3",
      gate: "Read symbolic notation, translate it into plain language, and construct a basic valid argument.",
      objectives: [
        "Propositions and predicates",
        "Truth tables and logical equivalence",
        "Sets and set operations",
        "Functions and relations",
        "Direct proof",
        "Proof by contradiction",
        "Mathematical induction",
      ],
    },
    {
      title: "Sorting, recursion, and recurrences",
      rangeLabel: "Week 4",
      gate: "Choose an appropriate sorting approach for a stated constraint and explain average/worst-case behavior.",
      objectives: [
        "Trace recursion and identify base cases",
        "Explain call-stack growth",
        "Compare insertion/merge/quick/heap sort",
        "Understand stability and in-place behavior",
        "Interpret T(n)=2T(n/2)+O(n)",
        "Understand the Omega(n log n) comparison-sort lower bound",
      ],
    },
    {
      title: "Graph foundations",
      rangeLabel: "Week 5",
      gate: "Select BFS or DFS for a new task and explain the result and complexity.",
      objectives: [
        "Vertices and edges",
        "Directed/undirected, weighted/unweighted graphs",
        "Adjacency lists and matrices",
        "BFS",
        "DFS",
        "Traversal complexity",
      ],
    },
    {
      title: "Graph algorithms & design strategies",
      rangeLabel: "Week 6",
      gate: "Recognize whether an unfamiliar problem suggests traversal, greedy choice, divide and conquer, or dynamic programming, and defend the classification.",
      objectives: [
        "Shortest paths",
        "Dijkstra and its nonnegative-weight requirement",
        "Topological sorting",
        "Cycle detection",
        "Divide and conquer",
        "Greedy reasoning",
        "Memoization and dynamic programming",
      ],
    },
    {
      title: "Computer architecture",
      rangeLabel: "Week 7",
      gate: "Explain how logic gates compose into arithmetic and stateful memory, then trace the conceptual path from a high-level instruction to machine execution and identify where the OS participates.",
      objectives: [
        "Binary and hex representation",
        "Boolean logic: AND, OR, NOT, XOR",
        "Boolean arithmetic",
        "Combinational vs sequential logic",
        "Registers and memory",
        "How state differs from pure combinational output",
        "Instruction-set architecture",
        "Machine language",
        "CPU, ALU, registers, program counter, RAM",
        "Fetch-decode-execute cycle",
        "Memory hierarchy and cache",
        "Interrupts and I/O (conceptual)",
        "x86 vs ARM as architecture families",
        "Pipelining and multicore basics",
      ],
    },
    {
      title: "Operating systems",
      rangeLabel: "Week 8",
      gate: "Explain a process, system call, and context switch accurately, then diagnose a simple race condition or deadlock scenario and explain how synchronization changes correctness and performance.",
      objectives: [
        "Programs vs processes",
        "Process state",
        "System calls",
        "User mode vs kernel mode",
        "Context switching",
        "CPU scheduling",
        "Concurrency vs parallelism",
        "Container vs virtual machine",
        "Address spaces",
        "Virtual memory",
        "Paging",
        "Threads",
        "Race conditions",
        "Locks and mutexes",
        "Condition variables",
        "Semaphores",
        "Deadlocks and the four necessary conditions",
        "Basic file-system/persistence concepts",
      ],
    },
    {
      title: "Databases and data systems",
      rangeLabel: "Week 9",
      gate: "Select an appropriate data model for a new use case and explain transactional, indexing, consistency, and operational tradeoffs.",
      objectives: [
        "Relational model",
        "Primary/foreign keys",
        "Normalization through 3NF",
        "Indexes and B-trees",
        "Transactions and ACID",
        "Isolation levels",
        "Locking and MVCC",
        "Query planning (conceptual)",
        "Replication and partitioning",
        "Consistency/latency tradeoffs",
        "Relational vs graph vs search-oriented systems",
      ],
    },
    {
      title: "Math & foundations for machine learning",
      rangeLabel: "Week 10",
      gate: "Explain the mathematical role of vectors, similarity, probability, and gradients in plain language and apply them to small examples.",
      objectives: [
        "Linear algebra: scalars/vectors/matrices, dot product, matrix multiplication, transpose, magnitude/distance, cosine similarity",
        "Probability & statistics: distributions, conditional probability, Bayes' theorem, expectation, variance, covariance/correlation",
        "Calculus: derivative, partial derivative, gradient, learning rate, conceptual gradient descent",
        "ML concepts: supervised/unsupervised, classification/regression/clustering, features/labels, train/val/test, loss, overfitting/underfitting, bias/variance, embeddings, vector similarity, k-NN",
      ],
    },
    {
      title: "Cybersecurity I: cryptography & secure protocols",
      rangeLabel: "Week 11",
      gate: "Explain what a certificate chain actually proves, why hashing alone doesn't secure a password, and defend the choice of symmetric vs asymmetric encryption for a stated scenario.",
      objectives: [
        // REQ-245 (FAIL-1561): was "Symmetric vs asymmetric encryption, and
        // why both exist together (e.g. TLS)". TLS 1.3 has no public-key
        // encryption of a session key (static RSA key transport was removed);
        // it uses public-key cryptography for key agreement and signatures.
        "Symmetric vs asymmetric cryptography, and how TLS 1.3 uses both: public-key key agreement and signatures, symmetric encryption for the data",
        "Hashing vs encryption -- what each guarantees and what neither does",
        "Digital signatures and what they actually prove",
        "Key exchange (Diffie-Hellman) at a conceptual level",
        "What a TLS handshake establishes, step by step",
        "PKI: certificates, certificate authorities, chains of trust",
      ],
    },
    {
      title: "Cybersecurity II: network defense & threat modeling",
      rangeLabel: "Week 12",
      gate: "Threat-model an unfamiliar system and defend which controls matter most, using the vocabulary a security course expects.",
      objectives: [
        "TCP/IP layers and where common attacks target each one",
        "Firewalls, IDS/IPS -- what each actually watches for",
        "Defense-in-depth as a design principle, not a slogan",
        "STRIDE or a comparable threat-modeling framework",
        "Common attack classes (injection, XSS, buffer overflow) at a conceptual level",
        "Security frameworks as an evaluation lens (NIST CSF / 800-53 families)",
      ],
    },
    {
      title: "HCI/UX: usability, interaction design & user research",
      rangeLabel: "Week 13",
      gate: "Apply the 10 heuristics to an unfamiliar interface without being told which ones are relevant and justify a concrete design change by name.",
      objectives: [
        "Nielsen's 10 usability heuristics",
        "Information architecture -- how structure shapes findability",
        "Interaction design principles: affordance, feedback, consistency, error prevention",
        "The gulf of execution vs the gulf of evaluation (Norman's model)",
        "Why 'the user is wrong' is almost never the right diagnosis",
        "Qualitative vs quantitative user research methods",
        "Personas and user journeys -- what they're for and their limits as evidence",
        "Usability testing: think-aloud protocol, task success rate, time-on-task",
        "Accessibility fundamentals (WCAG: perceivable, operable, understandable, robust)",
        "What 'empirical evaluation' means in HCI -- evidence over opinion",
      ],
    },
    {
      title: "Big data systems & data mining",
      rangeLabel: "Week 14",
      gate: "Explain why a MapReduce-shaped solution helps (or doesn't) for a stated problem, and distinguish 'data mining' from 'machine learning'.",
      objectives: [
        "What actually makes data 'big' (volume/velocity/variety) vs just large",
        "MapReduce as a programming model -- why it forces a certain shape onto a computation",
        "Association rule mining and frequent itemsets",
        "Clustering and classification at scale -- what changes vs the small-data case",
        "Distributed storage and consistency tradeoffs revisited at data-mining scale",
      ],
    },
    {
      title: "Final integration",
      rangeLabel: "Week 15",
      gate: "Defend the chosen architecture flow layer by layer -- 'AWS handles it' is never sufficient.",
      objectives: [
        "Integrate algorithms, data structures, OS, architecture, and database theory into one architecture flow",
        "Explain the flow through distributed systems, networking, authN/authZ, encryption, and trust boundaries",
        "Explain where threat modeling, usability, and a big-data/mining lens each apply to the same architecture",
      ],
    },
  ],
};

// REQ-245 (FAIL-1560): the MSCS units' dated sources, by unit title, all
// read 2026-11-11. Seed-only: the lesson writer and the fact-checker get them
// through lib/current-facts.ts, and the currency report dates them. Key
// values are what a writer might otherwise remember from an older version.
// No `outline`: the course has no official outline (CS2023 is a curriculum
// guideline, cited by knowledge unit in the title).
const mscsRef = (title: string, url: string, keyValues?: string[]): UnitSource => ({
  title,
  url,
  kind: "reference",
  checkedAt: MSCS_CHECKED,
  ...(keyValues ? { keyValues } : {}),
});
const CS2023_URL = "https://csed.acm.org/wp-content/uploads/2025/11/CS2023-Report.htm";
const cs2023 = (units: string, keyValues?: string[]) =>
  mscsRef(`ACM/IEEE-CS/AAAI, Computer Science Curricula 2023 (CS2023, January 2024), knowledge units ${units}`, CS2023_URL, keyValues);
const MIT_6006 = (lectures: string, keyValues?: string[]) =>
  mscsRef(`MIT OpenCourseWare 6.006 Introduction to Algorithms (Spring 2020), lecture notes ${lectures}`, "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/", keyValues);
const LEVIN = mscsRef("Oscar Levin, Discrete Mathematics: An Open Introduction, 4th edition (chapters 0-1, 4.5-4.6, 5)", "https://discrete.openmathbooks.org/dmoi4/");
const NAND2TETRIS = mscsRef("Nand2Tetris course (projects 1-5: Boolean logic, Boolean arithmetic, memory, machine language, computer architecture)", "https://www.nand2tetris.org/course");
const OSTEP = mscsRef("Arpaci-Dusseau, Operating Systems: Three Easy Pieces, version 1.10 (virtualization, concurrency, persistence)", "https://pages.cs.wisc.edu/~remzi/OSTEP/", [
  "deadlock needs all four conditions at once: mutual exclusion, hold-and-wait, no preemption, circular wait; preventing any one prevents deadlock (OSTEP ch. 32, Common Concurrency Problems)",
]);
const DB_BOOK = mscsRef("Silberschatz, Korth and Sudarshan, Database System Concepts, 7th edition (2019), table of contents", "https://www.db-book.com/", [
  "normal forms 7.3; B+-tree index files 14.3; transaction isolation levels 17.8; lock-based protocols 18.1; multiversion schemes (MVCC) 18.7; snapshot isolation 18.8; data partitioning 21.2 and replication 21.4; graph databases 10.6",
]);
const MML = mscsRef("Deisenroth, Faisal and Ong, Mathematics for Machine Learning (Cambridge University Press, 2020), Part I", "https://mml-book.github.io/");
const TLS13 = mscsRef("IETF RFC 9846, The Transport Layer Security (TLS) Protocol Version 1.3 (July 2026)", "https://www.rfc-editor.org/rfc/rfc9846.txt", [
  "RFC 9846 (July 2026) is the current TLS 1.3 specification; it obsoletes RFC 8446 (August 2018) and RFC 5246 (TLS 1.2)",
  "TLS 1.3 removed static RSA and Diffie-Hellman cipher suites: every public-key key exchange is ephemeral (EC)DHE and gives forward secrecy; the server proves its identity with a certificate and a signature (CertificateVerify)",
  "all handshake messages after the ServerHello are encrypted; application data is protected with symmetric AEAD ciphers",
]);
const NIST_CSF = mscsRef("NIST Cybersecurity Framework (CSF) 2.0, NIST CSWP 29 (February 26, 2024)", "https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf", [
  "CSF 2.0 has six functions: Govern (GV), Identify (ID), Protect (PR), Detect (DE), Respond (RS), Recover (RC); Govern is new in 2.0",
]);
const SP_800_53 = mscsRef("NIST SP 800-53 Rev. 5, Security and Privacy Controls (release 5.2.0, August 27, 2025)", "https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final", [
  "SP 800-53 Rev. 5 groups its controls into 20 families (Access Control through Supply Chain Risk Management); the current minor release is 5.2.0 (August 27, 2025)",
]);
const STRIDE = mscsRef("Microsoft Learn, Threat Modeling Tool threats (STRIDE)", "https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats", [
  "STRIDE: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege",
]);
const NNG_HEURISTICS = mscsRef("Nielsen Norman Group, 10 Usability Heuristics for User Interface Design (Jakob Nielsen, 1994; last reviewed January 30, 2024)", "https://www.nngroup.com/articles/ten-usability-heuristics/", [
  "the ten heuristics as currently named: visibility of system status; match between the system and the real world; user control and freedom; consistency and standards; error prevention; recognition rather than recall; flexibility and efficiency of use; aesthetic and minimalist design; help users recognize, diagnose, and recover from errors; help and documentation",
]);
const NNG_GULFS = mscsRef("Nielsen Norman Group, The Two UX Gulfs: Evaluation and Execution", "https://www.nngroup.com/articles/two-ux-gulfs-evaluation-execution/", [
  "the terms gulf of execution and gulf of evaluation were coined in 1986 by Hutchins, Hollan and Norman; Norman's The Design of Everyday Things made them widely known",
]);
const WCAG = mscsRef("W3C WAI, WCAG 2 Overview", "https://www.w3.org/WAI/standards-guidelines/wcag/", [
  "WCAG 2.2 is the current W3C Recommendation (5 October 2023, updated 12 December 2024): 13 guidelines under four principles, perceivable, operable, understandable and robust; it adds 9 success criteria and makes 4.1.1 Parsing obsolete; WCAG 3 is still a draft",
]);
const MAPREDUCE = mscsRef("Dean and Ghemawat, MapReduce: Simplified Data Processing on Large Clusters (OSDI 2004)", "https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/");
const NIST_BIG_DATA = mscsRef("NIST SP 1500-1r2, NIST Big Data Interoperability Framework: Volume 1, Definitions", "https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1500-1r2.pdf", [
  "NIST defines big data as extensive datasets, primarily in the characteristics of volume, velocity, variety and/or variability, that require a scalable architecture; the classic three Vs are volume, velocity and variety, and NIST adds variability",
]);

export const MSCS_UNIT_SOURCES: Readonly<Record<string, readonly UnitSource[]>> = {
  "Complexity & computational thinking": [
    cs2023("AL-Complexity", [
      "CS2023's representative growth classes: O(1) array access; O(log n) binary search; O(n) linear search; O(n log n) mergesort; O(n^2) selection sort; O(n^c) polynomial, e.g. O(n^3) Gaussian elimination; O(2^n) all subsets; O(n!) all permutations",
    ]),
    MIT_6006("1-2"),
  ],
  "Core data structures": [
    cs2023("AL-Foundational"),
    MIT_6006("2, 4-8", ["hash tables give expected O(1) time operations (amortized if dynamic), not a worst-case guarantee; the expectation comes from choosing the hash function at random from a universal family (6.006 Lecture 5 review)"]),
  ],
  "Discrete mathematics I": [cs2023("MSF-Discrete"), LEVIN],
  "Sorting, recursion, and recurrences": [
    cs2023("AL-Foundational, AL-Strategies, MSF-Discrete"),
    MIT_6006("3, 5", ["comparison sort lower bound: a comparison sort's decision tree needs at least n! leaves, so its height is at least log(n!) = Omega(n log n); merge sort is optimal in the comparison model (6.006 Lecture 5)"]),
  ],
  "Graph foundations": [
    cs2023("AL-Foundational"),
    MIT_6006("9-10", ["BFS and DFS each run in O(|V| + |E|) time with adjacency lists (6.006 Lectures 9-10)"]),
  ],
  "Graph algorithms & design strategies": [
    cs2023("AL-Foundational, AL-Strategies"),
    MIT_6006("11-13, 15-18", ["Dijkstra's algorithm requires non-negative edge weights, w(e) >= 0; Bellman-Ford handles negative weights (6.006 Lectures 12-13)"]),
  ],
  "Computer architecture": [
    cs2023("AR-Representation, AR-Assembly, AR-Memory, AR-IO, AR-Organization", ["CS2023 names x86, ARM and RISC-V as instruction set architecture examples (AR-Assembly)"]),
    NAND2TETRIS,
  ],
  "Operating systems": [cs2023("OS-Principles, OS-Concurrency, OS-Scheduling, OS-Process, OS-Memory, OS-Files, OS-Virtualization"), OSTEP],
  "Databases and data systems": [cs2023("DM-Core, DM-Relational, DM-Processing, DM-Internals, DM-Distributed"), DB_BOOK],
  "Math & foundations for machine learning": [cs2023("MSF-Linear, MSF-Probability, MSF-Statistics, MSF-Calculus, AI-ML"), MML],
  "Cybersecurity I: cryptography & secure protocols": [cs2023("SEC-Crypto, NC-Security"), TLS13],
  "Cybersecurity II: network defense & threat modeling": [
    cs2023("NC-Fundamentals, NC-Security, SEC-Foundations, SEC-Coding, SEC-Engineering, SEC-Governance"),
    STRIDE,
    NIST_CSF,
    SP_800_53,
  ],
  "HCI/UX: usability, interaction design & user research": [
    cs2023("HCI-User, HCI-Accessibility, HCI-Evaluation, HCI-Design"),
    NNG_HEURISTICS,
    NNG_GULFS,
    WCAG,
  ],
  "Big data systems & data mining": [
    cs2023("DM-Core, DM-Analytics, DM-Distributed, PDC-Algorithms"),
    MAPREDUCE,
    mscsRef("Silberschatz, Korth and Sudarshan, Database System Concepts, 7th edition, chapters 10 (Big Data: MapReduce) and 11.4 (Data Mining)", "https://www.db-book.com/"),
    NIST_BIG_DATA,
  ],
  "Final integration": [cs2023("NC-Fundamentals, SEC-Foundations, SEC-Engineering, DM-Distributed"), TLS13, STRIDE],
};
for (const unit of MSCS_TRACK.units) unit.sources = [...(MSCS_UNIT_SOURCES[unit.title] ?? [])];

// REQ-102: the five CompTIA tracks in this file predate the `credential`
// block, so the app had no exam code, format, or passing score for them --
// the flagship Security+ track included. Every fact in the blocks below was
// read on 2026-11-07 from the comptia.org exam page cited beside it.
const COMPTIA = {
  providerSlug: "comptia",
  providerName: "CompTIA",
  providerUrl: "https://www.comptia.org/certifications",
  subcategorySlug: "comptia-certifications",
  credentialType: "certification",
  basis: "vendor_exam",
} as const;
const COMPTIA_VERIFIED_AT = "2026-11-07T00:00:00Z";

// Security+ V7 (SY0-701). Source:
// https://www.comptia.org/en-us/certifications/security/v7/ -- launched
// 2023-11-07; max 90 questions, multiple choice and performance-based; 90
// minutes; pass 750 on 100-900; domains 12/22/18/28/20. The page states
// English retires 2027-06-11 (Japanese, Portuguese, Spanish, Thai on
// 2027-08-13), so 'transitioning' like AWSANS (AWSDVA has since moved to DVA-C03).
//
// Successor: Security+ V8 (SY0-801), launching 2026-11-17 per
// https://www.comptia.org/en-us/certifications/security/v8/ -- same 90
// questions / 90 minutes / 750 pass, but renamed Domain 2 ("Threats,
// Vulnerabilities, and Attacks") and new weights 16/24/19/27/14.
//
// REQ-103 (Nick's decision, 2026-11-07): SY0-801 gets its own parallel
// course, SECPLUSV8 below, rather than a rebase of this one. This track keeps
// teaching SY0-701 unchanged -- learners booked on V7 keep their course and
// history -- until English SY0-701 closes on 2027-06-11, which is now this
// track's review date (retire it then). SECPLUSV8's credential block marks
// the SY0-701 exam row superseded_by SY0-801 with that last day.
//
// REQ-100 course readiness rolls objective evidence up with these domain
// weights (12 / 22 / 18 / 28 / 20).
// REQ-220 (FAIL-1130): two IAM lines sat outside SY0-701's 4.6; retired in
// place (row ids and history kept) and taught by the appended 4.6 lines.
const SECPLUS_V7_PLACEMENT_RETIRED_AT = "2026-11-10T00:00:00Z";
// REQ-235 (batch H wave 1): each unit names the SY0-701 objectives it covers,
// by CompTIA's numbered headings (headings only; the bullets stay
// paraphrased in the objectives, the repo's copyright rule). Read 2026-11-11
// from "CompTIA Security+ SY0-701 Certification Exam: Exam Objectives
// Version 5.0" (Copyright 2023 CompTIA), the unaltered PDF republished at the
// URL below (CompTIA serves its copy behind a form on
// https://www.comptia.org/en-us/certifications/security/v7/). The writer and
// the fact-checker get these statements (lib/current-facts.ts).
const SY0701_PDF = "https://laurelridgeworkforce.com/wp-content/uploads/2025/01/CompTIA-Security-SY0-701-Exam-Objectives-1.pdf";
const sy0701 = (domain: string, outline: string[]): UnitSource => ({
  title: `CompTIA Security+ SY0-701 Exam Objectives V5.0, domain ${domain}`,
  url: SY0701_PDF,
  kind: "exam_outline",
  checkedAt: "2026-11-11",
  outline,
});
export const SECPLUS_UNIT_SOURCES: Record<string, UnitSource[]> = {
  "General Security Concepts": [
    sy0701("1.0", [
      "1.1 Compare and contrast various types of security controls.",
      "1.2 Summarize fundamental security concepts.",
      "1.3 Explain the importance of change management processes and the impact to security.",
      "1.4 Explain the importance of using appropriate cryptographic solutions.",
    ]),
  ],
  "Threats, Vulnerabilities, and Mitigations": [
    sy0701("2.0", [
      "2.1 Compare and contrast common threat actors and motivations.",
      "2.2 Explain common threat vectors and attack surfaces.",
      "2.3 Explain various types of vulnerabilities.",
      "2.4 Given a scenario, analyze indicators of malicious activity.",
      "2.5 Explain the purpose of mitigation techniques used to secure the enterprise.",
    ]),
  ],
  "Security Architecture": [
    sy0701("3.0", [
      "3.1 Compare and contrast security implications of different architecture models.",
      "3.2 Given a scenario, apply security principles to secure enterprise infrastructure.",
      "3.3 Compare and contrast concepts and strategies to protect data.",
      "3.4 Explain the importance of resilience and recovery in security architecture.",
    ]),
  ],
  "Security Operations": [
    sy0701("4.0", [
      "4.1 Given a scenario, apply common security techniques to computing resources.",
      "4.2 Explain the security implications of proper hardware, software, and data asset management.",
      "4.3 Explain various activities associated with vulnerability management.",
      "4.4 Explain security alerting and monitoring concepts and tools.",
      "4.5 Given a scenario, modify enterprise capabilities to enhance security.",
      "4.6 Given a scenario, implement and maintain identity and access management.",
      "4.7 Explain the importance of automation and orchestration related to secure operations.",
      "4.8 Explain appropriate incident response activities.",
      "4.9 Given a scenario, use data sources to support an investigation.",
    ]),
  ],
  "Security Program Management and Oversight": [
    sy0701("5.0", [
      "5.1 Summarize elements of effective security governance.",
      "5.2 Explain elements of the risk management process.",
      "5.3 Explain the processes associated with third-party risk assessment and management.",
      "5.4 Summarize elements of effective security compliance.",
      "5.5 Explain types and purposes of audits and assessments.",
      "5.6 Given a scenario, implement security awareness practices.",
    ]),
  ],
};
// REQ-235 (G5 follow-up, Nick-approved): SY0-701 covers business impact
// analysis (RTO, RPO, MTTR, MTBF) in 5.2 and backups, sites and continuity in
// 3.4, not in domain 4. Security Operations' "Business continuity and
// disaster recovery" line is retired in place (row id and history kept); the
// material is taught by the 3.4 line in Security Architecture and the 5.2
// line in Program Management, which already name every term, and the BIA lab
// moves to the 5.2 line.
const SECPLUS_BCDR_MOVED_AT = "2026-11-11T00:00:00Z";
export const SECPLUS_TRACK: SeedTrack = {
  code: "SECPLUS",
  // REQ-258 (Nick, 2026-11-12): level-aware lessons switched on once its Key terms were written.
  levelFlow: true,
  title: "Prep for CompTIA Security+",
  description:
    "CompTIA Security+ SY0-701 exam prep across 5 weighted domains, with PBQ scenario drilling. SY0-701 can be booked in English until 2027-06-11 (Japanese, Portuguese, Spanish and Thai until 2027-08-13); for SY0-801 (from 2026-11-17) take Prep for CompTIA Security+ (V8).",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/security/v7/",
  sourceVerifiedAt: COMPTIA_VERIFIED_AT,
  contentReviewDueAt: "2027-06-11T00:00:00Z",
  credential: {
    ...COMPTIA,
    credentialSlug: "security-plus",
    credentialName: "CompTIA Security+",
    credentialUrl: "https://www.comptia.org/en-us/certifications/security/",
    examCode: "SY0-701",
    examRevision: "V7",
    status: "transitioning",
    effectiveDate: "2023-11-07",
    retirementDate: "2027-06-11", // English; comptia.org/en-us/certifications/security/v7/
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/security/v7/",
    lastVendorVerifiedAt: COMPTIA_VERIFIED_AT,
    recommendedExperience:
      "CompTIA Network+ and two years of experience in a security or systems administrator role.",
    durationMinutes: 90,
    // REQ-220 (FAIL-1131): CompTIA's Security+ page, read 2026-11-10
    // (https://www.comptia.org/en-us/blog/what-is-on-the-comptia-security-exam/):
    // "multiple-choice questions, drag-and-drop activities, and
    // performance-based items. The multiple-choice questions are single- and
    // multiple-response." The V7 exam page says only "multiple-choice and
    // performance-based", which read as single-answer only here.
    questionFormat: "Maximum 90 questions; multiple choice (single/multiple response), drag-and-drop, and performance-based",
    passingScorePolicy: "750 on a scale of 100-900.",
  },
  units: [
    {
      title: "General Security Concepts",
      sources: SECPLUS_UNIT_SOURCES["General Security Concepts"],
      weight: 12,
      gate: "Given an unfamiliar scenario, name which CIA-triad property and which control type/category apply, and explain a PKI or authentication choice without hand-waving the mechanism.",
      objectives: [
        "CIA triad, non-repudiation, and the AAA security model",
        "Security control categories (technical, managerial, operational, physical) and control types (preventive, deterrent, detective, corrective, compensating, directive)",
        "Cryptographic fundamentals: symmetric vs asymmetric encryption, hashing, digital signatures, key exchange",
        "PKI basics: certificates, certificate authorities, chains of trust, revocation (CRL/OCSP)",
        "Authentication methods and factors: MFA, biometrics, SSO, federation",
        "Access control models: DAC, MAC, RBAC, ABAC, and least privilege",
        "Security policies, governance basics, and change management fundamentals",
        // REQ-220: appended to cover SY0-701 1.2-1.4 (append-only; positions are row identity).
        "AAA in practice: authenticating people vs authenticating systems, authorization models, and gap analysis against a target security posture",
        "Zero Trust architecture: the control plane (adaptive identity, threat scope reduction, policy-driven access control, Policy Administrator, Policy Engine) and the data plane (implicit trust zones, subject/system, Policy Enforcement Point)",
        "Physical security controls: bollards, access control vestibule, fencing, video surveillance, security guard, access badge, lighting, and sensors (infrared, pressure, microwave, ultrasonic)",
        "Deception and disruption technology: honeypot, honeynet, honeyfile, and honeytoken",
        "Change management and its security impact: approval process, ownership, stakeholders, impact analysis, test results, backout plan, maintenance window, standard operating procedure; technical implications (allow lists/deny lists, restricted activities, downtime, service restart, application restart, legacy applications, dependencies); documentation (updating diagrams, updating policies/procedures) and version control",
        "Encryption choices: public key infrastructure (PKI) public and private keys and key escrow; encryption levels (full-disk, partition, file, volume, database, record) and transport/communication encryption; choosing algorithms and key length",
        "Cryptographic tools and techniques: Trusted Platform Module (TPM), hardware security module (HSM), key management system, secure enclave; obfuscation (steganography, tokenization, data masking); salting and key stretching; blockchain and the open public ledger",
        "Certificate types and requests: self-signed vs third-party certificates, root of trust, certificate signing request (CSR) generation, and wildcard certificates",
      ],
      // REQ-220: MFA/SSO/federation is SY0-701 4.6, taught in Security Operations now.
      objectiveRetiredAt: [null, null, null, null, SECPLUS_V7_PLACEMENT_RETIRED_AT, null, null, null, null, null, null, null, null, null, null],
      labs: [
        null,
        null,
        "Generate a self-signed TLS certificate with OpenSSL and inspect its fields with openssl x509 -text -noout.",
        "Open a site in your browser, view its certificate chain, and trace it from the leaf certificate up to the root CA.",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    },
    {
      title: "Threats, Vulnerabilities, and Mitigations",
      sources: SECPLUS_UNIT_SOURCES["Threats, Vulnerabilities, and Mitigations"],
      weight: 22,
      gate: "Given a log excerpt, alert, or short scenario, name the specific threat/attack/vulnerability at work, name the indicator that gives it away, and recommend a concrete mitigation.",
      objectives: [
        "Threat actors, motivations, and attack surfaces",
        "Malware types: viruses, worms, trojans, ransomware, spyware, rootkits, botnets, logic bombs",
        "Social engineering techniques: phishing variants, pretexting, tailgating, business email compromise",
        "Network attacks: DoS/DDoS, on-path (MITM), spoofing, replay, DNS poisoning",
        "Application and web attacks: injection, XSS, buffer overflow, race conditions (conceptual)",
        "Vulnerability types: misconfigurations, zero-days, legacy systems, supply-chain and third-party risk",
        "Indicators of compromise and threat-hunting fundamentals",
        "Mitigation techniques and secure coding concepts: hardening, segmentation, input validation, patch management",
        // REQ-220: SY0-701 2.1-2.5, appended.
        "Threat actors and their attributes: nation-state, unskilled attacker, hacktivist, insider threat, organized crime, shadow IT; internal/external, resources/funding, level of sophistication/capability; motivations (data exfiltration, espionage, service disruption, blackmail, financial gain, philosophical/political beliefs, ethical, revenge, disruption/chaos, war)",
        "Threat vectors and attack surfaces: message-based (email, SMS, instant messaging), image-based, file-based, voice call, removable device, vulnerable software (client-based vs. agentless), unsupported systems and applications, unsecure networks (wireless, wired, Bluetooth), open service ports, default credentials, and the supply chain (managed service providers, vendors, suppliers)",
        "Human vectors and social engineering: phishing, vishing, smishing, misinformation/disinformation, impersonation, business email compromise, pretexting, watering hole, brand impersonation, typosquatting",
        "Vulnerability types: application (memory injection, buffer overflow, race conditions with time-of-check (TOC) and time-of-use (TOU), malicious update), operating system (OS)-based, web-based (SQL injection (SQLi), cross-site scripting (XSS)), hardware (firmware, end-of-life, legacy), virtualization (VM escape, resource reuse), cloud-specific, supply chain, cryptographic, misconfiguration, mobile device (side loading, jailbreaking), zero-day",
        "Indicators of malware, physical, and network attacks: ransomware, trojan, worm, spyware, bloatware, virus, keylogger, logic bomb, rootkit; brute force, RFID cloning, environmental; DDoS (amplified, reflected), DNS attacks, wireless, on-path, credential replay, malicious code",
        "Application, cryptographic, and password attacks and their indicators: injection, buffer overflow, replay, privilege escalation, forgery, directory traversal; downgrade, collision, and birthday attacks; password spraying and brute force; indicators such as account lockout, concurrent session usage, blocked content, impossible travel, resource consumption, resource inaccessibility, out-of-cycle logging, published/documented compromise, and missing logs",
        "Enterprise mitigation techniques: segmentation, access control (access control list (ACL), permissions), application allow list, isolation, patching, encryption, monitoring, least privilege, configuration enforcement, decommissioning; hardening techniques (encryption, installation of endpoint protection, host-based firewall, host-based intrusion prevention system (HIPS), disabling ports/protocols, default password changes, removal of unnecessary software)",
      ],
      labs: [null, null, null, null, null, "Run a permission-scoped Nmap scan of a home network you administer yourself, with the agreement of everyone who uses it (not shared housing, campus or work Wi-Fi), and record any unexpected open ports.", null, null, null, null, null, null, null, null, null],
    },
    {
      title: "Security Architecture",
      sources: SECPLUS_UNIT_SOURCES["Security Architecture"],
      weight: 18,
      gate: "Given a system design, identify a missing architectural control and explain what specific failure it prevents.",
      objectives: [
        "Defense-in-depth, network segmentation, and Zero Trust concepts",
        "Secure baselines and system hardening",
        "Secure communication protocols: TLS, SSH, IPsec, DNSSEC",
        "Cloud and virtualization security: shared responsibility, containers, infrastructure as code",
        "Identity and access management strategy in architecture: federation, privileged access management, just-in-time access",
        "Endpoint, mobile, and embedded/IoT/ICS security considerations",
        "High availability and resilience design: redundancy, failover, and capacity planning",
        // REQ-220: SY0-701 3.1-3.4, appended.
        "Architecture models and their security implications: cloud responsibility matrix, hybrid considerations, third-party vendors, infrastructure as code (IaC), serverless, microservices, network infrastructure (physical isolation and air-gapped networks, logical segmentation, software-defined networking (SDN)), on-premises, centralized vs. decentralized, containerization, virtualization, IoT, ICS/SCADA, real-time operating system (RTOS), embedded systems, high availability",
        "Weighing architecture considerations: availability, resilience, cost, responsiveness, scalability, ease of deployment, risk transference, ease of recovery, patch availability, inability to patch, power, and compute",
        "Securing enterprise infrastructure: device placement, security zones, attack surface, connectivity, failure modes (fail-open vs fail-closed), device attributes (active vs. passive, inline vs. tap/monitor), network appliances (jump server, proxy server, IPS/IDS, load balancer, sensors), port security (802.1X, Extensible Authentication Protocol (EAP)), and firewall types (web application firewall (WAF), unified threat management (UTM), next-generation firewall (NGFW), layer 4/layer 7)",
        "Secure communication and access: VPN, remote access, tunneling (TLS, IPSec), SD-WAN, SASE, and the selection of effective controls",
        "Data types and classifications: regulated, trade secret, intellectual property, legal information, financial information, human- and non-human-readable data; sensitive, confidential, public, restricted, private, and critical classifications",
        "Protecting data by state and location: data at rest, data in transit, data in use, data sovereignty, geolocation; methods to secure data (geographic restrictions, encryption, hashing, masking, tokenization, obfuscation, segmentation, permission restrictions)",
        "Resilience and recovery: high availability (load balancing vs. clustering), site considerations (hot, cold, warm, geographic dispersion), platform diversity, multi-cloud systems, continuity of operations, capacity planning (people, technology, infrastructure); testing (tabletop exercises, fail over, simulation, parallel processing); backups (onsite/offsite, frequency, encryption, snapshots, recovery, replication, journaling); power (generators, uninterruptible power supply (UPS))",
      ],
      // REQ-220: IAM (federation, PAM, just-in-time access) is SY0-701 4.6, taught in Security Operations now.
      objectiveRetiredAt: [null, null, null, null, SECPLUS_V7_PLACEMENT_RETIRED_AT, null, null, null, null, null, null, null, null, null],
      labs: [
        "Sketch a segmentation diagram separating IoT, guest, and trusted devices into different VLANs/subnets.",
        "Review your router's or laptop's settings against a basic hardening checklist.",
        "Run openssl s_client -connect <site>:443 and read which TLS version/cipher suite it negotiated.",
        "List which security controls are yours to configure vs the provider's under the shared-responsibility model on a free-tier cloud VM.",
        null,
        "Check how one IoT/embedded device you own receives firmware updates.",
        "Sketch a redundant architecture and identify the single point of failure it removes.",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    },
    {
      title: "Security Operations",
      sources: SECPLUS_UNIT_SOURCES["Security Operations"],
      weight: 28,
      // REQ-235: RTO/RPO left the gate with the BCDR line (now 3.4 and 5.2).
      gate: "Given an incident scenario, correctly sequence the response, prioritize a vulnerability, or reason about a forensics constraint -- not just name the vocabulary.",
      // REQ-235: index 6 (business continuity and DR) moved to 3.4 / 5.2.
      objectiveRetiredAt: [null, null, null, null, null, null, SECPLUS_BCDR_MOVED_AT, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
      objectives: [
        "Security monitoring, log analysis, and SIEM/SOAR fundamentals",
        "Incident response process and the NIST incident response lifecycle",
        "Threat intelligence sources and threat hunting in practice",
        "Vulnerability management: scanning, CVSS scoring, and remediation prioritization",
        "Digital forensics basics: chain of custody, order of volatility, legal holds",
        "Change management and configuration management processes",
        "Business continuity and disaster recovery: BIA, RTO/RPO, backup types, DR sites",
        "Security tools in operation: firewalls, IDS/IPS, EDR, and DLP",
        // REQ-220: SY0-701 4.1-4.9, appended.
        "Secure baselines and hardening targets: establish, deploy, and maintain secure baselines; harden mobile devices, workstations, switches, routers, cloud infrastructure, servers, ICS/SCADA, embedded systems, RTOS, and IoT devices",
        "Wireless and mobile hardening: wireless devices and installation considerations (site surveys, heat maps); mobile device management (MDM), deployment models (bring your own device (BYOD), corporate-owned, personally enabled (COPE), choose your own device (CYOD)) and connection methods (cellular, Wi-Fi, Bluetooth); wireless security settings (WPA3, AAA/RADIUS, cryptographic protocols, authentication protocols)",
        "Application security techniques: input validation, secure cookies, static code analysis, code signing, sandboxing, and monitoring",
        "Hardware, software, and data asset management: acquisition/procurement process, assignment/accounting (ownership, classification), monitoring/asset tracking (inventory, enumeration), and disposal/decommissioning (sanitization, destruction, certification, data retention)",
        "Finding and analyzing vulnerabilities: vulnerability scan; application security (static analysis, dynamic analysis, package monitoring); threat feed sources (open-source intelligence (OSINT), proprietary/third-party, information-sharing organization, dark web); penetration testing; responsible disclosure program and bug bounty; system/process audit; confirming a false positive or false negative; prioritizing with CVSS and CVE, vulnerability classification, exposure factor, environmental variables, industry/organizational impact, and risk tolerance",
        "Vulnerability response and remediation: patching, insurance, segmentation, compensating controls, exceptions and exemptions; validation of remediation (rescanning, audit, verification) and reporting",
        "Security alerting and monitoring: monitoring systems, applications, and infrastructure; log aggregation, alerting, scanning, reporting, archiving, and alert response and remediation/validation (quarantine, alert tuning); tools (Security Content Automation Protocol (SCAP), benchmarks, agents/agentless, SIEM, antivirus, data loss prevention (DLP), SNMP traps, NetFlow, vulnerability scanners)",
        "Tuning network defenses: firewall rules, access lists, ports/protocols, screened subnets; IDS/IPS trends and signatures; web filter (agent-based, centralized proxy, URL scanning, content categorization, block rules, reputation); DNS filtering",
        "Host, protocol, and email defenses: operating system security (Group Policy, SELinux); implementation of secure protocols (protocol selection, port selection, transport method); email security (DMARC, DKIM, SPF, gateway); file integrity monitoring, DLP, network access control (NAC), EDR/XDR, and user behavior analytics",
        "Identity and access management: provisioning/de-provisioning user accounts, permission assignments and implications, identity proofing, federation, single sign-on (SSO) with LDAP, OAuth, and SAML, interoperability, attestation; access controls (mandatory, discretionary, role-based, rule-based, attribute-based, time-of-day restrictions, least privilege)",
        "Authentication and privileged access: multifactor authentication implementations (biometrics, hard/soft authentication tokens, security keys) and factors (something you know, something you have, something you are, somewhere you are); password best practices (length, complexity, reuse, expiration, age), password managers, passwordless; privileged access management tools (just-in-time permissions, password vaulting, ephemeral credentials)",
        "Automation and orchestration for secure operations: use cases (user provisioning, resource provisioning, guard rails, security groups, ticket creation, escalation, enabling/disabling services and access, continuous integration and testing, integrations and application programming interfaces (APIs)); benefits (efficiency/time saving, enforcing baselines, standard infrastructure configurations, scaling in a secure manner, employee retention, reaction time, workforce multiplier); other considerations (complexity, cost, single point of failure, technical debt, ongoing supportability)",
        "Incident response activities as SY0-701 names them: preparation, detection, analysis, containment, eradication, recovery, lessons learned; training; testing (tabletop exercise, simulation); root cause analysis; threat hunting; digital forensics (legal hold, chain of custody, acquisition, reporting, preservation, e-discovery)",
        "Data sources for an investigation: log data (firewall logs, application logs, endpoint logs, OS-specific security logs, IPS/IDS logs, network logs, metadata) and other data sources (vulnerability scans, automated reports, dashboards, packet captures)",
      ],
      labs: [
        "Try a free SIEM sandbox and run one basic search query against sample log data.",
        null,
        null,
        "Look up a recent published CVE for an app/OS you use (nvd.nist.gov) and note its CVSS score.",
        "Write a short chain-of-custody log template for a hypothetical piece of evidence.",
        null,
        null, // REQ-235: the BIA lab moved to 5.2 (Program Management)
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    },
    {
      title: "Security Program Management and Oversight",
      sources: SECPLUS_UNIT_SOURCES["Security Program Management and Oversight"],
      weight: 20,
      gate: "Given a governance or compliance scenario, name the right instrument and correctly reason about risk math or third-party exposure.",
      objectives: [
        "Governance frameworks and the policy/standard/procedure/guideline hierarchy",
        "Risk assessment: qualitative vs quantitative analysis (ALE, SLE, ARO)",
        "Third-party and supply-chain risk management",
        "Security awareness training programs",
        "Compliance, regulations, and audits (GDPR, HIPAA, PCI DSS)",
        "Security metrics, KPIs, and reporting to leadership",
        // REQ-220: SY0-701 5.1-5.6, appended.
        "Security governance documents: guidelines; policies (acceptable use policy (AUP), information security policies, business continuity, disaster recovery, incident response, software development lifecycle (SDLC), change management); standards (password, access control, physical security, encryption); procedures (change management, onboarding/offboarding, playbooks)",
        "Governance structures and roles: external considerations (regulatory, legal, industry, local/regional, national, global), monitoring and revision, types of governance structures (boards, committees, government entities, centralized/decentralized), and roles for systems and data (owners, controllers, processors, custodians/stewards)",
        "The risk management process: risk identification; risk assessment (ad hoc, recurring, one-time, continuous); risk analysis (single loss expectancy (SLE), annualized loss expectancy (ALE), annualized rate of occurrence (ARO), probability, likelihood, exposure factor, impact); risk register (key risk indicators, risk owners, risk threshold); risk tolerance and risk appetite (expansionary, conservative, neutral)",
        "Risk management strategies and business impact analysis: transfer, accept (exemption, exception), avoid, mitigate; risk reporting; business impact analysis with recovery time objective (RTO), recovery point objective (RPO), mean time to repair (MTTR), and mean time between failures (MTBF)",
        "Third-party risk assessment and management: vendor assessment (penetration testing, right-to-audit clause, evidence of internal audits, independent assessments, supply chain analysis), vendor selection (due diligence, conflict of interest), agreement types (service-level agreement (SLA), memorandum of agreement (MOA), memorandum of understanding (MOU), master service agreement (MSA), work order (WO)/statement of work (SOW), non-disclosure agreement (NDA), business partners agreement (BPA)), vendor monitoring, questionnaires, and rules of engagement",
        "Security compliance: compliance reporting (internal, external); consequences of non-compliance (fines, sanctions, reputational damage, loss of license, contractual impacts); compliance monitoring (due diligence/care, attestation and acknowledgment, internal and external, automation); privacy (legal implications, data subject, controller vs. processor, ownership, data inventory and retention, right to be forgotten)",
        "Audits and assessments: attestation; internal audit (compliance, audit committee, self-assessments); external audit (regulatory, examinations, assessment, independent third-party audit); penetration testing (physical, offensive, defensive, integrated; known environment, partially known environment, unknown environment; reconnaissance, passive and active)",
        "Security awareness practices: phishing campaigns, recognizing a phishing attempt, and responding to reported suspicious messages; anomalous behavior recognition (risky, unexpected, unintentional); user guidance and training (policy/handbooks, situational awareness, insider threat, password management, removable media and cables, social engineering, operational security, hybrid/remote work environments); reporting and monitoring (initial, recurring); program development and execution",
      ],
      // REQ-235: the BIA lab sits on the 5.2 line (index 9), where SY0-701 tests BIA.
      labs: [null, null, null, null, null, null, null, null, null, "Draft a one-page BIA outline for a small hypothetical business.", null, null, null, null],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA Security+ V8 (SY0-801) -- REQ-103. A parallel course beside
// SECPLUS (SY0-701), per Nick's decision: V7 stays bookable in English until
// 2027-06-11, so its learners keep their course; new learners sitting the
// exam from 2026-11-17 study this one.
//
// Sources, read 2026-11-07:
//   - Exam page: https://www.comptia.org/en-us/certifications/security/v8/
//     -- SY0-801, launch 2026-11-17, max 90 questions, multiple choice and
//     performance-based, 90 minutes, pass 750 on 100-900, "Security
//     administrator with two years of hands-on experience", five domains
//     16/24/19/27/14, retirement "Estimated 3 years after launch" (no date).
//   - Full objectives PDF, linked from that page ("Preview the full Security+
//     V8 exam objectives"): "CompTIA Security+ Certification Exam Objectives,
//     EXAM NUMBER: SY0-801 V8", Exam Objectives Document Version 2.0:
//     https://lecbyo.files.cmp.optimizely.com/download/77f3bd3223ac11f180820e495f189928
//     Test details and the domain table in the PDF match the page. Every
//     unit below is one domain; every objective groups one sub-heading (or a
//     few small ones) of an official objective (1.1 ... 5.6) and names every
//     bulleted term under it -- lib/comptia-v8-coverage.test.ts checks that
//     term by term. Where the exam page's one-line objective summaries word
//     an objective differently from the PDF, the PDF (the full document) is
//     followed.
//   - SY0-701 last day (English 2027-06-11):
//     https://www.comptia.org/en-us/certifications/security/v7/
//
// The objectives name CompTIA's terms; the wording around them is ours.
// "Given a scenario" objectives in the PDF (1.2, 2.5, 3.2, 4.1, 4.3, 4.5,
// 4.6, 4.8, 5.6) are written as scenario tasks, since those are where the
// performance-based questions come from.
// ---------------------------------------------------------------------------
const SECPLUS_V8_VERIFIED_AT = "2026-11-07T00:00:00Z";

export const SECPLUSV8_TRACK: SeedTrack = {
  code: "SECPLUSV8",
  title: "Prep for CompTIA Security+ (V8)",
  description:
    "CompTIA Security+ SY0-801 (V8) exam prep across 5 weighted domains -- including the new AI threats and AI-assisted operations objectives -- with PBQ scenario drilling. For SY0-701 (bookable in English until 2027-06-11) take Prep for CompTIA Security+.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/security/v8/",
  sourceVerifiedAt: SECPLUS_V8_VERIFIED_AT,
  contentReviewDueAt: "2027-05-17T00:00:00Z",
  credential: {
    ...COMPTIA,
    credentialSlug: "security-plus",
    credentialName: "CompTIA Security+",
    credentialUrl: "https://www.comptia.org/en-us/certifications/security/",
    examCode: "SY0-801",
    examRevision: "V8",
    objectivesRevision: "Exam Objectives Document Version 2.0",
    status: "active",
    effectiveDate: "2026-11-17", // launch; comptia.org/en-us/certifications/security/v8/
    officialObjectivesUrl: "https://lecbyo.files.cmp.optimizely.com/download/77f3bd3223ac11f180820e495f189928",
    lastVendorVerifiedAt: SECPLUS_V8_VERIFIED_AT,
    recommendedExperience: "Security administrator with two years of hands-on experience.",
    durationMinutes: 90,
    questionFormat: "Maximum 90 questions; multiple choice and performance-based",
    passingScorePolicy: "750 on a scale of 100-900.",
    // SY0-701's English last day; the V7 track (SECPLUS) is seeded first, so
    // its exam row exists when this marks it superseded.
    supersedes: { examCode: "SY0-701", lastExamDate: "2027-06-11" },
  },
  units: [
    {
      title: "General Security Concepts",
      weight: 16,
      gate: "Given a short scenario, name the security principle at stake and the control category and control type that answer it; walk a change request from CAB approval to backout plan; and choose a certificate, encryption level, or hashing approach and say what it protects against.",
      objectives: [
        // 1.1
        "Defense in depth and its core principles: confidentiality, integrity, and availability (CIA); authentication, authorization, accounting (AAA); non-repudiation; Zero Trust principles; least privilege",
        "Control categories (technical/logical, managerial/administrative, physical/environmental, operational) and control types (preventive, deterring, corrective, detective, compensating, directive), classifying a real control by both",
        // 1.2
        "Given a change request, run the business process: change advisory board (CAB) approval process, ownership, stakeholders, impact analysis, test results, backout planning, fail forward, maintenance window, standard operating procedures (SOPs)",
        "Technical implications of a change: allow lists/deny lists, restricted activities, downtime, service restart, application restart, legacy applications, dependencies",
        "Documenting a change: updating diagrams, updating policies/procedures, and version control",
        // 1.3
        "Public key infrastructure (PKI): public key, private key, key escrow",
        "Certificates: certificate authorities, certificate revocation lists (CRLs), Online Certificate Status Protocol (OCSP), self-signed versus third-party, root of trust, certificate signing request (CSR) generation, wildcard",
        "Encryption choices: protocols, symmetric versus asymmetric, transport/communication encryption, key exchange, algorithms, key length",
        "Encryption level: full disk, partition, file, volume, database, record -- and what each protects when a device or table is stolen",
        "Digital signatures, salting, obfuscation, hashing algorithms, and the cryptographic tools that implement them",
      ],
      labs: [
        null,
        "Pick three controls at your workplace or school (a badge reader, a password policy, a backup job) and classify each by control category and control type.",
        "Write a one-page change request for patching a web server: CAB approver, stakeholders, impact analysis, test results, backout plan, and maintenance window.",
        null,
        null,
        null,
        "Generate a private key and a certificate signing request with OpenSSL, then self-sign it and inspect the result with openssl x509 -text -noout.",
        "Run openssl s_client -connect <site>:443 against a public site and record the protocol version, key exchange, cipher, and key length it negotiated.",
        null,
        "Hash the same practice password (never a real one) with and without a salt (python -c with hashlib) and explain why the salted hashes differ -- then explain why real systems store passwords with a slow, salted algorithm such as bcrypt, scrypt or Argon2 rather than plain SHA-256.",
      ],
    },
    {
      title: "Threats, Vulnerabilities, and Attacks",
      weight: 24,
      gate: "Given a log excerpt, alert, message, or short scenario, name the threat actor and motivation, the vector, the vulnerability or attack surface, and the specific indicator that gives the attack away -- including attacks on and through AI systems.",
      objectives: [
        // 2.1
        "Threat characteristics: threat feeds, likelihood, impact, intelligence sources, and the threat life cycle",
        "Vulnerability characteristics: scoring with the Common Vulnerability Scoring System (CVSS), prioritization, vulnerability types, and Common Vulnerabilities and Exposures (CVE) identifiers",
        // 2.2
        "Threat actors -- crime syndicate/organized crime, terrorist, unskilled attacker, hacktivist, insider, accidental/unintentional, competitor, state-sponsored -- and their attributes: internal/external, resources/funding, level of sophistication/capability",
        "Threat actor motivations: financial, influence, intellectual property, notoriety, espionage, fear/chaos, extortion, general curiosity, revenge, ideological, political, ethical",
        // 2.3
        "Advanced persistent threat (APT) and message-based vectors: email, Short Message Service (SMS), Rich Communication Services (RCS), instant messaging, collaboration tools",
        "Image-, attachment-, and browser-based vectors: quick response (QR) codes, embedded content, CAPTCHA; embedded macros, Rich Text Format (RTF) documents, Portable Document Formats (PDFs); browser extensions, JavaScript, password managers, cookies, session tokens",
        "Network, remote access, and endpoint vectors: infrastructure devices, virtualized devices, session keys; remote desktop, Virtual Network Computing (VNC), virtual private network (VPN); mobile devices, workstations, servers, tablets, trusted devices, built-in tools, living-off-the-land tools",
        "Supply chain-based vectors: third-party providers, managed service providers, logistic providers, software as a service (SaaS) providers",
        "External media-, human-, IoT-, OT-, physical-, and signal-based vectors: malicious Universal Serial Bus (USB); impersonation, contractor, visitor, biometric, watering hole; Internet of Things (IoT) cameras, sensors, printers; operational technology (OT); lock and key, access vestibule, access passes; Bluetooth, radio frequency (RF), near-field communications (NFC)",
        // 2.4
        "Lifecycle and inventory weaknesses: unsupported products, unpatched systems, obsolete systems, unmanaged systems, ports and services, rogue devices, shadow IT, unmanaged/stale credentials",
        "Application and code vulnerabilities: race conditions -- time-of-check (TOC) and time-of-use (TOU) -- malicious update, hardcoded secrets, unsafe exception handling, and zero-day",
        "Platform and exposure attack surfaces: operating system (OS)-based, virtualization, cryptographic vulnerabilities, misconfiguration, public repositories, public object storage",
        "Newer attack surfaces: wireless and low-powered communications, large language models (LLMs), identity providers, mobile devices",
        // 2.5
        "Given indicators, identify malware attacks: ransomware, trojan, worm, spyware, adware, virus, rootkit, keylogger, logic bomb, fileless malware",
        "Given a scenario, identify physical attacks: tailgating, shoulder surfing, skimming, forced entry",
        "Given traffic or logs, identify network attacks: distributed denial of service (DDoS), protocol downgrade, rogue devices and access points, sniffing, spoofing, on-path, Domain Name System (DNS) attacks, cache poisoning",
        "Given a message or call, identify social engineering attacks: smishing, vishing, phishing, whaling, spear phishing, quishing, impersonation, deepfake",
        "Given application logs, identify application attacks: injection, buffer overflow, replay, privilege escalation, forgery, directory traversal",
        "Given authentication logs, identify credential attacks: password spraying, brute force, user enumeration, replay, multifactor authentication (MFA) bypass",
        "Indicators of compromise: hash, Internet Protocol (IP) address, domain, malicious processes, file system artifacts, timestamp, log manipulation, excessive resource consumption, plaintext strings, account lockout, impossible travel, concurrent sessions",
        // 2.6
        "AI model and data threats: model manipulation, poisoning, evasion, data loss, privacy",
        "AI prompt and runtime threats: prompt injection, jailbreaking, hallucinations, session hijacking, code execution",
        "AI governance concerns: bias, explainability, ethical considerations",
      ],
      labs: [
        null,
        "Look up a recent CVE on nvd.nist.gov, read its CVSS vector string, and explain each metric in it.",
        null,
        null,
        "Collect three phishing or smishing messages from your own inbox or spam folder (do not click) and name the vector and the lure in each.",
        "Review the extensions installed in your own browser and note which can read and change data on every site.",
        "Run a permission-scoped Nmap scan of a home network you administer yourself, with the agreement of everyone who uses it (not shared housing, campus or work Wi-Fi), and record any unexpected open ports or remote-access services.",
        null,
        null,
        "Inventory the devices on your home network from your router's client list and flag any unsupported, unpatched, or unknown ones.",
        null,
        null,
        null,
        null,
        null,
        "Open a sample packet capture (for example, from the Wireshark sample captures page) and find one spoofing, sniffing, or DNS indicator.",
        null,
        null,
        "Given a sample authentication log, write the filter that separates password spraying (many accounts, few passwords) from brute force (one account, many passwords).",
        "Compute the SHA-256 hash of a file you own and search for that hash on VirusTotal -- search the hash only and never upload a private file, because uploads are shared with security researchers; explain what a hash match does and does not prove.",
        null,
        "In an AI chat tool you are allowed to use, try a benign prompt-injection test (for example, a document that tells the model to ignore its instructions) and write up what happened and which control would stop it.",
        null,
      ],
    },
    {
      title: "Security Architecture",
      weight: 19,
      gate: "Given a system design -- cloud, on-premises, OT, or hybrid -- name the architecture's security implications, the missing control and the failure it prevents, the right data protection method for each data state, and the resilience target (RTO/RPO) it can actually meet.",
      objectives: [
        // 3.1
        "Cloud architecture security: serverless, multicloud, deployment models (hybrid, private, public, community), Infrastructure as Code (IaC)",
        "Other infrastructure models and their security implications: OT, on-premises infrastructure, air-gapped network, microservices, logical segmentation, physical segmentation",
        "Technical considerations when choosing an architecture: availability, resilience, proprietary vs. open source, usability, responsibility, compute, power requirements, ease of recovery",
        "Business considerations when choosing an architecture: data sovereignty, data classification, cost, ownership, environmental requirements, scalability, risk",
        // 3.2
        "Given a network diagram, apply infrastructure considerations: device placement, security zones, attack surface, diversity, and failure modes (fail-open versus fail-closed)",
        "Zero Trust architecture: user authentication, device management (health, inventory), application access control",
        "Secure communication/access: virtual private network (VPN), remote access, tunneling, user management, user access with least privilege, end-to-end encrypted messaging, out-of-band management, file transfer, Security Service Edge (SSE)",
        "Identity management in the architecture: Group Managed Service Accounts (gMSAs), least privilege access accounts, privilege creep",
        // 3.3
        "Data types (structured, unstructured), data states (data at rest, data in use, data in transit), and data classifications (sensitive, secret, critical, confidential, public, top secret, restricted)",
        "Methods used to secure data: masking, hashing, filtering, tokenization, encryption, data transpose, deidentification, obfuscation",
        "Data protection roles: data owner, data custodian, data steward, data operator, data controller, data subprocessor",
        "Data handling (endpoints, marking and labeling, geofencing, data location, data placement) and the data management life cycle: creation, management, distribution, retention, disposal",
        "Data compliance categories: standards, health data, personal information, financial, child/minor data, intellectual property, legal data",
        // 3.4
        "Site considerations (hot, cold, warm, environmental) and platform diversity (vendor platform, hardware, virtualization)",
        "Redundancy strategies and solutions: load balancing, clustering, autoscaling, high availability, multicloud systems, storage, and power -- uninterruptible power supply (UPS), redundant power supply (RPS), power generator, surge protector",
        "Backups: retention, immutability, scope, restoration testing",
        "Resilience testing (failover, simulation, parallel processing), disaster recovery, business continuity, and capacity planning",
        "Recovery metrics: recovery time objective (RTO), recovery point objective (RPO), mean time to repair (MTTR), mean time between failures (MTBF)",
      ],
      labs: [
        "Read a small Terraform or CloudFormation template and list which security settings (encryption, public access, logging) are declared in code and which are left to defaults.",
        null,
        null,
        null,
        "Sketch a segmentation diagram separating IoT, guest, and trusted devices into different zones, and mark where a firewall that fails open would hurt you.",
        null,
        "Compare a full-tunnel and a split-tunnel VPN configuration and note which traffic each sends through the tunnel.",
        null,
        null,
        "Take a sample table of customer records and show it masked, tokenized, and hashed; note which form can be reversed and by whom.",
        null,
        null,
        null,
        null,
        "Sketch a redundant web architecture and name the single point of failure each component removes.",
        "Restore one file from your own backup and time it; compare that against the RTO you would have guessed.",
        null,
        "Given a server with MTBF 10,000 hours and MTTR 4 hours, compute its expected availability, explain what the MTTR means for the RTO (recovery time objective) it can meet, and explain why MTBF and MTTR say nothing about RPO (recovery point objective) -- what extra information, such as backup or replication frequency, you would need to state one.",
      ],
    },
    {
      title: "Security Operations",
      weight: 27,
      gate: "Given an operations scenario, apply the right mitigating control, sequence an incident response, prioritize and verify a vulnerability fix, configure identity and access correctly, decide what to automate (and where AI fits), and pull the right log or artifact to prove what happened. Heaviest domain on the exam.",
      objectives: [
        // 4.1
        "Given a scenario, apply core mitigations: segmentation, access controls, hardening, sandboxing, monitoring/alerting, mobile device management (MDM), and application control with allow lists and block lists",
        "Deception and disruption technology: honeypot, honeynet, honeyfile, honeytoken, canary account",
        "Intrusion detection/prevention systems: network-based (NIDS/NIPS), host-based (HIDS/HIPS), and wireless intrusion prevention system (WIPS)",
        "Firewalls: rate-limiting requests, web application firewall (WAF), rule-based, unified threat management (UTM), Layer 4/Layer 7",
        "Content filter -- data loss prevention (DLP), agent-based, centralized proxy -- and endpoint security: endpoint detection and response (EDR), extended detection and response (XDR), antivirus",
        "Network access control: captive portals, 802.1X, endpoint posture/compliance",
        "Repositories (secrets scanning) and application security: input validation, secure cookies, static code analysis, code signing",
        "Email security: Domain-based Message Authentication, Reporting, and Conformance (DMARC), Sender Policy Framework (SPF), DomainKeys Identified Mail (DKIM), Brand Indicators for Message Identification (BIMI)",
        "Operating systems security: Group Policy and Security-enhanced Linux (SELinux)",
        // 4.2
        "Hardware, software, and data asset management life cycle: planning/scoping, acquisition/procurement process, assignment/accounting, monitoring/asset tracking, disposal/decommissioning",
        // 4.3
        "Given a scenario, identify vulnerabilities: scanning, Internet Protocol Address Management (IPAM), cloud security posture management (CSPM), source code review",
        "Prioritization (severity assessment, penetration test report review), remediation, and verification that the fix worked",
        "Vulnerability reporting: internal and external, bounty program, responsible disclosure policies",
        // 4.4
        "Monitoring computing resources (systems, application, infrastructure) and monitoring activities: log aggregation, alerting, scanning, archiving, reporting, alert tuning",
        "Monitoring tools: benchmarks, agents/agentless, security information and event management (SIEM), antivirus, DLP, vulnerability scanners, orchestration, packet analyzer",
        "Monitoring protocols and plumbing: NetFlow, Simple Network Management Protocol (SNMP), syslog, Security Content Automation Protocol (SCAP), automated alerts, port mirroring, dashboards, network management systems",
        // 4.5
        "Given a scenario, manage the account life cycle: provisioning/deprovisioning user accounts, permissions assignments and implications, identity proofing, access review",
        "Federation and single sign-on (SSO): Security Assertions Markup Language (SAML), Lightweight Directory Access Protocol (LDAP), Open authorization (OAuth)",
        "Account types: user, privileged (global, local), service, third-party, emergency access",
        "MFA factors: hard token, soft token, biometrics, one-time password (OTP), backup code",
        "Access control models (rule-based, role-based, time-based, mandatory, discretionary, just-in-time) and access management: authentication and policies, logical/technical and administrative/business",
        "Password concepts: passkey, password managers, passwordless, and password best practices -- length, complexity, reuse, expiration, age, compromised credential monitoring, account auditing, policy report",
        // 4.6
        "Given a scenario, choose use cases of automation and scripting: user provisioning, resource provisioning, desired state management, anomaly detection, ticket management",
        "AI capabilities in security operations: agentic, chatbot, predictive analysis, AI-augmented baselines",
        "Automation considerations: guardrails, automation logic, process engineering, complexity, financial, process risks, deployment",
        "Intended outcomes (efficiency/time saving, enforcing baselines, continuous improvements, productivity improvements, reduced downtime, increased proactivity), SecOps through continuous integration and continuous deployment (CI/CD), and workflows: automation and integrations",
        // 4.7
        "Incident response preparation: training, testing, tabletop exercises, playbooks, simulation, roles",
        "Identification (detection, internal advisory, external advisory, threat hunting) and investigation (digital forensics, chain of custody, e-discovery, preservation)",
        "Containment (quarantine/isolation), negotiation, and eradication/recovery",
        "Notification/external reporting (stakeholders, customers, law enforcement, mandatory) and post-incident work: lessons learned, root cause analysis, post-incident reporting (PIR)",
        // 4.8
        "Given an investigation, pick the log and trace data types: access and accounting (logical, physical), device, server, application, authentication, communication, audit, endpoint, network, metadata",
        "Data sources: vulnerability scans, automated reports, NetFlow/Internet Protocol Flow Information Export (IPFIX), surveillance footage, security tools, dashboards, packet captures",
        "Preserving evidence: file/log integrity and the system image -- memory dump, bit-level copy, snapshot",
        "Investigation stakeholders -- Human Resources (HR), accounts, legal -- and log-parsing techniques",
      ],
      labs: [
        "Turn on the built-in application allow-listing or Smart App Control on a test machine you own and record what it blocks.",
        "Create a honeytoken (a fake credential or canary file) in a lab folder and set up an alert for when it is opened.",
        null,
        "Write three firewall rules for a small web server -- allow 443 from anywhere, allow 22 from one admin IP, deny everything else -- and say which are Layer 4 and what a Layer 7 rule would add.",
        null,
        null,
        "Run a secrets scanner (for example, gitleaks) against one of your own repositories. For anything real it finds, revoke or rotate the secret first, then remove it from the code and from the git history -- deleting it from the latest commit alone leaves it readable in history. Explain why the order matters.",
        "Look up the SPF, DKIM, and DMARC records for a domain with dig or nslookup and explain what the DMARC policy does with failing mail.",
        "On a Linux lab VM, run getenforce and sestatus, then read one SELinux denial in the audit log.",
        null,
        null,
        "Given three findings with CVSS scores and asset context, rank them and write the verification step for the top one.",
        null,
        "Try a free SIEM sandbox and run one search and one alert rule against sample log data; tune the rule to cut a false positive.",
        null,
        "Set up port mirroring on a managed switch or capture on your own interface with tcpdump, and view the flow in a NetFlow or packet analyzer.",
        "Write the deprovisioning checklist for a departing employee and list which systems an access review would catch if a step were missed.",
        "Decode a SAML assertion or OAuth token from a sample (for example, jwt.io's sample token) and identify the issuer, audience, and expiry.",
        null,
        "Enroll an authenticator app and a passkey on an account you own; compare what each defends against.",
        null,
        null,
        "Write a short script that disables accounts inactive for 90 days in a sample CSV, and list the guardrails you would add before running it for real.",
        null,
        null,
        null,
        "Draft a one-page tabletop exercise for a ransomware outbreak: roles, injects, and the decision points.",
        "Write a chain-of-custody log template for a hypothetical laptop seized in an investigation.",
        null,
        null,
        "From a sample Windows Security log, find a failed-then-successful logon sequence and name the event IDs.",
        null,
        "Hash a disk image or file before and after copying it and explain how that proves file integrity in court.",
        "Use grep, awk, or a SIEM query to extract every source IP that failed authentication more than five times in a sample log.",
      ],
    },
    {
      title: "Security Program Management and Oversight",
      weight: 14,
      gate: "Given a governance, vendor, or compliance scenario, name the right artifact or agreement, do the risk math (SLE, ARO, ALE) and pick a treatment, scope an audit or penetration test correctly, and design awareness training that measurably changes behavior.",
      objectives: [
        // 5.1
        "Guidelines (benchmarks, advisories, implementation guides, reference architecture) and standards (baselines, passwords, physical security, request for comments (RFC), encryption)",
        "Procedures -- standard operating procedure (SOP), runbooks -- and plans: business continuity, disaster recovery",
        "Policies: bring your own device (BYOD), acceptable use policy (AUP), clean desk, information security, incident response, data classification and retention, access control, data disposal, vulnerability disclosure, privacy",
        // 5.2
        "Risk identification (asset identification, stakeholder ownership) and risk assessment (scoring, categorization)",
        "Risk analysis: impact, likelihood/probability, owner, current mitigations, qualitative vs. quantitative -- with single loss expectancy (SLE), annualized rate of occurrence (ARO), and annualized loss expectancy (ALE)",
        "Risk register (communication, reviews) and risk treatment: transferring, accepting, avoiding, mitigating",
        "Business-level considerations: business impact analysis, risk appetite, residual risk, stakeholder involvement, management oversight, regulatory, legal",
        // 5.3
        "Vendor selection: request for proposal (RFP), request for information (RFI), request for quote (RFQ), expression of interest (EOI), due diligence, conflict of interest",
        "Agreement types: service-level agreement (SLA), service-level objective (SLO), memorandum of understanding (MOU), memorandum of agreement (MOA), non-disclosure agreement (NDA), master services agreement (MSA), statement of work (SOW)",
        "Vendor monitoring (right to audit, service-level monitoring, vendor registry, vendor assessment, compliance attestation, penetration testing) and rules of engagement",
        "Third-party limitations/constraints: staffing limitations, resource availability, environment, legal and regulatory factors, geography/jurisdiction, financial/return on investment (ROI), vendor lock-in, assurance mechanisms",
        // 5.4
        "Compliance training (data handling, anti-money laundering/counter-terrorism financing (AML/CTF), anti-bribery) and compliance monitoring (attestations, acknowledgments)",
        "Consequences of non-compliance: reputational damage, financial, legal, contractual, sanctions, loss of license",
        "Privacy (right to be forgotten, opt-in or opt-out, data correction, processing restrictions, processing prevention, controller vs. processor, ownership) and legal compliance (legal hold, legal orders, data retention requirements)",
        // 5.5
        "Audit data gathering: sampling, questionnaires/surveys, interviews, assertion, and reference sources -- MITRE ATT&CK, Cyber Kill Chain, Diamond Model of Intrusion Analysis",
        "Audit scoping (audit charter, frequency) and engagement types: gap analysis; internal (compliance, audit committee, self-assessments); external (examinations, assessments, regulatory, independent third-party audits); benchmarking",
        "Penetration testing: known environment, unknown environment, partially known environment; physical, offensive, defensive, integrated; passive and active reconnaissance",
        "Frameworks and standards (industry-based standards, international standards, region-specific standards), functional testing, behavioral testing",
        // 5.6
        "Given a scenario, choose types of training (initial/onboarding, ongoing, targeted, corrective) and delivery mechanisms (learning management system (LMS), self-service portals, one-to-one, one-to-many)",
        "Reporting and monitoring of effectiveness: metrics, managerial reports, personnel behavior risk scoring",
        "Common training topics: social engineering, emerging security topics, password and credential management, remote work/teleworking/hybrid, BYOD, business email compromise (BEC), removable media and cables, situational awareness, operational security",
      ],
      labs: [
        null,
        null,
        "Read your employer's or school's acceptable use policy and list which policy types from this objective it covers and which it leaves out.",
        null,
        "A laptop worth $2,000 holding data that costs $48,000 to breach-notify is lost about twice a year: compute SLE, ARO, and ALE, and say how much full-disk encryption is worth spending per year.",
        "Start a five-row risk register for a small business: risk, owner, likelihood, impact, current mitigations, and chosen treatment.",
        null,
        null,
        "Read a public cloud provider's SLA and note what it promises, what it excludes, and what you get when it is missed.",
        null,
        null,
        null,
        null,
        null,
        "Map the steps of a known breach write-up onto the Cyber Kill Chain and the MITRE ATT&CK tactics.",
        null,
        "Write rules of engagement for a partially known environment penetration test of a small office: scope, exclusions, timing, and contacts.",
        null,
        null,
        "Pick three metrics that would show a phishing-awareness program is working and how you would collect each.",
        null,
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// REQ-244: the Python and JavaScript courses verified against their language
// references on 2026-11-11. Every page below was read in full that day at its
// own URL (no summaries). Each unit's objectives, gate and key facts were
// compared with them: nothing teaches a removed or outdated feature as
// current, so no objective changed. What a lesson writer would otherwise get
// wrong from memory of an older version is pinned as the unit's keyValues
// (lib/current-facts.ts gives them to the writer and the fact-checker).
//
// Review date: Nick, 2026-11-11, chose the repo's 12-month default for the
// technology_aligned courses (over tying each to its next language release),
// matching the curriculum source's own re-check at checkedAt + 12 months
// (COURSE_RECHECK_MONTHS).
// ---------------------------------------------------------------------------
const LANG_CHECKED = "2026-11-11";
const LANG_VERIFIED_AT = "2026-11-11T00:00:00Z";
const LANG_REVIEW_DUE_AT = "2027-11-11T00:00:00Z";
const langRef = (title: string, url: string, keyValues?: string[]): UnitSource =>
  keyValues ? { title, url, kind: "reference", checkedAt: LANG_CHECKED, keyValues } : { title, url, kind: "reference", checkedAt: LANG_CHECKED };

const PY = {
  versions: langRef("Status of Python versions (Python Developer's Guide)", "https://devguide.python.org/versions/", [
    "Python 3.15 is the newest feature release (3.15.0 released 2026-10-09; 3.15.2, released 2026-10-25, is the current release on python.org/downloads)",
    "3.14 and 3.15 are the bugfix branches; 3.11, 3.12 and 3.13 get security fixes only; 3.10 reached end of life on 2026-10-01",
    "Python 3.16 is scheduled for 2027-10-06 (PEP 826)",
  ]),
  docs: langRef("The Python documentation (Python 3.15.2)", "https://docs.python.org/3/"),
  controlFlow: langRef("The Python Tutorial: More Control Flow Tools", "https://docs.python.org/3/tutorial/controlflow.html"),
  glossary: langRef("Python glossary: parameter, global interpreter lock", "https://docs.python.org/3/glossary.html", [
    "There are five kinds of parameter: positional-or-keyword, positional-only (before a / in the parameter list), keyword-only (after * or *args), var-positional (*args) and var-keyword (**kwargs)",
  ]),
  sys: langRef("sys: getrecursionlimit and setrecursionlimit", "https://docs.python.org/3/library/sys.html", [
    "The recursion limit is read with sys.getrecursionlimit() and changed with sys.setrecursionlimit(); the highest possible limit is platform-dependent",
  ]),
  dataStructures: langRef("The Python Tutorial: Data Structures", "https://docs.python.org/3/tutorial/datastructures.html"),
  whatsNew315: langRef("What's new in Python 3.15", "https://docs.python.org/3/whatsnew/3.15.html", [
    "New in 3.15 only: a built-in frozendict (PEP 814), immutable and hashable when its keys and values are, not a subclass of dict",
    "New in 3.15 only: * and ** unpacking inside comprehensions and generator expressions (PEP 798), e.g. [*L for L in lists]; on 3.14 and earlier write the nested comprehension or itertools.chain",
  ]),
  inputOutput: langRef("The Python Tutorial: Input and Output (reading and writing files)", "https://docs.python.org/3/tutorial/inputoutput.html"),
  open: langRef("Built-in functions: open()", "https://docs.python.org/3/library/functions.html#open", [
    "Since Python 3.15 (PEP 686) text files opened without an encoding argument use UTF-8 regardless of the system locale; on 3.14 and earlier the default was the locale encoding",
    "Pass encoding=\"utf-8\" explicitly for code that must behave the same on every supported version; encoding=\"locale\" asks for the locale encoding; PYTHONUTF8=0 or -X utf8=0 restores the old default",
  ]),
  errors: langRef("The Python Tutorial: Errors and Exceptions", "https://docs.python.org/3/tutorial/errors.html", [
    "Since Python 3.14 (PEP 765) a return, break or continue that leaves a finally block raises a SyntaxWarning: it silently discards the exception or return value from the try block",
    "Since Python 3.14 (PEP 758) several exception types may be listed without parentheses (except TimeoutError, ConnectionRefusedError:) only when there is no as clause; the parenthesized tuple form works on every version",
  ]),
  classes: langRef("The Python Tutorial: Classes", "https://docs.python.org/3/tutorial/classes.html", [
    "A name with two leading underscores (at most one trailing) inside a class is name-mangled to _ClassName__name; it is a convention against accidental clashes, not access control",
  ]),
  modules: langRef("The Python Tutorial: Modules and packages", "https://docs.python.org/3/tutorial/modules.html"),
  venv: langRef("The Python Tutorial: Virtual Environments and Packages", "https://docs.python.org/3/tutorial/venv.html", [
    "Create an environment with python -m venv <dir> and install into it with python -m pip install",
    "New in 3.15 only: explicit lazy imports with the lazy soft keyword (lazy import json, PEP 810) defer loading until first use; a plain import statement is unchanged",
  ]),
  functools: langRef("functools: higher-order functions", "https://docs.python.org/3/library/functools.html", [
    "reduce lives in functools (from functools import reduce); it is not a built-in in Python 3",
  ]),
  itertools: langRef("itertools: functions creating iterators", "https://docs.python.org/3/library/itertools.html"),
  typing: langRef("typing: support for type hints", "https://docs.python.org/3/library/typing.html"),
  whatsNew314: langRef("What's new in Python 3.14", "https://docs.python.org/3.14/whatsnew/3.14.html", [
    "Since Python 3.14 (PEP 649, PEP 749) annotations are evaluated lazily, only when something asks for them, unless from __future__ import annotations is used",
  ]),
  pdb: langRef("pdb: the Python debugger", "https://docs.python.org/3/library/pdb.html", [
    "Call the built-in breakpoint() to stop in pdb at that line",
  ]),
  pep8: langRef("PEP 8: Style Guide for Python Code", "https://peps.python.org/pep-0008/"),
  pytest: langRef("pytest documentation", "https://docs.pytest.org/en/stable/"),
  freeThreading: langRef("Python support for free threading (HOWTO)", "https://docs.python.org/3/howto/free-threading-python.html", [
    "The standard CPython build has a global interpreter lock: only one thread runs Python bytecode at a time, though the GIL is released during I/O and by some extensions in heavy computation",
    "The free-threaded build (GIL disabled) has existed since 3.13 and has been officially supported but optional since 3.14 (PEP 779); it is a separate build, not the default, and some extension modules re-enable the GIL",
  ]),
  asyncio: langRef("asyncio: asynchronous I/O", "https://docs.python.org/3/library/asyncio.html", [
    "Start a program's top-level coroutine with asyncio.run(main())",
    "The asyncio event-loop policy system (get_event_loop_policy, set_event_loop_policy and the policy classes) is deprecated and scheduled for removal in 3.16; choose a loop with asyncio.run(..., loop_factory=...) instead",
  ]),
  profiling: langRef("What's new in Python 3.15: PEP 799 profiling package", "https://docs.python.org/3/whatsnew/3.15.html#pep-799-a-dedicated-profiling-package", [
    "In Python 3.15 the deterministic profiler is profiling.tracing (relocated from cProfile, PEP 799); cProfile remains as an alias, and is the name that works on 3.14 and earlier",
    "The pure-Python profile module is deprecated in 3.15 and scheduled for removal in 3.17; do not teach it as the profiler to use",
  ]),
};

// ---------------------------------------------------------------------------
// Python: intro -> intermediate -> advanced progression, one language track.
// ---------------------------------------------------------------------------
export const PYTHON_TRACK: SeedTrack = {
  code: "PYTHON",
  // REQ-252: phase 1 pilot of the level-aware lesson flow.
  levelFlow: true,
  title: "Python Programming Coach",
  description:
    "9-week intro-to-advanced Python progression: syntax and control flow through OOP, the standard library, functional patterns, testing/typing, and concurrency.",
  trackType: "graduate",
  subcategorySlug: "programming-languages",
  // REQ-142: no exam; built on the language itself. Python 3.15 is the newest
  // feature release (3.15.0 on 2026-10-09; docs.python.org shows "Python
  // 3.15.2 documentation", python.org/downloads, first read 2026-11-08).
  // Nothing in the units below depends on a 3.15-only feature.
  // REQ-244: re-read 2026-11-11 (the docs, the devguide's version table and
  // python.org/downloads still say what is recorded here) and every unit
  // compared with the pages in its sources.
  freshnessModel: "technology_aligned",
  sourceVerifiedAt: LANG_VERIFIED_AT,
  contentReviewDueAt: LANG_REVIEW_DUE_AT,
  curriculum: {
    kind: "language_reference",
    name: "The Python documentation (docs.python.org)",
    version: "Python 3.15",
    url: "https://docs.python.org/3/",
    checkedAt: LANG_CHECKED,
  },
  units: [
    {
      title: "Syntax, variables & control flow",
      rangeLabel: "Week 1",
      gate: "Given an unfamiliar short Python script, trace its execution by hand and predict its output, including any conditional branches or loop iterations.",
      sources: [PY.versions, PY.docs, PY.controlFlow],
      objectives: [
        "Variables, dynamic typing, and Python's core built-in types (int, float, str, bool, None)",
        "Operators: arithmetic, comparison, logical, and operator precedence",
        "Input/output with input() and print(), including f-strings",
        "Conditional logic: if/elif/else and truthiness",
        "Loops: for, while, range(), break, continue, and the loop else clause",
        "Writing and reading a simple script end-to-end",
      ],
    },
    {
      title: "Functions & scope",
      rangeLabel: "Week 2",
      gate: "Write a function with default and keyword arguments, explain what its scope can and cannot see, and predict the behavior of a mutable-default-argument bug.",
      sources: [PY.glossary, PY.sys, PY.controlFlow],
      objectives: [
        "Defining functions: positional, keyword, default, and *args/**kwargs parameters",
        "Return values vs. side effects; functions that implicitly return None",
        "Local, enclosing, and global scope (the LEGB rule)",
        "Docstrings and basic function documentation conventions",
        "Recursion: base case, recursive case, and stack depth limits",
        "The mutable-default-argument pitfall and how to avoid it",
      ],
    },
    {
      title: "Core data structures",
      rangeLabel: "Week 3",
      gate: "Given a data-shape problem, choose the correct built-in container (list/tuple/dict/set), justify the choice, and write the comprehension that builds it in one line.",
      sources: [PY.dataStructures, PY.whatsNew315],
      objectives: [
        "Lists: indexing, slicing, mutation, and common methods",
        "Tuples and immutability; when to prefer a tuple over a list",
        "Dictionaries: keys, values, items, lookups, and default patterns",
        "Sets: membership testing and set operations (union, intersection, difference)",
        "List, dict, and set comprehensions",
        "Nested data structures (lists of dicts, dicts of lists)",
      ],
    },
    {
      title: "Strings, files & error handling",
      rangeLabel: "Week 4",
      gate: "Given a program that must read a file and may fail, write correct exception handling that fails safely, and explain which exception type it should catch and why.",
      sources: [PY.inputOutput, PY.open, PY.errors],
      objectives: [
        "String methods: splitting, joining, formatting, searching",
        "Reading and writing text files; the with statement and context managers",
        "Working with CSV and JSON data via the standard library",
        "Exceptions: try/except/else/finally, raising exceptions, custom exception classes",
        "Catching specific exception types vs. a bare except",
      ],
    },
    {
      title: "Object-oriented programming",
      rangeLabel: "Week 5",
      gate: "Design a small class hierarchy for a stated problem, correctly use inheritance vs. composition, and explain what each dunder method you used actually does.",
      sources: [PY.classes],
      objectives: [
        "Classes, instances, attributes, and methods",
        "__init__, self, and instance vs. class attributes",
        "Inheritance, method overriding, and super()",
        "Composition vs. inheritance -- when to prefer each",
        "Common dunder methods: __str__, __repr__, __eq__, __len__",
        "Encapsulation conventions (single/double underscore) and properties",
      ],
    },
    {
      title: "Modules, packages & the standard library",
      rangeLabel: "Week 6",
      gate: "Set up an isolated virtual environment for a project, install a real dependency, and explain the difference between a module, a package, and a distributed library.",
      sources: [PY.modules, PY.venv],
      objectives: [
        "Importing modules and packages; relative vs. absolute imports",
        "Organizing a project into modules and packages with __init__.py",
        "Virtual environments (venv) and dependency isolation",
        "Installing and pinning dependencies with pip and requirements.txt",
        "Useful standard library modules: os, sys, datetime, collections, itertools",
      ],
    },
    {
      title: "Functional patterns & iterators",
      rangeLabel: "Week 7",
      gate: "Given a data-processing task, write it as a generator pipeline instead of loading everything into memory, and explain why that matters at scale.",
      sources: [PY.functools, PY.itertools, PY.glossary],
      objectives: [
        "Iterators and the iterator protocol (__iter__, __next__)",
        "Generators and yield; generator expressions",
        "First-class functions: passing functions as arguments, lambda expressions",
        "map, filter, functools.reduce, and itertools essentials",
        "Closures and what they actually capture",
        "Decorators: what they are, how to write one, common built-in examples",
      ],
    },
    {
      title: "Testing, debugging & typing",
      rangeLabel: "Week 8",
      gate: "Given a small buggy module, write a failing test that reproduces the bug, fix the bug, and add type hints that would have caught the class of error statically.",
      sources: [PY.pytest, PY.pdb, PY.typing, PY.whatsNew314, PY.pep8],
      objectives: [
        "Writing unit tests with pytest: assertions, fixtures, parametrization",
        "Debugging techniques: reading tracebacks, using a debugger, print-driven debugging tradeoffs",
        "Type hints: basic annotations, optional values (X | None), built-in generics (list[int], dict[str, int]), and static checking with mypy",
        "Code style and linting (PEP 8, flake8/ruff) and why consistency matters",
      ],
    },
    {
      title: "Concurrency, performance & a capstone project",
      rangeLabel: "Week 9",
      gate: "Explain when threading, multiprocessing, or asyncio is the right tool for a stated I/O-bound or CPU-bound problem, and justify your choice against the alternatives.",
      sources: [PY.freeThreading, PY.asyncio, PY.profiling],
      objectives: [
        "The Global Interpreter Lock (GIL) and what it does and doesn't limit",
        "Threading for I/O-bound work vs. multiprocessing for CPU-bound work",
        "Asynchronous programming with async/await and asyncio basics",
        "Basic performance profiling (timeit, cProfile) before optimizing",
        "Consuming a real HTTP API with the requests library and handling JSON responses",
        "Integrating prior units into one small end-to-end project",
      ],
    },
  ],
};

const MDN = "https://developer.mozilla.org/en-US/docs/";
const JS = {
  ecma262: langRef("ECMA-262 ECMAScript Language Specification (Ecma International)", "https://ecma-international.org/publications-and-standards/standards/ecma-262/", [
    "The current edition is ECMA-262 17th edition, ECMAScript 2026, June 2026; a new edition is published every June",
  ]),
  var: langRef("MDN: var", `${MDN}Web/JavaScript/Reference/Statements/var`, [
    "A var declaration is hoisted to the top of its function or script but its initialization is not: before the assignment runs the variable is undefined",
  ]),
  equality: langRef("MDN: Equality comparisons and sameness", `${MDN}Web/JavaScript/Guide/Equality_comparisons_and_sameness`),
  arrow: langRef("MDN: Arrow function expressions", `${MDN}Web/JavaScript/Reference/Functions/Arrow_functions`, [
    "Arrow functions have no own this, arguments or super binding (they use the enclosing scope's) and should not be used as methods",
  ]),
  thisRef: langRef("MDN: this", `${MDN}Web/JavaScript/Reference/Operators/this`),
  let: langRef("MDN: let", `${MDN}Web/JavaScript/Reference/Statements/let`, [
    "let, const and class bindings are in a temporal dead zone from the start of the block until the declaration runs; reading them earlier throws a ReferenceError",
  ]),
  closures: langRef("MDN: Closures", `${MDN}Web/JavaScript/Guide/Closures`),
  structuredClone: langRef("MDN: structuredClone()", `${MDN}Web/API/Window/structuredClone`, [
    "structuredClone(value) makes a deep copy with the structured clone algorithm and is Baseline (widely available); spread and Object.assign copy only one level",
  ]),
  events: langRef("MDN: Introduction to events", `${MDN}Learn_web_development/Core/Scripting/Events`),
  preventDefault: langRef("MDN: Event.preventDefault()", `${MDN}Web/API/Event/preventDefault`),
  executionModel: langRef("MDN: JavaScript execution model (job queue and event loop)", `${MDN}Web/JavaScript/Reference/Execution_model`, [
    "A completed asynchronous action (a promise then() handler, a setTimeout callback, an event handler) runs as a job from the queue once the call stack is empty; HTML event loops split jobs into tasks and microtasks, and the microtask queue is drained before the next task is taken",
  ]),
  promise: langRef("MDN: Promise", `${MDN}Web/JavaScript/Reference/Global_Objects/Promise`),
  fetch: langRef("MDN: Using the Fetch API", `${MDN}Web/API/Fetch_API/Using_Fetch`, [
    "fetch() rejects on errors such as a network failure or a bad scheme, but an HTTP error status such as 404 still fulfills with a Response, so check response.ok (true for 200-299) or response.status before reading the body",
  ]),
  modules: langRef("MDN: JavaScript modules", `${MDN}Web/JavaScript/Guide/Modules`, [
    "In the browser load a module with <script type=\"module\">; in Node.js use the .mjs extension or \"type\": \"module\" in the nearest package.json",
  ]),
  classes: langRef("MDN: Classes", `${MDN}Web/JavaScript/Reference/Classes`),
  finished: langRef("TC39 finished proposals", "https://github.com/tc39/proposals/blob/main/finished-proposals.md", [
    "Temporal and explicit resource management (using declarations) are finished proposals listed for ECMAScript 2027, not part of ECMAScript 2026; say which engines support them before relying on them",
  ]),
  prototypes: langRef("MDN: Inheritance and the prototype chain", `${MDN}Web/JavaScript/Guide/Inheritance_and_the_prototype_chain`, [
    "Read and set an object's prototype with Object.getPrototypeOf / Object.setPrototypeOf, or create one with Object.create; MDN describes the __proto__ accessor as non-standard, so new code should not use it",
  ]),
  jest: langRef("Jest: Getting Started", "https://jestjs.io/docs/getting-started"),
  nodeTest: langRef("Node.js API: test runner (node:test)", "https://nodejs.org/api/test.html", [
    "Node.js has a built-in test runner, node:test, stable since Node.js 20",
  ]),
  nodeReleases: langRef("Node.js releases", "https://nodejs.org/en/about/previous-releases", [
    "Node.js 26 is the Active LTS line (LTS since 2026-10-28); 24 and 22 are in maintenance (22 ends 2027-04-30); 20 reached end of life on 2026-04-30",
    "Production applications should use Active LTS or Maintenance LTS releases; from Node.js 27 there is one major release a year and every major becomes LTS",
  ]),
  nodeModules: langRef("Node.js API: CommonJS modules", "https://nodejs.org/api/modules.html", [
    "require() can load an ES module (no longer experimental as of Node.js 25.4.0) only if that module is fully synchronous, with no top-level await",
  ]),
  nodeEsm: langRef("Node.js API: ECMAScript modules", "https://nodejs.org/api/esm.html"),
};

// ---------------------------------------------------------------------------
// JavaScript: intro -> intermediate -> advanced progression, one language track.
// ---------------------------------------------------------------------------
export const JAVASCRIPT_TRACK: SeedTrack = {
  code: "JAVASCRIPT",
  // REQ-252: phase 1 pilot of the level-aware lesson flow.
  levelFlow: true,
  title: "JavaScript Programming Coach",
  description:
    "9-week intro-to-advanced JavaScript progression: syntax and the DOM through async patterns, ES6+, prototypes, testing/tooling, and Node.js.",
  trackType: "graduate",
  subcategorySlug: "programming-languages",
  // REQ-142: no exam; built on the language standard. ECMA-262 17th edition,
  // ECMAScript 2026, June 2026, is the current edition on Ecma's page (read
  // 2026-11-08). REQ-244: re-read 2026-11-11, still the current edition, and
  // every unit compared with the MDN, TC39 and Node.js pages in its sources.
  freshnessModel: "technology_aligned",
  sourceVerifiedAt: LANG_VERIFIED_AT,
  contentReviewDueAt: LANG_REVIEW_DUE_AT,
  curriculum: {
    kind: "language_reference",
    name: "ECMA-262 ECMAScript Language Specification",
    version: "ECMAScript 2026 (17th edition, June 2026)",
    url: "https://ecma-international.org/publications-and-standards/standards/ecma-262/",
    checkedAt: LANG_CHECKED,
  },
  units: [
    {
      title: "Syntax, variables & control flow",
      rangeLabel: "Week 1",
      gate: "Given an unfamiliar short JS snippet using var, let, and const, predict its output and explain any hoisting or scoping surprise it contains.",
      sources: [JS.ecma262, JS.var, JS.equality],
      objectives: [
        "Variables: var vs. let vs. const, and why hoisting makes var risky",
        "Primitive types, typeof, and type coercion pitfalls (== vs. ===)",
        "Operators and expressions; operator precedence",
        "Conditional logic: if/else, switch, and the ternary operator",
        "Loops: for, while, for...of, for...in, and when to use each",
      ],
    },
    {
      title: "Functions & scope",
      rangeLabel: "Week 2",
      gate: "Write both a function declaration and an equivalent arrow function for a stated task, and explain a concrete case where the difference in `this` binding would matter.",
      sources: [JS.arrow, JS.thisRef, JS.let, JS.closures],
      objectives: [
        "Function declarations vs. function expressions vs. arrow functions",
        "Parameters: default values, rest parameters",
        "Scope: function scope vs. block scope, and the temporal dead zone",
        "Closures: what they capture and a real use case for one",
        "Understanding `this` in different call contexts",
      ],
    },
    {
      title: "Objects & arrays",
      rangeLabel: "Week 3",
      gate: "Given a nested object and array of data, write a transformation using destructuring, spread, and array methods (map/filter/reduce) without a manual for-loop.",
      sources: [JS.structuredClone],
      objectives: [
        "Object literals, property access, and shorthand syntax",
        "Array methods: map, filter, reduce, find, some, every",
        "Destructuring assignment for objects and arrays",
        "Spread and rest syntax in object/array contexts",
        "Shallow vs. deep copying, and why reference semantics matter",
      ],
    },
    {
      title: "The DOM & events",
      rangeLabel: "Week 4",
      gate: "Given a page layout, write vanilla JS that selects the right elements, updates the DOM in response to a user event, and avoids common event-handling bugs (e.g. missing preventDefault).",
      sources: [JS.events, JS.preventDefault],
      objectives: [
        "Selecting and traversing the DOM (querySelector, closest, parent/child access)",
        "Creating, modifying, and removing DOM nodes",
        "Event listeners: bubbling, capturing, delegation, and preventDefault",
        "Working with forms and form validation",
        "Basic accessibility considerations when manipulating the DOM",
      ],
    },
    {
      title: "Asynchronous JavaScript",
      rangeLabel: "Week 5",
      gate: "Given a sequence of dependent network calls, write it correctly with async/await including error handling, and explain what the event loop is doing while it waits.",
      sources: [JS.executionModel, JS.promise, JS.fetch],
      objectives: [
        "The event loop, call stack, and task queue (conceptual model)",
        "Callbacks and callback hell -- what async/await actually replaces",
        "Promises: states, .then/.catch/.finally, Promise.all",
        "async/await syntax and error handling with try/catch",
        "Fetching data with the Fetch API and handling JSON responses",
      ],
    },
    {
      title: "ES6+ features & modules",
      rangeLabel: "Week 6",
      gate: "Refactor a script that uses global variables and string concatenation into ES modules with template literals and proper imports/exports.",
      sources: [JS.modules, JS.classes, JS.finished],
      objectives: [
        "Template literals and tagged templates",
        "ES modules: import/export, default vs. named exports",
        "Classes: constructor, methods, inheritance, static members",
        "Map and Set as alternatives to plain objects/arrays",
        "Optional chaining and nullish coalescing",
      ],
    },
    {
      title: "Prototypes, higher-order functions & patterns",
      rangeLabel: "Week 7",
      gate: "Explain the prototype chain for a given object, predict a property lookup, and rewrite a repeated pattern using a higher-order function.",
      sources: [JS.prototypes],
      objectives: [
        "The prototype chain and how method lookup actually works",
        "Object.create and prototypal inheritance vs. classical inheritance",
        "Higher-order functions: functions that take or return functions",
        "Currying and function composition basics",
        "Common design patterns in JS: module pattern, observer pattern",
      ],
    },
    {
      title: "Testing & tooling",
      rangeLabel: "Week 8",
      gate: "Given a small buggy function, write a failing Jest test that reproduces the bug, fix it, and explain what a linter/bundler in your toolchain would have caught earlier.",
      sources: [JS.jest, JS.nodeTest],
      objectives: [
        "Writing unit tests with Jest: assertions, mocks, test structure",
        "Debugging in browser devtools and Node (breakpoints, console techniques)",
        "Linting and formatting (ESLint, Prettier) and why consistency matters in teams",
        "What a bundler (e.g. Vite/webpack) actually does and why one is needed",
        "npm basics: package.json, scripts, semantic versioning",
      ],
    },
    {
      title: "Node.js & building a small API",
      rangeLabel: "Week 9",
      gate: "Build a minimal Node HTTP/Express endpoint that accepts a request, validates input, and returns JSON -- and explain what happens if two requests arrive concurrently.",
      sources: [JS.nodeReleases, JS.nodeModules, JS.nodeEsm],
      objectives: [
        "Node.js runtime basics: modules, the require/import system, npm scripts",
        "Building a simple HTTP server or Express route",
        "Handling JSON request/response bodies and status codes",
        "Environment variables and basic configuration management",
        "Integrating prior units into one small end-to-end project",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA Linux+ (XK0-006). Domain weights verified live against comptia.org.
// ---------------------------------------------------------------------------
export const LINUXPLUS_TRACK: SeedTrack = {
  code: "LINUXPLUS",
  title: "Prep for CompTIA Linux+",
  description: "CompTIA Linux+ XK0-006 exam prep across 5 weighted domains, with hands-on shell labs.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/linux/",
  sourceVerifiedAt: COMPTIA_VERIFIED_AT,
  // Source: https://www.comptia.org/en-us/certifications/linux/ -- Linux+ V8
  // (XK0-006), launched 2025-07-15, retirement "estimated 2028", no newer
  // version announced; max 90 questions, multiple choice and
  // performance-based; 90 minutes; pass 720 on 100-900. Domain weights
  // 23/20/22/18/17 match the units below (the page lists Security and
  // Automation before Troubleshooting; unit order is kept so row identity
  // does not move).
  credential: {
    ...COMPTIA,
    credentialSlug: "linux-plus",
    credentialName: "CompTIA Linux+",
    credentialUrl: "https://www.comptia.org/en-us/certifications/linux/",
    examCode: "XK0-006",
    examRevision: "V8",
    status: "active",
    effectiveDate: "2025-07-15",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/linux/",
    lastVendorVerifiedAt: COMPTIA_VERIFIED_AT,
    recommendedExperience:
      "About 12 months of hands-on Linux server experience; CompTIA A+, Network+, or Server+ (or comparable knowledge) recommended.",
    durationMinutes: 90,
    questionFormat: "Maximum 90 questions; multiple choice and performance-based",
    passingScorePolicy: "720 on a scale of 100-900.",
  },
  units: [
    {
      title: "System Management",
      weight: 23,
      gate: "Given a Linux system in an unfamiliar state, correctly identify installed packages, running services, and storage layout using only command-line tools.",
      objectives: [
        "Boot process, GRUB, and systemd targets",
        "Package management across distributions (apt, dnf/yum, pacman, rpm)",
        "Filesystem hierarchy standard and mounting/unmounting storage",
        "Disk partitioning, LVM concepts, and filesystem types (ext4, xfs, btrfs)",
        "systemd service management (systemctl, journalctl)",
        "Kernel modules and basic kernel parameter tuning",
        "Managing users, groups, and permissions at the system level",
      ],
      labs: [
        "Use lsblk and df -h to map your own system's disk layout and mounted filesystems.",
        null,
        null,
        null,
        "Use systemctl and journalctl to inspect the status and recent logs of a running service.",
        null,
        null,
      ],
    },
    {
      title: "Services and User Management",
      weight: 20,
      gate: "Given a multi-user Linux server scenario, correctly set up user accounts, group-based permissions, and a common network service, explaining each access-control decision.",
      objectives: [
        "Creating and managing users and groups (useradd, usermod, groups)",
        "File permissions and ownership: rwx, chmod, chown, umask",
        "Special permissions: SUID, SGID, sticky bit",
        "Common network services: SSH, web servers, printing, time sync (NTP)",
        "Environment variables and shell configuration files",
        "Print and email service basics (CUPS, mail transfer agents, conceptually)",
      ],
      labs: [
        "Create a new user and group on a test VM, then verify permissions with ls -l and id.",
        null,
        null,
        "Generate an SSH key pair and configure key-based login to a test host.",
        null,
        null,
      ],
    },
    {
      title: "Troubleshooting",
      weight: 22,
      gate: "Given symptoms of a broken Linux system (won't boot, service down, disk full, network unreachable), diagnose root cause using systematic command-line investigation, not guesswork.",
      objectives: [
        "Systematic troubleshooting methodology for Linux systems",
        "Diagnosing boot failures and using rescue/single-user mode",
        "Diagnosing storage issues: full disks, inode exhaustion, failing drives",
        "Diagnosing network issues: ip, ping, traceroute, ss, DNS resolution",
        "Diagnosing performance issues: top/htop, load average, memory and swap usage",
        "Reading and interpreting system logs for root-cause analysis",
      ],
      labs: [
        null,
        null,
        "Use df -i and du to find what is consuming disk space or inodes on a test system.",
        "Use ss -tulpn to identify which process is listening on a given port.",
        null,
        null,
      ],
    },
    {
      title: "Security",
      weight: 18,
      gate: "Given a freshly installed Linux server, apply a baseline hardening pass and explain what each control actually defends against.",
      objectives: [
        "User authentication hardening: password policies, sudo configuration",
        "Firewall basics: iptables/nftables or firewalld concepts",
        "SELinux/AppArmor mandatory access control concepts",
        "File integrity and permission auditing",
        "SSH hardening: key-only auth, disabling root login",
        "Basic encryption at rest (LUKS) and in transit (TLS/SSH) concepts",
      ],
      labs: [
        null,
        "Configure a basic firewalld or nftables rule to allow only SSH and HTTP on a test host.",
        null,
        null,
        "Harden a test SSH server by disabling password authentication and root login. Before you restart sshd, confirm key-based login works in a second session and keep your current session open, so a mistake cannot lock you out of a remote machine.",
        null,
      ],
    },
    {
      title: "Automation, Orchestration, and Scripting",
      weight: 17,
      gate: "Write a short Bash script that automates a real multi-step admin task (e.g. log rotation or backup) using variables, conditionals, and a loop, and schedule it correctly.",
      objectives: [
        "Bash scripting fundamentals: variables, conditionals, loops, functions",
        "Shell automation scheduling: cron, at, and systemd timers",
        "Basic regular expressions with grep/sed/awk for text processing",
        "Version control basics with git for configuration and scripts",
        "Configuration management and infrastructure-as-code concepts (Ansible-style, conceptual)",
        "Containers: what a container is, basic Docker commands (run, ps, images)",
      ],
      labs: [
        "Write a short Bash script that finds and archives log files older than 7 days.",
        null,
        null,
        null,
        null,
        "Run a container image locally with docker run and inspect it with docker ps.",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA CySA+ -- CS0-004 (V4), rebased from CS0-003 (V3) by REQ-103.
//
// Sources, read 2026-11-07:
//   - V4 exam page: https://www.comptia.org/en-us/certifications/cybersecurity-analyst/v4/
//     -- CS0-004, launched 2026-06-23, max 85 questions, 165 minutes, pass
//     750 on 100-900, "About 4 years in a SOC analyst or vulnerability
//     analyst role", four domains 34/26/24/16. The page does not state
//     question types or link the objectives PDF.
//   - Full V4 objectives PDF: "CompTIA Cybersecurity Analyst (CySA+)
//     Certification Exam Objectives, EXAM NUMBER: CS0-004 V4", Exam
//     Objectives Document Version 2.0, on CompTIA's own document host (the
//     same host the comptia.org Security+ V8 page links its PDF from):
//     https://lecbyo.files.cmp.optimizely.com/download/68b1eae88e5011f08868a275d699e612
//     Found through a web search, not through a link on comptia.org; its
//     test details and domain table match the V4 page exactly, and it gives
//     the question types ("Multiple-choice and performance-based") and the
//     experience line ("4 years of hands-on experience in a SOC analyst
//     (level 2) or vulnerability analyst role") used below.
//   - V3 retirement: https://www.comptia.org/en-us/certifications/cybersecurity-analyst/v3/
//     -- "CySA+ V3 will retire in English on December 22, 2026" (Japanese,
//     Portuguese, Spanish on 2027-03-23; this course is English).
//
// HOW THE SWITCH IS MODELLED -- retire-and-append, as AWSSAP did for
// SAP-C03 (tracks/aws.ts):
//   - The four CS0-003 units stay at sort_order 0-3 with retiredAt set. Their
//     objective rows keep their text and ids, so every learner's mastery,
//     attempts, error log and cached lessons on them survive; the app stops
//     listing them once retiredAt passes. retiredAt is 2026-12-23T12:00Z,
//     after 2026-12-22 (English CS0-003's last day) has ended in every time
//     zone, so a learner sitting CS0-003 before then keeps the V3 units.
//   - The four CS0-003 unit *titles* gain " (CS0-003)": V3 and V4 use the
//     same four domain names, and until 2026-12-23 both sets are listed side
//     by side. Only unit titles change; no objective text does (rewriting an
//     objective would re-point learner mastery at different content).
//   - The four CS0-004 domains are new units at sort_order 4-7 with new
//     objective rows. Mastery is not copied across: V4 regroups the content
//     (AI in security operations, tool-by-tool output analysis, EPSS, BAS
//     tools are new) and carried-over mastery would claim evidence the
//     learner never produced on that objective.
//   - credential_exams gets a new CS0-004 row; the CS0-003 row is kept,
//     marked superseded_by CS0-004 with retirement_date 2026-12-22.
//
// Every CS0-004 objective groups one sub-heading (or a few small ones) of an
// official objective (1.1 ... 4.2) and names every bulleted term under it;
// lib/comptia-v8-coverage.test.ts checks that term by term. The wording
// around CompTIA's terms is ours.
// ---------------------------------------------------------------------------
const CYSA_CS0003_RETIRED_AT = "2026-12-23T12:00:00Z";
const CYSA_V4_VERIFIED_AT = "2026-11-07T00:00:00Z";

export const CYSAPLUS_TRACK: SeedTrack = {
  code: "CYSAPLUS",
  title: "Prep for CompTIA CySA+",
  description:
    "CompTIA CySA+ CS0-004 (V4) exam prep across 4 weighted domains -- SOC analysis with real tools, vulnerability prioritization, incident response, and reporting -- with SOC-analyst drilling. CS0-003 units stay listed until English CS0-003 retires on 2026-12-22. Sitting a translated CS0-003 exam (available until 2027-03-23)? Its units leave this course on 2026-12-23, so finish them before then.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/cybersecurity-analyst/v4/",
  sourceVerifiedAt: CYSA_V4_VERIFIED_AT,
  contentReviewDueAt: "2027-05-07T00:00:00Z",
  credential: {
    ...COMPTIA,
    credentialSlug: "cysa-plus",
    credentialName: "CompTIA Cybersecurity Analyst (CySA+)",
    credentialUrl: "https://www.comptia.org/en-us/certifications/cybersecurity-analyst/",
    examCode: "CS0-004",
    examRevision: "V4",
    objectivesRevision: "Exam Objectives Document Version 2.0",
    status: "active",
    effectiveDate: "2026-06-23", // launch; comptia.org/en-us/certifications/cybersecurity-analyst/v4/
    officialObjectivesUrl: "https://lecbyo.files.cmp.optimizely.com/download/68b1eae88e5011f08868a275d699e612",
    lastVendorVerifiedAt: CYSA_V4_VERIFIED_AT,
    recommendedExperience:
      "4 years of hands-on experience in a SOC analyst (level 2) or vulnerability analyst role.",
    durationMinutes: 165,
    questionFormat: "Maximum 85 questions; multiple choice and performance-based",
    passingScorePolicy: "750 on a scale of 100-900.",
    supersedes: { examCode: "CS0-003", lastExamDate: "2026-12-22" },
  },
  units: [
    // ----- CS0-003 domains (sort_order 0-3), retired after 2026-12-22.
    // Objective text is frozen; see the block comment.
    {
      title: "Security Operations (CS0-003)",
      retiredAt: CYSA_CS0003_RETIRED_AT,
      weight: 33,
      gate: "Given a stream of SIEM alerts, triage them by priority, identify which are true positives, and explain the indicator that justifies each verdict.",
      objectives: [
        "SIEM fundamentals: log aggregation, correlation rules, alert triage",
        "Network traffic analysis and identifying anomalous patterns",
        "Endpoint detection concepts: EDR telemetry, process/file/registry monitoring",
        "Threat intelligence: sources, indicators of compromise (IOCs), the intelligence lifecycle",
        "Threat hunting fundamentals: hypothesis-driven investigation",
        "Cloud security monitoring considerations (shared responsibility, cloud-native logs)",
        "Identity and access monitoring: detecting credential misuse and privilege escalation",
      ],
      labs: [
        "Search a free SIEM sandbox or sample dataset for a specific indicator of compromise and document your query.",
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    },
    {
      title: "Vulnerability Management (CS0-003)",
      retiredAt: CYSA_CS0003_RETIRED_AT,
      weight: 30,
      gate: "Given a vulnerability scan report, correctly prioritize remediation using CVSS and business context, and justify why the highest CVSS score isn't always fixed first.",
      objectives: [
        "Vulnerability scanning: authenticated vs. unauthenticated, scan scoping",
        "CVSS scoring: base, temporal, and environmental metrics",
        "Prioritizing remediation using risk, exploitability, and asset criticality",
        "Web application vulnerability concepts (OWASP Top 10 awareness)",
        "Cloud and container vulnerability considerations",
        "Patch management and compensating controls when patching isn't immediately possible",
      ],
      labs: [
        "Look up a recent published CVE on nvd.nist.gov, read its CVSS vector string, and explain each component.",
        null,
        null,
        null,
        null,
        null,
      ],
    },
    {
      title: "Incident Response and Management (CS0-003)",
      retiredAt: CYSA_CS0003_RETIRED_AT,
      weight: 20,
      gate: "Given an active incident scenario, correctly sequence containment, eradication, and recovery steps, and explain what evidence must be preserved and why.",
      objectives: [
        "Incident response lifecycle: preparation, detection, containment, eradication, recovery, lessons learned",
        "Digital forensics basics: chain of custody, order of volatility",
        "Root cause analysis and post-incident reporting",
        "Playbooks and runbooks for common incident types",
        "Business impact considerations during containment decisions",
      ],
      labs: [
        "Draft a short incident response playbook outline for a phishing-triggered credential compromise.",
        null,
        null,
        null,
        null,
      ],
    },
    {
      title: "Reporting and Communication (CS0-003)",
      retiredAt: CYSA_CS0003_RETIRED_AT,
      weight: 17,
      gate: "Translate a technical vulnerability finding into a one-paragraph summary appropriate for a non-technical executive, without losing the actual risk.",
      objectives: [
        "Communicating findings to technical vs. non-technical audiences",
        "Metrics and KPIs for a security operations program",
        "Stakeholder management during incidents",
        "Compliance and regulatory reporting considerations",
      ],
    },
    // ----- CS0-004 domains (sort_order 4-7), from the V4 objectives PDF.
    {
      title: "Security Operations",
      weight: 34,
      gate: "Given SIEM alerts, packet captures, endpoint telemetry, and a suspicious script, decide which are malicious, name the indicator and the tool output that proves it, map it to ATT&CK, and say which step you would automate -- and where an AI assistant helps or misleads. Heaviest domain on the exam.",
      objectives: [
        // 1.1
        "Logging concepts: ingestion, configuration, integrity and security, time synchronization, retention",
        "Operating system concepts: system hardening, file structure and critical files, system processes",
        "Infrastructure/system architecture (cloud native, virtualization, containerization, application programming interfaces (APIs)) and device management concepts for mobile and endpoint",
        "Network architecture concepts: Zero Trust Network Architecture (ZTNA), secure access service edge (SASE), hybrid cloud",
        "Identity and access management (IAM): privileged access management (PAM), authentication and authorization methods, secrets management",
        "Encryption techniques, data protection concepts, and critical infrastructure concepts: operational technology (OT), industrial control system (ICS), supervisory control and data acquisition (SCADA)",
        // 1.2
        "Given a scenario, analyze network-related indicators: rogue devices, enumeration, anomalous activity, activity on unexpected ports",
        "Given a scenario, analyze host-related indicators: resource consumption, unauthorized software, unauthorized configuration, and anomalous activity -- suspicious or rogue processes, Living Off the Land Binaries (LOLBins) and Scripts, file system changes, data exfiltration",
        "Given a scenario, analyze application-related indicators (service disruption, anomalous activity) and cloud-related indicators (anomalous activity, resource compromise)",
        "Given a scenario, analyze identity-based indicators (IAM account compromise, unauthorized access, impossible travel), social engineering attacks (typosquatting, URL shorteners), and email-related attacks such as business email compromise (BEC)",
        // 1.3
        "Decoding/parsing with CyberChef and pattern recognition: regular expressions, interpreting suspicious commands",
        "Packet analysis tools: Wireshark, tcpdump, Snort, Suricata, Zeek",
        "Log analysis with security information and event management (SIEM), and user and entity behavior analysis (UEBA) with Open User and Entity Behavior Analytics (OpenUBA)",
        "Threat-intelligence platforms: Open Threat Exchange (OTX), Malware Information Sharing Platform (MISP), Open Cyber Threat Intelligence (OpenCTI)",
        "Endpoint security tools: endpoint detection and response (EDR) and extended detection and response (XDR), mobile device management (MDM)",
        "Domain and IP reputation (WHOIS, AbuseIPDB, Geolocation by IP Address (GEO-IP)) and email analysis with MXToolbox",
        "File analysis (Strings, VirusTotal, Yet another recursive acronym (YARA)) and sandboxing (Joe Sandbox, Cuckoo Sandbox)",
        "Reading evidence formats (JSON, XML, YAML, EVTX) and programming/scripting languages (Python, PowerShell, shell script)",
        // 1.4
        "Threat actors -- advanced persistent threat (APT), insider threat -- and tactics, techniques, and procedures (TTPs): heat maps, Pyramid of Pain, MITRE ATT&CK, attribution",
        "Collection methods and sources (open-source intelligence (OSINT), closed-source intelligence, threat intelligence sharing) and confidence-level impacts: timeliness, relevance, accuracy",
        "Indicator of compromise (IoC) handling: collection, analysis, application/usage, and types -- atomic, behavioral",
        "Threat modeling with STRIDE (spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege), threat mapping, and cyber deception",
        // 1.5
        "Standardize processes: manage and facilitate team coordination, playbook/runbook creation",
        "Streamline operations: automation and orchestration with security orchestration, automation, and response (SOAR) and infrastructure as code (IaC); data enrichment through rule/alert tuning and dashboard creation",
        "Technology and tool integration: APIs, webhooks, plug-ins",
        // 1.6
        "AI risks in security operations (hallucinations, data exposure, model poisoning, malicious prompts) and AI governance (legal or regulatory compliance, AI usage policies)",
        "AI use cases in the SOC: comparing artifacts, analyzing log files, document creation, incident investigation, event correlation, automation and orchestration",
      ],
      labs: [
        "Check that two of your own machines agree on time (timedatectl or w32tm /query /status) and explain what skewed clocks do to a SIEM timeline.",
        null,
        null,
        null,
        null,
        null,
        null,
        "On a lab Windows VM, list running processes with their parent processes (Get-CimInstance Win32_Process) and flag any LOLBin -- certutil, mshta, rundll32 -- launched by an Office application.",
        null,
        "Given a sample sign-in log, find an impossible-travel pair and decide whether it is account compromise or a VPN egress.",
        "Paste an obfuscated PowerShell one-liner from a public malware write-up into CyberChef, decode it (Base64, then UTF-16LE), and explain what it would do. Decode only: never run the decoded command, on any machine.",
        "Open a sample packet capture in Wireshark and in tcpdump -r, and write one display filter and one BPF filter that isolate the suspicious conversation.",
        "Write one SIEM query that alerts on five failed logons followed by a success for the same account within ten minutes.",
        "Look up an IoC from a public report in AlienVault OTX and record its related pulses and confidence.",
        null,
        "Run whois and an AbuseIPDB lookup on an IP from your own firewall or web server logs; decide whether to block it.",
        "Write a three-string YARA rule for a benign sample file you create, and test it with the yara command line.",
        "Parse an exported EVTX file or JSON log with a short Python script and count events by ID.",
        "Map one public intrusion report onto MITRE ATT&CK tactics and techniques, and mark which of its indicators sit low and high on the Pyramid of Pain.",
        null,
        null,
        "Run a STRIDE pass over a simple login service diagram and list one threat per letter.",
        "Write a five-step playbook for a suspected phishing report, from intake to closure.",
        null,
        null,
        "Ask an AI assistant you are allowed to use to summarize a sample log; check every claim it makes against the raw log and note any hallucination.",
        null,
      ],
    },
    {
      title: "Vulnerability Management",
      weight: 26,
      gate: "Given an environment and a stack of scanner output, choose the scan method, separate true from false positives, prioritize with CVSS, EPSS, active exploitation and asset context, pick a mitigation (or a justified exception with compensating controls), and say how you will validate the fix.",
      objectives: [
        // 2.1
        "Given a scenario, plan a scan: asset inventory and planning considerations -- scheduling, operations, performance, sensitivity levels, segmentation, regulatory requirements",
        "Scan types: internal vs. external, agent vs. agentless, credentialed vs. non-credentialed, passive vs. active, and discovery -- mapping scans, device fingerprinting",
        "Security baseline scanning: Payment Card Industry Data Security Standard (PCI DSS), Center for Internet Security (CIS) benchmarks, International Organization for Standardization (ISO) 27000 series",
        // 2.2
        "Given tool output, analyze network scanning and mapping (Angry IP Scanner, Masscan) and multipurpose tools (Nmap, Metasploit Framework (MSF), Maltego, Recon-ng)",
        "Given tool output, analyze web application scanners (Burp Suite, Zed Attack Proxy (ZAP), Nikto) and vulnerability scanners (Nessus, Nuclei, Open Vulnerability Assessment Scanner (OpenVAS))",
        "Given tool output, analyze cloud infrastructure assessment tools (ScoutSuite, Prowler, Trivy, Checkov) and breach attack simulation (BAS) tools (Atomic Red Team, Caldera)",
        // 2.3
        "Prioritization criteria: exploitability, active exploitation/threat intelligence, asset value, impact, patch/remediation availability, true/false positives, true/false negatives",
        "Scoring methods -- Common Vulnerability Scoring System (CVSS) metrics and FIRST's Exploit Prediction Scoring System (EPSS) -- and context awareness: internal, external, isolated",
        "Mitigation strategies (attack surface management, secure coding best practices, patching and configuration management, exceptions, compensating controls) and validation of remediation",
        // 2.4
        "Control types (administrative, technical, physical) and control functions (preventative, detective, responsive, corrective)",
        "Risk concepts (risk appetite, residual risk, inherent risk) and risk management strategies: accept, transfer, avoid, mitigate",
        "Policies, governance, and service-level objectives (SLOs) that set remediation timelines",
        "Application security: static application security testing (SAST), dynamic application security testing (DAST), Software Assurance Maturity Model (SAMM)",
        "Third-party risk: supply chain, software composition analysis (SCA), software bill of materials (SBOM)",
      ],
      labs: [
        "Write a scan plan for a small office: what you will scan, when, credentialed or not, and which fragile systems you will exclude or throttle.",
        "Scan one lab VM twice with Nmap -- once unauthenticated, once with -sV -O -- and list what the second scan reveals that the first did not.",
        "Run a CIS benchmark check (for example, CIS-CAT Lite or Lynis) on a lab machine and fix the top two failures.",
        "Read the output of nmap -sV -sC against a lab VM you own and name the riskiest open service.",
        "Run OWASP ZAP's baseline scan against a deliberately vulnerable lab app (for example, OWASP Juice Shop) and triage three alerts as true or false positives.",
        "Scan a container image you build with Trivy and an IaC folder with Checkov; pick one finding from each to fix.",
        null,
        "For three CVEs, record the CVSS base score, the EPSS score from first.org, and whether each is in CISA's Known Exploited Vulnerabilities catalog; rank them and justify the order.",
        "Write an exception request for a vulnerability that cannot be patched for 90 days, naming the compensating controls and how remediation will be validated.",
        null,
        null,
        null,
        "Run a free SAST tool (for example, Semgrep) on one of your own repositories and triage its top finding.",
        "Generate an SBOM for a project you own (for example, with Syft) and check it for components with known vulnerabilities.",
      ],
    },
    {
      title: "Incident Response and Management",
      weight: 24,
      gate: "Given an active incident, map it onto the Cyber Kill Chain, the Diamond Model, and ATT&CK; sequence the response from detection to post-incident; build the timeline; and say what evidence you preserve, when you escalate, and when an isolated host may be released.",
      objectives: [
        // 3.1
        "Attack methodology frameworks: Cyber Kill Chain, Diamond Model of Intrusion Analysis, MITRE ATT&CK -- and mapping one incident onto each",
        // 3.2
        "The incident response process: preparation, detection, analysis, containment, eradication, recovery, post-incident",
        // 3.3
        "Given a scenario, prepare: developing plans (incident response plan, communication plan), creating playbooks, defining roles, performing training (tabletop, simulation)",
        "Given a scenario, detect and correlate: log collection, log correlation, log augmentation and enrichment, alerts and notifications",
        "Given a scenario, assess: triage, establishment of a timeline, determining severity and impact, prioritization, escalation",
        "Evidence gathering: chain of custody, data integrity validation, preservation, legal hold",
        "Given a scenario, contain and recover: isolating affected targets, remediation and verification, release from isolation, performing restoration",
        "Root cause analysis (RCA) and corrective action development",
      ],
      labs: [
        "Take one public breach write-up and place each attacker step on the Cyber Kill Chain, the Diamond Model's four vertices, and an ATT&CK tactic.",
        null,
        "Draft a short incident response playbook for a phishing-triggered credential compromise, with roles and a communication plan.",
        null,
        "From a set of sample logs, build a timeline of a lab intrusion (first access, persistence, exfiltration) with UTC timestamps.",
        "Write a chain-of-custody form and hash a disk image before and after transfer to show data integrity validation.",
        "Write the release-from-isolation criteria for a reimaged workstation: what must be verified before it rejoins the network.",
        "Run a five-whys root cause analysis on a past incident or outage you know of and write two corrective actions.",
      ],
    },
    {
      title: "Reporting and Communication",
      weight: 16,
      gate: "Turn a scan, a compliance finding, or an incident into the right report for the right audience -- an executive summary, a risk scorecard, or an after action report -- with metrics that show whether things are getting better, and name what is blocking remediation.",
      objectives: [
        // 4.1
        "Vulnerability scan reports, compliance findings, and risk scorecards -- and who each one is written for",
        "Action plans (escalation, dependencies) and inhibitors to remediation: contractual agreements, organizational governance, business process interruption, degrading functionality, legacy systems, proprietary systems, patch availability",
        "Stakeholder identification and communication, and vulnerability metrics and key performance indicators (KPIs): trends, top risks, service-level agreement (SLA)",
        // 4.2
        "Incident declaration and escalation, executive summary, and shift/incident handover",
        "Communication plan (stakeholder identification, legal team, public relations, regulatory reporting agencies, law enforcement, customers) and operational security awareness of communication channels",
        "Post-incident reporting (after action report, lessons learned, root cause analysis) and an internal threat intelligence report tailored to organization/environment",
        "SOC metrics and KPIs: alert volume, false-positive rate, true-positive rate, mean time to close, mean time to detect, mean time to respond, mean time to remediate, phishing campaign click rate",
      ],
      labs: [
        "Turn a raw vulnerability scan export into a one-page risk scorecard for a non-technical manager.",
        null,
        null,
        "Write a one-paragraph executive summary of a sample incident that states impact, status, and the decision needed, with no jargon.",
        null,
        "Write a shift handover note for an open incident: what is known, what is contained, what is pending, and who owns each item.",
        "From a sample month of alert data, compute false-positive rate, mean time to detect, and mean time to respond, and say which one you would work on first.",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA PenTest+ (PT0-003). Domain weights verified live against comptia.org.
// ---------------------------------------------------------------------------
export const PENTESTPLUS_TRACK: SeedTrack = {
  code: "PENTESTPLUS",
  title: "Prep for CompTIA PenTest+",
  description: "CompTIA PenTest+ PT0-003 exam prep across 5 weighted domains, with authorized lab-environment drilling.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en/certifications/pentest/",
  sourceVerifiedAt: COMPTIA_VERIFIED_AT,
  // Source: https://www.comptia.org/en/certifications/pentest/ -- PenTest+ V3
  // (PT0-003), launched 2024-12-17, retirement "estimated 2027"; max 90
  // questions, multiple choice and performance-based; 165 minutes; pass 750
  // on 100-900; weights 13/21/17/35/14 (match the units below). A V4 draft
  // is listed on CompTIA's "exam objectives under development" page
  // (https://www.comptia.org/en-em/resources/comptia-exam-objectives-under-development/)
  // with no launch date, so nothing to transition yet.
  credential: {
    ...COMPTIA,
    credentialSlug: "pentest-plus",
    credentialName: "CompTIA PenTest+",
    credentialUrl: "https://www.comptia.org/en/certifications/pentest/",
    examCode: "PT0-003",
    examRevision: "V3",
    status: "active",
    effectiveDate: "2024-12-17",
    officialObjectivesUrl: "https://www.comptia.org/en/certifications/pentest/",
    lastVendorVerifiedAt: COMPTIA_VERIFIED_AT,
    recommendedExperience:
      "3-4 years in a penetration tester job role, with Network+ and Security+ or equivalent knowledge.",
    durationMinutes: 165,
    questionFormat: "Maximum 90 questions; multiple choice and performance-based",
    passingScorePolicy: "750 on a scale of 100-900.",
  },
  units: [
    {
      title: "Engagement Management",
      weight: 13,
      gate: "Given a client request for a penetration test, draft the scoping questions and rules-of-engagement items that must be settled before any technical work begins.",
      objectives: [
        "Pre-engagement: scoping, rules of engagement, authorization",
        "Legal and compliance considerations for penetration testing",
        "Statement of work and reporting deliverable expectations",
        "Communication and escalation paths during an engagement",
      ],
    },
    {
      title: "Reconnaissance and Enumeration",
      weight: 21,
      gate: "Given a target domain, perform passive and active reconnaissance within legal scope and identify what an attacker could learn before any exploitation begins.",
      objectives: [
        "Passive reconnaissance: OSINT, DNS records, public records",
        "Active reconnaissance: port scanning, service enumeration with Nmap",
        "Enumerating hosts, users, shares, and services on a network",
        "Identifying attack surface from reconnaissance findings",
      ],
      labs: [
        "Run a permission-scoped Nmap scan against a home network you administer yourself, with the agreement of everyone who uses it (not shared housing, campus or work Wi-Fi), and interpret the service/version output.",
        null,
        null,
        null,
      ],
    },
    {
      title: "Vulnerability Discovery and Analysis",
      weight: 17,
      gate: "Given scan results, distinguish a real exploitable vulnerability from a false positive and explain the evidence that supports your conclusion.",
      objectives: [
        "Vulnerability scanning tools and interpreting their output",
        "Manual vulnerability validation vs. automated scan results",
        "Web application vulnerability analysis basics",
        "Prioritizing findings by exploitability and impact",
      ],
    },
    {
      title: "Attacks and Exploits",
      weight: 35,
      gate: "Given a validated vulnerability in a lab environment, execute the appropriate exploitation technique safely and explain what access it grants.",
      objectives: [
        "Network-based attacks: exploiting misconfigurations, weak protocols",
        "Web application attacks: injection, authentication bypass, session attacks",
        "Wireless attack concepts",
        "Social engineering attacks in an authorized engagement context",
        "Password attacks: cracking, spraying, credential stuffing concepts",
        "Exploitation frameworks conceptually (e.g. Metasploit workflow)",
      ],
      labs: [
        "Complete a beginner exploitation walkthrough on an intentionally vulnerable lab VM (e.g. a local capture-the-flag box) and document each step. Give the VM host-only or NAT networking, never bridged, so it is not exposed to the rest of your network.",
        null,
        null,
        null,
        null,
        null,
      ],
    },
    {
      title: "Post-Exploitation and Lateral Movement",
      weight: 14,
      gate: "Given initial access to a lab host, explain how you would responsibly demonstrate privilege escalation and lateral movement within engagement scope, then clean up your tracks per the SOW.",
      objectives: [
        "Privilege escalation techniques (conceptual, Windows and Linux)",
        "Lateral movement and pivoting within a network",
        "Persistence mechanisms and why they must be scoped/authorized carefully",
        "Cleanup and reporting: removing test artifacts, documenting impact",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA SecurityX (CAS-005, formerly CASP+). Domain weights verified live
// against comptia.org.
// ---------------------------------------------------------------------------
export const SECURITYX_TRACK: SeedTrack = {
  code: "SECURITYX",
  title: "Prep for CompTIA SecurityX",
  description: "CompTIA SecurityX CAS-005 exam prep across 4 weighted domains for enterprise security architecture and engineering.",
  trackType: "certification",
  subcategorySlug: "comptia-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://www.comptia.org/en-us/certifications/securityx/",
  sourceVerifiedAt: COMPTIA_VERIFIED_AT,
  // Source: https://www.comptia.org/en-us/certifications/securityx/ --
  // SecurityX V5 (CAS-005), launched 2024-12-17, retirement "estimated
  // 2027"; max 90 questions, multiple choice and performance-based; up to
  // 165 minutes; pass/fail only, no scaled score; weights 20/27/31/22 (match
  // the units below). A V6 draft is listed on the "exam objectives under
  // development" page with no launch date.
  credential: {
    ...COMPTIA,
    credentialSlug: "securityx",
    credentialName: "CompTIA SecurityX",
    credentialUrl: "https://www.comptia.org/en-us/certifications/securityx/",
    examCode: "CAS-005",
    examRevision: "V5",
    status: "active",
    effectiveDate: "2024-12-17",
    officialObjectivesUrl: "https://www.comptia.org/en-us/certifications/securityx/",
    lastVendorVerifiedAt: COMPTIA_VERIFIED_AT,
    recommendedExperience:
      "At least 10 years of general hands-on IT experience, including 5 years of hands-on security, with Network+, Security+, CySA+, Cloud+, and PenTest+ or equivalent knowledge.",
    durationMinutes: 165,
    questionFormat: "Maximum 90 questions; multiple choice and performance-based",
    passingScorePolicy: "Pass/fail only; CompTIA reports no scaled score.",
  },
  units: [
    {
      title: "Governance, Risk, Compliance",
      weight: 20,
      gate: "Given an enterprise scenario spanning multiple regulatory regimes, identify the applicable compliance requirements and design a risk treatment plan that satisfies them.",
      objectives: [
        "Enterprise risk management frameworks and risk treatment strategies",
        "Regulatory and legal considerations across industries and jurisdictions",
        "Third-party and supply-chain risk at an enterprise scale",
        "Governance structures: policy, standards, and enterprise security programs",
        "Business continuity and disaster recovery at an enterprise architecture level",
      ],
    },
    {
      title: "Security Architecture",
      weight: 27,
      gate: "Given a legacy enterprise architecture, redesign it applying Zero Trust principles and defend every architectural tradeoff you make.",
      objectives: [
        "Enterprise security architecture and Zero Trust design principles",
        "Cloud and hybrid infrastructure security architecture",
        "Identity and access management architecture at enterprise scale",
        "Secure network architecture: segmentation, SASE, microsegmentation",
        "Data security architecture: classification, protection, and lifecycle",
      ],
    },
    {
      title: "Security Engineering",
      weight: 31,
      gate: "Given a complex system requiring secure integration, design and justify the cryptographic, automation, and secure-development controls needed end to end.",
      objectives: [
        "Advanced cryptographic concepts and applied cryptography design",
        "Secure software development lifecycle and DevSecOps integration",
        "Enterprise mobility, endpoint, and IoT/OT security engineering",
        "Automation and orchestration for security engineering at scale",
        "Secure system and application integration across enterprise boundaries",
      ],
    },
    {
      title: "Security Operations",
      weight: 22,
      gate: "Given an enterprise-scale incident, lead the technical response across teams, correlating threat intelligence with operational telemetry to drive the decision.",
      objectives: [
        "Enterprise-scale threat management and threat intelligence integration",
        "Incident response leadership across complex, multi-team environments",
        "Vulnerability management at enterprise scale",
        "Security monitoring and analytics for enterprise operations",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Computer Science Degree Foundations (code CMPCBS).
//
// REQ-195 (Nick, 2026-11-09): "liberty degree lesson should be removed unless
// they can be reframed as general course titles. Content should be accurate
// to the course type." This track began (REQ-142/161) as a mirror of one
// university's published degree completion plan. It is now a set of GENERAL
// courses -- the foundation courses of a computer science / computational
// mathematics bachelor's degree -- each taught from dated open textbooks
// (`sources` on each unit), and it names no school as its product.
//
// What changed, without moving any row (units and objectives are matched to
// their database rows by position, so learners' mastery stays put):
//   - Course units keep their objectives; their titles drop the school's
//     course codes and their gates state what the course teaches instead of
//     the school's grade rules.
//   - Gen-ed courses that are a real general course type are reframed in
//     place, then removed (Nick, 2026-11-09, later): "Remove English and
//     religious courses that aren't CS." Units 0 (College Composition I) and
//     5 (Religion Surveys) are retired whole; only CS, math and information
//     systems courses are taught.
//   - Everything that was degree-plan logistics is RETIRED, never deleted:
//     elective-choice lines, the online-learning orientation course, the
//     worldview course (a formation course with no neutral general
//     equivalent), free electives and the graduation checklist. Whole units
//     use retiredAt; lines inside a unit that stays use objectiveRetiredAt.
//     A retired line keeps its slot so nothing after it shifts.
// ---------------------------------------------------------------------------
const CMPCBS_RETIRED_AT = "2026-11-09T00:00:00Z";
const R = CMPCBS_RETIRED_AT;
const CMPCBS_CHECKED = "2026-11-09";
// REQ-245: the day the taught units were re-checked against their sources and
// the course was verified. A reference re-read that day carries this date; one
// that could not be re-read keeps CMPCBS_CHECKED (cppreference answered with a
// browser challenge, so the C++ units also cite Microsoft's C++ language
// reference, read that day), and the retired units' references were not
// re-read (retired units are not taught).
const CMPCBS_VERIFIED = "2026-11-11";
const CMPCBS_VERIFIED_AT = "2026-11-11T00:00:00Z";
const ref = (title: string, url: string): UnitSource => ({ title, url, kind: "reference", checkedAt: CMPCBS_CHECKED });
const reread = (title: string, url: string, keyValues?: string[]): UnitSource => ({
  title,
  url,
  kind: "reference",
  checkedAt: CMPCBS_VERIFIED,
  ...(keyValues ? { keyValues } : {}),
});
const CMPCBS_SRC = {
  writing: reread("OpenStax, Writing Guide with Handbook (2021)", "https://openstax.org/books/writing-guide/pages/preface"),
  apa: ref("APA Style, Author-date citation system", "https://apastyle.apa.org/style-grammar-guidelines/citations/basic-principles/author-date"),
  mla: ref("Purdue OWL, MLA In-Text Citations: The Basics", "https://owl.purdue.edu/owl/research_and_citation/mla_style/mla_formatting_and_style_guide/mla_in_text_citations_the_basics.html"),
  hebrewBible: ref("Christine Hayes, Introduction to the Old Testament (Hebrew Bible), Open Yale Courses RLST 145, Lecture 1", "https://oyc.yale.edu/node/1724"),
  newTestament: ref("Dale B. Martin, Introduction to New Testament History and Literature, Open Yale Courses RLST 152, Lecture 1", "https://oyc.yale.edu/religious-studies/rlst-152/lecture-1"),
  worldHistory1: ref("OpenStax, World History Volume 1 (2023), 4.4 The Hebrews", "https://openstax.org/books/world-history-volume-1/pages/4-4-the-hebrews"),
  worldHistory2: ref("OpenStax, World History Volume 2 (2022), 5.1 The Protestant Reformation", "https://openstax.org/books/world-history-volume-2/pages/5-1-the-protestant-reformation"),
  brooks: ref("Christopher Brooks, Western Civilization: A Concise History I, 11.9 Orthodoxy and Heresy (LibreTexts)", "https://human.libretexts.org/Bookshelves/History/World_History/Book:_Western_Civilization_-_A_Concise_History_I_(Brooks)/11:_The_Late_Empire_and_Christianity/11.09:_Orthodoxy_and_Heresy"),
  hanneken: ref("Todd Hanneken, Theological Questions (open textbook, 2022; written from a Catholic perspective)", "https://open.umn.edu/opentextbooks/textbooks/theological-questions"),
  introCs: reread("OpenStax, Introduction to Computer Science (2024)", "https://openstax.org/books/introduction-computer-science/pages/preface"),
  calc1: reread("OpenStax, Calculus Volume 1", "https://openstax.org/books/calculus-volume-1/pages/preface"),
  calc2: reread("OpenStax, Calculus Volume 2", "https://openstax.org/books/calculus-volume-2/pages/preface"),
  calc3: reread("OpenStax, Calculus Volume 3", "https://openstax.org/books/calculus-volume-3/pages/preface"),
  stats: reread("OpenStax, Introductory Statistics 2e", "https://openstax.org/books/introductory-statistics-2e/pages/preface"),
  discrete: reread("Oscar Levin, Discrete Mathematics: An Open Introduction, 4th edition", "https://discrete.openmathbooks.org/"),
  mactutor: reread("MacTutor History of Mathematics Archive, University of St Andrews", "https://mathshistory.st-andrews.ac.uk/"),
  linear: reread("Robert Beezer, A First Course in Linear Algebra", "https://linear.pugetsound.edu/"),
  linearOcw: reread("MIT OpenCourseWare 18.06 Linear Algebra (Spring 2010)", "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/"),
  numerical: reread("MIT OpenCourseWare 18.330 Introduction to Numerical Analysis (Spring 2012)", "https://ocw.mit.edu/courses/18-330-introduction-to-numerical-analysis-spring-2012/"),
  abstract: reread("Thomas Judson, Abstract Algebra: Theory and Applications", "https://judsonbooks.org/abstract-algebra-theory-and-applications/"),
  diffEq: reread("William F. Trench, Elementary Differential Equations", "https://digitalcommons.trinity.edu/mono/8"),
  probability: reread("Charles Grinstead and J. Laurie Snell, Introduction to Probability", "https://chance.dartmouth.edu/book.html"),
  forecasting: reread("Rob Hyndman and George Athanasopoulos, Forecasting: Principles and Practice, 3rd edition", "https://otexts.com/fpp3/"),
  infoSystems: reread("David Bourgeois, Information Systems for Business and Beyond (2019)", "https://open.umn.edu/opentextbooks/textbooks/189"),
  cpp: ref("cppreference.com, C++ language reference", "https://en.cppreference.com/w/cpp/language"),
  dataStructures: reread("Pat Morin, Open Data Structures (C++ edition)", "https://opendatastructures.org/ods-cpp/"),
  nistCsf: reread("NIST Cybersecurity Framework 2.0", "https://www.nist.gov/cyberframework", [
    "CSF 2.0 (NIST CSWP 29, February 26, 2024) has six functions: Govern, Identify, Protect, Detect, Respond, Recover; Govern is new in 2.0",
  ]),
  // REQ-245 (FAIL-1563): references added where a unit's objectives went
  // beyond what its cited text covers. Each read 2026-11-11.
  cs2023: reread("ACM/IEEE-CS/AAAI, Computer Science Curricula 2023 (CS2023), knowledge units NC-Fundamentals, SEP-IP, SEP-Privacy, SEP-Security", "https://csed.acm.org/wp-content/uploads/2025/11/CS2023-Report.htm"),
  appliedDiscrete: reread("Al Doerr and Ken Levasseur, Applied Discrete Structures, 3rd edition, version 3-14 (June 2026): Boolean algebra (ch. 13), matrix algebra (ch. 5), algorithms (appendix A)", "https://discretemath.org/"),
  numericalComputation: reread("Tobin Driscoll and Richard Braun, Fundamentals of Numerical Computation (online edition): error and conditioning (ch. 1), linear systems (ch. 2), roots (ch. 4), interpolation, differentiation and integration (ch. 5), initial-value problems (ch. 6)", "https://fncbook.com/"),
  modeling: reread("SIAM, Math Modeling: Getting Started and Getting Solutions (Bliss, Kavanagh, Galluzzo and Levy, 2014): defining the problem, assumptions, building, analyzing and assessing a model", "https://m3challenge.siam.org/resources/modeling-handbook"),
  technicalWriting: reread("Technical Writing Essentials (Suzan Last; adapted by Robin L. Potter and Tricia Hylton), CC BY 4.0", "https://pressbooks.senecapolytechnic.ca/technicalwriting"),
  attack: reread("MITRE ATT&CK, Enterprise tactics (ATT&CK v20.1)", "https://attack.mitre.org/tactics/enterprise/", [
    "ATT&CK v20.1 (current from October 13, 2026) lists 15 Enterprise tactics: Reconnaissance, Resource Development, Initial Access, Execution, Persistence, Privilege Escalation, Stealth, Defense Impairment, Credential Access, Discovery, Lateral Movement, Collection, Command and Control, Exfiltration, Impact",
    "TA0005 is now named Stealth (blending in without touching security controls), and Defense Impairment (TA0112, created April 14, 2026) covers degrading or disabling security controls and monitoring; older material calls this area Defense Evasion",
  ]),
  msCpp: reread("Microsoft Learn, C++ Language Reference (standard C++ with Microsoft-specific notes)", "https://learn.microsoft.com/en-us/cpp/cpp/cpp-language-reference"),
} as const;

export const CMPCBS_TRACK: SeedTrack = {
  code: "CMPCBS",
  title: "Computer Science Degree Foundations",
  description:
    "The foundation courses of a bachelor's degree in computer science and computational mathematics, taught as general courses from open textbooks: calculus through differential equations, discrete math, linear algebra, probability and statistics, numerical methods, C++ programming, data structures, information systems and security. Not affiliated with any university; your school's catalog sets its own requirements.",
  trackType: "graduate",
  subcategorySlug: "software-engineering",
  freshnessModel: "academic_foundational",
  // REQ-245: every taught unit checked against its references on 2026-11-11
  // (one objective reworded, FAIL-1562; references added, FAIL-1563);
  // reviewed yearly like the other academic courses.
  sourceVerifiedAt: CMPCBS_VERIFIED_AT,
  contentReviewDueAt: "2027-11-11T00:00:00Z",
  // REQ-195: the course outline is this seed; each unit names its own dated
  // references in `sources`.
  curriculum: {
    kind: "self_defined",
    name: "Computer Science Degree Foundations outline (general courses taught from open textbooks)",
    version: "REQ-195, 2026-11-09",
    url: "https://github.com/paukennick/Ascendra/blob/master/backend/supabase/seed/data.ts",
    checkedAt: CMPCBS_VERIFIED,
  },
  units: [
    // 0: reframed (objective 0); the elective-choice lines are retired.
    {
      title: "College Composition I",
      gate: "Given a question, write an arguable thesis, support each reason with evidence from credible sources, and cite every source in APA or MLA style.",
      objectives: [
        "College composition: thesis, argument, evidence and APA/MLA citation",
        "Communications elective -- choose 3 credits from COMS 101, BUSI 300, ENGR 270, or GICE 220",
        "Information Literacy Elective I -- satisfied by CSIS 110 (shared credit from Major Foundational Courses)",
        "Information Literacy Elective II -- choose 3 credits from ARTS 209, BUSI 201, CSIS 100, CSIS 110, CSIS 111, ENGL 102, ENGL 103, GEOG 200, HIEU 201, HIEU 202, HIUS 221, HIUS 222, HIUS 341, HIUS 360, HIUS 380, HIWD 370, or WRSP 101",
      ],
      // REQ-195 (Nick, 2026-11-09): non-CS general-education courses removed;
      // the whole unit is retired, ids and positions kept.
      retiredAt: R,
      objectiveRetiredAt: [null, R, R, R],
      sources: [CMPCBS_SRC.writing, CMPCBS_SRC.apa, CMPCBS_SRC.mla],
    },
    // 1-4: degree-plan blocks (an orientation course and elective-choice
    // lines). Retired.
    {
      title: "Technological Solutions & Quantitative Reasoning",
      rangeLabel: "3 credits",
      retiredAt: R,
      objectives: [
        "Instructional Technology for Successful Online Learning (UNIV 104)",
        "Math elective -- satisfied by MATH 131 (shared credit from Major Foundational Courses)",
      ],
    },
    {
      title: "Critical Thinking",
      rangeLabel: "7 credits",
      retiredAt: R,
      objectives: [
        "Critical Thinking elective -- choose 3 credits from ARTS 105, ARTS 205, ARTS 214, BUSI 205, ENGL 201, ENGL 202, ENGL 216, ENGL 221, ETHC 101, ETHC 205, PHIL 201, or PHIL 240",
        "Christian Life and Biblical Worldview (RLGN 104)",
      ],
    },
    {
      title: "Civic & Global Engagement",
      rangeLabel: "3 credits",
      retiredAt: R,
      objectives: [
        "Cultural Studies elective -- choose 3 credits from ARTS 105, CSTU 101, CSTU 220, GICE 290, GOVT 200, GOVT 220, MUSC 103, or RLGN 210",
      ],
    },
    {
      title: "Social & Scientific Inquiry",
      rangeLabel: "6 credits",
      retiredAt: R,
      objectives: [
        "Natural Science elective -- choose 3 credits from BIOL 101, BIOL 102, ETHC 210, NASC 210, PHSC 121, PHSC 122, PHSC 210, PHYS 101, PHYS 201, or PHYS 231",
        "Social Science elective -- choose 3 credits from BUSI 223, BUSI 240, ECON 110, ECON 213, ECON 214, HLTH 252, PSYC 101, PSYC 210, SOCI 200, or SOCI 201",
      ],
    },
    // 5: reframed as neutral academic surveys (what the texts and traditions
    // say, never which is true).
    {
      title: "Religion Surveys: The Bible and Christian Thought",
      gate: "Describe how the Bible's canons are organized and differ between traditions, and explain how Christian traditions answer the same theological questions differently, attributing each position to those who hold it.",
      objectives: [
        "Survey of the Old and New Testaments: canon, structure and literary genres",
        "Introduction to Christian theology: its main questions and how traditions answer them",
      ],
      // REQ-195 (Nick, 2026-11-09): non-CS courses removed; unit retired.
      retiredAt: R,
      sources: [CMPCBS_SRC.hebrewBible, CMPCBS_SRC.newTestament, CMPCBS_SRC.worldHistory1, CMPCBS_SRC.worldHistory2, CMPCBS_SRC.brooks, CMPCBS_SRC.hanneken],
    },
    // 6-25: the major courses, as general course titles.
    {
      title: "Introduction to Computer Science",
      gate: "Given a small problem, design an algorithm for it in plain steps, then explain how a compiled program for it runs on the hardware and operating system.",
      objectives: [
        "Computer architecture and system organization",
        "Algorithm design and problem-solving strategies",
        "Programming languages and how compilers translate code",
        "Operating systems and how applications run on them",
        "Networking and database fundamentals",
        "Computing ethics: intellectual property, privacy, and computer crime",
      ],
      sources: [CMPCBS_SRC.introCs, CMPCBS_SRC.cs2023],
    },
    {
      title: "Calculus I",
      gate: "Given a function, find its limits and derivative with the rules, and use the derivative to solve an optimization problem and evaluate an indeterminate limit.",
      objectives: [
        "Functions and graphs, including exponential, logarithmic, and inverse trig forms",
        "Limits and continuity",
        "The derivative: formal definition and differentiation rules",
        "Applications of derivatives, including L'Hopital's Rule",
        "Introduction to integrals",
      ],
      sources: [CMPCBS_SRC.calc1],
    },
    {
      title: "Calculus II",
      gate: "Choose and carry out an integration technique, set up an area or volume integral, and decide whether a series converges, naming the test.",
      objectives: [
        "Integration techniques beyond basic antiderivatives",
        "Improper integrals",
        "Applications of integration: area, volume, and arc length",
        "Sequences, infinite series, and convergence tests",
        "Parametric curves and polar coordinates",
        "Introduction to differential equations",
      ],
      sources: [CMPCBS_SRC.calc2],
    },
    {
      title: "Introduction to Statistical Analysis",
      gate: "Given a data set and a claim, compute summary statistics, run the right hypothesis test, build a confidence interval and state the conclusion in context.",
      objectives: [
        "Probability theory foundations for calculus-trained students",
        "Common probability distribution models",
        "Expected value and variance",
        "Statistical inference: estimation and hypothesis testing",
        "Regression and correlation between data sets",
      ],
      sources: [CMPCBS_SRC.stats, CMPCBS_SRC.probability],
    },
    {
      title: "Discrete Mathematics",
      gate: "Write a correct proof by induction or contradiction, check an argument with a truth table, and count arrangements with the right combinatorial rule.",
      objectives: [
        "Logic and formal proof techniques",
        "Set theory fundamentals",
        "Boolean algebra",
        "Functions, sequences, and relations",
        "Matrices and algorithmic thinking",
        "Mathematical induction and combinatorics",
      ],
      sources: [CMPCBS_SRC.discrete, CMPCBS_SRC.appliedDiscrete],
    },
    {
      title: "History of Mathematics",
      gate: "Explain how a major result arose (Euclid's proof on primes, the calculus of Newton and Leibniz, non-Euclidean geometry), what problem it answered, and how it shaped later mathematics.",
      objectives: [
        "Ancient mathematics: Egyptian, Babylonian, and early number systems",
        "Greek geometry: Euclid, Pythagoras, and Archimedes",
        "The development of algebra and algebraic notation",
        "The invention of calculus: Newton and Leibniz",
        "Non-Euclidean geometry and 19th-century developments",
        "Foundations of set theory and modern mathematics",
      ],
      sources: [CMPCBS_SRC.mactutor],
    },
    {
      title: "Linear Algebra",
      gate: "Solve a linear system by elimination, describe its solution set in vector-space terms, and find and use a matrix's eigenvalues and eigenvectors.",
      objectives: [
        "Vector spaces and subspaces",
        "Systems of linear equations and Gaussian elimination",
        "Matrix algebra and operations",
        "Linear transformations",
        "Eigenvalues and eigenvectors",
      ],
      sources: [CMPCBS_SRC.linear, CMPCBS_SRC.linearOcw],
    },
    {
      title: "Numerical Methods",
      gate: "Pick a numerical method for a root, an integral or a differential equation, run it, and bound or estimate its error.",
      objectives: [
        "Interpolation techniques",
        "Numerical differentiation and integration",
        "Numerical solutions to differential equations",
        "Root-finding methods",
        "Solving linear systems numerically",
        "Error analysis",
      ],
      sources: [CMPCBS_SRC.numerical, CMPCBS_SRC.numericalComputation],
    },
    {
      title: "Abstract Algebra",
      gate: "Check whether a set with an operation is a group, ring or field, and prove a basic property of a homomorphism.",
      objectives: [
        "Groups and their properties",
        "Rings and fields",
        "Homomorphisms and structure-preserving maps",
        "Formal proof-writing in algebra",
      ],
      sources: [CMPCBS_SRC.abstract],
    },
    {
      title: "Multivariable Calculus",
      gate: "Find and classify the critical points of a function of two variables, and evaluate a line or surface integral, using Green's, Stokes' or the Divergence Theorem where it applies.",
      objectives: [
        "Limits, continuity, and differentiation for functions of several variables",
        // REQ-245 (FAIL-1562): was "Integration and power series in several
        // variables". A multivariable calculus course (and its source,
        // OpenStax Calculus Volume 3, chapter 5) teaches multiple integrals;
        // power series are single-variable (Calculus Volume 2, chapter 6).
        "Multiple integration: double and triple integrals and change of variables",
        "Optimization in several variables",
        "Analytic geometry of curves and surfaces",
        "Vector fields and integration along curves and surfaces",
        "The major theorems of vector calculus: Green's, Stokes', and the Divergence Theorem",
      ],
      sources: [CMPCBS_SRC.calc3],
    },
    {
      title: "Differential Equations",
      gate: "Classify a differential equation, solve first- and second-order linear cases (including by Laplace transform), and interpret the solution for a physical model.",
      objectives: [
        "First-order differential equations",
        "Second-order linear differential equations",
        "Systems of differential equations",
        "Laplace transforms",
        "Applications: population growth, mechanical vibrations, and circuits",
      ],
      sources: [CMPCBS_SRC.diffEq],
    },
    {
      title: "Probability",
      gate: "Model a random experiment with the axioms of probability, and compute probabilities, expected values and variances for discrete and continuous distributions.",
      objectives: [
        "Set notation and operations applied to probability",
        "Axioms and properties of probability",
        "Expected value and discrete probability distributions",
        "Continuous probability distributions",
      ],
      sources: [CMPCBS_SRC.probability],
    },
    {
      title: "Mathematical Modeling and Simulation",
      gate: "Turn a described situation into a mathematical model, state its assumptions, analyze or simulate it, and say where it stops being reliable.",
      objectives: [
        "Formulating mathematical models from real-world scenarios",
        "Analytical techniques for evaluating model behavior",
        "Critiquing model assumptions and limitations",
        "Simulation-based methods",
      ],
      sources: [CMPCBS_SRC.diffEq, CMPCBS_SRC.calc2, CMPCBS_SRC.modeling, CMPCBS_SRC.probability],
    },
    {
      title: "Regression and Forecasting",
      gate: "Fit and interpret a regression model, check its assumptions with residuals, and produce and evaluate a simple time-series forecast.",
      objectives: [
        "Simple and multiple linear regression",
        "Model diagnostics and checking regression assumptions",
        "Time series forecasting basics",
        "Applying regression to a real dataset",
      ],
      sources: [CMPCBS_SRC.stats, CMPCBS_SRC.forecasting],
    },
    {
      title: "Computational Mathematics Capstone",
      gate: "Plan, carry out and present an independent project that applies computational mathematics to a substantial problem.",
      objectives: [
        "Independent capstone project synthesizing the computational math major",
        "Applying computational techniques to a substantial problem",
        "Written and oral presentation of results",
      ],
      sources: [CMPCBS_SRC.writing],
    },
    {
      title: "Introduction to Information Systems",
      gate: "Given an organization's process, say where technology adds value, compare candidate systems against stated criteria, and document the choice.",
      objectives: [
        "Evaluating and choosing business technology solutions",
        "Mapping business processes to where technology adds value",
        "Aligning IT strategy with organizational goals",
        "Business process management concepts",
        "Technical writing for information systems documentation",
      ],
      sources: [CMPCBS_SRC.infoSystems, CMPCBS_SRC.technicalWriting],
    },
    {
      title: "Programming in C++ I",
      gate: "Write, compile and debug a structured C++ program that uses functions, loops, conditionals and basic input and output.",
      objectives: [
        "Structured programming fundamentals in C++",
        "Object-oriented programming basics",
        "Input and output operations",
        "Control flow: loops and conditionals",
        "Writing and using functions",
      ],
      sources: [CMPCBS_SRC.cpp, CMPCBS_SRC.msCpp],
    },
    {
      title: "Programming in C++ II",
      gate: "Use pointers, arrays and recursion correctly in C++, and implement and compare internal sorting and searching algorithms.",
      objectives: [
        "Pointers and memory referencing",
        "Introductory data structures: arrays and lists",
        "Recursive programming",
        "Internal sorting algorithms",
        "Internal searching algorithms",
      ],
      sources: [CMPCBS_SRC.cpp, CMPCBS_SRC.dataStructures, CMPCBS_SRC.msCpp],
    },
    {
      title: "Data Structures and Algorithms",
      gate: "Choose a data structure for a task, implement it as a C++ class with a clear interface, and state the time cost of its main operations.",
      objectives: [
        "Linked lists, stacks, and queues",
        "Trees and graphs",
        "Static and dynamic memory allocation",
        "Hashing and tree-based searching",
        "Sorting, searching, and table access algorithms",
        "Recursion as a problem-solving technique",
        "Implementing abstract data types with C++ classes",
      ],
      sources: [CMPCBS_SRC.dataStructures, CMPCBS_SRC.cpp, CMPCBS_SRC.msCpp],
    },
    {
      title: "Information Security",
      gate: "Given a system, identify its likely threats, write a security policy for it, and choose controls that prevent, detect and recover from attacks.",
      objectives: [
        "Fundamental principles of information system security",
        "Security policy development and application",
        "Mechanisms for implementing security protections",
        "Common attacker tactics and how controls get bypassed",
        "Defensive strategies and countermeasures",
      ],
      sources: [CMPCBS_SRC.nistCsf, CMPCBS_SRC.introCs, CMPCBS_SRC.attack],
    },
    // 26-27: degree logistics. Retired. The two residency lines named the
    // school; they are reworded (retired rows are not taught, so no
    // learner's mastery points at different content).
    {
      title: "Free Electives",
      rangeLabel: "22 credits",
      retiredAt: R,
      objectives: [
        "22 credits of free electives, any 100-400 level course not already required elsewhere in the plan",
      ],
    },
    {
      title: "Graduation Requirements",
      rangeLabel: "checklist",
      gate: "Retired degree-plan checklist.",
      retiredAt: R,
      objectives: [
        "Minimum 120 credits overall applied to the program of study",
        "Minimum 2.0 graduation GPA",
        "Minimum 30 upper-level (300-400) credits applied to the program",
        "Minimum residency credits applied to the major (retired degree-plan line)",
        "Minimum residency credits applied to the overall program (retired degree-plan line)",
        "Submit the Degree Completion Application within the final semester before graduation",
      ],
    },
  ],
};

export const SEED_USER_EMAIL = process.env.DEFAULT_USER_EMAIL || "pak@example.com";
