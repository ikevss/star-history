import { Session, newTarget, closeTarget } from './cdp.mjs';

const t = await newTarget('about:blank');
const s = new Session(t.webSocketDebuggerUrl);
await s.connect();
await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Network.enable'); await s.send('Log.enable');
await s.send('Network.setCacheDisabled', { cacheDisabled: true });
await s.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/' });
await new Promise(r => setTimeout(r, 4000));

async function typeAndObserve(q) {
  const r = await s.evaluate(`(async () => {
    const inp = document.querySelector('input[aria-label="搜索开源项目"]');
    inp.scrollIntoView({block:'center'});
    inp.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    setter.call(inp, ${JSON.stringify(q)});
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,1500));
    const abs = [...document.querySelectorAll('[class*=absolute]')].map(e=>({t:(e.innerText||'').replace(/\\n/g,' | ').trim(), rect:e.getBoundingClientRect().toJSON()})).filter(x=>x.t);
    return {value: inp.value, suggestions: abs.slice(0,5), bodyHint: document.body.innerText.match(/(没找到|无结果|未找到|没有找到|not found|No results|没有匹配)[^\\n]{0,40}/i)?.[0] || null};
  })()`);
  return r;
}
for (const q of ['vue', 'notexist/notexist', 'facebook/react', 'star-history/star-history']) {
  console.log('### ', q, JSON.stringify(await typeAndObserve(q)));
  await new Promise(r=>setTimeout(r,300));
}
// now Enter on notexist
const enterRes = await s.evaluate(`(async () => {
  const inp = document.querySelector('input[aria-label="搜索开源项目"]');
  inp.focus();
  inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,1500));
  return {url: location.href, value: inp.value, bodyHint: document.body.innerText.match(/(没找到|无结果|未找到|没有找到|not found|No results|没有匹配)[^\\n]{0,40}/i)?.[0] || null};
})()`);
console.log('ENTER notexist:', JSON.stringify(enterRes));
await s.screenshot('search-notexist-typed.png');
await s.close(); await closeTarget(t.id);
