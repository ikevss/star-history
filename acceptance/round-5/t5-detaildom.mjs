import { run } from './cdp.mjs';
import fs from 'node:fs';

const r = await run({
  url: 'https://star-history-3wn.pages.dev/vuejs/core',
  width: 1440, height: 900, mobile: false, name: 'detail-dom-1440', wait: 4500,
  actions: async (s) => {
    return await s.evaluate(`(() => {
      const txt = document.body.innerText;
      const dup = {};
      txt.split('\\n').map(t=>t.trim()).filter(Boolean).forEach(t=>dup[t]=(dup[t]||0)+1);
      const repeated = Object.entries(dup).filter(([k,v])=>v>1 && k.length>3);
      return {
        docHeight: document.documentElement.scrollHeight,
        iframes: [...document.querySelectorAll('iframe')].map(f=>({src:f.src, w:f.getBoundingClientRect().width, h:f.getBoundingClientRect().height})),
        images: [...document.querySelectorAll('img')].map(i=>({src:i.src.slice(0,120), alt:i.alt, w:Math.round(i.getBoundingClientRect().width), h:Math.round(i.getBoundingClientRect().height)})),
        svgCount: document.querySelectorAll('svg').length,
        canvasCount: document.querySelectorAll('canvas').length,
        repeated,
        fullText: txt,
        placeholder: document.querySelector('input')?.placeholder,
        inputAria: document.querySelector('input')?.getAttribute('aria-label'),
        buttons: [...document.querySelectorAll('button,a')].map(b=>({t:(b.innerText||'').trim().slice(0,40), href:b.getAttribute('href'), aria:b.getAttribute('aria-label')})).slice(0,30),
        statNodes: [...document.querySelectorAll('*')].filter(e=>/^53\\.1k$|^9\\.1k$|^32$/.test((e.innerText||'').trim()) && e.children.length===0).map(e=>({tag:e.tagName, text:e.innerText.trim(), parentText:(e.parentElement?.innerText||'').replace(/\\n/g,' | ').slice(0,120)})),
      };
    })()`);
  }
});
console.log(JSON.stringify(r.actionResults, null, 2).slice(0, 6000));
console.log('ERRORS', JSON.stringify(r.errors));
