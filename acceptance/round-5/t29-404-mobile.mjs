import { run } from './cdp.mjs';
const r = await run({
  url: 'https://star-history-3wn.pages.dev/notexist/notexist', width: 375, height: 812, mobile: true, name: 'notfound-375', wait: 3500,
  actions: async (s) => await s.evaluate(`(() => ({text: document.body.innerText.replace(/\\n/g,' | '), header: !!document.querySelector('header'), logo: !!document.querySelector('img[alt=Starboard]')}))()`)
});
console.log(JSON.stringify(r.actionResults));
console.log('hscroll', r.metrics?.hasHScroll, 'overflow', r.metrics?.overflowCount, JSON.stringify(r.metrics?.overflowSample));
const r2 = await run({
  url: 'https://star-history-3wn.pages.dev/blog', width: 375, height: 812, mobile: true, name: 'blog-375-view', wait: 3500, fullPage: true
});
console.log('blog375 hscroll', r2.metrics?.hasHScroll, 'overflow', r2.metrics?.overflowCount);
