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
const evaluate=async expression=>{const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw Error(response.exceptionDetails.exception?.description);return response.result.value;};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=async(expression,label)=>{if(!await evaluate(expression))throw Error('FAIL: '+label);checks++;console.log('PASS: '+label);};
const viewport=async width=>send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<640});
const navigate=async file=>{await send('Page.navigate',{url:base+'/'+file});await pause(1800);};
const screenshot=async name=>{await pause(350);await fs.mkdir('/tmp/sidequest-categories',{recursive:true});const result=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/sidequest-categories/'+name+'.png',Buffer.from(result.data,'base64'));};
try {
 await send('Runtime.enable');await send('Page.enable');await send('Page.bringToFront');await viewport(390);
 await navigate('SideQuestPrototipo.html');
 await evaluate(`completeDemoAuth('Google');document.getElementById('app-feedback').hidden=true`);await pause(400);
 await assert(`document.querySelectorAll('#category-grid > button').length===8 && document.getElementById('categories-title').textContent==='Categorias'`, 'Home mostra exatamente oito categorias');
 await assert(`!document.querySelector('#category-grid [data-category-id=Mecanica]') && document.querySelector('#category-grid [data-category-id=Reparos]') && document.querySelector('#category-grid [data-category-id=Climatizacao]')`, 'Home prioriza reparos e ar-condicionado; mecânica fica na exploração');
 await assert(`document.getElementById('screen-client-home').firstElementChild.id==='search-form' && document.getElementById('promo-title').textContent==='15% OFF no seu próximo reparo'`, 'busca e banner de 15% preservados');
 await screenshot('home-categorias');
 await evaluate(`document.getElementById('all-categories-trigger').focus();document.getElementById('all-categories-trigger').click()`);
 await assert(`document.getElementById('modal-all-categories').open && document.documentElement.dataset.theme==='emerald'`, 'gatilho abre modal com tema emerald');
 await assert(`document.querySelectorAll('.all-categories-group').length===4 && document.querySelectorAll('.all-category-card').length===19`, 'catálogo contém 19 opções nos quatro grupos solicitados');
 await assert(`document.querySelector('[data-category-id=Eletrica] .category-count').textContent==='1 profissional' && document.querySelector('.all-category-card[data-category-id=Informatica] .all-category-count').textContent==='0 profissionais'`, 'contadores refletem os profissionais locais');
 await assert(`getComputedStyle(document.querySelector('.all-category-card')).outlineStyle==='none'`, 'cards não mostram contorno de foco quando não estão focados');
 await screenshot('todas-categorias');
 await evaluate(`document.getElementById('all-categories-search').value='eletrica';document.getElementById('all-categories-search').dispatchEvent(new Event('input'))`);
 await assert(`document.querySelectorAll('.all-category-card').length===1 && document.querySelector('.all-category-card').dataset.categoryId==='Eletrica'`, 'busca ignora acentos e oculta grupos sem correspondência');
 await evaluate(`document.getElementById('all-categories-search').value='wifi';renderAllCategories()`);
 await assert(`document.querySelectorAll('.all-category-card').length===1 && document.querySelector('.all-category-card').dataset.categoryId==='Informatica'`, 'busca reconhece Wi-Fi também sem hífen');
 await evaluate(`document.getElementById('all-categories-search').value='ar condicionado';renderAllCategories()`);
 await assert(`document.querySelectorAll('.all-category-card').length===1 && document.querySelector('.all-category-card').dataset.categoryId==='Climatizacao'`, 'busca por várias palavras reconhece ar-condicionado');
 await evaluate(`document.getElementById('all-categories-search').value='zzz-inexistente';renderAllCategories()`);
 await assert(`!document.getElementById('all-categories-empty').hidden && document.querySelectorAll('.all-category-card').length===0`, 'busca vazia oferece recuperação');
 await screenshot('busca-sem-categoria');
 await evaluate(`clearCategorySearch()`);
 await assert(`document.querySelectorAll('.all-category-card').length===19 && document.activeElement.id==='all-categories-search'`, 'limpar busca restaura catálogo e foco');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 await assert(`document.activeElement.classList.contains('all-category-card') && getComputedStyle(document.activeElement).outlineStyle==='solid'`, 'teclado alcança os cards com foco visível');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await pause(150);
 await assert(`!document.getElementById('modal-all-categories').open && document.activeElement.id==='all-categories-trigger'`, 'Escape retorna à Home e restaura foco no gatilho');
 await evaluate(`openAllCategories();selectCatalogCategory('Eletrica')`);
 await assert(`!document.getElementById('modal-all-categories').open && !document.getElementById('screen-client-pro-list').classList.contains('hidden') && document.querySelectorAll('#pro-list-container .professional-card').length===1`, 'seleção filtra profissionais da categoria correta');
 await evaluate(`openAllCategories();selectCatalogCategory('Climatizacao')`);
 await assert(`document.querySelectorAll('#pro-list-container .professional-card').length===0 && document.querySelector('#pro-list-container .empty-state')`, 'ar-condicionado não inclui marcenaria');
 await evaluate(`openAllCategories();selectCatalogCategory('Informatica');document.getElementById('category-request-action').click()`);
 await assert(`document.getElementById('os-category').value==='Informatica' && document.getElementById('request-category-name').textContent==='Informática & Wi-Fi'`, 'solicitação recebe a categoria selecionada, mesmo sem profissionais');
 await evaluate(`document.getElementById('os-desc').value='Configurar o roteador e a rede Wi-Fi';document.getElementById('form-create-os').requestSubmit()`);
 await assert(`orders[0].category==='Informatica' && orders[0].description==='Configurar o roteador e a rede Wi-Fi'`, 'nova categoria é validada e publicada no pedido');
 await evaluate(`requestService('roberto');document.getElementById('os-desc').value='Preservar rascunho';openRequestCategories()`);
 await assert(`document.querySelectorAll('#request-category-options button').length===19`, 'formulário usa o mesmo catálogo completo');
 await evaluate(`openAllCategories('request');selectCatalogCategory('Montagem')`);await pause(50);
 await assert(`document.getElementById('os-category').value==='Montagem' && requestedProfessionalId===null && document.getElementById('os-desc').value==='Preservar rascunho' && document.activeElement.id==='category-trigger'`, 'seleção pelo formulário preserva rascunho e remove profissional incompatível');
 await evaluate(`openAllCategories('request');closeAllCategories()`);await pause(50);
 await assert(`document.getElementById('os-category').value==='Montagem' && document.activeElement.id==='category-trigger'`, 'voltar cancela exploração sem mudar categoria');
 for(const width of [320,390,768,1280]) {
   await viewport(width);await evaluate(`openAllCategories()`);await pause(300);
   await assert(`document.getElementById('all-categories-scroll').scrollWidth<=document.getElementById('all-categories-scroll').clientWidth && document.querySelector('.all-categories-panel').getBoundingClientRect().width<=innerWidth`, 'catálogo sem rolagem horizontal em '+width+'px');
   await evaluate(`closeAllCategories()`);await pause(300);
 }
 await viewport(1280);await evaluate(`openAllCategories()`);await screenshot('todas-categorias-desktop');
 if(errors.length)throw Error(errors.join('\n'));
 console.log(`${checks} category checks passed. No uncaught browser errors. Screenshots: /tmp/sidequest-categories`);
} finally {ws.close();}
