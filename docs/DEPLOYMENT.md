# Deployment

## Local
```bash
nvm use            # Node 22
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production mode on :3000
```

## Hosting: Cloudflare Pages (free)
The app is a static export (`output: "export"`): `npm run build` writes plain files to
`apps/web/out`. All dynamic work happens in the browser and in Supabase, so hosting is a CDN.

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick the repo:
| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `apps/web/out` |
| Root directory | *(leave empty — repo root)* |
| Environment variable | `NODE_VERSION` = `22` |

Every push to `main` redeploys. Security headers come from `apps/web/public/_headers`.
Local check of the exported site: `npm run build && npm start` (serves `out/` on :3000).

## Backend
Supabase project `bicckuevfsfvmmfpgdrg` — see `supabase/README.md` for migrations and scripts.

## Domain (later)
Register triviatowers.io at any registrar and add it under the Pages project → Custom domains.
Cloudflare provisions HTTPS automatically. Then set `NEXT_PUBLIC_SITE_URL=https://triviatowers.io`.

## Monitoring & backups
Cloudflare analytics + the Supabase usage dashboard. Free Supabase projects pause after a week
without activity (resume in the dashboard); upgrade before launch for daily backups.

## Environment variables
See `.env.example`. Only `NEXT_PUBLIC_*` values may reach the browser. Never commit `.env*` files.

## Publishing this repository to GitHub
```bash
gh repo create triviatowers --private --source . --remote origin --push
```
or create an empty repo on github.com, then `git remote add origin <url> && git push -u origin main`.
