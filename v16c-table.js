(function(){
'use strict';

var tbody=document.getElementById('comparison');
if(!tbody)return;
var scheduled=false;

function injectHeroStyles(){
  if(document.getElementById('v16cHeroRefineStyles'))return;
  var style=document.createElement('style');
  style.id='v16cHeroRefineStyles';
  style.textContent=[
    '.hero[data-v16c-layout="1"] .hero-head{display:none!important}',
    '.hero[data-v16c-layout="1"] .hero-grid{margin-top:0}',
    '.hero[data-v16c-layout="1"] .hero-box .meta{font-size:9.5px;font-weight:750;line-height:1.2;margin-top:6px}',
    '.hero[data-v16c-layout="1"] .hero-footer-v16c{display:flex;align-items:center;gap:8px;margin-top:8px;min-width:0}',
    '.hero[data-v16c-layout="1"] .hero-service-row{display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;margin:0;padding:0;background:transparent;border:0;border-radius:0}',
    '.hero[data-v16c-layout="1"] .hero-service-label{flex:0 1 auto;font-size:9px;font-weight:800;line-height:1.15;text-transform:none;letter-spacing:0;opacity:.9;white-space:nowrap}',
    '.hero[data-v16c-layout="1"] .hero-svc{display:flex;flex:0 0 auto;gap:3px;width:auto}',
    '.hero[data-v16c-layout="1"] .hero-svc button{width:25px;height:25px;min-width:25px;min-height:25px;padding:0;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:transparent;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:none}',
    '.hero[data-v16c-layout="1"] .hero-svc button .num{font-size:13px;line-height:1;font-weight:900}',
    '.hero[data-v16c-layout="1"] .hero-svc button .desc{display:none!important}',
    '.hero[data-v16c-layout="1"] .hero-svc button.on{background:#fff;border-color:#fff;color:var(--ev-dark);box-shadow:0 1px 5px rgba(0,0,0,.12);transform:none}',
    '.hero[data-v16c-layout="1"] .hero-svc button.on .num{font-size:13px}',
    '.hero[data-v16c-layout="1"] .hero-period-toggle{flex:0 0 auto;margin-left:auto}',
    '@media(max-width:390px){.hero[data-v16c-layout="1"] .hero-footer-v16c{gap:5px}.hero[data-v16c-layout="1"] .hero-service-row{gap:4px}.hero[data-v16c-layout="1"] .hero-service-label{display:block;font-size:8px}.hero[data-v16c-layout="1"] .hero-svc button{width:23px;height:23px;min-width:23px;min-height:23px}.hero[data-v16c-layout="1"] .hero-svc button .num,.hero[data-v16c-layout="1"] .hero-svc button.on .num{font-size:12px}.hero[data-v16c-layout="1"] .hero-box .meta{font-size:8.5px}}'
  ].join('');
  document.head.appendChild(style);
}

function watchKwhOnly(id){
  var el=document.getElementById(id);
  if(!el||el.dataset.v16cKwhWatch==='1')return;
  el.dataset.v16cKwhWatch='1';
  function tidy(){
    var text=(el.textContent||'').trim();
    var match=text.match(/(?:\d[\d,]*|—)\s*kWh/i);
    if(match&&text!==match[0])el.textContent=match[0];
  }
  tidy();
  new MutationObserver(tidy).observe(el,{childList:true,characterData:true,subtree:true});
}

function enhanceHero(){
  var hero=document.querySelector('.hero');
  if(!hero)return;
  injectHeroStyles();

  if(hero.dataset.v16cLayout!=='1'){
    var serviceRow=hero.querySelector('.hero-service-row');
    var period=document.getElementById('periodToggle');
    var tariff=hero.querySelector('.hero-tariff');
    var footer=document.createElement('div');
    footer.className='hero-footer-v16c';

    if(serviceRow){
      var serviceLabel=serviceRow.querySelector('.hero-service-label');
      if(serviceLabel)serviceLabel.textContent='How many UW services?';
      footer.appendChild(serviceRow);
    }
    if(period){
      period.classList.add('hero-period-toggle');
      footer.appendChild(period);
    }
    if(tariff)tariff.insertAdjacentElement('afterend',footer);
    else hero.appendChild(footer);

    hero.dataset.v16cLayout='1';
  }

  var firstLabel=hero.querySelector('.hero-grid .hero-box .k');
  if(firstLabel&&firstLabel.textContent!=='Car charging')firstLabel.textContent='Car charging';
  watchKwhOnly('carMeta');
  watchKwhOnly('homeMeta');
  watchKwhOnly('totalMeta');
}

function rowIsOpen(row){
  var next=row.nextElementSibling;
  return !!(next&&next.classList.contains('detail-row'));
}

function selectedTierCell(row){
  return row.querySelector('td.cell.sel') || row.querySelector('td.cell[data-tier="2"]') || row.querySelector('td.cell');
}

function currentOpenCell(row){
  return row.querySelector('td.cell.open');
}

function tierLabel(cell){
  var n=(parseInt(cell.dataset.tier,10)||0)+1;
  return n+' UW service'+(n===1?'':'s');
}

function enhance(){
  scheduled=false;
  enhanceHero();
  tbody.querySelectorAll('tr[data-row]').forEach(function(row){
    var label=row.querySelector('.tariff-name');
    var open=rowIsOpen(row);
    row.classList.toggle('v16c-row-open',open);
    row.classList.toggle('v16c-row-closed',!open);

    if(label){
      label.setAttribute('role','button');
      label.setAttribute('tabindex','0');
      label.setAttribute('aria-expanded',open?'true':'false');
      label.title=open?'Close tariff detail':'Open tariff detail at the selected service level';

      var activate=function(e){
        if(e){e.preventDefault();e.stopPropagation();}
        var target=open?currentOpenCell(row):selectedTierCell(row);
        if(target)target.click();
      };
      label.onclick=activate;
      label.onkeydown=function(e){
        if(e.key==='Enter'||e.key===' '){activate(e);}
      };
    }

    row.querySelectorAll('td.cell').forEach(function(cell){
      if(open){
        cell.classList.remove('v16c-cell-locked');
        cell.removeAttribute('aria-disabled');
        cell.setAttribute('role','button');
        cell.setAttribute('tabindex','0');
        cell.title='Inspect detail for '+tierLabel(cell)+' - this does not change the main EV service selection';
        cell.onkeydown=function(e){
          if(e.key==='Enter'||e.key===' '){e.preventDefault();cell.click();}
        };
      }else{
        cell.classList.add('v16c-cell-locked');
        cell.setAttribute('aria-disabled','true');
        cell.removeAttribute('role');
        cell.setAttribute('tabindex','-1');
        cell.title='Tap the tariff name to open its detail';
        cell.onkeydown=null;
      }
    });
  });
}

function scheduleEnhance(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(enhance);
}

new MutationObserver(scheduleEnhance).observe(tbody,{childList:true,subtree:true});
enhanceHero();
scheduleEnhance();
})();
