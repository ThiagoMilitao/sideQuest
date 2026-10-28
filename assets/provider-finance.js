/* Service management only: negotiated amounts are not wallet balances or payment confirmations. */
window.SideQuestFinance=(()=>{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date());
 const part=name=>Number(parts.find(item=>item.type===name).value);
 const year=part('year'),month=part('month'),day=part('day'),daysInMonth=new Date(Date.UTC(year,month,0)).getUTCDate();
 const stamp=date=>Date.UTC(year,month-1,date,12,35);
 const currency=cents=>money(cents/100).replace(/\u00a0/g,' ');
 const dateLabel=time=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(time);
 const monthLabel=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',month:'long',year:'numeric'}).format(stamp(1));
 const records=Array.from({length:28},(_,index)=>({id:'service-'+index,status:'completed',order:index===0?2084:index===1?2071:2000+index,client:index===0?'Mariana Silva':index===1?'Fernando Almeida':['Ana Souza','Carlos Eduardo','Beatriz Costa','Paulo Santos'][index%4],value:index===0?15000:index===1?32000:index===27?13000:9000,at:stamp(index===0?day:index===1?Math.max(1,day-1):Math.max(1,Math.floor((index-2)*Math.max(1,day-2)/26)+1))}));
 records.push({id:'ongoing-1',status:'ongoing',order:2091,client:'Luiza Mendes',value:54000,at:stamp(day)},{id:'ongoing-2',status:'ongoing',order:2093,client:'Pedro Lima',value:49000,at:stamp(day)});
 let goal=350000,period='month',filter='all';
 function totals(){const completed=records.filter(row=>row.status==='completed');return {total:completed.reduce((sum,row)=>sum+row.value,0),ongoing:records.filter(row=>row.status==='ongoing').reduce((sum,row)=>sum+row.value,0),count:completed.length};}
 function render(){
  const data=totals(),percentage=Math.round(data.total/goal*100);byId('finance-month').textContent=monthLabel;byId('finance-total').textContent=currency(data.total);
  byId('finance-receivable').textContent=currency(data.ongoing);byId('finance-net').textContent=currency(data.total);byId('finance-growth').textContent='+'+Math.round((data.total/241500-1)*100)+'% vs mês anterior';
  byId('finance-ticket').textContent=currency(Math.round(data.total/data.count));byId('finance-completed').textContent=data.count+' O.S. concluídas';
  byId('finance-goal-copy').textContent=currency(data.total)+' de '+currency(goal)+' ('+percentage+'% da meta)';byId('finance-goal-progress').value=Math.min(100,percentage);byId('finance-goal-progress').setAttribute('aria-valuetext',percentage+'% da meta');
  byId('finance-goal-remaining').textContent=data.total>=goal?'Meta alcançada.':'Faltam '+currency(goal-data.total)+' para sua meta.';byId('finance-projection').textContent='Projeção de serviços no mês: '+currency(Math.round(data.total/day*daysInMonth));
  document.querySelectorAll('.provider-income').forEach(element=>element.textContent=currency(data.total));renderTransactions();
 }
 function renderTransactions(){
  const container=byId('finance-transactions');container.replaceChildren();const rows=records.filter(row=>filter==='all'||row.status===filter).sort((a,b)=>b.at-a.at);byId('finance-transaction-count').textContent=rows.length+' serviços';
  for(const row of rows){
   const item=document.createElement('details');item.className='finance-transaction';item.dataset.transactionId=row.id;const summary=document.createElement('summary'),identity=document.createElement('span');
   const title=document.createElement('span');title.className='finance-transaction-title';title.textContent='O.S. #'+row.order+' — '+row.client;
   const date=document.createElement('time');date.className='finance-transaction-date';date.dateTime=new Date(row.at).toISOString();date.textContent=dateLabel(row.at);
   const badge=document.createElement('span');badge.className='badge badge-soft '+(row.status==='completed'?'badge-success':'badge-warning');badge.textContent=row.status==='completed'?'Serviço concluído':'Em andamento';
   const amount=document.createElement('span');amount.className='finance-transaction-amount';amount.textContent=currency(row.value);
   const hint=document.createElement('span');hint.className='finance-transaction-hint';hint.innerHTML='<i class="fa-solid fa-chevron-down" aria-hidden="true"></i> Ver acordo';identity.append(title,date,badge,hint);summary.append(identity,amount);
   const note=document.createElement('p');note.className='direct-payment-note';note.textContent='Valor combinado: '+currency(row.value)+'. Pagamento direto ao profissional, conforme acordo com o cliente. O SideQuest não registra nem confirma o recebimento.';
   item.append(summary,note);container.append(item);
  }
  if(!rows.length){const note=document.createElement('p');note.className='empty-state';note.textContent='Nenhum serviço neste filtro. Selecione Todas para ver os demais.';container.append(note);}
  document.querySelectorAll('[data-finance-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.financeFilter===filter)));
 }
  function chartData() {
    if(period==='month'){
      let cumulative=0;const values=[];
      for(let date=1;date<=day;date++){cumulative+=records.filter(row=>row.status==='completed'&&new Date(row.at).getUTCDate()===date).reduce((sum,row)=>sum+row.value,0);values.push(cumulative/100);}
      return {labels:values.map((_,index)=>String(index+1).padStart(2,'0')),values,description:'Este mês · valores de serviços acumulados por dia'};
    }
    const months=period==='quarter'?[month-3,month-2,month-1]:Array.from({length:month},(_,index)=>index);
    const history=[1280,1450,1600,1710,1820,1950,2190,2310,2415,2850,2920,3100];
    return {labels:months.map(index=>new Intl.DateTimeFormat('pt-BR',{timeZone:'UTC',month:'short'}).format(new Date(Date.UTC(year,index,1)))),values:months.map((index,i)=>i===months.length-1?totals().total/100:history[(index+12)%12]),description:period==='quarter'?'Últimos 3 meses · valores de serviços de cada mês':'Ano até o mês atual · valores de serviços de cada mês'};
  }
  function renderChart() {
    const data=chartData();byId('finance-chart-summary').textContent=data.description+' · dados ilustrativos.';
    byId('financeChart').setAttribute('aria-label',data.description+'. Valores disponíveis abaixo do gráfico.');
    const list=byId('finance-chart-values');list.replaceChildren();data.labels.forEach((label,index)=>{const item=document.createElement('li');item.textContent=label+': '+money(data.values[index]);list.append(item);});
    document.querySelectorAll('[data-finance-period]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.financePeriod===period)));
    if(typeof Chart==='undefined')return;
    if(chartInstance)chartInstance.destroy();
    chartInstance=new Chart(byId('financeChart'),{type:'line',data:{labels:data.labels,datasets:[{label:'Valores combinados (R$)',data:data.values,borderColor:'#21664d',backgroundColor:'#21664d10',fill:true,tension:.25,borderWidth:2,pointRadius:period==='month'?1:3,pointHoverRadius:5}]},options:{responsive:true,maintainAspectRatio:false,animation:SideQuestMotion.reduced()?false:{duration:180},interaction:{mode:'index',intersect:false},plugins:{legend:{display:false},tooltip:{callbacks:{label:context=>money(context.parsed.y)}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:7}},y:{beginAtZero:true,ticks:{maxTicksLimit:5,callback:value=>money(value)}}}}});
  }
  function openGoal(){byId('finance-goal-input').value=goal/100;byId('finance-goal-input').removeAttribute('aria-invalid');byId('finance-goal-error').hidden=true;byId('modal-finance-goal').showModal();}
 const columns=['Data (São Paulo)','O.S.','Cliente','Status do serviço','Valor combinado (R$)'];
 const rowsForReport=()=>[...records].sort((a,b)=>b.at-a.at).map(row=>[dateLabel(row.at),'#'+row.order,row.client,row.status==='completed'?'Concluído':'Em andamento',(row.value/100).toFixed(2).replace('.',',')]);
 function buildCSV(){const data=totals();const rows=[['SideQuest — Relatório de serviços',monthLabel],['Roberto Alves — demonstração sem validade fiscal'],['Pagamento negociado e recebido diretamente pelo profissional. Sem processamento pelo SideQuest.'],['Valores de serviços concluídos (R$)',(data.total/100).toFixed(2)],['Serviços em andamento (R$)',(data.ongoing/100).toFixed(2)],[],columns,...rowsForReport()];return '\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value).replace(/^[=+@\t\r]/,"'$&").replaceAll('"','""')+'"').join(';')).join('\r\n');}
 function downloadCSV(){const url=URL.createObjectURL(new Blob([buildCSV()],{type:'text/csv;charset=utf-8;'})),anchor=document.createElement('a');anchor.href=url;anchor.download='SideQuest-Servicos-'+year+'-'+String(month).padStart(2,'0')+'.csv';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);byId('modal-finance-report').close();showFeedback('Download do relatório de serviços solicitado. Não é comprovante de pagamento.');}
 function printReport(){
  const container=byId('finance-print-report');container.replaceChildren();const title=document.createElement('h1');title.textContent='SideQuest · Relatório de serviços';const note=document.createElement('p');note.textContent='Roberto Alves · '+monthLabel+' · Demonstração sem validade fiscal. Pagamento direto entre cliente e profissional. O SideQuest não processa nem confirma recebimentos.';
  const data=totals(),summary=document.createElement('p');summary.textContent='Valores combinados: concluídos '+currency(data.total)+' | Em andamento '+currency(data.ongoing)+'.';
  const table=document.createElement('table'),head=document.createElement('thead'),body=document.createElement('tbody'),row=document.createElement('tr');columns.forEach(label=>{const th=document.createElement('th');th.textContent=label;row.append(th);});head.append(row);rowsForReport().forEach(values=>{const tr=document.createElement('tr');values.forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});body.append(tr);});table.append(head,body);container.append(title,note,summary,table);byId('modal-finance-report').close();window.print();
 }
 byId('finance-goal-form').addEventListener('submit',event=>{event.preventDefault();const field=byId('finance-goal-input'),value=Number(field.value);if(!field.value||!Number.isFinite(value)||value<1||value>1000000||field.validity.stepMismatch){field.setAttribute('aria-invalid','true');byId('finance-goal-error').textContent='Informe uma meta entre R$ 1,00 e R$ 1.000.000,00, com até duas casas decimais.';byId('finance-goal-error').hidden=false;field.focus();return;}goal=Math.round(value*100);render();byId('modal-finance-goal').close();showFeedback('Meta de serviços atualizada nesta sessão.');});
 document.querySelectorAll('[data-finance-period]').forEach(button=>button.addEventListener('click',()=>{period=button.dataset.financePeriod;renderChart();}));
 document.querySelectorAll('[data-finance-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.financeFilter;renderTransactions();}));
 document.addEventListener('DOMContentLoaded',render);
 return {render,renderChart,openGoal,downloadCSV,printReport,buildCSV,totals};
})();
