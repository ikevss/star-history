import { run } from './cdp.mjs';
import fs from 'node:fs';

for (let i = 1; i <= 3; i++) {
  const r = await run({
    url: 'https://star-history-3wn.pages.dev/anomalyco/opencode',
    width: 1440, height: 900, mobile: false, name: `opencode-repro-${i}`, wait: 5000,
    actions: async (s) => await s.evaluate(`(() => ({title:document.title, text:document.body.innerText.replace(/\\n/g,' | ').slice(0,300)}))()`)
  });
  console.log(`--- run ${i} ---`, r.metrics?.title);
  console.log('errors:', JSON.stringify(r.errors.map(e=>({type:e.type, text:(e.text||'').slice(0,90)}))));
}

const r2 = await run({
  url: 'https://star-history-3wn.pages.dev/openclaw/openclaw',
  width: 1440, height: 900, mobile: false, name: 'openclaw-check', wait: 5000
});
console.log('--- openclaw ---', r2.metrics?.title, JSON.stringify(r2.errors.map(e=>({type:e.type,text:(e.text||'').slice(0,80)}))));
