begin;

update storage.buckets
set public = false
where id = 'call-recordings';

drop policy if exists call_logs_select on public.call_logs;
create policy call_logs_select
on public.call_logs for select to authenticated
using (
  public.can_access_user(agent_id)
  or public.can_access_lead(lead_id)
);

commit;
