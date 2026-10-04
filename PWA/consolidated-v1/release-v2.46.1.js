/* Appointment Companion v2.46.1 - square Partner photo upload diagnostics. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var VERSION='v2.46.1';
  function install(){
    var old=document.querySelector('.ac-version-mini');
    if(!old)return false;
    if(old.dataset.acReleaseV2461==='1')return true;
    var fresh=old.cloneNode(true);
    fresh.dataset.acReleaseV2461='1';
    fresh.textContent=VERSION;
    fresh.title='About this version';
    fresh.setAttribute('aria-label','About Appointment Companion '+VERSION);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var previous=document.getElementById('acVersionAbout');if(previous)previous.remove();
      var modal=document.createElement('div');modal.id='acVersionAbout';modal.className='ac-about open';
      modal.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+VERSION+'</h3><div style="font-size:11px;color:#6b6b76">Recent changes</div><ul><li>Partner photo selection now centre-crops automatically to a square before upload.</li><li>Admin shows clear photo-upload stages so device-read, crop and Drive-upload failures can be distinguished.</li><li>Successful uploads explicitly prompt Save changes so the photo is attached to the Partner profile.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ac-about-close'))modal.remove();});
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries=0,timer=setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
