/* v2.55.9 release metadata: EV hero controls and settings-only journey selection. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.9',
    date: '9th Oct 2026',
    summary: 'VAT beside EV rates above the customer hero, removing surplus hero space',
    changes: [
      'VAT on customer-facing EV shares now sits beside the abbreviated EV rates status under the heading, above the purple hero, rather than beside the tariff name within it.',
      'The purple hero ends beneath the EV tariff and service information with no blank VAT row.',
      'Original 5%/0% VAT switches and explanation remain interactive, with no changes to calculation or assumptions.',
      'Existing and prospective customer modes, Partner controls, share links and basket handover remain unchanged.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV2559 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV2473='1';
    fresh.dataset.acReleaseV2559='1';
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
