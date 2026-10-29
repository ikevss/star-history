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

  const errors = [];
  const badResponses = [];
  cdp.on((msg) => {
    if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      errors.push({ text: msg.params.entry.text, url: msg.params.entry.url });
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      errors.push({ text: (msg.params.args || []).map(a => a.value ?? a.description).join(" ") });
    }
    if (msg.method === "Runtime.exceptionThrown") {
      errors.push({ text: "EXCEPTION: " + msg.params.exceptionDetails.text + " " + (msg.params.exceptionDetails.exception?.description || "") });
    }
    if (msg.method === "Network.responseReceived") {
      const r = msg.params.response;
      if (r.status >= 400) badResponses.push({ url: r.url, status: r.status, type: r.type });
    }
  });

  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Page.navigate", { url: URL });
  await waitEvent(cdp, "Page.loadEventFired", 20000);
  await sleep(2500);

  const out = { cards: [], clicks: [], hamburger: {}, search: {}, errors: [], badResponses: [] };

  // all cards
  out.cards = await evalJS(cdp, `JSON.parse(JSON.stringify(Array.from(document.querySelectorAll('main a[href^="/"]')).map(a=>({href:a.getAttribute('href'), t:a.innerText.replace(/\\n+/g,' | ').slice(0,90)}))))`);

  async function clickEl(selector, idx) {
    const box = await evalJS(cdp, `(() => {
      const els = document.querySelectorAll(${JSON.stringify(selector)});
      const el = els[${idx}];
      if (!el) return null;
      el.scrollIntoView({block:'center'});
      const r = el.getBoundingClientRect();
      return {x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), href: el.getAttribute('href')};
    })()`);
    if (!box) return { ok: false, reason: "not found" };
    await sleep(300);
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x, y: box.y, button: "left", clickCount: 1 });
    await sleep(1800);
    return { ok: true, href: box.href };
  }

  async function stateAfter() {
    return await evalJS(cdp, `(() => {
      const txt = document.body.innerText.slice(0, 400);
      return { href: location.href, title: document.title, has404: /404|could not be found|页面不存在|未找到/.test(txt), snippet: txt.replace(/\\n+/g,' | ').slice(0,300) };
    })()`);
  }

  const toClick = [0, 1, 10, 15, 19].filter(i => i < out.cards.length);
  for (const i of toClick) {
    const before = out.cards[i];
    const r = await clickEl('main a[href^="/"]', i);
    const st = await stateAfter();
    out.clicks.push({ index: i, cardHref: before.href, cardText: before.t, click: r, after: st, shot: await shot(cdp, `click-card-${i}.png`) });
    if (st.href !== URL) {
      await cdp.send("Page.navigate", { url: URL });
      await sleep(2000);
    }
  }

  // hamburger at 375
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await cdp.send("Page.navigate", { url: URL });
  await sleep(2500);
  out.hamburger.before = await evalJS(cdp, `(() => {
    const btn = document.querySelector('button[aria-label="Toggle menu"]');
    const menu = document.querySelector('header + div');
    const vis = menu ? getComputedStyle(menu).display : 'none';
    return { btnVisible: !!btn && btn.getBoundingClientRect().width>0, menuDisplay: vis, btnRect: btn? btn.getBoundingClientRect().toJSON(): null };
  })()`);
  out.hamburger.shotClosed = await shot(cdp, "04-mobile-menu-closed.png");
  // click hamburger
  const hb = out.hamburger.before.btnRect;
  if (hb) {
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: Math.round(hb.left + hb.width/2), y: Math.round(hb.top + hb.height/2), button: "left", clickCount: 1 });
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: Math.round(hb.left + hb.width/2), y: Math.round(hb.top + hb.height/2), button: "left", clickCount: 1 });
    await sleep(800);
    out.hamburger.after = await evalJS(cdp, `(() => {
      const menu = document.querySelector('header + div');
      const vis = menu ? getComputedStyle(menu).display : 'none';
      const btn = document.querySelector('button[aria-label="Toggle menu"]');
      return { menuDisplay: vis, menuText: menu? menu.innerText.replace(/\\n+/g,' | '): '', ariaExpanded: btn? btn.getAttribute('aria-expanded'): null };
    })()`);
    out.hamburger.shotOpen = await shot(cdp, "05-mobile-menu-open.png");
  }

  // search box test at 1440
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await cdp.send("Page.navigate", { url: URL });
  await sleep(2500);
  await evalJS(cdp, `document.querySelector('#lookup').scrollIntoView({block:'center'})`);
  await sleep(500);
  out.search.before = await evalJS(cdp, `(() => {
    const input = document.querySelector('#lookup input');
    return { found: !!input, placeholder: input? input.placeholder : null };
  })()`);
  out.search.shotBefore = await shot(cdp, "06-search-before.png");
  const typed = await evalJS(cdp, `(() => {
    const input = document.querySelector('#lookup input');
    if (!input) return { ok:false };
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'vuejs/core');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok:true, value: input.value };
  })()`);
  out.search.typed = typed;
  await sleep(400);
  out.search.shotTyped = await shot(cdp, "07-search-typed.png");
  await evalJS(cdp, `(() => {
    const input = document.querySelector('#lookup input');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
    return true;
  })()`);
  await sleep(2500);
  out.search.after = await evalJS(cdp, `(() => {
    const txt = document.body.innerText.slice(0,500);
    const chart = !!document.querySelector('#lookup') && /star history|Star History|Loading|star-history/i.test(document.body.innerText);
    return { href: location.href, snippet: txt.replace(/\\n+/g,' | ').slice(0,400), repoChips: Array.from(document.querySelectorAll('#lookup ~ div span')).map(s=>s.innerText).slice(0,6), chartPresent: !!document.querySelector('svg'), hash: location.hash };
  })()`);
  out.search.shotAfter = await shot(cdp, "08-search-after.png");

  out.errors = errors;
  out.badResponses = badResponses;

  fs.writeFileSync("/workspace/acceptance/round-1/interact-result.json", JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
