const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const a = {
    url: '', width: 1440, height: 900, mobile: false, dpr: 1, wait: 3500,
    shot: null, out: null, evals: [], close: true, layout: true, clearCache: true,
    keepAlive: 0, dumpText: false, timeout: 60000
  };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--url') a.url = argv[++i];
    else if (t === '--width') a.width = parseInt(argv[++i], 10);
    else if (t === '--height') a.height = parseInt(argv[++i], 10);
    else if (t === '--mobile') a.mobile = argv[++i] !== '0';
    else if (t === '--dpr') a.dpr = parseFloat(argv[++i]);
    else if (t === '--wait') a.wait = parseInt(argv[++i], 10);
    else if (t === '--shot') a.shot = argv[++i];
    else if (t === '--out') a.out = argv[++i];
    else if (t === '--eval') a.evals.push(argv[++i]);
    else if (t === '--keep') a.close = false;
    else if (t === '--nolayout') a.layout = false;
    else if (t === '--nocache') a.clearCache = false;
    else if (t === '--dumptext') a.dumpText = true;
    else if (t === '--timeout') a.timeout = parseInt(argv[++i], 10);
    else if (t === '--keepalive') a.keepAlive = parseInt(argv[++i], 10);
  }
  return a;
}

const LAYOUT_JS = `(() => {
  const de = document.documentElement;
  const vw = window.innerWidth;
  const res = {
    viewport: { innerWidth: vw, innerHeight: window.innerHeight },
    docScrollWidth: de.scrollWidth,
    docClientWidth: de.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    horizontalOverflow: de.scrollWidth > de.clientWidth + 1,
    overflowPx: de.scrollWidth - de.clientWidth
  };
  const overflowing = [];
  const truncated = [];
  const els = document.querySelectorAll('body *');
  els.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
      overflowing.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 80), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) });
    }
    if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 2) {
      truncated.push({ tag: el.tagName, cls: (el.className || '').toString().slice(0, 80), text: (el.textContent || '').trim().slice(0, 50), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth });
    }
  });
  res.overflowingCount = overflowing.length;
  res.overflowing = overflowing.slice(0, 30);
  res.truncatedCount = truncated.length;
  res.truncated = truncated.slice(0, 30);
  return res;
})()`;

class CDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    this.events = [];
    this.sessionId = null;
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.addEventListener('open', () => resolve());
      this.ws.addEventListener('error', (e) => reject(new Error('ws error')));
      this.ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        } else {
          this.events.push(msg);
          this.listeners.forEach(fn => fn(msg));
        }
      });
    });
  }
  on(fn) { this.listeners.push(fn); }
  send(method, params = {}, useSession = true) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (useSession && this.sessionId) payload.sessionId = this.sessionId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('timeout ' + method));
      }, this.timeout || 60000);
      this.pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
      this.ws.send(JSON.stringify(payload));
    });
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

function httpJson(url) {
  const { execSync } = require('child_process');
  return JSON.parse(execSync(`curl -s ${url}`, { maxBuffer: 1024 * 1024 * 50 }).toString());
}

async function main() {
  const args = parseArgs(process.argv);
  const version = httpJson('http://127.0.0.1:9222/json/version');
  const browser = new CDP(version.webSocketDebuggerUrl);
  browser.timeout = args.timeout;
  await browser.connect();

  const result = {
    url: args.url, width: args.width, height: args.height, mobile: args.mobile,
    startedAt: new Date().toISOString(), title: null, finalUrl: null,
    consoleErrors: [], exceptions: [], netBad: [], logErrors: [],
    layout: null, evalResults: [], bodyText: null, shotPath: null, timings: {}
  };

  if (args.clearCache) {
    try { await browser.send('Network.clearBrowserCache', {}, false); } catch (e) {}
    try { await browser.send('Storage.clearDataForOrigin', { origin: new URL(args.url).origin, storageTypes: 'all' }, false); } catch (e) {}
  }

  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' }, false);
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true }, false);
  browser.sessionId = sessionId;

  const t0 = Date.now();
  await browser.send('Page.enable');
  await browser.send('Runtime.enable');
  await browser.send('Network.enable');
  await browser.send('Log.enable');
  await browser.send('Emulation.setDeviceMetricsOverride', {
    width: args.width, height: args.height, deviceScaleFactor: args.dpr, mobile: args.mobile
  });

  const netBad = result.netBad;
  const consoleErrors = result.consoleErrors;
  const exceptions = result.exceptions;
  const logErrors = result.logErrors;
  const requests = {};

  browser.on((msg) => {
    if (msg.method === 'Network.responseReceived') {
      const r = msg.params.response;
      requests[msg.params.requestId] = r.url;
      if (r.status >= 400) netBad.push({ url: r.url, status: r.status, mimeType: r.mimeType });
    }
    if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'assert')) {
      consoleErrors.push({ type: msg.params.type, text: (msg.params.args || []).map(a => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ') });
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      exceptions.push({ text: d.text, url: d.url, line: d.lineNumber, col: d.columnNumber, desc: d.exception ? (d.exception.description || d.exception.value) : null });
    }
    if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry;
      if (e.level === 'error') logErrors.push({ source: e.source, url: e.url, text: e.text });
    }
  });

  const navT = Date.now();
  let loadFired = false;
  const loadPromise = new Promise((resolve) => {
    const h = (msg) => { if (msg.method === 'Page.loadEventFired') { loadFired = true; resolve(); } };
    browser.on(h);
  });
  await browser.send('Page.navigate', { url: args.url });
  await Promise.race([loadPromise, new Promise(r => setTimeout(r, 20000))]);
  result.timings.loadMs = Date.now() - navT;
  result.timings.loadEventFired = loadFired;

  const waitMs = Math.max(0, args.wait);
  const tWait = Date.now();
  await new Promise(r => setTimeout(r, waitMs));
  result.timings.waitMs = waitMs;
  result.timings.totalMs = Date.now() - navT;

  const evalJson = async (expr, awaitPromise) => {
    const r = await browser.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: !!awaitPromise });
    if (r.exceptionDetails) return { __error: r.exceptionDetails.exception ? (r.exceptionDetails.exception.description || r.exceptionDetails.text) : r.exceptionDetails.text };
    return r.result.value;
  };

  const titleRes = await browser.send('Runtime.evaluate', { expression: 'document.title', returnByValue: true });
  result.title = titleRes.result.value;
  const urlRes = await browser.send('Runtime.evaluate', { expression: 'location.href', returnByValue: true });
  result.finalUrl = urlRes.result.value;

  if (args.layout) {
    result.layout = await evalJson(LAYOUT_JS);
  }
  for (const e of args.evals) {
    result.evalResults.push({ expr: e.slice(0, 200), value: await evalJson(e) });
  }
  if (args.dumpText) {
    result.bodyText = await evalJson('document.body.innerText');
  }

  if (args.shot) {
    const shot = await browser.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const p = path.isAbsolute(args.shot) ? args.shot : path.join('/workspace/acceptance/round-4/screenshots', args.shot);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, Buffer.from(shot.data, 'base64'));
    result.shotPath = p;
  }

  result.finishedAt = new Date().toISOString();
  if (args.close) {
    try { await browser.send('Target.closeTarget', { targetId }, false); } catch (e) {}
  } else {
    result.targetId = targetId;
  }
  browser.close();

  if (args.out) {
    fs.mkdirSync(path.dirname(args.out), { recursive: true });
    fs.writeFileSync(args.out, JSON.stringify(result, null, 2));
  }
  console.log(JSON.stringify({
    title: result.title, finalUrl: result.finalUrl, loadMs: result.timings.loadMs, totalMs: result.timings.totalMs,
    consoleErrors: result.consoleErrors.length, exceptions: result.exceptions.length, logErrors: result.logErrors.length, netBad: result.netBad.length,
    horizontalOverflow: result.layout ? result.layout.horizontalOverflow : null, overflowPx: result.layout ? result.layout.overflowPx : null,
    overflowingCount: result.layout ? result.layout.overflowingCount : null, truncatedCount: result.layout ? result.layout.truncatedCount : null,
    shot: result.shotPath
  }, null, 2));
  if (result.out) { }
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
