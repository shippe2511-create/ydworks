-- YD Works admin console: editable settings that drive the website and both apps,
-- admin visibility, and admin-only management functions.

-- ───────────── settings (public read, admin write) ─────────────
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.app_settings enable row level security;
grant select on public.app_settings to anon, authenticated;
grant insert, update on public.app_settings to authenticated;
create policy "settings readable"     on public.app_settings for select to anon, authenticated using (true);
create policy "admins write settings" on public.app_settings for insert to authenticated with check (private.my_role() = 'admin');
create policy "admins edit settings"  on public.app_settings for update to authenticated using (private.my_role() = 'admin') with check (private.my_role() = 'admin');

insert into public.app_settings (key, value) values
  ('contact',  '{"hotline":"992 0202","email":"yd@yd-mv.com","hours_am":"07:30 – 12:00","hours_pm":"13:00 – 18:00","friday":"Call to confirm"}'),
  ('announcement', '{"active":false,"text":"","tone":"info"}'),
  ('pricing',  '{"delivery_fee":250,"free_delivery_over":15000,"mobilisation_fee":300,"driver_share":0.06,"min_driver_pay":150}'),
  ('ordering', '{"accepting_orders":true,"same_day_cutoff":"14:00"}')
on conflict (key) do nothing;

create function private.setting_num(k text, f text, d numeric) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce((select (value->>f)::numeric from public.app_settings where key = k), d)
$$;

-- ───────────── admin visibility ─────────────
create policy "admins read profiles" on public.profiles for select to authenticated using (private.my_role() = 'admin');
grant insert, update, delete on public.machines, public.materials to authenticated;
create policy "admins read all machines"  on public.machines  for select to authenticated using (private.my_role() = 'admin');
create policy "admins read all materials" on public.materials for select to authenticated using (private.my_role() = 'admin');
create policy "admins manage machines"  on public.machines  for all to authenticated using (private.my_role() = 'admin') with check (private.my_role() = 'admin');
create policy "admins manage materials" on public.materials for all to authenticated using (private.my_role() = 'admin') with check (private.my_role() = 'admin');
alter publication supabase_realtime add table public.profiles, public.quote_requests;

-- ───────────── pricing now comes from settings ─────────────
create or replace function public.create_order(p_kind text, p_items jsonb, p_site text, p_when text default 'Today, ASAP', p_note text default '')
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  me public.profiles; o public.orders; it jsonb; m public.machines; mat public.materials;
  q numeric; rate numeric; sub numeric := 0; n int := 0;
  first_title text; first_icon text; unit_lbl text;
  fee_del numeric := private.setting_num('pricing','delivery_fee',250);
  free_over numeric := private.setting_num('pricing','free_delivery_over',15000);
  fee_mob numeric := private.setting_num('pricing','mobilisation_fee',300);
begin
  if uid is null then raise exception 'Sign in to place an order' using errcode = '28000'; end if;
  if coalesce((select (value->>'accepting_orders')::boolean from public.app_settings where key='ordering'), true) = false then
    raise exception 'YD Works is not taking new orders right now. Please call the counter.';
  end if;
  select * into me from public.profiles where id = uid;
  if p_kind not in ('hire','materials') then raise exception 'Unknown order type'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'Add at least one item';
  end if;
  insert into public.orders (customer_id, customer_name, customer_phone, kind, title, icon, site, scheduled_label, note, total)
  values (uid, me.full_name, me.phone, p_kind, 'pending', 'bag', left(p_site,120), left(coalesce(p_when,'Today, ASAP'),60), left(coalesce(p_note,''),500), 0)
  returning * into o;
  for it in select * from jsonb_array_elements(p_items) loop
    q := (it->>'qty')::numeric;
    if q is null or q <= 0 or q > 100000 then raise exception 'Invalid quantity'; end if;
    if p_kind = 'hire' then
      select * into m from public.machines where id = it->>'machine_id' and active;
      if not found then raise exception 'Machine not available'; end if;
      rate := case it->>'mode' when 'day' then m.rate_day when 'mo' then m.rate_mo else m.rate_hr end;
      unit_lbl := case it->>'mode' when 'day' then 'days' when 'mo' then 'months' else 'hrs' end;
      insert into public.order_lines (order_id, label, qty, unit_price, sort) values (o.id, m.name || ', ' || unit_lbl, q, rate, n);
      sub := sub + rate * q;
      if coalesce(it->>'mode','hr') = 'hr' and fee_mob > 0 then
        insert into public.order_lines (order_id, label, qty, unit_price, sort) values (o.id, 'Mobilisation', 1, fee_mob, n + 100);
        sub := sub + fee_mob;
      end if;
      if n = 0 then first_title := m.name || ' · ' || trim(to_char(q,'FM999999.##')) || ' ' || unit_lbl; first_icon := m.id; end if;
    else
      select * into mat from public.materials where id = it->>'material_id' and active;
      if not found then raise exception 'Material not available'; end if;
      insert into public.order_lines (order_id, label, qty, unit_price, sort) values (o.id, mat.name || ' (' || mat.unit || ')', q, mat.price, n);
      sub := sub + mat.price * q;
      if n = 0 then first_title := mat.name; first_icon := mat.id; end if;
    end if;
    n := n + 1;
  end loop;
  if p_kind = 'materials' then
    if sub < free_over and fee_del > 0 then
      insert into public.order_lines (order_id, label, qty, unit_price, sort) values (o.id, 'Delivery', 1, fee_del, 999);
      sub := sub + fee_del;
    end if;
    if n > 1 then first_title := first_title || ' + ' || (n - 1) || ' more'; end if;
  end if;
  update public.orders set title = first_title, icon = first_icon, total = sub where id = o.id returning * into o;
  return o;
end $$;

create or replace function public.advance_order(p_order uuid, p_status text, p_pod_name text default null,
                                                p_pod_photo text default null, p_pod_sig text default null)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare o public.orders; nxt text;
  share numeric := private.setting_num('pricing','driver_share',0.06);
  floor_pay numeric := private.setting_num('pricing','min_driver_pay',150);
begin
  select * into o from public.orders where id = p_order and driver_id = (select auth.uid()) for update;
  if not found then raise exception 'Not your job'; end if;
  nxt := case o.status when 'accepted' then 'loading' when 'loading' then 'enroute'
                       when 'enroute' then 'arrived' when 'arrived' then 'completed' end;
  if nxt is null or nxt <> p_status then raise exception 'Invalid step from % to %', o.status, p_status; end if;
  if p_status = 'completed' then
    if coalesce(trim(p_pod_name),'') = '' or p_pod_sig is null then raise exception 'Receiver name and signature are required'; end if;
    if p_pod_sig not like o.id::text || '/%' or (p_pod_photo is not null and p_pod_photo not like o.id::text || '/%') then
      raise exception 'Invalid proof-of-delivery file';
    end if;
    update public.orders set status = 'completed', progress = 1, completed_at = now(),
           pod_name = left(trim(p_pod_name),80), pod_photo_path = p_pod_photo, pod_sig_path = p_pod_sig,
           driver_earning = round(greatest(floor_pay, o.total * share) / 10) * 10
     where id = p_order returning * into o;
  else
    update public.orders set status = p_status, progress = case when p_status = 'arrived' then 1 else progress end
     where id = p_order returning * into o;
  end if;
  return o;
end $$;

-- ───────────── admin functions ─────────────
create function private.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.my_role() is distinct from 'admin' then raise exception 'Admins only' using errcode = '42501'; end if;
end $$;

-- assign (or reassign) an open/accepted order to a driver
create function public.admin_assign_order(p_order uuid, p_driver uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare d public.profiles; o public.orders;
begin
  perform private.require_admin();
  select * into d from public.profiles where id = p_driver and role = 'driver';
  if not found then raise exception 'That person is not a driver'; end if;
  update public.orders
     set driver_id = d.id, driver_name = d.full_name,
         driver_unit = coalesce(d.unit_code || ' · ' || d.unit_name, d.unit_code, ''),
         status = case when status = 'requested' then 'accepted' else status end
   where id = p_order and status in ('requested','accepted')
  returning * into o;
  if not found then raise exception 'Only waiting or newly accepted orders can be reassigned'; end if;
  return o;
end $$;

create function public.admin_cancel_order(p_order uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  perform private.require_admin();
  update public.orders set status = 'cancelled' where id = p_order and status not in ('completed','cancelled') returning * into o;
  if not found then raise exception 'This order is already finished'; end if;
  return o;
end $$;

-- promote/demote an account: customer ↔ driver ↔ admin, and set the driver's vehicle
create function public.admin_set_role(p_email text, p_role text, p_unit_code text default null, p_unit_name text default null)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare uid uuid; p public.profiles;
begin
  perform private.require_admin();
  if p_role not in ('customer','driver','admin') then raise exception 'Unknown role'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'No account with that email. Ask them to sign up in the YD Works app first.'; end if;
  if uid = (select auth.uid()) and p_role <> 'admin' then raise exception 'You cannot remove your own admin access'; end if;
  update public.profiles set role = p_role,
         unit_code = case when p_role = 'driver' then nullif(trim(p_unit_code),'') else null end,
         unit_name = case when p_role = 'driver' then nullif(trim(p_unit_name),'') else null end,
         is_online = case when p_role = 'driver' then is_online else false end
   where id = uid returning * into p;
  return p;
end $$;

create function public.admin_update_lead(p_lead uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  update public.quote_requests set status = p_status where id = p_lead;
end $$;

-- people list with email + order stats, for the Customers and Drivers pages
create function public.admin_people() returns table (
  id uuid, email text, role text, full_name text, phone text, unit_code text, unit_name text,
  is_online boolean, rating numeric, created_at timestamptz, orders bigint, spend numeric, jobs bigint, earned numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
  select p.id, u.email::text, p.role, p.full_name, p.phone, p.unit_code, p.unit_name, p.is_online, p.rating, p.created_at,
         (select count(*) from public.orders o where o.customer_id = p.id),
         (select coalesce(sum(o.total),0) from public.orders o where o.customer_id = p.id and o.status = 'completed'),
         (select count(*) from public.orders o where o.driver_id = p.id and o.status = 'completed'),
         (select coalesce(sum(o.driver_earning),0) from public.orders o where o.driver_id = p.id and o.status = 'completed')
    from public.profiles p join auth.users u on u.id = p.id
   order by p.created_at desc;
end $$;

revoke execute on function public.admin_assign_order(uuid,uuid), public.admin_cancel_order(uuid),
  public.admin_set_role(text,text,text,text), public.admin_update_lead(uuid,text), public.admin_people() from public, anon;
grant execute on function public.admin_assign_order(uuid,uuid), public.admin_cancel_order(uuid),
  public.admin_set_role(text,text,text,text), public.admin_update_lead(uuid,text), public.admin_people() to authenticated;
