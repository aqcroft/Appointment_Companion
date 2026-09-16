/* Customer-facing contact/profile treatment for shared EV Companion links. */
(function (global) {
  'use strict';
  var params = new URL(location.href).searchParams;
  if (!document.documentElement.classList.contains('shared-view') && !params.has('s')) return;

  var PROFILE = {
    name: 'Adrian Croft',
    role: 'UW Authorised Partner',
    photo: 'https://raw.githubusercontent.com/aqcroft/UW_PET_GH_v2/main/Adrian_Croft.jpg',
    whatsapp: 'https://wa.me/447787400800?text=' + encodeURIComponent("Hi Adrian, I've just used your EV comparison and I'd like to know more"),
    email: 'mailto:adrian.croft@uw.partners?subject=' + encodeURIComponent('EV comparison') + '&body=' + encodeURIComponent("Hi Adrian, I've just used your EV comparison and I'd like to know more"),
    phone: 'tel:+447787400800',
    booking: 'https://tidycal.com/aqcroft/uwpresent',
    quote: 'https://uw.partners/adrian.croft/join',
    site: 'https://aqcroft.com'
  };
  var WHATSAPP_ICON = '<svg viewBox="0 0 39 39" aria-hidden="true"><path fill="#00E676" d="M10.7 32.8l.6.3c2.5 1.5 5.3 2.2 8.1 2.2 8.8 0 16-7.2 16-16 0-4.2-1.7-8.3-4.7-11.3s-7-4.7-11.3-4.7c-8.8 0-16 7.2-15.9 16.1 0 3 .9 5.9 2.4 8.4l.4.6-1.6 5.9 6-1.5z"/><path fill="#fff" d="M32.4 6.4C29 2.9 24.3 1 19.5 1 9.3 1 1.1 9.3 1.2 19.4c0 3.2.9 6.3 2.4 9.1L1 38l9.7-2.5c2.7 1.5 5.7 2.2 8.7 2.2 10.1 0 18.3-8.3 18.3-18.4 0-4.9-1.9-9.5-5.3-12.9zM19.5 34.6c-2.7 0-5.4-.7-7.7-2.1l-.6-.3-5.8 1.5L6.9 28l-.4-.6c-4.4-7.1-2.3-16.5 4.9-20.9s16.5-2.3 20.9 4.9 2.3 16.5-4.9 20.9c-2.3 1.5-5.1 2.3-7.9 2.3zm8.8-11.1l-1.1-.5-2.6-1.2c-.3 0-.5.1-.7.2l-1.5 1.7c-.1.2-.3.3-.5.3-.2 0-.6-.2-.9-.4-1.5-.7-2.8-1.6-3.9-2.8-1-1.1-1.8-2.2-2.4-3.4-.2-.3 0-.6.2-.8l1-1.2c.2-.3.3-.7.2-1-.1-.5-1.3-3.2-1.6-3.8-.2-.3-.4-.4-.7-.5h-1.1c-.5.1-.9.3-1.3.7-1 .9-1.5 2.2-1.5 3.5 0 .8.2 1.6.5 2.3 1 2.2 2.5 4.1 4.3 5.8 2.2 2 4.8 3.4 7.7 4.1 1.1.3 2.4.2 3.4-.3 1-.5 1.8-1.3 2.2-2.3.2-.4.3-.9.4-1.4 0-.3-.1-.5-.4-.6z"/></svg>';

  function safeHttps(value) {
    try { var u = new URL(String(value || '')); return u.protocol === 'https:' ? u.href : ''; }
    catch (_) { return ''; }
  }
  function snapshot() { return global.__AppointmentCompanionEvSharedSnapshot || {}; }
  function basket() { return safeHttps(snapshot().basket_url); }

  function addStyles() {
    if (document.getElementById('acEvCustomerContactStyle')) return;
    var st = document.createElement('style');
    st.id = 'acEvCustomerContactStyle';
    st.textContent = [
      '.ac-ev-profile{position:fixed;top:10px;right:10px;z-index:9997;display:flex;flex-direction:column;align-items:flex-end;gap:7px}',
      '.ac-ev-profile-photo{width:50px;height:50px;border-radius:50%;padding:0;border:3px solid #fff;overflow:hidden;background:linear-gradient(135deg,#7a42c8,#26164f);box-shadow:0 5px 18px rgba(38,22,79,.3);cursor:pointer}',
      '.ac-ev-profile-photo img{width:100%;height:100%;object-fit:cover;display:block}',
      '.ac-ev-profile-card{width:min(310px,calc(100vw - 24px));background:#fff;border:1px solid rgba(38,22,79,.12);border-radius:17px;padding:13px;box-shadow:0 12px 32px rgba(38,22,79,.2);opacity:0;transform:translateY(-8px) scale(.98);pointer-events:none;transition:.2s;color:#26164f}',
      '.ac-ev-profile.open .ac-ev-profile-card{opacity:1;transform:none;pointer-events:auto}',
      '.ac-ev-profile-id{display:flex;align-items:center;gap:9px;padding:1px 2px 10px}.ac-ev-profile-id img{width:39px;height:39px;border-radius:50%;object-fit:cover}',
      '.ac-ev-profile-name{font-weight:900;line-height:1.1}.ac-ev-profile-role{font-size:.72rem;font-weight:700;color:#756d84;margin-top:2px}',
      '.ac-ev-contact-label{font-size:.69rem;text-transform:uppercase;letter-spacing:.04em;font-weight:900;color:#756d84;margin:2px 2px 7px}',
      '.ac-ev-contact-three{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}',
      '.ac-ev-contact-route,.ac-ev-profile-action{border:1px solid #e4dfec;background:#fff;color:#26164f;border-radius:11px;text-decoration:none;font-weight:850;font-size:.74rem;display:flex;align-items:center;justify-content:center;gap:5px;min-height:42px;padding:7px}',
      '.ac-ev-contact-route.whatsapp{color:#128c7e}.ac-ev-contact-route svg{width:20px;height:20px;flex:0 0 auto}',
      '.ac-ev-profile-action{justify-content:flex-start;padding:10px 11px;margin-top:6px;font-size:.78rem}.ac-ev-profile-action.quote{background:linear-gradient(135deg,#7a42c8,#26164f);color:#fff;border-color:transparent}',
      '.ac-ev-profile-site{text-align:center;font-size:.68rem;font-weight:800;margin-top:9px}.ac-ev-profile-site a{color:#7a42c8}.ac-ev-profile-closehint{font-size:.62rem;color:#968da4;text-align:center;margin-top:4px}',
      '.ac-ev-conversion{background:linear-gradient(135deg,#f3ecfc,#fff);border:1px solid rgba(122,66,200,.24);border-radius:16px;padding:17px 16px;margin:16px 0 0;text-align:center;color:#26164f}',
      '.ac-ev-conversion h2{margin:0 0 5px;font-size:18px;color:#26164f}.ac-ev-conversion p{margin:0;color:#6b6277;font-size:.86rem;font-weight:650}',
      '.ac-ev-cta{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;padding:12px 14px;border-radius:11px;background:#7a42c8;color:#fff!important;text-decoration:none;font-weight:850;font-size:14px}',
      '.ac-ev-cta svg{width:21px;height:21px}.ac-ev-cta.secondary{background:#fff;color:#26164f!important;border:1.5px solid rgba(122,66,200,.24)}',
      '.ac-ev-partner{margin-top:12px;font-size:.76rem;color:#6b6277;font-weight:700}.ac-ev-partner a{color:#7a42c8;font-weight:850}',
      '@media(max-width:560px){.ac-ev-profile{top:8px;right:8px}.ac-ev-profile-photo{width:47px;height:47px}}'
    ].join('');
    document.head.appendChild(st);
  }

  function addProfile() {
    if (document.getElementById('acEvProfile')) return;
    var wrap = document.createElement('div');
    wrap.id = 'acEvProfile';
    wrap.className = 'ac-ev-profile';
    wrap.innerHTML = '<button class="ac-ev-profile-photo" type="button" id="acEvProfileToggle" aria-label="Contact Adrian"><img src="' + PROFILE.photo + '" alt="Adrian Croft"></button><div class="ac-ev-profile-card"><div class="ac-ev-profile-id"><img src="' + PROFILE.photo + '" alt=""><div><div class="ac-ev-profile-name">' + PROFILE.name + '</div><div class="ac-ev-profile-role">' + PROFILE.role + '</div></div></div><div class="ac-ev-contact-label">Contact Adrian</div><div class="ac-ev-contact-three"><a class="ac-ev-contact-route whatsapp" href="' + PROFILE.whatsapp + '" target="_blank" rel="noopener">' + WHATSAPP_ICON + '<span>WhatsApp</span></a><a class="ac-ev-contact-route" href="' + PROFILE.email + '">✉️ <span>Email</span></a><a class="ac-ev-contact-route" href="' + PROFILE.phone + '">📞 <span>Call</span></a></div><a class="ac-ev-profile-action" href="' + PROFILE.booking + '" target="_blank" rel="noopener">🗓️ <span>Book a chat</span></a><a class="ac-ev-profile-action quote" href="' + PROFILE.quote + '" target="_blank" rel="noopener">💷 <span>Get a UW quote</span></a><div class="ac-ev-profile-site"><a href="' + PROFILE.site + '" target="_blank" rel="noopener">AQCroft.com</a></div><div class="ac-ev-profile-closehint">Tap the photo again to close</div></div>';
    document.body.appendChild(wrap);
    wrap.querySelector('#acEvProfileToggle').addEventListener('click', function (e) { e.stopPropagation(); wrap.classList.toggle('open'); });
    document.addEventListener('click', function (e) { if (wrap.classList.contains('open') && !wrap.contains(e.target)) wrap.classList.remove('open'); });
  }

  function addBottomCard() {
    if (document.getElementById('acEvConversion')) return;
    var host = document.querySelector('.wrap') || document.body;
    var card = document.createElement('section');
    card.id = 'acEvConversion';
    card.className = 'ac-ev-conversion';
    var b = basket();
    card.innerHTML = '<h2>Want to explore your actual UW options?</h2><p>Use whichever route feels easiest.</p>' +
      (b ? '<a class="ac-ev-cta" href="' + b.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">Open your UW basket →</a>' : '') +
      '<a class="ac-ev-cta" href="' + PROFILE.whatsapp + '" target="_blank" rel="noopener">' + WHATSAPP_ICON + '<span>Drop me a WhatsApp</span></a>' +
      '<a class="ac-ev-cta secondary" href="' + PROFILE.quote + '" target="_blank" rel="noopener">Get a personalised UW quote →</a>' +
      '<a class="ac-ev-cta secondary" href="' + PROFILE.booking + '" target="_blank" rel="noopener">🗓️ Book a chat</a>' +
      '<div class="ac-ev-partner">Adrian Croft - UW Authorised Partner · <a href="' + PROFILE.site + '" target="_blank" rel="noopener">AQCroft.com</a></div>';
    host.appendChild(card);
  }

  function install() {
    if (!document.body || !document.querySelector('.wrap')) return false;
    addStyles(); addProfile(); addBottomCard(); return true;
  }

  global.addEventListener('ac:ev-public-snapshot', function () { addBottomCard(); });
  if (install()) return;
  var tries = 0, timer = setInterval(function () { if (install() || ++tries > 160) clearInterval(timer); }, 100);
})(window);
