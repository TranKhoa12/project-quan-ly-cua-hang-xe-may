-- Foundation only. The demo UI does not yet read/write these tables.
-- Run on a new Supabase project. No users or passwords are seeded.
begin;

create type public.staff_role as enum ('manager', 'sales', 'technician');
create type public.repair_status as enum ('received', 'awaiting_approval', 'in_progress', 'ready', 'delivered', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id),
  full_name text not null,
  role public.staff_role not null default 'technician',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create function public.is_manager() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active and role = 'manager');
$$;

create function public.is_staff() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and active);
$$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) > 0),
  phone text,
  address text,
  created_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  plate text not null,
  model text not null,
  created_at timestamptz not null default now()
);
create unique index vehicles_plate_unique on public.vehicles (upper(regexp_replace(plate, '[^a-zA-Z0-9]', '', 'g')));

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  category text not null default '',
  brand text not null default '',
  sale_price bigint not null check(sale_price >= 0),
  minimum_stock integer not null default 0 check(minimum_stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Prices and quantities stay separate so staff cannot query purchase costs.
create table public.part_costs (
  part_id uuid primary key references public.parts(id),
  average_cost numeric(18,4) not null default 0 check(average_cost >= 0)
);
create table public.stock_balances (
  part_id uuid primary key references public.parts(id),
  quantity integer not null default 0 check(quantity >= 0)
);

create table public.repair_orders (
  id uuid primary key default gen_random_uuid(),
  code bigint generated always as identity unique,
  vehicle_id uuid not null references public.vehicles(id),
  issue text not null,
  status public.repair_status not null default 'received',
  technician_id uuid references public.profiles(id),
  labor_amount bigint not null default 0 check(labor_amount >= 0),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create table public.repair_part_items (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references public.repair_orders(id),
  part_id uuid not null references public.parts(id),
  name_snapshot text not null,
  quantity integer not null check(quantity > 0),
  unit_price bigint not null check(unit_price >= 0)
);

create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  code bigint generated always as identity unique,
  idempotency_key uuid not null unique,
  customer_id uuid references public.customers(id),
  customer_name text not null default 'Khách lẻ',
  total bigint not null check(total >= 0),
  payment_method text not null check(payment_method in ('cash', 'transfer')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales_orders(id),
  part_id uuid not null references public.parts(id),
  name_snapshot text not null,
  quantity integer not null check(quantity > 0),
  unit_price bigint not null check(unit_price >= 0)
);
create table public.sale_item_costs (
  item_id uuid primary key references public.sales_order_items(id),
  unit_cost numeric(18,4) not null check(unit_cost >= 0)
);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id),
  quantity integer not null check(quantity <> 0),
  reason text not null,
  sale_id uuid references public.sales_orders(id),
  repair_id uuid references public.repair_orders(id),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  sale_id uuid references public.sales_orders(id),
  repair_id uuid references public.repair_orders(id),
  amount bigint not null check(amount > 0),
  method text not null check(method in ('cash', 'transfer')),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  check(num_nonnulls(sale_id, repair_id) = 1)
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index vehicles_customer_idx on public.vehicles(customer_id);
create index repair_orders_technician_idx on public.repair_orders(technician_id);
create index repair_orders_vehicle_idx on public.repair_orders(vehicle_id);
create index stock_movements_part_idx on public.stock_movements(part_id, created_at desc);
create index payments_repair_idx on public.payments(repair_id);
create index sale_items_sale_idx on public.sales_order_items(sale_id);
create index repair_items_repair_idx on public.repair_part_items(repair_id);

-- Deny anonymous access to every business table.
-- Stock, financial records and audit rows have no browser write policy.
-- Add atomic, permission-checked RPCs before connecting production workflows.
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','customers','vehicles','parts','part_costs','stock_balances','repair_orders','repair_part_items','sales_orders','sales_order_items','sale_item_costs','stock_movements','payments','audit_logs'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon', table_name);
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from authenticated', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
    execute format('create policy manager_read on public.%I for select to authenticated using (public.is_manager())', table_name);
  end loop;
end $$;

create policy own_profile_read on public.profiles for select to authenticated using(id = auth.uid());
create policy staff_parts_read on public.parts for select to authenticated using(public.is_staff());
create policy staff_stock_read on public.stock_balances for select to authenticated using(public.is_staff());
create policy technician_repairs_read on public.repair_orders for select to authenticated using(technician_id = auth.uid() and public.is_staff());

revoke all on function public.is_manager() from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_manager() to authenticated;
grant execute on function public.is_staff() to authenticated;

commit;
