/* Unified v2.53.0 release metadata: EV comparison usability polish. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.53.0',
    date: '8th Oct 2026',
    summary: 'One-time EV choice and simpler personalised customer sharing',
    changes: [
      'New customers choose whether they already own an EV in a simple opening modal; the irrelevant calculator inputs and repeated mode toggle are hidden.',
      'For linked customer profiles, the EV situation is remembered with that profile. Correcting a mistaken choice remains available inside Settings.',
      'Shared customer links skip the choice and preserve the EV situation, meter readings, mileage, service selection and other assumptions.',
      'The customer Share card gives one clear UW basket action and a brief explanation that initial basket electricity rates differ from the estimated EV tariff costs.',
      'The customer may register EV interest at signup and review the EV tariff after UW confirms suitable smart-meter communication, subject to eligibility.',
      'An optional +21% forecast scenario is available alongside Today, +5%, +15% and +25%; Today remains the default and the forecast is not a guaranteed rise.',
      'Cloud share on Windows favours link copying instead of relying on a native Share action that may hang.',
      'The universal overnight/daytime/total cost allocation and separate vehicle charging calculation from v2.52.0 are preserved.'

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
