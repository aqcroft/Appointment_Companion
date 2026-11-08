/* v2.69 - name-confirmed customer records, autosave and simplified Cloud synchronisation. */
(function(global){
 'use strict';
 var meta=Object.freeze({
   version:'v2.69',
   date:'8th Nov 2026',
   summary:'Name once, save automatically, sync simply',
   changes:[
     'Confirm a customer name with ✓ to create one customer record; unnamed working information stays recoverable but is not a saved customer.',
     'Every subsequent change auto-saves locally to the same customer ID and synchronises to Cloud when connected.',
     'Customer rows show only the current device and Cloud with honest saved, pending or conflict indicators.',
     'One Sync all customers now button handles confirmed customer changes in both directions.',
     'Older device-only records are preserved for one-time, deliberate migration; standalone EV and Should I Fix require no customer profile.'
   
   ]
 });
 global.AppointmentCompanionRelease=meta;
 document.title='Appointment Companion '+meta.version;
 if(document.documentElement.classList.contains('view-mode')||document.documentElement.classList.contains('shared-view'))return;
 var tries=0,timer=setInterval(function(){
   var old=document.querySelector('.ac-version-mini');
   if(!old){if(++tries>180)clearInterval(timer);return;}
   if(old.dataset.acReleaseV269==='1'){clearInterval(timer);return;}
   var fresh=old.cloneNode(true);
   fresh.dataset.acReleaseV269='1';
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
