/* Appointment Companion v2.43 - compact cashback controls + larger tariff picker. */
(function () {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;

  function addStyles() {
    if (document.getElementById('acV243Style')) return;
    var st = document.createElement('style');
    st.id = 'acV243Style';
    st.textContent = `
      /* Cashback - compact, phone-first control surface */
      #cashbackCard.ac-v243-cashback {
        padding:14px 16px!important;
      }
      #cashbackCard.ac-v243-cashback > .switchrow:first-child,
      #cashbackCard.ac-v243-cashback > #cashbackInner {
        display:none!important;
      }
      #acV243CashbackCompact { display:grid; gap:12px; }
      .ac-v243-cb-toggle-row {
        display:flex; align-items:center; justify-content:space-between; gap:14px;
        padding:2px 0 10px; border-bottom:1px solid rgba(38,22,79,.10);
      }
      .ac-v243-cb-toggle-copy { min-width:0; }
      .ac-v243-cb-toggle-copy strong { display:block; font-size:15px; line-height:1.2; color:#26164f; }
      .ac-v243-cb-toggle-copy small { display:block; margin-top:2px; font-size:11px; line-height:1.25; color:#73707d; }
      .ac-v243-toggle {
        position:relative; flex:0 0 48px; width:48px; height:28px; cursor:pointer;
      }
      .ac-v243-toggle input {
        position:absolute; opacity:0; width:1px; height:1px; margin:0;
      }
      .ac-v243-toggle span {
        position:absolute; inset:0; border-radius:999px; background:#d9d6df;
        transition:.16s ease;
      }
      .ac-v243-toggle span:after {
        content:""; position:absolute; width:22px; height:22px; left:3px; top:3px;
        border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(38,22,79,.22);
        transition:.16s ease;
      }
      .ac-v243-toggle input:checked + span { background:#7654A8; }
      .ac-v243-toggle input:checked + span:after { transform:translateX(20px); }

      .ac-v243-spend-card {
        border:1px solid rgba(38,22,79,.12); border-radius:14px; background:#fff;
        padding:12px 14px;
      }
      .ac-v243-spend-head {
        display:flex; align-items:baseline; justify-content:space-between; gap:12px;
        margin-bottom:3px;
      }
      .ac-v243-spend-head strong { font-size:15px; color:#26164f; }
      #acV243SpendValue { font-size:18px; font-weight:850; color:#26164f; white-space:nowrap; }
      .ac-v243-spend-help { font-size:11px; color:#77727f; margin:0 0 8px; }
      #acV243CashbackCompact #spendSlider { width:100%; margin:4px 0 2px; }
      #acV243Estimate {
        margin-top:5px; font-size:12px; line-height:1.35; color:#6f6b78;
      }
      #acV243EstimateBasis {
        margin-top:9px; border:1px solid rgba(38,22,79,.12); border-radius:10px;
        background:#fff;
      }
      #acV243EstimateBasis > summary {
        list-style:none; cursor:pointer; padding:9px 10px; font-size:12px; font-weight:800; color:#26164f;
      }
      #acV243EstimateBasis > summary::-webkit-details-marker { display:none; }
      #acV243EstimateBasis > summary:before { content:"▸ "; }
      #acV243EstimateBasis[open] > summary:before { content:"▾ "; }
      #acV243EstimateBasis .cbchips { margin:0 9px 9px; }
      #acV243EstimateBasis details { margin:6px 9px 10px!important; }

      #acV243Advanced {
        border-top:1px solid rgba(38,22,79,.10); padding-top:3px;
      }
      #acV243Advanced > summary {
        list-style:none; cursor:pointer; padding:10px 2px 7px; font-size:13px; font-weight:850; color:#26164f;
      }
      #acV243Advanced > summary::-webkit-details-marker { display:none; }
      #acV243Advanced > summary:before { content:"▸ "; }
      #acV243Advanced[open] > summary:before { content:"▾ "; }
      #acV243AdvancedBody { display:grid; gap:8px; padding-bottom:4px; }
      #acV243AdvancedBody .switchrow {
        margin:0!important; padding:9px 0!important; border-top:0!important;
      }
      #acV243AdvancedBody h2 {
        margin:0!important; font-size:13px!important; color:#26164f!important;
      }
      #acV243AdvancedBody #manualAdjustFields,
      #acV243AdvancedBody #oneOffFields { margin-top:3px!important; }
      #manualAdjustCard.ac-v243-absorbed { display:none!important; }

      /* Tariff picker - make the actual choice the dominant part of the modal */
      .ac-v243-tariff-modal {
        width:min(680px,calc(100vw - 24px))!important;
        max-width:680px!important;
      }
      .ac-v243-tariff-modal table {
        width:100%!important; table-layout:fixed; border-collapse:separate; border-spacing:0;
        font-size:14px!important;
      }
      .ac-v243-tariff-modal th {
        padding:11px 8px!important; font-size:12px!important; line-height:1.2!important;
      }
      .ac-v243-tariff-modal td {
        padding:15px 9px!important; font-size:15px!important; line-height:1.25!important;
        min-height:56px;
      }
      .ac-v243-tariff-modal td:first-child,
      .ac-v243-tariff-modal th:first-child {
        width:34%!important; text-align:left!important;
      }
      .ac-v243-tariff-modal td:not(:first-child) {
        font-weight:800!important;
      }
      .ac-v243-tariff-modal input[type="radio"] {
        width:20px!important; height:20px!important; margin-right:8px!important;
      }
      .ac-v243-tariff-modal [role="row"],
      .ac-v243-tariff-modal tbody tr { min-height:58px; }
      .ac-v243-tariff-modal .ac-v243-tariff-intro {
        margin:2px 0 14px!important; font-size:13px!important; line-height:1.35!important;
      }
      @media(max-width:520px) {
        .ac-v243-tariff-modal { width:calc(100vw - 20px)!important; padding:18px 14px!important; }
        .ac-v243-tariff-modal th { padding:10px 5px!important; font-size:11px!important; }
        .ac-v243-tariff-modal td { padding:15px 5px!important; font-size:14px!important; }
        .ac-v243-tariff-modal td:first-child,
        .ac-v243-tariff-modal th:first-child { width:36%!important; }
      }
    `;
    document.head.appendChild(st);
  }

  function selectedCashbackAmount() {
    var used = document.querySelector('#cashbackCard .cbchip.used .amt span');
    if (used && used.textContent.trim()) return used.textContent.trim();
    var med = document.getElementById('cbMed');
    return med && med.textContent.trim() ? med.textContent.trim() : '0';
  }

  function syncCashbackSummary() {
    var slider = document.getElementById('spendSlider');
    var value = document.getElementById('acV243SpendValue');
    var estimate = document.getElementById('acV243Estimate');
    if (slider && value) value.textContent = '£' + Number(slider.value || 0).toLocaleString('en-GB') + '/m';
    if (estimate) estimate.textContent = 'Current estimate: about £' + selectedCashbackAmount() + '/month cashback before the card fee.';
  }

  function buildCashback() {
    var card = document.getElementById('cashbackCard');
    var slider = document.getElementById('spendSlider');
    var include = document.getElementById('includeCashback');
    if (!card || !slider || !include || document.getElementById('acV243CashbackCompact')) return false;

    card.classList.add('ac-v243-cashback');
    var heading = card.querySelector('h2');
    if (heading) heading.textContent = '💳 Cashback Card';

    var compact = document.createElement('div');
    compact.id = 'acV243CashbackCompact';
    compact.innerHTML =
      '<div class="ac-v243-cb-toggle-row">' +
        '<div class="ac-v243-cb-toggle-copy"><strong>Include cashback estimate</strong><small>Average estimate is used by default.</small></div>' +
        '<label class="ac-v243-toggle" aria-label="Include cashback estimate"><span></span></label>' +
      '</div>' +
      '<div class="ac-v243-spend-card">' +
        '<div class="ac-v243-spend-head"><strong>Monthly card spend</strong><span id="acV243SpendValue"></span></div>' +
        '<p class="ac-v243-spend-help">Adjust to roughly match the household.</p>' +
        '<div id="acV243SliderMount"></div>' +
        '<div id="acV243Estimate"></div>' +
        '<details id="acV243EstimateBasis"><summary>Change estimate basis</summary><div id="acV243BasisMount"></div></details>' +
      '</div>' +
      '<details id="acV243Advanced"><summary>Advanced adjustments</summary><div id="acV243AdvancedBody"></div></details>';

    var originalHeader = card.querySelector(':scope > .switchrow');
    if (originalHeader) originalHeader.insertAdjacentElement('afterend', compact);
    else card.insertBefore(compact, card.firstChild);

    var toggle = compact.querySelector('.ac-v243-toggle');
    toggle.insertBefore(include, toggle.firstChild);

    compact.querySelector('#acV243SliderMount').appendChild(slider);

    var basisMount = compact.querySelector('#acV243BasisMount');
    var chips = card.querySelector('.cbchips');
    if (chips) basisMount.appendChild(chips);
    var inner = document.getElementById('cashbackInner');
    if (inner) {
      Array.prototype.slice.call(inner.querySelectorAll('details')).forEach(function (d) { basisMount.appendChild(d); });
    }

    var advancedBody = compact.querySelector('#acV243AdvancedBody');
    var manualCard = document.getElementById('manualAdjustCard');
    if (manualCard) {
      var manualToggle = document.getElementById('manualAdjustToggle');
      var oneOffToggle = document.getElementById('oneOffToggle');
      [manualToggle, oneOffToggle].forEach(function (input) {
        if (!input) return;
        var row = input.closest('.switchrow');
        if (row) advancedBody.appendChild(row);
        var fields = input.id === 'manualAdjustToggle' ? document.getElementById('manualAdjustFields') : document.getElementById('oneOffFields');
        if (fields) advancedBody.appendChild(fields);
      });
      manualCard.classList.add('ac-v243-absorbed');
    }

    slider.addEventListener('input', function () { setTimeout(syncCashbackSummary, 0); });
    card.addEventListener('click', function () { setTimeout(syncCashbackSummary, 0); });
    syncCashbackSummary();
    return true;
  }

  function findTariffCards() {
    var headings = Array.prototype.slice.call(document.querySelectorAll('h1,h2,h3,h4,[role="heading"]'));
    headings.forEach(function (h) {
      if (String(h.textContent || '').trim().toLowerCase() !== 'choose tariff') return;
      var node = h;
      var card = null;
      for (var i=0; i<6 && node; i++, node=node.parentElement) {
        if (node.querySelector && node.querySelector('table')) { card = node; }
        if (node.getAttribute && node.getAttribute('role') === 'dialog') { card = node; break; }
      }
      if (!card) return;
      card.classList.add('ac-v243-tariff-modal');
      var paras = Array.prototype.slice.call(card.querySelectorAll('p'));
      var intro = paras.find(function (p) {
        var t = String(p.textContent || '').toLowerCase();
        return t.indexOf('tap a tariff') >= 0 || t.indexOf('highlighted column') >= 0;
      });
      if (intro) {
        intro.classList.add('ac-v243-tariff-intro');
        var match = String(intro.textContent || '').match(/(\d+)\s*-?service/i);
        intro.textContent = match ? 'Your ' + match[1] + '-service price is highlighted.' : 'Your current basket price is highlighted.';
      }
    });
  }

  addStyles();
  buildCashback();
  findTariffCards();

  var obs = new MutationObserver(function () {
    buildCashback();
    findTariffCards();
    syncCashbackSummary();
  });
  obs.observe(document.body, {childList:true, subtree:true, characterData:true});

  setTimeout(function () { buildCashback(); findTariffCards(); syncCashbackSummary(); }, 250);
  setTimeout(function () { buildCashback(); findTariffCards(); syncCashbackSummary(); }, 1200);
})();