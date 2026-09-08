-- Mirrors the schema already applied to the remote project (ref vsniofvjuminnkjladdi).
-- Verified against pg_policy on the live database. Do not re-apply to remote.

-- Personal API tokens: let external clients (Apple Shortcuts, widgets) write expenses
-- on behalf of a user. Only the SHA-256 hash is stored; the plaintext token is shown
-- to the user exactly once, at creation time, and is never recoverable afterwards.
create table public.api_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  token_hash text not null unique,
  label text not null default 'Apple Shortcut',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_used_at timestamp with time zone,
  revoked_at timestamp with time zone
);

create index api_tokens_user_idx on public.api_tokens (user_id);

alter table public.api_tokens enable row level security;

-- Users may list, label and revoke their own tokens from the app.
-- This policy is the real authorization boundary: the browser client holds only the
-- publishable key, so a session JWT hitting PostgREST directly is still confined to
-- its own rows. The `.eq('user_id', ...)` filters in the repository layer are a
-- convenience, not a security control.
--
-- Reading back a `token_hash` grants nothing: it is a SHA-256 digest and cannot be
-- reversed into the bearer token the edge function expects.
create policy "Users can manage their own api tokens"
  on public.api_tokens for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
