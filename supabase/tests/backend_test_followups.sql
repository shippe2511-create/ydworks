\pset footer off
-- run after backend_test.sql and backend_test_trust.sql
set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'driver got rating alert' t, count(*) > 0 from public.notifications where kind='rating' and user_id='22222222-2222-2222-2222-222222222222';
select 'driver summary' t, * from public.driver_rating_summary();
select 'driver cannot read other summary' t; select * from public.driver_rating_summary('11111111-1111-1111-1111-111111111111');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
select 'manager sets vehicle' t, unit_code, unit_name from public.admin_set_vehicle('22222222-2222-2222-2222-222222222222', (select code from public.machines where id='crane'));
select 'unknown vehicle blocked' t; select public.admin_set_vehicle('22222222-2222-2222-2222-222222222222','ZZ-99');
select 'remove vehicle' t, unit_code is null from public.admin_set_vehicle('22222222-2222-2222-2222-222222222222', null);
reset role;
update public.profiles set role='dispatcher' where id='55555555-5555-5555-5555-555555555555'; -- the trust suite moved them to counter
set role authenticated; select set_config('request.jwt.claim.sub','55555555-5555-5555-5555-555555555555',false);
select 'dispatcher logs hours' t; select public.admin_log_hours('exc20', 1234.5);
select 'dispatcher cannot set vehicle' t; select public.admin_set_vehicle('22222222-2222-2222-2222-222222222222','CR-01');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','66666666-6666-6666-6666-666666666666',false);
select 'accounts cannot log hours' t; select public.admin_log_hours('exc20', 1);
reset role;
select 'hours saved' t, hours_meter from public.machines where id='exc20';
