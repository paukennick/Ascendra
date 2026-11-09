import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-154: AWS Certified Security - Specialty (SCS-C03).
//
// Aligned to the SCS-C03 exam guide's six domains (Detection 16%, Incident
// Response 14%, Infrastructure Security 18%, Identity and Access Management
// 20%, Data Protection 18%, Security Foundations and Governance 14%; 50
// scored + 15 unscored questions, pass 750; checked 2026-11-07):
//   https://docs.aws.amazon.com/aws-certification/latest/security-specialty-03/security-specialty-03.html
// Density (docs/labs.md, policy "hybrid"): six units -> 2 per unit, 12 labs.
// Specialty depth: the exam asks for the control, the attack it stops and
// the evidence it leaves. Every lab follows least privilege and the current
// AWS security best practices (no long-term keys, no inbound 22, deny by
// default, central logging, break-glass with evidence).
//
// Figures, each read on the named AWS documentation page on 2026-11-07:
//   - Security group connection tracking (tracked connections survive a
//     rule removal until they time out; a network ACL change breaks them):
//     https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-connection-tracking.html
//   - CloudFront standard logging (legacy to S3 needs ACLs enabled and
//     Object Ownership not bucket-owner-enforced; v2 delivers to CloudWatch
//     Logs, Firehose or S3):
//     https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging-legacy-s3.html
//     https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging.html
//   - WAF rate-based rules (lowest limit 10; evaluation windows 60, 120, 300
//     or 600 seconds, default 300):
//     https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html
//   - KMS data protection (KMS HSMs are FIPS 140-3 Security Level 3
//     validated; CloudHSM key stores and external key stores):
//     https://docs.aws.amazon.com/kms/latest/developerguide/data-protection.html
//   - Resource control policies (restrict external principals; do not
//     affect the management account; supported services include S3, STS,
//     KMS, SQS, Secrets Manager):
//     https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_rcps.html
//   - Declarative policies (EC2 attributes: instance_metadata_defaults,
//     image_block_public_access, snapshot_block_public_access,
//     serial_console_access, vpc_block_public_access, allowed_images):
//     https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_declarative_syntax.html
//   - Centralized root access privileged tasks (sts:AssumeRoot with task
//     policies IAMAuditRootUserCredentials, IAMCreateRootUserPassword,
//     IAMDeleteRootUserCredentials, S3UnlockBucketPolicy,
//     SQSUnlockQueuePolicy; Regional STS endpoint):
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user-privileged-task.html

export const AWSSCS_LABS: SeedLabSet = {
  trackCode: "AWSSCS",
  sources: [
    source("https://docs.aws.amazon.com/aws-certification/latest/security-specialty-03/security-specialty-03.html", "exam_outline", "2026-11-07"),
    source("https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-connection-tracking.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging-legacy-s3.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/kms/latest/developerguide/data-protection.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_rcps.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_declarative_syntax.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user-privileged-task.html", "reference", "2026-11-07"),
  ],
  labs: [
    // ----------------------------------------------------------------------
    // Domain 1: Detection (2)
    // ----------------------------------------------------------------------
    {
      slug: "org-trail-log-archive",
      objective: "Configuring logging for AWS services: an organization-wide CloudTrail trail, a dedicated CloudWatch logging account, the CloudWatch Logs agent",
      kind: "build",
      title: "Build the organisation's audit log foundation",
      brief:
        "Dunmore Analytics has 35 accounts in an AWS Organization and has just failed an audit finding: 'API activity is not captured for every account; log files can be altered by account administrators.' You are to design the CloudTrail foundation: every account and Region covered including accounts created tomorrow; logs delivered to a Log Archive account nobody works in; proof that a file has not been changed; data-plane activity for two sensitive S3 buckets and all Lambda invocations; and the security team able to query the whole estate in one place.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the audit logging design.",
          parts: [
            part(
              "Organization trail",
              "Creates one organization trail from the management account (or a delegated administrator for CloudTrail) applying to all Regions and all accounts, including new ones automatically, so member accounts cannot turn it off; management events read and write enabled.",
              "An organization trail, created in the management account (or from a CloudTrail delegated administrator), multi-Region, logging management events (read and write) for every current and future member account. Members see the trail but cannot modify or stop it, which closes the 'not every account' gap."
            ),
            part(
              "Delivery to the Log Archive account",
              "Delivers to an S3 bucket in the Log Archive account with a bucket policy allowing only cloudtrail.amazonaws.com to PutObject (conditioned on aws:SourceArn / the organisation id) and bucket-owner-full-control ACL, SSE-KMS with a key in the Log Archive account whose policy allows CloudTrail to encrypt, S3 Block Public Access on, versioning and Object Lock (compliance mode) for retention, and no human principals with write or delete.",
              "Bucket dunmore-log-archive in the Log Archive account: policy allows s3:PutObject only to the cloudtrail.amazonaws.com service principal with Condition aws:SourceArn = the trail ARN and s3:x-amz-acl = bucket-owner-full-control; SSE-KMS with a customer managed key in the Log Archive account (key policy grants CloudTrail GenerateDataKey/Decrypt with the encryption context); Block Public Access on; versioning plus Object Lock in compliance mode for the retention period; an SCP denies s3:DeleteObject / PutBucketPolicy on it for everyone."
            ),
            part(
              "Integrity",
              "Enables CloudTrail log file validation (hourly digest files signed by CloudTrail, verifiable with validate-logs) and explains that it detects modification or deletion of delivered files -- combined with Object Lock it answers the 'files can be altered' finding.",
              "Turn on log file validation on the trail: CloudTrail writes signed digest files every hour that reference each log file's hash, and aws cloudtrail validate-logs proves no delivered file was modified, deleted or forged. Object Lock prevents the alteration; validation proves it did not happen."
            ),
            part(
              "Data events and central querying",
              "Adds data events (advanced event selectors) for the two sensitive buckets and for Lambda Invoke across the organisation, mindful of volume and cost, and sets up CloudTrail Lake (an organisation event data store) or Athena over the archive bucket so the security team queries all accounts in one place.",
              "Advanced event selectors: S3 data events scoped to the two bucket ARNs (resources.ARN StartsWith) and Lambda data events (eventCategory Data, resources.type AWS::Lambda::Function) for all functions -- scoped so the trail does not log every bucket in the estate. For querying, an organisation-wide CloudTrail Lake event data store (or an Athena table over the archive bucket partitioned by account, Region and date) gives one SQL interface across all 35 accounts."
            ),
          ],
        },
      ],
    },
    {
      slug: "missing-logs-case",
      objective: "Analyzing resource functionality, permissions, and configuration when logs are missing: Lambda, Amazon API Gateway, CloudFront",
      kind: "case",
      title: "Find out why three services are not logging",
      brief:
        "Selwood Travel's security team is investigating suspicious traffic to a booking API and finds that three components produce no logs. The stack is CloudFront -> API Gateway (REST API) -> Lambda. You are asked to find out why each is silent and fix it without granting more permission than needed.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The Lambda function runs successfully (invocations and duration metrics exist) but CloudWatch Logs has no log group for it. The function's execution role was 'tightened' last month to a custom policy allowing only dynamodb:GetItem on one table.",
          ask: "Why are there no logs, and what is the least-privilege fix?",
          parts: [
            part(
              "Cause and fix",
              "Identifies that the execution role lacks the CloudWatch Logs permissions (logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents) so the runtime cannot write logs even though the function runs; fixes by adding those three actions scoped to the function's log group ARN (arn:aws:logs:region:account:log-group:/aws/lambda/<function>:*), not the AWSLambdaBasicExecutionRole wildcard if the team wants strict scoping.",
              'The runtime writes logs with the execution role; without logs permissions nothing is written and no log group is created. Add to the role: {"Effect":"Allow","Action":["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],"Resource":"arn:aws:logs:eu-west-1:111122223333:log-group:/aws/lambda/booking-api:*"}. That is the minimum (the managed AWSLambdaBasicExecutionRole grants the same actions on all log groups).'
            ),
          ],
        },
        {
          text: "API Gateway: the stage shows 'CloudWatch Logs role ARN must be set in account settings to enable logging' when you try to enable execution logging, and access logging is off.",
          ask: "What is required for API Gateway logging, and how do you configure it so requests can be traced?",
          parts: [
            part(
              "Account-level role",
              "Explains that API Gateway REST APIs need an account-level IAM role (trusting apigateway.amazonaws.com, with permission to write to CloudWatch Logs, for example the AmazonAPIGatewayPushToCloudWatchLogs managed policy) set in the account settings before any stage can log, and that this is per Region per account.",
              "Create a role trusted by apigateway.amazonaws.com with the AmazonAPIGatewayPushToCloudWatchLogs policy (logs create/put on log groups and streams) and set its ARN in API Gateway's account settings for the Region. Without it the service has no identity to write logs with, which is exactly the error."
            ),
            part(
              "Stage logging",
              "Enables execution logging at the stage (INFO or ERROR, with 'log full requests/responses' off to avoid logging payload PII) and access logging to a dedicated log group with a JSON format including requestId, sourceIp, requestTime, httpMethod, resourcePath, status and integration latency, so each request can be correlated with the Lambda log via the request id.",
              "On the stage: execution logging level INFO (no full request/response data -- bookings contain personal details), and access logging to /apigw/booking-api/access with a format such as {\"requestId\":\"$context.requestId\",\"ip\":\"$context.identity.sourceIp\",\"time\":\"$context.requestTime\",\"method\":\"$context.httpMethod\",\"path\":\"$context.resourcePath\",\"status\":\"$context.status\",\"integrationLatency\":\"$context.integrationLatency\"}. The requestId lines up with the Lambda invocation's log."
            ),
          ],
        },
        {
          text: "CloudFront: standard (legacy) logging is configured to deliver to S3 bucket selwood-cf-logs, but the bucket is empty. The bucket was created recently with the default settings (Object Ownership: bucket owner enforced).",
          ask: "Why does CloudFront deliver nothing, and what are the two ways to fix it?",
          parts: [
            part(
              "Cause",
              "Explains that legacy standard logging requires ACLs enabled on the bucket (it grants the awslogsdelivery account FULL_CONTROL via the bucket ACL), and a bucket with Object Ownership set to bucket owner enforced has ACLs disabled, so CloudFront cannot deliver.",
              "Legacy CloudFront standard logs are written by the awslogsdelivery account using the bucket ACL, so the bucket must have ACLs enabled. A new bucket defaults to Object Ownership 'bucket owner enforced', which disables ACLs, so delivery fails silently and the bucket stays empty."
            ),
            part(
              "Fixes",
              "Either (a) switches the bucket to ACLs enabled (Object Ownership: bucket owner preferred) and lets CloudFront set the ACL, or (b) preferably moves to standard logging (v2), which delivers through CloudWatch vended logs to CloudWatch Logs, Firehose or S3 using bucket policies rather than ACLs, supports field selection and Parquet, and can deliver cross-account to the Log Archive account.",
              "Option A: change Object Ownership to 'bucket owner preferred' so ACLs work, and re-save the distribution's logging settings. Option B (recommended): enable standard logging (v2) on the distribution with an S3 (or CloudWatch Logs / Firehose) delivery destination -- it uses a bucket policy for the delivery.logs.amazonaws.com principal, needs no ACLs, lets you choose fields and Parquet output, and can land directly in the Log Archive account's bucket."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 2: Incident Response (2)
    // ----------------------------------------------------------------------
    {
      slug: "compromised-instance-containment",
      objective: "Containing and eradicating threats, then recovering: network containment controls and restoring backups",
      kind: "case",
      title: "Contain, investigate and recover a compromised EC2 instance",
      brief:
        "At Westbrook Pharma, Amazon GuardDuty raises a high-severity finding: an EC2 instance in the production web Auto Scaling group is communicating with a known command-and-control server, and a second finding shows credential exfiltration -- the instance role's credentials have been used from an IP address outside AWS. The instance serves live traffic. You are the incident responder.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The instance is still in service behind the load balancer. The forensic team wants memory and disk preserved. Leadership wants the attacker's access cut off now.",
          ask: "What do you do in the first fifteen minutes, in what order, and why?",
          parts: [
            part(
              "Isolate without destroying evidence",
              "Removes the instance from service (Auto Scaling standby or detach so the ASG replaces it, deregister from the target group), enables termination protection and disables scale-in termination for it, then isolates it with a dedicated security group that has no inbound or outbound rules -- and knows that tracked existing connections survive a security group change until they time out, so to cut the active C2 session immediately it also applies a network ACL deny on the subnet or moves the instance to an isolation subnet.",
              "Put the instance in Standby in the ASG (so a replacement launches and traffic moves off it) and deregister it from the target group; set termination protection and protect it from scale-in. Replace its security groups with an isolation group that has no inbound or outbound rules. Because tracked connections are not cut by a security group change until they time out, add a network ACL deny for the instance's traffic (or move it to an isolation subnet with a deny-all NACL) so the live C2 connection drops now. Do not stop or terminate it yet: memory is evidence."
            ),
            part(
              "Revoke the stolen credentials",
              "Invalidates the exfiltrated role credentials: revoke active sessions on the instance's IAM role (an inline deny with a Condition on aws:TokenIssueTime earlier than now) and attach a new instance profile/role to the replacement fleet, then reviews CloudTrail for what the stolen credentials did (and whether they created anything persistent).",
              "On the instance role, use 'Revoke active sessions' (adds a policy denying everything for credentials issued before now, via the aws:TokenIssueTime condition) so the attacker's copy of the temporary credentials stops working wherever they are. Launch the replacements with a fresh role. Then search CloudTrail for that role's session from the external IP: what it read, and whether it created users, keys, roles or resources that would outlive the credentials."
            ),
          ],
        },
        {
          text: "The instance is isolated and credentials are revoked. Forensics asks for a memory capture and a disk image taken in a way that stands up to scrutiny, and the business asks when normal service resumes.",
          ask: "How do you capture evidence and when can you recover?",
          parts: [
            part(
              "Evidence capture",
              "Captures memory first via Systems Manager Run Command (an agentless-to-the-attacker path that needs no SSH) using a memory acquisition tool, then snapshots every EBS volume (tagged with case id, hashed, copied to a locked forensic account/bucket with Object Lock), and records every step with timestamps for chain of custody; mentions the Automated Forensics Orchestrator for Amazon EC2 solution as the automated version.",
              "Use Systems Manager Run Command to run a memory acquisition tool on the isolated instance (no inbound ports needed), writing the image to a forensic S3 bucket; then create EBS snapshots of all attached volumes, tag them with the case id, share/copy them to the forensic account, compute and record hashes, and store them with Object Lock. Log who did what and when. Automated Forensics Orchestrator for Amazon EC2 does this sequence automatically from a GuardDuty finding."
            ),
            part(
              "Recovery",
              "Recovers by replacing, not repairing: the ASG already launched clean instances from the trusted AMI; rotate every secret the instance could reach (database passwords, API keys in Secrets Manager), patch the vulnerability the forensics identifies before trusting the new fleet, and restores data from backups taken before the compromise if integrity is in doubt; keeps the isolated instance until forensics releases it.",
              "Service is already running on replacements launched from the golden AMI. Before declaring recovery: rotate every secret the compromised role or instance could reach, confirm the entry point from the forensics and patch it (new AMI via Image Builder), verify the data stores from backups predating the compromise if there is any sign of tampering, and only terminate the isolated instance once forensics signs off."
            ),
          ],
        },
        {
          text: "Forensics finds the attacker got in through an exposed admin endpoint and used the instance role's broad permissions to read secrets from three accounts.",
          ask: "What do you change so the next incident is smaller and faster to handle?",
          parts: [
            part(
              "Reduce blast radius and automate",
              "Applies least privilege to the instance role (only the secrets and tables that application needs), requires IMDSv2 to make credential theft from the instance harder, puts the admin endpoint behind authentication/VPN or AWS Verified Access, and automates the containment runbook (GuardDuty finding -> EventBridge -> Step Functions/SSM Automation performing isolation, snapshot and credential revocation) so the first fifteen minutes take one.",
              "Scope the role to exactly the secrets and tables the web tier uses, in its own account; enforce IMDSv2 (HttpTokens required) via launch template and a declarative policy; remove the admin endpoint from the internet (Verified Access or a private path); and wire the response: an EventBridge rule on high-severity GuardDuty findings starts a Step Functions workflow that moves the instance to standby, swaps in the isolation security group and NACL, snapshots volumes and revokes the role's sessions -- in a minute, with a human notified rather than required."
            ),
          ],
        },
      ],
    },
    {
      slug: "incident-readiness-plan",
      objective: "Preparing services for incidents: provisioning access ahead of time, deploying security tools, minimizing blast radius, configuring AWS Shield Advanced",
      kind: "build",
      title: "Prepare an organisation to respond before the incident",
      brief:
        "Greyhaven Media runs a public video platform across 20 accounts. During a recent DDoS and a separate credential-theft incident the response was slow: responders had no access to the affected accounts, logs lived only in those accounts, and nobody knew which runbook applied. The CISO asks for an incident-readiness design covering access, tooling, blast radius and DDoS protection, to be in place before the next event.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the incident-readiness design.",
          parts: [
            part(
              "Pre-provisioned responder access",
              "Creates an incident-response role in every account (deployed by StackSets) with the read/forensic permissions needed, assumable only from a Security account with MFA and a session condition, and a separate break-glass path; uses IAM Identity Center permission sets for responders; everything audited in CloudTrail.",
              "A SecurityIncidentResponder role in every account (StackSets), trust policy allowing only the Security account's responder role with aws:MultiFactorAuthPresent true and short session durations; permissions for read access, snapshotting, isolating security groups and revoking sessions -- not broad admin. Responders reach it through an Identity Center permission set. Pre-provisioned means nobody is requesting access during an incident."
            ),
            part(
              "Tools and evidence in place",
              "Enables GuardDuty, Security Hub, Inspector and Macie organisation-wide with delegated administration, centralises CloudTrail and VPC flow logs in a Log Archive account, pre-creates a forensic account with an isolation VPC, evidence buckets with Object Lock and analysis instances/AMIs, and pre-stages SSM Automation runbooks for containment.",
              "Security Tooling account as delegated admin for GuardDuty, Security Hub, Inspector and Macie across all 20 accounts; organisation CloudTrail and flow logs into the Log Archive account; a Forensics account with an isolated VPC, hardened analysis AMIs, Object Lock evidence buckets and KMS keys only responders can use; SSM Automation documents for isolate-instance, snapshot-volumes and revoke-role-sessions already deployed. Run a game day with AWS Fault Injection Service to prove they work."
            ),
            part(
              "Minimising blast radius",
              "Separates workloads into accounts by environment and sensitivity (Organizations OUs with SCPs), uses distinct roles per service with least privilege, keeps secrets in Secrets Manager per account, and applies network segmentation (private subnets, VPC endpoints, no shared admin credentials).",
              "One workload per account where practical, grouped in OUs (prod, non-prod, security, infrastructure) with SCPs that deny leaving the organisation and disabling security services; each service has its own narrowly scoped role; secrets stay in the owning account's Secrets Manager; private subnets and VPC endpoints so a compromise in one account cannot walk into another."
            ),
            part(
              "DDoS protection",
              "Subscribes to AWS Shield Advanced on the internet-facing resources (CloudFront distributions, Route 53 hosted zones, ALBs, Global Accelerator), configures health-check-based detection, enables proactive engagement and grants the Shield Response Team access (SRT role) ahead of time, pairs it with AWS WAF rate-based rules and managed rule groups, and notes the cost-protection benefit.",
              "Shield Advanced on the CloudFront distributions, the Route 53 hosted zones and the origin ALBs: associate Route 53 health checks for faster, more accurate detection, turn on proactive engagement so the Shield Response Team contacts the on-call, and pre-authorise the SRT with the AWSShieldDRTAccessPolicy role so they can apply WAF mitigations. AWS WAF web ACLs with rate-based rules and the managed rule groups sit in front; Shield Advanced also covers scaling costs from a DDoS."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 3: Infrastructure Security (2)
    // ----------------------------------------------------------------------
    {
      slug: "edge-protection-web-acl",
      objective: "Implementing network edge protection: AWS WAF, CloudFront headers, Shield Advanced, Amazon S3 CORS, AWS IoT policies, defenses for the OWASP Top 10",
      kind: "build",
      title: "Design the edge protection for a public web application",
      brief:
        "Linwood Marketplace serves a web application through CloudFront with an Application Load Balancer origin. Attackers have been (1) brute-forcing the login endpoint from thousands of IP addresses; (2) sending SQL injection and path traversal payloads; (3) bypassing CloudFront by calling the ALB's public DNS name directly; (4) scraping the catalogue from one country where the company does not trade. The security team also wants browser-side protections set by HTTP headers. Write the edge protection design.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the AWS WAF, CloudFront and origin-protection design.",
          parts: [
            part(
              "OWASP-style payloads",
              "Attaches an AWS WAF web ACL to the CloudFront distribution with AWS Managed Rules: the Core rule set (AWSManagedRulesCommonRuleSet), Known bad inputs and the SQL database rule set, run first in Count mode to measure false positives, then Block; scopes down or excludes specific rules that break legitimate requests rather than disabling the group.",
              "A web ACL on the CloudFront distribution with managed rule groups AWSManagedRulesCommonRuleSet (covers path traversal and many OWASP Top 10 patterns), AWSManagedRulesKnownBadInputsRuleSet and AWSManagedRulesSQLiRuleSet. Deploy in Count for a week, review the sampled requests and CloudWatch metrics, set specific noisy rules to Count with a scope-down statement, then switch the groups to Block."
            ),
            part(
              "Login brute force",
              "Adds a rate-based rule scoped to the login path aggregating by IP (or forwarded IP from CloudFront) with a limit tuned to legitimate use (the lowest allowed limit is 10) over an evaluation window (60, 120, 300 or 600 seconds; 300 is the default), action Block or CAPTCHA/Challenge; optionally the Account Takeover Prevention managed rule group.",
              "A rate-based rule with a scope-down statement for URI path /login, aggregated by IP address, limit for example 100 requests per 300-second window (the window can be 60, 120, 300 or 600 seconds; the limit can go as low as 10), action CAPTCHA or Block. For credential stuffing with rotating IPs, add the AWSManagedRulesATPRuleSet (Account Takeover Prevention) with the login path and credential fields configured."
            ),
            part(
              "Preventing CloudFront bypass",
              "Stops direct access to the ALB: CloudFront adds a secret custom origin header, and the ALB listener rule (or a WAF web ACL on the ALB) forwards only requests carrying it and returns 403 otherwise; also restricts the ALB security group to the CloudFront managed prefix list, and rotates the header secret.",
              "Configure the CloudFront origin to add a custom header, for example X-Origin-Verify with a secret value from Secrets Manager. On the ALB, the listener's default action is a fixed 403 and a rule forwards to the target group only when X-Origin-Verify matches. Tighten the ALB security group to allow 443 only from the com.amazonaws.global.cloudfront.origin-facing managed prefix list. Rotate the secret on a schedule with a Lambda that updates both ends."
            ),
            part(
              "Geography and browser headers",
              "Uses a WAF geo match rule (country codes) to block or challenge requests from the non-trading country (knowing geo IP is approximate and that CloudFront geographic restrictions are the alternative), and a CloudFront response headers policy to set Strict-Transport-Security, Content-Security-Policy, X-Content-Type-Options, X-Frame-Options and Referrer-Policy.",
              "A geo match rule for that country code with action Block (or Challenge if there could be legitimate travellers), understanding geolocation is best-effort; CloudFront's own geographic restriction is a coarser alternative. Attach a response headers policy to the distribution setting Strict-Transport-Security (long max-age, includeSubDomains), a Content-Security-Policy, X-Content-Type-Options nosniff, X-Frame-Options DENY and Referrer-Policy, so browsers enforce the protections regardless of what the origin sends."
            ),
          ],
        },
      ],
    },
    {
      slug: "secure-admin-access-session-manager",
      objective: "Configuring secure administrative access: Systems Manager Session Manager and EC2 Instance Connect",
      kind: "build",
      title: "Replace SSH bastions with audited administrative access",
      brief:
        "Pendle Software's operations team reaches 300 Linux EC2 instances through two bastion hosts with port 22 open to the office IP range and a shared SSH key that has not been rotated in two years. An audit requires: no inbound administrative ports anywhere; access tied to each person's identity with MFA; every command session recorded and retained; access to production limited to on-call engineers; private instances must work without internet access. Write the replacement design.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the administrative access design.",
          parts: [
            part(
              "Session Manager instead of SSH",
              "Uses AWS Systems Manager Session Manager: SSM Agent on every instance, an instance profile with AmazonSSMManagedInstanceCore (or Default Host Management Configuration), no inbound security group rules at all, the bastions and the shared key removed.",
              "Make every instance an SSM managed node (SSM Agent and an instance profile granting AmazonSSMManagedInstanceCore, or turn on Default Host Management Configuration). Sessions are initiated through Systems Manager, so remove every inbound port-22 rule, decommission both bastions and delete the shared key pair. Nothing listens for administrators."
            ),
            part(
              "Private connectivity",
              "Creates interface VPC endpoints for ssm, ssmmessages and ec2messages (and optionally s3/logs for session logging) in the private subnets so instances without a NAT gateway can reach Systems Manager; endpoint security groups allow 443 from the instances.",
              "Interface VPC endpoints com.amazonaws.<region>.ssm, .ssmmessages and .ec2messages in each private subnet's AZ, with a security group allowing TCP 443 from the instance subnets, plus a gateway endpoint for S3 and an interface endpoint for logs if session logs are sent there. No internet path is needed."
            ),
            part(
              "Identity, MFA and production restriction",
              "Grants ssm:StartSession through IAM Identity Center permission sets (federated identities with MFA) with resource conditions on instance tags (ssm:resourceTag/Environment = production only for the on-call group) and on the session document, and uses run-as to map each person to a named OS user rather than a shared one.",
              'Permission sets in IAM Identity Center with MFA enforced: operators get ssm:StartSession on instances tagged Environment = non-production; the on-call group gets a permission set allowing StartSession where ssm:resourceTag/Environment = production -- {"Effect":"Allow","Action":"ssm:StartSession","Resource":"arn:aws:ec2:*:*:instance/*","Condition":{"StringEquals":{"ssm:resourceTag/Environment":"production"}}} -- plus the SSM-SessionManagerRunShell document. Enable Run As with a per-user OS account tag so commands run as the named person, not ssm-user.'
            ),
            part(
              "Recording and retention",
              "Configures Session Manager preferences to log sessions to an S3 bucket and/or CloudWatch Logs group encrypted with KMS, with session data encryption using the same key, and relies on CloudTrail StartSession/TerminateSession events for who connected when; retention per policy and the log bucket writable only by the service.",
              "In Session Manager preferences: enable KMS encryption of session data, stream session logs to a CloudWatch Logs group and archive to an S3 bucket in the Log Archive account, both encrypted with a customer managed key the operators cannot read with. CloudTrail records every StartSession and TerminateSession with the federated identity. Retention follows the audit policy (for example one year), and the bucket policy denies deletes."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 4: Identity and Access Management (2)
    // ----------------------------------------------------------------------
    {
      slug: "unintended-access-findings-case",
      objective: "Investigating and correcting unintended permissions granted to a resource, service, or entity",
      kind: "case",
      title: "Work through three IAM Access Analyzer findings",
      brief:
        "Morrow Diagnostics enabled IAM Access Analyzer with the organisation as the zone of trust. The first report lists findings you must triage and fix without breaking legitimate integrations: a partner, a SaaS monitoring vendor and an internal data pipeline all depend on cross-account access.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Finding 1: S3 bucket morrow-lab-results is accessible by 'All principals' (public) through its bucket policy. The bucket policy was written to let a partner laboratory (account 444455556666) read result files and has \"Principal\": \"*\" with a Condition on aws:SourceIp for the partner's office IP range.",
          ask: "Is this a real exposure, and how do you fix it while keeping the partner working?",
          parts: [
            part(
              "Assessment and fix",
              "Treats it as a real finding: Principal * is public access, limited only by an IP condition that is weak (anyone on that network, IP spoofing of ranges in some flows, and no identity); fixes by naming the partner's role ARN as the principal (and optionally keeping the IP condition as defence in depth), turning on S3 Block Public Access, and re-checking that the finding resolves.",
              'Yes. "Principal": "*" makes the bucket public to anyone who can send from that IP range -- no identity is checked. Rewrite the statement with "Principal": {"AWS": "arn:aws:iam::444455556666:role/LabResultsReader"} and keep the aws:SourceIp condition as a second factor if the partner wants it. Then enable Block Public Access on the bucket (it would reject the old statement) and confirm Access Analyzer marks the finding resolved.'
            ),
          ],
        },
        {
          text: "Finding 2: IAM role MonitoringVendorAccess can be assumed by account 777788889999 (the SaaS monitoring vendor). Its trust policy allows sts:AssumeRole to the vendor's account root with no conditions, and the role has ReadOnlyAccess.",
          ask: "What is the risk, and how do you harden the trust without ending the integration?",
          parts: [
            part(
              "Confused deputy and over-broad trust",
              "Explains that trusting the vendor's account root lets any principal in that account assume the role, and that without an external ID a multi-tenant vendor can be tricked into using the role on another customer's behalf (the confused deputy problem); fixes by requiring sts:ExternalId with a unique value the vendor supplies, narrowing the principal to the vendor's specific role ARN if they publish one, and reducing ReadOnlyAccess to the services the vendor needs (CloudWatch, a few describe calls).",
              'Any principal in account 777788889999 can assume the role today, and a multi-tenant vendor without an external ID can be made to act on another customer\'s instruction against your account (confused deputy). Change the trust policy to the vendor\'s named role and add "Condition": {"StringEquals": {"sts:ExternalId": "<unique value from the vendor>"}}. Replace ReadOnlyAccess (which reads S3 objects and secrets metadata, among much else) with a policy limited to cloudwatch:Get*/List*, logs:Describe* and the specific describe actions the vendor documents.'
            ),
          ],
        },
        {
          text: "Finding 3: KMS key alias/pipeline-key is accessible by account 222233334444 (the internal data-pipeline account) and the finding is marked 'public: false'. The pipeline is the intended consumer, but the key policy statement grants kms:* to that account's root.",
          ask: "Should this finding be archived as intended, and what do you change anyway?",
          parts: [
            part(
              "Intended access, excessive grant",
              "Recognises the cross-account access as intended (archive the finding with an archive rule for that account) but narrows the key policy from kms:* to the operations the pipeline needs (kms:Decrypt, kms:GenerateDataKey, kms:DescribeKey) for the pipeline's role ARN, optionally with kms:ViaService, so the other account cannot schedule deletion or change the key policy; also reviews unused-access findings for the pipeline role.",
              'The access itself is intended, so create an archive rule for findings where the principal is account 222233334444 and the resource is this key. But kms:* to that account\'s root would let anyone there call ScheduleKeyDeletion or PutKeyPolicy; cut it to {"Effect":"Allow","Principal":{"AWS":"arn:aws:iam::222233334444:role/PipelineExecution"},"Action":["kms:Decrypt","kms:GenerateDataKey","kms:DescribeKey"],"Resource":"*","Condition":{"StringEquals":{"kms:ViaService":"s3.eu-west-1.amazonaws.com"}}}. Then run Access Analyzer unused-access findings on the pipeline role to trim what it never calls.'
            ),
          ],
        },
      ],
    },
    {
      slug: "policy-evaluation-least-privilege",
      objective: "Designing, reading, and implementing IAM policies to least privilege, including permissions boundaries and session policies",
      kind: "build",
      title: "Work out what four principals can actually do",
      brief:
        "Holloway Robotics' account has these facts. An SCP on the account's OU allows all actions except it denies s3:DeleteBucket and anything outside eu-west-1 and us-east-1 (with the usual global-service exceptions). Role DataEngineer has an identity policy allowing s3:* on arn:aws:s3:::holloway-data and arn:aws:s3:::holloway-data/*, dynamodb:* on all tables, and a permissions boundary that allows s3:GetObject, s3:PutObject, s3:ListBucket and dynamodb:Query, dynamodb:GetItem only. Bucket holloway-data's bucket policy denies s3:PutObject unless the request includes server-side encryption with KMS (s3:x-amz-server-side-encryption = aws:kms). A contractor assumes DataEngineer with a session policy allowing only s3:GetObject on holloway-data/reports/*. Decide each case and justify it with the evaluation logic.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Evaluate each request and write the general rule you used.",
          parts: [
            part(
              "DataEngineer: s3:DeleteBucket on holloway-data",
              "Denied: the SCP's explicit deny on s3:DeleteBucket wins over everything, regardless of the identity policy's s3:*; states that an explicit deny anywhere in the evaluation ends in deny.",
              "Denied. The SCP explicitly denies s3:DeleteBucket, and an explicit deny in any applicable policy overrides any allow -- the identity policy's s3:* and the boundary are never reached. (The boundary would also have blocked it, as it does not include DeleteBucket.)"
            ),
            part(
              "DataEngineer: dynamodb:PutItem on a table in eu-west-1",
              "Denied: the identity policy allows dynamodb:* but the permissions boundary allows only Query and GetItem; effective permissions are the intersection of identity policy and boundary, so an action not in the boundary is implicitly denied even with no explicit deny anywhere.",
              "Denied. The SCP allows it (right Region, no deny), the identity policy allows dynamodb:*, but the permissions boundary lists only dynamodb:Query and dynamodb:GetItem. Effective permissions are the intersection of the identity policy and the boundary, so PutItem falls outside and is implicitly denied."
            ),
            part(
              "DataEngineer: s3:PutObject to holloway-data/raw/file.csv without specifying SSE-KMS, from eu-west-1",
              "Denied: SCP allows, identity policy allows, boundary allows PutObject, but the bucket policy's explicit deny (condition not met: no aws:kms encryption header) applies; a resource-based explicit deny overrides; the same request with the SSE-KMS header would be allowed.",
              "Denied. Everything up the chain allows PutObject, but the bucket policy explicitly denies PutObject when s3:x-amz-server-side-encryption is not aws:kms, and an explicit deny in a resource policy ends the evaluation in deny. Resend with the x-amz-server-side-encryption: aws:kms header (and a key the role can use) and it is allowed."
            ),
            part(
              "Contractor session: s3:GetObject on holloway-data/reports/q3.pdf and on holloway-data/raw/file.csv",
              "reports/q3.pdf allowed (SCP allows; identity policy s3:* on the bucket objects; boundary includes GetObject; session policy includes GetObject on reports/*; no deny), raw/file.csv denied because the session policy limits the session to reports/* -- the session policy further intersects the role's effective permissions; summarises the rule: an explicit deny anywhere wins, then the request must be allowed by the SCP, the permissions boundary, the session policy and (for same-account access) either the identity policy or the resource policy.",
              "reports/q3.pdf: allowed -- SCP permits, identity policy grants s3:* on the bucket's objects, the boundary includes GetObject, the session policy includes GetObject on reports/*, and no deny applies. raw/file.csv: denied -- the session policy scopes this session to reports/*, so GetObject elsewhere is implicitly denied even though the role could normally read it. Rule: any explicit deny wins; otherwise the request must pass the SCP, the permissions boundary and the session policy, and be allowed by the identity policy or (same account) the resource policy."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 5: Data Protection (2)
    // ----------------------------------------------------------------------
    {
      slug: "choose-encryption-at-rest",
      objective: "Encryption at rest: choosing between AWS KMS and AWS CloudHSM, and client-side against server-side encryption",
      kind: "build",
      title: "Choose the key management approach for four datasets",
      brief:
        "Ashford Clinical Research stores four kinds of data. (1) Trial documents in S3, hundreds of millions of small objects, where the security team wants to control and audit the key and keep KMS request costs down. (2) A database whose regulator requires that the cryptographic module be FIPS 140-3 Level 3 validated and that the keys be under the customer's exclusive control in a single-tenant HSM. (3) Patient identifiers in DynamoDB that must be unreadable even to an administrator with full access to the table, including in backups and exports. (4) A legacy application that must keep its existing key material (generated in the company's own HSM) while moving to AWS, with the ability to delete the key material from AWS at any time. Choose the approach for each and justify it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the key management approach for each dataset.",
          parts: [
            part(
              "Trial documents in S3",
              "Chooses SSE-KMS with a customer managed key (key policy and CloudTrail give control and audit) and enables S3 Bucket Keys to cut KMS requests for the many small objects; explains SSE-S3 would not give key control and SSE-C would push key handling to the clients.",
              "SSE-KMS with a customer managed key, and S3 Bucket Keys enabled on the bucket: the key policy says who can use the key, every use is in CloudTrail, and the bucket key means S3 derives per-object keys from a bucket-level data key instead of calling KMS for each of hundreds of millions of objects. SSE-S3 gives no key control; SSE-C makes the application responsible for the keys."
            ),
            part(
              "Regulated database",
              "Recognises that AWS KMS's own HSMs are FIPS 140-3 Security Level 3 validated, so the validation level alone is met by standard KMS; the deciding requirement is single-tenant HSMs under exclusive customer control, which points to an AWS CloudHSM cluster -- either used directly or as an AWS KMS custom key store (CloudHSM key store) so AWS services can still integrate through KMS.",
              "The FIPS 140-3 Level 3 requirement alone is satisfied by standard AWS KMS, whose HSMs carry that validation. The single-tenant, exclusive-control requirement is what forces AWS CloudHSM: run a CloudHSM cluster and create a KMS custom key store (CloudHSM key store) backed by it, so the database's KMS key lives in the customer-controlled HSMs while RDS/EBS integrate through the normal KMS interface. Using CloudHSM directly is the alternative if no AWS-service integration is needed."
            ),
            part(
              "Patient identifiers in DynamoDB",
              "Chooses client-side encryption (the AWS Database Encryption SDK for DynamoDB, or the AWS Encryption SDK) with a KMS key the application role can use and administrators cannot, so ciphertext is what is stored, backed up and exported; explains server-side encryption at rest (which DynamoDB always has) does not hide data from a principal with table read access.",
              "Client-side field-level encryption with the AWS Database Encryption SDK for DynamoDB: the application encrypts the identifier attributes with data keys protected by a KMS key whose policy allows only the application role to decrypt. The table, its backups and exports hold ciphertext, so a table administrator sees nothing useful. DynamoDB's always-on server-side encryption protects the storage media, not against someone who can read the table."
            ),
            part(
              "Legacy key material",
              "Chooses a KMS key with imported key material (EXTERNAL origin): the company's HSM-generated key is wrapped with a KMS public key and imported, can be given an expiry, and can be deleted from KMS on demand (making the key unusable until re-imported); notes the customer is responsible for durability of the material and that imported material cannot be rotated automatically; mentions an external key store as the option if the key must never leave the company's HSM at all.",
              "A KMS key with imported key material: generate/export the key from the company HSM, wrap it with the KMS-provided RSA public key, import it with an optional expiration, and delete the material from KMS whenever required -- the key then fails until re-imported. The company keeps the only durable copy, and automatic rotation is not available for imported material. If the policy is that the key must never exist in AWS at all, an external key store (XKS) keeps it in the on-premises HSM and KMS forwards the operations."
            ),
          ],
        },
      ],
    },
    {
      slug: "immutable-records-integrity",
      objective: "Protecting data integrity: S3 Object Lock, S3 Glacier Vault Lock, versioning, digital code signing, file validation",
      kind: "build",
      title: "Make financial records and deployment artifacts tamper-evident",
      brief:
        "Carrow Capital must keep transaction records for seven years in a form that nobody -- not even the account's administrators -- can delete or alter, must be able to put a legal hold on specific records during litigation, must prove that audit logs delivered to S3 are unmodified, and must guarantee that only code signed by its release team runs in its Lambda functions. Write the integrity design.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the data-integrity design.",
          parts: [
            part(
              "Immutable records",
              "Uses S3 Object Lock in compliance mode with a seven-year default retention on a versioned bucket (Object Lock requires versioning), explaining that compliance mode cannot be shortened or removed by any user including the root user until retention expires, unlike governance mode which privileged users can bypass.",
              "Create the records bucket with versioning and Object Lock enabled, default retention mode COMPLIANCE for 7 years. In compliance mode no principal -- not an administrator, not the root user -- can delete or overwrite a locked version or shorten its retention until it expires. Governance mode would allow users with s3:BypassGovernanceRetention to override, which the requirement rules out."
            ),
            part(
              "Legal hold",
              "Applies S3 Object Lock legal holds to the specific object versions under litigation (independent of retention period, removable only by principals with s3:PutObjectLegalHold when the hold is lifted), rather than changing retention.",
              "Put a legal hold on the affected object versions: it has no expiry and blocks deletion regardless of the retention date, and is removed only by a principal allowed s3:PutObjectLegalHold when counsel says so. Retention periods stay as they are."
            ),
            part(
              "Audit log integrity",
              "Enables CloudTrail log file validation (signed digest files, validate-logs) and delivers the trail to a bucket that also has Object Lock, so modification is both prevented and detectable; optionally uses S3 checksums on upload for other evidence files.",
              "Enable CloudTrail log file validation so hourly digest files, signed by CloudTrail, chain the hashes of every delivered log file; aws cloudtrail validate-logs proves they are unmodified. Deliver the trail into an Object Lock bucket so alteration is prevented as well as detectable. For other evidence uploads, require and record S3 checksums (for example SHA-256) at upload."
            ),
            part(
              "Code signing for Lambda",
              "Uses AWS Signer: a signing profile owned by the release pipeline, a Lambda code signing configuration listing the allowed signing profile with untrusted artifact policy set to Enforce, attached to each function so unsigned or wrongly signed deployment packages are rejected; signing restricted by IAM to the release role.",
              "Create an AWS Signer signing profile for Lambda and let only the release pipeline's role call signer:StartSigningJob with it. Create a Lambda code signing configuration that allows that profile with UntrustedArtifactOnDeployment = Enforce, and attach it to every function; a deployment package without a valid signature from the profile is rejected at UpdateFunctionCode. Expired or revoked signatures also fail."
            ),
          ],
        },
      ],
    },
    // ----------------------------------------------------------------------
    // Domain 6: Security Foundations and Governance (2)
    // ----------------------------------------------------------------------
    {
      slug: "organization-policy-set",
      objective: "Organization policies that manage permissions: service control policies, resource control policies, AI service opt-out policies, declarative policies",
      kind: "build",
      title: "Write the organisation's policy set",
      brief:
        "Thistlewood Group has 40 accounts and four requirements for the whole organisation. (1) No account may disable CloudTrail or GuardDuty, leave the organisation, or operate outside eu-west-1 and eu-west-2 except for global services. (2) No S3 bucket, KMS key or SQS queue in any member account may ever be accessed by a principal outside the organisation, whatever a bucket policy says. (3) Every EC2 instance must use IMDSv2 and no AMI or EBS snapshot may be shared publicly, enforced even for service-linked roles and console defaults. (4) The company does not want its content used to improve AWS AI services. Write the four policies and say which policy type does what.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the policy set, one policy type per requirement.",
          parts: [
            part(
              "Service control policy",
              "Writes an SCP with Deny statements for cloudtrail:StopLogging/DeleteTrail/UpdateTrail, guardduty:DeleteDetector/DisassociateFromAdministratorAccount, organizations:LeaveOrganization, and a Region deny using aws:RequestedRegion not in the allowed list with NotAction for global services (IAM, STS, Organizations, CloudFront, Route 53, Support, etc.); explains an SCP limits principals in member accounts and never grants.",
              'SCP: {"Effect":"Deny","Action":["cloudtrail:StopLogging","cloudtrail:DeleteTrail","cloudtrail:UpdateTrail","guardduty:DeleteDetector","guardduty:DisassociateFromAdministratorAccount","organizations:LeaveOrganization"],"Resource":"*"} and {"Effect":"Deny","NotAction":["iam:*","sts:*","organizations:*","cloudfront:*","route53:*","support:*","budgets:*","health:*"],"Resource":"*","Condition":{"StringNotEquals":{"aws:RequestedRegion":["eu-west-1","eu-west-2"]}}}. An SCP caps what any principal in a member account can do; it does not grant anything, and it does not apply to the management account.'
            ),
            part(
              "Resource control policy",
              "Writes an RCP that denies s3:*, kms:*, sqs:* (supported RCP services) on all resources when aws:PrincipalOrgID is not the organisation's id (with an exception for AWS service principals via aws:PrincipalIsAWSService), explaining an RCP caps access to resources by external principals regardless of the resource policy and does not affect the management account.",
              'RCP: {"Effect":"Deny","Principal":"*","Action":["s3:*","kms:*","sqs:*"],"Resource":"*","Condition":{"StringNotEqualsIfExists":{"aws:PrincipalOrgID":"o-xxxxxxxxxx"},"BoolIfExists":{"aws:PrincipalIsAWSService":"false"}}}. An RCP is evaluated on the resource side: even if someone writes a bucket policy granting an outside account, the RCP denies it. It covers member accounts only, not resources in the management account, and only the services that support RCPs (S3, KMS, SQS, STS, Secrets Manager and others).'
            ),
            part(
              "Declarative policy",
              "Writes an EC2 declarative policy setting instance_metadata_defaults http_tokens to required, image_block_public_access to block_new_sharing and snapshot_block_public_access to block_all_sharing (serial_console_access disabled if desired), explaining declarative policies enforce service configuration at the control plane, so they hold for service-linked roles and console defaults where an SCP, which only governs API calls by principals, would not.",
              'Declarative policy: {"ec2_attributes":{"instance_metadata_defaults":{"http_tokens":{"@@assign":"required"}},"image_block_public_access":{"state":{"@@assign":"block_new_sharing"}},"snapshot_block_public_access":{"state":{"@@assign":"block_all_sharing"}},"serial_console_access":{"status":{"@@assign":"disabled"}}}}. Declarative policies set the service\'s own configuration, so they apply however the resource is created -- console default, CLI, service-linked role -- which an SCP cannot do, because an SCP only limits principals\' API calls.'
            ),
            part(
              "AI services opt-out policy",
              "Writes an AI services opt-out policy with default optOut for all services (services: default: opt_out_policy @@assign optOut) attached at the root, explaining it stops content from being used to develop and improve AWS AI services across the organisation.",
              'AI services opt-out policy at the root: {"services":{"default":{"opt_out_policy":{"@@assign":"optOut"}}}}. It opts every account out of having its content used to develop or improve AWS AI services (with @@operators_allowed_for_child_policies set so child OUs cannot opt back in).'
            ),
          ],
        },
      ],
    },
    {
      slug: "root-access-break-glass-case",
      objective: "Managing root user credentials: centralizing root access for member accounts, managing MFA, designing break-glass procedures",
      kind: "case",
      title: "Take control of root access across member accounts",
      brief:
        "Wrexham Software's 60 member accounts each have a root user whose email goes to whoever created the account; several root users have no MFA and nobody knows whether any have access keys. The security team has been asked to make root access safe and to design a break-glass process. Three situations arise over the following month.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Day 1: an audit demands that member-account root users be made unusable and that any emergency use be centrally controlled and logged.",
          ask: "What do you enable, and what does it change?",
          parts: [
            part(
              "Centralised root access",
              "Enables centralized root access for member accounts (IAM, from the management account, with trusted access and optionally a delegated administrator), which removes the root user credentials -- password, access keys, signing certificates, MFA -- from member accounts and prevents root sign-in and credential recovery there; privileged root-only actions are then performed through sts:AssumeRoot from the management or delegated admin account.",
              "Turn on centralized root access in IAM from the management account (enable trusted access for IAM in Organizations, and name a delegated administrator account for IAM if desired). Then delete the root credentials of every member account using the IAMDeleteRootUserCredentials task (and audit them first with IAMAuditRootUserCredentials). Member root users can no longer sign in or recover a password; the handful of root-only tasks are done as short-lived sessions through sts:AssumeRoot, each logged in CloudTrail."
            ),
            part(
              "Permission and guardrails",
              "Grants sts:AssumeRoot only to a tightly held role in the management/delegated admin account, constrained with the sts:TaskPolicyArn condition to specific task policies, requires MFA on that role, and alarms on every AssumeRoot event.",
              'A BreakGlassRootTasks role, assumable only by named security engineers with MFA, with {"Effect":"Allow","Action":"sts:AssumeRoot","Resource":"*","Condition":{"StringEquals":{"sts:TaskPolicyArn":["arn:aws:iam::aws:policy/root-task/IAMAuditRootUserCredentials","arn:aws:iam::aws:policy/root-task/IAMDeleteRootUserCredentials","arn:aws:iam::aws:policy/root-task/S3UnlockBucketPolicy","arn:aws:iam::aws:policy/root-task/SQSUnlockQueuePolicy"]}}}. An EventBridge rule on the AssumeRoot CloudTrail event pages the security channel every time it is used. Root credentials cannot call AssumeRoot.'
            ),
          ],
        },
        {
          text: "Day 12: a developer in member account 333344445555 attaches a bucket policy that denies every principal, including themselves, and the team's data pipeline is down. Nobody in the account can edit the policy.",
          ask: "How do you recover the bucket without restoring root credentials to the account?",
          parts: [
            part(
              "Privileged task",
              "Uses the break-glass role to call sts:AssumeRoot against the member account with the S3UnlockBucketPolicy task policy (a Regional STS endpoint, short duration such as 900 seconds), then deletes or corrects the bucket policy with the returned temporary credentials; records the incident.",
              "From the break-glass role: aws sts assume-root --target-principal 333344445555 --task-policy-arn arn=arn:aws:iam::aws:policy/root-task/S3UnlockBucketPolicy --duration-seconds 900 against a Regional STS endpoint. With the returned credentials run delete-bucket-policy (or put a corrected policy) on the bucket. The session can do nothing else, expires in 15 minutes and is logged with the engineer's identity; the account's root user stays without credentials."
            ),
            part(
              "Preventing a repeat",
              "Adds a preventive control: an SCP or IAM Access Analyzer policy validation in the pipeline that blocks bucket policies denying all principals, or at least requires a deny statement to exclude the account's admin role, and trains the team to test policies with the policy checks before applying.",
              "Add Access Analyzer policy validation to the IaC pipeline (it flags a policy that denies all principals) and an SCP that denies s3:PutBucketPolicy unless the request comes from the pipeline role, so hand-written lockouts cannot happen again. Policies get checked before they are applied."
            ),
          ],
        },
        {
          text: "Day 25: the management account's own root user still has a password and a hardware MFA device held by a finance manager who is leaving. The management account root cannot be managed by the central root feature.",
          ask: "Design the management-account root user's protection and the break-glass procedure around it.",
          parts: [
            part(
              "Management account root",
              "Locks the management account root down: email alias owned by the security team (not a person), strong unique password in a sealed/escrowed store, multiple MFA devices registered (hardware keys stored in separate secure locations), no access keys, and uses it only for the few root-only tasks; the central root feature does not apply to the management account.",
              "Point the root email at a security-team distribution list, reset the password and seal it in an escrow (physical safe or a vault with dual control), register at least two hardware MFA devices kept in separate secure locations (IAM supports multiple MFA devices for root), confirm there are no root access keys, and document the short list of tasks that genuinely need root. Centralized root access does not cover the management account, so these controls are the protection."
            ),
            part(
              "Break-glass procedure and detection",
              "Defines a two-person break-glass procedure (retrieve password and MFA under dual control, log the reason, time-boxed), CloudWatch alarm / EventBridge rule on root ConsoleLogin and any root API activity, and a post-use review including password rotation; tests the procedure on a schedule.",
              "Break-glass: two named people retrieve the sealed password and one MFA device, record the ticket and reason, use root only for the documented task, then rotate the password and reseal. Detection: an EventBridge rule on CloudTrail ConsoleLogin with userIdentity.type Root (and any root API call) pages the security channel, so every use is seen whether planned or not. Rehearse the procedure twice a year so the MFA devices and escrow are known to work."
            ),
          ],
        },
      ],
    },
  ],
};
