begin;

create or replace function public.get_order_spend_today(
  p_order_ids uuid[],
  p_timezone text
)
returns table (order_id uuid, spent_cents bigint)
language sql
stable
security definer
set search_path = public
as $$
  select wt.order_id, sum(wt.amount_cents)::bigint
  from public.wallet_transactions wt
  where wt.type = 'charge'
    and wt.order_id = any(p_order_ids)
    and wt.created_at >= (
      date_trunc('day', now() at time zone p_timezone) at time zone p_timezone
    )
  group by wt.order_id;
$$;

create or replace function public.get_order_spend_today(p_order_ids uuid[])
returns table (order_id uuid, spent_cents bigint)
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.get_order_spend_today(p_order_ids, 'America/Denver');
$$;

revoke execute on function public.get_order_spend_today(uuid[], text) from public;
revoke execute on function public.get_order_spend_today(uuid[]) from public;
grant execute on function public.get_order_spend_today(uuid[], text) to service_role;
grant execute on function public.get_order_spend_today(uuid[]) to service_role;

commit;
