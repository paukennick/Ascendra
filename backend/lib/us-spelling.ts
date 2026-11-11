// REQ-220 (FAIL-1138): learner-facing text uses US English spelling (Nick,
// 2026-11-10). One word list serves three uses:
//   - lib/us-spelling.test.ts fails when a British spelling appears in the
//     string content of seed, app or server source (comments are not read);
//   - supabase/seed/seed-lib.ts treats an objective retitled only from
//     British to US spelling as the same objective, so the spelling change
//     does not delete its stored lessons;
//   - toUsSpelling() converts text.
// Matching is by whole word, case-insensitive; a phrase in US_SPELLING_ALLOW
// (a proper name in its owner's spelling, e.g. the UK's "National Cyber
// Security Centre") is left alone.

// British -> US, whole words. Words that are also correct US English in
// some sense ("dialogue", "towards", "amongst") are not listed.
export const BRITISH_TO_US: Readonly<Record<string, string>> = {
  // -our
  behaviour: "behavior", behaviours: "behaviors", behavioural: "behavioral", behaviourally: "behaviorally",
  colour: "color", colours: "colors", coloured: "colored", colouring: "coloring", multicoloured: "multicolored", discoloured: "discolored", discolouration: "discoloration",
  favour: "favor", favours: "favors", favoured: "favored", favouring: "favoring", favourable: "favorable", unfavourable: "unfavorable",
  favourite: "favorite", favourites: "favorites",
  labour: "labor", laboured: "labored", labouring: "laboring",
  honour: "honor", honours: "honors", honoured: "honored", honouring: "honoring",
  neighbour: "neighbor", neighbours: "neighbors", neighbouring: "neighboring",
  odour: "odor", odours: "odors", malodour: "malodor",
  tumour: "tumor", tumours: "tumors", rumour: "rumor", rumours: "rumors", flavour: "flavor", flavours: "flavors",
  rigour: "rigor", vigour: "vigor", humour: "humor", vapour: "vapor", vapours: "vapors", harbour: "harbor", armour: "armor",
  endeavour: "endeavor", endeavours: "endeavors",
  // -re
  centre: "center", centres: "centers", centred: "centered", datacentre: "datacenter", datacentres: "datacenters",
  fibre: "fiber", fibres: "fibers", litre: "liter", litres: "liters", millilitre: "milliliter", millilitres: "milliliters",
  microlitre: "microliter", microlitres: "microliters", decilitre: "deciliter", metre: "meter", metres: "meters",
  centimetre: "centimeter", centimetres: "centimeters", millimetre: "millimeter", millimetres: "millimeters",
  kilometre: "kilometer", kilometres: "kilometers", theatre: "theater", theatres: "theaters", lustre: "luster",
  calibre: "caliber", spectre: "specter", meagre: "meager", sombre: "somber",
  manoeuvre: "maneuver", manoeuvres: "maneuvers", manoeuvring: "maneuvering",
  // -ence / -ogue / -amme / misc
  defence: "defense", defences: "defenses", offence: "offense", offences: "offenses", pretence: "pretense",
  licence: "license", licences: "licenses", licenced: "licensed",
  catalogue: "catalog", catalogues: "catalogs", catalogued: "cataloged", analogue: "analog",
  programme: "program", programmes: "programs",
  judgement: "judgment", judgements: "judgments", acknowledgement: "acknowledgment", acknowledgements: "acknowledgments",
  ageing: "aging", enrolment: "enrollment", enrolments: "enrollments", fulfil: "fulfill", fulfils: "fulfills",
  skilful: "skillful", wilful: "willful", instalment: "installment", instalments: "installments",
  grey: "gray", greys: "grays", mould: "mold", moulds: "molds", storey: "story", storeys: "stories",
  sceptic: "skeptic", sceptical: "skeptical", scepticism: "skepticism", artefact: "artifact", artefacts: "artifacts",
  aluminium: "aluminum", sulphur: "sulfur", sulphate: "sulfate", tyre: "tire", tyres: "tires", whilst: "while",
  learnt: "learned", jewellery: "jewelry", plough: "plow", cheque: "check", cheques: "checks",
  practise: "practice", practises: "practices", practised: "practiced", practising: "practicing",
  // -ll- / -l-
  labelled: "labeled", labelling: "labeling", unlabelled: "unlabeled", relabelled: "relabeled", relabelling: "relabeling",
  cancelled: "canceled", cancelling: "canceling", modelling: "modeling", modelled: "modeled", remodelling: "remodeling",
  signalling: "signaling", resignalling: "resignaling", levelling: "leveling", levelled: "leveled",
  travelling: "traveling", travelled: "traveled", traveller: "traveler", travellers: "travelers",
  fuelling: "fueling", fuelled: "fueled", totalling: "totaling", totalled: "totaled", tunnelling: "tunneling",
  counselling: "counseling", counsellor: "counselor", counsellors: "counselors", councillor: "councilor", councillors: "councilors",
  channelled: "channeled", marshalling: "marshaling",
  // ae / oe (medical)
  oedema: "edema", oedematous: "edematous", dyspnoea: "dyspnea", orthopnoea: "orthopnea", tachypnoea: "tachypnea",
  apnoea: "apnea", apnoeic: "apneic", diarrhoea: "diarrhea", diarrhoeal: "diarrheal",
  orthopaedic: "orthopedic", orthopaedics: "orthopedics", paediatric: "pediatric", paediatrics: "pediatrics",
  paediatrician: "pediatrician", ischaemia: "ischemia", ischaemic: "ischemic",
  hypoglycaemia: "hypoglycemia", hyperglycaemia: "hyperglycemia", hypoxaemia: "hypoxemia", hyperkalaemia: "hyperkalemia",
  hypokalaemia: "hypokalemia", hyponatraemia: "hyponatremia", hypernatraemia: "hypernatremia", hypovolaemia: "hypovolemia",
  hypovolaemic: "hypovolemic", anaemia: "anemia", anaemic: "anemic", septicaemia: "septicemia", leukaemia: "leukemia",
  haemoglobin: "hemoglobin", haemorrhage: "hemorrhage", haemorrhages: "hemorrhages", haemorrhagic: "hemorrhagic",
  haematoma: "hematoma", haematomas: "hematomas", haemarthrosis: "hemarthrosis", haematuria: "hematuria",
  haematologic: "hematologic", haematological: "hematological", haemodynamic: "hemodynamic", haemodynamics: "hemodynamics",
  haemodynamically: "hemodynamically", haemolysis: "hemolysis", haemolyse: "hemolyze", haemoptysis: "hemoptysis",
  haemostasis: "hemostasis", haemothorax: "hemothorax", haemodialysis: "hemodialysis",
  anaesthesia: "anesthesia", anaesthetic: "anesthetic", anaesthetics: "anesthetics", anaesthetist: "anesthetist",
  postanaesthesia: "postanesthesia", paraesthesia: "paresthesia", paraesthesias: "paresthesias",
  gynaecology: "gynecology", gynaecologist: "gynecologist", caesarean: "cesarean", melaena: "melena",
  oesophagus: "esophagus", oesophageal: "esophageal", oestrogen: "estrogen", foetus: "fetus", foetal: "fetal",
  faeces: "feces", faecal: "fecal", coeliac: "celiac", aetiology: "etiology",
  // -yse
  analyse: "analyze", analysed: "analyzed", analysing: "analyzing", // "analyses" is also the US plural noun: not listed
  paralyse: "paralyze",
  paralysed: "paralyzed", catalyse: "catalyze", dialyse: "dialyze", hydrolyse: "hydrolyze",
};

// -ise / -isation words: every inflection of these stems maps to -ize.
// Listed by stem so the inflections stay in step (organise, organised,
// organises, organising, organisation(s), organisational, organiser(s)).
const ISE_STEMS = [
  "organ", "disorgan", "reorgan", "recogn", "unrecogn", "priorit", "util", "optim", "author", "unauthor", "stabil",
  "minim", "maxim", "nebul", "random", "mobil", "immobil", "summar", "synchron", "resynchron", "regular", "standard",
  "token", "hospital", "container", "general", "individual", "central", "decentral", "initial", "local", "categor",
  "final", "immun", "normal", "virtual", "revascular", "vascular", "custom", "sanit", "parameter", "parametr", "winsor",
  "real", "unreal", "personal", "annual", "serial", "deserial", "pseudonym", "anonym", "memor", "equal", "catastroph",
  "peripheral", "stigmat", "acclimat", "modern", "traumat", "penal", "visual", "lemmat", "character", "external",
  "energ", "production", "material", "parallel", "institutional", "daemon", "emphas", "medical", "overmedical", "synthes",
  "vocal", "steril", "neutral", "moistur", "metabol", "editorial", "sensit", "depolar", "repolar", "polar", "tempor",
  "apolog", "critic", "special", "fertil", "harmon", "hypothes", "jeopard", "legal", "mesmer",
  "commercial", "capital", "familiar", "ideal", "industrial", "internal", "liberal", "monopol", "national", "rational",
  "revital", "scrutin", "symbol", "terror", "util",
];
const ISE_ENDINGS: Record<string, string> = {
  ise: "ize", ised: "ized", ises: "izes", ising: "izing", isation: "ization", isations: "izations",
  isational: "izational", iser: "izer", isers: "izers",
};

function buildMap(): Map<string, string> {
  const m = new Map<string, string>();
  for (const [k, v] of Object.entries(BRITISH_TO_US)) if (v) m.set(k, v);
  for (const stem of new Set(ISE_STEMS)) {
    for (const [b, a] of Object.entries(ISE_ENDINGS)) {
      m.set(stem + b, stem + a);
    }
  }
  // Only -ise/-isation forms are produced, so "specialist" or "capitalist"
  // are untouched.
  return m;
}
export const US_SPELLING_MAP: ReadonlyMap<string, string> = buildMap();

// Proper names and quoted titles kept in their owner's spelling. Matching is
// case-sensitive on the phrase.
export const US_SPELLING_ALLOW: readonly string[] = [
  "National Cyber Security Centre",
  "Australian Cyber Security Centre",
  "Canadian Centre for Cyber Security",
  "European Centre for Disease Prevention and Control",
  "Ministry of Defence",
  "Centre for Evidence-Based Medicine",
  "Grey Turner", // Grey Turner's sign, an eponym
];

const WORD = /[A-Za-z]+/g;

function matchCase(src: string, us: string): string {
  if (src === src.toUpperCase() && src.length > 1) return us.toUpperCase();
  if (src[0] === src[0].toUpperCase()) return us[0].toUpperCase() + us.slice(1);
  return us;
}

function allowedSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const p of US_SPELLING_ALLOW) {
    let i = text.indexOf(p);
    while (i >= 0) {
      spans.push([i, i + p.length]);
      i = text.indexOf(p, i + 1);
    }
  }
  // URLs, e-mail addresses and file paths keep their spelling.
  for (const m of text.matchAll(/(?:https?:\/\/|www\.)\S+|\S+@\S+\.\S+|\b[\w.-]+\/[\w./-]+/g)) spans.push([m.index!, m.index! + m[0].length]);
  return spans;
}

// Each British word found in `text` (outside allowed spans), with its US form.
export function britishWords(text: string): Array<{ word: string; us: string; index: number }> {
  const spans = allowedSpans(text);
  const out: Array<{ word: string; us: string; index: number }> = [];
  for (const m of text.matchAll(WORD)) {
    const us = US_SPELLING_MAP.get(m[0].toLowerCase());
    if (!us) continue;
    const i = m.index!;
    if (spans.some(([a, b]) => i >= a && i < b)) continue;
    out.push({ word: m[0], us: matchCase(m[0], us), index: i });
  }
  return out;
}

export function toUsSpelling(text: string): string {
  let out = "";
  let last = 0;
  for (const w of britishWords(text)) {
    out += text.slice(last, w.index) + w.us;
    last = w.index + w.word.length;
  }
  return out + text.slice(last);
}
