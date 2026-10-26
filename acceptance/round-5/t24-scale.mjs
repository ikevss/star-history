import { Session, newTarget, closeTarget } from './cdp.mjs';
for (const [w,h,m] of [[375,812,true],[768,1024,false],[1440,900,false]]) {
  const t = await newTarget('about:blank');
  const s = new Session(t.webSocketDebuggerUrl);
  await s.connect();
  await s.send('Page.enable'); await s.send('Runtime.enable');
  await s.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: m });
  await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/vuejs/core' });
  await new Promise(r => setTimeout(r, 3500));
  const info = await s.evaluate(`(() => {
    const scaled = [...document.querySelectorAll('*')].map(e=>({e, t:getComputedStyle(e).transform})).filter(x=>x.t.startsWith('matrix') && !x.t.includes('-0.'));
    const out = scaled.map(x=>{
      const mm = x.t.match(/matrix\\(([-\\d.]+)/);
      const k = mm?parseFloat(mm[1]):1;
      const r = x.e.getBoundingClientRect();
      return {scale:+k.toFixed(3), renderW:Math.round(r.width), unscaledW:Math.round(r.width/k), x:Math.round(r.x)};
    });
    const desc = [...document.querySelectorAll('div,span,p')].find(e=>(e.innerText||'').includes('Vue.js is a progressive') && e.children.length<3);
    const fs = desc?parseFloat(getComputedStyle(desc).fontSize):null;
    const scaleK = out[0]?.scale || 1;
    return {view: [${w},${h}], scaled: out, descFontPx: fs, descEffectivePx: fs? +(fs*scaleK).toFixed(1) : null, docH: document.documentElement.scrollHeight};
  })()`);
  console.log(JSON.stringify(info));
  await s.close(); await closeTarget(t.id);
}
