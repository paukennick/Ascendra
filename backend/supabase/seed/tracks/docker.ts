// REQ-164: Docker Certified Associate (DCA), offered by Mirantis.
//
// Checked on 2026-11-08: Mirantis still sells the DCA on its training
// certification catalog (training.mirantis.com/certification/, $199) and its
// webstore (store.mirantis.com/product/docker-certified-associate-dca/):
// 55 questions (13 multiple choice, 42 discrete option multiple choice),
// 90 minutes, remotely proctored, for people with 6-12 months of Docker
// experience. The current blueprint is the Docker Certified Associate (DCA)
// Study Guide, Version 1.5, January 2025 (PDF on Mirantis's content CDN,
// a.storyblok.com/f/146871/x/2001ce939c/docker-study-guide_v1-5-jan-2025.pdf),
// which added the Kubernetes objectives. Domains and weights below are that
// guide's exactly. Third-party posts claiming the DCA was retired cite no
// source and are contradicted by Mirantis's own store, so the course is a
// certification course, not a generic Docker course.
//
// Two honesty notes carried into the objectives: the guide still names
// Docker Enterprise's UCP and DTR, which Mirantis renamed Mirantis
// Kubernetes Engine (MKE) and Mirantis Secure Registry (MSR) -- objectives
// use both names; and it still lists the devicemapper storage driver, which
// Docker Engine removed in 2024 -- the objective names it as legacy beside
// the current overlay2 default. No passing score is published.

import type { SeedTrack } from "../data";

const VERIFIED_AT = "2026-11-08T00:00:00Z";
const DCA_GUIDE = "https://a.storyblok.com/f/146871/x/2001ce939c/docker-study-guide_v1-5-jan-2025.pdf";

// REQ-194 (Nick, 2026-11-09): hidden from the catalog, not deleted. Docker's
// guidelines (docker.com/legal/trademark-guidelines, read 2026-11-09) keep
// the Docker mark out of the title of a program, and a DCA course can't say
// what it prepares for without it. Learners who already studied it keep
// it. Remove hiddenAt and re-seed to restore.
export const DCA_TRACK: SeedTrack = {
  code: "DCA",
  hiddenAt: "2026-11-09T00:00:00Z",
  hiddenReason:
    "Docker trademark guidelines: the Docker mark may not be used in the title of a program (https://www.docker.com/legal/trademark-guidelines/, read 2026-11-09).",
  title: "Prep for the Mirantis DCA Exam",
  description:
    "DCA: Mirantis's Docker credential. Swarm orchestration and stacks, Dockerfiles, images and registries, engine installation and configuration, container networking, engine and swarm security with content trust, and storage and volumes -- plus the Kubernetes basics the 2025 study guide added. Independently developed exam prep; not affiliated with or endorsed by Docker, Inc. or Mirantis. Docker is a trademark or registered trademark of Docker, Inc. in the United States and/or other countries.",
  trackType: "certification",
  subcategorySlug: "container-tooling",
  freshnessModel: "certification_aligned",
  sourceUrl: "https://store.mirantis.com/product/docker-certified-associate-dca/",
  sourceVerifiedAt: VERIFIED_AT,
  credential: {
    providerSlug: "mirantis",
    providerName: "Mirantis",
    providerUrl: "https://training.mirantis.com/certification/",
    subcategorySlug: "container-tooling",
    credentialType: "certification",
    credentialSlug: "dca",
    credentialName: "Docker Certified Associate",
    credentialUrl: "https://store.mirantis.com/product/docker-certified-associate-dca/",
    basis: "vendor_exam",
    examCode: "DCA",
    objectivesRevision: "Study Guide v1.5 (January 2025)",
    status: "active",
    officialObjectivesUrl: DCA_GUIDE,
    lastVendorVerifiedAt: VERIFIED_AT,
    recommendedExperience:
      "Six months to a year of Docker experience including exposure to Docker Enterprise (now Mirantis Kubernetes Engine and Mirantis Secure Registry), plus container security, at least one cloud provider, configuration management tools, and Linux and/or Windows Server.",
    durationMinutes: 90,
    questionFormat:
      "55 questions in 90 minutes: 13 multiple choice and 42 discrete option multiple choice (DOMC, options shown one at a time with a yes/no answer each). Remotely proctored on Windows or Mac; English; results delivered immediately.",
    passingScorePolicy: "Mirantis does not publish a passing score for the DCA.",
  },
  units: [
    {
      title: "Orchestration",
      weight: 25,
      gate: "Given an application described as containers, turn it into swarm services in a stack file, place and scale them, and read docker inspect and service output to say why a service is not deploying.",
      objectives: [
        "Set up a swarm mode cluster with manager and worker nodes, and explain why quorum (a Raft majority of managers) matters and how many managers to run",
        "Explain the difference between running a container and running a service, and extend a docker run command into docker service create",
        "Convert an application deployment into a stack file (Compose YAML) and deploy and manipulate it with docker stack deploy, ls, ps and rm",
        "Scale services by increasing replicas, add networks and published ports, and mount volumes on services",
        "Run replicated and global services and place tasks with node labels and placement constraints",
        "Use templates with docker service create (e.g. {{.Node.Hostname}}, {{.Service.Name}}) for hostnames, environment and mounts",
        "Interpret docker inspect output for containers, services, tasks and nodes, and the steps to troubleshoot a service that is not deploying",
        "Describe how a Dockerized application communicates with legacy systems outside the cluster",
        "Deploy containerized workloads as Kubernetes Pods and Deployments",
        "Provide configuration to Kubernetes Pods with ConfigMaps and Secrets",
      ],
    },
    {
      title: "Image Creation, Management, and Registry",
      weight: 20,
      gate: "Given an application and a Dockerfile, make the image smaller and more cacheable, manage it with the image CLI, and push, sign and manage it in a registry.",
      objectives: [
        "Describe the use of a Dockerfile and its main instructions: FROM, RUN, COPY and ADD, VOLUME, EXPOSE, ENV, WORKDIR, USER, ENTRYPOINT and CMD",
        "Create an efficient image with a Dockerfile: layer caching and instruction order, multi-stage builds, .dockerignore and minimal base images",
        "Manage images with the CLI: docker image ls, rm/rmi, prune, tag, history, and inspect with --filter and --format",
        "Build an image from a Dockerfile with docker build, tag it for a registry, and display and squash its layers",
        "Run and use a registry: deploy a registry, log in, search, push, pull and delete images",
        "Sign an image in a registry with Docker Content Trust and understand what signing proves",
      ],
    },
    {
      title: "Installation and Configuration",
      weight: 15,
      gate: "Given a new host, install and configure Docker Engine for production -- repository, storage driver, logging, boot, TLS -- and read an error to say what went wrong.",
      objectives: [
        "Describe sizing requirements for installation and set up the package repository and install Docker Engine on Linux and Windows Server",
        "Select a storage driver (overlay2 as the current default) and configure logging drivers such as json-file, journald and splunk in daemon.json",
        "Set up a swarm, configure managers, add nodes and set up a backup schedule for swarm state",
        "Create and manage users and teams, and configure the Docker daemon to start on boot with systemd",
        "Use certificate-based client-server authentication so a Docker daemon and client trust each other and a daemon can access a registry",
        "Describe the use of namespaces, cgroups and certificate configuration in the engine",
        "Interpret errors to troubleshoot installation issues without assistance",
        "Deploy Docker Engine, UCP (Mirantis Kubernetes Engine) and DTR (Mirantis Secure Registry) on AWS and on-premises in a highly available configuration, and configure their backups",
      ],
    },
    {
      title: "Networking",
      weight: 15,
      gate: "Given a container that cannot be reached, say which network driver and publishing mode are in play, find the IP and port it is reachable on, and read engine and container logs to the cause.",
      objectives: [
        "Describe the Container Network Model (CNM) and how it interfaces with the engine and with network and IPAM drivers",
        "Describe the built-in network drivers -- bridge, host, overlay, macvlan, none -- and their use cases, and create a bridge network for developers",
        "Publish a port so an application is reachable externally, identify which IP and port a container is reachable on, and compare host and ingress publishing modes",
        "Configure Docker to use external DNS, and deploy a service on an overlay network",
        "Load balance HTTP/HTTPS traffic to an application with the routing mesh and Layer 7 routing in Docker Enterprise (Mirantis Kubernetes Engine)",
        "Describe the types of traffic that flow between the Docker engine, the registry and UCP (MKE) controllers",
        "Troubleshoot container and engine logs to resolve connectivity issues between containers",
        "Route traffic to Kubernetes Pods with ClusterIP and NodePort Services, and describe Kubernetes' container network model",
      ],
    },
    {
      title: "Security",
      weight: 15,
      gate: "Given a cluster and a registry, explain what the engine and swarm secure by default, enable content trust and scanning, and configure role-based access in UCP (MKE) with LDAP and client bundles.",
      objectives: [
        "Describe security administration tasks, default engine security (namespaces, capabilities, seccomp, AppArmor) and default swarm security (mutual TLS, certificate rotation, encrypted Raft)",
        "Describe mutual TLS in swarm and the identity roles of managers and workers, and compare UCP (MKE) workers and managers",
        "Describe the process of signing an image, and enable Docker Content Trust to sign and verify images",
        "Describe and demonstrate that an image passes a security scan in DTR (Mirantis Secure Registry)",
        "Configure role-based access control in UCP (MKE): subjects, roles, resource sets and grants",
        "Integrate UCP (MKE) with LDAP/Active Directory, create UCP client bundles, and use external certificates with UCP and DTR (MKE and MSR)",
      ],
    },
    {
      title: "Storage and Volumes",
      weight: 10,
      gate: "Given an application's data, choose volumes, bind mounts or tmpfs, say where image layers and writable layers live on disk, and clean up what is unused.",
      objectives: [
        "Identify the correct storage (graph) drivers for various operating systems: overlay2 on current Linux, windowsfilter on Windows, and the legacy devicemapper driver the blueprint still lists",
        "Compare object and block storage and when each should be used, and describe how an application is composed of layers and where those layers reside on the filesystem",
        "Use volumes, bind mounts and tmpfs mounts for persistent and ephemeral container storage, and share storage across cluster nodes with volume plugins",
        "Identify the steps to clean up unused images, containers and volumes on a host and in DTR (Mirantis Secure Registry)",
        "Provision persistent storage to a Kubernetes Pod with PersistentVolumes, and describe the relationship between CSI drivers, StorageClass, PersistentVolumeClaim and volume objects",
      ],
    },
  ],
};

export const DOCKER_TRACKS: readonly SeedTrack[] = [DCA_TRACK];
