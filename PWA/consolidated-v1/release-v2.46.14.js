/* Appointment Companion v2.46.14 - Cloud Partner identity consistency. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var VERSION='v2.46.14';
  function install(){
    var old=document.querySelector('.ac-version-mini');
    if(!old)return false;
    if(old.dataset.acReleaseV24614==='1')return true;
    var fresh=old.cloneNode(true);
    fresh.dataset.acReleaseV24614='1';
    fresh.textContent=VERSION;
    fresh.title='About this version';
    fresh.setAttribute('aria-label','About Appointment Companion '+VERSION);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var previous=document.getElementById('acVersionAbout');if(previous)previous.remove();
      var modal=document.createElement('div');modal.id='acVersionAbout';modal.className='ac-about open';
      modal.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+VERSION+'</h3><div style="font-size:11px;color:#6b6b76">Partner profile fixes</div><ul><li>Authenticated Cloud Partner ID now owns the local profile cache, preventing another Partner\'s saved identity from appearing on a shared device.</li><li>First-run setup now loads an Admin-created Cloud profile before asking for Partner details again.</li><li>Summary sharing uses only the profile belonging to the authenticated Partner.</li><li>Partner Earnings now always carries the authenticated Partner ID and fails safely instead of falling back to another Partner.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ac-about-close'))modal.remove();});
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries=0,timer=setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
