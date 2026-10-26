import { run } from './cdp.mjs';
const r = await run({
  url: 'https://star-history-3wn.pages.dev/', width: 1440, height: 900, mobile: false, name: 'header-ratelimit', wait: 5000,
  actions: async (s) => await s.evaluate(`(() => {
    const header = document.querySelector('header');
    const nums = [...header.querySelectorAll('*')].map(e=>(e.innerText||'').trim()).filter(t=>/^[\\d,]+$/.test(t));
    return {headerText: (header.innerText||'').replace(/\\n/g,' | '), nums, html: header.outerHTML.slice(0,1200)};
  })()`)
});
console.log(JSON.stringify(r.actionResults, null, 2).slice(0, 2500));
console.log('ERR', JSON.stringify(r.errors.map(e=>({t:e.type, st:e.status, url:(e.url||'').slice(0,80), text:(e.text||'').slice(0,80)}))));
