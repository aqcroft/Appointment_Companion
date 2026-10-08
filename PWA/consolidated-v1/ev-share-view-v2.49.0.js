/* Read and render the whitelisted public EV snapshot using only its token. */
(function (global) {
  'use strict';
  var $ = function (id) { return document.getElementById(id); }, initial = null;
  function fire(el, type) { if (el) el.dispatchEvent(new Event(type || 'input', { bubbles: true })); }
  function set(id, value, type) { var el = $(id); if (!el || value == null) return; el.value = value; fire(el, type); }
  function click(selector) { var el = document.querySelector(selector); if (el) el.click(); }
  function firstName(value) { var raw = String(value || '').trim(); if (!raw) return ''; raw = raw.replace(/-/g, ' '); var first = raw.split(/\s+/)[0] || ''; return first ? first.charAt(0).toUpperCase() + first.slice(1) : ''; }
  function personaliseIntro(value) {
    var first = firstName(value) || 'there';
    if ($('splashName')) $('splashName').textContent = first;
    if ($('welcomeName')) $('welcomeName').textContent = first;
    var sub = document.querySelector('.personal-splash-sub');
    if (sub) sub.textContent = 'Take a look at your personalised EV comparison.';
    var live = document.querySelector('.personal-splash-live span:last-child');
    if (live) live.textContent = 'Tap OK to load the latest UW tariff rates.';
    if ($('personalSplashOk')) $('personalSplashOk').textContent = 'OK - show me';
  }
  function apply(snapshot) { var state = snapshot.ev_state || {}; if (state.vehicle_efficiency_mi_kwh != null) click('#vehiclePills .vpill[data-eff="' + state.vehicle_efficiency_mi_kwh + '"]'); set('miles', state.annual_mileage); if (state.uw_services != null) click('#serviceButtons button[data-tier="' + Math.max(0, Math.min(2, Number(state.uw_services) - 1)) + '"]'); set('region', state.region, 'change'); set('awayPct', state.away_pct); set('awayRate', state.away_rate_p_kwh); set('effOverride', state.efficiency_override_mi_kwh); set('knownEvKwh', state.known_ev_kwh); set('evTimingSlider', state.ev_offpeak_pct); set('e7TimingSlider', state.e7_offpeak_pct); if (state.dual_fuel != null && $('dualFuel')) { $('dualFuel').checked = !!state.dual_fuel; fire($('dualFuel'), 'change'); } if (state.e7_actual) { if ($('e7ActualWrap') && $('e7ActualWrap').hidden) click('#e7ActualToggle'); set('e7DayActualInput', state.e7_day_kwh, 'change'); set('e7NightActualInput', state.e7_night_kwh, 'change'); } if (state.stress_pct != null) click('#stressButtons button[data-stress="' + Number(state.stress_pct) + '"]'); if (state.period) click('#periodToggle button[data-period="' + state.period + '"]'); var usage = snapshot.electricityUsageTotalKwh != null ? snapshot.electricityUsageTotalKwh : state.home_usage_kwh; if (usage != null) { document.querySelectorAll('#usagePills button').forEach(function (button) { button.classList.toggle('on', button.dataset.use === 'custom'); }); if ($('customWrap')) $('customWrap').classList.add('show'); set('houseKwh', usage); } set('acMeterPeak', state.meter_peak_kwh); set('acMeterNight', state.meter_offpeak_kwh);
  if(state.meter_source==='e7')click('[data-ac-source="e7"]');
  set('acE7CurrentDay',state.consider_e7_day_kwh);
  set('acE7CurrentNight',state.consider_e7_night_kwh);
  if(state.consider_e7)click('#acE7ConsideringToggle');
  if(state.meter_mode === 'meter') click('[data-ac-mode="meter"]');
  if(Number(state.vat_percent)===0)document.dispatchEvent(new CustomEvent('ac:ev-vat-request',{detail:{percent:0}}));
  var stressButtons=document.querySelectorAll('#stressButtons button');if(stressButtons.length===4)[0,5,15,25].forEach(function(n,i){stressButtons[i].dataset.stress=String(n);stressButtons[i].textContent=n===0?'Today':'+'+n+'%';});
  if(state.stress_pct!=null)click('#stressButtons button[data-stress="'+Number(state.stress_pct)+'"]'); if ($('shareSetup')) $('shareSetup').hidden = true; if ($('customerWelcome')) $('customerWelcome').hidden = false; personaliseIntro(snapshot.customer_name || new URL(location.href).searchParams.get('for') || '');
  var already=state.meter_mode==='meter';
  var sub=document.querySelector('.personal-splash-sub');
  if(sub)sub.textContent=already?'Your day and night figures already include charging your EV.':'We have included a few starting estimates for your EV charging and household electricity.';
  var h=document.querySelector('.personal-splash-copy');if(h)h.textContent=already?'Your EV and home electricity comparison':'Your guide to charging an EV at home';
  var icon=document.querySelector('.personal-splash-icon');if(icon)icon.textContent=already?'🚙  🌙  🏠':'🚙  🔌  🏠';
  var old=document.getElementById('acSharedAssumptions');if(old)old.remove();
  var info=document.createElement('div');info.id='acSharedAssumptions';
  info.style.cssText='text-align:left;white-space:pre-line;padding:11px 12px;margin:9px 0;border-radius:11px;border:1px solid #c5dcd8;background:#f1faf7;color:#29534b;font:600 12px/1.5 system-ui';
  var daytime=Number(state.meter_peak_kwh)||0,overnight=Number(state.meter_offpeak_kwh)||0;
  var house=state.consider_e7?(Number(state.consider_e7_day_kwh)||0)+(Number(state.consider_e7_night_kwh)||0):Number(state.home_usage_kwh)||Number(snapshot.electricityUsageTotalKwh)||0;
  var figures=already?('Day: '+Math.round(daytime).toLocaleString('en-GB')+' kWh · Night: '+Math.round(overnight).toLocaleString('en-GB')+' kWh · Total: '+Math.round(daytime+overnight).toLocaleString('en-GB')+' kWh'):
     ('Annual miles: '+Math.round(Number(state.annual_mileage)||0).toLocaleString('en-GB')+' · Home electricity: '+Math.round(house).toLocaleString('en-GB')+' kWh/year');
  info.textContent=(already?'Already have an EV':'Thinking about getting an EV')+' · '+(already?(state.meter_source==='e7'?'Economy 7 readings':'EV tariff readings'):(state.consider_e7?'Already on Economy 7':'Estimated household use'))+'\n'+figures+'\nEnergy + '+Math.max(0,Number(state.uw_services||3)-1)+' extra services · '+(Number(state.vat_percent)===0?'0%':'5%')+' VAT view';
  if(sub)sub.insertAdjacentElement('afterend',info); var blocker = $('cloudShareBlocker'); if (blocker) blocker.remove(); }
  function fatal(message) { var blocker = $('cloudShareBlocker'); if (blocker) blocker.remove(); var overlay = document.createElement('div'); overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fffbe3;display:grid;place-items:center;padding:24px;font:650 15px/1.45 system-ui;color:#26164f;text-align:center'; overlay.textContent = message; document.body.appendChild(overlay); }
  async function boot() { var params = new URL(location.href).searchParams, token = params.get('s') || ''; personaliseIntro(params.get('for') || ''); if (!token) return fatal('This EV share link is missing its share code.'); try { var api = global.AppointmentCompanionSpecialistShare, result = await api.read('ev', token); initial = result.snapshot || {}; global.__AppointmentCompanionEvSharedSnapshot = initial; global.dispatchEvent(new CustomEvent('ac:ev-public-snapshot', { detail: initial })); var attempts = 0, timer = setInterval(function () { if ($('houseKwh') && typeof $('houseKwh').oninput === 'function') { clearInterval(timer); apply(initial); } else if (++attempts > 150) { clearInterval(timer); fatal('The EV Companion took too long to load.'); } }, 100); } catch (error) { fatal((error && error.message) || String(error)); } }
  boot();
})(window);
