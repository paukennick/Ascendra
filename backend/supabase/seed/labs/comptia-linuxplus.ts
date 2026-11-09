import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-160: CompTIA Linux+ (XK0-006, V8).
//
// Aligned to the five domains on CompTIA's Linux+ certification page, read
// 2026-11-07: System Management 23%, Services and User Management 20%,
// Security 18%, Automation, Orchestration, and Scripting 17%, Troubleshooting
// 22% (exam series code XK0-006, launched 2025-07-15, retirement estimated
// 2028). The seed track keeps the same five units in its own order.
//   https://www.comptia.org/en-us/certifications/linux/
// Density (docs/labs.md, policy "hybrid"): System Management 3, Services and
// User Management 2, Troubleshooting 2, Security 1, Automation 2. Every lab is
// a thing the exam's performance-based items make a candidate DO: fix a
// service from its journal, grow an LVM volume, find who owns a file across
// distributions, onboard users safely, set SGID/sticky directories, read ip /
// dig / df output to a root cause, harden sshd without locking yourself out,
// and write a script and its schedule. Command output is authored to match
// the commands' real formats; option names are the current ones (for example
// KbdInteractiveAuthentication rather than the deprecated
// ChallengeResponseAuthentication). Hostnames and paths are fictional.
// These labs are additional to the course's self-reported labs.

export const LINUXPLUS_LABS: SeedLabSet = {
  trackCode: "LINUXPLUS",
  sources: [source("https://www.comptia.org/en-us/certifications/linux/", "exam_outline", "2026-11-07")],
  labs: [
    // -----------------------------------------------------------------------
    // System Management (23%) -- 3 labs
    // -----------------------------------------------------------------------
    {
      slug: "nginx-fails-to-start-port-in-use",
      objective: "systemd service management (systemctl, journalctl)",
      kind: "case",
      title: "Get a web service back up from its unit status and journal",
      brief:
        "You administer web01, an Ubuntu server at Fernhill Books that serves the company catalogue with nginx. After a reboot for kernel patches, the catalogue is down. A colleague says they 'installed Apache yesterday to test something' and then left for the week. Work the problem with systemctl, journalctl and ss, and leave the box in a state that survives the next reboot.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "$ sudo systemctl status nginx\n● nginx.service - A high performance web server and a reverse proxy server\n     Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled; preset: enabled)\n     Active: failed (Result: exit-code) since Tue 2026-11-03 08:12:41 UTC; 2min 10s ago\n       Docs: man:nginx(8)\n    Process: 1187 ExecStartPre=/usr/sbin/nginx -t -q -g daemon on; master_process on; (code=exited, status=1/FAILURE)\n        CPU: 18ms\n\n$ sudo journalctl -u nginx -b --no-pager | tail -n 4\nNov 03 08:12:41 web01 nginx[1187]: nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)\nNov 03 08:12:41 web01 nginx[1187]: nginx: configuration file /etc/nginx/nginx.conf test failed\nNov 03 08:12:41 web01 systemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE\nNov 03 08:12:41 web01 systemd[1]: Failed to start nginx.service - A high performance web server and a reverse proxy server.",
          ask: "What do the status and journal tell you, and which command do you run next to find the culprit?",
          parts: [
            part(
              "Reading the failure",
              "Reads the unit as enabled but failed with exit code 1 from ExecStartPre (the config test), and the journal's '[emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)' as another process already listening on TCP 80 -- not a syntax error in nginx.conf, even though the test 'failed'.",
              "The unit is enabled (so it tried at boot) and failed in ExecStartPre, which runs nginx -t. The journal shows why the test failed: bind() to 0.0.0.0:80 returned errno 98, Address already in use. Something else owns port 80, so nginx cannot start. The 'configuration file test failed' line is a consequence of the bind failure, not a syntax problem."
            ),
            part(
              "Finding the listener",
              "Uses ss (or lsof) to find the process bound to port 80, e.g. sudo ss -tlnp | grep ':80 ' or sudo ss -tlnp 'sport = :80', and expects to see the process name and PID.",
              "sudo ss -tlnp 'sport = :80' lists the listening TCP socket on port 80 with the owning process and PID (the -p needs root). Alternatively sudo lsof -i :80. Given yesterday's Apache install, expect apache2 to be the listener."
            ),
          ],
        },
        {
          text:
            "$ sudo ss -tlnp 'sport = :80'\nState   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port  Process\nLISTEN  0       511           0.0.0.0:80         0.0.0.0:*      users:((\"apache2\",pid=1012,fd=4),(\"apache2\",pid=1011,fd=4),(\"apache2\",pid=1009,fd=4))\n\n$ systemctl is-enabled apache2\nenabled",
          ask: "Fix it so the catalogue is served now and stays served after the next reboot, and show how you confirm each step.",
          parts: [
            part(
              "Clearing the port and starting nginx",
              "Stops apache2 and starts nginx (sudo systemctl stop apache2; sudo systemctl start nginx), then confirms with systemctl is-active nginx / status and ss showing nginx on :80 (and a curl to localhost).",
              "sudo systemctl stop apache2 -- frees port 80. sudo systemctl start nginx. Check: systemctl is-active nginx -> active; sudo ss -tlnp 'sport = :80' now shows nginx; curl -I http://localhost returns 200 from nginx."
            ),
            part(
              "Surviving the next reboot",
              "Disables apache2 (sudo systemctl disable apache2, or mask it so nothing can start it: systemctl mask apache2) because it is enabled and would grab port 80 first again; confirms nginx is enabled (systemctl is-enabled nginx) and apache2 is disabled/masked.",
              "apache2 is enabled, so on the next boot it would race nginx for port 80 again. sudo systemctl disable --now apache2 stops it and removes it from boot; if nobody should start it by hand either, sudo systemctl mask apache2 links the unit to /dev/null. Confirm: systemctl is-enabled apache2 -> disabled (or masked); systemctl is-enabled nginx -> enabled. Tell the colleague where Apache went, or remove the package once they confirm."
            ),
          ],
        },
        {
          text: "The catalogue is back. Your manager asks for two things: proof that nginx will restart on its own if it crashes, and a way to check the service's recent errors quickly during the next incident.",
          ask: "What do you configure and which commands do you hand over?",
          parts: [
            part(
              "Automatic restart",
              "Adds a drop-in override rather than editing the packaged unit: sudo systemctl edit nginx with [Service] Restart=on-failure and RestartSec=5s, then systemctl daemon-reload (edit does it) and verifies with systemctl show nginx -p Restart; notes that an override survives package upgrades.",
              "sudo systemctl edit nginx opens a drop-in (/etc/systemd/system/nginx.service.d/override.conf); add:\n[Service]\nRestart=on-failure\nRestartSec=5s\nSave, then systemctl daemon-reload if needed and verify: systemctl show nginx -p Restart -p RestartSec. Editing the file under /usr/lib/systemd/system would be overwritten by the next package update; the drop-in is not. Test by sudo kill -9 the master PID and watching systemctl status show it come back after 5 s."
            ),
            part(
              "Fast log triage",
              "Gives journalctl commands scoped to the unit and time: journalctl -u nginx -b (this boot), -p err (errors and worse), --since '1 hour ago', -f to follow, and mentions the nginx error log path as the application-level view.",
              "journalctl -u nginx -b -p err --no-pager shows this boot's errors for the unit; journalctl -u nginx --since '30 min ago' narrows by time; journalctl -u nginx -f follows live during an incident. For request-level detail, tail -f /var/log/nginx/error.log. Make sure persistent journaling is on (Storage=persistent in /etc/systemd/journald.conf) so pre-reboot entries are available with journalctl -b -1."
            ),
          ],
        },
      ],
    },
    {
      slug: "grow-lvm-volume-new-disk",
      objective: "Disk partitioning, LVM concepts, and filesystem types (ext4, xfs, btrfs)",
      kind: "build",
      title: "Grow a database volume with a new disk and LVM",
      brief:
        "On db02 at Larkspur Analytics (Rocky Linux), the PostgreSQL data directory /var/lib/pgsql is on logical volume lv_data in volume group vg_data, formatted XFS, 200 GB and 95% full. Operations has attached a new 500 GB disk that appears as /dev/sdc with no partition table. The database must stay online. You will add the new disk to the volume group, grow the logical volume by 300 GB (keeping the rest of the new disk free for later), grow the filesystem, and prove the result.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the procedure: the commands in order, the before/after sizes you expect, the filesystem step and why it differs by filesystem type, and the safety checks.",
          parts: [
            part(
              "Adding the disk to LVM",
              "Confirms the device (lsblk, no existing data), initialises it as a physical volume (pvcreate /dev/sdc, optionally on a partition), extends the volume group (vgextend vg_data /dev/sdc), and checks with pvs/vgs that vg_data now has roughly 500 GB free.",
              "lsblk -f /dev/sdc to confirm it is empty. sudo pvcreate /dev/sdc (or partition it first with parted and use /dev/sdc1). sudo vgextend vg_data /dev/sdc. sudo vgs vg_data should show VSize about 700 GB with about 500 GB VFree (200 GB in use by lv_data)."
            ),
            part(
              "Growing the logical volume",
              "Extends lv_data by exactly 300 GB (lvextend -L +300G /dev/vg_data/lv_data), not +100%FREE, leaving about 200 GB free in the VG; verifies with lvs that lv_data is about 500 GB.",
              "sudo lvextend -L +300G /dev/vg_data/lv_data -- the volume goes from 200 GB to 500 GB and vg_data keeps about 200 GB free for later. (lvextend -l +100%FREE would take everything, which the brief rules out.) sudo lvs vg_data shows lv_data LSize 500.00g; vgs shows VFree about 200 GB."
            ),
            part(
              "Growing the filesystem",
              "Grows XFS online with xfs_growfs on the mount point (xfs_growfs /var/lib/pgsql), or uses lvextend -r to resize in one step; explains that ext4 would use resize2fs on the device (also online for growth), and that XFS can grow but never shrink, while btrfs resizes with btrfs filesystem resize.",
              "XFS is resized by mount point while mounted: sudo xfs_growfs /var/lib/pgsql. (Or do both steps at once: sudo lvextend -r -L +300G /dev/vg_data/lv_data, where -r calls the right tool.) Had it been ext4, the command is sudo resize2fs /dev/vg_data/lv_data, also online for growing. Note the difference: XFS can only grow, never shrink, so sizing is a one-way decision; btrfs uses btrfs filesystem resize max /mountpoint."
            ),
            part(
              "Safety checks and proof",
              "Takes a recent backup/snapshot before changing storage, keeps the database online (no unmount needed), and proves the result with df -h /var/lib/pgsql showing about 500 GB and a use percentage near 38%, plus lsblk/lvs; checks dmesg for errors.",
              "Before: confirm last night's backup is good (or take an LVM snapshot if space allows). No unmount or service stop is needed for online growth. After: df -h /var/lib/pgsql shows Size about 500G and Use% around 38% (190 GB of 500); lsblk shows sdc under vg_data-lv_data; lvs/vgs match the plan; dmesg | tail is clean; the database still answers queries."
            ),
          ],
        },
      ],
    },
    {
      slug: "packages-two-distributions",
      objective: "Package management across distributions (apt, dnf/yum, pacman, rpm)",
      kind: "build",
      title: "Manage the same package tasks on a Debian-family and a Red Hat-family host",
      brief:
        "Tidewater Clinics runs app servers on Ubuntu (apt/dpkg) and on Rocky Linux (dnf/rpm). You have four tasks to carry out identically on both: install the nginx web server and confirm the installed version; find out which package owns /etc/nginx/nginx.conf and list every file that package installed; prevent the kernel package from being upgraded during an upcoming freeze while still allowing other updates; and, on the Rocky host only, verify whether any files of the nginx package have been modified since installation. Write the exact commands for each distribution family.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the commands for each task on both hosts, and explain the one place the two families differ in approach.",
          parts: [
            part(
              "Install and confirm the version",
              "Ubuntu: sudo apt update && sudo apt install nginx, then dpkg -l nginx or apt policy nginx (or nginx -v). Rocky: sudo dnf install nginx, then rpm -q nginx or dnf info --installed nginx.",
              "Ubuntu: sudo apt update; sudo apt install -y nginx; confirm with dpkg -l nginx (ii = installed) or apt policy nginx for the installed and candidate versions. Rocky: sudo dnf install -y nginx; confirm with rpm -q nginx (prints name-version-release.arch) or dnf list --installed nginx."
            ),
            part(
              "Which package owns a file, and what it installed",
              "Ubuntu: dpkg -S /etc/nginx/nginx.conf and dpkg -L <package>. Rocky: rpm -qf /etc/nginx/nginx.conf and rpm -ql <package> (or dnf provides). Notes the owner may be a sub-package such as nginx-common on Ubuntu or nginx-core/nginx on Rocky.",
              "Ubuntu: dpkg -S /etc/nginx/nginx.conf (on Ubuntu this is typically owned by nginx-common, not nginx), then dpkg -L nginx-common to list its files. Rocky: rpm -qf /etc/nginx/nginx.conf, then rpm -ql nginx (or nginx-core, depending on which package rpm -qf names). dnf provides /etc/nginx/nginx.conf also works and can search packages not yet installed."
            ),
            part(
              "Hold the kernel during the freeze",
              "Ubuntu: sudo apt-mark hold linux-image-generic (and the related meta/headers packages), check with apt-mark showhold, release with apt-mark unhold. Rocky: dnf versionlock add kernel (python3-dnf-plugin-versionlock) or exclude=kernel* in /etc/dnf/dnf.conf or --exclude=kernel* per run; check/remove with dnf versionlock list / delete.",
              "Ubuntu: sudo apt-mark hold linux-image-generic linux-headers-generic (or the specific linux-image-* packages); apt-mark showhold lists them; apt upgrade then skips them; sudo apt-mark unhold ... after the freeze. Rocky: install the versionlock plugin (sudo dnf install python3-dnf-plugin-versionlock) and run sudo dnf versionlock add kernel kernel-core; dnf versionlock list shows it; or add exclude=kernel* to /etc/dnf/dnf.conf (affects every transaction) or pass --exclude=kernel* to one dnf update."
            ),
            part(
              "Integrity check on Rocky, and the family difference",
              "Rocky: rpm -V nginx (and rpm -Va for everything) reads the attribute flags (S size, 5 MD5/digest, M mode, c marks config files); explains the main difference: apt/dnf resolve dependencies from repositories while dpkg/rpm act on local package files, so dependency-aware operations go through apt/dnf and queries through dpkg/rpm. Mentioning Debian's debsums as the equivalent is a plus.",
              "rpm -V nginx prints nothing when every file matches; otherwise a line per changed file with flags such as S.5....T. c /etc/nginx/nginx.conf, where 5 means the digest changed, S size, T mtime and the c marks a config file (expected to differ). rpm -Va checks every package. The equivalent on Ubuntu needs the debsums package. The families differ in layering: dpkg and rpm install/query individual package files with no dependency resolution, while apt and dnf fetch from repositories and resolve dependencies -- so install/upgrade/hold go through apt or dnf, and 'which package owns this file' goes to dpkg or rpm."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Services and User Management (20%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "onboard-contractor-account",
      objective: "Creating and managing users and groups (useradd, usermod, groups)",
      kind: "build",
      title: "Onboard a contractor with an expiring account and the right groups",
      brief:
        "Brightwater Civil Engineering is bringing on a contractor, Jalen Morales (username jmorales), to work on the deployment tooling on build01 until 31 January 2027. Jalen needs a home directory and a bash shell, membership of a new group 'devops', and later also the existing 'docker' group -- without losing any group already held. Security requires that the account stop working automatically on the end date, that a locked account can be reactivated without recreating it, and that you prove the final state with query commands rather than by reading /etc/passwd by eye.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the commands to create the group and account, add the extra group later, lock and unlock the account, and verify everything.",
          parts: [
            part(
              "Create the group and the account",
              "groupadd devops, then useradd with a home directory, bash shell, supplementary group and expiry: sudo useradd -m -s /bin/bash -G devops -e 2027-01-31 jmorales, followed by setting an initial password (passwd jmorales) or forcing a change on first login (chage -d 0).",
              "sudo groupadd devops\nsudo useradd -m -s /bin/bash -G devops -e 2027-01-31 jmorales\nsudo passwd jmorales (set a temporary password) and sudo chage -d 0 jmorales so Jalen must change it at first login. -m creates /home/jmorales from /etc/skel, -s sets the shell, -G adds the supplementary group (the primary group defaults to a private group jmorales), -e sets the account expiry date."
            ),
            part(
              "Add the docker group later without losing devops",
              "Uses usermod -aG docker jmorales, explaining that -G without -a replaces the supplementary group list (dropping devops), and that the change takes effect at the next login.",
              "sudo usermod -aG docker jmorales. The -a (append) matters: sudo usermod -G docker jmorales alone would set the supplementary groups to exactly 'docker' and silently remove devops. Jalen has to log out and back in (or run newgrp docker) before the new group shows in id."
            ),
            part(
              "Lock, unlock and expiry",
              "Locks with usermod -L jmorales (or passwd -l), which prefixes the password hash with ! so password login fails while the account and files remain; unlocks with usermod -U (passwd -u); adjusts the end date with chage -E 2027-01-31 or usermod -e; notes that a lock does not stop SSH key login unless the account is also expired or the shell changed.",
              "Lock: sudo usermod -L jmorales (puts a ! in front of the hash in /etc/shadow; nothing is deleted). Unlock: sudo usermod -U jmorales. The end date is already set, and can be changed with sudo chage -E 2027-02-28 jmorales (or usermod -e). To stop every login method immediately, expire the account (chage -E 0) -- a password lock alone leaves SSH key authentication working."
            ),
            part(
              "Verification",
              "Verifies with id jmorales (uid, gid, groups), getent group devops docker (members), getent passwd jmorales (home and shell), chage -l jmorales (account expires 31 Jan 2027), and ls -ld /home/jmorales (owner and 750/700 mode).",
              "id jmorales -> uid, gid=jmorales, groups=jmorales,devops,docker. getent group devops -> devops:x:1005:jmorales. getent passwd jmorales -> .../home/jmorales:/bin/bash. sudo chage -l jmorales -> 'Account expires: Jan 31, 2027' and 'Password must be changed' at first login. ls -ld /home/jmorales -> drwxr-x--- (or drwx------) jmorales jmorales. passwd -S jmorales shows L while locked, P when usable."
            ),
          ],
        },
      ],
    },
    {
      slug: "shared-directory-sgid-sticky-suid-audit",
      objective: "Special permissions: SUID, SGID, sticky bit",
      kind: "build",
      title: "Set up a shared project directory and audit SUID binaries",
      brief:
        "The 'atlas' team at Copperline Media needs /srv/projects/atlas on a shared server. Everyone in group atlas must be able to create and edit files there; files created by one member must automatically belong to the atlas group so others can edit them; nobody outside the group may enter. Inside it, a subdirectory 'dropbox' should let members add files but only delete their own. Separately, the security team wants a list of every set-user-ID executable on the system and an explanation of why /usr/bin/passwd legitimately needs that bit while a set-user-ID shell script would be a problem.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the commands and resulting modes for both directories, the SUID audit command, and the explanations.",
          parts: [
            part(
              "The shared directory",
              "Sets group ownership to atlas, mode 2770 (rwxrws---): group write plus SGID so new files inherit the atlas group, no access for others; verifies with ls -ld showing drwxrws---.",
              "sudo mkdir -p /srv/projects/atlas\nsudo chgrp atlas /srv/projects/atlas\nsudo chmod 2770 /srv/projects/atlas\nls -ld shows drwxrws--- root atlas. The 2 (SGID on a directory) makes every new file and subdirectory take the group atlas instead of the creator's primary group, so teammates can edit each other's files; 770 keeps others out entirely."
            ),
            part(
              "The dropbox",
              "Adds the sticky bit so only a file's owner (or root/directory owner) can delete or rename it: mode 3770 (SGID + sticky) -> drwxrws--T; explains the capital T means sticky without others-execute, and that /tmp's 1777 (drwxrwxrwt) is the same idea for everyone.",
              "sudo mkdir /srv/projects/atlas/dropbox; sudo chgrp atlas /srv/projects/atlas/dropbox; sudo chmod 3770 /srv/projects/atlas/dropbox. ls -ld -> drwxrws--T: the 1 (sticky) means a member can add files but remove only their own, the 2 keeps group inheritance. The uppercase T appears because others have no execute bit; on /tmp (mode 1777, drwxrwxrwt) it shows as a lowercase t."
            ),
            part(
              "SUID audit",
              "Finds set-user-ID files with find / -xdev -type f -perm -4000 (or -perm /6000 for SUID or SGID) and saves the list as a baseline to diff later; a reading of an ls -l line such as -rwsr-xr-x (s in the owner execute position) is expected.",
              "sudo find / -xdev -type f -perm -4000 -ls 2>/dev/null > /root/suid-baseline.txt (add -perm /6000 to include SGID executables). In ls -l, SUID shows as s in the owner's execute slot: -rwsr-xr-x root root /usr/bin/passwd. Keep the baseline and diff it after changes or during an incident; anything new or in /tmp or a home directory is a red flag."
            ),
            part(
              "Why passwd needs SUID and a script must not have it",
              "Explains that passwd must write /etc/shadow, which only root can modify, so it runs with the owner's (root's) effective UID; a set-UID shell script is ignored by the kernel on Linux (the bit is not honoured for interpreted scripts) and would be dangerous if honoured because the interpreter and its environment can be manipulated -- use sudo with a specific rule instead.",
              "/usr/bin/passwd lets an ordinary user change their own password, which means writing to /etc/shadow (mode 640, root-owned). The SUID bit makes passwd run with root's effective UID just for that, and the program itself checks that you only change your own entry. A SUID shell script is different: Linux ignores SUID on interpreted scripts because the interpreter is started separately and could be fed a different script or environment (PATH, IFS) between the check and the run. If someone 'needs' it, give them a precise sudoers rule for the one command instead."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Troubleshooting (22%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "server-cannot-resolve-names",
      objective: "Diagnosing network issues: ip, ping, traceroute, ss, DNS resolution",
      kind: "case",
      title: "Find out why a server can reach the internet but not by name",
      brief:
        "app03 at Saltmarsh Software (Ubuntu, netplan with systemd-resolved) cannot pull packages this morning: apt fails with 'Temporary failure resolving'. Its address is static on 10.0.0.23/24 with gateway 10.0.0.1. Head office decommissioned an old DNS server over the weekend and announced a new resolver at 10.0.0.54. Work from the command output to the fix, and make the fix permanent in the right place.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "$ ip -br addr\nlo               UNKNOWN        127.0.0.1/8 ::1/128\nens18            UP             10.0.0.23/24 fe80::5054:ff:fe12:3456/64\n\n$ ip route\ndefault via 10.0.0.1 dev ens18 proto static\n10.0.0.0/24 dev ens18 proto kernel scope link src 10.0.0.23\n\n$ ping -c 2 10.0.0.1\n2 packets transmitted, 2 received, 0% packet loss\n\n$ ping -c 2 1.1.1.1\n2 packets transmitted, 2 received, 0% packet loss\n\n$ ping -c 2 archive.ubuntu.com\nping: archive.ubuntu.com: Temporary failure in name resolution",
          ask: "Which layers have you already proven working, what is the fault, and what do you run next to pin it down?",
          parts: [
            part(
              "What works",
              "Concludes the interface, addressing, local subnet, default route and internet reachability by IP are all fine (link up, correct /24, gateway and 1.1.1.1 answer), so the fault is name resolution specifically, not connectivity.",
              "Layer by layer: the link is UP with the right 10.0.0.23/24; the default route points at 10.0.0.1; the gateway answers; an internet address (1.1.1.1) answers, so routing and NAT out to the internet work. Only the name lookup fails ('Temporary failure in name resolution'), so this is a DNS problem on the client or its configured resolver, not a network outage."
            ),
            part(
              "Next commands",
              "Checks which resolver the system uses (resolvectl status, or cat /etc/resolv.conf noting it is a stub managed by systemd-resolved) and queries the resolvers directly with dig/nslookup (dig @10.0.0.53 archive.ubuntu.com, dig @10.0.0.54 ...) to see whether the configured server answers at all.",
              "resolvectl status (or cat /etc/resolv.conf, which on this system points at the 127.0.0.53 stub) shows the DNS server the host is configured to use. Then test the resolvers directly: dig @<configured server> archive.ubuntu.com and dig @10.0.0.54 archive.ubuntu.com. If the configured one times out and the new one answers, the client is simply pointed at the decommissioned server."
            ),
          ],
        },
        {
          text:
            "$ resolvectl status ens18\nLink 2 (ens18)\n    Current Scopes: DNS\n         Protocols: +DefaultRoute -LLMNR -mDNS -DNSOverTLS DNSSEC=no/unsupported\nCurrent DNS Server: 10.0.0.53\n       DNS Servers: 10.0.0.53\n\n$ dig +short @10.0.0.53 archive.ubuntu.com\n;; communications error to 10.0.0.53#53: timed out\n;; no servers could be reached\n\n$ dig +short @10.0.0.54 archive.ubuntu.com\n185.125.190.83\n91.189.91.83",
          ask: "State the root cause and apply the fix the right way on this system, then verify.",
          parts: [
            part(
              "Root cause",
              "Identifies that the host's only configured DNS server, 10.0.0.53, is the decommissioned one and no longer answers, while the new resolver 10.0.0.54 works; the static netplan configuration was never updated.",
              "app03's static configuration names a single DNS server, 10.0.0.53 -- the server head office turned off over the weekend -- so every lookup times out. The new resolver at 10.0.0.54 answers correctly. Nothing else is wrong."
            ),
            part(
              "Fix in the right place",
              "Edits the netplan YAML (/etc/netplan/*.yaml) to set nameservers addresses to 10.0.0.54 (and ideally a second resolver), applies with netplan apply (or netplan try), and explicitly does not hand-edit /etc/resolv.conf because systemd-resolved manages it and the edit would be lost; on a NetworkManager system the equivalent is nmcli con mod <con> ipv4.dns 10.0.0.54 && nmcli con up <con>.",
              "Edit the netplan file (for example /etc/netplan/50-cloud-init.yaml or 01-netcfg.yaml):\n      nameservers:\n        addresses: [10.0.0.54, 10.0.0.55]\nthen sudo netplan try (auto-reverts in 120 s if you lose the session) and confirm, or sudo netplan apply. Do not edit /etc/resolv.conf: it is a symlink to systemd-resolved's stub file and the change would be overwritten. (On a NetworkManager host: nmcli con mod 'Wired connection 1' ipv4.dns '10.0.0.54 10.0.0.55' && nmcli con up 'Wired connection 1'.)"
            ),
            part(
              "Verification",
              "Confirms resolvectl status shows 10.0.0.54, that dig archive.ubuntu.com (no @) and getent hosts archive.ubuntu.com resolve, and that apt update succeeds; checks the change survives a reboot or a netplan apply.",
              "resolvectl status ens18 -> Current DNS Server: 10.0.0.54. dig +short archive.ubuntu.com returns addresses through the system resolver; getent hosts archive.ubuntu.com works (that exercises the same path apt uses). sudo apt update completes. Because the fix is in netplan, it persists across reboots -- confirm after the next maintenance reboot."
            ),
          ],
        },
      ],
    },
    {
      slug: "no-space-left-with-free-space",
      objective: "Diagnosing storage issues: full disks, inode exhaustion, failing drives",
      kind: "case",
      title: "Diagnose 'No space left on device' on a disk that is half empty",
      brief:
        "A PHP application on web04 at Kestrel Travel started failing overnight with 'No space left on device' when saving uploads. The on-call engineer ran df and says the disk is fine. The server has its application data on /var (ext4) and a separate data disk /dev/sdb mounted at /data. Find the real cause from the output, fix it without taking the site down longer than necessary, and handle what the kernel log then shows you.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "$ df -h /var\nFilesystem      Size  Used Avail Use% Mounted on\n/dev/sda3        80G   33G   44G  43% /var\n\n$ df -i /var\nFilesystem      Inodes   IUsed  IFree IUse% Mounted on\n/dev/sda3       5242880 5242880      0  100% /var\n\n$ sudo touch /var/tmp/test\ntouch: cannot touch '/var/tmp/test': No space left on device",
          ask: "What is the real cause, and how do you find what is consuming it?",
          parts: [
            part(
              "The real cause",
              "Identifies inode exhaustion: df -h shows 44 GB free but df -i shows 100% of 5,242,880 inodes used, so no new file can be created regardless of free blocks; a huge number of small files is the usual culprit.",
              "The filesystem is out of inodes, not bytes. ext4 on /dev/sda3 was created with 5,242,880 inodes and every one is in use (IUse% 100%), so creating any new file -- even an empty one, as the touch shows -- fails with ENOSPC while 44 GB of blocks sit free. Something is making millions of tiny files."
            ),
            part(
              "Finding the inode hog",
              "Counts files per directory rather than bytes: e.g. sudo du --inodes -x -d1 /var | sort -n | tail, or for d in /var/*; do echo \"$(sudo find $d -xdev | wc -l) $d\"; done | sort -n, then drills into the top directory.",
              "sudo du --inodes -x -d 1 /var 2>/dev/null | sort -n | tail -5 shows which top-level directory holds the most files (the -x stays on this filesystem). Repeat one level down inside the winner. The equivalent without du --inodes: for d in /var/*; do printf '%s %s\\n' \"$(sudo find \"$d\" -xdev | wc -l)\" \"$d\"; done | sort -n | tail. du -sh would mislead here, because the files are tiny."
            ),
          ],
        },
        {
          text:
            "$ sudo du --inodes -x -d 1 /var | sort -n | tail -3\n   51203   /var/log\n   88417   /var/cache\n 5098211   /var/lib\n\n$ sudo du --inodes -x -d 1 /var/lib | sort -n | tail -1\n 5071533   /var/lib/php\n\n$ sudo ls /var/lib/php/sessions | wc -l\n5071480\n\n$ sudo ls -l /var/lib/php/sessions | head -3\n-rw------- 1 www-data www-data 0 Jun 14 03:11 sess_0000a7c2d3...\n-rw------- 1 www-data www-data 0 Jun 14 03:11 sess_0000b19ef0...\n\n$ systemctl list-timers --all | grep -i phpsession\n(no output)",
          ask: "Fix it and stop it recurring, and say what you would not do.",
          parts: [
            part(
              "Clearing space",
              "Removes stale session files safely with find rather than rm with a glob (which would fail with 'argument list too long'): sudo find /var/lib/php/sessions -xdev -type f -name 'sess_*' -mtime +1 -delete (or -mmin based on the session lifetime), then confirms df -i shows inodes free and touch works.",
              "sudo find /var/lib/php/sessions -xdev -type f -name 'sess_*' -mmin +1440 -delete removes session files older than a day (longer than any legitimate session). Not rm /var/lib/php/sessions/sess_* -- five million names overflow the argument list. Afterwards df -i /var shows IUse% well under 100 and sudo -u www-data touch /var/lib/php/sessions/x works (then remove it). The site recovers without a restart."
            ),
            part(
              "Preventing recurrence",
              "Restores the session garbage collection (the distribution's phpsessionclean timer/cron, or PHP's session.gc_probability settings), confirms it is enabled and firing, and adds monitoring on inode usage (df -i) alongside bytes.",
              "The distribution's cleanup job is missing: on Debian/Ubuntu that is the phpsessionclean.timer -- reinstall or re-enable it (sudo systemctl enable --now phpsessionclean.timer) and check systemctl list-timers shows the next run; or set session.gc_probability/gc_divisor in php.ini so PHP sweeps old sessions itself. Add an alert on df -i for every filesystem (for example at 80% inodes), since byte-based alerts missed this entirely."
            ),
            part(
              "What not to do",
              "Does not reformat or run a risky resize to add inodes on a live filesystem (ext4 inode count is fixed at mkfs), does not delete current session files indiscriminately (logs users out), and does not just reboot.",
              "Do not try to 'add inodes' -- on ext4 the inode count is fixed when the filesystem is made; the only way to get more is to recreate it (or move the directory to a filesystem made with -i for small files, or to XFS/btrfs). Do not delete all sessions blindly: that logs every current user out mid-booking; the -mmin filter keeps live sessions. A reboot would change nothing."
            ),
          ],
        },
        {
          text:
            "While you are on the box, you check the kernel log:\n\n$ sudo dmesg -T | grep -i -E 'sdb|I/O error' | tail -4\n[Tue Nov  3 02:14:09 2026] blk_update_request: I/O error, dev sdb, sector 488397168 op 0x0:(READ) flags 0x80700 phys_seg 1 prio class 0\n[Tue Nov  3 02:14:09 2026] sd 2:0:1:0: [sdb] tag#19 Sense Key : Medium Error [current]\n[Tue Nov  3 02:14:09 2026] sd 2:0:1:0: [sdb] tag#19 Add. Sense: Unrecovered read error\n[Tue Nov  3 02:51:33 2026] blk_update_request: I/O error, dev sdb, sector 488397176 op 0x0:(READ) flags 0x80700 phys_seg 1 prio class 0\n\n$ sudo smartctl -H /dev/sdb\nSMART overall-health self-assessment test result: FAILED!\nDrive failure expected in less than 24 hours. SAVE ALL DATA.",
          ask: "What do you do about /dev/sdb, in what order?",
          parts: [
            part(
              "Order of operations for a failing drive",
              "Treats it as imminent failure: back up /data now (rsync to another disk/host, or ddrescue an image if the filesystem is damaged) before anything else, reduce writes/mount read-only if possible, check smartctl -a for reallocated/pending sectors, then schedule replacement and restore; does not run fsck first on a dying disk.",
              "1) Copy the data off immediately while it still reads: rsync -aHAX /data/ backup-host:/data-copy/ (or, if files are already unreadable, image the device with ddrescue to a healthy disk and recover from the image). 2) Reduce further stress: stop services writing to /data and remount read-only if the application allows. 3) Record the evidence: smartctl -a /dev/sdb (Reallocated_Sector_Ct, Current_Pending_Sector, Offline_Uncorrectable) and the dmesg lines, for the hardware ticket. 4) Replace the drive, create the filesystem on the new disk, restore from the copy, verify checksums, re-mount at /data. Do not run fsck on the failing disk first -- it writes to a dying device and can finish it off before the data is saved."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Security (18%) -- 1 lab
    // -----------------------------------------------------------------------
    {
      slug: "harden-sshd-without-lockout",
      objective: "SSH hardening: key-only auth, disabling root login",
      kind: "build",
      title: "Harden sshd on a remote server without locking yourself out",
      brief:
        "bastion01 at Greywater Energy is reachable only over SSH from the office; there is no console access. Today root can log in with a password and so can every local user. The security standard requires: no root login over SSH, public-key authentication only (no passwords, no keyboard-interactive), and SSH access limited to members of the group 'sshusers'. You administer it as user 'ops' from your laptop. Write the change so that a mistake cannot leave the server unreachable.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the sshd configuration changes, the safe order you apply them in, and the tests that prove both that you can still get in and that the old paths are closed.",
          parts: [
            part(
              "Configuration directives",
              "In /etc/ssh/sshd_config (or a file in /etc/ssh/sshd_config.d/): PermitRootLogin no, PasswordAuthentication no, KbdInteractiveAuthentication no (the old name ChallengeResponseAuthentication is deprecated), PubkeyAuthentication yes, AllowGroups sshusers; mentions UsePAM stays yes and that drop-in files in sshd_config.d are read first.",
              "Create /etc/ssh/sshd_config.d/10-hardening.conf:\nPermitRootLogin no\nPubkeyAuthentication yes\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nAllowGroups sshusers\nFiles under sshd_config.d are included at the top of sshd_config, and for most directives the first value wins, so check nothing earlier there sets PasswordAuthentication yes. Leave UsePAM yes (account and session handling); it does not re-enable password prompts once the two authentication directives are off."
            ),
            part(
              "Safe order of operations",
              "Before changing anything: create group sshusers and add ops (and any other admins), install your public key in ~ops/.ssh/authorized_keys with correct modes (700/600), and prove key login works in a second terminal; keep the current session open; validate with sshd -t; then reload (not restart) sshd; only after a successful new key-only login close the old session.",
              "1) sudo groupadd sshusers; sudo usermod -aG sshusers ops (and the other admins). 2) From the laptop: ssh-copy-id ops@bastion01 (or append the key to ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys). 3) In a second terminal: ssh -o PreferredAuthentications=publickey -o PasswordAuthentication=no ops@bastion01 -- it must work before going further. 4) Write the drop-in, then sudo sshd -t to validate syntax (no output = fine). 5) sudo systemctl reload sshd (reload keeps existing sessions; a restart also keeps them, but reload is enough). 6) Open a third, fresh session with the key. Only when that works, close the old sessions."
            ),
            part(
              "Proving the old paths are closed",
              "Tests from the laptop: ssh root@bastion01 is refused; ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no ops@bastion01 fails with 'Permission denied (publickey)'; a user not in sshusers is refused even with a valid key; checks the auth log/journal for the matching messages; sshd -T confirms the effective settings.",
              "sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication|kbdinteractiveauthentication|allowgroups' shows the effective values (no / no / no / sshusers). From the laptop: ssh root@bastion01 -> Permission denied; ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no ops@bastion01 -> 'Permission denied (publickey)' with no password prompt; a test user with a key but outside sshusers -> denied, and journalctl -u ssh shows 'User testuser from ... not allowed because none of user's groups are listed in AllowGroups'."
            ),
            part(
              "Rollback and follow-ups",
              "Has a rollback ready (remove the drop-in and reload, from the still-open session) and names sensible follow-ups: key passphrases/agent, fail2ban or rate limiting, restricting the listening address or firewall to office IPs, and keeping sudo (not root) for privilege.",
              "If the new login fails, in the still-open session: sudo rm /etc/ssh/sshd_config.d/10-hardening.conf && sudo systemctl reload sshd, then investigate. Follow-ups: require passphrases on private keys and use ssh-agent; firewall port 22 to the office range (and consider fail2ban for brute-force noise); admins escalate with sudo under their own accounts, which keeps an audit trail root login never gave."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Automation, Orchestration, and Scripting (17%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "archive-old-logs-script",
      objective: "Bash scripting fundamentals: variables, conditionals, loops, functions",
      kind: "build",
      title: "Write a Bash script that archives old application logs safely",
      brief:
        "Wrenfield Payroll's application writes daily logs to /var/log/payroll as files named like app-2026-10-30.log. Operations wants a script, /usr/local/bin/archive-logs.sh, that: takes the source directory and an archive directory as arguments with sensible defaults; refuses to run if either directory is missing; finds log files older than 7 days; compresses each into the archive directory as <name>.gz (removing the original only after a successful compression); prints how many files it archived; exits 0 on success and non-zero on any failure; and can be dry-run with --dry-run so nothing is changed. Filenames may contain spaces.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the script, then explain the choices that make it safe: strict mode, argument handling, the loop over files, and the exit codes.",
          parts: [
            part(
              "The script",
              "A working Bash script with a shebang, set -euo pipefail (or equivalent error handling), variables for the two directories with defaults, a --dry-run flag, a directory existence check with a non-zero exit, find -mtime +7 piped safely (-print0 / read -d '' or find -exec), gzip of each file into the archive directory followed by removal of the original only on success, a counter, and a summary line.",
              "#!/usr/bin/env bash\nset -euo pipefail\n\nSRC=\"${1:-/var/log/payroll}\"\nDEST=\"${2:-/var/archive/payroll}\"\nDRY_RUN=0\nfor arg in \"$@\"; do [[ \"$arg\" == \"--dry-run\" ]] && DRY_RUN=1; done\n\ndie() { echo \"archive-logs: $*\" >&2; exit 1; }\n\n[[ -d \"$SRC\" ]]  || die \"source directory $SRC does not exist\"\n[[ -d \"$DEST\" ]] || die \"archive directory $DEST does not exist\"\n\ncount=0\nwhile IFS= read -r -d '' file; do\n  name=$(basename \"$file\")\n  if (( DRY_RUN )); then\n    echo \"would archive: $file -> $DEST/$name.gz\"\n  else\n    gzip -c \"$file\" > \"$DEST/$name.gz\" && rm -f \"$file\"\n  fi\n  count=$((count + 1))\ndone < <(find \"$SRC\" -maxdepth 1 -type f -name '*.log' -mtime +7 -print0)\n\necho \"archived $count file(s) from $SRC to $DEST\"\n\n(The positional defaults mean './archive-logs.sh --dry-run' would treat --dry-run as SRC; parsing flags before positionals, or using getopts, is the cleaner version.)"
            ),
            part(
              "Strict mode and argument handling",
              "Explains set -e (exit on error), -u (unset variable is an error), -o pipefail (a failing command in a pipeline fails the pipeline); defaults via ${1:-default}; and why the directory checks use [[ -d ]] with an explicit error to stderr and exit 1.",
              "set -euo pipefail stops the script at the first failing command, treats a typo'd or missing variable as an error instead of expanding to nothing (which could turn rm -f \"$DEST/\" into something dangerous), and makes a failure inside a pipeline count. ${1:-/var/log/payroll} uses the argument if given, otherwise the default. The [[ -d ]] checks fail fast with a message on stderr and exit code 1, so a cron run with a missing mount does nothing rather than archiving into the wrong place."
            ),
            part(
              "The file loop",
              "Uses find ... -mtime +7 -print0 with while read -r -d '' (or find -exec) so names with spaces or newlines are handled, quotes every expansion, limits to -maxdepth 1 -type f, and removes the original only if gzip succeeded (&&).",
              "find with -print0 and read -d '' passes filenames NUL-separated, so 'app 2026-10-30.log' is one file, not three words; every \"$file\" is quoted for the same reason. -mtime +7 selects files last modified more than 7 days ago; -maxdepth 1 -type f avoids descending into subdirectories or touching directories. gzip -c writes the compressed copy to the archive directory; only if that returns success does && rm -f delete the original, so a full archive disk never loses a log."
            ),
            part(
              "Exit codes and testing",
              "States exit 0 on success and 1 on a failed precondition (set -e makes any failed command non-zero too); tests with --dry-run, with a missing directory (expects exit 1), with a file containing a space, and checks shellcheck; verifies with echo $? and ls of the archive.",
              "Success prints the summary and exits 0; a missing directory exits 1 via die; any gzip or rm failure exits non-zero through set -e, so a scheduler can alert on it. Test: run with --dry-run and confirm the list; run with a bogus source and check echo $? prints 1; create 'touch -d \"10 days ago\" \"/var/log/payroll/app 2026-10-28.log\"' and confirm it archives as one file; run shellcheck archive-logs.sh for quoting mistakes."
            ),
          ],
        },
      ],
    },
    {
      slug: "schedule-jobs-cron-and-systemd-timer",
      objective: "Shell automation scheduling: cron, at, and systemd timers",
      kind: "build",
      title: "Schedule three jobs with cron, a systemd timer and at",
      brief:
        "Wrenfield Payroll now has the archive script from the previous lab at /usr/local/bin/archive-logs.sh. Operations wants it to run at 02:30 every weekday, Monday to Friday. Two more schedules are needed: a health-check script /usr/local/bin/healthcheck.sh every 15 minutes around the clock, and a report script /usr/local/bin/monthly-report.sh at 00:05 on the first day of every month. Because the log server is sometimes powered off overnight, the archive job should run on the next boot if it was missed, and its output must be easy to read later. Finally, a one-off: run /usr/local/bin/rotate-keys.sh exactly once, two hours from now, after the current maintenance window.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the crontab lines, the systemd service and timer for the archive job with catch-up, the one-off job, and the commands that verify each schedule.",
          parts: [
            part(
              "Crontab lines",
              "Writes correct five-field entries: '*/15 * * * * /usr/local/bin/healthcheck.sh' and '5 0 1 * * /usr/local/bin/monthly-report.sh' (and, if cron is used for the archive job, '30 2 * * 1-5 /usr/local/bin/archive-logs.sh'); installs them with crontab -e (or a file in /etc/cron.d with a user field) and notes cron's minimal PATH and that output is mailed unless redirected.",
              "crontab -e (as the service user) and add:\n*/15 * * * * /usr/local/bin/healthcheck.sh >> /var/log/healthcheck.log 2>&1\n5 0 1 * * /usr/local/bin/monthly-report.sh >> /var/log/monthly-report.log 2>&1\n(The archive job as cron would be 30 2 * * 1-5 /usr/local/bin/archive-logs.sh, but it moves to a timer below for catch-up.) Fields are minute hour day-of-month month day-of-week; 1-5 is Monday-Friday. Use full paths: cron's PATH is minimal, and redirect output or it goes to local mail."
            ),
            part(
              "systemd service and timer with catch-up",
              "Creates archive-logs.service (Type=oneshot, ExecStart=/usr/local/bin/archive-logs.sh) and archive-logs.timer with OnCalendar=Mon..Fri 02:30 and Persistent=true (runs at next boot if the last scheduled run was missed), enables the timer not the service, and explains that cron has no such catch-up (anacron only handles daily/weekly/monthly).",
              "/etc/systemd/system/archive-logs.service:\n[Unit]\nDescription=Archive payroll logs older than 7 days\n[Service]\nType=oneshot\nExecStart=/usr/local/bin/archive-logs.sh\n\n/etc/systemd/system/archive-logs.timer:\n[Unit]\nDescription=Run archive-logs on weekdays at 02:30\n[Timer]\nOnCalendar=Mon..Fri 02:30\nPersistent=true\n[Install]\nWantedBy=timers.target\n\nsudo systemctl daemon-reload && sudo systemctl enable --now archive-logs.timer. Persistent=true records the last run on disk and, if the machine was off at 02:30, fires the service shortly after the next boot -- cron would simply skip it (anacron only covers daily/weekly/monthly cadences). The timer's output lands in the journal automatically: journalctl -u archive-logs.service."
            ),
            part(
              "The one-off job",
              "Uses at: echo /usr/local/bin/rotate-keys.sh | at now + 2 hours (or at now + 2 hours then typing the command and Ctrl-D), checks the queue with atq, removes with atrm <job>, and notes the atd service must be running and the user allowed by /etc/at.allow//etc/at.deny; a systemd-run --on-active=2h alternative is also acceptable.",
              "echo '/usr/local/bin/rotate-keys.sh' | at now + 2 hours -- at prints the job number and time. atq lists pending jobs; atrm 3 cancels job 3; at -c 3 shows what job 3 will run. atd must be active (systemctl is-active atd). Alternative on a systemd-only box: sudo systemd-run --on-active=2h --unit=rotate-keys-once /usr/local/bin/rotate-keys.sh, then systemctl list-timers shows it."
            ),
            part(
              "Verifying the schedules",
              "crontab -l to read back the entries; systemctl list-timers --all showing archive-logs.timer with NEXT and LAST columns; systemd-analyze calendar 'Mon..Fri 02:30' to check the expression and see the next elapse; atq for the one-off; journalctl -u archive-logs.service after the first run; and a manual systemctl start archive-logs.service to test the service without waiting.",
              "crontab -l shows the two cron lines. systemd-analyze calendar 'Mon..Fri 02:30' prints the normalised form and 'Next elapse', proving the expression means what you think. systemctl list-timers --all shows archive-logs.timer with its NEXT time and, after the first run, LAST and the service it activates. sudo systemctl start archive-logs.service runs the job now as a test, and journalctl -u archive-logs.service shows its 'archived N file(s)' line. atq confirms the key-rotation job is queued for two hours out."
            ),
          ],
        },
      ],
    },
  ],
};
