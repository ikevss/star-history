import { Session, newTarget, closeTarget, OUT } from './cdp.mjs';
import fs from 'node:fs';
const t = await newTarget('about:blank');
const s = new Session(t.webSocketDebuggerUrl);
await s.connect();
await s.send('Page.enable'); await s.send('Runtime.enable');
await s.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/vuejs/core' });
await new Promise(r => setTimeout(r, 4000));
const info = await s.evaluate(`(() => {
  const imgs = [...document.querySelectorAll('img')];
  const radar = imgs.find(i=>i.src.startsWith('data:image/svg'));
  const svg = radar ? decodeURIComponent(radar.src.split(',')[1]) : null;
  let decoded = null;
  try { decoded = atob(radar.src.split(',')[1]); } catch(e) {}
  const texts = decoded ? (decoded.match(/<text[^>]*>[^<]*<\\/text>/g)||[]).map(t=>t.replace(/<[^>]+>/g,'')) : [];
  const stats = [...document.querySelectorAll('span')].filter(e=>/^\\d+(\\.\\d+)?k?$/.test((e.innerText||'').trim())).map(e=>{
    const p = e.closest('div');
    return {val:e.innerText.trim(), parentHTML:(p?.outerHTML||'').slice(0,300)};
  }).slice(0,4);
  return { radarAlt: radar?.alt, radarTitle: radar?.title, svgTexts: texts, stats, bodyHasPercentile: /百分位|分位|排名|P\\d{2}/.test(document.body.innerText) };
})()`);
console.log(JSON.stringify(info, null, 2).slice(0, 3000));
// zoomed screenshot of the stats row + radar
const clip1 = { x: 150, y: 380, width: 700, height: 90, scale: 2 };
const r1 = await s.send('Page.captureScreenshot', { format: 'png', clip: clip1 });
fs.writeFileSync(OUT + '/zoom-stats.png', Buffer.from(r1.data, 'base64'));
const clip2 = { x: 520, y: 170, width: 400, height: 360, scale: 2 };
const r2 = await s.send('Page.captureScreenshot', { format: 'png', clip: clip2 });
fs.writeFileSync(OUT + '/zoom-radar.png', Buffer.from(r2.data, 'base64'));
const clip3 = { x: 300, y: 100, width: 760, height: 120, scale: 2 };
const r3 = await s.send('Page.captureScreenshot', { format: 'png', clip: clip3 });
fs.writeFileSync(OUT + '/zoom-badge-search.png', Buffer.from(r3.data, 'base64'));
await s.close(); await closeTarget(t.id);
