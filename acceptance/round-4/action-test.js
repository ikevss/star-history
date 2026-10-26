const fs = require('fs');
const { execSync } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HOME = 'https://star-history-3wn.pages.dev/';
const DETAIL = 'https://star-history-3wn.pages.dev/vuejs/core';

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
  await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: '/workspace/acceptance/round-4/downloads' }, false);
  const consoleErrors = [], netBad = [], downloads = [];
  b.on(m => {
    if (m.method === 'Network.responseReceived') { const r = m.params.response; if (r.status >= 400) netBad.push({ url: r.url, status: r.status }); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') consoleErrors.push((m.params.args || []).map(a => a.value !== undefined ? String(a.value) : a.description).join(' ').slice(0, 150));
    if (m.method === 'Page.downloadWillBegin') downloads.push({ url: m.params.url, suggestedFilename: m.params.suggestedFilename });
  });
  const ev = async (expr) => {
    const r = await b.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { __error: r.exceptionDetails.exception ? String(r.exceptionDetails.exception.description).slice(0, 300) : r.exceptionDetails.text };
    return r.result.value;
  };
  const setSize = async (w, h, mobile) => b.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  const shot = async (name) => {
    const s = await b.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('/workspace/acceptance/round-4/screenshots/' + name, Buffer.from(s.data, 'base64'));
  };

  const out = { menu: {}, detailActions: {}, errors: consoleErrors.slice(), netBad: netBad.slice(), downloads: downloads.slice() };

  await setSize(375, 812, true);
  await b.send('Page.navigate', { url: HOME });
  await sleep(3000);
  out.menu.before = await ev('document.body.innerText.replace(/\\s+/g," ").slice(0,200)');
  out.menu.buttonsBefore = await ev(`JSON.stringify(Array.from(document.querySelectorAll('button,a[role=button]')).map((x,i)=>({i,txt:x.innerText.replace(/\\s+/g,' ').slice(0,30),aria:x.getAttribute('aria-label'),title:x.getAttribute('title'),cls:(x.className||'').toString().slice(0,40),visible:!!(x.offsetWidth||x.offsetHeight)})))`);
  out.menu.clickHamburger = await ev(`(()=>{const bs=Array.from(document.querySelectorAll('button')).filter(x=>!(x.offsetWidth||x.offsetHeight)===false);const hb=bs.find(x=>!x.innerText.trim())||bs[0];if(!hb)return 'none';hb.click();return {txt:hb.innerText.trim().slice(0,20),aria:hb.getAttribute('aria-label'),title:hb.getAttribute('title')};})()`);
  await sleep(900);
  out.menu.afterText = await ev('document.body.innerText.replace(/\\s+/g," ").slice(0,400)');
  out.menu.visibleLinks = await ev(`JSON.stringify(Array.from(document.querySelectorAll('a,button')).filter(x=>(x.offsetWidth||x.offsetHeight)).map(x=>x.innerText.replace(/\\s+/g,' ').trim().slice(0,40)).filter(Boolean))`);
  await shot('menu-375-open.png');
  out.menu.closeByToggle = await ev(`(()=>{const bs=Array.from(document.querySelectorAll('button')).filter(x=>(x.offsetWidth||x.offsetHeight));const hb=bs.find(x=>!x.innerText.trim())||bs[0];if(!hb)return 'none';hb.click();return true;})()`);
  await sleep(800);
  out.menu.afterCloseText = await ev('document.body.innerText.replace(/\\s+/g," ").slice(0,200)');
  await shot('menu-375-closed.png');

  for (const [w, h, tag] of [[1440, 1000, '1440'], [375, 812, '375']]) {
    await setSize(w, h, w < 800);
    await b.send('Page.navigate', { url: DETAIL });
    await sleep(3500);
    const info = await ev(`(()=>{
      const q=s=>document.querySelector(s);
      const back=q('a[href="/"]');
      const btns=Array.from(document.querySelectorAll('button'));
      const dl=btns.find(b=>(b.getAttribute('title')||'').includes('下载'));
      const share=Array.from(document.querySelectorAll('a')).find(a=>/x\\.com\\/intent|twitter\\.com\\/intent/.test(a.href));
      const card=q('[class*=Starboard],[class*=starboard]');
      return {
        back: back?{txt:back.innerText.trim(),href:back.getAttribute('href'),disabled:back.hasAttribute('disabled'),visible:!!(back.offsetWidth||back.offsetHeight)}:null,
        download: dl?{txt:dl.innerText.trim(),title:dl.getAttribute('title'),disabled:dl.disabled,visible:!!(dl.offsetWidth||dl.offsetHeight)}:null,
        share: share?{txt:share.innerText.trim(),href:share.getAttribute('href'),target:share.getAttribute('target'),visible:!!(share.offsetWidth||share.offsetHeight)}:null,
        brandText: card?card.innerText.trim():null,
        buttons: btns.map(b=>({txt:b.innerText.trim().slice(0,20),title:b.getAttribute('title'),disabled:b.disabled})).slice(0,10)
      };})()`);
    out.detailActions[tag] = { info, text: await ev('document.body.innerText.replace(/\\s+/g," ").slice(0,120)') };
    downloads.length = 0;
    if (info.download) {
      await ev(`(()=>{const bs=Array.from(document.querySelectorAll('button'));const dl=bs.find(b=>(b.getAttribute('title')||'').includes('下载'));if(dl)dl.click();return true;})()`);
      await sleep(3000);
    }
    out.detailActions[tag].downloadTriggered = downloads.slice();
    out.detailActions[tag].errorsAfter = consoleErrors.slice();
  }

  fs.writeFileSync('/workspace/acceptance/round-4/actions.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2).slice(0, 4000));
  try { await b.send('Target.closeTarget', { targetId }, false); } catch (e) {}
  b.close();
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
