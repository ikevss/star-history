import { run } from './cdp.mjs';
import fs from 'node:fs';

const repos = ['vuejs/core','openai/codex','torvalds/linux','anthropics/claude-code','sindresorhus/awesome'];
const out = [];
for (const repo of repos) {
  const slug = repo.replace('/', '-');
  for (const [w,h,mob] of [[375,812,true],[768,1024,false]]) {
    const r = await run({
      url: 'https://star-history-3wn.pages.dev/' + repo,
      width: w, height: h, mobile: mob, name: `detail-${w}-${slug}`, wait: 4000, fullPage: true,
      actions: async (s) => await s.evaluate(`(() => {
        const els = [...document.querySelectorAll('*')];
        const vis = els.filter(e => {
          const r = e.getBoundingClientRect();
          const cs = getComputedStyle(e);
          return (e.innerText||'').trim() === 'GLOBAL RANK' && r.width>0 && cs.visibility!=='hidden' && cs.display!=='none' && parseFloat(cs.opacity)>0;
        }).map(e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}});
        const img = [...document.querySelectorAll('img')].map(i=>{const r=i.getBoundingClientRect();return {src:i.src.slice(0,40), w:Math.round(r.width), h:Math.round(r.height), left:Math.round(r.left), right:Math.round(r.right)}});
        return {
          docHeight: document.documentElement.scrollHeight,
          visibleGlobalRank: vis,
          images: img,
          cardRect: (()=>{const c=document.querySelector('main > div, main > section'); if(!c) return null; const r=c.getBoundingClientRect(); return {x:Math.round(r.x),w:Math.round(r.width)}})(),
          text: document.body.innerText.replace(/\\n/g,' | ').slice(0,600),
          overflowEls: [...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return r.width>0 && (r.right>innerWidth+1) && cs.position!=='fixed'}).map(e=>({tag:e.tagName, cls:(e.className||'').toString().slice(0,60), right:Math.round(e.getBoundingClientRect().right), text:(e.innerText||'').slice(0,40)})).slice(0,10)
        };
      })()`)
    });
    out.push({repo, w, ...r});
    console.log(`=== ${repo} @${w} ===`);
    console.log('docH:', r.metrics?.docHeight, 'hscroll:', r.metrics?.hasHScroll, 'scrollW/clientW:', r.metrics?.scrollWidth+'/'+r.metrics?.clientWidth, 'overflowCount:', r.metrics?.overflowCount);
    console.log('visibleGlobalRank:', JSON.stringify(r.actionResults?.visibleGlobalRank));
    console.log('images:', JSON.stringify(r.actionResults?.images));
    console.log('overflowEls:', JSON.stringify(r.actionResults?.overflowEls));
    console.log('errors:', JSON.stringify(r.errors));
  }
}
fs.writeFileSync('/workspace/acceptance/round-5/raw-details-responsive.json', JSON.stringify(out, null, 2));
