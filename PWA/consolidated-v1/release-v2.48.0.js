/* Unified v2.48.0 release metadata: EV comparison usability polish. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.48.0',
    date: '8th Oct 2026',
    summary: 'Two EV scenarios and temporary electricity VAT relief',
    changes: [
      'Choose Considering an EV to estimate additional charging or Already have an EV to enter peak and off-peak meter readings including car charging.',
      'Existing EV mode never adds estimated car kWh: metered peak plus off-peak always equals the complete annual consumption across tariffs.',
      'Economy 7 shifts only the estimated additional household use using default 10% EV and 15% Economy 7 household overnight assumptions, with optional adjustments.',
      'Existing EV comparison cards show EV versus standard, EV versus Economy 7 and lowest current variable tariff without claiming to split house/car metered usage.',
      'Continue showing conservative 5%-VAT-inclusive electricity costs, with the estimated 0% VAT saving per month and for the October–March six-month relief shown separately.',
      'Save and restore the new mode and readings when returning to linked customer profiles, and include them in supported shared EV summaries.'

    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV2473 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV2473='1';
    fresh.textContent=meta.version;
    fresh.title='About this version';
    fresh.setAttribute('aria-label','About Appointment Companion '+meta.version);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var previous=document.getElementById('acVersionAbout');
      if(previous)previous.remove();
      var modal=document.createElement('div');
      modal.id='acVersionAbout';
      modal.className='ac-about open';
      modal.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+meta.version+'</h3><div style="font-size:11px;color:#6b6b76">'+meta.date+' · '+meta.summary+'</div><ul><li>'+meta.changes.join('</li><li>')+'</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ac-about-close'))modal.remove();});
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries=0,timer=setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
