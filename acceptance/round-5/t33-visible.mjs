import { run } from './cdp.mjs';
for (const [w,h,m] of [[1440,900,false],[375,812,true]]) {
  const r = await run({
    url: 'https://star-history-3wn.pages.dev/', width: w, height: h, mobile: m, name: `vis-${w}`, wait: 3500,
    actions: async (s) => await s.evaluate(`(() => {
      const cards = [...document.querySelectorAll('a')].filter(a=>/^\\/[^/]+\\/[^/]+$/.test(a.getAttribute('href')||'') && !a.getAttribute('href').includes('blog'));
      const vis = cards.filter(c=>{const r=c.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0});
      const full = cards.filter(c=>{const r=c.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight});
      return {total: cards.length, visible: vis.length, fullyVisible: full.length};
    })()`)
  });
  console.log(w, JSON.stringify(r.actionResults));
}
