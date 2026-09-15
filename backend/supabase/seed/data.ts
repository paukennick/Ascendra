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

// ---------------------------------------------------------------------------
// Python: intro -> intermediate -> advanced progression, one language track.
// ---------------------------------------------------------------------------
export const PYTHON_TRACK: SeedTrack = {
  code: "PYTHON",
  title: "Python Programming Coach",
  description:
    "9-week intro-to-advanced Python progression: syntax and control flow through OOP, the standard library, functional patterns, testing/typing, and concurrency.",
  trackType: "graduate",
  units: [
    {
      title: "Syntax, variables & control flow",
      rangeLabel: "Week 1",
      gate: "Given an unfamiliar short Python script, trace its execution by hand and predict its output, including any conditional branches or loop iterations.",
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
      objectives: [
        "Writing unit tests with pytest: assertions, fixtures, parametrization",
        "Debugging techniques: reading tracebacks, using a debugger, print-driven debugging tradeoffs",
        "Type hints: basic annotations, Optional, List/Dict generics, and static checking with mypy",
        "Code style and linting (PEP 8, flake8/ruff) and why consistency matters",
      ],
    },
    {
      title: "Concurrency, performance & a capstone project",
      rangeLabel: "Week 9",
      gate: "Explain when threading, multiprocessing, or asyncio is the right tool for a stated I/O-bound or CPU-bound problem, and justify your choice against the alternatives.",
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

// ---------------------------------------------------------------------------
// JavaScript: intro -> intermediate -> advanced progression, one language track.
// ---------------------------------------------------------------------------
export const JAVASCRIPT_TRACK: SeedTrack = {
  code: "JAVASCRIPT",
  title: "JavaScript Programming Coach",
  description:
    "9-week intro-to-advanced JavaScript progression: syntax and the DOM through async patterns, ES6+, prototypes, testing/tooling, and Node.js.",
  trackType: "graduate",
  units: [
    {
      title: "Syntax, variables & control flow",
      rangeLabel: "Week 1",
      gate: "Given an unfamiliar short JS snippet using var, let, and const, predict its output and explain any hoisting or scoping surprise it contains.",
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
  title: "Linux+ Coach",
  description: "CompTIA Linux+ XK0-006 exam prep across 5 weighted domains, with hands-on shell labs.",
  trackType: "certification",
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
        "Harden a test SSH server by disabling password authentication and root login.",
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
// CompTIA CySA+ (CS0-003). Domain weights from training knowledge, not
// re-verified live -- sanity-check against the official exam objectives PDF
// before treating this as exam-accurate.
// ---------------------------------------------------------------------------
export const CYSAPLUS_TRACK: SeedTrack = {
  code: "CYSAPLUS",
  title: "CySA+ Coach",
  description: "CompTIA CySA+ CS0-003 exam prep across 4 weighted domains, with SOC-analyst drilling.",
  trackType: "certification",
  units: [
    {
      title: "Security Operations",
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
      title: "Vulnerability Management",
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
      title: "Incident Response and Management",
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
      title: "Reporting and Communication",
      weight: 17,
      gate: "Translate a technical vulnerability finding into a one-paragraph summary appropriate for a non-technical executive, without losing the actual risk.",
      objectives: [
        "Communicating findings to technical vs. non-technical audiences",
        "Metrics and KPIs for a security operations program",
        "Stakeholder management during incidents",
        "Compliance and regulatory reporting considerations",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// CompTIA PenTest+ (PT0-003). Domain weights verified live against comptia.org.
// ---------------------------------------------------------------------------
export const PENTESTPLUS_TRACK: SeedTrack = {
  code: "PENTESTPLUS",
  title: "PenTest+ Coach",
  description: "CompTIA PenTest+ PT0-003 exam prep across 5 weighted domains, with authorized lab-environment drilling.",
  trackType: "certification",
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
        "Run a permission-scoped Nmap scan against your own home network and interpret the service/version output.",
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
        "Complete a beginner exploitation walkthrough on an intentionally vulnerable lab VM (e.g. a local capture-the-flag box) and document each step.",
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
  title: "SecurityX Coach",
  description: "CompTIA SecurityX CAS-005 exam prep across 4 weighted domains for enterprise security architecture and engineering.",
  trackType: "certification",
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
// Liberty University BS, Computational Mathematics: Computer Science
// (2026-2027 Degree Completion Plan, CMPC-BS-D). Every course code, elective
// list, and credit count mirrored directly from the official degree plan PDF --
// units follow the plan's own section breakdown; "Major Courses" is split into
// two units (Mathematics core / CS Cognate) purely for pacing.
// ---------------------------------------------------------------------------
export const CMPCBS_TRACK: SeedTrack = {
  code: "CMPCBS",
  title: "Computational Math: CS Degree Coach",
  description:
    "Liberty University's 2026-2027 BS in Computational Mathematics: Computer Science degree completion plan (120 credits) -- gen ed, Christianity core, and the full math/CS major sequence, mirrored from the official plan.",
  trackType: "graduate",
  units: [
    {
      title: "Communication & Information Literacy",
      rangeLabel: "9 credits",
      gate: "Confirm which electives in this block are already satisfied by transfer credit before enrolling -- Info Literacy Elective I is satisfied by CSIS 110, shared with Major Foundational Courses, so it isn't a separate course to take.",
      objectives: [
        "Composition and Rhetoric (ENGL 101)",
        "Communications elective -- choose 3 credits from COMS 101, BUSI 300, ENGR 270, or GICE 220",
        "Information Literacy Elective I -- satisfied by CSIS 110 (shared credit from Major Foundational Courses)",
        "Information Literacy Elective II -- choose 3 credits from ARTS 209, BUSI 201, CSIS 100, CSIS 110, CSIS 111, ENGL 102, ENGL 103, GEOG 200, HIEU 201, HIEU 202, HIUS 221, HIUS 222, HIUS 341, HIUS 360, HIUS 380, HIWD 370, or WRSP 101",
      ],
    },
    {
      title: "Technological Solutions & Quantitative Reasoning",
      rangeLabel: "3 credits",
      gate: "The Math Elective here is satisfied by MATH 131, shared with Major Foundational Courses -- don't schedule it as a second course.",
      objectives: [
        "Instructional Technology for Online Learning (UNIV 104)",
        "Math elective -- satisfied by MATH 131 (shared credit from Major Foundational Courses)",
      ],
    },
    {
      title: "Critical Thinking",
      rangeLabel: "7 credits",
      gate: "Pick a Critical Thinking elective that won't double up with a course you're already taking elsewhere in gen ed -- several PHIL/ENGL options here overlap in skillset with the Civic & Global Engagement block.",
      objectives: [
        "Critical Thinking elective -- choose 3 credits from ARTS 105, ARTS 205, ARTS 214, BUSI 205, ENGL 201, ENGL 202, ENGL 216, ENGL 221, ETHC 101, ETHC 205, PHIL 201, or PHIL 240",
        "Christian Life and Biblical Worldview (RLGN 104)",
      ],
    },
    {
      title: "Civic & Global Engagement",
      rangeLabel: "3 credits",
      gate: "Choose the Cultural Studies elective based on what you can actually transfer in, if applicable -- the approved list spans languages, government, and religion, so options vary widely in workload.",
      objectives: [
        "Cultural Studies elective -- choose 3 credits from ARTS 105, CSTU 101, CSTU 220, GICE 290, GOVT 200, GOVT 220, MUSC 103, or RLGN 210",
      ],
    },
    {
      title: "Social & Scientific Inquiry",
      rangeLabel: "6 credits",
      gate: "Pick a Natural Science elective with a lab component in mind if you'll need one later -- not all options in the approved list include one.",
      objectives: [
        "Natural Science elective -- choose 3 credits from BIOL 101, BIOL 102, ETHC 210, NASC 210, PHSC 121, PHSC 122, PHSC 210, PHYS 101, PHYS 201, or PHYS 231",
        "Social Science elective -- choose 3 credits from BUSI 223, BUSI 240, ECON 110, ECON 213, ECON 214, HLTH 252, PSYC 101, PSYC 210, SOCI 200, or SOCI 201",
      ],
    },
    {
      title: "Christianity & Contexts",
      rangeLabel: "8 credits",
      gate: "Check transfer-credit waivers before scheduling these -- students transferring in 45+ UG credits have RLGN 104 waived, and 60+ UG credits also waives THEO 104.",
      objectives: [
        "Survey of Old and New Testament (BIBL 104)",
        "Introduction to Theology Survey (THEO 104)",
      ],
    },
    {
      title: "Major Foundational Courses",
      rangeLabel: "7 credits",
      gate: "Earn a C or higher in both -- Liberty requires it for every major foundational course, and CSIS 110 plus MATH 131 are prerequisites the entire major sequence is built on.",
      objectives: [
        "Introduction to Computer Science (CSIS 110)",
        "Calculus and Analytic Geometry I (MATH 131)",
      ],
    },
    {
      title: "Major Courses -- Mathematics core",
      rangeLabel: "40 credits",
      gate: "Maintain a C or higher in every upper-level math course -- Liberty requires it for major courses, and this sequence is load-bearing: Linear Algebra underpins Numerical Methods and Multivariable Calculus, and Probability feeds directly into Regression and Forecasting.",
      objectives: [
        "Calculus and Analytic Geometry II (MATH 132)",
        "Introduction to Statistical Analysis (MATH 211)",
        "Introduction to Discrete Mathematics (MATH 250)",
        "Introduction to the History of Mathematics (MATH 345)",
        "Matrix and Linear Algebra (MATH 410)",
        "Numerical Methods (MATH 412)",
        "Abstract Algebraic Structures (MATH 423)",
        "Multivariable Calculus (MATH 430)",
        "Applied Differential Equations (MATH 432)",
        "Probability I (MATH 441)",
        "Mathematical Modeling and Simulation (MATH 460)",
        "Computational Mathematics Capstone (MATH 491)",
        "Regression and Forecasting I (STAT 420)",
      ],
    },
    {
      title: "Major Courses -- Computer Science Cognate",
      rangeLabel: "15 credits",
      gate: "Write and debug real C++ programs, not just read about syntax -- CSIS 112 and CSIS 215 both assume the fluency CSIS 111 is supposed to build, not just a passing grade in it.",
      objectives: [
        "Introduction to Information Sciences and Systems (CSIS 100)",
        "Introduction to Programming Using C++ (CSIS 111)",
        "Advanced Programming Using C++ (CSIS 112)",
        "Algorithms and Data Structures (CSIS 215)",
        "Studies in Information Security (CSIS 340)",
      ],
    },
    {
      title: "Free Electives",
      rangeLabel: "22 credits",
      gate: "No courses are specified -- use these credits deliberately (e.g. a minor, a second language, or extra CS depth) rather than defaulting to whatever fills a schedule gap.",
      objectives: [
        "22 credits of free electives, any 100-400 level course not already required elsewhere in the plan",
      ],
    },
    {
      title: "Graduation Requirements",
      rangeLabel: "checklist",
      gate: "Track these five gates independently of credit totals -- it's possible to have enough overall credits and still miss the upper-level or Liberty-residency minimums.",
      objectives: [
        "Minimum 120 credits overall applied to the program of study",
        "Minimum 2.0 graduation GPA",
        "Minimum 30 upper-level (300-400) credits applied to the program",
        "Minimum 13.75 Liberty credits applied to the major",
        "Minimum 30 Liberty credits applied to the overall program of study",
        "Submit the Degree Completion Application within the final semester before graduation",
      ],
    },
  ],
};

export const SEED_USER_EMAIL = process.env.DEFAULT_USER_EMAIL || "pak@example.com";
