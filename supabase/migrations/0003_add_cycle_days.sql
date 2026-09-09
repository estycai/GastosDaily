-- Mirrors the schema already applied to the remote project (ref vsniofvjuminnkjladdi).
-- Applied via Supabase migration `add_cycle_days`. Do not re-apply to remote.

-- Sealed per-day snapshots. The daily allowance in dynamic mode is path-dependent:
-- day N's limit is a function of every expense before it. Deriving it on read means the
-- streak silently rewrites itself whenever total_budget or end_date changes, so a closed
-- day is frozen here instead.
--
-- allowance_cents and spent_cents are both stored on purpose. Storing only the delta would
-- leave the snapshot self-contradictory: spent is recomputed from `expenses`, which is
-- mutable, so a backdated expense would imply a limit that never existed.
--
-- Money is integer cents here, unlike numeric(12,2) in `cycles` and `expenses`. The
-- comparison spent <= allowance decides whether a streak survives, and the domain layer is
-- already cents-native (centsToDollars is the boundary). Deliberate exception.
create table public.cycle_days (
  id              uuid default gen_random_uuid() primary key,
  cycle_id        uuid references public.cycles(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,
  day             date not null,
  allowance_cents integer not null check (allowance_cents >= 0),
  spent_cents     integer not null check (spent_cents >= 0),
  saved_cents     integer generated always as (allowance_cents - spent_cents) stored,
  sealed_at       timestamp with time zone not null default timezone('utc'::text, now()),
  constraint cycle_days_unique_day unique (cycle_id, day)
);

-- Streak and heatmap read a whole cycle in day order.
create index cycle_days_cycle_day_idx on public.cycle_days (cycle_id, day);
create index cycle_days_user_idx on public.cycle_days (user_id);

alter table public.cycle_days enable row level security;

-- Same authorization boundary as the other tables: the browser client holds only the
-- publishable key, so a session JWT hitting PostgREST directly stays confined to its own
-- rows. Repository-level .eq('user_id', ...) filters are convenience, not a control.
create policy "Users can manage their own cycle days"
  on public.cycle_days for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
