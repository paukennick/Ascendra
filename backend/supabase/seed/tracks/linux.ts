// REQ-292 (Nick, 2026-11-14: "go deeper in Linux"): a Linux fundamentals
// course with no certification, and the Linux Foundation Certified System
// Administrator (LFCS) exam course.
//
// Red Hat (REQ-194): no Red Hat course is built or restored here. EX188 and
// EX280 were hidden on 2026-11-09 because Red Hat's trademark guidelines
// (redhat.com/en/about/trademark-guidelines-and-policies) say certification
// training needs a Red Hat certified training partner and bar using its
// course numbers; an RHCSA (EX200) course would hit the same two rules. Both
// courses here are distribution-neutral: they name apt and dnf side by side
// and never a Red Hat product or course number, as the LFCS itself does
// ("The exam is independent of distribution-specific tasks").
//
// LPIC-1 was considered and not built (REQ-292 report): the catalog already
// has CompTIA Linux+ (XK0-006, 2025) at the same level, LFCS now covers the
// hands-on side, LPI's version 5.0 objectives (exams 101-500 and 102-500,
// read on lpi.org 2026-11-14) still carry X11, MTA, printing and SysV
// runlevel topics, and LPI's own objectives page lists planned changes, so a
// new version is coming. Revisit when LPI publishes it.
//
// What was read, and when (all 2026-11-14):
//   - training.linuxfoundation.org/certification/linux-foundation-certified-
//     sysadmin-lfcs/ (page last modified 2026-10-30), read as HTML: five
//     domains at 25/25/20/20/10 with their competencies; online, proctored,
//     performance-based, 2 hours; $445 exam only; 12 months to schedule;
//     two exam attempts; two Killer.sh simulator attempts; certification
//     valid 2 years; no prerequisites; "independent of distribution-specific
//     tasks".
//   - docs.linuxfoundation.org/tc-docs/certification/instructions-lfcs-and-
//     lfce ("Important Instructions: LFCS"): 17-20 performance-based tasks,
//     67% to pass, 2 hours; man pages, /usr/share docs and distribution
//     packages allowed from the exam terminal; each task on a named host
//     reached by ssh; sudo -i for root; candidates installing packages should
//     know apt, dpkg, dnf and yum.
//   - man7.org pages (Linux man-pages 6.19 project and the packages' own
//     pages): bash(1), hier(7), chmod(1), find(1), grep(1), sed(1), ps(1),
//     kill(1), nice(1), df(1), lsof(8), tar(1), crontab(5), sudoers(5),
//     useradd(8), usermod(8), chage(1), setfacl(1), getfacl(1),
//     limits.conf(5), sysctl(8), sysctl.d(5), systemctl(1), journalctl(1),
//     systemd.unit(5), systemd.exec(5), systemd.timer(5),
//     systemd.automount(5), systemd-fstab-generator(8), bootup(7), fstab(5),
//     mount(8), nfs(5), auto.master(5), lvcreate(8), lvextend(8),
//     pvcreate(8), vgextend(8), mkswap(8), swapon(8), e2fsck(8),
//     xfs_repair(8), xfs_growfs(8), iostat(1), vmstat(8), free(1), ip(8),
//     ss(8), sshd(8), sshd_config(5), ssh-keygen(1), timedatectl(1),
//     hostnamectl(1), restorecon(8), semanage-fcontext(8),
//     semanage-boolean(8), sestatus(8), rpm(8), dpkg(1), git(1).
//   - apt(8) (manpages.debian.org, trixie); the DNF command reference
//     (dnf.readthedocs.io); chronyc(1) (chrony-project.org, 4.6); virsh
//     (libvirt.org); the nftables man page (netfilter.org); openssl-x509 and
//     openssl-req (docs.openssl.org); the kernel's bonding HOWTO
//     (kernel.org); nginx's "Using nginx as HTTP load balancer"; podman-run
//     (docs.podman.io); SSSD introduction (sssd.io); git-merge (git-scm.com);
//     the Filesystem Hierarchy Standard 3.0 (refspecs.linuxfoundation.org);
//     linuxfoundation.org/legal/trademarks ("Linux Foundation Certified
//     System Administrator" is a registered mark, so the title carries the
//     symbol as the CKA title does).
// Command outputs quoted in labs are authored in each tool's style; the
// facts they carry are the pages'. Objectives are our own wording; the LFCS
// units carry the Linux Foundation's competency lines as `outline` headings.

import type { SeedTrack, UnitSource } from "../data";
import { source } from "../sources";

const CHECKED = "2026-11-14";
const VERIFIED_AT = "2026-11-14T00:00:00Z";
const REVIEW_DUE_AT = "2027-11-14T00:00:00Z";

const ref = (title: string, url: string, keyValues?: string[]): UnitSource =>
  keyValues ? { title, url, kind: "reference", checkedAt: CHECKED, keyValues } : { title, url, kind: "reference", checkedAt: CHECKED };
const MAN = "https://man7.org/linux/man-pages/";
const man = (page: string, section: string, keyValues?: string[]) => ref(`${page}(${section}), man7.org`, `${MAN}man${section[0]}/${page}.${section}.html`, keyValues);

const R = {
  bash: man("bash", "1", [
    "Single quotes keep every character literal; double quotes still expand $variables, $(command) and backquotes",
    "set -e, set -u and set -o pipefail make a script stop on a failed command, an unset variable and a failed pipeline stage",
  ]),
  hier: man("hier", "7"),
  fhs: ref("Filesystem Hierarchy Standard 3.0 (refspecs.linuxfoundation.org)", "https://refspecs.linuxfoundation.org/FHS_3.0/fhs/index.html"),
  find: man("find", "1"),
  tar: man("tar", "1"),
  grep: man("grep", "1"),
  sed: man("sed", "1"),
  chmod: man("chmod", "1", [
    "In octal modes read is 4, write 2 and execute 1; the leading digit sets setuid (4), setgid (2) and the sticky bit (1)",
  ]),
  useradd: man("useradd", "8"),
  usermod: man("usermod", "8", [
    "usermod -G replaces the user's supplementary groups; add -a (usermod -aG group user) to append; new group membership applies at the user's next login",
  ]),
  chage: man("chage", "1"),
  sudoers: man("sudoers", "5", [
    "Edit sudoers with visudo, which checks the syntax before saving; drop-in files go in /etc/sudoers.d",
  ]),
  setfacl: man("setfacl", "1", [
    "setfacl recalculates the ACL mask by default; the mask caps the effective rights of named users, named groups and the owning group",
  ]),
  getfacl: man("getfacl", "1"),
  limits: man("limits.conf", "5"),
  ps: man("ps", "1"),
  kill: man("kill", "1"),
  nice: man("nice", "1"),
  vmstat: man("vmstat", "8"),
  free: man("free", "1", [
    "free's available column estimates memory available for new applications without swapping; low free memory alone is not a problem",
  ]),
  apt: ref("apt(8), Debian trixie (manpages.debian.org)", "https://manpages.debian.org/trixie/apt/apt.8.en.html", [
    "apt is designed as an end-user tool whose behavior may change between versions; scripts should use apt-get and apt-cache",
  ]),
  dnf: ref("DNF command reference (dnf.readthedocs.io)", "https://dnf.readthedocs.io/en/latest/command_ref.html"),
  rpm: man("rpm", "8"),
  dpkg: man("dpkg", "1"),
  systemctl: man("systemctl", "1", [
    "systemctl enable --now starts a unit and enables it at boot in one step; after editing a unit file run systemctl daemon-reload",
  ]),
  systemdUnit: man("systemd.unit", "5", [
    "Drop-in files /etc/systemd/system/<unit>.d/*.conf are merged after the unit file in alphanumeric order; systemctl edit creates one",
  ]),
  systemdExec: man("systemd.exec", "5"),
  journalctl: man("journalctl", "1"),
  timer: man("systemd.timer", "5", [
    "A timer starts the service of the same name unless Unit= says otherwise; Persistent=true (OnCalendar= timers only) runs a missed job at the next start",
  ]),
  crontab: man("crontab", "5", [
    "In a crontab command an unescaped % becomes a newline and the rest goes to standard input; write \\% for a literal percent sign",
  ]),
  bootup: man("bootup", "7"),
  fstab: man("fstab", "5", [
    "The nofail mount option lets boot continue when the device is missing; an fstab entry that cannot be mounted otherwise can stop boot in emergency mode",
  ]),
  mount: man("mount", "8"),
  fstabGenerator: man("systemd-fstab-generator", "8"),
  df: man("df", "1"),
  lsof: man("lsof", "8", [
    "lsof +L1 lists open files with a link count below 1: deleted files whose space is not freed until the process holding them closes them or restarts",
  ]),
  lvcreate: man("lvcreate", "8"),
  lvextend: man("lvextend", "8", [
    "lvextend -r (--resizefs) grows the filesystem together with the logical volume",
  ]),
  pvcreate: man("pvcreate", "8"),
  vgextend: man("vgextend", "8"),
  xfsGrowfs: man("xfs_growfs", "8", [
    "XFS is grown while mounted with xfs_growfs; shrinking is only partly implemented (the last allocation group, never removing it), so plan XFS as grow-only",
  ]),
  e2fsck: man("e2fsck", "8", [
    "Never run e2fsck on a mounted filesystem (read-only checking with -n is the exception); unmount it or check from rescue mode",
  ]),
  xfsRepair: man("xfs_repair", "8"),
  mkswap: man("mkswap", "8"),
  swapon: man("swapon", "8", [
    "swapon rejects swap files with holes (and copy-on-write files such as on Btrfs without special handling); create the file with dd or fallocate where supported",
  ]),
  nfs: man("nfs", "5"),
  autoMaster: man("auto.master", "5"),
  automount: man("systemd.automount", "5"),
  iostat: man("iostat", "1", [
    "iostat -x %util is the share of time the device had I/O in flight; near 100% on a single disk means saturation (not reliable for RAID or SSD arrays)",
  ]),
  ip: man("ip", "8"),
  ss: man("ss", "8"),
  sshd: man("sshd", "8"),
  sshdConfig: man("sshd_config", "5", [
    "PermitRootLogin defaults to prohibit-password; test the configuration with sshd -t before restarting the service",
  ]),
  sshKeygen: man("ssh-keygen", "1", [
    "ssh-keygen with no arguments generates an Ed25519 key",
  ]),
  timedatectl: man("timedatectl", "1"),
  hostnamectl: man("hostnamectl", "1"),
  chronyc: ref("chronyc(1), chrony 4.6 (chrony-project.org)", "https://chrony-project.org/doc/4.6/chronyc.html"),
  nft: ref("nft(8), nftables (netfilter.org)", "https://www.netfilter.org/projects/nftables/manpage.html"),
  bonding: ref("Linux Ethernet Bonding Driver HOWTO (kernel.org)", "https://www.kernel.org/doc/html/latest/networking/bonding.html", [
    "Bonding mode 1 (active-backup) needs no switch support; mode 4 (802.3ad) needs LACP configured on the switch",
  ]),
  nginxLb: ref("Using nginx as HTTP load balancer (nginx.org)", "https://nginx.org/en/docs/http/load_balancing.html", [
    "nginx upstream balancing defaults to round-robin; least_conn and ip_hash are the other built-in methods",
  ]),
  sysctl: man("sysctl", "8", [
    "sysctl -w changes a kernel parameter until reboot; a file in /etc/sysctl.d/*.conf makes it persistent and sysctl --system reloads all of them",
  ]),
  sysctlD: man("sysctl.d", "5"),
  restorecon: man("restorecon", "8"),
  semanageFcontext: man("semanage-fcontext", "8", [
    "semanage fcontext -a records a persistent file-context rule; run restorecon afterward to apply it (chcon changes do not survive a relabel)",
  ]),
  semanageBoolean: man("semanage-boolean", "8"),
  sestatus: man("sestatus", "8"),
  virsh: ref("virsh (libvirt.org)", "https://www.libvirt.org/manpages/virsh.html"),
  podmanRun: ref("podman-run (docs.podman.io)", "https://docs.podman.io/en/latest/markdown/podman-run.1.html"),
  git: man("git", "1"),
  gitMerge: ref("git-merge (git-scm.com)", "https://git-scm.com/docs/git-merge"),
  opensslX509: ref("openssl-x509 (docs.openssl.org)", "https://docs.openssl.org/master/man1/openssl-x509/", [
    "openssl x509 -checkend N exits nonzero if the certificate expires within N seconds; -enddate -noout prints the expiry",
  ]),
  opensslReq: ref("openssl-req (docs.openssl.org)", "https://docs.openssl.org/master/man1/openssl-req/"),
  sssd: ref("SSSD introduction (sssd.io)", "https://sssd.io/docs/introduction.html"),
};

// ---------------------------------------------------------------------------
// Linux Fundamentals (LINUXFUND): no certification.
// ---------------------------------------------------------------------------
export const LINUXFUND_TRACK: SeedTrack = {
  code: "LINUXFUND",
  title: "Linux Fundamentals",
  description:
    "10-week hands-on start in Linux, for any distribution: the shell and its help, files and the filesystem hierarchy, text pipelines, users and permissions, processes, packages with apt and dnf, systemd services and logs, storage, networking and SSH, and shell scripts you can schedule. No certification; a foundation for CompTIA Linux+ and the LFCS.",
  trackType: "graduate",
  subcategorySlug: "operating-systems-servers",
  freshnessModel: "technology_aligned",
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  curriculum: {
    kind: "self_defined",
    name: "Linux Fundamentals 10-week syllabus, built on the Linux man-pages, the FHS 3.0 and the systemd documentation",
    version: "10-week plan (man-pages 6.19)",
    url: "https://man7.org/linux/man-pages/index.html",
    checkedAt: CHECKED,
  },
  units: [
    {
      title: "The shell & getting help",
      rangeLabel: "Week 1",
      gate: "Given a command you have never used, find out from the system itself what it does and which option you need, then run it correctly with quoting that survives spaces and special characters.",
      sources: [R.bash],
      objectives: [
        "Read a command line: the command, its options and its arguments",
        "Find help on the system with man, --help, apropos and the documents in /usr/share/doc",
        "Use tab completion, history and editing shortcuts to work faster",
        "Apply quoting and escaping correctly with single quotes, double quotes and backslashes",
        "Write command lines that use variables, globbing and command substitution",
      ],
    },
    {
      title: "Files, directories & the filesystem hierarchy",
      rangeLabel: "Week 2",
      gate: "Find where a program keeps its configuration, logs and data on an unfamiliar system, and locate every file matching a rule (name, size, age, owner) with one command.",
      sources: [R.hier, R.fhs, R.find, R.tar],
      objectives: [
        "Navigate the filesystem with absolute and relative paths",
        "Explain where configuration, logs, programs and user data live under the Filesystem Hierarchy Standard",
        "Create, copy, move and remove files and directories, including recursive operations",
        "Locate files by name, type, size, age and owner with find",
        "Create hard and symbolic links and explain the difference",
        "Create and extract archives with tar and compression",
      ],
    },
    {
      title: "Text processing & pipelines",
      rangeLabel: "Week 3",
      gate: "Answer a question about a large log file (who, how many, when) with one pipeline you can explain stage by stage.",
      sources: [R.grep, R.sed, R.bash],
      objectives: [
        "View files with cat, less, head and tail, including following a growing log",
        "Redirect standard input, output and error, and combine commands with pipes",
        "Search text with grep and basic and extended regular expressions",
        "Write text transformations with cut, sort, uniq, tr, wc and sed",
        "Build a pipeline that answers a question about a log file",
      ],
    },
    {
      title: "Users, groups & permissions",
      rangeLabel: "Week 4",
      gate: "Set up a shared folder for a team so its members can work in it and others cannot, explain every permission bit you set, and give one user administrative rights for one command only.",
      sources: [R.useradd, R.usermod, R.chmod, R.sudoers, R.setfacl],
      objectives: [
        "Create and manage users and groups with useradd, usermod, groupadd and passwd",
        "Read and set permissions with chmod in symbolic and octal form, and ownership with chown",
        "Configure a shared directory with group ownership, the setgid bit and the sticky bit",
        "Explain how umask sets the permissions of new files",
        "Configure sudo access safely with visudo and /etc/sudoers.d",
      ],
    },
    {
      title: "Processes & jobs",
      rangeLabel: "Week 5",
      gate: "Find the process slowing a machine down, decide whether to lower its priority or stop it, and do it with the gentlest signal that works.",
      sources: [R.ps, R.kill, R.nice, R.free, R.vmstat],
      objectives: [
        "List and inspect processes with ps, top and pgrep",
        "Send signals with kill and pkill, and choose between TERM, HUP and KILL",
        "Manage foreground and background jobs with &, Ctrl+Z, bg, fg and nohup",
        "Change process priority with nice and renice",
        "Monitor memory and load with free, uptime and vmstat",
      ],
    },
    {
      title: "Software packages",
      rangeLabel: "Week 6",
      gate: "Install, verify and remove software on both a Debian-family and a Fedora-family system, and find which package owns a given file.",
      sources: [R.apt, R.dnf, R.dpkg, R.rpm],
      objectives: [
        "Install, update and remove packages with apt on Debian and Ubuntu systems",
        "Install, update and remove packages with dnf on Fedora-family systems",
        "Troubleshoot packages by finding which package owns a file and what a package installed, with dpkg and rpm",
        "Manage repositories and explain how package signatures are verified",
      ],
    },
    {
      title: "systemd services & logs",
      rangeLabel: "Week 7",
      gate: "Given a service that will not start, read its status and journal, find the cause, fix it, and make sure it starts at boot.",
      sources: [R.systemctl, R.journalctl, R.systemdUnit, R.bootup],
      objectives: [
        "Start, stop, restart, enable and disable services with systemctl",
        "Read service logs with journalctl filtered by unit, boot, priority and time",
        "Troubleshoot a service that fails to start from its status and journal",
        "Explain the boot sequence and systemd targets",
        "Override a unit's settings with a drop-in file",
      ],
    },
    {
      title: "Storage & filesystems",
      rangeLabel: "Week 8",
      gate: "Add a new disk to a system, make a filesystem on it, mount it at boot by UUID without risking an unbootable machine, and find what is filling an existing disk.",
      sources: [R.fstab, R.mount, R.df, R.lsof],
      objectives: [
        "List disks, partitions and filesystems with lsblk, blkid and df",
        "Create a partition and a filesystem on a new disk",
        "Mount filesystems by hand and at boot through /etc/fstab using UUIDs",
        "Diagnose a full disk with df and du, including space held by deleted open files",
      ],
    },
    {
      title: "Networking basics & SSH",
      rangeLabel: "Week 9",
      gate: "Explain why a machine cannot reach a website by checking its address, route and DNS in order, then log in to a server with an SSH key instead of a password.",
      sources: [R.ip, R.ss, R.sshKeygen, R.sshdConfig],
      objectives: [
        "Read IP addresses, routes and interfaces with ip addr and ip route",
        "Test connectivity and name resolution with ping, tracepath and dig or getent",
        "List listening ports and the processes behind them with ss",
        "Configure key-based SSH login with ssh-keygen and ssh-copy-id",
        "Copy files between machines with scp, sftp and rsync",
      ],
    },
    {
      title: "Shell scripting & scheduling",
      rangeLabel: "Week 10",
      gate: "Write a Bash script that automates a real chore safely (it stops on errors and quotes its variables), and schedule it with cron or a systemd timer.",
      sources: [R.bash, R.crontab, R.timer],
      objectives: [
        "Write Bash scripts with a shebang, variables, arguments and exit status",
        "Use conditionals, loops and functions in Bash",
        "Write scripts that fail safely with set -euo pipefail and quoted variables",
        "Schedule scripts with cron and systemd timers",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Linux Foundation Certified System Administrator (LFCS)
// Performance-based, 2 hours, online proctored (PSI Bridge), 17-20 tasks,
// 67% to pass, two exam attempts, certification valid 2 years.
// Domains (exam page, read 2026-11-14): Operations Deployment 25%,
// Networking 25%, Storage 20%, Essential Commands 20%, Users and Groups 10%.
// ---------------------------------------------------------------------------
const LFCS_URL = "https://training.linuxfoundation.org/certification/linux-foundation-certified-sysadmin-lfcs/";
const LFCS_INSTRUCTIONS = "https://docs.linuxfoundation.org/tc-docs/certification/instructions-lfcs-and-lfce";
const outline = (lines: string[]): UnitSource => ({
  title: "LFCS Domains & Competencies (training.linuxfoundation.org)",
  ...source(LFCS_URL, "exam_outline", CHECKED),
  outline: lines,
});
const LFCS_FORMAT = ref("Important Instructions: LFCS (docs.linuxfoundation.org)", LFCS_INSTRUCTIONS, [
  "The LFCS is 17-20 performance-based tasks on the command line in 2 hours; 67% or above passes",
  "Each task is done on a named host reached by ssh from the base system; sudo -i gives root; man pages, /usr/share docs and distribution packages are allowed",
  "The exam is independent of distribution-specific tasks; candidates who install packages should know apt, dpkg, dnf and yum",
]);

// The objectives the LFCS terminal sims attach to, by exact title.
export const LFCS_SIM_OBJECTIVES = {
  fstab: "Troubleshoot and recover a system that will not boot because of a bad fstab entry, a damaged filesystem or a failing service, using the emergency and rescue targets",
  lvm: "Create and extend LVM physical volumes, volume groups and logical volumes, growing the filesystem with them",
} as const;

export const LFCS_TRACK: SeedTrack = {
  code: "LFCS",
  title: "Prep for a performance-based Linux system administrator certification exam",
  description:
    "LFCS: the Linux Foundation's hands-on sysadmin exam, 17-20 tasks at a live command line in two hours, on any distribution. Deploy and operate services, packages, kernel parameters, SELinux, VMs and containers; configure networking, SSH, firewalls, routing, bonds and reverse proxies; manage LVM, filesystems, swap and automounts; and run Git, systemd units, certificates, users, limits, ACLs and LDAP logins. Independently developed exam prep; not affiliated with or endorsed by The Linux Foundation. Linux Foundation Certified System Administrator is a registered trademark of The Linux Foundation (its trademark list, read 2026-11-14). Linux is a registered trademark of Linus Torvalds.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: LFCS_URL,
  sourceVerifiedAt: VERIFIED_AT,
  contentReviewDueAt: REVIEW_DUE_AT,
  credential: {
    providerSlug: "linux-foundation",
    providerName: "The Linux Foundation / CNCF",
    providerUrl: "https://training.linuxfoundation.org/certification-catalog/",
    subcategorySlug: "cncf-certifications",
    credentialSlug: "lfcs",
    credentialName: "Linux Foundation Certified System Administrator",
    credentialType: "certification",
    credentialUrl: LFCS_URL,
    basis: "vendor_exam",
    examCode: "LFCS",
    objectivesRevision: "Domains & Competencies on the exam page (page modified 2026-10-30, read 2026-11-14)",
    status: "active",
    officialObjectivesUrl: LFCS_URL,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "No prerequisites. Comfortable administering a Linux system at the command line; the Linux Foundation pairs the exam with Linux System Administration Essentials (LFS207).",
    durationMinutes: 120,
    questionFormat:
      "Online, proctored, performance-based: 17-20 tasks solved at the command line on Linux hosts reached by ssh, in 2 hours. Man pages, documentation installed under /usr/share and distribution packages are allowed from the exam terminal. Independent of distribution-specific tasks. Two Killer.sh simulator attempts are included.",
    passingScorePolicy: "67% or above to pass (Important Instructions: LFCS). Two exam attempts included; certification valid for 2 years.",
  },
  units: [
    {
      title: "Operations Deployment",
      weight: 25,
      rangeLabel: "25% of the exam",
      gate: "On an unfamiliar host, make a kernel setting stick across reboots, get a failed service and a scheduled job running, install software from a new repository, and bring a host that dropped to emergency mode back to a normal boot.",
      sources: [
        outline([
          "Configure kernel parameters, persistent and non-persistent",
          "Diagnose, identify, manage, and troubleshoot processes and services",
          "Manage or schedule jobs for executing commands",
          "Search for, install, validate, and maintain software packages or repositories",
          "Recover from hardware, operating system, or filesystem failures",
          "Manage Virtual Machines (libvirt)",
          "Configure container engines, create and manage containers",
          "Create and enforce MAC using SELinux",
        ]),
        LFCS_FORMAT,
        R.sysctl,
        R.sysctlD,
        R.systemctl,
        R.timer,
        R.crontab,
        R.apt,
        R.dnf,
        R.bootup,
        R.fstab,
        R.virsh,
        R.podmanRun,
        R.restorecon,
        R.semanageFcontext,
      ],
      objectives: [
        "Configure kernel parameters at runtime with sysctl and persistently in /etc/sysctl.d, and verify the value in effect",
        "Diagnose and manage processes: find them with ps, top and pgrep, change priority, and send the right signal",
        "Troubleshoot a service that fails to start using systemctl status, journalctl and its unit file",
        "Schedule jobs with cron, at and systemd timers, and confirm they ran",
        "Manage packages and repositories with apt and dnf: search, install, verify, update, remove and add a repository",
        LFCS_SIM_OBJECTIVES.fstab,
        "Create, start, stop and inspect virtual machines with libvirt's virsh and virt-install",
        "Configure a container engine and run containers with Podman or Docker: images, ports, volumes and restart policies",
        "Configure SELinux: set the mode, read denials, fix file contexts with semanage fcontext and restorecon, and set booleans",
      ],
    },
    {
      title: "Networking",
      weight: 25,
      rangeLabel: "25% of the exam",
      gate: "Give a host a persistent IPv4 and IPv6 configuration with a static route and synchronized time, lock SSH to keys, open and forward only the ports asked for, and put a load-balancing reverse proxy in front of two web servers.",
      sources: [
        outline([
          "Configure IPv4 and IPv6 networking and hostname resolution",
          "Set and synchronize system time using time servers",
          "Monitor and troubleshoot networking",
          "Configure the OpenSSH server and client",
          "Configure packet filtering, port redirection, and NAT",
          "Configure static routing",
          "Configure bridge and bond devices",
          "Implement reverse proxies and load balancers",
        ]),
        R.ip,
        R.hostnamectl,
        R.timedatectl,
        R.chronyc,
        R.ss,
        R.sshd,
        R.sshdConfig,
        R.sshKeygen,
        R.nft,
        R.bonding,
        R.nginxLb,
      ],
      objectives: [
        "Configure IPv4 and IPv6 addresses, gateways and DNS resolvers persistently, and set the hostname and /etc/hosts entries",
        "Configure time synchronization with chrony or systemd-timesyncd and check it with chronyc or timedatectl",
        "Troubleshoot networking with ip, ss, ping, tracepath, dig and the journal",
        "Configure the OpenSSH server and client: key-based login, sshd_config hardening and per-host client settings",
        "Configure packet filtering, port forwarding and NAT with nftables, firewalld or ufw",
        "Configure static routes persistently and verify the routing table",
        "Create bridge and bond interfaces and choose a bonding mode",
        "Implement a reverse proxy and load balancer with nginx or HAProxy",
      ],
    },
    {
      title: "Storage",
      weight: 20,
      rangeLabel: "20% of the exam",
      gate: "Grow a full logical volume and its filesystem without unmounting it, add swap and an NFS share that survive a reboot, set up an on-demand mount, and name the device that is slowing the system down.",
      sources: [
        outline([
          "Configure and manage LVM storage",
          "Manage and configure the virtual file system",
          "Create, manage, and troubleshoot filesystems",
          "Use remote filesystems and network block devices",
          "Configure and manage swap space",
          "Configure filesystem automounters",
          "Monitor storage performance",
        ]),
        R.pvcreate,
        R.vgextend,
        R.lvcreate,
        R.lvextend,
        R.xfsGrowfs,
        R.fstab,
        R.mount,
        R.e2fsck,
        R.xfsRepair,
        R.nfs,
        R.mkswap,
        R.swapon,
        R.autoMaster,
        R.automount,
        R.iostat,
      ],
      objectives: [
        LFCS_SIM_OBJECTIVES.lvm,
        "Mount filesystems persistently in /etc/fstab by UUID, and read and set values in the virtual filesystems /proc and /sys",
        "Create, check and repair ext4 and XFS filesystems and troubleshoot mount failures",
        "Mount NFS and other remote filesystems, and attach network block devices such as iSCSI or NBD",
        "Create and enable swap on a partition or a file, persistently",
        "Configure on-demand mounts with autofs or systemd automount units",
        "Monitor storage performance with iostat, iotop and df, and identify a saturated device",
      ],
    },
    {
      title: "Essential Commands",
      weight: 20,
      rangeLabel: "20% of the exam",
      gate: "Commit a configuration change to a Git repository, write and debug a systemd service for a new application, find what is filling a disk and what is slowing a machine, and check whether a certificate is about to expire.",
      sources: [
        outline([
          "Basic Git Operations",
          "Create, configure, and troubleshoot services",
          "Monitor and troubleshoot system performance and services",
          "Determine application and service specific constraints",
          "Troubleshoot diskspace issues",
          "Work with SSL certificates",
        ]),
        R.git,
        R.gitMerge,
        R.systemdUnit,
        R.systemdExec,
        R.vmstat,
        R.free,
        R.lsof,
        R.df,
        R.opensslX509,
        R.opensslReq,
      ],
      objectives: [
        "Use Git for basic work: clone, commit, branch, merge, push and pull",
        "Create and configure systemd service units, including drop-in overrides, and troubleshoot them",
        "Monitor and troubleshoot system performance: load, CPU, memory and I/O with uptime, top, free and vmstat",
        "Determine an application's constraints: open files, listening ports, resource limits and the users and paths it needs",
        "Troubleshoot disk space problems, including deleted files still held open and inode exhaustion",
        "Work with TLS certificates: create keys and signing requests, inspect certificates and check expiry with openssl",
      ],
    },
    {
      title: "Users and Groups",
      weight: 10,
      rangeLabel: "10% of the exam",
      gate: "Create accounts with the right groups and expiry, give a team shared access to a directory with ACLs that also apply to new files, cap one user's open files, and make the host accept LDAP logins.",
      sources: [
        outline([
          "Create and manage local user and group accounts",
          "Manage personal and system-wide environment profiles",
          "Configure user resource limits",
          "Configure and manage ACLs",
          "Configure the system to use LDAP user and group accounts",
        ]),
        R.useradd,
        R.usermod,
        R.chage,
        R.bash,
        R.limits,
        R.setfacl,
        R.getfacl,
        R.sssd,
      ],
      objectives: [
        "Create and manage local user and group accounts, passwords and account expiry",
        "Manage personal and system-wide environment profiles in ~/.bashrc, ~/.profile and /etc/profile.d",
        "Configure user resource limits with limits.conf and systemd, and verify them with ulimit",
        "Configure and manage POSIX ACLs with setfacl and getfacl, including default ACLs and the mask",
        "Configure the system to use LDAP users and groups through SSSD and NSS",
      ],
    },
  ],
};

export const LINUX_DEPTH_TRACKS: readonly SeedTrack[] = [LINUXFUND_TRACK, LFCS_TRACK];
