/* v2.55.3 release metadata: EV journey styles and portable linked sharing. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.55.3',
    date: '9th Oct 2026',
    summary: 'Blue/red EV modes, matching purple customer views, and reliable sharing without Cloud',
    changes: [
      'Partner EV mode colours: blue for an existing EV owner, muted red for someone considering an EV.',
      'Customer comparison colours are corresponding cool violet and warm plum-purple, with matching journey badges and icons.',
      'Hero service selector has a full-width stable row that cannot overlap the usage cards or period controls.',
      'Sharing a linked customer works from current calculator settings even before Cloud sync, using a portable personalised link when a short Cloud link is unavailable.',
      'Tariff calculations, rate data and the Open Basket handover remain unchanged.'
    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV2553 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV2473='1';
    fresh.dataset.acReleaseV2553='1';
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
