begin;

alter table public.wallet_transactions
  add column if not exists order_id uuid references public.orders(id) on delete set null;

create index if not exists wallet_transactions_order_created_idx
  on public.wallet_transactions (order_id, created_at desc)
  where type = 'charge';

commit;
