import { newPage, closePage, navigate, evalJs, screenshot, sleep } from './cdp.mjs';
import fs from 'fs';

async function doSearch(text, tag) {
  const c = await newPage({ width: 1440, height: 900, mobile: false });
  await navigate(c, 'https://star-history-3wn.pages.dev/', 3000);
  // scroll to input and focus
  await evalJs(c, `(()=>{const i=document.querySelector('input'); i.scrollIntoView({block:'center'}); i.focus();})()`);
  await sleep(300);
  if (text.length) {
    for (const ch of text) {
      await c.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch });
      await c.send('Input.dispatchKeyEvent', { type: 'keyUp', text: ch });
      await sleep(40);
    }
  }
  const typedVal = await evalJs(c, `document.querySelector('input').value`);
  await c.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await c.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(3500);
  const info = await evalJs(c, `(()=>{
    const t = document.body.innerText;
    const modal = document.querySelector('[role="dialog"], dialog, .modal, [class*="modal"]');
    return {
      url: location.href, title: document.title,
      h1: document.querySelector('h1')?.innerText?.trim()||null,
      typed: document.querySelector('input')?.value ?? null,
      hasTokenWord: /token|令牌|API[_ ]?key|密钥/i.test(t),
      hasLoginWord: /登录|登陆|注册|sign[_ ]?in|log[_ ]?in|connect github|连接 github/i.test(t),
      modalText: modal ? modal.innerText.trim().slice(0,200) : null,
      inputError: document.querySelector('input')?.getAttribute('aria-invalid'),
      alertText: [...document.querySelectorAll('[role="alert"], .error, [class*="error"]')].map(e=>e.innerText.trim()).filter(Boolean).slice(0,3),
      bodySnippet: t.slice(0, 400),
    };
  })()`);
  await screenshot(c, `/workspace/acceptance/round-3/screenshots/search-${tag}.png`);
  const out = { tag, typed: typedVal, ...info, consoleErrors: c._rec.consoleErrors.slice(), pageErrors: c._rec.pageErrors.slice(), logErrors: c._rec.logErrors.slice(), badResponses: c._rec.badResponses.slice() };
  console.log(`\n### ${tag} (typed="${typedVal}")`);
  console.log('  url:', info.url, '| title:', info.title);
  console.log('  hasToken:', info.hasTokenWord, '| hasLogin:', info.hasLoginWord, '| modal:', info.modalText);
  console.log('  errors:', c._rec.consoleErrors.length, 'pageErr:', c._rec.pageErrors.length, 'logErr:', c._rec.logErrors.length, 'bad:', c._rec.badResponses.length);
  if (c._rec.badResponses.length) console.log('  BAD:', JSON.stringify(c._rec.badResponses));
  if (c._rec.consoleErrors.length) console.log('  CONSOLE_ERR:', JSON.stringify(c._rec.consoleErrors.slice(0,3)));
  await closePage(c);
  return out;
}

const results = [];
results.push(await doSearch('vuejs/core', 'vuejs-core'));
results.push(await doSearch('notexist/notexist', 'notexist'));
results.push(await doSearch('star-history/star-history', 'lowstar'));
results.push(await doSearch('', 'empty'));
results.push(await doSearch('!!@@##', 'garbage'));

fs.writeFileSync('/workspace/acceptance/round-3/testSearch.json', JSON.stringify(results, null, 2));
