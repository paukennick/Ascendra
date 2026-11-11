import { GENERAL_SAFETY, part, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-161: JavaScript Programming Coach (JAVASCRIPT), nine units, no exam
// blueprint.
//
// Density (docs/labs.md, "hybrid"): one lab per unit plus one extra where a
// unit has a second performance objective with room -- The DOM & events
// gets two (event handling, and forms) -> 10 labs. Each lab is what the
// unit's gate asks the learner to DO: predict and fix a hoisting surprise,
// repair a lost `this`, transform data with array methods, wire up
// delegated events and a validated form, sequence dependent fetches with
// async/await, split a script into ES modules, predict prototype lookups,
// write the failing Jest test first, and build a validating HTTP endpoint.
//
// Sources: MDN Web Docs (the JavaScript and DOM references), the ECMAScript
// specification, the Node.js API reference and the Jest documentation. The
// Node.js release schedule (checked 2026-11-07) lists Node 26 as Active LTS
// with 24 and 22 in maintenance. Every snippet in a brief or model answer
// was run on Node 22.23.4 on 2026-11-07 (DOM snippets under jsdom, the
// test lab under Jest) and the outputs quoted are the outputs observed;
// nothing used is specific to a newer Node than 22.

export const JAVASCRIPT_LABS: SeedLabSet = {
  trackCode: "JAVASCRIPT",
  sources: [
    source("https://developer.mozilla.org/en-US/docs/Web/JavaScript", "reference", "2026-11-07"),
    source("https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model", "reference", "2026-11-07"),
    source("https://tc39.es/ecma262/", "reference", "2026-11-07"),
    source("https://nodejs.org/api/", "reference", "2026-11-07"),
    source("https://jestjs.io/docs/getting-started", "reference", "2026-11-07"),
  ],
  labs: [
    {
      slug: "var-hoisting-timer-loop",
      objective: "Variables: var vs. let vs. const, and why hoisting makes var risky",
      kind: "build",
      title: "Predict the output, then explain the three surprises",
      brief:
        "A page script at Tideline Rentals (fictional) prints a label and schedules three timers:\n\nconsole.log(label);\nvar label = \"Loaded\";\nfor (var i = 0; i < 3; i++) {\n  setTimeout(function () { console.log(\"timer\", i); }, 0);\n}\nconsole.log(\"loop done\", i);\n\nThe author expected 'Loaded', then 'loop done', then 'timer 0', 'timer 1', 'timer 2'. Without running it, write down exactly what prints and in what order, explain each surprise in terms of hoisting and scope, and rewrite it with let/const so it prints what the author expected (apart from the first line, which should simply print 'Loaded').",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the real output, explain each difference, and rewrite the script.",
          parts: [
            part(
              "Actual output, in order",
              "undefined, then 'loop done 3', then 'timer 3' three times. Order matters: both synchronous logs come before any timer because timers run after the current script finishes.",
              "undefined\nloop done 3\ntimer 3\ntimer 3\ntimer 3\n\nThe synchronous lines run first; the three timer callbacks run after the script finishes, and by then i is 3."
            ),
            part(
              "Why 'undefined' and why 'timer 3'",
              "First line: var declarations are hoisted to the top of the function/script and initialized to undefined, so label exists but has no value yet (a let would throw a ReferenceError in the temporal dead zone instead). Timers: var i is one function-scoped variable shared by every iteration; the callbacks close over that single binding and read it after the loop ends at 3; 'loop done 3' shows i leaked out of the loop.",
              "console.log(label) prints undefined because var label is hoisted: the declaration moves to the top with the value undefined, and the assignment stays where it is. (With let it would be a ReferenceError: 'Cannot access label before initialization' -- the temporal dead zone.) The timers all print 3 because var i is function-scoped: there is one i for the whole loop, every callback captures that same variable, and they run after the loop has pushed it to 3. 'loop done 3' is the same leak -- i is still visible after the loop."
            ),
            part(
              "Rewrite with let/const",
              "Declares label with const before use (or at least moves the log after it); uses let i in the for loop so each iteration gets its own binding and the timers print 0, 1, 2; notes i is no longer visible after the loop (ReferenceError if referenced).",
              "const label = \"Loaded\";\nconsole.log(label);\nfor (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(\"timer\", i), 0);\n}\n// i is not defined here: a block-scoped let dies with the loop\n\nOutput: Loaded, then timer 0, timer 1, timer 2. With let, each iteration of a for loop gets a fresh binding of i, so each arrow function captures its own value. Referencing i after the loop now throws ReferenceError: i is not defined, which is the safety you want."
            ),
          ],
        },
      ],
    },
    {
      slug: "lost-this-in-callback",
      objective: "Understanding `this` in different call contexts",
      kind: "build",
      title: "Fix a method that breaks when passed as a callback",
      brief:
        "Harbor Supply (fictional) has a cart class:\n\nclass Cart {\n  constructor() { this.items = []; }\n  add(item) { this.items.push(item); return this.items.length; }\n}\nconst cart = new Cart();\n\nTwo uses fail with TypeError: Cannot read properties of undefined (reading 'items'):\n\nconst addToCart = cart.add;\naddToCart(\"pen\");\n\n[\"pen\", \"ink\"].forEach(cart.add);\n\nYet cart.add(\"pen\") works. Explain what `this` is in each call, give two different fixes, and say when you would choose each.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Explain the failures, then fix them two ways.",
          parts: [
            part(
              "What `this` is in each call",
              "cart.add(...) binds this to cart because the function is called as a property of cart. addToCart(...) is a plain call, so this is undefined (class bodies are strict mode; in sloppy mode it would be the global object). forEach(cart.add) calls the function itself, not through cart, so this is undefined there too. The value of this is decided by HOW a function is called, not where it was defined.",
              "`this` is set at call time by the call's shape. cart.add(\"pen\") is a method call -- the object before the dot becomes this. const addToCart = cart.add copies just the function; addToCart(\"pen\") is a plain call with no receiver, so this is undefined (class code is strict), and this.items throws. forEach receives the bare function and calls it the same receiver-less way. Nothing about defining add inside the class pins this to the instance."
            ),
            part(
              "Fix 1: bind or wrap at the call site",
              "Either cart.add.bind(cart) (a new function with this fixed) or an arrow wrapper such as items.forEach((item) => cart.add(item)); both leave the class unchanged. States that arrow functions have no this of their own and use the enclosing scope's.",
              "const addToCart = cart.add.bind(cart);\naddToCart(\"pen\");                        // 1\n[\"ink\", \"pad\"].forEach((item) => cart.add(item));\n// cart.items -> ['pen', 'ink', 'pad']\n\nbind returns a new function whose this is permanently cart. The arrow wrapper works because an arrow has no this of its own; it just calls cart.add as a method. Use these when you don't own the class or only one call site needs it."
            ),
            part(
              "Fix 2: make the method an arrow class field",
              "Defines add as a class field holding an arrow function (add = (item) => {...}), so every instance gets a function whose this is lexically the instance; notes the trade-offs: one function per instance instead of one shared on the prototype, and it is not overridable via super in subclasses.",
              "class Cart {\n  items = [];\n  add = (item) => { this.items.push(item); return this.items.length; };\n}\nconst c = new Cart();\nconst f = c.add;\nf(\"a\");          // 1, c.items -> ['a']\n\nThe arrow captures this from the constructor context, so the method survives being detached. Cost: each instance carries its own copy of add (it lives on the instance, not the prototype) and subclasses cannot call super.add(). Choose this when the method is designed to be handed around as a callback (event handlers, React-style handlers); otherwise keep prototype methods and bind at the call site."
            ),
          ],
        },
      ],
    },
    {
      slug: "orders-with-array-methods",
      objective: "Array methods: map, filter, reduce, find, some, every",
      kind: "build",
      title: "Replace the for loops in an order report",
      brief:
        "Saltmarsh Goods (fictional) stores orders like this:\n\nconst orders = [\n  { id: 1, customer: \"Okafor\", status: \"shipped\", items: [{ sku: \"A1\", qty: 2, price: 9.5 }, { sku: \"B2\", qty: 1, price: 20 }] },\n  { id: 2, customer: \"Reyes\", status: \"pending\", items: [{ sku: \"A1\", qty: 1, price: 9.5 }] },\n  { id: 3, customer: \"Okafor\", status: \"shipped\", items: [{ sku: \"C3\", qty: 3, price: 4 }] },\n  { id: 4, customer: \"Lindqvist\", status: \"canceled\", items: [] },\n];\n\nThe report needs, without writing a manual for loop: (1) revenue from shipped orders only; (2) a list of { id, customer, total } summaries; (3) the first pending order; (4) whether any order has no items; (5) whether every order has a non-empty customer string. Give each expression and its value for this data.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the five expressions and state their results.",
          parts: [
            part(
              "Order total and shipped revenue",
              "A helper that reduces an order's items to qty*price (orderTotal), then filter(status === 'shipped') and reduce to a sum = 51 (39 + 12). Uses reduce with an initial value of 0.",
              "const orderTotal = (o) => o.items.reduce((sum, it) => sum + it.qty * it.price, 0);\nconst shippedRevenue = orders\n  .filter((o) => o.status === \"shipped\")\n  .reduce((sum, o) => sum + orderTotal(o), 0);   // 51\n\nOrder 1 is 2*9.5 + 20 = 39, order 3 is 3*4 = 12; the pending and canceled orders are filtered out first. The initial 0 matters: without it reduce on an empty filtered array throws."
            ),
            part(
              "Summaries with map",
              "map returning a new object per order: [{id:1, customer:'Okafor', total:39}, {id:2, customer:'Reyes', total:9.5}, {id:3, customer:'Okafor', total:12}, {id:4, customer:'Lindqvist', total:0}]. Does not mutate the originals.",
              "const summaries = orders.map((o) => ({ id: o.id, customer: o.customer, total: orderTotal(o) }));\n// [{id:1,customer:'Okafor',total:39},{id:2,customer:'Reyes',total:9.5},{id:3,customer:'Okafor',total:12},{id:4,customer:'Lindqvist',total:0}]\n\nmap is one-in, one-out and returns a fresh array; the arrow needs parentheses around the object literal so it isn't parsed as a block."
            ),
            part(
              "find, some, every",
              "find(o => o.status === 'pending') -> the order with id 2 (the object, or undefined if none); some(o => o.items.length === 0) -> true (order 4); every(o => typeof o.customer === 'string' && o.customer.length > 0) -> true. Explains find returns the element not an array, and some/every short-circuit.",
              "const firstPending = orders.find((o) => o.status === \"pending\");          // order 2 (the object itself)\nconst anyEmpty = orders.some((o) => o.items.length === 0);                 // true (order 4)\nconst allNamed = orders.every((o) => typeof o.customer === \"string\" && o.customer.length > 0); // true\n\nfind returns the first matching element (undefined if none), so firstPending?.id is 2. some stops at the first true, every at the first false, so both are cheap. For an SKU quantity report, flatMap over items then reduce into an object gives { A1: 3, B2: 1, C3: 3 }."
            ),
          ],
        },
      ],
    },
    {
      slug: "delegated-click-handler",
      objective: "Event listeners: bubbling, capturing, delegation, and preventDefault",
      kind: "build",
      title: "One listener for every Done button, including future ones",
      brief:
        "A task list at Pinecrest Studio (fictional):\n\n<ul id=\"tasks\">\n  <li data-id=\"1\">Write brief <button class=\"done\">Done</button></li>\n  <li data-id=\"2\">Review PR <button class=\"done\">Done</button></li>\n</ul>\n<form id=\"add\"><input name=\"title\"><button type=\"submit\">Add</button></form>\n\nToday each Done button gets its own click listener in a loop, so buttons added later through the form do nothing, and submitting the form reloads the page. The team wants: one listener for all Done buttons, present and future, that marks the <li> completed; a form handler that adds a new <li> without a page load; and they want to understand the order in which listeners fire when a button inside the list is clicked.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the delegated handler and the submit handler, and explain propagation order.",
          parts: [
            part(
              "Delegated click handler",
              "One listener on #tasks (or an ancestor) that uses event.target.closest('button.done') to find the real button (clicks can land on child nodes), ignores other clicks, then walks to the <li> with closest('li') and marks it (class or dataset). Explains this works for future buttons because the event bubbles up to the list.",
              "const list = document.getElementById(\"tasks\");\nlist.addEventListener(\"click\", (event) => {\n  const button = event.target.closest(\"button.done\");\n  if (!button || !list.contains(button)) return;\n  const item = button.closest(\"li\");\n  item.classList.add(\"completed\");\n});\n\nThe click starts on the button and bubbles up through li and ul, so the list's listener sees it. closest() handles clicks on text or icons inside the button and lets us ignore clicks on the list itself. Because the listener lives on the list, a button appended later works without any new wiring."
            ),
            part(
              "Form submit without a reload",
              "Listens for the form's submit event (not the button's click), calls event.preventDefault() first, reads and trims the title (event.target.elements.title.value), ignores empty input, and appends a new <li data-id> with its own Done button via createElement/append.",
              "document.getElementById(\"add\").addEventListener(\"submit\", (event) => {\n  event.preventDefault();               // the browser would otherwise navigate\n  const title = event.target.elements.title.value.trim();\n  if (!title) return;\n  const li = document.createElement(\"li\");\n  li.dataset.id = String(nextId++);\n  li.append(title, \" \");\n  const b = document.createElement(\"button\");\n  b.className = \"done\"; b.textContent = \"Done\";\n  li.append(b);\n  list.append(li);\n});\n\nListening on submit (not click) also catches Enter in the input. preventDefault stops the default GET to the same URL, which is the 'reload'. The new Done button is handled by the delegated listener with no extra code."
            ),
            part(
              "Propagation order",
              "Capture phase from window/document down to the target (listeners registered with capture: true or the third argument true fire here), then the target, then bubble back up; so for listeners on the list (capture), the button, and the list (bubble) the order is list(capture) -> button -> list(bubble). Mentions stopPropagation would halt the rest.",
              "Capture first, from the document down: a list listener registered with { capture: true } fires before anything on the button. Then the target's own listeners. Then bubbling back up: the list's ordinary listener. So: list(capture) -> button -> list(bubble). event.stopPropagation() in the button handler would stop the bubble-phase list listener from running -- which is exactly why delegation breaks if someone sprinkles stopPropagation inside the list."
            ),
          ],
        },
      ],
    },
    {
      slug: "accessible-form-validation",
      objective: "Working with forms and form validation",
      kind: "build",
      title: "Validate a sign-up form and tell the user what is wrong",
      brief:
        "Fernway Library (fictional) has a sign-up form with an email field (required, type=email) and an age field (required, type=number, min 18, max 120). The team wants custom error messages shown next to each field instead of the browser bubbles, errors announced to screen-reader users, the first invalid field focused on a failed submit, errors cleared as the user fixes them, and the form data collected as an object only when everything is valid. Markup:\n\n<form id=\"signup\" novalidate>\n  <label for=\"email\">Email</label>\n  <input id=\"email\" name=\"email\" type=\"email\" required aria-describedby=\"email-error\">\n  <p id=\"email-error\" role=\"alert\"></p>\n  <label for=\"age\">Age</label>\n  <input id=\"age\" name=\"age\" type=\"number\" min=\"18\" max=\"120\" required aria-describedby=\"age-error\">\n  <p id=\"age-error\" role=\"alert\"></p>\n  <button type=\"submit\">Sign up</button>\n</form>",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the validation code and explain the choices.",
          parts: [
            part(
              "Per-field check using the Constraint Validation API",
              "A function that reads input.validity (valid, valueMissing, typeMismatch, rangeUnderflow, rangeOverflow) and writes a specific message into the element named by aria-describedby, sets aria-invalid=\"true\" when invalid and removes it when valid. Uses the built-in constraints rather than hand-written regexes.",
              "function showError(input) {\n  const out = document.getElementById(input.getAttribute(\"aria-describedby\"));\n  if (input.validity.valid) { out.textContent = \"\"; input.removeAttribute(\"aria-invalid\"); return true; }\n  input.setAttribute(\"aria-invalid\", \"true\");\n  if (input.validity.valueMissing) out.textContent = \"This field is required.\";\n  else if (input.validity.typeMismatch) out.textContent = \"Enter a valid email address.\";\n  else if (input.validity.rangeUnderflow) out.textContent = `Must be at least ${input.min}.`;\n  else if (input.validity.rangeOverflow) out.textContent = `Must be at most ${input.max}.`;\n  else out.textContent = input.validationMessage;\n  return false;\n}\n\nThe browser already knows whether the field is valid and why; validity.* tells us which rule failed so the message can be specific. novalidate on the form only suppresses the browser's bubbles -- the constraints still evaluate."
            ),
            part(
              "Submit and input handlers",
              "On submit: preventDefault, run the check on every input, focus the first invalid one, and only when all pass build the data (e.g. Object.fromEntries(new FormData(form))). On input (delegated on the form): re-run the check for that field so errors clear as the user types.",
              "form.addEventListener(\"submit\", (event) => {\n  event.preventDefault();\n  const inputs = [...form.querySelectorAll(\"input\")];\n  const results = inputs.map(showError);\n  if (results.every(Boolean)) {\n    const data = Object.fromEntries(new FormData(form));   // { email: 'a@b.co', age: '34' }\n    send(data);\n  } else {\n    inputs[results.indexOf(false)].focus();\n  }\n});\nform.addEventListener(\"input\", (e) => { if (e.target.matches(\"input\")) showError(e.target); });\n\nEmpty submit: both fields show 'This field is required.' and focus lands on email. 'not-an-email' and 16: 'Enter a valid email address.' and 'Must be at least 18.' Valid values: both messages clear and the data object is built. FormData values are strings, so convert age with Number() before use."
            ),
            part(
              "Why these accessibility choices",
              "Explains at least two: label[for] ties the visible label to the input; aria-describedby links the message so screen readers read it with the field; role=\"alert\" announces the message when it appears; aria-invalid conveys state; focusing the first error moves keyboard users to the problem.",
              "label for= gives each field an accessible name. aria-describedby makes the error text part of what a screen reader announces when the field is focused, and role=\"alert\" announces it the moment it is written. aria-invalid=\"true\" tells assistive tech the state without relying on a red border. Moving focus to the first invalid field means a keyboard or screen-reader user is taken to the problem instead of hunting for it."
            ),
          ],
        },
      ],
    },
    {
      slug: "dependent-fetches-async-await",
      objective: "async/await syntax and error handling with try/catch",
      kind: "build",
      title: "Fix a chain of dependent requests",
      brief:
        "Lantern Workspaces (fictional) loads a user, then the user's team:\n\nasync function loadUserTeam(userId) {\n  const res = fetch(`/users/${userId}`);\n  const user = res.json();\n  const teamRes = await fetch(`/teams/${user.teamId}`);\n  return teamRes.json();\n}\n\nIt rejects with TypeError: res.json is not a function. Separately, when a user id does not exist the API returns a 404 with a JSON body {\"error\":\"not found\"}, and the current code silently requests /teams/undefined. Fix the function so it awaits correctly, turns HTTP errors into thrown errors with useful messages, and explain what the event loop is doing while each await is pending. Then say how you would load three independent resources at once.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the corrected function, explain the waiting, and show the parallel case.",
          parts: [
            part(
              "Corrected function",
              "Awaits fetch (a Promise) and awaits res.json() (also a Promise); checks res.ok (fetch does not reject on 404/500) and throws an Error that names the resource and status before using the body; does the same for the team call; returns the parsed team.",
              "async function loadUserTeam(userId) {\n  const res = await fetch(`/users/${userId}`);\n  if (!res.ok) throw new Error(`user ${userId}: HTTP ${res.status}`);\n  const user = await res.json();\n  const teamRes = await fetch(`/teams/${user.teamId}`);\n  if (!teamRes.ok) throw new Error(`team ${user.teamId}: HTTP ${teamRes.status}`);\n  return teamRes.json();\n}\n\nThe original failed because fetch() returns a Promise, so res was a Promise with no .json method. fetch only rejects on network failure; a 404 resolves normally with ok false, which is why the broken code marched on to /teams/undefined. For user 99 the fixed version throws 'user 99: HTTP 404'."
            ),
            part(
              "Error handling at the call site",
              "Wraps the await in try/catch (or .catch on the returned promise) where the result is used, so the UI can show a message; notes an async function's throw becomes a rejected promise, and an unawaited call drops the error.",
              "try {\n  const team = await loadUserTeam(7);\n  render(team);\n} catch (err) {\n  showError(err.message);   // e.g. 'user 99: HTTP 404'\n}\n\nInside an async function, throw rejects the returned promise; try/catch around await catches both thrown errors and rejected promises in one place. If a caller forgets to await (or .catch), the rejection is unhandled and the error is lost -- which is what was happening before."
            ),
            part(
              "What the event loop does during await, and the parallel case",
              "During await the function suspends and returns control to the event loop, which runs other callbacks/timers/rendering; when the promise settles, the continuation is queued as a microtask and runs after the current task. For independent resources: start all fetches first and await Promise.all([...]) so they overlap (three 50 ms calls take about 50 ms, not 150), and note Promise.all rejects on the first failure (Promise.allSettled if partial results are wanted).",
              "await does not block the thread. The function parks, the event loop keeps handling clicks, timers and paints, and when the fetch promise settles the rest of the function is queued as a microtask and resumes. That is why two awaits in a row are sequential -- the second request isn't even sent until the first resolves -- which is right here because the team id depends on the user.\n\nFor independent data, start everything, then wait once:\nconst [user, settings, notices] = await Promise.all([\n  fetch('/users/7').then(ok), fetch('/settings').then(ok), fetch('/notices').then(ok),\n]);\nIn a test with three 50 ms fake fetches this took about 50 ms, not 150. Promise.all rejects as soon as one rejects; use Promise.allSettled when you want the successes anyway."
            ),
          ],
        },
      ],
    },
    {
      slug: "script-to-es-modules",
      objective: "ES modules: import/export, default vs. named exports",
      kind: "build",
      title: "Split a global-variable script into ES modules",
      brief:
        "A checkout script at Juniper Prints (fictional) is one file with globals:\n\nvar TAX_RATE = 0.1;\nvar items = [];\nfunction addItem(name, price) { items.push({ name: name, price: price }); }\nfunction total() {\n  var sum = 0;\n  for (var i = 0; i < items.length; i++) sum += items[i].price;\n  return \"Total: $\" + (sum * (1 + TAX_RATE)).toFixed(2) + \" (\" + items.length + \" items)\";\n}\naddItem(\"pen\", 2); addItem(\"pad\", 8);\nconsole.log(total());   // Total: $11.00 (2 items)\n\nTwo other scripts on the page also declare a global named items, and they clobber each other. Refactor into three ES modules -- a Cart class as a default export with TAX_RATE as a named export, a formatting module that imports TAX_RATE and exports receipt(cart), and an entry module -- using template literals. The output must stay 'Total: $11.00 (2 items)'.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the three modules and explain the export choices.",
          parts: [
            part(
              "cart module",
              "export default class Cart with private or encapsulated items, an add method and a subtotal/count; export const TAX_RATE = 0.1 as a named export. No var, no globals.",
              "// cart.mjs\nexport const TAX_RATE = 0.1;\n\nexport default class Cart {\n  #items = [];\n  add(name, price) { this.#items.push({ name, price }); return this; }\n  get count() { return this.#items.length; }\n  subtotal() { return this.#items.reduce((sum, { price }) => sum + price, 0); }\n}\n\nThe item list is now per-cart and private; nothing is attached to the global object, so the other scripts' items can no longer collide with it."
            ),
            part(
              "format and entry modules",
              "format module: import { TAX_RATE } from './cart.mjs'; export function receipt(cart) using a template literal. Entry: import Cart from './cart.mjs' (default, any local name) and import { receipt } from './format.mjs' (named, exact name or 'as'); builds the cart and logs 'Total: $11.00 (2 items)'.",
              "// format.mjs\nimport { TAX_RATE } from \"./cart.mjs\";\nexport function receipt(cart) {\n  const total = cart.subtotal() * (1 + TAX_RATE);\n  return `Total: $${total.toFixed(2)} (${cart.count} items)`;\n}\n\n// main.mjs\nimport Cart from \"./cart.mjs\";\nimport { receipt } from \"./format.mjs\";\nconst cart = new Cart().add(\"pen\", 2).add(\"pad\", 8);\nconsole.log(receipt(cart));          // Total: $11.00 (2 items)\n\nIn the browser the entry is loaded with <script type=\"module\" src=\"main.mjs\">; in Node a .mjs extension (or \"type\": \"module\" in package.json) marks the files as ES modules."
            ),
            part(
              "Default vs named, and what modules give you",
              "Explains: a module has one default export (imported under any name) and any number of named exports (imported by exact name, renamable with as); module top-level is its own scope and strict mode, so TAX_RATE and items are not globals (typeof items in main is 'undefined'); imports are live, read-only bindings; prefer named exports for several related values and a default for the module's one main thing.",
              "Default export: the module's one main thing, imported under whatever name the importer likes (import Cart from ...). Named exports: as many as you want, imported by their exact names in braces (or renamed with as), which also lets editors autocomplete and refactor them. Every module has its own top-level scope and runs in strict mode, so TAX_RATE and the cart's items never touch window -- in main.mjs typeof items is 'undefined'. Imported bindings are live and read-only: if cart.mjs later reassigned an exported let, importers would see the new value, but they cannot assign to it themselves."
            ),
          ],
        },
      ],
    },
    {
      slug: "prototype-chain-lookup",
      objective: "The prototype chain and how method lookup actually works",
      kind: "build",
      title: "Predict property lookups through a three-level chain",
      brief:
        "An interview exercise at Copperline Labs (fictional):\n\nconst animal = { legs: 4, describe() { return `${this.name} has ${this.legs} legs`; } };\nconst dog = Object.create(animal);\ndog.name = \"Rex\";\nconst puppy = Object.create(dog);\npuppy.name = \"Bit\";\n\nconsole.log(puppy.describe());                                   // (1)\nconsole.log(Object.hasOwn(puppy, \"legs\"), \"legs\" in puppy);      // (2)\npuppy.legs = 3;\nconsole.log(puppy.describe(), \"|\", dog.describe());               // (3)\nanimal.sound = \"...\";\nconsole.log(puppy.sound);                                        // (4)\n\nPredict each line, explain how each lookup is resolved, and then describe what happens at the end of the chain.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Give the four outputs with the lookup path for each, then explain the end of the chain.",
          parts: [
            part(
              "Lines (1) and (2)",
              "(1) 'Bit has 4 legs': describe is found on animal after missing on puppy and dog; this is puppy because of the call site, so this.name is puppy's own 'Bit' and this.legs walks up to animal's 4. (2) false true: hasOwn checks only puppy's own properties; the in operator searches the whole chain.",
              "(1) Bit has 4 legs. puppy has no describe, dog has none, animal does -- but `this` is puppy (the object before the dot), so this.name finds puppy's own name 'Bit' and this.legs misses on puppy and dog and finds animal's 4.\n(2) false true. Object.hasOwn(puppy, 'legs') is false because legs lives on animal, not puppy; 'legs' in puppy is true because in walks the prototype chain."
            ),
            part(
              "Lines (3) and (4)",
              "(3) 'Bit has 3 legs | Rex has 4 legs': assigning puppy.legs creates an own property on puppy that shadows animal.legs; dog is unaffected. (4) '...': a property added to animal later is visible immediately through the live chain. States that assignment never writes through to the prototype.",
              "(3) Bit has 3 legs | Rex has 4 legs. Assignment goes on the receiver: puppy.legs = 3 creates an own property on puppy that shadows the inherited one; animal.legs is still 4, so dog still reports 4. Writes never travel up the chain.\n(4) ... -- the chain is a live link, not a copy. Adding sound to animal after the objects were created is still found when puppy.sound misses on puppy and dog."
            ),
            part(
              "End of the chain",
              "animal's prototype is Object.prototype (where toString, hasOwnProperty live), whose prototype is null; a lookup that reaches null yields undefined (not an error). Object.getPrototypeOf(puppy) === dog. Mentions that class syntax builds the same chain (instance -> Class.prototype -> Parent.prototype -> Object.prototype).",
              "Object.getPrototypeOf(puppy) === dog, then animal, then Object.prototype -- which is why puppy.toString exists (puppy.toString === Object.prototype.toString). Object.prototype's prototype is null; a name that is found nowhere resolves to undefined rather than throwing. class syntax builds exactly this structure: new Dog() -> Dog.prototype -> Animal.prototype -> Object.prototype -> null, with methods shared on the prototype objects and own data on the instance."
            ),
          ],
        },
      ],
    },
    {
      slug: "failing-jest-test-first",
      objective: "Writing unit tests with Jest: assertions, mocks, test structure",
      kind: "build",
      title: "Write the failing Jest test, then fix the function",
      brief:
        "Finance at Bramble Outdoor (fictional) reports that discount totals look too low and a 100% promo code produced a negative total. The function:\n\n// discount.js\nfunction applyDiscount(subtotal, percent, logger) {\n  const discount = subtotal * percent / 100;\n  const total = subtotal - discount - 5;   // 5 = shipping, always added\n  logger.info(`discount ${percent}% on ${subtotal}: ${total}`);\n  return total;\n}\nmodule.exports = { applyDiscount };\n\nRules: shipping of 5 is added when anything is owed; a total is never negative; the logger must be called once with the percentage. Work test-first in Jest: write the test file with a mocked logger, state what it reports against this code, then fix the function.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the test module, state the failures it produces, and give the fixed function.",
          parts: [
            part(
              "Test file",
              "describe/test structure; a jest.fn() logger created in beforeEach; expect(...).toBe(95) for applyDiscount(100, 10); a non-negativity assertion for a 100% discount (toBeGreaterThanOrEqual(0)); toHaveBeenCalledTimes(1) and toHaveBeenCalledWith(expect.stringContaining('20%')) on the mock.",
              "const { applyDiscount } = require(\"./discount\");\n\ndescribe(\"applyDiscount\", () => {\n  let logger;\n  beforeEach(() => { logger = { info: jest.fn() }; });\n\n  test(\"takes the percentage off and adds shipping\", () => {\n    expect(applyDiscount(100, 10, logger)).toBe(95);\n  });\n\n  test(\"a 100% discount never goes below zero\", () => {\n    expect(applyDiscount(3, 100, logger)).toBeGreaterThanOrEqual(0);\n  });\n\n  test(\"logs once with the percentage\", () => {\n    applyDiscount(50, 20, logger);\n    expect(logger.info).toHaveBeenCalledTimes(1);\n    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(\"20%\"));\n  });\n});\n\nThe mock replaces the real logger so the test neither writes logs nor depends on a logging library, and it records calls so we can assert on them."
            ),
            part(
              "What Jest reports and why",
              "2 failed, 1 passed: the first test gets 85 instead of 95 (shipping is subtracted, not added: 100 - 10 - 5), the second gets -5 (3 - 3 - 5, nothing floors it); the logging test passes. Diagnoses both bugs.",
              "Tests: 2 failed, 1 passed. 'takes the percentage off and adds shipping' -- Expected 95, Received 85: the comment says shipping is added but the code subtracts it (100 - 10 - 5). 'a 100% discount never goes below zero' -- Expected >= 0, Received -5: 3 - 3 - 5, and nothing clamps the result. The logging test passes because the mock was called once with 'discount 20% ...'. Two separate defects, each caught by a separate test, which is why they are separate tests."
            ),
            part(
              "Fixed function",
              "Adds shipping (not subtracts) only when something is owed, clamps at zero, optionally rejects percent outside 0-100 with a RangeError, keeps the single logger call. All three tests pass.",
              "const SHIPPING = 5;\nfunction applyDiscount(subtotal, percent, logger) {\n  if (percent < 0 || percent > 100) throw new RangeError(`percent out of range: ${percent}`);\n  const discounted = subtotal * (1 - percent / 100);\n  const total = Math.max(0, discounted) + (discounted > 0 ? SHIPPING : 0);\n  logger.info(`discount ${percent}% on ${subtotal}: ${total}`);\n  return total;\n}\nmodule.exports = { applyDiscount };\n\nTests: 3 passed. applyDiscount(100, 10) is 90 + 5 = 95; applyDiscount(3, 100) is 0 with no shipping charged on a zero order. The RangeError guard is extra: add a fourth test with expect(() => ...).toThrow(RangeError) so it is covered too."
            ),
          ],
        },
      ],
    },
    {
      slug: "validating-json-endpoint",
      objective: "Building a simple HTTP server or Express route",
      kind: "build",
      title: "Build a POST endpoint that validates JSON",
      brief:
        "Skylark Rooms (fictional) needs a tiny booking service with no framework: POST /bookings accepts JSON { room: string, guests: integer 1-8 } and returns 201 with { id, room, guests }. Everything else must be a clear JSON error: wrong path or method 404, non-JSON content type 415, malformed JSON 400, failed validation 422 with a list of problems, and a body over 16 KB 413. The port comes from the PORT environment variable with a default of 3000. The team also asks what happens if two requests arrive at the same time.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the server, show how you tested it, and answer the concurrency question.",
          parts: [
            part(
              "Server code",
              "node:http createServer; a sendJson helper setting content-type application/json and status; method/url check (404); content-type check (415); accumulates body chunks on 'data' with a size guard that counts bytes, not characters (413); on 'end' JSON.parse in try/catch (400); rejects a parsed value that is not a plain object (null, a number, an array) with 422 before reading fields, so a body of null cannot crash the process; validation producing an errors array (422) covering room is non-empty string and guests is an integer 1-8; 201 on success; listens on Number(process.env.PORT ?? 3000).",
              "import { createServer } from \"node:http\";\nconst MAX_BODY = 16 * 1024; // bytes\nconst port = Number(process.env.PORT ?? 3000);\n\nfunction sendJson(res, status, body) {\n  res.writeHead(status, { \"content-type\": \"application/json\" });\n  res.end(JSON.stringify(body));\n}\n\ncreateServer((req, res) => {\n  if (req.method !== \"POST\" || req.url !== \"/bookings\") return sendJson(res, 404, { error: \"not found\" });\n  if (!/^application\\/json\\b/.test(req.headers[\"content-type\"] ?? \"\")) return sendJson(res, 415, { error: \"send application/json\" });\n  const chunks = [];\n  let size = 0;\n  req.on(\"data\", (chunk) => {\n    if (res.writableEnded) return;\n    size += chunk.length; // chunk is a Buffer, so this counts bytes, not characters\n    if (size > MAX_BODY) {\n      res.setHeader(\"connection\", \"close\");\n      sendJson(res, 413, { error: \"body too large\" });\n      req.resume(); // discard the rest; the connection closes after the reply\n      return;\n    }\n    chunks.push(chunk);\n  });\n  req.on(\"end\", () => {\n    if (res.writableEnded) return;\n    let body;\n    try { body = JSON.parse(Buffer.concat(chunks).toString(\"utf8\")); } catch { return sendJson(res, 400, { error: \"malformed JSON\" }); }\n    if (body === null || typeof body !== \"object\" || Array.isArray(body)) return sendJson(res, 422, { errors: [\"body must be a JSON object\"] });\n    const errors = [];\n    if (typeof body.room !== \"string\" || !body.room.trim()) errors.push(\"room is required\");\n    if (!Number.isInteger(body.guests) || body.guests < 1 || body.guests > 8) errors.push(\"guests must be an integer 1-8\");\n    if (errors.length) return sendJson(res, 422, { errors });\n    sendJson(res, 201, { id: 42, room: body.room.trim(), guests: body.guests });\n  });\n}).listen(port, () => console.log(`listening on ${port}`));\n\nThe body arrives as a stream of Buffer chunks, so the size guard adds up bytes (a character such as \u00e9 is two bytes in UTF-8, so counting string length would let a body of up to twice the limit through) and the text is decoded once on 'end'. JSON.parse accepts any JSON value, so null, a number or an array get past the parse; the object check turns them into a 422 instead of a TypeError on body.room that would crash the whole process. The content-type regex tolerates '; charset=utf-8'."
            ),
            part(
              "How it was tested",
              "curl (or fetch) requests for each path: valid body -> 201 {id, room, guests}; {\"room\":\"\",\"guests\":0} -> 422 with two errors; null -> 422 and the server still answers the next request; '{bad' -> 400; a body over 16 KB -> 413; a form-encoded body -> 415; GET /bookings -> 404. States the observed status codes and bodies.",
              "PORT=3123 node server.mjs, then:\ncurl -X POST localhost:3123/bookings -H 'content-type: application/json' -d '{\"room\":\"Rainier\",\"guests\":2}'   -> 201 {\"id\":42,\"room\":\"Rainier\",\"guests\":2}\n... -d '{\"room\":\"\",\"guests\":0}'   -> 422 {\"errors\":[\"room is required\",\"guests must be an integer 1-8\"]}\n... -d 'null'                       -> 422 {\"errors\":[\"body must be a JSON object\"]}   (and the next request still gets an answer)\n... -d '{bad'                      -> 400 {\"error\":\"malformed JSON\"}\n... --data-binary @big.json     -> 413 {\"error\":\"body too large\"}   (9,000 é characters = 18,000 bytes)\ncurl -X POST localhost:3123/bookings -d 'room=x'   -> 415 {\"error\":\"send application/json\"}\ncurl localhost:3123/bookings        -> 404 {\"error\":\"not found\"}\nEach branch has a request that reaches it; the same checks become node:test cases with fetch against the listening server."
            ),
            part(
              "Two requests at once",
              "Node runs JavaScript on one thread with an event loop: both requests are accepted; their data/end callbacks interleave as chunks arrive, but each callback runs to completion without being interrupted, so per-request state (raw, body) is in the closure for that request and cannot mix. Long synchronous work in a handler would delay the other request. Races appear only where a handler reads shared state, awaits something, then writes based on what it read; a synchronous counter increment cannot be interrupted.",
              "Both connections are accepted and their 'data'/'end' events are interleaved on the single JavaScript thread, one callback at a time. Each request's raw buffer lives in its own closure, so the two bodies cannot mix, and nothing in a callback is pre-empted mid-way. The costs: a slow synchronous step (a tight CPU loop, a synchronous file read) in one handler stalls the other request until it finishes. A module-level counter incremented in one synchronous statement (id = ++nextId) is safe, because no other callback can run between the read and the write. Real races appear when a handler reads shared state, awaits I/O, then acts on what it read: once bookings go to a database, two requests can both check 'room free' before either inserts, and both book it. The fix is to make the check-and-write atomic in the store (a unique constraint or a conditional insert) or serialize access to that room."
            ),
          ],
        },
      ],
    },
  ],
};
