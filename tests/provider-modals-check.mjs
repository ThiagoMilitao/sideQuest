// Uses only Node built-ins and a running Chrome DevTools endpoint.
// Start the local HTTP server on 8765 and Chrome with --remote-debugging-port=9222.
import fs from 'node:fs/promises';
const base = process.env.SIDEQUEST_URL || 'http://127.0.0.1:8765';
const target = await fetch('http://127.0.0.1:9222/json/new?about:blank', {method:'PUT'}).then(r=>r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let sequence=0;const pending = new Map();const errors=[];let checks=0;
ws.addEventListener('message',({data})=>{
  const message=JSON.parse(data);
  if(message.id){const request=pending.get(message.id);pending.delete(message.id);message.error?request.reject(message.error):request.resolve(message.result);}
  if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
const evaluate=async expression=>{if(expression.includes('await '))expression='(async()=>{'+expression+'})()';const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description);return response.result.value;};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=async(expression,label)=>{if(!await evaluate(expression))throw Error('FAIL: '+label);checks++;console.log('PASS: '+label);};
const viewport=async width=>send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<640});
const navigate=async file=>{await send('Page.navigate',{url:base+'/'+file});await pause(1800);};
const screenshot=async name=>{await pause(350);await fs.mkdir('/tmp/sidequest-provider-modals',{recursive:true});const result=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/sidequest-provider-modals/'+name+'.png',Buffer.from(result.data,'base64'));};
try {
 await send('Runtime.enable');await send('Page.enable');await send('Page.bringToFront');await viewport(390);
 await navigate('SideQuestPrestador.html');
 const ids=await evaluate(`Array.from(document.querySelectorAll('dialog.modal'),dialog=>dialog.id)`);
 for(const [width,height] of [[320,640],[390,844],[639,700],[640,800],[768,800],[1280,900],[390,360],[844,390]]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<640});
  for(const id of ids) {
   await evaluate(`(()=>{const id=${JSON.stringify(id)};if(id.startsWith('modal-provider-'))openProviderPanel(id.replace('modal-provider-',''));else document.getElementById(id).showModal();})()`);
   await pause(350);
   const geometry=await evaluate(`(()=>{const dialog=document.getElementById(${JSON.stringify(id)}),box=dialog.querySelector('.modal-box'),r=box.getBoundingClientRect(),s=getComputedStyle(box);return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,overflow:box.scrollWidth>box.clientWidth+1,radius:s.borderBottomLeftRadius,handle:getComputedStyle(box.querySelector('.provider-sheet-handle')).display};})()`);
   const fits=geometry.left>=-1&&geometry.right<=width+1&&geometry.top>=-1&&geometry.bottom<=height+1&&!geometry.overflow;
   const aligned=width<640?Math.abs(geometry.left)<1&&Math.abs(geometry.right-width)<1&&Math.abs(geometry.bottom-height)<1&&geometry.radius==='0px'&&geometry.handle!=='none':Math.abs((geometry.left+geometry.right)/2-width/2)<1&&Math.abs((geometry.top+geometry.bottom)/2-height/2)<1&&geometry.width<=(id==='modal-provider-plans'?1024:512)&&geometry.radius==='24px'&&geometry.handle==='none';
   if(!fits||!aligned)throw Error(JSON.stringify({id,width,height,geometry,fits,aligned}));
   checks++;
   const reachable=await evaluate(`(()=>{const box=document.querySelector('#${id} > .modal-box');box.scrollTop=box.scrollHeight;const buttons=[...box.querySelectorAll('button')].filter(button=>button.getClientRects().length);buttons.at(-1).scrollIntoView({block:'nearest'});const r=buttons.at(-1).getBoundingClientRect(),b=box.getBoundingClientRect();return r.top>=b.top&&r.bottom<=b.bottom+1;})()`);
   if(!reachable)throw Error('Unreachable footer: '+id+' '+width+'x'+height);
   checks++;
   if((width===390&&height===844)&&(id==='modal-budget'||id==='modal-provider-radius')){
    await evaluate(`document.querySelector('#${id} > .modal-box').scrollTop=0`);await screenshot(id+'-mobile');
   }
   if(width===1280&&id==='modal-provider-radius')await screenshot('radius-desktop');
   await evaluate(`document.getElementById(${JSON.stringify(id)}).close()`);
  }
  console.log('PASS: '+ids.length+' modals fit, align and scroll at '+width+'x'+height);
 }
 await viewport(390);await evaluate(`openProviderPanel('radius');document.getElementById('provider-radius-range').value='24';document.getElementById('provider-radius-range').dispatchEvent(new Event('input',{bubbles:true}));`);
 await assert(`document.getElementById('provider-radius-output').textContent==='24 km'`,'range updates displayed distance');
 await evaluate(`document.getElementById('provider-base-city').value='Santos';document.getElementById('provider-radius-form').requestSubmit()`);
 await assert(`!document.getElementById('modal-provider-radius').open&&document.getElementById('provider-radius-label').textContent==='Santos • até 24 km'`,'saving radius updates header and closes sheet');
 await evaluate(`openProviderPanel('radius');document.getElementById('provider-radius-range').value='3';document.querySelector('#modal-provider-radius .provider-panel-actions button').click();openProviderPanel('radius');`);
 await assert(`document.getElementById('provider-radius-range').value==='24'`,'cancel discards unsaved radius');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await pause(300);
 await assert(`!document.getElementById('modal-provider-radius').open`,'Escape closes sheet');
 if(errors.length)throw Error(errors.join('\n'));
 console.log(checks+' modal checks passed. No uncaught browser errors. Screenshots: /tmp/sidequest-provider-modals');
} finally {ws.close();}
