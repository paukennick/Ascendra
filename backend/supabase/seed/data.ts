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
}

export interface SeedTrack {
  code: string;
  title: string;
  description: string;
  trackType: "graduate" | "certification";
  units: SeedUnit[];
}

export const MSCS_TRACK: SeedTrack = {
  code: "MSCS",
  title: "MSCS Foundations Coach",
  description:
    "15-week graduate-CS bridge covering algorithms, data structures, discrete math, OS, computer architecture, database theory, ML math, cybersecurity, HCI/UX, and big data.",
  trackType: "graduate",
  units: [
    {
      title: "Complexity & computational thinking",
      rangeLabel: "Sept 15-21",
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
      rangeLabel: "Sept 22-28",
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
      rangeLabel: "Sept 29-Oct 5",
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
      rangeLabel: "Oct 6-12",
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
      rangeLabel: "Oct 13-19",
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
      rangeLabel: "Oct 20-26",
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
      rangeLabel: "Oct 27-Nov 2",
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
      rangeLabel: "Nov 3-9",
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
      rangeLabel: "Nov 10-16",
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
      rangeLabel: "Nov 17-23",
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
      rangeLabel: "Nov 24-30",
      gate: "Explain what a certificate chain actually proves, why hashing alone doesn't secure a password, and defend the choice of symmetric vs asymmetric encryption for a stated scenario.",
      objectives: [
        "Symmetric vs asymmetric encryption, and why both exist together (e.g. TLS)",
        "Hashing vs encryption -- what each guarantees and what neither does",
        "Digital signatures and what they actually prove",
        "Key exchange (Diffie-Hellman) at a conceptual level",
        "What a TLS handshake establishes, step by step",
        "PKI: certificates, certificate authorities, chains of trust",
      ],
    },
    {
      title: "Cybersecurity II: network defense & threat modeling",
      rangeLabel: "Dec 1-7",
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
      rangeLabel: "Dec 8-14",
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
      rangeLabel: "Dec 15-21",
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
      rangeLabel: "Dec 22-28",
      gate: "Defend the chosen architecture flow layer by layer -- 'AWS handles it' is never sufficient.",
      objectives: [
        "Integrate algorithms, data structures, OS, architecture, and database theory into one architecture flow",
        "Explain the flow through distributed systems, networking, authN/authZ, encryption, and trust boundaries",
        "Explain where threat modeling, usability, and a big-data/mining lens each apply to the same architecture",
      ],
    },
  ],
};

export const SECPLUS_TRACK: SeedTrack = {
  code: "SECPLUS",
  title: "Security+ Coach",
  description: "CompTIA Security+ SY0-701 exam prep across 5 weighted domains, with PBQ scenario drilling.",
  trackType: "certification",
  units: [
    {
      title: "General Security Concepts",
      weight: 12,
      gate: "Given an unfamiliar scenario, name which CIA-triad property and which control type/category apply, and explain a PKI or authentication choice without hand-waving the mechanism.",
      objectives: [
        "CIA triad, non-repudiation, and the AAA security model",
        "Security control types (technical, managerial, operational, physical) and control functions (preventive, detective, corrective, deterrent, compensating, directive)",
        "Cryptographic fundamentals: symmetric vs asymmetric encryption, hashing, digital signatures, key exchange",
        "PKI basics: certificates, certificate authorities, chains of trust, revocation (CRL/OCSP)",
        "Authentication methods and factors: MFA, biometrics, SSO, federation",
        "Access control models: DAC, MAC, RBAC, ABAC, and least privilege",
        "Security policies, governance basics, and change management fundamentals",
      ],
      labs: [
        null,
        null,
        "Generate a self-signed TLS certificate with OpenSSL and inspect its fields with openssl x509 -text -noout.",
        "Open a site in your browser, view its certificate chain, and trace it from the leaf certificate up to the root CA.",
        null,
        null,
        null,
      ],
    },
    {
      title: "Threats, Vulnerabilities, and Mitigations",
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
      ],
      labs: [null, null, null, null, null, "Run a permission-scoped Nmap scan of your own home network and record any unexpected open ports.", null, null],
    },
    {
      title: "Security Architecture",
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
      ],
      labs: [
        "Sketch a segmentation diagram separating IoT, guest, and trusted devices into different VLANs/subnets.",
        "Review your router's or laptop's settings against a basic hardening checklist.",
        "Run openssl s_client -connect <site>:443 and read which TLS version/cipher suite it negotiated.",
        "List which security controls are yours to configure vs the provider's under the shared-responsibility model on a free-tier cloud VM.",
        null,
        "Check how one IoT/embedded device you own receives firmware updates.",
        "Sketch a redundant architecture and identify the single point of failure it removes.",
      ],
    },
    {
      title: "Security Operations",
      weight: 28,
      gate: "Given an incident scenario, correctly sequence the response, prioritize a vulnerability, or reason about an RTO/RPO or forensics constraint -- not just name the vocabulary.",
      objectives: [
        "Security monitoring, log analysis, and SIEM/SOAR fundamentals",
        "Incident response process and the NIST incident response lifecycle",
        "Threat intelligence sources and threat hunting in practice",
        "Vulnerability management: scanning, CVSS scoring, and remediation prioritization",
        "Digital forensics basics: chain of custody, order of volatility, legal holds",
        "Change management and configuration management processes",
        "Business continuity and disaster recovery: BIA, RTO/RPO, backup types, DR sites",
        "Security tools in operation: firewalls, IDS/IPS, EDR, and DLP",
      ],
      labs: [
        "Try a free SIEM sandbox and run one basic search query against sample log data.",
        null,
        null,
        "Look up a recent published CVE for an app/OS you use (nvd.nist.gov) and note its CVSS score.",
        "Write a short chain-of-custody log template for a hypothetical piece of evidence.",
        null,
        "Draft a one-page BIA outline for a small hypothetical business.",
        null,
      ],
    },
    {
      title: "Security Program Management and Oversight",
      weight: 20,
      gate: "Given a governance or compliance scenario, name the right instrument and correctly reason about risk math or third-party exposure.",
      objectives: [
        "Governance frameworks and the policy/standard/procedure/guideline hierarchy",
        "Risk assessment: qualitative vs quantitative analysis (ALE, SLE, ARO)",
        "Third-party and supply-chain risk management",
        "Security awareness training programs",
        "Compliance, regulations, and audits (GDPR, HIPAA, PCI DSS)",
        "Security metrics, KPIs, and reporting to leadership",
      ],
      labs: [null, null, null, null, null, null],
    },
  ],
};

export const SEED_USER_EMAIL = process.env.DEFAULT_USER_EMAIL || "pak@example.com";
