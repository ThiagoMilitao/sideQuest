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
const screenshot=async name=>{await pause(350);await fs.mkdir('/tmp/sidequest-provider-profile',{recursive:true});const result=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/sidequest-provider-profile/'+name+'.png',Buffer.from(result.data,'base64'));};
const makePhoto=`const canvas=document.createElement('canvas');canvas.width=80;canvas.height=60;const blob=await new Promise(resolve=>canvas.toBlob(resolve));const photo=new File([blob],'servico.png',{type:'image/png'});`;
try {
 await send('Runtime.enable');await send('Page.enable');await send('Page.bringToFront');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await viewport(390);
 await navigate('SideQuestPrestador.html');await evaluate(`navigateTo('screen-provider-profile')`);await pause(350);
 await assert(`document.documentElement.dataset.theme==='emerald' && document.querySelector('.provider-greeting').textContent==='Olá, Roberto 👋' && document.getElementById('provider-radius-label').textContent==='Santos • até 10 km'`,'profile preserves emerald and standardized header');
 await assert(`document.getElementById('provider-profile-title').textContent==='Eletricista Residencial e Comercial' && document.querySelector('.provider-verified-seal .fa-circle-check') && document.querySelectorAll('.provider-trust-badges .badge').length===2`,'identity includes title, verified seal and trust badges');
 await assert(`document.querySelector('.provider-profile-metrics').textContent.includes('142') && document.querySelectorAll('.provider-profile-metrics > div').length===3 && document.querySelectorAll('.provider-specialties .badge').length===4`,'three metrics and four specialties are present');
 await assert(`document.querySelectorAll('.provider-review').length===2 && document.querySelector('.provider-review').textContent.includes('troca do chuveiro')`,'recent reviews show requested feedback');
 await assert(`document.querySelectorAll('#portfolio-grid > figure').length===3 && [...document.querySelectorAll('#portfolio-grid img')].every(image=>image.complete&&image.naturalWidth>0&&image.getAttribute('src').startsWith('assets/portfolio/'))`,'portfolio uses three loaded local service photographs');
 await assert(`(()=>{const tops=[...document.querySelectorAll('.provider-profile-metrics dd')].map(node=>node.getBoundingClientRect().top);return Math.max(...tops)-Math.min(...tops)<1;})()`,'metric values share the same baseline even with wrapped labels');
 await screenshot('perfil-mobile');
 await evaluate(`document.querySelector('.provider-portfolio-section').scrollIntoView({block:'start'})`);await screenshot('portfolio-mobile');
 await evaluate(`document.querySelector('.portfolio-photo').click()`);await pause(300);
 await assert(`document.getElementById('modal-portfolio-work').open && document.getElementById('portfolio-work-title').textContent==='Montagem de Quadro Elétrico' && document.getElementById('portfolio-work-image').naturalWidth>0`,'touching work opens matching full photo and title');
 await evaluate(`document.getElementById('modal-portfolio-work').close();openPortfolioUpload()`);await pause(300);await screenshot('upload-mobile');
 await assert(`document.getElementById('portfolio-confirm').disabled && getComputedStyle(document.getElementById('portfolio-file')).position==='absolute' && document.getElementById('portfolio-dropzone').textContent.includes('Toque para selecionar')`,'dropzone replaces native file control and empty form cannot publish');
 await evaluate(`preparePortfolioPhoto([new File(['pdf'],'arquivo.pdf',{type:'application/pdf'})])`);
 await assert(`!document.getElementById('portfolio-error').hidden && document.getElementById('portfolio-error').textContent.includes('10 MB') && document.getElementById('portfolio-confirm').disabled`,'invalid type gives format and size guidance');
 await evaluate(`preparePortfolioPhoto([new File([],'vazio.png',{type:'image/png'})])`);
 await assert(`document.getElementById('portfolio-confirm').disabled && document.getElementById('portfolio-error').textContent.includes('vazios')`,'empty image is rejected');
 await evaluate(`preparePortfolioPhoto([new File([new Uint8Array(10*1024*1024+1)],'grande.png',{type:'image/png'})])`);
 await assert(`document.getElementById('portfolio-confirm').disabled && !document.getElementById('portfolio-error').hidden`,'oversized image is rejected');
 await evaluate(`preparePortfolioPhoto([new File(['not-an-image'],'quebrada.png',{type:'image/png'})])`);await pause(250);
 await assert(`document.getElementById('portfolio-error').textContent.includes('imagem válida') && document.getElementById('portfolio-confirm').disabled`,'corrupt file cannot masquerade as a valid image');
 await evaluate(makePhoto+`const transfer=new DataTransfer();transfer.items.add(photo);transfer.items.add(photo);document.getElementById('portfolio-dropzone').dispatchEvent(new DragEvent('drop',{dataTransfer:transfer,bubbles:true,cancelable:true}));`);
 await assert(`document.getElementById('portfolio-error').textContent.includes('uma foto por vez')`,'multiple dropped files receive explicit single-image restriction');
 await evaluate(makePhoto+`const transfer=new DataTransfer();transfer.items.add(photo);document.getElementById('portfolio-dropzone').dispatchEvent(new DragEvent('drop',{dataTransfer:transfer,bubbles:true,cancelable:true}));`);await pause(300);
 await assert(`!document.getElementById('portfolio-preview').hidden && document.getElementById('portfolio-preview').naturalWidth>0 && document.getElementById('portfolio-confirm').disabled`,'valid drop prepares preview while missing title still blocks publication');
 await evaluate(`confirmPortfolioUpload()`);
 await assert(`document.getElementById('portfolio-title').getAttribute('aria-invalid')==='true' && document.activeElement.id==='portfolio-title'`,'missing title is explained inline with focus');
 const title='Troca de disjuntor geral';
 await evaluate(`document.getElementById('portfolio-title').value=${JSON.stringify(title)};document.getElementById('portfolio-title').dispatchEvent(new Event('input'))`);
 await assert(`!document.getElementById('portfolio-confirm').disabled && document.getElementById('portfolio-title-error').hidden`,'valid title enables publication and clears title error');
 await screenshot('upload-preenchido');
 await evaluate(`document.getElementById('portfolio-form').requestSubmit()`);
 await assert(`document.getElementById('portfolio-grid').children.length===4 && document.querySelector('#portfolio-grid > :last-child .portfolio-caption').textContent===${JSON.stringify(title)} && document.getElementById('portfolio-count').textContent.includes('4 fotos') && !document.getElementById('modal-crop').open`,'publication adds titled photo and updates counter');
 await evaluate(`document.querySelector('#portfolio-grid > :last-child .portfolio-photo').click()`);
 await assert(`document.getElementById('portfolio-work-title').textContent===${JSON.stringify(title)} && document.getElementById('portfolio-work-image').alt===${JSON.stringify(title)}`,'published photo viewer uses same title and image description');
 await evaluate(`document.getElementById('modal-portfolio-work').close();document.querySelector('#portfolio-grid > :last-child .portfolio-remove').click()`);
 await assert(`document.getElementById('portfolio-grid').children.length===3 && document.activeElement.id==='portfolio-add'`,'removing published work updates gallery and restores focus');
 await evaluate(`document.querySelector('#app-feedback .feedback-actions button').click()`);
 await assert(`document.getElementById('portfolio-grid').children.length===4 && document.querySelector('#portfolio-grid > :last-child .portfolio-caption').textContent===${JSON.stringify(title)}`,'undo restores photo and its original title');
 await evaluate(`openPortfolioUpload();`+makePhoto+`preparePortfolioPhoto([photo]);document.getElementById('modal-crop').close()`);await pause(300);
 await assert(`portfolioDraft===null && document.getElementById('portfolio-preview').hidden && document.getElementById('portfolio-grid').children.length===4`,'cancel during decoding cannot publish or revive a stale preview');
 await evaluate(`openPortfolioUpload();`+makePhoto+`preparePortfolioPhoto([photo]);`);await pause(300);
 await evaluate(`document.getElementById('portfolio-title').value='<img src=x onerror=alert(1)>';document.getElementById('portfolio-title').dispatchEvent(new Event('input'));confirmPortfolioUpload()`);
 await assert(`document.querySelector('#portfolio-grid > :last-child .portfolio-caption').textContent==='<img src=x onerror=alert(1)>' && document.querySelectorAll('#portfolio-grid > :last-child img').length===1`,'title is rendered as plain text without executing HTML');
 await evaluate(`document.querySelector('#app-feedback .feedback-actions button').click()`);
 await assert(`document.getElementById('portfolio-grid').children.length===4`,'undo publication removes exactly the added work');
 await evaluate(`while(document.getElementById('portfolio-grid').children.length<12)document.getElementById('portfolio-grid').append(document.querySelector('#portfolio-grid > figure').cloneNode(true));updatePortfolioCount();openPortfolioUpload()`);
 await assert(`!document.getElementById('portfolio-add').disabled && document.getElementById('modal-crop').open && document.getElementById('portfolio-count').textContent.includes('12 fotos')`,'Ouro allows twelve photos and additional uploads without a numeric plan limit');
 await evaluate(`document.getElementById('modal-crop').close();while(document.getElementById('portfolio-grid').children.length>4)document.getElementById('portfolio-grid').lastElementChild.remove();updatePortfolioCount();document.getElementById('app-feedback').hidden=true`);
 for(const [width,height] of [[320,640],[390,844],[768,800],[1280,900]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<640});await evaluate(`navigateTo('screen-provider-profile')`);await pause(250);
  await assert(`(()=>{const screen=document.getElementById('screen-provider-profile');return screen.scrollWidth<=screen.clientWidth+1&&document.getElementById('portfolio-grid').scrollWidth<=screen.clientWidth;})()`,'profile and gallery fit '+width+'px');
  await evaluate(`openPortfolioUpload()`);await pause(300);
  await assert(`(()=>{const box=document.querySelector('#modal-crop > .modal-box'),r=box.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight+1&&box.scrollWidth<=box.clientWidth+1;})()`,'upload sheet fits '+width+'px');
  await evaluate(`document.getElementById('modal-crop').close()`);
 }
 if(errors.length)throw Error(errors.join('\n'));console.log(checks+' provider profile checks passed. No uncaught browser errors.');
} finally {if(errors.length)console.log(errors);ws.close();}
