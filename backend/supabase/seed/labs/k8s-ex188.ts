import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Red Hat Certified Developer in Cloud-native Applications (EX188).
//
// Aligned to the five objective groups on the EX188 exam page (read
// 2026-11-09): Implement images using Podman and Containerfile, Manage
// images, Run containers locally using Podman, Run multi-container
// applications with Podman, Troubleshoot containerized applications. Red
// Hat publishes no weights; density (docs/labs.md, hybrid) over the
// course's own weights: 3 / 2 / 2 / 2 / 2.
//
// EX188 is performance-based on RHEL 10 with Podman v5, so these labs are
// hands-on: Containerfiles and podman commands with authored terminal
// output, rootless by default. Every lab is needs_expert_review.

export const EX188_LABS: SeedLabSet = {
  trackCode: "EX188",
  sources: [
    source("https://www.redhat.com/en/services/training/ex188-red-hat-certified-specialist-containers-exam", "exam_outline", "2026-11-09"),
    source("https://docs.podman.io/en/latest/", "reference", "2026-11-09"),
    source("https://docs.redhat.com/en/documentation/red_hat_learning_subscription/1-latest/html-single/red_hat_certification_program_guide/index", "exam_outline", "2026-11-09"),
    source("https://docs.podman.io/en/latest/markdown/podman-run.1.html", "reference", "2026-11-09"),
    source("https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html", "reference", "2026-11-09"),
    source("https://catalog.redhat.com/software/base-images", "reference", "2026-11-09"),
  ],
  labs: [
    // ---------------------------------------------------------- images 30%
    {
      slug: "containerfile-for-a-web-app",
      objective: "Configure the container's runtime environment: user id, working directory and running arbitrary commands during the build",
      kind: "build",
      title: "Write a Containerfile for a Python web service",
      brief:
        "The fictional publisher Marlow Press has a Flask application in ./app (requirements.txt, app.py listening on 8080). Write a Containerfile on a UBI base that installs dependencies, runs as a non-root user with a fixed uid, sets the working directory, and starts the server; then build and run it rootless with Podman.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Containerfile, explain each instruction's job, and show the build and a test run.",
          parts: [
            part(
              "Base image and content",
              "Starts FROM a pinned Red Hat UBI image (e.g. registry.access.redhat.com/ubi9/python-312 or ubi9/ubi-minimal with Python installed), copies requirements.txt first and installs before copying the rest of the source so dependency layers cache, and copies the application into a dedicated directory.",
              "FROM registry.access.redhat.com/ubi9/python-312:latest\nUSER 0\nWORKDIR /opt/app-root/src\nCOPY requirements.txt ./\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY app/ ./\nThe UBI Python image gives a supported, redistributable base with Python already present. Copying requirements.txt alone before the pip install means editing app.py later does not reinstall every dependency: layers are cached up to the first changed instruction. USER 0 is needed only while installing because the UBI Python image defaults to uid 1001."
            ),
            part(
              "User, working directory and runtime commands",
              "Creates or reuses a non-root user with a known uid, fixes ownership and permissions of the application directory for that uid (and for arbitrary uids in OpenShift by granting group 0 write), sets WORKDIR, and switches USER before the command; explains why running as root in the container is avoided and why the uid matters for volumes.",
              "RUN chown -R 1001:0 /opt/app-root/src && chmod -R g=u /opt/app-root/src\nUSER 1001\nENV PORT=8080 PYTHONUNBUFFERED=1\nEXPOSE 8080\nCMD [\"python\", \"app.py\"]\nchown to uid 1001 with group 0 and g=u permissions lets the image run as 1001 under Podman and also as the arbitrary uid OpenShift assigns (which is always in group 0). USER 1001 before CMD means the process never runs as root inside the container -- a compromise of the app does not hand out root in the container's namespace. RUN executes arbitrary commands at build time and each creates a layer; chain related commands with && to keep layers few."
            ),
            part(
              "Build and run",
              "podman build -t with a tag, podman run rootless publishing 8080 to a high host port, a curl test, and podman ps/logs; notes that rootless Podman cannot bind host ports below 1024 by default.",
              "$ podman build -t marlow/press-web:1.0 .\nSTEP 1/10: FROM registry.access.redhat.com/ubi9/python-312:latest\n...\nSuccessfully tagged localhost/marlow/press-web:1.0\n$ podman run -d --name press-web -p 8080:8080 marlow/press-web:1.0\n3f1c9e...\n$ curl -s localhost:8080/healthz\n{\"status\":\"ok\"}\n$ podman ps --format '{{.Names}} {{.Status}} {{.Ports}}'\npress-web Up 12 seconds 0.0.0.0:8080->8080/tcp\n$ podman exec press-web id\nuid=1001(default) gid=0(root) groups=0(root)\nRootless Podman maps the container's uid 1001 to a subordinate uid of the user on the host, and publishing port 8080 works because it is above the unprivileged port floor (net.ipv4.ip_unprivileged_port_start, 1024 by default)."
            ),
          ],
        },
      ],
    },
    {
      slug: "entrypoint-cmd-env-arg",
      objective: "Specify the command to run in a custom image with ENTRYPOINT and CMD and the exec versus shell forms",
      kind: "case",
      title: "Fix an image whose command does not behave",
      brief:
        "A colleague at the fictional retailer Hadley & Co built a worker image. It ignores arguments, cannot be stopped cleanly, and the build argument for the version never appears. Diagnose from the Containerfile and output.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Containerfile:\nFROM registry.access.redhat.com/ubi9/ubi-minimal:latest\nARG VERSION\nENV APP_VERSION=$VERSION\nCOPY worker /usr/local/bin/worker\nENTRYPOINT /usr/local/bin/worker --queue default\nCMD --workers 2\n\n$ podman build -t hadley/worker:dev .\n$ podman run --rm hadley/worker:dev --workers 8\nworker: starting with queue=default workers=2 version=\n$ podman run -d --name w hadley/worker:dev\n$ time podman stop w\nreal    0m10.4s\n$ podman inspect hadley/worker:dev --format '{{.Config.Entrypoint}} | {{.Config.Cmd}}'\n[/bin/sh -c /usr/local/bin/worker --queue default] | [/bin/sh -c --workers 2]",
          ask: "Explain the three symptoms from the Containerfile and output.",
          parts: [
            part(
              "Shell form swallows arguments",
              "ENTRYPOINT in shell form becomes /bin/sh -c '<string>', and a shell-form ENTRYPOINT ignores CMD and run-time arguments entirely, so --workers 8 (and the CMD) never reach the worker; the inspect output shows both wrapped in /bin/sh -c.",
              "ENTRYPOINT written as a plain string is the shell form: Podman stores it as /bin/sh -c '/usr/local/bin/worker --queue default'. With a shell-form ENTRYPOINT, CMD and any arguments given to podman run are not appended -- the shell runs only the string -- which is why --workers 8 is ignored and the worker reports its default of 2 (its own default, not the CMD's). The inspect line confirms it: both Entrypoint and Cmd are sh -c wrappers."
            ),
            part(
              "Slow stop: PID 1 is a shell",
              "Because the process is launched by sh -c, PID 1 in the container is /bin/sh, which does not forward SIGTERM to the worker; podman stop waits the default 10 seconds then SIGKILLs -- hence 10.4 s; exec form makes the worker PID 1 so it receives SIGTERM directly.",
              "podman stop sends SIGTERM to PID 1 and waits (default 10 s) before SIGKILL. Here PID 1 is /bin/sh running the command string; sh does not pass SIGTERM to its child, so the worker never sees it, the timeout expires and everything is killed -- the 10.4 seconds. With the exec form the worker itself is PID 1, handles SIGTERM, drains its queue and exits in well under a second."
            ),
            part(
              "Missing version",
              "ARG VERSION was declared but no --build-arg was passed, so $VERSION expanded to empty and ENV APP_VERSION is empty; a default (ARG VERSION=dev) or passing --build-arg VERSION=1.4.2 fixes it; also notes ARG is build-time only while ENV persists into the container.",
              "ARG VERSION declares a build argument with no default; the build was run without --build-arg VERSION=..., so it expanded to an empty string and ENV APP_VERSION= was baked in empty. Either give it a default (ARG VERSION=dev) or build with podman build --build-arg VERSION=1.4.2. Remember the split: ARG exists only during the build (and is not in the final image unless copied into an ENV), ENV persists into the running container."
            ),
          ],
        },
        {
          text: "Rewrite the Containerfile so arguments, signals and the version all work, and prove it.",
          ask: "Give the corrected Containerfile and the verification output.",
          parts: [
            part(
              "Corrected Containerfile",
              "Exec-form ENTRYPOINT with the fixed part and exec-form CMD with the overridable default, ARG with a default and ENV from it, plus a non-root USER; explains that run-time arguments replace CMD and are appended to ENTRYPOINT.",
              "FROM registry.access.redhat.com/ubi9/ubi-minimal:latest\nARG VERSION=dev\nENV APP_VERSION=${VERSION}\nCOPY --chmod=0755 worker /usr/local/bin/worker\nUSER 1001\nENTRYPOINT [\"/usr/local/bin/worker\", \"--queue\", \"default\"]\nCMD [\"--workers\", \"2\"]\nThe JSON arrays are the exec form: no shell, the worker is PID 1, and podman run's trailing arguments replace CMD and are appended to ENTRYPOINT -- so podman run hadley/worker --workers 8 runs worker --queue default --workers 8."
            ),
            part(
              "Verification",
              "Build with --build-arg, run with an override and see workers=8 and the version, and time podman stop at well under 10 s; inspect shows exec arrays.",
              "$ podman build --build-arg VERSION=1.4.2 -t hadley/worker:1.4.2 .\n$ podman run --rm hadley/worker:1.4.2 --workers 8\nworker: starting with queue=default workers=8 version=1.4.2\n$ podman run -d --name w hadley/worker:1.4.2\n$ time podman stop w\nreal    0m0.6s\n$ podman inspect hadley/worker:1.4.2 --format '{{.Config.Entrypoint}} | {{.Config.Cmd}}'\n[/usr/local/bin/worker --queue default] | [--workers 2]"
            ),
          ],
        },
      ],
    },
    {
      slug: "rootless-volume-permissions",
      objective:
        "Apply the security and permission requirements for host and network access from the container: rootless Podman, user namespaces and SELinux labels",
      kind: "case",
      title: "A rootless container cannot write to its host directory",
      brief:
        "A developer at the fictional clinic software company Ashcombe runs a database container rootless with a host directory for data. It fails to start. Work out why from the output and fix it without running as root.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ mkdir -p ~/pgdata\n$ podman run -d --name db -e POSTGRES_PASSWORD=dev -v ~/pgdata:/var/lib/postgresql/data docker.io/library/postgres:16\n$ podman logs db\nmkdir: cannot create directory '/var/lib/postgresql/data': Permission denied\n$ podman inspect docker.io/library/postgres:16 --format '{{.Config.User}}'\n\n$ podman run --rm docker.io/library/postgres:16 id postgres\nuid=999(postgres) gid=999(postgres) groups=999(postgres)\n$ ls -ldZ ~/pgdata\ndrwxr-xr-x. 2 dev dev unconfined_u:object_r:user_home_t:s0 6 Nov  9 10:02 /home/dev/pgdata\n$ getenforce\nEnforcing\n$ podman unshare cat /proc/self/uid_map\n         0       1000          1\n         1     100000      65536",
          ask: "Explain both problems hiding in this output and fix the mount so the database starts rootless.",
          parts: [
            part(
              "SELinux label",
              "On an Enforcing host, a container process runs as container_t and may not write to a directory labelled user_home_t; the mount needs the :Z (private) or :z (shared) suffix so Podman relabels it container_file_t; explains Z versus z.",
              "The directory carries user_home_t, and SELinux confines container processes (container_t), which may only write files labelled container_file_t (with the container's category pair). The fix is to let Podman relabel the mount: -v ~/pgdata:/var/lib/postgresql/data:Z. Uppercase Z gives the directory a private label with this container's MCS categories; lowercase z labels it shared so several containers can use it. Never relabel system directories this way -- only directories dedicated to the container."
            ),
            part(
              "User namespace and ownership",
              "The postgres image switches to uid 999 at startup; in rootless Podman uid 999 inside maps to host uid 100000+998 = 100998, which does not own ~/pgdata (owned by the user, mapped to container uid 0), so even with the label fixed the directory is not writable by 999; fixes: podman unshare chown 999:999 ~/pgdata, or --userns=keep-id:uid=999,gid=999 so the directory owner maps to the container's postgres uid.",
              "The uid_map shows the rootless mapping: container uid 0 is the user (1000), container uids 1-65536 map to host 100000-165535. Postgres drops to uid 999, which is host uid 100998 -- not the owner of ~/pgdata (host uid 1000, i.e. container root). Permission denied again, even after relabelling. Two clean fixes: chown from inside the user namespace, podman unshare chown 999:999 ~/pgdata (the host then shows owner 100998), or run with --userns=keep-id:uid=999,gid=999 so your own uid appears as 999 inside the container and the directory you own is writable by postgres."
            ),
            part(
              "Working command and verification",
              "A corrected podman run with :Z and the ownership fix, logs showing the database ready, and ls -Z on the host showing container_file_t and the mapped owner.",
              "$ podman rm -f db\n$ podman unshare chown 999:999 ~/pgdata\n$ podman run -d --name db -e POSTGRES_PASSWORD=dev -v ~/pgdata:/var/lib/postgresql/data:Z docker.io/library/postgres:16\n$ podman logs db | tail -1\nLOG:  database system is ready to accept connections\n$ ls -ldZn ~/pgdata\ndrwx------. 19 100998 100998 system_u:object_r:container_file_t:s0:c214,c768 4096 Nov  9 10:10 /home/dev/pgdata\nThe host now shows the relabelled type with this container's categories and the mapped owner uid 100998 -- exactly what rootless isolation means: the database's files are owned by a uid that is not yours and not root."
            ),
          ],
        },
        {
          text: "The developer next asks why the container can publish port 8080 but not 443, and why it cannot ping other hosts.",
          ask: "Explain the rootless network restrictions and their remedies.",
          parts: [
            part(
              "Privileged ports",
              "Rootless Podman has no capability to bind host ports below 1024; publish to a high port (-p 8443:443) or lower net.ipv4.ip_unprivileged_port_start via sysctl if policy allows; the container's own port 443 inside is fine -- the restriction is the host side.",
              "-p 443:443 fails with 'permission denied' because the rootless user cannot bind privileged host ports. Inside the container the process may listen on 443 freely; map it to a high host port, -p 8443:443, or (as root, by policy) set sysctl net.ipv4.ip_unprivileged_port_start=443 to allow it. A reverse proxy or firewall redirect on the host is the usual production answer."
            ),
            part(
              "Rootless networking and ICMP",
              "Rootless containers use a user-mode network stack (pasta by default in Podman 5, formerly slirp4netns), which has no raw sockets for ping unless net.ipv4.ping_group_range includes the user's gid; TCP/UDP work normally; explains that pasta gives the container the host's IP view.",
              "In Podman 5 rootless containers use pasta for networking: the container's traffic is relayed through a user-space process, so there are no raw sockets and ping needs the unprivileged ICMP socket, which works only if the host's net.ipv4.ping_group_range covers the user's gid (many distributions set it to '1 0', i.e. nobody). curl, DNS and ordinary TCP/UDP all work. Use curl or nc to test connectivity rather than ping, or have an administrator widen ping_group_range."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------- manage images 15%
    {
      slug: "registry-auth-and-aliases",
      objective: "Configure private registry security: logging in, auth files, TLS and insecure-registry settings in registries.conf",
      kind: "build",
      title: "Configure Podman for a private registry",
      brief:
        "The fictional logistics firm Oakenshaw runs a private registry at registry.oakenshaw.example:5000 with a self-signed certificate and user accounts. Configure a RHEL 10 developer workstation so podman pull/push works securely, short names resolve, and credentials are stored sensibly.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Configure TLS trust, registries.conf and login, and show the verification commands.",
          parts: [
            part(
              "Trust the certificate",
              "Place the registry's CA certificate in /etc/containers/certs.d/registry.oakenshaw.example:5000/ca.crt (per-registry trust) rather than marking the registry insecure; explains that insecure=true disables TLS verification and is a last resort for lab registries only.",
              "$ sudo mkdir -p /etc/containers/certs.d/registry.oakenshaw.example:5000\n$ sudo cp oakenshaw-ca.crt /etc/containers/certs.d/registry.oakenshaw.example:5000/ca.crt\nPodman (and skopeo, buildah) look in certs.d for a directory named host:port and trust ca.crt there for that registry only -- the right fix for a self-signed or private CA. The alternative, insecure = true in registries.conf, turns off certificate verification (and allows plain HTTP) and belongs only in throwaway labs."
            ),
            part(
              "registries.conf",
              "A drop-in /etc/containers/registries.conf.d/ file adding the registry to unqualified-search-registries (or better, a short-name alias in the [aliases] table so 'oakenshaw/api' resolves without searching), and short-name-mode enforcing; notes the user-level override at ~/.config/containers/.",
              "$ sudo tee /etc/containers/registries.conf.d/50-oakenshaw.conf <<'EOF'\nunqualified-search-registries = [\"registry.access.redhat.com\", \"registry.redhat.io\", \"docker.io\"]\nshort-name-mode = \"enforcing\"\n\n[[registry]]\nlocation = \"registry.oakenshaw.example:5000\"\n\n[aliases]\n\"oak/api\" = \"registry.oakenshaw.example:5000/platform/api\"\nEOF\nFully qualified names are always safest; aliases make short names deterministic (oak/api never searches the internet), and enforcing mode makes Podman prompt rather than guess when a short name is ambiguous. A user can override in ~/.config/containers/registries.conf.d/ without root."
            ),
            part(
              "Login and auth file",
              "podman login stores credentials in ${XDG_RUNTIME_DIR}/containers/auth.json by default (lost at logout) or in a chosen --authfile; a robot account rather than a personal password for automation; podman login --get-login and logout; explains auth.json contents are base64, not encrypted, so file permissions matter.",
              "$ podman login registry.oakenshaw.example:5000\nUsername: dev-marta\nPassword:\nLogin Succeeded!\n$ podman login --get-login registry.oakenshaw.example:5000\ndev-marta\nBy default rootless Podman writes the credential to $XDG_RUNTIME_DIR/containers/auth.json, which disappears at logout -- good for a workstation. For a CI job or a persistent file, use --authfile ~/.config/containers/auth.json (or REGISTRY_AUTH_FILE) and a robot account token, and keep the file 0600: it holds base64 of user:password, not an encrypted secret. podman logout removes the entry."
            ),
            part(
              "Verify",
              "podman pull via alias and fully qualified name, podman push with a tag, skopeo inspect against the registry showing TLS works, and a failure demonstration without the CA to show why.",
              "$ podman pull oak/api:1.2\nResolved \"oak/api\" as an alias (/etc/containers/registries.conf.d/50-oakenshaw.conf)\nTrying to pull registry.oakenshaw.example:5000/platform/api:1.2...\n$ podman tag localhost/marlow/press-web:1.0 registry.oakenshaw.example:5000/platform/press-web:1.0\n$ podman push registry.oakenshaw.example:5000/platform/press-web:1.0\nCopying blob ... done\nWriting manifest to image destination\n$ skopeo inspect docker://registry.oakenshaw.example:5000/platform/press-web:1.0 | jq .Digest\n\"sha256:51d0...\"\nWithout the CA file the same pull fails with 'x509: certificate signed by unknown authority' -- the signal to add the certificate, not to set insecure."
            ),
          ],
        },
      ],
    },
    {
      slug: "image-backup-vs-container-state",
      objective:
        "Back up an image with its layers and metadata (podman save/load) versus backing up a container's state (podman commit, export/import)",
      kind: "case",
      title: "Choose the right backup for an image and for a container",
      brief:
        "At the fictional lab Pemberton Analytics, a developer must (a) move a built image to an air-gapped machine and (b) preserve a long-running container in which they hand-configured a tool. They used the wrong commands for each.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ podman export -o api.tar pemberton/api:2.1\nError: no container with name or ID \"pemberton/api:2.1\" found: no such container\n$ podman run -d --name api pemberton/api:2.1\n$ podman export -o api.tar api\n$ scp api.tar airgap:\n# on airgap\n$ podman import api.tar pemberton/api:2.1\n$ podman run --rm pemberton/api:2.1\nError: no command specified\n$ podman inspect pemberton/api:2.1 --format '{{.Config.Cmd}} {{.Config.Env}} {{len .RootFS.Layers}}'\n[] [] 1\n\n# separately, for the configured container\n$ podman save -o tool.tar pemberton/tool:latest\n$ podman rm -f tool    # container with hand-made config\n$ podman load -i tool.tar\n$ podman run -it pemberton/tool:latest ls /etc/tool/\nls: cannot access '/etc/tool/': No such file or directory",
          ask: "Explain what each command actually captured and why the results were wrong.",
          parts: [
            part(
              "export/import flattens a container",
              "podman export dumps a container's filesystem (not an image) as a single tar: no layers, no metadata (CMD, ENV, EXPOSE, USER, labels); podman import creates a one-layer image with no config, hence 'no command specified' and empty Cmd/Env; fine for a filesystem snapshot, wrong for moving an image.",
              "podman export works on containers and writes only the merged root filesystem -- it discards the image's layer history and all of its configuration. Importing that tar produces a single-layer image with no CMD, no ENV, no EXPOSE, no USER (the inspect shows empty arrays and one layer), so the container has nothing to run. The developer needed the image itself, metadata and layers included."
            ),
            part(
              "save/load keeps the image, not the container's changes",
              "podman save archives an image with all layers and its manifest/config; it knows nothing about changes made inside a running container's writable layer -- those live in the container, which was then deleted; the /etc/tool configuration was never in the image, so load restored the pristine image.",
              "podman save serialises an image: every layer plus the manifest and config JSON, restorable with podman load on another host with CMD, ENV and ports intact. But the hand-made files under /etc/tool existed only in the container's writable layer, which is not part of the image; deleting the container deleted them. save/load was the right tool for (a) and the wrong tool for (b)."
            ),
          ],
        },
        {
          text: "Give the correct procedures for both cases and verify them.",
          ask: "Show the commands for moving the image and for preserving the configured container, with checks.",
          parts: [
            part(
              "Moving an image air-gapped",
              "podman save (optionally --format oci-archive or docker-archive, multiple tags with -m) and podman load on the target, then inspect to confirm layers and Cmd; or skopeo copy to a dir: or oci-archive: transport.",
              "$ podman save --format oci-archive -o api-2.1.tar pemberton/api:2.1\n$ sha256sum api-2.1.tar > api-2.1.tar.sha256     # verify integrity after transfer\n# on airgap\n$ sha256sum -c api-2.1.tar.sha256 && podman load -i api-2.1.tar\nLoaded image: localhost/pemberton/api:2.1\n$ podman inspect pemberton/api:2.1 --format '{{.Config.Cmd}} {{len .RootFS.Layers}}'\n[python app.py] 7\nAll seven layers and the config travel together. skopeo copy docker://... oci-archive:api-2.1.tar does the same without a local pull."
            ),
            part(
              "Preserving a configured container",
              "podman commit the container to a new image (with --change to adjust CMD/ENV if needed, --author/--message for provenance), then save that image; explains commit captures the writable layer as a new layer, and that a Containerfile is the better long-term record.",
              "$ podman commit --author 'Pemberton Lab' --message 'tool configured for cluster B' tool pemberton/tool:configured\n$ podman save -o tool-configured.tar pemberton/tool:configured\n$ podman run --rm pemberton/tool:configured ls /etc/tool/\nconfig.yaml  clusters.d\npodman commit turns the container's writable layer into a new image layer on top of the original, keeping metadata. It rescues the work, but a hand-configured image is hard to reproduce; the follow-up is to write the same configuration into a Containerfile (COPY config into /etc/tool) so the next build does not depend on anyone's shell history."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- run locally 20%
    {
      slug: "run-publish-restart-limits",
      objective:
        "Run containers locally using Podman with the common run options: detached, named, restart policy, removal and resource limits",
      kind: "build",
      title: "Run a cache and an API with the right run options",
      brief:
        "On a developer workstation at the fictional recruiter Thornfield Talent, run a Valkey cache and the company's API container so that they restart with the user session, the API can reach the cache by name, the API is reachable on localhost:8080, both have memory limits, and logs and events can be read.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the network and run commands with the options explained, then show logs, events and inspect checks.",
          parts: [
            part(
              "Network and the cache",
              "Create a user-defined network so containers resolve each other by name (the default rootless network has no DNS between containers); run the cache detached, named, with --restart=always (or unless-stopped), a memory limit and a named volume.",
              "$ podman network create thornfield\n$ podman run -d --name cache --network thornfield --restart=always -m 256m -v cache-data:/data docker.io/valkey/valkey:8\nA user-defined network enables container-name DNS (netavark's aardvark-dns), so 'cache' resolves from the API container; the default podman network does not. -d detaches, --name gives a stable name, --restart=always restarts the container on failure and when Podman's restart service runs, -m caps memory (cgroups v2; rootless memory limits work on RHEL 10), and the named volume keeps the data when the container is recreated."
            ),
            part(
              "The API",
              "Run the API on the same network, publish 8080 bound to 127.0.0.1 only, pass the cache address by environment, set --restart=unless-stopped, CPU and memory limits, and --rm is not used because restart policies and --rm conflict.",
              "$ podman run -d --name api --network thornfield --restart=unless-stopped -p 127.0.0.1:8080:8080 -e CACHE_URL=redis://cache:6379 -m 512m --cpus 1.0 registry.thornfield.example/api:3.4\nBinding to 127.0.0.1 keeps the API off the LAN while developing. --rm cannot be combined with a restart policy (a container that removes itself cannot be restarted), so for throwaway runs use --rm and for services use --restart. CACHE_URL uses the cache container's name on the shared network."
            ),
            part(
              "Restart across sessions",
              "Rootless containers die with the user session unless lingering is enabled (loginctl enable-linger) and podman-restart.service is enabled for the user; Quadlet (.container units under ~/.config/containers/systemd) is the supported way to run them as systemd services.",
              "$ loginctl enable-linger $USER\n$ systemctl --user enable --now podman-restart.service\nWithout linger, a rootless user's processes are killed at logout; podman-restart.service starts containers with --restart=always at boot. The supported production pattern is Quadlet: a ~/.config/containers/systemd/api.container file with [Container] Image=..., PublishPort=..., Network=thornfield.network, then systemctl --user daemon-reload && systemctl --user start api -- systemd then owns restarts, ordering and logging."
            ),
            part(
              "Logs, events and inspect",
              "podman logs -f and --since, podman events filtered by container, podman inspect with format templates for restart policy, IP and port bindings; podman stats for the limits.",
              "$ podman logs --since 5m -f api\n{\"level\":\"info\",\"msg\":\"connected to cache\",\"addr\":\"cache:6379\"}\n$ podman events --filter container=api --since 10m\n2026-11-09 11:02:13 container start 7b1e... (image=registry.thornfield.example/api:3.4, name=api)\n$ podman inspect api --format '{{.HostConfig.RestartPolicy.Name}} {{.NetworkSettings.Networks.thornfield.IPAddress}} {{.HostConfig.PortBindings}}'\nunless-stopped 10.89.0.3 map[8080/tcp:[{127.0.0.1 8080}]]\n$ podman stats --no-stream --format '{{.Name}} {{.MemUsage}} {{.CPUPerc}}'\napi 84.2MB / 512MB 0.31%\ncache 12.6MB / 256MB 0.05%"
            ),
          ],
        },
      ],
    },
    {
      slug: "inspect-and-publish-mismatch",
      objective: "Expose public applications by publishing ports and configuring container networks",
      kind: "case",
      title: "The application runs but nothing answers on the published port",
      brief:
        "A developer at the fictional insurer Redgrave started their web container and cannot reach it from the browser. Read the Podman output to find the cause.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ podman run -d --name web -p 8080:80 redgrave/web:5.0\n$ curl -s -o /dev/null -w '%{http_code}\\n' localhost:8080\n000\ncurl: (56) Recv failure: Connection reset by peer\n$ podman ps --format '{{.Names}} {{.Status}} {{.Ports}}'\nweb Up 2 minutes 0.0.0.0:8080->80/tcp\n$ podman logs web | tail -2\n[info] listening on 127.0.0.1:3000\n[info] ready\n$ podman inspect web --format '{{.Config.ExposedPorts}} {{.NetworkSettings.Ports}}'\nmap[80/tcp:{}] map[80/tcp:[{0.0.0.0 8080}]]\n$ podman exec web ss -ltn\nState  Recv-Q Send-Q Local Address:Port\nLISTEN 0      511        127.0.0.1:3000",
          ask: "Diagnose the two mismatches and give the corrected run command.",
          parts: [
            part(
              "Wrong container port",
              "Podman forwards host 8080 to container port 80 (as published and as EXPOSEd in the image), but the application listens on 3000 -- nothing listens on 80, so the connection is reset; EXPOSE in the image documents intent and does not make the app listen there.",
              "The publish maps host 8080 -> container 80, and the image's EXPOSE 80 agrees, but the process inside listens on port 3000 (logs and ss both say so). A connection to container port 80 finds no listener and is reset. EXPOSE is metadata; it neither opens nor changes anything. The publish must match the port the process actually binds: -p 8080:3000."
            ),
            part(
              "Bound to loopback inside the container",
              "The app listens on 127.0.0.1 inside the container's network namespace; traffic forwarded from the host arrives on the container's eth0 address, not its loopback, so even -p 8080:3000 fails until the app binds 0.0.0.0 (via its config or an environment variable such as HOST=0.0.0.0).",
              "Even with the port fixed, 127.0.0.1:3000 inside the container is the container's own loopback. Port forwarding delivers packets to the container's eth0 IP (10.88.x.x), where nothing listens. The application must bind all interfaces inside the container -- usually an environment variable or flag such as HOST=0.0.0.0 or --bind 0.0.0.0. Binding 0.0.0.0 inside a container is normal; the host's -p decides what is exposed outside."
            ),
            part(
              "Corrected run and check",
              "The corrected command and verification with curl, ss and podman port; optional note on fixing the image's EXPOSE and default bind so the next developer does not repeat it.",
              "$ podman rm -f web\n$ podman run -d --name web -p 8080:3000 -e HOST=0.0.0.0 redgrave/web:5.0\n$ podman port web\n3000/tcp -> 0.0.0.0:8080\n$ podman exec web ss -ltn | tail -1\nLISTEN 0      511          0.0.0.0:3000\n$ curl -s -o /dev/null -w '%{http_code}\\n' localhost:8080\n200\nThen fix the image: EXPOSE 3000 and ENV HOST=0.0.0.0 in the Containerfile so the metadata and default behaviour match what the application does."
            ),
          ],
        },
        {
          text: "The developer now wants the same application reachable from another container named 'gateway' on the host without publishing a port at all.",
          ask: "Explain how container-to-container access works and show it.",
          parts: [
            part(
              "Shared user-defined network",
              "Put both containers on a user-defined network; the gateway reaches web by container name on the container port (3000) directly -- no -p needed; publishing is only for traffic from outside the network; alternatively a pod shares one network namespace and localhost.",
              "$ podman network create redgrave\n$ podman run -d --name web --network redgrave -e HOST=0.0.0.0 redgrave/web:5.0\n$ podman run -d --name gateway --network redgrave -p 8443:8443 redgrave/gateway:2.0\n$ podman exec gateway curl -s -o /dev/null -w '%{http_code}\\n' http://web:3000/\n200\nOn a user-defined network netavark provides DNS, so 'web' resolves to the container's IP and traffic goes straight to its port 3000; -p is only about the host. If the two belong together tightly, run them in one pod (podman pod create -p 8443:8443) and they share a network namespace -- the gateway would then reach the app at localhost:3000."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------ multi-container 20%
    {
      slug: "pod-with-secret-and-volume",
      objective: "Create application stacks with Podman pods, podman-compose or docker-compose files, and Quadlet or kube YAML where appropriate",
      kind: "build",
      title: "Run a two-service stack as a Podman pod from kube YAML",
      brief:
        "The fictional bookshop Wrenfield Books needs its API and a PostgreSQL database to run together on a RHEL 10 host with Podman: the database password from a Podman secret, the data in a named volume, the API's config file mounted from the host, and the API published on 8080. Build it as a pod with kube YAML so it can later move to OpenShift.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Create the secret and volume, write the kube YAML, play it, and verify the dependencies and configuration.",
          parts: [
            part(
              "Secret and volume",
              "podman secret create from a file or stdin (never on the command line in history), a named volume for the database, and the host config directory relabelled for SELinux; explains secrets are stored by Podman and injected as files or env at run time.",
              "$ printf '%s' \"$(openssl rand -base64 24)\" | podman secret create wren-db-password -\n$ podman secret ls\nID                         NAME              DRIVER\n6f2a...                    wren-db-password  file\n$ podman volume create wren-pgdata\n$ ls -Z ./config/\nunconfined_u:object_r:user_home_t:s0 api.yaml\nThe secret lives in Podman's secret store, not in the image, not in a Compose file and not in shell history (stdin, not an argument). The volume outlives the pod. The config directory will be mounted with an SELinux relabel so the containers may read it."
            ),
            part(
              "Kube YAML",
              "A Pod manifest with two containers: postgres with POSTGRES_PASSWORD from the secret via Podman's secret-as-env support (a Kubernetes Secret named like the Podman secret, valueFrom secretKeyRef) and the volume at /var/lib/postgresql/data; the API with env pointing at localhost (shared pod namespace), a hostPath volume for config, a published port, and a readiness probe; explains the shared network namespace.",
              "apiVersion: v1\nkind: Pod\nmetadata:\n  name: wrenfield\n  labels: {app: wrenfield}\nspec:\n  containers:\n  - name: db\n    image: docker.io/library/postgres:16\n    env:\n    - name: POSTGRES_PASSWORD\n      valueFrom: {secretKeyRef: {name: wren-db-password, key: wren-db-password}}\n    volumeMounts:\n    - {name: pgdata, mountPath: /var/lib/postgresql/data}\n  - name: api\n    image: registry.wrenfield.example/api:1.8\n    env:\n    - {name: DATABASE_URL, value: postgres://postgres@localhost:5432/postgres}\n    - name: PGPASSWORD\n      valueFrom: {secretKeyRef: {name: wren-db-password, key: wren-db-password}}\n    ports:\n    - {containerPort: 8080, hostPort: 8080}\n    volumeMounts:\n    - {name: config, mountPath: /etc/api, readOnly: true}\n    readinessProbe:\n      httpGet: {path: /healthz, port: 8080}\n      periodSeconds: 5\n  volumes:\n  - name: pgdata\n    persistentVolumeClaim: {claimName: wren-pgdata}\n  - name: config\n    hostPath: {path: ./config, type: Directory}\nContainers in a pod share one network namespace, so the API reaches the database at localhost:5432 without a network or DNS. podman kube play maps the PVC name to the existing named volume and secretKeyRef to the Podman secret of that name."
            ),
            part(
              "Play and dependency behaviour",
              "podman kube play with --replace, the SELinux relabel option for the hostPath (podman kube play supports :Z via the volume's hostPath type or --configmap; or pre-label with chcon/semanage), podman pod ps and podman ps --pod; start order within a pod is not guaranteed so the API must retry its database connection or use the readiness probe; explains podman kube down.",
              "$ podman kube play --replace wrenfield.yaml\nPod:\n9a1b...\nContainers:\n2c3d...\n4e5f...\n$ podman pod ps\nPOD ID        NAME        STATUS   CREATED         INFRA ID      # OF CONTAINERS\n9a1b...       wrenfield   Running  10 seconds ago  1f0e...       3\n$ podman ps --pod --format '{{.Names}} {{.Status}} {{.PodName}}'\nwrenfield-db   Up 10 seconds (healthy)  wrenfield\nwrenfield-api  Up 9 seconds (starting)  wrenfield\nContainers in a pod start together; there is no depends_on, so the API must retry until Postgres accepts connections (most clients do) -- the readiness probe keeps it 'starting' until /healthz passes. For the hostPath under SELinux, label the directory once (chcon -Rt container_file_t ./config) or use a ConfigMap passed with --configmap instead of a hostPath. podman kube down wrenfield.yaml stops and removes the pod but leaves the named volume."
            ),
            part(
              "Verify configuration, secret and volume",
              "curl the API, exec into the API to see the mounted config and that the secret is in env but not in the image, check the volume holds data, and show that the same YAML is a valid Kubernetes Pod (oc apply -f with Secret/PVC objects) for the later move.",
              "$ curl -s localhost:8080/healthz\n{\"db\":\"ok\"}\n$ podman exec wrenfield-api ls /etc/api\napi.yaml\n$ podman exec wrenfield-api sh -c 'echo ${PGPASSWORD:0:4}...'\nQm9v...\n$ podman inspect registry.wrenfield.example/api:1.8 --format '{{.Config.Env}}' | grep -c PGPASSWORD\n0\n$ podman volume inspect wren-pgdata --format '{{.Mountpoint}}' | xargs ls | head -3\nbase  global  pg_wal\nThe password reaches the process at run time only. Because this is Kubernetes Pod YAML, the move to OpenShift is: create a real Secret named wren-db-password and a PVC named wren-pgdata, swap the hostPath for a ConfigMap, drop hostPort for a Service and Route, and oc apply -f the same file."
            ),
          ],
        },
      ],
    },
    {
      slug: "compose-stack-config-and-secrets",
      objective: "Configure volumes for persistent data shared between services and across restarts",
      kind: "case",
      title: "A Compose stack loses its data and leaks its password",
      brief:
        "The fictional events company Larkin Live runs a three-service development stack with podman-compose. After every 'down' the uploads disappear, the database password is visible in the image, and the worker starts before the broker is ready. Review the compose file and fix it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "compose.yaml (before):\nservices:\n  web:\n    build: .\n    ports: [\"8080:8080\"]\n    volumes:\n      - /var/www/uploads\n  worker:\n    image: localhost/larkin/worker:dev\n    environment:\n      - BROKER_URL=amqp://broker:5672\n  broker:\n    image: docker.io/library/rabbitmq:3\n  db:\n    image: docker.io/library/postgres:16\n    environment:\n      - POSTGRES_PASSWORD=larkin-dev-2026\n\nContainerfile (web), excerpt:\nENV DB_PASSWORD=larkin-dev-2026\n\n$ podman-compose down && podman-compose up -d\n$ podman volume ls\nDRIVER  VOLUME NAME\nlocal   8c1f0a...          # a new anonymous volume every time\n$ podman logs larkin_worker_1 | head -1\npika.exceptions.AMQPConnectionError: Connection refused (broker:5672)\n$ podman history localhost/larkin_web:latest --format '{{.CreatedBy}}' | grep -i password\n/bin/sh -c #(nop) ENV DB_PASSWORD=larkin-dev-2026",
          ask: "Explain the three problems and rewrite the compose file and Containerfile excerpt.",
          parts: [
            part(
              "Anonymous volume",
              "The uploads volume is declared without a name, so Compose creates a fresh anonymous volume per run and down removes or orphans the old one; a named volume under a top-level volumes: key persists across down/up; the db service has no volume at all, so its data is also lost.",
              "volumes: - /var/www/uploads declares an anonymous volume: each 'up' creates a new random-named volume, and nothing refers to the previous one, so the uploads vanish (podman volume ls shows the new id). Declare a named volume -- uploads:/var/www/uploads with a top-level volumes: uploads: {} -- and Compose reuses it across down and up. The db service has no volume at all; its data lives in the container's writable layer and dies with it. Add pgdata:/var/lib/postgresql/data."
            ),
            part(
              "Password baked into the image",
              "ENV in the Containerfile stores the password in the image config and history, visible to anyone with the image; pass it at run time instead -- a Compose secret (file-based) mounted at /run/secrets/db_password that the app reads, or a Podman secret with external: true; the db service likewise should use POSTGRES_PASSWORD_FILE.",
              "podman history shows the ENV layer: the password ships inside the image to every registry it is pushed to. Remove the ENV line from the Containerfile and deliver the value at run time via a secret: Compose secrets mount a file at /run/secrets/<name>; the web app reads DB_PASSWORD_FILE and postgres supports POSTGRES_PASSWORD_FILE natively. With podman-compose the secret can be an existing Podman secret (external: true), keeping it out of the repository entirely."
            ),
            part(
              "Start order",
              "depends_on with condition: service_healthy on the broker (and a healthcheck on the broker) delays the worker until RabbitMQ answers; the worker should still retry, because depends_on orders startup but cannot keep a dependency alive.",
              "depends_on without a condition only orders container creation; RabbitMQ takes several seconds to accept connections, so the worker connects into a refused port and exits. Give the broker a healthcheck (rabbitmq-diagnostics -q ping) and make the worker depends_on: broker: condition: service_healthy. Keep retry logic in the worker as well: depends_on helps at startup but does nothing if the broker restarts later."
            ),
            part(
              "Rewritten files",
              "The corrected compose.yaml with named volumes, secrets, healthcheck and depends_on, and the Containerfile without the ENV; verification: volumes persist across down/up, history has no password, worker connects.",
              "services:\n  web:\n    build: .\n    ports: [\"8080:8080\"]\n    environment: [DB_PASSWORD_FILE=/run/secrets/db_password]\n    secrets: [db_password]\n    volumes: [uploads:/var/www/uploads]\n    depends_on: {db: {condition: service_started}}\n  worker:\n    image: localhost/larkin/worker:dev\n    environment: [BROKER_URL=amqp://broker:5672]\n    depends_on: {broker: {condition: service_healthy}}\n  broker:\n    image: docker.io/library/rabbitmq:3\n    healthcheck:\n      test: [\"CMD\", \"rabbitmq-diagnostics\", \"-q\", \"ping\"]\n      interval: 5s\n      retries: 12\n  db:\n    image: docker.io/library/postgres:16\n    environment: [POSTGRES_PASSWORD_FILE=/run/secrets/db_password]\n    secrets: [db_password]\n    volumes: [pgdata:/var/lib/postgresql/data]\nvolumes:\n  uploads: {}\n  pgdata: {}\nsecrets:\n  db_password:\n    external: true      # podman secret create db_password -\nContainerfile: delete the ENV DB_PASSWORD line. Verify: podman-compose down && podman-compose up -d, then podman volume ls shows larkin_uploads and larkin_pgdata reused, podman history has no password, and the worker log reads 'connected to broker'."
            ),
          ],
        },
        {
          text: "The team asks whether to keep podman-compose or move to Quadlet on the shared staging host.",
          ask: "Recommend, with the trade-off.",
          parts: [
            part(
              "Recommendation",
              "podman-compose suits developer laptops (familiar file, quick up/down); on a long-running host prefer Quadlet (.container/.volume/.network/.pod units in /etc/containers/systemd or ~/.config/containers/systemd) or podman kube play with a systemd unit, because systemd gives boot start, restart, dependencies (After=/Requires=) and journald logging; the kube YAML route also prepares for OpenShift.",
              "Keep Compose for laptops. On staging, hand the stack to systemd through Quadlet: a larkin.pod unit, one .container unit per service with Pod=larkin.pod, .volume units for uploads and pgdata, and Secret=db_password in the containers. systemd then starts the stack at boot, restarts failed services, orders them (After=larkin-broker.service) and logs to journald -- things podman-compose does not do. If OpenShift is the destination, writing the stack as kube YAML and running it with a podman-kube@.service unit gets the same benefits and a file that moves as-is."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------- troubleshooting 15%
    {
      slug: "container-exits-immediately",
      objective: "Diagnose failures from application logs, including containers that exit immediately",
      kind: "case",
      title: "Three containers that will not stay up",
      brief:
        "The on-call developer at the fictional courier firm Selby Dispatch has three containers in Exited state on a staging host. Read the Podman output and give each its cause and fix.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ podman ps -a --format '{{.Names}} {{.Status}} {{.Image}}'\nreport  Exited (0) 3 minutes ago    selby/report:2.2\napi     Exited (1) 3 minutes ago    selby/api:4.1\nsched   Exited (126) 3 minutes ago  selby/sched:1.0\n\n$ podman logs report\n(no output)\n$ podman inspect report --format '{{.Config.Cmd}} {{.Config.Entrypoint}}'\n[nginx] []\n\n$ podman logs api | tail -2\nError: listen EACCES: permission denied 0.0.0.0:80\n    at Server.setupListenHandle\n$ podman inspect api --format '{{.Config.User}} {{.HostConfig.PortBindings}}'\n1001 map[80/tcp:[{0.0.0.0 8080}]]\n\n$ podman logs sched\n/bin/sh: /opt/sched/run.sh: Permission denied\n$ podman run --rm --entrypoint ls selby/sched:1.0 -l /opt/sched/run.sh\n-rw-r--r--. 1 root root 212 Nov  8 17:01 /opt/sched/run.sh",
          ask: "Diagnose each container and give the fix.",
          parts: [
            part(
              "report: exit 0, nothing in the logs",
              "nginx without -g 'daemon off;' forks to the background and the foreground process exits 0 immediately, so the container ends 'successfully'; a container lives as long as its PID 1; fix the CMD to run in the foreground.",
              "Exit code 0 with no logs is the signature of a process that daemonised: nginx by default forks a master into the background and the launched process returns 0 -- so PID 1 exits and the container stops, cleanly. A container runs exactly as long as its PID 1 does. Fix: CMD [\"nginx\", \"-g\", \"daemon off;\"] (the official images do this). The same applies to anything run with & or a service-style start script."
            ),
            part(
              "api: exit 1, EACCES on port 80",
              "The process runs as uid 1001 and tries to bind port 80 inside the container; non-root cannot bind ports below 1024 without CAP_NET_BIND_SERVICE; fix by having the app listen on an unprivileged port (8080) and publishing -p 8080:8080, or add the capability (--cap-add NET_BIND_SERVICE) / set net.ipv4.ip_unprivileged_port_start in the container.",
              "The app is non-root (User 1001) and binds 0.0.0.0:80 inside the container; binding a privileged port needs CAP_NET_BIND_SERVICE, which a non-root process lacks, so listen() fails with EACCES and the app exits 1. Note the publish maps host 8080 to container 80 -- the developer intended 80 inside. Best fix: run the app on 8080 (PORT=8080) and publish -p 8080:8080. If it must be 80, podman run --cap-add NET_BIND_SERVICE or --sysctl net.ipv4.ip_unprivileged_port_start=80 grants just that."
            ),
            part(
              "sched: exit 126, permission denied on the script",
              "Exit 126 means 'found but not executable'; the script was COPYed with mode 0644; fix with COPY --chmod=0755 (or RUN chmod +x) in the Containerfile, or run it via its interpreter (CMD [\"sh\", \"/opt/sched/run.sh\"]).",
              "126 is the shell's 'command invoked cannot execute' code. The listing shows run.sh is -rw-r--r-- -- readable, not executable. The Containerfile copied it without the execute bit (COPY preserves the source mode and the file was not executable in Git). Fix in the Containerfile: COPY --chmod=0755 run.sh /opt/sched/run.sh, or RUN chmod +x /opt/sched/run.sh; a quick workaround is CMD [\"sh\", \"/opt/sched/run.sh\"], which needs only read permission."
            ),
          ],
        },
        {
          text: "After the fixes, api stays up but requests hang for 30 s then fail. podman exec api curl -s localhost:8080/healthz returns {\"db\":\"timeout\"}; the database container is running on the same user-defined network as 'db'. podman exec api getent hosts db returns nothing; podman inspect api --format '{{.NetworkSettings.Networks}}' shows map[podman:...].",
          ask: "Diagnose and fix the connectivity problem.",
          parts: [
            part(
              "Wrong network",
              "The api container was recreated without --network and landed on the default 'podman' network, which has no DNS and is not the network db is on; name resolution fails and the connection times out; fix by recreating api with --network <name> (or podman network connect), and verify with getent and curl.",
              "The inspect shows api attached only to the default podman network, while db is on the user-defined network. The default network provides no container DNS and is a different subnet, so 'db' does not resolve and traffic cannot reach it -- hence the timeout. Fix: podman network connect selby api (immediate) or recreate with --network selby, then confirm: podman exec api getent hosts db -> 10.89.1.4 db, and the health check returns {\"db\":\"ok\"}. Write the network into the run command or Quadlet unit so a recreate cannot drop it."
            ),
          ],
        },
      ],
    },
    {
      slug: "healthcheck-readiness",
      objective: "Configure and verify readiness with health checks so a container reports when the application is ready",
      kind: "build",
      title: "Add a health check that reflects real readiness",
      brief:
        "The fictional ticketing company Ardent Events runs its API container with Podman. Deploy scripts treat 'Up' as ready, but the API needs about 20 seconds to load its catalog, so the first requests fail. Add a health check in the image and at run time, and show how tools can wait on it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Define the HEALTHCHECK in the Containerfile and the equivalent run-time flags, explain the parameters, and show the status progression and how to wait for healthy.",
          parts: [
            part(
              "HEALTHCHECK in the Containerfile",
              "A HEALTHCHECK instruction calling a lightweight endpoint (curl -f or a tiny built-in check command) with --interval, --timeout, --start-period covering the catalog load, and --retries; explains each parameter and that the check must exit 0 for healthy and 1 for unhealthy.",
              "HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=3 \\\n  CMD curl -fsS http://localhost:8080/readyz || exit 1\ninterval: how often to run; timeout: how long a single check may take; start-period: a grace window in which failures do not count toward retries (the 20 s catalog load fits inside 30 s); retries: consecutive failures before the container is marked unhealthy. The command must exit 0 when ready and non-zero otherwise. /readyz should check real dependencies (catalog loaded, database reachable), not just that the process exists -- that is the difference between liveness and readiness."
            ),
            part(
              "Run-time equivalents and Podman's actions",
              "podman run --health-cmd, --health-interval, --health-start-period, --health-retries, --health-timeout override or supply the check; Podman 5 adds --health-on-failure=(none|kill|restart|stop) so an unhealthy container can be restarted automatically; health checks run via systemd timers for rootless users.",
              "$ podman run -d --name api -p 8080:8080 \\\n    --health-cmd 'curl -fsS http://localhost:8080/readyz || exit 1' \\\n    --health-interval 10s --health-timeout 3s --health-start-period 30s --health-retries 3 \\\n    --health-on-failure restart \\\n    ardent/api:7.3\nRun-time flags override the image's HEALTHCHECK. --health-on-failure=restart makes Podman restart the container when it turns unhealthy (none merely reports). Podman schedules the checks with transient systemd timers, so systemd must be available for the user session (the normal case on RHEL)."
            ),
            part(
              "Status progression",
              "podman ps shows (starting) during start-period then (healthy); podman healthcheck run executes a check on demand; podman inspect .State.Health shows Status, FailingStreak and the Log of recent checks.",
              "$ podman ps --format '{{.Names}} {{.Status}}'\napi Up 5 seconds (starting)\n$ sleep 25; podman ps --format '{{.Names}} {{.Status}}'\napi Up 30 seconds (healthy)\n$ podman healthcheck run api; echo $?\n0\n$ podman inspect api --format '{{.State.Health.Status}} {{.State.Health.FailingStreak}}'\nhealthy 0\n$ podman inspect api --format '{{range .State.Health.Log}}{{.Start}} {{.ExitCode}}\\n{{end}}' | tail -2\n2026-11-09T12:01:10 0\n2026-11-09T12:01:20 0"
            ),
            part(
              "Waiting on readiness",
              "A deploy script that polls podman inspect for Status == healthy with a timeout instead of sleeping; podman wait --condition=healthy in Podman 5; in a pod or kube YAML the readinessProbe does the equivalent; explains why 'Up' is not 'ready'.",
              "$ podman wait --condition=healthy api && echo ready\nready\nOr, portable to older versions:\nuntil [ \"$(podman inspect -f '{{.State.Health.Status}}' api)\" = healthy ]; do sleep 2; done\n'Up' only means PID 1 is running; readiness means the application can serve. With kube YAML the same intent is a readinessProbe on the container, and on OpenShift the Service stops routing to a pod whose probe fails -- the health check is the contract that makes zero-error deploys possible."
            ),
          ],
        },
      ],
    },
  ],
};
