import { Session, newTarget, closeTarget } from './cdp.mjs';
for (const [w,h,m] of [[1440,900,false],[375,812,true]]) {
  const t = await newTarget('about:blank');
  const s = new Session(t.webSocketDebuggerUrl);
  await s.connect();
  await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Network.enable'); await s.send('Log.enable');
  await s.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: m });
  await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/' });
  await new Promise(r => setTimeout(r, 3500));
  const res = await s.evaluate(`(async () => {
    const card = [...document.querySelectorAll('a')].find(a=>a.getAttribute('href')==='/openclaw/openclaw');
    card.scrollIntoView({block:'center'});
    card.click();
    await new Promise(r=>setTimeout(r,2500));
    return {url: location.href, title: document.title, hasCard: !!document.querySelector('img[src*="logo-icon"]')};
  })()`);
  console.log(w, JSON.stringify(res), 'ERR', JSON.stringify(s.errors.map(e=>({t:e.type,text:(e.text||'').slice(0,60)}))));
  // back button
  const back = await s.evaluate(`(async () => {
    const b = [...document.querySelectorAll('a')].find(a=>(a.innerText||'').includes('返回首页'));
    if(!b) return {noBack:true};
    b.click(); await new Promise(r=>setTimeout(r,2000));
    return {url: location.href, title: document.title};
  })()`);
  console.log('  back:', JSON.stringify(back));
  await s.close(); await closeTarget(t.id);
}
