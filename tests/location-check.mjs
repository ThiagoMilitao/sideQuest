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
const screenshot=async name=>{await pause(350);await fs.mkdir('/tmp/sidequest-location',{recursive:true});const result=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/sidequest-location/'+name+'.png',Buffer.from(result.data,'base64'));};
// Geolocation and lookup responses are controlled fixtures; tests never send
// device coordinates or user addresses to the public geocoding providers.
try {
 await send('Runtime.enable');await send('Page.enable');await send('Page.bringToFront');await viewport(390);
 await navigate('SideQuestPrototipo.html');
 await evaluate(`completeDemoAuth('Google');document.getElementById('app-feedback').hidden=true;document.querySelector('.location-button').click()`);
 await assert(`document.getElementById('modal-location').open && !document.getElementById('location-select')`, 'pílula abre busca de endereço sem seletor estático de bairros');
 await assert(`document.querySelectorAll('#location-saved-list button').length===2 && document.getElementById('location-saved-list').textContent.includes('Praça Mauá, 20 - Centro, Santos / SP')`, 'endereços Casa e Trabalho correspondem à referência');
 await assert(`document.querySelector('[data-location-id="1"]').getAttribute('aria-pressed')==='true'`, 'endereço atual tem indicação de ativo');
 await screenshot('modal-enderecos');
 await evaluate(`document.querySelector('[data-location-id="2"]').click()`);
 await assert(`document.getElementById('current-location').textContent==='Centro, Santos' && !document.getElementById('modal-location').open && document.getElementById('os-address').value.includes('Praça Mauá, 20')`, 'selecionar Trabalho atualiza pílula, formulário e fecha modal');
 await evaluate(`document.getElementById('form-create-os').reset()`);
 await assert(`document.getElementById('os-address').value.includes('Praça Mauá, 20')`, 'endereço escolhido permanece após resetar formulário');
 await evaluate(`SideQuestLocation.open();document.getElementById('location-search').value='ana costa';document.getElementById('location-search').dispatchEvent(new Event('input'))`);
 await assert(`document.querySelectorAll('#location-results button').length===1`, 'busca local sugere endereços salvos enquanto digita');
 await evaluate(`document.querySelector('#location-results button').click()`);
 await assert(`document.getElementById('current-location').textContent==='Gonzaga, Santos'`, 'sugestão local pode ser selecionada');
 await evaluate(`window.lookupTest={calls:[],mode:'normal',pending:[]};window.fetch=(url,options={})=>{
   lookupTest.calls.push(String(url));
   const response=data=>({ok:true,json:async()=>data});
   if(lookupTest.mode==='offline')return Promise.reject(new TypeError('Network unavailable'));
   if(lookupTest.mode==='pending')return new Promise(resolve=>lookupTest.pending.push(()=>resolve(response([{address:{road:'Rua Antiga',suburb:'Anterior',city:'Santos'},display_name:'Rua Antiga'}]))));
   const parsed=new URL(url);
   if(parsed.hostname==='viacep.com.br')return Promise.resolve(response(parsed.pathname.includes('99999999')?{erro:true}:{logradouro:'Praça da Sé',bairro:'Sé',localidade:'São Paulo',uf:'SP',cep:'01001-000'}));
   const address={road:'Avenida Ana Costa',house_number:'150',suburb:'Gonzaga',city:'Santos','ISO3166-2-lvl4':'BR-SP'};
   return Promise.resolve(response(parsed.pathname.includes('reverse')?{address,display_name:'Endereço GPS de teste'}:[{address,display_name:'Endereço de teste'}]));
 };`);
 await evaluate(`SideQuestLocation.open();document.getElementById('location-search').value='12345';await SideQuestLocation.search()`);
 await assert(`document.getElementById('location-search').getAttribute('aria-invalid')==='true' && lookupTest.calls.length===0`, 'CEP incompleto é rejeitado antes de consultar serviço');
 await evaluate(`document.getElementById('location-search').value='01001-000';document.getElementById('location-search').dispatchEvent(new Event('input'));await SideQuestLocation.search()`);
 await assert(`lookupTest.calls[0].includes('/01001000/json/') && document.getElementById('location-results').textContent.includes('Praça da Sé')`, 'consulta de CEP válido gera sugestão com rua e cidade');
 await evaluate(`await SideQuestLocation.search()`);
 await assert(`lookupTest.calls.length===1`, 'consulta repetida reutiliza cache local');
 await screenshot('busca-cep');
 await evaluate(`document.querySelector('#location-results button').click();SideQuestLocation.open()`);
 await assert(`document.getElementById('current-location').textContent==='Sé, São Paulo' && !document.getElementById('location-recent-section').hidden`, 'endereço encontrado entra nos recentes e atualiza pílula');
 await evaluate(`document.getElementById('location-search').value='Avenida Ana Costa, Santos';document.getElementById('location-search').dispatchEvent(new Event('input'))`);
 await assert(`lookupTest.calls.length===1`, 'digitar rua não dispara consultas externas automáticas');
 await evaluate(`await SideQuestLocation.search()`);
 await assert(`lookupTest.calls.length===2 && lookupTest.calls[1].includes('search?') && document.querySelectorAll('#location-results button').length===1`, 'consulta explícita de rua retorna sugestões');
 await evaluate(`document.getElementById('location-search').value='99999999';await SideQuestLocation.search()`);
 await assert(`document.getElementById('location-status').textContent.includes('Nenhum endereço encontrado') && !document.getElementById('location-search-submit').disabled`, 'CEP inexistente mostra recuperação e libera nova busca');
 await evaluate(`lookupTest.mode='offline';document.getElementById('location-search').value='Rua sem rede, Santos';document.getElementById('location-search').dispatchEvent(new Event('input'));await SideQuestLocation.search()`);
 await assert(`!document.getElementById('location-error').hidden && !document.getElementById('location-manual').hidden && document.getElementById('modal-location').open`, 'falha de conexão mantém modal e permite preenchimento manual');
 await evaluate(`document.getElementById('location-manual').click()`);
 await assert(`document.getElementById('os-address').value==='Rua sem rede, Santos' && !document.getElementById('modal-location').open`, 'endereço digitado pode ser confirmado sem conexão');
 await evaluate(`lookupTest.mode='normal';SideQuestLocation.open();Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition(success,failure,options){window.gpsTest={success,failure,options};}}});useCurrentGPS()`);
 await assert(`document.getElementById('location-gps').disabled && document.getElementById('location-gps').getAttribute('aria-busy')==='true' && gpsTest.options.timeout===10000`, 'GPS informa processamento e previne repetição');
 await evaluate(`gpsTest.failure({code:1})`);
 await assert(`document.getElementById('location-error').textContent.includes('não permitido') && !document.getElementById('location-gps').disabled && document.getElementById('modal-location').open`, 'GPS negado explica alternativa e mantém controle');
 await screenshot('gps-negado');
 await evaluate(`useCurrentGPS();gpsTest.failure({code:3})`);
 await assert(`document.getElementById('location-error').textContent.includes('demorou')`, 'timeout do GPS orienta tentar novamente ou usar endereço salvo');
 await evaluate(`useCurrentGPS();await gpsTest.success({coords:{latitude:-23.96,longitude:-46.33,accuracy:22}})`);
 await assert(`!document.getElementById('modal-location').open && document.getElementById('current-location').textContent==='Gonzaga, Santos' && requestCoordinates.latitude===-23.96 && document.getElementById('os-address').value.includes('Avenida Ana Costa')`, 'GPS com geocodificação atualiza endereço, coordenadas e pílula');
 await evaluate(`lookupTest.mode='offline';SideQuestLocation.open();useCurrentGPS();await gpsTest.success({coords:{latitude:-23.961,longitude:-46.331,accuracy:60}})`);
 await assert(`document.getElementById('current-location').textContent==='Localização atual' && document.getElementById('os-address').value==='' && requestCoordinates.latitude===-23.961 && !document.getElementById('request-location-status').hidden`, 'GPS sem rua mantém coordenadas e exige informar endereço sem reutilizar local anterior');
 await evaluate(`SideQuestLocation.open();useCurrentGPS();window.oldGpsCallback=gpsTest.success;document.querySelector('[data-location-id="2"]').click();await oldGpsCallback({coords:{latitude:-24,longitude:-46,accuracy:15}})`);
 await assert(`document.getElementById('current-location').textContent==='Centro, Santos' && requestCoordinates===null`, 'GPS atrasado não sobrescreve endereço salvo selecionado');
 await evaluate(`SideQuestLocation.open();useCurrentGPS();window.closedGpsCallback=gpsTest.success;document.getElementById('modal-location').close();await closedGpsCallback({coords:{latitude:-22,longitude:-45,accuracy:10}})`);
 await assert(`!document.getElementById('modal-location').open && document.getElementById('current-location').textContent==='Centro, Santos'`, 'fechar modal invalida callback pendente de GPS');
 await evaluate(`lookupTest.mode='pending';SideQuestLocation.open();document.getElementById('location-search').value='Rua antiga, Santos';window.pendingLookup=SideQuestLocation.search();void 0`);await pause(1200);
 await evaluate(`document.getElementById('location-search').value='Casa';document.getElementById('location-search').dispatchEvent(new Event('input'));lookupTest.pending.forEach(resolve=>resolve());await pendingLookup`);
 await assert(`document.querySelectorAll('#location-results button').length===1 && !document.getElementById('location-results').textContent.includes('Rua Antiga')`, 'resposta antiga não substitui busca local mais recente');
 await evaluate(`lookupTest.mode='normal';clientAccount.addresses.push({id:99,label:'Estúdio',address:'Rua do Estúdio, 20 - Santos / SP',location:'Santos'});document.getElementById('modal-location').close();SideQuestLocation.open()`);
 await assert(`document.querySelector('#location-saved-list [data-location-id="99"]')`, 'seletor compartilha os endereços da conta');
 await evaluate(`document.getElementById('modal-location').close();useAccountAddress(99)`);
 await assert(`document.getElementById('current-location').textContent==='Santos' && document.getElementById('os-address').value.includes('Estúdio')`, 'seleção pelo painel da conta usa o mesmo estado');
 for(const width of [320,390,768]) {
   await viewport(width);await evaluate(`SideQuestLocation.open()`);await pause(300);
   await assert(`document.querySelector('.location-panel').scrollWidth<=document.querySelector('.location-panel').clientWidth && document.querySelector('.location-panel').getBoundingClientRect().height<=innerHeight && document.documentElement.scrollWidth<=innerWidth`, 'modal responsivo e sem rolagem horizontal em '+width+'px');
   await evaluate(`document.getElementById('modal-location').close()`);await pause(50);
 }
 await viewport(390);await evaluate(`SideQuestLocation.open()`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 await assert(`document.getElementById('modal-location').contains(document.activeElement)`, 'teclado permanece dentro do modal nativo');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});await pause(100);
 await assert(`!document.getElementById('modal-location').open`, 'Escape fecha seletor de localização');
 if(errors.length) throw Error(errors.join('\n'));
 console.log(`${checks} location checks passed. No uncaught browser errors. GPS and service responses simulated. Screenshots: /tmp/sidequest-location`);
} finally {ws.close();}
