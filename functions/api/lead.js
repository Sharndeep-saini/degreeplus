// Cloudflare Pages Function: POST /api/lead
// Saves the enquiry in D1 (binding "DB") and, if RESEND_API_KEY is set, emails you instantly.
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const clean = (v, max = 120) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);

export async function onRequestPost({ request, env, waitUntil }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'bad_request' }, 400); }

  // honeypot: bots fill the hidden field. Pretend success, store nothing.
  if (b.website) return json({ ok: true });

  const lead = {
    name: clean(b.name, 80),
    phone: String(b.phone ?? '').replace(/\D/g, '').slice(-10),
    course: clean(b.course, 40),
    university: clean(b.university, 60),
    state: clean(b.state, 60),
    district: clean(b.district, 80),
    source: clean(b.source, 120),
  };
  if (lead.name.length < 2 || !/^[6-9]\d{9}$/.test(lead.phone) || !lead.course || !lead.state || !lead.district || b.consent !== true) {
    return json({ error: 'invalid' }, 422);
  }

  // light rate limit: max 5 enquiries / hour / phone number
  if (env.DB) {
    const since = Date.now() - 3600_000;
    const { c } = (await env.DB.prepare('SELECT COUNT(*) c FROM leads WHERE phone = ? AND created_at > ?').bind(lead.phone, since).first()) || { c: 0 };
    if (c >= 5) return json({ ok: true });
    await env.DB.prepare(
      'INSERT INTO leads (created_at, name, phone, course, university, state, district, source, user_agent) VALUES (?,?,?,?,?,?,?,?,?)'
    ).bind(Date.now(), lead.name, lead.phone, lead.course, lead.university, lead.state, lead.district, lead.source, clean(request.headers.get('user-agent'), 200)).run();
  } else {
    return json({ error: 'not_configured' }, 503); // no database bound → tell the form to show the call/WhatsApp fallback
  }

  // optional instant email via Resend (https://resend.com) — set RESEND_API_KEY and NOTIFY_EMAIL as secrets
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    const text = `New Degree Plus enquiry\n\nName: ${lead.name}\nPhone: +91 ${lead.phone}\nCourse: ${lead.course}\nUniversity: ${lead.university}\nLocation: ${lead.district}, ${lead.state}\nPage: ${lead.source}`;
    waitUntil?.(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM || 'Degree Plus <onboarding@resend.dev>', to: [env.NOTIFY_EMAIL], subject: `New lead: ${lead.name} – ${lead.course}`, text }),
    }).catch(() => {}));
  }
  return json({ ok: true });
}

export const onRequest = () => json({ error: 'method_not_allowed' }, 405);
