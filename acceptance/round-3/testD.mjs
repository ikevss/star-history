import { newPage, closePage, navigate, evalJs, screenshot } from './cdp.mjs';

const c = await newPage({ width: 1440, height: 900, mobile: false });
await navigate(c, 'https://star-history-3wn.pages.dev/', 4000);
await screenshot(c, '/workspace/acceptance/round-3/screenshots/home-1440-fold.png');
const r = await evalJs(c, `(()=>{
  const secs = [...document.querySelectorAll('section, div')].filter(e=>e.querySelector('h2,h3'));
  const out = [];
  for (const s of document.querySelectorAll('h1,h2,h3')){
    const rect = s.getBoundingClientRect();
    out.push({tag:s.tagName, text:s.innerText.trim(), top:Math.round(rect.top+window.scrollY)});
  }
  const inp = document.querySelector('input');
  const inpRect = inp ? inp.getBoundingClientRect() : null;
  const helper = inp ? inp.closest('div')?.parentElement?.innerText : null;
  const gh = [...document.querySelectorAll('a')].find(a=>a.href.includes('github.com/star-history'));
  return {
    headings: out,
    inputTop: inpRect ? Math.round(inpRect.top+window.scrollY) : null,
    inputPlaceholder: inp?.placeholder,
    searchSectionText: helper,
    ghHeaderHTML: gh ? gh.outerHTML.slice(0,400) : null,
    docHeight: document.documentElement.scrollHeight,
  };
})()`);
console.log(JSON.stringify(r, null, 2));
await closePage(c);
