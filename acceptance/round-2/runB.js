const fs = require('fs');
const path = require('path');
const OUT = '/workspace/acceptance/round-2';
const http = require('http');
const START = parseInt(process.argv[2] || '0', 10);
const COUNT = parseInt(process.argv[3] || '5', 10);
function getWsUrl() { return new Promise((resolve, reject) => { http.get('http://127.0.0.1:9222/json/list', (res) => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{const l=JSON.parse(d); resolve(l.find(t=>t.type==='page').webSocketDebuggerUrl);}); }).on('error', reject); }); }
class CDP { constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();this.handlers=[];ws.addEventListener('message',(ev)=>{const m=JSON.parse(ev.data);if(m.id&&this.pending.has(m.id)){const p=this.pending.get(m.id);this.pending.delete(m.id);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method){for(const fn of this.handlers)fn(m);}});}
  send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(this.pending.has(id)){this.pending.delete(id);reject(new Error('timeout '+method));}},90000);});}
  on(fn){this.handlers.push(fn);} }
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const R={consoleErrors:[],netBad:[]};
function wire(cdp){cdp.on((m)=>{
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')R.consoleErrors.push({text:(m.params.args||[]).map(a=>a.value!==undefined?a.value:(a.description||a.type)).join(' ')});
  else if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')R.consoleErrors.push({kind:'log',text:m.params.entry.text,url:m.params.entry.url});
  else if(m.method==='Runtime.exceptionThrown')R.consoleErrors.push({kind:'exception',text:JSON.stringify(m.params.exceptionDetails).slice(0,400)});
  else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)R.netBad.push({url:m.params.response.url,status:m.params.response.status,type:m.params.type});
});}
async function ev(cdp,e){const r=await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails).slice(0,300));return r.result.value;}
async function safe(cdp,e,tries=8){let x;for(let i=0;i<tries;i++){try{return await ev(cdp,e);}catch(y){x=y;await sleep(700);}}return JSON.stringify({__error:String(x).slice(0,150)});}
async function main(){
  const ws=new WebSocket(await getWsUrl());
  await new Promise((res,rej)=>{ws.addEventListener('open',res);ws.addEventListener('error',rej);});
  const cdp=new CDP(ws); wire(cdp);
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable'); await cdp.send('Log.enable');
  const HOME='https://star-history-3wn.pages.dev/';
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await cdp.send('Page.navigate',{url:HOME}); await sleep(2500);
  const cards=JSON.parse(await safe(cdp,`JSON.stringify(Array.from(document.querySelectorAll('a')).filter(a=>{const h=a.getAttribute('href')||'';return /^\\/[^\\/]+\\/[^\\/]+$/.test(h) && !h.startsWith('/blog');}).map(a=>({href:a.getAttribute('href'),text:a.innerText.replace(/\\n+/g,' | ').slice(0,90)})))`));
  const out=[];
  const eBefore=R.consoleErrors.length, nBefore=R.netBad.length;
  for(let i=START;i<Math.min(START+COUNT,cards.length);i++){
    await cdp.send('Page.navigate',{url:HOME}); await sleep(1800);
    const href=cards[i].href, repo=cards[i].href.replace(/^\//,'').split('/')[1];
    const nMark=R.netBad.length;
    const clicked=await ev(cdp,`(()=>{const a=Array.from(document.querySelectorAll('a')).find(x=>x.getAttribute('href')===${JSON.stringify(href)});if(!a)return 'no';a.scrollIntoView();a.click();return 'yes';})()`);
    await sleep(2500);
    const info=JSON.parse(await safe(cdp,`JSON.stringify({url:location.href,title:document.title,h1:(document.querySelector('h1')||{}).innerText||null,bodyLen:(document.body?document.body.innerText.trim().length:-1),bodyText:(document.body?document.body.innerText.slice(0,300):'')})`));
    info.hasRepo=(info.bodyText||'').includes(repo);
    out.push({i:i+1,href,cardText:cards[i].text,clicked,page:info,netBad:R.netBad.slice(nMark)});
    console.log('card',i+1,href,'->',info.url,'| title:',info.title.slice(0,45),'| repoOK:',info.hasRepo);
  }
  fs.writeFileSync(path.join(OUT,`results-cards-${START}.json`),JSON.stringify({cards:out,consoleErrors:R.consoleErrors.slice(eBefore),netBad:R.netBad.slice(nBefore)},null,2));
  ws.close();
  console.log('B DONE chunk',START,'cards',out.length,'errors',R.consoleErrors.slice(eBefore).length,'netBad',R.netBad.slice(nBefore).length);
}
main().catch(e=>{console.error('ERR',e);process.exit(1);});
