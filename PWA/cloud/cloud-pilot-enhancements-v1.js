/* Appointment Companion Cloud pilot UX enhancements v1
   - Makes the currently linked customer reloadable from Cloud
   - Adds an obvious save-success popup
   - Keeps reload handling in the Settings flow
*/
(function () {
  'use strict';

  if (document.documentElement.classList.contains('view-mode')) return;

  const $ = id => document.getElementById(id);
  let toastTimer = null;

  function injectStyles() {
    if (document.getElementById('cloudPilotEnhancementStyles')) return;
    const style = document.createElement('style');
    style.id = 'cloudPilotEnhancementStyles';
    style.textContent = `
      #cloudPilotToast{
        position:fixed;left:50%;top:18px;transform:translate(-50%,-16px);
        z-index:10000;min-width:min(360px,calc(100vw - 32px));max-width:440px;
        padding:14px 18px;border-radius:14px;background:#26164f;color:white;
        box-shadow:0 10px 34px rgba(38,22,79,.28);text-align:center;
        font-size:14px;font-weight:750;line-height:1.35;opacity:0;pointer-events:none;
        transition:opacity .18s ease,transform .18s ease;
      }
      #cloudPilotToast.show{opacity:1;transform:translate(-50%,0)}
      #cloudPilotToast .big{display:block;font-size:22px;margin-bottom:3px}
    `;
    document.head.appendChild(style);
  }

  function ensureToast() {
    let toast = $('cloudPilotToast');
    if (toast) return toast;
    toast = document.createElement('div');
    toast.id = 'cloudPilotToast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    return toast;
  }

  function showToast(title, detail) {
    const toast = ensureToast();
    toast.innerHTML = '<span class="big">✅</span>' + title + (detail ? '<div style="font-size:12px;font-weight:550;opacity:.85;margin-top:2px;">' + detail + '</div>' : '');
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function makeLinkedCustomerReloadable() {
    const list = $('cloudPilotListBody') || $('cloudPilotList');
    if (!list) return;
    list.querySelectorAll('button').forEach(btn => {
      if (btn.textContent.trim() === 'Linked') {
        btn.textContent = 'Reload';
        btn.disabled = false;
        btn.title = 'Reload the latest saved Cloud version of this customer';
      }
    });
  }

  function addReloadCurrentButton() {
    const btn = $('cloudPilotReloadCurrent');
    if (btn) btn.remove();
  }

  function updateCurrentHint() {
    const current = $('cloudPilotCurrent');
    if (!current) return;
    const text = current.textContent || '';
    if (text.indexOf('Linked Cloud customer:') === 0 && text.indexOf('Reload') === -1) {
      current.textContent = text + ' - Reload pulls the latest Cloud version.';
    }
  }

  function watchStatus() {
    const status = $('cloudPilotStatus');
    if (!status || status.dataset.enhancementWatched) return;
    status.dataset.enhancementWatched = '1';

    let previous = status.textContent || '';
    const observer = new MutationObserver(() => {
      const text = status.textContent || '';
      if (text !== previous && / saved to Cloud ✓/.test(text)) {
        const name = text.replace(/ saved to Cloud ✓.*$/, '');
        showToast('Saved to Cloud', name + ' is safely stored.');
      }
      previous = text;
      makeLinkedCustomerReloadable();
      updateCurrentHint();
    });
    observer.observe(status, { childList: true, characterData: true, subtree: true });
  }

  function bootEnhancements() {
    injectStyles();
    ensureToast();
    addReloadCurrentButton();
    makeLinkedCustomerReloadable();
    updateCurrentHint();
    watchStatus();

    const list = $('cloudPilotListBody') || $('cloudPilotList');
    if (list && !list.dataset.enhancementWatched) {
      list.dataset.enhancementWatched = '1';
      new MutationObserver(() => {
        makeLinkedCustomerReloadable();
        updateCurrentHint();
      }).observe(list, { childList: true, subtree: true });
    }

    const current = $('cloudPilotCurrent');
    if (current && !current.dataset.enhancementWatched) {
      current.dataset.enhancementWatched = '1';
      new MutationObserver(updateCurrentHint).observe(current, { childList: true, characterData: true, subtree: true });
    }
  }

  // cloud-pilot-v1.js builds its UI synchronously when loaded, but allow a few
  // ticks so this remains robust if that implementation changes later.
  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if ($('cloudPilotCard')) {
      clearInterval(timer);
      bootEnhancements();
    } else if (attempts > 40) {
      clearInterval(timer);
    }
  }, 50);
})();
