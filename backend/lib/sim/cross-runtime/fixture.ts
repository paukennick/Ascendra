// REQ-141: loads fixture.js the way every other engine does (as a plain
// script, fresh globals) so Node's run is the same program Hermes and the
// browsers run. See fixture.js.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

export const FIXTURE_PATH = join(__dirname, "fixture.js");
export const EXPECTED_PATH = join(__dirname, "fixture.expected.txt");

export function fixtureSource(): string {
  return readFileSync(FIXTURE_PATH, "utf8");
}

type Fixture = { simCrossRuntimeFixture: () => string; simCrossRuntimeNative: () => string };

function load(): Fixture {
  const sandbox = {} as Fixture;
  runInNewContext(fixtureSource(), sandbox, { filename: FIXTURE_PATH });
  return sandbox;
}

// Every runner prints the result followed by one newline; the expected file
// holds exactly that, so outputs compare with `cmp`.
export function runFixtureInNode(): string {
  return `${load().simCrossRuntimeFixture()}\n`;
}

export function runNativeInNode(): string {
  return `${load().simCrossRuntimeNative()}\n`;
}

// What Hermes runs: the same script plus a `print` (Hermes' console).
export function hermesScript(which: "fixture" | "native"): string {
  const fn = which === "fixture" ? "simCrossRuntimeFixture" : "simCrossRuntimeNative";
  return `${fixtureSource()}\nprint(${fn}());\n`;
}
