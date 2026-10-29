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
  cdp.on((m)=>{
    if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')R.errors.push({phase:'console',text:(m.params.args||[]).map(a=>a.value!==undefined?a.value:(a.description||a.type)).join(' ').slice(0,200)});
    else if(m.method==='Log.entryAdded'&&m.params.entry.level==='error')R.errors.push({phase:'log',text:m.params.entry.text.slice(0,120),url:(m.params.entry.url||'').slice(0,160)});
    else if(m.method==='Runtime.exceptionThrown')R.errors.push({phase:'exception',text:JSON.stringify(m.params.exceptionDetails).slice(0,200)});
    else if(m.method==='Network.responseReceived'&&m.params.response.status>=400)R.netBad.push({status:m.params.response.status,url:m.params.response.url.slice(0,160)});
  });
  await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Network.enable'); await cdp.send('Log.enable');
  const HOME='https://star-history-3wn.pages.dev/';
  const O={};

  await cdp.send('Network.clearBrowserCache');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  const t0=Date.now();
  await cdp.send('Page.navigate',{url:HOME});
  await sleep(5000);
  O.homeLoadMs=Date.now()-t0;
  O.homeErrors=R.errors.slice(); O.homeNetBad=R.netBad.slice();
  R.errors.length=0; R.netBad.length=0;

  O.homeGate=JSON.parse(await safe(cdp,`(() => { const txt=(document.body?document.body.innerText:'');
    const kw=['注册','登录','token','Token','API Key','Sign in','Sign up','Log in','Login','密码','password','授权','连接 GitHub','Connect GitHub'];
    return JSON.stringify({found:kw.filter(k=>txt.includes(k)), bodyHead:txt.slice(0,200), inputs:Array.from(document.querySelectorAll('input')).map(i=>({type:i.type,ph:i.placeholder}))});})()`));

  // home again to reset, then hamburger deep-dive at 375
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
  await cdp.send('Page.navigate',{url:HOME}); await sleep(2500);
  O.hamDeepBefore=JSON.parse(await safe(cdp,`JSON.stringify({btns:Array.from(document.querySelectorAll('button')).map((b,i)=>({i,t:b.innerText.trim().slice(0,25),aria:b.getAttribute('aria-label'),controls:b.getAttribute('aria-controls'),exp:b.getAttribute('aria-expanded'),vis:b.getBoundingClientRect().width>0})), hasNav:!!document.querySelector('nav'), navHTML:(document.querySelector('nav')||{}).outerHTML?document.querySelector('nav').outerHTML.slice(0,200):null})`));
  const clickRes=await ev(cdp,`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.getAttribute('aria-label')==='Toggle menu');if(!b)return 'nobtn';b.click();return 'clicked';})()`);
  await sleep(1000);
  O.hamDeepClick=clickRes;
  O.hamDeepAfter=JSON.parse(await safe(cdp,`(() => {
    const btn=Array.from(document.querySelectorAll('button')).find(x=>x.getAttribute('aria-label')==='Toggle menu');
    const menu=Array.from(document.querySelectorAll('a')).filter(a=>['/','/blog','/blog/how-to-use-github-star-history'].includes(a.getAttribute('href')));
    return JSON.stringify({btnExpanded:btn?btn.getAttribute('aria-expanded'):null,
      navCount:document.querySelectorAll('nav').length,
      visibleNavLinks:Array.from(document.querySelectorAll('nav a,header a,[role=menu] a')).map(a=>({t:a.innerText.trim().slice(0,40),href:a.getAttribute('href'),vis:a.getBoundingClientRect().width>0&&a.getBoundingClientRect().height>0})).filter(x=>x.vis),
      allLinks:Array.from(document.querySelectorAll('a')).map(a=>({t:a.innerText.trim().slice(0,30),href:a.getAttribute('href'),vis:a.getBoundingClientRect().width>0})).slice(0,15)});})()`));
  fs.writeFileSync(path.join(SHOT,'375-menu-open.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'));

  // home again -> hamburger item click test
  await cdp.send('Page.navigate',{url:HOME}); await sleep(2000);
  await ev(cdp,`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.getAttribute('aria-label')==='Toggle menu');if(b)b.click();return true;})()`);
  await sleep(700);
  const blogClick=await ev(cdp,`(()=>{const a=Array.from(document.querySelectorAll('a')).find(x=>x.getAttribute('href')==='/blog');if(!a)return 'nolink';a.click();return 'clicked';})()`);
  await sleep(2000);
  O.hamBlogClick={click:blogClick,url:await safe(cdp,'location.href'),title:await safe(cdp,'document.title')};

  O.afterErrors=R.errors.slice();
  fs.writeFileSync(path.join(OUT,'results-c.json'),JSON.stringify(O,null,2));
  ws.close();
  console.log('C DONE homeErrors='+O.homeErrors.length+' homeNetBad='+O.homeNetBad.length+' afterErrors='+O.afterErrors.length);
}
main().catch(e=>{console.error('ERR',e);process.exit(1);});
