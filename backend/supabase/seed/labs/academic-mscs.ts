import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-161: MSCS Foundations Coach (MSCS), the 15-week graduate-CS bridge
// (seed/data.ts), no exam blueprint.
//
// Density (docs/labs.md, "hybrid"): one lab per unit plus one extra in the
// first unit, the only one with a second performance objective and room ->
// 2/1/1/1/1/1/1/1/1/1/1/1/1/1/1 = 16 labs. Every lab is what the unit's
// gate asks the learner to DO: bound running time and space of unfamiliar
// code, judge asymptotic claims, pick a data structure and defend it, write
// an induction proof, solve recurrences, run BFS and Dijkstra by hand,
// convert and overflow fixed-width integers, diagnose a race and a deadlock,
// normalise a table, compute cosine similarity, fix password storage,
// threat-model with STRIDE, run a heuristic evaluation, shape a computation
// as MapReduce, and trace a request across trust boundaries.
//
// Sources: standard references for each topic -- MIT OCW 6.006
// (algorithms), OSTEP (operating systems), the Python hashlib documentation
// (the password-storage lab's primitives), Nielsen Norman Group's ten
// heuristics, Microsoft's STRIDE documentation, NIST CSF 2.0's six functions
// (Govern, Identify, Protect, Detect, Respond, Recover), W3C WCAG and the
// original MapReduce paper. Every numeric claim (comparison counts, BFS
// order and distances, Dijkstra's table and its negative-edge
// counterexample, two's-complement values, cosine similarities, the
// recurrence ratios, the MapReduce output, the race and deadlock
// behaviour) was computed or reproduced in CPython 3.13 on 2026-11-07 and
// quoted from that run.

export const MSCS_LABS: SeedLabSet = {
  trackCode: "MSCS",
  sources: [
    source("https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/", "reference", "2026-11-07"),
    source("https://pages.cs.wisc.edu/~remzi/OSTEP/", "reference", "2026-11-07"),
    source("https://docs.python.org/3/library/hashlib.html", "reference", "2026-11-07"),
    source("https://www.nngroup.com/articles/ten-usability-heuristics/", "reference", "2026-11-07"),
    source("https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats", "reference", "2026-11-07"),
    source("https://www.nist.gov/cyberframework", "reference", "2026-11-07"),
    source("https://www.w3.org/WAI/standards-guidelines/wcag/", "reference", "2026-11-07"),
    source("https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/", "reference", "2026-11-07"),
  ],
  labs: [
    // Complexity & computational thinking --------------------------------
    {
      slug: "bound-three-unfamiliar-functions",
      objective: "Analyze simple loop and recursive patterns",
      kind: "build",
      title: "Bound the time and space of three functions",
      brief:
        "A take-home from a fictional graduate admissions test. For each function give the worst-case time complexity and the auxiliary space (extra memory beyond the input), with a one-line justification.\n\ndef has_duplicate(xs):\n    for i in range(len(xs)):\n        for j in range(i + 1, len(xs)):\n            if xs[i] == xs[j]:\n                return True\n    return False\n\ndef count_bits(n):\n    c = 0\n    while n > 0:\n        c += n % 2\n        n //= 2\n    return c\n\ndef total(xs):\n    if not xs:\n        return 0\n    return xs[0] + total(xs[1:])\n\nThen rewrite has_duplicate to run in linear expected time and say what you traded for the speed.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give time and auxiliary space for each with justification, then the faster has_duplicate.",
          parts: [
            part(
              "has_duplicate",
              "Time O(n^2) in the worst case (no duplicate): the inner loop runs n-1, n-2, ... 1 times, n(n-1)/2 comparisons in total -- e.g. 45 for n=10, 780 for n=40. Auxiliary space O(1): two indices. Notes best case O(1) if the first two elements match, but worst case is what the bound describes.",
              "Time: O(n^2). With no duplicate present the inner loop runs (n-1) + (n-2) + ... + 1 = n(n-1)/2 comparisons -- 45 for n = 10, 190 for n = 20, 780 for n = 40 -- which is Theta(n^2). The early return makes the best case O(1), but the worst case is the bound. Space: O(1) auxiliary -- two loop indices, nothing that grows with n."
            ),
            part(
              "count_bits",
              "Time O(log n): each iteration halves n, so the loop runs floor(log2 n) + 1 times -- 10 for 1023, 20 for 2^20 - 1, 40 for 2^40 - 1. Auxiliary space O(1). Notes that in terms of the number of bits b of the input this is O(b), i.e. linear in input size measured in bits.",
              "Time: O(log n). n is halved every iteration, so the loop body runs floor(log2 n) + 1 times: 10 times for 1023, 20 for 2^20 - 1, 40 for 2^40 - 1. Measured against the input's size in bits, b, that is O(b) -- linear in the length of the input, logarithmic in its value; saying which you mean is part of the answer. Space: O(1), a counter and the shrinking n."
            ),
            part(
              "total",
              "Time O(n^2) as written, because xs[1:] copies the remaining list at every level (n-1, n-2, ... elements); auxiliary space O(n) for the call stack depth n plus O(n^2) total copying over the run (O(n) live at any time if copies are freed). Notes Python's default recursion limit (1000) makes it fail for a list of a few thousand elements. Accepts O(n) time if the answer explicitly assumes slicing is O(1), but must call out the stack depth.",
              "Time: O(n^2) in CPython as written, not O(n) -- xs[1:] builds a new list of n-1, then n-2, ... elements, so the slicing alone is n(n-1)/2 element copies. Space: O(n) for the recursion depth (n frames live at the deepest point), plus the slices. And it is not just slow: with the default recursion limit of 1000, total(list(range(5000))) raises RecursionError. A loop, or sum(), is O(n) time and O(1) space."
            ),
            part(
              "Linear has_duplicate",
              "Uses a set: iterate once, return True if x in seen else add -- O(n) expected time because set membership and insertion are average O(1); O(n) auxiliary space for the set; trade-off: memory for time, and the O(1) is average-case (hashing), with O(n) worst case per operation under adversarial collisions.",
              "def has_duplicate(xs):\n    seen = set()\n    for x in xs:\n        if x in seen:\n            return True\n        seen.add(x)\n    return False\n\nOne pass with O(1) average-case membership and insertion gives O(n) expected time. The price is O(n) auxiliary space for the set, and the guarantee is average-case: hashing can degrade to O(n) per operation with pathological collisions, so the bound is expected, not worst-case. Sorting first gives O(n log n) time with O(1) extra space if an in-place sort is allowed -- a different trade."
            ),
          ],
        },
      ],
    },
    {
      slug: "true-or-false-asymptotic-claims",
      objective: "Use Big-O, Big-Omega, and Big-Theta",
      kind: "build",
      title: "Judge six asymptotic claims",
      brief:
        "A fictional algorithms qualifier gives six statements. Decide whether each is true or false and justify with the definition (constants c and n0) or a counterexample.\n\n1. 2n^2 + 3n = O(n^2)\n2. 2n^2 + 3n = O(n^3)\n3. 2n^2 + 3n = Theta(n^3)\n4. n log2 n = Omega(n)\n5. 2^n = O(n^3)\n6. If f(n) = O(g(n)) then g(n) = Omega(f(n))",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give a verdict for each with the witness constants or the counterexample.",
          parts: [
            part(
              "Claims 1-3 (the same function, three bounds)",
              "1 true: 2n^2 + 3n <= 3n^2 for all n >= 3 (c = 3, n0 = 3) -- or c = 5, n0 = 1. 2 true: O is an upper bound and n^3 dominates n^2, so a loose bound is still a valid bound. 3 false: Theta needs a matching lower bound, and 2n^2 + 3n >= c n^3 fails for every c > 0 once n > (2 + 3)/c, so it is not Omega(n^3).",
              "1 True. 3n <= n^2 once n >= 3, so 2n^2 + 3n <= 3n^2 for all n >= 3: c = 3, n0 = 3 witnesses it (c = 5, n0 = 1 also works). 2 True, and deliberately loose: O(g) only says 'grows no faster than g', and n^2 certainly grows no faster than n^3 -- a correct but unhelpful bound. 3 False. Theta(n^3) would also require 2n^2 + 3n >= c n^3 for some c > 0 and all large n, i.e. c <= 2/n + 3/n^2, which goes to 0; no positive c survives. The tight statement is Theta(n^2)."
            ),
            part(
              "Claims 4-5",
              "4 true: n log2 n >= n for n >= 2 (c = 1, n0 = 2), so Omega(n) holds (and it is not O(n), so not Theta(n)). 5 false: 2^n / n^3 is unbounded -- e.g. 2^n < n^3 for n = 2..9 but 2^n >= n^3 for all n >= 10 and the ratio keeps growing -- so no constant c makes 2^n <= c n^3 for all large n; polynomials never bound exponentials.",
              "4 True. For n >= 2, log2 n >= 1 so n log2 n >= n: c = 1, n0 = 2. It is a lower bound only -- n log n is not O(n), so it is Omega(n) but not Theta(n). 5 False. 2^n is smaller than n^3 for n = 2 through 9 (small cases prove nothing), but from n = 10 on 2^n >= n^3 and the ratio 2^n / n^3 grows without bound, so no c and n0 can make 2^n <= c n^3 hold forever. Exponential beats every polynomial eventually."
            ),
            part(
              "Claim 6 and the lesson",
              "6 true: the definitions are symmetric -- f <= c g for n >= n0 is the same inequality as g >= (1/c) f, so g = Omega(f). States the lesson: O is an upper bound, Omega a lower bound, Theta both; 'O' is not 'exactly', and a loose O bound (claim 2) is still true.",
              "6 True, directly from the definitions: f(n) <= c g(n) for all n >= n0 is the same inequality as g(n) >= (1/c) f(n), which is g = Omega(f) with constant 1/c and the same n0. The lesson across the six: O is 'at most', Omega is 'at least', Theta is 'exactly, up to constants'. Saying an algorithm is O(n^3) when it is Theta(n^2) is true and still a bad answer, because the question is almost always asking for the tight bound."
            ),
          ],
        },
      ],
    },
    // Core data structures -----------------------------------------------
    {
      slug: "choose-structures-for-three-problems",
      objective: "Compare access/search/insert/delete/space cost",
      kind: "build",
      title: "Choose a data structure for three new problems",
      brief:
        "Three requirements from fictional systems. (A) A web cache must hold the 10,000 most recently used pages: lookup by URL, and when full evict the least recently used page -- every operation in O(1). (B) A game leaderboard with 5 million players must return the current top 10 scores and accept score updates thousands of times a second; full ranking is never needed. (C) A deduplication filter sees 50 million ids per day and must answer 'have I seen this id before?' with a tiny false-positive rate acceptable and false negatives unacceptable, in a memory budget far below storing the ids. For each, name the structure(s), give the cost of each operation, and say what you rejected and why.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose and defend a structure for A, B and C, naming the rejected alternatives.",
          parts: [
            part(
              "A: LRU cache",
              "Hash table (URL -> node) plus a doubly linked list ordered by recency: lookup O(1) via the hash, move-to-front O(1) by relinking, eviction O(1) from the tail. Rejects a plain hash table (no order), a plain list/array (O(n) search or O(n) move), a balanced tree (O(log n), unnecessary). Space O(capacity).",
              "A hash map from URL to a node in a doubly linked list kept in recency order. Hit: hash lookup O(1), unlink the node and relink at the head O(1) because the node holds its neighbours. Insert: O(1) at the head; when over capacity, drop the tail node and delete its key O(1). A hash table alone cannot say which entry is oldest; an array can find the oldest but moving an entry to the front is O(n); a balanced BST keyed by last-use time does everything in O(log n), which is correct but slower than needed. Space is O(capacity) either way."
            ),
            part(
              "B: top-10 leaderboard",
              "A min-heap of size 10 holding the current top ten (root = the 10th best): a new score is compared with the root O(1) and, if larger, replaces it and sifts down O(log 10); a hash map from player to score lets an existing player's update be handled (lazy deletion or re-check). Rejects sorting 5M on each query (O(n log n)), a fully sorted structure (O(log n) with n = 5M when only 10 matter), and a max-heap of everything (top 10 extraction costs O(10 log n) and re-insertion).",
              "Keep only what the query needs: a min-heap of the ten best scores, so the root is the weakest of the top ten. A new score is compared with the root in O(1); if it is higher, replace the root and sift down -- O(log 10), effectively constant. A hash map player -> score makes 'was this already a top-ten player?' O(1) so a player updating their own score does not appear twice. Re-sorting five million rows per update is O(n log n) per event; a balanced tree over all players gives O(log n) per update but stores and maintains 5M entries to answer a question about 10. The heap costs O(10) space."
            ),
            part(
              "C: have-I-seen-this filter",
              "A Bloom filter: k hash functions set k bits per id; a query answers 'definitely not seen' when any bit is 0 and 'probably seen' otherwise; O(k) time per operation, space a fixed bit array far smaller than the ids, false positives tunable by size and k, no false negatives (bits are never cleared), no deletion. Rejects a hash set (exact but stores every id -- memory) and a sorted array/BST (O(log n) and same memory problem).",
              "A Bloom filter. m bits, k hash functions; inserting an id sets its k bits, a query reports 'not seen' if any of the k bits is 0 and 'probably seen' if all are 1. Every operation is O(k), memory is the fixed bit array -- a few bits per expected id instead of the ids themselves -- and the false-positive rate is a knob set by m and k. Bits are never unset, so there are no false negatives, which is the requirement; the price is no deletion and no listing. A hash set is exact and O(1) but has to hold 50M ids a day in memory; a sorted structure is O(log n) and has the same memory problem."
            ),
          ],
        },
      ],
    },
    // Discrete mathematics I ---------------------------------------------
    {
      slug: "induction-proof-sum-of-odds",
      objective: "Mathematical induction",
      kind: "build",
      title: "Write an induction proof and name its parts",
      brief:
        "A fictional discrete-math qualifier asks: prove that for every positive integer n, 1 + 3 + 5 + ... + (2n - 1) = n^2. A student's attempt reads: 'For n = 1, 1 = 1. Assume it is true for all n. Then it is true for n + 1.' Write a correct proof, label its parts, and say what is wrong with the student's attempt.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the proof with base case, hypothesis and step clearly separated, then critique the attempt.",
          parts: [
            part(
              "Base case",
              "Checks n = 1 explicitly: the left side is the single term 2(1) - 1 = 1 and the right side is 1^2 = 1. States that this anchors the induction.",
              "Base case (n = 1): the left-hand side has one term, 2(1) - 1 = 1; the right-hand side is 1^2 = 1. Equal, so P(1) holds."
            ),
            part(
              "Inductive hypothesis and step",
              "Hypothesis: assume for an arbitrary fixed k >= 1 that 1 + 3 + ... + (2k - 1) = k^2 (not 'for all n'). Step: show P(k+1): the sum to 2(k+1) - 1 = 2k + 1 equals k^2 + (2k + 1) by the hypothesis, which is (k + 1)^2. Concludes by the principle of induction that P(n) holds for all n >= 1.",
              "Inductive hypothesis: let k >= 1 be arbitrary and assume P(k): 1 + 3 + ... + (2k - 1) = k^2.\nInductive step: the sum for k + 1 is [1 + 3 + ... + (2k - 1)] + (2(k + 1) - 1) = k^2 + (2k + 1) by the hypothesis, and k^2 + 2k + 1 = (k + 1)^2, which is P(k + 1).\nSince P(1) holds and P(k) implies P(k + 1) for every k >= 1, P(n) holds for all positive integers n. (A quick check: for n = 1..199 the sum of the first n odd numbers equals n^2 in every case -- evidence, not proof; the induction is the proof.)"
            ),
            part(
              "What is wrong with the attempt",
              "Identifies that 'assume it is true for all n' assumes the conclusion (circular) -- the hypothesis must be for one arbitrary k; that the step 'then it is true for n+1' shows no work -- the algebra connecting P(k) to P(k+1) is the proof; and that the base case, while correct, is not written as a check of both sides.",
              "Two failures. 'Assume it is true for all n' assumes exactly what is to be proved -- the hypothesis must be P(k) for one arbitrary k, with the step earning P(k + 1) from it. And 'then it is true for n + 1' asserts the step without doing it: the proof is the algebra k^2 + (2k + 1) = (k + 1)^2, and there is none. The base case is right in substance but should show both sides evaluated. Induction is a template; the content is the step."
            ),
          ],
        },
      ],
    },
    // Sorting, recursion, and recurrences --------------------------------
    {
      slug: "solve-three-recurrences",
      objective: "Interpret T(n)=2T(n/2)+O(n)",
      kind: "build",
      title: "Solve three recurrences and say what algorithms they describe",
      brief:
        "A fictional algorithms problem set gives three recurrences with T(1) = O(1):\n\n(i) T(n) = 2T(n/2) + O(n)\n(ii) T(n) = T(n/2) + O(1)\n(iii) T(n) = 2T(n/2) + O(n^2)\n\nSolve each with a recursion tree or the master theorem, name an algorithm whose running time it describes, and explain in words why the 'work per level' pattern gives the answer.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Solve (i), (ii) and (iii) and name a matching algorithm for each.",
          parts: [
            part(
              "(i) 2T(n/2) + O(n)",
              "Theta(n log n). Tree: each level does cn total work (2^i subproblems of size n/2^i), there are log2 n levels, so cn log n. Master theorem case 2 (a = 2, b = 2, f(n) = n = n^(log_b a)). Algorithm: merge sort (split, sort halves, linear merge); also the standard divide-and-conquer with linear combine.",
              "Theta(n log n). Recursion tree: level i has 2^i subproblems of size n/2^i, each doing linear work, so every level totals c n; there are log2 n levels before size 1; total c n log2 n. Master theorem: a = 2, b = 2, n^(log_2 2) = n, and f(n) = n matches it -- case 2, Theta(n log n). Merge sort: two recursive sorts plus a linear merge. (Computing T exactly with T(1) = 0 and n a power of two gives T(n)/(n log2 n) = 1.0 at n = 2^10, 2^16 and 2^20.)"
            ),
            part(
              "(ii) T(n/2) + O(1)",
              "Theta(log n). Tree: one subproblem per level, constant work, log2 n levels. Master theorem case 2 with a = 1, b = 2 (n^0 = 1 = f(n)). Algorithm: binary search.",
              "Theta(log n). Only one branch is followed, each level costs a constant, and the size halves until it reaches 1 after log2 n levels -- so the total is c log2 n. Master theorem: a = 1, b = 2, n^(log_2 1) = 1 = f(n), case 2. Binary search: compare with the middle, recurse into one half. (Exact count with T(1) = 0: T(2^10) = 10, T(2^16) = 16, T(2^20) = 20.)"
            ),
            part(
              "(iii) 2T(n/2) + O(n^2) and the pattern",
              "Theta(n^2). Tree: level i does 2^i * (n/2^i)^2 = n^2 / 2^i work, a geometric series dominated by the root (n^2 + n^2/2 + n^2/4 + ... -> 2n^2). Master theorem case 3 (f(n) = n^2 is polynomially larger than n^(log_2 2) = n, regularity holds). Example: a divide-and-conquer whose combine step is quadratic -- e.g. a naive 'split then compare all pairs across the halves' -- the split buys nothing. Pattern: when work per level is equal -> n log n; shrinking geometrically -> the root dominates; growing geometrically -> the leaves dominate (e.g. T(n) = 4T(n/2) + n is Theta(n^2)).",
              "Theta(n^2). Level i has 2^i problems of size n/2^i, each costing (n/2^i)^2, so the level costs n^2 / 2^i: n^2, n^2/2, n^2/4, ... a geometric series that sums to at most 2n^2 -- the root dominates. Master theorem case 3: f(n) = n^2 is polynomially bigger than n^(log_2 2) = n. A divide and conquer whose combine step compares every pair across the two halves has this shape, and the recursion buys nothing over doing the quadratic work once. (Exact: T(n)/n^2 -> 2.0.) The pattern to carry away: equal work on every level gives n log n (i); work shrinking down the tree makes the root the cost (iii); work growing down the tree makes the leaves the cost -- T(n) = 4T(n/2) + n has n^(log_2 4) = n^2 leaves' worth of work and is Theta(n^2) by case 1."
            ),
          ],
        },
      ],
    },
    // Graph foundations --------------------------------------------------
    {
      slug: "bfs-by-hand",
      objective: "BFS",
      kind: "build",
      title: "Run BFS by hand and read off distances",
      brief:
        "An undirected graph from a fictional campus-network exercise, as an adjacency list (neighbours listed in the order given):\n\nA: B, C\nB: A, D, E\nC: A, F\nD: B\nE: B, F\nF: C, E, G\nG: F\n\nRun breadth-first search from A. Give the order vertices are dequeued, the distance (in edges) of every vertex from A, one shortest path from A to G, and the running time in terms of V and E for an adjacency-list graph.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the dequeue order, the distance table, the A-G path and the complexity.",
          parts: [
            part(
              "Dequeue order",
              "A, B, C, D, E, F, G (ties broken by the listed neighbour order). Accepts an explanation of the queue contents at each step.",
              "Queue starts [A]. Dequeue A, enqueue B, C. Dequeue B, enqueue D, E (A seen). Dequeue C, enqueue F. Dequeue D (nothing new). Dequeue E (F already seen). Dequeue F, enqueue G. Dequeue G. Order: A, B, C, D, E, F, G."
            ),
            part(
              "Distances and a shortest path",
              "A 0; B 1, C 1; D 2, E 2, F 2; G 3. Shortest A-G path: A, C, F, G (3 edges), found by following parent pointers back from G. Explains that BFS gives shortest paths in edge count because it explores in layers.",
              "dist: A 0 | B 1, C 1 | D 2, E 2, F 2 | G 3. BFS discovers vertices in layers of increasing distance, so the first time a vertex is reached is along a shortest path in edges. Parent pointers: G <- F <- C <- A, so one shortest path is A, C, F, G with 3 edges. (A, B, E, F, G is a path too, but 4 edges; the layer structure rules it out as shortest.)"
            ),
            part(
              "Complexity",
              "O(V + E): each vertex is enqueued and dequeued once (V), and each adjacency list is scanned once, 2E entries in total for an undirected graph (here 7 vertices, 7 edges, 14 list entries). Notes an adjacency matrix would make it O(V^2) because each dequeue scans a full row. Space O(V) for the queue, visited set and parents.",
              "O(V + E) with adjacency lists. Each vertex enters and leaves the queue once -- V operations -- and when it leaves, its whole adjacency list is scanned once; across all vertices that is every edge twice (14 entries for these 7 edges), so O(E). With an adjacency matrix each dequeue scans a row of V entries, making it O(V^2) regardless of how sparse the graph is. Extra space is O(V): the queue, the discovered set (or distance table) and the parent map."
            ),
          ],
        },
      ],
    },
    // Graph algorithms & design strategies -------------------------------
    {
      slug: "dijkstra-and-a-negative-edge",
      objective: "Dijkstra and its nonnegative-weight requirement",
      kind: "build",
      title: "Run Dijkstra, then break it with one negative edge",
      brief:
        "A fictional routing exercise. Directed, weighted graph 1:\n\nS -> A (4), S -> B (1), B -> A (2), A -> C (1), B -> C (5)\n\nRun Dijkstra from S, showing the order in which vertices are settled and the final distances. Then graph 2:\n\nS -> A (2), S -> B (5), B -> A (-4)\n\nRun Dijkstra from S on graph 2 (settling a vertex when it is popped and never revisiting it) and compare with the true shortest distance to A. Explain what property of the algorithm the negative edge breaks, and name the algorithm you would use instead.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the run on graph 1, the failure on graph 2, the reason and the alternative.",
          parts: [
            part(
              "Graph 1: settled order and distances",
              "Settle S (0); relax A=4, B=1. Settle B (1); relax A to 3 (1+2), C to 6. Settle A (3); relax C to 4 (3+1). Settle C (4). Final: S 0, B 1, A 3, C 4; shortest paths S-B-A and S-B-A-C. Order S, B, A, C.",
              "Start dist S = 0, others infinity. Pop S: A = 4, B = 1. Pop B (1, the smallest): A improves to 1 + 2 = 3, C = 1 + 5 = 6. Pop A (3): C improves to 3 + 1 = 4. Pop C (4). Settled order S, B, A, C; final distances S 0, B 1, A 3, C 4, with predecessor pointers A <- B <- S and C <- A."
            ),
            part(
              "Graph 2: where it goes wrong",
              "Dijkstra pops S, sets A = 2, B = 5; pops A (2) and settles it; pops B (5), relaxes B -> A: 5 + (-4) = 1 < 2, but A is already settled so the answer stays 2 (or, in a variant that re-relaxes, the invariant is violated anyway). True shortest path S-B-A has length 1. Dijkstra reports 2.",
              "Pop S: A = 2, B = 5. Pop A at 2 and settle it -- Dijkstra now believes 2 is final. Pop B at 5 and relax B -> A: 5 - 4 = 1, better than 2, but A is settled and is not reopened, so the output is A = 2. The real shortest path is S -> B -> A with length 1. The algorithm is wrong by exactly the amount the later, cheaper path saved."
            ),
            part(
              "Why, and what to use instead",
              "The greedy invariant -- when a vertex is popped with the smallest tentative distance, no later path can be shorter -- relies on every edge adding a nonnegative amount, so paths only get longer as they extend; a negative edge lets a path through a 'farther' vertex come back cheaper. Alternative: Bellman-Ford (O(VE), handles negative edges and detects negative cycles), or for DAGs a topological-order relaxation; notes negative cycles make 'shortest' undefined.",
              "Dijkstra's correctness rests on one promise: the vertex with the smallest tentative distance can be settled because any other route to it would have to pass through a vertex at least as far away and then add a nonnegative edge, so it cannot be shorter. A negative edge breaks the 'add a nonnegative amount' part -- going the long way to B and then subtracting 4 beats the direct edge. Use Bellman-Ford: V - 1 rounds of relaxing every edge, O(VE), correct with negative edges, and one more round detects a negative cycle (where 'shortest' has no meaning). If the graph is a DAG, relax edges in topological order in O(V + E) instead."
            ),
          ],
        },
      ],
    },
    // Computer architecture ----------------------------------------------
    {
      slug: "binary-hex-twos-complement",
      objective: "Binary and hex representation",
      kind: "build",
      title: "Convert, negate and overflow an 8-bit value",
      brief:
        "A fictional embedded-systems quiz about an 8-bit register. (1) The register holds 0xB6. Write it in binary and give its value as an unsigned integer and as a two's-complement signed integer. (2) Write -74 as an 8-bit two's-complement pattern, in binary and hex. (3) The signed 8-bit addition 100 + 100 is performed; give the stored bit pattern and the value a signed interpretation reads, and name what happened. (4) Explain why hex is used to write bit patterns instead of decimal.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Answer the four questions with working.",
          parts: [
            part(
              "0xB6 in binary, unsigned and signed",
              "0xB6 = 1011 0110 (B = 1011, 6 = 0110). Unsigned: 128 + 32 + 16 + 4 + 2 = 182. Signed two's complement: the top bit is 1 so it is negative; value = 182 - 256 = -74 (or invert and add one: 0100 1010 = 74, so -74).",
              "B = 1011, 6 = 0110, so 0xB6 = 1011 0110. Unsigned: 128 + 32 + 16 + 4 + 2 = 182. Signed: the most significant bit is 1, so the value is 182 - 256 = -74; equivalently invert (0100 1001) and add one (0100 1010 = 74), hence -74. Same bits, two readings -- the type decides."
            ),
            part(
              "-74 as two's complement",
              "74 = 0100 1010; invert to 1011 0101; add 1 to get 1011 0110 = 0xB6. (Consistent with part 1.) Notes the range of signed 8-bit is -128..127.",
              "74 = 0100 1010. Invert: 1011 0101. Add one: 1011 0110 = 0xB6 -- which is why part 1 read 0xB6 as -74. Shortcut: 256 - 74 = 182 = 0xB6. The signed 8-bit range is -128 to 127, so -74 fits."
            ),
            part(
              "100 + 100 in signed 8-bit",
              "100 = 0110 0100; sum 200 = 1100 1000 fits in 8 bits as a pattern (no carry out), but read as signed it is 200 - 256 = -56. This is signed overflow: two positives summed to a negative because the result exceeded 127; the hardware sets the overflow flag (carry flag is 0). Distinguishes overflow (signed) from carry (unsigned).",
              "100 = 0110 0100; 100 + 100 = 200 = 1100 1000 (0xC8). The pattern fits in eight bits, so the unsigned carry flag is clear -- but the sign bit flipped to 1 and a signed reader sees 200 - 256 = -56. Two positives added to a negative: signed overflow, flagged by the CPU's overflow (V) flag. Carry and overflow are different events: carry is 'the unsigned result did not fit', overflow is 'the signed result did not fit'."
            ),
            part(
              "Why hex",
              "Each hex digit is exactly four bits, so a byte is two digits and the mapping to and from binary is digit-by-digit with no arithmetic; decimal digits do not align with bit boundaries (182 tells you nothing about which bits are set, B6 does). Also compact for addresses and masks (0xFF, 0x7FFFFFFF = 2^31 - 1).",
              "One hex digit is exactly one nibble (four bits), so 0xB6 converts to 1011 0110 digit by digit, and a 32-bit word is eight digits. Decimal has no such alignment: 182 says nothing about which bits are set, and converting means long division. Hex makes masks and limits readable -- 0xFF is the low byte, 0x7FFFFFFF is 2^31 - 1, the largest signed 32-bit value -- which is why registers, addresses and memory dumps are written in it."
            ),
          ],
        },
      ],
    },
    // Operating systems --------------------------------------------------
    {
      slug: "race-then-deadlock-case",
      objective: "Race conditions",
      kind: "case",
      title: "A bank balance goes negative, then the fix hangs",
      brief:
        "A fictional payments service keeps account balances in memory and serves withdrawals on a thread pool. A simplified version:\n\nbalance = 1000\ndef withdraw(amount):\n    global balance\n    if balance >= amount:       # check\n        ...                     # a little work here\n        balance -= amount       # act\n\nTwo requests to withdraw 700 from the same account arrive at the same instant. Operations saw the balance end at -400.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You reproduce it: with a short sleep between the check and the subtraction, two threads withdrawing 700 each leave the balance at -400 every time.",
          ask: "Explain the race precisely, and fix it.",
          parts: [
            part(
              "What the race is",
              "Names it a check-then-act (time-of-check to time-of-use) race on shared state: both threads evaluate balance >= 700 while balance is 1000, then both subtract; the interleaving, not the arithmetic, is the bug. Points out the critical section is the whole check-and-update, and that even balance -= amount alone is a read-modify-write that can interleave.",
              "Both threads run the check while balance is still 1000, both see 1000 >= 700, and both go on to subtract: 1000 - 700 - 700 = -400. The invariant 'balance never goes below zero' depends on the check and the update happening as one indivisible step, and nothing makes them indivisible -- a thread can be descheduled anywhere between them. It is a check-then-act (TOCTOU) race on shared mutable state, and the critical section is the pair, not just the subtraction. The GIL does not save you: it serialises bytecodes, not your two-line transaction."
            ),
            part(
              "The fix",
              "Protects the whole critical section with one mutex (threading.Lock, with lock: around check and update), so the second thread sees the updated balance and is refused: balance ends at 300. Mentions alternatives (atomic compare-and-swap in a database, per-account locks for scalability) and that the lock must cover every access to balance, not just this function.",
              "lock = threading.Lock()\n\ndef withdraw(amount):\n    global balance\n    with lock:\n        if balance >= amount:\n            ...\n            balance -= amount\n\nWith check and act inside the same mutex the second thread blocks until the first finishes, then sees 300 and declines; the balance ends at 300 in every run. Every read or write of balance anywhere must take the same lock, or the guarantee is gone. At scale, a lock per account (not one global lock) keeps unrelated accounts from queuing on each other -- which is where the next step bites."
            ),
          ],
        },
        {
          text: "The team moves to one lock per account and adds a transfer(src, dst, amount) that locks src then dst. In production, two transfers in opposite directions between the same two accounts -- A to B and B to A at the same time -- hang forever, and the thread pool drains. A test reproduces it reliably.",
          ask: "Diagnose the hang and fix it, naming the four conditions for deadlock and which one you broke.",
          parts: [
            part(
              "Diagnosis",
              "Deadlock: thread 1 holds lock A and waits for lock B; thread 2 holds B and waits for A -- a cycle. Names the four necessary conditions: mutual exclusion, hold and wait, no preemption, circular wait -- all present here.",
              "Thread 1 takes A's lock, pauses, and asks for B's; thread 2 has taken B's lock and is asking for A's. Each waits for the other forever -- a deadlock. All four necessary conditions hold: mutual exclusion (a lock has one owner), hold and wait (each holds one lock while requesting another), no preemption (a lock cannot be taken from its owner), and circular wait (A waits on B waits on A). Remove any one and deadlock is impossible."
            ),
            part(
              "Fix",
              "Imposes a global lock ordering: always acquire the two account locks in a fixed order (e.g. by account id), so a cycle cannot form -- breaks circular wait. The reproduction then completes. Alternatives: acquire both atomically / try-lock with back-off (breaks hold-and-wait), or a single lock for the pair; notes lock timeouts detect rather than prevent.",
              "def transfer(src, dst, amount):\n    first, second = sorted([src, dst], key=lambda acct: acct.id)\n    with first.lock:\n        with second.lock:\n            ...\n\nEvery thread now takes the lower-id account first, so one of the two opposite transfers waits at its first lock instead of holding one and wanting the other: no cycle, no deadlock -- the reproduction finishes. This breaks circular wait, the cheapest of the four to attack. Try-lock with release-and-retry breaks hold-and-wait at the cost of retries; a timeout on acquire only detects the hang after the fact."
            ),
          ],
        },
      ],
    },
    // Databases and data systems -----------------------------------------
    {
      slug: "normalise-an-orders-sheet",
      objective: "Normalization through 3NF",
      kind: "build",
      title: "Normalise an orders spreadsheet to 3NF",
      brief:
        "A fictional retailer keeps orders in one sheet with these columns: order_id, order_date, customer_id, customer_name, customer_email, product_codes (a comma-separated list such as 'A1,B2'), product_names (matching list), quantities (matching list), unit_prices (matching list), warehouse_code, warehouse_city. Known facts: a customer has one name and email; a product code has one name and one current list price; a warehouse code has one city; an order ships from one warehouse. Normalise to third normal form and show which anomaly each step removes.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the 1NF, 2NF and 3NF results with keys and the anomaly each removes.",
          parts: [
            part(
              "1NF",
              "Removes the repeating groups: one row per order line with atomic values -- order_line(order_id, product_code, quantity, unit_price) plus the single-valued order columns; key becomes (order_id, product_code). Explains the comma-separated lists violate atomicity and make querying a product's sales impossible with SQL.",
              "Split the lists. Each order line gets its own row: (order_id, order_date, customer_id, customer_name, customer_email, product_code, product_name, quantity, unit_price, warehouse_code, warehouse_city) with key (order_id, product_code). Atomic values only -- 'A1,B2' in one cell cannot be joined, summed or indexed, and the parallel lists silently corrupt when one is edited and another is not."
            ),
            part(
              "2NF",
              "Removes partial dependencies on the composite key: product_name (and the catalogue price) depend on product_code alone; order_date, customer_*, warehouse_* depend on order_id alone. Result: orders(order_id PK, order_date, customer_id, customer_name, customer_email, warehouse_code, warehouse_city), products(product_code PK, product_name, list_price), order_lines(order_id, product_code, quantity, unit_price) with key (order_id, product_code). Notes unit_price stays on the line as the price charged at the time. Anomaly removed: renaming a product no longer touches every line that sold it.",
              "Anything that depends on only part of (order_id, product_code) moves out. product_name depends on product_code alone -> products(product_code PK, product_name, list_price). order_date, customer fields and warehouse fields depend on order_id alone -> orders(order_id PK, order_date, customer_id, customer_name, customer_email, warehouse_code, warehouse_city). What is left is truly about the pair: order_lines(order_id, product_code, quantity, unit_price), key (order_id, product_code) -- and unit_price stays here on purpose, as the price actually charged, which can differ from today's list price. Update anomaly removed: a product rename is one row, not one per sale."
            ),
            part(
              "3NF",
              "Removes transitive dependencies on non-key attributes: customer_name and customer_email depend on customer_id (not order_id) -> customers(customer_id PK, name, email); warehouse_city depends on warehouse_code -> warehouses(warehouse_code PK, city); orders keeps the foreign keys customer_id and warehouse_code. Anomalies removed: a customer's email change is one row; a warehouse with no orders can exist (insertion); deleting a customer's last order no longer loses their details (deletion).",
              "Now remove attributes that depend on another non-key attribute. customer_name and customer_email depend on customer_id, which merely rides along in orders -> customers(customer_id PK, name, email), and orders keeps customer_id as a foreign key. warehouse_city depends on warehouse_code -> warehouses(warehouse_code PK, city). Final: customers, products, warehouses, orders(order_id PK, order_date, customer_id FK, warehouse_code FK), order_lines(order_id FK, product_code FK, quantity, unit_price). Removed: the update anomaly (a customer's new email is one row), the insertion anomaly (a new warehouse can exist before it ships anything), and the deletion anomaly (deleting a customer's only order no longer deletes the customer)."
            ),
          ],
        },
      ],
    },
    // Math & foundations for ML ------------------------------------------
    {
      slug: "cosine-similarity-nearest-document",
      objective:
        "Linear algebra: scalars/vectors/matrices, dot product, matrix multiplication, transpose, magnitude/distance, cosine similarity",
      kind: "build",
      title: "Find the nearest document with dot products",
      brief:
        "A fictional search exercise represents documents as word-count vectors over four terms (graph, oven, tree, path):\n\nq  = [3, 0, 2, 1]   (the query)\nd1 = [6, 0, 4, 2]\nd2 = [0, 5, 0, 1]\nd3 = [1, 1, 1, 1]\n\nCompute the dot product, the cosine similarity and the Euclidean distance between q and each document. Which document is 'nearest' under each measure, and which measure should a search engine use here? Then write the whole ranking as one matrix operation.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Show the numbers, interpret them, and give the matrix form.",
          parts: [
            part(
              "Dot products and magnitudes",
              "q.d1 = 18 + 0 + 8 + 2 = 28; q.d2 = 0 + 0 + 0 + 1 = 1; q.d3 = 3 + 0 + 2 + 1 = 6. |q| = sqrt(14) ~ 3.742; |d1| = sqrt(56) ~ 7.483; |d2| = sqrt(26) ~ 5.099; |d3| = 2.",
              "q.d1 = 3*6 + 0 + 2*4 + 1*2 = 28; q.d2 = 1; q.d3 = 3 + 0 + 2 + 1 = 6. Magnitudes: |q| = sqrt(9 + 4 + 1) = sqrt(14) ~ 3.742; |d1| = sqrt(36 + 16 + 4) = sqrt(56) ~ 7.483; |d2| = sqrt(25 + 1) ~ 5.099; |d3| = sqrt(4) = 2."
            ),
            part(
              "Cosine similarity and Euclidean distance",
              "cos(q,d1) = 28 / (sqrt(14) sqrt(56)) = 28/28 = 1.0; cos(q,d2) = 1 / (3.742 * 5.099) ~ 0.052; cos(q,d3) = 6 / (3.742 * 2) ~ 0.802. Distances: |q - d1| = sqrt(9 + 0 + 4 + 1) = sqrt(14) ~ 3.742; |q - d2| = sqrt(9 + 25 + 4 + 0) ~ 6.164; |q - d3| = sqrt(4 + 1 + 1 + 0) = sqrt(6) ~ 2.449. Nearest by cosine: d1; by Euclidean distance: d3.",
              "Cosine: d1 = 28/(3.742 * 7.483) = 1.000 exactly -- d1 is 2q, the same direction; d3 = 6/(3.742 * 2) = 0.802; d2 = 1/(3.742 * 5.099) = 0.052. Euclidean: |q - d1| = sqrt(3^2 + 0 + 2^2 + 1^2) = 3.742; |q - d3| = sqrt(2^2 + 1 + 1 + 0) = 2.449; |q - d2| = sqrt(9 + 25 + 4 + 0) = 6.164. Cosine says d1 is the closest; distance says d3 is. They disagree because d1 is the query doubled -- same proportions, twice as long."
            ),
            part(
              "Which measure, and the matrix form",
              "Cosine, because it measures the angle (term proportions) and ignores length, so a long document about the same topic is not penalised; Euclidean distance mixes topic with length. Matrix form: stack the documents as rows of D (3x4); scores = D q (3x1) gives the dot products [28, 1, 6]; cosine = (D q) divided element-wise by (row norms of D times |q|); argmax picks the document. Notes the transpose convention (q^T D^T or D q) and that for many queries Q, D Q^T gives all scores at once.",
              "Use cosine. A document twice as long about the same thing has the same direction and cosine 1.0; distance would push it away just for being long, and would call the short, bland d3 'nearest'. In matrix form, put the documents as rows of D (3x4): D q = [28, 1, 6]^T is all three dot products in one multiplication; divide each entry by ||d_i|| ||q|| (the row norms times |q|) to get [1.000, 0.052, 0.802]; take the argmax. For a batch of queries stacked as rows of Q, D Q^T is every score for every pair -- which is exactly what a vector index computes."
            ),
          ],
        },
      ],
    },
    // Cybersecurity I ----------------------------------------------------
    {
      slug: "fix-password-storage",
      objective: "Hashing vs encryption -- what each guarantees and what neither does",
      kind: "build",
      title: "Fix how a service stores passwords",
      brief:
        "A fictional startup's user table stores password = SHA-256(password) as hex. A reviewer notes that two users with the same password have identical hashes, and that a leaked table could be attacked with precomputed tables and GPUs. The CTO proposes 'encrypting the passwords with AES instead, so we can decrypt them if a user forgets'. Explain what hashing and encryption each guarantee, say why both proposals are wrong for passwords, and specify the right design including how a login is checked.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Contrast the primitives, reject both designs, and specify the correct one.",
          parts: [
            part(
              "What each guarantees",
              "Hash: one-way, fixed-size, deterministic digest; guarantees integrity/fingerprinting (collision and preimage resistance) and cannot be reversed; does not provide confidentiality by itself when inputs are guessable. Encryption: reversible with the key; guarantees confidentiality of the plaintext to anyone without the key; does not by itself guarantee integrity (needs authenticated encryption) and moves the problem to protecting the key. Neither gives authenticity or availability.",
              "A hash is a one-way, deterministic fingerprint: the same input always gives the same digest, you cannot run it backwards, and it is hard to find two inputs with the same output -- which is what integrity checks and signatures need. Encryption is reversible: anyone with the key recovers the plaintext, which is confidentiality, and anyone without it learns nothing -- but a key now has to live somewhere, and plain encryption does not detect tampering unless you use an authenticated mode. Neither proves who sent something or keeps a service up; those are other tools."
            ),
            part(
              "Why both proposals fail for passwords",
              "Plain SHA-256: fast by design (billions of guesses per second on GPUs) and unsalted, so identical passwords collide (visible in the table) and precomputed/rainbow tables work; a hash is the right shape but the wrong function. AES: the server must hold the decryption key to verify logins, so a server compromise yields every plaintext password; 'so we can decrypt for forgetful users' is the anti-goal -- recovery should be a reset, never a reveal.",
              "SHA-256 is the right idea with the wrong properties: it is unsalted, so the two matching users prove something an attacker can see too, and it is built to be fast -- a GPU tests billions of candidates a second against a leaked table, and precomputed tables work because there is no salt. AES is the wrong idea entirely: to check a login the server must decrypt, so it holds the key, so whoever takes the server takes every password in plaintext -- and users reuse passwords elsewhere. Wanting to show a forgotten password is the tell; a forgotten password is replaced by a reset link, never revealed."
            ),
            part(
              "The right design",
              "A slow, salted password-hashing function (scrypt, bcrypt, Argon2 or PBKDF2-HMAC with a high iteration count) with a unique random salt per user, stored alongside the hash with the parameters; login re-derives with the stored salt and parameters and compares in constant time (hmac.compare_digest); optionally a server-side pepper in a separate secret store; raise parameters over time and re-hash on successful login. Shows code or equivalent precise steps.",
              "Store, per user: a random 16-byte salt, the algorithm and its cost parameters, and the derived key -- never the password.\n\nimport hashlib, hmac, os\nsalt = os.urandom(16)\nkey = hashlib.scrypt(pw, salt=salt, n=2**14, r=8, p=1, dklen=32)\n# login:\ncandidate = hashlib.scrypt(attempt, salt=stored_salt, n=2**14, r=8, p=1, dklen=32)\nok = hmac.compare_digest(candidate, stored_key)\n\nThe same password with the same salt derives the same key (so login works); with a different salt it does not (so two users with one password look unrelated and precomputation dies); and scrypt is deliberately slow and memory-hard, so guessing is expensive. Argon2 or bcrypt are equally acceptable; PBKDF2-HMAC-SHA256 with a very high iteration count is the older option. Compare in constant time to avoid timing leaks, keep an optional pepper in a secret store separate from the database, and when hardware gets faster, raise the parameters and re-hash users as they log in."
            ),
          ],
        },
      ],
    },
    // Cybersecurity II ---------------------------------------------------
    {
      slug: "stride-a-telehealth-api",
      objective: "STRIDE or a comparable threat-modeling framework",
      kind: "build",
      title: "Threat-model a telehealth booking API with STRIDE",
      brief:
        "A fictional telehealth startup, Harbor Clinic Online, runs: a mobile app; an API gateway on the internet; a booking service; a Postgres database; a third-party video provider reached over the internet; and an admin web console used by staff over the office Wi-Fi. Patients log in with email and password; the booking service calls the video provider with a shared API key stored in its config file; the database holds appointment notes. Draw the trust boundaries in words, then apply STRIDE to the system and rank the top controls.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Name the boundaries, give one credible threat per STRIDE category with the component it hits, and rank the controls.",
          parts: [
            part(
              "Trust boundaries and data flows",
              "Identifies at least three boundaries: internet <-> API gateway (untrusted clients); gateway/booking <-> database (service tier to data tier); booking service <-> external video provider (crossing to a third party); office Wi-Fi/admin console <-> back end (staff network is not the same trust level as the service). Names the sensitive assets: credentials, appointment notes, the video API key.",
              "Boundary 1: the internet, where the mobile app and any attacker live, meets the API gateway -- every request there is untrusted. Boundary 2: the booking service meets the database -- the data tier should accept only the service, not the world. Boundary 3: the booking service calls out to the video provider across the internet -- a third party with its own failures. Boundary 4: the admin console on office Wi-Fi reaches the back end -- a staff laptop is not a server. Assets that cross them: patient credentials and sessions, appointment notes, and the video API key sitting in a config file."
            ),
            part(
              "STRIDE threats",
              "One concrete threat per letter tied to a component: Spoofing -- credential stuffing against patient logins / forged admin session; Tampering -- modifying a booking request to change another patient's appointment, or altering notes in transit without TLS; Repudiation -- a staff member deletes notes and there is no audit log; Information disclosure -- the API key in a config file leaks via a repo or backup; notes exposed by an IDOR (/appointments/123 readable by anyone logged in); Denial of service -- unauthenticated booking endpoint flooded, exhausting the video provider quota or the database; Elevation of privilege -- a patient account reaching admin endpoints because authorisation is checked in the app, not the API.",
              "Spoofing: credential stuffing against the patient login (reused passwords), or a stolen staff session cookie on the office Wi-Fi used from elsewhere. Tampering: a patient edits the appointment id in a request and reschedules someone else's visit; notes altered in transit if any hop lacks TLS. Repudiation: a staff member deletes an appointment note and the system has no audit trail to say who or when. Information disclosure: the video API key in a config file ends up in a repository or backup; or an insecure direct object reference lets any logged-in user read /appointments/123. Denial of service: the unauthenticated booking endpoint is flooded, exhausting database connections or the video provider's quota. Elevation of privilege: admin endpoints are protected only by the app hiding the buttons, so a patient token calls them directly."
            ),
            part(
              "Ranked controls",
              "Ranks by impact and likelihood with justification, e.g.: (1) server-side authorisation on every object and admin route (fixes IDOR and privilege escalation -- the direct path to notes); (2) move the API key to a secrets manager with rotation, and minimal privileges for the service's DB role; (3) MFA for staff and rate limiting plus breached-password checks for patients; (4) TLS everywhere including service-to-DB and service-to-provider, with authenticated encryption; (5) append-only audit logging of note and appointment changes with alerting; (6) rate limits/quotas and queueing at the gateway for DoS. Frames the ranking in defense-in-depth terms (no single control carries the system) and notes a framework such as NIST CSF 2.0 organises these under Govern/Identify/Protect/Detect/Respond/Recover.",
              "1. Authorisation in the API, per object and per route: every appointment and note request checks that the caller owns it or holds the staff role; admin routes require the role server-side. This closes the shortest path to patient notes (IDOR and privilege escalation). 2. Secrets out of config files: the video key into a secrets manager with rotation, and a database role for the booking service that can touch only its own tables. 3. Identity hardening: MFA for all staff, and for patients rate limiting, lockout and a check against known-breached passwords. 4. TLS on every hop -- app to gateway, service to database, service to provider -- not just the public edge. 5. Append-only audit logs for every change to notes and appointments, with alerts on bulk deletes, so repudiation fails. 6. Gateway rate limits and quotas per client, and a queue in front of the video provider, so a flood degrades rather than topples. No one of these is sufficient; that is defense in depth, and a framework like NIST CSF 2.0 (Govern, Identify, Protect, Detect, Respond, Recover) is how you check nothing -- detection, response, recovery -- was left out."
            ),
          ],
        },
      ],
    },
    // HCI/UX -------------------------------------------------------------
    {
      slug: "heuristic-evaluation-checkout",
      objective: "Nielsen's 10 usability heuristics",
      kind: "build",
      title: "Evaluate a checkout flow against the ten heuristics",
      brief:
        "A fictional ticketing site's checkout, as observed by a reviewer: after 'Pay' the button greys out and nothing else changes for up to 12 seconds; a wrong card number produces 'Error 4012'; the form resets every field if any one is invalid; the 'Promo code' box is labelled 'Apply voucher token'; the back button leaves the flow and empties the basket; prices are shown without fees until the final screen; there is no indication of how many steps remain; the seat map uses red for 'selected' and green for 'unavailable'; the only help is a PDF; and the confirmation page says 'Transaction complete' with no reference number. Apply the heuristics without being told which are relevant, and justify one concrete change by name.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Map the observations to heuristics with severity, then make and justify the top change.",
          parts: [
            part(
              "Observations mapped to heuristics",
              "At least six correct pairings: 12 s with no change -> visibility of system status; 'Error 4012' -> help users recognise, diagnose and recover from errors; resetting all fields -> error prevention and user control (and recognition rather than recall); 'Apply voucher token' -> match between system and the real world; back button emptying the basket -> user control and freedom; fees revealed late -> visibility of system status and match with real-world expectations (also error prevention); no step indicator -> visibility of system status; red = selected / green = unavailable -> consistency and standards; PDF-only help -> help and documentation; no reference number -> recognition rather than recall / visibility.",
              "No feedback for 12 s after Pay -- visibility of system status (high: users click again and get charged twice). 'Error 4012' -- help users recognise, diagnose and recover from errors (high). Clearing every field on one mistake -- error prevention and user control (high). 'Apply voucher token' -- match between system and the real world (medium). Back button empties the basket -- user control and freedom (high). Fees hidden until the end -- visibility of system status and real-world expectations (high; also drives abandonment). No step indicator -- visibility of system status (medium). Red for selected, green for unavailable -- consistency and standards (medium-high; it inverts a convention and fails colour-blind users). PDF-only help -- help and documentation (low-medium). No reference number -- recognition rather than recall (medium: the user has nothing to quote)."
            ),
            part(
              "Severity ranking and rationale",
              "Ranks using frequency, impact and persistence: double-charge risk (no feedback) and basket loss (back button) at the top because they cost money and trust on every purchase; late fees next for abandonment; then error message and field reset; cosmetic/language issues lower. Explains the ranking reasoning rather than listing.",
              "Top: the silent 12 seconds, because the natural response is to click Pay again, and a duplicate charge is the worst outcome a checkout can produce. Next: the back button destroying the basket, because it punishes the most common navigation act and the recovery cost is re-selecting seats. Then late fees -- not a bug, but the single biggest driver of abandonment and a trust failure. Then the error message and field reset, which turn one typo into a restart. Language, the step indicator, help format and the missing reference are real but cheaper and less frequent. Severity is frequency times impact times persistence, not how annoying it felt to the reviewer."
            ),
            part(
              "One concrete change, justified by name",
              "Picks one high-severity item and specifies the design: e.g. for visibility of system status, on Pay show a progress indicator with 'Processing your payment -- this can take up to 15 seconds', disable the button with that state visible, and make the submission idempotent (a client token) so a second click cannot double charge; or, for error recovery, replace 'Error 4012' with 'We couldn't verify the card number -- check the 16 digits' next to the field, keeping all other fields. Names the heuristic and the expected effect.",
              "Change: on Pay, replace the greyed button with an inline status -- a spinner and the text 'Processing your payment. This can take up to 15 seconds; please don't refresh.' -- and send an idempotency token with the request so a repeated submit returns the same result instead of a second charge. Heuristic: visibility of system status -- the system should always keep users informed about what is going on through appropriate feedback within reasonable time. Expected effect: fewer double submissions and refund tickets, lower abandonment during the wait, and a measurable drop in 'was I charged?' support contacts; measure duplicate-charge attempts before and after."
            ),
          ],
        },
      ],
    },
    // Big data systems & data mining -------------------------------------
    {
      slug: "mapreduce-units-per-product",
      objective: "MapReduce as a programming model -- why it forces a certain shape onto a computation",
      kind: "build",
      title: "Shape a sales total as MapReduce",
      brief:
        "A fictional retailer has 2 billion sales records spread across 400 machines, each record (store, product, units). Head office wants total units per product. On a laptop this is one dict and one loop. Express it as MapReduce: write the map and reduce functions, trace them on this sample, explain what the framework does between them, and say what a combiner would add. Then name one computation that does NOT fit this shape well and why.\n\nSample: (Tacoma, umbrella, 3), (Spokane, umbrella, 1), (Tacoma, boots, 2), (Olympia, umbrella, 4), (Spokane, boots, 5), (Tacoma, umbrella, 2), (Olympia, boots, 1)",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write map and reduce, trace the sample, explain shuffle and combiners, and give the counterexample.",
          parts: [
            part(
              "map and reduce",
              "map(record) emits (product, units) for each record, stateless, one record at a time; reduce(product, [units...]) emits (product, sum). Both are pure functions of their inputs with no shared state.",
              "def mapper(record):\n    store, product, units = record\n    yield (product, units)\n\ndef reducer(product, values):\n    return (product, sum(values))\n\nThe mapper looks at one record and emits a key and a value; it keeps no state and never sees another record. The reducer receives one key with every value emitted for it and folds them. Neither function knows how many machines exist."
            ),
            part(
              "Trace and the shuffle",
              "Map output: (umbrella,3), (umbrella,1), (boots,2), (umbrella,4), (boots,5), (umbrella,2), (boots,1). Shuffle/sort groups by key: boots -> [2,5,1], umbrella -> [3,1,4,2]. Reduce: (boots, 8), (umbrella, 10). Explains the framework partitions map output by key hash, moves all values for a key to one reducer, and sorts/groups them -- the shuffle is the expensive network step.",
              "Map emits (umbrella,3), (umbrella,1), (boots,2), (umbrella,4), (boots,5), (umbrella,2), (boots,1). The framework then does the part you never write: it hashes each key to a reducer, ships every pair across the network to that reducer, and sorts and groups them -- boots -> [2, 5, 1], umbrella -> [3, 1, 4, 2]. Reduce gives (boots, 8) and (umbrella, 10). The shuffle is where the time goes: every intermediate pair crosses the network once, so the model is designed so that each key's data lands on exactly one machine."
            ),
            part(
              "Combiner, and what does not fit",
              "A combiner runs the reduce logic locally on each mapper's output before the shuffle (sum is associative and commutative, so partial sums are safe): the Tacoma machine would send (umbrella,5),(boots,2) instead of three pairs, cutting network traffic. Does-not-fit example with reason: iterative algorithms (PageRank, k-means) need many passes with state carried between them, or anything needing a global view/joins across all keys in one step (e.g. median over all records, or a graph traversal) -- MapReduce forces a single group-by-key pass, so these become chains of jobs with disk/network between each.",
              "A combiner is a reducer run on each mapper's own output before anything is shipped. Because addition is associative and commutative, the machine holding Tacoma's three records can send (umbrella, 5) and (boots, 2) instead of three pairs; at 2 billion records that is most of the network traffic gone. It only works for operations where partial results can be merged -- sums and counts yes, a plain median no.\n\nWhat fights the shape: anything iterative or needing a global view. k-means or PageRank need the whole result of one pass before the next can start, so each iteration is a separate job writing to and reading from disk; an exact median needs all values together, not grouped by key; a graph traversal follows edges rather than grouping by key. MapReduce forces 'one independent pass, then one group-by-key', and computations that are not that get bent into many jobs -- which is why later systems keep data in memory across steps."
            ),
          ],
        },
      ],
    },
    // Final integration ---------------------------------------------------
    {
      slug: "trace-a-request-across-trust-boundaries",
      objective: "Explain the flow through distributed systems, networking, authN/authZ, encryption, and trust boundaries",
      kind: "build",
      title: "Trace one request from a phone to the database and back",
      brief:
        "A fictional architecture: a mobile app calls https://api.northlake-fitness.example/me/workouts; DNS resolves the name; a load balancer terminates TLS and forwards to one of several stateless API servers; the API validates a signed access token (a JWT) issued by the company's identity service after login; it reads the caller's workouts from a replicated Postgres database through a connection pool; a cache sits in front of the database; results return as JSON. A reviewer says 'the cloud handles it'. Trace the request layer by layer, and at each hop name what protocol is in play, what proves identity and permission, what is encrypted, and which trust boundary is crossed. Then state one failure at each of three layers and how the design survives or does not.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Trace the hops, mark the boundaries and controls, then give the three failures.",
          parts: [
            part(
              "Phone to the edge",
              "DNS resolves the name (UDP/TCP 53, or DoH/DoT); TCP handshake then TLS handshake with the load balancer -- the server certificate, chained to a trusted CA, proves the API's identity to the phone (the client is not yet authenticated); the request and the bearer token travel encrypted in the TLS session; boundary crossed: untrusted internet -> the company's edge. Notes HTTP semantics (GET /me/workouts, Authorization: Bearer ...).",
              "The app asks DNS for api.northlake-fitness.example (plain UDP 53 unless DoH/DoT), opens a TCP connection to the returned address and runs a TLS handshake with the load balancer. The certificate the balancer presents, chained to a CA the phone trusts, proves the phone is talking to Northlake and not an impostor; nothing yet proves who the phone is. Inside the encrypted channel goes an HTTP GET /me/workouts with Authorization: Bearer <JWT>. Boundary one: the open internet into Northlake's edge -- the TLS termination point is where the company's trust begins."
            ),
            part(
              "Edge to API: authentication and authorisation",
              "The balancer forwards over the internal network (ideally TLS again -- mutual TLS or at least encrypted; plaintext inside the VPC is a choice to name) to a stateless API server; the API verifies the JWT's signature with the identity service's public key (asymmetric), checks expiry, issuer and audience -- that is authentication; it then takes the user id from the token and queries only that user's workouts -- that is authorisation (the '/me' route must be bound to the token's subject, never a client-supplied id). Boundary: edge -> application tier; the identity service is a separate trusted party whose key the API trusts.",
              "The balancer passes the request to one API server over the internal network -- encrypted again if the design is honest (service-to-service TLS), and a named risk if it is not. The API checks the JWT: signature verified with the identity service's public key (asymmetric, so the API never holds the signing secret), then expiry, issuer and audience. That is authentication -- the token says who. Authorisation is the next line: the handler reads the subject claim and queries workouts where user_id = that subject; it must never take a user id from the URL or body for /me. Boundary two: edge into the application tier, with the identity service as a third trusted component whose key is the trust anchor."
            ),
            part(
              "API to cache and database, and back",
              "Cache lookup (keyed by user id) first; on a miss, a pooled connection to the primary (or a read replica -- naming the consistency trade: a replica may lag) over TLS with the service's own database credentials, least-privilege role; the database trusts the API server's credentials, not the end user's token (the API is the boundary between user identity and database identity); encryption at rest for the data; JSON response back along the same TLS session; the cache is populated with a TTL. Boundary: application tier -> data tier.",
              "The API checks the cache under the user's id -- a hit skips the database and returns in microseconds; a stale entry is the price, bounded by its TTL. On a miss it borrows a pooled connection (pools exist because opening one per request is slow and exhausts the database) and queries over TLS using the service's database role -- a least-privilege role that can read and write workouts and nothing else. The database trusts that role, not the end user: the API server is the point where user identity is translated into service identity, and that translation is where authorisation must have already happened. Reading from a replica is faster and may be a few hundred milliseconds behind the primary -- a workout saved a moment ago might not appear, which is a consistency choice to make deliberately. Data is encrypted at rest on disk. The rows become JSON, the cache is filled with a TTL, and the response goes back through the same TLS session to the phone. Boundary three: application tier into the data tier."
            ),
            part(
              "Three failures",
              "One per layer with the outcome: network (DNS or balancer failure -> multiple balancer addresses / health checks and anycast, or an outage); application (an API server dies mid-request -> stateless servers behind the balancer mean a retry lands elsewhere; a leaked signing key -> every token can be forged, rotate keys and short expiries); data (primary database fails -> failover to a replica with possible loss of unreplicated writes, or the cache serves stale data until TTL; cache cluster fails -> database takes full load, needs capacity or graceful degradation). States which failures the design survives and which it does not.",
              "Network: the load balancer or DNS fails. With health-checked balancers in two zones and a short DNS TTL the phone reaches another; with one balancer the service is down for everyone, however healthy the API is. Application: an API server crashes mid-request. Because the servers are stateless the client's retry lands on another server and succeeds -- that is why the state lives in the token, the cache and the database, not on the server. If instead the identity service's signing key leaks, every token in the world can be forged until the key is rotated and old tokens expire, which is why expiries are short and keys are rotated. Data: the primary database dies. A replica is promoted; writes acknowledged in the last moments before failover may be lost unless replication was synchronous, and the cache keeps answering from memory for its TTL -- the service survives, slightly stale and briefly read-only. 'The cloud handles it' is true only for the parts someone configured to be handled, and each of these is a decision with a cost."
            ),
          ],
        },
      ],
    },
  ],
};
