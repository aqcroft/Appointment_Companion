/* v2.58.1 - Partner profile share recovery and WhatsApp fallback. */
(function(global){
  'use strict';
  var meta=Object.freeze({
    version:'v2.58.1',
    date:'14th Oct 2026',
    summary:'More reliable personalised sharing when Cloud is slow',
    changes:[
      'Personalised savings cards stop waiting indefinitely if Partner Cloud details cannot be retrieved.',
      'An unavailable profile produces clear reconnect / My profile guidance rather than a perpetual loading label.',
      'If Chrome blocks opening WhatsApp after a Cloud lookup, a clickable Open WhatsApp link is provided.',
      'Cached Partner identity is used only when it belongs to the active Partner; customer calculations and figures are unchanged.'
    ]
  });
  global.AppointmentCompanionRelease=meta;
  if(document.documentElement.classList.contains('view-mode')||document.documentElement.classList.contains('shared-view'))return;
  var tries=0,timer=setInterval(function(){
    var old=document.querySelector('.ac-version-mini');
    if(!old){if(++tries>180)clearInterval(timer);return;}
    if(old.dataset.acReleaseV2581==='1'){clearInterval(timer);return;}
    var fresh=old.cloneNode(true);
    fresh.dataset.acReleaseV2581='1';fresh.textContent=meta.version;
    fresh.title='About this version';fresh.setAttribute('aria-label','About Appointment Companion '+meta.version);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var prev=document.getElementById('acVersionAbout');if(prev)prev.remove();
      var el=document.createElement('div');el.className='ac-about open';el.id='acVersionAbout';
      el.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+meta.version+'</h3><div style="font-size:11px;color:#6b6b76">'+meta.date+' · '+meta.summary+'</div><ul><li>'+meta.changes.join('</li><li>')+'</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      el.addEventListener('click',function(e){if(e.target===el||e.target.closest('.ac-about-close'))el.remove();});
      document.body.appendChild(el);
    });
    clearInterval(timer);
  },50);
})(window);
