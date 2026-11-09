import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Certified Kubernetes Application Developer (CKAD), curriculum v1.37.
//
// Aligned to the five CKAD domains (Application Design and Build 20%,
// Application Deployment 20%, Application Observability and Maintenance 15%,
// Application Environment, Configuration and Security 25%, Services and
// Networking 20%), read on 2026-11-07 from github.com/cncf/curriculum
// (CKAD_Curriculum_v1.37.pdf) and cncf.io/training/certification/ckad.
// Density (docs/labs.md, hybrid): 2 / 2 / 2 / 3 / 2.
//
// Developer's-eye labs: every answer is a manifest or a kubectl/helm
// command, and every case shows the cluster's own output. Stable GA APIs
// only (apps/v1, batch/v1, autoscaling/v2, networking.k8s.io/v1); the
// deprecation lab names removed API versions only to teach moving OFF them.

export const CKAD_LABS: SeedLabSet = {
  trackCode: "CKAD",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/CKAD_Curriculum_v1.37.pdf", "exam_outline", "2026-11-07"),
    source("https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/", "exam_outline", "2026-11-07"),
    source("https://kubernetes.io/docs/concepts/security/pod-security-standards/", "reference", "2026-11-07"),
    source("https://kubernetes.io/docs/reference/using-api/deprecation-guide/", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------- 20%
    {
      slug: "sidecar-log-shipper-pod",
      objective:
        "Design multi-container Pods with init containers, sidecars (including restartPolicy Always init containers), adapters and ambassadors sharing a network namespace and volumes",
      kind: "build",
      title: "Add a log-shipping sidecar and a schema-wait init container",
      brief:
        "The fictional payroll vendor Kestrel Pay runs the Deployment payroll-api (image registry.kestrel.example/payroll-api:7.3) in namespace payroll. The app writes its access log to /var/log/payroll/access.log inside the container and cannot be changed to write to stdout. The platform team wants those lines shipped by their collector image registry.kestrel.example/logtail:2.1, which reads a file path given as its first argument and prints lines to its own stdout. The app also crashes on start if the database schema is not yet migrated; the migration runs as a separate Job and its completion is visible because the Service schema-ready in the same namespace starts answering on port 8080.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Pod template (containers, init containers, volumes) and explain how the pieces share data and how they start and stop relative to each other.",
          parts: [
            part(
              "Shared volume for the log file",
              "An emptyDir volume mounted at /var/log/payroll in the app container and at a path in the shipper; explains emptyDir lives as long as the Pod and is the standard way two containers in one Pod share files.",
              "volumes:\n- name: logs\n  emptyDir: {}\n...\n- name: payroll-api\n  image: registry.kestrel.example/payroll-api:7.3\n  volumeMounts:\n  - {name: logs, mountPath: /var/log/payroll}\nThe sidecar mounts the same emptyDir (read-only is fine) so it sees access.log as the app writes it. emptyDir is created empty when the Pod starts and deleted with the Pod, which is right for a log buffer."
            ),
            part(
              "Sidecar as a restartable init container",
              "Declares the log shipper under initContainers with restartPolicy: Always (the native sidecar pattern) so it starts before the main container, keeps running alongside it and is stopped after it; an ordinary second container is an acceptable alternative with the trade-off named (no start ordering, lifecycle tied to the Pod's restartPolicy).",
              "initContainers:\n- name: logtail\n  image: registry.kestrel.example/logtail:2.1\n  args: [\"/var/log/payroll/access.log\"]\n  restartPolicy: Always\n  volumeMounts:\n  - {name: logs, mountPath: /var/log/payroll, readOnly: true}\nAn init container with restartPolicy: Always is a sidecar: it must start (and pass its startup probe, if any) before the regular containers, it keeps running for the life of the Pod, it is restarted if it exits, and the kubelet stops it after the main containers on shutdown -- so no log lines are lost at the end. Putting logtail under containers also works but gives no ordering guarantee."
            ),
            part(
              "Init container that waits for the schema",
              "A normal init container (no restartPolicy) running a small image in a loop until the Service schema-ready answers on 8080 (e.g. busybox wget/nc against schema-ready:8080), placed before the sidecar or after it, explaining that init containers run to completion in order and the app container does not start until each has exited 0.",
              "- name: wait-for-schema\n  image: busybox:1.36\n  command: [\"sh\",\"-c\",\"until wget -qO- --timeout=2 http://schema-ready.payroll.svc:8080/ >/dev/null 2>&1; do echo waiting; sleep 3; done\"]\nInit containers run one at a time, in order, each to completion; payroll-api does not start until wait-for-schema exits 0. Because the Pod's containers share one network namespace, the Service name resolves the same from the init container as it would from the app."
            ),
            part(
              "Why not a single container",
              "Explains at least two reasons the sidecar pattern beats baking the shipper into the app image: independent images and release cycles, separate resource limits and logs (kubectl logs -c logtail), and the app image stays unchanged.",
              "Baking logtail into payroll-api couples two teams' release cycles and makes one process supervise another. As a sidecar it has its own image tag, its own resources.limits, its own kubectl logs -c logtail stream and can be upgraded without touching the app. The app image stays exactly what the vendor shipped."
            ),
          ],
        },
      ],
    },
    {
      slug: "nightly-export-cronjob",
      objective: "Configure Jobs and CronJobs: completions, parallelism, backoffLimit, activeDeadlineSeconds, schedule, concurrencyPolicy and history limits",
      kind: "build",
      title: "Schedule a nightly export that never overlaps itself",
      brief:
        "Fictional museum network Alder Trust needs a nightly job in namespace collections that exports the day's catalogue changes using image registry.alder.example/exporter:1.9 with the command exporter --since=24h. It must run at 02:30 every night in the cluster's time zone (Europe/London), must never run two copies at once (a late run should simply be skipped), must give up after 3 retries, must be killed if a single run exceeds 45 minutes, and the team wants to be able to see the last 5 successful and last 3 failed runs with kubectl. They also want a one-off backfill of the last 30 days run by hand tonight without waiting for the schedule.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the CronJob manifest and the command for the one-off backfill, and explain each field you set.",
          parts: [
            part(
              "Schedule and time zone",
              "schedule: \"30 2 * * *\" with timeZone: Europe/London on the CronJob spec (batch/v1), rather than assuming the controller runs in London time.",
              "apiVersion: batch/v1\nkind: CronJob\nmetadata: {name: nightly-export, namespace: collections}\nspec:\n  schedule: \"30 2 * * *\"\n  timeZone: Europe/London\nThe five-field cron expression is minute hour day-of-month month day-of-week; without timeZone the schedule is interpreted in the kube-controller-manager's time zone, which is usually UTC."
            ),
            part(
              "No overlap, bounded retries, bounded duration",
              "concurrencyPolicy: Forbid on the CronJob; backoffLimit: 3 and activeDeadlineSeconds: 2700 on the jobTemplate.spec; explains Forbid skips a run while the previous is still active (Replace would kill it), backoffLimit counts failed Pods before the Job is marked failed, and activeDeadlineSeconds caps wall-clock time for the whole Job including retries.",
              "  concurrencyPolicy: Forbid\n  jobTemplate:\n    spec:\n      backoffLimit: 3\n      activeDeadlineSeconds: 2700\nForbid: if the 02:30 run is still going at the next tick, the new run is skipped (Replace would terminate the running one; Allow would overlap). backoffLimit: 3 means up to three failed Pods and then the Job fails. activeDeadlineSeconds: 2700 (45 min) terminates the Job and its Pods when exceeded, and takes precedence over backoffLimit."
            ),
            part(
              "History and the Pod template",
              "successfulJobsHistoryLimit: 5 and failedJobsHistoryLimit: 3; the template's restartPolicy is OnFailure or Never (Always is invalid for a Job), with the exporter container, image and args.",
              "  successfulJobsHistoryLimit: 5\n  failedJobsHistoryLimit: 3\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          restartPolicy: OnFailure\n          containers:\n          - name: exporter\n            image: registry.alder.example/exporter:1.9\n            args: [\"--since=24h\"]\nA Job's Pod template must use restartPolicy Never or OnFailure. The history limits keep the last 5 succeeded and 3 failed Job objects (and their Pods' logs) around for kubectl get jobs and kubectl logs."
            ),
            part(
              "One-off backfill",
              "Creates a Job from the CronJob with kubectl create job --from=cronjob/nightly-export and then overrides the args for 30 days, e.g. by generating YAML with --dry-run=client -o yaml and editing args to --since=720h before applying; knows the ad-hoc Job is not counted by the CronJob's concurrency policy.",
              "kubectl -n collections create job backfill-30d --from=cronjob/nightly-export --dry-run=client -o yaml > backfill.yaml\n# edit args to [\"--since=720h\"], then\nkubectl apply -f backfill.yaml\nkubectl -n collections get job backfill-30d -w\n--from copies the CronJob's jobTemplate (image, limits, restartPolicy, deadline). A Job created this way is independent of the schedule: concurrencyPolicy only compares runs the CronJob itself created, so start it when the nightly run is not due."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "canary-two-deployments",
      objective:
        "Implement common deployment strategies with Kubernetes primitives: blue/green with a Service selector switch and canary with weighted replica counts behind one Service",
      kind: "build",
      title: "Run a 10% canary of the search API with plain Kubernetes objects",
      brief:
        "Fictional bookseller Pemberton & Finch runs Deployment search (9 replicas, image registry.pf.example/search:5.0, labels app=search, track=stable) behind Service search (port 80 to 8080) in namespace catalog. They want version 5.1 to receive about 10% of traffic for a day with no service mesh or Ingress weighting available, then be promoted or withdrawn instantly.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the canary Deployment and the Service selector that make this work, explain the traffic arithmetic, and give the commands for promoting and for withdrawing the canary.",
          parts: [
            part(
              "Canary Deployment",
              "A second Deployment (e.g. search-canary) with 1 replica, image :5.1 and Pod labels app=search plus a distinguishing label (track=canary); its own selector must match its distinguishing labels so the two Deployments never adopt each other's Pods.",
              "apiVersion: apps/v1\nkind: Deployment\nmetadata: {name: search-canary, namespace: catalog}\nspec:\n  replicas: 1\n  selector:\n    matchLabels: {app: search, track: canary}\n  template:\n    metadata:\n      labels: {app: search, track: canary}\n    spec:\n      containers:\n      - name: search\n        image: registry.pf.example/search:5.1\n        ports: [{containerPort: 8080}]\nEach Deployment's selector includes its track label, so the stable ReplicaSet (track=stable) and the canary ReplicaSet (track=canary) own only their own Pods."
            ),
            part(
              "Service selector and the arithmetic",
              "The Service selects only app=search (not track), so both Deployments' Pods are endpoints; with 9 stable + 1 canary ready Pods the canary gets about 1/10 of connections because kube-proxy spreads connections roughly evenly across endpoints; states that the split is per connection, not guaranteed per request, and that replica counts are the only knob.",
              "Service search: spec.selector: {app: search} -- deliberately without track. Endpoints = 9 stable + 1 canary = 10, so roughly 10% of new connections reach 5.1 (kube-proxy picks endpoints at random or round-robin; keep-alive connections skew it slightly). For 5% you would need 19 stable + 1 canary; the ratio is set by replica counts because plain Services have no weights."
            ),
            part(
              "Promote",
              "Promotes by updating the stable Deployment's image to 5.1 (a normal rolling update) and then scaling the canary to 0 or deleting it, in that order so capacity never drops.",
              "kubectl -n catalog set image deploy/search search=registry.pf.example/search:5.1\nkubectl -n catalog rollout status deploy/search\nkubectl -n catalog delete deploy search-canary   # or scale --replicas=0\nRolling the stable Deployment first keeps 9+1 endpoints serving throughout; removing the canary last avoids a dip to 8 Pods."
            ),
            part(
              "Withdraw",
              "Withdraws instantly by scaling the canary Deployment to 0 (or changing the Service selector to include track=stable); explains the Service drops the canary endpoint within seconds and the stable Pods are untouched.",
              "kubectl -n catalog scale deploy/search-canary --replicas=0\nThe canary Pod terminates, the EndpointSlice loses its address and all traffic is back on 5.0 with no change to the stable Deployment. Alternatively patch the Service selector to {app: search, track: stable} -- the blue/green move -- which cuts the canary off even before its Pod stops."
            ),
          ],
        },
      ],
    },
    {
      slug: "helm-upgrade-rollback",
      objective:
        "Use the Helm package manager to deploy existing packages: repositories, search, values overrides, install, upgrade, rollback, history and uninstall",
      kind: "case",
      title: "Upgrade a Helm release, break it, and get back",
      brief:
        "The fictional media firm Wrenfield installs its internal metrics stack from a chart in the company repository. The release metrics in namespace observability is at chart metrics-stack 3.4.0 with a custom values file; the platform team asks for 3.6.0 with the retention raised to 30 days.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ helm repo list\nNAME        URL\nwrenfield   https://charts.wrenfield.example\n\n$ helm -n observability list\nNAME     NAMESPACE      REVISION  UPDATED                  STATUS    CHART                APP VERSION\nmetrics  observability  4         2026-09-30 11:02:17 UTC  deployed  metrics-stack-3.4.0  2.51.0\n\n$ helm search repo wrenfield/metrics-stack --versions | head -4\nNAME                      CHART VERSION  APP VERSION  DESCRIPTION\nwrenfield/metrics-stack   3.6.0          2.53.1       Metrics collection and dashboards\nwrenfield/metrics-stack   3.5.2          2.52.0       Metrics collection and dashboards\nwrenfield/metrics-stack   3.4.0          2.51.0       Metrics collection and dashboards\n\n$ helm -n observability get values metrics\nUSER-SUPPLIED VALUES:\nretention: 15d\nstorage:\n  size: 200Gi\n  className: fast-ssd",
          ask: "Write the commands to refresh the repo, inspect what 3.6.0 changes in its values, and perform the upgrade keeping the existing overrides and raising retention to 30 days.",
          parts: [
            part(
              "Refresh and inspect",
              "helm repo update, then helm show values wrenfield/metrics-stack --version 3.6.0 (and optionally helm show readme / diff against 3.4.0) to find renamed or new keys before upgrading.",
              "helm repo update\nhelm show values wrenfield/metrics-stack --version 3.6.0 > values-3.6.0.yaml\nhelm show values wrenfield/metrics-stack --version 3.4.0 | diff - values-3.6.0.yaml\nUpgrading a chart can rename values keys; reading the new chart's defaults first is how you find out that, say, retention moved under server.retention."
            ),
            part(
              "Upgrade keeping overrides",
              "helm upgrade metrics wrenfield/metrics-stack --version 3.6.0 -n observability with --reuse-values (or re-supplying the values file) and --set retention=30d, ideally with --atomic or --wait so a failed upgrade rolls itself back; warns that without --reuse-values or -f the user-supplied values are dropped.",
              "helm -n observability upgrade metrics wrenfield/metrics-stack --version 3.6.0 \\\n  --reuse-values --set retention=30d --atomic --timeout 5m\n--reuse-values carries forward storage.size and storage.className; plain helm upgrade resets everything to chart defaults, which would reprovision storage. --atomic waits for resources to be ready and rolls back automatically if they are not. Pinning --version avoids silently taking a newer chart later."
            ),
          ],
        },
        {
          text: "You ran the upgrade without --atomic. Ten minutes later:\n\n$ helm -n observability list\nNAME     NAMESPACE      REVISION  UPDATED                  STATUS    CHART                APP VERSION\nmetrics  observability  5         2026-11-07 10:14:51 UTC  deployed  metrics-stack-3.6.0  2.53.1\n\n$ kubectl -n observability get pods\nNAME                          READY   STATUS             RESTARTS      AGE\nmetrics-server-0              0/1     CrashLoopBackOff   6 (65s ago)   9m\nmetrics-dashboard-7c9f-x2k    1/1     Running            0             9m\n\n$ kubectl -n observability logs metrics-server-0 | tail -2\nlevel=error msg=\"opening storage failed: invalid retention value \\\"30d\\\": use a duration such as 720h\"\n\n$ helm -n observability history metrics | tail -3\n3   2026-08-12 09:40:03 UTC  superseded  metrics-stack-3.3.1  2.50.0  Upgrade complete\n4   2026-09-30 11:02:17 UTC  superseded  metrics-stack-3.4.0  2.51.0  Upgrade complete\n5   2026-11-07 10:14:51 UTC  deployed    metrics-stack-3.6.0  2.53.1  Upgrade complete",
          ask: "Restore service first, then explain how you would redo the upgrade correctly and how you would clean up if the stack were being retired.",
          parts: [
            part(
              "Roll back",
              "helm rollback metrics 4 -n observability (to the last good revision, 3.4.0 with 15d) and confirm the StatefulSet Pod is Running; notes rollback creates a new revision (6) rather than deleting 5, and that Helm's 'deployed' status only means the manifests applied, not that the app is healthy.",
              "helm -n observability rollback metrics 4 --wait\nhelm -n observability history metrics   # revision 6: Rollback to 4\nkubectl -n observability get pods -w   # metrics-server-0 1/1 Running\nHelm marked revision 5 deployed because the API accepted the manifests; the crash is an application-level config error Helm cannot see without --wait/--atomic. Rolling back re-applies revision 4's chart and values as a new revision 6; nothing is lost from history."
            ),
            part(
              "Redo correctly",
              "Re-runs the upgrade with the retention expressed the way 3.6.0 expects (e.g. 720h, found from helm show values), --reuse-values and --atomic, then verifies with kubectl and helm status; optionally tests first with helm upgrade --dry-run or helm template.",
              "helm -n observability upgrade metrics wrenfield/metrics-stack --version 3.6.0 \\\n  --reuse-values --set retention=720h --atomic --timeout 5m\nhelm -n observability status metrics\nkubectl -n observability logs metrics-server-0 | tail\nA --dry-run (or helm template ... | less) beforehand shows the rendered ConfigMap so the retention format can be checked before anything is applied."
            ),
            part(
              "Retire cleanly",
              "helm uninstall metrics -n observability removes everything the chart created (keeping history only with --keep-history); points out PersistentVolumeClaims from a StatefulSet's volumeClaimTemplates are not deleted by Helm and must be removed deliberately, and CRDs installed by the chart are also left behind.",
              "helm -n observability uninstall metrics\nkubectl -n observability get pvc   # data-metrics-server-0 remains: delete it only when the data is not needed\nHelm deletes the resources it rendered, but StatefulSet volume claims and any CRDs the chart installed are left in place on purpose so data and custom resources are not destroyed by accident."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 15%
    {
      slug: "probes-slow-start-app",
      objective:
        "Implement probes and health checks: liveness, readiness and startup probes with HTTP, TCP, exec and gRPC checks and sensible timings",
      kind: "build",
      title: "Write probes for a service that takes two minutes to warm up",
      brief:
        "The fictional travel aggregator Saltmarsh runs Deployment fares (3 replicas, container port 8080) in namespace pricing. On start the process loads a 1.4 GB fare cache, which takes 60-120 seconds; until then GET /healthz returns 503 and GET /ready returns 503. Once warm, /healthz returns 200 unless the process is deadlocked, and /ready returns 503 whenever the upstream airline feed is unreachable, which happens for a few minutes most days. Right now the Deployment has a single liveness probe on /healthz with the defaults, and Pods are killed and restarted before they ever finish loading.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the three probes for the fares container with timings, and explain what each one causes the kubelet to do and why the current setup loops.",
          parts: [
            part(
              "Why it loops today",
              "Explains the default liveness probe (initialDelaySeconds 0, periodSeconds 10, failureThreshold 3) fails three times within about 30 seconds of start while the cache is still loading, so the kubelet kills and restarts the container forever.",
              "With defaults the liveness probe starts immediately, runs every 10 s and fails the container after 3 misses -- roughly 30 s. The cache needs 60-120 s, so every container is killed mid-load and restarted; the Pod cycles into CrashLoopBackOff without ever serving."
            ),
            part(
              "Startup probe",
              "A startupProbe on /healthz (HTTP GET, port 8080) with failureThreshold x periodSeconds comfortably above 120 s (e.g. failureThreshold 30, periodSeconds 5 = 150 s), explaining that liveness and readiness probes are disabled until the startup probe succeeds once.",
              "startupProbe:\n  httpGet: {path: /healthz, port: 8080}\n  periodSeconds: 5\n  failureThreshold: 30\nThe container has up to 30 x 5 = 150 s to return 200 once. Until it does, the kubelet does not run liveness or readiness checks; if it never does within 150 s the container is restarted. This is the right tool for a slow start, better than a huge liveness initialDelaySeconds that also slows detection of real hangs later."
            ),
            part(
              "Liveness probe",
              "A livenessProbe on /healthz with a moderate period and threshold (e.g. periodSeconds 10, failureThreshold 3, timeoutSeconds 2); explains failure restarts the container, so it must only reflect conditions a restart fixes (deadlock), never the upstream feed.",
              "livenessProbe:\n  httpGet: {path: /healthz, port: 8080}\n  periodSeconds: 10\n  timeoutSeconds: 2\n  failureThreshold: 3\nLiveness failure = kubelet restarts the container. /healthz is specified to fail only on deadlock, which a restart cures. Pointing liveness at /ready would restart healthy Pods every time the airline feed blipped, making an outage worse."
            ),
            part(
              "Readiness probe",
              "A readinessProbe on /ready (e.g. periodSeconds 5, failureThreshold 2, successThreshold 1); explains failure removes the Pod from Service endpoints without restarting it, and the Pod returns when the feed recovers; notes readiness also gates rollouts.",
              "readinessProbe:\n  httpGet: {path: /ready, port: 8080}\n  periodSeconds: 5\n  failureThreshold: 2\nReadiness failure = the Pod's address is removed from the fares Service's EndpointSlice and traffic stops flowing to it, but the container keeps running; when /ready returns 200 again it is added back. During a rolling update a new Pod counts as available only once this probe passes, so a broken build cannot take over."
            ),
          ],
        },
      ],
    },
    {
      slug: "api-deprecation-apply-fails",
      objective:
        "Understand API deprecations: read apiVersion errors, find the current version with kubectl api-resources and explain, and migrate a manifest to a served API",
      kind: "case",
      title: "Fix manifests that stopped applying after a cluster upgrade",
      brief:
        "The fictional e-learning company Brindle moved its staging cluster to a current Kubernetes release over the weekend. On Monday the deployment pipeline for namespace lms fails on kubectl apply for two manifests that have not changed in two years.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl apply -f k8s/\ndeployment.apps/lms-web configured\nservice/lms-web unchanged\nerror: resource mapping not found for name: \"lms-web\" namespace: \"lms\" from \"k8s/hpa.yaml\": no matches for kind \"HorizontalPodAutoscaler\" in version \"autoscaling/v2beta2\"\nensure CRDs are installed first\nerror: resource mapping not found for name: \"grade-sync\" namespace: \"lms\" from \"k8s/cronjob.yaml\": no matches for kind \"CronJob\" in version \"batch/v1beta1\"\nensure CRDs are installed first\n\n$ kubectl api-resources | grep -E 'horizontalpodautoscalers|cronjobs'\ncronjobs                   cj      batch/v1          true   CronJob\nhorizontalpodautoscalers   hpa     autoscaling/v2    true   HorizontalPodAutoscaler",
          ask: "Explain what the error means (and why 'ensure CRDs are installed' is a red herring here), find the right API versions, and say how you would check for other manifests with the same problem before they bite.",
          parts: [
            part(
              "Reading the error",
              "Explains that the API server no longer serves autoscaling/v2beta2 or batch/v1beta1 (removed beta versions), so kubectl cannot map the manifest's kind+version to a resource; the CRD hint is generic advice that does not apply to built-in kinds.",
              "'no matches for kind X in version Y' means the server's discovery has no such group/version: those beta API versions were removed in a past release, and the upgrade crossed it. kubectl prints 'ensure CRDs are installed first' for any unmapped kind, but HorizontalPodAutoscaler and CronJob are built-in -- the fix is the version, not a CRD."
            ),
            part(
              "Finding the served versions",
              "Uses kubectl api-resources (as shown: autoscaling/v2 and batch/v1) and kubectl api-versions or kubectl explain hpa / kubectl explain cronjob --api-version=batch/v1 to confirm field names, and the Kubernetes deprecation guide for what changed between versions.",
              "kubectl api-resources shows the preferred version per resource: autoscaling/v2 for HPA, batch/v1 for CronJob. kubectl api-versions lists everything served. kubectl explain horizontalpodautoscaler.spec --api-version=autoscaling/v2 shows the current schema (metrics[].resource.target.averageUtilization instead of targetCPUUtilizationPercentage). The deprecation guide on kubernetes.io lists each removed version and the replacement."
            ),
            part(
              "Finding the rest",
              "Proposes checking every manifest in the repo for removed versions before the next upgrade: grep for beta apiVersions, kubectl apply --dry-run=server against the new cluster (which reports the same mapping errors without changing anything), or a linter such as kubectl-convert / pluto; also notes that objects already in the cluster were migrated by the API server and are not the problem -- the stored YAML files are.",
              "kubectl apply --dry-run=server -f k8s/ -R on the upgraded cluster surfaces every manifest that no longer maps, with no side effects. grep -rn 'apiVersion:.*beta' k8s/ catches the obvious ones. Objects already stored in etcd are fine -- the server reads them back in the new version -- it is the files in Git the pipeline applies that must change."
            ),
          ],
        },
        {
          text: "$ cat k8s/hpa.yaml\napiVersion: autoscaling/v2beta2\nkind: HorizontalPodAutoscaler\nmetadata: {name: lms-web, namespace: lms}\nspec:\n  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: lms-web}\n  minReplicas: 2\n  maxReplicas: 10\n  metrics:\n  - type: Resource\n    resource:\n      name: cpu\n      target: {type: Utilization, averageUtilization: 70}\n\n$ cat k8s/cronjob.yaml\napiVersion: batch/v1beta1\nkind: CronJob\nmetadata: {name: grade-sync, namespace: lms}\nspec:\n  schedule: \"*/15 * * * *\"\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          restartPolicy: OnFailure\n          containers:\n          - name: sync\n            image: registry.brindle.example/grade-sync:2.2",
          ask: "Rewrite both manifests for the served API versions, and state how you verify them before the pipeline runs again.",
          parts: [
            part(
              "HPA on autoscaling/v2",
              "Changes apiVersion to autoscaling/v2 and keeps the spec, noting the v2 metrics schema used here is unchanged from v2beta2 so no field edits are needed.",
              "apiVersion: autoscaling/v2\nkind: HorizontalPodAutoscaler\nmetadata: {name: lms-web, namespace: lms}\nspec:\n  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: lms-web}\n  minReplicas: 2\n  maxReplicas: 10\n  metrics:\n  - type: Resource\n    resource: {name: cpu, target: {type: Utilization, averageUtilization: 70}}\nThe v2beta2 metrics structure carried into v2 unchanged, so only the version line changes."
            ),
            part(
              "CronJob on batch/v1",
              "Changes apiVersion to batch/v1 with the rest unchanged; optionally adds timeZone and history limits now that it is being touched.",
              "apiVersion: batch/v1\nkind: CronJob\nmetadata: {name: grade-sync, namespace: lms}\nspec:\n  schedule: \"*/15 * * * *\"\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          restartPolicy: OnFailure\n          containers:\n          - name: sync\n            image: registry.brindle.example/grade-sync:2.2\nThe batch/v1 CronJob schema is the same for these fields; batch/v1 also offers timeZone, which v1beta1 did not."
            ),
            part(
              "Verify",
              "kubectl apply --dry-run=server -f k8s/hpa.yaml -f k8s/cronjob.yaml (server-side validation against the real schema), then apply, then kubectl get hpa,cronjob -n lms and kubectl describe hpa lms-web to see metrics being read.",
              "kubectl apply --dry-run=server -f k8s/hpa.yaml -f k8s/cronjob.yaml   # validates against the live API\nkubectl apply -f k8s/\nkubectl -n lms get hpa,cj\nkubectl -n lms describe hpa lms-web   # shows current CPU utilization vs 70% target once metrics-server reports\n--dry-run=server exercises the same admission and schema checks as a real apply, so a field that does not exist in the new version is caught before the pipeline runs."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 25%
    {
      slug: "restricted-securitycontext",
      objective:
        "Apply application security with SecurityContexts: runAsNonRoot, runAsUser, fsGroup, readOnlyRootFilesystem, allowPrivilegeEscalation false, dropped capabilities and seccompProfile",
      kind: "build",
      title: "Harden a web Pod to pass the restricted Pod Security Standard",
      brief:
        "The fictional insurer Corrigan Mutual is enforcing the restricted Pod Security Standard on namespace quotes (label pod-security.kubernetes.io/enforce=restricted). The Deployment quote-web runs image registry.corrigan.example/quote-web:3.8, whose process is built to run as UID 10001 and writes temporary files to /tmp and a cache to /var/cache/quote-web; it listens on 8080. With the namespace label applied, new Pods are rejected and the current Pod spec has no securityContext at all.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Pod-level and container-level securityContext (and any volumes needed) that make quote-web admissible under restricted while still working, and explain each setting.",
          parts: [
            part(
              "Non-root identity",
              "Pod securityContext with runAsNonRoot: true and runAsUser: 10001 (runAsGroup/fsGroup acceptable), explaining restricted requires runAsNonRoot and that the kubelet refuses to start a container whose image would run as UID 0 when runAsNonRoot is set.",
              "spec:\n  securityContext:\n    runAsNonRoot: true\n    runAsUser: 10001\n    runAsGroup: 10001\n    fsGroup: 10001\nrunAsNonRoot makes the kubelet verify the effective UID is not 0 before starting the container; setting runAsUser explicitly avoids relying on the image's USER instruction. fsGroup gives mounted volumes a group the process can write."
            ),
            part(
              "Seccomp",
              "seccompProfile type RuntimeDefault at Pod (or container) level; explains restricted requires a seccomp profile of RuntimeDefault or Localhost and that Unconfined is forbidden.",
              "  securityContext:\n    seccompProfile:\n      type: RuntimeDefault\nThe restricted profile requires seccompProfile.type to be RuntimeDefault or Localhost (Unconfined, or unset on older clusters, is rejected). RuntimeDefault applies the container runtime's default syscall allowlist, which almost all web apps run under without change."
            ),
            part(
              "Container hardening",
              "Container securityContext with allowPrivilegeEscalation: false, capabilities.drop: [ALL] (add only NET_BIND_SERVICE if binding below 1024, not needed on 8080), readOnlyRootFilesystem: true, and privileged absent/false.",
              "containers:\n- name: quote-web\n  securityContext:\n    allowPrivilegeEscalation: false\n    readOnlyRootFilesystem: true\n    capabilities:\n      drop: [\"ALL\"]\nrestricted requires allowPrivilegeEscalation=false and dropping ALL capabilities (only NET_BIND_SERVICE may be added back); the app listens on 8080 so it needs none. readOnlyRootFilesystem is not required by the standard but stops a compromised process writing to the image layers."
            ),
            part(
              "Writable paths with a read-only root",
              "emptyDir volumes mounted at /tmp and /var/cache/quote-web so the app can write where it needs to while the root filesystem stays read-only; optionally sizeLimit.",
              "volumes:\n- name: tmp\n  emptyDir: {}\n- name: cache\n  emptyDir:\n    sizeLimit: 500Mi\n...\n  volumeMounts:\n  - {name: tmp, mountPath: /tmp}\n  - {name: cache, mountPath: /var/cache/quote-web}\nWith readOnlyRootFilesystem the only writable locations are mounted volumes, so each path the app writes gets an emptyDir. fsGroup from the Pod context makes them writable by UID 10001's group."
            ),
            part(
              "Checking admission",
              "Tests with kubectl label ns quotes pod-security.kubernetes.io/warn=restricted (or --dry-run=server apply) and reads the warnings, then rolls out; knows the enforce label rejects only new Pods, so existing ones keep running until replaced.",
              "kubectl label ns quotes pod-security.kubernetes.io/warn=restricted pod-security.kubernetes.io/warn-version=latest --overwrite\nkubectl -n quotes apply -f quote-web.yaml --dry-run=server   # warnings name each violated control\nkubectl -n quotes rollout status deploy/quote-web\nPod Security Admission checks Pods at creation, so the enforce label does not touch the running Pod; the rollout creates new Pods, which must pass."
            ),
          ],
        },
      ],
    },
    {
      slug: "quota-rejects-pod",
      objective: "Understand requests, limits and quotas: how ResourceQuota and LimitRange constrain a namespace and why a Pod is rejected or defaulted",
      kind: "case",
      title: "Get a Deployment scheduled inside a namespace quota",
      brief:
        "The fictional logistics startup Tern Freight gives each team a namespace with a ResourceQuota and a LimitRange. The dispatch team's Deployment router in namespace dispatch shows 0 of 3 Pods after a scale-up, and the team thinks the cluster is full.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n dispatch get deploy router\nNAME     READY   UP-TO-DATE   AVAILABLE   AGE\nrouter   0/3     0            0           6m\n\n$ kubectl -n dispatch describe rs -l app=router | grep -A3 Events: | tail -2\n  Warning  FailedCreate  22s (x14 over 6m)  replicaset-controller  Error creating: pods \"router-6c7d8f9b5-\" is forbidden: failed quota: dispatch-quota: must specify limits.cpu for: router; limits.memory for: router\n\n$ kubectl -n dispatch describe quota dispatch-quota\nName:            dispatch-quota\nNamespace:       dispatch\nResource         Used   Hard\n--------         ----   ----\nlimits.cpu       2      4\nlimits.memory    3Gi    8Gi\npods             4      10\nrequests.cpu     1      2\nrequests.memory  1536Mi 4Gi\n\n$ kubectl -n dispatch get limitrange\nNo resources found in dispatch namespace.\n\n$ kubectl -n dispatch get deploy router -o jsonpath='{.spec.template.spec.containers[0].resources}'\n{}",
          ask: "Explain why no Pod is created (and why kubectl get pods shows nothing), then fix the Deployment so three Pods fit the remaining quota.",
          parts: [
            part(
              "Why there are no Pods",
              "Explains a ResourceQuota that limits limits.cpu/limits.memory (and requests) requires every container to declare them, and because there is no LimitRange to default them, the API server rejects each Pod at admission -- the ReplicaSet never gets a Pod object, so there is nothing Pending to see; the cluster is not full.",
              "The quota covers requests.* and limits.*, so admission refuses any Pod whose containers omit those values. A LimitRange would have injected defaults, but this namespace has none. The ReplicaSet controller's create calls fail (FailedCreate events), so no Pod exists -- that is why kubectl get pods is empty rather than showing Pending. Nothing about node capacity is involved."
            ),
            part(
              "Sizing within what is left",
              "Computes the headroom: requests.cpu 1 of 2 left, requests.memory 2560Mi left, limits.cpu 2 left, limits.memory 5Gi left, pods 6 left; picks per-Pod values that fit three Pods, e.g. requests cpu 250m / memory 512Mi and limits cpu 500m / memory 1Gi (3 Pods = 750m/1536Mi requests, 1.5 CPU/3Gi limits).",
              "Remaining: requests.cpu 1, requests.memory 2560Mi, limits.cpu 2, limits.memory 5Gi, pods 6. For three Pods: requests cpu 250m, memory 512Mi (total 750m, 1536Mi) and limits cpu 500m, memory 1Gi (total 1.5, 3Gi) all fit. Anything like limits.cpu 1 per Pod (3 total) would exceed the 2 remaining and the third Pod would be rejected."
            ),
            part(
              "Apply and confirm",
              "kubectl set resources deploy/router with those requests and limits (or edit the template), then watches the ReplicaSet create Pods and checks the quota's Used column moved.",
              "kubectl -n dispatch set resources deploy/router --requests=cpu=250m,memory=512Mi --limits=cpu=500m,memory=1Gi\nkubectl -n dispatch get pods -w              # three router Pods appear and become Running\nkubectl -n dispatch describe quota dispatch-quota   # requests.cpu Used 1750m of 2, limits.cpu 3500m of 4, pods 7 of 10\nChanging the template triggers a new ReplicaSet whose Pods now pass admission."
            ),
          ],
        },
        {
          text: "The Pods run. A week later the platform team adds a LimitRange to every team namespace:\n\n$ kubectl -n dispatch describe limitrange team-defaults\nName:       team-defaults\nNamespace:  dispatch\nType        Resource  Min    Max   Default Request  Default Limit  Max Limit/Request Ratio\n----        --------  ---    ---   ---------------  -------------  -----------------------\nContainer   cpu       100m   1     200m             500m           -\nContainer   memory    128Mi  2Gi   256Mi            512Mi          -\n\nA developer then adds a new Deployment, geocoder, with a single container requesting memory 3Gi and limiting it to 3Gi, and gets:\n\n$ kubectl -n dispatch apply -f geocoder.yaml\ndeployment.apps/geocoder created\n$ kubectl -n dispatch describe rs -l app=geocoder | grep forbidden\n  Warning  FailedCreate  ... pods \"geocoder-5d6f7-\" is forbidden: maximum memory usage per Container is 2Gi, but limit is 3Gi",
          ask: "Explain how the LimitRange changes what happens to Pods with and without resources, and advise the developer on geocoder.",
          parts: [
            part(
              "What a LimitRange does",
              "Explains it works per container at admission: it injects Default Limit and Default Request when a container omits them, and rejects any container whose request/limit is outside Min/Max; contrasts with the ResourceQuota, which is a namespace-wide total.",
              "A LimitRange is a per-container admission rule. A container with no resources now gets request 200m/256Mi and limit 500m/512Mi filled in automatically (so the earlier 'must specify limits' error would no longer occur). A container that does set values must stay within Min 100m/128Mi and Max 1 CPU/2Gi or the Pod is rejected. The ResourceQuota, by contrast, caps the namespace's total."
            ),
            part(
              "Advice on geocoder",
              "Either reduce the container's memory limit to at most 2Gi (if the app can live with it) or ask the platform team to raise the LimitRange Max for this namespace; splitting the work across more smaller Pods is another option; points out that even at 2Gi the quota's remaining limits.memory must still cover it.",
              "The 3Gi limit exceeds the LimitRange Max of 2Gi, so no Pod with that container will ever be admitted here. Options: set limits.memory (and requests) to 2Gi or less if geocoder fits; or request a namespace-specific LimitRange change from the platform team; or redesign to several smaller workers. Also check the quota: after router's three Pods, limits.memory has 2Gi left, so a single 2Gi geocoder fits exactly and a second replica would not."
            ),
          ],
        },
      ],
    },
    {
      slug: "configmap-secret-serviceaccount",
      objective:
        "Create and consume Secrets: generic, docker-registry and TLS Secrets as env vars, envFrom and volumes, imagePullSecrets, and immutable Secrets",
      kind: "build",
      title: "Wire configuration, credentials and a private registry into one Pod",
      brief:
        "The fictional pharmacy chain Greenway Scripts deploys the Deployment refill-api in namespace pharmacy. The image lives in a private registry, registry.greenway.example, which needs a username and password to pull. The app reads non-sensitive settings from environment variables (LOG_LEVEL=info, REGION=eu-west), a database password from the environment variable DB_PASSWORD, and expects a TLS certificate and key as files at /etc/tls/tls.crt and /etc/tls/tls.key. Security asks that the database Secret cannot be edited in place by mistake and that the Pod does not receive a ServiceAccount API token it never uses.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the kubectl commands that create each object and the Pod template that consumes them, with a sentence on each choice.",
          parts: [
            part(
              "Private registry pull",
              "kubectl create secret docker-registry (kubernetes.io/dockerconfigjson) with the registry server, username and password, referenced from the Pod via imagePullSecrets (or attached to the ServiceAccount's imagePullSecrets).",
              "kubectl -n pharmacy create secret docker-registry greenway-registry \\\n  --docker-server=registry.greenway.example --docker-username=refill-ci --docker-password='<from the vault, not typed in chat>'\nIn the Pod spec: imagePullSecrets: [{name: greenway-registry}]. Adding the same secret to the ServiceAccount's imagePullSecrets makes every Pod using that ServiceAccount inherit it. Without it the kubelet gets 401 and the Pod sits in ImagePullBackOff."
            ),
            part(
              "ConfigMap for plain settings",
              "kubectl create configmap from literals and envFrom.configMapRef in the container (or individual env valueFrom.configMapKeyRef); explains ConfigMaps are for non-secret data and are read at container start when used as env.",
              "kubectl -n pharmacy create configmap refill-config --from-literal=LOG_LEVEL=info --from-literal=REGION=eu-west\ncontainers:\n- name: refill-api\n  envFrom:\n  - configMapRef: {name: refill-config}\nenvFrom turns every key into an environment variable. Env vars are captured when the container starts, so a ConfigMap change needs a rollout restart to take effect (mounted files update in place, env does not)."
            ),
            part(
              "Immutable database Secret as an env var",
              "kubectl create secret generic for DB_PASSWORD then marks it immutable: true (via a manifest or kubectl patch), consumed with env valueFrom.secretKeyRef; explains immutable Secrets cannot be changed (only deleted and recreated) and reduce API server watch load, and that env exposure means the value is visible to anyone who can exec or read the Pod spec's resolved env, so RBAC on secrets matters.",
              "kubectl -n pharmacy create secret generic refill-db --from-literal=DB_PASSWORD='<value>' --dry-run=client -o yaml \\\n  | sed '$ a immutable: true' | kubectl apply -f -\nenv:\n- name: DB_PASSWORD\n  valueFrom:\n    secretKeyRef: {name: refill-db, key: DB_PASSWORD}\nimmutable: true makes any edit fail; rotation is delete + recreate + rollout, which is deliberate. Secrets are base64-encoded, not encrypted, in the API -- protect them with RBAC (and encryption at rest), not by hiding them in a ConfigMap."
            ),
            part(
              "TLS Secret as files",
              "kubectl create secret tls with --cert and --key, mounted as a volume at /etc/tls (readOnly), which yields files tls.crt and tls.key automatically.",
              "kubectl -n pharmacy create secret tls refill-tls --cert=refill.crt --key=refill.key\nvolumes:\n- name: tls\n  secret:\n    secretName: refill-tls\n    defaultMode: 0400\ncontainers:\n- volumeMounts:\n  - {name: tls, mountPath: /etc/tls, readOnly: true}\nA kubernetes.io/tls Secret always has the keys tls.crt and tls.key, so the mount produces exactly the file names the app expects. Mounted Secret files are updated in place when the Secret changes (unless subPath is used)."
            ),
            part(
              "No unused API token",
              "A dedicated ServiceAccount for the app with automountServiceAccountToken: false on the Pod spec (or on the ServiceAccount), explaining the token would otherwise be projected into every container and is a credential a compromised app could use.",
              "kubectl -n pharmacy create serviceaccount refill-api\nspec:\n  serviceAccountName: refill-api\n  automountServiceAccountToken: false\nBy default every Pod gets a projected, time-bound token for its ServiceAccount at /var/run/secrets/kubernetes.io/serviceaccount. refill-api never calls the API, so turning automount off removes a credential an attacker inside the container could otherwise use against the cluster."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "ingress-two-paths-tls",
      objective: "Use Ingress rules to expose applications: ingressClassName, hosts, paths and pathType, backends and TLS from a Secret",
      kind: "build",
      title: "Publish a web app and its API on one hostname with TLS",
      brief:
        "Fictional community bank Harrowgate runs two Services in namespace online: web (port 80 -> Pods on 3000) serving the single-page app, and api (port 8080) serving JSON under /api/. The cluster has an ingress controller installed with IngressClass nginx. Customers must reach https://online.harrowgate.example/ for the app and https://online.harrowgate.example/api/... for the API, with a certificate the security team has given you as online.crt and online.key. Plain HTTP should not serve the application.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Ingress (and the Secret it needs) and explain the routing and TLS behaviour.",
          parts: [
            part(
              "TLS Secret",
              "kubectl create secret tls in namespace online from the certificate and key; notes the Secret must be in the same namespace as the Ingress.",
              "kubectl -n online create secret tls online-tls --cert=online.crt --key=online.key\nThe Ingress can only reference a Secret in its own namespace; the controller reads tls.crt and tls.key from it to terminate HTTPS for the listed host."
            ),
            part(
              "Ingress with two path rules",
              "A networking.k8s.io/v1 Ingress with ingressClassName nginx, one rule for host online.harrowgate.example with path /api pathType Prefix to Service api port 8080 and path / pathType Prefix to Service web port 80; explains Prefix matching on path elements and that the longest match wins so /api is not swallowed by /.",
              "apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata: {name: online, namespace: online}\nspec:\n  ingressClassName: nginx\n  tls:\n  - hosts: [online.harrowgate.example]\n    secretName: online-tls\n  rules:\n  - host: online.harrowgate.example\n    http:\n      paths:\n      - path: /api\n        pathType: Prefix\n        backend:\n          service: {name: api, port: {number: 8080}}\n      - path: /\n        pathType: Prefix\n        backend:\n          service: {name: web, port: {number: 80}}\nPrefix matches whole path elements (/api and /api/refill match; /apix does not). When several prefixes match, the longest wins, so /api/... goes to api and everything else to web."
            ),
            part(
              "Why ingressClassName and the Service port",
              "Explains ingressClassName selects which controller implements the Ingress (without it only a default class picks it up), and that backend.service.port is the Service's port (80, 8080), not the Pods' containerPort (3000).",
              "ingressClassName: nginx tells the nginx controller this Ingress is its job; with several controllers installed an Ingress with no class is only served by the one marked default. The backend port is the Service port -- the Service maps 80 to the web Pods' 3000, so the Ingress never needs to know the container port."
            ),
            part(
              "Plain HTTP",
              "States that with a tls section most controllers redirect HTTP to HTTPS by default for that host (nginx does), and names the controller annotation that makes it explicit (nginx.ingress.kubernetes.io/ssl-redirect: \"true\") while noting redirect behaviour is controller-specific, not part of the Ingress API.",
              "The Ingress API itself only says 'terminate TLS for this host'; whether port 80 redirects is up to the controller. ingress-nginx redirects to HTTPS automatically when a host has TLS configured; adding the annotation nginx.ingress.kubernetes.io/ssl-redirect: \"true\" makes the intent explicit. Verify with curl -I http://online.harrowgate.example/ (expect 308) and curl -k https://.../api/health."
            ),
          ],
        },
      ],
    },
    {
      slug: "networkpolicy-blocks-frontend",
      objective: "Demonstrate a basic understanding of NetworkPolicies: how a policy selects Pods, ingress and egress rules, and why a Pod becomes isolated",
      kind: "case",
      title: "Find out why the frontend lost its backend overnight",
      brief:
        "The fictional ticketing cooperative Northfield runs Pods labelled app=frontend and app=backend (port 9090) in namespace box-office. The security team applied a NetworkPolicy last night and this morning the frontend shows 'backend unavailable'. The cluster's network plugin enforces NetworkPolicy.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n box-office get networkpolicy\nNAME               POD-SELECTOR   AGE\nbackend-ingress    app=backend    11h\n\n$ kubectl -n box-office get networkpolicy backend-ingress -o yaml | sed -n '/^spec:/,$p'\nspec:\n  podSelector:\n    matchLabels:\n      app: backend\n  policyTypes:\n  - Ingress\n  ingress:\n  - from:\n    - podSelector:\n        matchLabels:\n          role: frontend\n    ports:\n    - protocol: TCP\n      port: 9090\n\n$ kubectl -n box-office get pods --show-labels\nNAME                        READY   STATUS    RESTARTS   AGE   LABELS\nbackend-7d9c8b5f4-k2lmn     1/1     Running   0          3d    app=backend,pod-template-hash=7d9c8b5f4\nfrontend-6f8d7c9b5-p4qrs    1/1     Running   0          3d    app=frontend,pod-template-hash=6f8d7c9b5\n\n$ kubectl -n box-office exec frontend-6f8d7c9b5-p4qrs -- wget -qO- --timeout=3 http://backend:9090/health\nwget: download timed out",
          ask: "Explain why the frontend is blocked even though the policy 'allows frontend', and give two different fixes, saying which you would choose.",
          parts: [
            part(
              "Why it is blocked",
              "Explains that once any NetworkPolicy selects the backend Pods they are isolated for ingress and only listed sources may connect; the rule allows Pods labelled role=frontend, but the frontend Pod carries app=frontend and no role label, so it matches nothing and is denied; the timeout (not a refusal) is typical of a dropped packet.",
              "backend-ingress selects app=backend, so backend is now isolated for ingress: everything not matched by a from rule is dropped. The from rule asks for label role=frontend; the frontend Pod only has app=frontend, so it is not matched. A policy's intent does not matter -- only label matches do. A timeout rather than 'connection refused' is the signature of a policy drop."
            ),
            part(
              "Fix option 1: label the frontend",
              "Adds role=frontend to the frontend Deployment's Pod template (not just the running Pod, which would be lost on the next rollout), e.g. kubectl patch or edit, and confirms with the same exec test.",
              "kubectl -n box-office patch deploy frontend -p '{\"spec\":{\"template\":{\"metadata\":{\"labels\":{\"role\":\"frontend\"}}}}}'\nLabelling the live Pod with kubectl label pod works immediately but is lost at the next rollout; the template is the durable place. After the new Pod is Running: kubectl exec ... wget http://backend:9090/health returns 200."
            ),
            part(
              "Fix option 2: change the policy, and the choice",
              "Changes the policy's from podSelector to app: frontend; explains the choice: follow whichever labelling convention the organisation standardises on, and prefer the fix that does not widen access; rejects deleting the policy or adding an empty from (which would allow all Pods in the namespace).",
              "kubectl -n box-office edit networkpolicy backend-ingress  -> from: - podSelector: {matchLabels: {app: frontend}}\nEither fix restores only frontend -> backend:9090. Choose based on convention: if the security team's policies all key on role, label the Deployment; if app is the house label, fix the policy. Never 'fix' it by deleting the policy or by using from: [{podSelector: {}}], which opens backend to every Pod in the namespace."
            ),
          ],
        },
        {
          text: "The fix works. The security team now adds a second policy:\n\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: frontend-egress, namespace: box-office}\nspec:\n  podSelector:\n    matchLabels:\n      app: frontend\n  policyTypes: [Egress]\n  egress:\n  - to:\n    - podSelector:\n        matchLabels:\n          app: backend\n    ports:\n    - {protocol: TCP, port: 9090}\n\nMinutes later the frontend fails again:\n$ kubectl -n box-office exec deploy/frontend -- wget -qO- --timeout=3 http://backend:9090/health\nwget: bad address 'backend'",
          ask: "Explain the new failure and complete the egress policy so the frontend works, with the general rule you would tell the team.",
          parts: [
            part(
              "Why DNS broke",
              "Recognises 'bad address' as a DNS failure: the egress policy isolates the frontend for egress and allows only TCP 9090 to backend Pods, so UDP/TCP 53 to CoreDNS in kube-system is now dropped and the Service name cannot resolve, even though the backend path itself is allowed.",
              "Once a policy with policyTypes Egress selects frontend, every outbound connection not listed is dropped -- including DNS to CoreDNS (kube-dns Service in kube-system on port 53). The name 'backend' no longer resolves, so wget fails before it ever tries port 9090. The allowed path to backend is fine; the lookup that precedes it is not."
            ),
            part(
              "Completed egress policy",
              "Adds an egress rule allowing UDP and TCP port 53 to namespaceSelector kubernetes.io/metadata.name=kube-system (optionally podSelector k8s-app=kube-dns); states the rule: any Egress policy must allow DNS unless the Pods use IPs only.",
              "  egress:\n  - to:\n    - podSelector:\n        matchLabels: {app: backend}\n    ports:\n    - {protocol: TCP, port: 9090}\n  - to:\n    - namespaceSelector:\n        matchLabels: {kubernetes.io/metadata.name: kube-system}\n      podSelector:\n        matchLabels: {k8s-app: kube-dns}\n    ports:\n    - {protocol: UDP, port: 53}\n    - {protocol: TCP, port: 53}\nRule for the team: an egress policy isolates everything, so every egress policy needs a DNS allowance; and both ends must allow a connection (frontend's egress and backend's ingress), because policies are additive allowlists evaluated on each side."
            ),
          ],
        },
      ],
    },
  ],
};
