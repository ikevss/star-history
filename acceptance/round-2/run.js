const fs = require('fs');
const path = require('path');

const OUT = '/workspace/acceptance/round-2';
const SHOT = path.join(OUT, 'screenshots');

const http = require('http');
function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const list = JSON.parse(d);
        const page = list.find(t => t.type === 'page');
        resolve(page.webSocketDebuggerUrl);
      });
    }).on('error', reject);
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result);
      } else if (msg.method) { for (const fn of this.handlers) fn(msg); }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); } }, 90000);
    });
  }
  on(fn) { this.handlers.push(fn); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

const RESULTS = { widths: {}, consoleErrors: [], netBad: [], cards: [], hamburger: {}, search: {}, gate: {}, timeline: {} };

function wire(cdp) {
  cdp.on((msg) => {
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      RESULTS.consoleErrors.push({ t: Date.now(), text: (msg.params.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(' ') });
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      RESULTS.consoleErrors.push({ t: Date.now(), kind: 'log', text: msg.params.entry.text, url: msg.params.entry.url });
    } else if (msg.method === 'Runtime.exceptionThrown') {
      RESULTS.consoleErrors.push({ t: Date.now(), kind: 'exception', text: JSON.stringify(msg.params.exceptionDetails).slice(0, 500) });
    } else if (msg.method === 'Network.responseReceived') {
      const r = msg.params.response;
      if (r.status >= 400) RESULTS.netBad.push({ t: Date.now(), url: r.url, status: r.status, type: msg.params.type });
    } else if (msg.method === 'Network.loadingFailed') {
      RESULTS.netBad.push({ t: Date.now(), url: 'FAILED', status: 'netfail', text: msg.params.errorText });
    }
  });
}

async function evalJS(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result.value;
}

async function safeEval(cdp, expression, tries = 8, gap = 700) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await evalJS(cdp, expression); } catch (e) { lastErr = e; await sleep(gap); }
  }
  return JSON.stringify({ __error: String(lastErr && lastErr.message).slice(0, 200) });
}

async function pageInfo(cdp) {
  return JSON.parse(await safeEval(cdp, `JSON.stringify({url: location.href, title: document.title, h1: (document.querySelector('h1')||{}).innerText || null, bodyLen: (document.body ? document.body.innerText.trim().length : -1), bodyText: (document.body ? document.body.innerText.slice(0,300) : '')})`));
}

const LAYOUT = `(() => {
  const de = document.documentElement;
  const vw = window.innerWidth, vh = window.innerHeight;
  const out = { innerW: vw, innerH: vh, scrollW: de.scrollWidth, scrollH: de.scrollHeight,
    overflowX: de.scrollWidth > vw + 1, overflowY: de.scrollHeight > vh + 1,
    outOfView: [], truncated: [], h1: (document.querySelector('h1')||{}).innerText||null };
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (el.children.length === 0 && el.tagName !== 'IMG' && r.right > vw + 1) {
      out.outOfView.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,40), right: Math.round(r.right), text: (el.innerText||'').slice(0,30) });
    }
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && el.children.length === 0) {
      out.truncated.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,40), sw: el.scrollWidth, cw: el.clientWidth, text: (el.innerText||'').slice(0,30) });
    }
  });
  out.outOfView = out.outOfView.slice(0, 25);
  out.truncated = out.truncated.slice(0, 25);
  return out;
})()`;

async function main() {
  const ws = new WebSocket(await getWsUrl());
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const cdp = new CDP(ws);
  wire(cdp);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Log.enable');

  const widths = [{ w: 375, h: 812, mobile: true }, { w: 768, h: 1024, mobile: false }, { w: 1440, h: 900, mobile: false }];
  const HOME = 'https://star-history-3wn.pages.dev/';

  for (const { w, h, mobile } of widths) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
    const t0 = Date.now();
    await cdp.send('Page.navigate', { url: HOME });
    await sleep(3000);
    const layout = await evalJS(cdp, LAYOUT);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SHOT, `home-${w}.png`), Buffer.from(shot.data, 'base64'));
    const cards = await safeEval(cdp, `JSON.stringify(Array.from(document.querySelectorAll('a')).filter(a=>/^\\/[^\\/]+\\/[^\\/]+$/.test(a.getAttribute('href')||'')).map(a=>({href:a.getAttribute('href'),text:a.innerText.replace(/\\n+/g,' | ').slice(0,80)})))`);
    RESULTS.widths[w] = { loadMs: Date.now() - t0, layout, cards: JSON.parse(cards), t: Date.now() };
  }

  // hamburger test at 375
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.navigate', { url: HOME });
  await sleep(2500);
  const hamBefore = JSON.parse(await safeEval(cdp, `JSON.stringify({btns:Array.from(document.querySelectorAll('button')).map(b=>({t:b.innerText.trim().slice(0,30),aria:b.getAttribute('aria-label'),exp:b.getAttribute('aria-expanded'),vis:b.getBoundingClientRect().width>0}))})`));
  await evalJS(cdp, `(() => { const b=Array.from(document.querySelectorAll('button')).find(x=>x.getAttribute('aria-label')||x.getAttribute('aria-controls')); if(b) b.click(); return true; })()`);
  await sleep(900);
  const hamAfter = JSON.parse(await safeEval(cdp, `(() => { const nav=document.querySelector('nav'); const links=Array.from(document.querySelectorAll('nav a')).map(a=>({t:a.innerText.trim().slice(0,40),href:a.getAttribute('href'),vis:a.getBoundingClientRect().width>0})); return JSON.stringify({navDisplay:nav?getComputedStyle(nav).display:null, links}); })()`));
  RESULTS.hamburger.before = hamBefore;
  RESULTS.hamburger.after = hamAfter;
  const shotH = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOT, '375-menu-open.png'), Buffer.from(shotH.data, 'base64'));

  // search test
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: HOME });
  await sleep(2500);
  RESULTS.search.input = JSON.parse(await safeEval(cdp, `JSON.stringify({found:!!document.querySelector('input'), type:(document.querySelector('input')||{}).type, ph:(document.querySelector('input')||{}).placeholder, action:(document.querySelector('input')&&document.querySelector('input').closest('form'))?document.querySelector('input').closest('form').getAttribute('action'):null})`));
  const tS = Date.now();
  await evalJS(cdp, `(() => { const i=document.querySelector('input'); const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(i,'vuejs/core'); i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return true; })()`);
  await sleep(3000);
  const vi = await pageInfo(cdp);
  RESULTS.search.vuejs = { url: vi.url, title: vi.title, h1: vi.h1, ms: Date.now() - tS, modal: await safeEval(cdp, `(() => { const m=Array.from(document.querySelectorAll('[role=dialog],dialog,[class*=modal],[class*=Modal]')).find(e=>e.getBoundingClientRect().width>0); return m? m.innerText.slice(0,200): null; })()`) };
  const shotV = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOT, 'search-vuejs-core.png'), Buffer.from(shotV.data, 'base64'));

  // abnormal search
  await cdp.send('Page.navigate', { url: HOME });
  await sleep(2000);
  await evalJS(cdp, `(() => { const i=document.querySelector('input'); const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(i,'notexist/notexist'); i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return true; })()`);
  await sleep(3000);
  const ni = await pageInfo(cdp);
  RESULTS.search.notexist = { url: ni.url, title: ni.title, bodyText: ni.bodyText, bodyLen: ni.bodyLen, whiteScreen: ni.bodyLen < 50 };
  const shotN = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOT, 'search-notexist.png'), Buffer.from(shotN.data, 'base64'));

  // gate scan
  RESULTS.gate = JSON.parse(await safeEval(cdp, `(() => {
    const txt = (document.body ? document.body.innerText : '');
    const kw = ['注册','登录','token','Token','API Key','apiKey','Sign in','Sign up','Log in','Login','密码','password','授权','连接 GitHub','Connect GitHub'];
    const found = kw.filter(k => txt.includes(k));
    const inputs = Array.from(document.querySelectorAll('input')).map(i=>({type:i.type,ph:i.placeholder,name:i.name,id:i.id}));
    const forms = Array.from(document.querySelectorAll('form')).map(f=>({action:f.getAttribute('action'),method:f.method}));
    return JSON.stringify({found, inputs, forms, hasTokenInput: inputs.some(i=>/token|key|secret|password/i.test((i.type||'')+(i.ph||'')+(i.name||'')+(i.id||'')))});
  })()`));

  // click all cards
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const cardList = RESULTS.widths[1440].cards;
  const errorsBefore = RESULTS.consoleErrors.length;
  const netBefore = RESULTS.netBad.length;
  for (let i = 0; i < cardList.length; i++) {
    await cdp.send('Page.navigate', { url: HOME });
    await sleep(1800);
    const href = cardList[i].href;
    const cardText = cardList[i].text;
    const repoSlug = href.replace(/^\//, '');
    const netMark = RESULTS.netBad.length;
    const res = await evalJS(cdp, `(() => {
      const a = Array.from(document.querySelectorAll('a')).find(x=>x.getAttribute('href')===${JSON.stringify(href)});
      if(!a) return JSON.stringify({clicked:false});
      a.scrollIntoView(); a.click(); return JSON.stringify({clicked:true});
    })()`);
    await sleep(2500);
    const info = await pageInfo(cdp);
    info.hasRepo = (info.bodyText || '').includes(repoSlug.split('/')[1]);
    const net = RESULTS.netBad.slice(netMark);
    RESULTS.cards.push({ i: i + 1, href, cardText, clicked: JSON.parse(res).clicked, page: info, netBad: net });
    console.log('card', i + 1, href, info.url, info.title.slice(0, 50), 'hasRepo=' + info.hasRepo);
  }
  RESULTS.timeline.cardClickErrors = RESULTS.consoleErrors.slice(errorsBefore);
  RESULTS.timeline.cardClickNetBad = RESULTS.netBad.slice(netBefore);

  // first screen comprehension
  await cdp.send('Page.navigate', { url: HOME });
  await sleep(3000);
  const fi = await pageInfo(cdp);
  RESULTS.timeline.first3s = fi.bodyText.slice(0, 500);

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(RESULTS, null, 2));
  ws.close();
  console.log('DONE. cards=' + RESULTS.cards.length + ' consoleErrors=' + RESULTS.consoleErrors.length + ' netBad=' + RESULTS.netBad.length);
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
