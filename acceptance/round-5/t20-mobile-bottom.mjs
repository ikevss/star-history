import { Session, newTarget, closeTarget } from './cdp.mjs';
const t = await newTarget('about:blank');
const s = new Session(t.webSocketDebuggerUrl);
await s.connect();
await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Network.enable');
await s.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/' });
await new Promise(r => setTimeout(r, 4000));
const info = await s.evaluate(`(() => {
  const secs = [...document.querySelectorAll('section')].map(x=>{const r=x.getBoundingClientRect(); return {t:(x.innerText||'').replace(/\\n/g,' | ').slice(0,60), top:Math.round(r.top+scrollY), h:Math.round(r.height)}});
  const ads = [...document.querySelectorAll('img')].map(i=>{const r=i.getBoundingClientRect(); return {src:i.src.split('/').pop().slice(0,40), w:Math.round(r.width), h:Math.round(r.height), top:Math.round(r.top+scrollY)}}).filter(a=>a.w>100);
  return {docH: document.documentElement.scrollHeight, secs, ads, footer: (document.querySelector('footer')?.innerText||'').replace(/\\n/g,' | ')};
})()`);
console.log(JSON.stringify(info, null, 2));
for (const [name, y] of [['mobile-search-area', 4100], ['mobile-ads', 4400], ['mobile-bottom', 5200]]) {
  await s.evaluate(`window.scrollTo(0, ${y})`);
  await new Promise(r => setTimeout(r, 700));
  await s.screenshot(name + '.png');
}
await s.close(); await closeTarget(t.id);
