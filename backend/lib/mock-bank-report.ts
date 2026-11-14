import { formReadiness, PREGEN_COST_PER_ITEM_USD, preGenCostUsd, type UnitBank } from "@/lib/mock-form";

// REQ-298: for each course, how many more bank items a full-length mock needs
// and what pre-generating them would cost at PREGEN_COST_PER_ITEM_USD. REPORT
// ONLY: nothing here (or in scripts/mock-bank-report.ts) calls a model or
// writes a row. Pure; mock-bank-report.test.ts.

export interface CourseBankInput {
  code: string;
  title: string;
  requested: number; // the full form's length
  confirmed: boolean; // the length comes from lib/mock-exam-facts.ts
  units: UnitBank[];
}

export interface CourseBankRow {
  code: string;
  title: string;
  requested: number;
  confirmed: boolean;
  have: number; // bank items that count toward a full form (capped per domain at its share)
  missing: number;
  costUsd: number;
}

export function courseBankRow(c: CourseBankInput): CourseBankRow {
  const r = formReadiness(c.units, c.requested);
  return {
    code: c.code,
    title: c.title,
    requested: c.requested,
    confirmed: c.confirmed,
    have: r.canBuild,
    missing: r.missing,
    costUsd: preGenCostUsd(r.missing),
  };
}

export function formatBankReport(rows: CourseBankRow[], mode: "live" | "static"): string {
  const pad = (s: string, n: number) => (s.length >= n ? s : s + " ".repeat(n - s.length));
  const num = (n: number, w: number) => String(n).padStart(w);
  const lines = [
    mode === "static"
      ? "Mock bank report (STATIC: the bank is assumed empty, so every full form needs every question)"
      : "Mock bank report (LIVE: servable exam items in the database, distinct by stem)",
    "",
    `${pad("course", 14)} ${"len".padStart(5)} ${"src".padStart(4)} ${"have".padStart(5)} ${"missing".padStart(8)} ${"cost".padStart(8)}`,
  ];
  for (const r of rows) {
    lines.push(
      `${pad(r.code, 14)} ${num(r.requested, 5)} ${(r.confirmed ? "read" : "seed").padStart(4)} ${num(r.have, 5)} ${num(r.missing, 8)} ${("$" + r.costUsd.toFixed(2)).padStart(8)}`
    );
  }
  const sum = (rs: CourseBankRow[]) => ({ missing: rs.reduce((s, r) => s + r.missing, 0), cost: rs.reduce((s, r) => s + r.costUsd, 0) });
  const all = sum(rows);
  const read = sum(rows.filter((r) => r.confirmed));
  lines.push(
    "",
    `Courses whose length was read from the exam's own site: ${rows.filter((r) => r.confirmed).length}; ${read.missing} items, about $${read.cost.toFixed(2)}.`,
    `All ${rows.length} courses: ${all.missing} items, about $${all.cost.toFixed(2)}, at ${(PREGEN_COST_PER_ITEM_USD * 100).toFixed(1)} cents an item (a REPORT; nothing was generated).`,
    "One form's worth of items per course; a second mock with no question in common with the first needs about double."
  );
  lines.push('"src" read = the length is from lib/mock-exam-facts.ts (read at the certifying body); seed = parsed from the seeded text, approximate.');
  return lines.join("\n");
}
