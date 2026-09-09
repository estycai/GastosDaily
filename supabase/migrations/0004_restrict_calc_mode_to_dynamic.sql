-- Mirrors the schema already applied to the remote project (ref vsniofvjuminnkjladdi).
-- Applied via Supabase migration `restrict_calc_mode_to_dynamic`. Do not re-apply to remote.

-- The product ships dynamic-only: the `fixed` branch was removed from the domain, the UI
-- selector, and the register-expense edge function. 0 rows ever used 'fixed'.
--
-- The column is kept rather than dropped. A text column with a single allowed value costs
-- nothing, and restoring the second mode later is a one-line constraint change instead of
-- an irreversible schema loss.
alter table public.cycles
  drop constraint cycles_calc_mode_check;

alter table public.cycles
  add constraint cycles_calc_mode_check
  check (calc_mode = 'dynamic');
