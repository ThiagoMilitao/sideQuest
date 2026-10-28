// Real provider/client documents sharing the same browser origin, without mocks.
import fs from 'node:fs/promises';
const base=process.env.SIDEQUEST_URL||'http://127.0.0.1:8765';
const pages=[];const errors=[];let checks=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function page(file,clear=false) {
  const target=await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'}).then(response=>response.json());
  const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
  let sequence=0;const pending=new Map();
  ws.onmessage=({data})=>{const msg=JSON.parse(data);if(msg.id){const request=pending.get(msg.id);pending.delete(msg.id);msg.error?request.reject(msg.error):request.resolve(msg.result);}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description||msg.params.exceptionDetails.text);};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const value=async expression=>{const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(data.exceptionDetails)throw Error(data.exceptionDetails.exception?.description);return data.result.value;};
  const result={send,value,run:body=>value('(async()=>{'+body+'})()'),ws};pages.push(result);
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
  let preload;
  if(clear)preload=await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.removeItem('sidequest.subscription.v1.roberto');for(const key of Object.keys(localStorage)){if(key.startsWith('sidequest.proposal.v1.'))localStorage.removeItem(key);}"});
  await send('Page.navigate',{url:base+'/'+file});await sleep(2200);
  if(preload)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:preload.identifier});
  return result;
}
const assert=(condition,label)=>{if(!condition)throw Error('FAIL: '+label);checks++;console.log('PASS: '+label);};
async function poll(page,expression) {for(let i=0;i<100;i++){if(await page.value(expression))return;await sleep(75);}throw Error('Timeout: '+expression);}
async function fill(page,data) {await page.run(`for(const [id,value] of Object.entries(${JSON.stringify(data)})){const field=document.getElementById(id);field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));}`);}
async function shot(page,name) {await sleep(300);await fs.mkdir('/tmp/sidequest-plans',{recursive:true});const data=await page.send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/sidequest-plans/'+name+'.png',Buffer.from(data.data,'base64'));}
const snapshot=page=>page.value(`(()=>{const card=document.querySelector('.proposal-card');return Object.fromEntries(['summary','total','schedule','duration','scope'].map(key=>[key,card.querySelector('[data-proposal-field='+key+']').textContent]));})()`);
try {
 const client=await page('SideQuestPrototipo.html',true);await client.run(`completeDemoAuth('Google')`);
 const provider=await page('SideQuestPrestador.html');
 assert(await provider.value(`SideQuestPlans.current().id==='gold' && document.getElementById('provider-plan-badge').textContent==='Pro Ouro'`),'Ouro is the single initial active plan');
 await provider.run(`document.getElementById('provider-account-dropdown').open=true;document.getElementById('provider-plans-trigger').click()`);await sleep(300);
 assert(await provider.value(`document.getElementById('modal-provider-plans').open&&!document.getElementById('provider-account-dropdown').open&&document.getElementById('plans-current-until').textContent.includes('15/11/2026')`),'dropdown opens subscription sheet with active-until date');
 assert(await provider.value(`document.querySelectorAll('.plan-card').length===3&&document.querySelector('[data-choose-plan=gold]').textContent.includes('Plano Ativo')&&document.querySelector('[data-choose-plan=basic]').textContent==='Mudar para Básico'`),'comparison has three plans without contradictory current-plan labels');
 assert(await provider.value(`document.querySelectorAll('.plan-price')[1].textContent.includes('29,90')&&document.querySelectorAll('.plan-price')[2].textContent.includes('49,90')`),'subscription prices match the requested monthly amounts');
 await shot(provider,'planos-mobile');
 assert(await client.value(`document.querySelector('#featured-professionals > article:first-child').getAttribute('aria-label').startsWith('Roberto')&&document.querySelectorAll('#featured-professionals .direct-contact-actions').length===1`),'Ouro places Roberto first in eligible featured results with contact buttons');
 await client.run(`contactRoberto('whatsapp')`);
 assert(await client.value(`document.getElementById('app-feedback').textContent.includes('ainda não cadastrou')&&SideQuestPlans.contactURL('whatsapp')===''`),'missing public number gives chat fallback instead of invented WhatsApp recipient');
 await provider.run(`SideQuestPlanUI.choose('silver');document.getElementById('modal-plan-change').close()`);await sleep(100);
 assert(await provider.value(`SideQuestPlans.current().id==='gold'`),'canceling plan review leaves subscription unchanged');
 await provider.run(`SideQuestPlanUI.choose('silver');SideQuestPlanUI.confirm()`);await sleep(100);await poll(client,`SideQuestPlans.current().id==='silver'`);
 assert(await provider.value(`portfolioLimit()===10&&document.getElementById('provider-radius-range').max==='20'&&document.getElementById('provider-pro-verified').hidden`),'Prata applies ten-photo, twenty-kilometer and badge rules');
 assert(await client.value(`![...document.querySelectorAll('#featured-professionals article')].some(card=>card.getAttribute('aria-label').startsWith('Roberto'))`),'Prata removes paid home highlight while preserving simple search eligibility');
 await client.run(`selectCategory('Todos os profissionais','Todos')`);
 assert(await client.value(`document.getElementById('pro-list-container').textContent.includes('Roberto Alves')&&!document.querySelector('#pro-list-container .direct-contact-actions')`),'Prata remains in normal search without premium contact actions');
 await provider.run(`document.getElementById('modal-provider-plans').close();openProviderPanel('radius');document.getElementById('provider-radius-range').value='20';document.getElementById('provider-radius-form').requestSubmit();openPlansModal();SideQuestPlanUI.choose('basic');SideQuestPlanUI.confirm()`);await sleep(100);
 assert(await provider.value(`SideQuestPlans.current().id==='basic'&&portfolioLimit()===3&&document.getElementById('provider-radius-label').textContent.includes('até 10 km')&&document.getElementById('provider-radius-range').max==='10'`),'downgrade applies Basic photo cap and clamps area to regional ten kilometers');
 assert(await provider.value(`document.querySelector('[data-choose-plan=basic]').disabled&&document.querySelector('[data-choose-plan=basic]').textContent==='Plano Atual (Básico)'&&document.getElementById('plans-analytics').hidden`),'Basic current state and gated analytics are consistent');
 await provider.run(`document.getElementById('modal-provider-plans').close();openPortfolioUpload()`);
 assert(await provider.value(`document.getElementById('modal-provider-plans').open&&!document.getElementById('modal-crop').open&&document.getElementById('portfolio-grid').children.length===3`),'Basic cap routes to plans without deleting existing portfolio');
 await provider.run(`SideQuestPlanUI.choose('gold');SideQuestPlanUI.confirm()`);await sleep(100);
 await provider.run(`document.getElementById('modal-provider-plans').close();while(document.getElementById('portfolio-grid').children.length<13)document.getElementById('portfolio-grid').append(document.querySelector('#portfolio-grid > figure').cloneNode(true));updatePortfolioCount();openPortfolioUpload()`);
 assert(await provider.value(`portfolioLimit()===Infinity&&document.getElementById('modal-crop').open&&document.getElementById('portfolio-count').textContent.includes('13 fotos')`),'Ouro removes the obsolete twelve-photo ceiling');
 await provider.run(`document.getElementById('portfolio-title').value='Rascunho preservado';const canvas=document.createElement('canvas');canvas.width=40;canvas.height=40;const blob=await new Promise(resolve=>canvas.toBlob(resolve));preparePortfolioPhoto([new File([blob],'trabalho.png',{type:'image/png'})]);`);await sleep(300);
 await client.run(`SideQuestPlans.update({plan:'silver'},SideQuestPlans.read().revision)`);await poll(provider,`SideQuestPlans.current().id==='silver'`);
 assert(await provider.value(`document.getElementById('modal-crop').open&&!document.getElementById('portfolio-preview').hidden&&document.getElementById('portfolio-title').value==='Rascunho preservado'&&document.getElementById('portfolio-confirm').disabled&&!document.getElementById('portfolio-error').hidden`),'plan change in another tab blocks publication without losing prepared photo or title');
 await provider.run(`document.getElementById('modal-crop').close();openPlansModal()`);
 assert(await provider.value(`document.getElementById('portfolio-grid').children.length===13&&document.getElementById('portfolio-count').textContent.includes('preservadas')`),'downgrade preserves over-limit works while blocking additional publication');
 await provider.run(`SideQuestPlanUI.choose('gold');SideQuestPlanUI.confirm()`);await sleep(100);
 await provider.run(`SideQuestPlanUI.manage();document.getElementById('plans-public-phone').value='invalido';document.getElementById('plans-contact-form').requestSubmit()`);
 assert(await provider.value(`!document.getElementById('plans-error').hidden`),'invalid public phone has useful inline validation');
 await provider.run(`document.getElementById('plans-public-phone').value='(13) 99999-0000';document.getElementById('plans-contact-form').requestSubmit()`);await poll(client,`SideQuestPlans.read().phone==='5513999990000'`);
 assert(await client.value(`SideQuestPlans.contactURL('whatsapp')==='https://wa.me/5513999990000'&&SideQuestPlans.contactURL('phone')==='tel:+5513999990000'`),'explicit public contact configures direct URLs across the two profiles without making calls');
 await provider.run(`document.getElementById('plans-description').value='Instalações elétricas com atendimento agendado.';document.getElementById('plans-description-form').requestSubmit()`);await poll(client,`SideQuestPlans.read().bio.includes('agendado')`);
 assert(await provider.value(`document.getElementById('provider-profile-bio').textContent==='Instalações elétricas com atendimento agendado.'`),'paid customized description updates profile');
 await provider.run(`SideQuestPlanUI.toggleRenewal()`);await sleep(100);
 assert(await provider.value(`!SideQuestPlans.read().renew&&SideQuestPlans.current().id==='gold'&&document.getElementById('plans-renewal-status').textContent.includes('15/11/2026')`),'cancel renewal preserves active benefits through displayed term');
 await provider.run(`SideQuestPlanUI.toggleRenewal()`);
 assert(await provider.value(`SideQuestPlans.read().renew`),'renewal cancellation is reversible');
 await provider.run(`SideQuestPlanUI.choose('silver')`);
 await client.run(`SideQuestPlans.update({plan:'basic',renew:false},SideQuestPlans.read().revision)`);await poll(provider,`SideQuestPlans.current().id==='basic'`);
 await provider.run(`SideQuestPlanUI.confirm()`);
 assert(await provider.value(`!document.getElementById('plan-change-error').hidden&&SideQuestPlans.current().id==='basic'`),'stale review cannot overwrite a change made in another tab');
 await provider.run(`document.getElementById('modal-plan-change').close()`);await sleep(100);
 await provider.run(`SideQuestPlanUI.choose('gold');SideQuestPlanUI.confirm()`);await sleep(100);
 await provider.run(`SideQuestPlanUI.choose('silver');window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='sidequest.subscription.v1.roberto')throw new Error('blocked');return originalSetItem.call(this,key,value)};SideQuestPlanUI.confirm();Storage.prototype.setItem=originalSetItem`);
 assert(await provider.value(`SideQuestPlans.current().id==='gold'&&!document.getElementById('plan-change-error').hidden&&document.getElementById('modal-plan-change').open`),'storage failure keeps active plan and review without false success');
 await provider.run(`document.getElementById('modal-plan-change').close();document.getElementById('modal-provider-plans').close();navigateTo('screen-provider-dashboard')`);
 assert(await provider.value(`!document.getElementById('modal-finance-withdraw')&&!document.getElementById('modal-provider-pix')&&SideQuestFinance.totals().total===285000`),'service management has no wallet or bank controls');
 assert(await provider.value(`!/(custódia|saque|Taxa App|saldo disponível)/i.test(document.getElementById('screen-provider-dashboard').textContent)&&document.querySelector('[data-transaction-id=service-0]').textContent.includes('150,00')`),'service amounts are commission-free and not represented as bank balances');
 await provider.run(`openProviderChat('mariana')`);
 assert(await provider.value(`document.querySelector('.proposal-card .direct-payment-note').textContent.includes('não cobra taxa')`),'provider proposal explains direct client payment');
 assert(await client.value(`![...document.querySelectorAll('#account-dropdown button')].some(button=>button.textContent.includes('Métodos de pagamento'))`),'client account no longer presents in-app payment methods');
 const csv=await provider.value(`SideQuestFinance.buildCSV()`);
 assert(!/saque|custódia|Taxa App|Bruto \(R\$\)|Líquido/i.test(csv)&&csv.includes('Valor combinado')&&csv.includes('Mariana Silva'),'CSV reports service agreements without platform payment entries');
 await provider.send('Page.reload',{ignoreCache:true});await sleep(1800);
 assert(await provider.value(`SideQuestPlans.current().id==='gold'&&SideQuestPlans.read().phone==='5513999990000'`),'reload preserves chosen subscription and explicit public contact');
 for(const [width,height] of [[320,640],[390,844],[768,800],[1280,900]]){
  await provider.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<640});await provider.run(`openPlansModal()`);await sleep(300);
  assert(await provider.value(`(()=>{const box=document.querySelector('#modal-provider-plans > .modal-box'),r=box.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight+1&&box.scrollWidth<=box.clientWidth+1;})()`),'plans fit '+width+'px');
  if(width===1280){await shot(provider,'planos-desktop');assert(await provider.value(`getComputedStyle(document.getElementById('plans-comparison')).gridTemplateColumns.split(' ').length===3`),'desktop comparison renders three columns');}
  await provider.run(`document.getElementById('modal-provider-plans').close()`);
 }
 await provider.run(`SideQuestPlans.update({plan:'gold',renew:true,phone:'',bio:''},SideQuestPlans.read().revision)`);
 if(errors.length)throw Error(errors.join('\n'));console.log(checks+' subscription and direct-service checks passed. No uncaught browser errors.');
}finally{for(const page of pages)page.ws.close();}
