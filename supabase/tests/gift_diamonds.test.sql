begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

select has_table('public','gift_catalog_items','gift catalog exists');
select has_table('public','gift_diamond_wallets','wallet table exists');
select has_table('public','gift_diamond_payment_intents','payment intents exist');
select has_table('public','gift_diamond_payment_events','payment events exist');
select has_table('public','gift_diamond_ledger','ledger exists');
select has_table('public','gift_transfers','transfer history exists');
select has_table('public','gift_diamond_redemptions','redemptions exist');
select is((select count(*) from public.gift_catalog_items),4::bigint,'four seed gifts exist');
select is((select diamond_price from public.gift_catalog_items where id='rose'),5,'rose costs five diamonds');
select is((select diamond_price from public.gift_catalog_items where id='heart'),10,'heart costs ten diamonds');
select is((select diamond_price from public.gift_catalog_items where id='star'),25,'star costs twenty-five diamonds');
select is((select diamond_price from public.gift_catalog_items where id='crown'),50,'crown costs fifty diamonds');

select ok((select relrowsecurity from pg_class where oid='public.gift_diamond_wallets'::regclass),'wallets have RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.gift_diamond_payment_intents'::regclass),'payment intents have RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.gift_diamond_redemptions'::regclass),'redemptions have RLS enabled');
select ok(has_table_privilege('authenticated','public.gift_catalog_items','select'),'authenticated can read catalog');
select ok(has_table_privilege('authenticated','public.gift_transfers','select'),'authenticated can read participant-filtered transfer history');
select ok(not has_table_privilege('authenticated','public.gift_catalog_items','insert'),'authenticated cannot write catalog');
select ok(not has_table_privilege('authenticated','public.gift_transfers','insert'),'authenticated cannot write transfers');
select ok(not has_table_privilege('authenticated','public.gift_diamond_wallets','select'),'wallet balances are service-role-only');
select ok(not has_table_privilege('authenticated','public.gift_diamond_payment_intents','select'),'payment intents are service-role-only');
select ok(not has_table_privilege('authenticated','public.gift_diamond_redemptions','select'),'private payout/redemption data is service-role-only');
select ok(has_table_privilege('service_role','public.gift_diamond_redemptions','select'),'service role can access redemption processing data');

select ok(has_function_privilege('authenticated','public.send_member_gift(uuid,text)','execute'),'authenticated may execute gift-send RPC');
select ok(has_function_privilege('authenticated','public.request_gift_diamond_redemption(integer,text,text,text,text)','execute'),'authenticated may request redemption');
select ok(has_function_privilege('authenticated','public.cancel_gift_diamond_redemption(uuid)','execute'),'authenticated may cancel own pending redemption');
select ok(not has_function_privilege('authenticated','public.apply_verified_gift_diamond_purchase(text,text,uuid,integer,text,text)','execute'),'purchase fulfillment RPC is not authenticated-callable');
select ok(has_function_privilege('service_role','public.apply_verified_gift_diamond_purchase(text,text,uuid,integer,text,text)','execute'),'service role may apply verified purchase');
select ok(not has_function_privilege('authenticated','public.resolve_gift_diamond_redemption(uuid,uuid,text,text)','execute'),'redemption admin RPC is not authenticated-callable');

select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='gift_diamond_one_pending_intent_per_user' and indexdef ilike '%where (status = ''pending''::text)%'),'one pending intent per user is enforced by a partial unique index');
select ok(exists(
  select 1 from pg_catalog.pg_constraint c
  where c.conrelid='public.gift_diamond_redemptions'::regclass
    and c.contype='c'
    and pg_catalog.pg_get_constraintdef(c.oid) ilike '%payout_amount_kes%'
    and pg_catalog.pg_get_constraintdef(c.oid) ilike '%diamonds%'
),'redemption conversion has a database check');

select * from finish();
rollback;
