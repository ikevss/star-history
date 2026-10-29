const fs = require("fs");
const path = require("path");

const OUT = "/workspace/acceptance/round-1/screenshots";
fs.mkdirSync(OUT, { recursive: true });

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else {
        this.listeners.forEach((l) => l(msg));
      }
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(fn) {
    this.listeners.push(fn);
  }
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  return new CDP(ws);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitEvent(cdp, method, timeout = 15000) {
  return new Promise((resolve) => {
    const t = setTimeout(() => {
      cdp.on = cdp.on; // noop
      resolve(false);
    }, timeout);
    const handler = (msg) => {
      if (msg.method === method) {
        clearTimeout(t);
        const idx = cdp.listeners.indexOf(handler);
        if (idx >= 0) cdp.listeners.splice(idx, 1);
        resolve(msg.params);
      }
    };
    cdp.on(handler);
  });
}

async function evalJS(cdp, expression) {
  const r = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

async function shot(cdp, name) {
  const r = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, Buffer.from(r.data, "base64"));
  return p;
}

async function getTarget() {
  const list = await (await fetch("http://127.0.0.1:9222/json/list")).json();
  const page = list.find((t) => t.type === "page");
  if (!page) throw new Error("no page target");
  return page;
}

module.exports = { CDP, connect, sleep, waitEvent, evalJS, shot, getTarget, OUT };
