/* v2.64.4 - verify the signed-in UW Partner before creating customer-facing links.
   Never infer a replacement ID, expose Companion passwords, or mutate Cloud/local data. */
(function (global) {
  'use strict';
  var api = global.AppointmentCompanionCloud;
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function validAuth(a) { return !!(a && clean(a.partner_id) && clean(a.workspace_key)); }
  function read(store, key) {
    try { var a = JSON.parse(store.getItem(key) || 'null'); return validAuth(a) ? a : null; }
    catch (_) { return null; }
  }
  function currentAuth() {
    return read(sessionStorage, 'apptCloudPilotAuthSession') ||
      read(localStorage, 'apptCloudPilotAuthDeviceV1');
  }
  function legacyId(id) { return /^p_[0-9a-f]{10,}$/i.test(clean(id)); }
  function matchingProfile(response, requestedId) {
    var p = response && response.partner;
    if (!p || typeof p !== 'object') return false;
    var id = clean(p.partner_id || p.companion_login_id);
    return !!(id && id.toLowerCase() === requestedId.toLowerCase() &&
      clean(p.name || p.partner_name));
  }
  async function resolve() {
    var auth = currentAuth();
    if (!auth) throw new Error('Connect Companion Cloud with your UW Partner ID and Companion password before sharing.');
    var id = clean(auth.partner_id);
    if (legacyId(id)) throw new Error('This device is still using an old Partner login. Reconnect Companion Cloud using your UW-issued Partner ID before sharing. Your customer records will not be changed.');
    if (!api || typeof api.getPartnerProfile !== 'function' || typeof api.getPublicPartnerProfile !== 'function')
      throw new Error('Partner verification is not ready. Refresh Appointment Companion and try again.');
    var privateResult, publicResult;
    try { privateResult = await api.getPartnerProfile(auth); }
    catch (error) { throw new Error('The signed-in UW Partner could not be verified. Check the Cloud connection and login, then try again.'); }
    if (!matchingProfile(privateResult, id)) throw new Error('The saved Companion login does not match a valid UW Partner profile. Reconnect Cloud using your UW Partner ID.');
    try { publicResult = await api.getPublicPartnerProfile(id); }
    catch (error) { throw new Error('Your public Partner contact details could not be loaded. Check your Cloud profile and connection before sharing.'); }
    if (!matchingProfile(publicResult, id)) throw new Error('Your public Partner profile does not match the signed-in UW Partner ID. Please check My profile before sharing.');
    return clean(publicResult.partner.partner_id);
  }
  global.AppointmentCompanionShareIdentity = { resolve: resolve, currentAuth: currentAuth, legacyId: legacyId };
})(window);
