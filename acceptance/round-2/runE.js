const fs = require('fs');
const path = require('path');
const OUT = '/workspace/acceptance/round-2';
const SHOT = path.join(OUT, 'screenshots');
const http = require('http');
function getWsUrl() { return new Promise((resolve, reject) => { http.get('http://127.0.0.1:9222/json/list', (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{const l=JSON.parse(d); resolve(l.find(t=>t.type==='page').webSocketDebuggerUrl);}); }).on('error', reject); }); }
class CDP { constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.handlers=[];ws.addEventListener('message',(ev)=>{const m=JSON.parse(ev.data);if(m.id&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method){for(const fn of this.handlers)fn(m);}});}
  send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.pending.has(id)){this.pending.delete(id);reject(new Error('timeout '+method));}},90000);});}
  on(fn){this.handlers.push(fn);} }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ev(cdp,e){const r=await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails).slice(0,300));return r.result.value;}
async function safe(cdp,e,tries=8){let x;for(let i=0;i<tries;i++){try{return await ev(cdp,e);}catch(y){x=y;await sleep(700);}}return JSON.stringify({__error:String(x).slice(0,150)});}
async function main(){
  const ws=new WebSocket(await getWsUrl());
  await new Promise((res,rej)=>{ws.addEventListener('open',res);ws.addEventListener('error',rej);});
  const cdp=new CDP(ws);
  const R={errors:[],netBad:[]};
  cdp.on((m)=>{ if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')R.errors.push({text:m.params.entry.text.slice(0,100),url:(m.params.entry.url||'').slice(0,140)});
    else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')R.errors.push({text:(m.params.args||[]).map(a=>a.value!==undefined?a.value:(a.description||a.type)).join(' ').slice(0,140)});
    else if(m.method==='Runtime.exceptionThrown')R.errors.push({text:JSON.stringify(m.params.exceptionDetails).slice(0,140)});
    else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)R.netBad.push({status:m.params.response.status,url:m.params.response.url.slice(0,140)}); });
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable'); await cdp.send('Log.enable');
  const HOME='https://star-history-3wn.pages.dev/';
  const O={};
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await cdp.send('Page.navigate',{url:HOME}); await sleep(2500);
  O.ghLink=await safe(cdp,`(()=>{const a=Array.from(document.querySelectorAll('a')).find(x=>x.innerText.trim()==='连接 GitHub');if(!a)return 'none';return JSON.stringify({href:a.href,target:a.target,rel:a.rel});})()`);
  const before=await safe(cdp,'location.href');
  await ev(cdp,`(()=>{const a=Array.from(document.querySelectorAll('a')).find(x=>x.innerText.trim()==='连接 GitHub');if(a)a.click();return true;})()`);
  await sleep(3000);
  O.ghAfter={before,url:await safe(cdp,'location.href'),title:await safe(cdp,'document.title'),
    modal:await safe(cdp,`(()=>{const m=Array.from(document.querySelectorAll('[role=dialog],dialog,[class*=modal],[class*=Modal]')).find(e=>e.getBoundingClientRect().width>0);return m?m.innerText.slice(0,200):null})()`),
    inputs:await safe(cdp,`JSON.stringify(Array.from(document.querySelectorAll('input')).map(i=>({type:i.type,ph:i.placeholder})))`),
    bodyHead:await safe(cdp,'(document.body?document.body.innerText.slice(0,200):"")')};
  O.ghErrors=R.errors.slice(); R.errors.length=0; R.netBad.length=0;

  // bottom search box: click 查看 button
  await cdp.send('Page.navigate',{url:HOME}); await sleep(2200);
  O.bottomSearch=await safe(cdp,`(()=>{const i=document.querySelector('input');const btn=Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='查看');return JSON.stringify({ph:i?i.placeholder:null,hasBtn:!!btn});})()`);
  const tB=Date.now();
  await ev(cdp,`(()=>{const i=document.querySelector('input');const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,'vuejs/core');i.dispatchEvent(new Event('input',{bubbles:true}));const btn=Array.from(document.querySelectorAll('button')).find(b=>b.innerText.trim()==='查看');if(btn)btn.click();return true;})()`);
  await sleep(3000);
  O.bottomSearchResult={url:await safe(cdp,'location.href'),title:await safe(cdp,'document.title'),ms:Date.now()-tB};
  fs.writeFileSync(path.join(SHOT,'bottom-search-vuejs.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'));

  // project page mobile overflow at 375
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
  await cdp.send('Page.navigate',{url:'https://star-history-3wn.pages.dev/vuejs/core'}); await sleep(4000);
  O.projectMobile=await safe(cdp,`(()=>{const de=document.documentElement,vw=innerWidth;return JSON.stringify({innerW:vw,scrollW:de.scrollWidth,overflowX:de.scrollWidth>vw+1,bodyLen:(document.body?document.body.innerText.trim().length:-1)});})()`);
  fs.writeFileSync(path.join(SHOT,'project-375.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
  O.projectErrors=R.errors.slice(); O.projectNetBad=R.netBad.slice();

  fs.writeFileSync(path.join(OUT,'results-e.json'),JSON.stringify(O,null,2));
  ws.close();
  console.log('E DONE ghErrors='+O.ghErrors.length+' projectErrors='+O.projectErrors.length+' projectNetBad='+O.projectNetBad.length);
}
main().catch(e=>{console.error('ERR',e);process.exit(1);});
