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
const screenshot=async name=>{await pause(350);await fs.mkdir('/tmp/sidequest-review',{recursive:true});const result=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/sidequest-review/'+name+'.png',Buffer.from(result.data,'base64'));};
try {
 const isolation=await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.removeItem('sidequest.subscription.v1.roberto');for(const key of Object.keys(localStorage)){if(key.startsWith('sidequest.proposal.v1.'))localStorage.removeItem(key);}"});
 await send('Runtime.enable');await send('Page.enable');await send('Page.bringToFront');await viewport(390);
 await navigate('SideQuestPrototipo.html');
 await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:isolation.identifier});
 await evaluate(`clearDemoAccess(); demoAuthenticated=false;showAuth('login')`);
 await assert(`!document.getElementById('screen-auth').classList.contains('hidden')`, 'cliente abre em acesso');
 await evaluate(`document.getElementById('auth-login-form').requestSubmit()`);
 await assert(`document.getElementById('login-email').getAttribute('aria-invalid')==='true' && document.activeElement.id==='login-email'`, 'erro de acesso identifica campo e move foco');
 await screenshot('cliente-acesso-erro');
 await evaluate(`document.getElementById('auth-tab-login').focus()`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});
 await assert(`document.getElementById('auth-tab-register').getAttribute('aria-selected')==='true' && document.activeElement.id==='auth-tab-register'`, 'abas de acesso operam com setas do teclado');
 await evaluate(`setAuthTab('login')`);

 await evaluate(`completeDemoAuth('Google'); document.getElementById('app-feedback').hidden=true`);
 await assert(`document.querySelector('.nav-btn[aria-current=page]').getAttribute('aria-label')==='Início'`, 'navegação indica início ativo');
 await screenshot('cliente-inicio-mobile');
 await evaluate(`selectCategory('Mecânica','Mecanica')`);
 await assert(`document.querySelectorAll('#pro-list-container .professional-card').length===0 && document.querySelector('#pro-list-container .empty-state')`, 'categoria sem profissionais não exibe outra categoria');
 await evaluate(`selectCategory('Ar-condicionado','Ar')`);
 await assert(`document.querySelectorAll('#pro-list-container .professional-card').length===0`, 'ar-condicionado não corresponde a marcenaria');
 await evaluate(`document.getElementById('service-search').value='zzzinexistente'; document.getElementById('search-form').requestSubmit()`);
 await assert(`document.getElementById('results-summary').textContent.startsWith('0 ')`, 'busca vazia informa contagem e recuperação');
 await screenshot('cliente-busca-vazia');
 await evaluate(`resetProfessionalFilters(true)`);
 await assert(`document.querySelectorAll('#pro-list-container .professional-card').length===5`, 'limpar filtros recupera todos os resultados');
 await evaluate(`document.getElementById('service-search').value='ana'; document.getElementById('search-form').requestSubmit()`);
 await assert(`document.querySelectorAll('#pro-list-container .professional-card').length===3`, 'busca considera todos os profissionais correspondentes');
 await evaluate(`selectCategory('Elétrica','Eletrica'); document.getElementById('filter-rating').value='5'; document.getElementById('filters-form').requestSubmit()`);
 await assert(`document.querySelector('#pro-list-container .empty-state') && !document.getElementById('screen-client-pro-list').classList.contains('hidden')`, 'filtro mantém a categoria e tela atual');
 await evaluate(`resetProfessionalFilters(true); requestService();document.getElementById('form-create-os').requestSubmit()`);
 await assert(`document.getElementById('category-trigger').getAttribute('aria-invalid')==='true'`, 'solicitação exige categoria');
 await evaluate(`addRequestPhotos([new File(['x'],'documento.pdf',{type:'application/pdf'})])`);
 await assert(`!document.getElementById('photo-error').hidden && requestPhotos.length===0`, 'upload do pedido rejeita tipo inválido');
 await evaluate(`setRequestCategory('Eletrica');document.getElementById('os-desc').value='Trocar chuveiro';document.getElementById('os-address').value='Rua Teste, 15, Santos';setRequestUrgency('date');document.getElementById('field-0').value='2000-01-01';document.getElementById('form-create-os').requestSubmit()`);
 await assert(`document.getElementById('field-0').getAttribute('aria-invalid')==='true'`, 'solicitação rejeita data passada');
 await evaluate(`setRequestUrgency('week');returnFromRequest();requestService()`);
 await assert(`document.getElementById('os-desc').value==='Trocar chuveiro'`, 'voltar preserva rascunho');
 await evaluate(`document.getElementById('form-create-os').requestSubmit()`);
 await assert(`orders[0].description==='Trocar chuveiro' && orders[0].stage===0 && !document.getElementById('screen-client-orders').classList.contains('hidden')`, 'publicação cria pedido aguardando propostas');
 await evaluate(`window.savedOrderId=orders[0].id;openOrderDetails(savedOrderId);cancelPendingRequest(savedOrderId)`);
 await assert(`!orders.some(order=>order.id===savedOrderId)`, 'pedido pendente pode ser cancelado');
 await evaluate(`document.querySelector('#app-feedback .feedback-actions button').click();await new Promise(resolve=>setTimeout(resolve,100))`);
 await assert(`orders.some(order=>order.id===savedOrderId)`, 'desfazer restaura pedido cancelado');
 await evaluate(`removeOrderFavorite('roberto');document.querySelector('#app-feedback .feedback-actions button').click();await new Promise(resolve=>setTimeout(resolve,100))`);
 await assert(`favoriteProfessionals.has('roberto')`, 'favorito removido pode ser restaurado');
 await evaluate(`showFeedback('Arquivo inválido','error')`);
 await assert(`document.querySelector('#app-feedback [data-kind=error]') && document.getElementById('app-feedback').getAttribute('role')==='alert'`, 'erro usa aparência e anúncio próprios');
 await evaluate(`document.getElementById('app-feedback').hidden=true;navigateTo('screen-client-home')`);
 for(const width of [320,390,768,1280]){
   await viewport(width);await pause(200);
   await assert(`document.documentElement.scrollWidth<=innerWidth && document.getElementById('screen-client-home').scrollWidth<=document.getElementById('screen-client-home').clientWidth`, 'cliente sem rolagem horizontal em '+width+'px');
 }
 await screenshot('cliente-inicio-desktop');
 await viewport(390); await evaluate(`document.getElementById('screen-client-home').scrollTop=650`);await screenshot('cliente-profissionais-mobile');
 await evaluate(`requestService(); document.getElementById('form-create-os').scrollIntoView();`);await screenshot('cliente-solicitacao-mobile');

 await navigate('SideQuestPrestador.html');await viewport(390);await pause(300);
 await assert(`document.querySelectorAll('[data-opportunity]').length===2`, 'prestador mostra contagem real de oportunidades');
 await evaluate(`filterOpportunities('urgent')`);
 await assert(`document.querySelector('[data-opportunity=mariana]').hidden===false && document.querySelector('[data-opportunity=carlos]').hidden`, 'filtro de urgência altera lista');
 await screenshot('prestador-oportunidades');
 await evaluate(`openSendBudgetModal('Carlos Eduardo');await confirmSendBudget()`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
 await pause(150);
 await assert(`!document.getElementById('modal-budget').open`, 'Escape fecha modal nativo');
 await evaluate(`openSendBudgetModal('Carlos Eduardo');await confirmSendBudget()`);
 await assert(`document.getElementById('budget-value').getAttribute('aria-invalid')==='true' && document.activeElement.id==='budget-value'`, 'orçamento vazio mostra motivo e foco');
 await screenshot('prestador-proposta-erro');
 await evaluate(`document.getElementById('budget-value').value='-1';document.getElementById('budget-schedule').value='Amanhã às 10h';document.getElementById('budget-duration').value='2h';document.getElementById('budget-notes').value='Troca de vedação';await confirmSendBudget()`);
 await assert(`!document.getElementById('budget-value-error').hidden`, 'orçamento impede valor negativo');
 await evaluate(`document.getElementById('budget-value').value='235.50';await confirmSendBudget();document.getElementById('app-feedback').hidden=true`);
 await assert(`currentClient==='carlos' && clients.carlos.proposal.total===235.5 && clients.mariana.proposal.total===150 && document.getElementById('chat-messages-container').textContent.includes('235,50')`, 'proposta usa valor e destinatário corretos');
 await screenshot('prestador-proposta');
 await evaluate(`openSendBudgetModal('Carlos Eduardo');document.getElementById('budget-value').value='250';await confirmSendBudget();document.querySelector('#app-feedback .feedback-actions button').click();await new Promise(resolve=>setTimeout(resolve,100))`);
 await assert(`clients.carlos.proposal.total===235.5 && clients.carlos.budgetDraft.total==='250'`, 'desfazer edição restaura proposta e mantém rascunho');
 await evaluate(`openSendBudgetModal('Mariana Silva');document.getElementById('budget-duration').value='1 dia';document.getElementById('budget-duration').dispatchEvent(new Event('input',{bubbles:true}));closeBudgetModal();openSendBudgetModal('Mariana Silva')`);
 await assert(`document.getElementById('budget-duration').value==='1 dia'`, 'proposta preserva rascunho por cliente');
 await evaluate(`closeBudgetModal();openProviderChat('carlos');document.getElementById('chat-input-field').value='Mensagem para Carlos';sendChatMessage();openProviderChat('mariana')`);
 await assert(`!document.getElementById('chat-messages-container').textContent.includes('Mensagem para Carlos')`, 'históricos das conversas ficam separados');
 await evaluate(`navigateTo('screen-provider-profile');openPortfolioUpload()`);
 await assert(`document.getElementById('portfolio-confirm').disabled`, 'portfólio exige foto válida antes de adicionar');
 await evaluate(`{const dt=new DataTransfer();dt.items.add(new File(['pdf'],'arquivo.pdf',{type:'application/pdf'}));document.getElementById('portfolio-file').files=dt.files;document.getElementById('portfolio-file').dispatchEvent(new Event('change'));}`);
 await assert(`!document.getElementById('portfolio-error').hidden && document.getElementById('portfolio-confirm').disabled`, 'portfólio explica formato inválido');
 await evaluate(`(async () => {document.getElementById('portfolio-title').value='Troca de disjuntor geral';document.getElementById('portfolio-title').dispatchEvent(new Event('input'));const c=document.createElement('canvas');c.width=40;c.height=40;const blob=await new Promise(resolve=>c.toBlob(resolve));const dt=new DataTransfer();dt.items.add(new File([blob],'trabalho.png',{type:'image/png'}));document.getElementById('portfolio-file').files=dt.files;document.getElementById('portfolio-file').dispatchEvent(new Event('change'));})()`);
 await pause(300);
 await assert(`!document.getElementById('portfolio-confirm').disabled && !document.getElementById('portfolio-preview').hidden`, 'foto válida produz prévia antes de adicionar');
 await evaluate(`confirmPortfolioUpload()`);
 await assert(`document.getElementById('portfolio-grid').children.length===4`, 'adicionar foto atualiza portfólio');
 await evaluate(`document.querySelector('#app-feedback .feedback-actions button').click();await new Promise(resolve=>setTimeout(resolve,100))`);
 await assert(`document.getElementById('portfolio-grid').children.length===3`, 'desfazer remove foto recém adicionada');
 for(const width of [320,390,768,1280]){
   await viewport(width);await evaluate(`navigateTo('screen-provider-feed')`);await pause(100);
   await assert(`document.documentElement.scrollWidth<=innerWidth && document.getElementById('screen-provider-feed').scrollWidth<=document.getElementById('screen-provider-feed').clientWidth`, 'prestador sem rolagem horizontal em '+width+'px');
 }
 await evaluate(`navigateTo('screen-provider-dashboard')`);await pause(300);await screenshot('prestador-ganhos-desktop');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await assert(`getComputedStyle(document.querySelector('.btn')).transitionDuration==='0s'`, 'movimento reduzido respeita preferência do sistema');
 await assert(`typeof chartInstance==='object' && chartInstance!==null`, 'gráfico financeiro inicializa');
 await assert(`document.querySelectorAll('a[href="#"]').length===0`, 'sem links de navegação sem destino');
 await navigate('SideQuestPrototipo.html');
 await evaluate(`showAuth('register');document.getElementById('register-name').value='Camila Santos';document.getElementById('register-email').value='camila@example.com';document.getElementById('register-phone').value='13999998888';document.getElementById('register-password').value='Teste1234';document.getElementById('register-terms').checked=true;document.getElementById('auth-register-form').requestSubmit()`);
 await assert(`document.getElementById('account-greeting').textContent.includes('Camila') && !document.getElementById('screen-client-home').classList.contains('hidden')`, 'cadastro de cliente usa o nome preenchido e orienta próximo passo');
 await evaluate(`showAuth('register');document.getElementById('register-name').value='Camila Santos';document.getElementById('register-email').value='camila@example.com';document.getElementById('register-phone').value='13999998888';document.getElementById('register-password').value='Teste1234';document.getElementById('register-terms').checked=true;document.querySelector('input[name="account-role"][value="provider"]').checked=true;document.getElementById('auth-register-form').requestSubmit()`);
 await pause(1600);
 await assert(`location.pathname.endsWith('SideQuestPrestador.html')`, 'cadastro de prestador abre o perfil correto');
 if(errors.length)throw Error(errors.join('\n'));

 console.log(`${checks} checks passed. No uncaught browser errors. Screenshots: /tmp/sidequest-review`);
} finally {ws.close();}
