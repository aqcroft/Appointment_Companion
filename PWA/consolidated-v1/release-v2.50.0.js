/* Unified v2.50.0 release metadata: EV comparison usability polish. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.50.0',
    date: '8th Oct 2026',
    summary: 'Compact EV layout, settings modal and tariff retry improvements',
    changes: [
      'Removed the duplicate above-the-calculator Share panel. The toolbar Share button still opens personalised sharing and requests a name when needed.',
      'Shortened the existing-EV setup panel to mode, tariff source and day/night figures, putting the three large cost cards higher up the screen.',
      'Introduced a single settings modal with overnight household assumptions, usage timing and the more technical settings. Open with the cog beside the mode selector.',
      'Shortened the petrol/diesel comparison small print whilst retaining editable prices, economy and mileage.',
      'If tariff data arrives before all of the display has settled, the app retries rendering up to three times and clears a previous render warning once the full comparison works.',
      'Kept calculations, VAT scenarios, both customer share formats, Economy 7 measured inputs and the existing branch-only preview.'
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
