\set ON_ERROR_STOP 0
\pset footer off
-- users
insert into auth.users (id,email,phone,raw_user_meta_data) values
 ('11111111-1111-1111-1111-111111111111','aishath@mail.mv',null,'{"full_name":"Aishath Ibrahim","phone":"7771234"}'),
 ('22222222-2222-2222-2222-222222222222','ibrahim@yd-mv.com','9607001122','{"full_name":"Ibrahim Shareef"}'),
 ('33333333-3333-3333-3333-333333333333','boss@yd-mv.com',null,'{"full_name":"Counter Admin"}'),
 ('44444444-4444-4444-4444-444444444444','other@mail.mv',null,'{"full_name":"Other Customer"}');
update public.profiles set role='driver', unit_code='TP-04', unit_name='Tipper 10m³', is_online=true where id='22222222-2222-2222-2222-222222222222';
update public.profiles set role='admin' where id='33333333-3333-3333-3333-333333333333';
update public.materials set stock_qty=50, low_stock_at=20 where id='cem';
select 'phone copied from auth' t, phone from public.profiles where id='22222222-2222-2222-2222-222222222222';

-- ── customer orders ──
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'hire order' t, ref, title, total, gst_amount, starts_at is not null as has_window from public.create_order('hire','[{"machine_id":"exc20","mode":"hr","qty":4,"start":"2030-01-10T08:00:00Z"}]','Plot 10234','Mon 08:00','',4.21,73.54,'cod');
select 'overlap must fail' t; select public.create_order('hire','[{"machine_id":"exc20","mode":"hr","qty":2,"start":"2030-01-10T10:00:00Z"}]','Plot 1');
select 'adjacent ok' t, title from public.create_order('hire','[{"machine_id":"exc20","mode":"hr","qty":2,"start":"2030-01-10T12:00:00Z"}]','Plot 1');
select 'materials order' t, ref, title, total from public.create_order('materials','[{"material_id":"cem","qty":40},{"material_id":"sand","qty":2}]','Plot 10234');
select 'stock short must fail' t; select public.create_order('materials','[{"material_id":"cem","qty":20}]','Plot 10234');
select 'busy windows (public)' t, count(*) from public.machine_busy('2030-01-01','2030-02-01','exc20');
reset role;
select 'cement stock after order' t, stock_qty from public.materials where id='cem';

-- ── driver: notified, accepts, completes ──
select 'driver notified of new jobs' t, count(*) from public.notifications where user_id='22222222-2222-2222-2222-222222222222' and kind='job';
set role authenticated; select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',false);
select 'driver sees open' t, count(*) from public.orders where status='requested';
select 'accept' t, status, driver_name from public.accept_order((select id from public.orders where title like 'Portland%'));
select public.advance_order((select id from public.orders where title like 'Portland%'),'loading');
select public.advance_order((select id from public.orders where title like 'Portland%'),'enroute');
select public.report_location(4.215, 73.541);
select public.advance_order((select id from public.orders where title like 'Portland%'),'arrived');
select 'complete' t, status, invoice_no, payment_status, driver_earning from public.advance_order((select id from public.orders where title like 'Portland%'),'completed','Ali',null,(select id::text from public.orders where title like 'Portland%')||'/sig.png');
select 'fuel' t, litres, machine_id from public.driver_log_fuel(60, 1100, 84215);
select 'inspection w/ defect' t, passed from public.driver_submit_inspection('{"tyres":true,"brakes":false}', false, 'Brake pressure slow to build');
reset role;
select 'cash payment recorded' t, method, status, amount from public.payments;
select 'customer notifications' t, title from public.notifications where user_id='11111111-1111-1111-1111-111111111111' order by id;
select 'admin got defect alert' t, title from public.notifications where user_id='33333333-3333-3333-3333-333333333333';
select 'driver live location' t, last_lat, last_lng from public.profiles where id='22222222-2222-2222-2222-222222222222';

-- ── privacy ──
set role authenticated; select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444',false);
select 'other customer sees orders (want 0)' t, count(*) from public.orders;
select 'other customer cannot cancel' t; select public.cancel_order((select id from public.orders limit 1));
select 'other sees notifications (want 0)' t, count(*) from public.notifications;
reset role;

-- ── cancel restores stock + releases booking ──
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'cancel hire' t, status from public.cancel_order((select id from public.orders where title like 'Excavator%' order by created_at limit 1));
select 'busy after cancel' t, count(*) from public.machine_busy('2030-01-01','2030-02-01','exc20');
-- transfer slip flow on a new order
select 'new order' t, ref from public.create_order('materials','[{"material_id":"blk","qty":300}]','Villimalé',p_payment=>'transfer');
select 'submit slip' t, status from public.submit_transfer((select id from public.orders where title like 'Cement block%'), (select id::text from public.orders where title like 'Cement block%')||'/slip.jpg','BML ref 123');
reset role;

-- ── admin ──
set role authenticated; select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
select 'review slip' t, status from public.admin_review_payment((select id from public.payments where method='transfer'), true);
select 'counter order' t, ref, source, total from public.admin_create_order('Walk-in Hassan','7712345','materials','Hulhumalé Ph1','[{"material_id":"sand","qty":3}]');
insert into public.quotes (customer_name, phone, site, lines, total) values ('Raeef Construction','7745510','Thilafushi','[{"label":"Excavator 20T, days","qty":10,"unit_price":5800},{"label":"Tipper 10m³, days","qty":30,"unit_price":3600}]', 166000);
select 'convert quote' t, ref, source, total from public.admin_convert_quote((select id from public.quotes limit 1));
insert into public.projects (customer_id, customer_name, title, site, status, contract_value) values ('11111111-1111-1111-1111-111111111111','Aishath Ibrahim','G+2 house, Plot 10234','Hulhumalé Ph2','active',2400000);
insert into public.project_milestones (project_id, sort, title, status, payment_amount, payment_status) select id,1,'Foundation','doing',480000,'due' from public.projects;
update public.project_milestones set status='done';
insert into public.project_updates (project_id, note, photos) select id,'Ground beams poured', array[id::text||'/1.jpg', id::text||'/2.jpg'] from public.projects;
select 'monthly report' t, * from public.admin_report_monthly(3);
select 'utilisation' t, machine_id, booked_hours from public.admin_report_utilisation('2030-01-01','2030-02-01') where booked_hours>0;
select 'drivers report' t, name, jobs, earned from public.admin_report_drivers(now()-interval '1 day', now()+interval '1 day');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'customer sees project' t, title, (select count(*) from public.project_milestones) ms, (select count(*) from public.project_updates) ups from public.projects;
select 'project notifications' t, title from public.notifications where kind in ('project','payment') order by id;
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','44444444-4444-4444-4444-444444444444',false);
select 'other sees project (want 0)' t, count(*) from public.projects;
select 'non-admin report blocked' t; select * from public.admin_report_monthly(1);
reset role;
