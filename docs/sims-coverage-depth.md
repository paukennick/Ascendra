# Sim coverage: Python and Linux depth courses (REQ-292)

Written 2026-11-14 for Nick's instruction of the same day: sims for the new
Python and Linux courses follow coverage, not a count, with a terminal sim
for every objective that fits his selection rule (time matters, cues to
read, choices with consequences, or competing priorities). It maps every
objective of the four REQ-292 courses (PYAUTO, PYDATA, LINUXFUND, LFCS)
against that rule, shows which sim covers which objective, and lists what is
left.

## How the map was made

- **Objectives** are each course's sub-objectives as seeded
  (`backend/supabase/seed/tracks/python-depth.ts`, `tracks/linux.ts`): 177
  across the four courses.
- **"Screen"** is the generator's selection screen
  (`backend/lib/sim/generator/selection.ts`): an objective "fits" when words
  in its title meet at least two of the four criteria. The column names the
  criteria matched. It reads titles, not content, so it under-counts (most
  "Troubleshoot ..." titles match only "cues") and can over-count ("time"
  in "rotates by size or time").
- **Covered** means a seeded sim names the objective as its `objective`.
  Secondary objectives are listed under "Also touched by" and not counted.
- **Judgement.** Two built sims sit on objectives the screen does not pass
  (the LVM case and the two Linux Fundamentals cases from the first round:
  each is hands-on, timed and has consequences). Objectives the screen does
  not pass but that fit the rule on a reading of their content are marked
  "not built" with the case they would make. Those are my calls, not Nick's.
- Counts come from a script over the seed modules and `lib/sim/documents.ts`
  (no database).

## Summary

| Course | Objectives | Fit (screen) | Sims | Covered | Fit covered |
|---|---|---|---|---|---|
| PYAUTO | 52 | 1 | 1 | 1 | 1 |
| PYDATA | 42 | 1 | 1 | 1 | 1 |
| LINUXFUND | 48 | 1 | 3 | 3 | 1 |
| LFCS | 35 | 5 | 6 | 6 | 5 |
| Total | 177 | 8 | 11 | 11 | 8 |

Every objective the screen passes now has a sim. Fifteen more fit the rule
by judgement and are listed as candidates; the strongest are a cron job that
overlaps itself (PYAUTO), a merge that silently duplicates rows (PYDATA) and
a firewall change that can lock you out (LFCS).

## The sims

All run on the terminal screen, engine 1.2 with `endingOrder`, learner-paced
(each command costs operator minutes through one `work` wait; the incident
develops on the same clock), with endings in all three outcome classes, a
debrief per ending, one three-part reasoning moment and five or six golden
paths (`npm run sim:golden -- steps <name>`) that reach every ending but
`time_up` and score every criterion met and missed
(`backend/lib/sim/linux-depth-terminal.test.ts`). The Python data case uses
a `>>>` prompt and the `data` outcome profile (harm is a wrong result
shipped); the rest use `infrastructure`.

| Course / slug | Objective (abridged) | Critical criteria | Steps name |
|---|---|---|---|
| LFCS/fstab-uuid-typo-emergency | Recover a system that will not boot ... emergency and rescue targets | (first round) | lfcs-fstab |
| LFCS/lvm-database-volume-full | Create and extend LVM ... growing the filesystem | (first round) | lfcs-lvm |
| LFCS/report-workers-starve-api | Diagnose and manage processes ... change priority, and send the right signal | looked first; report kept at nice 19 (every worker, not the parent); API fast in 20 min; postgres left alone | lfcs-proc |
| LFCS/clock-skew-blocks-logins | Configure time synchronization with chrony ... | looked first; source fixed in chrony.conf, not by hand; clock right in 20 min; Kerberos skew left at 300 s | lfcs-chrony |
| LFCS/sale-traffic-third-backend | Implement a reverse proxy and load balancer with nginx or HAProxy | looked first; app3 listening and in the pool; nginx never stopped (no restart on an invalid file); capacity in 20 min | lfcs-lb |
| LFCS/service-no-restart-after-update | Create and configure systemd service units, including drop-in overrides | looked first; only the bad file quarantined; Restart= in a loaded /etc drop-in; rendering in 20 min | lfcs-unit |
| LINUXFUND/shared-folder-permission-denied | Configure a shared directory with group ownership, setgid and sticky bit | (first round) | linuxfund-perms |
| LINUXFUND/web-service-fails-after-edit | Troubleshoot a service that fails to start from its status and journal | (first round) | linuxfund-nginx |
| LINUXFUND/nightly-backup-missing | Read service logs with journalctl filtered by unit, boot, priority and time | found it in the journal first; never wrote into the unmounted directory; NAS mounted; backup done before 08:00 | linuxfund-journal |
| PYAUTO/debug-log-fills-var | Write logs to a file that rotates by size or time | looked first; space back in 10 min (truncate, not rm on an open file); a RotatingFileHandler that rolls over (backupCount > 0), loaded | pyauto-log |
| PYDATA/board-orders-by-region | Interpret group results correctly, including count versus size and missing keys | checked the draft's total; sent a table that counts every order (size, dropna=False); asserted against the raw rows | pydata-groupby |

**Sources** carry `checkedAt` 2026-11-14 and were read through summarizing
fetches before the lead's no-fetch rule of the same afternoon: sched(7),
renice(1), kill(1), signal(7), systemd.service(5), systemd.unit(5),
systemctl(1), systemd-system.conf(5), journalctl(1), mount(8), unlink(2)
(man7.org); chrony.conf(5) and chronyc(1) for chrony 4.6; MIT krb5.conf
(clockskew); nginx's upstream, proxy and control pages; Python 3.15
logging.handlers and the Logging Cookbook; pandas 3.1 DataFrame.groupby,
DataFrameGroupBy.size and .count; the LFCS exam page (first round). Command
output layouts and error texts are authored in each tool's style; the facts
they carry are the sources'. Inferences are marked as such in the source
notes (a run-time `chronyc add` not surviving a restart; a restart on an
invalid nginx file leaving nginx stopped; a package update replacing its own
file under /usr/lib).

## Every objective

### PYAUTO: Python for Automation and Scripting

| Unit | Objective | Screen | Sim (primary) | Also touched by |
|---|---|---|---|---|
| U1 | Build and inspect paths with pathlib instead of joining strings | none |  |  |
| U1 | Read and write text and binary files with an explicit encoding and the with statement | none |  |  |
| U1 | Select files by walking a directory tree with iterdir, glob and rglob | choices |  |  |
| U1 | Copy, move and delete files and directories with shutil and pathlib without overwriting by accident | none |  |  |
| U1 | Write output atomically: write a temporary file in the same directory, then replace the target | none |  |  |
| U1 | Handle FileNotFoundError, PermissionError and IsADirectoryError where a script touches the filesystem | none |  |  |
| U2 | Structure a script with a main() function, the if __name__ == "__main__" guard and an exit status | none |  |  |
| U2 | Build a command-line interface with argparse: positional arguments, options, defaults, types and choices | none |  |  |
| U2 | Design subcommands with add_subparsers and mutually exclusive option groups | choices |  |  |
| U2 | Write to standard output and standard error, and read standard input, so the script works in a pipeline | none |  |  |
| U2 | Configure a script from arguments, environment variables and a TOML file with a clear order of precedence | choices |  |  |
| U3 | Choose which exceptions to catch, which to let propagate, and where in a script to handle them | choices |  |  |
| U3 | Raise exceptions with clear messages and chain them with raise ... from | none |  |  |
| U3 | Clean up reliably with finally, context managers and contextlib | choices |  |  |
| U3 | Decide which failures to retry, and retry them with backoff and a limit | choices | not built: candidate: a retry loop without backoff hammers a rate-limited API during an outage |  |
| U3 | Map failures to exit codes and messages a person or a scheduler can act on | none |  |  |
| U4 | Configure logging once at startup with basicConfig or dictConfig, and use a named logger per module | choices |  | debug-log-fills-var |
| U4 | Choose the level for each message, from DEBUG to CRITICAL | choices |  | debug-log-fills-var |
| U4 | Write logs to a file that rotates by size or time | fits (time + cues) | debug-log-fills-var |  |
| U4 | Format log records with time, level and logger name, and log exceptions with their tracebacks | time |  |  |
| U4 | Keep passwords, tokens and personal data out of log messages | none |  |  |
| U5 | Write regular expressions with character classes, quantifiers, anchors and groups | none |  |  |
| U5 | Choose between re.search, re.match, re.fullmatch, re.findall and re.finditer | choices |  |  |
| U5 | Extract fields from log lines with named groups and compiled patterns | none |  |  |
| U5 | Substitute text with re.sub using backreferences or a function as the replacement | none |  |  |
| U5 | Use raw strings for patterns and avoid patterns that backtrack catastrophically | none |  |  |
| U5 | Decide when string methods or a parser (csv, json) are better than a regular expression | choices |  |  |
| U6 | Write subprocess.run calls with an argument list, check=True, capture_output=True and text=True | none |  |  |
| U6 | Prevent shell injection: keep shell=False, and quote with shlex.quote only when a shell is unavoidable | none |  |  |
| U6 | Handle a failed or hung command through CalledProcessError, return codes and a timeout | time | not built: candidate: a nightly export hangs on a stuck NFS read; timeout and exit codes decide whether the morning report is stale or wrong |  |
| U6 | Stream long output and connect processes with Popen | none |  |  |
| U6 | Choose between calling a program and using a Python library for the same task | choices |  |  |
| U7 | Call an HTTP API with urllib.request or Requests, setting headers, query parameters and a timeout | time |  |  |
| U7 | Parse, validate and write JSON with the json module | none |  |  |
| U7 | Handle error status codes, rate limits and pagination | none | not built: candidate: a sync that stops at page 1 or ignores 429s silently drops records |  |
| U7 | Keep API keys out of code: read them from the environment or a secrets store | none |  |  |
| U7 | Design an API client function that can be tested without the network | choices |  |  |
| U8 | Schedule a script with cron: write the crontab line and set the environment it runs in | none |  |  |
| U8 | Schedule a script with a systemd timer and service unit, catching up missed runs | time |  |  |
| U8 | Make a scheduled job safe to rerun and to overlap with idempotent steps and a lock | none | not built: candidate (strongest): a cron job overruns into its next start and double-charges; flock and idempotent steps |  |
| U8 | Work with dates and times in jobs using aware datetimes, UTC and zoneinfo | time |  |  |
| U8 | Use in-process scheduling (sched, a sleep loop) only where an OS scheduler does not fit | none |  |  |
| U9 | Create a virtual environment with python -m venv and install into it with python -m pip | none |  |  |
| U9 | Pin and reproduce dependencies with a requirements file or a lock file | none |  |  |
| U9 | Write a pyproject.toml with project metadata, dependencies and a console script entry point | none |  |  |
| U9 | Install a project in editable mode and run its console script | none |  |  |
| U9 | Choose where a tool's dependencies live: a venv, pipx or a container | choices |  |  |
| U10 | Write pytest tests for a script's functions with plain assert statements | none |  |  |
| U10 | Use fixtures, including tmp_path, for the files and directories a test needs | none |  |  |
| U10 | Parametrize a test to cover many inputs | none |  |  |
| U10 | Replace the network, the clock and environment variables in tests with monkeypatch | none |  |  |
| U10 | Test a command-line entry point: arguments, exit status and captured output | none |  |  |

### PYDATA: Python for Data Analysis

| Unit | Objective | Screen | Sim (primary) | Also touched by |
|---|---|---|---|---|
| U1 | Create an isolated environment for an analysis and record its package versions | none |  |  |
| U1 | Use a Jupyter notebook: cells, the kernel, Markdown notes and rich output | none |  |  |
| U1 | Recognize hidden state from out-of-order cells, and restart and run all before trusting a result | cues | not built: candidate: a notebook result that does not reproduce after restart, the day it is shared |  |
| U1 | Decide what belongs in a notebook and what belongs in a module or script | choices |  |  |
| U2 | Create arrays and read their shape, dtype and number of dimensions | none |  |  |
| U2 | Select from arrays with slices, boolean masks and integer indexes | choices |  |  |
| U2 | Apply vectorized operations and aggregations along an axis | choices |  |  |
| U2 | Predict the result shape of an operation from the broadcasting rules | none |  |  |
| U2 | Generate reproducible random numbers with a seeded Generator | none |  |  |
| U3 | Load CSV, Excel and JSON data with read_csv and its relatives, setting dtypes, dates and the index | none |  |  |
| U3 | Inspect a DataFrame with head, info, describe, dtypes and value_counts | none |  |  |
| U3 | Select rows and columns with [], .loc, .iloc and boolean masks | choices |  |  |
| U3 | Modify a DataFrame under Copy-on-Write: assign through .loc, never through chained indexing | none |  |  |
| U3 | Create derived columns with vectorized expressions and assign | none |  |  |
| U4 | Find and handle missing values with isna, dropna and fillna, and decide which to use | choices |  | board-orders-by-region |
| U4 | Convert columns to the right dtypes, including numbers stored as text and dates | none |  |  |
| U4 | Clean text columns with the .str methods | none |  |  |
| U4 | Find and remove duplicate rows, choosing which copy to keep | none |  |  |
| U4 | Check cleaned data with assertions on row counts, ranges and uniqueness | none |  | board-orders-by-region |
| U5 | Group rows with groupby and compute sum, mean, count and size per group | none |  | board-orders-by-region |
| U5 | Compute several named aggregates at once with agg | none |  |  |
| U5 | Add a per-group value to every row with transform | none |  |  |
| U5 | Build a summary table with pivot_table and crosstab | none |  |  |
| U5 | Interpret group results correctly, including count versus size and missing keys | fits (cues + priorities) | board-orders-by-region |  |
| U6 | Join tables with merge using inner, left, right, outer and anti joins | none |  |  |
| U6 | Validate a join's key relationship and row count with validate and indicator | none | not built: candidate (strongest): a many-to-many merge inflates revenue before a deadline; validate= and indicator= catch it |  |
| U6 | Stack tables with concat and align them on their index | none |  |  |
| U6 | Reshape between long and wide form with melt and pivot | none |  |  |
| U7 | Parse timestamps with to_datetime and set a DatetimeIndex | time |  |  |
| U7 | Resample a series to a coarser frequency and choose the aggregate | choices |  |  |
| U7 | Compute rolling and expanding windows | time |  |  |
| U7 | Localize and convert time zones with tz_localize and tz_convert | time | not built: candidate: a DST change shifts a daily total; ambiguous and nonexistent times |  |
| U7 | Handle gaps and irregular timestamps in a series | time |  |  |
| U8 | Create figures with the explicit interface: plt.subplots, then methods on Axes | none |  |  |
| U8 | Choose a chart type (line, bar, histogram, scatter) that fits the question | choices |  |  |
| U8 | Label axes with units, title the figure and add a legend when there is more than one series | none |  |  |
| U8 | Plot directly from pandas and lay out several Axes in one figure | none |  |  |
| U8 | Save figures to files at a set size and resolution | none |  |  |
| U9 | Make an analysis rerunnable: raw data kept read-only, pinned versions, seeds and a run-all step | none |  |  |
| U9 | Organize a project into data, notebooks, source modules and outputs | none |  |  |
| U9 | Write data-checking tests with pytest for the cleaning and summary functions | none |  |  |
| U9 | Integrate prior units into one end-to-end analysis with a short written conclusion | none |  |  |

### LINUXFUND: Linux Fundamentals

| Unit | Objective | Screen | Sim (primary) | Also touched by |
|---|---|---|---|---|
| U1 | Read a command line: the command, its options and its arguments | none |  |  |
| U1 | Find help on the system with man, --help, apropos and the documents in /usr/share/doc | none |  |  |
| U1 | Use tab completion, history and editing shortcuts to work faster | none |  |  |
| U1 | Apply quoting and escaping correctly with single quotes, double quotes and backslashes | choices |  |  |
| U1 | Write command lines that use variables, globbing and command substitution | none |  |  |
| U2 | Navigate the filesystem with absolute and relative paths | none |  |  |
| U2 | Explain where configuration, logs, programs and user data live under the Filesystem Hierarchy Standard | cues |  |  |
| U2 | Create, copy, move and remove files and directories, including recursive operations | none |  |  |
| U2 | Locate files by name, type, size, age and owner with find | none |  |  |
| U2 | Create hard and symbolic links and explain the difference | none |  |  |
| U2 | Create and extract archives with tar and compression | none |  |  |
| U3 | View files with cat, less, head and tail, including following a growing log | none |  |  |
| U3 | Redirect standard input, output and error, and combine commands with pipes | none |  |  |
| U3 | Search text with grep and basic and extended regular expressions | none |  |  |
| U3 | Write text transformations with cut, sort, uniq, tr, wc and sed | none |  |  |
| U3 | Build a pipeline that answers a question about a log file | none |  |  |
| U4 | Create and manage users and groups with useradd, usermod, groupadd and passwd | choices |  | shared-folder-permission-denied |
| U4 | Read and set permissions with chmod in symbolic and octal form, and ownership with chown | none |  | shared-folder-permission-denied |
| U4 | Configure a shared directory with group ownership, the setgid bit and the sticky bit | choices | shared-folder-permission-denied |  |
| U4 | Explain how umask sets the permissions of new files | none |  |  |
| U4 | Configure sudo access safely with visudo and /etc/sudoers.d | choices |  |  |
| U5 | List and inspect processes with ps, top and pgrep | none |  |  |
| U5 | Send signals with kill and pkill, and choose between TERM, HUP and KILL | choices | not built: taught inside LFCS/report-workers-starve-api (TERM versus KILL on the wrong process); no separate sim |  |
| U5 | Manage foreground and background jobs with &, Ctrl+Z, bg, fg and nohup | choices |  |  |
| U5 | Change process priority with nice and renice | priorities |  |  |
| U5 | Monitor memory and load with free, uptime and vmstat | cues |  |  |
| U6 | Install, update and remove packages with apt on Debian and Ubuntu systems | none |  |  |
| U6 | Install, update and remove packages with dnf on Fedora-family systems | none |  |  |
| U6 | Troubleshoot packages by finding which package owns a file and what a package installed, with dpkg and rpm | cues |  |  |
| U6 | Manage repositories and explain how package signatures are verified | choices |  |  |
| U7 | Start, stop, restart, enable and disable services with systemctl | none |  | web-service-fails-after-edit |
| U7 | Read service logs with journalctl filtered by unit, boot, priority and time | fits (time + cues + priorities) | nightly-backup-missing | web-service-fails-after-edit |
| U7 | Troubleshoot a service that fails to start from its status and journal | cues | web-service-fails-after-edit | nightly-backup-missing |
| U7 | Explain the boot sequence and systemd targets | priorities |  |  |
| U7 | Override a unit's settings with a drop-in file | none |  |  |
| U8 | List disks, partitions and filesystems with lsblk, blkid and df | none |  |  |
| U8 | Create a partition and a filesystem on a new disk | none |  |  |
| U8 | Mount filesystems by hand and at boot through /etc/fstab using UUIDs | none |  | nightly-backup-missing |
| U8 | Diagnose a full disk with df and du, including space held by deleted open files | cues | not built: covered in teaching by PYAUTO/debug-log-fills-var and LINUXPLUS/full-var-stops-database; a fundamentals variant would repeat them |  |
| U9 | Read IP addresses, routes and interfaces with ip addr and ip route | none |  |  |
| U9 | Test connectivity and name resolution with ping, tracepath and dig or getent | none |  |  |
| U9 | List listening ports and the processes behind them with ss | none |  |  |
| U9 | Configure key-based SSH login with ssh-keygen and ssh-copy-id | choices |  |  |
| U9 | Copy files between machines with scp, sftp and rsync | none |  |  |
| U10 | Write Bash scripts with a shebang, variables, arguments and exit status | none |  |  |
| U10 | Use conditionals, loops and functions in Bash | none |  |  |
| U10 | Write scripts that fail safely with set -euo pipefail and quoted variables | none | not built: candidate: a cleanup script with an unset variable deletes the wrong tree |  |
| U10 | Schedule scripts with cron and systemd timers | time |  |  |

### LFCS: Prep for the LFCS

| Unit | Objective | Screen | Sim (primary) | Also touched by |
|---|---|---|---|---|
| U1 | Configure kernel parameters at runtime with sysctl and persistently in /etc/sysctl.d, and verify the value in effect | choices |  |  |
| U1 | Diagnose and manage processes: find them with ps, top and pgrep, change priority, and send the right signal | fits (cues + choices + priorities) | report-workers-starve-api |  |
| U1 | Troubleshoot a service that fails to start using systemctl status, journalctl and its unit file | cues |  | service-no-restart-after-update, report-workers-starve-api, fstab-uuid-typo-emergency |
| U1 | Schedule jobs with cron, at and systemd timers, and confirm they ran | time |  |  |
| U1 | Manage packages and repositories with apt and dnf: search, install, verify, update, remove and add a repository | choices |  | service-no-restart-after-update |
| U1 | Troubleshoot and recover a system that will not boot because of a bad fstab entry, a damaged filesystem or a failing service, using the emergency and rescue targets | fits (time + cues) | fstab-uuid-typo-emergency |  |
| U1 | Create, start, stop and inspect virtual machines with libvirt's virsh and virt-install | none |  |  |
| U1 | Configure a container engine and run containers with Podman or Docker: images, ports, volumes and restart policies | choices |  |  |
| U1 | Configure SELinux: set the mode, read denials, fix file contexts with semanage fcontext and restorecon, and set booleans | choices | not built: LINUXPLUS/selinux-denies-moved-site covers the same work; an LFCS band of it is an option |  |
| U2 | Configure IPv4 and IPv6 addresses, gateways and DNS resolvers persistently, and set the hostname and /etc/hosts entries | choices |  |  |
| U2 | Configure time synchronization with chrony or systemd-timesyncd and check it with chronyc or timedatectl | fits (time + choices) | clock-skew-blocks-logins |  |
| U2 | Troubleshoot networking with ip, ss, ping, tracepath, dig and the journal | cues | not built: candidate: a wrong default route or resolver after a change, with users waiting | sale-traffic-third-backend, clock-skew-blocks-logins |
| U2 | Configure the OpenSSH server and client: key-based login, sshd_config hardening and per-host client settings | choices |  |  |
| U2 | Configure packet filtering, port forwarding and NAT with nftables, firewalld or ufw | choices | not built: candidate: a firewall change over SSH that can lock you out (a timed rollback first) |  |
| U2 | Configure static routes persistently and verify the routing table | choices |  |  |
| U2 | Create bridge and bond interfaces and choose a bonding mode | choices |  |  |
| U2 | Implement a reverse proxy and load balancer with nginx or HAProxy | fits (choices + priorities) | sale-traffic-third-backend |  |
| U3 | Create and extend LVM physical volumes, volume groups and logical volumes, growing the filesystem with them | none | lvm-database-volume-full |  |
| U3 | Mount filesystems persistently in /etc/fstab by UUID, and read and set values in the virtual filesystems /proc and /sys | none |  | fstab-uuid-typo-emergency |
| U3 | Create, check and repair ext4 and XFS filesystems and troubleshoot mount failures | cues |  | lvm-database-volume-full, fstab-uuid-typo-emergency |
| U3 | Mount NFS and other remote filesystems, and attach network block devices such as iSCSI or NBD | none |  |  |
| U3 | Create and enable swap on a partition or a file, persistently | none |  |  |
| U3 | Configure on-demand mounts with autofs or systemd automount units | choices |  |  |
| U3 | Monitor storage performance with iostat, iotop and df, and identify a saturated device | cues | not built: candidate: a saturated disk behind a slow database | lvm-database-volume-full |
| U4 | Use Git for basic work: clone, commit, branch, merge, push and pull | none |  |  |
| U4 | Create and configure systemd service units, including drop-in overrides, and troubleshoot them | fits (cues + choices) | service-no-restart-after-update |  |
| U4 | Monitor and troubleshoot system performance: load, CPU, memory and I/O with uptime, top, free and vmstat | cues |  | report-workers-starve-api |
| U4 | Determine an application's constraints: open files, listening ports, resource limits and the users and paths it needs | none |  | sale-traffic-third-backend |
| U4 | Troubleshoot disk space problems, including deleted files still held open and inode exhaustion | cues | not built: variant of LINUXPLUS/full-var-stops-database; an inode-exhaustion case would be new | lvm-database-volume-full |
| U4 | Work with TLS certificates: create keys and signing requests, inspect certificates and check expiry with openssl | none |  |  |
| U5 | Create and manage local user and group accounts, passwords and account expiry | choices |  |  |
| U5 | Manage personal and system-wide environment profiles in ~/.bashrc, ~/.profile and /etc/profile.d | choices |  |  |
| U5 | Configure user resource limits with limits.conf and systemd, and verify them with ulimit | choices |  |  |
| U5 | Configure and manage POSIX ACLs with setfacl and getfacl, including default ACLs and the mask | choices |  |  |
| U5 | Configure the system to use LDAP users and groups through SSSD and NSS | choices |  |  |
