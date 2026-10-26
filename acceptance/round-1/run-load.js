const fs = require("fs");
const { connect, sleep, waitEvent, evalJS, shot, getTarget, OUT } = require("./cdp");

const URL = "https://star-history-3wn.pages.dev/";

async function main() {
  const target = await getTarget();
  const cdp = await connect(target.webSocketDebuggerUrl);

  const consoleErrors = [];
  const consoleAll = [];
  const pageErrors = [];
  const networkErrors = [];
  const responses = [];

  cdp.on((msg) => {
    if (msg.method === "Runtime.consoleAPICalled") {
      const { type, args } = msg.params;
      const text = (args || []).map((a) => a.value ?? a.description ?? a.unserializableValue ?? "").join(" ");
      consoleAll.push({ type, text });
      if (type === "error") consoleErrors.push({ type, text });
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const d = msg.params.exceptionDetails;
      pageErrors.push({ text: d.text, desc: d.exception?.description, url: d.url, line: d.lineNumber });
    }
    if (msg.method === "Log.entryAdded") {
      const e = msg.params.entry;
      consoleAll.push({ type: "log:" + e.level, text: e.text });
      if (e.level === "error") consoleErrors.push({ type: "log", text: e.text, url: e.url });
    }
    if (msg.method === "Network.responseReceived") {
      const r = msg.params.response;
      responses.push({ url: r.url, status: r.status, type: r.type });
      if (r.status >= 400) networkErrors.push({ url: r.url, status: r.status });
    }
    if (msg.method === "Network.loadingFailed") {
      networkErrors.push({ url: msg.params.errorText, err: msg.params.errorText, blocked: msg.params.blockedReason });
    }
  });

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Network.enable");

  const t0 = Date.now();
  const loaded = waitEvent(cdp, "Page.loadEventFired", 20000);
  await cdp.send("Page.navigate", { url: URL });
  await loaded;
  const tLoad = Date.now() - t0;

  // wait for cards to render
  let tCards = null;
  for (let i = 0; i < 60; i++) {
    const n = await evalJS(cdp, `document.querySelectorAll('main a[href^="/"]').length`);
    if (n >= 20) {
      tCards = Date.now() - t0;
      break;
    }
    await sleep(100);
  }

  await sleep(2500);

  // LCP
  const lcp = await evalJS(cdp, `(() => {
    try {
      const e = performance.getEntriesByType('largest-contentful-paint');
      return e.length ? e[e.length-1].startTime : null;
    } catch(e){ return null; }
  })()`);

  const results = {};

  async function metrics(width, height, mobile) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: 1, mobile: !!mobile,
    });
    await sleep(600);
    const m = await evalJS(cdp, `(() => {
      const de = document.documentElement;
      const innerW = window.innerWidth;
      const innerH = window.innerHeight;
      const overflowing = [];
      document.querySelectorAll('*').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > innerW + 1 || r.left < -1)) {
          overflowing.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,80), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) });
        }
      });
      const cards = Array.from(document.querySelectorAll('main a[href^="/"]')).map(a => ({href:a.getAttribute('href'), text:a.innerText.replace(/\\n/g,' | ').slice(0,120)}));
      const firstScreenText = document.body.innerText.slice(0, 1200);
      const h1 = document.querySelector('h1')?.innerText || '';
      const pills = Array.from(document.querySelectorAll('main button')).map(b=>b.innerText.trim()).slice(0,12);
      const lookupInput = !!document.querySelector('#lookup input');
      const footerInput = !!document.querySelector('footer input');
      return {
        innerW, innerH,
        scrollWidth: de.scrollWidth, bodyScrollWidth: document.body.scrollWidth, clientWidth: de.clientWidth,
        horizontalOverflow: de.scrollWidth > innerW,
        docHeight: de.scrollHeight,
        overflowingCount: overflowing.length,
        overflowing: overflowing.slice(0,10),
        cardCount: cards.length,
        cards: cards.slice(0,6),
        h1, pills, lookupInput, footerInput,
        firstScreenText
      };
    })()`);
    return m;
  }

  // 1440 desktop
  results.desktop = await metrics(1440, 900, false);
  results.desktop.shot = await shot(cdp, "01-desktop-1440.png");

  // 768 tablet
  results.tablet = await metrics(768, 1024, false);
  results.tablet.shot = await shot(cdp, "02-tablet-768.png");

  // 375 mobile
  results.mobile = await metrics(375, 812, true);
  results.mobile.shot = await shot(cdp, "03-mobile-375.png");

  // first paint / fcp
  results.fcp = await evalJS(cdp, `(() => {
    const p = performance.getEntriesByType('paint');
    const f = p.find(x=>x.name==='first-contentful-paint');
    return f ? f.startTime : null;
  })()`);
  results.tLoadMs = tLoad;
  results.tCardsMs = tCards;
  results.lcp = lcp;
  results.consoleErrors = consoleErrors;
  results.pageErrors = pageErrors;
  results.networkErrors = networkErrors;
  results.badResponses = responses.filter(r => r.status >= 400);
  results.allResponses = responses;
  results.consoleAllCount = consoleAll.length;

  fs.writeFileSync("/workspace/acceptance/round-1/load-result.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
