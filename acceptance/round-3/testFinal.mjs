import { newPage, closePage, navigate, evalJs, screenshot, sleep } from './cdp.mjs';
import fs from 'fs';

const out = {};

async function metrics(c) {
  return evalJs(c, `(()=>{
    const de=document.documentElement, vw=window.innerWidth;
    const ov=[]; for(const el of document.querySelectorAll('*')){const r=el.getBoundingClientRect(); if(r.width>0&&(r.right>vw+1||r.left<-1)) ov.push(el.tagName+'.'+(el.className||'').toString().slice(0,40));}
    return {vw, scrollWidth:de.scrollWidth, overflow:ov.slice(0,8), scrollWOverInner: de.scrollWidth>vw};
  })()`);
}

// 1. project page at 768 and 1440
for (const [w,h,m] of [[768,1024,false],[1440,900,false]]) {
  const c = await newPage({ width:w, height:h, mobile:m });
  await navigate(c, 'https://star-history-3wn.pages.dev/vuejs/core', 3000);
  out['project-'+w] = await metrics(c);
  await closePage(c);
}
// 2. 404 page at 375
{
  const c = await newPage({ width:375, height:812, mobile:true });
  await navigate(c, 'https://star-history-3wn.pages.dev/notexist/notexist', 3000);
  out['p404-375'] = await metrics(c);
  await closePage(c);
}
// 3. homepage zero-input counts at 375 + ads labeling + 查看 button
{
  const c = await newPage({ width:375, height:812, mobile:true });
  await navigate(c, 'https://star-history-3wn.pages.dev/', 3000);
  out.home375 = await evalJs(c, `(()=>{
    const cards=[...document.querySelectorAll('a[href^="/"]')].filter(a=>/^\\/[^/]+\\/[^/]+$/.test(a.getAttribute('href')||'')&&!a.getAttribute('href').startsWith('/blog'));
    const vis=cards.filter(a=>{const r=a.getBoundingClientRect();return r.top<window.innerHeight&&r.bottom>0;}).length;
    // ads container
    const adAnchors=[...document.querySelectorAll('a')].filter(a=>/utm_source/.test(a.href||''));
    const adLabels=adAnchors.map(a=>{const box=a.closest('div'); return {href:a.href, text:a.innerText.trim().slice(0,50), parentText:box?box.innerText.trim().slice(0,120):null};});
    const promote=[...document.querySelectorAll('a')].find(a=>/Promote your project/i.test(a.innerText));
    return {totalCards:cards.length, visibleCardsNoScroll:vis, adLabels, promoteText:promote?promote.innerText.trim():null, bodyHasSponsor:/sponsor|广告|推广|Sponsored/i.test(document.body.innerText)};
  })()`);
  await closePage(c);
}
// 4. 404 recovery search box works?
{
  const c = await newPage({ width:1440, height:900, mobile:false });
  await navigate(c, 'https://star-history-3wn.pages.dev/notexist/notexist', 3000);
  await evalJs(c, `(()=>{const i=document.querySelector('input'); i.focus();})()`);
  for (const ch of 'vuejs/core') { await c.send('Input.dispatchKeyEvent',{type:'keyDown',text:ch}); await c.send('Input.dispatchKeyEvent',{type:'keyUp',text:ch}); await sleep(30); }
  await sleep(300);
  const btn = await evalJs(c, `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='Go'); if(!b)return null; b.click(); return 'clicked';})()`);
  await sleep(3000);
  out['p404-search'] = { clicked: btn, ...(await evalJs(c, `(()=>({url:location.href,title:document.title}))()`)) };
  console.log('404 SEARCH:', JSON.stringify(out['p404-search']));
  await closePage(c);
}
// 5. homepage 查看 button
{
  const c = await newPage({ width:1440, height:900, mobile:false });
  await navigate(c, 'https://star-history-3wn.pages.dev/', 3000);
  await evalJs(c, `(()=>{const i=document.querySelector('input'); i.scrollIntoView({block:'center'}); i.focus();})()`);
  await sleep(300);
  for (const ch of 'vuejs/core') { await c.send('Input.dispatchKeyEvent',{type:'keyDown',text:ch}); await c.send('Input.dispatchKeyEvent',{type:'keyUp',text:ch}); await sleep(30); }
  await sleep(200);
  await evalJs(c, `(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.innerText.trim()==='查看'); b&&b.click();})()`);
  await sleep(3000);
  out['home-view-btn'] = await evalJs(c, `(()=>({url:location.href,title:document.title}))()`);
  console.log('HOME VIEW BTN:', JSON.stringify(out['home-view-btn']));
  await closePage(c);
}
console.log(JSON.stringify(out, null, 2));
fs.writeFileSync('/workspace/acceptance/round-3/testFinal.json', JSON.stringify(out, null, 2));
