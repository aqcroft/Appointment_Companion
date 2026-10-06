/* Appointment Companion v2.47.0 - UI cohesion, safer Boiler Cover and profile switching. */
(function (global) {
  'use strict';
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  var VERSION='v2.47.0';
  function install(){
    var old=document.querySelector('.ac-version-mini');
    if(!old)return false;
    if(old.dataset.acReleaseV2470==='1')return true;
    var fresh=old.cloneNode(true);
    fresh.dataset.acReleaseV2470='1';
    fresh.textContent=VERSION;
    fresh.title='About this version';
    fresh.setAttribute('aria-label','About Appointment Companion '+VERSION);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var previous=document.getElementById('acVersionAbout');if(previous)previous.remove();
      var modal=document.createElement('div');modal.id='acVersionAbout';modal.className='ac-about open';
      modal.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+VERSION+'</h3><div style="font-size:11px;color:#6b6b76">UI and safety update</div><ul><li>Service tiles and top Companion shortcuts are smaller and cleaner, including a better dual-fuel Energy treatment.</li><li>Inputs and buttons now stay within each service colour family for a calmer, more consistent layout.</li><li>Cashback Card is shown with the basket services and remains selected by default unless deliberately switched off inside its section.</li><li>Boiler Cover now requires an explicit Existing cover or Add as new service choice before a valid summary can be generated.</li><li>The customer status row now separates basket services from specialist tools and adds a three-profile quick switcher.</li><li>Switching customer profiles now offers Save progress & switch, Switch without saving again, or Stay here.</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ac-about-close'))modal.remove();});
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries=0,timer=setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
