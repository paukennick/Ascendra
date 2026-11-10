const { buildHeaders } = require("./security-headers");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // REQ-207: /api/health compares the migration files this build ships with
  // the schema_migrations ledger, so the .sql files must be in that function's
  // bundle (Vercel only copies what it traces).
  outputFileTracingIncludes: {
    "/api/health": ["./supabase/migrations/*.sql"],
  },
  async headers() {
    // Security headers and the Content-Security-Policy are in
    // security-headers.js. CORS itself is handled separately in proxy.ts.
    return buildHeaders();
  },
};

module.exports = nextConfig;
