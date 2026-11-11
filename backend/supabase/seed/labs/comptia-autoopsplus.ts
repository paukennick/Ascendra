import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-160: CompTIA AutoOps+ (AT0-001, V1).
//
// Verified 2026-11-07 against CompTIA's AutoOps+ certification page: exam
// series code AT0-001, version V1, launched 2026-06-02, maximum 60 questions
// (multiple-choice and performance-based), 60 minutes, passing score 600 on
// 100-900; four domains Automation Coding Concepts 31%, System Configuration
// 25%, Continuous Integration 24%, Continuous Delivery 20%. The page's
// objective headings are "Use code to support automation", "Apply source
// control techniques", "Explain concepts related to infrastructure as code",
// "Troubleshoot common issues with the code life cycle", "Use configuration
// management techniques", "Compare and contrast approaches to automation",
// "Interact with RESTful systems", "Troubleshoot common configuration
// issues", "Explain environmental factors related to CI management",
// "Explain workflow management concepts in CI", "Analyze configurations to
// manage basic automation pipelines", "Implement techniques of continuous
// delivery", "Explain concepts related to application service levels" and
// "Compare and contrast methods to secure connections to providers" -- the
// seed track's objectives paraphrase these one for one. No objectives PDF is
// linked from the page.
//   https://www.comptia.org/en-us/certifications/autoops/
// Density (docs/labs.md, policy "hybrid"): 2 / 3 / 2 / 1. The labs put the
// candidate in front of authored tool output (YAML parser errors, a Python
// traceback, git conflict markers, an Ansible check-mode run, curl TLS and
// 401 errors) and ask for the fix, plus the artifacts an automation engineer
// writes: a script, CRUD calls with the right verbs and status codes, a
// pipeline definition, and a deployment strategy per service. Tools named
// (Git, Ansible, GitHub Actions, Jenkins, curl, jq) are the ones the official
// objectives name or are generic; nothing depends on a vendor's current
// limits or prices.

export const AUTOOPSPLUS_LABS: SeedLabSet = {
  trackCode: "AUTOOPSPLUS",
  sources: [source("https://www.comptia.org/en-us/certifications/autoops/", "exam_outline", "2026-11-07")],
  labs: [
    // -----------------------------------------------------------------------
    // Automation Coding Concepts (31%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "health-check-script-with-functions-and-loops",
      objective: "Writing, testing, and maintaining automation scripts using variables, functions, and loops",
      kind: "build",
      title: "Write and test a service health-check script",
      brief:
        "The operations team at Quillon Retail wants a script that checks the health endpoint (GET /health, expects HTTP 200) of each service listed in a text file, one hostname per line, with a configurable timeout, and prints one line per host (OK or FAIL with the reason) and a summary count, exiting 0 only if every host is healthy. It will run in CI and from cron, so it must not prompt, must handle an unreachable host without crashing, and must be testable without real servers. Write it in a language of your choice (Python, Bash or PowerShell), then explain how you would test and maintain it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the script and describe its tests and the maintenance practices you build in.",
          parts: [
            part(
              "The script",
              "A working script that reads hostnames from a file given as an argument (with a default), uses a function to check one host (request with timeout, catches connection errors and treats them as FAIL), loops over the hosts, counts failures, prints per-host and summary lines, and exits non-zero if any failed; configuration (timeout, path) in variables or arguments, not hard-coded in the loop.",
              "#!/usr/bin/env python3\nimport sys, urllib.request, urllib.error\n\nHOSTS_FILE = sys.argv[1] if len(sys.argv) > 1 else \"hosts.txt\"\nTIMEOUT = float(sys.argv[2]) if len(sys.argv) > 2 else 5.0\nPATH = \"/health\"\n\ndef check(host: str, timeout: float) -> tuple[bool, str]:\n    url = f\"https://{host}{PATH}\"\n    try:\n        with urllib.request.urlopen(url, timeout=timeout) as r:\n            return (r.status == 200, f\"HTTP {r.status}\")\n    except urllib.error.HTTPError as e:\n        return (False, f\"HTTP {e.code}\")\n    except (urllib.error.URLError, TimeoutError, OSError) as e:\n        return (False, f\"unreachable: {e}\")\n\ndef main() -> int:\n    with open(HOSTS_FILE) as f:\n        hosts = [h.strip() for h in f if h.strip() and not h.startswith(\"#\")]\n    failures = 0\n    for host in hosts:\n        ok, reason = check(host, TIMEOUT)\n        print(f\"{'OK  ' if ok else 'FAIL'} {host} ({reason})\")\n        failures += 0 if ok else 1\n    print(f\"{len(hosts) - failures}/{len(hosts)} healthy\")\n    return 0 if failures == 0 else 1\n\nif __name__ == \"__main__\":\n    sys.exit(main())"
            ),
            part(
              "Variables, functions and the loop",
              "Explains why the check is a function (testable in isolation, reused per host), why timeout/path/file are variables or arguments (change without editing logic; cron and CI can pass different values), and why the loop accumulates a count rather than exiting on the first failure (report every host in one run).",
              "check() does one thing -- test a host -- so it can be unit-tested with a fake and reused anywhere; main() owns the loop and the summary. Timeout, hosts file and path live in variables set from arguments, so CI can use a 2-second timeout and cron a longer one without touching code. The loop keeps going after a failure and counts, because an on-call engineer wants the whole picture in one run; the exit code at the end is what the scheduler or pipeline keys off."
            ),
            part(
              "Testing",
              "Describes unit tests that stub the HTTP call (monkeypatch urlopen / a mock) to return 200, 503 and a connection error and assert the (ok, reason) results and exit code; an integration test against a local stub server; a lint/static check (pyflakes/ruff, shellcheck for Bash); and running the tests in the CI pipeline on every change.",
              "Unit tests with pytest: monkeypatch urllib.request.urlopen to return an object with status 200 (expect (True, 'HTTP 200')), to raise HTTPError(503) (expect False), and to raise URLError (expect 'unreachable'); test main() with a temp hosts file containing a comment and blank line and assert the exit code is 1 when any host fails. Integration: start a tiny local HTTP server that returns 200 on /health and 500 on another port, point the script at both. Static checks: ruff/pyflakes (shellcheck if it were Bash). All of this runs in the CI job so a change that breaks parsing or error handling fails the build."
            ),
            part(
              "Maintenance",
              "Keeps the script in version control with a README/usage header, pins the interpreter version, avoids external dependencies (or pins them in a requirements file), logs to stdout/stderr for the scheduler to capture, versions releases (semantic versioning tags), and documents the exit codes.",
              "Store it in the ops repository with a usage comment at the top and a short README; tag releases (v1.0.0, v1.1.0 when a new option is added, v2.0.0 if the output format changes incompatibly). Standard library only, so there is nothing to pin; if a dependency is added later, pin it in requirements.txt. Print to stdout/stderr (no log files) so cron, systemd and CI capture output the same way. Document exit codes (0 all healthy, 1 some failed, 2 bad arguments) so callers can rely on them."
            ),
          ],
        },
      ],
    },
    {
      slug: "code-lifecycle-errors-case",
      objective: "Troubleshooting the code life cycle: syntax errors, runtime errors, and merge conflicts",
      kind: "case",
      title: "Fix three failures between commit and deploy",
      brief:
        "You maintain the deployment automation for Halvorsen Media's content platform. Over one morning three things go wrong in the pipeline that deploys the 'cms' service. For each, read the output, say what kind of error it is, fix it, and say what would have caught it earlier.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "The first pipeline run fails before any job starts:\n\nError: .github/workflows/deploy.yml (Line: 14, Col: 1): while scanning for the next token found character '\\t' that cannot start any token\n\nLines 12-15 of the file:\n    steps:\n      - uses: actions/checkout@v4\n\t  - name: Install dependencies\n        run: npm ci",
          ask: "What kind of error is this, what exactly is wrong, and how do you fix and prevent it?",
          parts: [
            part(
              "Classifying and fixing",
              "Identifies a syntax error in the YAML (a tab character at line 14 where YAML requires spaces for indentation), fixes it by replacing the tab with the correct number of spaces so the list item aligns with the previous '- uses' entry, and notes nothing executed, which is how syntax errors differ from runtime errors.",
              "A syntax error: YAML forbids tabs for indentation, and line 14 starts with a tab, so the parser stops before the workflow runs at all. Fix: replace the leading tab with spaces so '- name: Install dependencies' lines up under '- uses: actions/checkout@v4' (six spaces in this file). Because the file could not be parsed, no job ran -- the error is in the text, not in the behavior."
            ),
            part(
              "Catching it earlier",
              "Adds a YAML linter (yamllint or the pipeline tool's validator) to a pre-commit hook and to the CI lint stage, and configures the editor to insert spaces for YAML (editorconfig), so the tab never reaches the repository.",
              "Run yamllint (or actionlint for GitHub Actions) as a pre-commit hook and as the first CI stage, so a tab fails locally before the push. Add an .editorconfig with indent_style = space for *.yml so editors do not insert tabs in the first place."
            ),
          ],
        },
        {
          text:
            "With the YAML fixed, the deploy job runs and fails partway:\n\nTraceback (most recent call last):\n  File \"/opt/deploy/deploy.py\", line 41, in <module>\n    main()\n  File \"/opt/deploy/deploy.py\", line 31, in main\n    region = os.environ[\"CMS_REGION\"]\n  File \"<frozen os>\", line 714, in __getitem__\nKeyError: 'CMS_REGION'\n\nLines 29-32 of deploy.py:\n    bucket = os.environ[\"CMS_BUCKET\"]\n    region = os.environ[\"CMS_REGION\"]\n    client = make_client(region)\n\nA colleague confirms CMS_REGION was renamed to DEPLOY_REGION in the pipeline's variables last week.",
          ask: "What kind of error is this and why did the parser not catch it? Fix it so the failure is clear next time.",
          parts: [
            part(
              "Classifying the error",
              "Identifies a runtime error: the file is syntactically valid and ran, then failed on a value only known at run time -- os.environ['CMS_REGION'] raised KeyError because the variable was renamed to DEPLOY_REGION in the pipeline; explains that a parser or linter cannot know what the environment will contain.",
              "A runtime error, not a syntax error: Python parsed deploy.py and executed it up to line 31, where the lookup of the environment variable CMS_REGION raised KeyError because that variable no longer exists -- the pipeline now sets DEPLOY_REGION. No parser or linter can catch it: the code is well formed, and whether the environment has the variable is only known when the job runs."
            ),
            part(
              "Fix for a clear failure",
              "Reads DEPLOY_REGION, validates required variables up front and exits with a clear message naming the missing one (for example a small function that checks a list of required names), and adds a test that runs the script with a missing variable and asserts the message; updates documentation of required variables.",
              "At the top of main():\n    REQUIRED = [\"CMS_BUCKET\", \"DEPLOY_REGION\"]\n    missing = [k for k in REQUIRED if not os.environ.get(k)]\n    if missing:\n        sys.exit(f\"deploy: missing required environment variables: {', '.join(missing)}\")\n    region = os.environ[\"DEPLOY_REGION\"]\nThen the next rename fails in one obvious line instead of a traceback. Add a unit test that runs main() with DEPLOY_REGION unset and asserts the exit message, and list the required variables in the README and the pipeline template so a rename is a reviewed change in both places."
            ),
          ],
        },
        {
          text:
            "Later, merging the release branch into main stops with:\n\n$ git merge release/2026.11\nAuto-merging deploy/values.yaml\nCONFLICT (content): Merge conflict in deploy/values.yaml\nAutomatic merge failed; fix conflicts and then commit the result.\n\n$ sed -n 20,28p deploy/values.yaml\nreplicas:\n<<<<<<< HEAD\n  count: 4\n  maxSurge: 1\n=======\n  count: 6\n  strategy: rolling\n>>>>>>> release/2026.11\n\nThe release notes say the release raised replicas to 6 and added the strategy key; the maxSurge setting on main was added yesterday by the platform team and must stay.",
          ask: "Resolve the conflict correctly and describe how the team avoids these.",
          parts: [
            part(
              "Resolving",
              "Explains the markers (HEAD = main's version, after ======= = the incoming branch), produces a merged block that keeps both intended changes (count: 6, maxSurge: 1, strategy: rolling) with all markers removed, then git add deploy/values.yaml and git commit (or git merge --continue); validates the YAML before committing.",
              "Between <<<<<<< HEAD and ======= is main's version; between ======= and >>>>>>> release/2026.11 is the release branch's. Neither side alone is right: the merged block should be\nreplicas:\n  count: 6\n  maxSurge: 1\n  strategy: rolling\nwith every marker line deleted. Then yamllint deploy/values.yaml, git add deploy/values.yaml, git merge --continue (or git commit), and let the pipeline deploy. Never resolve by picking 'ours' or 'theirs' blindly when both sides carry intended changes."
            ),
            part(
              "Avoiding merge conflicts",
              "Smaller, shorter-lived branches merged often; rebase or merge main into the feature branch regularly; one logical change per commit; avoid two teams editing the same lines (structure config so platform and app settings live in different files or sections); CI runs on the merge result; a branching strategy the team agrees on (trunk-based or GitHub Flow).",
              "Keep branches short-lived and merge main into them (or rebase) daily so conflicts are small and fresh in someone's mind. Split values.yaml so platform-owned settings (maxSurge) and release-owned settings (count, strategy) live in separate files or clearly separate sections. Use a trunk-based or GitHub Flow strategy with pull requests, where CI builds the merge result and a reviewer sees conflicts before they reach main. Tag releases with semantic versions so a deployment can be traced to one commit."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // System Configuration (25%) -- 3 labs
    // -----------------------------------------------------------------------
    {
      slug: "configuration-drift-ansible-case",
      objective: "Configuration management techniques: drift detection, remediation, and state management",
      kind: "case",
      title: "Detect and remediate configuration drift across a server fleet",
      brief:
        "Pelham Analytics manages 40 Linux web servers with Ansible from a Git repository; the playbook enforces the SSH daemon settings, the time servers and the monitoring agent. The security team suspects some servers no longer match the standard. You run the playbook in check mode first.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "$ ansible-playbook -i inventory/prod site.yml --check --diff --limit web\n\nTASK [sshd : Enforce sshd_config] ***************************************\n--- before: /etc/ssh/sshd_config\n+++ after: /etc/ssh/sshd_config\n@@ -12,1 +12,1 @@\n-PasswordAuthentication yes\n+PasswordAuthentication no\nchanged: [web07]\nchanged: [web19]\nchanged: [web33]\nok: [web01] ... (37 hosts ok)\n\nTASK [chrony : Configure time servers] **********************************\nok: 40 hosts\n\nTASK [monitoring : Ensure agent running] ********************************\nchanged: [web19]\n\nPLAY RECAP ***************************************************************\nweb07   : ok=11  changed=1  unreachable=0  failed=0\nweb19   : ok=10  changed=2  unreachable=0  failed=0\nweb33   : ok=11  changed=1  unreachable=0  failed=0\n(37 hosts: ok=12 changed=0)",
          ask: "What has this run told you, what has it changed, and what do you do with the result?",
          parts: [
            part(
              "Reading check mode",
              "Explains that --check reports what would change without changing anything (changed= in check mode means 'would change'), and --diff shows the exact difference: three hosts have PasswordAuthentication yes (drift from the desired 'no'), and on web19 the monitoring agent is not running; the other 37 match the declared state.",
              "Nothing was modified: check mode predicts. It found drift on three of forty hosts -- web07, web19 and web33 have PasswordAuthentication yes where the standard says no -- and web19's monitoring agent is also stopped. The diff is the evidence for the security team. The 37 hosts reporting changed=0 are already in the desired state, which is the whole point of declaring state rather than scripting steps."
            ),
            part(
              "Next step",
              "Investigates briefly how the drift happened (who edited sshd_config on those hosts: auth logs, shell history, change tickets) and then remediates by running the playbook for real against the drifted hosts (or all), expecting changed=1/2 on exactly those three and changed=0 elsewhere.",
              "Check the three hosts' auth logs and sudo history for who changed sshd_config and when -- drift usually means a manual fix during an incident that never made it back into code. Then remediate: ansible-playbook -i inventory/prod site.yml --limit web (optionally --limit web07,web19,web33). Expect exactly those three to report changed and the sshd handler to reload the service; everything else stays changed=0."
            ),
          ],
        },
        {
          text:
            "$ ansible-playbook -i inventory/prod site.yml --limit web\n...\nRUNNING HANDLER [sshd : reload sshd] ***********************************\nchanged: [web07]\nchanged: [web19]\nchanged: [web33]\n\nPLAY RECAP ***************************************************************\nweb07   : ok=12  changed=2  unreachable=0  failed=0\nweb19   : ok=11  changed=3  unreachable=0  failed=0\nweb33   : ok=12  changed=2  unreachable=0  failed=0\n(37 hosts: ok=12 changed=0)\n\n$ ansible-playbook -i inventory/prod site.yml --limit web\nPLAY RECAP ***************************************************************\n(40 hosts: ok=12 changed=0 unreachable=0 failed=0)\n\nThe auth log on web07 shows an engineer enabled password authentication two weeks ago 'temporarily' to let a contractor in without a key.",
          ask: "Interpret the two runs, especially the second, and address the cause.",
          parts: [
            part(
              "Idempotency and the second run",
              "Explains the first real run changed only the drifted settings (plus the handler reload), and the second run's changed=0 across all 40 hosts demonstrates idempotency -- applying the same declared state again does nothing -- which is how you prove the fleet now matches the code.",
              "Run one fixed the drift: the config task changed on three hosts and its handler reloaded sshd on exactly those three (the extra 'changed' in each recap). Run two is the proof: changed=0 everywhere means every host already equals the desired state, and re-applying does no work. That idempotency is what makes it safe to run the playbook on a schedule -- it only acts when reality differs from the declaration."
            ),
            part(
              "Addressing the cause",
              "Treats the manual change as the process failure: the contractor should have been given a key (or an account through the normal role), and any genuine exception must be made in the code (a host variable in the repo with an expiry) through a pull request, not by hand on the box; explains the repo is the single source of truth for state.",
              "The engineer solved a real problem the wrong way. Give the contractor an SSH key and a user through the users role in the playbook. If an exception is ever justified, it goes into the repository -- for example a host_vars entry sshd_password_auth: true with a comment and a review date -- via a pull request, so the exception is visible, reviewed and later removed by changing code. State lives in Git; a hand edit on a server is a bug by definition."
            ),
          ],
        },
        {
          text: "Management asks how they will know within a day if anyone hand-edits a server again, without someone remembering to run the playbook.",
          ask: "Design the ongoing drift detection and remediation.",
          parts: [
            part(
              "Continuous drift control",
              "Schedules the playbook (check-mode run that reports/alerts on any 'changed', and/or an enforcing run) on a timer or from the CI/automation server daily, optionally with ansible-pull on each host; makes 'changed > 0' in a scheduled run an alert; stores the reports; and tightens access so routine edits need the pipeline (limit sudo, audit logging).",
              "Run site.yml --check --diff every night from the automation server (or AWX/Tower / a CI schedule) against all hosts and alert the on-call channel when any host reports changed > 0, attaching the diff; follow it with an enforcing run in a maintenance window, or run enforce nightly and alert on what it corrected. Alternatively ansible-pull on each host every hour from the repository. Keep the recap output as a compliance record. Reduce the temptation: restrict interactive sudo on production web servers and forward auth logs so a hand edit is itself an alert."
            ),
          ],
        },
      ],
    },
    {
      slug: "rest-crud-with-curl",
      objective: "REST API operations: create, read, update, and delete (CRUD) using APIs and associated tools",
      kind: "build",
      title: "Drive an inventory API through CRUD with curl",
      brief:
        "Ridgeback Hosting's internal inventory service exposes a REST API at https://inventory.ridgeback.internal/v1 with a 'servers' resource. It authenticates with a bearer token held in the environment variable INV_TOKEN and speaks JSON. You need to: create a server record {\"name\": \"web42\", \"env\": \"prod\", \"cpu\": 4}; read it back by its id; change only its cpu to 8; and delete it. For each call write the curl command, the HTTP method, the expected success status code, and what a 404 or 409 would mean. Also say which of these calls are safe to retry automatically and why.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the four calls with methods, headers, bodies and expected responses, then the idempotency analysis.",
          parts: [
            part(
              "Create",
              "POST to the collection URL with Content-Type: application/json, Authorization: Bearer $INV_TOKEN and the JSON body; expects 201 Created with the new record (and typically a Location header or id in the body); notes a 409 would mean a conflict such as a duplicate name, 400 a malformed body, 401 a bad token.",
              "curl -sS -X POST https://inventory.ridgeback.internal/v1/servers \\\n  -H \"Authorization: Bearer $INV_TOKEN\" -H \"Content-Type: application/json\" \\\n  -d '{\"name\":\"web42\",\"env\":\"prod\",\"cpu\":4}'\nExpect 201 Created and a body like {\"id\": 917, \"name\": \"web42\", ...} (often with Location: /v1/servers/917). 409 Conflict would mean a server named web42 already exists; 400 a bad body; 401 the token is missing or expired; 403 the token lacks the right."
            ),
            part(
              "Read",
              "GET the item URL (/servers/917) with the Authorization header, expecting 200 OK and the JSON record; a 404 means no such id; optionally pipes to jq to extract fields.",
              "curl -sS https://inventory.ridgeback.internal/v1/servers/917 -H \"Authorization: Bearer $INV_TOKEN\" | jq .\nExpect 200 OK with the record. 404 Not Found: no server with id 917 (deleted, or the id was mistyped). GET has no body and changes nothing."
            ),
            part(
              "Update",
              "Uses PATCH with a partial body {\"cpu\": 8} to change one field (or PUT with the full representation if the API only supports PUT, explaining PUT replaces the whole resource); expects 200 OK (or 204 No Content); 404 if the id is gone, 409/412 if the API uses optimistic concurrency and the record changed.",
              "curl -sS -X PATCH https://inventory.ridgeback.internal/v1/servers/917 \\\n  -H \"Authorization: Bearer $INV_TOKEN\" -H \"Content-Type: application/json\" \\\n  -d '{\"cpu\":8}'\nExpect 200 OK with the updated record (some APIs return 204 No Content). PATCH changes only the fields sent; a PUT would need the full object {\"name\":\"web42\",\"env\":\"prod\",\"cpu\":8} because PUT replaces the resource. 404 means the record no longer exists; 409 or 412 means a concurrency check failed because someone else changed it first."
            ),
            part(
              "Delete, and what is safe to retry",
              "DELETE the item URL expecting 204 No Content (or 200); a later 404 is expected and harmless. Idempotency: GET, PUT and DELETE are idempotent (repeating yields the same end state), so they are safe to retry on a timeout; POST is not (a retry can create a duplicate), so retries need an idempotency key or a prior GET to check; PATCH is idempotent for a set operation like cpu=8 but not for relative changes.",
              "curl -sS -X DELETE https://inventory.ridgeback.internal/v1/servers/917 -H \"Authorization: Bearer $INV_TOKEN\" -w '%{http_code}\\n'\nExpect 204 No Content. Running it again returns 404, which is fine -- the record is gone either way. Retry safety: GET, PUT and DELETE are idempotent, so an automated retry after a timeout cannot make things worse. POST is not: if the first request succeeded but the response was lost, a retry creates a second web42 (hence the 409), so a script should either send an Idempotency-Key header if the API supports one or GET /servers?name=web42 before retrying. This PATCH sets an absolute value (cpu=8), so repeating it is harmless; a PATCH like 'add 4 cpu' would not be."
            ),
          ],
        },
      ],
    },
    {
      slug: "api-tls-auth-config-errors-case",
      objective: "Troubleshooting configuration issues: API communication failures, certificate problems, and configuration-file syntax errors",
      kind: "case",
      title: "Clear three configuration failures in a deployment job",
      brief:
        "A nightly job at Tamarind Logistics calls the internal inventory API, then the cloud provider's API, driven by a JSON settings file. Tonight it failed three times in a row, each time for a different reason. Read each error, name the kind of problem, and fix it properly -- not by disabling checks.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "$ curl -sS https://inventory.tamarind.internal/v1/servers\ncurl: (60) SSL certificate problem: unable to get local issuer certificate\nMore details here: https://curl.se/docs/sslcerts.html\n\n$ openssl s_client -connect inventory.tamarind.internal:443 -servername inventory.tamarind.internal </dev/null 2>/dev/null | openssl x509 -noout -issuer -dates\nissuer=CN = Tamarind Internal CA\nnotBefore=Sep  1 00:00:00 2026 GMT\nnotAfter=Sep  1 00:00:00 2027 GMT",
          ask: "What is wrong, and what is the right fix for an automated job?",
          parts: [
            part(
              "Diagnosis",
              "Identifies a certificate trust problem: the server's certificate is valid (dates fine) but issued by the company's internal CA, which the job's host does not have in its trust store, so curl cannot build a chain to a trusted root.",
              "The certificate itself is fine -- issued by 'Tamarind Internal CA', valid until September 2027. The job's machine simply does not trust that CA: it is not in the system trust store, so curl cannot verify the chain and refuses (error 60). Nothing is wrong with the server."
            ),
            part(
              "The right fix",
              "Installs the internal CA certificate into the host's trust store (update-ca-trust on RHEL-family, update-ca-certificates on Debian-family, or the container image's equivalent) or passes --cacert /path/to/tamarind-ca.pem; explicitly rejects curl -k / verify=False as it disables the protection; checks intermediate certificates are served by the server.",
              "Add the internal CA to the trust store on the job host: copy tamarind-ca.crt to /etc/pki/ca-trust/source/anchors/ and run update-ca-trust (RHEL/Rocky), or to /usr/local/share/ca-certificates/ and run update-ca-certificates (Debian/Ubuntu); in a container, bake it into the image. For a one-off, curl --cacert /etc/ssl/tamarind-ca.pem works. Do not use -k or --insecure: that turns off verification and makes a man-in-the-middle invisible. If the server should present an intermediate certificate, make sure its chain file includes it."
            ),
          ],
        },
        {
          text:
            "With trust fixed, the next call fails:\n\n$ curl -sS -i https://api.cloudprovider.example/v2/instances -H \"Authorization: Bearer $CLOUD_TOKEN\"\nHTTP/2 401\ncontent-type: application/json\n{\"error\":\"invalid_token\",\"error_description\":\"The access token expired\"}\n\n$ timedatectl | grep -E 'Local time|synchronized'\n               Local time: Fri 2026-11-06 23:58:10 UTC\nSystem clock synchronized: no\n\nThe token was minted by the job's service account 55 minutes ago and tokens last 60 minutes.",
          ask: "Why is this failing, and how do you make the job robust to it?",
          parts: [
            part(
              "Diagnosis",
              "Reads 401 with 'token expired' as an authentication failure (not authorization, which would be 403), and spots that the host's clock is not synchronized -- a skewed clock makes tokens appear expired early (or not yet valid) -- combined with a token minted too close to its lifetime for a long-running job.",
              "401 means the request was not authenticated: the provider says the bearer token has expired. Two contributing causes: the token was already 55 minutes into a 60-minute life when the job reached this step, and the host's clock is not synchronized, so if it runs even a few minutes fast the provider sees a token past its expiry while the job thinks it has time left. (A 403 would have meant a valid identity without permission.)"
            ),
            part(
              "Robust fix",
              "Fixes time sync (enable chrony/NTP, confirm synchronized: yes), has the job obtain a fresh token at the start of the API phase (or refresh on 401 once) rather than reusing one from earlier, uses short-lived credentials issued at run time (workload identity/OIDC) instead of long-lived secrets, and handles 401 explicitly with a single re-auth and clear error.",
              "Enable and verify time synchronization (systemctl enable --now chronyd; chronyc tracking; timedatectl shows synchronized: yes) -- tokens, TLS and logs all depend on it. Change the job to request its token immediately before the cloud API calls, and on a 401 refresh once and retry, then fail with a clear message. Prefer the provider's workload identity federation (OIDC from the CI system or a VM identity) so the job gets short-lived credentials at run time and no long-lived key is stored at all."
            ),
          ],
        },
        {
          text:
            "Finally the job reads its settings file and aborts:\n\n$ python3 --version\nPython 3.12.3\n$ python3 -c 'import json,sys; json.load(open(\"settings.json\"))'\nTraceback (most recent call last):\n  ...\njson.decoder.JSONDecodeError: Expecting property name enclosed in double quotes: line 7 column 3 (char 142)\n\n$ sed -n 4,8p settings.json\n  \"region\": \"us-west-2\",\n  \"instances\": 3,\n  \"notify\": [\"ops@tamarind.example\"],\n  }\n}",
          ask: "What is the syntax problem, how do you fix it, and how does the team stop hand-edited config files breaking the job?",
          parts: [
            part(
              "The syntax error",
              "Identifies a trailing comma after the last property (\"notify\": [...],) before the closing brace, which JSON does not allow (unlike many languages), at line 7; removes the comma; validates with jq . settings.json or python -m json.tool.",
              "JSON does not permit a trailing comma after the last member of an object. Line 6 ends with a comma and line 7 is the closing brace, so the parser expected another \"property\": and found }. (Python 3.13 and later name it directly: 'Illegal trailing comma before end of object', pointing at the comma on line 6.) Delete the comma after the notify array. Validate: jq . settings.json (prints the document if valid, an error with the line if not) or python3 -m json.tool settings.json."
            ),
            part(
              "Preventing config breakage",
              "Puts configuration files under version control with a validation step (jq/yamllint/JSON schema) in pre-commit and in the pipeline, generates configs from templates rather than hand-editing, keeps secrets out of them, and fails fast with a clear message in the job when a file does not parse.",
              "Treat settings.json like code: it lives in the repository, every change is a pull request, and a pre-commit hook plus a CI step run jq (and a JSON Schema check for required keys and types) so an invalid file cannot merge. Generate environment-specific files from a template with a tool rather than editing by hand. In the job, parse the file first and exit with 'settings.json invalid at line 7' before touching any API. Keep tokens out of the file -- they come from the secret store or workload identity."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Continuous Integration (24%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "github-actions-pipeline-definition",
      objective: "Configuring basic automation pipelines: hooks, triggers, and pipeline definitions in tools such as Jenkins or GitHub Actions",
      kind: "build",
      title: "Define a CI pipeline for a Node.js service",
      brief:
        "Foxglove Software's 'orders-api' (Node.js) lives in a Git repository on a platform that runs GitHub Actions. The team wants: on every pull request to main, run lint and the unit tests; on every push to main, additionally build a container image and push it to the company registry using a stored credential; the build must only run if lint and tests passed; two pushes to main in quick succession should not deploy out of order; and developers want a local pre-commit check so obvious lint failures never reach CI. Write the workflow and explain the hook.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the workflow YAML with its triggers, jobs and dependencies, show how the secret is used, and describe the pre-commit hook.",
          parts: [
            part(
              "Triggers",
              "Uses on: pull_request (branches: [main]) and on: push (branches: [main]); conditions the build/push job on the event being a push to main (if: github.event_name == 'push'), and uses a concurrency group so runs on main queue/cancel rather than overlap.",
              "name: ci\non:\n  pull_request:\n    branches: [main]\n  push:\n    branches: [main]\nconcurrency:\n  group: ci-${{ github.ref }}\n  cancel-in-progress: false\nThe pull_request trigger covers review-time checks; push to main covers the merge. The concurrency group keyed on the branch makes two quick pushes to main run one after another (cancel-in-progress false keeps both, in order) so an older build cannot finish after a newer one."
            ),
            part(
              "Jobs and dependencies",
              "Defines a test job (checkout, setup-node, npm ci, npm run lint, npm test) and a build job with needs: [test] and an if: on push to main, so the build never runs on a failed test and never on a pull request; pins action versions.",
              "jobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: 20, cache: npm }\n      - run: npm ci\n      - run: npm run lint\n      - run: npm test\n  build:\n    needs: [test]\n    if: github.event_name == 'push' && github.ref == 'refs/heads/main'\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: docker build -t registry.foxglove.internal/orders-api:${{ github.sha }} .\n      - run: echo \"${{ secrets.REGISTRY_TOKEN }}\" | docker login registry.foxglove.internal -u ci --password-stdin\n      - run: docker push registry.foxglove.internal/orders-api:${{ github.sha }}\nneeds: makes build wait for test and skip when it fails; the if: keeps image builds off pull requests."
            ),
            part(
              "Secrets",
              "Stores the registry credential as a repository/environment secret (settings, not in the file), references it as ${{ secrets.REGISTRY_TOKEN }}, passes it via --password-stdin or an env var rather than a command-line argument, notes the runner masks it in logs, and restricts it to the main branch via an environment if available.",
              "REGISTRY_TOKEN is created in the repository's (or an 'production' environment's) secrets settings, never in the YAML or the repo. It is referenced as ${{ secrets.REGISTRY_TOKEN }} and fed to docker login on stdin so it does not appear in the process list; the runner masks the value in logs. Scoping the secret to an environment that only the main branch can use means a pull request from a fork cannot reach it. Rotate it on a schedule and when anyone with access leaves."
            ),
            part(
              "The pre-commit hook",
              "Installs a Git pre-commit hook (via the pre-commit framework or husky/lint-staged for Node) that runs the linter on staged files and blocks the commit on failure; notes hooks are local and bypassable (--no-verify), which is why CI still runs lint.",
              "Add husky with lint-staged (or the pre-commit framework): on git commit, the hook runs eslint on the staged *.js/*.ts files and refuses the commit if lint fails, so the developer fixes it before pushing. Document 'npm install' installs the hook. Hooks run only on the developer's machine and can be skipped with --no-verify, so they are a convenience, not a control -- the CI lint step remains the gate."
            ),
          ],
        },
      ],
    },
    {
      slug: "leaked-secret-and-artifact-strategy",
      objective: "CI environment factors: secrets management, artifact management, and task runners",
      kind: "build",
      title: "Clean up a leaked credential and set the CI environment right",
      brief:
        "During a code review at Larchwood Analytics, you find that config/prod.yml in the 'etl-runner' repository contains a cloud access key and secret for the production storage account, committed four months ago. The same repository builds a container image on every push with the tag 'latest', and the deployment job re-builds the image from source on the production host. Developers run builds with a mix of personal shell aliases and copied commands. Write the response and the new standard for secrets, artifacts and task running.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the incident response for the leaked key, then the standard: where secrets live, how artifacts are built and promoted, and how tasks are run.",
          parts: [
            part(
              "Responding to the leaked key",
              "Rotates first: creates a new key, updates the consumers, then revokes the exposed key (so nothing breaks in between), checks the provider's access logs for use of the old key since the commit, removes the file from the current tree and from history (filter-repo/BFG) while knowing history rewriting is secondary to rotation, and adds secret scanning.",
              "1) Treat it as compromised regardless of whether the repo is private. 2) Issue a new access key for the storage account and put it in the secret store, update the ETL runner to use it, confirm it works, then disable and delete the old key -- rotate before revoke so production does not break. 3) Review the storage account's access logs for the last four months for unexpected use of the old key. 4) Remove the credential from config/prod.yml, and purge it from history with git filter-repo (or BFG) and force-push, telling everyone to re-clone -- useful hygiene, but the key must be considered leaked anyway. 5) Turn on secret scanning and a pre-commit secret detector so this cannot be committed again."
            ),
            part(
              "Where secrets live",
              "Secrets are injected at run time from a secret manager or the CI platform's secret store (never in the repo or image), referenced by name in pipeline definitions, scoped by environment with least privilege, rotated regularly, and preferably replaced with short-lived credentials via workload identity/OIDC.",
              "The pipeline reads secrets from the CI platform's secret store or a secret manager (vault-style) at run time, by name; config/prod.yml keeps only non-secret settings and the names of the secrets to fetch. Each environment has its own secrets with the minimum rights (the ETL runner gets write on its one bucket, nothing else). Where the cloud supports it, replace the stored key entirely with workload identity federation so the job gets a short-lived token per run. Access to production secrets is limited to the production environment's protected pipelines, and rotation is on a calendar."
            ),
            part(
              "Artifact management",
              "Build once, in CI, producing an immutable artifact (container image) tagged with a unique version (semantic version plus commit SHA), store it in an artifact/container registry, and promote that same artifact through test to production; stop rebuilding on the production host and stop deploying 'latest', which is mutable and untraceable; retain and scan artifacts.",
              "CI builds the image exactly once per commit and tags it immutably -- registry/etl-runner:1.4.2 and registry/etl-runner:1.4.2-<shortsha> -- and pushes it to the artifact registry. Test and production deploy that exact tag; promotion is a metadata step, not a rebuild. Never rebuild on the production host (different base layers and dependencies produce a different binary than what was tested) and never deploy :latest (it moves, so nobody can say what is running or roll back to it). Keep a retention policy and vulnerability scanning on the registry."
            ),
            part(
              "Task runners",
              "Replaces personal aliases with a committed task runner (Makefile, package.json scripts, Invoke/Taskfile) that defines lint, test, build, publish the same way for developers and CI, so the pipeline calls the same targets developers run locally; documents the targets.",
              "Add a Makefile (or Taskfile/npm scripts) to the repo with targets lint, test, build, push, deploy; each is the single definition of how that step is done. Developers run make test; the pipeline runs the same make test, so 'works on my machine' goes away and CI changes are code reviews. Document the targets in the README and make the task runner the only supported entry point."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Continuous Delivery (20%) -- 1 lab
    // -----------------------------------------------------------------------
    {
      slug: "deployment-strategy-per-service",
      objective: "Continuous delivery techniques: canary, blue-green, rolling, and in-place deployment strategies",
      kind: "build",
      title: "Choose a deployment strategy for each of three services",
      brief:
        "Cobalt Ferry Lines runs three services. (1) The payments API: two instances behind a load balancer; any downtime is unacceptable and a bad release must be reversible within a minute; it has a database schema that occasionally changes. (2) The mobile backend: 200 stateless instances behind a load balancer; the team wants to limit the blast radius of a bad release and has good metrics (error rate, p95 latency) with an SLO of 99.9% success. (3) A legacy report generator: one instance, runs batch jobs overnight, has a documented maintenance window at 03:00 and no load balancer. Choose and justify a strategy for each, including how a rollback happens and how you would know a release is bad.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each service: the strategy, why it fits, the concrete rollout steps, and the rollback and health signals.",
          parts: [
            part(
              "Payments API",
              "Chooses blue-green: deploy the new version to an idle identical environment (green), run checks, switch the load balancer/DNS to it, keep blue running for fast rollback by switching back; addresses the schema change with backward-compatible (expand/contract) migrations so both versions work during the switch.",
              "Blue-green. Stand up the new release as 'green' beside the live 'blue', warm it up and run smoke tests against it directly, then flip the load balancer target group to green -- zero downtime, and rollback is flipping back to blue, well under a minute. Schema changes must be backward compatible (expand first: add nullable columns or new tables; contract later once blue is retired) so blue and green can both run against the database during the switch and a rollback never needs a schema downgrade."
            ),
            part(
              "Mobile backend",
              "Chooses a canary release: route a small slice (for example 5% = 10 of 200 instances) to the new version, watch error rate and p95 latency against the SLO and the control group for a set period, then widen (25%, 50%, 100%) or abort; uses automated analysis where possible; rollback is shifting the canary's traffic/instances back.",
              "Canary. Deploy the new version to 5% of the fleet -- 10 of the 200 instances -- and send them normal traffic. Compare the canary's error rate and p95 latency with the other 190 for, say, 15 minutes: if the canary's success rate drops below 99.9% or latency regresses beyond the agreed threshold, roll the 10 back to the old version and stop. Otherwise step to 25% (50 instances), 50% (100) and 100%, repeating the check each time. The blast radius of a bad release is a few percent of users, and the rollback is small and fast. (A rolling update with maxUnavailable/maxSurge is the fallback if traffic splitting is not available, but it lacks the controlled comparison.)"
            ),
            part(
              "Legacy report generator",
              "Chooses an in-place deployment in the 03:00 maintenance window: stop the service, back up/snapshot, upgrade, start, verify a test job; rollback is restoring the previous package/snapshot; accepts the brief downtime because there is one instance and a window exists; notes the longer-term fix is to make it redundant.",
              "In-place, inside the documented 03:00 window, since there is one instance, no load balancer and no users at that hour. Steps: announce the window; confirm last night's batch finished; snapshot the VM (or keep the previous package); stop the service; install the new version; start it; run one test report and check the log; close the window. Rollback is reinstalling the previous version or reverting the snapshot. Longer term, containerize it or add a second node so it can move to a rolling or blue-green model."
            ),
            part(
              "Knowing a release is bad",
              "Defines health signals before deploying: error rate and latency against the SLO (99.9% success), key business transactions (payments completing), log error counts, synthetic checks; automates the abort/rollback where a threshold is crossed; and treats deployment as finished only after a soak period, with the pipeline recording version, time and metrics for the feedback loop.",
              "Decide the signals in advance: HTTP 5xx rate, p95 latency, payment-completion rate, exceptions in logs and a synthetic check per service, each with a threshold tied to the SLO (for the mobile backend, canary success below 99.9% is an automatic abort). The pipeline watches them during and for a soak period after each step and rolls back on breach without waiting for a human. Record which version went out when, with the metrics, so MTTR and change-failure rate can be tracked and fed back into the process."
            ),
          ],
        },
      ],
    },
  ],
};
