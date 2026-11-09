import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-164: Certified GitOps Associate (CGOA).
//
// Aligned to the five CGOA domains (GitOps Terminology 20%, GitOps
// Principles 30%, Related Practices 16%, GitOps Patterns 20%, Tooling 14%),
// read on 2026-11-08 from github.com/cncf/curriculum (CGOA_Curriculum.pdf)
// and training.linuxfoundation.org. Density (docs/labs.md, hybrid):
// 2 / 3 / 2 / 2 / 2.
//
// CGOA is conceptual and multiple choice, so these labs apply the OpenGitOps
// vocabulary and principles to concrete delivery setups: classify, evaluate,
// redesign, choose patterns and tooling, with real Argo CD / Flux manifests
// where a reconciler is configured. Every lab is needs_expert_review.

export const CGOA_LABS: SeedLabSet = {
  trackCode: "CGOA",
  sources: [
    "https://github.com/cncf/curriculum/blob/0a8cc08a502710a894e5724c2bec7b88404e5a6b/CGOA_Curriculum.pdf",
    "https://training.linuxfoundation.org/certification/certified-gitops-associate-cgoa/",
    "https://opengitops.dev/",
    "https://github.com/open-gitops/documents/blob/main/PRINCIPLES.md",
  ],
  labs: [
    // ----------------------------------------------------------------- 20%
    {
      slug: "label-the-terms",
      objective: "State drift and state reconciliation: how the actual state diverges and how an agent detects and corrects the difference",
      kind: "case",
      title: "Name what happened, in GitOps terms, during an incident",
      brief:
        "The fictional pet-insurance company Marbury runs Argo CD. During a Friday incident several people acted at once, and the post-incident review wants each event described in precise GitOps vocabulary so the team learns the right lessons.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Timeline:\n 14:02 Argo CD UI: Application quotes-api shows Synced / Healthy at commit 9c1e2f.\n 14:10 An engineer runs kubectl -n quotes scale deploy/quotes-api --replicas=8 to handle load (Git says replicas: 4).\n 14:11 Argo CD UI: quotes-api shows OutOfSync; selfHeal is disabled on this Application.\n 14:30 Another engineer opens a pull request changing replicas: 4 -> 8 in the config repo; it is reviewed and merged as commit 7ab44d.\n 14:33 Argo CD polls the repo, detects 7ab44d, syncs; the Application returns to Synced / Healthy.\n 15:05 Load drops; the first engineer runs kubectl scale --replicas=4 again 'to save money'.\n 15:06 OutOfSync again.",
          ask: "Describe each event using the GitOps terms it exemplifies and say which events were GitOps-compliant and which were not.",
          parts: [
            part(
              "14:02 and the vocabulary of a healthy state",
              "At 14:02 the actual state matched the desired state held in the state store (Git, commit 9c1e2f): the GitOps managed software system was reconciled, Synced meaning desired equals actual and Healthy being the observed health reported through the feedback loop.",
              "14:02: the desired state (commit 9c1e2f in the state store) and the actual state in the cluster agree -- the system is reconciled. 'Synced' is the reconciler's comparison result (desired = actual); 'Healthy' comes from the feedback loop observing the running resources. quotes-api is the GitOps managed software system; the config repo is the state store."
            ),
            part(
              "14:10-14:11: drift",
              "The kubectl scale introduced state drift: actual state (8 replicas) diverged from desired state (4) by an out-of-band change; the agent's continuous reconciliation detected it (OutOfSync) but, with self-heal disabled, did not correct it -- detection without correction; this was not GitOps-compliant because the change bypassed the state store.",
              "14:10 is drift: an imperative change made the actual state diverge from the declared desired state. 14:11 shows the reconciler detecting drift through its continuous comparison (OutOfSync). Because selfHeal is off, it reports but does not reconcile -- the correction half of reconciliation is switched off. Not compliant: a change to a GitOps-managed system that does not go through the state store."
            ),
            part(
              "14:30-14:33: the compliant path",
              "The pull request changed the desired state in the versioned, immutable state store (commit 7ab44d) with review; the agent pulled the new desired state automatically and reconciled, so the drift disappeared because desired now matched actual; this is the GitOps way to change the system -- declarative, versioned, pulled, reconciled.",
              "14:30: the desired state is changed where it lives -- a reviewed, versioned, immutable commit. 14:33: the agent pulled the change (nothing pushed it) and reconciled; Synced returns not because the cluster changed but because the declaration now matches what was already running. This is the compliant route for any change, including the emergency scale-up: declare it, then let reconciliation act."
            ),
            part(
              "15:05: drift again, and the lesson",
              "The second kubectl scale is drift once more -- and a rollback should have been a commit reverting 7ab44d, not a manual command; the lesson is to enable self-heal so reconciliation corrects drift and to treat every change, including rollback, as a change to desired state.",
              "15:05 repeats the mistake: scaling down by hand is drift, and a 'rollback' in GitOps is a revert commit (or a new commit setting replicas: 4), after which the reconciler scales the Deployment down. Two lessons: turn on self-heal so the reconciler actively corrects drift (the 14:10 scale-up would have been undone in seconds, forcing the right path), and give engineers a fast, reviewed route to change desired state so the emergency does not tempt them to kubectl."
            ),
          ],
        },
        {
          text: "The team enables selfHeal. A week later an engineer complains: 'Argo CD keeps overwriting my changes to the HorizontalPodAutoscaler; it sets minReplicas back every three minutes.' Git declares an HPA with minReplicas: 2; the engineer had edited it live to 6 during a campaign.",
          ask: "Explain in GitOps terms what is happening and what the correct response is, including how to handle genuinely temporary changes.",
          parts: [
            part(
              "What is happening",
              "Self-heal is reconciliation working as designed: the live edit is drift, the agent detects it on its reconciliation interval and re-applies the desired state; the system is behaving correctly and the engineer's expectation is the problem.",
              "This is continuous reconciliation doing its job: the live edit created drift; every reconciliation cycle the agent compares and corrects, restoring minReplicas: 2. Nothing is broken -- the declared desired state is simply winning, which is the whole point of enabling self-heal."
            ),
            part(
              "Correct response and temporary changes",
              "Change the desired state: commit minReplicas: 6 (and revert after the campaign), or model the temporary need declaratively (a scheduled scaler, or a separate overlay for campaign periods); if a resource is intentionally managed by something else (e.g. an autoscaler writing a field), mark that field as ignored in the reconciler's configuration rather than fighting it.",
              "Commit minReplicas: 6 for the campaign and open the revert PR at the same time, scheduled to merge when the campaign ends -- the change is reviewed, visible and reversible. If temporary scaling is routine, declare it: a KEDA/cron-based scaler whose schedule is itself in Git. The one legitimate exception is a field another controller owns (a VPA writing resource requests, a cloud controller writing an annotation): declare that in the Application's ignoreDifferences so the reconciler leaves that field alone instead of looping with the other controller."
            ),
          ],
        },
      ],
    },
    {
      slug: "spot-the-not-gitops",
      objective: "Recognise GitOps terminology misuse: 'GitOps' claimed for a CI pipeline that pushes with kubectl, or for a system with no reconciler",
      kind: "build",
      title: "Judge four 'GitOps' claims from vendor and team descriptions",
      brief:
        "The fictional retailer Penhaligon Stores is choosing a delivery approach and has four descriptions in front of it, each claiming to be GitOps: (A) 'On merge to main, our GitHub Actions workflow runs kubectl apply -f against production.' (B) 'Flux watches our repo and applies changes within a minute; drift is reverted automatically.' (C) 'We store Helm values in Git; on release day an engineer runs helm upgrade from their laptop using those values.' (D) 'Our platform stores the desired state in an S3 bucket with versioning and object lock; an in-cluster agent polls it every 30 seconds and reconciles.'",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each description say whether it is GitOps, which terms are being misused if not, and what would make it GitOps.",
          parts: [
            part(
              "A: CI push",
              "Not GitOps: the desired state is versioned but changes are pushed by CI with cluster credentials, there is no agent pulling and no continuous reconciliation (drift after the apply is never corrected); it is continuous deployment from Git, not GitOps; fix by installing a reconciler that pulls from the repo and removing cluster credentials from CI.",
              "A is 'Git-triggered deployment', not GitOps. It satisfies declarative (manifests) and versioned (Git) but violates pulled automatically (CI pushes with kubectl) and continuously reconciled (apply runs once; a kubectl edit an hour later stays forever). The misused term is 'GitOps' itself. To fix: a reconciler (Argo CD, Flux) in the cluster pulls main and reconciles continuously; CI keeps building and testing but loses its kubeconfig."
            ),
            part(
              "B: Flux",
              "GitOps: declarative manifests, versioned in Git, pulled by an in-cluster agent, continuously reconciled with drift correction; all four principles present.",
              "B is GitOps as defined: the desired state is declarative and versioned, Flux (the software agent) pulls it, and reconciliation runs continuously and corrects drift. Nothing to fix -- apart from checking that the repo enforces immutability of history (protected branches) and that someone receives the feedback loop (notifications on failed reconciliations)."
            ),
            part(
              "C: Git as a file share",
              "Not GitOps: Git is used as a store for configuration but the deployment is a manual, imperative, human-pushed action with no reconciler and no drift detection; 'desired state in Git' is true, but the state store is not what drives the system; fix by letting a reconciler (Flux HelmRelease or Argo CD Application) consume the chart and values.",
              "C stores configuration as code but is not GitOps: a human pushes the change imperatively from a laptop, nothing pulls, nothing reconciles, and the cluster can drift from the values file indefinitely. The misuse is calling a versioned config store a GitOps state store when no agent reads it. Fix: a Flux HelmRelease (or Argo CD Application with the Helm source) pointing at the chart and values in Git, so the reconciler performs the upgrade and keeps it converged."
            ),
            part(
              "D: no Git at all",
              "GitOps: the principles do not require Git specifically -- the state store must be versioned and immutable, which versioned S3 with object lock provides; an agent pulls and reconciles continuously; this satisfies all four principles, so it is GitOps even though the store is not Git.",
              "D is GitOps despite having no Git. OpenGitOps defines the state store by its properties -- versioned and immutable with retained history -- not by its product, and versioned, object-locked S3 qualifies. The agent pulls (polling every 30 s) and continuously reconciles. The lesson: 'GitOps' names a set of principles; Git is the common implementation, not the definition."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 30%
    {
      slug: "evaluate-against-principles",
      objective:
        "Evaluate a design against the four principles and identify which are violated by common shortcuts (CI pushing to the cluster, hand-edited live resources, unversioned config stores)",
      kind: "case",
      title: "Audit a delivery design against the four principles",
      brief:
        "The fictional accounting software vendor Thistlewood has documented its 'GitOps' delivery for an audit. You are asked to assess it principle by principle.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Thistlewood delivery design (as documented):\n 1. Application manifests are Kustomize overlays in the repo thistlewood/platform-config on GitHub, main branch protected, two reviews required.\n 2. Database connection strings are kept in a shared Google Sheet; a deploy script reads the sheet and generates a Secret at deploy time.\n 3. Argo CD runs in each cluster and syncs overlays/<env> every 3 minutes; automated sync is on, prune is off, selfHeal is off.\n 4. Hotfixes: on-call engineers may kubectl edit Deployments in production and must 'backport the change to Git within 48 hours'.\n 5. A Jenkins job runs nightly and executes a shell script with 40 kubectl patch commands that 'tune' resource limits based on last week's usage.",
          ask: "For each of the four principles, state whether the design satisfies it and cite the design items that violate it.",
          parts: [
            part(
              "Declarative",
              "Partly satisfied by item 1 (Kustomize overlays) but violated by item 5: a script of imperative kubectl patch commands is procedural, not declarative, and its effects exist nowhere as declared state; item 2 also generates state at deploy time rather than declaring it.",
              "Declarative: the overlays (1) are declarative. Item 5 breaks it -- 40 imperative patches tune the cluster, so the resulting limits are not described anywhere; you can only find them by inspecting the cluster. Item 2 is procedural too: a script computes Secrets at deploy time, so the desired state is partly an outcome of a process rather than a declaration."
            ),
            part(
              "Versioned and immutable",
              "Satisfied for manifests (protected branch, history) but violated by item 2: a Google Sheet is neither versioned nor immutable -- edits are untracked and unreviewed -- and it is part of the desired state; item 5's nightly changes are also unversioned.",
              "Versioned and immutable: the config repo qualifies -- protected main, review, full history. The Google Sheet (2) does not: anyone can change a connection string with no history, review or rollback, yet it determines what runs. The nightly tuning (5) produces unversioned changes every night. Secrets belong in a versioned, immutable path too -- encrypted in Git (SOPS, Sealed Secrets) or referenced from a vault through a declarative ExternalSecret."
            ),
            part(
              "Pulled automatically",
              "Satisfied by item 3 (Argo CD pulls every 3 minutes) but undermined by items 4 and 5, which push changes into the cluster from outside the reconciler (engineers' kubectl, Jenkins' kubectl).",
              "Pulled automatically: Argo CD (3) pulls the overlays -- good. But items 4 and 5 are push paths that bypass it: on-call engineers and Jenkins both write directly to the cluster with their own credentials. Two sources of truth now compete, and the push paths need powerful credentials outside the cluster that the pull model was meant to eliminate."
            ),
            part(
              "Continuously reconciled",
              "Violated: selfHeal is off so detected drift is never corrected, prune is off so deleted resources linger, and items 4 and 5 deliberately create drift the design tolerates for up to 48 hours; reconciliation here is detection only, every 3 minutes, with correction disabled.",
              "Continuously reconciled: Argo CD compares every 3 minutes but cannot act -- selfHeal off means the hotfix drift (4) and the nightly patches (5) stand until someone backports them, and prune off means a resource removed from Git keeps running. '48 hours to backport' institutionalises drift. The principle requires agents to continuously attempt to apply the desired state, which this design switches off."
            ),
          ],
        },
        {
          text: "The audit finding is accepted. Leadership asks for the minimum set of changes that makes the design satisfy all four principles without slowing down genuine hotfixes.",
          ask: "Propose the redesign, item by item, and explain how hotfixes work under it.",
          parts: [
            part(
              "Redesign",
              "Move connection strings into Git encrypted (SOPS/age or Sealed Secrets) or into a vault referenced by ExternalSecret manifests; delete the Jenkins tuning script and express resource limits declaratively (committed values, or a VPA in recommendation mode whose suggestions become PRs); enable selfHeal and prune on the Argo CD Applications; remove kubectl write access from humans and Jenkins in production, keeping break-glass access audited and rare.",
              "2 -> Secrets as declared state: SOPS-encrypted Secret manifests in the repo (decrypted by the reconciler) or ExternalSecret objects pointing at a vault; the Sheet is retired. 5 -> delete the script; limits live in the overlays, and if data-driven tuning is wanted, a job opens a PR with the proposed values (or a VPA in Off/recommend mode feeds that PR). 3 -> selfHeal: true, prune: true so reconciliation both detects and corrects. 4 -> production kubeconfigs become read-only for humans; a break-glass role exists, is logged and alerts the team when used."
            ),
            part(
              "Hotfixes under GitOps",
              "A hotfix is a commit to the overlay (a small PR with an expedited single-reviewer path, or a protected 'hotfix' label), after which Argo CD reconciles within the interval -- or the engineer triggers a sync; the change is reviewed, visible and revertible in seconds with a revert commit; explains this is faster than kubectl plus a 48-hour backport because there is nothing to backport.",
              "The hotfix path is: open a PR against overlays/prod with the one-line change, use the expedited review rule (one reviewer, or auto-merge for a defined set of low-risk fields such as image tag and replicas), merge, and run argocd app sync (or wait up to 3 minutes). Argo CD applies it with the same audit trail as any release, and the fix is live in about the time kubectl edit took. Rollback is git revert. There is no 48-hour backport debt because the change was never made anywhere but Git."
            ),
          ],
        },
      ],
    },
    {
      slug: "design-compliant-flow",
      objective: "Design a delivery flow that satisfies all four principles for a given application and team",
      kind: "build",
      title: "Design a GitOps delivery flow for a new payments service",
      brief:
        "The fictional lending platform Corbyn Finance is launching a payments service with dev, staging and production environments on three clusters. Constraints: developers may change dev freely, staging deployments need one reviewer, production needs two reviewers and a change ticket reference, images are built by CI, and the compliance team must be able to prove at any time exactly what is running in production and who approved it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the repositories, the reconciliation, the promotion path and the evidence trail, and map each design element to the principle it satisfies.",
          parts: [
            part(
              "Repositories and declarative state",
              "An application repo (code, Dockerfile, CI) separate from a config repo holding Kustomize base plus overlays/dev, overlays/staging, overlays/prod (or Helm values per environment), with every runtime setting declared there -- Deployments, Services, HPAs, ExternalSecret references; satisfies declarative.",
              "Two repos: payments (source, Dockerfile, pipeline) and payments-config (desired state). payments-config holds a Kustomize base and three overlays, each declaring everything the environment runs: image digest, replicas, resources, HPA, ExternalSecret references for credentials. No scripts, no imperative steps -- Declarative."
            ),
            part(
              "Versioning, immutability and approvals",
              "The config repo on a protected main branch with branch protection rules: overlays/dev changes auto-mergeable by developers, overlays/staging requiring one review via CODEOWNERS, overlays/prod requiring two reviews and a commit-message or PR check for a change-ticket reference; signed commits optional; satisfies versioned and immutable, and encodes the approval policy in the store.",
              "payments-config: main protected (no force pushes, linear history). CODEOWNERS: overlays/dev -> developers team, auto-merge allowed; overlays/staging -> one review from the service team; overlays/prod -> two reviews from the release group plus a status check that fails unless the PR body references a change ticket (CHG-\\d+). Every change to desired state is a commit with author, reviewers and timestamp -- Versioned and immutable, with the approval policy enforced where the state lives."
            ),
            part(
              "Pull-based reconciliation",
              "A reconciler (Argo CD or Flux) installed in each cluster, each watching only its own overlay path, with automated sync, prune and self-heal; CI never holds cluster credentials; satisfies pulled automatically and continuously reconciled.",
              "Each cluster runs its own Argo CD (or Flux) with an Application for payments pointing at payments-config, path overlays/<env>, targetRevision main, syncPolicy automated with prune and selfHeal. The agents pull; CI has no kubeconfig at all -- Pulled automatically. Reconciliation runs every few minutes (or on a webhook) and corrects drift -- Continuously reconciled."
            ),
            part(
              "Promotion path",
              "CI builds and pushes an image by digest and opens a PR to overlays/dev with the new digest (auto-merge); promotion to staging and prod is a PR that copies the digest into the next overlay, subject to that overlay's review rules; images are referenced by digest so what was tested is what is promoted.",
              "CI: build, test, push registry/payments@sha256:... and open a PR bumping the image digest in overlays/dev (auto-merges, dev reconciles). Promote: a PR copying that exact digest to overlays/staging (one review), then to overlays/prod (two reviews + ticket). The digest never changes across environments, so staging tested precisely what production will run; the PRs are the promotion record."
            ),
            part(
              "Evidence for compliance",
              "What is running is the commit the prod Application is synced to (argocd app get shows revision and synced status; Flux shows the applied revision) plus the digests in that commit; who approved is in the PR history; drift alerts prove nothing else is running; optionally a periodic report joins live imageIDs with the synced commit.",
              "At any moment: argocd app get payments-prod gives the synced Git revision and health; that commit in payments-config lists the exact image digests; the PR that introduced it names the two approvers and the change ticket. selfHeal plus alerts on OutOfSync prove the cluster matches the commit. A nightly job records running imageIDs against the synced revision for the auditors' archive. The whole evidence trail is a by-product of the flow, not extra work."
            ),
          ],
        },
      ],
    },
    {
      slug: "pulled-automatically-vs-push",
      objective: "Pulled automatically: software agents pull the desired state from the source rather than having changes pushed to them, and why pull matters for security and reliability",
      kind: "case",
      title: "Defend pull-based delivery to a sceptical security team",
      brief:
        "At the fictional telecom Brightwater Mobile, the security team objects to installing Argo CD: 'An agent in every production cluster with permission to change anything is a bigger risk than our locked-down CI runner that pushes releases.' The platform team asks you to answer them.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Current push model:\n - A CI runner in a shared build account holds a kubeconfig with cluster-admin for all 12 production clusters.\n - Releases run kubectl apply from the runner over the internet to each cluster's public API endpoint.\n - 40 developers can edit the pipeline definition in the application repos.\n\nProposed pull model:\n - Argo CD in each cluster, with a ServiceAccount scoped to the namespaces it manages, reading one config repo over HTTPS with a read-only deploy key.\n - Cluster API endpoints become private.",
          ask: "Compare the two models on credentials, network exposure, blast radius and reliability, and answer the security team's objection.",
          parts: [
            part(
              "Credentials and their exposure",
              "Push: a cluster-admin kubeconfig for 12 clusters lives outside every cluster, in a shared CI system that 40 people can alter, so a pipeline change or runner compromise is a full-estate compromise; pull: no cluster credentials leave the cluster -- the agent uses an in-cluster ServiceAccount, and the only external secret is a read-only deploy key to one repo.",
              "In the push model the most powerful credential in the company -- cluster-admin on all twelve production clusters -- is stored on a shared runner and exercised by pipelines that 40 developers can edit; a malicious or careless pipeline step, or a runner compromise, is total compromise. In the pull model there is no exported cluster credential at all: Argo CD authenticates to its own cluster via a ServiceAccount bound by RBAC to the namespaces it manages, and the credential it holds for the outside world is a read-only key to one repository. Stealing it yields the ability to read manifests, not to change clusters."
            ),
            part(
              "Network exposure and blast radius",
              "Push requires the API server reachable from the CI network (here, the internet); pull needs only outbound HTTPS from the cluster to the repo, so the API endpoints can be private; blast radius shrinks from 'all clusters' to 'one cluster's managed namespaces' per agent, and an attacker who controls the repo still faces review, signing and the agent's RBAC.",
              "Push forces an inbound path: twelve public API endpoints accepting admin connections from a build network. Pull inverts it: the agent makes outbound HTTPS calls to the repository; API servers go private. Blast radius: compromising one Argo CD instance affects one cluster's managed namespaces; compromising the CI runner today affects everything. The repository becomes the choke point -- which is where branch protection, review, signed commits and admission policies in each cluster stand guard."
            ),
            part(
              "Reliability",
              "Push happens once and can fail silently if the runner, network or a cluster is down at release time, leaving clusters inconsistent and drift uncorrected; pull agents retry continuously, converge every cluster to the same commit when they can, correct drift, and keep a live record of sync state per cluster.",
              "A pushed release is a one-shot event: if cluster 7's endpoint is unreachable during the apply, cluster 7 silently stays on the old version and nobody notices until an incident; drift introduced later is never fixed. A pulling agent reconciles continuously -- it retries until cluster 7 converges, reports OutOfSync meanwhile, and corrects any later drift. Twelve clusters stay consistent by construction, and 'what is running where' is a live, queryable fact."
            ),
            part(
              "Answering the objection",
              "The agent's power is bounded by RBAC in its own cluster and by what the reviewed repo says; the CI runner's power is unbounded and external; recommends scoping Argo CD's ServiceAccount, enabling admission policies and signed commits, and keeping the agent's own configuration in Git too -- then invites the security team to compare audit trails.",
              "The agent is powerful only within one cluster and only to the extent its ServiceAccount's RBAC allows -- namespace-scoped if desired -- and it will apply only what passed review in the repo. The runner is powerful everywhere, from outside, driven by pipeline code anyone on the team can change. Add the controls that make pull strong: scoped RBAC for the agent, admission policies (signed images, no privileged Pods) that bind even Argo CD, signed and reviewed commits, the Argo CD configuration itself in Git. Then compare audit trails: a per-commit record of who changed what and when it converged, versus runner logs."
            ),
          ],
        },
        {
          text: "The security team accepts pull but asks: 'Flux and Argo CD both poll Git. If GitHub is down for an hour, do our clusters break? And if someone force-pushes a bad commit to main, does every cluster apply it at once?'",
          ask: "Answer both questions precisely.",
          parts: [
            part(
              "Source outage",
              "Clusters keep running their current state; the agent cannot fetch new desired state but continues reconciling against the last known revision it already holds, so nothing breaks and drift is still corrected; only new changes wait; agents report the fetch failure through notifications.",
              "No. The reconciler already holds the last fetched revision in its cache and keeps reconciling the cluster against it, so workloads keep running and drift is still corrected. What stops is intake of new desired state: no new commits are seen until the source is back. Argo CD marks the repo connection as failed and alerts; Flux's GitRepository shows a not-ready condition. Availability of running software never depends on Git being up."
            ),
            part(
              "Bad commit and immutability",
              "A force-push should be impossible -- branch protection exists precisely to make history immutable, which is the 'versioned and immutable' principle; with protection, a bad change arrives only through a reviewed merge; to limit blast radius, environments pull from different paths/branches so a change hits dev first, and reconcilers can require signed commits (Flux verification, Argo CD GPG) and admission policies still gate what gets applied.",
              "Force-pushing to main must be disabled -- that is what 'versioned and immutable' demands and what branch protection enforces, so history cannot be rewritten under the agents. A bad change can only arrive as a reviewed merge. Even then not everything applies at once: dev, staging and prod overlays are separate paths, so prod waits for its own promotion PR; Flux can verify commit signatures (GitRepository.spec.verify) and Argo CD can require GPG-signed commits, rejecting an unsigned revision outright; and the clusters' own admission policies still refuse disallowed resources. A bad merge is reverted with another commit and the agents converge back within minutes."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 16%
    {
      slug: "ci-cd-boundary",
      objective: "CI and CD: the boundary between integration (build, test, publish) and delivery (reconcile desired state), and why GitOps separates them",
      kind: "build",
      title: "Draw the line between CI and CD for an existing pipeline",
      brief:
        "The fictional e-learning provider Wrexham Learn has one Jenkins pipeline with stages: checkout, unit tests, build image, push image :latest, run database migrations against production, kubectl set image on the production Deployment, smoke test, notify Slack. They are adopting Flux and need to know what stays in CI, what moves to CD, and what should change.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each stage as CI, CD or 'neither as written', redesign the pipeline around a GitOps boundary, and explain where migrations and smoke tests belong.",
          parts: [
            part(
              "Integration stages",
              "checkout, unit tests, build image and push are CI -- they produce and verify an artifact; the change needed is pushing an immutable tag or digest rather than :latest, plus scanning and signing, so CD can reference exactly what was tested.",
              "CI: checkout, unit tests, build, push. These turn source into a verified artifact and belong in the pipeline. Change: push registry/wrexham-learn:1.14.3 (and use the digest) instead of :latest -- a mutable tag means the reconciler cannot know what it is deploying and cannot roll back to a specific build. Add image scanning and signing here so the artifact carries its evidence."
            ),
            part(
              "Delivery stages",
              "kubectl set image is CD done the push way; under GitOps it becomes 'CI commits the new image reference into the config repo' and Flux reconciles; CI loses its cluster access entirely.",
              "kubectl set image is the delivery step, performed imperatively by CI with production credentials. Under GitOps it becomes a commit: CI (or an image automation controller such as Flux's ImageUpdateAutomation) writes the new tag/digest into the overlay in the config repo and opens or auto-merges a PR; Flux pulls and applies it. Jenkins no longer needs a kubeconfig."
            ),
            part(
              "Database migrations",
              "Running migrations from CI against production is neither clean CI nor GitOps CD; migrations are part of the application's desired state and should be declared -- a Job run by the reconciler (Flux Kustomization dependsOn ordering, or Argo CD PreSync hook) or an init step the application performs with backward-compatible migrations -- so they are versioned, reviewed and applied in order with the release.",
              "Running migrations from Jenkins against production couples a CI runner to production data with powerful credentials and happens outside the reconciled state. Declare them: a migration Job in the overlay that the reconciler runs before the Deployment (Argo CD PreSync hook; in Flux a separate Kustomization that the app Kustomization dependsOn, or the app's own init container running idempotent, backward-compatible migrations). Now the migration is reviewed with the release, versioned, and runs in the right order on every cluster."
            ),
            part(
              "Smoke tests and notifications",
              "Smoke tests after deployment are post-delivery verification: run them from a Job or an external monitor triggered by the reconciler's success (Flux notification/alert, Argo CD PostSync hook, or progressive delivery with Flagger analysing metrics), and send notifications from the reconciler's events rather than from CI, which no longer knows when the deploy happened.",
              "Smoke tests verify delivery, so they run after the reconciler reports success: an Argo CD PostSync hook Job, or Flux's notification controller triggering a test pipeline on a successful reconciliation, or -- better -- Flagger running a canary with metric analysis and automatic rollback. Slack notifications come from the reconciler (Flux Alert/Provider, Argo CD notifications), because CI finished when the commit merged and does not know when production converged. The boundary: CI ends when the desired state is updated; CD is the reconciler plus whatever verifies the result."
            ),
          ],
        },
      ],
    },
    {
      slug: "iac-and-gitops",
      objective: "Infrastructure as Code (IaC): declarative infrastructure (Terraform, Crossplane, cluster API) and how GitOps reconciles infrastructure as well as applications",
      kind: "case",
      title: "Decide how infrastructure joins the GitOps flow",
      brief:
        "The fictional media company Longridge Studios manages cloud infrastructure with Terraform run by engineers from laptops, and applications with Argo CD. A new service needs a managed PostgreSQL instance, an object storage bucket and DNS records. The platform team is split on how infrastructure should be delivered.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Two proposals:\n A. Keep Terraform; run `terraform apply` from a CI job on merge, store state in a remote backend, and have the application's Argo CD Application depend on outputs copied into a ConfigMap by the CI job.\n B. Adopt Crossplane: define the database, bucket and DNS as Kubernetes custom resources (Compositions/Claims) in the config repo, reconciled by Argo CD like any manifest; the application reads connection details from the Secret Crossplane writes.",
          ask: "Compare the proposals against the GitOps principles and practical concerns, and recommend one with the conditions that would make the other acceptable.",
          parts: [
            part(
              "Where each stands on the principles",
              "A is IaC with CI-driven push: declarative and versioned, but applied by a one-shot CI run (not pulled, not continuously reconciled -- Terraform drift persists until someone runs plan again); B keeps infrastructure under the same pull-based, continuously reconciled agent as applications, with Crossplane's providers correcting drift in the cloud resources themselves.",
              "A: Terraform HCL is declarative and the repo is versioned, but terraform apply from CI is a push, and nothing re-runs it when the cloud drifts (a manually changed bucket policy stays changed). Two of four principles. B: Crossplane resources are declared in the same repo, Argo CD pulls them, and Crossplane's providers continuously reconcile the real cloud resources against the declared spec -- drift in the cloud is corrected. All four principles, and one delivery model for apps and infrastructure."
            ),
            part(
              "Practical concerns",
              "A benefits from the team's Terraform skills, module ecosystem and plan previews, but couples app readiness to a CI side effect (the ConfigMap copy) and leaves state files to protect; B needs Crossplane expertise, provider coverage for the needed services, and care with RBAC since a cluster now holds cloud credentials, but gives applications a native way to consume outputs (connection Secrets) and clear ordering via sync waves.",
              "A keeps existing skills and Terraform's rich module ecosystem and plan output for review, but its glue (CI copying outputs into a ConfigMap) is imperative and fragile, state files need locking and protection, and ordering between infra and app is manual. B needs the team to learn Compositions and relies on provider support for managed Postgres, buckets and DNS (mature for the big clouds); the cluster's Crossplane providers hold cloud credentials, so their RBAC and the provider ServiceAccounts must be tight; in return the app's Application can sync-wave after the Claim, and the connection Secret appears where the app expects it."
            ),
            part(
              "Recommendation and the middle ground",
              "Recommend B for new, per-application infrastructure that should move with the app; A is acceptable for foundational infrastructure (VPCs, clusters) if Terraform itself is run by a reconciler -- e.g. the Flux Terraform controller or Argo CD with a Terraform operator -- so it becomes pulled and continuously reconciled; shared outputs flow through Secrets/ConfigMaps created declaratively, not by CI copy steps.",
              "Recommend B for the service's own infrastructure: it lives next to the app, is promoted with it and is reconciled by the same agent. Keep Terraform for platform foundations -- networks, the clusters themselves -- but make it GitOps too: run it through a reconciler (the Flux Terraform controller, or a Terraform operator reconciled by Argo CD) so applies are pulled and drift detection runs on a schedule, and publish outputs as declared Secrets or ConfigMaps rather than CI copy steps. Either way, laptops stop running apply."
            ),
          ],
        },
        {
          text: "The team chooses Crossplane for the service. A developer asks: 'If I delete the database Claim from the repo by accident and Argo CD prunes it, do we lose the production database?'",
          ask: "Explain the risk and the safeguards GitOps and Crossplane offer.",
          parts: [
            part(
              "The risk",
              "With prune enabled, removing the Claim from the repo makes Argo CD delete the Claim, and Crossplane's default deletion policy deletes the external resource -- the database -- so the risk is real and is the flip side of continuous reconciliation.",
              "Yes, by default: prune would delete the Claim, Crossplane would see the managed resource orphaned from its desired state and, with deletionPolicy Delete, remove the actual database. This is reconciliation doing exactly what the repo says. The repo deletion is reviewable, but a reviewer can miss it."
            ),
            part(
              "Safeguards",
              "Set deletionPolicy: Orphan (or a deletion protection flag on the provider resource) on stateful managed resources so deleting the Claim detaches but does not destroy; add the Argo CD annotation argocd.argoproj.io/sync-options: Prune=false on the database Claim or disable prune for the infrastructure Application; require CODEOWNERS review for infrastructure paths; rely on cloud-side backups and deletion protection as the last line.",
              "Several layers: on the Crossplane managed resource set spec.deletionPolicy: Orphan (and the provider's deletion-protection flag where offered), so losing the Claim orphans the database instead of deleting it; annotate the Claim with argocd.argoproj.io/sync-options: Prune=false (or keep prune off for the infrastructure Application) so Argo CD never deletes it automatically; put infrastructure paths under CODEOWNERS with a second reviewer; and keep automated backups and point-in-time recovery enabled in the cloud regardless. GitOps makes destructive changes visible and reversible as commits -- but the resource itself still needs protection from a correct-but-unwanted reconciliation."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 20%
    {
      slug: "choose-patterns",
      objective: "Select patterns for a given scenario and explain the trade-offs between them",
      kind: "build",
      title: "Pick GitOps patterns for a 40-cluster retailer",
      brief:
        "The fictional supermarket chain Ashworth's runs 40 Kubernetes clusters: one per regional distribution centre, plus two central clusters. Each cluster runs the same platform add-ons and a store-operations app that must be rolled out region by region, with the ability to hold a region back. Three teams own different parts. They are choosing GitOps patterns before picking a tool.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the repository layout, reconciler architecture, environment promotion and progressive delivery patterns, and give the trade-off you accepted with each.",
          parts: [
            part(
              "Repository layout",
              "A platform repo (add-ons, cluster configuration) owned by the platform team and one repo per application team, each with a base and per-cluster or per-region overlays, rather than one monorepo or 40 repos; trade-off: fewer merge conflicts and clear ownership versus cross-repo changes needing coordination.",
              "Three repos matching the three owners: platform-config (add-ons, policies, per-cluster settings) and one per application team, each with base + overlays/<region> (or overlays/<cluster> where clusters differ). A single monorepo would couple teams' reviews and permissions; 40 per-cluster repos would multiply drift between regions. Trade-off accepted: a change spanning platform and app needs two PRs and ordering, in exchange for clean ownership and CODEOWNERS."
            ),
            part(
              "Reconciler architecture",
              "Hub-and-spoke with a reconciler per cluster (in-cluster agents) managed from a central 'management' definition, or a central Argo CD managing remote clusters; choose in-cluster agents for resilience (each DC keeps reconciling if the WAN drops) and a central ApplicationSet/Flux bootstrap to keep agent config uniform; trade-off: 40 agents to upgrade versus a central single point of failure and WAN dependence.",
              "In-cluster reconcilers on every DC cluster, bootstrapped and kept uniform from a central definition (an ApplicationSet with a cluster generator in a central Argo CD acting only as the 'agent of agents', or Flux bootstrap per cluster from one management repo). Each distribution centre keeps converging even if its WAN link to head office fails -- important for stores. Trade-off: 40 agent installations to upgrade and monitor, instead of one central Argo CD whose outage or WAN loss would freeze every region."
            ),
            part(
              "Environment promotion and holding back a region",
              "Directory-per-environment and per-region overlays promoted by pull request (not long-lived branches), with region rings (canary DC -> wave 1 -> wave 2) implemented as separate overlay groups whose image digest is bumped ring by ring; holding a region back is simply not merging its bump; trade-off: more files to update versus branch-per-environment's merge pain.",
              "Promote by directory, not branch: overlays/regions/<ring>/ with rings canary (one DC), wave-1 (10 DCs), wave-2 (the rest). A release PR bumps the digest in canary; after soak, a PR for wave-1; then wave-2. A region that must wait simply stays in a later ring or gets its own overlay that is not bumped. Branch-per-environment is rejected because merges between long-lived branches drift and conflict. Trade-off: several small PRs per release, each a clear audit record."
            ),
            part(
              "Progressive delivery inside a cluster",
              "Canary (Argo Rollouts or Flagger) for the store-operations app within each cluster with metric analysis and automatic rollback, declared in the overlay; blue/green where instant switch-back matters more than gradual exposure; trade-off: needs metrics and a traffic-shaping layer versus plain rolling updates.",
              "Inside each cluster the store-operations Deployment becomes a Rollout (or a Flagger Canary) with steps 10% -> 50% -> 100% gated on error-rate and latency from Prometheus, auto-aborting on failure -- all declared in the overlay so the strategy is itself versioned. Blue/green is the alternative where a one-click switch-back matters more than gradual exposure (e.g. the tills' API). Trade-off: a traffic-shaping layer (mesh, ingress controller or service-based splitting) and reliable metrics are prerequisites; without them a rolling update is the honest choice."
            ),
            part(
              "Pull versus event-driven reconciliation",
              "Polling every few minutes as the baseline (robust, no inbound dependency) plus webhooks from the Git host to the central hub for faster reaction where latency matters; trade-off: webhooks need reachable endpoints and can be missed, so polling remains the safety net.",
              "Default to polling (every 3-5 minutes) in every cluster: no inbound connectivity, no missed events, converges eventually. Add webhook-triggered reconciliation only where minutes matter and an endpoint can be exposed safely -- the central clusters, say -- and keep polling on as the fallback. Trade-off: webhooks cut latency to seconds but introduce an inbound dependency and can be dropped; pull alone is slower but cannot be missed."
            ),
          ],
        },
      ],
    },
    {
      slug: "release-pattern-tradeoffs",
      objective: "Progressive delivery patterns: canary, blue/green and feature flags driven from desired state, and the role of metrics in automated promotion",
      kind: "case",
      title: "Choose a release pattern after a bad Friday deploy",
      brief:
        "The fictional food-delivery app Saffron Dash released version 9.2 of its ordering API at 17:30 on a Friday with a rolling update. Errors rose from 0.2% to 6% within two minutes; it took 11 minutes for someone to notice and another 9 to roll back by reverting the commit. Leadership wants 'this to never happen again'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Facts from the review:\n - Rolling update: maxSurge 25%, maxUnavailable 0, readiness probe passing (the bug returned HTTP 500 only for orders with a promo code).\n - All traffic shifted to 9.2 within 90 seconds.\n - Error ratio and p95 latency are already in Prometheus, labelled by version.\n - The team deploys with Argo CD; Argo Rollouts is installed but unused.\n - Reverting took 9 minutes because the revert PR needed two approvals and a CI run.",
          ask: "Explain why the rolling update could not protect them, choose a progressive delivery pattern for this service, and specify how metrics drive it.",
          parts: [
            part(
              "Why rolling updates were not enough",
              "A rolling update only gates on readiness, which the buggy version passed; it exposes 100% of traffic within minutes with no observation window and no automatic decision; detection and rollback were human and slow, so the pattern itself offered no protection against a bug that passes health checks.",
              "The rolling update did exactly what it promises: replace Pods as new ones become Ready. Readiness tests 'can serve', not 'serves correctly', and the promo-code bug served 500s only to a subset of requests. Within 90 seconds every user was on 9.2, with no observation window and no automatic reaction; the only safety net was a human watching a dashboard on a Friday evening and a two-approval revert. The pattern cannot protect against a bug that passes probes."
            ),
            part(
              "Pattern choice",
              "Canary via Argo Rollouts: shift 5%, then 25%, then 50% with pauses, gated by an AnalysisTemplate on the version-labelled error ratio and p95 latency, auto-abort on failure; blue/green is the alternative if traffic splitting is unavailable, giving instant switch-back but exposing 100% at once; feature flags handle the promo-code path specifically.",
              "Convert the Deployment to an Argo Rollouts Rollout with a canary strategy: setWeight 5 -> pause 5m -> setWeight 25 -> pause 10m -> setWeight 50 -> pause 10m -> 100, with an analysis step at each pause. Only 5% of users would have met the bug, and the rollout would have aborted itself inside five minutes. Blue/green would give an instant switch back to 9.1 but still exposes everyone during the window, so canary fits this failure better. Add a feature flag around the new promo-code logic so a code path can be turned off faster than any deploy."
            ),
            part(
              "Metrics-driven promotion",
              "An AnalysisTemplate querying Prometheus for the canary version's error ratio (e.g. < 1%) and p95 latency (< 500 ms) over each interval, with failureLimit so a transient blip does not abort; success advances the next step automatically, failure aborts and scales the canary to zero -- rollback in seconds with no PR; the metrics already exist, labelled by version, which makes this feasible.",
              "AnalysisTemplate (Prometheus provider): metric error-ratio = sum(rate(http_requests_total{app=\"orders\",version=\"{{args.canary-version}}\",code=~\"5..\"}[2m])) / sum(rate(http_requests_total{app=\"orders\",version=\"{{args.canary-version}}\"}[2m])), successCondition result < 0.01, interval 1m, failureLimit 2; metric p95 from histogram_quantile(0.95, ...) with successCondition < 0.5. Each pause runs the analysis; passing promotes to the next weight automatically, failing aborts the rollout and routes 100% back to the stable ReplicaSet in seconds -- no PR, no approvals. The version label already in the metrics is what makes the canary measurable; the rollout's own stable/canary labels can be used instead."
            ),
          ],
        },
        {
          text: "The canary design is approved. The release manager then asks: 'If the canary aborts by itself at 17:35, is that a GitOps violation? Git still says 9.2, but the cluster is serving 9.1. And how do we stop Friday-evening releases without blocking hotfixes?'",
          ask: "Answer both questions in GitOps terms and propose the policy.",
          parts: [
            part(
              "Abort versus desired state",
              "An aborted Rollout is not drift the way a kubectl edit is: the Rollout resource itself is the declared desired state and its strategy declares 'abort on failed analysis', so the controller is reconciling exactly what Git asked for; the Rollout reports Degraded/Aborted and Argo CD shows the Application Degraded, which is the feedback loop telling the team to decide -- revert the image in Git (making 9.1 desired again) or fix forward with 9.3; leaving it aborted indefinitely is the thing to avoid.",
              "Not a violation. The declaration in Git is a Rollout whose strategy says: shift traffic in steps and abort if analysis fails. Serving 9.1 after an abort is the declared behaviour for a failed 9.2, and the Rollout status (Degraded, aborted) plus the Argo CD Application health surface it as feedback. What the team must then do is make desired state honest: either revert the image to 9.1 in Git (so the Rollout becomes Healthy and Synced) or ship a fixed 9.3. Leaving Git at 9.2 and the cluster aborted for days is where it becomes drift in spirit."
            ),
            part(
              "Release windows that keep hotfixes",
              "Encode the window declaratively rather than by human discipline: Argo CD sync windows on the AppProject (deny window Friday 16:00-Monday 08:00 for the production Applications, with manualSync allowed for a labelled hotfix path) or Argo Rollouts pauses with an explicit human promote outside hours; hotfixes bypass through the manual sync with a break-glass record, keeping the audit trail in Argo CD.",
              "Put the policy in the platform, not in a wiki: an Argo CD sync window on the production AppProject -- kind: deny, schedule \"0 16 * * 5\", duration 64h, applications [orders-prod] -- blocks automated and manual syncs through the weekend; set manualSync: true on the window so an on-call engineer can still argocd app sync for a genuine hotfix, which Argo CD logs as a manual operation by a named user. The canary strategy still guards the hotfix itself. Friday release discipline becomes a reviewable YAML rule with a documented exception path, which is exactly the GitOps habit."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------- 14%
    {
      slug: "configure-reconciler",
      objective: "Configure a reconciliation engine: Argo CD, Flux and alternatives -- their models (Applications, Kustomizations/HelmReleases), sync and health",
      kind: "build",
      title: "Express the same delivery in Argo CD and in Flux",
      brief:
        "The fictional publisher Elmbridge Press wants to deploy its catalogue service from the config repo https://git.elmbridge.example/platform/config.git, path apps/catalogue/overlays/prod, branch main, into namespace catalogue on the production cluster, with automatic sync, pruning, drift correction and a 2-minute reconciliation interval. They have not chosen between Argo CD and Flux and want to see both.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the Argo CD Application and the equivalent Flux GitRepository plus Kustomization, then compare how each reports sync and health and how each handles a failing reconciliation.",
          parts: [
            part(
              "Argo CD Application",
              "An argoproj.io/v1alpha1 Application in the argocd namespace with source repoURL/path/targetRevision, destination server or name and namespace, syncPolicy automated {prune: true, selfHeal: true}, syncOptions CreateNamespace=true; the reconciliation interval is a controller-wide setting (timeout.reconciliation, default 3m) rather than per Application.",
              "apiVersion: argoproj.io/v1alpha1\nkind: Application\nmetadata: {name: catalogue-prod, namespace: argocd}\nspec:\n  project: default\n  source:\n    repoURL: https://git.elmbridge.example/platform/config.git\n    targetRevision: main\n    path: apps/catalogue/overlays/prod\n  destination:\n    server: https://kubernetes.default.svc\n    namespace: catalogue\n  syncPolicy:\n    automated: {prune: true, selfHeal: true}\n    syncOptions: [CreateNamespace=true]\nThe polling interval is global in Argo CD (argocd-cm timeout.reconciliation: 120s), not per Application; webhooks from the Git host make it near-instant."
            ),
            part(
              "Flux GitRepository and Kustomization",
              "A source.toolkit.fluxcd.io GitRepository (url, ref.branch main, interval 2m) and a kustomize.toolkit.fluxcd.io Kustomization (sourceRef, path, interval 2m, prune true, targetNamespace, wait/health checks); Flux's drift correction is inherent -- every interval it re-applies -- so there is no separate selfHeal flag.",
              "apiVersion: source.toolkit.fluxcd.io/v1\nkind: GitRepository\nmetadata: {name: platform-config, namespace: flux-system}\nspec:\n  interval: 2m\n  url: https://git.elmbridge.example/platform/config.git\n  ref: {branch: main}\n---\napiVersion: kustomize.toolkit.fluxcd.io/v1\nkind: Kustomization\nmetadata: {name: catalogue-prod, namespace: flux-system}\nspec:\n  interval: 2m\n  sourceRef: {kind: GitRepository, name: platform-config}\n  path: ./apps/catalogue/overlays/prod\n  prune: true\n  targetNamespace: catalogue\n  wait: true\n  timeout: 5m\nFlux separates fetching (GitRepository) from applying (Kustomization); each has its own interval. Drift correction needs no flag: every interval the Kustomization server-side-applies the rendered manifests, undoing live edits."
            ),
            part(
              "Sync and health reporting",
              "Argo CD: sync status (Synced/OutOfSync) from comparing desired to live, and health (Healthy/Progressing/Degraded/Suspended/Missing) from built-in and Lua health checks, visible in UI/CLI (argocd app get); Flux: Ready condition on the Kustomization with reasons (ReconciliationSucceeded, BuildFailed, HealthCheckFailed) and the applied revision, visible via flux get kustomizations and kubectl, with wait: true turning resource health into the Ready condition.",
              "Argo CD reports two things per Application: Sync (does live match Git?) and Health (are the resources working?), the latter from built-in checks per kind plus custom Lua -- argocd app get catalogue-prod shows both and the synced revision. Flux reports a Ready condition on the Kustomization with a reason and message, plus status.lastAppliedRevision; with wait: true the Kustomization is Ready only when the applied workloads report healthy. flux get kustomizations shows revision, Ready and the message; the same is in kubectl describe."
            ),
            part(
              "A failing reconciliation",
              "Argo CD: the sync fails, the Application shows OutOfSync with the error in sync status/operation state, automated sync retries with backoff (retry policy configurable), and notifications can alert; Flux: the Kustomization's Ready becomes False with the error (e.g. a manifest validation error), it retries every interval, the GitRepository stays current, and the notification controller sends Alerts; in both, the fix is a new commit.",
              "Argo CD: a bad manifest makes the sync operation fail; the Application turns OutOfSync (and perhaps Degraded), the operation state carries the API server's error, automated sync retries per the retry policy, and argocd-notifications can post to Slack. Flux: the Kustomization sets Ready=False with reason BuildFailed or ReconciliationFailed and the exact error; it retries each interval and the notification controller's Alert sends it to a Provider. Neither pushes the broken state over the working one: the previous applied revision keeps running until a corrected commit arrives."
            ),
          ],
        },
      ],
    },
    {
      slug: "choose-tooling",
      objective: "Choose tooling for a given organisation and justify the choice",
      kind: "case",
      title: "Recommend GitOps tooling for a regulated mid-size company",
      brief:
        "The fictional pensions administrator Rowan Trust has eight clusters, Helm-heavy applications, a strong preference for a UI that auditors can read, and a security policy that forbids inbound connections to production. Two teams champion Argo CD and Flux respectively; a third suggests a commercial platform that wraps one of them.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Requirements gathered:\n - Auditors want to see, per application, the deployed Git revision, who approved it and the sync history.\n - Platform team of three; applications are 60% Helm charts, 40% Kustomize.\n - Production clusters allow outbound HTTPS only; no ingress from corporate network.\n - Secrets must come from the company's HashiCorp Vault.\n - Notifications to Microsoft Teams on failed syncs are required.",
          ask: "Assess Argo CD and Flux against these requirements and recommend, naming what the choice costs.",
          parts: [
            part(
              "Fit against requirements",
              "Both satisfy the principles and the outbound-only constraint (in-cluster agents pulling Git); Argo CD's UI shows revision, sync history and diffs per Application out of the box, which answers the auditors; Flux has no built-in UI (Weave GitOps/Capacitor or Headlamp plugins add one) but is lighter and more composable; both handle Helm and Kustomize (Argo CD renders Helm to manifests; Flux's HelmRelease uses the Helm SDK natively, preserving Helm release semantics); both integrate with Vault via External Secrets Operator; both notify Teams (Argo CD Notifications, Flux notification controller).",
              "Outbound-only: both are in-cluster pull agents; neither needs inbound access -- a tie. Audit visibility: Argo CD's UI and CLI show per-Application synced revision, sync history with timestamps and diffs, which is what auditors asked for; Flux records the same in resource status and events but needs an add-on UI (Weave GitOps, Capacitor, Headlamp Flux plugin) for a readable view. Helm: Flux's HelmRelease drives Helm itself (real releases, hooks, rollback semantics); Argo CD templates charts into manifests and applies them (hooks mapped to sync hooks, no helm release objects) -- fine, but different. Secrets from Vault: External Secrets Operator (or the Vault CSI driver) works identically under both. Teams notifications: argocd-notifications and Flux's notification controller both have Teams providers. Approvals live in the Git host either way."
            ),
            part(
              "Recommendation",
              "Recommend Argo CD for Rowan Trust: the auditor-facing UI with sync history and RBAC/SSO for read-only auditor access is the deciding requirement, with ApplicationSets for eight clusters; note Helm handling differences and plan for Vault via ESO; cost: a heavier control plane to run, Argo CD's own RBAC/SSO to configure, and a central UI to secure (read-only, SSO, behind the corporate boundary via outbound tunnel or hosted on a management cluster).",
              "Argo CD. The requirement that tips it is the auditors: SSO-backed, read-only UI access showing each Application's revision, history and diff satisfies 'who approved what and when' (approvals from the PRs, deployment history from Argo CD) without building anything. ApplicationSets manage the eight clusters from one definition. Helm charts are rendered rather than installed as Helm releases -- acceptable, but tell the application teams that helm list will be empty. Costs: more components to run and upgrade than Flux; Argo CD RBAC and SSO to set up correctly; the UI itself is an asset to protect -- host it on a management cluster, SSO only, and reach it from the corporate network through an approved path, keeping production clusters outbound-only."
            ),
            part(
              "When Flux would win, and the commercial wrapper",
              "Flux would be the choice if the team valued Helm-native releases, minimal footprint and composability over a built-in UI, or already used Flux's ecosystem; the commercial platform adds UI, multi-cluster governance and support for a licence and some lock-in -- reasonable for a three-person team if budget exists, but the underlying principles and manifests should remain portable.",
              "Flux would win for a team that wants true Helm releases, a small footprint and Kubernetes-native composability, and that is content with an add-on UI or kubectl for audit evidence. The commercial wrapper buys a polished UI, multi-cluster governance, RBAC and vendor support -- attractive for a three-person platform team -- at the price of licence cost and some dependency on the vendor's abstractions. Whichever is chosen, keep the Applications/Kustomizations and all desired state in plain, portable manifests so the choice can be revisited."
            ),
          ],
        },
        {
          text: "Argo CD is chosen. Six weeks in, the platform team reports:\n\n$ argocd app list -o wide | awk '{print $1, $5, $6}' | sort | uniq -c | sort -rn | head -4\n     41 <name> Synced Healthy\n      6 <name> OutOfSync Healthy\n      2 <name> Unknown Degraded\n\n$ argocd app get payments-prod | grep -E 'Repo|Target|Sync Status'\nRepo:               https://git.rowantrust.example/platform/config.git\nTarget:             main\nSync Status:        Unknown\nComparison error: rpc error: code = Unknown desc = authentication required: Repository not found\n\nThe Git host rotated the deploy token last week; the auditors also ask how they will get read-only access.",
          ask: "Fix the two Unknown apps and set up the auditors' access, naming the Argo CD features involved.",
          parts: [
            part(
              "Unknown status and the repository credential",
              "Unknown means Argo CD could not even compare -- here the repo-server cannot authenticate to Git after the token rotation; fix by updating the repository credential (argocd repo add --upsert or the repository Secret with the argocd.argoproj.io/secret-type: repository label), then refresh the apps; explains the two Unknown apps share that repo while the 41 Synced ones use another repo or cached state.",
              "Sync Status Unknown is a comparison failure, not drift: the repo-server failed to fetch the config repo because the stored deploy token is dead. Update the credential declaratively -- the repository Secret in the argocd namespace labelled argocd.argoproj.io/secret-type: repository with the new token (or argocd repo add https://git.rowantrust.example/platform/config.git --username argocd --password <new token> --upsert) -- then argocd app get payments-prod --refresh. Store that Secret through the same sealed/external-secret path as everything else so the next rotation is a commit, not a surprise. Prefer a GitHub/GitLab app or SSH deploy key with no expiry over personal tokens."
            ),
            part(
              "Read-only access for auditors",
              "Argo CD RBAC: an SSO group (OIDC via Dex or the company IdP) mapped in argocd-rbac-cm to a policy granting get on applications, projects and logs and nothing else (p, role:auditor, applications, get, */*, allow; g, auditors-group, role:auditor), scoped per AppProject if needed; explains the UI then shows history and diffs but no sync button, and that policy.default should be role:readonly or none.",
              "Connect Argo CD to the identity provider (Dex or direct OIDC in argocd-cm) so auditors log in with SSO. In argocd-rbac-cm:\n  policy.csv: |\n    p, role:auditor, applications, get, */*, allow\n    p, role:auditor, projects, get, *, allow\n    p, role:auditor, logs, get, */*, allow\n    g, rowan:auditors, role:auditor\n  policy.default: role:none\nMembers of the auditors group see every Application's synced revision, sync history and diff in the UI and CLI, with no sync, delete or exec actions. Scope the wildcard to specific AppProjects if some applications are out of audit scope."
            ),
          ],
        },
      ],
    },
  ],
};
