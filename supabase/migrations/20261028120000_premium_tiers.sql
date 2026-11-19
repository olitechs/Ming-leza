-- Paid phone visibility tiers. All billing writes are server-only and sourced from verified provider events.
alter table public.member_account_details
  add column phone_visibility_opt_in boolean not null default false;

comment on column public.member_account_details.phone_visibility_opt_in is
  'Owner-controlled consent to reveal the registration phone number to active Premium/VIP members. Defaults off.';

create table public.premium_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null check (tier in ('premium', 'vip')),
  billing_method text not null check (billing_method in ('card', 'mpesa')),
  status text not null check (status in ('active', 'cancelled', 'expired')),
  provider_customer_email text not null,
  provider_plan_id text,
  provider_subscription_id text,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.premium_entitlements enable row level security;
revoke all on public.premium_entitlements from anon, authenticated;
grant all on public.premium_entitlements to service_role;

create table public.premium_payment_intents (
  tx_ref text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('premium', 'vip')),
  billing_method text not null check (billing_method in ('card', 'mpesa')),
  amount_kes integer not null check ((tier = 'premium' and amount_kes = 200) or (tier = 'vip' and amount_kes = 1000)),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  paid_at timestamptz
);
alter table public.premium_payment_intents enable row level security;
revoke all on public.premium_payment_intents from anon, authenticated;
grant all on public.premium_payment_intents to service_role;

create table public.premium_payment_events (
  provider_transaction_id text primary key,
  tx_ref text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('premium', 'vip')),
  billing_method text not null check (billing_method in ('card', 'mpesa')),
  amount_kes integer not null,
  created_at timestamptz not null default now()
);
create unique index premium_payment_intents_one_pending_per_user
  on public.premium_payment_intents(user_id) where status='pending';
alter table public.premium_payment_events enable row level security;
revoke all on public.premium_payment_events from anon, authenticated;
grant all on public.premium_payment_events to service_role;

create or replace function public.apply_verified_premium_payment(
  p_provider_transaction_id text,
  p_tx_ref text,
  p_user_id uuid,
  p_tier text,
  p_billing_method text,
  p_amount_kes integer,
  p_customer_email text,
  p_plan_id text default null,
  p_subscription_id text default null
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_intent public.premium_payment_intents%rowtype;
  v_now timestamptz := now();
  v_period_end timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode='42501';
  end if;
  if p_user_id is null
     or p_provider_transaction_id is null or p_provider_transaction_id = ''
     or p_tx_ref is null or p_tx_ref = ''
     or p_tier is null
     or p_tier not in ('premium','vip')
     or p_billing_method is null
     or p_billing_method not in ('card','mpesa')
     or p_amount_kes is null
     or p_amount_kes <> case when p_tier='premium' then 200 else 1000 end
     or p_customer_email is null or lower(trim(p_customer_email)) = ''
     or (p_billing_method='card' and (p_plan_id is null or p_plan_id !~ '^[0-9]+$'))
     or (p_billing_method='mpesa' and p_plan_id is not null) then
    raise exception 'payment details invalid' using errcode='22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  select * into v_intent from public.premium_payment_intents
    where tx_ref=p_tx_ref and user_id=p_user_id and tier=p_tier
      and billing_method=p_billing_method and amount_kes=p_amount_kes
      and status='pending' and expires_at > v_now for update;

  if found then
    update public.premium_payment_intents set status='paid', paid_at=v_now where tx_ref=p_tx_ref;
  else
    if exists (
      select 1 from public.premium_payment_intents i where i.tx_ref=p_tx_ref
        and (i.user_id<>p_user_id or i.tier<>p_tier or i.billing_method<>p_billing_method
          or i.amount_kes<>p_amount_kes or i.status<>'paid')
    ) then
      raise exception 'payment intent unavailable' using errcode='42501';
    end if;
    if p_billing_method <> 'card' or not exists (
      select 1 from public.premium_entitlements e
      where e.user_id=p_user_id and e.billing_method='card'
        and e.tier=p_tier and e.provider_plan_id=p_plan_id
        and lower(e.provider_customer_email)=lower(trim(p_customer_email))
    ) then
      raise exception 'payment intent unavailable' using errcode='42501';
    end if;
  end if;

  insert into public.premium_payment_events(provider_transaction_id,tx_ref,user_id,tier,billing_method,amount_kes)
    values(p_provider_transaction_id,p_tx_ref,p_user_id,p_tier,p_billing_method,p_amount_kes)
    on conflict do nothing;
  if not found then return false; end if;

  select greatest(coalesce(e.current_period_end, v_now),v_now) + interval '1 month'
    into v_period_end from public.premium_entitlements e where e.user_id=p_user_id;
  if v_period_end is null then v_period_end := v_now + interval '1 month'; end if;

  insert into public.premium_entitlements(user_id,tier,billing_method,status,provider_customer_email,
    provider_plan_id,provider_subscription_id,current_period_start,current_period_end,updated_at)
  values(p_user_id,p_tier,p_billing_method,'active',lower(trim(p_customer_email)),p_plan_id,
    p_subscription_id,v_now,v_period_end,v_now)
  on conflict(user_id) do update set tier=excluded.tier,billing_method=excluded.billing_method,
    status='active',provider_customer_email=excluded.provider_customer_email,
    provider_plan_id=excluded.provider_plan_id,
    provider_subscription_id=coalesce(excluded.provider_subscription_id,public.premium_entitlements.provider_subscription_id),
    current_period_start=case when public.premium_entitlements.current_period_end <= v_now then v_now else public.premium_entitlements.current_period_start end,
    current_period_end=v_period_end,updated_at=v_now;
  return true;
end;
$$;

create or replace function public.cancel_verified_premium_subscription(
  p_user_id uuid,
  p_customer_email text,
  p_plan_id text,
  p_subscription_id text default null
) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode='42501';
  end if;
  if p_user_id is null or p_customer_email is null or trim(p_customer_email) = ''
     or p_plan_id is null or p_plan_id !~ '^[0-9]+$' then
    raise exception 'subscription details invalid' using errcode='22023';
  end if;
  update public.premium_entitlements set status='cancelled',
    provider_subscription_id=coalesce(p_subscription_id,provider_subscription_id),updated_at=now()
  where user_id=p_user_id and lower(provider_customer_email)=lower(trim(p_customer_email))
    and provider_plan_id=p_plan_id and billing_method='card' and status='active'
    and (p_subscription_id is null or provider_subscription_id is null
      or provider_subscription_id=p_subscription_id);
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.apply_verified_premium_payment(text,text,uuid,text,text,integer,text,text,text) from public,anon,authenticated;
revoke all on function public.cancel_verified_premium_subscription(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.apply_verified_premium_payment(text,text,uuid,text,text,integer,text,text,text) to service_role;
grant execute on function public.cancel_verified_premium_subscription(uuid,text,text,text) to service_role;

create table public.premium_phone_visibility_access_log (
  id bigint generated always as identity primary key,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  check (viewer_id <> owner_id)
);
alter table public.premium_phone_visibility_access_log enable row level security;
revoke all on public.premium_phone_visibility_access_log from anon, authenticated;
grant all on public.premium_phone_visibility_access_log to service_role;

create or replace function public.get_premium_visible_phone(p_viewer_id uuid,p_owner_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_phone text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode='42501';
  end if;
  if p_viewer_id is null or p_owner_id is null or p_viewer_id=p_owner_id
     or not private.is_adult_verified(p_viewer_id)
     or not private.is_adult_verified(p_owner_id)
     or private.is_blocked_between(p_viewer_id,p_owner_id)
     or not exists (select 1 from public.profiles p where p.id=p_owner_id and p.is_discoverable)
     or not exists (
       select 1 from public.premium_entitlements e
       where e.user_id=p_viewer_id and e.status in ('active','cancelled')
         and e.current_period_end > now()
     )
     or not exists (
       select 1 from public.member_account_details d
       where d.user_id=p_owner_id and d.phone_visibility_opt_in=true
     ) then
    return null;
  end if;
  select d.phone_e164 into v_phone from public.member_account_details d where d.user_id=p_owner_id;
  if v_phone is not null then
    insert into public.premium_phone_visibility_access_log(viewer_id,owner_id) values(p_viewer_id,p_owner_id);
  end if;
  return v_phone;
end;
$$;
revoke all on function public.get_premium_visible_phone(uuid,uuid) from public,anon,authenticated;
grant execute on function public.get_premium_visible_phone(uuid,uuid) to service_role;
