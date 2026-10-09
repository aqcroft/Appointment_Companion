/* Unified v2.54.3 release metadata: EV shared-link reliability. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.54.3',
    date: '9th Oct 2026',
    summary: 'Personalised EV share links open reliably on mobile',
    changes: [
      'The shared EV welcome returns to a compact mobile card, with day, night and total kWh cards where actual readings are supplied.',
      'A short assumptions line explains vehicle efficiency, household overnight use and charging away from home where available.',
      'The cloud share welcome loads the saved settings before starting the EV calculator, so the button can be used without waiting for tariff scripts.',
      'Cloud share links now show a visible retry action rather than leaving an unresponsive button when saved settings or core scripts cannot be loaded.',
      'The EV hero service row aligns to the left, consistent with the rest of the hero.',
      'No tariff calculation, pricing, service entitlement or customer profile data was altered.'
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
