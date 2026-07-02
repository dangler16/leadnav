begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    'user'
  )
  on conflict (id) do update
    set first_name = case when public.profiles.first_name = '' then excluded.first_name else public.profiles.first_name end,
        last_name = case when public.profiles.last_name = '' then excluded.last_name else public.profiles.last_name end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, first_name, last_name, role)
select
  id,
  coalesce(raw_user_meta_data ->> 'first_name', ''),
  coalesce(raw_user_meta_data ->> 'last_name', ''),
  'user'
from auth.users
on conflict (id) do nothing;

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
      select 1
      from public.team_admin_assignments
      where team_id = target_team_id
        and user_id = auth.uid()
    )
    or exists (
      select 1
      from public.team_members
      where team_id = target_team_id
        and user_id = auth.uid()
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
          select 1
          from public.order_agents oa
          where oa.order_id = l.order_id
            and oa.user_id = auth.uid()
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

  select wallet_balance_cents
    into current_balance
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if p_stripe_payment_intent is not null and exists (
    select 1
    from public.wallet_transactions
    where stripe_payment_intent_id = p_stripe_payment_intent
  ) then
    return current_balance;
  end if;

  update public.profiles
  set wallet_balance_cents = wallet_balance_cents + p_amount_cents
  where id = p_user_id
  returning wallet_balance_cents into current_balance;

  insert into public.wallet_transactions (
    user_id,
    type,
    amount_cents,
    stripe_payment_intent_id,
    description
  ) values (
    p_user_id,
    'topup',
    p_amount_cents,
    p_stripe_payment_intent,
    p_description
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

  select wallet_balance_cents
    into current_balance
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
    user_id,
    type,
    amount_cents,
    lead_id,
    description
  ) values (
    p_user_id,
    'charge',
    p_amount_cents,
    p_lead_id,
    p_description
  );

  return true;
end;
$$;

revoke all on function public.credit_wallet(uuid, integer, text, text) from public;
revoke all on function public.deduct_wallet(uuid, integer, uuid, text) from public;
grant execute on function public.credit_wallet(uuid, integer, text, text) to service_role;
grant execute on function public.deduct_wallet(uuid, integer, uuid, text) to service_role;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_team_admin_for(uuid) to authenticated;
grant execute on function public.can_access_user(uuid) to authenticated;
grant execute on function public.can_access_team(uuid) to authenticated;
grant execute on function public.can_access_lead(uuid) to authenticated;

commit;
