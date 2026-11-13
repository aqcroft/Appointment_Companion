/* Preview v2.71 - consolidated EV journey and safe sharing. */
(function(global){
 'use strict';
 var meta=Object.freeze({
   version:global.__AC_EV_PREVIEW_VERSION||'v2.71',
   date:'13th Nov 2026',
   summary:'EV journey, transparent usage and safe sharing',
   changes:[
     'Guide prospective drivers from mileage and vehicle choice to an editable EV comparison.',
     'Show home, EV and combined kWh, with an adjustable 0–50% overnight household share.',
     'Offer a voluntary enquiry with an explicit agreement step and a detailed assumption snapshot.',
     'Keep preview records in isolated browser storage and use portable shares without Cloud writes.'

   ]
 });
 global.AppointmentCompanionRelease=meta;
 document.title='Appointment Companion '+meta.version;
 if(document.documentElement.classList.contains('view-mode')||document.documentElement.classList.contains('shared-view'))return;
 var tries=0,timer=setInterval(function(){
   var old=document.querySelector('.ac-version-mini');
   if(!old){if(++tries>180)clearInterval(timer);return;}
   if(old.dataset.acReleaseV271==='1'){clearInterval(timer);return;}
   var fresh=old.cloneNode(true);
   fresh.dataset.acReleaseV271='1';
   fresh.textContent=meta.version;
   fresh.title='About this version';
   fresh.setAttribute('aria-label','About Appointment Companion '+meta.version);
   old.parentNode.replaceChild(fresh,old);
   fresh.addEventListener('click',function(){
     var prev=document.getElementById('acVersionAbout');if(prev)prev.remove();
     var el=document.createElement('div');
     el.className='ac-about open';el.id='acVersionAbout';
     el.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+meta.version+'</h3><div style="font-size:11px;color:#6b6b76">'+meta.date+' · '+meta.summary+'</div><ul><li>'+meta.changes.join('</li><li>')+'</li></ul><button class="ac-about-close" type="button">Close</button></div>';
     el.addEventListener('click',function(e){if(e.target===el||e.target.closest('.ac-about-close'))el.remove();});
     document.body.appendChild(el);
   });
   clearInterval(timer);
 },50);
})(window);
