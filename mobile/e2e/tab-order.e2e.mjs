// REQ-206 follow-up: keyboard Tab order on the web build, screen by screen.
//
// For each screen it Tabs forward through every control, then Shift+Tabs back,
// and checks
//   (a) order     -- the stops follow visual order (top to bottom, left to right);
//                    Shift+Tab visits the same stops in reverse
//   (b) indicator -- every focused element shows that it has focus
//                    (a non-zero outline, a box-shadow, or a style change)
//   (c) no trap   -- focus leaves the page within MAX_STOPS presses; a modal or
//                    sheet keeps focus inside, wraps, closes on Escape and gives
//                    focus back to the control that opened it
//   (d) hidden    -- no zero-size, hidden, inert, aria-hidden, off-screen or
//                    covered element takes focus
//
// It needs a running web build and a verified account; see mobile/e2e/README.md.
// Output: one line per screen, a JSON summary (E2E_JSON_OUT), exit code 1 on any
// failure. Playwright is not a dependency of this repo: point PLAYWRIGHT_DIR at a
// folder that has it in node_modules.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(process.env.PLAYWRIGHT_DIR ? path.join(process.env.PLAYWRIGHT_DIR, "x.js") : import.meta.url);
const { chromium } = require("playwright");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const TRACK = process.env.E2E_TRACK;
const OBJECTIVE = process.env.E2E_OBJECTIVE;
const UNIT = process.env.E2E_UNIT;
const LAB = process.env.E2E_LAB; // optional: a lab id
const SIM = process.env.E2E_SIM; // optional: a sim id
const MAX_STOPS = 120;
const ONLY = process.env.E2E_ONLY ? new RegExp(process.env.E2E_ONLY) : null;

const SELFTEST = process.env.E2E_SELFTEST === "1";
if (!SELFTEST && (!EMAIL || !PASSWORD || !TRACK || !OBJECTIVE || !UNIT)) {
  console.error("Set E2E_EMAIL, E2E_PASSWORD, E2E_TRACK, E2E_OBJECTIVE and E2E_UNIT (see mobile/e2e/README.md).");
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function settle(page, ms = 1200) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
}

// ---- in-page helpers -------------------------------------------------------
// Runs in the browser. Tags each element it sees so the same element can be
// recognised on the way back.
const PAGE_HELPERS = `
(() => {
  window.__tab = window.__tab || { next: 1 };
  const SNAP = ["outlineStyle", "outlineWidth", "outlineColor", "boxShadow", "borderTopColor", "borderBottomColor", "backgroundColor", "opacity"];
  const snap = (el) => {
    const out = [];
    let n = el;
    for (let i = 0; i < 3 && n; i++, n = n.parentElement) {
      const cs = getComputedStyle(n);
      out.push(SNAP.map((k) => cs[k]).join("|"));
    }
    return out;
  };
  window.__tab.describe = () => {
    const el = document.activeElement;
    if (!el || el === document.body || el === document.documentElement) return { gone: true };
    // the Next dev-server error overlay is not part of the app (it does not exist in a static export)
    if (el.closest("nextjs-portal")) return { gone: true };
    if (!el.dataset.tabid) el.dataset.tabid = String(window.__tab.next++);
    const r = el.getBoundingClientRect();
    let top = r.top, left = r.left;
    for (let p = el.parentElement; p; p = p.parentElement) { top += p.scrollTop; left += p.scrollLeft; }
    const hidden = [];
    if (r.width === 0 || r.height === 0) hidden.push("zero-size");
    for (let p = el; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === "none" || s.visibility === "hidden") { hidden.push("css-hidden"); break; }
      if (p.getAttribute("aria-hidden") === "true") { hidden.push("aria-hidden"); break; }
      if (p.hasAttribute("inert")) { hidden.push("inert"); break; }
    }
    if (parseFloat(getComputedStyle(el).opacity) === 0) hidden.push("opacity-0");
    if (r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) hidden.push("off-screen");
    else {
      const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
      const cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const hit = document.elementFromPoint(cx, cy);
      if (!hit || !(el === hit || el.contains(hit) || hit.contains(el))) hidden.push("covered");
    }
    const cs = getComputedStyle(el);
    const focused = snap(el);
    const hasRing = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
    el.blur();
    const blurred = snap(el);
    el.focus({ preventScroll: true });
    const changed = focused.some((s, i) => s !== blurred[i]);
    const dialog = el.closest('[role="dialog"]');
    return {
      id: el.dataset.tabid,
      tag: el.tagName.toLowerCase(),
      label: (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || el.tagName).replace(/\\s+/g, " ").trim().slice(0, 40),
      top: Math.round(top), x: Math.round(left), w: Math.round(r.width), h: Math.round(r.height),
      hidden, indicator: hasRing || changed, inDialog: !!dialog, tabindex: el.getAttribute("tabindex"),
    };
  };
  // Visible elements that look clickable (cursor: pointer) but are neither focusable nor inside
  // something focusable: a mouse can use them, the keyboard cannot.
  window.__tab.unreachable = () => {
    const FOC = 'a[href],button,input,select,textarea,summary,[tabindex],[contenteditable="true"]';
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest("nextjs-portal,[inert],[aria-hidden='true']")) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (getComputedStyle(el).cursor !== "pointer") continue;
      if (el.closest(FOC) || el.querySelector(FOC)) continue;
      if (el.closest("[disabled],[aria-disabled='true']")) continue;
      // a focusable control laid over it (a switch's visual track sits under its real input) takes the click
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && (hit === el || !el.contains(hit)) && hit.closest(FOC)) continue;
      const text = (el.getAttribute("aria-label") || el.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 40);
      const up = el.closest("[role],[data-testid]") || el.parentElement;
      out.push((text || "(no text)") + " <" + el.tagName.toLowerCase() + (up && up !== el ? " in " + up.tagName.toLowerCase() + (up.getAttribute("role") ? "[role=" + up.getAttribute("role") + "]" : "") + ">" : ">") + " " + Math.round(r.width) + "x" + Math.round(r.height) + " at " + Math.round(r.left) + "," + Math.round(r.top));
    }
    return out.slice(0, 10);
  };
  // How many stops a full Tab pass should have: visible, enabled, tabbable elements (radios count once per group).
  window.__tab.expected = () => {
    const sel = 'a[href],button,input,select,textarea,summary,[tabindex],[contenteditable="true"]';
    const n = [];
    const radios = new Set();
    for (const el of document.querySelectorAll(sel)) {
      if (el.closest("nextjs-portal,[inert],[aria-hidden='true']")) continue;
      if (el.disabled || el.getAttribute("tabindex") === "-1" || (el.type === "hidden")) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (el.type === "radio") { const k = el.name || el; if (radios.has(k)) continue; radios.add(k); }
      n.push({ label: (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || el.tagName).replace(/\\s+/g, " ").trim().slice(0, 40), tag: el.tagName.toLowerCase(), el: el });
    }
    return n.map((x) => ({ label: x.label, tag: x.tag, id: x.el.dataset.tabid || null, info: "tabindex=" + x.el.getAttribute("tabindex") + " role=" + x.el.getAttribute("role") + " aria-disabled=" + x.el.getAttribute("aria-disabled") + " y=" + Math.round(x.el.getBoundingClientRect().top)}));
  };
  // Start the next Tab at the top of the document. blur() alone leaves the browser's "sequential
  // focus navigation starting point" where the last click or focus was, so earlier controls would be skipped.
  window.__tab.reset = () => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.scrollTo(0, 0);
    // park focus on a throwaway node at the top of the body, then remove it: the next Tab starts from there
    const probe = document.createElement("span");
    probe.tabIndex = -1;
    document.body.insertBefore(probe, document.body.firstChild);
    probe.focus({ preventScroll: true });
    probe.remove();
    const sel = window.getSelection();
    if (sel) { const r = document.createRange(); r.setStart(document.body, 0); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
  };
})();
`;

async function installHelpers(page) {
  await page.evaluate(PAGE_HELPERS);
}

async function press(page, key) {
  await page.keyboard.press(key);
  // let the browser move focus and paint before reading it
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(80);
  return page.evaluate(() => window.__tab.describe());
}

// ---- the audit of one screen ----------------------------------------------
async function audit(page, name) {
  await installHelpers(page);
  await page.evaluate(() => window.__tab.reset());
  const forward = [];
  let left = false;
  const expectedList = await page.evaluate(() => window.__tab.expected());
  const expected = expectedList.length;
  for (let i = 0; i < MAX_STOPS; i++) {
    let d = await press(page, "Tab");
    // the first Tab into a page from a blurred state can land on the document itself
    if (d.gone && i === 0) d = await press(page, "Tab");
    if (d.gone) { left = true; break; }
    // Tab did not move focus. On a page whose controls have all been visited that is just the browser
    // wrapping onto the only control; otherwise it is stuck.
    if (forward.length && forward.at(-1).id === d.id) { left = forward.length >= expected; break; }
    if (forward.length && forward[0].id === d.id) { left = true; break; } // wrapped inside the page
    forward.push(d);
  }
  const trapped = !left;
  if (!forward.length) {
    // Tab found nothing to focus: say what has focus, so a broken run is not read as a pass.
    const where = await page.evaluate(() => (document.querySelector("main,[role=main]") || document.body).innerText.replace(/\s+/g, " ").slice(0, 110));
    console.log(`     note: no Tab stops on "${name}"; the page says: ${where}`);
    const ctl = await page.evaluate(() => [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].slice(0, 8).map((e) => `${e.tagName.toLowerCase()}${e.disabled ? "[disabled]" : ""}${e.closest("[inert]") ? "[inert]" : ""} tabindex=${e.getAttribute("tabindex")} "${(e.getAttribute("aria-label") || e.innerText || "").slice(0, 25)}"`));
    console.log(`     note: focusable-looking controls in the DOM: ${ctl.length ? ctl.join("; ") : "none"}`);
  }

  const back = [];
  for (let i = 0; i < MAX_STOPS && forward.length; i++) {
    let d = await press(page, "Shift+Tab");
    // the first Shift+Tab from the end of the page can land on the document itself
    if (d.gone && i === 0) d = await press(page, "Shift+Tab");
    if (d.gone) break;
    back.push(d);
    if (d.id === forward[0].id) break;
  }

  const issues = { order: [], indicator: [], trap: [], hidden: [] };
  // (a) visual order
  for (let i = 1; i < forward.length; i++) {
    const p = forward[i - 1], n = forward[i];
    const rowTol = Math.max(8, Math.min(p.h, n.h) * 0.6);
    const lower = n.top > p.top + rowTol;
    const sameRow = Math.abs(n.top - p.top) <= rowTol && n.x >= p.x - 2;
    if (!lower && !sameRow) issues.order.push(`"${p.label}" (${p.x},${p.top}) -> "${n.label}" (${n.x},${n.top})`);
  }
  const fwdIds = forward.map((s) => s.id);
  const backIds = back.map((s) => s.id).reverse();
  if (forward.length && backIds.join() !== fwdIds.join()) {
    issues.order.push(`Shift+Tab does not retrace Tab (forward ${fwdIds.length} stops, back ${backIds.length})`);
  }
  // (b) indicator
  for (const s of forward) if (!s.indicator) issues.indicator.push(`"${s.label}" <${s.tag}>`);
  // (c) trap
  if (trapped) issues.trap.push(`focus did not leave the page or wrap in ${MAX_STOPS} Tab presses (or Tab stopped moving focus)`);
  // a pass that skips tabbable controls means focus went round a subset, or was cut off
  if (!trapped && forward.length < expected) {
    const seenIds = new Set(forward.map((f) => f.id));
    const labels = new Set(forward.map((f) => f.label));
    const missed = expectedList.filter((e) => !(e.id && seenIds.has(e.id)) && !labels.has(e.label)).map((e) => `"${e.label}" <${e.tag}> (${e.info})`);
    issues.trap.push(`Tab reached ${forward.length} of ${expected} focusable controls${missed.length ? `; not reached: ${missed.slice(0, 4).join(", ")}` : ""}`);
  }
  // (d) hidden
  for (const s of forward) if (s.hidden.length) issues.hidden.push(`"${s.label}" <${s.tag}>: ${s.hidden.join(",")}`);
  // (e) anything clickable that the keyboard cannot reach
  const unreachable = await page.evaluate(() => window.__tab.unreachable());
  for (const u of unreachable) issues.hidden.push(`clickable but not keyboard-focusable: ${u}`);
  // a positive tabindex reorders focus; none is allowed
  for (const s of forward) if (s.tabindex && Number(s.tabindex) > 0) issues.order.push(`positive tabindex on "${s.label}"`);

  const state = await page.evaluate(() => (document.querySelector("h1,[role=heading]")?.textContent || document.title || "").slice(0, 50)).catch(() => "");
  return result(name, state, forward, issues);
}

function result(name, state, forward, issues) {
  const r = {
    name, state, stops: forward.length,
    order: issues.order.length === 0, indicator: issues.indicator.length === 0,
    trap: issues.trap.length === 0, hidden: issues.hidden.length === 0, issues,
    sequence: forward.map((s) => s.label),
  };
  r.pass = r.order && r.indicator && r.trap && r.hidden;
  return r;
}

// A modal or sheet: focus goes in, stays in (Tab and Shift+Tab wrap), Escape
// closes it, and focus returns to the control that opened it.
async function auditModal(page, name, openLabel, openFn) {
  await installHelpers(page);
  const issues = { order: [], indicator: [], trap: [], hidden: [] };
  await openFn();
  await page.waitForTimeout(700);
  await installHelpers(page);
  const dialogs = await page.locator('[role="dialog"]:visible').count();
  if (!dialogs) {
    issues.trap.push("no dialog appeared");
    return result(name, "", [], issues);
  }
  const first = await page.evaluate(() => window.__tab.describe());
  if (first.gone || !first.inDialog) issues.trap.push(`focus did not move into the dialog (on "${first.label ?? "page"}")`);
  const seen = [];
  // enough presses to go round the dialog at least once, however many controls it has
  const tabbable = await page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    return dlg ? dlg.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length : 0;
  });
  const presses = Math.min(100, Math.max(24, tabbable + 4));
  for (let i = 0; i < presses; i++) {
    const d = await press(page, "Tab");
    if (d.gone || !d.inDialog) { issues.trap.push(`Tab ${i + 1} left the dialog`); break; }
    seen.push(d);
  }
  const ids = new Set(seen.map((s) => s.id));
  if (seen.length >= presses && ids.size === seen.length) issues.trap.push(`Tab never wrapped inside the dialog (${presses} presses, ${ids.size} distinct stops)`);
  const b = await press(page, "Shift+Tab");
  if (b.gone || !b.inDialog) issues.trap.push("Shift+Tab left the dialog");
  for (const s of seen) if (!s.indicator) issues.indicator.push(`"${s.label}" <${s.tag}>`);
  for (const s of seen) if (s.hidden.length) issues.hidden.push(`"${s.label}": ${s.hidden.join(",")}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  if (await page.locator('[role="dialog"]:visible').count()) issues.trap.push("Escape did not close the dialog");
  const back = await page.evaluate(() => window.__tab.describe());
  if (back.gone || !String(back.label).toLowerCase().includes(openLabel.toLowerCase())) {
    issues.trap.push(`focus did not return to "${openLabel}" (on "${back.label ?? "page"}")`);
  }
  return result(name, "dialog", seen, issues);
}

// ---- navigation helpers ----------------------------------------------------
async function login(page) {
  await page.goto(BASE + "/login");
  await settle(page);
  await page.getByLabel("Email").first().fill(EMAIL);
  await page.getByLabel("Password").first().fill(PASSWORD);
  // click rather than press Enter so the script also works on builds where Enter does not submit
  await page.getByRole("button", { name: /^Log in$/ }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }).catch(() => {});
  await settle(page, 2500);
  // the Terms prompt, the study notice and first run, in whatever order they come
  for (let g = 0; g < 6; g++) {
    await page.goto(BASE + "/");
    await settle(page, 3500);
    const url = page.url();
    if (url.includes("/agree")) {
      await page.getByRole("button").filter({ hasText: /agree|continue/i }).first().click();
    } else if (url.includes("/notice")) {
      const n = page.getByRole("button").filter({ hasText: /understand|next/i });
      if (await n.count()) await n.first().click();
      await page.waitForTimeout(600);
      await page.getByRole("button").filter({ hasText: /I agree/i }).first().click();
    } else if (url.includes("/welcome")) {
      const skip = page.getByRole("button", { name: /Skip for now/ });
      if (await skip.count()) await skip.click();
    } else break;
    await settle(page, 1500);
  }
  if (new URL(page.url()).pathname.startsWith("/login")) throw new Error("could not sign in; check E2E_EMAIL, E2E_PASSWORD and that the account's email is verified");
}

// Go to a path and make sure the app did not bounce us somewhere else (a login redirect would
// otherwise have the sign-in screen audited under another screen's name).
const go = async (page, p) => {
  await page.goto(BASE + p);
  await settle(page, 2500);
  const here = new URL(page.url()).pathname;
  const want = new URL(p, BASE).pathname;
  if (here.startsWith("/login") && !want.startsWith("/login") && !want.startsWith("/forgot") && !want.startsWith("/reset") && !want.startsWith("/register") && !want.startsWith("/verify")) {
    throw new Error(`redirected to /login when opening ${p}; not signed in`);
  }
};

// The lesson API, answered locally: the model is never called.
async function mockLesson(page) {
  await page.route("**/api/objectives/*/lesson", (route) => {
    if (route.request().method() !== "GET") return route.continue();
    return route.fulfill({ json: { lesson: {
      guessPrompt: "What do you think this means?",
      teach: "Teaching text for the keyboard test.",
      teachCards: { cards: [{ title: "One", body: "First card." }, { title: "Two", body: "Second card." }], selfExplain: "Say it in your own words." },
      fadeProblem: "Which option is right?",
      fadeChoices: ["Option A", "Option B", "Option C", "Option D"],
      soloCheck: "Explain it in your own words.",
    }, practicePending: false, learnerHistory: null, labPrompt: null } });
  });
  await page.route("**/api/objectives/*/guess-feedback", (r) => r.fulfill({ json: { feedback: "Close.", guessMatch: null } }));
  await page.route("**/api/objectives/*/hint", (r) => r.fulfill({ json: { choices: ["Hint A", "Hint B", "Hint C", "Hint D"] } }));
  await page.route("**/api/grade", (r) => r.fulfill({ json: {
    verdict: "partial", feedback: "Part of that is right.", classification: "partial", missedParts: ["detail"],
    correctIndex: 1, correctAnswer: "Option B", why: "Because.", optionReasons: ["a", "b", "c", "d"], attempt: { id: "00000000-0000-4000-8000-000000000001" },
  } }));
}

async function clickIf(page, role, name) {
  const el = page.getByRole(role, { name }).first();
  if (await el.count()) { await el.click().catch(() => {}); await page.waitForTimeout(700); return true; }
  return false;
}

// ---- the run ---------------------------------------------------------------
const results = [];
const want = (name) => !ONLY || ONLY.test(name);
const skipped = [];
async function run(name, fn) {
  if (!want(name)) return;
  try {
    const r = await fn();
    if (r === null) { skipped.push(name); console.log(`SKIP ${name}`); return; }
    results.push(r);
    const flags = ["order", "indicator", "trap", "hidden"].map((k) => `${k[0]}=${r[k] ? "ok" : "FAIL"}`).join(" ");
    console.log(`${r.pass ? "PASS" : "FAIL"} ${name} [${r.stops} stops${r.state ? `, "${r.state}"` : ""}] ${flags}`);
    for (const k of ["order", "indicator", "trap", "hidden"]) for (const i of r.issues[k].slice(0, 6)) console.log(`     ${k}: ${i}`);
  } catch (e) {
    results.push({ name, pass: false, error: String(e.message).slice(0, 200), issues: { order: [], indicator: [], trap: [], hidden: [] } });
    console.log(`ERROR ${name}: ${String(e.message).split("\n")[0]}`);
  }
}

// ---- self-test: the checks must fail on pages that are known to be wrong --------
async function selfTest(browser) {
  const ctx = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await ctx.newPage();
  const css = "button,a,input{display:block;margin:12px;padding:8px;font:16px sans-serif}";
  const cases = [
    ["clean page passes", `<style>${css}</style><h1>x</h1><button>One</button><a href="#a">Two</a><input aria-label="Three">`, null],
    ["visual order differs from DOM order", `<style>${css}.c{display:flex;flex-direction:column-reverse}</style><div class="c"><button>First in DOM</button><button>Second in DOM</button></div>`, "order"],
    ["positive tabindex", `<style>${css}</style><button tabindex="2">Two</button><button>One</button>`, "order"],
    ["no focus indicator", `<style>${css}button{outline:none;border:0;background:#eee}button:focus{outline:none;box-shadow:none}</style><button>Plain</button>`, "indicator"],
    ["focusable but off screen", `<style>${css}</style><button>Visible</button><button style="position:absolute;left:-9999px">Hidden off screen</button>`, "hidden"],
    ["focusable but transparent", `<style>${css}</style><button>Visible</button><button style="opacity:0">Invisible</button>`, "hidden"],
    ["clickable div the keyboard cannot reach", `<style>${css}</style><button>Real</button><div style="cursor:pointer;padding:8px" onclick="1">Fake button</div>`, "hidden"],
    ["Tab is trapped on a control", `<style>${css}</style><button id="a">A</button><button id="b" onkeydown="if(event.key==='Tab'){event.preventDefault()}">B</button><button>C</button>`, "trap"],
    ["Tab cycles a subset of the controls", `<style>${css}</style><button id="a">A</button><button id="b" onkeydown="if(event.key==='Tab'&&!event.shiftKey){event.preventDefault();document.getElementById('a').focus()}">B</button><button>C</button>`, "trap"],
  ];
  let bad = 0;
  for (const [name, html, expectFlag] of cases) {
    await page.setContent(html);
    const r = await audit(page, name);
    const flagged = ["order", "indicator", "trap", "hidden"].filter((k) => !r[k]);
    const ok = expectFlag === null ? r.pass : flagged.includes(expectFlag);
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "BAD "} self-test: ${name} (flagged: ${flagged.join(",") || "nothing"})`);
    if (process.env.E2E_VERBOSE) for (const k of flagged) for (const i of r.issues[k]) console.log(`       ${k}: ${i}`);
  }
  // a dialog that does not take focus, does not trap it, and does not close on Escape
  await page.setContent(`<style>${css}</style><button id="o">Open</button><button>Behind</button><div id="d" role="dialog" hidden><button>Inside</button></div>`);
  const m = await auditModal(page, "leaky dialog", "Open", () => page.evaluate(() => { document.getElementById("d").hidden = false; }));
  const mFlagged = !m.trap;
  if (!mFlagged) bad++;
  console.log(`${mFlagged ? "ok  " : "BAD "} self-test: dialog that does not trap focus (flagged: ${mFlagged ? "trap" : "nothing"})`);
  await browser.close();
  console.log(bad ? `\n${bad} self-test case(s) did not behave` : "\nself-test passes: every known defect was caught");
  process.exit(bad ? 1 : 0);
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
if (SELFTEST) await selfTest(browser);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

// -- signed out
await run("sign-in", async () => { await go(page, "/login"); return audit(page, "sign-in"); });
await run("sign-up", async () => { await go(page, "/register"); return audit(page, "sign-up"); });
await run("forgot-password", async () => { await go(page, "/forgot-password"); return audit(page, "forgot-password"); });
await run("reset-password", async () => { await go(page, "/reset-password?token=keyboard-test"); return audit(page, "reset-password"); });
await run("verify-email (link page)", async () => { await go(page, "/verify-email?token=keyboard-test"); return audit(page, "verify-email (link page)"); });
for (const [kind, methods] of [["authenticator app", { totp: true, email: false }], ["email code", { totp: false, email: true }], ["both methods", { totp: true, email: true }]]) {
  await run(`mfa: ${kind}`, async () => {
    await page.route("**/api/auth/login", (r) => r.fulfill({ json: { mfaRequired: true, challengeToken: "keyboard-test", mfaMethods: methods } }));
    await page.route("**/api/auth/mfa/challenge/send-email-code", (r) => r.fulfill({ json: { ok: true } }));
    await go(page, "/login");
    await page.getByLabel("Email").first().fill("someone@example.test");
    await page.getByLabel("Password").first().fill("not-a-real-password");
    await page.getByRole("button", { name: /^Log in$/ }).first().click();
    await page.waitForURL(/mfa-challenge/, { timeout: 20000 });
    await settle(page, 800);
    const r = await audit(page, `mfa: ${kind}`);
    await page.unroute("**/api/auth/login");
    return r;
  });
}
await run("verify-email-pending (with resend)", async () => {
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p2 = await c2.newPage();
  await p2.goto(BASE + "/register");
  await settle(p2);
  const stamp = Date.now();
  await p2.getByLabel("Email").first().fill(`keyboard${stamp}@example.test`);
  await p2.getByLabel("Password", { exact: true }).fill("Keyboard-test-1234");
  await p2.getByLabel("Confirm password").fill("Keyboard-test-1234");
  await p2.getByRole("checkbox").click();
  await p2.getByRole("button", { name: /^Create account$/ }).first().click();
  await p2.waitForURL(/verify-email-pending/, { timeout: 60000 });
  await settle(p2, 800);
  const r = await audit(p2, "verify-email-pending (with resend)");
  await c2.close();
  return r;
});

// -- signed in
await login(page);
await run("account", async () => { await go(page, "/account"); return audit(page, "account"); });
await run("account: confirm sheet (sign out of all devices)", async () => {
  await go(page, "/account");
  return auditModal(page, "account: confirm sheet (sign out of all devices)", "Sign out of all devices", () => page.getByRole("button", { name: /Sign out of all devices/ }).click());
});
await run("change-password", async () => { await go(page, "/account/change-password"); return audit(page, "change-password"); });
await run("settings", async () => { await go(page, "/settings"); return audit(page, "settings"); });
await run("settings: lock choice sheet", async () => {
  await go(page, "/settings");
  return auditModal(page, "settings: lock choice sheet", "Lock Ascendra", () => page.getByRole("button", { name: /Lock Ascendra/ }).click());
});
await run("settings: reminders", async () => { await go(page, "/settings/reminders"); return audit(page, "settings: reminders"); });

await mockLesson(page);
const lessonUrl = `/course/${TRACK}/lesson/${OBJECTIVE}?unitId=${UNIT}`;
await run("lesson: guess", async () => { await go(page, lessonUrl); return audit(page, "lesson: guess"); });
await run("lesson: guess typed", async () => {
  await go(page, lessonUrl);
  await page.getByLabel("Your guess").fill("my guess");
  return audit(page, "lesson: guess typed");
});
await run("lesson: teach", async () => {
  await go(page, lessonUrl);
  await page.getByLabel("Your guess").fill("my guess");
  await clickIf(page, "button", /Submit my guess/);
  await page.waitForTimeout(800);
  return audit(page, "lesson: teach");
});
await run("lesson: multiple choice", async () => {
  await go(page, lessonUrl);
  await clickIf(page, "button", /skip|don't know|not sure/i);
  await page.getByLabel("Your guess").fill("my guess").catch(() => {});
  await clickIf(page, "button", /Submit my guess/);
  for (let i = 0; i < 6; i++) { if (await page.getByText("Which option is right?").count()) break; if (!(await clickIf(page, "button", /^(Next|Continue|Got it|Practice|Start practice|Next card|I'm ready)/i))) break; }
  return audit(page, "lesson: multiple choice");
});
await run("lesson: multiple choice answered + dispute", async () => {
  const opt = page.getByText("Option B", { exact: true }).first();
  if (!(await opt.count())) throw new Error("the multiple-choice options are not on screen");
  await opt.click();
  await clickIf(page, "button", /^Submit$/);
  await page.waitForTimeout(1200);
  if (!(await page.getByLabel("Dispute or ask about this verdict").count())) throw new Error("the graded state (with the dispute box) was not reached");
  return audit(page, "lesson: multiple choice answered + dispute");
});
await run("lesson: typed answer", async () => {
  await go(page, lessonUrl);
  for (let i = 0; i < 12; i++) {
    if (await page.getByLabel(/answer/i).count() && await page.getByText("Explain it in your own words.").count()) break;
    if (!(await clickIf(page, "button", /skip|^(Next|Continue|Got it|Practice|Start practice|Next card|I'm ready|Move on)/i))) { const g = page.getByLabel("Your guess"); if (await g.count()) await g.fill("g"); await clickIf(page, "button", /Submit my guess/); }
  }
  return audit(page, "lesson: typed answer");
});

await run("exam session", async () => { await go(page, `/course/${TRACK}/exam`); return audit(page, "exam session"); });
await run("PBQ", async () => { await go(page, `/course/${TRACK}/pbq`); return audit(page, "PBQ"); });
// Open the first item of a list screen (when no id was given) and return true if it navigated to urlRe.
async function openFirstItem(listUrl, urlRe) {
  await go(page, listUrl);
  const items = page.locator('[role="main"] [role="button"][aria-label]');
  const n = Math.min(await items.count(), 8);
  for (let i = 0; i < n; i++) {
    await items.nth(i).click().catch(() => {});
    await page.waitForTimeout(1500);
    if (urlRe.test(page.url())) return true;
    await go(page, listUrl);
  }
  return false;
}

await run("labs list", async () => { await go(page, `/course/${TRACK}/labs`); return audit(page, "labs list"); });
await run("lab steps", async () => {
  if (LAB) await go(page, `/course/${TRACK}/lab/${LAB}`);
  else if (!(await openFirstItem(`/course/${TRACK}/labs`, /\/lab\/[^/]+/))) { console.log("     note: no lab could be opened from the list; lab steps not audited"); return null; }
  await settle(page, 1500);
  return audit(page, "lab steps");
});
// The unit check needs a unit the learner has finished, so its API is answered locally too.
let unitCheckResult = false;
await page.route("**/api/units/*/check", (route) => {
  const status = { unitId: UNIT, unitTitle: "Keyboard test unit", trackId: TRACK, gate: "Describe the scenario", total: 3, studied: 3, eligible: true, passed: false };
  if (route.request().method() === "GET") {
    return route.fulfill({ json: { status, check: { id: "00000000-0000-4000-8000-0000000000c1", title: "Scenario", scenario: "A short scenario for the keyboard test.", sub_parts: ["First part", "Second part"] } } });
  }
  unitCheckResult = true;
  return route.fulfill({ json: { verdict: "partial", feedback: "Part of that is right.", classification: "partial", missedParts: ["Second part"], partScores: [{ score: "met", comment: "" }, { score: "missed", comment: "" }] } });
});
await run("unit check", async () => { await go(page, `/unit-check?unitId=${UNIT}`); return audit(page, "unit check"); });
await run("unit check: graded", async () => {
  await go(page, `/unit-check?unitId=${UNIT}`);
  await page.getByLabel(/answer/i).first().fill("my answer");
  await clickIf(page, "button", /Submit|Check/i);
  await page.waitForTimeout(900);
  return audit(page, "unit check: graded");
});
await run("review session", async () => { await go(page, "/review-session"); return audit(page, "review session"); });
await run("chat", async () => { await go(page, `/course/${TRACK}/chat`); return audit(page, "chat"); });
await run("sims list", async () => { await go(page, `/course/${TRACK}/sims`); return audit(page, "sims list"); });
await run("sim", async () => {
  if (SIM) await go(page, `/course/${TRACK}/sim/${SIM}`);
  else if (!(await openFirstItem(`/course/${TRACK}/sims`, /\/sim\/[^/]+/))) { console.log("     note: no sim could be opened from the list; sim not audited"); return null; }
  await settle(page, 1500);
  return audit(page, "sim");
});
await run("course: menu sheet", async () => {
  await go(page, `/course/${TRACK}`);
  return auditModal(page, "course: menu sheet", "Open course menu", () => page.getByRole("button", { name: "Open course menu" }).click());
});

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} screens pass${skipped.length ? ` (${skipped.length} not reached: ${skipped.join(", ")})` : ""}`);
if (process.env.E2E_JSON_OUT) writeFileSync(process.env.E2E_JSON_OUT, JSON.stringify(results, null, 1));
process.exit(failed.length ? 1 : 0);
