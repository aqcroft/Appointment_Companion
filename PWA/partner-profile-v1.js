/* Appointment Companion Partner Profile v2.44
   Cloud is the source of truth for Partner identity. The local Partner record
   remains an offline cache so appointments and sharing continue to work when
   Cloud is temporarily unavailable.
*/
(function (global) {
  'use strict';

  var api = global.AppointmentCompanionCloud;
  if (!api) return;

  var AUTH_KEY = 'apptCloudPilotAuthSession';
  var DEVICE_AUTH_KEY = 'apptCloudPilotAuthDeviceV1';
  var LOCAL_KEY = 'apptCompanionPartner';
  var CLOUD_CACHE_KEY = 'apptCompanionPartnerCloudProfileV1';
  var syncing = false;

  function readJson(storage, key) {
    try { return JSON.parse(storage.getItem(key) || 'null'); }
    catch (_) { return null; }
  }

  function validAuth(auth) {
    return !!(auth && auth.partner_id && auth.workspace_key);
  }

  function getAuth() {
    var auth = readJson(sessionStorage, AUTH_KEY);
    if (!validAuth(auth)) auth = readJson(localStorage, DEVICE_AUTH_KEY);
    if (validAuth(auth)) {
      try { sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth)); } catch (_) {}
      return auth;
    }
    return null;
  }

  function localPartner() {
    var p = readJson(localStorage, LOCAL_KEY);
    return p && typeof p === 'object' ? p : {};
  }

  function cachedCloudPartner() {
    var p = readJson(localStorage, CLOUD_CACHE_KEY);
    return p && typeof p === 'object' ? p : {};
  }

  function clean(v) { return String(v == null ? '' : v).trim(); }

  function normalise(profile) {
    profile = profile && typeof profile === 'object' ? profile : {};
    return {
      partner_id: clean(profile.partner_id || profile.companion_login_id),
      name: clean(profile.name || profile.partner_name),
      mobile: clean(profile.mobile),
      email: clean(profile.email),
      join: clean(profile.join || profile.join_url || profile.uw_link),
      town: clean(profile.town),
      strap: clean(profile.strap),
      photo_url: clean(profile.photo_url || profile.photo),
      booking_url: clean(profile.booking_url || profile.booking),
      website_url: clean(profile.website_url || profile.website),
      status: clean(profile.status || 'active'),
      updated_at: clean(profile.updated_at)
    };
  }

  function hasExistingIdentity(profile) {
    return !!(clean(profile && profile.name) && clean(profile && profile.join));
  }

  function writeLocal(profile) {
    var existing = localPartner();
    var p = normalise(Object.assign({}, existing, profile || {}));
    var local = Object.assign({}, existing, p);
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); } catch (_) {}
    return local;
  }

  function cacheProfile(profile) {
    var cloud = normalise(profile);
    try { localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(cloud)); } catch (_) {}
    writeLocal(cloud);
    populateExtraFields(cloud);
    global.dispatchEvent(new CustomEvent('ac:partner-profile-ready', { detail: cloud }));
    return cloud;
  }

  function composeForSave() {
    var local = localPartner();
    var cloud = cachedCloudPartner();
    return normalise(Object.assign({}, cloud, local, {
      name: local.name || cloud.name,
      join: local.join || cloud.join
    }));
  }

  function extraFieldHtml() {
    return [
      '<div class="field ac-partner-cloud-field"><label>Companion Login ID</label><input type="text" id="ppPartnerId" readonly autocomplete="off"><p class="sub" style="margin-top:.3rem">Your UW Partner ID is used as your Companion login.</p></div>',
      '<div class="field ac-partner-cloud-field"><label>Mobile</label><input type="tel" id="ppMobile" autocomplete="tel" inputmode="tel"></div>',
      '<div class="field ac-partner-cloud-field"><label>Email</label><input type="email" id="ppEmail" autocomplete="email" inputmode="email"></div>',
      '<div class="field ac-partner-cloud-field"><label>Profile photo URL <span class="sub">https://...</span></label><input type="url" id="ppPhoto" autocomplete="url" inputmode="url" placeholder="https://..."><div id="ppPhotoPreview" style="margin-top:.45rem"></div></div>',
      '<div class="field ac-partner-cloud-field"><label>Booking link <span class="sub">optional</span></label><input type="url" id="ppBooking" autocomplete="url" inputmode="url" placeholder="https://..."></div>',
      '<div class="field ac-partner-cloud-field"><label>Website <span class="sub">optional</span></label><input type="url" id="ppWebsite" autocomplete="url" inputmode="url" placeholder="https://..."></div>'
    ].join('');
  }

  function ensureExtraFields() {
    var prompt = document.getElementById('partnerPrompt');
    var save = document.getElementById('ppSaveBtn');
    if (!prompt || !save || document.getElementById('ppPartnerId')) return !!document.getElementById('ppPartnerId');
    var err = document.getElementById('ppErr');
    if (!err) return false;
    var holder = document.createElement('div');
    holder.id = 'acPartnerCloudFields';
    holder.innerHTML = extraFieldHtml();
    err.parentNode.insertBefore(holder, err);
    var photo = document.getElementById('ppPhoto');
    if (photo) photo.addEventListener('input', updatePhotoPreview);
    return true;
  }

  function safeHttps(value) {
    try {
      var u = new URL(clean(value));
      return u.protocol === 'https:' ? u.href : '';
    } catch (_) { return ''; }
  }

  function updatePhotoPreview() {
    var input = document.getElementById('ppPhoto');
    var host = document.getElementById('ppPhotoPreview');
    if (!input || !host) return;
    var src = safeHttps(input.value);
    host.innerHTML = src ? '<img src="' + src.replace(/&/g,'&amp;').replace(/"/g,'&quot;') + '" alt="Profile preview" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:1px solid rgba(122,66,200,.18)">' : '';
  }

  function populateExtraFields(profile) {
    if (!ensureExtraFields()) return;
    var p = normalise(profile || Object.assign({}, cachedCloudPartner(), localPartner()));
    var map = {
      ppPartnerId: p.partner_id,
      ppMobile: p.mobile,
      ppEmail: p.email,
      ppPhoto: p.photo_url,
      ppBooking: p.booking_url,
      ppWebsite: p.website_url
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el && document.activeElement !== el) el.value = map[id] || '';
    });
    updatePhotoPreview();
  }

  function captureExtraFields() {
    ensureExtraFields();
    var current = localPartner();
    var auth = getAuth();
    var next = Object.assign({}, current, {
      partner_id: auth && auth.partner_id || current.partner_id || '',
      mobile: clean((document.getElementById('ppMobile') || {}).value),
      email: clean((document.getElementById('ppEmail') || {}).value),
      photo_url: clean((document.getElementById('ppPhoto') || {}).value),
      booking_url: clean((document.getElementById('ppBooking') || {}).value),
      website_url: clean((document.getElementById('ppWebsite') || {}).value)
    });
    writeLocal(next);
    return next;
  }

  async function hydrate() {
    if (syncing) return null;
    var auth = getAuth();
    if (!auth || typeof api.getPartnerProfile !== 'function') return null;
    syncing = true;
    try {
      var response = await api.getPartnerProfile(auth);
      var cloud = normalise(response && response.partner);
      var local = localPartner();

      if (!hasExistingIdentity(cloud) && hasExistingIdentity(local) && typeof api.savePartnerProfile === 'function') {
        var migrated = normalise(Object.assign({}, cloud, local, { partner_id: auth.partner_id }));
        var saved = await api.savePartnerProfile(auth, migrated);
        return cacheProfile(saved && saved.partner ? saved.partner : migrated);
      }

      return cacheProfile(cloud);
    } catch (err) {
      console.warn('Partner Cloud profile unavailable; using local settings.', err);
      populateExtraFields(Object.assign({}, cachedCloudPartner(), localPartner()));
      return null;
    } finally {
      syncing = false;
    }
  }

  async function saveCurrent() {
    if (syncing) return null;
    var auth = getAuth();
    if (!auth || typeof api.savePartnerProfile !== 'function') return null;
    captureExtraFields();
    var profile = composeForSave();
    profile.partner_id = auth.partner_id;
    if (!profile.name || !profile.join) return null;
    syncing = true;
    try {
      var response = await api.savePartnerProfile(auth, profile);
      return cacheProfile(response && response.partner ? response.partner : profile);
    } catch (err) {
      console.warn('Partner profile saved locally but Cloud sync failed.', err);
      return null;
    } finally {
      syncing = false;
    }
  }

  function wireExistingSettings() {
    ensureExtraFields();
    var save = document.getElementById('ppSaveBtn');
    var prompt = document.getElementById('partnerPrompt');
    if (!save || !prompt) return false;

    if (save.dataset.cloudProfileWired !== '1') {
      save.dataset.cloudProfileWired = '1';
      save.addEventListener('click', function () {
        captureExtraFields();
        setTimeout(saveCurrent, 0);
      });
    }

    if (prompt.dataset.cloudProfileOpenWired !== '1') {
      prompt.dataset.cloudProfileOpenWired = '1';
      var wasOpen = prompt.classList.contains('open');
      new MutationObserver(function () {
        var isOpen = prompt.classList.contains('open');
        if (isOpen && !wasOpen) populateExtraFields(Object.assign({}, cachedCloudPartner(), localPartner()));
        wasOpen = isOpen;
      }).observe(prompt, { attributes: true, attributeFilter: ['class'] });
    }

    populateExtraFields(Object.assign({}, cachedCloudPartner(), localPartner()));
    return true;
  }

  global.addEventListener('ac:cloud-authenticated', hydrate);

  global.AppointmentCompanionPartnerProfile = {
    hydrate: hydrate,
    saveCurrent: saveCurrent,
    getCached: function () { return normalise(Object.assign({}, cachedCloudPartner(), localPartner())); }
  };

  function boot() {
    wireExistingSettings();
    hydrate();
    var tries = 0;
    var timer = setInterval(function () {
      if (wireExistingSettings() || ++tries > 120) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
