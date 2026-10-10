/* EV Companion v2.55.27 - original UW checkbox image, whole-pound quote and clearer arrows. */
(function (global) {
  'use strict';
  var params = new URL(location.href).searchParams;
  if (!document.documentElement.classList.contains('shared-view') && !params.has('s')) return;

  var PROFILE = {
    name: 'Adrian Croft',
    role: 'UW Authorised Partner',
    photo: 'https://raw.githubusercontent.com/aqcroft/UW_PET_GH_v2/main/Adrian_Croft.jpg',
    whatsapp: 'https://wa.me/447787400800?text=' + encodeURIComponent("Hi Adrian, I've just used your EV summary and I'd like to know more"),
    email: 'mailto:adrian.croft@uw.partners?subject=' + encodeURIComponent('EV summary') + '&body=' + encodeURIComponent("Hi Adrian, I've just used your EV summary and I'd like to know more"),
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
      'html.shared-view .ac-ev-profile{pointer-events:none!important}html.shared-view .ac-ev-profile-photo,html.shared-view .ac-ev-profile.open .ac-ev-profile-card{pointer-events:auto!important}',
      '.ac-ev-conversion{background:linear-gradient(135deg,#f3ecfc,#fff);border:1px solid rgba(122,66,200,.24);border-radius:16px;padding:17px 16px;margin:16px 0 0;text-align:center;color:#26164f}',
      '.ac-ev-conversion h2{margin:0 0 5px;font-size:18px;color:#26164f}.ac-ev-conversion p{margin:0;color:#6b6277;font-size:.86rem;font-weight:650}',
      '.ac-ev-cta{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;padding:12px 14px;border-radius:11px;background:#7a42c8;color:#fff!important;text-decoration:none;font-weight:850;font-size:14px}',
      '.ac-ev-cta svg{width:21px;height:21px}.ac-ev-cta.secondary{background:#fff;color:#26164f!important;border:1.5px solid rgba(122,66,200,.24)}',
      '.ac-ev-step{margin:11px 0 0!important;color:#4d5360!important;font-size:12px!important;line-height:1.48!important;font-weight:550!important;text-align:left}',
      '.ac-ev-clarifier{margin-top:10px!important;font-size:11px!important;line-height:1.45!important;text-align:left;color:#646c75!important}',
      '.ac-ev-partner{margin-top:12px;font-size:.76rem;color:#6b6277;font-weight:700}.ac-ev-partner a{color:#7a42c8;font-weight:850}',

      'html.shared-view #customerWelcome{display:none!important}',
      'html.shared-view #acEvModeLabel{display:none!important}',
      'html.shared-view.ac-metered-mode #acEvToplineV2554,html.shared-view[data-ev-journey="existing"] #acEvToplineV2554{display:none!important}',
      'html.shared-view .ac-ev-customer-settings-body #acMeterModeCard{margin:3px 0 9px!important;border:1px solid #e6ddec!important;background:#fff!important}',
      'html.shared-view .ac-ev-customer-settings-body #acV254SourceText{font-size:12px!important;line-height:1.4!important;color:#513876!important}',
      'html.shared-view .ac-ev-customer-settings-body .ac-ev-origin{font-size:10px!important}',
      '.ac-ev-prepared{display:inline-flex;align-items:center;gap:4px;margin:3px 0 6px;font:650 10px/1.35 system-ui;color:#79698b}',
      '.ac-ev-customer-settings{border:1px solid #e8ddf0;border-radius:13px;background:#fcfaff;margin:13px 0;overflow:hidden}',
      '.ac-ev-customer-settings>summary{list-style:none;display:flex;align-items:center;gap:7px;cursor:pointer;padding:13px 14px;font:800 13px system-ui;color:#503976}',
      '.ac-ev-customer-settings>summary::-webkit-details-marker{display:none}',
      '.ac-ev-customer-settings>summary:after{content:"⌄";font-size:18px;margin-left:auto}',
      '.ac-ev-customer-settings[open]>summary:after{content:"⌃"}',
      '.ac-ev-customer-settings-body{padding:0 10px 11px}',
      '.ac-ev-customer-settings-body>.card{margin:7px 0!important}',
      // Shared customer figures live inside the existing header-cog settings dialog.
      // Hide the staging wrapper while the modal and its original inputs initialise.
      'html.shared-view .wrap #acEvCustomerSettings{display:none!important}',
      'html.shared-view #acV250Modal #acEvCustomerSettings{display:block!important;background:transparent!important;border:0!important;border-radius:0!important;margin:0 0 8px!important;overflow:visible!important;padding:0!important}',
      'html.shared-view #acV250Modal #acEvCustomerSettings .ac-ev-customer-settings-body{padding:0!important}',
      'html.shared-view #acV250Modal #acEvCustomerSettings .card{margin:7px 0!important}',
      'html.shared-view #acV250Modal #acEvCustomerSettings .ac-ev-restore{width:100%;box-sizing:border-box;margin:8px 0!important}',
      '.ac-ev-restore{display:block;margin:6px 3px 2px;border:1px solid #ddd1ec;border-radius:9px;background:#fff;color:#59407e;padding:9px;font-weight:750;cursor:pointer}',
      '.ac-ev-fixed-details{margin:16px 0;border:1px solid #e2d5ed;border-radius:14px;overflow:hidden;background:#fff}',
      '.ac-ev-fixed-details>summary{cursor:pointer;list-style:none;padding:15px 14px;color:#46345f}',
      '.ac-ev-fixed-details>summary::-webkit-details-marker{display:none}',
      '.ac-ev-fixed-details>summary:after{content:"Explore fixed and variable  ▾";display:block;text-align:center;margin-top:11px;border-radius:9px;background:#f4eef9;padding:10px;font-weight:850;font-size:12px;color:#67478b}',
      '.ac-ev-fixed-details[open]>summary:after{content:"Close comparison  ▴"}',
      '.ac-ev-fixed-title{display:block;font-size:15px;font-weight:850;margin-bottom:5px}',
      '.ac-ev-fixed-sub{display:block;color:#766d81;font-size:12px;line-height:1.45}',
      '.ac-ev-fixed-details>.card{border:0!important;margin:0!important;padding:12px!important;box-shadow:none!important}',
      '.ac-ev-fixed-details .section-title,.ac-ev-fixed-details .section-copy{display:none!important}',
      '.ac-ev-simple-rates{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:12px 0}',
      '.ac-ev-simple-rate{background:#f8f4fc;border:1px solid #e8ddf2;border-radius:11px;padding:11px 8px;min-width:0;text-align:center}',
      '.ac-ev-simple-rate small{display:block;font-size:11px;color:#715d87;line-height:1.35}',
      '.ac-ev-simple-rate strong{display:block;font-size:19px;color:#503675;margin:7px 0}',
      '.ac-ev-all-rates{border-top:1px solid #ebdfef;margin-top:12px;padding-top:9px}',
      '.ac-ev-all-rates>summary{cursor:pointer;text-align:center;list-style:none;font-size:12px;font-weight:800;color:#7450a2;padding:10px}',
      '.ac-ev-all-rates>summary::-webkit-details-marker{display:none}',
      '.ac-ev-fixed-details .stressbar{display:flex!important;flex-wrap:wrap!important;gap:6px!important}',
      '.ac-ev-fixed-details .stressbar>.stresslabel{flex:1 1 100%!important;font-weight:850}',
      '.ac-ev-fixed-details .stressbuttons{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:4px!important;width:100%!important}',
      '.ac-ev-fixed-details .stressbuttons button{min-width:0!important;min-height:40px!important;position:relative!important;transform:none!important;scale:1!important;padding:6px 1px!important;font-size:10px!important;line-height:1.15!important}',
      'html.shared-view .ac-ev-fixed-details #stressButtons button[data-stress="0"]{display:block!important;visibility:visible!important;grid-column:auto!important;min-height:40px!important}',
      '.ac-ev-fixed-details .stressbuttons button[data-stress="21"]:not(.on){border:2px solid #bda3d6!important}',
      '.ac-ev-fixed-details .stressbuttons button[data-stress="21"]::after{content:"forecast";display:block;font-size:7px;font-weight:750;line-height:1.1;opacity:.7}',
      '.ac-ev-fixed-details td.cell.best{background:#e0f4e7!important;color:#08683c!important;font-weight:900!important;box-shadow:inset 0 0 0 1px #6cae81!important}',
      '.ac-ev-fixed-details td.cell.best:after{content:attr(data-best-label);display:block;font-size:8px;line-height:1.2;color:#0c7548!important}',
      '.ac-ev-basket-dialog{position:fixed;inset:0;z-index:10060;display:flex;align-items:center;justify-content:center;background:rgba(25,14,41,.69);padding:16px;box-sizing:border-box}',
      '.ac-ev-basket-dialog[hidden]{display:none!important}',
      '.ac-ev-basket-sheet{width:min(460px,100%);max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#352945;border-radius:18px;padding:22px 18px;box-shadow:0 20px 60px rgba(0,0,0,.25)}',
      '.ac-ev-basket-sheet h2{font-size:19px;margin:0 0 9px;color:#513771}',
      '.ac-ev-basket-sheet>p{font-size:13px;line-height:1.5;margin:8px 0;color:#554b60}',
      '.ac-ev-basket-compare{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0 10px}',
      '.ac-ev-basket-compare>div{border:1px solid #e6dfee;border-radius:11px;background:#f9f7fb;padding:12px 8px;text-align:center}',
      '.ac-ev-basket-compare>div:last-child{background:#f2ecfa}',
      '.ac-ev-basket-compare small{display:block;font-size:11px;line-height:1.35;color:#766785}',
      '.ac-ev-basket-compare strong{display:block;font-size:24px;margin:7px 0;color:#533975}',
      '.ac-ev-basket-difference{text-align:center;font-size:13px;font-weight:850;color:#16754b;margin:5px 0 12px}',
      '.ac-ev-basket-note{font-size:11px!important;color:#776c80!important}',
      '.ac-ev-basket-actions{display:grid;gap:8px;margin-top:16px}',
      '.ac-ev-basket-actions a{display:block;text-align:center;text-decoration:none;background:#7654a5;color:#fff;padding:13px;border-radius:10px;font-size:14px;font-weight:850}',
      '.ac-ev-basket-actions button{border:1px solid #ded5eb;border-radius:10px;background:#fff;color:#553c77;padding:10px;font-size:13px;font-weight:750;cursor:pointer}',
      '.ac-ev-basket-sheet{padding:17px 15px!important}',
      '.ac-ev-basket-sheet h2{font-size:17px!important;margin-bottom:6px!important}',
      '.ac-ev-basket-sheet>p{font-size:12px!important;line-height:1.4!important;margin:6px 0!important}',
      '.ac-ev-basket-compare{margin:9px 0 5px!important}',
      '.ac-ev-basket-compare>div{padding:9px 6px!important}',
      '.ac-ev-basket-compare strong{font-size:21px!important;margin:5px 0!important}',
      '.ac-ev-basket-difference{margin:4px 0 8px!important;font-size:12px!important}',
      '.ac-ev-uw-quote-preview{border:1px solid #e7dfee;border-radius:10px;background:#fff;margin:9px 0 8px;padding:9px 10px}',
      '.ac-ev-uw-quote-top{display:flex;align-items:center;justify-content:space-between;gap:7px;border-bottom:2px solid #7b4ab0;padding-bottom:6px;margin-bottom:8px}',
      '.ac-ev-uw-quote-top strong{color:#42334d;font-size:12px}',
      '.ac-ev-uw-quote-top span{color:#684197;font-weight:800;font-size:10px;white-space:nowrap}',
      '.ac-ev-uw-quote-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 12px}',
      '.ac-ev-uw-quote-grid div{min-width:0;font-size:10px;line-height:1.4}',
      '.ac-ev-uw-quote-grid span{display:block;color:#827589}',
      '.ac-ev-uw-quote-grid b{display:block;color:#372d40;font-size:11px;overflow-wrap:anywhere}',
      '.ac-ev-interest-preview{border-left:3px solid #7750aa;border-radius:7px;background:#f8f4fc;padding:9px 10px;margin:7px 0}',
      '.ac-ev-interest-preview>strong{display:block;font-size:12px;color:#4f3871;margin-bottom:6px}',
      '.ac-ev-interest-choice{display:flex;align-items:center;gap:8px;font-size:11px;line-height:1.35;color:#40344e}',
      '.ac-ev-interest-tick{display:inline-flex;flex:0 0 18px;width:18px;height:18px;align-items:center;justify-content:center;border:1px solid #1e2024;border-radius:3px;background:#202024;color:#fff;font-size:13px;font-weight:800}',
      '.ac-ev-interest-preview small{display:block;color:#645473;font-size:10px;margin-top:6px}',
      '.ac-ev-save-chip{display:inline-block;background:#ffbe2f;color:#3a2a0c;border-radius:4px;padding:2px 7px;font-weight:850}',
      '.ac-ev-basket-actions{margin-top:10px!important;gap:7px!important}',
      '.ac-ev-basket-actions a{padding:11px!important}',
      '.ac-ev-basket-sheet{max-width:440px!important;padding:18px 15px!important}',
      '.ac-ev-basket-sheet h2{font-size:18px!important;margin:0 0 7px!important}',
      '.ac-ev-basket-sheet>p{font-size:12px!important;line-height:1.4!important;margin:7px 0!important}',
      '.ac-ev-basket-sheet .ac-ev-basket-note{font-size:10px!important;margin:7px 0!important;color:#81758b!important}',
      '.ac-ev-basket-journey{margin:12px 0 10px!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:7px!important}',
      '.ac-ev-basket-journey>div{padding:12px 6px!important}',
      '.ac-ev-basket-journey>div:last-child{background:#edf7f1!important;border-color:#addbc0!important}',
      '.ac-ev-basket-journey>div:last-child strong{color:#14683d!important}',
      '.ac-ev-basket-journey strong{font-size:22px!important;line-height:1.2!important;margin:9px 0 7px!important}',
      '.ac-ev-basket-journey small{font-size:10px!important;line-height:1.3!important}',
      '.ac-ev-basket-journey>div:first-child{position:relative}',
      '.ac-ev-basket-journey>div:first-child:after{content:"→";position:absolute;top:50%;right:-11px;transform:translateY(-50%);z-index:2;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#fff;border:1px solid #d9c9e9;color:#73519e;font-size:13px}',
      '.ac-ev-interest-preview{padding:10px 11px!important;margin:8px 0!important}',
      '.ac-ev-interest-preview>strong{font-size:13px!important}',
      '.ac-ev-interest-choice{border:1px solid #d5c5e6;border-radius:8px;padding:8px;background:#fff;align-items:flex-start!important;font-size:11px!important}',
      '.ac-ev-interest-tick{flex:0 0 19px!important;width:19px!important;height:19px!important}',
      '.ac-ev-interest-preview small{font-size:11px!important;color:#534466!important;line-height:1.35}',
      '.ac-ev-basket-actions{margin-top:9px!important}',
      '@media(max-width:370px){.ac-ev-basket-sheet{padding:13px 12px!important}.ac-ev-basket-journey strong{font-size:19px!important}}',
      '.ac-ev-basket-note{font-size:10px!important;line-height:1.35!important}',

      'html.shared-view .ac-ev-rate-vat-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:7px!important;margin:2px 0 8px!important;position:relative!important;z-index:5!important;width:100%!important;min-width:0!important}',
      'html.shared-view .ac-ev-rate-vat-row>.strip{display:flex!important;align-items:center!important;flex:1 1 auto!important;min-width:0!important;margin:0!important;padding:0!important;gap:5px!important;line-height:1.3!important}',
      'html.shared-view .ac-ev-rate-vat-row #rateStrip{font-size:10px!important;line-height:1.3!important;overflow-wrap:normal!important}',
      'html.shared-view .ac-ev-rate-vat-row #feedDot{flex:0 0 auto!important}',
      'html.shared-view .ac-ev-rate-vat-row>#acV2482Vat{display:block!important;flex:0 0 auto!important;width:auto!important;max-width:158px!important;margin:0!important;padding:4px 5px!important;border:1px solid #e4d8ee!important;border-radius:9px!important;background:#f5f0fa!important;color:#503878!important;box-sizing:border-box!important}',
      'html.shared-view .ac-ev-rate-vat-row #acV2482Vat .ac-v2482-vat-header{display:flex!important;align-items:center!important;gap:3px!important;justify-content:flex-end!important;min-height:26px!important}',
      'html.shared-view .ac-ev-rate-vat-row #acV2482Vat .ac-v2482-vat-title{display:none!important}',
      'html.shared-view .ac-ev-rate-vat-row #acV2482Vat .ac-v2482-vat-switch{margin:0!important;min-width:0!important;gap:1px!important}',
      'html.shared-view .ac-ev-rate-vat-row #acV2482Vat .ac-v2482-vat-switch button{padding:4px 5px!important;font-size:9px!important;min-height:27px!important;line-height:1.12!important;white-space:nowrap!important}',
      'html.shared-view .ac-ev-rate-vat-row #acV2482Vat .ac-v254-vat-details{order:2!important;min-width:21px!important}',
      'html.shared-view .ac-ev-rate-vat-row #acV2482Vat .ac-v254-vat-details summary{color:#6850a0!important;font-size:14px!important;padding:2px 3px!important;min-width:19px!important;justify-content:center!important}',
      'html.shared-view .ac-ev-rate-vat-row #acV2482Vat .ac-v254-vat-details #acEvVatNote{left:auto!important;right:0!important;width:min(295px,calc(100vw - 54px))!important;max-width:none!important;box-sizing:border-box!important;color:#41374b!important;font-size:11px!important;z-index:140!important}',
      'html.shared-view .hero[data-v16c-layout="1"] .hero-footer-v16c>.hero-tariff{grid-column:1/-1!important;grid-row:2!important;min-width:0!important;max-width:100%!important;align-self:start!important;margin:3px 0 0!important;font-size:10px!important}',
      '@media(max-width:380px){html.shared-view .ac-ev-rate-vat-row{gap:5px!important}html.shared-view .ac-ev-rate-vat-row #rateStrip{font-size:9px!important}html.shared-view .ac-ev-rate-vat-row #acV2482Vat .ac-v2482-vat-switch button{font-size:8px!important;padding:4px!important}}',
      '.ac-ev-customer-vat small{display:block;margin-top:4px;font-size:10px}',
      '@media(max-width:560px){.ac-ev-profile{top:8px;right:8px}.ac-ev-profile-photo{width:47px;height:47px}}',
      '@media(max-width:560px){html.shared-view #acEvConversion{position:relative!important;overflow:visible!important}html.shared-view #acEvConversion #acEvProfile{position:absolute!important;top:11px!important;right:11px!important;bottom:auto!important;left:auto!important;z-index:10020!important;margin:0!important;display:flex!important;align-items:flex-end!important;pointer-events:none!important}html.shared-view #acEvConversion #acEvProfile .ac-ev-profile-photo{width:38px!important;height:38px!important;min-width:38px!important;min-height:38px!important;border-width:2px!important;pointer-events:auto!important}html.shared-view #acEvConversion #acEvProfile .ac-ev-profile-card{position:absolute!important;top:auto!important;bottom:calc(100% + 8px)!important;right:0!important;left:auto!important;z-index:10025!important;width:min(300px,calc(100vw - 35px))!important;box-sizing:border-box!important;text-align:left!important}html.shared-view #acEvConversion h2{padding:0 30px!important}}'
,
      '.ac-ev-basket-sheet{width:min(460px,100%);max-width:460px!important;padding:22px 18px!important;border-radius:20px}',
      '.ac-ev-basket-sheet h2{font-size:clamp(19px,5.2vw,23px)!important;margin:0 0 11px!important;line-height:1.2!important}',
      '.ac-ev-basket-sheet>p#acEvBasketIntro{font-size:clamp(12px,3.2vw,14px)!important;line-height:1.45!important;margin:7px 0 12px!important}',
      '.ac-ev-basket-journey{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:9px!important;margin:11px 0 7px!important}',
      '.ac-ev-basket-journey>div{min-width:0;padding:11px 3px!important;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}',
      '.ac-ev-basket-journey>div:nth-child(2){background:#f7f3fa!important}',
      '.ac-ev-basket-journey>div:last-child{background:#eaf7ef!important}',
      '.ac-ev-basket-journey small{font-size:clamp(9px,2.55vw,11px)!important;line-height:1.25!important}',
      '.ac-ev-basket-journey small:first-child{color:#513771!important;font-weight:850;white-space:nowrap}',
      '.ac-ev-basket-journey strong{font-size:clamp(17px,5.2vw,24px)!important;margin:3px 0!important;letter-spacing:-.6px;white-space:nowrap}',
      '.ac-ev-basket-journey>div:first-child strong,.ac-ev-basket-journey>div:last-child strong{color:#14683d!important}',
      '.ac-ev-basket-journey>div:not(:last-child){position:relative}',
      '.ac-ev-basket-journey>div:not(:last-child):after{content:"→";position:absolute;top:50%;right:-14px;transform:translateY(-50%);z-index:2;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#fff;border:1px solid #d9c9e9;color:#73519e;font-size:13px}',
      '.ac-ev-basket-caption{font-size:10px!important;text-align:center;margin:7px auto 12px!important;color:#786b87!important}',
      '.ac-ev-basket-sheet>p#acEvBasketIntro{margin:8px 0 12px!important}',
      '.ac-ev-basket-journey{margin-top:13px!important}',
      '.ac-ev-basket-caption{margin:7px auto 10px!important}',
      '.ac-ev-interest-preview{padding:13px 12px!important;margin:9px 0!important;border-left:3px solid #7750aa;border-radius:11px;background:#f8f4fc}',
      '.ac-ev-interest-preview>strong{font-size:15px!important;margin:0 0 7px!important}',
      '.ac-ev-interest-preview p{font-size:12px;line-height:1.45;color:#534466;margin:0 0 10px}',
      '.ac-ev-interest-choice{padding:9px!important;font-size:11px!important;line-height:1.4;border-radius:8px}',
      '.ac-ev-basket-sheet .ac-ev-basket-note{font-size:10px!important;line-height:1.35!important;margin:8px 0!important}',
      '.ac-ev-interest-screenshot{display:block;width:100%;height:auto;max-width:100%;box-sizing:border-box;border:0;margin:4px 0 10px;border-radius:7px;background:#fff}',
      '.ac-ev-interest-preview .ac-ev-interest-confirmation{font-size:12px;line-height:1.45;color:#534466;margin:0!important}',
      '.ac-ev-basket-journey>div:not(:last-child):after{content:"➜"!important;font-family:system-ui,Arial,sans-serif;font-size:16px!important;font-weight:900!important;border:2px solid #9c79bc!important;color:#5c3685!important;box-shadow:0 1px 3px rgba(45,26,61,.12);box-sizing:border-box}',
      '.ac-ev-basket-actions{margin-top:12px!important}',
      '.ac-ev-basket-label{display:block;font-size:11px!important;font-weight:850;color:#7750aa!important;letter-spacing:.01em;margin:0 0 4px!important}',
      '#acEvVatNote>span{display:block;margin-bottom:4px}',
      'html.shared-view:not(.shared-started) #acEvProfile,html.shared-view:not(.shared-started) #acEvConversion #acEvProfile{display:none!important}',
      '@media(max-width:370px){.ac-ev-basket-sheet{padding:15px 12px!important}.ac-ev-basket-journey{gap:7px!important}.ac-ev-basket-journey strong{font-size:clamp(16px,5.1vw,19px)!important}.ac-ev-basket-journey>div:not(:last-child):after{right:-12px;width:21px;height:21px}}'
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


  var lastModel=null, installedCustomer=false, originalTable=null, dialogReturnFocus=null;
  function money(n){return Number.isFinite(n)?'£'+Math.round(n).toLocaleString('en-GB'):'—'}
  function priceMonth(n){return Number.isFinite(n)?money(n/12):'—'}
  function priceDisplay(raw){return raw&&Number.isFinite(raw.total)?priceMonth(raw.total):'—'}
  function safeEsc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function addBottomCard() {
    var old=document.getElementById('acEvConversion');
    if(old){
      // Preserve the actual clickable profile when refreshing a customer's
      // basket card, instead of deleting it along with the old card.
      var existingProfile=old.querySelector('#acEvProfile');
      if(existingProfile)document.body.appendChild(existingProfile);
      old.remove();
    }
    var host=document.querySelector('.wrap')||document.body;
    var card=document.createElement('section');card.id='acEvConversion';card.className='ac-ev-conversion';
    var b=basket(),target=b||PROFILE.quote;
    card.innerHTML='<h2>Ready to explore UW?</h2>'+
      '<p>Take a look at your '+(b?'personalised UW basket':'UW quote options')+'.</p>'+
      '<button type="button" class="ac-ev-cta" id="acEvOpenBasket" style="border:0;width:100%;cursor:pointer">🛒 '+(b?'Go to my UW basket':'Explore a UW quote')+' →</button>'+
      '<a class="ac-ev-cta secondary" href="'+PROFILE.whatsapp+'" target="_blank" rel="noopener">'+WHATSAPP_ICON+'<span>Any questions? WhatsApp Adrian</span></a>';
    host.appendChild(card);
    card.querySelector('#acEvOpenBasket').addEventListener('click',function(){showBasket(target,this)});
  }
  function showBasket(url,origin){
    var link=safeHttps(url);if(!link)return;
    var existing=document.getElementById('acEvBasketDialog');if(existing)existing.remove();
    dialogReturnFocus=origin||document.activeElement;
    var prepared=!!basket();
    var interestTitle=prepared?'EV tariff interest registered':'EV tariff interest';
    // A prepared basket includes the EV interest tick. Avoid stating that a
    // self-service UW quote is already ticked before it has been created.
    var interestCopy=prepared
      ? "I've already ticked the EV interest box in your UW basket. UW will contact you once your energy goes live."
      : "When creating your UW quote, tick the EV interest box. UW will contact you once your energy goes live.";
    var intro="UW can't quote an EV tariff until they know they can communicate with your smart meter. This Companion estimates your monthly costs based on household electricity usage and EV mileage over the next 12 months.";
    var panel=document.createElement('div');panel.id='acEvBasketDialog';panel.className='ac-ev-basket-dialog';
    panel.setAttribute('role','presentation');
    var sheet=document.createElement('div');sheet.className='ac-ev-basket-sheet';
    sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','acEvBasketTitle');
    sheet.innerHTML='<p class="ac-ev-basket-label">🚗 Your personalised UW EV summary</p>'+ 
      '<h2 id="acEvBasketTitle">Why your UW quote starts higher</h2>'+
      '<div id="acEvBasketFigures"></div>'+
      '<p class="ac-ev-basket-caption">Monthly figures excluding VAT, matching your UW quote.</p>'+
      '<p id="acEvBasketIntro">'+safeEsc(intro)+'</p>'+
      '<div class="ac-ev-interest-preview" aria-label="Example of the EV interest selection in a UW quote">'+
        '<strong>'+safeEsc(interestTitle)+'</strong>'+
        '<img class="ac-ev-interest-screenshot" src="consolidated-v1/assets/uw-ev-interest-ticked-v1.svg" width="916" height="185" alt="UW quote: Email me with more information about your Electric Vehicle Tariff - checked">'+
        '<p class="ac-ev-interest-confirmation">'+safeEsc(interestCopy)+'</p>'+
      '</div>'+
      '<p class="ac-ev-basket-note">EV costs are estimates, subject to eligibility, smart meter communication and tariff availability.</p>'+
      '<div class="ac-ev-basket-actions"><a id="acEvBasketContinue" href="'+safeEsc(link)+'" target="_blank" rel="noopener noreferrer">Continue to my UW '+(prepared?'basket':'quote')+' →</a><button type="button" id="acEvBasketClose">Back to EV summary</button></div>';
    panel.appendChild(sheet);document.body.appendChild(panel);
    function close(){panel.remove();if(dialogReturnFocus&&dialogReturnFocus.focus)dialogReturnFocus.focus();}
    panel.addEventListener('click',function(e){if(e.target===panel||e.target.closest('#acEvBasketClose'))close()});
    panel.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();close()}});
    panel.querySelector('#acEvBasketContinue').addEventListener('click',close);
    updateBasketNumbers();
    panel.querySelector('#acEvBasketClose').focus();
  }
  function updateBasketNumbers(){
    var host=document.getElementById('acEvBasketFigures');if(!host)return;
    var d=lastModel, std=d&&d.standard,ev=d&&d.ev;
    if(!std||!ev||!Number.isFinite(std.total)||!Number.isFinite(ev.total)){
      host.textContent='Your estimated costs will appear once the latest electricity rates are available.';
      return;
    }
    // Always show VAT-free figures matching the UW quote, independent of the display VAT toggle.
    // The initial UW standard quote precedes the EV dual-fuel discount, where applicable.
    var vatFactor=Number(d.vatPercent)===5?1.05:1;
    var dual=d.dualFuelSelected===true;
    var discountAnnual=Math.max(0,Number(d.standardDualFuelDiscountExVatAnnual)||0);
    var basketAnnual=std.total/vatFactor+(dual?discountAnnual:0);
    var evAnnual=ev.total/vatFactor;
    function monthly(n){return Number.isFinite(n)?'£'+Math.round(n/12).toLocaleString('en-GB'):'—'}
    var evMonth=monthly(evAnnual);
    host.innerHTML='<div class="ac-ev-basket-compare ac-ev-basket-journey">'+
      '<div><small>1. COMPANION</small><strong>'+evMonth+'</strong><small>EV estimate</small></div>'+
      '<div><small>2. UW QUOTE</small><strong>'+monthly(basketAnnual)+'</strong><small>Standard tariff</small></div>'+
      '<div><small>3. EV TARIFF</small><strong>~'+evMonth+'</strong><small>Expected cost</small></div>'+
      '</div>';
  }
  function cardSettings(){
    if(document.getElementById('acEvCustomerSettings'))return true;
    var hero=document.querySelector('.hero'),wrap=document.querySelector('.wrap');
    if(!hero||!wrap)return false;
    var settings=document.createElement('div');settings.id='acEvCustomerSettings';settings.className='ac-ev-customer-settings';
    settings.setAttribute('role','group');settings.setAttribute('aria-label','Your figures and settings');
    var body=document.createElement('div');body.className='ac-ev-customer-settings-body';
    settings.appendChild(body);
    var cards=Array.from(wrap.children);
    var first=cards.findIndex(function(n){return n===hero});
    var compare=cards.findIndex(function(n){return n.querySelector&&n.querySelector('.tablewrap #comparison')});
    if(first<0||compare<=first)return false;
    var candidates=cards.slice(first+1,compare);
    candidates.forEach(function(node){
      if(node.id==='acEvConversion'||node.id==='acV2482Vat'||node.id==='acEvTradeoff'||node.classList.contains('ac-ev-profile'))return;
      if(node.matches('.card,details'))body.appendChild(node);
    });
    if(body.children.length===0&&!document.getElementById('acMeterModeCard'))return false;
    var restore=document.getElementById('resetSharedBtn');
    if(restore){restore.classList.add('ac-ev-restore');restore.textContent='↺ Restore my starting figures';body.appendChild(restore);}
    var anchor=body.firstElementChild;
    if(anchor&&anchor.parentNode===body)hero.insertAdjacentElement('afterend',settings);
    return true;
  }
  function relocateUsageInputs(){
    var settings=document.getElementById('acEvCustomerSettings');
    var body=settings&&settings.querySelector('.ac-ev-customer-settings-body');
    var card=document.getElementById('acMeterModeCard');
    if(!body||!card)return false;
    // Move the real inputs, retaining their state, event handlers and share values.
    if(card.parentElement!==body)body.insertBefore(card,body.firstChild);
    var label=document.getElementById('acV254SourceText');
    if(label)label.textContent='Home + EV estimated annual consumption';
    return true;
  }

  function compactTariffInformation(){
    var strip=document.getElementById('rateStrip');
    if(!strip)return;
    var original=strip.textContent||'';
    var shortened=original.replace(/ · Region (\d+) /,' · $1 ')
      .replace('5% VAT included','5% VAT incl')
      .replace('0% VAT illustration','0% VAT temporary');
    if(shortened!==original)strip.textContent=shortened;
  }
  function moveVatToRateRow(){
    var hero=document.querySelector('.hero'),footer=hero&&hero.querySelector('.hero-footer-v16c');
    var tariff=hero&&hero.querySelector('.hero-tariff');
    var vat=document.getElementById('acV2482Vat');
    // The shared customer VAT switch now lives alongside Monthly/Year inside
    // the hero. Preserve the original buttons and never move them back above it.
    var heroSlot=hero&&hero.querySelector('#acEvHeroVatSlot');
    if(heroSlot&&vat){
      if(vat.parentElement!==heroSlot)heroSlot.appendChild(vat);
      return true;
    }
    var strip=document.querySelector('.strip:has(#rateStrip)');
    if(!footer||!tariff||!vat||!strip)return false;
    // Keep the tariff footer intact, but put VAT with the compact rate status,
    // above the estimate cards rather than in the purple hero.
    if(tariff.parentElement!==footer)footer.appendChild(tariff);
    var row=document.getElementById('acEvRateVatRow');
    if(!row){
      row=document.createElement('div');
      row.id='acEvRateVatRow';row.className='ac-ev-rate-vat-row';
      strip.parentNode.insertBefore(row,strip);
    }
    if(strip.parentElement!==row)row.insertBefore(strip,row.firstChild);
    if(vat.parentElement!==row)row.appendChild(vat);
    // Use the actual VAT switch and its existing event listeners, never a clone.
    return true;
  }
  var layoutObserversStarted=false;
  function followVatPlacement(){
    if(layoutObserversStarted||!global.MutationObserver)return;
    var wrap=document.querySelector('.wrap'),hero=document.querySelector('.hero');
    if(!wrap||!hero)return;
    layoutObserversStarted=true;
    // Other layout modules may insert or relocate the original VAT control after
    // this customer module initialises. Watch only structural changes, not inputs.
    var observer=new MutationObserver(function(){moveVatToRateRow()});
    observer.observe(wrap,{childList:true});
    observer.observe(hero,{childList:true});
    moveVatToRateRow();
  }

  function settingsIntoCog(){
    var settings=document.getElementById('acEvCustomerSettings');
    var modal=document.getElementById('acV250Modal');
    var body=modal&&modal.querySelector('.ac-v250-body');
    if(!settings||!body)return false;
    // Move the actual cards and original input elements, never copies, into
    // the modal which is already opened by the cog in the top-right corner.
    var firstExisting=body.querySelector('#acV250Night');
    if(settings.parentElement!==body)body.insertBefore(settings,firstExisting||body.firstChild);
    var title=document.getElementById('acV250Title');
    if(title)title.textContent='⚙️ Your figures & settings';
    var cog=document.getElementById('acV250Gear');
    if(cog){
      cog.title='Your figures & settings';
      cog.setAttribute('aria-label','Open your figures and settings');
      cog.setAttribute('aria-controls','acV250Modal');
      cog.setAttribute('aria-haspopup','dialog');
    }
    return true;
  }
  var cogFollowStarted=false;
  function followSettingsCog(){
    if(settingsIntoCog()||cogFollowStarted)return;
    cogFollowStarted=true;
    var tries=0;
    var timer=global.setInterval(function(){
      if(settingsIntoCog()||++tries>=120)global.clearInterval(timer);
    },120);
  }

  function addComparison(){
    if(document.getElementById('acEvFixedDetails'))return true;
    var table=document.getElementById('comparison');
    var card=table&&table.closest('.card');
    if(!card)return false;
    originalTable=card;
    var outer=document.createElement('details');outer.id='acEvFixedDetails';outer.className='ac-ev-fixed-details';
    var header=document.createElement('summary');
    header.innerHTML='<span class="ac-ev-fixed-title">🛡️ Prefer the certainty of a fixed price?</span><span class="ac-ev-fixed-sub">See how a fixed Economy 7 tariff compares, particularly if electricity prices rise.</span>';
    card.parentNode.insertBefore(outer,card);outer.appendChild(header);outer.appendChild(card);
    var bar=card.querySelector('.stressbar');
    var preview=document.createElement('div');preview.id='acEvSimpleRates';preview.className='ac-ev-simple-rates';
    if(bar)bar.insertAdjacentElement('afterend',preview);
    var tableWrap=card.querySelector('.tablewrap'),footer=tableWrap&&tableWrap.nextElementSibling;
    if(tableWrap){
      var more=document.createElement('details');more.className='ac-ev-all-rates';more.id='acEvAllTariffs';
      var moreLabel=document.createElement('summary');moreLabel.textContent='Curious? Show all UW electricity tariffs ▾';
      more.appendChild(moreLabel);tableWrap.parentNode.insertBefore(more,tableWrap);more.appendChild(tableWrap);
      if(footer&&footer.classList.contains('foot')){
        footer.textContent='Includes home electricity, standing charges and charging at home, not charging elsewhere. Variable rates may change; fixed rates apply for their stated term.';
        more.appendChild(footer);
      }
    }
    return true;
  }
  function updateSimple(){
    if(!document.getElementById('acEvSimpleRates'))return;
    var tier=(document.querySelector('#serviceButtons button.on')||{}).dataset;
    var selected=Number(tier&&tier.tier||2),t=Number.isFinite(selected)?selected:2;
    var keys=[['ev','EV Double Gold (variable)'],['fixedE7','Fixed Saver Economy 7']];
    var out=document.getElementById('acEvSimpleRates');
    out.textContent='';
    keys.forEach(function(pair){
      var row=document.querySelector('#comparison tr[data-row="'+pair[0]+'"]');
      var cell=row&&row.querySelector('td[data-tier="'+t+'"]');
      var name=row&&row.querySelector('.tariff-name');
      var item=document.createElement('div');item.className='ac-ev-simple-rate';
      var small=document.createElement('small');small.textContent=name?name.textContent.trim():pair[1];
      var strong=document.createElement('strong');strong.textContent=cell?cell.textContent.trim():'—';
      var period=document.createElement('small');period.textContent=lastModel&&lastModel.period==='year'?'per year':'per month';
      item.appendChild(small);item.appendChild(strong);item.appendChild(period);out.appendChild(item);
    });
  }
  function updateForecast(){
    var bar=document.getElementById('stressButtons');if(!bar)return;
    var parent=bar.closest('.stressbar'),label=parent&&parent.querySelector('.stresslabel');
    if(label){
      var title=label.firstChild;if(title&&title.nodeType===3)title.textContent='What if variable electricity prices rise? ';
    }
    var current=bar.querySelector('[data-stress="0"]');
    if(current){current.textContent='Current';current.title='Current UW electricity rates';current.setAttribute('aria-label','Current UW electricity rates');}
    var forecast=bar.querySelector('[data-stress="21"]');
    if(forecast){forecast.title='21% MoneySavingExpert January Price Cap forecast - illustrative for UW electricity';}
    document.querySelectorAll('#comparison td.cell.best').forEach(function(cell){
      cell.dataset.bestLabel=bar.querySelector('button.on')?.dataset.stress==='0'?'LOWEST ESTIMATE':'LOWEST IN THIS SCENARIO';
    });
  }
  function updateVat(model){
    var note=document.getElementById('acEvVatNote');
    if(!note||!model)return;
    var isZero=model.vatPercent===0;
    note.innerHTML=isZero?
      '<span>0% VAT selected for the first 6 months.</span><span>Switch VAT on to see estimated costs beyond this period.</span>':
      '<span>5% VAT included.</span><span>Switch VAT off to see estimated costs for the first 6 months.</span>';
    if(isZero&&model.period==='year')note.innerHTML+='<span>The yearly figure is a 0%-rate illustration, not a full-year VAT forecast.</span>';
  }
  function compactGreeting(){
    var welcome=document.getElementById('customerWelcome');
    var header=document.querySelector('.title-row');if(!header||!welcome)return;
    var x=document.getElementById('acEvPrepared');
    if(!x){x=document.createElement('span');x.id='acEvPrepared';x.className='ac-ev-prepared';header.insertAdjacentElement('afterend',x);}
    var name=document.getElementById('welcomeName');
    x.textContent='Prepared for '+(name&&name.textContent.trim()||'you');
  }
  function positionContactPhoto(){
    var profile=document.getElementById('acEvProfile');
    if(!profile)return;
    var narrow=!!(global.matchMedia&&global.matchMedia('(max-width:560px)').matches);
    var host=narrow?document.getElementById('acEvConversion'):document.body;
    if(host&&profile.parentElement!==host){
      profile.classList.remove('open');
      host.appendChild(profile);
    }
  }
  var photoResizePending=false;
  global.addEventListener('resize',function(){
    if(photoResizePending)return;
    photoResizePending=true;
    global.requestAnimationFrame(function(){photoResizePending=false;positionContactPhoto();});
  });
  function customerSetup(){
    if(!document.documentElement.classList.contains('shared-view'))return;
    addStyles();compactGreeting();cardSettings();relocateUsageInputs();addComparison();followSettingsCog();moveVatToRateRow();followVatPlacement();compactTariffInformation();
    var b=document.getElementById('acEvConversion');
    if(global.__AppointmentCompanionEvSharedSnapshot&&(!b||!document.getElementById('acEvOpenBasket')))addBottomCard();
    positionContactPhoto();
    updateSimple();updateForecast();
  }
  function updateFromModel(model){
    lastModel=model;
    customerSetup();
    updateSimple();updateForecast();updateVat(model);
    updateBasketNumbers();
  }
  function install() {
    if (!document.body || !document.querySelector('.wrap')) return false;
    addStyles();addProfile();customerSetup();
    // A portable link may finish rendering before the contact script loads.
    // Recover that already-computed model, then continue tracking changes.
    if(global.__AC_EV_TRADEOFF)updateFromModel(global.__AC_EV_TRADEOFF);
    global.requestAnimationFrame(customerSetup);
    return true;
  }
  document.addEventListener('ac:ev-workspace-ready',customerSetup);
  document.addEventListener('ac:ev-comparison',function(e){
    updateFromModel(e.detail);
    // The existing hero/footer and VAT are assembled by later handlers on
    // this event. Finish customer-only positioning after those handlers.
    global.requestAnimationFrame(customerSetup);
  });
  global.addEventListener('ac:ev-public-snapshot',function(){
    addBottomCard();customerSetup();global.requestAnimationFrame(customerSetup);
  });
  document.addEventListener('click',function(e){
    // The profile shortcut must follow the same pre-basket explanation.
    var a=e.target.closest('.ac-ev-profile-action.quote');
    if(a&&safeHttps(a.href)){e.preventDefault();showBasket(a.href,a)}
  },true);
  if(install())return;
  var tries=0,timer=setInterval(function(){if(install()||++tries>160)clearInterval(timer)},100);
})(window);
