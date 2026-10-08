/* Unified v2.52.0 release metadata: EV comparison usability polish. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.52.0',
    date: '8th Oct 2026',
    summary: 'Universal EV cost breakdown and main-PWA release readiness',
    changes: [
      'One universal hero in both EV modes: car charging and overnight household electricity; daytime household electricity including standing charge; combined total.',
      'Car-only charging remains independently calculated for the petrol/diesel comparison and the net-savings explanation.',
      'When estimating 2,000 kWh of EV charging with 300 kWh overnight household use, the hero correctly shows 2,300 kWh overnight, not just 2,000 kWh.',
      'The green cost hero sits above the EV situation selector and inputs, so customers see an immediate estimate and can personalise it underneath.',
      'Identical colourful night, day, and total house/car icons for both EV modes, with the house quarter split as a visual cue only.',
      'Full EV and Economy 7 tariff table, service-tier comparison, VAT switching and personal customer sharing retained.',
      'Retains the v2.51 desktop sharing fallback and v2.50 transient tariff render retry.'

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
