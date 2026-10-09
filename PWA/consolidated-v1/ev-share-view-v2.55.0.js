/* v2.55.0: read the whitelisted public EV snapshot with unchanged customer mode. */
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
    if (live) live.textContent = 'Latest UW tariff rates are checked as the tool opens.';
    if ($('personalSplashOk')) { $('personalSplashOk').disabled = true; $('personalSplashOk').textContent = 'Preparing your comparison…'; }
    var icon = document.querySelector('.personal-splash-icon'); if (icon) icon.textContent='⚡';
    var heading = document.querySelector('.personal-splash-copy'); if (heading) heading.textContent='Your personalised UW EV electricity comparison';
  }
  function apply(snapshot) { var state = snapshot.ev_state || {}; if (state.vehicle_efficiency_mi_kwh != null) click('#vehiclePills .vpill[data-eff="' + state.vehicle_efficiency_mi_kwh + '"]'); set('miles', state.annual_mileage); if (state.uw_services != null) click('#serviceButtons button[data-tier="' + Math.max(0, Math.min(2, Number(state.uw_services) - 1)) + '"]'); set('region', state.region, 'change'); set('awayPct', state.away_pct); set('awayRate', state.away_rate_p_kwh); set('effOverride', state.efficiency_override_mi_kwh); set('knownEvKwh', state.known_ev_kwh); set('evTimingSlider', state.ev_offpeak_pct); set('e7TimingSlider', state.e7_offpeak_pct); if (state.dual_fuel != null && $('dualFuel')) { $('dualFuel').checked = !!state.dual_fuel; fire($('dualFuel'), 'change'); } if (state.e7_actual) { if ($('e7ActualWrap') && $('e7ActualWrap').hidden) click('#e7ActualToggle'); set('e7DayActualInput', state.e7_day_kwh, 'change'); set('e7NightActualInput', state.e7_night_kwh, 'change'); } if (state.stress_pct != null) click('#stressButtons button[data-stress="' + Number(state.stress_pct) + '"]'); if (state.period) click('#periodToggle button[data-period="' + state.period + '"]'); var usage = snapshot.electricityUsageTotalKwh != null ? snapshot.electricityUsageTotalKwh : state.home_usage_kwh; if (usage != null) { document.querySelectorAll('#usagePills button').forEach(function (button) { button.classList.toggle('on', button.dataset.use === 'custom'); }); if ($('customWrap')) $('customWrap').classList.add('show'); set('houseKwh', usage); } set('acMeterPeak', state.meter_peak_kwh); set('acMeterNight', state.meter_offpeak_kwh);
  if(state.meter_source==='e7')click('[data-ac-source="e7"]');
  set('acE7CurrentDay',state.consider_e7_day_kwh);
  set('acE7CurrentNight',state.consider_e7_night_kwh);
  if(state.consider_e7)click('#acE7ConsideringToggle');
  if(state.meter_mode === 'meter') click('[data-ac-mode="meter"]');
  if(global.AppointmentCompanionEvUsageOrigin)global.AppointmentCompanionEvUsageOrigin.set(state.usage_origin);
  if(Number(state.vat_percent)===0)document.dispatchEvent(new CustomEvent('ac:ev-vat-request',{detail:{percent:0}}));
  var stressButtons=document.querySelectorAll('#stressButtons button');if(stressButtons.length===5)[0,5,15,21,25].forEach(function(n,i){stressButtons[i].dataset.stress=String(n);stressButtons[i].textContent=n===0?'Today':'+'+n+'%';});
  if(state.stress_pct!=null)click('#stressButtons button[data-stress="'+Number(state.stress_pct)+'"]'); if ($('shareSetup')) $('shareSetup').hidden = true; if ($('customerWelcome')) $('customerWelcome').hidden = false; personaliseIntro(snapshot.customer_name || new URL(location.href).searchParams.get('for') || '');
  var welcome=global.AppointmentCompanionEvSharedIntro;
  if(welcome){
    var meter=state.meter_mode==='meter';
    var home=state.consider_e7?(Number(state.consider_e7_day_kwh)||0)+(Number(state.consider_e7_night_kwh)||0):
       (state.home_usage_kwh!=null?state.home_usage_kwh:snapshot.electricityUsageTotalKwh);
    welcome.render({
      name:snapshot.customer_name||new URL(location.href).searchParams.get('for')||'',
      meter:meter,source:state.meter_source||'ev',
      day:state.meter_peak_kwh,night:state.meter_offpeak_kwh,
      miles:state.annual_mileage,home:home,
      tier:state.uw_services==null?2:Number(state.uw_services)-1,
      vat:state.vat_percent,
      efficiency:state.efficiency_override_mi_kwh||state.vehicle_efficiency_mi_kwh,
      homeNightPct:state.ev_offpeak_pct,awayPct:state.away_pct,knownEvKwh:state.known_ev_kwh,
      usageOrigin:state.usage_origin||'bill_estimate'
    });
  }
  var blocker = $('cloudShareBlocker'); if (blocker) blocker.remove(); }
  function fatal(message) { var blocker = $('cloudShareBlocker'); if (blocker) blocker.remove(); var overlay = document.createElement('div'); overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#fffbe3;display:grid;place-items:center;padding:24px;font:650 15px/1.45 system-ui;color:#26164f;text-align:center'; overlay.textContent = message; document.body.appendChild(overlay); }

  function showRetry(message) {
    var button=$('personalSplashOk');
    var live=document.querySelector('.personal-splash-live span:last-child');
    if(live){live.textContent=message;var row=live.closest('.personal-splash-live');if(row)row.classList.add('error');}
    if(button){
      button.disabled=false;
      button.textContent='Retry loading my comparison';
      button.onclick=function(){ global.location.reload(); };
    }
    var blocker=$('cloudShareBlocker');if(blocker)blocker.remove();
  }
  function summary(snapshot) {
    var state=snapshot.ev_state||{};
    var meter=state.meter_mode==='meter';
    var home=state.consider_e7?(Number(state.consider_e7_day_kwh)||0)+(Number(state.consider_e7_night_kwh)||0):
      (state.home_usage_kwh!=null?state.home_usage_kwh:snapshot.electricityUsageTotalKwh);
    var intro=global.AppointmentCompanionEvSharedIntro;
    if(intro)intro.render({
      name:snapshot.customer_name||new URL(location.href).searchParams.get('for')||'',
      meter:meter,source:state.meter_source||'ev',
      day:state.meter_peak_kwh,night:state.meter_offpeak_kwh,
      miles:state.annual_mileage,home:home,
      tier:state.uw_services==null?2:Number(state.uw_services)-1,
      vat:state.vat_percent,
      efficiency:state.efficiency_override_mi_kwh||state.vehicle_efficiency_mi_kwh,
      homeNightPct:state.ev_offpeak_pct,awayPct:state.away_pct,knownEvKwh:state.known_ev_kwh,
      usageOrigin:state.usage_origin||'bill_estimate'
    });
  }
  async function boot() {
    var params=new URL(global.location.href).searchParams;
    var token=params.get('s')||'';
    personaliseIntro(params.get('for')||'');
    if(!token){showRetry('This personalised link is missing its share code. Please ask for a new link.');return;}
    try {
      var api=global.AppointmentCompanionSpecialistShare;
      if(!api||typeof api.read!=='function')throw Error('The sharing service is unavailable.');
      var result=await Promise.race([
        api.read('ev',token),
        new Promise(function(_,reject){setTimeout(function(){reject(Error('The saved details took too long to load.'));},15000);})
      ]);
      initial=result&&result.snapshot||null;
      if(!initial||!initial.ev_state)throw Error('This link has no saved EV settings.');
      global.__AppointmentCompanionEvSharedSnapshot=initial;
      global.dispatchEvent(new CustomEvent('ac:ev-public-snapshot',{detail:initial}));
      summary(initial); // A complete welcome card, independently of the EV engine.
      var blocker=$('cloudShareBlocker');if(blocker)blocker.remove();
      var button=$('personalSplashOk');
      if(!button)throw Error('The welcome screen is incomplete.');
      button.disabled=false;
      button.textContent='Explore my UW EV options';
      button.onclick=function(){
        if(button.disabled)return;
        button.disabled=true;
        button.textContent='Opening your comparison…';
        var screen=$('personalSplash');
        if(screen){screen.classList.add('fade');setTimeout(function(){screen.style.display='none';},320);}
        if(global.AppointmentCompanionEvSharedIntro)global.AppointmentCompanionEvSharedIntro.beginLoad();
        var finished=false;
        var timer=setTimeout(function(){fail('The calculator is taking too long to open.');},19000);
        function cleanup(){
          clearTimeout(timer);
          document.removeEventListener('ac:ev-core-ready',ready);
          document.removeEventListener('ac:ev-core-error',errored);
        }
        function fail(message){
          if(finished)return;finished=true;cleanup();
          if(screen){screen.style.display='flex';screen.classList.remove('fade');}
          showRetry(message+' Please try again.');
        }
        function errored(event){fail(event&&event.detail&&event.detail.message||'The calculator could not be loaded.');}
        function ready(){
          if(finished)return;
          try {
            apply(initial); // Restore personalised figures only once controls exist.
            finished=true;cleanup();
            if(screen)screen.style.display='none';
            var blocker=$('cloudShareBlocker');if(blocker)blocker.remove();
          }catch(error){fail('Your saved settings could not be applied.');}
        }
        document.addEventListener('ac:ev-core-ready',ready);
        document.addEventListener('ac:ev-core-error',errored);
        if(typeof global.AppointmentCompanionEvStart!=='function'){fail('The calculator could not start.');return;}
        global.AppointmentCompanionEvStart(null);
      };
    }catch(error){
      showRetry(((error&&error.message)||'Unable to retrieve your saved settings.')+' Please retry or ask for a new link.');
    }
  }
  boot();
})(window);
