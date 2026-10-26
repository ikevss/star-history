import { newPage, closePage, navigate, evalJs, sleep } from './cdp.mjs';
import fs from 'fs';

const c = await newPage({ width: 1440, height: 900, mobile: false });
await navigate(c, 'https://star-history-3wn.pages.dev/', 3500);
const hrefs = await evalJs(c, `(()=>{
  const s = new Set();
  for (const a of document.querySelectorAll('a[href^="/"]')){
    const h = a.getAttribute('href');
    if (/^\\/[^/]+\\/[^/]+$/.test(h) && !h.startsWith('/blog')) s.add(h);
  }
  return [...s];
})()`);
console.log('CARD COUNT', hrefs.length);

const results = [];
for (const h of hrefs) {
  c._rec.consoleErrors.length = 0;
  c._rec.badResponses.length = 0;
  c._rec.pageErrors.length = 0;
  c._rec.logErrors.length = 0;
  await c.send('Network.clearBrowserCache');
  await navigate(c, 'https://star-history-3wn.pages.dev' + h, 3000);
  const info = await evalJs(c, `(()=>({title:document.title,url:location.href,h1:document.querySelector('h1')?.innerText?.trim()||null, hasCanvas:!!document.querySelector('canvas,svg'), bodyLen:document.body.innerText.length}))()`);
  const slug = h.slice(1);
  const ok = info.title && info.title.includes(slug);
  results.push({ href: h, slug, finalUrl: info.url, title: info.title, h1: info.h1, titleMatch: !!ok, consoleErrors: c._rec.consoleErrors.slice(), pageErrors: c._rec.pageErrors.slice(), logErrors: c._rec.logErrors.slice(), badResponses: c._rec.badResponses.slice() });
  console.log(`${ok ? 'OK ' : 'BAD'} ${h} -> ${info.url} | ${info.title} | err=${c._rec.consoleErrors.length} bad=${c._rec.badResponses.length}`);
}
fs.writeFileSync('/workspace/acceptance/round-3/testCards.json', JSON.stringify(results, null, 2));
await closePage(c);
