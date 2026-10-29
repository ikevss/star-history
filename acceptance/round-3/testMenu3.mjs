import { newPage, closePage, navigate, evalJs, sleep } from './cdp.mjs';

async function clickXY(c, x, y) {
  await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

const c = await newPage({ width: 375, height: 812, mobile: true });
const res = [];
for (const [label, x, y] of [['Blog', 187, 88], ['使用说明', 187, 136], ['GitHub 9,648', 50, 184]]) {
  await navigate(c, 'https://star-history-3wn.pages.dev/', 2500);
  await clickXY(c, 319, 28); // hamburger
  await sleep(700);
  await clickXY(c, x, y);
  await sleep(2500);
  const info = await evalJs(c, `(()=>({url:location.href,title:document.title,h1:document.querySelector('h1')?.innerText?.trim()||document.body.innerText.slice(0,60)}))()`);
  res.push({ label, ...info });
  console.log(`MENU ${label} -> ${info.url} | ${info.title} | ${info.h1}`);
}
await closePage(c);
