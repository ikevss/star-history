const fs = require('fs');
const path = require('path');
const OUT = '/workspace/acceptance/round-2';
const http = require('http');
function newTab() { return new Promise((resolve, reject) => { const req = http.request('http://127.0.0.1:9222/json/new?https://star-history-3wn.pages.dev/', { method: 'PUT' }, (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d))); }); req.on('error', reject); req.end(); }); }
function getWsUrl(id) { return new Promise((resolve, reject) => { http.get('http://127.0.0.1:9222/json/list', (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{const l=JSON.parse(d); resolve(l.find(t=>t.id===id).webSocketDebuggerUrl);}); }).on('error', reject); }); }
class CDP { constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.handlers=[];ws.addEventListener('message',(ev)=>{const m=JSON.parse(ev.data);if(m.id&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method){for(const fn of this.handlers)fn(m);}});}
  send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.pending.has(id)){this.pending.delete(id);reject(new Error('timeout '+method));}},90000);});}
  on(fn){this.handlers.push(fn);} }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ev(cdp,e){const r=await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails).slice(0,300));return r.result.value;}
async function safe(cdp,e,tries=8){let x;for(let i=0;i<tries;i++){try{return await ev(cdp,e);}catch(y){x=y;await sleep(700);}}return JSON.stringify({__error:String(x).slice(0,150)});}
async function main(){
  const tab = await newTab();
  const ws = new WebSocket(await getWsUrl(tab.id));
  await new Promise((res,rej)=>{ws.addEventListener('open',res);ws.addEventListener('error',rej);});
  const cdp = new CDP(ws);
  const R={errors:[],netBad:[]};
  cdp.on((m)=>{
    if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')R.errors.push({phase:'console',text:(m.params.args||[]).map(a=>a.value!==undefined?a.value:(a.description||a.type)).join(' ').slice(0,200)});
    else if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')R.errors.push({phase:'log',text:m.params.entry.text.slice(0,120),url:(m.params.entry.url||'').slice(0,160)});
    else if(m.method==='Runtime.exceptionThrown')R.errors.push({phase:'exception',text:JSON.stringify(m.params.exceptionDetails).slice(0,160)});
    else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)R.netBad.push({status:m.params.response.status,url:m.params.response.url.slice(0,160)});
  });
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable'); await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await cdp.send('Network.clearBrowserCache');
  const t0=Date.now();
  await cdp.send('Page.navigate',{url:'https://star-history-3wn.pages.dev/'});
  await sleep(9000);
  const O={ freshLoadMs: Date.now()-t0, freshErrors: R.errors.slice(), freshNetBad: R.netBad.slice() };
  O.fullText = await safe(cdp,'document.body.innerText');
  O.trunc = await safe(cdp,`JSON.stringify(Array.from(document.querySelectorAll('span')).filter(s=>s.scrollWidth>s.clientWidth+2&&s.clientWidth>0).map(s=>({t:s.innerText,sw:s.scrollWidth,cw:s.clientWidth,title:s.getAttribute('title'),overflow:getComputedStyle(s).overflow,textOverflow:getComputedStyle(s).textOverflow,whiteSpace:getComputedStyle(s).whiteSpace})))`);
  // click 连接 GitHub
  const gh = await safe(cdp,`(()=>{const a=Array.from(document.querySelectorAll('a')).find(x=>/GitHub/i.test(x.innerText));if(!a)return 'none';const info={text:a.innerText.trim(),href:a.href};a.click();return JSON.stringify(info);})()`);
  await sleep(2500);
  O.githubClick = { info: gh, url: await safe(cdp,'location.href'), title: await safe(cdp,'document.title'),
    modal: await safe(cdp,`(()=>{const m=Array.from(document.querySelectorAll('[role=dialog],dialog,[class*=modal],[class*=Modal],[class*=overlay]')).find(e=>e.getBoundingClientRect().width>0);return m?m.innerText.slice(0,300):null})()`),
    bodyHead: await safe(cdp,'(document.body?document.body.innerText.slice(0,250):"")') };
  O.afterGithubErrors = R.errors.slice();
  fs.writeFileSync(path.join(OUT,'results-d.json'),JSON.stringify(O,null,2));
  ws.close();
  console.log('D DONE freshErrors='+O.freshErrors.length+' freshNetBad='+O.freshNetBad.length+' afterGithubErrors='+O.afterGithubErrors.length);
}
main().catch(e=>{console.error('ERR',e);process.exit(1);});
