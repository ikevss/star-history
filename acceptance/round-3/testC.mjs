import { newPage, closePage, navigate, evalJs } from './cdp.mjs';

const c = await newPage({ width: 1440, height: 900, mobile: false });
await navigate(c, 'https://star-history-3wn.pages.dev/', 4000);
const r = await evalJs(c, `(()=>{
  const cards = [...document.querySelectorAll('a[href^="/"]')].filter(a=>/^\\/[^/]+\\/[^/]+$/.test(a.getAttribute('href')||''));
  const hrefs = cards.map(a=>a.getAttribute('href'));
  const dup = hrefs.filter((h,i)=>hrefs.indexOf(h)!==i);
  // where does 'repo'/'API'/'star' appear in visible UI text
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const hits = [];
  let n; while(n=walker.nextNode()){ const t=n.textContent; if(/repo\\b|\\bAPI\\b|star/i.test(t)){ const el=n.parentElement; hits.push({text:t.trim().slice(0,80), cls:(el?.className||'').toString().slice(0,40)}); if(hits.length>20) break; } }
  return { hrefs, dup, hits, cardCount: cards.length };
})()`);
console.log(JSON.stringify(r, null, 2));
await closePage(c);
