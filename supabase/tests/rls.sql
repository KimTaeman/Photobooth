begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(7);

insert into public.settings (key, value) values ('theme', 'premium')
on conflict (key) do update set value = excluded.value;

set local role authenticated;
set local request.jwt.claims = '{"app_metadata":{"role":"operator"}}';

select lives_ok(
  $$insert into public.sessions (id, frame, has_video) values ('session_00000000-0000-4000-8000-000000000010', '/frame1.png', false)$$,
  'operators can insert validated kiosk sessions'
);
select is((select count(*)::integer from public.sessions), 0, 'operators cannot enumerate sessions');
select throws_ok(
  $$select public.update_settings('{"theme":"cute"}'::jsonb)$$,
  '42501',
  'admin role required',
  'operators cannot update settings'
);

set local request.jwt.claims = '{"app_metadata":{"role":"admin"}}';
select is((select count(*)::integer from public.sessions), 1, 'admins can read sessions');
select lives_ok(
  $$select public.update_settings('{"theme":"cute"}'::jsonb)$$,
  'admins can update settings transactionally'
);
select is((select value from public.settings where key = 'theme'), 'cute', 'settings update is visible');
select lives_ok(
  $$delete from public.sessions where id = 'session_00000000-0000-4000-8000-000000000010'$$,
  'admins can delete sessions'
);

select * from finish();
rollback;
