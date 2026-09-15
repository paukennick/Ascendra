// Minimal .env.local loader so `npm run seed` works without extra tooling.
// Imported for its side effect only, and before ./data, so env vars like
// DEFAULT_USER_EMAIL are in process.env before data.ts reads them at
// module-eval time (static imports evaluate before the importing module's
// own top-level code runs, so loading .env.local from within seed.ts itself
// was too late).
import fs from "node:fs";
import path from "node:path";

function loadDotEnvLocal() {
  const envPath = path.resolve(__dirname, "../../.env.local");
  if (!fs.existsSync(envPath)) return;
  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnvLocal();
