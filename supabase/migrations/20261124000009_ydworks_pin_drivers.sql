-- YD Works 009: phone + PIN drivers (accounts made by the staff-accounts Edge Function).
-- Their private login address (driver-<digits>@login.yd-mv.com) is hidden from the console; a new `login` column says
-- how each person signs in: 'pin' (phone + PIN) or 'email'.
drop function public.admin_people();
create function public.admin_people() returns table (
  id uuid, email text, role text, full_name text, phone text, unit_code text, unit_name text,
  is_online boolean, rating numeric, created_at timestamptz, orders bigint, spend numeric, jobs bigint, earned numeric, login text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
  select p.id,
         case when u.email like '%@login.yd-mv.com' then '' else u.email::text end,
         p.role, p.full_name, p.phone, p.unit_code, p.unit_name, p.is_online, p.rating, p.created_at,
         (select count(*) from public.orders o where o.customer_id = p.id),
         (select coalesce(sum(o.total),0) from public.orders o where o.customer_id = p.id and o.status = 'completed'),
         (select count(*) from public.orders o where o.driver_id = p.id and o.status = 'completed'),
         (select coalesce(sum(o.driver_earning),0) from public.orders o where o.driver_id = p.id and o.status = 'completed'),
         case when u.email like '%@login.yd-mv.com' then 'pin' else 'email' end
    from public.profiles p join auth.users u on u.id = p.id
   order by p.created_at desc;
end $$;
revoke execute on function public.admin_people() from public, anon;
grant execute on function public.admin_people() to authenticated;
