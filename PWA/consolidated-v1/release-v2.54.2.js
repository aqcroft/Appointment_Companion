/* Unified v2.54.2 release metadata: EV comparison usability polish. */
(function (global) {
  'use strict';
  var meta = Object.freeze({
    version: 'v2.54.2',
    date: '9th Oct 2026',
    summary: 'Accessible forecast explanation without extra page clutter',
    changes: [
      'Hero cards now use whole house icons for overnight, daytime and total, with no partial-house shading.',
      'Every tariff breakdown labels costs simply Overnight, Daytime and Total; the daytime figure still includes the daily standing charge.',
      'Tariff headings explicitly say Variable tariffs (change every 3 months) and Fixed tariffs (unit rates and standing charges are fixed).',
      'A small accessible information icon beside variable uplift buttons explains that the 21% scenario is based on a typical medium-usage dual-fuel Direct Debit household, not individual EV electricity rates.',
      'The long forecast description is kept off the main page and available with a tap; illustrative uplift maths, current-price default and fixed-tariff treatment are unchanged.',
      'Personalised shared EV links open with a smaller, more professional teal welcome panel and the clear action Explore my UW EV options.',
      'The welcome shows annual usage figures in compact cards, avoiding a long paragraph and unnecessary sales language.',
      'The starting basket view accurately reflects Energy only, Energy plus one other service, or Energy plus two other services; the two-service default explains its favourable EV tariff rates without implying the customer must buy extra services.',
      'The same customer intro component serves portable and Cloud links, keeping service and VAT wording consistent across both.',
      'Both shared-link formats now dismiss their welcome screens reliably; tariff rates load within the calculator, with a visible non-blocking status and bounded script loading.',
      'The shared experience uses the same teal colours as the main EV calculator instead of the older purple styling.',
      'The v2.54.0 tariff breakdown ordering, compact VAT selector and secondary Economy 7 control are retained.',
      'Existing EV maths, fixed tariff treatment, the 21% illustrative scenario and customer basket links are unchanged.'

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
