/* v2.58.0 - first-run welcome and installation tutorial; Partner setup stays in Cloud/Admin. */
(function(global){
  'use strict';
  var meta=Object.freeze({
    version:'v2.58.0',
    date:'13th Oct 2026',
    summary:'First-time mobile installation help without duplicate Partner setup',
    changes:[
      'First-time mobile visitors can watch an iPhone or Android installation walkthrough, defer it once, or opt out permanently on this device.',
      'The Getting started tutorial can be replayed from the Companion menu or Settings, even after opting out.',
      'Existing Partners, desktop users, installed PWAs and publicly shared customer views are not interrupted by the welcome.',
      'The existing Cloud login, centrally provisioned Partner profiles and automatic device identification remain in place. Device naming is optional in Settings.',
      'The legacy four-step onboarding wizard is not launched in the consolidated Companion.'
    ]
  });
  global.AppointmentCompanionRelease=meta;
  if(document.documentElement.classList.contains('view-mode')||document.documentElement.classList.contains('shared-view'))return;
  var tries=0,timer=setInterval(function(){
    var old=document.querySelector('.ac-version-mini');
    if(!old){if(++tries>180)clearInterval(timer);return}
    if(old.dataset.acReleaseV2580==='1'){clearInterval(timer);return}
    var fresh=old.cloneNode(true);fresh.dataset.acReleaseV2580='1';fresh.textContent=meta.version;fresh.title='About this version';fresh.setAttribute('aria-label','About Appointment Companion '+meta.version);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var prev=document.getElementById('acVersionAbout');if(prev)prev.remove();
      var el=document.createElement('div');el.className='ac-about open';el.id='acVersionAbout';
      el.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+meta.version+'</h3><div style="font-size:11px;color:#6b6b76">'+meta.date+' · '+meta.summary+'</div><ul><li>'+meta.changes.join('</li><li>')+'</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      el.addEventListener('click',function(e){if(e.target===el||e.target.closest('.ac-about-close'))el.remove()});document.body.appendChild(el);
    });clearInterval(timer);
  },50);
})(window);