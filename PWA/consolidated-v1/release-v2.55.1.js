/* Unified v2.55.0 release metadata: EV shared-link reliability. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.1',
    date: '9th Oct 2026',
    summary: 'Shared EV launcher responsiveness, aligned cards and safer customer switching',
    changes: [
      'Removed the unbounded EV hero MutationObserver during shared opening, replacing it with bounded readiness checks so the launcher cannot lock the browser.',
      'Aligned the EV charging, home and overall comparison cards to the left, matching the main hero cards.',
      'Standardised tariff-table headings and breakdown labels: Energy only, Energy + 1 service, and Energy + 2 services.',
      'New customer closes the open menu and checks the current form for changes before offering Save and close, Switch without saving again, or Stay here.',
      'Customer storage schema, EV calculation formulas and tariff data were not changed.'
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
