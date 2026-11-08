import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";

// REQ-155: Microsoft Certified: DevOps Engineer Expert (AZ-400).
//
// Aligned to the AZ-400 study guide, skills measured as of July 27, 2026
// (Design and implement processes and communications 10-15% / Design and
// implement a source control strategy 10-15% / Design and implement build
// and release pipelines 50-55% / Develop a security and compliance plan
// 10-15% / Implement an instrumentation strategy 5-10%), re-read on
// 2026-11-07:
//   https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-400
// Density (docs/labs.md, policy "hybrid") for the seed's unit weights
// 13/13/53/13/8: 2 / 2 / 3 / 2 / 1. AZ-400 is a design-and-implement exam
// across GitHub and Azure DevOps, so the labs produce the artefacts a DevOps
// engineer writes: a flow-metrics dashboard spec, a Boards-GitHub link
// design, a branching policy, a secret-purge runbook, a multi-stage YAML
// pipeline, environment checks, a deployment strategy, secretless
// authentication, a scanning strategy, and KQL queries.
//
// Sources behind the figures (checked 2026-11-07):
//   lead time (created -> Completed) and cycle time (first In Progress ->
//   Completed) widgets, scatter plot, moving average:
//   learn.microsoft.com/azure/devops/report/dashboards/cycle-time-and-lead-time
//   AB# linking syntax, fix/fixes/fixed transitions to the first Resolved
//   (else Completed) state, default-branch merge requirement:
//   learn.microsoft.com/azure/devops/boards/github/link-to-from-github
//   removing sensitive data (rotate first; git filter-repo; force push;
//   collaborators rebase not merge; GitHub Support clears cached views;
//   forks keep it; push protection): docs.github.com/.../removing-sensitive-data-from-a-repository
//   pipeline YAML top-level keys and multi-stage example:
//   learn.microsoft.com/azure/devops/pipelines/yaml-schema/pipeline
//   approvals and checks (defined on the resource, not in YAML; approvers,
//   timeout; branch control, business hours, exclusive lock, required
//   template, Invoke REST API / Azure Function, Query Azure Monitor alerts):
//   learn.microsoft.com/azure/devops/pipelines/process/approvals
//   deployment jobs (runOnce / rolling / canary; preDeploy, deploy,
//   routeTraffic, postRouteTraffic, on: failure/success; rolling is for VM
//   resources): learn.microsoft.com/azure/devops/pipelines/process/deployment-jobs
//   deployment slots swap, slot settings, swap with preview, traffic %:
//   learn.microsoft.com/azure/app-service/deploy-staging-slots
//   workload identity federation for Azure Resource Manager service
//   connections (app registration or managed identity; Entra issuer;
//   Azure DevOps-issuer connections retire 2027-07-01):
//   learn.microsoft.com/azure/devops/pipelines/release/configure-workload-identity
//   GitHub Actions OIDC to Azure (permissions id-token: write, azure/login
//   client-id/tenant-id/subscription-id, audience api://AzureADTokenExchange,
//   no long-lived secrets): learn.microsoft.com/azure/developer/github/connect-from-azure-openid-connect
//   and docs.github.com/.../configuring-openid-connect-in-azure
//   GitHub Advanced Security products (Code Security: code scanning,
//   dependency review, Dependabot premium, security overview; Secret
//   Protection: secret scanning, push protection): docs.github.com/.../about-github-advanced-security
//   AppRequests KQL examples and columns (TimeGenerated, Success, DurationMs,
//   Name, ItemCount): learn.microsoft.com/azure/azure-monitor/reference/queries/apprequests

export const AZ400_LABS: SeedLabSet = {
  trackCode: "AZ400",
  sources: [
    "https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-400",
    "https://learn.microsoft.com/en-us/azure/devops/report/dashboards/cycle-time-and-lead-time",
    "https://learn.microsoft.com/en-us/azure/devops/boards/github/link-to-from-github",
    "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository",
    "https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/pipeline",
    "https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals",
    "https://learn.microsoft.com/en-us/azure/devops/pipelines/process/deployment-jobs",
    "https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots",
    "https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity",
    "https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect",
    "https://docs.github.com/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-azure",
    "https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security",
    "https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/apprequests",
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Design and Implement Processes and Communications (2)
    // ----------------------------------------------------------------------
    {
      slug: "flow-of-work-dashboard",
      objective: "Designing and implementing a dashboard for flow of work, including cycle times, time to recovery, and lead time",
      kind: "build",
      title: "Design a flow-of-work dashboard for a delivery team",
      brief:
        "The Beacon team at Larkspur Software, a fictional company, uses Azure Boards with a Kanban board (columns: New, Approved, In Progress, In Review, Done) and deploys through Azure Pipelines to production several times a week. Their manager asks for one dashboard that answers four questions: how long does a request take from the moment it is logged until it ships; how long does work take once someone starts it; where does work pile up; and when production breaks, how fast is it fixed. She also wants to know what she should NOT conclude from the numbers. Specify the dashboard: each widget, the metric and its exact definition, the board states it depends on, and the interpretation note for each.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the dashboard specification.",
          parts: [
            part(
              "Lead time widget",
              "Adds the Lead Time analytics widget, defining lead time as elapsed time from when a work item is created until it reaches a Completed-category state (Done), notes it is shown as a scatter plot with a moving-average trend line and standard-deviation band, and ties the Done column to the Completed state category.",
              "Lead Time widget (Analytics), scoped to the Beacon team's backlog for the last 30-60 days. Definition: the elapsed time from when a work item is created until it reaches a Completed state -- in Beacon's process that is the Done column mapped to the Completed category. The widget plots each completed item as a dot by completion date with a moving-average trend line and a shaded standard-deviation band. Interpretation: this includes time spent waiting in New and Approved, so it measures the whole request-to-delivery experience the customer feels."
            ),
            part(
              "Cycle time widget",
              "Adds the Cycle Time widget, defining cycle time as elapsed time from when the item first enters an In Progress-category state until Completed; explains the board's In Progress and In Review columns must map to the In Progress state category for the number to be right; notes it measures team process time and reveals bottlenecks.",
              "Cycle Time widget beside it, same scope. Definition: elapsed time from when the item first enters an In Progress state until it reaches Completed. For that to be true, the In Progress and In Review columns must both be mapped to the In Progress state category (In Review is not done). Interpretation: this is the team's own process time; a rising cycle time with a flat lead time means work is starting sooner but finishing no faster -- too much in progress at once."
            ),
            part(
              "Where work piles up",
              "Adds a Cumulative Flow Diagram widget (bands per board column over time) and reads a widening band as a queue forming at that column; may add work-in-progress limits on the board.",
              "Cumulative Flow Diagram widget for the Beacon board. Each band is a column; a band that widens over time is a column where work is arriving faster than it leaves -- for Beacon that is usually In Review. Interpretation: it points at the stage to fix (add reviewers, set a WIP limit on In Review); it does not tell you which item is stuck."
            ),
            part(
              "Time to recovery",
              "Defines time to recovery (mean time to restore) as elapsed time from a production incident being detected to service restored, and implements it with a Bug or Incident work-item type carrying detection and resolved timestamps queried by a Chart for Work Items / query-based widget, or the Cycle Time widget scoped to that type; notes Azure Boards has no built-in MTTR widget.",
              "Time to recovery: elapsed time from a production incident being detected (or logged) to the fix being live. Azure Boards has no built-in recovery widget, so model it: an Incident work-item type (or tagged Bugs) created when monitoring fires and closed when the fix deploys, then a Cycle Time widget scoped to that type, or a Chart for Work Items widget on a query of resolved incidents averaging the elapsed time. Interpretation: a few long incidents dominate an average, so show the distribution, not only the mean."
            ),
            part(
              "What not to conclude",
              "Warns against reading the metrics as individual performance measures or targets (Goodhart's law), against comparing teams with different state mappings, and against treating a moving average with few items as a trend.",
              "Do not use these to rate individuals -- they are team flow measures, and turning them into targets changes behaviour (items get split or closed early) without improving delivery. Do not compare Beacon's numbers with another team whose columns map differently to state categories. With a handful of items a week, the moving average swings on one outlier; look at the scatter and the band, not a single number."
            ),
          ],
        },
      ],
    },
    {
      slug: "boards-github-integration",
      objective: "Configuring integration between Azure Boards and GitHub repositories",
      kind: "build",
      title: "Connect Azure Boards to a GitHub repository and define the linking rules",
      brief:
        "Larkspur Software tracks work in Azure Boards (project Beacon) but its code lives in a GitHub organisation, larkspur-dev, repository beacon-api. Product owners complain they cannot see which pull request delivered a story, and developers complain they have to update work-item states by hand. The team uses GitHub Flow with pull requests into main. Design the integration: how the connection is made, how developers link commits, pull requests and issues to work items, which words move a work item's state and to what, where the links appear, and two pitfalls that will make the links silently not work.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the integration design and the team's linking rules.",
          parts: [
            part(
              "Connection",
              "Installs the Azure Boards app for GitHub on the larkspur-dev organisation (or the repository) and connects the Beacon project to the beacon-api repository from Project settings > GitHub connections, authenticating with the GitHub app rather than a personal access token where possible.",
              "In the Beacon project, Project settings > GitHub connections > Connect your GitHub account, choose the larkspur-dev organisation and select beacon-api; this installs the Azure Boards app for GitHub on the repository, which is what delivers commit and pull-request events to Boards. Prefer the app installation over a PAT-based connection so nothing expires with a person."
            ),
            part(
              "Linking syntax",
              "Uses AB#<id> in a commit message, pull request description or GitHub issue description (for example AB#412) to link to work item 412; notes that AB# in a PR title or comment does not create a link, and that links appear in the work item's Development section and in the GitHub pull request.",
              "Developers put AB#<work item id> in the commit message or in the pull request description -- 'Add rate limiting to /bookings AB#412'. That creates a link that shows in work item 412's Development section and, for PRs, in the pull request itself. It must be the description: AB#412 in a PR title or a comment is ignored and no link is made."
            ),
            part(
              "State transitions",
              "States that the keywords fix, fixes or fixed before an AB# reference transition the work item to the first state in the Resolved category (or the first Completed state if the process has no Resolved state) when the PR is merged into the default branch; a state name such as Closed AB#412 moves it to that state; other referenced items in the same message only get linked.",
              "'Fixes AB#412' links and, when the pull request merges into the default branch (main), moves work item 412 to the first state in the Resolved category -- or, in a process with no Resolved state, the first Completed state. 'Closed AB#412' moves it to Closed if the process has that state. 'Fixes AB#412, AB#413' transitions only 412; 413 is just linked. A plain 'AB#412' links without changing state."
            ),
            part(
              "Pitfalls",
              "Names at least two: the transition does not happen unless the PR merges into the default branch; AB# in a title/comment creates no link; the repository must be connected to the project or validation fails; removing the AB# text from the description removes the link; Azure DevOps Server with GitHub Enterprise Server pulls links hourly.",
              "Two that bite: a 'Fixes AB#' on a PR merged into a release branch, not main, links but never transitions, because state rules apply only to merges into the default branch; and a developer who writes AB#412 in the PR title or a review comment gets no link at all. Also, editing the AB# out of a description deletes the link, and a repository that is not connected to the project fails link validation."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Design and Implement a Source Control Strategy (2)
    // ----------------------------------------------------------------------
    {
      slug: "branch-strategy-and-policies",
      objective: "Designing a branch strategy -- trunk-based, feature branch, and release branch",
      kind: "build",
      title: "Design a branching strategy and its protection rules",
      brief:
        "Cinder Mobile, a fictional company, has 14 developers on one Azure Repos Git repository for a mobile back end. Today everyone works on long-lived personal branches merged every few weeks, releases are cut from whichever branch looks stable, and a production hotfix last month was lost because it was applied to the release build but never merged back. Goals: integrate continuously, ship to production from an automated pipeline at least weekly, keep the ability to patch the version in production without shipping unfinished work, and make it impossible to merge into the main line without review and a passing build. Design the branching model and the branch policies, and explain how the lost-hotfix problem cannot recur.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the branching model and the policies.",
          parts: [
            part(
              "Model",
              "Recommends trunk-based development with short-lived feature (topic) branches merged into main through pull requests within a day or two, plus release branches cut from main for each production release (release/2026.11), so main keeps moving while a release can be patched; rejects long-lived personal branches and a permanent develop branch for this team size and cadence.",
              "Trunk-based development: main is always releasable; each change lives on a short-lived feature branch (feature/<ticket>) merged by pull request within a day or two, with feature flags hiding unfinished work. For each weekly release, cut release/2026.11.1 from main; production deploys from that branch, so a patch can be shipped from it without picking up what landed on main since. No permanent develop branch and no multi-week personal branches: they recreate the integration pain the team has now."
            ),
            part(
              "Branch policies on main",
              "Configures Azure Repos branch policies on main (and release/*): minimum number of reviewers (for example two, no self-approval, reset on new pushes), linked work items required, comment resolution required, a build validation policy that must pass, and limited merge types (squash or rebase, no plain merge if a linear history is wanted); explains policies make direct pushes impossible.",
              "Branch policies on main and on release/*: require a minimum of two reviewers with 'allow requestors to approve their own changes' off and votes reset when new changes are pushed; require linked work items; require all comments resolved; add a build validation policy running the CI pipeline that must succeed; limit merge types to squash merge for a readable history. Once any policy is on, nobody can push directly -- every change comes through a pull request that meets them."
            ),
            part(
              "Hotfix path",
              "Defines the hotfix flow: branch from the release branch, fix, PR into the release branch, deploy, then merge (or cherry-pick) the fix forward into main through a PR -- with a branch policy or automation (for example a required check or a pipeline that opens the forward-merge PR) so the forward merge is not forgotten.",
              "Hotfix: branch hotfix/<ticket> from release/2026.11.1, fix, pull request back into release/2026.11.1 (same policies), deploy from there. Immediately open a second pull request cherry-picking or merging the fix into main. To make forgetting impossible, automate it: a pipeline on release/* completion that opens the forward PR to main, and a dashboard query for release-branch commits not reachable from main. Last month's hotfix was lost because that second step depended on memory."
            ),
            part(
              "Keeping branches short",
              "States measures that keep feature branches short-lived: small changes behind feature flags, daily rebase/merge from main, a policy or report flagging branches older than a few days, and automatic deletion of the source branch on PR completion.",
              "Keep features small and hide incomplete behaviour behind flags so a half-finished feature can still merge; developers update from main daily; turn on 'delete source branch after merge' on completion; and surface branches older than three days in the team's stand-up so they are split or finished, not left to drift."
            ),
          ],
        },
      ],
    },
    {
      slug: "purge-a-committed-secret",
      objective: "Removing specific data from source control",
      kind: "case",
      title: "Remove a committed secret from a repository's history",
      brief:
        "A developer at Cinder Mobile pushed a commit to the GitHub repository cinder-mobile/payments-api that contained a live payment-provider API key in a config file. The commit went to a feature branch three days ago and was merged into main yesterday; the repository has 14 collaborators, two open pull requests based on main, and one fork owned by a contractor. GitHub secret scanning has just raised an alert.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You are the first responder.",
          ask: "What do you do in the first fifteen minutes, before touching Git history, and why does that come first?",
          parts: [
            part(
              "Immediate response",
              "Revokes and rotates the API key at the payment provider first (treats it as compromised), updates the application to read the new key from a secret store (for example Azure Key Vault / GitHub secrets) rather than a file, and only then considers history; explains that history rewriting does not un-leak a secret that has already been fetched or cached, so rotation is the only control that actually removes the risk.",
              "Revoke the key at the payment provider and issue a new one, then put the new key in Azure Key Vault (or a GitHub Actions secret) and change the app to read it from there. That comes first because anyone who fetched the repository in the last three days, or any cache, already has the old key; rewriting history cannot take it back, but revoking it makes it worthless. Check the provider's logs for use of the leaked key while you are there."
            ),
          ],
        },
        {
          text: "The key is rotated. Compliance now requires the key to be removed from the repository's history as well, not just from the latest commit.",
          ask: "How do you remove it from history, and what must the collaborators do?",
          parts: [
            part(
              "Rewriting history",
              "Uses git filter-repo (the tool GitHub recommends; version 2.47 or later for --sensitive-data-removal, or --replace-text / --path with a fresh clone) to rewrite every commit containing the key, then force-pushes all branches and tags (git push --force --mirror), temporarily lifting branch protection on main; notes that deleting the file in a new commit would leave the key in history.",
              "Fresh clone, then git filter-repo to strip the key from every commit it appears in -- for example with --replace-text listing the key, or --invert-paths for the whole file -- using git-filter-repo 2.47+ so --sensitive-data-removal is available. Temporarily disable branch protection on main, then git push --force --mirror origin so every branch and tag carries the rewritten history. A normal commit that deletes the file is not enough: the key stays in every earlier commit."
            ),
            part(
              "Collaborators, pull requests and the fork",
              "Tells every collaborator to rebase their local work onto the rewritten history (not merge, which would reintroduce the old commits), recreates or rebases the two open pull requests, contacts GitHub Support to purge cached views and PR references, and recognises the contractor's fork still contains the commit and must be handled separately (ask them to delete/rewrite it); states that other people's clones cannot be cleaned by you.",
              "Every collaborator deletes or rebases their local branches onto the new history -- rebase, not merge, because a merge brings the purged commits straight back. The two open pull requests are rebased or reopened. Ask GitHub Support to remove the cached views and the pull-request references that still show the old commit. The contractor's fork still has the commit and GitHub cannot purge it for you; the contractor must rewrite or delete the fork. Anyone's existing clone keeps the old history until they re-clone, which is why rotation came first."
            ),
          ],
        },
        {
          text: "The incident review asks how a secret reached the repository at all, and what will stop the next one.",
          ask: "Recommend the preventive controls.",
          parts: [
            part(
              "Prevention",
              "Enables secret scanning with push protection on the organisation (blocks pushes containing detected secrets), moves all secrets to a secret store with secretless or managed-identity authentication where possible, adds a pre-commit hook or local scanner, and keeps config templates (.gitignore for local config) so credentials never sit in tracked files.",
              "Turn on secret scanning with push protection for the whole organisation so a push containing a recognised secret is blocked before it lands; keep the existing secret scanning alerts for anything that slips through. Move every credential to Key Vault or GitHub secrets and prefer secretless auth (OIDC / managed identities) so there is less to leak. Add a pre-commit secret scanner to the developer setup, and keep real config files out of the repository with .gitignore plus committed example templates."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Design and Implement Build and Release Pipelines (3)
    // ----------------------------------------------------------------------
    {
      slug: "multi-stage-yaml-pipeline",
      objective: "Developing pipelines using YAML",
      kind: "build",
      title: "Write a multi-stage YAML pipeline for a web API",
      brief:
        "Cinder Mobile's payments-api is a .NET web API in Azure Repos. Requirements for its Azure Pipelines YAML: run on every push to main and on pull requests targeting main, but not when only files under docs/ change; build and run unit tests on a Microsoft-hosted Ubuntu agent and publish the test results and a build artifact; deploy that same artifact to a Test environment automatically, and to a Production environment only after Test succeeds and only for runs from main; keep the deployment steps in one reusable template used by both stages with the environment name as a parameter; keep the Azure service connection name and resource group in a variable group. Write the pipeline YAML (azure-pipelines.yml and the template) and explain the three design choices that matter most.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the pipeline YAML and explain the key design choices.",
          parts: [
            part(
              "Triggers, pool and variables",
              "Writes a trigger with branches include main and paths exclude docs/*, a pr trigger for main, pool vmImage ubuntu-latest, and a variables block referencing a variable group (group: payments-api-deploy) holding the service connection and resource group names.",
              "trigger:\n  branches:\n    include: [ main ]\n  paths:\n    exclude: [ docs/* ]\npr:\n  branches:\n    include: [ main ]\npool:\n  vmImage: ubuntu-latest\nvariables:\n- group: payments-api-deploy   # azureServiceConnection, resourceGroup\n- name: buildConfiguration\n  value: Release"
            ),
            part(
              "Build stage",
              "Writes a Build stage with a job that restores, builds and tests with dotnet (script or DotNetCoreCLI tasks), publishes test results (PublishTestResults, or the test task's built-in publishing), and publishes the build output as a pipeline artifact (PublishPipelineArtifact / publish shorthand) named for the later stages.",
              "stages:\n- stage: Build\n  jobs:\n  - job: BuildTest\n    steps:\n    - script: dotnet restore && dotnet build --configuration $(buildConfiguration) --no-restore\n      displayName: Build\n    - script: dotnet test --configuration $(buildConfiguration) --no-build --logger trx --results-directory $(Agent.TempDirectory)/tests\n      displayName: Unit tests\n    - task: PublishTestResults@2\n      inputs:\n        testResultsFormat: VSTest\n        testResultsFiles: '$(Agent.TempDirectory)/tests/*.trx'\n      condition: succeededOrFailed()\n    - script: dotnet publish src/PaymentsApi -c $(buildConfiguration) -o $(Build.ArtifactStagingDirectory)\n    - publish: $(Build.ArtifactStagingDirectory)\n      artifact: api"
            ),
            part(
              "Deploy stages with a template",
              "Writes DeployTest and DeployProd stages that each use a template (templates/deploy.yml) with parameters such as environment and the variable-group values, where DeployTest dependsOn Build and DeployProd dependsOn DeployTest with a condition that the run is from main (eq(variables['Build.SourceBranch'], 'refs/heads/main')) and the previous stages succeeded; the template declares parameters and a deployment job targeting the environment with strategy runOnce and a deploy step that downloads the artifact and deploys (for example AzureWebApp@1).",
              "- stage: DeployTest\n  dependsOn: Build\n  jobs:\n  - template: templates/deploy.yml\n    parameters:\n      environmentName: Test\n      appName: payments-api-test\n- stage: DeployProd\n  dependsOn: DeployTest\n  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))\n  jobs:\n  - template: templates/deploy.yml\n    parameters:\n      environmentName: Production\n      appName: payments-api-prod\n\n# templates/deploy.yml\nparameters:\n- name: environmentName\n  type: string\n- name: appName\n  type: string\njobs:\n- deployment: Deploy\n  environment: ${{ parameters.environmentName }}\n  strategy:\n    runOnce:\n      deploy:\n        steps:\n        - download: current\n          artifact: api\n        - task: AzureWebApp@1\n          inputs:\n            azureSubscription: $(azureServiceConnection)\n            appName: ${{ parameters.appName }}\n            package: $(Pipeline.Workspace)/api"
            ),
            part(
              "Design choices",
              "Explains at least three: one artifact built once and promoted (never rebuilt per stage); a deployment job against an environment so deployment history is recorded and approvals/checks can be attached to Production outside the YAML; template reuse with parameters so Test and Production cannot drift; the main-branch condition so PR runs stop after Test; path exclusion to save agent time.",
              "Build once, deploy the same artifact everywhere: Test and Production receive exactly the bytes that were tested. Deployment jobs targeting named environments record deployment history and let the Production environment carry approvals and checks that the YAML author cannot bypass. One template with parameters means the two stages cannot drift apart. The main-branch condition on DeployProd lets pull-request runs build and reach Test while never touching Production, and the docs/ path exclusion stops documentation edits from consuming agent minutes."
            ),
          ],
        },
      ],
    },
    {
      slug: "environment-checks-and-approvals",
      objective: "Designing and implementing checks and approvals using YAML-based environments",
      kind: "build",
      title: "Protect a production environment with checks and approvals",
      brief:
        "Cinder Mobile's pipeline now deploys to a Production environment in Azure Pipelines. The release manager sets rules: a named group of two release approvers must approve every production deployment, with 24 hours to do so, and approvers must not approve their own runs; production deployments may only run from the main branch and only from the official pipeline template in the shared templates repository; deployments may happen only Monday to Thursday 09:00-16:00 in the London time zone; only one production deployment may run at a time; and a deployment must not start if any Sev 0 or Sev 1 Azure Monitor alert is active on the production resource group. The developers must not be able to switch any of this off by editing the pipeline YAML. Design the controls.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify each control, where it is configured, and how it behaves.",
          parts: [
            part(
              "Where the controls live",
              "Explains that approvals and checks are configured on the Production environment resource (Environments > Production > Approvals and checks) by the resource's administrators, not in the YAML, so pipeline authors cannot remove them, and that Azure Pipelines pauses before any stage that uses the environment until all checks pass; a terminally failed check skips the stage.",
              "Everything is configured on the Production environment itself (Pipelines > Environments > Production > Approvals and checks) by the environment's administrators. Checks are not in the YAML file, so a developer editing azure-pipelines.yml cannot weaken them, and the same checks apply to every pipeline that targets the environment. Before a stage that uses Production runs, Azure Pipelines pauses until every check completes; if one fails terminally the stage is skipped."
            ),
            part(
              "Approvals",
              "Adds an Approvals check with the release-approvers group as approvers (one member of a group approving is enough unless individuals are listed), sets the timeout to 24 hours after which the stage is marked skipped, disables approving one's own runs, and adds instructions; may mention deferred approval.",
              "Approvals check: approvers = the Release Approvers group (listing the two people individually if both must approve, since a group needs only one member to approve), timeout 1 day -- after which the stage is skipped, not auto-approved -- 'allow approvers to approve their own runs' unticked, and instructions telling approvers what evidence to look at. An approver can defer the approval to a chosen time to hit the change window."
            ),
            part(
              "Branch control and required template",
              "Adds a Branch control check allowing refs/heads/main (with 'verify branch protection' on) and a Required template check pointing at the template file in the shared templates repository, so a run from any other branch or a pipeline not extending the official template fails the check.",
              "Branch control check: allowed branches refs/heads/main, with 'Verify branch protection' enabled so main must also have branch policies. Required template check: the pipeline must extend templates/official-deploy.yml from the shared templates repository. A run from a feature branch, or a pipeline that does not extend the approved template, fails the checks and never reaches Production."
            ),
            part(
              "Business hours, exclusive lock and alert gate",
              "Adds a Business hours check (Monday-Thursday 09:00-16:00, time zone Europe/London), an Exclusive lock check so only one run proceeds at a time (and notes lockBehavior sequential vs runLatest), and a Query Azure Monitor alerts check scoped to the production resource group filtered to severities Sev0 and Sev1, which passes only if no matching alert is active.",
              "Business hours check: Monday to Thursday, 09:00-16:00, time zone (UTC+00:00) Dublin, Edinburgh, Lisbon, London. Exclusive lock check so a second run waits for the first to finish (the pipeline's lockBehavior decides whether queued runs go in sequence or only the latest proceeds). Query Azure Monitor alerts check on the production subscription's service connection, filtered to the production resource group and severities Sev0 and Sev1: it succeeds only when no such alert is active at evaluation time."
            ),
          ],
        },
      ],
    },
    {
      slug: "deployment-strategy-case",
      objective: "Designing a deployment strategy, including blue-green, canary, ring, progressive exposure, feature flags, and A/B testing",
      kind: "case",
      title: "Choose a deployment strategy and recover from a bad release",
      brief:
        "Cinder Mobile's payments-api runs on Azure App Service (Premium plan) in production, deployed by the pipeline from the earlier labs. It serves about 2,000 requests a second. The last two releases caused short outages during deployment, and one release had a bug that affected only customers using a new refunds feature, which took an hour to roll back.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The team's first goal is to stop deployments causing any downtime at all.",
          ask: "Which strategy do you recommend, how is it implemented on App Service, and what are its limits?",
          parts: [
            part(
              "Zero-downtime strategy",
              "Recommends blue-green using deployment slots: deploy to a staging slot, warm it up, then swap into production (swap with preview to validate with production settings), keeping the old version in the other slot for instant rollback by swapping back; notes limits such as database schema changes needing backward compatibility and sticky slot settings.",
              "Blue-green with deployment slots. The pipeline deploys to the staging slot, App Service warms the new instances and then swaps routing so production serves the new build with no restart in front of customers; use swap with preview so the build is checked with production's slot settings first. The previous build now sits in staging, so rollback is a second swap taking seconds. Limits: the database schema must stay compatible with both versions during the overlap, connection strings and settings that differ per slot must be marked as slot settings, and long-running requests on the old instances are abandoned when they recycle."
            ),
          ],
        },
        {
          text: "Deployments are now downtime-free. Next the team wants to limit how many customers a defective release can reach before it is caught.",
          ask: "Recommend how to expose a release progressively and what signals decide whether to continue.",
          parts: [
            part(
              "Progressive exposure",
              "Recommends a canary using slot traffic routing (for example 5-10 percent of production traffic to the new slot) or, in the pipeline, a canary deployment strategy with increments, with health signals -- Application Insights failed-request rate, latency percentiles, and business metrics such as payment success -- compared between canary and baseline in a postRouteTraffic step; rollout continues in rings (internal users, 5 percent, 25 percent, 100 percent) and halts on a signal breach.",
              "Canary via slot traffic routing: after a successful swap-with-preview phase, route 5 percent of production traffic to the new build and watch Application Insights -- failed-request rate, 95th-percentile latency and the payment-success metric -- for the canary versus the baseline. In a deployment job this is the canary strategy with increments [5, 25] and a postRouteTraffic hook that queries the metrics and fails the job if they breach, which runs the on: failure hook to shift traffic back. Rings: internal staff first (0 percent public with ?x-ms-routing-name), then 5, 25, 100 percent."
            ),
          ],
        },
        {
          text: "A canary catches most problems, but the refunds bug came from a feature only some customers use, and an hour-long rollback is still too slow when it is a single feature at fault.",
          ask: "What do you add so a single feature can be turned off without a deployment, and how do you use it to test the feature safely?",
          parts: [
            part(
              "Feature flags",
              "Recommends feature flags managed in Azure App Configuration Feature Manager, with the refunds feature behind a flag the app evaluates at runtime, so it can be disabled in seconds without a deployment; uses targeting filters (percentage or user groups) to expose it to internal users and a small cohort first, and notes flags should be retired once a feature is stable.",
              "Put the refunds feature behind a feature flag in Azure App Configuration's Feature Manager. The API checks the flag at runtime, so disabling refunds is a configuration change that takes effect in seconds, independent of any deployment. Use the Targeting filter to turn it on for internal staff, then a percentage of customers, then everyone -- that separates deploying code from releasing a feature. Remove the flag from the code once the feature is stable so flags do not accumulate."
            ),
            part(
              "A/B testing versus the rest",
              "Distinguishes A/B testing (two variants served to comparable groups to measure a business outcome, usually also implemented with flag variants and telemetry) from canary/ring (same code, gradually widening exposure to detect defects), and says which question each answers.",
              "A/B testing is different: it serves two variants to comparable customer groups to measure which performs better on a business metric (for example refund completion rate), typically with a variant feature flag plus Application Insights telemetry split by variant. A canary or ring rollout exposes one new version to a widening audience to catch defects. Use canaries to ask 'is it broken?' and A/B tests to ask 'is it better?'."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Develop a Security and Compliance Plan (2)
    // ----------------------------------------------------------------------
    {
      slug: "secretless-pipeline-authentication",
      objective: "Implementing and managing secrets and secretless authentication -- for example, workload identity federation/OpenID Connect -- in GitHub Actions and Azure Pipelines",
      kind: "build",
      title: "Make pipeline authentication to Azure secretless",
      brief:
        "Wintermute Analytics, a fictional company, deploys to Azure from two places: an Azure Pipelines project whose Azure Resource Manager service connection uses a service principal with a client secret that expired twice this year, and a GitHub Actions workflow in the repository wintermute/data-platform that logs in with a service-principal JSON secret (AZURE_CREDENTIALS) stored as a repository secret. The security team wants no long-lived cloud credentials stored anywhere, deployments scoped so a compromised test workflow cannot touch production, and a plan for the runtime secrets (database passwords) the deployed apps need. Design the changes for both platforms.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the secretless design for Azure Pipelines, GitHub Actions, scoping and runtime secrets.",
          parts: [
            part(
              "Azure Pipelines",
              "Converts or recreates the Azure Resource Manager service connection to use workload identity federation (automatic app registration, or manual with an app registration or user-assigned managed identity and a federated credential whose issuer and subject Azure DevOps supplies), explaining there is no secret to expire because Azure DevOps presents a short-lived OIDC token that Entra exchanges for an access token; notes the Entra issuer is the current default and connections on the old Azure DevOps issuer must be converted before 1 July 2027.",
              "Replace the secret-based service connection with an Azure Resource Manager connection using Workload identity federation. Automatic creation makes the app registration and federated credential for you; manual lets you use an existing app registration or a user-assigned managed identity, adding a federated credential with the issuer and subject identifier Azure DevOps shows. At run time Azure DevOps presents a short-lived OIDC token that Microsoft Entra exchanges for an Azure token -- nothing stored, nothing to expire. New connections use the Microsoft Entra issuer; any connection still on the legacy Azure DevOps issuer must be converted before those retire on 1 July 2027."
            ),
            part(
              "GitHub Actions",
              "Registers an Entra app (or user-assigned managed identity) with a federated credential for GitHub Actions scoped by subject (for example the production environment), removes AZURE_CREDENTIALS, stores only client-id, tenant-id and subscription-id (non-secret identifiers) and uses azure/login with permissions id-token: write (and contents: read), audience api://AzureADTokenExchange.",
              "Create a federated credential on an Entra app registration (or managed identity) for the GitHub repository wintermute/data-platform, with the subject matching how the workflow runs -- for production, the Production environment. Delete the AZURE_CREDENTIALS secret. The workflow needs:\n\npermissions:\n  id-token: write\n  contents: read\n...\n- uses: azure/login@v2\n  with:\n    client-id: ${{ secrets.AZURE_CLIENT_ID }}\n    tenant-id: ${{ secrets.AZURE_TENANT_ID }}\n    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}\n\nThose three values are identifiers, not credentials; the audience defaults to api://AzureADTokenExchange. GitHub mints a short-lived OIDC token per run, so no long-lived Azure credential is stored in GitHub."
            ),
            part(
              "Scoping production away from test",
              "Uses separate identities per environment: a production identity whose federated credential subject matches only the production environment (or main branch) and whose RBAC role is scoped to the production resource group, and a test identity scoped to test; in Azure Pipelines, separate service connections per environment with pipeline permissions restricted and the production connection used only by stages targeting the protected environment.",
              "One identity per environment. In GitHub, the production app registration's federated credential subject is repo:wintermute/data-platform:environment:Production, so only a job running in the Production environment (with its reviewers) can obtain a token for it, and its role assignment is Contributor on rg-dataplatform-prod only; the test identity has its own credential and Contributor on rg-dataplatform-test. In Azure Pipelines, two service connections with the same split, with the production connection's pipeline permissions limited to the release pipeline and used only in the stage that targets the protected Production environment. A compromised test workflow then holds a token that production refuses."
            ),
            part(
              "Runtime secrets",
              "Keeps application secrets out of pipelines and repositories: apps read them from Azure Key Vault using a managed identity (or Key Vault references in App Service), and the pipeline deploys configuration references rather than values; where a pipeline genuinely needs a secret, it is a Key Vault-backed variable group or GitHub environment secret, masked and short-lived.",
              "Database passwords never pass through the pipeline: the deployed app's managed identity has Key Vault Secrets User on the vault and reads them at start-up, or App Service uses Key Vault references in its settings. Better still, use Entra authentication to the database so there is no password at all. If a pipeline step must have a secret, source it from a Key Vault-linked variable group (Azure Pipelines) or an environment secret (GitHub) so it is masked in logs and rotated in one place."
            ),
          ],
        },
      ],
    },
    {
      slug: "security-scanning-strategy",
      objective: "Designing a strategy for security and compliance scanning, including dependency, code, secret, and licensing scanning",
      kind: "build",
      title: "Design the security and compliance scanning strategy for a monorepo",
      brief:
        "Wintermute Analytics keeps its platform in a GitHub Enterprise Cloud monorepo: a TypeScript web front end, a Python data service, Terraform for infrastructure, and Dockerfiles for both services, built and deployed with GitHub Actions. Requirements: block pull requests that introduce known-vulnerable or copyleft-licensed dependencies; find exploitable code flaws before merge without stalling every PR for an hour; stop secrets being committed; scan the container images before they are pushed to the registry and again while they run; and give the security team a single view of open findings across all repositories. Design the scanning strategy: which tool for each requirement, where in the workflow it runs, what blocks and what only alerts.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the scanning strategy.",
          parts: [
            part(
              "Dependency and licence scanning",
              "Uses Dependabot alerts and security updates for known-vulnerable dependencies across the npm, pip, Terraform provider and Docker base-image ecosystems, and the dependency review action on pull requests to fail the PR when a new dependency has a vulnerability above a chosen severity or a disallowed licence (deny-list of copyleft licences); notes GitHub Code Security provides the premium Dependabot features and dependency review.",
              "Dependabot alerts on for the repository with security updates enabled, so vulnerable npm, pip and Docker base-image dependencies get automatic fix PRs. On every pull request run the dependency review action configured with fail-on-severity high and a deny-licenses list (GPL-2.0, GPL-3.0, AGPL-3.0 and the other copyleft licences the lawyers name): a PR that adds a vulnerable or copyleft dependency fails the check and cannot merge. Dependency review and the premium Dependabot features come with GitHub Code Security."
            ),
            part(
              "Code scanning",
              "Enables code scanning with CodeQL for the TypeScript and Python code (default setup or a workflow) running on pull requests to main with results as PR checks, plus a scheduled full analysis; blocks merge on high or critical alerts via a required status check; and adds infrastructure-as-code scanning for Terraform (a third-party SARIF-producing scanner uploaded to code scanning).",
              "Code scanning with CodeQL on the TypeScript and Python languages: analysis runs on pull requests targeting main and reports as a check, with the branch protection rule requiring the code scanning results check and the alert threshold set to block on errors (high/critical) while warnings only annotate the PR. A scheduled weekly run on main covers queries too slow for every PR. Terraform gets an IaC scanner (for example one that emits SARIF) whose results upload into the same code scanning alerts view."
            ),
            part(
              "Secret scanning",
              "Enables secret scanning with push protection at the organisation level (blocks pushes containing detected secrets, with a documented bypass that is logged) and keeps alerting for existing or custom patterns; notes this is GitHub Secret Protection.",
              "Secret scanning with push protection enabled for the whole organisation, so a push containing a recognised credential is rejected at the Git push and the developer fixes it locally; bypasses are possible but recorded and reviewed. Alerts stay on for patterns that were already present and for custom patterns (internal token formats). This is the GitHub Secret Protection product."
            ),
            part(
              "Container scanning",
              "Scans the built images in the workflow before pushing (a container image scanner such as Trivy or the Microsoft Defender for Cloud container scanning step, failing on high/critical) and relies on Microsoft Defender for Containers / Defender for Cloud to scan images in Azure Container Registry and running workloads continuously; CodeQL can also run inside a container for build-in-container services.",
              "In the build workflow, after docker build and before docker push, run an image scanner (Trivy, or the Microsoft Security DevOps action) against the image and fail the job on high or critical findings so a vulnerable image never reaches the registry. Once pushed, Microsoft Defender for Containers scans the Azure Container Registry images and the running workloads continuously, so a CVE disclosed after the push still raises a finding. For the Python service built inside a container, the CodeQL analysis can run inside that container so it sees the real dependencies."
            ),
            part(
              "Single view and what blocks",
              "Uses the GitHub security overview at organisation level (and Microsoft Defender for Cloud DevOps security to bring GitHub findings alongside Azure posture) for the security team's view; states the policy: PR-blocking for vulnerable/copyleft dependencies, high/critical code findings, secrets and high/critical image findings; alert-only for low/medium code and dependency findings and for runtime container findings, with SLAs.",
              "The security overview at the organisation level is the single view of code, secret and dependency alerts across all repositories; connecting GitHub to Microsoft Defender for Cloud (DevOps security) shows those same findings next to the Azure resource posture. Blocking: new vulnerable or copyleft dependencies, high/critical CodeQL alerts, any detected secret, high/critical image findings before push. Alert-only with a fix SLA: medium and low findings, existing Dependabot alerts, and runtime container findings from Defender."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Implement an Instrumentation Strategy (1)
    // ----------------------------------------------------------------------
    {
      slug: "kql-for-an-incident",
      objective: "Interrogating logs using basic Kusto Query Language (KQL) queries",
      kind: "build",
      title: "Write the KQL queries for a production incident",
      brief:
        "Wintermute Analytics' web API reports to a workspace-based Application Insights resource (its data lives in a Log Analytics workspace in tables such as AppRequests, AppExceptions and AppDependencies). At 14:10 customers reported errors; by 14:40 things seemed normal. The on-call engineer must answer four questions from the logs: how did the failed-request rate change over the last four hours, in five-minute buckets; which operations failed most during the incident window; which exception types were thrown most and by which operations; and were the database dependency calls slower than usual during the window (95th-percentile duration before versus during). Write the four KQL queries and note what each column means.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the four queries.",
          parts: [
            part(
              "Failed-request rate over time",
              "Queries AppRequests with TimeGenerated > ago(4h), summarises total and failed counts (Success == false, weighted by ItemCount or count()) by bin(TimeGenerated, 5m), computes a failure percentage, and renders a timechart.",
              "AppRequests\n| where TimeGenerated > ago(4h)\n| summarize total = sum(ItemCount), failed = sumif(ItemCount, Success == false) by bin(TimeGenerated, 5m)\n| extend failedPct = round(100.0 * failed / total, 2)\n| project TimeGenerated, failedPct, total\n| render timechart\n\nItemCount accounts for sampled telemetry; Success is the request's success flag; bin() groups into five-minute buckets."
            ),
            part(
              "Failed operations in the window",
              "Queries AppRequests between the incident times (TimeGenerated between (datetime(...) .. datetime(...))) where Success == false, summarises counts by Name (or OperationName) and ResultCode, and takes the top N.",
              "AppRequests\n| where TimeGenerated between (datetime(2026-11-07 14:05) .. datetime(2026-11-07 14:45))\n| where Success == false\n| summarize failures = sum(ItemCount) by Name, ResultCode\n| top 10 by failures desc\n\nName is the operation (route) name and ResultCode the HTTP status the API returned; summarising by both shows whether one route threw 500s or many routes threw 503s."
            ),
            part(
              "Exceptions by type and operation",
              "Queries AppExceptions in the window, summarises by ExceptionType (and OperationName or ProblemId), orders descending; may join to AppRequests on OperationId to tie exceptions to requests.",
              "AppExceptions\n| where TimeGenerated between (datetime(2026-11-07 14:05) .. datetime(2026-11-07 14:45))\n| summarize count = sum(ItemCount) by ExceptionType, OperationName\n| order by count desc\n\nExceptionType is the thrown type (for example SqlException), OperationName the request that was executing. To see the exact requests, join AppRequests on OperationId, which correlates all telemetry from one operation."
            ),
            part(
              "Dependency latency before versus during",
              "Queries AppDependencies filtered to the SQL dependency type, labels rows as before or during the window with a case()/iff() on TimeGenerated, and summarises percentiles(DurationMs, 50, 95) by that label (and Target), so the two periods can be compared.",
              "AppDependencies\n| where TimeGenerated > ago(4h)\n| where DependencyType == 'SQL'\n| extend period = iff(TimeGenerated between (datetime(2026-11-07 14:05) .. datetime(2026-11-07 14:45)), 'during', 'before')\n| summarize p50 = percentile(DurationMs, 50), p95 = percentile(DurationMs, 95), calls = sum(ItemCount) by period, Target\n| order by Target asc, period asc\n\nDurationMs is the dependency call time, Target the database server; comparing p95 during against before shows whether the database slowed down or the failures came from elsewhere."
            ),
          ],
        },
      ],
    },
  ],
};
