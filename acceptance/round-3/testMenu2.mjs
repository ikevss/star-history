import { newPage, closePage, navigate, evalJs, sleep, clickAt } from './cdp.mjs';

const c = await newPage({ width: 375, height: 812, mobile: true });
await navigate(c, 'https://star-history-3wn.pages.dev/', 3000);
await clickAt(c, 'button[aria-label="切换菜单"]');
await sleep(1000);

const dump = await evalJs(c, `(()=>{
  const out = [];
  for (const a of document.querySelectorAll('a')){
    const r = a.getBoundingClientRect();
    const st = getComputedStyle(a);
    out.push({text:a.innerText.trim().slice(0,30), href:a.getAttribute('href'), x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height), display:st.display, vis:st.visibility, op:st.opacity});
  }
  const menuHTML = (()=>{const el=[...document.querySelectorAll('*')].find(e=>e.innerText && e.innerText.trim()==='Blog\\n使用说明\\n9,648'); return el?el.outerHTML.slice(0,800):null;})();
  return {links: out, menuHTML};
})()`);
console.log(JSON.stringify(dump, null, 2));

// Try clicking the 使用说明 anchor by coordinates from its rect
const target = dump.links.find(l => l.text === '使用说明');
console.log('TARGET', JSON.stringify(target));
if (target && target.w > 0) {
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: target.x + target.w/2, y: target.y + target.h/2, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: target.x + target.w/2, y: target.y + target.h/2, button: 'left', clickCount: 1 });
  await sleep(2500);
  console.log('AFTER CLICK URL', await evalJs(c, 'location.href'), await evalJs(c, 'document.title'));
}
await closePage(c);
