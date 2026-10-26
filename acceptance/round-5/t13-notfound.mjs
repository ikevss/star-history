import { run } from './cdp.mjs';
import fs from 'node:fs';

const cases = [
  { url: 'https://star-history-3wn.pages.dev/notexist/notexist', name: 'notfound-notexist' },
  { url: 'https://star-history-3wn.pages.dev/facebook/react', name: 'notfound-facebook-react' },
  { url: 'https://star-history-3wn.pages.dev/star-history/star-history', name: 'notfound-starhistory' },
  { url: 'https://star-history-3wn.pages.dev/this-is-a-bad-url', name: 'notfound-badslug' },
];
const out = [];
for (const c of cases) {
  const r = await run({
    url: c.url, width: 1440, height: 900, mobile: false, name: c.name, wait: 4500,
    actions: async (s) => await s.evaluate(`(() => ({title: document.title, text: document.body.innerText.replace(/\\n/g,' | ').slice(0,400), h1: document.querySelector('h1')?.innerText}))()`)
  });
  out.push({ ...c, status: r.errors.filter(e=>e.type==='http').map(e=>e.status), data: r.actionResults, errors: r.errors, hscroll: r.metrics?.hasHScroll });
  console.log('###', c.url);
  console.log('  http:', JSON.stringify(r.errors.filter(e=>e.type==='http')));
  console.log('  title:', r.actionResults?.title);
  console.log('  text:', (r.actionResults?.text||'').slice(0,300));
  console.log('  errors:', JSON.stringify(r.errors.filter(e=>e.type!=='http').map(e=>({t:e.type,text:(e.text||'').slice(0,80)}))));
}
fs.writeFileSync('/workspace/acceptance/round-5/raw-notfound.json', JSON.stringify(out, null, 2));
