import { GENERAL_SAFETY, matchPart, numericPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-264: Prep for the Certified Entry-Level Python Programmer (PCEP) Exam,
// PCEP-30-03.
//
// Density (docs/labs.md, "hybrid"): one lab per section plus six weighted
// extras by the syllabus weights 17/23/26/20/14 -> 2 / 2 / 3 / 2 / 2 = 11
// labs, one per objective. Each lab is the kind of item the exam's
// "read, trace, complete and write" profile describes: predict output,
// fix a defect, write the short program.
//
// Every code snippet in a brief or model answer was run on CPython 3.13.18
// on 2026-11-14 and the outputs quoted are the outputs observed; nothing
// depends on a 3.14/3.15-only feature. The people and companies are
// fictional.

export const PCEP_LABS: SeedLabSet = {
  trackCode: "PCEP",
  sources: [
    source("https://pythoninstitute.org/pcep-exam-syllabus", "exam_outline", "2026-11-14"),
    source("https://docs.python.org/3/tutorial/index.html", "reference", "2026-11-14"),
    source("https://docs.python.org/3/library/index.html", "reference", "2026-11-14"),
  ],
  labs: [
    // ---------------------------------------------------------------- Section 1 (2)
    {
      slug: "pcep-operator-precedence-trace",
      objective: "Evaluate expressions using arithmetic, string, comparison and Boolean operators with correct precedence and associativity",
      kind: "build",
      title: "Predict six expressions the way the interpreter evaluates them",
      brief:
        "A study partner at Larch Street Coding Club (fictional) wrote this snippet and bet you can't predict every line without running it.\n\nx = 7\ny = 2\nprint(x // y * 3 + x % y ** 2)\nprint(-x // y, -x % y)\nprint(2 ** 3 ** 2 / 4)\nprint(not x > 5 or y == 2 and x < 0)\nprint(\"ab\" * 2 + \"c\")\nprint(10 / 4, 10 // 4)\n\nGive each printed line and the operator rule that decides it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the value of the first line, then match each remaining expression to what it prints, and explain the rules involved.",
          parts: [
            numericPart(
              "Line 1 value",
              "12 exactly. ** binds tightest (y ** 2 is 4), then //, * and % left to right at one level (7 // 2 is 3, times 3 is 9; 7 % 4 is 3), then + (9 + 3).",
              "12. y ** 2 is evaluated first (4); then x // y * 3 left to right is 3 * 3 = 9 and x % 4 is 3; 9 + 3 = 12.",
              { answer: 12, tolerance: 0 }
            ),
            matchPart(
              "What each line prints",
              "All four pairs right is met; three right is partly there.",
              "-x // y, -x % y prints -4 1: // floors toward minus infinity (-3.5 becomes -4) and % takes the sign of the divisor. 2 ** 3 ** 2 / 4 prints 128.0: ** is right-associative (3 ** 2 = 9, 2 ** 9 = 512) and / always gives a float. not x > 5 or y == 2 and x < 0 prints False: not applies to the comparison (False), and binds before or (True and False is False), so False or False. \"ab\" * 2 + \"c\" prints ababc: * repeats a string before + joins.",
              {
                left: ["-x // y, -x % y", "2 ** 3 ** 2 / 4", "not x > 5 or y == 2 and x < 0", "\"ab\" * 2 + \"c\""],
                right: ["-4 1", "128.0", "False", "ababc", "-3 -1", "16.0", "True"],
                pairs: [0, 1, 2, 3],
                leftHeading: "Expression",
                rightHeading: "Printed",
              }
            ),
            part(
              "The last line",
              "States it prints 2.5 2 and explains that / is true division returning a float, while // is floor division returning an int for int operands.",
              "2.5 2. / always returns a float (10 / 4 is 2.5, and even 10 / 5 is 2.0); // floors the quotient, and with two ints the result is an int (2)."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcep-console-input-conversion",
      objective: "Read console input, convert it with int(), float() or str(), and print the processed result",
      kind: "build",
      title: "Fix a calculator that concatenates instead of adding",
      brief:
        "Brightwater Library's (fictional) volunteer sign-in script asks for hours worked on two days and should print the total:\n\nday1 = input(\"Hours on day 1: \")\nday2 = input(\"Hours on day 2: \")\nprint(\"Total:\", day1 + day2)\n\nA volunteer types 12 and 30 and sees \"Total: 1230\". Volunteers sometimes type half hours such as 2.5.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the output, fix the script so it adds correctly and accepts half hours, and say what still goes wrong if someone types \"two\".",
          parts: [
            part(
              "Why 1230",
              "States that input() always returns a str, so + concatenates the two strings \"12\" and \"30\" instead of adding numbers.",
              "input() returns a string whatever the user types. \"12\" + \"30\" is string concatenation, giving \"1230\"."
            ),
            part(
              "Fixed script",
              "Converts each input with float() (int() would reject 2.5) before adding, and prints the sum; for 12 and 30 the total shown is 42.0 (or 42 if formatted).",
              "day1 = float(input(\"Hours on day 1: \"))\nday2 = float(input(\"Hours on day 2: \"))\nprint(\"Total:\", day1 + day2)\n\nWith 12 and 30 this prints Total: 42.0; with 2.5 and 3 it prints Total: 5.5. int() would raise ValueError on \"2.5\", so float() is the right conversion here."
            ),
            part(
              "Typing two",
              "Says float(\"two\") raises ValueError (could not convert string to float) and the program stops unless the conversion is wrapped in try/except ValueError.",
              "float(\"two\") raises ValueError: could not convert string to float: 'two'. The script crashes with a traceback unless the conversion is inside try ... except ValueError, which could print a message and ask again."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Section 2 (2)
    {
      slug: "pcep-shipping-fee-conditions",
      objective: "Write combined and nested conditions so that every case in a stated rule takes the intended path",
      kind: "build",
      title: "Repair a shipping-fee rule whose branches are in the wrong order",
      brief:
        "Fernhill Crafts (fictional) charges shipping like this: a weight of 0 or less is invalid; standard shipping is 5 for parcels up to 5 kg and 9 above; express is 15 up to 5 kg and 25 above; members ship standard for free but pay full express prices.\n\nThe current function:\n\ndef fee(weight, express, member):\n    if member:\n        return 0\n    elif weight <= 5:\n        return 5\n    elif express:\n        return 15\n    else:\n        return 9\n\nCalls: fee(3, True, True) returns 0, fee(3, True, False) returns 5, fee(8, True, False) returns 15.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the wrong results, then write a corrected function and give its results for the test calls.",
          parts: [
            selectPart(
              "Which results break the rule",
              "Selects exactly the three wrong calls: a member's express parcel at 0, a non-member's 3 kg express parcel at 5, and an 8 kg express parcel at 15.",
              "All three shown calls are wrong. fee(3, True, True) should be 15 (members pay full express), fee(3, True, False) should be 15 (the weight branch catches it before express is ever tested), fee(8, True, False) should be 25 (the express branch never checks weight). The standard results 5 and 9 for non-members are right.",
              {
                lines: ["fee(3, True, True) -> 0", "fee(3, False, False) -> 5", "fee(3, True, False) -> 5", "fee(8, False, False) -> 9", "fee(8, True, False) -> 15"],
                correct: [0, 2, 4],
                display: "list",
              }
            ),
            part(
              "Corrected function",
              "Rejects weight <= 0 first, decides the service (express or standard) and then the weight band inside it (nested or combined conditions), and makes only standard free for members. No branch is unreachable.",
              "def fee(weight, express, member):\n    if weight <= 0:\n        return \"invalid\"\n    if express:\n        cost = 15 if weight <= 5 else 25\n    else:\n        cost = 5 if weight <= 5 else 9\n    if member and not express:\n        cost = 0\n    return cost\n\nTesting the service first and the weight inside it means each of the four price cells is reachable; the member discount is applied last and only to standard."
            ),
            part(
              "Results",
              "Gives: fee(3, False, True) 0; fee(3, True, True) 15; fee(8, False, False) 9; fee(8, True, False) 25; fee(0, True, True) invalid.",
              "fee(3, False, True) -> 0\nfee(3, True, True) -> 15\nfee(8, False, False) -> 9\nfee(8, True, False) -> 25\nfee(0, True, True) -> invalid"
            ),
          ],
        },
      ],
    },
    {
      slug: "pcep-sentinel-while-loop",
      objective: "Write a while loop with a correct sentinel or counter, and recognize a condition that never becomes false",
      kind: "build",
      title: "Sum readings until a sentinel, without looping forever",
      brief:
        "A sensor log at Ridgeway Greenhouse (fictional) is a list of readings that ends with -1, a sentinel meaning \"no more data\":\n\nvalues = [40, 25, -1, 90]\n\nA first attempt:\n\ntotal = 0\ni = 0\nwhile values[i] != -1:\n    total += values[i]\nprint(total)\n\nIt never prints anything.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain why it never ends, write a correct loop that also counts the readings, and give its result.",
          parts: [
            part(
              "Why it never ends",
              "States that i is never updated, so values[i] is always 40, the condition stays true and the loop is infinite.",
              "The loop never changes i, so it tests values[0] (40) every time; 40 != -1 is always true, and the body keeps adding 40 forever."
            ),
            part(
              "Correct loop",
              "Updates the index each pass and stops at the sentinel, counting readings; either a plain while with i += 1 or the walrus form while (v := values[i]) != -1. Readings after the sentinel (90) are ignored.",
              "total = 0\ncount = 0\ni = 0\nwhile (v := values[i]) != -1:\n    total += v\n    count += 1\n    i += 1\nprint(total, count)\n\nThe assignment expression reads each value once; a version that tests values[i] != -1 and increments i in the body is equally correct. The 90 after the sentinel is never read."
            ),
            numericPart(
              "Total printed",
              "65 (40 + 25); the count is 2.",
              "The loop adds 40 and 25, then stops at -1: total 65, count 2.",
              { answer: 65, tolerance: 0 }
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Section 3 (3)
    {
      slug: "pcep-seat-map-matrix",
      objective: "Create and update a matrix as a list of lists, and avoid the shared-row trap of multiplying a nested list",
      kind: "build",
      title: "Book seats on a grid that books two seats at once",
      brief:
        "Harbor Lights Cinema (fictional) models a tiny screening room of 3 rows by 4 seats. A trainee wrote:\n\nseats = [[\".\"] * 4] * 3\nseats[1][2] = \"X\"\nprint(seats)\n\nThe printout shows an X in column 2 of every row, though only one seat was booked.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the bug, build the grid correctly, book row 1 seat 2 and row 2 seat 0, and count the booked seats.",
          parts: [
            part(
              "Why every row changed",
              "Explains that * 3 repeats a reference to the same inner list, so all three rows are one object and a change through any index shows in all of them.",
              "[[\".\"] * 4] * 3 makes an outer list holding the SAME inner list three times. seats[1][2] = \"X\" changes that one list, so every row shows it."
            ),
            part(
              "Correct construction and bookings",
              "Builds independent rows (a comprehension such as [[\".\"] * 4 for _ in range(3)] or a loop that appends a new list each time), then sets seats[1][2] and seats[2][0] (or seats[-1][0]) to \"X\".",
              "seats = [[\".\"] * 4 for _ in range(3)]\nseats[1][2] = \"X\"\nseats[2][0] = \"X\"\n\nThe comprehension evaluates [\".\"] * 4 once per row, giving three separate lists. Multiplying the INNER list is fine because its items are immutable strings."
            ),
            numericPart(
              "Booked seats",
              "2, counted for example with sum(row.count(\"X\") for row in seats).",
              "sum(row.count(\"X\") for row in seats) is 2, and seats[-1][0] is \"X\".",
              { answer: 2, tolerance: 0 }
            ),
          ],
        },
      ],
    },
    {
      slug: "pcep-stock-dictionary",
      objective: "Build, update and iterate a dictionary with keys(), values() and items(), checking for a key before reading it",
      kind: "build",
      title: "Fill orders from a stock dictionary without a KeyError",
      brief:
        "Willow Market (fictional) tracks stock as a dictionary and fills orders one item at a time:\n\nstock = {\"apple\": 4, \"pear\": 0, \"plum\": 7}\norder = [\"apple\", \"kiwi\", \"plum\", \"apple\"]\n\nfor item in order:\n    if stock[item] > 0:\n        stock[item] -= 1\n\nIt crashes on the second item.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Fix the loop so missing or sold-out items print \"cannot fill <item>\", then report the stock and what is sold out.",
          parts: [
            part(
              "Why it crashes and the fix",
              "Names KeyError for \"kiwi\" (not a key) and checks membership with in (or uses stock.get(item, 0)) before reading; prints the message for missing or zero-stock items.",
              "stock[\"kiwi\"] raises KeyError because the key does not exist. Fixed:\n\nfor item in order:\n    if item in stock and stock[item] > 0:\n        stock[item] -= 1\n    else:\n        print(\"cannot fill\", item)\n\nOutput: cannot fill kiwi. Because and short-circuits, stock[item] is only read when the key exists."
            ),
            part(
              "Stock afterward",
              "{'apple': 2, 'pear': 0, 'plum': 6} -- apple twice, plum once; insertion order kept.",
              "{'apple': 2, 'pear': 0, 'plum': 6}. Dictionaries keep insertion order, so the keys print in the order they were created."
            ),
            part(
              "Units left and sold out",
              "Uses values() for the total (8) and items() to list sold-out keys (['pear']).",
              "sum(stock.values()) is 8, and [k for k, v in stock.items() if v == 0] is ['pear']."
            ),
          ],
        },
      ],
    },
    {
      slug: "pcep-clean-contact-string",
      objective: "Transform text with case, find, split, join, strip and replace methods",
      kind: "build",
      title: "Clean a contact line from a sign-up form",
      brief:
        "Signups at Juniper Hall (fictional) arrive as one line, fields separated by semicolons, with stray spaces and mixed case:\n\nraw = \"  Ada Lovelace ; ADA@Example.org;  analyst  \"\n\nProduce the name in capitals, the email in lower case, the role in title case, a username made from the name in lower case joined with hyphens, and the position of the @ in the email.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the code and give each value it produces.",
          parts: [
            part(
              "Splitting and stripping",
              "Splits on \";\" and strips each piece, giving ['Ada Lovelace', 'ADA@Example.org', 'analyst']; notes that strip() returns new strings and raw is unchanged.",
              "parts = [p.strip() for p in raw.split(\";\")]\nname, email, role = parts\n# ['Ada Lovelace', 'ADA@Example.org', 'analyst']\n\nEvery string method returns a new string; raw itself never changes."
            ),
            part(
              "Transformed values",
              "name.upper() -> 'ADA LOVELACE'; email.lower() -> 'ada@example.org'; role.title() -> 'Analyst'; \"-\".join(name.lower().split()) -> 'ada-lovelace'.",
              "name.upper()  -> 'ADA LOVELACE'\nemail.lower() -> 'ada@example.org'\nrole.title()  -> 'Analyst'\n\"-\".join(name.lower().split()) -> 'ada-lovelace'"
            ),
            numericPart(
              "Position of @",
              "3 from email.find(\"@\"); notes find returns -1 when absent (email.find(\"#\") is -1).",
              "email.find(\"@\") is 3 (A, D, A are indexes 0-2). find returns -1 when the text is absent, so email.find(\"#\") is -1; index() would raise ValueError instead.",
              { answer: 3, tolerance: 0 }
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Section 4 (2)
    {
      slug: "pcep-argument-errors",
      objective: "Pass arguments by position and keyword with defaults, and diagnose missing, duplicated or misordered arguments",
      kind: "build",
      title: "Sort valid calls from broken ones",
      brief:
        "A price-label helper at Copperleaf Stationers (fictional):\n\ndef label(item, price, currency=\"USD\", sep=\" \"):\n    return f\"{item}{sep}{price:.2f}{sep}{currency}\"\n\nTeammates have written six calls.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the calls that fail, say what each valid call returns, and name the error for each failing call.",
          parts: [
            selectPart(
              "Calls that fail",
              "Selects exactly the three failing calls: label(\"Pen\"), label(\"Pen\", 1.5, currency=\"EUR\", price=2) and label(item=\"Pen\", 1.5).",
              "label(\"Pen\") is missing the required price. label(\"Pen\", 1.5, currency=\"EUR\", price=2) gives price twice (positionally and by keyword). label(item=\"Pen\", 1.5) puts a positional argument after a keyword one, which is a SyntaxError before anything runs.",
              {
                lines: [
                  "label(\"Pen\", 1.5)",
                  "label(\"Pen\")",
                  "label(\"Pen\", 1.5, \"EUR\")",
                  "label(\"Pen\", 1.5, currency=\"EUR\", price=2)",
                  "label(price=2, item=\"Cup\", sep=\"|\")",
                  "label(item=\"Pen\", 1.5)",
                ],
                correct: [1, 3, 5],
                display: "list",
              }
            ),
            part(
              "Valid results",
              "label(\"Pen\", 1.5) -> 'Pen 1.50 USD'; label(\"Pen\", 1.5, \"EUR\") -> 'Pen 1.50 EUR'; label(price=2, item=\"Cup\", sep=\"|\") -> 'Cup|2.00|USD' (keyword order does not matter; the default currency applies).",
              "'Pen 1.50 USD', 'Pen 1.50 EUR' and 'Cup|2.00|USD'. Keywords may come in any order; omitted parameters take their defaults."
            ),
            part(
              "Errors named",
              "TypeError: missing 1 required positional argument 'price'; TypeError: got multiple values for argument 'price'; SyntaxError: positional argument follows keyword argument.",
              "label(\"Pen\") -> TypeError: label() missing 1 required positional argument: 'price'\nlabel(\"Pen\", 1.5, currency=\"EUR\", price=2) -> TypeError: label() got multiple values for argument 'price'\nlabel(item=\"Pen\", 1.5) -> SyntaxError: positional argument follows keyword argument"
            ),
          ],
        },
      ],
    },
    {
      slug: "pcep-average-exceptions",
      objective: "Handle runtime errors with try and one or more specific except branches, and trace the flow when one is raised",
      kind: "build",
      title: "Trace which except branch catches an empty string",
      brief:
        "A grade tool at Northgate Tutoring (fictional):\n\ndef avg(text):\n    try:\n        nums = [int(t) for t in text.split(\",\")]\n        result = sum(nums) / len(nums)\n    except ValueError:\n        print(\"not a number\")\n        return None\n    except ZeroDivisionError:\n        print(\"empty\")\n        return None\n    print(\"ok\")\n    return result\n\nThe author expects avg(\"\") to print \"empty\".",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Trace avg(\"4,8,9\"), avg(\"4,x\") and avg(\"\"), and say what change would make an empty entry print \"empty\".",
          parts: [
            part(
              "avg(\"4,8,9\") and avg(\"4,x\")",
              "First prints ok and returns 7.0 (21 / 3, a float); second raises ValueError at int(\"x\"), prints not a number and returns None -- the rest of the try block is skipped.",
              "avg(\"4,8,9\"): no exception, prints ok, returns 7.0.\navg(\"4,x\"): int(\"x\") raises ValueError inside the comprehension; control jumps to the first matching except, prints not a number, returns None."
            ),
            part(
              "avg(\"\")",
              "Explains that \"\".split(\",\") is [''] (one empty string), so int('') raises ValueError before any division: it prints not a number, not empty. ZeroDivisionError is never reached.",
              "\"\".split(\",\") returns [''], a list with one empty string, not an empty list. int('') raises ValueError, so avg(\"\") prints not a number and returns None. The ZeroDivisionError branch would only run for an empty list of numbers, which this input never produces."
            ),
            part(
              "Making empty input print empty",
              "Checks for empty or blank text first (if not text.strip(): print(\"empty\"); return None) or filters out empty pieces before converting so len(nums) can be 0.",
              "Test it before converting:\n\nif not text.strip():\n    print(\"empty\")\n    return None\n\nAlternatively build nums from [t for t in text.split(\",\") if t.strip()], so an empty input gives [] and the division raises ZeroDivisionError, caught by its branch."
            ),
          ],
        },
      ],
    },
    // ---------------------------------------------------------------- Section 5 (2)
    {
      slug: "pcep-csv-stock-value",
      objective: "Read and write CSV rows with csv.reader and csv.writer, converting each field to the right type",
      kind: "build",
      title: "Total a stock file read with csv.reader",
      brief:
        "Pinecrest Hardware (fictional) exports stock.csv:\n\nsku,qty,price\nA1,3,2.50\nB2,10,0.99\nC3,1,12.00\n\nWrite a program that reads it with the csv module, skips the header, computes each line's value (qty x price), writes value.csv with columns sku and value (two decimals), and prints the grand total.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the program and give the per-line values and the grand total.",
          parts: [
            part(
              "Reading correctly",
              "Opens with with open(..., newline=\"\"), uses csv.reader, skips the header with next(), and converts qty with int() and price with float() because every field arrives as a str.",
              "import csv\n\nwith open(\"stock.csv\", newline=\"\", encoding=\"utf-8\") as f:\n    reader = csv.reader(f)\n    next(reader)              # skip sku,qty,price\n    rows = []\n    total = 0.0\n    for sku, qty, price in reader:\n        value = int(qty) * float(price)\n        total += value\n        rows.append([sku, f\"{value:.2f}\"])\n\ncsv.reader yields lists of strings, so \"3\" * ... would fail or repeat text without int(). newline=\"\" is what the csv documentation asks for."
            ),
            part(
              "Writing value.csv",
              "Opens a second file in \"w\" mode with newline=\"\", writes a header row and the rows with csv.writer (writerow/writerows); values A1 7.50, B2 9.90, C3 12.00.",
              "with open(\"value.csv\", \"w\", newline=\"\", encoding=\"utf-8\") as out:\n    w = csv.writer(out)\n    w.writerow([\"sku\", \"value\"])\n    w.writerows(rows)\n\nRows written: A1,7.50  B2,9.90  C3,12.00. Mode \"w\" replaces any existing value.csv."
            ),
            numericPart(
              "Grand total",
              "29.4 (7.50 + 9.90 + 12.00), printed for example as 29.40.",
              "7.50 + 9.90 + 12.00 = 29.40; print(f\"{total:.2f}\") shows 29.40 (round(total, 2) is 29.4).",
              { answer: 29.4, tolerance: 0.01 }
            ),
          ],
        },
      ],
    },
    {
      slug: "pcep-math-rounding-negatives",
      objective: "Calculate with math.ceil, floor, trunc and sqrt, including how they treat negative numbers",
      kind: "build",
      title: "Choose ceil, floor or trunc for a packing problem",
      brief:
        "Saltmarsh Bakery (fictional) packs muffins in boxes of 5 and wants to know how many boxes 23 muffins need. A helper also prints a table of rounding results:\n\nimport math\nfor v in (2.3, -2.3):\n    print(v, math.ceil(v), math.floor(v), math.trunc(v))\nprint(math.sqrt(16))",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the number of boxes and the function that computes it, then the printed table.",
          parts: [
            numericPart(
              "Boxes for 23 muffins",
              "5, from math.ceil(23 / 5) (4.6 rounds up because a partly filled box is still a box).",
              "math.ceil(23 / 5) = math.ceil(4.6) = 5. floor or trunc would give 4 and leave three muffins unboxed.",
              { answer: 5, tolerance: 0 }
            ),
            part(
              "Printed table",
              "2.3 3 2 2 and -2.3 -2 -3 -2, then 4.0; explains ceil rounds up, floor rounds down (toward minus infinity) and trunc drops the fraction (toward zero), so floor and trunc differ only for negatives; sqrt returns a float.",
              "2.3 3 2 2\n-2.3 -2 -3 -2\n4.0\n\nceil goes up, floor goes down toward minus infinity, trunc goes toward zero. For -2.3 that is -2, -3 and -2. math.sqrt always returns a float, so 16 gives 4.0."
            ),
          ],
        },
      ],
    },
  ],
};
