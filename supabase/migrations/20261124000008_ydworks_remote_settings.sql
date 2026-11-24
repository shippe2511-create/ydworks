-- YD Works 008: settings the console uses to manage the website, customer app and driver app.
-- Shapes and defaults are documented in shared/yd-settings.js. Readable without signing in (existing policy);
-- only staff with the "settings" permission (Managers) can change them (existing policies + audit trigger).
insert into public.app_settings (key, value) values
  ('website', '{"hero_title_en":"","hero_title_dv":"","hero_sub_en":"","hero_sub_dv":"",
    "sections":{"services":true,"fleet":true,"materials":true,"estimate":true,"projects":true,"reviews":true,"quote":true,"contact":true},
    "whatsapp_button":true,"seo_title":"","seo_description":"","maintenance":{"active":false,"text_en":"","text_dv":""}}'),
  ('customer_app', '{"home_title_en":"","home_title_dv":"","home_sub_en":"","home_sub_dv":"",
    "tiles":{"hire":true,"materials":true,"logistics":true,"house":true},"whatsapp":true,
    "promo":{"active":false,"title_en":"","title_dv":"","text_en":"","text_dv":"","tone":"info"},
    "maintenance":{"active":false,"text_en":"","text_dv":""},
    "min_version":"","update_url_ios":"","update_url_android":"","update_text_en":"","update_text_dv":""}'),
  ('driver_app', '{"message":{"active":false,"text_en":"","text_dv":"","tone":"info"},"checklist":[],
    "require_pod_photo":true,"require_daily_check":true,"fuel_logging":true,"location_every_sec":30,
    "min_version":"","update_text_en":"","update_text_dv":""}')
on conflict (key) do nothing;
update public.app_settings set value = '{"text_dv":"","where":{"website":true,"customer_app":true}}'::jsonb || value where key = 'announcement';

-- customer app maintenance mode also stops new orders on the server
create or replace function private.app_open() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select (value->'maintenance'->>'active')::boolean from public.app_settings where key = 'customer_app'), false) = false
$$;
create function private.block_orders_in_maintenance() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.app_open() and coalesce(private.real_role(),'customer') = 'customer' then
    raise exception 'YD Works is updating the app. Please call 992 0202 to order.';
  end if;
  return new;
end $$;
create trigger orders_maintenance before insert on public.orders for each row execute function private.block_orders_in_maintenance();
