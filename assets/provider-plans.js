window.SideQuestPlanUI=(()=>{
 let pending=null,expected=null,changing=false;
 const moneyPlan=cents=>money(cents/100).replace(/\u00a0/g,' ');
 const benefits={basic:['Até 3 fotos no portfólio','Buscas simples na região (até 10 km)'],silver:['Até 10 fotos + descrição personalizada','Atendimento em até 20 km','Métricas de visitas do perfil'],gold:['Topo da Home: seção Profissionais em Destaque','Botões de WhatsApp e ligação direta','Fotos ilimitadas + selo Verificado Pro','Notificações prioritárias de novas O.S. até 50 km','Métricas de visitas do perfil']};
 function render(){
  const state=SideQuestPlans.read(),plan=SideQuestPlans.current();
  byId('provider-plan-badge').textContent=plan.name;
  byId('plans-current-title').textContent='Você está no Plano '+plan.name;
  byId('plans-current-until').textContent=state.plan==='basic'?'Gratuito · sem mensalidade':'Ativo até 15/11/2026';
  byId('plans-renewal-status').textContent=state.plan==='basic'?'Seu plano é gratuito.':'Renovação automática '+(state.renew?'ativada.':'cancelada. Seus benefícios continuam até 15/11/2026.');
  byId('plans-renewal-toggle').hidden=state.plan==='basic';byId('plans-renewal-toggle').textContent=state.renew?'Cancelar renovação automática':'Reativar renovação automática';
  byId('plans-analytics').hidden=!plan.analytics;
  byId('plans-description-form').hidden=state.plan==='basic';
  byId('provider-profile-bio').textContent=plan.analytics&&state.bio?state.bio:'Profissional especializado em instalações elétricas residenciais, manutenções preventivas, montagem de quadros de disjuntores e iluminação LED.';
  byId('provider-priority-notice').hidden=state.plan!=='gold';
  const container=byId('plans-comparison');container.replaceChildren();
  for(const item of Object.values(SideQuestPlans.catalog())){
   const card=document.createElement('article');card.className='card plan-card'+(item.id==='gold'?' plan-gold':'');
   const badge=document.createElement('span');badge.className='badge '+(item.id==='gold'?'badge-warning':'badge-soft');badge.textContent=item.id==='gold'?'Mais Popular · Escolha dos Líderes':item.label;
   const title=document.createElement('h3');title.textContent='Plano '+item.name;
   const price=document.createElement('p');price.className='plan-price';price.textContent=moneyPlan(item.price)+' / mês';
   const list=document.createElement('ul');for(const benefit of benefits[item.id]){const li=document.createElement('li');const icon=document.createElement('i');icon.className='fa-solid fa-circle-check';icon.setAttribute('aria-hidden','true');const text=document.createElement('span');text.textContent=benefit;li.append(icon,text);list.append(li);}
   const active=state.plan===item.id,button=document.createElement('button');button.type='button';button.className='btn '+(active?'btn-success font-extrabold':'btn-outline');button.dataset.choosePlan=item.id;
   button.textContent=active?(item.id==='basic'?'Plano Atual (Básico)':'✓ Plano Ativo (Gerenciar Assinatura)'):'Mudar para '+(item.id==='basic'?'Básico':item.name.replace('Pro ',''));
   button.disabled=active&&item.id==='basic';button.onclick=()=>active?manage():choose(item.id);card.append(badge,title,price,list,button);container.append(card);
  }
  SideQuestProvider.applyPlanLimits();updatePortfolioCount();
 }
 function open(){SideQuestProvider.closeMenu();byId('plans-error').hidden=true;byId('plans-feedback').textContent='';byId('plans-management').hidden=true;byId('plans-public-phone').value=SideQuestPlans.read().phone;render();byId('modal-provider-plans').showModal();}
 function manage(){byId('plans-management').hidden=false;byId('plans-public-phone').value=SideQuestPlans.read().phone;byId('plans-description').value=SideQuestPlans.read().bio;byId('plans-manage-title').focus();byId('plans-management').scrollIntoView({block:'nearest'});}
 function choose(id){
  pending=id;expected=SideQuestPlans.read().revision;const plan=SideQuestPlans.catalog()[id],count=byId('portfolio-grid').children.length;
  const summary=byId('plan-change-summary');summary.replaceChildren();
  for(const text of ['Novo plano: '+plan.name,moneyPlan(plan.price)+' / mês','Área de atendimento: até '+plan.radius+' km',plan.photos===null?'Fotos ilimitadas.':'Limite de '+plan.photos+' fotos. '+(count>plan.photos?'Suas '+count+' fotos serão preservadas, mas novas publicações ficam bloqueadas até adequar a quantidade.':'')]){const paragraph=document.createElement('p');paragraph.textContent=text;summary.append(paragraph);}
  byId('plan-change-error').hidden=true;byId('modal-plan-change').showModal();
 }
 function confirm(){
  if(changing||!pending)return;changing=true;byId('plan-change-confirm').disabled=true;
  try{SideQuestPlans.update({plan:pending,renew:pending!=='basic'},expected);pending=null;byId('modal-plan-change').close();byId('plans-feedback').textContent='Plano atualizado na demonstração. Nenhuma cobrança foi realizada.';}
  catch(error){byId('plan-change-error').textContent=error.message;byId('plan-change-error').hidden=false;}
  finally{changing=false;byId('plan-change-confirm').disabled=false;}
 }
 function toggleRenewal(){try{const state=SideQuestPlans.read();SideQuestPlans.update({renew:!state.renew},state.revision);byId('plans-feedback').textContent='Preferência de renovação atualizada na demonstração.';}catch(error){byId('plans-error').textContent=error.message;byId('plans-error').hidden=false;}}
 byId('plans-contact-form').addEventListener('submit',event=>{
  event.preventDefault();const field=byId('plans-public-phone'),raw=field.value.replace(/\D/g,''),phone=raw?(raw.startsWith('55')&&raw.length>=12?raw:'55'+raw):'';
  if((field.value.trim()&&!raw)||(phone&&!/^55\d{10,11}$/.test(phone))){byId('plans-error').textContent='Informe DDD e telefone, com 10 ou 11 dígitos. Deixe vazio para retirar o contato público.';byId('plans-error').hidden=false;field.focus();return;}
  try{const state=SideQuestPlans.read();SideQuestPlans.update({phone},state.revision);byId('plans-error').hidden=true;byId('plans-feedback').textContent=phone?'Contato público salvo. Os botões de contato ficam disponíveis no Ouro.':'Contato público removido.';}catch(error){byId('plans-error').textContent=error.message;byId('plans-error').hidden=false;}
 });
 byId('plans-description-form').addEventListener('submit',event=>{event.preventDefault();const bio=byId('plans-description').value.trim();try{const state=SideQuestPlans.read();if(state.plan==='basic')throw Error('A descrição personalizada está disponível nos planos Prata e Ouro.');SideQuestPlans.update({bio},state.revision);byId('plans-feedback').textContent='Descrição personalizada salva na demonstração.';}catch(error){byId('plans-error').textContent=error.message;byId('plans-error').hidden=false;}});
 byId('modal-plan-change').addEventListener('close',()=>{pending=null;expected=null;});
 SideQuestPlans.subscribe(render);window.openPlansModal=open;render();
 return {open,manage,choose,confirm,toggleRenewal};
})();
