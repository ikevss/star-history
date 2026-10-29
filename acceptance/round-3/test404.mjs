import { newPage, closePage, navigate, evalJs, screenshot } from './cdp.mjs';

const c = await newPage({ width: 1440, height: 900, mobile: false });
await navigate(c, 'https://star-history-3wn.pages.dev/notexist/notexist', 3500);
await screenshot(c, '/workspace/acceptance/round-3/screenshots/direct-404.png');
const info = await evalJs(c, `(()=>{
  const t = document.body.innerText;
  return {
    url: location.href, title: document.title,
    h1: document.querySelector('h1')?.innerText?.trim()||null,
    hasBrand: /Starboard/.test(t),
    hasBackHome: /返回首页|Back to home|回到首页|首页/.test(t),
    backHomeLinks: [...document.querySelectorAll('a')].map(a=>({text:a.innerText.trim().slice(0,30),href:a.getAttribute('href')})).filter(a=>/home|首页|\\/$/.test(a.href||'')||/首页|home/i.test(a.text)),
    hasToken: /token|令牌|登录|注册|sign in|log in/i.test(t),
    bodyText: t.slice(0,800),
    bodyLen: t.length,
  };
})()`);
console.log(JSON.stringify(info, null, 2));
console.log('ERRORS', JSON.stringify(c._rec.consoleErrors), 'PAGEERR', JSON.stringify(c._rec.pageErrors), 'LOGERR', JSON.stringify(c._rec.logErrors));
console.log('BAD', JSON.stringify(c._rec.badResponses));
console.log('RESPONSES', JSON.stringify(c._rec.allResponses.slice(0,10)));
await closePage(c);
