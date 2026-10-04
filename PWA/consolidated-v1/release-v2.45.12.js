/* Appointment Companion v2.45.12 - shared-card interaction isolation. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var VERSION='v2.45.12';
  function install(){
    var old=document.querySelector('.ac-version-mini');
    if(!old)return false;
    if(old.dataset.acReleaseV24512==='1')return true;
    var fresh=old.cloneNode(true);
    fresh.dataset.acReleaseV24512='1';
    fresh.textContent=VERSION;
    fresh.title='About this version';
    fresh.setAttribute('aria-label','About Appointment Companion '+VERSION);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var previous=document.getElementById('acVersionAbout');if(previous)previous.remove();
      var modal=document.createElement('div');modal.id='acVersionAbout';modal.className='ac-about open';
      modal.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+VERSION+'</h3><div style="font-size:11px;color:#6b6b76">Recent changes</div><ul><li>Customer share cards now load independently of Partner/editor scripts.</li><li>Breakdown accordions and customer CTA interactions are explicitly protected from stray modal overlays or pointer interception.</li><li>The visual share-card design and payload format are unchanged.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ac-about-close'))modal.remove();});
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries=0,timer=setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
