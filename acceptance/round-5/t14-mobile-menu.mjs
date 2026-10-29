import { Session, newTarget, closeTarget } from './cdp.mjs';
import fs from 'node:fs';

const t = await newTarget('about:blank');
const s = new Session(t.webSocketDebuggerUrl);
await s.connect();
await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Network.enable'); await s.send('Log.enable');
await s.send('Network.setCacheDisabled', { cacheDisabled: true });
await s.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/' });
await new Promise(r => setTimeout(r, 4000));

const before = await s.evaluate(`(() => {
  const inp = document.querySelector('input[aria-label="搜索开源项目"]');
  const r = inp.getBoundingClientRect();
  const btn = document.querySelector('button[aria-label="切换菜单"]');
  const br = btn.getBoundingClientRect();
  return { searchRect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width)}, docH: document.documentElement.scrollHeight, menuBtn: {x:Math.round(br.x),y:Math.round(br.y),w:Math.round(br.width),h:Math.round(br.height)}, headerLinks: [...document.querySelectorAll('header a')].map(a=>a.innerText.trim()) };
})()`);
console.log('BEFORE', JSON.stringify(before));

await s.evaluate(`(() => { const b = document.querySelector('button[aria-label="切换菜单"]'); b.click(); return true; })()`);
await new Promise(r => setTimeout(r, 900));
const after = await s.evaluate(`(() => {
  const panel = [...document.querySelectorAll('div,nav,aside')].filter(e=>{const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return r.width>200 && r.height>150 && r.y<400 && cs.position!=='static' && (e.innerText||'').includes('Blog')}).map(e=>({text:(e.innerText||'').replace(/\\n/g,' | ').slice(0,200), rect:e.getBoundingClientRect().toJSON(), cls:(e.className||'').toString().slice(0,80)}));
  return {
    open: document.querySelector('button[aria-label="切换菜单"]')?.getAttribute('aria-expanded'),
    panel,
    bodyText: document.body.innerText.replace(/\\n/g,' | ').slice(0,300),
    allLinksVisible: [...document.querySelectorAll('a')].filter(a=>{const r=a.getBoundingClientRect(); return r.width>0 && r.height>0 && r.y < 500}).map(a=>a.innerText.trim()).filter(Boolean).slice(0,20)
  };
})()`);
console.log('AFTER', JSON.stringify(after, null, 2));
await s.screenshot('mobile-menu-open.png');
// try clicking first menu item
const clickRes = await s.evaluate(`(async () => {
  const links = [...document.querySelectorAll('a')].filter(a=>{const r=a.getBoundingClientRect(); return r.width>0&&r.height>0&&r.y<500&&/Blog|使用说明/.test(a.innerText)});
  if (!links.length) return {none:true};
  links[0].click();
  await new Promise(r=>setTimeout(r,2500));
  return {clicked: links[0].innerText.trim(), url: location.href, title: document.title};
})()`);
console.log('CLICK', JSON.stringify(clickRes));
await s.screenshot('mobile-menu-clicked.png');
console.log('ERRORS', JSON.stringify(s.errors.map(e=>({t:e.type,text:(e.text||e.url||'').slice(0,100)}))));
await s.close(); await closeTarget(t.id);
