/* Appointment Companion v2.4 - compact status + Admin settings. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  var VERSION = 'v2.4';
  var path = location.pathname;
  var isMain = /\/consolidated-v1\/?(?:index\.html)?$/.test(path);
  var adminPassword = '';
  var issuedPartner = null;

  function addStyles() {
    if (document.getElementById('acV24Style')) return;
    var st = document.createElement('style');
    st.id = 'acV24Style';
    st.textContent = [
      '/* Status remains useful but clearly subordinate to the main menu. */',
      '#cloudMenuPopover .ac-status-block{gap:3px!important;margin-top:3px!important;padding-top:6px!important;border-top-color:rgba(122,66,200,.10)!important}',
      '#cloudMenuPopover .ac-status-title{padding:0 3px!important;font-size:8px!important;letter-spacing:.08em!important;opacity:.75!important}',
      '#cloudMenuPopover .ac-status-row{grid-template-columns:22px minmax(0,1fr) auto!important;gap:5px!important;min-height:34px!important;padding:4px 7px!important;border-radius:8px!important;border-color:rgba(122,66,200,.10)!important;background:rgba(255,255,255,.74)!important;box-shadow:none!important}',
      '#cloudMenuPopover .ac-status-row:hover{background:#fff!important}',
      '#cloudMenuPopover .ac-status-icon{font-size:13px!important}',
      '#cloudMenuPopover .ac-status-copy{gap:0!important}',
      '#cloudMenuPopover .ac-status-copy strong{font-size:10.5px!important;line-height:1.12!important;font-weight:760!important}',
      '#cloudMenuPopover .ac-status-copy small{font-size:8.5px!important;line-height:1.15!important;color:#7a7482!important}',
      '#cloudMenuPopover .ac-status-mark{font-size:11px!important;opacity:.82!important}',
      '#cloudMenuPopover #acV22CloudStatusRow .ac-cloud-light{font-size:12px!important}',
      '/* Admin settings */',
      '.ac-v24-admin-modal{display:none;position:fixed;inset:0;z-index:14950;background:rgba(38,22,79,.48);padding:16px;align-items:center;justify-content:center}',
      '.ac-v24-admin-modal.open{display:flex}',
      '.ac-v24-admin-card{width:min(430px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#26164f;border-radius:16px;padding:17px;box-shadow:0 20px 60px rgba(38,22,79,.28)}',
      '.ac-v24-admin-card h3{margin:0 0 5px;font-size:17px}',
      '.ac-v24-admin-card .sub{margin:0 0 10px;color:#6b6b76;font-size:11px;line-height:1.4}',
      '.ac-v24-admin-field{display:grid;gap:4px;margin:9px 0}',
      '.ac-v24-admin-field label{font-size:11px;font-weight:760;color:#4c4655}',
      '.ac-v24-admin-field input{width:100%;box-sizing:border-box;min-height:42px;padding:9px 10px;border:1px solid #ded9e9;border-radius:9px;background:#fff;font:650 14px system-ui;color:#26164f}',
      '.ac-v24-admin-actions{display:grid;gap:7px;margin-top:12px}',
      '.ac-v24-admin-actions button,.ac-v24-admin-actions a{display:flex;align-items:center;justify-content:center;width:100%;min-height:42px;box-sizing:border-box;border-radius:10px;border:1px solid rgba(122,66,200,.18);background:#fff;color:#26164f;text-decoration:none;font:760 13px system-ui;cursor:pointer}',
      '.ac-v24-admin-actions .primary{background:#7a42c8;color:#fff;border-color:#7a42c8}',
      '.ac-v24-admin-result{margin-top:11px;padding:10px;border:1px solid rgba(122,66,200,.14);border-radius:10px;background:#faf8fe;font-size:12px;line-height:1.45}',
      '.ac-v24-admin-result code{font:750 12px ui-monospace,SFMono-Regular,Consolas,monospace;color:#26164f}',
      '.ac-v24-admin-status{min-height:18px;margin-top:7px;color:#6b6b76;font-size:11px;line-height:1.35}',
      '.ac-v24-admin-status.bad{color:#a63d3d}',
      '#acV24AdminSettingsBtn{margin-top:0!important}',
      '@media(max-width:430px){#cloudMenuPopover .ac-status-row{min-height:32px!important;padding:3px 6px!important}#cloudMenuPopover .ac-status-copy small{font-size:8px!important}}'
    ].join('');
    document.head.appendChild(st);
  }

  function installVersion() {
    var old = document.querySelector('.ac-version-mini');
    if (!old || old.dataset.acReleaseV24 === '1') return !!old;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV24 = '1';
    fresh.textContent = VERSION;
    fresh.title = 'About this version';
    fresh.setAttribute('aria-label', 'About Appointment Companion ' + VERSION);
    old.parentNode.replaceChild(fresh, old);
    fresh.addEventListener('click', function () {
      var previous = document.getElementById('acVersionAbout'); if (previous) previous.remove();
      var modal = document.createElement('div'); modal.id = 'acVersionAbout'; modal.className = 'ac-about open';
      modal.innerHTML = '<div class="ac-about-card" role="dialog" aria-modal="true" aria-labelledby="acAboutTitle"><h3 id="acAboutTitle">Appointment Companion ' + VERSION + '</h3><div style="font-size:11px;color:#6b6b76">Recent major updates</div><ul><li>Reduced the Status section in the hamburger menu so tariff, Cloud and device health remain one tap away without overpowering the main menu.</li><li>Restored an Admin settings route inside Settings for issuing new Partner Companion access.</li><li>Admin access uses an admin password for the current session only, then can create a Partner record and prepare the new Companion Login ID and Password for WhatsApp.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.ac-about-close')) modal.remove(); });
      document.body.appendChild(modal);
    });
    return true;
  }

  function ensureAdminModal() {
    var modal = document.getElementById('acV24AdminModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'acV24AdminModal';
    modal.className = 'ac-v24-admin-modal';
    modal.innerHTML = '<div class="ac-v24-admin-card" role="dialog" aria-modal="true" aria-labelledby="acV24AdminTitle">' +
      '<h3 id="acV24AdminTitle">🔐 Admin settings</h3>' +
      '<p class="sub">For Adrian Croft - issue a new Companion login without exposing admin credentials to Partner devices.</p>' +
      '<div id="acV24AdminLocked">' +
        '<div class="ac-v24-admin-field"><label for="acV24AdminPassword">Admin password</label><input id="acV24AdminPassword" type="password" autocomplete="current-password" placeholder="Admin password"></div>' +
        '<div class="ac-v24-admin-actions"><button type="button" class="primary" id="acV24AdminUnlock">Unlock admin</button><button type="button" data-admin-close>Close</button></div>' +
        '<div class="ac-v24-admin-status" id="acV24AdminLoginStatus"></div>' +
      '</div>' +
      '<div id="acV24AdminProvision" hidden>' +
        '<div class="ac-v24-admin-field"><label for="acV24PartnerName">Partner name</label><input id="acV24PartnerName" type="text" autocomplete="off" placeholder="e.g. Jane Smith"></div>' +
        '<div class="ac-v24-admin-field"><label for="acV24PartnerMobile">WhatsApp / mobile number</label><input id="acV24PartnerMobile" type="tel" autocomplete="off" placeholder="e.g. 07700 900000"></div>' +
        '<div class="ac-v24-admin-field"><label for="acV24PartnerEmail">Email (optional)</label><input id="acV24PartnerEmail" type="email" autocomplete="off" placeholder="name@example.com"></div>' +
        '<div class="ac-v24-admin-field"><label for="acV24PartnerLogin">Companion Login ID (optional - leave blank to generate)</label><input id="acV24PartnerLogin" type="text" autocomplete="off" placeholder="Generated automatically"></div>' +
        '<div class="ac-v24-admin-actions"><button type="button" class="primary" id="acV24IssuePartner">Issue new Partner record</button><button type="button" data-admin-close>Close</button></div>' +
        '<div class="ac-v24-admin-status" id="acV24ProvisionStatus"></div>' +
        '<div id="acV24IssuedResult"></div>' +
      '</div>' +
    '</div>';
    modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('[data-admin-close]')) closeAdmin(); });
    document.body.appendChild(modal);

    modal.querySelector('#acV24AdminUnlock').addEventListener('click', unlockAdmin);
    modal.querySelector('#acV24IssuePartner').addEventListener('click', issuePartner);
    modal.querySelector('#acV24AdminPassword').addEventListener('keydown', function (e) { if (e.key === 'Enter') unlockAdmin(); });
    return modal;
  }

  function closeAdmin() {
    var modal = document.getElementById('acV24AdminModal'); if (modal) modal.classList.remove('open');
    adminPassword = '';
    var pw = document.getElementById('acV24AdminPassword'); if (pw) pw.value = '';
    var locked = document.getElementById('acV24AdminLocked'); if (locked) locked.hidden = false;
    var provision = document.getElementById('acV24AdminProvision'); if (provision) provision.hidden = true;
  }

  function openAdmin() {
    var modal = ensureAdminModal();
    issuedPartner = null;
    modal.classList.add('open');
    var pw = modal.querySelector('#acV24AdminPassword'); if (pw) setTimeout(function () { pw.focus(); }, 50);
  }

  async function unlockAdmin() {
    var api = global.AppointmentCompanionCloud;
    var input = document.getElementById('acV24AdminPassword');
    var status = document.getElementById('acV24AdminLoginStatus');
    var password = String(input && input.value || '');
    status.className = 'ac-v24-admin-status';
    if (!password) { status.textContent = 'Enter the admin password.'; status.classList.add('bad'); return; }
    if (!api || typeof api.adminPing !== 'function') { status.textContent = 'Admin Cloud support is not available in this build.'; status.classList.add('bad'); return; }
    status.textContent = 'Checking…';
    try {
      await api.adminPing(password);
      adminPassword = password;
      input.value = '';
      document.getElementById('acV24AdminLocked').hidden = true;
      document.getElementById('acV24AdminProvision').hidden = false;
      document.getElementById('acV24ProvisionStatus').textContent = 'Admin unlocked for this session only.';
      setTimeout(function () { var n = document.getElementById('acV24PartnerName'); if (n) n.focus(); }, 40);
    } catch (error) {
      var message = String(error && error.message || error || 'Admin login failed.');
      if (/unknown|unsupported|missing action/i.test(message)) message = 'Admin provisioning is not enabled on the Cloud service yet.';
      status.textContent = message;
      status.classList.add('bad');
    }
  }

  function cleanPhone(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (digits.indexOf('0') === 0) digits = '44' + digits.slice(1);
    return digits;
  }

  function whatsappMessage(partner) {
    return 'Hi ' + (partner.name || '') + ' 👋\n\nYour Appointment Companion access is ready.\n\nCompanion Login ID: ' + partner.companion_login_id + '\nPassword: ' + partner.password + '\n\nOpen Companion:\nhttps://aqcroft.github.io/Appointment_Companion/PWA/consolidated-v1/\n\nIf you have any problems getting in, just message me here.\n\nAdrian';
  }

  function renderIssued(partner) {
    var target = document.getElementById('acV24IssuedResult'); if (!target) return;
    var phone = cleanPhone(partner.mobile);
    var message = whatsappMessage(partner);
    var wa = phone ? 'https://wa.me/' + encodeURIComponent(phone) + '?text=' + encodeURIComponent(message) : 'https://wa.me/?text=' + encodeURIComponent(message);
    target.innerHTML = '<div class="ac-v24-admin-result"><strong>Partner access issued</strong><br>Companion Login ID: <code>' + escapeHtml(partner.companion_login_id) + '</code><br>Password: <code>' + escapeHtml(partner.password) + '</code></div>' +
      '<div class="ac-v24-admin-actions"><a class="primary" id="acV24WhatsAppPartner" href="' + wa + '" target="_blank" rel="noopener">💬 Send via WhatsApp</a><button type="button" id="acV24CopyPartner">📋 Copy login details</button><button type="button" id="acV24AnotherPartner">＋ Add another Partner</button></div>';
    target.querySelector('#acV24CopyPartner').addEventListener('click', function () {
      var text = message;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
      else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      this.textContent = '✅ Copied';
    });
    target.querySelector('#acV24AnotherPartner').addEventListener('click', function () {
      ['acV24PartnerName','acV24PartnerMobile','acV24PartnerEmail','acV24PartnerLogin'].forEach(function (id) { var el = document.getElementById(id); if (el) el.value = ''; });
      target.innerHTML = '';
      issuedPartner = null;
      var n = document.getElementById('acV24PartnerName'); if (n) n.focus();
    });
  }

  async function issuePartner() {
    var api = global.AppointmentCompanionCloud;
    var status = document.getElementById('acV24ProvisionStatus');
    var name = String(document.getElementById('acV24PartnerName').value || '').trim();
    var mobile = String(document.getElementById('acV24PartnerMobile').value || '').trim();
    var email = String(document.getElementById('acV24PartnerEmail').value || '').trim();
    var login = String(document.getElementById('acV24PartnerLogin').value || '').trim();
    status.className = 'ac-v24-admin-status';
    if (!name) { status.textContent = 'Partner name is required.'; status.classList.add('bad'); return; }
    if (!adminPassword) { status.textContent = 'Admin session has expired. Close and unlock again.'; status.classList.add('bad'); return; }
    if (!api || typeof api.adminProvisionPartner !== 'function') { status.textContent = 'Admin Cloud support is not available in this build.'; status.classList.add('bad'); return; }
    status.textContent = 'Issuing Partner record…';
    try {
      var result = await api.adminProvisionPartner(adminPassword, { name:name, mobile:mobile, email:email, companion_login_id:login });
      issuedPartner = result && result.partner || null;
      if (!issuedPartner || !issuedPartner.companion_login_id || !issuedPartner.password) throw new Error('Cloud did not return the new Companion credentials.');
      status.textContent = 'Issued successfully.';
      renderIssued(issuedPartner);
    } catch (error) {
      var message = String(error && error.message || error || 'Could not issue Partner record.');
      if (/unknown|unsupported|missing action/i.test(message)) message = 'Admin provisioning is not enabled on the Cloud service yet.';
      status.textContent = message;
      status.classList.add('bad');
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function installAdminButton() {
    if (!isMain) return true;
    var pane = document.querySelector('#cloudSettingsModal [data-settings-pane="hub"] .cloud-settings-list');
    if (!pane) return false;
    if (document.getElementById('acV24AdminSettingsBtn')) return true;
    var button = document.createElement('button');
    button.type = 'button'; button.id = 'acV24AdminSettingsBtn'; button.className = 'pill cloud-menu-item';
    button.innerHTML = '<span class="menu-ico">🔐</span><span>Admin settings</span>';
    button.addEventListener('click', function () { var settings = document.getElementById('cloudSettingsModal'); if (settings) settings.classList.remove('open'); openAdmin(); });
    var about = pane.querySelector('[data-settings-section="about"]');
    if (about) pane.insertBefore(button, about); else pane.appendChild(button);
    return true;
  }

  addStyles();
  var tries = 0;
  var timer = setInterval(function () {
    var v = installVersion();
    var a = installAdminButton();
    if (v && a) clearInterval(timer);
    else if (++tries > 200) clearInterval(timer);
  }, 50);
})(window);
