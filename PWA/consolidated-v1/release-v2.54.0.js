/* Unified v2.54.0 release metadata: EV comparison usability polish. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.54.0',
    date: '9th Oct 2026',
    summary: 'Final EV presentation polish and tariff-comparison clarity',
    changes: [
      'All tariff-expanded breakdowns use the same three aligned columns as the main hero: overnight, daytime plus standing charge, and total.',
      'Expanded tariff kWh allocations mirror the hero in overnight/daytime/total order, including clear treatment of flat-rate tariffs.',
      'The usual existing-EV meter readings default to the five-hour EV tariff; the Economy 7 source becomes a smaller optional switch.',
      'The 5%/0% VAT selector uses a compact one-line strip; the original detailed VAT maths is available by tapping its information icon.',
      'Personalised and cloud-shared customer welcome summaries explicitly say when 5% electricity VAT is included throughout the conservative annualised illustration, with 0% available as an alternative.',
      'Economy 7 fixed remains a genuine comparison option, with clear distinction between the longer cheap period, its actual night rate and the certainty of fixed prices.',
      'Calculations, Energy only/+1/+2 service options and the optional 21% scenario remain unchanged.'

    ]
  });
  global.AppointmentCompanionRelease = meta;
  if (document.documentElement.classList.contains('view-mode') || document.documentElement.classList.contains('shared-view')) return;
  function install() {
    var old = document.querySelector('.ac-version-mini');
    if (!old) return false;
    if (old.dataset.acReleaseV2473 === '1') return true;
    var fresh = old.cloneNode(true);
    fresh.dataset.acReleaseV2473='1';
    fresh.textContent=meta.version;
    fresh.title='About this version';
    fresh.setAttribute('aria-label','About Appointment Companion '+meta.version);
    old.parentNode.replaceChild(fresh,old);
    fresh.addEventListener('click',function(){
      var previous=document.getElementById('acVersionAbout');
      if(previous)previous.remove();
      var modal=document.createElement('div');
      modal.id='acVersionAbout';
      modal.className='ac-about open';
      modal.innerHTML='<div class="ac-about-card" role="dialog" aria-modal="true"><h3>Appointment Companion '+meta.version+'</h3><div style="font-size:11px;color:#6b6b76">'+meta.date+' · '+meta.summary+'</div><ul><li>'+meta.changes.join('</li><li>')+'</li></ul><button class="ac-about-close" type="button">Close</button></div>';
      modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ac-about-close'))modal.remove();});
      document.body.appendChild(modal);
    });
    return true;
  }
  var tries=0,timer=setInterval(function(){if(install()||++tries>220)clearInterval(timer);},50);
})(window);
