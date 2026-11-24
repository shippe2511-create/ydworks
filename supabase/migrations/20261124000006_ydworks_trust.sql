-- YD Works trust & operations pack:
--   account deletion, driver ratings, rescheduling, quote-form spam limits,
--   staff roles (manager/dispatcher/counter/accounts), activity log, client error & usage events.

-- ═════════════ staff roles ═════════════
-- 'admin' = Manager (everything). New staff roles see the console; what they can change depends on the role.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer','driver','admin','dispatcher','counter','accounts'));

create function private.real_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;
-- existing checks of my_role() = 'admin' now mean "any staff member" (read access to the console)
create or replace function private.my_role() returns text language sql stable security definer set search_path = '' as $$
  select case when role in ('admin','dispatcher','counter','accounts') then 'admin' else role end
    from public.profiles where id = (select auth.uid())
$$;
create function private.has_perm(p text) returns boolean language sql stable security definer set search_path = '' as $$
  select case private.real_role()
    when 'admin'      then true
    when 'dispatcher' then p in ('orders','assign','fleet')
    when 'counter'    then p in ('orders','sales','payments','projects')
    when 'accounts'   then p in ('payments','reports')
    else false end
$$;
create function private.require_perm(p text) returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_perm(p) then raise exception 'Your staff role can''t do this. Ask a manager.' using errcode = '42501'; end if;
end $$;
grant execute on function private.real_role(), private.has_perm(text), private.require_perm(text) to authenticated;

-- table writes need the matching permission (restrictive = ANDed with the existing admin policies)
create policy "perm catalog write"  on public.machines       as restrictive for update to authenticated using (private.has_perm('catalog'));
create policy "perm catalog insert" on public.machines       as restrictive for insert to authenticated with check (private.has_perm('catalog'));
create policy "perm catalog delete" on public.machines       as restrictive for delete to authenticated using (private.has_perm('catalog'));
create policy "perm catalog write"  on public.materials      as restrictive for update to authenticated using (private.has_perm('catalog'));
create policy "perm catalog insert" on public.materials      as restrictive for insert to authenticated with check (private.has_perm('catalog'));
create policy "perm catalog delete" on public.materials      as restrictive for delete to authenticated using (private.has_perm('catalog'));
create policy "perm settings write" on public.app_settings   as restrictive for update to authenticated using (private.has_perm('settings'));
create policy "perm settings insert" on public.app_settings  as restrictive for insert to authenticated with check (private.has_perm('settings'));
create policy "perm quotes"         on public.quotes         as restrictive for all to authenticated using (private.has_perm('sales')) with check (private.has_perm('sales'));
create policy "perm projects write" on public.projects       as restrictive for insert to authenticated with check (private.has_perm('projects'));
create policy "perm projects upd"   on public.projects       as restrictive for update to authenticated using (private.has_perm('projects'));
create policy "perm projects del"   on public.projects       as restrictive for delete to authenticated using (private.has_perm('projects'));
create policy "perm milestones ins" on public.project_milestones as restrictive for insert to authenticated with check (private.has_perm('projects'));
create policy "perm milestones upd" on public.project_milestones as restrictive for update to authenticated using (private.has_perm('projects'));
create policy "perm milestones del" on public.project_milestones as restrictive for delete to authenticated using (private.has_perm('projects'));
create policy "perm updates ins"    on public.project_updates as restrictive for insert to authenticated with check (private.has_perm('projects'));
create policy "perm maintenance"    on public.maintenance    as restrictive for all to authenticated using (private.has_perm('fleet')) with check (private.has_perm('fleet'));
create policy "perm bookings ins"   on public.machine_bookings as restrictive for insert to authenticated with check (private.has_perm('fleet'));
create policy "perm bookings upd"   on public.machine_bookings as restrictive for update to authenticated using (private.has_perm('fleet'));
create policy "perm leads upd"      on public.quote_requests as restrictive for update to authenticated using (private.has_perm('sales'));

-- ═════════════ delete my account ═════════════
-- Removes the person and their personal data. Orders/invoices are kept for tax records but anonymised.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); r text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select role into r from public.profiles where id = uid;
  if r = 'admin' and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'You are the only manager. Make someone else a manager first.';
  end if;
  if exists (select 1 from public.orders where (customer_id = uid or driver_id = uid) and status in ('accepted','loading','enroute','arrived')) then
    raise exception 'You have an order in progress. Delete your account after it is delivered.';
  end if;
  update public.orders set status = 'cancelled' where customer_id = uid and status = 'requested';
  update public.orders set customer_id = null, customer_name = 'Deleted customer', customer_phone = '', site_lat = null, site_lng = null where customer_id = uid;
  update public.orders set driver_id = null where driver_id = uid;
  update public.projects set customer_id = null, customer_phone = '' where customer_id = uid;
  delete from auth.users where id = uid;   -- cascades: profile, sites, device tokens, notifications
end $$;

-- ═════════════ driver ratings ═════════════
create table public.ratings (
  order_id    uuid primary key references public.orders(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  driver_id   uuid references public.profiles(id) on delete set null,
  stars       int not null check (stars between 1 and 5),
  comment     text not null default '' check (char_length(comment) <= 500),
  created_at  timestamptz not null default now()
);
alter table public.ratings enable row level security;
grant select on public.ratings to authenticated;
create policy "see own ratings" on public.ratings for select to authenticated
  using (customer_id = (select auth.uid()) or driver_id = (select auth.uid()) or private.my_role() = 'admin');

create function public.rate_order(p_order uuid, p_stars int, p_comment text default '') returns public.ratings
language plpgsql security definer set search_path = '' as $$
declare o public.orders; rt public.ratings;
begin
  select * into o from public.orders where id = p_order and customer_id = (select auth.uid());
  if not found then raise exception 'Order not found'; end if;
  if o.status <> 'completed' then raise exception 'You can rate the driver after delivery'; end if;
  if o.driver_id is null then raise exception 'No driver to rate'; end if;
  insert into public.ratings (order_id, customer_id, driver_id, stars, comment) values (o.id, o.customer_id, o.driver_id, p_stars, left(coalesce(p_comment,''),500))
  on conflict (order_id) do update set stars = excluded.stars, comment = excluded.comment, created_at = now()
  returning * into rt;
  update public.profiles set rating = (select round(avg(stars)::numeric, 1) from public.ratings where driver_id = o.driver_id) where id = o.driver_id;
  if p_stars <= 2 then perform private.notify_admins('rating', 'Low rating for ' || coalesce(o.driver_name,'a driver'), o.ref || ' · ' || p_stars || '★ ' || left(coalesce(p_comment,''),120), o.id); end if;
  return rt;
end $$;

-- ═════════════ reschedule a hire booking ═════════════
create function public.reschedule_order(p_order uuid, p_start timestamptz) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare o public.orders; dur interval; m text;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found'; end if;
  if not (o.customer_id = (select auth.uid()) or private.has_perm('orders')) then raise exception 'Order not found'; end if;
  if o.kind <> 'hire' or o.starts_at is null then raise exception 'Only equipment bookings can be rescheduled'; end if;
  if o.status not in ('requested','accepted') then raise exception 'This booking has started and can no longer be moved. Call the counter.'; end if;
  if p_start < now() then raise exception 'Pick a time in the future'; end if;
  dur := o.ends_at - o.starts_at;
  begin
    update public.machine_bookings set starts_at = p_start + (starts_at - o.starts_at), ends_at = p_start + (ends_at - o.starts_at)
     where order_id = o.id and status <> 'released';
  exception when exclusion_violation then
    select name into m from public.machines where id = (select machine_id from public.machine_bookings where order_id = o.id limit 1);
    raise exception '% is already booked then. Pick another time.', coalesce(m,'The machine');
  end;
  update public.orders set starts_at = p_start, ends_at = p_start + dur,
         scheduled_label = to_char(p_start at time zone 'Indian/Maldives', 'Dy DD Mon, HH24:MI')
   where id = o.id returning * into o;
  perform private.notify(o.driver_id, 'assigned', 'Booking moved', o.ref || ' now starts ' || o.scheduled_label, o.id);
  perform private.notify_admins('order', 'Booking rescheduled', o.ref || ' · ' || o.title || ' → ' || o.scheduled_label, o.id);
  return o;
end $$;

-- ═════════════ quote form spam limits ═════════════
create function private.quote_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.quote_requests where regexp_replace(phone,'\D','','g') = regexp_replace(new.phone,'\D','','g') and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'You''ve already sent a few requests. The counter will call you soon, or call 992 0202.';
  end if;
  if (select count(*) from public.quote_requests where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Too many requests right now. Please call 992 0202.';
  end if;
  if new.details ~* '(https?://|www\.)' and (select count(*) from regexp_matches(new.details, 'https?://', 'g')) > 2 then
    raise exception 'Please remove the links from your message.';
  end if;
  return new;
end $$;
create trigger quote_requests_limits before insert on public.quote_requests for each row execute function private.quote_limits();

-- ═════════════ activity log ═════════════
create table public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid,
  actor_name text not null default '',
  actor_role text not null default '',
  action     text not null,
  entity     text not null,
  entity_id  text not null default '',
  summary    text not null default '',
  changes    jsonb not null default '{}'
);
create index audit_log_at_idx on public.audit_log (at desc);
alter table public.audit_log enable row level security;
grant select on public.audit_log to authenticated;
create policy "managers read activity" on public.audit_log for select to authenticated using (private.has_perm('settings') or private.has_perm('reports'));

create function private.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; o jsonb; n jsonb; diff jsonb := '{}'; k text; ent_id text; summ text := '';
begin
  select * into me from public.profiles where id = (select auth.uid());
  -- only staff actions are logged (customers/drivers already leave a trail in orders and order_events)
  if me.id is null or me.role not in ('admin','dispatcher','counter','accounts') then return coalesce(new, old); end if;
  o := case when tg_op <> 'INSERT' then to_jsonb(old) else '{}' end;
  n := case when tg_op <> 'DELETE' then to_jsonb(new) else '{}' end;
  for k in select jsonb_object_keys(n) union select jsonb_object_keys(o) loop
    if k not in ('updated_at','created_at') and (o -> k) is distinct from (n -> k) then
      diff := diff || jsonb_build_object(k, jsonb_build_object('from', o -> k, 'to', n -> k));
    end if;
  end loop;
  if tg_op = 'UPDATE' and diff = '{}' then return new; end if;
  ent_id := coalesce(n->>'ref', n->>'id', n->>'key', o->>'ref', o->>'id', o->>'key', '');
  summ := coalesce(n->>'name', n->>'title', n->>'customer_name', n->>'full_name', o->>'name', o->>'title', '');
  insert into public.audit_log (actor_id, actor_name, actor_role, action, entity, entity_id, summary, changes)
  values (me.id, me.full_name, me.role, lower(tg_op), tg_table_name, ent_id, summ, diff);
  return coalesce(new, old);
end $$;
create trigger audit_machines   after insert or update or delete on public.machines       for each row execute function private.audit();
create trigger audit_materials  after insert or update or delete on public.materials      for each row execute function private.audit();
create trigger audit_settings   after insert or update on public.app_settings              for each row execute function private.audit();
create trigger audit_orders     after update on public.orders                              for each row execute function private.audit();
create trigger audit_payments   after update on public.payments                            for each row execute function private.audit();
create trigger audit_profiles   after update of role, unit_code, unit_name on public.profiles for each row execute function private.audit();
create trigger audit_quotes     after insert or update or delete on public.quotes          for each row execute function private.audit();
create trigger audit_projects   after insert or update or delete on public.projects        for each row execute function private.audit();
create trigger audit_bookings   after insert or update or delete on public.machine_bookings for each row execute function private.audit();

-- ═════════════ client errors & usage events ═════════════
create table public.client_events (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  kind       text not null check (kind in ('error','event')),
  surface    text not null check (surface in ('website','customer','driver','console')),
  name       text not null check (char_length(name) <= 80),
  message    text not null default '' check (char_length(message) <= 1000),
  detail     jsonb not null default '{}',
  url        text not null default '' check (char_length(url) <= 300),
  session_id text not null default '' check (char_length(session_id) <= 40),
  user_id    uuid default auth.uid(),
  app_version text not null default ''
);
create index client_events_at_idx on public.client_events (at desc);
alter table public.client_events enable row level security;
grant insert (kind, surface, name, message, detail, url, session_id, app_version) on public.client_events to anon, authenticated;
grant select on public.client_events to authenticated;
create policy "anyone can report" on public.client_events for insert to anon, authenticated
  with check (pg_column_size(detail) < 4000 and (user_id is null or user_id = (select auth.uid())));
create policy "staff read events" on public.client_events for select to authenticated using (private.has_perm('reports') or private.has_perm('settings'));
create function private.event_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.session_id <> '' and (select count(*) from public.client_events where session_id = new.session_id and at > now() - interval '1 minute') >= 30 then
    return null;   -- silently drop floods from one session
  end if;
  return new;
end $$;
create trigger client_events_limits before insert on public.client_events for each row execute function private.event_limits();

-- insights for the console
create function public.admin_insights(p_days int default 30)
returns table (metric text, label text, value bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (private.has_perm('reports') or private.has_perm('settings')) then raise exception 'Your staff role can''t do this. Ask a manager.'; end if;
  return query
    select 'search'::text, lower(e.detail->>'q'), count(*) from public.client_events e
     where e.kind = 'event' and e.name = 'search' and e.at > now() - make_interval(days => p_days) and coalesce(e.detail->>'q','') <> ''
     group by 2 order by 3 desc limit 15;
  return query
    select 'event'::text, e.surface || ' · ' || e.name, count(*) from public.client_events e
     where e.kind = 'event' and e.at > now() - make_interval(days => p_days) group by 2 order by 3 desc limit 25;
  return query
    select 'error'::text, e.surface || ' · ' || left(e.message, 120), count(*) from public.client_events e
     where e.kind = 'error' and e.at > now() - make_interval(days => p_days) group by 2 order by 3 desc limit 25;
end $$;

-- ═════════════ grants ═════════════
revoke execute on all functions in schema public from public, anon;
grant execute on function public.machine_busy(timestamptz,timestamptz,text) to anon, authenticated;
grant execute on function public.delete_my_account(), public.rate_order(uuid,int,text), public.reschedule_order(uuid,timestamptz),
  public.admin_insights(int) to authenticated;
alter publication supabase_realtime add table public.ratings, public.audit_log;

-- ═════════════ permission checks on staff actions (generated from the functions above) ═════════════
CREATE OR REPLACE FUNCTION public.admin_assign_order(p_order uuid, p_driver uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.profiles; o public.orders;
begin
  perform private.require_perm('assign');
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
end $function$;
CREATE OR REPLACE FUNCTION public.admin_cancel_order(p_order uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders;
begin
  perform private.require_perm('orders');
  update public.orders set status = 'cancelled' where id = p_order and status not in ('completed','cancelled') returning * into o;
  if not found then raise exception 'This order is already finished'; end if;
  return o;
end $function$;
CREATE OR REPLACE FUNCTION public.admin_convert_quote(p_quote uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare qt public.quotes; o public.orders;
begin
  perform private.require_perm('sales');
  select * into qt from public.quotes where id = p_quote for update;
  if qt.status = 'converted' then raise exception 'Already converted'; end if;
  o := public.admin_create_order(qt.customer_name, qt.phone, case when qt.kind = 'hire' then 'hire' else 'materials' end, coalesce(nullif(qt.site,''),'To confirm'),
                                 null, qt.lines, 'Quote ' || qt.ref, 'To schedule', qt.notes);
  update public.quotes set status = 'converted', order_id = o.id where id = qt.id;
  if qt.lead_id is not null then update public.quote_requests set status = 'won' where id = qt.lead_id; end if;
  return o;
end $function$;
CREATE OR REPLACE FUNCTION public.admin_create_order(p_customer_name text, p_phone text, p_kind text, p_site text, p_items jsonb DEFAULT NULL::jsonb, p_lines jsonb DEFAULT NULL::jsonb, p_title text DEFAULT NULL::text, p_when text DEFAULT 'Today, ASAP'::text, p_note text DEFAULT ''::text, p_payment text DEFAULT 'cod'::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders; cid uuid; l jsonb; n int := 0; sub numeric := 0;
begin
  perform private.require_perm('orders');
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
end $function$;
CREATE OR REPLACE FUNCTION public.admin_mark_paid(p_order uuid, p_method text DEFAULT 'cash'::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare o public.orders;
begin
  perform private.require_perm('payments');
  update public.orders set payment_status = 'paid' where id = p_order returning * into o;
  insert into public.payments (order_id, method, amount, status, note, created_by, verified_by)
  values (o.id, p_method, o.total, 'paid', 'Recorded at the counter', (select auth.uid()), (select auth.uid()));
  return o;
end $function$;
CREATE OR REPLACE FUNCTION public.admin_report_drivers(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS TABLE(driver_id uuid, name text, jobs bigint, earned numeric, avg_minutes numeric, rating numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.require_perm('reports');
  return query
  select p.id, p.full_name, count(o.id), coalesce(sum(o.driver_earning),0),
         round(avg(extract(epoch from (o.completed_at - o.created_at)) / 60)::numeric, 0), p.rating
    from public.profiles p
    left join public.orders o on o.driver_id = p.id and o.status = 'completed' and o.completed_at between p_from and p_to
   where p.role = 'driver'
   group by p.id, p.full_name, p.rating order by 4 desc;
end $function$;
CREATE OR REPLACE FUNCTION public.admin_report_monthly(p_months integer DEFAULT 12)
 RETURNS TABLE(month date, hire numeric, materials numeric, orders bigint, gst numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.require_perm('reports');
  return query
  select date_trunc('month', o.created_at)::date,
         coalesce(sum(o.total) filter (where o.kind = 'hire'),0), coalesce(sum(o.total) filter (where o.kind = 'materials'),0),
         count(*), coalesce(sum(o.gst_amount),0)
    from public.orders o
   where o.status <> 'cancelled' and o.created_at >= date_trunc('month', now()) - make_interval(months => p_months - 1)
   group by 1 order by 1;
end $function$;
CREATE OR REPLACE FUNCTION public.admin_report_utilisation(p_from timestamp with time zone, p_to timestamp with time zone)
 RETURNS TABLE(machine_id text, name text, booked_hours numeric, window_hours numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.require_perm('reports');
  return query
  select m.id, m.name,
         coalesce(round(sum(case when b.id is null then 0 else extract(epoch from (least(b.ends_at,p_to) - greatest(b.starts_at,p_from))) / 3600 end)::numeric,1),0),
         round((extract(epoch from (p_to - p_from)) / 3600)::numeric, 1)
    from public.machines m
    left join public.machine_bookings b on b.machine_id = m.id and b.status <> 'released' and b.starts_at < p_to and b.ends_at > p_from
   group by m.id, m.name, m.sort order by m.sort;
end $function$;
CREATE OR REPLACE FUNCTION public.admin_review_payment(p_payment uuid, p_approve boolean, p_note text DEFAULT ''::text)
 RETURNS payments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare pay public.payments; o public.orders;
begin
  perform private.require_perm('payments');
  update public.payments set status = case when p_approve then 'paid' else 'rejected' end, verified_by = (select auth.uid()),
         note = left(coalesce(p_note,''),200), updated_at = now()
   where id = p_payment and status = 'pending' returning * into pay;
  if not found then raise exception 'Payment already reviewed'; end if;
  update public.orders set payment_status = case when p_approve then 'paid' else 'unpaid' end where id = pay.order_id returning * into o;
  perform private.notify(o.customer_id, 'payment', case when p_approve then 'Payment received' else 'Payment not confirmed' end,
          case when p_approve then 'Thank you. ' || o.ref || ' is paid.' else 'We could not confirm the transfer for ' || o.ref || '. Please call the counter.' end, o.id);
  return pay;
end $function$;
CREATE OR REPLACE FUNCTION public.admin_set_role(p_email text, p_role text, p_unit_code text DEFAULT NULL::text, p_unit_name text DEFAULT NULL::text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid; p public.profiles;
begin
  perform private.require_perm('team');
  if p_role not in ('customer','driver','admin','dispatcher','counter','accounts') then raise exception 'Unknown role'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'No account with that email. Ask them to sign up in the YD Works app first.'; end if;
  if uid = (select auth.uid()) and p_role <> 'admin' then raise exception 'You cannot remove your own admin access'; end if;
  update public.profiles set role = p_role,
         unit_code = case when p_role = 'driver' then nullif(trim(p_unit_code),'') else null end,
         unit_name = case when p_role = 'driver' then nullif(trim(p_unit_name),'') else null end,
         is_online = case when p_role = 'driver' then is_online else false end
   where id = uid returning * into p;
  return p;
end $function$;
CREATE OR REPLACE FUNCTION public.admin_update_lead(p_lead uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform private.require_perm('sales');
  update public.quote_requests set status = p_status where id = p_lead;
end $function$;

-- ═════════════ new website leads notify staff; quotes update live in the console ═════════════
create function private.lead_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, kind, title, body)
  select id, 'lead', 'New quote request from ' || new.name, array_to_string(new.needs, ', ') || ' · ' || new.site || ' · ' || new.phone
    from public.profiles where role in ('admin','counter');
  return new;
end $$;
create trigger quote_requests_notify after insert on public.quote_requests for each row execute function private.lead_notify();
alter publication supabase_realtime add table public.quotes;

-- ═════════════ driver fixes ═════════════
-- a driver whose last delivery is waiting to upload (offline proof of delivery, still "arrived") may take the next job
create or replace function public.accept_order(p_order uuid) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare me public.profiles; o public.orders;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if me.role is distinct from 'driver' then raise exception 'Driver accounts only'; end if;
  if exists (select 1 from public.orders where driver_id = me.id and status in ('accepted','loading','enroute')) then
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

-- defect photos reach the workshop
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('defects', 'defects', false, 8388608, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "driver uploads own defect photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'defects' and (storage.foldername(name))[1] = (select auth.uid())::text and private.real_role() = 'driver');
create policy "driver and staff read defect photos" on storage.objects for select to authenticated
  using (bucket_id = 'defects' and ((storage.foldername(name))[1] = (select auth.uid())::text or private.my_role() = 'admin'));
alter table public.inspections add column photo_path text;
drop function public.driver_submit_inspection(jsonb, boolean, text);
create function public.driver_submit_inspection(p_items jsonb, p_passed boolean, p_defects text default '', p_photo text default null)
returns public.inspections language plpgsql security definer set search_path = '' as $$
declare i public.inspections; me public.profiles;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if me.role <> 'driver' then raise exception 'Driver accounts only'; end if;
  if p_photo is not null and p_photo not like me.id::text || '/%' then raise exception 'Invalid photo'; end if;
  insert into public.inspections (machine_id, driver_id, items, passed, defects, photo_path)
  values (private.my_machine(), me.id, p_items, p_passed, left(coalesce(p_defects,''),1000), p_photo) returning * into i;
  if not p_passed or coalesce(trim(p_defects),'') <> '' then
    perform private.notify_admins('defect', 'Defect reported on ' || coalesce(me.unit_code,'a vehicle'), me.full_name || ': ' || left(coalesce(nullif(p_defects,''),'checklist item failed'),140));
  end if;
  return i;
end $$;
revoke execute on function public.driver_submit_inspection(jsonb,boolean,text,text) from public, anon;
grant execute on function public.driver_submit_inspection(jsonb,boolean,text,text), public.accept_order(uuid) to authenticated;

-- ═════════════ add machines & materials from the console, each with its own photo ═════════════
alter table public.machines  add column image_url text;
alter table public.materials add column image_url text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 5242880, array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy "catalog photos are public" on storage.objects for select to anon, authenticated using (bucket_id = 'catalog');
create policy "managers upload catalog photos" on storage.objects for insert to authenticated with check (bucket_id = 'catalog' and private.has_perm('catalog'));
create policy "managers replace catalog photos" on storage.objects for update to authenticated using (bucket_id = 'catalog' and private.has_perm('catalog'));
