import { GENERAL_SAFETY, commandPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-292: Prep for the LFCS. Hybrid density (docs/labs.md) on the published
// weights 25/25/20/20/10: one lab per domain plus six split by weight,
// 3/2/2/2/2, 11 labs, one per objective. The LFCS is performance-based, so
// every lab is a task at a prompt: write the command or the file, then
// prove it worked. The two terminal sims (lib/sim/documents.ts, LFCS) take
// the boot-recovery and LVM objectives, so no lab repeats them.
//
// Commands and file formats were checked against the man pages and project
// documentation listed in tracks/linux.ts, read 2026-11-14 (man7.org, the
// kernel bonding HOWTO, nginx.org, docs.podman.io, docs.openssl.org). The
// exam outline is the LFCS page's Domains & Competencies, read the same day.
// Hosts and companies are fictional.

const D = "2026-11-14";

export const LFCS_LABS: SeedLabSet = {
  trackCode: "LFCS",
  sources: [
    source("https://training.linuxfoundation.org/certification/linux-foundation-certified-sysadmin-lfcs/", "exam_outline", D),
    source("https://docs.linuxfoundation.org/tc-docs/certification/instructions-lfcs-and-lfce", "reference", D),
    source("https://man7.org/linux/man-pages/index.html", "reference", D),
  ],
  labs: [
    // ---- Operations Deployment (3) ----
    {
      slug: "lfcs-sysctl-persistent",
      objective: "Configure kernel parameters at runtime with sysctl and persistently in /etc/sysctl.d, and verify the value in effect",
      kind: "build",
      title: "Turn on IP forwarding now and after reboot",
      brief:
        "Task on host router1 (fictional exam-style task for Puget Mesh Networks): the host must forward IPv4 packets between its interfaces immediately and after every reboot. sysctl net.ipv4.ip_forward currently prints net.ipv4.ip_forward = 0. Do not edit /etc/sysctl.conf; use a drop-in file named 90-forwarding.conf.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the runtime command, the file and its contents, and how you prove both.",
          parts: [
            commandPart(
              "Runtime change",
              "sysctl -w net.ipv4.ip_forward=1 (with or without sudo) is met.",
              "sudo sysctl -w net.ipv4.ip_forward=1\nThis changes the running kernel only; it is lost at reboot.",
              { accepted: ["sudo sysctl -w net.ipv4.ip_forward=1", "sysctl -w net.ipv4.ip_forward=1"], prompt: "$" }
            ),
            part(
              "Persistent file and proof",
              "Creates /etc/sysctl.d/90-forwarding.conf containing net.ipv4.ip_forward = 1, loads it with sysctl --system (or sysctl -p /etc/sysctl.d/90-forwarding.conf), and verifies with sysctl net.ipv4.ip_forward (or cat /proc/sys/net/ipv4/ip_forward) printing 1.",
              "echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/90-forwarding.conf\nsudo sysctl --system\nsysctl net.ipv4.ip_forward    # net.ipv4.ip_forward = 1\n\nsysctl --system reloads every sysctl.d file the way boot does, so it also proves the file is read; a typo shows up now, not after the next reboot."
            ),
          ],
        },
      ],
    },
    {
      slug: "lfcs-selinux-moved-content",
      objective: "Configure SELinux: set the mode, read denials, fix file contexts with semanage fcontext and restorecon, and set booleans",
      kind: "case",
      title: "A web root in a new place, and SELinux says no",
      brief:
        "Task on host web2 (fictional, for Tumwater Tickets): the web server must serve files from a new directory, /srv/site. The server is configured correctly and the files are world-readable, but every request returns 403 Forbidden. getenforce prints Enforcing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "ls -Z /srv/site shows the files labeled var_t; files under /var/www/html are labeled httpd_sys_content_t. The audit log has AVC denials for the web server process reading files in /srv/site.",
          ask: "What is the cause, and what tempting fix must you not use?",
          parts: [
            part(
              "Cause and the wrong fix",
              "States that SELinux denies the web server (httpd_t) reading files labeled var_t; the fix is the file context, not the mode; setenforce 0 or disabling SELinux would hide the problem and fail the requirement to keep it enforcing; chcon alone would not survive a relabel.",
              "The files carry the wrong SELinux type: the web server's domain may read httpd_sys_content_t but not var_t, so the kernel denies the read even though Unix permissions allow it. Switching to permissive (setenforce 0) or disabling SELinux would make it work by removing protection; chcon would fix it until the next relabel or restorecon."
            ),
          ],
        },
        {
          text: "The task requires SELinux to stay enforcing and the fix to survive a full filesystem relabel.",
          ask: "Write the two commands that fix it persistently.",
          parts: [
            commandPart(
              "Record the rule",
              "semanage fcontext -a -t httpd_sys_content_t \"/srv/site(/.*)?\" is met (with or without sudo; quotes required for the pattern).",
              "sudo semanage fcontext -a -t httpd_sys_content_t \"/srv/site(/.*)?\"\nThis adds a persistent rule to the policy's file-context database for the directory and everything under it.",
              {
                accepted: [
                  "sudo semanage fcontext -a -t httpd_sys_content_t \"/srv/site(/.*)?\"",
                  "semanage fcontext -a -t httpd_sys_content_t \"/srv/site(/.*)?\"",
                ],
                valueFlags: ["-t"],
                prompt: "$",
              }
            ),
            commandPart(
              "Apply it",
              "restorecon -Rv /srv/site (any order of -R -v; -R required) is met.",
              "sudo restorecon -Rv /srv/site\nrestorecon relabels the existing files from the rules; ls -Z then shows httpd_sys_content_t and the site loads with SELinux still enforcing.",
              { accepted: ["sudo restorecon -Rv /srv/site", "restorecon -Rv /srv/site", "sudo restorecon -R /srv/site", "restorecon -R /srv/site"], prompt: "$" }
            ),
          ],
        },
      ],
    },
    {
      slug: "lfcs-container-restart-policy",
      objective: "Configure a container engine and run containers with Podman or Docker: images, ports, volumes and restart policies",
      kind: "build",
      title: "Run a container that keeps its data and comes back",
      brief:
        "Task on host apps1 (fictional, for Yelm Youth Sports): run the image docker.io/library/nginx:1.27 as a detached container named scores, publish container port 80 on host port 8080, mount the host directory /srv/scores read-only at /usr/share/nginx/html, and have it restart when it exits with an error. Use Podman.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the command and explain the restart choice.",
          parts: [
            part(
              "The command",
              "podman run -d --name scores -p 8080:80 -v /srv/scores:/usr/share/nginx/html:ro (plus :Z or :z on SELinux hosts as a bonus) --restart on-failure docker.io/library/nginx:1.27; checks with podman ps and curl localhost:8080.",
              "podman run -d --name scores -p 8080:80 \\\n  -v /srv/scores:/usr/share/nginx/html:ro,Z \\\n  --restart on-failure docker.io/library/nginx:1.27\npodman ps   # scores Up, 0.0.0.0:8080->80/tcp\ncurl -s localhost:8080 | head\n\n-p host:container publishes the port; :ro mounts read-only; Z relabels the content for SELinux hosts."
            ),
            part(
              "Restart policy",
              "Explains on-failure restarts only on a nonzero exit (always would also restart on a clean exit), that the policy does not apply after podman stop or kill, and that for boot-time start Podman relies on podman-restart.service or a systemd unit (Quadlet or generated), in which case systemd's restart should be used instead of --restart.",
              "on-failure restarts the container when it exits nonzero, which is what \"exits with an error\" asks; always would also restart after a clean exit. A policy does not apply after podman stop or podman kill. After a reboot Podman restarts such containers through podman-restart.service; if the container runs from a systemd unit, let systemd handle restarts and leave --restart off."
            ),
          ],
        },
      ],
    },
    // ---- Networking (2) ----
    {
      slug: "lfcs-ssh-hardening",
      objective: "Configure the OpenSSH server and client: key-based login, sshd_config hardening and per-host client settings",
      kind: "case",
      title: "Lock SSH to keys without locking yourself out",
      brief:
        "Task on host bastion (fictional, for Ellensburg Grain): root must not log in over SSH at all, password logins must be disabled, and the user ops must keep access with the key already in ~ops/.ssh/authorized_keys. You are connected over SSH as ops.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "sshd -T | grep -E 'permitrootlogin|passwordauthentication' prints permitrootlogin prohibit-password and passwordauthentication yes. The distribution reads drop-ins from /etc/ssh/sshd_config.d/.",
          ask: "Write the drop-in, then put the remaining steps in a safe order.",
          parts: [
            part(
              "Drop-in",
              "A file such as /etc/ssh/sshd_config.d/50-hardening.conf with PermitRootLogin no and PasswordAuthentication no; notes prohibit-password (the default) still allows root by key, so it must be no; notes sshd uses the first value it reads for a keyword, so the drop-in must sort before any file that sets it otherwise.",
              "/etc/ssh/sshd_config.d/10-hardening.conf:\nPermitRootLogin no\nPasswordAuthentication no\n\nThe default prohibit-password still lets root in with a key, so the requirement needs no. sshd keeps the first value it reads for a keyword, so give the file a low number."
            ),
            orderPart(
              "Safe order",
              "Met: the order given. Partly there: one adjacent swap.",
              "Prove the key works, validate the syntax, reload, then test from a second session before closing the first, and confirm the effective settings.",
              [
                "Confirm ops logs in with the key in a second terminal",
                "Validate the configuration with sshd -t",
                "Reload the SSH service",
                "Open a new session as ops while keeping the old one",
                "Check the effective values with sshd -T",
              ]
            ),
          ],
        },
        {
          text: "Admins also reach bastion as ops on port 2222 with the key ~/.ssh/bastion_ed25519 from their workstations and keep typing the options.",
          ask: "Write the client-side entry that lets them type ssh bastion.",
          parts: [
            part(
              "Client config",
              "A Host bastion block in ~/.ssh/config with HostName (the real name or address), User ops, Port 2222 and IdentityFile ~/.ssh/bastion_ed25519.",
              "~/.ssh/config:\nHost bastion\n    HostName bastion.example.net\n    User ops\n    Port 2222\n    IdentityFile ~/.ssh/bastion_ed25519\n\nNow ssh bastion uses all four settings; scp and rsync over SSH use them too."
            ),
          ],
        },
      ],
    },
    {
      slug: "lfcs-nginx-load-balancer",
      objective: "Implement a reverse proxy and load balancer with nginx or HAProxy",
      kind: "build",
      title: "Put a load balancer in front of two web servers",
      brief:
        "Task on host lb1 (fictional, for Chehalis Charters): nginx is installed. Requests to lb1 on port 80 must be spread over two backends, 10.0.20.11:8080 and 10.0.20.12:8080, sending each new request to the backend with fewer active connections. The backends must see the original client address in the X-Real-IP header.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the nginx configuration and the commands that apply and check it.",
          parts: [
            part(
              "Configuration",
              "An upstream block listing both servers with least_conn; a server block listening on 80 with location / { proxy_pass http://<upstream>; proxy_set_header X-Real-IP $remote_addr; } (Host header a plus); placed in the http context (conf.d or sites-enabled).",
              "/etc/nginx/conf.d/charters.conf:\nupstream charters {\n    least_conn;\n    server 10.0.20.11:8080;\n    server 10.0.20.12:8080;\n}\nserver {\n    listen 80;\n    location / {\n        proxy_pass http://charters;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n    }\n}\n\nWithout least_conn nginx uses round-robin."
            ),
            part(
              "Apply and check",
              "nginx -t before systemctl reload nginx; then curl localhost repeatedly (or check both backends' access logs) to see both receive traffic; on SELinux hosts notes httpd_can_network_connect may need setsebool -P.",
              "sudo nginx -t && sudo systemctl reload nginx\nfor i in 1 2 3 4; do curl -s -o /dev/null -w '%{http_code}\\n' http://localhost/; done\nThen check both backends' access logs for requests. On an SELinux host, nginx may be denied outbound connections until sudo setsebool -P httpd_can_network_connect on."
            ),
          ],
        },
      ],
    },
    // ---- Storage (2) ----
    {
      slug: "lfcs-swap-file",
      objective: "Create and enable swap on a partition or a file, persistently",
      kind: "build",
      title: "Add 2 GiB of swap that survives a reboot",
      brief:
        "Task on host db3 (fictional, for Moses Lake Mills): add a 2 GiB swap file at /swapfile, active now and after reboot. The root filesystem is ext4. swapon --show currently prints nothing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the commands in order and the fstab line, and say why the file is not created with truncate.",
          parts: [
            part(
              "Commands and fstab",
              "Creates the file without holes (dd if=/dev/zero bs=1M count=2048, or fallocate -l 2G on ext4), chmod 600, mkswap /swapfile, swapon /swapfile, adds /swapfile none swap defaults 0 0 (or sw) to /etc/fstab, and verifies with swapon --show and free -h.",
              "sudo dd if=/dev/zero of=/swapfile bs=1M count=2048\nsudo chmod 600 /swapfile\nsudo mkswap /swapfile\nsudo swapon /swapfile\necho '/swapfile none swap defaults 0 0' | sudo tee -a /etc/fstab\nswapon --show    # /swapfile file 2G\n\nchmod 600 keeps other users from reading memory pages written to swap."
            ),
            part(
              "Why not truncate",
              "Explains swapon rejects files with holes; truncate creates a sparse file (all holes), so mkswap/swapon fail; dd writes real blocks (fallocate works on ext4 and XFS).",
              "truncate -s 2G makes a sparse file whose blocks are holes. The kernel writes swap directly to the file's blocks, so swapon rejects files with holes. dd writes every block; fallocate allocates them on ext4 and XFS."
            ),
          ],
        },
      ],
    },
    {
      slug: "lfcs-fsck-unmounted",
      objective: "Create, check and repair ext4 and XFS filesystems and troubleshoot mount failures",
      kind: "case",
      title: "A data filesystem that will not mount",
      brief:
        "Task on host files2 (fictional, for Sedro Seed Library): after a power loss, mount /archive fails. /etc/fstab mounts /dev/vg_data/archive (ext4) at /archive. The rest of the system booted normally.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "dmesg shows: EXT4-fs (dm-2): bad geometry ... and EXT4-fs (dm-2): mount failed. findmnt /archive prints nothing. A colleague suggests running e2fsck -y on it while it is \"half mounted\" to save time, or running fsck on the root filesystem too while you are at it.",
          ask: "Give the repair command and explain the two rules the colleague is about to break.",
          parts: [
            commandPart(
              "Repair",
              "e2fsck -f /dev/vg_data/archive (or fsck.ext4 -f, with or without -y/-p, with or without sudo) on the unmounted device is met.",
              "sudo e2fsck -f /dev/vg_data/archive\n-f forces a full check even if the filesystem looks clean; answer the repair prompts (or add -y after a dry look with -n).",
              {
                accepted: [
                  "sudo e2fsck -f /dev/vg_data/archive",
                  "e2fsck -f /dev/vg_data/archive",
                  "sudo e2fsck -fy /dev/vg_data/archive",
                  "e2fsck -fy /dev/vg_data/archive",
                  "sudo fsck.ext4 -f /dev/vg_data/archive",
                  "fsck.ext4 -f /dev/vg_data/archive",
                ],
                prompt: "$",
              }
            ),
            part(
              "Rules",
              "Never run e2fsck on a mounted filesystem (only -n read-only is safe), confirm it is unmounted with findmnt first; the mounted root filesystem must not be repaired live (use rescue/emergency mode or check at next boot); and for XFS the tool is xfs_repair, not e2fsck.",
              "e2fsck must only run on an unmounted filesystem; repairing a mounted one corrupts it further (e2fsck's own manual says the only correct answer is no). findmnt confirms /archive is not mounted. The root filesystem is mounted, so it cannot be repaired from the running system; that needs rescue mode or a check at boot. If the volume were XFS, the tool would be xfs_repair."
            ),
          ],
        },
        {
          text: "e2fsck fixes the superblock geometry and reports the filesystem was modified. mount /archive now succeeds.",
          ask: "What do you check before handing it back?",
          parts: [
            part(
              "After repair",
              "Checks the mount (findmnt, df -h /archive), looks in /archive/lost+found for recovered files, reviews dmesg for new errors, and considers the underlying cause (power loss, disk health with smartctl) and that a backup exists.",
              "findmnt /archive and df -h /archive confirm the mount and sizes; files e2fsck could not place appear in /archive/lost+found and need sorting; dmesg should show a clean mount with no new EXT4 errors. Then check the disk's health (smartctl -H) and that the archive's backup is current."
            ),
          ],
        },
      ],
    },
    // ---- Essential Commands (2) ----
    {
      slug: "lfcs-cert-expiry",
      objective: "Work with TLS certificates: create keys and signing requests, inspect certificates and check expiry with openssl",
      kind: "build",
      title: "Will this certificate expire in the next 30 days?",
      brief:
        "Task on host mail1 (fictional, for Port Orchard Ferries): /etc/pki/tls/certs/mail.pem is the server's certificate. Monitoring needs a command that exits nonzero if it expires within 30 days, and the team needs a new key and signing request for mail.portorchard.example with the key never leaving the host.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the expiry check, then the commands for the new key and request.",
          parts: [
            commandPart(
              "Expiry check",
              "openssl x509 -in /etc/pki/tls/certs/mail.pem -noout -checkend 2592000 (30 x 86400 seconds; -noout optional) is met.",
              "openssl x509 -in /etc/pki/tls/certs/mail.pem -noout -checkend 2592000\n-checkend takes seconds: 30 days = 2,592,000. It exits nonzero if the certificate expires within that time. -enddate -noout prints the expiry date for a person to read.",
              {
                accepted: [
                  "openssl x509 -in /etc/pki/tls/certs/mail.pem -noout -checkend 2592000",
                  "openssl x509 -in /etc/pki/tls/certs/mail.pem -checkend 2592000",
                ],
                valueFlags: ["-in", "-checkend"],
                prompt: "$",
              }
            ),
            part(
              "Key and request",
              "Generates a private key on the host (openssl genpkey or req -newkey) with restrictive permissions, then a CSR with openssl req -new -key ... -subj \"/CN=mail.portorchard.example\" (subjectAltName via -addext is a plus), and inspects it with openssl req -in ... -noout -text; only the CSR is sent to the CA.",
              "openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out mail.key\nchmod 600 mail.key\nopenssl req -new -key mail.key -out mail.csr -subj \"/CN=mail.portorchard.example\" -addext \"subjectAltName=DNS:mail.portorchard.example\"\nopenssl req -in mail.csr -noout -text\n\nThe CSR carries the public key and the names; the private key stays on mail1."
            ),
          ],
        },
      ],
    },
    {
      slug: "lfcs-write-service-unit",
      objective: "Create and configure systemd service units, including drop-in overrides, and troubleshoot them",
      kind: "build",
      title: "Run an application as a proper service",
      brief:
        "Task on host api1 (fictional, for Anacortes Kayak Rentals): the application /opt/rentals/bin/rentals-api must run as the unprivileged user rentals, start at boot after the network is up, restart if it crashes, and read its settings from /etc/rentals/env. It currently runs in someone's tmux session.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the unit file and the commands to load, enable and check it.",
          parts: [
            part(
              "Unit file",
              "/etc/systemd/system/rentals-api.service with [Unit] Description and After=network-online.target (Wants= too), [Service] User=rentals, EnvironmentFile=/etc/rentals/env, ExecStart=/opt/rentals/bin/rentals-api with an absolute path, Restart=on-failure, and [Install] WantedBy=multi-user.target.",
              "[Unit]\nDescription=Rentals API\nWants=network-online.target\nAfter=network-online.target\n\n[Service]\nUser=rentals\nEnvironmentFile=/etc/rentals/env\nExecStart=/opt/rentals/bin/rentals-api\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target"
            ),
            part(
              "Load and check",
              "systemctl daemon-reload, systemctl enable --now rentals-api, then systemctl status and journalctl -u rentals-api to check; mentions later changes go in a drop-in via systemctl edit rather than editing a vendor unit.",
              "sudo systemctl daemon-reload\nsudo systemctl enable --now rentals-api\nsystemctl status rentals-api\njournalctl -u rentals-api -n 20\n\ndaemon-reload makes systemd read the new file. Later changes (say, a memory limit) go in a drop-in made with systemctl edit rentals-api, which survives package updates of the main unit."
            ),
          ],
        },
      ],
    },
    // ---- Users and Groups (2) ----
    {
      slug: "lfcs-default-acls",
      objective: "Configure and manage POSIX ACLs with setfacl and getfacl, including default ACLs and the mask",
      kind: "build",
      title: "Give one more group access, including to future files",
      brief:
        "Task on host share1 (fictional, for La Conner Galleries): /srv/catalog is owned by curator:curator with mode 2770. The group interns must get read and write access to everything in it now, and to every file created there later, without changing the owner, the owning group or the mode bits for others.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the two setfacl commands, then pick the getfacl lines that prove it.",
          parts: [
            commandPart(
              "Existing files",
              "setfacl -R -m g:interns:rwX /srv/catalog (with or without sudo; -R and -m in any order) is met.",
              "sudo setfacl -R -m g:interns:rwX /srv/catalog\nCapital X gives execute only to directories (and files already executable by someone), so interns can enter subfolders without making every file executable.",
              { accepted: ["sudo setfacl -R -m g:interns:rwX /srv/catalog", "setfacl -R -m g:interns:rwX /srv/catalog"], valueFlags: ["-m"], prompt: "$" }
            ),
            commandPart(
              "Future files",
              "setfacl -R -d -m g:interns:rwX /srv/catalog (or -dm without -R on the top directory) is met.",
              "sudo setfacl -R -d -m g:interns:rwX /srv/catalog\n-d sets a default ACL on directories, which new files and subdirectories inherit.",
              {
                accepted: [
                  "sudo setfacl -R -d -m g:interns:rwX /srv/catalog",
                  "setfacl -R -d -m g:interns:rwX /srv/catalog",
                  "sudo setfacl -d -m g:interns:rwX /srv/catalog",
                  "setfacl -d -m g:interns:rwX /srv/catalog",
                ],
                valueFlags: ["-m"],
                prompt: "$",
              }
            ),
            selectPart(
              "Proof in getfacl /srv/catalog",
              "Met: the group:interns line, the mask line, and the default:group:interns line. Partly there: two of them with no wrong line.",
              "group:interns:rwx grants the group access now; mask::rwx shows the mask does not cut it down (a mask of r-x would make the effective right r-x); default:group:interns:rwx is what new files inherit.",
              {
                lines: [
                  "# owner: curator",
                  "# group: curator",
                  "user::rwx",
                  "group::rwx",
                  "group:interns:rwx",
                  "mask::rwx",
                  "other::---",
                  "default:group:interns:rwx",
                ],
                correct: [4, 5, 7],
                display: "config",
              }
            ),
          ],
        },
      ],
    },
    {
      slug: "lfcs-resource-limits",
      objective: "Configure user resource limits with limits.conf and systemd, and verify them with ulimit",
      kind: "case",
      title: "Too many open files",
      brief:
        "Task on host search1 (fictional, for Bellingham Books): the user indexer runs a batch job from an interactive login and it fails with \"Too many open files\". ulimit -n as indexer prints 1024. The job needs 65536.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "ulimit -Hn as indexer also prints 1024, so indexer cannot raise the soft limit alone.",
          ask: "Write the limits entry and say how indexer gets and checks it.",
          parts: [
            part(
              "limits entry",
              "A file in /etc/security/limits.d/ (or limits.conf) with indexer soft nofile 65536 and indexer hard nofile 65536 (domain type item value); explains the soft limit is the one in effect and can be raised up to the hard limit.",
              "/etc/security/limits.d/indexer.conf:\nindexer soft nofile 65536\nindexer hard nofile 65536\n\nThe format is <domain> <type> <item> <value>. The soft value applies by default; a user may raise their soft limit up to the hard limit, never above it."
            ),
            part(
              "Applying and checking",
              "States pam_limits applies the file at the start of a new login session, so indexer must log out and back in (existing sessions keep 1024), then ulimit -n (soft) and ulimit -Hn (hard) show 65536.",
              "pam_limits reads these files when a session starts, so indexer logs in again; then ulimit -n shows 65536 and ulimit -Hn the hard limit. Sessions opened before the change keep 1024."
            ),
          ],
        },
        {
          text: "The team moves the job into a systemd service, indexer.service, running as User=indexer. Inside the service the job fails again with the same error.",
          ask: "Why, and what is the fix?",
          parts: [
            part(
              "Service limits",
              "Explains limits.conf is the pam_limits configuration applied to login sessions, and a service started by systemd does not go through that login, so its limit comes from the unit; sets LimitNOFILE=65536 in a drop-in (systemctl edit indexer), daemon-reload and restart, and verifies in /proc/<pid>/limits.",
              "limits.conf belongs to pam_limits, which applies limits to login sessions; systemd starts the service directly, so it gets the unit's limits instead. sudo systemctl edit indexer and add\n[Service]\nLimitNOFILE=65536\nthen restart the service and check grep 'open files' /proc/$(systemctl show -p MainPID --value indexer)/limits."
            ),
          ],
        },
      ],
    },
  ],
};
