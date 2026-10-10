/* v2.55.27 release metadata: consistent personalised EV summary and basket handover. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.27',
    date: '10th Oct 2026',
    summary: 'Consistent EV summary and basket bridge for both customer journeys',
    changes: [
      'Existing and prospective EV customers receive the same car-headed personalised summary and UW basket bridge.',
      'Qualifying services, variable EV rate and VAT appear in that order; the contact photograph appears only after the tool opens.',
      'VAT and Economy 7 explanations are clearer; EV calculations, prices and the real UW tick screenshot remain unchanged.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV25527 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV25527='1';
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
