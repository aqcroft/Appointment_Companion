/* v2.55.25 release metadata: guided electricity region selection for specialist calculators. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.25',
    date: '9th Oct 2026',
    summary: 'EV day/night usage now flows from the customer profile',
    changes: [
      'The EV Companion inherits peak and off-peak annual usage from the saved customer profile.',
      'For existing EV owners, the actual metered day/night fields populate instead of showing example placeholders.',
      'Deliberate adjustments within the EV comparison remain separate from the main customer profile.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV25525 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV25525='1';
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
