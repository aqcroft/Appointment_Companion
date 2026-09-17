/* Service-level UI polish for consolidated Appointment Companion.
   - Nests Energy fuel and Mobile SIM selectors directly beneath their service buttons.
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
      /* Service selector stacks */
      #servicesCard > .pills { align-items:flex-start; }
      #servicesCard .ac-service-stack { flex:1 1 0; min-width:0; display:grid; gap:5px; }
      #servicesCard .ac-service-stack > [data-service] { width:100%; min-width:0; }
      #servicesCard .ac-inline-subchoice {
        display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:4px;
        max-height:0; opacity:0; overflow:hidden; transform:translateY(-4px);
        transition:max-height .18s ease, opacity .14s ease, transform .18s ease;
      }
      #servicesCard .ac-inline-subchoice.ac-open { max-height:48px; opacity:1; transform:translateY(0); }
      #servicesCard .ac-inline-subchoice[data-kind="mobile"] { grid-template-columns:repeat(5,minmax(0,1fr)); }
      #servicesCard .ac-inline-subchoice button {
        min-width:0; min-height:31px; padding:4px 3px; border-radius:8px;
        border:1px solid rgba(38,22,79,.14); background:#fff; color:#26164f;
        font:750 12px/1 system-ui; cursor:pointer;
      }
      #servicesCard .ac-inline-subchoice[data-kind="energy"] button { font-size:16px; }

      /* UW service palette sampled from the current UW service cards.
         Soft = service identity / section tint. Strong = selected actions and toggles. */
      :root {
        --ac-energy-base:#BDDEE4; --ac-energy-soft:#F1F9FA; --ac-energy-strong:#4A92A0;
        --ac-broadband-base:#A2E2C3; --ac-broadband-soft:#F0FAF5; --ac-broadband-strong:#3C966B;
        --ac-mobile-base:#FAD0E9; --ac-mobile-soft:#FFF2F9; --ac-mobile-strong:#BE568E;
        --ac-insurance-base:#FFAB70; --ac-insurance-soft:#FFF3EA; --ac-insurance-strong:#D86A2B;
        --ac-cashback-base:#C6B5E2; --ac-cashback-soft:#F6F1FB; --ac-cashback-strong:#7654A8;
      }

      /* Top service buttons */
      #servicesCard [data-service="energy"] { border-color:var(--ac-energy-base)!important; }
      #servicesCard [data-service="broadband"] { border-color:var(--ac-broadband-base)!important; }
      #servicesCard [data-service="mobile"] { border-color:var(--ac-mobile-base)!important; }
      #servicesCard [data-service="energy"].on { background:var(--ac-energy-strong)!important; border-color:var(--ac-energy-strong)!important; color:#fff!important; }
      #servicesCard [data-service="broadband"].on { background:var(--ac-broadband-strong)!important; border-color:var(--ac-broadband-strong)!important; color:#fff!important; }
      #servicesCard [data-service="mobile"].on { background:var(--ac-mobile-strong)!important; border-color:var(--ac-mobile-strong)!important; color:#fff!important; }

      #servicesCard .ac-inline-subchoice[data-kind="energy"] { background:var(--ac-energy-soft); border-radius:9px; padding:3px; }
      #servicesCard .ac-inline-subchoice[data-kind="mobile"] { background:var(--ac-mobile-soft); border-radius:9px; padding:3px; }
      #servicesCard .ac-inline-subchoice[data-kind="energy"] button.on { background:var(--ac-energy-strong); border-color:var(--ac-energy-strong); color:#fff; }
      #servicesCard .ac-inline-subchoice[data-kind="mobile"] button.on { background:var(--ac-mobile-strong); border-color:var(--ac-mobile-strong); color:#fff; }

      /* Main service section shading */
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

      /* Matching buttons, selected pills and toggles inside each service section */
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

      /* Canonical Energy detail controls inherit Energy colouring. */
      #canonicalEnergyPanel { background:linear-gradient(135deg,var(--ac-energy-soft),#fff 84%)!important; border-color:var(--ac-energy-base)!important; }
      #canonicalEnergyPanel .canonical-title, #canonicalEnergyPanel .canonical-helper summary, #canonicalEnergyPanel .canonical-helper-output { color:var(--ac-energy-strong)!important; }
      #canonicalEnergyPanel .canonical-choice button { border-color:var(--ac-energy-base)!important; }
      #canonicalEnergyPanel .canonical-choice button.on, #canonicalEnergyPanel #useSplitEstimate:not(:disabled) { background:var(--ac-energy-strong)!important; border-color:var(--ac-energy-strong)!important; color:#fff!important; }

      /* Original duplicated selector rows are retained for state wiring only. */
      #canonicalEnergyPanel > .canonical-choice[aria-label="Energy fuel"] { display:none!important; }
      #canonicalMobilePanel { display:none!important; }

      @media(max-width:520px) {
        #servicesCard > .pills { gap:6px; }
        #servicesCard .ac-service-stack { gap:4px; }
        #servicesCard .ac-service-stack > [data-service] { padding-left:5px; padding-right:5px; font-size:12px; }
        #servicesCard .ac-inline-subchoice button { min-height:29px; font-size:11px; padding:3px 1px; }
        #servicesCard .ac-inline-subchoice[data-kind="energy"] button { font-size:15px; }
      }
    `;
    document.head.appendChild(style);
  }

  function makeStack(service, kind) {
    var button = document.querySelector('#servicesCard [data-service="' + service + '"]');
    if (!button) return null;
    if (button.parentElement && button.parentElement.classList.contains('ac-service-stack')) return button.parentElement;
    var stack = document.createElement('div');
    stack.className = 'ac-service-stack';
    stack.dataset.serviceStack = service;
    button.parentNode.insertBefore(stack, button);
    stack.appendChild(button);
    var row = document.createElement('div');
    row.className = 'ac-inline-subchoice';
    row.dataset.kind = kind;
    stack.appendChild(row);
    return stack;
  }

  function buildEnergyRow(stack) {
    var row = stack && stack.querySelector('.ac-inline-subchoice[data-kind="energy"]');
    var original = document.querySelector('#canonicalEnergyPanel .canonical-choice[aria-label="Energy fuel"]');
    if (!row || !original || row.children.length) return;
    [
      { value:'electricity', icon:'⚡', label:'Electricity only' },
      { value:'gas', icon:'🔥', label:'Gas only' },
      { value:'both', icon:'⚡🔥', label:'Electricity and Gas' }
    ].forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = item.icon; b.title = item.label; b.setAttribute('aria-label', item.label); b.dataset.acFuel = item.value;
      b.addEventListener('click', function (event) {
        event.stopPropagation();
        var target = original.querySelector('[data-canonical-fuel="' + item.value + '"]');
        if (target) target.click();
        sync();
      });
      row.appendChild(b);
    });
  }

  function buildMobileRow(stack) {
    var row = stack && stack.querySelector('.ac-inline-subchoice[data-kind="mobile"]');
    var original = document.querySelector('#canonicalMobilePanel .canonical-choice[aria-label="SIM count"]');
    if (!row || !original || row.children.length) return;
    [1,2,3,4,5].forEach(function (count) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = String(count); b.title = count + (count === 1 ? ' SIM' : ' SIMs'); b.setAttribute('aria-label', b.title); b.dataset.acSim = String(count);
      b.addEventListener('click', function (event) {
        event.stopPropagation();
        var target = original.querySelector('[data-canonical-sim="' + count + '"]');
        if (target) target.click();
        sync();
      });
      row.appendChild(b);
    });
  }

  function sync() {
    var energyService = document.querySelector('#servicesCard [data-service="energy"]');
    var mobileService = document.querySelector('#servicesCard [data-service="mobile"]');
    var energyRow = document.querySelector('#servicesCard .ac-inline-subchoice[data-kind="energy"]');
    var mobileRow = document.querySelector('#servicesCard .ac-inline-subchoice[data-kind="mobile"]');
    if (energyRow) energyRow.classList.toggle('ac-open', !!(energyService && energyService.classList.contains('on')));
    if (mobileRow) mobileRow.classList.toggle('ac-open', !!(mobileService && mobileService.classList.contains('on')));

    var fuel = $('canonicalFuelSelection') ? $('canonicalFuelSelection').value : 'both';
    if (energyRow) energyRow.querySelectorAll('[data-ac-fuel]').forEach(function (b) {
      var on = b.dataset.acFuel === fuel; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var sims = $('canonicalSimCount') ? String($('canonicalSimCount').value || '1') : '1';
    if (mobileRow) mobileRow.querySelectorAll('[data-ac-sim]').forEach(function (b) {
      var on = b.dataset.acSim === sims; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function install() {
    if (!document.querySelector('#servicesCard [data-service="energy"]') || !$('canonicalEnergyPanel') || !$('canonicalMobilePanel')) return false;
    installStyles();
    var energyStack = makeStack('energy', 'energy');
    var mobileStack = makeStack('mobile', 'mobile');
    buildEnergyRow(energyStack);
    buildMobileRow(mobileStack);
    sync();

    ['energy','mobile'].forEach(function (service) {
      var b = document.querySelector('#servicesCard [data-service="' + service + '"]');
      if (b && !b.dataset.acPolishWired) {
        b.dataset.acPolishWired = '1';
        b.addEventListener('click', function () { setTimeout(sync, 0); });
      }
    });

    var observer = new MutationObserver(sync);
    var services = $('servicesCard');
    if (services) observer.observe(services, { attributes:true, subtree:true, attributeFilter:['class','value'] });
    ['canonicalFuelSelection','canonicalSimCount'].forEach(function (id) {
      var el = $(id); if (el) el.addEventListener('change', sync);
    });
    global.AppointmentCompanionServicePolish = { sync: sync };
    return true;
  }

  if (install()) return;
  var attempts = 0;
  var timer = setInterval(function () {
    if (install() || ++attempts > 160) clearInterval(timer);
  }, 50);
})(window);
