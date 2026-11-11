import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-153: AWS Certified CloudOps Engineer - Associate (SOA-C03), associate
// level (formerly SysOps Administrator - Associate).
//
// Aligned to the SOA-C03 exam guide's five domains (Monitoring, Logging,
// Analysis, Remediation, and Performance Optimization 22%, Reliability and
// Business Continuity 22%, Deployment, Provisioning, and Automation 22%,
// Security and Compliance 16%, Networking and Content Delivery 18%; 50 scored
// questions, multiple choice and multiple response only, scaled 100-1,000,
// pass 720), re-read 2026-11-07:
//   https://docs.aws.amazon.com/aws-certification/latest/sysops-administrator-associate-03/sysops-administrator-associate-03.html
// Density (docs/labs.md, policy "hybrid"): one lab per domain plus six
// weighted extras -> 3 / 2 / 2 / 2 / 2. SOA-C02's hands-on exam labs are gone
// from SOA-C03, but the questions still describe an operator at a console
// with a symptom, so five of the eleven labs are troubleshooting cases: an
// alarm that never fired, targets marked unhealthy, a stack that will not
// create, an access denial, and 'it cannot reach the database'.
//
// Facts and the AWS pages they were checked against on 2026-11-07:
//   - CloudWatch alarms: M out of N datapoints, missing-data treatment,
//     actions (SNS, EC2, Auto Scaling, Lambda, Systems Manager OpsItems and
//     incidents), composite alarms:
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ConsoleAlarms.html
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Composite_Alarm.html
//   - CloudWatch agent: installed through Systems Manager Run Command with
//     the AWS-ConfigureAWSPackage document and package AmazonCloudWatchAgent,
//     configuration in Parameter Store, instance role with
//     CloudWatchAgentServerPolicy; collects system-level metrics such as
//     mem_used_percent and disk_used_percent that EC2 does not publish:
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/installing-cloudwatch-agent-ssm.html
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create-iam-roles-for-cloudwatch-agent-commandline.html
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/metrics-collected-by-CloudWatch-agent.html
//   - SNS email subscriptions must be confirmed (PendingConfirmation):
//     https://docs.aws.amazon.com/sns/latest/dg/sns-email-notifications.html
//   - RDS automated backups: retention 0 to 35 days; point-in-time restore
//     creates a new DB instance; transaction logs are uploaded every five
//     minutes (LatestRestorableTime):
//     https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html
//     https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html
//   - ALB target group health checks: interval default 30 s, timeout default
//     5 s, healthy threshold default 5, unhealthy threshold 2-10, success codes
//     default 200 (200-499 allowed), reason codes Target.ResponseCodeMismatch,
//     Target.Timeout, Target.FailedHealthChecks:
//     https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
//   - VPC subnets: /28 to /16; the first four and the last IP address of each
//     subnet are reserved:
//     https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
//   - CloudFormation: CAPABILITY_IAM / CAPABILITY_NAMED_IAM; preserving
//     successfully provisioned resources on failure (--disable-rollback):
//     https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/control-access-with-iam.html
//     https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stack-failure-options.html
//   - Systems Manager: AmazonSSMManagedInstanceCore / Default Host Management
//     Configuration, Patch Manager baselines and patch policies, Run Command
//     targeting by tag with max-concurrency and max-errors rate controls:
//     https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-permissions.html
//     https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager.html
//     https://docs.aws.amazon.com/systems-manager/latest/userguide/send-commands-multiple.html
//   - IAM policy evaluation, access-denied messages naming the policy type,
//     IAM Access Analyzer external access findings, the policy simulator:
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_access-denied.html
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_testing-policies.html
//   - Encryption at rest: an existing RDS instance or EBS volume is encrypted
//     by snapshot, encrypted copy, restore; snapshots encrypted with the AWS
//     managed key cannot be shared:
//     https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
//     https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption.html
//     https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modifying-snapshot-permissions.html
//   - Network ACLs are stateless (ephemeral return range 1024-65535 in the
//     AWS examples); VPC Flow Logs ACCEPT/REJECT records:
//     https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
//     https://docs.aws.amazon.com/vpc/latest/userguide/nacl-examples.html
//     https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-records-examples.html
//   - Route 53 routing policies; public hosted zone query logging to a
//     CloudWatch Logs group in US East (N. Virginia); alias records at the
//     zone apex:
//     https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html
//     https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/query-logs.html
//     https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
// Every lab is needs_expert_review until a person checks it.

export const AWSSOA_LABS: SeedLabSet = {
  trackCode: "AWSSOA",
  sources: [
    source("https://docs.aws.amazon.com/aws-certification/latest/sysops-administrator-associate-03/sysops-administrator-associate-03.html", "exam_outline", "2026-11-07"),
    source("https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ConsoleAlarms.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/installing-cloudwatch-agent-ssm.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/control-access-with-iam.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/systems-manager/latest/userguide/send-commands-multiple.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_access-denied.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modifying-snapshot-permissions.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/vpc/latest/userguide/nacl-examples.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/query-logs.html", "reference", "2026-11-07"),
  ],
  labs: [
    // ----- Monitoring, Logging, Analysis, Remediation, and Performance Optimization (3) -----
    {
      slug: "alarm-design-api-errors",
      objective: "Configuring CloudWatch alarms, including composite alarms and the actions they can invoke",
      kind: "build",
      title: "Design the alarms for a customer-facing API",
      brief:
        "Greywood Ticketing, a fictional events company, runs an API on EC2 instances in an Auto Scaling group behind an Application Load Balancer. Today's alarms page on-call for every one-minute blip: a single bad datapoint of 5XX errors fires, a quiet night with no requests shows INSUFFICIENT_DATA that nobody understands, and when the database goes down the team receives eleven separate alarm emails. Operations wants: page on sustained errors, not blips; sensible behavior when traffic is zero; one notification per incident; and the load balancer's unhealthy-host condition to replace instances without a human.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the alarm configuration that meets each requirement.",
          parts: [
            part(
              "Sustained errors, not blips",
              "Alarms on the ALB HTTPCode_ELB_5XX_Count (or target 5XX) with a period of one minute and an M-out-of-N rule such as 3 of 5 datapoints breaching, so a single spike does not fire.",
              "Metric HTTPCode_Target_5XX_Count (Sum, 60 s period), threshold say 20 per minute, Datapoints to alarm 3 out of 5 evaluation periods. One bad minute does nothing; three bad minutes in five pages."
            ),
            part(
              "Zero traffic",
              "Sets Treat missing data appropriately: notBreaching for the error alarm (no requests means no errors), and explains why INSUFFICIENT_DATA appears when a sparse metric publishes no datapoints.",
              "The 5XX metric is only published when requests arrive, so quiet periods have no datapoints and the alarm shows INSUFFICIENT_DATA. Set Treat missing data to notBreaching for the error alarm (no traffic is not an error). For a heartbeat metric you would choose breaching instead, so silence fires."
            ),
            part(
              "One notification per incident",
              "Creates a composite alarm whose rule combines the child alarms (for example 5XX OR latency OR database alarm) and attaches the notification action to the composite only, suppressing the children's actions.",
              "A composite alarm with rule ALARM(api-5xx) OR ALARM(api-p99-latency) OR ALARM(db-connections-exhausted), with the SNS page action on the composite alarm only and no actions on the child alarms. When the database fails, the children all go to ALARM but on-call gets one page."
            ),
            part(
              "Automatic remediation",
              "Uses the alarm actions available: an Auto Scaling action or EC2 action (for example recover or terminate) driven by an unhealthy-host or status-check alarm, and names other action types (SNS, Lambda, Systems Manager OpsItem or incident).",
              "An alarm on the target group's UnHealthyHostCount or on StatusCheckFailed_System with an EC2 recover or Auto Scaling action so the group replaces the instance without a person. Alarm actions can also notify SNS, invoke a Lambda function, open a Systems Manager OpsItem or start an incident."
            ),
          ],
        },
      ],
    },
    {
      slug: "cloudwatch-agent-fleet-rollout",
      objective: "Installing and managing the CloudWatch agent on EC2 instances, Amazon ECS clusters, and Amazon EKS clusters",
      kind: "build",
      title: "Roll the CloudWatch agent out to 300 EC2 instances",
      brief:
        "Ironbridge Retail, a fictional company, has 300 Amazon Linux 2023 instances across six Auto Scaling groups, all already managed by Systems Manager. Last month an instance ran out of memory and another filled its disk, and nobody saw either coming because the CloudWatch console showed only CPU, network and disk I/O. The application also writes a log file to /var/log/ironbridge/app.log that the team wants searchable. Nothing may be installed by hand on 300 machines.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Plan the rollout: why the agent, how it is installed and configured at fleet scale, and what the instances need.",
          parts: [
            part(
              "Why the agent",
              "Explains that EC2's built-in metrics come from the hypervisor and do not include memory or disk space; the CloudWatch agent collects in-guest metrics such as mem_used_percent and disk_used_percent and can ship log files.",
              "EC2 publishes what the hypervisor can see (CPU, network, disk operations), not memory or file-system usage inside the guest. The CloudWatch agent runs in the OS and collects mem_used_percent, disk_used_percent and other system-level metrics, and tails log files into CloudWatch Logs."
            ),
            part(
              "Installation at scale",
              "Installs through Systems Manager Run Command (document AWS-ConfigureAWSPackage, package AmazonCloudWatchAgent) targeted by tag or resource group, and bakes it into the AMI or launch template user data for new instances in the Auto Scaling groups.",
              "Run Command with the AWS-ConfigureAWSPackage document, action Install, name AmazonCloudWatchAgent, targeted at the tag Fleet=ironbridge, with rate controls (for example 10% concurrency, stop at 5 errors). For instances the Auto Scaling groups launch later, put the same install in the launch template user data or the AMI built by Image Builder."
            ),
            part(
              "Configuration",
              "Stores one agent configuration JSON (metrics for mem and disk, logs section for the app.log file) in Systems Manager Parameter Store and starts the agent on every instance from that parameter, so a change is made once.",
              "Write one configuration: metrics_collected mem (mem_used_percent) and disk (disk_used_percent for /), logs_collected with /var/log/ironbridge/app.log into log group /ironbridge/app. Save it as Parameter Store parameter AmazonCloudWatch-ironbridge and start the agent on each instance with fetch-config pointing at that parameter."
            ),
            part(
              "Permissions",
              "Attaches an instance role carrying CloudWatchAgentServerPolicy (to publish metrics and logs and read the parameter) alongside the Systems Manager permissions (AmazonSSMManagedInstanceCore or Default Host Management Configuration), then alarms on the new metrics.",
              "The instance profile needs CloudWatchAgentServerPolicy so the agent can put metrics and logs and read its config from Parameter Store, in addition to the Systems Manager permissions it already has (AmazonSSMManagedInstanceCore or the account's Default Host Management Configuration). Then alarm on mem_used_percent and disk_used_percent at, say, 85%."
            ),
          ],
        },
      ],
    },
    {
      slug: "alarm-that-never-fired",
      objective: "Troubleshooting an alarm that never fires, or fires on the wrong thing",
      kind: "case",
      title: "Find out why the alarm never fired",
      brief:
        "Willowmere Pharmacy's online ordering site (fictional) was down for 22 minutes last night. The on-call engineer was never paged. A CloudWatch alarm on the site's error rate exists and has an SNS topic as its action. You are asked to explain and fix it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The alarm: metric HTTPCode_Target_5XX_Count, statistic Average, period 5 minutes, threshold greater than 50, 3 of 3 datapoints, Treat missing data as missing. During the outage the ALB returned 503 for every request, about 400 requests a minute, so the targets returned no 5XX at all and the metric had no datapoints.",
          ask: "Why did the alarm stay out of ALARM, and what do you change?",
          parts: [
            part(
              "Diagnosis",
              "Identifies that the targets were down so target 5XX was never published (missing data), and with missing treated as missing the alarm stayed in INSUFFICIENT_DATA; also notes Average is the wrong statistic for a count and 3 of 3 five-minute periods needs 15 minutes of data.",
              "The load balancer itself returned the 503s because no target was healthy, so HTTPCode_Target_5XX_Count had no datapoints; with missing data treated as missing, the alarm sat in INSUFFICIENT_DATA rather than ALARM. Average of a count metric is also meaningless, and three five-minute periods means at least 15 minutes before it could fire anyway."
            ),
            part(
              "Fix",
              "Alarms on the ELB-side metric (HTTPCode_ELB_5XX_Count, Sum) or UnHealthyHostCount with a shorter period and M of N datapoints, and sets missing data to breaching where silence means failure, or notBreaching for metrics that are sparse by nature; adds a second alarm on request count dropping to zero.",
              "Add an alarm on HTTPCode_ELB_5XX_Count (Sum, 60 s, 2 of 3 datapoints above 100) and one on UnHealthyHostCount at or above 1; for a health-style metric that should always exist, treat missing data as breaching. Keep the target-5XX alarm with notBreaching for quiet periods. Separately alarm when RequestCount falls to zero during business hours."
            ),
          ],
        },
        {
          text: "You fix the alarm and test it by stopping the targets. The alarm goes to ALARM, but still no one is paged. The SNS topic shows one email subscription in status PendingConfirmation and the alarm's Actions column reads 'Actions disabled'.",
          ask: "What are the two remaining problems and how do you prove the fix works?",
          parts: [
            part(
              "Delivery path",
              "Identifies that the SNS email subscription was never confirmed (so SNS does not deliver to it) and that alarm actions were disabled (for example during earlier maintenance), then confirms the subscription and re-enables actions.",
              "Two breaks after the alarm: the email subscription is in PendingConfirmation, so SNS will not deliver until the recipient clicks the confirmation link; and the alarm's actions are disabled, so even a confirmed topic would not be called. Confirm the subscription (or use a group address that is monitored) and enable the alarm actions."
            ),
            part(
              "Proof",
              "Tests end to end: set the alarm state with set-alarm-state (or repeat the target-stop test) and confirm the page arrives, then adds a check that catches disabled actions or unconfirmed subscriptions in future (for example an AWS Config rule or a periodic audit).",
              "Run aws cloudwatch set-alarm-state --state-value ALARM on the alarm and confirm the page reaches the on-call phone, then set it back to OK. Add a monthly audit, or a Config rule, that flags alarms with actions disabled and topics with unconfirmed subscriptions so this cannot silently recur."
            ),
          ],
        },
        {
          text: "A week later the same alarm pages on-call at 03:10 for one minute of elevated 5XX during a nightly deployment, when a few instances are briefly draining.",
          ask: "How do you stop the false page without weakening the real detection?",
          parts: [
            part(
              "Tuning",
              "Raises datapoints-to-alarm (for example 3 of 5) or uses a composite alarm that suppresses during the deployment window (or an alarm on a deployment-in-progress metric), rather than raising the threshold so high that real outages are missed.",
              "Change the ELB-5XX alarm to 3 of 5 one-minute datapoints so a one-minute deploy blip does not page, and wrap it in a composite alarm with a suppressor alarm that is in ALARM while a deployment is running (published by the pipeline), so the real outage pattern of several bad minutes with no deployment still pages."
            ),
          ],
        },
      ],
    },
    // ----- Reliability and Business Continuity (2) -----
    {
      slug: "rds-restore-against-rto-rpo",
      objective: "Restoring databases, including point-in-time restore, against RTO, RPO, and cost requirements",
      kind: "build",
      title: "Plan the restore for a deleted-table incident",
      brief:
        "Stonebrook Dental (fictional) runs its practice-management database on a Multi-AZ Amazon RDS for PostgreSQL instance with automated backups retained for 7 days. At 10:42 a developer ran a script against production that dropped the appointments table. The business requires that no more than 15 minutes of data be lost (RPO) and that the system be back within 2 hours (RTO). Manual snapshots are taken monthly. The team's first instinct is to restore last night's snapshot over the live database.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the recovery plan and explain the mechanics and settings behind it.",
          parts: [
            part(
              "Which restore and to when",
              "Chooses point-in-time restore to just before 10:42 (for example 10:41), explaining that RDS uploads transaction logs about every five minutes so the latest restorable time is close to the incident, which meets the 15-minute RPO where a nightly snapshot would lose hours.",
              "Point-in-time restore to 10:41, one minute before the DROP. Automated backups plus transaction logs, which RDS uploads about every five minutes, allow restoring to any point in the retention window, so data loss is about a minute; last night's snapshot would throw away the whole morning and break the 15-minute RPO."
            ),
            part(
              "How a PITR actually works",
              "States that PITR creates a new DB instance (it does not overwrite the source), so the plan is to restore to a new instance, verify, then switch the application or copy the table back; notes the new instance needs the same parameter group, security groups and subnet group checked.",
              "PITR always creates a new DB instance from the backups; the live instance is untouched. Restore to stonebrook-restore, confirm the appointments table is intact, then either repoint the application (DNS or connection string) or copy the appointments table back into production. Check the restored instance's security groups, parameter group and option group before cut-over."
            ),
            part(
              "Meeting the RTO",
              "Estimates the restore time against the 2-hour RTO (restore then recovery of logs, then application switch), prepares the steps in a runbook, and notes Multi-AZ did not help because the error was replicated, not a hardware failure.",
              "Start the restore immediately; a restore of a few hundred GB plus log replay and a smoke test fits within two hours only if the steps are scripted, so the runbook holds the exact CLI command and the cut-over checklist. Multi-AZ replicated the DROP to the standby in milliseconds; it protects against infrastructure failure, not mistakes."
            ),
            part(
              "Settings and cost for next time",
              "Reviews retention (automated backups can be kept 0 to 35 days; 7 days is enough for same-day mistakes but longer gives more room), keeps manual snapshots for long-term points, and prevents a repeat with least-privilege database credentials for scripts and deletion protection.",
              "Keep automated backup retention at 7 days or raise it (the range is 0 to 35 days) if incidents might be noticed late; monthly manual snapshots remain for long-term retention since they persist until deleted. Give scripts a database role without DROP, enable deletion protection on the instance, and run risky scripts against the restored copy first."
            ),
          ],
        },
      ],
    },
    {
      slug: "alb-marks-targets-unhealthy",
      objective: "Configuring and troubleshooting Elastic Load Balancing health checks",
      kind: "case",
      title: "Every target is unhealthy: fix the ALB health check",
      brief:
        "Ashfield Learning (fictional) has just deployed a new version of its web application to an Auto Scaling group behind an Application Load Balancer. Within minutes every target shows unhealthy, the Auto Scaling group keeps replacing instances, and the site returns 503.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The target group health check: protocol HTTP, port traffic-port (8080), path /, success codes 200, interval 30 seconds, timeout 5 seconds, healthy threshold 5, unhealthy threshold 2. The target health reason is Target.ResponseCodeMismatch. Curling an instance's http://<ip>:8080/ returns HTTP 302 redirecting to /login.",
          ask: "Explain the failure and give two acceptable fixes.",
          parts: [
            part(
              "Cause",
              "Identifies that the new version redirects / to /login with a 302, which does not match the success code 200, so the health check fails (ResponseCodeMismatch), two failures mark the target unhealthy, and the ASG terminates it.",
              "The new release answers / with a 302 redirect; the check expects 200, so each probe is a Target.ResponseCodeMismatch, and after two consecutive failures (unhealthy threshold 2) the target is marked unhealthy and the Auto Scaling group replaces it, which repeats forever."
            ),
            part(
              "Fixes",
              "Proposes pointing the health check at a dedicated endpoint that returns 200 (for example /health) or widening the matcher to include the redirect (for example 200-399 or 200,302), and recommends the dedicated endpoint; notes the allowed success code range is 200-499.",
              "Best: give the app a /health endpoint that returns 200 only when it can serve traffic, and set the health check path to it. Quick: set success codes to 200-302 or 200-399 (any value from 200 to 499 is allowed). The dedicated endpoint is better because a redirect says nothing about whether the app actually works."
            ),
          ],
        },
        {
          text: "You add /health. Half the targets now turn healthy. The others show Target.Timeout. On those instances, /health takes 7-9 seconds to respond on first call because it warms a cache, then answers in milliseconds.",
          ask: "What is happening and how do you adjust the check?",
          parts: [
            part(
              "Timeout and thresholds",
              "Explains that the 5-second timeout is shorter than the 7-9 second warm-up, so early probes time out and the target never accumulates the 5 consecutive successes; fixes it by raising the timeout (under the interval) or making /health light and separating warm-up, and considers a lower healthy threshold or an ASG health check grace period.",
              "The health check gives up after 5 seconds while the first /health call takes 7-9, so probes during warm-up time out and the target needs five consecutive passes before it counts as healthy. Make /health cheap (return 200 once the process is up, warm the cache in the background) or raise the timeout to 10 seconds with the interval above it, and give the Auto Scaling group a health check grace period that covers start-up."
            ),
          ],
        },
        {
          text: "One Availability Zone's targets stay unhealthy with Target.FailedHealthChecks even though /health answers instantly when you curl it from a bastion in that subnet. The ALB's nodes in that AZ sit in a subnet whose instances' security group was recently tightened.",
          ask: "Where is the block, and how do you confirm it?",
          parts: [
            part(
              "Security group path",
              "Identifies that the instance security group must allow inbound traffic on the health check port from the load balancer's security group (or its subnets); the tightened rule removed it, so the ALB cannot reach the targets even though a bastion can; confirms with a reachability check or VPC flow logs showing REJECT from the ALB node IPs.",
              "The targets' security group no longer allows TCP 8080 from the ALB's security group, so the health checks from the load balancer nodes are refused while a curl from the bastion (a different source) works. Add an inbound rule on the target SG for port 8080 with the ALB's security group as source, and confirm with VPC Flow Logs (REJECT records from the ALB node IPs stop) or VPC Reachability Analyzer."
            ),
          ],
        },
      ],
    },
    // ----- Deployment, Provisioning, and Automation (2) -----
    {
      slug: "stack-wont-create",
      objective: "Identifying and remediating deployment issues: subnet sizing, CloudFormation errors, permissions problems",
      kind: "case",
      title: "A CloudFormation stack that will not create",
      brief:
        "Redfern Analytics (fictional) is standing up a new environment from a CloudFormation template: a VPC, subnets, an Auto Scaling group of 12 instances, and an IAM role for them. The first attempt failed and the engineer asks for help reading the events.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Stack events show the Auto Scaling group CREATE_FAILED with a message that the subnet does not have enough free addresses. The template defines the app subnet as 10.20.1.0/28 and the ASG desired capacity as 12. The stack is now in ROLLBACK_COMPLETE and the VPC and subnets it created are gone.",
          ask: "Explain the arithmetic behind the failure, fix the template, and say what to do with the failed stack.",
          parts: [
            part(
              "Subnet arithmetic",
              "Explains that a /28 has 16 addresses but AWS reserves the first four and the last one in every subnet, leaving 11 usable, so 12 instances cannot fit; resizes the subnet (for example /24 or at least /26) and notes /28 is the smallest allowed subnet.",
              "A /28 holds 16 addresses, and AWS reserves five in every subnet (the network address, the VPC router, the DNS server, one for future use, and the broadcast address), leaving 11. Twelve instances, plus the load balancer and anything else, cannot fit. Use a /24 (251 usable) per AZ; /28 is the smallest subnet AWS allows, so there is no room below it."
            ),
            part(
              "The rolled-back stack",
              "States that a failed creation rolls back and removes the resources by default, and the stack in ROLLBACK_COMPLETE is deleted and created again with the corrected template; mentions the option to preserve successfully provisioned resources (disable rollback) when debugging.",
              "On a failed create, CloudFormation rolls back and deletes what it built, which is why the VPC is gone. Delete the stack in ROLLBACK_COMPLETE and create it again from the fixed template. While iterating, create with 'preserve successfully provisioned resources' (--disable-rollback) so the good resources stay and only the failed one is retried after the fix."
            ),
          ],
        },
        {
          text: "The second attempt fails on the IAM role: 'User is not authorized to perform: iam:CreateRole' and, in a separate test run from an admin account, 'Requires capabilities: [CAPABILITY_NAMED_IAM]'.",
          ask: "What are the two different problems and the fix for each?",
          parts: [
            part(
              "Permissions versus capability acknowledgment",
              "Separates the two: the first is an IAM permissions problem (the caller, or the stack's service role if one is set, lacks iam:CreateRole), fixed by granting the permission to a CloudFormation service role; the second is CloudFormation's acknowledgment that the template creates IAM resources with custom names, fixed by passing CAPABILITY_NAMED_IAM (CAPABILITY_IAM if the names are generated).",
              "Problem one is authorization: whoever CloudFormation acts as (the user, or better a dedicated CloudFormation service role) needs iam:CreateRole and the related IAM actions; give the stack a service role with those permissions rather than widening the engineer. Problem two is not a permission at all: because the template names its IAM role, CloudFormation requires the caller to acknowledge it with CAPABILITY_NAMED_IAM (CAPABILITY_IAM would do for unnamed IAM resources)."
            ),
          ],
        },
        {
          text: "The stack now creates. Two days later an engineer edits the Auto Scaling group's security group by hand in the console. The next stack update behaves unexpectedly.",
          ask: "Name the problem and the operational control for it.",
          parts: [
            part(
              "Drift",
              "Identifies configuration drift and uses CloudFormation drift detection to find it, then reconciles by bringing the manual change into the template (or reverting it) and prevents repeats with permissions that keep changes going through the pipeline.",
              "Drift: the live resource no longer matches the template. Run drift detection on the stack to list the differences, then either put the manual change into the template and update, or revert the console change. Restrict console write permissions on stack-managed resources so changes go through the template."
            ),
          ],
        },
      ],
    },
    {
      slug: "patch-fleet-systems-manager",
      objective: "Automating operational processes with AWS Systems Manager",
      kind: "build",
      title: "Patch a 200-instance fleet with Systems Manager",
      brief:
        "Harland Freight (fictional) has 200 EC2 instances: 140 Amazon Linux 2023 and 60 Windows Server, tagged Environment=prod or Environment=staging and App=dispatch or App=billing. Patching is done by engineers logging in over SSH and RDP on weekends, and the auditor wants proof that critical patches are applied within 14 days. Several instances cannot be reached by Systems Manager at all. Nobody may SSH into production any more.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the patching automation and the operational controls around it.",
          parts: [
            part(
              "Make every instance manageable",
              "Ensures the SSM Agent runs and the instances have an instance profile with AmazonSSMManagedInstanceCore (or the account uses Default Host Management Configuration) and a network path to the Systems Manager endpoints (NAT or VPC endpoints), then checks Fleet Manager for the unreachable ones.",
              "An instance is 'managed' only when the SSM Agent is running, the instance role includes AmazonSSMManagedInstanceCore (or Default Host Management Configuration is turned on for the account), and it can reach the ssm, ssmmessages and ec2messages endpoints via NAT or interface VPC endpoints. The unreachable instances are missing one of the three; Fleet Manager shows which."
            ),
            part(
              "Patching schedule and baselines",
              "Uses Patch Manager with patch baselines (separate for Linux and Windows, auto-approving critical and security patches after a few days) and a patch policy or maintenance windows running AWS-RunPatchBaseline, staging first then production, targeted by tags.",
              "Patch Manager: a Linux and a Windows patch baseline that auto-approve Critical and Important security patches 3 days after release, applied through a patch policy (Quick Setup) or maintenance windows: staging on Tuesday night, production on Thursday night, each targeting Environment and App tags so billing and dispatch patch on different nights."
            ),
            part(
              "Rate control and safety",
              "Limits blast radius with Run Command or maintenance-window rate controls (max-concurrency, for example 10%, and max-errors, for example 2) and takes snapshots or AMIs before patching via an Automation runbook.",
              "Set concurrency to 10% of targets and the error threshold to 2 so a bad patch stops the run early, and precede the patch task with an Automation runbook that snapshots the root volumes. Patch the dispatch app one Availability Zone at a time."
            ),
            part(
              "Evidence and access",
              "Uses Patch Manager compliance reporting (compliance summary, exportable to S3) as the auditor's proof and replaces SSH/RDP with Session Manager, with sessions logged to S3 or CloudWatch Logs.",
              "Patch compliance in Patch Manager shows every instance's missing and installed patches by severity and can be exported to S3 for the auditor's 14-day evidence. Close port 22 and 3389 and use Session Manager for any interactive access, with session logs written to CloudWatch Logs or S3."
            ),
          ],
        },
      ],
    },
    // ----- Security and Compliance (2) -----
    {
      slug: "trace-an-access-denied",
      objective: "Troubleshooting and auditing access with CloudTrail, IAM Access Analyzer, and the IAM policy simulator",
      kind: "case",
      title: "Trace an access denial to the policy that caused it",
      brief:
        "A developer at Kingsmead Media (fictional), signed in as the role dev-media in a member account of the company's AWS Organization, cannot upload to the bucket kingsmead-renders. Her identity policy clearly allows s3:PutObject on that bucket. She has been retrying for an hour.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The error reads: 'User: arn:aws:sts::222233334444:assumed-role/dev-media/jane is not authorized to perform: s3:PutObject on resource: arn:aws:s3:::kingsmead-renders/final/cut1.mp4 with an explicit deny in a service control policy'.",
          ask: "Read the message. Which policy layer denied the request, and how does that fit the evaluation logic?",
          parts: [
            part(
              "Which layer",
              "Reads that the message names the policy type: an explicit deny in a service control policy attached in AWS Organizations, which no identity policy can override; explains that an explicit deny anywhere (SCP, permissions boundary, resource policy, identity policy) wins, and that SCPs set the ceiling for member accounts.",
              "The denial came from an SCP: the access-denied message now names the policy type, 'with an explicit deny in a service control policy'. Evaluation logic: any explicit deny in any applicable policy ends the request, and an SCP applies to every principal in the member account regardless of what the identity policy allows. Her policy is fine; the organization's guardrail blocks it."
            ),
            part(
              "Next step",
              "Looks at the SCPs attached to the account's OU chain for a Deny on s3:PutObject with a condition (for example requiring encryption headers or restricting Regions), and uses CloudTrail to see the request's details (Region, headers) that the condition tests.",
              "Open AWS Organizations and read the SCPs on the account and its parent OUs for a Deny s3:PutObject statement with a Condition. Pull the matching CloudTrail event for the PutObject call to see the Region it was sent to and the request parameters, which is what the condition evaluated."
            ),
          ],
        },
        {
          text: "The SCP denies s3:PutObject unless the request includes server-side encryption with KMS (s3:x-amz-server-side-encryption equals aws:kms). Her upload command sets no encryption header. Meanwhile the security team asks whether, after a fix, she could also write to any bucket she should not.",
          ask: "Fix the upload, and say which tools answer the security team's question before and after the change.",
          parts: [
            part(
              "The fix",
              "Has the upload specify SSE-KMS (and the key) so the SCP condition passes, or sets bucket default encryption with SSE-KMS so uploads comply; does not ask for the SCP to be loosened.",
              "Add --sse aws:kms (and --sse-kms-key-id for the renders key) to the upload, or set the bucket's default encryption to SSE-KMS so every object is encrypted whether or not the client asks. The SCP is doing its job; it stays."
            ),
            part(
              "Testing before, auditing after",
              "Uses the IAM policy simulator to test what dev-media can and cannot do against specific resources (it evaluates identity policies, boundaries, SCPs and resource policies), and CloudTrail plus IAM Access Analyzer unused-access findings afterwards to see what the role actually did and no longer needs.",
              "Before: run the IAM policy simulator for the dev-media role against s3:PutObject on each bucket ARN; it factors in the SCPs and resource policies, so it shows exactly where she would be allowed. After: CloudTrail shows what the role really did, and IAM Access Analyzer's unused-access analysis points out permissions it never used so they can be removed."
            ),
          ],
        },
        {
          text: "A week later IAM Access Analyzer raises an external access finding: the bucket kingsmead-renders is shared with an AWS account that is not in Kingsmead's organization.",
          ask: "Interpret the finding and decide what to do.",
          parts: [
            part(
              "External access finding",
              "Explains that the external access analyzer treats the organization as the zone of trust and flags resource policies granting access to principals outside it; investigates the bucket policy, confirms with the owner whether the partner access is intended, then either archives the finding as intended or removes the grant.",
              "The analyzer's zone of trust is the organization, so a bucket policy statement granting a principal from account 999988887777 is reported as external access. Read the bucket policy, find the statement, and ask the bucket owner: if it is a contracted partner, archive the finding with a note (and consider narrowing it to a prefix); if nobody knows, remove the statement and check CloudTrail for what that account accessed."
            ),
          ],
        },
      ],
    },
    {
      slug: "encrypt-existing-data-at-rest",
      objective: "Implementing, configuring, and troubleshooting encryption at rest with AWS KMS",
      kind: "build",
      title: "Bring an unencrypted environment up to the encryption-at-rest standard",
      brief:
        "Thornfield Insurance (fictional) has a new standard: all data at rest must be encrypted with customer managed AWS KMS keys. An audit finds: an Amazon RDS for MySQL instance (unencrypted, 400 GB); 30 EBS volumes (unencrypted) attached to running instances; an S3 bucket of claim scans with no default encryption; and a requirement to copy nightly EBS snapshots to a separate security account. The team asks what can be changed in place and what cannot.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the procedure for each resource and the KMS details that make the cross-account copy work.",
          parts: [
            part(
              "RDS instance",
              "States that an existing unencrypted RDS instance cannot be encrypted in place: take a snapshot, copy the snapshot with encryption enabled under the customer managed key, restore a new instance from the encrypted copy, then switch the application and retire the old instance; plans the cut-over window.",
              "You cannot turn encryption on for an existing DB instance. Take a manual snapshot, copy it with encryption enabled and the customer managed key selected, restore a new instance from the encrypted copy, repoint the application (or rename endpoints), then delete the old instance. Everything derived from the encrypted instance (backups, snapshots, replicas) is encrypted from then on."
            ),
            part(
              "EBS volumes",
              "States that an existing volume's encryption state or key cannot be changed: snapshot each volume, copy the snapshot with encryption (or a different key), create a new volume from the encrypted snapshot and swap it onto the instance; turns on EBS encryption by default for the Region so new volumes are encrypted automatically.",
              "A volume cannot be encrypted in place and its key cannot be changed afterwards. For each: snapshot, copy the snapshot with encryption under the customer managed key, create a volume from that copy in the same AZ, stop the instance, detach the old volume and attach the new one. Then enable EBS encryption by default in the Region with that key so no new unencrypted volume can appear."
            ),
            part(
              "S3 bucket",
              "Sets default bucket encryption to SSE-KMS with the customer managed key (with S3 Bucket Keys to reduce KMS calls) and notes that existing objects are not re-encrypted automatically; re-encrypts them by copying in place or with S3 Batch Operations; adds a bucket policy denying unencrypted uploads if required.",
              "Set default encryption to SSE-KMS with the claims key and enable S3 Bucket Keys to cut KMS request costs. Existing objects keep their old setting, so re-encrypt them with an S3 Batch Operations copy job (or a copy-in-place). Optionally deny PutObject without the aws:kms header in the bucket policy."
            ),
            part(
              "Cross-account snapshot copy",
              "Explains that snapshots encrypted with the AWS managed key (aws/ebs) cannot be shared with another account; they must use a customer managed key whose key policy grants the security account kms:Decrypt, kms:CreateGrant and the other needed actions, then the snapshot is shared and the other account copies it under its own key.",
              "Snapshots encrypted with the default AWS managed key cannot be shared at all, which is one reason the standard requires customer managed keys. Give the security account access in the key policy (kms:DescribeKey, Decrypt, ReEncrypt*, GenerateDataKey*, CreateGrant), share the snapshot with that account, and have it copy the snapshot re-encrypting with its own key so the copy no longer depends on Thornfield's key."
            ),
          ],
        },
      ],
    },
    // ----- Networking and Content Delivery (2) -----
    {
      slug: "cannot-reach-the-database",
      objective: "Troubleshooting VPC configurations: subnets, route tables, network ACLs, security groups, transit gateways, NAT gateways",
      kind: "case",
      title: "It cannot reach the database: work the path",
      brief:
        "Moorland Books (fictional) moved its application tier to a new private subnet last night. This morning the application cannot connect to its Amazon RDS for PostgreSQL instance (port 5432) in the data subnet, and the instances also cannot download packages from the internet. You have console access and VPC Flow Logs are enabled.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The database security group allows TCP 5432 from the application security group. The data subnet's network ACL has an inbound rule allowing TCP 5432 from the application subnet's CIDR and an outbound rule allowing TCP 5432 to it. Flow logs on the database's network interface show the inbound SYN as ACCEPT and the outbound reply as REJECT.",
          ask: "Where is the block, and why does the flow log look like that?",
          parts: [
            part(
              "Diagnosis",
              "Identifies the network ACL as the block: NACLs are stateless, so the database's reply travels from port 5432 to an ephemeral port on the client, and the outbound rule only allows destination port 5432; the ACCEPT then REJECT pair in the flow log is the signature of a stateless rule dropping return traffic.",
              "The network ACL. Security groups are stateful, so the SG rule for 5432 covers the reply automatically, but NACLs are stateless: the reply leaves the database from port 5432 to an ephemeral port (1024-65535) on the application instance, and the outbound NACL rule allows only destination port 5432. Flow logs showing the inbound ACCEPT and outbound REJECT on the same interface is exactly what a stateless rule dropping return traffic looks like."
            ),
            part(
              "Fix",
              "Adds an outbound NACL rule on the data subnet allowing TCP 1024-65535 to the application subnet's CIDR (and checks the application subnet's inbound NACL allows the ephemeral range back in), keeping rule numbers below any deny.",
              "Add outbound rule 110 on the data subnet NACL: TCP, port range 1024-65535, destination the application subnet CIDR, ALLOW; confirm the application subnet's inbound NACL allows TCP 1024-65535 from the data subnet (or is the default allow-all). Rule numbers must sit below any deny that would match first."
            ),
          ],
        },
        {
          text: "Database connections now work. The instances still cannot reach the internet for packages. The application subnet's route table has only the local route. A NAT gateway exists in the VPC, but it was created in a subnet whose route table also has only the local route.",
          ask: "Fix the outbound path and explain the two mistakes.",
          parts: [
            part(
              "Routes and NAT placement",
              "Adds a default route (0.0.0.0/0) in the application subnet's route table to the NAT gateway, and explains that this zonal NAT gateway must live in a public subnet whose route table sends 0.0.0.0/0 to the internet gateway, otherwise it has no way out either; moves or recreates it in a public subnet (or replaces it with a regional NAT gateway, which needs no public subnet).",
              "Two mistakes: the application route table never pointed 0.0.0.0/0 anywhere, and the NAT gateway sits in a subnet with no route to the internet gateway, so it is a private NAT with no exit. Create the zonal NAT gateway in a public subnet (0.0.0.0/0 -> igw) with an Elastic IP, then add 0.0.0.0/0 -> nat-gateway to the application subnet's route table. One zonal NAT gateway per AZ avoids cross-AZ dependency. The public-subnet rule applies to zonal NAT gateways, the kind created in a subnet; a regional NAT gateway is created for the VPC instead, needs no public subnet and expands across AZs as workloads appear, so it is the simpler alternative here."
            ),
          ],
        },
        {
          text: "The internet works, but the finance team's instances in another VPC attached to the same Transit Gateway can no longer reach the database. The Transit Gateway route table associated with the finance VPC has a route for the old application VPC CIDR but nothing for the new data subnet's CIDR, which was carved from a secondary CIDR block added to the VPC yesterday.",
          ask: "Complete the path end to end.",
          parts: [
            part(
              "Transit Gateway path",
              "Ensures the transit gateway route table used by the finance attachment has a route for the new CIDR to the database VPC's attachment (propagation or a static route), that the database VPC's subnet route tables send the finance CIDR to the transit gateway, and that the security group and NACL allow the finance CIDR on 5432 and the ephemeral range.",
              "Four hops to check: the finance TGW route table needs the new secondary CIDR routed to the database VPC attachment (re-enable propagation for that attachment or add a static route); the data subnet route table needs the finance VPC CIDR -> transit gateway; the data subnet NACL needs 5432 inbound and 1024-65535 outbound for the finance CIDR; the database security group needs 5432 from the finance CIDR. Flow logs on the database interface confirm when the SYN arrives and the reply is accepted."
            ),
          ],
        },
      ],
    },
    {
      slug: "route53-policies-and-logging",
      objective: "Implementing Route 53 routing policies, configurations, and query logging",
      kind: "build",
      title: "Set up Route 53 records, routing and query logging for a global site",
      brief:
        "Sablewood Outfitters (fictional) hosts shop.sablewood-example.com. Requirements: (1) the apex name sablewood-example.com must point at the Application Load Balancer, which has no fixed IP; (2) European users must be served from the eu-west-1 stack and everyone else from us-east-1, because EU customer data must stay in the EU; (3) a new checkout version should receive 5% of traffic for a week; (4) if the primary API in us-east-1 fails its health check, api.sablewood-example.com must switch to the standby in us-west-2 automatically; (5) security wants a record of the DNS queries the public hosted zone answers.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the record type or routing policy for each requirement and state the configuration detail that makes it work.",
          parts: [
            part(
              "Apex record",
              "Uses an alias record (A, alias to the ALB) because a CNAME is not allowed at the zone apex and the ALB has no fixed IP; notes alias queries to AWS resources are free.",
              "An A record with Alias pointing at the ALB's DNS name. A CNAME cannot exist at the zone apex, and the ALB's IPs change, so the alias record resolves them for you; Route 53 does not charge for alias queries to AWS resources."
            ),
            part(
              "EU versus rest of world",
              "Uses geolocation routing (continent Europe -> eu-west-1, default record -> us-east-1) rather than latency routing, because the requirement is where the user is, not which is fastest; includes a default record for unmatched locations.",
              "Geolocation routing: one record for the continent Europe pointing at the eu-west-1 ALB and a Default record pointing at us-east-1 for every other location. Latency-based routing would sometimes send an EU user to the US if it were faster, which breaks the data requirement; geolocation decides by the resolver's location, so a default record is essential."
            ),
            part(
              "Canary checkout and API failover",
              "Uses weighted routing with weights 95 and 5 for the checkout endpoint, and failover routing (primary with a Route 53 health check on the us-east-1 API, secondary in us-west-2) for the API, noting health checks and a low TTL.",
              "Weighted records for checkout: weight 95 to the current stack and 5 to the new one; adjust the weight each day. Failover records for api: PRIMARY alias to the us-east-1 endpoint with an associated Route 53 health check (or Evaluate Target Health on the alias), SECONDARY alias to us-west-2; keep TTLs low so clients follow the change quickly."
            ),
            part(
              "Query logging",
              "Enables DNS query logging on the public hosted zone to a CloudWatch Logs log group that must be in US East (N. Virginia), with the resource policy granting Route 53 permission, and distinguishes it from Resolver query logging for queries made from inside VPCs.",
              "Turn on query logging for the public hosted zone, sending to a CloudWatch Logs log group created in US East (N. Virginia), the only Region Route 53 accepts for this, and grant Route 53 permission with the log group resource policy. That logs what the public zone answers; queries from instances inside VPCs are a separate feature, Route 53 Resolver query logging."
            ),
          ],
        },
      ],
    },
  ],
};
