// Cloudflare Worker: /api/availability = Booking iCal -> JSON (15 perc cache). Minden más a statikus fájlokból jön.
const FEEDS = { lime: 'ICAL_LIME', orange: 'ICAL_ORANGE' };

function parse(text) {
  const out = [];
  for (const ev of text.replace(/\r?\n[ \t]/g, '').split('BEGIN:VEVENT').slice(1)) {
    const s = ev.match(/DTSTART[^:]*:(\d{4})(\d{2})(\d{2})/);
    const e = ev.match(/DTEND[^:]*:(\d{4})(\d{2})(\d{2})/);
    if (s && e) out.push([s.slice(1, 4).join('-'), e.slice(1, 4).join('-')]);
  }
  return out;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname !== '/api/availability') return env.ASSETS.fetch(req);

    const cache = caches.default;
    const key = new Request(url.origin + '/api/availability');
    const hit = await cache.match(key);
    if (hit) return hit;

    const data = {};
    let ok = true;
    await Promise.all(Object.entries(FEEDS).map(async ([house, secret]) => {
      data[house] = null; // null = nincs naptár megadva / nem elérhető
      if (!env[secret]) return;
      try {
        const r = await fetch(env[secret]);
        if (r.ok) data[house] = parse(await r.text());
        else ok = false;
      } catch { ok = false; }
    }));

    const res = new Response(JSON.stringify(data), {
      status: ok ? 200 : 502,
      headers: { 'content-type': 'application/json', 'cache-control': ok ? 'public, max-age=900' : 'no-store' },
    });
    if (ok) ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  },
};
