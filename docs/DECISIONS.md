# Decisions, conflicts & open questions

## Conflicts found in the specification (and the chosen resolution)

| # | Conflict | Resolution |
| --- | --- | --- |
| 1 | **Vercel Hobby is for non-commercial use**; this site runs AdSense and Stripe. | Prefer **Cloudflare** (static assets on Workers/Pages — free tier generous) or pay for Vercel Pro. All routes are currently static, so a static deploy works. |
| 2 | "Supabase Realtime for multiplayer" vs "server authoritative". Realtime broadcast is client-to-client. | Realtime = transport only. Authority = Edge Functions + Postgres constraints; authoritative events on a server-write-only channel (see ARCHITECTURE §6). |
| 3 | No dedicated server, but matches need a clock to advance questions. | Server timestamps in Postgres + lazy, idempotent compare-and-swap `match_advance` RPC + pg_cron cleanup. No long-running process. |
| 4 | "Guests can play" vs "one ranked attempt per day". | **Owner decision (Nov 2026): sign-in is never required, and guests appear on the leaderboard.** Guests use Supabase anonymous auth (one attempt per guest per day, enforced in the database). Trade-off: clearing browser data creates a new guest. Mitigations: server-side timing/validation, Supabase's anonymous sign-up rate limit; a "signed-in only" filter can be added if abuse appears. |
| 2b | Edge Functions vs database functions for game actions. | Daily actions are Postgres `SECURITY DEFINER` functions (atomic, no cold starts, no separate deploy). Scoring is duplicated in SQL and verified identical to game-core by `supabase/scripts/check-scoring.mts`. Edge Functions remain the plan for Stripe webhooks. |
| 5 | Speed bonus vs network latency. | Server measures time; `speedGraceMs` (1 s) gives full bonus for fast answers, absorbing typical latency. Documented as imperfect. |
| 6 | Same 10 questions for everyone → answer sharing during the day. | Per-user choice shuffle; topic leaks remain possible. Accepted limitation. |
| 7 | Timed questions vs WCAG 2.2.1 (Timing Adjustable). | Timer is core to ranked play. Proposal: an unranked "relaxed timer" accessibility option; auto-advance can already be turned off. **Needs owner decision.** |
| 8 | Audience includes teenagers; AdSense personalized ads and data collection have age rules (COPPA, GDPR-K). | Set minimum age 13 in Terms; non-personalized ads where required; certified CMP for EEA/UK/CH. **Needs legal review.** |
| 9 | AdSense approval needs substantial publisher content; a game page is thin. | Add informational content pages (how to play, question archives after the day ends, trivia articles). |
| 10 | `next.config` security headers don't apply to a pure static export. | Use host-level headers (Cloudflare `_headers`) when deploying statically; full CSP in Phase 6 once ad/Stripe/Supabase origins are fixed. |

## Owner decisions still needed

1. **Hosting**: Cloudflare (recommended) or Vercel Pro.
2. **Domain registrar** for triviatowers.io (not purchased/configured yet). Any registrar works; DNS can live on Cloudflare.
3. **Supabase plan & region**. Free projects pause after a period of inactivity and have Realtime/Function quotas — plan on Pro (~$25/mo at time of writing; verify) before public launch. Choose the region closest to the main audience.
4. **Daily #1 date** (`DAILY_EPOCH_DATE_KEY`, currently 2026-11-01 as a placeholder).
5. **Question pipeline**: a daily game consumes ~3,650 questions/year. Who writes and fact-checks them? (Owner, freelancers, licensed set?) AI may draft, humans must verify.
6. **Legal entity** for Stripe and AdSense payouts; Terms, Privacy Policy, refund policy.
7. **Minimum age** and moderation policy for usernames.
8. **Analytics provider** (privacy-friendly options: Plausible, PostHog with consent, Cloudflare Web Analytics).

## Decisions made in Phase 1

- npm workspaces monorepo (no extra tooling needed on new machines).
- Static, client-rendered game pages; three.js lazy-loaded.
- Procedural Web Audio sounds (no licensing, zero download).
- Self-hosted fonts via Fontsource (no build-time Google Fonts fetch, no third-party request).
- Shared packages export TypeScript source (`transpilePackages`); no build step for packages.
- `ui` package from the suggested layout deferred — UI lives in `apps/web` until a second app needs it.
