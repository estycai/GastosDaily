-- Mirrors the schema already applied to the remote project (ref vsniofvjuminnkjladdi).
-- Kept for repository record and local rebuilds. Do not re-apply to remote.

-- Cycles: one budget period per user (budget + closing date)
create table public.cycles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  total_budget numeric(12, 2) not null check (total_budget > 0),
  start_date date not null default current_date,
  end_date date not null,
  calc_mode text not null default 'dynamic' check (calc_mode in ('dynamic', 'fixed')),
  is_active boolean not null default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint cycles_end_after_start check (end_date >= start_date)
);

-- Expenses: individual movements inside a cycle
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  cycle_id uuid references public.cycles(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  concept text,
  category text not null default 'varios',
  expense_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Only one active cycle per user
create unique index cycles_one_active_per_user
  on public.cycles (user_id)
  where is_active;

create index expenses_cycle_date_idx on public.expenses (cycle_id, expense_date desc);
create index expenses_user_idx on public.expenses (user_id);

alter table public.cycles enable row level security;
alter table public.expenses enable row level security;

create policy "Users can manage their own cycles"
  on public.cycles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own expenses"
  on public.expenses for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
