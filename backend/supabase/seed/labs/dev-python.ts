import { GENERAL_SAFETY, part, selectPart, matchPart, numericPart, orderPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-161: Python Programming Coach (PYTHON), nine units, no exam blueprint.
//
// Density (docs/labs.md, "hybrid"): one lab per unit, nine in all (the six
// unweighted extras find no second performance objective with room in any
// unit). Each lab is the kind of thing the unit's gate asks the learner to
// DO: trace and fix a script, reproduce a bug with a test, rewrite loops as
// comprehensions, fail safely on a bad file, make a class behave like a
// value, isolate dependencies, stream a log, write the failing test first,
// and pick the right concurrency tool for the workload.
//
// Sources: the official Python documentation (tutorial, language and
// library reference; python.org listed 3.15.2 as the current release on
// 2026-11-07) and the pytest documentation. Every code snippet in a brief
// or model answer was run on CPython 3.13.18 (pytest 9.1.1) on 2026-11-07
// and the outputs quoted are the outputs observed; nothing depends on a
// 3.14/3.15-only feature. The timings in the concurrency lab are from that
// run on a 2-core sandbox and are described as such.

export const PYTHON_LABS: SeedLabSet = {
  trackCode: "PYTHON",
  sources: [
    source("https://docs.python.org/3/tutorial/index.html", "reference", "2026-11-07"),
    source("https://docs.python.org/3/reference/index.html", "reference", "2026-11-07"),
    source("https://docs.python.org/3/library/index.html", "reference", "2026-11-07"),
    source("https://docs.pytest.org/en/stable/", "reference", "2026-11-07"),
    source("https://peps.python.org/pep-0779/", "reference", "2026-11-09"),
  ],
  labs: [
    {
      slug: "trace-and-fix-temperature-table",
      objective: "Writing and reading a simple script end-to-end",
      kind: "build",
      title: "Trace a short script, then fix what it gets wrong",
      brief:
        "A colleague at Cascade Weather Co-op (fictional) wrote this script. The comment says what it should do.\n\n# Prints a Celsius-to-Fahrenheit table from 0 to 40 in steps of 10.\ncelsius = 0\nwhile celsius < 40:\n    fahrenheit = celsius * 9 / 5 + 32\n    print(f\"{celsius} C = {fahrenheit} F\")\n    celsius += 10\nprint(\"Rows printed:\", celsius / 10)\n\nBefore running it, trace it by hand. Then say what is wrong and rewrite it so the table has every row the comment promises and the final line reports a whole number of rows.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the exact output of the script as written, name each defect, and write the corrected script.",
          parts: [
            part(
              "Exact output as written",
              "Lists four table rows (0, 10, 20, 30 C -> 32.0, 50.0, 68.0, 86.0 F, each with the .0 because / produces a float), no 40 C row, and a final line 'Rows printed: 4.0' (a float, because celsius / 10 is true division).",
              "0 C = 32.0 F\n10 C = 50.0 F\n20 C = 68.0 F\n30 C = 86.0 F\nRows printed: 4.0\n\nThe 40 C row never prints because the loop stops as soon as celsius reaches 40 (the test is <, not <=), and the last line is 4.0 because / is true division and always returns a float."
            ),
            part(
              "Defects named",
              "Names both: (1) the loop bound excludes 40 (off-by-one: < instead of <=, or range(0, 41, 10)); (2) the row count is computed from the loop variable with true division, so it is a float and would be wrong if the step changed. Noting that the Fahrenheit values show .0 because of true division is a bonus, not a defect.",
              "Two defects. The loop condition celsius < 40 stops before the 40 C row the comment promises -- an off-by-one on the bound. And 'Rows printed' is derived from the counter with true division (celsius / 10), so it prints 4.0 instead of a whole number; the count should be counted, not back-calculated."
            ),
            part(
              "Corrected script",
              "A script that prints all five rows (0 to 40 inclusive) and a whole-number row count: for example a for loop over range(0, 41, 10) with a separate counter (or len(range(...))), and a format spec such as :.1f if it chooses to fix the float display. Output must end 'Rows printed: 5'.",
              "rows = 0\nfor celsius in range(0, 41, 10):\n    fahrenheit = celsius * 9 / 5 + 32\n    print(f\"{celsius} C = {fahrenheit:.1f} F\")\n    rows += 1\nprint(\"Rows printed:\", rows)\n\nOutput: five rows from 0 C = 32.0 F to 40 C = 104.0 F, then 'Rows printed: 5'. range(0, 41, 10) makes the inclusive upper bound explicit, and counting rows as they print keeps the count an int."
            ),
          ],
        },
      ],
    },
    {
      slug: "mutable-default-argument-bug",
      objective: "The mutable-default-argument pitfall and how to avoid it",
      kind: "build",
      title: "Diagnose a function that remembers its last call",
      brief:
        "Support engineers at Hollis Ticketing (fictional) report that tags from one ticket leak into the next. The function:\n\ndef add_tag(tag, tags=[]):\n    tags.append(tag)\n    return tags\n\nprint(add_tag(\"urgent\"))\nprint(add_tag(\"billing\"))\n\nThe second call prints ['urgent', 'billing'] even though nobody passed a list. Explain why, fix it without changing how callers use the function, and write tests that would have caught it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the cause, give the fixed function, and write the tests.",
          parts: [
            part(
              "Why it happens",
              "States that default values are evaluated once, when the def statement runs, so the same list object is shared by every call that omits tags; appending mutates that shared object (it is visible in add_tag.__defaults__). Not 'Python copies the list wrongly'.",
              "A default value is evaluated once, at function definition time, not on each call. tags=[] creates one list object that lives on the function (add_tag.__defaults__ shows it), so every call that omits tags appends to the same list. After the two calls, add_tag.__defaults__ is (['urgent', 'billing'],)."
            ),
            part(
              "Fixed function",
              "Uses an immutable sentinel default (None) and creates a new list inside the body when it is None, while still extending a caller-supplied list. Signature stays add_tag(tag, tags=None).",
              "def add_tag(tag, tags=None):\n    if tags is None:\n        tags = []\n    tags.append(tag)\n    return tags\n\nNone is immutable, so sharing it is harmless; the fresh list is created per call. A caller who passes their own list still gets it extended, as before."
            ),
            part(
              "Tests",
              "At least two tests: one that calls the function twice without a list and asserts the second result is just the second tag (the regression), and one that passes an existing list and asserts it is extended in place. Plain assert functions runnable by pytest.",
              "def test_add_tag_starts_fresh_each_call():\n    assert add_tag(\"urgent\") == [\"urgent\"]\n    assert add_tag(\"billing\") == [\"billing\"]\n\ndef test_add_tag_extends_a_given_list():\n    existing = [\"a\"]\n    assert add_tag(\"b\", existing) == [\"a\", \"b\"]\n    assert existing == [\"a\", \"b\"]\n\nThe first test fails on the original code (['urgent', 'billing'] != ['billing']) and passes on the fix; both pass under pytest after the fix."
            ),
          ],
        },
      ],
    },
    {
      slug: "loops-to-comprehensions",
      objective: "List, dict, and set comprehensions",
      kind: "build",
      title: "Rewrite three loops as comprehensions",
      brief:
        "Puget Parcel (fictional) keeps orders as a list of dicts:\n\norders = [\n    {\"id\": 101, \"customer\": \"Okafor\", \"city\": \"Tacoma\", \"total\": 42.50},\n    {\"id\": 102, \"customer\": \"Lindqvist\", \"city\": \"Spokane\", \"total\": 180.00},\n    {\"id\": 103, \"customer\": \"Okafor\", \"city\": \"Tacoma\", \"total\": 99.99},\n    {\"id\": 104, \"customer\": \"Reyes\", \"city\": \"Olympia\", \"total\": 15.25},\n    {\"id\": 105, \"customer\": \"Lindqvist\", \"city\": \"Tacoma\", \"total\": 60.00},\n]\n\nThree reports are built with for loops: (1) a list of the ids of orders with total >= 50, in order; (2) the set of distinct cities; (3) a dict of each customer's total spend. Rewrite each as a single comprehension of the right kind and state what each produces for this data.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the three comprehensions and give their values for this data.",
          parts: [
            part(
              "List of big-order ids",
              "A list comprehension with an if clause, e.g. [o[\"id\"] for o in orders if o[\"total\"] >= 50], producing [102, 103, 105].",
              "big = [o[\"id\"] for o in orders if o[\"total\"] >= 50]   # [102, 103, 105]\nA list, because order and duplicates matter for a report of ids."
            ),
            part(
              "Set of cities",
              "A set comprehension (curly braces, no colon), e.g. {o[\"city\"] for o in orders}, producing the three cities Olympia, Spokane and Tacoma (any order).",
              "cities = {o[\"city\"] for o in orders}   # {'Tacoma', 'Spokane', 'Olympia'}\nA set, because we want each city once and order is irrelevant."
            ),
            part(
              "Dict of spend per customer",
              "A dict comprehension (key: value) that groups correctly -- e.g. {name: sum(o[\"total\"] for o in orders if o[\"customer\"] == name) for name in {o[\"customer\"] for o in orders}} -- giving Okafor 142.49, Lindqvist 240.0, Reyes 15.25. Accepts a note that for large data a single loop with dict.get or collections.Counter is O(n) rather than O(n*k).",
              "totals = {\n    name: sum(o[\"total\"] for o in orders if o[\"customer\"] == name)\n    for name in {o[\"customer\"] for o in orders}\n}\n# {'Okafor': 142.49, 'Lindqvist': 240.0, 'Reyes': 15.25}\nThe inner set comprehension gives each customer once; the generator in sum() adds that customer's totals. It re-scans orders per customer, so for big data a one-pass loop with totals.get(name, 0) + total, or collections.Counter, is the better tool -- a comprehension is not always the right answer."
            ),
          ],
        },
      ],
    },
    {
      slug: "bare-except-hides-the-bug",
      objective: "Catching specific exception types vs. a bare except",
      kind: "case",
      title: "A config loader that never fails -- and never works",
      brief:
        "Marlow Analytics (fictional) runs an internal web service whose port comes from a JSON file. The loader:\n\nimport json\n\ndef load_port(path):\n    try:\n        with open(path) as f:\n            cfg = json.load(f)\n        return int(cfg[\"server\"][\"prot\"])\n    except:\n        return 8080\n\nOps set the port to 9000 in config.json (as {\"server\": {\"port\": 9000}}), restarted, and the service still listens on 8080. Nothing is logged.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You run load_port(\"config.json\") in a shell with the real file present and get 8080. You also try a missing filename and a file containing '{not json'; both return 8080 too.",
          ask: "Why does every input give 8080, and what does the bare except cost you?",
          parts: [
            part(
              "Root cause",
              "Spots the typo \"prot\" (should be \"port\"), which raises KeyError on every valid file, and that the bare except catches it and returns the default, so the real bug is invisible.",
              "The key is misspelled: cfg[\"server\"][\"prot\"] raises KeyError on every well-formed file. The bare except swallows that KeyError and returns 8080, so a code bug looks exactly like 'no config file'. Missing file (FileNotFoundError) and bad JSON (json.JSONDecodeError) are swallowed the same way."
            ),
            part(
              "What a bare except costs",
              "Explains that except: catches everything derived from BaseException, including KeyboardInterrupt and SystemExit, and hides programming errors (KeyError, TypeError, NameError) behind a silent default, so bugs surface far from their cause. Mentions catching specific types or at least Exception.",
              "A bare except catches every exception, including KeyboardInterrupt and SystemExit (so Ctrl-C can be eaten) and every programming error -- a typo, a wrong type, a missing name -- all turned into 'use 8080'. You lose the traceback, you lose the distinction between 'no file' and 'broken code', and the failure shows up elsewhere (the wrong port) with no log line pointing back here."
            ),
          ],
        },
        {
          text: "Your lead agrees it should fall back to 8080 only when the file is absent. A present-but-unusable file (invalid JSON, or no server.port) must stop startup with a clear message. The file handle must be closed on every path.",
          ask: "Rewrite load_port to those rules, and show what it now does for the four inputs: valid file, missing file, '{not json', and {\"server\": {}}.",
          parts: [
            part(
              "Rewritten loader",
              "Catches FileNotFoundError specifically to return the default; catches json.JSONDecodeError and (KeyError, TypeError, ValueError) to raise a clear error (a custom exception class such as ConfigError, with 'from e' chaining); reads the file in a with block or closes it in finally. No bare except. Fixes the key to \"port\".",
              "import json\n\nclass ConfigError(Exception):\n    \"\"\"The config file is present but unusable.\"\"\"\n\ndef load_port(path, default=8080):\n    try:\n        f = open(path)\n    except FileNotFoundError:\n        return default\n    try:\n        cfg = json.load(f)\n        port = int(cfg[\"server\"][\"port\"])\n    except json.JSONDecodeError as e:\n        raise ConfigError(f\"{path} is not valid JSON: {e}\") from e\n    except (KeyError, TypeError, ValueError) as e:\n        raise ConfigError(f\"{path} has no usable server.port: {e!r}\") from e\n    else:\n        return port\n    finally:\n        f.close()\n\n(A with-block around json.load is an equally good way to guarantee the close.)"
            ),
            part(
              "Behavior on the four inputs",
              "Valid file -> 9000; missing file -> 8080; '{not json' -> raises ConfigError (wrapping JSONDecodeError) so startup stops; {\"server\": {}} -> raises ConfigError (wrapping KeyError 'port'). No input silently returns the default except the missing file.",
              "config.json with port 9000 -> 9000. Missing file -> 8080 (the only silent fallback). '{not json' -> ConfigError: 'broken.json is not valid JSON: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)'. {\"server\": {}} -> ConfigError: \"nokey.json has no usable server.port: KeyError('port')\". The chained 'from e' keeps the original traceback for whoever reads the log."
            ),
          ],
        },
      ],
    },
    {
      slug: "money-class-dunders",
      objective: "Common dunder methods: __str__, __repr__, __eq__, __len__",
      kind: "build",
      title: "Make a Money class behave like a value",
      brief:
        "Ferncliff Books (fictional) has this class:\n\nclass Money:\n    def __init__(self, cents, currency):\n        self.cents = cents\n        self.currency = currency\n\nThree complaints from the team: Money(500, \"USD\") == Money(500, \"USD\") is False; printing one shows '<__main__.Money object at 0x...>'; and a Wallet class that holds a list of Money objects raises TypeError on len(wallet). They also want Money usable in a set. Add the dunder methods that fix all of this and explain what each one does.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the methods and explain the behavior each one gives.",
          parts: [
            part(
              "__eq__ (and what it needs alongside it)",
              "Defines __eq__ comparing cents and currency as a tuple, returning NotImplemented for non-Money operands; states that defining __eq__ sets __hash__ to None so a __hash__ over the same fields must be added for set/dict use. Money(500,'USD') == Money(500,'EUR') is False.",
              "def __eq__(self, other):\n    if not isinstance(other, Money):\n        return NotImplemented\n    return (self.cents, self.currency) == (other.cents, other.currency)\n\ndef __hash__(self):\n    return hash((self.cents, self.currency))\n\nWithout __eq__, == falls back to identity, so two equal amounts compare False. Returning NotImplemented (not False) for other types lets Python try the other operand's __eq__. Defining __eq__ alone makes instances unhashable (__hash__ becomes None), so __hash__ over the same fields is required for the set the team wants; len({a, b}) is then 1 for two equal amounts."
            ),
            part(
              "__repr__ and __str__",
              "__repr__ returns an unambiguous, ideally re-creatable form such as Money(500, 'USD') (using !r); __str__ returns the human form such as '5.00 USD'. Explains repr is for developers/debugging and is the fallback when __str__ is missing; str is for print().",
              "def __repr__(self):\n    return f\"Money({self.cents!r}, {self.currency!r})\"\n\ndef __str__(self):\n    return f\"{self.cents / 100:.2f} {self.currency}\"\n\nrepr(a) -> Money(500, 'USD') (what you'd type to recreate it; shown in the REPL, in lists and in tracebacks); str(a) -> 5.00 USD (what print shows a person). If only __repr__ is defined, print uses it too."
            ),
            part(
              "__len__ on Wallet",
              "Defines __len__ on the container class returning len of its internal list, and notes that bool(wallet) then follows len (an empty wallet is falsy). Does not put __len__ on Money, which has no length.",
              "class Wallet:\n    def __init__(self):\n        self._items = []\n    def add(self, m):\n        self._items.append(m)\n    def __len__(self):\n        return len(self._items)\n\nlen(w) now works (2 after two adds) and, because truthiness falls back to __len__, bool(Wallet()) is False. __len__ belongs on the container, not on Money -- an amount has no length."
            ),
          ],
        },
      ],
    },
    {
      slug: "venv-and-pinned-requirements",
      objective: "Installing and pinning dependencies with pip and requirements.txt",
      kind: "build",
      title: "Make a script run the same on every machine",
      brief:
        "A data-cleaning script at Orca Bay Logistics (fictional) uses the requests library. It works on the author's laptop, where requests was installed system-wide years ago, and fails on a teammate's new machine with ModuleNotFoundError. A third person installed the latest requests globally and now an unrelated project of theirs broke. The team wants: an isolated environment per project, exact versions recorded in the repo, and nothing environment-specific committed.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the setup steps, the pinning approach, and the repo hygiene rules.",
          parts: [
            part(
              "Create and use an isolated environment",
              "Uses python3 -m venv <dir> and activates it (source .venv/bin/activate on macOS/Linux, .venv\\Scripts\\activate on Windows), then installs with python -m pip inside it; explains the venv has its own site-packages so installs there cannot touch the system interpreter or other projects.",
              "python3 -m venv .venv\nsource .venv/bin/activate        # Windows: .venv\\Scripts\\activate\npython -m pip install requests\n\nAfter activation, python and pip resolve to the .venv copies (sys.prefix points inside .venv) and packages land in .venv's own site-packages. The system Python and every other project are untouched, which is exactly the isolation the third teammate lacked."
            ),
            part(
              "Pin exact versions",
              "Records exact versions with == in requirements.txt, generated from the working environment (python -m pip freeze > requirements.txt) and installed with python -m pip install -r requirements.txt; notes freeze includes transitive dependencies (certifi, urllib3, idna, charset-normalizer for requests) so installs are reproducible.",
              "python -m pip freeze > requirements.txt\n# produces lines such as:\n# certifi==2026.10.23\n# charset-normalizer==3.5.2\n# idna==3.20\n# requests==2.32.5\n# urllib3==2.8.0\n\nTeammates run python -m pip install -r requirements.txt inside their own venv and get the identical set, transitive dependencies included. == pins exact versions; a bare 'requests' would drift to whatever is newest on the day."
            ),
            part(
              "Repo hygiene",
              "Commits requirements.txt (and a README line with the two commands) but never the .venv directory (add it to .gitignore); explains the venv is machine-specific (absolute paths, platform binaries) while requirements.txt is the portable record.",
              "Commit requirements.txt and a two-line README (create the venv, install -r). Add .venv/ to .gitignore: it contains an interpreter symlink and compiled packages for one OS and one path, so it is not portable and bloats the repo. The requirements file is the thing that recreates it anywhere."
            ),
          ],
        },
      ],
    },
    {
      slug: "generator-log-pipeline",
      objective: "Generators and yield; generator expressions",
      kind: "build",
      title: "Stream a multi-gigabyte log instead of loading it",
      brief:
        "Blue Heron Hosting (fictional) counts ERROR lines per component in a 6 GB log. Lines look like '2026-11-07T08:00:02 ERROR api  request /orders 500' (timestamp, level, component, message). The current script does lines = f.readlines(), then builds a second list of error lines, then a third list of components, and the box runs out of memory. Rewrite it as a pipeline of generators and show it on this six-line sample:\n\n2026-11-07T08:00:01 INFO  api  request /health 200\n2026-11-07T08:00:02 ERROR api  request /orders 500\n2026-11-07T08:00:02 WARN  db   slow query 1200ms\n2026-11-07T08:00:03 ERROR api  request /orders 500\n2026-11-07T08:00:04 INFO  api  request /orders 200\n2026-11-07T08:00:05 ERROR db   connection reset",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the generator pipeline, give its result on the sample, and explain why it fits in memory.",
          parts: [
            part(
              "Pipeline",
              "Three stages that each yield one item at a time -- read lines from the open file (iterating the file object, not readlines), keep lines containing ' ERROR ', extract the component (line.split()[2]) -- composed and fed to collections.Counter (or an equivalent dict count). Generator functions with yield or generator expressions both acceptable.",
              "from collections import Counter\n\ndef read_lines(f):\n    for line in f:\n        yield line.rstrip(\"\\n\")\n\ndef errors(lines):\n    for line in lines:\n        if \" ERROR \" in line:\n            yield line\n\ndef components(lines):\n    for line in lines:\n        yield line.split()[2]\n\nwith open(\"app.log\") as f:\n    counts = Counter(components(errors(read_lines(f))))\n\nEquivalent generator expressions: (l.rstrip() for l in f), (l for l in lines if \" ERROR \" in l), (l.split()[2] for l in lines)."
            ),
            part(
              "Result on the sample",
              "Counter({'api': 2, 'db': 1}) -- three ERROR lines, two from api and one from db.",
              "Counter({'api': 2, 'db': 1}). Three lines contain ERROR: two api lines (both /orders 500) and one db line (connection reset)."
            ),
            part(
              "Why it fits in memory",
              "Explains that each stage is lazy: calling errors(...) returns a generator object without reading anything; items are pulled one at a time by Counter's loop, so at most one line is in flight and memory is O(1) in the file size, versus three full lists (O(n)) in the original. Mentions that a generator can be consumed once.",
              "Nothing runs until Counter starts iterating. Each next() pulls one line through all three stages and then drops it, so memory stays at roughly one line no matter how big the file is; the original held three copies of the whole file (readlines, the error list, the component list). The trade: a generator is single-pass -- to count twice you build the pipeline again -- and you cannot index or len() it."
            ),
          ],
        },
      ],
    },
    {
      slug: "failing-test-first-parse-duration",
      objective: "Writing unit tests with pytest: assertions, fixtures, parametrization",
      kind: "build",
      title: "Write the failing test, then fix the bug",
      brief:
        "Kestrel Scheduling (fictional) has a parser for durations such as '1h30m' that should return seconds. Users report '1h30m' gives the wrong answer while '45s', '2m' and '1h' are fine.\n\ndef parse_duration(text):\n    \"\"\"'1h30m' -> 5400 seconds; accepts h, m, s parts in that order.\"\"\"\n    total = 0\n    number = \"\"\n    for ch in text:\n        if ch.isdigit():\n            number += ch\n        elif ch == \"h\":\n            total += int(number) * 3600\n        elif ch == \"m\":\n            total += int(number) * 60\n        elif ch == \"s\":\n            total += int(number)\n        else:\n            raise ValueError(f\"bad duration: {text!r}\")\n    return total\n\nWork test-first: write a parametrized pytest that reproduces the report (and keeps the working cases), state what it reports against the current code, then fix the function.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the test module, state the failure it produces, and give the fixed function.",
          parts: [
            part(
              "Parametrized test",
              "Uses @pytest.mark.parametrize over (text, seconds) pairs including the working cases and the failing one(s) such as ('1h30m', 5400), plus a pytest.raises(ValueError) test for garbage input. Plain assert statements, no unittest boilerplate.",
              "import pytest\nfrom durations import parse_duration\n\n@pytest.mark.parametrize(\"text, seconds\", [\n    (\"45s\", 45),\n    (\"2m\", 120),\n    (\"1h\", 3600),\n    (\"1h30m\", 5400),\n    (\"1h30m15s\", 5415),\n])\ndef test_parse_duration(text, seconds):\n    assert parse_duration(text) == seconds\n\ndef test_rejects_garbage():\n    with pytest.raises(ValueError):\n        parse_duration(\"1x\")"
            ),
            part(
              "What the test reports and why",
              "States that the two multi-part cases fail -- '1h30m' returns 11400, not 5400 -- and diagnoses the cause: number is never reset after a unit, so the digits accumulate ('1' then '130'); 130*60 + 3600 = 11400. Single-unit cases pass, which is why they were never noticed.",
              "pytest reports 2 failed, 4 passed: test_parse_duration[1h30m-5400] gets 11400 and [1h30m15s-5415] gets 24415. The digit buffer is never cleared after a unit letter, so after '1h' the buffer still holds '1', '30' appends to make '130', and 130 * 60 = 7800 is added to 3600. Every single-unit input passes, so the bug hid until someone typed a compound duration."
            ),
            part(
              "Fixed function",
              "Resets number = \"\" after each unit is consumed; preferably also raises ValueError when a unit has no digits before it or digits are left over at the end. All six tests pass.",
              "def parse_duration(text):\n    total = 0\n    number = \"\"\n    for ch in text:\n        if ch.isdigit():\n            number += ch\n        elif ch in \"hms\":\n            if not number:\n                raise ValueError(f\"bad duration: {text!r}\")\n            total += int(number) * {\"h\": 3600, \"m\": 60, \"s\": 1}[ch]\n            number = \"\"\n        else:\n            raise ValueError(f\"bad duration: {text!r}\")\n    if number:\n        raise ValueError(f\"bad duration: {text!r}\")\n    return total\n\nWith the reset, 6 passed. The two extra guards turn 'h5' and '5' (trailing digits with no unit) into errors instead of silent partial results."
            ),
          ],
        },
      ],
    },
    {
      slug: "threads-vs-processes-vs-asyncio",
      objective: "Threading for I/O-bound work vs. multiprocessing for CPU-bound work",
      kind: "build",
      title: "Pick the concurrency tool for three workloads",
      brief:
        "Ridgeline Imaging (fictional) has three slow jobs in one Python service. (A) Fetch 8 image-metadata records from a partner's HTTP API; each call waits about half a second on the network and does almost no computation. (B) Compute a checksum-like pure-Python loop over 2 million numbers for each of 4 images. (C) A websocket gateway that holds about 5,000 mostly-idle client connections open at once. The server has 2 CPU cores. A junior engineer proposes 'just use threads everywhere'. A quick experiment with concurrent.futures on the server showed: 8 sequential fake fetches (time.sleep(0.5)) took 4.00 s and the same 8 in a ThreadPoolExecutor took 0.51 s; 4 sequential CPU loops took 0.33 s and the same 4 in a ThreadPoolExecutor took 0.35 s.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each workload name the tool, justify it against the alternatives, and sketch the code for A.",
          parts: [
            part(
              "Workload A (8 network calls)",
              "Threads (ThreadPoolExecutor) or asyncio; explains the GIL is released while a thread blocks on I/O, so 8 waits overlap -- matching the 4.00 s -> 0.51 s result; multiprocessing would work but pays process start-up and pickling for no benefit.",
              "Threads, e.g. ThreadPoolExecutor(max_workers=8).map(fetch, ids). While a thread waits on the socket the interpreter releases the GIL, so all eight waits overlap -- which is why 8 x 0.5 s fell from 4.00 s to 0.51 s. asyncio would do the same with one thread if the HTTP client is async-aware. Processes add start-up cost and pickling for a job that burns no CPU.\n\nfrom concurrent.futures import ThreadPoolExecutor\nwith ThreadPoolExecutor(max_workers=8) as ex:\n    records = list(ex.map(fetch_metadata, image_ids))"
            ),
            part(
              "Workload B (4 CPU-bound loops)",
              "Multiprocessing (ProcessPoolExecutor), because pure-Python bytecode holds the GIL so threads cannot run it in parallel -- consistent with 0.33 s vs 0.35 s; notes the speedup is bounded by cores (2 here, so at most ~2x, and process start-up may eat it for short jobs) and that NumPy/C extensions that release the GIL, or the free-threaded build supported since Python 3.14, change the picture.",
              "ProcessPoolExecutor. The loop is pure Python, so each thread needs the GIL to execute bytecode and only one runs at a time -- the threaded run (0.35 s) was no faster than sequential (0.33 s). Separate processes each have their own interpreter and GIL, so they can use both cores; on this 2-core box the ceiling is about 2x, and for a 0.3 s job process start-up and pickling can cancel the gain, so measure. If the work moves into NumPy or a C extension that releases the GIL, threads become viable again. One more option since Python 3.14: the free-threaded build (python3.14t, officially supported under PEP 779) has no GIL, so pure-Python threads can use both cores there. It is a separate build rather than the default, and some C extensions are not ready for it yet, so on the standard interpreter ProcessPoolExecutor is still the answer."
            ),
            part(
              "Workload C (5,000 idle connections)",
              "asyncio: one thread, an event loop, each connection a coroutine that awaits; explains 5,000 OS threads would cost memory and context switches for connections that mostly wait, and processes are heavier still.",
              "asyncio. Each connection becomes a coroutine parked on await until data arrives; one event loop in one thread services thousands of them because idle connections cost a small object, not a stack. 5,000 threads would mean 5,000 stacks and constant context switching for sockets that are usually silent; 5,000 processes is out of the question. Threads are fine for a handful of blocking calls (A); for massive idle concurrency the event loop wins."
            ),
          ],
        },
      ],
    },
    // REQ-295 (2026-11-14): the density fill. Units 1-6 take the six extra
    // labs (no exam weights, so they go to the earliest units). Every snippet
    // and output below was run on CPython 3.13.18 on 2026-11-14 and the
    // values quoted are the ones observed.
    {
      slug: "truthiness-stock-label",
      objective: "Conditional logic: if/elif/else and truthiness",
      kind: "build",
      title: "Find the two conditions that mislabel stock",
      brief:
        "Fernhill Hardware (fictional) labels stock on its shelf tags. None means the count has not been taken yet, 0 means sold out, 1-10 is 'in stock' and more than 10 is 'plenty'.\n\ndef stock_label(qty):\n    if not qty:\n        return \"unknown\"\n    elif qty > 0:\n        return \"in stock\"\n    elif qty > 10:\n        return \"plenty\"\n    else:\n        return \"sold out\"\n\nCalled with None, 0, 5 and 40 it returns unknown, unknown, in stock, in stock. Two of the four are wrong.",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "Every value is the output of the snippet itself, run on CPython 3.13.18 on 2026-11-14; language and library behavior follows the Python documentation cited for the set (read 2026-11-07). No outside value is quoted.",
      steps: [
        {
          text: "",
          ask: "Tap the two lines that cause the wrong labels, then write the corrected function.",
          parts: [
            selectPart(
              "Lines that cause the wrong labels",
              "Met: exactly the two condition lines 'if not qty:' and 'elif qty > 0:'. One right and none wrong is partly there.",
              "'if not qty:' treats 0 exactly like None, because 0 is falsy -- so a sold-out item reads 'unknown'. 'elif qty > 0:' comes before the > 10 test, so 40 takes the 'in stock' branch and the 'plenty' branch can never run. The 'elif qty > 10:' line is not wrong in itself; it is unreachable because of the line above it.",
              {
                display: "config",
                lines: ["def stock_label(qty):", "    if not qty:", "        return \"unknown\"", "    elif qty > 0:", "        return \"in stock\"", "    elif qty > 10:", "        return \"plenty\"", "    else:", "        return \"sold out\""],
                correct: [1, 3],
              }
            ),
            part(
              "Corrected function",
              "Tests None explicitly (qty is None, not a truthiness test) and checks the larger bound before the smaller one (> 10 before > 0), so None, 0, 5 and 40 give unknown, sold out, in stock, plenty; 10 stays 'in stock'.",
              "def stock_label(qty):\n    if qty is None:\n        return \"unknown\"\n    elif qty > 10:\n        return \"plenty\"\n    elif qty > 0:\n        return \"in stock\"\n    else:\n        return \"sold out\"\n\nNone, 0, 5, 40, 10, 11 -> unknown, sold out, in stock, plenty, in stock, plenty. 'is None' asks the question we mean; 'not qty' asks 'is it falsy', and 0, 0.0, '' and [] are all falsy. In an if/elif chain the first true test wins, so the narrower range goes first."
            ),
          ],
        },
      ],
    },
    {
      slug: "unboundlocal-counter",
      objective: "Local, enclosing, and global scope (the LEGB rule)",
      kind: "build",
      title: "Fix a counter that raises UnboundLocalError",
      brief:
        "Brightwater Events (fictional) counts badge scans with a closure:\n\ndef make_counter():\n    count = 0\n    def bump():\n        count += 1\n        return count\n    return bump\n\nscan = make_counter()\nscan()\n\nThe call fails with: UnboundLocalError: cannot access local variable 'count' where it is not associated with a value. A colleague says 'but count is right there in make_counter'.",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "Every value is the output of the snippet itself, run on CPython 3.13.18 on 2026-11-14; language and library behavior follows the Python documentation cited for the set (read 2026-11-07). No outside value is quoted.",
      steps: [
        {
          text: "",
          ask: "Match each name to the scope Python finds it in, explain the error, and give the fix.",
          parts: [
            matchPart(
              "Where each name is found (LEGB)",
              "Met: all four right -- the parameter n inside its own function is Local; count read (not assigned) inside bump is Enclosing; a module-level TAX_RATE read inside a function is Global; len is Built-in. Two or three right is partly there.",
              "Python looks a name up in Local, then Enclosing function scopes, then Global (module), then Built-in. A parameter is local to its function. A name only read inside a nested function, and assigned in the outer one, is found in the enclosing scope. A module constant read in a function is global. len comes from builtins unless something shadows it.",
              {
                leftHeading: "Name, where it is used",
                rightHeading: "Scope it resolves to",
                left: ["n, a parameter, used inside def double(n): return n * 2", "count, only read inside bump(), assigned in make_counter()", "TAX_RATE, set at the top of the module, read inside a function", "len, called inside any function that never defines it"],
                right: ["Local", "Enclosing", "Global", "Built-in"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Why it fails, and the fix",
              "Explains that 'count += 1' is an assignment, so the compiler makes count local to bump for the whole function body; reading it before any local value exists raises UnboundLocalError. Fix: declare 'nonlocal count' in bump (not global, which would look in the module and fail differently). After the fix three calls return 1, 2, 3.",
              "Any assignment to a name inside a function -- including 'count += 1' -- makes that name local to the function at compile time. So inside bump, count is a local that has no value yet when += tries to read it. The fix is to say which count we mean:\n\ndef make_counter():\n    count = 0\n    def bump():\n        nonlocal count\n        count += 1\n        return count\n    return bump\n\nThree calls now return 1, 2, 3. 'global count' would be wrong: there is no module-level count, so it would raise NameError, and it would share one counter across every make_counter() call."
            ),
          ],
        },
      ],
    },
    {
      slug: "word-count-dict-patterns",
      objective: "Dictionaries: keys, values, items, lookups, and default patterns",
      kind: "build",
      title: "Count words without a KeyError",
      brief:
        "A support analyst at Larkspur Books (fictional) counts words in ticket subjects:\n\nwords = \"the cat and the hat and the bat\".split()\ncounts = {}\nfor w in words:\n    counts[w] += 1\n\nIt stops at once with KeyError: 'the'. The analyst also wants to group words by first letter for a second report.",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "Every value is the output of the snippet itself, run on CPython 3.13.18 on 2026-11-14; language and library behavior follows the Python documentation cited for the set (read 2026-11-07). No outside value is quoted.",
      steps: [
        {
          text: "",
          ask: "Match each lookup to what it does on a missing key, give the count for 'the', and write the fixed loop and the grouping.",
          parts: [
            matchPart(
              "What each pattern does when the key is missing",
              "Met: counts[k] raises KeyError; counts.get(k, 0) returns 0 and stores nothing; counts.setdefault(k, []) stores [] and returns it; a defaultdict(int) lookup stores 0 and returns it. Two or three right is partly there.",
              "Plain indexing raises KeyError. get returns the default without changing the dict. setdefault inserts the default and returns the stored object, which is why setdefault(k, []).append(x) works. A defaultdict calls its factory (int() is 0) on a missing key and stores the result, even on a plain read.",
              {
                leftHeading: "Expression, key absent",
                rightHeading: "Result",
                left: ["counts[k]", "counts.get(k, 0)", "counts.setdefault(k, [])", "d[k] where d = defaultdict(int)"],
                right: ["Raises KeyError", "Returns 0, dict unchanged", "Stores [] under k and returns it", "Stores 0 under k and returns it", "Returns None, dict unchanged"],
                pairs: [0, 1, 2, 3],
              }
            ),
            numericPart("Count for 'the'", "Met: 3 exactly.", "'the' appears three times in 'the cat and the hat and the bat', so counts['the'] is 3 after the fixed loop.", { answer: 3, tolerance: 0 }),
            part(
              "Fixed loop and the grouping",
              "A count loop that cannot raise (counts[w] = counts.get(w, 0) + 1, or collections.Counter(words)); and a grouping by first letter using setdefault(w[0], []).append(w) or defaultdict(list). States the counts {'the': 3, 'cat': 1, 'and': 2, 'hat': 1, 'bat': 1}.",
              "counts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\n# {'the': 3, 'cat': 1, 'and': 2, 'hat': 1, 'bat': 1}\n\nOr simply collections.Counter(words), whose most_common(2) is [('the', 3), ('and', 2)].\n\nby_letter = {}\nfor w in words:\n    by_letter.setdefault(w[0], []).append(w)\n# {'t': ['the', 'the', 'the'], 'c': ['cat'], 'a': ['and', 'and'], 'h': ['hat'], 'b': ['bat']}\n\nDicts keep insertion order, so keys appear in the order first seen."
            ),
          ],
        },
      ],
    },
    {
      slug: "csv-to-json-inventory",
      objective: "Working with CSV and JSON data via the standard library",
      kind: "build",
      title: "Total a CSV of stock and write a JSON summary",
      brief:
        "Harbor Lane Gifts (fictional) exports stock.csv:\n\nsku,qty,price\nA100,3,4.50\nB200,10,1.25\nC300,2,19.99\n\nA script is meant to write summary.json with the number of rows and the stock value (qty x price, summed):\n\nimport csv, json\nwith open(\"stock.csv\", newline=\"\") as f:\n    rows = list(csv.DictReader(f))\ntotal = sum(r[\"qty\"] * r[\"price\"] for r in rows)\nsummary = {\"items\": len(rows), \"value\": total}\nwith open(\"summary.json\") as f:\n    json.dump(summary, f)\n\nIt crashes before writing anything.",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "Every value is the output of the snippet itself, run on CPython 3.13.18 on 2026-11-14; language and library behavior follows the Python documentation cited for the set (read 2026-11-07). No outside value is quoted.",
      steps: [
        {
          text: "",
          ask: "Tap the two lines that are wrong, give the stock value, and write the fixed script.",
          parts: [
            selectPart(
              "Wrong lines",
              "Met: exactly the sum line and the second open() line. One right and none wrong is partly there.",
              "csv.DictReader gives every field as a str, so r[\"qty\"] * r[\"price\"] is str * str and raises TypeError: can't multiply sequence by non-int of type 'str'. The output file is opened without a mode, which means read mode: it fails on a missing file and could never be written. Opening the CSV with newline=\"\" is what the csv docs recommend, so that line is right.",
              {
                display: "config",
                lines: ["import csv, json", "with open(\"stock.csv\", newline=\"\") as f:", "    rows = list(csv.DictReader(f))", "total = sum(r[\"qty\"] * r[\"price\"] for r in rows)", "summary = {\"items\": len(rows), \"value\": total}", "with open(\"summary.json\") as f:", "    json.dump(summary, f)"],
                correct: [3, 5],
              }
            ),
            numericPart("Stock value", "Met within 0.01 of 65.98.", "3 x 4.50 + 10 x 1.25 + 2 x 19.99 = 13.50 + 12.50 + 39.98 = 65.98. The float sum prints 65.97999999999999, so round it (or use decimal.Decimal for money).", { answer: 65.98, tolerance: 0.01, unit: "$" }),
            part(
              "Fixed script",
              "Converts the fields (int(r[\"qty\"]) * float(r[\"price\"]), or Decimal), rounds the value for output, and opens summary.json with mode \"w\" before json.dump. Result written: {\"items\": 3, \"value\": 65.98}.",
              "import csv, json\nwith open(\"stock.csv\", newline=\"\") as f:\n    rows = list(csv.DictReader(f))\ntotal = sum(int(r[\"qty\"]) * float(r[\"price\"]) for r in rows)\nsummary = {\"items\": len(rows), \"value\": round(total, 2)}\nwith open(\"summary.json\", \"w\") as f:\n    json.dump(summary, f)\n\nsummary.json then holds {\"items\": 3, \"value\": 65.98}. Without round() it would hold 65.97999999999999, because 0.1-style decimals are not exact in binary floats; decimal.Decimal(r[\"price\"]) avoids that for money."
            ),
          ],
        },
      ],
    },
    {
      slug: "super-and-the-mro",
      objective: "Inheritance, method overriding, and super()",
      kind: "build",
      title: "Follow super() through two mixins",
      brief:
        "Tidewater Billing (fictional) builds records from mixins:\n\nlog = []\nclass Record:\n    def __init__(self, record_id):\n        self.record_id = record_id\n    def save(self):\n        log.append(\"Record\")\nclass Timestamped(Record):\n    def save(self):\n        log.append(\"Timestamped\")\n        super().save()\nclass Audited(Record):\n    def save(self):\n        log.append(\"Audited\")\n        super().save()\nclass Invoice(Timestamped, Audited):\n    def __init__(self, record_id, amount):\n        self.amount = amount\n    def save(self):\n        log.append(\"Invoice\")\n        super().save()\n\ninv = Invoice(\"INV-7\", 120)\ninv.save()\n\nLater, printing inv.record_id raises AttributeError.",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "Every value is the output of the snippet itself, run on CPython 3.13.18 on 2026-11-14; language and library behavior follows the Python documentation cited for the set (read 2026-11-07). No outside value is quoted.",
      steps: [
        {
          text: "",
          ask: "Put Invoice's method resolution order in sequence, then explain the AttributeError and fix it.",
          parts: [
            orderPart(
              "Invoice.__mro__",
              "Met: the exact order Invoice, Timestamped, Audited, Record, object. One item out of place is partly there.",
              "Invoice.__mro__ is (Invoice, Timestamped, Audited, Record, object). super() means 'the next class in the instance's MRO', not 'my parent', so Timestamped's super().save() calls Audited.save, and log ends as ['Invoice', 'Timestamped', 'Audited', 'Record'] -- Record runs once, not twice.",
              ["Invoice", "Timestamped", "Audited", "Record", "object"]
            ),
            part(
              "The AttributeError and the fix",
              "Explains that Invoice.__init__ overrides Record.__init__ and never calls it, so record_id is never set; the fix calls super().__init__(record_id) in Invoice.__init__ before setting amount. Notes that an override replaces the parent method entirely unless it calls super().",
              "Defining __init__ in Invoice replaces the inherited one; Python does not call the parent's constructor for you. Record.__init__ never runs, so the instance has amount but no record_id: AttributeError: 'Invoice' object has no attribute 'record_id'. Fix:\n\nclass Invoice(Timestamped, Audited):\n    def __init__(self, record_id, amount):\n        super().__init__(record_id)\n        self.amount = amount\n\nNow Invoice(\"INV-8\", 5).record_id is 'INV-8'. Use super() rather than Record.__init__(self, ...) so a mixin that adds its own __init__ later still gets called in MRO order."
            ),
          ],
        },
      ],
    },
    {
      slug: "stdlib-for-an-on-call-script",
      objective: "Useful standard library modules: os, sys, datetime, collections, itertools",
      kind: "build",
      title: "Reach for the standard library, not a new package",
      brief:
        "The two-person IT team at Kestrel Dental (fictional) wants a small on-call script: read a log folder from the command line, build file paths that work on Windows and Linux, count the most common error code, rotate three names through the week, and say how many days remain until the 2026-12-18 audit, counting from 2026-11-14. A teammate proposes installing four packages from PyPI for it.",
      safetyNote: GENERAL_SAFETY,
      noValueSource: "Every value is the output of the snippet itself, run on CPython 3.13.18 on 2026-11-14; language and library behavior follows the Python documentation cited for the set (read 2026-11-07). No outside value is quoted.",
      steps: [
        {
          text: "",
          ask: "Match each job to the standard library tool, give the days to the audit, and sketch the script.",
          parts: [
            matchPart(
              "Tool for each job",
              "Met: all five right -- folder from the command line: sys.argv; portable paths: os.path.join; most common error code: collections.Counter; rotating names: itertools.cycle; days to a date: subtracting datetime.date objects. Three or four right is partly there.",
              "sys.argv holds the command-line words (argparse when there are options). os.path.join (or pathlib.Path) uses the right separator for the platform. Counter(...).most_common(1) gives the top item and its count. itertools.cycle repeats a sequence forever, so islice(cycle(names), 7) is a week. date - date gives a timedelta whose .days is the gap. random.shuffle and json.loads do none of these jobs.",
              {
                leftHeading: "Job",
                rightHeading: "Standard library tool",
                left: ["Read the log folder given on the command line", "Build data/2026/log.txt on any OS", "Find the most common error code", "Rotate three names through seven days", "Days from today to the audit"],
                right: ["sys.argv", "os.path.join", "collections.Counter", "itertools.cycle", "datetime.date subtraction", "random.shuffle", "json.loads"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            numericPart("Days to the audit", "Met: 34 exactly.", "(date(2026, 12, 18) - date(2026, 11, 14)).days is 34: 16 days left in November after the 14th, plus 18 in December.", { answer: 34, tolerance: 0, unit: "days" }),
            part(
              "Script sketch",
              "Uses only the standard library: sys.argv[1] (or argparse) for the folder, os.path.join or pathlib for paths, Counter(...).most_common(1) for the top code, itertools.cycle with islice for the rota, date subtraction for the countdown. Says why no PyPI package is needed (nothing to install or pin, no supply-chain risk for a two-person team).",
              "import sys, os\nfrom collections import Counter\nfrom datetime import date\nfrom itertools import cycle, islice\n\nfolder = sys.argv[1]\npath = os.path.join(folder, \"2026\", \"log.txt\")\nwith open(path) as f:\n    codes = [line.split()[0] for line in f if line.strip()]\nprint(Counter(codes).most_common(1))\nprint(list(islice(cycle([\"Ana\", \"Ben\", \"Cai\"]), 7)))\nprint((date(2026, 12, 18) - date.today()).days, \"days to the audit\")\n\nThe rota prints ['Ana', 'Ben', 'Cai', 'Ana', 'Ben', 'Cai', 'Ana']. Everything ships with Python, so there is nothing to install, pin or vet."
            ),
          ],
        },
      ],
    },
  ],
};
