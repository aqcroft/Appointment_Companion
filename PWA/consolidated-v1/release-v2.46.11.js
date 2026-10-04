/* Appointment Companion v2.46.11 - service and mobile simplification. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var VERSION='v2.46.11';
  function install(){
    var old=document.querySelector('.ac-version-mini');
    if(!old)return false;
    if(old.dataset.acReleaseV24611==='1')return true;
    var fresh=old.cloneNode(true);
    fresh.dataset.acReleaseV24611='1';
    fresh.textContent=VERSION;
    fresh.title='About this version';
    fresh.setAttribute('aria-label','About Appointment Companion '+VERSION);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var previous=document.getElementById('acVersionAbout');if(previous)previous.remove();
      var modal=document.createElement('div');modal.id='acVersionAbout';modal.className='ac-about open';
      modal.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+VERSION+'</h3><div style="font-size:11px;color:#6b6b76">Recent changes</div><ul><li>Top services are now five compact icon-first tiles, including Cashback Card by default.</li><li>Energy cycles Off → Dual → Electricity → Gas → Off; Mobile keeps the inline SIM stepper.</li><li>SIM names and handset/airtime splitting are optional, with redundant SIM inclusion switches removed.</li><li>Cashback assumptions stay visible, whilst manual edits and notes sit behind one pencil section.</li><li>Service colours have been strengthened and Boiler Cover now uses 🛠️.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ac-about-close'))modal.remove();});
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries=0,timer=setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
