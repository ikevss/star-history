import { run } from './cdp.mjs';
import fs from 'node:fs';

const r = await run({
  url: 'https://star-history-3wn.pages.dev/',
  width: 1440, height: 900, mobile: false, name: 'search-visibility-1440', wait: 3500,
  actions: async (s) => {
    return await s.evaluate(`(() => {
      const inp = document.querySelector('input[aria-label="搜索开源项目"]');
      const rect = inp ? inp.getBoundingClientRect() : null;
      const cs = inp ? getComputedStyle(inp) : null;
      let chain = [];
      let el = inp;
      while (el && el !== document.body) {
        const c = getComputedStyle(el);
        chain.push({tag: el.tagName, cls: (el.className||'').toString().slice(0,100), display:c.display, vis:c.visibility, opacity:c.opacity, rect: el.getBoundingClientRect().toJSON()});
        el = el.parentElement;
      }
      return {
        rect, display: cs?.display, visibility: cs?.visibility, opacity: cs?.opacity,
        value: inp?.value, chain,
        inViewport: rect ? (rect.top >= 0 && rect.top < window.innerHeight && rect.width > 0) : null,
        elementsAtCenterTop: document.elementsFromPoint(window.innerWidth/2, 18).map(e=>e.tagName+'.'+(e.className||'').toString().slice(0,50)),
      };
    })()`);
  }
});
console.log(JSON.stringify(r.actionResults, null, 2));
console.log('ERRORS', JSON.stringify(r.errors));
