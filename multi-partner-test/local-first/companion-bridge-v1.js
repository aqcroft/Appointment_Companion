/* Companion Bridge v1
   Generic same-origin hand-off contract for Appointment Companion and future
   specialist companions. It carries the customer journey, appointment state,
   basket link and namespaced specialist state without each tool needing a
   bespoke integration with every other tool.

   Same-tab navigation is deliberate: sessionStorage, Cloud auth and journey
   context follow the user without placing private state or Workspace Keys in URLs.
*/
(function (global) {
  'use strict';

  const VERSION = 1;
  const JOURNEY_KEY = 'apptCompanionJourneyV1';
  const LAUNCH_PREFIX = 'apptCompanionLaunchV1:';
  const RETURN_PREFIX = 'apptCompanionReturnV1:';
  const ACTIVE_LAUNCH_KEY = 'apptCompanionActiveLaunchV1';
  const CURRENT_CUSTOMER_KEY = 'apptCloudPilotCurrentCustomer';
  const WORKING_RECORD_KEY = 'apptCompanionWorkingRecordV1';
  const TTL_MS = 2 * 60 * 60 * 1000;

  function makeId(prefix) {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return prefix + '_' + global.crypto.randomUUID().replace(/-/g, '');
    }
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  function clone(v) {
    if (v == null) return v;
    return JSON.parse(JSON.stringify(v));
  }

  function readJson(key, fallback) {
    try {
      const v = JSON.parse(sessionStorage.getItem(key) || 'null');
      return v == null ? fallback : v;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function getWorkingRecord() {
    try {
      const record = JSON.parse(localStorage.getItem(WORKING_RECORD_KEY) || 'null');
      if (record && typeof record === 'object') {
        const leakedLoginId = /^p_[a-f0-9]{20,}$/i.test(String(record.customer_name || '').trim());
        if (leakedLoginId) {
          record.customer_name = '';
          if (record.appointment_state && typeof record.appointment_state === 'object') {
            record.appointment_state.customerName = '';
            if (record.appointment_state.inputs && typeof record.appointment_state.inputs === 'object') {
              record.appointment_state.inputs.customerName = '';
            }
          }
          try { localStorage.setItem(WORKING_RECORD_KEY, JSON.stringify(record)); } catch (_) {}
        }
        return record;
      }
      return {
        version: VERSION, customer_id: '', customer_name: '', appointment_state: null,
        specialists: {}, updated_at: ''
      };
    } catch (_) {
      return { version: VERSION, customer_id: '', customer_name: '', appointment_state: null, specialists: {}, updated_at: '' };
    }
  }

  function updateWorkingRecord(patch) {
    const current = getWorkingRecord();
    const next = Object.assign({}, current, clone(patch || {}));
    if (/^p_[a-f0-9]{20,}$/i.test(String(next.customer_name || '').trim())) {
      next.customer_name = '';
      if (next.appointment_state && typeof next.appointment_state === 'object') {
        next.appointment_state.customerName = '';
        if (next.appointment_state.inputs && typeof next.appointment_state.inputs === 'object') next.appointment_state.inputs.customerName = '';
      }
    }
    if (!next.specialists || typeof next.specialists !== 'object') next.specialists = {};
    next.version = VERSION;
    const currentComparable = Object.assign({}, current);
    const nextComparable = Object.assign({}, next);
    delete currentComparable.updated_at;
    delete nextComparable.updated_at;
    if (JSON.stringify(currentComparable) === JSON.stringify(nextComparable)) return clone(current);
    next.updated_at = new Date().toISOString();
    try { localStorage.setItem(WORKING_RECORD_KEY, JSON.stringify(next)); } catch (_) {}
    global.dispatchEvent(new CustomEvent('ac:working-record', { detail: clone(next) }));
    return clone(next);
  }

  function clearWorkingRecord() {
    try { localStorage.removeItem(WORKING_RECORD_KEY); } catch (_) {}
    setJourney(emptyJourney());
    global.dispatchEvent(new CustomEvent('ac:working-record', { detail: getWorkingRecord() }));
  }

  function emptyJourney() {
    return {
      version: VERSION,
      specialists: {},
      pending_customer_patch: null,
      updated_at: new Date().toISOString()
    };
  }

  function getJourney() {
    const j = readJson(JOURNEY_KEY, null);
    if (!j || typeof j !== 'object') return emptyJourney();
    if (!j.specialists || typeof j.specialists !== 'object') j.specialists = {};
    return j;
  }

  function setJourney(j) {
    const next = Object.assign(emptyJourney(), clone(j || {}));
    if (!next.specialists || typeof next.specialists !== 'object') next.specialists = {};
    next.version = VERSION;
    next.updated_at = new Date().toISOString();
    return writeJson(JOURNEY_KEY, next);
  }

  function currentCustomerId() {
    return sessionStorage.getItem(CURRENT_CUSTOMER_KEY) || '';
  }

  function currentBasketUrl() {
    const el = document.getElementById('basketLink');
    return el ? String(el.value || '').trim() : '';
  }

  function setBasketUrl(url) {
    const el = document.getElementById('basketLink');
    if (!el || url == null) return;
    el.value = String(url || '');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function cleanUrl(raw) {
    const u = new URL(raw || location.href, location.href);
    u.searchParams.delete('ac_launch');
    u.searchParams.delete('ac_return');
    return u.toString();
  }

  function deviceMeta() {
    const d = global.AppointmentCompanionDevice;
    return d && typeof d.getIdentity === 'function' ? d.getIdentity() : null;
  }

  let originalSerialize = null;
  let originalRestore = null;

  function wrapStateFunctions() {
    if (!originalSerialize && typeof global.serializeForm === 'function' && !global.serializeForm.__acBridgeWrapped) {
      originalSerialize = global.serializeForm;
      const wrapped = function () {
        const data = originalSerialize.apply(this, arguments) || {};
        data._journey = clone(getJourney());
        const id = deviceMeta();
        if (id) data._client = Object.assign({ tool_id: api.toolId }, id);
        return data;
      };
      wrapped.__acBridgeWrapped = true;
      global.serializeForm = wrapped;
    }

    if (!originalRestore && typeof global.restoreForm === 'function' && !global.restoreForm.__acBridgeWrapped) {
      originalRestore = global.restoreForm;
      const wrappedRestore = function (data) {
        if (data && data._journey) setJourney(data._journey);
        const result = originalRestore.apply(this, arguments);
        if (data && typeof data === 'object') {
          updateWorkingRecord({
            customer_id: currentCustomerId(),
            customer_name: String(data.customerName || '').trim(),
            appointment_state: clone(data),
            specialists: clone(getJourney().specialists || {})
          });
        }
        return result;
      };
      wrappedRestore.__acBridgeWrapped = true;
      global.restoreForm = wrappedRestore;
    }
  }

  function captureAppointmentState() {
    wrapStateFunctions();
    if (typeof global.serializeForm !== 'function') return null;
    const data = clone(global.serializeForm());
    updateWorkingRecord({
      customer_id: currentCustomerId(),
      customer_name: String(data.customerName || '').trim(),
      appointment_state: clone(data),
      specialists: clone((data._journey && data._journey.specialists) || {})
    });
    return data;
  }

  function setToolState(toolId, state) {
    const key = String(toolId || '').trim();
    if (!key) throw new Error('toolId is required.');
    const j = getJourney();
    j.specialists[key] = clone(state);
    setJourney(j);
    const record = getWorkingRecord();
    const specialists = Object.assign({}, record.specialists || {});
    specialists[key] = clone(state);
    updateWorkingRecord({ specialists: specialists });
    return clone(j.specialists[key]);
  }

  function getToolState(toolId) {
    const j = getJourney();
    return clone(j.specialists[String(toolId || '').trim()] || null);
  }

  function launch(targetUrl, targetToolId, options) {
    wrapStateFunctions();
    const opts = options || {};
    const targetTool = String(targetToolId || '').trim();
    if (!targetTool) throw new Error('targetToolId is required.');

    const launchId = makeId('launch');
    const now = Date.now();
    const envelope = {
      bridge_version: VERSION,
      launch_id: launchId,
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + TTL_MS).toISOString(),
      customer_id: opts.customer_id || currentCustomerId(),
      origin: {
        tool_id: opts.origin_tool_id || api.toolId,
        url: cleanUrl(opts.origin_url || location.href),
        scroll_y: Math.max(0, Math.round(global.scrollY || 0))
      },
      target_tool_id: targetTool,
      appointment_state: opts.appointment_state === undefined ? captureAppointmentState() : clone(opts.appointment_state),
      basket_url: opts.basket_url === undefined ? currentBasketUrl() : String(opts.basket_url || ''),
      journey: clone(getJourney()),
      extra: clone(opts.extra || null)
    };

    writeJson(LAUNCH_PREFIX + launchId, envelope);
    sessionStorage.setItem(ACTIVE_LAUNCH_KEY, launchId);

    const u = new URL(targetUrl, location.href);
    u.searchParams.set('ac_launch', launchId);
    location.href = u.toString();
    return launchId;
  }

  function receiveLaunch() {
    const u = new URL(location.href);
    const launchId = u.searchParams.get('ac_launch') || sessionStorage.getItem(ACTIVE_LAUNCH_KEY) || '';
    if (!launchId) return null;
    const envelope = readJson(LAUNCH_PREFIX + launchId, null);
    if (!envelope) return null;
    const expiry = Date.parse(envelope.expires_at || '');
    if (expiry && Date.now() > expiry) {
      sessionStorage.removeItem(LAUNCH_PREFIX + launchId);
      return null;
    }
    sessionStorage.setItem(ACTIVE_LAUNCH_KEY, launchId);
    if (envelope.journey) setJourney(envelope.journey);
    return clone(envelope);
  }

  function returnToOrigin(result) {
    const envelope = receiveLaunch();
    if (!envelope || !envelope.origin || !envelope.origin.url) throw new Error('No originating Companion journey was found.');
    const payload = {
      bridge_version: VERSION,
      launch_id: envelope.launch_id,
      target_tool_id: envelope.target_tool_id,
      returned_at: new Date().toISOString(),
      result: clone(result || {})
    };
    writeJson(RETURN_PREFIX + envelope.launch_id, payload);
    const u = new URL(envelope.origin.url, location.href);
    u.searchParams.set('ac_return', envelope.launch_id);
    location.href = u.toString();
  }

  function applyReturn(payload) {
    if (!payload || !payload.result) return null;
    const result = payload.result;

    // Restore the originating form first: its wrapped restore also restores the
    // launch-time journey. Specialist changes must be merged after that so the
    // older launch snapshot cannot overwrite the returning tool state/patch.
    if (result.appointment_state && typeof global.restoreForm === 'function') {
      global.restoreForm(clone(result.appointment_state));
    }

    const j = getJourney();
    if (result.tool_state !== undefined && payload.target_tool_id) {
      j.specialists[payload.target_tool_id] = clone(result.tool_state);
    }
    if (result.customer_patch && typeof result.customer_patch === 'object') {
      j.pending_customer_patch = Object.assign({}, j.pending_customer_patch || {}, clone(result.customer_patch));
      updateWorkingRecord(result.customer_patch);
    }
    setJourney(j);

    if (result.basket_url !== undefined) setBasketUrl(result.basket_url);

    global.dispatchEvent(new CustomEvent('ac:bridge:return', { detail: clone(payload) }));
    return clone(payload);
  }

  function consumeReturnFromUrl() {
    wrapStateFunctions();
    const u = new URL(location.href);
    const launchId = u.searchParams.get('ac_return');
    if (!launchId) return null;
    const payload = readJson(RETURN_PREFIX + launchId, null);
    if (!payload) return null;
    const envelope = readJson(LAUNCH_PREFIX + launchId, null);
    applyReturn(payload);
    global.__appointmentCompanionSpecialistReturn = true;
    sessionStorage.removeItem(RETURN_PREFIX + launchId);
    sessionStorage.removeItem(ACTIVE_LAUNCH_KEY);

    u.searchParams.delete('ac_return');
    history.replaceState(null, '', u.toString());

    if (envelope && envelope.origin && Number.isFinite(Number(envelope.origin.scroll_y))) {
      setTimeout(function () { global.scrollTo({ top: Number(envelope.origin.scroll_y), behavior: 'auto' }); }, 80);
    }
    return clone(payload);
  }

  function consumePendingCustomerPatch() {
    const j = getJourney();
    const patch = clone(j.pending_customer_patch || null);
    j.pending_customer_patch = null;
    setJourney(j);
    return patch;
  }

  function setPendingCustomerPatch(patch) {
    if (!patch || typeof patch !== 'object') return null;
    const j = getJourney();
    j.pending_customer_patch = Object.assign({}, j.pending_customer_patch || {}, clone(patch));
    setJourney(j);
    updateWorkingRecord(patch);
    return clone(j.pending_customer_patch);
  }

  const api = {
    version: VERSION,
    toolId: document.body && document.body.dataset && document.body.dataset.companionTool
      ? document.body.dataset.companionTool
      : 'appointment',
    getJourney: function () { return clone(getJourney()); },
    setToolState: setToolState,
    getToolState: getToolState,
    launch: launch,
    receive: receiveLaunch,
    returnToOrigin: returnToOrigin,
    setPendingCustomerPatch: setPendingCustomerPatch,
    consumePendingCustomerPatch: consumePendingCustomerPatch,
    currentCustomerId: currentCustomerId,
    currentBasketUrl: currentBasketUrl,
    captureAppointmentState: captureAppointmentState,
    getWorkingRecord: function () { return clone(getWorkingRecord()); },
    updateWorkingRecord: updateWorkingRecord,
    clearWorkingRecord: clearWorkingRecord,
    saveAppointmentState: captureAppointmentState
  };

  global.AppointmentCompanionBridge = api;
  wrapStateFunctions();
  consumeReturnFromUrl();

  // Keep the wrappers resilient if a later script replaces either function.
  let checks = 0;
  const timer = setInterval(function () {
    checks++;
    wrapStateFunctions();
    if (checks > 40) clearInterval(timer);
  }, 100);
})(window);
