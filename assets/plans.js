/* Shared demonstration subscription: service payments never pass through SideQuest. */
window.SideQuestPlans=(()=>{
 const key='sidequest.subscription.v1.roberto';
 const catalog={basic:{id:'basic',name:'Gratuito',label:'Básico',price:0,photos:3,radius:10,featured:false,direct:false,analytics:false},silver:{id:'silver',name:'Pro Prata',label:'Profissional',price:2990,photos:10,radius:20,featured:false,direct:false,analytics:true},gold:{id:'gold',name:'Pro Ouro',label:'Destaque Total',price:4990,photos:null,radius:50,featured:true,direct:true,analytics:true}};
 const initial=()=>({plan:'gold',renew:true,expires:'2026-11-15',phone:'',bio:'',revision:'example-v1'});
 const valid=record=>record&&catalog[record.plan]&&typeof record.renew==='boolean'&&record.expires==='2026-11-15'&&typeof record.phone==='string'&&(!record.phone||/^55\d{10,11}$/.test(record.phone))&&typeof record.revision==='string'&&(!record.bio||(typeof record.bio==='string'&&record.bio.length<=500));
 function read(){try{const record=JSON.parse(localStorage.getItem(key));return valid(record)?{bio:'',...record}:initial();}catch{return initial();}}
 const listeners=new Set();const notify=()=>listeners.forEach(callback=>callback(read()));
 function update(change,expected){
  if(!['http:','https:'].includes(location.protocol))throw Error('Abra o SideQuest pelo servidor local ou HTTPS para sincronizar os planos.');
  const previous=read();if(expected&&previous.revision!==expected)throw Error('A assinatura mudou em outra aba. Confira o plano atual e tente novamente.');
  const next={...previous,...change,revision:crypto.randomUUID?.()||String(Date.now())};if(!valid(next))throw Error('Confira os dados da assinatura antes de continuar.');
  try{localStorage.setItem(key,JSON.stringify(next));}catch{throw Error('Não foi possível salvar a simulação. Verifique o armazenamento do navegador e tente novamente.');}
  notify();return next;
 }
 window.addEventListener('storage',event=>{if(event.key===key||event.key===null)notify();});
 const current=()=>({...catalog[read().plan]});
 const contactURL=kind=>{const state=read();if(!catalog[state.plan].direct||!state.phone)return '';return kind==='whatsapp'?'https://wa.me/'+state.phone:'tel:+'+state.phone;};
 return {catalog:()=>structuredClone(catalog),read,current,update,contactURL,subscribe:callback=>{listeners.add(callback);return()=>listeners.delete(callback);}};
})();
