import { run } from './cdp.mjs';
import fs from 'node:fs';

const r = await run({
  url: 'https://star-history-3wn.pages.dev/',
  width: 1440, height: 900, mobile: false, name: 'dom-home-1440', wait: 3500,
  actions: async (s) => {
    return await s.evaluate(`(() => {
      const out = {};
      out.inputs = [...document.querySelectorAll('input')].map(i => ({type:i.type, aria:i.getAttribute('aria-label'), ph:i.placeholder, cls:(i.className||'').toString().slice(0,120)}));
      out.header = [...document.querySelectorAll('header *')].filter(e=>e.children.length===0 && (e.innerText||'').trim()).map(e=>({tag:e.tagName, text:(e.innerText||'').trim().slice(0,60), href:e.getAttribute('href')})).slice(0,40);
      out.navLinks = [...document.querySelectorAll('a')].map(a=>({text:(a.innerText||'').trim().slice(0,50), href:a.getAttribute('href')})).slice(0,60);
      out.buttons = [...document.querySelectorAll('button')].map(b=>({text:(b.innerText||'').trim().slice(0,40), aria:b.getAttribute('aria-label'), cls:(b.className||'').toString().slice(0,80)}));
      out.cards = [...document.querySelectorAll('a')].filter(a=>/^\\/[^/]+\\/[^/]+$/.test(a.getAttribute('href')||'')).map(a=>({href:a.getAttribute('href'), text:a.innerText.replace(/\\n/g,' | ').slice(0,160)}));
      out.cardCount = out.cards.length;
      out.bodySnippet = document.body.innerText.slice(0,200);
      out.h1 = document.querySelector('h1')?.innerText;
      out.views = { header: !!document.querySelector('header'), search: !!document.querySelector('input[aria-label="搜索开源项目"]') };
      return out;
    })()`);
  }
});
console.log(JSON.stringify(r.actionResults, null, 2));
console.log('ERRORS', JSON.stringify(r.errors));
fs.writeFileSync('/workspace/acceptance/round-5/raw-dom-home.json', JSON.stringify(r.actionResults, null, 2));
