import { newPage, closePage, navigate, screenshot, evalJs, sleep } from './cdp.mjs';
import fs from 'fs';

const OUT = {};
const widths = [
  { name: '375', width: 375, height: 812, mobile: true },
  { name: '768', width: 768, height: 1024, mobile: false },
  { name: '1440', width: 1440, height: 900, mobile: false },
];

for (const w of widths) {
  const c = await newPage({ width: w.width, height: w.height, mobile: w.mobile, deviceScaleFactor: 1 });
  await navigate(c, 'https://star-history-3wn.pages.dev/', 4000);
  await screenshot(c, `/workspace/acceptance/round-3/screenshots/home-${w.name}.png`);
  await screenshot(c, `/workspace/acceptance/round-3/screenshots/home-${w.name}-full.png`, true);

  const m = await evalJs(c, `(()=>{
    const de = document.documentElement;
    const vw = window.innerWidth;
    const overflowEls = [];
    const all = document.querySelectorAll('*');
    for (const el of all){
      const r = el.getBoundingClientRect();
      if (r.width===0&&r.height===0) continue;
      if (r.right > vw+1 || r.left < -1){
        overflowEls.push({tag:el.tagName, cls:(el.className||'').toString().slice(0,60), left:Math.round(r.left), right:Math.round(r.right), w:Math.round(r.width), text:(el.innerText||'').trim().slice(0,30)});
      }
    }
    // detect text overflow (scrollWidth > clientWidth) on leaf-ish elements
    const textOverflow = [];
    for (const el of all){
      if (el.children.length===0 && el.scrollWidth > el.clientWidth+1 && el.clientWidth>0){
        const st = getComputedStyle(el);
        if (st.overflow!=='visible'){
          textOverflow.push({tag:el.tagName, cls:(el.className||'').toString().slice(0,50), client:el.clientWidth, scroll:el.scrollWidth, text:(el.innerText||'').trim().slice(0,40)});
        }
      }
    }
    return {
      vw, scrollWidth: de.scrollWidth, bodyScrollWidth: document.body.scrollWidth,
      overflowCount: overflowEls.length, overflowEls: overflowEls.slice(0,15),
      textOverflow: textOverflow.slice(0,15),
      h1: [...document.querySelectorAll('h1')].map(e=>e.innerText.trim()),
      headerLinks: [...document.querySelectorAll('header a, nav a')].map(e=>e.innerText.trim()).slice(0,20),
      hasHamburger: !!document.querySelector('[aria-label="切换菜单"], button[aria-label*="菜单"]'),
      inputCount: document.querySelectorAll('input').length,
    };
  })()`);
  OUT[w.name] = {
    metrics: m,
    consoleErrors: c._rec.consoleErrors,
    logErrors: c._rec.logErrors,
    pageErrors: c._rec.pageErrors,
    badResponses: c._rec.badResponses,
  };
  console.log('=== WIDTH ' + w.name + ' ===');
  console.log(JSON.stringify(m, null, 2));
  console.log('errors:', c._rec.consoleErrors.length, 'logErr:', c._rec.logErrors.length, 'pageErr:', c._rec.pageErrors.length, 'bad:', c._rec.badResponses.length);
  if (c._rec.badResponses.length) console.log('BAD:', JSON.stringify(c._rec.badResponses));
  await closePage(c);
}
fs.writeFileSync('/workspace/acceptance/round-3/testA.json', JSON.stringify(OUT, null, 2));
