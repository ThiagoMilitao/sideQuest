/* Provider Home controls and subscription-dependent service area. */
window.SideQuestProvider = (() => {
  const menu = byId('provider-account-dropdown');
  const trigger = byId('provider-account-trigger');
  const search = byId('provider-opportunity-search');
  const cards = [...document.querySelectorAll('[data-opportunity]')];
  const state = {city:'Santos',radius:10,electric:false,urgent:false,nearby:false,services:['electric'],reducedMotion:false};
  const serviceOptions = [
    ['electric','Elétrica'],['water','Hidráulica'],['paint','Pintura'],['wood','Marcenaria'],
    ['clean','Limpeza'],['renovation','Reformas'],['air','Ar-Condicionado'],['repairs','Pequenos reparos / Montagem']
  ];
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  function closeMenu() { menu.open = false; }
  function inArea(card) { return normalize(card.dataset.city) === normalize(state.city) && Number(card.dataset.distance) <= state.radius; }
  function matchesSearch(card) {
    const text = normalize(card.querySelector('h2').textContent+' '+card.querySelector('.provider-opportunity-description').textContent+' '+card.dataset.district+' '+card.dataset.city+' '+(card.dataset.category === 'electric' ? 'Elétrica' : 'Hidráulica'));
    return normalize(search.value).split(/\s+/).filter(Boolean).every(word => text.includes(word));
  }
  function updateBadge() {
    const count = cards.filter(card => inArea(card) && card.dataset.new === 'true').length;
    const badge = byId('provider-new-count'); if (!badge) return;
    badge.textContent = count; badge.hidden = count === 0; badge.setAttribute('aria-label',count+' novas oportunidades');
    badge.closest('button').setAttribute('aria-label',count ? 'Oportunidades, '+count+' novas' : 'Oportunidades');
  }
  function render() {
    const base = cards.filter(card => inArea(card) && matchesSearch(card));
    let count = 0;
    for (const card of cards) {
      const visible = base.includes(card) && (!state.electric || card.dataset.category === 'electric') && (!state.urgent || card.dataset.urgent === 'true') && (!state.nearby || Number(card.dataset.distance) <= 5);
      card.hidden = !visible; if (visible) count++;
    }
    for (const button of document.querySelectorAll('[data-filter]')) {
      const filter = button.dataset.filter;
      button.setAttribute('aria-pressed',String(filter === 'all' ? !state.electric && !state.urgent && !state.nearby : Boolean(state[filter])));
    }
    byId('provider-all-count').textContent = base.length;
    byId('provider-electric-count').textContent = base.filter(card => card.dataset.category === 'electric').length;
    const distance = state.nearby ? Math.min(5,state.radius) : state.radius;
    byId('opportunity-summary').textContent = count+(count === 1 ? ' chamado disponível em ' : ' chamados disponíveis em ')+state.city+' • até '+distance+' km.';
    byId('opportunity-empty').hidden = count !== 0;
    byId('provider-empty-hint').textContent = cards.some(inArea) ? 'Tente outro serviço ou bairro, remova os filtros ou ajuste seu raio de atendimento.' : 'Não há chamados na cidade e no raio escolhidos. Ajuste a região para ver outras oportunidades.';
    byId('provider-clear-search').hidden = !search.value;
    const label = state.city+' • até '+state.radius+' km';
    byId('provider-radius-label').textContent = label;
    byId('provider-radius-trigger').setAttribute('aria-label','Ajustar raio de atendimento: '+label);
    byId('provider-radius-trigger').title = label;
    updateBadge();
  }
  function filter(kind) {
    if (kind === 'all') state.electric = state.urgent = state.nearby = false;
    else if (['electric','urgent','nearby'].includes(kind)) state[kind] = !state[kind];
    render();
  }
  function clearSearch() { search.value = ''; render(); search.focus(); }
  function resetFilters() { search.value = ''; filter('all'); search.focus(); }
  function markRead(id) { const card = cards.find(item => item.dataset.opportunity === id); if (card) card.dataset.new = 'false'; updateBadge(); }
  function panelError(id,message,field) {
    const target = byId('provider-'+id+'-error'); target.textContent = message; target.hidden = !message;
    if (field) { if (message) {field.setAttribute('aria-invalid','true');field.focus();} else field.removeAttribute('aria-invalid'); }
  }
  function openPanel(panel) {
    const dialog = byId('modal-provider-'+panel); if (!dialog) return;
    closeMenu();
    if (panel === 'radius') {
      applyPlanLimits();
      byId('provider-base-city').value = state.city; byId('provider-radius-range').value = state.radius; byId('provider-radius-output').textContent = state.radius+' km';
      panelError('radius','',byId('provider-base-city'));
    } else if (panel === 'services') {
      byId('provider-service-options').innerHTML = '<legend class="sr-only">Categorias atendidas</legend>'+serviceOptions.map(([id,label]) => `<label class="provider-service-option"><input type="checkbox" name="service" value="${id}" class="checkbox checkbox-primary checkbox-sm" ${state.services.includes(id)?'checked':''}/><span>${label}</span></label>`).join('');
      panelError('services','');

    } else if (panel === 'settings') byId('provider-reduced-motion').checked = state.reducedMotion;
    dialog.showModal();
  }
  menu.addEventListener('toggle',() => trigger.setAttribute('aria-expanded',String(menu.open)));
  document.addEventListener('pointerdown',event => { if (!menu.contains(event.target)) closeMenu(); },{passive:true});
  menu.addEventListener('focusout',event => { if (event.relatedTarget && !menu.contains(event.relatedTarget)) closeMenu(); });
  menu.addEventListener('keydown',event => {
    if (event.key === 'Escape') { event.preventDefault();closeMenu();trigger.focus();return; }
    if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
    event.preventDefault();menu.open = true;
    const buttons = [...menu.querySelectorAll('ul button')];const current = buttons.indexOf(document.activeElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length-1 : event.key === 'ArrowDown' ? (current+1)%buttons.length : current <= 0 ? buttons.length-1 : current-1;
    buttons[index].focus();
  });
  search.addEventListener('input',render);
  byId('provider-search-form').addEventListener('submit',event => { event.preventDefault();render(); });
  byId('provider-radius-range').addEventListener('input',event => { byId('provider-radius-output').textContent = event.target.value+' km'; });
  byId('provider-base-city').addEventListener('input',() => panelError('radius','',byId('provider-base-city')));
  byId('provider-radius-form').addEventListener('submit',event => {
    event.preventDefault();const field = byId('provider-base-city');const city = field.value.trim();const radius = Number(byId('provider-radius-range').value);
    if (city.length < 2) { panelError('radius','Informe o nome da cidade para definir sua região.',field);return; }
    const maximum=SideQuestPlans.current().radius;
    if (!Number.isFinite(radius) || radius < 1 || radius > maximum) { panelError('radius','Escolha um raio entre 1 e '+maximum+' km para seu plano.',byId('provider-radius-range'));return; }
    state.city = city;state.radius = radius;render();byId('modal-provider-radius').close();
    showFeedback('Raio atualizado: '+state.city+', até '+state.radius+' km. As oportunidades foram filtradas.');
  });
  byId('provider-services-form').addEventListener('change',() => panelError('services',''));
  byId('provider-services-form').addEventListener('submit',event => {
    event.preventDefault();const checked = [...event.target.querySelectorAll('input:checked')];
    if (!checked.length) { panelError('services','Selecione pelo menos uma categoria de serviço.');event.target.querySelector('input').focus();return; }
    state.services = checked.map(input => input.value);
    byId('provider-profile-services').textContent = serviceOptions.filter(([id]) => state.services.includes(id)).map(([,label]) => label).join(' • ');
    byId('modal-provider-services').close();showFeedback('Categorias de serviço atualizadas nesta sessão.');
  });
  byId('provider-settings-form').addEventListener('submit',event => {
    event.preventDefault();state.reducedMotion = byId('provider-reduced-motion').checked;
    document.documentElement.classList.toggle('account-reduced-motion',state.reducedMotion);
    if (chartInstance) initChart();
    byId('modal-provider-settings').close();showFeedback('Configurações atualizadas nesta sessão.');
  });
  window.openProviderPanel = openPanel;
  window.switchRole = role => {
    if (role !== 'client') return;
    closeMenu();try {sessionStorage.setItem('sidequest-demo-session','true');} catch {}
    window.location.assign('SideQuestPrototipo.html');
  };
  window.logoutProvider = () => {
    closeMenu();for (const storage of ['sessionStorage','localStorage']) {try {window[storage].removeItem('sidequest-demo-session');} catch {}}
    window.location.assign('SideQuestPrototipo.html');
  };
  function applyPlanLimits(){
    const plan=SideQuestPlans.current();state.radius=Math.min(state.radius,plan.radius);
    byId('provider-radius-range').max=plan.radius;byId('provider-radius-range').value=state.radius;
    byId('provider-radius-output').textContent=state.radius+' km';byId('provider-radius-max-label').textContent=plan.radius+' km';
    byId('provider-radius-plan-hint').textContent='Seu '+plan.name+' permite até '+plan.radius+' km.';render();
  }
  SideQuestPlans.subscribe(applyPlanLimits);
  return {closeMenu,filter,render,clearSearch,resetFilters,markRead,applyPlanLimits};
})();
