const fs = require('fs');
const path = require('path');

const OUT = '/workspace/acceptance/round-2';
const SHOT = path.join(OUT, 'screenshots');

function getWsUrl() {
  return new Promise((resolve, reject) => {
    const http = require('http');
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
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); }
      }, 60000);
    });
  }
  on(fn) { this.listeners.push(fn); }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const cdp = new CDP(ws);

  const logs = [];
  const netBad = [];
  const netAll = [];

  cdp.on((msg) => {
    if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push({ kind: 'console', type: msg.params.type, text: (msg.params.args || []).map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(' ') });
    } else if (msg.method === 'Log.entryAdded') {
      logs.push({ kind: 'log', level: msg.params.entry.level, text: msg.params.entry.text, url: msg.params.entry.url });
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push({ kind: 'exception', type: 'error', text: JSON.stringify(msg.params.exceptionDetails).slice(0, 1000) });
    } else if (msg.method === 'Network.responseReceived') {
      const r = msg.params.response;
      netAll.push({ url: r.url, status: r.status, mime: r.mimeType });
      if (r.status >= 400) netBad.push({ url: r.url, status: r.status });
    }
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  const t0 = Date.now();
  await cdp.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/' });
  await sleep(3000);
  const loadMs = Date.now() - t0;

  const diag = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const de = document.documentElement;
      const cards = Array.from(document.querySelectorAll('a')).length;
      return {
        title: document.title,
        innerW: window.innerWidth,
        innerH: window.innerHeight,
        scrollW: de.scrollWidth,
        scrollH: de.scrollHeight,
        overflowX: de.scrollWidth > window.innerWidth,
        bodyText: document.body.innerText.slice(0, 1500),
        h1: (document.querySelector('h1')||{}).innerText || null,
        h2: Array.from(document.querySelectorAll('h2')).map(e=>e.innerText).slice(0,10),
        links: Array.from(document.querySelectorAll('a')).slice(0,40).map(a=>({t:a.innerText.trim().slice(0,60), href:a.getAttribute('href')})),
        imgCount: document.querySelectorAll('img').length,
        brokenImgs: Array.from(document.querySelectorAll('img')).filter(i=>i.complete && i.naturalWidth===0).map(i=>i.src),
      };
    })()`,
    returnByValue: true
  });

  fs.writeFileSync(path.join(OUT, 'diag-1440.json'), JSON.stringify(diag.result.value, null, 2));
  fs.writeFileSync(path.join(OUT, 'load-1440.json'), JSON.stringify({ loadMs }, null, 2));
  fs.writeFileSync(path.join(OUT, 'logs-1440.json'), JSON.stringify({ logs, netBad, netAllCount: netAll.length }, null, 2));

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SHOT, '1440-firstscreen.png'), Buffer.from(shot.data, 'base64'));

  ws.close();
  console.log('DONE 1440', JSON.stringify({ loadMs, overflowX: diag.result.value.overflowX, scrollW: diag.result.value.scrollW, innerW: diag.result.value.innerW, cards: diag.result.value.links.length, logs: logs.length, netBad: netBad.length }, null, 2));
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
