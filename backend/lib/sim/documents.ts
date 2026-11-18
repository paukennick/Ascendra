// REQ-162/REQ-190 (docs/sims.md 12, 4.7, 4.8): the authored scenario
// documents and their golden paths, in seed order. Phase 1a lists them for
// the tests; the seed reads the same list. A document is either a scenario
// source (`<slug>.sim.json`, which may splice modules) or a difficulty band
// (`<slug>.band.json`, a merge-patch over another scenario's source). Either
// way compileEntry() turns it into one plain ScenarioDoc, which is what the
// linter, the golden replays, the content hash and the app see.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyBand, thresholdProblems } from "./overlay.ts";
import type { BandFile } from "./overlay.ts";
import { spliceModules } from "./modules.ts";
import type { Problem, ScenarioDoc } from "./engine/v1/types.ts";

export interface DocumentEntry {
  course: string; // the track code the objective belongs to
  slug: string;
  file: string; // the source: <slug>.sim.json, or <slug>.band.json for a band
  golden: string | null;
  kind: "scenario" | "band";
  // REQ-236: where the content came from, written to sim_versions.source. A
  // document written by `npm run sims:generate` (REQ-230) and registered by
  // hand is "generated" (entry(course, slug, { source: "generated" }), as
  // its .register.md says); everything else is "authored".
  source: "authored" | "generated";
}

export interface EntryOptions {
  source?: "authored" | "generated";
}

const ROOT = join(__dirname, "..", "..", "supabase", "seed", "sims");

function entry(course: string, slug: string, opts: EntryOptions = {}): DocumentEntry {
  return { course, slug, file: join(ROOT, course, `${slug}.sim.json`), golden: join(ROOT, course, `${slug}.golden.json`), kind: "scenario", source: opts.source ?? "authored" };
}

function band(course: string, slug: string, opts: EntryOptions = {}): DocumentEntry {
  return { course, slug, file: join(ROOT, course, `${slug}.band.json`), golden: join(ROOT, course, `${slug}.golden.json`), kind: "band", source: opts.source ?? "authored" };
}

// Phase 1a step 5: the prototype ports. Tamponade after CABG (now hosting the
// code/ACLS module, REQ-190) and the TicketBurst launch day (AWSSAA), plus its
// SAP band (AWSSAP). The Lakeshore clinic app (PMP) and Dana's knee valgus
// (NASMCPT) are deferred. REQ-222 (batch S2a): three more CCRN Adult cases
// on the bedside renderer, authored without a prototype (golden paths from
// scripts/sim-golden/<slug>.steps.ts).
export const ALL_DOCUMENTS: readonly DocumentEntry[] = [
  entry("CCRNADULT", "tamponade-after-cabg"),
  entry("CCRNADULT", "sepsis-to-septic-shock"),
  entry("CCRNADULT", "dka-first-six-hours"),
  entry("CCRNADULT", "acute-ischemic-stroke-lvo"),
  entry("AWSSAA", "ticketburst-launch-day"),
  band("AWSSAP", "ticketburst-launch-day-sap"),
  // ---- REQ-223 (batch S2b): post-op hemorrhage (CCRN Adult), choking and a
  // fall (CNA, nurse-aide scope). Keep these entries together. ----
  entry("CCRNADULT", "bleeding-after-whipple"),
  entry("CNA", "resident-chokes-at-lunch"),
  entry("CNA", "resident-found-on-floor"),
  // ---- end REQ-223 (S2b) ----
  // ---- REQ-225 (EPPP-B): client-session scenarios, course EPPP ----------
  // The EPPP course and these objective titles come from the EPPP course
  // work (feature/eppp-course); the seed resolves each by course code and
  // exact objective title and stops with a clear error until it is seeded.
  // EPPP_SESSION_DOCUMENTS (below) lists the same entries for the tests.
  entry("EPPP", "suicide-risk-safety-plan"),
  entry("EPPP", "duty-to-protect-threat"),
  entry("EPPP", "diagnostic-intake-mood"),
  // ---- end REQ-225 (EPPP-B) -------------------------------------------
  // ---- REQ-231: security console incidents, course SECPLUS (SY0-701), and
  // each as a V8 band (SECPLUSV8, SY0-801: same incident, the V8 objective).
  entry("SECPLUS", "phish-to-account-takeover"),
  band("SECPLUSV8", "phish-to-account-takeover-v8"),
  entry("SECPLUS", "ransomware-file-server"),
  band("SECPLUSV8", "ransomware-file-server-v8"),
  entry("SECPLUS", "cloud-iam-backdoor"),
  band("SECPLUSV8", "cloud-iam-backdoor-v8"),
  // ---- end REQ-231 ------------------------------------------------------
  // ---- REQ-232: PT treatment-session scenarios, course DPT ------------
  entry("DPT", "icu-early-mobility"),
  entry("DPT", "tka-gait-dvt-red-flag"),
  entry("DPT", "stroke-balance-fall-risk"),
  // ---- end REQ-232 -----------------------------------------------------
  // ---- REQ-233 (bedside wave 1): CCRN Pediatric, CCRN Neonatal, NCLEX-RN
  // and NCLEX-PN bedside cases, and a second AWS SAA board case. Keep these
  // entries together. ----
  entry("CCRNPEDS", "pediatric-septic-shock-fluids"),
  entry("CCRNPEDS", "pediatric-dka-cerebral-edema"),
  entry("CCRNNEO", "neonatal-rds-escalating-support"),
  entry("CCRNNEO", "neonatal-sepsis-hypoglycemia"),
  entry("NCLEXRN", "med-surg-deterioration-sbar"),
  entry("NCLEXRN", "post-op-transfusion-reaction"),
  entry("NCLEXPN", "ltc-change-in-condition"),
  entry("NCLEXPN", "med-pass-error-caught"),
  entry("AWSSAA", "nat-gateway-bill-spike"),
  // ---- end REQ-233 ----
  // ---- REQ-242 (AWS board sims, wave 2): AWS MLA, Cloud Practitioner,
  // Developer and SysOps (CloudOps) board cases, learner-paced, set in
  // us-east-2. Keep these entries together. ----
  entry("AWSMLA", "fraud-model-drift"),
  entry("AWSMLA", "endpoint-scaling-latency"),
  entry("AWSMLA", "loan-data-bias"),
  entry("AWSCLF", "data-transfer-surprise"),
  entry("AWSCLF", "leaked-access-key"),
  entry("AWSDVA", "canary-rollback-dlq"),
  entry("AWSDVA", "phi-in-application-logs"),
  entry("AWSSOA", "stack-update-rollback-failed"),
  entry("AWSSOA", "ec2-status-check-recovery"),
  // ---- end REQ-242 ----
  // ---- REQ-238 (security wave 2): security-console incidents for CySA+,
  // PenTest+, SecurityX and SecAI+, two each. Keep these entries together. ----
  entry("CYSAPLUS", "alert-triage-lolbin-hunt"),
  entry("CYSAPLUS", "vuln-prioritization-kev-edge"),
  entry("PENTESTPLUS", "pentest-third-party-webshell"),
  entry("PENTESTPLUS", "pentest-scope-boundary"),
  entry("SECURITYX", "federation-token-forgery"),
  entry("SECURITYX", "ot-segmentation-breach"),
  entry("SECAIPLUS", "agent-indirect-prompt-injection"),
  entry("SECAIPLUS", "rag-assistant-data-leak"),
  // ---- end REQ-238 ----
  // ---- REQ-240 (bedside wave 2, nursing): LPN/VN, ADN-RN and BSN-RN
  // baseline bedside cases, two each. Keep these entries together. ----
  entry("LPNVN", "ltc-pressure-injury-infection"),
  entry("LPNVN", "ltc-insulin-hypoglycemia"),
  entry("ADNRN", "pca-oversedation-naloxone"),
  entry("ADNRN", "heart-failure-pulmonary-edema"),
  entry("BSNRN", "assisted-living-norovirus-outbreak"),
  entry("BSNRN", "charge-nurse-short-staffed-shift"),
  // ---- end REQ-240 ----
  // ---- REQ-237: terminal and network screen, Linux+ (LINUXPLUS), Network+
  // (NETWORKPLUS) and CKA outages. Keep these entries together. ----
  entry("LINUXPLUS", "full-var-stops-database"),
  entry("LINUXPLUS", "selinux-denies-moved-site"),
  entry("NETWORKPLUS", "vlan-missing-from-trunk"),
  entry("NETWORKPLUS", "branch-dns-route-typo"),
  entry("CKA", "crashloop-bad-configmap"),
  entry("CKA", "node-notready-swap-drain"),
  // ---- end REQ-237 ----
  // ---- REQ-239: NBCC client sessions, courses NCE and NCMHCE (session
  // renderer, clinical-session profile; NBCC_SESSION_DOCUMENTS below) ----
  entry("NCE", "nce-boundary-dual-relationship"),
  entry("NCE", "nce-substance-use-screen"),
  entry("NCMHCE", "ncmhce-intake-ptsd-alcohol"),
  entry("NCMHCE", "ncmhce-suicide-safety-plan"),
  entry("NCMHCE", "ncmhce-trauma-treatment-plan"),
  // ---- end REQ-239 ----
  // ---- REQ-241 (bedside wave 2, EMS): prehospital bedside cases for the
  // four NREMT courses, two each, within each level's scope of practice.
  // Keep these entries together. ----
  entry("NREMTEMR", "unresponsive-adult-cpr-aed"),
  entry("NREMTEMR", "thigh-bleed-tourniquet"),
  entry("NREMTEMT", "anaphylaxis-epinephrine"),
  entry("NREMTEMT", "stroke-scale-destination"),
  entry("NREMTAEMT", "hypoglycemia-iv-dextrose"),
  entry("NREMTAEMT", "hemorrhagic-shock-fluids"),
  entry("NREMTPARAMEDIC", "inferior-stemi-cath-alert"),
  entry("NREMTPARAMEDIC", "infant-respiratory-failure"),
  // ---- end REQ-241 ----
  // ---- REQ-297 (IT sims, wave 3): more learner-paced sims for the existing
  // non-clinical courses on the existing terminal, security console and
  // board screens (docs/sims-coverage-it.md). Keep these entries together. ----
  entry("APLUS_CORE1", "rogue-dhcp-soho-office"),
  entry("APLUS_CORE2", "home-office-laptop-malware"),
  entry("KCNA", "service-selector-no-endpoints"),
  band("CKA", "service-selector-no-endpoints-cka"),
  entry("GCPACE", "public-bucket-customer-exports"),
  entry("GCPCDL", "bigquery-dashboard-bill"),
  band("SECPLUS", "vuln-prioritization-kev-edge-secplus"),
  band("SECPLUS", "alert-triage-lolbin-hunt-secplus"),
  entry("AWSSAA", "waf-login-flood-sqli"),
  entry("AWSSOA", "rds-update-without-where-pitr"),
  entry("GCPACE", "cloud-run-bad-revision-rollback"),
  entry("LINUXPLUS", "systemd-dropin-breaks-export"),
  entry("CKA", "apiserver-static-pod-bad-flag"),
  entry("SECPLUS", "firewall-change-backout"),
  // ---- end REQ-297 ----
  // ---- REQ-292: LFCS and Linux Fundamentals cases on the terminal screen.
  // Keep these entries together. ----
  entry("LFCS", "fstab-uuid-typo-emergency"),
  entry("LFCS", "lvm-database-volume-full"),
  entry("LFCS", "report-workers-starve-api"),
  entry("LFCS", "clock-skew-blocks-logins"),
  entry("LFCS", "sale-traffic-third-backend"),
  entry("LFCS", "service-no-restart-after-update"),
  entry("LINUXFUND", "shared-folder-permission-denied"),
  entry("LINUXFUND", "web-service-fails-after-edit"),
  entry("LINUXFUND", "nightly-backup-missing"),
  entry("PYAUTO", "debug-log-fills-var"),
  entry("PYDATA", "board-orders-by-region"),
  // ---- end REQ-292 ----
  // ---- REQ-269: sims for the new technology courses (SQL and TSNODE on the
  // terminal screen, SC500 on the security console, AI200 on the terminal).
  // Keep these entries together. ----
  entry("SQL", "sql-slow-login-seq-scan"),
  entry("SQL", "sql-flash-sale-oversold"),
  entry("TSNODE", "node-env-file-silent-exit"),
  entry("TSNODE", "node-type-stripping-enum-crash"),
  entry("SC500", "sc500-illicit-consent-grant"),
  entry("SC500", "sc500-backup-vault-sabotage"),
  entry("AI200", "ai200-containerapp-keyvault-revision"),
  entry("AI200", "ai200-kql-checkout-latency"),
  // ---- end REQ-269 ----
  // ---- REQ-274: security-console incidents for the non-CompTIA security
  // courses (ISC2 CC, CISSP, ISACA CISM, EC-Council CEH; coverage table in
  // docs/sims.md 22.19). Keep these entries together. ----
  entry("ISC2CC", "cc-triage-phish-correlation"),
  entry("ISC2CC", "cc-leaver-account-still-active"),
  entry("CISSP", "cissp-web-tier-data-theft"),
  entry("CISSP", "cissp-ransomware-recovery-site"),
  entry("CISM", "cism-payroll-supplier-breach"),
  entry("CISM", "cism-checkout-skimmer-containment"),
  entry("CEH", "ceh-arp-poisoning-finance-vlan"),
  entry("CEH", "ceh-blind-sqli-search"),
  // ---- end REQ-274 ----
  // ---- REQ-282: NASM Certified Nutrition Coach client sessions (session
  // renderer, clinical-session profile; CNC_SESSION_DOCUMENTS below) ----
  entry("NASMCNC", "cnc-crash-diet-request"),
  entry("NASMCNC", "cnc-greens-powder-warfarin"),
  // ---- end REQ-282 ----
  // ---- REQ-314: the client trainer, the facility console and the sandbox
  // report (docs/sims.md 22.27). Keep these entries together. ----
  entry("NASMCPT", "cpt-parq-chest-tightness"),
  band("ACECPT", "ace-parq-chest-tightness"),
  band("ACSMCPT", "acsm-parq-chest-tightness"),
  band("NSCACPT", "nscacpt-parq-chest-tightness"),
  band("NCCPTCPT", "nccpt-parq-chest-tightness"),
  entry("NASMCPT", "cpt-squat-knees-cave"),
  band("ACECPT", "ace-squat-knees-cave"),
  band("ACSMCPT", "acsm-squat-knees-cave"),
  band("NSCACPT", "nscacpt-squat-knees-cave"),
  band("NCCPTCPT", "nccpt-squat-knees-cave"),
  entry("NASMCNC", "cnc-ambivalent-food-record"),
  entry("CISSP", "cissp-datahall-tailgate-cooling"),
  band("SECPLUS", "datahall-tailgate-cooling-secplus"),
  entry("CEH", "ceh-sandbox-invoice-loader"),
  band("CYSAPLUS", "sandbox-invoice-loader-cysa"),
  // ---- end REQ-314 ----
  // ---- REQ-288: ASWB client sessions, courses ASWBCLINICAL and ASWBMASTERS
  // (session renderer, clinical-session profile; ASWB_SESSION_DOCUMENTS
  // below). Keep these entries together. ----
  entry("ASWBCLINICAL", "aswbc-suicide-violence-risk"),
  entry("ASWBCLINICAL", "aswbc-threat-identifiable-person"),
  entry("ASWBCLINICAL", "aswbc-termination-nonpayment"),
  entry("ASWBMASTERS", "aswbm-involuntary-engagement"),
  entry("ASWBMASTERS", "aswbm-child-abuse-report"),
  entry("ASWBMASTERS", "aswbm-boundaries-small-town"),
  // REQ-289: the same sessions on the other ASWB course's shared objective
  // (bands, docs/sims.md 4.7), and the EPPP duty-to-protect session on the
  // Washington jurisprudence objective.
  band("ASWBCLINICAL", "aswbc-boundaries-small-town"),
  band("ASWBMASTERS", "aswbm-termination-nonpayment"),
  band("ASWBMASTERS", "aswbm-suicide-violence-risk"),
  band("WAPSYCHJP", "wajp-duty-to-protect-threat"),
  // ---- end REQ-288 ----
  // ---- REQ-296 (clinical coverage): more sims on the existing clinical
  // courses, launch courses first (docs/sims-coverage-clinical.md). Keep
  // these entries together. ----
  entry("CNA", "evening-vitals-out-of-range"),
  entry("PTPREREQ", "cycle-test-falling-pressure"),
  entry("NCLEXRN", "postpartum-hemorrhage-atony"),
  entry("CCRNADULT", "status-epilepticus-after-craniotomy"),
  entry("DPT", "dizziness-central-red-flags"),
  entry("NCLEXPN", "first-dose-anaphylaxis"),
  entry("NCLEXRN", "hyperkalemia-critical-value"),
  entry("NCLEXPN", "postpartum-check-boggy-fundus"),
  entry("DPT", "parkinson-freezing-session"),
  // ---- end REQ-296 ----
  // ---- REQ-275 to REQ-278 (nursing specialty bedside sims): CMSRN, CEN,
  // PCCN and the two FNP courses. Keep these entries together. ----
  entry("PCCN", "femoral-access-retroperitoneal-bleed"),
  entry("PCCN", "copd-exacerbation-niv"),
  entry("CMSRN", "postop-hemorrhage-early-signs"),
  entry("CMSRN", "delegation-morning-assignment"),
  entry("CEN", "triage-sepsis-first-hour"),
  entry("CEN", "waiting-room-esi-retriage"),
  entry("FNPAANP", "clinic-severe-bp-stroke-signs"),
  entry("FNPANCC", "clinic-sulfonylurea-hypoglycemia"),
  // ---- end REQ-275 to REQ-278 ----
  // ---- REQ-311: Scrum Sprints on the project dashboard's Sprint mode
  // (project-dashboard renderer, scrum profile), course PSMI, each also a
  // band on the same CSM objective (docs/sims.md 22.24). Keep these entries
  // together. ----
  entry("PSMI", "sprint-status-meeting-daily-scrum"),
  band("CSM", "csm-sprint-status-meeting-daily-scrum"),
  entry("PSMI", "sprint-goal-becomes-obsolete"),
  band("CSM", "csm-sprint-goal-becomes-obsolete"),
  entry("PSMI", "sprint-release-before-review"),
  band("CSM", "csm-sprint-release-before-review"),
  // The ITIL service desk, course ITIL5FND. That course is built on another
  // branch (REQ-308, feature/itil5); until it is in the catalog the seed
  // stops here with a clear error, and lib/sim/objectives.test.ts checks
  // the titles against ITIL5_DESK_OBJECTIVES below instead.
  entry("ITIL5FND", "monday-service-desk-wifi-problem"),
  // ---- end REQ-311 ----
  // ---- REQ-312: the data and code console (screen type data, data profile;
  // docs/sims.md 22.25), launch courses first. Keep these entries together. ----
  entry("PYTHON", "py-report-too-slow-profile"),
  entry("PL300", "pl300-rls-region-manager"),
  entry("PL300", "pl300-stock-on-hand-summed"),
  entry("CSSGB", "cssgb-fill-weight-chart"),
  entry("JAVASCRIPT", "js-rate-board-zero-percent"),
  band("TSNODE", "js-rate-board-zero-percent-tsnode"),
  entry("PYTHON", "py-import-crash-traceback"),
  band("PCAP", "py-import-crash-traceback-pcap"),
  band("PCEP", "py-import-crash-traceback-pcep"),
  entry("SQL", "sql-not-in-null-empty-list"),
  entry("CSSGB", "cssgb-capability-tool-wear"),
  entry("JAVASCRIPT", "js-checkout-shipping-concatenated"),
  // ---- end REQ-312 ----
  // ---- REQ-313: the governance board, the tabletop exercise and the
  // professional-ethics conversations (docs/sims.md 22.26;
  // GOVERNANCE_DOCUMENTS below). Keep these entries together. ----
  entry("CISM", "cism-security-business-case-budget"),
  entry("CISM", "cism-risk-appetite-exception"),
  entry("CISM", "cism-ransomware-tabletop"),
  entry("ISC2CC", "cc-ethics-shared-credentials"),
  entry("CISSP", "cissp-ethics-audit-finding-pressure"),
  entry("CISSP", "cissp-flood-continuity-tabletop"),
  // REQ-313 bands (docs/sims.md 4.7): the same case on another course's
  // objective that it teaches.
  band("ISC2CC", "cc-ransomware-tabletop"),
  band("SECPLUS", "ransomware-tabletop-secplus"),
  band("SECPLUSV8", "ransomware-tabletop-v8"),
  band("SECPLUS", "risk-exception-appetite-secplus"),
  band("SECPLUSV8", "risk-exception-appetite-v8"),
  band("ISC2CC", "cc-flood-continuity-tabletop"),
  band("SECPLUS", "flood-continuity-tabletop-secplus"),
  band("SECPLUSV8", "flood-continuity-tabletop-v8"),
  // ---- end REQ-313 ----
  // ---- REQ-316 (IT sims, wave 4): launch courses first; bands register a case another course
  // already teaches on this course's objective (docs/sims.md 22.29). Keep
  // these entries together. ----
  band("SECPLUS", "ransomware-recovery-site-secplus"),
  band("SECPLUS", "payroll-supplier-breach-secplus"),
  band("SECPLUS", "arp-poisoning-finance-vlan-secplus"),
  band("SECPLUS", "blind-sqli-search-secplus"),
  band("SECPLUS", "triage-phish-correlation-secplus"),
  band("SECPLUS", "checkout-skimmer-containment-secplus"),
  band("SECPLUS", "web-tier-data-theft-secplus"),
  band("SECPLUS", "ot-segmentation-breach-secplus"),
  band("APLUS_CORE2", "firewall-change-backout-aplus2"),
  band("NETWORKPLUS", "arp-poisoning-finance-vlan-netplus"),
  band("NETWORKPLUS", "firewall-change-backout-netplus"),
  band("NETWORKPLUS", "rogue-dhcp-soho-office-netplus"),
  band("NETWORKPLUS", "ransomware-recovery-site-netplus"),
  band("LINUXPLUS", "fstab-uuid-typo-emergency-linuxplus"),
  band("LINUXPLUS", "report-workers-starve-api-linuxplus"),
  band("LINUXPLUS", "lvm-database-volume-full-linuxplus"),
  band("LINUXPLUS", "clock-skew-blocks-logins-linuxplus"),
  band("LINUXPLUS", "shared-folder-permission-denied-linuxplus"),
  band("LINUXPLUS", "nightly-backup-missing-linuxplus"),
  band("KCNA", "crashloop-bad-configmap-kcna"),
  band("KCNA", "apiserver-static-pod-bad-flag-kcna"),
  band("AWSSOA", "waf-login-flood-sqli-soa"),
  band("AWSSOA", "nat-gateway-bill-spike-soa"),
  band("AWSSOA", "canary-rollback-dlq-soa"),
  band("AWSSOA", "leaked-access-key-soa"),
  band("AWSSAA", "leaked-access-key-saa"),
  band("AWSSAA", "rds-update-without-where-pitr-saa"),
  band("AWSCLF", "waf-login-flood-sqli-clf"),
  band("AWSCLF", "nat-gateway-bill-spike-clf"),
  band("GCPACE", "bigquery-dashboard-bill-ace"),
  band("GCPCDL", "public-bucket-customer-exports-cdl"),
  band("GCPCDL", "cloud-run-bad-revision-rollback-cdl"),
  entry("SECPLUS", "spoofed-ceo-wire-dmarc"),
  entry("SECPLUS", "departing-engineer-usb-evidence"),
  entry("AWSSOA", "alb-health-check-login-redirect"),
  entry("AWSSAA", "guardduty-role-credentials-macie"),
  entry("LINUXPLUS", "retired-dns-server-orders-stuck"),
  entry("CKA", "etcd-restore-deleted-namespace"),
  // ---- end REQ-316 ----
  // ---- REQ-315 (clinical sims, round of 2026-11-16): bands that register a
  // case another course already teaches to this course's objective (4.7),
  // then new cases on the launch courses. Keep these entries together. ----
  band("NCLEXRN", "delegation-morning-assignment-nclexrn"),
  band("NCLEXRN", "postop-hemorrhage-early-signs-nclexrn"),
  band("NCLEXRN", "heart-failure-pulmonary-edema-nclexrn"),
  band("NCLEXRN", "pca-oversedation-naloxone-nclexrn"),
  band("NCLEXRN", "copd-exacerbation-niv-nclexrn"),
  band("NCLEXRN", "sepsis-to-septic-shock-nclexrn"),
  band("NCLEXPN", "ltc-insulin-hypoglycemia-nclexpn"),
  band("NCLEXPN", "ltc-pressure-injury-infection-nclexpn"),
  band("CCRNADULT", "copd-exacerbation-niv-ccrn"),
  band("CCRNADULT", "post-op-transfusion-reaction-ccrn"),
  band("CCRNADULT", "pca-oversedation-naloxone-ccrn"),
  band("CCRNADULT", "heart-failure-pulmonary-edema-ccrn"),
  band("NPTEPT", "tka-gait-dvt-red-flag-npte"),
  band("NPTEPT", "parkinson-freezing-session-npte"),
  band("NPTEPT", "dizziness-central-red-flags-npte"),
  band("NPTEPT", "icu-early-mobility-npte"),
  band("NPTEPT", "stroke-balance-fall-risk-npte"),
  band("NCE", "nce-suicide-safety-plan"),
  band("NCMHCE", "ncmhce-boundary-dual-relationship"),
  entry("NCLEXRN", "alcohol-withdrawal-ciwa"),
  entry("CNA", "sundowning-at-the-exit-door"),
  entry("CCRNADULT", "tension-pneumothorax-after-line"),
  entry("NCLEXPN", "head-strike-on-apixaban"),
  entry("NCLEXRN", "oxytocin-tachysystole-late-decels"),
  // ---- end REQ-315 ----
  // ---- REQ-321 (sims for the PMI and CompTIA courses that had none, round of
  // 2026-11-17): bands that register a case another course already teaches on
  // this course's objective (docs/sims.md 4.7, 22.31), launch courses first;
  // lib/sim/pm-comptia.ts lists them by slug. Keep these entries together. ----
  band("PMP", "sprint-release-before-review-pmp"),
  band("PMP", "sprint-goal-becomes-obsolete-pmp"),
  band("PMP", "sprint-status-meeting-daily-scrum-pmp"),
  band("CAPM", "sprint-status-meeting-daily-scrum-capm"),
  band("PMIACP", "sprint-release-before-review-pmiacp"),
  band("PMIACP", "sprint-status-meeting-daily-scrum-pmiacp"),
  band("PMIACP", "sprint-goal-becomes-obsolete-pmiacp"),
  band("PROJECTPLUS", "sprint-status-meeting-daily-scrum-projectplus"),
  band("PROJECTPLUS", "firewall-change-backout-projectplus"),
  band("SERVERPLUS", "retired-dns-server-orders-stuck-serverplus"),
  band("SERVERPLUS", "sale-traffic-third-backend-serverplus"),
  band("SERVERPLUS", "report-workers-starve-api-serverplus"),
  band("SERVERPLUS", "service-no-restart-after-update-serverplus"),
  band("SERVERPLUS", "nightly-backup-missing-serverplus"),
  band("SERVERPLUS", "shared-folder-permission-denied-serverplus"),
  band("CLOUDNETX", "sale-traffic-third-backend-cloudnetx"),
  band("CLOUDNETX", "firewall-change-backout-cloudnetx"),
  band("CLOUDNETX", "branch-dns-route-typo-cloudnetx"),
  band("CLOUDNETX", "retired-dns-server-orders-stuck-cloudnetx"),
  band("CLOUDPLUS", "nat-gateway-bill-spike-cloudplus"),
  band("CLOUDPLUS", "leaked-access-key-cloudplus"),
  band("CLOUDPLUS", "rds-update-without-where-pitr-cloudplus"),
  band("CLOUDPLUS", "cloud-run-bad-revision-rollback-cloudplus"),
  band("AUTOOPSPLUS", "py-import-crash-traceback-autoopsplus"),
  band("AUTOOPSPLUS", "web-service-fails-after-edit-autoopsplus"),
  band("AUTOOPSPLUS", "canary-rollback-dlq-autoopsplus"),
  band("DATAPLUS", "sql-not-in-null-empty-list-dataplus"),
  band("DATAPLUS", "stock-on-hand-summed-dataplus"),
  band("DATAPLUS", "rls-region-manager-dataplus"),
  band("DATAAI", "loan-data-bias-dataai"),
  band("DATAAI", "fraud-model-drift-dataai"),
  band("TECHPLUS", "rogue-dhcp-soho-office-techplus"),
  band("TECHPLUS", "home-office-laptop-malware-techplus"),
  band("TECHPLUS", "branch-dns-route-typo-techplus"),
  band("PMICPMAI", "loan-data-bias-pmicpmai"),
  band("PMICPMAI", "fraud-model-drift-pmicpmai"),
  band("CMPCBS", "phish-to-account-takeover-cmpcbs"),
  // The first predictive case on the project dashboard (PMP), and its bands.
  entry("PMP", "pmp-clinic-fitout-schedule-variance"),
  band("CAPM", "clinic-fitout-variance-capm"),
  band("PMISP", "clinic-fitout-variance-pmisp"),
  band("PROJECTPLUS", "clinic-fitout-variance-projectplus"),
  band("PMICP", "clinic-fitout-claim-pmicp"),
  band("PMIRMP", "clinic-fitout-contingency-pmirmp"),
  // sims-pm-2 (docs/sims.md 22.31, second part): new cases for the courses
  // that still had none, their bands, then depth (launch courses first).
  entry("PGMP", "pgmp-transit-program-steering-review"),
  entry("PFMP", "pfmp-water-utility-rebalance"),
  band("PMIPMOCP", "water-utility-rebalance-pmipmocp"),
  entry("CSPP", "cspp-school-laptop-p5-review"),
  entry("PMIRMP", "pmirmp-warehouse-risk-register"),
  band("PMP", "warehouse-risk-register-pmp"),
  band("CAPM", "warehouse-risk-register-capm"),
  entry("CAPA", "argo-nightly-dag-region-failure"),
  entry("PMIPBA", "pmipba-claims-portal-baseline-signoff"),
  entry("PMP", "pmp-contact-center-move-procurement"),
  band("PROJECTPLUS", "contact-center-move-procurement-projectplus"),
  band("PMICP", "contact-center-move-contracts-pmicp"),
  band("PROJECTPLUS", "warehouse-risk-register-projectplus"),
  entry("PMP", "pmp-permit-portal-hybrid-plan"),
  // ---- end REQ-321 ----
  // ---- REQ-320 (cloud sims, round of 2026-11-17): breadth first for the
  // Azure, AWS, Google Cloud and CNCF courses that had no sim, then depth.
  // Bands register a case another course already teaches on this course's
  // objective (docs/sims.md 22.30; lib/sim/it-cloud.ts). Keep these entries
  // together. ----
  band("AZ104", "containerapp-keyvault-revision-az104"),
  band("AZ900", "backup-vault-sabotage-az900"),
  band("AZ305", "containerapp-keyvault-revision-az305"),
  band("CKAD", "crashloop-bad-configmap-ckad"),
  band("AZ400", "kql-checkout-latency-az400"),
  band("DP900", "stock-on-hand-summed-dp900"),
  band("AWSAIF", "agent-indirect-prompt-injection-aif"),
  band("AWSANS", "alb-health-check-login-redirect-ans"),
  band("AWSDOP", "canary-rollback-dlq-dop"),
  band("AWSSCS", "leaked-access-key-scs"),
  band("GCPDEV", "cloud-run-bad-revision-rollback-pcd"),
  band("GCPDEVOPS", "cloud-run-bad-revision-rollback-devops"),
  band("GCPPCA", "bigquery-dashboard-bill-pca"),
  band("GCPSEC", "public-bucket-customer-exports-sec"),
  band("KCSA", "etcd-restore-deleted-namespace-kcsa"),
  band("AZ104", "backup-vault-sabotage-az104"),
  band("AZ104", "kql-checkout-latency-az104"),
  band("AZ900", "kql-checkout-latency-az900"),
  band("AZ305", "kql-checkout-latency-az305"),
  band("AZ305", "backup-vault-sabotage-az305"),
  band("AZ400", "containerapp-keyvault-revision-az400"),
  band("CKAD", "service-selector-no-endpoints-ckad"),
  band("AWSANS", "waf-login-flood-sqli-ans"),
  band("AWSANS", "nat-gateway-bill-spike-ans"),
  band("AWSSCS", "waf-login-flood-sqli-scs"),
  band("AWSSCS", "phi-in-application-logs-scs"),
  band("AWSSCS", "guardduty-role-credentials-macie-scs"),
  band("AWSDOP", "ec2-status-check-recovery-dop"),
  band("AWSDOP", "alb-health-check-login-redirect-dop"),
  band("AWSDOP", "stack-update-rollback-failed-dop"),
  band("AWSAIF", "rag-assistant-data-leak-aif"),
  band("AWSAIF", "loan-data-bias-aif"),
  band("GCPDEV", "public-bucket-customer-exports-pcd"),
  band("GCPPCA", "public-bucket-customer-exports-pca"),
  band("GCPDEVOPS", "bigquery-dashboard-bill-devops"),
  band("GCPPDE", "bigquery-dashboard-bill-pde"),
  entry("CKS", "falco-shell-in-catalog-pod"),
  entry("DP300", "sleeping-session-blocks-orders"),
  entry("AZ700", "stale-udr-to-retired-nva"),
  entry("PCA", "canary-gate-wrong-p99-query"),
  band("CGOA", "service-selector-no-endpoints-cgoa"),
  band("CNPA", "service-selector-no-endpoints-cnpa"),
  band("CNPE", "service-selector-no-endpoints-cnpe"),
  entry("ICA", "retry-storm-one-bad-ratings-pod"),
  entry("OTCA", "split-traces-b3-propagator"),
  band("GCPGAIL", "agent-indirect-prompt-injection-gail"),
  band("AI901", "rag-assistant-data-leak-ai901"),
  band("GCPGAIL", "rag-assistant-data-leak-gail"),
  entry("AWSDEA", "kinesis-poison-record-blocks-shard"),
  entry("GCPNET", "gke-pod-range-exhausted-before-promo"),
  entry("GCPDBE", "cloud-run-exhausts-sql-connections"),
  entry("GCPMLE", "nightly-retrain-cuda-oom-after-batch-change"),
  entry("AZ120", "nva-route-between-sap-app-and-db"),
  entry("AZ140", "fslogix-share-missing-share-permission"),
  entry("KCA", "policy-enforced-without-reading-reports"),
  entry("CCA", "cluster-pool-exhausted-new-nodes"),
  entry("CBA", "plugin-token-marked-frontend"),
  entry("AI901", "chat-client-model-name-not-deployment"),
  entry("GCPPDE", "streaming-window-drops-late-rides"),
  band("AZ700", "nva-route-between-sap-app-and-db-az700"),
  band("GCPPCA", "gke-pod-range-exhausted-before-promo-pca"),
  band("GCPDEV", "cloud-run-exhausts-sql-connections-pcd"),
  band("CNPA", "policy-enforced-without-reading-reports-cnpa"),
  band("AZ104", "fslogix-share-missing-share-permission-az104"),
  band("AZ104", "stale-udr-to-retired-nva-az104"),
  band("KCSA", "policy-enforced-without-reading-reports-kcsa"),
  band("CNPE", "policy-enforced-without-reading-reports-cnpe"),
  band("AWSDOP", "kinesis-poison-record-blocks-shard-dop"),
  // ---- end REQ-320 ----
  // ---- REQ-323 (docs/sims.md 22.32): health breadth and nursing depth of the
  // 2026-11-17 round. Bands first, then new cases. Keep these together. ----
  band("ABPTSGCS", "stroke-balance-fall-risk-geri"),
  band("ABPTSNCS", "dizziness-central-red-flags-neuro"),
  band("ABPTSNCS", "parkinson-freezing-session-neuro"),
  band("ABPTSCCS", "icu-early-mobility-cardiopulm"),
  band("ABPTSOCS", "tka-gait-dvt-red-flag-ortho"),
  band("NPTEPTA", "icu-early-mobility-pta"),
  band("NSCACSCS", "cscs-squat-knees-cave"),
  band("CMSRN", "post-op-transfusion-reaction-cmsrn"),
  band("CMSRN", "pca-oversedation-naloxone-cmsrn"),
  band("CMSRN", "med-surg-deterioration-sbar-cmsrn"),
  band("PCCN", "postop-hemorrhage-early-signs-pccn"),
  band("PCCN", "sepsis-to-septic-shock-pccn"),
  band("PCCN", "status-epilepticus-after-craniotomy-pccn"),
  band("NCLEXRN", "femoral-access-retroperitoneal-bleed-nclexrn"),
  band("FNPANCC", "clinic-severe-bp-stroke-signs-fnp-role"),
  band("FNPAANP", "clinic-sulfonylurea-hypoglycemia-fnp-clinical"),
  entry("ABPTSPWCS", "prenatal-exercise-severe-bp-headache"),
  entry("ABPTSSCS", "preseason-collapse-heat-stroke"),
  entry("ABPTSWMS", "leg-ulcer-calcified-abi-compression"),
  entry("ABPTSPCS", "knee-pain-limp-hip-slip"),
  entry("ABPTSOCS", "acute-back-pain-mri-request-cauda-equina"),
  entry("ABPTSONC", "post-mastectomy-strength-start-back-pain"),
  entry("ABPTSECS", "carpal-tunnel-referral-demyelinating-gbs"),
  // REQ-323, round 2 (docs/sims.md 22.32): the PTA musculoskeletal case, the
  // emergency department cases, nursing depth and the launch courses.
  entry("NPTEPTA", "pta-back-pain-new-bladder-symptoms"),
  entry("CEN", "triage-indigestion-inferior-stemi"),
  entry("CEN", "asthma-attack-quiet-chest"),
  entry("CEN", "diving-injury-low-pressure-slow-pulse"),
  entry("CEN", "bee-sting-anaphylaxis-triage"),
  entry("CEN", "black-stools-then-hematemesis"),
  entry("CEN", "tearing-pain-heparin-ordered"),
  entry("CEN", "hallway-head-injury-falling-gcs"),
  band("NCLEXRN", "hallway-head-injury-falling-gcs-nclexrn"),
  entry("PCCN", "pacing-wires-pulled-then-restless"),
  entry("PCCN", "capnography-alarm-saturation-fine"),
  entry("CMSRN", "delirium-night-prn-restraint-order"),
  band("NCLEXRN", "delirium-night-prn-restraint-order-nclexrn"),
  entry("FNPAANP", "two-falls-not-herself"),
  band("FNPANCC", "two-falls-not-herself-fnp-role"),
  entry("CCRNADULT", "falling-platelets-cold-foot-on-heparin"),
  entry("NCLEXPN", "ltc-critical-potassium-call"),
  // ---- end REQ-323 ----
  // ---- REQ-325 (docs/sims.md 22.33): nursing depth, round 3 ----
  entry("CCRNADULT", "low-urine-after-contrast-on-vancomycin"),
  entry("CCRNADULT", "oozing-lines-in-septic-shock"),
  entry("CCRNADULT", "pressor-climbing-home-prednisone-missed"),
  entry("CCRNADULT", "pale-urine-after-pituitary-surgery"),
  entry("CCRNADULT", "fever-ten-days-after-chemo"),
  entry("CCRNADULT", "cirrhosis-hematemesis-at-night"),
  entry("CCRNADULT", "pressor-arm-cold-and-pale"),
  entry("CCRNADULT", "tight-belly-after-massive-resuscitation"),
  entry("NCLEXPN", "aide-feeding-thin-liquids-dysphagia"),
  entry("NCLEXRN", "preop-consent-after-opioid"),
  entry("CCRNADULT", "pounding-headache-c6-injury"),
  entry("CCRNADULT", "tibial-fracture-pain-out-of-proportion"),
  entry("CCRNADULT", "day-six-after-coiling-new-weakness"),
  entry("CCRNADULT", "fever-stiff-neck-waiting-for-lp"),
  entry("NCLEXRN", "digoxin-due-yellow-halos"),
  entry("NCLEXRN", "insulin-given-to-wrong-bed"),
  entry("NCLEXRN", "heparin-aptt-high-pink-urine"),
  entry("CCRNADULT", "toothache-tablets-level-above-line"),
  entry("CCRNADULT", "found-on-floor-tea-colored-urine"),
  entry("NCLEXPN", "warfarin-inr-high-tarry-stool"),
  entry("NCLEXRN", "postop-fever-150-graves-meds-stopped"),
  entry("NCLEXRN", "day-two-chemo-potassium-climbing"),
  entry("NCLEXRN", "pacu-snoring-then-vomiting"),
  entry("NCLEXPN", "clinic-belly-pain-moved-right"),
  // ---- end REQ-325 ----
  // ---- REQ-326 (docs/sims.md 22.34): specialty nursing and PTA depth, sims-health-4 ----
  entry("CEN", "dizzy-slow-pulse-atropine-not-working"),
  entry("CEN", "cold-leg-new-numbness"),
  entry("CEN", "bike-crash-breath-sounds-gone"),
  entry("CEN", "copd-drowsy-on-high-flow"),
  entry("CEN", "house-fire-hoarse-voice"),
  entry("CEN", "missed-dialysis-weak-legs"),
  entry("CEN", "chemo-day-ten-fever"),
  entry("PCCN", "af-rate-control-pressure-sliding"),
  entry("PCCN", "telemetry-st-rising-inferior-leads"),
  entry("PCCN", "pressure-crisis-headache-titration"),
  entry("PCCN", "groin-swelling-after-cath"),
  entry("PCCN", "day-two-mi-cold-and-wet"),
  entry("PCCN", "chest-tube-on-the-floor"),
  entry("PCCN", "found-down-dark-urine"),
  entry("CMSRN", "bedside-debridement-sedation-quiet-capnograph"),
  entry("CMSRN", "found-on-floor-on-anticoagulant"),
  entry("CMSRN", "stroke-day-one-coffee-and-pills"),
  entry("FNPANCC", "clinic-swollen-lip-years-on-lisinopril"),
  band("FNPAANP", "clinic-swollen-lip-years-on-lisinopril-fnp-clinical"),
  entry("FNPAANP", "clinic-calf-ache-after-flight-now-breathless"),
  band("FNPANCC", "clinic-calf-ache-after-flight-now-breathless-fnp-role"),
  entry("FNPAANP", "clinic-three-falls-five-new-pills"),
  band("FNPANCC", "clinic-three-falls-five-new-pills-fnp-role"),
  entry("NPTEPTA", "pta-knee-replacement-calf-swollen"),
  entry("NPTEPTA", "pta-gaze-exercises-new-double-vision"),
  entry("NPTEPTA", "pta-treadmill-pressure-falls-with-grade"),
  entry("NPTEPTA", "pta-six-minute-walk-saturation-drops"),
  entry("NPTEPTA", "pta-glucose-before-exercise-low"),
  // ---- end REQ-326 ----
  // ---- REQ-329 (docs/sims.md 22.36): sensitive objectives held back until the
  // per-sim 18+ gate (REQ-327). Session screen, clinical-session profile; every
  // one is marked `mature: true`. Keep these entries together. ----
  entry("CEN", "ed-screen-positive-wants-to-go-home"),
  entry("CEN", "ed-threat-against-former-supervisor"),
  entry("PCCN", "new-heart-failure-better-off-without-me"),
  entry("FNPAANP", "clinic-depression-follow-up-item-nine"),
  band("FNPANCC", "clinic-depression-follow-up-item-nine-fnp-role"),
  entry("FNPANCC", "clinic-widower-thoughts-right-now"),
  band("FNPAANP", "clinic-widower-thoughts-right-now-fnp-clinical"),
  entry("CCRNADULT", "sah-day-six-not-herself-on-levetiracetam"),
  entry("CCRNADULT", "icu-threatens-staff-pulls-cannula"),
  entry("NCLEXRN", "after-amputation-im-done"),
  entry("NCLEXRN", "visiting-hours-threat-on-the-unit"),
  entry("NCLEXRN", "crash-survivor-wishes-she-had-died-too"),
  entry("NCLEXPN", "rehab-resident-no-use-to-anyone"),
  entry("NCLEXPN", "day-room-threat-then-emergency-medicine"),
  entry("NCLEXPN", "clinic-eviction-no-way-out"),
  entry("NCLEXRN", "voices-say-he-should-die"),
  // ---- end REQ-329 ----
  // ---- REQ-334 (docs/sims.md 22.38): health depth, round of 2026-11-17
  // evening. Nursing licensure, CCRN neonatal and pediatric, and the physical
  // therapy specialty courses. Keep these entries together. ----
  band("ADNRN", "postop-fever-150-graves-meds-stopped-adn"),
  band("ADNRN", "oxytocin-tachysystole-late-decels-adn"),
  band("ADNRN", "postpartum-hemorrhage-atony-adn"),
  band("ADNRN", "alcohol-withdrawal-ciwa-adn"),
  band("ADNRN", "after-amputation-im-done-adn"),
  band("LPNVN", "warfarin-inr-high-tarry-stool-lpn"),
  band("LPNVN", "head-strike-on-apixaban-lpn"),
  band("LPNVN", "clinic-belly-pain-moved-right-lpn"),
  band("LPNVN", "aide-feeding-thin-liquids-dysphagia-lpn"),
  band("LPNVN", "postpartum-check-boggy-fundus-lpn"),
  band("LPNVN", "rehab-resident-no-use-to-anyone-lpn"),
  band("BSNRN", "med-surg-deterioration-sbar-bsn"),
  band("BSNRN", "insulin-given-to-wrong-bed-bsn"),
  band("BSNRN", "preop-consent-after-opioid-bsn"),
  entry("CCRNNEO", "green-vomit-day-three"),
  entry("CCRNNEO", "yellow-at-twenty-hours"),
  entry("CCRNNEO", "floppy-after-cord-prolapse"),
  entry("CCRNNEO", "cpap-baby-sudden-desaturation"),
  entry("CCRNNEO", "sweaty-feeds-liver-edge-down"),
  entry("CCRNNEO", "lip-smacking-and-a-pause"),
  entry("CCRNPEDS", "sickle-cell-belly-big-and-pale"),
  entry("CCRNPEDS", "red-cells-then-crackles"),
  entry("CCRNPEDS", "wheeze-gone-quiet-and-sleepy"),
  entry("CCRNPEDS", "bike-crash-icp-climbing"),
  entry("CCRNPEDS", "shunt-baby-vomiting-sats-falling"),
  entry("CCRNPEDS", "toddler-woke-after-naloxone-now-sleepy"),
  entry("ADNRN", "two-weeks-thirsty-glucose-890"),
  // ---- end REQ-334 ----
];

// REQ-312: the data and code console documents (docs/sims.md 22.25), by
// slug so a later sim in the same course cannot change this set (FAIL-2002).
export const DATA_CONSOLE_SLUGS: readonly string[] = [
  "py-report-too-slow-profile",
  "pl300-rls-region-manager",
  "pl300-stock-on-hand-summed",
  "cssgb-fill-weight-chart",
  "js-rate-board-zero-percent",
  "js-rate-board-zero-percent-tsnode",
  "py-import-crash-traceback",
  "py-import-crash-traceback-pcap",
  "py-import-crash-traceback-pcep",
  "sql-not-in-null-empty-list",
  "cssgb-capability-tool-wear",
  "js-checkout-shipping-concatenated",
];

// REQ-225: the EPPP client-session documents and the objective titles they
// are registered to (each must be an active objective of course EPPP).
export const EPPP_SESSION_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => e.course === "EPPP");
export const EPPP_OBJECTIVES = [
  "Assess suicide risk and plan safety in a clinical interview",
  "Apply duty-to-warn and duty-to-protect obligations",
  "Conduct a diagnostic intake using DSM-5-TR criteria",
] as const;

// REQ-232: the DPT treatment-session documents (the PT renderer) and the
// objective titles they are registered to (active objectives of course DPT).
// REQ-296: later DPT sims (docs/sims-coverage-clinical.md) are not part of
// this first set, so the set is named by slug.
const NBCC_FIRST_SET = ["nce-boundary-dual-relationship", "nce-substance-use-screen", "ncmhce-intake-ptsd-alcohol", "ncmhce-suicide-safety-plan", "ncmhce-trauma-treatment-plan"];
const DPT_FIRST_SET = ["icu-early-mobility", "tka-gait-dvt-red-flag", "stroke-balance-fall-risk"];
export const DPT_TREATMENT_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => e.course === "DPT" && DPT_FIRST_SET.includes(e.slug));
export const DPT_OBJECTIVES = [
  "Selecting and performing interventions for cardiovascular and pulmonary conditions to achieve patient goals",
  "Total knee arthroplasty rehabilitation per the 2026 APTA guideline: range-of-motion work instead of continuous passive motion, progressive strengthening, motor function training, and early daily quadriceps NMES",
  "Selecting and performing interventions for neurological and musculoskeletal conditions",
] as const;

// REQ-239: the NCE and NCMHCE client-session documents and the objective
// titles they are registered to (active objectives of their course; the
// titles are exported by seed/tracks/nbcc.ts too, and the tests compare).
// FAIL-2240: selected by slug (the REQ-239 set), not by course, so a later
// NCE or NCMHCE sim or band (REQ-315) cannot break the REQ-239 tests
// (FAIL-2002); NBCC_FIRST_SET is declared with the DPT set above.
export const NBCC_SESSION_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => (e.course === "NCE" || e.course === "NCMHCE") && NBCC_FIRST_SET.includes(e.slug));
export const NBCC_OBJECTIVES: Readonly<Record<string, string>> = {
  "nce-boundary-dual-relationship": "Manage boundaries and multiple relationships under the ACA Code of Ethics",
  "nce-substance-use-screen": "Screen for substance use and match the client to a level of care",
  "ncmhce-intake-ptsd-alcohol": "Conduct an intake and reach a DSM-5-TR diagnosis in a counseling case",
  "ncmhce-suicide-safety-plan": "Assess suicide risk and build a safety plan in a counseling session",
  "ncmhce-trauma-treatment-plan": "Build a trauma-informed treatment plan with the client",
};

export interface Compiled {
  doc: ScenarioDoc | null; // null when the source, the band or a module failed
  problems: Problem[];
  band: BandFile | null;
  base: ScenarioDoc | null; // a band's compiled base
}

function readJson(path: string, label: string, problems: Problem[]): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  } catch (e) {
    problems.push({ level: "error", path: label, message: `cannot read: ${(e as Error).message}` });
    return null;
  }
}

function compileSource(source: Record<string, unknown>, problems: Problem[]): ScenarioDoc | null {
  const s = spliceModules(source);
  problems.push(...s.problems);
  return s.doc as ScenarioDoc | null;
}

// Source -> band patch (on the base source) -> module splice -> document.
// Validation is the caller's (lint.ts), so a band is validated as its own
// document after the merge, as Nick decided (19.4 item 1).
export function compileEntry(e: DocumentEntry): Compiled {
  const problems: Problem[] = [];
  const raw = readJson(e.file, e.kind === "band" ? "band" : "document", problems);
  if (!raw) return { doc: null, problems, band: null, base: null };
  if (e.kind === "scenario") return { doc: compileSource(raw, problems), problems, band: null, base: null };
  const b = raw as unknown as BandFile;
  if (!b.base || typeof b.base.course !== "string" || typeof b.base.slug !== "string") {
    problems.push({ level: "error", path: "band.base", message: "a band names its base as { course, slug }" });
    return { doc: null, problems, band: b, base: null };
  }
  if (b.slug !== e.slug) problems.push({ level: "error", path: "band.slug", message: `band slug ${b.slug} does not match its file name ${e.slug}` });
  const baseEntry = entry(b.base.course, b.base.slug);
  const baseRaw = readJson(baseEntry.file, "band.base", problems);
  if (!baseRaw) return { doc: null, problems, band: b, base: null };
  const baseProblems: Problem[] = [];
  const base = compileSource(baseRaw, baseProblems);
  if (!base) problems.push({ level: "error", path: "band.base", message: `the base ${b.base.course}/${b.base.slug} does not compile` });
  const r = applyBand(baseRaw, b);
  problems.push(...r.problems);
  if (!r.source) return { doc: null, problems, band: b, base };
  const doc = compileSource(r.source, problems);
  if (doc && base) problems.push(...thresholdProblems(base, doc, b));
  return { doc, problems, band: b, base };
}

// The compiled document, or an error naming what failed. For tests and scripts.
export function loadDocument(e: DocumentEntry): ScenarioDoc {
  const c = compileEntry(e);
  const errors = c.problems.filter((p) => p.level === "error");
  if (!c.doc || errors.length) throw new Error(`${e.course}/${e.slug} does not compile: ${errors.map((p) => `${p.path}: ${p.message}`).join("; ")}`);
  return c.doc;
}

export { entry as documentEntry, band as bandEntry };

// REQ-282: the NASM-CNC coaching-session documents and the objective titles
// they are registered to (active objectives of course NASMCNC; the course
// seed exports the same titles as NASMCNC_SIM_OBJECTIVES).
// REQ-314 (docs/sims.md 22.27): the documents on the three new screens, by
// slug (bands included), for lib/sim/screens-misc.test.ts.
export const REQ314_SLUGS: { trainer: readonly string[]; facility: readonly string[]; sandbox: readonly string[] } = {
  trainer: [
    "cpt-parq-chest-tightness",
    "ace-parq-chest-tightness",
    "acsm-parq-chest-tightness",
    "nscacpt-parq-chest-tightness",
    "nccpt-parq-chest-tightness",
    "cpt-squat-knees-cave",
    "ace-squat-knees-cave",
    "acsm-squat-knees-cave",
    "nscacpt-squat-knees-cave",
    "nccpt-squat-knees-cave",
    "cnc-ambivalent-food-record",
  ],
  facility: ["cissp-datahall-tailgate-cooling", "datahall-tailgate-cooling-secplus"],
  sandbox: ["ceh-sandbox-invoice-loader", "sandbox-invoice-loader-cysa"],
};
export const REQ314_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => [...REQ314_SLUGS.trainer, ...REQ314_SLUGS.facility, ...REQ314_SLUGS.sandbox].includes(e.slug));

export const CNC_SESSION_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => e.course === "NASMCNC" && e.slug.startsWith("cnc-") && !REQ314_SLUGS.trainer.includes(e.slug));
export const CNC_OBJECTIVES: Readonly<Record<string, string>> = {
  "cnc-crash-diet-request":
    "Recognizing when to refer to a registered dietitian nutritionist or physician: a diagnosed condition, a suspected eating disorder, pregnancy or breastfeeding needs beyond general guidance, or medications affected by diet",
  "cnc-greens-powder-warfarin": "Evaluating a supplement: how it is regulated, third-party testing, and when it is a question for a clinician",
};
// REQ-288: the ASWB client-session documents and the objective titles they are
// registered to (active objectives of their course; seed/tracks/aswb.ts exports
// the same titles as ASWB_CLINICAL_SIM_OBJECTIVES and ASWB_MASTERS_SIM_OBJECTIVES).
export const ASWB_SESSION_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => e.course === "ASWBCLINICAL" || e.course === "ASWBMASTERS");
export const ASWB_OBJECTIVES: Readonly<Record<string, string>> = {
  "aswbc-suicide-violence-risk": "Assess suicide and violence risk in a clinical social work session",
  "aswbc-threat-identifiable-person": "Respond to a client's threat against an identifiable person under the NASW Code and state law",
  "aswbc-termination-nonpayment": "End services ethically: planned termination, transfer, nonpayment and avoiding abandonment",
  "aswbm-involuntary-engagement": "Engage an involuntary client and contract for goals",
  "aswbm-child-abuse-report": "Make a mandated child abuse report and keep the family engaged",
  "aswbm-boundaries-small-town": "Manage boundaries, dual relationships, conflicts of interest and self-disclosure, including power differences and online contact",
  "aswbc-boundaries-small-town": "Manage boundaries, dual relationships, conflicts of interest and self-disclosure, including power differences and online contact",
  "aswbm-termination-nonpayment": "End services ethically: planned termination, transfer, nonpayment and avoiding abandonment",
  "aswbm-suicide-violence-risk": "Assess risk of harm to self and others and act on what you find",
};

// REQ-311: the Scrum Sprint documents on the project dashboard (Sprint mode)
// and the objective titles they are registered to (active objectives of PSMI
// and CSM; a CSM document is a band of the PSMI one).
export const SCRUM_DASHBOARD_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => e.course === "PSMI" || e.course === "CSM");
export const SCRUM_OBJECTIVES: Readonly<Record<string, string>> = {
  "sprint-status-meeting-daily-scrum": "Running a Daily Scrum as the Developers' planning event rather than a status report",
  "sprint-goal-becomes-obsolete": "Deciding what happens when a Sprint Goal becomes obsolete, and who may cancel a Sprint",
  "csm-sprint-goal-becomes-obsolete": "Deciding what happens when a Sprint Goal becomes obsolete, and who may cancel a Sprint",
  "sprint-release-before-review": "Creating more than one Increment in a Sprint and releasing before the Sprint Review",
  "csm-sprint-release-before-review": "Creating more than one Increment in a Sprint and releasing before the Sprint Review",
  "csm-sprint-status-meeting-daily-scrum": "Running a Daily Scrum as the Developers' planning event rather than a status report",
};

// REQ-311: the ITIL service-desk documents and the ITIL Foundation (Version 5)
// objective titles they are registered to, as the itil5 builder gave them
// (REQ-308; Version 5 has no practices-in-detail unit, so the desk serves the
// problem, error and known error outcome and the value chain and service
// level terms).
export const DESK_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => e.course === "ITIL5FND");
export const ITIL5_DESK_OBJECTIVES: Readonly<Record<string, readonly string[]>> = {
  "monday-service-desk-wifi-problem": [
    "Distinguishing a problem, an error and a known error in an operational scenario",
    "Explaining the value chain's terms: product specifications and prototypes, events and incidents, releases and tests, service requests, disasters and operating models",
    "Explaining the service journey, service quality, service levels and what a service level agreement records",
  ],
};

// REQ-289: the Washington psychology jurisprudence session (a band of the EPPP
// duty-to-protect case) and its objective.
export const WAJP_SESSION_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => e.course === "WAPSYCHJP");
export const WAJP_OBJECTIVES: Readonly<Record<string, string>> = {
  "wajp-duty-to-protect-threat": "Apply the duty to warn or protect when a client threatens an identifiable person",
};

// REQ-313 (docs/sims.md 22.26): the governance board, tabletop and
// professional-ethics documents (authored and bands), by profile.
export const GOVERNANCE_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) =>
  [
    "cism-security-business-case-budget",
    "cism-risk-appetite-exception",
    "cism-ransomware-tabletop",
    "cc-ethics-shared-credentials",
    "cissp-ethics-audit-finding-pressure",
    "cissp-flood-continuity-tabletop",
    "cc-ransomware-tabletop",
    "ransomware-tabletop-secplus",
    "ransomware-tabletop-v8",
    "risk-exception-appetite-secplus",
    "risk-exception-appetite-v8",
    "cc-flood-continuity-tabletop",
    "flood-continuity-tabletop-secplus",
    "flood-continuity-tabletop-v8",
  ].includes(e.slug),
);
