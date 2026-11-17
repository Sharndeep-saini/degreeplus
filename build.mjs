// Static site generator for Degree Plus  →  run:  node build.mjs   (output: ./dist)
import fs from 'node:fs';
import path from 'node:path';
import { SITE, COURSES, UNIVERSITIES, BENEFITS, FAQ_GROUPS, FAQS, IMG } from './data/content.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(ROOT, 'dist');
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });

// ── helpers ─────────────────────────────────────────────────
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Bilingual text. Renders English; main.js swaps to Punjabi from data-pa. */
const t = (en, pa) => (pa ? `<span data-en="${esc(en)}" data-pa="${esc(pa)}">${esc(en)}</span>` : esc(en));
const tb = (o) => t(o.en, o.pa);
const ico = (n, cls = '') => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const courseBy = (s) => COURSES.find((c) => c.slug === s);
const uniBy = (s) => UNIVERSITIES.find((u) => u.slug === s);
const offeredBy = (cs) => UNIVERSITIES.filter((u) => u.courses[cs]);
const wa = (msg) => `https://wa.me/${SITE.phoneIntl}?text=${encodeURIComponent(msg)}`;
const totalProgrammes = UNIVERSITIES.reduce((a, u) => a + u.programmes, 0);

// ── districts (patched to current Punjab list, Punjab first) ─
function buildDistricts() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/districts.raw.json'), 'utf8')).states;
  const out = {};
  for (const s of raw) {
    const name = s.state.replace(/\s*\(UT\)|\s*\(NCT\)/g, (m) => (m.includes('UT') ? ' (UT)' : ''));
    out[name] = [...s.districts];
  }
  // Punjab now has 23 districts; use official names
  out['Punjab'] = ['Amritsar','Barnala','Bathinda','Faridkot','Fatehgarh Sahib','Fazilka','Ferozepur','Gurdaspur','Hoshiarpur','Jalandhar','Kapurthala','Ludhiana','Malerkotla','Mansa','Moga','Pathankot','Patiala','Rupnagar (Ropar)','SAS Nagar (Mohali)','Sangrur','Shaheed Bhagat Singh Nagar (Nawanshahr)','Sri Muktsar Sahib','Tarn Taran'];
  out['Ladakh (UT)'] = ['Kargil', 'Leh'];
  out['Chandigarh (UT)'] = ['Chandigarh'];
  const names = Object.keys(out).sort((a, b) => a.localeCompare(b)).filter((n) => n !== 'Punjab');
  const ordered = { Punjab: out['Punjab'] };
  for (const n of ['Chandigarh (UT)', 'Haryana', 'Himachal Pradesh', 'Delhi', 'Rajasthan']) {
    const k = names.find((x) => x === n || x.startsWith(n)); if (k) ordered[k] = out[k];
  }
  for (const n of names) if (!(n in ordered)) ordered[n] = out[n];
  for (const k of Object.keys(ordered)) { ordered[k] = ordered[k].filter((d) => d !== 'Other / not listed'); ordered[k].push('Other / not listed'); }
  return ordered;
}
const DISTRICTS = buildDistricts();

// ── shared layout pieces ────────────────────────────────────
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<symbol id="i-briefcase" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></symbol>
<symbol id="i-code" viewBox="0 0 24 24"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></symbol>
<symbol id="i-chart" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></symbol>
<symbol id="i-laptop" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/></symbol>
<symbol id="i-book" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5V21h16"/></symbol>
<symbol id="i-coins" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 9.5c.5-1 1.7-1.5 3-1.5 1.7 0 3 .8 3 2s-1.3 1.7-3 2-3 .8-3 2 1.3 2 3 2c1.3 0 2.500-.5 3-1.500M12 6v2m0 8v2"/></symbol>
<symbol id="i-pen" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.500 3.500a2.100 2.100 0 0 1 3 3L7 19l-4 1 1-4z"/></symbol>
<symbol id="i-flask" viewBox="0 0 24 24"><path d="M10 2v6L4 19a2 2 0 0 0 1.800 3h12.400A2 2 0 0 0 20 19L14 8V2"/><path d="M8 2h8"/></symbol>
<symbol id="i-library" viewBox="0 0 24 24"><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6M2 21h20"/></symbol>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
<symbol id="i-home" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 5 5L20 7"/></symbol>
<symbol id="i-phone" viewBox="0 0 24 24"><path d="M22 16.900v3a2 2 0 0 1-2.200 2 19.800 19.800 0 0 1-8.600-3.100 19.500 19.500 0 0 1-6-6A19.800 19.800 0 0 1 2.100 4.200 2 2 0 0 1 4.100 2h3a2 2 0 0 1 2 1.700c.1 1 .4 1.900.7 2.800a2 2 0 0 1-.5 2.100L8.100 9.900a16 16 0 0 0 6 6l1.300-1.300a2 2 0 0 1 2.100-.4c.9.300 1.800.6 2.800.7a2 2 0 0 1 1.700 2z"/></symbol>
<symbol id="i-whatsapp" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-13.400 7.800L3 21l1.300-4.400A9 9 0 1 1 21 12z"/><path d="M9 8.500c0 3.500 3 6.500 6.500 6.500l1-2-2-1-1 .8c-.8-.4-1.600-1.200-2-2l.8-1-1-2z"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
<symbol id="i-menu" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></symbol>
<symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></symbol>
<symbol id="i-chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
<symbol id="i-map" viewBox="0 0 24 24"><path d="M12 22s7-6.500 7-12a7 7 0 1 0-14 0c0 5.500 7 12 7 12z"/><circle cx="12" cy="10" r="2.500"/></symbol>
<symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></symbol>
<symbol id="i-ext" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></symbol>
<symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.500"/><path d="M2 20c0-3.500 3-6 7-6s7 2.500 7 6M17 5a3.500 3.500 0 0 1 0 6.500M22 20c0-2.500-1.500-4.500-4-5.500"/></symbol>
<symbol id="i-badge" viewBox="0 0 24 24"><circle cx="12" cy="9" r="6"/><path d="m8.500 14 -1.500 8 5-3 5 3-1.500-8"/></symbol>
</defs></svg>`;

const logo = `<svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><rect width="40" height="40" rx="11" fill="var(--brand)"/><path d="M12 28V12h6.500a6.500 6.500 0 0 1 0 13H12" fill="none" stroke="#fff" stroke-width="3.200" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 9v8M24 13h8" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/></svg>`;

function head({ title, desc, path: p, img = IMG.hero }) {
  const full = title.includes('Degree Plus') ? title : `${title} | Degree Plus`;
  return `<!doctype html>
<html lang="en" data-lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${img}">
<meta name="theme-color" content="#0F3D75">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/lexend-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/atkinson-hyperlegible-next-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/style.css">
<script>document.documentElement.classList.add('js');try{var l=localStorage.getItem('dp-lang');if(l==='pa'){document.documentElement.lang='pa';document.documentElement.dataset.lang='pa'}var m=localStorage.getItem('dp-theme');if(m)document.documentElement.dataset.theme=m}catch(e){}</script>
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'EducationalOrganization', name: SITE.name, telephone: `+91${SITE.phone}`, email: SITE.email, areaServed: 'Punjab, India', description: desc })}</script>
</head>`;
}

function header(active) {
  const nav = (href, key, en, pa) => `<a href="${href}"${active === key ? ' aria-current="page"' : ''}>${t(en, pa)}</a>`;
  return `<a class="skip" href="#main">${t('Skip to content', 'ਸਮੱਗਰੀ ਤੇ ਜਾਓ')}</a>
<div class="progress" aria-hidden="true"><i></i></div>
<header class="site-header" id="top">
  <div class="wrap bar">
    <a class="brand" href="/" aria-label="Degree Plus home">${logo}<span>Degree<b>Plus</b></span></a>
    <nav class="nav" id="nav" aria-label="Main">
      <div class="dd"><a href="/universities/"${active === 'universities' ? ' aria-current="page"' : ''}>${t('Universities', 'ਯੂਨੀਵਰਸਿਟੀਆਂ')} ${ico('chev', 'sm')}</a>
        <div class="dd-menu">${UNIVERSITIES.map((u) => `<a href="/universities/${u.slug}/"><b>${u.short}</b><small>${esc(u.city)}</small></a>`).join('')}</div></div>
      <div class="dd"><a href="/courses/"${active === 'courses' ? ' aria-current="page"' : ''}>${t('Courses', 'ਕੋਰਸ')} ${ico('chev', 'sm')}</a>
        <div class="dd-menu cols">${COURSES.map((c) => `<a href="/courses/${c.slug}/"><b>${c.short}</b><small>${c.level}</small></a>`).join('')}</div></div>
      ${nav('/compare/', 'compare', 'Compare', 'ਤੁਲਨਾ ਕਰੋ')}
      ${nav('/why-online-degree/', 'why', 'Why online', 'ਆਨਲਾਈਨ ਕਿਉਂ')}
      ${nav('/faqs/', 'faqs', 'FAQs', 'ਸਵਾਲ-ਜਵਾਬ')}
      ${nav('/contact/', 'contact', 'Contact', 'ਸੰਪਰਕ')}
    </nav>
    <div class="tools">
      <div class="lang" role="group" aria-label="Language"><button type="button" data-set-lang="en" aria-pressed="true">EN</button><button type="button" data-set-lang="pa" aria-pressed="false" lang="pa">ਪੰਜਾਬੀ</button></div>
      <button class="btn btn-accent sm hide-sm" type="button" data-open-dialog>${t('Free counselling', 'ਮੁਫ਼ਤ ਕਾਊਂਸਲਿੰਗ')}</button>
      <button class="burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="nav">${ico('menu')}</button>
    </div>
  </div>
</header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="wrap grid">
    <div>
      <a class="brand light" href="/">${logo}<span>Degree<b>Plus</b></span></a>
      <p class="muted-on-dark">${t('Compare UGC-entitled online degrees from Punjab’s leading universities, with honest guidance.', 'ਪੰਜਾਬ ਦੀਆਂ ਪ੍ਰਮੁੱਖ ਯੂਨੀਵਰਸਿਟੀਆਂ ਦੀਆਂ UGC-ਮਾਨਤਾ ਪ੍ਰਾਪਤ ਆਨਲਾਈਨ ਡਿਗਰੀਆਂ ਦੀ ਤੁਲਨਾ — ਇਮਾਨਦਾਰ ਸਲਾਹ ਨਾਲ।')}</p>
      <p><a class="foot-link" href="tel:+91${SITE.phone}">${ico('phone', 'sm')} +91 ${SITE.phone}</a><br><a class="foot-link" href="mailto:${SITE.email}">${ico('mail', 'sm')} ${SITE.email}</a></p>
    </div>
    <div><h4>${t('Universities', 'ਯੂਨੀਵਰਸਿਟੀਆਂ')}</h4><ul>${UNIVERSITIES.map((u) => `<li><a href="/universities/${u.slug}/">${esc(u.name)}</a></li>`).join('')}</ul></div>
    <div><h4>${t('Courses', 'ਕੋਰਸ')}</h4><ul>${COURSES.map((c) => `<li><a href="/courses/${c.slug}/">${esc(c.short)} — ${esc(c.name)}</a></li>`).join('')}</ul></div>
    <div><h4>${t('Explore', 'ਹੋਰ ਦੇਖੋ')}</h4><ul>
      <li><a href="/compare/">${t('Compare universities', 'ਯੂਨੀਵਰਸਿਟੀਆਂ ਦੀ ਤੁਲਨਾ')}</a></li>
      <li><a href="/why-online-degree/">${t('Why an online degree', 'ਆਨਲਾਈਨ ਡਿਗਰੀ ਕਿਉਂ')}</a></li>
      <li><a href="/faqs/">${t('FAQs', 'ਸਵਾਲ-ਜਵਾਬ')}</a></li>
      <li><a href="/about/">${t('About us', 'ਸਾਡੇ ਬਾਰੇ')}</a></li>
      <li><a href="/contact/">${t('Contact', 'ਸੰਪਰਕ')}</a></li>
      <li><a href="/privacy-policy/">${t('Privacy policy', 'ਪ੍ਰਾਈਵੇਸੀ ਨੀਤੀ')}</a></li>
      <li><a href="/terms/">${t('Terms', 'ਸ਼ਰਤਾਂ')}</a></li>
      <li><a href="/disclaimer/">${t('Disclaimer', 'ਡਿਸਕਲੇਮਰ')}</a></li></ul></div>
  </div>
  <div class="wrap fine">
    <p>${t('Degree Plus is an independent education counselling and comparison platform. It is not the official admission portal of any university. University names and marks belong to their owners. Programme lists were checked against the UGC-DEB list “HEIs Entitled for Online Programmes AY 2026-27” on ' + SITE.verifiedOn + '. Fees are indicative — confirm with the university before paying.', 'Degree Plus ਇੱਕ ਸੁਤੰਤਰ ਸਿੱਖਿਆ ਕਾਊਂਸਲਿੰਗ ਤੇ ਤੁਲਨਾ ਪਲੇਟਫਾਰਮ ਹੈ। ਇਹ ਕਿਸੇ ਯੂਨੀਵਰਸਿਟੀ ਦਾ ਅਧਿਕਾਰਤ ਦਾਖ਼ਲਾ ਪੋਰਟਲ ਨਹੀਂ ਹੈ। ਪ੍ਰੋਗਰਾਮ ਸੂਚੀਆਂ ' + SITE.verifiedOn + ' ਨੂੰ UGC-DEB ਸੂਚੀ ਨਾਲ ਮਿਲਾਈਆਂ ਗਈਆਂ ਸਨ। ਫੀਸ ਸੰਕੇਤਕ ਹੈ — ਭੁਗਤਾਨ ਤੋਂ ਪਹਿਲਾਂ ਯੂਨੀਵਰਸਿਟੀ ਤੋਂ ਪੁਸ਼ਟੀ ਕਰੋ।')}
    <a href="${SITE.ugcDebUrl}" target="_blank" rel="noopener">${t('Verify on UGC-DEB', 'UGC-DEB ਤੇ ਜਾਂਚ ਕਰੋ')} ${ico('ext', 'sm')}</a></p>
    <p>© ${new Date().getFullYear()} Degree Plus · ${t('Photos from Unsplash contributors.', 'ਤਸਵੀਰਾਂ: Unsplash ਯੋਗਦਾਨੀ।')}</p>
  </div>
</footer>
<a class="wa-float" href="${wa('Hi Degree Plus, I want free counselling for an online degree.')}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${ico('whatsapp')}<span>${t('WhatsApp', 'ਵਟਸਐਪ')}</span></a>
<div class="mbar" role="group" aria-label="Quick contact">
  <a href="tel:+91${SITE.phone}">${ico('phone')} ${t('Call', 'ਕਾਲ')}</a>
  <a href="${wa('Hi Degree Plus, I want free counselling for an online degree.')}" target="_blank" rel="noopener">${ico('whatsapp')} ${t('WhatsApp', 'ਵਟਸਐਪ')}</a>
  <a class="primary" href="#" data-open-dialog>${t('Apply', 'ਅਪਲਾਈ')}</a>
</div>
<dialog class="dlg" id="lead-dialog" aria-labelledby="dlg-title">
  <button class="dlg-x" type="button" aria-label="Close" data-close-dialog>${ico('close')}</button>
  <h2 id="dlg-title">${t('Get free counselling', 'ਮੁਫ਼ਤ ਕਾਊਂਸਲਿੰਗ ਲਓ')}</h2>
  <p class="muted">${t('Tell us what you want to study. A counsellor will call you within one working day.', 'ਦੱਸੋ ਕੀ ਪੜ੍ਹਨਾ ਹੈ। ਕਾਊਂਸਲਰ ਇੱਕ ਕੰਮਕਾਜੀ ਦਿਨ ਵਿੱਚ ਕਾਲ ਕਰੇਗਾ।')}</p>
  ${leadForm('dlg')}
</dialog>
<script src="/assets/main.js" defer></script>
</body></html>`;
}

function leadForm(uid, { course = '', uni = '' } = {}) {
  const f = (k) => `${uid}-${k}`;
  return `<form class="lead-form" id="${uid}-form" data-lead novalidate>
  <div class="row2">
    <div class="field"><label for="${f('name')}">${t('Full name', 'ਪੂਰਾ ਨਾਂ')}</label>
      <input id="${f('name')}" name="name" type="text" autocomplete="name" required minlength="2" maxlength="80" placeholder="Your name" data-ph data-en="Your name" data-pa="ਤੁਹਾਡਾ ਨਾਂ"></div>
    <div class="field"><label for="${f('phone')}">${t('Mobile number', 'ਮੋਬਾਈਲ ਨੰਬਰ')}</label>
      <div class="phone"><span>+91</span><input id="${f('phone')}" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" required maxlength="10" pattern="[6-9][0-9]{9}" placeholder="10-digit mobile" data-ph data-en="10-digit mobile" data-pa="10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ"></div></div>
  </div>
  <div class="row2">
    <div class="field"><label for="${f('course')}">${t('Course you are interested in', 'ਕਿਹੜਾ ਕੋਰਸ ਚਾਹੀਦਾ ਹੈ')}</label>
      <select id="${f('course')}" name="course" required>
        <option value="" data-en="Select course" data-pa="ਕੋਰਸ ਚੁਣੋ">Select course</option>
        ${COURSES.map((c) => `<option value="${c.short}"${course === c.slug ? ' selected' : ''}>${c.short} — ${esc(c.name)}</option>`).join('')}
        <option value="Not sure" data-en="Not sure yet — guide me" data-pa="ਪਤਾ ਨਹੀਂ — ਮੈਨੂੰ ਸੇਧ ਦਿਓ">Not sure yet — guide me</option>
      </select></div>
    <div class="field"><label for="${f('uni')}">${t('Preferred university (optional)', 'ਪਸੰਦੀਦਾ ਯੂਨੀਵਰਸਿਟੀ (ਚੋਣਵੀਂ)')}</label>
      <select id="${f('uni')}" name="university">
        <option value="Suggest me" data-en="Suggest the best for me" data-pa="ਮੇਰੇ ਲਈ ਵਧੀਆ ਸੁਝਾਓ">Suggest the best for me</option>
        ${UNIVERSITIES.map((u) => `<option value="${u.short}"${uni === u.slug ? ' selected' : ''}>${esc(u.name)}</option>`).join('')}
      </select></div>
  </div>
  <div class="row2">
    <div class="field"><label for="${f('state')}">${t('State', 'ਰਾਜ')}</label>
      <select id="${f('state')}" name="state" required data-state><option value="">…</option></select></div>
    <div class="field"><label for="${f('district')}">${t('District', 'ਜ਼ਿਲ੍ਹਾ')}</label>
      <select id="${f('district')}" name="district" required data-district><option value="">…</option></select></div>
  </div>
  <label class="check"><input type="checkbox" name="consent" required><span>${t('I agree that Degree Plus may contact me by call and WhatsApp about my enquiry. I have read the', 'ਮੈਂ ਸਹਿਮਤ ਹਾਂ ਕਿ Degree Plus ਮੇਰੀ ਪੁੱਛਗਿੱਛ ਬਾਰੇ ਕਾਲ ਅਤੇ ਵਟਸਐਪ ਰਾਹੀਂ ਸੰਪਰਕ ਕਰ ਸਕਦਾ ਹੈ। ਮੈਂ ਪੜ੍ਹ ਲਈ ਹੈ')} <a href="/privacy-policy/" target="_blank">${t('Privacy policy', 'ਪ੍ਰਾਈਵੇਸੀ ਨੀਤੀ')}</a>.</span></label>
  <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
  <input type="hidden" name="source" value="">
  <button class="btn btn-primary lg" type="submit"><span>${t('Request free callback', 'ਮੁਫ਼ਤ ਕਾਲਬੈਕ ਮੰਗੋ')}</span> ${ico('arrow')}</button>
  <p class="form-status" role="status" aria-live="polite"></p>
  <p class="tiny">${ico('shield', 'sm')} ${t('No spam. We never sell your number.', 'ਕੋਈ ਸਪੈਮ ਨਹੀਂ। ਅਸੀਂ ਤੁਹਾਡਾ ਨੰਬਰ ਕਦੇ ਨਹੀਂ ਵੇਚਦੇ।')}</p>
</form>`;
}

const page = (meta, active, body) => head(meta) + `<body>\n${SPRITE}\n${header(active)}\n<main id="main">\n${body}\n</main>\n${footer()}`;
const crumbs = (items) => `<nav class="crumbs wrap" aria-label="Breadcrumb"><a href="/">${t('Home', 'ਹੋਮ')}</a>${items.map(([h, l]) => (h ? ` / <a href="${h}">${l}</a>` : ` / <span>${l}</span>`)).join('')}</nav>`;
const verified = (extra = '') => `<span class="chip ok">${ico('check', 'sm')} ${t('UGC-DEB entitled (online) ' + SITE.session, 'UGC-DEB ਮਾਨਤਾ (ਆਨਲਾਈਨ) ' + SITE.session)}</span>${extra}`;
const feeText = (u, cs) => {
  const f = u.courses[cs]?.fee;
  return f ? esc(f) : `<span class="muted">${t('Ask for fee quote', 'ਫੀਸ ਪੁੱਛੋ')}</span>`;
};
const applyHref = (cs, u) => `/contact/?course=${cs}&u=${u}#apply`;

const uniCard = (u) => `<article class="card uni reveal">
  <header><span class="uni-mark">${esc(u.short.slice(0, 3).toUpperCase())}</span><div><h3><a href="/universities/${u.slug}/">${esc(u.name)}</a></h3><p class="muted">${ico('map', 'sm')} ${esc(u.city)}</p></div></header>
  <p>${tb(u.about)}</p>
  <ul class="facts"><li><b>${u.programmes}</b> ${t('online programmes', 'ਆਨਲਾਈਨ ਪ੍ਰੋਗਰਾਮ')}</li>${u.naac ? `<li><b>NAAC ${u.naac}</b></li>` : ''}<li>${esc(u.type)}</li></ul>
  <footer><a class="btn btn-ghost sm" href="/universities/${u.slug}/">${t('View courses', 'ਕੋਰਸ ਦੇਖੋ')} ${ico('arrow', 'sm')}</a><a class="btn btn-primary sm" href="${applyHref('', u.slug).replace('course=&', '')}">${t('Get fee details', 'ਫੀਸ ਜਾਣੋ')}</a></footer>
</article>`;

const courseCard = (c) => `<a class="card course reveal" href="/courses/${c.slug}/">
  <span class="ci">${ico(c.icon)}</span><h3>${esc(c.short)}</h3><p class="cname">${esc(c.name)}</p><p class="muted">${tb(c.blurb)}</p>
  <span class="meta"><span class="chip">${c.level}</span><span>${offeredBy(c.slug).length} ${offeredBy(c.slug).length === 1 ? t('university', 'ਯੂਨੀਵਰਸਿਟੀ') : t('universities', 'ਯੂਨੀਵਰਸਿਟੀਆਂ')}</span></span></a>`;

const faqItem = (f, i) => `<details class="faq reveal"${i === 0 ? ' open' : ''} data-q="${esc((f.q.en + ' ' + f.a.en).toLowerCase())}"><summary>${tb(f.q)}</summary><div class="ans"><p>${tb(f.a)}</p></div></details>`;

// ── pages ───────────────────────────────────────────────────
const pages = {};

// HOME
pages['index.html'] = page({ title: 'Degree Plus — Compare UGC-entitled online degrees in Punjab', desc: 'Compare online MBA, MCA, BBA, BCA, BA, B.Com and MA from LPU, Chandigarh University, Desh Bhagat University, Chitkara and GNDU. UGC-DEB verified. Free counselling.' }, 'home', `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow rise" style="--d:0">${verified()}</p>
      <h1 class="rise" style="--d:1">${t('Find the right online degree.', 'ਸਹੀ ਆਨਲਾਈਨ ਡਿਗਰੀ ਲੱਭੋ।')} <span class="hl">${t('No confusion.', 'ਬਿਨਾਂ ਉਲਝਣ।')}</span></h1>
      <p class="lead rise" style="--d:2">${t('Compare fees, courses and approvals of Punjab’s leading universities side by side — then talk to a counsellor who tells you the honest truth.', 'ਪੰਜਾਬ ਦੀਆਂ ਪ੍ਰਮੁੱਖ ਯੂਨੀਵਰਸਿਟੀਆਂ ਦੀ ਫੀਸ, ਕੋਰਸ ਤੇ ਮਾਨਤਾ ਇੱਕੋ ਥਾਂ ਦੇਖੋ — ਫਿਰ ਕਾਊਂਸਲਰ ਤੋਂ ਸਹੀ ਸਲਾਹ ਲਓ।')}</p>
      <form class="quick rise" style="--d:3" data-quick aria-label="Quick search">
        <label class="sr" for="q-course">${t('Course', 'ਕੋਰਸ')}</label>
        <select id="q-course"><option value="" data-en="Choose a course" data-pa="ਕੋਰਸ ਚੁਣੋ">Choose a course</option>${COURSES.map((c) => `<option value="${c.slug}">${c.short} — ${esc(c.name)}</option>`).join('')}</select>
        <label class="sr" for="q-uni">${t('University', 'ਯੂਨੀਵਰਸਿਟੀ')}</label>
        <select id="q-uni"><option value="" data-en="All universities" data-pa="ਸਾਰੀਆਂ ਯੂਨੀਵਰਸਿਟੀਆਂ">All universities</option>${UNIVERSITIES.map((u) => `<option value="${u.slug}">${esc(u.name)}</option>`).join('')}</select>
        <button class="btn btn-primary" type="submit">${ico('search', 'sm')} <span>${t('Show courses', 'ਕੋਰਸ ਦਿਖਾਓ')}</span></button>
      </form>
      <ul class="ticks rise" style="--d:4"><li>${ico('check', 'sm')} ${t('Free for students', 'ਵਿਦਿਆਰਥੀਆਂ ਲਈ ਮੁਫ਼ਤ')}</li><li>${ico('check', 'sm')} ${t('Every course checked on UGC-DEB list', 'ਹਰ ਕੋਰਸ UGC-DEB ਸੂਚੀ ਨਾਲ ਮਿਲਾਇਆ')}</li><li>${ico('check', 'sm')} ${t('Punjabi & English support', 'ਪੰਜਾਬੀ ਤੇ ਅੰਗਰੇਜ਼ੀ ਸਹਾਇਤਾ')}</li></ul>
    </div>
    <div class="hero-art rise" style="--d:2">
      <div class="frame" data-parallax="0.06"><img src="${IMG.hero}" alt="Indian student studying online on a laptop on a college bench" fetchpriority="high" width="1400" height="933"></div>
      <div class="float f1" data-parallax="-0.04"><img src="${IMG.grad}" alt="Smiling Indian graduate in cap and gown" loading="eager" width="900" height="600"><span>${t('Your degree. Your pace.', 'ਤੁਹਾਡੀ ਡਿਗਰੀ। ਤੁਹਾਡੀ ਰਫ਼ਤਾਰ।')}</span></div>
      <div class="float f2" data-parallax="0.03"><b data-count="${UNIVERSITIES.length}">0</b><span>${t('universities compared', 'ਯੂਨੀਵਰਸਿਟੀਆਂ ਦੀ ਤੁਲਨਾ')}</span></div>
      <div class="float f3" data-parallax="-0.02">${ico('shield')}<span>${t('UGC-DEB verified', 'UGC-DEB ਪੁਸ਼ਟੀ')}</span></div>
    </div>
  </div>
  <div class="scroll-cue" aria-hidden="true"><span></span></div>
</section>

<section class="strip" aria-label="Trust"><div class="wrap marquee"><div class="track">
  ${[...Array(2)].map(() => `<span>${ico('shield', 'sm')} ${t('UGC-DEB entitled', 'UGC-DEB ਮਾਨਤਾ')}</span><span>${ico('badge', 'sm')} NAAC A++ / A+</span><span>${ico('coins', 'sm')} ${t('EMI & scholarships', 'EMI ਤੇ ਸਕਾਲਰਸ਼ਿਪ')}</span><span>${ico('clock', 'sm')} ${t('Live + recorded classes', 'ਲਾਈਵ + ਰਿਕਾਰਡ ਕਲਾਸਾਂ')}</span><span>${ico('globe', 'sm')} ${t('Study-abroad guidance', 'ਵਿਦੇਸ਼ ਪੜ੍ਹਾਈ ਸੇਧ')}</span><span>${ico('users', 'sm')} ${t('Free counselling', 'ਮੁਫ਼ਤ ਕਾਊਂਸਲਿੰਗ')}</span>`).join('')}
</div></div></section>

<section class="sec" id="universities">
  <div class="wrap">
    <div class="sec-head reveal"><p class="kicker">${t('Universities', 'ਯੂਨੀਵਰਸਿਟੀਆਂ')}</p><h2>${t('Five Punjab universities, one place', 'ਪੰਜ ਪੰਜਾਬੀ ਯੂਨੀਵਰਸਿਟੀਆਂ, ਇੱਕ ਥਾਂ')}</h2><p class="muted">${t('All five are on the UGC-DEB list of entitled online universities for ' + SITE.session + '.', 'ਪੰਜੇ ' + SITE.session + ' ਲਈ UGC-DEB ਦੀ ਆਨਲਾਈਨ ਮਾਨਤਾ ਸੂਚੀ ਵਿੱਚ ਹਨ।')}</p></div>
    <div class="grid cards-uni">${UNIVERSITIES.map(uniCard).join('')}</div>
  </div>
</section>

<section class="sec alt" id="courses">
  <div class="wrap">
    <div class="sec-head reveal"><p class="kicker">${t('Courses', 'ਕੋਰਸ')}</p><h2>${t('Pick a course, see who offers it', 'ਕੋਰਸ ਚੁਣੋ, ਦੇਖੋ ਕੌਣ ਕਰਵਾਉਂਦਾ ਹੈ')}</h2></div>
    <div class="grid cards-course">${COURSES.map(courseCard).join('')}</div>
    <p class="center reveal"><a class="btn btn-ghost" href="/courses/">${t('See the full course × university table', 'ਪੂਰੀ ਕੋਰਸ × ਯੂਨੀਵਰਸਿਟੀ ਸਾਰਣੀ ਦੇਖੋ')} ${ico('arrow', 'sm')}</a></p>
  </div>
</section>

<section class="sec" id="how">
  <div class="wrap split">
    <div class="how-img reveal"><img src="${IMG.desk}" alt="Indian student typing on a laptop at a desk" loading="lazy" width="1100" height="733"></div>
    <div>
      <div class="sec-head left reveal"><p class="kicker">${t('How it works', 'ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ')}</p><h2>${t('From confused to enrolled in 3 steps', '3 ਕਦਮਾਂ ਵਿੱਚ ਉਲਝਣ ਤੋਂ ਦਾਖ਼ਲੇ ਤੱਕ')}</h2></div>
      <ol class="steps">
        <li class="reveal"><span class="n">1</span><div><h3>${t('Compare', 'ਤੁਲਨਾ ਕਰੋ')}</h3><p class="muted">${t('Pick a course and see fees, specialisations and approvals side by side.', 'ਕੋਰਸ ਚੁਣੋ ਤੇ ਫੀਸ, ਸਪੈਸ਼ਲਾਈਜ਼ੇਸ਼ਨ ਤੇ ਮਾਨਤਾ ਇਕੱਠੇ ਦੇਖੋ।')}</p></div></li>
        <li class="reveal"><span class="n">2</span><div><h3>${t('Talk to a counsellor', 'ਕਾਊਂਸਲਰ ਨਾਲ ਗੱਲ ਕਰੋ')}</h3><p class="muted">${t('Share your number. We call you in Punjabi, Hindi or English.', 'ਨੰਬਰ ਦਿਓ। ਅਸੀਂ ਪੰਜਾਬੀ, ਹਿੰਦੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਕਾਲ ਕਰਦੇ ਹਾਂ।')}</p></div></li>
        <li class="reveal"><span class="n">3</span><div><h3>${t('Enrol with confidence', 'ਭਰੋਸੇ ਨਾਲ ਦਾਖ਼ਲਾ ਲਓ')}</h3><p class="muted">${t('We help you verify on the UGC-DEB list and complete admission. Fees go straight to the university.', 'ਅਸੀਂ UGC-DEB ਸੂਚੀ ਤੇ ਜਾਂਚ ਤੇ ਦਾਖ਼ਲੇ ਵਿੱਚ ਮਦਦ ਕਰਦੇ ਹਾਂ। ਫੀਸ ਸਿੱਧੀ ਯੂਨੀਵਰਸਿਟੀ ਨੂੰ ਜਾਂਦੀ ਹੈ।')}</p></div></li>
      </ol>
    </div>
  </div>
</section>

<section class="sec alt" id="benefits">
  <div class="wrap">
    <div class="sec-head reveal"><p class="kicker">${t('Why online', 'ਆਨਲਾਈਨ ਕਿਉਂ')}</p><h2>${t('Benefits of an online degree', 'ਆਨਲਾਈਨ ਡਿਗਰੀ ਦੇ ਫਾਇਦੇ')}</h2></div>
    <div class="bento">
      <figure class="b-img reveal"><img src="${IMG.steps}" alt="Smiling Indian student with a laptop on college steps" loading="lazy" width="1100" height="733"><figcaption>${t('Study from anywhere in Punjab', 'ਪੰਜਾਬ ਵਿੱਚ ਕਿਤੋਂ ਵੀ ਪੜ੍ਹੋ')}</figcaption></figure>
      ${BENEFITS.map((b) => `<article class="b-card reveal"><span class="ci">${ico(b.icon)}</span><h3>${tb(b.title)}</h3><p class="muted">${tb(b.text)}</p></article>`).join('')}
    </div>
  </div>
</section>

<section class="sec abroad" id="abroad">
  <div class="wrap split rev">
    <div>
      <div class="sec-head left reveal"><p class="kicker">${t('Study & work abroad', 'ਵਿਦੇਸ਼ ਵਿੱਚ ਪੜ੍ਹਾਈ ਤੇ ਕੰਮ')}</p><h2>${t('Planning to go abroad? Choose your degree carefully.', 'ਵਿਦੇਸ਼ ਜਾਣਾ ਹੈ? ਡਿਗਰੀ ਸੋਚ ਸਮਝ ਕੇ ਚੁਣੋ।')}</h2></div>
      <ul class="check-list reveal">
        <li>${ico('check', 'sm')} ${t('UGC-entitled online degrees are equivalent to regular degrees within India.', 'UGC-ਮਾਨਤਾ ਪ੍ਰਾਪਤ ਆਨਲਾਈਨ ਡਿਗਰੀ ਭਾਰਤ ਵਿੱਚ ਰੈਗੂਲਰ ਡਿਗਰੀ ਦੇ ਬਰਾਬਰ ਹੈ।')}</li>
        <li>${ico('check', 'sm')} ${t('Widely used to apply for Master’s programmes and credential assessment (e.g. WES) abroad.', 'ਵਿਦੇਸ਼ ਵਿੱਚ ਮਾਸਟਰਜ਼ ਤੇ ਕ੍ਰੈਡੈਂਸ਼ੀਅਲ ਮੁਲਾਂਕਣ (ਜਿਵੇਂ WES) ਲਈ ਆਮ ਵਰਤੀ ਜਾਂਦੀ ਹੈ।')}</li>
        <li>${ico('check', 'sm')} ${t('Often accepted for skilled-worker routes — but rules differ by country and visa.', 'ਸਕਿਲਡ-ਵਰਕਰ ਰਾਹਾਂ ਲਈ ਅਕਸਰ ਮੰਨੀ ਜਾਂਦੀ ਹੈ — ਪਰ ਨਿਯਮ ਦੇਸ਼ ਤੇ ਵੀਜ਼ਾ ਅਨੁਸਾਰ ਬਦਲਦੇ ਹਨ।')}</li>
      </ul>
      <div class="note reveal"><b>${t('Honest note:', 'ਸੱਚੀ ਗੱਲ:')}</b> ${t('Some foreign universities and visa authorities treat online degrees differently. We help you check your target country’s rule before you enrol.', 'ਕੁਝ ਵਿਦੇਸ਼ੀ ਯੂਨੀਵਰਸਿਟੀਆਂ ਤੇ ਵੀਜ਼ਾ ਅਥਾਰਟੀਆਂ ਆਨਲਾਈਨ ਡਿਗਰੀ ਨੂੰ ਵੱਖਰੇ ਤਰੀਕੇ ਨਾਲ ਦੇਖਦੀਆਂ ਹਨ। ਦਾਖ਼ਲੇ ਤੋਂ ਪਹਿਲਾਂ ਅਸੀਂ ਤੁਹਾਡੇ ਟੀਚੇ ਵਾਲੇ ਦੇਸ਼ ਦੇ ਨਿਯਮ ਜਾਂਚਣ ਵਿੱਚ ਮਦਦ ਕਰਦੇ ਹਾਂ।')}</div>
      <p class="reveal"><a class="btn btn-primary" href="/why-online-degree/#abroad">${t('Read the full guide', 'ਪੂਰੀ ਗਾਈਡ ਪੜ੍ਹੋ')} ${ico('arrow', 'sm')}</a></p>
    </div>
    <div class="abroad-img reveal"><img src="${IMG.globe}" alt="Indian student with a laptop and a globe, planning to study abroad" loading="lazy" width="1100" height="733"></div>
  </div>
</section>

<section class="sec alt" id="compare-teaser">
  <div class="wrap">
    <div class="sec-head reveal"><p class="kicker">${t('Compare', 'ਤੁਲਨਾ')}</p><h2>${t('Online MBA at a glance', 'ਆਨਲਾਈਨ MBA ਇੱਕ ਨਜ਼ਰ ਵਿੱਚ')}</h2></div>
    <div class="table-wrap reveal"><table class="tbl"><thead><tr><th>${t('University', 'ਯੂਨੀਵਰਸਿਟੀ')}</th><th>${t('Specialisations', 'ਸਪੈਸ਼ਲਾਈਜ਼ੇਸ਼ਨ')}</th><th>${t('Fee (as published)', 'ਫੀਸ (ਪ੍ਰਕਾਸ਼ਿਤ)')}</th><th>NAAC</th><th></th></tr></thead><tbody>
      ${offeredBy('mba').map((u) => `<tr><th scope="row"><a href="/universities/${u.slug}/">${esc(u.name)}</a><small>${esc(u.city)}</small></th><td>${esc(u.courses.mba.spec || 'General')}</td><td>${feeText(u, 'mba')}</td><td>${u.naac || '—'}</td><td><a class="btn btn-ghost sm" href="${applyHref('mba', u.slug)}">${t('Get quote', 'ਕੋਟ ਲਓ')}</a></td></tr>`).join('')}
    </tbody></table></div>
    <p class="muted center reveal">${t('Fees are shown only where we found a published figure. * Third-party listing. Always confirm with the university.', 'ਫੀਸ ਸਿਰਫ਼ ਉਥੇ ਦਿਖਾਈ ਹੈ ਜਿੱਥੇ ਪ੍ਰਕਾਸ਼ਿਤ ਅੰਕੜਾ ਮਿਲਿਆ। * ਤੀਜੀ ਧਿਰ ਦੀ ਸੂਚੀ। ਹਮੇਸ਼ਾ ਯੂਨੀਵਰਸਿਟੀ ਤੋਂ ਪੁਸ਼ਟੀ ਕਰੋ।')}</p>
    <p class="center reveal"><a class="btn btn-primary" href="/compare/">${t('Open the compare tool', 'ਤੁਲਨਾ ਟੂਲ ਖੋਲ੍ਹੋ')} ${ico('arrow', 'sm')}</a></p>
  </div>
</section>

<section class="sec" id="faq-home">
  <div class="wrap narrow">
    <div class="sec-head reveal"><p class="kicker">FAQs</p><h2>${t('Questions students ask us', 'ਵਿਦਿਆਰਥੀ ਸਾਨੂੰ ਇਹ ਪੁੱਛਦੇ ਹਨ')}</h2></div>
    ${FAQS.filter((f) => f.home).map(faqItem).join('')}
    <p class="center reveal"><a class="btn btn-ghost" href="/faqs/">${t('All FAQs', 'ਸਾਰੇ ਸਵਾਲ-ਜਵਾਬ')} ${ico('arrow', 'sm')}</a></p>
  </div>
</section>

<section class="sec cta" id="apply">
  <div class="wrap split">
    <div class="cta-copy reveal">
      <p class="kicker light">${t('Free counselling', 'ਮੁਫ਼ਤ ਕਾਊਂਸਲਿੰਗ')}</p>
      <h2>${t('Not sure which degree is right for you?', 'ਪਤਾ ਨਹੀਂ ਕਿਹੜੀ ਡਿਗਰੀ ਠੀਕ ਹੈ?')}</h2>
      <p>${t('Leave your number. A counsellor will call you within one working day — in Punjabi, Hindi or English.', 'ਆਪਣਾ ਨੰਬਰ ਦਿਓ। ਕਾਊਂਸਲਰ ਇੱਕ ਕੰਮਕਾਜੀ ਦਿਨ ਵਿੱਚ ਪੰਜਾਬੀ, ਹਿੰਦੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਕਾਲ ਕਰੇਗਾ।')}</p>
      <img src="${IMG.class}" alt="Indian students studying together in a classroom" loading="lazy" width="1100" height="733">
      <p class="direct"><a href="tel:+91${SITE.phone}">${ico('phone', 'sm')} +91 ${SITE.phone}</a> <a href="mailto:${SITE.email}">${ico('mail', 'sm')} ${SITE.email}</a></p>
    </div>
    <div class="form-card reveal">${leadForm('home')}</div>
  </div>
</section>`);

// UNIVERSITIES LIST
pages['universities/index.html'] = page({ title: 'Online universities in Punjab — LPU, CU, DBU, Chitkara, GNDU', desc: 'UGC-DEB entitled online universities in Punjab with programmes, NAAC grade and fees.' }, 'universities', `
${crumbs([[null, t('Universities', 'ਯੂਨੀਵਰਸਿਟੀਆਂ')]])}
<section class="page-head"><div class="wrap"><h1>${t('Online universities in Punjab', 'ਪੰਜਾਬ ਦੀਆਂ ਆਨਲਾਈਨ ਯੂਨੀਵਰਸਿਟੀਆਂ')}</h1><p class="lead">${t('Every university below appears on the UGC-DEB list of HEIs entitled for online programmes for ' + SITE.session + '.', 'ਹੇਠ ਲਿਖੀਆਂ ਸਾਰੀਆਂ ਯੂਨੀਵਰਸਿਟੀਆਂ ' + SITE.session + ' ਲਈ UGC-DEB ਦੀ ਆਨਲਾਈਨ ਮਾਨਤਾ ਸੂਚੀ ਵਿੱਚ ਹਨ।')}</p>
<p>${verified(`<a class="chip" href="${SITE.ugcListUrl}" target="_blank" rel="noopener">${t('See the official list', 'ਸਰਕਾਰੀ ਸੂਚੀ ਦੇਖੋ')} ${ico('ext', 'sm')}</a>`)}</p></div></section>
<section class="sec"><div class="wrap"><div class="grid cards-uni">${UNIVERSITIES.map(uniCard).join('')}</div></div></section>`);

// UNIVERSITY PAGES
for (const u of UNIVERSITIES) {
  const rows = COURSES.filter((c) => u.courses[c.slug]);
  pages[`universities/${u.slug}/index.html`] = page({ title: `${u.name} Online — courses, fees & approvals`, desc: `${u.name} online programmes (${rows.map((r) => r.short).join(', ')}). UGC-DEB entitled for ${SITE.session}. Compare and get fee details.` }, 'universities', `
${crumbs([['/universities/', t('Universities', 'ਯੂਨੀਵਰਸਿਟੀਆਂ')], [null, esc(u.short)]])}
<section class="page-head uni-head"><div class="wrap split">
  <div><span class="uni-mark lg">${esc(u.short.slice(0, 3).toUpperCase())}</span>
  <h1>${esc(u.name)} <small>${t('Online', 'ਆਨਲਾਈਨ')}</small></h1>
  <p class="muted">${ico('map', 'sm')} ${esc(u.city)} · ${esc(u.type)}</p>
  <p class="lead">${tb(u.about)}</p>
  <p class="chips">${verified()}${u.naac ? `<span class="chip">NAAC ${u.naac}</span>` : ''}<span class="chip">${u.programmes} ${t('online programmes on UGC list', 'ਯੂਨੀਵਰਸਿਟੀ ਦੇ ਆਨਲਾਈਨ ਪ੍ਰੋਗਰਾਮ')}</span></p>
  <p><a class="btn btn-primary" href="${applyHref('', u.slug).replace('course=&', '')}">${t('Get fee details & scholarship info', 'ਫੀਸ ਤੇ ਸਕਾਲਰਸ਼ਿਪ ਜਾਣਕਾਰੀ ਲਓ')} ${ico('arrow', 'sm')}</a> <a class="btn btn-ghost" href="${u.site}" target="_blank" rel="noopener">${t('Official site', 'ਅਧਿਕਾਰਤ ਵੈੱਬਸਾਈਟ')} ${ico('ext', 'sm')}</a></p></div>
  <aside class="card side"><h2>${t('Highlights', 'ਮੁੱਖ ਗੱਲਾਂ')}</h2><ul class="check-list">${u.points.map((p) => `<li>${ico('check', 'sm')} ${esc(p)}</li>`).join('')}</ul><p class="fit"><b>${t('Good fit if:', 'ਇਹ ਠੀਕ ਹੈ ਜੇ:')}</b> ${esc(u.fit)}</p></aside>
</div></section>
<section class="sec"><div class="wrap">
  <div class="sec-head left"><h2>${t('Online courses at ' + u.short, u.short + ' ਦੇ ਆਨਲਾਈਨ ਕੋਰਸ')}</h2></div>
  <div class="table-wrap"><table class="tbl"><thead><tr><th>${t('Course', 'ਕੋਰਸ')}</th><th>${t('Duration', 'ਮਿਆਦ')}</th><th>${t('Specialisations / notes', 'ਸਪੈਸ਼ਲਾਈਜ਼ੇਸ਼ਨ / ਨੋਟ')}</th><th>${t('Fee (as published)', 'ਫੀਸ (ਪ੍ਰਕਾਸ਼ਿਤ)')}</th><th></th></tr></thead><tbody>
  ${rows.map((c) => `<tr><th scope="row"><a href="/courses/${c.slug}/">${esc(c.short)}</a><small>${esc(c.name)}</small></th><td>${esc(c.duration)}</td><td>${esc(u.courses[c.slug].spec || '—')}</td><td>${feeText(u, c.slug)}</td><td><a class="btn btn-ghost sm" href="${applyHref(c.slug, u.slug)}">${t('Apply / quote', 'ਅਪਲਾਈ / ਕੋਟ')}</a></td></tr>`).join('')}
  </tbody></table></div>
  <p class="muted">${u.feeSource ? esc('Fee source: ' + u.feeSource + '. ') : ''}${t('Fees change every session — a counsellor confirms the latest amount. Programme list verified on ' + SITE.verifiedOn + '.', 'ਫੀਸ ਹਰ ਸੈਸ਼ਨ ਬਦਲਦੀ ਹੈ — ਕਾਊਂਸਲਰ ਤਾਜ਼ਾ ਰਕਮ ਦੱਸੇਗਾ। ਪ੍ਰੋਗਰਾਮ ਸੂਚੀ ' + SITE.verifiedOn + ' ਨੂੰ ਜਾਂਚੀ ਗਈ।')}</p>
</div></section>
<section class="sec alt"><div class="wrap split"><div><h2>${t('Compare ' + u.short + ' with others', u.short + ' ਦੀ ਹੋਰਾਂ ਨਾਲ ਤੁਲਨਾ')}</h2><p class="muted">${t('Pick a course and see all five universities side by side.', 'ਕੋਰਸ ਚੁਣੋ ਤੇ ਪੰਜੇ ਯੂਨੀਵਰਸਿਟੀਆਂ ਇਕੱਠੀਆਂ ਦੇਖੋ।')}</p><p><a class="btn btn-primary" href="/compare/?u=${u.slug}">${t('Open compare tool', 'ਤੁਲਨਾ ਟੂਲ ਖੋਲ੍ਹੋ')}</a></p></div>
<div class="form-card" id="apply">${leadForm('u-' + u.slug, { uni: u.slug })}</div></div></section>`);
}

// COURSES LIST (matrix)
pages['courses/index.html'] = page({ title: 'Online courses in Punjab — course × university table', desc: 'See which Punjab universities offer online MBA, MCA, BBA, BCA, BA, B.Com, MA, M.Com, M.Sc and M.Lib.' }, 'courses', `
${crumbs([[null, t('Courses', 'ਕੋਰਸ')]])}
<section class="page-head"><div class="wrap"><h1>${t('Which university offers which course?', 'ਕਿਹੜੀ ਯੂਨੀਵਰਸਿਟੀ ਕਿਹੜਾ ਕੋਰਸ ਕਰਵਾਉਂਦੀ ਹੈ?')}</h1><p class="lead">${t('Tap a course for eligibility, careers and side-by-side comparison.', 'ਯੋਗਤਾ, ਕਰੀਅਰ ਤੇ ਤੁਲਨਾ ਲਈ ਕੋਰਸ ਤੇ ਟੈਪ ਕਰੋ।')}</p>
<div class="filters" role="group" aria-label="Filter"><button class="pill on" data-filter="all" type="button">${t('All', 'ਸਾਰੇ')}</button><button class="pill" data-filter="UG" type="button">${t('Undergraduate', 'ਅੰਡਰਗ੍ਰੈਜੂਏਟ')}</button><button class="pill" data-filter="PG" type="button">${t('Postgraduate', 'ਪੋਸਟਗ੍ਰੈਜੂਏਟ')}</button>
<label class="search">${ico('search', 'sm')}<input type="search" id="course-search" placeholder="Search a course…" data-ph data-en="Search a course…" data-pa="ਕੋਰਸ ਖੋਜੋ…" aria-label="Search course"></label></div></div></section>
<section class="sec"><div class="wrap"><div class="table-wrap"><table class="tbl matrix" id="matrix"><thead><tr><th>${t('Course', 'ਕੋਰਸ')}</th>${UNIVERSITIES.map((u) => `<th><a href="/universities/${u.slug}/">${u.short}</a></th>`).join('')}</tr></thead><tbody>
${COURSES.map((c) => `<tr data-level="${c.level}" data-text="${esc((c.short + ' ' + c.name).toLowerCase())}"><th scope="row"><a href="/courses/${c.slug}/">${esc(c.short)}</a><small>${esc(c.name)} · ${c.level}</small></th>${UNIVERSITIES.map((u) => `<td>${u.courses[c.slug] ? `<span class="yes" title="${esc(u.courses[c.slug].spec || 'Available')}">${ico('check', 'sm')}<span class="sr">Yes</span></span>` : '<span class="no" aria-label="Not offered">–</span>'}</td>`).join('')}</tr>`).join('')}
</tbody></table></div>
<p class="muted">${t('Programme availability checked against the UGC-DEB 2026-27 list on ' + SITE.verifiedOn + '. Hover or tap a tick for specialisations.', 'ਉਪਲਬਧਤਾ ' + SITE.verifiedOn + ' ਨੂੰ UGC-DEB 2026-27 ਸੂਚੀ ਨਾਲ ਜਾਂਚੀ ਗਈ।')}</p></div></section>`);

// COURSE PAGES
for (const c of COURSES) {
  const offer = offeredBy(c.slug);
  pages[`courses/${c.slug}/index.html`] = page({ title: `Online ${c.short} (${c.name}) in Punjab — compare universities`, desc: `Compare online ${c.short} from ${offer.map((u) => u.short).join(', ')}. Eligibility, duration, fees and careers. UGC-DEB entitled.` }, 'courses', `
${crumbs([['/courses/', t('Courses', 'ਕੋਰਸ')], [null, esc(c.short)]])}
<section class="page-head"><div class="wrap split"><div><span class="ci lg">${ico(c.icon)}</span><h1>${t('Online ' + c.short, 'ਆਨਲਾਈਨ ' + c.short)} <small>${esc(c.name)}</small></h1><p class="lead">${tb(c.blurb)}</p>
<ul class="facts big"><li><b>${esc(c.duration)}</b>${t('Duration', 'ਮਿਆਦ')}</li><li><b>${c.level === 'UG' ? t('Undergraduate', 'ਅੰਡਰਗ੍ਰੈਜੂਏਟ') : t('Postgraduate', 'ਪੋਸਟਗ੍ਰੈਜੂਏਟ')}</b>${t('Level', 'ਪੱਧਰ')}</li><li><b>${offer.length}</b>${t('universities', 'ਯੂਨੀਵਰਸਿਟੀਆਂ')}</li></ul></div>
<aside class="card side"><h2>${t('Eligibility', 'ਯੋਗਤਾ')}</h2><p>${esc(c.elig)}</p><h2>${t('Career paths', 'ਕਰੀਅਰ ਦੇ ਰਾਹ')}</h2><ul class="check-list">${c.careers.map((x) => `<li>${ico('check', 'sm')} ${esc(x)}</li>`).join('')}</ul></aside></div></section>
<section class="sec"><div class="wrap"><div class="sec-head left"><h2>${t('Online ' + c.short + ' — compare universities', 'ਆਨਲਾਈਨ ' + c.short + ' — ਯੂਨੀਵਰਸਿਟੀਆਂ ਦੀ ਤੁਲਨਾ')}</h2></div>
<div class="table-wrap"><table class="tbl"><thead><tr><th>${t('University', 'ਯੂਨੀਵਰਸਿਟੀ')}</th><th>${t('Specialisations / notes', 'ਸਪੈਸ਼ਲਾਈਜ਼ੇਸ਼ਨ / ਨੋਟ')}</th><th>${t('Fee (as published)', 'ਫੀਸ (ਪ੍ਰਕਾਸ਼ਿਤ)')}</th><th>NAAC</th><th>UGC-DEB</th><th></th></tr></thead><tbody>
${offer.map((u) => `<tr><th scope="row"><a href="/universities/${u.slug}/">${esc(u.name)}</a><small>${esc(u.city)}</small></th><td>${esc(u.courses[c.slug].spec || '—')}</td><td>${feeText(u, c.slug)}</td><td>${u.naac || '—'}</td><td><span class="chip ok sm">${ico('check', 'sm')} ${SITE.session}</span></td><td><a class="btn btn-primary sm" href="${applyHref(c.slug, u.slug)}">${t('Get quote', 'ਕੋਟ ਲਓ')}</a></td></tr>`).join('')}
</tbody></table></div>
<p class="muted">${t('Fees only where a published figure was found. Counsellor confirms the current amount. * Third-party listing.', 'ਫੀਸ ਸਿਰਫ਼ ਉਥੇ ਜਿੱਥੇ ਪ੍ਰਕਾਸ਼ਿਤ ਅੰਕੜਾ ਮਿਲਿਆ। ਕਾਊਂਸਲਰ ਮੌਜੂਦਾ ਰਕਮ ਦੱਸੇਗਾ। * ਤੀਜੀ ਧਿਰ ਦੀ ਸੂਚੀ।')}</p>
<p><a class="btn btn-ghost" href="/compare/?course=${c.slug}">${t('Open in compare tool', 'ਤੁਲਨਾ ਟੂਲ ਵਿੱਚ ਖੋਲ੍ਹੋ')} ${ico('arrow', 'sm')}</a></p></div></section>
<section class="sec alt"><div class="wrap split"><div><h2>${t('Get free guidance for ' + c.short, c.short + ' ਲਈ ਮੁਫ਼ਤ ਸਲਾਹ ਲਓ')}</h2><p class="muted">${t('We help you choose between the universities above based on budget, goal and your target (job, exam or abroad).', 'ਅਸੀਂ ਬਜਟ, ਟੀਚੇ (ਨੌਕਰੀ, ਪ੍ਰੀਖਿਆ ਜਾਂ ਵਿਦੇਸ਼) ਅਨੁਸਾਰ ਉੱਪਰ ਦੀਆਂ ਯੂਨੀਵਰਸਿਟੀਆਂ ਵਿੱਚੋਂ ਚੋਣ ਵਿੱਚ ਮਦਦ ਕਰਦੇ ਹਾਂ।')}</p></div><div class="form-card" id="apply">${leadForm('c-' + c.slug, { course: c.slug })}</div></div></section>`);
}

// COMPARE
pages['compare/index.html'] = page({ title: 'Compare online universities side by side', desc: 'Pick a course and compare up to 3 Punjab universities on fees, approvals, specialisations and more.' }, 'compare', `
${crumbs([[null, t('Compare', 'ਤੁਲਨਾ')]])}
<section class="page-head"><div class="wrap"><h1>${t('Compare in 60 seconds', '60 ਸਕਿੰਟਾਂ ਵਿੱਚ ਤੁਲਨਾ ਕਰੋ')}</h1><p class="lead">${t('Choose a course, then tick up to 3 universities.', 'ਕੋਰਸ ਚੁਣੋ, ਫਿਰ 3 ਤੱਕ ਯੂਨੀਵਰਸਿਟੀਆਂ ਚੁਣੋ।')}</p></div></section>
<section class="sec"><div class="wrap" id="compare-app">
  <div class="cmp-controls card"><div class="field"><label for="cmp-course">${t('1. Course', '1. ਕੋਰਸ')}</label><select id="cmp-course">${COURSES.map((c) => `<option value="${c.slug}">${c.short} — ${esc(c.name)}</option>`).join('')}</select></div>
  <fieldset class="field"><legend>${t('2. Universities (max 3)', '2. ਯੂਨੀਵਰਸਿਟੀਆਂ (ਵੱਧ ਤੋਂ ਵੱਧ 3)')}</legend><div id="cmp-unis" class="chips-select"></div></fieldset></div>
  <div class="table-wrap" id="cmp-out" aria-live="polite"></div>
  <noscript><p>${t('Please enable JavaScript, or see the', 'ਕਿਰਪਾ ਕਰਕੇ JavaScript ਚਾਲੂ ਕਰੋ, ਜਾਂ ਦੇਖੋ')} <a href="/courses/">${t('course table', 'ਕੋਰਸ ਸਾਰਣੀ')}</a>.</p></noscript>
  <p class="muted">${t('Fees only where a published figure was found; * third-party listing. Confirm with the university.', 'ਫੀਸ ਸਿਰਫ਼ ਉਥੇ ਜਿੱਥੇ ਪ੍ਰਕਾਸ਼ਿਤ ਅੰਕੜਾ ਮਿਲਿਆ; * ਤੀਜੀ ਧਿਰ ਦੀ ਸੂਚੀ। ਯੂਨੀਵਰਸਿਟੀ ਤੋਂ ਪੁਸ਼ਟੀ ਕਰੋ।')}</p>
</div></section>`);

// WHY ONLINE
pages['why-online-degree/index.html'] = page({ title: 'Why an online degree? Benefits, UGC recognition & studying abroad', desc: 'Benefits of UGC-entitled online degrees, how to verify recognition, online vs distance vs regular, and using your degree for study or work abroad.' }, 'why', `
${crumbs([[null, t('Why online degree', 'ਆਨਲਾਈਨ ਡਿਗਰੀ ਕਿਉਂ')]])}
<section class="page-head"><div class="wrap split"><div><h1>${t('Why choose an online degree?', 'ਆਨਲਾਈਨ ਡਿਗਰੀ ਕਿਉਂ ਚੁਣੋ?')}</h1><p class="lead">${t('A UGC-entitled online degree gives you the same recognition as a regular degree in India — without leaving your job or your town.', 'UGC-ਮਾਨਤਾ ਪ੍ਰਾਪਤ ਆਨਲਾਈਨ ਡਿਗਰੀ ਭਾਰਤ ਵਿੱਚ ਰੈਗੂਲਰ ਡਿਗਰੀ ਜਿੰਨੀ ਮਾਨਤਾ ਦਿੰਦੀ ਹੈ — ਨੌਕਰੀ ਜਾਂ ਸ਼ਹਿਰ ਛੱਡੇ ਬਿਨਾਂ।')}</p></div><div class="how-img"><img src="${IMG.bench}" alt="Indian student with laptop studying on a campus bench" width="1100" height="733"></div></div></section>
<section class="sec"><div class="wrap"><div class="bento flat">${BENEFITS.map((b) => `<article class="b-card reveal"><span class="ci">${ico(b.icon)}</span><h3>${tb(b.title)}</h3><p class="muted">${tb(b.text)}</p></article>`).join('')}</div></div></section>
<section class="sec alt" id="recognition"><div class="wrap narrow">
  <div class="sec-head left"><h2>${t('UGC recognition — how to verify it yourself', 'UGC ਮਾਨਤਾ — ਆਪ ਕਿਵੇਂ ਜਾਂਚੋ')}</h2></div>
  <ol class="steps plain"><li><span class="n">1</span><div>${t('Open', 'ਖੋਲ੍ਹੋ')} <a href="${SITE.ugcDebUrl}" target="_blank" rel="noopener">deb.ugc.ac.in</a></div></li>
  <li><span class="n">2</span><div>${t('Open the list “HEIs Entitled for Online Programmes AY ' + SITE.session + '”.', '“HEIs Entitled for Online Programmes AY ' + SITE.session + '” ਸੂਚੀ ਖੋਲ੍ਹੋ।')} <a href="${SITE.ugcListUrl}" target="_blank" rel="noopener">${t('Direct link (PDF)', 'ਸਿੱਧਾ ਲਿੰਕ (PDF)')}</a></div></li>
  <li><span class="n">3</span><div>${t('Find the university and check that your exact programme is listed.', 'ਯੂਨੀਵਰਸਿਟੀ ਲੱਭੋ ਤੇ ਦੇਖੋ ਕਿ ਤੁਹਾਡਾ ਪ੍ਰੋਗਰਾਮ ਸੂਚੀ ਵਿੱਚ ਹੈ।')}</div></li></ol>
  <div class="table-wrap"><table class="tbl"><thead><tr><th></th><th>${t('Regular', 'ਰੈਗੂਲਰ')}</th><th>${t('Online', 'ਆਨਲਾਈਨ')}</th><th>${t('Distance (ODL)', 'ਡਿਸਟੈਂਸ (ODL)')}</th></tr></thead><tbody>
  <tr><th scope="row">${t('How you study', 'ਪੜ੍ਹਾਈ ਕਿਵੇਂ')}</th><td>${t('On campus', 'ਕੈਂਪਸ ਵਿੱਚ')}</td><td>${t('LMS, live + recorded classes', 'LMS, ਲਾਈਵ + ਰਿਕਾਰਡ ਕਲਾਸਾਂ')}</td><td>${t('Study material + contact classes', 'ਸਟੱਡੀ ਮਟੀਰੀਅਲ + ਸੰਪਰਕ ਕਲਾਸਾਂ')}</td></tr>
  <tr><th scope="row">${t('Exams', 'ਪ੍ਰੀਖਿਆ')}</th><td>${t('In person', 'ਹਾਜ਼ਰ ਹੋ ਕੇ')}</td><td>${t('Online / proctored', 'ਆਨਲਾਈਨ / ਪ੍ਰਾਕਟਰਡ')}</td><td>${t('Mostly at exam centres', 'ਜ਼ਿਆਦਾਤਰ ਪ੍ਰੀਖਿਆ ਕੇਂਦਰਾਂ ਵਿੱਚ')}</td></tr>
  <tr><th scope="row">${t('UGC approval', 'UGC ਮਨਜ਼ੂਰੀ')}</th><td>UGC / university</td><td>UGC-DEB (online)</td><td>UGC-DEB (ODL)</td></tr></tbody></table></div>
</div></section>
<section class="sec abroad" id="abroad"><div class="wrap split rev"><div>
  <div class="sec-head left"><p class="kicker">${t('Study & work abroad', 'ਵਿਦੇਸ਼ ਵਿੱਚ ਪੜ੍ਹਾਈ ਤੇ ਕੰਮ')}</p><h2>${t('Using your online degree abroad', 'ਵਿਦੇਸ਼ ਵਿੱਚ ਆਨਲਾਈਨ ਡਿਗਰੀ ਦੀ ਵਰਤੋਂ')}</h2></div>
  <h3>${t('For higher studies', 'ਉੱਚ ਪੜ੍ਹਾਈ ਲਈ')}</h3><p>${t('A degree from a UGC-recognised university is widely accepted for Master’s applications. Each foreign university has its own policy for online-mode degrees, so confirm with them before you enrol.', 'UGC-ਮਾਨਤਾ ਪ੍ਰਾਪਤ ਯੂਨੀਵਰਸਿਟੀ ਦੀ ਡਿਗਰੀ ਮਾਸਟਰਜ਼ ਦੀਆਂ ਅਰਜ਼ੀਆਂ ਲਈ ਆਮ ਮੰਨੀ ਜਾਂਦੀ ਹੈ। ਆਨਲਾਈਨ ਮੋਡ ਬਾਰੇ ਹਰ ਵਿਦੇਸ਼ੀ ਯੂਨੀਵਰਸਿਟੀ ਦੀ ਆਪਣੀ ਨੀਤੀ ਹੈ — ਦਾਖ਼ਲੇ ਤੋਂ ਪਹਿਲਾਂ ਪੁੱਛੋ।')}</p>
  <h3>${t('For work visas & immigration', 'ਵਰਕ ਵੀਜ਼ਾ ਤੇ ਇਮੀਗ੍ਰੇਸ਼ਨ ਲਈ')}</h3><p>${t('Skilled-worker routes usually need an educational credential assessment (for example WES for Canada). A UGC-recognised degree can be assessed; acceptance depends on the country, the assessor and the visa category.', 'ਸਕਿਲਡ-ਵਰਕਰ ਰਾਹਾਂ ਲਈ ਆਮ ਤੌਰ ਤੇ ਵਿੱਦਿਅਕ ਯੋਗਤਾ ਮੁਲਾਂਕਣ ਚਾਹੀਦਾ ਹੈ (ਜਿਵੇਂ ਕੈਨੇਡਾ ਲਈ WES)। UGC-ਮਾਨਤਾ ਪ੍ਰਾਪਤ ਡਿਗਰੀ ਦਾ ਮੁਲਾਂਕਣ ਹੋ ਸਕਦਾ ਹੈ; ਮਨਜ਼ੂਰੀ ਦੇਸ਼, ਮੁਲਾਂਕਣ ਸੰਸਥਾ ਤੇ ਵੀਜ਼ਾ ਕਿਸਮ ਤੇ ਨਿਰਭਰ ਹੈ।')}</p>
  <div class="note"><b>${t('Our promise:', 'ਸਾਡਾ ਵਾਅਦਾ:')}</b> ${t('We will not tell you “valid everywhere”. We help you check the exact rule for your country first.', 'ਅਸੀਂ ਇਹ ਨਹੀਂ ਕਹਾਂਗੇ ਕਿ “ਹਰ ਥਾਂ ਵੈਧ”। ਪਹਿਲਾਂ ਤੁਹਾਡੇ ਦੇਸ਼ ਦਾ ਸਹੀ ਨਿਯਮ ਜਾਂਚਣ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗੇ।')}</div>
  <p><button class="btn btn-primary" type="button" data-open-dialog>${t('Check my country’s rule', 'ਮੇਰੇ ਦੇਸ਼ ਦਾ ਨਿਯਮ ਜਾਂਚੋ')}</button></p></div>
  <div class="abroad-img"><img src="${IMG.globe}" alt="Indian student with a laptop and a globe" loading="lazy" width="1100" height="733"></div></div></section>
<section class="sec"><div class="wrap narrow"><div class="sec-head"><h2>${t('Still have questions?', 'ਹਾਲੇ ਵੀ ਸਵਾਲ ਹਨ?')}</h2></div>${FAQS.filter((f) => f.g === 'abroad' || f.g === 'validity').slice(0, 5).map(faqItem).join('')}<p class="center"><a class="btn btn-ghost" href="/faqs/">${t('All FAQs', 'ਸਾਰੇ ਸਵਾਲ-ਜਵਾਬ')}</a></p></div></section>`);

// FAQS
pages['faqs/index.html'] = page({ title: 'FAQs — online degrees, UGC recognition, fees, abroad', desc: 'Answers on UGC recognition, validity, fees, EMI, exams and using an online degree abroad.' }, 'faqs', `
${crumbs([[null, t('FAQs', 'ਸਵਾਲ-ਜਵਾਬ')]])}
<section class="page-head"><div class="wrap"><h1>${t('Frequently asked questions', 'ਅਕਸਰ ਪੁੱਛੇ ਜਾਣ ਵਾਲੇ ਸਵਾਲ')}</h1>
<label class="search big">${ico('search', 'sm')}<input type="search" id="faq-search" placeholder="Search questions…" data-ph data-en="Search questions…" data-pa="ਸਵਾਲ ਖੋਜੋ…" aria-label="Search FAQs"></label></div></section>
<section class="sec"><div class="wrap narrow" id="faq-list">${FAQ_GROUPS.map((g) => `<div class="faq-group"><h2>${tb(g.title)}</h2>${FAQS.filter((f) => f.g === g.id).map((f) => faqItem(f, -1)).join('')}</div>`).join('')}<p id="faq-empty" class="muted center" hidden>${t('No match. Ask us directly on WhatsApp.', 'ਕੋਈ ਮੇਲ ਨਹੀਂ। ਸਾਨੂੰ ਵਟਸਐਪ ਤੇ ਪੁੱਛੋ।')}</p></div></section>
<section class="sec cta"><div class="wrap center"><h2>${t('Didn’t find your answer?', 'ਜਵਾਬ ਨਹੀਂ ਮਿਲਿਆ?')}</h2><p><a class="btn btn-accent lg" href="${wa('Hi Degree Plus, I have a question about online degrees.')}" target="_blank" rel="noopener">${ico('whatsapp')} ${t('Ask on WhatsApp', 'ਵਟਸਐਪ ਤੇ ਪੁੱਛੋ')}</a></p></div></section>`);

// ABOUT
pages['about/index.html'] = page({ title: 'About Degree Plus', desc: 'Degree Plus is an independent, honest guide to UGC-entitled online degrees for students in Punjab.' }, 'about', `
${crumbs([[null, t('About', 'ਸਾਡੇ ਬਾਰੇ')]])}
<section class="page-head"><div class="wrap split"><div><h1>${t('Honest guidance, from an economist’s desk', 'ਇੱਕ ਅਰਥ-ਸ਼ਾਸਤਰੀ ਵੱਲੋਂ ਇਮਾਨਦਾਰ ਸਲਾਹ')}</h1><p class="lead">${t('Degree Plus was started by an Assistant Professor of Economics from Punjab, after seeing how many students pick an online degree without knowing if it is recognised.', 'Degree Plus ਦੀ ਸ਼ੁਰੂਆਤ ਪੰਜਾਬ ਦੇ ਇੱਕ ਅਰਥ ਸ਼ਾਸਤਰ ਦੇ ਸਹਾਇਕ ਪ੍ਰੋਫ਼ੈਸਰ ਨੇ ਕੀਤੀ, ਜਦੋਂ ਦੇਖਿਆ ਕਿ ਕਿੰਨੇ ਵਿਦਿਆਰਥੀ ਬਿਨਾਂ ਮਾਨਤਾ ਜਾਣੇ ਆਨਲਾਈਨ ਡਿਗਰੀ ਚੁਣ ਲੈਂਦੇ ਹਨ।')}</p></div><div class="how-img"><img src="${IMG.pair}" alt="Two Indian students reading a book together" width="1000" height="667"></div></div></section>
<section class="sec"><div class="wrap narrow"><div class="grid cards-3">
<article class="card"><span class="ci">${ico('shield')}</span><h3>${t('We check before we list', 'ਅਸੀਂ ਸੂਚੀਬੱਧ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਜਾਂਚਦੇ ਹਾਂ')}</h3><p class="muted">${t('Every university and programme is matched with the UGC-DEB list. Distance (ODL) courses are never shown as online.', 'ਹਰ ਯੂਨੀਵਰਸਿਟੀ ਤੇ ਪ੍ਰੋਗਰਾਮ UGC-DEB ਸੂਚੀ ਨਾਲ ਮਿਲਾਇਆ ਜਾਂਦਾ ਹੈ। ਡਿਸਟੈਂਸ (ODL) ਕੋਰਸ ਕਦੇ ਆਨਲਾਈਨ ਵਜੋਂ ਨਹੀਂ ਦਿਖਾਏ ਜਾਂਦੇ।')}</p></article>
<article class="card"><span class="ci">${ico('users')}</span><h3>${t('Local & in your language', 'ਸਥਾਨਕ ਤੇ ਤੁਹਾਡੀ ਬੋਲੀ ਵਿੱਚ')}</h3><p class="muted">${t('Punjab-first guidance, in Punjabi, Hindi or English.', 'ਪੰਜਾਬ ਪਹਿਲਾਂ — ਪੰਜਾਬੀ, ਹਿੰਦੀ ਜਾਂ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਸਲਾਹ।')}</p></article>
<article class="card"><span class="ci">${ico('coins')}</span><h3>${t('Free for students', 'ਵਿਦਿਆਰਥੀਆਂ ਲਈ ਮੁਫ਼ਤ')}</h3><p class="muted">${t('You pay the university directly. Never pay an individual.', 'ਤੁਸੀਂ ਸਿੱਧੀ ਯੂਨੀਵਰਸਿਟੀ ਨੂੰ ਭੁਗਤਾਨ ਕਰਦੇ ਹੋ। ਕਿਸੇ ਵਿਅਕਤੀ ਨੂੰ ਨਹੀਂ।')}</p></article></div>
<p class="center"><a class="btn btn-primary" href="/contact/">${t('Talk to us', 'ਸਾਡੇ ਨਾਲ ਗੱਲ ਕਰੋ')}</a></p></div></section>`);

// CONTACT
pages['contact/index.html'] = page({ title: 'Contact Degree Plus — free counselling', desc: 'Call or WhatsApp +91 9592912356 or leave your details for a free callback about online degrees.' }, 'contact', `
${crumbs([[null, t('Contact', 'ਸੰਪਰਕ')]])}
<section class="page-head"><div class="wrap"><h1>${t('Talk to a counsellor', 'ਕਾਊਂਸਲਰ ਨਾਲ ਗੱਲ ਕਰੋ')}</h1><p class="lead">${t('Call, WhatsApp or leave your details. We reply within one working day.', 'ਕਾਲ ਕਰੋ, ਵਟਸਐਪ ਕਰੋ ਜਾਂ ਵੇਰਵੇ ਦਿਓ। ਅਸੀਂ ਇੱਕ ਕੰਮਕਾਜੀ ਦਿਨ ਵਿੱਚ ਜਵਾਬ ਦਿੰਦੇ ਹਾਂ।')}</p></div></section>
<section class="sec"><div class="wrap split"><div class="contact-cards">
<a class="card c-card" href="tel:+91${SITE.phone}"><span class="ci">${ico('phone')}</span><div><h3>${t('Call', 'ਕਾਲ')}</h3><p>+91 ${SITE.phone}</p></div></a>
<a class="card c-card" href="${wa('Hi Degree Plus, I want free counselling for an online degree.')}" target="_blank" rel="noopener"><span class="ci">${ico('whatsapp')}</span><div><h3>WhatsApp</h3><p>+91 ${SITE.phone}</p></div></a>
<a class="card c-card" href="mailto:${SITE.email}"><span class="ci">${ico('mail')}</span><div><h3>Email</h3><p>${SITE.email}</p></div></a>
<p class="muted">${t('Hours: Monday–Saturday, 10 am – 7 pm IST.', 'ਸਮਾਂ: ਸੋਮਵਾਰ–ਸ਼ਨੀਵਾਰ, ਸਵੇਰੇ 10 – ਸ਼ਾਮ 7 ਵਜੇ।')}</p></div>
<div class="form-card" id="apply">${leadForm('contact')}</div></div></section>`);

// LEGAL
const legal = (slug, title, titlePa, body) => {
  pages[`${slug}/index.html`] = page({ title, desc: `${title} for Degree Plus.` }, '', `${crumbs([[null, t(title, titlePa)]])}<section class="page-head"><div class="wrap"><h1>${t(title, titlePa)}</h1></div></section><section class="sec"><div class="wrap narrow prose">${body}</div></section>`);
};
legal('privacy-policy', 'Privacy policy', 'ਪ੍ਰਾਈਵੇਸੀ ਨੀਤੀ', `
<p><em>Last updated: ${SITE.verifiedOn}</em></p>
<h2>What we collect</h2><p>When you submit the form we collect your name, mobile number, course and university interest, state and district, and the page you submitted from. We do not collect payment details.</p>
<h2>Why we collect it</h2><p>To call or message you (including on WhatsApp) about the programmes you asked about, and to share your enquiry with the universities you chose so they can contact you. We process this on the basis of your consent, in line with India’s Digital Personal Data Protection Act, 2023.</p>
<h2>Who sees it</h2><p>Degree Plus staff and the universities you are interested in. We do not sell your data.</p>
<h2>How long we keep it</h2><p>Until your enquiry is closed, or for up to 24 months, whichever is earlier, unless you ask us to delete it sooner.</p>
<h2>Your rights</h2><p>You can ask to see, correct or delete your data, or withdraw consent, at any time: <a href="mailto:${SITE.email}">${SITE.email}</a> or +91 ${SITE.phone}.</p>`);
legal('terms', 'Terms of use', 'ਵਰਤੋਂ ਦੀਆਂ ਸ਼ਰਤਾਂ', `
<p>Degree Plus provides information and counselling about online degree programmes. It is not a university and does not award degrees. Admission, fees, refunds and examinations are governed entirely by the university you enrol with. Content is for guidance and may change; always confirm details with the university and on the UGC-DEB website before paying any fee.</p>`);
legal('disclaimer', 'Disclaimer', 'ਡਿਸਕਲੇਮਰ', `
<p>Degree Plus is an independent platform and is not affiliated with, endorsed by, or the official admission portal of any university listed. University names and logos belong to their respective owners.</p>
<p>Programme availability was checked against the UGC-DEB list “HEIs Entitled for Online Programmes AY ${SITE.session}” on ${SITE.verifiedOn}. UGC lists are updated; verify the current list at <a href="${SITE.ugcDebUrl}" target="_blank" rel="noopener">deb.ugc.ac.in</a>.</p>
<p>Fees shown are indicative figures published by the university or third-party listings and may change each session. Acceptance of a degree for employment, further study, immigration or visas abroad is decided by the relevant employer, institution or authority, not by Degree Plus.</p>`);

// 404
pages['404.html'] = page({ title: 'Page not found', desc: 'Page not found' }, '', `<section class="page-head"><div class="wrap center"><h1>404</h1><p class="lead">${t('This page does not exist.', 'ਇਹ ਪੰਨਾ ਮੌਜੂਦ ਨਹੀਂ ਹੈ।')}</p><p><a class="btn btn-primary" href="/">${t('Go home', 'ਹੋਮ ਤੇ ਜਾਓ')}</a></p></div></section>`);

// ── write everything ────────────────────────────────────────
for (const [file, html] of Object.entries(pages)) {
  const out = path.join(DIST, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}
fs.cpSync(path.join(ROOT, 'src/img'), path.join(DIST, 'assets/img'), { recursive: true });
fs.cpSync(path.join(ROOT, 'src/fonts'), path.join(DIST, 'assets/fonts'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src/css/style.css'), path.join(DIST, 'assets/style.css'));
fs.copyFileSync(path.join(ROOT, 'src/js/main.js'), path.join(DIST, 'assets/main.js'));
fs.copyFileSync(path.join(ROOT, 'src/favicon.svg'), path.join(DIST, 'assets/favicon.svg'));
fs.writeFileSync(path.join(DIST, 'assets/districts.json'), JSON.stringify(DISTRICTS));
fs.writeFileSync(path.join(DIST, 'assets/data.json'), JSON.stringify({
  session: SITE.session,
  courses: COURSES.map(({ slug, short, name, level, duration, elig }) => ({ slug, short, name, level, duration, elig })),
  universities: UNIVERSITIES.map(({ slug, short, name, city, type, naac, programmes, courses, points }) => ({ slug, short, name, city, type, naac, programmes, courses, points })),
}));
fs.writeFileSync(path.join(DIST, 'robots.txt'), 'User-agent: *\nAllow: /\n');
fs.writeFileSync(path.join(DIST, '_headers'), `/assets/*\n  Cache-Control: public, max-age=3600\n/assets/img/*\n  Cache-Control: public, max-age=31536000, immutable\n/assets/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);
console.log(`Built ${Object.keys(pages).length} pages → dist/ (${totalProgrammes} programme entries, ${Object.keys(DISTRICTS).length} states/UTs, ${Object.values(DISTRICTS).flat().length} districts)`);
