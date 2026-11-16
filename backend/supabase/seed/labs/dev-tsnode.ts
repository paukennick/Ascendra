import { GENERAL_SAFETY, matchPart, orderPart, part, selectPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-267: TypeScript & Node.js Programming Coach (TSNODE), seven units, no
// exam blueprint.
//
// Density (docs/labs.md, "hybrid"): one lab per unit plus six extras split
// evenly -> 2/2/2/2/2/2/1 = 13 labs, one per objective, all build labs.
//
// How the code was checked (2026-11-14): every TypeScript snippet was
// type-checked with tsc 5.5.4 (--strict, the repo's installed compiler) and
// every runtime result was produced on Node.js 22.23.4 with built-in type
// stripping; the compiler errors and outputs quoted are those observed.
// TypeScript 7.0.2 and Node.js 26 were NOT run here (installing them was not
// allowed on the shared machine). What the labs say about TypeScript 7's
// defaults and removed options comes from the TypeScript team's 7.0
// announcement and the tsconfig reference; what they say about Node.js 26
// comes from its v26.13.1 API docs, which describe the same type-stripping
// and stream behavior observed on 22.23.4. Organizations are fictional.

export const TSNODE_LABS: SeedLabSet = {
  trackCode: "TSNODE",
  sources: [
    source("https://www.typescriptlang.org/docs/handbook/intro.html", "reference", "2026-11-14"),
    source("https://www.typescriptlang.org/tsconfig/", "reference", "2026-11-14"),
    source("https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/", "reference", "2026-11-14"),
    source("https://nodejs.org/api/typescript.html", "reference", "2026-11-14"),
    source("https://nodejs.org/api/stream.html", "reference", "2026-11-14"),
    source("https://nodejs.org/api/test.html", "reference", "2026-11-14"),
  ],
  labs: [
    // ------------------------------------------------ Week 1 (2)
    {
      slug: "tsnode-upgrade-tsconfig-7",
      objective: "Set up a TypeScript project with tsc and tsconfig.json, and explain what the strict, types and rootDir defaults change",
      kind: "build",
      title: "Upgrade an old tsconfig.json to TypeScript 7",
      brief:
        "Marigold Bikes' (fictional) service still has a tsconfig.json from TypeScript 5:\n\n{\n  \"compilerOptions\": {\n    \"target\": \"es5\",\n    \"module\": \"commonjs\",\n    \"moduleResolution\": \"node\",\n    \"baseUrl\": \".\",\n    \"paths\": { \"@lib/*\": [\"src/lib/*\"] },\n    \"outDir\": \"dist\"\n  },\n  \"include\": [\"src\"]\n}\n\nThe code uses Node.js globals (process, Buffer) and the tests use Jest. After installing typescript@7, tsc reports errors before compiling anything.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the settings TypeScript 7 rejects, rewrite the file, and say which new defaults could still surprise the team.",
          parts: [
            selectPart(
              "Settings TypeScript 7 no longer supports",
              "Selects target es5, moduleResolution node and baseUrl -- all deprecated in 6.0 and hard errors in 7.0. module commonjs, outDir and include are still valid.",
              "\"target\": \"es5\", \"moduleResolution\": \"node\" (node10) and \"baseUrl\" were deprecated in TypeScript 6.0 and are errors in 7.0. Keep paths, but make each entry relative to the tsconfig (\"./src/lib/*\").",
              {
                lines: ["\"target\": \"es5\"", "\"module\": \"commonjs\"", "\"moduleResolution\": \"node\"", "\"baseUrl\": \".\"", "\"outDir\": \"dist\"", "\"include\": [\"src\"]"],
                correct: [0, 2, 3],
                display: "config",
              }
            ),
            part(
              "Rewritten tsconfig",
              "A modern target, module and moduleResolution nodenext (or bundler with a bundler), paths without baseUrl relative to the project, outDir dist, rootDir ./src, and types listing node and jest.",
              "{\n  \"compilerOptions\": {\n    \"target\": \"es2024\",\n    \"module\": \"nodenext\",\n    \"moduleResolution\": \"nodenext\",\n    \"paths\": { \"@lib/*\": [\"./src/lib/*\"] },\n    \"rootDir\": \"./src\",\n    \"outDir\": \"dist\",\n    \"types\": [\"node\", \"jest\"]\n  },\n  \"include\": [\"src\"]\n}\n\n(Any current target is fine; leaving it out uses the latest stable ECMAScript version.)"
            ),
            part(
              "Defaults that surprise",
              "Names at least two: strict is now on by default (new errors such as possibly undefined); types defaults to [] so process and describe are unknown until node and jest are listed; rootDir defaults to ./ so without rootDir the output lands in dist/src.",
              "strict defaults to true, so code that compiled loosely now reports implicit any and possibly-undefined errors. types defaults to [], so Node and Jest globals are missing until \"types\": [\"node\", \"jest\"] is added. rootDir defaults to the tsconfig folder, so output would go to dist/src/... unless rootDir is set to ./src."
            ),
          ],
        },
      ],
    },
    {
      slug: "tsnode-unknown-over-any",
      objective: "Choose unknown over any for untrusted values, and narrow before using them",
      kind: "build",
      title: "Catch a string quantity that any let through",
      brief:
        "Hollyhock Grocers' (fictional) order importer reads JSON from a partner:\n\ninterface Order { id: string; qty: number }\nconst data: any = JSON.parse('{\"id\":\"A1\",\"qty\":\"3\"}');\nconsole.log(data.qty + 1);\n\nIt compiles cleanly and prints 31.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain why the compiler said nothing, then rewrite it with unknown and a type predicate so the bad record is rejected.",
          parts: [
            part(
              "Why it compiled and printed 31",
              "any turns type checking off, so data.qty + 1 is accepted; at run time qty is the string \"3\" and + concatenates to \"31\". Types are erased, so no run-time check happens unless code performs one.",
              "any switches checking off for that value, so the compiler accepts any use of it. At run time qty is the string \"3\", and \"3\" + 1 is \"31\". Type annotations never check values while the program runs."
            ),
            part(
              "unknown with a type predicate",
              "Types the parsed value as unknown, writes isOrder(v: unknown): v is Order that checks object, non-null, id is a string and qty is a number, and only uses qty after the check; the sample is rejected.",
              "function isOrder(v: unknown): v is Order {\n  return typeof v === \"object\" && v !== null\n    && \"id\" in v && typeof (v as { id: unknown }).id === \"string\"\n    && \"qty\" in v && typeof (v as { qty: unknown }).qty === \"number\";\n}\n\nconst raw: unknown = JSON.parse(text);\nif (isOrder(raw)) console.log(raw.qty + 1);\nelse console.log(\"rejected\");\n\nWith the sample this prints rejected. unknown forces a check before use; inside the if, raw is an Order."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 2 (2)
    {
      slug: "tsnode-exhaustive-union",
      objective: "Design a discriminated union and check exhaustiveness with never",
      kind: "build",
      title: "Make a forgotten case a compile error",
      brief:
        "Tamarack Signs (fictional) prices signs by area:\n\ntype Shape =\n  | { kind: \"circle\"; radius: number }\n  | { kind: \"rect\"; width: number; height: number };\n\nfunction area(s: Shape): number {\n  switch (s.kind) {\n    case \"circle\": return Math.PI * s.radius ** 2;\n    case \"rect\": return s.width * s.height;\n  }\n}\n\nA developer adds { kind: \"triangle\"; base: number; height: number } to Shape and forgets area.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Add an exhaustiveness check, quote the error it produces for the missing triangle, and fix area.",
          parts: [
            part(
              "Exhaustiveness check",
              "Adds a default branch that assigns s to a variable of type never (and throws), so any unhandled member of the union fails to compile.",
              "default: {\n  const unhandled: never = s;\n  throw new Error(`unhandled shape: ${JSON.stringify(unhandled)}`);\n}\n\nIn the default branch s has been narrowed to whatever no case handled; when every case is handled that is never, and the assignment compiles."
            ),
            part(
              "The error",
              "Quotes or paraphrases: Type '{ kind: \"triangle\"; base: number; height: number; }' is not assignable to type 'never'.",
              "error TS2322: Type '{ kind: \"triangle\"; base: number; height: number; }' is not assignable to type 'never'. The compiler names the exact member that has no case."
            ),
            part(
              "Fix",
              "Adds case \"triangle\": return (s.base * s.height) / 2; s narrows to the triangle member through the kind discriminant.",
              "case \"triangle\":\n  return (s.base * s.height) / 2;\n\nChecking s.kind narrows s to the member whose kind is \"triangle\", so s.base is available without a cast."
            ),
          ],
        },
      ],
    },
    {
      slug: "tsnode-satisfies-config",
      objective: "Write a type predicate to validate untrusted data, and use satisfies to check a value without widening it",
      kind: "build",
      title: "Catch a typo in a theme object with satisfies",
      brief:
        "Cobalt Studio's (fictional) theme file:\n\nconst palette: Record<string, string> = { primary: \"#0a5\", accent: \"#f80\" };\npalette.secondry.toUpperCase();\n\nThe typo (secondry) compiles under strict, then the page crashes with TypeError: Cannot read properties of undefined (reading 'toUpperCase').",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain why the annotation hid the typo, rewrite with satisfies, and say what each version's type is.",
          parts: [
            part(
              "Why it compiled",
              "Annotating with Record<string, string> widens the variable's type to any string key, so palette.secondry is typed string (noUncheckedIndexedAccess is not part of strict); the specific keys are forgotten.",
              "The annotation makes palette's type Record<string, string>: every string is a valid key and every lookup is typed string. The compiler no longer knows only primary and accent exist, so the typo type-checks and returns undefined at run time."
            ),
            part(
              "With satisfies",
              "const palette = { ... } satisfies Record<string, string>; checks every value is a string but keeps the inferred type { primary: string; accent: string }, so palette.secondry is a compile error.",
              "const palette = { primary: \"#0a5\", accent: \"#f80\" } satisfies Record<string, string>;\n\nsatisfies checks the object against Record<string, string> (a number value would be an error) without changing palette's inferred type, { primary: string; accent: string }. palette.secondry is now error TS2339: Property 'secondry' does not exist."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 3 (2)
    {
      slug: "tsnode-generic-pluck",
      objective: "Write generic functions and constrain type parameters with extends",
      kind: "build",
      title: "Replace three copy-pasted helpers with one generic",
      brief:
        "Juniper Analytics (fictional) has pluckNames(users), pluckAges(users) and pluckTitles(posts), each mapping an array to one property. A reviewer asks for one function, pluck(items, key), where a wrong key fails to compile and the result type follows the key.\n\nconst users = [{ name: \"Ana\", age: 31 }, { name: \"Ben\", age: 27 }];",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write pluck, give the types of two calls, and show what a wrong key does.",
          parts: [
            part(
              "pluck",
              "function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] -- K is constrained to T's keys and the return uses the indexed access type T[K].",
              "function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {\n  return items.map((item) => item[key]);\n}\n\nK extends keyof T limits key to T's property names; T[K] is the type of that property."
            ),
            matchPart(
              "Inferred result types",
              "pluck(users, \"age\") is number[]; pluck(users, \"name\") is string[]; pluck(users, \"email\") is a compile error.",
              "pluck(users, \"age\") -> number[]; pluck(users, \"name\") -> string[]; pluck(users, \"email\") -> error TS2345: Argument of type '\"email\"' is not assignable to parameter of type '\"name\" | \"age\"'.",
              {
                left: ["pluck(users, \"age\")", "pluck(users, \"name\")", "pluck(users, \"email\")"],
                right: ["number[]", "string[]", "compile error", "any[]", "(string | number)[]"],
                pairs: [0, 1, 2],
              }
            ),
          ],
        },
      ],
    },
    {
      slug: "tsnode-utility-types",
      objective: "Apply utility types (Partial, Required, Pick, Omit, Record, ReturnType) instead of repeating shapes",
      kind: "build",
      title: "Derive API shapes from one User type",
      brief:
        "Lumen Health Portal's (fictional) code defines:\n\ninterface User { id: number; name: string; email: string; passwordHash: string }\n\nand three hand-written copies of it: PublicUser (everything except passwordHash), UserPatch (name and/or email, both optional) and a role table mapping \"admin\" | \"staff\" | \"viewer\" to a permission list. When email was renamed in User, the copies drifted.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write each derived type with utility types, and say what the compiler does with a PublicUser literal that includes passwordHash.",
          parts: [
            part(
              "Derived types",
              "type PublicUser = Omit<User, \"passwordHash\">; type UserPatch = Partial<Pick<User, \"name\" | \"email\">>; type Role = \"admin\" | \"staff\" | \"viewer\"; const permissions: Record<Role, string[]> = ...",
              "type PublicUser = Omit<User, \"passwordHash\">;\ntype UserPatch = Partial<Pick<User, \"name\" | \"email\">>;\ntype Role = \"admin\" | \"staff\" | \"viewer\";\nconst permissions: Record<Role, string[]> = {\n  admin: [\"read\", \"write\", \"manage\"],\n  staff: [\"read\", \"write\"],\n  viewer: [\"read\"],\n};\n\nEach derives from User, so a rename in User flows through. Record<Role, ...> also errors if a role is missing."
            ),
            part(
              "passwordHash in a PublicUser literal",
              "An excess property error: Object literal may only specify known properties, and 'passwordHash' does not exist in type 'PublicUser'. Notes that this is a compile-time check only -- spreading a full User object into a response still sends the hash at run time, so pick fields explicitly.",
              "error TS2353: Object literal may only specify known properties, and 'passwordHash' does not exist in type 'PublicUser'. But a variable of type User passed where PublicUser is expected is accepted (it has all the required fields), and JSON.stringify would still include the hash -- build the response from named fields."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 4 (2)
    {
      slug: "tsnode-private-vs-hash-private",
      objective: "Write classes with access modifiers, readonly fields, abstract members and implements, and tell private from #private",
      kind: "build",
      title: "Decide which secrets a class really hides",
      brief:
        "Pinewood Payments' (fictional) class:\n\nclass Account {\n  private apiKey = \"k-123\";\n  #pin = \"0000\";\n  readonly id = \"acct-1\";\n}\nconst a = new Account();\n\nA teammate claims all three fields are protected from other code.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Classify each access, and say which protections exist only at compile time.",
          parts: [
            matchPart(
              "What happens",
              "a.apiKey -> compile error but works at run time; a[\"apiKey\"] -> allowed by the type checker (bracket escape hatch); a.#pin outside the class -> syntax error and enforced at run time; a.id = \"x\" -> compile error (readonly).",
              "private is checked only by the compiler and allows bracket access: a[\"apiKey\"] type-checks, and at run time the field is an ordinary property. #pin is a JavaScript private field: referring to it outside the class is a syntax error, and it does not exist as a property at run time. readonly blocks assignment at compile time only.",
              {
                left: ["a.apiKey", "a[\"apiKey\"]", "a.#pin (outside the class)", "a.id = \"x\""],
                right: ["compile error; readable at run time", "allowed by the type checker", "syntax error; private at run time too", "compile error: read-only property"],
                pairs: [0, 1, 2, 3],
              }
            ),
            part(
              "Compile time vs run time",
              "private, protected and readonly are erased with the types (so JSON.stringify(a) includes apiKey and id); #private fields are enforced by the JavaScript engine and are not included by JSON.stringify.",
              "private, protected and readonly exist only during type checking; once types are erased, apiKey and id are plain properties, and JSON.stringify(a) shows them. #pin is hard private: no outside code can read it, and it never appears in JSON.stringify or Object.keys. Real secrets still do not belong in source code."
            ),
          ],
        },
      ],
    },
    {
      slug: "tsnode-enum-to-const-object",
      objective: "Choose a union of string literals or an as const object over an enum when code must stay erasable",
      kind: "build",
      title: "Replace an enum that Node.js refuses to run",
      brief:
        "Saffron Kitchen's (fictional) service now runs its .ts files directly with node (type stripping). Startup fails on:\n\nenum Status { Open = \"open\", Closed = \"closed\" }\n\nwith SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the error, replace the enum with an erasable equivalent, and show how to type a variable that holds a status.",
          parts: [
            part(
              "Why Node.js rejects it",
              "An enum generates a JavaScript object at run time; type stripping only removes type syntax and never generates code, so constructs that need emitting (enums, parameter properties, runtime namespaces) are rejected.",
              "Type stripping replaces type annotations with whitespace and emits nothing new. An enum is not just a type -- it compiles to a runtime object -- so Node.js cannot handle it in strip-only mode. erasableSyntaxOnly in tsconfig makes tsc flag the same constructs."
            ),
            part(
              "Erasable replacement",
              "const Status = { Open: \"open\", Closed: \"closed\" } as const; type Status = (typeof Status)[keyof typeof Status]; let s: Status = \"open\" (or Status.Open). Assigning \"pending\" is a compile error.",
              "const Status = { Open: \"open\", Closed: \"closed\" } as const;\ntype Status = (typeof Status)[keyof typeof Status];   // \"open\" | \"closed\"\n\nlet s: Status = Status.Open;   // or \"open\"\ns = \"pending\";   // error TS2322: Type '\"pending\"' is not assignable to type 'Status'.\n\nThe object is ordinary JavaScript and the type is erased, so node runs the file. A plain union type Status = \"open\" | \"closed\" works when no runtime object is needed."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 5 (2)
    {
      slug: "tsnode-nodenext-imports",
      objective: "Write imports that work under nodenext resolution, including .ts extensions and import type",
      kind: "build",
      title: "Fix imports that fail when Node.js runs the source",
      brief:
        "Quill Invoicing (fictional) has package.json with \"type\": \"module\" and:\n\n// src/money.ts\nexport type Cents = number;\nexport function format(c: Cents): string { return `$${(c / 100).toFixed(2)}`; }\n\n// src/main.ts\nimport { Cents, format } from \"./money\";\nconst total: Cents = 1999;\nconsole.log(format(total));\n\nnode src/main.ts fails with Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/money'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Fix the imports step by step, explaining each error, and give the output.",
          parts: [
            part(
              "First error",
              "ES modules in Node.js need the full file extension; \"./money\" is not resolved to money.ts. Import \"./money.ts\" (with allowImportingTsExtensions or rewriteRelativeImportExtensions in tsconfig so tsc accepts it).",
              "Node.js ES module resolution never guesses extensions, so \"./money\" is not found. Write \"./money.ts\"; for tsc to type-check that specifier, set allowImportingTsExtensions (with noEmit) or rewriteRelativeImportExtensions when emitting."
            ),
            part(
              "Second error",
              "With the extension fixed, Node.js reports SyntaxError: The requested module './money.ts' does not provide an export named 'Cents' -- the type export was stripped, so a type must be imported with import type (or an inline type modifier). verbatimModuleSyntax makes tsc require this.",
              "import { Cents, format } from \"./money.ts\" then fails with SyntaxError: The requested module './money.ts' does not provide an export named 'Cents'. Cents was erased from money.ts, so it must be imported as a type:\n\nimport { format } from \"./money.ts\";\nimport type { Cents } from \"./money.ts\";\n\n(or import { format, type Cents } from \"./money.ts\"). verbatimModuleSyntax makes tsc report this before run time."
            ),
            part(
              "Output",
              "States that node src/main.ts now prints $19.99.",
              "node src/main.ts prints $19.99."
            ),
          ],
        },
      ],
    },
    {
      slug: "tsnode-type-stripping-limits",
      objective: "Run TypeScript with Node.js type stripping, and recognize the syntax it rejects",
      kind: "build",
      title: "Sort TypeScript constructs into runs and refuses",
      brief:
        "Before moving Fernbrook Labs' (fictional) scripts from ts-node to running them with node directly, the team lists what their code uses. Node.js type stripping is on by default and stable in Node.js 26 (stable since 25.2.0 and 24.12.0).",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick the constructs node rejects in strip-only mode, then say what type stripping does and does not do.",
          parts: [
            selectPart(
              "Rejected constructs",
              "Selects the enum, the constructor parameter property and the namespace with runtime code; interfaces, type annotations, import type and a namespace containing only types run.",
              "enum, parameter properties (constructor(public x: number)) and namespaces with runtime code need JavaScript to be generated, so they raise ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX. Interfaces, annotations, import type and type-only namespaces are simply erased.",
              {
                lines: [
                  "interface Point { x: number; y: number }",
                  "enum Level { Low, High }",
                  "class P { constructor(public x: number) {} }",
                  "function f(n: number): string { return String(n); }",
                  "import type { Cents } from \"./money.ts\";",
                  "namespace A { export let x = 1 }",
                  "namespace T { export type Id = string }",
                ],
                correct: [1, 2, 5],
                display: "config",
              }
            ),
            part(
              "What type stripping does",
              "It removes type syntax and runs the JavaScript; it performs NO type checking and ignores tsconfig.json (paths, target); so tsc --noEmit (or tsc -b) still has to run in CI; .ts files inside node_modules are refused.",
              "Node.js replaces types with whitespace and runs the result. It never type-checks and ignores tsconfig.json, so paths aliases and target downleveling do not apply. Keep tsc --noEmit in CI to catch type errors. Node.js also refuses .ts files under node_modules, so published packages must ship JavaScript."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 6 (2)
    {
      slug: "tsnode-event-loop-order",
      objective: "Explain how the event loop runs timers, I/O callbacks and promise jobs, and why blocking it stalls every request",
      kind: "build",
      title: "Predict the order of sync code, promises and a timer",
      brief:
        "A quiz at Larkspur Dev Bootcamp (fictional), saved as order.mjs:\n\nconsole.log(\"A sync start\");\nsetTimeout(() => console.log(\"B timeout 0\"), 0);\nPromise.resolve().then(() => console.log(\"C promise then\"));\nqueueMicrotask(() => console.log(\"D microtask\"));\nconsole.log(\"F sync end\");\n\nA second question: a request handler in the same process runs a loop that computes for 2 seconds without awaiting anything.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Order the output and explain it, then say what the 2-second loop does to other requests and how to fix it.",
          parts: [
            orderPart(
              "Output order",
              "A, F, C, D, B.",
              "A sync start, F sync end, C promise then, D microtask, B timeout 0. Synchronous code runs to completion; then the microtask queue (promise reactions and queueMicrotask, in the order queued) is drained; only then does the event loop reach the timers phase.",
              ["A sync start", "F sync end", "C promise then", "D microtask", "B timeout 0"]
            ),
            part(
              "The blocking loop",
              "While the loop runs, the single JavaScript thread cannot run any other callback: every other request, timer and I/O completion waits ~2 seconds. Fixes: move the work to a worker thread (node:worker_threads) or another service, or break it into chunks that yield; async/await alone does not help CPU-bound work.",
              "Node.js runs JavaScript on one thread per process, so a 2-second synchronous loop stalls every other request, timer and I/O callback for that time. Marking the function async changes nothing for CPU work. Move it to a worker thread (node:worker_threads), a job queue, or split it into chunks that yield with setImmediate."
            ),
          ],
        },
      ],
    },
    {
      slug: "tsnode-stream-pipeline",
      objective: "Process large data with streams and pipeline instead of loading it into memory",
      kind: "build",
      title: "Count errors in a large log without reading it all",
      brief:
        "Osprey Hosting's (fictional) nightly job does:\n\nconst text = await readFile(\"app.log\", \"utf8\");\nconst errors = text.split(\"\\n\").filter((l) => l.split(\",\")[1] === \"ERROR\").length;\n\nThe log is now 6 GB and the job dies running out of memory. It also needs a gzip copy of the log. Lines look like: ts,level,msg",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Rewrite both tasks with streams and say how errors are handled.",
          parts: [
            part(
              "Counting with a stream",
              "Reads line by line with createReadStream and node:readline (for await ... of), counting ERROR lines, so memory stays flat regardless of file size. For a 4-line sample with two ERROR lines it prints 2.",
              "import { createReadStream } from \"node:fs\";\nimport { createInterface } from \"node:readline\";\n\nasync function countErrors(path: string): Promise<number> {\n  const lines = createInterface({ input: createReadStream(path, { encoding: \"utf8\" }), crlfDelay: Infinity });\n  let n = 0;\n  for await (const line of lines) if (line.split(\",\")[1] === \"ERROR\") n++;\n  return n;\n}\n\nOnly a small buffer is in memory at any time. On a sample with two ERROR lines it returns 2."
            ),
            part(
              "Compressing with pipeline",
              "Uses pipeline from node:stream/promises with createReadStream, createGzip and createWriteStream; awaits it and catches the error, because pipeline forwards an error from any stream and destroys them all. A missing file rejects with code ENOENT.",
              "import { pipeline } from \"node:stream/promises\";\nimport { createGzip } from \"node:zlib\";\nimport { createReadStream, createWriteStream } from \"node:fs\";\n\ntry {\n  await pipeline(createReadStream(\"app.log\"), createGzip(), createWriteStream(\"app.log.gz\"));\n} catch (e) {\n  console.error(\"compress failed:\", (e as NodeJS.ErrnoException).code);\n  process.exitCode = 1;\n}\n\npipeline handles backpressure, forwards the first error and destroys every stream; chained .pipe() calls do not forward errors. A missing input rejects with ENOENT."
            ),
          ],
        },
      ],
    },
    // ------------------------------------------------ Week 7 (1)
    {
      slug: "tsnode-validated-booking-endpoint",
      objective: "Validate request bodies from unknown into typed values, answering bad input with a 400",
      kind: "build",
      title: "Build and test a booking endpoint that rejects bad input",
      brief:
        "Starling Inn (fictional) needs POST /bookings: the body is JSON { room: string, nights: integer 1-30 }. Valid requests get 201 with the booking and status \"held\"; malformed JSON or invalid fields get 400 with an error message; anything else 404. Write it with node:http in TypeScript and test it with node:test.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the validator, the server, and the tests.",
          parts: [
            part(
              "Validator",
              "parseBooking(body: unknown) checks object and non-null, room is a non-empty string, nights is an integer from 1 to 30, and returns either the typed value or an error message (or throws a typed error); no cast of the raw body to the target type.",
              "export interface NewBooking { room: string; nights: number }\n\nexport function parseBooking(body: unknown): NewBooking | string {\n  if (typeof body !== \"object\" || body === null) return \"body must be a JSON object\";\n  const { room, nights } = body as Record<string, unknown>;\n  if (typeof room !== \"string\" || room.trim() === \"\") return \"room must be a non-empty string\";\n  if (typeof nights !== \"number\" || !Number.isInteger(nights) || nights < 1 || nights > 30)\n    return \"nights must be an integer from 1 to 30\";\n  return { room: room.trim(), nights };\n}"
            ),
            part(
              "Server",
              "Reads the body, answers 400 on JSON.parse failure and on a validation message, 201 with JSON on success, 404 otherwise; sets content-type application/json; never returns a stack trace.",
              "export const server = createServer(async (req, res) => {\n  if (req.method !== \"POST\" || req.url !== \"/bookings\") return send(res, 404, { error: \"not found\" });\n  let body: unknown;\n  try {\n    let text = \"\";\n    for await (const chunk of req) text += chunk;\n    body = JSON.parse(text);\n  } catch {\n    return send(res, 400, { error: \"invalid JSON\" });\n  }\n  const parsed = parseBooking(body);\n  if (typeof parsed === \"string\") return send(res, 400, { error: parsed });\n  return send(res, 201, { ...parsed, status: \"held\" });\n});\n\nsend() calls res.writeHead(status, { \"content-type\": \"application/json\" }) and res.end(JSON.stringify(payload)). A production server would also cap the body size."
            ),
            part(
              "Tests",
              "node:test tests with node:assert/strict: a unit test for nights given as a string, one for a valid trimmed booking, and an integration test that listens on port 0, posts bad JSON (400) and a valid body (201 with the expected JSON), and closes the server afterward.",
              "test(\"rejects a string nights\", () => {\n  assert.equal(parseBooking({ room: \"12\", nights: \"2\" }), \"nights must be an integer from 1 to 30\");\n});\ntest(\"POST /bookings: 400 on bad JSON, 201 on a valid body\", async () => {\n  server.listen(0);\n  after(() => server.close());\n  const { port } = server.address() as AddressInfo;\n  const url = `http://127.0.0.1:${port}/bookings`;\n  assert.equal((await fetch(url, { method: \"POST\", body: \"{not json\" })).status, 400);\n  const ok = await fetch(url, { method: \"POST\", body: JSON.stringify({ room: \"12\", nights: 2 }) });\n  assert.equal(ok.status, 201);\n  assert.deepEqual(await ok.json(), { room: \"12\", nights: 2, status: \"held\" });\n});\n\nRun with node --test. Port 0 lets the OS choose a free port so tests can run in parallel."
            ),
          ],
        },
      ],
    },
  ],
};
