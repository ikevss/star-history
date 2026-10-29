import { Session, newTarget, closeTarget } from './cdp.mjs';
const hrefs = ['/openclaw/openclaw','/x1xhlol/system-prompts-and-models-of-ai-tools','/obra/superpowers','/anthropics/skills','/affaan-m/everything-claude-code','/anomalyco/opencode','/anthropics/claude-code','/f/prompts.chat','/public-apis/public-apis','/codecrafters-io/build-your-own-x','/firecrawl/firecrawl','/shubhamsaboo/awesome-llm-apps','/daytonaio/daytona','/sindresorhus/awesome','/ladybirdbrowser/ladybird','/github/spec-kit','/digitalplatdev/freedomain','/microsoft/markitdown','/clash-verge-rev/clash-verge-rev','/torvalds/linux'];
const t = await newTarget('about:blank');
const s = new Session(t.webSocketDebuggerUrl);
await s.connect();
await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Network.enable'); await s.send('Log.enable');
await s.send('Network.setCacheDisabled', { cacheDisabled: true });
await s.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const bad = [];
for (const h of hrefs) {
  s.errors.length = 0;
  await s.send('Page.navigate', { url: 'https://star-history-3wn.pages.dev' + h });
  await new Promise(r => setTimeout(r, 3200));
  const errs = s.errors.map(e=>({t:e.type, st:e.status, text:(e.text||e.url||'').slice(0,70)}));
  if (errs.length) { bad.push({h, errs}); console.log('ERR', h, JSON.stringify(errs)); }
  else console.log('OK ', h);
}
console.log('TOTAL BAD:', bad.length);
await s.close(); await closeTarget(t.id);
