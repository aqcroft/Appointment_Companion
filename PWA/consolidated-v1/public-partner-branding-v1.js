/* Customer-facing Partner branding for specialist tools.
   Every entry point uses the creating Partner's verified profile. Missing owner
   details fail closed: no other Partner's photo, quote or contact link is shown. */
(function (global) {
  'use strict';

  var api = global.AppointmentCompanionCloud;
  var params = new URL(location.href).searchParams;
  var cache = {}, inFlight = {};
  var PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><circle cx="48" cy="48" r="48" fill="#7a42c8"/><text x="48" y="61" font-family="Arial" font-size="32" text-anchor="middle" fill="white">UW</text></svg>');
  global.__AC_EV_PARTNER_QUOTE = '';
  function activeAuth() { try { var a=JSON.parse(sessionStorage.getItem('apptCloudPilotAuthSession')||'null'); if(!(a&&a.partner_id&&a.workspace_key))a=JSON.parse(localStorage.getItem('apptCloudPilotAuthDeviceV1')||'null'); return a&&a.partner_id&&a.workspace_key?a:null; }catch(_){return null;} }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function clean(value) { return String(value == null ? '' : value).trim(); }
  function authPartnerId() { var a=activeAuth(); return a?clean(a.partner_id):''; }
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
      join: safeHttps(raw.join || raw.join_url || raw.uw_link) || (/^[a-z0-9][a-z0-9._-]{1,100}$/i.test(clean(raw.partner_slug || raw.slug)) ? 'https://uw.partners/' + encodeURIComponent(clean(raw.partner_slug || raw.slug)) + '/join' : ''), town: clean(raw.town), strap: clean(raw.strap),
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
  function verified(raw, partnerId) {
    if (!raw || typeof raw !== 'object' || !clean(raw.name || raw.partner_name)) return null;
    var id=clean(raw.partner_id || raw.companion_login_id).toLowerCase();
    if (id && id !== partnerId) return null;
    // Public records may omit their ID. They are already looked up by ID.
    return normalise(Object.assign({},raw,{partner_id:partnerId}));
  }
  function ownCachedProfile(partnerId) {
    var auth=activeAuth();
    if (!auth || clean(auth.partner_id).toLowerCase() !== partnerId) return null;
    try {
      var owner=clean(localStorage.getItem('apptCompanionPartnerCloudOwnerV1')).toLowerCase();
      var cached=JSON.parse(localStorage.getItem('apptCompanionPartnerCloudProfileV1')||'null');
      var id=clean(cached&&(cached.partner_id||cached.companion_login_id)).toLowerCase();
      if (cached && (id===partnerId || (!id&&owner===partnerId))) return verified(cached,partnerId);
    }catch(_){}
    return null;
  }
  async function load(partnerId) {
    partnerId=clean(partnerId).toLowerCase();
    if(!partnerId || !api) return null;
    if(cache[partnerId]) return cache[partnerId];
    if(inFlight[partnerId]) return inFlight[partnerId];
    inFlight[partnerId]=(async function(){
    var profile=null;
    try {
      if(typeof api.getPublicPartnerProfile==='function') {
        var response=await api.getPublicPartnerProfile(partnerId);
        profile=verified(response&&response.partner,partnerId);
      }
    }catch(err){console.warn('Public Partner lookup unavailable.',err);}
    // The signed-in Partner can also use their own authenticated Cloud profile.
    var auth=activeAuth();
    if(!profile && auth && clean(auth.partner_id).toLowerCase()===partnerId && typeof api.getPartnerProfile==='function'){
      try {var own=await api.getPartnerProfile(auth);profile=verified(own&&own.partner,partnerId);}
      catch(err){console.warn('Signed-in Partner profile unavailable.',err);}
    }
    if(!profile) profile=ownCachedProfile(partnerId);
    if(profile)cache[partnerId]=profile;
    return profile;
    })();
    try{return await inFlight[partnerId];}finally{delete inFlight[partnerId];}
  }
  function installDrag(root, buttonSelector) {
    if(!root || root.dataset.acDragReady==='1') return;
    var button=root.querySelector(buttonSelector);if(!button)return;
    root.dataset.acDragReady='1';button.style.touchAction='none';
    var offsetX=0,offsetY=0,gesture=null,suppressUntil=0;
    function keepInView(x,y,rect){
      return {x:Math.min(Math.max(x,6-rect.left),innerWidth-6-rect.right+x),
              y:Math.min(Math.max(y,6-rect.top),innerHeight-6-rect.bottom+y)};
    }
    button.addEventListener('pointerdown',function(e){
      if(e.button!==0 || e.isPrimary===false)return;
      gesture={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:offsetX,y:offsetY,rect:button.getBoundingClientRect(),dragging:false};
      try{button.setPointerCapture(e.pointerId);}catch(_){}
    });
    button.addEventListener('pointermove',function(e){
      var g=gesture;if(!g||g.id!==e.pointerId)return;
      var dx=e.clientX-g.startX,dy=e.clientY-g.startY;
      if(!g.dragging && Math.hypot(dx,dy)<8)return;
      g.dragging=true;
      var x=g.x+dx,y=g.y+dy;
      x=Math.max(6-g.rect.left+g.x,Math.min(x,innerWidth-6-g.rect.right+g.x));
      y=Math.max(6-g.rect.top+g.y,Math.min(y,innerHeight-6-g.rect.bottom+g.y));
      offsetX=x;offsetY=y;root.style.transform='translate('+x+'px,'+y+'px)';
    });
    function end(e){if(!gesture||gesture.id!==e.pointerId)return;if(gesture.dragging)suppressUntil=Date.now()+450;gesture=null;}
    button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);
    button.addEventListener('click',function(e){if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();suppressUntil=0;}},true);
    global.addEventListener('resize',function(){offsetX=0;offsetY=0;root.style.transform='';});
  }
  function patchOriginalCalculatorLinks(doc,profile) {
    if(!doc)return;
    doc.__acResolvedPartner=profile||null;
    doc.querySelectorAll('a').forEach(function(a){
      var href=a.getAttribute('href')||'';
      var join=a.dataset.acPartnerLink==='join'||/uw\.partners\/adrian\.croft\/join/i.test(href);
      var book=a.dataset.acPartnerLink==='booking'||/tidycal\.com\/aqcroft\/uwpresent/i.test(href);
      if(join||book){a.dataset.acPartnerLink=join?'join':'booking';setHref(a,profile?(join?profile.join:profile.booking_url):'');}
    });
    // The standalone calculator rebuilds its footer after input changes.
    // Attribution in the embedded team view must not look like the current Partner.
    var foot=doc.getElementById('foot');
    if(foot){
      var intro=foot.firstElementChild;
      if(intro && /Built by Authorised Utility Warehouse Partner Adrian Croft/.test(intro.textContent||''))
        intro.textContent='Independent comparison provided through Appointment Companion - not an official UW quote.';
      var last=foot.lastElementChild;
      if(last && (last.querySelector('[data-ac-partner-link="join"]') || /uw\.partners\/adrian\.croft\/join/i.test(last.innerHTML||'')))
        last.hidden=!(profile && profile.join);
      if(!foot.__acPartnerObserver && typeof MutationObserver==='function'){
        foot.__acPartnerObserver=new MutationObserver(function(){patchOriginalCalculatorLinks(doc,doc.__acResolvedPartner);});
        foot.__acPartnerObserver.observe(foot,{childList:true,subtree:true});
      }
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
    setImg(wrap.querySelector('.ac-ev-profile-photo img'),PLACEHOLDER,'Your UW Partner');
    setImg(wrap.querySelector('.ac-ev-profile-id img'),PLACEHOLDER,'');
    global.__AC_EV_PARTNER_QUOTE='';
    global.__AC_EV_PARTNER_PROFILE=null;
    var open=document.getElementById('acEvOpenBasket');var snapshot=global.__AppointmentCompanionEvSharedSnapshot||{};
    if(open && !safeHttps(snapshot.basket_url))open.disabled=true;
    var label = wrap.querySelector('.ac-ev-contact-label'); if (label) label.textContent = 'Partner contact details loading…';
    wrap.querySelectorAll('a').forEach(function (a) { a.hidden = true; });
    var conversion = document.getElementById('acEvConversion');
    if (conversion) conversion.querySelectorAll('a').forEach(function (a) { if (!/UW basket/i.test(a.textContent || '')) a.hidden = true; });
  }
  function patchEv(profile) {
    if (!profile) return;
    var wrap = document.getElementById('acEvProfile'); if (!wrap) return;
    var c = contact(profile, 'EV comparison'), img = avatar(profile), first = firstName(profile);
    global.__AC_EV_PARTNER_QUOTE=profile.join;
    global.__AC_EV_PARTNER_PROFILE=profile;
    var open=document.getElementById('acEvOpenBasket');if(open && (profile.join||safeHttps((global.__AppointmentCompanionEvSharedSnapshot||{}).basket_url)))open.disabled=false;
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
      var direct=conversion.querySelector('.ac-ev-cta.secondary span');if(direct)direct.textContent='Any questions? WhatsApp '+first;
      var footer = conversion.querySelector('.ac-ev-partner'); if (footer) footer.innerHTML = partnerFooterHtml(profile);
    }
  }

  function neutraliseFix(doc) {
    if (!doc) return;
    var wrap = doc.getElementById('sifProfile'); if (!wrap) return;
    var name = wrap.querySelector('.sif-profile-name'); if (name) name.textContent = 'Your UW Partner';
    setImg(wrap.querySelector('.sif-profile-photo img'),PLACEHOLDER,'Your UW Partner');
    setImg(wrap.querySelector('.sif-profile-id img'),PLACEHOLDER,'');
    patchOriginalCalculatorLinks(doc,null);
    var label = wrap.querySelector('.sif-contact-label'); if (label) label.textContent = 'Partner contact details loading…';
    wrap.querySelectorAll('a').forEach(function (a) { a.hidden = true; });
    var conversion = doc.getElementById('sifConversion');
    if (conversion) conversion.querySelectorAll('a').forEach(function (a) { if (!/UW basket/i.test(a.textContent || '')) a.hidden = true; });
  }
  function patchFix(doc, profile) {
    if (!doc || !profile) return;
    var wrap = doc.getElementById('sifProfile'); if (!wrap) return;
    var c = contact(profile, 'Should I Fix? comparison'), img = avatar(profile), first = firstName(profile);
    patchOriginalCalculatorLinks(doc,profile);
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
    var wrap=document.getElementById('acEvProfile');
    if(!wrap)return;
    installDrag(wrap,'.ac-ev-profile-photo');
    if(!document.getElementById('acEvProfileModalLayer')){var style=document.createElement('style');style.id='acEvProfileModalLayer';style.textContent='.ac-ev-profile,html.shared-view #acEvConversion #acEvProfile{z-index:1200!important}.ac-ev-profile [hidden],.ac-ev-conversion [hidden]{display:none!important}';document.head.appendChild(style);}
    neutraliseEv();
    var id=clean(snapshot&&snapshot.partner_id);
    if(!id){unavailableLabel(document,'.ac-ev-contact-label');return;}
    var profile=await load(id);
    if(profile)patchEv(profile);else unavailableLabel(document,'.ac-ev-contact-label');
  }
  async function applyFix() {
    var frame=document.getElementById('fixFrame');if(!frame)return;
    var doc;try{doc=frame.contentDocument||frame.contentWindow.document;}catch(_){return;}
    if(!doc || !doc.getElementById('sifProfile'))return;
    var wrap=doc.getElementById('sifProfile');
    installDrag(wrap,'.sif-profile-photo');
    // The source dialogs always outrank the floating photo, with or without dragging.
    if(!doc.getElementById('acProfileModalLayerFix')){
      var style=doc.createElement('style');style.id='acProfileModalLayerFix';
      style.textContent='.sif-profile{z-index:1200!important}.sif-profile [hidden],.sif-conversion [hidden]{display:none!important}';
      doc.head.appendChild(style);
    }
    neutraliseFix(doc);
    var partnerId=clean(params.get('pid') || (params.get('public')==='1'?'':authPartnerId()));
    if(!partnerId){unavailableLabel(doc,'.sif-contact-label');return;}
    var profile=await load(partnerId);
    if(profile)patchFix(doc,profile);else unavailableLabel(doc,'.sif-contact-label');
  }

  global.addEventListener('ac:ev-public-snapshot', function (event) { applyEv(event && event.detail || {}); });
  global.addEventListener('ac:ev-contact-rebuilt', function(){if(global.__AC_EV_PARTNER_PROFILE)patchEv(global.__AC_EV_PARTNER_PROFILE);});
  if (global.__AppointmentCompanionEvSharedSnapshot) applyEv(global.__AppointmentCompanionEvSharedSnapshot);

  var frame = document.getElementById('fixFrame');
  if (frame) frame.addEventListener('load', function () { setTimeout(applyFix, 120); setTimeout(applyFix, 500); });
  var tries = 0, timer = setInterval(function () {
    if(frame){try{if(frame.contentDocument && frame.contentDocument.getElementById('sifProfile')){clearInterval(timer);applyFix();return;}}catch(_){}}
    if(++tries>120)clearInterval(timer);
  },150);
  // EV profile insertion and share hydration can complete in either order.
  var evTries=0,evTimer=setInterval(function(){
    var wrap=document.getElementById('acEvProfile');
    var snapshot=global.__AppointmentCompanionEvSharedSnapshot;
    if(wrap && snapshot && snapshot.partner_id){clearInterval(evTimer);applyEv(snapshot);return;}
    if(++evTries>120)clearInterval(evTimer);
  },150);
})(window);
