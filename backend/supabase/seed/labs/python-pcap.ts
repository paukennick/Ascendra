import { GENERAL_SAFETY, matchPart, numericPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-264: Prep for the Certified Associate Python Programmer (PCAP) Exam,
// PCAP-31-04.
//
// Density (docs/labs.md, "hybrid"): one lab per section plus six weighted
// extras by the syllabus weights 12/12/9.5/28.5/24/14 -> 2 / 2 / 1 / 3 / 2 /
// 2 = 12 labs, one per objective (11 build, 1 case). The AI-assistance lab is
// a case because the syllabus's 6.3.2 is a review judgment over several
// steps (read, run, check the APIs exist, keep secrets out).
//
// Every snippet was run on CPython 3.13.18 on 2026-11-14 and the outputs
// quoted are those observed. Nothing depends on a 3.14/3.15-only feature;
// where 3.15 adds a shorter form (unpacking in comprehensions, PEP 798) the
// lab says so. People and companies are fictional.

export const PCAP_LABS: SeedLabSet = {
  trackCode: "PCAP",
  sources: [
    source("https://pythoninstitute.org/pcap-exam-syllabus", "exam_outline", "2026-11-14"),
    source("https://docs.python.org/3/tutorial/index.html", "reference", "2026-11-14"),
    source("https://docs.python.org/3/library/index.html", "reference", "2026-11-14"),
    source("https://docs.python.org/3/whatsnew/3.15.html", "reference", "2026-11-14"),
  ],
  labs: [
    // ---------------------------------------------------------------- Section 1 (2)
    {
      slug: "pcap-import-fails-from-root",
      objective: "Inspect a module with dir() and diagnose an import failure from sys.path and the package layout",
      kind: "build",
      title: "Explain why an import works from one place and fails from another",
      brief:
        "Tidewater Books (fictional) has this layout:\n\nproject/\n  app/\n    main.py          # from shop.pricing import with_tax\n    shop/\n      __init__.py\n      pricing.py     # TAX = 0.1; def with_tax(p): ...\n\nFrom project/, python app/main.py prints 11.0. But python -c \"from shop.pricing import with_tax\" run from project/ fails with ModuleNotFoundError: No module named 'shop'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain both results from sys.path, give two sound fixes, and say what dir() shows for the pricing module.",
          parts: [
            part(
              "Why one works and one fails",
              "States that when a script is run, the script's own directory (app/) is put first on sys.path, so shop is found there; with -c the first entry is the current directory (project/), which has no shop package.",
              "Python searches sys.path in order. Running python app/main.py puts app/ (the script's directory) first, and app/shop is a package, so the import works. With -c, sys.path[0] is the current directory, project/, which contains app/ but no shop/, so the import fails."
            ),
            part(
              "Two fixes",
              "Any two sound fixes: import it by its full package path after making app a package (from app.shop.pricing import ...) and run with python -m; run from inside app/; install the project into the environment (pip install -e .); set PYTHONPATH=app for that process. Changing sys.path in code is acceptable only as a stated, narrow workaround.",
              "Make app a package (add app/__init__.py) and import by qualified name, from app.shop.pricing import with_tax, run as python -m app.main from project/. Or package the project and pip install -e . so shop is importable from anywhere. Setting PYTHONPATH=app or sys.path.insert(0, \"app\") also works for one process but hides the layout problem."
            ),
            part(
              "dir() of the module",
              "Says [n for n in dir(pricing) if not n.startswith('__')] is ['TAX', 'with_tax'], and that dir() also lists dunder names such as __name__ and __file__.",
              "import shop.pricing as pricing; dir(pricing) lists the module's names: TAX and with_tax, plus attributes such as __name__, __file__ and __doc__."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcap-main-guard-module",
      objective: "Write a reusable module guarded by if __name__ == \"__main__\", and explain what __pycache__ holds",
      kind: "build",
      title: "Stop a module from running its demo when it is imported",
      brief:
        "units.py at Copper Kettle Labs (fictional):\n\ndef c_to_f(c):\n    return c * 9 / 5 + 32\n\nprint(\"Demo:\", c_to_f(100))\n\nEvery script that does import units prints \"Demo: 212.0\". After the first import a __pycache__ folder appears next to units.py.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Fix the module so the demo runs only when executed directly, and explain __name__ and __pycache__.",
          parts: [
            part(
              "Fixed module",
              "Moves the demo under if __name__ == \"__main__\": (optionally in a main() function), leaving c_to_f importable without side effects.",
              "def c_to_f(c):\n    return c * 9 / 5 + 32\n\nif __name__ == \"__main__\":\n    print(\"Demo:\", c_to_f(100))\n\nImporting runs the def only; python units.py still prints Demo: 212.0."
            ),
            part(
              "Why it works",
              "States that __name__ is \"__main__\" when the file is run as a script and the module name (\"units\") when it is imported.",
              "The interpreter sets __name__ to \"__main__\" for the file it runs and to \"units\" when the file is imported, so the guard is true only for direct runs."
            ),
            part(
              "__pycache__",
              "Says it holds cached compiled bytecode (.pyc, named with the interpreter tag such as units.cpython-313.pyc) so later imports skip recompiling; it is safe to delete and should not be committed.",
              "__pycache__ holds bytecode compiled from units.py, e.g. units.cpython-313.pyc. Python reuses it while the source is unchanged to skip compiling on import. It is regenerated automatically, so it can be deleted and is normally listed in .gitignore."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Section 2 (2)
    {
      slug: "pcap-try-else-finally-order",
      objective: "Analyze how try, except, else and finally run together for handled and unhandled exceptions",
      kind: "build",
      title: "Put try, except, else and finally output in order",
      brief:
        "A code-review quiz at Marlow Software (fictional) shows this function:\n\ndef run(x):\n    try:\n        print(\"try\")\n        r = 10 / x\n    except ZeroDivisionError:\n        print(\"except\")\n        return \"zero\"\n    else:\n        print(\"else\")\n        return r\n    finally:\n        print(\"finally\")\n\nprint(run(2))\nprint(run(0))",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Order the eight printed lines, and explain where finally runs relative to return.",
          parts: [
            orderPart(
              "Printed lines in order",
              "The exact order: try, else, finally, 5.0, try, except, finally, zero.",
              "try / else / finally / 5.0 / try / except / finally / zero. finally runs as the function is leaving -- after the return value is computed but before the caller's print receives it.",
              ["try", "else", "finally", "5.0", "try (second call)", "except", "finally (second call)", "zero"]
            ),
            part(
              "else and finally",
              "else runs only when the try block raised nothing; finally runs on every exit (normal, return, or exception), after the return expression is evaluated and before control reaches the caller.",
              "else runs only if try completed without an exception, which keeps code that should not be protected out of the try. finally always runs; a return inside except or else is evaluated first, then finally runs, then the value goes back to the caller."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcap-inventory-exception-hierarchy",
      objective: "Design a small hierarchy of custom exceptions that carry useful detail and handle them at the right level",
      kind: "build",
      title: "Design inventory exceptions a caller can act on",
      brief:
        "Lakeshore Supply's (fictional) order code raises bare Exception(\"no stock\") in three places: an unknown SKU, too little stock, and a discontinued item. The checkout page catches Exception and shows \"Something went wrong\" for all three, and also swallows real bugs such as TypeError.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the exception classes, show one being raised and caught, and explain the handler order.",
          parts: [
            part(
              "Hierarchy",
              "A base class deriving from Exception (e.g. InventoryError) with subclasses for each condition (UnknownSku, OutOfStock, Discontinued); at least one stores useful attributes and passes a message to super().__init__.",
              "class InventoryError(Exception):\n    pass\n\nclass UnknownSku(InventoryError):\n    pass\n\nclass Discontinued(InventoryError):\n    pass\n\nclass OutOfStock(InventoryError):\n    def __init__(self, sku, wanted, have):\n        super().__init__(f\"{sku}: wanted {wanted}, have {have}\")\n        self.sku, self.wanted, self.have = sku, wanted, have"
            ),
            part(
              "Raise and catch",
              "Raises OutOfStock(\"A1\", 5, 2), catches it as OutOfStock or InventoryError with as, and uses its attributes; str(e) is 'A1: wanted 5, have 2' and e.args is that one-string tuple.",
              "try:\n    raise OutOfStock(\"A1\", 5, 2)\nexcept InventoryError as e:\n    print(type(e).__name__, e, e.have)\n\nprints: OutOfStock A1: wanted 5, have 2 2. e.args is ('A1: wanted 5, have 2',), the argument given to super().__init__."
            ),
            part(
              "Handler order and scope",
              "Specific handlers (OutOfStock) come before the base (InventoryError), because the first matching except wins; checkout catches InventoryError, not Exception, so TypeError and other bugs still surface.",
              "except OutOfStock: (offer a smaller quantity) must come before except InventoryError: (generic message) -- a base-class handler placed first would catch every subclass. Catching InventoryError instead of Exception lets programming errors such as TypeError propagate and get fixed."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Section 3 (1)
    {
      slug: "pcap-sort-by-code-point",
      objective: "Predict how comparisons and sorting order strings by code point and case, and how operations build new strings",
      kind: "build",
      title: "Explain why a product list sorts strangely",
      brief:
        "Orchard Lane Deli (fictional) sorts menu items with sorted():\n\nitems = [\"banana\", \"Apple\", \"cherry\", \"apple\", \"Éclair\"]\nprint(sorted(items))\nprint(sorted(items, key=str.lower))\nprint(\"Zebra\" < \"apple\", ord(\"Z\"), ord(\"a\"), ord(\"É\"))",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Predict each line and explain the ordering rule.",
          parts: [
            part(
              "Both sorted lists",
              "Both print ['Apple', 'apple', 'banana', 'cherry', 'Éclair']: plain sorting puts 'Apple' (A is 65) before lowercase words (97+); with key=str.lower ties keep their original order (stable sort), and 'Éclair' is last in both because É (201, é 233) is above every ASCII letter.",
              "['Apple', 'apple', 'banana', 'cherry', 'Éclair'] both times. Strings compare code point by code point. Uppercase A-Z (65-90) sort before lowercase a-z (97-122); lowercasing makes Apple and apple equal, and the stable sort keeps their input order. É is 201 and é is 233, above z (122), so lowercasing does not move Éclair next to the e words."
            ),
            matchPart(
              "Last line values",
              "\"Zebra\" < \"apple\" is True (Z 90 < a 97); ord(\"Z\") 90; ord(\"a\") 97; ord(\"É\") 201.",
              "True, 90, 97, 201. Comparison stops at the first differing code point: Z (90) is less than a (97), so the capitalized word sorts first.",
              {
                left: ["\"Zebra\" < \"apple\"", "ord(\"Z\")", "ord(\"a\")", "ord(\"É\")"],
                right: ["True", "90", "97", "201", "False", "233"],
                pairs: [0, 1, 2, 3],
              }
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Section 4 (3)
    {
      slug: "pcap-class-attribute-shadowing",
      objective: "Use class variables for shared data and instance variables for per-object state, and predict when an instance attribute hides a class attribute",
      kind: "build",
      title: "Find where a shared counter splits in two",
      brief:
        "A ticket counter at Bramble Theater (fictional):\n\nclass Counter:\n    total = 0\n    def __init__(self, name):\n        self.name = name\n        Counter.total += 1\n    def bump(self):\n        self.total += 1\n\na = Counter(\"a\")\nb = Counter(\"b\")\na.bump()\nprint(Counter.total, a.total, b.total)\nprint(\"total\" in a.__dict__, \"total\" in b.__dict__)",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Predict both lines, explain them, and fix bump so it increments the shared count.",
          parts: [
            numericPart(
              "a.total",
              "3: self.total += 1 reads the class value 2 through the instance and writes 3 into a new instance attribute.",
              "a.total is 3. self.total += 1 means self.total = self.total + 1: the read finds Counter.total (2), the write creates a.total = 3 in a's own __dict__.",
              { answer: 3, tolerance: 0 }
            ),
            part(
              "Both lines",
              "Prints 2 3 2 then True False; Counter.total and b.total are still 2 because the class attribute was never changed; only a has its own total.",
              "2 3 2\nTrue False\n\nThe two constructors raised Counter.total to 2. a now has an instance attribute total that hides the class one for a only; b still reads the class attribute."
            ),
            part(
              "Fix",
              "Writes to the class explicitly (Counter.total += 1 or type(self).total += 1, or a classmethod using cls.total).",
              "def bump(self):\n    type(self).total += 1\n\n(or Counter.total += 1, or a @classmethod that does cls.total += 1). Writing through self always creates or changes an instance attribute."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcap-diamond-mro-super",
      objective: "Resolve a diamond-shaped multiple-inheritance call with the MRO and cooperative super()",
      kind: "build",
      title: "Trace super() through a diamond, then break the chain",
      brief:
        "class Base:\n    def setup(self):\n        print(\"Base.setup\")\n\nclass Logging(Base):\n    def setup(self):\n        print(\"Logging.setup\"); super().setup()\n\nclass Metrics(Base):\n    def setup(self):\n        print(\"Metrics.setup\"); super().setup()\n\nclass Service(Logging, Metrics):\n    def setup(self):\n        print(\"Service.setup\"); super().setup()\n\nService().setup()\n\nThen a teammate at Aspen Telemetry (fictional) adds Metrics2(Base), whose setup prints \"Metrics2.setup\" and does NOT call super(), and defines class Service2(Logging, Metrics2): pass.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give Service's MRO and output, then Service2().setup()'s output and why.",
          parts: [
            orderPart(
              "Service.__mro__",
              "Service, Logging, Metrics, Base, object.",
              "Service -> Logging -> Metrics -> Base -> object (C3 linearization: each class before its bases, left-to-right order of the bases kept, Base only after both of its subclasses).",
              ["Service", "Logging", "Metrics", "Base", "object"]
            ),
            part(
              "Service().setup() output",
              "Service.setup, Logging.setup, Metrics.setup, Base.setup -- each super() goes to the NEXT class in the instance's MRO, so Logging's super() reaches Metrics, not Base, and Base runs once.",
              "Service.setup\nLogging.setup\nMetrics.setup\nBase.setup\n\nsuper() in Logging means \"next after Logging in type(self).__mro__\", which for a Service is Metrics. That is what makes cooperative multiple inheritance call every class exactly once."
            ),
            part(
              "Service2().setup()",
              "Prints Logging.setup then Metrics2.setup, and Base.setup never runs, because Metrics2 does not call super() and ends the chain; Service2 has no setup, so lookup starts at Logging.",
              "Logging.setup\nMetrics2.setup\n\nService2 inherits setup from Logging (first in the MRO Service2, Logging, Metrics2, Base, object). Logging's super() goes to Metrics2, which does not call super(), so Base.setup is skipped. In a cooperative design every override calls super()."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcap-validated-initializer",
      objective: "Validate constructor arguments, raise on bad input, and avoid mutable default parameters",
      kind: "build",
      title: "Harden a booking class that shares one extras list",
      brief:
        "Cedar Point Inn (fictional):\n\nclass Booking:\n    def __init__(self, guest, nights=1, extras=[]):\n        self.guest = guest\n        self.nights = nights\n        self.extras = extras\n\nx = Booking(\"Ito\")\ny = Booking(\"Moss\")\nx.extras.append(\"breakfast\")\nprint(y.extras)\n\nIt prints ['breakfast'], and Booking(\"Kim\", nights=0) is accepted.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the shared list, then write an initializer that validates guest and nights and gives each booking its own extras.",
          parts: [
            part(
              "Why y has breakfast",
              "The default list is created once when def runs and shared by every call that omits extras, so x.extras and y.extras are the same object.",
              "extras=[] is evaluated once, at definition time. Both bookings that omit extras receive that one list, so appending through x shows in y."
            ),
            part(
              "Fixed initializer",
              "Uses extras=None and creates a new list (copying any list passed in); raises ValueError for nights that are not a positive int and for a blank guest; strips the guest name.",
              "def __init__(self, guest, nights=1, extras=None):\n    if not isinstance(nights, int) or nights < 1:\n        raise ValueError(\"nights must be a positive int\")\n    if not guest.strip():\n        raise ValueError(\"guest is required\")\n    self.guest = guest.strip()\n    self.nights = nights\n    self.extras = [] if extras is None else list(extras)\n\nBooking(\"Kim\", nights=0) now raises ValueError: nights must be a positive int; Booking(\" Kim \", nights=2).guest is 'Kim'."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Section 5 (2)
    {
      slug: "pcap-nested-comprehensions",
      objective: "Write and trace nested comprehensions, including flattening a list of lists",
      kind: "build",
      title: "Flatten and filter a ragged list of lists",
      brief:
        "Shift data at Meadowbrook Clinic's (fictional) scheduling office arrives as rows of different lengths:\n\nmatrix = [[1, 2, 3], [4, 5], [6]]\n\nProduce: (1) one flat list of every value; (2) the even values times 10, flat; (3) the same shape with every value squared; (4) the coordinate pairs (r, c) for r in range(2) and c in range(3) where r != c.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write each comprehension, give its result, and explain the order of the for clauses.",
          parts: [
            part(
              "Flat and filtered",
              "[x for row in matrix for x in row] -> [1, 2, 3, 4, 5, 6]; [x * 10 for row in matrix for x in row if x % 2 == 0] -> [20, 40, 60]. for clauses read left to right like nested loops (outer first). Mentions that on Python 3.15+ [*row for row in matrix] also flattens (PEP 798), but not on earlier versions.",
              "flat = [x for row in matrix for x in row]          # [1, 2, 3, 4, 5, 6]\nevens = [x * 10 for row in matrix for x in row if x % 2 == 0]   # [20, 40, 60]\n\nThe for clauses nest in the order written: for row ... is the outer loop. Python 3.15 adds unpacking in comprehensions, [*row for row in matrix]; on 3.14 and earlier use the form above or itertools.chain.from_iterable(matrix)."
            ),
            part(
              "Same shape, squared",
              "[[x * x for x in row] for row in matrix] -> [[1, 4, 9], [16, 25], [36]]: an inner comprehension per row keeps the shape.",
              "[[x * x for x in row] for row in matrix]   # [[1, 4, 9], [16, 25], [36]]\nA comprehension inside the expression builds one list per row; two for clauses in one comprehension would flatten instead."
            ),
            part(
              "Coordinate pairs",
              "[(r, c) for r in range(2) for c in range(3) if r != c] -> [(0, 1), (0, 2), (1, 0), (1, 2)].",
              "[(r, c) for r in range(2) for c in range(3) if r != c]\n-> [(0, 1), (0, 2), (1, 0), (1, 2)]: r = 0 with c = 1, 2, then r = 1 with c = 0, 2."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcap-closure-late-binding",
      objective: "Create closures and function factories that capture values from an enclosing scope",
      kind: "build",
      title: "Fix multipliers that all multiply by the same number",
      brief:
        "Granite Peak Analytics (fictional) builds scaling functions:\n\ndef make_multipliers():\n    return [lambda x: x * i for i in range(3)]\n\nprint([f(10) for f in make_multipliers()])\n\nThe author expected [0, 10, 20].",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Predict the output, explain it, fix it, and write a discount factory make_discount(rate).",
          parts: [
            part(
              "Output and cause",
              "Prints [20, 20, 20]: closures capture the variable i, not its value at creation, and look it up when called, by which time the loop has finished with i = 2.",
              "[20, 20, 20]. Each lambda closes over the same variable i from the comprehension's scope and reads it when called. All are called after the loop ends, when i is 2."
            ),
            part(
              "Fix",
              "Binds the current value at creation, e.g. lambda x, i=i: x * i, or a factory function def times(n): return lambda x: x * n; result [0, 10, 20].",
              "return [lambda x, i=i: x * i for i in range(3)]   # [0, 10, 20]\nA default value is evaluated when the lambda is created, so each function keeps its own i. A factory, def times(n): return lambda x: x * n, does the same through a separate scope per call."
            ),
            part(
              "Discount factory",
              "def make_discount(rate): def apply(price): return round(price * (1 - rate), 2); return apply; make_discount(0.10)(80) is 72.0; rate lives in the closure.",
              "def make_discount(rate):\n    def apply(price):\n        return round(price * (1 - rate), 2)\n    return apply\n\nten = make_discount(0.10)\nten(80)   # 72.0\n\nrate is kept in ten.__closure__ after make_discount has returned."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Section 6 (2)
    {
      slug: "pcap-boundary-test-cases",
      objective: "Design isolated unit tests with typical, boundary and invalid inputs and check results with assertions",
      kind: "build",
      title: "Write boundary tests for a parcel-size rule",
      brief:
        "Bayview Couriers (fictional):\n\ndef shipping_band(kg):\n    if not isinstance(kg, (int, float)) or kg <= 0:\n        raise ValueError(\"kg must be positive\")\n    if kg <= 2:\n        return \"small\"\n    if kg <= 10:\n        return \"medium\"\n    return \"large\"\n\nWrite tests that would catch someone changing <= to < on either boundary.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the inputs, write the tests as separate functions, and say why each is there.",
          parts: [
            selectPart(
              "Boundary inputs to include",
              "Selects exactly 2, 2.01, 10 and 10.01 (each side of each boundary); 5 and 50 are typical values, not boundaries.",
              "2 and 2.01 straddle the small/medium edge; 10 and 10.01 straddle medium/large. With < instead of <=, shipping_band(2) would return medium and shipping_band(10) large, so the tests at exactly 2 and 10 fail.",
              { lines: ["5", "2", "2.01", "50", "10", "10.01"], correct: [1, 2, 4, 5], display: "list" }
            ),
            part(
              "Tests",
              "Separate, isolated test functions (pytest or unittest) asserting 2 -> small, 2.01 -> medium, 10 -> medium, 10.01 -> large, a typical value, and that 0, -1 and a string raise ValueError (pytest.raises or assertRaises).",
              "import pytest\n\ndef test_small_upper_edge():\n    assert shipping_band(2) == \"small\"\n\ndef test_just_over_small():\n    assert shipping_band(2.01) == \"medium\"\n\ndef test_medium_upper_edge():\n    assert shipping_band(10) == \"medium\"\n\ndef test_large():\n    assert shipping_band(10.01) == \"large\"\n\n@pytest.mark.parametrize(\"bad\", [0, -1, \"3\"])\ndef test_invalid(bad):\n    with pytest.raises(ValueError):\n        shipping_band(bad)\n\nEach test checks one behavior, so a failure names exactly what broke."
            ),
            part(
              "A gap the tests reveal",
              "Notes that True passes isinstance(kg, int) (bool is a subclass of int), so shipping_band(True) returns small; proposes rejecting bool explicitly, or says what the rule should be.",
              "bool is a subclass of int, so shipping_band(True) returns \"small\" instead of raising. If that matters, add isinstance(kg, bool) to the invalid check and a test for it."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcap-review-ai-suggestion",
      objective: "Validate AI-generated code before using it: run and test it, confirm every API it calls exists, and keep secrets and personal data out of prompts",
      kind: "case",
      title: "Review an AI assistant's suggestion before it is merged",
      brief:
        "A developer at Foxglove Payroll (fictional) asked an AI coding assistant for a function that averages overtime hours read from a JSON file. The assistant returned:\n\nimport json, statistics\n\ndef average_overtime(path):\n    data = json.load(open(path))\n    return statistics.average([e[\"overtime\"] for e in data])\n\nThe pull request says \"AI-generated, looks right\" and has no tests.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "Before reviewing, you notice the developer pasted the real payroll file, with employee names and salaries, into the prompt to \"give the assistant context\".",
          ask: "What do you raise about the prompt, and what should the developer have given the assistant instead?",
          parts: [
            part(
              "Data protection",
              "Flags that personal and salary data was sent to an outside tool without need or approval; says to follow the organization's AI-use policy (report it if required), and to give the assistant a small synthetic sample with the same structure instead.",
              "Real names and salaries are personal data and should not be pasted into an AI tool unless the organization has approved that tool for such data. Raise it under the AI-use policy. The assistant only needed the shape: a two-record made-up sample such as [{\"name\": \"A\", \"overtime\": 3}] plus the requirements (what to return for an empty file, which errors to raise)."
            ),
          ],
        },
        {
          text: "You run the suggested function on a sample file. It fails with AttributeError: module 'statistics' has no attribute 'average'.",
          ask: "What is wrong with the code, and what fixed version would you approve?",
          parts: [
            part(
              "Defects",
              "Names the hallucinated API (statistics has mean, not average) and the unclosed file from json.load(open(path)); notes empty data would raise statistics.StatisticsError and missing keys KeyError.",
              "statistics.average does not exist -- the function is statistics.mean. open(path) is never closed; use with. An empty list makes statistics.mean raise StatisticsError, and an entry without \"overtime\" raises KeyError; the requirements should say what happens then."
            ),
            part(
              "Fixed function",
              "Uses with open(path, encoding=\"utf-8\"), json.load, statistics.mean, and handles or documents the empty case; for overtime values 3, 4 and 8 the mean is 5.",
              "import json, statistics\n\ndef average_overtime(path):\n    with open(path, encoding=\"utf-8\") as f:\n        data = json.load(f)\n    hours = [e[\"overtime\"] for e in data]\n    if not hours:\n        return 0.0\n    return statistics.mean(hours)\n\nFor overtime values 3, 4 and 8 it returns 5."
            ),
          ],
        },
        {
          text: "The developer updates the pull request. CI now runs the test suite.",
          ask: "What must be true before you approve the merge?",
          parts: [
            part(
              "Merge criteria",
              "Tests for typical data, an empty file and a malformed entry exist and pass in CI; every called API was checked to exist; a human reviewer has read and understood the code and takes responsibility for it; no secrets or personal data are in the code, tests or fixtures.",
              "Tests covering normal data, an empty list and a record missing \"overtime\" pass in CI. The reviewer has confirmed each library call exists and behaves as used (here, statistics.mean). Fixtures use synthetic data. The approving human, not the assistant, is responsible for the merged code."
            ),
          ],
        },
      ],
    },
  ],
};
