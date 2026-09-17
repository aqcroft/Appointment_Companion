/* Customer-facing Partner branding for specialist tools.
   Existing Adrian-branded markup remains the backwards-compatible fallback for
   old shares that do not carry a Partner ID. New shares resolve the creating
   Partner's public profile from Cloud and replace the contact treatment. */
(function (global) {
  'use strict';

  var api = global.AppointmentCompanionCloud;
  var params = new URL(location.href).searchParams;
  var cache = {};

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function authPartnerId() {
    try { var auth = JSON.parse(sessionStorage.getItem('apptCloudPilotAuthSession') || 'null'); return auth && auth.partner_id ? clean(auth.partner_id) : ''; }
    catch (_) { return ''; }
  }
  function safeHttps(value) {
    try { var u = new URL(clean(value)); return u.protocol === 'https:' ? u.href : ''; }
    catch (_) { return ''; }
  }
  function digits(value) {
    var d = clean(value).replace(/\D/g, '');
    if (/^0\d{9,10}$/.test(d)) d = '44' + d.slice(1);
    return d;
  }
  function tel(value) {
    var raw = clean(value); if (!raw) return '';
    var d = digits(raw); return d ? 'tel:+' + d : '';
  }
  function initials(name) {
    var parts = clean(name).split(/\s+/).filter(Boolean);
    return ((parts[0] || 'U').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : 'W')).toUpperCase();
  }
  function avatar(profile) {
    var photo = safeHttps(profile.photo_url); if (photo) return photo;
    var text = initials(profile.name);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="#7a42c8"/><text x="64" y="75" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="white">' + esc(text) + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function normalise(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    return {
      partner_id: clean(raw.partner_id || raw.companion_login_id),
      name: clean(raw.name || raw.partner_name) || 'Your UW Partner',
      mobile: clean(raw.mobile), email: clean(raw.email),
      join: safeHttps(raw.join || raw.join_url || raw.uw_link), town: clean(raw.town), strap: clean(raw.strap),
      photo_url: safeHttps(raw.photo_url || raw.photo), booking_url: safeHttps(raw.booking_url || raw.booking), website_url: safeHttps(raw.website_url || raw.website)
    };
  }
  function role(profile) { return 'UW Authorised Partner' + (profile.town ? ' · ' + profile.town : ''); }
  function firstName(profile) { return clean(profile.name).split(/\s+/)[0] || 'there'; }
  function contact(profile, toolName) {
    var first = firstName(profile), tool = toolName || 'comparison';
    var body = "Hi " + first + ", I've just used your " + tool + " and I'd like to know more";
    var d = digits(profile.mobile);
    return {
      whatsapp: d ? 'https://wa.me/' + d + '?text=' + encodeURIComponent(body) : '',
      phone: tel(profile.mobile),
      email: profile.email ? 'mailto:' + encodeURIComponent(profile.email) + '?subject=' + encodeURIComponent(tool) + '&body=' + encodeURIComponent(body) : ''
    };
  }
  async function load(partnerId) {
    partnerId = clean(partnerId).toLowerCase();
    if (!partnerId || !api || typeof api.getPublicPartnerProfile !== 'function') return null;
    if (cache[partnerId]) return cache[partnerId];
    try {
      var result = await api.getPublicPartnerProfile(partnerId);
      var profile = normalise(result && result.partner);
      cache[partnerId] = profile;
      return profile;
    } catch (err) {
      console.warn('Public Partner profile unavailable.', err);
      return null;
    }
  }
  function setHref(el, href) {
    if (!el) return;
    if (href) { el.href = href; el.hidden = false; }
    else { el.hidden = true; el.removeAttribute('href'); }
  }
  function setImg(el, src, name) { if (el) { el.src = src; el.alt = name || ''; } }
  function partnerFooterHtml(profile) {
    var site = profile.website_url;
    return esc(profile.name) + ' - ' + esc(role(profile)) + (site ? ' · <a href="' + esc(site) + '" target="_blank" rel="noopener">' + esc(new URL(site).hostname.replace(/^www\./, '')) + '</a>' : '');
  }
  function unavailableLabel(root, selector) { var el = root && root.querySelector(selector); if (el) el.textContent = 'Partner contact details unavailable'; }

  function neutraliseEv() {
    var wrap = document.getElementById('acEvProfile'); if (!wrap) return;
    var name = wrap.querySelector('.ac-ev-profile-name'); if (name) name.textContent = 'Your UW Partner';
    var label = wrap.querySelector('.ac-ev-contact-label'); if (label) label.textContent = 'Partner contact details loading…';
    wrap.querySelectorAll('a').forEach(function (a) { a.hidden = true; });
    var conversion = document.getElementById('acEvConversion');
    if (conversion) conversion.querySelectorAll('a').forEach(function (a) { if (!/UW basket/i.test(a.textContent || '')) a.hidden = true; });
  }
  function patchEv(profile) {
    if (!profile) return;
    var wrap = document.getElementById('acEvProfile'); if (!wrap) return;
    var c = contact(profile, 'EV comparison'), img = avatar(profile), first = firstName(profile);
    setImg(wrap.querySelector('.ac-ev-profile-photo img'), img, profile.name);
    setImg(wrap.querySelector('.ac-ev-profile-id img'), img, '');
    var name = wrap.querySelector('.ac-ev-profile-name'); if (name) name.textContent = profile.name;
    var r = wrap.querySelector('.ac-ev-profile-role'); if (r) r.textContent = role(profile);
    var label = wrap.querySelector('.ac-ev-contact-label'); if (label) label.textContent = 'Contact ' + first;
    var toggle = wrap.querySelector('.ac-ev-profile-photo'); if (toggle) toggle.setAttribute('aria-label', 'Contact ' + profile.name);
    var routes = wrap.querySelectorAll('.ac-ev-contact-route');
    setHref(wrap.querySelector('.ac-ev-contact-route.whatsapp'), c.whatsapp);
    routes.forEach(function (a) { var t = clean(a.textContent).toLowerCase(); if (t.indexOf('email') >= 0) setHref(a, c.email); if (t.indexOf('call') >= 0) setHref(a, c.phone); });
    wrap.querySelectorAll('.ac-ev-profile-action').forEach(function (a) { var t = clean(a.textContent).toLowerCase(); if (t.indexOf('book') >= 0) setHref(a, profile.booking_url); if (t.indexOf('quote') >= 0) setHref(a, profile.join); });
    var siteWrap = wrap.querySelector('.ac-ev-profile-site'), site = siteWrap && siteWrap.querySelector('a');
    if (siteWrap) siteWrap.hidden = !profile.website_url;
    if (site && profile.website_url) { setHref(site, profile.website_url); site.textContent = new URL(profile.website_url).hostname.replace(/^www\./, ''); }
    var conversion = document.getElementById('acEvConversion');
    if (conversion) {
      conversion.querySelectorAll('.ac-ev-cta').forEach(function (a) { var t = clean(a.textContent).toLowerCase(); if (t.indexOf('whatsapp') >= 0) setHref(a, c.whatsapp); else if (t.indexOf('personalised uw quote') >= 0) setHref(a, profile.join); else if (t.indexOf('book a chat') >= 0) setHref(a, profile.booking_url); });
      var footer = conversion.querySelector('.ac-ev-partner'); if (footer) footer.innerHTML = partnerFooterHtml(profile);
    }
  }

  function neutraliseFix(doc) {
    if (!doc) return;
    var wrap = doc.getElementById('sifProfile'); if (!wrap) return;
    var name = wrap.querySelector('.sif-profile-name'); if (name) name.textContent = 'Your UW Partner';
    var label = wrap.querySelector('.sif-contact-label'); if (label) label.textContent = 'Partner contact details loading…';
    wrap.querySelectorAll('a').forEach(function (a) { a.hidden = true; });
    var conversion = doc.getElementById('sifConversion');
    if (conversion) conversion.querySelectorAll('a').forEach(function (a) { if (!/UW basket/i.test(a.textContent || '')) a.hidden = true; });
  }
  function patchFix(doc, profile) {
    if (!doc || !profile) return;
    var wrap = doc.getElementById('sifProfile'); if (!wrap) return;
    var c = contact(profile, 'Should I Fix? comparison'), img = avatar(profile), first = firstName(profile);
    setImg(wrap.querySelector('.sif-profile-photo img'), img, profile.name);
    setImg(wrap.querySelector('.sif-profile-id img'), img, '');
    var name = wrap.querySelector('.sif-profile-name'); if (name) name.textContent = profile.name;
    var r = wrap.querySelector('.sif-profile-role'); if (r) r.textContent = role(profile);
    var label = wrap.querySelector('.sif-contact-label'); if (label) label.textContent = 'Contact ' + first;
    var toggle = wrap.querySelector('.sif-profile-photo'); if (toggle) toggle.setAttribute('aria-label', 'Contact ' + profile.name);
    var routes = wrap.querySelectorAll('.sif-contact-route');
    setHref(wrap.querySelector('.sif-contact-route.whatsapp'), c.whatsapp);
    routes.forEach(function (a) { var t = clean(a.textContent).toLowerCase(); if (t.indexOf('email') >= 0) setHref(a, c.email); if (t.indexOf('call') >= 0) setHref(a, c.phone); });
    wrap.querySelectorAll('.sif-profile-action').forEach(function (a) { var t = clean(a.textContent).toLowerCase(); if (t.indexOf('book') >= 0) setHref(a, profile.booking_url); if (t.indexOf('quote') >= 0) setHref(a, profile.join); });
    var siteWrap = wrap.querySelector('.sif-profile-site'), site = siteWrap && siteWrap.querySelector('a');
    if (siteWrap) siteWrap.hidden = !profile.website_url;
    if (site && profile.website_url) { setHref(site, profile.website_url); site.textContent = new URL(profile.website_url).hostname.replace(/^www\./, ''); }
    var conversion = doc.getElementById('sifConversion');
    if (conversion) {
      conversion.querySelectorAll('.sif-cta').forEach(function (a) { var t = clean(a.textContent).toLowerCase(); if (t.indexOf('whatsapp') >= 0) setHref(a, c.whatsapp); else if (t.indexOf('personalised uw quote') >= 0) setHref(a, profile.join); else if (t.indexOf('book a chat') >= 0) setHref(a, profile.booking_url); });
      var footer = conversion.querySelector('.sif-partner'); if (footer) footer.innerHTML = partnerFooterHtml(profile);
    }
  }

  async function applyEv(snapshot) {
    var partnerId = clean(snapshot && snapshot.partner_id);
    if (!partnerId) return; /* legacy Adrian share - retain legacy branding */
    neutraliseEv();
    var profile = await load(partnerId);
    if (profile) patchEv(profile); else unavailableLabel(document, '.ac-ev-contact-label');
  }

  async function applyFix() {
    var frame = document.getElementById('fixFrame'); if (!frame) return;
    var partnerId = clean(params.get('pid') || authPartnerId());
    if (!partnerId) return; /* legacy Adrian/public route */
    var doc; try { doc = frame.contentDocument || frame.contentWindow.document; } catch (_) { return; }
    if (!doc || !doc.getElementById('sifProfile')) return;
    neutraliseFix(doc);
    var profile = await load(partnerId);
    if (profile) patchFix(doc, profile); else unavailableLabel(doc, '.sif-contact-label');
  }

  global.addEventListener('ac:ev-public-snapshot', function (event) { applyEv(event && event.detail || {}); });
  if (global.__AppointmentCompanionEvSharedSnapshot) applyEv(global.__AppointmentCompanionEvSharedSnapshot);

  var frame = document.getElementById('fixFrame');
  if (frame) frame.addEventListener('load', function () { setTimeout(applyFix, 120); setTimeout(applyFix, 500); });
  var tries = 0, timer = setInterval(function () { applyFix(); if (++tries > 120) clearInterval(timer); }, 150);
})(window);
