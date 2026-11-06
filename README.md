# TriviaTowers.io

Daily trivia where every correct answer adds a floor to your 3D tower on a floating island.
Answer today's 10 questions, keep your streak, challenge friends, and share how high you built.

> **Status: Phase 1 — playable local prototype.** The full game loop runs in the browser with a
> 256-question sample bank and three modes: Daily Tower, Quick Build and Endless Tower. Progress is stored on the device. Online daily challenges, accounts,
> leaderboards and multiplayer come in later phases ([roadmap](docs/ROADMAP.md)).
> Local play is **unranked by design**: the sample answer key ships in the bundle.

## Quick start

Requires Node.js ≥ 22.12 (see `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:3000
```

No accounts, API keys or Supabase project are needed for Phase 1.

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm test` | Unit tests (game rules, scoring, daily selection, tower blueprints) |
| `npm run typecheck` | TypeScript across all workspaces |
| `npm run lint` | ESLint (Next.js + React Compiler rules) |
| `npm run test:e2e` | Playwright end-to-end tests, desktop + mobile (build first) |

For e2e tests on a fresh machine run `npx playwright install chromium` once.

## Repository layout

```
apps/web/                Next.js 16 app (App Router, React 19, Tailwind 4, React Three Fiber)
  src/app/               Routes: / , /play , /friends , /leaderboards
  src/components/three/  3D: island, procedural tower, particles, camera rig, 2D fallback
  src/components/game/   Trivia UI, HUD, timer, results, sharing, share-card renderer
  src/game/              Match state machine (Zustand), GameSession seam, settings
  src/audio/             Procedural Web Audio sound effects (no audio files)
  e2e/                   Playwright tests
packages/game-core/      Framework-free rules shared by browser + future Edge Functions:
                         scoring, daily calendar/streaks, question selection, Endless rules,
                         tower blueprints, question bank (src/questions/bank/<category>.ts)
packages/shared-types/   Types: questions, results, realtime room event protocol
supabase/                Migrations, Edge Functions, seed data (Phase 2+)
docs/                    Architecture, decisions, roadmap, security, deployment, questions
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — system design, tower generation, Supabase multiplayer, daily fairness
- [Decisions & open questions](docs/DECISIONS.md) — conflicts in the spec and what needs an owner decision
- [Roadmap & known issues](docs/ROADMAP.md)
- [Security & anti-cheat](docs/SECURITY.md)
- [Question editorial workflow](docs/QUESTIONS.md)
- [Deployment](docs/DEPLOYMENT.md)

## Brand

Always **TriviaTowers** (one word, capital second T) — `TriviaTowers.io`, `triviatowers.io`.
Never "Trivia Towers".
