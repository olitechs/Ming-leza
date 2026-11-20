-- Gift diamond economy. All balance mutations are performed by trusted RPCs.
create table public.gift_catalog_items (
  id text primary key,
  name text not null,
  icon text not null,
  diamond_price integer not null check (diamond_price > 0),
  active boolean not null default true,
  sort_order integer not null default 0
);
insert into public.gift_catalog_items (id,name,icon,diamond_price,sort_order) values
  ('rose','Rose','🌹',5,1), ('heart','Heart','❤️',10,2),
  ('star','Star','⭐',25,3), ('crown','Crown','👑',50,4);

create table public.gift_diamond_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  available_diamonds integer not null default 0 check (available_diamonds >= 0),
  updated_at timestamptz not null default now()
);
create table public.gift_diamond_payment_intents (
  tx_ref text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  diamonds integer not null check (diamonds between 1 and 10000),
  billing_method text not null check (billing_method in ('card','mpesa')),
  amount_kes integer not null,
  status text not null default 'pending' check (status in ('pending','paid','failed','expired')),
  created_at timestamptz not null default now(), expires_at timestamptz not null,
  paid_at timestamptz,
  check (amount_kes = diamonds), check (expires_at > created_at),
  check ((status = 'paid') = (paid_at is not null))
);
create unique index gift_diamond_one_pending_intent_per_user on public.gift_diamond_payment_intents(user_id) where status='pending';
create index gift_diamond_payment_intents_user_created_idx on public.gift_diamond_payment_intents(user_id,created_at desc);
create table public.gift_diamond_payment_events (
  provider_transaction_id text primary key,
  tx_ref text not null references public.gift_diamond_payment_intents(tx_ref),
  user_id uuid not null references auth.users(id), diamonds integer not null check (diamonds between 1 and 10000),
  billing_method text not null check (billing_method in ('card','mpesa')),
  amount_kes integer not null check (amount_kes > 0), created_at timestamptz not null default now(),
  check (amount_kes = diamonds), unique(tx_ref)
);
create table public.gift_diamond_ledger (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  delta_diamonds integer not null check (delta_diamonds <> 0), balance_after integer not null check (balance_after >= 0),
  entry_type text not null check (entry_type in ('purchase','gift_sent','gift_received','redemption_reserved','redemption_refund')),
  reference text not null, created_at timestamptz not null default now(), unique(user_id,entry_type,reference)
);
create index gift_diamond_ledger_user_created_idx on public.gift_diamond_ledger(user_id,created_at desc);
create table public.gift_transfers (
  id uuid primary key default gen_random_uuid(), sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  gift_item_id text not null references public.gift_catalog_items(id), diamonds integer not null check (diamonds > 0),
  created_at timestamptz not null default now(), check (sender_id <> recipient_id)
);
create index gift_transfers_sender_created_idx on public.gift_transfers(sender_id,created_at desc);
create index gift_transfers_recipient_created_idx on public.gift_transfers(recipient_id,created_at desc);
create table public.gift_diamond_redemptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  diamonds integer not null check (diamonds >= 200), payout_amount_kes numeric(12,2) not null,
  payout_method text not null check (payout_method in ('paypal','gift_card')),
  paypal_email text, gift_card_brand text, delivery_email text,
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected','cancelled')),
  admin_note text, reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), paid_at timestamptz,
  check (payout_amount_kes = diamonds * 0.80),
  check ((payout_method='paypal' and paypal_email is not null and length(trim(paypal_email))>0 and gift_card_brand is null and delivery_email is null)
      or (payout_method='gift_card' and gift_card_brand is not null and length(trim(gift_card_brand))>0 and delivery_email is not null and length(trim(delivery_email))>0 and paypal_email is null)),
  check ((status='paid') = (paid_at is not null))
);
create index gift_diamond_redemptions_user_created_idx on public.gift_diamond_redemptions(user_id,created_at desc);

alter table public.gift_catalog_items enable row level security;
alter table public.gift_transfers enable row level security;
alter table public.gift_diamond_wallets enable row level security;
alter table public.gift_diamond_payment_intents enable row level security;
alter table public.gift_diamond_payment_events enable row level security;
alter table public.gift_diamond_ledger enable row level security;
alter table public.gift_diamond_redemptions enable row level security;
revoke all on public.gift_catalog_items,public.gift_transfers,public.gift_diamond_wallets,public.gift_diamond_payment_intents,public.gift_diamond_payment_events,public.gift_diamond_ledger,public.gift_diamond_redemptions from public,anon,authenticated;
grant select on public.gift_catalog_items,public.gift_transfers to authenticated;
grant all on public.gift_catalog_items,public.gift_transfers,public.gift_diamond_wallets,public.gift_diamond_payment_intents,public.gift_diamond_payment_events,public.gift_diamond_ledger,public.gift_diamond_redemptions to service_role;
create policy gift_catalog_active_read on public.gift_catalog_items for select to authenticated using (active);
create policy gift_transfers_participant_read on public.gift_transfers for select to authenticated using (sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));

create function public.send_member_gift(p_recipient_id uuid,p_gift_item_id text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_sender uuid:=auth.uid(); v_price integer; v_id uuid; v_wallet uuid;
begin
  if v_sender is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_recipient_id is null or p_recipient_id=v_sender or not public.is_adult_verified(v_sender) or not public.is_adult_verified(p_recipient_id)
    or not exists(select 1 from public.profiles p where p.id=p_recipient_id and p.is_discoverable)
    or public.is_blocked_between(v_sender,p_recipient_id) then raise exception 'gift recipient unavailable' using errcode='42501'; end if;
  select diamond_price into v_price from public.gift_catalog_items where id=p_gift_item_id and active;
  if v_price is null or v_price<=0 then raise exception 'gift unavailable' using errcode='22023'; end if;
  -- Create any missing wallet rows, then lock both in a deterministic order.
  insert into public.gift_diamond_wallets(user_id)
    select x from unnest(array[v_sender,p_recipient_id]) x order by x on conflict do nothing;
  perform 1 from public.gift_diamond_wallets where user_id in (v_sender,p_recipient_id) order by user_id for update;
  if (select available_diamonds from public.gift_diamond_wallets where user_id=v_sender)<v_price then raise exception 'insufficient diamonds' using errcode='23514'; end if;
  update public.gift_diamond_wallets set available_diamonds=available_diamonds-v_price,updated_at=now() where user_id=v_sender;
  update public.gift_diamond_wallets set available_diamonds=available_diamonds+v_price,updated_at=now() where user_id=p_recipient_id;
  insert into public.gift_transfers(sender_id,recipient_id,gift_item_id,diamonds) values(v_sender,p_recipient_id,p_gift_item_id,v_price) returning id into v_id;
  insert into public.gift_diamond_ledger(user_id,delta_diamonds,balance_after,entry_type,reference)
    select v_sender,-v_price,available_diamonds,'gift_sent',v_id::text from public.gift_diamond_wallets where user_id=v_sender;
  insert into public.gift_diamond_ledger(user_id,delta_diamonds,balance_after,entry_type,reference)
    select p_recipient_id,v_price,available_diamonds,'gift_received',v_id::text from public.gift_diamond_wallets where user_id=p_recipient_id;
  return v_id;
end $$;

create function public.request_gift_diamond_redemption(p_diamonds integer,p_payout_method text,p_paypal_email text default null,p_gift_card_brand text default null,p_delivery_email text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_id uuid; v_balance integer;
begin
  if v_user is null then raise exception 'authentication required' using errcode='28000'; end if;
  if not public.is_adult_verified(v_user) then raise exception 'adult verification required' using errcode='42501'; end if;
  if p_diamonds is null or p_diamonds<200 or p_payout_method not in ('paypal','gift_card') then raise exception 'invalid redemption' using errcode='22023'; end if;
  if (p_payout_method='paypal' and (nullif(trim(p_paypal_email),'') is null or p_gift_card_brand is not null or p_delivery_email is not null)) or
     (p_payout_method='gift_card' and (nullif(trim(p_gift_card_brand),'') is null or nullif(trim(p_delivery_email),'') is null or p_paypal_email is not null)) then raise exception 'payout target mismatch' using errcode='22023'; end if;
  insert into public.gift_diamond_wallets(user_id) values(v_user) on conflict do nothing;
  select available_diamonds into v_balance from public.gift_diamond_wallets where user_id=v_user for update;
  if v_balance<p_diamonds then raise exception 'insufficient diamonds' using errcode='23514'; end if;
  update public.gift_diamond_wallets set available_diamonds=available_diamonds-p_diamonds,updated_at=now() where user_id=v_user;
  insert into public.gift_diamond_redemptions(user_id,diamonds,payout_amount_kes,payout_method,paypal_email,gift_card_brand,delivery_email)
    values(v_user,p_diamonds,p_diamonds*0.80,p_payout_method,p_paypal_email,p_gift_card_brand,p_delivery_email) returning id into v_id;
  insert into public.gift_diamond_ledger(user_id,delta_diamonds,balance_after,entry_type,reference)
    select v_user,-p_diamonds,available_diamonds,'redemption_reserved',v_id::text from public.gift_diamond_wallets where user_id=v_user;
  return v_id;
end $$;

create function public.cancel_gift_diamond_redemption(p_request_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_r public.gift_diamond_redemptions%rowtype; v_balance integer;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='28000'; end if;
  if not public.is_adult_verified(auth.uid()) then raise exception 'adult verification required' using errcode='42501'; end if;
  select * into v_r from public.gift_diamond_redemptions where id=p_request_id for update;
  if not found or v_r.user_id<>auth.uid() or v_r.status<>'pending' then return false; end if;
  insert into public.gift_diamond_wallets(user_id) values(v_r.user_id) on conflict do nothing;
  select available_diamonds into v_balance from public.gift_diamond_wallets where user_id=v_r.user_id for update;
  update public.gift_diamond_wallets set available_diamonds=available_diamonds+v_r.diamonds,updated_at=now() where user_id=v_r.user_id returning available_diamonds into v_balance;
  update public.gift_diamond_redemptions set status='cancelled',updated_at=now() where id=p_request_id;
  insert into public.gift_diamond_ledger(user_id,delta_diamonds,balance_after,entry_type,reference) values(v_r.user_id,v_r.diamonds,v_balance,'redemption_refund',v_r.id::text);
  return true;
end $$;

create function public.apply_verified_gift_diamond_purchase(p_provider_transaction_id text,p_tx_ref text,p_user_id uuid,p_diamonds integer,p_billing_method text,p_customer_email text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_i public.gift_diamond_payment_intents%rowtype; v_balance integer; v_email text;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  if nullif(trim(p_provider_transaction_id),'') is null or nullif(trim(p_tx_ref),'') is null or p_user_id is null
    or p_diamonds is null or p_billing_method is null or p_billing_method not in ('card','mpesa')
    or nullif(trim(p_customer_email),'') is null then raise exception 'invalid provider transaction' using errcode='22023'; end if;
  select * into v_i from public.gift_diamond_payment_intents where tx_ref=p_tx_ref for update;
  if not found then raise exception 'payment intent unavailable' using errcode='42501'; end if;
  select email into v_email from auth.users where id=p_user_id;
  if v_i.status='paid' and exists(select 1 from public.gift_diamond_payment_events e where e.provider_transaction_id=p_provider_transaction_id and e.tx_ref=p_tx_ref and e.user_id=p_user_id and e.diamonds=p_diamonds and e.billing_method=p_billing_method and e.amount_kes=v_i.amount_kes) then return true; end if;
  if v_i.status<>'pending' or v_i.expires_at<=now() or v_i.user_id<>p_user_id or v_i.diamonds<>p_diamonds
    or v_i.billing_method<>p_billing_method or v_i.amount_kes<>p_diamonds
    or lower(trim(coalesce(v_email,'')))<>lower(trim(coalesce(p_customer_email,'')))
    or not public.is_adult_verified(p_user_id) then raise exception 'payment intent mismatch or expired' using errcode='42501'; end if;
  if exists(select 1 from public.gift_diamond_payment_events where provider_transaction_id=p_provider_transaction_id or tx_ref=p_tx_ref) then raise exception 'payment already applied' using errcode='23505'; end if;
  insert into public.gift_diamond_wallets(user_id) values(p_user_id) on conflict do nothing;
  select available_diamonds into v_balance from public.gift_diamond_wallets where user_id=p_user_id for update;
  update public.gift_diamond_wallets set available_diamonds=available_diamonds+p_diamonds,updated_at=now() where user_id=p_user_id returning available_diamonds into v_balance;
  insert into public.gift_diamond_payment_events(provider_transaction_id,tx_ref,user_id,diamonds,billing_method,amount_kes) values(p_provider_transaction_id,p_tx_ref,p_user_id,p_diamonds,p_billing_method,p_diamonds);
  insert into public.gift_diamond_ledger(user_id,delta_diamonds,balance_after,entry_type,reference) values(p_user_id,p_diamonds,v_balance,'purchase',p_tx_ref);
  update public.gift_diamond_payment_intents set status='paid',paid_at=now() where tx_ref=p_tx_ref;
  return true;
end $$;

create function public.resolve_gift_diamond_redemption(p_request_id uuid,p_admin_id uuid,p_action text,p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare v_r public.gift_diamond_redemptions%rowtype; v_balance integer;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  select * into v_r from public.gift_diamond_redemptions where id=p_request_id for update;
  if not found then raise exception 'redemption not found' using errcode='P0002'; end if;
  if p_admin_id is null or p_action is null or p_action not in ('approve','reject','paid')
    or (v_r.status='pending' and p_action not in ('approve','reject'))
    or (v_r.status='approved' and p_action not in ('paid','reject'))
    or v_r.status not in ('pending','approved') then raise exception 'invalid redemption transition' using errcode='22023'; end if;
  if p_action in ('approve','paid') and not public.is_adult_verified(v_r.user_id) then
    raise exception 'recipient adult verification required' using errcode='42501';
  end if;
  if p_action='reject' then
    insert into public.gift_diamond_wallets(user_id) values(v_r.user_id) on conflict do nothing;
    select available_diamonds into v_balance from public.gift_diamond_wallets where user_id=v_r.user_id for update;
    update public.gift_diamond_wallets set available_diamonds=available_diamonds+v_r.diamonds,updated_at=now() where user_id=v_r.user_id returning available_diamonds into v_balance;
    insert into public.gift_diamond_ledger(user_id,delta_diamonds,balance_after,entry_type,reference) values(v_r.user_id,v_r.diamonds,v_balance,'redemption_refund',v_r.id::text);
  end if;
  update public.gift_diamond_redemptions set status=case p_action when 'approve' then 'approved' when 'paid' then 'paid' else 'rejected' end,
    admin_note=p_note,reviewed_by=p_admin_id,updated_at=now(),paid_at=case when p_action='paid' then now() else null end where id=p_request_id;
end $$;

revoke all on function public.send_member_gift(uuid,text),public.request_gift_diamond_redemption(integer,text,text,text,text),public.cancel_gift_diamond_redemption(uuid),public.apply_verified_gift_diamond_purchase(text,text,uuid,integer,text,text),public.resolve_gift_diamond_redemption(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.send_member_gift(uuid,text),public.request_gift_diamond_redemption(integer,text,text,text,text),public.cancel_gift_diamond_redemption(uuid) to authenticated;
grant execute on function public.apply_verified_gift_diamond_purchase(text,text,uuid,integer,text,text),public.resolve_gift_diamond_redemption(uuid,uuid,text,text) to service_role;
