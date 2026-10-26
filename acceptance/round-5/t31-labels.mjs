import { run } from './cdp.mjs';
const r = await run({
  url: 'https://star-history-3wn.pages.dev/', width: 1440, height: 900, mobile: false, name: 'labels', wait: 3500,
  actions: async (s) => await s.evaluate(`(() => {
    const gh = [...document.querySelectorAll('header a')].find(a=>/github\\.com\\/star-history/.test(a.href));
    const total = [...document.querySelectorAll('*')].find(e=>(e.innerText||'').trim()==='共 24.6万');
    return {
      ghLink: gh ? {title: gh.getAttribute('title'), aria: gh.getAttribute('aria-label'), text: gh.innerText.trim(), href: gh.href} : null,
      totalStar: total ? {title: total.getAttribute('title'), aria: total.getAttribute('aria-label'), parentTitle: total.parentElement?.getAttribute('title')} : null,
      tagTitles: [...document.querySelectorAll('[title]')].slice(0,5).map(e=>e.getAttribute('title')),
      h1Font: getComputedStyle(document.querySelector('h1')).fontFamily
    };
  })()`)
});
console.log(JSON.stringify(r.actionResults, null, 2));
