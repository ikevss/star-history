import { newPage, closePage, navigate, screenshot, evalJs } from './cdp.mjs';
import fs from 'fs';

const c = await newPage({ width: 1440, height: 900, mobile: false });
const t0 = Date.now();
await navigate(c, 'https://star-history-3wn.pages.dev/', 4000);
const wall = Date.now() - t0;

const r = await evalJs(c, `(()=>{
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const cards = [...document.querySelectorAll('a[href^="/"]')].filter(a=>/^\\/[^/]+\\/[^/]+$/.test(a.getAttribute('href')||''));
  const uniq = [...new Set(cards.map(a=>a.getAttribute('href')))];
  const inViewport = (el)=>{const r=el.getBoundingClientRect();return r.top < window.innerHeight && r.bottom > 0;};
  const visibleCards = cards.filter(inViewport).length;
  const bodyText = document.body.innerText;
  const terms = ['stargazer','fork','commit','slug','repo','token','登录','注册','连接 GitHub','GitHub Token','API'];
  const foundTerms = terms.filter(t=>bodyText.toLowerCase().includes(t.toLowerCase()));
  const headerText = (document.querySelector('header')?.innerText || document.querySelector('nav')?.innerText || '');
  return {
    domContentLoaded: nav.domContentLoadedEventEnd,
    loadEvent: nav.loadEventEnd,
    responseEnd: nav.responseEnd,
    totalCards: cards.length,
    uniqueCardHrefs: uniq.length,
    visibleCardsWithoutScroll: visibleCards,
    h1: document.querySelector('h1')?.innerText,
    sub: [...document.querySelectorAll('p')].map(e=>e.innerText.trim()).filter(Boolean).slice(0,6),
    filterChips: [...document.querySelectorAll('button')].map(b=>b.innerText.trim()).filter(Boolean),
    headerText,
    foundTerms,
    footerText: document.querySelector('footer')?.innerText?.slice(0,600) || null,
    title: document.title,
  };
})()`);

console.log(JSON.stringify({ wallMs: wall, ...r }, null, 2));
console.log('ERRORS', JSON.stringify(c._rec.consoleErrors), JSON.stringify(c._rec.logErrors), JSON.stringify(c._rec.pageErrors));
console.log('BAD', JSON.stringify(c._rec.badResponses));
await closePage(c);
fs.writeFileSync('/workspace/acceptance/round-3/testB.json', JSON.stringify({ wallMs: wall, ...r, consoleErrors: c._rec.consoleErrors, badResponses: c._rec.badResponses }, null, 2));
