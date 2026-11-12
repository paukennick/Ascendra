// REQ-198: PT School Prerequisites Refresher (PTPREREQ).
//
// For someone about to start a Doctor of Physical Therapy program whose
// undergraduate prerequisites are rusty. It is not an exam course, it does
// not replace a program's required coursework, and no program or exam body
// stands behind it. It refreshes the subjects DPT programs require.
//
// Scope: what DPT programs ask applicants to have taken. Both sources were
// read on 2026-11-09:
// - APTA, "Physical Therapist (PT) Admissions Process" (no page date;
//   footer "(c) 2026 American Physical Therapy Association"). Its "most
//   common prerequisites" list is A&P 1 and 2 with lab, Biology 1 and 2,
//   General Chemistry 1 and 2 with lab, General Physics 1 and 2 with lab,
//   Psychology and Statistics. It says requirements differ by program, that
//   most (not all) programs take part in PTCAS, and that applicants should
//   check the PTCAS directory or each school's own site.
//   https://www.apta.org/your-career/careers-in-physical-therapy/pt-admissions-process
// - ACAPT, "Admissions" resources page (footer (c) 2024). It lists the
//   common core prerequisites ACAPT members approved in 2012: two courses in
//   biological sciences (not botany), two in general chemistry with lab, two
//   in general physics with lab, one in psychology, one in statistics, and
//   anatomy and physiology (one anatomy and one physiology course with lab,
//   or a two-course A&P sequence with lab).
//   https://acapt.org/resources/admissions
//
// Depth: six OpenStax textbooks (Rice University). Their CMS listed each
// one's licence as CC BY-NC-SA on 2026-11-09. We use them for scope and
// facts only and copy no wording. Every section cited below was read in
// the online edition on 2026-11-09:
//   AP    Anatomy and Physiology 2e (2022-04-20)
//         https://openstax.org/details/books/anatomy-and-physiology-2e
//   CHEM  Chemistry 2e (2019-02-14)
//         https://openstax.org/details/books/chemistry-2e
//   PHYS  College Physics 2e (2022-07-13)
//         https://openstax.org/details/books/college-physics-2e
//   BIO   Biology 2e (2018-03-28)
//         https://openstax.org/details/books/biology-2e
//   PSY   Psychology 2e (2020-04-22)
//         https://openstax.org/details/books/psychology-2e
//   STAT  Introductory Statistics 2e (2023-12-13)
//         https://openstax.org/details/books/introductory-statistics-2e
// The DPT course (pt-dpt.ts) cites the same A&P edition as CC BY 4.0. On
// 2026-11-09 OpenStax's CMS gave CC BY-NC-SA. We reproduce no text, so the
// difference changes nothing here; it is noted for whoever next checks
// licences.
//
// Emphasis: the course leans toward what the first year of a DPT program
// builds on. The first six units are the musculoskeletal, muscle,
// biomechanics, nervous and cardiovascular core: 62 of the 95 objectives,
// and two labs each. Respiration, the physics beyond mechanics, chemistry,
// psychology and statistics come after them and go only as deep as PT
// coursework uses. The units carry no percentage weights, because a
// refresher has no exam blueprint and the course screen would print a
// weight as "% of exam". The hybrid lab plan therefore splits its six extra
// labs evenly, and they fall on the first six units, the core.
//
// Each objective carries an inline tag for the section it rests on, for
// example "AP 10.4" (Anatomy and Physiology 2e, section 10.4). Where a term
// is a convention the textbook does not print, the comment says so.
// PTPREREQ_UNIT_SOURCES below holds each unit's dated sources, and
// lib/pt-prereq.test.ts checks every unit has them.

import type { SeedTrack } from "../data";
import { source, type SourceRef } from "../sources";

const PT_DISCLAIMER_KEY = "pt-clinical-content";
const CHECKED = "2026-11-09";
// REQ-245: verified 2026-11-11. Re-read that day: the APTA and ACAPT pages
// (unchanged: the same ten common prerequisites, footer (c) 2026; the same
// 2012 common core, footer (c) 2024); the table of contents of all six
// OpenStax books, against which every section tag in this file (inline and
// in PTPREREQ_UNIT_SOURCES) was matched by number and title, none missing;
// and the full text of A&P 2e 3.1, 4.3, 4.6, 6.2, 9.4, 9.6, 10.4, 10.5,
// 11.5, 12.2, 12.4, 13.4, 14.3, 16.4, 19.4, 20.2, 22.3, 26.5, College
// Physics 2e 9.5, 9.6, 20.6, Chemistry 2e 14.2 and Psychology 2e 12.3, whose
// facts the objectives state (3 Na+ out and 2 K+ in per pump cycle; peak
// tension at 80-120 percent of resting sarcomere length; -70 mV resting
// potential; MAP = diastolic + pulse pressure / 3; TLC and VC as sums of the
// lung volumes; the four cardinal signs; the patella as the sesamoid; the
// knee's cruciates and menisci; the rotator cuff four; three fiber types; UMN
// and LMN signs; dermatomes in 16.4). No objective needed a change. The book
// sections keep the date they were first read; the scope pages carry the
// re-read date.
const VERIFIED = "2026-11-11";

export const PTPREREQ_SCOPE_SOURCES: readonly SourceRef[] = [
  source("https://www.apta.org/your-career/careers-in-physical-therapy/pt-admissions-process", "reference", VERIFIED),
  source("https://acapt.org/resources/admissions", "reference", VERIFIED),
];

const OX = {
  AP: "https://openstax.org/details/books/anatomy-and-physiology-2e",
  CHEM: "https://openstax.org/details/books/chemistry-2e",
  PHYS: "https://openstax.org/details/books/college-physics-2e",
  BIO: "https://openstax.org/details/books/biology-2e",
  PSY: "https://openstax.org/details/books/psychology-2e",
  STAT: "https://openstax.org/details/books/introductory-statistics-2e",
} as const;
const ox = (book: keyof typeof OX, sections: string) => ({ ...source(OX[book], "reference", CHECKED), sections });

export interface PrereqUnitSource extends SourceRef {
  // The sections the unit's objectives rest on, e.g. "10.2-10.6".
  sections: string;
}

export const PT_PREREQ_TRACK: SeedTrack = {
  code: "PTPREREQ",
  title: "PT School Prerequisites Refresher",
  description:
    "A refresher of the undergraduate prerequisites Doctor of Physical Therapy programs commonly require: anatomy and physiology, biology, general chemistry, physics, psychology and statistics. It leans toward what the first year of PT school builds on, which is musculoskeletal and nervous system anatomy, muscle and cardiopulmonary physiology, levers, torque and basic biomechanics. Chemistry and physics go only as deep as PT coursework needs. It is a review course. It does not replace the coursework a program requires.",
  trackType: "graduate",
  subcategorySlug: "physical-therapy",
  freshnessModel: "academic_foundational",
  sourceVerifiedAt: "2026-11-11T00:00:00Z",
  contentReviewDueAt: "2027-11-11T00:00:00Z",
  // REQ-142: no exam. A syllabus the course defines for itself, scoped on
  // the common DPT prerequisites as APTA lists them.
  curriculum: {
    kind: "self_defined",
    name: "PT School Prerequisites Refresher syllabus, scoped on APTA's list of common DPT prerequisites",
    version: "APTA PT admissions page and ACAPT common core prerequisites, read 2026-11-09, re-read 2026-11-11",
    url: "https://www.apta.org/your-career/careers-in-physical-therapy/pt-admissions-process",
    checkedAt: VERIFIED,
  },
  // The same single study notice as every physical therapy course (REQ-165).
  requiresAcknowledgement: true,
  disclaimerKey: PT_DISCLAIMER_KEY,
  disclaimerVersion: 1,
  units: [
    {
      title: "Cells, tissues and membrane transport",
      gate: "Explain an injury or a fluid shift at the level of the cell or tissue, naming the transport process or tissue type involved, not just 'it swelled'.",
      objectives: [
        "Match the nucleus, rough and smooth endoplasmic reticulum, Golgi apparatus, mitochondria and lysosomes to the job each does in a muscle or nerve cell", // AP 3.2; BIO 4.3-4.4
        "Compare simple diffusion, facilitated diffusion, osmosis, primary active transport and secondary active transport by energy use and direction relative to the concentration gradient", // BIO 5.2-5.3; AP 3.1
        "Apply tonicity to predict which way water moves when a cell sits in a hypertonic, isotonic or hypotonic solution, and what happens to the cell's volume", // BIO 5.2; AP 3.1
        "Explain how the sodium-potassium pump moves three Na+ out and two K+ in for each ATP, and how that keeps the inside of the cell negative", // BIO 5.3; AP 3.1, 12.4
        "Classify the four primary tissue types (epithelial, connective, muscle, nervous) and name a musculoskeletal structure built mainly from each", // AP 4.1
        "Identify which connective tissue (dense regular, dense irregular, elastic) forms tendons and ligaments, the dermis and the walls of large arteries, and relate each to the direction of its fibers", // AP 4.3
        "Compare hyaline cartilage, fibrocartilage and elastic cartilage by location and the load each bears, and explain why avascular cartilage and poorly vascularized tendon heal slowly", // AP 4.3, 9.4
        "Apply the tissue repair sequence (inflammation with its four cardinal signs, then granulation tissue as new vessels grow, then scar or regenerated tissue) to a described wound or sprain", // AP 4.6
      ],
    },
    {
      title: "Musculoskeletal anatomy: bones, joints and muscles",
      gate: "Name the joint, the plane, the movement and the muscles producing it for an everyday task such as standing up from a chair.",
      objectives: [
        "Use anatomical position, the sagittal, frontal and transverse planes and directional terms (proximal, distal, medial, lateral, anterior, posterior) to describe a location or movement precisely", // AP 1.6
        "Classify bones as long, short, flat, irregular or sesamoid, and give a limb example of each, with the patella as the sesamoid", // AP 6.2
        "Identify the parts of a long bone (diaphysis, epiphyses, epiphyseal plate, compact and spongy bone, periosteum, endosteum, medullary cavity) and the job of each", // AP 6.3
        "Explain how bone adapts to the mechanical stress placed on it, building with weight-bearing exercise and losing mass with disuse, and the roles of vitamin D and calcium", // AP 6.6
        "Identify the vertebral regions and their curves, and how cervical, thoracic and lumbar vertebrae differ in shape", // AP 7.3
        "Identify the bony landmarks that serve as major muscle attachments: the greater tubercle of the humerus, the olecranon, the iliac crest, the ischial tuberosity, the greater trochanter and the tibial tuberosity", // AP 8.1-8.4
        "Classify joints by structure (fibrous, cartilaginous, synovial) and by function (synarthrosis, amphiarthrosis, diarthrosis), with an example of each", // AP 9.1-9.3
        "Identify the six synovial joint types (plane, hinge, pivot, condyloid, saddle, ball-and-socket) with an example of each and the motions each allows", // AP 9.4
        "Name the movement at each joint for a described task using flexion, extension, abduction, adduction, rotation, circumduction, pronation, supination, dorsiflexion, plantar flexion, inversion and eversion", // AP 9.5
        "Identify the knee's stabilizing structures (anterior and posterior cruciate ligaments, medial and lateral collateral ligaments, medial and lateral menisci) and the motion each resists", // AP 9.6
        "Identify the four rotator cuff muscles (supraspinatus, infraspinatus, teres minor, subscapularis) and each one's main action at the glenohumeral joint", // AP 11.5
        "Identify the main hip and knee movers (gluteus maximus and medius, iliopsoas, quadriceps femoris, hamstrings, adductors) and each group's main action", // AP 11.6
        "Analyze a movement to name the agonist (prime mover), antagonist and synergist, and whether each working muscle contracts concentrically, eccentrically or isometrically", // AP 11.1, 10.4
        "Apply a muscle's attachments and line of pull to work out its action at every joint it crosses, including two-joint muscles such as the hamstrings and rectus femoris", // AP 11.1, 11.6
      ],
    },
    {
      title: "Muscle physiology",
      gate: "Explain why a muscle is weak, fatigues or adapts, in terms of sarcomeres, motor units, fiber types or ATP supply.",
      objectives: [
        "Sequence excitation-contraction coupling: the motor neuron action potential, acetylcholine release at the neuromuscular junction, spread along the sarcolemma and T-tubules, and calcium release from the sarcoplasmic reticulum", // AP 10.2-10.3
        "Explain the sliding filament model and the cross-bridge cycle, and the parts actin, myosin, troponin, tropomyosin, calcium and ATP play in contraction and relaxation", // AP 10.3
        "Apply the length-tension relationship (peak tension at about 80 to 120 percent of a sarcomere's resting length) to explain why a muscle is weaker when much shorter or much longer than that", // AP 10.4
        "Explain how the nervous system grades force by recruiting more motor units and by raising stimulation frequency from a twitch through summation to tetanus", // AP 10.4
        "Interpret a description of motor unit size (a few fibers per neuron in the eye muscles, many in a large postural muscle) and decide which arrangement allows finer control of force", // AP 10.4
        "Compare slow oxidative, fast oxidative and fast glycolytic fibers by contraction speed, main ATP source and resistance to fatigue", // AP 10.5
        "Compare the three ways muscle regenerates ATP (creatine phosphate, anaerobic glycolysis, aerobic respiration) by speed and by how long each can sustain work", // AP 10.3; BIO 7.2, 7.5
        "Explain how endurance training, resistance training and disuse change muscle: mitochondria and capillaries, hypertrophy and atrophy", // AP 10.6
        "Compare skeletal, cardiac and smooth muscle by striation, voluntary or involuntary control, cell junctions (intercalated discs) and where the calcium for contraction comes from", // AP 10.7-10.8
      ],
    },
    {
      title: "Biomechanics: levers, torque and forces",
      gate: "Work out the torque a muscle has to make for a stated load and limb position, with units, and say what change would make the task easier or harder.",
      objectives: [
        "Apply Newton's three laws to a body segment or a person pushing on a surface, naming each force and its reaction force", // PHYS 4.2-4.4
        "Resolve a force into perpendicular components with sine and cosine, and separate the part of a muscle's pull that rotates a joint from the part that compresses it", // PHYS 3.3, 9.6
        "Calculate torque as force times perpendicular lever arm (moment arm) about a pivot, in newton-meters, with its direction", // PHYS 9.2
        // The three arrangements are drawn in PHYS 9.5. "First", "second" and
        // "third class" are the usual labels for them; OpenStax does not print
        // the labels.
        "Classify a lever by where the pivot, load and effort sit (pivot between them, load between them, or effort between them: first, second and third class), using elbow extension by the triceps and elbow flexion by the biceps as body examples", // PHYS 9.5-9.6; AP 11.1
        "Calculate a lever's mechanical advantage from its lever arms, and explain why muscles attached close to a joint have a mechanical advantage below one and trade force for speed and range of motion", // PHYS 9.5-9.6; AP 11.1
        "Apply both conditions of equilibrium (net force zero, net torque zero) to calculate the biceps force and the elbow joint force needed to hold a load in the hand with the forearm horizontal", // PHYS 9.1-9.2, 9.6
        "Modify an exercise's difficulty by changing the load's lever arm (limb position, where a weight or band sits), and justify the change with torque", // PHYS 9.2, 9.6
        "Explain stability using the center of gravity, the base of support and whether the line of gravity falls within it", // PHYS 9.3
        "Calculate the force needed to overcome static and kinetic friction from the coefficient and the normal force, and why surface and footwear matter for transfers and walking", // PHYS 5.1
        "Explain stress, strain and Young's modulus, and use them to compare how much tendon and bone stretch or compress under the same load", // PHYS 5.3
      ],
    },
    {
      title: "Nervous system",
      gate: "From a described pattern of weakness, numbness or reflex change, say where in the nervous system the problem is likely to sit and why.",
      objectives: [
        "Distinguish the central and peripheral nervous systems, the somatic and autonomic divisions, and afferent (sensory) from efferent (motor) pathways", // AP 12.1
        "Identify the parts of a neuron (dendrites, cell body, axon hillock, axon, myelin sheath, nodes of Ranvier, axon terminals) and the cells that make myelin in the CNS (oligodendrocytes) and in the PNS (Schwann cells)", // AP 12.2
        "Explain the resting membrane potential of about -70 mV and the action potential in order: threshold, depolarization through voltage-gated Na+ channels, repolarization through K+ channels, and the refractory period", // AP 12.4
        "Explain why myelinated axons conduct faster by saltatory conduction, and what loss of myelin does to conduction", // AP 12.4
        "Explain how a chemical synapse passes a signal, and distinguish excitatory from inhibitory postsynaptic potentials and spatial from temporal summation", // AP 12.5
        "Identify the brain regions involved in movement (primary motor and somatosensory cortex, basal nuclei, cerebellum, brainstem) and what each contributes", // AP 13.2, 14.3
        "Trace the corticospinal tract and the dorsal column and spinothalamic pathways, including where each crosses the midline", // AP 14.2-14.3
        "Apply where each pathway crosses the midline to predict which side of the body loses strength or sensation after damage to one cerebral hemisphere or to one side of the spinal cord", // AP 14.2-14.3, 16.4
        "Recognize upper motor neuron signs (spasticity, increased reflexes) and lower motor neuron signs (weakness with atrophy, fasciculations, reduced reflexes) in a described finding", // AP 16.4
        "Identify the parts of a reflex arc and explain the stretch reflex a patellar tendon tap tests", // AP 14.3, 16.4
        "Identify the brachial and lumbosacral plexuses and major limb nerves: musculocutaneous, radial, median and ulnar; femoral, obturator, sciatic, tibial and common fibular", // AP 13.4
        "Explain dermatomes, and how damage to one spinal nerve root produces sensory loss over that root's dermatome", // AP 13.4, 16.4
        "Compare sympathetic and parasympathetic effects on heart rate, blood pressure, the airways and blood flow to skeletal muscle", // AP 15.1-15.2
      ],
    },
    {
      title: "Cardiovascular system",
      gate: "Calculate cardiac output and mean arterial pressure from given values, and explain how each changes when a person stands up or starts to exercise.",
      objectives: [
        "Trace blood through the heart's chambers and valves and around the pulmonary and systemic circuits", // AP 19.1
        "Sequence the conduction system (SA node, AV node, AV bundle, bundle branches, Purkinje fibers) and match the P wave, QRS complex and T wave to the events they record", // AP 19.2
        "Calculate cardiac output from heart rate and stroke volume, and explain how preload, contractility and afterload change stroke volume", // AP 19.4
        "Calculate pulse pressure and mean arterial pressure from a blood pressure reading, and interpret a narrow pulse pressure as a sign of low stroke volume", // AP 20.2
        "Explain how vessel radius, vessel length and blood viscosity set resistance to flow, and why a small change in radius changes flow so much", // AP 20.2; PHYS 12.4
        "Explain how the baroreceptor reflex keeps blood pressure up on standing, and how the skeletal muscle pump and venous valves return blood to the heart", // AP 20.2, 20.4
        "Explain the cardiovascular response to exercise: higher heart rate and stroke volume, and blood redirected to working muscle", // AP 19.4, 20.4
        "Identify the parts of blood (erythrocytes, leukocytes, platelets, plasma) and how hemoglobin carries oxygen", // AP 18.1, 18.3
      ],
    },
    {
      title: "Respiratory system and acid-base balance",
      gate: "Link a change in breathing to its effect on blood gases and blood pH.",
      objectives: [
        "Trace air from the nasal cavity through the conducting zone to the alveoli, and say where gas exchange happens", // AP 22.1
        "Explain how the diaphragm and intercostal muscles change thoracic volume and pressure in quiet and forced breathing, using Boyle's law", // AP 22.3
        "Calculate vital capacity and total lung capacity from tidal volume, the inspiratory and expiratory reserve volumes and residual volume", // AP 22.3
        "Explain how partial-pressure gradients move oxygen and carbon dioxide across the respiratory membrane", // AP 22.4
        "Interpret the oxygen-hemoglobin dissociation curve, including its shift to the right as temperature, carbon dioxide and acidity rise in working muscle", // AP 22.5
        "Explain how the bicarbonate buffer and breathing together regulate blood pH, and recognize respiratory acidosis or alkalosis from a described change in breathing", // AP 26.4-26.5; CHEM 14.6
        "Explain how ventilation rises with exercise and how chemoreceptors respond to carbon dioxide and pH", // AP 22.3, 22.6
      ],
    },
    {
      title: "Physics for PT: energy, pressure, fluids, electricity and waves",
      gate: "Do a one-line physics calculation with units for a clinic task, such as the power of a stair climb or the pressure under a heel, and explain what the number means.",
      objectives: [
        "Calculate work, gravitational potential energy, kinetic energy and power for a lifted load or a person climbing stairs", // PHYS 7.1-7.3, 7.7
        "Explain basal metabolic rate and how the body turns food energy into useful work, heat and the electrical potentials of its cells", // PHYS 7.8
        "Calculate pressure as force divided by area, and apply it to explain why a larger contact area lowers pressure on skin", // PHYS 11.3
        "Explain buoyancy (Archimedes' principle) and how pressure rises with depth, and how each changes the load on the body in water", // PHYS 11.4, 11.7
        "Apply Ohm's law to relate voltage, current and resistance, and explain why dry and wet skin give very different currents for the same voltage", // PHYS 20.2, 20.6
        "Explain the frequency, wavelength and intensity of a wave, and how ultrasound uses high-frequency sound", // PHYS 16.9, 17.7
      ],
    },
    {
      title: "Chemistry and metabolism for physiology",
      gate: "Do a concentration or pH calculation and connect it to a body fluid or a buffer.",
      objectives: [
        "Distinguish ionic, polar covalent and nonpolar covalent bonds, and explain why water dissolves salts and glucose but not fats", // CHEM 7.1-7.2, 7.6, 11.1
        "Explain how electrolytes (sodium, potassium, calcium, chloride) dissociate into ions in water and why their concentrations matter for nerve and muscle function", // CHEM 11.2; AP 26.3
        "Calculate molarity and convert between grams, moles and millimoles for a simple solution such as 0.9 percent saline", // CHEM 3.1, 3.3
        "Calculate pH from hydrogen ion concentration, and explain the log scale: a fall of 0.3 in pH is about a doubling of hydrogen ions", // CHEM 14.2
        "Explain how a buffer resists a change in pH, using the carbonic acid-bicarbonate system as the example", // CHEM 14.6; AP 26.4
        "Explain how enzymes lower activation energy, and how temperature and pH change an enzyme's activity", // BIO 6.2, 6.5
        "Compare glycolysis, the citric acid cycle and oxidative phosphorylation by where each happens and whether it needs oxygen, and what happens to pyruvate when oxygen is short", // BIO 7.2-7.5
      ],
    },
    {
      title: "Psychology for patient care",
      gate: "Use a learning, stress or development idea to explain how someone might respond to an exercise program, without diagnosing.",
      objectives: [
        "Distinguish classical conditioning, operant conditioning (reinforcement and punishment) and observational learning, and apply each to building an exercise habit", // PSY 6.2-6.4
        "Explain the stress response (the general adaptation syndrome and the hypothalamic-pituitary-adrenal axis) and how long-term stress affects health", // PSY 14.1, 14.3
        "Identify Erikson's psychosocial stages and Piaget's cognitive stages, and use them to adapt how you explain an exercise to a child, an adult or an older adult", // PSY 9.2-9.3
        "Recognize the core features of major depressive disorder and generalized anxiety disorder as the textbook describes them, and why either can lower participation in rehabilitation", // PSY 15.4, 15.7
        "Explain attitudes and persuasion, including the foot-in-the-door technique, and how they shape whether a person follows advice", // PSY 12.3
        "Evaluate a plainly described study as correlational or experimental, and say whether it can support a cause-and-effect claim", // PSY 2.2-2.3
      ],
    },
    {
      title: "Statistics for reading research",
      gate: "Read a results paragraph from a study and say in plain words what the numbers do and do not show.",
      objectives: [
        "Classify data as nominal, ordinal, interval or ratio, and choose a suitable summary for each", // STAT 1.3
        "Calculate the mean, median, range and sample standard deviation of a small data set, and decide which center to report when the data are skewed", // STAT 2.5-2.7
        "Calculate a z-score and use the standard normal distribution to find the share of values above or below a cut-off", // STAT 6.1-6.2
        "Interpret a 95 percent confidence interval for a mean in plain words", // STAT 8.1-8.2
        "Set up null and alternative hypotheses, interpret a p-value against a significance level, and distinguish Type I from Type II errors", // STAT 9.1-9.2
        "Choose between a two-sample t-test, a paired t-test and a chi-square test of independence for a described study", // STAT 10.1, 10.4, 11.3
        "Interpret a correlation coefficient and a regression line, and explain why correlation alone does not show causation", // STAT 12.3-12.4
      ],
    },
  ],
};

// Dated sources per unit, in unit order. Seed-only (there is no column):
// the currency report and lib/pt-prereq.test.ts read it.
export const PTPREREQ_UNIT_SOURCES: Readonly<Record<string, readonly PrereqUnitSource[]>> = {
  "Cells, tissues and membrane transport": [ox("AP", "3.1-3.2, 4.1, 4.3, 4.6, 9.4"), ox("BIO", "4.3-4.4, 5.2-5.3")],
  "Musculoskeletal anatomy: bones, joints and muscles": [ox("AP", "1.6, 6.2-6.3, 6.6, 7.3, 8.1-8.4, 9.1-9.6, 10.4, 11.1, 11.5-11.6")],
  "Muscle physiology": [ox("AP", "10.2-10.8"), ox("BIO", "7.2, 7.5")],
  "Biomechanics: levers, torque and forces": [ox("PHYS", "3.3, 4.2-4.4, 5.1, 5.3, 9.1-9.6"), ox("AP", "11.1")],
  "Nervous system": [ox("AP", "12.1-12.5, 13.2, 13.4, 14.2-14.3, 15.1-15.2, 16.4")],
  "Cardiovascular system": [ox("AP", "18.1, 18.3, 19.1-19.2, 19.4, 20.2, 20.4"), ox("PHYS", "12.4")],
  "Respiratory system and acid-base balance": [ox("AP", "22.1, 22.3-22.6, 26.4-26.5"), ox("CHEM", "14.6")],
  "Physics for PT: energy, pressure, fluids, electricity and waves": [ox("PHYS", "7.1-7.3, 7.7-7.8, 11.3-11.4, 11.7, 16.9, 17.7, 20.2, 20.6")],
  "Chemistry and metabolism for physiology": [ox("CHEM", "3.1, 3.3, 7.1-7.2, 7.6, 11.1-11.2, 14.2, 14.6"), ox("BIO", "6.2, 6.5, 7.2-7.5"), ox("AP", "26.3-26.4")],
  "Psychology for patient care": [ox("PSY", "2.2-2.3, 6.2-6.4, 9.2-9.3, 12.3, 14.1, 14.3, 15.4, 15.7")],
  "Statistics for reading research": [ox("STAT", "1.3, 2.5-2.7, 6.1-6.2, 8.1-8.2, 9.1-9.2, 10.1, 10.4, 11.3, 12.3-12.4")],
};

// REQ-235 (batch H wave 1): the unit's textbook sections reach the lesson
// writer and the fact-checker (lib/current-facts.ts) as dated unit sources,
// and four core units carry key values read on 2026-11-11 in the online
// OpenStax editions (A&P 2e 12.4, 19.4, 26.5; College Physics 2e 9.2). A
// refresher has no official outline, so there is none to quote.
const BOOK_TITLE: Record<string, string> = {
  [OX.AP]: "OpenStax Anatomy and Physiology 2e",
  [OX.CHEM]: "OpenStax Chemistry 2e",
  [OX.PHYS]: "OpenStax College Physics 2e",
  [OX.BIO]: "OpenStax Biology 2e",
  [OX.PSY]: "OpenStax Psychology 2e",
  [OX.STAT]: "OpenStax Introductory Statistics 2e",
};
const PTPREREQ_KEY_VALUES: Readonly<Record<string, { url: string; keyValues: string[] }>> = {
  "Nervous system": {
    url: OX.AP,
    keyValues: [
      "resting membrane potential about -70 mV (varies between cells); threshold about -55 mV, where voltage-gated Na+ channels open; the action potential is all-or-none (AP 12.4)",
    ],
  },
  "Cardiovascular system": {
    url: OX.AP,
    keyValues: ["cardiac output = heart rate x stroke volume, for each ventricle; resting mean about 5.25 L/min, range 4.0-8.0 L/min (AP 19.4)"],
  },
  "Respiratory system and acid-base balance": {
    url: OX.AP,
    keyValues: [
      "arterial reference values: pH 7.35-7.45; pCO2 35-48 mm Hg (male), 32-45 mm Hg (female); total venous bicarbonate 22-29 mM; at pH 7.40 bicarbonate to carbonic acid is 20:1 (AP 26.5)",
    ],
  },
  "Biomechanics: levers, torque and forces": {
    url: OX.PHYS,
    keyValues: ["torque = rF sin(theta) = perpendicular lever arm x force, in newton-meters (N-m) (College Physics 9.2)"],
  },
};
for (const unit of PT_PREREQ_TRACK.units) {
  const kv = PTPREREQ_KEY_VALUES[unit.title];
  unit.sources = (PTPREREQ_UNIT_SOURCES[unit.title] ?? []).map((s) => ({
    title: `${BOOK_TITLE[s.url] ?? s.url}, sections ${s.sections}`,
    url: s.url,
    kind: s.kind,
    checkedAt: kv && kv.url === s.url ? "2026-11-11" : s.checkedAt,
    ...(kv && kv.url === s.url ? { keyValues: kv.keyValues } : {}),
  }));
}
