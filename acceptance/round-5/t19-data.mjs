import { Session, newTarget, closeTarget } from './cdp.mjs';

const t = await newTarget('about:blank');
const s = new Session(t.webSocketDebuggerUrl);
await s.connect();
await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Network.enable');
await s.send('Network.setCacheDisabled', { cacheDisabled: true });
const reqs = [];
const bodies = [];
const orig = s._collect.bind(s);
s._collect = (msg) => {
  if (msg.method === 'Network.requestWillBeSent') reqs.push({ url: msg.params.request.url, type: msg.params.type });
  if (msg.method === 'Network.responseReceived' && /json/.test(msg.params.response.mimeType)) bodies.push({ url: msg.params.response.url, status: msg.params.response.status });
  orig(msg);
};
await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/openclaw/openclaw' });
await new Promise(r => setTimeout(r, 5000));
console.log('JSON:', JSON.stringify(bodies, null, 2));
console.log('DOC/XHR:', JSON.stringify(reqs.filter(r=>['XHR','Fetch','Document'].includes(r.type)).map(r=>r.type+' '+r.url).slice(0,20), null, 2));

// fetch the data directly
const probe = await s.evaluate(`(async () => {
  const cands = ['/data/projects.json','/api/projects','/data/index.json','/data/repos.json','/data/weekly.json'];
  const out = {};
  for (const c of cands) {
    try { const r = await fetch(c); out[c] = r.status + ' ' + (r.headers.get('content-type')||''); if (r.ok) { const t = await r.text(); out[c+'__head'] = t.slice(0,300); } } catch(e) { out[c] = 'ERR'; }
  }
  return out;
})()`);
console.log('PROBE:', JSON.stringify(probe, null, 2));

const gh = await s.evaluate(`(async () => {
  const out = {};
  for (const r of ['openclaw/openclaw','torvalds/linux','vuejs/core']) {
    try { const res = await fetch('https://api.github.com/repos/'+r); const j = await res.json(); out[r] = {status: res.status, stars: j.stargazers_count, pushed: j.pushed_at, message: j.message}; } catch(e) { out[r] = 'ERR '+e.message; }
  }
  return out;
})()`);
console.log('GITHUB LIVE:', JSON.stringify(gh, null, 2));
await s.close(); await closeTarget(t.id);
