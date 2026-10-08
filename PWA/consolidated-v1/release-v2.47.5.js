/* Unified v2.47.5 release metadata: EV comparison usability polish. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.47.5',
    date: '8th Oct 2026',
    summary: 'EV tariff comparison card and service selector layout polish',
    changes: [
      'Lighter secondary EV trade-off cards are more distinct from the three main cost cards.',
      'The car saving card now explains its comparison directly: vs. standard Value, Gold or Double Gold, matching the chosen service tier.',
      'The EV tariff name and variable tariff note now appear immediately below the 1/2/3 service choices.',
      'Removed the duplicated standalone comparison caption below the cards.',
      'Retains the petrol/diesel modal, linked mileage slider, and 5p/5 MPG adjustment buttons.'

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
