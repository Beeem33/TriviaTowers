# Roadmap

Each phase ends with a working, testable app.

## ✅ Phase 1 — Playable MVP (done, local prototype)

- Next.js app, homepage with animated floating island and self-building demo tower
- Procedural, deterministic low-poly tower system (4 styles, features, milestones, skins as data)
- Construction (roof pop + swoop-in + squash + dust) and wrong-answer wobble animations
- Trivia UI: 15 s server-style deadline, 4 answers, keyboard 1–4/A–D, reveal + explanation
- Scoring in a shared rules module (base 100 + speed ≤50 + streak ≤50), 25 unit tests
- Daily Tower (same 10 questions for everyone per UTC day, deterministic), Quick Build
- Results screen, local daily streak, local best towers, one-daily-per-device gate + practice replay
- Sharing: spoiler-free text, native share, challenge links, 1080×1350 "Tower of the Day" image
- Settings: builder name, volume/mute, reduced motion, graphics quality, auto-advance
- Responsive desktop/mobile, WebGL fallback, reduced motion, screen-reader announcements
- 10 Playwright e2e tests (desktop + mobile)

## Phase 2 — Online daily challenges
Supabase project + migrations; question tables + admin review status; daily scheduling with
publish lock; anonymous guest auth; `daily-start` / `daily-answer` Edge Functions using `game-core`;
`SupabaseDailySession`; ranked attempt enforcement; daily leaderboard (paginated); verified challenge
links; question archive pages; privacy policy.

## Phase 3 — Accounts & progression
Google + email sign-in, guest → account upgrade (keeps progress), profiles, username rules,
server-side streaks, XP/levels, achievements, match history, import of local guest progress.

## Phase 4 — Friend Battles
Rooms with short codes, lobby (ready/host controls), Realtime presence + server channel, synchronized
deadlines, live opponent towers, reconnection, results, rematch, room cleanup.

## Phase 5 — Social
Friends (search, requests, block, privacy), friends & weekly leaderboards, seasons, public matchmaking.

## Phase 6 — Monetization
Cosmetic shop (skins already data-driven), Stripe Checkout + verified webhooks, ownership/restores/
refunds, ad-free entitlement, AdSense with reserved slots away from gameplay, consent management.

## Phase 7 — Production polish
Performance passes (merged/instanced endless towers), more sounds/music, a11y audit, security review,
analytics, monitoring, backups, admin dashboard expansion, Endless Tower mode.

## Known issues / limitations (Phase 1)

- **Unranked only**: the sample answer key ships in the JS bundle; elapsed time is measured client-side.
- **Sample questions are `pending_review`**: facts are well-established and sourced, but must pass
  editorial review before ranked use. 52 questions → daily sets repeat often.
- Challenge-link scores are self-reported (display only).
- Progress lives in `localStorage`; clearing site data resets it. The one-daily gate is per device.
- Leaderboards and Friend Battles pages are "under construction" placeholders.
- Timer can't be extended (see DECISIONS #7).
- Upstream console notice from React Three Fiber about `THREE.Clock` deprecation (harmless).
- No privacy policy/terms pages yet (needed before analytics or ads).
