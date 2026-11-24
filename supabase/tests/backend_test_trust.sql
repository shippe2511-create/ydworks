\pset footer off
insert into auth.users (id,email,raw_user_meta_data) values
 ('55555555-5555-5555-5555-555555555555','disp@yd-mv.com','{"full_name":"Dispatch Dhon"}'),
 ('66666666-6666-6666-6666-666666666666','acc@yd-mv.com','{"full_name":"Accounts Aminath"}');
update public.profiles set role='dispatcher' where id='55555555-5555-5555-5555-555555555555';
update public.profiles set role='accounts' where id='66666666-6666-6666-6666-666666666666';
-- customer rates the completed delivery
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'rate 5' t, stars from public.rate_order((select id from public.orders where status='completed' and kind='materials' limit 1),5,'Fast and careful');
select 'rate before delivery blocked' t; select public.rate_order((select id from public.orders where status='requested' limit 1),4);
select 'reschedule own hire' t, scheduled_label from public.reschedule_order((select id from public.orders where kind='hire' and status='requested' limit 1),'2030-02-01T03:00:00Z');
select 'reschedule into busy blocked' t;
select public.create_order('hire','[{"machine_id":"exc20","mode":"hr","qty":3,"start":"2030-02-05T03:00:00Z"}]','Plot 2');
select public.reschedule_order((select id from public.orders where kind='hire' and status='requested' order by created_at limit 1),'2030-02-05T04:00:00Z');
reset role;
select 'driver rating now' t, rating from public.profiles where id='22222222-2222-2222-2222-222222222222';
-- spam: 4th request from same phone in an hour
set role anon;
insert into public.quote_requests(name,phone,needs,site) values ('Spam','7000001','{Logistics}','Malé');
insert into public.quote_requests(name,phone,needs,site) values ('Spam','7000001','{Logistics}','Malé');
insert into public.quote_requests(name,phone,needs,site) values ('Spam','7000001','{Logistics}','Malé');
select 'spam 4th blocked' t; insert into public.quote_requests(name,phone,needs,site) values ('Spam','7000001','{Logistics}','Malé');
select 'link spam blocked' t; insert into public.quote_requests(name,phone,needs,site,details) values ('X','7000002','{Logistics}','Malé','http://a.com http://b.com http://c.com');
insert into public.client_events(kind,surface,name,message,session_id) values ('error','customer','TypeError','x is undefined','s1');
insert into public.client_events(kind,surface,name,detail,session_id) values ('event','website','search','{"q":"Cement"}','s2'),('event','customer','search','{"q":"cement"}','s3');
reset role;
-- dispatcher: can assign, cannot change prices or approve payments or read reports
set role authenticated; select set_config('request.jwt.claim.sub','55555555-5555-5555-5555-555555555555',false);
select 'dispatcher sees orders' t, count(*) > 0 from public.orders;
select 'dispatcher assigns' t, status from public.admin_assign_order((select id from public.orders where status='requested' and kind='hire' order by created_at desc limit 1),'22222222-2222-2222-2222-222222222222');
select 'dispatcher price edit (want 0 rows)' t; update public.materials set price=1 where id='cem' returning id;
select 'dispatcher reports blocked' t; select * from public.admin_report_monthly(1);
reset role;
-- accounts: reports yes, assign no
set role authenticated; select set_config('request.jwt.claim.sub','66666666-6666-6666-6666-666666666666',false);
select 'accounts reports ok' t, count(*) from public.admin_report_monthly(3);
select 'accounts assign blocked' t; select public.admin_assign_order((select id from public.orders limit 1),'22222222-2222-2222-2222-222222222222');
select 'insights' t, metric, label, value from public.admin_insights(7);
reset role;
-- manager changes a price → logged
set role authenticated; select set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',false);
update public.materials set price=125 where id='cem';
select public.admin_set_role('disp@yd-mv.com','counter');
select 'audit' t, actor_name, actor_role, action, entity, entity_id, changes from public.audit_log order by id;
reset role;
-- customer deletes account: invoices kept, anonymised
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select 'delete while order in progress?' t; select public.delete_my_account();
reset role;
update public.orders set status='completed' where customer_id='11111111-1111-1111-1111-111111111111' and status in ('accepted','loading','enroute','arrived');
set role authenticated; select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',false);
select public.delete_my_account();
reset role;
select 'user gone' t, count(*) from auth.users where id='11111111-1111-1111-1111-111111111111';
select 'orders kept & anonymised' t, count(*), min(customer_name), count(invoice_no) from public.orders where customer_name='Deleted customer';
