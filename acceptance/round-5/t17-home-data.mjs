import { run } from './cdp.mjs';
import fs from 'node:fs';

const r = await run({
  url: 'https://star-history-3wn.pages.dev/',
  width: 1440, height: 900, mobile: false, name: 'home-filters', wait: 3500,
  actions: async (s) => {
    const perf = await s.evaluate(`(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paints = performance.getEntriesByType('paint').map(p=>({n:p.name, t:Math.round(p.startTime)}));
      const lcp = performance.getEntriesByType('largest-contentful-paint').slice(-1)[0];
      const res = performance.getEntriesByType('resource').map(r=>({n:r.name.split('/').pop().slice(0,40), d:Math.round(r.duration), size:r.transferSize})).sort((a,b)=>b.d-a.d).slice(0,8);
      return {ttfb: Math.round(nav?.responseStart||0), domContentLoaded: Math.round(nav?.domContentLoadedEventEnd||0), load: Math.round(nav?.loadEventEnd||0), paints, lcp: lcp?Math.round(lcp.startTime):null, slowest: res};
    })()`);
    const cards = await s.evaluate(`(() => [...document.querySelectorAll('a')].filter(a=>/^\\/[^/]+\\/[^/]+$/.test(a.getAttribute('href')||'')).map(a=>{
      const txt=(a.innerText||'').split('\\n').map(t=>t.trim()).filter(Boolean);
      return {href:a.getAttribute('href'), lines: txt};
    }))()`);
    const filterRes = [];
    for (const label of ['AI','前端','后端','学习资源','全部']) {
      const res = await s.evaluate(`(async () => {
        const btn = [...document.querySelectorAll('button')].find(b=>(b.innerText||'').trim().startsWith(${JSON.stringify(label)}));
        if (!btn) return {missing:true};
        btn.click();
        await new Promise(r=>setTimeout(r,600));
        const cards = [...document.querySelectorAll('a')].filter(a=>/^\\/[^/]+\\/[^/]+$/.test(a.getAttribute('href')||''));
        return {label: btn.innerText.trim(), count: cards.length, titles: cards.map(c=>(c.innerText||'').split('\\n')[1]), url: location.href, active: btn.className.includes('bg-neutral-900')};
      })()`);
      filterRes.push(res);
    }
    return { perf, cards, filterRes };
  }
});
console.log('PERF', JSON.stringify(r.actionResults?.perf, null, 2));
console.log('CARDS', JSON.stringify(r.actionResults?.cards, null, 2).slice(0, 5000));
console.log('FILTERS', JSON.stringify(r.actionResults?.filterRes, null, 2));
console.log('ERRORS', JSON.stringify(r.errors));
fs.writeFileSync('/workspace/acceptance/round-5/raw-home-data.json', JSON.stringify(r.actionResults, null, 2));
