import fs from 'node:fs';
import path from 'node:path';

const CDP_HOST = 'http://127.0.0.1:9222';
const OUT = '/workspace/acceptance/round-5/screenshots';
fs.mkdirSync(OUT, { recursive: true });

async function newTarget(url = 'about:blank') {
  const r = await fetch(`${CDP_HOST}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!r.ok) {
    // fallback for older chrome
    const r2 = await fetch(`${CDP_HOST}/json/new?${encodeURIComponent(url)}`);
    return r2.json();
  }
  return r.json();
}

async function closeTarget(id) {
  try { await fetch(`${CDP_HOST}/json/close/${id}`); } catch {}
}

class Session {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.errors = [];
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => {
      this.ws.onopen = res;
      this.ws.onerror = rej;
    });
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
        this._collect(msg);
      }
    };
  }
  _collect(msg) {
    if (msg.method === 'Network.responseReceived') {
      const r = msg.params.response;
      if (r.status >= 400) {
        this.errors.push({ type: 'http', url: r.url, status: r.status, mime: r.mimeType });
      }
    }
    if (msg.method === 'Network.loadingFailed') {
      const p = msg.params;
      if (!p.canceled) this.errors.push({ type: 'netfail', errorText: p.errorText, requestId: p.requestId });
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      this.errors.push({
        type: 'console',
        text: msg.params.args.map(a => a.value ?? a.description ?? a.type).join(' '),
        stack: (msg.params.stackTrace?.callFrames || []).slice(0, 3).map(f => `${f.url}:${f.lineNumber}`).join(' | ')
      });
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      this.errors.push({ type: 'exception', text: d.exception?.description || d.text, url: d.url, line: d.lineNumber });
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      this.errors.push({ type: 'log', text: msg.params.entry.text, url: msg.params.entry.url, source: msg.params.entry.source });
    }
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); }
      }, 30000);
    });
  }
  async evaluate(expression, awaitPromise = true) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
    if (r.exceptionDetails) return { __error: r.exceptionDetails.text + ' ' + (r.exceptionDetails.exception?.description || '') };
    return r.result.value;
  }
  async screenshot(file) {
    const r = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(OUT, file), Buffer.from(r.data, 'base64'));
    return path.join(OUT, file);
  }
  async close() { try { this.ws.close(); } catch {} }
}

export async function run({ url, width = 1440, height = 900, mobile = false, name, wait = 3000, actions, fullPage = false }) {
  const t = await newTarget('about:blank');
  const s = new Session(t.webSocketDebuggerUrl);
  await s.connect();
  await s.send('Page.enable');
  await s.send('Runtime.enable');
  await s.send('Network.enable');
  await s.send('Log.enable');
  await s.send('Network.setCacheDisabled', { cacheDisabled: true });
  await s.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  const nav = await s.send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, wait));
  // wait for load event-ish
  try { await s.send('Page.loadEventFired').catch(() => {}); } catch {}
  const result = { url, width, height, mobile, name, nav };
  if (actions) {
    result.actionResults = await actions(s);
  }
  result.metrics = await s.evaluate(`(() => {
    const de = document.documentElement;
    const b = document.body;
    const vw = window.innerWidth;
    const over = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1.5 || r.left < -1.5) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.overflow === 'hidden') continue;
        over.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,80), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), text: (el.innerText||'').slice(0,50) });
      }
    }
    return {
      title: document.title,
      lang: document.documentElement.lang,
      scrollWidth: de.scrollWidth, clientWidth: de.clientWidth,
      bodyScrollWidth: b.scrollWidth, bodyClientWidth: b.clientWidth,
      hasHScroll: de.scrollWidth > de.clientWidth + 1,
      docHeight: de.scrollHeight,
      textLen: (document.body.innerText||'').length,
      overflowCount: over.length,
      overflowSample: over.slice(0, 12),
      bodyText: (document.body.innerText||'').slice(0, 3000)
    };
  })()`);
  result.errors = s.errors;
  result.screenshot = await s.screenshot(name + '.png');
  if (fullPage) {
    // capture full page via clip
    const m = result.metrics;
    try {
      const r2 = await s.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width, height: Math.min(m.docHeight, 6000), scale: 1 } });
      fs.writeFileSync(path.join(OUT, name + '-full.png'), Buffer.from(r2.data, 'base64'));
      result.fullScreenshot = path.join(OUT, name + '-full.png');
    } catch (e) { result.fullScreenshotError = String(e); }
  }
  await s.close();
  await closeTarget(t.id);
  return result;
}

export { Session, newTarget, closeTarget, OUT };
