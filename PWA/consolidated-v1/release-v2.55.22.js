/* v2.55.22 release metadata: guided electricity region selection for specialist calculators. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.22',
    date: '9th Oct 2026',
    summary: 'Easier access to EV and Should I Fix',
    changes: [
      'Tapping EV Companion or Should I Fix now opens the electricity region selector if none has been chosen.',
      'Selecting the customer region continues automatically into the requested calculator.',
      'Existing profiles and saved regions remain unchanged; region is still required for accurate tariff comparisons.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV25522 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV25522='1';
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
