create table public.portal_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table public.customer_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  name text not null,
  company text not null,
  message text not null default '',
  kind text not null check (kind in ('business', 'event')),
  details jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  notification_sent boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  unique (email, kind)
);
create table public.customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);
alter table public.portal_admins enable row level security;
alter table public.customer_requests enable row level security;
alter table public.customers enable row level security;
revoke all on public.portal_admins, public.customer_requests, public.customers from anon, authenticated;
grant all on public.portal_admins, public.customer_requests, public.customers to service_role;
grant select on public.portal_admins, public.customers to authenticated;
create policy "Read own admin membership" on public.portal_admins for select to authenticated using (user_id = (select auth.uid()));
create policy "Read own customer membership" on public.customers for select to authenticated using (user_id = (select auth.uid()));

-- Only the server can approve. Lock the request so competing decisions cannot overwrite each other.
create function public.finalize_customer_approval(request_id uuid, user_id uuid, reviewer_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare request public.customer_requests;
begin
  if not exists (select 1 from public.portal_admins a where a.user_id = reviewer_id) then
    raise exception 'Administrator access required';
  end if;
  select * into strict request from public.customer_requests r where r.id = request_id for update;
  if request.status <> 'pending' then raise exception 'Request already reviewed'; end if;
  if not exists (select 1 from auth.users u where u.id = user_id and lower(u.email) = request.email) then
    raise exception 'Customer identity mismatch';
  end if;
  insert into public.customers(user_id, email) values (user_id, request.email)
    on conflict on constraint customers_pkey do update set email = excluded.email;
  update public.customer_requests r set status = 'approved', reviewed_at = now(), reviewed_by = reviewer_id where r.id = request_id;
end;
$$;
revoke all on function public.finalize_customer_approval(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.finalize_customer_approval(uuid, uuid, uuid) to service_role;
