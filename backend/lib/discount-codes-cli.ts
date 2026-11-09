// REQ-166: `npm run discounts:codes` -- the App Store offer-code pool and a
// settings check for verified discounts. Uses DATABASE_URL.
//
//   --status                                   codes free / issued per group and product
//   --config                                   which discount settings are set (never values)
//   --import <file> --group <g> --product <id> --expires YYYY-MM-DD [--dry-run]
//       <file> is Apple's downloaded one-time-code CSV, or one code per line.
//       --product is the App Store product the offer belongs to
//       (ascendra.plus.monthly ... ascendra.pro.yearly), --expires the
//       codes' expiry date from App Store Connect.

import { readFileSync } from "node:fs";
import { isDiscountGroup, type DiscountGroup } from "./verified-discounts-config";
import { plans } from "./billing-config";
import { codePoolStatus, discountOperatorConfig, importCodes, parseCodeFile } from "./verified-discounts";

export type CodesArgs =
  | { kind: "status" }
  | { kind: "config" }
  | { kind: "import"; file: string; group: DiscountGroup; productId: string; expiresAt: Date; dryRun: boolean };

export function parseCodesArgs(argv: string[], now = new Date()): CodesArgs | string {
  const get = (k: string) => {
    const i = argv.indexOf(k);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  if (argv.includes("--status")) return { kind: "status" };
  if (argv.includes("--config")) return { kind: "config" };
  const file = get("--import");
  if (!file) return "Pass --status, --config, or --import <file> --group <group> --product <product id> --expires YYYY-MM-DD.";
  const group = get("--group");
  if (!isDiscountGroup(group)) return "--group must be one of military, responder, nurse, student, teacher.";
  const productId = get("--product") ?? "";
  if (!plans({}).some((p) => p.appStoreProductId === productId)) return "--product must be an App Store product id such as ascendra.pro.yearly.";
  const exp = get("--expires") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exp)) return "--expires must be YYYY-MM-DD.";
  // Apple's codes stop at 12:00 a.m. Pacific on the expiry date; store the
  // start of that day UTC-8 so we never hand out a code past it.
  const expiresAt = new Date(`${exp}T08:00:00Z`);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= now) return "--expires must be a future date.";
  return { kind: "import", file, group, productId, expiresAt, dryRun: argv.includes("--dry-run") };
}

export async function runCodesCli(args: CodesArgs): Promise<string[]> {
  if (args.kind === "config") return [JSON.stringify(discountOperatorConfig(), null, 2)];
  if (args.kind === "status") {
    const rows = await codePoolStatus();
    if (!rows.length) return ["No offer codes in the pool."];
    return rows.map((r) => `${r.group_id} ${r.product_id}: ${r.free} free, ${r.issued} issued${r.next_expiry ? `, next expiry ${r.next_expiry.toISOString().slice(0, 10)}` : ""}`);
  }
  const codes = parseCodeFile(readFileSync(args.file, "utf8"));
  if (args.dryRun) return [`Would add up to ${codes.length} codes for ${args.group} / ${args.productId}, expiring ${args.expiresAt.toISOString()}. Nothing written.`];
  const r = await importCodes({ group: args.group, productId: args.productId, expiresAt: args.expiresAt, codes });
  return [`Added ${r.added} codes for ${args.group} / ${args.productId}${r.skipped ? ` (${r.skipped} already in the pool)` : ""}.`];
}
