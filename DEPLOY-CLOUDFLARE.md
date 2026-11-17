# Degree Plus on Cloudflare (Worker + static site + lead database)

The repo deploys with `npx wrangler deploy`. Cloudflare does the rest:
- builds the site (`npm run build` → `dist/`)
- serves it, and runs the lead-form API at `/api/lead`
- creates the D1 database `degreeplus-leads` on first deploy and creates its table on first use

## Settings in Cloudflare (Workers & Pages → degreeplus → Settings → Build)
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
Every push to GitHub `main` rebuilds and deploys automatically.

## One thing to do by hand: the private password for downloading leads
Workers & Pages → degreeplus → Settings → **Variables and Secrets** → Add:
- Type: **Secret**, Name: `ADMIN_TOKEN`, Value: a long random password → Deploy.
Then download all enquiries (opens in Excel) at:
`https://YOUR-SITE/api/leads?token=YOUR_PASSWORD`

## Optional: email alert for every enquiry
Create a free key at resend.com, then add secrets `RESEND_API_KEY` and `NOTIFY_EMAIL` (your email).

## Your own domain
Workers & Pages → degreeplus → Settings → **Domains & Routes** → Add → Custom domain.

## Changing content
Edit `data/content.mjs` (fees, courses, FAQs, Punjabi text), push to GitHub — it redeploys itself.
