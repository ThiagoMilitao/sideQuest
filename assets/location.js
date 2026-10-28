/* Local saved/recent addresses; online lookup is explicitly submitted by the user. */
window.SideQuestLocation = (() => {
  const byId = id => document.getElementById(id);
  const dialog = byId('modal-location');
  const input = byId('location-search');
  const config = window.SIDEQUEST_LOCATION_CONFIG || {};
  const geocoder = config.geocoder || 'https://nominatim.openstreetmap.org/';
  const cepService = config.cepService || 'https://viacep.com.br/ws/';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const recent = [];
  const cache = new Map();
  let selected = {...clientAccount.addresses[0], savedId:clientAccount.addresses[0]?.id};
  let version = 0;
  let controller = null;
  let busy = false;
  let nextGeocodeAt = 0;

  function status(message = '') {
    byId('location-status').textContent = message; byId('location-status').hidden = !message;
  }
  function error(message = '', invalid = false) {
    byId('location-error').textContent = message; byId('location-error').hidden = !message;
    if (invalid) input.setAttribute('aria-invalid','true'); else input.removeAttribute('aria-invalid');
  }
  function setBusy(kind = '') {
    busy = Boolean(kind);
    for (const id of ['location-search-submit','location-gps']) {
      byId(id).disabled = busy;
      if (busy) byId(id).setAttribute('aria-busy','true'); else byId(id).removeAttribute('aria-busy');
    }
    byId('location-gps-spinner').hidden = kind !== 'gps';
    byId('location-search-spinner').hidden = kind !== 'search';
    byId('location-gps-caption').textContent = kind === 'gps' ? 'Obtendo sua posição…' : 'Ativar GPS do dispositivo';
  }
  function cancelPending() {
    version++; controller?.abort(); controller = null; setBusy();
    return version;
  }
  function sameLocation(a,b) {
    if (a.address && b.address) return normalize(a.address) === normalize(b.address);
    return a.coordinates && b.coordinates && a.coordinates.latitude === b.coordinates.latitude && a.coordinates.longitude === b.coordinates.longitude;
  }
  function addressButton(item, kind) {
    const row = document.createElement('li'); const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-ghost location-address-card';
    button.dataset.locationKind = kind; if (item.id !== undefined) button.dataset.locationId = String(item.id);
    const active = (kind === 'saved' && selected.savedId === item.id) || sameLocation(item,selected);
    button.setAttribute('aria-pressed', String(Boolean(active)));
    const icon = document.createElement('span'); icon.className = 'location-address-icon';
    const glyph = document.createElement('i'); glyph.className = 'fa-solid fa-' + (kind === 'recent' ? 'clock-rotate-left' : kind === 'saved' ? (normalize(item.label).includes('trabalho') ? 'briefcase' : 'house') : 'location-dot'); glyph.setAttribute('aria-hidden','true'); icon.append(glyph);
    const copy = document.createElement('span'); copy.className = 'location-address-copy';
    const title = document.createElement('span'); title.className = 'location-option-title'; title.textContent = kind === 'saved' ? item.label : item.location;
    const detail = document.createElement('span'); detail.className = 'location-option-detail'; detail.textContent = item.address || item.description;
    copy.append(title,detail); button.append(icon,copy);
    if (active) { const badge = document.createElement('span'); badge.className = 'badge badge-soft badge-primary location-active'; badge.textContent = 'Ativo'; button.append(badge); }
    button.addEventListener('click', () => select({...item, savedId:kind === 'saved' ? item.id : item.savedId}));
    row.append(button); return row;
  }
  function renderSaved() {
    const list = byId('location-saved-list'); list.replaceChildren(...clientAccount.addresses.map(item => addressButton(item,'saved')));
    byId('location-saved-empty').hidden = clientAccount.addresses.length !== 0;
    byId('location-recent-section').hidden = !recent.length;
    byId('location-recent-list').replaceChildren(...recent.map(item => addressButton(item,'recent')));
  }
  function results(items) {
    byId('location-results').replaceChildren(...items.map(item => addressButton(item,'result')));
    byId('location-results-section').hidden = !items.length;
  }
  function open() {
    closeAccountMenu(); cancelPending(); input.value = ''; error(); status(); results([]);
    byId('location-manual').hidden = true; renderSaved();
    dialog.showModal(); byId('location-title').focus({preventScroll:true});
  }
  function select(item) {
    if (!item || !item.location) return;
    cancelPending(); selected = {...item};
    if (!item.savedId && !clientAccount.addresses.some(saved => sameLocation(saved,item))) {
      const previous = recent.findIndex(entry => sameLocation(entry,item)); if (previous >= 0) recent.splice(previous,1);
      recent.unshift({...item}); recent.splice(5);
    }
    byId('current-location').textContent = item.location;
    const pill = document.querySelector('.location-button');
    pill.setAttribute('aria-label','Alterar localização: '+item.location); pill.title = item.address || item.description || item.location;
    // Cancel a pending GPS query from the order form as well, so a stale result
    // cannot overwrite a saved address selected here.
    requestLocationVersion++; requestCoordinates = item.coordinates ? {...item.coordinates} : null;
    byId('os-address').value = item.address || '';
    byId('os-address').defaultValue = item.address || '';
    byId('request-location-button').disabled = false; byId('request-location-button').removeAttribute('aria-busy');
    clearRequestError('address','os-address');
    const hint = byId('request-location-status'); hint.hidden = !item.coordinates && !item.needsNumber;
    hint.textContent = item.coordinates ? 'Posição aproximada capturada. Confira a rua, o número e o complemento antes de publicar.' : 'Complete o número e o complemento do endereço antes de publicar.';
    if (dialog.open) dialog.close();
    showFeedback(item.coordinates ? 'Localização aproximada selecionada. Confira o endereço e o número na solicitação.' : 'Endereço selecionado. Confira o número e o complemento na solicitação.', 'info');
  }
  function selectSaved(id) {
    const item = clientAccount.addresses.find(address => address.id === Number(id));
    if (item) select({...item, savedId:item.id});
  }
  function onInput() {
    cancelPending(); error(); status();
    const query = input.value.trim(); const words = normalize(query).split(/\s+/).filter(Boolean);
    const local = [...clientAccount.addresses,...recent].filter((item,index,array) => words.length && words.every(word => normalize(item.label+' '+item.address+' '+item.location).includes(word)) && array.findIndex(other => sameLocation(item,other)) === index);
    results(local.map(item => ({...item, savedId:item.id})));
    byId('location-manual').hidden = query.length < 3 || /^[\d\s-]+$/.test(query);
    if (query && !local.length) status('Toque em Buscar para consultar esse endereço.');
  }
  function fromGeocoder(data) {
    const address = data.address || {};
    const road = address.road || address.pedestrian || address.residential || address.footway || '';
    const district = address.suburb || address.neighbourhood || address.quarter || address.city_district || '';
    const city = address.city || address.town || address.village || address.municipality || address.county || '';
    const state = (address['ISO3166-2-lvl4'] || '').replace('BR-','') || address.state || '';
    const street = [road,address.house_number].filter(Boolean).join(', ');
    const place = [city,state].filter(Boolean).join(' / ');
    const full = [street,district,place,address.postcode].filter(Boolean).join(' - ') || String(data.display_name || '');
    if (!full) throw Error('invalid-address');
    return {address:full, location:[district,city].filter(Boolean).join(', ') || city || String(data.name || full), needsNumber:!address.house_number};
  }
  async function wait(milliseconds, signal) {
    if (signal.aborted) throw new DOMException('Cancelled','AbortError');
    await new Promise((resolve,reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled','AbortError')); };
      const timer = setTimeout(() => { signal.removeEventListener('abort',abort); resolve(); },milliseconds);
      signal.addEventListener('abort',abort,{once:true});
    });
  }
  async function lookup(url, signal, geocode = false) {
    const key = String(url);
    if (cache.has(key)) return cache.get(key);
    // The public OSM service is queried only on explicit search/GPS actions,
    // never per keystroke, with at least 1.1 seconds between requests.
    if (geocode) {
      if (!['http:','https:'].includes(location.protocol)) throw Error('online-unavailable');
      await wait(Math.max(0,nextGeocodeAt-Date.now()),signal);
      nextGeocodeAt = Date.now()+1100;
    }
    const response = await fetch(url,{signal, headers:{Accept:'application/json'}, referrerPolicy:'strict-origin-when-cross-origin'});
    if (!response.ok) throw Error('lookup-failed');
    const data = await response.json();
    if (cache.size >= 30) cache.delete(cache.keys().next().value);
    cache.set(key,data); return data;
  }
  async function search(event) {
    event?.preventDefault(); if (busy) return;
    const query = input.value.trim(); const token = cancelPending(); error();
    if (query.length < 3) { error('Digite pelo menos 3 caracteres ou um CEP de 8 dígitos.',true); input.focus(); return; }
    const numeric = /^[\d\s-]+$/.test(query); const digits = query.replace(/\D/g,'');
    if (numeric && digits.length !== 8) { error('O CEP deve ter 8 dígitos. Exemplo: 01001-000.',true); input.focus(); return; }
    controller = new AbortController(); const signal = controller.signal;
    const timeout = setTimeout(() => { if (token === version) controller?.abort(); },10000);
    setBusy('search'); status('Buscando endereços…'); results([]);
    try {
      let items;
      if (numeric) {
        const data = await lookup(new URL(digits+'/json/',cepService),signal);
        items = data.erro ? [] : [{address:[data.logradouro,data.bairro,[data.localidade,data.uf].filter(Boolean).join(' / '),data.cep].filter(Boolean).join(' - '), location:[data.bairro,data.localidade].filter(Boolean).join(', '), needsNumber:true}];
      } else {
        const url = new URL('search',geocoder); url.search = new URLSearchParams({q:query,format:'jsonv2',addressdetails:'1',countrycodes:'br',limit:'5','accept-language':'pt-BR'});
        const data = await lookup(url,signal,true); if (!Array.isArray(data)) throw Error('invalid-results');
        items = data.map(fromGeocoder);
      }
      if (token !== version || !dialog.open) return;
      results(items); status(items.length ? 'Selecione um endereço abaixo. Confira o número e o complemento na solicitação.' : 'Nenhum endereço encontrado. Inclua a cidade ou tente outro CEP.');
    } catch (reason) {
      if (token !== version || !dialog.open) return;
      status(); error(signal.aborted ? 'A busca demorou mais que o esperado. Tente novamente ou informe o endereço manualmente.' : numeric ? 'Não foi possível consultar o CEP. Tente novamente ou digite rua, número e cidade para continuar.' : 'Não foi possível consultar o endereço. Tente novamente, escolha um endereço salvo ou use o endereço que digitou.');
    } finally {
      clearTimeout(timeout); if (token === version) { controller = null; setBusy(); }
    }
  }
  function gpsFailure(message) { setBusy(); status(); error(message); }
  function useGPS() {
    if (busy) return;
    const token = cancelPending(); error();
    if (!navigator.geolocation) { gpsFailure('Seu navegador não oferece GPS. Busque um endereço ou escolha um local salvo.'); return; }
    setBusy('gps'); status('Buscando sua localização. Autorize o GPS quando o navegador solicitar.');
    navigator.geolocation.getCurrentPosition(async position => {
      if (token !== version || !dialog.open) return;
      const {latitude,longitude,accuracy} = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>90 || Math.abs(longitude)>180) { gpsFailure('O GPS retornou uma posição inválida. Tente novamente ou busque um endereço.'); return; }
      const coordinates = {latitude,longitude,accuracy};
      const point = latitude.toFixed(5)+', '+longitude.toFixed(5);
      const fallback = {location:'Localização atual',address:'',description:'GPS: '+point,coordinates};
      controller = new AbortController(); const signal = controller.signal;
      const timeout = setTimeout(() => { if (token === version) controller?.abort(); },10000);
      status('Posição capturada. Identificando o endereço aproximado…');
      try {
        const url = new URL('reverse',geocoder); url.search = new URLSearchParams({lat:latitude,lon:longitude,format:'jsonv2',addressdetails:'1',zoom:'18','accept-language':'pt-BR'});
        const data = await lookup(url,signal,true); if (data.error) throw Error('no-address');
        if (token === version && dialog.open) select({...fromGeocoder(data),coordinates});
      } catch (reason) {
        if (token === version && dialog.open) select(fallback);
      } finally { clearTimeout(timeout); }
    }, reason => {
      if (token !== version || !dialog.open) return;
      gpsFailure(reason.code === 1 ? 'Acesso ao GPS não permitido. Autorize a localização no navegador ou busque seu endereço.' : reason.code === 3 ? 'O GPS demorou para responder. Tente novamente ou escolha um endereço salvo.' : 'Não foi possível obter sua posição. Busque um endereço ou tente o GPS novamente.');
    },{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
  }
  byId('location-search-form').addEventListener('submit',search);
  input.addEventListener('input',onInput);
  byId('location-manual').addEventListener('click', () => {
    const text = input.value.trim(); if (text.length < 3 || /^[\d\s-]+$/.test(text)) return;
    select({address:text,location:text.split(',').slice(-2).join(',').trim(),needsNumber:true});
  });
  dialog.addEventListener('close', () => { if (!dialog.open) cancelPending(); });
  // Keep direct showModal() callers in sync without replacing the native API.
  new MutationObserver(() => { if (dialog.open) renderSaved(); }).observe(dialog,{attributes:true,attributeFilter:['open']});
  window.useCurrentGPS = useGPS;
  window.selectLocation = value => {
    if (typeof value === 'object') select(value);
    else { const saved = clientAccount.addresses.find(item => item.location === value); if (saved) selectSaved(saved.id); }
  };
  return {open,search,useGPS,selectSaved};
})();
