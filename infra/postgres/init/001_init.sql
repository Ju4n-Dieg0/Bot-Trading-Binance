create extension if not exists "uuid-ossp";

create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  telegram_user_id text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id),
  symbol text not null,
  side text not null,
  status text not null,
  trading_mode text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_tenant_id on orders (tenant_id);

create table if not exists signals (
  id uuid primary key,
  symbol text not null,
  action text not null,
  probability_up numeric(10,8) not null,
  stop_loss numeric(18,8) not null,
  take_profit numeric(18,8) not null,
  created_at timestamptz not null
);

create index if not exists idx_signals_symbol_created_at on signals (symbol, created_at desc);

create table if not exists trades (
  id uuid primary key,
  signal_id uuid not null,
  symbol text not null,
  side text not null,
  quantity numeric(18,8) not null,
  requested_price numeric(18,8) not null,
  status text not null,
  executed_price numeric(18,8),
  executed_at timestamptz,
  rejection_reason text,
  exchange_order_id text,
  created_at timestamptz not null
);

create index if not exists idx_trades_symbol_status on trades (symbol, status);
create index if not exists idx_trades_created_at on trades (created_at desc);

create table if not exists positions (
  id uuid primary key,
  symbol text not null,
  side text not null,
  entry_price numeric(18,8) not null,
  quantity numeric(18,8) not null,
  status text not null,
  stop_loss numeric(18,8),
  take_profit numeric(18,8),
  opened_at timestamptz not null,
  closed_at timestamptz,
  exit_price numeric(18,8)
);

create index if not exists idx_positions_symbol_status on positions (symbol, status);
create index if not exists idx_positions_opened_at on positions (opened_at desc);

create table if not exists market_candles_cache (
  symbol text not null,
  timeframe text not null,
  open_time timestamptz not null,
  close_time timestamptz not null,
  open numeric(18,8) not null,
  high numeric(18,8) not null,
  low numeric(18,8) not null,
  close numeric(18,8) not null,
  volume numeric(20,8) not null,
  primary key (symbol, timeframe, open_time)
);

create index if not exists idx_market_candles_cache_symbol_time_open
  on market_candles_cache (symbol, timeframe, open_time desc);

insert into tenants (id, name)
values ('00000000-0000-0000-0000-000000000001', 'default-tenant')
on conflict (id) do nothing;
