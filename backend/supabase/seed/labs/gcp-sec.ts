import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-158: Google Cloud Professional Cloud Security Engineer.
//
// Aligned to the exam guide's five sections (Configuring access 25%,
// Boundary protection 22%, Data protection 23%, Operations 19%, Compliance
// 11%) and the considerations a candidate performs: get rid of service
// account keys, federate a CI workload, write IAM conditions and deny
// policies, build a VPC Service Controls perimeter, front an internal app
// with IAP and Cloud NGFW, choose default / CMEK / EKM, de-identify PII,
// route logs with aggregated sinks, run an incident, and map regulatory
// requirements to controls. Density ("hybrid"): 3 / 2 / 2 / 2 / 2.
//
// Sources (all read 2026-11-07):
//   exam guide  https://services.google.com/fh/files/misc/professional_cloud_security_engineer_exam_guide_english.pdf
//   Org policy constraints (constraints/iam.disableServiceAccountKeyCreation,
//   constraints/iam.automaticIamGrantsForDefaultServiceAccounts,
//   constraints/iam.allowedPolicyMemberDomains, constraints/compute.vmExternalIpAccess,
//   constraints/gcp.resourceLocations, constraints/storage.publicAccessPrevention)
//               https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
//   Workload Identity Federation  https://cloud.google.com/iam/docs/workload-identity-federation
//   Service account / key usage (Policy Intelligence)
//               https://cloud.google.com/policy-intelligence/docs/activity-analyzer-service-account-authentication
//   IAM Conditions  https://cloud.google.com/iam/docs/conditions-overview
//   Deny policies   https://cloud.google.com/iam/docs/deny-overview
//   Privileged Access Manager  https://cloud.google.com/iam/docs/pam-overview
//   VPC Service Controls  https://cloud.google.com/vpc-service-controls/docs/overview
//   Private Google Access (restricted.googleapis.com 199.36.153.4/30,
//   private.googleapis.com 199.36.153.8/30)
//               https://cloud.google.com/vpc/docs/configure-private-google-access
//   IAP TCP forwarding  https://cloud.google.com/iap/docs/using-tcp-forwarding
//   Cloud Armor preconfigured WAF rules (OWASP ModSecurity CRS)
//               https://cloud.google.com/armor/docs/waf-rules
//   Cloud HSM (FIPS 140-2 Level 3)  https://cloud.google.com/kms/docs/hsm
//   Cloud EKM  https://cloud.google.com/kms/docs/ekm
//   Sensitive Data Protection de-identification (FPE-FFX, deterministic
//   encryption, date shifting, bucketing)
//               https://cloud.google.com/sensitive-data-protection/docs/deidentify-sensitive-data
//   Cloud Audit Logs (Admin Activity always on; Data Access off by default
//   except BigQuery; Policy Denied)  https://cloud.google.com/logging/docs/audit
//   Log sinks  https://cloud.google.com/logging/docs/export/configure_export_v2
//   Security Command Center tiers (Standard / Premium / Enterprise)
//               https://cloud.google.com/security-command-center/docs/service-tiers
//   Event Threat Detection  https://cloud.google.com/security-command-center/docs/concepts-event-threat-detection-overview
//   Public access prevention  https://cloud.google.com/storage/docs/public-access-prevention
//   Binary Authorization  https://cloud.google.com/binary-authorization/docs/overview
//   Artifact Analysis  https://cloud.google.com/artifact-analysis/docs/artifact-analysis
//   Assured Workloads (EU Data Boundary and Support package)
//               https://cloud.google.com/assured-workloads/docs/overview
//               https://cloud.google.com/assured-workloads/docs/control-packages
//   Health-check probe ranges (35.191.0.0/16)  https://cloud.google.com/load-balancing/docs/health-check-concepts
//   Deny-policy permission names  https://cloud.google.com/iam/docs/deny-permissions-support
//   Model Armor  https://cloud.google.com/security-command-center/docs/model-armor-overview
// Every lab is needs_expert_review until a person checks it.

export const GCPSEC_LABS: SeedLabSet = {
  trackCode: "GCPSEC",
  sources: [
    source("https://services.google.com/fh/files/misc/professional_cloud_security_engineer_exam_guide_english.pdf", "exam_outline", "2026-11-07"),
    source("https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints", "reference", "2026-11-07"),
    source("https://cloud.google.com/vpc/docs/configure-private-google-access", "reference", "2026-11-07"),
    source("https://cloud.google.com/logging/docs/audit", "reference", "2026-11-07"),
    source("https://cloud.google.com/kms/docs/hsm", "reference", "2026-11-07"),
  ],
  labs: [
    // ---------------- Section 1: Configuring access (3) ----------------
    {
      slug: "retire-service-account-keys",
      objective: "Securing, auditing, and mitigating service account key usage",
      kind: "build",
      title: "Retire user-managed service account keys across an organisation",
      brief:
        "Tallow & Reed, a fintech, has 212 user-managed service account keys across 60 projects. Some are in CI systems, some on developer laptops, some in a Kubernetes secret, and nobody knows which are still used. A recent audit finding requires that within 90 days no long-lived key exists unless a documented exception is approved, and that new keys cannot be created without one. Write the plan: how you find what is used, what each use is replaced with, how you turn the taps off, and how you prove it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the key-retirement plan.",
          parts: [
            part(
              "Inventory and usage",
              "Uses Cloud Asset Inventory to list keys and Policy Intelligence's service account and key authentication activity (last-used) to find unused keys, which are disabled first, then deleted after a wait.",
              "List every user-managed key with Cloud Asset Inventory (iam.googleapis.com/ServiceAccountKey) and check each key's last authentication in Policy Intelligence's activity analyzer. Keys with no authentication in 90 days are disabled immediately (reversible), watched for breakage, then deleted after 30 days."
            ),
            part(
              "Replacements by use case",
              "Maps each use to a keyless alternative: workloads on Google Cloud use an attached service account (Compute, GKE Workload Identity, Cloud Run); external CI uses Workload Identity Federation; humans use their own identity with service account impersonation (short-lived tokens) rather than downloading a key.",
              "Workloads on GCE, Cloud Run and GKE: attach a service account (GKE Workload Identity Federation for GKE) and let the metadata server mint tokens; no file. External CI and other clouds: Workload Identity Federation exchanging the provider's OIDC token for a short-lived Google credential. Developers: sign in as themselves and use service account impersonation (roles/iam.serviceAccountTokenCreator) to get short-lived tokens when they need to act as the service account."
            ),
            part(
              "Preventing new keys",
              "Enforces the organization policy constraint constraints/iam.disableServiceAccountKeyCreation (and the managed variant where used) at the organization level, with narrow, documented exceptions on a folder or project; optionally constraints/iam.disableServiceAccountKeyUpload too.",
              "Set constraints/iam.disableServiceAccountKeyCreation to enforced at the organization node, so key creation fails everywhere by default. Where an approved exception exists (a vendor that cannot federate), place that one project in a folder where the constraint is overridden, record the exception and its expiry, and alert on key creation there. Add constraints/iam.disableServiceAccountKeyUpload so nobody sideloads their own key pair."
            ),
            part(
              "Evidence and detection",
              "Alerts on key creation and use via Cloud Audit Logs (CreateServiceAccountKey) and Security Command Center findings, and reports the count of remaining keys and their exceptions at day 90.",
              "A log-based alert on protoPayload.methodName = google.iam.admin.v1.CreateServiceAccountKey pages security if anyone creates a key; Security Command Center's Security Health Analytics flags user-managed keys and old keys. The day-90 report is the asset-inventory count of keys (target: only the documented exceptions) with each exception's owner and expiry."
            ),
          ],
        },
      ],
    },
    {
      slug: "workload-identity-federation-ci",
      objective: "Configuring Workload Identity Federation",
      kind: "case",
      title: "Federate a CI pipeline instead of giving it a key",
      brief:
        "Quenby Software deploys to Cloud Run from a hosted CI service outside Google Cloud that issues OpenID Connect (OIDC) tokens for each pipeline run. The tokens carry claims including repository, branch (ref) and the workflow name. Today the pipeline authenticates with a service account key stored as a CI secret; the key was rotated once, two years ago.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Security asks you to remove the key this sprint without breaking deployments.",
          ask: "Describe the Workload Identity Federation setup that replaces it.",
          parts: [
            part(
              "Pool and provider",
              "Creates a workload identity pool with an OIDC provider pointing at the CI system's issuer URL, with attribute mappings from the token's claims (for example google.subject from sub, attribute.repository from the repository claim).",
              "Create a workload identity pool (ci-pool) and an OIDC provider in it whose issuer is the CI service's token issuer. Map claims: google.subject = assertion.sub, attribute.repository = assertion.repository, attribute.ref = assertion.ref, so Google can reason about which repository and branch a token came from."
            ),
            part(
              "Granting access",
              "Lets the federated identity act as the deploy service account via roles/iam.workloadIdentityUser (impersonation) or grants roles directly to the principal set, and removes and deletes the old key once the pipeline works.",
              "Grant principalSet://iam.googleapis.com/projects/NUMBER/locations/global/workloadIdentityPools/ci-pool/attribute.repository/quenby/shop-api the role roles/iam.workloadIdentityUser on the deploy service account (or grant roles/run.developer to that principal set directly). The pipeline exchanges its OIDC token for a short-lived Google token via the STS endpoint; after a green deploy, disable then delete the old key."
            ),
          ],
        },
        {
          text: "Federation works. A week later a developer forks the repository into their personal account and their fork's pipeline, using the same workflow, is also able to obtain a token for the deploy service account.",
          ask: "Why did that work, and how do you stop it?",
          parts: [
            part(
              "Cause and fix",
              "Explains the provider trusts any token from the issuer unless restricted, and adds an attribute condition on the provider (for example assertion.repository_owner == 'quenby' or an allowlist of repositories) so tokens from other repositories are rejected before any IAM evaluation; also keeps the IAM binding scoped to the exact repository attribute.",
              "The provider accepted every valid token from the CI issuer; only the IAM binding limited access, and the fork's token carried a different repository claim, so if the binding used a broad principal set (or matched on workflow name) it slipped through. Add an attribute condition on the provider: attribute.repository_owner == \"quenby\" (or assertion.repository in an allowlist), which rejects foreign tokens at the exchange step, and keep the binding on attribute.repository = quenby/shop-api, not on anything a fork can copy."
            ),
          ],
        },
        {
          text: "Finally, the same team wants production deployments to come only from the main branch, while feature branches may deploy to the staging project.",
          ask: "How do you express that?",
          parts: [
            part(
              "Branch-scoped access",
              "Uses the mapped ref attribute: binds a principal set with attribute.ref = refs/heads/main (or an attribute.environment mapping) to the production deploy service account, and a broader principal set for staging; optionally two providers or two pools.",
              "Bind principalSet://.../attribute.ref/refs/heads/main (combined with the repository attribute via a custom mapped attribute such as attribute.repo_ref = assertion.repository + '/' + assertion.ref) to the production deploy service account, and bind the repository-wide principal set only to the staging project's service account. A feature-branch token then cannot impersonate production."
            ),
          ],
        },
      ],
    },
    {
      slug: "iam-conditions-and-deny-policies",
      objective: "Granting permissions to identities using IAM conditions and IAM deny policies",
      kind: "build",
      title: "Write conditional grants and a deny policy for a contractor engagement",
      brief:
        "Ironhollow Energy has hired Alder Consulting for an eight-week data-platform project. The consultants need BigQuery Data Editor on datasets whose names start with 'alder_' in the analytics project, Storage Object Viewer on one bucket, and nothing else; access must expire automatically on 31 January at 17:00 UTC with no manual clean-up. Separately, after an incident where an administrator deleted a logging bucket, the CISO wants a rule that nobody in the organisation, including project owners, can delete logging buckets or create service account keys, except a break-glass group. Write the grants and the deny policy.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the IAM design: the conditional grants, the deny policy, and how they interact.",
          parts: [
            part(
              "Time-bound grant",
              "Attaches an IAM condition on request.time (request.time < timestamp('2027-01-31T17:00:00Z')) to the group binding so the role stops working at the deadline without anyone removing it, granting to a group not individuals.",
              "Grant roles/storage.objectViewer on the bucket to group alder-consultants@ with the condition expression request.time < timestamp(\"2027-01-31T17:00:00Z\") (title 'Alder engagement'). After that instant the binding no longer grants anything; it can be deleted later for tidiness. Grant to the group, not to each consultant."
            ),
            part(
              "Resource-scoped grant",
              "Scopes BigQuery Data Editor with a resource.name condition (resource.name.startsWith('projects/analytics-prod/datasets/alder_')) combined with the time condition, or grants at the dataset level where a resource-name condition is not supported, and notes the limitation.",
              "Grant roles/bigquery.dataEditor on the analytics-prod project to the group with the condition resource.name.startsWith(\"projects/analytics-prod/datasets/alder_\") && request.time < timestamp(\"2027-01-31T17:00:00Z\"), so it applies only to alder_ datasets and their tables. If a resource type in play does not support resource-name conditions, fall back to dataset-level grants with the time condition only."
            ),
            part(
              "Deny policy",
              "Creates an IAM deny policy at the organization level denying logging.buckets.delete and iam.serviceAccountKeys.create for all principals (principalSet://goog/public:all or the organisation's principal set) with an exception for the break-glass group; explains deny is evaluated before allow so even owners are blocked.",
              "Attach a deny policy to the organization: deniedPrincipals principalSet://goog/public:all, deniedPermissions logging.googleapis.com/buckets.delete and iam.googleapis.com/serviceAccountKeys.create, exceptionPrincipals group:breakglass-admins@ironhollow.example. Deny rules are evaluated before any allow policy, so a project owner's broad role does not help; only the exception group can perform those actions."
            ),
            part(
              "Interaction and testing",
              "States that the deny policy overrides the consultants' and anyone else's allow grants, and tests with Policy Troubleshooter / policy simulator and a dry run (deny condition or audit) before enforcing.",
              "Order of evaluation: deny first, then allow with conditions. The consultants' grants never touch the denied permissions, so nothing conflicts. Before enforcing, check with Policy Troubleshooter that a known admin loses buckets.delete and the break-glass group keeps it, and review Policy Denied audit logs for a week to catch legitimate automation that would break."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 2: Boundary protection (2) ----------------
    {
      slug: "vpc-service-controls-perimeter",
      objective: "Identifying use cases for, and configuring, VPC Service Controls",
      kind: "build",
      title: "Build a VPC Service Controls perimeter around a data lake",
      brief:
        "Moorcroft Clinical Research keeps trial data in BigQuery and Cloud Storage across two projects, trials-data and trials-analytics. A contractor recently copied a dataset to a BigQuery project in their own organisation using credentials that were legitimately granted. Requirements: Google API calls that move data out of the two projects to anything outside them must be blocked, even by authorised users; researchers may still access the data from managed laptops on the corporate network; an on-premises analysis cluster connected by Cloud Interconnect must reach BigQuery privately; a partner's project must be able to read one specific bucket. Nothing may break on day one.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the perimeter: scope, access levels, ingress/egress, private connectivity and rollout.",
          parts: [
            part(
              "Perimeter and services",
              "Creates a VPC Service Controls service perimeter containing both projects with BigQuery and Cloud Storage (and related APIs) restricted, explaining that the perimeter blocks API data movement across the boundary regardless of IAM, which is what IAM alone could not do.",
              "One service perimeter containing trials-data and trials-analytics, with bigquery.googleapis.com and storage.googleapis.com (plus supporting services such as Dataflow if used) in the restricted services list. A copy to a project outside the perimeter is now blocked at the API layer even when the caller's IAM would allow it, which closes the contractor's path."
            ),
            part(
              "Access levels",
              "Uses Access Context Manager access levels (corporate IP ranges and device policy such as corp-owned, encrypted, OS version) attached to the perimeter so researchers on managed laptops on the corporate network can call the APIs from outside the perimeter.",
              "Define an access level 'corp-managed' in Access Context Manager: source IP in the corporate egress ranges AND device policy requiring a company-owned, encrypted device with screen lock (via Endpoint Verification). Attach it to the perimeter so requests from matching clients are admitted; a researcher at home on a personal laptop is refused."
            ),
            part(
              "Partner and on-prem",
              "Adds an ingress rule allowing the partner project's identities to call storage.objects.get on the one bucket (or an egress rule if data flows the other way), and routes the on-prem cluster to restricted.googleapis.com (199.36.153.4/30) over the Interconnect with DNS overriding *.googleapis.com, so only VPC-SC-supporting APIs are reachable.",
              "Ingress rule: from the partner project (identity type or specific service account) to storage.googleapis.com, method storage.objects.get, limited to the shared bucket. For the on-prem cluster: advertise 199.36.153.4/30 over the Interconnect, and in on-prem DNS point *.googleapis.com at restricted.googleapis.com, so BigQuery is reached privately and only APIs that honour the perimeter answer; private.googleapis.com (199.36.153.8/30) would also reach APIs VPC-SC does not protect."
            ),
            part(
              "Rollout",
              "Starts in dry-run mode, reviews the VPC Service Controls violation logs for legitimate flows (service accounts, Dataflow, Composer, logging sinks) and adds rules for them before enforcing.",
              "Create the perimeter in dry-run mode first. For a week, read the dry-run violation entries in Cloud Logging to find traffic that would have been blocked: pipeline service accounts, log sinks to an external project, Looker Studio, support tooling. Add ingress/egress rules or bring projects inside for each legitimate flow, then switch to enforced."
            ),
          ],
        },
      ],
    },
    {
      slug: "iap-ngfw-internal-admin-app",
      objective: "Configuring network perimeter controls: Cloud NGFW rules/policies, Identity-Aware Proxy, load balancers, Certificate Authority Service",
      kind: "build",
      title: "Put an internal admin app behind IAP and Cloud NGFW",
      brief:
        "Delacroix Freight runs an internal operations console on a managed instance group in a VPC. Today it has public IPs, SSH open from anywhere on port 22 for the ops team, and a shared password. Requirements: only employees in the ops Google Group may reach the console, from anywhere, with their corporate sign-in and 2-step verification; the VMs must have no public IPs and no open SSH, yet ops must still be able to shell into them; HTTP requests must still be filtered for common web attacks; and internal services calling the console's API must authenticate with certificates issued by the company's own CA. Design the perimeter.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the perimeter design: load balancing and IAP, firewall policy, SSH access, WAF, and certificates.",
          parts: [
            part(
              "Identity-Aware Proxy",
              "Puts the console behind an external HTTPS load balancer with Identity-Aware Proxy enabled and grants roles/iap.httpsResourceAccessor to the ops group, so Google sign-in (with 2-step verification enforced in Cloud Identity) gates every request before it reaches the backend.",
              "Front the instance group with a global external Application Load Balancer and enable IAP on the backend service. Grant the IAP-secured Web App User role (roles/iap.httpsResourceAccessor) to ops-team@delacroix.example only. Users authenticate with their Google Workspace / Cloud Identity account, where 2-step verification is enforced; the app reads the signed IAP JWT header rather than a shared password."
            ),
            part(
              "Firewall policy",
              "Writes Cloud NGFW rules (a network or hierarchical firewall policy) that allow ingress to the VMs only from Google's documented load-balancer proxy and health-check source ranges (health checks come from 35.191.0.0/16) on the app port and from IAP's range (35.235.240.0/20) on 22, with everything else denied, using tags or service accounts as targets.",
              "A hierarchical firewall policy on the folder: allow TCP 8443 from the load balancer's documented proxy source ranges and from 35.191.0.0/16 (health-check probes) to VMs with the console service account; allow TCP 22 from 35.235.240.0/20 (IAP TCP forwarding) to the same target; deny all other ingress with logging on. No rule allows 0.0.0.0/0, so the public-SSH exposure is gone."
            ),
            part(
              "No public IPs, still SSH",
              "Removes external IPs (and prevents new ones with constraints/compute.vmExternalIpAccess), uses Cloud NAT for outbound updates, and gives ops SSH through IAP TCP forwarding (gcloud compute ssh --tunnel-through-iap) gated by roles/iap.tunnelResourceAccessor.",
              "Recreate the instance template without external IPs and enforce constraints/compute.vmExternalIpAccess so none come back; add Cloud NAT so the VMs can fetch patches. Ops connect with gcloud compute ssh --tunnel-through-iap, which needs roles/iap.tunnelResourceAccessor on the instances and arrives from IAP's 35.235.240.0/20, matching the firewall rule above. Use OS Login so SSH keys are tied to identities."
            ),
            part(
              "WAF and certificates",
              "Attaches a Google Cloud Armor security policy with preconfigured WAF rules (OWASP ModSecurity Core Rule Set, e.g. SQLi and XSS) to the backend service, and uses Certificate Authority Service to run the company CA that issues client certificates for service-to-service mTLS (and server certs as needed).",
              "Attach a Cloud Armor policy to the backend service with the preconfigured OWASP rules for SQL injection, cross-site scripting and remote code execution in preview mode first, then enforce. Stand up a subordinate CA in Certificate Authority Service for the company's PKI; internal callers present client certificates it issued, validated by the load balancer's mTLS configuration (or by the service), so machine-to-machine calls are authenticated without passwords."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 3: Data protection (2) ----------------
    {
      slug: "default-cmek-or-ekm",
      objective: "Choosing between Google default encryption, customer-managed encryption keys (CMEK), and Cloud External Key Manager (EKM)",
      kind: "build",
      title: "Choose the encryption key model for four data stores",
      brief:
        "Sorrel Bank is classifying its Google Cloud data. (1) Public marketing assets in Cloud Storage: no confidentiality requirement. (2) Customer transaction records in BigQuery and Cloud SQL: regulators require the bank to control the key lifecycle (rotate, disable, destroy) and to prove separation of duties between the data owners and the key administrators. (3) Core banking ledger backups: a policy requires the keys to be generated and held in FIPS 140-2 Level 3 validated hardware. (4) A data set the bank's board has said may never be readable by Google under any circumstances, even with a lawful request, so the key material must stay outside Google Cloud. Choose the key model for each and explain the operating model.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick default encryption, CMEK (software or HSM) or Cloud EKM for each store, and explain lifecycle and separation of duties.",
          parts: [
            part(
              "Public marketing assets",
              "Chooses Google default encryption (always on, no key management burden) because there is no confidentiality or key-control requirement.",
              "Google default encryption: data is encrypted at rest with Google-managed keys automatically, which is enough for public assets; adding CMEK would be cost and operational work for no requirement."
            ),
            part(
              "Transaction records",
              "Chooses CMEK with Cloud KMS software keys in a dedicated key project, with rotation schedules and the ability to disable/destroy, and separates duties by giving data teams no KMS admin roles and KMS admins no data roles (only the service agents get encrypt/decrypt).",
              "CMEK: create keys in Cloud KMS in a separate 'sorrel-kms' project owned by the security team, set automatic rotation (for example every 90 days), and reference the key when creating the BigQuery datasets and the Cloud SQL instance. Grant roles/cloudkms.cryptoKeyEncrypterDecrypter only to the BigQuery and Cloud SQL service agents; data owners hold no KMS roles and key admins hold no data roles, which is the separation regulators want. Disabling or destroying a key version makes the data unreadable."
            ),
            part(
              "Ledger backups",
              "Chooses CMEK with Cloud HSM-backed keys (protection level HSM), which are generated and held in FIPS 140-2 Level 3 validated HSMs, used the same way as software CMEK.",
              "CMEK with Cloud HSM: create the key with protection level HSM so it is generated and stays within FIPS 140-2 Level 3 validated hardware, meeting the policy, and attach it to the backup bucket. Operationally it works like any Cloud KMS key, with a higher per-key price."
            ),
            part(
              "Board-restricted data",
              "Chooses Cloud External Key Manager (EKM), where the key lives in an external key manager the bank controls and Google calls out to it for each encrypt/decrypt; notes the availability dependency on the external system and that Key Access Justifications can show why each access was requested.",
              "Cloud EKM: the key material stays in the bank's external key manager (on-premises or a partner), and Cloud KMS holds only a reference; every encryption or decryption calls out to the external manager, so the bank can refuse or cut access and Google never holds the key. Enable Key Access Justifications to see and gate the reason for each request. Trade-off: if the external key manager is unreachable, the data is unavailable, so its uptime becomes part of the bank's SLA."
            ),
          ],
        },
      ],
    },
    {
      slug: "sensitive-data-protection-support-tickets",
      objective: "Configuring Sensitive Data Protection: discovering/redacting PII, pseudonymization, format-preserving encryption",
      kind: "build",
      title: "De-identify a support-ticket export with Sensitive Data Protection",
      brief:
        "Verity Mobile exports 2 million support tickets from BigQuery to train a text-classification model and to share with an outsourced quality team. Tickets contain free text with names, phone numbers, email addresses and sometimes payment card numbers, plus structured columns customer_id, national_id, date_of_birth and plan. Requirements: the ML team must be able to count tickets per customer over time, so the same customer must map to the same value in every export; the card numbers must keep their 16-digit format because a legacy validator rejects other shapes; birth dates may be shifted but age distribution must be preserved; the quality team must see no real identifiers. Design the Sensitive Data Protection configuration.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify the inspection and de-identification configuration, transformation by field, and how you check it worked.",
          parts: [
            part(
              "Discovery and inspection",
              "Runs sensitive data discovery / an inspection job over the BigQuery table with infoTypes such as PERSON_NAME, PHONE_NUMBER, EMAIL_ADDRESS, CREDIT_CARD_NUMBER and the relevant national ID type to find where PII lives, including in free text.",
              "Turn on sensitive data discovery for the dataset to profile every column, then run an inspection job on the tickets table with infoTypes PERSON_NAME, PHONE_NUMBER, EMAIL_ADDRESS, CREDIT_CARD_NUMBER and the national ID infoType for the country, so you know which columns and how much of the free text contain PII before choosing transformations."
            ),
            part(
              "Pseudonymisation of identifiers",
              "Uses deterministic encryption (or crypto-hash) with a Cloud KMS-wrapped key for customer_id and national_id so the same input always yields the same token (joinable, countable, reversible only with the key).",
              "customer_id and national_id: cryptoDeterministicConfig with a KMS-wrapped crypto key and a surrogate infoType, so each customer maps to one stable token across every export (counts per customer still work) and only the key holder could reverse it. Names, emails and phones in the free text: replace with the infoType name (redaction) or deterministic tokens if the ML team needs stable placeholders."
            ),
            part(
              "Format-preserving encryption and dates",
              "Applies format-preserving encryption (cryptoReplaceFfxFpeConfig, FPE-FFX) to card numbers so the output is still 16 digits, and date shifting with a per-customer context so each customer's dates shift by a consistent random offset within a bounded range, preserving the age distribution.",
              "Card numbers: cryptoReplaceFfxFpeConfig with the numeric alphabet so the output is another 16-digit string that the legacy validator accepts but that is not the real number. date_of_birth: dateShiftConfig with, say, a +/-180-day range and the customer_id as context, so one customer's dates all shift by the same amount (relative ages hold) while the overall distribution is barely changed."
            ),
            part(
              "Delivery and verification",
              "Writes the de-identified output to a separate BigQuery table or bucket that the quality team can read (and not the source), keeps the de-identify template and KMS key under security-team control, and re-inspects the output to confirm no raw identifiers remain.",
              "Store the de-identify template in a security-owned project with the wrapped key in Cloud KMS, and run the job into a new table in a project the quality team can read; they never get the source. Run the same inspection job on the output: a near-zero finding count for the raw infoTypes is the check that the export is clean, and any residual finding goes back into the template."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 4: Managing operations (2) ----------------
    {
      slug: "organisation-log-routing",
      objective: "Configuring log exports: log sinks and aggregated sinks",
      kind: "build",
      title: "Route an organisation's audit logs to a central, tamper-resistant store",
      brief:
        "Hartwell Insurance has 140 projects under four folders. The security team needs every project's Admin Activity and Data Access audit logs, plus VPC Flow Logs from production, in one place for 400 days, searchable, and unalterable by project owners. The SIEM team needs the same security logs streamed to their SIEM near real time. The finance team complains about the Cloud Logging bill, which is dominated by a chatty debug application in one project. Project teams must keep their own project logs for troubleshooting. Design the log routing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Design the sinks: scope, destinations, filters, retention, access and cost control.",
          parts: [
            part(
              "Aggregated sink",
              "Creates an aggregated sink at the organization level (--include-children) so logs from every current and future project are captured without per-project configuration, with an inclusion filter for audit logs and production flow logs.",
              "An aggregated sink on the organization with includeChildren, filter: logName:\"cloudaudit.googleapis.com/activity\" OR logName:\"cloudaudit.googleapis.com/data_access\" OR (resource.type=\"gce_subnetwork\" AND logName:\"compute.googleapis.com/vpc_flows\" AND resource.labels.project_id:\"prod-\"). New projects are covered automatically; project owners cannot edit or delete an org-level sink."
            ),
            part(
              "Destinations",
              "Routes to a Cloud Logging bucket in a dedicated security project with 400-day retention and the retention policy locked (and Log Analytics enabled) for search, and a second sink (or the same sink's copy) to a Pub/Sub topic that the SIEM pulls from; grants the sink's writer identity the right role on each destination.",
              "Destination 1: a user-defined log bucket in project sec-logging, retention 400 days, bucket locked so retention cannot be shortened, with Log Analytics enabled for SQL queries. Destination 2: a second aggregated sink with the same filter to a Pub/Sub topic in sec-logging for the SIEM's subscription. Grant each sink's writer identity (the service account shown after creating the sink) roles/logging.bucketWriter and roles/pubsub.publisher respectively."
            ),
            part(
              "Data Access logs",
              "Notes Admin Activity logs are always on but Data Access audit logs are off by default (except BigQuery) and enables them in the organization's IAM audit config for the services needed, accepting the cost.",
              "Admin Activity audit logs are written for every project automatically. Data Access audit logs are disabled by default except for BigQuery, so enable them in the organization policy's auditConfigs for Cloud Storage, Cloud SQL, Secret Manager and IAM (DATA_READ and DATA_WRITE), knowing they add volume; without this the sink would carry only BigQuery data access."
            ),
            part(
              "Cost and separation",
              "Leaves each project's _Default sink in place for team troubleshooting, and cuts cost with an exclusion filter on the chatty project's _Default sink (or a log exclusion on the debug severity) without excluding the audit logs the security sink needs.",
              "Project teams keep their _Default bucket (30-day retention) for their own troubleshooting. In the chatty project, add an exclusion to the _Default sink for the debug application's logs below WARNING severity (resource.type=\"k8s_container\" AND severity<WARNING AND resource.labels.namespace_name=\"debug-app\"), which stops the ingestion charge for those entries. Exclusions on a project's sink do not affect the org-level security sink, and audit logs are never excluded."
            ),
          ],
        },
      ],
    },
    {
      slug: "public-bucket-leaked-key-incident",
      objective: "Logging, monitoring, responding to, and remediating security incidents",
      kind: "case",
      title: "Respond to a public bucket and a leaked key",
      brief:
        "You are the on-call security engineer at Aldergate Health, a telehealth provider on Google Cloud with Security Command Center Premium. It is 06:40 on a Tuesday.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Security Command Center raises a high-severity Security Health Analytics finding: the bucket aldergate-patient-exports in project health-prod grants allUsers the Storage Object Viewer role. The bucket holds 3 GB of appointment exports. The IAM change was made at 02:13 by the service account exporter@health-prod.",
          ask: "What do you do in the first 30 minutes, and what do you look at?",
          parts: [
            part(
              "Containment",
              "Removes the allUsers binding immediately and enforces public access prevention on the bucket (and plans the org policy constraints/storage.publicAccessPrevention), preserving the finding and current IAM state for the record.",
              "Remove the allUsers binding from the bucket now and turn on public access prevention on it, which blocks any public grant from taking effect. Capture the bucket's IAM policy and the finding details before changing anything else, for the incident record."
            ),
            part(
              "Investigation",
              "Checks Cloud Audit Logs: Admin Activity for the SetIamPolicy call (who, from where, which credential) and Data Access logs on the bucket to see whether anonymous reads happened since 02:13; notes that if Data Access logging was not enabled for Cloud Storage, you cannot know what was read.",
              "In Cloud Logging, find the storage.setIamPermissions Admin Activity entry at 02:13 for the caller's IP, user agent and the exact credential (a key ID or token). Then query Data Access logs on the bucket for storage.objects.get by anonymous principals since 02:13 to learn what was downloaded. If Data Access logs were off for Cloud Storage, record that the exposure cannot be sized and treat every object as potentially read."
            ),
          ],
        },
        {
          text: "The audit log shows the SetIamPolicy call used a user-managed key for exporter@health-prod from an IP address in a country where Aldergate has no staff. Event Threat Detection then raises a finding that the same service account listed all buckets in the organisation and tried to create a new service account key.",
          ask: "What do you do now?",
          parts: [
            part(
              "Credential containment",
              "Disables the compromised key (and the service account if the pipeline can pause), revokes any sessions, and rotates to a keyless method afterwards; checks what else the credential touched (persistence: new keys, roles, VMs).",
              "Disable the exposed key immediately (gcloud iam service-accounts keys disable) and, since the exporter can pause for an hour, disable the service account itself so any other copy of the key is useless. Search Admin Activity logs for everything that principal did since 02:13: new keys, IAM grants, VMs, firewall changes; undo any that were not the pipeline's normal work."
            ),
            part(
              "Scope of exposure",
              "Determines what data was reachable with the compromised identity (its roles on buckets and other services) and prepares the breach assessment with legal/privacy, treating it as patient data exposure.",
              "List the roles the service account held across projects to see what the attacker could have reached, cross-check with Data Access logs for actual reads, and open the privacy incident process with legal: exports of appointment data may be reportable, so the facts (what, when, how much, evidence of access) are documented now, not later."
            ),
          ],
        },
        {
          text: "The incident is contained. Leadership asks what you will change so this class of incident cannot recur.",
          ask: "Name the preventive controls and the detections you add.",
          parts: [
            part(
              "Prevention",
              "Enforces organization policies constraints/storage.publicAccessPrevention and constraints/iam.disableServiceAccountKeyCreation (with constraints/iam.allowedPolicyMemberDomains to block allUsers/foreign identities), moves the exporter to an attached service account or Workload Identity Federation, and applies least privilege to its roles.",
              "Org policies: constraints/storage.publicAccessPrevention enforced so no bucket can be made public; constraints/iam.disableServiceAccountKeyCreation so no new user-managed keys; constraints/iam.allowedPolicyMemberDomains to stop grants to allUsers and identities outside the company's Cloud Identity. Re-platform the exporter to run on Cloud Run with an attached service account scoped to only the export bucket, so there is no key to steal."
            ),
            part(
              "Detection and response",
              "Keeps Security Command Center Premium findings (Security Health Analytics, Event Threat Detection) routed to Pub/Sub for paging, enables Data Access logs on Cloud Storage for the sensitive buckets, and adds log-based alerts for public IAM grants and key creation; writes the runbook from this incident.",
              "Export Security Command Center findings by notification config to Pub/Sub into the paging system so a high-severity finding wakes someone at 02:13, not 06:40. Enable Data Access audit logs for Cloud Storage on the patient-data projects so the next exposure can be sized. Add log-based alerts for SetIamPolicy with allUsers or allAuthenticatedUsers and for CreateServiceAccountKey. Turn tonight's steps into the public-exposure runbook."
            ),
          ],
        },
      ],
    },

    // ---------------- Section 5: Compliance (2) ----------------
    {
      slug: "eu-residency-compliance-controls",
      objective: "Configuring compliance-supporting controls: Assured Workloads, organization policies, Access Transparency, Access Approval, data/service regionalization",
      kind: "build",
      title: "Configure controls for an EU data-residency mandate",
      brief:
        "Lindqvist Pensions, regulated in the EU, is moving its member-records platform to Google Cloud under these conditions from its regulator: member data and the services processing it must stay in EU regions; the pension fund must hold and control the encryption keys; any access to its data by the cloud provider's staff must be logged and, for the production environment, approved in advance by the fund; and the controls must be enforced technically, not by policy documents. Design the Google Cloud configuration that meets each condition and say how you evidence it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Map each regulatory condition to the Google Cloud control that enforces it, and describe the evidence.",
          parts: [
            part(
              "Residency",
              "Creates the workloads in an Assured Workloads folder with an EU control package (EU Data Boundary and Support, which applies the location organization policy and related guardrails) and/or enforces constraints/gcp.resourceLocations to EU locations, and restricts which services can be used to EU-regional ones.",
              "Create an Assured Workloads folder with the EU Data Boundary and Support control package; it configures the resource-location organization policy (constraints/gcp.resourceLocations limited to EU regions) and related guardrails on everything created under it. Add constraints/gcp.restrictServiceUsage so only services with EU-regional deployments are enabled. Resources that would be created outside the EU fail at creation time, which is the technical enforcement the regulator asked for."
            ),
            part(
              "Key control",
              "Uses CMEK with keys in Cloud KMS in an EU region (HSM if required), with the fund's security team as key administrators, and notes Assured Workloads can require CMEK through its policies.",
              "All data services use customer-managed encryption keys from a Cloud KMS key ring in an EU region, administered by the fund's security team, with rotation and the ability to disable. The Assured Workloads folder can enforce CMEK use so a project cannot fall back to Google-managed keys. Cloud EKM is the escalation if the regulator later demands keys outside Google Cloud."
            ),
            part(
              "Provider access",
              "Enables Access Transparency (logs of Google personnel access with justification) organisation-wide and Access Approval on the production projects so Google must request and receive the fund's approval before accessing its content, with approvers in the fund's security team.",
              "Enable Access Transparency so every access to the fund's content by Google staff produces a log entry with the reason and the ticket, and enable Access Approval on the production projects so such access requires an explicit approval from the fund's named approvers before it happens (with the option to require EU-based personnel via Assured Workloads' support controls). Non-production keeps Access Transparency logging only."
            ),
            part(
              "Evidence",
              "Routes Access Transparency and Access Approval logs plus org-policy audit logs to the compliance log store, uses Assured Workloads monitoring to detect policy violations, and exports Security Command Center compliance reports for the regulator.",
              "Sink Access Transparency, Access Approval and Admin Activity logs to the retained compliance bucket. Assured Workloads monitoring raises a violation if someone changes the location policy or CMEK settings under the folder, which becomes a finding. For the regulator, provide the org-policy configuration export, the Assured Workloads compliance status and Security Command Center's compliance dashboard export for the EU control package."
            ),
          ],
        },
      ],
    },
    {
      slug: "map-cardholder-requirements-to-controls",
      objective: "Mapping compliance requirements to Google Cloud services and controls: network/access segmentation, audit log coverage",
      kind: "build",
      title: "Map a cardholder-data audit's requirements to Google Cloud controls",
      brief:
        "Tamsin Ticketing processes card payments through a checkout service on GKE that talks to a tokenisation API and a Cloud SQL database, all in the project pay-prod. Marketing's website and analytics live in other projects. An external assessor has sent four requirements ahead of the audit: (1) systems that store, process or transmit cardholder data must be segmented from all other systems and the segmentation proven; (2) every administrative action and every access to cardholder data must be logged, with logs protected from tampering and retained for a year; (3) access to cardholder systems must be limited to named individuals with multi-factor authentication and reviewed quarterly; (4) the company must state which controls are Google's responsibility and which are its own. Map each to the Google Cloud controls you will show.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "For each requirement, name the Google Cloud controls that satisfy it and the artefact you will show the assessor.",
          parts: [
            part(
              "Segmentation",
              "Isolates the in-scope workload in its own project(s) and VPC (or Shared VPC subnet) with Cloud NGFW rules allowing only required flows, a VPC Service Controls perimeter around pay-prod's data services, and GKE network policies between pods; proves it with firewall rule exports, flow logs and a connectivity test.",
              "Scope is the pay-prod project: its own VPC with Cloud NGFW rules that allow only the checkout, tokenisation and database flows and deny everything else (logging on), a VPC Service Controls perimeter around pay-prod's Cloud SQL and Cloud Storage so other projects cannot reach the data through APIs, and GKE network policies so only the checkout pods reach the tokenisation service. Evidence: the firewall policy export, Network Intelligence Center connectivity tests from a marketing VM failing to reach the database, and VPC Flow Logs."
            ),
            part(
              "Audit log coverage",
              "Enables Data Access audit logs for Cloud SQL, Cloud Storage and the other in-scope services (Admin Activity is always on), routes them via an org-level sink to a locked log bucket with 400-day retention in a separate security project.",
              "Admin Activity logs cover every administrative action by default; enable Data Access audit logs (DATA_READ and DATA_WRITE) for Cloud SQL, Cloud Storage, Secret Manager and GKE in pay-prod so reads of cardholder data are logged too. Route both with an aggregated sink to a log bucket in sec-logging with 400-day retention and the retention policy locked, which no pay-prod admin can change. Evidence: the auditConfigs, the sink definition and the bucket's locked retention."
            ),
            part(
              "Access control",
              "Grants access via Google Groups to named people with 2-step verification enforced (security keys for admins) in Cloud Identity, no shared accounts, just-in-time elevation with Privileged Access Manager for admin roles, and quarterly access reviews using IAM policy exports and Policy Analyzer / recommender.",
              "Access to pay-prod goes through small Google Groups of named employees; Cloud Identity enforces 2-step verification with security keys for the payments admins. No shared or generic accounts; service accounts use attached identities, not keys. Standing admin roles are removed and replaced by Privileged Access Manager entitlements with approval and a time limit. Quarterly, export the IAM policies and Policy Analyzer's role-usage recommendations and have the owner sign off on who still needs access."
            ),
            part(
              "Shared responsibility",
              "Writes a responsibility matrix: Google is responsible for physical security, hardware, host OS and the managed services' infrastructure (evidenced by Google's compliance reports and attestations), while Tamsin is responsible for IAM, data classification, network configuration, GKE workload security, key management and logging; cites the Compliance Reports Manager for Google's attestations.",
              "Produce a matrix: Google secures the data centres, hardware, hypervisor and the infrastructure of GKE, Cloud SQL and Cloud Storage, evidenced by the PCI DSS attestation of compliance available from Google's Compliance Reports Manager; Tamsin owns identities and IAM, firewall and perimeter configuration, GKE node and workload hardening, Cloud SQL users and encryption keys, audit-log configuration and retention, and the application's own card handling. The assessor sees Google's report for Google's half and Tamsin's configuration evidence for its own."
            ),
          ],
        },
      ],
    },
  ],
};
