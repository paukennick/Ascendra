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
  // ---- REQ-288: ASWB client sessions, courses ASWBCLINICAL and ASWBMASTERS
  // (session renderer, clinical-session profile; ASWB_SESSION_DOCUMENTS
  // below). Keep these entries together. ----
  entry("ASWBCLINICAL", "aswbc-suicide-violence-risk"),
  entry("ASWBCLINICAL", "aswbc-threat-identifiable-person"),
  entry("ASWBMASTERS", "aswbm-involuntary-engagement"),
  entry("ASWBMASTERS", "aswbm-child-abuse-report"),
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
  // ---- end REQ-296 ----
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
export const NBCC_SESSION_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => e.course === "NCE" || e.course === "NCMHCE");
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
export const CNC_SESSION_DOCUMENTS: readonly DocumentEntry[] = ALL_DOCUMENTS.filter((e) => e.course === "NASMCNC");
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
  "aswbm-involuntary-engagement": "Engage an involuntary client and contract for goals",
  "aswbm-child-abuse-report": "Make a mandated child abuse report and keep the family engaged",
};
