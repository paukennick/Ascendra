import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-153: AWS Certified Solutions Architect - Professional (SAP-C03),
// professional level.
//
// Aligned to the SAP-C03 exam guide's five domains (Architecture Design and
// Implementation Built for the Cloud 25%, Security, Compliance, and
// Governance 25%, Cost-Optimized Architecture Design 15%, Resilience,
// Migration, and Business Continuity 15%, Operational Excellence and
// Automation 20%; 65 scored questions, scaled 100-1,000, pass 720; SAP-C03
// delivered from 2026-11-17, SAP-C02's last day 2026-11-16):
//   https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03.html
// The labs name objectives of the five SAP-C03 units only (the SAP-C02 units
// are retired in the seed). Density (docs/labs.md, policy "hybrid"): one lab
// per domain plus six weighted extras -> 3 / 2 / 2 / 2 / 2. Professional
// scenarios are multi-account and multi-Region with conflicting
// requirements; the rubrics reward a design that names which requirement
// each part answers and what it trades away.
//
// Facts and the AWS pages they were checked against on 2026-11-07:
//   - Tenant isolation models (silo, pool) and DynamoDB's dynamodb:LeadingKeys
//     condition; API Gateway usage plans for per-client throttling:
//     https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/tenant-isolation.html
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
//     https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
//   - VPC peering is not transitive and refuses overlapping CIDRs; PrivateLink
//     endpoint services front a Network Load Balancer; Transit Gateway route
//     tables with associations and propagations:
//     https://docs.aws.amazon.com/vpc/latest/peering/invalid-peering-configurations.html
//     https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html
//     https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
//   - SQS FIFO: exactly-once processing, message groups, 5-minute
//     deduplication interval, 300 messages per second per partition (3,000
//     with batching); EventBridge retries a target for up to 24 hours and 185
//     attempts by default; Kinesis partition keys group records by shard;
//     DynamoDB conditional writes:
//     https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html
//     https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/high-throughput-fifo.html
//     https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html
//     https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html
//     https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cross-account.html
//     https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html
//   - Permissions boundaries, ExternalId and ABAC:
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html
//   - SCPs (no effect on the management account, apply to member root users,
//     never to service-linked roles) and RCPs (no effect on management-account
//     resources, apply to external principals accessing member resources,
//     service-linked roles exempt, 5,120-character limit, services including
//     S3, STS, KMS, SQS, Secrets Manager and ECR):
//     https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html
//     https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_rcps.html
//     https://docs.aws.amazon.com/organizations/latest/userguide/orgs_reference_limits.html
//   - Pricing used in the data-transfer lab (US East (N. Virginia) list prices
//     on the pages, read 2026-11-07): NAT gateway $0.045 per hour and $0.045
//     per GB processed; interface endpoints $0.01 per GB processed for the
//     first PB plus an hourly charge per AZ; gateway endpoints for S3 and
//     DynamoDB have no additional charge:
//     https://aws.amazon.com/vpc/pricing/
//     https://aws.amazon.com/privatelink/pricing/
//     https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
//   - DynamoDB on-demand and provisioned modes; Aurora Serverless v2 scales
//     from 0 ACUs; Aurora I/O-Optimized pays off when I/O exceeds 25% of
//     Aurora spend; Database Savings Plans (1-year term, up to 35%, not
//     combinable with RIs on the same workload):
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html
//     https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html
//     https://aws.amazon.com/rds/aurora/pricing/
//     https://aws.amazon.com/savingsplans/database-pricing/
//   - S3 Object Lock (versioning required; compliance mode cannot be
//     overridden even by the root user; governance mode needs special
//     permissions; legal holds), AWS Backup Vault Lock (compliance mode grace
//     time at least 72 hours, then immutable), logically air-gapped vaults
//     (shareable to other accounts through AWS RAM), EBS snapshot lock:
//     https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html
//     https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html
//     https://docs.aws.amazon.com/aws-backup/latest/devguide/logicallyairgappedvault.html
//     https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshot-lock.html
//   - Aurora Global Database (replication latency typically under a second,
//     switchover with no data loss versus failover, RTO in minutes, RPO in
//     seconds) and Route 53 Application Recovery Controller routing controls:
//     https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
//     https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
//     https://docs.aws.amazon.com/r53recovery/latest/dg/what-is-route53-recovery.html
//   - Cross-account CodePipeline (customer managed KMS key on the artifact
//     store, roles in the target accounts); CloudFormation Hooks (proactive,
//     fail or warn); Config managed rules s3-bucket-public-read-prohibited and
//     s3-account-level-public-access-blocks-periodic; account-level S3 Block
//     Public Access:
//     https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-create-cross-account.html
//     https://docs.aws.amazon.com/cloudformation-cli/latest/hooks-userguide/what-is-cloudformation-hooks.html
//     https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-public-read-prohibited.html
//     https://docs.aws.amazon.com/config/latest/developerguide/s3-account-level-public-access-blocks-periodic.html
//     https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
// Every lab is needs_expert_review until a person checks it.

export const AWSSAP_LABS: SeedLabSet = {
  trackCode: "AWSSAP",
  sources: [
    source("https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-03/solutions-architect-professional-03.html", "exam_outline", "2026-11-07"),
    source("https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/vpc/latest/peering/invalid-peering-configurations.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/high-throughput-fifo.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-retry-policy.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_rcps.html", "reference", "2026-11-07"),
    source("https://aws.amazon.com/vpc/pricing/", "cloud_pricing_limits", "2026-11-07"),
    source("https://aws.amazon.com/privatelink/pricing/", "cloud_pricing_limits", "2026-11-07"),
    source("https://aws.amazon.com/rds/aurora/pricing/", "cloud_pricing_limits", "2026-11-07"),
    source("https://aws.amazon.com/savingsplans/database-pricing/", "cloud_pricing_limits", "2026-11-07"),
    source("https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-create-cross-account.html", "reference", "2026-11-07"),
    source("https://docs.aws.amazon.com/cloudformation-cli/latest/hooks-userguide/what-is-cloudformation-hooks.html", "reference", "2026-11-07"),
  ],
  labs: [
    // ----- Architecture Design and Implementation Built for the Cloud (3) -----
    {
      slug: "saas-tenant-isolation-design",
      objective: "Multi-tenant architectures and tenant isolation: siloed versus pooled resources, Cognito tenant context, row-level security, per-tenant encryption",
      kind: "build",
      title: "Design tenant isolation for a two-tier SaaS platform",
      brief:
        "Halverson Payroll (fictional) sells payroll software to 3,000 small businesses on a Standard plan and 40 banks on a Premium plan. Premium contracts require that a bank's data is stored and encrypted separately from any other customer and that a failure or noisy workload from another tenant cannot affect them. Standard customers must be cheap to serve. The platform is API Gateway, Lambda and DynamoDB, with Amazon Cognito for sign-in. Last quarter a bug let one Standard tenant's report query return another tenant's rows, and a Standard tenant's bulk import slowed the API for everyone.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the isolation model, the tenant-aware access path, the data-layer enforcement and the noisy-neighbor control.",
          parts: [
            part(
              "Isolation model per tier",
              "Chooses a silo model for Premium (dedicated tables or a dedicated account/stack per bank, per-tenant KMS key) and a pool model for Standard (shared tables partitioned by tenant ID), and explains the cost-versus-isolation trade-off and what the contracts require.",
              "Premium: silo, one dedicated DynamoDB table set (or a dedicated account and stack for the largest banks) per bank, each encrypted with that tenant's own customer managed KMS key, so the contract's 'stored and encrypted separately' is literally true. Standard: pool, shared tables with the tenant ID as the leading partition-key component, because 3,000 small tenants cannot each carry dedicated infrastructure cost."
            ),
            part(
              "Tenant context from sign-in",
              "Puts the tenant ID (and tier) into Cognito tokens as a custom claim set at sign-up, verifies the JWT at API Gateway (Cognito or Lambda authorizer), and passes the tenant context from the token rather than from request parameters a caller could alter.",
              "Each user's Cognito profile carries custom:tenant_id and custom:tier, which appear as claims in the ID/access token. API Gateway validates the token and the function reads the tenant from the verified claim, never from a path or body parameter, so a user cannot name another tenant."
            ),
            part(
              "Enforcing it at the data layer",
              "Has the function assume a tenant-scoped role (or apply a session policy) built from the token's tenant ID with a dynamodb:LeadingKeys condition restricting reads and writes to items whose partition key begins with that tenant, so the earlier cross-tenant query is impossible even with a code bug; mentions row-level security as the relational equivalent.",
              "The Lambda function exchanges the verified tenant ID for short-lived credentials: STS AssumeRole with a session policy whose Condition is ForAllValues:StringLike dynamodb:LeadingKeys = ['TENANT#<tenant_id>*']. A query that forgets the tenant filter now fails with AccessDenied instead of leaking rows. In a relational store the equivalent is row-level security keyed on the session's tenant."
            ),
            part(
              "Noisy neighbors",
              "Throttles per tenant with API Gateway usage plans and API keys (or a tiered Lambda concurrency allocation), routes bulk imports to an asynchronous queue with per-tenant concurrency, and gives Premium tenants separate capacity so a Standard tenant's burst cannot slow them.",
              "Per-tenant API Gateway usage plans set a rate and burst for each Standard tenant and a higher one for Premium; bulk imports go to an SQS queue processed with a per-tenant concurrency cap instead of the synchronous API. Premium's silo stacks have their own API stage and function concurrency, so a Standard tenant's import cannot touch a bank."
            ),
          ],
        },
      ],
    },
    {
      slug: "connect-60-accounts",
      objective: "Multi-VPC and multi-account connectivity: VPC peering and AWS PrivateLink",
      kind: "build",
      title: "Connect 60 accounts, two of which overlap",
      brief:
        "Cobalt Energy (fictional) has grown to 60 AWS accounts in one Organization, each with a VPC. Requirements: (1) every production VPC needs private connectivity to a shared-services VPC (directory, logging, artifact repositories) and, in future, to the on-premises data center; (2) development VPCs must never route to production VPCs; (3) a newly acquired company's two VPCs use 10.0.0.0/16, the same range as Cobalt's shared-services VPC, and must consume an internal licensing API hosted there; (4) a partner outside the Organization must call one internal API without any network path into Cobalt's VPCs. The current state is 30 ad hoc VPC peering connections that nobody can draw.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the connectivity, assigning the right construct to each requirement and stating why the alternatives fail.",
          parts: [
            part(
              "Hub for most VPCs",
              "Replaces the peering mesh with AWS Transit Gateway shared to the Organization through AWS RAM, attaching the non-overlapping VPCs, and explains why peering fails at this scale: not transitive, so a full mesh is needed, and no central routing or future Direct Connect path.",
              "A Transit Gateway in a network account, shared to all 60 accounts via AWS RAM, with each VPC attached. Peering cannot do this: it is not transitive, so reaching shared services from 59 VPCs needs 59 peerings and any-to-any needs a mesh, and peering gives no single place to attach Direct Connect later. The TGW is that place."
            ),
            part(
              "Segmentation",
              "Uses separate transit gateway route tables (production, development, shared services) with controlled associations and propagations so dev attachments have routes to shared services but no routes to production CIDRs.",
              "Two or three TGW route tables: prod attachments associate with the prod table, dev with the dev table. Shared-services routes propagate into both; production VPC routes propagate only into the prod table. With no route to a production CIDR in the dev table, dev-to-prod traffic has nowhere to go, enforced by the gateway rather than by every team's NACLs."
            ),
            part(
              "The overlapping VPCs",
              "Uses AWS PrivateLink: expose the licensing API behind a Network Load Balancer as an endpoint service and create interface endpoints in the acquired VPCs, because peering and TGW both refuse or cannot route overlapping CIDRs, while PrivateLink is one-directional and needs no routable address space.",
              "PrivateLink. Peering rejects overlapping CIDRs outright and a TGW cannot route two identical 10.0.0.0/16 ranges. Put the licensing API behind a Network Load Balancer, publish it as an endpoint service, and create interface endpoints in the acquired VPCs; traffic flows one way to the service through the endpoint's local IP addresses, so the overlap never matters. Renumbering those VPCs is the long-term fix if they need full connectivity."
            ),
            part(
              "The external partner",
              "Also uses PrivateLink, allowing the partner's account on the endpoint service (acceptance required), so they reach only that API, with no VPC route, peering or TGW attachment; optionally fronted by API Gateway with a VPC endpoint.",
              "Also PrivateLink: allow the partner's AWS account principal on the endpoint service with acceptance required, so they create an interface endpoint in their own VPC and can call that one API and nothing else. No peering, no TGW attachment, no route into Cobalt, and the endpoint can be revoked in one step."
            ),
          ],
        },
      ],
    },
    {
      slug: "payments-event-guarantees",
      objective: "Event-driven architectures and their messaging guarantees: idempotency, ordering, and delivery with EventBridge, SQS FIFO and standard queues, SNS, and Kinesis partition keys",
      kind: "case",
      title: "Fix the delivery guarantees of a payments event platform",
      brief:
        "Brackenridge Pay (fictional) processes card payments across three accounts: a payments account that emits events, a ledger account that records them, and an analytics account. Events flow through EventBridge from the payments account to targets in the other two. Peak load is 2,000 payment events per second across 400,000 merchant accounts.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The ledger team reports that about 0.3% of payments appear twice in the ledger. Their consumer is a Lambda function on an SQS standard queue fed by an EventBridge rule. Each duplicate has the same payment ID and a delivery time a few seconds apart.",
          ask: "Explain the duplicates in terms of the delivery guarantees in play, and make the ledger correct.",
          parts: [
            part(
              "Why duplicates are expected",
              "Explains that EventBridge retries delivery to a target (by default for up to 24 hours and up to 185 attempts) and SQS standard queues deliver at least once, so duplicates are a property of the pipeline, not a bug; the consumer must be idempotent.",
              "Every hop here is at-least-once: EventBridge retries a target that returns an error or times out (by default up to 24 hours and 185 attempts), and a standard SQS queue can deliver a message more than once. A 0.3% duplicate rate under retries is normal behavior; the ledger consumer was written as if delivery were exactly-once."
            ),
            part(
              "Idempotent consumer",
              "Makes the ledger write idempotent using the payment ID as an idempotency key with a DynamoDB conditional write (attribute_not_exists) or a unique constraint, and optionally a TTL on the idempotency record; keeps the standard queue for throughput.",
              "Record each payment ID with a conditional PutItem (ConditionExpression attribute_not_exists(paymentId)) in an idempotency table before posting to the ledger; a duplicate fails the condition and is dropped. Set a TTL on those records longer than the longest possible retry window. The standard queue stays because the ledger does not need ordering, only correctness."
            ),
          ],
        },
        {
          text: "Next, a merchant's balance went negative: a 'refund' event was processed before the 'capture' it refunded. Both came from the same merchant within 200 ms. The merchants' balance service requires events for one merchant in order, but merchants are independent of each other.",
          ask: "Redesign the balance service's path for ordering, and quantify the throughput constraint you introduce.",
          parts: [
            part(
              "Ordering per merchant",
              "Uses an SQS FIFO queue with MessageGroupId = merchant ID (or a Kinesis stream with the merchant ID as partition key) so events for one merchant are processed in order while different merchants proceed in parallel; notes FIFO's exactly-once processing and 5-minute deduplication.",
              "An SQS FIFO queue with MessageGroupId set to the merchant ID: SQS preserves order within a message group and processes groups in parallel, so capture precedes refund for each merchant while 400,000 merchants are independent. FIFO also deduplicates on MessageDeduplicationId within a 5-minute window. The alternative is a Kinesis data stream with merchant ID as the partition key, which orders records within a shard."
            ),
            part(
              "Throughput maths",
              "States the FIFO quota (300 messages per second per partition for each of send, receive and delete, or 3,000 with batching) against the 2,000 events per second peak and concludes that batching or high-throughput FIFO mode (more partitions) is required, and that the EventBridge target must be the FIFO queue with the group ID mapped.",
              "A FIFO queue partition handles 300 messages per second per action, or 3,000 with batches of 10; at a 2,000 per second peak the balance path must either batch sends and receives or enable high-throughput FIFO mode so the queue spreads message groups over many partitions. The EventBridge rule targets the FIFO queue with MessageGroupId taken from the event's merchantId field."
            ),
          ],
        },
        {
          text: "Finally, the analytics account lost a day of events when its target Firehose stream was misconfigured. Compliance wants cross-account delivery to be recoverable, and the security team wants the analytics account to receive only payment events, never the refund-fraud events that also flow on the bus.",
          ask: "Design the cross-account routing so it is recoverable and least-privilege.",
          parts: [
            part(
              "Recoverable, filtered cross-account routing",
              "Routes from the payments bus to a custom event bus in the analytics account (resource-based policy on the receiving bus allowing the payments account or Organization, IAM role on the sending rule), with an event pattern on the rule that matches only payment event types, and an EventBridge archive on the payments bus so lost days can be replayed; adds a dead-letter queue on the cross-account target.",
              "The payments bus rule has an event pattern matching detail-type 'PaymentCaptured' and 'PaymentRefunded' only, so fraud events never leave; its target is the analytics account's custom bus, whose resource policy allows PutEvents from the payments account (or from the Organization ID), with an IAM role on the sending rule. Create an archive on the payments bus with the same pattern and a retention of, say, 90 days so a misconfigured day can be replayed into the analytics bus, and attach a dead-letter queue to the cross-account target to catch delivery failures."
            ),
          ],
        },
      ],
    },
    // ----- Security, Compliance, and Governance (2) -----
    {
      slug: "least-privilege-four-parties",
      objective: "Least-privilege access: cross-account roles, temporary credentials, permissions boundaries, external IDs, session policies, ABAC",
      kind: "build",
      title: "Design least-privilege access for four kinds of principal",
      brief:
        "Wexford Clinical Trials (fictional) runs 25 AWS accounts. Four access needs arrive the same week. (1) A monitoring vendor, SaaS-based, must read CloudWatch metrics in every account from the vendor's own AWS account; the vendor has 900 other customers. (2) Platform engineers must be allowed to create IAM roles for the applications they deploy, but must never be able to create a role more powerful than themselves or one that touches the billing or audit accounts. (3) Data scientists on 'trial-alpha' and 'trial-beta' must each access only the S3 buckets, EC2 instances and Secrets Manager secrets tagged with their own trial, and new trials start monthly. (4) A support engineer occasionally needs 30 minutes of read-only access in a production account for an incident, from an identity that normally has no production access.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the mechanism for each need, the policy element that makes it safe, and the failure it prevents.",
          parts: [
            part(
              "Vendor",
              "Creates a cross-account IAM role in each account trusting the vendor's account with sts:ExternalId required in the trust policy, read-only CloudWatch permissions, explaining that the external ID defeats the confused deputy where another vendor customer names Wexford's role ARN.",
              "A role cloudwatch-reader in every account whose trust policy allows the vendor's account to assume it only with Condition sts:ExternalId equal to the unique value the vendor generated for Wexford, and a permissions policy of cloudwatch:GetMetricData, ListMetrics and the like. Without the external ID, any of the vendor's 900 customers could ask the vendor to assume Wexford's role by guessing the ARN."
            ),
            part(
              "Platform engineers",
              "Uses a permissions boundary: the engineers may call iam:CreateRole and iam:AttachRolePolicy only when the new role carries the mandated boundary policy (iam:PermissionsBoundary condition), and the boundary itself excludes billing and audit access, so delegated role creation cannot escalate.",
              "Engineers get iam:CreateRole, PutRolePolicy and AttachRolePolicy only with Condition StringEquals iam:PermissionsBoundary = arn:aws:iam::<account>:policy/app-boundary, and may not edit that policy. The boundary sets the maximum permissions any role they create can have, excluding Organizations, billing, the audit account's trust and IAM itself, so a created role can never exceed the boundary however generous its own policies look."
            ),
            part(
              "Data scientists",
              "Uses attribute-based access control: principals tagged trial=alpha or trial=beta (via IAM Identity Center attributes for access control or role tags) and policies that allow actions only when aws:ResourceTag/trial equals aws:PrincipalTag/trial, plus a tag policy or SCP preventing users from retagging; a new trial is a new tag value, not a new policy.",
              "ABAC: each scientist's session carries PrincipalTag trial (set from the identity provider's attribute through IAM Identity Center), and one policy allows s3, ec2 and secretsmanager actions with Condition StringEquals aws:ResourceTag/trial = ${aws:PrincipalTag/trial}. A new trial means tagging its resources and users with the new value; nobody edits a policy. Lock the tag with an SCP that denies changing the trial tag except for the platform role."
            ),
            part(
              "Break-glass support",
              "Uses a time-bound assumed role (temporary credentials via IAM Identity Center permission set or sts:AssumeRole with a short session duration, requiring MFA) with read-only permissions, optionally narrowed further with a session policy, and logged and alerted through CloudTrail.",
              "A prod-incident-readonly permission set (or role) that the support engineer can only request with MFA, session duration capped at one hour (aws:MultiFactorAuthPresent in the trust policy), ReadOnlyAccess narrowed by a session policy to the services involved, and a CloudTrail-driven EventBridge rule that notifies the security channel every time it is assumed. Access ends when the session expires; nothing is permanently granted."
            ),
          ],
        },
      ],
    },
    {
      slug: "scp-rcp-data-perimeter",
      objective: "Policy enforcement with service control policies (SCPs) and resource control policies (RCPs)",
      kind: "build",
      title: "Build a data perimeter with SCPs and RCPs",
      brief:
        "Ravensworth Bank (fictional) runs an Organization of 80 accounts. Three incidents this year: an engineer in a sandbox account launched instances in a Region the bank has not approved; a contractor's IAM user access key, used from a laptop at home, read objects from a production bucket whose bucket policy had been widened; and a team disabled GuardDuty in their account to 'reduce noise'. The CISO asks for organization-wide controls that cannot be undone by account administrators, and wants to know exactly what each control does and does not cover.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the control set, choosing SCP or RCP for each incident, and state the limits of each policy type.",
          parts: [
            part(
              "Region and security-service guardrails",
              "Uses SCPs attached to the OUs: a Deny for all actions when aws:RequestedRegion is outside the approved list (with exemptions for global services), and a Deny on guardduty:DeleteDetector, DisassociateFromMasterAccount and similar (plus CloudTrail StopLogging, Config delete), explaining SCPs limit what principals in member accounts can do.",
              "SCPs: one statement Deny * with Condition StringNotEquals aws:RequestedRegion in [eu-west-1, eu-west-2] and a NotAction list for global services such as IAM, STS, Organizations, CloudFront, Route 53 and Support; a second Deny on guardduty:DeleteDetector, guardduty:UpdateDetector, guardduty:DisassociateFromAdministratorAccount, cloudtrail:StopLogging and config:DeleteConfigurationRecorder. An SCP caps what any principal in the attached accounts can do, including each member account's root user."
            ),
            part(
              "The contractor and the bucket",
              "Uses an RCP on the Organization root: Deny s3:* (and other RCP-supported services) when aws:PrincipalOrgID is not the bank's Organization ID, with exceptions for AWS service principals, so a widened bucket policy still cannot grant external principals access; explains that this is a resource-side control an SCP cannot provide because SCPs do not apply to principals outside the Organization.",
              "An RCP attached at the root: Deny s3:*, sqs:*, kms:*, secretsmanager:*, sts:* on Resource * with Condition StringNotEqualsIfExists aws:PrincipalOrgID = o-ravensworth and BoolIfExists aws:PrincipalIsAWSService false. Now a bucket policy that grants an outside account or an anonymous reader is overridden for every bucket in the Organization. This is the gap SCPs leave: an SCP governs the bank's own principals and says nothing about an external principal reading a bank resource; the RCP sits on the resource side."
            ),
            part(
              "The leaked key itself",
              "Adds a principal-side control for credentials used from outside: an SCP denying access when the request comes from outside the bank's networks or VPC endpoints (aws:SourceIp / aws:SourceVpc conditions, with service exceptions), and reduces long-term keys by moving humans to IAM Identity Center; notes the contractor key would have been blocked at the network perimeter.",
              "Complete the perimeter on the identity side with an SCP that denies requests not arriving from the corporate IP ranges or the bank's VPC endpoints (Condition NotIpAddressIfExists aws:SourceIp and StringNotEqualsIfExists aws:SourceVpc, with exceptions for AWS services calling on the bank's behalf). A key used from a home laptop then fails regardless of what the bucket allowed. Humans move to IAM Identity Center, so there are few long-term keys left to leak."
            ),
            part(
              "What the policies do not cover",
              "States the limits: neither SCPs nor RCPs affect the management account (so it is kept empty of workloads); both leave service-linked roles untouched; SCPs and RCPs never grant permissions, they only filter; the default FullAWSAccess and RCPFullAWSAccess policies must stay attached; the 5,120-character size limit drives the use of NotAction lists and multiple policies per OU; test with a non-production OU first.",
              "Neither policy type applies to the management account, which is why no workloads or buckets live there. Service-linked roles are exempt from both, so AWS services keep working. They only ever deny; permissions still come from identity and resource policies, and the FullAWSAccess and RCPFullAWSAccess baseline policies stay attached. Each policy is limited to 5,120 characters, hence compact NotAction lists and several policies per OU. Attach to a test OU first and read CloudTrail for denials with 'service control policy' or 'resource control policy' in the message before rolling to production OUs."
            ),
          ],
        },
      ],
    },
    // ----- Cost-Optimized Architecture Design (2) -----
    {
      slug: "cut-data-transfer-cost",
      objective: "Reducing data transfer cost: private connectivity, VPC endpoints versus NAT gateways, AZ-aware and Region-aware traffic",
      kind: "build",
      title: "Cut the data-processing and transfer bill of a private fleet",
      brief:
        "Lindqvist Imaging (fictional) runs 120 EC2 instances in private subnets across three Availability Zones in US East (N. Virginia). Each month they push about 60 TB of scan images to S3 and make heavy DynamoDB and SQS calls, all through three NAT gateways. The bill shows a large 'NAT gateway data processed' line plus a growing 'data transfer within Region' line, because the application's three tiers talk to each other across Availability Zones through a Network Load Balancer with cross-zone load balancing on, and a replica of the images is kept in a second Region by an hourly copy job that re-copies files it already copied. Published list prices in that Region at the time of the review: NAT gateway $0.045 per hour and $0.045 per GB processed; interface endpoints $0.01 per GB processed (first PB) plus an hourly charge per endpoint per AZ; gateway endpoints for S3 and DynamoDB at no additional charge.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Redesign the paths and estimate the effect of each change.",
          parts: [
            part(
              "S3 and DynamoDB traffic",
              "Replaces the NAT path with gateway VPC endpoints for S3 and DynamoDB (route-table entries, no hourly or per-GB charge), and quantifies: 60 TB through NAT is about 61,440 GB x $0.045 = roughly $2,765 a month of data processing that drops to zero.",
              "Add gateway endpoints for S3 and DynamoDB to the private route tables. They cost nothing per hour or per GB, and the 60 TB of images (about 61,440 GB x $0.045 = about $2,765 a month in NAT data processing) stops flowing through the NAT gateways at all. Add an endpoint policy restricting the S3 endpoint to Lindqvist's buckets."
            ),
            part(
              "SQS and other AWS APIs",
              "Uses interface endpoints (PrivateLink) for SQS and the other heavily used services, comparing the per-GB price ($0.01 against $0.045 through NAT) and noting the hourly charge per AZ means low-volume services may stay on NAT.",
              "Interface endpoints for SQS, CloudWatch Logs and the other chatty APIs: $0.01 per GB processed instead of $0.045 through the NAT gateway, so any service pushing more than a few hundred GB a month pays for the endpoint's hourly charges (one per AZ) quickly. Low-volume services can stay on NAT; the NAT gateways shrink to a fraction of their traffic but remain for genuine internet egress."
            ),
            part(
              "Cross-AZ traffic",
              "Makes the tiers AZ-aware: turn off cross-zone load balancing on the NLB (or use zonal DNS names) and keep each tier's callers and callees in the same AZ, so inter-tier traffic stops crossing AZ boundaries where data transfer within the Region is charged; keeps a NAT gateway per AZ for the same reason.",
              "Data transfer between Availability Zones in the same Region is charged in both directions, and cross-zone load balancing spreads every request across the three AZs. Disable cross-zone on the NLB (or resolve zonal endpoint names) so tier A in AZ-1 calls tier B in AZ-1, and keep one NAT gateway in each AZ so egress never hops zones. Accept slightly less even balance in exchange."
            ),
            part(
              "The Region-to-Region copy",
              "Replaces the hourly re-copy with S3 Cross-Region Replication (or S3 Batch Replication for the backlog), which replicates each object once, so inter-Region transfer is paid once per object instead of repeatedly, and reviews whether the replica needs a cheaper storage class.",
              "The copy job re-sends unchanged files, paying inter-Region data transfer again and again. Turn on S3 Cross-Region Replication on the bucket (with Batch Replication for existing objects) so each new object is transferred exactly once as it lands, and store the replica in a lower-cost class such as Standard-IA or Glacier Instant Retrieval if it is only for recovery."
            ),
          ],
        },
      ],
    },
    {
      slug: "database-pricing-four-workloads",
      objective: "Database cost: DynamoDB capacity modes, RDS reserved instances, Aurora Serverless and I/O-Optimized, Database Savings Plans",
      kind: "build",
      title: "Pick the database pricing model for four workloads",
      brief:
        "Tremont Media (fictional) has four database workloads to cost-optimize. (1) A DynamoDB table behind a news app whose traffic is flat most of the day but spikes 20x unpredictably when a story breaks; it currently runs provisioned capacity set for the spike. (2) A second DynamoDB table for an internal catalog with steady, predictable traffic 24/7. (3) An Aurora PostgreSQL cluster whose bill shows storage I/O charges at about 40% of the cluster's total cost. (4) Forty development Aurora clusters used in working hours and idle at night and weekends, on fixed-size instances. The finance team also asks whether a one-year commitment product could cover the steady relational usage without locking into instance families.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose a pricing model for each workload and answer finance, naming the trade-off in each case.",
          parts: [
            part(
              "Spiky news table",
              "Switches to DynamoDB on-demand capacity mode, because paying per request fits unpredictable 20x spikes better than provisioning for the peak; notes on-demand's higher unit price is worth it when average utilization of provisioned capacity is low.",
              "On-demand mode: the table pays per request and absorbs a 20x spike without throttling, instead of paying 24 hours a day for provisioned capacity sized for the rare peak. Per-request pricing is higher per unit than well-utilized provisioned capacity, which is exactly why it suits a table that is idle most of the day."
            ),
            part(
              "Steady catalog table",
              "Keeps provisioned capacity with auto scaling and buys reserved capacity (or covers it with a Database Savings Plan) for the predictable baseline, because steady utilization makes provisioned cheaper than on-demand.",
              "Provisioned mode with auto scaling for the daily curve, and a commitment for the baseline: DynamoDB reserved capacity or a Database Savings Plan. Steady 24/7 traffic keeps provisioned units busy, so they cost less per request than on-demand, and the commitment discounts them further in exchange for a term."
            ),
            part(
              "I/O-heavy Aurora cluster",
              "Moves the cluster to Aurora I/O-Optimized, citing the guidance that it pays off when I/O charges exceed about 25% of total Aurora spend (here 40%), in exchange for higher instance and storage prices and no per-I/O charge.",
              "Switch to Aurora I/O-Optimized. AWS's own guidance is that it saves money once I/O is more than about 25% of Aurora spend; at 40% this cluster is well past it. You pay higher instance and storage rates and nothing per I/O, which also makes the bill predictable."
            ),
            part(
              "Development clusters and the commitment question",
              "Moves development clusters to Aurora Serverless v2 with a minimum of 0 ACUs so they scale to zero when idle; answers finance that Database Savings Plans (1-year term, up to 35% off) cover eligible provisioned and serverless usage regardless of engine, instance family, size or Region, but cannot be combined with Reserved Instances on the same workload.",
              "Aurora Serverless v2 for the 40 dev clusters with minimum capacity 0 ACUs, so they scale to zero overnight and at weekends and pay only when developers are working; set a modest maximum. For finance: a Database Savings Plan is a 1-year commitment to an hourly spend that saves up to 35% and applies across engines, instance families, sizes and Regions, including serverless, so it does not lock in a family the way Reserved Instances do; the same workload cannot carry both an RI and the Savings Plan."
            ),
          ],
        },
      ],
    },
    // ----- Resilience, Migration, and Business Continuity (2) -----
    {
      slug: "ransomware-proof-backups",
      objective: "Protecting data from ransomware and accidental deletion: S3 Object Lock, EBS snapshot lock, Backup Vault Lock",
      kind: "build",
      title: "Make the backups something an attacker with admin rights cannot delete",
      brief:
        "Greaves Hospital Group (fictional) suffered a ransomware test exercise in which the red team, holding an administrator's credentials, deleted every EBS snapshot and emptied the S3 bucket of database exports before encrypting production. The board requires that, even with full administrator access in the production account, no one can delete or shorten the retention of: (1) 90 days of S3 database exports, (2) daily EBS snapshots of the application servers, and (3) the AWS Backup copies of RDS and EFS. Legal also needs the ability to hold specific exports indefinitely during litigation, and the recovery team must be able to restore even if the production account itself is compromised.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify the control for each data set, the mode and retention, and the restore path.",
          parts: [
            part(
              "S3 exports",
              "Enables S3 Object Lock on the bucket (requires versioning) with a default retention of 90 days in compliance mode, explaining that compliance mode cannot be overridden or shortened by any user including the root user, whereas governance mode can be bypassed with s3:BypassGovernanceRetention; uses legal holds for litigation.",
              "A new bucket with S3 Versioning and Object Lock enabled, default retention 90 days in compliance mode: a locked version cannot be overwritten or deleted and its retention cannot be shortened by anyone, root included, until it expires. Governance mode would not satisfy the board because principals with s3:BypassGovernanceRetention can override it. Legal applies an Object Lock legal hold to the specific export versions, which protects them with no expiry until the hold is removed."
            ),
            part(
              "EBS snapshots",
              "Uses EBS snapshot lock in compliance mode for the daily snapshots with the required duration, created automatically (Data Lifecycle Manager or AWS Backup), so a locked snapshot cannot be deleted regardless of IAM permissions.",
              "Lock the daily snapshots with EBS snapshot lock in compliance mode for the retention the policy requires; a locked snapshot cannot be deleted by any user whatever their IAM permissions. Apply the lock automatically from the lifecycle policy that creates the snapshots so none is ever unlocked by mistake."
            ),
            part(
              "AWS Backup vault",
              "Locks the AWS Backup vault with Vault Lock in compliance mode with a minimum retention, explaining the grace time (at least 72 hours) during which the lock can still be removed and after which the vault and its recovery points are immutable even to AWS and the root user.",
              "AWS Backup Vault Lock in compliance mode on the vault holding the RDS and EFS recovery points, with a minimum retention of 90 days. The lock has a grace time (at least 72 hours, set it to a few days) in which it can still be removed; once that passes, nobody, root included, and not AWS, can delete the recovery points or loosen the vault until retention ends."
            ),
            part(
              "Restoring when production is compromised",
              "Copies backups to a logically air-gapped vault (or a locked vault in a separate backup account with cross-account copy) so an attacker in production cannot touch them, and uses the vault's sharing (AWS RAM) so a clean recovery account can restore directly.",
              "Add a copy rule to a logically air-gapped vault, which AWS Backup encrypts with an AWS owned key by default (a customer managed KMS key is optional), locks in compliance mode and isolates from the source account, and share that vault through AWS RAM with a dedicated recovery account. If production is compromised, the recovery team restores from the air-gapped vault into a clean account without ever needing credentials from the compromised one; a locked vault in a separate backup account with cross-account copies is the equivalent self-managed design."
            ),
          ],
        },
      ],
    },
    {
      slug: "multi-region-dr-trading",
      objective: "Designing disaster recovery to business requirements: RTO, RPO, and cost",
      kind: "case",
      title: "Design and prove multi-Region recovery for a trading platform",
      brief:
        "Ironhaven Markets (fictional) runs an order-matching platform in one Region: ECS on Fargate behind an ALB, Aurora PostgreSQL, DynamoDB for sessions, and an EventBridge-driven settlement pipeline. The regulator now requires a documented recovery capability for the loss of the primary Region with an RTO of 15 minutes and an RPO of 1 minute, demonstrated by a live test twice a year. The platform runs in two AWS accounts (production and security tooling). Cost is a concern but secondary to the regulatory requirement.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You are asked for the recovery strategy and the data layer that can meet RTO 15 minutes and RPO 1 minute.",
          ask: "Choose the DR strategy and the replication design, and justify both against the targets and cost.",
          parts: [
            part(
              "Strategy",
              "Chooses warm standby (a scaled-down but fully functional copy of the stack running in the recovery Region) over pilot light, backup-and-restore or active-active, explaining that a 15-minute RTO rules out rebuilding infrastructure during the event while active-active costs more than needed; the standby is kept deployed by the same pipeline.",
              "Warm standby: the full stack (ECS services at minimum task count, ALB, settlement pipeline) is deployed and running in the recovery Region, scaled small. Backup-and-restore and pilot light need to create or scale infrastructure under pressure and cannot reliably hit 15 minutes; active-active would meet it but doubles run cost and complicates order matching. The standby is deployed by the same pipeline as production so it never drifts."
            ),
            part(
              "Data layer",
              "Uses Aurora Global Database (replication typically under a second, so RPO in seconds; planned switchover has no data loss, unplanned failover promotes the secondary with RTO in minutes) and DynamoDB global tables for sessions, with the EventBridge bus and settlement queues deployed in both Regions.",
              "Aurora Global Database with the secondary cluster in the recovery Region: replication lag is typically under a second, so RPO is seconds, well within one minute; a planned switchover loses no data and an unplanned failover promotes the secondary in minutes. DynamoDB global tables replicate the session table to both Regions. The settlement bus, rules and queues exist in both Regions from the same templates."
            ),
          ],
        },
        {
          text: "The first live test fails the RTO: it took 41 minutes. The post-mortem finds (a) the recovery Region's ECS task definitions pointed at images that existed only in the primary Region's ECR; (b) the Fargate task count in the recovery Region hit a service quota at 60% of production capacity; (c) clients kept connecting to the old Region for 20 minutes because of DNS caching; and (d) the runbook required a person to run eleven manual steps.",
          ask: "Fix each finding so the next test passes.",
          parts: [
            part(
              "Artifacts and quotas",
              "Replicates ECR images to the recovery Region (ECR cross-Region replication) and pins task definitions to the local repository, and raises the recovery Region's quotas to full production capacity in advance, verified continuously (for example with ARC Region switch plan evaluation and its service quota checks, or a quota-monitoring alarm; ARC readiness checks are closed to new customers).",
              "Turn on ECR cross-Region replication so every production image lands in the recovery Region's registry, and have task definitions reference the local repository. Request quota increases in the recovery Region to at least full production capacity now, not during an event, and keep that verified continuously: an ARC Region switch plan's evaluation runs several times an hour and warns if the recovery Region's ECS service cannot scale to the capacity failover needs, and its service quota checks compare the two Regions' quotas daily and can request the increase. (The older ARC readiness checks did a similar job but are closed to new customers.) Alarm on any warning."
            ),
            part(
              "Traffic switch and automation",
              "Moves traffic switching to Route 53 Application Recovery Controller routing controls (or Global Accelerator) with low DNS TTLs so failover is a deliberate, data-plane action independent of the failed Region, and automates the eleven steps into a Systems Manager Automation runbook or Step Functions workflow with one approval.",
              "Front the two Regions with Route 53 failover records controlled by Application Recovery Controller routing controls, with TTLs of 60 seconds or less, so flipping traffic is one highly available data-plane action that does not depend on the impaired Region's control plane. Encode the runbook as a Systems Manager Automation document: promote the Aurora secondary, scale ECS, flip the routing control, verify health, with a single approval step and timings logged."
            ),
          ],
        },
        {
          text: "Six months later a different kind of event: the primary Region is not down, but one Availability Zone has a gray failure. Matching latency triples and 8% of orders error. The automated regional failover would take the platform to the recovery Region, which the business considers too disruptive for a partial event.",
          ask: "What do you add to the design and the test program for this class of failure?",
          parts: [
            part(
              "Zonal response and testing",
              "Adds zonal isolation: Application Recovery Controller zonal shift (or zonal autoshift) to move traffic away from the impaired AZ while staying in the Region, with the ALB and ECS deployed evenly across three AZs and AZ-independent dependencies; extends the test program with AWS Fault Injection Service experiments that inject AZ impairment and measure latency and error rate against the SLOs, alongside the twice-yearly regional test.",
              "Handle the AZ first: use Application Recovery Controller zonal shift to pull the ALB's traffic out of the impaired AZ in minutes, with ECS tasks spread over three AZs and the Aurora writer failing over within the Region, so the platform recovers without leaving the Region. Then test for it: AWS Fault Injection Service experiments that degrade networking in one AZ, with steady-state hypotheses on p99 latency and error rate, run quarterly, in addition to the regulator's twice-yearly full regional failover."
            ),
          ],
        },
      ],
    },
    // ----- Operational Excellence and Automation (2) -----
    {
      slug: "cross-account-pipeline",
      objective: "Multi-account and multi-Region pipelines: role delegation and artifact promotion",
      kind: "build",
      title: "Build a pipeline that deploys from a tooling account into dev, staging and prod",
      brief:
        "Oakenshaw Insurance (fictional) has a tooling account that holds the source repository and build, and three workload accounts: dev, staging and prod, with prod also deployed to a second Region. Rules from the architecture board: the artifact built once must be the exact artifact promoted to every stage; the pipeline must hold no long-term credentials for the workload accounts; prod deployments need a manual approval; and workload-account administrators must not be able to change what the pipeline deploys.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the pipeline's accounts, roles, artifact store and promotion flow.",
          parts: [
            part(
              "Artifact store",
              "Keeps one S3 artifact bucket in the tooling account encrypted with a customer managed KMS key (not the default key), with the bucket policy and key policy granting the workload accounts' deployment roles read access, so one immutable artifact is consumed by every stage.",
              "A single artifact bucket in tooling encrypted with a customer managed KMS key: cross-account access to artifacts requires a customer managed key because the key policy must grant the other accounts, and the default key's cannot be edited. The bucket policy and key policy allow the dev, staging and prod deployment roles to GetObject and Decrypt. The build stage writes the versioned artifact once; every later stage reads that same object."
            ),
            part(
              "Role delegation",
              "Creates in each workload account a cross-account role that the pipeline (its service role in tooling) assumes for deploy actions, plus a CloudFormation service role in that account for the stack, trusting only the tooling pipeline role, so the pipeline never stores workload-account credentials.",
              "In each workload account: a pipeline-deploy role whose trust policy allows only the tooling account's CodePipeline service role to assume it, with permissions to run CloudFormation and read the artifact bucket, and a cloudformation-execution role with the permissions the stack's resources need. Every deploy action uses temporary credentials from AssumeRole; no access keys exist anywhere in the pipeline."
            ),
            part(
              "Promotion and approval",
              "Orders the stages dev -> staging -> manual approval -> prod (both Regions, in parallel or sequence) using CloudFormation deploy actions or StackSets with the same artifact, with automated tests gating each promotion and the approval action notifying an SNS topic.",
              "Stages: Source, Build (produces artifact v1234), Deploy-dev, integration tests, Deploy-staging, smoke tests, Manual approval (SNS to the release channel), Deploy-prod-eu-west-1 and Deploy-prod-eu-west-2 as parallel actions on the same artifact, or a StackSets action targeting the prod account in both Regions. A failed test stops promotion; nothing is rebuilt between stages."
            ),
            part(
              "Keeping admins out of the loop",
              "Protects the deployed stacks from change outside the pipeline: the CloudFormation execution role is the only principal allowed to update the stacks (stack policies plus SCPs or permission boundaries denying cloudformation:UpdateStack to account admins), and pipeline definitions live in version control with the pipeline role unable to be edited from the workload accounts.",
              "Only the cloudformation-execution role may update the pipeline-owned stacks: an SCP (or the accounts' permission boundaries) denies cloudformation:UpdateStack and DeleteStack on those stacks to everyone else, and CloudFormation stack policies protect critical resources. The pipeline and its roles are defined as code in the tooling account, which workload-account admins cannot modify, so what ships is what the repository says."
            ),
          ],
        },
      ],
    },
    {
      slug: "public-bucket-policy-as-code",
      objective: "Policy as code for proactive validation, enforcement, and drift remediation: CloudFormation Hooks, CDK aspects, Config rules, SCPs",
      kind: "case",
      title: "Stop public buckets for good with policy as code",
      brief:
        "Delacroix Analytics (fictional) has had three public S3 buckets created in six months across its 40 accounts, each found by an outside researcher. Teams deploy with CloudFormation and the CDK through a shared pipeline, but some also use the console. The CTO wants the problem prevented, detected and corrected, not just written into a standard.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The first bucket was created by a CloudFormation template that set a public-read ACL and a bucket policy with Principal '*'. The pipeline deployed it without complaint.",
          ask: "Add the preventive control for templates, and say where in the lifecycle it acts.",
          parts: [
            part(
              "Proactive validation",
              "Uses CloudFormation Hooks (a pre-provisioning hook on AWS::S3::Bucket and AWS::S3::BucketPolicy that fails the operation for public ACLs, missing PublicAccessBlockConfiguration or wildcard principals) and, for CDK apps, a CDK Aspect or cdk-nag rules in the synth step, explaining these act before resources exist.",
              "A CloudFormation Hook targeting AWS::S3::Bucket and AWS::S3::BucketPolicy that runs before provisioning and fails the stack operation if PublicAccessBlockConfiguration is not all true or the policy grants Principal '*'; the same check as a CDK Aspect (or cdk-nag) in the pipeline's synth step so developers see it before the push. Hooks act proactively: the non-compliant bucket is never created, rather than being found later."
            ),
          ],
        },
        {
          text: "The second bucket was made in the console in an account the pipeline never touches, and a week later an engineer edited a compliant bucket's policy by hand to share a report.",
          ask: "Add the detective and corrective controls for resources that bypass templates.",
          parts: [
            part(
              "Detection and remediation",
              "Deploys AWS Config managed rules across the Organization (s3-bucket-public-read-prohibited, s3-bucket-public-write-prohibited, s3-account-level-public-access-blocks-periodic) through an organization conformance pack, with automatic remediation via a Systems Manager Automation document that re-applies Block Public Access, and routes findings to Security Hub.",
              "An organization conformance pack with s3-bucket-public-read-prohibited, s3-bucket-public-write-prohibited and s3-account-level-public-access-blocks-periodic evaluated in every account, each with automatic remediation that runs a Systems Manager Automation runbook (for example AWS-DisableS3BucketPublicReadWrite or one that puts the bucket's PublicAccessBlock back). Findings flow to Security Hub for the security team. The hand-edited policy is detected on the configuration change and reverted within minutes."
            ),
            part(
              "Drift in templated resources",
              "For stack-managed buckets, runs CloudFormation drift detection on a schedule (or on the Config change event) and reconciles by redeploying the template or updating it, so manual edits do not persist.",
              "For buckets owned by a stack, the Config change also triggers CloudFormation drift detection; drifted stacks are redeployed by the pipeline, which restores the template's policy, or the change is brought into the template deliberately through a pull request."
            ),
          ],
        },
        {
          text: "The third bucket became public because an account administrator turned off the account's Block Public Access setting to 'test something'.",
          ask: "Close that door at the Organization level, and explain how the controls now layer.",
          parts: [
            part(
              "Guardrail and layering",
              "Enables account-level S3 Block Public Access in every account (automatable from the Organization) and attaches an SCP denying s3:PutAccountPublicAccessBlock (and the bucket-level equivalent) to everyone except a break-glass role; explains the layers: SCP guardrail (cannot be undone in the account), Hooks and Aspects (prevent at deploy), Config rules (detect and correct what slips through).",
              "Turn on account-level Block Public Access everywhere and attach an SCP that denies s3:PutAccountPublicAccessBlock and s3:PutBucketPublicAccessBlock to all principals except the security break-glass role, so no account administrator can switch it off. The layers now work together: the SCP is the floor nobody inside an account can lower; Hooks and CDK Aspects stop non-compliant templates before deployment; Config rules with remediation catch console changes and drift, with Security Hub as the record. Each layer covers a path the others cannot see."
            ),
          ],
        },
      ],
    },
  ],
};
