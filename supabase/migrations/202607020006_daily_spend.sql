begin;

create or replace function public.get_order_spend_today(p_order_ids uuid[])
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
    and wt.created_at >= date_trunc('day', now())
  group by wt.order_id;
$$;

commit;
