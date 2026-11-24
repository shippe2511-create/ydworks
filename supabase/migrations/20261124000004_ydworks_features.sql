-- YD Works feature pack:
--   phone sign-in, notifications (in-app + push/WhatsApp/Viber/SMS fan-out), saved sites with GPS,
--   live driver location, equipment booking calendar, material stock, payments (cash/card/transfer),
--   GST invoices, house-building projects, counter orders + quotes, fleet health, reports.
-- Every table has RLS. Writes that carry business rules go through SECURITY DEFINER functions.

create extension if not exists btree_gist;

-- ═════════════ profiles: phone sign-in, preferences, live location ═════════════
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          left(coalesce(new.raw_user_meta_data->>'full_name', ''), 80),
          left(coalesce(nullif(new.phone, ''), new.raw_user_meta_data->>'phone', ''), 20));
  return new;
end $$;

alter table public.profiles
  add column notify_channel text not null default 'push' check (notify_channel in ('push','whatsapp','viber','sms','none')),
  add column lang text not null default 'en' check (lang in ('en','dv')),
  add column last_lat double precision,
  add column last_lng double precision,
  add column last_seen timestamptz;
grant update (full_name, phone, notify_channel, lang) on public.profiles to authenticated;

-- ═════════════ notifications ═════════════
create table public.device_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  platform   text not null check (platform in ('ios','android','web')),
  updated_at timestamptz not null default now()
);
alter table public.device_tokens enable row level security;
grant select, insert, update, delete on public.device_tokens to authenticated;
create policy "own device tokens" on public.device_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.notifications (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  kind         text not null,
  title        text not null,
  body         text not null default '',
  order_id     uuid references public.orders(id) on delete cascade,
  project_id   uuid,
  read_at      timestamptz,
  delivered_at timestamptz,
  created_at   timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
create policy "read own notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "mark own read" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function private.notify(p_user uuid, p_kind text, p_title text, p_body text, p_order uuid default null, p_project uuid default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, order_id, project_id)
  select p_user, p_kind, p_title, p_body, p_order, p_project where p_user is not null
$$;

create function private.notify_admins(p_kind text, p_title text, p_body text, p_order uuid default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, order_id)
  select id, p_kind, p_title, p_body, p_order from public.profiles where role = 'admin'
$$;

-- ═════════════ saved sites (with GPS) ═════════════
create table public.sites (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 80),
  area        text not null default '' check (char_length(area) <= 80),
  lat         double precision check (lat between -90 and 90),
  lng         double precision check (lng between -180 and 180),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.sites enable row level security;
grant select, insert, update, delete on public.sites to authenticated;
create policy "own sites" on public.sites for all to authenticated
  using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));

-- ═════════════ orders: counter orders, site GPS, payment, invoice, booking window ═════════════
alter table public.orders
  alter column customer_id drop not null,
  add column source         text not null default 'app' check (source in ('app','counter')),
  add column site_lat       double precision,
  add column site_lng       double precision,
  add column payment_method text not null default 'cod' check (payment_method in ('cod','card','transfer')),
  add column payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','refunded')),
  add column gst_amount     numeric(12,2) not null default 0,
  add column invoice_no     text unique,
  add column starts_at      timestamptz,
  add column ends_at        timestamptz;
alter table public.order_lines add column item_id text;
create sequence public.invoice_seq start 1001;

-- ═════════════ stock ═════════════
alter table public.materials
  add column stock_qty    numeric(12,2),          -- null = not tracked
  add column low_stock_at numeric(12,2);
alter table public.machines add column hours_meter numeric(10,1) not null default 0;

-- ═════════════ equipment booking calendar ═════════════
create table public.machine_bookings (
  id         bigint generated always as identity primary key,
  machine_id text not null references public.machines(id) on delete cascade,
  order_id   uuid references public.orders(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  status     text not null default 'held' check (status in ('held','confirmed','released','blocked')),
  note       text not null default '',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- a machine can never be double-booked
  exclude using gist (machine_id with =, tstzrange(starts_at, ends_at, '[)') with &&) where (status <> 'released')
);
create index machine_bookings_time_idx on public.machine_bookings (machine_id, starts_at);
alter table public.machine_bookings enable row level security;
grant select on public.machine_bookings to authenticated;
create policy "admins read bookings" on public.machine_bookings for select to authenticated using (private.my_role() = 'admin');

-- public availability: busy windows only, no customer details
create function public.machine_busy(p_from timestamptz, p_to timestamptz, p_machine text default null)
returns table (machine_id text, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select b.machine_id, b.starts_at, b.ends_at from public.machine_bookings b
   where b.status <> 'released' and b.starts_at < p_to and b.ends_at > p_from
     and (p_machine is null or b.machine_id = p_machine)
   order by b.machine_id, b.starts_at
$$;

-- ═════════════ pricing core (shared by app orders, counter orders) ═════════════
-- Adds lines, holds bookings, reserves stock; returns the order total.
create function private.price_items(p_order uuid, p_kind text, p_items jsonb)
returns numeric language plpgsql security definer set search_path = '' as $$
declare
  it jsonb; m public.machines; mat public.materials;
  q numeric; rate numeric; sub numeric := 0; n int := 0; unit_lbl text; st timestamptz; en timestamptz;
  first_title text; first_icon text; first_start timestamptz; last_end timestamptz;
  fee_del numeric := private.setting_num('pricing','delivery_fee',250);
  free_over numeric := private.setting_num('pricing','free_delivery_over',15000);
  fee_mob numeric := private.setting_num('pricing','mobilisation_fee',300);
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'Add at least one item';
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    q := (it->>'qty')::numeric;
    if q is null or q <= 0 or q > 100000 then raise exception 'Invalid quantity'; end if;
    if p_kind = 'hire' then
      select * into m from public.machines where id = it->>'machine_id' and active;
      if not found then raise exception 'Machine not available'; end if;
      rate := case it->>'mode' when 'day' then m.rate_day when 'mo' then m.rate_mo else m.rate_hr end;
      unit_lbl := case it->>'mode' when 'day' then 'days' when 'mo' then 'months' else 'hrs' end;
      st := greatest(coalesce((it->>'start')::timestamptz, now()), now() - interval '10 minutes');
      en := st + q * case it->>'mode' when 'day' then interval '1 day' when 'mo' then interval '30 days' else interval '1 hour' end;
      begin
        insert into public.machine_bookings (machine_id, order_id, starts_at, ends_at) values (m.id, p_order, st, en);
      exception when exclusion_violation then
        raise exception '% is already booked for part of that time. Pick another start time.', m.name;
      end;
      first_start := least(coalesce(first_start, st), st); last_end := greatest(coalesce(last_end, en), en);
      insert into public.order_lines (order_id, label, qty, unit_price, sort, item_id) values (p_order, m.name || ', ' || unit_lbl, q, rate, n, m.id);
      sub := sub + rate * q;
      if coalesce(it->>'mode','hr') = 'hr' and fee_mob > 0 then
        insert into public.order_lines (order_id, label, qty, unit_price, sort) values (p_order, 'Mobilisation', 1, fee_mob, n + 100);
        sub := sub + fee_mob;
      end if;
      if n = 0 then first_title := m.name || ' · ' || trim(to_char(q,'FM999999.##')) || ' ' || unit_lbl; first_icon := m.id; end if;
    else
      select * into mat from public.materials where id = it->>'material_id' and active for update;
      if not found then raise exception 'Material not available'; end if;
      if mat.stock_qty is not null then
        if mat.stock_qty < q then raise exception 'Only % left of % (%). Reduce the quantity or call the counter.', trim(to_char(mat.stock_qty,'FM999999.##')), mat.name, mat.unit; end if;
        update public.materials set stock_qty = stock_qty - q where id = mat.id;
      end if;
      insert into public.order_lines (order_id, label, qty, unit_price, sort, item_id) values (p_order, mat.name || ' (' || mat.unit || ')', q, mat.price, n, mat.id);
      sub := sub + mat.price * q;
      if n = 0 then first_title := mat.name; first_icon := mat.id; end if;
    end if;
    n := n + 1;
  end loop;
  if p_kind = 'materials' then
    if sub < free_over and fee_del > 0 then
      insert into public.order_lines (order_id, label, qty, unit_price, sort) values (p_order, 'Delivery', 1, fee_del, 999);
      sub := sub + fee_del;
    end if;
    if n > 1 then first_title := first_title || ' + ' || (n - 1) || ' more'; end if;
  end if;
  update public.orders set title = first_title, icon = first_icon, total = sub,
         gst_amount = round(sub * private.setting_num('pricing','gst_rate',0.08) / (1 + private.setting_num('pricing','gst_rate',0.08)), 2),
         starts_at = first_start, ends_at = last_end
   where id = p_order;
  return sub;
end $$;

drop function public.create_order(text, jsonb, text, text, text);
create function public.create_order(p_kind text, p_items jsonb, p_site text, p_when text default 'Today, ASAP', p_note text default '',
                                    p_site_lat double precision default null, p_site_lng double precision default null,
                                    p_payment text default 'cod')
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); me public.profiles; o public.orders;
begin
  if uid is null then raise exception 'Sign in to place an order' using errcode = '28000'; end if;
  if coalesce((select (value->>'accepting_orders')::boolean from public.app_settings where key='ordering'), true) = false then
    raise exception 'YD Works is not taking new orders right now. Please call the counter.';
  end if;
  if p_kind not in ('hire','materials') then raise exception 'Unknown order type'; end if;
  if p_payment not in ('cod','card','transfer') then raise exception 'Unknown payment method'; end if;
  select * into me from public.profiles where id = uid;
  insert into public.orders (customer_id, customer_name, customer_phone, kind, title, icon, site, scheduled_label, note, total, site_lat, site_lng, payment_method)
  values (uid, me.full_name, me.phone, p_kind, 'pending', 'cem', left(p_site,120), left(coalesce(p_when,'Today, ASAP'),60), left(coalesce(p_note,''),500), 0, p_site_lat, p_site_lng, p_payment)
  returning id into o.id;
  perform private.price_items(o.id, p_kind, p_items);
  select * into o from public.orders where id = o.id;
  return o;
end $$;

-- counter (phone/walk-in) orders: priced from the catalog, or from explicit lines (quotes)
create function public.admin_create_order(p_customer_name text, p_phone text, p_kind text, p_site text,
                                          p_items jsonb default null, p_lines jsonb default null, p_title text default null,
                                          p_when text default 'Today, ASAP', p_note text default '', p_payment text default 'cod')
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare o public.orders; cid uuid; l jsonb; n int := 0; sub numeric := 0;
begin
  perform private.require_admin();
  if coalesce(trim(p_customer_name),'') = '' then raise exception 'Add the customer name'; end if;
  select id into cid from public.profiles where regexp_replace(phone,'\D','','g') = regexp_replace(coalesce(p_phone,''),'\D','','g') and phone <> '' limit 1;
  insert into public.orders (customer_id, customer_name, customer_phone, kind, title, icon, site, scheduled_label, note, total, source, payment_method)
  values (cid, left(p_customer_name,80), left(coalesce(p_phone,''),20), p_kind, coalesce(p_title,'Counter order'), case when p_kind='hire' then 'exc20' else 'cem' end,
          left(p_site,120), left(coalesce(p_when,'Today, ASAP'),60), left(coalesce(p_note,''),500), 0, 'counter', p_payment)
  returning id into o.id;
  if p_items is not null then
    perform private.price_items(o.id, p_kind, p_items);
  elsif p_lines is not null then
    for l in select * from jsonb_array_elements(p_lines) loop
      insert into public.order_lines (order_id, label, qty, unit_price, sort, item_id)
      values (o.id, left(l->>'label',120), (l->>'qty')::numeric, (l->>'unit_price')::numeric, n, l->>'item_id');
      sub := sub + (l->>'qty')::numeric * (l->>'unit_price')::numeric; n := n + 1;
    end loop;
    update public.orders set total = sub,
           gst_amount = round(sub * private.setting_num('pricing','gst_rate',0.08) / (1 + private.setting_num('pricing','gst_rate',0.08)), 2),
           icon = coalesce((select item_id from public.order_lines where order_id = o.id and item_id is not null order by sort limit 1), icon)
     where id = o.id;
  else
    raise exception 'Add items or lines';
  end if;
  select * into o from public.orders where id = o.id;
  return o;
end $$;

-- ═════════════ order lifecycle side-effects ═════════════
create function private.order_effects() returns trigger
language plpgsql security definer set search_path = '' as $$
declare who text;
begin
  -- new job: tell online drivers
  if tg_op = 'INSERT' then
    return new;  -- title/total are filled in after insert; drivers are told on the first priced update below
  end if;
  if old.title = 'pending' and new.title <> 'pending' and new.status = 'requested' then
    insert into public.notifications (user_id, kind, title, body, order_id)
    select p.id, 'job', 'New job · ' || new.title, new.site || ' · MVR ' || to_char(new.total,'FM999,999,990'), new.id
      from public.profiles p where p.role = 'driver' and p.is_online;
  end if;
  if new.driver_id is distinct from old.driver_id and new.driver_id is not null and new.driver_id <> coalesce((select auth.uid()), '00000000-0000-0000-0000-000000000000'::uuid) then
    perform private.notify(new.driver_id, 'assigned', 'You have a new job', new.ref || ' · ' || new.title || ' · ' || new.site, new.id);
  end if;
  if new.status is distinct from old.status then
    who := coalesce(new.driver_name, 'Your driver');
    perform private.notify(new.customer_id, 'order',
      case new.status when 'accepted' then 'Driver assigned' when 'loading' then 'Loading at the yard' when 'enroute' then 'On the way'
                      when 'arrived' then 'Your driver has arrived' when 'completed' then 'Delivered' when 'cancelled' then 'Order cancelled' end,
      case new.status when 'accepted' then who || ' is heading to the YD yard for ' || new.ref
                      when 'loading' then new.title || ' is being loaded'
                      when 'enroute' then who || ' is driving to ' || new.site
                      when 'arrived' then who || ' is at ' || new.site
                      when 'completed' then new.ref || ' was delivered and signed for. Invoice ' || coalesce(new.invoice_no,'') || ' is ready.'
                      when 'cancelled' then new.ref || ' was cancelled' end,
      new.id) ;
    -- release bookings + restore stock when cancelled; confirm bookings when accepted
    if new.status = 'cancelled' then
      update public.machine_bookings set status = 'released' where order_id = new.id;
      update public.materials m set stock_qty = m.stock_qty + l.qty
        from public.order_lines l where l.order_id = new.id and l.item_id = m.id and m.stock_qty is not null;
    elsif new.status = 'accepted' then
      update public.machine_bookings set status = 'confirmed' where order_id = new.id and status = 'held';
    end if;
  end if;
  return new;
end $$;
create trigger orders_effects after insert or update on public.orders for each row execute function private.order_effects();

-- invoice number + GST + cash payment on completion
create function private.order_complete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.invoice_no is null then
      new.invoice_no := 'INV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 5, '0');
    end if;
    if new.payment_method = 'cod' and new.payment_status <> 'paid' then
      new.payment_status := 'paid';
      insert into public.payments (order_id, method, amount, status, note, created_by)
      values (new.id, 'cash', new.total, 'paid', 'Collected on delivery', new.driver_id);
    end if;
  end if;
  return new;
end $$;

-- ═════════════ payments ═════════════
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  method      text not null check (method in ('cash','card','transfer')),
  amount      numeric(12,2) not null check (amount >= 0),
  status      text not null default 'pending' check (status in ('pending','paid','failed','rejected')),
  provider_ref text,
  slip_path   text,
  note        text not null default '',
  created_by  uuid,
  verified_by uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
alter table public.payments enable row level security;
grant select on public.payments to authenticated;
create policy "see payments of visible orders" on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.customer_id = (select auth.uid()) or private.my_role() = 'admin')));
create trigger orders_complete before update on public.orders for each row execute function private.order_complete();

create function public.submit_transfer(p_order uuid, p_slip_path text, p_reference text default '')
returns public.payments language plpgsql security definer set search_path = '' as $$
declare o public.orders; pay public.payments;
begin
  select * into o from public.orders where id = p_order and customer_id = (select auth.uid());
  if not found then raise exception 'Order not found'; end if;
  if o.payment_status = 'paid' then raise exception 'This order is already paid'; end if;
  if p_slip_path not like o.id::text || '/%' then raise exception 'Invalid slip file'; end if;
  insert into public.payments (order_id, method, amount, status, slip_path, provider_ref, created_by)
  values (o.id, 'transfer', o.total, 'pending', p_slip_path, left(coalesce(p_reference,''),60), (select auth.uid())) returning * into pay;
  update public.orders set payment_method = 'transfer', payment_status = 'pending' where id = o.id;
  perform private.notify_admins('payment', 'Transfer slip to check', o.ref || ' · MVR ' || to_char(o.total,'FM999,999,990'), o.id);
  return pay;
end $$;

create function public.admin_review_payment(p_payment uuid, p_approve boolean, p_note text default '')
returns public.payments language plpgsql security definer set search_path = '' as $$
declare pay public.payments; o public.orders;
begin
  perform private.require_admin();
  update public.payments set status = case when p_approve then 'paid' else 'rejected' end, verified_by = (select auth.uid()),
         note = left(coalesce(p_note,''),200), updated_at = now()
   where id = p_payment and status = 'pending' returning * into pay;
  if not found then raise exception 'Payment already reviewed'; end if;
  update public.orders set payment_status = case when p_approve then 'paid' else 'unpaid' end where id = pay.order_id returning * into o;
  perform private.notify(o.customer_id, 'payment', case when p_approve then 'Payment received' else 'Payment not confirmed' end,
          case when p_approve then 'Thank you. ' || o.ref || ' is paid.' else 'We could not confirm the transfer for ' || o.ref || '. Please call the counter.' end, o.id);
  return pay;
end $$;

create function public.admin_mark_paid(p_order uuid, p_method text default 'cash') returns public.orders
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  perform private.require_admin();
  update public.orders set payment_status = 'paid' where id = p_order returning * into o;
  insert into public.payments (order_id, method, amount, status, note, created_by, verified_by)
  values (o.id, p_method, o.total, 'paid', 'Recorded at the counter', (select auth.uid()), (select auth.uid()));
  return o;
end $$;

-- ═════════════ house-building projects ═════════════
create table public.projects (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid references public.profiles(id) on delete set null,
  customer_name  text not null,
  customer_phone text not null default '',
  title          text not null,
  site           text not null default '',
  status         text not null default 'planning' check (status in ('planning','active','on_hold','handed_over')),
  start_date     date,
  target_date    date,
  contract_value numeric(14,2) not null default 0,
  cover_path     text,
  created_at     timestamptz not null default now()
);
create table public.project_milestones (
  id             bigint generated always as identity primary key,
  project_id     uuid not null references public.projects(id) on delete cascade,
  sort           int not null default 0,
  title          text not null,
  status         text not null default 'todo' check (status in ('todo','doing','done')),
  due_date       date,
  done_at        timestamptz,
  payment_amount numeric(14,2) not null default 0,
  payment_status text not null default 'none' check (payment_status in ('none','due','paid'))
);
create table public.project_updates (
  id         bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  note       text not null default '',
  photos     text[] not null default '{}',
  author_id  uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.projects enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_updates enable row level security;
grant select, insert, update, delete on public.projects, public.project_milestones, public.project_updates to authenticated;
create function private.owns_project(pid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.projects where id = pid and customer_id = (select auth.uid()))
$$;
create policy "customer reads own project" on public.projects for select to authenticated using (customer_id = (select auth.uid()) or private.my_role() = 'admin');
create policy "admins manage projects" on public.projects for all to authenticated using (private.my_role() = 'admin') with check (private.my_role() = 'admin');
create policy "customer reads milestones" on public.project_milestones for select to authenticated using (private.owns_project(project_id) or private.my_role() = 'admin');
create policy "admins manage milestones" on public.project_milestones for all to authenticated using (private.my_role() = 'admin') with check (private.my_role() = 'admin');
create policy "customer reads updates" on public.project_updates for select to authenticated using (private.owns_project(project_id) or private.my_role() = 'admin');
create policy "admins manage updates" on public.project_updates for all to authenticated using (private.my_role() = 'admin') with check (private.my_role() = 'admin');

create function private.project_effects() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p public.projects;
begin
  if tg_table_name = 'project_updates' then
    select * into p from public.projects where id = new.project_id;
    perform private.notify(p.customer_id, 'project', 'New update on ' || p.title,
            case when cardinality(new.photos) > 0 then cardinality(new.photos) || ' new photo(s). ' else '' end || left(new.note, 120), null, p.id);
  elsif new.status = 'done' and old.status is distinct from 'done' then
    select * into p from public.projects where id = new.project_id;
    new.done_at := now();
    perform private.notify(p.customer_id, 'project', 'Milestone complete: ' || new.title, p.title, null, p.id);
  end if;
  return new;
end $$;
create trigger project_updates_notify after insert on public.project_updates for each row execute function private.project_effects();
create trigger milestones_notify before update on public.project_milestones for each row execute function private.project_effects();

-- ═════════════ quotes ═════════════
create sequence public.quote_seq start 2101;
create table public.quotes (
  id            uuid primary key default gen_random_uuid(),
  ref           text not null unique default ('QT-' || nextval('public.quote_seq')),
  lead_id       uuid references public.quote_requests(id) on delete set null,
  customer_name text not null,
  phone         text not null default '',
  site          text not null default '',
  kind          text not null default 'materials' check (kind in ('hire','materials','project')),
  lines         jsonb not null default '[]',
  total         numeric(14,2) not null default 0,
  notes         text not null default '',
  valid_until   date default (current_date + 14),
  status        text not null default 'draft' check (status in ('draft','sent','accepted','declined','converted')),
  order_id      uuid references public.orders(id) on delete set null,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);
alter table public.quotes enable row level security;
grant usage on sequence public.quote_seq to authenticated;
grant select, insert, update, delete on public.quotes to authenticated;
create policy "admins manage quotes" on public.quotes for all to authenticated using (private.my_role() = 'admin') with check (private.my_role() = 'admin');

create function public.admin_convert_quote(p_quote uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare qt public.quotes; o public.orders;
begin
  perform private.require_admin();
  select * into qt from public.quotes where id = p_quote for update;
  if qt.status = 'converted' then raise exception 'Already converted'; end if;
  o := public.admin_create_order(qt.customer_name, qt.phone, case when qt.kind = 'hire' then 'hire' else 'materials' end, coalesce(nullif(qt.site,''),'To confirm'),
                                 null, qt.lines, 'Quote ' || qt.ref, 'To schedule', qt.notes);
  update public.quotes set status = 'converted', order_id = o.id where id = qt.id;
  if qt.lead_id is not null then update public.quote_requests set status = 'won' where id = qt.lead_id; end if;
  return o;
end $$;

-- ═════════════ fleet health ═════════════
create table public.fuel_logs (
  id         bigint generated always as identity primary key,
  machine_id text not null references public.machines(id) on delete cascade,
  driver_id  uuid references public.profiles(id) on delete set null,
  litres     numeric(8,2) not null check (litres > 0 and litres < 2000),
  cost       numeric(10,2) not null default 0,
  odometer   numeric(10,1),
  created_at timestamptz not null default now()
);
create table public.inspections (
  id         bigint generated always as identity primary key,
  machine_id text references public.machines(id) on delete set null,
  driver_id  uuid references public.profiles(id) on delete set null,
  items      jsonb not null default '{}',
  passed     boolean not null,
  defects    text not null default '',
  created_at timestamptz not null default now()
);
create table public.maintenance (
  id         bigint generated always as identity primary key,
  machine_id text not null references public.machines(id) on delete cascade,
  title      text not null,
  due_date   date,
  due_hours  numeric(10,1),
  status     text not null default 'due' check (status in ('due','done')),
  done_at    timestamptz,
  note       text not null default '',
  created_at timestamptz not null default now()
);
alter table public.fuel_logs enable row level security;
alter table public.inspections enable row level security;
alter table public.maintenance enable row level security;
grant select on public.fuel_logs, public.inspections to authenticated;
grant select, insert, update, delete on public.maintenance to authenticated;
create policy "own or admin fuel" on public.fuel_logs for select to authenticated using (driver_id = (select auth.uid()) or private.my_role() = 'admin');
create policy "own or admin inspections" on public.inspections for select to authenticated using (driver_id = (select auth.uid()) or private.my_role() = 'admin');
create policy "admins manage maintenance" on public.maintenance for all to authenticated using (private.my_role() = 'admin') with check (private.my_role() = 'admin');

create function private.my_machine() returns text language sql stable security definer set search_path = '' as $$
  select m.id from public.machines m join public.profiles p on p.unit_code = m.code where p.id = (select auth.uid())
$$;

create function public.driver_log_fuel(p_litres numeric, p_cost numeric default 0, p_odometer numeric default null)
returns public.fuel_logs language plpgsql security definer set search_path = '' as $$
declare f public.fuel_logs; mid text := private.my_machine();
begin
  if private.my_role() <> 'driver' then raise exception 'Driver accounts only'; end if;
  if mid is null then raise exception 'No vehicle is linked to your account. Ask the counter.'; end if;
  insert into public.fuel_logs (machine_id, driver_id, litres, cost, odometer) values (mid, (select auth.uid()), p_litres, coalesce(p_cost,0), p_odometer) returning * into f;
  return f;
end $$;

create function public.driver_submit_inspection(p_items jsonb, p_passed boolean, p_defects text default '')
returns public.inspections language plpgsql security definer set search_path = '' as $$
declare i public.inspections; me public.profiles;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if me.role <> 'driver' then raise exception 'Driver accounts only'; end if;
  insert into public.inspections (machine_id, driver_id, items, passed, defects) values (private.my_machine(), me.id, p_items, p_passed, left(coalesce(p_defects,''),1000)) returning * into i;
  if not p_passed or coalesce(trim(p_defects),'') <> '' then
    perform private.notify_admins('defect', 'Defect reported on ' || coalesce(me.unit_code,'a vehicle'), me.full_name || ': ' || left(coalesce(nullif(p_defects,''),'checklist item failed'),140));
  end if;
  return i;
end $$;

-- live driver location (whenever online), mirrored onto the active trip
create function public.report_location(p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.my_role() <> 'driver' then return; end if;
  update public.profiles set last_lat = p_lat, last_lng = p_lng, last_seen = now() where id = (select auth.uid());
  update public.orders set driver_lat = p_lat, driver_lng = p_lng
   where driver_id = (select auth.uid()) and status in ('accepted','loading','enroute','arrived');
end $$;

-- ═════════════ reports ═════════════
create function public.admin_report_monthly(p_months int default 12)
returns table (month date, hire numeric, materials numeric, orders bigint, gst numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
  select date_trunc('month', o.created_at)::date,
         coalesce(sum(o.total) filter (where o.kind = 'hire'),0), coalesce(sum(o.total) filter (where o.kind = 'materials'),0),
         count(*), coalesce(sum(o.gst_amount),0)
    from public.orders o
   where o.status <> 'cancelled' and o.created_at >= date_trunc('month', now()) - make_interval(months => p_months - 1)
   group by 1 order by 1;
end $$;

create function public.admin_report_utilisation(p_from timestamptz, p_to timestamptz)
returns table (machine_id text, name text, booked_hours numeric, window_hours numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
  select m.id, m.name,
         coalesce(round(sum(case when b.id is null then 0 else extract(epoch from (least(b.ends_at,p_to) - greatest(b.starts_at,p_from))) / 3600 end)::numeric,1),0),
         round((extract(epoch from (p_to - p_from)) / 3600)::numeric, 1)
    from public.machines m
    left join public.machine_bookings b on b.machine_id = m.id and b.status <> 'released' and b.starts_at < p_to and b.ends_at > p_from
   group by m.id, m.name, m.sort order by m.sort;
end $$;

create function public.admin_report_drivers(p_from timestamptz, p_to timestamptz)
returns table (driver_id uuid, name text, jobs bigint, earned numeric, avg_minutes numeric, rating numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
  select p.id, p.full_name, count(o.id), coalesce(sum(o.driver_earning),0),
         round(avg(extract(epoch from (o.completed_at - o.created_at)) / 60)::numeric, 0), p.rating
    from public.profiles p
    left join public.orders o on o.driver_id = p.id and o.status = 'completed' and o.completed_at between p_from and p_to
   where p.role = 'driver'
   group by p.id, p.full_name, p.rating order by 4 desc;
end $$;

-- ═════════════ settings defaults for new features ═════════════
update public.app_settings set value = value || '{"gst_rate":0.08,"gst_inclusive":true}'::jsonb where key = 'pricing';
insert into public.app_settings (key, value) values
  ('channels', '{"push":false,"whatsapp":false,"viber":false,"sms":false}'),
  ('payments', '{"card":false,"transfer":true,"bank_name":"Bank of Maldives","account_name":"YD Works","account_no":"7730000000000"}'),
  ('maps',     '{"style_url":"","yard_lat":4.2167,"yard_lng":73.5405}')
on conflict (key) do nothing;

-- ═════════════ storage: payment slips + project photos ═════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('slips',    'slips',    false, 8388608,  array['image/jpeg','image/png','image/webp','application/pdf']),
  ('projects', 'projects', false, 12582912, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "customer uploads own slip" on storage.objects for insert to authenticated
  with check (bucket_id = 'slips' and exists (select 1 from public.orders o where o.id::text = (storage.foldername(name))[1] and o.customer_id = (select auth.uid())));
create policy "customer and admin read slips" on storage.objects for select to authenticated
  using (bucket_id = 'slips' and exists (select 1 from public.orders o where o.id::text = (storage.foldername(name))[1] and (o.customer_id = (select auth.uid()) or private.my_role() = 'admin')));
create policy "admins upload project photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'projects' and private.my_role() = 'admin');
create policy "owner and admin read project photos" on storage.objects for select to authenticated
  using (bucket_id = 'projects' and (private.my_role() = 'admin' or private.owns_project(((storage.foldername(name))[1])::uuid)));

-- ═════════════ realtime + grants ═════════════
alter publication supabase_realtime add table public.notifications, public.projects, public.project_milestones, public.project_updates, public.payments, public.machine_bookings;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.machine_busy(timestamptz,timestamptz,text) to anon, authenticated;
grant execute on function
  public.create_order(text,jsonb,text,text,text,double precision,double precision,text),
  public.cancel_order(uuid), public.set_online(boolean), public.accept_order(uuid),
  public.advance_order(uuid,text,text,text,text), public.report_position(uuid,real,double precision,double precision),
  public.report_location(double precision,double precision),
  public.submit_transfer(uuid,text,text), public.driver_log_fuel(numeric,numeric,numeric), public.driver_submit_inspection(jsonb,boolean,text),
  public.admin_assign_order(uuid,uuid), public.admin_cancel_order(uuid), public.admin_set_role(text,text,text,text),
  public.admin_update_lead(uuid,text), public.admin_people(),
  public.admin_create_order(text,text,text,text,jsonb,jsonb,text,text,text,text), public.admin_convert_quote(uuid),
  public.admin_review_payment(uuid,boolean,text), public.admin_mark_paid(uuid,text),
  public.admin_report_monthly(int), public.admin_report_utilisation(timestamptz,timestamptz), public.admin_report_drivers(timestamptz,timestamptz)
  to authenticated;

-- Viber: the bot links a Viber user to a profile when they share their phone number with it
alter table public.profiles add column viber_user_id text unique;

-- admins can block machine time (maintenance, private jobs) and edit bookings
grant insert, update, delete on public.machine_bookings to authenticated;
create policy "admins manage bookings" on public.machine_bookings for all to authenticated
  using (private.my_role() = 'admin') with check (private.my_role() = 'admin');
