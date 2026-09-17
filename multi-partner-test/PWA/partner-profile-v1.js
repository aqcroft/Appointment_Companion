/* Appointment Companion Partner Profile v1
   Portable account/profile bridge shared by v2.42 and future Companion shells.

   Cloud is the source of truth when available. The existing
   `apptCompanionPartner` localStorage record remains the offline/local cache so
   the current Partner settings and onboarding flow keep working unchanged.
*/
(function (global) {
  'use strict';

  var api = global.AppointmentCompanionCloud;
  if (!api) return;

  var AUTH_KEY = 'apptCloudPilotAuthSession';
  var LOCAL_KEY = 'apptCompanionPartner';
  var CLOUD_CACHE_KEY = 'apptCompanionPartnerCloudProfileV1';
  var syncing = false;

  function readJson(storage, key) {
    try { return JSON.parse(storage.getItem(key) || 'null'); }
    catch (_) { return null; }
  }

  function getAuth() {
    var auth = readJson(sessionStorage, AUTH_KEY);
    return auth && auth.partner_id && auth.workspace_key ? auth : null;
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

  function cacheProfile(profile) {
    var cloud = normalise(profile);
    try { localStorage.setItem(CLOUD_CACHE_KEY, JSON.stringify(cloud)); } catch (_) {}

    var existing = localPartner();
    var local = Object.assign({}, existing, {
      name: cloud.name || existing.name || '',
      join: cloud.join || existing.join || '',
      town: cloud.town || '',
      strap: cloud.strap || '',
      mobile: cloud.mobile || '',
      email: cloud.email || '',
      photo_url: cloud.photo_url || '',
      booking_url: cloud.booking_url || '',
      website_url: cloud.website_url || '',
      partner_id: cloud.partner_id || ''
    });
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); } catch (_) {}
    global.dispatchEvent(new CustomEvent('ac:partner-profile-ready', { detail: cloud }));
    return cloud;
  }

  function composeForSave() {
    var local = localPartner();
    var cloud = cachedCloudPartner();
    return normalise(Object.assign({}, cloud, local, {
      name: local.name || cloud.name,
      join: local.join || cloud.join,
      town: Object.prototype.hasOwnProperty.call(local, 'town') ? local.town : cloud.town,
      strap: Object.prototype.hasOwnProperty.call(local, 'strap') ? local.strap : cloud.strap
    }));
  }

  async function hydrate() {
    if (syncing) return null;
    var auth = getAuth();
    if (!auth || typeof api.getPartnerProfile !== 'function') return null;
    syncing = true;
    try {
      var response = await api.getPartnerProfile(auth);
      var cloud = normalise(response && response.partner);

      /* Migration path: if an older Partner account exists but has no Cloud
         profile details yet, preserve the user's existing local identity. */
      var local = localPartner();
      if (!hasExistingIdentity(cloud) && hasExistingIdentity(local) && typeof api.savePartnerProfile === 'function') {
        var migrated = normalise(Object.assign({}, cloud, local));
        var saved = await api.savePartnerProfile(auth, migrated);
        return cacheProfile(saved && saved.partner ? saved.partner : migrated);
      }

      return cacheProfile(cloud);
    } catch (err) {
      /* The live Apps Script may not have this API until the backend helper is
         deployed. Existing v2.42 local Partner settings must keep working. */
      console.warn('Partner Cloud profile unavailable; using local settings.', err);
      return null;
    } finally {
      syncing = false;
    }
  }

  async function saveCurrent() {
    if (syncing) return null;
    var auth = getAuth();
    if (!auth || typeof api.savePartnerProfile !== 'function') return null;
    var profile = composeForSave();
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
    var save = document.getElementById('ppSaveBtn');
    if (!save || save.dataset.cloudProfileWired === '1') return false;
    save.dataset.cloudProfileWired = '1';
    save.addEventListener('click', function () {
      /* Existing v2.42 handler writes localStorage first. */
      setTimeout(saveCurrent, 0);
    });
    return true;
  }

  global.addEventListener('ac:cloud-authenticated', function () {
    hydrate();
  });

  global.AppointmentCompanionPartnerProfile = {
    hydrate: hydrate,
    saveCurrent: saveCurrent,
    getCached: function () { return normalise(Object.assign({}, cachedCloudPartner(), localPartner())); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      wireExistingSettings();
      hydrate();
    });
  } else {
    wireExistingSettings();
    hydrate();
  }

  var tries = 0;
  var timer = setInterval(function () {
    if (wireExistingSettings() || ++tries > 100) clearInterval(timer);
  }, 100);
})(window);
