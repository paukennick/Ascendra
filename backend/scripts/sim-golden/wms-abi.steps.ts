// REQ-323 (health breadth): golden paths for
// ABPTSWMS/leg-ulcer-calcified-abi-compression. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps wms-abi
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach, until } from "./s2b-helpers.ts";

export const ENTRY = { course: "ABPTSWMS", slug: "leg-ulcer-calcified-abi-compression" };

const ended = (c: Ctl): boolean => c.run.state.ended !== null;
const upTo = (c: Ctl, tick: number): void => until(c, (x) => x.run.state.tick >= tick || ended(x));
const toEnd = (c: Ctl): void => until(c, (x) => ended(x), 20000);
function act(c: Ctl, a: string, p?: Record<string, string>): void {
  if (ended(c)) return;
  c.act(a, p);
  c.answer();
  teach(c);
}
function test(c: Ctl, a: string): void {
  act(c, a);
  until(c, (x) => x.value("testPending") === false || ended(x));
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: history, ulcer, ABI (falsely high), pedal Doppler and toe pressure; no compression; dressed; vascular surgery today; physician told",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          upTo(c, 1);
          test(c, "hx");
          test(c, "wound");
          test(c, "abi");
          test(c, "doppler");
          test(c, "toe");
          act(c, "dress");
          act(c, "diagnose", { dx: "arterial" });
          act(c, "refer", { how: "vasc" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "lightWrap",
        title: "Toe pressure but no waveforms, light compression 'while waiting', then an urgent vascular call",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "abi");
          test(c, "toe");
          act(c, "light");
          act(c, "diagnose", { dx: "arterial" });
          act(c, "refer", { how: "vasc" });
          toEnd(c);
        },
      },
      {
        id: "routineLetter",
        title: "A full vascular check and no compression, but a routine letter and a four-week review",
        reasoning: "partial",
        drive: (c) => {
          test(c, "hx");
          test(c, "abi");
          test(c, "doppler");
          test(c, "toe");
          act(c, "dress");
          act(c, "diagnose", { dx: "arterial" });
          act(c, "refer", { how: "letter" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "wrappedThenRemoved",
        title: "Trusts the ABI and wraps, takes the wrap off when the toes go pale, then measures and calls vascular surgery late",
        reasoning: "partial",
        drive: (c) => {
          test(c, "abi");
          act(c, "high");
          until(c, (x) => (x.value("isch") as number) >= 0.35 || ended(x));
          act(c, "remove");
          test(c, "doppler");
          test(c, "toe");
          test(c, "hx");
          upTo(c, 300);
          act(c, "diagnose", { dx: "arterial" });
          act(c, "refer", { how: "vasc" });
          act(c, "tell");
          toEnd(c);
        },
      },
      {
        id: "asReferred",
        title: "Failure: a normal-looking ABI, a venous impression and compression as referred",
        reasoning: "missed",
        drive: (c) => {
          test(c, "abi");
          act(c, "diagnose", { dx: "venous" });
          act(c, "refer", { how: "compress" });
          toEnd(c);
        },
      },
    ],
  };
}
