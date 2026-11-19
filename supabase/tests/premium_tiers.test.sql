begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_table('public','premium_entitlements','private Premium entitlement table exists');
select has_table('public','premium_payment_intents','private payment intent table exists');
select has_table('public','premium_payment_events','idempotent provider payment ledger exists');
select has_table('public','premium_phone_visibility_access_log','phone view access audit exists');
select has_column('public','member_account_details','phone_visibility_opt_in','phone sharing consent is stored privately');
select has_column('public','premium_payment_intents','expires_at','checkout intents expire');
select ok((select relrowsecurity from pg_class where oid='public.premium_entitlements'::regclass),'Premium entitlements have RLS enabled');
select ok(not has_table_privilege('authenticated','public.premium_entitlements','select'),'members cannot read entitlement records directly');
select ok(not has_table_privilege('authenticated','public.premium_payment_intents','insert'),'members cannot create payment intents directly');
select ok(not has_table_privilege('authenticated','public.premium_payment_events','insert'),'members cannot forge provider payment events');
select ok((select relrowsecurity from pg_class where oid='public.premium_phone_visibility_access_log'::regclass),'phone view audit has RLS enabled');
select ok(not has_table_privilege('authenticated','public.premium_phone_visibility_access_log','select'),'members cannot read phone view audit directly');
select ok(has_function_privilege('service_role','public.apply_verified_premium_payment(text,text,uuid,text,text,integer,text,text,text)','execute'),'only server service role can apply verified payments');
select ok(has_function_privilege('service_role','public.cancel_verified_premium_subscription(uuid,text,text,text)','execute'),'only server service role can cancel an exact subscription');
select ok(not has_function_privilege('authenticated','public.get_premium_visible_phone(uuid,uuid)','execute'),'authenticated clients cannot query private phone function directly');
select ok(not has_function_privilege('authenticated','public.cancel_verified_premium_subscription(uuid,text,text,text)','execute'),'authenticated clients cannot cancel provider subscriptions directly');

select * from finish();
rollback;
