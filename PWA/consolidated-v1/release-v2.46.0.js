/* Appointment Companion v2.46.0 - canonical UW Partner slug identity. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var VERSION='v2.46.0';
  function install(){
    var old=document.querySelector('.ac-version-mini');
    if(!old)return false;
    if(old.dataset.acReleaseV2460==='1')return true;
    var fresh=old.cloneNode(true);
    fresh.dataset.acReleaseV2460='1';
    fresh.textContent=VERSION;
    fresh.title='About this version';
    fresh.setAttribute('aria-label','About Appointment Companion '+VERSION);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var previous=document.getElementById('acVersionAbout');if(previous)previous.remove();
      var modal=document.createElement('div');modal.id='acVersionAbout';modal.className='ac-about open';
      modal.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+VERSION+'</h3><div style="font-size:11px;color:#6b6b76">Recent changes</div><ul><li>UW Partner slug is now the single source for customer join URL, Partner registration URL and default UW email.</li><li>Admin suggests first.surname automatically and allows suffixes such as first.surname1.</li><li>Partner profiles expose both customer and Partner registration links consistently across the suite and PET.</li><li>Existing Partner profiles remain backward compatible and can derive their slug from their existing join link.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ac-about-close'))modal.remove();});
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries=0,timer=setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
