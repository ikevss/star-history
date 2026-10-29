import { Session, newTarget, closeTarget, OUT } from './cdp.mjs';
import fs from 'node:fs';

async function setup(width, height, mobile) {
  const t = await newTarget('about:blank');
  const s = new Session(t.webSocketDebuggerUrl);
  await s.connect();
  await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Network.enable'); await s.send('Log.enable');
  await s.send('Network.setCacheDisabled', { cacheDisabled: true });
  await s.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  return { t, s };
}

const queries = ['vuejs/core', 'notexist/notexist', 'star-history/star-history', '', '!!@@##'];
const out = [];

const { t, s } = await setup(1440, 900, false);
await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/vuejs/core' });
await new Promise(r => setTimeout(r, 4000));

for (const q of queries) {
  s.errors.length = 0;
  const before = await s.evaluate(`(() => ({url: location.href, ph: document.querySelector('input')?.placeholder}))()`);
  const res = await s.evaluate(`(async () => {
    const inp = document.querySelector('input');
    inp.scrollIntoView({block:'center'});
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    setter.call(inp, ${JSON.stringify(q)});
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,1200));
    const modal = [...document.querySelectorAll('[role=dialog],[aria-modal=true],.modal')].filter(e=>e.getBoundingClientRect().width>0);
    return {
      url: location.href,
      bodyHead: document.body.innerText.replace(/\\n/g,' | ').slice(0,240),
      value: document.querySelector('input')?.value,
      modalCount: modal.length,
      modalText: modal.map(m=>m.innerText.slice(0,120)),
      toast: [...document.querySelectorAll('[class*=toast],[role=status],[role=alert]')].map(e=>e.innerText.slice(0,120)).filter(Boolean),
      visibleErrors: [...document.querySelectorAll('[class*=error],[class*=red]')].map(e=>e.innerText.slice(0,100)).filter(Boolean).slice(0,5)
    };
  })()`);
  await new Promise(r => setTimeout(r, 600));
  const shot = await s.screenshot(`search-${queries.indexOf(q)}-${(q||'empty').replace(/[^a-z0-9]/gi,'_')}.png`);
  out.push({ q, before, res, errors: s.errors.slice(), shot });
  console.log('Q=' + JSON.stringify(q), '->', res.url);
  console.log('  body:', res.bodyHead);
  console.log('  modal:', res.modalCount, JSON.stringify(res.modalText), 'toast:', JSON.stringify(res.toast), 'value:', res.value);
  console.log('  errors:', JSON.stringify(s.errors.map(e=>({t:e.type, s:e.status, text:(e.text||e.url||'').slice(0,80)}))));
  await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/vuejs/core' });
  await new Promise(r => setTimeout(r, 2500));
}
await s.close(); await closeTarget(t.id);
fs.writeFileSync('/workspace/acceptance/round-5/raw-search-detail.json', JSON.stringify(out, null, 2));
