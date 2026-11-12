// REQ-230: the `npm run sims:generate` arguments (scripts/sims-generate.ts).
import { SCREEN_TYPES, type GenScreen } from "./prompt.ts";

export interface GenArgs {
  mode: "select" | "estimate" | "run" | "costSummary";
  course: string | null;
  objective: string | null;
  screen: GenScreen | null;
  idea: string | null;
  maxUsd: number;
  model: string | null;
  checkModel: string | null;
  out: string | null;
  searchNodes: number;
  allowUnselected: boolean;
}

export const USAGE = `npm run sims:generate -- --select --course <CODE>
npm run sims:generate -- --course <CODE> --objective "<exact title>" --screen bedside|board|session [--idea "<seed idea>"]   (estimate only)
npm run sims:generate -- --course <CODE> --objective "<exact title>" --screen <type> --run [--max-usd 3] [--model <id>] [--allow-unselected]
npm run sims:generate -- --cost-summary
Options: --out <dir> (default backend/sim-drafts), --search-nodes <n> (default 4000), --check-model <id> (default: the writer's model)`;

export function parseGenArgs(argv: string[]): GenArgs {
  const a: GenArgs = { mode: "estimate", course: null, objective: null, screen: null, idea: null, maxUsd: 3, model: null, checkModel: null, out: null, searchNodes: 4000, allowUnselected: false };
  const value = (i: number, flag: string): string => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new Error(`${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    switch (f) {
      case "--select":
        a.mode = "select";
        break;
      case "--run":
        a.mode = "run";
        break;
      case "--cost-summary":
        a.mode = "costSummary";
        break;
      case "--allow-unselected":
        a.allowUnselected = true;
        break;
      case "--course":
        a.course = value(i++, f).toUpperCase();
        break;
      case "--objective":
        a.objective = value(i++, f);
        break;
      case "--screen": {
        const s = value(i++, f);
        if (!(SCREEN_TYPES as readonly string[]).includes(s)) throw new Error(`--screen must be one of ${SCREEN_TYPES.join(", ")}`);
        a.screen = s as GenScreen;
        break;
      }
      case "--idea":
        a.idea = value(i++, f);
        break;
      case "--max-usd": {
        const n = Number(value(i++, f));
        if (!(n > 0) || n > 50) throw new Error("--max-usd must be a number of dollars above 0 and at most 50");
        a.maxUsd = n;
        break;
      }
      case "--model":
        a.model = value(i++, f);
        break;
      case "--check-model":
        a.checkModel = value(i++, f);
        break;
      case "--out":
        a.out = value(i++, f);
        break;
      case "--search-nodes": {
        const n = Number(value(i++, f));
        if (!Number.isInteger(n) || n < 100 || n > 50_000) throw new Error("--search-nodes must be a whole number from 100 to 50000");
        a.searchNodes = n;
        break;
      }
      default:
        throw new Error(`unknown argument ${f}\n${USAGE}`);
    }
  }
  if (a.mode === "select" && !a.course) throw new Error("--select needs --course");
  if ((a.mode === "estimate" || a.mode === "run") && (!a.course || !a.objective || !a.screen)) throw new Error(`--course, --objective and --screen are required\n${USAGE}`);
  return a;
}
