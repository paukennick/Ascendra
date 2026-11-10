import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-161: Computer Science Degree Foundations (CMPCBS). REQ-195 reframed
// the track as general courses taught from open textbooks (seed/data.ts);
// these labs sit on its course units and were already general skills, so
// only their sources and the course codes in three briefs changed.
//
// Density (docs/labs.md, "hybrid") over the twenty major course units
// (Introduction to Computer Science through Information Security): one lab
// per course plus one extra in Introduction to Computer Science, the only
// course unit with a second performance objective and room -> 21 labs. The
// reframed general-education surveys (College Composition I, Religion
// Surveys) have no lab yet, and the retired degree-plan units never get one.
// The content test (`lib/labs.test.ts`) checks both.
//
// Each lab is a task the course itself grades by doing: design an
// algorithm, tell compile-time from run-time errors, optimise with a
// derivative and apply L'Hopital, classify series, run a hypothesis test,
// prove with truth tables, reconstruct Euclid's and Archimedes' arguments,
// eliminate, iterate Newton's method with an error analysis, verify a group,
// classify critical points, solve a cooling problem, compute an expected
// value, formulate a logistic model, fit a regression, plan a capstone
// write-up, weigh a technology decision, fix pass-by-value and recursion
// bugs in C++, implement a stack ADT, and write a security policy.
//
// Sources: the open textbooks each unit is taught from (OpenStax Calculus
// and Introductory Statistics, Levin's Discrete Mathematics, Judson's
// Abstract Algebra, Open Data Structures), cppreference for C++ semantics,
// MIT OCW single-variable calculus and linear algebra, and NIST CSF 2.0 for
// the policy lab's framing. Every number was computed with SymPy 1.14 or
// CPython 3.13's statistics module and every C++ snippet compiled and ran
// with g++ (C++17, -Wall -Wextra; the stack lab also under
// AddressSanitizer) on 2026-11-07; the outputs quoted are the outputs seen.

export const CMPCBS_LABS: SeedLabSet = {
  trackCode: "CMPCBS",
  sources: [
    source("https://openstax.org/books/calculus-volume-1/pages/preface", "reference", "2026-11-09"),
    source("https://openstax.org/books/introductory-statistics-2e/pages/preface", "reference", "2026-11-09"),
    source("https://discrete.openmathbooks.org/", "reference", "2026-11-09"),
    source("https://judsonbooks.org/abstract-algebra-theory-and-applications/", "reference", "2026-11-09"),
    source("https://opendatastructures.org/ods-cpp/", "reference", "2026-11-09"),
    source("https://en.cppreference.com/w/cpp/language", "reference", "2026-11-07"),
    source("https://ocw.mit.edu/courses/18-01sc-single-variable-calculus-fall-2010/", "reference", "2026-11-07"),
    source("https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/", "reference", "2026-11-07"),
    source("https://www.nist.gov/cyberframework", "reference", "2026-11-07"),
  ],
  labs: [
    // Introduction to Computer Science -------------------------------------
    {
      slug: "design-duplicate-finder",
      objective: "Algorithm design and problem-solving strategies",
      kind: "build",
      title: "Design an algorithm before writing code",
      brief:
        "A fictional campus library has a list of 200,000 student ID numbers scanned at the door today and wants to know whether any ID was scanned twice. Design an algorithm: state the problem precisely (input, output, edge cases), give a first correct approach and its cost, then a better one and its cost, and say how you would convince someone it is correct. No code needed -- pseudocode or clear English steps.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Specify the problem, give two approaches with costs, and argue correctness.",
          parts: [
            part(
              "Problem statement",
              "Input: a list of n ID values (n up to 200,000); output: yes/no (optionally the first repeated ID); edge cases named: empty list and single element (no duplicate), all identical, the duplicate at the very end, IDs of different formatting (leading zeros) treated as the same or not -- a decision to state.",
              "Input: a sequence of n ID values, n about 200,000. Output: true if any value appears more than once, else false (and, usefully, which one). Edge cases: n = 0 or 1 -> false; every entry identical -> true; the only repeat is the last element -> must still be found; and a decision about format -- '0012345' and '12345' are the same student, so normalise IDs before comparing."
            ),
            part(
              "Brute force and its cost",
              "Compare every pair: for each i, for each j > i, if equal return true. Correct by exhaustion. Time n(n-1)/2 comparisons, about 2 x 10^10 for n = 200,000 -- O(n^2); extra space O(1).",
              "Check every pair: for i from 1 to n, for j from i+1 to n, if id[i] == id[j] return true; after the loops return false. Obviously correct -- it looks at every pair. Cost: n(n-1)/2 comparisons, roughly 2 x 10^10 for 200,000 IDs, which is minutes to hours depending on the machine. O(n^2) time, O(1) extra space."
            ),
            part(
              "A better approach and its cost",
              "Either sort then scan adjacent pairs (O(n log n) time, O(1) or O(n) space depending on the sort) or insert into a hash set and stop on the first hit (O(n) expected time, O(n) space); states the trade (memory vs guaranteed bound) and picks one for this size.",
              "Option A: sort the list, then walk it once comparing each entry with its neighbour -- duplicates are adjacent after sorting. O(n log n) time, in place if the sort is. Option B: walk the list once, keeping a hash set of IDs seen; if an ID is already in the set, stop. O(n) expected time, O(n) extra memory -- trivial for 200,000 numbers. For this size B is the natural choice: one pass, done in a fraction of a second; A is the fallback if memory were tight or a worst-case guarantee mattered more than average speed."
            ),
            part(
              "Correctness argument",
              "Gives an invariant-style argument: for the hash-set method, 'after processing the first k IDs, the set contains exactly the distinct IDs among them, and no duplicate has appeared among them'; a hit means the current ID equals an earlier one (duplicate exists), and finishing means every ID was distinct. For sorting: equal values are adjacent in sorted order, so a duplicate exists iff some adjacent pair is equal. Mentions testing the edge cases.",
              "Hash-set method: the invariant is that after k IDs the set holds exactly the distinct values among the first k and none of them repeated. If ID k+1 is in the set, it equals some earlier ID -- a duplicate, and we return true correctly. If we reach the end, every ID was absent from the set when it arrived, so all are distinct -- false is correct. Sorting method: sorting puts equal values next to each other, so 'some adjacent pair is equal' is exactly 'some value appears twice'. Then run the edge cases -- empty, one element, all equal, repeat at the end -- as tests."
            ),
          ],
        },
      ],
    },
    {
      slug: "compile-time-vs-run-time-errors",
      objective: "Programming languages and how compilers translate code",
      kind: "build",
      title: "Tell the compiler's errors from the program's",
      brief:
        "Two C++ files from a fictional first-year lab. File one:\n\n#include <iostream>\nint main() {\n    int count = 5\n    std::string name = \"Ada\";\n    cout << name << count << std::endl;\n    return 0;\n}\n\nFile two:\n\n#include <iostream>\nint main() {\n    int denom = 0;\n    std::cout << \"about to divide\" << std::endl;\n    std::cout << 10 / denom << std::endl;\n    return 0;\n}\n\nFor each file say what happens when you compile and run it, name the kind of error, say which phase of translation catches it (or doesn't), and fix it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Diagnose both files and fix them.",
          parts: [
            part(
              "File one",
              "Does not compile. Names the errors: missing semicolon after int count = 5 (a syntax error found by the parser: 'expected ... ; before std'); cout without std:: (a name-lookup/semantic error: 'cout was not declared in this scope'); also notes <string> should be included for std::string. These are compile-time errors: the compiler stops and produces no executable.",
              "It never runs: the compiler refuses it. Line 3 is missing its semicolon, so the parser reports \"expected ',' or ';' before 'std'\" -- a syntax error. Line 5 uses cout without std::, so name lookup fails: \"'cout' was not declared in this scope; did you mean 'std::cout'?\" -- a semantic error. (g++ then also complains 'name' is undeclared, a knock-on from the first error.) Both are compile-time errors: no executable is produced. Fix: add the semicolon, write std::cout, and #include <string>."
            ),
            part(
              "File two",
              "Compiles cleanly (integer division by a zero held in a variable is not a compile error); at run time it prints 'about to divide' and then crashes -- on Linux a floating point exception (SIGFPE), exit status 136 -- because integer division by zero is undefined behaviour; names it a run-time error that the compiler cannot catch because the value is only known when the program runs. Fix: check denom before dividing.",
              "This compiles with no errors or warnings -- the compiler sees 10 / denom and denom is just an int variable. Running it prints 'about to divide' and then dies: integer division by zero is undefined behaviour, and on Linux the CPU traps it as a floating point exception (SIGFPE), exit code 136. It is a run-time error; the compiler could not know denom would be zero because the value exists only when the program runs. Fix: if (denom == 0) { report it } else { divide }."
            ),
            part(
              "What the phases are",
              "Describes the pipeline: preprocessing (#include), lexical analysis (tokens), parsing (syntax -- catches the missing semicolon), semantic analysis (names, types -- catches undeclared cout, type mismatches), code generation and optimisation, then linking; run-time errors (division by zero, out-of-range access, logic errors) happen after all of that. Contrasts briefly with an interpreter, which reports syntax errors at load and others as it executes.",
              "The preprocessor expands #include; the lexer turns characters into tokens; the parser checks the grammar -- that is where the lost semicolon dies; semantic analysis resolves names and types -- that is where the bare cout dies; then code generation, optimisation and linking produce the executable. Everything the compiler can prove from the text it catches there. What depends on data -- a zero divisor, an index past the end, a wrong formula -- surfaces only at run time, which is why file two compiles and crashes. An interpreter moves the line: syntax errors at load, most of the rest as each statement executes."
            ),
          ],
        },
      ],
    },
    // Calculus I -----------------------------------------------------------
    {
      slug: "open-box-optimisation-and-lhopital",
      objective: "Applications of derivatives, including L'Hopital's Rule",
      kind: "build",
      title: "Maximise a box, then evaluate two indeterminate limits",
      brief:
        "A fictional packaging exercise: an open-top box is made from a 24 in by 24 in sheet by cutting equal squares of side x from the corners and folding up the sides. Find the x that maximises the volume and the maximum volume, with a justification that it is a maximum. Then evaluate two limits, stating why L'Hopital's Rule applies (or does not): (a) lim x->0 (e^x - 1 - x) / x^2, and (b) lim x->0+ x ln x.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Solve the optimisation with its justification, then the two limits.",
          parts: [
            part(
              "Volume function and domain",
              "V(x) = x(24 - 2x)^2 with 0 < x < 12 (the sides must be positive). States why the endpoints give zero volume.",
              "Base is (24 - 2x) by (24 - 2x), height x, so V(x) = x(24 - 2x)^2 on 0 < x < 12. At x = 0 there is no height and at x = 12 no base, so both give V = 0; the maximum is interior."
            ),
            part(
              "Critical points and the maximum",
              "V'(x) = (24 - 2x)^2 - 4x(24 - 2x) = (24 - 2x)(24 - 6x) = 0 at x = 12 (excluded/endpoint) and x = 4. V(4) = 4 * 16^2 = 1024 cubic inches. Justifies the maximum by the second derivative V''(4) = -96 < 0, or by a sign chart (V' > 0 on (0,4), < 0 on (4,12)), or by comparing with the endpoint values 0.",
              "V'(x) = (24 - 2x)^2 + x * 2(24 - 2x)(-2) = (24 - 2x)[(24 - 2x) - 4x] = (24 - 2x)(24 - 6x). Zero at x = 12 (the endpoint) and x = 4. V(4) = 4 * (24 - 8)^2 = 4 * 256 = 1024 in^3. It is a maximum: V''(4) = -96 < 0 (second derivative test), and equivalently V' is positive on (0, 4) and negative on (4, 12). Cut 4-inch squares for a 16 x 16 x 4 box."
            ),
            part(
              "Limit (a)",
              "0/0 form, so L'Hopital applies: differentiate to (e^x - 1)/(2x), still 0/0, apply again: e^x / 2 -> 1/2. Checks the form before each application.",
              "At x = 0 the numerator is e^0 - 1 - 0 = 0 and the denominator is 0: a 0/0 form, so L'Hopital applies. Differentiate top and bottom: (e^x - 1)/(2x) -- at 0 this is again 0/0, so apply once more: e^x / 2 -> 1/2. The limit is 1/2. (The Taylor series e^x = 1 + x + x^2/2 + ... gives the same answer at a glance.)"
            ),
            part(
              "Limit (b)",
              "0 * (-infinity) is not a L'Hopital form; rewrite as ln x / (1/x), which is -inf/inf, then L'Hopital: (1/x) / (-1/x^2) = -x -> 0. Answer 0. Notes the rewrite is the key step.",
              "As x -> 0+, x -> 0 and ln x -> -infinity: a 0 times infinity product, which is not a form L'Hopital handles directly. Rewrite as a quotient: x ln x = ln x / (1/x), now -inf / +inf. Apply the rule: (1/x) / (-1/x^2) = -x -> 0. So x ln x -> 0: the x wins. The rule only applies to 0/0 and infinity/infinity, so the algebra to get there is part of the answer."
            ),
          ],
        },
      ],
    },
    // Calculus II ----------------------------------------------------------
    {
      slug: "classify-four-series",
      objective: "Sequences, infinite series, and convergence tests",
      kind: "build",
      title: "Decide convergence for four series and name the test",
      brief:
        "A fictional Calculus II quiz. For each series decide whether it converges or diverges, name the test you used and show the key step:\n\n(i) sum 1/sqrt(n), n >= 1\n(ii) sum (-1)^n / n, n >= 1\n(iii) sum n! / n^n, n >= 1\n(iv) sum n / (n + 1), n >= 1\n\nThen say which of the convergent ones converge absolutely.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each series with its test, then address absolute convergence.",
          parts: [
            part(
              "(i) and (iv)",
              "(i) diverges: p-series with p = 1/2 <= 1 (or integral test / comparison with the harmonic series). (iv) diverges by the divergence (nth-term) test: n/(n+1) -> 1, not 0.",
              "(i) sum 1/sqrt(n) = sum 1/n^(1/2) is a p-series with p = 1/2 <= 1, so it diverges (the integral of x^(-1/2) from 1 to infinity is infinite). (iv) The terms n/(n+1) tend to 1, not to 0, so the series diverges by the nth-term test -- no further test is needed, and none could rescue it."
            ),
            part(
              "(ii)",
              "Converges by the alternating series test: 1/n is positive, decreasing and tends to 0. Converges conditionally, not absolutely, because sum 1/n (harmonic) diverges.",
              "(ii) The alternating harmonic series: terms alternate in sign, |a_n| = 1/n is decreasing and tends to 0, so the alternating series test gives convergence. It is conditional: the series of absolute values is the harmonic series, which diverges. (Its sum is -ln 2, but the test does not need that.)"
            ),
            part(
              "(iii) and the absolute-convergence summary",
              "Converges by the ratio test: a_{n+1}/a_n = (n+1)! n^n / ((n+1)^{n+1} n!) = (n/(n+1))^n -> 1/e < 1. Positive terms, so convergence is absolute. Summary: (ii) converges conditionally, (iii) converges absolutely, (i) and (iv) diverge.",
              "(iii) Ratio test: a_{n+1}/a_n = [(n+1)!/(n+1)^(n+1)] * [n^n/n!] = (n+1) n^n / (n+1)^(n+1) = (n/(n+1))^n = 1/(1 + 1/n)^n -> 1/e, about 0.368 < 1, so the series converges. Its terms are positive, so the convergence is absolute. Summary: (i) diverges (p-series), (ii) converges conditionally (alternating), (iii) converges absolutely (ratio), (iv) diverges (nth-term test)."
            ),
          ],
        },
      ],
    },
    // Introduction to Statistical Analysis ---------------------------------
    {
      slug: "proportion-hypothesis-test",
      objective: "Statistical inference: estimation and hypothesis testing",
      kind: "build",
      title: "Test a claim about a proportion and build the interval",
      brief:
        "A fictional streaming service claims 30% of its subscribers use the app daily. An analyst samples 200 subscribers at random and finds 74 daily users. At the 5% significance level, does the sample contradict the 30% claim? Run the test, give a 95% confidence interval for the true proportion, and state what the result does and does not mean. Use the normal approximation and state why it is justified.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "State hypotheses, compute the statistic and p-value, build the interval, and interpret.",
          parts: [
            part(
              "Hypotheses, conditions and statistic",
              "H0: p = 0.30; H1: p != 0.30 (two-sided, since the question is 'contradict'). Conditions: random sample; n p0 = 60 and n(1 - p0) = 140 are both well above 10, so the normal approximation is fine. p-hat = 74/200 = 0.37; SE under H0 = sqrt(0.3 * 0.7 / 200) = 0.0324; z = (0.37 - 0.30)/0.0324 = 2.16.",
              "H0: p = 0.30 versus H1: p != 0.30 -- two-sided, because the question asks whether the claim is contradicted in either direction. Conditions: a random sample, and under H0 the expected counts are n p0 = 60 and n(1 - p0) = 140, both far above 10, so the sampling distribution of p-hat is close to normal. p-hat = 74/200 = 0.37. Standard error under H0: sqrt(0.30 * 0.70 / 200) = 0.0324. z = (0.37 - 0.30) / 0.0324 = 2.16."
            ),
            part(
              "Decision",
              "Two-sided p-value = 2 * P(Z > 2.16) = 0.031 < 0.05; equivalently |z| = 2.16 > 1.96. Reject H0: the data are inconsistent with p = 0.30 at the 5% level.",
              "Two-sided p-value: 2 * P(Z > 2.16) = 0.031. That is below 0.05 -- equivalently |z| = 2.16 exceeds the critical value 1.96 -- so reject H0. If 30% were the true daily-use rate, a sample proportion this far from it would occur about 3% of the time; the sample points to a higher rate."
            ),
            part(
              "Confidence interval and interpretation",
              "95% CI using p-hat: 0.37 +/- 1.96 * sqrt(0.37 * 0.63 / 200) = 0.37 +/- 0.067 = (0.303, 0.437); consistent with the test because 0.30 lies just outside. Interpretation: we are 95% confident the true proportion is between about 30% and 44%; the result does not prove the claim false, does not give the probability H0 is true, and says nothing about causes or about subscribers outside the sampled population; a one-sided test or a different alpha would change the verdict near this boundary.",
              "Interval with the sample proportion: 0.37 +/- 1.96 * sqrt(0.37 * 0.63 / 200) = 0.37 +/- 0.067, i.e. (0.303, 0.437). The claimed 0.30 sits just outside it, which matches the rejection -- barely. What it means: with 95% confidence the true daily-use proportion is between roughly 30% and 44%. What it does not mean: it is not a 3% chance the claim is true (the p-value is a probability about the data, not the hypothesis), it does not prove the service misled anyone, and it applies only to the population the 200 were drawn from. The evidence is real but near the line; a second sample would be reasonable before acting on it."
            ),
          ],
        },
      ],
    },
    // Discrete Mathematics -------------------------------------------------
    {
      slug: "truth-tables-and-argument-forms",
      objective: "Logic and formal proof techniques",
      kind: "build",
      title: "Prove two equivalences and judge two arguments",
      brief:
        "A fictional discrete-math problem set. (1) Prove with truth tables that p -> q is logically equivalent to (not p) or q, and that not (p and q) is equivalent to (not p) or (not q). (2) Decide whether each argument form is valid, and name it: (a) 'If it rained, the ground is wet. The ground is wet. Therefore it rained.' (b) 'If it rained, the ground is wet. The ground is not wet. Therefore it did not rain.' (3) State the contrapositive and the converse of 'if n^2 is even then n is even', and say which is equivalent to the original.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the truth tables, the verdicts with names, and the contrapositive/converse analysis.",
          parts: [
            part(
              "Truth tables for the two equivalences",
              "Four rows (TT, TF, FT, FF): p -> q is T, F, T, T and (not p) or q is T, F, T, T -- identical columns. not(p and q) is F, T, T, T and (not p) or (not q) is F, T, T, T -- identical (De Morgan). States that identical final columns in every row is what 'logically equivalent' means.",
              "Rows p,q = TT, TF, FT, FF.\np -> q: T, F, T, T. (not p) or q: F or T = T; F or F = F; T or T = T; T or F = T -> T, F, T, T. Same column, so equivalent: an implication is false only when the antecedent is true and the consequent false.\nnot(p and q): F, T, T, T. (not p) or (not q): F, T, T, T. Same column -- De Morgan's law. Equivalence means the two compound statements have the same truth value on every row, which the tables show exhaustively."
            ),
            part(
              "The two arguments",
              "(a) invalid: affirming the consequent -- p -> q and q do not yield p (the ground could be wet from a sprinkler; row p = F, q = T has true premises and a false conclusion). (b) valid: modus tollens -- p -> q and not q yield not p; no row has both premises true and the conclusion false.",
              "(a) Invalid -- affirming the consequent. From 'rain -> wet' and 'wet' you cannot conclude 'rain': the row p = F, q = T makes both premises true and the conclusion false (a sprinkler wets the ground). (b) Valid -- modus tollens. From 'rain -> wet' and 'not wet' conclude 'not rain': whenever p -> q and not q are both true, q is false, and p -> q with q false forces p false; no row breaks it."
            ),
            part(
              "Contrapositive and converse",
              "Contrapositive: 'if n is not even (odd) then n^2 is not even (odd)' -- equivalent to the original (same truth table as shown in part 1: not q -> not p has the same column as p -> q). Converse: 'if n is even then n^2 is even' -- not equivalent in general (true here, but a different statement), and notes the original is often proved via its contrapositive: n odd -> n = 2k+1 -> n^2 = 2(2k^2 + 2k) + 1 is odd.",
              "Original: n^2 even -> n even. Contrapositive: n odd -> n^2 odd. These are equivalent -- (not q) -> (not p) has the same truth table as p -> q -- which is why the standard proof goes through the contrapositive: if n = 2k + 1 then n^2 = 4k^2 + 4k + 1 = 2(2k^2 + 2k) + 1, odd. Converse: n even -> n^2 even. It happens to be true, but it is a different statement and is not equivalent to the original (q -> p has a different table from p -> q: the TF and FT rows swap); proving the converse proves nothing about the original."
            ),
          ],
        },
      ],
    },
    // History of Mathematics -----------------------------------------------
    {
      slug: "euclid-primes-and-archimedes-pi",
      objective: "Greek geometry: Euclid, Pythagoras, and Archimedes",
      kind: "build",
      title: "Reconstruct two Greek arguments and say why they still matter",
      brief:
        "A fictional history-of-mathematics seminar asks you to present two results as the Greeks argued them, in modern words. (1) Euclid's proof that there are infinitely many primes (Elements IX.20), written as a complete argument. (2) Archimedes' method for bounding pi with inscribed and circumscribed regular polygons: explain the idea, give the bounds a hexagon produces, and explain how doubling the number of sides tightens them. Then say what each argument contributed to how mathematics is done.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give both reconstructions and the significance of each.",
          parts: [
            part(
              "Euclid's infinitude of primes",
              "Takes any finite list of primes p1..pk, forms N = p1 p2 ... pk + 1, observes N > 1 has some prime factor q; q cannot be any pi because dividing N by pi leaves remainder 1; so q is a prime not on the list; hence no finite list contains all primes. Notes the common misreading (N itself need not be prime -- e.g. 2*3*5*7*11*13 + 1 = 30031 = 59 * 509) and that Euclid phrases it as 'more primes than any assigned multitude', not with a modern infinity.",
              "Suppose you have any finite collection of primes p1, p2, ..., pk. Form N = p1 p2 ... pk + 1. N is greater than 1, so it has at least one prime factor, call it q. If q were one of the pi, then q would divide both N and p1...pk, hence their difference 1 -- impossible. So q is a prime not in the collection. Any finite list of primes therefore misses a prime, which is what 'infinitely many' means. Two cautions: N need not itself be prime (2*3*5*7*11*13 + 1 = 30031 = 59 * 509); and Euclid states it as 'prime numbers are more than any assigned multitude', avoiding a completed infinity."
            ),
            part(
              "Archimedes' bounds on pi",
              "Idea: a circle's circumference lies between the perimeters of an inscribed and a circumscribed regular n-gon; for a unit-diameter circle those perimeters are n sin(pi/n) and n tan(pi/n). Hexagon: inscribed perimeter exactly 3 (six radii), circumscribed 2 sqrt 3 ~ 3.464, so 3 < pi < 3.464. Doubling sides (12, 24, 48, 96) squeezes: at 96 sides, 3.1410 < pi < 3.1427, which is how Archimedes reached 3 10/71 < pi < 3 1/7 (3.1408 < pi < 3.1429). Notes he used geometric half-angle relations and rational bounds on square roots, not trigonometry.",
              "Trap the circle between two polygons: an inscribed regular n-gon is shorter than the circumference and a circumscribed one is longer. For a circle of diameter 1 the inscribed perimeter is n sin(pi/n) and the circumscribed is n tan(pi/n). With a hexagon the inscribed perimeter is exactly 3 (six sides each equal to the radius) and the circumscribed is 2 sqrt 3 ~ 3.4641, so 3 < pi < 3.4641. Doubling the sides tightens both: 12-gon 3.1058 < pi < 3.2154; 24-gon 3.1326 < pi < 3.1597; 48-gon 3.1394 < pi < 3.1461; 96-gon 3.1410 < pi < 3.1427. Archimedes stopped at 96 sides and, working with geometry and careful rational bounds on square roots rather than trigonometry, announced 3 10/71 < pi < 3 1/7 -- 3.1408 < pi < 3.1429."
            ),
            part(
              "Why they matter",
              "Euclid: a model of proof by contradiction/construction that establishes an infinite fact with a finite argument, and a theorem still proved the same way; Archimedes: the method of exhaustion -- bounding an unknown quantity between computable ones and systematically squeezing -- the ancestor of limits, numerical approximation and error bounds; both show rigour (a result is a proof, with its hypotheses) rather than measurement.",
              "Euclid's argument is a template: it proves something about an endless collection with a finite construction and a contradiction, and every student still proves it his way. Archimedes' is the method of exhaustion at work -- when you cannot compute a quantity, trap it between two you can, and show the trap can be made as tight as you like. That is the idea behind limits, numerical methods and every error bound in computational mathematics. Together they fix what 'knowing' means in mathematics: not a measurement, but an argument from stated assumptions that anyone can check."
            ),
          ],
        },
      ],
    },
    // Linear Algebra -------------------------------------------------------
    {
      slug: "gaussian-elimination-3x3",
      objective: "Systems of linear equations and Gaussian elimination",
      kind: "build",
      title: "Solve a 3 x 3 system by elimination and read the result",
      brief:
        "A fictional circuit analysis yields the system:\n\n 2x +  y -  z =  8\n-3x -  y + 2z = -11\n-2x +  y + 2z = -3\n\nSolve it by Gaussian elimination on the augmented matrix, showing each row operation. Then explain how you would recognise, from the reduced matrix, a system with no solution and one with infinitely many, and what each would mean for a circuit.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Show the elimination to reduced form and the solution, then the two other cases.",
          parts: [
            part(
              "Elimination",
              "Augmented matrix [[2,1,-1|8],[-3,-1,2|-11],[-2,1,2|-3]]; R2 <- R2 + (3/2)R1 gives [0, 1/2, 1/2 | 1]; R3 <- R3 + R1 gives [0, 2, 1 | 5]; R3 <- R3 - 4 R2 gives [0, 0, -1 | 1]; back-substitute z = -1, y = 3, x = 2. Any equivalent sequence of legal row operations (swap, scale, add a multiple) is acceptable if it reaches the same solution.",
              "[ 2  1 -1 |  8 ]\n[-3 -1  2 | -11]\n[-2  1  2 | -3 ]\nR2 <- R2 + (3/2) R1: [0, 1/2, 1/2 | 1]. R3 <- R3 + R1: [0, 2, 1 | 5]. Now clear below the second pivot: R3 <- R3 - 4 R2: [0, 0, -1 | 1]. Row-echelon form:\n[2  1   -1  | 8]\n[0  1/2  1/2 | 1]\n[0  0   -1  | 1]\nBack-substitute: z = -1; (1/2) y + (1/2)(-1) = 1 so y = 3; 2x + 3 + 1 = 8 so x = 2. Reduced row-echelon form is the identity with the column (2, 3, -1)."
            ),
            part(
              "Check",
              "Substitutes into all three equations: 4 + 3 + 1 = 8; -6 - 3 - 2 = -11; -4 + 3 - 2 = -3. Notes the solution is unique because every column has a pivot (rank 3).",
              "Check: 2(2) + 3 - (-1) = 8; -3(2) - 3 + 2(-1) = -11; -2(2) + 3 + 2(-1) = -3. All three hold. Three pivots in three columns means rank 3 and exactly one solution -- the coefficient matrix is invertible."
            ),
            part(
              "No solution and infinitely many",
              "No solution: a row of the form [0 0 0 | c] with c != 0 (inconsistent, 0 = c); for a circuit, contradictory constraints -- a modelling error. Infinitely many: consistent but a column without a pivot (a free variable), so a family of solutions with one or more parameters; for a circuit, an underdetermined network -- a missing equation or a redundant one, e.g. a loop whose current is not fixed by the others. States the rank conditions (rank A < rank [A|b] vs rank A = rank [A|b] < number of unknowns).",
              "Inconsistent system: elimination produces a row [0 0 0 | c] with c nonzero -- the equation 0 = c -- so no (x, y, z) works; rank of the coefficient matrix is less than rank of the augmented matrix. In a circuit that means the equations contradict each other, which points at a modelling mistake (a sign error, a misapplied law). Infinitely many solutions: no contradictory row, but a column without a pivot, so one variable is free and the solution is a line or plane of values; rank equals the augmented rank but is less than 3. For a circuit, the network is underdetermined -- a loop or node equation is missing or one of the three is a combination of the others -- so the model needs another independent constraint before it predicts anything."
            ),
          ],
        },
      ],
    },
    // Numerical Methods ----------------------------------------------------
    {
      slug: "newton-method-with-error-analysis",
      objective: "Root-finding methods",
      kind: "build",
      title: "Run Newton's method and account for its error",
      brief:
        "A fictional numerical-methods assignment: find the real root of f(x) = x^3 - x - 2 to eight decimal places. Start Newton's method at x0 = 1.5 and show each iterate with the change from the previous one. Explain the order of convergence you observe, compare with how many bisection steps the interval [1, 2] would need for an error below 10^-6, and name two situations where Newton's method fails and what you would do.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the iterates, the convergence analysis, the bisection comparison and the failure modes.",
          parts: [
            part(
              "Iterates",
              "x_{n+1} = x_n - f(x_n)/f'(x_n) with f'(x) = 3x^2 - 1. x1 = 1.52173913 (change 0.0217), x2 = 1.52137981 (change 3.6e-4), x3 = 1.52137971 (change 9.9e-8), x4 = 1.52137971 (change ~7.5e-15). Root ~ 1.52137971 to eight places.",
              "x_{n+1} = x_n - (x_n^3 - x_n - 2) / (3 x_n^2 - 1).\nx0 = 1.5 (f = -0.125, f' = 5.75)\nx1 = 1.5217391304, change 2.2e-2\nx2 = 1.5213798060, change 3.6e-4\nx3 = 1.5213797068, change 9.9e-8\nx4 = 1.5213797068, change 7.5e-15\nThe root is 1.52137971 to eight decimal places after three iterations; the fourth only confirms it at machine precision."
            ),
            part(
              "Order of convergence and the stopping rule",
              "The changes go 2e-2, 4e-4, 1e-7, 1e-14: each step roughly squares the previous error (the number of correct digits about doubles) -- quadratic convergence, expected for a simple root where f'(root) != 0. Stopping rule: stop when |x_{n+1} - x_n| is below the tolerance (the change is a good estimate of the error for a quadratically convergent method) and/or |f(x_n)| is small; mentions floating-point limits (~1e-16 relative) cap the achievable accuracy.",
              "Changes: 2e-2, 4e-4, 1e-7, 1e-14 -- each is about the square of the one before, so the number of correct digits roughly doubles every step: quadratic convergence, which Newton's method gives near a simple root (f'(1.5214) ~ 5.9, well away from 0). For such a method the last change is a trustworthy estimate of the remaining error, so 'stop when |x_{n+1} - x_n| < tolerance' is sound; also check |f(x_n)| is small. Nothing gets better past about 1e-15 or 1e-16 because that is double-precision rounding, which is why x4's change is noise."
            ),
            part(
              "Bisection comparison",
              "f(1) = -2 < 0 and f(2) = 4 > 0 bracket the root; each bisection halves the interval, so error <= 1/2^k; for 1/2^k < 10^-6 need k >= 20 steps (log2(10^6) ~ 19.9). Linear convergence with a guaranteed bound versus Newton's three steps without a guarantee.",
              "f(1) = -2 and f(2) = 4 have opposite signs, so [1, 2] brackets the root. Each bisection halves the interval, so after k steps the error is at most 1/2^k; 1/2^k < 10^-6 needs k >= 20 (2^20 ~ 1.05 x 10^6). Twenty steps for six digits versus Newton's three for eight -- but bisection cannot fail once it has a bracket, and Newton can. The two are often combined: bisect until close, then switch to Newton."
            ),
            part(
              "Failure modes",
              "At least two: f'(x_n) = 0 or near zero (division blows up / huge step -- e.g. starting x^3 - x - 2 at x0 = 1/sqrt 3 ~ 0.577 where f' = 0); a poor starting point that cycles or diverges (oscillation between two values, or heading to the wrong root); multiple roots slow it to linear convergence; a function with no real root (x^2 + 1) wanders forever. Remedies: bracket first (bisection/safeguarded Newton), damping the step, a better initial guess from a sketch, or a derivative-free method (secant) when f' is unavailable.",
              "Flat spots: if f'(x_n) is zero or tiny the step is undefined or enormous -- starting this very f at x0 = 1/sqrt 3 ~ 0.577, where 3x^2 - 1 = 0, divides by zero. Bad starts: an iterate can jump across to another root's basin, or bounce back and forth forever; for x^2 + 1 = 0 there is no real root and the iterates wander. Multiple roots (f and f' both zero at the root) drop the convergence to linear. Remedies: sketch or sample f to choose a start near the root; bracket the root and fall back to bisection whenever a Newton step leaves the bracket (a safeguarded method); damp large steps; use the secant method when the derivative is unavailable."
            ),
          ],
        },
      ],
    },
    // Abstract Algebra -----------------------------------------------------
    {
      slug: "verify-z6-is-a-group",
      objective: "Groups and their properties",
      kind: "build",
      title: "Check the group axioms on Z6 and find its structure",
      brief:
        "A fictional abstract-algebra problem set. Consider the integers modulo 6, {0, 1, 2, 3, 4, 5}. (1) Verify that this set under addition mod 6 is a group, checking each axiom. (2) Find the order of every element and list the generators. (3) List all subgroups. (4) Show that the same set under multiplication mod 6 is not a group, and identify the largest subset that is a group under multiplication mod 6.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Work the four parts with explicit checks.",
          parts: [
            part(
              "Group axioms for (Z6, +)",
              "Closure: (a + b) mod 6 is always in {0..5}. Associativity: inherited from integer addition (a + b) + c = a + (b + c), and reducing mod 6 respects it. Identity: 0, since a + 0 = a. Inverses: 0-0, 1-5, 2-4, 3-3 (each pair sums to 6 = 0). Also abelian (commutative), though not required for a group.",
              "Closure: the sum of two residues reduced mod 6 is again a residue 0-5. Associativity: integer addition is associative and reduction mod 6 is compatible with it, so (a + b) + c = a + (b + c) mod 6 (checking all 216 triples confirms it). Identity: 0. Inverses: 0 <-> 0, 1 <-> 5, 2 <-> 4, 3 <-> 3, since each pair sums to 6 = 0 mod 6. It is also commutative, so it is an abelian group of order 6."
            ),
            part(
              "Orders and generators",
              "Order of a = smallest k >= 1 with k a = 0 mod 6: ord(0) = 1, ord(1) = 6, ord(2) = 3, ord(3) = 2, ord(4) = 3, ord(5) = 6. Generators are the elements of order 6: 1 and 5 -- those coprime to 6; the group is cyclic.",
              "The order of a is the least k with k a = 0 (mod 6): 0 has order 1; 1 has order 6 (1, 2, 3, 4, 5, 0); 2 has order 3 (2, 4, 0); 3 has order 2 (3, 0); 4 has order 3 (4, 2, 0); 5 has order 6. Generators are the order-6 elements, 1 and 5 -- exactly the residues coprime to 6 -- so Z6 is cyclic, and every element's order divides 6 as Lagrange's theorem requires."
            ),
            part(
              "Subgroups",
              "By Lagrange, orders divide 6: {0} (order 1), {0, 3} (order 2), {0, 2, 4} (order 3), Z6 itself (order 6); each is cyclic, generated by 3, 2 (or 4), and 1 (or 5). Notes a cyclic group has exactly one subgroup per divisor of its order.",
              "A subgroup's order divides 6, so the candidates are orders 1, 2, 3, 6, and a cyclic group has exactly one subgroup of each divisor order: {0}; {0, 3} = <3>; {0, 2, 4} = <2> = <4>; and Z6 = <1> = <5>. Four subgroups, all cyclic."
            ),
            part(
              "Multiplication mod 6",
              "Not a group: 0 has no inverse (nothing times 0 gives 1); also 2, 3, 4 have no inverses (2 * b mod 6 is never 1). Removing 0 does not help because 2 * 3 = 0 leaves the set and 2, 3, 4 still lack inverses. The largest subset that is a group under multiplication mod 6 is the units {1, 5}: 1 * 1 = 1, 5 * 5 = 25 = 1, 1 * 5 = 5 -- closed, identity 1, each self-inverse; a group of order 2 (isomorphic to Z2). Mentions that the units mod n are the residues coprime to n.",
              "Under multiplication mod 6 the identity would be 1, but 0 has no inverse (0 * b = 0 always), so the full set fails. Dropping 0 does not rescue it: 2 * 3 = 0 escapes the set, and 2, 3, 4 have no inverse (2 * b mod 6 runs through 0, 2, 4 only). The elements that do have inverses are 1 and 5 -- the residues coprime to 6 -- and {1, 5} is a group: 1 * 1 = 1, 5 * 5 = 25 = 1 mod 6, 1 * 5 = 5; closed, identity 1, each element its own inverse. It has order 2, isomorphic to Z2. In general the invertible residues mod n form the group of units, of size phi(n)."
            ),
          ],
        },
      ],
    },
    // Multivariable Calculus -----------------------------------------------
    {
      slug: "classify-critical-points-two-variables",
      objective: "Optimization in several variables",
      kind: "build",
      title: "Find and classify the critical points of a surface",
      brief:
        "A fictional multivariable exam: f(x, y) = x^3 - 3x + y^2. Find all critical points, classify each with the second-derivative test, give the function value at each, and explain whether f has a global minimum or maximum on all of R^2. Then say how the picture changes if the domain is restricted to the closed disk x^2 + y^2 <= 4 (what extra work is needed, not the full computation).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Find, classify, discuss global extrema, and outline the closed-domain procedure.",
          parts: [
            part(
              "Critical points",
              "f_x = 3x^2 - 3 = 0 gives x = +/-1; f_y = 2y = 0 gives y = 0. Critical points (1, 0) and (-1, 0).",
              "f_x = 3x^2 - 3 and f_y = 2y. Setting both to zero: x^2 = 1 so x = 1 or x = -1, and y = 0. Two critical points: (1, 0) and (-1, 0)."
            ),
            part(
              "Classification",
              "f_xx = 6x, f_yy = 2, f_xy = 0, so D = f_xx f_yy - f_xy^2 = 12x. At (1, 0): D = 12 > 0 and f_xx = 6 > 0 -> local minimum, f = 1 - 3 + 0 = -2. At (-1, 0): D = -12 < 0 -> saddle point, f = -1 + 3 = 2.",
              "Second partials: f_xx = 6x, f_yy = 2, f_xy = 0, so the discriminant D = f_xx f_yy - (f_xy)^2 = 12x. At (1, 0): D = 12 > 0 with f_xx = 6 > 0 -- a local minimum, value f(1, 0) = 1 - 3 = -2. At (-1, 0): D = -12 < 0 -- a saddle point, value f(-1, 0) = -1 + 3 = 2 (a maximum along the x-direction, a minimum along y)."
            ),
            part(
              "Global behaviour on R^2",
              "No global extrema: along the x-axis f(x, 0) = x^3 - 3x -> +infinity as x -> +infinity and -> -infinity as x -> -infinity, so f is unbounded above and below; the local minimum at (1, 0) is not global.",
              "None. On the x-axis f(x, 0) = x^3 - 3x, which goes to +infinity as x -> +infinity and to -infinity as x -> -infinity, so f is unbounded in both directions. The point (1, 0) is only a local minimum -- f takes values far below -2 for large negative x -- and there is no maximum anywhere."
            ),
            part(
              "On the closed disk",
              "By the extreme value theorem a continuous f on a closed bounded set attains a max and a min; candidates are interior critical points -- (1, 0) and (-1, 0), both inside since 1 < 4 -- plus extrema on the boundary x^2 + y^2 = 4, found by parametrising (x = 2 cos t, y = 2 sin t) or Lagrange multipliers (grad f = lambda grad g with g = x^2 + y^2 - 4); compare all candidate values and pick the largest and smallest. The saddle becomes a legitimate candidate on a closed domain.",
              "Now the extreme value theorem guarantees a global maximum and minimum, because the disk is closed and bounded and f is continuous. The procedure: (1) interior critical points -- both (1, 0) and (-1, 0) lie inside, so f = -2 and f = 2 are candidates (the saddle counts as a candidate here; the test only says it is not a local extremum in the open plane); (2) the boundary circle x^2 + y^2 = 4, handled either by substituting x = 2 cos t, y = 2 sin t and optimising the one-variable function of t, or by Lagrange multipliers: solve grad f = lambda grad g with g = x^2 + y^2 - 4 alongside g = 0; (3) evaluate f at every candidate and take the largest and smallest. The answer lives at whichever candidate wins -- on a closed domain the boundary is as important as the critical points."
            ),
          ],
        },
      ],
    },
    // Differential Equations -----------------------------------------------
    {
      slug: "newtons-law-of-cooling-ivp",
      objective: "First-order differential equations",
      kind: "build",
      title: "Solve a cooling problem from data",
      brief:
        "A fictional food-safety exercise. A pot of soup at 90 C is left in a kitchen held at 20 C. After 10 minutes it reads 70 C. Model the temperature with Newton's law of cooling, dT/dt = -k (T - 20), with T(0) = 90. Solve the initial value problem, find k from the 10-minute reading, and find how long it takes the soup to reach 40 C. Then classify the equation and name a second method that would solve it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Solve the IVP, determine k, answer the time question, and classify the equation.",
          parts: [
            part(
              "General solution and the initial condition",
              "Separate: dT/(T - 20) = -k dt; integrate: ln|T - 20| = -kt + C; T = 20 + A e^{-kt}; T(0) = 90 gives A = 70, so T(t) = 20 + 70 e^{-kt}.",
              "Separable: dT/(T - 20) = -k dt. Integrating, ln|T - 20| = -k t + C, so T - 20 = A e^{-kt} with A = +/- e^C. T(0) = 90 gives A = 70: T(t) = 20 + 70 e^{-kt}. The soup decays exponentially toward the room temperature 20 C, never below it."
            ),
            part(
              "Find k",
              "T(10) = 70: 20 + 70 e^{-10k} = 70 -> e^{-10k} = 50/70 = 5/7 -> k = (1/10) ln(7/5) ~ 0.0336 per minute.",
              "20 + 70 e^{-10k} = 70, so e^{-10k} = 50/70 = 5/7, hence -10k = ln(5/7) and k = (1/10) ln(7/5) ~ 0.03365 per minute. (Units: k is a rate per minute because t is in minutes.)"
            ),
            part(
              "Time to reach 40 C",
              "20 + 70 e^{-kt} = 40 -> e^{-kt} = 20/70 = 2/7 -> t = ln(7/2)/k = 10 ln(7/2)/ln(7/5) ~ 37.2 minutes.",
              "Set 20 + 70 e^{-kt} = 40: e^{-kt} = 2/7, so t = ln(7/2)/k = 10 ln(3.5)/ln(1.4) ~ 37.2 minutes. It took 10 minutes to lose the first 20 degrees and about 27 more to lose the next 30 -- the exponential slows as the gap to room temperature narrows."
            ),
            part(
              "Classification and another method",
              "First-order, linear (dT/dt + kT = 20k), autonomous, separable ODE with a stable equilibrium at T = 20. Second method: integrating factor e^{kt} -- d/dt (e^{kt} T) = 20k e^{kt}, integrate to the same solution; or a numerical method (Euler) if k varied with T.",
              "It is first-order, linear with constant coefficients (rewrite as dT/dt + k T = 20k), autonomous, and separable; T = 20 is an equilibrium, and it is stable because solutions approach it. Integrating factor is the other standard route: multiply by e^{kt} to get d/dt(e^{kt} T) = 20k e^{kt}, integrate to e^{kt} T = 20 e^{kt} + A, so T = 20 + A e^{-kt} -- the same answer. If k depended on T (a nonlinear cooling law), there would be no closed form and Euler's or Runge-Kutta's method would step it numerically."
            ),
          ],
        },
      ],
    },
    // Probability ----------------------------------------------------------
    {
      slug: "expected-value-of-a-dice-game",
      objective: "Expected value and discrete probability distributions",
      kind: "build",
      title: "Price a dice game and a quality check",
      brief:
        "A fictional carnival game: pay $3, roll two fair dice, win $10 if the sum is 7 or 11, nothing otherwise. (1) Give the probability distribution of the sum relevant to this game, the probability of winning, and the expected net gain per play; say who the game favours and by how much over 100 plays. (2) A fictional factory samples 10 items from a line where each item is independently defective with probability 0.2; let X be the number of defectives. Name X's distribution, give E[X] and Var(X), and compute P(X >= 3).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Work both problems with the distributions named.",
          parts: [
            part(
              "Dice game: probabilities",
              "36 equally likely outcomes; P(sum = 7) = 6/36, P(sum = 11) = 2/36, so P(win) = 8/36 = 2/9 ~ 0.222. (Optionally the full sum distribution 1/36, 2/36, ..., 6/36, ..., 1/36 for sums 2-12.)",
              "Two fair dice give 36 equally likely ordered outcomes. Sum 7 arises 6 ways (1+6, 2+5, 3+4, 4+3, 5+2, 6+1) and sum 11 two ways (5+6, 6+5), so P(win) = 8/36 = 2/9 ~ 0.222. The full distribution of the sum is triangular: 1/36 for 2 and 12, rising to 6/36 at 7."
            ),
            part(
              "Dice game: expected value",
              "Net gain G = 10 - 3 = 7 with probability 2/9, and -3 with probability 7/9: E[G] = 7(2/9) - 3(7/9) = (14 - 21)/9 = -7/9 ~ -$0.78 per play. The house is favoured; over 100 plays the player expects to lose about $78. Mentions that the expectation is a long-run average, not a prediction for one play.",
              "Net gain per play: +7 with probability 2/9 (win 10, paid 3) and -3 with probability 7/9. E[G] = 7 * 2/9 + (-3) * 7/9 = (14 - 21)/9 = -7/9 ~ -$0.78. The game favours the operator by 78 cents a play; over 100 plays the player's expected loss is about $78. Expectation is a long-run average -- any single evening can beat it, which is the whole business model."
            ),
            part(
              "Binomial quality check",
              "X ~ Binomial(n = 10, p = 0.2): fixed number of independent trials, two outcomes, constant p. E[X] = np = 2; Var(X) = np(1 - p) = 1.6 (sd ~ 1.26). P(X >= 3) = 1 - [P(0) + P(1) + P(2)] = 1 - [0.8^10 + 10(0.2)(0.8^9) + 45(0.2^2)(0.8^8)] ~ 1 - [0.1074 + 0.2684 + 0.3020] = 0.322.",
              "X counts successes (defectives) in 10 independent trials with the same p = 0.2, so X ~ Binomial(10, 0.2). E[X] = np = 2 and Var(X) = np(1 - p) = 1.6, standard deviation about 1.26. P(X >= 3) = 1 - P(X <= 2) = 1 - [C(10,0) 0.8^10 + C(10,1) 0.2 * 0.8^9 + C(10,2) 0.2^2 * 0.8^8] = 1 - [0.1074 + 0.2684 + 0.3020] = 1 - 0.6778 = 0.322. About a one-in-three chance of seeing three or more defectives even when the line is running at its usual 20% -- which is what a control chart has to allow for."
            ),
          ],
        },
      ],
    },
    // Mathematical Modeling and Simulation ---------------------------------
    {
      slug: "formulate-a-logistic-population-model",
      objective: "Formulating mathematical models from real-world scenarios",
      kind: "build",
      title: "Build a population model from a description and check it",
      brief:
        "A fictional wildlife agency reintroduces 50 elk to a valley that biologists estimate can sustain about 1,000. Early counts suggest the herd grows by roughly 50% a year when it is small. The agency wants a model that predicts the herd over time, a prediction for year 5, the year the herd reaches half capacity, and an honest list of what the model assumes. Formulate the model, solve or simulate it, and critique it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose and justify the model, give the predictions, and critique the assumptions.",
          parts: [
            part(
              "Model choice and formulation",
              "Rejects pure exponential growth (ignores the 1,000 limit) and picks the logistic equation dP/dt = r P (1 - P/K) with P(0) = 50, K = 1000, r ~ 0.5 per year; explains each term: r P is the small-population growth, (1 - P/K) throttles growth toward zero as P nears K.",
              "Exponential growth, P' = rP, fits the early 50% a year but ignores the ceiling and predicts elk without end. The logistic model keeps the early behaviour and adds the limit: dP/dt = r P (1 - P/K), with r = 0.5 per year (the low-density growth rate), K = 1,000 (carrying capacity) and P(0) = 50. When P is small the bracket is near 1 and growth is almost exponential; as P approaches K the bracket goes to 0 and growth stops; above K it turns negative."
            ),
            part(
              "Predictions",
              "Analytic solution P(t) = K / (1 + ((K - P0)/P0) e^{-rt}) = 1000 / (1 + 19 e^{-0.5t}). P(5) = 1000/(1 + 19 e^{-2.5}) ~ 391 elk. Half capacity when 19 e^{-rt} = 1: t = ln(19)/0.5 ~ 5.9 years. Accepts a numerical simulation (Euler/RK) with the caveat that Euler with a 1-year step gives ~308 at year 5, noticeably below the exact value, so step size matters.",
              "Solving the logistic equation gives P(t) = 1000 / (1 + 19 e^{-0.5 t}), where 19 = (K - P0)/P0. Year 5: P(5) = 1000 / (1 + 19 e^{-2.5}) ~ 391 elk. Half capacity (500) when 19 e^{-0.5t} = 1, i.e. t = 2 ln 19 ~ 5.9 years -- also the inflection point where growth is fastest. If you simulate instead, Euler's method with a one-year step gives about 308 at year 5, well below the exact 391, because a big step keeps using an old, smaller growth rate; a smaller step (or Runge-Kutta) is needed before trusting the number."
            ),
            part(
              "Assumptions and critique",
              "Lists at least four: constant r and K (no drought years, no habitat change); no immigration/emigration, hunting or predation unless added; continuous growth (no seasonal calving pulse); the 50% and 1,000 figures are estimates with uncertainty; population is well mixed with no age structure or sex ratio effects; no Allee effect at low numbers. Suggests how to test the model (compare with annual counts, fit r and K, sensitivity analysis) and when to switch models (harvest term, age-structured or stochastic model).",
              "The model assumes r and K never change -- no drought, hard winter or habitat loss; that nothing enters or leaves -- no hunting, predation, migration or disease, each of which is a term that could be added (a harvest -h, for instance); that growth is continuous rather than a spring calving pulse; that all animals are alike -- no age structure, sex ratio or the small-herd difficulties (Allee effects) that can sink a reintroduction; and that 50% and 1,000 are facts when they are estimates with wide error bars. Test it against the yearly counts, refit r and K as data arrive, and run a sensitivity analysis: if year-5 predictions swing from 300 to 500 across plausible r, say so. When the agency starts asking about harvest quotas or survival by age, this model has done its job and an age-structured or stochastic one takes over."
            ),
          ],
        },
      ],
    },
    // Regression and Forecasting -------------------------------------------
    {
      slug: "fit-and-interpret-a-regression-line",
      objective: "Simple and multiple linear regression",
      kind: "build",
      title: "Fit a line, interpret it, and check its residuals",
      brief:
        "A fictional study-skills centre records hours studied and exam score for six students: (1, 52), (2, 58), (3, 61), (4, 70), (5, 74), (6, 79). Fit the least-squares line, interpret the slope and intercept in context, report and interpret R^2, give the residuals, predict the score for 8 hours of study and say how much to trust it. Then explain what would change if a second predictor (hours of sleep) were added, and name one assumption of the model you would check.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Fit, interpret, check residuals, predict, and extend to a second predictor.",
          parts: [
            part(
              "Fitted line",
              "Slope b1 = S_xy / S_xx: x-bar = 3.5, y-bar = 65.67; S_xx = 17.5, S_xy = 96 -> b1 = 5.486; b0 = y-bar - b1 x-bar = 46.47. Line: score = 46.47 + 5.49 * hours.",
              "x-bar = 3.5, y-bar = 394/6 = 65.67. S_xx = sum (x - x-bar)^2 = 17.5; S_xy = sum (x - x-bar)(y - y-bar) = 96. Slope b1 = 96/17.5 = 5.486; intercept b0 = 65.67 - 5.486 * 3.5 = 46.47. Fitted line: predicted score = 46.47 + 5.49 * hours."
            ),
            part(
              "Interpretation and R^2",
              "Slope: each additional hour of study is associated with about 5.5 more points, on average, within the 1-6 hour range; intercept: the predicted score at zero hours, 46.5 -- an extrapolation to be read cautiously. r = 0.994, R^2 = 0.987: about 98.7% of the variation in scores across these six students is accounted for by hours studied. Notes association, not causation, and a tiny sample.",
              "Slope 5.49: among these students, each extra hour of study goes with about five and a half more points on average, for study times between 1 and 6 hours. Intercept 46.5: the line's value at zero hours -- plausible as 'a student who did not study', but it is outside the observed range, so treat it as a geometric anchor, not a measured fact. R^2 = 0.987 (r = 0.994): hours studied account for about 99% of the variation in score in this sample. That is association in six students, not a cause -- the students who studied longer may also differ in other ways."
            ),
            part(
              "Residuals and the prediction",
              "Residuals (observed - fitted): 0.05, 0.56, -1.92, 1.59, 0.10, -0.38 -- small, no obvious pattern, sum to zero. Prediction at 8 hours: 46.47 + 5.49 * 8 = 90.4 -- but 8 is outside the 1-6 range, so this is extrapolation; the linear relationship may not hold (scores cap at 100), and the interval would be wide.",
              "Fitted values 51.95, 57.44, 62.92, 68.41, 73.90, 79.38 give residuals 0.05, 0.56, -1.92, 1.59, 0.10, -0.38: small, sign-alternating, summing to zero, no curve or fan visible -- as far as six points can show. At 8 hours the line says 46.47 + 5.49 * 8 = 90.4. Trust it loosely: 8 hours is beyond the data, scores cannot exceed 100 so the line must bend eventually, and with n = 6 the prediction interval is wide. Report it as 'roughly 90, if the pattern continues'."
            ),
            part(
              "Adding sleep, and an assumption to check",
              "Multiple regression score = b0 + b1 hours + b2 sleep: each coefficient becomes a partial effect holding the other predictor fixed; the hours coefficient may change if sleep and study hours are correlated (confounding/collinearity); R^2 cannot decrease, so adjusted R^2 is the fair comparison; with n = 6 and two predictors the model is badly underpowered. Assumption to check: linearity and constant variance of residuals (residual plot), independence, normality of residuals (for intervals), no influential points.",
              "With two predictors the model is score = b0 + b1 hours + b2 sleep, and b1 now means 'the change per study hour holding sleep fixed' -- it can move a lot from 5.49 if students who study more also sleep less, because the simple slope was absorbing sleep's effect. R^2 goes up automatically when a predictor is added, so compare adjusted R^2 instead; and six observations for three coefficients leaves three residual degrees of freedom, which is not a study, it is a sketch. Before any of that, plot residuals against fitted values to check linearity and constant spread, check the points are independent (six different students, not one student six times), and look for a single point steering the line."
            ),
          ],
        },
      ],
    },
    // Computational Mathematics Capstone -----------------------------------
    {
      slug: "plan-a-capstone-write-up",
      objective: "Written and oral presentation of results",
      kind: "build",
      title: "Plan the write-up and talk for a capstone project",
      brief:
        "A fictional capstone student has spent a semester building a Monte Carlo simulation of queue waiting times at a campus clinic, comparing two staffing schedules. The code works and a notebook holds 40 plots. The report is due in two weeks and a 15-minute talk with questions the week after. Plan the written report's structure with what each section must contain, choose which results to show and how, and plan the talk including how to handle a hard question you cannot answer.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the report structure, the results plan, and the talk plan.",
          parts: [
            part(
              "Report structure",
              "Abstract (question, method, headline result, one number); Introduction (the problem, why it matters, the precise question); Background/Methods (queue model and assumptions, the two schedules, simulation design: random number generation, number of replications, warm-up, how variance was estimated); Results (the comparison with uncertainty); Discussion (what it means, limitations, validation against real data if any); Conclusion and future work; References; Appendix (code availability, parameter tables, extra plots). Insists on reproducibility details (seeds, versions).",
              "Abstract: the question, the method in one line, the headline result with a number and its uncertainty. Introduction: the clinic's problem, why waiting time matters, the exact question -- which of two schedules gives shorter waits, by how much, with what confidence. Methods: the queueing model and every assumption (arrival process, service-time distribution, how no-shows are handled), the two schedules precisely, and the simulation design -- random-number seeds, number of replications, warm-up period discarded, how confidence intervals were computed. Results: the comparison, with uncertainty, in a few figures. Discussion: what the result means for the clinic, what would change it, what the model leaves out, and any check against real waiting-time data. Conclusion and future work. References. Appendix: parameter tables, the code repository, and the other 35 plots nobody needs in the body."
            ),
            part(
              "Which results, and how",
              "From 40 plots choose 3-5 that answer the question: a distribution (histogram or box plot) of waiting time under each schedule; a plot of mean wait with confidence intervals as replications grow (convergence); a sensitivity plot (wait vs arrival rate) for each schedule; one table of the key statistics (mean, median, 90th percentile, P(wait > 30 min)) with intervals. Each figure has a caption that states the takeaway, labelled axes with units, and the same scale for the two schedules. Reports uncertainty everywhere and avoids 'schedule B is better' without the interval.",
              "Pick the plots that answer the question and cut the rest. (1) Side-by-side distributions of waiting time for the two schedules -- box plots or overlaid histograms -- on the same axis, in minutes. (2) Mean waiting time against number of replications with its confidence band, to show the estimate has settled. (3) Sensitivity: mean and 90th-percentile wait against arrival rate for both schedules, because the clinic will ask 'what if we get busier?'. (4) One table: mean, median, 90th percentile and the share waiting over 30 minutes, each with a 95% interval, for both schedules. Every figure carries a caption that states what to see ('Schedule B cuts the 90th-percentile wait from 41 to 28 minutes'), labelled axes with units, and identical scales so the eye compares fairly. Never a bare 'B is better' -- always the interval beside the difference."
            ),
            part(
              "The talk and the hard question",
              "15 minutes = about 10-12 slides: one-slide problem, one-slide answer up front, methods in two, results in three or four, limitations one, conclusion one; rehearse to time twice; speak to the question not the code; put code and parameter tables in backup slides. For a question you cannot answer: acknowledge it honestly, say what you do know and what would be needed to answer it, offer to follow up, do not bluff; prepare likely hard questions in advance (validation, assumption sensitivity, why Monte Carlo rather than queueing formulas).",
              "Fifteen minutes is ten to twelve slides: the problem in one, the answer in the next (give it away early -- the audience should know the result before the method), two on the model and simulation design, three or four on results using the same figures as the report, one on limitations, one to close. Rehearse with a timer twice and cut until it fits with a minute spare. Keep code and parameter tables as backup slides for questions. Prepare for the questions a committee asks: how did you validate against real data, how sensitive is the result to the service-time distribution, why simulate rather than use queueing formulas. When a question lands that you cannot answer: say so plainly -- 'I don't know; I didn't test that' -- then say what you do know that bears on it, what experiment would answer it, and that you will follow up. A committee forgives a gap; it does not forgive a bluff."
            ),
          ],
        },
      ],
    },
    // Introduction to Information Systems ----------------------------------
    {
      slug: "weighted-decision-matrix-for-a-system",
      objective: "Evaluating and choosing business technology solutions",
      kind: "build",
      title: "Choose a scheduling system with a weighted decision matrix",
      brief:
        "A fictional veterinary practice with three clinics must choose an appointment-scheduling system. Three candidates were scored 1-5 by the evaluation team on four criteria: Alpha -- cost 4, fit to workflow 3, vendor support 5, security 4; Beta -- cost 2, fit 5, support 3, security 5; Gamma -- cost 5, fit 2, support 4, security 2. The owners weight the criteria: cost 30%, fit 40%, support 20%, security 10%. Compute the weighted scores, recommend a system, test how robust the recommendation is to the weights, and say what the matrix leaves out that the owners should still check before signing.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Compute the scores, recommend, test the sensitivity, and name what the matrix misses.",
          parts: [
            part(
              "Weighted scores",
              "Alpha: 0.3*4 + 0.4*3 + 0.2*5 + 0.1*4 = 1.2 + 1.2 + 1.0 + 0.4 = 3.8. Beta: 0.6 + 2.0 + 0.6 + 0.5 = 3.7. Gamma: 1.5 + 0.8 + 0.8 + 0.2 = 3.3. Alpha leads narrowly.",
              "Alpha: 0.3(4) + 0.4(3) + 0.2(5) + 0.1(4) = 1.2 + 1.2 + 1.0 + 0.4 = 3.80. Beta: 0.3(2) + 0.4(5) + 0.2(3) + 0.1(5) = 0.6 + 2.0 + 0.6 + 0.5 = 3.70. Gamma: 0.3(5) + 0.4(2) + 0.2(4) + 0.1(2) = 1.5 + 0.8 + 0.8 + 0.2 = 3.30. Alpha first by a tenth of a point, Gamma clearly last."
            ),
            part(
              "Recommendation and sensitivity",
              "Recommends Alpha on the stated weights but flags the 0.1 margin as inside the noise of 1-5 judgements; shows the sensitivity: if fit rises to 50% and cost falls to 20%, Beta (0.4 + 2.5 + 0.6 + 0.5 = 4.0) beats Alpha (0.8 + 1.5 + 1.0 + 0.4 = 3.7); Gamma never wins under reasonable weights. Suggests resolving by re-scoring fit with a hands-on trial or asking the owners whether fit really outweighs cost.",
              "On the owners' weights Alpha wins, but 3.8 to 3.7 is a coin toss when the inputs are whole-number judgements. Shift ten points of weight from cost to fit (cost 20%, fit 50%) and Beta scores 0.4 + 2.5 + 0.6 + 0.5 = 4.0 against Alpha's 0.8 + 1.5 + 1.0 + 0.4 = 3.7 -- the ranking flips. Gamma is last under any plausible weighting because it is weak on the heaviest criterion. So the real decision is between Alpha and Beta, and it hinges on how much workflow fit matters relative to price: put both in front of the front-desk staff for a scripted half-day trial and re-score fit before deciding."
            ),
            part(
              "What the matrix leaves out",
              "Total cost of ownership over the contract (migration, training, per-clinic fees, exit costs), not a 1-5 'cost'; references and vendor viability; data ownership and export on exit; integration with the practice-management/billing system; compliance and uptime commitments in the contract; implementation timeline and who does the work; and the risk that scorers were anchored by a demo. Recommends a pilot or reference checks before signing.",
              "A score of 4 for cost hides the number that matters: total cost over the contract -- licences per clinic, migration of three years of appointments, training time, and what it costs to leave. The matrix also says nothing about whether the vendor will exist in five years (check references and financials), whether the practice owns its data and can export it on exit, whether the system integrates with billing and the patient-record system, what uptime and support response the contract actually promises, and who does the implementation work and when. Finally, 1-5 scores given after a polished demo are anchored; a pilot with real staff and a written exit clause are the checks that protect the owners."
            ),
          ],
        },
      ],
    },
    // Programming in C++ I -------------------------------------------------
    {
      slug: "pass-by-value-swap-bug",
      objective: "Writing and using functions",
      kind: "build",
      title: "Fix two functions that return the wrong thing",
      brief:
        "A fictional student submission for a first C++ course:\n\n#include <iostream>\nvoid swapValues(int a, int b) {\n    int temp = a;\n    a = b;\n    b = temp;\n}\ndouble average(int total, int count) {\n    return total / count;\n}\nint main() {\n    int x = 3, y = 9;\n    swapValues(x, y);\n    std::cout << x << \" \" << y << \"\\n\";\n    std::cout << average(7, 2) << \"\\n\";\n    return 0;\n}\n\nIt compiles with -Wall -Wextra and no warnings, and prints '3 9' and '3'. The student expected '9 3' and '3.5'. Explain both results, fix both functions, and state the rule for choosing a parameter-passing style.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the two outputs, give the fixes, and state the rule.",
          parts: [
            part(
              "Why swapValues does nothing",
              "Parameters are passed by value: a and b are copies of x and y, the swap rearranges the copies, and they are destroyed when the function returns; x and y are untouched, so '3 9'. Fix: pass by reference (int& a, int& b) so the parameters alias the caller's variables; output '9 3'. (Pointers, int*, also work but are the C way.)",
              "C++ passes arguments by value unless told otherwise: a and b are brand-new ints holding copies of 3 and 9. The function swaps the copies and then they go out of scope; x and y never changed, hence '3 9'. Fix: make the parameters references -- void swapValues(int& a, int& b) -- so a and b are other names for x and y and the swap happens to the originals. Output becomes '9 3'. (std::swap(x, y) does exactly this.)"
            ),
            part(
              "Why average returns 3",
              "total / count is integer division because both operands are int, giving 3 before the result is converted to double on return; the double return type does not change the arithmetic. Fix: convert one operand first -- static_cast<double>(total) / count -- giving 3.5. Notes the compiler cannot warn because the code is well-formed.",
              "7 / 2 with two int operands is integer division: 3, remainder thrown away. Only then is the 3 converted to the double 3.0 for the return -- the return type cannot reach back into the expression. Fix: make one operand a double before dividing, static_cast<double>(total) / count, which yields 3.5. No warning is possible because every step is legal C++; the bug is in the meaning, not the grammar."
            ),
            part(
              "The parameter-passing rule",
              "By value for small types the function only reads (int, double, char); by reference (T&) when the function must modify the caller's variable; by const reference (const T&) for large objects (std::string, std::vector) the function only reads, to avoid copying; return values for results, not out-parameters, when there is one result. Mentions that references cannot be null and must be bound to an lvalue.",
              "Pass small, cheap types the function only reads by value (int, double, char, bool). Pass by reference, T&, when the function must change the caller's variable -- swap, or a function that fills in a result. Pass large objects the function only reads by const reference, const std::string& or const std::vector<int>&, so nothing is copied and nothing can be changed. Prefer returning a value to an out-parameter when there is one result (double average(...) is right as written). A reference must refer to an existing variable and cannot be null, which is why it is the default over a pointer in C++."
            ),
          ],
        },
      ],
    },
    // Programming in C++ II ------------------------------------------------
    {
      slug: "recursion-missing-base-case",
      objective: "Recursive programming",
      kind: "build",
      title: "Find the missing base case and bound the stack",
      brief:
        "A fictional student function is meant to return the sum of a number's digits, so digitSum(493) is 16:\n\nint digitSum(int n) {\n    return n % 10 + digitSum(n / 10);\n}\n\nCompiled at -O0 and run, digitSum(493) crashes with a segmentation fault. Explain why, trace the fixed function on 493, state what inputs it should handle (negatives, zero), and explain why a different recursive function that works for n = 1,000 might still crash for n = 10,000,000 even though it has a correct base case.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Diagnose, fix and trace, define the edge cases, and explain the stack limit.",
          parts: [
            part(
              "Why it crashes",
              "No base case: digitSum(493) calls digitSum(49), then (4), then (0), then digitSum(0) calls digitSum(0) forever (0 / 10 is 0); each call pushes a frame, the stack overflows, and the OS kills the process -- a segmentation fault (stack overflow). Notes the recursive case alone never stops.",
              "There is nothing to stop it. 493 -> 49 -> 4 -> 0, and then digitSum(0) computes 0 % 10 + digitSum(0 / 10) = digitSum(0) again, forever. Every call adds a stack frame; the stack is finite (8 MB by default on this Linux system), so after some hundreds of thousands of frames the program touches memory it does not own and dies with a segmentation fault -- a stack overflow. A recursion is a recursive case plus a base case that is reached; this one has only the first half."
            ),
            part(
              "Fixed function and trace",
              "Adds a base case for single-digit n (if n < 10 return n) and handles negatives (if n < 0 n = -n); trace: digitSum(493) = 3 + digitSum(49) = 3 + (9 + digitSum(4)) = 3 + (9 + 4) = 16. Also gives digitSum(7) = 7, digitSum(0) = 0, digitSum(-205) = 7.",
              "int digitSum(int n) {\n    if (n < 0) n = -n;                  // digits of a negative are the digits of its magnitude\n    if (n < 10) return n;               // base case: one digit left\n    return n % 10 + digitSum(n / 10);   // recursive case: last digit + the rest\n}\nTrace: digitSum(493) = 3 + digitSum(49); digitSum(49) = 9 + digitSum(4); digitSum(4) = 4 (base case). Unwinding: 4, then 13, then 16. Checks: digitSum(7) = 7, digitSum(0) = 0, digitSum(-205) = 7 -- all as run."
            ),
            part(
              "Edge cases to specify",
              "Zero returns 0 (base case covers it); negatives: decide and document (sum the magnitude's digits, or reject) -- the fix above takes the magnitude; INT_MIN cannot be negated safely (overflow), so either exclude it or use a wider type; non-numeric input is not possible for an int parameter.",
              "Zero: covered by the base case, returns 0. Negatives: a choice to write down -- the version above sums the digits of the magnitude, so -205 gives 7; rejecting negatives is also defensible, but silently returning garbage is not. The one trap: -INT_MIN overflows a 32-bit int, so either document that INT_MIN is excluded or do the arithmetic in a long long. There is no 'non-numeric' case because the parameter is an int; validation of text happens before this function is called."
            ),
            part(
              "Why a correct recursion can still crash at 10,000,000",
              "Recursion depth equals the number of nested calls; a function like countDown(n) that recurses n times uses n stack frames, so depth 1,000 is fine but 10,000,000 frames exceed the default stack (8 MB here -- 100,000 frames ran fine; millions would not); digitSum is safe because its depth is the number of digits (~10), i.e. logarithmic in n. Remedies: convert to a loop, use tail recursion only where the compiler is known to optimise it (not guaranteed in C++), or raise the stack limit.",
              "Depth, not correctness, is what the stack limits. A function such as countDown(n) that calls itself n times needs n frames on the stack at once: 1,000 frames is nothing, 100,000 ran fine on this machine, but 10,000,000 frames at tens of bytes each blows past an 8 MB stack and segfaults with a perfectly correct base case. digitSum is safe at any int because its depth is the number of digits -- at most 10 -- so it grows with log n. When depth grows linearly with the input, rewrite it as a loop; C++ does not promise to optimise tail calls, so do not rely on that; raising the stack limit is a last resort."
            ),
          ],
        },
      ],
    },
    // Data Structures and Algorithms ---------------------------------------
    {
      slug: "fix-an-int-stack-adt",
      objective: "Implementing abstract data types with C++ classes",
      kind: "build",
      title: "Make a stack class safe",
      brief:
        "A fictional student submission of a fixed-capacity integer stack:\n\nclass IntStack {\npublic:\n    IntStack(int capacity) { data = new int[capacity]; cap = capacity; top = 0; }\n    void push(int v) { data[top] = v; top++; }\n    int pop() { top--; return data[top]; }\n    bool isEmpty() { return top == 0; }\nprivate:\n    int* data; int cap; int top;\n};\n\nA test does IntStack s(2); s.push(1); s.push(2); s.push(3); then pops four times. Under AddressSanitizer the third push reports 'heap-buffer-overflow ... WRITE of size 4 ... in IntStack::push'. List every defect, rewrite the class so its operations are safe and the ADT's contract is explicit, and explain what 'abstract data type' means for how a client may use it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the defects, give the safe class, and explain the ADT contract.",
          parts: [
            part(
              "Defects",
              "No bounds check in push (third push writes past the 2-element array -- the ASan report); no empty check in pop (fourth pop reads data[-1]); no destructor, so the new[] array leaks; no copy control, so copying the object shares the pointer and double-deletes (rule of three/five); int for capacity/top allows negative values; cap is stored but never used; isEmpty is not const; constructor is not explicit. Also no peek/size.",
              "1. push never checks top against cap, so the third push writes past the end of a two-int array -- exactly the heap-buffer-overflow ASan flagged. 2. pop never checks for empty, so the fourth pop reads data[-1], garbage or a crash. 3. No destructor: the new[] array is never deleted -- a leak per stack. 4. No copy constructor or assignment operator, so copying an IntStack copies the pointer and two objects later delete the same memory (rule of three). 5. cap is stored and never consulted. 6. int for sizes admits negatives; isEmpty is not const; the constructor is not explicit, so an int converts silently to a stack. 7. No peek or size, so a client cannot inspect without mutating."
            ),
            part(
              "Safe rewrite",
              "Uses std::vector<int> (or a unique_ptr) to own the storage so destruction and copying are correct automatically; push returns bool (or throws) when full; pop and peek throw std::out_of_range when empty; size_t for sizes; const on observers; explicit constructor. Shows the test now producing 1,1,0 for the pushes, 2 then 2,1 for peek/pops, empty true, and the extra pop caught as an exception.",
              "#include <stdexcept>\n#include <vector>\nclass IntStack {\npublic:\n    explicit IntStack(std::size_t capacity) : data(capacity), top(0) {}\n    bool push(int v) {\n        if (top == data.size()) return false;   // full: refuse, caller decides\n        data[top++] = v;\n        return true;\n    }\n    int pop() {\n        if (top == 0) throw std::out_of_range(\"pop on empty stack\");\n        return data[--top];\n    }\n    int peek() const {\n        if (top == 0) throw std::out_of_range(\"peek on empty stack\");\n        return data[top - 1];\n    }\n    bool isEmpty() const { return top == 0; }\n    std::size_t size() const { return top; }\nprivate:\n    std::vector<int> data;\n    std::size_t top;\n};\n\nstd::vector owns the memory, so the destructor, copy and move are correct for free and the leak and double-delete are gone. The test now prints 1 1 0 for the three pushes (the third is refused), peek 2, pops 2 then 1, isEmpty true, and the fourth pop is caught: 'pop on empty stack'. Under AddressSanitizer it is clean."
            ),
            part(
              "What 'abstract data type' means here",
              "An ADT is a contract: the set of operations (push, pop, peek, isEmpty, size), their preconditions/postconditions and their costs (all O(1) here), independent of representation; the client uses only the public interface and may not know or depend on whether storage is an array, a vector or a linked list; private members enforce the invariant (0 <= top <= capacity, elements below top are valid); the representation can change (e.g. to a growable vector or linked list) without touching client code. Notes a stack is LIFO and that exposing data would break the invariant.",
              "The ADT is the promise, not the storage. Stack promises: push adds to the top; pop removes and returns the most recently pushed item (LIFO) and is only valid when not empty; peek reads it without removing; isEmpty and size report state; every operation is O(1). The client programs against those promises alone -- it never learns, and must never assume, that the elements live in a vector at indices 0..top-1. The private section is what keeps the promises true: the invariant 0 <= top <= capacity with valid elements below top can only be changed by the class's own methods. That is why I could swap new[] for std::vector without changing a line of client code, and why a public data member would be a defect even if nothing used it yet: it lets a client break the invariant the ADT exists to protect."
            ),
          ],
        },
      ],
    },
    // Information Security -------------------------------------------------
    {
      slug: "write-an-access-control-policy",
      objective: "Security policy development and application",
      kind: "build",
      title: "Write an access-control policy a small company can follow",
      brief:
        "Pinewood Dental Group (fictional), four clinics and 60 staff, has no written access policy. Facts gathered: everyone at the front desk shares one login to the practice system; a former hygienist's account still works six months after she left; the office manager has domain admin 'because IT is slow'; dentists check records from personal phones; backups are on an external drive in the office manager's desk. Write the access-control section of a security policy: scope, principles, concrete rules, roles and responsibilities, and how compliance is checked -- and map each rule to the problem it fixes.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the policy section and show the mapping from rules to findings.",
          parts: [
            part(
              "Scope and principles",
              "Scope: all systems holding patient, financial or staff data, all workforce members and contractors, all devices used to access them. Principles stated and defined: least privilege, need-to-know, individual accountability (unique accounts), separation of duties, defence in depth; names a framework the policy aligns with (e.g. NIST CSF 2.0 functions, with this section under Protect and Govern).",
              "Scope: every system that stores or processes patient, payment or staff information at any Pinewood clinic; every employee, dentist, contractor and vendor who touches them; every device used to reach them, owned by the practice or not. Principles: least privilege -- each account has only the access its role needs; need-to-know -- access to a record requires a work reason; individual accountability -- every action traces to one named person; separation of duties -- no one person can both grant themselves access and approve it; defence in depth -- no single control is relied on alone. This section sits under the Govern and Protect functions of NIST CSF 2.0, which the practice adopts as its framework."
            ),
            part(
              "Concrete rules",
              "At least six enforceable rules with owners: (1) unique accounts for every user, shared accounts prohibited -- fixes the front-desk login; (2) joiner/mover/leaver process: access removed on the last day, HR notifies IT, quarterly access review -- fixes the ex-hygienist; (3) administrative rights only in separate admin accounts used for admin tasks, granted by request with justification and reviewed, no daily use -- fixes the office manager; (4) remote and mobile access only from managed/enrolled devices with screen lock, encryption and MFA, no patient data in personal apps -- fixes the phones; (5) MFA for all remote access and all privileged accounts; (6) backups encrypted, stored off-site or in a managed cloud with restricted access and periodic restore tests, never in an unlocked desk -- fixes the drive; (7) audit logging of access to patient records with review. Each rule phrased as must/must not.",
              "R1 Every person has their own account; shared or generic logins are prohibited and will be disabled. -> front-desk shared login. R2 Access follows employment: HR notifies IT of starts, role changes and departures; access is removed by the end of the last working day; the practice manager reviews every account against the staff list each quarter. -> hygienist's live account. R3 Administrative privileges are held only in dedicated admin accounts, granted on written request with a stated need, used only for administrative tasks, and reviewed quarterly; day-to-day work is done from a standard account. -> office manager as domain admin. R4 Patient data may be accessed only from devices enrolled in the practice's device management, with encryption, automatic screen lock and remote wipe; storing or sending patient data through personal apps is prohibited. -> personal phones. R5 Multi-factor authentication is required for all remote access and all privileged accounts. R6 Backups are encrypted, stored off-site or in the managed cloud service with access limited to named IT roles, and a restore is tested quarterly; removable media in offices is prohibited. -> drive in the desk. R7 Access to patient records is logged and the log is reviewed monthly for access without a care or billing reason."
            ),
            part(
              "Roles and compliance checking",
              "Roles: practice owner accountable; practice manager as policy owner; IT provider operates controls; HR triggers joiner/leaver; every user responsible for their account. Checks: quarterly access recertification with evidence; monthly log review; annual policy review; metrics (orphan accounts found, time-to-deprovision, MFA coverage, admin account count); exceptions documented with expiry; sanctions for violations; training at hire and annually. Notes a policy nobody can follow (IT 'too slow') fails -- so define service levels for access requests.",
              "Accountable: the practice owner. Policy owner: the practice manager, who keeps it current and reports on it. Operator: the IT provider, which implements and evidences the controls. Trigger: HR, for every start, move and departure. Every user is responsible for their own account and for reporting misuse. Compliance is checked, not assumed: quarterly recertification of all accounts with the signed-off list kept as evidence; monthly review of record-access logs; counts reported to the owner -- orphan accounts found, hours from departure to deprovisioning, MFA coverage, number of admin accounts; exceptions written down with a reason and an expiry date; sanctions applied through HR; training at hire and yearly. And because 'IT is slow' is why the manager became an admin, the policy sets a service level -- routine access requests fulfilled within one business day -- so following the rule is not harder than breaking it."
            ),
          ],
        },
      ],
    },
  ],
};
