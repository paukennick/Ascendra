import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-154: AWS Certified DevOps Engineer - Professional (DOP-C02).
//
// Aligned to the DOP-C02 exam guide's six domains (SDLC Automation 22%,
// Configuration Management and IaC 17%, Resilient Cloud Solutions 15%,
// Monitoring and Logging 15%, Incident and Event Response 14%, Security and
// Compliance 17%; 65 scored + 10 unscored questions, pass 750; checked
// 2026-11-07):
//   https://docs.aws.amazon.com/aws-certification/latest/devops-engineer-professional-02/devops-engineer-professional-02.html
// Density (docs/labs.md, policy "hybrid"): six units, so one per unit plus
// six extras -> 2 per unit, 12 labs (the labs.test.ts density check).
// Professional depth: multi-account, automated, with rollback and evidence.
//
// Figures, each read on the named AWS documentation page on 2026-11-07:
//   - CodeDeploy predefined deployment configurations (Lambda:
//     LambdaCanary10Percent5Minutes, LambdaLinear10PercentEvery1Minute,
//     LambdaAllAtOnce and the rest; ECS: ECSCanary10Percent5Minutes,
//     ECSLinear10PercentEvery1Minutes, ECSAllAtOnce; EC2: OneAtATime,
//     HalfAtATime, AllAtOnce; an NLB only supports ECSAllAtOnce):
//     https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html
//   - CloudWatch Logs quotas (5 subscription filters per log group; 100
//     metric filters per log group):
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/cloudwatch_limits_cwl.html
//   - Systems Manager Automation runbooks used by name:
//     https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-disablepublicaccessforsecuritygroup.html
//     https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-block-public-s3-bucket.html
//   - DynamoDB per-partition limits (3,000 RCU / 1,000 WCU) for the RCA case:
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
// Everything else is long-stable behaviour (CloudFormation StackSets
// permission models, Patch Manager baselines and patch groups, IAM
// permissions boundaries, Security Hub central configuration, EC2 Auto
// Scaling warm pools and target tracking, X-Ray service map).

export const AWSDOP_LABS: SeedLabSet = {
  trackCode: "AWSDOP",
  sources: [
    source("https://docs.aws.amazon.com/aws-certification/latest/devops-engineer-professional-02/devops-engineer-professional-02.html", "exam_outline", "2026-11-07"),
    source("https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/cloudwatch_limits_cwl.html", "cloud_pricing_limits", "2026-11-07"),
    source("https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-disablepublicaccessforsecuritygroup.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-block-public-s3-bucket.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Domain 1: SDLC Automation (2)
    // ----------------------------------------------------------------------
    {
      slug: "canary-release-with-rollback",
      objective: "Using blue/green and canary deployment methods",
      kind: "build",
      title: "Design a canary release with automatic rollback for two services",
      brief:
        "Northgate Tickets releases two services every day. The checkout API is an AWS Lambda function behind API Gateway, invoked through an alias named live. The seat-map service runs on Amazon ECS (Fargate) behind an Application Load Balancer. Last month a bad checkout release took 100% of traffic for 20 minutes before anyone noticed; the business now requires that a release first serve a small share of production traffic, that a rise in errors rolls it back without a person, and that the ECS release can be tested on a private port before any customer sees it. Write the deployment design using AWS CodeDeploy.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the deployment configuration for both services.",
          parts: [
            part(
              "Lambda canary",
              "Deploys the function through CodeDeploy's Lambda platform with a canary configuration (for example CodeDeployDefault.LambdaCanary10Percent5Minutes: 10% of traffic to the new version, the remaining 90% after five minutes) or a linear one (LambdaLinear10PercentEvery1Minute), shifting the live alias's weights between versions.",
              "Publish a new function version and let CodeDeploy shift the live alias: deployment config CodeDeployDefault.LambdaCanary10Percent5Minutes sends 10% of invocations to the new version for five minutes, then the other 90%. (LambdaLinear10PercentEvery1Minute is the alternative if a gradual ramp is preferred.) API Gateway keeps pointing at the alias, so nothing upstream changes."
            ),
            part(
              "Automatic rollback",
              "Attaches CloudWatch alarms (for example on the new version's Errors or a latency percentile, using the alias/version dimensions) to the deployment group with rollback on alarm, plus rollback on deployment failure, and adds pre/post traffic hooks (Lambda validation functions) in the AppSpec.",
              "In the deployment group, enable 'roll back when a CloudWatch alarm is in ALARM' with alarms on the new version's Errors and p99 Duration (version-qualified metrics), and 'roll back on failure'. Add BeforeAllowTraffic and AfterAllowTraffic hook functions in the AppSpec that run smoke tests; a failing hook also fails and rolls back the deployment."
            ),
            part(
              "ECS blue/green with a test listener",
              "Uses CodeDeploy's ECS blue/green deployment: two target groups behind the ALB, a production listener (443) and a test listener (for example 8443) that points at the green task set first, so tests run against green before traffic shifts; then shifts with a canary or linear configuration (ECSCanary10Percent5Minutes or ECSLinear10PercentEvery1Minutes) and notes that with a Network Load Balancer only ECSAllAtOnce is supported.",
              "ECS blue/green: the ALB has two target groups (blue, green), a production listener on 443 and a test listener on 8443. CodeDeploy starts the green task set, attaches it to the test listener, runs the AfterAllowTestTraffic hook (integration tests against :8443), then shifts production traffic with CodeDeployDefault.ECSCanary10Percent5Minutes. If the service were behind an NLB, only CodeDeployDefault.ECSAllAtOnce would be available, so the ALB matters here."
            ),
            part(
              "What to watch and when blue goes away",
              "Alarms on the green target group's HTTP 5xx / unhealthy host count drive rollback; keeps the blue task set for a termination wait (for example 30-60 minutes) so a late-found problem can be reverted by swapping listeners back instantly.",
              "Rollback alarms: HTTPCode_Target_5XX_Count and UnHealthyHostCount on the green target group. Set the original (blue) task set's termination wait to about an hour rather than terminating immediately: during that window a revert is just re-pointing the production listener at blue, with no redeploy."
            ),
          ],
        },
      ],
    },
    {
      slug: "failed-ec2-deployment-case",
      objective: "Troubleshooting deployment issues",
      kind: "case",
      title: "Debug a CodeDeploy release that keeps failing on EC2",
      brief:
        "Harlow Parcel's order service is deployed to an Auto Scaling group of EC2 instances by AWS CodePipeline -> CodeBuild -> CodeDeploy (in-place, CodeDeployDefault.OneAtATime). The latest release has failed three times and the on-call engineer has been re-running it. You take over the incident.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The deployment's event list shows every instance in the group with status Failed and the error 'The deployment failed because no instances were found for your deployment group' is NOT present. Instead each instance shows no lifecycle events at all and the message says the CodeDeploy agent did not respond within the timeout.",
          ask: "What does 'no lifecycle events, agent did not respond' point to, and what do you check first?",
          parts: [
            part(
              "Diagnosis",
              "Identifies that the CodeDeploy agent on the instances is not running, not installed, or cannot reach the CodeDeploy endpoint (instance profile missing or no network path), because lifecycle events are only reported once the agent polls for the deployment.",
              "Lifecycle events come from the agent. None at all means the agent never picked up the deployment: it is not installed or not running on the new AMI, or the instance cannot talk to CodeDeploy (no instance profile with the CodeDeploy/S3 permissions it needs, or no outbound path to the service endpoint)."
            ),
            part(
              "Checks",
              "Checks the agent service status and log on an instance (/var/log/aws/codedeploy-agent/codedeploy-agent.log), confirms the instance profile is attached and allows s3:GetObject on the artifact bucket, and confirms outbound HTTPS to CodeDeploy (NAT or VPC endpoint).",
              "On an instance: systemctl status codedeploy-agent and the agent log under /var/log/aws/codedeploy-agent/. Confirm the launch template attaches an instance profile that allows reading the revision from the artifact bucket, and that the subnet has a route to the internet or a CodeDeploy VPC endpoint. The deployment-group's instances are picked by ASG membership, so tags are not the issue here."
            ),
          ],
        },
        {
          text: "The agent was missing from a new golden AMI. After adding it to the AMI and refreshing the instances, the deployment reaches each instance but fails at the AfterInstall lifecycle event: 'Script at specified location: scripts/migrate.sh run as user root failed with exit code 1'.",
          ask: "Where do you look, and how do you make this failure safe for the fleet?",
          parts: [
            part(
              "Finding the cause",
              "Reads the script's output in the deployment's event details (and the agent's deployment logs under /opt/codedeploy-agent/deployment-root/<deployment-group-id>/<deployment-id>/logs/scripts.log) to see why migrate.sh exited 1, checks the AppSpec hooks section (runas, timeout, file paths relative to the bundle).",
              "Open the failed AfterInstall event's log in the console, or scripts.log in /opt/codedeploy-agent/deployment-root/<group-id>/<deployment-id>/logs/ on the instance, for the script's stderr. Verify in appspec.yml that the hook's location is correct relative to the bundle root, that runas and timeout are sensible, and that the script is executable."
            ),
            part(
              "Making it safe",
              "Points out that OneAtATime stops on the first failure (so the fleet is protected) and configures automatic rollback on failure so the failed instance is restored to the last good revision; moves the database migration out of a per-instance hook (it should run once, for example in the pipeline before deployment, or guarded to be idempotent) so a fleet deployment does not run it N times.",
              "OneAtATime halts after the first failed instance, which is why only one is affected; enable rollback on failure so that instance is redeployed with the previous revision automatically. A database migration should not run on every instance's AfterInstall: run it once as a pipeline stage (CodeBuild) before the CodeDeploy action, or make the script idempotent and gate it so only one instance performs it."
            ),
          ],
        },
        {
          text: "The release now deploys. Twenty minutes later the ALB reports 30% of requests failing, but CodeDeploy marked the deployment Succeeded because ValidateService only checked that the process was running.",
          ask: "How do you make the deployment detect this and roll back by itself next time?",
          parts: [
            part(
              "Deployment-time validation",
              "Strengthens the ValidateService hook to perform a real health check (call the service's health endpoint, run a smoke test) and sets the deployment group's rollback on alarm with CloudWatch alarms on the target group's HTTP 5xx rate / unhealthy hosts, plus a blue/green or canary approach so the bad version never takes 100% of traffic.",
              "ValidateService should curl the local health endpoint and fail on a non-200 or on a failed smoke request, not just check the PID. Add 'roll back when alarm' to the deployment group with an alarm on the target group's HTTPCode_Target_5XX_Count and UnHealthyHostCount. Better still, switch the group to blue/green with a canary configuration so a bad build is caught at 10% of traffic and rolled back without the fleet being touched."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 2: Configuration Management and IaC (2)
    // ----------------------------------------------------------------------
    {
      slug: "stacksets-org-baseline",
      objective: "Applying CloudFormation StackSets across multiple accounts and Regions",
      kind: "build",
      title: "Roll out a security baseline to every account with StackSets",
      brief:
        "Fenwick Robotics has an AWS Organization with 48 accounts under three OUs (Workloads, Sandbox, Infrastructure) and adds two or three accounts a month. A CloudFormation template (baseline.yaml) creates a CloudTrail trail, an AWS Config recorder with delivery to a central bucket, and a set of IAM roles. It must exist in every account in us-east-1 and eu-west-1, be applied automatically to new accounts, and be rolled out carefully so a bad template version cannot break all 48 accounts at once. Write the StackSets design.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the StackSets design.",
          parts: [
            part(
              "Permission model",
              "Uses service-managed permissions (trusted access between CloudFormation StackSets and AWS Organizations), created from the management account or a delegated administrator, so no per-account execution roles have to be created; contrasts with self-managed permissions where each target needs an AWSCloudFormationStackSetExecutionRole.",
              "Create the stack set with service-managed permissions after enabling trusted access for StackSets in Organizations, from the management account or (better) a delegated administrator account for StackSets. CloudFormation then assumes roles it manages in each target; with self-managed permissions you would have to pre-create an administration role and an execution role in all 48 accounts."
            ),
            part(
              "Targets and automatic deployment",
              "Targets the three OUs (not account lists) in both Regions and turns on automatic deployment so accounts added to an OU receive the stack and accounts removed have it retained or deleted per policy.",
              "Deployment targets: the Workloads, Sandbox and Infrastructure OUs, Regions us-east-1 and eu-west-1. Enable automatic deployment so any account joining those OUs gets the baseline without a ticket; set 'retain stacks on account removal' according to whether a leaving account should keep its trail (usually yes)."
            ),
            part(
              "Safe rollout",
              "Sets operation preferences: Region concurrency sequential (one Region first), a small maximum concurrent count or percentage, and a low failure tolerance so the operation stops early; tests template changes against the Sandbox OU first (or uses a separate stack set for Sandbox).",
              "Operation preferences: Region concurrency = Sequential (eu-west-1 first, then us-east-1), MaxConcurrentPercentage around 10%, FailureToleranceCount 0 or 1, so a bad version stops after the first failures rather than reaching 48 accounts. Deploy each template change to the Sandbox OU targets before the others (or keep Sandbox in its own stack set that always goes first)."
            ),
            part(
              "Drift and template hygiene",
              "Runs stack set drift detection to find accounts where someone changed the baseline by hand and re-applies via an update; parameterizes the template with Region/account-aware values (for example pseudo parameters, SSM parameters) rather than hardcoding bucket names or ARNs.",
              "Schedule drift detection on the stack set and treat drifted instances as findings to remediate with an update operation. In the template, use AWS::AccountId / AWS::Region pseudo parameters and SSM parameter references for the central bucket name and KMS key so one template works in every account and Region."
            ),
          ],
        },
      ],
    },
    {
      slug: "patch-compliance-at-scale",
      objective: "Automating system inventory, configuration, and patch management with Systems Manager and AWS Config",
      kind: "build",
      title: "Automate patching and prove compliance for a mixed fleet",
      brief:
        "Lowick Media runs 600 EC2 instances across four accounts: Amazon Linux 2023 web servers, Windows Server application hosts and a few Ubuntu build agents. Security requires critical and important OS patches within 7 days of release, patch windows that do not overlap peak hours (web servers 02:00-04:00, Windows 04:00-06:00, local time), a monthly compliance report per account, and an alert when any instance is non-compliant for more than 7 days. No one may SSH in to patch by hand. Design the automation.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the patch management design.",
          parts: [
            part(
              "Prerequisites",
              "Makes every instance a managed node: SSM Agent installed and running, an instance profile with the AmazonSSMManagedInstanceCore policy (or Default Host Management Configuration), and network reachability to the Systems Manager endpoints (NAT or VPC endpoints ssm, ssmmessages, ec2messages); inventory collection turned on.",
              "All instances need SSM Agent and an instance profile that includes AmazonSSMManagedInstanceCore (or enable Default Host Management Configuration), plus a path to the ssm, ssmmessages and ec2messages endpoints (interface VPC endpoints for private subnets). Turn on Systems Manager Inventory so installed software and patch state are collected centrally."
            ),
            part(
              "Patch baselines and groups",
              "Creates patch baselines per OS (Amazon Linux 2023, Windows Server, Ubuntu) with auto-approval rules for Critical/Important (or Security) classifications after 0-7 days, and assigns instances by the Patch Group tag (or uses a Quick Setup patch policy across the organization).",
              "Three custom baselines: Amazon Linux 2023 and Ubuntu approving Security/Critical and Important updates 3 days after release; Windows approving CriticalUpdates and SecurityUpdates with severity Critical/Important after 3 days. Tag instances Patch Group = web, app-windows, build and register each group with its baseline -- or use a Quick Setup patch policy from the management account to push the same configuration to all four accounts."
            ),
            part(
              "Scheduling",
              "Creates maintenance windows per group on cron/rate schedules in the right time zone (web 02:00-04:00, Windows 04:00-06:00) that run the AWS-RunPatchBaseline document with Operation=Install (and Scan daily), with concurrency and error thresholds so a bad patch stops early.",
              "Maintenance window mw-web: cron(0 2 ? * SUN *) in the site's time zone, 2-hour duration, target Patch Group = web, task AWS-RunPatchBaseline Operation=Install, RebootOption=RebootIfNeeded, concurrency 10%, error threshold 5%. mw-windows at 04:00 likewise. A daily Scan task (or the patch policy's scan schedule) keeps compliance data fresh between install windows."
            ),
            part(
              "Compliance, reporting and alerting",
              "Uses Patch Manager compliance (Systems Manager Compliance / Explorer across accounts), an AWS Config managed rule such as ec2-managedinstance-patch-compliance-status-check for a per-account compliance view, exports the compliance data (resource data sync to S3 and Athena/QuickSight) for the monthly report, and alerts via EventBridge/SNS on instances non-compliant beyond the SLA.",
              "Compliance comes from Patch Manager and is visible across the four accounts in Systems Manager Explorer; the Config rule ec2-managedinstance-patch-compliance-status-check marks each instance compliant or not in each account. A resource data sync to a central S3 bucket feeds Athena and a monthly QuickSight report. An EventBridge rule on Config compliance change (NON_COMPLIANT) starts a Lambda that checks the age and publishes to SNS when an instance has been non-compliant for more than 7 days."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 3: Resilient Cloud Solutions (2)
    // ----------------------------------------------------------------------
    {
      slug: "multi-region-active-active-design",
      objective: "Enabling cross-Region capabilities where they exist: Amazon DynamoDB, Amazon RDS, Amazon Route 53, Amazon S3, Amazon CloudFront",
      kind: "build",
      title: "Design a two-Region active-active deployment for a ticketing API",
      brief:
        "Cobalt Events sells tickets worldwide. Its API runs on ECS Fargate behind an ALB in us-east-1 with a DynamoDB table for orders, an Aurora PostgreSQL cluster for the event catalog, and media in S3 served by CloudFront. A Region-wide outage last year cost a weekend of sales. The business wants both us-east-1 and eu-west-1 to serve traffic at the same time, users routed to the nearer healthy Region, and no Region to be a single point of failure for data. Write the cross-Region design, naming the capability used for each component and its consistency trade-off.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the multi-Region design.",
          parts: [
            part(
              "Orders (DynamoDB)",
              "Uses DynamoDB global tables (multi-Region replica tables, both writable) and explains the trade-off: replication is asynchronous and conflicts resolve last-writer-wins, so the application must tolerate eventual consistency across Regions (for example by idempotent order ids and Region-local reads).",
              "Make the orders table a global table with replicas in us-east-1 and eu-west-1; both accept writes. Replication is asynchronous (typically about a second) with last-writer-wins on conflict, so order ids are generated to be globally unique and a user's session is kept in one Region so their own writes read back consistently."
            ),
            part(
              "Catalog (Aurora)",
              "Uses Aurora Global Database with a primary in one Region and a secondary cluster in the other for reads, noting only the primary accepts writes (or write forwarding from the secondary), so catalog writes are routed to the primary and the secondary is promoted (managed failover or switchover) if the primary Region fails.",
              "Aurora Global Database: primary cluster in us-east-1, secondary in eu-west-1 serving local reads with sub-second replication lag. Only the primary accepts writes; the EU API sends catalog writes to the primary (or uses write forwarding). On a us-east-1 failure, perform a managed failover to promote eu-west-1; for planned maintenance use a switchover with no data loss."
            ),
            part(
              "Media (S3 and CloudFront)",
              "Uses S3 Cross-Region Replication between buckets in the two Regions (versioning on, replication role) and a CloudFront distribution with an origin group (primary origin plus failover origin on 5xx/timeouts) or a multi-Region access point, so media stays available if one Region's bucket is unreachable.",
              "Two versioned buckets with S3 Cross-Region Replication both ways (or an S3 Multi-Region Access Point in front of them). CloudFront uses an origin group: primary origin the us-east-1 bucket, failover origin the eu-west-1 bucket, failing over on 500/502/503/504 responses. Users see the same distribution regardless of which bucket serves."
            ),
            part(
              "Routing users",
              "Uses Route 53 latency-based (or geolocation) records for the two ALBs with health checks on each Region's endpoint so an unhealthy Region is pulled from DNS, and notes Amazon Application Recovery Controller routing controls as the way to fail over deliberately without depending on health-check detection; mentions low TTLs.",
              "Route 53 latency records for api.cobalt.example pointing at the two ALBs, each with a health check against a deep health endpoint, TTL 60 seconds, so a failing Region is dropped automatically. For controlled, operator-driven failover (and to avoid a flapping health check), put the records behind Application Recovery Controller routing controls that the on-call can flip."
            ),
          ],
        },
      ],
    },
    {
      slug: "scaling-issues-case",
      objective: "Identifying and remediating scaling issues",
      kind: "case",
      title: "Fix an Auto Scaling group that cannot keep up",
      brief:
        "Glendale Streaming's web tier is an EC2 Auto Scaling group (min 4, max 40) behind an ALB, with a simple scaling policy: add 2 instances when average CPU exceeds 70% for 5 minutes, with a 300-second cooldown. Every evening at 20:00 a surge begins and for 15 minutes users see errors and slow pages. The instances take about 6 minutes from launch to passing health checks because they install packages on boot.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Metrics show CPU reaching 70% at 20:02, the first two instances launching at 20:07, becoming healthy at 20:13, and the next scale-out only starting after the cooldown. By 20:20 the group has 10 instances and the errors stop.",
          ask: "Why is the group too slow, and what do you change in the scaling policy?",
          parts: [
            part(
              "Why it is slow",
              "Explains that simple scaling adds a fixed step, waits out a cooldown before the next action, and reacts to a 5-minute breach, while each instance takes 6 minutes to be useful -- so capacity trails demand by 10-15 minutes; CPU is also a lagging, indirect signal of request load.",
              "Simple scaling reacts only after a 5-minute breach, adds a fixed 2 instances, then waits 300 seconds before doing anything else -- and each new instance needs 6 more minutes before it serves. Capacity arrives in small steps 10-15 minutes behind demand, and CPU lags the real driver, which is request volume."
            ),
            part(
              "Policy change",
              "Replaces simple scaling with target tracking (for example ALBRequestCountPerTarget at a value the instances handle comfortably, or average CPU at 50%) so the group computes the capacity needed in one step; sets the instance warm-up so new instances are not counted in metrics until ready; optionally adds a step scaling policy with larger steps for big breaches.",
              "Switch to a target tracking policy on ALBRequestCountPerTarget (say 800 requests per target per minute, measured from a load test) or average CPU 50%. Target tracking scales proportionally to how far the metric is from target, so a surge adds many instances in one action instead of two at a time. Set the default instance warm-up to about 360 seconds so instances joining do not drag the average down or trigger extra scale-outs."
            ),
          ],
        },
        {
          text: "With target tracking the group now adds enough instances, but they still take 6 minutes to be useful, and the surge is predictable at 20:00 every day.",
          ask: "How do you remove the 6-minute gap?",
          parts: [
            part(
              "Readiness and pre-warming",
              "Uses a scheduled scaling action (or predictive scaling) to raise desired/minimum capacity before 20:00, and a warm pool of pre-initialized stopped or running instances so scale-out takes seconds; longer term, bakes the packages into the AMI (EC2 Image Builder) so boot time drops.",
              "Add a scheduled action at 19:45 raising the minimum to the typical evening capacity (or enable predictive scaling, which learns the daily pattern and launches ahead of it). Add a warm pool so pre-initialized instances in Stopped state join in well under a minute. And fix the root cause: bake the packages into the AMI with EC2 Image Builder so a cold launch no longer installs anything."
            ),
          ],
        },
        {
          text: "Scaling is now ahead of demand, but at peak the ALB shows HTTP 503s from the targets even though the instances' CPU is only 40%. The application connects to a single RDS instance, and database connections are maxed out.",
          ask: "What is the bottleneck now, and how do you fix scaling end to end?",
          parts: [
            part(
              "Bottleneck beyond the web tier",
              "Identifies the database connection limit as the constraint (each new instance opens more connections, so scaling the web tier makes it worse) and addresses it with RDS Proxy (connection pooling and multiplexing), a read replica for read traffic, and caching (ElastiCache) for hot reads; notes the scaling metric must track the real constraint.",
              "The web tier scaled fine; the database's connection limit did not. Put Amazon RDS Proxy between the application and the database to pool and share connections, move read traffic to a read replica, and cache hot catalog reads in ElastiCache. Then scaling the web tier no longer multiplies database connections, and the 503s stop."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 4: Monitoring and Logging (2)
    // ----------------------------------------------------------------------
    {
      slug: "metric-filter-alarm-from-logs",
      objective: "Creating CloudWatch metrics from log events with metric filters",
      kind: "build",
      title: "Turn application log lines into metrics and a sensible alarm",
      brief:
        "Pinecrest Payments' API writes JSON log lines to the CloudWatch Logs group /pinecrest/api, for example {\"level\":\"ERROR\",\"route\":\"/charge\",\"latencyMs\":1840,\"code\":\"GATEWAY_TIMEOUT\"}. Operations want (1) a metric counting ERROR-level lines for the /charge route; (2) a metric for request latency so they can alarm on the p99; (3) an alarm that pages only when the error rate is sustained, not on a single blip, and that behaves sensibly overnight when traffic is near zero and no log lines arrive. Write the metric filters and the alarm.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the metric filters and alarm configuration.",
          parts: [
            part(
              "Error count filter",
              "Writes a JSON metric filter pattern such as { $.level = \"ERROR\" && $.route = \"/charge\" } with metric value 1, a custom namespace (for example Pinecrest/API), and a default value of 0 so periods with no matches are published as zero.",
              'Filter pattern: { $.level = "ERROR" && $.route = "/charge" }. Metric: namespace Pinecrest/API, name ChargeErrors, metric value 1, default value 0 (so a minute with no matching lines publishes 0 instead of nothing). Optionally add a dimension from the log, for example code from $.code, keeping dimension cardinality small.'
            ),
            part(
              "Latency metric",
              "Writes a second filter matching request lines and publishing the numeric field as the metric value ({ $.latencyMs = * } with metric value $.latencyMs, unit Milliseconds) so CloudWatch can compute percentiles such as p99 on it.",
              'Filter pattern: { $.route = "/charge" && $.latencyMs = * }. Metric: ChargeLatency, metric value $.latencyMs, unit Milliseconds. Because every request publishes a sample, CloudWatch statistics include p99, which the dashboard and alarm can use.'
            ),
            part(
              "Sustained error alarm",
              "Alarms on the error rate using metric math (ChargeErrors / ChargeRequests * 100) rather than a raw count, with a period of 1 minute and 'M out of N' datapoints (for example 3 of 5) so a single spike does not page, and sends to an SNS topic.",
              "Add a ChargeRequests filter (count of all /charge lines), then an alarm on the metric math expression errors / requests * 100 > 5, period 60 seconds, 3 of 5 datapoints to alarm, action: SNS topic to the pager. A single bad minute does not page; three bad minutes in five do."
            ),
            part(
              "Missing data overnight",
              "Sets the alarm's missing-data treatment deliberately (notBreaching for the rate alarm when no requests arrive overnight, or uses the default value 0 on the filters) and explains the options (missing, notBreaching, breaching, ignore); avoids a 'breaching on missing' that would page at 03:00 for no traffic.",
              "Treat missing data as notBreaching on the error-rate alarm (and the filters' default value 0 means the count metrics still publish). The choices are missing (default), notBreaching, breaching and ignore; breaching would page every quiet night, and 'missing' leaves the alarm in INSUFFICIENT_DATA. A separate, lower-priority alarm on the absence of ChargeRequests can detect a dead service without paging on expected quiet."
            ),
          ],
        },
      ],
    },
    {
      slug: "centralised-logging-multi-account",
      objective: "Processing log data with CloudWatch Logs subscriptions into Amazon Kinesis, Lambda, or Amazon OpenSearch Service",
      kind: "build",
      title: "Centralize logs from forty accounts into one searchable store",
      brief:
        "Rydal Software has 40 member accounts, each with hundreds of CloudWatch Logs groups (Lambda, ECS, application logs). Security wants a copy of every log line in a single logging account within about a minute of being written, searchable for 90 days in Amazon OpenSearch Service and retained for 7 years in S3 at the lowest cost. Application teams must keep their own log groups unchanged, and new log groups must be picked up without a ticket. Design the pipeline.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the centralized logging design.",
          parts: [
            part(
              "Cross-account transport",
              "Creates a CloudWatch Logs destination in the logging account backed by a Kinesis Data Stream (or Firehose), with a destination access policy allowing the member accounts (or the organization via aws:PrincipalOrgID) to subscribe; member log groups get subscription filters pointing at the destination ARN.",
              "In the logging account: a Kinesis Data Stream, an IAM role CloudWatch Logs can assume to put records into it, and a CloudWatch Logs destination wrapping the stream with a destination policy that allows logs:PutSubscriptionFilter from the organization's accounts (condition aws:PrincipalOrgID). In each member account, a subscription filter on each log group targets the destination ARN; the data arrives in the logging account's stream within seconds."
            ),
            part(
              "Automatic coverage of new log groups",
              "Automates subscription creation: an EventBridge rule on CloudTrail CreateLogGroup events (or an account-level subscription filter where available) triggers a Lambda that adds the subscription filter; notes the per-log-group subscription filter quota (5) so the design uses one filter per group.",
              "An EventBridge rule in each member account matching the CloudTrail event CreateLogGroup invokes a Lambda that calls PutSubscriptionFilter on the new group with the central destination (deployed everywhere by StackSets). Each log group gets exactly one filter for this purpose; the quota is 5 subscription filters per log group, so leave room for teams' own filters."
            ),
            part(
              "Hot search and cold archive",
              "Consumes the stream with Amazon Data Firehose (or Lambda) delivering to OpenSearch Service with an index-per-day and a 90-day index lifecycle, and in parallel to S3 (Firehose can deliver to S3 as backup/all documents) with a lifecycle rule moving objects to Glacier Deep Archive and expiring at 7 years; decompresses the gzip-compressed subscription records in a Firehose transformation.",
              "Firehose reads the stream, runs a transformation Lambda (subscription records arrive gzip-compressed and wrapped; unpack and normalize them), and delivers to the OpenSearch domain with daily indices managed by Index State Management to delete after 90 days, while also delivering all records to S3 (Parquet via record format conversion). The S3 bucket's lifecycle transitions to Glacier Deep Archive after 90 days and expires at 7 years."
            ),
            part(
              "Security of the pipeline",
              "Encrypts the stream, the S3 bucket and the OpenSearch domain with KMS, denies writes to the archive bucket except from the delivery role (and uses Object Lock if tamper-evidence is required), and gives security analysts read-only access through fine-grained OpenSearch roles.",
              "KMS encryption on the Kinesis stream, Firehose, the S3 bucket and the OpenSearch domain. The archive bucket's policy allows s3:PutObject only from the Firehose role and nothing may delete; turn on S3 Object Lock in compliance mode if the auditors need immutability. OpenSearch fine-grained access control gives analysts read-only roles mapped to IAM Identity Center groups."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 5: Incident and Event Response (2)
    // ----------------------------------------------------------------------
    {
      slug: "latency-incident-root-cause",
      objective: "Root cause analysis with AWS metrics and logging services, including Amazon CloudWatch and AWS X-Ray",
      kind: "case",
      title: "Find the root cause of a checkout latency incident",
      brief:
        "Ironbridge Outdoor's checkout service (API Gateway -> Lambda -> DynamoDB, with a call to a third-party payments API) started timing out for a share of users at 11:40. The ALB-free serverless stack has X-Ray tracing enabled. You lead the incident review.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The X-Ray service map shows the checkout Lambda node orange with 18% faults. In the trace list, slow traces all spend 6-9 seconds in a DynamoDB subsegment for the Orders table, while the payments-API subsegment is normal at 300 ms. CloudWatch shows the Lambda function's Duration p99 jumping from 900 ms to 9.5 s at 11:40 and Throttles at 0.",
          ask: "What do the traces tell you, and what do you look at next?",
          parts: [
            part(
              "Reading the trace",
              "Isolates the DynamoDB call (not the third-party API or Lambda cold starts) as where the time goes, using the subsegment timings, and rules out Lambda concurrency throttling from the Throttles metric.",
              "The slow traces spend their time inside the DynamoDB subsegment, so the cause is the Orders table interaction, not the payments provider (300 ms, normal) and not Lambda concurrency (Throttles is 0). Cold starts would show as initialization time, not a 6-9 s DynamoDB call."
            ),
            part(
              "Next evidence",
              "Looks at the DynamoDB table's metrics (ThrottledRequests / WriteThrottleEvents, ConsumedWriteCapacityUnits by partition key pattern), the subsegment's error annotations (ProvisionedThroughputExceededException with SDK retries), and what changed at 11:40 (a deployment, a traffic change, a new hot key) via CloudTrail and the deployment history.",
              "Open the DynamoDB subsegment details for the exception name and the SDK retry count; check the table's WriteThrottleEvents and ConsumedWriteCapacityUnits metrics; and correlate 11:40 with CloudTrail (UpdateTable, a deployment) and the deployment pipeline's history to see what changed."
            ),
          ],
        },
        {
          text: "The subsegments show repeated ProvisionedThroughputExceededException with SDK retries and exponential backoff -- the 6-9 seconds are retries. The table is in provisioned mode with 500 WCU, consumed capacity averages 220 WCU, but WriteThrottleEvents is high. A release at 11:35 changed the Orders partition key format so that all orders from the same day share one key.",
          ask: "Explain the root cause and the fix, both immediate and permanent.",
          parts: [
            part(
              "Root cause",
              "Explains that the release created a hot partition: every order of the day shares one partition key, so writes concentrate on one partition, which can deliver at most 1,000 write units per second regardless of the table's total; the SDK's retries turn throttling into multi-second latency.",
              "The 11:35 release turned the partition key into 'today's date', so every order hits one item collection on one partition. A single partition delivers at most 1,000 WCU (and 3,000 RCU) no matter what the table is provisioned at, so writes throttle even though the table-wide average is 220 of 500 WCU. The SDK retries with backoff, which is why each request takes 6-9 seconds instead of failing fast."
            ),
            part(
              "Fix",
              "Rolls back the release immediately (restores the high-cardinality key), and for the permanent fix keeps a high-cardinality partition key (order id) or write-shards the date key, adds a CloudWatch alarm on WriteThrottleEvents (and on the function's p99 Duration) so the next regression is caught in minutes, and considers a canary deployment so a change like this reaches 10% of traffic first.",
              "Immediately: roll back to the previous version (restores order-id keys). Permanently: keep order_id as the partition key, or shard the date key across N suffixes if a per-day grouping is needed, and add alarms on WriteThrottleEvents and p99 Duration tied to the deployment's automatic rollback. Deploying with CodeDeploy canary (10% for 5 minutes) would have caught this at 10% of traffic."
            ),
          ],
        },
      ],
    },
    {
      slug: "auto-remediate-public-exposure",
      objective: "Remediating a non-desired system state",
      kind: "build",
      title: "Auto-remediate a public security group and a public bucket",
      brief:
        "Saltmarsh Analytics has had two near misses: an engineer opened SSH (port 22) to 0.0.0.0/0 on a production security group, and a data bucket was made public for a 'quick share'. Security wants both states detected within minutes and fixed automatically, with an exception process for the few buckets that are meant to be public (a static website) and a record of every remediation for the auditors. Design the detection and remediation.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the auto-remediation design.",
          parts: [
            part(
              "Detection",
              "Uses AWS Config managed rules -- restricted-ssh (or vpc-sg-open-only-to-authorized-ports) for the security group and s3-bucket-public-read-prohibited / s3-bucket-public-write-prohibited (or s3-bucket-level-public-access-prohibited) for buckets -- evaluated on configuration change so detection is near real time, deployed to all accounts via a conformance pack or organization rules.",
              "AWS Config rules evaluated on configuration change: restricted-ssh for 0.0.0.0/0 on port 22 (vpc-sg-open-only-to-authorized-ports to cover other ports), and s3-bucket-level-public-access-prohibited plus s3-bucket-public-read-prohibited and s3-bucket-public-write-prohibited for buckets. Deploy them as organization Config rules or a conformance pack so every account is covered."
            ),
            part(
              "Remediation",
              "Attaches Config remediation actions (automatic) that run Systems Manager Automation runbooks: AWS-DisablePublicAccessForSecurityGroup for the security group and AWSConfigRemediation-ConfigureS3BucketPublicAccessBlock (block public access on the bucket) for buckets, with an assume role scoped to those actions and retry settings; alternatively an EventBridge rule on the compliance change event triggering the runbook.",
              "Config remediation: for restricted-ssh, automatic remediation with the AWS-DisablePublicAccessForSecurityGroup runbook (resource id from the rule, IpAddressToBlock 0.0.0.0/0); for the S3 rules, AWSConfigRemediation-ConfigureS3BucketPublicAccessBlock with all four block settings true. Each runs under an automation role that can only modify those resources, with retries limited so a flapping resource does not loop. The same can be wired as an EventBridge rule on 'Config Rules Compliance Change' -> Automation."
            ),
            part(
              "Exceptions",
              "Handles the legitimate public website bucket with a tag-based exclusion (the rule's scope, or the remediation's parameters checked in a wrapper runbook), or by keeping public access behind CloudFront with an origin access control so the bucket itself is never public.",
              "Scope the S3 rules to exclude buckets tagged PublicWebsite=approved (rule scope by tag), or better, make the website bucket private and serve it through CloudFront with origin access control, so there is no exception at all. Exceptions are recorded as tags with an owner and review date."
            ),
            part(
              "Evidence and notification",
              "Records every remediation through the Automation execution history and CloudTrail, sends an SNS notification (and a Security Hub finding update) when a remediation runs, and keeps the Config timeline as the auditor's record of state before and after.",
              "Each remediation leaves an Automation execution (who/what/when, step outputs) and CloudTrail entries for the API calls it made. An EventBridge rule on Automation execution status publishes to SNS and the Security Hub finding is updated. The Config resource timeline shows the non-compliant configuration and the fixed one with timestamps, which is what the auditors asked for."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 6: Security and Compliance (2)
    // ----------------------------------------------------------------------
    {
      slug: "permissions-boundary-delegation",
      objective: "Delegating permission management with IAM permissions boundaries",
      kind: "build",
      title: "Let developers create IAM roles without escalating privilege",
      brief:
        "Wexcombe Fintech's platform team is a bottleneck: every new Lambda function or ECS task needs an IAM role, and only the platform team may create roles. They want to let developers create and manage roles for their own applications, but a developer-created role must never be able to do more than the developer policy allows (for example no IAM administration, no access outside the application's resources), and developers must not be able to remove the control. Write the delegation design.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the permissions boundary design.",
          parts: [
            part(
              "The boundary policy",
              "Creates a managed policy (for example WexcombeAppBoundary) that defines the maximum permissions an application role may ever have (the application services such as S3, DynamoDB, SQS, logs on the team's resources; explicit deny of iam:* except read, organizations, and billing), explaining a boundary never grants, it caps.",
              "WexcombeAppBoundary: Allow the application-level services (s3, dynamodb, sqs, logs, kms:Decrypt on the team's keys) and Deny iam:* (other than Get/List), organizations:*, account:*, billing. A permissions boundary does not grant anything; the effective permissions are the intersection of the role's own policies and the boundary, so no role under it can exceed this set."
            ),
            part(
              "Developer permission to create roles",
              "Grants developers iam:CreateRole, iam:AttachRolePolicy, iam:PutRolePolicy (and pass role) only when the role carries the boundary, using the condition iam:PermissionsBoundary equal to the boundary policy ARN, and scoped to a role path/prefix such as /app/.",
              '{"Effect":"Allow","Action":["iam:CreateRole","iam:AttachRolePolicy","iam:PutRolePolicy","iam:DetachRolePolicy","iam:DeleteRolePolicy","iam:UpdateAssumeRolePolicy"],"Resource":"arn:aws:iam::123456789012:role/app/*","Condition":{"StringEquals":{"iam:PermissionsBoundary":"arn:aws:iam::123456789012:policy/WexcombeAppBoundary"}}} -- a role can only be created or changed if it has this exact boundary, and only under the /app/ path.'
            ),
            part(
              "Preventing removal of the control",
              "Explicitly denies iam:DeleteRolePermissionsBoundary and any change to the boundary policy itself (iam:CreatePolicyVersion, iam:DeletePolicy, iam:SetDefaultPolicyVersion on the boundary ARN) for developers, and protects the platform's own roles by denying changes outside /app/.",
              'Deny iam:DeleteRolePermissionsBoundary on role/app/*, and Deny iam:CreatePolicyVersion, iam:DeletePolicyVersion, iam:SetDefaultPolicyVersion and iam:DeletePolicy on arn:aws:iam::123456789012:policy/WexcombeAppBoundary. Developers also get no IAM actions on roles outside /app/, so platform roles cannot be touched. An SCP with the same denies makes it hold even for account administrators.'
            ),
            part(
              "PassRole and verification",
              "Restricts iam:PassRole to roles under /app/ (so developers can attach only their own roles to Lambda/ECS), and verifies with the IAM policy simulator or IAM Access Analyzer policy checks that a role created under the boundary cannot, for example, create users even if its own policy says AdministratorAccess.",
              "Allow iam:PassRole only on arn:aws:iam::123456789012:role/app/* (with iam:PassedToService limited to lambda.amazonaws.com and ecs-tasks.amazonaws.com). Test: create a role under /app/ with AdministratorAccess attached and the boundary set, then simulate iam:CreateUser in the policy simulator -- it is denied, because the boundary wins."
            ),
          ],
        },
      ],
    },
    {
      slug: "security-hub-org-automation",
      objective: "Automating security controls across multi-account and multi-Region environments with AWS Security Hub, AWS Organizations, AWS Control Tower, and Systems Manager",
      kind: "build",
      title: "Run security findings centrally across an organization",
      brief:
        "Kelso Logistics has 60 accounts in two Regions, managed with AWS Control Tower. Findings are scattered: each account team looks at its own Security Hub (if enabled), GuardDuty is on in some accounts, and nobody owns the picture. The CISO wants: every account and both Regions covered automatically, including new accounts; one place to see and triage findings; critical findings about public exposure fixed automatically; and low-value findings from a known test account suppressed without hiding them from the audit trail. Design it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the central security operations design.",
          parts: [
            part(
              "Delegated administration and coverage",
              "Designates the Security Tooling (audit) account as the delegated administrator for Security Hub and GuardDuty (and Inspector, Macie as needed) through Organizations, enables auto-enable for new accounts, and uses Security Hub central configuration to apply a policy (standards and controls) to all accounts and both Regions from the home Region, with cross-Region aggregation to a single view.",
              "From the management account, delegate administration of Security Hub and GuardDuty to the audit account (Control Tower's Audit account is the natural choice). In Security Hub, turn on central configuration from the home Region with a configuration policy that enables the chosen standards (for example AWS Foundational Security Best Practices) for the whole organization in both Regions, and set a finding aggregation Region so both Regions' findings appear in one place. Auto-enable covers accounts created later."
            ),
            part(
              "Automatic remediation of critical exposure",
              "Uses Security Hub automation rules to tag or elevate findings and an EventBridge rule on Security Hub findings (for example GuardDuty or FSBP controls about public exposure, severity CRITICAL) that starts a Systems Manager Automation runbook or Step Functions workflow in the member account via a cross-account role; notes custom actions for human-triggered remediation.",
              "An EventBridge rule in the audit account matching Security Hub Findings - Imported with severity CRITICAL and the relevant control ids (public S3 bucket, open security group, public RDS snapshot) targets a Step Functions workflow that assumes a remediation role in the finding's account and runs the appropriate Automation runbook, then updates the finding's workflow status to RESOLVED with a note. Custom actions let an analyst send a finding to the same workflow by hand."
            ),
            part(
              "Suppression with an audit trail",
              "Uses Security Hub automation rules to set workflow status SUPPRESSED (and a note) for findings from the test account matching defined criteria, rather than disabling controls or deleting findings, so they remain in the record and in exports.",
              "An automation rule: criteria AwsAccountId = the test account and the specific low-value control ids; action: set WorkflowStatus to SUPPRESSED and add a note naming the approver and the review date. The findings stay in Security Hub and in the data exported to the security lake, they just leave the active queue. Disabling the control organization-wide would hide real findings elsewhere."
            ),
            part(
              "Guardrails and evidence",
              "Pairs this with Control Tower controls / SCPs that prevent members from disabling Security Hub, GuardDuty or CloudTrail, and exports findings (Security Hub to S3 via EventBridge/Firehose or Amazon Security Lake) for the auditors' retention.",
              "SCPs (or Control Tower preventive controls) deny securityhub:DisableSecurityHub, guardduty:DeleteDetector and cloudtrail:StopLogging in member accounts so coverage cannot be switched off locally. Stream all findings to Amazon Security Lake (or Firehose to S3) for long-term retention and the auditors' queries."
            ),
          ],
        },
      ],
    },
  ],
};
