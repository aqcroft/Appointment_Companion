/* Service-level UI polish for consolidated Appointment Companion.
   - Keeps the four top service selectors in one compact row.
   - Energy: first tap selects dual fuel; later taps cycle Dual fuel -> Electricity -> Gas.
   - Mobile: first tap selects one SIM; +/- stepper adjusts 1-5 SIMs without adding a second row.
   - Uses the current UW service colour families with darker matching controls.
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
        --ac-energy-base:#BDDEE4; --ac-energy-soft:#F1F9FA; --ac-energy-strong:#4A92A0;
        --ac-broadband-base:#A2E2C3; --ac-broadband-soft:#F0FAF5; --ac-broadband-strong:#3C966B;
        --ac-mobile-base:#FAD0E9; --ac-mobile-soft:#FFF2F9; --ac-mobile-strong:#BE568E;
        --ac-insurance-base:#FFAB70; --ac-insurance-soft:#FFF3EA; --ac-insurance-strong:#D86A2B;
        --ac-cashback-base:#C6B5E2; --ac-cashback-soft:#F6F1FB; --ac-cashback-strong:#7654A8;
      }

      /* One compact row - secondary choices live inside the Energy/Mobile cells. */
      #servicesCard > .pills {
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:7px!important;
        align-items:stretch!important;
      }
      #servicesCard > .pills > [data-service],
      #servicesCard > .pills > .ac-mobile-cell {
        min-width:0;
      }
      #servicesCard > .pills > [data-service],
      #servicesCard .ac-mobile-cell > [data-service="mobile"] {
        width:100%;
        min-width:0;
        min-height:82px;
        padding:8px 5px!important;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:5px;
        text-align:center;
        line-height:1.05;
      }
      #servicesCard .ac-service-main {
        display:flex;
        align-items:center;
        justify-content:center;
        gap:4px;
        min-width:0;
        font-weight:800;
      }
      #servicesCard .ac-service-main .ac-service-word {
        min-width:0;
      }
      #servicesCard .ac-energy-state {
        display:none;
        max-width:100%;
        padding:4px 7px;
        border:1px solid rgba(74,146,160,.32);
        border-radius:999px;
        background:rgba(255,255,255,.88);
        color:#2f6f7b;
        font-size:10.5px;
        font-weight:850;
        line-height:1;
        white-space:nowrap;
      }
      #servicesCard [data-service="energy"].on .ac-energy-state { display:inline-flex; }
      #servicesCard [data-service="energy"].on {
        background:var(--ac-energy-soft)!important;
        border-color:var(--ac-energy-strong)!important;
        color:#26164f!important;
        box-shadow:inset 0 -2px 0 rgba(74,146,160,.22);
      }

      #servicesCard .ac-mobile-cell {
        position:relative;
        display:flex;
        min-width:0;
      }
      #servicesCard .ac-mobile-cell > [data-service="mobile"] {
        padding-bottom:34px!important;
      }
      #servicesCard .ac-mobile-stepper {
        position:absolute;
        left:6px;
        right:6px;
        bottom:6px;
        display:none;
        grid-template-columns:30px minmax(24px,1fr) 30px;
        height:27px;
        border:1px solid rgba(190,86,142,.32);
        border-radius:10px;
        overflow:hidden;
        background:rgba(255,255,255,.92);
        z-index:2;
      }
      #servicesCard .ac-mobile-cell.ac-on .ac-mobile-stepper { display:grid; }
      #servicesCard .ac-mobile-stepper button {
        border:0;
        background:transparent;
        color:#9b3f70;
        font:900 18px/1 system-ui;
        cursor:pointer;
        padding:0;
        touch-action:manipulation;
      }
      #servicesCard .ac-mobile-count {
        display:flex;
        align-items:center;
        justify-content:center;
        border-left:1px solid rgba(190,86,142,.18);
        border-right:1px solid rgba(190,86,142,.18);
        color:#6f2850;
        font:850 12px/1 system-ui;
        white-space:nowrap;
      }
      #servicesCard [data-service="mobile"].on {
        background:var(--ac-mobile-soft)!important;
        border-color:var(--ac-mobile-strong)!important;
        color:#26164f!important;
        box-shadow:inset 0 -2px 0 rgba(190,86,142,.22);
      }

      /* UW service identities. */
      #servicesCard [data-service="energy"] { border-color:var(--ac-energy-base)!important; }
      #servicesCard [data-service="broadband"] { border-color:var(--ac-broadband-base)!important; }
      #servicesCard [data-service="mobile"] { border-color:var(--ac-mobile-base)!important; }
      #servicesCard [data-service="boiler"] { border-color:var(--ac-insurance-base)!important; }
      #servicesCard [data-service="broadband"].on { background:var(--ac-broadband-strong)!important; border-color:var(--ac-broadband-strong)!important; color:#fff!important; }
      #servicesCard [data-service="boiler"].on { background:var(--ac-insurance-strong)!important; border-color:var(--ac-insurance-strong)!important; color:#fff!important; }

      /* Main service section shading. */
      #energyCard { background:linear-gradient(135deg,var(--ac-energy-soft),#fff 74%)!important; border-color:var(--ac-energy-base)!important; }
      #broadbandCard { background:linear-gradient(135deg,var(--ac-broadband-soft),#fff 74%)!important; border-color:var(--ac-broadband-base)!important; }
      #mobileCard { background:linear-gradient(135deg,var(--ac-mobile-soft),#fff 74%)!important; border-color:var(--ac-mobile-base)!important; }
      #insuranceCard { background:linear-gradient(135deg,var(--ac-insurance-soft),#fff 74%)!important; border-color:var(--ac-insurance-base)!important; }
      #cashbackCard { background:linear-gradient(135deg,var(--ac-cashback-soft),#fff 74%)!important; border-color:var(--ac-cashback-base)!important; }

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

      /* Canonical detail controls still own the data, but their duplicate selectors stay hidden. */
      #canonicalEnergyPanel { background:linear-gradient(135deg,var(--ac-energy-soft),#fff 84%)!important; border-color:var(--ac-energy-base)!important; }
      #canonicalEnergyPanel .canonical-title, #canonicalEnergyPanel .canonical-helper summary, #canonicalEnergyPanel .canonical-helper-output { color:var(--ac-energy-strong)!important; }
      #canonicalEnergyPanel .canonical-choice button { border-color:var(--ac-energy-base)!important; }
      #canonicalEnergyPanel .canonical-choice button.on, #canonicalEnergyPanel #useSplitEstimate:not(:disabled) { background:var(--ac-energy-strong)!important; border-color:var(--ac-energy-strong)!important; color:#fff!important; }
      #canonicalEnergyPanel > .canonical-choice[aria-label="Energy fuel"] { display:none!important; }
      #canonicalMobilePanel { display:none!important; }

      @media(max-width:520px) {
        #servicesCard > .pills { gap:5px!important; }
        #servicesCard > .pills > [data-service],
        #servicesCard .ac-mobile-cell > [data-service="mobile"] {
          min-height:78px;
          padding-left:3px!important;
          padding-right:3px!important;
          font-size:11.5px!important;
        }
        #servicesCard .ac-service-main { gap:2px; }
        #servicesCard .ac-energy-state { font-size:9.5px; padding:4px 5px; }
        #servicesCard .ac-mobile-cell > [data-service="mobile"] { padding-bottom:32px!important; }
        #servicesCard .ac-mobile-stepper { left:4px; right:4px; bottom:5px; grid-template-columns:25px minmax(20px,1fr) 25px; height:26px; }
        #servicesCard .ac-mobile-stepper button { font-size:16px; }
        #servicesCard .ac-mobile-count { font-size:11px; }
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

  function enhanceEnergy() {
    var button = document.querySelector('#servicesCard [data-service="energy"]');
    if (!button || button.dataset.acCompactEnergy === '1') return;
    button.dataset.acCompactEnergy = '1';
    button.innerHTML = '<span class="ac-service-main"><span aria-hidden="true">⚡🔥</span><span class="ac-service-word">Energy</span></span><span class="ac-energy-state" data-ac-energy-state>Dual fuel</span>';
    button.title = 'Tap to select Energy. Once selected, tap again to cycle Dual fuel, Electricity and Gas.';
    button.setAttribute('aria-label', 'Energy');

    button.addEventListener('click', function (event) {
      var alreadyOn = button.classList.contains('on');
      if (!alreadyOn) {
        setTimeout(function () { setFuel('both'); }, 0);
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      var current = canonicalFuel();
      var next = current === 'both' ? 'electricity' : current === 'electricity' ? 'gas' : 'both';
      setFuel(next);
    }, true);
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

    button.innerHTML = '<span class="ac-service-main"><span aria-hidden="true">📱</span><span class="ac-service-word">Mobile<br>Sim(s)</span></span>';
    button.title = 'Tap to add or remove Mobile. When selected, use minus and plus to change the SIM count.';
    button.setAttribute('aria-label', 'Mobile SIMs');

    var stepper = document.createElement('div');
    stepper.className = 'ac-mobile-stepper';
    stepper.setAttribute('aria-label', 'Number of mobile SIMs');
    stepper.innerHTML = '<button type="button" data-ac-sim-step="-1" aria-label="Remove one SIM">−</button><span class="ac-mobile-count" data-ac-mobile-count>1</span><button type="button" data-ac-sim-step="1" aria-label="Add one SIM">+</button>';
    cell.appendChild(stepper);

    stepper.addEventListener('click', function (event) {
      var control = event.target.closest('[data-ac-sim-step]');
      if (!control) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!button.classList.contains('on')) return;
      setSims(canonicalSims() + Number(control.dataset.acSimStep || 0));
    }, true);

    button.addEventListener('click', function () {
      if (!button.classList.contains('on')) {
        setTimeout(function () { setSims(1); }, 0);
      }
    }, true);
  }

  function sync() {
    var energy = document.querySelector('#servicesCard [data-service="energy"]');
    var mobile = document.querySelector('#servicesCard [data-service="mobile"]');
    var mobileCell = mobile && mobile.closest('.ac-mobile-cell');

    var fuel = canonicalFuel();
    var label = fuel === 'electricity' ? 'Electricity' : fuel === 'gas' ? 'Gas' : 'Dual fuel';
    var state = energy && energy.querySelector('[data-ac-energy-state]');
    if (state) state.textContent = label;
    if (energy) {
      var on = energy.classList.contains('on');
      energy.setAttribute('aria-pressed', on ? 'true' : 'false');
      energy.setAttribute('aria-label', on ? 'Energy - ' + label + '. Tap to cycle fuel.' : 'Energy - not selected');
    }

    var sims = canonicalSims();
    var count = mobileCell && mobileCell.querySelector('[data-ac-mobile-count]');
    if (count) count.textContent = String(sims);
    if (mobileCell) mobileCell.classList.toggle('ac-on', !!(mobile && mobile.classList.contains('on')));
    if (mobile) {
      var mobileOn = mobile.classList.contains('on');
      mobile.setAttribute('aria-pressed', mobileOn ? 'true' : 'false');
      mobile.setAttribute('aria-label', mobileOn ? 'Mobile SIMs - ' + sims + ' selected' : 'Mobile SIMs - not selected');
    }
  }

  function install() {
    if (!document.querySelector('#servicesCard [data-service="energy"]') || !$('canonicalEnergyPanel') || !$('canonicalMobilePanel')) return false;
    installStyles();
    enhanceEnergy();
    enhanceMobile();
    sync();

    var observer = new MutationObserver(function () { sync(); });
    var services = $('servicesCard');
    if (services) observer.observe(services, { attributes:true, subtree:true, attributeFilter:['class'] });

    ['canonicalFuelSelection','canonicalSimCount'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('change', sync);
      el.addEventListener('input', sync);
    });

    global.addEventListener('ac:main-reset', function () { setTimeout(sync, 0); });
    global.AppointmentCompanionServicePolish = { sync:sync, setFuel:setFuel, setSims:setSims };
    return true;
  }

  if (install()) return;
  var attempts = 0;
  var timer = setInterval(function () {
    if (install() || ++attempts > 160) clearInterval(timer);
  }, 50);
})(window);
