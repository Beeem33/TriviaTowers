# Deployment

## Local
```bash
nvm use            # Node 22
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production mode on :3000
```

## Recommended production setup
- **Frontend**: Cloudflare (Workers static assets or Pages). Every route prerenders statically today,
  so the app can be exported with `output: "export"` and served from Cloudflare's CDN; move security
  headers to a `public/_headers` file at that point. If server rendering is needed later, use the
  OpenNext Cloudflare adapter. Vercel Pro is the alternative (Hobby is non-commercial).
- **Backend (Phase 2+)**: Supabase project (Pro before launch), migrations via the Supabase CLI
  (`supabase db push`), functions via `supabase functions deploy`, secrets via `supabase secrets set`.
- **Domain**: register triviatowers.io at any registrar; point nameservers or CNAME to Cloudflare.
  Cloudflare provisions HTTPS automatically. Add `www` → apex redirect. Set `NEXT_PUBLIC_SITE_URL`.
- **Monitoring**: Cloudflare analytics + Supabase usage dashboard (connections, messages, function
  invocations, DB size, egress); alert on quota thresholds. Add error tracking (e.g., Sentry) in Phase 7.
- **Backups**: Supabase Pro daily backups; keep migrations and question seeds in Git; periodic
  `pg_dump` of question tables to private storage.

## Environment variables
See `.env.example`. Only `NEXT_PUBLIC_*` values may reach the browser. Never commit `.env*` files.

## Publishing this repository to GitHub
```bash
gh repo create triviatowers --private --source . --remote origin --push
```
or create an empty repo on github.com, then `git remote add origin <url> && git push -u origin main`.
