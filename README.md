# Degree Plus

Static site (no framework) + a Cloudflare Worker for the lead form. See DEPLOY-CLOUDFLARE.md.

- Edit fees / courses / FAQs / Punjabi text: `data/content.mjs`, then `npm run build`
- Preview locally: `npm run preview` (http://localhost:8080)
- Output: `dist/`


## Before launch checklist
- Replace/confirm fees with the latest from each university (only published figures are shown).
- Re-check programme list against the UGC-DEB list each session (`SITE.verifiedOn` in content.mjs).
- Add your real name/photo on /about.
