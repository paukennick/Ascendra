// REQ-164: Linux Foundation / CNCF container and Kubernetes certification
// tracks.
//
// Every domain name, weight and competency below was read on 2026-11-07 from
// the official curriculum: the CNCF curriculum repository
// (github.com/cncf/curriculum, commit 0a8cc08 of 2026-11-03 -- the PDF named
// for each exam, e.g. CKA_Curriculum_v1.37.pdf) and the exam's own page on
// training.linuxfoundation.org, with duration, passing score, validity and
// the Kubernetes version from the Linux Foundation's candidate FAQ
// (docs.linuxfoundation.org/tc-docs/certification/faq-cka-ckad-cks). Nothing
// here comes from memory. Objectives are expanded from each competency into
// the concrete skills the exam's hands-on tasks ask for, in the way the
// AWS/Azure/GCP tracks expand a task statement; the unit's title and weight
// are the official domain exactly.
//
// Two program facts shape how these tracks are written:
//
//   - The exam environment follows each Kubernetes minor release within
//     about 4-8 weeks (all three hands-on exams were on v1.37 when checked),
//     so objectives name stable, GA Kubernetes APIs and tools and never a
//     version-specific flag or a removed API (no PodSecurityPolicy, no
//     extensions/v1beta1, no dockershim). The curriculum PDF's own version
//     number (v1.37 for CKA and CKAD) is recorded as the objectives revision.
//
//   - The Linux Foundation prints a stable acronym (CKA, CKAD, CKS, KCNA,
//     KCSA) on every page and curriculum document as the exam's identifier
//     and sells the exam under it, so that acronym is the examCode here:
//     published and stable, unlike Google Cloud's codeless exams.

import type { SeedTrack } from "../data";

const LF_PROVIDER = {
  providerSlug: "linux-foundation",
  providerName: "The Linux Foundation / CNCF",
  providerUrl: "https://training.linuxfoundation.org/certification-catalog/",
  subcategorySlug: "cncf-certifications",
  credentialType: "certification",
} as const;

const VERIFIED_AT = "2026-11-07T00:00:00Z";

// Curriculum PDFs, pinned to the commit they were read from so a later
// re-check can diff against exactly what this track was built on.
const CURRICULUM = "https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b";

// ---------------------------------------------------------------------------
// Certified Kubernetes Administrator (CKA)
// Performance-based, 2 hours, online proctored (PSI Bridge), Kubernetes v1.37
// when checked; pass mark 66%; $445 with one free retake; valid 2 years.
// Domains (CKA_Curriculum_v1.37.pdf): Cluster Architecture, Installation &
// Configuration 25%, Workloads & Scheduling 15%, Services & Networking 20%,
// Storage 10%, Troubleshooting 30%.
// ---------------------------------------------------------------------------
export const CKA_TRACK: SeedTrack = {
  code: "CKA",
  title: "Certified Kubernetes Administrator (CKA) Coach",
  description:
    "CKA: the hands-on administrator exam. Build and upgrade kubeadm clusters, run RBAC, scheduling, Services, Gateway API and Ingress, storage, and above all troubleshoot broken nodes, components and networking at the kubectl prompt under time pressure.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "cka",
    credentialName: "Certified Kubernetes Administrator",
    credentialUrl: "https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/",
    basis: "vendor_exam",
    examCode: "CKA",
    objectivesRevision: "Curriculum v1.37",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/CKA_Curriculum_v1.37.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "No prerequisites. Intermediate level: comfortable at a Linux shell, with kubectl and with reading and writing YAML manifests. The Linux Foundation pairs it with Kubernetes Fundamentals (LFS258).",
    durationMinutes: 120,
    questionFormat:
      "Online, proctored, performance-based: a set of hands-on tasks solved at the command line against live Kubernetes clusters (several clusters, switched with kubectl config use-context). kubernetes.io documentation is open during the exam. The exam environment tracks the latest Kubernetes minor release within about 4-8 weeks; v1.37 when checked.",
    passingScorePolicy: "66% or above to pass (Linux Foundation candidate FAQ). Certification valid for 2 years; one retake included.",
  },
  units: [
    {
      title: "Cluster Architecture, Installation & Configuration",
      weight: 25,
      gate: "Given a bare set of hosts and a target topology, say in order what you would run to stand up and later upgrade a kubeadm cluster, and write the RBAC that gives a named subject exactly the access asked for and nothing more.",
      objectives: [
        "Manage role-based access control: write Roles, ClusterRoles, RoleBindings and ClusterRoleBindings for users, groups and ServiceAccounts, and check access with kubectl auth can-i",
        "Prepare the underlying infrastructure for a kubeadm cluster: container runtime (containerd) with the systemd cgroup driver, kernel modules and sysctls, swap off, and the ports the control plane and kubelet need",
        "Create and join a cluster with kubeadm: kubeadm init with a pod network CIDR, install a CNI plugin, generate and use join tokens, and add worker and control plane nodes",
        "Manage the lifecycle of a cluster: upgrade the control plane and then each node with kubeadm upgrade, drain, kubelet and kubectl upgrades, and uncordon, one minor version at a time",
        "Back up and restore etcd with etcdctl snapshot save and snapshot restore using the right certificates and endpoint, and bring the static pod back up on the restored data",
        "Implement and configure a highly available control plane: stacked versus external etcd, a load-balanced API server endpoint, and the controlPlaneEndpoint and certificate-key flow for joining extra control plane nodes",
        "Use Helm to install and manage cluster components: add repositories, inspect values, install, upgrade, roll back and uninstall releases",
        "Use Kustomize to install and customize components: bases, overlays, patches and kubectl apply -k",
        "Understand the extension interfaces (CNI, CSI, CRI) and what each contract covers, and how kubelet, the runtime and the network plugin fit together",
        "Understand CustomResourceDefinitions and operators: read a CRD, create custom resources, and install and configure an operator that reconciles them",
        "Read a static pod manifest in /etc/kubernetes/manifests and relate the API server, controller manager, scheduler and etcd flags to the cluster's behaviour",
      ],
    },
    {
      title: "Workloads & Scheduling",
      weight: 15,
      gate: "Given a Deployment and a change request, make the change with a rollout you can watch and undo, configure the app from ConfigMaps and Secrets, and place its Pods on the right nodes with the right limits.",
      objectives: [
        "Understand application deployments and perform rolling updates and rollbacks with kubectl rollout status, history and undo, and tune maxSurge and maxUnavailable",
        "Use ConfigMaps and Secrets to configure applications as environment variables, envFrom and mounted volumes, and know when a change reaches a running Pod",
        "Configure workload autoscaling with a HorizontalPodAutoscaler on CPU and memory, and understand what the Vertical Pod Autoscaler does",
        "Understand the primitives for robust, self-healing deployments: ReplicaSets, Deployments, DaemonSets, StatefulSets, Jobs and CronJobs, and when each fits",
        "Configure Pod admission and scheduling with resource requests and limits, LimitRanges and ResourceQuotas, and read the QoS class they produce",
        "Place Pods with nodeSelector, node affinity and anti-affinity, pod affinity, taints and tolerations, and topology spread constraints",
        "Write liveness, readiness and startup probes and understand how the scheduler, kubelet and controllers restart or replace an unhealthy Pod",
        "Use a manual scheduling path when needed: nodeName, a custom scheduler name, and what happens when no scheduler is running",
        "Create workloads imperatively with kubectl create and run, and turn them into manifests with --dry-run=client -o yaml",
      ],
    },
    {
      title: "Services & Networking",
      weight: 20,
      gate: "Given an application that users cannot reach, trace the path from client through Gateway or Ingress, Service, endpoints and NetworkPolicy to the Pod and say which object is wrong and how to fix it.",
      objectives: [
        "Understand connectivity between Pods: the flat Pod network, the CNI plugin's role, Pod and Service CIDRs, and how kube-proxy programs Services",
        "Define and enforce NetworkPolicies with podSelector, namespaceSelector and ipBlock rules for ingress and egress, and understand default-deny and policy additivity",
        "Use ClusterIP, NodePort and LoadBalancer Service types, headless Services and EndpointSlices, and match a Service's selector and ports to its Pods",
        "Use the Gateway API to manage ingress traffic: GatewayClass, Gateway and HTTPRoute, with host, path and header matching and traffic splitting",
        "Use Ingress controllers and Ingress resources: ingressClassName, host and path rules, pathType and TLS termination from a Secret",
        "Understand and use CoreDNS: the Corefile ConfigMap, Service and Pod DNS names, and how a Pod's dnsPolicy and the search path resolve short names",
        "Debug Service connectivity with kubectl get endpointslices, port-forward and a temporary client Pod running nslookup, curl and wget",
      ],
    },
    {
      title: "Storage",
      weight: 10,
      gate: "Given an application that needs durable storage, write the StorageClass, PersistentVolume or claim that provides it, and say why a claim is Pending and what reclaim policy means for the data.",
      objectives: [
        "Implement StorageClasses and dynamic volume provisioning, including the default StorageClass, volumeBindingMode and allowVolumeExpansion",
        "Configure volume types, access modes and reclaim policies: ReadWriteOnce, ReadOnlyMany, ReadWriteMany and ReadWriteOncePod, and Retain versus Delete",
        "Manage PersistentVolumes and PersistentVolumeClaims: static binding by capacity, access mode, StorageClass and selector, and expanding a bound claim",
        "Mount volumes into Pods: persistentVolumeClaim, emptyDir, hostPath, configMap and secret volumes, with subPath and read-only mounts",
        "Diagnose a PersistentVolumeClaim stuck in Pending and a Pod stuck ContainerCreating on a volume from kubectl describe events",
      ],
    },
    {
      title: "Troubleshooting",
      weight: 30,
      gate: "Given a cluster where something is broken, work from symptom to the failing component with kubectl, journalctl and crictl, fix it in place, and prove the fix with the cluster's own output.",
      objectives: [
        "Troubleshoot clusters and nodes: a NotReady node, kubelet configuration and certificates, the container runtime and the node's conditions with kubectl describe node, journalctl -u kubelet and crictl",
        "Troubleshoot cluster components: static pod manifests for the API server, controller manager, scheduler and etcd, their flags and certificates, and reading their logs when kubectl itself fails",
        "Monitor cluster and application resource usage with metrics-server, kubectl top nodes and pods, and the requests and limits behind evictions and OOMKilled",
        "Manage and evaluate container output streams with kubectl logs for the previous container, multi-container Pods, all Pods of a selector, and following and tailing output",
        "Troubleshoot services and networking: a Service with no endpoints, selector and port mismatches, CoreDNS failures, NetworkPolicy blocks and a missing CNI",
        "Troubleshoot application failures from Pod status: Pending, CrashLoopBackOff, ImagePullBackOff, CreateContainerConfigError and OOMKilled, using describe, events and exec",
        "Use kubectl efficiently under time pressure: contexts, namespaces, aliases, --dry-run and -o yaml, jsonpath and custom-columns, and the documentation open during the exam",
      ],
    },
  ],
};

export const KUBERNETES_TRACKS: readonly SeedTrack[] = [CKA_TRACK];
