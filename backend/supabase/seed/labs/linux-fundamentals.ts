import { GENERAL_SAFETY, commandPart, matchPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-292: Linux Fundamentals (LINUXFUND), ten units, no certification.
// Hybrid density (docs/labs.md): one lab per unit plus six split evenly,
// which the plan gives to units 1-6: 2/2/2/2/2/2/1/1/1/1, 16 labs, one per
// objective. Commands are graded by shape where one command is the answer
// (lib/lab-interactive.ts: option order and clustering do not matter; a
// leading sudo is accepted as a separate form).
//
// Every command and option was checked against its man page on man7.org
// (or apt(8) on manpages.debian.org and the DNF command reference), read
// 2026-11-14. The shell behaviors quoted (quoting, globbing) were run in
// GNU bash on 2026-11-14. Command output shown in briefs is authored in
// each tool's layout; hosts, users and companies are fictional.

const D = "2026-11-14";

export const LINUXFUND_LABS: SeedLabSet = {
  trackCode: "LINUXFUND",
  sources: [
    source("https://man7.org/linux/man-pages/index.html", "reference", D),
    source("https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html", "reference", D),
    source("https://manpages.debian.org/trixie/apt/apt.8.en.html", "reference", D),
    source("https://manpages.debian.org/trixie/apt/sources.list.5.en.html", "reference", D),
    source("https://dnf.readthedocs.io/en/latest/command_ref.html", "reference", D),
  ],
  labs: [
    // ---- Unit 1: The shell & getting help (2) ----
    {
      slug: "linuxfund-quoting-predict",
      objective: "Apply quoting and escaping correctly with single quotes, double quotes and backslashes",
      kind: "build",
      title: "Predict what the shell does with your quotes",
      brief:
        "At Narrows Design (fictional) a new admin runs these in Bash, in a directory that contains a.log, b.log and c.txt, with name=\"Q3 report.txt\" already set:\n\n1. echo '$name'\n2. echo \"$name\"\n3. echo *.log\n4. echo \"*.log\"\n5. rm $name\n\nPredict each result and fix the last one.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the output of commands 1 to 4, then say what command 5 does and write it correctly.",
          parts: [
            part(
              "Outputs 1-4",
              "1 prints $name literally (single quotes stop expansion); 2 prints Q3 report.txt; 3 prints a.log b.log (the glob expands); 4 prints *.log literally (quotes stop globbing).",
              "1. $name  (single quotes keep every character literal)\n2. Q3 report.txt  (double quotes still expand variables)\n3. a.log b.log  (unquoted glob expands to matching files)\n4. *.log  (quoted, so no globbing)"
            ),
            part(
              "Command 5",
              "Explains that the unquoted variable is split on the space into two arguments, Q3 and report.txt, so rm tries to delete two other files (and reports they do not exist or deletes the wrong ones); the fix is rm \"$name\" (or rm -- \"$name\").",
              "Unquoted, $name is split into two words, so rm receives Q3 and report.txt: it fails with \"No such file or directory\" or, worse, deletes unrelated files with those names. rm \"$name\" passes one argument, Q3 report.txt. Quote variables unless you want word splitting."
            ),
          ],
        },
      ],
    },
    {
      slug: "linuxfund-command-substitution",
      objective: "Write command lines that use variables, globbing and command substitution",
      kind: "build",
      title: "Name a backup after today's date",
      brief:
        "Bonney Lake Library (fictional) copies its catalog export /srv/export/catalog.csv to /srv/backup/ every morning by hand. They want the copy named with the date in YYYY-MM-DD form, for example catalog-2026-11-14.csv, and they want to know how many .csv files are in /srv/backup afterward.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the copy command and the counting command.",
          parts: [
            commandPart(
              "Copy with the date",
              "cp with command substitution $(date +%F) inside the destination name, double-quoted or not, is met.",
              "cp /srv/export/catalog.csv \"/srv/backup/catalog-$(date +%F).csv\"\n$(date +%F) runs date and puts its output, such as 2026-11-14, into the name; %F is the same as %Y-%m-%d.",
              {
                accepted: [
                  "cp /srv/export/catalog.csv \"/srv/backup/catalog-$(date +%F).csv\"",
                  "cp /srv/export/catalog.csv /srv/backup/catalog-$(date +%F).csv",
                  "cp /srv/export/catalog.csv \"/srv/backup/catalog-$(date +%Y-%m-%d).csv\"",
                  "cp /srv/export/catalog.csv /srv/backup/catalog-$(date +%Y-%m-%d).csv",
                ],
                prompt: "$",
              }
            ),
            part(
              "Count the files",
              "Uses a glob with a counter, e.g. ls /srv/backup/*.csv | wc -l, or find /srv/backup -maxdepth 1 -name '*.csv' | wc -l, and notes the glob is expanded by the shell before ls runs.",
              "ls /srv/backup/*.csv | wc -l\nThe shell expands *.csv into the list of matching names, ls prints one per line when piped, and wc -l counts lines. find /srv/backup -maxdepth 1 -name '*.csv' | wc -l avoids an error when there are no matches."
            ),
          ],
        },
      ],
    },
    // ---- Unit 2: Files, directories & the filesystem hierarchy (2) ----
    {
      slug: "linuxfund-find-rules",
      objective: "Locate files by name, type, size, age and owner with find",
      kind: "build",
      title: "Find exactly the files the ticket asks for",
      brief:
        "A ticket at Fircrest Engineering (fictional) asks three questions about the file server: (1) which regular files under /srv/projects are larger than 500 MB; (2) which files under /var/log ending in .gz were modified more than 90 days ago; (3) which files under /home belong to the departed user jlee.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give one find command for each question.",
          parts: [
            commandPart(
              "(1) Files over 500 MB",
              "find /srv/projects -type f -size +500M is met (option order free).",
              "find /srv/projects -type f -size +500M\n-type f limits to regular files; -size +500M means more than 500 mebibytes.",
              { accepted: ["find /srv/projects -type f -size +500M", "find /srv/projects -size +500M -type f"], prompt: "$" }
            ),
            commandPart(
              "(2) Old compressed logs",
              "find /var/log -name '*.gz' -mtime +90 (quoted pattern, -type f optional) is met.",
              "find /var/log -name '*.gz' -mtime +90\nQuote the pattern so the shell does not expand it; -mtime +90 means modified more than 90 days ago.",
              {
                accepted: [
                  "find /var/log -name '*.gz' -mtime +90",
                  "find /var/log -type f -name '*.gz' -mtime +90",
                ],
                prompt: "$",
              }
            ),
            commandPart(
              "(3) Files owned by jlee",
              "find /home -user jlee is met.",
              "find /home -user jlee\nIf the account was already deleted, find /home -nouser lists files whose owner no longer exists.",
              { accepted: ["find /home -user jlee", "find /home -type f -user jlee"], prompt: "$" }
            ),
          ],
        },
      ],
    },
    {
      slug: "linuxfund-hard-vs-symlink",
      objective: "Create hard and symbolic links and explain the difference",
      kind: "case",
      title: "Which link survives?",
      brief:
        "At Sumner Sound Studio (fictional) an engineer runs, in /srv/audio:\n\nln master.wav master-hard.wav\nln -s master.wav master-soft.wav\nls -li\n\nThe listing shows master.wav and master-hard.wav with the same inode number and a link count of 2; master-soft.wav has its own inode and points to master.wav.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Someone then deletes master.wav with rm master.wav.",
          ask: "What happens to each link, and why?",
          parts: [
            part(
              "After the delete",
              "master-hard.wav still opens the full audio (the data stays while any hard link remains; the link count drops to 1); master-soft.wav is now dangling and fails with No such file or directory, because it stores only the path name.",
              "A hard link is another name for the same inode, so the data survives: master-hard.wav still plays and its link count is now 1. A symbolic link stores the path \"master.wav\", which no longer exists, so master-soft.wav is broken (ls shows it in red or with a broken target, and opening it fails)."
            ),
          ],
        },
        {
          text: "They now want a shortcut in /home/kai to the project folder /srv/audio on a different filesystem.",
          ask: "Which link type works, and what command makes it?",
          parts: [
            commandPart(
              "Link to a directory on another filesystem",
              "ln -s /srv/audio /home/kai/audio is met.",
              "ln -s /srv/audio /home/kai/audio\nOnly a symbolic link works: hard links cannot point to directories and cannot cross filesystems, because they name an inode within one filesystem.",
              { accepted: ["ln -s /srv/audio /home/kai/audio", "ln -s /srv/audio /home/kai/"], prompt: "$" }
            ),
          ],
        },
      ],
    },
    // ---- Unit 3: Text processing & pipelines (2) ----
    {
      slug: "linuxfund-log-pipeline",
      objective: "Build a pipeline that answers a question about a log file",
      kind: "build",
      title: "Top five addresses failing SSH logins",
      brief:
        "A security review at Orting Credit Union (fictional) asks which five client addresses had the most failed SSH password attempts in /var/log/auth.log. Failed attempts look like:\n\nNov 14 03:12:44 gw1 sshd[2210]: Failed password for invalid user admin from 198.51.100.40 port 50122 ssh2\nNov 14 03:12:47 gw1 sshd[2210]: Failed password for root from 203.0.113.9 port 50160 ssh2\n\nThe address is always the word after \"from\".",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the pipeline and explain each stage.",
          parts: [
            part(
              "Pipeline",
              "Selects lines with grep 'Failed password', extracts the address (grep -oE after 'from', awk with the field after from, or sed), then sort | uniq -c | sort -rn | head -5; explains that uniq -c needs sorted input.",
              "grep 'Failed password' /var/log/auth.log | grep -oE 'from [0-9.]+' | cut -d' ' -f2 | sort | uniq -c | sort -rn | head -5\n\ngrep keeps failed attempts; grep -oE prints only \"from <address>\"; cut keeps the address; sort groups equal addresses together, which uniq -c needs to count them; sort -rn orders by count, highest first; head -5 keeps the top five."
            ),
            part(
              "A trap",
              "Notes one real pitfall: field-position cut/awk on the whole line breaks because 'invalid user X' shifts the fields, so anchor on the word 'from' instead; or that on systemd-only hosts the log is in the journal (journalctl -u ssh or sshd).",
              "Counting by field number fails: \"for invalid user admin from\" has two more words than \"for root from\", so the address moves. Anchoring on the word from avoids it. On hosts without auth.log, read the same lines with journalctl -u ssh (or sshd, by distribution)."
            ),
          ],
        },
      ],
    },
    {
      slug: "linuxfund-redirection-match",
      objective: "Redirect standard input, output and error, and combine commands with pipes",
      kind: "build",
      title: "Send each stream where it belongs",
      brief:
        "Edgewood Veterinary (fictional) runs a nightly command, ./sync.sh. Match each goal to the redirection that does it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Match each goal, then explain why the order of 2>&1 matters.",
          parts: [
            matchPart(
              "Goal to redirection",
              "Met: all five. Partly there: four.",
              "> overwrites with standard output; >> appends; 2> sends standard error; > file 2>&1 sends both to one file (the order matters); 2>/dev/null discards errors.",
              {
                left: [
                  "Save output to sync.log, replacing the old log",
                  "Add output to the end of sync.log",
                  "Save only error messages to errors.log",
                  "Save output and errors together in sync.log",
                  "Throw error messages away",
                ],
                right: ["./sync.sh > sync.log", "./sync.sh >> sync.log", "./sync.sh 2> errors.log", "./sync.sh > sync.log 2>&1", "./sync.sh 2> /dev/null", "./sync.sh 2>&1 > sync.log"],
                pairs: [0, 1, 2, 3, 4],
                leftHeading: "Goal",
                rightHeading: "Command",
              }
            ),
            part(
              "Order of 2>&1",
              "Explains redirections apply left to right: 2>&1 > file points stderr at the terminal (where stdout was) and only then moves stdout to the file, so errors still go to the terminal; > file 2>&1 moves stdout first, then stderr follows it.",
              "Redirections are processed left to right. In ./sync.sh 2>&1 > sync.log, 2>&1 copies where stdout points at that moment (the terminal), then stdout alone moves to the file, so errors still hit the screen. In > sync.log 2>&1, stdout moves first and stderr then follows it into the file."
            ),
          ],
        },
      ],
    },
    // ---- Unit 4: Users, groups & permissions (2) ----
    {
      slug: "linuxfund-shared-directory",
      objective: "Configure a shared directory with group ownership, the setgid bit and the sticky bit",
      kind: "build",
      title: "A team folder that stays the team's",
      brief:
        "Milton Architects (fictional) needs /srv/plans for the group drafting (members ana, raj and lu). Members must create and edit files there; new files must belong to the drafting group automatically; members must not be able to delete each other's files; nobody else may read anything. ana is not yet in the group.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the commands and explain the mode you chose.",
          parts: [
            commandPart(
              "Add ana to the group",
              "usermod -aG drafting ana (with or without sudo) is met; -G without -a is not, because it replaces her other groups.",
              "sudo usermod -aG drafting ana\n-a appends; -G alone would replace all of ana's supplementary groups. She gets the new group at her next login.",
              { accepted: ["sudo usermod -aG drafting ana", "usermod -aG drafting ana", "sudo gpasswd -a ana drafting", "gpasswd -a ana drafting"], prompt: "$" }
            ),
            part(
              "Ownership and mode",
              "chgrp (or chown :drafting) the directory to drafting and chmod 3770 (or u=rwx,g=rwxs,o-rwx plus +t): setgid (2) so new files inherit the group, sticky (1) so only a file's owner can delete it, rwx for owner and group, nothing for others.",
              "sudo chown root:drafting /srv/plans\nsudo chmod 3770 /srv/plans\n3 = setgid (2) + sticky (1): setgid makes new files belong to drafting, and sticky lets only a file's owner (or root) delete or rename it. 770 gives owner and group full access and others nothing. ls -ld shows drwxrws--T."
            ),
          ],
        },
      ],
    },
    {
      slug: "linuxfund-sudo-one-command",
      objective: "Configure sudo access safely with visudo and /etc/sudoers.d",
      kind: "build",
      title: "Let one user restart one service",
      brief:
        "At DuPont Logistics (fictional) the support user mika needs to restart the web server (systemctl restart nginx) after content updates, and nothing else as root. The current plan is to add mika to the sudo (or wheel) group.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain why the group plan is too broad, then write the rule and how you would add it.",
          parts: [
            part(
              "Why not the admin group",
              "Says the sudo/wheel group usually grants ALL commands as root, so mika could do anything; least privilege calls for a rule naming one command.",
              "On most distributions the sudo or wheel group is allowed (ALL) ALL: any command as root. mika needs one command, so the rule should name exactly that command."
            ),
            part(
              "The rule",
              "A file in /etc/sudoers.d (e.g. /etc/sudoers.d/mika-nginx) edited with visudo -f, containing mika ALL=(root) /usr/bin/systemctl restart nginx (full path, exact arguments); mentions visudo checks syntax so a typo cannot lock out sudo.",
              "sudo visudo -f /etc/sudoers.d/mika-nginx\n\nmika ALL=(root) /usr/bin/systemctl restart nginx\n\nThe full path and exact arguments stop mika from running other systemctl commands. visudo checks the syntax before saving; a broken sudoers file edited by hand can disable sudo for everyone. mika runs it as sudo systemctl restart nginx."
            ),
          ],
        },
      ],
    },
    // ---- Unit 5: Processes & jobs (2) ----
    {
      slug: "linuxfund-signals-gently",
      objective: "Send signals with kill and pkill, and choose between TERM, HUP and KILL",
      kind: "case",
      title: "Stop a runaway process the gentle way",
      brief:
        "A shared server at Steilacoom Schools (fictional) is slow. top shows a process report-gen (PID 48213, owner: batch) at 99% CPU for three hours; its normal run is ten minutes.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The batch team says report-gen saves its progress and exits cleanly when asked to stop.",
          ask: "Which command do you send first?",
          parts: [
            commandPart(
              "First signal",
              "kill 48213 or kill -TERM 48213 (or -15) is met: TERM asks the program to exit and lets it clean up.",
              "kill 48213\nkill sends SIGTERM by default (kill -TERM 48213 or kill -15 48213 are the same). The program can catch it, save progress and exit.",
              {
                accepted: ["kill 48213", "kill -TERM 48213", "kill -15 48213", "kill -SIGTERM 48213", "sudo kill 48213", "sudo kill -TERM 48213"],
                prompt: "$",
              }
            ),
          ],
        },
        {
          text: "Thirty seconds later ps -p 48213 still shows the process, state R, and its log has stopped changing.",
          ask: "What now, and what is the cost?",
          parts: [
            part(
              "Escalate",
              "Sends KILL (kill -9 48213 or kill -KILL 48213) only now; explains SIGKILL cannot be caught, so the process gets no chance to clean up (temporary files, partial output, locks may remain) and those should be checked; HUP is wrong here (it usually means reload or hang-up).",
              "kill -KILL 48213 (kill -9). SIGKILL cannot be caught or ignored, so the kernel ends the process at once, with no cleanup: check for leftover lock or temporary files and a partial report. HUP is not the tool; many daemons treat it as \"reload your configuration\"."
            ),
          ],
        },
      ],
    },
    {
      slug: "linuxfund-read-free-vmstat",
      objective: "Monitor memory and load with free, uptime and vmstat",
      kind: "build",
      title: "Is this machine really out of memory?",
      brief:
        "A ticket at Ruston Bakery Supply (fictional) says the inventory server is \"out of memory\". You collect:\n\n$ free -h\n               total   used   free   shared  buff/cache  available\nMem:           7.6Gi   2.1Gi  310Mi  48Mi    5.2Gi       5.2Gi\nSwap:          2.0Gi   0B     2.0Gi\n\n$ uptime\n 10:42:07 up 41 days, load average: 0.42, 0.38, 0.35   (4 CPUs)\n\nvmstat 5 shows si and so at 0 on every line.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the lines that show the machine is not short of memory, and explain the ticket.",
          parts: [
            selectPart(
              "Evidence",
              "Met: the available column, swap used 0B, and si/so at 0. Partly there: two of them with no wrong line.",
              "available (5.2Gi) is what new programs can use without swapping; swap is unused; si and so (swap in and out per second) are 0. The low free value and the large buff/cache are normal: Linux uses idle memory for cache and gives it back on demand. The load average is low for 4 CPUs.",
              {
                lines: [
                  "free: 310Mi",
                  "available: 5.2Gi",
                  "buff/cache: 5.2Gi",
                  "Swap used: 0B",
                  "vmstat si and so: 0",
                  "load average: 0.42 on 4 CPUs",
                ],
                correct: [1, 3, 4],
                display: "list",
              }
            ),
            part(
              "Explaining the ticket",
              "Says the reporter read the free column; free memory is low because the kernel uses idle RAM for page cache, which is released when programs need it; the server has about 5.2 GiB available, no swapping and low load, so the slowness (if any) lies elsewhere.",
              "Someone read \"free 310Mi\". Linux keeps idle RAM busy as disk cache and hands it back when programs need it, so free is usually small. available shows 5.2 GiB usable, nothing is swapping, and the load is low: memory is not the problem."
            ),
          ],
        },
      ],
    },
    // ---- Unit 6: Software packages (2) ----
    {
      slug: "linuxfund-which-package-owns",
      objective: "Troubleshoot packages by finding which package owns a file and what a package installed, with dpkg and rpm",
      kind: "build",
      title: "Whose file is this?",
      brief:
        "Two servers at Fife Freight (fictional) have a broken /usr/bin/convert. One runs Debian, the other a Fedora-family distribution. Before reinstalling, you want to know which package owns the file on each, and then list the files that package installed on the Debian one, which is called imagemagick-7.q16.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the three commands.",
          parts: [
            commandPart(
              "Owner on Debian",
              "dpkg -S /usr/bin/convert is met.",
              "dpkg -S /usr/bin/convert\ndpkg -S searches installed packages for a file name and prints package: path.",
              { accepted: ["dpkg -S /usr/bin/convert", "dpkg --search /usr/bin/convert"], prompt: "$" }
            ),
            commandPart(
              "Owner on the Fedora-family host",
              "rpm -qf /usr/bin/convert (or dnf provides /usr/bin/convert) is met.",
              "rpm -qf /usr/bin/convert\nrpm -q queries, -f by file. dnf provides /usr/bin/convert also works and searches repositories too.",
              { accepted: ["rpm -qf /usr/bin/convert", "dnf provides /usr/bin/convert"], prompt: "$" }
            ),
            commandPart(
              "Files in the Debian package",
              "dpkg -L imagemagick-7.q16 is met.",
              "dpkg -L imagemagick-7.q16\nLists every file the package installed. The rpm equivalent is rpm -ql <package>.",
              { accepted: ["dpkg -L imagemagick-7.q16", "dpkg --listfiles imagemagick-7.q16"], prompt: "$" }
            ),
          ],
        },
      ],
    },
    {
      slug: "linuxfund-repo-signatures",
      objective: "Manage repositories and explain how package signatures are verified",
      kind: "build",
      title: "Add a vendor repository without trusting the whole world",
      brief:
        "Lakebay Analytics (fictional) needs a database client from its vendor's apt repository on Ubuntu servers. A blog post says: curl the vendor's key and pipe it into apt-key add, then add the repo to /etc/apt/sources.list, and if apt complains about signatures, add [trusted=yes].",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain what signature checking protects, why the blog's shortcuts are risky, and the safer setup.",
          parts: [
            part(
              "What signatures protect",
              "Explains the repository's metadata is signed with the vendor's key and apt checks it (and the metadata's package checksums) before installing, so a mirror or attacker cannot slip in altered packages.",
              "The repository's index files are signed with the vendor's private key; apt verifies that signature with the vendor's public key and then checks each downloaded package against the checksums in the signed index. A tampered mirror or a man in the middle cannot pass altered packages off as genuine."
            ),
            part(
              "Safer setup",
              "Says apt-key add trusts the key for every repository on the system (and apt-key is deprecated); [trusted=yes] turns verification off; instead stores the key in its own keyring file (e.g. /etc/apt/keyrings/vendor.gpg) referenced with signed-by on that repository's line only, checks the key fingerprint against the vendor's published one, then runs apt update.",
              "apt-key add puts the key in the global keyring, so it could sign packages for any repository, and apt-key itself is deprecated. [trusted=yes] disables checking entirely. Instead: download the key, compare its fingerprint with the one the vendor publishes, save it as /etc/apt/keyrings/vendor.gpg, and add a source entry with signed-by=/etc/apt/keyrings/vendor.gpg so the key is trusted for that repository only; then apt update."
            ),
          ],
        },
      ],
    },
    // ---- Unit 7: systemd services & logs (1) ----
    {
      slug: "linuxfund-service-wont-start",
      objective: "Troubleshoot a service that fails to start from its status and journal",
      kind: "case",
      title: "The web server that won't come back",
      brief:
        "After an admin at Sumner Florist (fictional) edited the nginx configuration, systemctl restart nginx failed and the shop's site is down.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "systemctl status nginx shows: Active: failed (Result: exit-code). The last lines say: nginx: [emerg] unexpected \"}\" in /etc/nginx/sites-enabled/shop:31 and nginx: configuration file /etc/nginx/nginx.conf test failed.",
          ask: "Put your next steps in order.",
          parts: [
            orderPart(
              "Order",
              "Met: the order given. Partly there: one adjacent swap.",
              "Read the full error in the journal, fix the file at the line named, prove the configuration with nginx -t before restarting, then restart and check the service and the site.",
              [
                "Read the unit's recent journal: journalctl -u nginx -n 50",
                "Open /etc/nginx/sites-enabled/shop near line 31 and fix the brace",
                "Test the configuration with nginx -t",
                "Restart with systemctl restart nginx",
                "Confirm with systemctl status nginx and by loading the site",
              ]
            ),
          ],
        },
        {
          text: "nginx -t now reports \"syntax is ok\" and \"test is successful\", and the site loads. The admin asks how to make sure nginx also starts after the next reboot.",
          ask: "Give the command and how to check it.",
          parts: [
            commandPart(
              "Start at boot",
              "systemctl enable nginx (or enable --now) with or without sudo is met.",
              "sudo systemctl enable nginx\nCheck with systemctl is-enabled nginx (prints enabled). enable --now would also start it if it were stopped.",
              { accepted: ["sudo systemctl enable nginx", "systemctl enable nginx", "sudo systemctl enable --now nginx", "systemctl enable --now nginx"], prompt: "$" }
            ),
          ],
        },
      ],
    },
    // ---- Unit 8: Storage & filesystems (1) ----
    {
      slug: "linuxfund-fstab-uuid",
      objective: "Mount filesystems by hand and at boot through /etc/fstab using UUIDs",
      kind: "build",
      title: "Mount a new data disk so it survives reboots, and failures",
      brief:
        "Carbonado Clinic Records (fictional) added a second disk, formatted as ext4, to a server. lsblk shows it as /dev/sdb1 today, and blkid shows UUID=\"3f6c2a9e-1b7d-4c51-9a0e-7d2e5b8c4f10\". It must mount at /data at every boot, and the server must still boot if the disk is ever missing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the fstab line and how you test it before rebooting.",
          parts: [
            part(
              "fstab line",
              "Uses UUID= rather than /dev/sdb1 (device names can change between boots), mount point /data, type ext4, options including defaults and nofail, dump 0 and fsck pass 2.",
              "UUID=3f6c2a9e-1b7d-4c51-9a0e-7d2e5b8c4f10  /data  ext4  defaults,nofail  0  2\n\nThe UUID belongs to the filesystem, while sdb can become sdc when disks are added. nofail lets boot continue if the disk is absent; pass 2 checks it after the root filesystem."
            ),
            part(
              "Test before reboot",
              "Creates /data, runs mount -a (or mount /data) and findmnt /data or df -h /data to prove the line works; explains that a bad line found only at reboot can stop boot in emergency mode; systemctl daemon-reload on systemd systems is a plus.",
              "sudo mkdir -p /data\nsudo systemctl daemon-reload\nsudo mount -a\nfindmnt /data\nmount -a mounts everything in fstab that isn't mounted yet, so a typo shows up now, while you are logged in, instead of as a host stuck in emergency mode at the next boot."
            ),
          ],
        },
      ],
    },
    // ---- Unit 9: Networking basics & SSH (1) ----
    {
      slug: "linuxfund-ssh-keys",
      objective: "Configure key-based SSH login with ssh-keygen and ssh-copy-id",
      kind: "build",
      title: "From passwords to SSH keys",
      brief:
        "Wilkeson Water (fictional) wants its admin, dana, to log in from her laptop to the server pump-ctl.example.net with a key, then switch the server to key-only logins without locking anyone out.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Order the steps, then give the key-generation command.",
          parts: [
            orderPart(
              "Order",
              "Met: the order given. Partly there: one adjacent swap.",
              "Make the key on the laptop, install the public key on the server, prove key login works, and only then turn off passwords, testing the config before reloading and keeping a session open.",
              [
                "On the laptop, generate a key pair with ssh-keygen",
                "Copy the public key to the server with ssh-copy-id dana@pump-ctl.example.net",
                "Log in again and confirm no password was asked",
                "Set PasswordAuthentication no in sshd_config and check it with sshd -t",
                "Reload sshd while keeping the current session open, then test a new login",
              ]
            ),
            commandPart(
              "Generate the key",
              "ssh-keygen -t ed25519 (optionally with -C) or plain ssh-keygen (which makes Ed25519 by default) is met.",
              "ssh-keygen -t ed25519\nCurrent OpenSSH makes an Ed25519 key even with no arguments. Protect it with a passphrase; only the .pub file ever leaves the laptop.",
              { accepted: ["ssh-keygen -t ed25519", "ssh-keygen", "ssh-keygen -t ed25519 -C dana@laptop"], valueFlags: ["-C"], prompt: "$" }
            ),
          ],
        },
      ],
    },
    // ---- Unit 10: Shell scripting & scheduling (1) ----
    {
      slug: "linuxfund-safe-cleanup-script",
      objective: "Write scripts that fail safely with set -euo pipefail and quoted variables",
      kind: "build",
      title: "The cleanup script that could delete everything",
      brief:
        "Buckley Print (fictional) runs this nightly:\n\n#!/bin/bash\ncd $WORKDIR\nrm -rf $TARGET/*\n\nOne night WORKDIR was unset after a config change. The cd failed, the script kept going, TARGET was also empty, and rm ran against /* from the user's home directory.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain how each line went wrong and rewrite the script so the same mistake stops it instead.",
          parts: [
            part(
              "What went wrong",
              "Explains: cd with an empty argument went to the home directory (or failed) and the script continued because Bash does not stop on errors by default; $TARGET was empty and unquoted, so rm -rf $TARGET/* became rm -rf /*.",
              "With WORKDIR empty, cd $WORKDIR is plain cd, which goes to the home directory, and nothing stopped the script anyway. TARGET was empty, so $TARGET/* expanded to /*: rm -rf against the whole filesystem with that user's permissions."
            ),
            part(
              "Safe version",
              "Uses set -euo pipefail; requires the variables with ${VAR:?message} (or explicit checks); quotes them; cd ... || exit; refuses an empty or / target; optionally uses find with -mindepth 1 -delete.",
              "#!/bin/bash\nset -euo pipefail\n: \"${WORKDIR:?WORKDIR is not set}\"\n: \"${TARGET:?TARGET is not set}\"\ncd \"$WORKDIR\"\ncase \"$TARGET\" in\n  /|\"\") echo \"refusing to clean $TARGET\" >&2; exit 1 ;;\nesac\nfind \"$TARGET\" -mindepth 1 -delete\n\nset -e stops at the first failing command, -u makes an unset variable an error, pipefail fails a pipeline when any stage fails, ${VAR:?} stops with a message, and quoting keeps each path one argument."
            ),
          ],
        },
      ],
    },
  ],
};
