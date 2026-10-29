import { Session, newTarget, closeTarget, OUT } from './cdp.mjs';
import fs from 'node:fs';

async function cold(w,h,m,tag) {
  const t = await newTarget('about:blank');
  const s = new Session(t.webSocketDebuggerUrl);
  await s.connect();
  await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Network.enable');
  await s.send('Network.setCacheDisabled', { cacheDisabled: true });
  await s.send('Network.clearBrowserCache');
  await s.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: m });
  await s.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__lcp = 0; window.__cls = 0;
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = Math.round(e.startTime); }).observe({type:'largest-contentful-paint', buffered:true});
    new PerformanceObserver(l => { for (const e of l.getEntries()) if(!e.hadRecentInput) window.__cls += e.value; }).observe({type:'layout-shift', buffered:true});
  `});
  const t0 = Date.now();
  await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/' });
  for (const ms of [1000, 2000, 3000]) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    const shot = await s.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${OUT}/cold-${tag}-${ms}ms.png`, Buffer.from(shot.data, 'base64'));
  }
  const m2 = await s.evaluate(`(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map(p=>[p.name, Math.round(p.startTime)]));
    const cards = [...document.querySelectorAll('a')].filter(a=>/^\\/[^/]+\\/[^/]+$/.test(a.getAttribute('href')||''));
    const firstCardVisible = cards[0] ? cards[0].getBoundingClientRect().top < window.innerHeight : false;
    const visibleCards = cards.filter(c=>{const r=c.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0}).length;
    return {ttfb: Math.round(nav.responseStart), fcp: paints['first-contentful-paint'], lcp: window.__lcp, cls: +window.__cls.toFixed(4), load: Math.round(nav.loadEventEnd), cardCount: cards.length, firstCardVisible, visibleCards, h1: document.querySelector('h1')?.innerText};
  })()`);
  console.log(tag, JSON.stringify(m2));
  await s.close(); await closeTarget(t.id);
}
await cold(1440, 900, false, '1440');
await cold(375, 812, true, '375');
