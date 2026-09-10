/* Specialist Companion Launcher v1
   Generic Appointment Companion -> specialist hand-off UI.
   Future tools register once against Companion Bridge rather than integrating
   pair-by-pair with Appointment Companion.
*/
(function (global) {
  'use strict';

  if (document.documentElement.classList.contains('view-mode')) return;

  const api = global.AppointmentCompanionCloud;
  const bridge = global.AppointmentCompanionBridge;
  const AUTH_KEY = 'apptCloudPilotAuthSession';
  const CUSTOMER_KEY = 'apptCloudPilotCurrentCustomer';
  const RETURN_SAVE_KEY = 'apptCompanionSpecialistReturnNeedsSaveV1';
  const specs = [];
  const wiredTopButtons = new Set();
  const prefetchedTools = new Set();

  function showTransition(title, copy) {
    let overlay = document.getElementById('companionViewTransition');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'companionViewTransition';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:15000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(38,22,79,.24);backdrop-filter:blur(2px);';
      overlay.innerHTML = '<div style="width:min(330px,calc(100vw - 36px));padding:22px;border-radius:16px;background:#fff;color:#26164f;box-shadow:0 18px 55px rgba(38,22,79,.24);text-align:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif"><div style="font-size:30px;margin-bottom:8px">🚙</div><strong data-transition-title style="display:block;font-size:16px;color:#7a42c8"></strong><p data-transition-copy style="margin:.35rem 0 0;font-size:12px;color:#6b6b76"></p></div>';
      document.body.appendChild(overlay);
    }
    overlay.querySelector('[data-transition-title]').textContent = title || 'Opening Companion…';
    overlay.querySelector('[data-transition-copy]').textContent = copy || '';
    overlay.style.display = 'flex';
  }

  function hideTransition() {
    const overlay = document.getElementById('companionViewTransition');
    if (overlay) overlay.style.display = 'none';
  }

  function prefetch(spec) {
    const key = String(spec && spec.tool_id || '');
    if (!key || prefetchedTools.has(key)) return;
    prefetchedTools.add(key);
    const run = function () {
      const assets = key === 'ev'
        ? [spec.url, '../v16c-ev.html', '../tariff-cache-v1.js', '../v13-ev.js', '../v16b-hero.js', '../v14-ev.css', '../v15-ev.css', '../v15-freshness.js', '../v16c-ev.css', '../v16c-sharing.js', '../v16c-table.js']
        : [spec.url];
      assets.forEach(function (asset) {
        try { fetch(new URL(asset, global.location.href).href, { cache: 'force-cache', credentials: 'same-origin' }).catch(function () {}); } catch (_) {}
      });
    };
    if ('requestIdleCallback' in global) global.requestIdleCallback(run, { timeout: 1800 });
    else setTimeout(run, 500);
  }

  function getAuth() {
    try {
      const a = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
      return a && a.partner_id && a.workspace_key ? a : null;
    } catch (_) {
      return null;
    }
  }

  function currentCustomerId() {
    return sessionStorage.getItem(CUSTOMER_KEY) || '';
  }

  function setCloudStatus(text, kind) {
    const el = document.getElementById('cloudPilotStatus');
    if (!el) return;
    el.textContent = text;
    el.style.color = kind === 'bad' ? '#c43b3b' : kind === 'good' ? '#1d7f45' : 'var(--muted)';
  }

  function waitForSave(timeoutMs) {
    return new Promise(function (resolve, reject) {
      const status = document.getElementById('cloudPilotStatus');
      if (!status) return reject(new Error('Cloud status is unavailable.'));
      let done = false;
      const finish = function (err) {
        if (done) return;
        done = true;
        observer.disconnect();
        clearTimeout(timer);
        err ? reject(err) : resolve();
      };
      const check = function () {
        const text = status.textContent || '';
        if (/ saved to Cloud ✓/.test(text)) finish();
        else if (/Cloud is not connected|Customer not found|Invalid workspace key|conflict|changed in Cloud/i.test(text)) finish(new Error(text));
      };
      const observer = new MutationObserver(check);
      observer.observe(status, { childList: true, characterData: true, subtree: true });
      const timer = setTimeout(function () { finish(new Error('Cloud save took too long.')); }, timeoutMs || 10000);
      check();
    });
  }

  async function saveBeforeLaunch() {
    const save = document.getElementById('cloudPilotSave');
    if (!save) throw new Error('Cloud save button is unavailable.');
    const waiter = waitForSave(12000);
    save.click();
    await waiter;
  }

  async function launch(spec, btn) {
    showTransition('Opening ' + (spec.label || 'Companion') + '…', 'Saving the local working copy.');
    const customerId = currentCustomerId();
    const auth = getAuth();
    const contextApi = global.AppointmentCompanionCustomerContext;
    const draftCustomer = contextApi && typeof contextApi.currentDraft === 'function' ? contextApi.currentDraft() : {};
    if (!customerId) {
      if (!bridge) {
        hideTransition();
        setCloudStatus('Companion Bridge is not ready.', 'bad');
        return;
      }
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      bridge.launch(spec.url, spec.tool_id, {
        customer_id: '',
        extra: {
          customer: draftCustomer,
          draft: true,
          specialist_label: spec.label || spec.tool_id
        }
      });
      return;
    }
    if (!auth || !api || !bridge) {
      hideTransition();
      setCloudStatus('Cloud/Companion Bridge is not ready.', 'bad');
      return;
    }

    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');

    try {
      const dirtyApi = global.AppointmentCompanionCloudDirtyState;
      const canDetermineDirty = dirtyApi && typeof dirtyApi.isReady === 'function' && dirtyApi.isReady() && typeof dirtyApi.isDirty === 'function';
      const needsSave = !canDetermineDirty || dirtyApi.isDirty();
      if (needsSave) await saveBeforeLaunch();
      const customer = Object.assign({}, draftCustomer, { customer_id: customerId });

      bridge.launch(spec.url, spec.tool_id, {
        basket_url: customer.basket_url || bridge.currentBasketUrl(),
        extra: {
          customer: customer,
          specialist_label: spec.label || spec.tool_id
        }
      });
    } catch (err) {
      hideTransition();
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      setCloudStatus((err && err.message) || String(err), 'bad');
    }
  }

  function render() {
    specs.forEach(function (spec) {
      const id = 'cloudCompanion' + String(spec.tool_id || '').replace(/(^|[-_])([a-z])/g, function (_, __, ch) { return ch.toUpperCase(); });
      const btn = document.getElementById(id);
      if (!btn || wiredTopButtons.has(id)) return;
      btn.title = spec.description || ('Open ' + (spec.label || spec.tool_id));
      btn.setAttribute('aria-label', spec.label || spec.tool_id);
      btn.addEventListener('click', function () { launch(spec, btn); });
      wiredTopButtons.add(id);
      prefetch(spec);
    });
  }

  function register(spec) {
    if (!spec || !spec.tool_id || !spec.url) throw new Error('Specialist needs tool_id and url.');
    const key = String(spec.tool_id);
    const at = specs.findIndex(function (x) { return String(x.tool_id) === key; });
    if (at >= 0) specs[at] = Object.assign({}, spec);
    else specs.push(Object.assign({}, spec));
    render();
    prefetch(spec);
  }

  function syncReturnedSpecialist() {
    if (sessionStorage.getItem(RETURN_SAVE_KEY) !== '1') return;
    sessionStorage.removeItem(RETURN_SAVE_KEY);

    let attempts = 0;
    const timer = setInterval(function () {
      attempts++;
      const save = document.getElementById('cloudPilotSave');
      const connected = document.getElementById('cloudPilotConnected');
      if (save && connected && !connected.classList.contains('hidden') && currentCustomerId()) {
        clearInterval(timer);
        setCloudStatus('Specialist Companion returned - syncing journey to Cloud…');
        setTimeout(function () { save.click(); }, 250);
      } else if (attempts > 60) {
        clearInterval(timer);
      }
    }, 100);
  }

  global.AppointmentCompanionSpecialists = {
    register: register,
    list: function () { return specs.map(function (x) { return Object.assign({}, x); }); }
  };

  let attempts = 0;
  const timer = setInterval(function () {
    attempts++;
    if (document.getElementById('cloudPilotCard')) {
      clearInterval(timer);
      render();
      syncReturnedSpecialist();
    } else if (attempts > 60) {
      clearInterval(timer);
    }
  }, 50);
})(window);
