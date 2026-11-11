import { GENERAL_SAFETY, part, type SeedLabSet, matchPart } from "./types";
import { source } from "../sources";

// REQ-164: Kubernetes and Cloud Native Associate (KCNA).
//
// Aligned to the four KCNA domains (Kubernetes Fundamentals 44%, Container
// Orchestration 28%, Cloud Native Application Delivery 16%, Cloud Native
// Architecture 12%), read on 2026-11-07 from github.com/cncf/curriculum
// (KCNA_Curriculum.pdf) and training.linuxfoundation.org. Density
// (docs/labs.md, hybrid): 3 / 3 / 2 / 2.
//
// KCNA is a multiple-choice, conceptual exam, so these labs ask the
// learner to apply the concepts the exam tests -- read real kubectl output
// and say what it means, pick the right object or tool for a stated need,
// sketch a delivery or observability design -- rather than to operate a
// cluster under time pressure as the CKA/CKAD labs do. Stable concepts and
// GA APIs only; organisations are fictional.

export const KCNA_LABS: SeedLabSet = {
  trackCode: "KCNA",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/KCNA_Curriculum.pdf", "exam_outline", "2026-11-07"),
    source("https://training.linuxfoundation.org/certification/kubernetes-cloud-native-associate/", "exam_outline", "2026-11-07"),
    source("https://kubernetes.io/docs/concepts/overview/components/", "reference", "2026-11-07"),
    source("https://github.com/cncf/toc/blob/main/process/README.md", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------- 44%
    {
      slug: "pick-workload-objects",
      objective:
        "Core concepts: Pods as the unit of scheduling, and the workload objects built on them -- ReplicaSets, Deployments, StatefulSets, DaemonSets, Jobs and CronJobs -- with what each is for",
      kind: "build",
      title: "Choose the Kubernetes objects for a small SaaS product",
      brief:
        "The fictional start-up Lantern Books is moving its product to Kubernetes. It has: (1) a stateless web API that must run several copies and be updated without downtime; (2) a PostgreSQL database that needs a stable network name and its own disk that follows it if it moves; (3) a log-collection agent that must run exactly once on every node; (4) a nightly invoice run at 01:00 that must finish and then stop; (5) a one-off data migration to run once before the first release. A teammate proposes 'just use Deployments for everything'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each of the five workloads name the Kubernetes object you would use, say why the alternative is wrong, and write the manifest skeleton (apiVersion, kind, and the one or two spec fields that make it fit) for the web API.",
          parts: [
            part(
              "Web API",
              "Deployment (apps/v1) with replicas and a RollingUpdate strategy; explains the Deployment manages ReplicaSets so a rolling update replaces Pods gradually and can be rolled back.",
              "A Deployment: apiVersion: apps/v1, kind: Deployment, spec.replicas: 3, spec.selector.matchLabels {app: api}, spec.template with the container, and strategy.type RollingUpdate. The Deployment creates a ReplicaSet per version and shifts Pods between them, so updates are gradual and kubectl rollout undo reverses them. A bare ReplicaSet has no rollout logic; a bare Pod has no self-healing."
            ),
            part(
              "Database",
              "StatefulSet, because it gives each Pod a stable name (postgres-0), a stable DNS entry through a headless Service and a PersistentVolumeClaim per Pod (volumeClaimTemplates) that is re-attached when the Pod is rescheduled; a Deployment's Pods have random names and would share or lose the volume.",
              "A StatefulSet with a headless Service: Pod postgres-0 keeps its name and DNS record postgres-0.postgres.<ns>.svc, and volumeClaimTemplates give it its own PVC that is reattached wherever it is rescheduled. A Deployment would name Pods randomly and, with one PVC, risk two Pods mounting the same disk during an update."
            ),
            part(
              "Node agent",
              "DaemonSet: one Pod per node (or per matching node), automatically added when nodes join; a Deployment cannot guarantee one-per-node placement.",
              "A DaemonSet: the controller places exactly one Pod on every node (optionally filtered by nodeSelector) and adds one when a node joins. A Deployment with replicas equal to the node count might double up on a node and would not follow cluster growth."
            ),
            part(
              "Nightly run and one-off migration",
              "CronJob with schedule 0 1 * * * for the invoices (it creates a Job each night, which runs Pods to completion) and a plain Job for the migration; explains a Deployment would restart a finished container forever because it expects a long-running process.",
              "Invoices: a CronJob (batch/v1) with schedule \"0 1 * * *\" creating a Job each night; the Job runs the container to completion (restartPolicy OnFailure or Never) and retries up to backoffLimit. Migration: a Job run once before release. A Deployment treats exit as failure and restarts the container in a loop -- wrong for anything that is meant to finish."
            ),
            matchPart("Object for each workload", "Web API -> Deployment; database -> StatefulSet; per-node log agent -> DaemonSet; nightly invoice run -> CronJob; one-off migration -> Job. A bare ReplicaSet fits none. All five right is met; at least three is partly there.", "Deployments suit interchangeable, stateless, long-running Pods (the web API). The database needs identity and its own storage (StatefulSet), the agent needs one Pod per node (DaemonSet), the nightly run needs a schedule that creates a Job (CronJob), and the migration runs once to completion (Job). A bare ReplicaSet has no rollout logic, so it is not the answer for any of them.", { leftHeading: "Workload", rightHeading: "Object", left: ["(1) Stateless web API, several copies, zero-downtime updates", "(2) PostgreSQL with a stable name and its own disk", "(3) Log agent, exactly once on every node", "(4) Nightly invoice run at 01:00 that finishes", "(5) One-off data migration before the first release"], right: ["Deployment", "StatefulSet", "DaemonSet", "CronJob", "Job", "ReplicaSet"], pairs: [0, 1, 2, 3, 4] }),
          ],
        },
      ],
    },
    {
      slug: "read-scheduler-pending",
      objective:
        "Scheduling: how kube-scheduler filters and scores nodes using resource requests, node selectors and affinity, taints and tolerations, and topology spread, and what leaves a Pod Pending",
      kind: "case",
      title: "Explain why a Pod is Pending from the scheduler's own words",
      brief:
        "At the fictional clinic network Greyfield Health, a developer reports that 'Kubernetes is broken' because a new Pod has been Pending for ten minutes on a four-node cluster (one control plane, three workers). You are asked to explain, in plain language, what the scheduler decided and why.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl get pod imaging-worker-0 -n imaging\nNAME                READY   STATUS    RESTARTS   AGE\nimaging-worker-0    0/1     Pending   0          10m\n\n$ kubectl describe pod imaging-worker-0 -n imaging | tail -4\nEvents:\n  Type     Reason            Age                 From               Message\n  ----     ------            ----                ----               -------\n  Warning  FailedScheduling  28s (x11 over 10m)  default-scheduler  0/4 nodes are available: 1 node(s) had untolerated taint {node-role.kubernetes.io/control-plane: }, 2 Insufficient memory, 1 node(s) didn't match Pod's node affinity/selector. preemption: 0/4 nodes are available: 2 No preemption victims found for incoming pod, 2 Preemption is not helpful for scheduling.\n\n$ kubectl get pod imaging-worker-0 -n imaging -o jsonpath='{.spec.containers[0].resources.requests}{\"\\n\"}{.spec.nodeSelector}'\n{\"cpu\":\"2\",\"memory\":\"24Gi\"}\n{\"disktype\":\"nvme\"}",
          ask: "Explain the event message node by node, say which scheduling mechanism rules each node out, and tell the developer the two kinds of change that would get the Pod scheduled.",
          parts: [
            part(
              "Decoding the message",
              "Explains that the scheduler filtered all four nodes: the control plane node is excluded by its taint (the Pod has no toleration), two workers lack 24Gi of allocatable memory for the request, and one worker lacks the label disktype=nvme required by the nodeSelector; the preemption note means evicting lower-priority Pods would not free a fitting node.",
              "0/4 available because every node failed a filter: the control plane carries the taint node-role.kubernetes.io/control-plane and the Pod tolerates nothing, so it is out; two workers have less than 24Gi free of allocatable memory against the Pod's request; the remaining worker is not labeled disktype=nvme, so the nodeSelector rules it out. 'Preemption is not helpful' means even evicting other Pods would not make a node fit (the label and taint cannot be fixed by eviction)."
            ),
            part(
              "Requests, not usage",
              "Points out the scheduler compares the Pod's requests to each node's allocatable minus other Pods' requests, not to live memory usage, so a node that looks idle in top can still be 'Insufficient memory'.",
              "'Insufficient memory' is about reservations: allocatable memory minus the sum of requests of Pods already on the node must cover 24Gi. Actual usage is irrelevant to the scheduler; a worker running near-idle Pods that requested most of its memory is full from the scheduler's point of view."
            ),
            part(
              "What would unblock it",
              "Names two change types: change the Pod (lower the memory request, add a toleration, or drop/loosen the nodeSelector to affinity preferred) or change the cluster (label a worker disktype=nvme if it really has NVMe, add a bigger node, or move other Pods); warns against tolerating the control plane taint or deleting the taint just to get scheduled.",
              "Pod-side: reduce requests.memory to what the worker can offer, or remove the disktype selector (or make it a preferred affinity) if NVMe is a preference not a requirement. Cluster-side: label the one memory-fit worker disktype=nvme only if it has NVMe, or add a node with the label and capacity. Tolerating the control plane taint is the wrong fix: it is there to keep workloads off the control plane."
            ),
          ],
        },
        {
          text: "The team lowers the request to 12Gi and labels worker-3 disktype=nvme. The Pod schedules to worker-3. A week later a second copy, imaging-worker-1, is created with the same spec and also lands on worker-3, and both are slow. The developer asks whether Kubernetes should have 'spread them out'.",
          ask: "Explain why the scheduler put both on the same node and what you would add to the Pod spec to spread copies across nodes, and what that implies for the cluster.",
          parts: [
            part(
              "Why they landed together",
              "Explains that only worker-3 passes the nodeSelector filter, so scoring never gets a choice; spreading is a scoring preference the scheduler applies only among nodes that pass filtering, and nothing in the spec asked for spreading anyway.",
              "worker-3 is the only node with disktype=nvme, so after filtering there is exactly one candidate and the scorer has nothing to choose between. The default scheduler does spread Pods of the same ReplicaSet lightly across nodes, but only among feasible nodes. Nothing in the spec required anti-affinity either."
            ),
            part(
              "How to spread",
              "topologySpreadConstraints with topologyKey kubernetes.io/hostname (or a required podAntiAffinity on the app label), and notes that for it to work more than one node must satisfy the selector -- label more NVMe nodes or relax the selector; otherwise DoNotSchedule leaves the second Pod Pending, which may be the honest outcome.",
              "Add topologySpreadConstraints: maxSkew 1, topologyKey kubernetes.io/hostname, whenUnsatisfiable DoNotSchedule, labelSelector app=imaging-worker (or required podAntiAffinity on the same label). That only helps if two or more nodes pass the filters, so the cluster needs a second disktype=nvme node with 12Gi free. With one eligible node, DoNotSchedule keeps the second Pod Pending -- which at least makes the capacity problem visible instead of silently overloading worker-3."
            ),
          ],
        },
      ],
    },
    {
      slug: "image-build-and-pull",
      objective: "Containerization: how a Dockerfile builds an image, and how Kubernetes pulls and runs it with imagePullPolicy and pull secrets",
      kind: "build",
      title: "Trace an application from Dockerfile to running container",
      brief:
        "The fictional newsroom tool vendor Quillstone has a Node.js service. Its Dockerfile is: FROM node:22-alpine / WORKDIR /app / COPY package*.json ./ / RUN npm ci --omit=dev / COPY . . / EXPOSE 3000 / USER node / CMD [\"node\",\"server.js\"]. CI builds it and pushes registry.quillstone.example/newsdesk:1.8.2 and also tags it latest. A Pod spec references image: registry.quillstone.example/newsdesk:latest with no imagePullPolicy set, and the registry requires authentication.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain what the Dockerfile produces and why its instructions are in that order, then say how the kubelet will pull and run the image on a node and what you would change in the Pod spec.",
          parts: [
            part(
              "Layers and ordering",
              "Explains each instruction adds an image layer, layers are cached and reused when unchanged, and copying package files and running npm ci before COPY . . means dependency layers are reused when only source changes; EXPOSE is documentation, not a published port.",
              "FROM pulls the base layers; each following instruction writes a new layer. Because layers are rebuilt only from the first changed instruction onward, copying package*.json and running npm ci first means a source-only change reuses the cached dependency layer and rebuilds just the COPY . . layer. EXPOSE 3000 records the port for humans and tools; it does not open anything -- the Pod's containerPort and a Service do that."
            ),
            part(
              "USER and CMD",
              "Explains USER node makes the process run as a non-root user inside the container (what Pod Security Standards expect) and CMD is the default command that Kubernetes' args can override (command overrides ENTRYPOINT).",
              "USER node switches the runtime user from root to the image's node user, so the process does not run as UID 0 -- required by the restricted Pod Security Standard and good practice everywhere. CMD [\"node\",\"server.js\"] is the default command; in the Pod spec args: replaces CMD and command: replaces ENTRYPOINT."
            ),
            part(
              "How the pull works and the tag problem",
              "Explains that with no imagePullPolicy a :latest tag defaults to Always (any other tag defaults to IfNotPresent), that the kubelet asks the container runtime (containerd via CRI) to pull from the registry, and that a mutable tag means two nodes can run different builds; recommends the immutable version tag or a digest.",
              "The kubelet resolves the image through the CRI runtime (containerd), which pulls layers it does not already have. With :latest and no policy the default is Always, so every start re-checks the registry; with any other tag it is IfNotPresent. latest is mutable: a Pod started before and after the next push runs different code with the same spec. Use image: ...newsdesk:1.8.2 (or @sha256:<digest>) so a rollout is an explicit change."
            ),
            part(
              "Private registry",
              "A Secret of type kubernetes.io/dockerconfigjson referenced through imagePullSecrets on the Pod or the ServiceAccount; without it the pull fails with ImagePullBackOff and an authentication error in describe.",
              "kubectl create secret docker-registry quillstone-pull --docker-server=registry.quillstone.example --docker-username=... --docker-password=... and imagePullSecrets: [{name: quillstone-pull}] in the Pod spec (or on the ServiceAccount so every Pod inherits it). Otherwise the kubelet's pull returns 401 and the Pod sits in ImagePullBackOff with 'unauthorized' in its events."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 28%
    {
      slug: "service-types-three-needs",
      objective:
        "Networking: the Kubernetes network model (every Pod gets an IP, flat connectivity), CNI plugins, and Service types ClusterIP, NodePort, LoadBalancer and ExternalName",
      kind: "build",
      title: "Match three access needs to Service types",
      brief:
        "The fictional ticketing platform Oriel runs on a managed Kubernetes cluster in a cloud provider. Three needs: (A) the checkout Pods must call the inventory Pods by a stable name inside the cluster only; (B) the public web front end must be reachable from the internet on 443 at a stable address; (C) the reporting Pods must call the company's legacy accounting system at ledger.oriel-corp.example (outside the cluster) but the developers want to refer to it as ledger inside manifests so it can be swapped later. A junior engineer proposes NodePort for all three.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick a Service type for each need with the key spec fields, explain how traffic reaches the Pods in each case, and say why NodePort is the wrong default.",
          parts: [
            matchPart("Service type for each need", "A is ClusterIP, B is LoadBalancer and C is ExternalName; NodePort fits none of them. All three right is met; two is partly there.", "A (internal, stable name) -> ClusterIP. B (public on 443 at a stable address) -> LoadBalancer. C (an external host under an internal name) -> ExternalName. NodePort opens a high port on every node and suits none of the three.", { leftHeading: "Need", rightHeading: "Service type", left: ["A: checkout calls inventory, inside the cluster only", "B: public web front end on 443 at a stable address", "C: refer to ledger.oriel-corp.example as ledger"], right: ["ClusterIP", "LoadBalancer", "ExternalName", "NodePort"], pairs: [0, 1, 2] }),
            part(
              "A: internal only",
              "ClusterIP (the default) with a selector on the inventory Pods; explains the virtual IP and DNS name inventory.<ns>.svc.cluster.local, and that kube-proxy (or the CNI's replacement) forwards to a ready endpoint.",
              "ClusterIP: spec.type omitted or ClusterIP, selector app=inventory, port 80 -> targetPort 8080. The Service gets a stable virtual IP and the DNS name inventory.<namespace>.svc.cluster.local; kube-proxy's rules on every node rewrite connections to one of the ready Pod IPs listed in the EndpointSlice. Nothing outside the cluster can reach a ClusterIP."
            ),
            part(
              "B: public on 443",
              "LoadBalancer, which on a cloud provider provisions an external load balancer with a stable IP or hostname that forwards to the Service's NodePort/ClusterIP; mentions Ingress or Gateway API as the usual way to share one load balancer across many HTTP apps.",
              "LoadBalancer: type LoadBalancer, port 443. The cloud-controller-manager asks the provider for a load balancer whose address appears under EXTERNAL-IP; it forwards to the nodes, and from there to the Pods. Because each LoadBalancer Service costs a cloud load balancer, teams usually put one in front of an Ingress controller or Gateway and route many hostnames through it."
            ),
            part(
              "C: external system by an internal name",
              "ExternalName Service with externalName ledger.oriel-corp.example and no selector; explains it is a DNS CNAME, carries no proxying or ports, and lets the target be changed in one place.",
              "ExternalName: type ExternalName, externalName: ledger.oriel-corp.example, no selector. CoreDNS answers ledger.<ns>.svc.cluster.local with a CNAME to the external name, so Pods connect directly to the legacy host; no kube-proxy rules are involved and the port is whatever the application uses. Swapping the backend later is a one-line change to the Service."
            ),
            part(
              "Why not NodePort everywhere",
              "Explains NodePort opens a high port (30000-32767 by default) on every node and is mainly a building block for LoadBalancer or for lab clusters: it exposes internal services unnecessarily (A), gives no stable public address or port 443 (B), and cannot point at an external host at all (C).",
              "NodePort publishes the Service on a port from the 30000-32767 range on every node's IP. For A it needlessly exposes an internal service on every node; for B clients would need a node IP and an odd port rather than 443 on a stable address, and nodes change; for C a NodePort still needs Pods behind it and cannot alias an external host. It is the layer LoadBalancer builds on, not a general answer."
            ),
          ],
        },
      ],
    },
    {
      slug: "insecure-pod-review",
      objective: "Security: the 4Cs of cloud native security (cloud, cluster, container, code), the Pod Security Standards and Pod Security Admission, SecurityContexts and least privilege",
      kind: "case",
      title: "Review a Pod spec a vendor sent over",
      brief:
        "A monitoring vendor has sent the fictional retailer Hazelmere a Pod manifest to run their agent in namespace monitoring. The security lead asks you to review it against the Pod Security Standards before it is applied anywhere.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "apiVersion: v1\nkind: Pod\nmetadata:\n  name: vendor-agent\n  namespace: monitoring\nspec:\n  hostNetwork: true\n  hostPID: true\n  containers:\n  - name: agent\n    image: vendor/agent:latest\n    securityContext:\n      privileged: true\n    volumeMounts:\n    - name: docker-sock\n      mountPath: /var/run/docker.sock\n    - name: root\n      mountPath: /host\n  volumes:\n  - name: docker-sock\n    hostPath:\n      path: /var/run/docker.sock\n  - name: root\n    hostPath:\n      path: /",
          ask: "List what in this spec violates the Pod Security Standards and which level each violates, explain the practical risk of the two most serious items, and name one thing that is simply wrong for a current cluster.",
          parts: [
            part(
              "Violations and levels",
              "Identifies privileged: true, hostNetwork, hostPID and hostPath volumes as violations of the baseline standard (and therefore restricted too); image :latest and no runAsNonRoot/seccomp/capability drops as further restricted-level gaps.",
              "Baseline forbids: privileged containers, hostNetwork, hostPID (and hostIPC), and hostPath volumes -- this spec has all four. Restricted additionally requires runAsNonRoot, allowPrivilegeEscalation false, dropping ALL capabilities and a RuntimeDefault/Localhost seccomp profile, none of which are set. A mutable :latest tag is not a PSS rule but is a supply-chain weakness."
            ),
            part(
              "The two worst",
              "Explains privileged: true plus a hostPath mount of / gives the container root on the node's filesystem (read kubelet credentials, modify binaries), and hostPID with privileges lets it see and signal every process on the node; a compromise of this Pod is a compromise of the node and, via node credentials, potentially the cluster.",
              "privileged: true removes the container's isolation: all capabilities, all devices. Combined with /host -> / it can read /etc/kubernetes and /var/lib/kubelet (node certificates and tokens), write to the host's binaries or cron, and escape entirely. hostPID lets it inspect and kill any process on the node. If the agent image is ever compromised, the attacker owns the node and can pivot with the kubelet's identity."
            ),
            part(
              "Outdated assumption",
              "Spots /var/run/docker.sock: current Kubernetes nodes run containerd or CRI-O through the CRI (the built-in Docker Engine integration was removed), so the Docker socket usually does not exist; a modern agent should use the CRI socket or the kubelet's APIs, read-only.",
              "Mounting /var/run/docker.sock assumes Docker Engine is the node runtime. Kubernetes removed the built-in Docker integration, and most nodes run containerd (/run/containerd/containerd.sock) or CRI-O. The mount would be empty or fail -- and if it did exist, socket access is equivalent to root. The vendor should use CRI or kubelet metrics endpoints."
            ),
          ],
        },
        {
          text: "You send the review back. The vendor replies: 'Our agent needs to read container metrics and process lists on each node; the privileged mode is how every customer runs it.' The security lead asks you for a proposal that lets the agent do its job within policy, and for how the cluster could stop such a manifest being applied by accident.",
          ask: "Propose a least-privilege shape for the agent and the admission control that would catch the original manifest.",
          parts: [
            part(
              "Least-privilege design",
              "Proposes a DaemonSet with specific read-only hostPath mounts (e.g. /proc or /sys read-only, the CRI socket read-only) instead of /, no privileged flag, capabilities dropped to ALL plus only the specific ones needed (e.g. SYS_PTRACE if process inspection truly requires it), runAsNonRoot where the agent allows it, a RuntimeDefault seccomp profile, a pinned image tag or digest, and its own ServiceAccount with RBAC limited to reading nodes/metrics.",
              "Run it as a DaemonSet (one per node) with: no privileged flag; readOnly hostPath mounts only for the paths actually read (/proc, /sys, the containerd socket); capabilities drop ALL and add back just what is proven necessary (SYS_PTRACE for process inspection, say); seccompProfile RuntimeDefault; a pinned image agent:4.2.1@sha256:...; and a dedicated ServiceAccount whose ClusterRole grants get/list on nodes and nodes/metrics only. 'Every customer runs it privileged' is not a requirement; it is a default nobody questioned."
            ),
            part(
              "Admission control",
              "Pod Security Admission labels on namespaces (pod-security.kubernetes.io/enforce=baseline or restricted, with warn/audit for stricter levels) so the API server rejects such Pods at creation, plus optionally a policy engine (Kyverno, OPA Gatekeeper) for rules PSS does not cover, such as forbidding :latest.",
              "Label every workload namespace with pod-security.kubernetes.io/enforce=baseline (restricted where possible) and warn=restricted: the built-in Pod Security Admission controller rejects privileged, hostPID, hostNetwork and hostPath Pods at the API before any kubelet sees them. For rules outside PSS -- no :latest tags, required resource limits, allowed registries -- add a policy engine such as Kyverno or OPA Gatekeeper as a validating admission webhook."
            ),
          ],
        },
      ],
    },
    {
      slug: "triage-pod-status",
      objective:
        "Troubleshooting: Pod phases and container states, reading kubectl get, describe, logs, events and exec, and recognizing CrashLoopBackOff, ImagePullBackOff, Pending and OOMKilled",
      kind: "case",
      title: "Triage four unhealthy Pods from one kubectl listing",
      brief:
        "On the fictional charity Riverbend Trust's cluster, a volunteer platform team of two checks the shared namespace apps each morning. Today four Pods are unhealthy and they ask you to say, for each, what the status means and the one command that would confirm the cause.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n apps get pods\nNAME                          READY   STATUS             RESTARTS        AGE\ndonations-5f7c9d-2kq8w        1/1     Running            0               9d\nmailer-7b8d6c-xv4lp           0/1     ImagePullBackOff   0               25m\nvolunteers-6c9f8b-m3ntz       0/1     CrashLoopBackOff   12 (3m ago)     41m\nreports-0                     0/1     Pending            0               2h\nevents-sync-84d9c-q7rst       0/1     Running            6 (90s ago)     14m\n\n$ kubectl -n apps get pod events-sync-84d9c-q7rst -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'\nOOMKilled",
          ask: "For mailer, volunteers, reports and events-sync: say what the status tells you, what the most likely category of cause is, and the single next command you would run.",
          parts: [
            matchPart("Cause category for each Pod", "mailer: the image can't be pulled; volunteers: the app exits after starting; reports-0: the scheduler can't place it; events-sync: it exceeds its memory limit. All four right is met; two or three is partly there.", "mailer (ImagePullBackOff) -> the image can't be pulled. volunteers (CrashLoopBackOff) -> the container keeps exiting after it starts. reports-0 (Pending) -> the scheduler has not placed it (resources, selector or taint, or an unbound claim). events-sync (Running, OOMKilled) -> killed for exceeding its memory limit. Nothing here shows a failing readiness probe alone.", { leftHeading: "Pod", rightHeading: "Most likely category", left: ["mailer: ImagePullBackOff", "volunteers: CrashLoopBackOff", "reports-0: Pending", "events-sync: Running, 6 restarts, OOMKilled"], right: ["The image can't be pulled", "The container exits after it starts", "The scheduler can't place it", "It exceeds its memory limit", "Only its readiness probe is failing"], pairs: [0, 1, 2, 3] }),
            part(
              "mailer: ImagePullBackOff",
              "The kubelet cannot pull the image (wrong name or tag, private registry without a pull secret, or registry down) and is backing off between attempts; next command kubectl describe pod to read the Failed/BackOff events with the registry's error text.",
              "ImagePullBackOff: the container never started because the image could not be pulled -- typo in the image name or tag, a private registry needing imagePullSecrets, or the registry unreachable. RESTARTS stays 0 because nothing ran. Next: kubectl -n apps describe pod mailer-7b8d6c-xv4lp and read the Events (e.g. 'manifest unknown' = bad tag, 'unauthorized' = credentials)."
            ),
            part(
              "volunteers: CrashLoopBackOff",
              "The container starts and exits (crashes or finishes) repeatedly; the kubelet waits longer each time (up to 5 minutes); likely an application error, bad config or a failing liveness probe; next command kubectl logs --previous to see the last crash's output.",
              "CrashLoopBackOff: the container keeps exiting after starting and the kubelet restarts it with growing delays (12 restarts in 41 minutes). Causes are usually inside the app: a missing env var or config file, a dependency it cannot reach, or a liveness probe killing it. Next: kubectl -n apps logs volunteers-6c9f8b-m3ntz --previous to read the output of the crashed instance, then describe for probe failures."
            ),
            part(
              "reports-0: Pending",
              "No node accepted the Pod (resources, selectors/taints, or an unbound PersistentVolumeClaim -- likely for a StatefulSet Pod named -0); next command kubectl describe pod for the FailedScheduling event, then the PVC.",
              "Pending for 2 hours means the scheduler has not placed it: insufficient CPU/memory, a nodeSelector or taint nobody satisfies, or -- common for a StatefulSet Pod like reports-0 -- its PersistentVolumeClaim is not bound so there is nowhere to put it. Next: kubectl -n apps describe pod reports-0; the FailedScheduling message names the reason, and kubectl get pvc -n apps shows whether a claim is Pending."
            ),
            part(
              "events-sync: Running with restarts, OOMKilled",
              "The container is running now but has been killed six times for exceeding its memory limit (exit code 137); cause is a memory limit set below real need or a leak; next command kubectl top pod (or describe for the limit) to compare usage with the limit.",
              "Running with 6 restarts and lastState OOMKilled: each time memory exceeded the container's limit the kernel killed it (exit 137) and the kubelet restarted it. Either the limit is too low for the workload or the process leaks. Next: kubectl -n apps top pod events-sync-84d9c-q7rst alongside kubectl get pod ... -o jsonpath='{.spec.containers[0].resources}' to compare real usage with the limit, then raise the limit or fix the leak."
            ),
          ],
        },
        {
          text: "The team fixes mailer (a tag typo) and raises events-sync's limit. For volunteers they run:\n\n$ kubectl -n apps logs volunteers-6c9f8b-m3ntz --previous | tail -3\nINFO  starting volunteers-api 3.4.0\nINFO  connecting to postgres at db.apps.svc:5432\nFATAL password authentication failed for user \"volunteers\"\n\n$ kubectl -n apps describe pod volunteers-6c9f8b-m3ntz | grep -A2 'Environment:'\n    Environment:\n      DB_USER:      volunteers\n      DB_PASSWORD:  <set to the key 'password' in secret 'volunteers-db'>  Optional: false",
          ask: "Say what the logs prove and do not prove, how you would check the Secret without printing it into a shared terminal, and what fix path you would take.",
          parts: [
            part(
              "What the evidence proves",
              "The app reaches the database (connection made) but the credential is rejected, so networking and DNS are fine and the fault is the password value in the Secret or the database's own user record; the restart loop is just the app exiting on the fatal error.",
              "The log shows a successful connection attempt to db.apps.svc:5432 followed by an authentication failure, so DNS, the Service and the network path all work. Either the Secret volunteers-db holds the wrong password or the database user was changed/rotated. CrashLoopBackOff is the consequence (the process exits on FATAL), not the cause."
            ),
            part(
              "Checking the Secret safely",
              "Confirms the key exists and compares a hash or length rather than echoing the value (e.g. kubectl get secret -o jsonpath for the key piped through base64 -d and sha256sum), notes Secrets are only base64-encoded so anyone with get on secrets can read them, and that the fix is updating the Secret (kubectl create secret ... --dry-run=client -o yaml | kubectl apply -f -) and restarting the Pods, or re-syncing the database password.",
              "kubectl -n apps get secret volunteers-db -o jsonpath='{.data.password}' | base64 -d | sha256sum compares with the hash of the known-good password without showing either in the terminal. Secrets are base64-encoded, not encrypted, so treat this access as sensitive. Then either update the Secret to the current database password and kubectl rollout restart deploy/volunteers (env values are read at container start), or ask the DBA to reset the user to match."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 16%
    {
      slug: "gitops-delivery-design",
      objective: "Application delivery: GitOps principles (declarative, versioned, pulled and continuously reconciled) and the tools that implement them, Argo CD and Flux",
      kind: "build",
      title: "Design a GitOps delivery path for three environments",
      brief:
        "The fictional language school Marlow Academy has one Kubernetes cluster per environment (dev, staging, prod). Today developers run kubectl apply from their laptops with whatever manifests they have, nobody knows what is really deployed, and a change once reached prod by accident. Leadership wants every change reviewed, every environment's state knowable from Git, and prod changes to need an approval.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe the delivery path you would build -- repositories, what CI does, what the cluster-side tool does, how environments differ, and how prod approval works -- and name the GitOps principle each part satisfies.",
          parts: [
            part(
              "Separation of CI and CD",
              "CI (e.g. GitHub Actions, GitLab CI, Tekton) builds, tests and pushes an immutable image tag, then updates the image tag in a separate config repository; it never runs kubectl against clusters. Credentials to clusters live only in the cluster-side tool.",
              "An application repo with code and Dockerfile; CI builds registry/app:<git-sha>, runs tests, pushes, and opens or commits a change to a config repo that bumps the image tag. CI has no cluster credentials at all -- that removes the laptop-apply and accidental-prod problems and keeps cluster access in one audited place."
            ),
            part(
              "Cluster-side reconciler",
              "Argo CD or Flux installed in each cluster, pulling the config repo and continuously reconciling the live state to it (detecting and optionally reverting drift); names the principles: declarative, versioned and immutable, pulled automatically, continuously reconciled.",
              "Each cluster runs Argo CD (or Flux) pointed at its path/branch in the config repo. It pulls (nothing pushes in), compares desired to live state, applies differences and reports drift -- with self-heal on, a manual kubectl edit is reverted. That is the four GitOps principles: the desired state is declarative; it is versioned in Git; the agent pulls it; and it is continuously reconciled."
            ),
            part(
              "Environments",
              "One config repo laid out with a shared base and per-environment overlays (Kustomize) or per-environment Helm values files, each cluster's agent watching only its own overlay; promotion is a reviewed change (PR) that copies a tag from staging to prod.",
              "config-repo/base holds the common manifests; overlays/dev, overlays/staging and overlays/prod hold Kustomize patches (replicas, image tags, hostnames) -- or one chart with values-dev.yaml etc. The dev cluster's Argo CD Application points at overlays/dev, and so on. Promotion to staging and prod is a pull request that changes the overlay's image tag, so Git history is the deployment history."
            ),
            part(
              "Prod approval and visibility",
              "Branch protection / CODEOWNERS requiring review on the prod overlay path, and the Argo CD or Flux UI/CLI as the 'what is deployed' answer (sync status, diff, history); optionally manual sync for prod so a merged PR still needs a click, and alerts on OutOfSync.",
              "Protect the main branch and require a reviewer (CODEOWNERS on overlays/prod) so nothing reaches prod unreviewed. Set the prod Application to manual sync (or a sync window) if a human gate after merge is wanted. 'What is running in staging?' becomes argocd app get staging-app or the Flux status: the commit it is synced to, any diff, and the sync history."
            ),
          ],
        },
      ],
    },
    {
      slug: "debug-failed-release",
      objective:
        "Debugging a delivery: tracing a failed release through pipeline logs, image tags, kubectl rollout status and history, Pod events and application logs to the step that broke",
      kind: "case",
      title: "Trace a release that 'went green' but never shipped",
      brief:
        "At the fictional parcel firm Westbrook Couriers, the pipeline for the tracking service reported success an hour ago, but customers still see the old version. The developer insists 'CI is green, so it must be Kubernetes'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n tracking rollout status deploy/tracking --timeout=5s\nWaiting for deployment \"tracking\" rollout to finish: 1 out of 4 new replicas have been updated...\nerror: timed out waiting for the condition\n\n$ kubectl -n tracking rollout history deploy/tracking\nREVISION  CHANGE-CAUSE\n17        tracking 2.9.0\n18        tracking 2.10.0\n\n$ kubectl -n tracking get rs -l app=tracking\nNAME                  DESIRED   CURRENT   READY   AGE\ntracking-5d8f7c9b4    4         4         4       6d\ntracking-7f6b8d5c2    1         1         0       58m\n\n$ kubectl -n tracking describe pod -l pod-template-hash=7f6b8d5c2 | grep -E 'Image:|Readiness|Warning' | head -4\n    Image:          registry.westbrook.example/tracking:2.10.0\n    Readiness:      http-get http://:8080/ready delay=5s timeout=1s period=10s #success=1 #failure=3\n  Warning  Unhealthy  2m (x340 over 58m)  kubelet  Readiness probe failed: HTTP probe failed with statuscode: 503",
          ask: "Explain what each piece of output tells you, where in the delivery path the failure actually is, and why CI being green was never evidence the release shipped.",
          parts: [
            part(
              "Reading the rollout",
              "The Deployment's rolling update is stuck: the new ReplicaSet has 1 Pod that never becomes Ready, so the controller (maxUnavailable protecting capacity) refuses to proceed and the old ReplicaSet still serves all 4 Pods -- which is why customers see the old version.",
              "rollout status shows 1 of 4 replicas updated and no progress; the ReplicaSets confirm it: the old one (5d8f7c9b4) has 4/4 Ready, the new one (7f6b8d5c2) has 1 Pod, 0 Ready, for 58 minutes. A rolling update only removes old Pods as new ones become Ready, so the live Service still points at the 2.9.0 Pods. Nothing is 'down'; the release is parked."
            ),
            part(
              "Where it broke",
              "Image 2.10.0 was built, pushed and applied correctly (the Pod exists with the right image), so CI, the registry and the manifest change all worked; the failure is the application in 2.10.0 answering 503 on /ready -- a runtime/app issue, confirmed next by kubectl logs on that Pod.",
              "The new Pod has image tracking:2.10.0, so the build, push and manifest update all happened. The kubelet reports the readiness probe failing with 503 340 times: the new code itself is not becoming ready. Next step is kubectl -n tracking logs <new pod> to see why (a dependency it cannot reach, a config key renamed in 2.10.0, a migration not run). The failing step is the application, not the pipeline and not the cluster."
            ),
            part(
              "Why green CI proved nothing",
              "CI only proves the image built and tests passed and (at most) that kubectl apply was accepted; the API server accepting a Deployment change says nothing about Pods becoming Ready. A pipeline that wants to prove shipment must wait on rollout status (or the GitOps tool's health) and fail if it times out.",
              "The pipeline's last step was applying a manifest, and the API server accepts a valid Deployment instantly -- that is what 'green' meant. Readiness is decided minutes later by kubelets. To make green mean shipped, the pipeline must run kubectl rollout status deploy/tracking --timeout=10m (or check Argo CD/Flux health) and fail on timeout, ideally followed by a smoke test against the live Service."
            ),
          ],
        },
        {
          text: "$ kubectl -n tracking logs -l pod-template-hash=7f6b8d5c2 --tail=3\nINFO  tracking 2.10.0 starting\nWARN  feature flag service flags.platform.svc unreachable (connection refused), readiness held\nWARN  feature flag service flags.platform.svc unreachable (connection refused), readiness held\n\nThe platform team confirms the flag service was decommissioned last month; 2.9.0 never called it. Customers are unaffected so far, but the product owner wants a decision in the next ten minutes.",
          ask: "Make the call: what do you do right now, what do you do next, and what change to the process prevents a repeat?",
          parts: [
            part(
              "Right now",
              "Roll back (kubectl rollout undo deploy/tracking) to clear the stuck rollout and return the Deployment to a clean 2.9.0 state, even though customers were not affected, because a half-finished rollout blocks every future change and the fix needs code or config; records the reason.",
              "kubectl -n tracking rollout undo deploy/tracking: the stuck new ReplicaSet is scaled to zero and the Deployment is back at revision 17 cleanly. Leaving a Deployment mid-rollout for hours blocks HPA scaling and any emergency change. Then tell the developer exactly what the new Pod logged so the fix is targeted."
            ),
            part(
              "Next",
              "Fix 2.10.0 by removing or making optional the dependency on the decommissioned flag service (or pointing it at the replacement), release as 2.10.1 with the same pipeline, and watch rollout status complete; checks whether other services still reference flags.platform.svc.",
              "Ship 2.10.1 with the flag client disabled or pointed at the replacement service; the readiness endpoint should not depend on an optional dependency anyway. Run the normal pipeline and wait for kubectl rollout status to report 'successfully rolled out'. Grep the config repo for flags.platform.svc to find other services carrying the same latent failure."
            ),
            part(
              "Process change",
              "Make the pipeline wait on rollout status and run a smoke test (so success means ready), deploy to staging first with the same dependencies as prod, and record decommissions in a place services' owners see (a dependency inventory or a deprecation notice checked in CI).",
              "Two gates: the pipeline fails unless rollout status succeeds and a smoke test passes; and staging must mirror prod's dependencies so a decommissioned service breaks staging first. Platform decommissions should be announced through a dependency inventory or a check that fails CI when a manifest references a retired Service name."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 12%
    {
      slug: "observability-design",
      objective: "Observability: designing SLIs, SLOs and alerts, and the difference between monitoring and observability, cost and telemetry volume included",
      kind: "build",
      title: "Design observability for a checkout service",
      brief:
        "The fictional outdoor retailer Fellbrook runs a checkout API on Kubernetes. Incidents are discovered when customers complain, dashboards show 40 panels nobody reads, and alerts fire on CPU above 80% several times a day with no customer impact. The engineering lead wants a plan using CNCF tooling they already have (Prometheus, Grafana, Fluent Bit, an OpenTelemetry Collector, Jaeger) that tells them when customers are affected and helps them find out why.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Propose the SLIs and SLOs, the alerting rule, which telemetry signal answers which question and which tool carries it, and how you would keep telemetry cost under control.",
          parts: [
            part(
              "SLIs and SLOs",
              "Chooses user-facing SLIs: availability (share of checkout requests that are not 5xx) and latency (share of requests under a threshold, e.g. 95% under 500 ms), measured at the edge or from the service's own request metrics; sets SLOs as targets over a window (e.g. 99.9% availability over 30 days) and derives an error budget.",
              "SLI 1: availability = successful (non-5xx) checkout requests / all checkout requests. SLI 2: latency = requests completed under 500 ms / all requests. Measured from the ingress or the service's Prometheus request histogram. SLOs: 99.9% availability and 95% of requests under 500 ms, each over a rolling 30 days. The 0.1% allowed failures is the error budget the team can spend on releases."
            ),
            part(
              "Alerting on symptoms, not causes",
              "Replaces the CPU alert with burn-rate alerts on the SLOs (e.g. page when the error budget burns at a rate that would exhaust it within hours; ticket for slow burn), explaining CPU is a cause that may or may not hurt users while error rate and latency are what customers feel.",
              "Alert on the SLI: a Prometheus rule that pages when the 1-hour error ratio is burning the 30-day budget at 14x (would exhaust it in about two days) and opens a ticket at a 6-hour slow burn. Drop the CPU page: high CPU is a possible cause, not an impact; it belongs on a dashboard and in capacity planning. Keep a few cause-based alerts only where they predict impact (disk nearly full, certificate expiring)."
            ),
            part(
              "Signals and tools",
              "Metrics (Prometheus, shown in Grafana) answer 'is something wrong and how much'; logs (Fluent Bit shipping container stdout to a store) answer 'what exactly happened'; traces (OpenTelemetry SDK/Collector to Jaeger) answer 'where in the request path time or errors come from'; explains observability as being able to ask new questions of this data, versus monitoring's fixed checks.",
              "Metrics -- Prometheus scrapes the checkout Pods' /metrics (request counts and latency histograms) and Grafana shows the SLOs and burn rate: detect and size the problem. Logs -- Fluent Bit as a DaemonSet ships each container's stdout with Pod labels to the log store: see the exact error. Traces -- the service instruments requests with OpenTelemetry, the Collector exports to Jaeger: see which downstream call (payment, inventory) is slow or failing. Monitoring is the fixed alerts; observability is being able to ask a question you did not predict, which needs labeled, correlated signals."
            ),
            part(
              "Cost and volume",
              "Controls cardinality in metrics (no user IDs as labels), samples traces (head or tail sampling in the Collector, 100% of errors), sets log levels and retention per environment, and keeps dashboards few and tied to SLOs.",
              "Metrics: forbid high-cardinality labels (user id, order id) -- a label with a million values is a million time series. Traces: sample in the OpenTelemetry Collector (e.g. 10% of successful requests, 100% of errors and slow ones). Logs: INFO in prod with 14-day retention, DEBUG only on demand; drop noisy health-check lines at Fluent Bit. Dashboards: one SLO dashboard per service instead of 40 panels."
            ),
          ],
        },
      ],
    },
    {
      slug: "cloud-native-evaluation",
      objective:
        "Cloud native ecosystem and principles: evaluating a design against resilience, scalability, loose coupling and manageability, and the role of service meshes and the CNCF landscape in it",
      kind: "case",
      title: "Evaluate a 'cloud native' migration proposal",
      brief:
        "The fictional insurer Ashcombe Mutual plans to move its policy-admin monolith to Kubernetes. A consultant's proposal is on your desk, and the CTO wants to know whether it is cloud native in substance or only in name, and what to change.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Proposal (extract):\n- Lift the monolith into one container image (14 GB), run it as a single Pod with hostPath storage for its files, replicas: 1.\n- Sessions stay in the process's memory; users are pinned to the Pod.\n- Config and database passwords baked into the image per environment (three images).\n- Deploy by SSH-ing to the node and running kubectl apply from a shared admin kubeconfig.\n- Adopt a service mesh in phase 1 'because it is cloud native'.\n- Split into 40 microservices in phase 2 within six months.",
          ask: "Assess the proposal against cloud native principles -- resilience, scalability, loose coupling, manageability, observability -- and say what you would change in phase 1.",
          parts: [
            part(
              "Resilience and scalability",
              "A single replica with in-memory sessions and hostPath storage cannot be rescheduled or scaled: a node failure loses sessions and files, and replicas: 2 would break pinned users; recommends externalizing sessions (a cache or signed cookies) and state (PVC or an external database/object store) before anything else so the Pod becomes replaceable and the Deployment can run several replicas behind a Service.",
              "replicas: 1 plus hostPath ties the application to one node -- if it dies the Pod cannot move and its files are gone; in-memory sessions mean any restart logs everyone out and a second replica would corrupt the experience. Phase 1 should make the monolith stateless at the Pod level: sessions in Redis or a signed cookie, files on a PersistentVolumeClaim or object storage, and then replicas: 3 behind a Service with readiness probes. That is what buys self-healing and scaling, with or without microservices."
            ),
            part(
              "Configuration and immutability",
              "Baking secrets and environment config into three images violates the immutable-artifact principle (one image promoted through environments) and leaks secrets into the registry; recommends one image, ConfigMaps for settings and Secrets (ideally from an external secret store) injected at runtime.",
              "One image, built once and promoted dev -> staging -> prod, is the immutable-infrastructure principle; three per-environment images cannot be compared and put passwords into every registry copy and layer history. Move settings to ConfigMaps and credentials to Secrets (sourced from the insurer's vault through the External Secrets Operator or a CSI secrets driver), injected as env or files at start."
            ),
            part(
              "Manageability and delivery",
              "SSH plus a shared admin kubeconfig is neither declarative nor auditable; recommends Git-held manifests applied by a pipeline or GitOps agent with RBAC-scoped identities, and no interactive access to nodes.",
              "A shared cluster-admin kubeconfig applied by hand from a node is the opposite of declarative, versioned, auditable delivery. Put manifests in Git, apply them through CI or Argo CD/Flux using a ServiceAccount scoped by RBAC to the policy-admin namespace, and remove SSH-to-node from the process entirely."
            ),
            part(
              "Service mesh and microservices timing",
              "A mesh adds mTLS, retries and telemetry between services -- there is one service in phase 1, so it adds cost and complexity for little; recommends deferring it, and treating '40 microservices in six months' as a goal to test against domain boundaries rather than a plan, splitting out what has independent scaling or release needs first.",
              "A service mesh (Istio, Linkerd, Cilium's mesh) earns its keep when many services need mTLS, traffic policy and uniform telemetry; a single monolith gains almost nothing and inherits sidecar overhead and operational learning curve. Defer it. Microservices are a means, not a principle: split along real domain seams (quoting, claims) when a part needs its own release cadence or scale, and measure each split against resilience, loose coupling and manageability. 40 services in six months is a target to question, not a plan."
            ),
          ],
        },
        {
          text: "The CTO accepts the phase-1 changes and asks a final question: 'How do we choose tools without betting on the wrong horse? The landscape has hundreds of projects.'",
          ask: "Explain how you would use the CNCF's structure to make tool choices for this program.",
          parts: [
            part(
              "Maturity levels as a risk signal",
              "Explains the CNCF maturity levels -- sandbox, incubating, graduated -- with graduated projects (e.g. Kubernetes, Prometheus, Helm, Argo, Flux, containerd) having demonstrated adoption, governance and security practices; recommends graduated or incubating projects for foundational choices and sandbox only for experiments.",
              "CNCF projects move through sandbox (early, experimental), incubating (used in production by several adopters, growing governance) and graduated (broad adoption, neutral governance, security audits, the TOC's due diligence). For this program's foundations -- orchestration, metrics, delivery, runtime -- choose graduated projects: Kubernetes, Prometheus, Helm, Argo or Flux, containerd. Incubating projects are reasonable where the need is clear; sandbox projects are for trials, not the policy-admin system."
            ),
            part(
              "Landscape, conformance and community",
              "Uses the CNCF landscape to see categories and alternatives, prefers Certified Kubernetes conformant distributions so workloads are portable, and weighs community health (contributors from several companies, release cadence, open governance under the TOC and SIGs) over a single vendor's roadmap.",
              "The CNCF landscape groups projects by category (observability, service mesh, GitOps...) so you can compare alternatives rather than take the first name heard. Run on a Certified Kubernetes conformant distribution so the same manifests work if the platform changes. Check a project's health: multiple contributing companies, regular releases, open governance (the TOC and SIGs oversee graduation), and a clear support policy -- the Kubernetes project itself releases three times a year and supports roughly the last three minor versions."
            ),
          ],
        },
      ],
    },
  ],
};
