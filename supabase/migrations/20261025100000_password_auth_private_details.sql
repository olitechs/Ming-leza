create table public.member_account_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  age_bracket text not null check (
    age_bracket in ('18-24', '25-34', '35-44', '45-54', '55-64', '65-plus')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.member_account_details is
  'Private registration details. Never add this table to public profile, discovery, or messaging projections.';
comment on column public.member_account_details.age_bracket is
  'Self-reported age range; not an age-verification signal. DOB is never stored.';
comment on column public.member_account_details.phone_e164 is
  'Validated E.164 phone number; collected for account contact only and not publicly exposed.';

alter table public.member_account_details enable row level security;
revoke all on public.member_account_details from anon, authenticated;
grant select on public.member_account_details to authenticated;
grant all on public.member_account_details to service_role;

create policy member_account_details_select_self
  on public.member_account_details
  for select to authenticated
  using (auth.uid() = user_id);
