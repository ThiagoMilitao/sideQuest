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
const screenshot=async name=>{await pause(350);await fs.mkdir('/tmp/sidequest-provider-finance',{recursive:true});const result=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile('/tmp/sidequest-provider-finance/'+name+'.png',Buffer.from(result.data,'base64'));};
try {
 await send('Runtime.enable');await send('Page.enable');await send('Page.bringToFront');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});await viewport(390);
 await navigate('SideQuestPrestador.html');await evaluate(`navigateTo('screen-provider-dashboard')`);await pause(300);
 await assert(`SideQuestFinance.totals().total===285000 && document.getElementById('finance-total').textContent==='R$ 2.850,00'`,'service totals reconcile without wallet balances');
 await assert(`SideQuestFinance.totals().ongoing===103000&&SideQuestFinance.totals().count===28`,'ongoing agreements are separate from completed services');
 await assert(`document.getElementById('finance-ticket').textContent==='R$ 101,79'`,'average service amount is correctly rounded');
 await assert(`!document.getElementById('modal-finance-withdraw')&&!document.getElementById('modal-provider-pix')&&!/(saldo disponível|saque|custódia|Taxa App)/i.test(document.getElementById('screen-provider-dashboard').textContent)`,'retired payment processing controls and terminology are absent');
 await assert(`document.querySelector('#screen-provider-dashboard .direct-payment-note').textContent.includes('recebido diretamente por você')`,'dashboard explains direct service payment');
 await assert(`chartInstance.data.datasets[0].data.at(-1)===2850`,'chart reflects negotiated value of completed services');
 await evaluate(`document.querySelector('[data-finance-period=quarter]').click()`);
 await assert(`chartInstance.data.labels.length===3&&chartInstance.data.datasets[0].data.at(-1)===2850`,'quarter filter changes service chart');
 await evaluate(`document.querySelector('[data-finance-filter=completed]').click()`);
 await assert(`document.querySelectorAll('.finance-transaction').length===28`,'completed filter shows twenty-eight services');
 await evaluate(`document.querySelector('[data-transaction-id=service-0]').open=true`);
 await assert(`document.querySelector('[data-transaction-id=service-0]').textContent.includes('150,00')&&!document.querySelector('[data-transaction-id=service-0]').textContent.includes('135,00')`,'Mariana agreement retains entire R$150 with no commission deducted');
 await evaluate(`document.querySelector('[data-finance-filter=ongoing]').click()`);
 await assert(`document.querySelectorAll('.finance-transaction').length===2`,'ongoing filter shows service execution state rather than custody');
 await assert(`SideQuestFinance.buildCSV().includes('Mariana Silva')&&SideQuestFinance.buildCSV().includes('Valor combinado')&&!/saque|custódia|Taxa App/i.test(SideQuestFinance.buildCSV())`,'CSV includes all agreements without platform payment entries');
 await evaluate(`SideQuestFinance.openGoal();document.getElementById('finance-goal-input').value='0';document.getElementById('finance-goal-form').requestSubmit()`);
 await assert(`!document.getElementById('finance-goal-error').hidden`,'invalid service goal receives inline validation');
 await evaluate(`document.getElementById('finance-goal-input').value='4000';document.getElementById('finance-goal-form').requestSubmit()`);
 await assert(`document.getElementById('finance-goal-progress').value===71`,'goal changes update service progress');
 await evaluate(`SideQuestFinance.printReport()`);
 await assert(`document.querySelectorAll('#finance-print-report tbody tr').length===30&&document.getElementById('finance-print-report').textContent.includes('não processa nem confirma')`,'print report clearly separates agreements from receipt confirmation');
 const pdf=await send('Page.printToPDF',{printBackground:true});await fs.mkdir('/tmp/sidequest-provider-finance',{recursive:true});await fs.writeFile('/tmp/sidequest-provider-finance/servicos.pdf',Buffer.from(pdf.data,'base64'));
 for(const width of [320,390,768,1280]){await viewport(width);await pause(150);await assert(`document.getElementById('screen-provider-dashboard').scrollWidth<=document.getElementById('screen-provider-dashboard').clientWidth+1`,'service dashboard fits '+width+'px');}
 if(errors.length)throw Error(errors.join('\n'));console.log(checks+' service-management checks passed. No uncaught browser errors.');
}finally{ws.close();}
