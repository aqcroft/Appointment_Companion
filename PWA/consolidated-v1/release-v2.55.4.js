/* v2.55.4 release metadata: EV hero controls and settings-only journey selection. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.4',
    date: '9th Oct 2026',
    summary: 'Cleaner EV hero: smaller petrol shortcut, compact service/time row, settings-only mode selection',
    changes: [
      'Moved the petrol/diesel comparison icon to the top-right of the EV hero and reduced its size.',
      'Energy only, +1 and +2 now share a compact row with the Monthly/Yearly control, with tariff details below.',
      'The EV situation chooser is accessible through Settings, not embedded in the main calculator; annual usage inputs remain visible for existing owners.',
      'Preserved the red/blue Partner modes, matching purple customer views and the portable share fallback.',
      'No tariff figures, calculation formulas, customer storage or Cloud data were changed.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV2554 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV2473='1';
    fresh.dataset.acReleaseV2554='1';
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
