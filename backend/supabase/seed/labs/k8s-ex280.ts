import { GENERAL_SAFETY, part, type SeedLabSet, commandPart } from "./types";
import { source } from "../sources";

// REQ-164: Red Hat Certified System Administrator in OpenShift (EX280).
//
// Aligned to the eight objective groups on the EX280 exam page (read
// 2026-11-09, OpenShift Container Platform 4.22): Manage OpenShift
// Container Platform, Declarative Resource Management, Deploy applications,
// Manage authentication and authorization, Configure network security,
// Enable developer self-service, Manage OpenShift operators, Configure
// application security. Red Hat publishes no weights; density
// (docs/labs.md, hybrid) over the course's own weights:
// 2 / 2 / 2 / 2 / 2 / 1 / 1 / 2.
//
// EX280 is performance-based, so these labs are hands-on: oc commands and
// OpenShift manifests with authored cluster output. Every lab is
// needs_expert_review.

export const EX280_LABS: SeedLabSet = {
  trackCode: "EX280",
  sources: [
    source("https://www.redhat.com/en/services/training/red-hat-certified-openshift-administrator-exam", "exam_outline", "2026-11-09"),
    source("https://docs.redhat.com/en/documentation/red_hat_learning_subscription/1-latest/html-single/red_hat_certification_program_guide/index", "exam_outline", "2026-11-09"),
    source("https://helm.sh/docs/", "reference", "2026-11-09"),
    source("https://kubectl.docs.kubernetes.io/references/kustomize/", "reference", "2026-11-09"),
    source("https://olm.operatorframework.io/docs/", "reference", "2026-11-09"),
  ],
  labs: [
    // ---------------------------------------------- manage OCP 20%
    {
      slug: "query-and-filter-resources",
      objective: "Query, format and filter attributes of Kubernetes resources with -o jsonpath, custom-columns, labels and field selectors",
      kind: "build",
      title: "Answer five cluster questions with oc output formatting",
      brief:
        "The fictional airline Kestrel Air's OpenShift administrator must answer five questions quickly and reproducibly with oc rather than scrolling the console: which pods are not Running in project booking, every node's internal IP and kubelet version, the image each Deployment in project booking runs, all projects owned by team 'ops' by label, and the Route hostnames across the cluster.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the oc command for each question with its output and explain the selector or format used.",
          parts: [
            commandPart("Pods not Running (field selector)", "oc get pods in project booking with --field-selector status.phase!=Running. Flag order, = or a space before the value, -n or --namespace, and pods or po are all accepted. Right command with the wrong filter or project is partly there.", "$ oc get pods -n booking --field-selector status.phase!=Running\nNAME                       READY   STATUS             RESTARTS   AGE\npricing-7c9d5f8b6-xk2lp    0/1     CrashLoopBackOff   9          31m\nseatmap-db-0               0/1     Pending            0          12m\nField selectors filter server-side on a handful of fields -- status.phase, metadata.name, metadata.namespace, spec.nodeName -- unlike label selectors, which work on any label. Combine them: --field-selector spec.nodeName=worker-2,status.phase=Running.", { accepted: ["oc get pods -n booking --field-selector status.phase!=Running", "oc get po -n booking --field-selector status.phase!=Running", "oc get pod -n booking --field-selector status.phase!=Running"], valueFlags: ["-n", "--field-selector"], optionAliases: { "--namespace": "-n" } }),
            part(
              "Node IPs and versions (custom-columns)",
              "oc get nodes -o custom-columns with jsonpath-style expressions, selecting the InternalIP address from the addresses array by type and status.nodeInfo.kubeletVersion.",
              "$ oc get nodes -o custom-columns='NAME:.metadata.name,IP:.status.addresses[?(@.type==\"InternalIP\")].address,KUBELET:.status.nodeInfo.kubeletVersion,READY:.status.conditions[?(@.type==\"Ready\")].status'\nNAME       IP            KUBELET             READY\nmaster-0   10.0.0.10     v1.35.2+a1b2c3d     True\nworker-0   10.0.0.20     v1.35.2+a1b2c3d     True\nworker-1   10.0.0.21     v1.35.2+a1b2c3d     False\ncustom-columns takes HEADER:jsonpath pairs; the [?(@.type==\"InternalIP\")] filter picks one element of the addresses array. The same expressions work in -o jsonpath."
            ),
            part(
              "Images per Deployment (jsonpath with range)",
              "oc get deploy -n booking -o jsonpath with range over items and containers printing name and image, with a newline; notes that jsonpath needs {\"\\n\"} for line breaks and that -o json | jq is an alternative.",
              "$ oc get deploy -n booking -o jsonpath='{range .items[*]}{.metadata.name}{\"\\t\"}{range .spec.template.spec.containers[*]}{.image}{\" \"}{end}{\"\\n\"}{end}'\nbooking-api\tregistry.kestrel.example/booking/api@sha256:9a1b...\npricing\tregistry.kestrel.example/booking/pricing:2.3\nseatmap\tregistry.kestrel.example/booking/seatmap:1.9 registry.kestrel.example/booking/seatmap-sidecar:1.0\nrange ... end iterates; literal strings go in quotes inside the braces. The same with jq: oc get deploy -n booking -o json | jq -r '.items[] | \"\\(.metadata.name) \\(.spec.template.spec.containers[].image)\"'."
            ),
            part(
              "Projects by label and Routes cluster-wide",
              "oc get projects -l team=ops (label selector; Projects mirror Namespace labels), and oc get routes -A -o custom-columns for namespace, name and host; mentions --show-labels and -L to print label columns and --sort-by.",
              "$ oc get projects -l team=ops\nNAME        DISPLAY NAME   STATUS\nops-tools                  Active\nops-monitoring             Active\n$ oc get routes -A -o custom-columns='NS:.metadata.namespace,NAME:.metadata.name,HOST:.spec.host,TLS:.spec.tls.termination' --sort-by=.metadata.namespace\nNS         NAME          HOST                                      TLS\nbooking    booking-api   booking-api-booking.apps.kestrel.example  edge\nbooking    seatmap       seatmap-booking.apps.kestrel.example      <none>\nops-tools  grafana       grafana-ops-tools.apps.kestrel.example    reencrypt\n-l selects by label (also -l 'team in (ops,platform)', -l 'team!=ops'); -L team adds the label as a column; --show-labels prints them all; --sort-by orders by any jsonpath."
            ),
          ],
        },
      ],
    },
    {
      slug: "cluster-health-triage",
      objective:
        "Troubleshoot common container, pod and cluster events and alerts: image pulls, scheduling, crash loops, probes and resource pressure",
      kind: "case",
      title: "Triage a cluster health page full of warnings",
      brief:
        "Monday morning at the fictional retailer Fairholme, the OpenShift console shows a degraded operator, a NotReady node and four firing alerts. Work through the oc output to find what is wrong and what to do first.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ oc get clusterversion\nNAME      VERSION   AVAILABLE   PROGRESSING   SINCE   STATUS\nversion   4.22.3    True        False         9d      Cluster version is 4.22.3\n$ oc get clusteroperators | grep -v 'True.*False.*False'\nNAME            VERSION   AVAILABLE   PROGRESSING   DEGRADED   SINCE   MESSAGE\nmachine-config  4.22.3    True        True          True       41m     Unable to apply 4.22.3: timed out waiting for node worker-2 ... Node worker-2 is reporting: \"failed to drain node: ... pod checkout/inventory-db-0 ... cannot evict pod as it would violate the pod's disruption budget\"\n$ oc get nodes\nNAME       STATUS                     ROLES    AGE   VERSION\nmaster-0   Ready                      master   120d  v1.35.2\nworker-0   Ready                      worker   120d  v1.35.2\nworker-1   Ready                      worker   120d  v1.35.2\nworker-2   Ready,SchedulingDisabled   worker   120d  v1.35.2\nworker-3   NotReady                   worker   120d  v1.35.2\n$ oc describe node worker-3 | grep -A6 Conditions:\nConditions:\n  Type             Status   Reason                 Message\n  MemoryPressure   Unknown  NodeStatusUnknown      Kubelet stopped posting node status.\n  DiskPressure     Unknown  NodeStatusUnknown      Kubelet stopped posting node status.\n  Ready            Unknown  NodeStatusUnknown      Kubelet stopped posting node status.\n$ oc get pdb -n checkout\nNAME            MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE\ninventory-db    1               N/A               0                     200d\n$ oc get statefulset -n checkout inventory-db\nNAME           READY   AGE\ninventory-db   1/1     200d\n$ oc get events -n checkout --sort-by=.lastTimestamp | tail -3\n14m  Warning  FailedScheduling  pod/orders-6f7c8-q9x2z   0/5 nodes are available: 1 node(s) had untolerated taint {node.kubernetes.io/unreachable}, 1 node(s) were unschedulable, 3 Insufficient memory.\n9m   Warning  BackOff           pod/pricing-5d8b7-m2k1p  Back-off restarting failed container pricing in pod pricing-5d8b7-m2k1p\n6m   Warning  Failed            pod/promo-7b9c6-t4r8s    Failed to pull image \"registry.fairholme.example/promo:4.1\": ... unauthorized: authentication required",
          ask: "Explain how the symptoms connect, then order the actions.",
          parts: [
            part(
              "The chain of causes",
              "A machine-config update is rolling: worker-2 is cordoned and cannot drain because the single-replica inventory-db StatefulSet has a PDB with minAvailable 1 (allowed disruptions 0), so MCO is stuck and Degraded; worker-3's kubelet stopped reporting (NotReady, Unknown conditions) -- likely a node problem unrelated to the update; with one node cordoned and one unreachable, the remaining three lack memory, hence FailedScheduling; the BackOff and image pull failure are separate application problems.",
              "The machine-config operator is applying 4.22.3's node configuration one worker at a time; it cordoned worker-2 (SchedulingDisabled) and is draining it, but inventory-db-0 is a one-replica StatefulSet protected by a PDB requiring 1 available -- eviction would violate it, so the drain waits forever and MCO reports Degraded. Separately, worker-3's kubelet has stopped posting status: the node controller marked everything Unknown and tainted it unreachable -- the node itself (or its network) is down, not the update. Two of five nodes out of service leaves three nodes with insufficient memory, so new pods go Pending. The pricing crash loop and the promo image-pull 'unauthorized' are tenant-level faults riding along."
            ),
            part(
              "Order of actions",
              "First the capacity emergency: get worker-3 back (console/BMC, journalctl -u kubelet via oc debug node or the provider), or if it is gone, delete the node so its pods reschedule; second unblock the drain -- the correct fix is making inventory-db able to tolerate disruption (scale to 2 if it supports it, or temporarily relax the PDB with the application owner's agreement), not deleting the PDB blindly; then let MCO finish; then the tenant issues.",
              "1. worker-3: capacity is the fire. oc adm node-logs worker-3 -u kubelet (if reachable) or the infrastructure console; if the machine is dead, oc delete node worker-3 (or let the machine health check replace it) so the scheduler stops counting it and its pods are rescheduled when memory allows. 2. The stuck drain: with the checkout team, either scale inventory-db to a configuration that tolerates one replica down or temporarily edit the PDB (oc patch pdb inventory-db -n checkout -p '{\"spec\":{\"minAvailable\":0}}') for the duration of the drain -- noting it in the change log and restoring it after. The drain then completes, worker-2 reboots into the new config and MCO clears Degraded. 3. Watch oc get mcp worker until UPDATED=True. 4. Then the application-level items."
            ),
            part(
              "The tenant faults",
              "pricing BackOff: oc logs --previous and oc describe for the exit code and probe failures (CrashLoopBackOff is restarts, probes failing shows as Unhealthy events); promo: the image pull is an auth failure -- the namespace's pull secret is missing or expired; link the registry secret to the default service account or add it to the pod's imagePullSecrets.",
              "$ oc logs -n checkout pricing-5d8b7-m2k1p --previous | tail -3\npanic: config: PRICING_RULES_URL is required\nA crash on startup from missing config -- a Deployment env or ConfigMap change, fixed in the manifest. For promo:\n$ oc create secret docker-registry fairholme-pull -n checkout --docker-server=registry.fairholme.example --docker-username=svc-pull --docker-password=... \n$ oc secrets link default fairholme-pull --for=pull -n checkout\n$ oc rollout restart deploy/promo -n checkout\n'unauthorized: authentication required' is credentials, not the image name; linking the pull secret to the service account the pods use (or imagePullSecrets in the pod spec) fixes it."
            ),
          ],
        },
        {
          text: "The checkout team pushes back: 'The PDB is there for a reason; you cannot just set it to zero.'",
          ask: "Give the fair answer and the durable fix.",
          parts: [
            part(
              "Answer and durable fix",
              "Agree the PDB expresses a real need but explain that a PDB on a single replica with minAvailable 1 makes the application un-drainable, which blocks every node update and reboot -- the PDB cannot protect what has no redundancy; the durable fix is redundancy (a two-replica database with replication and minAvailable 1, or a managed operator-backed database) and, failing that, a maintenance process in which the team scales or relaxes the PDB during updates; for the moment, coordinate a window.",
              "The PDB is doing exactly what it says -- and that is the problem: with one replica, 'at least one available' means 'never evict', so no node that hosts it can ever be updated or rebooted gracefully. A PDB protects redundancy; it cannot create it. The right fix is to give inventory-db a second replica with replication (the database operator's cluster mode, or an operator-managed instance), so a drain can proceed while one replica serves. Until then, the team owns a documented procedure: during MCO updates they are paged, the pod is moved deliberately (scale/relax PDB) within a window, and the PDB is restored. Platform and team agree the window today rather than leaving a half-updated cluster."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- declarative 12%
    {
      slug: "kustomize-overlays-openshift",
      objective: "Build Kustomize overlays for environments with patches, namePrefix, images and configMapGenerator",
      kind: "build",
      title: "Build dev and prod overlays for an OpenShift application",
      brief:
        "The fictional publisher Haverford Books has a base of Deployment, Service and Route manifests for its catalog service. Create Kustomize overlays so that dev runs 1 replica with a dev ConfigMap and the image tag :dev, and prod runs 3 replicas, resource limits, an edge-TLS Route host and the image by digest; apply with oc apply -k and verify.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Lay out the directory tree, write the base and overlay kustomization files with patches and generators, then apply and verify both.",
          parts: [
            part(
              "Base",
              "base/kustomization.yaml listing the three resources with commonLabels (or labels) and a configMapGenerator for shared config; the Deployment references the ConfigMap by name and Kustomize rewrites the hashed name.",
              "catalog/\n  base/\n    kustomization.yaml\n    deployment.yaml\n    service.yaml\n    route.yaml\n    app.properties\n  overlays/\n    dev/kustomization.yaml\n    prod/kustomization.yaml\n    prod/resources-patch.yaml\n\n# base/kustomization.yaml\napiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nresources: [deployment.yaml, service.yaml, route.yaml]\nlabels:\n- includeSelectors: true\n  pairs: {app: catalog}\nconfigMapGenerator:\n- name: catalog-config\n  files: [app.properties]\nThe generator produces catalog-config-<hash> and rewrites the Deployment's configMapRef, so a config change changes the name and triggers a rollout automatically."
            ),
            part(
              "Dev overlay",
              "overlays/dev with namespace, namePrefix dev-, images override to tag dev, replicas 1 and a merged generator entry adding dev values; explains images: transforms every matching image name.",
              "# overlays/dev/kustomization.yaml\napiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nnamespace: catalog-dev\nnamePrefix: dev-\nresources: [../../base]\nimages:\n- name: registry.haverford.example/catalog\n  newTag: dev\nreplicas:\n- name: catalog\n  count: 1\nconfigMapGenerator:\n- name: catalog-config\n  behavior: merge\n  literals: [LOG_LEVEL=debug, FEATURE_PREVIEW=true]\nimages: rewrites every container whose image name matches, so the base can hold a placeholder tag. behavior: merge adds keys to the base-generated ConfigMap instead of replacing it."
            ),
            part(
              "Prod overlay",
              "overlays/prod with namespace, image by digest (newName/digest), replicas 3, a strategic-merge patch for resources and a JSON patch setting the Route host and edge termination; explains digest pinning for production.",
              "# overlays/prod/kustomization.yaml\napiVersion: kustomize.config.k8s.io/v1beta1\nkind: Kustomization\nnamespace: catalog-prod\nresources: [../../base]\nimages:\n- name: registry.haverford.example/catalog\n  digest: sha256:7f3a9c...\nreplicas:\n- name: catalog\n  count: 3\npatches:\n- path: resources-patch.yaml\n- target: {kind: Route, name: catalog}\n  patch: |-\n    - op: add\n      path: /spec/host\n      value: catalog.haverford.example\n    - op: add\n      path: /spec/tls\n      value: {termination: edge, insecureEdgeTerminationPolicy: Redirect}\n\n# overlays/prod/resources-patch.yaml\napiVersion: apps/v1\nkind: Deployment\nmetadata: {name: catalog}\nspec:\n  template:\n    spec:\n      containers:\n      - name: catalog\n        resources:\n          requests: {cpu: 250m, memory: 256Mi}\n          limits: {cpu: \"1\", memory: 512Mi}\nProduction pins the image by digest so what was tested is what runs; the strategic-merge patch merges by container name; the JSON patch targets the Route precisely."
            ),
            part(
              "Apply and verify",
              "oc kustomize to preview, oc apply -k for each overlay, and checks: replicas, image, ConfigMap hash name, Route TLS; oc diff -k before changing prod.",
              "$ oc kustomize overlays/prod | grep -E 'image:|replicas:|host:|termination'\n        image: registry.haverford.example/catalog@sha256:7f3a9c...\n  replicas: 3\n  host: catalog.haverford.example\n    termination: edge\n$ oc apply -k overlays/dev\nconfigmap/dev-catalog-config-9b6k4t7f2m created\ndeployment.apps/dev-catalog created\nservice/dev-catalog created\nroute.route.openshift.io/dev-catalog created\n$ oc apply -k overlays/prod\n$ oc get deploy -n catalog-prod catalog -o jsonpath='{.spec.replicas} {.spec.template.spec.containers[0].image}{\"\\n\"}'\n3 registry.haverford.example/catalog@sha256:7f3a9c...\n$ oc get route -n catalog-prod catalog -o jsonpath='{.spec.host} {.spec.tls.termination}{\"\\n\"}'\ncatalog.haverford.example edge\nBefore any prod change: oc diff -k overlays/prod shows exactly what will move."
            ),
          ],
        },
      ],
    },
    {
      slug: "secrets-configmaps-rollout",
      objective: "Create and use Secrets: generic, docker-registry and TLS, mounted as volumes or environment variables",
      kind: "case",
      title: "A Secret change that never reached the pods",
      brief:
        "At the fictional insurer Wyckham Mutual, the database password was rotated and the Secret updated, but the application still fails to authenticate an hour later. A second service that mounts its config as a file picked up its change without a restart. Explain and fix.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ oc get secret db-credentials -n claims -o jsonpath='{.data.password}' | base64 -d; echo\nN3wP@ss-2026\n$ oc get deploy claims-api -n claims -o yaml | grep -B2 -A6 'secretKeyRef'\n        env:\n        - name: DB_PASSWORD\n          valueFrom:\n            secretKeyRef:\n              name: db-credentials\n              key: password\n$ oc rsh deploy/claims-api sh -c 'echo $DB_PASSWORD'\n0ldP@ss-2025\n$ oc get pods -n claims -l app=claims-api -o custom-columns=NAME:.metadata.name,STARTED:.status.startTime\nNAME                          STARTED\nclaims-api-6c8d9f7b5-2k9lp    2026-10-30T08:14:02Z\nclaims-api-6c8d9f7b5-x7m1q    2026-10-30T08:14:05Z\n\n$ oc get deploy notifier -n claims -o yaml | grep -A4 'volumeMounts' | head -6\n        volumeMounts:\n        - name: config\n          mountPath: /etc/notifier\n$ oc rsh deploy/notifier cat /etc/notifier/smtp.conf | grep host\nhost = smtp2.wyckham.example     # the new value",
          ask: "Explain why one service saw its change and the other did not, and fix claims-api properly.",
          parts: [
            part(
              "Environment variables are fixed at container start",
              "secretKeyRef into env copies the value when the container starts; the pods have been running since October 30, so they hold the old password; a mounted Secret or ConfigMap volume is refreshed by the kubelet (eventually, on the sync period) without a restart -- subPath mounts excepted -- which is why notifier saw its new smtp.conf.",
              "Environment variables are read once, when the container is created: the kubelet resolves secretKeyRef and hands the process a fixed environment. The claims-api pods started on 30 October, long before the rotation, so they still carry the old value; nothing in Kubernetes updates a running process's environment. Volume-projected Secrets and ConfigMaps are different: the kubelet periodically rewrites the mounted files (via a symlinked directory swap), so notifier read smtp2 without restarting. The exception is a subPath mount, which never updates."
            ),
            part(
              "Fix now",
              "oc rollout restart deployment/claims-api so new pods read the new value; verify with oc rsh; explains that oc set env would also trigger a rollout but is unnecessary here.",
              "$ oc rollout restart deployment/claims-api -n claims\ndeployment.apps/claims-api restarted\n$ oc rollout status deployment/claims-api -n claims\ndeployment \"claims-api\" successfully rolled out\n$ oc rsh deploy/claims-api sh -c 'echo $DB_PASSWORD'\nN3wP@ss-2026\nrollout restart adds a restartedAt annotation to the pod template, creating a new ReplicaSet whose pods start with the current Secret. For a one-replica app, be aware the rolling update briefly runs old and new together."
            ),
            part(
              "Fix durably",
              "Options: mount the Secret as a file and have the app re-read it (or watch it), or make rotation trigger rollouts -- an annotation with the Secret's hash in the pod template (what Kustomize's secretGenerator does by renaming), or a controller like Reloader; also consider the TLS and docker-registry Secret types for other uses.",
              "Pick one: (a) mount db-credentials as a volume at /etc/secrets and have claims-api read the password from the file on each connection attempt -- rotation then needs no restart; (b) tie rotation to a rollout: generate the Secret with Kustomize's secretGenerator so its name changes with its content and the Deployment references the new name, or add a pod-template annotation with the Secret's checksum from your delivery pipeline; (c) run a reloader controller that watches annotated Secrets and restarts consumers. Document that env-injected Secrets always need a rollout. Note the other types for completeness: oc create secret tls for certificates (Route or serving certs) and oc create secret docker-registry for pull credentials."
            ),
          ],
        },
        {
          text: "During the restart a new pod fails: 'CreateContainerConfigError: secret \"db-credentials\" not found' -- in project claims-canary, where the team cloned the Deployment for a test.",
          ask: "Explain and resolve.",
          parts: [
            part(
              "Secrets are namespaced",
              "A Secret exists only in its own project; the cloned Deployment in claims-canary references a Secret that exists in claims; copy it (oc get secret -o yaml with namespace removed | oc apply -n claims-canary) or create it there; explains CreateContainerConfigError versus ImagePullBackOff and why a Secret should not be shared by copying passwords across many namespaces casually.",
              "Secrets and ConfigMaps are namespaced objects: db-credentials lives in claims and is invisible from claims-canary, so the kubelet cannot build the container's environment -- CreateContainerConfigError (distinct from an image pull problem). Fix: oc get secret db-credentials -n claims -o yaml | oc neat-like cleanup (drop metadata.namespace, uid, resourceVersion) | oc apply -n claims-canary -f -, or oc create secret generic db-credentials -n claims-canary --from-literal=password=... from the vault. Then ask whether a canary should use production credentials at all; usually it gets its own."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- deploy apps 11%
    {
      slug: "helm-and-template-deploy",
      objective:
        "Deploy applications from OpenShift templates with oc process and oc new-app, and from Helm charts with helm install and upgrade",
      kind: "build",
      title: "Deploy the same application from a template and from a chart",
      brief:
        "The fictional logistics firm Penrose Freight has a legacy OpenShift Template for its tracking service and a newer Helm chart for the same thing. Deploy the template into project tracking-legacy with parameters, deploy the chart into tracking with custom values, upgrade the chart release, and show how each is managed afterwards.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Show the template workflow (parameters, process, apply, new-app), the Helm workflow (install, values, upgrade, rollback), and compare how changes are managed.",
          parts: [
            part(
              "Inspect and process the template",
              "oc process --parameters to list parameters, oc process -f template.yaml -p KEY=VALUE | oc apply -f - (or oc new-app -f template.yaml -p ...), and oc get -l template=... to find what it created; explains templates are expanded once and leave no owner object behind.",
              "$ oc process --parameters -f tracking-template.yaml\nNAME            DESCRIPTION                  GENERATOR  VALUE\nAPP_NAME        Application name                        tracking\nIMAGE_TAG       Image tag to deploy                     latest\nREPLICAS        Number of replicas                      2\nDB_PASSWORD     Database password            expression [a-zA-Z0-9]{16}\n$ oc new-project tracking-legacy\n$ oc process -f tracking-template.yaml -p IMAGE_TAG=3.2 -p REPLICAS=3 | oc apply -f -\nsecret/tracking-db created\ndeployment.apps/tracking created\nservice/tracking created\nroute.route.openshift.io/tracking created\noc new-app -f tracking-template.yaml -p IMAGE_TAG=3.2 does the same in one step and labels the objects app=tracking. A template is a one-time expansion: after processing there is no 'release' object; the resulting resources are ordinary and are changed with oc apply or oc edit."
            ),
            part(
              "Install the chart",
              "helm repo add / helm show values, a values file, helm install with --namespace and --create-namespace, and helm list/status; notes the chart must produce OpenShift-friendly manifests (no fixed uid, Route or Ingress).",
              "$ helm repo add penrose https://charts.penrose.example && helm repo update\n$ helm show values penrose/tracking > values.yaml   # edit: replicaCount: 3, image.tag: \"3.2\", route.host: tracking.penrose.example\n$ helm install tracking penrose/tracking -n tracking --create-namespace -f values.yaml\nNAME: tracking\nNAMESPACE: tracking\nSTATUS: deployed\nREVISION: 1\n$ helm list -n tracking\nNAME      NAMESPACE  REVISION  STATUS    CHART           APP VERSION\ntracking  tracking   1         deployed  tracking-1.4.0  3.2\n$ oc get all -n tracking -l app.kubernetes.io/instance=tracking\nOn OpenShift the chart must not hard-code runAsUser (restricted-v2 assigns a uid) and should render a Route or an Ingress the router can adopt; check with helm template before installing."
            ),
            part(
              "Upgrade and rollback",
              "helm upgrade with --set or a changed values file, helm history, helm rollback to a revision, and --atomic/--wait for safer upgrades; explains Helm stores release state in Secrets in the namespace.",
              "$ helm upgrade tracking penrose/tracking -n tracking -f values.yaml --set image.tag=3.3 --atomic --wait\nRelease \"tracking\" has been upgraded. Happy Helming!\nREVISION: 2\n$ helm history tracking -n tracking\nREVISION  STATUS      CHART           DESCRIPTION\n1         superseded  tracking-1.4.0  Install complete\n2         deployed    tracking-1.4.0  Upgrade complete\n$ helm rollback tracking 1 -n tracking\nRollback was a success! Happy Helming!\n--atomic rolls back automatically if the upgrade fails to become ready within the wait. Helm keeps each revision's manifest in a Secret (sh.helm.release.v1.tracking.v2) in the namespace, which is what history and rollback read."
            ),
            part(
              "Managing afterwards",
              "Template-created resources are edited directly (oc set image, oc scale, oc apply of re-processed output) with no record of the parameters used; Helm tracks the release and values (helm get values), so changes go through upgrade; recommends keeping values files (and processed template output) in Git for both.",
              "Template: changes are direct -- oc set image deploy/tracking tracking=...:3.3 -n tracking-legacy or re-process with new parameters and oc apply; nothing records which parameters were used, so keep the oc process command and its output in Git. Helm: the release remembers its chart version and values (helm get values tracking -n tracking), every change is an upgrade with a revision, and rollback is one command. For both, the real source of truth should be a Git repository -- and on this platform that means handing them to Argo CD (which renders both Helm charts and plain manifests) rather than running helm and oc by hand on production."
            ),
          ],
        },
      ],
    },
    {
      slug: "service-with-no-endpoints",
      objective: "Apply labels and selectors to connect Services, Deployments and Routes and to organize resources",
      kind: "case",
      title: "A Route returns 503 after a label clean-up",
      brief:
        "After a 'label tidy-up' in project shop at the fictional retailer Ellery & Finch, the storefront Route returns 'Application is not available'. Nothing was deleted. Find the break from the oc output.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ curl -sI https://storefront-shop.apps.ellery.example | head -1\nHTTP/1.1 503 Service Unavailable\n$ oc get route storefront -n shop -o jsonpath='{.spec.to.name} {.spec.port.targetPort}{\"\\n\"}'\nstorefront http\n$ oc get svc storefront -n shop -o yaml | grep -A4 '^spec:' \nspec:\n  ports:\n  - name: http\n    port: 8080\n    targetPort: 8080\n$ oc get svc storefront -n shop -o jsonpath='{.spec.selector}{\"\\n\"}'\n{\"app\":\"storefront\",\"tier\":\"web\"}\n$ oc get endpoints storefront -n shop\nNAME         ENDPOINTS   AGE\nstorefront   <none>      210d\n$ oc get pods -n shop --show-labels | grep storefront\nstorefront-5f6d7c8b9-abcde   1/1   Running   0   20m   app=storefront,component=web,pod-template-hash=5f6d7c8b9\nstorefront-5f6d7c8b9-fghij   1/1   Running   0   20m   app=storefront,component=web,pod-template-hash=5f6d7c8b9\n$ oc get deploy storefront -n shop -o jsonpath='{.spec.selector.matchLabels} {.spec.template.metadata.labels}{\"\\n\"}'\n{\"app\":\"storefront\"} {\"app\":\"storefront\",\"component\":\"web\"}",
          ask: "Explain the failure and fix it with the least disruption.",
          parts: [
            part(
              "Selector mismatch",
              "The Service selects app=storefront AND tier=web, but the tidy-up renamed the pod label tier to component; the Service matches no pods, so its Endpoints are empty and the router returns 503; Route -> Service -> Endpoints -> Pods is the chain, and labels are the joins.",
              "A Route sends traffic to a Service; the Service forwards to the pods whose labels match all of its selector; the match is materialized as Endpoints (EndpointSlices). Here the Service wants app=storefront and tier=web, but the pods now carry component=web -- the tidy-up renamed the key in the Deployment's pod template. No pod matches, Endpoints is <none>, and the router has nowhere to send the request: 503 'Application is not available'. The pods are healthy; the join is broken."
            ),
            part(
              "Least-disruptive fix",
              "Change the Service's selector to the new label (oc patch svc) rather than re-labeling pods or rolling the Deployment; verify Endpoints populate and the Route returns 200; note the Deployment's own selector (app only) still matches so no new ReplicaSet was needed.",
              "$ oc patch svc storefront -n shop --type merge -p '{\"spec\":{\"selector\":{\"app\":\"storefront\",\"component\":\"web\"}}}'\nservice/storefront patched\n$ oc get endpoints storefront -n shop\nNAME         ENDPOINTS                            AGE\nstorefront   10.128.2.14:8080,10.131.0.22:8080    210d\n$ curl -sI https://storefront-shop.apps.ellery.example | head -1\nHTTP/1.1 200 OK\nEditing the Service is instant and touches no pods. The Deployment's selector (app=storefront) still matches its pods, which is why the tidy-up rolled new pods without error -- Deployment selectors are immutable, so had they changed that key, the apply would have failed."
            ),
            part(
              "Preventing it",
              "Keep one consistent label set (app.kubernetes.io/name, instance, component) across Deployment selector, pod template, Service selector and Route; use oc get endpoints or oc describe svc as the first check for a 503; oc get all -l app=... to see the whole set; labels in a Kustomize base so they cannot drift.",
              "Standardize on the recommended labels (app.kubernetes.io/name=storefront, app.kubernetes.io/component=web, app.kubernetes.io/instance=shop) and set them once in the Kustomize base so Deployment selector, pod template and Service selector are generated together. First check for any 503: oc get endpoints <svc> -- empty means a selector or readiness problem, not a router problem. oc get all -l app.kubernetes.io/name=storefront shows the whole application as one set."
            ),
          ],
        },
        {
          text: "Later the same day the Route returns 503 again. This time Endpoints shows two addresses and the pods are 0/1 Running.",
          ask: "Diagnose this variant.",
          parts: [
            part(
              "Readiness",
              "0/1 Running means the readiness probe is failing: pods appear in Endpoints only when Ready (the output shown may be notReadyAddresses in describe), the Service has no ready endpoints, so 503; check oc describe pod for Unhealthy events and the probe path/port; fix the probe or the app.",
              "$ oc describe pod storefront-5f6d7c8b9-abcde -n shop | grep -A3 Readiness\n  Warning  Unhealthy  Readiness probe failed: HTTP probe failed with statuscode: 500\n$ oc describe endpoints storefront -n shop | grep -A2 NotReadyAddresses\nA pod is added to a Service's ready endpoints only while its readiness probe passes; 0/1 means the container runs but is not ready, so the router again has no ready backend. Here /readyz returns 500 -- the app's dependency check is failing (database or cache), or the probe points at the wrong path or port after the latest change. Fix the cause the probe reveals; do not remove the probe to 'make it green'."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- auth 9%
    {
      slug: "htpasswd-identity-provider",
      objective: "Configure the HTPasswd identity provider for authentication in the OAuth cluster resource with a Secret in openshift-config",
      kind: "build",
      title: "Configure HTPasswd authentication with two users",
      brief:
        "A new OpenShift cluster at the fictional engineering firm Coltrane Works has only kubeadmin. Configure an HTPasswd identity provider with users 'alice' (to become a cluster administrator) and 'bob' (a developer), verify both can log in, then update bob's password and remove kubeadmin safely.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Create the htpasswd file and Secret, configure the OAuth resource, grant roles, log in as each user, then change a password and remove kubeadmin -- with the checks at each step.",
          parts: [
            part(
              "htpasswd file and Secret",
              "htpasswd -c -B -b to create the file with bcrypt, add a second user, create a Secret from the file in openshift-config with key htpasswd; explains the Secret must be in openshift-config for the OAuth operator to read it.",
              "$ htpasswd -c -B -b users.htpasswd alice 'Al1ce-Temp#2026'\nAdding password for user alice\n$ htpasswd -B -b users.htpasswd bob 'B0b-Temp#2026'\nAdding password for user bob\n$ oc create secret generic htpasswd-secret --from-file=htpasswd=users.htpasswd -n openshift-config\nsecret/htpasswd-secret created\nThe key must be named htpasswd and the Secret must live in openshift-config -- that is where the authentication operator looks. -B uses bcrypt; keep users.htpasswd out of Git, or regenerate it from the Secret when needed (oc extract secret/htpasswd-secret -n openshift-config --to=-)."
            ),
            part(
              "OAuth configuration",
              "oc edit oauth cluster (or apply YAML) adding an identityProviders entry of type HTPasswd with mappingMethod claim and fileData.name pointing at the Secret; watch the authentication operator and oauth-openshift pods roll; explains that multiple identity providers can coexist.",
              "apiVersion: config.openshift.io/v1\nkind: OAuth\nmetadata: {name: cluster}\nspec:\n  identityProviders:\n  - name: local-htpasswd\n    mappingMethod: claim\n    type: HTPasswd\n    htpasswd:\n      fileData: {name: htpasswd-secret}\n$ oc apply -f oauth.yaml\n$ oc get pods -n openshift-authentication -w   # oauth-openshift pods roll to pick up the change\n$ oc get co authentication\nNAME             VERSION   AVAILABLE   PROGRESSING   DEGRADED\nauthentication   4.22.3    True        False         False\nThe name becomes the provider shown on the login page; mappingMethod claim creates a User on first login and refuses a second identity claiming the same username."
            ),
            part(
              "Roles and first logins",
              "Log in as alice and bob with oc login to create their User and Identity objects, then oc adm policy add-cluster-role-to-user cluster-admin alice (as kubeadmin) and oc adm policy add-role-to-user edit bob -n <project>; verify with oc whoami and oc auth can-i.",
              "$ oc login -u alice -p 'Al1ce-Temp#2026' https://api.coltrane.example:6443\nLogin successful.\n$ oc login -u bob -p 'B0b-Temp#2026' https://api.coltrane.example:6443\n$ oc get users\nNAME    UID    FULL NAME   IDENTITIES\nalice   ...                local-htpasswd:alice\nbob     ...                local-htpasswd:bob\n# as kubeadmin:\n$ oc adm policy add-cluster-role-to-user cluster-admin alice\n$ oc new-project dev-bob && oc adm policy add-role-to-user edit bob -n dev-bob\n$ oc login -u alice ... && oc auth can-i '*' '*'\nyes\n$ oc login -u bob ... && oc auth can-i delete nodes\nno\nUsers and Identities appear on first login; roles can also be granted before that by name."
            ),
            part(
              "Change a password and remove kubeadmin",
              "Update the htpasswd file (oc extract to get the current one), htpasswd -B -b for the new password, oc set data secret/htpasswd-secret --from-file; wait for the oauth pods; then -- only after confirming alice has cluster-admin and can log in -- oc delete secret kubeadmin -n kube-system; explains that deleting kubeadmin is irreversible.",
              "$ oc extract secret/htpasswd-secret -n openshift-config --to=. --confirm\nhtpasswd\n$ htpasswd -B -b htpasswd bob 'B0b-N3w#Pass'\n$ oc set data secret/htpasswd-secret --from-file=htpasswd=htpasswd -n openshift-config\nsecret/htpasswd-secret data updated\n$ oc get pods -n openshift-authentication    # wait for the restart, ~1-2 minutes\n$ oc login -u bob -p 'B0b-N3w#Pass' ...\nLogin successful.\nTo remove a user entirely: htpasswd -D, update the Secret, then oc delete user <name> and oc delete identity local-htpasswd:<name>. Finally, with alice confirmed as cluster-admin in a separate terminal: oc delete secret kubeadmin -n kube-system. This cannot be undone -- never run it before another cluster-admin login has been verified."
            ),
          ],
        },
      ],
    },
    {
      slug: "rbac-groups-and-self-provisioning",
      objective: "Modify user and group permissions with oc adm policy, cluster roles and project roles, and remove self-provisioning where required",
      kind: "case",
      title: "Developers can create projects they should not, and an auditor cannot read",
      brief:
        "At the fictional bank Thurlow Capital, any logged-in user can create projects, a developer accidentally deleted another team's Deployment, and the auditor account cannot see anything. Fix the permission model with groups and roles.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ oc get clusterrolebinding self-provisioners -o jsonpath='{.subjects}{\"\\n\"}'\n[{\"apiGroup\":\"rbac.authorization.k8s.io\",\"kind\":\"Group\",\"name\":\"system:authenticated:oauth\"}]\n$ oc get rolebindings -n payments -o wide | grep -v '^NAME'\nadmin             ClusterRole/admin   10d   dev-sam, dev-lee, dev-kim\nsystem:deployers  ...\n$ oc auth can-i delete deployments -n payments --as dev-kim\nyes\n$ oc auth can-i list pods -A --as auditor\nno\n$ oc get groups\nNo resources found",
          ask: "Explain each problem and fix it with groups and the right roles.",
          parts: [
            part(
              "Self-provisioning",
              "The self-provisioners ClusterRoleBinding grants the self-provisioner role to every authenticated user; remove the group from the binding and stop the operator re-adding it with the rbac.authorization.kubernetes.io/autoupdate=false annotation; afterwards only cluster-admins (or users granted self-provisioner) can create projects; oc new-project fails for others with a clear message.",
              "$ oc annotate clusterrolebinding self-provisioners rbac.authorization.kubernetes.io/autoupdate=false --overwrite\n$ oc patch clusterrolebinding self-provisioners -p '{\"subjects\": null}'\n$ oc auth can-i create projectrequests --as dev-kim\nno\nBy default system:authenticated:oauth has the self-provisioner role, so anyone who logs in may create projects. Clearing the binding's subjects removes that; the autoupdate=false annotation stops the cluster from restoring the default on upgrade. Grant the self-provisioner cluster role to a group of team leads if some people should still create projects."
            ),
            part(
              "Project roles via groups",
              "Create groups (oc adm groups new payments-devs dev-sam dev-lee; payments-admins dev-kim), remove the individual admin bindings, bind edit to payments-devs and admin to payments-admins in the project; explains admin vs edit vs view (admin can manage RoleBindings, edit cannot) and that the deletion happened because every developer had admin.",
              "$ oc adm groups new payments-devs dev-sam dev-lee\n$ oc adm groups new payments-admins dev-kim\n$ oc adm policy remove-role-from-user admin dev-sam dev-lee dev-kim -n payments\n$ oc adm policy add-role-to-group edit payments-devs -n payments\n$ oc adm policy add-role-to-group admin payments-admins -n payments\n$ oc get rolebindings -n payments -o wide | grep -E 'edit|admin'\nedit   ClusterRole/edit    payments-devs\nadmin  ClusterRole/admin   payments-admins\nedit lets developers create and delete workloads in their own project only; admin adds managing RoleBindings and quotas in that project. The cross-team deletion happened because developers held admin in a project that was not theirs -- with groups per team and bindings per project, dev-kim has nothing in project treasury."
            ),
            part(
              "Auditor",
              "Bind the built-in cluster-reader ClusterRole to the auditor via a ClusterRoleBinding (oc adm policy add-cluster-role-to-user cluster-reader auditor) for read-only across the cluster, not view per project; verify with oc auth can-i; note cluster-reader cannot read Secrets.",
              "$ oc adm policy add-cluster-role-to-user cluster-reader auditor\n$ oc auth can-i list pods -A --as auditor\nyes\n$ oc auth can-i get secrets -n payments --as auditor\nno\n$ oc auth can-i delete pods -n payments --as auditor\nno\ncluster-reader is the read-everything-except-secrets role meant for exactly this; granting view project by project would miss new projects. If the auditor must read Secrets too, that is a deliberate custom ClusterRole, not an upgrade to cluster-admin."
            ),
            part(
              "Verification and hygiene",
              "oc adm policy who-can delete deployments -n payments, oc describe rolebinding, oc get clusterrolebindings -o wide | grep cluster-admin to review who is cluster-admin; keep bindings in Git; identity-provider groups (LDAP sync) instead of manual groups where possible.",
              "$ oc adm policy who-can delete deployments -n payments\nNamespace: payments\nVerb:      delete\nResource:  deployments.apps\nUsers:  system:admin\n        dev-kim\nGroups: payments-admins\n        payments-devs\n        system:cluster-admins\n        system:masters\n$ oc get clusterrolebindings -o wide | grep ClusterRole/cluster-admin\nReview the cluster-admin list regularly; put the group and binding manifests in Git so permissions are reviewed like code; and once the LDAP or OIDC provider is in place, sync groups from it (oc adm groups sync) rather than maintaining them by hand."
            ),
          ],
        },
        {
          text: "A developer asks for cluster-admin 'just to install an operator for our team'.",
          ask: "Respond with the least-privilege alternative.",
          parts: [
            part(
              "Least privilege",
              "Operator installation is normally a cluster-admin task; alternatives: the platform team installs it, or grant a scoped permission -- an OperatorGroup in the team's namespace plus a Role allowing Subscriptions/OperatorGroups there (OLM supports namespace-scoped operator installation with a service account on the OperatorGroup); never hand out cluster-admin for a one-off.",
              "Installing an operator usually needs cluster-admin because operators create CRDs and cluster roles -- but that is a reason for the platform team to do it on request, not to give a developer cluster-admin. If the team must self-serve, OLM allows a scoped install: create an OperatorGroup in their namespace with spec.serviceAccountName set to a service account whose Role permits creating Subscriptions and the operator's resources in that namespace; OLM then installs with that account's permissions and refuses anything broader. Cluster-admin granted 'just for today' tends to stay."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- network 15%
    {
      slug: "routes-tls-terminations",
      objective: "Create and edit external Routes: edge, passthrough and re-encrypt termination, hostnames and path routing",
      kind: "build",
      title: "Expose three services with the right TLS termination each",
      brief:
        "The fictional health scheduler Marchbank has three services in project portal: web (plain HTTP on 8080, needs HTTPS for users with a company certificate), api (serves its own TLS on 8443 with a cluster-issued serving certificate and must stay encrypted end to end), and a legacy LDAP-over-TLS tool (TLS on 8636 that must not be terminated by the router). Create the Routes and verify.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Create the edge, re-encrypt and passthrough Routes, explain the choice for each, and show verification including the certificate chain each presents.",
          parts: [
            part(
              "Edge for web",
              "oc create route edge with --cert/--key/--ca-cert for the company certificate, --hostname, and insecure policy Redirect so HTTP is redirected; explains edge terminates TLS at the router and forwards plain HTTP to the pod, suitable when the pod does not speak TLS.",
              "$ oc create route edge web --service=web --port=8080 --hostname=portal.marchbank.example \\\n    --cert=portal.crt --key=portal.key --ca-cert=marchbank-ca.crt --insecure-policy=Redirect -n portal\nroute.route.openshift.io/web created\nEdge termination: the router presents the company certificate, decrypts, and forwards HTTP to the pod on 8080 inside the cluster network. --insecure-policy=Redirect sends http:// requests to https://. Omit --cert to use the ingress controller's default wildcard certificate instead."
            ),
            part(
              "Re-encrypt for api",
              "oc create route reencrypt with --dest-ca-cert so the router trusts the pod's serving certificate (the service-ca if the certificate came from the service.beta.openshift.io/serving-cert-secret-name annotation -- then --dest-ca-cert can be omitted because the router trusts service-ca by default); explains traffic is TLS to the router and TLS again to the pod.",
              "$ oc annotate svc api service.beta.openshift.io/serving-cert-secret-name=api-tls -n portal   # cluster issues a cert for api.portal.svc\n$ oc create route reencrypt api --service=api --port=8443 --hostname=api.marchbank.example -n portal\nroute.route.openshift.io/api created\nRe-encrypt: the client's TLS ends at the router (company or default certificate), and the router opens a second TLS connection to the pod on 8443, verifying the pod's certificate. Because the serving certificate was issued by the cluster's service CA, the router already trusts it and --dest-ca-cert is unnecessary; for a pod certificate from another CA, pass that CA with --dest-ca-cert. Traffic is encrypted on both hops."
            ),
            part(
              "Passthrough for the LDAP tool",
              "oc create route passthrough with --port and hostname; the router forwards the TLS stream by SNI without decrypting, so the pod's own certificate is what clients see and path-based routing is impossible; explains SNI is required for passthrough.",
              "$ oc create route passthrough ldap-tool --service=ldap-tool --port=8636 --hostname=ldap-tool.marchbank.example -n portal\nroute.route.openshift.io/ldap-tool created\nPassthrough: the router reads only the SNI name in the TLS ClientHello to pick the backend and forwards the encrypted bytes untouched -- the pod terminates TLS with its own certificate. Because the router never sees HTTP, there is no path routing, no header insertion and no HTTP redirect for passthrough routes. Clients must send SNI (any modern TLS client does)."
            ),
            part(
              "Verify",
              "oc get routes showing termination types; openssl s_client -servername for each hostname to see which certificate is presented (company cert for edge/reencrypt, pod cert for passthrough); curl for the redirect; path-based routing example with --path for a second edge route on the same host.",
              "$ oc get routes -n portal -o custom-columns=NAME:.metadata.name,HOST:.spec.host,TLS:.spec.tls.termination,PORT:.spec.port.targetPort\nNAME       HOST                            TLS          PORT\nweb        portal.marchbank.example        edge         8080\napi        api.marchbank.example           reencrypt    8443\nldap-tool  ldap-tool.marchbank.example     passthrough  8636\n$ openssl s_client -connect ldap-tool.marchbank.example:443 -servername ldap-tool.marchbank.example </dev/null 2>/dev/null | openssl x509 -noout -subject\nsubject=CN = ldap-tool.portal.svc        # the pod's own certificate: passthrough confirmed\n$ curl -sI http://portal.marchbank.example | head -1\nHTTP/1.1 302 Found\nPath routing on the same host: oc create route edge web-docs --service=docs --hostname=portal.marchbank.example --path=/docs -n portal -- the router matches the longest path first."
            ),
          ],
        },
      ],
    },
    {
      slug: "networkpolicy-locks-out-router",
      objective: "Configure application NetworkPolicies, including default deny and allowing the ingress controller and monitoring",
      kind: "case",
      title: "A default-deny policy took the application offline",
      brief:
        "The security team at the fictional retailer Danbury Home applied a default-deny NetworkPolicy to project orders. The Route now returns 503, Prometheus shows the targets down, and the orders-api cannot reach its database in project orders-db. Repair the policies.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ oc get networkpolicy -n orders\nNAME           POD-SELECTOR   AGE\ndeny-all       <none>         25m\n$ oc get networkpolicy deny-all -n orders -o yaml | yq '.spec'\npodSelector: {}\npolicyTypes: [Ingress, Egress]\n$ oc get endpoints orders-api -n orders\nNAME         ENDPOINTS                        AGE\norders-api   10.128.4.11:8080,10.131.2.9:8080 90d\n$ curl -sI https://orders-danbury.apps.danbury.example | head -1\nHTTP/1.1 503 Service Unavailable\n$ oc get ns openshift-ingress --show-labels | tail -1\nopenshift-ingress   Active   300d   kubernetes.io/metadata.name=openshift-ingress,network.openshift.io/policy-group=ingress,...\n$ oc get ns openshift-monitoring --show-labels | tail -1\nopenshift-monitoring   Active   300d   kubernetes.io/metadata.name=openshift-monitoring,network.openshift.io/policy-group=monitoring,...\n$ oc get ns orders-db --show-labels | tail -1\norders-db   Active   90d   kubernetes.io/metadata.name=orders-db\n$ oc logs deploy/orders-api -n orders | tail -1\ndial tcp 172.30.44.7:5432: i/o timeout",
          ask: "Explain the three breakages and write the policies that restore service while keeping default deny.",
          parts: [
            part(
              "What the deny policy did",
              "An empty podSelector with both policyTypes isolates every pod in the project for ingress and egress; the router pods (openshift-ingress) can no longer reach the pods, hence 503 even though Endpoints are fine; Prometheus (openshift-monitoring) cannot scrape; and egress deny blocks orders-api's connection to the database and even DNS.",
              "deny-all selects every pod and declares both Ingress and Egress policy types with no rules, so nothing may enter or leave any pod in orders. Three consequences: the HAProxy router in openshift-ingress can no longer connect to orders-api -- Endpoints are populated but unreachable, so 503; Prometheus in openshift-monitoring cannot scrape /metrics -- targets down; and orders-api cannot open connections to orders-db (timeout, not refused -- packets are dropped) or, for that matter, resolve DNS."
            ),
            part(
              "Allow the router and monitoring",
              "Ingress policies selecting from the openshift-ingress namespace via the network.openshift.io/policy-group=ingress label (the OpenShift-provided label), and from openshift-monitoring via policy-group=monitoring, scoped to the ports needed; explains why namespaceSelector on these labels is the documented pattern.",
              "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: allow-from-openshift-ingress, namespace: orders}\nspec:\n  podSelector: {}\n  policyTypes: [Ingress]\n  ingress:\n  - from:\n    - namespaceSelector:\n        matchLabels: {network.openshift.io/policy-group: ingress}\n---\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: allow-from-openshift-monitoring, namespace: orders}\nspec:\n  podSelector: {}\n  policyTypes: [Ingress]\n  ingress:\n  - from:\n    - namespaceSelector:\n        matchLabels: {network.openshift.io/policy-group: monitoring}\n    ports: [{protocol: TCP, port: 8080}]\nOpenShift labels these namespaces with network.openshift.io/policy-group so policies can refer to them stably; policies are additive, so these allowances sit alongside deny-all. (With the default HostNetwork endpoint publishing strategy on some platforms the router is on the host network and the policy-group=ingress label is applied to the default namespace instead -- check which applies.)"
            ),
            part(
              "Egress to the database and DNS",
              "An egress policy for pods labeled app=orders-api to the orders-db namespace on 5432, plus egress to DNS (openshift-dns namespace, port 5353 UDP/TCP -- OpenShift's CoreDNS listens on 5353) for all pods; explains that once Egress is in policyTypes, DNS must be explicitly allowed.",
              "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: allow-egress-db-and-dns, namespace: orders}\nspec:\n  podSelector: {}\n  policyTypes: [Egress]\n  egress:\n  - to:\n    - namespaceSelector:\n        matchLabels: {kubernetes.io/metadata.name: openshift-dns}\n    ports: [{protocol: UDP, port: 5353}, {protocol: TCP, port: 5353}]\n  - to:\n    - namespaceSelector:\n        matchLabels: {kubernetes.io/metadata.name: orders-db}\n      podSelector:\n        matchLabels: {app: postgres}\n    ports: [{protocol: TCP, port: 5432}]\nOpenShift's DNS pods listen on 5353 (the Service maps 53 to it), so egress rules must allow 5353 to openshift-dns or every name lookup fails. The database rule names both the namespace and the pod label -- the tightest form. A matching ingress policy is also needed in orders-db allowing from orders."
            ),
            part(
              "Verify",
              "curl the Route (200), oc rsh to test the database connection, Prometheus targets up; oc describe networkpolicy; a negative test from a third namespace shows traffic still blocked.",
              "$ oc apply -f policies/ -n orders\n$ curl -sI https://orders-danbury.apps.danbury.example | head -1\nHTTP/1.1 200 OK\n$ oc rsh -n orders deploy/orders-api sh -c 'nc -zv postgres.orders-db.svc 5432'\npostgres.orders-db.svc (172.30.44.7:5432) open\n$ oc rsh -n marketing deploy/newsletter sh -c 'nc -zv -w 3 orders-api.orders.svc 8080'\nnc: connect to orders-api.orders.svc (172.30.12.3) port 8080 (tcp) timed out\nThe last line is the point: default deny still holds for everyone not explicitly allowed. In the console, Observe > Targets shows orders-api up again."
            ),
          ],
        },
        {
          text: "The security team asks for the same protection in every new project automatically.",
          ask: "Explain how to make it the default.",
          parts: [
            part(
              "Project template",
              "Create a project request template (oc adm create-bootstrap-project-template) that includes deny-all, allow-from-openshift-ingress, allow-from-openshift-monitoring and the DNS egress policy, create it in openshift-config and reference it in the Project cluster resource's spec.projectRequestTemplate; every new project then starts isolated-but-working.",
              "$ oc adm create-bootstrap-project-template -o yaml > project-template.yaml\n# append the four NetworkPolicy objects to .objects (with namespace ${PROJECT_NAME})\n$ oc create -f project-template.yaml -n openshift-config\n$ oc patch project.config.openshift.io cluster --type merge -p '{\"spec\":{\"projectRequestTemplate\":{\"name\":\"project-request\"}}}'\n$ oc new-project smoke && oc get networkpolicy -n smoke\nNAME                              POD-SELECTOR   AGE\nallow-egress-dns                  <none>         3s\nallow-from-openshift-ingress      <none>         3s\nallow-from-openshift-monitoring   <none>         3s\ndeny-all                          <none>         3s\nThe API server (openshift-apiserver pods restart to pick up the template) now stamps the policies into every project at creation; teams add their own allow rules on top."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- self-service 9%
    {
      slug: "quotas-limits-and-project-template",
      objective:
        "Configure project templates so every new project is created with the quota, limit range and network policies the platform requires",
      kind: "build",
      title: "Make every new project arrive with quotas and limits",
      brief:
        "The fictional university Ravenscroft shares one OpenShift cluster across departments. Platform policy: every project gets a ResourceQuota (4 CPU / 8Gi requests, 8 CPU / 16Gi limits, 20 pods, 10 PVCs), a LimitRange with container defaults, and the ClusterResourceQuota for the 'research' departments caps them collectively at 40 CPU. Implement it so it applies automatically.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the ResourceQuota and LimitRange, put them into the project request template, create the ClusterResourceQuota, and verify the behavior a developer sees.",
          parts: [
            part(
              "ResourceQuota and LimitRange",
              "A ResourceQuota with requests.cpu/memory, limits.cpu/memory, pods and persistentvolumeclaims; a LimitRange with container default and defaultRequest plus max, so pods without resources are accepted with defaults; explains quota rejects pods lacking requests unless defaults exist.",
              "apiVersion: v1\nkind: ResourceQuota\nmetadata: {name: project-quota}\nspec:\n  hard:\n    requests.cpu: \"4\"\n    requests.memory: 8Gi\n    limits.cpu: \"8\"\n    limits.memory: 16Gi\n    pods: \"20\"\n    persistentvolumeclaims: \"10\"\n---\napiVersion: v1\nkind: LimitRange\nmetadata: {name: project-limits}\nspec:\n  limits:\n  - type: Container\n    defaultRequest: {cpu: 100m, memory: 128Mi}\n    default: {cpu: 500m, memory: 512Mi}\n    max: {cpu: \"2\", memory: 4Gi}\n  - type: PersistentVolumeClaim\n    max: {storage: 50Gi}\nOnce a quota covers CPU and memory, any pod without requests/limits is rejected -- the LimitRange's defaults make ordinary oc new-app deployments admissible, and max keeps one container from taking half the project."
            ),
            part(
              "Project request template",
              "Generate the bootstrap template, add the ResourceQuota and LimitRange (and the standard NetworkPolicies) to its objects with namespace: ${PROJECT_NAME}, create it in openshift-config and set it on the Project config resource; explains the template is applied by the API server at oc new-project time only -- existing projects need the objects applied separately.",
              "$ oc adm create-bootstrap-project-template -o yaml > template.yaml\n# in template.yaml, under objects:, add the ResourceQuota and LimitRange with\n#   metadata: {name: project-quota, namespace: ${PROJECT_NAME}}\n$ oc create -f template.yaml -n openshift-config\n$ oc patch project.config.openshift.io cluster --type merge -p '{\"spec\":{\"projectRequestTemplate\":{\"name\":\"project-request\"}}}'\n$ oc get pods -n openshift-apiserver -w    # pods restart with the new template\nThe template runs when a user requests a project; it does not retrofit existing ones -- loop over those with oc apply -f quota.yaml -n <project>. Parameters like ${PROJECT_NAME}, ${PROJECT_ADMIN_USER} are filled by the request."
            ),
            part(
              "ClusterResourceQuota",
              "A ClusterResourceQuota selecting projects by label (department=research) or by owner annotation, with hard requests.cpu 40; explains it is a cluster-scoped object visible to project admins as AppliedClusterResourceQuota, and that project quotas and cluster quotas both apply (the stricter wins).",
              "apiVersion: quota.openshift.io/v1\nkind: ClusterResourceQuota\nmetadata: {name: research-departments}\nspec:\n  selector:\n    labels:\n      matchLabels: {department: research}\n  quota:\n    hard:\n      requests.cpu: \"40\"\n      requests.memory: 80Gi\n$ oc label namespace physics-lab chem-lab department=research\n$ oc describe clusterresourcequota research-departments\nName:     research-departments\nNamespace Selector: [\"physics-lab\" \"chem-lab\"]\nResource         Used   Hard\nrequests.cpu     11     40\nBoth quotas are enforced: a pod must fit its project's quota and the shared research quota. Inside a project, oc get appliedclusterresourcequota shows developers how much of the shared pool remains."
            ),
            part(
              "What a developer sees",
              "oc new-project creates the objects; oc describe quota shows usage; a pod with no resources gets defaults (shown in the pod spec); a Deployment exceeding the quota shows the error in the ReplicaSet's events, not the Deployment; oc get events for 'exceeded quota'.",
              "$ oc new-project physics-lab\n$ oc get quota,limitrange -n physics-lab\nNAME                          AGE   REQUEST                                     LIMIT\nresourcequota/project-quota   5s    pods: 0/20, requests.cpu: 0/4, ...          limits.cpu: 0/8, ...\nNAME                         AGE\nlimitrange/project-limits    5s\n$ oc create deploy sim --image=registry.ravenscroft.example/sim:1.0 --replicas=30 -n physics-lab\n$ oc get deploy sim -n physics-lab\nNAME   READY   UP-TO-DATE   AVAILABLE\nsim    20/30   20           20\n$ oc get events -n physics-lab | grep -m1 'exceeded quota'\nWarning  FailedCreate  replicaset/sim-6b9d8  Error creating: pods \"sim-6b9d8-x2k4l\" is forbidden: exceeded quota: project-quota, requested: pods=1, used: pods=20, limited: pods=20\n$ oc get pod -n physics-lab -l app=sim -o jsonpath='{.items[0].spec.containers[0].resources}{\"\\n\"}'\n{\"limits\":{\"cpu\":\"500m\",\"memory\":\"512Mi\"},\"requests\":{\"cpu\":\"100m\",\"memory\":\"128Mi\"}}\nThe quota error lives on the ReplicaSet's events -- the Deployment just shows fewer ready replicas."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- operators 6%
    {
      slug: "install-operator-with-olm",
      objective:
        "Install an operator from OperatorHub with the console or a Subscription and OperatorGroup, choosing namespace, channel and approval strategy",
      kind: "build",
      title: "Install, verify and remove an operator with OLM",
      brief:
        "The fictional media firm Holloway Studios needs the cert-manager Operator for Red Hat OpenShift installed cluster-wide with manual update approval, and later wants a team-scoped operator removed cleanly. Do it with manifests rather than clicks so it can be repeated.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Find the package and channel, write the Namespace, OperatorGroup and Subscription, approve the InstallPlan, verify, and then show a clean uninstall of a namespace-scoped operator.",
          parts: [
            part(
              "Discover the package",
              "oc get packagemanifests to find the package, oc describe packagemanifest for channels, default channel and install modes (AllNamespaces vs OwnNamespace), and the catalog source it comes from.",
              "$ oc get packagemanifests -n openshift-marketplace | grep -i cert-manager\nopenshift-cert-manager-operator   Red Hat Operators   180d\n$ oc describe packagemanifest openshift-cert-manager-operator -n openshift-marketplace | grep -E 'Default Channel|^\\s+Name:|Install Modes' -A0 | head\n  Default Channel: stable-v1\n  Install Modes: ... Type: AllNamespaces Supported: true ... Type: OwnNamespace Supported: false\nThe package manifest tells you the catalog (redhat-operators), the channels, and which install modes the operator supports -- cert-manager is cluster-wide (AllNamespaces), so the OperatorGroup must not restrict target namespaces."
            ),
            part(
              "Namespace, OperatorGroup, Subscription",
              "A Namespace (cert-manager-operator), an OperatorGroup with no targetNamespaces (AllNamespaces), and a Subscription naming channel, package, source, sourceNamespace and installPlanApproval Manual; explains one OperatorGroup per namespace and what approval strategies mean.",
              "apiVersion: v1\nkind: Namespace\nmetadata: {name: cert-manager-operator}\n---\napiVersion: operators.coreos.com/v1\nkind: OperatorGroup\nmetadata: {name: cert-manager-operator, namespace: cert-manager-operator}\nspec: {}                      # empty = AllNamespaces\n---\napiVersion: operators.coreos.com/v1alpha1\nkind: Subscription\nmetadata: {name: openshift-cert-manager-operator, namespace: cert-manager-operator}\nspec:\n  channel: stable-v1\n  name: openshift-cert-manager-operator\n  source: redhat-operators\n  sourceNamespace: openshift-marketplace\n  installPlanApproval: Manual\nExactly one OperatorGroup per namespace; its targetNamespaces define where the operator watches (empty for cluster-wide, the namespace itself for OwnNamespace). Manual approval means every install and upgrade waits for a human to approve the InstallPlan; Automatic applies updates as the channel publishes them."
            ),
            part(
              "Approve and verify",
              "oc get installplan showing APPROVED false, oc patch to approve, then watch the ClusterServiceVersion reach Succeeded and the operator Deployment run; oc get csv -n <ns>; check the operator's CRDs exist.",
              "$ oc apply -f cert-manager-olm.yaml\n$ oc get installplan -n cert-manager-operator\nNAME            CSV                                     APPROVAL   APPROVED\ninstall-7h2kq   cert-manager-operator.v1.15.1           Manual     false\n$ oc patch installplan install-7h2kq -n cert-manager-operator --type merge -p '{\"spec\":{\"approved\":true}}'\n$ oc get csv -n cert-manager-operator -w\nNAME                              DISPLAY                                       VERSION   PHASE\ncert-manager-operator.v1.15.1     cert-manager Operator for Red Hat OpenShift   1.15.1    Installing\ncert-manager-operator.v1.15.1     cert-manager Operator for Red Hat OpenShift   1.15.1    Succeeded\n$ oc get crd | grep cert-manager.io | head -3\ncertificates.cert-manager.io\nclusterissuers.cert-manager.io\nissuers.cert-manager.io\n$ oc get pods -n cert-manager\nNAME                                       READY   STATUS\ncert-manager-7c9f8d6b5-2lkpq               1/1     Running\n...\nA Succeeded CSV with running operand pods is 'installed'. For AllNamespaces operators a copied CSV appears in every namespace -- that is OLM's visibility mechanism, not duplication."
            ),
            part(
              "Clean uninstall of a namespace-scoped operator",
              "For a team operator in project data-tools: delete the Subscription, then the CSV (deleting the Subscription alone leaves the operator running), then decide about operands and CRDs -- deleting CRDs deletes every custom resource of that type cluster-wide; finally the OperatorGroup; explains the order and the trap.",
              "$ oc get sub,csv -n data-tools\nNAME                                        PACKAGE               SOURCE               CHANNEL\nsubscription.operators.coreos.com/pg-op     postgresql-operator   community-operators  v5\nNAME                                             VERSION   PHASE\nclusterserviceversion.../postgresoperator.v5.6.0 5.6.0     Succeeded\n$ oc delete subscription pg-op -n data-tools\n$ oc delete csv postgresoperator.v5.6.0 -n data-tools      # this removes the operator Deployment\n$ oc get postgresclusters -A                                 # operands remain; decide with the team\n$ oc delete crd postgresclusters.postgres-operator.crunchydata.com   # ONLY if no instances must survive\n$ oc delete operatorgroup data-tools -n data-tools\nDeleting the Subscription stops updates but leaves the installed version running; the CSV is what owns the operator Deployment. Custom resources (the databases) stay until deleted -- and deleting the CRD deletes all of them everywhere, so that step is deliberate and last."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------- app security 18%
    {
      slug: "scc-for-a-root-image",
      objective:
        "Manage and apply permissions using security context constraints: restricted-v2, anyuid, nonroot and custom SCCs with oc adm policy who-can and scc-subject-review",
      kind: "case",
      title: "A vendor image will not start under restricted-v2",
      brief:
        "A vendor appliance image at the fictional insurer Grafton Life must run as uid 0 and bind port 80. Under OpenShift's default SCC it crash-loops. Determine the minimum SCC change and apply it to the workload, not the whole project.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ oc get pod -n appliance -l app=vendor-gw\nNAME                         READY   STATUS             RESTARTS\nvendor-gw-6d7f8c9b5-k2l9p    0/1     CrashLoopBackOff   6\n$ oc logs vendor-gw-6d7f8c9b5-k2l9p -n appliance | tail -2\nnginx: [emerg] bind() to 0.0.0.0:80 failed (13: Permission denied)\nnginx: [emerg] open() \"/var/run/nginx.pid\" failed (13: Permission denied)\n$ oc get pod vendor-gw-6d7f8c9b5-k2l9p -n appliance -o jsonpath='{.metadata.annotations.openshift\\.io/scc} uid={.spec.containers[0].securityContext.runAsUser}{\"\\n\"}'\nrestricted-v2 uid=1000760000\n$ oc get deploy vendor-gw -n appliance -o jsonpath='{.spec.template.spec.serviceAccountName}{\"\\n\"}'\n\n$ oc adm policy scc-subject-review -z default -n appliance -f vendor-gw-pod.yaml\nRESOURCE          ALLOWED BY\nPod/vendor-gw     restricted-v2\n$ oc get scc anyuid -o jsonpath='{.runAsUser.type} {.allowPrivilegedContainer} {.allowedCapabilities}{\"\\n\"}'\nRunAsAny false <nil>",
          ask: "Explain why it fails, choose the least-privileged SCC and apply it through a dedicated service account.",
          parts: [
            part(
              "Why it fails",
              "restricted-v2 assigns an arbitrary uid from the project's range (1000760000) and drops all capabilities, so the vendor process is not root, cannot bind port 80 (needs CAP_NET_BIND_SERVICE) and cannot write files owned by root in the image; the image was built assuming root.",
              "Under restricted-v2 the pod runs as a project-assigned uid (1000760000 here), with all capabilities dropped and no privilege escalation. The vendor image expects uid 0: nginx tries to bind 80 (a privileged port, needing CAP_NET_BIND_SERVICE) and to write /var/run/nginx.pid, which is root-owned in the image -- both fail with EACCES. Nothing is wrong with the cluster; the image's assumptions clash with the default security posture."
            ),
            part(
              "Choose the SCC",
              "Evaluate options from least to most privilege: fix the image (non-root, port 8080, writable paths) -- best; nonroot (any non-zero uid chosen by the image) -- not enough because the image needs uid 0; anyuid (RunAsAny uid, still no privileged containers, limited capabilities, allows NET_BIND_SERVICE in its allowed set in recent versions or run on 8080) -- minimal for this image; privileged -- never for this; explains checking what anyuid grants.",
              "Best answer: ask the vendor for a non-root image on port 8080 -- then no SCC change at all. Failing that, climb the ladder only as far as needed: nonroot-v2 allows a fixed non-zero uid the image declares, which does not help a root-only image; anyuid allows RunAsAny uid (so uid 0 inside the container, still unprivileged on the node, still constrained -- no host namespaces, no privileged mode) and is the smallest SCC that satisfies this image. privileged is out of the question for a web gateway. Check what anyuid implies before granting: oc describe scc anyuid (RunAsUser RunAsAny, SELinux MustRunAs, no host access)."
            ),
            part(
              "Apply via a service account",
              "Create a dedicated ServiceAccount, grant anyuid to it (oc adm policy add-scc-to-user anyuid -z vendor-gw -n appliance), set serviceAccountName on the Deployment, and verify the pod annotation shows anyuid; explains why not to grant anyuid to the default SA (every pod in the project would get it) or to a user.",
              "$ oc create sa vendor-gw -n appliance\n$ oc adm policy add-scc-to-user anyuid -z vendor-gw -n appliance\nclusterrole.rbac.authorization.k8s.io/system:openshift:scc:anyuid added: \"vendor-gw\"\n$ oc set serviceaccount deploy/vendor-gw vendor-gw -n appliance\n$ oc get pod -n appliance -l app=vendor-gw -o jsonpath='{.items[0].metadata.annotations.openshift\\.io/scc} {.items[0].status.phase}{\"\\n\"}'\nanyuid Running\n$ oc adm policy scc-subject-review -z vendor-gw -n appliance -f vendor-gw-pod.yaml\nRESOURCE        ALLOWED BY\nPod/vendor-gw   anyuid\nGranting the SCC to a dedicated service account scopes the exception to this one workload. Granting it to the default service account would let every pod in the project run as root; granting it to a user ties admission to who created the pod rather than what the pod is."
            ),
            part(
              "Review and record",
              "oc adm policy who-can use scc anyuid, oc get rolebinding -n appliance showing the system:openshift:scc:anyuid binding, oc describe scc anyuid Users/Groups no longer used in 4.x (RBAC-based); record the exception with the vendor ticket; set a review date to retire it when the image is fixed.",
              "$ oc adm policy who-can use scc anyuid -n appliance | grep -A2 Users\nUsers:  system:serviceaccount:appliance:vendor-gw\n$ oc get rolebinding -n appliance | grep scc\nsystem:openshift:scc:anyuid   ClusterRole/system:openshift:scc:anyuid   2m\nIn OpenShift 4, SCC grants are RBAC: the add-scc-to-user command created a RoleBinding to the system:openshift:scc:anyuid ClusterRole, which is what to review and keep in Git. Record the exception (vendor ticket, reason, owner) and a date to re-test the vendor's next image under restricted-v2 and remove the binding."
            ),
          ],
        },
        {
          text: "The team now wants the same gateway to mount a hostPath for logs 'because that is how it worked on the VM'.",
          ask: "Respond.",
          parts: [
            part(
              "hostPath",
              "hostPath needs the hostaccess/privileged-class SCCs (allowHostDirVolumePlugin) and ties the pod to a node's filesystem -- a security and portability regression; use an emptyDir or PVC and ship logs to stdout for the cluster logging stack; if a node path is truly required, a tightly scoped custom SCC with allowedHostPaths is the limit, not privileged.",
              "No: hostPath volumes are allowed only by SCCs with allowHostDirVolumePlugin (hostaccess, hostmount-anyuid, privileged), which open the node's filesystem to the pod and defeat the point of the platform's isolation; they also break scheduling freedom and node replacement. Logs belong on stdout/stderr, where the cluster's logging collector picks them up with pod metadata, or on a PVC if the appliance insists on files. If a node path were genuinely unavoidable, the answer is a custom SCC with allowedHostPaths listing exactly one read-only path, bound to this service account -- still an exception to document, and far from privileged."
            ),
          ],
        },
      ],
    },
    {
      slug: "job-and-cronjob-with-sa",
      objective: "Configure Kubernetes CronJobs with schedules, concurrency policy and history limits",
      kind: "build",
      title: "Run a nightly database export as a CronJob with a scoped service account",
      brief:
        "The fictional pharmacy chain Oakridge Health needs a nightly export at 02:30 that reads a database password from a Secret, writes to a PVC, must never overlap with itself, keeps three successful and five failed histories, and -- because the export script lists Pods of its own project to check nothing else is running -- needs read access to the Kubernetes API for pods in that project only. Build it and run it once by hand.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the ServiceAccount, Role and RoleBinding, the CronJob with the right schedule, concurrency and history settings, trigger a manual Job from it, and verify.",
          parts: [
            part(
              "Service account and API access",
              "A ServiceAccount exporter, a Role allowing get/list on pods in the project, a RoleBinding to the SA; explains the pod gets a projected token at /var/run/secrets/kubernetes.io/serviceaccount and that automountServiceAccountToken should be false for workloads that do not need the API.",
              "apiVersion: v1\nkind: ServiceAccount\nmetadata: {name: exporter, namespace: pharmacy}\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata: {name: pod-reader, namespace: pharmacy}\nrules:\n- apiGroups: [\"\"]\n  resources: [pods]\n  verbs: [get, list]\n---\napiVersion: rbac.authorization.k8s.io/v1\nkind: RoleBinding\nmetadata: {name: exporter-pod-reader, namespace: pharmacy}\nsubjects: [{kind: ServiceAccount, name: exporter, namespace: pharmacy}]\nroleRef: {kind: Role, name: pod-reader, apiGroup: rbac.authorization.k8s.io}\nA Role is project-scoped, so the exporter can list pods in pharmacy and nowhere else. The pod receives a short-lived projected token the script uses (kubectl/oc in the image, or curl with the token). Other Deployments in the project should set automountServiceAccountToken: false since they never call the API."
            ),
            part(
              "The CronJob",
              "schedule \"30 2 * * *\" (cluster time zone is UTC unless timeZone is set), concurrencyPolicy Forbid, successfulJobsHistoryLimit 3, failedJobsHistoryLimit 5, startingDeadlineSeconds, and a jobTemplate with backoffLimit, restartPolicy OnFailure, the SA, the Secret as env, and the PVC mount; explains each setting.",
              "apiVersion: batch/v1\nkind: CronJob\nmetadata: {name: nightly-export, namespace: pharmacy}\nspec:\n  schedule: \"30 2 * * *\"\n  timeZone: \"Europe/London\"\n  concurrencyPolicy: Forbid\n  startingDeadlineSeconds: 1800\n  successfulJobsHistoryLimit: 3\n  failedJobsHistoryLimit: 5\n  jobTemplate:\n    spec:\n      backoffLimit: 2\n      activeDeadlineSeconds: 7200\n      template:\n        spec:\n          serviceAccountName: exporter\n          restartPolicy: OnFailure\n          containers:\n          - name: export\n            image: registry.oakridge.example/tools/db-export:2.1\n            args: [\"--check-idle\", \"--out\", \"/export\"]\n            env:\n            - name: PGPASSWORD\n              valueFrom: {secretKeyRef: {name: reporting-db, key: password}}\n            volumeMounts: [{name: export, mountPath: /export}]\n          volumes:\n          - name: export\n            persistentVolumeClaim: {claimName: export-data}\nForbid skips a run if the previous Job is still active (Replace would kill it; Allow lets them overlap). startingDeadlineSeconds lets a run that missed its slot (e.g. during an upgrade) start within 30 minutes, else it counts as missed. History limits keep the last 3 successful and 5 failed Jobs for inspection. backoffLimit bounds retries of a failing pod; activeDeadlineSeconds kills a hung export."
            ),
            part(
              "Trigger a manual run",
              "oc create job --from=cronjob/nightly-export manual-export-1 and watch it; oc logs job/...; explains the manual Job is a copy of the template and does not count against the schedule.",
              "$ oc apply -f exporter.yaml -n pharmacy\n$ oc create job --from=cronjob/nightly-export manual-export-1 -n pharmacy\njob.batch/manual-export-1 created\n$ oc get jobs -n pharmacy -w\nNAME              STATUS     COMPLETIONS   DURATION   AGE\nmanual-export-1   Running    0/1           12s        12s\nmanual-export-1   Complete   1/1           4m31s      4m31s\n$ oc logs job/manual-export-1 -n pharmacy | tail -3\nidle check: 0 other running pods in pharmacy\nexported 2,418,301 rows to /export/2026-11-09.sql.gz\ndone\nThe manual Job copies the CronJob's jobTemplate; it is independent of the schedule and the history limits do not prune it (it is not owned by the CronJob)."
            ),
            part(
              "Verify permissions and behavior",
              "oc auth can-i --as=system:serviceaccount:pharmacy:exporter list pods -n pharmacy (yes) and in another project (no); oc get cronjob showing LAST SCHEDULE; test Forbid by suspending/unsuspending or shortening the schedule in a test project; oc patch to suspend during maintenance.",
              "$ oc auth can-i list pods -n pharmacy --as=system:serviceaccount:pharmacy:exporter\nyes\n$ oc auth can-i list pods -n finance --as=system:serviceaccount:pharmacy:exporter\nno\n$ oc auth can-i get secrets -n pharmacy --as=system:serviceaccount:pharmacy:exporter\nno\n$ oc get cronjob nightly-export -n pharmacy\nNAME             SCHEDULE     TIMEZONE       SUSPEND   ACTIVE   LAST SCHEDULE   AGE\nnightly-export   30 2 * * *   Europe/London  False     0        <none>          6m\nDuring a maintenance window: oc patch cronjob nightly-export -n pharmacy -p '{\"spec\":{\"suspend\":true}}' and set it back afterwards. Note the Secret is read by the kubelet when creating the pod, not by the service account -- which is why the SA needs no permission on secrets."
            ),
          ],
        },
      ],
    },
  ],
};
