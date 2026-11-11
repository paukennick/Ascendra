import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Certified Argo Project Associate (CAPA).
//
// Aligned to the four CAPA domains (Argo Workflows 36%, Argo CD 34%, Argo
// Rollouts 18%, Argo Events 12%), read on 2026-11-08 from
// github.com/cncf/curriculum (CAPA_Curriculum.pdf, image-only, read page by
// page) and training.linuxfoundation.org. Density (docs/labs.md, hybrid):
// 3 / 3 / 2 / 1.
//
// Labs write real Argo manifests (Workflow, Application, Rollout,
// AnalysisTemplate, EventSource, Sensor) and read authored argo/argocd CLI
// output. API versions are the stable argoproj.io/v1alpha1 the projects
// use; every lab is needs_expert_review.

export const CAPA_LABS: SeedLabSet = {
  trackCode: "CAPA",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/CAPA_Curriculum.pdf", "exam_outline", "2026-11-08"),
    source("https://training.linuxfoundation.org/certification/certified-argo-project-associate-capa/", "exam_outline", "2026-11-08"),
    source("https://argo-workflows.readthedocs.io/en/latest/", "reference", "2026-11-08"),
    source("https://argo-cd.readthedocs.io/en/stable/", "reference", "2026-11-08"),
    source("https://argo-rollouts.readthedocs.io/en/stable/", "reference", "2026-11-08"),
    source("https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/", "reference", "2026-11-09"),
    source("https://argo-workflows.readthedocs.io/en/latest/enhanced-depends-logic/", "reference", "2026-11-09"),
  ],
  labs: [
    // ----------------------------------------------------------------- 36%
    {
      slug: "workflow-dag-artifacts",
      objective: "Build DAGs: tasks with dependencies, conditional execution with when, loops with withItems and withParam, and fan-out and fan-in",
      kind: "build",
      title: "Write a DAG workflow that fans out over regions and fans back in",
      brief:
        "The fictional weather-data company Caldera Analytics needs a nightly Workflow: step one fetches a list of regions (it prints a JSON array like [\"eu-west\",\"us-east\",\"ap-south\"]); then one processing task per region runs in parallel using image registry.caldera.example/processor:3.1 with the region as an argument and writes a result file; finally a merge task combines all the results, but only if every region succeeded, and a separate notify task runs whether or not the merge ran.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Workflow using a DAG template and explain the fan-out, fan-in, conditional and always-run pieces.",
          parts: [
            part(
              "Entrypoint DAG and the fetch task",
              "A Workflow (argoproj.io/v1alpha1) with entrypoint pointing at a dag template; the first task runs a container/script template that prints the JSON array to stdout, captured as an output parameter via outputs.parameters[].valueFrom.path (or the result of a script template).",
              "apiVersion: argoproj.io/v1alpha1\nkind: Workflow\nmetadata: {generateName: nightly-}\nspec:\n  entrypoint: main\n  templates:\n  - name: main\n    dag:\n      tasks:\n      - name: fetch-regions\n        template: fetch\n      ...\n  - name: fetch\n    script:\n      image: python:3.12-alpine\n      command: [python]\n      source: |\n        import json; print(json.dumps([\"eu-west\",\"us-east\",\"ap-south\"]))\nA script template's stdout is available as {{tasks.fetch-regions.outputs.result}}; a container template would instead declare outputs.parameters with valueFrom.path to a file it writes."
            ),
            part(
              "Fan-out with withParam",
              "A process task with dependencies [fetch-regions] and withParam: \"{{tasks.fetch-regions.outputs.result}}\", passing {{item}} as an argument parameter to a container template running the processor; explains withParam expands a JSON list into parallel tasks, each with its own Pod.",
              "      - name: process\n        dependencies: [fetch-regions]\n        template: processor\n        arguments:\n          parameters:\n          - {name: region, value: \"{{item}}\"}\n        withParam: \"{{tasks.fetch-regions.outputs.result}}\"\n  - name: processor\n    inputs:\n      parameters: [{name: region}]\n    container:\n      image: registry.caldera.example/processor:3.1\n      args: [\"--region\", \"{{inputs.parameters.region}}\"]\n    outputs:\n      parameters:\n      - {name: summary, valueFrom: {path: /out/summary.json}}\n      artifacts:\n      - {name: result, path: /out/result.json}\nwithParam turns the JSON array into one task instance per element, run in parallel (bounded by spec.parallelism if set); withItems does the same for a static list."
            ),
            part(
              "Fan-in with aggregated outputs",
              "A merge task depending on process that consumes the aggregate of the fan-out's outputs -- {{tasks.process.outputs.parameters.<name>}} as a JSON list for parameters, or artifacts collected by key via an artifact repository/archive -- with when: \"{{tasks.process.status}} == Succeeded\" so it runs only if all regions succeeded.",
              "      - name: merge\n        dependencies: [process]\n        template: merger\n        when: \"{{tasks.process.status}} == Succeeded\"\n        arguments:\n          parameters:\n          - {name: results, value: \"{{tasks.process.outputs.parameters.summary}}\"}\nFor a fan-out task, outputs.parameters.<name> aggregates into a JSON list of every instance's value; artifacts from each instance are best written to the artifact repository under a per-region key (key: results/{{inputs.parameters.region}}.json) and loaded by the merger with an input artifact pointing at the prefix. The task's status is Succeeded only if every expanded instance succeeded, so when: gates the merge on all regions."
            ),
            part(
              "Always-run notify",
              "A notify task with dependencies on merge (or process) that uses a depends expression like depends: \"merge.Succeeded || merge.Failed || merge.Errored || merge.Skipped || merge.Omitted\" (or an onExit exit handler at workflow level) so it runs regardless of outcome, with {{workflow.status}} available in an exit handler.",
              "      - name: notify\n        depends: \"merge.Succeeded || merge.Failed || merge.Errored || merge.Skipped || merge.Omitted\"\n        template: notifier\nThe depends field (richer than dependencies) lets a task run on any terminal state of its upstream; plain dependencies only fire on success. Skipped means merge's when was false; Omitted means merge never ran because its own dependency (process) failed -- the common failure case here, so leaving Omitted out would silence the alert exactly when a region fails. Equivalent and often simpler: spec.onExit: notifier, an exit handler template that always runs when the workflow ends and can read {{workflow.status}} and {{workflow.failures}}."
            ),
          ],
        },
      ],
    },
    {
      slug: "workflow-templates-cron",
      objective: "Write Workflow templates: container, script, resource and suspend templates, WorkflowTemplate and ClusterWorkflowTemplate for reuse, and CronWorkflow for schedules",
      kind: "build",
      title: "Turn a one-off workflow into reusable, scheduled templates",
      brief:
        "The fictional genomics lab Tamsin Bio has a Workflow YAML that its scientists copy and edit for every run: it builds an index, runs an alignment container with a sample-id parameter, waits for a human to check a QC report, then creates a Kubernetes ConfigMap with the summary. They want: the steps reusable across namespaces without copying, a human approval gate, the ConfigMap created declaratively from the workflow, and the whole thing to run every Monday at 06:00 Europe/London, never overlapping.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the template types involved, the reusable template object and the schedule, and explain the choices.",
          parts: [
            part(
              "ClusterWorkflowTemplate for cross-namespace reuse",
              "A ClusterWorkflowTemplate (cluster-scoped) holding the templates (build-index, align, qc-gate, publish) with an inputs.parameters sample-id; namespaced WorkflowTemplate would need a copy per namespace; Workflows reference it with workflowTemplateRef {name, clusterScope: true} or templateRef inside steps.",
              "apiVersion: argoproj.io/v1alpha1\nkind: ClusterWorkflowTemplate\nmetadata: {name: alignment-pipeline}\nspec:\n  entrypoint: main\n  arguments:\n    parameters: [{name: sample-id}]\n  templates:\n  - name: main\n    steps:\n    - - {name: build-index, template: build-index}\n    - - name: align\n        template: align\n        arguments: {parameters: [{name: sample-id, value: \"{{workflow.parameters.sample-id}}\"}]}\n    - - {name: qc-gate, template: approve}\n    - - {name: publish, template: publish-configmap}\n  ...\nA WorkflowTemplate is namespaced; a ClusterWorkflowTemplate is visible from every namespace, so scientists in different namespaces submit Workflows with spec.workflowTemplateRef: {name: alignment-pipeline, clusterScope: true} and pass only sample-id."
            ),
            part(
              "Container and script templates",
              "build-index as a script template (inline shell/python) and align as a container template with image, args from inputs.parameters.sample-id, resources and an output artifact; explains script templates embed code and expose stdout as result, container templates run an image's command.",
              "  - name: build-index\n    script:\n      image: registry.tamsin.example/tools:2.0\n      command: [bash]\n      source: |\n        build-index --out /work/index\n  - name: align\n    inputs: {parameters: [{name: sample-id}]}\n    container:\n      image: registry.tamsin.example/aligner:5.3\n      args: [\"--sample\", \"{{inputs.parameters.sample-id}}\", \"--index\", \"/work/index\"]\n      resources: {requests: {cpu: \"4\", memory: 16Gi}}\n    outputs:\n      artifacts: [{name: qc-report, path: /work/qc.html}]\nScript templates are for short inline logic (their stdout becomes outputs.result); container templates run a real image with explicit args and resources. Shared files between steps go through artifacts or a shared volumeClaimTemplate."
            ),
            part(
              "Suspend template for human approval",
              "A suspend template (suspend: {}) as the qc-gate step, so the workflow pauses until someone runs argo resume or clicks Resume in the UI (optionally with a duration to auto-resume or time out); explains suspend holds the workflow without consuming a Pod.",
              "  - name: approve\n    suspend: {}\nWhen the workflow reaches qc-gate it stops in a Running/Suspended state with no Pod, until argo resume <workflow> (or the UI) continues it; a reviewer opens the qc-report artifact from the previous step first. suspend: {duration: \"48h\"} would auto-resume after two days; combining with a timeout and an exit handler covers forgotten approvals."
            ),
            part(
              "Resource template to create the ConfigMap",
              "A resource template with action: create and an inline manifest for a ConfigMap populated from parameters, with successCondition/failureCondition if waiting on status, and setOwnerReference so the ConfigMap is cleaned up with the workflow if desired; explains resource templates apply Kubernetes manifests from within the workflow using the workflow's ServiceAccount (which needs RBAC for configmaps).",
              "  - name: publish-configmap\n    resource:\n      action: create\n      setOwnerReference: false\n      manifest: |\n        apiVersion: v1\n        kind: ConfigMap\n        metadata:\n          name: alignment-{{workflow.parameters.sample-id}}\n        data:\n          summary: \"{{steps.align.outputs.result}}\"\nA resource template runs kubectl-style actions (create, apply, patch, delete) on a manifest; the workflow's ServiceAccount must have RBAC to create configmaps in the namespace. setOwnerReference: true would delete the ConfigMap with the Workflow, which is not wanted here."
            ),
            part(
              "CronWorkflow",
              "A CronWorkflow with schedule \"0 6 * * 1\", timezone Europe/London, concurrencyPolicy Forbid, startingDeadlineSeconds, and workflowSpec using workflowTemplateRef; explains Forbid skips a run if the previous is still going (e.g. waiting on approval), and successfulJobsHistoryLimit keeps the list tidy.",
              "apiVersion: argoproj.io/v1alpha1\nkind: CronWorkflow\nmetadata: {name: weekly-alignment}\nspec:\n  schedule: \"0 6 * * 1\"\n  timezone: Europe/London\n  concurrencyPolicy: Forbid\n  startingDeadlineSeconds: 600\n  successfulJobsHistoryLimit: 5\n  failedJobsHistoryLimit: 3\n  workflowSpec:\n    workflowTemplateRef: {name: alignment-pipeline, clusterScope: true}\n    arguments: {parameters: [{name: sample-id, value: weekly-batch}]}\nForbid prevents overlap -- important because a run may sit at the approval gate for days; Replace would kill it, Allow would stack runs. startingDeadlineSeconds lets a missed schedule (controller down) still start within 10 minutes."
            ),
          ],
        },
      ],
    },
    {
      slug: "workflow-stuck-pending",
      objective: "Configure artifacts: inputs and outputs, artifact repositories (S3-compatible, GCS, and others), and passing files and parameters between steps",
      kind: "case",
      title: "Find out why a workflow's second step never gets its file",
      brief:
        "At the fictional insurer Halverson, a two-step Workflow -- extract writes /data/claims.csv, transform reads it -- fails on the second step. The team recently moved from a shared volume to an artifact repository.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ argo get claims-etl-x7k2p\nName:                claims-etl-x7k2p\nStatus:              Failed\nMessage:             child 'claims-etl-x7k2p-2114567890' failed\n\nSTEP                      TEMPLATE   PODNAME                         DURATION  MESSAGE\n ✖ claims-etl-x7k2p        main\n ├─✔ extract               extract    claims-etl-x7k2p-extract-1  41s\n └─✖ transform             transform  claims-etl-x7k2p-transform-2 3s        Error (exit code 1): failed to load artifacts: failed to get artifact 'claims': no artifact repository configured\n\nWorkflow (abridged):\n  templates:\n  - name: extract\n    container: {image: registry.halverson.example/etl:2.4, args: [extract, --out, /data/claims.csv]}\n    outputs:\n      artifacts:\n      - {name: claims, path: /data/claims.csv}\n  - name: transform\n    inputs:\n      artifacts:\n      - {name: claims, path: /in/claims.csv}\n    container: {image: registry.halverson.example/etl:2.4, args: [transform, --in, /in/claims.csv]}\n\n$ kubectl -n argo get configmap artifact-repositories\nError from server (NotFound): configmaps \"artifact-repositories\" not found",
          ask: "Explain how artifacts move between steps and why this fails, then write the configuration that fixes it.",
          parts: [
            part(
              "How artifact passing works",
              "An output artifact is uploaded by the step's wait container from the declared path to the configured artifact repository (S3/MinIO, GCS, Azure, etc.) when the step finishes; an input artifact is downloaded by the init container of the consuming step into its declared path; without a repository the upload has nowhere to go -- here extract succeeded because the controller failed over to no-op or the artifact was dropped, and transform fails at download.",
              "Artifacts are files handed between Pods through a repository, not through a shared filesystem: when extract finishes, its wait sidecar uploads /data/claims.csv to the artifact repository under a key; when transform starts, its init container downloads that key to /in/claims.csv. Nothing is configured to store them -- no artifact-repositories ConfigMap, no default in workflow-controller-configmap -- so the handoff fails with 'no artifact repository configured'. The old shared-volume approach never needed this because both Pods mounted the same disk."
            ),
            part(
              "Fix: configure a repository",
              "Create the artifact-repositories ConfigMap in the workflow namespace (or set artifactRepository in workflow-controller-configmap) with an s3 section pointing at the MinIO/S3 endpoint, bucket, and a Secret for accessKeySecret/secretKeySecret, and annotate it as default; then re-submit; optionally set the key template so artifacts are organized per workflow.",
              "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: artifact-repositories\n  namespace: argo\n  annotations:\n    workflows.argoproj.io/default-artifact-repository: halverson-minio\ndata:\n  halverson-minio: |\n    s3:\n      endpoint: minio.storage.svc:9000\n      bucket: argo-artifacts\n      insecure: true\n      accessKeySecret: {name: minio-creds, key: accesskey}\n      secretKeySecret: {name: minio-creds, key: secretkey}\n      keyFormat: \"{{workflow.namespace}}/{{workflow.name}}/{{pod.name}}\"\nThe controller reads this ConfigMap in the workflow's namespace; the annotation names the default. Create the Secret with the MinIO credentials, then argo submit again -- extract uploads, transform downloads, and argo get shows both green."
            ),
            part(
              "Alternatives and when to use them",
              "For small values use output parameters (valueFrom.path) instead of artifacts; for large shared scratch use a volumeClaimTemplate mounted by both steps (same node constraints apply unless the volume is RWX); artifacts remain the right default for durable, cross-node handoff and for keeping results after the workflow is gone (archive logs, artifact GC).",
              "A few kilobytes (an id, a count, a JSON summary) travel better as output parameters: outputs.parameters[].valueFrom.path, consumed as {{steps.extract.outputs.parameters.name}} -- no repository involved. Gigabytes of scratch that only this workflow needs can use spec.volumeClaimTemplates, a PVC both steps mount (ReadWriteOnce forces both Pods onto one node). Artifacts are the right choice for files that must cross nodes, survive the workflow (results, reports) and be garbage-collected on a policy (artifactGC)."
            ),
          ],
        },
        {
          text: "Artifacts flow. The workflow now runs 300 times a day and the MinIO bucket grows by 40 GB daily. The team also asks why a workflow that is retried re-runs the extract step even though it is identical.",
          ask: "Add artifact garbage collection and memoization, and explain each.",
          parts: [
            part(
              "Artifact GC",
              "spec.artifactGC with strategy OnWorkflowDeletion or OnWorkflowCompletion (overridable per artifact), together with TTL (ttlStrategy) and pod GC so workflows and their artifacts are removed on a schedule; explains the controller's artifact GC Pod needs RBAC and the repository credentials to delete.",
              "spec:\n  artifactGC:\n    strategy: OnWorkflowDeletion\n  ttlStrategy:\n    secondsAfterCompletion: 86400\n  podGC:\n    strategy: OnWorkflowSuccess\nWith ttlStrategy, completed workflows are deleted after a day; artifactGC then deletes their artifacts from MinIO (the GC runs as a Pod with the workflow's ServiceAccount, which needs the artifact Secret and RBAC for workflowartifactgctasks). Mark artifacts that must survive -- final reports -- with artifactGC: {strategy: Never} on that output. The 40 GB a day becomes a rolling window."
            ),
            part(
              "Memoization",
              "memoize on the extract template with a key built from inputs (e.g. the date and source) and a cache ConfigMap, so a retry or a re-run with the same key reuses the stored outputs instead of running the Pod; explains the cache stores outputs (including artifact references) and maxAge bounds staleness.",
              "  - name: extract\n    memoize:\n      key: \"{{inputs.parameters.date}}-{{inputs.parameters.source}}\"\n      maxAge: \"24h\"\n      cache:\n        configMap: {name: extract-cache}\n    ...\nWhen a step with memoize runs, the controller looks up the key in the ConfigMap cache; a hit within maxAge returns the stored outputs (parameters and artifact locations) without creating a Pod, so a retried workflow skips extract and goes straight to transform. The key must capture everything that changes the result -- here the date and source -- or a stale result would be served."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 34%
    {
      slug: "application-and-applicationset",
      objective: "Build Applications and ApplicationSets: source (repo, path, revision), destination (cluster, namespace), generators for many clusters or teams, and the app-of-apps pattern",
      kind: "build",
      title: "Deploy one service to twelve clusters with an ApplicationSet",
      brief:
        "The fictional courier network Fairweather Logistics has twelve clusters registered in Argo CD, each labeled with region (eu, us, apac) and tier (edge, core). The service dispatch lives in the config repo at apps/dispatch with overlays per tier. They want one definition that creates an Application per cluster, deploying the right tier overlay into namespace dispatch, with automated sync, and they want the platform's own Argo CD Applications managed the same way.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the ApplicationSet, explain the generator and templating, and describe how app-of-apps fits the platform's own applications.",
          parts: [
            part(
              "Cluster generator",
              "An ApplicationSet whose generators list a cluster generator, optionally with a selector on cluster labels, exposing {{name}}, {{server}} and {{metadata.labels.tier}} to the template; explains the generator produces one parameter set per registered cluster secret.",
              "apiVersion: argoproj.io/v1alpha1\nkind: ApplicationSet\nmetadata: {name: dispatch, namespace: argocd}\nspec:\n  goTemplate: true\n  generators:\n  - clusters:\n      selector:\n        matchLabels: {argocd.argoproj.io/secret-type: cluster}\n  ...\nThe cluster generator reads every cluster Secret Argo CD holds (labels included) and yields one set of parameters per cluster: name, server and metadata.labels.*. A selector limits it (e.g. tier: edge only)."
            ),
            part(
              "Application template",
              "A template with metadata.name '{{.name}}-dispatch', source repoURL/targetRevision and path apps/dispatch/overlays/{{.metadata.labels.tier}}, destination server {{.server}} and namespace dispatch, syncPolicy automated with prune/selfHeal and CreateNamespace; explains each generated Application is owned by the ApplicationSet and removed if the cluster is unregistered (unless preservation is configured).",
              "  template:\n    metadata:\n      name: '{{.name}}-dispatch'\n    spec:\n      project: dispatch\n      source:\n        repoURL: https://git.fairweather.example/platform/config.git\n        targetRevision: main\n        path: 'apps/dispatch/overlays/{{index .metadata.labels \"tier\"}}'\n      destination:\n        server: '{{.server}}'\n        namespace: dispatch\n      syncPolicy:\n        automated: {prune: true, selfHeal: true}\n        syncOptions: [CreateNamespace=true]\nTwelve Applications appear (eu-edge-1-dispatch ...), each on the right overlay. Registering a new cluster with the labels adds one automatically; deregistering removes it -- set syncPolicy.preserveResourcesOnDeletion on the ApplicationSet if the workloads should outlive that."
            ),
            part(
              "Combining generators",
              "Mentions matrix or merge generators to combine the cluster generator with a list or Git generator (e.g. deploy several services per cluster from a directory listing), and the Git files generator for per-cluster config files; explains when a single Application per cluster is not enough.",
              "If each cluster should also get every service under apps/, use a matrix generator: clusters x git (directories: apps/*), templating path from both -- 12 clusters x N services from one ApplicationSet. A Git files generator can read a per-cluster config.json (replicas, feature flags) and feed values into the template. A merge generator overlays per-cluster overrides on the generated set."
            ),
            part(
              "App-of-apps for the platform",
              "A root Application pointing at a directory of Application manifests (including ApplicationSets) so Argo CD manages its own Applications declaratively from Git; explains bootstrapping (apply the root once), sync waves for ordering (CRDs and the AppProject first), and that the root is the only thing created by hand.",
              "apps/root/ in the config repo contains the AppProject dispatch, the ApplicationSet above, and Applications for platform add-ons; a single root Application (source path apps/root, automated sync) is applied once by hand -- kubectl apply -f root-app.yaml -- and from then on every Application and ApplicationSet is itself GitOps-managed. Use argocd.argoproj.io/sync-wave annotations so the AppProject (wave -1) exists before the ApplicationSet (wave 0) that references it."
            ),
          ],
        },
      ],
    },
    {
      slug: "sync-failure-outofsync",
      objective: "Troubleshoot common reconciliation patterns: OutOfSync caused by drift, ignoring differences, resource hooks, degraded health, and a sync that fails",
      kind: "case",
      title: "Clear a sync that fails and an app that never shows Synced",
      brief:
        "Two Argo CD tickets at the fictional broadcaster Kingsmere Media: the Application billing-prod is stuck in a failed sync, and the Application metrics-stack is permanently OutOfSync even though nobody touches it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ argocd app get billing-prod\nName:               argocd/billing-prod\nSync Status:        OutOfSync from main (b41c9e2)\nHealth Status:      Degraded\n\nOperation:          Sync\nSync Revision:      b41c9e2\nPhase:              Failed\nMessage:            one or more objects failed to apply, reason: Deployment.apps \"billing-api\" is invalid: spec.selector: Invalid value: ... field is immutable\n\nGROUP  KIND        NAMESPACE  NAME         STATUS     HEALTH    HOOK  MESSAGE\n       Service     billing    billing-api  Synced     Healthy\napps   Deployment  billing    billing-api  OutOfSync  Degraded        Deployment.apps \"billing-api\" is invalid: spec.selector: Invalid value: v1.LabelSelector{...}: field is immutable\n\n$ git -C config log -1 --format=%s -- apps/billing/overlays/prod\nAdd team label to billing-api selector",
          ask: "Explain the failure and give two ways to get the sync through, with the trade-off.",
          parts: [
            part(
              "Why the apply fails",
              "The commit changed the Deployment's spec.selector (added a label), and a Deployment's selector is immutable in the Kubernetes API, so the apply is rejected; Argo CD reports the API server's error, the Application stays OutOfSync and the old Deployment keeps running (Degraded reflects the failed operation, not necessarily broken Pods).",
              "Kubernetes refuses to change spec.selector on an existing Deployment -- it is immutable because changing it would orphan the existing ReplicaSets. The commit added team to the selector, so every sync attempt gets 'field is immutable' and fails. The live Deployment is untouched and still serving; Argo CD marks the app OutOfSync (desired differs) and the operation Failed."
            ),
            part(
              "Two ways through",
              "Option 1: revert the selector change in Git and put the new label only on the Pod template (selectors rarely need to change); Option 2: if the selector must change, sync with Replace=true for that resource (argocd.argoproj.io/sync-options: Replace=true on the Deployment, or argocd app sync --replace) which deletes and recreates it -- causing downtime unless done with a new Deployment name and a Service switch; trade-off: safety versus achieving the change.",
              "1) Revert the selector in Git -- keep spec.selector as it was and add team only under spec.template.metadata.labels; the next sync applies cleanly. This is almost always right: the selector is an internal contract, the template labels are what you wanted anyway. 2) If the selector genuinely must change, annotate the Deployment with argocd.argoproj.io/sync-options: Replace=true (or run argocd app sync billing-prod --replace) so Argo CD deletes and recreates it -- a brief outage while new Pods start. For zero downtime, create billing-api-v2 with the new selector, move the Service, then remove the old Deployment, all through Git."
            ),
          ],
        },
        {
          text: "$ argocd app get metrics-stack\nSync Status:        OutOfSync from main (77e0a1d)\nHealth Status:      Healthy\n\nGROUP  KIND        NAMESPACE   NAME             STATUS     HEALTH\napps   Deployment  monitoring  grafana          OutOfSync  Healthy\n       Service     monitoring  grafana          Synced     Healthy\n\n$ argocd app diff metrics-stack | head -12\n===== apps/Deployment monitoring/grafana ======\n--- /tmp/argocd-diff/grafana-live.yaml\n+++ /tmp/argocd-diff/grafana-desired.yaml\n@@ spec:\n-  replicas: 3\n+  replicas: 1\n\n$ kubectl -n monitoring get hpa grafana\nNAME      REFERENCE            TARGETS   MINPODS   MAXPODS   REPLICAS\ngrafana   Deployment/grafana   41%/60%   1         5         3",
          ask: "Explain why this app is permanently OutOfSync, and fix it properly without disabling automation.",
          parts: [
            part(
              "Cause",
              "An HPA owns spec.replicas on the live Deployment (it scaled to 3) while Git declares replicas: 1, so every comparison shows a difference; if selfHeal were on, Argo CD and the HPA would fight; this is the classic 'field managed by another controller' case.",
              "The HorizontalPodAutoscaler sets the Deployment's replicas to 3 based on load; Git says 1. Argo CD compares desired (1) to live (3) and reports OutOfSync forever. With selfHeal on it would reset replicas to 1 every few minutes and the HPA would scale back up -- a tug of war. The field is legitimately owned by another controller."
            ),
            part(
              "Fix",
              "Remove replicas from the Deployment manifest in Git (the recommended fix when an HPA manages it) or add ignoreDifferences for /spec/replicas on the Application (jsonPointers) together with RespectIgnoreDifferences=true in syncOptions so syncs do not reapply it; explains why removing the field is cleaner than ignoring it.",
              "Cleanest: delete spec.replicas from the Deployment in Git. With server-side apply, the HPA's value remains and Argo CD has nothing to compare. Alternatively, in the Application:\nspec:\n  ignoreDifferences:\n  - group: apps\n    kind: Deployment\n    name: grafana\n    jsonPointers: [/spec/replicas]\n  syncPolicy:\n    syncOptions: [RespectIgnoreDifferences=true]\nignoreDifferences alone only affects the diff; RespectIgnoreDifferences makes syncs leave the field alone too. Prefer removing the field: it states the truth (replicas are not Git-managed) instead of carrying an exception."
            ),
          ],
        },
      ],
    },
    {
      slug: "helm-kustomize-in-argocd",
      objective: "Configure Argo CD with Helm and Kustomize: Helm values and parameters, Kustomize overlays and images, and multiple sources",
      kind: "build",
      title: "Deploy a third-party Helm chart with your own values from Git",
      brief:
        "The fictional ticketing startup Juniper Tickets wants Argo CD to deploy the ingress-nginx chart from its public Helm repository at a pinned version, with values kept in Juniper's own config repo (not in the chart repo), plus one override that differs per environment. A second team deploys a Kustomize app and needs to pin an image tag in the Application rather than in Git for a hotfix experiment.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Helm Application using multiple sources and the Kustomize Application with an image override, and explain what Argo CD does with each.",
          parts: [
            part(
              "Helm chart from a repository with pinned version",
              "A source with repoURL pointing at the Helm repository (https://kubernetes.github.io/ingress-nginx), chart ingress-nginx and targetRevision set to the chart version; explains Argo CD runs helm template (not helm install) and applies the rendered manifests, so helm list shows nothing.",
              "  sources:\n  - repoURL: https://kubernetes.github.io/ingress-nginx\n    chart: ingress-nginx\n    targetRevision: 4.11.2\n    helm:\n      releaseName: ingress-nginx\n      valueFiles:\n      - $values/infra/ingress-nginx/values.yaml\n      - $values/infra/ingress-nginx/values-prod.yaml\n      parameters:\n      - {name: controller.replicaCount, value: \"3\"}\nFor a Helm repository source, targetRevision is the chart version -- pin it. (ingress-nginx itself was retired in March 2026 -- no further releases or security fixes -- so the same pattern applies to whichever maintained controller or Gateway API implementation replaces it; it is used here as a familiar chart.) Argo CD renders the chart with helm template using the given values and parameters and applies the output; Helm's release storage is not used, so helm list is empty and rollbacks happen through Git."
            ),
            part(
              "Values from a different repo: the $values source",
              "A second source entry for the config repo with ref: values (and no path), so valueFiles can reference $values/<path>; explains multiple sources let the chart and the values live in different repositories, and that the ref name is arbitrary.",
              "  - repoURL: https://git.juniper.example/platform/config.git\n    targetRevision: main\n    ref: values\nA source with ref exposes its checkout as $values to the other sources' valueFiles; it contributes no manifests itself. The per-environment override is simply a second values file (values-prod.yaml) layered after the base, or a parameters entry that the environment's Application sets. Values precedence: later valueFiles override earlier, parameters override files."
            ),
            part(
              "Kustomize with an image override",
              "An Application whose source path is the Kustomize overlay and whose spec.source.kustomize.images lists registry/image:tag (or =newimage:tag), which Argo CD applies as a kustomize edit set image at render time; explains it is a runtime override visible in the Application spec, useful for experiments but to be moved into Git once decided.",
              "  source:\n    repoURL: https://git.juniper.example/platform/config.git\n    targetRevision: main\n    path: apps/scanner/overlays/staging\n    kustomize:\n      images:\n      - registry.juniper.example/scanner:2.8.1-hotfix\nArgo CD runs kustomize build with that image override applied, equivalent to kustomize edit set image. Because the override lives in the Application rather than in the overlay, it is visible in argocd app get and in the Application's Git definition (if app-of-apps) -- acceptable for a short experiment, but promote the tag into the overlay's kustomization.yaml once it is the real desired state, so the record is in one place."
            ),
            part(
              "Checking what will be applied",
              "argocd app manifests (rendered output), argocd app diff before syncing, and --dry-run / sync previews; for Helm, argocd app get shows the resolved chart version and values files; for CRD-heavy charts use ServerSideApply=true and Replace where needed.",
              "argocd app manifests ingress-nginx shows exactly what helm template produced; argocd app diff compares it to the cluster before you sync; argocd app sync --dry-run validates against the API without changing anything. For charts that ship large CRDs, add syncOptions: [ServerSideApply=true] to avoid the annotation size limit of client-side apply. argocd app get lists the chart version and value files in effect, which is what you quote in a change ticket."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 18%
    {
      slug: "canary-rollout-analysis",
      objective:
        "Implement progressive rollout strategies: canary with steps (setWeight, pause, analysis), blue/green with preview and active Services, and manual or automatic promotion and abort",
      kind: "build",
      title: "Convert a Deployment to a metric-gated canary Rollout",
      brief:
        "The fictional payments company Oakridge Pay deploys its checkout API with a Deployment behind Service checkout (port 80 -> 8080) and an NGINX Ingress. They want a canary: 10% of traffic for 5 minutes, then 30% for 10 minutes, then full, with each pause gated on the canary's error ratio from Prometheus (abort if over 2%), and an emergency abort that takes seconds.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Rollout, the Services and traffic routing, and the AnalysisTemplate, and explain how promotion and abort work.",
          parts: [
            part(
              "Rollout with canary steps",
              "A Rollout (argoproj.io/v1alpha1) replacing the Deployment: same selector and template, strategy.canary with canaryService and stableService, trafficRouting.nginx referencing the stable Ingress, and steps setWeight 10, pause 5m, analysis, setWeight 30, pause 10m, analysis; explains the controller manages two ReplicaSets and the services' selectors.",
              "apiVersion: argoproj.io/v1alpha1\nkind: Rollout\nmetadata: {name: checkout, namespace: payments}\nspec:\n  replicas: 6\n  selector: {matchLabels: {app: checkout}}\n  template: {... same Pod template ...}\n  strategy:\n    canary:\n      canaryService: checkout-canary\n      stableService: checkout\n      trafficRouting:\n        nginx:\n          stableIngress: checkout\n      steps:\n      - setWeight: 10\n      - pause: {duration: 5m}\n      - analysis: {templates: [{templateName: error-ratio}], args: [{name: service, value: checkout-canary}]}\n      - setWeight: 30\n      - pause: {duration: 10m}\n      - analysis: {templates: [{templateName: error-ratio}], args: [{name: service, value: checkout-canary}]}\nThe Rollout controller keeps a stable and a canary ReplicaSet and patches the two Services' selectors with the ReplicaSet's pod-template-hash, so each Service addresses exactly one version. The steps run in order; an unlimited pause: {} would wait for a human."
            ),
            part(
              "Services and traffic routing",
              "Two Services with the same selector app=checkout (the controller adds the hash), and the existing Ingress for the stable Service; with nginx trafficRouting the controller creates a canary Ingress with the canary-weight annotation so 10%/30% is enforced at the ingress rather than by Pod count; without a traffic router, weights are approximated by replica ratios.",
              "apiVersion: v1\nkind: Service\nmetadata: {name: checkout-canary, namespace: payments}\nspec:\n  selector: {app: checkout}\n  ports: [{port: 80, targetPort: 8080}]\n(checkout already exists with the same selector.) The controller injects rollouts-pod-template-hash into each Service's selector. With trafficRouting.nginx it creates a second Ingress, checkout-checkout-canary, carrying nginx.ingress.kubernetes.io/canary: \"true\" and canary-weight: \"10\", so NGINX sends exactly 10% of requests to the canary regardless of how many Pods it has. Without a traffic router, Argo Rollouts can only approximate weight by scaling ReplicaSets (10% of 6 Pods rounds to 1)."
            ),
            part(
              "AnalysisTemplate",
              "An AnalysisTemplate with an arg service, a metric error-ratio using the prometheus provider (address, query over the canary service's requests), interval 1m, count or continuous during the pause, successCondition result[0] < 0.02 and failureLimit so one bad sample does not abort; explains an AnalysisRun is created per step and its result gates the Rollout.",
              "apiVersion: argoproj.io/v1alpha1\nkind: AnalysisTemplate\nmetadata: {name: error-ratio, namespace: payments}\nspec:\n  args: [{name: service}]\n  metrics:\n  - name: error-ratio\n    interval: 1m\n    count: 5\n    successCondition: result[0] < 0.02\n    failureLimit: 1\n    provider:\n      prometheus:\n        address: http://prometheus.monitoring.svc:9090\n        query: |\n          sum(rate(http_requests_total{service=\"{{args.service}}\",code=~\"5..\"}[2m]))\n            / sum(rate(http_requests_total{service=\"{{args.service}}\"}[2m]))\nEach analysis step spawns an AnalysisRun that evaluates the query every minute, five times; two failures (failureLimit: 1 allows one) mark the run Failed and the Rollout aborts. Argo Rollouts also supports Datadog, New Relic, Kayenta, a web endpoint or a Kubernetes Job as providers."
            ),
            part(
              "Promotion and abort",
              "Automatic promotion when every step passes; manual promotion with kubectl argo rollouts promote checkout (skipping a pause) or --full; abort with kubectl argo rollouts abort checkout, which shifts weight to 0 and scales the canary down in seconds, leaving the Rollout Degraded until the next change or a retry; explains an aborted rollout keeps the stable version serving.",
              "If every pause and analysis passes, the controller moves to 100% and the canary ReplicaSet becomes stable. kubectl argo rollouts promote checkout advances past the current pause; --full jumps to 100%. kubectl argo rollouts abort checkout sets the canary weight to 0 and scales its ReplicaSet to zero -- seconds, no Git round trip -- and the Rollout shows Degraded/Aborted while stable keeps serving. To retry after a fix, apply a new template (new commit) or kubectl argo rollouts retry rollout checkout. A failed AnalysisRun does the same abort automatically."
            ),
          ],
        },
      ],
    },
    {
      slug: "bluegreen-rollout-decision",
      objective:
        "Design AnalysisTemplates and AnalysisRuns: metric providers (Prometheus, Datadog, Kayenta, web, job), success and failure conditions, and how analysis gates a rollout",
      kind: "case",
      title: "Diagnose a blue/green rollout that will not promote",
      brief:
        "The fictional broadcaster Lindholm TV uses a blue/green Rollout for its scheduling API with pre-promotion analysis. A release has been sitting in Paused for an hour.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl argo rollouts get rollout scheduler -n tv\nName:            scheduler\nNamespace:       tv\nStatus:          ॥ Paused\nMessage:         BlueGreenPause\nStrategy:        BlueGreen\nImages:          registry.lindholm.example/scheduler:6.0.0 (preview)\n                 registry.lindholm.example/scheduler:5.9.2 (stable, active)\nReplicas:\n  Desired:       4\n  Current:       8\n  Ready:         8\n\nNAME                                    KIND         STATUS     INFO\n⟳ scheduler                             Rollout      ॥ Paused\n├──# revision:12\n│  ├──⧉ scheduler-7f9c8d6b5             ReplicaSet   ✔ Healthy  preview\n│  └──α scheduler-7f9c8d6b5-12-pre      AnalysisRun  ✖ Failed   ✔ 3,✖ 2\n└──# revision:11\n   └──⧉ scheduler-5d8b7c6a4             ReplicaSet   ✔ Healthy  stable,active\n\n$ kubectl -n tv get analysisrun scheduler-7f9c8d6b5-12-pre -o jsonpath='{.status.metricResults[0]}' | jq .\n{\"name\":\"smoke\",\"phase\":\"Failed\",\"successful\":3,\"failed\":2,\"measurements\":[{\"phase\":\"Successful\",\"value\":\"200\"},{\"phase\":\"Successful\",\"value\":\"200\"},{\"phase\":\"Failed\",\"value\":\"503\"},{\"phase\":\"Successful\",\"value\":\"200\"},{\"phase\":\"Failed\",\"value\":\"503\"}]}\n\nAnalysisTemplate smoke (abridged): provider web, url http://scheduler-preview.tv.svc/healthz, successCondition result.code == 200, count 5, interval 30s, failureLimit 0\nRollout strategy (abridged): blueGreen: {activeService: scheduler, previewService: scheduler-preview, autoPromotionEnabled: false, prePromotionAnalysis: {templates: [smoke]}}",
          ask: "Explain exactly why the Rollout is paused and what the analysis result means, then decide what to do.",
          parts: [
            part(
              "What the status says",
              "The preview ReplicaSet (6.0.0) is up and receiving the preview Service; prePromotionAnalysis ran the smoke metric five times, two measurements returned 503 and failureLimit is 0, so the AnalysisRun failed; with autoPromotionEnabled false the Rollout is additionally waiting for manual promotion, but a failed pre-promotion analysis would have blocked promotion anyway; active traffic is still on 5.9.2 -- users are unaffected.",
              "Blue/green: both versions run (8 Pods for a desired 4). The active Service still selects 5.9.2; the preview Service selects 6.0.0, which is where the analysis probes. The pre-promotion AnalysisRun made five web calls to the preview healthz: three 200s and two 503s. failureLimit: 0 means a single failure fails the metric, so the run is Failed, and a failed pre-promotion analysis blocks switching the active Service -- the Rollout stays Paused/Degraded on the preview side. Separately, autoPromotionEnabled: false means even a passing analysis would wait for a human promote. No customer traffic has reached 6.0.0."
            ),
            part(
              "Decide",
              "Treat the intermittent 503s as a real signal about 6.0.0 (e.g. a dependency warming or a readiness race) rather than loosening the gate: inspect the preview Pods' logs; if the fault is confirmed, abort (kubectl argo rollouts abort) so the preview scales down and fix forward; if the probe was wrong (healthz hitting a cold cache), adjust the AnalysisTemplate deliberately -- initialDelay, a tolerant failureLimit, or a better endpoint -- and retry, not promote blindly.",
              "Do not promote. Two 503s in five probes against an idle preview is a defect or a flaky dependency in 6.0.0. First kubectl -n tv logs -l rollouts-pod-template-hash=7f9c8d6b5 around the failing timestamps. If 6.0.0 is at fault: kubectl argo rollouts abort scheduler -n tv (preview scales to zero, active unchanged), fix, ship 6.0.1. If the probe is the problem -- healthz depends on a cache that warms after a minute -- change the template on purpose: initialDelay: 60s, count: 10, failureLimit: 1, or probe a readiness endpoint that reflects real serving; then kubectl argo rollouts retry rollout scheduler. Loosening gates silently to get a release out is how blue/green stops meaning anything."
            ),
            part(
              "Blue/green mechanics worth stating",
              "Explains activeService/previewService selector switching on promotion, previewReplicaCount and scaleDownDelaySeconds for the old ReplicaSet (instant switch-back window), and that promotion is a selector change -- atomic, instant and reversible with kubectl argo rollouts undo.",
              "On promote, the controller repoints the active Service's selector to the new ReplicaSet in one API call -- an atomic cutover. The old ReplicaSet stays up for scaleDownDelaySeconds (default 30s; set it to minutes to keep an instant undo path), after which it scales to zero. previewReplicaCount can keep the preview small until promotion, then scale it to the full count. Rolling back after promotion is kubectl argo rollouts undo, which flips the selector back while the old Pods still exist."
            ),
          ],
        },
        {
          text: "The team finds the cause: 6.0.0's healthz calls a schedule cache that takes about 90 seconds to warm after a Pod starts, and the first probes arrived too early. They fix nothing in the code and instead ask for the analysis to be made 'smarter', and for a post-promotion check against real traffic.\n\n$ kubectl -n tv get analysistemplate smoke -o jsonpath='{.spec.metrics[0]}' | jq -c '{initialDelay, interval, count, failureLimit}'\n{\"initialDelay\":null,\"interval\":\"30s\",\"count\":5,\"failureLimit\":0}",
          ask: "Rewrite the pre-promotion analysis for a slow-warming service and add a post-promotion analysis, then say what you would push back on.",
          parts: [
            part(
              "Pre-promotion analysis for a slow start",
              "Adds initialDelay (e.g. 120s) so measurements begin after the cache warms, keeps a few measurements with a small failureLimit (1), and optionally a second metric that checks a readiness endpoint reflecting the cache state; explains initialDelay delays the first measurement, failureLimit tolerates transient failures, and inconclusiveLimit/consecutiveErrorLimit handle provider errors.",
              "metrics:\n- name: smoke\n  initialDelay: 120s\n  interval: 30s\n  count: 6\n  failureLimit: 1\n  successCondition: result.code == 200\n  provider:\n    web:\n      url: http://scheduler-preview.tv.svc/healthz\n      timeoutSeconds: 5\ninitialDelay waits two minutes before the first measurement, so the warm-up window is never sampled; six probes over three minutes with one allowed failure separates a cold cache from a real fault. consecutiveErrorLimit covers the provider itself failing (DNS, timeout) so an infrastructure hiccup is reported as Error, not as the service failing."
            ),
            part(
              "Post-promotion analysis on real traffic",
              "postPromotionAnalysis with a Prometheus metric over the active Service's error ratio and latency for a few minutes after the switch, with failureLimit; a failure triggers an automatic rollback to the previous ReplicaSet, which blue/green can do only while scaleDownDelaySeconds keeps it alive -- so raise that delay to cover the analysis.",
              "strategy:\n  blueGreen:\n    activeService: scheduler\n    previewService: scheduler-preview\n    autoPromotionEnabled: false\n    scaleDownDelaySeconds: 600\n    prePromotionAnalysis: {templates: [{templateName: smoke}]}\n    postPromotionAnalysis:\n      templates: [{templateName: error-ratio}]\n      args: [{name: service, value: scheduler}]\nerror-ratio queries Prometheus for 5xx share on the active Service every minute for five minutes (successCondition result[0] < 0.01). If it fails, the controller switches the active selector back to the old ReplicaSet -- possible only because scaleDownDelaySeconds (600) keeps those Pods running through the analysis window. Without that delay a post-promotion failure has nothing to roll back to."
            ),
            part(
              "Push back",
              "Making analysis tolerate a 90-second cold start hides a user-facing problem: after promotion, newly started Pods will still serve 503s for 90 seconds during scaling or restarts; the right fix is a startup/readiness probe (and a readiness gate) so a Pod is not Ready until the cache is warm, which also makes the original analysis correct; the smarter analysis is a complement, not a substitute.",
              "The 'make analysis smarter' request treats a symptom. Any Pod of 6.0.0 that starts later -- an HPA scale-up, a node drain -- will answer 503 for 90 seconds to real users, because readiness says it is ready when it is not. Fix the Pod template: a readinessProbe (or startupProbe) on an endpoint that returns 200 only once the schedule cache is loaded. Then the preview Service only routes to warm Pods, the original smoke analysis would have passed on its own, and the analysis changes become defense in depth rather than a workaround."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 12%
    {
      slug: "events-webhook-to-workflow",
      objective:
        "Build event flows from the Argo Events components: EventSource types (webhook, S3, Kafka, calendar, resource and more), the EventBus (NATS/JetStream), Sensors with dependencies, filters and triggers, and trigger parameterization",
      kind: "build",
      title: "Start a workflow when an object lands in a bucket",
      brief:
        "The fictional map-data company Tessera receives satellite tiles as objects in a MinIO bucket named incoming-tiles. They want an Argo Workflow (from the WorkflowTemplate tile-ingest, which takes a parameter object-key) to start for every new object whose key ends in .tif, and nothing else; they also want a daily 03:00 run of a cleanup WorkflowTemplate regardless of uploads.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the EventBus, EventSources and Sensor, and explain how the event's data becomes the workflow's parameter.",
          parts: [
            part(
              "EventBus",
              "An EventBus named default in the namespace, JetStream-backed (nats jetstream) with a few replicas, which EventSources publish to and Sensors subscribe from; explains one EventBus per namespace is the usual setup and that it decouples sources from sensors.",
              "apiVersion: argoproj.io/v1alpha1\nkind: EventBus\nmetadata: {name: default, namespace: tiles}\nspec:\n  jetstream:\n    version: latest\n    replicas: 3\nEvery EventSource in the namespace writes events to this bus and every Sensor reads from it, so sources and sensors scale and restart independently. JetStream is the current recommended backing (persistent streams, at-least-once delivery)."
            ),
            part(
              "EventSources: minio and calendar",
              "An EventSource of type minio with the endpoint, bucket incoming-tiles, events [s3:ObjectCreated:*], a filter suffix .tif, and credentials from a Secret; and an EventSource of type calendar with schedule \"0 3 * * *\"; explains each named event under the source becomes a dependency name for sensors.",
              "apiVersion: argoproj.io/v1alpha1\nkind: EventSource\nmetadata: {name: tiles-bucket, namespace: tiles}\nspec:\n  minio:\n    new-tile:\n      bucket: {name: incoming-tiles}\n      endpoint: minio.storage.svc:9000\n      insecure: true\n      events: [\"s3:ObjectCreated:*\"]\n      filter: {suffix: .tif}\n      accessKey: {name: minio-creds, key: accesskey}\n      secretKey: {name: minio-creds, key: secretkey}\n---\napiVersion: argoproj.io/v1alpha1\nkind: EventSource\nmetadata: {name: nightly, namespace: tiles}\nspec:\n  calendar:\n    three-am:\n      schedule: \"0 3 * * *\"\n      timezone: Europe/London\nThe minio source subscribes to bucket notifications (MinIO's S3-compatible events) and the suffix filter drops non-.tif keys at the source; the calendar source emits an event on the cron schedule. new-tile and three-am are the event names sensors depend on."
            ),
            part(
              "Sensor with dependencies and a workflow trigger",
              "A Sensor with a dependency on tiles-bucket/new-tile, a trigger of type argoWorkflow (operation submit) whose source is a Workflow manifest using workflowTemplateRef tile-ingest, and parameters mapping the event's body (the S3 object key, e.g. body.Records.0.s3.object.key) into the workflow's arguments; a second Sensor (or trigger with its own dependency) for the calendar event submitting the cleanup template.",
              "apiVersion: argoproj.io/v1alpha1\nkind: Sensor\nmetadata: {name: tile-ingest, namespace: tiles}\nspec:\n  template:\n    serviceAccountName: argo-events-sa\n  dependencies:\n  - name: tile\n    eventSourceName: tiles-bucket\n    eventName: new-tile\n  triggers:\n  - template:\n      name: ingest\n      argoWorkflow:\n        operation: submit\n        source:\n          resource:\n            apiVersion: argoproj.io/v1alpha1\n            kind: Workflow\n            metadata: {generateName: tile-ingest-}\n            spec:\n              workflowTemplateRef: {name: tile-ingest}\n              arguments:\n                parameters: [{name: object-key, value: placeholder}]\n        parameters:\n        - src:\n            dependencyName: tile\n            dataKey: notification.0.s3.object.key\n          dest: spec.arguments.parameters.0.value\nThe trigger's parameters pull a value out of the event payload (dataKey is a JSONPath-like key into the event's data) and write it into the Workflow manifest before submission -- that is how the object key reaches the template. The ServiceAccount needs RBAC to create Workflows. A second Sensor with a dependency on nightly/three-am submits the cleanup WorkflowTemplate the same way."
            ),
            part(
              "Filtering and fan-in logic",
              "Sensor-level filters (data filters on the payload, e.g. key size or prefix; time filters; expression filters) refine beyond the source filter; conditions on triggers (e.g. \"tile && config-ready\") combine dependencies so a trigger fires only when several events have arrived; explains at-least-once delivery and idempotent workflows.",
              "Beyond the suffix filter at the source, the Sensor can filter on the payload -- filters: {data: [{path: notification.0.s3.object.size, type: number, comparator: \">\", value: [\"0\"]}]} skips empty objects; exprs allow expressions; time filters restrict hours. A trigger's conditions field combines dependencies, e.g. conditions: \"tile && manifest\" fires only after both a tile and its manifest event arrived. Delivery is at-least-once over JetStream, so the ingest WorkflowTemplate should be idempotent per object key (memoize on the key, or check-before-write)."
            ),
          ],
        },
      ],
    },
  ],
};
