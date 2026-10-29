import { newPage, closePage, navigate, evalJs, screenshot, sleep } from './cdp.mjs';

const c = await newPage({ width: 375, height: 812, mobile: true });
await navigate(c, 'https://star-history-3wn.pages.dev/vuejs/core', 3500);
await screenshot(c, '/workspace/acceptance/round-3/screenshots/project-vuejs-375.png');
await screenshot(c, '/workspace/acceptance/round-3/screenshots/project-vuejs-375-full.png', true);
const m = await evalJs(c, `(()=>{
  const t = document.body.innerText;
  return {
    url: location.href, title: document.title,
    brandInHeader: document.querySelector('a[href="/"]')?.innerText?.trim() || null,
    fullText: t,
    hasChinese: /[\\u4e00-\\u9fff]/.test(t),
    chineseSnippets: (t.match(/[\\u4e00-\\u9fff][^\\n]*/g)||[]).slice(0,10),
    techTerms: ['Forks','Pushes','Issues Closed','Contributors','Stars','stargazer','commit','slug','repo'].filter(x=>t.includes(x)),
    vw: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
    overflowEls: (()=>{const out=[];for(const el of document.querySelectorAll('*')){const r=el.getBoundingClientRect();if(r.width>0&&(r.right>window.innerWidth+1||r.left<-1))out.push(el.tagName+'.'+(el.className||'').toString().slice(0,40));}return out.slice(0,10);})(),
  };
})()`);
console.log(JSON.stringify(m, null, 2));
console.log('ERRORS', JSON.stringify(c._rec.consoleErrors), 'BAD', JSON.stringify(c._rec.badResponses));
await closePage(c);
