# Verifying the database's TLS certificate (optional)

REQ-207 (FAIL-942). Until you set a CA the app encrypts the connection but
does not check who answered (the old behaviour). Setting one makes the app
refuse a server whose certificate does not chain to it.

## Get the CA

Supabase dashboard, the project, **Project Settings**, **Database**, section
**SSL Configuration**, **Download certificate**. You get a `.crt` file (PEM
text starting `-----BEGIN CERTIFICATE-----`). If the label differs, search
the Database settings page for "SSL".

## Use it

- Vercel, **Environment Variables**, add `DATABASE_CA_CERT` (Production),
  value: the whole PEM text pasted in (new lines are fine; a single line with
  literal `\n` between lines also works). **Save**, then **Redeploy**.
- For the GitHub jobs (migrate, seed): add `DATABASE_CA_CERT` the same way as
  an environment secret in `production-database` and `production-backup`
  (the migrate and seed scripts use it; the `pg_dump` backup does not).
- Locally you may use `PGSSLROOTCERT=/path/to/ca.crt` (libpq's name).

If both are set `DATABASE_CA_CERT` wins. `PGSSLMODE=disable` (CI only) still
turns TLS off.

## Check

`/api/health` is `ok` and the Vercel log shows no `self-signed certificate`,
`unable to verify` or `Hostname/IP does not match` errors.

## Rollback

Delete `DATABASE_CA_CERT` and redeploy. Unset means the old behaviour.

## Notes

- A CA that is set but unreadable stops the app from connecting on purpose; it
  never silently falls back to not checking.
- Not verified here: whether the pooler hosts (`*.pooler.supabase.com`)
  present a certificate whose name matches the host. Try it on a Vercel
  Preview deployment first. If you see `Hostname/IP does not match`, leave the
  variable unset and tell us; pinning then needs a code change.
