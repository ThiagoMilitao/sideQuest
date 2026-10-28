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
const screenshot=async name=>{await pause(350);await fs.mkdir('/tmp/sidequest-provider-chat',{recursive:true});const result=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/sidequest-provider-chat/'+name+'.png',Buffer.from(result.data,'base64'));};
try {
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Page.bringToFront');await viewport(390);
 const isolation=await send('Page.addScriptToEvaluateOnNewDocument',{source:"for(const key of Object.keys(localStorage)){if(key.startsWith('sidequest.proposal.v1.'))localStorage.removeItem(key);}"});
 await navigate('SideQuestPrestador.html');await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:isolation.identifier});
 await evaluate(`document.querySelector('#nav-container [aria-label="Mensagens"]').click()`);
 await assert(`!document.getElementById('screen-provider-messages').classList.contains('hidden') && document.querySelectorAll('.provider-conversation-open').length===2`, 'Mensagens opens conversation list instead of individual chat');
 await assert(`document.getElementById('provider-messages-unread').textContent==='1 não lida' && !document.getElementById('provider-messages-unread').hidden`, 'unread count starts at one');
 await assert(`document.querySelector('[data-client=mariana]').textContent.includes('Mariana Silva') && document.querySelector('[data-client=mariana]').textContent.includes('Aguardando aprovação') && document.querySelector('[data-client=mariana] time').textContent`, 'Mariana row contains identity, proposal status, preview and time');
 await screenshot('mensagens-mobile');
 await evaluate(`document.querySelector('[data-client=mariana]').click()`);
 await assert(`!document.querySelector('#screen-client-chat select') && !document.getElementById('provider-conversation')`, 'chat has no conversation dropdown');
 await assert(`document.getElementById('chat-interlocutor-name').textContent==='Mariana Silva' && document.getElementById('chat-interlocutor-location').textContent==='Gonzaga, Santos' && document.querySelector('.provider-chat-online').textContent.includes('Online agora')`, 'chat header shows client, neighborhood and demo presence');
 await assert(`document.getElementById('provider-chat-profile').tabIndex===0 && clients.mariana.unread===0 && document.querySelector('#nav-container [aria-current=page]').getAttribute('aria-label')==='Mensagens'`, 'opening conversation marks read and keeps Messages selected');
 await assert(`document.querySelector('[data-proposal-field=total]').textContent.includes('150,00') && document.querySelectorAll('.proposal-scope li').length===3 && document.querySelector('.proposal-actions button').textContent==='Editar proposta'`, 'shared proposal shows complete fields and provider edit action');
 await evaluate(`document.getElementById('chat-input-field').value='Rascunho Mariana';document.getElementById('chat-input-field').dispatchEvent(new Event('input'));showChatList()`);
 await assert(`document.querySelector('[data-client=mariana]').textContent.includes('Rascunho: Rascunho Mariana') && document.activeElement.dataset.client==='mariana'`, 'close returns to list, restores focus and shows draft preview');
 await assert(`document.getElementById('provider-messages-unread').hidden`, 'reading the conversation clears total unread badge');
 await evaluate(`openProviderChat('carlos')`);
 await assert(`document.getElementById('chat-input-field').value==='' && document.getElementById('chat-interlocutor-initials').textContent==='CE' && !document.getElementById('chat-interlocutor-initials').hidden`, 'Carlos has an isolated draft and initials fallback');
 await evaluate(`document.getElementById('chat-input-field').value='Mensagem para Carlos';sendChatMessage();showChatList();openProviderChat('mariana')`);
 await assert(`document.getElementById('chat-input-field').value==='Rascunho Mariana' && !document.getElementById('chat-messages-container').textContent.includes('Mensagem para Carlos')`, 'messages and drafts remain separate per client');
 await evaluate(`document.getElementById('chat-input-field').value='Podemos combinar o horário.';document.getElementById('chat-input-field').dispatchEvent(new Event('input'));document.querySelector('.provider-chat-composer').requestSubmit()`);
 await assert(`document.getElementById('chat-messages-container').lastElementChild.textContent.includes('Podemos combinar') && document.getElementById('provider-chat-send').disabled`, 'sent message follows proposal in timeline and clears composer');
 await evaluate(`document.getElementById('provider-chat-profile').click()`);await pause(300);
 await assert(`document.getElementById('modal-client-details').open && document.getElementById('client-details-name').textContent==='Mariana Silva' && document.getElementById('client-details-request').textContent===SideQuestProposals.requestFor('mariana').summary`, 'identity opens client details with matching request');
 await screenshot('cliente-detalhes');
 await evaluate(`document.getElementById('client-details-budget').click()`);await pause(300);
 await assert(`!document.getElementById('modal-client-details').open && document.getElementById('modal-budget').open && document.getElementById('budget-client-name').textContent==='Mariana Silva'`, 'client details shortcut opens correct proposal');
 await evaluate(`closeBudgetModal()`);
 for(const [width,height] of [[320,640],[390,844],[768,800],[1280,900],[390,360]]){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<640});
  await evaluate(`showChatList()`);await pause(100);
  await assert(`document.querySelector('#screen-provider-messages').scrollWidth<=document.querySelector('#screen-provider-messages').clientWidth+1`, 'conversation list fits '+width+'x'+height);
  await evaluate(`openProviderChat('mariana')`);await pause(350);
  await assert(`(()=>{const composer=document.querySelector('.provider-chat-composer').getBoundingClientRect(),nav=document.querySelector('.app-navigation').getBoundingClientRect(),thread=document.getElementById('chat-messages-container'),header=document.querySelector('.provider-chat-header').getBoundingClientRect();return composer.bottom<=nav.top+1&&composer.top>=header.bottom&&composer.left>=0&&composer.right<=innerWidth&&nav.bottom<=innerHeight+1&&thread.clientHeight>0&&thread.scrollWidth<=thread.clientWidth+1;})()`, 'composer stays above navigation with scrollable thread at '+width+'x'+height);
  if(width===390&&height===844)await screenshot('chat-mobile');
 }
 await evaluate(`showChatList();await SideQuestProposals.respond('mariana','accepted',SideQuestProposals.current('mariana').revision)`);
 await assert(`document.querySelector('[data-client=mariana]').textContent.includes('Orçamento aceito')`, 'list reflects proposal approval status');
 await assert(`clients.mariana.unread===1 && !document.getElementById('provider-messages-unread').hidden`, 'customer response updates unread count while list is open');
 await evaluate(`openProviderChat('mariana');showChatList()`);
 await assert(`clients.mariana.unread===0 && document.getElementById('provider-messages-unread').hidden`, 'reading customer response clears unread count');
 if(errors.length)throw Error(errors.join('\n'));
 console.log(checks+' provider chat checks passed. No uncaught browser errors.');
} finally {if(errors.length)console.log(errors);ws.close();}
