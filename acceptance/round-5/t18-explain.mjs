import { Session, newTarget, closeTarget } from './cdp.mjs';
import fs from 'node:fs';

const t = await newTarget('about:blank');
const s = new Session(t.webSocketDebuggerUrl);
await s.connect();
await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Network.enable'); await s.send('Log.enable');
await s.send('Network.setCacheDisabled', { cacheDisabled: true });
await s.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

// 1) home explanation section
await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/' });
await new Promise(r => setTimeout(r, 4000));
const explain = await s.evaluate(`(() => {
  const secs = [...document.querySelectorAll('section')].map(sec=>(sec.innerText||'').replace(/\\n/g,' | ').slice(0,500));
  const full = document.body.innerText;
  const idx = full.indexOf('意味着');
  return { sections: secs, explanation: idx>=0 ? full.slice(Math.max(0,idx-60), idx+700) : null, footer: (document.querySelector('footer')?.innerText||full.slice(-500)) };
})()`);
console.log('EXPLAIN:', JSON.stringify(explain, null, 2));

// 2) network hosts
await s.send('Page.navigate', { url: 'about:blank' });
const reqs = [];
const orig = s._collect.bind(s);
s._collect = (msg) => { if (msg.method === 'Network.requestWillBeSent') reqs.push(msg.params.request.url); orig(msg); };
await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/' });
await new Promise(r => setTimeout(r, 4000));
const hosts = {};
reqs.forEach(u => { try { const h = new URL(u).host; hosts[h] = (hosts[h]||0)+1; } catch {} });
console.log('HOSTS:', JSON.stringify(hosts, null, 2));
console.log('STARHISTORY REQS:', JSON.stringify(reqs.filter(u=>/star-history/.test(u) && !/pages\\.dev/.test(u)).slice(0,10), null, 2));
console.log('API REQS:', JSON.stringify(reqs.filter(u=>u.includes('/api')).slice(0,10), null, 2));

// 3) openclaw detail weekly numbers
await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/openclaw/openclaw' });
await new Promise(r => setTimeout(r, 4000));
const det = await s.evaluate(`(() => ({title:document.title, text:document.body.innerText.replace(/\\n/g,' | ').slice(0,400)}))()`);
console.log('OPENCLAW DETAIL:', JSON.stringify(det));
await s.close(); await closeTarget(t.id);
