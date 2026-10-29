const fs = require("fs");
const { connect, sleep, waitEvent, evalJS, shot, getTarget, OUT } = require("./cdp");
const URL = "https://star-history-3wn.pages.dev/";

async function main() {
  const target = await getTarget();
  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Network.enable");
  const errs = [];
  cdp.on((m) => {
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") errs.push(m.params.entry.text + " @" + (m.params.entry.url || ""));
  });

  const out = { brokenCards: [], mobileLookup: {}, consoleErrors: [] };

  async function go(width, height, mobile) {
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
    await cdp.send("Page.navigate", { url: URL });
    await waitEvent(cdp, "Page.loadEventFired", 20000);
    await sleep(2000);
  }

  async function clickIdx(i) {
    const box = await evalJS(cdp, `(() => {
      const el = document.querySelectorAll('main a[href^="/"]')[${i}];
      if(!el) return null; el.scrollIntoView({block:'center'});
      const r = el.getBoundingClientRect();
      return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+r.height/2), href:el.getAttribute('href')};
    })()`);
    await sleep(300);
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
    await sleep(2000);
    return box;
  }

  await go(1440, 900, false);
  const cards = await evalJS(cdp, `JSON.parse(JSON.stringify(Array.from(document.querySelectorAll('main a[href^="/"]')).map(a=>a.getAttribute('href'))))`);
  out.cardHrefs = cards;

  for (const i of [11, 14, 16]) {
    await go(1440, 900, false);
    const box = await clickIdx(i);
    const st = await evalJS(cdp, `(() => {
      const txt = document.body.innerText.slice(0,500);
      return { href: location.href, title: document.title, text: txt.replace(/\\n+/g,' | ').slice(0,300) };
    })()`);
    out.brokenCards.push({ index: i, href: box && box.href, after: st, shot: await shot(cdp, `broken-card-${i}.png`) });
  }

  // mobile lookup overflow
  await go(375, 812, true);
  await evalJS(cdp, `document.querySelector('#lookup').scrollIntoView({block:'center'})`);
  await sleep(600);
  out.mobileLookup = await evalJS(cdp, `(() => {
    const innerW = window.innerWidth;
    const de = document.documentElement;
    const bad = [];
    document.querySelectorAll('#lookup *').forEach(el=>{
      const r = el.getBoundingClientRect();
      if(r.width>0 && (r.right>innerW+1 || r.left<-1)) bad.push({tag:el.tagName, cls:(el.className||'').toString().slice(0,60), left:Math.round(r.left), right:Math.round(r.right)});
    });
    const row = document.querySelector('#lookup input')?.parentElement;
    const rr = row? row.getBoundingClientRect(): null;
    return { innerW, docScrollWidth: de.scrollWidth, overflowX: de.scrollWidth>innerW, badCount: bad.length, bad: bad.slice(0,6), rowWidth: rr?Math.round(rr.width):null, rowRight: rr?Math.round(rr.right):null };
  })()`);
  out.mobileLookup.shot = await shot(cdp, "09-mobile-lookup-overflow.png");

  // mobile footer
  await evalJS(cdp, `window.scrollTo(0, document.body.scrollHeight)`);
  await sleep(600);
  out.mobileFooterShot = await shot(cdp, "10-mobile-footer.png");

  out.consoleErrors = errs;
  fs.writeFileSync("/workspace/acceptance/round-1/final-result.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}
main().catch((e) => { console.error("FATAL", e); process.exit(1); });
