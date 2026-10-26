const fs = require('fs');
const { execSync } = require('child_process');

const HOME = 'https://star-history-3wn.pages.dev/';
const CARDS = fs.readFileSync('/workspace/acceptance/round-4/urls.txt', 'utf8').trim().split('\n').map(s => s.trim());

class CDP {
  constructor(u) { this.u = u; this.id = 0; this.p = new Map(); this.ls = []; this.sid = null; this.to = 90000; }
  connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.u);
      this.ws.addEventListener('open', res);
      this.ws.addEventListener('error', () => rej(new Error('ws')));
      this.ws.addEventListener('message', (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id && this.p.has(m.id)) {
          const { res, rej } = this.p.get(m.id); this.p.delete(m.id);
          m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
        } else { this.ls.forEach(f => f(m)); }
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const ver = JSON.parse(execSync('curl -s http://127.0.0.1:9222/json/version').toString());
  const b = new CDP(ver.webSocketDebuggerUrl);
  await b.connect();
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank' }, false);
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true }, false);
  b.sid = sessionId;
  await b.send('Page.enable'); await b.send('Runtime.enable'); await b.send('Network.enable'); await b.send('Log.enable');
  await b.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  const consoleErrors = [], exceptions = [], netBad = [];
  b.on(m => {
    if (m.method === 'Network.responseReceived') { const r = m.params.response; if (r.status >= 400) netBad.push({ url: r.url, status: r.status }); }
    if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error')) consoleErrors.push((m.params.args || []).map(a => a.value !== undefined ? String(a.value) : a.description).join(' '));
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push({ text: d.text, url: d.url, desc: d.exception ? d.exception.description : null }); }
  });

  const ev = async (expr) => {
    const r = await b.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { __error: r.exceptionDetails.exception ? r.exceptionDetails.description : r.exceptionDetails.text };
    return r.result.value;
  };

  const results = [];
  for (let i = 0; i < CARDS.length; i++) {
    const href = CARDS[i];
    await b.send('Page.navigate', { url: HOME });
    await sleep(2200);
    const card = await ev(`(() => { const a = document.querySelector('a[href="${href}"]'); return a ? a.innerText.replace(/\\s+/g,' ').slice(0,120) : null; })()`);
    const before = consoleErrors.length;
    await ev(`document.querySelector('a[href="${href}"]').click(); 'clicked'`);
    let title = null, path = null, ok = false;
    for (let k = 0; k < 20; k++) {
      await sleep(500);
      path = await ev('location.pathname');
      title = await ev('document.title');
      if (path === href && title) { ok = true; await sleep(1800); break; }
    }
    const bodyHas = await ev(`({ svg: document.querySelectorAll('svg').length, h1: document.querySelector('h1') ? document.querySelector('h1').innerText.slice(0,40) : null, textLen: document.body.innerText.length })`);
    const netNow = netBad.length;
    results.push({
      i: i + 1, href, expected: href.slice(1), cardText: card, title, path, matched: path === href,
      titleStartsWithSlug: typeof title === 'string' && title.startsWith(href.slice(1)),
      svgCount: bodyHas.svg, h1: bodyHas.h1, textLen: bodyHas.textLen,
      newErrors: consoleErrors.slice(before), exceptions: exceptions.length
    });
    process.stdout.write(`#${i + 1} ${href} -> ${title} | match=${path === href} err=${consoleErrors.length - before}\n`);
  }

  const out = { results, totalConsoleErrors: consoleErrors.length, totalExceptions: exceptions.length, totalNetBad: netBad.length, netBad: netBad.slice(0, 40) };
  fs.writeFileSync('/workspace/acceptance/round-4/cards-click.json', JSON.stringify(out, null, 2));
  console.log('\nSUMMARY: errors=' + consoleErrors.length + ' exceptions=' + exceptions.length + ' netBad=' + netBad.length);
  console.log('mismatch:', results.filter(r => !r.matched || !r.titleStartsWithSlug).map(r => r.href + ' | ' + r.title));
  try { await b.send('Target.closeTarget', { targetId }, false); } catch (e) {}
  b.close();
}
main().catch(e => { console.error('FATAL', e.message); process.exit(1); });
