/* Small motion controller; embedded in the client to keep that HTML standalone. */
window.SideQuestMotion = (() => {
  const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reduceQuery.matches || document.documentElement.classList.contains('account-reduced-motion');
  const activeAnimations = new Map();
  const loading = new Map();
  const seenMessages = new WeakSet();
  let inputMethod = 'pointer';
  function setInputMethod(method) {
    if (inputMethod === method) return;
    inputMethod = method; document.documentElement.dataset.sqInput = method;
    if (method === 'keyboard') cancelLoads();
  }
  document.addEventListener('pointerdown', () => setInputMethod('pointer'), {passive:true, capture:true});
  document.addEventListener('keydown', () => setInputMethod('keyboard'), true);

  // Pointer Events give immediate press feedback on touch browsers that defer
  // the native :active state until the compatibility mouse event.
  let pressed = null;
  function releasePress() { pressed?.classList.remove('sq-pressed'); pressed = null; }
  document.addEventListener('pointerdown', event => {
    if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
    releasePress();
    const target = event.target.closest?.('button.btn, a.btn, summary.btn, .professional-card');
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    pressed = target; pressed.classList.add('sq-pressed');
  }, {passive:true});
  document.addEventListener('pointerup', releasePress, {passive:true});
  document.addEventListener('pointercancel', releasePress, {passive:true});
  document.addEventListener('pointerout', event => {
    if (pressed?.contains(event.target) && !pressed.contains(event.relatedTarget)) releasePress();
  }, {passive:true});
  document.addEventListener('scroll', releasePress, {passive:true, capture:true});
  window.addEventListener('blur', releasePress);

  function play(element, frames, options) {
    if (!element || reduced() || !element.animate) return;
    activeAnimations.get(element)?.cancel();
    const animation = element.animate(frames, options);
    activeAnimations.set(element, animation);
    const cleanup = () => { if (activeAnimations.get(element) === animation) activeAnimations.delete(element); };
    animation.onfinish = cleanup; animation.oncancel = cleanup;
  }
  function finishLoading(host) {
    const state = loading.get(host); if (!state) return;
    clearTimeout(state.timer); state.overlay.remove(); host.removeAttribute('data-sq-loading');
    host.removeAttribute('aria-busy'); loading.delete(host);
  }
  function cancelLoads() { for (const host of loading.keys()) finishLoading(host); }
  function skeleton(host, categories = false) {
    if (!host || !host.children.length || host.closest('.hidden') || inputMethod === 'keyboard' || reduced()) return;
    if (!categories && !host.querySelector('.professional-card')) return;
    finishLoading(host);
    let region = host.parentElement;
    if (!region.classList.contains('sq-loading-region')) {
      region = document.createElement('div'); region.className = 'sq-loading-region';
      host.before(region); region.append(host);
    }
    const overlay = document.createElement('div');
    overlay.className = 'sq-skeleton-overlay' + (categories ? ' sq-skeleton-categories' : '');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); finishLoading(host); }, {once:true});
    for (let index = 0; index < (categories ? 8 : 2); index++) {
      const placeholder = document.createElement('div');
      placeholder.className = categories ? 'sq-skeleton-category' : 'sq-skeleton-card';
      placeholder.innerHTML = categories
        ? '<div class="sq-skeleton-symbol"></div><div class="sq-skeleton-bar"></div>'
        : '<div class="sq-skeleton-header"><div class="sq-skeleton-avatar"></div><div class="sq-skeleton-lines"><div class="sq-skeleton-bar"></div><div class="sq-skeleton-bar"></div></div></div><div class="sq-skeleton-bar"></div><div class="sq-skeleton-bar"></div>';
      overlay.append(placeholder);
    }
    // Simulated local loading: data and controls stay mounted; no deferred render
    // can overwrite a newer filter, search or navigation action.
    host.dataset.sqLoading = ''; host.setAttribute('aria-busy','true'); region.append(overlay);
    const timer = setTimeout(() => finishLoading(host), 360);
    loading.set(host, {overlay, timer});
  }
  // Never leave an invisible focus target when a user starts interacting.
  document.addEventListener('focusin', event => {
    for (const host of loading.keys()) if (host.contains(event.target)) finishLoading(host);
  });
  document.addEventListener('pointerdown', event => {
    for (const host of loading.keys()) if (host.contains(event.target)) finishLoading(host);
  }, {passive:true});
  function enterScreen(screen, changed = true) {
    if (!changed || !screen || inputMethod === 'keyboard') return;
    if (['screen-client-create-os','screen-client-chat'].includes(screen.id)) {
      play(screen, [{transform:'translateY(24px)',opacity:0},{transform:'translateY(0)',opacity:1}], {duration:250,easing:'cubic-bezier(0.32, 0.72, 0, 1)'});
    }
    if (screen.id === 'screen-client-home') {
      skeleton(document.getElementById('category-grid'), true);
      skeleton(document.getElementById('featured-professionals'));
    } else if (screen.id === 'screen-client-pro-list') skeleton(document.getElementById('pro-list-container'));
  }
  function message(row, data, animateNew = false) {
    if (animateNew && !seenMessages.has(data) && !reduced()) row.classList.add('sq-message-new');
    seenMessages.add(data);
    row.addEventListener('animationend', () => row.classList.remove('sq-message-new'), {once:true});
  }
  function rating(dialog, animate = false) {
    if (!dialog) return;
    const inputs = [...dialog.querySelectorAll('input[name="review-rating"]')];
    const value = Number(inputs.find(input => input.checked)?.value || 0);
    const previous = Number(dialog.dataset.rating || 0);
    for (const input of inputs) {
      const star = Number(input.value); input.classList.toggle('sq-star-filled', star <= value);
      if (animate && inputMethod !== 'keyboard' && star <= value && (star > previous || star === value)) {
        play(input, [{transform:'scale(.9)'},{transform:'scale(1.18)',offset:.55},{transform:input.checked?'scale(1.12)':'scale(1)'}], {duration:250,easing:'cubic-bezier(0.23, 1, 0.32, 1)'});
      }
    }
    dialog.dataset.rating = String(value);
  }
  document.addEventListener('change', event => {
    if (event.target.matches('#modal-review input[name="review-rating"]')) rating(event.target.closest('dialog'), true);
  });
  function reviewSuccess() {
    const card = document.querySelector('#app-feedback .feedback-card'); if (!card) return;
    const icon = document.createElement('span'); icon.className = 'sq-success-mark'; icon.textContent = '✓'; icon.setAttribute('aria-hidden','true');
    card.prepend(icon);
    play(icon, [{transform:'scale(.92)',opacity:.5},{transform:'scale(1.12)',opacity:1,offset:.6},{transform:'scale(1)',opacity:1}], {duration:250,easing:'cubic-bezier(0.23, 1, 0.32, 1)'});
  }
  function stopMotion() {
    if (!reduced()) return;
    for (const animation of activeAnimations.values()) animation.cancel();
    activeAnimations.clear(); cancelLoads();
    document.querySelectorAll('.sq-message-new').forEach(row => row.classList.remove('sq-message-new'));
  }
  reduceQuery.addEventListener('change', stopMotion);
  new MutationObserver(stopMotion).observe(document.documentElement, {attributes:true, attributeFilter:['class']});
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelLoads(); });
  return {cancelLoads, enterScreen, skeleton, message, rating, reviewSuccess, reduced};
})();
