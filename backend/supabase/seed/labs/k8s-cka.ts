import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Certified Kubernetes Administrator (CKA), curriculum v1.37.
//
// Aligned to the five CKA domains (Cluster Architecture, Installation &
// Configuration 25%, Workloads & Scheduling 15%, Services & Networking 20%,
// Storage 10%, Troubleshooting 30%), read on 2026-11-07 from
// github.com/cncf/curriculum (CKA_Curriculum_v1.37.pdf) and the exam page on
// training.linuxfoundation.org. Density (docs/labs.md, hybrid): one lab per
// domain plus six weighted extras -> 2 / 2 / 2 / 2 / 3.
//
// The CKA is a hands-on exam, so every lab asks for what the exam asks for:
// the kubectl commands and the YAML, against authored cluster output (a
// NotReady node, a stuck rollout, an API server that will not start, a
// claim stuck Pending). Clusters, nodes, namespaces and companies are
// fictional. Commands and API versions are the stable GA ones that do not
// move between Kubernetes minors (apps/v1, rbac.authorization.k8s.io/v1,
// networking.k8s.io/v1, storage.k8s.io/v1, gateway.networking.k8s.io/v1);
// no version-specific flags. etcd follows the 3.6+ split that v1.37's etcd
// 3.7 keeps: etcdctl for online commands (snapshot save, endpoint health)
// and etcdutl for offline ones (snapshot status, snapshot restore), which
// etcd 3.6 removed from etcdctl (etcd.io, "Announcing etcd v3.6.0", read
// 2026-11-09).
// Every lab is needs_expert_review until a person checks it.

export const CKA_LABS: SeedLabSet = {
  trackCode: "CKA",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/CKA_Curriculum_v1.37.pdf", "exam_outline", "2026-11-07"),
    source("https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/", "exam_outline", "2026-11-07"),
    source("https://kubernetes.io/docs/reference/access-authn-authz/rbac/", "reference", "2026-11-07"),
    source("https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/", "reference", "2026-11-07"),
    source("https://etcd.io/blog/2025/announcing-etcd-3.6/", "reference", "2026-11-09"),
  ],
  labs: [
    // ----------------------------------------------------------------- 25%
    {
      slug: "rbac-ci-deployer",
      objective:
        "Manage role-based access control: write Roles, ClusterRoles, RoleBindings and ClusterRoleBindings for users, groups and ServiceAccounts, and check access with kubectl auth can-i",
      kind: "build",
      title: "Grant a CI ServiceAccount exactly the access its pipeline needs",
      brief:
        "Fictional company Halvard Logistics runs its CI pipeline against the cluster as the ServiceAccount deployer in namespace ci. The pipeline must create, update and delete Deployments and Services in namespace shop only, read Pods and their logs in shop to confirm a rollout, and list Nodes cluster-wide to print a summary. It must not be able to read Secrets anywhere or touch any other namespace. A teammate has already bound deployer to the built-in cluster-admin ClusterRole \"to unblock the pipeline\". The cluster is a kubeadm cluster with RBAC enabled; kubectl runs as a cluster administrator.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the RBAC objects (as YAML or the equivalent kubectl create commands) that give deployer exactly this access, say what you do about the existing cluster-admin binding, and show how you would prove the result.",
          parts: [
            part(
              "Namespace-scoped Role in shop",
              "A Role (rbac.authorization.k8s.io/v1) in namespace shop whose rules cover deployments in apiGroups apps with create/get/list/watch/update/patch/delete, services in the core group (\"\") with the same write verbs, and pods plus pods/log in the core group with get/list/watch only. No secrets, no wildcard verbs or resources.",
              "apiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata: {name: deployer, namespace: shop}\nrules:\n- apiGroups: [\"apps\"]\n  resources: [\"deployments\"]\n  verbs: [\"create\",\"get\",\"list\",\"watch\",\"update\",\"patch\",\"delete\"]\n- apiGroups: [\"\"]\n  resources: [\"services\"]\n  verbs: [\"create\",\"get\",\"list\",\"watch\",\"update\",\"patch\",\"delete\"]\n- apiGroups: [\"\"]\n  resources: [\"pods\",\"pods/log\"]\n  verbs: [\"get\",\"list\",\"watch\"]\n\nOr: kubectl -n shop create role deployer --verb=create,get,list,watch,update,patch,delete --resource=deployments.apps,services and a second role (or extra rule) with --verb=get,list,watch --resource=pods,pods/log."
            ),
            part(
              "RoleBinding to a ServiceAccount in another namespace",
              "A RoleBinding in namespace shop (not ci) whose subject is kind ServiceAccount, name deployer, namespace ci, and whose roleRef is the Role above. Explains that a RoleBinding lives in the namespace where access is granted and can name a ServiceAccount from any namespace.",
              "kubectl -n shop create rolebinding deployer --role=deployer --serviceaccount=ci:deployer\n\nThe binding is in shop because that is where the permissions apply; the subject is the ServiceAccount from ci (system:serviceaccount:ci:deployer). A RoleBinding grants only within its own namespace, which is what keeps the pipeline out of every other namespace."
            ),
            part(
              "Cluster-wide read on Nodes",
              "A ClusterRole with get/list/watch on nodes (core group) bound to the ServiceAccount with a ClusterRoleBinding, because Nodes are cluster-scoped and cannot be granted by a Role or RoleBinding.",
              "kubectl create clusterrole node-reader --verb=get,list,watch --resource=nodes\nkubectl create clusterrolebinding deployer-node-reader --clusterrole=node-reader --serviceaccount=ci:deployer\n\nNodes are not namespaced, so only a ClusterRole + ClusterRoleBinding can grant them. The ClusterRole holds nothing but nodes, so this binding does not widen access to anything namespaced."
            ),
            part(
              "The cluster-admin binding",
              "Finds and deletes the ClusterRoleBinding (or RoleBinding) that references cluster-admin for deployer, rather than leaving it; notes that RBAC is additive so the new Role would be meaningless while cluster-admin remains.",
              "kubectl get clusterrolebindings -o json | jq -r '.items[] | select(.subjects[]? | .kind==\"ServiceAccount\" and .name==\"deployer\" and .namespace==\"ci\") | .metadata.name' and delete the binding that references cluster-admin (kubectl delete clusterrolebinding <name>). RBAC only ever adds permissions: as long as any binding to cluster-admin exists, the narrow Role changes nothing."
            ),
            part(
              "Proof",
              "Uses kubectl auth can-i impersonating the ServiceAccount (--as=system:serviceaccount:ci:deployer) with at least one expected yes (e.g. create deployments in shop, list nodes) and at least one expected no (get secrets in shop, or create deployments in another namespace).",
              "kubectl auth can-i create deployments.apps -n shop --as=system:serviceaccount:ci:deployer   # yes\nkubectl auth can-i list nodes --as=system:serviceaccount:ci:deployer                      # yes\nkubectl auth can-i get secrets -n shop --as=system:serviceaccount:ci:deployer              # no\nkubectl auth can-i create deployments.apps -n payments --as=system:serviceaccount:ci:deployer  # no\nkubectl auth can-i --list -n shop --as=system:serviceaccount:ci:deployer shows the full effective set."
            ),
          ],
        },
      ],
    },
    {
      slug: "etcd-backup-restore",
      objective:
        "Back up and restore etcd with etcdctl snapshot save and etcdutl snapshot restore using the right certificates and endpoint, and bring the static pod back up on the restored data",
      kind: "case",
      title: "Take an etcd snapshot, then restore the cluster after a bad apply",
      brief:
        "You administer a single-control-plane kubeadm cluster for the fictional Brightwater Council (control plane node cp-1, two workers). etcd runs as a static pod from /etc/kubernetes/manifests/etcd.yaml with its data in /var/lib/etcd and its certificates under /etc/kubernetes/pki/etcd/. A platform change is scheduled for this afternoon and the change board wants a verified backup first.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "On cp-1 you read the etcd static pod manifest:\n\n$ sudo grep -E 'listen-client-urls|cert-file|key-file|trusted-ca-file|data-dir' /etc/kubernetes/manifests/etcd.yaml\n    - --cert-file=/etc/kubernetes/pki/etcd/server.crt\n    - --data-dir=/var/lib/etcd\n    - --key-file=/etc/kubernetes/pki/etcd/server.key\n    - --listen-client-urls=https://127.0.0.1:2379,https://10.20.0.11:2379\n    - --trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt\n\n$ etcdctl version\netcdctl version: 3.7.0\nAPI version: 3.7",
          ask: "Write the command that takes the snapshot to /opt/backups/etcd-pre-change.db and the command that verifies it, and say what each flag is for.",
          parts: [
            part(
              "Snapshot command",
              "etcdctl snapshot save <path> with --endpoints pointing at a listen-client URL (https://127.0.0.1:2379), --cacert=/etc/kubernetes/pki/etcd/ca.crt, --cert=/etc/kubernetes/pki/etcd/server.crt and --key=/etc/kubernetes/pki/etcd/server.key (a peer or healthcheck-client cert pair also works). Run on the control plane node (or inside the etcd pod).",
              "sudo etcdctl --endpoints=https://127.0.0.1:2379 \\\n  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\\n  --cert=/etc/kubernetes/pki/etcd/server.crt \\\n  --key=/etc/kubernetes/pki/etcd/server.key \\\n  snapshot save /opt/backups/etcd-pre-change.db\n\n--endpoints is where etcd listens for clients (from --listen-client-urls); --cacert verifies etcd's serving certificate; --cert/--key authenticate the client, because etcd requires client certificates (--client-cert-auth). ETCDCTL_API=3 is the default on 3.4+ so it is optional."
            ),
            part(
              "Verification",
              "Checks the snapshot with etcdutl snapshot status <file> (etcdctl snapshot status was removed in etcd 3.6, so it is not accepted) and reads back hash, revision, total keys and size; optionally also confirms the cluster is healthy with etcdctl endpoint health.",
              "sudo etcdutl snapshot status /opt/backups/etcd-pre-change.db --write-out=table prints the hash, revision, total keys and total size; a non-trivial key count (thousands) confirms it holds the cluster state, not an empty file. etcdctl ... endpoint health confirms the member answered."
            ),
          ],
        },
        {
          text: "The change goes ahead at 14:10. At 14:25 the on-call channel lights up:\n\n$ kubectl get ns\nNAME              STATUS   AGE\ndefault           Active   212d\nkube-node-lease   Active   212d\nkube-public       Active   212d\nkube-system       Active   212d\n\n$ kubectl get deploy -A | grep -v kube-system\n(no output)\n\nThe engineer who ran the change says: \"The script was meant to delete the namespace 'planning-staging'. It had a loop in it. It deleted every namespace that wasn't kube-*... including 'planning' and 'permits', which are production.\" Nobody has recreated anything yet. The snapshot from 13:55 is on cp-1.",
          ask: "Decide whether to restore from the snapshot or rebuild by hand, and justify it. Then write the restore procedure step by step for this stacked, static-pod etcd.",
          parts: [
            part(
              "Decision and what is lost",
              "Chooses to restore from the 13:55 snapshot because two production namespaces and everything in them were deleted and the snapshot predates the damage; states plainly that every change to the cluster state between 13:55 and the restore is lost (including anything created by the change itself), and that persistent data on volumes is not in etcd and is unaffected either way.",
              "Restore. The snapshot is 30 minutes old and captures both production namespaces with all their Deployments, Services, ConfigMaps, Secrets and RBAC; recreating that by hand from Git would be slower and would miss anything that was only ever in the cluster. The cost: the cluster returns to its 13:55 state, so the change itself and anything else since then is gone and must be re-applied. Data inside PersistentVolumes is not in etcd; it is untouched by the deletion only if the reclaim policy kept the volumes, and untouched by the restore in any case."
            ),
            part(
              "Restore to a new data directory",
              "Runs etcdutl snapshot restore <file> --data-dir=<new dir> (e.g. /var/lib/etcd-restored), not over the live /var/lib/etcd, explaining that restore creates a fresh member data directory. Does not delete the existing data directory until the restore is confirmed.",
              "sudo etcdutl snapshot restore /opt/backups/etcd-pre-change.db --data-dir=/var/lib/etcd-restored\n\n(etcdctl snapshot restore was removed in etcd 3.6; on this 3.7 cluster only etcdutl restores.) Restore writes a brand-new data directory for a single member; it refuses to write into a non-empty one. Keeping /var/lib/etcd in place until the cluster is confirmed healthy is the rollback path."
            ),
            part(
              "Point the static pod at the restored data",
              "Edits /etc/kubernetes/manifests/etcd.yaml so the etcd-data hostPath volume (and therefore the mount behind --data-dir) points at the new directory, then waits for the kubelet to recreate the static pod; recognises there is no kubectl apply for a static pod, and that the API server will be briefly unavailable while etcd restarts.",
              "In /etc/kubernetes/manifests/etcd.yaml change the volume\n  - hostPath:\n      path: /var/lib/etcd        ->   /var/lib/etcd-restored\n      type: DirectoryOrCreate\n    name: etcd-data\nand leave --data-dir=/var/lib/etcd alone (the container path), or change both consistently. Save; the kubelet notices the manifest change and restarts the static pod. kubectl will time out for a minute while etcd and then the API server come back. If the pod does not restart, moving the manifest out of the directory and back in forces it."
            ),
            part(
              "Confirm and follow up",
              "Verifies with kubectl get ns (planning and permits back) and kubectl get pods -A, checks etcd health, and names at least one follow-up: re-apply the intended change safely, RBAC that stops a CI identity deleting namespaces, scheduled snapshots.",
              "kubectl get ns shows planning and permits Active again; kubectl get deploy -A shows their workloads (Pods may restart as controllers reconcile). etcdctl ... endpoint health reports healthy. Follow-ups: re-run the intended deletion of planning-staging alone; restrict the change identity so it cannot delete namespaces (no cluster-wide delete on namespaces); put snapshot save on a timer and copy snapshots off the node."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 15%
    {
      slug: "stuck-rollout",
      objective:
        "Understand application deployments and perform rolling updates and rollbacks with kubectl rollout status, history and undo, and tune maxSurge and maxUnavailable",
      kind: "case",
      title: "Recover a Deployment whose rolling update will not finish",
      brief:
        "The fictional ticketing company Rowan Live runs its web API as the Deployment api in namespace tickets, 6 replicas, behind a Service. A developer pushed a new image tag with kubectl set image a few minutes ago and reports that \"the rollout is hanging and some users are getting errors\".",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n tickets rollout status deploy/api\nWaiting for deployment \"api\" rollout to finish: 2 out of 6 new replicas have been updated...\n\n$ kubectl -n tickets get pods -l app=api\nNAME                   READY   STATUS             RESTARTS   AGE\napi-5c9d7f8b6-2xk9p    1/1     Running            0          3d\napi-5c9d7f8b6-7hq2m    1/1     Running            0          3d\napi-5c9d7f8b6-9zr4t    1/1     Running            0          3d\napi-5c9d7f8b6-fj6wn    1/1     Running            0          3d\napi-5c9d7f8b6-wd5bc    1/1     Running            0          3d\napi-7b44d9c5f-k2v8d    0/1     ImagePullBackOff   0          4m\napi-7b44d9c5f-qp3ls    0/1     ImagePullBackOff   0          4m\n\n$ kubectl -n tickets describe pod api-7b44d9c5f-k2v8d | tail -4\n  Warning  Failed     2m (x4 over 4m)   kubelet  Failed to pull image \"registry.rowanlive.example/api:2.14.0\": rpc error: code = NotFound desc = failed to pull and unpack image \"registry.rowanlive.example/api:2.14.0\": not found\n  Warning  Failed     2m (x4 over 4m)   kubelet  Error: ErrImagePull\n  Normal   BackOff    1m (x6 over 4m)   kubelet  Back-off pulling image \"registry.rowanlive.example/api:2.14.0\"\n  Warning  Failed     1m (x6 over 4m)   kubelet  Error: ImagePullBackOff",
          ask: "Explain what the cluster is doing and why users see errors, then write the fastest safe command to get all users back to a working version.",
          parts: [
            part(
              "Diagnosis",
              "States that the new ReplicaSet's Pods cannot pull the image (the tag 2.14.0 does not exist in the registry, or the registry name is wrong) so they never become Ready, and that the Deployment's rolling strategy has already scaled the old ReplicaSet down to 5 of 6 (the most the default 25% maxUnavailable allows), which is why capacity is reduced and some users see errors.",
              "The new ReplicaSet (api-7b44d9c5f) is stuck in ImagePullBackOff: the registry says the tag 2.14.0 is not found, so those Pods never pass readiness. Meanwhile the rolling update has already removed one old Pod (6 -> 5 running), so the Service has 5 healthy endpoints instead of 6 and, at peak load, is overloaded -- that is the user-facing error. It stops at 5 because maxUnavailable (25% of 6, rounded down to 1) forbids going lower while the new Pods are not Ready. The rollout waits forever because the new Pods will never be Ready."
            ),
            part(
              "Fastest safe recovery",
              "kubectl -n tickets rollout undo deploy/api (optionally --to-revision after checking rollout history) to return to the previous ReplicaSet, then rollout status to confirm 6/6; rejects editing the live Pods or deleting them as a fix.",
              "kubectl -n tickets rollout history deploy/api        # confirm the previous revision is the 3-day-old one\nkubectl -n tickets rollout undo deploy/api\nkubectl -n tickets rollout status deploy/api         # deployment \"api\" successfully rolled out\nUndo scales the old ReplicaSet back to 6 and the broken one to 0. Deleting the ImagePullBackOff Pods would just recreate them; fixing them in place is impossible because the image does not exist."
            ),
          ],
        },
        {
          text: "The undo completes and 6/6 old Pods are Running. The developer finds the real tag is 2.14.1 and asks you to roll it out, but the product owner adds a requirement: \"During a release we must never drop below 6 serving Pods again, and if the new version is broken it must never take more than one Pod's worth of capacity.\"\n\n$ kubectl -n tickets get deploy api -o jsonpath='{.spec.strategy}'\n{\"rollingUpdate\":{\"maxSurge\":\"25%\",\"maxUnavailable\":\"25%\"},\"type\":\"RollingUpdate\"}",
          ask: "Set the Deployment's strategy to meet both requirements, explain the arithmetic for 6 replicas, and write the commands for the new rollout with a record of why.",
          parts: [
            part(
              "Strategy values",
              "Sets maxUnavailable to 0 (never below 6 ready Pods) and maxSurge to 1 (at most one extra Pod at a time), as a patch or edit of spec.strategy.rollingUpdate; explains that with 25% on 6 replicas the controller rounds maxUnavailable down to 1 and maxSurge up to 2, which is exactly why the broken rollout created 2 new Pods and left 5 old ones serving.",
              "kubectl -n tickets patch deploy api -p '{\"spec\":{\"strategy\":{\"rollingUpdate\":{\"maxSurge\":1,\"maxUnavailable\":0}}}}'\n\nWith 6 replicas, 25% maxUnavailable rounds down to 1 and 25% maxSurge rounds up to 2, so the controller keeps at least 6-1=5 Pods available and runs up to 8 in total; that is why it created 2 new Pods and removed 1 old one (5 old + 2 new = 7 Pods). maxUnavailable: 0 forbids removing any old Pod until a new one is Ready; maxSurge: 1 means one new Pod at a time, so a broken image costs one Pod of scheduling, not serving capacity."
            ),
            part(
              "Release and record",
              "Updates the image to the correct tag (kubectl set image or edit) and records the reason with an annotation on the Deployment (kubernetes.io/change-cause) so rollout history shows it; watches with rollout status and knows undo is the way back.",
              "kubectl -n tickets set image deploy/api api=registry.rowanlive.example/api:2.14.1\nkubectl -n tickets annotate deploy/api kubernetes.io/change-cause=\"api 2.14.1 - ticket ROW-812\" --overwrite\nkubectl -n tickets rollout status deploy/api\nkubectl -n tickets rollout history deploy/api shows the change cause per revision. If it fails, rollout undo again. (kubectl's --record flag is deprecated; the annotation is the current way.)"
            ),
            part(
              "Why readiness matters here",
              "Points out that maxUnavailable: 0 only protects users if the containers have a readiness probe that fails for a broken version; a Pod that is Running without a probe counts as Ready at once.",
              "maxUnavailable: 0 holds old Pods until new ones are Ready, and Ready means the readiness probe passes. Without a readinessProbe on the api container a new Pod is Ready the moment its container starts, so a version that starts but returns errors would be rolled out fully. Add an HTTP readiness probe on the health endpoint so a bad build never gets past one surge Pod."
            ),
          ],
        },
      ],
    },
    {
      slug: "schedule-gpu-inference-pod",
      objective:
        "Place Pods with nodeSelector, node affinity and anti-affinity, pod affinity, taints and tolerations, and topology spread constraints",
      kind: "build",
      title: "Schedule an inference Deployment onto the reserved GPU nodes",
      brief:
        "The fictional lab Meridian Vision has a 9-node cluster. Three nodes carry the label accelerator=nvidia-l4 and the taint dedicated=gpu:NoSchedule so ordinary workloads stay off them. Two of those three nodes are in zone eu-west-1a and one in eu-west-1b (label topology.kubernetes.io/zone). You must write a Deployment inference (namespace ml, 3 replicas, image registry.meridian.example/inference:4.2) that runs only on the GPU nodes, is spread so that no single node holds all replicas, requests 1 GPU (resource name nvidia.com/gpu), 2 CPU and 8Gi memory with memory limited to 8Gi, and prefers (but does not require) the zone eu-west-1a where the model cache lives.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Pod template's scheduling and resources sections of the Deployment and explain what each part does and what would happen without it.",
          parts: [
            part(
              "Toleration for the GPU taint",
              "A toleration with key dedicated, operator Equal, value gpu, effect NoSchedule (or operator Exists on key dedicated with effect NoSchedule); explains a toleration permits but does not attract scheduling onto the tainted nodes.",
              "tolerations:\n- key: dedicated\n  operator: Equal\n  value: gpu\n  effect: NoSchedule\nWithout it the three GPU nodes are excluded and all three Pods stay Pending (\"3 node(s) had untolerated taint {dedicated: gpu}\" in describe). A toleration alone would still let the scheduler place the Pods on any of the other six nodes."
            ),
            part(
              "Hard node affinity to the GPU nodes",
              "requiredDuringSchedulingIgnoredDuringExecution node affinity (or nodeSelector) matching accelerator In [nvidia-l4], so the Pods can only land on GPU nodes; notes required-during-scheduling is not re-evaluated after placement.",
              "affinity:\n  nodeAffinity:\n    requiredDuringSchedulingIgnoredDuringExecution:\n      nodeSelectorTerms:\n      - matchExpressions:\n        - {key: accelerator, operator: In, values: [nvidia-l4]}\n(nodeSelector: {accelerator: nvidia-l4} is the simpler equivalent.) Together with the toleration this makes the GPU nodes the only candidates. IgnoredDuringExecution means a label change later does not evict a running Pod."
            ),
            part(
              "Soft zone preference",
              "preferredDuringSchedulingIgnoredDuringExecution with a weight and matchExpressions topology.kubernetes.io/zone In [eu-west-1a]; explains the scheduler scores rather than filters on it, so Pods still schedule in eu-west-1b when 1a is full.",
              "    preferredDuringSchedulingIgnoredDuringExecution:\n    - weight: 80\n      preference:\n        matchExpressions:\n        - {key: topology.kubernetes.io/zone, operator: In, values: [eu-west-1a]}\nPreferred terms add to a node's score; they never make a Pod unschedulable. With only two 1a GPU nodes, the third replica can go to 1b."
            ),
            part(
              "Spread across nodes",
              "A topologySpreadConstraint with topologyKey kubernetes.io/hostname, maxSkew 1 and whenUnsatisfiable DoNotSchedule (or a required podAntiAffinity on the app label with topologyKey kubernetes.io/hostname) so the three replicas land on three different nodes.",
              "topologySpreadConstraints:\n- maxSkew: 1\n  topologyKey: kubernetes.io/hostname\n  whenUnsatisfiable: DoNotSchedule\n  labelSelector:\n    matchLabels: {app: inference}\nWith three GPU nodes and three replicas this gives one per node; a fourth replica would be Pending rather than doubling up. A required podAntiAffinity on app=inference with topologyKey kubernetes.io/hostname achieves the same for this size."
            ),
            part(
              "Resources and the GPU request",
              "resources.requests with cpu: \"2\", memory: 8Gi and nvidia.com/gpu: 1, and limits with memory: 8Gi and nvidia.com/gpu: 1; explains extended resources like GPUs must have requests equal to limits and cannot be overcommitted, and that the scheduler only places the Pod on a node advertising that capacity.",
              "resources:\n  requests: {cpu: \"2\", memory: 8Gi, nvidia.com/gpu: 1}\n  limits: {memory: 8Gi, nvidia.com/gpu: 1}\nnvidia.com/gpu is an extended resource: the request must equal the limit, it cannot be fractional or overcommitted, and a node only qualifies if its device plugin advertises allocatable GPUs. CPU is left without a limit on purpose to avoid throttling; memory request = limit gives the container a Guaranteed-style memory footprint for eviction."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "network-policy-three-tier",
      objective:
        "Define and enforce NetworkPolicies with podSelector, namespaceSelector and ipBlock rules for ingress and egress, and understand default-deny and policy additivity",
      kind: "build",
      title: "Lock down a namespace with NetworkPolicies without breaking DNS",
      brief:
        "Fictional retailer Juniper Goods runs namespace storefront with three Deployments labelled tier=web, tier=api and tier=db (PostgreSQL on 5432). The web tier listens on 8080 and is reached only through the ingress controller, which runs in namespace ingress-nginx (the namespace carries the automatic label kubernetes.io/metadata.name=ingress-nginx). The api tier listens on 9000 and is called only by web. Only api may talk to db. All Pods must still resolve DNS through CoreDNS in kube-system, and api must reach the payment provider at 203.0.113.0/24 on 443. Everything else must be denied. The cluster's CNI plugin enforces NetworkPolicy.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the set of NetworkPolicy objects for storefront and explain how they combine.",
          parts: [
            part(
              "Default deny",
              "A NetworkPolicy in storefront with an empty podSelector ({}) and policyTypes [Ingress, Egress] and no rules, so every Pod in the namespace is isolated for both directions until a policy allows traffic.",
              "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: {name: default-deny, namespace: storefront}\nspec:\n  podSelector: {}\n  policyTypes: [Ingress, Egress]\nAn empty podSelector selects every Pod; listing both policyTypes with no ingress/egress rules denies everything. Policies are additive, so later policies only ever open holes in this."
            ),
            part(
              "DNS egress for everyone",
              "An egress policy selecting all Pods that allows UDP and TCP 53 to Pods in the namespace selected by namespaceSelector kubernetes.io/metadata.name=kube-system (optionally with podSelector k8s-app=kube-dns); explains that without it every name lookup fails once default-deny is in place.",
              "kind: NetworkPolicy\nmetadata: {name: allow-dns, namespace: storefront}\nspec:\n  podSelector: {}\n  policyTypes: [Egress]\n  egress:\n  - to:\n    - namespaceSelector:\n        matchLabels: {kubernetes.io/metadata.name: kube-system}\n      podSelector:\n        matchLabels: {k8s-app: kube-dns}\n    ports:\n    - {protocol: UDP, port: 53}\n    - {protocol: TCP, port: 53}\nDefault-deny egress blocks lookups to the cluster DNS Service, so Services stop resolving even when the data path is allowed."
            ),
            part(
              "Ingress to web from the ingress controller only",
              "An ingress policy on podSelector tier=web allowing port 8080 from namespaceSelector kubernetes.io/metadata.name=ingress-nginx (not from all namespaces, not from an empty from).",
              "kind: NetworkPolicy\nmetadata: {name: web-ingress, namespace: storefront}\nspec:\n  podSelector:\n    matchLabels: {tier: web}\n  policyTypes: [Ingress]\n  ingress:\n  - from:\n    - namespaceSelector:\n        matchLabels: {kubernetes.io/metadata.name: ingress-nginx}\n    ports:\n    - {protocol: TCP, port: 8080}\nA from: with a namespaceSelector and a podSelector in ONE list item means AND; as two items it means OR -- a common mistake that opens the policy to the whole namespace."
            ),
            part(
              "web to api, api to db",
              "Ingress on tier=api port 9000 from podSelector tier=web; ingress on tier=db port 5432 from podSelector tier=api; and because egress is default-denied too, matching egress rules on web (to api:9000) and api (to db:5432), since both ends must allow a connection.",
              "api-ingress: podSelector tier=api, ingress from podSelector {tier: web} port TCP 9000.\ndb-ingress: podSelector tier=db, ingress from podSelector {tier: api} port TCP 5432.\nweb-egress: podSelector tier=web, egress to podSelector {tier: api} port 9000.\napi-egress: podSelector tier=api, egress to podSelector {tier: db} port 5432 (plus the payment rule below).\nA connection is allowed only when the source's egress AND the destination's ingress both permit it; with egress denied by default, ingress rules alone are not enough. podSelector without a namespaceSelector means Pods in the same namespace."
            ),
            part(
              "External egress for api",
              "An egress rule on tier=api with ipBlock cidr 203.0.113.0/24 on TCP 443 and nothing wider (no 0.0.0.0/0); notes ipBlock is for IPs outside the cluster and that Pod IPs should be matched by selectors, not CIDRs.",
              "In api-egress add:\n  - to:\n    - ipBlock:\n        cidr: 203.0.113.0/24\n    ports:\n    - {protocol: TCP, port: 443}\nipBlock matches by destination IP, right for an external provider; it is not reliable for in-cluster Pods because their IPs are translated and change. Granting 0.0.0.0/0 would undo the point of the exercise."
            ),
          ],
        },
      ],
    },
    {
      slug: "service-no-endpoints",
      objective:
        "Debug Service connectivity with kubectl get endpointslices, port-forward and a temporary client Pod running nslookup, curl and wget",
      kind: "case",
      title: "Find out why the orders Service returns nothing",
      brief:
        "Fictional marketplace Larkspur runs Deployment orders (3 Pods, container port 8080, label app=orders) and Service orders in namespace market. Since a config change this morning, the checkout Pods in the same namespace get connection errors calling http://orders:80/health. Nothing has been changed on the checkout side.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n market get svc orders -o wide\nNAME     TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE   SELECTOR\norders   ClusterIP   10.96.144.201   <none>        80/TCP    41d   app=order\n\n$ kubectl -n market get endpointslices -l kubernetes.io/service-name=orders\nNAME           ADDRESSTYPE   PORTS   ENDPOINTS   AGE\norders-x7k2p   IPv4          <unset> <unset>     41d\n\n$ kubectl -n market get pods -l app=orders -o wide\nNAME                      READY   STATUS    RESTARTS   AGE   IP            NODE\norders-6d8c7b9f4-2lpqw    1/1     Running   0          2h    10.244.1.19   worker-1\norders-6d8c7b9f4-8vnmz    1/1     Running   0          2h    10.244.2.23   worker-2\norders-6d8c7b9f4-tq4rc    1/1     Running   0          2h    10.244.1.20   worker-1",
          ask: "Say what is wrong and fix it with a single kubectl command, then show how you confirm the fix from inside the cluster.",
          parts: [
            part(
              "Cause",
              "Spots that the Service selector is app=order while the Pods are labelled app=orders, so the EndpointSlice has no endpoints and the Service has nothing to send traffic to.",
              "The Service's selector (app=order) does not match the Pods' label (app=orders) -- a one-letter typo from this morning's change. The EndpointSlice for the Service is empty (<unset>), which is why every connection to orders:80 fails although the Pods are healthy."
            ),
            part(
              "Fix",
              "Patches the Service selector to app=orders (kubectl patch or kubectl edit), rather than relabelling the Pods or recreating the Service; confirms the EndpointSlice now lists the three Pod IPs.",
              "kubectl -n market patch svc orders -p '{\"spec\":{\"selector\":{\"app\":\"orders\"}}}'\nkubectl -n market get endpointslices -l kubernetes.io/service-name=orders  -> ENDPOINTS 10.244.1.19,10.244.2.23,10.244.1.20\nChanging the Pod labels instead would also detach them from their Deployment's selector; the Service is the object that was changed, so fix the Service."
            ),
          ],
        },
        {
          text: "The EndpointSlice now shows the three IPs, but checkout still fails. You test from a throwaway Pod:\n\n$ kubectl -n market run tmp --rm -it --image=busybox:1.36 --restart=Never -- sh\n/ # nslookup orders\nServer:    10.96.0.10\nAddress:   10.96.0.10:53\nName:      orders.market.svc.cluster.local\nAddress:   10.96.144.201\n/ # wget -qO- --timeout=3 http://orders:80/health\nwget: can't connect to remote host (10.96.144.201): Connection refused\n/ # wget -qO- --timeout=3 http://10.244.1.19:8080/health\n{\"status\":\"ok\"}\n\n$ kubectl -n market get svc orders -o jsonpath='{.spec.ports}'\n[{\"name\":\"http\",\"port\":80,\"protocol\":\"TCP\",\"targetPort\":80}]",
          ask: "Interpret the three test results, fix the remaining problem, and list the checks you would run in order next time a Service is unreachable.",
          parts: [
            part(
              "Interpretation",
              "DNS is fine (name resolves to the ClusterIP), the Pod itself answers on 8080, but the Service forwards to targetPort 80 where nothing listens, so the connection is refused by the Pod; targetPort must be 8080 (or the container port's name).",
              "nslookup proves CoreDNS and the Service name are fine. The direct Pod request on 8080 proves the application is up. The refused connection through the Service means the forwarded port is wrong: targetPort is 80 but the container listens on 8080, so the Pod's kernel refuses the connection."
            ),
            part(
              "Fix",
              "Sets the Service port's targetPort to 8080 (or names the container port and references the name), and re-tests via the Service.",
              "kubectl -n market patch svc orders --type=json -p '[{\"op\":\"replace\",\"path\":\"/spec/ports/0/targetPort\",\"value\":8080}]'\nThen from the tmp Pod: wget -qO- http://orders:80/health -> {\"status\":\"ok\"}. Naming the containerPort (name: http) and setting targetPort: http makes the Service survive a port change later."
            ),
            part(
              "Checklist",
              "Orders the checks: Pods Running and Ready -> Service selector matches Pod labels -> EndpointSlice has addresses -> port/targetPort match the containerPort -> DNS resolves from a client Pod -> direct Pod IP works -> NetworkPolicy allows the path -> kube-proxy/CNI healthy on the node.",
              "1 kubectl get pods -l <selector> (Running, READY 1/1). 2 kubectl get svc -o wide: selector vs pod labels. 3 kubectl get endpointslices -l kubernetes.io/service-name=<svc>: addresses present. 4 port, targetPort, containerPort agree. 5 nslookup <svc> from a client Pod. 6 curl/wget the Pod IP:containerPort directly. 7 kubectl get networkpolicy -n <ns> and check both ends. 8 kube-proxy and CNI Pods on the node, kubectl describe svc for events."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 10%
    {
      slug: "storageclass-pvc-postgres",
      objective:
        "Implement StorageClasses and dynamic volume provisioning, including the default StorageClass, volumeBindingMode and allowVolumeExpansion",
      kind: "build",
      title: "Provide durable, expandable storage to a PostgreSQL Pod",
      brief:
        "Fictional analytics firm Oakline runs a kubeadm cluster on virtual machines where a CSI driver named csi.oakline-block.example provisions block volumes with zonal placement (a volume created in one zone cannot attach to a node in another). The data team needs a PostgreSQL Pod in namespace analytics with 50Gi of storage that survives Pod restarts, can grow later without recreating the database, and must never be deleted automatically when someone removes the claim. There is currently no StorageClass in the cluster.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the StorageClass, the PersistentVolumeClaim and the volume parts of the Pod spec, and explain each choice.",
          parts: [
            part(
              "StorageClass",
              "A storage.k8s.io/v1 StorageClass with provisioner csi.oakline-block.example, reclaimPolicy Retain, allowVolumeExpansion true and volumeBindingMode WaitForFirstConsumer; explains WaitForFirstConsumer delays provisioning until the Pod is scheduled so the zonal volume is created where the Pod lands.",
              "apiVersion: storage.k8s.io/v1\nkind: StorageClass\nmetadata: {name: oakline-block-retain}\nprovisioner: csi.oakline-block.example\nreclaimPolicy: Retain\nallowVolumeExpansion: true\nvolumeBindingMode: WaitForFirstConsumer\nWaitForFirstConsumer makes the provisioner wait for the scheduler's node choice, so a zonal volume is never created in a zone the Pod cannot run in (Immediate binding risks an unattachable volume). Retain keeps the backing volume when the claim is deleted; allowVolumeExpansion lets the claim grow in place."
            ),
            part(
              "Default class or not",
              "Decides whether to mark it default with the annotation storageclass.kubernetes.io/is-default-class: \"true\", with a reason either way; knows a claim with no storageClassName uses the default class and that Retain as a default means volumes pile up unless cleaned.",
              "Making it the default (annotation storageclass.kubernetes.io/is-default-class: \"true\") means every claim without storageClassName gets durable Retain storage -- safe, but Retain volumes must be deleted by hand, so a busy cluster leaks disks. A reasonable answer either way: default it so nobody's claim stays Pending for lack of a class, and add a second Delete-policy class for scratch data; or leave it non-default and reference it explicitly for the database."
            ),
            part(
              "PersistentVolumeClaim",
              "A PVC in analytics with storageClassName oakline-block-retain, accessModes [ReadWriteOnce] (block volumes attach to one node; ReadWriteOncePod is an acceptable stricter choice), resources.requests.storage 50Gi; explains why ReadWriteMany is wrong for a block disk.",
              "apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata: {name: pg-data, namespace: analytics}\nspec:\n  accessModes: [ReadWriteOnce]\n  storageClassName: oakline-block-retain\n  resources:\n    requests:\n      storage: 50Gi\nReadWriteOnce: a block volume mounts read-write on a single node, which is what a database needs; ReadWriteMany is for shared filesystems (NFS-style) and most block CSI drivers reject it. ReadWriteOncePod additionally restricts it to one Pod."
            ),
            part(
              "Pod volume and mount",
              "A volumes entry of type persistentVolumeClaim referencing pg-data and a volumeMounts entry on the postgres container at the data path (e.g. /var/lib/postgresql/data), optionally with a subPath so a lost+found directory does not break initdb.",
              "volumes:\n- name: data\n  persistentVolumeClaim:\n    claimName: pg-data\ncontainers:\n- name: postgres\n  image: postgres:16\n  volumeMounts:\n  - name: data\n    mountPath: /var/lib/postgresql/data\n    subPath: pgdata\nsubPath points PostgreSQL at an empty subdirectory, avoiding the lost+found directory an ext4 volume carries at its root. The PVC stays Pending until this Pod is scheduled (WaitForFirstConsumer), then binds."
            ),
            part(
              "Growing it later",
              "Expands by editing the PVC's spec.resources.requests.storage to a larger value (never smaller) because allowVolumeExpansion is true; knows the filesystem resize finishes when the Pod is running or restarted, and that the PV's capacity updates after.",
              "kubectl -n analytics patch pvc pg-data -p '{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"100Gi\"}}}}'\nThe CSI driver grows the volume; the filesystem is resized online or on the next mount, and kubectl get pvc shows the new capacity once done (status.conditions shows FileSystemResizePending meanwhile). Shrinking is not supported."
            ),
          ],
        },
      ],
    },
    {
      slug: "pvc-pending",
      objective: "Diagnose a PersistentVolumeClaim stuck in Pending and a Pod stuck ContainerCreating on a volume from kubectl describe events",
      kind: "case",
      title: "Unstick a claim that will not bind",
      brief:
        "On a small on-premises cluster for the fictional Cedar Hollow School District, a teacher-facing app in namespace gradebook has been Pending for twenty minutes. The cluster has no CSI driver; storage is a handful of administrator-created PersistentVolumes on NFS.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n gradebook get pod,pvc\nNAME                           READY   STATUS    RESTARTS   AGE\npod/gradebook-7f6c9d5b8-m4xqz  0/1     Pending   0          20m\n\nNAME                                  STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE\npersistentvolumeclaim/gradebook-data  Pending                                      nfs-shared     20m\n\n$ kubectl -n gradebook describe pvc gradebook-data | tail -3\n  Type     Reason              Age                 From                         Message\n  ----     ------              ----                ----                         -------\n  Warning  ProvisioningFailed  12s (x82 over 20m)  persistentvolume-controller  no volume plugin matched name: kubernetes.io/no-provisioner\n\n$ kubectl -n gradebook get pvc gradebook-data -o jsonpath='{.spec.accessModes} {.spec.resources.requests.storage}'\n[\"ReadWriteMany\"] 20Gi\n\n$ kubectl get pv\nNAME        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM   STORAGECLASS   AGE\nnfs-pv-01   10Gi       RWX            Retain           Available           nfs-shared     90d\nnfs-pv-02   50Gi       RWO            Retain           Available           nfs-shared     90d\nnfs-pv-03   50Gi       RWX            Retain           Available           nfs-fast       90d\n\n$ kubectl get storageclass\nNAME         PROVISIONER                    RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE\nnfs-shared   kubernetes.io/no-provisioner   Retain          Immediate           false                  90d\nnfs-fast     kubernetes.io/no-provisioner   Retain          Immediate           false                  90d",
          ask: "Explain exactly why the claim cannot bind to any of the three volumes, and give the smallest change that binds it.",
          parts: [
            part(
              "Why each PV is rejected",
              "Walks the matching rules: nfs-pv-01 is too small (10Gi < 20Gi); nfs-pv-02 has the wrong access mode (RWO, claim wants RWX); nfs-pv-03 has the right size and mode but a different storageClassName (nfs-fast vs nfs-shared). Reads the ProvisioningFailed event correctly: with no matching PV the controller tries to provision through the class, and kubernetes.io/no-provisioner is not a plugin that can create volumes, so the class supports static binding only.",
              "Static binding needs a PV with capacity >= the request, an access mode that includes the claim's, and the same storageClassName. nfs-pv-01: 10Gi is under 20Gi. nfs-pv-02: 50Gi is fine but RWO does not satisfy RWX. nfs-pv-03: 50Gi RWX would bind, but its class is nfs-fast, not nfs-shared. With no match, the controller asks the class nfs-shared to provision a volume; its provisioner is kubernetes.io/no-provisioner, which cannot create anything, hence 'no volume plugin matched name'. Nothing is created dynamically: the claim waits for a matching hand-made PV."
            ),
            part(
              "Smallest fix",
              "Either changes the claim's storageClassName to nfs-fast (if the fast tier is acceptable) or creates a new PV of >= 20Gi, RWX, class nfs-shared pointing at an NFS export; rejects shrinking the request to 10Gi as a fix if the app needs 20Gi. Knows storageClassName on a PVC is immutable after creation, so changing it means deleting and recreating the claim.",
              "Fastest: create a PV that matches -- kind PersistentVolume, capacity 20Gi (or more), accessModes [ReadWriteMany], storageClassName nfs-shared, persistentVolumeReclaimPolicy Retain, nfs: {server: ..., path: ...}. The controller binds within seconds and the Pod schedules. Alternatively delete the PVC and recreate it with storageClassName nfs-fast to take nfs-pv-03 (the PVC's class cannot be edited in place; deleting it is safe here because it never bound). Shrinking to 10Gi only fits if the app genuinely needs less."
            ),
          ],
        },
        {
          text: "The claim binds and the app runs. A month later the district moves the app to a new namespace, and an administrator deletes namespace gradebook, including the claim. The PV now shows:\n\n$ kubectl get pv nfs-pv-04\nNAME        CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS     CLAIM                      STORAGECLASS   AGE\nnfs-pv-04   20Gi       RWX            Retain           Released   gradebook/gradebook-data   nfs-shared     31d\n\nThe new claim gradebook-data in namespace gradebook-v2 is Pending with the same FailedBinding message, and the team needs the old grades back on the volume.",
          ask: "Explain the Released state and how to make the data available to the new claim without losing it.",
          parts: [
            part(
              "What Released means",
              "Explains that with reclaimPolicy Retain the PV keeps its data after the claim is deleted but stays Released and will not bind to a new claim because spec.claimRef still points at the old claim; a Delete policy would have removed the data.",
              "Released = the bound claim is gone but the volume and its data are kept (Retain). The PV still carries spec.claimRef for gradebook/gradebook-data, so the controller treats it as taken and the new claim cannot bind. Had the policy been Delete, the NFS data would have been removed with the claim."
            ),
            part(
              "Make it bindable, keep the data",
              "Removes the claimRef from the PV (kubectl patch pv ... --type=json remove /spec/claimRef, or kubectl edit) so it returns to Available, or pre-sets claimRef to the new claim's namespace and name; then the new 20Gi RWX nfs-shared claim binds and the files are intact. Does not delete and recreate the PV with a different path.",
              "kubectl patch pv nfs-pv-04 --type=json -p '[{\"op\":\"remove\",\"path\":\"/spec/claimRef\"}]' puts it back to Available and the new claim binds (if the new claim's size, mode and class match). To be sure no other claim grabs it first, instead set claimRef to {namespace: gradebook-v2, name: gradebook-data}. The NFS export is untouched either way, so the grades are still there. Verify with kubectl get pv (Bound to gradebook-v2/gradebook-data) and by listing the files from the Pod."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 30%
    {
      slug: "node-notready",
      objective:
        "Troubleshoot clusters and nodes: a NotReady node, kubelet configuration and certificates, the container runtime and the node's conditions with kubectl describe node, journalctl -u kubelet and crictl",
      kind: "case",
      title: "Bring a NotReady worker back",
      brief:
        "A three-node kubeadm cluster for the fictional Ashgrove Clinic has one worker, worker-2, reporting NotReady since 06:40 after overnight OS patching. Pods that were on it are being rescheduled and the ward dashboard is slow. You have SSH to all nodes and kubectl as an administrator.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl get nodes\nNAME       STATUS     ROLES           AGE    VERSION\ncp-1       Ready      control-plane   400d   v1.37.1\nworker-1   Ready      <none>          400d   v1.37.1\nworker-2   NotReady   <none>          400d   v1.37.1\n\n$ kubectl describe node worker-2 | grep -A6 'Conditions:'\nConditions:\n  Type             Status    LastHeartbeatTime                 LastTransitionTime                Reason              Message\n  ----             ------    -----------------                 ------------------                ------              -------\n  MemoryPressure   Unknown   Sat, 07 Nov 2026 06:39:12 +0000   Sat, 07 Nov 2026 06:40:02 +0000   NodeStatusUnknown   Kubelet stopped posting node status.\n  DiskPressure     Unknown   Sat, 07 Nov 2026 06:39:12 +0000   Sat, 07 Nov 2026 06:40:02 +0000   NodeStatusUnknown   Kubelet stopped posting node status.\n  PIDPressure      Unknown   Sat, 07 Nov 2026 06:39:12 +0000   Sat, 07 Nov 2026 06:40:02 +0000   NodeStatusUnknown   Kubelet stopped posting node status.\n  Ready            Unknown   Sat, 07 Nov 2026 06:39:12 +0000   Sat, 07 Nov 2026 06:40:02 +0000   NodeStatusUnknown   Kubelet stopped posting node status.",
          ask: "Say what the conditions tell you and which commands you run first on worker-2, in order, and why.",
          parts: [
            part(
              "Reading the conditions",
              "States that every condition is Unknown with 'Kubelet stopped posting node status', which means the API server has not heard from the kubelet since 06:39 -- the kubelet is down, cannot reach the API server, or the node is off -- rather than a real memory/disk/PID problem.",
              "Unknown on all four conditions with NodeStatusUnknown means the node controller stopped receiving heartbeats at 06:39; it says nothing about memory or disk. The suspects, in order of likelihood after patching: the kubelet service is not running, the container runtime is not running, or the node cannot reach the API server (network, certificate, time)."
            ),
            part(
              "First commands on the node",
              "SSH to worker-2 and run systemctl status kubelet (and containerd), then journalctl -u kubelet -n 50 --no-pager (or -xe) to read why it is not running, and crictl ps / crictl info to confirm the runtime; checks the node is up and has its IP before anything else.",
              "ssh worker-2\nsystemctl status kubelet\nsystemctl status containerd\njournalctl -u kubelet -n 50 --no-pager\nsudo crictl ps -a | head\nstatus tells you whether kubelet is active, failed or inactive; the journal gives the actual error; crictl proves the runtime socket answers. If the box were unreachable, the fix would start with the hypervisor, not kubectl."
            ),
          ],
        },
        {
          text: "worker-2$ systemctl status kubelet\n● kubelet.service - kubelet: The Kubernetes Node Agent\n     Loaded: loaded (/usr/lib/systemd/system/kubelet.service; enabled)\n    Drop-In: /usr/lib/systemd/system/kubelet.service.d\n             └─10-kubeadm.conf\n     Active: activating (auto-restart) (Result: exit-code) since Sat 2026-11-07 07:02:41 UTC; 3s ago\n\nworker-2$ journalctl -u kubelet -n 5 --no-pager\nNov 07 07:02:41 worker-2 kubelet[21877]: E1107 07:02:41.118223   21877 run.go:74] \"command failed\" err=\"failed to load kubelet config file, path: /var/lib/kubelet/config.yml, error: failed to load Kubelet config file /var/lib/kubelet/config.yml, error: open /var/lib/kubelet/config.yml: no such file or directory\"\nNov 07 07:02:41 worker-2 systemd[1]: kubelet.service: Main process exited, code=exited, status=1/FAILURE\nNov 07 07:02:41 worker-2 systemd[1]: kubelet.service: Failed with result 'exit-code'.\n\nworker-2$ ls /var/lib/kubelet/\nconfig.yaml  cpu_manager_state  device-plugins  kubeadm-flags.env  memory_manager_state  pki  plugins  plugins_registry  pod-resources  pods\n\nworker-2$ cat /var/lib/kubelet/kubeadm-flags.env\nKUBELET_KUBEADM_ARGS=\"--container-runtime-endpoint=unix:///var/run/containerd/containerd.sock --pod-infra-container-image=registry.k8s.io/pause:3.10\"\n\nworker-2$ grep -n 'config' /usr/lib/systemd/system/kubelet.service.d/10-kubeadm.conf\n3:Environment=\"KUBELET_CONFIG_ARGS=--config=/var/lib/kubelet/config.yml\"",
          ask: "Fix it and prove the node is Ready again, then say what you check about the workloads afterwards.",
          parts: [
            part(
              "Root cause and fix",
              "Identifies that the systemd drop-in points the kubelet at /var/lib/kubelet/config.yml while the real file is config.yaml; fixes the path in 10-kubeadm.conf (or the right kubelet config file), runs systemctl daemon-reload and systemctl restart kubelet. Does not reinstall or re-join the node.",
              "The drop-in's --config path was changed to config.yml (perhaps by the patching run or a hand edit) but the file is /var/lib/kubelet/config.yaml. Edit /usr/lib/systemd/system/kubelet.service.d/10-kubeadm.conf back to --config=/var/lib/kubelet/config.yaml, then:\nsudo systemctl daemon-reload\nsudo systemctl restart kubelet\nsystemctl status kubelet  -> active (running)\nNo re-join: the node's certificates and kubeconfig are intact."
            ),
            part(
              "Proof",
              "kubectl get nodes shows worker-2 Ready within about a minute; kubectl describe node worker-2 shows the conditions False with fresh heartbeats; journalctl shows the kubelet registering and syncing Pods; crictl ps shows containers starting.",
              "kubectl get nodes -w until worker-2 is Ready (heartbeats resume in ~10-40 s). kubectl describe node worker-2: Ready True, KubeletReady 'kubelet is posting ready status'. journalctl -u kubelet -f shows 'Successfully registered node' and Pods syncing. crictl ps shows the node's containers running again."
            ),
            part(
              "Workloads after recovery",
              "Checks that Pods evicted during the outage (NodeLost/Terminating) are cleaned up, that the node is schedulable (not cordoned by the patching tool: kubectl uncordon if SchedulingDisabled), and that DaemonSet Pods and the dashboard's Deployment are back to full replicas; considers whether to rebalance.",
              "kubectl get pods -A -o wide | grep worker-2 to see what came back; delete any Pods stuck Terminating from the outage. kubectl get node worker-2 -- if it shows SchedulingDisabled the patch tool cordoned it: kubectl uncordon worker-2. Confirm the dashboard Deployment is at desired replicas and its Pods are Ready; new Pods will not move back to worker-2 by themselves, so optionally rollout restart to rebalance."
            ),
          ],
        },
      ],
    },
    {
      slug: "apiserver-static-pod-down",
      objective:
        "Troubleshoot cluster components: static pod manifests for the API server, controller manager, scheduler and etcd, their flags and certificates, and reading their logs when kubectl itself fails",
      kind: "case",
      title: "Repair an API server that will not start after a manifest edit",
      brief:
        "A colleague at the fictional Fennimore Insurance platform team edited the kube-apiserver static pod manifest on the single control plane node cp-1 to \"turn on audit logging\" and left for the day. Since then every kubectl command fails. Workloads on the workers are still serving traffic.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl get nodes\nThe connection to the server 10.20.0.11:6443 was refused - did you specify the right host or port?\n\ncp-1$ sudo crictl ps -a --name kube-apiserver\nCONTAINER       IMAGE           CREATED          STATE    NAME             ATTEMPT   POD ID\n3f2a9c1e0b7d4   8c1d6f0a3b9e2   18 seconds ago   Exited   kube-apiserver   14        a71c0e9d2f3b1\n\ncp-1$ sudo crictl logs 3f2a9c1e0b7d4 2>&1 | tail -3\nE1107 18:22:07.551210       1 run.go:74] \"command failed\" err=\"unknown flag: --audit-log-maxbackups\"\n\ncp-1$ sudo grep -n audit /etc/kubernetes/manifests/kube-apiserver.yaml\n21:    - --audit-log-path=/var/log/kubernetes/audit/audit.log\n22:    - --audit-log-maxage=30\n23:    - --audit-log-maxbackups=10\n24:    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml",
          ask: "Explain why workloads still run while kubectl is dead, name the exact mistake, and say how you confirm the right flag without guessing.",
          parts: [
            part(
              "Why the data plane survives",
              "Explains that kubelets and running containers do not need the API server to keep serving; kube-proxy's rules and the CNI stay programmed; only changes (scheduling, scaling, self-healing, new Pods, kubectl) stop until the API server is back.",
              "The API server is the control plane's front door, not the data path. Containers already running keep running, kube-proxy's existing Service rules stay in the kernel, and the kubelets keep restarting their own Pods. What is lost is any change: no scheduling, no rollouts, no HPA, no kubectl, and if a node dies its Pods are not rescheduled."
            ),
            part(
              "The mistake",
              "Reads the container log via crictl (kubectl is unavailable) and names the bad flag: --audit-log-maxbackups is not a kube-apiserver flag; the correct one is --audit-log-maxbackup (singular). Notes the container is crash-looping (attempt 14) under the kubelet's static pod restarts.",
              "crictl logs on the exited kube-apiserver container shows 'unknown flag: --audit-log-maxbackups'. The real flag is --audit-log-maxbackup (no s). The kubelet keeps recreating the static pod from the manifest (ATTEMPT 14), so it will not recover until the manifest is fixed."
            ),
            part(
              "Confirm without guessing",
              "Checks the flag name against the kube-apiserver reference on kubernetes.io (allowed in the exam) or runs the binary's --help from the image (e.g. crictl/ctr run kube-apiserver --help | grep audit), rather than trying variants one restart at a time.",
              "Open kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/ and search 'audit-log-maxbackup'; or on the node: sudo ctr -n k8s.io run --rm registry.k8s.io/kube-apiserver:v1.37.1 help kube-apiserver --help | grep audit-log. Each wrong guess costs a crash-loop cycle and minutes of downtime, so check first."
            ),
          ],
        },
        {
          text: "You correct the flag to --audit-log-maxbackup=10. The kubelet restarts the static pod, and now:\n\ncp-1$ sudo crictl logs $(sudo crictl ps -a --name kube-apiserver -q | head -1) 2>&1 | tail -2\nE1107 18:31:42.907733       1 run.go:74] \"command failed\" err=\"loading audit policy file: open /etc/kubernetes/audit-policy.yaml: no such file or directory\"\n\ncp-1$ ls -l /etc/kubernetes/audit-policy.yaml\n-rw-r--r-- 1 root root 412 Nov  7 17:58 /etc/kubernetes/audit-policy.yaml\n\ncp-1$ sudo grep -n -A3 'volumeMounts:' /etc/kubernetes/manifests/kube-apiserver.yaml | head -8\n58:    volumeMounts:\n59:    - mountPath: /etc/ssl/certs\n60:      name: ca-certs\n61:      readOnly: true\n(... no mount for /etc/kubernetes/audit-policy.yaml or /var/log/kubernetes/audit ...)",
          ask: "Explain the new failure, finish the manifest correctly, and describe how you verify the control plane is fully healthy.",
          parts: [
            part(
              "Why the file is 'missing'",
              "Explains the file exists on the host but the API server runs in a container with its own filesystem; the manifest must mount the policy file (and the audit log directory) via hostPath volumes and volumeMounts, or the flag points at a path that does not exist inside the container.",
              "The path in the flag is a path inside the kube-apiserver container. /etc/kubernetes/audit-policy.yaml exists on cp-1 but is not mounted into the Pod, so from the container's point of view it does not exist. The same applies to /var/log/kubernetes/audit: without a hostPath mount the log would be written inside the container and lost on restart."
            ),
            part(
              "Manifest additions",
              "Adds a hostPath volume (type File) for the policy and a hostPath volume (type DirectoryOrCreate) for the log directory, with matching volumeMounts on the kube-apiserver container (policy readOnly), then saves and lets the kubelet recreate the static pod.",
              "volumeMounts:\n- mountPath: /etc/kubernetes/audit-policy.yaml\n  name: audit-policy\n  readOnly: true\n- mountPath: /var/log/kubernetes/audit\n  name: audit-log\nvolumes:\n- name: audit-policy\n  hostPath:\n    path: /etc/kubernetes/audit-policy.yaml\n    type: File\n- name: audit-log\n  hostPath:\n    path: /var/log/kubernetes/audit\n    type: DirectoryOrCreate\nSave the manifest; the kubelet watches /etc/kubernetes/manifests and recreates the Pod. If it seems not to notice, move the file out and back in."
            ),
            part(
              "Verification",
              "crictl ps shows kube-apiserver Running and not restarting; kubectl get --raw='/readyz?verbose' (or /livez) returns ok; kubectl get pods -n kube-system shows all control plane Pods Running; the audit log file on the host is growing; a quick kubectl get nodes works.",
              "sudo crictl ps --name kube-apiserver -> STATE Running, ATTEMPT no longer climbing.\nkubectl get --raw='/readyz?verbose' | tail -3 -> readyz check passed.\nkubectl get pods -n kube-system -> kube-apiserver-cp-1, kube-controller-manager-cp-1, kube-scheduler-cp-1, etcd-cp-1 all Running.\nsudo tail -1 /var/log/kubernetes/audit/audit.log shows JSON events arriving. Then kubectl get nodes to confirm workers are Ready and the controller manager has caught up."
            ),
          ],
        },
      ],
    },
    {
      slug: "crashloop-oomkilled",
      objective:
        "Troubleshoot application failures from Pod status: Pending, CrashLoopBackOff, ImagePullBackOff, CreateContainerConfigError and OOMKilled, using describe, events and exec",
      kind: "case",
      title: "Work out why the report worker keeps restarting",
      brief:
        "The fictional publisher Tidemark runs a Deployment report-worker (2 replicas) in namespace reports. Overnight one Pod started restarting, and this morning the queue of unrendered reports is growing. The Deployment was last changed four days ago. A few minutes ago an engineer edited a ConfigMap it reads, and the other Pod, replaced when its node was drained just after that edit, has not started since.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n reports get pods\nNAME                             READY   STATUS                       RESTARTS         AGE\nreport-worker-54f7c9d8b6-6lq2x   0/1     CreateContainerConfigError   0                3m\nreport-worker-54f7c9d8b6-vz8kp   0/1     CrashLoopBackOff             57 (5m ago)      4d\n\n$ kubectl -n reports describe pod report-worker-54f7c9d8b6-6lq2x | grep -A3 'Events' | tail -2\n  Warning  Failed     10s (x14 over 3m)  kubelet  Error: couldn't find key RENDER_THREADS in ConfigMap reports/report-worker-config\n\n$ kubectl -n reports describe pod report-worker-54f7c9d8b6-vz8kp | grep -A8 'Last State'\n    Last State:     Terminated\n      Reason:       OOMKilled\n      Exit Code:    137\n      Started:      Sat, 07 Nov 2026 08:11:03 +0000\n      Finished:     Sat, 07 Nov 2026 08:12:51 +0000\n    Ready:          False\n    Restart Count:  57\n\n$ kubectl -n reports get pod report-worker-54f7c9d8b6-vz8kp -o jsonpath='{.spec.containers[0].resources}'\n{\"limits\":{\"memory\":\"256Mi\"},\"requests\":{\"cpu\":\"250m\",\"memory\":\"256Mi\"}}\n\n$ kubectl -n reports get cm report-worker-config -o jsonpath='{.data}'\n{\"RENDER_TREADS\":\"4\",\"QUEUE_URL\":\"amqp://queue.reports.svc:5672\"}",
          ask: "There are two different failures here. Explain each from the evidence, and fix the one that is purely a configuration mistake.",
          parts: [
            part(
              "CreateContainerConfigError",
              "Explains the kubelet cannot build the container because the Pod's env references ConfigMap key RENDER_THREADS, which was misspelled RENDER_TREADS in the ConfigMap edit a few minutes ago; the container never starts, so RESTARTS is 0.",
              "CreateContainerConfigError happens before the container runs: the kubelet resolves env/volumes and fails. The event says key RENDER_THREADS is missing from report-worker-config, and the ConfigMap shows it was saved as RENDER_TREADS. The Pod was created 3 minutes ago (after the edit) and has never started, hence 0 restarts."
            ),
            part(
              "Fix the ConfigMap",
              "Corrects the key name in the ConfigMap (kubectl edit, or patch adding RENDER_THREADS and removing RENDER_TREADS) and notes that env from a ConfigMap is resolved every time the kubelet creates a container, including each restart of an existing Pod, so the kubelet's next retry (or deleting the Pod) picks it up, and the crash-looping Pod would hit the same error on its next restart if the key stayed wrong; no Deployment change needed.",
              "kubectl -n reports patch cm report-worker-config --type=json -p '[{\"op\":\"add\",\"path\":\"/data/RENDER_THREADS\",\"value\":\"4\"},{\"op\":\"remove\",\"path\":\"/data/RENDER_TREADS\"}]'\nThe kubelet retries container creation on its backoff and succeeds once the key exists; kubectl delete the Pod to skip the wait. Env vars from a ConfigMap are resolved each time a container is created, including every restart (they never change inside a running container). The OOM Pod last started at 08:11, just before the edit, so it hasn't met the typo yet; its next restart, due within the 5-minute back-off, would fail with CreateContainerConfigError too. Fixing the key now protects both Pods."
            ),
            part(
              "OOMKilled",
              "Reads Last State Terminated / Reason OOMKilled / Exit Code 137 as the kernel killing the container for exceeding its 256Mi memory limit about 100 seconds after each start, with CrashLoopBackOff being the kubelet's growing restart delay; identifies this as a sizing or leak problem, not a config typo.",
              "Exit code 137 with Reason OOMKilled: the container used more than its 256Mi limit and the kernel's OOM killer ended it, roughly 1 min 48 s after start every time; after 57 restarts the kubelet backs off up to 5 minutes between attempts (CrashLoopBackOff). The older ConfigMap value is fine for this Pod -- this is a memory-limit problem."
            ),
          ],
        },
        {
          text: "The first Pod now starts and renders reports. On the OOM Pod you gather more:\n\n$ kubectl -n reports logs report-worker-54f7c9d8b6-vz8kp --previous | tail -3\n2026-11-07T08:12:40Z INFO  rendering report 88211 (pages=412, images=1,930)\n2026-11-07T08:12:49Z INFO  heap 231MiB, rss 252MiB\n(no further output)\n\n$ kubectl -n reports top pod\nNAME                             CPU(cores)   MEMORY(bytes)\nreport-worker-54f7c9d8b6-6lq2x   412m         188Mi\nreport-worker-54f7c9d8b6-vz8kp   0m           0Mi\n\n$ kubectl -n reports describe limitrange\nName:       reports-defaults\nType        Resource  Min  Max    Default Request  Default Limit  Max Limit/Request Ratio\n----        --------  ---  ---    ---------------  -------------  -----------------------\nContainer   memory    -    1Gi    256Mi            256Mi          -\n\nThe product owner says report 88211 is a quarterly 400-page report that only comes once every three months, but it must render.",
          ask: "Decide how to fix the OOM properly, write the change, and explain why you did not simply remove the limit.",
          parts: [
            part(
              "What the evidence shows",
              "Links the OOM to one large report (412 pages, 1,930 images) pushing RSS past 256Mi, while the healthy Pod sits at ~188Mi on normal work; notes the LimitRange's defaults are what set 256Mi and its Max is 1Gi.",
              "The previous container's last log shows rss 252MiB while rendering the 412-page quarterly report, and it died seconds later -- that job needs more than 256Mi. Normal work runs around 188Mi. The 256Mi came from the namespace LimitRange defaults, which also caps any container at 1Gi."
            ),
            part(
              "The change",
              "Raises the container's memory limit (and request) in the Deployment to a value that fits the large job and stays within the LimitRange Max, e.g. requests 512Mi / limits 768Mi or 1Gi, via kubectl set resources or editing the Deployment; applies with a rollout so both replicas get it; or alternatively routes large reports to a separate Deployment with bigger limits.",
              "kubectl -n reports set resources deploy/report-worker --requests=cpu=250m,memory=512Mi --limits=memory=1Gi\nThat is within the LimitRange Max of 1Gi; the rollout replaces both Pods. kubectl -n reports rollout status deploy/report-worker, then re-queue report 88211 and watch kubectl top pod while it renders. If quarterly reports grow, a second Deployment (report-worker-large) with its own limits keeps the everyday Pods small."
            ),
            part(
              "Why not remove the limit",
              "Explains that no memory limit lets one runaway render consume node memory and trigger node-pressure eviction of other Pods; a limit converts that into a contained OOM of one container, and the LimitRange would apply its default anyway. Also keeps request close to real usage so scheduling stays accurate.",
              "Without a memory limit the container can grow until the node runs out, and then the kubelet evicts Pods by QoS and the node may become unstable -- a failure that hits every tenant on the node instead of one worker. A limit bounds the blast radius. In this namespace the LimitRange would re-apply 256Mi as a default anyway if the limit were simply deleted. Setting the request to realistic usage (512Mi) means the scheduler reserves what the Pod really needs."
            ),
          ],
        },
      ],
    },
  ],
};
