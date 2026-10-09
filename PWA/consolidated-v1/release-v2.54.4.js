/* Unified v2.54.4 release metadata: EV shared-link reliability. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.54.4',
    date: '9th Oct 2026',
    summary: 'EV shared welcome usability and immediate-open reliability',
    changes: [
      'The overnight, daytime and total consumption icons now sit on their own centred row above the labels and figures.',
      'UW basket and VAT explanations appear as concise bullet points beneath the selected service combination.',
      'The cloud-shared EV opening button dismisses the welcome immediately instead of waiting behind potentially slow tariff scripts.',
      'Both personalised share formats show visible loading status; failed or timed-out tariff loading offers a retry action.',
      'The personalised EV usage, tariffs, calculations and partner account data remain unchanged.'
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
