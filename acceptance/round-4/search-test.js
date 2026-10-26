const fs = require('fs');
const { execSync } = require('child_process');

const SCENARIOS = [
  { name: 'valid-vuejs-core', input: 'vuejs/core' },
  { name: 'notexist-slash-notexist', input: 'notexist/notexist' },
  { name: 'star-history-slash-star-history', input: 'star-history/star-history' },
  { name: 'empty-string', input: '' },
  { name: 'garbage-chars', input: '!!@@##' }
];
const WIDTH = parseInt(process.argv[2] || '1440', 10);
const HEIGHT = parseInt(process.argv[3] || '900', 10);
const TAG = process.argv[4] || 'desktop';

const HOME = 'https://star-history-3wn.pages.dev/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

class CDP {
  constructor(u) { this.u = u; this.id = 0; this.p = new Map(); this.ls = []; this.sid = null; this.to = 90000; }
  connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.u);
      this.ws.addEventListener('open', res);
      this.ws.addEventListener('error', () => rej(new Error('ws')));
      this.ws.addEventListener('message', (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id && this.p.has(m.id)) { const { res, rej } = this.p.get(m.id); this.p.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
        else this.ls.forEach(f => f(m));
      });
    });
  }
  on(f) { this.ls.push(f); }
  send(method, params = {}, sess = true) {
    const id = ++this.id; const pl = { id, method, params };
    if (sess && this.sid) pl.sessionId = this.sid;
    return new Promise((res, rej) => {
      const t = setTimeout(() => { this.p.delete(id); rej(new Error('timeout ' + method)); }, this.to);
      this.p.set(id, { res: v => { clearTimeout(t); res(v); }, rej: e => { clearTimeout(t); rej(e); } });
      this.ws.send(JSON.stringify(pl));
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

async function main() {
  const ver = JSON.parse(execSync('curl -s http://127.0.0.1:9222/json/version').toString());
  const b = new CDP(ver.webSocketDebuggerUrl);
  await b.connect();
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' }, false);
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true }, false);
  b.sid = sessionId;
  await b.send('Page.enable'); await b.send('Runtime.enable'); await b.send('Network.enable'); await b.send('Log.enable');
  await b.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 800 });
  const consoleErrors = [], exceptions = [], netBad = [];
  b.on(m => {
    if (m.method === 'Network.responseReceived') { const r = m.params.response; if (r.status >= 400) netBad.push({ url: r.url, status: r.status }); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push((m.params.args || []).map(a => a.value !== undefined ? String(a.value) : a.description).join(' ').slice(0, 200));
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push({ text: d.text, url: d.url, desc: d.exception ? String(d.exception.description).slice(0, 200) : null }); }
  });
  const ev = async (expr) => {
    const r = await b.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { __error: r.exceptionDetails.exception ? String(r.exceptionDetails.exception.description).slice(0, 300) : r.exceptionDetails.text };
    return r.result.value;
  };
  const SET = `(t)=>{const i=document.querySelector('input');if(!i)return 'no-input';const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,t);i.dispatchEvent(new Event('input',{bubbles:true}));return i.value;}`;

  const results = [];
  for (const sc of SCENARIOS) {
    consoleErrors.length = 0; exceptions.length = 0; netBad.length = 0;
    await b.send('Page.navigate', { url: HOME });
    await sleep(2600);
    const typed = await ev(`(${SET})(${JSON.stringify(sc.input)})`);
    const hasInput = await ev(`!!document.querySelector('input')`);
    const goBtnExists = await ev(`(()=>{const btn=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.trim()==='Go');if(btn){btn.click();return true;}return false;})()`);
    if (!goBtnExists) {
      await ev(`document.querySelector('input').focus(); true`);
      await b.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
      await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    }
    let url = HOME, title = '';
    for (let k = 0; k < 24; k++) {
      await sleep(500);
      url = await ev('location.href'); title = await ev('document.title');
      if (url !== HOME) break;
    }
    await sleep(2200);
    const dialog = await ev(`(()=>{const d=document.querySelector('[role=dialog],[class*=modal],[class*=Modal],[class*=dialog],[class*=Dialog]');return d?d.innerText.replace(/\\s+/g,' ').slice(0,300):null;})()`);
    const tokenHit = await ev(`(()=>{const t=document.body.innerText;return {hasToken:/token|令牌|API key|API 密钥|personal access/i.test(t), snippet:(t.match(/.{0,60}(token|令牌|API key|API 密钥|personal access).{0,60}/i)||[null])[0]};})()`);
    const body = await ev('document.body.innerText.replace(/\\s+/g," ").slice(0,600)');
    const state = await ev(`({placeholder:document.querySelector('input')?document.querySelector('input').placeholder:null, inputVal:document.querySelector('input')?document.querySelector('input').value:null, goBtn:!!Array.from(document.querySelectorAll('button')).find(x=>x.innerText.trim()==='Go')})`);
    results.push({
      scenario: sc.name, input: sc.input, hasInput, typed, url, title,
      navigatedAwayFromHome: url !== HOME,
      dialog, tokenDetected: tokenHit.hasToken, tokenSnippet: tokenHit.snippet,
      consoleErrors: consoleErrors.slice(), exceptions: exceptions.slice(), netBad: netBad.slice(),
      errorCount: consoleErrors.length, exceptionCount: exceptions.length, badCount: netBad.length,
      state, bodyHead: body
    });
    console.log(`[${sc.name}] navigated=${url !== HOME} url=${url} token=${tokenHit.hasToken} err=${consoleErrors.length} bad=${netBad.length}`);
    console.log(`   title=${title}`);
    console.log(`   body=${String(body).slice(0, 180)}`);
  }
  fs.writeFileSync(`/workspace/acceptance/round-4/search-${TAG}.json`, JSON.stringify({ width: WIDTH, results }, null, 2));
  try { await b.send('Target.closeTarget', { targetId }, false); } catch (e) {}
  b.close();
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
