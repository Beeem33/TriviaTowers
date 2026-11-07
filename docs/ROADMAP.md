# Roadmap

Each phase ends with a working, testable app.

## ✅ Phase 1 — Playable MVP (done, local prototype)

- Next.js app, homepage with animated floating island and self-building demo tower
- Procedural, deterministic low-poly tower system (4 styles, features, milestones, skins as data)
- Construction (roof pop + swoop-in + squash + dust) and wrong-answer wobble animations
- Trivia UI: 15 s server-style deadline, 4 answers, keyboard 1–4/A–D, reveal + explanation
- Scoring in a shared rules module (base 100 + speed ≤50 + streak ≤50), 25 unit tests
- Daily Tower (same 10 questions for everyone per UTC day, deterministic, no repeats within 7 days), Quick Build
- Endless Tower: 3 lives, difficulty and timer (15 s → 10 s) ramp with height, personal records
- 256 sample questions across 10 categories (83 easy / 131 medium / 42 hard)
- XP and levels (titles from Bricklayer to Tower Legend), 14 achievements, rewards on the results screen
- Cosmetics unlocked by playing: 6 tower skins, 5 island themes (sky, fog and clouds follow the island); Profile page to equip them
- Procedural background music with its own volume control; achievement and level-up sounds
- How to Play, About, Privacy Policy (draft) and Terms of Use (draft) pages
- Single-file preview build (`apps/web/preview`) for private test links
- Results screen, local daily streak, local best towers, one-daily-per-device gate + practice replay
- Sharing: spoiler-free text, native share, challenge links, 1080×1350 "Tower of the Day" image
- Settings: builder name, volume/mute, reduced motion, graphics quality, auto-advance
- Responsive desktop/mobile, WebGL fallback, reduced motion, screen-reader announcements
- 38 unit tests, 16 Playwright e2e tests (desktop + mobile)

## ✅ Phase 2 — Online daily challenges (core done)
- Supabase project, versioned migrations, 256 questions seeded with review status
- Daily set auto-drafted on first request (4 easy / 4 medium / 2 hard, ≤2 per category, no repeats
  within 7 days) and locked once played
- Guests play instantly via anonymous sign-in (no forms); one attempt per player per day
- Server serves one question at a time without the answer key, times answers, scores with rules
  identical to game-core (3,488-case parity check), handles refresh/resume and abandoned questions
- Per-player answer order; RLS blocks reading answers or writing scores (21-check live smoke test)
- Leaderboard page (any day, paginated), homepage top-5, rank on results and share text
- Falls back to offline play if the server is unreachable
- Still to do: admin review/scheduling UI, verified challenge links (opaque attempt ids),
  question archive pages after each day ends.

## Phase 3 — Optional accounts & progression
Never required to play. Optional Google/email sign-in to keep progress across devices (needs a
custom SMTP provider for email on Supabase's free plan); guest → account upgrade keeps the same
user id; move XP/achievements/streaks to the server; match history.

## Phase 4 — Friend Battles
Rooms with short codes, lobby (ready/host controls), Realtime presence + server channel, synchronized
deadlines, live opponent towers, reconnection, results, rematch, room cleanup.

## Phase 5 — Social
Friends (search, requests, block, privacy), friends & weekly leaderboards, seasons, public matchmaking.

## Phase 6 — Monetization
Cosmetic shop (skins already data-driven), Stripe Checkout + verified webhooks, ownership/restores/
refunds, ad-free entitlement, AdSense with reserved slots away from gameplay, consent management.

## Phase 7 — Production polish
Performance passes (merged/instanced very tall towers), more sounds/music, a11y audit, security review,
analytics, monitoring, backups, admin dashboard expansion, Endless milestones/achievements (e.g. Sky High at 50 floors).

## Known issues / limitations (Phase 1)

- **Unranked only**: the sample answer key ships in the JS bundle; elapsed time is measured client-side.
- **Sample questions are `pending_review`**: facts are well-established and sourced, but must pass
  editorial review before ranked use. Hard questions are the thinnest band (42), so long Endless
  runs fall back to medium questions; the bank needs to keep growing (~10 new questions per day at launch).
- Challenge-link scores are self-reported (display only).
- Progress lives in `localStorage`; clearing site data resets it. The one-daily gate is per device.
- Leaderboards and Friend Battles pages are "under construction" placeholders.
- Timer can't be extended (see DECISIONS #7).
- Upstream console notice from React Three Fiber about `THREE.Clock` deprecation (harmless).
- Privacy Policy and Terms are pre-launch drafts: add contact details and have them legally reviewed before launch.
- XP, achievements and unlocks are stored locally, so they can be edited by a determined player; they move to the server with accounts (Phase 3).
