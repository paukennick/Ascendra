import { CLINICAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-198: PT School Prerequisites Refresher (PTPREREQ) labs.
//
// Density (docs/labs.md, "hybrid"): the units carry no weights (a refresher
// has no exam blueprint), so the plan's six extra labs are split evenly and
// fall on the first six units. Those are the musculoskeletal, muscle,
// biomechanics, nervous and cardiovascular core the course leans on. The
// result is 2/2/2/2/2/2/1/1/1/1/1, or 17 labs (7 case, 10 build), one lab
// per objective. lib/pt-prereq.test.ts checks it unit by unit.
//
// Answer format: every lab is a written answer graded per rubric part.
// Order, match and numeric answer types (REQ-189, branch
// feature/interactive-labs) are not merged into master, which this branch
// is based on. The torque, physics and statistics labs are the first
// candidates to convert once they are: their parts already ask for one
// number with units, or for one ordering.
//
// Values: every number a lab quotes comes from the OpenStax section named
// on its objective in seed/tracks/pt-prereq.ts (read 2026-11-09):
// MAP = diastolic + pulse pressure / 3 (AP 20.2); CO = HR x SV, with a
// resting stroke volume range of 55-100 mL (AP 19.4); VC = TV + IRV + ERV,
// TLC = VC + RV (AP 22.3); peak sarcomere tension at 80-120 percent of
// resting length (AP 10.4); skin resistance falling when wet, I = V / R
// (PHYS 20.6). The arithmetic was done with CPython 3 on 2026-11-09 and
// the results quoted are the ones it printed, rounded as stated
// (g = 9.8 m/s^2 throughout).
//
// SAFETY: every person in a brief is fictional. This is study practice for
// prerequisite science, not clinical guidance. The labs carry the PT
// clinical safety note because the course sits in the physical therapy
// category, whose labs are graded with clinical safety framing.

const CHECKED = "2026-11-09";

export const PTPREREQ_LABS: SeedLabSet = {
  trackCode: "PTPREREQ",
  sources: [
    source("https://www.apta.org/your-career/careers-in-physical-therapy/pt-admissions-process", "reference", CHECKED),
    source("https://openstax.org/details/books/anatomy-and-physiology-2e", "reference", CHECKED),
    source("https://openstax.org/details/books/college-physics-2e", "reference", CHECKED),
    source("https://openstax.org/details/books/biology-2e", "reference", CHECKED),
    source("https://openstax.org/details/books/chemistry-2e", "reference", CHECKED),
    source("https://openstax.org/details/books/psychology-2e", "reference", CHECKED),
    source("https://openstax.org/details/books/introductory-statistics-2e", "reference", CHECKED),
  ],
  labs: [
    // ------------------------------------------------ Cells, tissues and membrane transport (2)
    {
      slug: "ptprereq-tonicity-three-solutions",
      objective:
        "Apply tonicity to predict which way water moves when a cell sits in a hypertonic, isotonic or hypotonic solution, and what happens to the cell's volume",
      kind: "build",
      title: "Three beakers, three red blood cells",
      brief:
        "A fictional teaching lab puts red blood cells from the same sample into three beakers. Beaker A holds a salt solution with a higher solute concentration than the cells' cytoplasm. Beaker B holds a solution with the same solute concentration as the cytoplasm. Beaker C holds distilled water. The membrane lets water through freely but not the salt. For each beaker, say which way water moves and what happens to the cells, and name the process.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Predict water movement and cell volume in each beaker, and name the process.",
          parts: [
            part(
              "Beaker A",
              "Calls the solution hypertonic to the cell; water leaves the cell by osmosis (toward the higher solute concentration); the cell shrinks (crenates).",
              "Hypertonic: there is more solute outside than inside, so water moves out of the cell by osmosis, toward the side with more solute. The cells lose water and shrink (crenate)."
            ),
            part(
              "Beaker B",
              "Calls it isotonic; no net movement of water (water still crosses in both directions at equal rates); the cell keeps its volume.",
              "Isotonic: solute concentration is the same on both sides, so there is no net water movement. Water still crosses both ways, but equally, so the cells keep their normal shape and volume."
            ),
            part(
              "Beaker C",
              "Calls distilled water hypotonic; water enters the cell by osmosis; the cell swells and can burst (lyse/haemolyse) because a red cell has no wall to resist it.",
              "Hypotonic: there is almost no solute outside, so water moves into the cells by osmosis. They swell and may burst (haemolysis), because an animal cell has no cell wall to stop it."
            ),
          ],
        },
      ],
    },
    {
      slug: "ptprereq-tissue-repair-sprain",
      objective:
        "Apply the tissue repair sequence (inflammation with its four cardinal signs, then granulation tissue as new vessels grow, then scar or regenerated tissue) to a described wound or sprain",
      kind: "case",
      title: "A rolled ankle, from the first hours to weeks later",
      brief:
        "A fictional 20-year-old student rolls her ankle stepping off a curb and stretches the ligaments on the outside of the ankle. Use the tissue repair sequence from your anatomy and physiology course to explain what happens in the tissue at each stage. Ligament is dense regular connective tissue.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Two hours later the outside of the ankle is red, puffy, warm and sore to touch, and she does not want to put weight on it.",
          ask: "Which stage is this, and what is producing each sign she shows?",
          parts: [
            part(
              "Stage and signs",
              "Names the inflammatory response and its four cardinal signs (redness, swelling, heat, pain), with loss of function as the extra observation; links them to local vasodilation and leaky capillaries bringing blood, fluid and white cells to the area.",
              "This is inflammation. Her four cardinal signs are all there: redness and heat from more blood flowing into dilated vessels, swelling from fluid leaking out of the capillaries into the tissue, and pain from chemical signals and pressure on nerve endings. Not wanting to bear weight is the loss of function that often goes with them."
            ),
            part(
              "Purpose",
              "Explains that inflammation is protective: it walls off and clears damaged tissue and debris (white cells, macrophages) and starts repair, so it is not simply harmful.",
              "Inflammation is the start of repair. It brings white blood cells and macrophages to clear damaged cells and debris, and it sets up the conditions for new tissue to form."
            ),
          ],
        },
        {
          text: "Over the following days the swelling settles. In the torn area, new small blood vessels are growing and fibroblasts are laying down new collagen.",
          ask: "What is the new tissue called, and how will the repair finish?",
          parts: [
            part(
              "New tissue",
              "Names granulation tissue: new capillaries (angiogenesis) plus fibroblasts producing collagen, filling the gap.",
              "This is granulation tissue. New capillaries grow into the area (angiogenesis) and fibroblasts make collagen to fill the gap."
            ),
            part(
              "End result",
              "Says the repair ends with collagen scar tissue where regeneration of the original tissue is incomplete, so the repaired ligament is not identical to the original.",
              "The gap is bridged mostly by collagen scar tissue, not by a perfect copy of the original ligament. The repaired ligament is useful but not identical to what was there before."
            ),
          ],
        },
        {
          text: "A friend who once scraped her knee is surprised the ankle is taking so much longer to recover than her skin did.",
          ask: "Why does ligament heal more slowly than a skin scrape?",
          parts: [
            part(
              "Why slower",
              "Links slow healing to a poor blood supply in dense regular connective tissue such as ligament and tendon (fewer vessels to bring cells and nutrients), and contrasts it with epithelium and well-vascularised tissue that renews quickly.",
              "Ligament, like tendon, is dense regular connective tissue with a poor blood supply, so fewer cells and nutrients reach the repair. The skin's surface layer is epithelium that renews itself quickly, with a richly vascular dermis under it."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------ Musculoskeletal anatomy (2)
    {
      slug: "ptprereq-squat-muscle-roles",
      objective:
        "Analyse a movement to name the agonist (prime mover), antagonist and synergist, and whether each working muscle contracts concentrically, eccentrically or isometrically",
      kind: "case",
      title: "What the thigh muscles do in a squat",
      brief:
        "A fictional 30-year-old does a slow bodyweight squat: she lowers herself over 3 seconds, pauses for 2 seconds with her thighs about parallel to the floor, then stands back up. Look at the knee joint only. Gravity is trying to bend her knees the whole time.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Phase 1: she lowers herself. Her knees bend (flex) under control.",
          ask: "Which muscle group controls the knee, and what type of contraction is it?",
          parts: [
            part(
              "Muscle",
              "Names the quadriceps femoris as the muscle group working at the knee, even though the movement is flexion, because it controls the descent against gravity.",
              "The quadriceps femoris. The knee is flexing, but gravity is doing the bending; the quadriceps (the knee extensors) are what control how fast she goes down."
            ),
            part(
              "Contraction type",
              "Says eccentric: the quadriceps lengthen while producing tension, braking the movement.",
              "Eccentric. The quadriceps are producing force while they lengthen, which slows the descent instead of letting her drop."
            ),
          ],
        },
        {
          text: "Phase 2: she holds still at the bottom for 2 seconds.",
          ask: "What contraction type is this, and why?",
          parts: [
            part(
              "Contraction type",
              "Says isometric: the quadriceps produce tension with no change in muscle length or joint angle, because their torque matches gravity's.",
              "Isometric. The quadriceps are working, but the knee angle and the muscle's length do not change, because the muscle's pull exactly balances gravity."
            ),
          ],
        },
        {
          text: "Phase 3: she stands back up. Her knees straighten (extend).",
          ask: "Name the agonist, the antagonist and the contraction type of the agonist.",
          parts: [
            part(
              "Agonist and contraction",
              "Agonist is the quadriceps femoris contracting concentrically (shortening while producing force) to extend the knee.",
              "The quadriceps femoris is the agonist (prime mover), contracting concentrically: it shortens as it straightens the knee against gravity."
            ),
            part(
              "Antagonist",
              "Names the hamstrings as the antagonist to knee extension (the main knee flexors), relaxing or lengthening to allow the movement.",
              "The hamstrings are the antagonist. They are the main knee flexors, so they relax and lengthen to let the knee straighten."
            ),
          ],
        },
      ],
    },
    {
      slug: "ptprereq-two-joint-muscles",
      objective:
        "Apply a muscle's attachments and line of pull to work out its action at every joint it crosses, including two-joint muscles such as the hamstrings and rectus femoris",
      kind: "build",
      title: "Work out a two-joint muscle's actions",
      brief:
        "In a fictional anatomy study group, you are given two muscles. The hamstrings (biceps femoris long head, semitendinosus, semimembranosus) arise from the ischial tuberosity, run down the back of the thigh, and attach below the knee on the back of the leg. The rectus femoris arises from the front of the pelvis just above the hip joint, runs down the front of the thigh, and joins the quadriceps tendon, which attaches to the tibial tuberosity via the patella. Work out each muscle's action at each joint it crosses.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give each muscle's action at the hip and at the knee, and then one consequence.",
          parts: [
            part(
              "Hamstrings",
              "Crosses the back of both hip and knee: extends the hip and flexes the knee; reasons from the line of pull behind each joint.",
              "They pass behind the hip and behind the knee. Pulling from behind the hip, they extend the hip. Pulling from behind the knee, they flex the knee. So the hamstrings extend the hip and flex the knee."
            ),
            part(
              "Rectus femoris",
              "Crosses the front of both hip and knee: flexes the hip and extends the knee (through the quadriceps tendon and patella to the tibial tuberosity).",
              "It passes in front of the hip and, through the quadriceps tendon and patella, in front of the knee. So it flexes the hip and extends the knee. It is the only quadriceps muscle that crosses the hip."
            ),
            part(
              "Consequence",
              "Draws a valid consequence of crossing two joints, e.g. a two-joint muscle's length depends on both joint positions, so the hamstrings are most stretched with the hip flexed and knee extended (a straight-leg raise) and rectus femoris with hip extended and knee flexed; or the muscle is weaker when shortened over both joints at once.",
              "A two-joint muscle's length depends on both joints at once. The hamstrings are longest with the hip flexed and the knee straight, as in a straight-leg raise. The rectus femoris is longest with the hip extended and the knee bent. When a two-joint muscle is shortened over both joints at once, it has little force left."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------ Muscle physiology (2)
    {
      slug: "ptprereq-length-tension-explain",
      objective:
        "Apply the length-tension relationship (peak tension at about 80 to 120 percent of a sarcomere's resting length) to explain why a muscle is weaker when much shorter or much longer than that",
      kind: "build",
      title: "Why the same muscle is stronger at some lengths",
      brief:
        "A fictional study group tests elbow flexor strength at three elbow angles: nearly straight, at 90 degrees, and fully bent. The 90-degree position is strongest. One student says, \"It's because the arm is fresher in the middle.\" Use the length-tension relationship to give the real reason, at the level of the sarcomere.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the strongest position, then each weaker one, from filament overlap.",
          parts: [
            part(
              "Middle range",
              "Says peak tension comes when sarcomeres are near their resting length, about 80 to 120 percent of it, where thick and thin filament overlap gives the most usable cross-bridges.",
              "Near the middle of its range, each sarcomere sits at about 80 to 120 percent of its resting length. Thick and thin filaments overlap so that the most myosin heads can bind actin, and the most cross-bridges means the most tension."
            ),
            part(
              "Overstretched",
              "Says that when stretched well beyond the optimum (over about 120 percent) the filaments overlap too little, so fewer myosin heads can reach actin and tension falls.",
              "When the muscle is stretched well past that range, thick and thin filaments barely overlap, so fewer myosin heads can reach binding sites on actin and tension drops."
            ),
            part(
              "Fully shortened",
              "Says that when shortened well below the optimum the thin filaments overlap/crowd and thick filaments press against the Z discs, leaving little room for further shortening or cross-bridge cycling, so tension falls.",
              "When the muscle is fully shortened, the sarcomere is compressed: thin filaments crowd past each other and the thick filaments butt against the Z discs. There is little room to shorten further and fewer effective cross-bridges, so tension drops."
            ),
          ],
        },
      ],
    },
    {
      slug: "ptprereq-motor-unit-size",
      objective:
        "Interpret a description of motor unit size (a few fibres per neuron in the eye muscles, many in a large postural muscle) and decide which arrangement allows finer control of force",
      kind: "case",
      title: "Threading a needle versus standing up",
      brief:
        "A fictional physiology quiz compares two muscles. Muscle X moves the eye, and each of its motor neurons supplies only a handful of muscle fibres. Muscle Y is a large lower-limb muscle used for standing and walking, and each of its motor neurons can supply hundreds or more fibres.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Both muscles are told to make a small, slow increase in force.",
          ask: "Which muscle can grade its force more finely, and why?",
          parts: [
            part(
              "Finer control",
              "Picks muscle X (small motor units): recruiting one more motor unit adds only a few fibres' worth of force, so force rises in small steps; in muscle Y each added unit is a large jump.",
              "Muscle X. A motor unit is one neuron and all the fibres it supplies. With only a few fibres per unit, recruiting one more unit adds a tiny amount of force, so the eye muscle can adjust force in small steps. In muscle Y, each extra unit adds hundreds of fibres at once."
            ),
          ],
        },
        {
          text: "Muscle Y now has to lift a heavy load, and the force has to rise a lot.",
          ask: "How does the nervous system increase muscle Y's force?",
          parts: [
            part(
              "Recruitment",
              "Describes recruitment: more motor units are activated, typically smaller ones first and larger ones as more force is needed.",
              "By recruitment: more and more motor units are switched on, the smaller ones first and the larger ones as more force is needed."
            ),
            part(
              "Frequency",
              "Describes raising firing frequency so twitches summate, up toward a fused contraction (tetanus).",
              "By firing each motor unit faster, so the twitches summate before the muscle relaxes, building toward a sustained, fused contraction (tetanus)."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------ Biomechanics (2)
    {
      slug: "ptprereq-elbow-equilibrium",
      objective:
        "Apply both conditions of equilibrium (net force zero, net torque zero) to calculate the biceps force and the elbow joint force needed to hold a load in the hand with the forearm horizontal",
      kind: "case",
      title: "How hard the biceps works to hold a dumbbell",
      brief:
        "A fictional student holds a 5.0 kg dumbbell with the elbow at 90 degrees and the forearm horizontal. Treat the forearm as a lever pivoting at the elbow. The forearm and hand have a mass of 2.0 kg with their centre of mass 0.15 m from the elbow. The dumbbell is 0.33 m from the elbow. The biceps pulls straight up, 0.040 m from the elbow. Use g = 9.8 m/s^2 and ignore every other muscle.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Start with the torques about the elbow.",
          ask: "Find the total torque from the weights about the elbow, and the biceps force that balances it.",
          parts: [
            part(
              "Load torque",
              "Torque = weight x perpendicular lever arm for each: forearm 2.0 x 9.8 x 0.15 = 2.94 N m; dumbbell 5.0 x 9.8 x 0.33 = 16.17 N m; total about 19.1 N m (19.11). Units N m.",
              "Forearm: 2.0 kg x 9.8 m/s^2 x 0.15 m = 2.94 N m. Dumbbell: 5.0 x 9.8 x 0.33 = 16.17 N m. Total torque trying to extend the elbow: 19.11 N m, about 19.1 N m."
            ),
            part(
              "Biceps force",
              "Sets net torque to zero with the pivot at the elbow (so the joint force has no torque): F_biceps x 0.040 = 19.11, giving about 478 N (accept 477-478 N).",
              "Choose the elbow as the pivot so the unknown joint force has no torque. Net torque zero: F x 0.040 m = 19.11 N m, so F = 19.11 / 0.040 = 478 N (477.75)."
            ),
          ],
        },
        {
          text: "Now the forces.",
          ask: "Find the force at the elbow joint, and compare the biceps force with the dumbbell's weight.",
          parts: [
            part(
              "Joint force",
              "Net force zero: biceps up 478 N, weights down 2.0 x 9.8 + 5.0 x 9.8 = 68.6 N, so the joint must push down on the forearm with about 409 N (accept 409-410 N), direction stated.",
              "Weights pull down with 19.6 N + 49 N = 68.6 N and the biceps pulls up with 478 N. For the net force to be zero, the humerus must push down on the forearm with 478 - 68.6 = 409 N."
            ),
            part(
              "Comparison",
              "Notes the biceps force is about ten times the dumbbell's weight (478 vs 49 N) because its lever arm (0.040 m) is much shorter than the load's (0.33 m): a mechanical advantage well below one.",
              "478 N is about ten times the dumbbell's 49 N weight. The biceps attaches only 4 cm from the elbow while the dumbbell sits 33 cm out, so the muscle has a mechanical advantage well below one. It trades force for speed and range of motion at the hand."
            ),
          ],
        },
        {
          text: "The student slides the dumbbell back to 0.25 m from the elbow. Nothing else changes.",
          ask: "What biceps force is needed now, and why did it change?",
          parts: [
            part(
              "New force",
              "New load torque 2.94 + 5.0 x 9.8 x 0.25 = 15.19 N m; biceps force 15.19 / 0.040 = about 380 N (accept 379-380 N); explains the drop by the dumbbell's shorter lever arm.",
              "The dumbbell's torque is now 5.0 x 9.8 x 0.25 = 12.25 N m, so the total is 2.94 + 12.25 = 15.19 N m. The biceps needs 15.19 / 0.040 = 380 N. Moving the load closer to the pivot shortened its lever arm and cut the torque."
            ),
          ],
        },
      ],
    },
    {
      slug: "ptprereq-moment-arm-progression",
      objective:
        "Modify an exercise's difficulty by changing the load's lever arm (limb position, where a weight or band sits), and justify the change with torque",
      kind: "build",
      title: "Make a straight-leg raise easier and harder with torque",
      brief:
        "In a fictional practice lab, a classmate lies on her back and lifts one straight leg. Model the leg as an 8.0 kg segment whose centre of mass is 0.40 m from the hip when the knee is straight. Use g = 9.8 m/s^2 and take the moment when the leg is just off the table and horizontal. Show the torque the hip flexors must match, then change the exercise using lever arms only, not more mass.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the starting torque, one easier version and one harder version, each justified with torque.",
          parts: [
            part(
              "Starting torque",
              "Torque = 8.0 x 9.8 x 0.40 = about 31.4 N m (31.36) about the hip, with units, and says the hip flexors must produce at least this to lift the leg.",
              "Torque = m g d = 8.0 kg x 9.8 m/s^2 x 0.40 m = 31.36 N m, about 31.4 N m. The hip flexors have to produce at least that to lift the leg off the table."
            ),
            part(
              "Easier",
              "Shortens the load's lever arm, e.g. bending the knee so the segment's centre of mass moves closer to the hip; shows the torque falls in proportion (e.g. at 0.25 m: 8.0 x 9.8 x 0.25 = 19.6 N m), or lifts from a more upright start where the horizontal distance is shorter.",
              "Bend the knee so the leg's mass sits closer to the hip. If the centre of mass moves to 0.25 m, the torque is 8.0 x 9.8 x 0.25 = 19.6 N m, nearly 40 percent less, with the same mass."
            ),
            part(
              "Harder",
              "Lengthens the lever arm, e.g. a cuff weight at the ankle (far from the hip) instead of the thigh, and explains a weight's torque is its weight times its distance from the hip, so the same weight farther out adds more torque.",
              "Put a small cuff weight at the ankle rather than at the knee. A weight's torque is its weight times its distance from the hip, so the same weight at the ankle, much farther out, adds far more torque than it would at the knee."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------ Nervous system (2)
    {
      slug: "ptprereq-lesion-side",
      objective:
        "Apply where each pathway crosses the midline to predict which side of the body loses strength or sensation after damage to one cerebral hemisphere or to one side of the spinal cord",
      kind: "case",
      title: "Which side? Using where pathways cross",
      brief:
        "A fictional neuroanatomy problem set. Remember the three pathways: the corticospinal tract (voluntary movement) crosses in the lower medulla at the pyramidal decussation; the dorsal column pathway (fine touch, vibration, position sense) crosses in the medulla; the spinothalamic pathway (pain and temperature) crosses in the spinal cord close to the level where it enters.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Case 1: a fictional person has damage to the motor and sensory cortex of the left cerebral hemisphere.",
          ask: "Which side of the body is weak, and which side loses touch sensation? Explain.",
          parts: [
            part(
              "Weakness",
              "Right side: the corticospinal fibres from the left cortex cross at the pyramidal decussation, so the left hemisphere controls the right body.",
              "The right side. The left motor cortex's corticospinal fibres cross to the other side in the lower medulla, so the left hemisphere moves the right side of the body."
            ),
            part(
              "Sensation",
              "Right side: both ascending pathways have already crossed below the cortex, so the left hemisphere receives sensation from the right body.",
              "Also the right side. Both sensory pathways cross before they reach the brain, so the left sensory cortex receives touch and pain from the right side of the body."
            ),
          ],
        },
        {
          text: "Case 2: a different fictional person has damage to the left half of the spinal cord in the mid-thoracic region.",
          ask: "Below the injury, which side loses strength, which loses fine touch and position sense, and which loses pain and temperature?",
          parts: [
            part(
              "Motor",
              "Left side: the corticospinal tract has already crossed in the medulla, so at the cord it is carrying fibres for the same side.",
              "Left-side weakness. The corticospinal fibres crossed in the medulla, high above, so in the left side of the cord they serve the left side of the body."
            ),
            part(
              "Dorsal column",
              "Left side: the dorsal column pathway ascends on the same side and does not cross until the medulla.",
              "Left-side loss of fine touch, vibration and position sense. Those fibres travel up the same side of the cord and only cross in the medulla."
            ),
            part(
              "Spinothalamic",
              "Right side: pain and temperature fibres cross in the cord near their entry level, so the left cord carries the right body's pain and temperature.",
              "Right-side loss of pain and temperature. Those fibres cross within the spinal cord near where they enter, so the left half of the cord carries them for the right side of the body."
            ),
          ],
        },
      ],
    },
    {
      slug: "ptprereq-umn-lmn",
      objective:
        "Recognise upper motor neuron signs (spasticity, increased reflexes) and lower motor neuron signs (weakness with atrophy, fasciculations, reduced reflexes) in a described finding",
      kind: "build",
      title: "Upper or lower motor neuron?",
      brief:
        "A fictional neuroscience worksheet describes two people with leg weakness. Person A: the leg muscles feel stiff and catch when moved quickly, the knee-jerk reflex is brisk, and the muscles are not wasted. Person B: the calf is visibly thinner than the other side, small twitches can be seen under the skin, the ankle reflex is absent and the muscle feels floppy. Decide which motor neuron is affected in each, and justify it.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each person as an upper or lower motor neuron pattern, with the findings that decide it.",
          parts: [
            part(
              "Person A",
              "Upper motor neuron pattern: spasticity (velocity-dependent stiffness), brisk/increased reflexes, little atrophy; explains the lower motor neuron and reflex arc are intact but lose descending control.",
              "Upper motor neuron. Stiffness that catches with fast movement (spasticity) and a brisk reflex mean the reflex arc still works but has lost descending control from the brain. The lower motor neuron still supplies the muscle, so it is not wasted."
            ),
            part(
              "Person B",
              "Lower motor neuron pattern: atrophy, fasciculations, flaccid (low) tone and absent/reduced reflexes; explains the muscle has lost its nerve supply, which also breaks the reflex arc.",
              "Lower motor neuron. Wasting, visible twitches (fasciculations), floppy tone and an absent reflex mean the muscle has lost its nerve supply. With the lower motor neuron damaged, the reflex arc is broken too."
            ),
            part(
              "Where each sits",
              "Locates the UMN in the brain/corticospinal tract (cortex to cord) and the LMN as the motor neuron from the anterior horn of the cord or brainstem out to the muscle.",
              "The upper motor neuron runs from the motor cortex down the corticospinal tract to the spinal cord. The lower motor neuron runs from the anterior horn of the cord, or a brainstem nucleus, out to the muscle."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------ Cardiovascular system (2)
    {
      slug: "ptprereq-cardiac-output-exercise",
      objective:
        "Calculate cardiac output from heart rate and stroke volume, and explain how preload, contractility and afterload change stroke volume",
      kind: "case",
      title: "Cardiac output at rest and on a bike",
      brief:
        "A fictional 25-year-old volunteer in a physiology class has a resting heart rate of 70 beats per minute and a stroke volume of 70 mL. Use CO = HR x SV and give answers in litres per minute.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "At rest, seated.",
          ask: "Calculate the resting cardiac output.",
          parts: [
            part(
              "Resting CO",
              "70 x 70 = 4,900 mL/min = 4.9 L/min, units shown.",
              "CO = 70 beats/min x 70 mL/beat = 4,900 mL/min, which is 4.9 L/min."
            ),
          ],
        },
        {
          text: "During hard cycling her heart rate is 150 beats per minute and her stroke volume rises to 100 mL.",
          ask: "Calculate the exercise cardiac output and explain why stroke volume rose.",
          parts: [
            part(
              "Exercise CO",
              "150 x 100 = 15,000 mL/min = 15 L/min, about three times resting.",
              "CO = 150 x 100 mL = 15,000 mL/min = 15 L/min, about three times her resting output."
            ),
            part(
              "Why SV rose",
              "Names at least two: greater preload (more venous return from the muscle pump fills the ventricle more, stretching it so it contracts harder), greater contractility (sympathetic stimulation); and notes afterload works the other way (higher resistance lowers SV).",
              "More venous return, helped by the skeletal muscle pump, fills the ventricles more (higher preload), and the stretched muscle contracts more forcefully. Sympathetic stimulation also raises contractility. Afterload works the other way: higher resistance to ejection would lower stroke volume."
            ),
          ],
        },
      ],
    },
    {
      slug: "ptprereq-map-pulse-pressure",
      objective:
        "Calculate pulse pressure and mean arterial pressure from a blood pressure reading, and interpret a narrow pulse pressure as a sign of low stroke volume",
      kind: "build",
      title: "Pulse pressure and MAP from three readings",
      brief:
        "A fictional physiology lab records three resting blood pressures: reading A is 120/80 mm Hg, reading B is 150/60 mm Hg, and reading C is 100/85 mm Hg. Use MAP = diastolic + (pulse pressure / 3), the approximation your A&P text uses.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give pulse pressure and MAP for each reading, then interpret reading C.",
          parts: [
            part(
              "Reading A",
              "Pulse pressure 120 - 80 = 40 mm Hg; MAP = 80 + 40/3 = about 93 mm Hg.",
              "Pulse pressure = 120 - 80 = 40 mm Hg. MAP = 80 + 40/3 = 93 mm Hg."
            ),
            part(
              "Reading B",
              "Pulse pressure 150 - 60 = 90 mm Hg; MAP = 60 + 90/3 = 90 mm Hg; notes MAP is similar to A even though the numbers look very different.",
              "Pulse pressure = 150 - 60 = 90 mm Hg. MAP = 60 + 90/3 = 90 mm Hg. That is close to A's MAP, even though the systolic and diastolic values are far apart."
            ),
            part(
              "Reading C",
              "Pulse pressure 15 mm Hg, MAP = 85 + 5 = 90 mm Hg; identifies the pulse pressure as narrow (below 25 percent of systolic: 15 is 15 percent of 100) and links a narrow pulse pressure to low stroke volume.",
              "Pulse pressure = 100 - 85 = 15 mm Hg and MAP = 85 + 15/3 = 90 mm Hg. The pulse pressure is narrow: it should be at least about 25 percent of systolic, and 15 is only 15 percent of 100. A narrow pulse pressure suggests a low stroke volume."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------ Respiratory system (1)
    {
      slug: "ptprereq-lung-volumes",
      objective:
        "Calculate vital capacity and total lung capacity from tidal volume, the inspiratory and expiratory reserve volumes and residual volume",
      kind: "build",
      title: "Build lung capacities from the volumes",
      brief:
        "A fictional spirometry practical gives one volunteer's lung volumes: tidal volume 500 mL, inspiratory reserve volume 3,100 mL, expiratory reserve volume 1,200 mL, and residual volume 1,200 mL. Calculate the capacities and explain the one volume spirometry cannot measure directly.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate vital capacity and total lung capacity, then explain residual volume.",
          parts: [
            part(
              "Vital capacity",
              "VC = TV + IRV + ERV = 500 + 3,100 + 1,200 = 4,800 mL; defines it as the most air that can be moved in or out in one breath.",
              "VC = TV + IRV + ERV = 500 + 3,100 + 1,200 = 4,800 mL. It is the most air the volunteer can move into or out of the lungs in one breath."
            ),
            part(
              "Total lung capacity",
              "TLC = VC + RV (or the sum of all four volumes) = 4,800 + 1,200 = 6,000 mL.",
              "TLC = all four volumes = VC + RV = 4,800 + 1,200 = 6,000 mL."
            ),
            part(
              "Residual volume",
              "Explains RV is the air left after a maximal exhalation, which keeps the alveoli open, and cannot be breathed out, so a simple spirometer cannot measure it (it is measured by other methods).",
              "Residual volume is the air left in the lungs even after the hardest possible breath out. It keeps the alveoli from collapsing. Because it never leaves the lungs, a spirometer measuring exhaled air cannot record it directly."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------ Physics for PT (1)
    {
      slug: "ptprereq-stair-climb-power",
      objective: "Calculate work, gravitational potential energy, kinetic energy and power for a lifted load or a person climbing stairs",
      kind: "build",
      title: "The power of one flight of stairs",
      brief:
        "A fictional 70 kg student climbs a flight of stairs with a vertical rise of 3.0 m in 6.0 s at a steady speed. Use g = 9.8 m/s^2. Treat the climb as raising the body's centre of mass by 3.0 m.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the energy gained and the power, and say what happens to kinetic energy.",
          parts: [
            part(
              "Potential energy",
              "PE = m g h = 70 x 9.8 x 3.0 = 2,058 J (about 2.1 kJ), which is also the minimum work done against gravity.",
              "PE = m g h = 70 kg x 9.8 m/s^2 x 3.0 m = 2,058 J, about 2.1 kJ. That is the least work the student must do against gravity."
            ),
            part(
              "Power",
              "P = W / t = 2,058 / 6.0 = 343 W (about 340 W), units in watts.",
              "Power = work / time = 2,058 J / 6.0 s = 343 W."
            ),
            part(
              "Kinetic energy",
              "At steady speed kinetic energy does not change between start and finish, so it adds nothing to the net work; and notes the body uses more food energy than 2,058 J because much of it becomes heat.",
              "At a steady speed her kinetic energy is the same at the top as at the bottom, so it adds no net work. Her body will still burn more food energy than 2,058 J, because much of the energy it converts ends up as heat rather than useful work."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------ Chemistry (1)
    {
      slug: "ptprereq-saline-molarity",
      objective: "Calculate molarity and convert between grams, moles and millimoles for a simple solution such as 0.9 percent saline",
      kind: "build",
      title: "What 0.9 percent saline means in moles",
      brief:
        "A fictional chemistry review asks about 0.9 percent saline, which contains 9.0 g of sodium chloride (NaCl) in every litre of solution. The molar mass of NaCl is 58.44 g/mol. NaCl dissociates completely in water into Na+ and Cl- ions.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Find the molarity in mol/L and mmol/L, and the concentration of dissolved particles.",
          parts: [
            part(
              "Moles per litre",
              "9.0 / 58.44 = 0.154 mol in one litre, so 0.154 M (mol/L).",
              "Moles = mass / molar mass = 9.0 g / 58.44 g/mol = 0.154 mol in each litre, so the solution is 0.154 M."
            ),
            part(
              "Millimoles",
              "0.154 mol/L x 1,000 = 154 mmol/L; shows the conversion factor.",
              "0.154 mol/L x 1,000 mmol/mol = 154 mmol/L."
            ),
            part(
              "Particles",
              "Each NaCl gives two ions, so about 308 mmol of dissolved particles per litre (2 x 154), and explains why particle count, not formula units, is what matters for osmosis.",
              "Each NaCl separates into one Na+ and one Cl-, so there are about 2 x 154 = 308 mmol of dissolved particles per litre. For osmosis what counts is the number of particles in solution, not the number of NaCl formula units."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------ Psychology (1)
    {
      slug: "ptprereq-study-design",
      objective: "Evaluate a plainly described study as correlational or experimental, and say whether it can support a cause-and-effect claim",
      kind: "case",
      title: "Does walking cause better mood?",
      brief: "A fictional research methods seminar reads two short study summaries about walking and mood in adults.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "Study 1: researchers survey 500 adults about how many minutes they walk each week and score their mood on a questionnaire. People who walk more report better mood (a positive correlation).",
          ask: "Is this correlational or experimental, and can it show that walking improves mood?",
          parts: [
            part(
              "Design",
              "Correlational: the researchers measured two variables as they occur and manipulated nothing.",
              "Correlational. The researchers only measured walking and mood as they already were; they did not change anything."
            ),
            part(
              "Cause and effect",
              "Says it cannot show causation, and gives both reasons: direction (better mood may lead to more walking) and a third variable (e.g. health or free time affecting both).",
              "No. The link could run the other way (people in a better mood may walk more), or a third variable such as general health or free time could drive both."
            ),
          ],
        },
        {
          text: "Study 2: 120 volunteers are randomly assigned either to a supervised walking program three times a week or to a stretching class, for 8 weeks. Mood is scored before and after by assessors who do not know which group each person was in.",
          ask: "What kind of study is this, and what lets it support a causal claim?",
          parts: [
            part(
              "Design",
              "Experimental: the researchers manipulated the independent variable (walking vs stretching) and measured the dependent variable (mood).",
              "An experiment. The researchers manipulated the independent variable (walking program or stretching class) and measured the dependent variable (mood)."
            ),
            part(
              "Why causal",
              "Names random assignment (groups alike on average, so third variables are balanced) and a comparison/control group, plus blinded assessors reducing bias; so a difference in mood can be attributed to the walking.",
              "Random assignment makes the groups alike on average, so other variables are spread evenly. The stretching group is a comparison, and assessors who don't know the groups can't bias the scores. If mood improves more with walking, the walking is the likely cause."
            ),
          ],
        },
      ],
    },

    // ------------------------------------------------ Statistics (1)
    {
      slug: "ptprereq-grip-strength-summary",
      objective:
        "Calculate the mean, median, range and sample standard deviation of a small data set, and decide which centre to report when the data are skewed",
      kind: "build",
      title: "Summarise eight grip-strength readings",
      brief:
        "A fictional class measures right-hand grip strength in eight volunteers, in kilograms: 28, 31, 33, 30, 35, 29, 32, 46. Summarise the data and decide what centre to report.",
      safetyNote: CLINICAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the mean, median, range and sample standard deviation, then choose the centre to report.",
          parts: [
            part(
              "Mean and median",
              "Mean = 264 / 8 = 33.0 kg; sorted 28, 29, 30, 31, 32, 33, 35, 46 gives median (31 + 32) / 2 = 31.5 kg.",
              "Mean = 264 / 8 = 33.0 kg. Sorted: 28, 29, 30, 31, 32, 33, 35, 46. With eight values, the median is the average of the 4th and 5th: (31 + 32) / 2 = 31.5 kg."
            ),
            part(
              "Spread",
              "Range 46 - 28 = 18 kg; sample standard deviation about 5.7 kg (5.71), using n - 1 in the denominator.",
              "Range = 46 - 28 = 18 kg. Sample standard deviation, dividing the summed squared deviations by n - 1 = 7, is about 5.7 kg."
            ),
            part(
              "Which centre",
              "Identifies 46 as an outlier that skews the data to the right and pulls the mean above the median; recommends reporting the median (with the range or IQR) as more typical.",
              "The 46 kg reading is far above the rest, so the data are skewed right and the mean (33.0) is pulled above most values. Report the median, 31.5 kg, as the typical value, with the range or interquartile range."
            ),
          ],
        },
      ],
    },
  ],
};
