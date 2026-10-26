import { newPage, closePage, navigate, screenshot, evalJs, sleep } from './cdp.mjs';

const c = await newPage({ width: 1440, height: 900, mobile: false });
await navigate(c, 'https://star-history-3wn.pages.dev/', 4000);
await screenshot(c, '/workspace/acceptance/round-3/screenshots/explore-home-1440.png');

const info = await evalJs(c, `(()=>{
  const txt = (el)=>el?el.innerText.trim():null;
  const out = {};
  out.title = document.title;
  out.url = location.href;
  out.h1 = [...document.querySelectorAll('h1')].map(e=>e.innerText.trim());
  out.h2 = [...document.querySelectorAll('h2')].map(e=>e.innerText.trim()).slice(0,20);
  out.inputs = [...document.querySelectorAll('input,textarea')].map(e=>({tag:e.tagName,type:e.type,placeholder:e.placeholder,name:e.name,aria:e.getAttribute('aria-label')}));
  out.buttons = [...document.querySelectorAll('button')].map(e=>({text:e.innerText.trim().slice(0,40),aria:e.getAttribute('aria-label'),title:e.title})).slice(0,40);
  out.links = [...document.querySelectorAll('a')].map(e=>({text:e.innerText.trim().slice(0,40),href:e.getAttribute('href')})).slice(0,60);
  out.bodyText = document.body.innerText.slice(0,3000);
  out.scrollWidth = document.documentElement.scrollWidth;
  out.innerWidth = window.innerWidth;
  return out;
})()`);
console.log(JSON.stringify(info, null, 2));
console.log('CONSOLE_ERRORS', JSON.stringify(c._rec.consoleErrors));
console.log('LOG_ERRORS', JSON.stringify(c._rec.logErrors));
console.log('PAGE_ERRORS', JSON.stringify(c._rec.pageErrors));
console.log('BAD_RESPONSES', JSON.stringify(c._rec.badResponses));
await closePage(c);
