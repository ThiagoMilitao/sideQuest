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
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
  let preload;
  if(clear)preload=await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.removeItem('sidequest.subscription.v1.roberto');for(const key of Object.keys(localStorage)){if(key.startsWith('sidequest.proposal.v1.'))localStorage.removeItem(key);}"});
  await send('Page.navigate',{url:base+'/'+file});await sleep(2200);
  if(preload)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:preload.identifier});
  return result;
}
const assert=(condition,label)=>{if(!condition)throw Error('FAIL: '+label);checks++;console.log('PASS: '+label);};
async function poll(page,expression) {for(let i=0;i<100;i++){if(await page.value(expression))return;await sleep(75);}throw Error('Timeout: '+expression);}
async function fill(page,data) {await page.run(`for(const [id,value] of Object.entries(${JSON.stringify(data)})){const field=document.getElementById(id);field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));}`);}
async function shot(page,name) {await sleep(300);await fs.mkdir('/tmp/sidequest-proposals',{recursive:true});const data=await page.send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/sidequest-proposals/'+name+'.png',Buffer.from(data.data,'base64'));}
const snapshot=page=>page.value(`(()=>{const card=document.querySelector('.proposal-card');return Object.fromEntries(['summary','total','schedule','duration','scope'].map(key=>[key,card.querySelector('[data-proposal-field='+key+']').textContent]));})()`);
try {
  const client=await page('SideQuestPrototipo.html',true);
  await client.run(`completeDemoAuth('Google');openProfessionalChat('roberto');document.getElementById('app-feedback').hidden=true;`);
  const provider=await page('SideQuestPrestador.html');
  await provider.run(`openProviderChat('mariana');`);
  assert(JSON.stringify(await snapshot(client))===JSON.stringify(await snapshot(provider)),'exemplo inicial tem os mesmos campos nos dois perfis');
  assert(await client.value(`document.querySelector('[data-proposal-field=status]').textContent==='Aguardando sua aprovação' && document.querySelectorAll('.proposal-scope li').length===3`),'card do cliente apresenta aprovação e escopo em três tópicos');
  await provider.run(`openSendBudgetModal('Mariana Silva');`);await sleep(300);
  assert(await provider.value(`document.getElementById('budget-request-title').textContent===SideQuestProposals.requestFor('mariana').summary && document.querySelector('.budget-currency').textContent==='R$'`),'formulário mostra resumo da solicitação e prefixo fixo de moeda');
  await fill(provider,{'budget-value':'','budget-schedule':'30/10/2026 às 14h','budget-duration':'1 a 2 horas','budget-notes':'Instalação e testes.'});
  await provider.run(`await confirmSendBudget();`);
  assert(await provider.value(`document.getElementById('budget-value').getAttribute('aria-invalid')==='true'`),'valor vazio impede envio');
  await fill(provider,{'budget-value':'215.75','budget-schedule':''});await provider.run(`await confirmSendBudget();`);
  assert(await provider.value(`document.getElementById('budget-schedule').getAttribute('aria-invalid')==='true'`),'previsão de atendimento é obrigatória');
  await fill(provider,{'budget-schedule':'30/10/2026 às 14h','budget-duration':''});await provider.run(`await confirmSendBudget();`);
  assert(await provider.value(`document.getElementById('budget-duration').getAttribute('aria-invalid')==='true'`),'duração estimada é obrigatória');
  await fill(provider,{'budget-duration':'1 a 2 horas','budget-notes':'   '});await provider.run(`await confirmSendBudget();`);
  assert(await provider.value(`document.getElementById('budget-notes').getAttribute('aria-invalid')==='true'`),'escopo em branco impede envio');
  const scope='Mão de obra para troca do chuveiro.\nTestes na fiação e vedação.\nNão inclui peças adicionais.';
  await fill(provider,{'budget-notes':scope});await shot(provider,'preparar-proposta');
  await provider.run(`closeBudgetModal();openSendBudgetModal('Mariana Silva');`);
  assert(await provider.value(`document.getElementById('budget-value').value==='215.75' && document.getElementById('budget-schedule').value==='30/10/2026 às 14h' && document.getElementById('budget-duration').value==='1 a 2 horas' && document.getElementById('budget-notes').value===${JSON.stringify(scope)}`),'rascunho preserva os quatro campos completos');
  await provider.run(`await confirmSendBudget();document.getElementById('app-feedback').hidden=true;`);
  await poll(client,`conversationFor('roberto').proposal.total===215.75`);
  assert(JSON.stringify(await snapshot(client))===JSON.stringify(await snapshot(provider)),'envio sincroniza valor, previsão, duração, título e escopo sem recarregar cliente');
  assert(await client.value(`conversationFor('roberto').proposal.scope===${JSON.stringify(scope)} && document.querySelectorAll('.proposal-scope li').length===3`),'texto integral do escopo é conservado e renderizado em tópicos');
  await client.run(`document.getElementById('app-feedback').hidden=true;`);await shot(client,'orcamento-cliente');
  await provider.run(`openSendBudgetModal('Carlos Eduardo');`);await fill(provider,{'budget-value':'90','budget-schedule':'31/10/2026 às 9h','budget-duration':'Até 1 hora','budget-notes':'Reparo na torneira.'});await provider.run(`await confirmSendBudget();`);
  await sleep(150);
  assert(await client.value(`conversationFor('roberto').proposal.total===215.75 && conversationFor('carlos').proposal===null`),'proposta do cliente Carlos não é entregue à Mariana nem ao profissional Carlos');
  await provider.run(`openSendBudgetModal('Mariana Silva');`);await fill(provider,{'budget-value':'270','budget-schedule':'31/10/2026 às 16h','budget-duration':'2 a 4 horas','budget-notes':'Mão de obra e materiais combinados.'});await provider.run(`await confirmSendBudget();`);
  await poll(client,`conversationFor('roberto').proposal.total===270`);
  assert(JSON.stringify(await snapshot(client))===JSON.stringify(await snapshot(provider)),'editar proposta atualiza o mesmo card nos dois perfis');
  await provider.run(`document.querySelector('#app-feedback .feedback-actions button').click();`);
  await poll(client,`conversationFor('roberto').proposal.total===215.75`);
  assert(await provider.value(`clients.mariana.budgetDraft.total==='270' && clients.mariana.proposal.total===215.75`),'desfazer restaura versão anterior nos perfis e preserva rascunho');
  // Editing starts on one revision; the customer responds while the form is open.
  await provider.run(`openSendBudgetModal('Mariana Silva');`);
  await client.run(`openNegotiation();document.getElementById('negotiation-comment').value='Inclua os materiais na proposta.';document.getElementById('negotiation-form').requestSubmit();`);
  await poll(provider,`clients.mariana.proposal.status==='adjustment'`);
  assert(await provider.value(`clients.mariana.proposal.response==='Inclua os materiais na proposta.'`),'pedido de ajuste e comentário chegam ao prestador');
  await provider.run(`await confirmSendBudget();`);
  assert(await provider.value(`!document.getElementById('budget-error').hidden && document.getElementById('modal-budget').open`),'edição de uma revisão antiga é bloqueada sem descartar formulário');
  await provider.run(`closeBudgetModal();openSendBudgetModal('Mariana Silva');await confirmSendBudget();`);
  await poll(client,`conversationFor('roberto').proposal.status==='pending' && conversationFor('roberto').proposal.total===270`);
  assert(await client.value(`conversationFor('roberto').proposal.response===''`),'reenviar após ajuste cria uma nova revisão pendente');
  await client.run(`openNegotiation();document.querySelector('input[name="negotiation-action"][value=decline]').checked=true;updateNegotiationForm();document.getElementById('negotiation-comment').value='Não consigo neste horário.';document.getElementById('negotiation-form').requestSubmit();`);
  await poll(provider,`clients.mariana.proposal.status==='declined'`);
  assert(await provider.value(`document.querySelector('[data-proposal-field=status]').textContent==='Proposta recusada'`),'recusa também atualiza o status no prestador');
  await provider.run(`openSendBudgetModal('Mariana Silva');`);await fill(provider,{'budget-schedule':'01/11/2026 às 10h'});await provider.run(`await confirmSendBudget();`);
  await poll(client,`conversationFor('roberto').proposal.status==='pending'`);
  const staleRevision=await client.value(`conversationFor('roberto').proposal.revision`);
  await provider.run(`openSendBudgetModal('Mariana Silva');`);await fill(provider,{'budget-value':'280'});await provider.run(`await confirmSendBudget();`);
  await poll(client,`conversationFor('roberto').proposal.total===280`);
  assert(await client.run(`try{await SideQuestProposals.respond('mariana','accepted',${JSON.stringify(staleRevision)});return false;}catch(error){return error.code==='conflict';}`),'cliente não pode aceitar uma revisão desatualizada');
  // Keep a provider edit form open while acceptance happens in the client tab.
  await provider.run(`openSendBudgetModal('Mariana Silva');`);await fill(provider,{'budget-value':'999'});
  await client.run(`await Promise.all([acceptProposal(),acceptProposal()]);`);
  await poll(provider,`clients.mariana.proposal.status==='accepted'`);
  assert(await client.value(`orders.filter(order=>order.proposalId===conversationFor('roberto').proposal.id).length===1`),'duplo clique de aceite cria apenas um pedido');
  assert(await client.value(`(()=>{const quote=conversationFor('roberto').proposal;const order=orders.find(item=>item.proposalId===quote.id);return order.total===quote.total&&order.schedule===quote.schedule&&order.duration===quote.duration&&order.scope===quote.scope;})()`),'pedido contratado preserva exatamente os dados do orçamento');
  await provider.run(`await confirmSendBudget();`);
  assert(await provider.value(`!document.getElementById('budget-error').hidden && clients.mariana.proposal.total===280`),'proposta aceita não pode ser alterada pelo prestador');
  await provider.run(`closeBudgetModal();`);
  await client.send('Page.reload');await sleep(1700);await client.run(`openProfessionalChat('roberto');`);
  assert(await client.value(`conversationFor('roberto').proposal.status==='accepted' && orders.some(order=>order.proposalId===conversationFor('roberto').proposal.id)`),'recarregar cliente preserva orçamento aceito e reconstrói pedido');
  await provider.send('Page.reload');await sleep(1700);await provider.run(`openProviderChat('mariana');`);
  assert(JSON.stringify(await snapshot(client))===JSON.stringify(await snapshot(provider)),'recarregar prestador conserva os mesmos dados contratados');
  assert(await provider.value(`!document.querySelector('.proposal-actions button') && document.querySelector('[data-proposal-field=status]').textContent==='Proposta aceita'`),'card aceito no prestador não oferece edição');
  await provider.run(`openSendBudgetModal('Carlos Eduardo');window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('Storage blocked','QuotaExceededError');};`);
  await fill(provider,{'budget-value':'99','budget-schedule':'02/11/2026 às 9h','budget-duration':'1 hora','budget-notes':'Reparo e vedação.'});await provider.run(`await confirmSendBudget();Storage.prototype.setItem=originalSetItem;`);
  assert(await provider.value(`document.getElementById('modal-budget').open && !document.getElementById('budget-error').hidden && clients.carlos.proposal.total===90`),'falha de armazenamento impede sucesso falso e mantém rascunho');
  const safeScope='Testes de segurança do texto.\n<img src=x onerror="window.scopeExecuted=true">\n'+'x'.repeat(180);
  await fill(provider,{'budget-notes':safeScope});await provider.run(`await confirmSendBudget();document.getElementById('app-feedback').hidden=true;`);
  assert(await provider.value(`!document.querySelector('.proposal-scope img') && !window.scopeExecuted && clients.carlos.proposal.scope===${JSON.stringify(safeScope)}`),'escopo é exibido como texto, sem interpretar HTML');
  for(const width of [320,390,768]) {
    await provider.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<640});
    await provider.run(`openSendBudgetModal('Carlos Eduardo');`);await sleep(100);
    assert(await provider.value(`document.querySelector('.budget-panel').scrollWidth<=document.querySelector('.budget-panel').clientWidth`),'formulário sem rolagem horizontal em '+width+'px');
    await provider.run(`closeBudgetModal();`);await sleep(100);
    assert(await provider.value(`document.querySelector('.proposal-card').scrollWidth<=document.querySelector('.proposal-card').clientWidth`),'card com escopo longo cabe em '+width+'px');
  }
  if(errors.length)throw Error(errors.join('\n'));
  console.log(`${checks} synchronized proposal checks passed. No uncaught browser errors. Screenshots: /tmp/sidequest-proposals`);
} finally {for(const page of pages)page.ws.close();}
