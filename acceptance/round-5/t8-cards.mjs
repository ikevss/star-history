import { Session, newTarget, closeTarget } from './cdp.mjs';
import fs from 'node:fs';

const hrefs = ['/openclaw/openclaw','/x1xhlol/system-prompts-and-models-of-ai-tools','/obra/superpowers','/anthropics/skills','/affaan-m/everything-claude-code','/anomalyco/opencode','/anthropics/claude-code','/f/prompts.chat','/public-apis/public-apis','/codecrafters-io/build-your-own-x','/firecrawl/firecrawl','/shubhamsaboo/awesome-llm-apps','/daytonaio/daytona','/sindresorhus/awesome','/ladybirdbrowser/ladybird','/github/spec-kit','/digitalplatdev/freedomain','/microsoft/markitdown','/clash-verge-rev/clash-verge-rev','/torvalds/linux'];

const t = await newTarget('about:blank');
const s = new Session(t.webSocketDebuggerUrl);
await s.connect();
await s.send('Page.enable'); await s.send('Runtime.enable'); await s.send('Network.enable'); await s.send('Log.enable');
await s.send('Network.setCacheDisabled', { cacheDisabled: true });
await s.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

let docStatus = null;
const origCollect = s._collect.bind(s);
s._collect = (msg) => {
  if (msg.method === 'Network.responseReceived' && msg.params.type === 'Document') docStatus = msg.params.response.status;
  origCollect(msg);
};

const results = [];
for (const h of hrefs) {
  docStatus = null;
  s.errors.length = 0;
  const url = 'https://star-history-3wn.pages.dev' + h;
  await s.send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, 2600));
  const info = await s.evaluate(`(() => ({
    title: document.title,
    text: document.body.innerText.replace(/\\n/g,' | ').slice(0,260),
    hasRepo: document.body.innerText.toLowerCase().includes(${JSON.stringify(h.slice(1).split('/')[1])}),
    buttons: [...document.querySelectorAll('button')].map(b=>(b.innerText||'').trim()).filter(Boolean),
    inputs: [...document.querySelectorAll('input')].map(i=>({ph:i.placeholder, type:i.type})),
    modal: [...document.querySelectorAll('[role=dialog], .modal, [aria-modal=true]')].length
  }))()`);
  results.push({ href: h, status: docStatus, ...info, errors: s.errors.slice() });
  console.log(h, '=>', docStatus, '|', info.title, '|', JSON.stringify(info.errors||[]), '| errs:', JSON.stringify(s.errors));
}
await s.close(); await closeTarget(t.id);
fs.writeFileSync('/workspace/acceptance/round-5/raw-cards.json', JSON.stringify(results, null, 2));
