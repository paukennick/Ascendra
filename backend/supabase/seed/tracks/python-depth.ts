// REQ-292 (Nick, 2026-11-14: "go deeper in Python"): two follow-on Python
// courses, built after the Python Programming Coach (PYTHON) and on the same
// technology_aligned model (no exam, 12-month review, the language reference
// as the curriculum; data.ts LANG_* for PYTHON and JAVASCRIPT).
//
//   PYAUTO  Python for Automation and Scripting: files and paths, command-line
//           scripts with argparse, error handling, logging, regular
//           expressions, subprocess, HTTP APIs and JSON, scheduling,
//           packaging and virtual environments, and testing with pytest.
//   PYDATA  Python for Data Analysis: notebooks, NumPy, pandas (selecting,
//           cleaning, grouping, joining, time series), matplotlib and
//           reproducible analysis.
//
// What was read, and when (all 2026-11-14, each page at its own URL, in full
// unless noted):
//   - devguide.python.org/versions: 3.15 is the newest feature release
//     (first released 2026-10-09), 3.14 and 3.15 take bug fixes, 3.11-3.13
//     security fixes only. docs.python.org/3 is "Python 3.15.2 documentation".
//   - What's New in Python 3.14 and 3.15 (docs.python.org), the module
//     sections for argparse, pathlib, re, json, logging, subprocess, datetime,
//     tomllib and venv, and the pending-removal lists.
//   - Library reference: pathlib, shutil, argparse, subprocess (incl.
//     "Security Considerations"), re, json, urllib.request, logging, sched,
//     venv, zoneinfo, tomllib; the Logging HOWTO.
//   - pytest documentation (docs.pytest.org/en/stable): fixtures,
//     parametrize, tmp_path, monkeypatch, capturing output, assertions. PyPI
//     lists pytest 9.2.0 (uploaded 2026-10-27, requires Python >= 3.10).
//   - cron and systemd timers, which the scheduling unit uses: crontab(5)
//     (cronie) and systemd.timer(5) on man7.org.
//   - pandas: What's new in 3.0.0 (2026-01-21) and 3.1.0 (2026-10-22); the
//     docs site is "pandas 3.1.1 documentation" (3.1.1 released 2026-11-04,
//     PyPI). User guide: Copy-on-Write, merge/join/concat, time series,
//     missing data.
//   - NumPy: release notes (2.5.0 is the newest series; 2.5.4 on PyPI,
//     2026-10-10), the random Generator page, broadcasting.
//   - matplotlib: Quick start guide (Matplotlib 3.11.2 documentation): the
//     explicit (OO) and implicit (pyplot) interfaces.
//   - JupyterLab: Notebooks (JupyterLab 4.6.6 documentation); PyPI lists
//     jupyterlab 4.6.6 and notebook 7.6.5 (2026-11-06).
// Nothing here depends on a 3.15-only feature; where 3.14 or 3.15 changed
// what a learner from an older tutorial expects, the unit's keyValues say
// so (lib/current-facts.ts gives them to the lesson writer and the
// fact-checker). Objectives are our own wording.

import type { SeedTrack, UnitSource } from "../data";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
// 12 months, as PYTHON and JAVASCRIPT (Nick, 2026-11-11, REQ-244).
const REVIEW_DUE_AT = "2027-11-14T00:00:00Z";

const ref = (title: string, url: string, keyValues?: string[]): UnitSource =>
  keyValues ? { title, url, kind: "reference", checkedAt: CHECKED, keyValues } : { title, url, kind: "reference", checkedAt: CHECKED };

const LIB = "https://docs.python.org/3/library/";

// Python language and library pages.
const PYREF = {
  versions: ref("Status of Python versions (Python Developer's Guide)", "https://devguide.python.org/versions/", [
    "Python 3.15 is the newest feature release (3.15.0 released 2026-10-09); docs.python.org shows the Python 3.15.2 documentation",
    "3.14 and 3.15 receive bug fixes; 3.11, 3.12 and 3.13 receive security fixes only",
  ]),
  pathlib: ref("pathlib: object-oriented filesystem paths", `${LIB}pathlib.html`, [
    "Python 3.14 added Path.copy(), Path.copy_into(), Path.move() and Path.move_into(); on 3.13 and earlier copy and move with shutil.copy2, shutil.copytree and shutil.move",
    "Since Python 3.15 (PEP 686) open() and Path.read_text() without an encoding use UTF-8 regardless of the locale; pass encoding=\"utf-8\" explicitly for code that must behave the same on every supported version",
  ]),
  shutil: ref("shutil: high-level file operations", `${LIB}shutil.html`),
  argparse: ref("argparse: parser for command-line options, arguments and subcommands", `${LIB}argparse.html`, [
    "On a usage error ArgumentParser.error() prints the usage and the message to standard error and exits with status 2",
    "suggest_on_error was added in 3.14 and defaults to True from 3.15 (suggestions for mistyped choices and subcommand names); help is colored since 3.14 and can be turned off with color=False",
    "The type, choices and metavar parameters of BooleanOptionalAction were removed in 3.14",
  ]),
  tomllib: ref("tomllib: parse TOML files", `${LIB}tomllib.html`, [
    "tomllib only reads TOML (it does not support writing); open the file in binary mode for tomllib.load()",
    "In Python 3.15 tomllib parses TOML 1.1.0, a backward-compatible update of 1.0.0",
  ]),
  errors: ref("The Python Tutorial: Errors and Exceptions", "https://docs.python.org/3/tutorial/errors.html", [
    "Since Python 3.14 (PEP 765) a return, break or continue that leaves a finally block raises a SyntaxWarning, because it silently discards the exception or return value from the try block",
    "Since Python 3.14 (PEP 758) several exception types may be listed without parentheses only when there is no as clause; the parenthesized tuple form works on every version",
  ]),
  contextlib: ref("contextlib: utilities for with-statement contexts", `${LIB}contextlib.html`),
  logging: ref("logging: logging facility for Python", `${LIB}logging.html`, [
    "basicConfig() does nothing if the root logger already has handlers, unless force=True is passed",
    "Logger.warn() is deprecated (use warning()); custom handlers taking a strm argument are deprecated and scheduled for removal in 3.16 (use stream)",
  ]),
  loggingHowto: ref("Logging HOWTO", "https://docs.python.org/3/howto/logging.html", [
    "The default level is WARNING: without configuration, info() and debug() messages are not shown",
  ]),
  loggingHandlers: ref("logging.handlers: RotatingFileHandler and TimedRotatingFileHandler", `${LIB}logging.handlers.html`),
  re: ref("re: regular expression operations", `${LIB}re.html`, [
    "Python 3.15 added re.prefixmatch() as an explicit name for re.match() and soft-deprecated re.match(); re.match() still works, and re.search() scans the whole string",
    "Python 3.14 added \\z as a synonym for \\Z (end of string only)",
    "Passing count, maxsplit or flags positionally to re.sub(), re.subn() and re.split() is deprecated since 3.13; pass them as keywords",
  ]),
  subprocess: ref("subprocess: subprocess management (incl. Security Considerations)", `${LIB}subprocess.html`, [
    "subprocess does not call a shell unless shell=True; with shell=True the program must quote every argument itself to avoid shell injection (shlex.quote on POSIX)",
    "run(..., check=True) raises CalledProcessError on a nonzero exit status; with timeout= the child is killed and TimeoutExpired is raised after it has terminated",
    "capture_output=True cannot be combined with stdout= or stderr=; to merge the streams use stdout=PIPE, stderr=STDOUT",
  ]),
  shlex: ref("shlex: simple lexical analysis (split and quote)", `${LIB}shlex.html`),
  json: ref("json: JSON encoder and decoder", `${LIB}json.html`, [
    "Since Python 3.14 the module runs as a script with python -m json, preferred over the soft-deprecated python -m json.tool",
    "json.dumps escapes non-ASCII characters unless ensure_ascii=False is passed",
  ]),
  urllib: ref("urllib.request: extensible library for opening URLs", `${LIB}urllib.request.html`, [
    "urllib.request raises HTTPError (a subclass of URLError) for HTTP error responses such as 404 and 500",
    "The documentation recommends the third-party Requests package for a higher-level HTTP client interface",
  ]),
  datetime: ref("datetime: basic date and time types", `${LIB}datetime.html`, [
    "datetime.utcnow() and utcfromtimestamp() are deprecated since 3.12: use datetime.now(tz=datetime.UTC) and datetime.fromtimestamp(ts, tz=datetime.UTC); naive datetimes are treated as local time by many methods",
  ]),
  zoneinfo: ref("zoneinfo: IANA time zone support", `${LIB}zoneinfo.html`),
  sched: ref("sched: event scheduler", `${LIB}sched.html`),
  crontab: ref("crontab(5) (cronie), man7.org", "https://man7.org/linux/man-pages/man5/crontab.5.html", [
    "In a crontab command an unescaped % becomes a newline and the text after the first % is sent to the command's standard input; write \\% for a literal percent sign (date +\\%F)",
  ]),
  systemdTimer: ref("systemd.timer(5), man7.org", "https://man7.org/linux/man-pages/man5/systemd.timer.5.html", [
    "A timer starts the service unit of the same name unless Unit= says otherwise; Persistent=true (OnCalendar= timers only) runs a missed job at the next start",
  ]),
  venv: ref("venv: creation of virtual environments", `${LIB}venv.html`, [
    "A virtual environment is disposable and not checked into source control; since 3.13 venv writes a .gitignore that ignores the whole environment directory",
    "Create an environment with python -m venv <dir> and install into it with python -m pip install",
  ]),
  tutorialVenv: ref("The Python Tutorial: Virtual Environments and Packages", "https://docs.python.org/3/tutorial/venv.html"),
  packaging: ref("Python Packaging User Guide: Writing your pyproject.toml", "https://packaging.python.org/en/latest/guides/writing-pyproject-toml/"),
  pytest: ref("pytest documentation (stable)", "https://docs.pytest.org/en/stable/", [
    "pytest 9.2.0 is the current release (PyPI, 2026-10-27) and requires Python 3.10 or newer",
  ]),
  pytestFixtures: ref("pytest: How to use fixtures", "https://docs.pytest.org/en/stable/how-to/fixtures.html"),
  pytestParam: ref("pytest: How to parametrize fixtures and test functions", "https://docs.pytest.org/en/stable/how-to/parametrize.html"),
  pytestTmp: ref("pytest: How to use temporary directories and files in tests", "https://docs.pytest.org/en/stable/how-to/tmp_path.html", [
    "The tmp_path fixture gives each test function its own unique temporary directory as a pathlib.Path",
  ]),
  pytestMonkey: ref("pytest: How to monkeypatch/mock modules and environments", "https://docs.pytest.org/en/stable/how-to/monkeypatch.html", [
    "monkeypatch.setattr, setenv and delenv changes are undone after the test that requested the fixture finishes",
  ]),
  pytestCapture: ref("pytest: How to capture stdout/stderr output", "https://docs.pytest.org/en/stable/how-to/capture-stdout-stderr.html"),
};

// Data-stack pages.
const PD = "https://pandas.pydata.org/docs/";
const DATAREF = {
  jupyter: ref("JupyterLab: Notebooks (JupyterLab 4.6.6 documentation)", "https://jupyterlab.readthedocs.io/en/stable/user/notebook.html", [
    "JupyterLab 4.6.6 and Notebook 7.6.5 are the current releases (PyPI, 2026-11-06)",
  ]),
  numpyRelease: ref("NumPy release notes", "https://numpy.org/doc/stable/release.html", [
    "NumPy 2.5 is the current series (2.5.4 on PyPI, 2026-10-10) and requires Python 3.12 or newer",
  ]),
  numpyBasics: ref("NumPy: the absolute basics for beginners", "https://numpy.org/doc/stable/user/absolute_beginners.html"),
  numpyBroadcasting: ref("NumPy: Broadcasting", "https://numpy.org/doc/stable/user/basics.broadcasting.html", [
    "Two dimensions are compatible for broadcasting when they are equal or one of them is 1, compared from the trailing (rightmost) dimension",
  ]),
  numpyRandom: ref("NumPy: Random sampling (numpy.random)", "https://numpy.org/doc/stable/reference/random/index.html", [
    "Create a Generator with np.random.default_rng(seed) and draw from it; RandomState and the np.random.* module functions are the legacy interface",
  ]),
  pandas30: ref("pandas: What's new in 3.0.0 (January 21, 2026)", `${PD}whatsnew/v3.0.0.html`, [
    "pandas 3.1 is current (3.1.0 on 2026-10-22, 3.1.1 on 2026-11-04) and supports Python 3.11 or newer",
    "Since pandas 3.0 string columns are inferred as the dedicated str dtype (backed by PyArrow when installed), not object; missing values in it are NaN",
    "Since pandas 3.0 Copy-on-Write is the only mode: any subset or returned object behaves as a copy, chained assignment such as df[\"a\"][df[\"b\"] > 0] = 1 never updates df, and SettingWithCopyWarning is gone; use df.loc[mask, \"a\"] = 1",
  ]),
  // The user guide's copy_on_write.html now redirects here (read 2026-11-14).
  pandasCow: ref("pandas Migration Guides: Copy-on-Write (CoW)", `${PD}user_guide/migration.html`),
  pandas31: ref("pandas: What's new in 3.1.0 (October 22, 2026)", `${PD}whatsnew/v3.1.0.html`),
  pandasMissing: ref("pandas user guide: Working with missing data", `${PD}user_guide/missing_data.html`),
  pandasRemoved: ref("pandas 3.0.0: removals of earlier deprecations", `${PD}whatsnew/v3.0.0.html#removal-of-prior-version-deprecations-changes`, [
    "Removed in pandas 3.0: DataFrame.applymap (use DataFrame.map), DataFrame.first and DataFrame.last, and DataFrameGroupBy.fillna",
    "Since pandas 3.0 fillna, replace, ffill, bfill, interpolate, where, mask and clip with inplace=True return the object instead of None",
  ]),
  pandasGroupby: ref("pandas user guide: Group by: split-apply-combine", `${PD}user_guide/groupby.html`),
  pandasMerge: ref("pandas user guide: Merge, join, concatenate and compare", `${PD}user_guide/merging.html`, [
    "merge(validate=\"one_to_one\" | \"one_to_many\" | \"many_to_one\" | \"many_to_many\") checks the key uniqueness a join assumes and raises MergeError if it does not hold; indicator=True adds a _merge column",
    "Since pandas 3.0 merge and join also accept how=\"left_anti\" and how=\"right_anti\"",
  ]),
  pandasTimeseries: ref("pandas user guide: Time series / date functionality", `${PD}user_guide/timeseries.html`, [
    "Since pandas 3.0 parsing strings with to_datetime gives microsecond resolution (datetime64[us]) by default, nanoseconds only when the string needs it",
    "Since pandas 3.0 the offset aliases M, Q and Y are removed: use ME, QE and YE for month-, quarter- and year-end (resample(\"ME\")); H, T, S, L, U and N are removed in favor of h, min, s, ms, us and ns",
  ]),
  matplotlib: ref("Matplotlib quick start guide (Matplotlib 3.11.2 documentation)", "https://matplotlib.org/stable/users/explain/quick_start.html", [
    "Matplotlib 3.11 is current (3.11.2); its guide suggests the explicit object-oriented style (fig, ax = plt.subplots(), then ax.plot(...)) for reusable scripts, pyplot for quick interactive work",
  ]),
};

// ---------------------------------------------------------------------------
// Python for Automation and Scripting (PYAUTO)
// ---------------------------------------------------------------------------
export const PYAUTO_TRACK: SeedTrack = {
  code: "PYAUTO",
  title: "Python for Automation and Scripting",
  description:
    "10-week follow-on to the Python Programming Coach: write scripts people can run and schedule. Files and paths, command-line tools with argparse, error handling and exit codes, logging, regular expressions, subprocess, HTTP APIs and JSON, cron and systemd timers, packaging and virtual environments, and pytest. Built on the Python 3.15 documentation; nothing depends on a 3.15-only feature.",
  trackType: "graduate",
  subcategorySlug: "programming-languages",
  freshnessModel: "technology_aligned",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  curriculum: {
    kind: "language_reference",
    name: "The Python documentation (docs.python.org) and the pytest documentation",
    version: "Python 3.15, pytest 9.2",
    url: "https://docs.python.org/3/",
    checkedAt: CHECKED,
  },
  units: [
    {
      title: "Files, paths & the filesystem",
      rangeLabel: "Week 1",
      gate: "Given a folder of mixed files, write a script that finds the ones a rule selects, processes them with explicit encodings, and writes its output so a crash halfway never leaves a half-written file.",
      sources: [PYREF.versions, PYREF.pathlib, PYREF.shutil],
      objectives: [
        "Build and inspect paths with pathlib instead of joining strings",
        "Read and write text and binary files with an explicit encoding and the with statement",
        "Select files by walking a directory tree with iterdir, glob and rglob",
        "Copy, move and delete files and directories with shutil and pathlib without overwriting by accident",
        "Write output atomically: write a temporary file in the same directory, then replace the target",
        "Handle FileNotFoundError, PermissionError and IsADirectoryError where a script touches the filesystem",
      ],
    },
    {
      title: "Command-line scripts with argparse",
      rangeLabel: "Week 2",
      gate: "Turn a hard-coded script into a command-line tool with positional arguments, options, a subcommand and helpful errors, and say what exit status it returns in each case.",
      sources: [PYREF.argparse, PYREF.tomllib],
      objectives: [
        "Structure a script with a main() function, the if __name__ == \"__main__\" guard and an exit status",
        "Build a command-line interface with argparse: positional arguments, options, defaults, types and choices",
        "Design subcommands with add_subparsers and mutually exclusive option groups",
        "Write to standard output and standard error, and read standard input, so the script works in a pipeline",
        "Configure a script from arguments, environment variables and a TOML file with a clear order of precedence",
      ],
    },
    {
      title: "Error handling & robust scripts",
      rangeLabel: "Week 3",
      gate: "Given a script that crashes or hangs on bad input and flaky networks, decide what to catch, what to retry and what to let fail, and make each failure end with a message and exit status someone can act on.",
      sources: [PYREF.errors, PYREF.contextlib],
      objectives: [
        "Choose which exceptions to catch, which to let propagate, and where in a script to handle them",
        "Raise exceptions with clear messages and chain them with raise ... from",
        "Clean up reliably with finally, context managers and contextlib",
        "Decide which failures to retry, and retry them with backoff and a limit",
        "Map failures to exit codes and messages a person or a scheduler can act on",
      ],
    },
    {
      title: "Logging",
      rangeLabel: "Week 4",
      gate: "Replace a script's print statements with logging that shows the right detail at the right level, rotates its file, records tracebacks, and never writes a secret.",
      sources: [PYREF.logging, PYREF.loggingHowto, PYREF.loggingHandlers],
      objectives: [
        "Configure logging once at startup with basicConfig or dictConfig, and use a named logger per module",
        "Choose the level for each message, from DEBUG to CRITICAL",
        "Write logs to a file that rotates by size or time",
        "Format log records with time, level and logger name, and log exceptions with their tracebacks",
        "Keep passwords, tokens and personal data out of log messages",
      ],
    },
    {
      title: "Regular expressions & text processing",
      rangeLabel: "Week 5",
      gate: "Extract structured fields from an unfamiliar log format with a regular expression you can explain token by token, and say where a string method or a real parser would have been the better tool.",
      sources: [PYREF.re],
      objectives: [
        "Write regular expressions with character classes, quantifiers, anchors and groups",
        "Choose between re.search, re.match, re.fullmatch, re.findall and re.finditer",
        "Extract fields from log lines with named groups and compiled patterns",
        "Substitute text with re.sub using backreferences or a function as the replacement",
        "Use raw strings for patterns and avoid patterns that backtrack catastrophically",
        "Decide when string methods or a parser (csv, json) are better than a regular expression",
      ],
    },
    {
      title: "Running other programs with subprocess",
      rangeLabel: "Week 6",
      gate: "Rewrite a script that builds shell command strings so that it passes arguments safely, detects failures and hangs, and captures exactly the output it needs.",
      sources: [PYREF.subprocess, PYREF.shlex],
      objectives: [
        "Write subprocess.run calls with an argument list, check=True, capture_output=True and text=True",
        "Prevent shell injection: keep shell=False, and quote with shlex.quote only when a shell is unavoidable",
        "Handle a failed or hung command through CalledProcessError, return codes and a timeout",
        "Stream long output and connect processes with Popen",
        "Choose between calling a program and using a Python library for the same task",
      ],
    },
    {
      title: "HTTP APIs & JSON",
      rangeLabel: "Week 7",
      gate: "Write a small client for a paginated JSON API that sets timeouts, handles error statuses and rate limits, keeps its key out of the code, and can be tested without the network.",
      sources: [PYREF.urllib, PYREF.json],
      objectives: [
        "Call an HTTP API with urllib.request or Requests, setting headers, query parameters and a timeout",
        "Parse, validate and write JSON with the json module",
        "Handle error status codes, rate limits and pagination",
        "Keep API keys out of code: read them from the environment or a secrets store",
        "Design an API client function that can be tested without the network",
      ],
    },
    {
      title: "Scheduling & long-running jobs",
      rangeLabel: "Week 8",
      gate: "Schedule a script to run nightly with cron or a systemd timer, and show that it does the right thing when it runs twice, overlaps itself, or missed a run while the machine was off.",
      sources: [PYREF.crontab, PYREF.systemdTimer, PYREF.datetime, PYREF.zoneinfo, PYREF.sched],
      objectives: [
        "Schedule a script with cron: write the crontab line and set the environment it runs in",
        "Schedule a script with a systemd timer and service unit, catching up missed runs",
        "Make a scheduled job safe to rerun and to overlap with idempotent steps and a lock",
        "Work with dates and times in jobs using aware datetimes, UTC and zoneinfo",
        "Use in-process scheduling (sched, a sleep loop) only where an OS scheduler does not fit",
      ],
    },
    {
      title: "Packaging & virtual environments",
      rangeLabel: "Week 9",
      gate: "Package a script as an installable project with pinned dependencies and a console command, and show another person how to reproduce its environment from scratch.",
      sources: [PYREF.venv, PYREF.tutorialVenv, PYREF.packaging],
      objectives: [
        "Create a virtual environment with python -m venv and install into it with python -m pip",
        "Pin and reproduce dependencies with a requirements file or a lock file",
        "Write a pyproject.toml with project metadata, dependencies and a console script entry point",
        "Install a project in editable mode and run its console script",
        "Choose where a tool's dependencies live: a venv, pipx or a container",
      ],
    },
    {
      title: "Testing automation with pytest",
      rangeLabel: "Week 10",
      gate: "Write pytest tests for an automation script that cover its file handling, its command line and one failure path, without touching the real filesystem, network or clock.",
      sources: [PYREF.pytest, PYREF.pytestFixtures, PYREF.pytestParam, PYREF.pytestTmp, PYREF.pytestMonkey, PYREF.pytestCapture],
      objectives: [
        "Write pytest tests for a script's functions with plain assert statements",
        "Use fixtures, including tmp_path, for the files and directories a test needs",
        "Parametrize a test to cover many inputs",
        "Replace the network, the clock and environment variables in tests with monkeypatch",
        "Test a command-line entry point: arguments, exit status and captured output",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Python for Data Analysis (PYDATA)
// ---------------------------------------------------------------------------
export const PYDATA_TRACK: SeedTrack = {
  code: "PYDATA",
  title: "Python for Data Analysis",
  description:
    "9-week follow-on to the Python Programming Coach for working with data: Jupyter notebooks, NumPy arrays, and pandas for loading, selecting, cleaning, grouping, joining and time series, then charts with matplotlib and analyses someone else can rerun. Taught on pandas 3.1, NumPy 2.5 and Matplotlib 3.11, including what pandas 3.0 changed.",
  trackType: "graduate",
  subcategorySlug: "data-science",
  freshnessModel: "technology_aligned",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  curriculum: {
    kind: "language_reference",
    name: "The pandas, NumPy and Matplotlib documentation",
    version: "pandas 3.1, NumPy 2.5, Matplotlib 3.11",
    url: "https://pandas.pydata.org/docs/",
    checkedAt: CHECKED,
  },
  units: [
    {
      title: "Notebooks & the analysis environment",
      rangeLabel: "Week 1",
      gate: "Set up an environment for an analysis, run a notebook from a fresh kernel top to bottom, and explain which hidden-state mistakes that catches.",
      sources: [DATAREF.jupyter, PYREF.venv],
      objectives: [
        "Create an isolated environment for an analysis and record its package versions",
        "Use a Jupyter notebook: cells, the kernel, Markdown notes and rich output",
        "Recognize hidden state from out-of-order cells, and restart and run all before trusting a result",
        "Decide what belongs in a notebook and what belongs in a module or script",
      ],
    },
    {
      title: "NumPy arrays",
      rangeLabel: "Week 2",
      gate: "Replace a Python loop over numbers with vectorized NumPy code, predict the shape of every intermediate result, and explain why it is faster.",
      sources: [DATAREF.numpyRelease, DATAREF.numpyBasics, DATAREF.numpyBroadcasting, DATAREF.numpyRandom],
      objectives: [
        "Create arrays and read their shape, dtype and number of dimensions",
        "Select from arrays with slices, boolean masks and integer indexes",
        "Apply vectorized operations and aggregations along an axis",
        "Predict the result shape of an operation from the broadcasting rules",
        "Generate reproducible random numbers with a seeded Generator",
      ],
    },
    {
      title: "pandas: loading & selecting data",
      rangeLabel: "Week 3",
      gate: "Load an unfamiliar CSV with the right types, inspect it, and answer three questions about it with .loc, .iloc and boolean filters, without a warning or a silent copy mistake.",
      sources: [DATAREF.pandas30, DATAREF.pandasCow, DATAREF.pandas31],
      objectives: [
        "Load CSV, Excel and JSON data with read_csv and its relatives, setting dtypes, dates and the index",
        "Inspect a DataFrame with head, info, describe, dtypes and value_counts",
        "Select rows and columns with [], .loc, .iloc and boolean masks",
        "Modify a DataFrame under Copy-on-Write: assign through .loc, never through chained indexing",
        "Create derived columns with vectorized expressions and assign",
      ],
    },
    {
      title: "Cleaning data",
      rangeLabel: "Week 4",
      gate: "Take a messy export (wrong types, inconsistent text, missing values, duplicates) to a tidy table, and write down each cleaning decision and how many rows it touched.",
      sources: [DATAREF.pandasMissing, DATAREF.pandas30, DATAREF.pandasRemoved],
      objectives: [
        "Find and handle missing values with isna, dropna and fillna, and decide which to use",
        "Convert columns to the right dtypes, including numbers stored as text and dates",
        "Clean text columns with the .str methods",
        "Find and remove duplicate rows, choosing which copy to keep",
        "Check cleaned data with assertions on row counts, ranges and uniqueness",
      ],
    },
    {
      title: "Grouping & aggregation",
      rangeLabel: "Week 5",
      gate: "Answer a business question that needs grouping by two keys, several aggregates per group and a per-row share of its group's total, and check the result against a hand calculation.",
      sources: [DATAREF.pandasGroupby],
      objectives: [
        "Group rows with groupby and compute sum, mean, count and size per group",
        "Compute several named aggregates at once with agg",
        "Add a per-group value to every row with transform",
        "Build a summary table with pivot_table and crosstab",
        "Interpret group results correctly, including count versus size and missing keys",
      ],
    },
    {
      title: "Combining & reshaping data",
      rangeLabel: "Week 6",
      gate: "Join three tables into one for analysis, prove the join neither dropped nor duplicated rows, and reshape the result between long and wide form.",
      sources: [DATAREF.pandasMerge],
      objectives: [
        "Join tables with merge using inner, left, right, outer and anti joins",
        "Validate a join's key relationship and row count with validate and indicator",
        "Stack tables with concat and align them on their index",
        "Reshape between long and wide form with melt and pivot",
      ],
    },
    {
      title: "Time series basics",
      rangeLabel: "Week 7",
      gate: "Turn raw timestamped events into a daily and monthly series in the right time zone, fill the gaps deliberately, and show a rolling average.",
      sources: [DATAREF.pandasTimeseries, DATAREF.pandas30],
      objectives: [
        "Parse timestamps with to_datetime and set a DatetimeIndex",
        "Resample a series to a coarser frequency and choose the aggregate",
        "Compute rolling and expanding windows",
        "Localize and convert time zones with tz_localize and tz_convert",
        "Handle gaps and irregular timestamps in a series",
      ],
    },
    {
      title: "Plotting with matplotlib",
      rangeLabel: "Week 8",
      gate: "Build a figure that answers one question clearly, with labeled axes, units, a legend only when needed, and a saved file, using the explicit Figure and Axes interface.",
      sources: [DATAREF.matplotlib],
      objectives: [
        "Create figures with the explicit interface: plt.subplots, then methods on Axes",
        "Choose a chart type (line, bar, histogram, scatter) that fits the question",
        "Label axes with units, title the figure and add a legend when there is more than one series",
        "Plot directly from pandas and lay out several Axes in one figure",
        "Save figures to files at a set size and resolution",
      ],
    },
    {
      title: "Reproducible analysis & a capstone",
      rangeLabel: "Week 9",
      gate: "Hand over an analysis that someone else can rerun from the raw data to the same numbers and charts with one command, and explain each thing you did to make that true.",
      sources: [DATAREF.numpyRandom, PYREF.venv, DATAREF.jupyter],
      objectives: [
        "Make an analysis rerunnable: raw data kept read-only, pinned versions, seeds and a run-all step",
        "Organize a project into data, notebooks, source modules and outputs",
        "Write data-checking tests with pytest for the cleaning and summary functions",
        "Integrate prior units into one end-to-end analysis with a short written conclusion",
      ],
    },
  ],
};

export const PYTHON_DEPTH_TRACKS: readonly SeedTrack[] = [PYAUTO_TRACK, PYDATA_TRACK];
