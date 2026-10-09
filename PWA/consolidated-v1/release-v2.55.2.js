/* Appointment Companion v2.55.2 - EV shared mode and Economy 7 clarification. */
(function(global) {
 'use strict';
 var meta=Object.freeze({
   version:'v2.55.2',
   date:'9th Oct 2026',
   summary:'EV customer colourway, service labels and Economy 7 usage explanation',
   changes:[
     'Shared customer EV view uses a purple palette, distinct from the teal Partner editing view.',
     'The customer greeting suggests exploring UW services, possible variable price rises and fixed Economy 7.',
     'Tariff table and service selector consistently show Energy only, Energy + 1 service and Energy + 2 services.',
     'Economy 7 breakdown explains day-to-night usage reallocation without increasing total annual consumption.',
     'EV calculator and sharing maths, underlying rates and the basket link remain unchanged.'
   ]
 });
 global.AppointmentCompanionRelease=meta;
 if(document.documentElement.classList.contains('view-mode')||document.documentElement.classList.contains('shared-view'))return;
 var tries=0,timer=setInterval(function(){
  var version=document.querySelector('.ac-version-mini');
  if(!version){if(++tries>120)clearInterval(timer);return;}
  version.textContent=meta.version;
  version.title='About Appointment Companion '+meta.version;
  version.setAttribute('aria-label','About Appointment Companion '+meta.version);
  clearInterval(timer);
 },50);
})(window);
