/* Appointment Companion Cloud device identity v1
   Gives each browser/device a stable random ID and friendly name, plus a
   separate tab/session ID. No fingerprinting and no secrets are stored here.
*/
(function (global) {
  'use strict';

  const DEVICE_KEY = 'apptCloudDeviceV1';
  const SESSION_KEY = 'apptCloudTabSessionV1';

  function makeId(prefix) {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return prefix + '_' + global.crypto.randomUUID().replace(/-/g, '');
    }
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }

  function browserName() {
    const ua = navigator.userAgent || '';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\//.test(ua)) return 'Opera';
    if (/Firefox\//.test(ua)) return 'Firefox';
    if (/CriOS\//.test(ua)) return 'Chrome';
    if (/Chrome\//.test(ua)) return 'Chrome';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
    return 'Browser';
  }

  function deviceType() {
    const ua = navigator.userAgent || '';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua) && /Mobile/.test(ua)) return 'Android phone';
    if (/Android/.test(ua)) return 'Android tablet';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
    if (/Linux/.test(ua)) return 'Linux PC';
    return 'Device';
  }

  function suggestedName() {
    return deviceType() + ' - ' + browserName();
  }

  function readDevice() {
    try {
      const d = JSON.parse(localStorage.getItem(DEVICE_KEY) || 'null');
      if (d && d.device_id && d.device_name) return d;
    } catch (_) {}
    return null;
  }

  function writeDevice(d) {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(d));
    return d;
  }

  function ensureDevice() {
    const existing = readDevice();
    if (existing) return existing;
    const now = new Date().toISOString();
    return writeDevice({
      device_id: makeId('dev'),
      device_name: suggestedName(),
      auto_named: true,
      created_at: now,
      updated_at: now
    });
  }

  function renameDevice(name) {
    const current = ensureDevice();
    const cleaned = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!cleaned) throw new Error('Device name cannot be blank.');
    current.device_name = cleaned;
    current.auto_named = false;
    current.updated_at = new Date().toISOString();
    writeDevice(current);
    global.dispatchEvent(new CustomEvent('ac:device-renamed', { detail: Object.assign({}, current) }));
    return current;
  }

  function sessionId() {
    let id = sessionStorage.getItem(SESSION_KEY) || '';
    if (!id) {
      id = makeId('tab');
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function identity() {
    const d = ensureDevice();
    return {
      device_id: d.device_id,
      device_name: d.device_name,
      session_id: sessionId()
    };
  }

  function mountUi() {
    if (document.documentElement.classList.contains('view-mode')) return;
    const connected = document.getElementById('cloudPilotConnected');
    if (!connected || document.getElementById('cloudPilotDeviceBox')) return;

    const d = ensureDevice();
    const box = document.createElement('div');
    box.id = 'cloudPilotDeviceBox';
    box.className = 'sub';
    box.style.cssText = 'margin-top:.55rem;padding:.55rem .6rem;border-radius:9px;background:rgba(38,22,79,.045);font-size:10.8px;line-height:1.35;';
    box.innerHTML = `
      <div style="font-weight:700;margin-bottom:.35rem;">💻 ${d.auto_named ? 'Name this device' : 'This device'}</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input id="cloudPilotDeviceName" type="text" value="" maxlength="80" style="min-width:0;flex:1;padding:7px 8px;font-size:12px;">
        <button id="cloudPilotDeviceSave" type="button" class="pill" style="min-height:34px;flex:0;padding:5px 10px;font-size:11px;">${d.auto_named ? 'Use name' : 'Rename'}</button>
      </div>
      <div id="cloudPilotDeviceMeta" style="margin-top:.3rem;opacity:.75;">Each tab gets its own session ID, whilst this device ID stays the same.</div>
    `;
    connected.appendChild(box);

    const input = document.getElementById('cloudPilotDeviceName');
    const save = document.getElementById('cloudPilotDeviceSave');
    input.value = d.device_name;
    save.addEventListener('click', function () {
      try {
        const updated = renameDevice(input.value);
        input.value = updated.device_name;
        box.querySelector('div').textContent = '💻 This device';
        save.textContent = 'Rename';
        const meta = document.getElementById('cloudPilotDeviceMeta');
        if (meta) meta.textContent = 'Saved as ' + updated.device_name + '. Each tab still has its own separate session ID.';
      } catch (err) {
        input.focus();
      }
    });
  }

  const api = {
    getDevice: function () { return Object.assign({}, ensureDevice()); },
    getIdentity: identity,
    getSessionId: sessionId,
    rename: renameDevice,
    suggestedName: suggestedName
  };

  global.AppointmentCompanionDevice = api;
  ensureDevice();
  sessionId();

  let attempts = 0;
  const timer = setInterval(function () {
    attempts++;
    if (document.getElementById('cloudPilotConnected')) {
      clearInterval(timer);
      mountUi();
    } else if (attempts > 50) {
      clearInterval(timer);
    }
  }, 50);
})(window);
