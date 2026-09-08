# Gastos Daily — Build Brief

Single source of truth for every worker on this project. Read this **before** `spec.md`.
Where this file and `spec.md` disagree, **this file wins** (it records decisions made after the spec).

---

## 1. Product

Mobile-first PWA that answers one question: **"how much can I spend today?"**

Given a budget for a cycle (e.g. `$300.000`) and a cycle end date (e.g. `30 Sep`), the app
recomputes a daily allowance from actual spending, so under-spending today raises tomorrow's
allowance and over-spending lowers it.

## 2. Locked decisions

| Decision | Value | Rationale |
| --- | --- | --- |
| Auth | Supabase **magic link** (`signInWithOtp`) — ~~anonymous~~ | **Superseded 2026-09-08.** The product now needs an Apple Shortcut to POST expenses to an HTTP endpoint. A Shortcut has no browser and no session, so identity must be stable and recoverable across devices. Anonymous sessions are per-device and unrecoverable — clearing browser data orphans the data permanently. |
| External write access | Personal API token + **Supabase Edge Function** | The Shortcut sends `Authorization: Bearer <token>`. A dedicated Node/Fastify server was rejected: its only job would be forwarding to Supabase, at the cost of hosting, a deploy pipeline and secret management. |
| Repo layout | Single app + `supabase/functions/` — **not** `/front` + `/back` | Edge Functions deploy from `supabase/functions` by convention. A root-level front/back split would add two package manifests and a workspace tool for one static deployable plus one function. |
| `Historial` tab | Rendered, **disabled**, empty state | No design exists for it. Do not invent a screen. |
| Screens to build | `Hoy` (Dashboard), `Registrar Gasto`, `Ajustes`, **`Login`** | The first three come from the design. `Login` has no design and must be derived strictly from the tokens in section 4. |
| UI copy language | **Spanish (es-AR)** — matches the design verbatim | The design is the contract. |
| Code, identifiers, comments | **English** | Standard. |
| Currency formatting | `es-AR`, `ARS`, no decimals — `$ 10.000` | Matches the design. |

## 3. Stack (already installed — do NOT run `npm install`)

React 19 · Vite · TypeScript · Tailwind CSS v4 (`@tailwindcss/vite`) · `lucide-react` ·
`@supabase/supabase-js` · `vite-plugin-pwa` · `vitest`

`package.json` and `package-lock.json` are **frozen**. If you genuinely need another package,
stop and `ask` the coordinator instead of installing it.

## 4. Design source of truth

Never eyeball the PNG. The exact geometry is exported to:

- `design/screen-1-dashboard.jsx`
- `design/screen-2-registrar.jsx`
- `design/screen-3-ajustes.jsx`

`gastos-daily-preview.png` is a visual reference only. Frames are `393 × 852` (iPhone 15 Pro).
Content width is `353` (so `20px` horizontal page padding).

### Palette (extracted from the design, not invented)

```css
:root {
  --gd-bg: #0B0E14;          /* app background */
  --gd-surface: #111827;     /* cards, inputs */
  --gd-surface-alt: #1E293B; /* raised / secondary surface, chips */
  --gd-border: #1E293B;

  --gd-text: #F8FAFC;        /* primary text */
  --gd-text-muted: #94A3B8;  /* labels, secondary */
  --gd-text-dim: #64748B;    /* tertiary, timestamps */

  --gd-accent: #2563EB;      /* primary CTA blue */
  --gd-accent-strong: #1D4ED8;
  --gd-accent-soft: #3B82F6;
  --gd-accent-text: #60A5FA; /* "PODÉS GASTAR HOY" label */

  --gd-success: #34D399;
  --gd-success-bg: #064E3B;
  --gd-warning: #F59E0B;     /* progress bar at 66% */
  --gd-danger: #EF4444;      /* expense amounts */
  --gd-info: #38BDF8;
}
```

### Type scale — `Inter`, all of it

| Role | Size / weight / line-height |
| --- | --- |
| Hero amount | `46 / 700 / 56` |
| Hero amount (secondary screen) | `42 / 700 / 51` |
| Screen title | `22 / 700 / 27` |
| Section heading | `20 / 700 / 24` |
| Numpad digit | `18 / 400 / 22` and `18 / 700 / 22` |
| Body / value | `16 / 400 / 20`, `15 / 700 / 18`, `15 / 400 / 18` |
| Label | `14 / 400 / 17`, `14 / 700 / 17` |
| Small / meta | `13`, `12`, `11` (weights 400/500/700) |
| Micro | `10 / 400 / 12` |

Follow the codegen conventions: use Tailwind utilities directly for spacing, size, weight and
radius (arbitrary values like `text-[13px]` are fine). Only **semantic colors** become CSS
custom properties.

## 5. Business rule

```
dailyAllowance = (totalBudget - sumOfCycleExpenses) / daysRemaining
```

- `daysRemaining` counts **today inclusive** through the end date.
- Pace badge: spent-today `<=` allowance → green "Dentro del ritmo planeado";
  otherwise amber/red "Superaste el límite sugerido hoy".
- `calc_mode = 'fixed'` divides the budget evenly across the whole cycle and ignores carry-over.
- All money math uses integer **cents** internally. Never accumulate floats.
- Guard every edge: `daysRemaining <= 0`, budget exhausted (clamp at `0`, never negative),
  empty cycle, expense larger than what remains.

## 6. Architecture

```
src/
  domain/            pure TS, zero imports from react/supabase — the calculator lives here
  application/       hooks + state orchestration
  infrastructure/
    supabase/        client, generated types, repositories
    auth/            anonymous session bootstrap
  ui/
    components/      reusable primitives
    screens/         Dashboard, RegisterExpense, Settings
```

Rule: `domain` imports nothing. `ui` never imports `infrastructure` directly — it goes through
`application`.

## 7. Backend — already provisioned

- Project ref: `vsniofvjuminnkjladdi` · region `sa-east-1`
- URL and publishable key are in `.env.local` (gitignored) and `.env.example`.
- Tables `public.cycles` and `public.expenses` exist with RLS enabled and per-user policies.
  `cycles` additionally has `calc_mode text` (`'dynamic' | 'fixed'`) and a unique partial index
  guaranteeing **one active cycle per user**.
- The migration is already applied remotely. Mirror it into `supabase/migrations/` for the repo
  record; do not re-apply it.

## 7b. External API — the Apple Shortcut contract

One Edge Function, deployed at:

```
POST https://vsniofvjuminnkjladdi.supabase.co/functions/v1/register-expense
Authorization: Bearer gd_<token>
Content-Type: application/json

{ "amount": 4500, "concept": "Almuerzo", "category": "comida" }
```

- `amount` is in **pesos** (what a human types into a Shortcut), converted to cents server-side.
  Reject non-finite, zero, negative, and absurd values.
- Response `200`: `{ "ok": true, "expenseId", "dailyAllowance", "remainingToday", "daysRemaining" }`
  so the Shortcut can show a useful confirmation instead of a bare success.
- Errors are JSON with a stable `error` code, never an HTML page:
  `401 invalid_token` · `403 token_revoked` · `404 no_active_cycle` · `400 invalid_payload` · `405 method_not_allowed`.

**Token scheme** — the security boundary, get this exactly right:

- Format `gd_` + 32 random bytes, base64url. Generated with a CSPRNG, never `Math.random`.
- The database stores **only** the SHA-256 hex hash in `api_tokens.token_hash`.
  The plaintext is shown to the user once, at creation, and is never recoverable afterwards.
- The function hashes the incoming bearer token and looks up that hash. Lookup is by hash, so
  a leaked database still yields no usable token.
- Reject any token whose `revoked_at` is set. Touch `last_used_at` on success.
- The function uses the **service role** key from the `SUPABASE_SERVICE_ROLE_KEY` environment
  variable, only *after* resolving the token to a `user_id`. Every subsequent query is scoped
  to that `user_id`. The service role key must never appear in client code, in `.env.local`,
  in the repo, or in any log line.

## 8. Definition of done

- `npm run build` and `npx tsc --noEmit` pass clean.
- `npx vitest run` passes, with real coverage of the calculator's edge cases.
- All three screens match the exported design geometry.
- App boots with no session and self-provisions: anonymous sign-in → no active cycle →
  Settings screen so the user can set budget and closing date.
- Installable PWA: manifest, icons, service worker, dark theme color.
- No secret is committed.
