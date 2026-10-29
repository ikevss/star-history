import { Session, newTarget, closeTarget } from './cdp.mjs';
import fs from 'node:fs';

async function evaluateSafe(s, expr, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try { return await s.evaluate(expr); }
    catch (e) { await new Promise(r => setTimeout(r, 800)); }
  }
  return { __error: 'eval failed' };
}

async function testSearch(startUrl, q, tag, width = 1440, height = 900, mobile = false) {
  const t = await newTarget('about:blank');
  const s = new Session(t.webSocketDebuggerUrl);
  await s.connect();
  await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Network.enable'); await s.send('Log.enable');
  await s.send('Network.setCacheDisabled', { cacheDisabled: true });
  await s.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await s.send('Page.navigate', { url: startUrl });
  await new Promise(r => setTimeout(r, 4000));
  s.errors.length = 0;

  const typed = await evaluateSafe(s, `(async () => {
    const inp = document.querySelector('input[aria-label="搜索开源项目"]') || document.querySelector('input');
    if (!inp) return {noInput: true};
    inp.scrollIntoView({block:'center'});
    inp.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    setter.call(inp, ${JSON.stringify(q)});
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    inp.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,400));
    return {value: inp.value, url: location.href, ph: inp.placeholder};
  })()`);

  await new Promise(r => setTimeout(r, 2500));
  const after = await evaluateSafe(s, `(() => {
    const inp = document.querySelector('input');
    const modal = [...document.querySelectorAll('[role=dialog],[aria-modal=true]')].filter(e=>e.getBoundingClientRect().width>0);
    return {
      url: location.href,
      title: document.title,
      value: inp?.value,
      dropdown: [...document.querySelectorAll('[class*=absolute]')].map(e=>(e.innerText||'').replace(/\\n/g,' | ').trim()).filter(t=>t && t.length<200).slice(0,4),
      modalText: modal.map(m=>m.innerText.slice(0,150)),
      bodyHead: document.body.innerText.replace(/\\n/g,' | ').slice(0,300),
      hasEmptyState: /没找到|无结果|未找到|没有找到|not found|No results/i.test(document.body.innerText)
    };
  })()`);
  const shot = await s.screenshot(`s-${tag}.png`);
  const errs = s.errors.map(e => ({ type: e.type, status: e.status, url: e.url, text: (e.text || '').slice(0, 120) }));
  await s.close(); await closeTarget(t.id);
  return { startUrl, q, tag, typed, after, errors: errs, shot };
}

const cases = [
  ['https://star-history-3wn.pages.dev/', 'vuejs/core', 'home-vuejs-core'],
  ['https://star-history-3wn.pages.dev/', 'notexist/notexist', 'home-notexist'],
  ['https://star-history-3wn.pages.dev/', 'star-history/star-history', 'home-starhistory'],
  ['https://star-history-3wn.pages.dev/', '', 'home-empty'],
  ['https://star-history-3wn.pages.dev/', '!!@@##', 'home-junk'],
  ['https://star-history-3wn.pages.dev/openai/codex', 'vuejs/core', 'detail-vuejs-core'],
];
const out = [];
for (const [u, q, tag] of cases) {
  const r = await testSearch(u, q, tag);
  out.push(r);
  console.log('###', tag, 'Q=' + JSON.stringify(q));
  console.log('  typed:', JSON.stringify(r.typed));
  console.log('  after url:', r.after?.url, '| title:', r.after?.title);
  console.log('  dropdown:', JSON.stringify(r.after?.dropdown));
  console.log('  modal:', JSON.stringify(r.after?.modalText), 'emptyState:', r.after?.hasEmptyState);
  console.log('  bodyHead:', (r.after?.bodyHead||'').slice(0,200));
  console.log('  errors:', JSON.stringify(r.errors));
}
fs.writeFileSync('/workspace/acceptance/round-5/raw-search.json', JSON.stringify(out, null, 2));
