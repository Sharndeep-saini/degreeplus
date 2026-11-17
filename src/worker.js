// Degree Plus – Cloudflare Worker: serves the static site (dist/) and the lead-form API.
//   POST /api/lead              → saves an enquiry in D1 (binding "DB"); optional email via Resend
//   GET  /api/leads?token=...   → CSV download of enquiries (needs the ADMIN_TOKEN secret)
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const clean = (v, max = 120) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

let ready; // create the table on first use, so no manual database setup is needed
const ensureSchema = (db) => (ready ||= db.batch([
  db.prepare(`CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, course TEXT NOT NULL, university TEXT, state TEXT NOT NULL, district TEXT NOT NULL, source TEXT, user_agent TEXT)`),
  db.prepare('CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone, created_at)'),
]).catch((e) => { ready = undefined; throw e; }));

async function postLead(request, env, ctx) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }
  if (b.website) return json({ ok: true }); // honeypot: bots fill the hidden field
  const lead = {
    name: clean(b.name, 80), phone: String(b.phone ?? '').replace(/\D/g, '').slice(-10),
    course: clean(b.course, 40), university: clean(b.university, 60), state: clean(b.state, 60),
    district: clean(b.district, 80), source: clean(b.source, 120),
  };
  if (lead.name.length < 2 || !/^[6-9]\d{9}$/.test(lead.phone) || !lead.course || !lead.state || !lead.district || b.consent !== true) return json({ error: 'invalid' }, 422);
  if (!env.DB) return json({ error: 'not_configured' }, 503);
  await ensureSchema(env.DB);
  const row = await env.DB.prepare('SELECT COUNT(*) c FROM leads WHERE phone = ? AND created_at > ?').bind(lead.phone, Date.now() - 3600_000).first();
  if ((row?.c ?? 0) >= 5) return json({ ok: true }); // light rate limit per phone number
  await env.DB.prepare('INSERT INTO leads (created_at, name, phone, course, university, state, district, source, user_agent) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(Date.now(), lead.name, lead.phone, lead.course, lead.university, lead.state, lead.district, lead.source, clean(request.headers.get('user-agent'), 200)).run();
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    const text = `New Degree Plus enquiry\n\nName: ${lead.name}\nPhone: +91 ${lead.phone}\nCourse: ${lead.course}\nUniversity: ${lead.university}\nLocation: ${lead.district}, ${lead.state}\nPage: ${lead.source}`;
    ctx.waitUntil(fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM || 'Degree Plus <onboarding@resend.dev>', to: [env.NOTIFY_EMAIL], subject: `New lead: ${lead.name} – ${lead.course}`, text }),
    }).catch(() => {}));
  }
  return json({ ok: true });
}

async function getLeads(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return new Response('Unauthorized', { status: 401 });
  await ensureSchema(env.DB);
  const { results } = await env.DB.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5000').all();
  const head = ['id', 'date (IST)', 'name', 'phone', 'course', 'university', 'state', 'district', 'page'];
  const rows = results.map((r) => [r.id, new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), r.name, r.phone, r.course, r.university, r.state, r.district, r.source].map(csv).join(','));
  return new Response([head.join(','), ...rows].join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="degreeplus-leads.csv"', 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/api/lead') return request.method === 'POST' ? await postLead(request, env, ctx) : json({ error: 'method_not_allowed' }, 405);
      if (pathname === '/api/leads') return request.method === 'GET' ? await getLeads(request, env) : json({ error: 'method_not_allowed' }, 405);
    } catch (e) { return json({ error: 'server_error' }, 500); }
    return env.ASSETS.fetch(request);
  },
};
