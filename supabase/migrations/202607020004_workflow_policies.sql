begin;

alter table public.orders enable row level security;
alter table public.order_agents enable row level security;
alter table public.leads enable row level security;
alter table public.call_logs enable row level security;
alter table public.disputes enable row level security;
alter table public.notifications enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
for select to authenticated
using (
  (account_id is not null and public.can_access_user(account_id))
  or exists (
    select 1 from public.order_agents oa
    where oa.order_id = orders.id and oa.user_id = auth.uid()
  )
);

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
for insert to authenticated
with check (account_id is not null and public.can_access_user(account_id));

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
for update to authenticated
using (account_id is not null and public.can_access_user(account_id))
with check (account_id is not null and public.can_access_user(account_id));

drop policy if exists orders_delete on public.orders;
create policy orders_delete on public.orders
for delete to authenticated
using (account_id is not null and public.can_access_user(account_id));

drop policy if exists order_agents_select on public.order_agents;
create policy order_agents_select on public.order_agents
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.orders o
    where o.id = order_agents.order_id
      and o.account_id is not null
      and public.can_access_user(o.account_id)
  )
);

drop policy if exists order_agents_insert on public.order_agents;
create policy order_agents_insert on public.order_agents
for insert to authenticated
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.orders o
    where o.id = order_agents.order_id
      and o.account_id is not null
      and public.is_team_admin_for(o.account_id)
  )
);

drop policy if exists order_agents_delete on public.order_agents;
create policy order_agents_delete on public.order_agents
for delete to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.orders o
    where o.id = order_agents.order_id
      and o.account_id is not null
      and public.is_team_admin_for(o.account_id)
  )
);

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads
for select to authenticated
using (public.can_access_lead(id));

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
for update to authenticated
using (public.can_access_lead(id))
with check (assigned_to is null or public.can_access_user(assigned_to));

drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads
for delete to authenticated
using (public.is_super_admin());

drop policy if exists call_logs_select on public.call_logs;
create policy call_logs_select on public.call_logs
for select to authenticated
using (public.can_access_user(agent_id));

drop policy if exists call_logs_insert on public.call_logs;
create policy call_logs_insert on public.call_logs
for insert to authenticated
with check (agent_id = auth.uid() and public.can_access_lead(lead_id));

drop policy if exists call_logs_update on public.call_logs;
create policy call_logs_update on public.call_logs
for update to authenticated
using (agent_id = auth.uid())
with check (agent_id = auth.uid());

drop policy if exists disputes_select on public.disputes;
create policy disputes_select on public.disputes
for select to authenticated
using (public.can_access_user(agent_id));

drop policy if exists disputes_insert on public.disputes;
create policy disputes_insert on public.disputes
for insert to authenticated
with check (public.can_access_user(agent_id) and public.can_access_lead(lead_id));

drop policy if exists disputes_update on public.disputes;
create policy disputes_update on public.disputes
for update to authenticated
using (public.is_super_admin() or public.is_team_admin_for(agent_id))
with check (public.is_super_admin() or public.is_team_admin_for(agent_id));

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
for select to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists wallet_transactions_select on public.wallet_transactions;
create policy wallet_transactions_select on public.wallet_transactions
for select to authenticated
using (user_id = auth.uid() or public.is_super_admin());

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete, truncate, references, trigger on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

commit;
