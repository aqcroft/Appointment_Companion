/* v2.55.5 release metadata: EV hero controls and settings-only journey selection. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.5',
    date: '9th Oct 2026',
    summary: 'Corrected existing-owner Economy 7 comparison, hidden petrol shortcut for EV owners, subtle tariff accents',
    changes: [
      'For existing EV owners, Economy 7 conversion only allows for 2 extra hours of off-peak household usage rather than inheriting the estimated-mode slider.',
      'The annual electricity total remains unchanged; a historic 70% E7 household setting can no longer inflate the night kWh on measured EV figures.',
      'The petrol and diesel comparison shortcut is hidden when the customer already owns an EV, while staying available in the considering-an-EV mode.',
      'Subtle colour accents tie the VAT card, detailed tariff breakdowns and night usage cards to the selected EV mode.',
      'The working three-card customer launcher, tariffs, sharing and customer records remain unchanged.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV2555 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV2473='1';
    fresh.dataset.acReleaseV2555='1';
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
