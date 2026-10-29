import { run } from './cdp.mjs';
const r = await run({
  url: 'https://star-history-3wn.pages.dev/blog/how-to-use-github-star-history',
  width: 1440, height: 900, mobile: false, name: 'howto-overflow', wait: 4000,
  actions: async (s) => await s.evaluate(`(() => {
    const els = [...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect(); return r.width>0 && r.right>innerWidth+1});
    return els.slice(0,20).map(e=>{const r=e.getBoundingClientRect(); return {tag:e.tagName, cls:(e.className||'').toString().slice(0,60), right:Math.round(r.right), w:Math.round(r.width), text:(e.innerText||'').slice(0,60).replace(/\\n/g,' ')}});
  })()`)
});
console.log(JSON.stringify(r.actionResults, null, 2));
console.log('hscroll', r.metrics?.hasHScroll);
