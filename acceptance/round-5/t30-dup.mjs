import { run } from './cdp.mjs';
const r = await run({
  url: 'https://star-history-3wn.pages.dev/vuejs/core', width: 1440, height: 900, mobile: false, name: 'dup-badge', wait: 4000,
  actions: async (s) => await s.evaluate(`(() => {
    const els = [...document.querySelectorAll('*')].filter(e=>(e.innerText||'').trim()==='GLOBAL RANK');
    return els.map(e=>{const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return {tag:e.tagName, ariaHidden:e.getAttribute('aria-hidden'), opacity:cs.opacity, vis:cs.visibility, disp:cs.display, x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height), parentCls:(e.parentElement?.className||'').toString().slice(0,60), parentAria:e.parentElement?.getAttribute('aria-hidden')}});
  })()`)
});
console.log(JSON.stringify(r.actionResults, null, 2));
