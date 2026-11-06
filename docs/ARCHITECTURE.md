# Architecture

## 1. Overview

```
 Browser (Next.js static app on a CDN)            Supabase (managed, no servers to run)
 ┌───────────────────────────────────────┐        ┌───────────────────────────────────────┐
 │ UI (React) ─ Zustand match state       │        │ Auth: Google, email, anonymous guests │
 │ 3D (React Three Fiber, rendered locally)│◀──────▶│ Postgres: questions, attempts, rooms, │
 │ GameSession ──────────────────────────────HTTPS─▶│   results, friends, cosmetics (+RLS)  │
 │   LocalGameSession (Phase 1, offline)   │        │ Edge Functions: validate answers,     │
 │   SupabaseDailySession (Phase 2)        │        │   score, start/advance matches, Stripe│
 │   SupabaseMatchSession (Phase 4)        │◀─WS───▶│ Realtime: presence + broadcast        │
 │ packages/game-core (rules, blueprints)  │        │ pg_cron: room cleanup, daily publish  │
 └───────────────────────────────────────┘        └───────────────────────────────────────┘
```

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind 4 + React Three Fiber/Drei + Zustand.
  Every route currently prerenders as static HTML; all game logic runs client-side. This allows
  hosting as static assets on a CDN (lowest cost) — see `DEPLOYMENT.md`.
- **Backend (Phase 2+)**: Supabase only — Postgres, Auth, Realtime, Edge Functions. No dedicated
  game server, no Socket.IO, no VMs.
- **Shared rules**: `packages/game-core` is pure TypeScript (no DOM, no React, no Node APIs), so the
  same scoring/selection code runs in the browser and in Deno Edge Functions.

## 2. The GameSession seam

The UI never decides correctness or points. It calls a `GameSession`
(`apps/web/src/game/session.ts`):

```ts
interface GameSession {
  questions: PublicQuestion[];            // no answer key
  submit(questionId, choice | null, elapsedMs): Promise<AnswerVerdict>;
  finish(): Promise<MatchSummary>;
}
```

- `LocalGameSession` (now): picks questions from the sample bank and scores locally. Unranked.
- `SupabaseDailySession` (Phase 2): `submit` → Edge Function; server measures time and returns the
  verdict. The browser only learns the correct answer **after** its own answer is locked.
- `SupabaseMatchSession` (Phase 4): same, plus realtime events for opponents.

Because the store, 3D scene and UI already consume verdicts asynchronously, switching to the server
is a provider swap, not a rewrite.

## 3. Match state machine

`apps/web/src/game/game-store.ts`: `idle → intro → question → submitting → reveal → … → finished`.
`answer()` is ignored unless status is `question`, so double taps and key repeats can't submit twice.
The 3D scene subscribes to `buildTick` / `wobbleTick` counters to trigger animations.

## 4. Tower generation

`packages/game-core/src/tower.ts` turns `(seed, floorCount)` into a list of `FloorSpec`s:

- **Deterministic**: Mulberry32 PRNG seeded by a hash; the same seed always yields the same tower,
  and growing a tower never changes existing floors (tested). A finished tower can be re-rendered
  anywhere — share cards, profiles, opponents' screens — from just `{seed, floors, skinId}`.
- **Consistent silhouette**: an octagonal prism that tapers exponentially toward 72% of the base radius.
- **Variety**: four floor styles (stone, brick, timber, castle) weighted by height (heavier at the
  base), never more than two identical in a row; windows on 2–5 faces (some lit), arches,
  banners, gardens, battlements; every 5th floor is a balcony milestone with railing and pennants.
- **Skins**: palettes are data (`TOWER_SKINS`), so cosmetics change colours without new geometry.

Rendering (`apps/web/src/components/three/`):

- `towerParts.ts` converts a FloorSpec into primitive "parts" (box, prism, cone…).
- `parts.ts` **merges** all parts of one colour into one `BufferGeometry` using cached unit
  geometries and shared flat-shaded materials. A floor renders in ~4–6 draw calls instead of ~30;
  the whole island decoration set in a handful. Geometries are disposed on unmount.
- Particles (dust, confetti, sparkles) are pooled `InstancedMesh`es with fixed capacity —
  no allocation during play, bounded cost on phones.

### Construction animations

| Event | Animation |
| --- | --- |
| Correct answer | Roof pops off on a damped spring → new floor swoops in from the camera's right, spinning and scaling up (ease-out-back) → lands with a squash-and-stretch → dust ring → roof drops back on. Milestone floors add confetti; 3+ streaks add sparkles. |
| Wrong / timeout | Whole tower wobbles about its base (decaying sine, smaller angle for taller towers) and the roof hops. Harmless and a little silly. |
| Finish | Confetti burst, camera eases out to frame the whole tower and slowly sways. |

All animation runs in `useFrame` against refs — no React re-renders per frame.
**Reduced motion** (OS setting or in-game override): floors fade/scale in place, no particles, no
sway, no bob, tiny wobble, faster camera settle.

### Camera

`CameraRig.tsx` owns the camera: three-quarter isometric-style view (~29° elevation), exponential
smoothing, framing computed from tower height (`framing.ts`): during play it keeps the roof and newest
floors in view; home/results frame the whole island. Players can drag to rotate within ±63°; it eases
back after 3 s idle. No shake. Portrait viewports pull the camera back to fit the island.

### Performance & fallbacks

- `PerformanceMonitor` auto-downgrades (DPR 1, no shadows, half particles) on slow devices;
  users can force High / Battery saver in Settings.
- No WebGL, or a crash inside the scene → `TowerFallback` (2D CSS tower from the same blueprint).
- three.js is code-split and loaded only on pages with a scene.

## 5. Daily challenge (Phase 2 design)

**Calendar**: UTC everywhere. `utcDateKey()`, `dailyNumber()` (#1 = `DAILY_EPOCH_DATE_KEY`), reset
at 00:00 UTC.

**Question sets**: admins review questions (`QUESTIONS.md`), the scheduler pre-drafts each day with
`selectQuestionSet()` (balanced difficulty ramp, ≤2 per category), an admin approves, and the set is
**published**. A trigger blocks edits to a published day.

**Ranked attempt flow** (all server-side):

1. `daily-start` (Edge Function, authenticated, non-anonymous user):
   `INSERT INTO daily_attempts (user_id, challenge_id)` — `UNIQUE(user_id, challenge_id)` makes a
   second ranked attempt impossible. Returns question 1 (public shape) and records `served_at`.
2. `daily-answer`: checks the attempt belongs to the caller, the question is the *current* one, it
   hasn't been answered (`PRIMARY KEY (attempt_id, question_index)`), and computes
   `elapsed = now() - served_at` on the server (with a small latency grace). Scores with
   `game-core`. Returns the verdict (now the correct answer may be revealed) and serves the next question.
3. Quitting doesn't help: unanswered questions past their deadline count as timeouts when the
   attempt is finalized (lazily on next request, and by a pg_cron sweep).
4. Leaderboard rows are written only by these functions (service role). RLS gives clients read-only
   access. Ordering: score ↓, correct ↓, total answer time ↑ (`compareResults`, tested).

**Guests** use Supabase anonymous sign-in: they get a real user id (so attempts, streaks and the later
"upgrade to a full account" all work), but anonymous users are not leaderboard-eligible — the UI labels
their runs *unranked*.

**Answer-sharing mitigation**: choices are shuffled per user (`shuffleChoices(q, userId)`), so
"it's B" is useless. Topic-level spoilers can't be prevented; see `SECURITY.md`.

## 6. Multiplayer with Supabase (Phase 4 design) — no game server

Supabase Realtime is the **transport**; Postgres + Edge Functions are the **referee**.

**Channels per room**

- `room:{code}` — Presence (who's connected; key = player id, so duplicate tabs collapse) and
  cosmetic client hints (emotes, ready toggles that are re-validated).
- `room:{code}:server` — authoritative events. Realtime Authorization (RLS on `realtime.messages`)
  lets participants *read* it but nobody *write* it except the service role / DB triggers, so
  clients can't spoof `question_started` or scores.

Event types are defined in `packages/shared-types/src/realtime.ts`.

**Match progression without a server loop**

- `match_rooms` stores `question_index`, `question_started_at`, `deadline_at` (server timestamps).
- Answers go through `match-answer` (Edge Function or `SECURITY DEFINER` RPC): validates membership,
  index, deadline; `UNIQUE (match_id, player_id, question_index)` blocks duplicates/replays.
- Advancing is **lazy and idempotent**: any participant calls `match_advance(match_id, expected_index)`
  when everyone has answered or the deadline passed. The RPC does a compare-and-swap
  (`UPDATE … WHERE question_index = expected_index AND (now() >= deadline_at OR all_answered)`), so
  ten clients calling at once advance exactly once. A trigger broadcasts the next question.
- Clients sync clocks from `serverNow` in events (plus an RPC ping) and render countdowns as
  `deadline − (Date.now() + offset)`; local timers are display-only.
- **Disconnects**: Presence marks players away; their unanswered questions time out. Refresh/rejoin
  calls `match_state()` to get the current question, deadline and standings. Host leaves → earliest
  remaining player becomes host. Empty/idle rooms expire via a pg_cron job.
- Each browser renders all islands locally from `{seed, floors}`; only small JSON events travel.

**Message budget**: ~1 server event per question start/end + 1 per answer lock per player.
A 10-question, 8-player match ≈ 100 broadcasts. Presence heartbeats are handled by Supabase.

**Migration path if Realtime limits/costs bite**: move room orchestration to Cloudflare Durable Objects
(still serverless, one object per room) behind the same `GameSession`/event protocol; keep Postgres
for persistence.

## 7. Asynchronous competition

No room needed: everyone plays the same daily set, so a friends leaderboard is just
`daily_attempts` filtered to accepted friendships. Phase 1 already ships challenge links
(`/play?mode=daily&ch=…`) with a self-reported score; Phase 2 replaces the payload with an opaque
attempt id that the server resolves to a verified result.

## 8. Data model (planned, Phase 2–6)

Supabase Auth's `auth.users` is the identity; app data hangs off `profiles.id = auth.users.id`.

| Table | Key columns / constraints |
| --- | --- |
| `profiles` | id (FK auth.users), username UNIQUE (citext, reserved-name check), avatar, created_at, xp, level |
| `questions` | id, prompt, choices text[4], correct_index, category, difficulty, explanation, source, review_status, created_by, reviewed_by |
| `daily_challenges` | id, date_key UNIQUE, number, status (draft/scheduled/published), published_at |
| `daily_challenge_questions` | (challenge_id, position) PK, question_id; lock trigger after publish |
| `daily_attempts` | id, user_id, challenge_id, UNIQUE(user_id, challenge_id), ranked, status, score, correct, total_answer_ms, finished_at |
| `attempt_answers` | (attempt_id, question_index) PK, choice, correct, served_at, answered_at, points |
| `match_rooms` | id, code UNIQUE, host_id, status, question_index, question_started_at, deadline_at, expires_at |
| `match_participants` | (room_id, player_id) PK, joined_at, ready, left_at |
| `match_answers` | (match_id, player_id, question_index) PK, choice, points |
| `match_results` | match_id, player_id, score, floors, rank |
| `friend_requests` / `friendships` / `blocks` | symmetric pairs, UNIQUE(least, greatest) |
| `achievements` / `user_achievements` | |
| `cosmetics` / `user_cosmetics` / `purchases` | purchases keyed by Stripe session id UNIQUE (idempotent webhooks) |
| `seasons` / `leaderboard_entries` | weekly aggregates, materialized by cron |

Indexes: `(challenge_id, score DESC, correct DESC, total_answer_ms ASC)` for daily boards;
keyset pagination. RLS on every table; writes to competitive tables only via service role.
