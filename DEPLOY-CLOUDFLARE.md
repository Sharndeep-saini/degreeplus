# Put Degree Plus on Cloudflare (beginner steps)

## Method A (recommended): connect your GitHub repo — the lead form works
Your code is at https://github.com/Sharndeep-saini/degreeplus
1. Log in at https://dash.cloudflare.com → left menu **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Choose GitHub, allow access, select the repo **degreeplus** → **Begin setup**.
3. Settings:
   - Project name: `degreeplus`
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Click **Save and Deploy**. After ~1 minute you get `https://degreeplus.pages.dev`.

## Make the lead form save enquiries (one time, ~5 minutes)
1. Left menu **Storage & Databases** → **D1 SQL Database** → **Create database**, name: `degreeplus-leads`.
2. Open it → **Console** tab → paste the contents of `schema.sql` → **Execute**.
3. Go to **Workers & Pages** → **degreeplus** → **Settings** → **Bindings** → **Add** → **D1 database**:
   - Variable name: `DB`  (exactly, capital letters)
   - D1 database: `degreeplus-leads`  → Save.
4. Settings → **Variables and Secrets** → **Add**: name `ADMIN_TOKEN`, value = any long random password (type = Secret). Save.
5. **Deployments** tab → on the latest deployment click **⋯ → Retry deployment** (so the new settings apply).
6. Test: open your site, submit the form. Then open
   `https://degreeplus.pages.dev/api/leads?token=YOUR_ADMIN_TOKEN` — it downloads all enquiries as a spreadsheet.

## Method B (quickest, but the form will NOT save): upload the `dist` folder
Workers & Pages → Create → Pages → **Upload assets** → drag the `dist` folder. Site works; form shows the call/WhatsApp fallback.

## Your own domain
Pages project → **Custom domains** → **Set up a custom domain**.

## Changing content
Edit `data/content.mjs` (fees, courses, FAQs, Punjabi text) → `npm run build`. With Method A, every push to GitHub redeploys automatically.
