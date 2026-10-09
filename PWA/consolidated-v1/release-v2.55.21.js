/* v2.55.21 release metadata: clear VAT-free customer EV quote journey. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.21',
    date: '9th Oct 2026',
    summary: 'Clearer EV quote handover',
    changes: [
      'The EV customer bridge now explains why UW initially shows a standard electricity quote.',
      'A three-stage estimated EV to UW quote to expected EV journey uses VAT-free monthly figures.',
      'The checked EV-interest illustration remains, with wording appropriate to a prepared basket or self-service quote.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV25521 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV25521='1';
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
