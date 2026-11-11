import { queryOne } from "@/lib/db";

// REQ-196: the re-check and sandbox jobs run with least privilege. Before a
// job reads or writes anything it checks the role it connected as, and
// refuses to run as one that could change what learners are served:
// a superuser, a role that bypasses RLS, one that can write item_status
// (pull / clear / void), attempts or the served content tables, one that can
// read the account tables (app_users, refresh_tokens, auth_events: password
// hashes, session tokens, who signed in from where) or one that can create
// roles (REQ-207, FAIL-953: a CREATEROLE role can mint itself any access the
// grants above withhold). The intended
// role is a LOGIN member of content_recheck (migration 064):
// SELECT on content, INSERT on item_holdbacks and exec_check_runs only.
//
// RECHECK_ALLOW_PRIVILEGED=local lets a developer run the job against a
// LOCAL database as its owner (tests, a laptop). It is ignored unless the
// connection is to localhost or a Unix socket.

export interface RolePrivileges {
  role: string;
  superuser: boolean;
  bypassRls: boolean;
  writable: string[]; // tables it could change that it must not
  readable: string[]; // tables it could read that it must not (REQ-207)
  createRole: boolean; // may create roles (REQ-207)
  canStage: boolean;
}

const MUST_NOT_WRITE = ["item_status", "attempts", "lesson_content", "lesson_content_overrides", "review_items", "exam_items", "coach_quiz_items", "mastery"];

// Account tables the jobs never read.
const MUST_NOT_READ = ["app_users", "refresh_tokens", "auth_events"];

export async function currentRolePrivileges(): Promise<RolePrivileges> {
  const checks = MUST_NOT_WRITE.map(
    (t, i) =>
      `coalesce(to_regclass('public.${t}') is not null and (has_table_privilege('public.${t}', 'INSERT') or has_table_privilege('public.${t}', 'UPDATE') or has_table_privilege('public.${t}', 'DELETE')), false) as w${i}`
  ).join(", ");
  // SELECT on the table, or on any one column of it.
  const reads = MUST_NOT_READ.map(
    (t, i) =>
      `coalesce(to_regclass('public.${t}') is not null and (has_table_privilege('public.${t}', 'SELECT') or has_any_column_privilege('public.${t}', 'SELECT')), false) as r${i}`
  ).join(", ");
  const r = await queryOne<Record<string, unknown>>(
    `select current_user as role, r.rolsuper as superuser, r.rolbypassrls as bypass, r.rolcreaterole as create_role,
            has_table_privilege('public.item_holdbacks', 'INSERT') as can_stage, ${checks}, ${reads}
       from pg_roles r where r.rolname = current_user`
  );
  if (!r) throw new Error("could not read the current role");
  return {
    role: String(r.role),
    superuser: !!r.superuser,
    bypassRls: !!r.bypass,
    writable: MUST_NOT_WRITE.filter((_, i) => r[`w${i}`] === true),
    readable: MUST_NOT_READ.filter((_, i) => r[`r${i}`] === true),
    createRole: !!r.create_role,
    canStage: !!r.can_stage,
  };
}

export function isLocalDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.searchParams.get("host") ?? u.hostname;
    return host === "" || host === "localhost" || host === "127.0.0.1" || host === "::1" || host.startsWith("/");
  } catch {
    return false;
  }
}

// Why this role may not run the job, or null when it may.
export function privilegeProblem(p: RolePrivileges, env: Record<string, string | undefined> = process.env): string | null {
  const over: string[] = [];
  if (p.superuser) over.push("superuser");
  if (p.bypassRls) over.push("bypasses RLS");
  if (p.writable.length) over.push(`can write ${p.writable.join(", ")}`);
  if (p.readable.length) over.push(`can read ${p.readable.join(", ")}`);
  if (p.createRole) over.push("can create roles");
  if (!over.length) return p.canStage ? null : `role ${p.role} cannot insert into item_holdbacks (apply migration 064 and use a member of content_recheck)`;
  if (env.RECHECK_ALLOW_PRIVILEGED === "local" && isLocalDatabase(env.DATABASE_URL)) return null;
  return (
    `refusing to run as ${p.role}: it ${over.join("; ")}. Connect as a LOGIN member of content_recheck ` +
    `(RECHECK_DATABASE_URL; docs/content-review.md, "Re-check database user").`
  );
}

export async function assertStagingOnlyRole(env: Record<string, string | undefined> = process.env): Promise<RolePrivileges> {
  const p = await currentRolePrivileges();
  const problem = privilegeProblem(p, env);
  if (problem) throw new Error(problem);
  return p;
}
