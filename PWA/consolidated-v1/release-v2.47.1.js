/* Appointment Companion v2.47.1 - faster customer profile finding. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var VERSION='v2.47.1';
  function install(){
    var old=document.querySelector('.ac-version-mini');
    if(!old)return false;
    if(old.dataset.acReleaseV2471==='1')return true;
    var fresh=old.cloneNode(true);
    fresh.dataset.acReleaseV2471='1';
    fresh.textContent=VERSION;
    fresh.title='About this version';
    fresh.setAttribute('aria-label','About Appointment Companion '+VERSION);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var previous=document.getElementById('acVersionAbout');if(previous)previous.remove();
      var modal=document.createElement('div');modal.id='acVersionAbout';modal.className='ac-about open';
      modal.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+VERSION+'</h3><div style="font-size:11px;color:#6b6b76">Customer profile update</div><ul><li>Search saved customer profiles by name as you type.</li><li>Sort profiles by most recent, oldest, name A-Z or name Z-A.</li><li>The customer browser no longer shows misleading save/cloud status icons; genuine sync conflicts still show a warning.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ac-about-close'))modal.remove();});
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries=0,timer=setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
