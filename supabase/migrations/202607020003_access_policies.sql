begin;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_admin_assignments enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_api_keys enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (public.can_access_user(id));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams
for select to authenticated
using (public.can_access_team(id));

drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams
for update to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.team_admin_assignments taa
    where taa.team_id = teams.id and taa.user_id = auth.uid()
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.team_admin_assignments taa
    where taa.team_id = teams.id and taa.user_id = auth.uid()
  )
);

drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams
for delete to authenticated
using (public.is_super_admin());

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
for select to authenticated
using (public.can_access_team(team_id));

drop policy if exists team_members_insert on public.team_members;
create policy team_members_insert on public.team_members
for insert to authenticated
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.team_admin_assignments taa
    where taa.team_id = team_members.team_id and taa.user_id = auth.uid()
  )
);

drop policy if exists team_members_update on public.team_members;
create policy team_members_update on public.team_members
for update to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.team_admin_assignments taa
    where taa.team_id = team_members.team_id and taa.user_id = auth.uid()
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.team_admin_assignments taa
    where taa.team_id = team_members.team_id and taa.user_id = auth.uid()
  )
);

drop policy if exists team_members_delete on public.team_members;
create policy team_members_delete on public.team_members
for delete to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.team_admin_assignments taa
    where taa.team_id = team_members.team_id and taa.user_id = auth.uid()
  )
);

drop policy if exists team_admin_assignments_select on public.team_admin_assignments;
create policy team_admin_assignments_select on public.team_admin_assignments
for select to authenticated
using (public.can_access_team(team_id));

drop policy if exists team_admin_assignments_insert on public.team_admin_assignments;
create policy team_admin_assignments_insert on public.team_admin_assignments
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists team_admin_assignments_update on public.team_admin_assignments;
create policy team_admin_assignments_update on public.team_admin_assignments
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists team_admin_assignments_delete on public.team_admin_assignments;
create policy team_admin_assignments_delete on public.team_admin_assignments
for delete to authenticated
using (public.is_super_admin());

drop policy if exists vendors_select on public.vendors;
create policy vendors_select on public.vendors
for select to authenticated
using (true);

drop policy if exists vendors_insert on public.vendors;
create policy vendors_insert on public.vendors
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists vendors_update on public.vendors;
create policy vendors_update on public.vendors
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists vendors_delete on public.vendors;
create policy vendors_delete on public.vendors
for delete to authenticated
using (public.is_super_admin());

drop policy if exists vendor_api_keys_select on public.vendor_api_keys;
create policy vendor_api_keys_select on public.vendor_api_keys
for select to authenticated
using (public.is_super_admin());

drop policy if exists vendor_api_keys_insert on public.vendor_api_keys;
create policy vendor_api_keys_insert on public.vendor_api_keys
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists vendor_api_keys_update on public.vendor_api_keys;
create policy vendor_api_keys_update on public.vendor_api_keys
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists vendor_api_keys_delete on public.vendor_api_keys;
create policy vendor_api_keys_delete on public.vendor_api_keys
for delete to authenticated
using (public.is_super_admin());

commit;
