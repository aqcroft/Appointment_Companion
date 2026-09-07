/* Appointment Companion Cloud presence v1
   Detects other open sessions for the same customer.
   - Same-browser/tab awareness works immediately via BroadcastChannel.
   - Cross-device presence uses optional Cloud actions touchPresence/listPresence/
     leavePresence. If the current Apps Script has not been upgraded yet, remote
     presence quietly disables itself and local tab-awareness continues.
*/
(function (global) {
  'use strict';

  if (document.documentElement.classList.contains('view-mode')) return;

  const api = global.AppointmentCompanionCloud;
  const deviceApi = global.AppointmentCompanionDevice;
  const AUTH_KEY = 'apptCloudPilotAuthSession';
  const CUSTOMER_KEY = 'apptCloudPilotCurrentCustomer';
  const HEARTBEAT_MS = 30000;
  const PEER_TTL_MS = 95000;

  let channel = null;
  let remoteSupported = null;
  let currentCustomer = '';
  let localPeers = new Map();
  let remotePeers = [];
  let heartbeatTimer = null;
  let customerPoll = null;

  function getAuth() {
    try {
      const a = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
      return a && a.partner_id && a.workspace_key ? a : null;
    } catch (_) { return null; }
  }

  function identity() {
    if (deviceApi && typeof deviceApi.getIdentity === 'function') return deviceApi.getIdentity();
    return { device_id: 'unknown', device_name: 'This device', session_id: 'session' };
  }

  function toolId() {
    const bridge = global.AppointmentCompanionBridge;
    return bridge && bridge.toolId ? bridge.toolId : 'appointment';
  }

  function ensureUi() {
    if (document.getElementById('cloudPilotPresenceState')) return;
    const connected = document.getElementById('cloudPilotConnected');
    if (!connected) return;
    const line = document.createElement('div');
    line.id = 'cloudPilotPresenceState';
    line.className = 'sub';
    line.style.cssText = 'margin-top:.55rem;padding:.5rem .6rem;border-radius:9px;background:rgba(38,22,79,.045);font-size:10.8px;line-height:1.35;';
    line.textContent = '○ Presence - load a Cloud customer to activate.';
    connected.appendChild(line);
  }

  function setUi(html, tone) {
    const el = document.getElementById('cloudPilotPresenceState');
    if (!el) return;
    el.innerHTML = html;
    el.style.color = tone === 'warn' ? '#8a6400' : tone === 'bad' ? '#c43b3b' : tone === 'good' ? '#1d7f45' : 'var(--muted)';
    el.style.background = tone === 'warn' ? '#fff8e8' : tone === 'bad' ? '#fff4f4' : 'rgba(38,22,79,.045)';
  }

  function peerLabel(p, me) {
    if (!p) return '';
    if (p.device_id === me.device_id) return 'another tab on ' + (p.device_name || me.device_name);
    return p.device_name || 'another device';
  }

  function combinedPeers() {
    const me = identity();
    const now = Date.now();
    const bySession = new Map();

    localPeers.forEach(function (p, session) {
      if (session === me.session_id || p.customer_id !== currentCustomer || now - p.seen_at > PEER_TTL_MS) return;
      bySession.set(session, p);
    });

    (remotePeers || []).forEach(function (p) {
      const session = String(p.session_id || '');
      if (!session || session === me.session_id) return;
      bySession.set(session, Object.assign({}, p, { seen_at: Date.parse(p.last_seen_at || '') || now }));
    });

    return Array.from(bySession.values());
  }

  function render() {
    if (!currentCustomer) {
      setUi('○ Presence - load a Cloud customer to activate.', '');
      return;
    }
    const me = identity();
    const peers = combinedPeers();
    if (!peers.length) {
      const suffix = remoteSupported === false ? ' Same-browser checking is active.' : '';
      setUi('🟢 Open here on <strong>' + escapeHtml(me.device_name) + '</strong>.' + suffix, 'good');
      return;
    }
    const names = peers.map(function (p) { return escapeHtml(peerLabel(p, me)); });
    setUi('⚠️ This customer is also open on <strong>' + names.join('</strong>, <strong>') + '</strong>.', 'warn');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function broadcast(type) {
    if (!channel || !currentCustomer) return;
    const me = identity();
    channel.postMessage({
      type: type || 'heartbeat',
      customer_id: currentCustomer,
      device_id: me.device_id,
      device_name: me.device_name,
      session_id: me.session_id,
      tool_id: toolId(),
      seen_at: Date.now()
    });
  }

  async function remoteHeartbeat() {
    if (!api || remoteSupported === false || !currentCustomer) return;
    const auth = getAuth();
    if (!auth || typeof api.touchPresence !== 'function' || typeof api.listPresence !== 'function') return;
    const me = identity();
    try {
      await api.touchPresence(auth, {
        customer_id: currentCustomer,
        device_id: me.device_id,
        device_name: me.device_name,
        session_id: me.session_id,
        tool_id: toolId()
      });
      const res = await api.listPresence(auth, currentCustomer);
      remotePeers = Array.isArray(res.presences) ? res.presences : [];
      remoteSupported = true;
      render();
    } catch (err) {
      if (/Unknown action/i.test(String(err && err.message || err))) {
        remoteSupported = false;
        remotePeers = [];
        render();
      }
    }
  }

  function heartbeat() {
    cleanupPeers();
    broadcast('heartbeat');
    remoteHeartbeat();
    render();
  }

  function cleanupPeers() {
    const now = Date.now();
    localPeers.forEach(function (p, key) {
      if (now - p.seen_at > PEER_TTL_MS) localPeers.delete(key);
    });
  }

  function setCustomer(id) {
    id = String(id || '');
    if (id === currentCustomer) return;
    if (currentCustomer) leaveCurrent();
    currentCustomer = id;
    localPeers.clear();
    remotePeers = [];
    if (currentCustomer) heartbeat();
    else render();
  }

  function leaveCurrent() {
    if (!currentCustomer) return;
    broadcast('leave');
    const auth = getAuth();
    const me = identity();
    if (remoteSupported !== false && api && auth && typeof api.leavePresence === 'function') {
      api.leavePresence(auth, {
        customer_id: currentCustomer,
        session_id: me.session_id
      }).catch(function () {});
    }
  }

  function initChannel() {
    if (!('BroadcastChannel' in global)) return;
    channel = new BroadcastChannel('appointment-companion-presence-v1');
    channel.onmessage = function (event) {
      const p = event.data || {};
      const me = identity();
      if (!p.session_id || p.session_id === me.session_id) return;
      if (p.type === 'leave') localPeers.delete(p.session_id);
      else localPeers.set(p.session_id, p);
      render();
    };
  }

  function boot() {
    ensureUi();
    initChannel();
    setCustomer(sessionStorage.getItem(CUSTOMER_KEY) || '');
    heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
    customerPoll = setInterval(function () {
      setCustomer(sessionStorage.getItem(CUSTOMER_KEY) || '');
    }, 800);
    global.addEventListener('pagehide', leaveCurrent);
    global.addEventListener('beforeunload', function () { broadcast('leave'); });
    global.addEventListener('ac:device-renamed', heartbeat);
  }

  let attempts = 0;
  const timer = setInterval(function () {
    attempts++;
    if (document.getElementById('cloudPilotConnected')) {
      clearInterval(timer);
      boot();
    } else if (attempts > 60) {
      clearInterval(timer);
    }
  }, 50);
})(window);
