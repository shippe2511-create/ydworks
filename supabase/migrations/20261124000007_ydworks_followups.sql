-- YD Works 007: follow-ups from the second round of app work
--  * drivers get a notification when a customer rates them
--  * rating summary (average, count, per-star) for the driver app and console
--  * one-step, atomic vehicle assignment / swap for the console
--  * dispatchers (fleet permission) may log machine hours without the catalog permission

-- ═════════════ rating notification to the driver ═════════════
create function private.rating_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare who text; r text;
begin
  select split_part(coalesce(nullif(full_name,''),'A customer'),' ',1) into who from public.profiles where id = new.customer_id;
  select ref into r from public.orders where id = new.order_id;
  perform private.notify(new.driver_id, 'rating', coalesce(who,'A customer') || ' rated you ' || new.stars || '★',
    coalesce(r,'') || case when new.comment <> '' then ' · ' || left(new.comment,140) else '' end, new.order_id);
  return new;
end $$;
create trigger ratings_notify_driver after insert or update of stars, comment on public.ratings
  for each row execute function private.rating_notify();

-- ═════════════ rating summary ═════════════
create function public.driver_rating_summary(p_driver uuid default null)
returns table (avg_stars numeric, total bigint, s1 bigint, s2 bigint, s3 bigint, s4 bigint, s5 bigint)
language plpgsql stable security definer set search_path = '' as $$
declare d uuid := coalesce(p_driver, (select auth.uid()));
begin
  if d <> (select auth.uid()) and not (private.has_perm('team') or private.has_perm('assign')) then
    raise exception 'Not allowed';
  end if;
  return query select round(avg(r.stars)::numeric,1), count(*),
    count(*) filter (where r.stars=1), count(*) filter (where r.stars=2), count(*) filter (where r.stars=3),
    count(*) filter (where r.stars=4), count(*) filter (where r.stars=5)
    from public.ratings r where r.driver_id = d;
end $$;

-- ═════════════ assign / swap a driver's vehicle in one step ═════════════
-- p_machine_code null or '' = take the vehicle away. If another driver has that vehicle, the two drivers swap
-- (they get this driver's previous vehicle, or none).
create function public.admin_set_vehicle(p_driver uuid, p_machine_code text)
returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare m public.machines; p public.profiles; old public.profiles; v_code text := nullif(trim(p_machine_code),'');
begin
  perform private.require_perm('team');
  if not exists (select 1 from public.profiles where id = p_driver and role = 'driver') then
    raise exception 'That person is not a driver';
  end if;
  select * into old from public.profiles where id = p_driver for update;
  if v_code is not null then
    select * into m from public.machines where machines.code = v_code limit 1;
    if not found then raise exception 'No vehicle with code %', v_code; end if;
    update public.profiles set unit_code = old.unit_code, unit_name = old.unit_name where unit_code = v_code and id <> p_driver and role = 'driver';
  end if;
  update public.profiles set unit_code = v_code, unit_name = case when v_code is null then null else m.name end
   where id = p_driver returning * into p;
  return p;
end $$;

-- ═════════════ dispatchers can log machine hours ═════════════
create function public.admin_log_hours(p_machine text, p_hours numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (private.has_perm('fleet') or private.has_perm('catalog')) then
    raise exception 'Your staff role can''t do this. Ask a manager.';
  end if;
  if p_hours is null or p_hours < 0 then raise exception 'Enter the hours shown on the meter'; end if;
  update public.machines set hours_meter = p_hours where id = p_machine;
  if not found then raise exception 'Machine not found'; end if;
end $$;

revoke execute on function public.driver_rating_summary(uuid), public.admin_set_vehicle(uuid,text), public.admin_log_hours(text,numeric) from public, anon;
grant execute on function public.driver_rating_summary(uuid), public.admin_set_vehicle(uuid,text), public.admin_log_hours(text,numeric) to authenticated;
