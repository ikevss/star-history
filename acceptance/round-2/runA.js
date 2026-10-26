const fs = require('fs');
const path = require('path');
const OUT = '/workspace/acceptance/round-2';
const SHOT = path.join(OUT, 'screenshots');
const http = require('http');
function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { const l = JSON.parse(d); resolve(l.find(t => t.type === 'page').webSocketDebuggerUrl); });
    }).on('error', reject);
  });
}
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = [];
    ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const p = this.pending.get(m.id); this.pending.delete(m.id);
        m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
      else if (m.method) { for (const fn of this.handlers) fn(m); } }); }
  send(method, params = {}) { const id = ++this.id;
    return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); } }, 90000); }); }
  on(fn) { this.handlers.push(fn); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = { consoleErrors: [], netBad: [] };
function wire(cdp) {
  cdp.on((m) => {
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') R.consoleErrors.push({ text: (m.params.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(' ') });
    else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') R.consoleErrors.push({ kind: 'log', text: m.params.entry.text, url: m.params.entry.url });
    else if (m.method === 'Runtime.exceptionThrown') R.consoleErrors.push({ kind: 'exception', text: JSON.stringify(m.params.exceptionDetails).slice(0, 400) });
    else if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) R.netBad.push({ url: m.params.response.url, status: m.params.response.status, type: m.params.type });
  });
}
async function ev(cdp, expression) { const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300)); return r.result.value; }
async function safe(cdp, expression, tries = 8) { let e; for (let i = 0; i < tries; i++) { try { return await ev(cdp, expression); } catch (x) { e = x; await sleep(700); } } return JSON.stringify({ __error: String(e).slice(0, 150) }); }
async function main() {
  const ws = new WebSocket(await getWsUrl());
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const cdp = new CDP(ws); wire(cdp);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable'); await cdp.send('Log.enable');
  const HOME = 'https://star-history-3wn.pages.dev/';
  const O = {};
  const widths = [{ w: 375, h: 812, mobile: true }, { w: 768, h: 1024, mobile: false }, { w: 1440, h: 900, mobile: false }];
  for (const { w, h, mobile } of widths) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
    const t0 = Date.now();
    await cdp.send('Page.navigate', { url: HOME });
    await sleep(3000);
    const layout = await ev(cdp, `(() => {
      const de=document.documentElement, vw=innerWidth, vh=innerHeight;
      const out={innerW:vw,innerH:vh,scrollW:de.scrollWidth,scrollH:de.scrollHeight,overflowX:de.scrollWidth>vw+1,outOfView:[],truncated:[],h1:(document.querySelector('h1')||{}).innerText||null, firstScreenText:document.body.innerText.slice(0,400)};
      document.querySelectorAll('body *').forEach(el=>{const r=el.getBoundingClientRect(); if(!r.width||!r.height)return;
        if(el.children.length===0&&el.tagName!=='IMG'&&r.right>vw+1) out.outOfView.push({tag:el.tagName,right:Math.round(r.right),text:(el.innerText||'').slice(0,25)});
        if(el.scrollWidth>el.clientWidth+2&&el.clientWidth>0&&el.children.length===0) out.truncated.push({tag:el.tagName,sw:el.scrollWidth,cw:el.clientWidth,text:(el.innerText||'').slice(0,25)});});
      out.outOfView=out.outOfView.slice(0,20); out.truncated=out.truncated.slice(0,20); return out;})()`);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SHOT, `home-${w}.png`), Buffer.from(shot.data, 'base64'));
    const cards = await safe(cdp, `JSON.stringify(Array.from(document.querySelectorAll('a')).filter(a=>/^\\/[^\\/]+\\/[^\\/]+$/.test(a.getAttribute('href')||'')).map(a=>({href:a.getAttribute('href'),text:a.innerText.replace(/\\n+/g,' | ').slice(0,90)})))`);
    O['w' + w] = { loadMs: Date.now() - t0, layout, cards: JSON.parse(cards) };
  }
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await cdp.send('Page.navigate', { url: HOME }); await sleep(2500);
  O.hamBefore = JSON.parse(await safe(cdp, `JSON.stringify({btns:Array.from(document.querySelectorAll('button')).map(b=>({t:b.innerText.trim().slice(0,25),aria:b.getAttribute('aria-label'),exp:b.getAttribute('aria-expanded'),vis:b.getBoundingClientRect().width>0}))})`));
  await ev(cdp, `(() => { const b=Array.from(document.querySelectorAll('button')).find(x=>x.getAttribute('aria-label')||x.getAttribute('aria-controls')); if(b) b.click(); return true; })()`);
  await sleep(900);
  O.hamAfter = JSON.parse(await safe(cdp, `(() => { const nav=document.querySelector('nav'); const links=Array.from(document.querySelectorAll('nav a')).map(a=>({t:a.innerText.trim().slice(0,40),href:a.getAttribute('href'),vis:a.getBoundingClientRect().width>0})); return JSON.stringify({navDisplay:nav?getComputedStyle(nav).display:null,links});})()`));
  fs.writeFileSync(path.join(SHOT, '375-menu-open.png'), Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.send('Page.navigate', { url: HOME }); await sleep(2500);
  O.searchInput = JSON.parse(await safe(cdp, `JSON.stringify({found:!!document.querySelector('input'),type:(document.querySelector('input')||{}).type,ph:(document.querySelector('input')||{}).placeholder})`));
  const tS = Date.now();
  await ev(cdp, `(() => { const i=document.querySelector('input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,'vuejs/core'); i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return true; })()`);
  await sleep(3500);
  O.searchVuejs = JSON.parse(await safe(cdp, `JSON.stringify({url:location.href,title:document.title,h1:(document.querySelector('h1')||{}).innerText||null,ms:${Date.now() - tS},modal:(()=>{const m=Array.from(document.querySelectorAll('[role=dialog],dialog,[class*=modal],[class*=Modal]')).find(e=>e.getBoundingClientRect().width>0);return m?m.innerText.slice(0,200):null})()})`));
  fs.writeFileSync(path.join(SHOT, 'search-vuejs-core.png'), Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await cdp.send('Page.navigate', { url: HOME }); await sleep(2000);
  await ev(cdp, `(() => { const i=document.querySelector('input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,'notexist/notexist'); i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return true; })()`);
  await sleep(3500);
  O.searchNotexist = JSON.parse(await safe(cdp, `JSON.stringify({url:location.href,title:document.title,bodyLen:(document.body?document.body.innerText.trim().length:-1),bodyText:(document.body?document.body.innerText.slice(0,400):'')})`));
  fs.writeFileSync(path.join(SHOT, 'search-notexist.png'), Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  O.gate = JSON.parse(await safe(cdp, `(() => { const txt=(document.body?document.body.innerText:'');
    const kw=['注册','登录','token','Token','API Key','apiKey','Sign in','Sign up','Log in','Login','密码','password','授权','连接 GitHub','Connect GitHub'];
    const found=kw.filter(k=>txt.includes(k));
    const inputs=Array.from(document.querySelectorAll('input')).map(i=>({type:i.type,ph:i.placeholder,name:i.name,id:i.id}));
    const forms=Array.from(document.querySelectorAll('form')).map(f=>({action:f.getAttribute('action'),method:f.method}));
    return JSON.stringify({found,inputs,forms,hasTokenInput:inputs.some(i=>/token|key|secret|password/i.test((i.type||'')+(i.ph||'')+(i.name||'')+(i.id||'')))});})()`));
  O.consoleErrors = R.consoleErrors; O.netBad = R.netBad;
  fs.writeFileSync(path.join(OUT, 'results-a.json'), JSON.stringify(O, null, 2));
  ws.close();
  console.log('A DONE widths=' + Object.keys(O).filter(k => k.startsWith('w')).length + ' errors=' + R.consoleErrors.length + ' netBad=' + R.netBad.length);
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
