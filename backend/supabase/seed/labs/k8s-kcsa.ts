import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-164: Kubernetes and Cloud Native Security Associate (KCSA).
//
// Aligned to the six KCSA domains (Overview of Cloud Native Security 14%,
// Kubernetes Cluster Component Security 22%, Kubernetes Security
// Fundamentals 22%, Kubernetes Threat Model 16%, Platform Security 16%,
// Compliance and Security Frameworks 10%), read on 2026-11-07 from
// github.com/cncf/curriculum (KCSA Curriculum.pdf) and the exam page on
// training.linuxfoundation.org. Density (docs/labs.md, hybrid):
// 2 / 2 / 2 / 2 / 2 / 1.
//
// KCSA is a multiple-choice, beginner security exam, so like the KCNA labs
// these ask the learner to apply the concepts: classify exposures, trace an
// authentication and authorization decision, map incidents to the threat
// model, place controls in a platform, map a compliance requirement to
// evidence. Current GA mechanisms only (Pod Security Admission, not the
// removed PodSecurityPolicy). Organisations are fictional.

export const KCSA_LABS: SeedLabSet = {
  trackCode: "KCSA",
  sources: [
    source("https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/KCSA%20Curriculum.pdf", "exam_outline", "2026-11-07"),
    source("https://training.linuxfoundation.org/certification/kubernetes-and-cloud-native-security-associate-kcsa/", "exam_outline", "2026-11-07"),
    source("https://kubernetes.io/docs/concepts/security/cloud-native-security/", "reference", "2026-11-07"),
    source("https://kubernetes.io/docs/concepts/security/pod-security-admission/", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------- 14%
    {
      slug: "four-cs-mapping",
      objective: "The 4Cs of cloud native security -- cloud, cluster, container, code -- and why each layer depends on the ones outside it",
      kind: "build",
      title: "Place twelve proposed controls in the 4Cs",
      brief:
        "The fictional online pharmacy Verity Rx is writing its first cloud native security plan for a managed Kubernetes cluster on a public cloud. Twelve controls have been proposed by different teams: (1) private API server endpoint, (2) dependency vulnerability scanning in CI, (3) Pod Security Admission restricted on app namespaces, (4) distroless base images, (5) cloud IAM roles for nodes with least privilege, (6) RBAC review, (7) input validation and parameterised queries in the app, (8) read-only root filesystems, (9) VPC network segmentation and security groups, (10) image signing and verification at admission, (11) NetworkPolicy default deny, (12) secrets taken from a cloud secret manager at runtime instead of baked into images. The CISO wants them organised by layer, with gaps identified.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Assign each control to Cloud, Cluster, Container or Code, explain the dependency between layers with one concrete example, and name any layer that is thin and what you would add.",
          parts: [
            part(
              "Cloud layer",
              "Places 1 (private API endpoint -- a cloud network/perimeter setting on a managed cluster), 5 (node IAM roles) and 9 (VPC segmentation, security groups) in Cloud; explains Cloud is the trusted computing base everything else runs on.",
              "Cloud: (1) private API server endpoint, (5) least-privilege cloud IAM for nodes, (9) VPC segmentation and security groups. These are the provider-level foundations: who can reach the control plane at all, what the nodes themselves are allowed to do in the cloud account, and which networks touch which. On a managed cluster the provider runs the control plane, so your Cloud-layer work is mostly identity and network."
            ),
            part(
              "Cluster layer",
              "Places 3 (Pod Security Admission), 6 (RBAC), 10 (admission-time signature verification) and 11 (NetworkPolicy) in Cluster: Kubernetes API objects and admission that govern all workloads.",
              "Cluster: (3) Pod Security Admission restricted, (6) RBAC review, (10) image signature verification at admission, (11) NetworkPolicy default deny. Each is configured through the Kubernetes API and applies to every workload in scope regardless of what is inside the container -- the cluster's own policy and access layer."
            ),
            part(
              "Container layer",
              "Places 4 (distroless images), 8 (read-only root filesystem) and 12 (secrets injected at runtime rather than baked in) in Container: how the image is built and run.",
              "Container: (4) distroless base images, (8) readOnlyRootFilesystem, (12) secrets pulled at runtime instead of baked into the image. These shape what an attacker finds inside a running container: no shell or package manager, nowhere to write, and no credentials in image layers that anyone with registry access could extract."
            ),
            part(
              "Code layer and the dependency",
              "Places 2 (dependency scanning) and 7 (input validation, parameterised queries) in Code; gives an example of dependency: a Code-layer flaw (SQL injection) is contained by Container and Cluster controls (non-root, read-only filesystem, NetworkPolicy) only if Cloud is sound -- an over-broad node IAM role turns a container escape into a cloud account compromise.",
              "Code: (2) dependency scanning in CI, (7) input validation and parameterised queries. The layers nest: a bug in Code lets an attacker into a Container; the Container controls decide what they can do there; Cluster controls decide what else they can reach; Cloud decides what the node and account let them do if they get out. Example: SQL injection (Code) -> shell in the container (Container: read-only root and non-root limit it) -> tries other Pods (Cluster: NetworkPolicy blocks) -> escapes to the node (Cloud: a least-privilege node role means no S3 buckets to loot). Weakness in an outer layer undoes the inner ones."
            ),
            part(
              "The thin layer",
              "Identifies Code (two controls) or runtime detection as thin, and adds concrete items such as SAST, secret scanning in repositories, dependency update automation, or -- across layers -- audit logging and runtime detection (Falco) since the list has only preventive controls and no detective ones.",
              "The list is all prevention and no detection: nothing tells Verity Rx when a control fails. Add detective controls that span layers -- API audit logging shipped off-cluster, runtime detection (Falco) on the nodes, cloud audit trails -- and strengthen Code with SAST and secret scanning on the repository. Two Code controls for a pharmacy handling health data is thin."
            ),
          ],
        },
      ],
    },
    {
      slug: "registry-tag-repoint",
      objective:
        "Artifact repository and image security: trusted registries, image scanning, signing and provenance, tags versus digests, and admission control on images",
      kind: "case",
      title: "A production image changed without a deployment",
      brief:
        "The fictional travel insurer Brackenridge noticed that the behaviour of its quote service changed on Thursday night although no deployment had happened for a week. The platform engineer collects evidence from the cluster and the registry.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "$ kubectl -n quotes get deploy quote-api -o jsonpath='{.spec.template.spec.containers[0].image}'\nregistry.brackenridge.example/quote-api:stable\n\n$ kubectl -n quotes get pods -l app=quote-api -o jsonpath='{range .items[*]}{.metadata.name}{\" \"}{.status.containerStatuses[0].imageID}{\"\\n\"}{end}'\nquote-api-7c9d8b6f5-2kqlm registry.brackenridge.example/quote-api@sha256:9f1c...a72e\nquote-api-7c9d8b6f5-m4xzp registry.brackenridge.example/quote-api@sha256:9f1c...a72e\nquote-api-7c9d8b6f5-r8vqt registry.brackenridge.example/quote-api@sha256:41b0...c3d9\n\n$ kubectl -n quotes get pods -l app=quote-api -o jsonpath='{range .items[*]}{.metadata.name}{\" \"}{.status.startTime}{\"\\n\"}{end}'\nquote-api-7c9d8b6f5-2kqlm 2026-10-30T09:12:40Z\nquote-api-7c9d8b6f5-m4xzp 2026-10-30T09:12:41Z\nquote-api-7c9d8b6f5-r8vqt 2026-11-05T22:47:03Z\n\nRegistry audit log (abridged):\n2026-11-05T22:31:19Z PUT /v2/quote-api/manifests/stable  user=svc-ci-legacy  digest=sha256:41b0...c3d9\n2026-11-05T22:46:58Z GET /v2/quote-api/manifests/stable  user=node-puller",
          ask: "Explain what happened and why one Pod differs from the other two, then say what about the registry and image references made it possible.",
          parts: [
            part(
              "Reconstruction",
              "Reads that the Deployment pins a mutable tag (stable); on Nov 5 at 22:31 the account svc-ci-legacy pushed a new manifest under that tag; at 22:47 one Pod was recreated (a node event or eviction), the kubelet pulled stable and got the new digest 41b0..., while the two older Pods still run the original 9f1c... -- so one-third of traffic runs different code that nobody deployed.",
              "The Deployment references quote-api:stable, a tag that can be repointed. At 22:31 on 5 Nov someone (or something) using the svc-ci-legacy credential pushed a different image under the same tag. At 22:47 Pod r8vqt was recreated -- its start time is a week newer than its siblings -- and the kubelet resolved stable to the new digest 41b0...c3d9. The two surviving Pods still run 9f1c...a72e. Same spec, two different programs: the Deployment did not change, the tag's meaning did."
            ),
            part(
              "What made it possible",
              "Names the weaknesses: a mutable tag in production manifests instead of a digest or immutable version tag, a long-lived registry credential (svc-ci-legacy) still able to push to a production repository, no signature verification at admission, and no alert on manifest pushes to production tags.",
              "Four gaps. Mutable tag: image references by tag mean the registry decides what runs. Registry access: a 'legacy' CI credential could still PUT a production manifest -- it should have been retired, and production repositories should have push restricted to the release pipeline's identity, with immutable tags turned on. No verification: nothing checked the image was signed by the release pipeline before the kubelet ran it. No detection: a push to a production tag outside a release window raised no alert."
            ),
            part(
              "Why imageID matters",
              "Explains that containerStatuses[].imageID records the digest actually running, which is how the discrepancy was found, and that comparing it with the registry's expected digest (or an SBOM/attestation) is the right check for 'what is really running'.",
              "The Pod's imageID is the content digest the runtime actually pulled, independent of the tag in the spec. It is the only truthful answer to 'what code is running', which is why the investigation compared imageIDs across Pods rather than reading the Deployment. Routine drift detection should do the same: every running digest must match a digest the release pipeline signed."
            ),
          ],
        },
        {
          text: "The pushed image is pulled apart. It is the legitimate quote-api 2.3.1 with one extra layer that adds a cron entry posting request logs to an external host. The svc-ci-legacy credential was a token created two years ago for a decommissioned build server and never revoked.",
          ask: "Lay out the response and the registry and admission changes so a repointed tag can never reach production again.",
          parts: [
            part(
              "Immediate response",
              "Revokes svc-ci-legacy, deletes the malicious manifest/digest from the registry (after preserving a copy as evidence), rolls the Deployment to the known-good digest explicitly (image: ...@sha256:9f1c...a72e) so all Pods converge, rotates any credentials the container could read, and blocks the exfiltration host at egress.",
              "Revoke the svc-ci-legacy token and audit every other registry credential by age and last use. Save the 41b0... image for forensics, then delete it from the registry. kubectl -n quotes set image deploy/quote-api quote-api=registry.brackenridge.example/quote-api@sha256:9f1c...a72e so every Pod runs the verified digest. Rotate secrets the quote-api Pod could read, and add an egress NetworkPolicy (and a firewall block) for the exfiltration host. Review the registry log for other tags touched by that credential."
            ),
            part(
              "Registry hardening",
              "Immutable tags for production repositories, push limited to the release pipeline's short-lived identity (OIDC federation, no static tokens), scan-on-push with blocking of critical findings, and alerts on any manifest push outside the pipeline.",
              "Turn on tag immutability for production repositories so stable can never be repointed -- new releases get new tags. Restrict push to the release pipeline using short-lived, federated credentials (workload identity/OIDC) instead of static tokens; retire every long-lived token. Scan on push and block criticals. Alert on manifest writes by any identity other than the pipeline."
            ),
            part(
              "Admission and references",
              "Deployment manifests reference images by digest (or the pipeline resolves tags to digests at release), and an admission policy requires images from the approved registry, signed by the release pipeline's key or identity (cosign verification via Kyverno or the Sigstore policy controller) -- so an unsigned extra layer is rejected even if the registry were compromised.",
              "Reference by digest in Git (the release pipeline writes quote-api@sha256:... into the manifest) so the cluster never asks the registry what a tag means. At admission, require: image from registry.brackenridge.example/, and a valid cosign signature from the release pipeline's identity (Kyverno verifyImages or the Sigstore policy controller). A tampered image carries no valid signature, so even with registry access the attacker's layer never runs."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 22%
    {
      slug: "component-exposure-scan",
      objective:
        "Kubelet security: the 10250 API, anonymous authentication and Webhook authorization, the read-only port, and certificate rotation",
      kind: "case",
      title: "Read a port scan of a cluster node and say what each open port means",
      brief:
        "An internal red team at the fictional logistics firm Penrose Haulage scanned one control plane node and one worker of a self-managed kubeadm cluster from a Pod on the cluster network. They hand you the results and ask which exposures matter.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Scan from Pod 10.244.2.9 (namespace tools):\n\ncp-1 (10.20.0.11)\n  2379/tcp  open  etcd client        TLS, client cert required\n  2380/tcp  open  etcd peer          TLS\n  6443/tcp  open  kube-apiserver     TLS\n  10250/tcp open  kubelet            TLS\n  10257/tcp open  kube-controller-mgr TLS\n  10259/tcp open  kube-scheduler     TLS\n\nworker-2 (10.20.0.22)\n  10250/tcp open  kubelet            TLS\n  10255/tcp open  kubelet read-only  HTTP, no auth\n  10256/tcp open  kube-proxy healthz HTTP\n  30080/tcp open  nodeport           HTTP\n\n$ curl -s http://10.20.0.22:10255/pods | jq '.items[].spec.containers[].env[]? | select(.name|test(\"PASS|KEY|TOKEN\"))' | head -3\n{\"name\":\"DB_PASSWORD\",\"value\":\"s3cr3t-prod-2026\"}\n\n$ curl -sk https://10.20.0.22:10250/pods -o /dev/null -w '%{http_code}\\n'\n200",
          ask: "For each node, say which ports are expected on a kubeadm cluster and which are a problem, then explain exactly what the two curl results prove and how to fix each.",
          parts: [
            part(
              "Expected versus exposed on cp-1",
              "Recognises 6443 (API server), 2379/2380 (etcd client and peer, both TLS with client certs), 10250 (kubelet) and 10257/10259 (controller manager and scheduler secure ports) as normal; notes the real question for cp-1 is who can reach 2379 and 6443 at the network level, since etcd should be reachable only by the API server.",
              "cp-1 looks like a standard kubeadm control plane: API server on 6443, etcd client 2379 and peer 2380 with TLS and client certificate authentication, kubelet 10250, controller manager 10257 and scheduler 10259 on their secure ports. Nothing is misconfigured in the scan, but a Pod should not be able to open a TCP connection to etcd at all -- a host firewall or security group should limit 2379 to the control plane nodes themselves. 6443 reachable from Pods is normal (that is how workloads call the API)."
            ),
            part(
              "The read-only port",
              "Explains 10255 is the kubelet's legacy read-only port serving Pod specs and metrics with no authentication; the curl shows it leaking a database password from a Pod's environment to anyone on the network; fix by setting readOnlyPort: 0 in the kubelet configuration (and stop putting secrets in plain env values -- use Secrets).",
              "10255 is the kubelet read-only port: unauthenticated HTTP that returns every Pod spec on the node, environment variables included. The first curl proves an attacker on the Pod network can read DB_PASSWORD for a production database without any credential. Fix: readOnlyPort: 0 in /var/lib/kubelet/config.yaml and restart the kubelet on every node (kubeadm defaults it to 0; someone enabled it). Secondary fix: the password should come from a Secret, not a literal env value -- then even a leaked spec shows only a secretKeyRef."
            ),
            part(
              "Anonymous access on 10250",
              "Explains that a 200 from an unauthenticated request to the kubelet's secure port means anonymous authentication is enabled and authorization is AlwaysAllow; the kubelet API also permits exec, logs and run, so this is remote command execution in every container on the node; fix with authentication.anonymous.enabled false and authorization.mode Webhook.",
              "The second curl sent no credential (-k only skips TLS verification) and still got 200 from the kubelet API. That means anonymous requests are authenticated as system:anonymous and authorization is AlwaysAllow. The same API serves /exec and /run -- an attacker can execute commands in any container on worker-2 and read any Pod's logs. Fix in the kubelet config: authentication.anonymous.enabled: false, authentication.webhook.enabled: true, authorization.mode: Webhook; then an unauthenticated request returns 401 and authenticated ones are checked against RBAC by the API server."
            ),
            part(
              "The remaining ports",
              "10256 is kube-proxy's health endpoint (harmless, but can be bound to localhost), 30080 is a NodePort Service that is expected if someone created it but should be reviewed (NodePorts open on every node); and certificate rotation for the kubelet (rotateCertificates/serverTLSBootstrap) keeps 10250's TLS trustworthy.",
              "10256: kube-proxy's healthz, information-only; fine, or bind it to 127.0.0.1. 30080: a NodePort Service -- not a misconfiguration, but every node now serves it; check it is meant to be reachable from the Pod network and the office network, and prefer a LoadBalancer or Ingress with a NetworkPolicy. Also check the kubelet's certificates rotate (rotateCertificates: true and serverTLSBootstrap for the serving cert) so 10250's TLS does not quietly expire or rely on a self-signed cert the API server cannot verify."
            ),
          ],
        },
        {
          text: "The fixes go in. The red team then reports: 'From the tools namespace we could still reach etcd on 2379. The client certificate check stopped us, but we could also reach 6443 and we found a kubeconfig in a developer's Pod with a cluster-admin client certificate that does not expire until 2031.'",
          ask: "Assess the two findings and say what to change for etcd exposure and for client credentials.",
          parts: [
            part(
              "etcd reachability",
              "Even with client certificate auth, etcd should not be reachable from the Pod network: a future etcd bug or a stolen API server client certificate would expose every Secret; restrict 2379 with host firewall/security group rules to the control plane nodes (and 2380 to etcd peers), and keep etcd data encrypted at rest.",
              "Client certificate authentication held, which is why the scan shows 'client cert required' -- good. But reachability is itself a risk: etcd holds the whole cluster state, and the apiserver-etcd-client certificate on cp-1 is a single secret standing between any network-adjacent attacker and every Secret. Firewall 2379 to the control plane nodes only (2380 to the other etcd members), and enable encryption at rest so an etcd read still does not yield plaintext Secrets."
            ),
            part(
              "Client credentials",
              "A long-lived cluster-admin client certificate in a Pod is a critical finding: Kubernetes cannot revoke client certificates (no CRL/OCSP), so the only remedies are rotating the cluster CA or never issuing such certificates; recommends short-lived credentials (OIDC tokens via an identity provider, exec credential plugins, or kubectl create token with hours of lifetime), per-user RBAC instead of cluster-admin, and never mounting admin kubeconfigs into workloads.",
              "The kubeconfig is remote cluster-admin until 2031, and Kubernetes does not support revoking a client certificate -- the API server has no CRL. The only ways to kill it are rotating the cluster CA (disruptive) or ensuring it was never issued. Replace certificate-based human access with OIDC through the company identity provider (short-lived tokens, MFA, groups mapped to RBAC), scope developers to namespace Roles rather than cluster-admin, and forbid kubeconfigs in Pods -- workloads use their own ServiceAccount's projected token. Treat this certificate as compromised: audit what it did and plan the CA rotation if it cannot be accounted for."
            ),
          ],
        },
      ],
    },
    {
      slug: "etcd-and-apiserver-settings",
      objective:
        "etcd security: client and peer TLS, certificate authentication, encryption at rest, backups as sensitive data and network access limited to the API server",
      kind: "build",
      title: "Write the etcd and backup protection plan for a self-managed cluster",
      brief:
        "The fictional university consortium Thornbury runs a three-control-plane kubeadm cluster with stacked etcd. A new security lead asks for a one-page plan covering how etcd is protected in transit, at rest, in backups and on the network, with the Kubernetes or etcd setting for each item.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the plan: for transit, authentication, at-rest encryption, backups and network access, give the control, the setting that implements it and the risk it addresses.",
          parts: [
            part(
              "Transit and authentication",
              "TLS on client and peer connections with --cert-file/--key-file and --peer-cert-file/--peer-key-file, --client-cert-auth=true and --peer-client-cert-auth=true with --trusted-ca-file/--peer-trusted-ca-file so only certificates from the etcd CA are accepted; explains kubeadm sets these up and the API server authenticates with apiserver-etcd-client.crt.",
              "In transit: etcd serves clients and peers over TLS (--cert-file, --key-file, --peer-cert-file, --peer-key-file under /etc/kubernetes/pki/etcd). Authentication: --client-cert-auth=true with --trusted-ca-file=/etc/kubernetes/pki/etcd/ca.crt, and --peer-client-cert-auth=true with --peer-trusted-ca-file, so only a certificate signed by the etcd CA -- in practice the API server's apiserver-etcd-client.crt and the other members -- can connect. Risk addressed: anyone who can reach port 2379 reading or writing cluster state. kubeadm configures all of this by default; the plan is to verify it stays that way (kube-bench section 2)."
            ),
            part(
              "At rest",
              "An EncryptionConfiguration on every API server (--encryption-provider-config) with a real provider (aescbc/secretbox or a KMS v2 plugin) first and identity last, re-writing existing Secrets, and keeping the key file root-only; explains etcd itself stores what the API server gives it, so encryption happens in the API server.",
              "At rest: etcd stores exactly the bytes the API server writes, so encryption is an API server function -- --encryption-provider-config pointing at an EncryptionConfiguration (resources: secrets, optionally configmaps; providers: a KMS v2 plugin backed by the cloud or HSM key service, or aescbc/secretbox with a 32-byte key; identity last for reading old data). Apply to all three API servers before re-writing Secrets (kubectl get secrets -A -o json | kubectl replace -f -). Risk: anyone with the etcd data directory or a snapshot reading Secrets in clear."
            ),
            part(
              "Backups",
              "Treats snapshots as containing every Secret: encrypted at rest where stored (and the API server's encryption keys stored separately), access-controlled and audited, copied off the control plane, tested by restore, and retained by policy; mentions etcdctl snapshot save with the member's certificates.",
              "Backups: etcdctl --endpoints https://127.0.0.1:2379 --cacert ... --cert ... --key ... snapshot save on a schedule, then move the file off the node to storage that is encrypted and access-controlled, with the EncryptionConfiguration keys kept in a different place (a snapshot without them is unreadable; with them it is the whole cluster). Audit who downloads snapshots, test restores quarterly, and delete by retention policy. Risk: a backup bucket becoming the easiest way to steal every credential in the cluster."
            ),
            part(
              "Network access",
              "Restricts 2379 to the control plane nodes and 2380 to etcd members with host firewalls and cloud security groups, keeps etcd listening on the node's private address (not a public one), and keeps the control plane in a network segment Pods cannot route to except for 6443.",
              "Network: etcd's --listen-client-urls should be the node's private IP and 127.0.0.1; firewall 2379 so only the three control plane nodes can connect, and 2380 so only etcd members can; no public exposure ever. Pods need 6443, not 2379 -- a NetworkPolicy or host rule should make that true. Risk: defence in depth -- if a client certificate leaks or a TLS flaw appears, an attacker still has to reach the port."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 22%
    {
      slug: "pss-level-per-namespace",
      objective: "Pod Security Admission: enforce, audit and warn modes, namespace labels, versions and exemptions, and rolling a stricter profile out safely",
      kind: "build",
      title: "Roll Pod Security Standards out across four namespaces",
      brief:
        "The fictional city transit agency Harland Transit runs four namespaces on one cluster: web (public-facing stateless apps), batch (data jobs that need no special privileges), monitoring (a node agent DaemonSet that needs hostPID and a hostPath mount of /proc), and legacy (an old vendor app that runs as root and writes to its root filesystem). Nothing is enforced today. The security team wants the strongest profile each namespace can bear, applied without an outage, with a path to tighten legacy later.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a Pod Security Standard for each namespace with the labels you would apply and in what order, explain how enforce/audit/warn let you do it without breaking running workloads, and note what to do about monitoring's exceptions.",
          parts: [
            part(
              "Profiles per namespace",
              "web and batch: restricted (stateless apps and jobs can run non-root, no capabilities, RuntimeDefault seccomp); legacy: baseline (root is allowed under baseline, which still forbids privileged, host namespaces and hostPath) with a plan to reach restricted; monitoring: cannot meet baseline because of hostPID and hostPath -- stays privileged as a deliberately documented exception, or the agent is isolated to its own namespace with that label.",
              "web -> restricted; batch -> restricted (data jobs rarely need anything baseline allows and restricted forbids). legacy -> baseline: it forbids the dangerous things (privileged, hostPath, host namespaces, extra capabilities) but still allows running as root and a writable root filesystem, which is exactly legacy's situation. monitoring -> privileged (no restrictions): hostPID and a hostPath of /proc violate baseline, and PSA has no per-Pod exemption inside a namespace, so the agent's namespace carries the privileged label -- documented, reviewed, and holding nothing but the agent."
            ),
            part(
              "Rollout without an outage",
              "Starts every namespace with warn and audit at the target level (and enforce at a lower level or unset), reads the warnings on apply and the audit annotations in the API audit log for a week, fixes workloads, then raises enforce; explains enforce only rejects new Pods so running Pods are untouched but would fail on the next restart or rollout -- hence audit first.",
              "Step 1: kubectl label ns web pod-security.kubernetes.io/warn=restricted pod-security.kubernetes.io/audit=restricted (same for batch; baseline for legacy). warn shows a message to whoever applies a non-compliant manifest; audit writes an annotation into the API audit log for every violating Pod, including ones created by controllers. Step 2: for a week, collect the audit entries and kubectl -n web get pods --dry-run=server-style warnings, and fix Deployments (add securityContext, drop capabilities, set seccompProfile). Step 3: set enforce=restricted. enforce rejects only new Pod creations, so running Pods survive the label change -- but the next rollout would fail for anything not yet fixed, which is why audit comes first."
            ),
            part(
              "Labels and versions",
              "Uses the pod-security.kubernetes.io/<mode> and <mode>-version labels, pinning a version (e.g. the current minor) rather than latest when the policy should not change under you on upgrade; knows PSA is built into the API server and needs no installation.",
              "kubectl label --overwrite ns web \\\n  pod-security.kubernetes.io/enforce=restricted pod-security.kubernetes.io/enforce-version=v1.37 \\\n  pod-security.kubernetes.io/warn=restricted pod-security.kubernetes.io/audit=restricted\nPinning enforce-version to a Kubernetes minor freezes the profile's definition at that version so a cluster upgrade that tightens restricted does not suddenly block rollouts; 'latest' follows the cluster. Pod Security Admission is a built-in admission controller -- labels are all it takes."
            ),
            part(
              "Legacy's path and monitoring's exception",
              "For legacy: work with the vendor to run non-root and mount writable paths as emptyDir, tracked as a risk with an owner and date, moving the namespace to restricted when done; for monitoring: keep only the agent there, consider a sandboxed/less-privileged alternative that reads /proc through the kubelet or CRI APIs, and compensate with NetworkPolicy, RBAC and Falco monitoring of that namespace.",
              "legacy: baseline now; file a risk with an owner and a date; push the vendor for a non-root image and identify the writable paths so readOnlyRootFilesystem plus emptyDir volumes can be used; flip to restricted when it passes audit. monitoring: keep the namespace to the single DaemonSet (nothing else gets to ride on the privileged label), restrict who can deploy there with RBAC, add NetworkPolicy around it, and alert on any new Pod appearing in it. Ask whether the agent can use the kubelet's metrics or CRI APIs instead of hostPID and /proc -- many current agents can."
            ),
          ],
        },
      ],
    },
    {
      slug: "authn-authz-trace",
      objective: "Authorization: RBAC Roles, ClusterRoles and bindings, verbs and resources, the Node authorizer, and reading kubectl auth can-i results",
      kind: "case",
      title: "Trace a 'Forbidden' and an unexpected 'yes' through authentication and RBAC",
      brief:
        "At the fictional publisher Oakhurst Press, two tickets land the same morning: a developer cannot list Pods in their own namespace, and an auditor found that a CI ServiceAccount can delete Deployments in production even though its Role only mentions read verbs. You have the evidence below.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Ticket 1:\n$ kubectl -n books get pods\nError from server (Forbidden): pods is forbidden: User \"maria@oakhurst.example\" cannot list resource \"pods\" in API group \"\" in the namespace \"books\"\n\n$ kubectl -n books get rolebinding dev-readers -o yaml | sed -n '/^subjects:/,$p'\nsubjects:\n- kind: User\n  name: Maria@oakhurst.example\n  apiGroup: rbac.authorization.k8s.io\nroleRef:\n  kind: Role\n  name: pod-reader\n  apiGroup: rbac.authorization.k8s.io\n\n$ kubectl -n books get role pod-reader -o jsonpath='{.rules}'\n[{\"apiGroups\":[\"\"],\"resources\":[\"pods\"],\"verbs\":[\"get\",\"list\",\"watch\"]}]",
          ask: "Explain where in the request path the first ticket fails and why, fix it, and state the general rule about identities in RBAC that it illustrates.",
          parts: [
            part(
              "Where it fails",
              "Authentication succeeded (the error names the user, so the API server knows who she is from the OIDC token or certificate); authorization failed because no binding matches the authenticated username exactly -- the binding subject is Maria@oakhurst.example but the token says maria@oakhurst.example, and RBAC subject names are case-sensitive exact strings.",
              "The request got past authentication: the API server identifies her as maria@oakhurst.example (that string comes from her token's claim or certificate CN). Authorization then looks for bindings whose subjects match that exact username. dev-readers binds Maria@oakhurst.example -- a capital M. RBAC compares subject names as exact, case-sensitive strings, so nothing matches, no rule allows list pods, and the default is deny: Forbidden."
            ),
            part(
              "Fix and rule",
              "Corrects the subject name to match the authenticated identity exactly (kubectl edit rolebinding or recreate with --user=maria@oakhurst.example), verifies with kubectl auth can-i list pods -n books --as=maria@oakhurst.example; rule: bind to the identity string the authenticator actually emits (check with kubectl auth whoami), and prefer binding Groups from the identity provider over individual users.",
              "kubectl -n books create rolebinding dev-readers --role=pod-reader --user=maria@oakhurst.example --dry-run=client -o yaml | kubectl replace -f -\nkubectl -n books auth can-i list pods --as=maria@oakhurst.example  -> yes\nRule: RBAC subjects must equal the username (or group) the authenticator emits, byte for byte -- kubectl auth whoami shows it. Bind Groups from the identity provider (kind: Group, name: oakhurst:developers) so individual spelling mistakes and leavers are handled in one place."
            ),
          ],
        },
        {
          text: "Ticket 2:\n$ kubectl -n production get role ci-reader -o jsonpath='{.rules}'\n[{\"apiGroups\":[\"apps\"],\"resources\":[\"deployments\"],\"verbs\":[\"get\",\"list\",\"watch\"]}]\n\n$ kubectl auth can-i delete deployments.apps -n production --as=system:serviceaccount:ci:runner\nyes\n\n$ kubectl get clusterrolebindings -o json | jq -r '.items[] | select(.subjects[]? | .kind==\"Group\" and .name==\"system:serviceaccounts\") | \"\\(.metadata.name) -> \\(.roleRef.name)\"'\nplatform-sa-admin -> admin\n\n$ kubectl get clusterrole admin -o jsonpath='{.rules[?(@.resources[0]==\"deployments\")].verbs}' | head -c 120\n[\"create\",\"delete\",\"deletecollection\",\"patch\",\"update\",\"get\",\"list\",\"watch\"]",
          ask: "Explain why the ServiceAccount can delete Deployments despite its read-only Role, fix it, and explain how you would find other permissions that come from somewhere unexpected.",
          parts: [
            part(
              "The source of the permission",
              "RBAC is additive across all bindings: besides ci-reader, a ClusterRoleBinding grants the built-in admin ClusterRole to the group system:serviceaccounts -- every ServiceAccount in the cluster -- so ci:runner gets admin's delete verb on deployments everywhere; the Role in production is irrelevant to the answer.",
              "Permissions are the union of every matching binding. ci-reader gives read verbs, but the ClusterRoleBinding platform-sa-admin binds the admin ClusterRole to the group system:serviceaccounts, which contains every ServiceAccount in every namespace. admin includes delete on deployments, so system:serviceaccount:ci:runner inherits it cluster-wide. The narrow Role did not 'limit' anything -- RBAC has no deny rules, only allows that add up."
            ),
            part(
              "Fix",
              "Deletes the platform-sa-admin ClusterRoleBinding (or scopes it to the specific ServiceAccounts and namespaces that need admin via RoleBindings), re-checks with auth can-i, and audits what used it first so a real dependency does not break.",
              "Before deleting, find out who relied on it: grep the audit log for ServiceAccount requests that only admin would allow. Then kubectl delete clusterrolebinding platform-sa-admin and, for the few ServiceAccounts that genuinely need admin in a namespace, create RoleBindings to the admin ClusterRole in that namespace only (kubectl -n X create rolebinding ... --clusterrole=admin --serviceaccount=X:name). Re-check: kubectl auth can-i delete deployments.apps -n production --as=system:serviceaccount:ci:runner -> no."
            ),
            part(
              "Finding the rest",
              "Audits bindings whose subjects are broad groups (system:serviceaccounts, system:authenticated, system:unauthenticated) or that reference cluster-admin/admin/edit at cluster scope, uses kubectl auth can-i --list --as for key identities, and considers an RBAC audit tool; reminds that the Node authorizer and other authorizers also grant access outside RBAC bindings.",
              "kubectl get clusterrolebindings,rolebindings -A -o json | jq for subjects named system:serviceaccounts, system:authenticated or system:unauthenticated, and for roleRef cluster-admin/admin/edit at cluster scope. For each important identity run kubectl auth can-i --list --as=<identity> -n <ns> to see the effective set. Tools like rbac-lookup, kubectl-who-can or rakkess do this across the cluster. Remember RBAC is one authorizer among several: the Node authorizer grants kubelets access to their own Pods' Secrets and ConfigMaps without any binding, and webhook authorizers may add more."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 16%
    {
      slug: "classify-incidents-threat-model",
      objective:
        "Persistence: how attackers stay -- backdoored images, CronJobs, mutating webhooks, ServiceAccount tokens, static Pods and node-level implants",
      kind: "case",
      title: "Sort a week of findings into the Kubernetes threat model",
      brief:
        "The fictional energy trader Castlemere ran a purple-team exercise for a week. The red team's report lists what they did; the blue team saw only some of it. You must classify each action into the threat model's categories and name the trust boundary it crossed, so the defenders can prioritise.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Red team report (abridged):\n A. Found an Ingress with no auth exposing an internal Grafana; used default credentials to log in and read dashboards showing internal hostnames.\n B. Exploited a deserialisation bug in the pricing service and got a shell in its container (runs as root, writable filesystem).\n C. Read /var/run/secrets/kubernetes.io/serviceaccount/token in that container and used it from their laptop against the API server.\n D. With that token, created a CronJob in the namespace that runs every 10 minutes and re-establishes a reverse shell.\n E. Created a Pod with hostPath: / and privileged: true on a node (admission allowed it) and read /etc/kubernetes/kubelet.conf.\n F. From the node, listed Secrets in other namespaces using the kubelet credentials via the Node authorizer's allowed paths and other Pods' mounted tokens on disk.\n G. Launched 400 Pods without resource limits in a test namespace; two nodes became NotReady under memory pressure.\n H. ARP-spoofed on the Pod network to intercept unencrypted traffic between two services.\n\n$ kubectl get ns pricing --show-labels | tail -1\npricing   Active   400d   kubernetes.io/metadata.name=pricing",
          ask: "Classify A-H into the threat model categories (trust boundaries and data flow, persistence, denial of service, malicious code execution/compromised application, attacker on the network, access to sensitive data, privilege escalation) and name the boundary crossed in each.",
          parts: [
            part(
              "A, B, C",
              "A: attacker on the network / exposed endpoint crossing the external-to-cluster boundary (and access to sensitive data via dashboards); B: malicious code execution in a compromised application, crossing from the network into a container; C: access to sensitive data (credential theft) that turns into privilege escalation -- the container-to-control-plane boundary via the token.",
              "A is an exposed service on the cluster's edge: an attacker on the network crossing the internet -> cluster boundary through an Ingress with no authentication, yielding sensitive information. B is malicious code execution inside a compromised application -- the application layer failed and the attacker is now inside the Pod's container. C is access to sensitive data: the ServiceAccount token is a credential, and using it from outside crosses the container -> API server boundary, the first step of privilege escalation."
            ),
            part(
              "D, E, F",
              "D: persistence (a CronJob is a scheduled, self-renewing foothold that survives Pod restarts); E: privilege escalation across the Pod -> node boundary using privileged + hostPath, enabled by missing admission control (Pod Security Admission would have blocked it -- the namespace has no PSA labels); F: access to sensitive data across the node -> cluster boundary using node-level credentials and other Pods' tokens on the node's disk.",
              "D is persistence: a CronJob recreates the reverse shell every 10 minutes even if the original Pod is killed -- the attacker now lives in the API's desired state. E is privilege escalation from Pod to node: privileged plus hostPath: / makes the node's filesystem the attacker's, including kubelet.conf; it worked because namespace pricing has no pod-security.kubernetes.io labels, so nothing rejected the Pod. F is access to sensitive data across the node -> cluster boundary: on the node, every Pod's mounted token and the kubelet's credentials are on disk, and the Node authorizer lets the kubelet read Secrets for Pods scheduled there."
            ),
            part(
              "G, H",
              "G: denial of service -- unbounded Pods exhaust node memory and take nodes NotReady, crossing the tenant -> shared node boundary; missing ResourceQuota/LimitRange made it possible. H: attacker on the network -- interception on the flat Pod network, crossing the Pod -> Pod boundary, defeated by mTLS or CNI encryption and by CNIs that prevent spoofing.",
              "G is denial of service: 400 Pods with no limits is resource exhaustion on shared nodes -- a tenant boundary failure because no ResourceQuota capped the namespace and no LimitRange forced limits. H is an attacker on the network: on the flat Pod network, without encryption, traffic between services can be intercepted or spoofed; the Pod -> Pod boundary is only as strong as the CNI's anti-spoofing and whether traffic is encrypted (service mesh mTLS or CNI WireGuard/IPsec)."
            ),
          ],
        },
        {
          text: "The blue team detected only A (from the Ingress logs) and G (from node alerts). B through F and H were invisible to them.",
          ask: "Prioritise the controls that would have blocked or revealed the most steps, explaining the chain you are breaking, and say which single detection would have exposed the most of the invisible steps.",
          parts: [
            part(
              "Break the chain early",
              "Prioritises controls on the B -> C -> E -> F chain: restricted Pod Security Admission on every namespace (blocks E outright), automountServiceAccountToken false and least-privilege RBAC (C yields nothing usable, D cannot create CronJobs), non-root and read-only root filesystem with seccomp (B is contained), and ResourceQuota/LimitRange (G); explains each removes a link so later steps never happen.",
              "1 Pod Security Admission enforce=restricted on pricing and every workload namespace: E (privileged + hostPath) is rejected at the API, which also ends F. 2 automountServiceAccountToken: false on Pods that do not call the API, and RBAC for those that do with no create on pods/cronjobs and no secrets: C steals nothing useful and D cannot persist. 3 runAsNonRoot, readOnlyRootFilesystem, drop ALL, RuntimeDefault seccomp: B's shell has little to work with. 4 ResourceQuota and LimitRange per namespace: G cannot exhaust the nodes. 5 Authentication on every Ingress and no default credentials: A. 6 mTLS or CNI encryption: H. Each control removes a link, and the attack needed every link."
            ),
            part(
              "The single most valuable detection",
              "API audit logging (at Metadata for everything, Request for Secrets writes/RBAC and pods/exec) would have revealed C (token used from an external IP), D (CronJob created by a workload ServiceAccount), E (privileged Pod created) and F (Secret lists from a node identity across namespaces); runtime detection (Falco) is the close second, revealing B and the token read; both should alert, not just record.",
              "API audit logs. C shows as the pricing ServiceAccount's token used from a non-Pod source IP; D as a CronJob create by a workload identity; E as a Pod create with privileged and hostPath (and a PSA audit annotation if the audit label were set); F as Secret list calls by a node identity across namespaces. Four of the six invisible steps in one log -- if someone is alerting on it. Falco on the nodes catches B (shell spawned by the pricing process) and the token read within seconds and is the natural second detection. Logs nobody watches are not detection: route both to paging."
            ),
          ],
        },
      ],
    },
    {
      slug: "trust-boundaries-data-flow",
      objective:
        "Kubernetes trust boundaries and data flow: control plane, node, Pod, container and network boundaries, and how requests and credentials move between them",
      kind: "build",
      title: "Draw the trust boundaries of a cluster in words",
      brief:
        "The fictional payroll provider Stonebridge is being assessed by a client's security team, who ask for a data-flow and trust-boundary description of its Kubernetes platform: a managed control plane in the cloud, two node pools (general and payments), a web tier behind an ingress controller, internal services, a cloud database outside the cluster, and CI that deploys through GitOps. They want to know where trust changes and what credential crosses each boundary.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Describe the boundaries and the data flows across them -- what crosses, with which credential, protected how -- and name the boundary you consider weakest and why.",
          parts: [
            part(
              "External to cluster edge",
              "Internet clients reach the ingress controller (a LoadBalancer Service) and nothing else; TLS terminates at the Ingress with certificates from a Secret or cert-manager; the API server endpoint is private or IP-restricted and reached by humans through OIDC-authenticated kubectl and by GitOps from inside the cluster; names the credential: user tokens (humans), none (anonymous web clients).",
              "Boundary 1, Internet -> cluster: the only entry points are the ingress controller's LoadBalancer (HTTPS, TLS terminated at the Ingress with cert-manager certificates) and, for operators, the API server at 6443 behind a private endpoint or allowlist, authenticated with short-lived OIDC tokens from the company identity provider. Web clients cross with no credential; operators cross with a personal identity mapped to RBAC groups. Everything else -- kubelets, etcd, node ports -- is unreachable from outside."
            ),
            part(
              "Control plane to nodes and Pods",
              "The API server to kubelets (TLS, kubelet serving certs, API server client cert; kubelet -> API with its node certificate under the Node authorizer); kubelets pull images with registry credentials and start containers; Pods receive projected ServiceAccount tokens scoped to themselves; the control plane is operated by the provider under the shared responsibility model.",
              "Boundary 2, control plane -> nodes: the API server calls kubelets over TLS (10250) with its client certificate and verifies the kubelet's serving certificate; kubelets call the API with per-node certificates that the Node authorizer scopes to that node's Pods. The provider operates the control plane and etcd (encryption at rest is our setting to request). Boundary 3, node -> Pod: the kubelet pulls images with pull secrets, applies the Pod's SecurityContext, and mounts a projected, time-bound ServiceAccount token into Pods that have automount on -- that token is the credential a Pod uses to cross back into the control plane, so it is minimised with RBAC."
            ),
            part(
              "Pod to Pod and node pools",
              "Pods on the flat network cross Pod -> Pod boundaries guarded by NetworkPolicy and, for payments, mTLS; the payments node pool is a separate trust zone via taints/tolerations and node affinity so payments Pods never share a kernel with general workloads; names the credential: service identity (mesh certificate) or none.",
              "Boundary 4, Pod -> Pod: the network is flat by default, so NetworkPolicy defines what may talk to what (default deny per namespace, explicit allows), and payments traffic carries service identity through mesh mTLS certificates. Boundary 5, node pools: payments Pods are pinned to the payments pool with taints and tolerations plus node affinity, so a container escape on a general node never lands on a kernel running payments; the pools have separate cloud IAM roles too."
            ),
            part(
              "Cluster to external services and CI",
              "Pods reach the cloud database with workload identity (a cloud IAM identity bound to the ServiceAccount) rather than static passwords, through private networking with TLS; GitOps pulls from Git with a read-only deploy key and applies with a cluster-scoped ServiceAccount, so CI never holds cluster credentials; the registry is private and images are verified at admission.",
              "Boundary 6, Pod -> cloud services: payments Pods use workload identity (the cloud maps their ServiceAccount to an IAM role) to reach the database over private endpoints with TLS -- no database password in a Secret to steal. Boundary 7, source -> cluster: the GitOps agent pulls the config repository with a read-only key and applies with its own RBAC-scoped ServiceAccount; CI pushes images and commits, holding no cluster credential. Boundary 8, registry -> node: private registry, pull secrets per namespace, signatures verified by admission so the node runs only what the pipeline built."
            ),
            part(
              "Weakest boundary",
              "Argues for a specific one with a reason, typically Pod -> control plane via ServiceAccount tokens (every Pod can hold a credential and RBAC mistakes are common) or Pod -> Pod on the flat network if NetworkPolicy is incomplete; names the compensating measure.",
              "Weakest in practice: Pod -> control plane through ServiceAccount tokens. Every Pod can carry a credential, RBAC is additive and easy to over-grant, and a single web bug hands that credential to an attacker (the classic chain). Compensate with automount off by default, per-workload ServiceAccounts with minimal Roles, audit alerts on tokens used from unexpected IPs, and Pod Security Admission so a stolen token cannot create an escape Pod. A close second is Pod -> Pod wherever a namespace lacks a default-deny policy."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 16%
    {
      slug: "platform-controls-pipeline",
      objective: "Supply chain security: SBOMs, provenance and attestations (SLSA), signing with Sigstore and cosign, and verifying at admission",
      kind: "build",
      title: "Place supply chain controls along a build-to-run pipeline",
      brief:
        "The fictional media-streaming firm Lockwood has a pipeline: developers push to Git; CI builds a container image; the image is pushed to a private registry; Argo CD deploys it to production. A customer's security questionnaire asks how Lockwood knows that what runs in production is what its developers wrote, built from the dependencies they intended, and unmodified in between.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each stage -- source, build, registry, deploy, runtime -- name the control, the artifact it produces, and what question it answers; then say how the chain is verified at admission.",
          parts: [
            part(
              "Source",
              "Signed commits or tags and branch protection with required review; a pinned, reviewed set of dependencies (lockfiles) with dependency scanning; answers 'did our developers write this, and did someone else check it'.",
              "Source: branch protection with mandatory review, signed commits (or at least verified committer identity via the forge), and lockfiles so dependency versions are explicit; dependency scanning (e.g. Trivy fs, Dependabot) flags known-vulnerable packages. Artifact: a reviewed commit hash. Question answered: this code came from our developers and was seen by a second person."
            ),
            part(
              "Build",
              "A hardened, ephemeral build runner producing a reproducible image, an SBOM (syft) and a SLSA provenance attestation that records the source commit, builder identity and build steps, signed with Sigstore keyless signing using the CI job's OIDC identity; answers 'how was this artifact built and from what'.",
              "Build: an ephemeral runner (fresh VM or container per job) builds the image from the reviewed commit, generates an SBOM (syft -o spdx-json) and a SLSA provenance attestation (what source, which builder, which steps), and signs the image and attestations with cosign using the CI job's short-lived OIDC identity (keyless, recorded in the Rekor transparency log). Artifacts: image digest, SBOM, provenance, signatures. Question: this exact image was built by our pipeline from that commit with these dependencies -- SLSA Build Level 2-3 depending on isolation."
            ),
            part(
              "Registry",
              "A private registry with push restricted to the CI identity, immutable tags, scan-on-push blocking critical CVEs, and signatures/attestations stored alongside the image; answers 'was it modified or replaced after the build'.",
              "Registry: private, push allowed only to the pipeline's federated identity, immutable tags so a digest cannot be swapped under a name, vulnerability scanning on push that blocks criticals, and the cosign signatures and attestations stored next to the image (as OCI referrers). Artifact: the stored image plus its signature bundle. Question: nothing changed between build and pull -- the digest the signature covers is the digest in the registry."
            ),
            part(
              "Deploy and runtime",
              "Argo CD applies manifests that reference the image by digest, and an admission policy (Kyverno verifyImages or Sigstore policy-controller) requires a valid signature from the CI identity and, optionally, a provenance attestation matching the expected source repository; at runtime, drift detection compares running imageIDs with signed digests and Falco watches for modification; answers 'is what runs the thing we verified'.",
              "Deploy: the GitOps config repository pins the image by digest (the pipeline writes it), and Argo CD applies it; admission verifies that the image's signature was made by the pipeline's identity and issuer, and can require the SLSA attestation's source to be the Lockwood repository (Kyverno verifyImages attestations). Runtime: containers run with read-only root filesystems so the verified image cannot be modified in place; Argo CD reports drift; a periodic check compares every Pod's imageID with signed digests; Falco alerts on binary writes or unexpected processes. Question: what runs is the signed artifact, and it stays that way."
            ),
            part(
              "The verification chain",
              "Summarises the chain as digest-based: signature over the digest ties the registry content to the build; the attestation ties the build to the source commit; admission checks both before any kubelet pulls; so the answer to the questionnaire is a verifiable chain rather than a promise.",
              "Everything hangs on the digest. The signature proves the pipeline produced this digest; the provenance attestation proves which commit and builder produced it; admission refuses any image whose digest lacks a valid signature and matching attestation; manifests name digests, not tags. So 'how do you know' is answered with artefacts anyone can verify: cosign verify and cosign verify-attestation against the running digest, not a policy document."
            ),
          ],
        },
      ],
    },
    {
      slug: "mesh-and-observability-response",
      objective: "Service mesh security: mTLS between workloads, identity per service, authorization policies and the trade-offs of sidecar and sidecarless meshes",
      kind: "case",
      title: "Decide whether a service mesh answers an interception finding",
      brief:
        "The fictional health-scheduling company Aldergrove had a penetration test find that traffic between its appointments and patients services crossed the Pod network in plain HTTP and could be read by a compromised Pod on the same node. The platform lead proposes 'install a service mesh and turn on mTLS everywhere' and asks you to evaluate it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Pen-test excerpt:\n  From a Pod with CAP_NET_RAW in namespace tools we captured HTTP between appointments (10.244.1.20) and patients (10.244.1.31), including patient identifiers in query strings.\n  The cluster CNI does not encrypt Pod traffic; no NetworkPolicy exists in namespace clinic; the tools namespace has no restrictions.\n\n$ kubectl -n clinic get networkpolicy\nNo resources found in clinic namespace.\n$ kubectl -n tools get pods -o jsonpath='{.items[*].spec.containers[*].securityContext}'\n{} {} {}",
          ask: "Evaluate the proposal: what a mesh with mTLS would and would not fix here, the alternatives, and what you would do first regardless.",
          parts: [
            part(
              "What mTLS fixes and what it does not",
              "A mesh with STRICT mTLS gives each workload a certificate-based identity and encrypts Pod-to-Pod traffic, defeating passive interception; it does not stop a compromised Pod from calling the patients service as a client (needs authorization policy), does not remove patient identifiers from URLs (an application fix), and does not address why a tools Pod had CAP_NET_RAW and free run of the network.",
              "mTLS between sidecars (or in a sidecarless data plane) encrypts and authenticates service-to-service traffic, so a sniffing Pod sees ciphertext -- the finding as written is fixed. It does not by itself stop the compromised Pod from simply calling patients over the mesh (it would need its own identity and an AuthorizationPolicy to be refused), and it does not fix the application putting patient identifiers in query strings (those also land in access logs). Nor does it address the root enablers: a Pod with CAP_NET_RAW and no NetworkPolicy anywhere."
            ),
            part(
              "Alternatives",
              "CNI-level transparent encryption (Cilium WireGuard or IPsec, Calico WireGuard) encrypts all Pod traffic with no sidecars or application changes but gives no per-service identity or L7 authorization; application-level TLS is another option with more work per service; compares operational cost: sidecar meshes add resources and upgrade complexity, sidecarless (ambient/Cilium) reduces it.",
              "Option A, CNI encryption: Cilium or Calico with WireGuard encrypts every packet between nodes/Pods transparently -- one setting, no sidecars, no app changes -- but it is encryption only: no service identity, no L7 authorization, no retries or telemetry. Option B, a mesh: Istio (sidecar or ambient) or Linkerd adds identity per service, STRICT mTLS, AuthorizationPolicy ('only appointments may call patients /GET'), and traffic telemetry, at the cost of a new control plane, CPU/memory per sidecar (less in ambient mode), and an upgrade path to manage. Option C, TLS in each application: full control, most work, easiest to get wrong. For a clinic with two services and a small team, CNI encryption now and a mesh when authorization policy is needed is a defensible path."
            ),
            part(
              "First, regardless",
              "Fixes the enablers immediately: default-deny NetworkPolicy in clinic and tools with explicit allows, drop ALL capabilities (removing CAP_NET_RAW) via restricted Pod Security Admission on tools, and move identifiers out of URLs; explains these are cheap and remove the attacker's position rather than only encrypting what they see.",
              "Before any mesh decision: 1 NetworkPolicy default deny in clinic and tools, allowing appointments -> patients on its port and nothing from tools -- the compromised Pod can no longer reach or see the traffic path it was on. 2 Pod Security Admission restricted on tools (and clinic): capabilities drop ALL removes CAP_NET_RAW, so packet capture is impossible even where traffic flows. 3 Ask the appointments team to move patient identifiers to the request body or headers over TLS, and to stop logging them. These take an afternoon and remove the attacker's vantage point; encryption then protects against the next, better-positioned attacker."
            ),
          ],
        },
        {
          text: "Aldergrove adopts CNI WireGuard encryption now and plans a mesh for next year. Six months later a security engineer asks: 'If an attacker does get a foothold in a Pod again, how would we even know? We only found this because we paid a pen-tester.'",
          ask: "Design the detection layer for this cluster: which signals, which tools, and what three alerts you would page on.",
          parts: [
            part(
              "Signals and tools",
              "API audit logs (who did what in the control plane) shipped off-cluster; runtime detection with Falco as a DaemonSet (process, file and network syscalls per container, with Kubernetes metadata); network flow logs from the CNI (Cilium Hubble or equivalent) to see denied and unexpected connections; and metrics/traces from the mesh or apps for anomalies; all correlated by Pod and namespace in one place.",
              "Three signal sources, correlated by namespace and Pod: 1 API audit logs at Metadata, with Request level for Secrets writes, RBAC and pods/exec, shipped to a SIEM or log store -- control plane truth. 2 Falco on every node, reading syscalls with Kubernetes context -- runtime truth inside containers. 3 CNI flow logs (e.g. Cilium Hubble) showing allowed and denied connections per policy -- network truth. Dashboards from Prometheus/Grafana for rates and anomalies. Each covers what the others cannot see: a stolen token used from a laptop appears only in audit logs; a shell in a container only in Falco; a port scan only in flow logs."
            ),
            part(
              "Three pages",
              "Chooses high-signal alerts such as: a shell or unexpected process spawned in a production container (Falco); a ServiceAccount token used from a source IP that is not its Pod's (audit log); and a Pod created with privileged/hostPath or in a namespace by an identity that normally does not create Pods (audit or PSA audit annotation); optionally NetworkPolicy denies from a production Pod to many destinations (scan behaviour).",
              "Page 1 (Falco): shell or package-manager process spawned in any container in clinic -- almost never legitimate in production. Page 2 (audit log): a ServiceAccount token used from a sourceIP that is not the Pod it was issued to -- the signature of token theft. Page 3 (audit log / PSA audit annotation): a Pod created with privileged, hostPath or host namespaces, or any Pod/CronJob created by a workload ServiceAccount -- persistence and escalation attempts. A strong fourth: a production Pod generating NetworkPolicy denies to many distinct destinations within a minute -- a scan from a foothold. Everything else is a ticket, not a page, so the on-call trusts the pager."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 10%
    {
      slug: "compliance-mapping",
      objective:
        "Compliance frameworks applied to Kubernetes: CIS Benchmarks, NIST SP 800-53 and 800-190, PCI DSS, SOC 2, ISO 27001 and the Kubernetes hardening guidance, and what evidence each asks for",
      kind: "build",
      title: "Map five audit requirements to Kubernetes controls and evidence",
      brief:
        "The fictional payments processor Merrow Pay must pass an assessment for its Kubernetes platform. The assessor's request list includes, among others: (1) 'demonstrate that cardholder-data systems are segmented from other systems', (2) 'show that administrative access is individually attributable and reviewed', (3) 'show that secrets are encrypted at rest and access is logged', (4) 'show that system components are configured to an industry hardening standard', and (5) 'show that software deployed to production is scanned for vulnerabilities and comes from an approved source'. The platform team wants, for each, the Kubernetes control that satisfies it, the evidence to hand over, and how to produce that evidence automatically.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each of the five requirements give the control, the evidence artifact, and the automation that generates it; then name the framework(s) the wording most resembles and how a threat model complements the checklist.",
          parts: [
            part(
              "Segmentation (1)",
              "Dedicated namespaces (and ideally a dedicated node pool or cluster) for cardholder-data workloads with default-deny NetworkPolicies and explicit allows, plus RBAC scoped to those namespaces; evidence: the NetworkPolicy objects, a connectivity test showing denies, flow logs; automation: policy-as-code tests (e.g. a CI job applying the policies and running a connectivity matrix, or a tool that reports namespaces lacking default deny).",
              "Control: a cardholder-data namespace set (or node pool/cluster) with default-deny ingress and egress NetworkPolicies and only the documented allows, RBAC bindings limited to those namespaces, and PSA restricted. Evidence: kubectl get networkpolicy -n <cde> -o yaml, a connectivity matrix run from a non-CDE Pod showing timeouts, CNI flow logs of denied attempts. Automation: a nightly job that fails if any CDE namespace lacks a default-deny policy (Kyverno 'generate' can even create it) and runs the connectivity test, writing the result to the evidence store."
            ),
            part(
              "Attributable admin access (2)",
              "Human access only via OIDC identities (no shared kubeconfigs or long-lived certificates), RBAC bound to groups, kubectl auth can-i --list reviews, and API audit logs that record user.username per request; evidence: the audit log extract of admin actions, the binding review record; automation: scheduled RBAC report (who has cluster-admin/admin/edit where) and audit log retention and search.",
              "Control: OIDC authentication through the identity provider with MFA; RBAC bound to groups; no shared admin credentials (a quarterly search for certificate-based kubeconfigs and legacy tokens). Evidence: audit log entries showing user.username for every write and exec, and a quarterly access review document listing each subject's effective permissions. Automation: a scheduled job running kubectl auth can-i --list per identity and diffing against the approved list, plus audit logs shipped to the SIEM with 1-year retention and saved searches for admin actions."
            ),
            part(
              "Secrets encrypted and access logged (3)",
              "EncryptionConfiguration with a KMS provider on the API server, RBAC limiting secrets get/list, and audit Policy at Metadata for Secret reads and Request for writes; evidence: an etcd read showing the k8s:enc prefix, the EncryptionConfiguration (with keys redacted), audit log samples; automation: a periodic check that reads a canary Secret from etcd and asserts it is ciphertext, and an alert on Secret reads by unexpected identities.",
              "Control: --encryption-provider-config with a KMS v2 provider (or aescbc as minimum) covering secrets; RBAC with no wildcard secrets access; audit Policy logging Secret get/list at Metadata and writes at Request. Evidence: etcdctl get of a Secret key showing k8s:enc:kms:v2: rather than plaintext, the redacted EncryptionConfiguration, and audit extracts of Secret access. Automation: a daily job that writes a canary Secret, reads it back from etcd and fails if plaintext appears; SIEM alerts on Secret reads outside allowed identities."
            ),
            part(
              "Hardening standard (4) and approved, scanned software (5)",
              "(4) CIS Kubernetes Benchmark via kube-bench on control plane and nodes (and the CIS benchmark for the node OS), with documented exceptions; evidence: kube-bench reports over time; automation: kube-bench as a CronJob/DaemonSet writing reports. (5) Scan-on-push in the registry and Trivy in CI blocking criticals, admission requiring approved registry and valid signatures; evidence: scan reports per deployed digest, the admission policy and its denial logs; automation: the pipeline attaches scan results and SBOM as attestations, and a report lists every running imageID with its scan date.",
              "(4) Control: CIS Kubernetes Benchmark applied with kube-bench (control plane, etcd, nodes, policies sections) and the CIS OS benchmark for node images, exceptions documented with reasons. Evidence: kube-bench JSON reports with dates and the exception register. Automation: kube-bench as a CronJob on control plane nodes and a DaemonSet-style Job on workers, results pushed to the evidence store, trend graphed. (5) Control: registry scan-on-push and Trivy in CI failing on fixable HIGH/CRITICAL, plus admission (ValidatingAdmissionPolicy for the registry allowlist, Kyverno/Sigstore for signatures). Evidence: per-digest scan report and SBOM attestation, admission policy YAML and denial events. Automation: a weekly report joining every running Pod's imageID to its latest scan and signature verification result."
            ),
            part(
              "Frameworks and threat modelling",
              "Recognises the wording as PCI DSS (segmentation, individual admin accountability, encryption of stored data, hardening standards, vulnerability management), with CIS Benchmarks as the hardening standard and NIST SP 800-190 as container-specific guidance; explains a checklist proves known controls exist, while a threat model (STRIDE or the container ATT&CK matrix) finds the attacks the checklist did not anticipate, and the two feed each other.",
              "The requests read as PCI DSS: network segmentation of the cardholder data environment, individually attributable administrative access with reviews, encryption of stored secrets with access logging, configuration to an industry standard (CIS Benchmarks are the accepted standard for Kubernetes), and vulnerability management with approved sources. NIST SP 800-190 is the container-specific guidance assessors also cite, and SOC 2 / ISO 27001 would ask similar questions in different words. A checklist verifies controls someone already thought of; a threat model (STRIDE per data flow, or the MITRE ATT&CK containers matrix per attack stage) asks how this specific platform could be attacked and turns each answer into a control or a detection -- and the gaps it finds become next year's checklist items."
            ),
          ],
        },
      ],
    },
  ],
};
