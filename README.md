# Degree Plus

Static site (no framework) + Cloudflare Pages Function for the lead form.

- Edit fees / courses / FAQs / Punjabi text: `data/content.mjs`, then `npm run build`
- Preview locally: `npm run preview` (http://localhost:8080)
- Output: `dist/`

## Go live (one time)
1. `npx wrangler login`
2. `npx wrangler d1 create degreeplus-leads` → paste the `database_id` into `wrangler.toml`
3. `npx wrangler d1 execute degreeplus-leads --remote --file=schema.sql`
4. `npm run deploy`
5. In Cloudflare → Pages → degreeplus → Settings → Functions → D1 binding `DB` = degreeplus-leads (if not picked up from wrangler.toml)
6. Secrets: `npx wrangler pages secret put ADMIN_TOKEN` (any long random text) → download leads at `/api/leads?token=...`
   Optional instant email: `RESEND_API_KEY` and `NOTIFY_EMAIL` secrets (free key at resend.com).
7. Add your domain in Pages → Custom domains.

## Before launch checklist
- Replace/confirm fees with the latest from each university (only published figures are shown).
- Re-check programme list against the UGC-DEB list each session (`SITE.verifiedOn` in content.mjs).
- Add your real name/photo on /about.
