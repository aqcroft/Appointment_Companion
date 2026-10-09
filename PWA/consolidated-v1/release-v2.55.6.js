/* v2.55.6 release metadata: EV hero controls and settings-only journey selection. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.6',
    date: '9th Oct 2026',
    summary: 'Customer EV estimate first, optional fixed comparison and clear basket handover',
    changes: [
      'Customer shares focus on estimated home-and-EV electricity costs, with figures and assumptions behind a compact settings disclosure.',
      'The optional fixed comparison opens to a simple EV-variable vs Fixed Saver Economy 7 comparison; the full tariff table is a further optional disclosure.',
      'The customer basket CTA now opens a short explanation and a dynamic standard-variable vs EV monthly electricity estimate before visiting UW.',
      'Forecast wording references MoneySavingExpert and distinguishes the 21% Energy Price Cap forecast from actual UW rates.',
      'Temporary electricity VAT wording is shortened; the current-rate, percentage rise and lowest-estimate labels are clarified.',
      'Partner comparison remains expanded; calculations, tariff feeds, customer storage and personalised sharing links remain unchanged.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV2556 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV2473='1';
    fresh.dataset.acReleaseV2556='1';
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
