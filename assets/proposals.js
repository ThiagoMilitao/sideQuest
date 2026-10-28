/* Shared proposal contract, renderer and same-origin browser synchronization. */
window.SideQuestProposals = (() => {
  const prefix = 'sidequest.proposal.v1.';
  const requests = {
    mariana:{clientId:'mariana',clientName:'Mariana Silva',professionalId:'roberto',requestId:'chuveiro-mariana',summary:'Instalação de Chuveiro 7500W e Reparo de Tomadas',category:'Eletrica',orderNumber:9001},
    carlos:{clientId:'carlos',clientName:'Carlos Eduardo',professionalId:'roberto',requestId:'torneira-carlos',summary:'Vazamento em Torneira de Cozinha',category:'Hidraulica',orderNumber:9002}
  };
  const listeners = new Set();
  const statuses = ['pending','accepted','adjustment','declined'];
  const clone = value => value ? JSON.parse(JSON.stringify(value)) : null;
  const idFor = clientId => 'roberto:'+requests[clientId]?.requestId;
  const keyFor = clientId => prefix+idFor(clientId);
  function normalize(record) {
    if (!record || !requests[record.clientId]) return null;
    const meta = requests[record.clientId];
    if (record.id !== idFor(meta.clientId) || record.professionalId !== meta.professionalId || record.requestId !== meta.requestId || !statuses.includes(record.status)) return null;
    if (typeof record.total !== 'number' || !Number.isFinite(record.total) || record.total < 1 || record.total > 100000 || Math.abs(record.total*100-Math.round(record.total*100)) > .00001) return null;
    if (!['schedule','duration','scope','revision'].every(key => typeof record[key] === 'string' && record[key].trim())) return null;
    if (record.schedule.length > 120 || record.duration.length > 80 || record.scope.length > 1000 || record.revision.length > 120 || !Number.isFinite(record.updatedAt)) return null;
    return {...meta,id:record.id,total:record.total,schedule:record.schedule.trim(),duration:record.duration.trim(),scope:record.scope.trim(),status:record.status,revision:record.revision,updatedAt:record.updatedAt,response:typeof record.response === 'string' ? record.response.slice(0,1000) : '',orderId:record.status === 'accepted' ? meta.orderNumber : null};
  }
  function get(clientId) {
    try { return normalize(JSON.parse(localStorage.getItem(keyFor(clientId)))); } catch { return null; }
  }
  function example() {
    return {...requests.mariana,id:idFor('mariana'),total:150,schedule:'Amanhã às 10h',duration:'1 a 2 horas',scope:'Mão de obra para troca do chuveiro.\nTestes na fiação e vedação.\nNão inclui peças adicionais.',status:'pending',revision:'example-v1',updatedAt:0,response:'',orderId:null};
  }
  function current(clientId) { return get(clientId) || (clientId === 'mariana' ? example() : null); }
  function conflict(message = 'A proposta foi atualizada. Confira a versão mais recente antes de continuar.') {
    const error = new Error(message); error.code = 'conflict'; return error;
  }
  function checkRevision(clientId, expectedRevision) {
    const value = current(clientId);
    if ((value?.revision || null) !== (expectedRevision || null)) throw conflict();
    return value;
  }
  function notify(clientId) { for (const listener of listeners) listener(clientId); }
  function commit(clientId, record) {
    try {
      if (record) localStorage.setItem(keyFor(clientId),JSON.stringify(record));
      else localStorage.removeItem(keyFor(clientId));
    } catch { throw new Error('Não foi possível sincronizar a proposta neste navegador. Verifique se o armazenamento local está disponível e tente novamente.'); }
    notify(clientId); return clone(record);
  }
  async function transaction(clientId, action) {
    if (!requests[clientId]) throw new Error('Solicitação não encontrada.');
    if (!['http:','https:'].includes(location.protocol)) throw new Error('Para sincronizar os perfis, abra o SideQuest pelo servidor local (localhost) ou HTTPS.');
    if (navigator.locks?.request) return navigator.locks.request(keyFor(clientId),action);
    return action();
  }
  const revision = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  async function publish(clientId, input, expectedRevision) {
    return transaction(clientId,() => {
      if (current(clientId)?.status === 'accepted') throw conflict('Esta proposta já foi aceita. Os dados contratados não podem ser alterados.');
      checkRevision(clientId,expectedRevision);
      const proposal = normalize({...requests[clientId],id:idFor(clientId),total:input.total,schedule:input.schedule,duration:input.duration,scope:input.scope,status:'pending',revision:revision(),updatedAt:Date.now()});
      if (!proposal) throw new Error('Confira valor, previsão, duração e escopo antes de enviar.');
      return commit(clientId,proposal);
    });
  }
  async function respond(clientId,status,expectedRevision,response = '') {
    return transaction(clientId,() => {
      const previous = checkRevision(clientId,expectedRevision);
      if (!previous || previous.status !== 'pending' || !['accepted','adjustment','declined'].includes(status)) throw conflict('Esta proposta já recebeu uma resposta. Confira o status atual.');
      return commit(clientId,normalize({...previous,status,response,revision:revision(),updatedAt:Date.now()}));
    });
  }
  async function restore(clientId, previous, expectedRevision) {
    return transaction(clientId,() => {
      if (current(clientId)?.status === 'accepted') throw conflict('O cliente já aceitou a proposta. Não é possível desfazer este envio.');
      checkRevision(clientId,expectedRevision);
      return commit(clientId,previous ? normalize({...previous,revision:revision(),updatedAt:Date.now()}) : null);
    });
  }
  window.addEventListener('storage',event => {
    if (event.key === null) { for (const id of Object.keys(requests)) notify(id); return; }
    const clientId = Object.keys(requests).find(id => keyFor(id) === event.key);
    if (clientId) notify(clientId);
  });
  window.addEventListener('pageshow',()=>{for(const id of Object.keys(requests))notify(id);});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)for(const id of Object.keys(requests))notify(id);});
  // Both profiles use this renderer, so every monetary, scheduling and scope
  // field is displayed from the same contract instead of duplicated templates.
  function card(proposal, options = {}) {
    const element = document.createElement('article'); element.className = 'card bg-base-100 rounded-2xl proposal-card'; element.dataset.proposalId = proposal.id;
    element.setAttribute('aria-label','Proposta oficial de orçamento');
    const body = document.createElement('div'); body.className = 'card-body';
    const header = document.createElement('header'); header.className = 'proposal-header';
    const badge = document.createElement('span'); badge.className = 'badge badge-soft badge-primary proposal-heading'; badge.textContent = '📝 PROPOSTA OFICIAL DE ORÇAMENTO';
    const status = document.createElement('span'); status.className = 'badge badge-soft proposal-status badge-'+(proposal.status === 'accepted' ? 'success' : proposal.status === 'declined' ? 'error' : 'primary');
    status.textContent = {pending:options.audience === 'provider' ? 'Aguardando aprovação do cliente' : 'Aguardando sua aprovação',accepted:'Proposta aceita',adjustment:'Ajuste solicitado',declined:'Proposta recusada'}[proposal.status]; status.dataset.proposalField = 'status';
    header.append(badge,status);
    const title = document.createElement('h2'); title.className = 'proposal-summary'; title.textContent = proposal.summary; title.dataset.proposalField = 'summary';
    const financial = document.createElement('div'); financial.className = 'proposal-financial';
    const label = document.createElement('p'); label.className = 'proposal-value-label'; label.textContent = 'Valor total do serviço';
    const value = document.createElement('p'); value.className = 'proposal-amount text-primary font-black text-2xl'; value.textContent = proposal.total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); value.dataset.proposalField = 'total';
    financial.append(label,value);
    for (const [field,caption,icon] of [['schedule','Previsão de atendimento','calendar'],['duration','Duração estimada','clock']]) {
      const row = document.createElement('p'); row.className = 'proposal-timing';
      const glyph = document.createElement('i'); glyph.className = 'fa-regular fa-'+icon; glyph.setAttribute('aria-hidden','true');
      const text = document.createElement('span'); const name = document.createElement('span'); name.textContent = caption+': '; name.className = 'proposal-timing-label';
      const detail = document.createElement('span'); detail.textContent = proposal[field]; detail.dataset.proposalField = field;
      text.append(name,detail); row.append(glyph,text); financial.append(row);
    }
    const scope = document.createElement('section'); scope.className = 'proposal-scope bg-base-200/60 p-3 rounded-xl';
    const heading = document.createElement('h3'); heading.textContent = 'O que está incluído';
    const list = document.createElement('ul'); list.dataset.proposalField = 'scope';
    for (const line of proposal.scope.split(/\r?\n/).map(line => line.trim()).filter(Boolean)) {
      const item = document.createElement('li'); item.textContent = line.replace(/^[•*-]\s+/,''); list.append(item);
    }
    scope.append(heading,list); body.append(header,title,financial,scope);
    if (proposal.response) {const reply=document.createElement('p');reply.className='proposal-outcome';reply.textContent='Resposta do cliente: '+proposal.response;body.append(reply);}
    const actions = document.createElement('footer'); actions.className = 'card-actions proposal-actions';
    const button = (text,style,handler) => {const item=document.createElement('button');item.type='button';item.className='btn '+style;item.textContent=text;item.onclick=handler;return item;};
    if (options.audience === 'provider') {
      if (proposal.status !== 'accepted') actions.append(button('Editar proposta','btn-outline',options.onEdit));
      else {const note=document.createElement('p');note.className='proposal-outcome text-secondary';note.textContent='O cliente aceitou os dados deste orçamento.';actions.append(note);}
    } else {
      actions.id = 'proposal-action-container';
      if (proposal.status === 'pending') {
        actions.append(button('✓ Aceitar Proposta e Contratar','btn-primary w-full rounded-2xl shadow-md proposal-accept',options.onAccept),button('Pedir Ajuste / Recusar','btn-ghost btn-xs w-full mt-1 proposal-negotiate',options.onNegotiate));
      } else if (proposal.status === 'accepted') {
        const note=document.createElement('p');note.className='proposal-outcome text-secondary';note.textContent='Serviço contratado. Acompanhe os detalhes em Pedidos.';
        actions.append(note,button('Ver Pedido','btn-outline btn-secondary',options.onViewOrder));
      } else {const note=document.createElement('p');note.className='proposal-outcome';note.textContent=proposal.status==='adjustment'?'Seu pedido de ajuste foi enviado. Aguarde a nova proposta.':'A proposta foi recusada. Você pode continuar a conversa.';actions.append(note);}
    }
    const transparency=document.createElement('p');transparency.className='direct-payment-note';transparency.textContent=options.audience==='provider'?'O SideQuest não cobra taxa sobre seus serviços. Todo o pagamento é negociado e recebido diretamente por você com o cliente.':'O SideQuest não processa o pagamento do serviço. Combine o valor e pague diretamente ao profissional.';body.append(transparency,actions); element.append(body); return element;
  }
  return {requestFor:clientId=>clone(requests[clientId]),get,current:clientId=>clone(current(clientId)),publish,respond,restore,card,subscribe:callback=>{listeners.add(callback);return()=>listeners.delete(callback);}};
})();
