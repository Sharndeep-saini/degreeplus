// GET /api/leads?token=...  → CSV download of all enquiries (open in Excel / Google Sheets).
// Protected by the ADMIN_TOKEN secret. Without the token it returns 401.
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return new Response('Unauthorized', { status: 401 });
  const { results } = await env.DB.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT 5000').all();
  const head = ['id', 'date (IST)', 'name', 'phone', 'course', 'university', 'state', 'district', 'page'];
  const rows = results.map((r) => [r.id, new Date(r.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), r.name, r.phone, r.course, r.university, r.state, r.district, r.source].map(csv).join(','));
  return new Response([head.join(','), ...rows].join('\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="degreeplus-leads.csv"', 'Cache-Control': 'no-store' },
  });
}
