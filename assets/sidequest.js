// Local prototype data. No proposal, message or photo is sent to a server.
const clients = {
    mariana: {location:'Gonzaga, Santos', unread:1, updatedAt:0, name: 'Mariana Silva', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80', request: 'Instalação de chuveiro e reparo de tomadas', messages: [{text: 'Olá, Roberto. Preciso trocar o chuveiro e verificar as tomadas. Você tem disponibilidade?', side: 'start'}], draft: '', budgetDraft: null, proposal: null},
    carlos: {location:'Boqueirão, Santos', unread:0, updatedAt:0, name: 'Carlos Eduardo', image: '', request: 'Vazamento em torneira de cozinha', messages: [{text: 'Olá. Minha torneira está vazando na base. Você consegue avaliar o reparo?', side: 'start'}], draft: '', budgetDraft: null, proposal: null}
};
let currentClient = 'mariana';
let budgetClient = 'mariana';
let activeFilter = 'all';
let chartInstance = null;
const money = value => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(value);
const byId = id => document.getElementById(id);
const timeNow = () => new Intl.DateTimeFormat('pt-BR', {hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo'}).format(new Date());
function renderNav() {
    byId('nav-container').appendChild(byId('provider-nav-template').content.cloneNode(true));
}
function navigateTo(screenId) {
    const target = byId(screenId); if (!target) return;
    window.SideQuestProvider?.closeMenu();
    const previous = document.querySelector('.screen-view:not(.hidden)');
    SideQuestMotion.cancelLoads();
    document.querySelectorAll('.screen-view').forEach(screen => screen.classList.toggle('hidden', screen !== target));
    document.querySelectorAll('.nav-btn').forEach(button => {
        const navScreen = screenId === 'screen-client-chat' ? 'screen-provider-messages' : screenId;
        const active = button.dataset.screen === navScreen || button.getAttribute('onclick').includes("'"+navScreen+"'");
        button.classList.toggle('nav-active', active);
        if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
    byId('app-viewport').classList.toggle('provider-chat-is-open',screenId === 'screen-client-chat');
    if (screenId === 'screen-provider-messages') renderProviderChatList();
    if (screenId === 'screen-client-chat') {clients[currentClient].unread=0;renderProviderChat();updateProviderChatViewport();}
    if (screenId === 'screen-provider-dashboard') requestAnimationFrame(initChart);
    target.scrollTop = 0;
    const heading = screenId === 'screen-client-chat' ? byId('provider-chat-profile') : target.querySelector('h1,h2,h3') || target; if (heading.tagName !== 'BUTTON') heading.tabIndex = -1; heading.focus({preventScroll:true});
    SideQuestMotion.enterScreen(target, previous !== target);
}
function filterOpportunities(filter) {
    activeFilter = filter;
    window.SideQuestProvider?.filter(filter);
}
const proposalStatusLabel = proposal => ({pending:'Orçamento enviado · Aguardando aprovação',accepted:'Orçamento aceito',adjustment:'Ajuste solicitado',declined:'Orçamento recusado'}[proposal?.status] || 'Conversa iniciada');
function proposalPreview(proposal) {
    if(proposal.response)return 'Cliente: '+proposal.response;
    const text={pending:'Você enviou um orçamento de ',accepted:'Cliente aceitou o orçamento de ',adjustment:'Cliente pediu ajuste no orçamento de ',declined:'Cliente recusou o orçamento de '}[proposal.status];
    return text+money(proposal.total)+'. '+proposal.schedule;
}
function showChatList() {
    const returning = !byId('screen-client-chat').classList.contains('hidden');
    if (returning) clients[currentClient].draft=byId('chat-input-field').value;
    byId('modal-client-details').close();
    navigateTo('screen-provider-messages');
    if (returning) document.querySelector('[data-client="'+currentClient+'"]')?.focus({preventScroll:true});
}
function clientAvatar(client, className = '') {
    const avatar=document.createElement('span');avatar.className='provider-client-avatar '+className;
    const initials=document.createElement('span');initials.textContent=client.name.split(' ').slice(0,2).map(word=>word[0]).join('');initials.setAttribute('aria-hidden','true');avatar.append(initials);
    if(client.image){const image=document.createElement('img');image.src=client.image;image.alt='';image.loading='lazy';image.onload=()=>{initials.hidden=true;};image.onerror=()=>image.remove();avatar.append(image);}
    return avatar;
}
function setClientAvatar(imageId,initialsId,client) {
    const image=byId(imageId),initials=byId(initialsId);
    initials.textContent=client.name.split(' ').slice(0,2).map(word=>word[0]).join('');initials.hidden=!!client.image;image.hidden=!client.image;
    image.onerror=()=>{image.hidden=true;initials.hidden=false;};
    if(client.image)image.src=client.image;else image.removeAttribute('src');
}
function renderProviderChatList() {
    const list=byId('provider-recent-conversations');list.replaceChildren();
    const records=Object.entries(clients).sort((a,b)=>Math.max(b[1].updatedAt,b[1].proposal?.updatedAt||0)-Math.max(a[1].updatedAt,a[1].proposal?.updatedAt||0));
    let unread=0;
    for(const [id,client] of records) {
        unread+=client.unread;
        const row=document.createElement('li'),button=document.createElement('button');button.type='button';button.className='btn btn-ghost bg-base-100 provider-conversation-open';button.dataset.client=id;
        button.setAttribute('aria-label','Abrir conversa com '+client.name);button.onclick=()=>openProviderChat(id);
        const copy=document.createElement('span');copy.className='provider-conversation-copy';
        const name=document.createElement('span');name.className='provider-conversation-name';name.textContent=client.name;
        const preview=document.createElement('span');preview.className='provider-conversation-preview';
        const last=client.messages.at(-1),proposalLatest=client.proposal&&(client.proposal.updatedAt||0)>=(last?.createdAt||0);
        preview.textContent=client.draft.trim()?'Rascunho: '+client.draft:proposalLatest?proposalPreview(client.proposal):(last?.side==='start'?'':'Você: ')+(last?.filename?'Imagem · '+last.filename:last?.text||'Conversa iniciada');
        const badge=document.createElement('span');badge.className='badge badge-soft badge-primary provider-conversation-status';badge.textContent=proposalStatusLabel(client.proposal);
        copy.append(name,preview,badge);
        const meta=document.createElement('span');meta.className='provider-conversation-meta';const time=document.createElement('time');
        const updated=Math.max(client.updatedAt,client.proposal?.updatedAt||0);
        time.textContent=updated?new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'}).format(updated):(id==='mariana'?'09:40':'08:25');
        if(updated)time.dateTime=new Date(updated).toISOString();meta.append(time);
        if(client.unread){const count=document.createElement('span');count.className='badge badge-primary badge-sm';count.textContent=client.unread;count.setAttribute('aria-label',client.unread+' mensagem não lida');meta.append(count);}
        button.append(clientAvatar(client),copy,meta);row.append(button);list.append(row);
    }
    const counter=byId('provider-messages-unread');counter.hidden=unread===0;counter.textContent=unread+(unread===1?' não lida':' não lidas');
}
function openProviderChat(id) {
    if (!clients[id]) return;
    currentClient = id; clients[id].unread=0;navigateTo('screen-client-chat');
}
function openClientDetails() {
    const client=clients[currentClient];
    byId('client-details-title').textContent='Detalhes '+(currentClient==='mariana'?'da cliente':'do cliente');
    byId('client-details-name').textContent=client.name;byId('client-details-location').textContent=client.location;
    byId('client-details-request').textContent=SideQuestProposals.requestFor(currentClient).summary;
    byId('client-details-proposal').textContent=proposalStatusLabel(client.proposal);
    byId('client-details-budget').textContent=client.proposal?.status==='accepted'?'Ver proposta contratada':client.proposal?'Editar proposta':'Preparar proposta';
    setClientAvatar('client-details-image','client-details-initials',client);byId('modal-client-details').showModal();
}
function renderProviderChat(animateNew = false, preserveScroll = false) {
    const client = clients[currentClient];
    byId('chat-interlocutor-name').textContent = client.name;byId('chat-interlocutor-location').textContent=client.location;
    byId('provider-chat-profile').setAttribute('aria-label','Abrir detalhes de '+client.name);
    document.querySelector('.provider-chat-header').setAttribute('aria-label','Conversa com '+client.name);
    setClientAvatar('chat-interlocutor-img','chat-interlocutor-initials',client);
    const container = byId('chat-messages-container');
    const previousTop=container.scrollTop,atBottom=container.scrollHeight-container.scrollTop-container.clientHeight<48;
    container.replaceChildren();
    const timeline=client.messages.map((message,index)=>({message,at:message.createdAt||0,index}));
    if(client.proposal)timeline.push({proposal:client.proposal,at:client.proposal.updatedAt||0,index:client.messages.length});
    timeline.sort((a,b)=>a.at-b.at||a.index-b.index);
    for(const entry of timeline) {
        if(entry.proposal){container.append(SideQuestProposals.card(entry.proposal,{audience:'provider',onEdit:()=>openSendBudgetModal(client.name)}));continue;}
        const message=entry.message;
        const item = document.createElement('div'); item.className = 'chat chat-' + (message.side || 'end');
        const bubble = document.createElement('div'); bubble.className = 'chat-bubble ' + (message.side === 'start' ? 'bg-base-200' : 'chat-bubble-primary');
        if (message.image) { const img = document.createElement('img'); img.src = message.image; img.alt = message.filename; img.className = 'chat-attachment-image'; bubble.append(img); }
        const text = document.createElement('p'); text.textContent = message.text || message.filename; bubble.append(text);
        if (message.time) { const status = document.createElement('p'); status.className = 'text-xs'; status.textContent = message.time + ' · Adicionada nesta sessão'; bubble.append(status); }
        item.append(bubble); SideQuestMotion.message(item, message, animateNew); container.append(item);
    }
    byId('chat-input-field').value = client.draft; updateSendButton(); container.scrollTop = preserveScroll&&!atBottom?previousTop:container.scrollHeight;
}
function updateProviderChatViewport() {
    const viewport=window.visualViewport;if(viewport&&viewport.scale!==1)return;
    document.documentElement.style.setProperty('--provider-chat-viewport-height',Math.round(Math.min(window.innerHeight,viewport?.height||window.innerHeight))+'px');
}
window.visualViewport?.addEventListener('resize',updateProviderChatViewport);window.addEventListener('resize',updateProviderChatViewport);
function updateSendButton() { byId('provider-chat-send').disabled = !byId('chat-input-field').value.trim(); }
function sendChatMessage() {
    const input = byId('chat-input-field'); const text = input.value.trim(); if (!text) return;
    clients[currentClient].updatedAt=Date.now();clients[currentClient].messages.push({text, time:timeNow(),createdAt:clients[currentClient].updatedAt}); clients[currentClient].draft = '';
    renderProviderChat(true); byId('provider-chat-status').textContent = 'Mensagem adicionada à conversa de demonstração. Nenhum envio externo foi realizado.'; input.focus();
}
let budgetEditRevision = null;
let budgetSending = false;
function syncProviderProposals() {
    for (const id of Object.keys(clients)) {
        const previous=clients[id].proposal,proposal=SideQuestProposals.current(id);
        const viewing=currentClient===id&&!byId('screen-client-chat').classList.contains('hidden');
        if(previous&&proposal&&previous.revision!==proposal.revision&&proposal.status!=='pending'&&!viewing)clients[id].unread++;
        clients[id].proposal=proposal;
    }
    if (!byId('screen-client-chat').classList.contains('hidden')) renderProviderChat(false,true);
    if (!byId('screen-provider-messages').classList.contains('hidden')) renderProviderChatList();
    if(byId('modal-client-details').open)byId('client-details-proposal').textContent=proposalStatusLabel(clients[currentClient].proposal);
}
SideQuestProposals.subscribe(syncProviderProposals);
function openSendBudgetModal(name) {
    const id = Object.keys(clients).find(key => clients[key].name === name); if (!id) return;
    syncProviderProposals();
    if (clients[id].proposal?.status === 'accepted') {openProviderChat(id);showFeedback('Esta proposta já foi aceita. Os dados contratados foram preservados.','info');return;}
    budgetClient = id; window.SideQuestProvider?.markRead(id);
    const client = clients[id]; const meta = SideQuestProposals.requestFor(id);
    const proposal = client.proposal;
    const draft = client.budgetDraft || (proposal ? {total:proposal.total,schedule:proposal.schedule,duration:proposal.duration,scope:proposal.scope} : {total:'',schedule:'',duration:'',scope:''});
    budgetEditRevision = proposal?.revision || null;
    byId('budget-client-name').textContent = client.name;byId('budget-request-title').textContent = meta.summary;
    byId('budget-value').value = draft.total;byId('budget-schedule').value = draft.schedule;byId('budget-duration').value = draft.duration;byId('budget-notes').value = draft.scope;
    clearBudgetErrors();byId('modal-budget').showModal();
}
function readBudget() {return {total:byId('budget-value').value,schedule:byId('budget-schedule').value,duration:byId('budget-duration').value,scope:byId('budget-notes').value};}
function closeBudgetModal() {if (!budgetSending) {clients[budgetClient].budgetDraft=readBudget();byId('modal-budget').close();}}
function clearBudgetErrors() {
    for (const id of ['budget-value','budget-schedule','budget-duration','budget-notes']) {byId(id).removeAttribute('aria-invalid');byId(id+'-error').hidden=true;}
    byId('budget-error').hidden=true;
}
async function confirmSendBudget() {
    if (budgetSending) return;
    clearBudgetErrors();const draft=readBudget();let first=null;
    const fail=(id,message)=>{byId(id).setAttribute('aria-invalid','true');byId(id+'-error').textContent=message;byId(id+'-error').hidden=false;first ||= byId(id);};
    const total=Number(draft.total);
    if (!Number.isFinite(total)||total<1||total>100000||byId('budget-value').validity.stepMismatch) fail('budget-value','Informe um valor entre R$ 1,00 e R$ 100.000,00, com até duas casas decimais.');
    if (!draft.schedule.trim()||draft.schedule.length>120) fail('budget-schedule','Informe a data e o horário sugeridos, por exemplo, amanhã às 10h.');
    if (!draft.duration.trim()||draft.duration.length>80) fail('budget-duration','Informe a duração estimada, por exemplo, 1 a 2 horas.');
    if (!draft.scope.trim()||draft.scope.length>1000) fail('budget-notes','Descreva o que está incluído na proposta em até 1.000 caracteres.');
    if (first) {byId('budget-error').textContent='Confira os campos destacados antes de enviar.';byId('budget-error').hidden=false;first.focus();return;}
    const id=budgetClient;const previous=SideQuestProposals.get(id);
    clients[id].budgetDraft=draft;budgetSending=true;byId('budget-submit').disabled=true;byId('budget-submit').setAttribute('aria-busy','true');byId('budget-submit-label').textContent='Enviando proposta…';
    try {
        const proposal=await SideQuestProposals.publish(id,{total,schedule:draft.schedule,duration:draft.duration,scope:draft.scope},budgetEditRevision);
        clients[id].proposal=proposal;clients[id].budgetDraft=null;
        byId('modal-budget').close();openProviderChat(id);
        showFeedback('Proposta para '+clients[id].name+' enviada ao chat com valor, prazo, duração e escopo.','success',{label:'Desfazer',run:async()=>{
            try {await SideQuestProposals.restore(id,previous,proposal.revision);clients[id].budgetDraft=draft;syncProviderProposals();showFeedback('Envio desfeito. Os dados continuam no rascunho.','info');}
            catch(error){showFeedback(error.message,'error');}
        }});
    } catch(error) {byId('budget-error').textContent=error.message;byId('budget-error').hidden=false;syncProviderProposals();}
    finally {budgetSending=false;byId('budget-submit').disabled=false;byId('budget-submit').removeAttribute('aria-busy');byId('budget-submit-label').textContent='Enviar Proposta no Chat';}
}
byId('budget-form').addEventListener('input',event=>{clients[budgetClient].budgetDraft=readBudget();const field=event.target;if(field.hasAttribute('aria-invalid')){field.removeAttribute('aria-invalid');byId(field.id+'-error').hidden=true;}byId('budget-error').hidden=true;});
byId('modal-budget').addEventListener('cancel',event=>{if(budgetSending)event.preventDefault();else clients[budgetClient].budgetDraft=readBudget();});
byId('modal-budget').addEventListener('close',()=>{byId('budget-error').hidden=true;});
byId('modal-budget').querySelector('.modal-backdrop').addEventListener('submit',event=>{if(budgetSending)event.preventDefault();else clients[budgetClient].budgetDraft=readBudget();});
byId('chat-input-field').addEventListener('input', () => { clients[currentClient].draft = byId('chat-input-field').value; updateSendButton(); });
const validPhoto = file => ['image/jpeg','image/png','image/webp'].includes(file.type) && file.size > 0 && file.size <= 10*1024*1024;
byId('chat-attachment').addEventListener('change', event => {
    const file = event.target.files[0]; event.target.value = ''; if (!file) return;
    if (!validPhoto(file)) { showFeedback('Escolha uma foto JPG, PNG ou WebP de até 10 MB. Arquivos vazios não são aceitos.', 'error'); return; }
    const recipient = currentClient; const reader = new FileReader();
    byId('provider-chat-status').textContent = 'Processando imagem…';
    reader.onload = () => {
        const image = new Image(); image.onload = () => {
            clients[recipient].updatedAt=Date.now();clients[recipient].messages.push({image:reader.result, filename:file.name, time:timeNow(),createdAt:clients[recipient].updatedAt});
            if (currentClient === recipient && !byId('screen-client-chat').classList.contains('hidden')) renderProviderChat(true);
            if (!byId('screen-provider-messages').classList.contains('hidden')) renderProviderChatList();
            byId('provider-chat-status').textContent = 'Imagem adicionada à conversa de '+clients[recipient].name+'.';
        }; image.onerror = () => showFeedback('Não foi possível abrir esta imagem. Escolha outra foto JPG, PNG ou WebP.', 'error'); image.src = reader.result;
    };
    reader.onerror = () => showFeedback('Não foi possível ler a foto. Selecione o arquivo novamente.', 'error'); reader.readAsDataURL(file);
});
let portfolioDraft = null;
let portfolioVersion = 0;
function portfolioLimit(){return SideQuestPlans.current().photos ?? Infinity;}
function updatePortfolioCount() {
    const count=byId('portfolio-grid').children.length,plan=SideQuestPlans.current(),limit=portfolioLimit(),atLimit=count>=limit;
    byId('portfolio-count').textContent=Number.isFinite(limit)?count+' de '+limit+' fotos no '+plan.name:count+' fotos · ilimitadas no '+plan.name;
    byId('portfolio-plan-limit').textContent=Number.isFinite(limit)?'Seu '+plan.name+' permite até '+limit+' fotos.':'Fotos ilimitadas no '+plan.name+'.';
    byId('portfolio-add').disabled=false;byId('portfolio-add').innerHTML=atLimit?'<i class="fa-solid fa-crown" aria-hidden="true"></i> Ampliar plano':'<i class="fa-solid fa-plus" aria-hidden="true"></i> Adicionar Foto';
    if(count>limit)byId('portfolio-count').textContent+=' · Fotos preservadas; remova trabalhos para publicar novos.';
    byId('provider-pro-verified').hidden=plan.id!=='gold';
}
function openPortfolioWork(button) {
    const image=button.querySelector('img'),title=button.querySelector('.portfolio-caption').textContent;
    byId('portfolio-work-title').textContent=title;byId('portfolio-work-image').src=image.src;byId('portfolio-work-image').alt=image.alt;
    byId('modal-portfolio-work').showModal();
}
function updatePortfolioPublish() {
    const title=byId('portfolio-title').value.trim();
    byId('portfolio-confirm').disabled=!portfolioDraft||!title||title.length>120||byId('portfolio-grid').children.length>=portfolioLimit();
}
function openPortfolioUpload() {
    if (byId('portfolio-grid').children.length >= portfolioLimit()) {openPlansModal();return;}
    ++portfolioVersion;portfolioDraft=null;byId('portfolio-form').reset();
    byId('portfolio-preview').hidden=true;byId('portfolio-preview').removeAttribute('src');byId('portfolio-filename').hidden=true;
    byId('portfolio-error').hidden=true;byId('portfolio-title-error').hidden=true;byId('portfolio-title').removeAttribute('aria-invalid');
    byId('portfolio-status').textContent='Selecione uma foto e informe o título para publicar.';updatePortfolioPublish();byId('modal-crop').showModal();
}
byId('modal-crop').addEventListener('close', () => {
    portfolioVersion++;portfolioDraft=null;byId('portfolio-file').removeAttribute('aria-busy');byId('portfolio-dropzone').removeAttribute('aria-busy');byId('portfolio-dropzone').classList.remove('is-dragging');
    byId('portfolio-preview').hidden=true;byId('portfolio-preview').removeAttribute('src');updatePortfolioPublish();
});
function preparePortfolioPhoto(files) {
    const version=++portfolioVersion;portfolioDraft=null;byId('portfolio-preview').hidden=true;byId('portfolio-preview').removeAttribute('src');byId('portfolio-error').hidden=true;byId('portfolio-filename').hidden=true;
    byId('portfolio-status').textContent='';byId('portfolio-file').removeAttribute('aria-busy');byId('portfolio-dropzone').removeAttribute('aria-busy');updatePortfolioPublish();
    const fail=message=>{if(version!==portfolioVersion)return;byId('portfolio-error').textContent=message;byId('portfolio-error').hidden=false;byId('portfolio-status').textContent='';byId('portfolio-file').removeAttribute('aria-busy');byId('portfolio-dropzone').removeAttribute('aria-busy');};
    if(files.length!==1){fail('Selecione uma foto por vez. Confira no perfil o limite do seu plano.');return;}
    const file=files[0];
    if(!validPhoto(file)){fail('Selecione uma foto JPG, PNG ou WebP de até 10 MB. Arquivos vazios não são aceitos.');return;}
    byId('portfolio-filename').textContent=file.name;byId('portfolio-filename').hidden=false;
    byId('portfolio-status').textContent='Preparando prévia da imagem…';byId('portfolio-file').setAttribute('aria-busy','true');byId('portfolio-dropzone').setAttribute('aria-busy','true');
    const reader=new FileReader();reader.onerror=()=>fail('Não foi possível ler esta foto. Selecione o arquivo novamente.');
    reader.onload=()=>{
        if(version!==portfolioVersion)return;
        const image=new Image();image.onerror=()=>fail('O arquivo não contém uma imagem válida. Escolha outra foto.');
        image.onload=()=>{
            if(version!==portfolioVersion)return;
            portfolioDraft={url:reader.result,name:file.name};byId('portfolio-preview').src=reader.result;byId('portfolio-preview').hidden=false;
            byId('portfolio-status').textContent='Prévia pronta. Confira a foto e o título antes de publicar.';byId('portfolio-file').removeAttribute('aria-busy');byId('portfolio-dropzone').removeAttribute('aria-busy');updatePortfolioPublish();
        };image.src=reader.result;
    };reader.readAsDataURL(file);
}
byId('portfolio-file').addEventListener('change',event=>{const files=[...event.target.files];event.target.value='';if(files.length)preparePortfolioPhoto(files);});
byId('portfolio-title').addEventListener('input',()=>{byId('portfolio-title').removeAttribute('aria-invalid');byId('portfolio-title-error').hidden=true;updatePortfolioPublish();});
byId('portfolio-dropzone').addEventListener('dragover',event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';byId('portfolio-dropzone').classList.add('is-dragging');});
byId('portfolio-dropzone').addEventListener('dragleave',event=>{if(!byId('portfolio-dropzone').contains(event.relatedTarget))byId('portfolio-dropzone').classList.remove('is-dragging');});
byId('portfolio-dropzone').addEventListener('drop',event=>{event.preventDefault();byId('portfolio-dropzone').classList.remove('is-dragging');preparePortfolioPhoto([...event.dataTransfer.files]);});
function confirmPortfolioUpload() {
    if(!portfolioDraft){byId('portfolio-error').textContent='Selecione uma foto válida e aguarde a prévia antes de publicar.';byId('portfolio-error').hidden=false;byId('portfolio-dropzone').focus();return;}
    const title=byId('portfolio-title').value.trim();
    if(!title||title.length>120){byId('portfolio-title-error').textContent='Informe um título de até 120 caracteres para identificar o trabalho.';byId('portfolio-title-error').hidden=false;byId('portfolio-title').setAttribute('aria-invalid','true');byId('portfolio-title').focus();return;}
    if(byId('portfolio-grid').children.length>=portfolioLimit()){byId('portfolio-error').textContent='O limite de fotos do seu plano foi atingido. Remova um trabalho ou altere o plano antes de publicar.';byId('portfolio-error').hidden=false;return;}
    const photo=portfolioDraft,item=document.createElement('figure');item.className='portfolio-item';
    const button=document.createElement('button');button.type='button';button.className='portfolio-photo';button.setAttribute('aria-label','Ver trabalho: '+title);button.onclick=()=>openPortfolioWork(button);
    const image=document.createElement('img');image.src=photo.url;image.alt=title;image.loading='lazy';
    const caption=document.createElement('span');caption.className='portfolio-caption';caption.textContent=title;button.append(image,caption);
    const remove=document.createElement('button');remove.className='btn portfolio-remove';remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remover trabalho: '+title);
    remove.onclick=()=>{
        const position=[...byId('portfolio-grid').children].indexOf(item);item.remove();updatePortfolioCount();byId('portfolio-add').focus({preventScroll:true});
        showFeedback('Trabalho removido do portfólio.','info',{label:'Desfazer',run:()=>{
            if(byId('portfolio-grid').children.length>=portfolioLimit()){showFeedback('O limite do seu plano foi atingido. Remova outra foto antes de restaurar.','error');return;}
            byId('portfolio-grid').insertBefore(item,byId('portfolio-grid').children[position]||null);updatePortfolioCount();showFeedback('Trabalho restaurado.');
        }});
    };
    item.append(button,remove);byId('portfolio-grid').append(item);updatePortfolioCount();byId('modal-crop').close();
    showFeedback('Trabalho publicado no portfólio desta sessão. A foto e o título já aparecem no seu perfil.','success',{label:'Desfazer',run:()=>{item.remove();updatePortfolioCount();showFeedback('Publicação desfeita.','info');}});
}
SideQuestPlans.subscribe(()=>{updatePortfolioCount();updatePortfolioPublish();if(byId('modal-crop').open&&byId('portfolio-grid').children.length>=portfolioLimit()){byId('portfolio-error').textContent='O limite do plano mudou. Seus campos foram preservados; altere o plano ou remova um trabalho para publicar.';byId('portfolio-error').hidden=false;}});
function initChart() { window.SideQuestFinance?.renderChart(); }
document.addEventListener('DOMContentLoaded', () => {syncProviderProposals();renderNav(); filterOpportunities('all'); navigateTo('screen-provider-feed');});
        let feedbackTimer;
        function showFeedback(message, kind = 'success', action = null) {
            const feedback = document.getElementById('app-feedback');
            clearTimeout(feedbackTimer);
            feedback.hidden = false;
            feedback.setAttribute('role', kind === 'error' ? 'alert' : 'status');
            feedback.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
            const card = document.createElement('div'); card.className = 'feedback-card'; card.dataset.kind = kind;
            const copy = document.createElement('div'); copy.className = 'feedback-copy'; copy.textContent = message;
            card.append(copy);
            if (action) {
                const actions = document.createElement('div'); actions.className = 'feedback-actions';
                const button = document.createElement('button'); button.type = 'button'; button.className = 'btn btn-ghost'; button.textContent = action.label;
                button.onclick = () => { feedback.hidden = true; action.run(); }; actions.append(button); copy.append(actions);
            }
            const close = document.createElement('button'); close.type = 'button'; close.className = 'btn btn-ghost btn-square feedback-close'; close.textContent = '×'; close.setAttribute('aria-label', 'Fechar notificação'); close.onclick = () => { feedback.hidden = true; clearTimeout(feedbackTimer); };
            card.append(close); feedback.replaceChildren(card);
            // Errors and undo actions remain available until dismissed or replaced.
            if (!action && kind !== 'error') feedbackTimer = setTimeout(() => feedback.hidden = true, 7000);
        }
