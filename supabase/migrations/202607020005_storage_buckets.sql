begin;

insert into storage.buckets (id, name, public)
values
  ('profile-pictures', 'profile-pictures', true),
  ('team-logos', 'team-logos', true),
  ('vendor-logos', 'vendor-logos', true),
  ('call-recordings', 'call-recordings', true)
on conflict (id) do update
set public = excluded.public;

commit;
