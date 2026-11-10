import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Kyverno Certified Associate (KCA).
//
// Aligned to the six KCA domains (Fundamentals of Kyverno 18%, Installation,
// Configuration, and Upgrades 18%, Kyverno CLI 12%, Applying Policies 10%,
// Writing Policies 32%, Policy Management 10%), read on 2026-11-08 from
// github.com/cncf/curriculum (KCA_Curriculum.pdf) and
// training.linuxfoundation.org. Density (docs/labs.md, hybrid):
// 2 / 2 / 2 / 2 / 3 / 1.
//
// Labs write kyverno.io/v1 (and v2 for exceptions and cleanup) policies and
// Kyverno CLI tests against authored kubectl and kyverno output. Every lab is
// needs_expert_review.

export const KCA_LABS: SeedLabSet = {
  trackCode: "KCA",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/KCA_Curriculum.pdf", "exam_outline", "2026-11-08"),
    source("https://training.linuxfoundation.org/certification/kyverno-certified-associate-kca/", "exam_outline", "2026-11-08"),
    source("https://kyverno.io/docs/writing-policies/", "reference", "2026-11-08"),
    source("https://kyverno.io/docs/kyverno-cli/", "reference", "2026-11-08"),
    source("https://kyverno.io/blog/2024/10/30/announcing-kyverno-release-1.13", "reference", "2026-11-09"),
  ],
  labs: [
    // ----------------------------------------------------------------- 18%
    {
      slug: "read-a-policy",
      objective: "Interpret Kyverno policies and rules: ClusterPolicy and Policy, rule types (validate, mutate, generate, verifyImages, cleanup), match and exclude blocks, and how rules are evaluated",
      kind: "case",
      title: "Explain what a Kyverno policy will do before it is applied",
      brief:
        "A platform engineer at the fictional retailer Wrenfield is about to apply a ClusterPolicy a colleague wrote and asks you to explain exactly what it will do to which resources, so nothing surprises the application teams.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "apiVersion: kyverno.io/v1\nkind: ClusterPolicy\nmetadata:\n  name: workload-hygiene\nspec:\n  background: true\n  rules:\n  - name: require-team-label\n    match:\n      any:\n      - resources:\n          kinds: [Deployment, StatefulSet]\n    exclude:\n      any:\n      - resources:\n          namespaces: [kube-system, platform]\n    validate:\n      failureAction: Enforce\n      message: \"The label team is required.\"\n      pattern:\n        metadata:\n          labels:\n            team: \"?*\"\n  - name: default-resources\n    match:\n      any:\n      - resources:\n          kinds: [Pod]\n    mutate:\n      patchStrategicMerge:\n        spec:\n          containers:\n          - (name): \"*\"\n            resources:\n              requests:\n                +(memory): \"64Mi\"\n                +(cpu): \"50m\"",
          ask: "Describe rule by rule what happens, to which resources, at admission and in the background, and name two things an application team might not expect.",
          parts: [
            part(
              "require-team-label",
              "A validate rule on Deployments and StatefulSets in every namespace except kube-system and platform; with Enforce, a create or update without a non-empty team label is rejected at admission with the message; with background: true, existing resources that lack the label show as failures in policy reports but are not changed or deleted; the pattern ?* means at least one character.",
              "Rule 1 matches Deployments and StatefulSets (not Pods, not Jobs) anywhere except the two excluded namespaces. At admission, because the rule's validate.failureAction is Enforce, a create or update whose metadata.labels.team is missing or empty is blocked and the API returns 'The label team is required.' The pattern ?* means 'any string of one or more characters'. background: true also scans existing Deployments and StatefulSets and records fail results in PolicyReports -- it never rejects or edits what is already running."
            ),
            part(
              "default-resources",
              "A mutate rule on Pods (all namespaces -- note it has no exclude) that adds memory and cpu requests to every container only where they are absent (the +() anchor adds if not present) without touching containers that set their own; (name): \"*\" is a conditional anchor matching every container; mutation happens at admission only (no background mutation of existing Pods).",
              "Rule 2 matches every Pod in every namespace, including kube-system -- the exclude on rule 1 does not carry over. At admission it patches each container (the (name): \"*\" conditional anchor selects all of them) adding requests.memory 64Mi and requests.cpu 50m only if those keys are absent -- that is what the +() add-if-not-present anchor means; containers with their own requests are left alone. Mutations apply only to admission requests; existing Pods are not rewritten."
            ),
            part(
              "Evaluation and surprises",
              "Rules in a policy are evaluated independently per matching resource; mutate rules run before validate across the admission chain (Kyverno's mutating webhook fires first); surprises: the Pod rule also hits kube-system and operator-managed Pods, and because Kyverno autogenerates Pod rules for controllers by default, the mutate will also be applied at the Deployment template level -- and Deployments whose team label is missing cannot be updated through the Deployment object once Enforce is on (apply, edit, set image), while kubectl scale still works because it writes the scale subresource, which a rule matching Deployment does not cover unless it lists Deployment/scale.",
              "Each rule is matched and evaluated on its own. Kubernetes calls Kyverno's mutating webhook before its validating webhook, so defaults are added before validations run (useful when a validate rule depends on a mutated field). Two surprises: (1) the Pod mutation has no namespace exclusion, so system Pods and operator-created Pods get requests added too -- usually unwanted in kube-system; (2) autogen means Kyverno also generates the mutate for Deployment/StatefulSet/Job templates, so controllers' templates are patched, not just Pods. And with Enforce, any update to a Deployment lacking team through the Deployment object itself (kubectl apply, edit, set image) is refused until the label is added, so teams with unlabelled workloads cannot ship changes the moment this is applied. kubectl scale is not blocked: it writes the Deployment/scale subresource, and a rule that matches kind Deployment only covers scale requests if its kinds list Deployment/scale too."
            ),
          ],
        },
        {
          text: "The teams ask for a staged rollout: 'tell us what would fail before you block us'. The engineer also wants the Pod mutation to skip kube-system and anything owned by the platform team.",
          ask: "Rewrite the relevant settings for the staged rollout and the exclusion, and explain how Audit mode reports.",
          parts: [
            part(
              "Audit first",
              "Set the validate rule's failureAction: Audit (with failureActionOverrides on the rule to Enforce in chosen namespaces, if wanted), keep background: true, and read the resulting PolicyReports per namespace to see every Deployment/StatefulSet that would fail; flip to Enforce once reports are clean or exceptions exist.",
              "spec:\n  background: true\n  rules:\n  - name: require-team-label\n    ...\n    validate:\n      failureAction: Audit\n      message: \"The label team is required.\"\n      ...\n(failureAction lives on each validate rule; the policy-wide spec.validationFailureAction and validationFailureActionOverrides are deprecated since Kyverno 1.13.) In Audit, admission is never blocked; violations are recorded as fail results in the PolicyReport of the resource's namespace (kubectl get policyreport -A, kubectl describe polr -n <ns>), and the background controller fills in results for everything already running. Teams get a list of what would break. failureActionOverrides on the rule lets you Enforce in some namespaces and Audit in others during the transition. When reports are clean (or PolicyExceptions cover the leftovers), switch to Enforce."
            ),
            part(
              "Exclusion for the mutate rule",
              "Add an exclude block to default-resources: namespaces [kube-system] and a selector or namespace for platform-owned workloads (e.g. namespaces [platform] or a namespaceSelector matching team=platform), so system and platform Pods are untouched.",
              "  - name: default-resources\n    match:\n      any:\n      - resources:\n          kinds: [Pod]\n    exclude:\n      any:\n      - resources:\n          namespaces: [kube-system, platform]\n      - resources:\n          namespaceSelector:\n            matchLabels: {team: platform}\n    mutate: ...\nexclude.any means a Pod is skipped if it is in kube-system or platform, or in any namespace labelled team=platform. Each rule carries its own match/exclude; nothing is inherited between rules."
            ),
          ],
        },
      ],
    },
    {
      slug: "admission-flow-and-failure-policy",
      objective: "Recognise how admission controllers work: validating and mutating admission webhooks, how Kyverno registers them, failure policies and the admission request lifecycle",
      kind: "build",
      title: "Trace a kubectl apply through Kyverno's webhooks and set the failure policy",
      brief:
        "The fictional airline Skelmore Air runs Kyverno. Their SRE lead asks for a written explanation for the runbook: what happens, in order, when a developer runs kubectl apply -f deployment.yaml on a cluster with Kyverno installed, where Kyverno can slow or block it, and what should happen if Kyverno itself is down. They want the webhook settings chosen deliberately.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe the request lifecycle and Kyverno's place in it, how Kyverno registers its webhooks, and choose and justify failure policy and timeout settings.",
          parts: [
            part(
              "Request lifecycle",
              "The API server authenticates and authorizes the request, runs mutating admission (built-in plugins, then MutatingWebhookConfigurations such as Kyverno's), validates the object schema, runs validating admission (ValidatingAdmissionPolicy and webhooks such as Kyverno's), then persists to etcd; controllers act afterwards; Kyverno's generate and background work happens after admission.",
              "kubectl apply sends the Deployment to the API server, which: 1 authenticates the user, 2 authorizes with RBAC, 3 runs mutating admission -- built-in mutators, then every MutatingWebhookConfiguration, including Kyverno's resource mutating webhook, which applies mutate rules and returns a JSON patch -- 4 validates the (now mutated) object's schema, 5 runs validating admission -- ValidatingAdmissionPolicies and ValidatingWebhookConfigurations, including Kyverno's, which evaluates validate and verifyImages rules and may reject with the rule's message -- 6 writes to etcd and returns. Only then do controllers create Pods (each going through the same chain), and Kyverno's background controller handles generate rules and background scans asynchronously."
            ),
            part(
              "How Kyverno registers",
              "The admission controller creates and manages its MutatingWebhookConfiguration and ValidatingWebhookConfiguration (kyverno-resource-mutating-webhook-cfg, kyverno-resource-validating-webhook-cfg, plus policy and exception webhooks) and narrows their rules to the kinds and operations the installed policies match, so the API server only calls Kyverno for relevant resources; it serves TLS with a certificate it manages (or a provided one).",
              "Kyverno's admission controller writes the webhook configurations itself and keeps them in sync with the loaded policies: kubectl get mutatingwebhookconfigurations,validatingwebhookconfigurations | grep kyverno shows resource webhooks (scoped to the kinds and operations your policies match -- add a Pod policy and Pods appear in the rules), plus webhooks that validate Kyverno's own policy resources and PolicyExceptions. The webhooks point at the kyverno-svc Service with a CA bundle for the certificate Kyverno rotates (or one you supply). Because the rules are generated from policies, a cluster with no Pod policies never pays webhook latency for Pods."
            ),
            part(
              "Failure policy",
              "Choose per risk: failurePolicy Fail (default for the resource webhooks) means that if Kyverno is unreachable or times out the request is rejected -- secure, but a Kyverno outage blocks deployments; Ignore lets requests through unvalidated during an outage -- available, but a window for bad resources; recommend Fail for production with Kyverno run highly available, and exclude kube-system and Kyverno's own namespace from the webhooks so the cluster can always recover.",
              "Set spec.failurePolicy: Fail on policies that protect security (Pod Security-style validations, image verification) so an outage cannot be used to sneak resources in, and run Kyverno with 3 admission replicas and a PodDisruptionBudget so that outage is unlikely. Use Ignore only for convenience policies (labels, defaults) where availability matters more than coverage; Kyverno sets the webhook's failure policy from the strictest policy it serves. Always keep kube-system and kyverno's namespace in the resource filters/webhook namespaceSelector exclusions: if the webhook fails closed and Kyverno's own Pods cannot be recreated, the cluster cannot heal itself."
            ),
            part(
              "Timeouts and where latency comes from",
              "webhookTimeoutSeconds (per policy, default 10, max 30) bounds how long the API server waits for Kyverno; latency comes from policy count and complexity, context lookups (apiCall, configMap), image verification network calls and Kyverno's own load; recommend keeping policies cheap, caching, and watching admission latency metrics; the runbook should say a timeout counts as a failure under Fail.",
              "Each policy can set spec.webhookTimeoutSeconds (default 10, maximum 30); the API server uses the largest across policies for that webhook. A slow Kyverno -- many rules, apiCall context lookups to external services, verifyImages fetching signatures from a registry, or an overloaded admission controller -- shows up as kubectl apply taking seconds, and a timeout is treated as a webhook failure (so under Fail, the request is rejected). Keep rules selective (narrow match), prefer configMap context over live apiCalls, and alert on kyverno_admission_review_duration_seconds. The runbook line: 'If applies hang or fail with context deadline exceeded, check Kyverno admission controller health before blaming the application.'"
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 18%
    {
      slug: "helm-install-ha",
      objective: "Install and configure Kyverno with Helm: chart values for the admission, background, cleanup and reports controllers, resource filters and webhook settings",
      kind: "build",
      title: "Install Kyverno for production with Helm",
      brief:
        "The fictional payments company Aldgate Pay wants Kyverno on its production cluster with: the admission controller highly available, the background and reports controllers enabled, the cleanup controller enabled for TTL-based deletion, Kyverno never touching kube-system or its own namespace, and resource requests set so the scheduler places it sensibly. They want the values in Git.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Helm values and install commands, and explain what each controller does and why its replica count and settings are chosen.",
          parts: [
            part(
              "Install commands",
              "helm repo add kyverno https://kyverno.github.io/kyverno, helm install kyverno kyverno/kyverno -n kyverno --create-namespace -f values.yaml, with a pinned chart version; explains the chart installs CRDs and the four controllers.",
              "helm repo add kyverno https://kyverno.github.io/kyverno && helm repo update\nhelm install kyverno kyverno/kyverno --version <pinned> -n kyverno --create-namespace -f kyverno-values.yaml\nkubectl -n kyverno get pods   # admission, background, cleanup and reports controllers\nThe chart installs the CRDs (ClusterPolicy, Policy, PolicyException, CleanupPolicy, UpdateRequest, reports) and one Deployment per controller. Pin the chart version in Git next to the values file."
            ),
            part(
              "Admission controller: HA",
              "admissionController.replicas: 3 with a PodDisruptionBudget and anti-affinity spread, resources requests/limits, and the webhook failurePolicy left at Fail; explains it is the in-path component -- the API server waits on it -- so it must survive node loss and upgrades.",
              "admissionController:\n  replicas: 3\n  podDisruptionBudget:\n    enabled: true\n    minAvailable: 1\n  container:\n    resources:\n      requests: {cpu: 200m, memory: 384Mi}\n      limits: {memory: 768Mi}\n  antiAffinity:\n    enabled: true\nThe admission controller serves the webhooks; every create/update of a matched kind waits for it, so an outage with failurePolicy Fail blocks deployments. Three replicas across nodes plus a PDB keep at least one answering during drains and upgrades. Only the admission controller is in the request path; its replicas are leader-electionless (all serve), unlike the others."
            ),
            part(
              "Background, reports and cleanup controllers",
              "backgroundController.enabled true (replicas 2 with leader election) for generate rules, mutate-existing and background scans; reportsController.enabled true for PolicyReports; cleanupController.enabled true for CleanupPolicies and TTL labels; explains these are out of the request path and leader-elected, so one active replica suffices and extra replicas are for failover.",
              "backgroundController:\n  enabled: true\n  replicas: 2\nreportsController:\n  enabled: true\n  replicas: 2\ncleanupController:\n  enabled: true\n  replicas: 2\nThe background controller runs generate rules (creating resources on triggers), mutateExistingOnPolicyUpdate and the periodic scans that evaluate validate rules against existing resources. The reports controller turns those results into PolicyReports/ClusterPolicyReports. The cleanup controller runs CleanupPolicies and deletes resources whose cleanup.kyverno.io/ttl label has expired. All three use leader election, so the second replica is a warm standby, not extra throughput."
            ),
            part(
              "Keep Kyverno away from system namespaces",
              "config.resourceFilters (or the default filters) excluding kube-system, kube-public, kube-node-lease and the kyverno namespace, and config.webhooks namespaceSelector matchExpressions excluding those namespaces so the API server never even calls Kyverno for them; explains the two layers.",
              "config:\n  resourceFilters:\n  - \"[Event,*,*]\"\n  - \"[*/*,kube-system,*]\"\n  - \"[*/*,kube-public,*]\"\n  - \"[*/*,kube-node-lease,*]\"\n  - \"[Node,*,*]\"\n  - \"[APIService,*,*]\"\n  - \"[TokenReview,*,*]\"\n  - \"[SubjectAccessReview,*,*]\"\n  - \"[*/*,kyverno,*]\"\n  webhooks:\n    namespaceSelector:\n      matchExpressions:\n      - key: kubernetes.io/metadata.name\n        operator: NotIn\n        values: [kube-system, kyverno]\nresourceFilters make Kyverno skip matching requests internally; the webhook namespaceSelector stops the API server from sending them at all, which is what protects the cluster if Kyverno fails closed. Both: belt and braces."
            ),
            part(
              "Verifying the install",
              "kubectl -n kyverno get deploy shows four controllers Ready; kubectl get crds | grep kyverno lists the CRDs; kubectl get validatingwebhookconfigurations shows the Kyverno webhooks (resource webhooks appear once policies exist); apply a trivial Audit policy and check a PolicyReport appears.",
              "kubectl -n kyverno get deploy                         # kyverno-admission-controller 3/3, background 2/2, cleanup 2/2, reports 2/2\nkubectl get crd | grep kyverno.io                     # clusterpolicies, policies, policyexceptions, cleanuppolicies, updaterequests, ...\nkubectl get validatingwebhookconfigurations | grep kyverno   # policy/exception webhooks now; resource webhooks after the first policy\nkubectl apply -f - <<'EOF'\napiVersion: kyverno.io/v1\nkind: ClusterPolicy\nmetadata: {name: smoke}\nspec:\n  rules:\n  - name: has-app-label\n    match: {any: [{resources: {kinds: [Pod]}}]}\n    validate: {failureAction: Audit, message: app label, pattern: {metadata: {labels: {app: \"?*\"}}}}\nEOF\nkubectl get polr -A | head    # reports with pass/fail counts within a minute"
            ),
          ],
        },
      ],
    },
    {
      slug: "upgrade-breaks-generate-rbac",
      objective: "Configure Kyverno RBAC, roles and permissions: what the controllers may read and write, and the extra ClusterRoles a generate rule needs",
      kind: "case",
      title: "Fix a generate rule that stopped working after an upgrade",
      brief:
        "At the fictional university Lindum, a ClusterPolicy generates a default-deny NetworkPolicy and a ResourceQuota in every new namespace. After a Kyverno upgrade, new namespaces get neither.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl create ns demo-team\n$ kubectl -n demo-team get networkpolicy,resourcequota\nNo resources found in demo-team namespace.\n\n$ kubectl get updaterequests -n kyverno | head -3\nNAME       POLICY             RULETYPE   RESOURCEKIND   RESOURCENAME   RESOURCENAMESPACE   STATUS   AGE\nur-7x2kq   namespace-defaults  generate   Namespace      demo-team                          Failed   40s\n\n$ kubectl -n kyverno describe updaterequest ur-7x2kq | grep -A2 Message\n  Message:  failed to create resource: networkpolicies.networking.k8s.io is forbidden: User \"system:serviceaccount:kyverno:kyverno-background-controller\" cannot create resource \"networkpolicies\" in API group \"networking.k8s.io\" in the namespace \"demo-team\"\n\n$ kubectl get clusterrole | grep kyverno-background\nkyverno:background-controller\nkyverno:background-controller:core",
          ask: "Explain why generation fails and which component does it, then fix the permissions the right way.",
          parts: [
            part(
              "Who generates and why it fails",
              "Generate rules are executed by the background controller (not the admission controller): on the trigger (a new Namespace) it records an UpdateRequest and then creates the target resources using its own ServiceAccount; that ServiceAccount's ClusterRoles cover Kyverno's core needs but not arbitrary target kinds, so creating a NetworkPolicy is forbidden; the upgrade replaced a hand-edited ClusterRole with the chart's default, removing the permission someone had added by hand.",
              "Admission only records that the namespace matched; the background controller performs the generation asynchronously -- the UpdateRequest is its work item -- using system:serviceaccount:kyverno:kyverno-background-controller. Kyverno's shipped ClusterRoles grant what Kyverno itself needs, not create on every kind a policy might generate; NetworkPolicy and ResourceQuota permissions must be granted explicitly. Before the upgrade someone had edited kyverno:background-controller directly; helm upgrade rewrote that ClusterRole from the chart, and the hand-made grant vanished."
            ),
            part(
              "The right fix",
              "Create a separate ClusterRole with the aggregation label rbac.kyverno.io/aggregate-to-background-controller: \"true\" granting create/update/delete/get/list/watch on networkpolicies and resourcequotas; Kyverno's ClusterRole aggregates it automatically, and the chart will not overwrite it on the next upgrade (or add it via the chart's rbac.extraRoles values).",
              "apiVersion: rbac.authorization.k8s.io/v1\nkind: ClusterRole\nmetadata:\n  name: kyverno:generate-namespace-defaults\n  labels:\n    rbac.kyverno.io/aggregate-to-background-controller: \"true\"\nrules:\n- apiGroups: [networking.k8s.io]\n  resources: [networkpolicies]\n  verbs: [create, update, patch, delete, get, list, watch]\n- apiGroups: [\"\"]\n  resources: [resourcequotas]\n  verbs: [create, update, patch, delete, get, list, watch]\nThe label makes Kubernetes aggregate these rules into kyverno:background-controller, which is an aggregated ClusterRole; the object is yours, so Helm never touches it. Put it in Git with the policies. Then kubectl -n kyverno delete updaterequest ur-7x2kq (or wait for retry) and kubectl create ns demo-team2 to confirm both resources appear."
            ),
            part(
              "Checking permissions generally",
              "kubectl auth can-i --list --as=system:serviceaccount:kyverno:kyverno-background-controller to see effective rights, the same for the admission controller (which needs read access for context apiCalls and image verification) and the cleanup controller (delete on the kinds it cleans up); mentions mutate-existing targets and apiCall contexts also need RBAC on the relevant controller.",
              "kubectl auth can-i create networkpolicies --as=system:serviceaccount:kyverno:kyverno-background-controller -n demo-team   # yes after the fix\nkubectl auth can-i --list --as=system:serviceaccount:kyverno:kyverno-background-controller | grep -E 'networkpolicies|resourcequotas'\nThe same pattern applies elsewhere: a mutate rule with targets (mutate existing resources) runs in the background controller and needs update on those kinds; a CleanupPolicy runs in the cleanup controller (aggregate-to-cleanup-controller label) and needs delete; a context apiCall in a validate rule runs in the admission controller and needs get/list on what it queries (aggregate-to-admission-controller). Grant each controller only what its policies need."
            ),
          ],
        },
        {
          text: "Generation works again. The team then upgrades Kyverno one more minor version and the admission controller logs:\n\n$ kubectl -n kyverno logs deploy/kyverno-admission-controller --tail=3\n... \"msg\"=\"policy validation failed\" \"policy\"=\"namespace-defaults\" \"error\"=\"spec.rules[0].generate.synchronize ... unknown field\"\n... \"msg\"=\"webhook configuration updated\"\n\n$ helm -n kyverno history kyverno | tail -2\n5   ... deployed   kyverno-3.x   Upgrade complete\n$ kubectl get crd clusterpolicies.kyverno.io -o jsonpath='{.metadata.labels.app\\.kubernetes\\.io/version}'\n(older version than the deployed chart)",
          ask: "Explain what went wrong with this upgrade and the correct upgrade procedure.",
          parts: [
            part(
              "CRDs were not upgraded",
              "Helm does not upgrade CRDs it installed from the chart's crds/ directory on helm upgrade; the controllers are at the new version but the ClusterPolicy CRD schema is old, so fields the new version expects (or renamed) fail validation; the Kyverno chart manages CRDs through templates/flags, and the installed CRD version label confirms the mismatch.",
              "Helm's rule: CRDs placed in a chart's crds/ directory are installed on first install and never upgraded or deleted by Helm. The Kyverno chart can render CRDs as templates (crds.install) precisely to avoid this, but if the earlier install used a mode that left them static, the controllers now run a newer version against an older CRD schema -- hence 'unknown field' validation errors for policy fields the new release defines differently. The CRD's version label being older than the chart proves it."
            ),
            part(
              "Correct procedure",
              "Read the release notes for the target version (breaking changes between minors, CLI and policy syntax), back up policies (kubectl get cpol,pol -A -o yaml), upgrade CRDs first (kubectl apply the CRDs from the chart or set crds.install/upgrade so Helm manages them), then helm upgrade the controllers, then verify policies load (kubectl get cpol shows READY True) and run the Kyverno CLI tests against the new version; roll back with helm rollback plus the previous CRDs if needed.",
              "1 Read the release notes for every minor you cross -- Kyverno documents breaking changes (API versions such as v2 for exceptions and cleanup, renamed fields, CLI changes). 2 Back up: kubectl get clusterpolicies,policies,policyexceptions,cleanuppolicies -A -o yaml > kyverno-backup.yaml. 3 Upgrade CRDs first so the schema is ready: either helm upgrade with the chart managing CRDs (crds.install: true and the chart's migration flags) or kubectl apply -f the CRDs for the target version. 4 helm upgrade kyverno kyverno/kyverno --version <target> -n kyverno -f values.yaml. 5 Verify: kubectl get cpol -o wide shows every policy READY True; kubectl -n kyverno logs the admission controller for validation errors; kyverno test on the policy repo with the matching CLI version; create a test resource that should be blocked. 6 If broken: helm rollback and re-apply the previous CRDs. Never skip several minors in one step."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 12%
    {
      slug: "cli-apply-offline",
      objective: "Apply policies offline with kyverno apply against manifests or a cluster, with variables and values files",
      kind: "build",
      title: "Check manifests against policies in CI before they reach the cluster",
      brief:
        "The fictional media company Carrick Studios keeps its Kyverno policies in a Git repository and its application manifests in another. Developers want to know in a pull request whether their manifests would be blocked, without a cluster. One policy uses a variable from the admission request (request.namespace) and one uses a context ConfigMap lookup for allowed registries.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the kyverno apply commands for CI, including how to supply the variables and the ConfigMap data, and explain how to read the output and when offline evaluation differs from the cluster.",
          parts: [
            part(
              "Basic offline apply",
              "kyverno apply ./policies/ --resource ./manifests/ (directories or files), which evaluates every policy against every resource and prints pass/fail per rule; with --detailed-results or -o yaml for machine-readable PolicyReport output; exits non-zero on failures with Enforce policies (and --audit-warn to surface Audit results).",
              "kyverno apply ./policies/ --resource ./manifests/\n\npolicy require-labels -> resource apps/Deployment/checkout failed:\n1. check-team: validation error: The label team is required. rule check-team failed at path /metadata/labels/team/\n\npass: 11, fail: 1, warn: 0, error: 0, skip: 2\nThe CLI loads the policies and the manifests and runs the admission-time evaluation locally. A fail on an Enforce policy returns a non-zero exit code, so the CI job fails. -o yaml prints a PolicyReport you can archive; --audit-warn makes Audit-mode failures count as warnings in the exit code logic."
            ),
            part(
              "Variables the request would supply",
              "Admission variables such as {{request.namespace}} or {{request.userInfo}} do not exist offline; provide them with --set request.namespace=payments (or via a values file's globalValues/namespaceSelector sections) so the rule evaluates as it would in the cluster; explains the CLI reports variables it could not resolve.",
              "kyverno apply ./policies/ --resource ./manifests/ --set request.namespace=payments\nOffline there is no admission request, so request.* variables are empty unless supplied. --set gives one value for the run; a values file can map namespaces to labels (namespaceSelector) so rules with namespace selectors work: \nvalues.yaml:\n  namespaceSelector:\n  - name: payments\n    labels: {team: payments, env: prod}\nkyverno apply ./policies/ --resource ./manifests/ -f values.yaml\nUnresolved variables make the rule skip or error, and the CLI says so -- read those lines rather than assuming a pass."
            ),
            part(
              "Context data: ConfigMap lookups",
              "For a rule with context configMap (allowed registries), supply the ConfigMap's data in the values file under policies[].rules[].values or by including the ConfigMap manifest in the --resource set / --cluster; apiCall contexts need --cluster (live) or stubbed values; explains why the CLI cannot otherwise know cluster state.",
              "values.yaml:\n  policies:\n  - name: restrict-registries\n    rules:\n    - name: check-registry\n      values:\n        allowed-registries.data.registries: \"registry.carrick.example,ghcr.io/carrick\"\nkyverno apply ./policies/ --resource ./manifests/ -f values.yaml\nA context entry like configMap: {name: allowed-registries, namespace: kyverno} reads cluster state the CLI does not have; the values file injects the data under the variable name the rule uses. For apiCall contexts, either run with --cluster (the CLI reads from your kubeconfig) or supply the expected result the same way. Keep the values file in the policy repo so CI and the cluster agree on test inputs."
            ),
            part(
              "Where offline differs",
              "Mutations: kyverno apply prints the mutated resource (useful) but the real admission chain may add defaults first; autogen rules are applied to controllers offline too; image verification needs registry access (--registry) or is skipped; exceptions and reports from the live cluster are not considered unless --cluster is used; so CI is a strong pre-check, not a replacement for Audit mode on the cluster.",
              "Expect a few differences from a live cluster: other admission plugins' defaults are not applied before Kyverno sees the manifest (so a rule depending on a defaulted field may differ); verifyImages rules need --registry to fetch signatures and are otherwise skipped; PolicyExceptions in the cluster are not applied unless you pass them as resources or use --cluster; and the CLI version should match the installed Kyverno so rule semantics align. CI catches the vast majority of violations early; Audit mode on the cluster remains the final check."
            ),
          ],
        },
      ],
    },
    {
      slug: "cli-tests-and-jp",
      objective: "Write tests with kyverno test: the kyverno-test.yaml layout, expected results per rule and resource, and running tests in CI",
      kind: "build",
      title: "Write a test suite for a policy and debug a JMESPath expression",
      brief:
        "The fictional insurer Maplewood has a ClusterPolicy disallow-latest-tag with one validate rule, require-image-tag, that denies any container whose image has no tag or uses :latest. The policy author wants a kyverno test suite proving a compliant Deployment passes, a :latest Deployment fails, an untagged image fails, and that the rule is skipped for a Job in the excluded namespace ci. They also have a JMESPath expression that is not matching as expected.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the test directory layout and kyverno-test.yaml, run it, and show how kyverno jp is used to debug an expression.",
          parts: [
            part(
              "Layout",
              "A directory with the policy file, a resources file (or several) containing the test Deployments and the Job, and kyverno-test.yaml listing policies, resources and expected results; run with kyverno test ./tests/disallow-latest (or the repo root, which discovers every kyverno-test.yaml).",
              "tests/disallow-latest/\n  policy.yaml            # the ClusterPolicy\n  resources.yaml         # good-deploy, latest-deploy, untagged-deploy, ci-job\n  kyverno-test.yaml\nkyverno test ./tests   # recurses and runs every kyverno-test.yaml it finds\nKeep tests next to the policy in the policy repo; CI runs kyverno test . on every pull request so a policy change that alters behaviour fails loudly."
            ),
            part(
              "kyverno-test.yaml",
              "apiVersion cli.kyverno.io/v1alpha1, kind Test, with policies and resources paths and a results list: one entry per (policy, rule, resource, kind) with result pass, fail or skip; the Job in namespace ci expects skip because of the exclude.",
              "apiVersion: cli.kyverno.io/v1alpha1\nkind: Test\nmetadata:\n  name: disallow-latest-tag\npolicies:\n- policy.yaml\nresources:\n- resources.yaml\nresults:\n- policy: disallow-latest-tag\n  rule: require-image-tag\n  kind: Deployment\n  resources: [good-deploy]\n  result: pass\n- policy: disallow-latest-tag\n  rule: require-image-tag\n  kind: Deployment\n  resources: [latest-deploy, untagged-deploy]\n  result: fail\n- policy: disallow-latest-tag\n  rule: require-image-tag\n  kind: Job\n  resources: [ci-job]\n  namespace: ci\n  result: skip\nEach results entry asserts the rule's outcome for the named resources. skip is the expected result when match/exclude or preconditions take the resource out of scope -- here the exclude on namespace ci. If a Deployment rule is autogenerated for the Job, the autogen rule name (autogen-cronjob-...) may need listing instead; the CLI output tells you which rule names it evaluated."
            ),
            part(
              "Running and reading results",
              "kyverno test prints a table with ID, policy, rule, resource, result and Pass/Fail per expectation and exits non-zero on mismatch; --detailed-results shows the message for failures; mismatches are usually a wrong rule name, a resource name typo or forgetting the kind/namespace.",
              "kyverno test ./tests/disallow-latest\nLoading test ( tests/disallow-latest/kyverno-test.yaml ) ...\n  Loading values/variables ...\n  Loading policies ...\n  Loading resources ...\n  Applying 1 policy to 4 resources ...\n  Checking results ...\n│ ID │ POLICY              │ RULE              │ RESOURCE                       │ RESULT │ REASON │\n│ 1  │ disallow-latest-tag │ require-image-tag │ apps/v1/Deployment/good-deploy │ Pass   │ Ok     │\n│ 2  │ disallow-latest-tag │ require-image-tag │ apps/v1/Deployment/latest-deploy │ Pass │ Ok     │\n│ 3  │ disallow-latest-tag │ require-image-tag │ apps/v1/Deployment/untagged-deploy │ Pass │ Ok  │\n│ 4  │ disallow-latest-tag │ require-image-tag │ batch/v1/Job/ci/ci-job         │ Pass   │ Ok     │\nTest Summary: 4 tests passed and 0 tests failed\n'Pass' in the table means the expectation held (including an expected fail). A red Fail row with 'Want fail, got pass' means the rule did not catch the resource; check the pattern or deny condition."
            ),
            part(
              "Debugging with kyverno jp",
              "kyverno jp query -i resource.yaml \"spec.template.spec.containers[].image\" evaluates JMESPath against a file; kyverno jp function lists Kyverno's custom functions (e.g. image_normalize, parse_json, pattern_match); use it to see exactly what an expression returns before putting it in a deny condition.",
              "kyverno jp query -i resources.yaml \"spec.template.spec.containers[].image\"\n[\n  \"registry.maplewood.example/api:3.2.1\"\n]\nkyverno jp query -i resources.yaml \"spec.template.spec.containers[?ends_with(image, ':latest') || !contains(image, ':')].name\"\nkyverno jp function | grep -i image      # image_normalize, ... with signatures\nA deny rule's condition such as {{ request.object.spec.template.spec.containers[?...] | length(@) }} is easiest to get right by evaluating the inner expression with jp first. Common mistakes jp reveals: forgetting [] to flatten, string functions on lists, and quoting inside the YAML. Kyverno also exposes the parsed image parts as {{ images.containers.<name>.tag }}, so for this policy the simplest rule is a deny when images.containers.*.tag is 'latest' or empty."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 10%
    {
      slug: "audit-to-enforce-rollout",
      objective: "Apply policies in the cluster: Audit versus Enforce (the rule's failureAction), background scanning, and the effect on existing resources",
      kind: "case",
      title: "Roll a blocking policy out without breaking a running cluster",
      brief:
        "The fictional online bank Hallam Direct wants to block Pods that run as root. Dozens of workloads already run as root across the cluster. The security lead wants enforcement; the platform lead wants no outage.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Proposed policy (abridged):\napiVersion: kyverno.io/v1\nkind: ClusterPolicy\nmetadata: {name: require-run-as-nonroot}\nspec:\n  background: true\n  rules:\n  - name: run-as-non-root\n    match: {any: [{resources: {kinds: [Pod]}}]}\n    validate:\n      failureAction: Enforce\n      message: \"Containers must run as non-root (runAsNonRoot: true).\"\n      pattern:\n        spec:\n          =(securityContext): {=(runAsNonRoot): \"true\"}\n          containers:\n          - =(securityContext): {=(runAsNonRoot): \"true\"}\n\n$ kubectl get pods -A --no-headers | wc -l\n412",
          ask: "Explain what applying this as written would do to running and new Pods, then lay out the rollout.",
          parts: [
            part(
              "Effect as written",
              "Existing Pods keep running (admission never evicts), but any new Pod -- including replacements from a Deployment rollout, a node drain or a crash restart that recreates the Pod -- is rejected if it does not set runAsNonRoot true, so the first rollout or node problem after applying would leave workloads unable to reschedule; background true additionally reports every non-compliant existing Pod; the =() anchors make the check apply only when the field is present, which may let unset fields pass -- a pattern mistake to confirm.",
              "Nothing running is touched: Kyverno is an admission controller and has no eviction power. But every Pod created from now on is checked -- and Pods are created constantly: a Deployment rollout, a drained node, a restarted ReplicaSet. Each non-compliant workload would fail to reschedule with the policy message, effectively an outage waiting for the next normal event. background: true would at least list the offenders in reports. Also note the =() equality anchors: they only enforce runAsNonRoot when a securityContext is present, so a Pod with no securityContext at all passes -- the opposite of the intent; the pattern needs the field required, not conditional."
            ),
            part(
              "Rollout",
              "Step 1 apply with the rule's failureAction Audit and background true, then read PolicyReports to list non-compliant workloads per namespace; step 2 fix workloads or add PolicyExceptions for justified cases, tracking report counts to zero; step 3 switch to Enforce, optionally namespace by namespace with the rule's failureActionOverrides; keep the policy in Git with tests.",
              "1 Audit: validate.failureAction: Audit on the rule, background: true. Within minutes PolicyReports show every running Pod that would fail: kubectl get polr -A -o json | jq '[.items[].results[] | select(.result==\"fail\" and .policy==\"require-run-as-nonroot\")] | group_by(.resources[0].namespace) | map({ns: .[0].resources[0].namespace, fails: length})'. 2 Burn the list down: fix Deployments (runAsNonRoot: true, non-root images), or create PolicyExceptions for the few that genuinely need root, each with an owner. 3 Enforce progressively: on the rule, validate.failureActionOverrides: [{action: Enforce, namespaces: [payments, web]}] while the rest stays Audit, then flip the default to Enforce when reports are clean. Every step is a commit; kyverno test covers the pattern fix."
            ),
          ],
        },
        {
          text: "Two weeks later reports are clean except one namespace, and Enforce is on everywhere. A night-shift engineer reports: 'We ran kubectl scale on an old Deployment in namespace batch. The command returned fine, but no new Pods appeared and the ReplicaSet's events show the non-root message. We did not change the Pod spec.'",
          ask: "Explain why a scale operation was blocked and what to do.",
          parts: [
            part(
              "Why scale was blocked",
              "Scaling the Deployment created new Pods from the existing non-compliant template; admission evaluates each new Pod and Enforce rejects them (FailedCreate events on the ReplicaSet), while the scale request itself goes through because it writes the Deployment/scale subresource, which the autogen Deployment rule does not match; the Pod spec did not change, but it was never compliant and was only ever protected by the fact that no new Pods were created since Enforce.",
              "kubectl scale updates the Deployment's replicas; the ReplicaSet then creates new Pods, and each goes through admission. The template still runs as root, so Kyverno rejects the new Pods and the ReplicaSet records FailedCreate events with the non-root message. The scale request itself succeeds: it writes the Deployment/scale subresource, and the autogen rule matches Deployment, not Deployment/scale. Nothing changed in the spec -- the workload was already non-compliant and simply had not needed a new Pod since Enforce was switched on. This is the exact class of event the Audit phase should have caught; batch was the one namespace with remaining fails."
            ),
            part(
              "What to do",
              "Short term: either fix the Deployment's securityContext (the right fix, a one-line change and rollout) or create a time-boxed PolicyException for that Deployment so operations continue; long term: block Enforce until reports hit zero for every namespace and alert on new fail results so a regression is seen before it matters.",
              "Right now, pick one: patch the Deployment -- kubectl -n batch patch deploy legacy-batch -p '{\"spec\":{\"template\":{\"spec\":{\"securityContext\":{\"runAsNonRoot\":true,\"runAsUser\":10001}}}}}' -- if the image can run as non-root (test first), or create a PolicyException scoped to that Deployment and rule with an expiry note so the scale can proceed. Then institutionalise the lesson: Enforce only when the PolicyReport fail count is zero for the namespace, and alert on kyverno_policy_results_total{policy=\"require-run-as-nonroot\",rule_result=\"fail\"} rising so a new offender is caught while it is still only a report."
            ),
          ],
        },
      ],
    },
    {
      slug: "match-exclude-scoping",
      objective: "Select resources with match and exclude: kinds, names, namespaces, selectors, operations, roles and subjects, any and all blocks",
      kind: "build",
      title: "Scope a policy to exactly the right resources",
      brief:
        "The fictional e-commerce company Fenwick Online wants a validate rule that requires an owner annotation on Deployments and StatefulSets, but only in namespaces labelled tier=app, only on CREATE and UPDATE, never for resources created by the GitOps controller's ServiceAccount (argocd:argocd-application-controller) because those are checked in Git, and never for a legacy namespace legacy-erp. A separate rule must apply only to Pods whose labels include critical=true.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the match and exclude blocks for both rules and explain any versus all, selectors, operations and subjects.",
          parts: [
            part(
              "Rule 1 match",
              "match.any with one resources entry: kinds [Deployment, StatefulSet], operations [CREATE, UPDATE], namespaceSelector matchLabels tier=app; explains that fields inside a single resources block are AND-ed, entries in any are OR-ed, and all would require every entry to match.",
              "  - name: require-owner\n    match:\n      any:\n      - resources:\n          kinds: [Deployment, StatefulSet]\n          operations: [CREATE, UPDATE]\n          namespaceSelector:\n            matchLabels: {tier: app}\nInside one resources block every field must hold (kind AND operation AND namespace label). any: [a, b] means a OR b; all: [a, b] means a AND b across blocks -- use all when combining a resources filter with a subjects or clusterRoles filter that must both apply. operations restricts the rule to those admission operations; without it CREATE, UPDATE, DELETE and CONNECT are all matched (DELETE matters for some rules)."
            ),
            part(
              "Rule 1 exclude",
              "exclude.any with two entries: one with subjects [{kind: ServiceAccount, name: argocd-application-controller, namespace: argocd}] and one with resources.namespaces [legacy-erp]; explains subjects/roles/clusterRoles filter on the requesting user, and that exclude takes precedence when it matches.",
              "    exclude:\n      any:\n      - subjects:\n        - kind: ServiceAccount\n          name: argocd-application-controller\n          namespace: argocd\n      - resources:\n          namespaces: [legacy-erp]\nA request is skipped if it matches any exclude entry. subjects (and roles/clusterRoles) look at the admission request's userInfo -- here the GitOps controller's ServiceAccount, which appears as system:serviceaccount:argocd:argocd-application-controller. Excluding by requester is for 'this path is already governed elsewhere'; excluding by namespace is for carve-outs like legacy-erp. Background scans have no requester, so subject-based excludes do not apply there -- the GitOps-created Deployments will still appear in reports if they lack the annotation."
            ),
            part(
              "Rule 2: label selector on the resource",
              "match.any resources kinds [Pod] with selector matchLabels critical=true (the resource's own labels, as opposed to namespaceSelector); explains selector applies to the object being admitted and that autogen will extend the rule to controllers whose templates carry the label.",
              "  - name: critical-pods-have-pdb-annotation\n    match:\n      any:\n      - resources:\n          kinds: [Pod]\n          selector:\n            matchLabels: {critical: \"true\"}\nselector matches the labels on the admitted resource; namespaceSelector matches labels on its namespace. Label values are strings, so \"true\" is quoted. Kyverno's autogen will create companion rules for Deployments, StatefulSets, Jobs and so on whose Pod templates carry critical=true, so the rule fires at the controller level as well as on bare Pods."
            ),
            part(
              "Other selectors and a check",
              "Mentions names (with wildcards), annotations, roles and clusterRoles, and that kinds can be qualified as group/version/Kind or Kind/subresource (e.g. Pod/exec); verify scoping with kyverno apply on sample manifests including a resource that should be skipped, and in the cluster with a dry-run apply.",
              "Also available: resources.names: [\"web-*\"] (wildcards), resources.annotations, roles/clusterRoles on the requester, and qualified kinds such as apps/v1/Deployment or Pod/exec (for CONNECT operations). Check the scope before enforcing: kyverno apply policy.yaml --resource samples/ -f values.yaml with a Deployment in a tier=app namespace (expect fail without the annotation), one in legacy-erp (expect skip) and one in a non-app namespace (skip); in the cluster, kubectl apply --dry-run=server -f deploy.yaml runs admission without persisting and shows whether Kyverno would block it."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 32%
    {
      slug: "validate-pattern-vs-cel",
      objective: "Write validation rules: pattern, anyPattern, deny with conditions, CEL expressions, messages and the operators and anchors in patterns",
      kind: "build",
      title: "Write the same guardrail three ways and pick the right one",
      brief:
        "The fictional health-tech company Orwell Care needs a policy for Pods: every container must set both CPU and memory limits, memory limit must not exceed 4Gi, and hostPath volumes are forbidden. The team is unsure whether to use patterns, deny with conditions, or CEL, and wants to understand when each fits.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the rules using pattern, deny with conditions and CEL where each fits best, and explain the operators, anchors and trade-offs.",
          parts: [
            part(
              "Pattern: limits must exist",
              "A validate.pattern on spec.containers with resources.limits memory and cpu set to \"?*\" (any non-empty value); explains the list item applies to every container, ?* and the wildcard operators, and that patterns are best for 'these fields must be present / match'.",
              "  - name: limits-required\n    match: {any: [{resources: {kinds: [Pod]}}]}\n    validate:\n      message: \"Every container must set cpu and memory limits.\"\n      pattern:\n        spec:\n          containers:\n          - resources:\n              limits:\n                memory: \"?*\"\n                cpu: \"?*\"\nIn a pattern, a list item matches every element of the list (every container must have the fields). ?* means any non-empty string; other pattern operators include * (anything, even empty), ranges like 1-10 and comparison operators (>=, <=, !, |) on values. Anchors refine: =(field) applies the sub-pattern only if the field exists, +(field) adds it in a mutation, (field): value is a conditional anchor, X(field) means 'must not exist'. Patterns read like the resource and are the simplest tool for presence and shape checks."
            ),
            part(
              "Pattern with an operator: memory ceiling, and X anchor for hostPath",
              "memory: \"<=4Gi\" uses the comparison operator on a quantity; forbidding hostPath volumes uses the negation anchor X(hostPath): \"null\" inside volumes, or an anyPattern with alternatives; explains quantity-aware comparison and the X anchor.",
              "  - name: memory-ceiling\n    match: {any: [{resources: {kinds: [Pod]}}]}\n    validate:\n      message: \"Memory limit must not exceed 4Gi.\"\n      pattern:\n        spec:\n          containers:\n          - resources:\n              limits:\n                memory: \"<=4Gi\"\n  - name: no-hostpath\n    match: {any: [{resources: {kinds: [Pod]}}]}\n    validate:\n      message: \"hostPath volumes are not allowed.\"\n      pattern:\n        spec:\n          =(volumes):\n          - X(hostPath): \"null\"\nKyverno compares quantities (Gi, Mi, m) numerically in pattern operators, so \"<=4Gi\" rejects 8Gi and accepts 512Mi. X(hostPath): \"null\" means the key must not be present on any volume; =(volumes) makes the check apply only when volumes exist (a Pod with no volumes passes). anyPattern would be used when one of several shapes is acceptable (e.g. either the Pod-level or the container-level securityContext sets runAsNonRoot)."
            ),
            part(
              "Deny with conditions: when logic is needed",
              "validate.deny with conditions (any/all) using JMESPath over request.object, for example counting containers whose limits.memory exceeds 4Gi, or combining with request.operation and userInfo; explains deny evaluates expressions and denies when conditions are true -- best for arithmetic, cross-field logic and operation-aware rules that patterns cannot express.",
              "  - name: memory-ceiling-deny\n    match: {any: [{resources: {kinds: [Pod]}}]}\n    validate:\n      message: \"A container requests more memory than allowed.\"\n      deny:\n        conditions:\n          any:\n          - key: \"{{ request.object.spec.containers[?resources.limits.memory && compare(resources.limits.memory, '4Gi') > `0`] | length(@) }}\"\n            operator: GreaterThan\n            value: 0\ndeny inverts the model: the rule fails when the conditions evaluate true. It uses JMESPath with Kyverno's functions (compare for quantities, time functions, parse_json), can reference request.operation, request.userInfo and context variables, and suits logic such as 'deny DELETE of resources with a protected label unless the user is in group X' that a pattern cannot say. The cost is readability: debug the expression with kyverno jp first."
            ),
            part(
              "CEL: the Kubernetes-native option",
              "validate.cel with expressions over object (and oldObject, request), e.g. object.spec.containers.all(c, has(c.resources.limits) && 'memory' in c.resources.limits && 'cpu' in c.resources.limits) and !has(object.spec.volumes) || object.spec.volumes.all(v, !has(v.hostPath)), with messageExpression; explains CEL is the same language as ValidatingAdmissionPolicy (portable, typed, cost-limited) and that Kyverno can also generate VAPs from CEL rules.",
              "  - name: limits-and-no-hostpath-cel\n    match: {any: [{resources: {kinds: [Pod]}}]}\n    validate:\n      cel:\n        expressions:\n        - expression: >-\n            object.spec.containers.all(c, has(c.resources) && has(c.resources.limits) && 'memory' in c.resources.limits && 'cpu' in c.resources.limits)\n          message: \"Every container must set cpu and memory limits.\"\n        - expression: \"!has(object.spec.volumes) || object.spec.volumes.all(v, !has(v.hostPath))\"\n          message: \"hostPath volumes are not allowed.\"\n        - expression: \"object.spec.containers.all(c, quantity(c.resources.limits.memory).compareTo(quantity('4Gi')) <= 0)\"\n          message: \"Memory limit must not exceed 4Gi.\"\nCEL is typed and has quantity() support, the same dialect Kubernetes' ValidatingAdmissionPolicy uses, so rules are portable and Kyverno can emit a VAP from them (generate: true) for in-API-server enforcement. Choose patterns for shape/presence, deny for request-aware logic and Kyverno functions, CEL when you want Kubernetes-native semantics and portability. Test all three with kyverno test; CEL errors show at policy load (kubectl get cpol READY False)."
            ),
          ],
        },
      ],
    },
    {
      slug: "mutate-and-generate",
      objective: "Write generation rules: creating resources from a data block or by cloning, synchronization, and triggers such as new namespaces",
      kind: "build",
      title: "Generate namespace defaults and mutate Pods to use the private registry mirror",
      brief:
        "The fictional game studio Hollowmere wants every new namespace (except system ones) to receive a default-deny NetworkPolicy and a copy of the registry pull Secret from the kyverno namespace, kept in sync if the source Secret rotates. Separately, every Pod image that references docker.io must be rewritten to the company mirror registry.hollowmere.example/dockerhub/, and containers without an imagePullPolicy should get IfNotPresent.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the generate rules (data and clone) and the mutate rules (strategic merge and foreach), and explain synchronization and the controllers involved.",
          parts: [
            part(
              "Generate from data: default-deny",
              "A generate rule triggered by Namespace CREATE (match kinds [Namespace], exclude system namespaces) with generate.apiVersion/kind/name/namespace {{request.object.metadata.name}}, synchronize true, and a data block holding the NetworkPolicy spec; explains the background controller creates it after admission and keeps it in sync.",
              "  - name: default-deny\n    match:\n      any:\n      - resources:\n          kinds: [Namespace]\n    exclude:\n      any:\n      - resources:\n          names: [kube-system, kube-public, kube-node-lease, kyverno]\n    generate:\n      apiVersion: networking.k8s.io/v1\n      kind: NetworkPolicy\n      name: default-deny\n      namespace: \"{{request.object.metadata.name}}\"\n      synchronize: true\n      data:\n        spec:\n          podSelector: {}\n          policyTypes: [Ingress, Egress]\nWhen a Namespace is created the admission controller records an UpdateRequest; the background controller then creates the NetworkPolicy in the new namespace. synchronize: true means Kyverno re-applies the generated resource if someone edits or deletes it and updates it when the policy's data changes; false would generate once and leave it alone."
            ),
            part(
              "Generate by clone: the pull Secret",
              "A second generate rule cloning the Secret regcred from namespace kyverno into the new namespace with clone.namespace/name and synchronize true, so rotation of the source propagates; notes the background controller needs RBAC for secrets and that cloneList can copy several matching resources.",
              "  - name: clone-pull-secret\n    match:\n      any:\n      - resources:\n          kinds: [Namespace]\n    exclude:\n      any:\n      - resources:\n          names: [kube-system, kube-public, kube-node-lease, kyverno]\n    generate:\n      apiVersion: v1\n      kind: Secret\n      name: regcred\n      namespace: \"{{request.object.metadata.name}}\"\n      synchronize: true\n      clone:\n        namespace: kyverno\n        name: regcred\nclone copies an existing resource instead of inlining data; with synchronize: true, when the source Secret in kyverno is rotated, every generated copy is updated. cloneList with a selector copies several resources (e.g. all Secrets labelled share=true). The background controller must be allowed to create/update secrets -- add an aggregated ClusterRole."
            ),
            part(
              "Mutate with foreach: rewrite docker.io images",
              "A mutate rule on Pods with foreach over spec.containers (and initContainers) filtered with preconditions on the image, using patchStrategicMerge with {{element.name}} and a replace_all / regex_replace_all on {{element.image}}; explains foreach iterates list elements and element.* variables; image_normalize handles implicit docker.io.",
              "  - name: mirror-dockerhub\n    match: {any: [{resources: {kinds: [Pod]}}]}\n    mutate:\n      foreach:\n      - list: \"request.object.spec.containers\"\n        preconditions:\n          all:\n          - key: \"{{ image_normalize('{{element.image}}') }}\"\n            operator: Equals\n            value: \"docker.io/*\"\n        patchStrategicMerge:\n          spec:\n            containers:\n            - name: \"{{ element.name }}\"\n              image: \"{{ regex_replace_all('^docker.io/', image_normalize('{{element.image}}'), 'registry.hollowmere.example/dockerhub/') }}\"\nforeach runs the patch once per container; element is the current item. image_normalize turns nginx:1.27 into docker.io/library/nginx:1.27 so implicit Docker Hub references are caught too, and regex_replace_all swaps the registry prefix. Repeat the block with list request.object.spec.initContainers. Mutations are applied at admission by the admission controller before validation, so a registry allowlist validate rule sees the rewritten image."
            ),
            part(
              "Mutate defaults with the add anchor",
              "A patchStrategicMerge adding +(imagePullPolicy): IfNotPresent to every container via the (name): \"*\" conditional anchor; explains the + anchor adds only when absent and that autogen applies the same to controller templates.",
              "  - name: default-pull-policy\n    match: {any: [{resources: {kinds: [Pod]}}]}\n    mutate:\n      patchStrategicMerge:\n        spec:\n          containers:\n          - (name): \"*\"\n            +(imagePullPolicy): IfNotPresent\n(name): \"*\" selects every container; +(imagePullPolicy) sets the field only when it is missing, leaving explicit Always or Never alone. Because of autogen the same default lands in Deployment, StatefulSet, DaemonSet, Job and CronJob templates, so the controllers' Pods inherit it without a second webhook pass. Confirm with kubectl get pod <p> -o jsonpath='{.spec.containers[*].imagePullPolicy}' after creating a Pod that omitted it."
            ),
          ],
        },
      ],
    },
    {
      slug: "verify-images-and-cleanup",
      objective: "Write verifyImage rules: Sigstore cosign and Notary signatures, attestations, required digests and mutating image references to digests",
      kind: "case",
      title: "Require signed images and reject one that was tampered with",
      brief:
        "The fictional pharmacy chain Bexley Health signs every production image with cosign in CI (keyless, GitHub Actions identity) and wants Kyverno to admit only images from registry.bexley.example that carry a valid signature, to pin them to digests, and to require an SBOM attestation. During the first week an image is pushed by hand and rejected.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Proposed rule (abridged):\n  - name: verify-signature\n    match: {any: [{resources: {kinds: [Pod]}}]}\n    verifyImages:\n    - imageReferences: [\"registry.bexley.example/*\"]\n      mutateDigest: true\n      required: true\n      attestors:\n      - entries:\n        - keyless:\n            subject: \"https://github.com/bexley-health/*/.github/workflows/release.yaml@refs/tags/v*\"\n            issuer: \"https://token.actions.githubusercontent.com\"\n            rekor: {url: https://rekor.sigstore.dev}\n      attestations:\n      - type: https://spdx.dev/Document\n        attestors:\n        - entries:\n          - keyless:\n              subject: \"https://github.com/bexley-health/*/.github/workflows/release.yaml@refs/tags/v*\"\n              issuer: \"https://token.actions.githubusercontent.com\"\n\n$ kubectl -n pharmacy apply -f deploy.yaml\nError from server: admission webhook \"mutate.kyverno.svc-fail\" denied the request:\nresource Deployment/pharmacy/dispense was blocked due to the following policies\nsupply-chain:\n  autogen-verify-signature: 'failed to verify image registry.bexley.example/dispense:4.3.1: .attestors[0].entries[0].keyless: no matching signatures: none of the expected identities matched what was in the certificate'",
          ask: "Explain how the rule verifies an image and what the rejection message means, then say what the team should do.",
          parts: [
            part(
              "How verification works",
              "At admission Kyverno resolves each matching image reference, fetches its signatures from the registry (OCI referrers/tag), verifies them with the attestor -- here keyless: the signing certificate from Fulcio must have the given subject (the workflow identity) and issuer, and the entry must be in the Rekor transparency log -- then checks required attestations (an SPDX SBOM predicate signed by the same identity); mutateDigest rewrites the image to its digest so what was verified is what runs; required: true fails if no signature exists.",
              "verifyImages intercepts every image matching registry.bexley.example/*: Kyverno pulls the signature artifacts from the registry, and for keyless verification checks that the signing certificate was issued by the Sigstore CA to the identity in subject (a GitHub Actions workflow in the bexley-health org, on a v* tag) via the stated OIDC issuer, and that the signature is recorded in Rekor. Then it looks for an attestation with predicate type SPDX signed by the same identity. If all pass, mutateDigest replaces :4.3.1 with @sha256:... in the Pod spec so a later tag repoint cannot change what runs. Because verifyImages mutates, it runs in the mutating webhook -- hence 'mutate.kyverno.svc-fail' in the error."
            ),
            part(
              "The rejection",
              "'no matching signatures: none of the expected identities matched' means a signature exists but its certificate identity is not the release workflow -- the image was signed (or re-signed) by a person's identity or a different workflow when pushed by hand, so the policy correctly refused it; this is the control working.",
              "The message says signatures were found but their certificate identity did not match https://github.com/bexley-health/*/.github/workflows/release.yaml@refs/tags/v*: the hand-pushed image was signed by whoever pushed it (their own OIDC identity) or by a non-release workflow, not by the release pipeline on a tag. Kyverno did exactly what the policy asks: only the release pipeline's identity is trusted. Had there been no signature at all, the message would say no signatures found; here it is an identity mismatch."
            ),
            part(
              "What to do",
              "Do not add the person's identity to the policy; rebuild and sign through the release workflow on a tag (the only trusted path), optionally add a second attestor entry only for a documented break-glass identity with an expiry, and check cosign verify locally with the same identity/issuer to reproduce before and after; also confirm the registry allows Kyverno to read signature artifacts (imagePullSecrets or a registry credential for Kyverno).",
              "The right fix is the process, not the policy: push the release through the release.yaml workflow on a v4.3.1 tag so it is signed by the trusted identity and carries the SBOM attestation, then redeploy. Reproduce locally first: cosign verify --certificate-identity-regexp 'https://github.com/bexley-health/.*/.github/workflows/release.yaml@refs/tags/v.*' --certificate-oidc-issuer https://token.actions.githubusercontent.com registry.bexley.example/dispense:4.3.1 -- it fails on the hand-pushed image and passes on the rebuilt one. If a genuine emergency path is needed, add a separate, named break-glass attestor entry with its own identity and remove it on a date; never widen the subject to '*'. If verification errors mention unauthorized, give Kyverno credentials to read the registry (imagePullSecrets on the rule or a Secret referenced in the Helm values)."
            ),
          ],
        },
        {
          text: "Signing works. Two more requests: (1) old ReplicaSets, completed Jobs and finished Pods are piling up in the ci namespace, and (2) a temporary debug namespace created by engineers should disappear automatically a day after creation.",
          ask: "Write the cleanup policies and explain the two mechanisms.",
          parts: [
            part(
              "CleanupPolicy on a schedule",
              "A kyverno.io/v2 CleanupPolicy in ci matching Jobs with conditions on status (succeeded or failed) and age, and Pods in Succeeded/Failed phase, with a cron schedule; the cleanup controller deletes matches and needs RBAC to delete those kinds; explains conditions use JMESPath on target and time functions.",
              "apiVersion: kyverno.io/v2\nkind: CleanupPolicy\nmetadata:\n  name: finished-jobs\n  namespace: ci\nspec:\n  schedule: \"0 * * * *\"\n  match:\n    any:\n    - resources:\n        kinds: [Job]\n  conditions:\n    all:\n    - key: \"{{ target.status.conditions[?type=='Complete' || type=='Failed'] | length(@) }}\"\n      operator: GreaterThan\n      value: 0\n    - key: \"{{ time_diff('{{ target.metadata.creationTimestamp }}', '{{ time_now_utc() }}') }}\"\n      operator: GreaterThan\n      value: \"24h0m0s\"\nEvery hour the cleanup controller lists Jobs in ci and deletes those whose conditions evaluate true -- finished and older than a day. target.* refers to each candidate. A second CleanupPolicy handles Pods with target.status.phase in Succeeded/Failed; ReplicaSets with zero replicas and an old creation time can be matched the same way (or set the Deployment's revisionHistoryLimit, which is the native fix). The cleanup controller's ServiceAccount needs delete on jobs/pods via an aggregate-to-cleanup-controller ClusterRole."
            ),
            part(
              "TTL label for the debug namespace",
              "Label the namespace (or have a mutate rule add it) with cleanup.kyverno.io/ttl: 24h; the cleanup controller deletes the resource when the TTL elapses -- no policy needed per resource; explains the label accepts durations or absolute timestamps and that deleting a Namespace cascades.",
              "kubectl label ns debug-anna cleanup.kyverno.io/ttl=24h\n(or a mutate rule on Namespace CREATE that adds the label when the name starts with debug-). The cleanup controller watches resources carrying cleanup.kyverno.io/ttl and deletes each when its TTL -- a duration like 24h, or an absolute time such as 2026-11-10T09:00:00Z -- has passed since creation. Deleting the Namespace removes everything in it, so this is the whole 'temporary environment' mechanism in one label. Make sure the controller may delete namespaces (ClusterRole with delete on namespaces, aggregated to the cleanup controller)."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 10%
    {
      slug: "reports-and-exceptions",
      objective: "Configure PolicyExceptions: exempting specific resources from specific rules, scoping and approving exceptions",
      kind: "case",
      title: "Read the policy reports and grant one justified exception",
      brief:
        "At the fictional logistics firm Pendlebury, the platform team reviews Kyverno reports weekly. This week one team asks for an exception: their log collector must mount /var/log from the host, which the no-hostpath rule forbids.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl get polr -A -o custom-columns='NS:.metadata.namespace,NAME:.metadata.name,PASS:.summary.pass,FAIL:.summary.fail,WARN:.summary.warn,ERROR:.summary.error,SKIP:.summary.skip' | sort -k4 -n -r | head -4\nNS           NAME                                     PASS  FAIL  WARN  ERROR  SKIP\nlogging      f3c2...-a1   (Pod fluent-bit-x7k2q)      8     1     0     0      0\nlogging      9ab1...-c4   (Pod fluent-bit-m2p9r)      8     1     0     0      0\npayments     77de...-e0   (Deployment api)            9     0     0     0      1\n\n$ kubectl -n logging get polr f3c2...-a1 -o jsonpath='{.results[?(@.result==\"fail\")]}' | jq -c '{policy, rule, message}'\n{\"policy\":\"pod-security-baseline\",\"rule\":\"no-hostpath\",\"message\":\"hostPath volumes are not allowed.\"}\n\n$ kubectl -n logging get ds fluent-bit -o jsonpath='{.spec.template.spec.volumes[*].hostPath.path}'\n/var/log /var/lib/docker/containers",
          ask: "Interpret the reports, decide whether the exception is justified, and write it as narrowly as possible.",
          parts: [
            part(
              "Reading the reports",
              "PolicyReports are per namespace and (in current Kyverno) per resource: each fluent-bit Pod has one fail for pod-security-baseline/no-hostpath; payments api has a skip (a rule whose preconditions or match excluded it); summary columns total results; the message is the rule's message; ClusterPolicyReports hold cluster-scoped resources.",
              "Each report belongs to one resource (the owner is a Pod or Deployment) in its namespace and lists one result per applicable rule with pass/fail/warn/error/skip. The two fluent-bit Pods each fail exactly one rule -- no-hostpath in pod-security-baseline -- because the DaemonSet mounts /var/log and the container log directory. payments/api's skip means a rule matched by kind but was skipped by preconditions or an exception; it is not a problem. Cluster-scoped resources (Namespaces, ClusterRoles) report into ClusterPolicyReports instead. The policy is in Audit for this rule, or the Pods could not exist."
            ),
            part(
              "Is it justified",
              "A node-level log collector genuinely needs read access to the host's log directories -- this is the canonical legitimate hostPath; conditions: read-only mounts, a dedicated namespace and ServiceAccount, the DaemonSet only; the /var/lib/docker/containers path should be reviewed (modern nodes log under /var/log/pods and /var/log/containers) and dropped if unused.",
              "Yes, with conditions. Reading host logs is what a log collector is for and there is no non-hostPath way to do it. Require: readOnly: true on both mounts, the exception limited to the fluent-bit DaemonSet in logging, and a review of the second path -- on containerd nodes logs live under /var/log/pods and /var/log/containers (already under /var/log), so /var/lib/docker/containers is probably a leftover from Docker days and should be removed. Record the owner and a review date."
            ),
            part(
              "The PolicyException",
              "A kyverno.io/v2 PolicyException in the logging namespace (or the configured exceptions namespace) with exceptions listing policyName pod-security-baseline and ruleNames [no-hostpath] (autogen rule names too), and a match on kinds [Pod, DaemonSet] names fluent-bit* in namespace logging; explains exceptions must be enabled (enablePolicyExceptions, exceptionNamespace) and should go through review in Git.",
              "apiVersion: kyverno.io/v2\nkind: PolicyException\nmetadata:\n  name: fluent-bit-hostpath\n  namespace: logging\n  annotations:\n    owner: platform-logging\n    review-by: \"2027-05-01\"\nspec:\n  exceptions:\n  - policyName: pod-security-baseline\n    ruleNames: [no-hostpath, autogen-no-hostpath]\n  match:\n    any:\n    - resources:\n        kinds: [Pod, DaemonSet]\n        namespaces: [logging]\n        names: [\"fluent-bit*\"]\nThe exception names the policy and the exact rules (including the autogen variant for the DaemonSet), and matches only fluent-bit resources in logging -- nothing else in the cluster is exempted. Exceptions must be enabled in the Helm values (features.policyExceptions.enabled and, by default, restricted to a namespace such as kyverno so only the platform team can create them); keep them in Git with the policies so each one is reviewed. After it applies, the fluent-bit reports show skip instead of fail for no-hostpath."
            ),
          ],
        },
        {
          text: "The exception is in. The security lead asks for a dashboard and alert: 'how many violations do we have, which policies fail most, and is Kyverno itself healthy?'",
          ask: "Name the metrics and queries you would use.",
          parts: [
            part(
              "Policy result metrics",
              "kyverno_policy_results_total with labels policy_name, rule_name, rule_result (pass/fail/...), rule_execution_cause (admission/background) and resource namespace -- sum by (policy_name) for fails, filter background scans for 'current violations' versus admission for 'blocked attempts'; kyverno_policy_rule_info_total shows which policies and rules are loaded and their status.",
              "Current violations (from background scans): sum by (policy_name, rule_name) (kyverno_policy_results_total{rule_result=\"fail\", rule_execution_cause=\"background\"}). Blocked admissions over time: rate(kyverno_policy_results_total{rule_result=\"fail\", rule_execution_cause=\"admission\"}[1h]) by policy_name. Loaded policies and their readiness: kyverno_policy_rule_info_total{status_ready=\"false\"} should be zero -- a policy that failed to load is silently not enforcing. The reports controller exposes these from the admission and background controllers' /metrics endpoints (scrape all three)."
            ),
            part(
              "Kyverno health",
              "Admission latency and errors: kyverno_admission_review_duration_seconds (histogram, by resource kind and operation), kyverno_admission_requests_total with status labels; controller health via up and pod restarts; alert on p99 admission latency near the webhook timeout, on admission errors, on any replica unavailable, and on the number of policies not ready.",
              "Latency: histogram_quantile(0.99, sum by (le) (rate(kyverno_admission_review_duration_seconds_bucket[5m]))) -- alert if it approaches the webhook timeout, because timeouts turn into rejected requests under failurePolicy Fail. Errors: rate(kyverno_admission_requests_total{request_allowed=\"false\"}[5m]) split by resource kind for unexpected spikes. Availability: kube_deployment_status_replicas_available{deployment=~\"kyverno-.*\"} below desired, and absent(up{job=\"kyverno-admission-controller\"}). Policy load: kyverno_policy_rule_info_total{status_ready=\"false\"} > 0 pages the platform team -- an unready policy means a guardrail is off. Put the fail counts per policy and per namespace on the weekly dashboard the review already uses."
            ),
          ],
        },
      ],
    },
  ],
};
