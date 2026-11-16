import { GENERAL_SAFETY, matchPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-292: Python for Automation and Scripting (PYAUTO), ten units, no exam
// blueprint. Hybrid density (docs/labs.md): one lab per unit plus six split
// evenly, which the plan gives to units 1-6 (equal weights, ties to the
// earlier unit): 2/2/2/2/2/2/1/1/1/1, 16 labs, one per objective.
//
// Each lab is a thing the unit's gate asks the learner to do with a script
// a colleague might really hand them. Every snippet whose output is quoted
// was run on CPython 3.13.18 on 2026-11-14 (nothing depends on a 3.14/3.15
// feature; where 3.14 or 3.15 changed behavior the model answer says so).
// Sources: the Python 3.15 documentation pages each lab names, crontab(5)
// and the pytest documentation, all read 2026-11-14.

const D = "2026-11-14";

export const PYAUTO_LABS: SeedLabSet = {
  trackCode: "PYAUTO",
  sources: [
    source("https://docs.python.org/3/library/index.html", "reference", D),
    source("https://docs.python.org/3/howto/logging.html", "reference", D),
    source("https://docs.pytest.org/en/stable/", "reference", D),
    source("https://man7.org/linux/man-pages/man5/crontab.5.html", "reference", D),
  ],
  labs: [
    // ---- Unit 1: Files, paths & the filesystem (2) ----
    {
      slug: "pyauto-atomic-report-write",
      objective: "Write output atomically: write a temporary file in the same directory, then replace the target",
      kind: "build",
      title: "Stop a crash from leaving a half-written report",
      brief:
        "At Rainier Freight (fictional) a nightly script writes /srv/reports/daily.csv, and a dashboard reads that file every minute. The script does:\n\nwith open(\"/srv/reports/daily.csv\", \"w\") as f:\n    for row in build_rows():   # slow; can raise\n        f.write(row + \"\\n\")\n\nTwice this month build_rows() raised halfway, and the dashboard showed a truncated report until someone noticed. Rewrite the write so the dashboard only ever sees the old complete file or the new complete file.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain why the current code exposes a partial file, then write the replacement code and say why the temporary file must be in the same directory.",
          parts: [
            part(
              "Why it breaks",
              "Says that open(..., \"w\") truncates the target immediately, so readers see an empty or partial file for as long as the loop runs and for good if it raises; the with statement closes the file but cannot restore the old content.",
              "Opening with mode \"w\" truncates daily.csv at once. From that moment until the loop finishes, the dashboard reads a partial file, and when build_rows() raises the with block closes the file in its partial state; the previous complete report is already gone."
            ),
            part(
              "Atomic write",
              "Builds the content first or writes it to a temporary file created in the target's directory (tempfile.NamedTemporaryFile(dir=..., delete=False) or mkstemp), with an explicit encoding, flushes it (fsync is a bonus), then calls os.replace(tmp, target) (or Path.replace); removes the temporary file if anything fails.",
              "import os, tempfile\nfrom pathlib import Path\n\ntarget = Path(\"/srv/reports/daily.csv\")\nfd, tmp = tempfile.mkstemp(dir=target.parent, prefix=\".daily-\", suffix=\".tmp\")\ntry:\n    with os.fdopen(fd, \"w\", encoding=\"utf-8\", newline=\"\") as f:\n        for row in build_rows():\n            f.write(row + \"\\n\")\n        f.flush()\n        os.fsync(f.fileno())\n    os.replace(tmp, target)\nexcept BaseException:\n    Path(tmp).unlink(missing_ok=True)\n    raise\n\nIf build_rows() raises, the old daily.csv is untouched and the temporary file is removed."
            ),
            part(
              "Why the same directory",
              "States that os.replace is an atomic rename only within one filesystem; a temporary file in /tmp may be on another filesystem, where the move becomes a copy (or fails), so readers could again see a partial file.",
              "os.replace renames, and a rename is atomic only when source and destination are on the same filesystem. /tmp is often a separate filesystem (tmpfs), where replacing across filesystems fails or, with shutil.move, turns into a copy that readers can catch halfway. Creating the temporary file next to the target keeps it a rename."
            ),
          ],
        },
      ],
    },
    {
      slug: "pyauto-select-old-logs",
      objective: "Select files by walking a directory tree with iterdir, glob and rglob",
      kind: "build",
      title: "Find the log files a cleanup rule selects",
      brief:
        "Cascade Clinic IT (fictional) keeps application logs under /var/log/intake/, in one folder per service, for example /var/log/intake/scheduler/2026-11-01.log and /var/log/intake/billing/archive/2026-10-02.log.gz. The retention rule: every file ending in .log or .log.gz, at any depth, that was last modified more than 30 days ago. Symlinks must never be followed out of the tree. Write a function old_logs(root: Path, days: int) -> list[Path] that returns the matching files sorted by path, and say how you would check it before letting any cleanup delete them.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the function and describe the dry run you would do first.",
          parts: [
            part(
              "Selecting the files",
              "Uses Path.rglob (or os.walk) to reach every depth, matches both .log and .log.gz (two patterns, or a check on name.endswith), keeps only regular files (is_file()), and skips symlinks (is_symlink() or follow_symlinks=False); returns sorted paths.",
              "from pathlib import Path\nimport time\n\ndef old_logs(root: Path, days: int) -> list[Path]:\n    cutoff = time.time() - days * 86400\n    found = []\n    for p in root.rglob(\"*\"):\n        if p.is_symlink() or not p.is_file():\n            continue\n        if not (p.name.endswith(\".log\") or p.name.endswith(\".log.gz\")):\n            continue\n        if p.stat().st_mtime < cutoff:\n            found.append(p)\n    return sorted(found)\n\nrglob(\"*\") walks every level; checking is_symlink() first keeps links out, and the two suffixes are tested on the name because Path.suffix of a.log.gz is only .gz."
            ),
            part(
              "Age test",
              "Compares the file's modification time (stat().st_mtime) with a cutoff computed once as now minus days*86400 seconds (or a timezone-aware datetime comparison); says older means strictly less than the cutoff.",
              "The cutoff is computed once, before the walk, as time.time() - days * 86400, and a file is old when st_mtime < cutoff. Computing it once means every file is judged against the same moment even if the walk takes a while."
            ),
            part(
              "Dry run first",
              "Prints or logs the selected paths with their ages and the total count and size, without deleting, and compares a sample by hand (ls -l or find -mtime +30) before enabling deletion; mentions testing on a copy or with tmp_path.",
              "Run it in report-only mode first: print each path with its modification date, plus the count and total bytes, and compare a few against find /var/log/intake \\( -name '*.log' -o -name '*.log.gz' \\) -type f -mtime +30. Only after the lists agree add the unlink() step, behind a --delete flag."
            ),
          ],
        },
      ],
    },
    // ---- Unit 2: Command-line scripts with argparse (2) ----
    {
      slug: "pyauto-argparse-backup-tool",
      objective: "Build a command-line interface with argparse: positional arguments, options, defaults, types and choices",
      kind: "build",
      title: "Turn a hard-coded backup script into a command-line tool",
      brief:
        "Olympia Dental (fictional) has backup.py with three constants at the top: SOURCE = \"/srv/patients-docs\", KEEP = 7 and COMPRESSION = \"gz\". Staff now need to run it against other folders. Build the argument parser: one required source directory, an optional --keep (a positive whole number of archives to keep, default 7), --compression limited to gz, bz2 or xz (default gz), and a --dry-run switch. Then say what happens when someone runs: python backup.py /srv/x --keep abc",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the parser and explain the result of the bad command.",
          parts: [
            part(
              "Parser",
              "ArgumentParser with a positional source (type=Path is a plus), --keep with type=int (or a custom positive-int type) and default=7, --compression with choices=[\"gz\",\"bz2\",\"xz\"] and default \"gz\", --dry-run with action=\"store_true\"; help text on each; parse_args() in main().",
              "import argparse\nfrom pathlib import Path\n\ndef positive_int(text):\n    n = int(text)\n    if n < 1:\n        raise argparse.ArgumentTypeError(\"must be 1 or more\")\n    return n\n\ndef build_parser():\n    p = argparse.ArgumentParser(description=\"Archive a folder and keep the newest N archives.\")\n    p.add_argument(\"source\", type=Path, help=\"folder to back up\")\n    p.add_argument(\"--keep\", type=positive_int, default=7, help=\"archives to keep (default 7)\")\n    p.add_argument(\"--compression\", choices=[\"gz\", \"bz2\", \"xz\"], default=\"gz\")\n    p.add_argument(\"--dry-run\", action=\"store_true\", help=\"show what would happen\")\n    return p\n\nThe option --dry-run becomes args.dry_run."
            ),
            part(
              "The bad command",
              "States that argparse rejects 'abc' because the type conversion raised ValueError, prints the usage line and an error naming --keep and the invalid value to standard error, and exits with status 2 without running the backup.",
              "argparse calls the type on \"abc\"; int() raises ValueError, so the parser prints\nusage: backup.py [-h] [--keep KEEP] [--compression {gz,bz2,xz}] [--dry-run] source (wrapped over two lines)\nbackup.py: error: argument --keep: invalid positive_int value: 'abc'\nto standard error and exits with status 2. No backup code runs, and a scheduler sees a nonzero exit."
            ),
          ],
        },
      ],
    },
    {
      slug: "pyauto-config-precedence",
      objective: "Configure a script from arguments, environment variables and a TOML file with a clear order of precedence",
      kind: "case",
      title: "Which setting wins?",
      brief:
        "Harbor Books (fictional) runs sync.py on three machines. It reads settings from sync.toml, from environment variables prefixed SYNC_, and from command-line options. Support tickets show nobody can predict which value it will use. You are asked to define the order and implement it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "sync.toml says batch_size = 500. The machine's service file sets SYNC_BATCH_SIZE=200. An operator runs sync.py --batch-size 50 while debugging.",
          ask: "Put the sources in order from lowest to highest priority, and say which batch size the debugging run should use.",
          parts: [
            orderPart(
              "Precedence, lowest first",
              "Met: built-in default, then the TOML file, then the environment, then the command line. Partly there: one adjacent swap.",
              "Built-in default < config file < environment variable < command-line option. The most specific, most recent choice wins: the operator typed --batch-size 50, so the run uses 50; without it, 200 from the environment; without that, 500 from the file; with none, the code's default.",
              ["Default in the code", "sync.toml", "SYNC_BATCH_SIZE environment variable", "--batch-size on the command line"]
            ),
          ],
        },
        {
          text: "The current code does: args = parser.parse_args(); then cfg = tomllib.load(open(\"sync.toml\")) and finally batch = cfg.get(\"batch_size\", args.batch_size). It crashes with \"TypeError: File must be opened in binary mode\".",
          ask: "Fix the loading and merge the four sources so the precedence holds, including telling 'option not given' apart from 'given as the default'.",
          parts: [
            part(
              "Loading the TOML",
              "Opens the file in binary mode (open(path, \"rb\") or Path.read_text + tomllib.loads) inside a with statement; notes tomllib only reads TOML.",
              "with open(\"sync.toml\", \"rb\") as f:\n    cfg = tomllib.load(f)\n\ntomllib.load needs a binary file (or use tomllib.loads(path.read_text(encoding=\"utf-8\"))). tomllib only reads TOML; writing needs a third-party library."
            ),
            part(
              "Merging",
              "Gives the option default=None (or argparse.SUPPRESS) so an omitted option can be detected, then takes the first value that is set from: command line, environment (converted with int()), file, built-in default.",
              "parser.add_argument(\"--batch-size\", type=int, default=None)\nargs = parser.parse_args()\nenv = os.environ.get(\"SYNC_BATCH_SIZE\")\nbatch = (\n    args.batch_size if args.batch_size is not None\n    else int(env) if env is not None\n    else cfg.get(\"batch_size\", 100)\n)\n\nWith default=None the code can tell that --batch-size was not typed; a real default on the option would always win and hide the environment and the file."
            ),
          ],
        },
      ],
    },
    // ---- Unit 3: Error handling & robust scripts (2) ----
    {
      slug: "pyauto-retry-what-and-when",
      objective: "Decide which failures to retry, and retry them with backoff and a limit",
      kind: "case",
      title: "Retry the right failures, and only so many times",
      brief:
        "Evergreen Utilities (fictional) has a script that uploads meter readings to a partner's API every 15 minutes. The upload function is wrapped in while True: try: upload(); break / except Exception: pass. Last week the partner was down for an hour and the script spun at 100% CPU; yesterday a bad API key made it loop forever without anyone noticing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The upload can fail with: a connection timeout; HTTP 503 Service Unavailable; HTTP 429 Too Many Requests with Retry-After: 30; HTTP 401 Unauthorized; HTTP 400 Bad Request because a reading is malformed.",
          ask: "Sort the failures into retry and do-not-retry.",
          parts: [
            matchPart(
              "Retry or not",
              "Met: timeout, 503 and 429 retry (429 after Retry-After); 401 and 400 do not. Partly there: one wrong.",
              "Timeouts and 503 are transient: retry with backoff. 429 says when to come back: wait at least Retry-After. 401 will fail identically until someone fixes the key, and 400 will fail identically until the data changes, so retrying only hides them: fail and alert.",
              {
                left: ["Connection timeout", "HTTP 503", "HTTP 429 with Retry-After: 30", "HTTP 401", "HTTP 400 malformed reading"],
                right: ["Retry with backoff", "Retry with backoff after a short wait", "Wait the Retry-After time, then retry", "Do not retry: alert, credentials need fixing", "Do not retry: report the bad record"],
                pairs: [0, 1, 2, 3, 4],
                leftHeading: "Failure",
                rightHeading: "Action",
              }
            ),
          ],
        },
        {
          text: "The team agrees: at most 5 attempts, exponential backoff starting at 1 second with jitter, never more than 60 seconds between attempts, and the script must end with a nonzero exit status if it gives up so the scheduler flags it.",
          ask: "Write the retry loop.",
          parts: [
            part(
              "Retry loop",
              "Catches only the retryable exception types (not bare Exception), sleeps base*2**attempt plus random jitter capped at 60 s (honoring Retry-After when given), stops after 5 attempts and re-raises or exits nonzero; non-retryable errors propagate immediately; no busy loop.",
              "import random, time\n\nclass Retryable(Exception):\n    def __init__(self, msg, retry_after=None):\n        super().__init__(msg)\n        self.retry_after = retry_after\n\ndef upload_with_retry(upload, attempts=5):\n    for n in range(attempts):\n        try:\n            return upload()\n        except Retryable as e:\n            if n == attempts - 1:\n                raise\n            delay = e.retry_after or min(60, 2 ** n + random.uniform(0, 1))\n            time.sleep(delay)\n\nupload() raises Retryable for timeouts, 503 and 429 and lets 401/400 errors propagate. main() catches the final Retryable, logs it and returns exit status 1."
            ),
            part(
              "Why the old loop was harmful",
              "Names both: except Exception: pass with no sleep busy-loops and hammers the partner; catching everything retried a permanent error (401) forever and hid it, so nobody was alerted.",
              "The bare except with pass and no delay retried as fast as the CPU allowed, adding load to a partner that was already down. Catching every exception also swallowed the permanent 401, so the script never failed and nobody learned the key was wrong."
            ),
          ],
        },
      ],
    },
    {
      slug: "pyauto-exit-codes-for-scheduler",
      objective: "Map failures to exit codes and messages a person or a scheduler can act on",
      kind: "build",
      title: "Make a script's failures readable by cron and by people",
      brief:
        "Puyallup Parts (fictional) runs import_orders.py from a scheduler that only looks at the exit status and mails standard error to the on-call person. Today every failure is an uncaught traceback (status 1) or, worse, the script prints 'error' and exits 0. Design what the script returns for: success; bad command-line arguments; the input file is missing; the database is unreachable after retries; an unexpected bug.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the exit status and the standard-error message for each case, and write main() so it enforces them.",
          parts: [
            part(
              "Status per case",
              "0 for success; 2 for usage errors (argparse's own convention); distinct nonzero codes for missing input and unreachable database (e.g. 3 and 4, or the sysexits values 66 and 69); 1 for an unexpected bug with the traceback kept; never 0 on failure.",
              "0 success. 2 bad arguments (argparse already exits 2). 3 input file missing. 4 database unreachable after retries. 1 anything unexpected. Any nonzero status makes the scheduler flag the run; the distinct numbers tell on-call which runbook to open."
            ),
            part(
              "main()",
              "main() returns an int and is called through sys.exit(main()); catches FileNotFoundError and the database error type specifically, prints one actionable line to sys.stderr for each, and lets other exceptions propagate (or logs them with the traceback) so the bug stays visible.",
              "import sys\n\ndef main(argv=None) -> int:\n    args = build_parser().parse_args(argv)\n    try:\n        run_import(args.path)\n    except FileNotFoundError as e:\n        print(f\"import_orders: input file not found: {e.filename}\", file=sys.stderr)\n        return 3\n    except DatabaseUnavailable as e:\n        print(f\"import_orders: database unreachable after retries: {e}\", file=sys.stderr)\n        return 4\n    return 0\n\nif __name__ == \"__main__\":\n    sys.exit(main())\n\nAn unexpected exception escapes main(); Python prints the traceback to standard error and exits 1, which is what a bug should do."
            ),
          ],
        },
      ],
    },
    // ---- Unit 4: Logging (2) ----
    {
      slug: "pyauto-logging-setup",
      objective: "Configure logging once at startup with basicConfig or dictConfig, and use a named logger per module",
      kind: "build",
      title: "Replace prints with logging that shows up",
      brief:
        "A colleague at Sound Transit Analytics (fictional) added logging to etl.py and its helper module loaders.py, but nothing appears. loaders.py has logging.info(\"loaded %d rows\", n). etl.py calls logging.basicConfig(level=logging.INFO) at the bottom of the file, after importing loaders and after an imported helper library has already called logging.warning(\"cache miss\") at import time. Explain why no INFO lines appear, and set logging up properly for both modules.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the two causes and write the corrected setup.",
          parts: [
            part(
              "Why nothing appears",
              "Names that the default level is WARNING, so INFO is dropped until configured, and that the earlier warning from the library (via a module-level logging call) already configured the root logger with a handler, so the later basicConfig does nothing unless force=True.",
              "Unconfigured logging only shows WARNING and above. The helper's module-level logging.warning() call ran before basicConfig, and a module-level logging call configures the root logger itself, with a default handler at WARNING. After that, basicConfig(level=logging.INFO) does nothing, because basicConfig is a no-op once the root logger has handlers (unless force=True)."
            ),
            part(
              "Corrected setup",
              "Each module uses logger = logging.getLogger(__name__) and calls logger.info(...); logging is configured once, early, in the entry point (inside main() or under the __main__ guard, before work starts) with a level and a format including time, level and logger name; library modules do not call basicConfig.",
              "# loaders.py\nimport logging\nlogger = logging.getLogger(__name__)\n\ndef load(path):\n    ...\n    logger.info(\"loaded %d rows from %s\", n, path)\n\n# etl.py\nimport logging\n\ndef main():\n    logging.basicConfig(\n        level=logging.INFO,\n        format=\"%(asctime)s %(levelname)s %(name)s: %(message)s\",\n    )\n    ...\n\nOnly the entry point configures logging, first thing in main(); modules just get a named logger, so each line shows which module wrote it."
            ),
          ],
        },
      ],
    },
    {
      slug: "pyauto-secrets-out-of-logs",
      objective: "Keep passwords, tokens and personal data out of log messages",
      kind: "build",
      title: "Find what should never have been logged",
      brief:
        "This excerpt is from the DEBUG log of a fictional payroll sync at Tahoma Payroll Services. Pick every line that exposes a secret or personal data that does not belong in a log, then say how to change the code so it cannot happen again.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Select the lines that leak, and describe the fix.",
          parts: [
            selectPart(
              "Leaking lines",
              "Met: exactly the Authorization header, the database URL with its password, the full SSN and the session token. Partly there: three of the four with no fine line picked.",
              "Lines 2, 4, 6 and 8 leak: a bearer token, a password embedded in a connection URL, a full Social Security number and a session token. Request ids, counts, durations and an employee number are fine to log.",
              {
                lines: [
                  "2026-11-14 02:00:01 INFO sync: starting run id=8f3c",
                  "2026-11-14 02:00:01 DEBUG http: headers={'Authorization': 'Bearer eyJhbGciOi...'}",
                  "2026-11-14 02:00:02 INFO sync: fetched 412 employee records",
                  "2026-11-14 02:00:02 DEBUG db: connecting to postgresql://payroll:Spr1ng2026!@db1:5432/pay",
                  "2026-11-14 02:00:03 INFO sync: employee 10442 updated",
                  "2026-11-14 02:00:03 DEBUG sync: payload={'emp': 10442, 'ssn': '123-45-6789'}",
                  "2026-11-14 02:00:04 INFO sync: run finished in 3.1 s",
                  "2026-11-14 02:00:04 DEBUG auth: refreshed session token=7c0b9e1d2a",
                ],
                correct: [1, 3, 5, 7],
                display: "log",
              }
            ),
            part(
              "Fix",
              "Says to stop logging whole headers, payloads and connection strings (log selected safe fields instead), mask or omit secrets at the source, optionally add a logging.Filter that redacts known patterns as a backstop, and rotate the exposed credentials and purge the old logs because they were already written.",
              "Log what the reader needs (status code, record count, employee id) instead of whole headers, payloads or URLs. Build the DB URL for logs without the password. A logging.Filter that redacts Authorization headers, password= fields and SSN-shaped strings is a backstop, not the fix. The token and DB password in these logs must be rotated and the old log files purged, since they have already leaked."
            ),
          ],
        },
      ],
    },
    // ---- Unit 5: Regular expressions & text processing (2) ----
    {
      slug: "pyauto-regex-access-log",
      objective: "Extract fields from log lines with named groups and compiled patterns",
      kind: "build",
      title: "Count failed requests per client from an access log",
      brief:
        "Kitsap Library (fictional) wants a daily count of 4xx and 5xx responses per client address from its web server log. Lines look like:\n\n203.0.113.7 - - [14/Nov/2026:09:15:02 -0800] \"GET /api/orders?page=2 HTTP/1.1\" 200 5120\n198.51.100.23 - - [14/Nov/2026:09:15:04 -0800] \"POST /api/login HTTP/1.1\" 401 87\n203.0.113.7 - - [14/Nov/2026:09:15:09 -0800] \"GET /health HTTP/1.1\" 200 -\n\nThe size can be a dash. Some lines in the file are corrupted and match nothing; they must be counted, not crash the script.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the compiled pattern and the counting loop, and give the counts for the three lines above.",
          parts: [
            part(
              "Pattern",
              "A raw-string pattern compiled once with named groups for at least ip, method, path and status, anchored to the whole line, allowing a dash for the size; uses \\d{3} for the status.",
              "LINE = re.compile(\n    r'^(?P<ip>\\d{1,3}(?:\\.\\d{1,3}){3}) \\S+ \\S+ \\[(?P<ts>[^\\]]+)\\] '\n    r'\"(?P<method>[A-Z]+) (?P<path>\\S+) [^\"]*\" (?P<status>\\d{3}) (?P<size>\\d+|-)$'\n)\n\nRaw strings keep the backslashes for the regex engine; compiling once avoids re-parsing it for every line."
            ),
            part(
              "Loop and result",
              "Uses LINE.match (or fullmatch/prefixmatch) per line, counts bad lines separately instead of raising, counts per ip only when the status starts with 4 or 5 (Counter or dict), and states the result for the sample: 198.51.100.23 -> 1, no other client, 0 bad lines.",
              "from collections import Counter\nerrors, bad = Counter(), 0\nwith open(path, encoding=\"utf-8\", errors=\"replace\") as f:\n    for line in f:\n        m = LINE.match(line.rstrip(\"\\n\"))\n        if not m:\n            bad += 1\n            continue\n        if m[\"status\"][0] in \"45\":\n            errors[m[\"ip\"]] += 1\n\nFor the three sample lines: Counter({'198.51.100.23': 1}) and bad == 0. (Python 3.15 also offers LINE.prefixmatch, the new explicit name for match.)"
            ),
          ],
        },
      ],
    },
    {
      slug: "pyauto-regex-or-parser",
      objective: "Decide when string methods or a parser (csv, json) are better than a regular expression",
      kind: "build",
      title: "Pick the right tool for each text job",
      brief:
        "A junior admin at Bremerton Marine Supply (fictional) has written a regular expression for every text task in their scripts. Match each task to the tool that should do it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match the tasks to the tools and explain the one you think is most often gotten wrong.",
          parts: [
            matchPart(
              "Task to tool",
              "Met: all five pairs. Partly there: four.",
              "Quoted CSV fields can contain commas and newlines, so the csv module; JSON nesting and escaping need json.loads; a fixed prefix is str.startswith; a version-like token inside free text is a regex job; a file extension is pathlib's suffix.",
              {
                left: [
                  "Split a CSV export whose quoted fields may contain commas",
                  "Read the status field from an API response body",
                  "Check that a line begins with \"ERROR:\"",
                  "Find every ticket id like INC-20481 in free-text notes",
                  "Get a file's extension",
                ],
                right: ["csv module", "json.loads", "str.startswith", "re.findall", "Path.suffix", "str.split(\",\")"],
                pairs: [0, 1, 2, 3, 4],
                leftHeading: "Task",
                rightHeading: "Tool",
              }
            ),
            part(
              "The common mistake",
              "Explains one mismatch concretely, e.g. splitting CSV on commas breaks on \"Smith, J\" in quotes, or a regex over JSON breaks on nesting, whitespace or escaped quotes, while the parser handles the format's rules.",
              "Splitting CSV with str.split(\",\") or a regex is the usual one: a quoted field like \"Smith, J\" becomes two fields and every later column shifts. csv.reader implements the quoting rules, including quoted newlines, so use it whenever the data is CSV."
            ),
          ],
        },
      ],
    },
    // ---- Unit 6: Running other programs with subprocess (2) ----
    {
      slug: "pyauto-subprocess-injection",
      objective: "Prevent shell injection: keep shell=False, and quote with shlex.quote only when a shell is unavoidable",
      kind: "build",
      title: "Close a shell injection hole in a helper script",
      brief:
        "Lakewood Print Shop (fictional) has a web form that lets staff archive a customer folder. The handler calls:\n\nsubprocess.run(f\"tar -czf /backups/{name}.tar.gz /srv/customers/{name}\", shell=True)\n\nwhere name comes from the form. Show what a hostile name does, rewrite the call safely, and make it fail loudly when tar fails.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give an example of an injected name and its effect, then the safe call.",
          parts: [
            part(
              "The attack",
              "Gives a name containing shell metacharacters (for example x; rm -rf /srv/customers or $(curl ...)) and says the shell runs the injected command with the script's privileges, because shell=True hands the whole string to /bin/sh.",
              "A name of \"x; rm -rf /srv/customers\" makes the shell run tar, then rm -rf /srv/customers, with the web app's permissions. With shell=True the f-string is a shell command line, so ;, |, $( ) and backticks in the input all become shell syntax."
            ),
            part(
              "Safe call",
              "Passes an argument list with shell=False (the default), validates name (e.g. a strict pattern, and the resolved path stays inside /srv/customers), uses check=True so a tar failure raises CalledProcessError, and optionally a timeout; shlex.quote mentioned only as the fallback when a shell is unavoidable.",
              "import re, subprocess\nfrom pathlib import Path\n\nif not re.fullmatch(r\"[A-Za-z0-9_-]{1,64}\", name):\n    raise ValueError(\"bad customer name\")\nsrc = Path(\"/srv/customers\", name)\nsubprocess.run(\n    [\"tar\", \"-czf\", f\"/backups/{name}.tar.gz\", str(src)],\n    check=True, timeout=600,\n)\n\nWith a list and no shell, each element reaches tar as one argument; nothing is interpreted. check=True turns a nonzero tar exit into CalledProcessError. If a shell were truly needed, each value would go through shlex.quote, but here none is."
            ),
          ],
        },
      ],
    },
    {
      slug: "pyauto-subprocess-hang-and-fail",
      objective: "Handle a failed or hung command through CalledProcessError, return codes and a timeout",
      kind: "case",
      title: "A nightly job that sometimes never finishes",
      brief:
        "Gig Harbor Clinic Supply (fictional) runs a Python job that calls an external sync tool: result = subprocess.run([\"vendor-sync\", \"--all\"], capture_output=True, text=True). The job is scheduled hourly. On-call reports two problems: some nights the job is still running in the morning with several copies stacked up, and once the sync failed but the job reported success.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "ps shows four vendor-sync processes started at 01:00, 02:00, 03:00 and 04:00, each waiting on a network socket. The tool normally finishes in about 5 minutes.",
          ask: "What do you change so a hung run ends, and what happens to the child process when it does?",
          parts: [
            part(
              "Timeout",
              "Adds timeout= (a margin over normal, e.g. 900 s) to subprocess.run; says run() kills the child and raises TimeoutExpired after it has terminated; catches it to log and exit nonzero; mentions a lock to prevent overlapping runs as a bonus.",
              "subprocess.run([\"vendor-sync\", \"--all\"], capture_output=True, text=True, timeout=900)\n\nWhen 15 minutes pass, run() kills vendor-sync, waits for it, then raises subprocess.TimeoutExpired. The job catches it, logs that the sync timed out, and exits nonzero. A lock file (or flock) also stops a new hourly run from starting while one is still going."
            ),
          ],
        },
        {
          text: "The run that 'succeeded': vendor-sync printed \"ERROR: auth failed\" to standard error and exited with status 3. The job never looked at result.returncode.",
          ask: "Make a failure impossible to miss, and keep the tool's error text for on-call.",
          parts: [
            part(
              "Detecting failure",
              "Uses check=True (or tests result.returncode != 0) so status 3 raises CalledProcessError; catches it and logs e.returncode and e.stderr (captured because capture_output=True), then exits nonzero.",
              "try:\n    subprocess.run([\"vendor-sync\", \"--all\"], capture_output=True, text=True, timeout=900, check=True)\nexcept subprocess.CalledProcessError as e:\n    log.error(\"vendor-sync failed with status %d: %s\", e.returncode, e.stderr.strip())\n    return 4\nexcept subprocess.TimeoutExpired:\n    log.error(\"vendor-sync timed out after 900 s\")\n    return 5\n\nrun() never raises on a nonzero status unless check=True; the old code threw the status away."
            ),
          ],
        },
      ],
    },
    // ---- Unit 7: HTTP APIs & JSON (1) ----
    {
      slug: "pyauto-paginated-api-client",
      objective: "Handle error status codes, rate limits and pagination",
      kind: "case",
      title: "Pull every page from a rate-limited API",
      brief:
        "Salish Events (fictional) needs all ticket orders from a partner API. GET https://api.example.com/v2/orders?page=N returns JSON like {\"orders\": [...], \"next_page\": 3} and next_page is null on the last page. The API allows 60 requests a minute and answers 429 with a Retry-After header when exceeded. The key is in the environment variable PARTNER_API_KEY.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "A first version uses urllib.request.urlopen(url) in a loop over range(1, 100) and crashes on page 41 with urllib.error.HTTPError: HTTP Error 429: Too Many Requests.",
          ask: "Explain the crash and fix the loop so it follows next_page, sends the key, sets a timeout and handles 429.",
          parts: [
            part(
              "Why it crashed",
              "Says urlopen raises HTTPError for error statuses such as 429; the loop sent requests as fast as it could, exceeded 60 per minute, and had no handler; also that range(1, 100) guesses the page count instead of following next_page.",
              "urllib.request turns HTTP error responses into HTTPError exceptions. The loop fired requests back to back, hit the 60-a-minute limit at page 41 and nothing caught the 429. range(1, 100) also guesses how many pages exist; the API says so itself in next_page."
            ),
            part(
              "Fixed loop",
              "Follows next_page until null; sends the key from os.environ in a header (never in code); passes timeout=; on HTTPError with code 429 sleeps int(Retry-After) and retries the same page; re-raises other errors; parses with json.load.",
              "import json, os, time, urllib.error, urllib.request\n\ndef fetch_all(base):\n    key = os.environ[\"PARTNER_API_KEY\"]\n    page, orders = 1, []\n    while page is not None:\n        req = urllib.request.Request(f\"{base}?page={page}\", headers={\"Authorization\": f\"Bearer {key}\"})\n        try:\n            with urllib.request.urlopen(req, timeout=10) as resp:\n                data = json.load(resp)\n        except urllib.error.HTTPError as e:\n            if e.code == 429:\n                time.sleep(int(e.headers.get(\"Retry-After\", \"60\")))\n                continue\n            raise\n        orders.extend(data[\"orders\"])\n        page = data[\"next_page\"]\n    return orders"
            ),
          ],
        },
        {
          text: "Reviewers ask how this will be tested in CI, where there is no network and no real key.",
          ask: "Change the design so the pagination logic can be tested without the network.",
          parts: [
            part(
              "Testable design",
              "Separates fetching one page (injected function or session object) from the pagination loop, so a test passes a fake that returns canned pages (including a 429 once) and asserts all orders are collected and the loop stops at next_page null; mentions monkeypatch or dependency injection.",
              "Split it: fetch_all(get_page) where get_page(page) returns the parsed JSON. Production passes a function that does the HTTP call; a test passes a fake returning {\"orders\": [1, 2], \"next_page\": 2} then {\"orders\": [3], \"next_page\": None} and asserts the result is [1, 2, 3]. A second fake raises the 429 path once to check the retry. No network, no key."
            ),
          ],
        },
      ],
    },
    // ---- Unit 8: Scheduling & long-running jobs (1) ----
    {
      slug: "pyauto-cron-works-by-hand",
      objective: "Schedule a script with cron: write the crontab line and set the environment it runs in",
      kind: "case",
      title: "It works when I run it, but not from cron",
      brief:
        "At Vashon Co-op (fictional) an admin added this line with crontab -e to run a report every night at 02:30:\n\n30 2 * * * python3 report.py > /var/log/report-$(date +%F).log\n\nRun by hand from /home/ops/report, the script works. From cron, no log file appears, and the script uses packages installed in /home/ops/report/.venv.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The mail cron sent to the ops user says: /bin/sh: 1: Syntax error: Unterminated quoted string. The admin also notices that python3 under cron is /usr/bin/python3, not the venv's.",
          ask: "Name every problem with the line and how cron's environment differs from the login shell.",
          parts: [
            part(
              "Problems",
              "Names: the unescaped % (cron turns % into a newline and sends the rest to standard input, which breaks the command); the relative path report.py (cron starts in the home directory, not the project); python3 resolves to the system interpreter without the venv's packages; standard error is not captured.",
              "Four problems. (1) In a crontab command an unescaped % becomes a newline, so the command is cut at date +, which produced the syntax error; write date +\\%F. (2) report.py is relative; cron runs from the user's home directory. (3) cron's PATH is minimal, so python3 is /usr/bin/python3 without the venv's packages. (4) Only standard output is redirected; errors go to cron mail or nowhere."
            ),
          ],
        },
        {
          text: "The admin confirms the project lives in /home/ops/report, the venv is /home/ops/report/.venv, and the script expects to run from the project directory.",
          ask: "Write the corrected crontab line.",
          parts: [
            part(
              "Corrected line",
              "Uses absolute paths to the venv's python and to the script (or cd into the project first), escapes % as \\%, redirects both streams (2>&1), and keeps the 30 2 * * * schedule.",
              "30 2 * * * cd /home/ops/report && /home/ops/report/.venv/bin/python report.py >> /var/log/report-$(date +\\%F).log 2>&1\n\nThe venv's own python finds the venv's packages without activation; cd sets the working directory the script expects; \\% stops cron from treating % as a newline; 2>&1 keeps errors in the log. A systemd timer with Persistent=true is the alternative when missed runs must catch up."
            ),
          ],
        },
      ],
    },
    // ---- Unit 9: Packaging & virtual environments (1) ----
    {
      slug: "pyauto-pyproject-console-script",
      objective: "Write a pyproject.toml with project metadata, dependencies and a console script entry point",
      kind: "build",
      title: "Package a script so anyone can install the command",
      brief:
        "Tacoma Tool Library (fictional) has a single-file tool, src/checkout_report/cli.py, with a main() function. It needs Requests and runs on Python 3.12 or newer. Today people copy the file around and pip install requests into whatever Python they have. Package it so that installing the project gives a command named checkout-report that calls main().",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the pyproject.toml and the commands a colleague runs to install and use it in a fresh virtual environment.",
          parts: [
            part(
              "pyproject.toml",
              "Has a [build-system] table (e.g. setuptools or hatchling with build-backend), a [project] table with name, version, requires-python = \">=3.12\" and dependencies listing requests, and [project.scripts] mapping checkout-report = \"checkout_report.cli:main\". No setup.py needed.",
              "[build-system]\nrequires = [\"hatchling\"]\nbuild-backend = \"hatchling.build\"\n\n[project]\nname = \"checkout-report\"\nversion = \"1.0.0\"\nrequires-python = \">=3.12\"\ndependencies = [\"requests>=2.32\"]\n\n[project.scripts]\ncheckout-report = \"checkout_report.cli:main\""
            ),
            part(
              "Install and run",
              "python -m venv .venv, then the venv's python -m pip install . (or -e . for development), then checkout-report --help works with the venv active or by its path in .venv/bin; mentions the venv itself is not committed.",
              "python3 -m venv .venv\n.venv/bin/python -m pip install -e .\n.venv/bin/checkout-report --help\n\npip installs Requests and writes a checkout-report launcher into .venv/bin that calls checkout_report.cli:main. -e (editable) means code changes take effect without reinstalling. The .venv folder stays out of Git; the pyproject.toml is what gets shared."
            ),
          ],
        },
      ],
    },
    // ---- Unit 10: Testing automation with pytest (1) ----
    {
      slug: "pyauto-pytest-monkeypatch",
      objective: "Replace the network, the clock and environment variables in tests with monkeypatch",
      kind: "build",
      title: "Test a script that depends on the clock, the environment and an API",
      brief:
        "Spanaway Animal Rescue (fictional) has this function in reminders.py:\n\nimport os, datetime\nimport api\n\ndef due_reminders():\n    token = os.environ[\"RESCUE_TOKEN\"]\n    today = datetime.date.today()\n    return [p[\"name\"] for p in api.list_pets(token) if p[\"vet_due\"] <= today.isoformat()]\n\nThe test suite must run offline, without a real token, and give the same result any day of the year.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write one pytest test that pins the date, sets the token, and replaces the API call, and say why each replacement is undone afterward.",
          parts: [
            part(
              "The test",
              "Uses monkeypatch.setenv for RESCUE_TOKEN, monkeypatch.setattr on reminders.api.list_pets (or api.list_pets) with a fake that checks the token and returns canned pets, and replaces the date (e.g. setattr reminders.datetime with a stub whose date.today() returns a fixed date, or refactors to pass today in); asserts the exact names returned.",
              "import datetime\nimport reminders\n\nclass FixedDate(datetime.date):\n    @classmethod\n    def today(cls):\n        return cls(2026, 11, 14)\n\ndef test_due_reminders(monkeypatch):\n    monkeypatch.setenv(\"RESCUE_TOKEN\", \"test-token\")\n    monkeypatch.setattr(reminders.datetime, \"date\", FixedDate)\n    def fake_list_pets(token):\n        assert token == \"test-token\"\n        return [{\"name\": \"Biscuit\", \"vet_due\": \"2026-11-01\"},\n                {\"name\": \"Juniper\", \"vet_due\": \"2026-12-01\"}]\n    monkeypatch.setattr(reminders.api, \"list_pets\", fake_list_pets)\n    assert reminders.due_reminders() == [\"Biscuit\"]"
            ),
            part(
              "Undo and design note",
              "States monkeypatch undoes setattr and setenv changes after the test that requested the fixture finishes, so other tests see the real objects; notes that passing today and the API client in as parameters would make the function testable without patching.",
              "The monkeypatch fixture records every change and undoes it when the test finishes, so no other test sees the fake clock, token or API. A cleaner long-term design passes today and the client in (due_reminders(client, today)), so the test needs no patching at all."
            ),
          ],
        },
      ],
    },
  ],
};
