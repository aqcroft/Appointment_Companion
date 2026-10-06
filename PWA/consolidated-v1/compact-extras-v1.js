/* Appointment Companion compact secondary controls.
   - Optional SIM names and optional handset/airtime split, both off by default.
   - Removes redundant per-SIM include toggles: SIM count at the top is the source of truth.
   - Cashback assumptions are always visible while Cashback Card is selected.
   - Manual adjustments and private notes live together behind one compact pencil control.
*/
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode')) return;

  var $ = function (id) { return document.getElementById(id); };

  function installStyles() {
    if ($('acCompactExtrasStyle')) return;
    var style = document.createElement('style');
    style.id = 'acCompactExtrasStyle';
    style.textContent = `
      /* Mobile heading and optional controls. */
      #mobileCard .ac-mobile-heading {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
        margin-bottom:.45rem;
      }
      #mobileCard .ac-mobile-heading h2 { margin:0!important; }
      #mobileCard .ac-mobile-options-btn {
        width:34px;
        height:34px;
        min-height:34px;
        padding:0;
        border:1px solid var(--ac-mobile-base);
        border-radius:9px;
        background:rgba(255,255,255,.78);
        color:var(--ac-mobile-strong);
        font-size:16px;
        cursor:pointer;
      }
      #mobileCard .ac-mobile-options {
        display:none;
        grid-template-columns:1fr;
        gap:4px;
        margin:0 0 .55rem;
        padding:.5rem .6rem;
        border:1px solid rgba(173,62,120,.22);
        border-radius:10px;
        background:rgba(255,255,255,.66);
      }
      #mobileCard .ac-mobile-options.open { display:grid; }
      #mobileCard .ac-mobile-options .switchrow {
        margin:0!important;
        padding:.25rem 0!important;
      }
      #mobileCard .ac-mobile-options .lbl {
        font-size:12px;
        font-weight:750;
      }

      /* SIM count at the top controls inclusion, so lower include switches are redundant. */
      #mobileCard .sim-head .switch { display:none!important; }
      #mobileCard .sim-head {
        display:none;
        margin-bottom:.45rem;
      }
      #mobileCard.ac-show-sim-names .sim-head { display:flex; }
      #mobileCard .sim-head input[data-field="name"] {
        width:100%;
        margin:0;
        border-color:rgba(173,62,120,.3);
        background:#fff;
      }
      #mobileCard .sim { position:relative; }
      #mobileCard .ac-sim-index {
        display:inline-flex;
        align-items:center;
        min-height:20px;
        padding:2px 7px;
        border-radius:999px;
        background:rgba(173,62,120,.10);
        color:var(--ac-mobile-strong);
        font-size:9px;
        font-weight:900;
        letter-spacing:.35px;
        text-transform:uppercase;
        margin-right:auto;
      }
      #mobileCard .ac-split-cost-grid {
        display:none;
        grid-template-columns:1fr 1fr;
        gap:5px;
        margin-bottom:.55rem;
      }
      #mobileCard.ac-split-mobile-costs .ac-split-cost-grid { display:grid; }
      #mobileCard.ac-split-mobile-costs .ac-combined-mobile-cost { display:none!important; }
      #mobileCard .ac-split-cost-grid .field { margin:0; }
      #mobileCard .ac-split-cost-grid label {
        font-size:10px;
        line-height:1.15;
      }

      /* Cashback controls stay exposed - no extra accordion tap. */
      #cashbackCard > .switchrow .switch { display:inline-flex!important; transform:scale(.88); transform-origin:right center; }
      #cashbackCard > .switchrow::after { content:'include'; margin-left:5px; color:var(--ac-cashback-strong); font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
      #cashbackAssumptionsDetails > summary { display:none!important; }
      #cashbackAssumptionsDetails {
        display:block!important;
        margin-top:.45rem;
      }
      #cashbackAssumptionsDetails > .progressive-body {
        display:block!important;
        padding-top:0!important;
      }
      #cashbackCard .cbchip {
        border-width:1.5px;
        background:rgba(255,255,255,.72);
      }
      #cashbackCard .cbchip.used {
        border-color:var(--ac-cashback-strong)!important;
        background:rgba(103,72,168,.13)!important;
      }

      /* One compact pencil section for rare/manual inputs. */
      #acManualExtrasCard {
        padding:.6rem .85rem;
        border:1.5px solid #D5C9E8;
        background:linear-gradient(135deg,#F5F0FB,#fff 80%);
      }
      #acManualExtrasCard > summary {
        list-style:none;
        display:flex;
        align-items:center;
        min-height:32px;
        padding:0!important;
        color:#654F80;
        font-size:13px;
        font-weight:850;
        cursor:pointer;
      }
      #acManualExtrasCard > summary::-webkit-details-marker { display:none; }
      #acManualExtrasCard > summary::after {
        content:'›';
        margin-left:auto;
        font-size:19px;
        transform:rotate(90deg);
        transition:transform .15s ease;
      }
      #acManualExtrasCard[open] > summary::after { transform:rotate(270deg); }
      #acManualExtrasBody { padding-top:.5rem; }
      #acManualExtrasBody > #manualAdjustCard,
      #acManualExtrasBody > #notesCard {
        margin:.4rem 0 0!important;
        border:0!important;
        box-shadow:none!important;
        padding:.65rem!important;
        background:rgba(255,255,255,.72)!important;
      }
      #acManualExtrasBody > #manualAdjustCard h2 { font-size:14px!important; }
      #acManualExtrasBody > #notesCard textarea { min-height:72px; }

      @media(max-width:420px) {
        #mobileCard .ac-split-cost-grid { gap:4px; }
        #mobileCard .ac-split-cost-grid input { padding:9px 7px!important; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensurePersistentInput(id) {
    var el = $(id);
    if (el) return el;
    el = document.createElement('input');
    el.type = 'number';
    el.id = id;
    el.className = 'hidden ac-mobile-persist';
    el.tabIndex = -1;
    var host = $('mobileCard');
    if (host) host.appendChild(el);
    return el;
  }

  function ensureMobileOptions() {
    var card = $('mobileCard');
    if (!card || $('acMobileOptions')) return;

    var h2 = card.querySelector('h2');
    if (h2) h2.textContent = '📱 Mobile';

    var heading = document.createElement('div');
    heading.className = 'ac-mobile-heading';
    if (h2) {
      h2.parentNode.insertBefore(heading, h2);
      heading.appendChild(h2);
    } else {
      card.insertBefore(heading, card.firstChild);
    }

    var button = document.createElement('button');
    button.type = 'button';
    button.id = 'acMobileOptionsBtn';
    button.className = 'ac-mobile-options-btn';
    button.title = 'Mobile options';
    button.setAttribute('aria-label', 'Mobile options');
    button.setAttribute('aria-expanded', 'false');
    button.textContent = '⚙️';
    heading.appendChild(button);

    var options = document.createElement('div');
    options.id = 'acMobileOptions';
    options.className = 'ac-mobile-options';
    options.innerHTML =
      '<div class="switchrow"><span class="lbl">👤 Add names to SIMs</span><span class="switch"><input type="checkbox" id="mobileNamesToggle"><span class="track"></span></span></div>' +
      '<div class="switchrow"><span class="lbl">📱 Split current cost: airtime + handset</span><span class="switch"><input type="checkbox" id="mobileSplitCostToggle"><span class="track"></span></span></div>';
    heading.insertAdjacentElement('afterend', options);

    for (var i = 1; i <= 5; i++) {
      ensurePersistentInput('acSim' + i + 'AirtimeCost');
      ensurePersistentInput('acSim' + i + 'HandsetCost');
    }

    button.addEventListener('click', function () {
      var open = !options.classList.contains('open');
      options.classList.toggle('open', open);
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    $('mobileNamesToggle').addEventListener('change', function () {
      syncMobileModes();
      decorateSims();
    });
    $('mobileSplitCostToggle').addEventListener('change', function () {
      syncMobileModes();
      decorateSims(true);
    });
  }

  function simNumber(sim) {
    var id = String(sim && sim.id || '');
    var match = id.match(/simbox_sim(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  function persistedCost(n, kind) {
    return $('acSim' + n + kind + 'Cost');
  }

  function numberValue(el) {
    var n = el && el.value !== '' ? Number(el.value) : 0;
    return Number.isFinite(n) ? n : 0;
  }

  function updateCombinedFromSplit(sim, n) {
    var monthly = sim.querySelector('input[data-field="monthlyCost"]');
    var airtimePersist = persistedCost(n, 'Airtime');
    var handsetPersist = persistedCost(n, 'Handset');
    if (!monthly || !airtimePersist || !handsetPersist) return;
    var total = numberValue(airtimePersist) + numberValue(handsetPersist);
    var nextValue = total ? String(total) : '';
    if (String(monthly.value || '') !== nextValue) {
      monthly.value = nextValue;
      monthly.dispatchEvent(new Event('input', { bubbles:true }));
    }
  }

  function ensureSplitFields(sim, n, initialise) {
    var currentSide = sim.querySelector('.sim-compare .side:not(.uw)');
    var monthly = sim.querySelector('input[data-field="monthlyCost"]');
    if (!currentSide || !monthly) return;

    var monthlyField = monthly.closest('.field');
    if (monthlyField) monthlyField.classList.add('ac-combined-mobile-cost');

    var grid = sim.querySelector('.ac-split-cost-grid');
    if (!grid) {
      grid = document.createElement('div');
      grid.className = 'ac-split-cost-grid';
      grid.innerHTML =
        '<div class="field money"><label>Airtime /m</label><input type="number" inputmode="decimal" step="0.01" data-ac-split-cost="airtime" placeholder="0"></div>' +
        '<div class="field money"><label>Handset /m</label><input type="number" inputmode="decimal" step="0.01" data-ac-split-cost="handset" placeholder="0"></div>';
      if (monthlyField) currentSide.insertBefore(grid, monthlyField);
      else currentSide.appendChild(grid);

      grid.addEventListener('input', function (event) {
        var input = event.target.closest('[data-ac-split-cost]');
        if (!input) return;
        var kind = input.dataset.acSplitCost === 'handset' ? 'Handset' : 'Airtime';
        var persist = persistedCost(n, kind);
        if (persist) persist.value = input.value;
        updateCombinedFromSplit(sim, n);
      });
    }

    var airtimePersist = persistedCost(n, 'Airtime');
    var handsetPersist = persistedCost(n, 'Handset');
    var airtimeInput = grid.querySelector('[data-ac-split-cost="airtime"]');
    var handsetInput = grid.querySelector('[data-ac-split-cost="handset"]');

    if (initialise && $('mobileSplitCostToggle') && $('mobileSplitCostToggle').checked) {
      var noSavedSplit = !numberValue(airtimePersist) && !numberValue(handsetPersist);
      if (noSavedSplit && numberValue(monthly)) {
        airtimePersist.value = monthly.value;
        handsetPersist.value = '';
      }
    }

    if (airtimeInput) airtimeInput.value = airtimePersist && airtimePersist.value || '';
    if (handsetInput) handsetInput.value = handsetPersist && handsetPersist.value || '';

    if ($('mobileSplitCostToggle') && $('mobileSplitCostToggle').checked) {
      updateCombinedFromSplit(sim, n);
    } else if (monthly && monthly.dataset.acSplitSyncBound !== '1') {
      monthly.dataset.acSplitSyncBound = '1';
      monthly.addEventListener('input', function syncCombinedToDefaultSplit() {
        if ($('mobileSplitCostToggle') && $('mobileSplitCostToggle').checked) return;
        if (airtimePersist) airtimePersist.value = monthly.value;
        if (handsetPersist) handsetPersist.value = '';
      });
    }
  }

  function decorateSims(initialiseSplit) {
    var card = $('mobileCard');
    if (!card) return;
    var showNames = !!($('mobileNamesToggle') && $('mobileNamesToggle').checked);

    card.querySelectorAll('.sim').forEach(function (sim) {
      var n = simNumber(sim);
      if (!n) return;

      var include = sim.querySelector('input[data-field="include"]');
      if (include && !include.checked) {
        include.checked = true;
        include.dispatchEvent(new Event('input', { bubbles:true }));
      }

      var name = sim.querySelector('input[data-field="name"]');
      var head = sim.querySelector('.sim-head');
      if (head && !head.querySelector('.ac-sim-index')) {
        var index = document.createElement('span');
        index.className = 'ac-sim-index';
        index.textContent = 'SIM ' + n;
        head.insertBefore(index, head.firstChild);
      }
      if (name) {
        name.placeholder = 'Name (optional)';
        if (showNames && /^SIM\s+\d+$/i.test(String(name.value || '').trim())) {
          name.value = '';
          name.dispatchEvent(new Event('input', { bubbles:true }));
        }
      }

      var currentTag = sim.querySelector('.sim-compare .side:not(.uw) .tag');
      if (currentTag) currentTag.textContent = 'SIM ' + n + ' · Current';

      ensureSplitFields(sim, n, !!initialiseSplit);
    });
  }

  function syncMobileModes() {
    var card = $('mobileCard');
    if (!card) return;
    card.classList.toggle('ac-show-sim-names', !!($('mobileNamesToggle') && $('mobileNamesToggle').checked));
    card.classList.toggle('ac-split-mobile-costs', !!($('mobileSplitCostToggle') && $('mobileSplitCostToggle').checked));
  }

  function exposeCashbackControls() {
    var details = $('cashbackAssumptionsDetails');
    if (details) details.open = true;
  }

  function moveManualExtras() {
    if ($('acManualExtrasCard')) return;
    var cashback = $('cashbackCard');
    var manual = $('manualAdjustCard');
    var notes = $('notesCard');
    if (!cashback || !manual || !notes || !cashback.parentNode) return;

    var wrap = document.createElement('details');
    wrap.id = 'acManualExtrasCard';
    wrap.className = 'card';
    wrap.innerHTML = '<summary>✏️ Manual edits &amp; notes</summary><div id="acManualExtrasBody"></div>';
    cashback.insertAdjacentElement('afterend', wrap);

    var body = $('acManualExtrasBody');
    body.appendChild(manual);
    body.appendChild(notes);
  }

  function syncManualExtrasVisibility() {
    var wrap = $('acManualExtrasCard');
    var services = $('servicesCard');
    if (!wrap || !services) return;
    wrap.classList.toggle('hidden', services.classList.contains('hidden'));
  }

  function install() {
    if (!$('mobileCard') || !$('cashbackCard') || !$('manualAdjustCard') || !$('notesCard')) return false;

    installStyles();
    ensureMobileOptions();
    moveManualExtras();
    exposeCashbackControls();
    syncMobileModes();
    decorateSims(true);
    syncManualExtrasVisibility();

    var simList = $('simList');
    if (simList) {
      var simObserver = new MutationObserver(function () {
        syncMobileModes();
        decorateSims(true);
      });
      // Observe only direct SIM-card rebuilds. Watching the whole subtree made
      // our own decoration mutations re-trigger the observer repeatedly.
      simObserver.observe(simList, { childList:true });
    }

    var services = $('servicesCard');
    if (services) {
      var servicesObserver = new MutationObserver(function () {
        syncManualExtrasVisibility();
        exposeCashbackControls();
      });
      servicesObserver.observe(services, { attributes:true, attributeFilter:['class'] });
    }

    var cb = $('includeCashback');
    if (cb) cb.addEventListener('change', exposeCashbackControls);

    global.addEventListener('ac:main-reset', function () {
      setTimeout(function () {
        var names = $('mobileNamesToggle');
        var split = $('mobileSplitCostToggle');
        if (names) names.checked = false;
        if (split) split.checked = false;
        syncMobileModes();
        decorateSims();
        exposeCashbackControls();
        syncManualExtrasVisibility();
      }, 0);
    });

    global.AppointmentCompanionCompactExtras = {
      sync:function () {
        syncMobileModes();
        decorateSims(true);
        exposeCashbackControls();
        syncManualExtrasVisibility();
      }
    };
    return true;
  }

  if (install()) return;
  var tries = 0;
  var timer = setInterval(function () {
    if (install() || ++tries > 180) clearInterval(timer);
  }, 50);
})(window);
