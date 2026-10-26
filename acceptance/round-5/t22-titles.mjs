import { Session, newTarget, closeTarget } from './cdp.mjs';
const repos = ['vuejs/core','openai/codex','torvalds/linux','anthropics/claude-code','sindresorhus/awesome','openclaw/openclaw','anomalyco/opencode'];
const t = await newTarget('about:blank');
const s = new Session(t.webSocketDebuggerUrl);
await s.connect();
await s.send('Page.enable'); await s.send('Runtime.enable');
await s.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
for (const repo of repos) {
  await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev/' + repo });
  await new Promise(r => setTimeout(r, 3000));
  const info = await s.evaluate(`(() => {
    const titled = [...document.querySelectorAll('[title]')].map(e=>({t:e.getAttribute('title'), txt:(e.innerText||'').slice(0,20)})).filter(x=>/关注|复刻|贡献者|提交|解决/.test(x.t));
    return {title: document.title, titled: titled.slice(0,8), weekRow: (document.body.innerText.match(/本周[\\s\\S]{0,40}/)||[''])[0].replace(/\\n/g,' ')};
  })()`);
  console.log('###', repo, '|', info.title);
  console.log('  ', JSON.stringify(info.titled));
  console.log('   weekRow:', JSON.stringify(info.weekRow));
}
await s.close(); await closeTarget(t.id);
