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
| Auth | Supabase **anonymous** sign-in (`signInAnonymously`) | The design has no login screen. Anonymous sessions give a real `auth.uid()` so RLS works unchanged, and can later be upgraded to email without data migration. |
| `Historial` tab | Rendered, **disabled**, empty state | No design exists for it. Do not invent a screen. |
| Screens to build | `Hoy` (Dashboard), `Registrar Gasto`, `Ajustes` | Exactly what the design contains. |
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

## 8. Definition of done

- `npm run build` and `npx tsc --noEmit` pass clean.
- `npx vitest run` passes, with real coverage of the calculator's edge cases.
- All three screens match the exported design geometry.
- App boots with no session and self-provisions: anonymous sign-in → no active cycle →
  Settings screen so the user can set budget and closing date.
- Installable PWA: manifest, icons, service worker, dark theme color.
- No secret is committed.
