import { newPage, closePage, navigate, evalJs } from './cdp.mjs';

const c = await newPage({ width: 1440, height: 900, mobile: false });
await navigate(c, 'https://star-history-3wn.pages.dev/', 4000);
const r = await evalJs(c, `(()=>{
  const hs = [...document.querySelectorAll('h2')];
  const out = {};
  for (const h of hs){
    const sec = h.closest('section') || h.parentElement;
    out[h.innerText.trim()] = sec.innerText.trim();
  }
  // ad labels
  const ads = [...document.querySelectorAll('a')].filter(a=>/utm_source/.test(a.href||'')).map(a=>a.innerText.trim().slice(0,60));
  const sponsored = document.body.innerText.match(/sponsor|推广|广告|promote/gi);
  return { sections: out, ads, sponsored, fullText: document.body.innerText };
})()`);
console.log(JSON.stringify(r.sections, null, 2));
console.log('--- ADS ---'); console.log(JSON.stringify(r.ads));
console.log('--- SPONSORED LABELS ---'); console.log(JSON.stringify(r.sponsored));
console.log('--- FULLTEXT ---'); console.log(r.fullText);
await closePage(c);
