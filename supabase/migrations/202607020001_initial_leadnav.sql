begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  role text not null default 'user' check (role in ('super_admin', 'team_admin', 'user')),
  wallet_balance_cents bigint not null default 0 check (wallet_balance_cents >= 0),
  stripe_customer_id text unique,
  avatar_url text,
  dark_mode boolean not null default false,
  dialer_preference text not null default 'default' check (dialer_preference in ('default', 'skype', 'zoom', 'ringcentral')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  billing_mode text not null default 'individual' check (billing_mode in ('team_card', 'individual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  can_order boolean not null default false,
  can_view_leads boolean not null default false,
  can_make_calls boolean not null default false,
  can_file_disputes boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id),
  unique (user_id)
);

create table if not exists public.team_admin_assignments (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  type text not null default 'inbound' check (type in ('inbound', 'manual')),
  lead_types text[] not null default '{}',
  lead_type_costs jsonb not null default '{}'::jsonb,
  locations text[] not null default '{}',
  cost_per_lead numeric(12,2) check (cost_per_lead is null or cost_per_lead >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendor_api_keys (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  label text,
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.profiles(id) on delete set null,
  placed_by uuid references public.profiles(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete restrict,
  lead_type text,
  lead_types text[] not null default '{}',
  daily_budget numeric(12,2) check (daily_budget is null or daily_budget >= 0),
  states text[] not null default '{}',
  availability text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_agents (
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (order_id, user_id)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  firstname text,
  lastname text,
  birthday date,
  email text,
  phone text,
  state text,
  zip text,
  plan_for text,
  looking_for text,
  income numeric(14,2),
  household integer,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  lead_type text,
  notes text,
  status text not null default 'new' check (status in ('new', 'not_contacted', 'contacted', 'appt_set', 'appt_no_show', 'appt_no_sale', 'appt_rescheduled', 'sale', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  called_at timestamptz not null default now(),
  outcome text not null check (outcome in ('no_answer', 'voicemail', 'callback_requested', 'appointment_set', 'contacted', 'not_interested', 'wrong_number', 'sale')),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  ended_by text check (ended_by is null or ended_by in ('agent', 'lead')),
  recording_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('bad_phone', 'bad_email', 'bad_address', 'duplicate', 'not_interested', 'other')),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'general' check (type in ('new_lead', 'dispute_update', 'order_update', 'general')),
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('topup', 'charge', 'refund')),
  amount_cents bigint not null check (amount_cents > 0),
  stripe_payment_intent_id text,
  lead_id uuid references public.leads(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

create unique index if not exists wallet_transactions_payment_intent_uidx
  on public.wallet_transactions (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
create index if not exists leads_assigned_to_created_idx on public.leads (assigned_to, created_at desc);
create index if not exists leads_order_id_idx on public.leads (order_id);
create index if not exists leads_vendor_id_idx on public.leads (vendor_id);
create index if not exists orders_account_status_idx on public.orders (account_id, status) where archived = false;
create index if not exists orders_vendor_status_idx on public.orders (vendor_id, status) where archived = false;
create index if not exists call_logs_agent_called_idx on public.call_logs (agent_id, called_at desc);
create index if not exists call_logs_lead_called_idx on public.call_logs (lead_id, called_at desc);
create index if not exists disputes_agent_status_idx on public.disputes (agent_id, status);
create index if not exists notifications_user_unread_idx on public.notifications (user_id, read, created_at desc);
create index if not exists wallet_transactions_user_created_idx on public.wallet_transactions (user_id, created_at desc);
create index if not exists vendor_api_keys_hash_idx on public.vendor_api_keys (key_hash) where is_active = true;
create index if not exists orders_states_gin_idx on public.orders using gin (states);
create index if not exists orders_lead_types_gin_idx on public.orders using gin (lead_types);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := new.raw_user_meta_data ->> 'role';
  if requested_role not in ('super_admin', 'team_admin', 'user') then
    requested_role := 'user';
  end if;

  insert into public.profiles (id, first_name, last_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    requested_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.protect_profile_sensitive_fields()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'authenticated' and (
    new.role is distinct from old.role or
    new.wallet_balance_cents is distinct from old.wallet_balance_cents or
    new.stripe_customer_id is distinct from old.stripe_customer_id or
    new.created_at is distinct from old.created_at
  ) then
    raise exception 'Sensitive profile fields may only be changed by a privileged server operation';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_sensitive_fields_trigger on public.profiles;
create trigger protect_profile_sensitive_fields_trigger
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_fields();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'super_admin', false);
$$;

create or replace function public.is_team_admin_for(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_admin_assignments taa
    join public.team_members tm on tm.team_id = taa.team_id
    where taa.user_id = auth.uid()
      and tm.user_id = target_user_id
  );
$$;

create or replace function public.can_access_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_user_id = auth.uid()
    or public.is_super_admin()
    or public.is_team_admin_for(target_user_id);
$$;

create or replace function public.can_access_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1 from public.team_admin_assignments
      where team_id = target_team_id and user_id = auth.uid()
    )
    or exists (
      select 1 from public.team_members
      where team_id = target_team_id and user_id = auth.uid()
    );
$$;

create or replace function public.can_access_lead(target_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leads l
    where l.id = target_lead_id
      and (
        (l.assigned_to is not null and public.can_access_user(l.assigned_to))
        or public.is_super_admin()
        or exists (
          select 1 from public.order_agents oa
          where oa.order_id = l.order_id and oa.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.credit_wallet(
  p_user_id uuid,
  p_amount_cents integer,
  p_stripe_payment_intent text default null,
  p_description text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance bigint;
begin
  if p_amount_cents <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select wallet_balance_cents into current_balance
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if p_stripe_payment_intent is not null and exists (
    select 1 from public.wallet_transactions
    where stripe_payment_intent_id = p_stripe_payment_intent
  ) then
    return current_balance;
  end if;

  update public.profiles
  set wallet_balance_cents = wallet_balance_cents + p_amount_cents
  where id = p_user_id
  returning wallet_balance_cents into current_balance;

  insert into public.wallet_transactions (
    user_id, type, amount_cents, stripe_payment_intent_id, description
  ) values (
    p_user_id, 'topup', p_amount_cents, p_stripe_payment_intent, p_description
  );

  return current_balance;
end;
$$;

create or replace function public.deduct_wallet(
  p_user_id uuid,
  p_amount_cents integer,
  p_lead_id uuid default null,
  p_description text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance bigint;
begin
  if p_amount_cents <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select wallet_balance_cents into current_balance
  from public.profiles
  where id = p_user_id
  for update;

  if not found or current_balance < p_amount_cents then
    return false;
  end if;

  update public.profiles
  set wallet_balance_cents = wallet_balance_cents - p_amount_cents
  where id = p_user_id;

  insert into public.wallet_transactions (
    user_id, type, amount_cents, lead_id, description
  ) values (
    p_user_id, 'charge', p_amount_cents, p_lead_id, p_description
  );

  return true;
end;
$$;

revoke all on function public.credit_wallet(uuid, integer, text, text) from public;
revoke all on function public.deduct_wallet(uuid, integer, uuid, text) from public;
grant execute on function public.credit_wallet(uuid, integer, text, text) to service_role;
grant execute on function public.deduct_wallet(uuid, integer, uuid, text) to service_role;

foreach table_name in array array['profiles','teams','vendors','orders','leads','disputes']
loop
  execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
  execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
end loop;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_admin_assignments enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_api_keys enable row level security;
alter table public.orders enable row level security;
alter table public.order_agents enable row level security;
alter table public.leads enable row level security;
alter table public.call_logs enable row level security;
alter table public.disputes enable row level security;
alter table public.notifications enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.can_access_user(id));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (public.can_access_team(id));
drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams for insert to authenticated
  with check (public.is_super_admin());
drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams for update to authenticated
  using (public.can_access_team(id) and (public.is_super_admin() or exists (
    select 1 from public.team_admin_assignments taa where taa.team_id = id and taa.user_id = auth.uid()
  ))) with check (public.can_access_team(id));
drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams for delete to authenticated
  using (public.is_super_admin());

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select to authenticated
  using (public.can_access_team(team_id));
drop policy if exists team_members_manage on public.team_members;
create policy team_members_manage on public.team_members for all to authenticated
  using (public.is_super_admin() or exists (
    select 1 from public.team_admin_assignments taa where taa.team_id = team_members.team_id and taa.user_id = auth.uid()
  ))
  with check (public.is_super_admin() or exists (
    select 1 from public.team_admin_assignments taa where taa.team_id = team_members.team_id and taa.user_id = auth.uid()
  ));

drop policy if exists team_admin_assignments_select on public.team_admin_assignments;
create policy team_admin_assignments_select on public.team_admin_assignments for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());
drop policy if exists team_admin_assignments_manage on public.team_admin_assignments;
create policy team_admin_assignments_manage on public.team_admin_assignments for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists vendors_select on public.vendors;
create policy vendors_select on public.vendors for select to authenticated using (true);
drop policy if exists vendors_manage on public.vendors;
create policy vendors_manage on public.vendors for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists vendor_api_keys_manage on public.vendor_api_keys;
create policy vendor_api_keys_manage on public.vendor_api_keys for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select to authenticated
  using (
    (account_id is not null and public.can_access_user(account_id))
    or exists (select 1 from public.order_agents oa where oa.order_id = id and oa.user_id = auth.uid())
  );
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert to authenticated
  with check (account_id is not null and public.can_access_user(account_id));
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update to authenticated
  using (account_id is not null and public.can_access_user(account_id))
  with check (account_id is not null and public.can_access_user(account_id));
drop policy if exists orders_delete on public.orders;
create policy orders_delete on public.orders for delete to authenticated
  using (account_id is not null and public.can_access_user(account_id));

drop policy if exists order_agents_select on public.order_agents;
create policy order_agents_select on public.order_agents for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.orders o where o.id = order_id and o.account_id is not null and public.can_access_user(o.account_id)
  ));
drop policy if exists order_agents_manage on public.order_agents;
create policy order_agents_manage on public.order_agents for all to authenticated
  using (public.is_super_admin() or exists (
    select 1 from public.orders o where o.id = order_id and o.account_id is not null and public.is_team_admin_for(o.account_id)
  ))
  with check (public.is_super_admin() or exists (
    select 1 from public.orders o where o.id = order_id and o.account_id is not null and public.is_team_admin_for(o.account_id)
  ));

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select to authenticated
  using (public.can_access_lead(id));
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert to authenticated
  with check (public.is_super_admin());
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update to authenticated
  using (public.can_access_lead(id)) with check (
    assigned_to is null or public.can_access_user(assigned_to)
  );
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete to authenticated
  using (public.is_super_admin());

drop policy if exists call_logs_select on public.call_logs;
create policy call_logs_select on public.call_logs for select to authenticated
  using (public.can_access_user(agent_id));
drop policy if exists call_logs_insert on public.call_logs;
create policy call_logs_insert on public.call_logs for insert to authenticated
  with check (agent_id = auth.uid() and public.can_access_lead(lead_id));
drop policy if exists call_logs_update on public.call_logs;
create policy call_logs_update on public.call_logs for update to authenticated
  using (agent_id = auth.uid()) with check (agent_id = auth.uid());

drop policy if exists disputes_select on public.disputes;
create policy disputes_select on public.disputes for select to authenticated
  using (public.can_access_user(agent_id));
drop policy if exists disputes_insert on public.disputes;
create policy disputes_insert on public.disputes for insert to authenticated
  with check (public.can_access_user(agent_id) and public.can_access_lead(lead_id));
drop policy if exists disputes_update on public.disputes;
create policy disputes_update on public.disputes for update to authenticated
  using (public.is_super_admin() or public.is_team_admin_for(agent_id))
  with check (public.is_super_admin() or public.is_team_admin_for(agent_id));

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists wallet_transactions_select on public.wallet_transactions;
create policy wallet_transactions_select on public.wallet_transactions for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

insert into storage.buckets (id, name, public)
values
  ('profile-pictures', 'profile-pictures', true),
  ('team-logos', 'team-logos', true),
  ('vendor-logos', 'vendor-logos', true),
  ('call-recordings', 'call-recordings', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists call_recordings_insert_own on storage.objects;
create policy call_recordings_insert_own on storage.objects for insert to authenticated
  with check (
    bucket_id = 'call-recordings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists call_recordings_update_own on storage.objects;
create policy call_recordings_update_own on storage.objects for update to authenticated
  using (bucket_id = 'call-recordings' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'call-recordings' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists call_recordings_delete_own on storage.objects;
create policy call_recordings_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'call-recordings' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
