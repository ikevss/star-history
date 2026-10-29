import { run } from './cdp.mjs';
import fs from 'node:fs';

const repos = ['vuejs/core','openai/codex','torvalds/linux','anthropics/claude-code','sindresorhus/awesome'];
const out = [];
for (const repo of repos) {
  const slug = repo.replace('/', '-');
  const r = await run({
    url: 'https://star-history-3wn.pages.dev/' + repo,
    width: 1440, height: 900, mobile: false, name: 'detail-1440-' + slug, wait: 4500, fullPage: true,
    actions: async (s) => {
      await new Promise(r=>setTimeout(r,1500));
      return await s.evaluate(`(() => {
        const txt = document.body.innerText;
        const svgs = [...document.querySelectorAll('svg')].map(s=>s.outerHTML.length);
        const texts = [...document.querySelectorAll('svg text, svg tspan')].map(t=>t.textContent.trim()).filter(Boolean);
        const charts = [...document.querySelectorAll('canvas')].length;
        return {
          title: document.title,
          h1: document.querySelector('h1')?.innerText,
          headerText: document.querySelector('header')?.innerText,
          footerText: (document.querySelector('footer')?.innerText||'').slice(0,400),
          bodyStart: txt.slice(0, 1200),
          svgTexts: texts.slice(0,60),
          canvases: charts,
          hasStarHistoryBrand: /star-history\\.com|star-history/i.test(document.body.innerHTML),
          starHistoryMatches: (document.body.innerHTML.match(/star-history[^"'< ]{0,30}/gi)||[]).slice(0,10),
          visibleEnglishTerms: txt.match(/\\b(stargazers|forks|commits|repo|slug|stars|watchers|issues|pull requests)\\b/gi)
        };
      })()`);
    }
  });
  out.push({ repo, ...r });
  console.log('=== ' + repo + ' ===');
  console.log('title:', r.actionResults?.title);
  console.log('h1:', r.actionResults?.h1);
  console.log('header:', r.actionResults?.headerText?.replace(/\n/g,' | '));
  console.log('svgTexts:', JSON.stringify(r.actionResults?.svgTexts));
  console.log('canvases:', r.actionResults?.canvases);
  console.log('hasStarHistoryBrand:', r.actionResults?.hasStarHistoryBrand, JSON.stringify(r.actionResults?.starHistoryMatches));
  console.log('engTerms:', JSON.stringify(r.actionResults?.visibleEnglishTerms));
  console.log('errors:', JSON.stringify(r.errors));
  console.log('hscroll:', r.metrics?.hasHScroll, 'overflow:', r.metrics?.overflowCount);
  console.log('bodyStart:', (r.actionResults?.bodyStart||'').replace(/\n/g,' | ').slice(0,700));
  console.log('footer:', (r.actionResults?.footerText||'').replace(/\n/g,' | ').slice(0,300));
}
fs.writeFileSync('/workspace/acceptance/round-5/raw-details.json', JSON.stringify(out, null, 2));
