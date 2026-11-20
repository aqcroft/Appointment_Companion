/* v2.71 - updated Should I Fix forecast calculator and chart presentation. */
(function(global){
 'use strict';
 var meta=Object.freeze({
   version:'v2.71',
   date:'20th Nov 2026',
   summary:'Updated Should I Fix forecasts and cleaner comparison',
   changes:[
     'Should I Fix now offers a Cornwall Insight 18 November forecast scenario alongside percentage and pence stress tests.',
     'Cornwall Insight mode proportionally models regional electricity/gas unit rates and standing charges; default percentage forecasts stay unchanged.',
     'The standard variable price cap is explicitly named in prospective comparisons.',
     'The forecast and usage controls are more compact, with average monthly chart labels shown as pastel £/m badges.',
     'Shared Should I Fix links preserve the selected CI forecast mode; the calculator remains independently usable.'
   
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
