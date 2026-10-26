const CDP_HOST = 'http://127.0.0.1:9222';

function open(ws) {
  return new Promise((res, rej) => {
    ws.addEventListener('open', () => res(), { once: true });
    ws.addEventListener('error', (e) => rej(new Error('ws error')), { once: true });
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        if (p) {
          this.pending.delete(msg.id);
          if (msg.error) p.rej(new Error(JSON.stringify(msg.error)));
          else p.res(msg.result);
        }
      } else if (msg.method) {
        const arr = this.handlers.get(msg.method);
        if (arr) for (const h of arr) h(msg.params);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

export async function newPage({ width = 1440, height = 900, mobile = false, deviceScaleFactor = 1, url = 'about:blank' } = {}) {
  const ver = await fetch(CDP_HOST + '/json/version').then(r => r.json());
  const bws = new WebSocket(ver.webSocketDebuggerUrl);
  await open(bws);
  const b = new CDP(bws);
  const { targetId } = await b.send('Target.createTarget', { url });
  const list = await fetch(CDP_HOST + '/json/list').then(r => r.json());
  const target = list.find(t => t.id === targetId);
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await open(ws);
  const c = new CDP(ws);
  const rec = {
    targetId,
    wsUrl: target.webSocketDebuggerUrl,
    consoleErrors: [],
    logErrors: [],
    badResponses: [],
    allResponses: [],
    pageErrors: [],
  };
  c.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') {
      rec.consoleErrors.push((p.args || []).map(a => a.value ?? a.description ?? a.type).join(' '));
    }
  });
  c.on('Runtime.exceptionThrown', (p) => {
    rec.pageErrors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || 'exception');
  });
  c.on('Log.entryAdded', (p) => {
    if (p.entry && p.entry.level === 'error') rec.logErrors.push(p.entry.text + ' @ ' + (p.entry.url || ''));
  });
  c.on('Network.responseReceived', (p) => {
    const r = p.response;
    rec.allResponses.push({ url: r.url, status: r.status, type: p.type });
    if (r.status >= 400) rec.badResponses.push({ url: r.url, status: r.status, type: p.type });
  });
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Network.enable');
  await c.send('Log.enable');
  if (width) {
    await c.send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor, mobile,
    });
  }
  c._rec = rec;
  c._browser = b;
  c._closeBrowser = () => b.close();
  return c;
}

export async function closePage(c) {
  try { await c._browser.send('Target.closeTarget', { targetId: c._rec.targetId }); } catch (e) {}
  c.close();
  c._closeBrowser();
}

export async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export async function navigate(c, url, waitMs = 3000) {
  const navP = c.send('Page.navigate', { url });
  await navP;
  await sleep(waitMs);
  return c;
}

export async function evalJs(c, expression) {
  const r = await c.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

export async function screenshot(c, path, fullPage = false) {
  const params = { format: 'png' };
  if (fullPage) params.captureBeyondViewport = true;
  const r = await c.send('Page.captureScreenshot', params);
  const fs = await import('fs');
  fs.writeFileSync(path, Buffer.from(r.data, 'base64'));
  return path;
}

export async function clickJs(c, selector) {
  const r = await evalJs(c, `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return 'NOT_FOUND';el.click();return 'CLICKED';})()`);
  return r;
}

export async function clickAt(c, selector) {
  const box = await evalJs(c, `(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};})()`);
  if (!box) return 'NOT_FOUND';
  for (const type of ['mousePressed', 'mouseReleased']) {
    await c.send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
  }
  return 'CLICKED';
}

export async function typeText(c, text) {
  for (const ch of text) {
    await c.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch });
    await c.send('Input.dispatchKeyEvent', { type: 'keyUp', text: ch });
  }
}
