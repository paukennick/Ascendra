// REQ-264: the OpenEDG Python Institute's entry and associate certifications,
// PCEP and PCAP, built on Nick's approval of 2026-11-14.
//
// What was read, and when (all 2026-11-14, on pythoninstitute.org as raw
// HTML, not through a summary):
//   - https://pythoninstitute.org/pcep -- PCEP-30-03: 35 questions, 50
//     minutes, passing score 70%, single-select, multiple-select,
//     interactive and scenario-based items, delivered through TestNow
//     (OpenEDG Testing Service), no prerequisites, credential valid 5 years.
//   - https://pythoninstitute.org/pcep-exam-syllabus -- PCEP-30-03 syllabus,
//     "Blueprint version 1.5 · Last revised November 2, 2026", five sections
//     at 17 / 23 / 26 / 20 / 14 percent (6 / 8 / 9 / 7 / 5 questions), 35
//     objectives. The page says the percentages are "blueprint scoring
//     weights and may differ from question-count percentages".
//   - https://pythoninstitute.org/pcep-30-02 -- the previous version,
//     PCEP-30-02, is "Active until November 30, 2027 (Sunset Date)"; the
//     new version PCEP-30-03 was "released on October 31, 2026".
//   - https://pythoninstitute.org/pcap -- PCAP-31-04: 42 questions, 65
//     minutes, passing score 72%, single-select, multiple-select,
//     interactive, code-based and scenario-based items; no formal
//     prerequisite (PCEP-level knowledge recommended); valid 5 years.
//   - https://pythoninstitute.org/pcap-exam-syllabus -- PCAP-31-04
//     syllabus, "Blueprint version 1.5 · Last revised November 2, 2026", six
//     sections at 12 / 12 / 9.5 / 28.5 / 24 / 14 percent (5 / 5 / 4 / 12 /
//     10 / 6 questions), 42 objectives.
//   - https://pythoninstitute.org/pcap-31-03 -- PCAP-31-03 is active until
//     2027-11-30; PCAP-31-04 was released on 2026-10-31.
//
// So both courses teach the NEW versions (PCEP-30-03, PCAP-31-04). A learner
// booked on the old versions before their 2027-11-30 sunset is told so in the
// credential's versionNote. Neither page names the Python version the exams
// are written against; the Python facts below come from the language's own
// documentation (the PYTHON course's sources, re-read 2026-11-14 where cited)
// and say when a feature is new in 3.14 or 3.15, so a lesson never assumes a
// feature an older interpreter lacks.
//
// Outline statements: each unit carries its section's numbered objectives as
// printed (e.g. "1.1.1 Explain the fundamental concepts ..."), headings only,
// never the bullet text under them (the Python Institute's syllabus is its
// own material; the repo's paraphrase rule, Nov 11). Objectives are our own
// wording.
//
// Trademarks: the pages mark PCEP™ and PCAP™ and name the body "OpenEDG
// Python Institute". Titles follow the descriptive pattern of REQ-194 ("Prep
// for the ... Exam") and the descriptions carry an independence statement.

import type { SeedTrack, UnitSource, SeedCredential } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
// 12 months, the default re-check for an exam outline (seed/sources.ts
// RECHECK_MONTHS); both versions are new (2026-10-31), so no announced
// change falls sooner.
const REVIEW_DUE_AT = "2027-11-14T00:00:00Z";

const PCEP_SYLLABUS = "https://pythoninstitute.org/pcep-exam-syllabus";
const PCAP_SYLLABUS = "https://pythoninstitute.org/pcap-exam-syllabus";

const src = (title: string, url: string, kind: UnitSource["kind"], extra: Partial<UnitSource> = {}): UnitSource => ({
  title,
  ...source(url, kind, CHECKED),
  ...extra,
});
const outline = (title: string, url: string, statements: string[], keyValues?: string[]): UnitSource =>
  src(title, url, "exam_outline", keyValues ? { outline: statements, keyValues } : { outline: statements });

const PY_DOCS = {
  tutorialIntro: src("The Python Tutorial: An Informal Introduction to Python", "https://docs.python.org/3/tutorial/introduction.html", "reference", {
    keyValues: [
      "/ always returns a float; // is floor division (rounds toward minus infinity, so -7 // 2 is -4) and % takes the sign of the divisor (-7 % 2 is 1)",
      "** binds more tightly than unary minus: -3 ** 2 is -9; ** is right-associative: 2 ** 3 ** 2 is 512",
    ],
  }),
  floats: src("The Python Tutorial: Floating-Point Arithmetic: Issues and Limitations", "https://docs.python.org/3/tutorial/floatingpoint.html", "reference", {
    keyValues: ["0.1 + 0.2 == 0.3 is False because binary floating point cannot represent 0.1 exactly; compare with math.isclose() or round() instead of =="],
  }),
  controlFlow: src("The Python Tutorial: More Control Flow Tools", "https://docs.python.org/3/tutorial/controlflow.html", "reference", {
    keyValues: [
      "A loop's else clause runs when the loop finishes without break (for: the iterable is exhausted; while: the condition becomes false); it does not run after break",
      "range(stop) and range(start, stop[, step]) never include stop; a negative step counts down (range(5, 0, -2) gives 5, 3, 1)",
    ],
  }),
  walrus: src("Python Language Reference: Assignment expressions", "https://docs.python.org/3/reference/expressions.html#assignment-expressions", "reference", {
    keyValues: ["The assignment expression NAME := expr (Python 3.8+) assigns and yields the value; it must be parenthesized in most statement-level positions, e.g. while (line := f.readline()):"],
  }),
  dataStructures: src("The Python Tutorial: Data Structures", "https://docs.python.org/3/tutorial/datastructures.html", "reference", {
    keyValues: [
      "list.sort() sorts in place and returns None; sorted() returns a new list",
      "A one-element tuple needs a trailing comma: (5,) is a tuple, (5) is the int 5; {} is an empty dict, set() is an empty set",
      "Dictionaries preserve insertion order (guaranteed since Python 3.7)",
    ],
  }),
  stringMethods: src("Built-in types: String methods", "https://docs.python.org/3/library/stdtypes.html#string-methods", "reference", {
    keyValues: [
      "str.find() returns -1 when the substring is absent; str.index() raises ValueError",
      "Strings are immutable: every string method returns a new string and leaves the original unchanged",
    ],
  }),
  fstrings: src("Python Language Reference: f-strings", "https://docs.python.org/3/reference/lexical_analysis.html#f-strings", "reference"),
  errors: src("The Python Tutorial: Errors and Exceptions", "https://docs.python.org/3/tutorial/errors.html", "reference", {
    keyValues: [
      "except clauses are tried in order and the first matching one runs, so a handler for a base class placed first hides the handlers for its subclasses below it",
      "Since Python 3.14 (PEP 758) several exception types may be listed without parentheses only when there is no as clause; the parenthesized tuple form (except (ValueError, TypeError):) works on every version",
    ],
  }),
  builtinExceptions: src("Built-in exceptions: exception hierarchy", "https://docs.python.org/3/library/exceptions.html", "reference", {
    keyValues: [
      "BaseException is the root; Exception derives from it, and KeyboardInterrupt, SystemExit and GeneratorExit derive from BaseException directly, so except Exception: does not catch them",
      "ZeroDivisionError is a subclass of ArithmeticError; IndexError and KeyError are subclasses of LookupError",
    ],
  }),
  inputOutput: src("The Python Tutorial: Input and Output (reading and writing files)", "https://docs.python.org/3/tutorial/inputoutput.html", "reference"),
  open: src("Built-in functions: open()", "https://docs.python.org/3/library/functions.html#open", "reference", {
    keyValues: [
      "Mode 'w' truncates an existing file, 'a' appends, 'x' fails with FileExistsError if the file exists; 'b' is binary and 't' (text) is the default",
      "Since Python 3.15 (PEP 686) text files opened without an encoding argument use UTF-8; on 3.14 and earlier the default was the locale encoding, so pass encoding=\"utf-8\" for code that must behave the same everywhere",
    ],
  }),
  csv: src("csv: CSV file reading and writing", "https://docs.python.org/3/library/csv.html", "reference", {
    keyValues: ["Open a file for the csv module with newline=''; csv.reader yields each row as a list of strings, so numbers must be converted with int() or float()"],
  }),
  math: src("math: mathematical functions", "https://docs.python.org/3/library/math.html", "reference", {
    keyValues: ["math.ceil() and math.floor() return int; math.trunc() rounds toward zero (math.trunc(-2.7) is -2 while math.floor(-2.7) is -3); math.sqrt() returns a float"],
  }),
  random: src("random: generate pseudo-random numbers", "https://docs.python.org/3/library/random.html", "reference", {
    keyValues: [
      "random.random() returns a float in [0.0, 1.0); random.sample(population, k) picks k unique elements; random.seed(n) makes the sequence repeatable",
      "random is not suitable for security purposes; use the secrets module for tokens and passwords",
    ],
  }),
  modules: src("The Python Tutorial: Modules and packages", "https://docs.python.org/3/tutorial/modules.html", "reference", {
    keyValues: [
      "A module's __name__ is \"__main__\" when it is run as a script and the module's own name when it is imported",
      "Compiled bytecode is cached in __pycache__ as module.<implementation tag>.pyc (for example module.cpython-315.pyc)",
    ],
  }),
  syspath: src("The initialization of the sys.path module search path", "https://docs.python.org/3/library/sys_path_init.html", "reference"),
  pip: src("Installing Python modules (python -m pip)", "https://docs.python.org/3/installing/index.html", "reference", {
    keyValues: ["Run pip as python -m pip so it installs into the interpreter you mean; pip freeze > requirements.txt records exact versions and pip install -r requirements.txt reproduces them"],
  }),
  classes: src("The Python Tutorial: Classes", "https://docs.python.org/3/tutorial/classes.html", "reference", {
    keyValues: [
      "A name with two leading underscores (at most one trailing) inside a class body is mangled to _ClassName__name; it prevents accidental clashes in subclasses and is not access control",
      "Assigning to an instance attribute with the same name as a class attribute creates an instance attribute that hides the class attribute for that instance only",
    ],
  }),
  mro: src("The Python 2.3 Method Resolution Order (C3), python.org", "https://docs.python.org/3/howto/mro.html", "reference", {
    keyValues: ["Python uses C3 linearization: Class.__mro__ (or Class.mro()) lists the lookup order; in class D(B, C) with B and C both deriving from A, the order is D, B, C, A, object"],
  }),
  stdtypesSpecial: src("Built-in types: special attributes (__name__, __module__, __bases__, __dict__)", "https://docs.python.org/3/reference/datamodel.html", "reference"),
  unicode: src("Unicode HOWTO", "https://docs.python.org/3/howto/unicode.html", "reference", {
    keyValues: [
      "str holds Unicode code points; bytes holds raw 8-bit values; str.encode() produces bytes and bytes.decode() produces str",
      "UTF-8 uses one to four bytes per code point and encodes ASCII characters as the same single byte; ord('A') is 65 and chr(8364) is '€'",
    ],
  }),
  match: src("The Python Tutorial: match statements", "https://docs.python.org/3/tutorial/controlflow.html#match-statements", "reference", {
    keyValues: ["match-case (Python 3.10+) runs only the first matching case; the wildcard case _: matches anything and never binds a name"],
  }),
  whatsNew315: src("What's new in Python 3.15", "https://docs.python.org/3/whatsnew/3.15.html", "reference", {
    keyValues: [
      "New in 3.15 only: * and ** unpacking inside comprehensions (PEP 798), so [*row for row in matrix] flattens a list of lists; on 3.14 and earlier write [x for row in matrix for x in row] or itertools.chain.from_iterable(matrix)",
    ],
  }),
  functional: src("Built-in functions: map() and filter()", "https://docs.python.org/3/library/functions.html#map", "reference", {
    keyValues: ["map() and filter() return lazy iterators in Python 3; wrap them in list() to see or reuse the values, and an exhausted iterator yields nothing the second time"],
  }),
  pathlib: src("pathlib: object-oriented filesystem paths", "https://docs.python.org/3/library/pathlib.html", "reference", {
    keyValues: ["Path objects join with the / operator; Path.read_text()/write_text() handle text and read_bytes()/write_bytes() handle bytes, opening and closing the file for you; Path.iterdir() yields the entries of a directory in arbitrary order"],
  }),
  sys: src("sys: stdin, stdout and stderr", "https://docs.python.org/3/library/sys.html#sys.stdin", "reference"),
  unittest: src("unittest: unit testing framework", "https://docs.python.org/3/library/unittest.html", "reference"),
  assertStmt: src("Python Language Reference: The assert statement", "https://docs.python.org/3/reference/simple_stmts.html#the-assert-statement", "reference", {
    keyValues: ["assert statements are removed when Python runs with -O, so never use assert to validate user input or enforce security checks"],
  }),
  pdb: src("pdb: the Python debugger", "https://docs.python.org/3/library/pdb.html", "reference", {
    keyValues: ["Call the built-in breakpoint() to stop in pdb at that line"],
  }),
};

// ---------------------------------------------------------------------------
// PCEP-30-03
// ---------------------------------------------------------------------------
const PCEP_OUTLINE = {
  fundamentals: [
    "1.1.1 Explain the fundamental concepts of programming language structure and code execution",
    "1.2.1 Apply the fundamental structural rules of Python programs",
    "1.3.1 Represent data using Python literals",
    "1.3.2 Create and manage variables according to Python naming conventions",
    "1.4.1 Use operators and expressions",
    "1.4.2 Perform console I/O operations and type conversions",
  ],
  controlFlow: [
    "2.1.1 Control program flow using if and if-else statements",
    "2.1.2 Select among multiple execution paths using if-elif-else statements",
    "2.1.3 Construct compound and nested conditional structures",
    "2.2.1 Create condition-controlled loops using while",
    "2.2.2 Iterate through sequences and iterable objects using for and in",
    "2.2.3 Generate numeric iterations using range()",
    "2.2.4 Construct nested loops and combined control structures",
    "2.2.5 Control loop execution using break, continue, and pass",
  ],
  collections: [
    "3.1.1 Construct lists and access their elements",
    "3.1.2 Modify, search, sort, and iterate through lists",
    "3.1.3 Create, access, and modify multidimensional lists",
    "3.2.1 Construct, access, and use tuples effectively",
    "3.3.1 Collect and process unique values using sets",
    "3.4.1 Construct, modify, and process dictionary data",
    "3.5.1 Construct strings and access their contents",
    "3.5.2 Process and transform strings",
    "3.5.3 Format values as strings",
  ],
  functions: [
    "4.1.1 Define and invoke user-defined functions",
    "4.1.2 Return values from functions",
    "4.1.3 Define parameters and pass arguments to functions",
    "4.1.4 Accept variable numbers of arguments",
    "4.1.5 Manage variable scope",
    "4.2.1 Explain and recognize basic Python exceptions",
    "4.2.2 Handle runtime exceptions with try and except",
  ],
  files: [
    "5.1.1 Work with text files",
    "5.1.2 Work with CSV files",
    "5.2.1 Import and use modules",
    "5.2.2 Perform mathematical evaluations using the math module",
    "5.2.3 Generate and select pseudorandom values using the random module",
  ],
};

const PCEP_FORMAT = [
  "PCEP-30-03: 35 questions in 50 minutes, passing score 70%; single-select, multiple-select, interactive and scenario-based items, taken through TestNow (OpenEDG Testing Service)",
  "PCEP-30-02 remains active until its sunset on 2027-11-30; PCEP-30-03 was released on 2026-10-31",
];

const PYTHON_INSTITUTE = {
  providerSlug: "python-institute",
  providerName: "OpenEDG Python Institute",
  providerUrl: "https://pythoninstitute.org/",
  subcategorySlug: "programming-languages",
  credentialType: "certification",
} as const satisfies Partial<SeedCredential>;

export const PCEP_TRACK: SeedTrack = {
  code: "PCEP",
  title: "Prep for an entry-level Python programmer certification exam",
  description:
    "An entry-level Python programmer certification exam: reading, tracing and writing short Python programs -- literals, variables and operators, conditions and loops, lists, tuples, sets, dictionaries and strings, functions and basic exceptions, text and CSV files, and the math and random modules. Python is a trademark of the Python Software Foundation. Independently developed exam prep; not affiliated with or endorsed by the organization that owns or administers this exam.",
  trackType: "certification",
  subcategorySlug: "programming-languages",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://pythoninstitute.org/pcep",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  credential: {
    ...PYTHON_INSTITUTE,
    credentialSlug: "pcep",
    credentialName: "PCEP – Certified Entry-Level Python Programmer",
    credentialUrl: "https://pythoninstitute.org/pcep",
    examCode: "PCEP-30-03",
    status: "active",
    effectiveDate: "2026-10-31",
    objectivesRevision: "Blueprint version 1.5, last revised November 2, 2026",
    versionNote:
      "Teaches PCEP-30-03 (released 2026-10-31). The previous version, PCEP-30-02, can still be taken until its sunset on 2027-11-30; its syllabus is at pythoninstitute.org/pcep-30-02.",
    officialObjectivesUrl: PCEP_SYLLABUS,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "None required; PCEP is the entry point of the Python Institute's general-purpose programming path.",
    durationMinutes: 50,
    questionFormat: "35 questions: single-select, multiple-select, interactive and scenario-based (TestNow, OpenEDG Testing Service)",
    passingScorePolicy: "70%",
  },
  units: [
    {
      title: "Computer Programming and Python Fundamentals",
      rangeLabel: "17% of the exam",
      weight: 17,
      gate: "Given a short Python program that mixes literals, operators and console input, predict its exact output, including the type of every value printed, and fix any line that would raise an error.",
      sources: [outline("PCEP-30-03 Exam Syllabus, section 1", PCEP_SYLLABUS, PCEP_OUTLINE.fundamentals, PCEP_FORMAT), PY_DOCS.tutorialIntro, PY_DOCS.floats],
      objectives: [
        "Tell lexical, syntax and semantic errors apart and explain how CPython turns source code into running bytecode",
        "Recognize keywords, statements and expressions, and write correctly indented blocks with comments",
        "Choose the right literal for a value (int, float, str, bool) and explain why some decimal fractions are inexact as floats",
        "Name variables legally and readably (PEP 8 snake_case) and trace how assignment rebinds a name to a value",
        "Evaluate expressions using arithmetic, string, comparison and Boolean operators with correct precedence and associativity",
        "Read console input, convert it with int(), float() or str(), and print the processed result",
      ],
    },
    {
      title: "Control Flow: Conditional Blocks and Loops",
      rangeLabel: "23% of the exam",
      weight: 23,
      gate: "Given a loop with nested conditions, break, continue or an else clause, trace every value the loop variable takes and the exact output, and rewrite the loop so it stops where the specification says.",
      sources: [outline("PCEP-30-03 Exam Syllabus, section 2", PCEP_SYLLABUS, PCEP_OUTLINE.controlFlow, PCEP_FORMAT), PY_DOCS.controlFlow, PY_DOCS.walrus],
      objectives: [
        "Trace which branch of an if, if-else or if-elif-else chain runs, and spot branches that can never be reached",
        "Write combined and nested conditions so that every case in a stated rule takes the intended path",
        "Write a while loop with a correct sentinel or counter, and recognize a condition that never becomes false",
        "Iterate over strings, lists and tuples with for, and count the iterations range(start, stop, step) produces",
        "Trace nested loops over grouped data and the order in which the inner and outer bodies run",
        "Apply break, continue and pass to control a loop, and predict the output when they are combined",
        "Use an assignment expression (:=) in a while condition where it removes a repeated read",
      ],
    },
    {
      title: "Data Collections: Lists, Tuples, Sets, Dictionaries, and Strings",
      rangeLabel: "26% of the exam",
      weight: 26,
      gate: "Given a data-shaping task, pick the right collection for it, then write and trace the indexing, slicing, method calls and loops that build the result -- including which operations change the original and which return a new object.",
      sources: [
        outline("PCEP-30-03 Exam Syllabus, section 3", PCEP_SYLLABUS, PCEP_OUTLINE.collections, PCEP_FORMAT),
        PY_DOCS.dataStructures,
        PY_DOCS.stringMethods,
        PY_DOCS.fstrings,
      ],
      objectives: [
        "Build lists and read elements with positive and negative indexes and slices, including start, stop and step",
        "Modify, search and sort a list with append, insert, index, del, sort and sorted, and say which return None",
        "Create and update a matrix as a list of lists, and avoid the shared-row trap of multiplying a nested list",
        "Construct tuples (including the single-element form), slice them, and explain when immutability makes a tuple the better choice",
        "Collect unique values in a set, add and remove members, and test membership",
        "Build, update and iterate a dictionary with keys(), values() and items(), checking for a key before reading it",
        "Index and slice strings, use escape sequences and multiline literals, and explain why a string cannot be changed in place",
        "Transform text with case, find, split, join, strip and replace methods",
        "Format output with f-strings, and recognize the same result written with format() and the % operator",
      ],
    },
    {
      title: "Functions and Exceptions",
      rangeLabel: "20% of the exam",
      weight: 20,
      gate: "Given a function with default, keyword, *args and **kwargs parameters and a global name it reads or changes, predict the result of each call, name any call that raises an error and why, and handle the error a caller should expect.",
      sources: [outline("PCEP-30-03 Exam Syllabus, section 4", PCEP_SYLLABUS, PCEP_OUTLINE.functions, PCEP_FORMAT), PY_DOCS.controlFlow, PY_DOCS.errors, PY_DOCS.builtinExceptions],
      objectives: [
        "Define and call functions to decompose a problem, tracing the order in which definitions and calls run",
        "Return one or several values, distinguish returning from printing, and recognize an implicit None",
        "Pass arguments by position and keyword with defaults, and diagnose missing, duplicated or misordered arguments",
        "Collect extra arguments with *args (a tuple) and **kwargs (a dict) in a valid parameter order",
        "Resolve names across local and global scope, including shadowing and the global statement",
        "Match common built-in exceptions (ValueError, TypeError, ZeroDivisionError, IndexError, KeyError, NameError) to the operations that raise them",
        "Handle runtime errors with try and one or more specific except branches, and trace the flow when one is raised",
      ],
    },
    {
      title: "File Handling and Module Imports",
      rangeLabel: "14% of the exam",
      weight: 14,
      gate: "Given a small data file and a task, write the code that opens it in the right mode with with, reads or appends lines or CSV rows, converts the values, and uses math or random correctly -- including what the program does when the file is missing.",
      sources: [
        outline("PCEP-30-03 Exam Syllabus, section 5", PCEP_SYLLABUS, PCEP_OUTLINE.files, PCEP_FORMAT),
        PY_DOCS.inputOutput,
        PY_DOCS.open,
        PY_DOCS.csv,
        PY_DOCS.math,
        PY_DOCS.random,
      ],
      objectives: [
        "Open text files in r, w and a modes inside with, and predict what each mode does to existing content",
        "Read and write CSV rows with csv.reader and csv.writer, converting each field to the right type",
        "Import a module and call what it provides, and explain why reusing library code beats rewriting it",
        "Calculate with math.ceil, floor, trunc and sqrt, including how they treat negative numbers",
        "Generate repeatable pseudorandom values with random.seed, random, choice and sample",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// PCAP-31-04
// ---------------------------------------------------------------------------
const PCAP_OUTLINE = {
  modules: [
    "1.1.1 Apply module import statements and namespace rules",
    "1.1.2 Inspect module contents and resolve module search paths",
    "1.2.1 Create and use user-defined modules",
    "1.2.2 Create and organize Python packages",
    "1.3.1 Manage external packages and project dependencies",
  ],
  exceptions: [
    "2.1.1 Handle exception types and inspect exception objects",
    "2.1.2 Control exception-handling flow with else and finally",
    "2.1.3 Analyze Python’s exception hierarchy and exception objects",
    "2.1.4 Raise and propagate exceptions",
    "2.2.1 Define and integrate custom exception classes",
  ],
  strings: [
    "3.1.1 Work with character encoding and Unicode code points",
    "3.2.1 Analyze string immutability and comparison behavior",
    "3.2.2 Classify and validate string contents using is...() methods",
    "3.2.3 Analyze string search and ordering behavior",
  ],
  oop: [
    "4.1.1 Explain the fundamental principles of object-oriented programming",
    "4.1.2 Identify class components and object relationships in Python code",
    "4.2.1 Create and use instance and class variables",
    "4.2.2 Inspect namespaces and apply name mangling",
    "4.3.1 Define and invoke instance methods",
    "4.4.1 Inspect objects and classes using introspection",
    "4.4.2 Discover class metadata and inheritance information",
    "4.5.1 Build class hierarchies using single inheritance",
    "4.5.2 Apply multiple inheritance and resolve diamond-shaped hierarchies",
    "4.5.3 Use type and identity checks in polymorphic code",
    "4.6.1 Construct and initialize class instances",
    "4.6.2 Use flexible and safe initialization patterns",
  ],
  advanced: [
    "5.1.1 Build and filter data structures using comprehensions",
    "5.1.2 Construct and interpret nested comprehensions",
    "5.2.1 Perform structural pattern matching with match-case",
    "5.2.2 Use else clauses with loops",
    "5.3.1 Define and use lambda functions",
    "5.3.2 Transform and filter iterable data using map() and filter()",
    "5.3.3 Define and use closures",
    "5.4.1 Explain Python input/output terminology and modes",
    "5.4.2 Perform text and binary file operations safely",
    "5.4.3 Navigate and manipulate the filesystem using pathlib",
  ],
  practice: [
    "6.1.1 Apply unit testing concepts using test cases and assertions",
    "6.1.2 Debug Python programs and identify the causes of defects",
    "6.2.1 Coordinate development work using shared repositories and version control",
    "6.2.2 Communicate, review, and validate changes in collaborative development workflows",
    "6.3.1 Use AI-assisted tools to generate and improve Python code",
    "6.3.2 Validate and use AI-generated Python code responsibly",
  ],
};

const PCAP_FORMAT = [
  "PCAP-31-04: 42 questions in 65 minutes, passing score 72%; single-select, multiple-select, interactive, code-based and scenario-based items, taken through TestNow (OpenEDG Testing Service)",
  "PCAP-31-03 remains active until its sunset on 2027-11-30; PCAP-31-04 was released on 2026-10-31",
];

export const PCAP_TRACK: SeedTrack = {
  code: "PCAP",
  title: "Prep for an associate Python programmer certification exam",
  description:
    "An associate Python programmer certification exam: modules, packages and pip; exception hierarchies and custom exceptions; Unicode and string analysis; classes, inheritance, MRO and introspection; comprehensions, match-case, lambdas, closures, files and pathlib; and testing, debugging, code review and checking AI-generated code. Python is a trademark of the Python Software Foundation. Independently developed exam prep; not affiliated with or endorsed by the organization that owns or administers this exam.",
  trackType: "certification",
  subcategorySlug: "programming-languages",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://pythoninstitute.org/pcap",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  credential: {
    ...PYTHON_INSTITUTE,
    credentialSlug: "pcap",
    credentialName: "PCAP – Certified Associate Python Programmer",
    credentialUrl: "https://pythoninstitute.org/pcap",
    examCode: "PCAP-31-04",
    status: "active",
    effectiveDate: "2026-10-31",
    objectivesRevision: "Blueprint version 1.5, last revised November 2, 2026",
    versionNote:
      "Teaches PCAP-31-04 (released 2026-10-31). The previous version, PCAP-31-03, can still be taken until its sunset on 2027-11-30; its syllabus is at pythoninstitute.org/pcap-31-03.",
    officialObjectivesUrl: PCAP_SYLLABUS,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience: "No formal prerequisite; PCEP-level knowledge of Python fundamentals is recommended.",
    durationMinutes: 65,
    questionFormat: "42 questions: single-select, multiple-select, interactive, code-based and scenario-based (TestNow, OpenEDG Testing Service)",
    passingScorePolicy: "72%",
  },
  units: [
    {
      title: "Modules and Packages",
      rangeLabel: "12% of the exam",
      weight: 12,
      gate: "Given a project tree, a failing import and a requirements file, explain where Python looked for the module, fix the import or package layout, and reproduce the environment with pip.",
      sources: [outline("PCAP-31-04 Exam Syllabus, section 1", PCAP_SYLLABUS, PCAP_OUTLINE.modules, PCAP_FORMAT), PY_DOCS.modules, PY_DOCS.syspath, PY_DOCS.pip],
      objectives: [
        "Choose between import, from-import and aliases, and explain the name clashes a wildcard import can cause",
        "Inspect a module with dir() and diagnose an import failure from sys.path and the package layout",
        "Write a reusable module guarded by if __name__ == \"__main__\", and explain what __pycache__ holds",
        "Organize modules into regular and nested packages with __init__.py and import them by qualified name",
        "Install, list, remove and pin packages with python -m pip and a requirements.txt file",
      ],
    },
    {
      title: "Exceptions",
      rangeLabel: "12% of the exam",
      weight: 12,
      gate: "Given nested calls with try/except/else/finally blocks, predict which handler runs, what is printed and in what order, and where an unhandled exception surfaces -- then add a custom exception that carries the detail a caller needs.",
      sources: [outline("PCAP-31-04 Exam Syllabus, section 2", PCAP_SYLLABUS, PCAP_OUTLINE.exceptions, PCAP_FORMAT), PY_DOCS.errors, PY_DOCS.builtinExceptions],
      objectives: [
        "Order except branches from specific to general, catch several types with a tuple, and read the caught object with as",
        "Analyze how try, except, else and finally run together for handled and unhandled exceptions",
        "Place an exception within the BaseException and Exception hierarchy and read its args",
        "Raise, re-raise with a bare raise, and trace an exception as it propagates through several calls",
        "Design a small hierarchy of custom exceptions that carry useful detail and handle them at the right level",
      ],
    },
    {
      title: "Strings",
      rangeLabel: "9.5% of the exam",
      weight: 9.5,
      gate: "Given text with non-ASCII characters, predict the results of ord, chr, comparisons, is...() checks and searches, and explain each answer from code points and immutability.",
      sources: [outline("PCAP-31-04 Exam Syllabus, section 3", PCAP_SYLLABUS, PCAP_OUTLINE.strings, PCAP_FORMAT), PY_DOCS.unicode, PY_DOCS.stringMethods],
      objectives: [
        "Explain ASCII, Unicode code points and UTF-8, convert with ord() and chr(), and tell str from bytes",
        "Predict how comparisons and sorting order strings by code point and case, and how operations build new strings",
        "Validate input with isalnum, isalpha, isdigit, isspace, islower and isupper, alone and combined",
        "Search and count with find, rfind, index, rindex, count, startswith and endswith, including what each does when nothing is found",
      ],
    },
    {
      title: "Object-Oriented Programming",
      rangeLabel: "28.5% of the exam",
      weight: 28.5,
      gate: "Given a small class hierarchy that uses class and instance attributes, name mangling, super() and multiple inheritance, predict attribute lookups and method calls using the MRO, and redesign one class so its initializer validates its input.",
      sources: [
        outline("PCAP-31-04 Exam Syllabus, section 4", PCAP_SYLLABUS, PCAP_OUTLINE.oop, PCAP_FORMAT),
        PY_DOCS.classes,
        PY_DOCS.mro,
        PY_DOCS.stdtypesSpecial,
      ],
      objectives: [
        "Explain abstraction, encapsulation, inheritance and polymorphism with a Python example of each",
        "Identify classes, instances, attributes and methods in code and the relationships between them",
        "Use class variables for shared data and instance variables for per-object state, and predict when an instance attribute hides a class attribute",
        "Inspect __dict__ and apply name mangling, explaining why it is not privacy",
        "Write instance methods that read and change state through self, including __str__",
        "Introspect objects with hasattr, getattr and isinstance before acting on them",
        "Read class metadata (__name__, __module__, __bases__) to work out a hierarchy",
        "Build a subclass that overrides a method and calls the parent's version with super()",
        "Resolve a diamond-shaped multiple-inheritance call with the MRO and cooperative super()",
        "Tell identity (is) from equality (==) and write polymorphic code that relies on shared behavior",
        "Initialize objects with __init__, defaults and super().__init__() across a hierarchy",
        "Validate constructor arguments, raise on bad input, and avoid mutable default parameters",
      ],
    },
    {
      title: "Advanced Python Constructs and I/O",
      rangeLabel: "24% of the exam",
      weight: 24,
      gate: "Given a data-processing script, rewrite its loops as comprehensions or map/filter, replace an if-chain with match-case where it fits, and read and write its text and binary files safely with pathlib -- explaining each choice.",
      sources: [
        outline("PCAP-31-04 Exam Syllabus, section 5", PCAP_SYLLABUS, PCAP_OUTLINE.advanced, PCAP_FORMAT),
        PY_DOCS.dataStructures,
        PY_DOCS.whatsNew315,
        PY_DOCS.match,
        PY_DOCS.controlFlow,
        PY_DOCS.functional,
        PY_DOCS.open,
        PY_DOCS.pathlib,
        PY_DOCS.sys,
      ],
      objectives: [
        "Build list, set and dict comprehensions with transforms, filters and conditional expressions",
        "Write and trace nested comprehensions, including flattening a list of lists",
        "Replace a value-dispatch if-chain with match-case and a wildcard default",
        "Use else on for and while loops to report that a search found nothing",
        "Write lambdas for short key and callback functions, and judge when a named function is clearer",
        "Transform and select data with map() and filter(), remembering that both return iterators",
        "Create closures and function factories that capture values from an enclosing scope",
        "Choose file modes (r, w, a, x, b, t, +) and name the standard streams sys.stdin, sys.stdout and sys.stderr",
        "Read and write text and binary files safely with with, read(), readline(), readlines(), write() and bytearray",
        "Navigate directories and read and write files with pathlib.Path",
      ],
    },
    {
      title: "Testing, Debugging, Collaborative Development, and AI Assistance",
      rangeLabel: "14% of the exam",
      weight: 14,
      gate: "Given a function, an AI-suggested change and a failing test run, design typical, boundary and invalid test cases, locate the defect from the traceback, decide whether the suggestion is safe to merge, and say what a reviewer and CI must check before it is.",
      sources: [
        outline("PCAP-31-04 Exam Syllabus, section 6", PCAP_SYLLABUS, PCAP_OUTLINE.practice, PCAP_FORMAT),
        PY_DOCS.unittest,
        PY_DOCS.assertStmt,
        PY_DOCS.pdb,
      ],
      objectives: [
        "Design isolated unit tests with typical, boundary and invalid inputs and check results with assertions",
        "Diagnose syntax, runtime and logic errors from tracebacks and step-by-step tracing, then verify the fix with tests",
        "Coordinate changes in a shared repository with branches, clear commits and pull requests, and resolve merge conflicts",
        "Review a proposed change, respond to feedback, and use CI results to decide whether it is ready to merge",
        "Write AI coding requests with requirements, context, examples and constraints, and refine them when the output falls short",
        "Validate AI-generated code before using it: run and test it, confirm every API it calls exists, and keep secrets and personal data out of prompts",
      ],
    },
  ],
};

export const PYTHON_INSTITUTE_TRACKS: SeedTrack[] = [PCEP_TRACK, PCAP_TRACK];
