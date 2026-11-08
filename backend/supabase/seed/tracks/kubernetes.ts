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

// ---------------------------------------------------------------------------
// Certified Kubernetes Application Developer (CKAD)
// Performance-based, 2 hours, online proctored, Kubernetes v1.37 when
// checked; pass mark 66%; $445 with one free retake; valid 2 years.
// Domains (CKAD_Curriculum_v1.37.pdf): Application Design and Build 20%,
// Application Deployment 20%, Application Observability and Maintenance 15%,
// Application Environment, Configuration and Security 25%, Services and
// Networking 20%.
// ---------------------------------------------------------------------------
export const CKAD_TRACK: SeedTrack = {
  code: "CKAD",
  title: "Certified Kubernetes Application Developer (CKAD) Coach",
  description:
    "CKAD: the hands-on developer exam. Design and build container images and multi-container Pods, ship them with Deployments, Helm and Kustomize, make them observable with probes and logs, configure and secure them with ConfigMaps, Secrets, SecurityContexts and quotas, and expose them with Services, Ingress and NetworkPolicies, all at the kubectl prompt.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "ckad",
    credentialName: "Certified Kubernetes Application Developer",
    credentialUrl: "https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/",
    basis: "vendor_exam",
    examCode: "CKAD",
    objectivesRevision: "Curriculum v1.37",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/CKAD_Curriculum_v1.37.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "No prerequisites. Assumes working knowledge of container runtimes and microservice architecture: comfortable with OCI container images, cloud native application concepts, and writing and validating Kubernetes resource definitions.",
    durationMinutes: 120,
    questionFormat:
      "Online, proctored, performance-based: hands-on problems solved at the command line against live Kubernetes clusters, with kubernetes.io documentation open. The exam environment tracks the latest Kubernetes minor release within about 4-8 weeks; v1.37 when checked.",
    passingScorePolicy: "66% or above to pass (Linux Foundation candidate FAQ). Certification valid for 2 years; one retake included.",
  },
  units: [
    {
      title: "Application Design and Build",
      weight: 20,
      gate: "Given an application's runtime needs, choose the workload resource that fits, write the Pod spec with the right containers and volumes, and justify each choice against the alternatives.",
      objectives: [
        "Define, build and modify container images: a Dockerfile's instructions, image tags and digests, and building and pushing an OCI image for a Pod to pull",
        "Choose and use the right workload resource: Deployment, StatefulSet, DaemonSet, Job and CronJob, and when a bare Pod is wrong",
        "Configure Jobs and CronJobs: completions, parallelism, backoffLimit, activeDeadlineSeconds, schedule, concurrencyPolicy and history limits",
        "Design multi-container Pods with init containers, sidecars (including restartPolicy Always init containers), adapters and ambassadors sharing a network namespace and volumes",
        "Utilize persistent and ephemeral volumes: emptyDir, configMap, secret, downwardAPI, projected and persistentVolumeClaim volumes, and generic ephemeral volumes",
        "Write Pod specs with commands, arguments, environment variables, working directories and ports, and the difference between command/args and ENTRYPOINT/CMD",
        "Generate manifests quickly with kubectl run, create and expose using --dry-run=client -o yaml, then edit them",
      ],
    },
    {
      title: "Application Deployment",
      weight: 20,
      gate: "Given a release requirement (zero downtime, canary, instant rollback), implement it with Deployments and Services or with Helm and Kustomize, and show how to roll back.",
      objectives: [
        "Implement common deployment strategies with Kubernetes primitives: blue/green with a Service selector switch and canary with weighted replica counts behind one Service",
        "Understand Deployments and perform rolling updates and rollbacks: strategy settings, rollout status, history, pause, resume and undo",
        "Use the Helm package manager to deploy existing packages: repositories, search, values overrides, install, upgrade, rollback, history and uninstall",
        "Use Kustomize to deploy environment-specific variants with bases, overlays, patches, images, namePrefix and configMapGenerator, via kubectl apply -k",
        "Scale workloads manually and with a HorizontalPodAutoscaler, and understand how replica count interacts with rollouts",
        "Manage manifests declaratively with kubectl apply, diff and labels/annotations, and know when kubectl replace or delete is needed",
      ],
    },
    {
      title: "Application Observability and Maintenance",
      weight: 15,
      gate: "Given an application that is unhealthy or will not apply, find the cause with kubectl's own tools, implement the probe or API fix, and explain how the kubelet will behave afterwards.",
      objectives: [
        "Understand API deprecations: read apiVersion errors, find the current version with kubectl api-resources and explain, and migrate a manifest to a served API",
        "Implement probes and health checks: liveness, readiness and startup probes with HTTP, TCP, exec and gRPC checks and sensible timings",
        "Use built-in CLI tools to monitor Kubernetes applications: kubectl get, describe, events, top and rollout status",
        "Utilize container logs: kubectl logs with --previous, -c, -l, --since, --tail and -f, and reading logs from multi-container Pods",
        "Debug applications in Kubernetes: Pod phases and container states, kubectl exec and port-forward, ephemeral debug containers with kubectl debug, and copying a Pod for inspection",
        "Interpret resource and scheduling events: Pending, CrashLoopBackOff, ImagePullBackOff, OOMKilled and FailedScheduling",
      ],
    },
    {
      title: "Application Environment, Configuration and Security",
      weight: 25,
      gate: "Given an application and a namespace's constraints, configure it from ConfigMaps and Secrets, size it within the quota, harden its SecurityContext to the restricted standard, and give it only the identity it needs.",
      objectives: [
        "Discover and use resources that extend Kubernetes: find CustomResourceDefinitions with kubectl api-resources and explain, and create custom resources an operator reconciles",
        "Understand authentication, authorization and admission control as a developer: how a request is authenticated, checked by RBAC and then admitted, and what kubectl auth can-i tells you",
        "Understand requests, limits and quotas: how ResourceQuota and LimitRange constrain a namespace and why a Pod is rejected or defaulted",
        "Define resource requirements for a container: CPU and memory requests and limits, units, and the resulting QoS class",
        "Understand ConfigMaps: create them from literals, files and env files and consume them as environment variables or mounted files",
        "Create and consume Secrets: generic, docker-registry and TLS Secrets as env vars, envFrom and volumes, imagePullSecrets, and immutable Secrets",
        "Understand ServiceAccounts: assign one to a Pod, disable token automount, and understand bound projected tokens",
        "Apply application security with SecurityContexts: runAsNonRoot, runAsUser, fsGroup, readOnlyRootFilesystem, allowPrivilegeEscalation false, dropped capabilities and seccompProfile",
        "Meet the Pod Security Standards: the privileged, baseline and restricted profiles and the Pod Security Admission namespace labels",
      ],
    },
    {
      title: "Services and Networking",
      weight: 20,
      gate: "Given an application that must be reachable by some clients and not others, expose it with the right Service and Ingress rules, restrict it with a NetworkPolicy, and troubleshoot the path when a client cannot connect.",
      objectives: [
        "Demonstrate a basic understanding of NetworkPolicies: how a policy selects Pods, ingress and egress rules, and why a Pod becomes isolated",
        "Provide and troubleshoot access to applications via Services: ClusterIP, NodePort and LoadBalancer, selectors, ports and targetPorts, and EndpointSlices",
        "Use Ingress rules to expose applications: ingressClassName, hosts, paths and pathType, backends and TLS from a Secret",
        "Use DNS names for Services and Pods inside the cluster and understand the namespace search path",
        "Test connectivity from inside the cluster with a temporary Pod, kubectl port-forward and kubectl exec",
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Kubernetes and Cloud Native Associate (KCNA)
// Multiple choice, online proctored, 90 minutes; pass mark 75%; $250 with
// one free retake; valid 2 years; beginner level, no prerequisites.
// Domains (KCNA_Curriculum.pdf, read 2026-11-07 -- the current four-domain
// outline): Kubernetes Fundamentals 44%, Container Orchestration 28%, Cloud
// Native Application Delivery 16%, Cloud Native Architecture 12%. The PDF
// lists each domain's competencies as short headings (e.g. "Kubernetes
// Core Concepts", "Scheduling"); each unit below expands those headings
// into the concepts the heading covers, in order, and names the heading.
// ---------------------------------------------------------------------------
export const KCNA_TRACK: SeedTrack = {
  code: "KCNA",
  title: "Kubernetes and Cloud Native Associate (KCNA) Coach",
  description:
    "KCNA: the entry-level, multiple-choice credential for the Kubernetes and cloud native ecosystem. Kubernetes core objects, administration, scheduling and containers; orchestration across networking, security, troubleshooting and storage; how applications are delivered with CI/CD, GitOps and Helm; and the architecture, observability and community of cloud native computing.",
  trackType: "certification",
  subcategorySlug: "cncf-certifications",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://training.linuxfoundation.org/certification/kubernetes-cloud-native-associate/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...LF_PROVIDER,
    credentialSlug: "kcna",
    credentialName: "Kubernetes and Cloud Native Associate",
    credentialUrl: "https://training.linuxfoundation.org/certification/kubernetes-cloud-native-associate/",
    basis: "vendor_exam",
    examCode: "KCNA",
    objectivesRevision: "Curriculum (four-domain outline), cncf/curriculum 0a8cc08",
    status: "active",
    officialObjectivesUrl: `${CURRICULUM}/KCNA_Curriculum.pdf`,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "No prerequisites. Beginner level: for developers and non-developers alike who work in or around the cloud native ecosystem and want a foundation before CKA, CKAD or CKS. The Linux Foundation pairs it with Kubernetes and Cloud Native Essentials (LFS250).",
    durationMinutes: 90,
    questionFormat: "Online, proctored, multiple-choice exam, 90 minutes (Linux Foundation multiple-choice exam FAQ).",
    passingScorePolicy: "75% or above to pass (Linux Foundation multiple-choice exam FAQ). Certification valid for 2 years; one retake included. Passing CKA or CKAD automatically renews KCNA (CARE program).",
  },
  units: [
    {
      title: "Kubernetes Fundamentals",
      weight: 44,
      gate: "Given a description of an application and how it must run, name the Kubernetes objects that would run it, say which control plane component does what to get it running, and explain what the container image and runtime contribute.",
      objectives: [
        "Kubernetes core concepts: the cluster, control plane and nodes, the API server as the single front door, and the declarative model of desired versus observed state reconciled by controllers",
        "Core concepts: Pods as the unit of scheduling, and the workload objects built on them -- ReplicaSets, Deployments, StatefulSets, DaemonSets, Jobs and CronJobs -- with what each is for",
        "Core concepts: namespaces, labels, selectors and annotations, and how Services, Deployments and policies select the Pods they act on",
        "Core concepts: the Kubernetes API, API groups and versions, kubectl, and extending the API with CustomResourceDefinitions and operators",
        "Administration: the control plane components (kube-apiserver, etcd, kube-scheduler, kube-controller-manager, cloud-controller-manager) and the node components (kubelet, kube-proxy, container runtime) and how they cooperate",
        "Administration: installing and operating a cluster with kubeadm or a managed service, cluster upgrades, backing up etcd, and choosing a distribution or managed offering",
        "Administration: authentication, authorization with RBAC and admission control as the three stages every API request passes through",
        "Scheduling: how kube-scheduler filters and scores nodes using resource requests, node selectors and affinity, taints and tolerations, and topology spread, and what leaves a Pod Pending",
        "Scheduling: resource requests and limits, QoS classes, and how the scheduler and kubelet treat CPU and memory differently",
        "Containerization: what a container is -- Linux namespaces and cgroups -- and how it differs from a virtual machine",
        "Containerization: OCI images and runtimes, image layers, tags and digests, registries, and the container runtime interface (CRI) with containerd and CRI-O",
        "Containerization: how a Dockerfile builds an image, and how Kubernetes pulls and runs it with imagePullPolicy and pull secrets",
      ],
    },
    {
      title: "Container Orchestration",
      weight: 28,
      gate: "Given a running application's networking, security, storage or failure symptom, name the Kubernetes mechanism involved and the first thing you would check.",
      objectives: [
        "Networking: the Kubernetes network model (every Pod gets an IP, flat connectivity), CNI plugins, and Service types ClusterIP, NodePort, LoadBalancer and ExternalName",
        "Networking: cluster DNS with CoreDNS, Ingress and the Gateway API for HTTP routing, service meshes, and NetworkPolicy for restricting traffic",
        "Security: the 4Cs of cloud native security (cloud, cluster, container, code), the Pod Security Standards and Pod Security Admission, SecurityContexts and least privilege",
        "Security: RBAC roles and bindings, ServiceAccounts, Secrets and how to protect them, and securing the supply chain with image scanning and signing",
        "Troubleshooting: Pod phases and container states, reading kubectl get, describe, logs, events and exec, and recognising CrashLoopBackOff, ImagePullBackOff, Pending and OOMKilled",
        "Troubleshooting: where to look when a node, a Service or the control plane misbehaves, and the role of metrics-server and probes in detecting failure",
        "Storage: ephemeral volumes (emptyDir, ConfigMap, Secret) versus PersistentVolumes and PersistentVolumeClaims, StorageClasses and dynamic provisioning, and the Container Storage Interface (CSI)",
        "Storage: access modes, reclaim policies and why stateful applications use StatefulSets with volumeClaimTemplates",
      ],
    },
    {
      title: "Cloud Native Application Delivery",
      weight: 16,
      gate: "Given a team's release process, design how code becomes a running, versioned Kubernetes workload, choose the packaging and GitOps tooling that fits, and say how you would debug a delivery that failed.",
      objectives: [
        "Application delivery: the path from source to running workload -- CI building and testing an image, pushing to a registry, and CD applying manifests to a cluster",
        "Application delivery: GitOps principles (declarative, versioned, pulled and continuously reconciled) and the tools that implement them, Argo CD and Flux",
        "Application delivery: packaging and templating with Helm charts and Kustomize overlays, and choosing between them and plain manifests",
        "Application delivery: rollout strategies -- rolling update, recreate, blue/green and canary -- and how Deployments, Services and progressive delivery tools implement them",
        "Debugging a delivery: tracing a failed release through pipeline logs, image tags, kubectl rollout status and history, Pod events and application logs to the step that broke",
        "Debugging a delivery: rolling back safely and recognising configuration drift between Git and the cluster",
      ],
    },
    {
      title: "Cloud Native Architecture",
      weight: 12,
      gate: "Given an organisation's system and goals, evaluate how cloud native principles, observability and the CNCF ecosystem apply, and recommend what to adopt and in what order.",
      objectives: [
        "Observability: the three pillars (metrics, logs, traces), what each answers, and the CNCF tools behind them -- Prometheus, Fluentd and Fluent Bit, Jaeger and OpenTelemetry",
        "Observability: designing SLIs, SLOs and alerts, and the difference between monitoring and observability, cost and telemetry volume included",
        "Cloud native ecosystem and principles: the CNCF definition of cloud native, microservices, containers, immutable infrastructure, declarative APIs, autoscaling (HPA, VPA, cluster autoscaler) and serverless (Knative) as design choices",
        "Cloud native ecosystem and principles: evaluating a design against resilience, scalability, loose coupling and manageability, and the role of service meshes and the CNCF landscape in it",
        "Cloud native community and collaboration: the CNCF's role under the Linux Foundation, project maturity levels (sandbox, incubating, graduated), the Technical Oversight Committee, SIGs and working groups, and how to contribute",
        "Cloud native community and collaboration: open source governance and licences, the Kubernetes release cadence and support policy, and conformance programs",
      ],
    },
  ],
};

export const KUBERNETES_TRACKS: readonly SeedTrack[] = [CKA_TRACK, CKAD_TRACK, KCNA_TRACK];
