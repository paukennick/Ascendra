import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Certified Cloud Native Platform Engineer (CNPE).
//
// Aligned to the five CNPE domains (Platform Architecture and
// Infrastructure 15%, GitOps and Continuous Delivery 25%, Platform APIs
// and Self-Service Capabilities 25%, Observability and Operations 20%,
// Security and Policy Enforcement 15%), read on 2026-11-08 from
// github.com/cncf/curriculum (CNPE_Curriculum.pdf) and
// training.linuxfoundation.org. Density (docs/labs.md, hybrid):
// 2 / 3 / 2 / 2 / 2.
//
// CNPE is performance-based, so these labs are hands-on: manifests the
// learner writes and cluster output they interpret, using the CNCF tools
// the curriculum names (Argo CD, Argo Rollouts, Flux, Tekton, Crossplane,
// Kyverno, Istio, Prometheus, OpenTelemetry, OpenCost). Every lab is
// needs_expert_review.

export const CNPE_LABS: SeedLabSet = {
  trackCode: "CNPE",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/CNPE_Curriculum.pdf", "exam_outline", "2026-11-08"),
    source("https://training.linuxfoundation.org/certification/certified-cloud-native-platform-engineer-cnpe/", "exam_outline", "2026-11-08"),
    source("https://argo-cd.readthedocs.io/en/stable/", "reference", "2026-11-08"),
    source("https://docs.crossplane.io/latest/", "reference", "2026-11-08"),
    source("https://docs.crossplane.io/v2.2/whats-new/", "reference", "2026-11-09"),
    source("https://docs.crossplane.io/cli/v2.4/command-reference/", "reference", "2026-11-09"),
    source("https://trivy.dev/docs/dev/supply-chain/attestation/vuln/", "reference", "2026-11-09"),
    source("https://kyverno.io/blog/2024/10/30/announcing-kyverno-release-1.13", "reference", "2026-11-09"),
    source("https://kyverno.io/docs/", "reference", "2026-11-08"),
    source("https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/", "reference", "2026-11-08"),
  ],
  labs: [
    // ----------------------------------------------------------------- 15%
    {
      slug: "opencost-rightsizing",
      objective:
        "Use cost management solutions for right-sizing and scaling: OpenCost allocation by namespace and label, requests versus usage, and autoscaling decisions",
      kind: "case",
      title: "Right-size a tenant from OpenCost and Prometheus data",
      brief:
        "The platform team at the fictional travel company Ashdown Trips runs OpenCost. The checkout team's namespace is the most expensive on the cluster and finance wants to know why and what to change.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n opencost port-forward svc/opencost 9003 &\n$ curl -s 'http://localhost:9003/allocation/compute?window=7d&aggregate=namespace' | jq '.data[0] | to_entries[] | {ns: .key, cpuCores: .value.cpuCoreRequestAverage, cpuUsed: .value.cpuCoreUsageAverage, ramGiB: (.value.ramByteRequestAverage/1073741824), ramUsedGiB: (.value.ramByteUsageAverage/1073741824), cost: .value.totalCost}' -c\n{\"ns\":\"checkout\",\"cpuCores\":46.0,\"cpuUsed\":4.1,\"ramGiB\":92.0,\"ramUsedGiB\":31.5,\"cost\":2843.12}\n{\"ns\":\"catalog\",\"cpuCores\":12.0,\"cpuUsed\":7.8,\"ramGiB\":24.0,\"ramUsedGiB\":19.2,\"cost\":744.90}\n{\"ns\":\"platform\",\"cpuCores\":9.5,\"cpuUsed\":6.2,\"ramGiB\":30.0,\"ramUsedGiB\":24.7,\"cost\":612.31}\n\n$ kubectl -n checkout get deploy -o custom-columns=NAME:.metadata.name,REPLICAS:.spec.replicas,CPU_REQ:.spec.template.spec.containers[0].resources.requests.cpu,MEM_REQ:.spec.template.spec.containers[0].resources.requests.memory\nNAME            REPLICAS   CPU_REQ   MEM_REQ\ncheckout-api    20         2         4Gi\ncart-worker     6          1         2Gi\n\n$ kubectl -n checkout get hpa\nNo resources found in checkout namespace.",
          ask: "Explain where the cost comes from and compute a right-sized request for checkout-api with a scaling plan.",
          parts: [
            part(
              "Reading the allocation",
              "OpenCost charges by the larger of request and usage, so checkout pays for 46 requested cores while using ~4 and 92 GiB while using ~31: requests, not usage, drive the cost; checkout-api accounts for 40 cores / 80 GiB of the requests (20 x 2 CPU, 20 x 4Gi), and with no HPA the 20 replicas run at full request around the clock.",
              "OpenCost allocates cost on max(request, usage), so checkout is billed for 46 cores and 92 GiB of requests against roughly 4 cores and 31 GiB actually used -- about 9% CPU and 34% memory efficiency. The arithmetic points at checkout-api: 20 replicas x 2 CPU = 40 cores and 20 x 4Gi = 80 GiB, nearly all of the namespace's requests, pinned at 20 replicas with no autoscaler. The cluster autoscaler has to keep nodes for those requests whether or not they are used, which is the $2,843."
            ),
            part(
              "Right-sized requests",
              "Checks per-pod usage before deciding (e.g. container_cpu_usage and container_memory_working_set_bytes p95 per pod) and proposes requests near p95 usage with headroom -- on the data given roughly 250-300m CPU and ~1.6-2Gi memory per pod -- keeping limits for memory equal to requests (or modestly above) and CPU limits absent or generous.",
              "Namespace averages hide per-pod peaks, so first: p95 per pod over 7 days --\nquantile_over_time(0.95, sum by (pod) (rate(container_cpu_usage_seconds_total{namespace=\"checkout\",container=\"checkout-api\"}[5m]))[7d:5m])\nand the same for container_memory_working_set_bytes. If usage is ~4 cores across 26 pods and memory ~31 GiB, checkout-api pods are around 150m CPU and 1.2 GiB each on average; set requests at p95 plus headroom, say cpu: 300m and memory: 2Gi, with memory limit 2Gi (requests equal limits for memory so the pod is not OOM-killed by neighbours) and no CPU limit or a generous one to avoid throttling. That alone cuts the namespace's requested cores from 46 to about 12."
            ),
            part(
              "Scaling plan",
              "An HPA on checkout-api targeting CPU utilisation (e.g. 70%) with minReplicas sized for the baseline and maxReplicas for peak, so replicas follow load rather than sitting at 20; mentions a PodDisruptionBudget and that memory-bound workloads may need a different metric; recommends verifying with OpenCost after a week.",
              "apiVersion: autoscaling/v2\nkind: HorizontalPodAutoscaler\nmetadata: {name: checkout-api, namespace: checkout}\nspec:\n  scaleTargetRef: {apiVersion: apps/v1, kind: Deployment, name: checkout-api}\n  minReplicas: 4\n  maxReplicas: 24\n  metrics:\n  - type: Resource\n    resource: {name: cpu, target: {type: Utilization, averageUtilization: 70}}\nWith right-sized requests, 70% utilisation of 300m is a sensible trigger; traffic peaks scale it up, nights scale it down. Add a PodDisruptionBudget (minAvailable: 2) so node scale-down stays safe. Re-check the OpenCost allocation after a week: expect checkout's cost to fall toward the usage line, and confirm p99 latency did not move."
            ),
          ],
        },
        {
          text: "A week after the change, OpenCost shows checkout at $780 for 7 days. The checkout team reports two OOMKilled restarts of cart-worker on Friday evening and asks to 'put the requests back'.",
          ask: "Respond to the OOM reports without undoing the savings.",
          parts: [
            part(
              "Diagnose cart-worker specifically",
              "The OOMKills are in cart-worker, not checkout-api, so revisit only that workload's memory: check kubectl describe for Last State OOMKilled and the memory working-set peak on Friday evenings (batch or queue spikes), and raise cart-worker's memory request/limit to cover that peak -- a targeted change, not a rollback of everything.",
              "$ kubectl -n checkout describe pod cart-worker-7d9f6-k2m8x | grep -A3 'Last State'\n    Last State:  Terminated\n      Reason:    OOMKilled\n      Exit Code: 137\nLook at max_over_time(container_memory_working_set_bytes{container=\"cart-worker\"}[7d]) around Friday 18:00: a queue-drain spike above the new limit explains it. Raise cart-worker alone -- memory request and limit to the observed peak plus 20%, e.g. 2.5Gi -- and leave checkout-api, which had no restarts, where it is. One workload's peak is not an argument for 92 GiB of idle requests."
            ),
            part(
              "Make it durable",
              "Recommend a VerticalPodAutoscaler in recommendation mode (updateMode Off) for the namespace so requests follow observed usage over time, alert on OOMKilled restarts (kube_pod_container_status_last_terminated_reason) and on request/usage efficiency per namespace, and report the saving with the fix to the team and finance.",
              "Install VPA with updateMode: \"Off\" for checkout workloads so the recommender publishes target requests you can review in Git rather than guessing again; alert on increase(kube_pod_container_status_restarts_total[1h]) with reason OOMKilled, and build an efficiency panel from OpenCost (request vs usage per namespace) so drift shows before finance asks. Then tell both sides the honest number: the namespace went from $2,843 to $780 a week; cart-worker gets more memory because the data says so, and the rest stays."
            ),
          ],
        },
      ],
    },
    {
      slug: "tenant-namespace-defaults",
      objective: "Optimize multi-tenancy resource usage: namespaces, ResourceQuotas, LimitRanges, priority classes and fair sharing across tenants",
      kind: "build",
      title: "Write the resource defaults for a new tenant namespace",
      brief:
        "The platform at the fictional retailer Bramhall Stores onboards team 'loyalty' into namespace loyalty-prod on a shared cluster. Their allocation is 16 CPU and 48 GiB. Write the objects that enforce the allocation, give sane defaults to Pods that omit resources, and keep tenants from starving each other.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the ResourceQuota, LimitRange and PriorityClass arrangement for loyalty-prod and explain the fair-sharing behaviour.",
          parts: [
            part(
              "ResourceQuota",
              "A ResourceQuota with requests.cpu 16, requests.memory 48Gi, limits.cpu and limits.memory somewhat higher (bursting), pods count, and optionally persistentvolumeclaims and services.loadbalancers; explains that once a quota exists every Pod must specify requests for the quota'd resources (hence the LimitRange defaults).",
              "apiVersion: v1\nkind: ResourceQuota\nmetadata: {name: tenant-quota, namespace: loyalty-prod}\nspec:\n  hard:\n    requests.cpu: \"16\"\n    requests.memory: 48Gi\n    limits.cpu: \"32\"\n    limits.memory: 64Gi\n    pods: \"150\"\n    persistentvolumeclaims: \"20\"\n    services.loadbalancers: \"0\"\nThe allocation is enforced on requests (what the scheduler reserves) with limits allowed to burst above it. Once this quota exists, a Pod with no requests or limits for CPU/memory is rejected -- which is why the LimitRange below must set defaults."
            ),
            part(
              "LimitRange",
              "A LimitRange giving default requests and limits per container (e.g. request 100m/128Mi, limit 500m/512Mi), a max per container (e.g. 4 CPU / 8Gi) so one Pod cannot take the whole quota, and a maxLimitRequestRatio to bound overcommit.",
              "apiVersion: v1\nkind: LimitRange\nmetadata: {name: tenant-defaults, namespace: loyalty-prod}\nspec:\n  limits:\n  - type: Container\n    defaultRequest: {cpu: 100m, memory: 128Mi}\n    default: {cpu: 500m, memory: 512Mi}\n    max: {cpu: \"4\", memory: 8Gi}\n    maxLimitRequestRatio: {cpu: \"10\", memory: \"2\"}\n  - type: PersistentVolumeClaim\n    max: {storage: 100Gi}\nContainers that say nothing get small requests and modest limits, so they pass the quota and cannot run unbounded; max stops a single container from booking a quarter of the cluster; the ratio caps how far a limit may exceed its request. Verify: kubectl -n loyalty-prod run test --image=registry.bramhall.example/pause then kubectl get pod test -o jsonpath='{.spec.containers[0].resources}'."
            ),
            part(
              "Priority classes",
              "Platform-defined PriorityClasses (e.g. tenant-critical, tenant-standard with globalDefault true, tenant-batch at low value) so under node pressure the scheduler preempts batch before serving workloads, with preemptionPolicy Never on batch to avoid it evicting others; a quota scoped by priority class limits how much a tenant may run as critical.",
              "apiVersion: scheduling.k8s.io/v1\nkind: PriorityClass\nmetadata: {name: tenant-standard}\nvalue: 1000\nglobalDefault: true\n---\napiVersion: scheduling.k8s.io/v1\nkind: PriorityClass\nmetadata: {name: tenant-critical}\nvalue: 10000\n---\napiVersion: scheduling.k8s.io/v1\nkind: PriorityClass\nmetadata: {name: tenant-batch}\nvalue: 100\npreemptionPolicy: Never\nWhen the cluster is full, pending higher-priority Pods preempt tenant-batch first; batch never preempts anyone. To stop every tenant marking everything critical, add a scoped quota: a ResourceQuota with scopeSelector matchExpressions PriorityClass In [tenant-critical] capping requests.cpu at 4 in loyalty-prod."
            ),
            part(
              "Fair sharing and verification",
              "Explains that quotas bound each tenant's reservation so no tenant can starve another at scheduling time, LimitRange bounds per-Pod size, priority orders eviction under pressure, and that CPU is throttled while memory is OOM-killed; shows how to verify with kubectl describe quota and a Pod that exceeds it.",
              "Fairness comes from the combination: the quota bounds what loyalty can reserve, so catalog's 16 cores remain schedulable; the LimitRange keeps any single Pod reasonable; priority decides who is evicted when a node runs short. Remember the two resources behave differently: CPU over the limit is throttled, memory over the limit is OOM-killed. Verify:\n$ kubectl -n loyalty-prod describe quota tenant-quota\nName:            tenant-quota\nResource         Used   Hard\n--------         ----   ----\nlimits.cpu       6      32\nrequests.cpu     2400m  16\nrequests.memory  3Gi    48Gi\n$ kubectl -n loyalty-prod apply -f big-deploy.yaml   # 10 replicas x 2 CPU\n... Error creating: pods \"big-7c9\" is forbidden: exceeded quota: tenant-quota, requested: requests.cpu=2, used: requests.cpu=15200m, limited: requests.cpu=16"
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 25%
    {
      slug: "argocd-app-of-apps",
      objective:
        "Implement GitOps workflows for application and infrastructure deployment: Argo CD Applications or Flux Kustomizations and HelmReleases, sync and health, and drift correction",
      kind: "build",
      title: "Wire a tenant's repo into Argo CD with drift correction",
      brief:
        "The fictional fintech Kelsall Pay has Argo CD installed in namespace argocd. Tenant 'ledger' keeps manifests at git@github.com:kelsall/ledger-config.git under overlays/prod. Connect the repository, create the Application so that production reconciles automatically, prunes removed resources and reverts manual edits, and show how to verify sync and health.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the repository credential, the AppProject and the Application, then show the verification and a drift test.",
          parts: [
            part(
              "Repository credential and project",
              "A Secret in argocd labelled argocd.argoproj.io/secret-type=repository with url, type git and an SSH private key (or token); an AppProject restricting the tenant to its repo, destination namespace and allowed resource kinds so a tenant cannot deploy cluster-scoped objects.",
              "apiVersion: v1\nkind: Secret\nmetadata:\n  name: ledger-config-repo\n  namespace: argocd\n  labels: {argocd.argoproj.io/secret-type: repository}\nstringData:\n  type: git\n  url: git@github.com:kelsall/ledger-config.git\n  sshPrivateKey: <deploy key, delivered by the platform's secret store -- never pasted into Git>\n---\napiVersion: argoproj.io/v1alpha1\nkind: AppProject\nmetadata: {name: ledger, namespace: argocd}\nspec:\n  sourceRepos: [\"git@github.com:kelsall/ledger-config.git\"]\n  destinations:\n  - {server: https://kubernetes.default.svc, namespace: ledger-prod}\n  clusterResourceWhitelist: []\n  namespaceResourceBlacklist:\n  - {group: \"\", kind: ResourceQuota}\n  - {group: \"\", kind: LimitRange}\nThe project fences the tenant: only their repo, only their namespace, no cluster-scoped resources, and they cannot override the platform's quota objects."
            ),
            part(
              "Application with automated sync",
              "An Application in project ledger pointing at the repo path overlays/prod on HEAD or main, destination ledger-prod, syncPolicy.automated with prune true and selfHeal true, CreateNamespace=false (platform owns namespaces), and a retry policy; explains what prune and selfHeal do.",
              "apiVersion: argoproj.io/v1alpha1\nkind: Application\nmetadata:\n  name: ledger-prod\n  namespace: argocd\n  finalizers: [resources-finalizer.argocd.argoproj.io]\nspec:\n  project: ledger\n  source:\n    repoURL: git@github.com:kelsall/ledger-config.git\n    targetRevision: main\n    path: overlays/prod\n  destination:\n    server: https://kubernetes.default.svc\n    namespace: ledger-prod\n  syncPolicy:\n    automated:\n      prune: true      # delete resources removed from Git\n      selfHeal: true   # revert live changes that differ from Git\n    syncOptions: [ServerSideApply=true]\n    retry:\n      limit: 5\n      backoff: {duration: 10s, factor: 2, maxDuration: 3m}\nprune makes Git the full truth (removing a manifest removes the object); selfHeal makes Argo CD re-sync when the live state drifts, not only when Git changes. The finalizer ensures deleting the Application cleans up its resources."
            ),
            part(
              "Verify sync and health",
              "argocd app get / kubectl get application showing Synced and Healthy, how health is derived (Deployment available, etc.), and argocd app diff for differences; what Degraded or OutOfSync means and where to look.",
              "$ kubectl -n argocd get application ledger-prod\nNAME          SYNC STATUS   HEALTH STATUS\nledger-prod   Synced        Healthy\n$ argocd app get ledger-prod\n...\nGROUP  KIND        NAMESPACE    NAME        STATUS  HEALTH   HOOK  MESSAGE\n       Service     ledger-prod  ledger-api  Synced  Healthy        service/ledger-api unchanged\napps   Deployment  ledger-prod  ledger-api  Synced  Healthy        deployment.apps/ledger-api configured\nSync status compares Git with live; health aggregates resource health (a Deployment is Healthy when its replicas are available, Progressing during rollout, Degraded when a rollout stalls). argocd app diff ledger-prod shows exactly what differs when OutOfSync; argocd app history and rollback are there if a sync went wrong."
            ),
            part(
              "Drift test",
              "Scale the Deployment by hand and watch selfHeal revert it; delete a resource from Git and watch prune remove it; shows the kubectl output and explains the reconcile timing (default 3 minute poll plus webhook-triggered syncs).",
              "$ kubectl -n ledger-prod scale deploy ledger-api --replicas=1\ndeployment.apps/ledger-api scaled\n$ kubectl -n argocd get application ledger-prod -w\nledger-prod   OutOfSync   Healthy\nledger-prod   Synced      Progressing\nledger-prod   Synced      Healthy\n$ kubectl -n ledger-prod get deploy ledger-api\nNAME         READY   UP-TO-DATE   AVAILABLE\nledger-api   3/3     3            3\nselfHeal put the replicas back to Git's 3 within seconds of the change being noticed. Remove overlays/prod/cronjob.yaml from the repo, merge, and the CronJob disappears from the namespace -- prune in action. Repo polling defaults to 3 minutes; a GitHub webhook to the argocd-server /api/webhook endpoint makes Git changes sync immediately."
            ),
          ],
        },
      ],
    },
    {
      slug: "tekton-build-and-promote",
      objective:
        "Build and configure CI/CD pipelines integrated with Kubernetes: Tekton Pipelines and Tasks (or Argo Workflows), image build and push, and updating desired state in Git",
      kind: "build",
      title: "Build a Tekton pipeline that builds, pushes and updates Git",
      brief:
        "On the platform at the fictional publisher Stanmore Books, Tekton Pipelines is installed. Write a Pipeline that clones the ledger-api source, builds the image with Buildah or Kaniko, pushes it by digest to registry.stanmore.example, and commits the new digest to the config repo's dev overlay so Argo CD deploys it. Use a workspace for the source and Secrets for the registry and Git credentials.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Pipeline (tasks, params, workspaces), the credentials wiring and a PipelineRun, and show how you verify a run.",
          parts: [
            part(
              "Pipeline structure",
              "A Pipeline with params (source repo, revision, image name, config repo), a shared source workspace, and every other workspace its Tasks need (config, registry and Git credentials) declared on the Pipeline and bound to the right PipelineTask; tasks: git-clone, build-and-push (producing the digest as a result), update-config (uses the digest result, runAfter build); explains results pass data between tasks and runAfter orders them.",
              "apiVersion: tekton.dev/v1\nkind: Pipeline\nmetadata: {name: build-and-promote, namespace: ci-ledger}\nspec:\n  params:\n  - {name: source-url, type: string}\n  - {name: revision, type: string, default: main}\n  - {name: image, type: string}     # registry.stanmore.example/ledger/ledger-api\n  - {name: config-url, type: string}\n  workspaces:\n  - {name: source}\n  - {name: config}\n  - {name: docker-credentials}\n  - {name: git-credentials}\n  tasks:\n  - name: clone\n    taskRef: {name: git-clone}\n    params: [{name: url, value: $(params.source-url)}, {name: revision, value: $(params.revision)}]\n    workspaces: [{name: output, workspace: source}]\n  - name: build\n    runAfter: [clone]\n    taskRef: {name: buildah}\n    params: [{name: IMAGE, value: \"$(params.image):$(tasks.clone.results.commit)\"}]\n    workspaces: [{name: source, workspace: source}, {name: dockerconfig, workspace: docker-credentials}]\n  - name: update-config\n    runAfter: [build]\n    taskRef: {name: update-digest}\n    params:\n    - {name: image, value: $(params.image)}\n    - {name: digest, value: $(tasks.build.results.IMAGE_DIGEST)}\n    - {name: config-url, value: $(params.config-url)}\n    workspaces: [{name: repo, workspace: config}, {name: git-credentials, workspace: git-credentials}]\nResults carry the commit SHA and the image digest between tasks; runAfter sequences them; the workspace is the shared filesystem the clone writes and the build reads. Every workspace a Task declares must be declared on the Pipeline and bound to that PipelineTask, or the run fails validation -- including git-credentials for update-digest."
            ),
            part(
              "The update task",
              "A custom Task that clones the config repo, uses kustomize edit set image (or yq) in overlays/dev to pin image@digest, commits and pushes with a bot identity; the digest -- not a tag -- is what gets committed; the Git credential comes from a Secret mounted as a workspace or via a ServiceAccount annotation.",
              "apiVersion: tekton.dev/v1\nkind: Task\nmetadata: {name: update-digest, namespace: ci-ledger}\nspec:\n  params: [{name: image}, {name: digest}, {name: config-url}]\n  workspaces: [{name: repo}, {name: git-credentials}]\n  steps:\n  - name: update\n    image: registry.stanmore.example/platform/ci-tools:1.4   # git, kustomize, yq\n    workingDir: $(workspaces.repo.path)\n    env: [{name: GIT_SSH_COMMAND, value: \"ssh -i $(workspaces.git-credentials.path)/id_ed25519 -o StrictHostKeyChecking=accept-new\"}]\n    script: |\n      #!/bin/sh\n      set -eu\n      git clone --depth 1 $(params.config-url) . \n      cd overlays/dev\n      kustomize edit set image $(params.image)=$(params.image)@$(params.digest)\n      git -c user.name=ci-bot -c user.email=ci-bot@stanmore.example commit -am \"dev: ledger-api $(params.digest)\"\n      git push origin HEAD:main\nThe commit pins the immutable digest; Argo CD sees the change and deploys it. Promotion to staging and prod is a PR copying the same line."
            ),
            part(
              "Credentials and the run",
              "Registry credential as a kubernetes.io/dockerconfigjson Secret bound to the docker-credentials workspace; Git SSH key as a Secret workspace; a PipelineRun with a volumeClaimTemplate for the source workspace and the ServiceAccount; shows the PipelineRun manifest.",
              "apiVersion: tekton.dev/v1\nkind: PipelineRun\nmetadata: {generateName: ledger-api-, namespace: ci-ledger}\nspec:\n  pipelineRef: {name: build-and-promote}\n  taskRunTemplate: {serviceAccountName: ci-ledger}\n  params:\n  - {name: source-url, value: https://github.com/stanmore/ledger-api.git}\n  - {name: image, value: registry.stanmore.example/ledger/ledger-api}\n  - {name: config-url, value: git@github.com:stanmore/ledger-config.git}\n  workspaces:\n  - name: source\n    volumeClaimTemplate:\n      spec: {accessModes: [ReadWriteOnce], resources: {requests: {storage: 2Gi}}}\n  - name: config\n    emptyDir: {}\n  - name: docker-credentials\n    secret: {secretName: registry-push}        # type kubernetes.io/dockerconfigjson\n  - name: git-credentials\n    secret: {secretName: config-repo-deploy-key}\nIn production a Tekton Trigger (EventListener + TriggerBinding + TriggerTemplate) creates this PipelineRun from the repository webhook instead of kubectl create."
            ),
            part(
              "Verify",
              "tkn pipelinerun describe or kubectl get pipelinerun showing Succeeded, task results including the digest, the commit in the config repo and Argo CD syncing dev; what to check when a task fails (tkn taskrun logs).",
              "$ kubectl -n ci-ledger create -f pipelinerun.yaml\npipelinerun.tekton.dev/ledger-api-x7k2p created\n$ tkn -n ci-ledger pipelinerun describe ledger-api-x7k2p\nStatus: Succeeded   Duration: 4m12s\nTaskruns:\n NAME                              TASK NAME      STATUS\n ledger-api-x7k2p-clone            clone          Succeeded\n ledger-api-x7k2p-build            build          Succeeded\n ledger-api-x7k2p-update-config    update-config  Succeeded\nResults:\n build.IMAGE_DIGEST  sha256:9f2c1e...\nThen git log in ledger-config shows \"dev: ledger-api sha256:9f2c1e...\" and kubectl -n argocd get application ledger-dev flips to Synced/Progressing/Healthy with the new digest. If a task fails, tkn taskrun logs ledger-api-x7k2p-build -f shows the step output."
            ),
          ],
        },
      ],
    },
    {
      slug: "canary-rollout-aborts",
      objective:
        "Implement progressive delivery strategies for applications, such as blue/green or canary with Argo Rollouts or Flagger, gated by metrics",
      kind: "case",
      title: "Debug a canary that never aborts",
      brief:
        "The fictional ticketing company Fenwick Live converted ledger-api to an Argo Rollouts canary with a Prometheus analysis. A broken release went to 100% last night despite a 12% error rate. Find out why and fix the Rollout.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n ledger-prod get rollout ledger-api -o yaml | yq '.spec.strategy'\ncanary:\n  steps:\n  - setWeight: 10\n  - pause: {duration: 2m}\n  - setWeight: 50\n  - pause: {duration: 2m}\n  analysis:\n    templates:\n    - templateName: error-rate\n    startingStep: 2\n\n$ kubectl -n ledger-prod get analysistemplate error-rate -o yaml | yq '.spec'\nmetrics:\n- name: error-rate\n  interval: 1m\n  successCondition: result[0] < 0.05\n  failureLimit: 3\n  provider:\n    prometheus:\n      address: http://prometheus.monitoring:9090\n      query: |\n        sum(rate(http_requests_total{app=\"ledger-api\",status=~\"5..\"}[5m]))\n        /\n        sum(rate(http_requests_total{app=\"ledger-api\"}[5m]))\n\n$ kubectl -n ledger-prod get analysisrun -l rollout=ledger-api --sort-by=.metadata.creationTimestamp | tail -2\nNAME                          STATUS       AGE\nledger-api-7f8c9-2-1          Successful   9h\n$ kubectl -n ledger-prod get analysisrun ledger-api-7f8c9-2-1 -o yaml | yq '.status.metricResults[0]'\nname: error-rate\nphase: Successful\ncount: 2\nmeasurements:\n- phase: Successful\n  value: \"[0.011]\"\n- phase: Successful\n  value: \"[0.014]\"",
          ask: "Explain why the analysis passed with a 12% error rate and why the rollout finished so fast, then write the corrected Rollout strategy and AnalysisTemplate.",
          parts: [
            part(
              "The query measured the wrong thing",
              "The query has no selector for the canary pods, so it averages stable and canary traffic: at 10% weight a 12% canary error rate is ~1.2% overall, under the 5% threshold; also analysis started at step 2 (the 50% weight) so the 10% stage had no analysis at all, and with only two 2-minute pauses the whole rollout took about 4 minutes with two measurements.",
              "Two problems. First, the PromQL selects all ledger-api requests -- stable and canary together. With the canary at 10% weight, a 12% canary error rate dilutes to roughly 1.2% in the blended series (the measurements of 0.011 and 0.014 are exactly that), so result[0] < 0.05 is true. The analysis must select the canary's own series, e.g. by the rollouts-pod-template-hash label Argo Rollouts puts on pods or by a canary Service/route. Second, startingStep: 2 means no analysis ran during the 10% step, and the total of two 2-minute pauses gave only two measurements before full promotion; a rollout that is wholly time-based will promote a bad build if the analysis is wrong or late."
            ),
            part(
              "Corrected Rollout strategy",
              "A canary with a canaryService and stableService (or traffic-router) so canary traffic is distinguishable, more steps with longer pauses, analysis starting at step 1 (or a background analysis with startingStep 0 after the first weight), and an abort on failure that scales the canary down; shows the YAML.",
              "strategy:\n  canary:\n    canaryService: ledger-api-canary\n    stableService: ledger-api-stable\n    canaryMetadata: {labels: {role: canary}}\n    stableMetadata: {labels: {role: stable}}\n    steps:\n    - setWeight: 5\n    - pause: {duration: 5m}\n    - setWeight: 20\n    - pause: {duration: 10m}\n    - setWeight: 50\n    - pause: {duration: 10m}\n    analysis:\n      templates: [{templateName: error-rate}]\n      startingStep: 1\n      args:\n      - name: canary-hash\n        valueFrom: {podTemplateHashValue: Latest}\nBackground analysis starts after the first weight is set and runs throughout; a failure aborts the rollout, which scales the canary ReplicaSet to zero and leaves the stable version serving. canaryMetadata adds a role=canary label to canary pods so metrics can be split."
            ),
            part(
              "Corrected AnalysisTemplate",
              "The query filters to canary pods (role=\"canary\" label or rollouts_pod_template_hash arg) and guards against low traffic (a minimum request rate or `or vector(0)` handled carefully), successCondition on the canary error ratio, failureLimit low (e.g. 1-2), count or continuous; explains that the metric's labels must exist on the series (relabelling pod labels into the metric).",
              "apiVersion: argoproj.io/v1alpha1\nkind: AnalysisTemplate\nmetadata: {name: error-rate, namespace: ledger-prod}\nspec:\n  args: [{name: canary-hash}]\n  metrics:\n  - name: canary-error-rate\n    interval: 1m\n    failureLimit: 1\n    successCondition: len(result) == 0 || result[0] < 0.02\n    provider:\n      prometheus:\n        address: http://prometheus.monitoring:9090\n        query: |\n          sum(rate(http_requests_total{app=\"ledger-api\",rollouts_pod_template_hash=\"{{args.canary-hash}}\",status=~\"5..\"}[2m]))\n          /\n          sum(rate(http_requests_total{app=\"ledger-api\",rollouts_pod_template_hash=\"{{args.canary-hash}}\"}[2m]))\nThe series must carry the pod-template-hash label -- ensure the ServiceMonitor relabels the pod label rollouts-pod-template-hash onto the metric (or use role=\"canary\" from canaryMetadata). len(result) == 0 keeps the analysis from failing when the canary has no traffic yet; a stricter design adds a second metric requiring a minimum request rate before judging."
            ),
          ],
        },
        {
          text: "With the fix in place the next release shows:\n$ kubectl argo rollouts -n ledger-prod get rollout ledger-api\nStatus:          ✖ Degraded\nMessage:         RolloutAborted: Rollout aborted update to revision 14: Metric \"canary-error-rate\" assessed Failed due to failed (1) > failureLimit (1)\nStrategy:        Canary\n  Step:          1/6\n  SetWeight:     0\n  ActualWeight:  0\nReplicas:\n  Desired: 6  Current: 6  Updated: 0  Ready: 6  Available: 6",
          ask: "Interpret the state and describe how to recover and how to roll forward later.",
          parts: [
            part(
              "Interpretation",
              "The rollout aborted at step 1: the canary's own error rate breached 2%, the canary was scaled to zero (Updated: 0, ActualWeight 0) and all six stable pods serve traffic; Degraded here means 'aborted', not 'users affected now' -- the blast radius was the 5% canary for one minute.",
              "This is the system working. The canary at 5% weight failed its first measurement, the analysis hit failureLimit 1, and Argo Rollouts aborted: the new ReplicaSet scaled to zero (Updated: 0), weight returned to 0, and the six stable pods are Ready and Available. Degraded is the Rollout's status for an aborted update; customers saw at most 5% of traffic hitting the bad build for about a minute. Compare with last night, when the bad build served 100%."
            ),
            part(
              "Recovery and roll-forward",
              "Fix the code, push a new image; in GitOps the Rollout's image is updated in Git and Argo CD syncs, which starts a fresh canary (revision 15) and clears the aborted state; alternatively kubectl argo rollouts undo to return the spec to revision 13 in Git terms is a revert commit; never kubectl argo rollouts promote past a failed analysis without a reason recorded.",
              "Recovery needs nothing -- stable is serving. To roll forward, fix the bug, let CI produce a new digest, and merge the dev-to-prod PR; Argo CD updates the Rollout's image and a new canary begins at 5% with analysis; if it passes every step, it promotes to 100% and the Degraded state clears. If the fix will take time, make Git match reality with a revert of the digest bump so the desired state is revision 13 and Argo CD shows Synced instead of carrying a failed desired revision. kubectl argo rollouts promote --full is for a deliberate override, recorded in the incident, not a habit."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 25%
    {
      slug: "crd-with-cel-and-status",
      objective:
        "Design and create CustomResourceDefinitions for platform services: OpenAPI schemas, validation rules, defaults, status subresources and versions",
      kind: "build",
      title: "Create a validated CRD for tenant message queues",
      brief:
        "The platform at the fictional insurer Whitcombe needs a MessageQueue API in group platform.whitcombe.example. Write the CRD with a strict schema, defaults, CEL validation, a status subresource and printer columns, then prove the validation rejects bad input.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the CRD and demonstrate applying valid and invalid resources.",
          parts: [
            part(
              "CRD skeleton and schema",
              "apiextensions.k8s.io/v1 CRD, namespaced, group/kind/plural/shortNames, versions with served/storage, openAPIV3Schema with spec fields typed and bounded (enum for tier, integer bounds for retention, pattern for name), required fields, defaults, and x-kubernetes-preserve-unknown-fields absent so unknown fields are pruned.",
              "apiVersion: apiextensions.k8s.io/v1\nkind: CustomResourceDefinition\nmetadata: {name: messagequeues.platform.whitcombe.example}\nspec:\n  group: platform.whitcombe.example\n  scope: Namespaced\n  names: {kind: MessageQueue, plural: messagequeues, singular: messagequeue, shortNames: [mq]}\n  versions:\n  - name: v1alpha1\n    served: true\n    storage: true\n    subresources: {status: {}}\n    additionalPrinterColumns:\n    - {name: Tier, type: string, jsonPath: .spec.tier}\n    - {name: Ready, type: string, jsonPath: \".status.conditions[?(@.type=='Ready')].status\"}\n    - {name: Age, type: date, jsonPath: .metadata.creationTimestamp}\n    schema:\n      openAPIV3Schema:\n        type: object\n        required: [spec]\n        properties:\n          spec:\n            type: object\n            required: [tier]\n            properties:\n              tier: {type: string, enum: [standard, fifo]}\n              retentionHours: {type: integer, minimum: 1, maximum: 336, default: 72}\n              maxMessageKiB: {type: integer, minimum: 1, maximum: 256, default: 64}\n              deadLetter: {type: boolean, default: false}\n              consumers:\n                type: array\n                maxItems: 20\n                items: {type: string, pattern: \"^[a-z0-9-]+$\"}\n          status:\n            type: object\n            properties:\n              observedGeneration: {type: integer}\n              endpoint: {type: string}\n              conditions:\n                type: array\n                items:\n                  type: object\n                  required: [type, status]\n                  properties:\n                    type: {type: string}\n                    status: {type: string, enum: [\"True\", \"False\", Unknown]}\n                    reason: {type: string}\n                    message: {type: string}\n                    lastTransitionTime: {type: string, format: date-time}\nWithout preserve-unknown-fields, a typo like retentionHrs is pruned (or rejected with kubectl's strict client-side validation), and defaults fill the minimal manifest."
            ),
            part(
              "CEL validation rules",
              "x-kubernetes-validations on spec for cross-field rules (fifo queues require deadLetter, retention for fifo at most 168h) and an immutability transition rule on tier using oldSelf, each with a message; explains CEL runs at admission and transition rules only when oldSelf exists.",
              "Add under spec (same level as properties):\n            x-kubernetes-validations:\n            - rule: \"self.tier != 'fifo' || self.deadLetter == true\"\n              message: \"fifo queues must enable deadLetter\"\n            - rule: \"self.tier != 'fifo' || !has(self.retentionHours) || self.retentionHours <= 168\"\n              message: \"fifo queues retain at most 168 hours\"\n            - rule: \"self.tier == oldSelf.tier\"\n              message: \"tier is immutable; create a new queue to change it\"\nThe first two run on create and update; the third is a transition rule -- CEL only evaluates rules referencing oldSelf on updates, so creation is unaffected. Messages surface verbatim in the kubectl error, which is what makes the API self-explaining."
            ),
            part(
              "Prove it",
              "Apply a valid manifest and show defaults filled in; apply a fifo queue without deadLetter and show the CEL rejection; try changing tier and show the immutability error; show the printer columns.",
              "$ kubectl apply -f - <<EOF\napiVersion: platform.whitcombe.example/v1alpha1\nkind: MessageQueue\nmetadata: {name: claims-events, namespace: claims}\nspec: {tier: standard, consumers: [claims-api, fraud-scorer]}\nEOF\nmessagequeue.platform.whitcombe.example/claims-events created\n$ kubectl -n claims get mq claims-events -o jsonpath='{.spec}'\n{\"consumers\":[\"claims-api\",\"fraud-scorer\"],\"deadLetter\":false,\"maxMessageKiB\":64,\"retentionHours\":72,\"tier\":\"standard\"}\n\n$ kubectl apply -f fifo-no-dlq.yaml\nThe MessageQueue \"payments-fifo\" is invalid: spec: Invalid value: \"object\": fifo queues must enable deadLetter\n\n$ kubectl -n claims patch mq claims-events --type merge -p '{\"spec\":{\"tier\":\"fifo\"}}'\nThe MessageQueue \"claims-events\" is invalid: spec: Invalid value: \"object\": tier is immutable; create a new queue to change it\n\n$ kubectl -n claims get mq\nNAME            TIER       READY   AGE\nclaims-events   standard   True    3m"
            ),
            part(
              "Status and versioning notes",
              "With the status subresource, kubectl apply of spec does not touch status and the controller's status updates do not bump metadata.generation; observedGeneration tells readers if status is current; a later v1beta1 is added as another entry with served true, one storage version, and a conversion strategy (None if additive).",
              "subresources.status splits the object: tenants write spec, the controller writes /status (RBAC can grant messagequeues/status update to the controller only); a status update does not increment metadata.generation, so observedGeneration in status lets anyone see whether the controller has processed the latest spec. When the API matures, add a v1beta1 entry with served: true, move storage: true to it, and keep v1alpha1 served for a deprecation period; purely additive field changes work with conversion.strategy None, renames need a conversion Webhook."
            ),
          ],
        },
      ],
    },
    {
      slug: "crossplane-claim-composition",
      objective:
        "Implement workflows for self-service provisioning using platform APIs: composite resources and compositions in Crossplane, or custom resources reconciled by operators",
      kind: "build",
      title: "Offer a self-service database API with Crossplane",
      brief:
        "Crossplane v2 and provider-helm (with its namespaced Release API) are installed on the platform at the fictional retailer Crowhurst. Make a tenant-facing, namespaced PostgresInstance composite resource whose Composition installs a CloudNativePG cluster via a Helm Release in the tenant's namespace. Show a tenant using it and where the connection Secret comes from.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the CompositeResourceDefinition, the Composition and a tenant's PostgresInstance, and show the status and connection details.",
          parts: [
            part(
              "CompositeResourceDefinition",
              "A v2 XRD (apiextensions.crossplane.io/v2) with scope Namespaced, group platform.crowhurst.example, names PostgresInstance, a versions entry with an OpenAPI schema for spec.parameters (size enum, storageGB bounds, version) and status fields; knows v2 namespaced XRs have no claims (claimNames applies only to legacy cluster-scoped XRs).",
              "apiVersion: apiextensions.crossplane.io/v2\nkind: CompositeResourceDefinition\nmetadata: {name: postgresinstances.platform.crowhurst.example}\nspec:\n  scope: Namespaced\n  group: platform.crowhurst.example\n  names: {kind: PostgresInstance, plural: postgresinstances}\n  versions:\n  - name: v1alpha1\n    served: true\n    referenceable: true\n    schema:\n      openAPIV3Schema:\n        type: object\n        properties:\n          spec:\n            type: object\n            required: [parameters]\n            properties:\n              parameters:\n                type: object\n                required: [size]\n                properties:\n                  size: {type: string, enum: [small, medium, large]}\n                  storageGB: {type: integer, minimum: 10, maximum: 500, default: 20}\n                  version: {type: string, enum: [\"15\", \"16\"], default: \"16\"}\n          status:\n            type: object\n            properties:\n              instances: {type: integer}\nIn Crossplane v2 the XRD defines one API: a namespaced composite resource (XR) that the tenant creates directly in their own namespace. There are no claims and no separate cluster-scoped XPostgresInstance; claims survive only for LegacyCluster XRs defined with the old v1 XRD API. Crossplane's own fields (compositionRef, resourceRefs) live under spec.crossplane, out of the tenant's way."
            ),
            part(
              "Composition",
              "A Composition for PostgresInstance in pipeline mode using function-patch-and-transform: one namespaced helm Release managed resource (helm.m.crossplane.io) installing the cloudnative-pg cluster chart into the XR's namespace, with patches mapping size to instances via a map transform and storageGB to the chart's storage size; explains patches and transforms.",
              "apiVersion: apiextensions.crossplane.io/v1\nkind: Composition\nmetadata: {name: postgres-cnpg}\nspec:\n  compositeTypeRef: {apiVersion: platform.crowhurst.example/v1alpha1, kind: PostgresInstance}\n  mode: Pipeline\n  pipeline:\n  - step: patch-and-transform\n    functionRef: {name: function-patch-and-transform}\n    input:\n      apiVersion: pt.fn.crossplane.io/v1beta1\n      kind: Resources\n      resources:\n      - name: cnpg-cluster\n        base:\n          apiVersion: helm.m.crossplane.io/v1beta1\n          kind: Release\n          spec:\n            forProvider:\n              chart: {name: cluster, repository: https://cloudnative-pg.github.io/charts, version: 0.3.1}\n              values:\n                cluster: {instances: 1, storage: {size: 20Gi}}\n            providerConfigRef: {kind: ClusterProviderConfig, name: in-cluster}\n        patches:\n        - type: FromCompositeFieldPath\n          fromFieldPath: metadata.namespace\n          toFieldPath: spec.forProvider.namespace\n        - type: FromCompositeFieldPath\n          fromFieldPath: spec.parameters.size\n          toFieldPath: spec.forProvider.values.cluster.instances\n          transforms:\n          - type: map\n            map: {small: 1, medium: 2, large: 3}\n        - type: FromCompositeFieldPath\n          fromFieldPath: spec.parameters.storageGB\n          toFieldPath: spec.forProvider.values.cluster.storage.size\n          transforms:\n          - {type: string, string: {type: Format, fmt: \"%dGi\"}}\n        - type: ToCompositeFieldPath\n          fromFieldPath: spec.forProvider.values.cluster.instances\n          toFieldPath: status.instances\nThe Release is provider-helm's namespaced managed resource (helm.m.crossplane.io), so it is created in the XR's own namespace, and the chart installs there too. Patches copy fields from the XR into the managed resource (and back into status); transforms convert the tenant's vocabulary (small) into the chart's (instances: 1). The Release is reconciled continuously, so a change to size redeploys the chart with new values."
            ),
            part(
              "Tenant resource and status",
              "A PostgresInstance in the tenant namespace with parameters; kubectl get showing SYNCED/READY and the Release; explains Ready appears when the Release is deployed, and that v2 XRs have no built-in connection details, so the Secret comes from CNPG or from a Secret the Composition composes.",
              "apiVersion: platform.crowhurst.example/v1alpha1\nkind: PostgresInstance\nmetadata: {name: orders-db, namespace: orders}\nspec:\n  parameters: {size: medium, storageGB: 50}\n\n$ kubectl -n orders get postgresinstance\nNAME        SYNCED   READY   COMPOSITION     AGE\norders-db   True     True    postgres-cnpg   4m\n$ kubectl -n orders get releases.helm.m.crossplane.io\nNAME              CHART     VERSION   SYNCED   READY   STATE      REVISION\norders-db-7hw2c   cluster   0.3.1     True     True    deployed   1\n$ kubectl -n orders get cluster.postgresql.cnpg.io\nNAME              INSTANCES   READY   STATUS\norders-db-7hw2c   2           2       Cluster in healthy state\nREADY on the XR follows the Release's Ready. Connection details: v2 composite resources have no built-in connection details (no writeConnectionSecretToRef), so the Composition is responsible for the Secret. Here CNPG already writes an -app Secret (host, port, user, password, dbname, uri) in the orders namespace, and the tenant's Deployment mounts it; if the platform wants a fixed name, the Composition composes its own Secret from those values (the documented v2 pattern)."
            ),
            part(
              "Troubleshooting path",
              "If READY stays False: kubectl describe the PostgresInstance for its composed resources (spec.crossplane.resourceRefs), then the managed Release for events (chart fetch errors, values schema errors, RBAC); crossplane resource trace shows the whole tree.",
              "$ crossplane resource trace postgresinstance orders-db -n orders\nNAME                                   SYNCED   READY   STATUS\nPostgresInstance/orders-db (orders)    True     False   Creating: ...\n└─ Release/orders-db-7hw2c (orders)    False    False   ReconcileError: failed to install release: chart \"cluster\" version \"0.3.1\" not found\nThe trace walks the XR to its composed resources, and the leaf's STATUS carries the real error (here a bad chart version in the Composition). Fix the Composition, and the Release reconciles without the tenant touching anything. (crossplane beta trace was the v1 CLI's name for this command.)"
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "alert-rules-and-otel",
      objective:
        "Implement monitoring, alerting, logging and tracing solutions: Prometheus and Alertmanager rules, Grafana dashboards, log collection, and OpenTelemetry with Jaeger",
      kind: "build",
      title: "Instrument a tenant service end to end",
      brief:
        "The fictional food-delivery company Oldbury Eats runs kube-prometheus-stack, Loki and an OpenTelemetry Collector with Jaeger. Tenant 'dispatch' deploys dispatch-api, which exposes /metrics on port 8080 and emits OTLP traces. Wire up scraping, an alert routed to the dispatch team, log collection and trace export.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the ServiceMonitor, PrometheusRule and Alertmanager routing, the collector configuration for traces, and show how you verify each.",
          parts: [
            part(
              "Scraping",
              "A ServiceMonitor in the dispatch namespace selecting the service by label with endpoint port name and interval, with the label the Prometheus object's serviceMonitorSelector requires (e.g. release: kube-prometheus-stack) or namespace selection configured; verify via the Prometheus targets page or the up metric.",
              "apiVersion: monitoring.coreos.com/v1\nkind: ServiceMonitor\nmetadata:\n  name: dispatch-api\n  namespace: dispatch\n  labels: {release: kube-prometheus-stack}   # must match Prometheus.spec.serviceMonitorSelector\nspec:\n  selector: {matchLabels: {app: dispatch-api}}\n  endpoints:\n  - port: http          # the Service port *name*\n    path: /metrics\n    interval: 30s\nThe Prometheus resource must also be allowed to watch this namespace (serviceMonitorNamespaceSelector) -- the platform sets that once. Verify: up{job=\"dispatch-api\"} == 1 in Prometheus, or kubectl -n monitoring port-forward svc/prometheus-operated 9090 and check Status > Targets. The commonest miss is the port name: it is the Service's port name, not the container port number."
            ),
            part(
              "Alert rule and routing",
              "A PrometheusRule with a multi-window error-rate alert labelled team: dispatch and severity, and an Alertmanager route (AlertmanagerConfig or the config Secret) matching team=dispatch to the team's receiver; verify with amtool or the Alertmanager UI and by firing a test alert.",
              "apiVersion: monitoring.coreos.com/v1\nkind: PrometheusRule\nmetadata:\n  name: dispatch-api\n  namespace: dispatch\n  labels: {release: kube-prometheus-stack}\nspec:\n  groups:\n  - name: dispatch-api\n    rules:\n    - alert: DispatchApiHighErrorRate\n      expr: |\n        sum(rate(http_requests_total{job=\"dispatch-api\",status=~\"5..\"}[5m]))\n          / sum(rate(http_requests_total{job=\"dispatch-api\"}[5m])) > 0.02\n      for: 10m\n      labels: {severity: page, team: dispatch}\n      annotations:\n        summary: \"dispatch-api 5xx ratio above 2% for 10m\"\n        runbook_url: https://runbooks.oldbury.example/dispatch-api/errors\n---\napiVersion: monitoring.coreos.com/v1alpha1\nkind: AlertmanagerConfig\nmetadata: {name: dispatch, namespace: dispatch}\nspec:\n  route:\n    receiver: dispatch-oncall\n    matchers: [{name: team, value: dispatch}]\n    groupBy: [alertname]\n    repeatInterval: 4h\n  receivers:\n  - name: dispatch-oncall\n    slackConfigs:\n    - apiURL: {name: dispatch-slack, key: url}\n      channel: '#dispatch-alerts'\nThe operator merges the AlertmanagerConfig into the global config scoped to this namespace. Verify: kubectl -n monitoring exec alertmanager-...-0 -- amtool config routes test team=dispatch severity=page prints dispatch/dispatch-oncall."
            ),
            part(
              "Logs and traces",
              "Logs: the platform's Promtail/Alloy or OTel Collector filelog receiver already tails stdout, so the service only needs structured JSON logs with trace_id; traces: the app exports OTLP to the collector's Service (OTEL_EXPORTER_OTLP_ENDPOINT), and the collector pipeline has otlp receiver, k8sattributes and batch processors, and an otlp exporter to Jaeger; show the collector config fragment and Deployment env.",
              "In the Deployment:\n        env:\n        - {name: OTEL_SERVICE_NAME, value: dispatch-api}\n        - {name: OTEL_EXPORTER_OTLP_ENDPOINT, value: http://otel-collector.observability:4317}\n        - {name: OTEL_RESOURCE_ATTRIBUTES, value: \"deployment.environment=prod\"}\nCollector pipeline (platform-owned):\n    receivers: {otlp: {protocols: {grpc: {endpoint: 0.0.0.0:4317}}}}\n    processors:\n      k8sattributes: {extract: {metadata: [k8s.namespace.name, k8s.deployment.name, k8s.pod.name]}}\n      batch: {}\n    exporters:\n      otlp/jaeger: {endpoint: jaeger-collector.observability:4317, tls: {insecure: true}}\n    service:\n      pipelines:\n        traces: {receivers: [otlp], processors: [k8sattributes, batch], exporters: [otlp/jaeger]}\nLogs need no app-side config beyond JSON lines that include trace_id so Loki -> Jaeger links work in Grafana (derived fields on the Loki data source)."
            ),
            part(
              "Verification",
              "Shows the checks: up metric, a Loki query for the namespace, a Jaeger search for the service, and the Grafana panel; mentions a Grafana dashboard provisioned via ConfigMap with the grafana_dashboard label.",
              "$ kubectl -n monitoring port-forward svc/prometheus-operated 9090 &\n$ curl -s 'localhost:9090/api/v1/query?query=up{job=\"dispatch-api\"}' | jq '.data.result[].value[1]'\n\"1\"\n\"1\"\n\"1\"\nLoki: {namespace=\"dispatch\", app=\"dispatch-api\"} |= \"trace_id\" returns JSON lines. Jaeger UI: service dispatch-api appears in the dropdown and a search returns spans with k8s.pod.name attributes. Dashboard: a ConfigMap in dispatch with label grafana_dashboard: \"1\" containing the RED-panels JSON is picked up by the Grafana sidecar, and the dashboard's error-rate panel moves with the alert's expression."
            ),
          ],
        },
      ],
    },
    {
      slug: "incident-from-alert",
      objective:
        "Diagnose and remediate platform issues and incident scenarios: from alert to cause across cluster, delivery and tenant layers, and the fix with verification",
      kind: "case",
      title: "Follow an alert through three layers",
      brief:
        "At the fictional marketplace Hepworth Trading, the platform on-call is paged. Work from the alert to the cause and remediation, checking the tenant, delivery and cluster layers.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "ALERT  KubeDeploymentReplicasMismatch  namespace=search deployment=search-api  severity=warning  for 15m\n\n$ kubectl -n search get deploy search-api\nNAME         READY   UP-TO-DATE   AVAILABLE   AGE\nsearch-api   4/6     2            4           41d\n$ kubectl -n search get rs -l app=search-api\nNAME                    DESIRED   CURRENT   READY   AGE\nsearch-api-5c8d7b9f4    4         4         4       3d\nsearch-api-7f6b8c9d2    2         2         0       17m\n$ kubectl -n search get pods -l app=search-api --field-selector=status.phase!=Running\nNAME                          READY   STATUS             RESTARTS   AGE\nsearch-api-7f6b8c9d2-mz4lp    0/1     CrashLoopBackOff   7          17m\nsearch-api-7f6b8c9d2-q8tz1    0/1     CrashLoopBackOff   7          17m\n$ kubectl -n search logs search-api-7f6b8c9d2-mz4lp --previous | tail -3\nfatal: config: required key SEARCH_INDEX_URL not set\n$ kubectl -n argocd get application search-prod\nNAME          SYNC STATUS   HEALTH STATUS\nsearch-prod   Synced        Progressing\n$ kubectl -n search get deploy search-api -o jsonpath='{.spec.template.spec.containers[0].envFrom}'\n[{\"configMapRef\":{\"name\":\"search-api-config\"}}]\n$ kubectl -n search get cm search-api-config -o jsonpath='{.data}'\n{\"LOG_LEVEL\":\"info\",\"SEARCH_INDEX_HOST\":\"opensearch.search:9200\"}",
          ask: "Identify the layer and cause, assess user impact, and state the remediation with verification.",
          parts: [
            part(
              "Cause",
              "Tenant/delivery layer: a new ReplicaSet (rolled out 17 minutes ago via Argo CD) crashes because the application expects SEARCH_INDEX_URL but the ConfigMap provides SEARCH_INDEX_HOST -- a config/code mismatch in the release; the cluster is fine (old pods healthy), the rollout is stalled by maxUnavailable semantics with 4 old pods still serving.",
              "The cluster layer is healthy: the old ReplicaSet's four pods are Ready and nodes are not implicated. The delivery layer did what it was told: Argo CD synced a new revision 17 minutes ago and reports Progressing because the Deployment has not finished. The cause is in the tenant's release: the new image requires SEARCH_INDEX_URL while the ConfigMap (unchanged) still provides SEARCH_INDEX_HOST, so every new pod exits at startup and crash-loops. The rolling update is stuck -- two new pods never become Ready, so the Deployment will not retire more old pods."
            ),
            part(
              "Impact",
              "Users are served by four healthy old pods at reduced capacity (4 of 6), so latency may rise under load but there is no outage; the risk is a node loss or a forced rollout removing the remaining old pods; the alert's severity (warning) matches.",
              "No outage: four old pods serve 100% of traffic with two-thirds of planned capacity. Check search-api p99 latency and error ratio for the last 20 minutes to confirm users are not affected; the exposure is that the Deployment cannot heal (a node drain would reduce capacity further with no healthy replacement). Warning severity is right, but it should not wait until morning."
            ),
            part(
              "Remediation",
              "Two valid paths through Git (not kubectl edit, because selfHeal would revert it): revert the image bump so the Deployment returns to the old ReplicaSet, or forward-fix by adding SEARCH_INDEX_URL to the ConfigMap in the same commit; recommends the revert now for speed, then the forward fix via the normal PR; explains why a hand patch is wrong under GitOps.",
              "Because Argo CD runs with selfHeal, kubectl edit or kubectl set env would be reverted within minutes -- and would leave Git lying. Fastest safe fix: revert the digest bump in overlays/prod and merge; Argo CD syncs, the Deployment scales the old ReplicaSet back to 6 and deletes the crashing one. Then the forward fix as a normal change: add SEARCH_INDEX_URL: http://opensearch.search:9200 to the ConfigMap in the same PR as the image (and ideally have the app accept both keys for one release). If the team prefers the forward fix immediately, a single commit adding the key is equally GitOps-clean; what matters is that the change lands in Git."
            ),
            part(
              "Verification and follow-up",
              "Shows the Deployment returning to 6/6 and Argo CD Healthy, the alert resolving, and follow-ups: a preview/staging environment would have caught it, a startup probe and a ConfigMap-changes-with-image rule, and a readiness check in CI that the chart's config keys match the app's required env.",
              "$ kubectl -n search rollout status deploy/search-api\ndeployment \"search-api\" successfully rolled out\n$ kubectl -n search get deploy search-api\nNAME         READY   UP-TO-DATE   AVAILABLE\nsearch-api   6/6     6            6\n$ kubectl -n argocd get application search-prod\nsearch-prod   Synced   Healthy\nThe KubeDeploymentReplicasMismatch alert resolves once replicas match. Follow-ups for the review: the same digest ran in staging -- did staging's ConfigMap already have the new key (environment drift)? Add a CI check that the manifests' env keys cover the app's required configuration, and consider a pre-sync Job that validates config against the image. The rollout strategy worked as designed; the gap was in testing the config with the image."
            ),
          ],
        },
        {
          text: "Two hours later another page: the same alert fires for 14 Deployments across 6 namespaces at once.\n$ kubectl get pods -A --field-selector=status.phase=Pending | wc -l\n37\n$ kubectl describe pod -n catalog catalog-api-6d9f7-x2k1p | grep -A4 Events\nEvents:\n  Warning  FailedScheduling  2m  default-scheduler  0/12 nodes are available: 3 node(s) had untolerated taint {node.kubernetes.io/unreachable: }, 9 Insufficient cpu.\n$ kubectl get nodes\nNAME        STATUS     ROLES    AGE   VERSION\nnode-a1     Ready      <none>   40d   v1.37.1\n...\nnode-c3     NotReady   <none>   40d   v1.37.1\nnode-c4     NotReady   <none>   40d   v1.37.1\nnode-c5     NotReady   <none>   40d   v1.37.1",
          ask: "Diagnose this second incident and contrast it with the first.",
          parts: [
            part(
              "Cluster-layer cause",
              "This is the cluster layer: three nodes in one zone (c) are NotReady, their pods are being evicted and rescheduled, and the remaining nine nodes lack CPU for all of them -- 37 Pending pods from capacity, not from any release; the breadth (many namespaces at once) is the tell.",
              "Fourteen Deployments in six namespaces failing together is never a tenant's release; it is shared infrastructure. Three nodes -- all c-something, likely one zone or one rack -- went NotReady; after the eviction timeout their pods were rescheduled, and the nine healthy nodes do not have the CPU to fit them (Insufficient cpu on 9, untolerated unreachable taint on 3). The platform's capacity assumption (losing a zone still fits) does not hold at current requests."
            ),
            part(
              "Remediation and contrast",
              "Immediate: add capacity (scale the node pool or confirm the cluster autoscaler is working -- check its logs and any quota it hit), and if the c-nodes are gone for good, cordon/delete them so controllers stop waiting; protect critical tenants via PriorityClass preemption; afterwards: zone-aware capacity headroom and topology spread constraints; contrast: incident one needed a Git change in one tenant's repo, incident two needs the platform team to fix capacity and nothing in any tenant repo.",
              "Now: check the cluster autoscaler -- kubectl -n kube-system logs deploy/cluster-autoscaler | grep -i 'scale up' -- a cloud quota or a failed node group blocks it often; scale the node pool manually if needed. If the c-nodes are not coming back, kubectl delete node node-c3 (after confirming with the cloud) so pods and volumes stop waiting on them. PriorityClasses mean the critical tenants' pods preempt batch for the CPU that exists. After: size node pools so losing one zone still fits the requests (N+1 zone headroom), add topologySpreadConstraints across zones to the platform's Deployment template, and alert on cluster allocatable headroom. The contrast matters for the on-call: incident one was a tenant change fixed in Git; this one is platform capacity, fixed by the platform, with tenants informed rather than paged."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 15%
    {
      slug: "istio-strict-mtls-tenant",
      objective: "Configure secure service-to-service communication: mesh mTLS (Istio, Linkerd) and NetworkPolicy",
      kind: "build",
      title: "Enforce mTLS and network policy for a tenant namespace",
      brief:
        "The platform at the fictional insurer Harlow Mutual runs Istio in sidecar mode (ambient is not enabled). Tenant 'claims' must have all in-namespace traffic encrypted and authenticated, accept calls only from the 'portal' namespace on port 8080, and reach only its database namespace and DNS. Write the Istio and NetworkPolicy objects and verify.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the namespace injection label, the PeerAuthentication and AuthorizationPolicy, and the NetworkPolicies, then verify mTLS and the deny paths.",
          parts: [
            part(
              "Injection and strict mTLS",
              "Label the namespace istio-injection=enabled and restart workloads so sidecars are injected; a PeerAuthentication in claims with mtls mode STRICT so plaintext is refused; notes the mesh-wide default and that STRICT should follow a PERMISSIVE period during migration.",
              "$ kubectl label namespace claims istio-injection=enabled\n$ kubectl -n claims rollout restart deploy\n---\napiVersion: security.istio.io/v1\nkind: PeerAuthentication\nmetadata: {name: default, namespace: claims}\nspec:\n  mtls: {mode: STRICT}\nAfter the restart every pod shows 2/2 containers. STRICT means the sidecar rejects any connection that is not Istio mTLS -- a plaintext curl from a non-mesh pod fails at the TLS layer. Where a namespace is migrating, run PERMISSIVE first, confirm from Kiali or the istio_requests_total{connection_security_policy} metric that all traffic is already mutual_tls, then switch."
            ),
            part(
              "AuthorizationPolicy",
              "A namespace-wide AuthorizationPolicy with ALLOW rules from the portal namespace's service account principals (spiffe identities) to port 8080, plus an explicit deny-all default (empty ALLOW policy) so anything unmatched is denied; explains principals need mTLS to be known.",
              "apiVersion: security.istio.io/v1\nkind: AuthorizationPolicy\nmetadata: {name: allow-portal, namespace: claims}\nspec:\n  action: ALLOW\n  rules:\n  - from:\n    - source:\n        principals: [\"cluster.local/ns/portal/sa/portal-web\"]\n    to:\n    - operation:\n        ports: [\"8080\"]\n---\napiVersion: security.istio.io/v1\nkind: AuthorizationPolicy\nmetadata: {name: allow-same-namespace, namespace: claims}\nspec:\n  action: ALLOW\n  rules:\n  - from:\n    - source: {namespaces: [\"claims\"]}\nWith at least one ALLOW policy in the namespace, Istio denies everything not matched -- so portal-web on 8080 and intra-namespace calls pass, and any other identity is rejected with RBAC: access denied (HTTP 403). Principals are SPIFFE identities taken from the client certificate, which is why STRICT mTLS and authorization go together."
            ),
            part(
              "NetworkPolicy at L3/L4",
              "Default-deny ingress and egress, allow ingress from portal namespace on 8080 (and from the istio-system for control plane as needed), allow egress to the database namespace on 5432, to kube-dns on 53, and to istiod on 15012; explains defence in depth: NetworkPolicy is enforced by the CNI regardless of sidecars.",
              "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: default-deny, namespace: claims}\nspec:\n  podSelector: {}\n  policyTypes: [Ingress, Egress]\n---\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: allow-portal-ingress, namespace: claims}\nspec:\n  podSelector: {}\n  policyTypes: [Ingress]\n  ingress:\n  - from:\n    - namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: portal}}\n    ports: [{protocol: TCP, port: 8080}]\n---\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: allow-egress, namespace: claims}\nspec:\n  podSelector: {}\n  policyTypes: [Egress]\n  egress:\n  - to: [{namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: kube-system}}, podSelector: {matchLabels: {k8s-app: kube-dns}}}]\n    ports: [{protocol: UDP, port: 53}, {protocol: TCP, port: 53}]\n  - to: [{namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: claims-db}}}]\n    ports: [{protocol: TCP, port: 5432}]\n  - to: [{namespaceSelector: {matchLabels: {kubernetes.io/metadata.name: istio-system}}}]\n    ports: [{protocol: TCP, port: 15012}]\nThe sidecar must reach istiod (15012) for certificates and config, so that egress is required. NetworkPolicy works at the packet level in the CNI, so even a pod that somehow escapes injection is still fenced."
            ),
            part(
              "Verification",
              "istioctl x describe or Kiali showing STRICT; a curl from portal-web succeeding and from another namespace failing with 403 (authz) or connection reset (no mTLS); a NetworkPolicy test from a disallowed namespace timing out; metric check on connection_security_policy.",
              "$ istioctl -n claims x describe pod claims-api-7c9d5-k2p8x | grep -i mtls\nEffective PeerAuthentication: STRICT\n$ kubectl -n portal exec deploy/portal-web -- curl -s -o /dev/null -w '%{http_code}\\n' http://claims-api.claims:8080/healthz\n200\n$ kubectl -n billing exec deploy/billing-api -- curl -s -o /dev/null -w '%{http_code}\\n' http://claims-api.claims:8080/healthz\n000      # NetworkPolicy drops it: connection times out before Istio is even consulted\n$ kubectl -n portal exec deploy/portal-batch -- curl -s http://claims-api.claims:8080/healthz\nRBAC: access denied    # allowed by NetworkPolicy (portal namespace) but the SA principal is not portal-web\nAnd in Prometheus: sum by (connection_security_policy) (rate(istio_requests_total{destination_workload_namespace=\"claims\"}[5m])) shows only mutual_tls."
            ),
          ],
        },
      ],
    },
    {
      slug: "kyverno-verify-images-pipeline-gate",
      objective:
        "Integrate security scanning and compliance checks into deployment pipelines: image and manifest scanning, signature verification, and gates in Tekton or Argo",
      kind: "case",
      title: "Close the gap between a scanned pipeline and an unscanned deploy",
      brief:
        "The fictional pharmacy chain Linwood Health scans images in CI with Trivy and signs them with cosign, yet an unsigned image with a critical CVE reached production last week via a manually edited manifest. Review the setup and add the missing controls.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Pipeline (Tekton), relevant tasks:\n  - name: scan\n    taskRef: {name: trivy-scanner}\n    params: [{name: ARGS, value: [\"image\", \"--severity\", \"CRITICAL\", \"$(params.image)\"]}]\n  - name: sign\n    runAfter: [scan]\n    taskRef: {name: cosign-sign}\n\nIncident notes:\n - The developer built an image locally, pushed it to registry.linwood.example/pharmacy/orders-api:hotfix-3 and changed the image tag in overlays/prod by PR; the PR was approved.\n - Argo CD synced it. No admission control checks signatures.\n - Trivy in CI reported 0 CRITICAL for the pipeline-built image; the hotfix image was never scanned.\n - trivy-scanner task: exit code is 0 regardless of findings (no --exit-code flag).",
          ask: "Explain the gaps across pipeline and cluster, then write the admission policy that would have blocked the deployment and the pipeline fixes.",
          parts: [
            part(
              "Gaps",
              "The pipeline's scan does not fail the run (Trivy without --exit-code 1 reports and continues), scanning and signing only cover pipeline-built images, Git review approved a tag (mutable, unscanned) rather than a digest, and the cluster has no admission gate -- so any image anyone can push and reference in Git deploys; the controls were in the wrong place to stop a bypass.",
              "Four gaps line up: (1) trivy-scanner never fails -- without --exit-code 1 a CRITICAL finding is a log line, not a gate; (2) scanning and signing are properties of the pipeline, not of the image allowed into the cluster, so an image built on a laptop has neither; (3) the PR approved a mutable tag; nothing required a digest or evidence of provenance; (4) admission accepted whatever Git said. Scanning in CI is necessary but the enforcement point must be the cluster: only images carrying a valid signature and an attestation of a clean scan may run."
            ),
            part(
              "Kyverno verifyImages policy",
              "A ClusterPolicy with verifyImages for the company registry requiring a cosign signature from the CI keyless identity (or key) and an attestation (predicateType vulnerability scan) whose count of CRITICAL entries in scanner.result.Results[].Vulnerabilities is zero, mutateDigest true so tags are rewritten to digests, failureAction Enforce on the verifyImages entry, scoped to tenant namespaces.",
              "apiVersion: kyverno.io/v1\nkind: ClusterPolicy\nmetadata: {name: verify-signed-scanned-images}\nspec:\n  webhookTimeoutSeconds: 30\n  background: false\n  rules:\n  - name: require-signature-and-scan\n    match:\n      any:\n      - resources:\n          kinds: [Pod]\n          namespaceSelector:\n            matchExpressions: [{key: tenant, operator: Exists}]\n    verifyImages:\n    - imageReferences: [\"registry.linwood.example/*\"]\n      failureAction: Enforce\n      mutateDigest: true\n      verifyDigest: true\n      required: true\n      attestors:\n      - entries:\n        - keyless:\n            subject: \"https://tekton.linwood.example/pipelines/build-and-promote\"\n            issuer: \"https://oidc.linwood.example\"\n            rekor: {url: https://rekor.sigstore.dev}\n      attestations:\n      - type: https://cosign.sigstore.dev/attestation/vuln/v1\n        attestors:\n        - entries:\n          - keyless:\n              subject: \"https://tekton.linwood.example/pipelines/build-and-promote\"\n              issuer: \"https://oidc.linwood.example\"\n        conditions:\n        - all:\n          - key: \"{{ scanner.result.Results[].Vulnerabilities[?Severity == 'CRITICAL'][] | length(@) }}\"\n            operator: Equals\n            value: 0\nThe condition reads the predicate Trivy actually writes with --format cosign-vuln: scanner.result is the Trivy JSON report, so criticals are counted from Results[].Vulnerabilities[].Severity. (A key like scanner.result.summary.criticalCount does not exist in that report; with a default of 0 it would let every image through.) A laptop-built image has no signature from the pipeline identity, so the Pod is rejected: \"image verification failed ... no matching signatures\". A pipeline image whose vulnerability attestation shows criticals is rejected on the condition. mutateDigest rewrites tags to digests on admission so the running image cannot be swapped under a tag."
            ),
            part(
              "Pipeline fixes",
              "Trivy with --exit-code 1 --severity CRITICAL (and --ignore-unfixed as policy decides) so the run fails; cosign attest with the Trivy JSON as a vuln predicate after signing; the update-config task commits digests, and a config-repo check rejects tags; a policy in Argo CD (or Kyverno on the Application) as a second gate is optional.",
              "scan task: ARGS: [\"image\", \"--exit-code\", \"1\", \"--severity\", \"CRITICAL\", \"--format\", \"cosign-vuln\", \"--output\", \"$(workspaces.source.path)/vuln.json\", \"$(params.image)@$(tasks.build.results.IMAGE_DIGEST)\"] -- now a critical finding fails the PipelineRun before anything is signed. sign task: cosign sign --yes then cosign attest --yes --type vuln --predicate vuln.json $(params.image)@$(digest), so the clean result travels with the image. update-config already commits digests; add a CI check on the config repo (a Kyverno CLI or conftest run) that fails a PR whose image field has a tag instead of @sha256. The developer's hotfix path becomes: push to a branch, let the pipeline build/scan/sign it, promote the digest -- the only path that produces an admissible image."
            ),
          ],
        },
        {
          text: "After rollout, the on-call sees:\n$ kubectl -n pharmacy rollout status deploy/orders-api\nerror: deployment \"orders-api\" exceeded its progress deadline\n$ kubectl -n pharmacy get events --field-selector reason=FailedCreate | tail -1\n... Error creating: admission webhook \"mutate.kyverno.svc-fail\" denied the request: resource Pod/pharmacy/orders-api-6b7c8d9f-x2k1p was blocked due to the following policies: verify-signed-scanned-images: require-signature-and-scan: 'failed to verify image registry.linwood.example/pharmacy/orders-api@sha256:4e1a...: .attestors[0].entries[0].keyless: no matching signatures'\n$ kubectl -n pharmacy get deploy orders-api -o jsonpath='{.spec.template.spec.containers[0].image}'\nregistry.linwood.example/pharmacy/orders-api@sha256:4e1a...",
          ask: "Explain what the on-call is seeing and the right response.",
          parts: [
            part(
              "What happened",
              "The policy is doing its job: the Deployment references an image that has no signature from the pipeline identity (likely an image built before signing was introduced, or a tag-to-digest of an unsigned image), so new Pods are refused and the rollout stalls; existing pods keep running because admission applies to new Pods only.",
              "Kyverno denied Pod creation because the digest sha256:4e1a... carries no signature from the pipeline's keyless identity. Existing orders-api pods are unaffected -- admission happens at Pod creation -- so there is no outage, but the Deployment cannot roll or heal. Likely causes: an image built before signing started (a long-lived digest being re-rolled), or someone promoted a digest that skipped the pipeline. Either way the policy did what last week's incident needed."
            ),
            part(
              "Response",
              "Confirm with cosign verify (and cosign tree) that the image is unsigned, rebuild through the pipeline and promote the signed digest; for the backlog of pre-policy images, run the policy in Audit first or grant a time-boxed PolicyException per image with an owner rather than relaxing the policy; keep a record.",
              "$ cosign verify --certificate-identity https://tekton.linwood.example/pipelines/build-and-promote --certificate-oidc-issuer https://oidc.linwood.example registry.linwood.example/pharmacy/orders-api@sha256:4e1a...\nError: no matching signatures\nThe fix is to produce a signed artifact: re-run the pipeline for the same source commit and promote the resulting digest. If many services still run pre-policy digests, a safer rollout would have been failureAction: Audit on the verifyImages rule for a week with the PolicyReport listing offenders, then Enforce; for anything that genuinely cannot be rebuilt today, a PolicyException naming the exact image digest, with an owner and an expiry, is the controlled way through -- not switching the policy off."
            ),
          ],
        },
      ],
    },
  ],
};
