// REQ-141 (docs/sims.md 16, 17 step 2; findings in docs/sims-hermes-spike.md):
// runs lib/sim/cross-runtime/fixture.js on other JS engines and compares
// their output byte for byte with Node's (fixture.expected.txt).
//
//   npm run sim:cross-runtime -- print            Node's output
//   npm run sim:cross-runtime -- print-native     Node's native Math output (informational)
//   npm run sim:cross-runtime -- write-expected   refresh fixture.expected.txt from Node
//   npm run sim:cross-runtime -- hermes-script <fixture|native> <out.js>
//   npm run sim:cross-runtime -- browsers         Chromium, Firefox, WebKit via Playwright
//   npm run sim:cross-runtime -- engine-print     Node's run of the engine bundle (corpus + golden replays)
//   npm run sim:cross-runtime -- engine-hermes-script <out.js>
//
// REQ-162: the engine bundle (lib/sim/cross-runtime/engine-bundle.ts) is
// engine major 1 transpiled to one plain script with the v1 corpus and every
// seeded document's golden paths. Node's output is computed in the same run,
// never committed, so a corpus or golden change cannot leave a stale file;
// the Node test (engine-bundle.test.ts) holds that output to the manifest.
//
// `browsers` imports Playwright from PLAYWRIGHT_MODULE (a path to its
// package directory) so neither package.json has to depend on it; CI installs
// a pinned version into a temp folder.
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  EXPECTED_PATH,
  fixtureSource,
  hermesScript,
  runFixtureInNode,
  runNativeInNode,
} from "../lib/sim/cross-runtime/fixture.ts";
import { engineBundleSource, engineHermesScript, runEngineBundleInNode } from "../lib/sim/cross-runtime/engine-bundle.ts";

function firstDifference(a: string, b: string): string {
  const al = a.split("\n");
  const bl = b.split("\n");
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) return `line ${i + 1}:\n  expected ${JSON.stringify(bl[i])}\n  got      ${JSON.stringify(al[i])}`;
  }
  return "(no line differs; check trailing bytes)";
}

async function browsers(): Promise<number> {
  const modulePath = process.env.PLAYWRIGHT_MODULE;
  if (!modulePath) throw new Error("set PLAYWRIGHT_MODULE to an installed playwright package directory");
  const pw = await import(pathToFileURL(`${modulePath.replace(/\/$/, "")}/index.mjs`).href);
  const expected = readFileSync(EXPECTED_PATH, "utf8");
  const nodeNative = runNativeInNode();
  const source = fixtureSource();
  const engineSource = engineBundleSource();
  const engineExpected = runEngineBundleInNode(engineSource);
  let failed = 0;
  for (const name of ["chromium", "firefox", "webkit"] as const) {
    const browser = await pw[name].launch();
    try {
      const page = await browser.newPage();
      await page.setContent("<!doctype html><title>sim cross-runtime</title>");
      await page.addScriptTag({ content: source });
      const got = `${await page.evaluate("simCrossRuntimeFixture()")}\n`;
      const native = `${await page.evaluate("simCrossRuntimeNative()")}\n`;
      const nativeDiffs = native.split("\n").filter((l, i) => l !== nodeNative.split("\n")[i]).length;
      const label = `${name} ${browser.version()}`;
      if (got === expected) console.log(`PASS ${label}: fixture byte-identical to Node (native Math lines differing from V8/Node: ${nativeDiffs})`);
      else {
        failed++;
        console.log(`FAIL ${label}: fixture differs from Node at ${firstDifference(got, expected)}`);
      }
      const enginePage = await browser.newPage();
      await enginePage.setContent("<!doctype html><title>sim engine cross-runtime</title>");
      await enginePage.addScriptTag({ content: engineSource });
      const engineGot = `${await enginePage.evaluate("simCrossRuntimeEngine()")}\n`;
      if (engineGot === engineExpected) console.log(`PASS ${label}: engine corpus and golden replays byte-identical to Node (${engineExpected.trim().split("\n").pop()})`);
      else {
        failed++;
        console.log(`FAIL ${label}: engine bundle differs from Node at ${firstDifference(engineGot, engineExpected)}`);
      }
    } finally {
      await browser.close();
    }
  }
  return failed ? 1 : 0;
}

async function main(): Promise<number> {
  const [cmd, ...args] = process.argv.slice(2);
  switch (cmd) {
    case "print":
      process.stdout.write(runFixtureInNode());
      return 0;
    case "print-native":
      process.stdout.write(runNativeInNode());
      return 0;
    case "write-expected":
      writeFileSync(EXPECTED_PATH, runFixtureInNode());
      console.log(`wrote ${EXPECTED_PATH}`);
      return 0;
    case "hermes-script": {
      const [which, out] = args;
      if ((which !== "fixture" && which !== "native") || !out) throw new Error("usage: hermes-script <fixture|native> <out.js>");
      writeFileSync(out, hermesScript(which));
      return 0;
    }
    case "browsers":
      return browsers();
    case "engine-print":
      process.stdout.write(runEngineBundleInNode());
      return 0;
    case "engine-hermes-script": {
      const [out] = args;
      if (!out) throw new Error("usage: engine-hermes-script <out.js>");
      writeFileSync(out, engineHermesScript());
      return 0;
    }
    default:
      console.error("usage: sim:cross-runtime -- print | print-native | write-expected | hermes-script <fixture|native> <out.js> | browsers | engine-print | engine-hermes-script <out.js>");
      return 2;
  }
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
