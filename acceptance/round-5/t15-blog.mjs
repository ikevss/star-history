import { run } from './cdp.mjs';
import fs from 'node:fs';
const pages = [
  { url: 'https://star-history-3wn.pages.dev/blog', name: 'blog', w: 1440, h: 900, m: false },
  { url: 'https://star-history-3wn.pages.dev/blog/how-to-use-github-star-history', name: 'howto', w: 1440, h: 900, m: false },
  { url: 'https://star-history-3wn.pages.dev/blog', name: 'blog-375', w: 375, h: 812, m: true },
];
for (const p of pages) {
  const r = await run({
    url: p.url, width: p.w, height: p.h, mobile: p.m, name: p.name, wait: 4000, fullPage: p.w === 1440,
    actions: async (s) => await s.evaluate(`(() => ({
      title: document.title,
      text: document.body.innerText.replace(/\\n/g,' | ').slice(0,700),
      brandHits: (document.body.innerHTML.match(/star-history(\\.com)?/gi)||[]).length,
      brandSamples: (document.body.innerHTML.match(/[^"'<>]{0,30}star-history(\\.com)?[^"'<>]{0,30}/gi)||[]).slice(0,8),
      hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth
    }))()`)
  });
  console.log('###', p.url, p.w);
  console.log('  title:', r.actionResults?.title);
  console.log('  brandHits:', r.actionResults?.brandHits, JSON.stringify(r.actionResults?.brandSamples));
  console.log('  text:', r.actionResults?.text);
  console.log('  errors:', JSON.stringify(r.errors.map(e=>({t:e.type,text:(e.text||e.url||'').slice(0,90)}))));
  console.log('  hscroll:', r.metrics?.hasHScroll, 'overflow:', r.metrics?.overflowCount);
}
