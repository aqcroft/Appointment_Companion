/* Unified v2.49.0 release metadata: EV comparison usability polish. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.49.0',
    date: '8th Oct 2026',
    summary: 'Easier EV comparisons, Economy 7 readings and personalised previews',
    changes: [
      'Simpler, customer-friendly wording for the EV estimator, usage sections, tariff choices and fixed/variable explanations.',
      'An optional Economy 7 day/night reading input for people considering an EV, avoiding a generic household usage guess.',
      'Existing-EV users on Economy 7 can use their measured day/night split without adding car use twice; EV rates estimate only the difference between five and seven cheap-rate hours.',
      'New illustrative variable price rise choices: Today, +5%, +15% and +25%.',
      'Bespoke shared welcome cards summarise the selected EV mode, usage figures, services and VAT.',
      'Colourful off-peak/peak house icons are visible and remain within mobile hero cards; old personalised links still open their original version.',
      'Both EV modes and Economy 7 selections are saved and can be restored from the new personalised links or linked customer shares.'
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
