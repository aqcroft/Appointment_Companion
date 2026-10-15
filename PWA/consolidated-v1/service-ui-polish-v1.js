/* Compact service selector for Appointment Companion.
   - Five icon-first service tiles in one row.
   - Energy cycles: Off -> Dual fuel -> Electricity -> Gas -> Off.
   - Mobile tap-cycles: Off -> 1 -> 2 -> 3 -> 4 -> 5 SIMs -> Off.
   - Cashback Card is a pseudo-service: selected by default but never counted as a qualifying service.
*/
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode')) return;

  var $ = function (id) { return document.getElementById(id); };

  function installStyles() {
    if ($('acServicePolishStyle')) return;
    var style = document.createElement('style');
    style.id = 'acServicePolishStyle';
    style.textContent = `
      :root {
        --ac-energy-base:#75C8D4; --ac-energy-soft:#DFF3F6; --ac-energy-strong:#197F90;
        --ac-broadband-base:#69CE9D; --ac-broadband-soft:#DDF5E9; --ac-broadband-strong:#257F59;
        --ac-mobile-base:#F08CC2; --ac-mobile-soft:#F9DDEA; --ac-mobile-strong:#AD3E78;
        --ac-insurance-base:#FF9654; --ac-insurance-soft:#FFE2CE; --ac-insurance-strong:#C95A17;
        --ac-cashback-base:#A78DDF; --ac-cashback-soft:#E8DFF8; --ac-cashback-strong:#6748A8;
      }

      #servicesCard > .pills {
        display:grid!important;
        grid-template-columns:repeat(5,minmax(0,1fr));
        gap:6px!important;
        align-items:stretch!important;
      }
      #servicesCard > .pills.ac-four-visible { grid-template-columns:repeat(4,minmax(0,1fr)); }

      #servicesCard > .pills > [data-service],
      #servicesCard > .pills > [data-pseudo-service],
      #servicesCard > .pills > .ac-mobile-cell {
        min-width:0;
      }

      #servicesCard > .pills > [data-service],
      #servicesCard > .pills > [data-pseudo-service],
      #servicesCard .ac-mobile-cell > [data-service="mobile"] {
        position:relative;
        overflow:hidden;
        width:100%;
        min-width:0;
        min-height:62px;
        padding:5px 3px!important;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:3px;
        text-align:center;
        line-height:1;
        isolation:isolate;
      }

      #servicesCard .ac-service-ghost {
        position:absolute;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:27px;
        line-height:1;
        white-space:nowrap;
        letter-spacing:0;
        opacity:.18;
        filter:saturate(.7);
        transform:scale(1.04);
        pointer-events:none;
        z-index:-1;
      }
      #servicesCard .on .ac-service-ghost,
      #servicesCard [data-pseudo-service="cashback"].on .ac-service-ghost {
        opacity:.85;
        filter:none;
      }

      #servicesCard .ac-energy-state {
        position:absolute;
        left:4px;
        right:4px;
        bottom:4px;
        min-width:0;
        padding:2px 3px;
        border-radius:999px;
        background:rgba(255,255,255,.86);
        color:#266A75;
        font-size:9px;
        font-weight:900;
        letter-spacing:.15px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      #servicesCard [data-service="energy"] {
        border-color:var(--ac-energy-base)!important;
        background:rgba(223,243,246,.45)!important;
      }
      #servicesCard [data-service="energy"].on {
        background:#32B5D1!important;
        border:2.5px solid #08748B!important;
        color:#fff!important;
        box-shadow:inset 0 0 0 1px rgba(25,127,144,.16);
      }
      #servicesCard [data-service="broadband"] {
        border-color:var(--ac-broadband-base)!important;
        background:rgba(221,245,233,.48)!important;
      }
      #servicesCard [data-service="broadband"].on {
        background:#3BBB75!important;
        border:2.5px solid #177548!important;
        color:#fff!important;
        box-shadow:inset 0 0 0 1px rgba(37,127,89,.14);
      }
      #servicesCard [data-service="mobile"] {
        border-color:var(--ac-mobile-base)!important;
        background:rgba(249,221,234,.5)!important;
      }
      #servicesCard [data-service="mobile"].on {
        background:#E44B9C!important;
        border:2.5px solid #9E1C65!important;
        color:#fff!important;
        box-shadow:inset 0 0 0 1px rgba(173,62,120,.14);
      }
      #servicesCard [data-service="boiler"] {
        border-color:var(--ac-insurance-base)!important;
        background:rgba(255,226,206,.52)!important;
      }
      #servicesCard [data-service="boiler"].on {
        background:#F98A32!important;
        border:2.5px solid #AE4B07!important;
        color:#fff!important;
        box-shadow:inset 0 0 0 1px rgba(201,90,23,.14);
      }
      #servicesCard [data-pseudo-service="cashback"] {
        border-color:var(--ac-cashback-base)!important;
        background:rgba(232,223,248,.55)!important;
      }
      #servicesCard [data-pseudo-service="cashback"].on {
        background:#9561D7!important;
        border:2.5px solid #5E2D9E!important;
        color:#fff!important;
        box-shadow:inset 0 0 0 1px rgba(103,72,168,.15);
      }

      #servicesCard .ac-mobile-cell {
        position:relative;
        display:flex;
        min-width:0;
      }
      #servicesCard .ac-mobile-cell > [data-service="mobile"] {padding-bottom:23px!important;}
      #servicesCard [data-service="boiler"]:disabled,
      #servicesCard [data-service="boiler"].ac-unavailable {
        background:#E9E8ED!important;border:2px solid #C7C5D0!important;
        color:#898592!important;filter:grayscale(1);opacity:.56;cursor:not-allowed!important;
        box-shadow:none!important;
      }
      #servicesCard .ac-mobile-state{
        position:absolute;left:4px;right:4px;bottom:4px;border-radius:999px;
        background:#fff;color:#97255B;font:900 10px/17px system-ui,sans-serif;
        text-align:center;pointer-events:none;
      }
      #servicesCard [data-service].on .ac-service-ghost,
      #servicesCard [data-pseudo-service].on .ac-service-ghost {filter:saturate(1.5) drop-shadow(0 1px 2px rgba(0,0,0,.14));}
      #servicesCard [data-service="energy"].on .ac-energy-state{background:#fff;color:#06657A;}
      #servicesCard .ac-mobile-stepper {
        position:absolute;
        left:4px;
        right:4px;
        bottom:4px;
        display:none;
        grid-template-columns:21px minmax(17px,1fr) 21px;
        height:21px;
        border:1px solid rgba(173,62,120,.35);
        border-radius:8px;
        overflow:hidden;
        background:rgba(255,255,255,.9);
        z-index:3;
      }
      #servicesCard .ac-mobile-cell.ac-on .ac-mobile-stepper { display:grid; }
      #servicesCard .ac-mobile-stepper button {
        border:0;
        background:transparent;
        color:#8B2E61;
        font:900 15px/1 system-ui;
        padding:0;
        cursor:pointer;
        touch-action:manipulation;
      }
      #servicesCard .ac-mobile-count {
        display:flex;
        align-items:center;
        justify-content:center;
        border-left:1px solid rgba(173,62,120,.18);
        border-right:1px solid rgba(173,62,120,.18);
        color:#6F234B;
        font:900 10px/1 system-ui;
      }

      /* One colour family per service. Keep controls as pale tints rather than
         introducing white/purple blocks that make the page feel patchy. */
      #energyCard { background:var(--ac-energy-soft)!important; border:1.5px solid var(--ac-energy-base)!important; }
      #broadbandCard { background:var(--ac-broadband-soft)!important; border:1.5px solid var(--ac-broadband-base)!important; }
      #mobileCard { background:var(--ac-mobile-soft)!important; border:1.5px solid var(--ac-mobile-base)!important; }
      #insuranceCard { background:var(--ac-insurance-soft)!important; border:1.5px solid var(--ac-insurance-base)!important; }
      #cashbackCard { background:var(--ac-cashback-soft)!important; border:1.5px solid var(--ac-cashback-base)!important; }

      #energyCard .side,#energyCard .side.uw { background:rgba(255,255,255,.30)!important; border-color:rgba(25,127,144,.28)!important; }
      #energyCard .side.uw { box-shadow:inset 0 0 0 1px rgba(25,127,144,.11); }
      #broadbandCard .side,#broadbandCard .side.uw { background:rgba(255,255,255,.30)!important; border-color:rgba(37,127,89,.24)!important; }
      #mobileCard .side,#mobileCard .side.uw { background:rgba(255,255,255,.30)!important; border-color:rgba(173,62,120,.24)!important; }
      #insuranceCard .side,#insuranceCard .side.uw { background:rgba(255,255,255,.30)!important; border-color:rgba(201,90,23,.24)!important; }
      #cashbackCard .side,#cashbackCard .side.uw { background:rgba(255,255,255,.30)!important; border-color:rgba(103,72,168,.24)!important; }

      #energyCard h2 { color:var(--ac-energy-strong)!important; }
      #broadbandCard h2 { color:var(--ac-broadband-strong)!important; }
      #mobileCard h2 { color:var(--ac-mobile-strong)!important; }
      #insuranceCard h2 { color:var(--ac-insurance-strong)!important; }
      #cashbackCard h2 { color:var(--ac-cashback-strong)!important; }

      #energyCard .pill { border-color:var(--ac-energy-base)!important; }
      #energyCard .pill.on, #energyCard button.on, #energyCard .btn-primary { background:var(--ac-energy-strong)!important; border-color:var(--ac-energy-strong)!important; color:#fff!important; }
      #energyCard .switch input:checked + .track { background:var(--ac-energy-strong)!important; }
      #broadbandCard .pill { border-color:var(--ac-broadband-base)!important; }
      #broadbandCard .pill.on, #broadbandCard button.on, #broadbandCard .btn-primary { background:var(--ac-broadband-strong)!important; border-color:var(--ac-broadband-strong)!important; color:#fff!important; }
      #broadbandCard .switch input:checked + .track { background:var(--ac-broadband-strong)!important; }
      #mobileCard .pill { border-color:var(--ac-mobile-base)!important; }
      #mobileCard .pill.on, #mobileCard button.on, #mobileCard .btn-primary { background:var(--ac-mobile-strong)!important; border-color:var(--ac-mobile-strong)!important; color:#fff!important; }
      #mobileCard .switch input:checked + .track { background:var(--ac-mobile-strong)!important; }
      #insuranceCard .pill { border-color:var(--ac-insurance-base)!important; }
      #insuranceCard .pill.on, #insuranceCard button.on, #insuranceCard .btn-primary { background:var(--ac-insurance-strong)!important; border-color:var(--ac-insurance-strong)!important; color:#fff!important; }
      #insuranceCard .switch input:checked + .track { background:var(--ac-insurance-strong)!important; }
      #cashbackCard .pill { border-color:var(--ac-cashback-base)!important; }
      #cashbackCard .pill.on, #cashbackCard button.on, #cashbackCard .btn-primary { background:var(--ac-cashback-strong)!important; border-color:var(--ac-cashback-strong)!important; color:#fff!important; }
      #cashbackCard .switch input:checked + .track { background:var(--ac-cashback-strong)!important; }

      #energyCard input:not([type="checkbox"]):not([type="range"]), #energyCard select, #energyCard textarea {
        background:rgba(255,255,255,.48)!important; border-color:rgba(25,127,144,.30)!important;
      }
      #broadbandCard input:not([type="checkbox"]):not([type="range"]), #broadbandCard select, #broadbandCard textarea {
        background:rgba(255,255,255,.48)!important; border-color:rgba(37,127,89,.28)!important;
      }
      #mobileCard input:not([type="checkbox"]):not([type="range"]), #mobileCard select, #mobileCard textarea {
        background:rgba(255,255,255,.48)!important; border-color:rgba(173,62,120,.28)!important;
      }
      #insuranceCard input:not([type="checkbox"]):not([type="range"]), #insuranceCard select, #insuranceCard textarea {
        background:rgba(255,255,255,.48)!important; border-color:rgba(201,90,23,.28)!important;
      }
      #cashbackCard input:not([type="checkbox"]):not([type="range"]), #cashbackCard select, #cashbackCard textarea {
        background:rgba(255,255,255,.48)!important; border-color:rgba(103,72,168,.28)!important;
      }

      #energyCard .pill:not(.on), #energyCard .icon-toggle:not(.on) { background:rgba(255,255,255,.42)!important; color:#245D66!important; }
      #broadbandCard .pill:not(.on), #broadbandCard .icon-toggle:not(.on) { background:rgba(255,255,255,.42)!important; color:#245F45!important; }
      #mobileCard .pill:not(.on), #mobileCard .icon-toggle:not(.on) { background:rgba(255,255,255,.42)!important; color:#71304F!important; }
      #insuranceCard .pill:not(.on), #insuranceCard .icon-toggle:not(.on) { background:rgba(255,255,255,.42)!important; color:#7A3A16!important; }
      #cashbackCard .pill:not(.on), #cashbackCard .icon-toggle:not(.on) { background:rgba(255,255,255,.42)!important; color:#4E3979!important; }

      #canonicalEnergyPanel { background:linear-gradient(135deg,#DDF3F6,#fff 84%)!important; border-color:var(--ac-energy-base)!important; }
      #canonicalEnergyPanel .canonical-title, #canonicalEnergyPanel .canonical-helper summary, #canonicalEnergyPanel .canonical-helper-output { color:var(--ac-energy-strong)!important; }
      #canonicalEnergyPanel .canonical-choice button { border-color:var(--ac-energy-base)!important; }
      #canonicalEnergyPanel .canonical-choice button.on, #canonicalEnergyPanel #useSplitEstimate:not(:disabled) { background:var(--ac-energy-strong)!important; border-color:var(--ac-energy-strong)!important; color:#fff!important; }
      #canonicalEnergyPanel > .canonical-choice[aria-label="Energy fuel"] { display:none!important; }
      #canonicalMobilePanel { display:none!important; }

      @media(max-width:420px) {
        #servicesCard > .pills { gap:4px!important; }
        #servicesCard > .pills > [data-service],
        #servicesCard > .pills > [data-pseudo-service],
        #servicesCard .ac-mobile-cell > [data-service="mobile"] { min-height:72px; }
        #servicesCard .ac-service-ghost { font-size:24px; }
        #servicesCard .ac-energy-state { font-size:8px; left:3px; right:3px; }
        #servicesCard .ac-mobile-stepper { left:3px; right:3px; grid-template-columns:19px minmax(15px,1fr) 19px; }
      }
    `;
    document.head.appendChild(style);
  }

  function canonicalFuel() {
    return $('canonicalFuelSelection') ? String($('canonicalFuelSelection').value || 'both') : 'both';
  }

  function canonicalSims() {
    var n = $('canonicalSimCount') ? Number($('canonicalSimCount').value || 1) : 1;
    return Math.max(1, Math.min(5, n || 1));
  }

  function setFuel(value) {
    var target = document.querySelector('#canonicalEnergyPanel [data-canonical-fuel="' + value + '"]');
    if (target) target.click();
    sync();
  }

  function setSims(count) {
    count = Math.max(1, Math.min(5, Number(count) || 1));
    var target = document.querySelector('#canonicalMobilePanel [data-canonical-sim="' + count + '"]');
    if (target) target.click();
    sync();
  }

  function iconMarkup(icon) {
    return '<span class="ac-service-ghost" aria-hidden="true">' + icon + '</span>';
  }

  function enhanceEnergy() {
    var button = document.querySelector('#servicesCard [data-service="energy"]');
    if (!button || button.dataset.acCompactEnergy === '1') return;
    button.dataset.acCompactEnergy = '1';
    button.innerHTML = iconMarkup('⚡🔥') + '<span class="ac-energy-state" data-ac-energy-state>Dual</span>';
    button.title = 'Energy: tap through Dual fuel, Electricity, Gas and Off.';
    button.setAttribute('aria-label', 'Energy');

    button.addEventListener('click', function (event) {
      var alreadyOn = button.classList.contains('on');

      if (!alreadyOn) {
        setTimeout(function () { setFuel('both'); sync(); }, 0);
        return;
      }

      var current = canonicalFuel();
      if (current === 'gas') {
        /* Let the original Appointment Companion click handler switch Energy off. */
        setTimeout(sync, 0);
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      setFuel(current === 'both' ? 'electricity' : 'gas');
    }, true);
  }

  function enhanceSimple(service, icon, label) {
    var button = document.querySelector('#servicesCard [data-service="' + service + '"]');
    if (!button || button.dataset.acIconOnly === '1') return;
    button.dataset.acIconOnly = '1';
    button.innerHTML = iconMarkup(icon);
    button.title = label;
    button.setAttribute('aria-label', label);
  }

  function enhanceMobile() {
    var button = document.querySelector('#servicesCard [data-service="mobile"]');
    if (!button || button.dataset.acCompactMobile === '1') return;
    button.dataset.acCompactMobile = '1';

    var parent = button.parentNode;
    var cell = document.createElement('div');
    cell.className = 'ac-mobile-cell';
    parent.insertBefore(cell, button);
    cell.appendChild(button);

    button.innerHTML = iconMarkup('📱');
    button.title = 'Mobile SIMs';
    button.setAttribute('aria-label', 'Mobile SIMs');

    var badge=document.createElement('span');
    badge.className='ac-mobile-state';
    badge.setAttribute('data-ac-mobile-state','');
    badge.textContent='1 SIM';
    button.appendChild(badge);

    button.addEventListener('click',function(event){
      if(!button.classList.contains('on')){
        // Let the existing controller activate Mobile, then start at one SIM.
        setTimeout(function(){setSims(1);sync();},0);
        return;
      }
      var count=canonicalSims();
      if(count>=5){
        // At five, the next tap switches Mobile off via the original handler.
        setTimeout(sync,0);
        return;
      }
      // Intermediate taps change the number, WITHOUT toggling Mobile off.
      event.preventDefault();
      event.stopImmediatePropagation();
      setSims(count+1);
      setTimeout(sync,0);
    },true);
  }

  function enhanceCashback() {
    var pills = document.querySelector('#servicesCard > .pills');
    if (!pills || pills.querySelector('[data-pseudo-service="cashback"]')) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pill';
    button.dataset.pseudoService = 'cashback';
    button.innerHTML = iconMarkup('💳');
    button.title = 'Cashback Card';
    button.setAttribute('aria-label', 'Cashback Card');
    pills.appendChild(button);

    button.addEventListener('click', function () {
      var card = $('cashbackCard');
      if (card) {
        card.classList.remove('hidden');
        card.scrollIntoView({ behavior:'smooth', block:'center' });
      }
    });
  }

  function sync() {
    var servicesCard = $('servicesCard');
    var pills = servicesCard && servicesCard.querySelector(':scope > .pills');
    var energy = document.querySelector('#servicesCard [data-service="energy"]');
    var broadband = document.querySelector('#servicesCard [data-service="broadband"]');
    var mobile = document.querySelector('#servicesCard [data-service="mobile"]');
    var boiler = document.querySelector('#servicesCard [data-service="boiler"]');
    var cashback = document.querySelector('#servicesCard [data-pseudo-service="cashback"]');
    var mobileCell = mobile && mobile.closest('.ac-mobile-cell');

    if (pills) pills.classList.remove('ac-four-visible');
    if(boiler){
      var tenant=$('pillTenant')&&$('pillTenant').classList.contains('on');
      var homeowner=$('pillHomeowner')&&$('pillHomeowner').classList.contains('on');
      boiler.classList.remove('hidden');
      boiler.disabled=!homeowner||tenant;
      boiler.classList.toggle('ac-unavailable',boiler.disabled);
      boiler.setAttribute('aria-disabled',boiler.disabled?'true':'false');
    }

    var fuel = canonicalFuel();
    var energyIcon = fuel === 'electricity' ? '⚡' : fuel === 'gas' ? '🔥' : '⚡🔥';
    var energyLabel = fuel === 'electricity' ? 'Elec' : fuel === 'gas' ? 'Gas' : 'Dual';
    var energyGhost = energy && energy.querySelector('.ac-service-ghost');
    var energyState = energy && energy.querySelector('[data-ac-energy-state]');
    if (energyGhost) energyGhost.textContent = energyIcon;
    if (energyState) energyState.textContent = energyLabel;
    if (energy) {
      var energyOn = energy.classList.contains('on');
      energyState && energyState.classList.toggle('hidden', !energyOn);
      energy.setAttribute('aria-pressed', energyOn ? 'true' : 'false');
      energy.setAttribute('aria-label', energyOn ? 'Energy - ' + energyLabel : 'Energy - off');
    }

    [broadband, boiler].forEach(function (button) {
      if (button) button.setAttribute('aria-pressed', button.classList.contains('on') ? 'true' : 'false');
    });

    var sims = canonicalSims();
    var count = mobileCell && mobileCell.querySelector('[data-ac-mobile-state]');
    if (count) count.textContent = sims + (sims===1?' SIM':' SIMs');
    if (mobileCell) mobileCell.classList.toggle('ac-on', !!(mobile && mobile.classList.contains('on')));
    if (mobile) {
      var mobileOn = mobile.classList.contains('on');
      mobile.setAttribute('aria-pressed', mobileOn ? 'true' : 'false');
      mobile.setAttribute('aria-label', mobileOn ? 'Mobile SIMs - ' + sims + ' selected' : 'Mobile SIMs - off');
    }

    var cb = $('includeCashback');
    var cbOn = !!(cb && cb.checked);
    if (cashback) {
      cashback.classList.toggle('on', cbOn);
      cashback.setAttribute('aria-pressed', cbOn ? 'true' : 'false');
    }
    var cashbackCard = $('cashbackCard');
    var servicesVisible = !!(servicesCard && !servicesCard.classList.contains('hidden'));
    if (cashbackCard) cashbackCard.classList.toggle('hidden', !(servicesVisible && cbOn));
  }

  function install() {
    if (!document.querySelector('#servicesCard [data-service="energy"]') || !$('canonicalEnergyPanel') || !$('canonicalMobilePanel')) return false;
    installStyles();
    enhanceEnergy();
    enhanceSimple('broadband', '🛜', 'Broadband');
    enhanceMobile();
    enhanceSimple('boiler', '🛠️', 'Boiler Cover');
    enhanceCashback();

    var insuranceHeading = document.querySelector('#insuranceCard h2');
    if (insuranceHeading) insuranceHeading.textContent = '🛠️ Boiler Cover';

    sync();

    var observer = new MutationObserver(function () { sync(); });
    ['energy','broadband','mobile','boiler'].forEach(function (service) {
      var button = document.querySelector('#servicesCard [data-service="' + service + '"]');
      if (button) observer.observe(button, { attributes:true, attributeFilter:['class'] });
    });

    ['canonicalFuelSelection','canonicalSimCount','includeCashback'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('change', sync);
      el.addEventListener('input', sync);
    });

    global.addEventListener('ac:main-reset', function () { setTimeout(sync, 0); });
    global.addEventListener('ac:working-record', function () { setTimeout(sync, 0); });
    global.AppointmentCompanionServicePolish = { sync:sync, setFuel:setFuel, setSims:setSims };
    return true;
  }

  if (install()) return;
  var attempts = 0;
  var timer = setInterval(function () {
    if (install() || ++attempts > 160) clearInterval(timer);
  }, 50);
})(window);
