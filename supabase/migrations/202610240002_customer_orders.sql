create table public.customer_profiles (
  user_id uuid primary key references public.customers(user_id) on delete cascade,
  full_name text not null default '', company text not null default '', phone text not null default '',
  updated_at timestamptz not null default now(),
  check (length(full_name) <= 120 and length(company) <= 160 and length(phone) <= 100)
);
insert into public.customer_profiles(user_id, full_name, company, phone)
select c.user_id, coalesce(r.name,''), coalesce(r.company,''), coalesce(r.details->>'phone','')
from public.customers c left join lateral (
  select * from public.customer_requests r where r.email=c.email and r.status='approved' order by r.created_at desc limit 1
) r on true;

create table public.products (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  name text not null, description text not null default '', image_url text not null,
  cans_per_case integer not null check (cans_per_case > 0),
  price_cents integer not null check (price_cents > 0), currency text not null default 'cad' check(currency='cad'),
  active boolean not null default true, is_placeholder boolean not null default true
);
insert into public.products(slug,name,description,image_url,cans_per_case,price_cents) values
('cucumber','Cucumber Calm','A crisp, refreshing placeholder drink.','/images/cucumber.webp',12,3600),
('peach','Peach Daydream','A bright, fruit-forward placeholder drink.','/images/peach.webp',12,3600),
('blackberry','Blackberry Bliss','A rich berry placeholder drink.','/images/blackberry.webp',12,3800),
('paloma','Paloma Spark','A citrus-inspired placeholder drink.','/images/paloma.webp',12,3800);

create table public.orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.customers(user_id),
  checkout_key uuid not null, checkout_origin text not null, items jsonb not null, cases integer not null check(cases >= 10),
  total_cents bigint not null check(total_cents>0), currency text not null default 'cad' check(currency='cad'),
  payment_status text not null default 'pending' check(payment_status in ('pending','paid','expired','refunded')),
  fulfillment_status text not null default 'received' check(fulfillment_status in ('received','processing','shipped','delivered')),
  stripe_session_id text unique, stripe_payment_intent_id text,
  shipping_details jsonb, tracking_number text not null default '', tracking_url text not null default '', carrier text not null default '',
  created_at timestamptz not null default now(), paid_at timestamptz, updated_at timestamptz not null default now(),
  unique(user_id,checkout_key)
);
create index orders_user_created_idx on public.orders(user_id,created_at desc);
create table public.stripe_events(id text primary key, created_at timestamptz not null default now());

alter table public.customer_profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.stripe_events enable row level security;
revoke all on public.customer_profiles, public.products, public.orders, public.stripe_events from public, anon, authenticated;
grant all on public.customer_profiles, public.products, public.orders, public.stripe_events to service_role;
grant select on public.customer_profiles, public.products, public.orders to authenticated;
create policy "Read own profile" on public.customer_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy "Approved customers read active products" on public.products for select to authenticated using(active and exists(select 1 from public.customers where user_id=(select auth.uid())));
create policy "Read own orders" on public.orders for select to authenticated using(user_id=(select auth.uid()));

-- Freeze product names and prices at order creation; callers cannot set the amount.
create function public.create_customer_order(customer_id uuid, request_key uuid, cart jsonb, customer_origin text)
returns public.orders language plpgsql security definer set search_path='' as $$
declare result public.orders; entry jsonb; product public.products; snapshots jsonb := '[]'; total bigint:=0; quantity integer; case_count integer:=0;
begin
  if not exists(select 1 from public.customers where user_id=customer_id) then raise exception 'Customer access required'; end if;
  if jsonb_typeof(cart)<>'array' or jsonb_array_length(cart)=0 or jsonb_array_length(cart)>50 then raise exception 'Invalid cart'; end if;
  perform pg_advisory_xact_lock(hashtextextended(customer_id::text || request_key::text,0));
  select * into result from public.orders where user_id=customer_id and checkout_key=request_key;
  if found then return result; end if;
  if (select count(*) from jsonb_array_elements(cart)) <> (select count(distinct x->>'product_id') from jsonb_array_elements(cart) x) then raise exception 'Duplicate product'; end if;
  for entry in select * from jsonb_array_elements(cart) loop
    if jsonb_typeof(entry->'quantity') <> 'number' or (entry->>'quantity') !~ '^[0-9]+$' then raise exception 'Invalid quantity'; end if;
    quantity := (entry->>'quantity')::integer;
    if quantity < 1 or quantity > 1000 then raise exception 'Quantity must be between 1 and 1000'; end if;
    select * into product from public.products where id=(entry->>'product_id')::uuid and active for share;
    if not found then raise exception 'Product unavailable'; end if;
    total := total + product.price_cents::bigint * quantity;
    case_count := case_count + quantity;
    snapshots := snapshots || jsonb_build_array(jsonb_build_object('product_id',product.id,'name',product.name,'price_cents',product.price_cents,'quantity',quantity,'cans_per_case',product.cans_per_case,'is_placeholder',product.is_placeholder));
  end loop;
  if case_count < 10 then raise exception 'Minimum order is 10 cases'; end if;
  if total > 99999999 then raise exception 'Order exceeds online checkout limit'; end if;
  insert into public.orders(user_id,checkout_key,checkout_origin,items,cases,total_cents) values(customer_id,request_key,customer_origin,snapshots,case_count,total) returning * into result;
  return result;
end; $$;
revoke all on function public.create_customer_order(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.create_customer_order(uuid,uuid,jsonb,text) to service_role;

-- Signed Stripe events are applied once, in the same transaction as the order update.
create function public.apply_order_payment(event_id text, order_id uuid, session_id text, amount bigint, payment_currency text, payment_intent text, shipping jsonb, event_kind text)
returns void language plpgsql security definer set search_path='' as $$
declare purchase public.orders;
begin
  if exists(select 1 from public.stripe_events where id=event_id) then return; end if;
  select * into strict purchase from public.orders where id=order_id for update;
  if purchase.stripe_session_id is not null and purchase.stripe_session_id<>session_id then raise exception 'Checkout session mismatch'; end if;
  if purchase.total_cents<>amount or purchase.currency<>payment_currency then raise exception 'Payment amount mismatch'; end if;
  insert into public.stripe_events(id) values(event_id) on conflict do nothing;
  if not found then return; end if;
  if event_kind='paid' then
    update public.orders set payment_status='paid', stripe_session_id=session_id, stripe_payment_intent_id=payment_intent, shipping_details=shipping, paid_at=coalesce(paid_at,now()), updated_at=now() where id=order_id and payment_status in ('pending','expired');
  elsif event_kind='expired' then
    update public.orders set payment_status='expired', stripe_session_id=session_id, updated_at=now() where id=order_id and payment_status='pending';
  else raise exception 'Unsupported payment event'; end if;
end; $$;
revoke all on function public.apply_order_payment(text,uuid,text,bigint,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.apply_order_payment(text,uuid,text,bigint,text,text,jsonb,text) to service_role;
