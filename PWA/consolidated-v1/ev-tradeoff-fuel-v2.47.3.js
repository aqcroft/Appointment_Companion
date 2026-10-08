/* Appointment Companion v2.47.3 | EV tariff trade-off and single-car fuel comparison.
   Read-only display enhancement: uses the existing v13 EV/variable cost engine.
   Fuel comparison is illustrative and is never written to a customer profile. */
(function () {
  'use strict';
  var latest = null;
  var fuel = 'P';
  var prices = {P:1.70, D:1.85};
  var mpg = {P:45, D:55};
  var selectedMiles = null;
  var isOpen = false;
  var root, modal;

  function byId(id) { return document.getElementById(id); }
  function pounds(n) { return '£' + Math.round(Math.abs(n)).toLocaleString('en-GB'); }
  function signed(n, period) {
    if (!Number.isFinite(n)) return '£—';
    var value = n / (period === 'year' ? 1 : 12);
    return (value < -0.001 ? '−' : value > 0.001 ? '+' : '') + pounds(value);
  }
  function amount(n) { return Number.isFinite(n) ? pounds(n / 12) : '£—'; }
  function keepNumber(v, fallback, min, max) {
    var n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
  }

  function installStyles() {
    if (byId('acEvTradeoffStyles')) return;
    var style = document.createElement('style');
    style.id = 'acEvTradeoffStyles';
    style.textContent = [
      '.ac-ev-tradeoff{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:9px}',
      '.ac-ev-tile{min-width:0;padding:8px 5px 7px;border-radius:11px;background:rgba(255,255,255,.105);border:1px solid rgba(255,255,255,.15);text-align:center}',
      '.ac-ev-tile:last-child{background:rgba(0,0,0,.17);border-color:rgba(255,255,255,.24)}',
      '.ac-ev-tile-label{font-size:9px;font-weight:800;line-height:1.25;opacity:.94}',
      '.ac-ev-tile-value{font-size:19px;font-weight:900;line-height:1.2;margin:4px 0 2px;letter-spacing:-.5px;white-space:nowrap}',
      '.ac-ev-tile-note{font-size:8px;line-height:1.2;opacity:.8}',
      '.ac-ev-tradeoff-caption{font-size:9px;margin:6px 1px 0;opacity:.82;line-height:1.35;text-align:center}',
      '.ac-ev-fuel-button{float:right;display:inline-flex;align-items:center;justify-content:center;min-width:40px;min-height:34px;padding:3px 8px;font-size:21px;border:1px solid #c9e5df;border-radius:11px;background:#edf9f6;cursor:pointer}',
      '.ac-ev-fuel-button:focus-visible,.ac-ev-fuel-modal button:focus-visible{outline:3px solid #edbf49;outline-offset:2px}',
      '.ac-ev-fuel-modal{position:fixed;inset:0;z-index:15000;display:none;align-items:center;justify-content:center;padding:12px;background:rgba(21,24,42,.67)}',
      '.ac-ev-fuel-modal.open{display:flex}',
      '.ac-ev-fuel-dialog{background:#fff;border-radius:18px;padding:17px;width:100%;max-width:440px;max-height:calc(100dvh - 24px);overflow:auto;box-sizing:border-box;color:#23202f;box-shadow:0 16px 55px rgba(0,0,0,.32)}',
      '.ac-ev-fuel-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}',
      '.ac-ev-fuel-top h2{font-size:18px;margin:0;line-height:1.3}',
      '.ac-ev-close{background:#f4f5f6;border:0;border-radius:9px;font-size:19px;width:34px;height:34px;cursor:pointer}',
      '.ac-ev-fuel-picks{display:flex;gap:7px;margin:12px 0}',
      '.ac-ev-fuel-picks button{flex:1;border:1px solid #cad4d3;border-radius:10px;background:white;color:#333;padding:9px;font-size:14px;font-weight:850;cursor:pointer}',
      '.ac-ev-fuel-picks button.on{background:#008c80;color:white;border-color:#008c80}',
      '.ac-ev-fuel-mile-row{display:flex;align-items:end;gap:8px;margin-bottom:11px}',
      '.ac-ev-fuel-mile-row label{flex:1;font-size:12px;font-weight:800}',
      '.ac-ev-fuel-mile-row input,.ac-ev-settings input{display:block;margin-top:5px;width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccd5d7;border-radius:9px;font:inherit;font-size:15px}',
      '.ac-ev-half{border:1px solid #bedbd6;color:#006c64;border-radius:9px;background:#edf9f6;padding:10px 12px;font-weight:850;cursor:pointer}',
      '.ac-ev-fuel-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}',
      '.ac-ev-fuel-stat{background:#f1f6f5;border-radius:10px;padding:9px 5px;text-align:center;min-width:0}',
      '.ac-ev-fuel-stat .ac-label{font-size:10px;line-height:1.3;font-weight:800;min-height:28px}',
      '.ac-ev-fuel-stat .ac-value{font-size:18px;font-weight:900;margin-top:5px;white-space:nowrap}',
      '.ac-ev-fuel-result{margin-top:10px;padding:11px;text-align:center;background:#e6f6f0;border-radius:12px}',
      '.ac-ev-fuel-result strong{display:block;color:#08745a;font-size:24px;margin:3px 0}',
      '.ac-ev-fuel-result .ac-result-label{font-weight:800;font-size:12px}',
      '.ac-ev-fuel-result small{display:block;font-size:11px;color:#375a51}',
      '.ac-ev-settings{margin-top:12px;border-top:1px solid #e5e8eb;padding-top:9px}',
      '.ac-ev-settings summary{font-size:12px;font-weight:850;cursor:pointer}',
      '.ac-ev-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:8px}',
      '.ac-ev-settings label{font-size:11px;font-weight:750}',
      '.ac-ev-explain{font-size:10px;color:#646577;line-height:1.45;margin:9px 0 0}',
      '@media(max-width:360px){.ac-ev-tile-value{font-size:16px}.ac-ev-tile-label{font-size:8px}.ac-ev-fuel-stat .ac-value{font-size:15px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function build() {
    if (root) return;
    var grid = document.querySelector('.hero .hero-grid');
    var vehicle = byId('vehiclePills');
    if (!grid || !vehicle) return;
    installStyles();
    root = document.createElement('div');
    root.id = 'acEvTradeoff';
    root.innerHTML =
      '<div class="ac-ev-tradeoff" aria-label="EV tariff versus standard variable tariff">' +
        '<div class="ac-ev-tile"><div class="ac-ev-tile-label">🚙 EV charging</div><div class="ac-ev-tile-value" id="acEvCarDelta">£—</div><div class="ac-ev-tile-note">cost difference</div></div>' +
        '<div class="ac-ev-tile"><div class="ac-ev-tile-label">🏠 Home</div><div class="ac-ev-tile-value" id="acEvHomeDelta">£—</div><div class="ac-ev-tile-note">cost difference</div></div>' +
        '<div class="ac-ev-tile"><div class="ac-ev-tile-label">💷 Net benefit</div><div class="ac-ev-tile-value" id="acEvNetDelta">£—</div><div class="ac-ev-tile-note" id="acEvNetNote">per month</div></div>' +
      '</div><div class="ac-ev-tradeoff-caption" id="acEvTradeoffCaption">Compared with the equivalent standard variable tariff · negative means cheaper</div>';
    grid.insertAdjacentElement('afterend', root);
    var header = vehicle.closest('.card').querySelector('.label');
    if (header) {
      var button = document.createElement('button');
      button.type='button';
      button.className='ac-ev-fuel-button';
      button.textContent='⛽';
      button.title='Compare petrol or diesel with electric charging';
      button.setAttribute('aria-label','Compare petrol or diesel fuel cost');
      button.onclick = openModal;
      header.appendChild(button);
    }
    makeModal();
    updateCards();
  }

  function makeModal() {
    modal = document.createElement('div');
    modal.className = 'ac-ev-fuel-modal';
    modal.id = 'acEvFuelModal';
    modal.innerHTML =
      '<div class="ac-ev-fuel-dialog" role="dialog" aria-modal="true" aria-labelledby="acEvFuelTitle">' +
        '<div class="ac-ev-fuel-top"><h2 id="acEvFuelTitle">⛽ Petrol / diesel versus EV</h2><button type="button" class="ac-ev-close" id="acEvFuelClose" aria-label="Close">×</button></div>' +
        '<div class="ac-ev-fuel-picks" aria-label="Fuel type"><button type="button" data-ac-fuel="P" class="on" title="Petrol">P · Petrol</button><button type="button" data-ac-fuel="D" title="Diesel">D · Diesel</button></div>' +
        '<div class="ac-ev-fuel-mile-row"><label for="acEvOneCarMiles">Annual miles for ONE car<input id="acEvOneCarMiles" type="number" min="0" max="150000" step="500" inputmode="numeric"></label><button type="button" class="ac-ev-half" id="acEvHalf" title="Use half the mileage from the main EV slider">½ miles</button></div>' +
        '<div class="ac-ev-fuel-grid">' +
          '<div class="ac-ev-fuel-stat"><div class="ac-label" id="acEvFuelName">⛽ Petrol</div><div class="ac-value" id="acEvFuelCost">£—</div></div>' +
          '<div class="ac-ev-fuel-stat"><div class="ac-label">⚡ EV charging</div><div class="ac-value" id="acEvChargeCost">£—</div></div>' +
          '<div class="ac-ev-fuel-stat"><div class="ac-label">🏠 Home change</div><div class="ac-value" id="acEvHouseCost">£—</div></div>' +
        '</div>' +
        '<div class="ac-ev-fuel-result"><div class="ac-result-label" id="acEvFuelResultLabel">Estimated overall fuel saving</div><strong id="acEvFuelResult">£—</strong><small id="acEvFuelYear">£— per year</small></div>' +
        '<details class="ac-ev-settings" id="acEvFuelAssumptions"><summary>⚙️ Customise fuel assumptions</summary><div class="ac-ev-settings-grid">' +
          '<label for="acEvPetrolPrice">Petrol £/litre<input id="acEvPetrolPrice" type="number" min="0.01" max="10" step="0.01" value="1.70"></label>' +
          '<label for="acEvDieselPrice">Diesel £/litre<input id="acEvDieselPrice" type="number" min="0.01" max="10" step="0.01" value="1.85"></label>' +
          '<label for="acEvPetrolMpg">Petrol UK MPG<input id="acEvPetrolMpg" type="number" min="1" max="200" step="1" value="45"></label>' +
          '<label for="acEvDieselMpg">Diesel UK MPG<input id="acEvDieselMpg" type="number" min="1" max="200" step="1" value="55"></label>' +
        '</div></details>' +
        '<p class="ac-ev-explain" id="acEvFuelExplain">Illustrative fuel/charging only, not vehicle ownership costs. Uses the selected EV tariff and the same-tier standard variable tariff for the household difference. Defaults are not live pump prices.</p>' +
      '</div>';
    document.body.appendChild(modal);
    byId('acEvFuelClose').onclick = closeModal;
    modal.addEventListener('click', function(e){ if(e.target===modal) closeModal(); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape' && isOpen) closeModal(); });
    modal.querySelectorAll('[data-ac-fuel]').forEach(function(b) {
      b.onclick=function(){ fuel=b.dataset.acFuel;updateModal(); };
    });
    byId('acEvOneCarMiles').addEventListener('input', function(){ selectedMiles = keepNumber(this.value,0,0,150000); updateModal(); });
    byId('acEvHalf').onclick=function(){ if(latest){ selectedMiles=Math.round(latest.miles/2);byId('acEvOneCarMiles').value=selectedMiles;updateModal(); } };
    ['acEvPetrolPrice','acEvDieselPrice','acEvPetrolMpg','acEvDieselMpg'].forEach(function(id) {
      byId(id).addEventListener('input', updateModal);
    });
  }

  function openModal() {
    if (!modal || !latest) return;
    if (selectedMiles===null) selectedMiles=Math.round(latest.miles);
    byId('acEvOneCarMiles').value=selectedMiles;
    isOpen = true;
    modal.classList.add('open');
    updateModal();
    byId('acEvFuelClose').focus();
  }
  function closeModal() {
    if (!modal) return;
    isOpen=false;
    modal.classList.remove('open');
    var trigger=document.querySelector('.ac-ev-fuel-button');
    if(trigger) trigger.focus();
  }

  function updateCards() {
    if (!root || !latest) return;
    var e=latest.ev, s=latest.standard;
    var available=e && s && [e.car,e.home,e.total,s.car,s.home,s.total].every(Number.isFinite);
    var caption=byId('acEvTradeoffCaption');
    if(!available) {
      ['acEvCarDelta','acEvHomeDelta','acEvNetDelta'].forEach(function(k){byId(k).textContent='£—';});
      caption.textContent='Waiting for matching EV and standard variable tariff rates - no estimates invented';
      return;
    }
    var period=latest.period;
    byId('acEvCarDelta').textContent=signed(e.car-s.car,period);
    byId('acEvHomeDelta').textContent=signed(e.home-s.home,period);
    var saving=(s.total-e.total)/(period==='year'?1:12);
    byId('acEvNetDelta').textContent=pounds(saving);
    byId('acEvNetNote').textContent=(saving>=0?'saved':'extra')+(period==='year'?' per year':' per month');
    caption.textContent='Against '+latest.standardName+' at '+latest.services+' UW services · negative means cheaper';
  }

  function updateModal() {
    if(!modal) return;
    modal.querySelectorAll('[data-ac-fuel]').forEach(function(b){
      b.classList.toggle('on',b.dataset.acFuel===fuel);
      b.setAttribute('aria-pressed',b.dataset.acFuel===fuel?'true':'false');
    });
    prices.P=keepNumber(byId('acEvPetrolPrice').value,1.70,.01,10);
    prices.D=keepNumber(byId('acEvDieselPrice').value,1.85,.01,10);
    mpg.P=keepNumber(byId('acEvPetrolMpg').value,45,1,200);
    mpg.D=keepNumber(byId('acEvDieselMpg').value,55,1,200);
    var n=keepNumber(byId('acEvOneCarMiles').value,0,0,150000);
    byId('acEvFuelName').textContent='⛽ '+(fuel==='P'?'Petrol':'Diesel');
    if(!latest || !latest.ev || !latest.standard || latest.miles<=0 || !Number.isFinite(latest.ev.car) || !Number.isFinite(latest.ev.home) || !Number.isFinite(latest.standard.home)) {
      ['acEvFuelCost','acEvChargeCost','acEvHouseCost','acEvFuelResult','acEvFuelYear'].forEach(function(k){ byId(k).textContent='£—'; });
      byId('acEvFuelResultLabel').textContent='Waiting for confirmed tariff data';
      return;
    }
    var fuelAnnual=n/mpg[fuel]*4.54609*prices[fuel];
    var evAnnual=latest.ev.car*n/latest.miles;
    var homeAnnual=latest.ev.home-latest.standard.home;
    var overall=fuelAnnual-evAnnual-homeAnnual;
    byId('acEvFuelCost').textContent=amount(fuelAnnual);
    byId('acEvChargeCost').textContent=amount(evAnnual);
    byId('acEvHouseCost').textContent=signed(homeAnnual,'month');
    byId('acEvFuelResultLabel').textContent=overall>=0?'Estimated overall saving / month':'Estimated extra cost / month';
    byId('acEvFuelResult').textContent=amount(overall);
    byId('acEvFuelYear').textContent=pounds(overall)+(overall>=0?' saved':' extra')+' per year';
    byId('acEvFuelExplain').textContent='One car: '+Math.round(n).toLocaleString('en-GB')+' miles/year. '+(fuel==='P'?'Petrol':'Diesel')+' at '+mpg[fuel]+' UK MPG and £'+prices[fuel].toFixed(2)+'/litre. EV charging is proportionate to the main tool’s selected EV scenario, including its efficiency and home-charging share. The household tariff change is counted once, not per car. Fuel and charging only, excluding purchase, servicing, tax and public charging. Prices are editable assumptions, not live pump prices.';
  }

  document.addEventListener('ac:ev-comparison', function(event) {
    latest=event.detail;
    if (!root) build();
    updateCards();
    if(isOpen) updateModal();
  });
  if (window.__AC_EV_TRADEOFF) latest=window.__AC_EV_TRADEOFF;
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',build);
  else build();
})();
