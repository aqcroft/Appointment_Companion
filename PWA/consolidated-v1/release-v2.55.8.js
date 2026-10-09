/* v2.55.8 release metadata: EV hero controls and settings-only journey selection. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.8',
    date: '9th Oct 2026',
    summary: 'Customer rate caption shortened, VAT beside the hero tariff, settings after optional fix',
    changes: [
      'In customer EV shares, the existing VAT switch now sits alongside the selected tariff name within the hero, saving a separate VAT row.',
      'The rate information under the heading is shorter: EV rates, tariff quarter, compact region, Direct Debit and VAT basis.',
      'Your figures & settings now follows the optional fixed-versus-variable comparison in both EV customer journeys.',
      'The Partner presentation, VAT calculator event handlers, source figures, tariff maths and personalised share and basket links are unchanged.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV2558 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV2473='1';
    fresh.dataset.acReleaseV2558='1';
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
