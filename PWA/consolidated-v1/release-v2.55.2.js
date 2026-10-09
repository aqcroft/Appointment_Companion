/* Unified v2.55.0 release metadata: EV shared-link reliability. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.2',
    date: '9th Oct 2026',
    summary: 'Shared customer colourway, EV labels and Economy 7 usage clarity',
    changes: [
      'Shared customer EV pages now use a purple palette, distinct from the teal Partner editing view.',
      'The customer greeting suggests changing UW services, exploring possible variable price rises and comparing fixed Economy 7.',
      'The EV table and hero service selector use consistent Energy only, Energy + 1 service and Energy + 2 services labels.',
      'The Economy 7 breakdown explains that a small amount of use moves from daytime to overnight rather than increasing total consumption.',
      'No tariff costs, underlying rates or basket-link behaviour changed.'
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
