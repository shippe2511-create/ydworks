-- Sends every new notification to the `notify` Edge Function (push / WhatsApp / Viber / SMS).
-- Needs two Vault secrets (Dashboard → Project Settings → Vault):
--   project_url       e.g. https://<ref>.supabase.co
--   service_role_key  the project's service role key
-- Until both exist this trigger does nothing, and notifications still show in the apps.
create extension if not exists pg_net;

create or replace function private.dispatch_notification() returns trigger
language plpgsql security definer set search_path = '' as $$
declare url text; key text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into key from vault.decrypted_secrets where name = 'service_role_key';
  if url is null or key is null then return new; end if;
  perform net.http_post(
    url := url || '/functions/v1/notify',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || key),
    body := jsonb_build_object('notification_id', new.id));
  return new;
end $$;
create trigger notifications_dispatch after insert on public.notifications for each row execute function private.dispatch_notification();
