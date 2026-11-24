-- YD Works backend: catalog, orders, dispatch, proof of delivery, quote requests.
-- Security model
--   * Every table has RLS. Clients never insert/update orders directly:
--     all writes go through SECURITY DEFINER functions that validate the caller
--     and compute prices from the catalog on the server.
--   * New sign-ups are always customers. Driver/admin roles are granted by staff.

create schema if not exists private;
grant usage on schema private to authenticated, anon;

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'customer' check (role in ('customer','driver','admin')),
  full_name   text not null default '' check (char_length(full_name) <= 80),
  phone       text not null default '' check (char_length(phone) <= 20),
  unit_code   text,                 -- drivers: assigned vehicle, e.g. TP-04
  unit_name   text,
  is_online   boolean not null default false,
  rating      numeric(2,1) not null default 5.0,
  created_at  timestamptz not null default now()
);
alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
create policy "read own profile"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          left(coalesce(new.raw_user_meta_data->>'full_name', ''), 80),
          left(coalesce(new.raw_user_meta_data->>'phone', ''), 20));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;
grant execute on function private.my_role() to authenticated;

-- ───────────────────────── catalog ─────────────────────────
create table public.machines (
  id         text primary key,
  code       text not null,
  name       text not null,
  category   text not null check (category in ('earth','haul','lift','site')),
  icon       text not null,
  specs      jsonb not null default '{}',
  rate_hr    numeric(10,2) not null,
  rate_day   numeric(10,2) not null,
  rate_mo    numeric(10,2) not null,
  busy_until timestamptz,
  active     boolean not null default true,
  sort       int not null default 0
);
create table public.materials (
  id       text primary key,
  name     text not null,
  category text not null,
  unit     text not null,
  price    numeric(10,2) not null,
  step     int not null default 1,
  icon     text not null,
  active   boolean not null default true,
  sort     int not null default 0
);
alter table public.machines  enable row level security;
alter table public.materials enable row level security;
grant select on public.machines, public.materials to anon, authenticated;
create policy "catalog readable" on public.machines  for select to anon, authenticated using (active);
create policy "catalog readable" on public.materials for select to anon, authenticated using (active);

-- ───────────────────────── orders ─────────────────────────
create sequence public.order_ref_seq start 48500;

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique default ('YD-' || nextval('public.order_ref_seq')),
  customer_id     uuid not null references public.profiles(id) on delete restrict,
  customer_name   text not null default '',
  customer_phone  text not null default '',
  driver_id       uuid references public.profiles(id) on delete set null,
  driver_name     text,
  driver_unit     text,
  kind            text not null check (kind in ('hire','materials')),
  title           text not null,
  icon            text not null,
  site            text not null check (char_length(site) between 2 and 120),
  scheduled_label text not null default 'Today, ASAP' check (char_length(scheduled_label) <= 60),
  note            text not null default '' check (char_length(note) <= 500),
  total           numeric(12,2) not null,
  status          text not null default 'requested'
                  check (status in ('requested','accepted','loading','enroute','arrived','completed','cancelled')),
  progress        real not null default 0 check (progress between 0 and 1),
  driver_lat      double precision,
  driver_lng      double precision,
  pod_name        text,
  pod_photo_path  text,
  pod_sig_path    text,
  driver_earning  numeric(10,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index orders_customer_idx on public.orders (customer_id, created_at desc);
create index orders_driver_idx   on public.orders (driver_id, created_at desc);
create index orders_open_idx     on public.orders (created_at) where status = 'requested';

create table public.order_lines (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders(id) on delete cascade,
  label      text not null,
  qty        numeric(10,2) not null check (qty > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  sort       int not null default 0
);
create index order_lines_order_idx on public.order_lines (order_id);

create table public.order_events (
  id       bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  status   text not null,
  actor_id uuid,
  at       timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, at);

alter table public.orders       enable row level security;
alter table public.order_lines  enable row level security;
alter table public.order_events enable row level security;
grant select on public.orders, public.order_lines, public.order_events to authenticated;

-- who may see an order: its customer, its driver, any online-capable driver while it is open, admins
create function private.can_see_order(o public.orders) returns boolean
language sql stable security definer set search_path = '' as $$
  select o.customer_id = (select auth.uid())
      or o.driver_id   = (select auth.uid())
      or (o.status = 'requested' and private.my_role() = 'driver')
      or private.my_role() = 'admin'
$$;
create function private.can_see_order_id(oid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders o where o.id = oid and private.can_see_order(o))
$$;
grant execute on function private.can_see_order(public.orders), private.can_see_order_id(uuid) to authenticated;

create policy "see own or assignable orders" on public.orders       for select to authenticated using (private.can_see_order(orders));
create policy "see lines of visible orders"  on public.order_lines  for select to authenticated using (private.can_see_order_id(order_id));
create policy "see events of visible orders" on public.order_events for select to authenticated using (private.can_see_order_id(order_id));

-- status history + updated_at
create function private.order_touch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.order_events (order_id, status, actor_id) values (new.id, new.status, (select auth.uid()));
  end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end $$;
create trigger orders_touch_ins after insert on public.orders for each row execute function private.order_touch();
create trigger orders_touch_upd before update on public.orders for each row execute function private.order_touch();
-- the BEFORE trigger inserts the event before the row change is visible; that's fine for history.

-- ───────────────────────── RPCs ─────────────────────────
-- create_order: prices come from the catalog, never from the client.
--   hire:      items = [{"machine_id":"exc20","mode":"hr|day|mo","qty":4}]
--   materials: items = [{"material_id":"cem","qty":40}, ...]
create function public.create_order(p_kind text, p_items jsonb, p_site text, p_when text default 'Today, ASAP', p_note text default '')
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  me public.profiles;
  o public.orders;
  it jsonb;
  m public.machines;
  mat public.materials;
  q numeric;
  rate numeric;
  sub numeric := 0;
  n int := 0;
  first_title text;
  first_icon text;
  unit_lbl text;
begin
  if uid is null then raise exception 'Sign in to place an order' using errcode = '28000'; end if;
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
      if coalesce(it->>'mode','hr') = 'hr' then
        insert into public.order_lines (order_id, label, qty, unit_price, sort) values (o.id, 'Mobilisation', 1, 300, n + 100);
        sub := sub + 300;
      end if;
      if n = 0 then first_title := m.name || ' · ' || trim(to_char(q,'FM999999.##')) || ' ' || unit_lbl; first_icon := m.icon; end if;
    else
      select * into mat from public.materials where id = it->>'material_id' and active;
      if not found then raise exception 'Material not available'; end if;
      insert into public.order_lines (order_id, label, qty, unit_price, sort) values (o.id, mat.name || ' (' || mat.unit || ')', q, mat.price, n);
      sub := sub + mat.price * q;
      if n = 0 then first_title := mat.name; first_icon := mat.icon; end if;
    end if;
    n := n + 1;
  end loop;

  if p_kind = 'materials' then
    if sub < 15000 then
      insert into public.order_lines (order_id, label, qty, unit_price, sort) values (o.id, 'Delivery', 1, 250, 999);
      sub := sub + 250;
    end if;
    if n > 1 then first_title := first_title || ' + ' || (n - 1) || ' more'; end if;
  end if;

  update public.orders set title = first_title, icon = first_icon, total = sub where id = o.id returning * into o;
  return o;
end $$;

create function public.cancel_order(p_order uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  update public.orders set status = 'cancelled'
   where id = p_order and customer_id = (select auth.uid()) and status = 'requested'
  returning * into o;
  if not found then raise exception 'This order can no longer be cancelled'; end if;
  return o;
end $$;

create function public.set_online(p_online boolean) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  if private.my_role() <> 'driver' then raise exception 'Driver accounts only'; end if;
  update public.profiles set is_online = p_online where id = (select auth.uid()) returning * into p;
  return p;
end $$;

-- accept is atomic: the WHERE on status/driver_id means only one driver can win.
create function public.accept_order(p_order uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; o public.orders;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if me.role is distinct from 'driver' then raise exception 'Driver accounts only'; end if;
  if exists (select 1 from public.orders where driver_id = me.id and status in ('accepted','loading','enroute','arrived')) then
    raise exception 'Finish your current job first';
  end if;
  update public.orders
     set status = 'accepted', driver_id = me.id, driver_name = me.full_name,
         driver_unit = coalesce(me.unit_code || ' · ' || me.unit_name, me.unit_code, '')
   where id = p_order and status = 'requested' and driver_id is null
  returning * into o;
  if not found then raise exception 'Another driver took this job'; end if;
  return o;
end $$;

create function public.advance_order(p_order uuid, p_status text, p_pod_name text default null,
                                     p_pod_photo text default null, p_pod_sig text default null)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare o public.orders; nxt text;
begin
  select * into o from public.orders where id = p_order and driver_id = (select auth.uid()) for update;
  if not found then raise exception 'Not your job'; end if;
  nxt := case o.status when 'accepted' then 'loading' when 'loading' then 'enroute'
                       when 'enroute' then 'arrived' when 'arrived' then 'completed' end;
  if nxt is null or nxt <> p_status then raise exception 'Invalid step from % to %', o.status, p_status; end if;
  if p_status = 'completed' then
    if coalesce(trim(p_pod_name),'') = '' or p_pod_sig is null then
      raise exception 'Receiver name and signature are required';
    end if;
    -- uploaded files must live under this order's folder
    if p_pod_sig not like o.id::text || '/%' or (p_pod_photo is not null and p_pod_photo not like o.id::text || '/%') then
      raise exception 'Invalid proof-of-delivery file';
    end if;
    update public.orders set status = 'completed', progress = 1, completed_at = now(),
           pod_name = left(trim(p_pod_name),80), pod_photo_path = p_pod_photo, pod_sig_path = p_pod_sig,
           driver_earning = round(greatest(150, o.total * 0.06) / 10) * 10
     where id = p_order returning * into o;
  else
    update public.orders set status = p_status,
           progress = case when p_status = 'arrived' then 1 else progress end
     where id = p_order returning * into o;
  end if;
  return o;
end $$;

create function public.report_position(p_order uuid, p_progress real, p_lat double precision default null, p_lng double precision default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.orders
     set progress = least(greatest(coalesce(p_progress,0),0),1), driver_lat = p_lat, driver_lng = p_lng
   where id = p_order and driver_id = (select auth.uid()) and status = 'enroute';
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_order(text,jsonb,text,text,text),
                          public.cancel_order(uuid),
                          public.set_online(boolean),
                          public.accept_order(uuid),
                          public.advance_order(uuid,text,text,text,text),
                          public.report_position(uuid,real,double precision,double precision)
  to authenticated;

-- ───────────────────────── website quote requests ─────────────────────────
create table public.quote_requests (
  id         uuid primary key default gen_random_uuid(),
  ref        text not null unique default ('Q-' || upper(substr(md5(gen_random_uuid()::text),1,6))),
  name       text not null check (char_length(name) between 1 and 80),
  phone      text not null check (phone ~ '^\+?[0-9 ]{7,20}$'),
  needs      text[] not null check (cardinality(needs) between 1 and 4),
  site       text not null check (char_length(site) <= 60),
  start_date date,
  details    text not null default '' check (char_length(details) <= 2000),
  status     text not null default 'new' check (status in ('new','called','quoted','won','lost')),
  created_at timestamptz not null default now()
);
alter table public.quote_requests enable row level security;
grant insert (name, phone, needs, site, start_date, details) on public.quote_requests to anon, authenticated;
create policy "anyone can submit a quote request" on public.quote_requests for insert to anon, authenticated
  with check (status = 'new');
grant select, update on public.quote_requests to authenticated;
create policy "staff read quotes"   on public.quote_requests for select to authenticated using (private.my_role() = 'admin');
create policy "staff update quotes" on public.quote_requests for update to authenticated using (private.my_role() = 'admin');

-- ───────────────────────── realtime ─────────────────────────
alter publication supabase_realtime add table public.orders, public.order_lines, public.order_events;

-- ───────────────────────── storage: proof of delivery ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pod', 'pod', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "driver uploads pod for own active job" on storage.objects for insert to authenticated
  with check (bucket_id = 'pod' and exists (
    select 1 from public.orders o
     where o.id::text = (storage.foldername(name))[1]
       and o.driver_id = (select auth.uid()) and o.status = 'arrived'));
create policy "customer and driver read pod" on storage.objects for select to authenticated
  using (bucket_id = 'pod' and exists (
    select 1 from public.orders o
     where o.id::text = (storage.foldername(name))[1]
       and (o.customer_id = (select auth.uid()) or o.driver_id = (select auth.uid()) or private.my_role() = 'admin')));
