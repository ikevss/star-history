import { run } from './cdp.mjs';
import fs from 'node:fs';

const out = [];
const jobs = [
  { url: 'https://star-history-3wn.pages.dev/', width: 1440, height: 900, mobile: false, name: 'home-1440', fullPage: true },
  { url: 'https://star-history-3wn.pages.dev/', width: 768, height: 1024, mobile: false, name: 'home-768', fullPage: true },
  { url: 'https://star-history-3wn.pages.dev/', width: 375, height: 812, mobile: true, name: 'home-375', fullPage: true },
];
for (const j of jobs) {
  try {
    const r = await run(j);
    out.push(r);
    console.log('=== ' + j.name + ' ===');
    console.log('title:', r.metrics?.title);
    console.log('hscroll:', r.metrics?.hasHScroll, 'scrollW', r.metrics?.scrollWidth, 'clientW', r.metrics?.clientWidth);
    console.log('overflowCount:', r.metrics?.overflowCount);
    console.log('overflowSample:', JSON.stringify(r.metrics?.overflowSample));
    console.log('errors:', JSON.stringify(r.errors));
    console.log('bodyTextHead:', (r.metrics?.bodyText||'').slice(0, 800).replace(/\n/g,' | '));
  } catch (e) {
    console.log('FAILED', j.name, e.message);
  }
}
fs.writeFileSync('/workspace/acceptance/round-5/raw-home.json', JSON.stringify(out, null, 2));
