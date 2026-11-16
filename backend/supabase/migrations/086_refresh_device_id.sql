-- REQ-306 (Nick 2026-11-16: "active sessions should stack. They should end
-- across devices not used after a time"): one session per device.
--
-- device_id is a random id the app keeps per install (phone) or per browser
-- (web) and sends as X-Ascendra-Device (mobile/src/lib/deviceId.ts). A new
-- sign-in that carries one ends every live token of the same user and device
-- before the new family is created (lib/auth/tokens.ts createRefreshToken),
-- so Active sessions shows one row per device. Rotation carries it to the
-- successor. Null for sessions from builds that don't send it: those keep the
-- old behavior and expire on their own.
--
-- No grant change: every privilege on refresh_tokens is table-level.
alter table refresh_tokens add column if not exists device_id text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'refresh_tokens_device_id_086' and conrelid = 'refresh_tokens'::regclass) then
    alter table refresh_tokens add constraint refresh_tokens_device_id_086
      check (device_id is null or device_id ~ '^[A-Za-z0-9_-]{16,64}$');
  end if;
end $$;

create index if not exists refresh_tokens_user_device_live_086
  on refresh_tokens (user_id, device_id)
  where revoked_at is null and device_id is not null;
