/* v2.68 - consistent cross-device customer sorting and explicit full Cloud refresh. */
(function(global){
 'use strict';
 var meta=Object.freeze({
   version:'v2.68',
   date:'8th Nov 2026',
   summary:'Newest customers first, plus one-tap Cloud refresh',
   changes:[
     'Most recent and Oldest first sort customer profiles by last actual edit, not by whether they were saved on a phone or laptop.',
     'Cloud-only profiles are included in the same sorted customer list.',
     'Sync all Cloud customers now refreshes Cloud-backed profiles, respects unsaved local drafts and flags conflicts.',
     'Cloud downloads preserve the original Cloud update timestamp instead of using the device download time.'
   ]
 });
 global.AppointmentCompanionRelease=meta;
 document.title='Appointment Companion '+meta.version;
 if(document.documentElement.classList.contains('view-mode')||document.documentElement.classList.contains('shared-view'))return;
 var tries=0,timer=setInterval(function(){
   var old=document.querySelector('.ac-version-mini');
   if(!old){if(++tries>180)clearInterval(timer);return;}
   if(old.dataset.acReleaseV268==='1'){clearInterval(timer);return;}
   var fresh=old.cloneNode(true);
   fresh.dataset.acReleaseV268='1';
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
