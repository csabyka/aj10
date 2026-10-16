// Használat: ICAL_LIME="https://ical.booking.com/v1/export?t=..." node update-availability.mjs
// Futtasd időzítve (cron / GitHub Action), a kimenet az index.html mellé kerül.
// Az Orange iCal-t add meg ICAL_ORANGE néven, ha lesz.
import { writeFileSync } from 'node:fs';

const feeds = { lime: process.env.ICAL_LIME, orange: process.env.ICAL_ORANGE };
const out = {};

for (const [house, url] of Object.entries(feeds)) {
  out[house] = [];
  if (!url) continue;
  const text = (await (await fetch(url)).text()).replace(/\r?\n[ \t]/g, '');
  for (const ev of text.split('BEGIN:VEVENT').slice(1)) {
    const s = ev.match(/DTSTART[^:]*:(\d{4})(\d{2})(\d{2})/);
    const e = ev.match(/DTEND[^:]*:(\d{4})(\d{2})(\d{2})/);
    if (s && e) out[house].push([s.slice(1, 4).join('-'), e.slice(1, 4).join('-')]);
  }
}
writeFileSync('availability.json', JSON.stringify(out));
console.log('availability.json kész:', Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])));
