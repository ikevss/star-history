import { run } from './cdp.mjs';

const r = await run({
  url: 'https://star-history-3wn.pages.dev/vuejs/core',
  width: 375, height: 812, mobile: true, name: 'detail-375-probe', wait: 4000,
  actions: async (s) => await s.evaluate(`(() => {
    const pick = (sel) => { const e = document.querySelector(sel); if(!e) return null; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return {sel, text:(e.innerText||'').slice(0,60), fontSize:cs.fontSize, transform:cs.transform, w:Math.round(r.width), h:Math.round(r.height), x:Math.round(r.x), y:Math.round(r.y)}; };
    const all = [...document.querySelectorAll('*')].filter(e=>{const cs=getComputedStyle(e);return parseFloat(cs.fontSize)<10 && (e.innerText||'').trim().length>0 && e.children.length===0});
    const scaled = [...document.querySelectorAll('*')].filter(e=>{const t=getComputedStyle(e).transform; return t && t!=='none' && t.includes('matrix')}).map(e=>({cls:(e.className||'').toString().slice(0,70), transform:getComputedStyle(e).transform, w:Math.round(e.getBoundingClientRect().width)}));
    return {
      htmlFont: getComputedStyle(document.documentElement).fontSize,
      mainFont: pick('main'),
      tinyTexts: all.slice(0,25).map(e=>({text:(e.innerText||'').trim().slice(0,30), fs:getComputedStyle(e).fontSize, cls:(e.className||'').toString().slice(0,50)})),
      tinyCount: all.length,
      scaled,
      metaViewport: document.querySelector('meta[name=viewport]')?.content,
      bodyRect: document.body.getBoundingClientRect().toJSON(),
      cardBox: (()=>{const c=document.querySelector('.max-w-4xl, .max-w-5xl, main'); if(!c) return null; const r=c.getBoundingClientRect(); return {w:Math.round(r.width), x:Math.round(r.x)}})(),
      overlap: (()=>{
        const prev = [...document.querySelectorAll('a')].find(a=>/powerlevel10k/.test(a.innerText));
        const center = [...document.querySelectorAll('*')].find(e=>/第 340/.test((e.innerText||'')) && e.children.length===0);
        const right = [...document.querySelectorAll('a')].find(a=>/trackerslist/.test(a.innerText));
        const f = e => e? (()=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(r.right),bottom:Math.round(r.bottom)}})() : null;
        return {prev:f(prev), center:f(center), right:f(right)};
      })()
    };
  })()`)
});
console.log(JSON.stringify(r.actionResults, null, 2));
console.log('ERR', JSON.stringify(r.errors));
