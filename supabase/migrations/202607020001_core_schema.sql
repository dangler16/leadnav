begin;

create extension if not exists pgcrypto;

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

create unique index if not exists wallet_transactions_payment_intent_uidx on public.wallet_transactions (stripe_payment_intent_id) where stripe_payment_intent_id is not null;
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at before update on public.teams for each row execute function public.set_updated_at();
drop trigger if exists set_vendors_updated_at on public.vendors;
create trigger set_vendors_updated_at before update on public.vendors for each row execute function public.set_updated_at();
drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
drop trigger if exists set_disputes_updated_at on public.disputes;
create trigger set_disputes_updated_at before update on public.disputes for each row execute function public.set_updated_at();

commit;
