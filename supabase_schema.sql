-- Run this entire script in Supabase Dashboard > SQL Editor > New query.
-- Each account can only access its own shop data. Never use service_role key in the website.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text default '',
  size text default '',
  color text default '',
  sku text not null,
  barcode text not null,
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  selling_price numeric(12,2) not null default 0 check (selling_price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  low_stock_at integer not null default 2 check (low_stock_at >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, barcode),
  unique(user_id, sku)
);
create table if not exists public.shop_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  shop_name text not null default 'My Clothing Store',
  phone text default '',
  address text default '',
  tag_style text default 'professional',
  updated_at timestamptz not null default now()
);
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receipt_no text not null,
  customer_name text default '',
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, receipt_no)
);
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  product_barcode text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.shop_settings enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "products own rows" on public.products;
create policy "products own rows" on public.products for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "settings own rows" on public.shop_settings;
create policy "settings own rows" on public.shop_settings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sales own rows" on public.sales;
create policy "sales select own rows" on public.sales for select to authenticated using (auth.uid() = user_id);
drop policy if exists "sales insert own rows" on public.sales;
create policy "sales insert own rows" on public.sales for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "sales update own rows" on public.sales;
create policy "sales update own rows" on public.sales for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "sale items own rows" on public.sale_items;
create policy "sale items select own rows" on public.sale_items for select to authenticated using (auth.uid() = user_id);
drop policy if exists "sale items insert own rows" on public.sale_items;
create policy "sale items insert own rows" on public.sale_items for insert to authenticated with check (auth.uid() = user_id);

-- Atomic checkout: inserts sale/items and decreases stock in one database transaction.
create or replace function public.checkout_sale(p_customer_name text, p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_sale_id uuid := gen_random_uuid();
  v_receipt text := 'BILL-' || to_char(now() at time zone 'Asia/Kolkata','YYMMDD-HH24MISS') || '-' || upper(substr(replace(v_sale_id::text,'-',''),1,4));
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_price numeric(12,2);
begin
  if v_user is null then raise exception 'Login required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  insert into public.sales(id,user_id,receipt_no,customer_name,total)
  values(v_sale_id,v_user,v_receipt,coalesce(p_customer_name,''),0);

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 then raise exception 'Invalid quantity'; end if;
    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and user_id = v_user for update;
    if not found then raise exception 'Product not found'; end if;
    if v_product.stock_qty < v_qty then raise exception 'Not enough stock for %', v_product.name; end if;
    v_price := (v_item->>'unit_price')::numeric;
    if v_price < 0 then raise exception 'Invalid price'; end if;

    insert into public.sale_items(sale_id,user_id,product_id,product_name,product_barcode,quantity,unit_price,line_total)
    values(v_sale_id,v_user,v_product.id,v_product.name,v_product.barcode,v_qty,v_price,v_qty*v_price);
    update public.products set stock_qty=stock_qty-v_qty, updated_at=now() where id=v_product.id and user_id=v_user;
    v_total := v_total + v_qty*v_price;
  end loop;

  update public.sales set total=v_total where id=v_sale_id;
  return jsonb_build_object('id',v_sale_id,'receipt_no',v_receipt,'total',v_total);
end;
$$;
grant execute on function public.checkout_sale(text,jsonb) to authenticated;

-- The website reads sales with nested sale_items. RLS on sale_items is enabled above.
