import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-164: Docker Certified Associate (DCA), Study Guide v1.5 (January 2025).
//
// Aligned to the six DCA domains (Orchestration 25%, Image Creation,
// Management, and Registry 20%, Installation and Configuration 15%,
// Networking 15%, Security 15%, Storage and Volumes 10%), read on
// 2026-11-08 from Mirantis's study guide PDF and the DCA listing on
// store.mirantis.com. Density (docs/labs.md, hybrid): 2 per domain.
//
// Hands-on Docker labs: docker CLI commands, Compose/stack files and
// daemon.json, against authored engine and swarm output in the real
// formats. Current Docker Engine behaviour only (overlay2, Compose file
// without a version key, docker trust); where the blueprint still names
// Docker Enterprise's UCP and DTR, the labs say MKE/MSR alongside.

export const DCA_LABS: SeedLabSet = {
  trackCode: "DCA",
  sources: [
    "https://a.storyblok.com/f/146871/x/2001ce939c/docker-study-guide_v1-5-jan-2025.pdf",
    "https://store.mirantis.com/product/docker-certified-associate-dca/",
    "https://docs.docker.com/engine/swarm/",
    "https://docs.docker.com/engine/security/trust/",
  ],
  labs: [
    // ----------------------------------------------------------------- 25%
    {
      slug: "docker-run-to-stack-file",
      objective: "Convert an application deployment into a stack file (Compose YAML) and deploy and manipulate it with docker stack deploy, ls, ps and rm",
      kind: "build",
      title: "Turn two docker run commands into a swarm stack",
      brief:
        "The fictional bakery chain Hollis & Crumb runs its ordering app on one host with two commands: docker run -d --name redis -v redis-data:/data redis:7-alpine and docker run -d --name web -p 8080:8080 -e REDIS_HOST=redis --link redis registry.hollis.example/orders-web:2.4. They now have a three-node swarm (one manager, two workers; the workers are labelled tier=app) and want the web tier to run three copies spread over the app nodes, Redis to run exactly one copy on the manager (which has the fast disk), and a single command to deploy or update the whole thing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the stack file and the commands to deploy, inspect and later scale it, and explain the swarm-specific choices.",
          parts: [
            part(
              "Stack file",
              "A Compose file (no version key needed with current Compose/stack) with two services: web (image, ports 8080:8080, environment REDIS_HOST=redis, deploy.replicas 3, deploy.placement.constraints node.labels.tier==app) and redis (image, volume redis-data:/data, deploy.replicas 1, placement constraint node.role==manager), a top-level volumes: redis-data, and a shared overlay network (the default stack network or an explicit one); notes --link is replaced by service-name DNS on the overlay network.",
              "services:\n  web:\n    image: registry.hollis.example/orders-web:2.4\n    ports:\n      - \"8080:8080\"\n    environment:\n      REDIS_HOST: redis\n    deploy:\n      replicas: 3\n      placement:\n        constraints:\n          - node.labels.tier == app\n    networks: [orders]\n  redis:\n    image: redis:7-alpine\n    volumes:\n      - redis-data:/data\n    deploy:\n      replicas: 1\n      placement:\n        constraints:\n          - node.role == manager\n    networks: [orders]\nvolumes:\n  redis-data:\nnetworks:\n  orders:\n    driver: overlay\n--link is a legacy single-host feature; on a swarm overlay network every service is reachable by its service name through swarm's built-in DNS, so REDIS_HOST=redis works unchanged."
            ),
            part(
              "Deploy and inspect",
              "docker stack deploy -c orders.yml orders, then docker stack ls, docker stack services orders, docker stack ps orders (with --no-trunc for errors) and docker service logs orders_web; explains stack deploy is idempotent so re-running it applies changes.",
              "docker stack deploy -c orders.yml orders\ndocker stack ls                       # orders  2 services\ndocker stack services orders          # orders_web 3/3, orders_redis 1/1\ndocker stack ps orders --no-trunc     # one line per task with NODE and CURRENT STATE\ndocker service logs -f orders_web\nRe-running docker stack deploy with an edited file is how you update: swarm computes the difference and rolls services whose definition changed."
            ),
            part(
              "Why those placement rules",
              "Explains node.labels.tier==app keeps web off the manager and that the label must exist (docker node update --label-add tier=app worker-1), while node.role==manager pins redis to the manager; notes a single-replica stateful service with a local volume is only as durable as that node and that the volume lives on whichever node runs the task.",
              "docker node update --label-add tier=app worker-1 (and worker-2) first, or the web tasks stay Pending with 'no suitable node'. node.role == manager pins Redis to the fast disk. Caveat worth saying aloud: the redis-data volume is a local volume on the manager; if the manager dies the task cannot move with its data. For real durability use a volume plugin that follows the task or an external Redis."
            ),
            part(
              "Scaling later",
              "docker service scale orders_web=5 for a quick change, but the durable way is editing deploy.replicas in the file and redeploying so the file stays the source of truth; mentions docker service update --image for a new version and that ports/volumes/networks are added in the file.",
              "Quick: docker service scale orders_web=5. Durable: set replicas: 5 in orders.yml and docker stack deploy -c orders.yml orders again, so the next deploy does not silently scale back to 3. New version: change the image tag in the file and redeploy (or docker service update --image registry.hollis.example/orders-web:2.5 orders_web for a one-off). Extra published ports, volumes and networks are likewise added in the file."
            ),
          ],
        },
      ],
    },
    {
      slug: "service-not-deploying",
      objective: "Interpret docker inspect output for containers, services, tasks and nodes, and the steps to troubleshoot a service that is not deploying",
      kind: "case",
      title: "Find out why a swarm service shows 0/3 replicas",
      brief:
        "At the fictional print shop Marlowe Press, a developer deployed a new service to the company's four-node swarm and reports 'swarm is broken, nothing starts'. You have manager access.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ docker service ls\nID             NAME        MODE         REPLICAS   IMAGE                                  PORTS\nq7x1m2n3o4p5   quotes      replicated   0/3        registry.marlowe.example/quotes:1.9    *:9000->9000/tcp\n\n$ docker service ps quotes --no-trunc --format 'table {{.Name}}\\t{{.Node}}\\t{{.CurrentState}}\\t{{.Error}}'\nNAME        NODE   CURRENT STATE             ERROR\nquotes.1           Pending 4 minutes ago     \"no suitable node (scheduling constraints not satisfied on 4 nodes)\"\nquotes.2           Pending 4 minutes ago     \"no suitable node (scheduling constraints not satisfied on 4 nodes)\"\nquotes.3           Pending 4 minutes ago     \"no suitable node (scheduling constraints not satisfied on 4 nodes)\"\n\n$ docker service inspect quotes --format '{{json .Spec.TaskTemplate.Placement}}'\n{\"Constraints\":[\"node.labels.region==eu-west\"]}\n\n$ docker node ls -q | xargs docker node inspect --format '{{.Description.Hostname}} {{.Spec.Role}} {{.Spec.Availability}} {{json .Spec.Labels}}'\nmgr-1 manager active {\"region\":\"eu-west-1\"}\nwrk-1 worker active {\"region\":\"eu-west-1\"}\nwrk-2 worker active {\"region\":\"eu-west-1\"}\nwrk-3 worker drain {}",
          ask: "Explain the Pending state from the evidence and give the fix with the smallest blast radius.",
          parts: [
            part(
              "Cause",
              "Reads the task error: the placement constraint node.labels.region==eu-west matches no node because the nodes are labelled region=eu-west-1 (exact string match), and wrk-3 is drained and unlabelled; the swarm itself is healthy -- the scheduler simply has nowhere allowed to put the tasks.",
              "Every task is Pending with 'scheduling constraints not satisfied on 4 nodes'. The constraint requires node.labels.region == eu-west, but three nodes carry region=eu-west-1 -- constraints compare the whole string, so they do not match -- and wrk-3 has no label and is drained anyway. Nothing is broken in the swarm: no node is eligible."
            ),
            part(
              "Smallest fix",
              "Either fix the service's constraint to the real label value (docker service update --constraint-rm 'node.labels.region==eu-west' --constraint-add 'node.labels.region==eu-west-1' quotes) or, if the team's convention is eu-west, relabel nodes; prefers changing the one service over relabelling three nodes other services may depend on, and verifies tasks move to Running.",
              "docker service update --constraint-rm 'node.labels.region==eu-west' --constraint-add 'node.labels.region==eu-west-1' quotes\ndocker service ps quotes   # tasks move to Preparing then Running on mgr-1/wrk-1/wrk-2\nChanging one service's constraint touches nothing else; relabelling the nodes could break other services that already match region=eu-west-1. Also check the stack file so the next docker stack deploy does not put the typo back."
            ),
          ],
        },
        {
          text: "The constraint is fixed. Two tasks start; the third does not:\n\n$ docker service ps quotes --no-trunc --format 'table {{.Name}}\\t{{.Node}}\\t{{.CurrentState}}\\t{{.Error}}'\nNAME            NODE    CURRENT STATE              ERROR\nquotes.1        wrk-1   Running 2 minutes ago\nquotes.2        mgr-1   Running 2 minutes ago\nquotes.3        wrk-2   Rejected 40 seconds ago    \"No such image: registry.marlowe.example/quotes:1.9@sha256:7a1c...\"\n \\_ quotes.3    wrk-2   Rejected 1 minute ago      \"No such image: registry.marlowe.example/quotes:1.9@sha256:7a1c...\"\n\n$ docker node inspect wrk-2 --format '{{.Status.State}} {{.Status.Addr}}'\nready 10.0.3.12\n\nwrk-2$ docker pull registry.marlowe.example/quotes:1.9\nError response from daemon: Get \"https://registry.marlowe.example/v2/\": x509: certificate signed by unknown authority",
          ask: "Explain why only wrk-2 fails and fix it so the task schedules there, then say how the service was deployed in a way that let two nodes pull but not the third.",
          parts: [
            part(
              "Why only wrk-2",
              "The task is Rejected on wrk-2 because that node cannot pull the image: its engine does not trust the registry's certificate (missing CA in /etc/docker/certs.d/registry.marlowe.example/ca.crt), while the other nodes have it; swarm keeps retrying on wrk-2 because the constraint and replica spread want a task there.",
              "Rejected = the node accepted the task but could not create it; the error is the image pull, and the pull on wrk-2 fails on TLS because the engine there does not have the company CA for registry.marlowe.example. mgr-1 and wrk-1 have the CA installed, so they pulled fine. Swarm's scheduler keeps placing quotes.3 on wrk-2 to spread replicas, and it keeps failing."
            ),
            part(
              "Fix",
              "Installs the registry CA on wrk-2 (sudo mkdir -p /etc/docker/certs.d/registry.marlowe.example && copy ca.crt there; no daemon restart needed for certs.d), tests docker pull on the node, then lets swarm retry or forces it with docker service update --force; rejects marking the registry insecure.",
              "wrk-2$ sudo mkdir -p /etc/docker/certs.d/registry.marlowe.example && sudo cp company-ca.crt /etc/docker/certs.d/registry.marlowe.example/ca.crt\nwrk-2$ docker pull registry.marlowe.example/quotes:1.9   # succeeds\nmgr-1$ docker service update --force quotes            # or wait for the next retry\nAdding the registry to insecure-registries in daemon.json would also 'work' and would disable TLS verification for every image from that registry -- not acceptable."
            ),
            part(
              "The deployment pattern behind it",
              "Explains that with a private registry each node pulls independently with its own engine configuration and credentials; deploying with docker stack deploy --with-registry-auth sends the manager's credentials to the tasks but cannot fix a missing CA; node setup must be uniform (configuration management or a node image) and new nodes verified with a test pull before joining.",
              "Swarm does not copy images or trust settings between nodes: every node pulls for itself. --with-registry-auth forwards the deployer's login to the agents, which covers credentials but not CA trust. The root cause is inconsistent node builds: put /etc/docker/certs.d and daemon.json under configuration management (or in the node image), and make 'docker pull <private image>' part of the node acceptance check before docker swarm join."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "efficient-dockerfile",
      objective: "Create an efficient image with a Dockerfile: layer caching and instruction order, multi-stage builds, .dockerignore and minimal base images",
      kind: "build",
      title: "Make a 980 MB Node.js image small and cache-friendly",
      brief:
        "The fictional language-learning startup Kestrel Lingo ships an Express API from this Dockerfile: FROM node:22 / COPY . /app / WORKDIR /app / RUN npm install / RUN npm run build / EXPOSE 3000 / CMD npm start. The image is 980 MB, every code change rebuilds everything from npm install onward, the build context upload takes a minute because node_modules and .git are sent, and the container runs as root.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Rewrite the Dockerfile (and the .dockerignore) and explain how each change affects size, cache behaviour or security, then show the commands that prove the result.",
          parts: [
            part(
              ".dockerignore and build context",
              "A .dockerignore excluding node_modules, .git, dist, *.log, .env and test fixtures; explains the context is sent to the daemon before any instruction runs and that COPY . . would otherwise bake the host's node_modules and secrets into the image.",
              ".dockerignore:\nnode_modules\n.git\ndist\n*.log\n.env\ncoverage\nThe build context is tarred and sent to the daemon first, so excluding node_modules and .git cuts the minute-long upload. It also stops COPY . . from copying the developer's local node_modules (built for the wrong platform) and .env secrets into image layers where docker history would expose them."
            ),
            part(
              "Instruction order for caching",
              "Set WORKDIR before COPY, copy package.json and package-lock.json first, run npm ci, then copy the rest of the source and build; explains each instruction's cache is invalidated by any change in what it copies, so dependencies are reinstalled only when the lockfile changes.",
              "WORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nA layer is rebuilt when its inputs change and every layer after it is rebuilt too. Copying only the package files first means npm ci (the slow step) reuses its cached layer on every source-only change; the original copied all source before npm install so any edit invalidated the install. npm ci is reproducible from the lockfile, unlike npm install."
            ),
            part(
              "Multi-stage build",
              "A build stage (FROM node:22 AS build) that installs all dependencies and runs the build, and a runtime stage from a slim base (node:22-alpine or node:22-slim) that copies only package files, production node_modules (npm ci --omit=dev) and the dist output; explains the toolchain, dev dependencies and source never reach the final image.",
              "FROM node:22 AS build\nWORKDIR /app\nCOPY package.json package-lock.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build && npm prune --omit=dev\n\nFROM node:22-alpine\nWORKDIR /app\nENV NODE_ENV=production\nCOPY --from=build /app/package.json ./\nCOPY --from=build /app/node_modules ./node_modules\nCOPY --from=build /app/dist ./dist\nOnly the runtime stage becomes the image: no compilers, no dev dependencies, no source tree. node:22-alpine is tens of MB against node:22's hundreds."
            ),
            part(
              "Runtime details",
              "USER node (the image's built-in non-root user), EXPOSE 3000, and exec-form CMD [\"node\",\"dist/server.js\"] instead of npm start so signals reach the process; explains root and shell-form CMD are the two common mistakes here.",
              "USER node\nEXPOSE 3000\nCMD [\"node\", \"dist/server.js\"]\nUSER node drops root (the node images ship a node user). The exec-form CMD runs node as PID 1 directly, so docker stop's SIGTERM reaches it and it shuts down cleanly; shell-form CMD npm start puts a shell and npm in front of the app and the signal is often swallowed, leaving a 10-second kill. EXPOSE documents the port; -p or a Service still publishes it."
            ),
            part(
              "Proof",
              "docker build twice (second build shows CACHED for the dependency layers after a source change), docker image ls for size, docker image history to see the layer count and sizes, and docker run ... id to confirm the user.",
              "docker build -t registry.kestrel.example/api:3.0 .\n# edit a source file, then:\ndocker build -t registry.kestrel.example/api:3.0 .      # 'CACHED [build 3/6] RUN npm ci'\ndocker image ls registry.kestrel.example/api           # ~180 MB instead of 980 MB\ndocker image history registry.kestrel.example/api:3.0  # few, small layers\ndocker run --rm registry.kestrel.example/api:3.0 id    # uid=1000(node)"
            ),
          ],
        },
      ],
    },
    {
      slug: "private-registry-push-delete",
      objective: "Run and use a registry: deploy a registry, log in, search, push, pull and delete images",
      kind: "case",
      title: "Stand up a private registry, then free the space it eats",
      brief:
        "The fictional architecture firm Dunbar Studio wants a private registry on its build server registry.dunbar.internal for CI images, with TLS from the company CA and basic authentication for now. A junior admin has started one and cannot push to it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "build-1$ docker run -d --name registry -p 5000:5000 registry:2\nbuild-1$ docker tag renders:1.0 registry.dunbar.internal:5000/renders:1.0\nbuild-1$ docker push registry.dunbar.internal:5000/renders:1.0\nThe push refers to repository [registry.dunbar.internal:5000/renders]\nGet \"https://registry.dunbar.internal:5000/v2/\": http: server gave HTTP response to HTTPS client\n\nbuild-1$ ls /srv/registry/\nca.crt  registry.dunbar.internal.crt  registry.dunbar.internal.key  htpasswd",
          ask: "Explain the error, then write the docker run command for a registry with TLS and basic auth, and the login and push commands that work.",
          parts: [
            part(
              "The error",
              "The Docker client talks HTTPS to any registry other than localhost; the registry container was started without certificates so it answers plain HTTP, hence 'server gave HTTP response to HTTPS client'; the lazy fix (insecure-registries) is wrong when a certificate is available.",
              "docker pushes over HTTPS by default for every host except localhost/127.0.0.1. The registry:2 container started with no TLS configuration serves plain HTTP on 5000, so the TLS handshake fails with that message. Adding registry.dunbar.internal:5000 to insecure-registries in daemon.json would bypass TLS on every client -- unnecessary here because a certificate exists."
            ),
            part(
              "Registry with TLS and basic auth",
              "docker run with the certs and htpasswd mounted, REGISTRY_HTTP_TLS_CERTIFICATE and REGISTRY_HTTP_TLS_KEY, REGISTRY_AUTH=htpasswd with REGISTRY_AUTH_HTPASSWD_REALM and _PATH, a volume for /var/lib/registry, and --restart=always; notes the htpasswd must be bcrypt (htpasswd -Bbn).",
              "docker rm -f registry\ndocker run -d --name registry --restart=always -p 5000:5000 \\\n  -v /srv/registry:/certs:ro -v registry-data:/var/lib/registry \\\n  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/registry.dunbar.internal.crt \\\n  -e REGISTRY_HTTP_TLS_KEY=/certs/registry.dunbar.internal.key \\\n  -e REGISTRY_AUTH=htpasswd -e REGISTRY_AUTH_HTPASSWD_REALM='Dunbar Registry' \\\n  -e REGISTRY_AUTH_HTPASSWD_PATH=/certs/htpasswd \\\n  -e REGISTRY_STORAGE_DELETE_ENABLED=true \\\n  registry:2\nThe htpasswd file must use bcrypt (htpasswd -Bbn user pass). registry-data keeps the blobs across container recreation."
            ),
            part(
              "Trust, login, push",
              "Installs the company CA on each client under /etc/docker/certs.d/registry.dunbar.internal:5000/ca.crt (directory named host:port), then docker login registry.dunbar.internal:5000, docker push, and docker pull from another host to prove it; mentions the registry has no docker search -- list with the HTTP API /v2/_catalog.",
              "sudo mkdir -p /etc/docker/certs.d/registry.dunbar.internal:5000 && sudo cp /srv/registry/ca.crt /etc/docker/certs.d/registry.dunbar.internal:5000/ca.crt\ndocker login registry.dunbar.internal:5000      # credentials stored in ~/.docker/config.json\ndocker push registry.dunbar.internal:5000/renders:1.0\ncurl -u user:pass https://registry.dunbar.internal:5000/v2/_catalog   # {\"repositories\":[\"renders\"]}\ndocker search only works against Docker Hub; a private registry:2 is listed through its API."
            ),
          ],
        },
        {
          text: "Four months later the build server's disk is 92% full. The registry volume holds 310 GB and CI pushes a new renders tag every commit.\n\nbuild-1$ curl -s -u ci:*** https://registry.dunbar.internal:5000/v2/renders/tags/list | jq '.tags | length'\n1894\n\nbuild-1$ curl -s -u ci:*** -I -H 'Accept: application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.v2+json' https://registry.dunbar.internal:5000/v2/renders/manifests/build-1203 | grep -i docker-content-digest\nDocker-Content-Digest: sha256:4e6b...91af",
          ask: "Explain how deletion works in registry:2 and write the procedure to remove old tags and reclaim the disk, plus what you would change so it does not recur.",
          parts: [
            part(
              "How deletion works",
              "Deleting is a two-step process: a DELETE on the manifest by digest (not tag) marks it unreferenced, and only the registry's garbage collector (registry garbage-collect against the config) frees blobs; requires REGISTRY_STORAGE_DELETE_ENABLED=true, and GC should run with the registry read-only or stopped.",
              "registry:2 never frees space on its own. Step 1: DELETE /v2/<name>/manifests/<digest> -- the API deletes by digest, which is why the Docker-Content-Digest header was fetched; deleting a tag is not a supported operation, so you delete the manifest the tag points at. This only unlinks it. Step 2: run the garbage collector inside the container to remove blobs no manifest references. Deletion must have been enabled (REGISTRY_STORAGE_DELETE_ENABLED=true) and GC must run while nothing is pushing (read-only mode or stopped), or a concurrent push can be corrupted."
            ),
            part(
              "Procedure",
              "A loop over old tags: fetch each digest with the manifest Accept headers, DELETE /v2/renders/manifests/<digest> for tags older than a retention rule, then docker exec registry registry garbage-collect /etc/docker/registry/config.yml (optionally --delete-untagged), then check the volume size.",
              "for tag in $(curl -s -u ci:*** https://registry.dunbar.internal:5000/v2/renders/tags/list | jq -r '.tags[]' | grep -E '^build-' | sort -t- -k2 -n | head -n -50); do\n  digest=$(curl -s -u ci:*** -I -H 'Accept: application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json' https://registry.dunbar.internal:5000/v2/renders/manifests/$tag | awk -F': ' '/Docker-Content-Digest/{print $2}' | tr -d '\\r')\n  curl -s -u ci:*** -X DELETE https://registry.dunbar.internal:5000/v2/renders/manifests/$digest\ndone\ndocker exec registry registry garbage-collect --delete-untagged /etc/docker/registry/config.yml\ndocker system df -v | grep registry-data   # or du on the volume\nKeeping the last 50 build tags while deleting everything older is a simple retention rule; GC then reclaims the layers only those old manifests referenced."
            ),
            part(
              "Preventing recurrence",
              "Push fewer, more meaningful tags (per release plus a moving branch tag, with digests recorded by CI), run a scheduled cleanup job with the retention rule, monitor the volume, and consider a registry product with built-in retention and GC policies (Mirantis Secure Registry, Harbor) if the team grows.",
              "CI tagging a new image per commit forever is the real cause. Tag per release (renders:2.3.1) and keep one moving tag per branch; CI records the digest it deployed. Schedule the deletion loop and GC weekly in a maintenance window, alert on the volume at 70%, and if more teams join, move to a registry with retention policies and scheduled GC built in -- Mirantis Secure Registry (formerly DTR) or Harbor -- rather than scripting around registry:2."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 15%
    {
      slug: "daemon-json-production",
      objective: "Select a storage driver (overlay2 as the current default) and configure logging drivers such as json-file, journald and splunk in daemon.json",
      kind: "build",
      title: "Write a production daemon.json and make the engine start on boot",
      brief:
        "The fictional courier company Ashdown Express is building a standard Docker host image on Ubuntu for its depots. Requirements: container logs must not fill the disk (cap each container at 3 files of 20 MB), the storage driver must be the current default and explicitly recorded, the daemon must listen on the local socket and on TCP 2376 for the central management tool with TLS client verification using the company CA, the engine must start on boot, and the default bridge must use the 10.200.0.0/16 range to avoid a clash with the office network.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write /etc/docker/daemon.json and the systemd steps, explain each key, and show how you verify the configuration took effect.",
          parts: [
            part(
              "Logging",
              "\"log-driver\": \"json-file\" with \"log-opts\": {\"max-size\": \"20m\", \"max-file\": \"3\"}; explains json-file keeps docker logs working, rotation happens per container, and journald or splunk would be alternatives when logs should leave the host (with docker logs still working for journald and local drivers, not for splunk without dual logging).",
              "{\n  \"log-driver\": \"json-file\",\n  \"log-opts\": { \"max-size\": \"20m\", \"max-file\": \"3\" },\n  ...\n}\nWithout log-opts, json-file logs grow without bound and a chatty container fills the disk. 20m x 3 caps each container at 60 MB. json-file and local keep docker logs working; journald hands lines to the host journal (docker logs still works); splunk/gelf/fluentd ship lines off-host and docker logs returns nothing for them unless dual logging is enabled (the engine's default cache keeps docker logs working for remote drivers)."
            ),
            part(
              "Storage driver and bridge",
              "\"storage-driver\": \"overlay2\" (the default on modern kernels; recording it prevents surprises) and \"bip\": \"10.200.0.1/16\" (optionally \"default-address-pools\" for user-defined networks); explains overlay2 needs a backing filesystem with d_type and that changing the storage driver later makes existing images invisible.",
              "  \"storage-driver\": \"overlay2\",\n  \"bip\": \"10.200.0.1/16\",\n  \"default-address-pools\": [{ \"base\": \"10.201.0.0/16\", \"size\": 24 }],\noverlay2 is the supported default; writing it down means a kernel or package change cannot silently pick something else. Its backing filesystem (ext4 or xfs with ftype=1) must support d_type or the daemon refuses to start. Changing storage drivers later orphans every existing image and container, so set it on day one. bip sets docker0's address; default-address-pools governs networks created with docker network create."
            ),
            part(
              "TLS remote access",
              "\"hosts\": [\"unix:///var/run/docker.sock\", \"tcp://0.0.0.0:2376\"], \"tlsverify\": true, \"tlscacert\", \"tlscert\", \"tlskey\" pointing at the server certificate issued by the company CA; explains tlsverify requires a client certificate signed by that CA so the socket is not an unauthenticated root shell on the host; notes the systemd unit's -H flag conflicts with hosts in daemon.json and must be removed with a drop-in.",
              "  \"hosts\": [\"unix:///var/run/docker.sock\", \"tcp://0.0.0.0:2376\"],\n  \"tlsverify\": true,\n  \"tlscacert\": \"/etc/docker/tls/ca.pem\",\n  \"tlscert\": \"/etc/docker/tls/server-cert.pem\",\n  \"tlskey\": \"/etc/docker/tls/server-key.pem\"\nAnyone who can reach the Docker API is root on the host, so tcp without tlsverify is never acceptable. tlsverify makes the daemon demand a client certificate signed by ca.pem. Ubuntu's docker.service starts dockerd with -H fd://, which conflicts with hosts in daemon.json: add a drop-in /etc/systemd/system/docker.service.d/override.conf with\n[Service]\nExecStart=\nExecStart=/usr/bin/dockerd\nthen systemctl daemon-reload."
            ),
            part(
              "Start on boot and apply",
              "sudo systemctl enable --now docker (and containerd), then systemctl restart docker after writing daemon.json; validates JSON first (python3 -m json.tool or dockerd --validate) since a syntax error stops the daemon from starting.",
              "sudo python3 -m json.tool /etc/docker/daemon.json >/dev/null   # or: sudo dockerd --validate --config-file /etc/docker/daemon.json\nsudo systemctl daemon-reload\nsudo systemctl enable --now docker\nsudo systemctl restart docker\nsystemctl is-enabled docker   # enabled\nA malformed daemon.json makes dockerd exit immediately; journalctl -u docker shows the parse error. enable creates the boot-time symlink; --now starts it today."
            ),
            part(
              "Verification",
              "docker info shows Storage Driver overlay2, Logging Driver json-file and the Docker Root Dir; docker network inspect bridge shows 10.200.0.0/16; from a client with the company-issued cert docker --tlsverify -H tcp://host:2376 info works and without a cert the connection is refused; a test container's log file is rotated.",
              "docker info | grep -E 'Storage Driver|Logging Driver'       # overlay2 / json-file\ndocker network inspect bridge --format '{{(index .IPAM.Config 0).Subnet}}'   # 10.200.0.0/16\ndocker --tlsverify --tlscacert=ca.pem --tlscert=client-cert.pem --tlskey=client-key.pem -H tcp://depot-7:2376 info   # works\ndocker -H tcp://depot-7:2376 info                              # refused: bad certificate\ndocker run -d --name chatty busybox sh -c 'yes | head -c 100000000' ; ls -la /var/lib/docker/containers/$(docker inspect -f '{{.Id}}' chatty)/*.log*   # three rotated files"
            ),
          ],
        },
      ],
    },
    {
      slug: "install-errors-and-swarm-backup",
      objective: "Interpret errors to troubleshoot installation issues without assistance",
      kind: "case",
      title: "Read three installation errors and set up swarm backups",
      brief:
        "A new operations hire at the fictional Pennant Hotels is setting up Docker on two fresh servers to become a swarm. They send you three errors in a row and then ask how swarm state should be backed up.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Error 1 (as user ops on host-a):\n$ docker ps\npermission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Get \"http://%2Fvar%2Frun%2Fdocker.sock/v1.47/containers/json\": dial unix /var/run/docker.sock: connect: permission denied\n\nError 2 (host-b, after copying host-a's daemon.json that sets \"storage-driver\": \"overlay2\"):\n$ sudo systemctl status docker | tail -2\n   dockerd[2210]: failed to start daemon: error initializing graphdriver: overlay2: the backing xfs filesystem is formatted without d_type support, which leads to incorrect behavior. Reformat the filesystem with ftype=1 to enable d_type support. Backing filesystems without d_type support are not supported.\n\nError 3 (host-a, joining host-b to the swarm):\nhost-b$ docker swarm join --token SWMTKN-1-... 10.10.5.21:2377\nError response from daemon: rpc error: code = Unavailable desc = connection error: desc = \"transport: Error while dialing: dial tcp 10.10.5.21:2377: connect: no route to host\"",
          ask: "For each error, say what it means, the fix, and what you would not do.",
          parts: [
            part(
              "Error 1: socket permission",
              "The user is not in the docker group (the socket is root:docker 660); fix with sudo usermod -aG docker ops and a new login; notes that docker group membership is equivalent to root and should be limited, and that running every command with sudo or chmod 666 on the socket are the wrong fixes.",
              "/var/run/docker.sock is owned by root:docker with mode 660, and ops is not in the docker group. sudo usermod -aG docker ops, then log out and in (or newgrp docker). Say plainly that docker group membership is root-equivalent (anyone in it can mount / into a container), so grant it only to people who should have root. Do not chmod 666 the socket -- that is root for everyone on the host."
            ),
            part(
              "Error 2: overlay2 on xfs without d_type",
              "The filesystem under /var/lib/docker is xfs created with ftype=0, which overlay2 cannot use; fix by reformatting that filesystem with mkfs.xfs -n ftype=1 (or moving data-root to a suitable ext4/xfs volume), checked with xfs_info; not by switching to an unsupported storage driver.",
              "overlay2 needs the backing filesystem to report directory entry types (d_type). This xfs was made with ftype=0, common on older images. Check: xfs_info /var/lib/docker | grep ftype. Fix: give Docker a volume formatted with mkfs.xfs -n ftype=1 (or ext4) and point data-root at it in daemon.json, then start the daemon. Do not 'fix' it by choosing a legacy storage driver -- devicemapper and the rest are removed or deprecated in current engines."
            ),
            part(
              "Error 3: no route to host on 2377",
              "The manager's swarm port is unreachable: a host firewall or security group is blocking TCP 2377 (and the join will also need TCP/UDP 7946 and UDP 4789 for the overlay); fix by opening those ports between swarm nodes and confirming with nc -zv; checks the advertise address is the right interface.",
              "Swarm needs TCP 2377 (management, manager side), TCP and UDP 7946 (node gossip, all nodes) and UDP 4789 (VXLAN overlay, all nodes). 'no route to host' is a firewall reject or a wrong address: on host-a open the ports (ufw allow 2377/tcp, 7946, 4789/udp or the cloud security group), confirm host-a advertised 10.10.5.21 (docker swarm init --advertise-addr), and test from host-b with nc -zv 10.10.5.21 2377 before joining. Do not disable the firewall wholesale."
            ),
          ],
        },
        {
          text: "The two-node swarm is up (host-a manager, host-b worker). The hire asks: 'How do we back this up? If host-a dies we lose the swarm, right?'",
          ask: "Explain where swarm state lives and how to back it up and restore it, and what you would change about the topology.",
          parts: [
            part(
              "Where state lives and how to back it up",
              "Swarm state (Raft log with services, networks, secrets, configs, node list) lives on managers under /var/lib/docker/swarm; back it up by stopping Docker on a manager (or at least ensuring a consistent snapshot), copying /var/lib/docker/swarm, and keeping the unlock key if autolock is on; schedule it and store it off-host, encrypted, since it contains secrets.",
              "Everything swarm knows is in the Raft store at /var/lib/docker/swarm on each manager: service definitions, networks, secrets and configs (encrypted at rest only with autolock), node membership and certificates. Back up from a manager: sudo systemctl stop docker (on a non-leader manager in a multi-manager swarm so the cluster stays available), tar -czf swarm-$(date +%F).tgz -C /var/lib/docker swarm, systemctl start docker, copy the archive off-host to encrypted storage. If autolock is enabled, store the unlock key separately -- the backup is useless without it. Run it nightly."
            ),
            part(
              "Restore",
              "On a fresh node with the same Docker version: stop Docker, restore the swarm directory, start Docker, run docker swarm init --force-new-cluster to make it the single manager with the restored state, then rejoin the other nodes; notes volumes and container data are not in the swarm backup.",
              "On a new host-a: install the same Docker version, systemctl stop docker, extract the archive into /var/lib/docker/swarm, systemctl start docker, then docker swarm init --force-new-cluster --advertise-addr <ip> to recreate a single-manager cluster from the restored Raft data; re-add workers with new join tokens. Services are recreated from the restored definitions. The backup holds no volume data -- application data on local volumes needs its own backup."
            ),
            part(
              "Topology",
              "With one manager, losing it means a restore from backup; recommends three managers (odd number, tolerate one loss) spread across hosts, keeping managers for management (docker node update --availability drain) once the swarm grows, and still backing up.",
              "Yes -- a single manager is a single point of failure and a restore is a last resort. Run three managers so the Raft quorum (2 of 3) survives one host loss; five tolerate two. Keep an odd number, and once there are enough workers, drain the managers (docker node update --availability drain) so management stays responsive. Backups remain necessary for disasters and mistakes, but with quorum they are not the first line."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 15%
    {
      slug: "publish-modes-overlay-dns",
      objective: "Publish a port so an application is reachable externally, identify which IP and port a container is reachable on, and compare host and ingress publishing modes",
      kind: "build",
      title: "Publish a stack's services the right way for each need",
      brief:
        "The fictional radio network Greystoke FM runs a three-node swarm. Three services need publishing: the public website (any node should answer on 80 and traffic should spread across replicas), a metrics exporter that must be scraped on each node at its own node's IP on 9100 (one copy per node), and an internal admin API that only the backoffice container on the same overlay network should reach. The site must resolve names through the company DNS at 10.10.0.53 instead of the host's resolver.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the publishing, network and DNS configuration for each service (Compose stack syntax or docker service create) and explain how traffic reaches each.",
          parts: [
            part(
              "Website: ingress mode",
              "ports with mode ingress (the default) target 80 published 80; explains the routing mesh: every node listens on 80 and forwards to a healthy task via the ingress overlay network and IPVS, so a client can hit any node and the load spreads.",
              "  web:\n    image: registry.greystoke.example/site:5.2\n    deploy: { replicas: 4 }\n    ports:\n      - target: 80\n        published: 80\n        protocol: tcp\n        mode: ingress\nIngress mode uses the routing mesh: all three nodes listen on 80 even if a node has no web task, and the kernel's IPVS load balancer sends each connection over the ingress overlay to one of the four tasks. Equivalent: docker service create --publish published=80,target=80 (ingress is the default)."
            ),
            part(
              "Exporter: host mode, global",
              "deploy.mode global with ports mode host target 9100 published 9100; explains host mode binds the task's port directly on its own node's IP with no routing mesh, so the scraper sees per-node metrics, and host mode requires at most one task per node (global guarantees that).",
              "  node-exporter:\n    image: prom/node-exporter:v1.8.2\n    deploy: { mode: global }\n    ports:\n      - target: 9100\n        published: 9100\n        mode: host\nHost mode skips the routing mesh: the task's port is bound on the node it runs on, like docker run -p. Scraping node-1:9100 gets node-1's metrics, which is the point. Because two tasks cannot bind the same host port, host mode pairs with mode global (one task per node)."
            ),
            part(
              "Admin API: no published port",
              "No ports entry at all; the admin API and backoffice share an overlay network (attachable if the backoffice is a standalone container) and the backoffice reaches it as http://admin-api:8081 through swarm's internal DNS and VIP; explains unpublished services are unreachable from outside the overlay.",
              "  admin-api:\n    image: registry.greystoke.example/admin:5.2\n    networks: [internal]\n  backoffice:\n    image: registry.greystoke.example/backoffice:5.2\n    networks: [internal]\nnetworks:\n  internal:\n    driver: overlay\n    attachable: true\nWith no ports, nothing on any node's host IP leads to admin-api. The backoffice resolves admin-api through the embedded DNS on the overlay to the service's virtual IP and connects on 8081 directly. attachable: true lets a standalone docker run --network internal container join too."
            ),
            part(
              "Finding where something is reachable",
              "docker service inspect --format '{{json .Endpoint.Ports}}' for published ports and mode, docker service ps for node placement (host mode), and docker port / docker inspect NetworkSettings for a plain container; explains for ingress mode the answer is 'any node IP', for host mode 'the node running the task'.",
              "docker service inspect web --format '{{json .Endpoint.Ports}}'   # PublishMode ingress, PublishedPort 80 -> any node's IP:80\ndocker service ps node-exporter --format '{{.Node}} {{.CurrentState}}'   # host mode: reach each listed node at :9100\ndocker port <container>  /  docker inspect -f '{{json .NetworkSettings.Ports}}' <container>   # for a plain container\nIngress: every node IP. Host: only nodes with a task. Unpublished: only from the overlay network."
            ),
            part(
              "External DNS",
              "dns: [10.10.0.53] on the web service (Compose dns key or docker service create --dns 10.10.0.53), or daemon-wide \"dns\": [\"10.10.0.53\"] in daemon.json; explains containers on user-defined and overlay networks use the embedded DNS at 127.0.0.11 which forwards external names to the configured upstream.",
              "  web:\n    dns: [10.10.0.53]\n    dns_search: [greystoke.internal]\n(or --dns 10.10.0.53 on docker service create; or \"dns\": [\"10.10.0.53\"] in /etc/docker/daemon.json for every container on the host). On overlay and user-defined networks the container's /etc/resolv.conf points at the embedded DNS server 127.0.0.11, which answers service names itself and forwards everything else to these upstreams instead of the host's resolv.conf."
            ),
          ],
        },
      ],
    },
    {
      slug: "containers-cannot-talk",
      objective: "Troubleshoot container and engine logs to resolve connectivity issues between containers",
      kind: "case",
      title: "Work out why the app cannot reach its database",
      brief:
        "On a single Docker host at the fictional veterinary chain Foxglove Vets, a developer started a PostgreSQL container and an application container and reports the app logs 'could not translate host name \"db\"'. Then, after a change, a different error appears.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ docker ps --format 'table {{.Names}}\\t{{.Image}}\\t{{.Ports}}\\t{{.Networks}}'\nNAMES   IMAGE                              PORTS                    NETWORKS\ndb      postgres:16                        5432/tcp                 bridge\napp     registry.foxglove.example/app:3.1  0.0.0.0:8080->8080/tcp   bridge\n\n$ docker logs app --tail 2\nconnecting to postgres://app@db:5432/clinic\nFATAL: could not translate host name \"db\" to address: Name or service not known\n\n$ docker inspect db -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'\n172.17.0.2",
          ask: "Explain why name resolution fails although both containers are on the same network, and fix it properly.",
          parts: [
            part(
              "Cause",
              "Both containers are on the default bridge network, which has no embedded DNS: containers there can reach each other by IP but not by name (the legacy --link mechanism was the old workaround); user-defined networks provide automatic DNS by container name.",
              "The default bridge (docker0) does not run Docker's embedded DNS for container names, so 'db' does not resolve even though 172.17.0.2 is reachable. Historically people used --link to inject /etc/hosts entries; that is legacy. Name resolution between containers is a feature of user-defined networks."
            ),
            part(
              "Fix",
              "Create a user-defined bridge (docker network create clinic-net) and connect both containers to it (docker network connect, or recreate them with --network clinic-net), then the app resolves db through 127.0.0.11; recommends Compose to make this permanent.",
              "docker network create clinic-net\ndocker network connect clinic-net db\ndocker network connect clinic-net app     # or restart app with --network clinic-net\ndocker exec app getent hosts db           # 172.18.0.2  db\nOn clinic-net the embedded DNS at 127.0.0.11 answers 'db' with the container's IP, and the containers are also isolated from everything still on the default bridge. A compose.yaml with both services puts them on a project network automatically, which is the durable fix."
            ),
          ],
        },
        {
          text: "The developer recreates both containers on clinic-net. Now:\n\n$ docker logs app --tail 1\nconnection to server at \"db\" (172.18.0.2), port 5432 failed: Connection refused\n\n$ docker logs db --tail 3\nPostgreSQL Database directory appears to contain a database; Skipping initialization\n2026-11-08 09:14:02.113 UTC [1] LOG:  listening on IPv4 address \"127.0.0.1\", port 5432\n2026-11-08 09:14:02.120 UTC [1] LOG:  database system is ready to accept connections\n\n$ docker inspect db -f '{{json .Config.Cmd}}'\n[\"postgres\",\"-c\",\"listen_addresses=localhost\"]\n\n$ docker exec app sh -c 'nc -zv db 5432'\nnc: db (172.18.0.2:5432): Connection refused",
          ask: "Explain the new failure and fix it, then describe the general method you used across both steps.",
          parts: [
            part(
              "Cause and fix",
              "DNS now works (the IP resolved) but PostgreSQL was started with listen_addresses=localhost, so it listens on 127.0.0.1 inside its own network namespace and refuses connections from other containers; remove that argument (or set listen_addresses='*') and recreate the db container; checks the db log shows listening on 0.0.0.0.",
              "The app resolved db to 172.18.0.2 and the TCP connection was refused -- so the network path is fine and nothing is listening on that address. The db log says PostgreSQL is listening on 127.0.0.1 only, because someone passed -c listen_addresses=localhost. Inside a container, localhost is the container's own loopback; other containers arrive on its eth0 address. Recreate db without that flag (the image default is listen_addresses='*'):\ndocker rm -f db && docker run -d --name db --network clinic-net -v pgdata:/var/lib/postgresql/data postgres:16\ndocker logs db | grep listening   # listening on IPv4 address \"0.0.0.0\"\nnc -zv db 5432 from app now succeeds."
            ),
            part(
              "Method",
              "Works outward from the error: read the application's log for the failure type (name resolution vs refused vs timeout), check network membership and IPs with docker ps/inspect, test resolution and the TCP port from inside the client container (getent/nslookup, nc), read the server container's log for what it bound to, and inspect its Cmd/Config; each symptom maps to a layer.",
              "Classify the error first: 'could not translate host name' = DNS layer (which network, is embedded DNS present); 'connection refused' = reachable host, nothing listening on that port (check the server's bind address and the port mapping); 'timed out' = packets dropped (firewall, wrong network, wrong IP). Then test from the client's point of view with docker exec (getent hosts, nc -zv, curl), confirm the server's view with its own logs and docker inspect (Cmd, exposed ports, networks), and only then change configuration. docker network inspect <net> shows who is on a network; journalctl -u docker shows engine-level networking errors."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 15%
    {
      slug: "content-trust-and-swarm-security",
      objective: "Describe the process of signing an image, and enable Docker Content Trust to sign and verify images",
      kind: "build",
      title: "Sign images with Docker Content Trust and lock the swarm",
      brief:
        "The fictional pharmacy software vendor Larkin Health wants only signed images from its registry registry.larkin.example to run on its swarm, wants the swarm's Raft store and TLS keys protected if a manager's disk is stolen, and wants node certificates to rotate more often than the default. A release engineer will sign images from a CI runner.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the commands for signing and enforcing Docker Content Trust and for hardening the swarm, and explain what each protects.",
          parts: [
            part(
              "Keys and signers",
              "docker trust key generate <name> to create a signer key, docker trust signer add --key <name>.pub <name> registry.larkin.example/<repo> to add the signer to the repository (initialising the repository's root and targets keys, protected by passphrases), and keeping the root key offline; explains root, targets, snapshot and timestamp roles briefly.",
              "docker trust key generate larkin-release                     # creates larkin-release.pub and a private key in ~/.docker/trust/private\ndocker trust signer add --key larkin-release.pub larkin-release registry.larkin.example/dispense\nThe first signer add initialises the repository's trust metadata: a root key (keep it offline -- it can re-key everything), a targets key (per repository), and snapshot/timestamp keys managed by the Notary server. Passphrases protect the local keys; DOCKER_CONTENT_TRUST_REPOSITORY_PASSPHRASE and DOCKER_CONTENT_TRUST_ROOT_PASSPHRASE let CI sign without prompts."
            ),
            part(
              "Signing and verifying",
              "docker trust sign registry.larkin.example/dispense:4.2.0 (which pushes and signs) or DOCKER_CONTENT_TRUST=1 docker push; docker trust inspect --pretty shows signers and the signed digest; explains the signature binds a tag to a digest so a repointed tag fails verification.",
              "docker trust sign registry.larkin.example/dispense:4.2.0      # pushes the image and signs the tag -> digest mapping\ndocker trust inspect --pretty registry.larkin.example/dispense:4.2.0\n# Signatures for registry.larkin.example/dispense:4.2.0  SIGNED TAG 4.2.0  DIGEST sha256:...  SIGNERS larkin-release\nContent trust signs the mapping from tag to content digest. If anyone later pushes a different image as 4.2.0, the signed metadata no longer matches and a client with trust enabled refuses to pull it."
            ),
            part(
              "Enforcing on clients and the swarm",
              "export DOCKER_CONTENT_TRUST=1 on every host that pulls/runs (or in the engine's environment for the daemon's own pulls), so docker pull/run/create of an unsigned tag fails; notes swarm deploys resolve the digest at docker stack deploy / service create time on the manager with trust enabled (--with-registry-auth), and that MKE can enforce signing cluster-wide ('only run signed images') for true policy enforcement.",
              "On the deploying host: export DOCKER_CONTENT_TRUST=1; docker pull registry.larkin.example/dispense:4.2.1 fails with 'No valid trust data' if unsigned. Swarm resolves the tag to a digest when the service is created or updated, so a trust-enabled manager pins the signed digest for the tasks (docker stack deploy --with-registry-auth). The engine alone cannot make the whole cluster refuse unsigned images; Mirantis Kubernetes Engine (UCP) has an 'only run signed images' setting that enforces it for every deploy -- that is the DCA answer for cluster-wide enforcement."
            ),
            part(
              "Swarm autolock",
              "docker swarm update --autolock=true, saving the printed unlock key in a password manager; explains that without autolock the Raft log and TLS keys are stored in clear on the manager's disk, and with it a restarted manager stays locked until docker swarm unlock is run with the key; docker swarm unlock-key to view or --rotate to rotate.",
              "docker swarm update --autolock=true\n# Swarm updated. To unlock a swarm manager after it restarts, run the `docker swarm unlock` command and provide the following key: SWMKEY-1-...\nStore the key in the password manager. Without autolock the Raft store (including secrets) and the manager's TLS key are on disk in clear; with it they are encrypted and a rebooted manager will not rejoin until docker swarm unlock is run. docker swarm unlock-key shows it, --rotate rotates it; lose it with all managers down and the swarm is gone."
            ),
            part(
              "Certificate expiry and CA rotation",
              "docker swarm update --cert-expiry 24h (default 90 days) so node certificates rotate daily, and docker swarm ca --rotate to rotate the swarm's root CA (and optionally supply an external CA); explains swarm's mutual TLS gives every node an identity and role, and rotation limits the value of a stolen node certificate.",
              "docker swarm update --cert-expiry 24h    # node certs renewed well before each day ends (default 2160h = 90 days)\ndocker swarm ca --rotate                 # new root CA; nodes get new certs; use --ca-cert/--ca-key for an external CA\nEvery node already holds a certificate issued by the swarm CA that encodes its ID and role (manager/worker), and all swarm traffic is mutual TLS. Short expiry means a certificate stolen from a decommissioned node is useless within a day; CA rotation is the response if the CA key is suspected leaked."
            ),
          ],
        },
      ],
    },
    {
      slug: "mke-rbac-grants",
      objective: "Configure role-based access control in UCP (MKE): subjects, roles, resource sets and grants",
      kind: "case",
      title: "Give a new team exactly the access it needs in UCP (MKE)",
      brief:
        "The fictional insurer Bramwell Assurance runs Docker Enterprise -- UCP, now Mirantis Kubernetes Engine (MKE) -- with LDAP integration. A new claims-platform team needs to deploy and manage its own services and nothing else, and its lead needs to use the CLI from their laptop.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Request from the team lead:\n  - Team: claims-platform (an Active Directory group CN=claims-platform,OU=Groups,DC=bramwell,DC=local)\n  - Needs: create, update and remove their own swarm services, networks, volumes, configs and secrets; view logs; nothing in other teams' collections; no node or cluster settings.\n  - The lead wants to run docker service ls from a laptop against the cluster.\n\nCurrent UCP (MKE) state: LDAP integration enabled and syncing; collections /Shared/Private and /Shared/claims do not exist yet; built-in roles None, View Only, Restricted Control, Scheduler, Full Control.",
          ask: "Design the access in UCP (MKE) terms -- subject, role, resource set, grant -- and explain each choice, including why you would not simply hand out Full Control on /.",
          parts: [
            part(
              "Subject",
              "An organisation/team in UCP (MKE) named claims-platform whose membership is synced from the LDAP group DN (team LDAP sync with the group's distinguished name), so joiners and leavers are handled by Active Directory, not by hand.",
              "Create the organisation bramwell with team claims-platform, and enable LDAP sync on the team with the group DN CN=claims-platform,OU=Groups,DC=bramwell,DC=local (member attribute member). UCP/MKE's LDAP integration already syncs users; the team sync makes group membership in AD the source of truth, so nobody edits the team by hand and a leaver loses access when IT removes them from the group."
            ),
            part(
              "Resource set and role",
              "A collection /Shared/claims (a resource set) as the team's boundary, and the built-in role Restricted Control (create/manage services, networks, volumes, configs and secrets in the collection, but no privileged containers, host mounts or node-level access) -- or a custom role if a specific operation is missing; explains Full Control would allow privileged workloads and Scheduler/View Only are too narrow.",
              "Resource set: the collection /Shared/claims (created under /Shared so it is visible to the team only; /Shared/Private holds users' personal collections). Role: Restricted Control -- it allows deploying and managing services, networks, volumes, configs and secrets and viewing logs, but blocks privileged containers, host bind mounts, host networking and other node-escaping options. Full Control would let the team run privileged containers on shared nodes; Scheduler only lets them schedule onto nodes; View Only cannot deploy. If a single operation is missing, clone Restricted Control into a custom role rather than jumping to Full Control."
            ),
            part(
              "Grant and default collection",
              "A grant = subject claims-platform + role Restricted Control + resource set /Shared/claims; plus setting the team members' default collection to /Shared/claims so resources they create land there (otherwise they land in the user's private collection), and labelling stack files with com.docker.ucp.access.label if needed.",
              "Grant: subject = team claims-platform, role = Restricted Control, resource set = /Shared/claims. Then set each team member's default collection (or the team's) to /Shared/claims so docker service create puts the service in that collection; stack files can also pin it with the label com.docker.ucp.access.label: /Shared/claims. Without a default collection, their services land in /Shared/Private/<user> where teammates cannot manage them. No grant exists on / or on nodes, so cluster settings and other teams' collections are invisible."
            ),
          ],
        },
        {
          text: "The grant is in place. The team lead now tries from a laptop:\n\n$ docker -H tcp://ucp.bramwell.local:443 service ls\nerror during connect: Get \"http://ucp.bramwell.local:443/v1.47/services\": net/http: HTTP/1.x transport connection broken: malformed HTTP response \"\\x15\\x03\\x01\\x00\\x02\\x02\"",
          ask: "Explain how CLI access to UCP (MKE) is meant to work, fix the lead's setup, and say how the security team can see what the team does.",
          parts: [
            part(
              "Client bundle",
              "CLI access uses a client bundle downloaded from the UCP (MKE) web UI (profile -> Client Bundles -> New), a zip with a client certificate, key, the CA and an env.sh/env.cmd; sourcing env.sh sets DOCKER_HOST, DOCKER_TLS_VERIFY and DOCKER_CERT_PATH so every docker command authenticates as that user over mutual TLS and is authorized by their grants.",
              "The error is a TLS server answering an HTTP client: UCP/MKE speaks TLS and expects a client certificate. The supported way is a client bundle: in the MKE UI, My Profile -> Client Bundles -> New Client Bundle; unzip it and eval \"$(<env.sh)\". That exports DOCKER_HOST=tcp://ucp.bramwell.local:443, DOCKER_TLS_VERIFY=1 and DOCKER_CERT_PATH to the bundle's cert.pem/key.pem/ca.pem. Now docker service ls shows only services in /Shared/claims, because the certificate identifies the lead and the grants decide what is visible. The bundle also includes a kubeconfig for the Kubernetes side of MKE."
            ),
            part(
              "Visibility and hygiene",
              "UCP (MKE) records an audit log of API requests per user (enable auditing at the desired level), the security team reads who created/updated what in /Shared/claims; client bundles can be revoked from the user's profile and should be treated as credentials; LDAP removal disables the account.",
              "Enable MKE audit logging (Admin Settings -> Audit Logs, metadata or request level) so every API call carries the user from their client bundle certificate -- the security team can see who deployed what into /Shared/claims and when. Client bundles are credentials: keep them out of shared drives, and revoke a bundle from the user's profile if a laptop is lost. Because the team is LDAP-synced, removing the lead from the AD group ends their access everywhere at the next sync."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 10%
    {
      slug: "volumes-binds-tmpfs",
      objective: "Use volumes, bind mounts and tmpfs mounts for persistent and ephemeral container storage, and share storage across cluster nodes with volume plugins",
      kind: "build",
      title: "Choose the right mount for each kind of data",
      brief:
        "The fictional media archive Thornfield Library runs a stack on a two-node swarm: a PostgreSQL service whose data must survive restarts and upgrades, an image-processing service that needs a fast scratch area for temporary files that must never hit disk, a web service that developers want to run locally with live-reloading source from their laptops, and an uploads directory that both nodes' web tasks must share. The nodes have access to an NFS server at nfs.thornfield.internal.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the mount type for each need with the --mount or Compose syntax, explain where the data lives and who manages it, and say which choices are wrong for production.",
          parts: [
            part(
              "Database: named volume",
              "A named volume (docker volume create pgdata or a top-level volumes: entry) mounted at /var/lib/postgresql/data with --mount type=volume,src=pgdata,dst=...; explains Docker manages it under /var/lib/docker/volumes/<name>/_data, it survives container removal and image upgrades, and it is the only mount type that volume drivers and docker volume commands manage.",
              "docker service create --name db --mount type=volume,src=pgdata,dst=/var/lib/postgresql/data postgres:16\nor in the stack file: volumes: - pgdata:/var/lib/postgresql/data with a top-level volumes: pgdata:. The data lives on the node at /var/lib/docker/volumes/pgdata/_data, managed by Docker: docker volume ls/inspect/rm, survives docker rm and image upgrades, and can be backed up by mounting it into a throwaway container (docker run --rm -v pgdata:/from -v $PWD:/to busybox tar czf /to/pgdata.tgz -C /from .). Pin the service to one node (placement constraint) since a local volume does not move."
            ),
            part(
              "Scratch: tmpfs",
              "--mount type=tmpfs,dst=/scratch,tmpfs-size=2g (Compose tmpfs: or type: tmpfs with size); explains tmpfs is memory-backed, never written to the node's disk, vanishes with the container, is Linux-only and counts against memory limits.",
              "docker service create --name imgproc --mount type=tmpfs,dst=/scratch,tmpfs-size=2147483648 registry.thornfield.example/imgproc:2.0\nCompose: tmpfs: - /scratch:size=2g (or the long mount syntax with type: tmpfs). The files exist only in RAM inside the container's mount namespace: nothing touches the disk, nothing survives the container, and the size counts toward the container's memory limit, so set tmpfs-size below the service's memory reservation. Linux only."
            ),
            part(
              "Developer live reload: bind mount",
              "--mount type=bind,src=$PWD/src,dst=/app/src (Compose ./src:/app/src) for local development only; explains a bind mount exposes a host path as-is, depends on the host's directory layout and permissions, and is not portable across swarm nodes -- fine on a laptop, wrong in the stack file for production.",
              "docker run --rm -p 8080:8080 --mount type=bind,src=\"$PWD/src\",dst=/app/src registry.thornfield.example/web:dev\nA bind mount maps a host directory into the container, so edits on the laptop appear instantly and the dev server reloads. It is tied to that host's path and permissions; in a swarm each node would need the same path with the same content, and the task could land on any node. Keep binds in a compose.override.yaml for development, never in the production stack file."
            ),
            part(
              "Shared uploads across nodes: volume driver",
              "A named volume using a driver that reaches shared storage -- the built-in local driver with NFS options (type nfs, o addr=nfs.thornfield.internal,rw, device :/exports/uploads) or a third-party volume plugin -- so tasks on either node mount the same data; explains plain local volumes are per node and would give each task a different, empty uploads directory.",
              "volumes:\n  uploads:\n    driver: local\n    driver_opts:\n      type: nfs\n      o: addr=nfs.thornfield.internal,rw,nfsvers=4\n      device: \":/exports/uploads\"\nservices:\n  web:\n    volumes: [uploads:/app/uploads]\nEach node mounts the NFS export when a web task starts there, so both tasks see the same files. A plain local volume named uploads would be created separately on each node -- two different directories, each missing the other's files. Volume plugins (docker plugin install ...) do the same job for cloud block or file storage with features like snapshots."
            ),
            part(
              "What is wrong for production",
              "Bind mounts in the production stack (node-specific paths, permission drift, security exposure of host paths), unpinned single-node volumes for the database, tmpfs for anything that must survive, and anonymous volumes (-v /data with no name) that are hard to find and clean up.",
              "Wrong in production: bind mounts of host paths (not portable across nodes, and a path like / or /var/run/docker.sock hands the container the host); a local pgdata volume on a service with no placement constraint (the task may restart on the other node with empty data); tmpfs for uploads or the database (gone on restart); and anonymous volumes (-v /var/lib/postgresql/data without a name) that docker volume ls shows as hashes and docker system prune may delete."
            ),
          ],
        },
      ],
    },
    {
      slug: "disk-full-layers-cleanup",
      objective: "Identify the steps to clean up unused images, containers and volumes on a host and in DTR (Mirantis Secure Registry)",
      kind: "case",
      title: "Reclaim a Docker host's disk without deleting the wrong thing",
      brief:
        "A CI runner host at the fictional game studio Wrenhaven has paged at 96% disk. It builds images all day and runs integration-test containers. The on-call engineer must free space now without breaking the running jobs or losing the test database volume the QA team keeps.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ df -h /var/lib/docker\nFilesystem      Size  Used Avail Use% Mounted on\n/dev/nvme1n1    400G  384G   16G  96% /var/lib/docker\n\n$ docker system df\nTYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE\nImages          412       9         288.4GB   271.2GB (94%)\nContainers      63        4         41.7GB    40.9GB (98%)\nLocal Volumes   58        3         31.2GB    29.8GB (95%)\nBuild Cache     1203      0         19.5GB    19.5GB\n\n$ docker volume ls --format '{{.Name}}' | grep -E 'qa|test' | head -3\nqa-testdb\nci-test-tmp-4f2a\nci-test-tmp-9c11\n\n$ docker info --format '{{.Driver}} {{.DockerRootDir}}'\noverlay2 /var/lib/docker",
          ask: "Explain what each row of docker system df means and where that data lives on disk, then give the order of cleanup commands you would run now and what each one would and would not touch.",
          parts: [
            part(
              "Reading docker system df",
              "Images: 412 images of which 9 are used by containers; reclaimable is what no container references (dangling and unused). Containers: 63, 4 running; the rest are stopped containers whose writable layers take 40.9 GB. Local volumes: 58, 3 in use by containers; 29.8 GB belongs to volumes no container mounts. Build cache: BuildKit's cache layers. Image and container layers live under /var/lib/docker/overlay2/<id>/diff, volumes under /var/lib/docker/volumes/<name>/_data, build cache under /var/lib/docker/buildkit.",
              "Images: 412 stored, 9 in use by a container; 271 GB belongs to images nothing references right now (old CI builds and dangling <none> layers). Containers: 63 exist, 4 running; the 59 stopped ones hold 40.9 GB in their writable layers. Local Volumes: 58, 3 mounted by a container; 29.8 GB is in volumes no container uses -- including qa-testdb if no container is attached right now, which is why 'unused' is not 'unwanted'. Build Cache: 19.5 GB of BuildKit cache. On overlay2, image and container layers are directories under /var/lib/docker/overlay2/*/diff; volumes under /var/lib/docker/volumes/<name>/_data; build cache under /var/lib/docker/buildkit."
            ),
            part(
              "Safe order of operations",
              "1 docker container prune (stopped containers only; running jobs untouched); 2 docker image prune -a (removes images no container uses, including tagged ones -- acceptable on a CI runner that rebuilds; use --filter until=... to keep recent); 3 docker builder prune (optionally --keep-storage 5GB); 4 only then volumes, selectively: docker volume rm the ci-test-tmp-* volumes by name, never docker volume prune blindly because qa-testdb is unused right now and would be deleted; checks df after each step.",
              "docker container prune -f                       # 59 stopped containers, ~40 GB; running jobs are not touched\ndocker image prune -a -f --filter 'until=24h'   # images not used by any container and older than a day; keeps today's builds cached\ndocker builder prune -f --keep-storage 5GB       # BuildKit cache down to 5 GB\ndocker volume ls -q --filter name=ci-test-tmp- | xargs -r docker volume rm   # named test scratch volumes only\ndf -h /var/lib/docker after each step.\nNot docker volume prune: it deletes every volume with no container attached, and qa-testdb has no container attached between QA runs -- it would be gone. Not docker system prune -a --volumes for the same reason."
            ),
            part(
              "Why images reclaim the most and why layers are shared",
              "Explains that images are layered and shared: deleting a tag frees only layers no other image uses, so the 271 GB estimate is an upper bound; dangling <none> images are leftover intermediate layers from rebuilds and always safe; a running container's image cannot be removed.",
              "Image layers are content-addressed and shared between images, so removing one tag frees only the layers that no remaining image or container references -- docker system df's RECLAIMABLE is the ceiling. Dangling <none>:<none> images are previous builds' layers that lost their tag when a new build took it; they are always safe to prune. An image in use by any container (running or stopped) is skipped by prune -- another reason to prune containers first."
            ),
          ],
        },
        {
          text: "Disk is at 41% after the cleanup. The QA lead asks why qa-testdb was kept when 'it wasn't in use', and the platform team asks how to stop the host filling again and whether the same thing is needed on their Mirantis Secure Registry (DTR).",
          ask: "Explain volume lifecycle to the QA lead, propose the ongoing cleanup for the runner, and explain how space is reclaimed on MSR/DTR.",
          parts: [
            part(
              "Volume lifecycle",
              "Volumes are independent of containers: a named volume outlives the containers that mount it and is 'in use' only while something mounts it; between QA runs qa-testdb is unused but valuable, which is exactly why volume cleanup must be by name or label, never by 'unused'; suggests labelling volumes (keep=true) and using prune filters, and backing up qa-testdb.",
              "A named volume is a first-class object: docker rm of the container does not touch it, and 'active' in docker system df only means a container currently mounts it. qa-testdb sits idle between test runs, so to Docker it is unused -- to QA it is weeks of fixtures. Cleanup therefore selects by name or label, never by unused-ness: docker volume create --label keep=true qa-testdb, and prune with --filter 'label!=keep=true'. Back it up (tar from a throwaway container) so a mistake is recoverable."
            ),
            part(
              "Ongoing cleanup on the runner",
              "A scheduled job (cron or systemd timer) running docker container prune, docker image prune -a --filter until=48h, docker builder prune --keep-storage, and labelled-volume pruning; CI jobs that name their scratch volumes with a prefix and remove them at job end; log rotation in daemon.json; disk alerts at 70%.",
              "Nightly timer: docker container prune -f; docker image prune -a -f --filter 'until=48h'; docker builder prune -f --keep-storage 10GB; docker volume prune -f --filter 'label!=keep=true' (only after every long-lived volume is labelled). CI pipelines create scratch volumes as ci-test-tmp-<job> and remove them in their cleanup step. Make sure daemon.json caps container logs (json-file max-size/max-file), and alert at 70% so nobody pages at 96% again."
            ),
            part(
              "MSR/DTR",
              "In Mirantis Secure Registry (formerly DTR) deleting a tag or repository marks blobs unreferenced; space is reclaimed only by garbage collection, which is scheduled (or run on demand) in the admin settings and can run with the registry read-only or online depending on version; retention policies (tag limits, prune by age) prevent build-up, mirroring the host-side rule of deleting by rule and then collecting.",
              "Same two-step model as any registry: deleting tags in MSR/DTR only unlinks manifests; the blobs stay until garbage collection runs. In MSR's admin settings schedule GC (nightly, in a quiet window; current MSR can run it online, older DTR needed read-only mode) and turn on tag pruning policies per repository (keep the last N tags, or delete tags older than X days) so CI's per-commit pushes are trimmed automatically. The host and the registry follow the same rule: decide what to delete by policy, then collect."
            ),
          ],
        },
      ],
    },
  ],
};
