-- Orders: mesa / evento
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text default '',
  host_id text,
  locked boolean not null default false,
  created_at timestamptz not null default now()
);

-- Items por invitado
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  guest_name text not null,
  dish text not null,
  price numeric(10, 2),
  notes text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items(order_id);

-- Realtime: habilitar para orders y order_items
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;

-- RLS: permitir lectura/escritura anónima para MVP (link compartido sin auth)
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "orders allow all" on public.orders for all using (true) with check (true);
create policy "order_items allow all" on public.order_items for all using (true) with check (true);
