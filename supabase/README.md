# Supabase

Empty until Phase 2. Planned contents (see `docs/ARCHITECTURE.md`):

- `migrations/` — versioned SQL: tables, indexes, RLS policies, RPCs, publication-lock triggers
- `functions/` — Edge Functions (Deno): `daily-start`, `daily-answer`, `room-create`, `room-join`,
  `match-answer`, `match-advance`, `stripe-checkout`, `stripe-webhook`
- `seed/` — reviewed questions exported from `packages/game-core` sample bank

Edge Functions import scoring from `packages/game-core` so the browser and server use the same rules.
