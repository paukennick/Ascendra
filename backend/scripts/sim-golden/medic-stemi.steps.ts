// REQ-241 (bedside wave 2, EMS): golden paths for
// NREMTPARAMEDIC/inferior-stemi-cath-alert. No prototype exists, so the
// expectations are the engine's own results, re-checked by every `npm test`.
//
//   npm run sim:golden -- steps medic-stemi
import type { Ctl, StepsSpec } from "./steps.ts";
import { pace, teach } from "./s2b-helpers.ts";
import { act, at, toEnd, v, when } from "./ems-helpers.ts";

export const ENTRY = { course: "NREMTPARAMEDIC", slug: "inferior-stemi-cath-alert" };

function ecg(c: Ctl): void {
  act(c, "ecg");
  teach(c);
  when(c, (x) => v(x, "ecgAt") !== null);
}
function iv(c: Ctl): void {
  act(c, "iv");
  teach(c);
  when(c, (x) => v(x, "ivOn") === true);
}
function vitals(c: Ctl): void {
  act(c, "vitals");
  teach(c);
  when(c, (x) => v(x, "vPending") === false);
}
function go(c: Ctl, where: string): void {
  act(c, "transport", { where });
  teach(c);
}

export function spec(): StepsSpec {
  return {
    slug: ENTRY.slug,
    paths: [
      {
        id: "expert",
        title: "Expert at study pace: 12-lead in a minute, field activation, aspirin, asks about PDE inhibitors and withholds nitrates, V4R, pads, IV, fentanyl, PCI center",
        reasoning: "met",
        drive: (c) => {
          pace(c, 3);
          act(c, "monitor");
          ecg(c);
          act(c, "callStemi");
          act(c, "aspirin");
          act(c, "askPde");
          act(c, "history");
          act(c, "rightLeads");
          act(c, "pads");
          iv(c);
          vitals(c);
          act(c, "fentanyl");
          at(c, 360);
          go(c, "pci");
          at(c, c.run.state.tick + 300);
          act(c, "fentanyl");
          vitals(c);
          toEnd(c);
        },
      },
      {
        id: "nitroRescued",
        title: "Nitroglycerin without asking about PDE inhibitors; the pressure crashes and saline boluses pull him back",
        reasoning: "partial",
        drive: (c) => {
          act(c, "monitor");
          ecg(c);
          act(c, "callStemi");
          act(c, "aspirin");
          act(c, "pads");
          iv(c);
          act(c, "nitro");
          act(c, "bolus");
          act(c, "bolus");
          vitals(c);
          act(c, "history");
          at(c, 480);
          go(c, "pci");
          toEnd(c);
        },
      },
      {
        id: "lateEcg",
        title: "History and oxygen first; the 12-lead at 12 minutes; no analgesia",
        reasoning: "partial",
        drive: (c) => {
          act(c, "history");
          act(c, "askPde");
          act(c, "monitor");
          act(c, "oxygen");
          vitals(c);
          act(c, "aspirin");
          at(c, 720);
          ecg(c);
          act(c, "callStemi");
          act(c, "pads");
          go(c, "pci");
          iv(c);
          toEnd(c);
        },
      },
      {
        id: "nonPci",
        title: "Everything right at the bedside, then the nearer hospital without PCI",
        reasoning: "partial",
        drive: (c) => {
          act(c, "monitor");
          ecg(c);
          act(c, "aspirin");
          act(c, "askPde");
          act(c, "pads");
          iv(c);
          act(c, "fentanyl");
          at(c, 360);
          go(c, "near");
          toEnd(c);
        },
      },
      {
        id: "noActivation",
        title: "A quick 12-lead read as 'probably inferior', but no transmission or activation; to the PCI center cold",
        reasoning: "partial",
        drive: (c) => {
          act(c, "monitor");
          ecg(c);
          act(c, "aspirin");
          act(c, "pads");
          iv(c);
          act(c, "fentanyl");
          at(c, 420);
          go(c, "pci");
          toEnd(c);
        },
      },
      {
        id: "nitroCrash",
        title: "Failure: nitroglycerin for chest pain before any 12-lead, aspirin, PDE question or IV; profound hypotension and VF",
        reasoning: "missed",
        drive: (c) => {
          act(c, "history");
          act(c, "monitor");
          act(c, "nitro");
          vitals(c);
          toEnd(c);
        },
      },
    ],
  };
}
