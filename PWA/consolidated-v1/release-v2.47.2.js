/* Appointment Companion v2.47.2 - clearer backup status and more resilient Cloud sync. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var VERSION='v2.47.2';
  function install(){
    var old=document.querySelector('.ac-version-mini');
    if(!old)return false;
    if(old.dataset.acReleaseV2472==='1')return true;
    var fresh=old.cloneNode(true);
    fresh.dataset.acReleaseV2472='1';
    fresh.textContent=VERSION;
    fresh.title='About this version';
    fresh.setAttribute('aria-label','About Appointment Companion '+VERSION);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var previous=document.getElementById('acVersionAbout');if(previous)previous.remove();
      var modal=document.createElement('div');modal.id='acVersionAbout';modal.className='ac-about open';
      modal.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+VERSION+'</h3><div style="font-size:11px;color:#6b6b76">Backup and sync update</div><ul><li>The Status menu now uses a Cloud-with-tick icon when the current profile is safely synced.</li><li>The local backup icon now shows a phone/tablet or computer with its own tick, based on the detected device type.</li><li>Cloud status distinguishes the current profile from other saved profiles that may still need attention.</li><li>Background Cloud sync now continues with the remaining profiles if one individual profile fails, instead of one problem blocking the whole queue.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ac-about-close'))modal.remove();});
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries=0,timer=setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
