/* Appointment Companion v2.48.0 | EV tariff trade-off and single-car fuel comparison.
   Read-only display enhancement: uses the existing v13 EV/variable cost engine.
   Fuel comparison is illustrative and is never written to a customer profile. */
(function () {
  'use strict';
  var latest = null;
  var fuel = 'P';
  var prices = {P:1.70, D:1.85};
  var mpg = {P:45, D:55};
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
      '.ac-ev-tile{min-width:0;padding:8px 5px 7px;border-radius:11px;background:rgba(255,255,255,.37);border:1px solid rgba(255,255,255,.38);text-align:center}',
      '.ac-ev-tile:last-child{background:rgba(255,255,255,.42);border-color:rgba(255,255,255,.43)}',
      '.ac-ev-tile-label{font-size:9px;font-weight:800;line-height:1.25;opacity:.94}',
      '.ac-ev-tile-value{font-size:19px;font-weight:900;line-height:1.2;margin:4px 0 2px;letter-spacing:-.5px;white-space:nowrap}',
      '.ac-ev-tile-note{font-size:8px;line-height:1.2;opacity:.88}.ac-ev-tile[data-meter-label] .ac-ev-tile-value{font-size:15px}.ac-ev-vat-note{font-size:10px;line-height:1.4;margin:9px 1px 0;padding:7px 9px;border:1px solid rgba(255,255,255,.30);background:rgba(255,255,255,.12);border-radius:9px}.ac-ev-vat-note strong{font-weight:900}.ac-ev-vat-note small{font-size:9px;opacity:.86;display:block;margin-top:3px}',
      '.ac-ev-service-stack{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:5px}.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-service-row{flex:0 0 auto;max-width:100%}.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-tariff{margin:0!important;padding:0!important;border:0!important;font-size:9px!important;line-height:1.3;font-weight:650;max-width:100%;text-align:left}.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-tariff strong{font-weight:800}.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-tariff span{font-size:8px}.hero[data-v16c-layout="1"] .hero-footer-v16c{align-items:flex-start!important}@media(max-width:390px){.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-tariff{font-size:8px!important}.hero[data-v16c-layout="1"] .ac-ev-service-stack .hero-tariff span{font-size:7.5px}}',
      '.ac-ev-fuel-button{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:32px;min-width:32px;height:34px;min-height:34px;padding:0;font-size:20px;line-height:1;border:1px solid rgba(255,255,255,.42);border-radius:10px;background:rgba(255,255,255,.18);color:#fff;cursor:pointer}.hero[data-v16c-layout="1"] .hero-footer-v16c{gap:5px!important}.hero[data-v16c-layout="1"] .hero-service-row{min-width:0;gap:4px!important}@media(max-width:375px){.ac-ev-fuel-button{width:28px;min-width:28px;height:32px}.hero[data-v16c-layout="1"] .hero-footer-v16c{gap:3px!important}}',
      '.ac-ev-fuel-button[hidden]{display:none!important}.ac-ev-fuel-button:focus-visible,.ac-ev-fuel-modal button:focus-visible{outline:3px solid #edbf49;outline-offset:2px}',
      '.ac-ev-fuel-modal{position:fixed;inset:0;z-index:15000;display:none;align-items:center;justify-content:center;padding:12px;background:rgba(21,24,42,.67)}',
      '.ac-ev-fuel-modal.open{display:flex}',
      '.ac-ev-fuel-dialog{background:#fff;border-radius:18px;padding:17px;width:100%;max-width:440px;max-height:calc(100dvh - 24px);overflow:auto;box-sizing:border-box;color:#23202f;box-shadow:0 16px 55px rgba(0,0,0,.32)}',
      '.ac-ev-fuel-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}',
      '.ac-ev-fuel-top h2{font-size:18px;margin:0;line-height:1.3}',
      '.ac-ev-close{background:#f4f5f6;border:0;border-radius:9px;font-size:19px;width:34px;height:34px;cursor:pointer}',
      '.ac-ev-fuel-picks{display:flex;gap:7px;margin:12px 0}',
      '.ac-ev-fuel-picks button{flex:1;border:1px solid #cad4d3;border-radius:10px;background:white;color:#333;padding:9px;font-size:14px;font-weight:850;cursor:pointer}',
      '.ac-ev-fuel-picks button.on{background:#008c80;color:white;border-color:#008c80}',
      '.ac-ev-fuel-mile-row{margin:9px 0 13px}.ac-ev-fuel-mile-row label{font-size:12px;font-weight:800}.ac-ev-miles-value{float:right;color:#008679;font-size:16px;font-weight:900}.ac-ev-fuel-mile-row input[type="range"]{display:block;width:100%;margin:15px 0 5px;accent-color:#008679;cursor:pointer}.ac-ev-mile-ends{display:flex;justify-content:space-between;font-size:10px;color:#777}.ac-ev-mile-hint{margin:6px 0 0;font-size:10px;color:#606c6d}',
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
      '.ac-ev-settings label{font-size:11px;font-weight:750}.ac-ev-stepper{display:flex;align-items:center;gap:3px;margin-top:5px}.ac-ev-stepper button{flex:0 0 29px;height:35px;display:grid;place-items:center;font-size:19px;font-weight:800;border:1px solid #c5dbd6;border-radius:8px;background:#edf9f6;color:#006e63;cursor:pointer}.ac-ev-stepper input{min-width:0;width:100%;margin:0;border:1px solid #ccd5d7;border-radius:8px;padding:7px 3px;font:700 13px system-ui;text-align:center;box-sizing:border-box}.ac-ev-stepper input::-webkit-inner-spin-button,.ac-ev-stepper input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}',
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
        '<div class="ac-ev-tile"><div class="ac-ev-tile-label">🚙 EV saving</div><div class="ac-ev-tile-value" id="acEvCarDelta">£—</div><div class="ac-ev-tile-note" id="acEvCarNote">vs. standard</div></div>' +
        '<div class="ac-ev-tile"><div class="ac-ev-tile-label">🏠 Home on-cost</div><div class="ac-ev-tile-value" id="acEvHomeDelta">£—</div><div class="ac-ev-tile-note" id="acEvHomeNote">versus standard</div></div>' +
        '<div class="ac-ev-tile"><div class="ac-ev-tile-label">💷 Net benefit</div><div class="ac-ev-tile-value" id="acEvNetDelta">£—</div><div class="ac-ev-tile-note" id="acEvNetNote">per month</div></div>' +
      '</div><div class="ac-ev-vat-note" id="acEvVatNote" aria-live="polite">5% VAT-inclusive benchmark · awaiting tariff rates</div>';
    grid.insertAdjacentElement('afterend', root);
    var header = vehicle.closest('.card').querySelector('.label');
    if (header) header.style.display='none'; // Vehicle choices already describe the section.
    {
      var button = document.createElement('button');
      button.type='button';
      button.className='ac-ev-fuel-button';
      button.textContent='⛽';
      button.title='Compare petrol or diesel with electric charging';
      button.setAttribute('aria-label','Compare petrol or diesel fuel cost');
      button.onclick = openModal;
      // The consolidated hero footer is assembled asynchronously by v16c-table.
      // Wait for it, then place the button between the service selector and period toggle.
      function position() {
        var footer=document.querySelector('.hero-footer-v16c');
        var period=byId('periodToggle');
        if(!footer || !period || !footer.contains(period))return false;
        var services=footer.querySelector('.hero-service-row');
        var tariff=footer.parentNode.querySelector('.hero-tariff');
        if(services && tariff) {
          var stack=footer.querySelector('.ac-ev-service-stack');
          if(!stack) {
            stack=document.createElement('div');
            stack.className='ac-ev-service-stack';
            footer.insertBefore(stack,services);
          }
          if(services.parentNode!==stack) stack.appendChild(services);
          if(tariff.parentNode!==stack) stack.appendChild(tariff);
        }
        if(button.parentNode!==footer) footer.insertBefore(button,period);
        return true;
      }
      if(!position()) {
        var observer=new MutationObserver(function(){if(position())observer.disconnect();});
        observer.observe(document.querySelector('.hero'),{childList:true,subtree:true});
      }
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
        '<div class="ac-ev-fuel-picks" aria-label="Fuel type"><button type="button" data-ac-fuel="P" class="on" aria-label="Petrol">Petrol</button><button type="button" data-ac-fuel="D" aria-label="Diesel">Diesel</button></div>' +
        '<div class="ac-ev-fuel-mile-row"><label for="acEvOneCarMiles">Annual mileage</label><output class="ac-ev-miles-value" id="acEvMilesLabel" for="acEvOneCarMiles">10,000 miles</output><input id="acEvOneCarMiles" type="range" min="1000" max="30000" step="500" value="10000"><div class="ac-ev-mile-ends"><span>1,000</span><span>30,000</span></div><div class="ac-ev-mile-hint">Linked to the main EV mileage slider - changing either updates both.</div></div>' +
        '<div class="ac-ev-fuel-grid">' +
          '<div class="ac-ev-fuel-stat"><div class="ac-label" id="acEvFuelName">⛽ Petrol</div><div class="ac-value" id="acEvFuelCost">£—</div></div>' +
          '<div class="ac-ev-fuel-stat"><div class="ac-label">⚡ EV charging</div><div class="ac-value" id="acEvChargeCost">£—</div></div>' +
          '<div class="ac-ev-fuel-stat"><div class="ac-label">🏠 Home on-cost</div><div class="ac-value" id="acEvHouseCost">£—</div></div>' +
        '</div>' +
        '<div class="ac-ev-fuel-result"><div class="ac-result-label" id="acEvFuelResultLabel">Estimated overall fuel saving</div><strong id="acEvFuelResult">£—</strong><small id="acEvFuelYear">£— per year</small></div>' +
        '<details class="ac-ev-settings" id="acEvFuelAssumptions"><summary>⚙️ Customise fuel assumptions</summary><div class="ac-ev-settings-grid">' +
          '<label for="acEvPetrolPrice">Petrol £/litre<span class="ac-ev-stepper"><button type="button" data-ac-step="acEvPetrolPrice:-1" aria-label="Decrease petrol price by 5p">−</button><input id="acEvPetrolPrice" type="number" inputmode="decimal" min="0.01" max="10" step="0.05" value="1.70"><button type="button" data-ac-step="acEvPetrolPrice:1" aria-label="Increase petrol price by 5p">+</button></span></label>' +
          '<label for="acEvDieselPrice">Diesel £/litre<span class="ac-ev-stepper"><button type="button" data-ac-step="acEvDieselPrice:-1" aria-label="Decrease diesel price by 5p">−</button><input id="acEvDieselPrice" type="number" inputmode="decimal" min="0.01" max="10" step="0.05" value="1.85"><button type="button" data-ac-step="acEvDieselPrice:1" aria-label="Increase diesel price by 5p">+</button></span></label>' +
          '<label for="acEvPetrolMpg">Petrol UK MPG<span class="ac-ev-stepper"><button type="button" data-ac-step="acEvPetrolMpg:-1" aria-label="Decrease petrol MPG by 5">−</button><input id="acEvPetrolMpg" type="number" inputmode="decimal" min="1" max="200" step="5" value="45"><button type="button" data-ac-step="acEvPetrolMpg:1" aria-label="Increase petrol MPG by 5">+</button></span></label>' +
          '<label for="acEvDieselMpg">Diesel UK MPG<span class="ac-ev-stepper"><button type="button" data-ac-step="acEvDieselMpg:-1" aria-label="Decrease diesel MPG by 5">−</button><input id="acEvDieselMpg" type="number" inputmode="decimal" min="1" max="200" step="5" value="55"><button type="button" data-ac-step="acEvDieselMpg:1" aria-label="Increase diesel MPG by 5">+</button></span></label>' +
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
    byId('acEvOneCarMiles').addEventListener('input', function(){
      var source=byId('miles');
      if(!source)return;
      source.value=this.value;
      source.dispatchEvent(new Event('input',{bubbles:true}));
    });
    modal.querySelectorAll('[data-ac-step]').forEach(function(button){
      button.onclick=function(){
        var a=this.dataset.acStep.split(':'), field=byId(a[0]);
        var isPrice=a[0].indexOf('Price')>=0, increment=isPrice?0.05:5;
        var min=Number(field.min), max=Number(field.max);
        var current=keepNumber(field.value,Number(field.defaultValue),min,max);
        var next=Math.max(min,Math.min(max,Math.round((current+Number(a[1])*increment)*100)/100));
        field.value=isPrice?next.toFixed(2):String(next);
        field.dispatchEvent(new Event('input',{bubbles:true}));
      };
    });
    ['acEvPetrolPrice','acEvDieselPrice','acEvPetrolMpg','acEvDieselMpg'].forEach(function(id) {
      byId(id).addEventListener('input', updateModal);
    });
  }

  function openModal() {
    if (!modal || !latest || latest.meter) return;
    byId('acEvOneCarMiles').value=Math.round(latest.miles);
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
    if(!root||!latest)return;
    var e=latest.ev,s=latest.standard,e7=latest.economy7,period=latest.period||'month',divisor=period==='year'?1:12;
    var available=e&&s&&Number.isFinite(e.total)&&Number.isFinite(s.total);
    var ids=['acEvCarDelta','acEvHomeDelta','acEvNetDelta'];
    var boxes=root.querySelectorAll('.ac-ev-tile'),labels=root.querySelectorAll('.ac-ev-tile-label');
    var fuelShortcut=document.querySelector('.ac-ev-fuel-button');
    if(fuelShortcut)fuelShortcut.hidden=!!latest.meter;
    if(!available){
      ids.forEach(function(id){byId(id).textContent='£—'});
      byId('acEvVatNote').textContent=latest.meter?'Enter valid annual peak and off-peak readings. No extra EV electricity is added.':'Awaiting tariff data · 5% VAT benchmark';
      return;
    }
    if(latest.meter){
      labels[0].textContent='⚡ EV vs standard';
      labels[1].textContent='🌙 EV vs Economy 7';
      labels[2].textContent='🏆 Best variable';
      boxes[2].setAttribute('data-meter-label','yes');
      byId('acEvCarDelta').textContent=pounds((s.total-e.total)/divisor);
      byId('acEvCarNote').textContent=e.total<=s.total?'EV cheaper':'EV dearer';
      if(e7&&Number.isFinite(e7.total)){
        byId('acEvHomeDelta').textContent=pounds((e7.total-e.total)/divisor);
        byId('acEvHomeNote').textContent=e.total<=e7.total?'EV cheaper':'EV dearer';
      }else{
        byId('acEvHomeDelta').textContent='£—';
        byId('acEvHomeNote').textContent='E7 rates unavailable';
      }
      var candidates=[{name:'UW EV',cost:e.total},{name:'Standard',cost:s.total}];
      if(e7&&Number.isFinite(e7.total))candidates.push({name:'Economy 7',cost:e7.total});
      candidates.sort(function(a,b){return a.cost-b.cost});
      byId('acEvNetDelta').textContent=candidates[0].name;
      byId('acEvNetNote').textContent='current variable rates';
    }else{
      labels[0].textContent='🚙 EV saving';
      labels[1].textContent='🏠 Home on-cost';
      labels[2].textContent='💷 Net benefit';
      boxes[2].removeAttribute('data-meter-label');
      byId('acEvCarDelta').textContent=signed(e.car-s.car,period);
      byId('acEvCarNote').textContent='vs. standard '+latest.standardName;
      byId('acEvHomeDelta').textContent=signed(e.home-s.home,period);
      byId('acEvHomeNote').textContent=(e.home>=s.home?'extra cost':'lower cost')+' at home';
      var saving=(s.total-e.total)/divisor;
      byId('acEvNetDelta').textContent=pounds(saving);
      byId('acEvNetNote').textContent=(saving>=0?'saved':'extra')+(period==='year'?' per year':' per month');
    }
    // All tariff results above are the conservative 5%-VAT-inclusive benchmark.
    // The ex-VAT equivalent is the annual inclusive cost / 1.05.
    var annualVatDifference=e.total/21;
    var monthSaving=annualVatDifference/12,sixMonthSaving=annualVatDifference/2;
    var withoutVatMonth=e.total/12-monthSaving;
    var vatText=period==='year'
      ? '⚡ 0% electricity VAT: '+pounds(annualVatDifference)+' annual equivalent if 0% applied all year · estimated '+pounds(sixMonthSaving)+' during the six-month relief'
      : '⚡ 0% electricity VAT (Oct–Mar): '+pounds(monthSaving)+'/month less · ~'+pounds(sixMonthSaving)+' over six months';
    byId('acEvVatNote').innerHTML='<strong>'+vatText+'</strong><small>Headline includes 5% VAT. During relief, equivalent monthly cost ~'+pounds(withoutVatMonth)+'. Assumes even usage; 5% is currently due back from April 2027.</small>';
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
    var n=latest?latest.miles:10000;
    byId('acEvOneCarMiles').value=n;
    byId('acEvMilesLabel').textContent=Math.round(n).toLocaleString('en-GB')+' miles';
    byId('acEvFuelName').textContent='⛽ '+(fuel==='P'?'Petrol':'Diesel');
    if(!latest || !latest.ev || !latest.standard || latest.miles<=0 || !Number.isFinite(latest.ev.car) || !Number.isFinite(latest.ev.home) || !Number.isFinite(latest.standard.home)) {
      ['acEvFuelCost','acEvChargeCost','acEvHouseCost','acEvFuelResult','acEvFuelYear'].forEach(function(k){ byId(k).textContent='£—'; });
      byId('acEvFuelResultLabel').textContent='Waiting for confirmed tariff data';
      return;
    }
    var fuelAnnual=n/mpg[fuel]*4.54609*prices[fuel];
    var evAnnual=latest.ev.car;
    var homeAnnual=latest.ev.home-latest.standard.home;
    var overall=fuelAnnual-evAnnual-homeAnnual;
    byId('acEvFuelCost').textContent=amount(fuelAnnual);
    byId('acEvChargeCost').textContent=amount(evAnnual);
    byId('acEvHouseCost').textContent=signed(homeAnnual,'month');
    byId('acEvFuelResultLabel').textContent=overall>=0?'Estimated overall saving / month':'Estimated extra cost / month';
    byId('acEvFuelResult').textContent=amount(overall);
    byId('acEvFuelYear').textContent=pounds(overall)+(overall>=0?' saved':' extra')+' per year';
    byId('acEvFuelExplain').textContent='Comparing one car at '+Math.round(n).toLocaleString('en-GB')+' miles/year. '+(fuel==='P'?'Petrol':'Diesel')+' at '+mpg[fuel]+' UK MPG and £'+prices[fuel].toFixed(2)+'/litre. EV charging is proportionate to the main tool’s selected EV scenario, including its efficiency and home-charging share. Home on-cost assumes '+Math.round((latest.evHomePct==null?10:latest.evHomePct))+'% of household usage is overnight on EV, versus a single-rate standard variable tariff; standing charges are included. The household difference is counted once. Fuel and home charging only, excluding purchase, servicing, tax and public charging. Prices are editable assumptions, not live pump prices.';
  }

  document.addEventListener('ac:ev-comparison', function(event) {
    latest=event.detail;
    if (!root) build();
    if(latest.meter&&isOpen)closeModal();
    updateCards();
    if(isOpen) updateModal();
  });
  if (window.__AC_EV_TRADEOFF) latest=window.__AC_EV_TRADEOFF;
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',build);
  else build();
})();
