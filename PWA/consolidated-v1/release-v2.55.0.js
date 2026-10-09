/* Unified v2.55.0 release metadata: EV shared-link reliability. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.0',
    date: '9th Oct 2026',
    summary: 'Annual EV usage source saved and explained in shared comparisons',
    changes: [
      'For customers who already own an EV, the source selector offers Estimated Annual Consumption (kWh) or Figures from agreed sources.',
      'The Partner-facing opening question asks whether the potential customer already owns an EV; the data-source choice remains independent of EV versus Economy 7 tariff comparison and does not affect the cost maths.',
      'Personalised welcome cards keep the day/night/total usage split, describe annual usage sources precisely, remove redundant explanation and show two concise notes.',
      'The welcome uses a simple car icon and a clear Estimated costs based on UW basket heading.',
      'Source metadata persists in linked customer EV state, portable links and Cloud share snapshots.',
      'Existing personalised links without a source selection default to Estimated Annual Consumption; older alternative source values are mapped to agreed sources.'
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
