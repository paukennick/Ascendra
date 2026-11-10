// REQ-164: Red Hat container and OpenShift certifications.
//
// Checked on 2026-11-09 on redhat.com:
//
// - EX188 is now the "Red Hat Certified Developer in Cloud-native
//   Applications" exam (redhat.com/en/services/training/
//   ex188-red-hat-certified-specialist-containers-exam -- the URL keeps
//   the former "Specialist in Containers" name). Hands-on, 2.5 hours,
//   based on RHEL 10, Podman v5 and OpenShift Container Platform 4.22.
// - EX280 is the "Red Hat Certified System Administrator in OpenShift"
//   exam (redhat.com/en/services/training/
//   red-hat-certified-openshift-administrator-exam; the older
//   ".../ex280-red-hat-certified-specialist-openshift-administration-exam"
//   URL now 404s). Hands-on, 3.0 hours, based on OpenShift Container
//   Platform 4.22. Counts toward Red Hat Certified Architect in OpenShift.
//
// Red Hat publishes objective groups but not domain weights or a pass
// mark on the exam pages ("exam results are reported as total scores").
// The unit weights below are therefore this course's own allocation,
// roughly proportional to each group's objective count, and the tracks say
// so. Objectives follow the published objective lines, rephrased as tasks.

import type { SeedTrack } from "../data";

const VERIFIED_AT = "2026-11-09T00:00:00Z";
const RED_HAT = {
  providerSlug: "red-hat",
  providerName: "Red Hat",
  providerUrl: "https://www.redhat.com/en/services/certification",
  subcategorySlug: "red-hat-openshift",
  credentialType: "certification",
  basis: "vendor_exam",
  status: "active",
  lastVendorVerifiedAt: VERIFIED_AT,
} as const;

const RH_FORMAT_NOTE =
  "Hands-on, performance-based exam on a live system: tasks must be completed so that configurations and services persist across the platform's normal lifecycle. Product documentation is available during the exam; no outside assistance. Results are emailed by Red Hat Certification Central, usually within 3 US business days, as a total score only.";
const RH_PASS_NOTE =
  "Red Hat reports a total score and does not publish a pass mark or per-domain weights on the exam page; the unit weights in this course are the course's own allocation by objective count.";

const EX188_URL = "https://www.redhat.com/en/services/training/ex188-red-hat-certified-specialist-containers-exam";
const EX280_URL = "https://www.redhat.com/en/services/training/red-hat-certified-openshift-administrator-exam";

export const EX188_TRACK: SeedTrack = {
  code: "EX188",
  title: "Prep for the Red Hat® Certified Developer in Cloud-native Applications Exam",
  description:
    "Red Hat's hands-on Podman exam. Build images from Containerfiles, manage images and registries, run and inspect containers locally, run multi-container applications with pods and Compose-style definitions, and troubleshoot containerized applications -- on RHEL 10 with Podman v5, the versions the exam is based on. Ascendra has no affiliation with Red Hat, LLC. The Red Hat and RHEL trademarks are used for identification purposes only and are not intended to indicate affiliation with or approval by Red Hat. Red Hat and RHEL are trademarks of Red Hat, LLC, registered in the United States and other countries.",
  trackType: "certification",
  subcategorySlug: "red-hat-openshift",
  freshnessModel: "certification_aligned",
  sourceUrl: EX188_URL,
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...RED_HAT,
    credentialSlug: "ex188",
    credentialName: "Red Hat Certified Developer in Cloud-native Applications",
    credentialUrl: EX188_URL,
    examCode: "EX188",
    objectivesRevision: "Exam page, RHEL 10 / Podman v5 / OCP 4.22 (read 2026-11-09)",
    officialObjectivesUrl: EX188_URL,
    recommendedExperience:
      "Experience using Podman v5 in a Linux environment to create and manage containers. Red Hat recommends DO188 (Red Hat OpenShift Developer I: Introduction to Containers with Podman). Aimed at developers containerizing applications, administrators new to containers, architects and SREs considering Kubernetes and OpenShift.",
    durationMinutes: 150,
    questionFormat: `${RH_FORMAT_NOTE} Time limit 2.5 hours; tasks are based on Podman v5.`,
    passingScorePolicy: RH_PASS_NOTE,
  },
  units: [
    {
      title: "Implement images using Podman and Containerfile",
      weight: 30,
      gate: "Given an application and its runtime requirements, write a Containerfile that builds a working, least-privilege image with the right user, working directory, ports, environment, volumes and command, and manage the resulting image and container life cycles.",
      objectives: [
        "Specify the container's base image in a Containerfile, choosing a UBI or other trusted base and pinning it",
        "Add content to the container image with COPY and ADD and keep layers small and ordered for caching",
        "Configure the container's runtime environment: user id, working directory and running arbitrary commands during the build",
        "Expose ports from a Containerfile and decide when EXPOSE is needed versus publishing at run time",
        "Pass environment variables and build arguments to an image built from a Containerfile with ENV and ARG",
        "Specify the command to run in a custom image with ENTRYPOINT and CMD and the exec versus shell forms",
        "Configure container volumes, including sharing host data with the container and the VOLUME instruction",
        "Apply the security and permission requirements for host and network access from the container: rootless Podman, user namespaces and SELinux labels",
        "Manage container and image life cycles: build, tag, run, stop, restart, remove and prune",
      ],
    },
    {
      title: "Manage images",
      weight: 15,
      gate: "Given images in several registries, authenticate securely, tag, push, pull and inspect them, and choose between backing up an image and backing up a container's state.",
      objectives: [
        "Configure private registry security: logging in, auth files, TLS and insecure-registry settings in registries.conf",
        "Interact with many different registries: search, short-name aliases, unqualified-search registries and fully qualified image names",
        "Apply image tags and digests correctly and understand what a tag does and does not guarantee",
        "Push and pull images to and from registries, including skopeo copy between registries",
        "Back up an image with its layers and metadata (podman save/load) versus backing up a container's state (podman commit, export/import)",
      ],
    },
    {
      title: "Run containers locally using Podman",
      weight: 20,
      gate: "Given a container image, run it with the right environment, ports and storage, read its logs and events, inspect it, and expose it as a working local application.",
      objectives: [
        "Run containers locally using Podman with the common run options: detached, named, restart policy, removal and resource limits",
        "Get container logs with podman logs and configure log drivers",
        "Monitor container events on the container host with podman events",
        "Use podman inspect to read configuration, state, mounts and network settings with format templates",
        "Specify environment parameters for a container with -e and --env-file",
        "Expose public applications by publishing ports and configuring container networks",
        "Inspect running applications with podman ps, top, stats and exec",
      ],
    },
    {
      title: "Run multi-container applications with Podman",
      weight: 20,
      gate: "Given an application of several services, create the stack with pods or a Compose file, wire dependencies, environment, secrets, volumes and configuration, and make it start reliably.",
      objectives: [
        "Create application stacks with Podman pods, podman-compose or docker-compose files, and Quadlet or kube YAML where appropriate",
        "Configure container dependencies and start order between services and the networking between them",
        "Configure environment variables for each service in a multi-container application",
        "Manage secrets with podman secret and mount them into containers instead of baking them into images",
        "Configure volumes for persistent data shared between services and across restarts",
        "Configure application configuration files mounted into containers, including SELinux relabelling options",
      ],
    },
    {
      title: "Troubleshoot containerized applications",
      weight: 15,
      gate: "Given a failing containerized application, read its resource descriptions and logs, inspect and connect to the running container, and fix the cause so the application reports ready.",
      objectives: [
        "Interpret the description of application resources: container, pod and volume state from podman inspect and podman pod inspect",
        "Diagnose failures from application logs, including containers that exit immediately",
        "Inspect running applications for resource, network and permission problems",
        "Connect to running containers with podman exec and attach to debug in place",
        "Configure and verify readiness with health checks so a container reports when the application is ready",
      ],
    },
  ],
};

export const EX280_TRACK: SeedTrack = {
  code: "EX280",
  title: "Prep for the Red Hat® Certified System Administrator in OpenShift Exam",
  description:
    "Red Hat's hands-on OpenShift administration exam on OpenShift Container Platform 4.22. Manage the cluster from the console and oc, work declaratively with manifests, Kustomize, Helm and templates, configure HTPasswd authentication and RBAC, secure routes and networking, enable developer self-service with quotas and templates, manage operators, and secure applications with service accounts, security context constraints, secrets, jobs and cron jobs. Ascendra has no affiliation with Red Hat, LLC. The Red Hat and OpenShift trademarks are used for identification purposes only and are not intended to indicate affiliation with or approval by Red Hat. Red Hat and OpenShift are trademarks of Red Hat, LLC, registered in the United States and other countries.",
  trackType: "certification",
  subcategorySlug: "red-hat-openshift",
  freshnessModel: "certification_aligned",
  sourceUrl: EX280_URL,
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    ...RED_HAT,
    credentialSlug: "ex280",
    credentialName: "Red Hat Certified System Administrator in OpenShift",
    credentialUrl: EX280_URL,
    examCode: "EX280",
    objectivesRevision: "Exam page, OpenShift Container Platform 4.22 (read 2026-11-09)",
    officialObjectivesUrl: EX280_URL,
    recommendedExperience:
      "RH124 (Red Hat System Administration I) or comparable experience; RHCSA strongly recommended but not required; DO180 (OpenShift Administration I) and DO280 (OpenShift Administration II) or comparable OpenShift work experience; container experience recommended. Passing EX280 counts toward Red Hat Certified Architect in OpenShift.",
    durationMinutes: 180,
    questionFormat: `${RH_FORMAT_NOTE} Time limit 3.0 hours; tasks are based on OpenShift Container Platform 4.22.`,
    passingScorePolicy: RH_PASS_NOTE,
  },
  units: [
    {
      title: "Manage OpenShift Container Platform",
      weight: 20,
      gate: "Given a running OpenShift cluster, use the web console and oc to inspect, query, import and export resources, assess cluster health from events, alerts and logs, and troubleshoot common container, pod and cluster problems.",
      objectives: [
        "Use the web console to manage and configure an OpenShift cluster, switching between the Administrator and Developer perspectives",
        "Use the oc command-line interface to manage and configure an OpenShift cluster, including login, contexts and projects",
        "Create and delete projects and understand how a Project relates to a Namespace",
        "Locate and examine container images in the internal registry and external registries with oc image info and skopeo",
        "Identify images using tags and digests and pin workloads to digests where required",
        "Query, format and filter attributes of Kubernetes resources with -o jsonpath, custom-columns, labels and field selectors",
        "Import, export and configure Kubernetes resources with oc apply, oc get -o yaml, oc create and oc patch",
        "Examine resources and cluster status with oc get clusteroperators, nodes and oc adm top",
        "Monitor cluster events and alerts in the console and with oc get events and the Alerting UI",
        "View container, pod and node logs with oc logs and oc adm node-logs",
        "Assess the health of an OpenShift cluster: operators, nodes, machine config pools and the cluster version",
        "Troubleshoot common container, pod and cluster events and alerts: image pulls, scheduling, crash loops, probes and resource pressure",
        "Use product documentation effectively during a task to find exact resource fields and commands",
      ],
    },
    {
      title: "Declarative Resource Management",
      weight: 12,
      gate: "Given application manifests, deploy and update them declaratively, build Kustomize bases and overlays, and supply configuration through Secrets and ConfigMaps.",
      objectives: [
        "Work with resource manifests: write, validate and apply YAML for Deployments, Services and Routes",
        "Deploy applications from YAML resource manifests with oc apply and manage them as a set",
        "Update application deployments declaratively: image changes, rollouts, rollout history and undo",
        "Deploy applications using Kustomize with oc apply -k",
        "Build Kustomize overlays for environments with patches, namePrefix, images and configMapGenerator",
        "Create and use Secrets: generic, docker-registry and TLS, mounted as volumes or environment variables",
        "Create and use ConfigMaps from literals, files and directories and consume them in pods",
      ],
    },
    {
      title: "Deploy applications",
      weight: 11,
      gate: "Given an application packaged as a template or Helm chart, deploy and manage it, control its replicas with labels and selectors, and expose it with Services and Routes.",
      objectives: [
        "Deploy applications from OpenShift templates with oc process and oc new-app, and from Helm charts with helm install and upgrade",
        "Manage application deployments: scaling, rollouts, pausing and resuming, and deployment strategies",
        "Work with ReplicaSets and understand how a Deployment owns and replaces them",
        "Apply labels and selectors to connect Services, Deployments and Routes and to organise resources",
        "Configure Services: ClusterIP, NodePort and the ports and selectors that connect them to pods",
        "Expose applications to external access with Routes and understand the difference from Services",
      ],
    },
    {
      title: "Manage authentication and authorization",
      weight: 9,
      gate: "Given a cluster with the default identity provider, configure HTPasswd authentication, manage users, passwords and groups, and grant cluster and project roles with least privilege.",
      objectives: [
        "Configure the HTPasswd identity provider for authentication in the OAuth cluster resource with a Secret in openshift-config",
        "Create and delete users: the htpasswd file, the Secret, and removing User and Identity resources",
        "Modify user passwords by updating the htpasswd Secret and understanding when changes take effect",
        "Create and manage groups with oc adm groups and add or remove users",
        "Modify user and group permissions with oc adm policy, cluster roles and project roles, and remove self-provisioning where required",
      ],
    },
    {
      title: "Configure network security",
      weight: 15,
      gate: "Given applications that must be reached securely, configure Routes with the right TLS termination, NetworkPolicies, load balancer Services and non-HTTP exposure, and troubleshoot the software-defined network.",
      objectives: [
        "Configure networking components: the cluster network operator, pod and service networks and the ingress controller",
        "Troubleshoot software-defined networking: DNS, Service endpoints, pod-to-pod connectivity and OVN-Kubernetes basics",
        "Create and edit external Routes: edge, passthrough and re-encrypt termination, hostnames and path routing",
        "Control cluster network ingress with the ingress controller, route admission and default certificates",
        "Secure external and internal traffic using TLS certificates: Route certificates and service serving certificates for internal traffic",
        "Configure application NetworkPolicies, including default deny and allowing the ingress controller and monitoring",
        "Expose non-HTTP and SNI applications with passthrough Routes or load balancer Services",
        "Configure a LoadBalancer Service and external application access for non-HTTP traffic",
      ],
    },
    {
      title: "Enable developer self-service",
      weight: 9,
      gate: "Given many teams sharing a cluster, configure cluster and project quotas, limit ranges and default resource requirements, and a project template that applies them to every new project.",
      objectives: [
        "Configure ClusterResourceQuotas that span projects selected by label or owner",
        "Configure project ResourceQuotas for compute, storage and object counts",
        "Configure project resource requirements and defaults so pods get requests and limits",
        "Configure project LimitRanges for containers, pods and persistent volume claims",
        "Configure project templates so every new project is created with the quota, limit range and network policies the platform requires",
      ],
    },
    {
      title: "Manage OpenShift operators",
      weight: 6,
      gate: "Given a requirement for a cluster capability, install an operator from OperatorHub with the right install mode and update channel, and remove it cleanly including its operands.",
      objectives: [
        "Install an operator from OperatorHub with the console or a Subscription and OperatorGroup, choosing namespace, channel and approval strategy",
        "Uninstall an operator by removing its Subscription and ClusterServiceVersion",
        "Delete an operator's remaining resources: operands, CRDs where appropriate, and the OperatorGroup",
      ],
    },
    {
      title: "Configure application security",
      weight: 18,
      gate: "Given an application with elevated needs, configure its service account and security context constraints, supply secrets safely, grant API access, and run one-time and scheduled work with Jobs and CronJobs.",
      objectives: [
        "Configure and manage service accounts for applications and bind them to workloads",
        "Run privileged applications by granting a service account the appropriate security context constraint rather than relaxing the cluster",
        "Manage and apply permissions using security context constraints: restricted-v2, anyuid, nonroot and custom SCCs with oc adm policy who-can and scc-subject-review",
        "Create and apply Secrets to manage sensitive information in applications",
        "Configure application access to Kubernetes APIs with Roles and RoleBindings on the application's service account",
        "Deploy Jobs to perform one-time tasks with completions, parallelism and backoff limits",
        "Configure Kubernetes CronJobs with schedules, concurrency policy and history limits",
      ],
    },
  ],
};

export const REDHAT_TRACKS: readonly SeedTrack[] = [EX188_TRACK, EX280_TRACK];
