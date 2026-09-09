/* Appointment Companion Cloud pilot safety v1
   Adds conservative autosave and unsaved-change protection.
   Autosave only arms after a Cloud customer has been explicitly loaded or saved
   in this page. It checks updated_at before an autosave to avoid silently
   overwriting a newer version saved elsewhere.
*/
(function () {
  'use strict';

  if (document.documentElement.classList.contains('view-mode')) return;

  const $ = id => document.getElementById(id);
  const api = window.AppointmentCompanionCloud;
  const SESSION_AUTH_KEY = 'apptCloudPilotAuthSession';
  const CURRENT_CUSTOMER_KEY = 'apptCloudPilotCurrentCustomer';
  const AUTOSAVE_DELAY_MS = 4000;
  const AUTOSAVE_BATCH_DELAY_MS = 12000;
  const AUTOSAVE_MIN_CHANGES = 3;

  let armed = false;
  let dirty = false;
  let saving = false;
  let conflict = false;
  let baselineFingerprint = '';
  let lastSeenFingerprint = '';
  let baselineUpdatedAt = '';
  let autosaveTimer = null;
  let batchTimer = null;
  let pollTimer = null;
  let changeCount = 0;

  window.AppointmentCompanionCloudDirtyState = {
    isReady: () => armed && !!baselineFingerprint,
    isDirty: () => dirty || saving || (armed && !!baselineFingerprint && fingerprint() !== baselineFingerprint),
    hasConflict: () => conflict
  };

  function getAuth() {
    try {
      const a = JSON.parse(sessionStorage.getItem(SESSION_AUTH_KEY) || 'null');
      return a && a.partner_id && a.workspace_key ? a : null;
    } catch (_) {
      return null;
    }
  }

  function getCustomerId() {
    return sessionStorage.getItem(CURRENT_CUSTOMER_KEY) || '';
  }

  function fingerprint() {
    if (typeof window.serializeForm !== 'function') return '';
    try {
      const data = window.serializeForm();
      if (data && typeof data === 'object') delete data.savedAt;
      return JSON.stringify(data || {});
    } catch (_) {
      return '';
    }
  }

  function ensureUi() {
    if ($('cloudPilotAutosaveState')) return;
    const connected = $('cloudPilotConnected');
    if (!connected) return;
    const line = document.createElement('div');
    line.id = 'cloudPilotAutosaveState';
    line.className = 'sub';
    line.style.cssText = 'margin-top:.55rem;padding:.5rem .6rem;border-radius:9px;background:rgba(38,22,79,.045);font-size:10.8px;line-height:1.35;';
    line.textContent = '💾 Autosave ready - load a Cloud customer to activate it.';
    connected.appendChild(line);
  }

  function setUi(text, tone) {
    const el = $('cloudPilotAutosaveState');
    if (!el) return;
    el.textContent = text;
    el.style.color = tone === 'bad' ? '#c43b3b' : tone === 'warn' ? '#8a6400' : tone === 'good' ? '#1d7f45' : 'var(--muted)';
    el.style.background = tone === 'bad' ? '#fff4f4' : tone === 'warn' ? '#fff8e8' : 'rgba(38,22,79,.045)';
  }

  async function fetchCurrentMeta() {
    const auth = getAuth();
    const id = getCustomerId();
    if (!auth || !id || !api) return null;
    const res = await api.getCustomer(auth, id);
    return res && res.customer ? res.customer : null;
  }

  async function establishBaseline(message) {
    clearTimeout(autosaveTimer);
    clearTimeout(batchTimer);
    dirty = false;
    conflict = false;
    changeCount = 0;
    const fp = fingerprint();
    baselineFingerprint = fp;
    lastSeenFingerprint = fp;
    try {
      const customer = await fetchCurrentMeta();
      baselineUpdatedAt = customer && customer.updated_at ? String(customer.updated_at) : '';
    } catch (_) {
      baselineUpdatedAt = '';
    }
    armed = !!getCustomerId();
    if (armed) setUi(message || '💾 Autosave on - all changes saved.', 'good');
  }

  function markDirty() {
    if (!armed || saving || conflict) return;
    dirty = true;
    changeCount++;
    const remaining = Math.max(AUTOSAVE_MIN_CHANGES - changeCount, 0);
    setUi(remaining
      ? '● Unsaved changes - autosaving after ' + remaining + ' more change' + (remaining === 1 ? '' : 's') + ', or after a pause.'
      : '● Unsaved changes - autosaving after you pause...', 'warn');
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(tryAutosave, changeCount >= AUTOSAVE_MIN_CHANGES ? AUTOSAVE_DELAY_MS : AUTOSAVE_BATCH_DELAY_MS);
    if (!batchTimer) batchTimer = setTimeout(tryAutosave, AUTOSAVE_BATCH_DELAY_MS);
  }

  async function tryAutosave() {
    if (!armed || !dirty || saving || conflict) return;
    const auth = getAuth();
    const id = getCustomerId();
    const saveBtn = $('cloudPilotSave');
    if (!auth || !id || !saveBtn) return;

    saving = true;
    clearTimeout(batchTimer);
    batchTimer = null;
    setUi('☁️ Autosaving...', '');
    try {
      const latest = await fetchCurrentMeta();
      const latestUpdatedAt = latest && latest.updated_at ? String(latest.updated_at) : '';

      if (baselineUpdatedAt && latestUpdatedAt && latestUpdatedAt !== baselineUpdatedAt) {
        conflict = true;
        dirty = true;
        setUi('⚠️ Newer Cloud changes found from another tab/device - reload before saving.', 'bad');
        const status = $('cloudPilotStatus');
        if (status) {
          status.textContent = '⚠️ This customer changed in Cloud since this page loaded. Reload the latest version before saving.';
          status.style.color = '#c43b3b';
        }
        return;
      }

      saveBtn.click();
      // The existing save routine updates the status; its observer below will
      // establish the new baseline after success.
    } catch (err) {
      setUi('⚠️ Autosave could not complete - changes are still unsaved.', 'bad');
    } finally {
      // Give the existing async save routine time to finish. The status observer
      // will reset this sooner on success.
      setTimeout(() => { saving = false; }, 1800);
    }
  }

  function pollForChanges() {
    if (!armed || saving || conflict) return;
    const fp = fingerprint();
    if (!fp) return;

    if (fp === baselineFingerprint) {
      if (dirty) {
        dirty = false;
        clearTimeout(autosaveTimer);
        setUi('💾 Autosave on - all changes saved.', 'good');
      }
      lastSeenFingerprint = fp;
      return;
    }

    if (fp !== lastSeenFingerprint) {
      lastSeenFingerprint = fp;
      markDirty();
    }
  }

  function watchStatus() {
    const status = $('cloudPilotStatus');
    if (!status || status.dataset.safetyWatched) return;
    status.dataset.safetyWatched = '1';
    let previous = status.textContent || '';

    new MutationObserver(() => {
      const text = status.textContent || '';
      if (text === previous) return;
      previous = text;

      if (/ loaded from Cloud ✓$/.test(text) || /fresh form has been started for this Cloud customer/.test(text)) {
        saving = false;
        setTimeout(() => establishBaseline('💾 Autosave on - Cloud version loaded.'), 120);
      } else if (/ saved to Cloud ✓/.test(text)) {
        saving = false;
        setTimeout(() => establishBaseline('💾 Autosave on - saved to Cloud.'), 120);
      } else if (/Disconnected/.test(text)) {
        armed = false;
        dirty = false;
        conflict = false;
        changeCount = 0;
        clearTimeout(autosaveTimer);
        clearTimeout(batchTimer);
        batchTimer = null;
        setUi('💾 Autosave paused - Cloud disconnected.', '');
      }
    }).observe(status, { childList: true, characterData: true, subtree: true });
  }

  window.addEventListener('beforeunload', function (e) {
    if (!dirty && !saving) return;
    e.preventDefault();
    e.returnValue = '';
  });

  function boot() {
    ensureUi();
    watchStatus();
    if (!pollTimer) pollTimer = setInterval(pollForChanges, 700);
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if ($('cloudPilotCard')) {
      clearInterval(timer);
      boot();
    } else if (attempts > 50) {
      clearInterval(timer);
    }
  }, 50);
})();
