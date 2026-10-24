-- Server-only delivery reservations for approved customers and administrators.
create table public.portal_login_deliveries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reserved_at timestamptz not null default now()
);
alter table public.portal_login_deliveries enable row level security;
revoke all on public.portal_login_deliveries from public, anon, authenticated;
grant all on public.portal_login_deliveries to service_role;

create function public.reserve_portal_login(login_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare eligible_id uuid; reserved_id uuid;
begin
  select u.id into eligible_id from auth.users u
  where lower(u.email) = lower(trim(login_email)) and (
    exists (select 1 from public.customers c where c.user_id = u.id)
    or exists (select 1 from public.portal_admins a where a.user_id = u.id)
  );
  if eligible_id is null then return null; end if;
  insert into public.portal_login_deliveries as deliveries(user_id, reserved_at)
  values (eligible_id, now())
  on conflict (user_id) do update set reserved_at = excluded.reserved_at
    where deliveries.reserved_at <= now() - interval '60 seconds'
  returning user_id into reserved_id;
  return reserved_id;
end;
$$;
revoke all on function public.reserve_portal_login(text) from public, anon, authenticated;
grant execute on function public.reserve_portal_login(text) to service_role;
