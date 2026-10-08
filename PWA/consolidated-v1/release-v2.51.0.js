/* Unified v2.51.0 release metadata: EV comparison usability polish. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.51.0',
    date: '8th Oct 2026',
    summary: 'EV form ordering, quieter tariff header and dependable desktop sharing',
    changes: [
      'Reordered the prospective-EV journey: EV mode, selected-tariff hero, annual mileage, car type, then VAT controls before household usage and the comparison table.',
      'In the existing-EV journey, meter readings stay above the hero and the VAT control immediately below it, with mileage and vehicle type hidden.',
      'The hero period selector and petrol/diesel shortcut are centred vertically beside the service selector for a balanced layout.',
      'Moved fixed-tariff version and autumn/season freshness buttons into Electricity settings. Genuine stale-tariff warnings stay visible.',
      'Desktop sharing copies the personalised EV link without invoking a potentially hanging Windows native share sheet; if clipboard access stalls, a copyable-link dialog appears.',
      'Both personalised customer modes, Economy 7 readings, VAT choices, lower tariff table, and compact settings modal are retained.'

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
