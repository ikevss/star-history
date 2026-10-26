import { newPage, closePage, navigate, evalJs, screenshot, sleep, clickAt } from './cdp.mjs';
import fs from 'fs';

const c = await newPage({ width: 375, height: 812, mobile: true });
await navigate(c, 'https://star-history-3wn.pages.dev/', 3500);
await screenshot(c, '/workspace/acceptance/round-3/screenshots/menu-closed-375.png');

const hamInfo = await evalJs(c, `(()=>{
  const btn = document.querySelector('button[aria-label="切换菜单"]');
  if(!btn) return {found:false};
  const st = getComputedStyle(btn);
  const r = btn.getBoundingClientRect();
  return {found:true, display:st.display, visibility:st.visibility, x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height)};
})()`);
console.log('HAMBURGER', JSON.stringify(hamInfo));

await clickAt(c, 'button[aria-label="切换菜单"]');
await sleep(800);
await screenshot(c, '/workspace/acceptance/round-3/screenshots/menu-open-375.png');

const menu = await evalJs(c, `(()=>{
  const btn = document.querySelector('button[aria-label="切换菜单"]');
  const expanded = btn?.getAttribute('aria-expanded');
  const nav = document.querySelector('header nav, nav, [role="menu"]');
  const links = [...document.querySelectorAll('header a, nav a')].map(a=>({text:a.innerText.trim().slice(0,40), href:a.getAttribute('href'), visible: a.getBoundingClientRect().width>0}));
  const menuContainer = [...document.querySelectorAll('div')].find(d=>/Starboard|Blog|使用说明/.test(d.innerText) && d.innerText.length<200 && d.querySelector('a[href="/blog"]'));
  return {expanded, links, menuText: menuContainer?.innerText};
})()`);
console.log('MENU', JSON.stringify(menu, null, 2));

// click each menu link and record destination
const clickResults = [];
const seen = new Set();
for (const l of menu.links) {
  if (!l.href || l.href.startsWith('http') || seen.has(l.href)) continue;
  seen.add(l.href);
  await navigate(c, 'https://star-history-3wn.pages.dev/', 2500);
  await clickAt(c, 'button[aria-label="切换菜单"]');
  await sleep(500);
  await clickAt(c, `header a[href="${l.href}"], nav a[href="${l.href}"]`);
  await sleep(2500);
  const info = await evalJs(c, `(()=>({url:location.href,title:document.title,h1:document.querySelector('h1')?.innerText?.trim()||null}))()`);
  clickResults.push({ link: l.text, href: l.href, ...info });
  console.log(`CLICK ${l.href} -> ${info.url} | ${info.title}`);
}
fs.writeFileSync('/workspace/acceptance/round-3/testMenu.json', JSON.stringify({ hamInfo, menu, clickResults }, null, 2));
await closePage(c);
