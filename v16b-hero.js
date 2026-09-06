(function(){
'use strict';

function cleanMeta(id){
  var el=document.getElementById(id);
  if(!el)return;
  function tidy(){
    var t=el.textContent||'';
    var cleaned=t.replace(/^[^0-9£—-]+\s*/,'');
    if(cleaned!==t)el.textContent=cleaned;
  }
  tidy();
  new MutationObserver(tidy).observe(el,{childList:true,characterData:true,subtree:true});
}

function rebuildHero(){
  var grid=document.querySelector('.hero-grid');
  if(!grid||grid.dataset.v16bReady==='1')return;
  grid.dataset.v16bReady='1';

  var boxes=grid.querySelectorAll('.hero-box');
  if(boxes.length<3)return;

  var car=boxes[0],home=boxes[1],total=boxes[2];
  car.classList.add('hero-component','hero-car');
  home.classList.add('hero-component','hero-home');
  total.classList.add('hero-total');

  var carK=car.querySelector('.k');
  var homeK=home.querySelector('.k');
  var totalK=total.querySelector('.k');
  if(carK)carK.textContent='Car';
  if(homeK)homeK.textContent='Home';
  if(totalK)totalK.textContent='Car + home';

  function makeValueRow(box,valueId,iconHtml){
    var value=box.querySelector('#'+valueId);
    if(!value||value.parentElement.classList.contains('hero-value-row'))return;
    var row=document.createElement('div');
    row.className='hero-value-row';
    value.parentNode.insertBefore(row,value);
    row.appendChild(value);
    var icon=document.createElement('div');
    icon.className='hero-main-icon';
    icon.innerHTML=iconHtml;
    row.appendChild(icon);
  }

  var existingCarIcon=document.getElementById('heroCarIcon');
  if(existingCarIcon)existingCarIcon.remove();
  var existingTotalIcon=document.getElementById('heroTotalIcon');
  if(existingTotalIcon)existingTotalIcon.remove();

  makeValueRow(car,'heroCar','<span id="heroCarIcon">🚙</span>');
  makeValueRow(home,'heroHome','<span aria-hidden="true">🏠</span>');
  makeValueRow(total,'heroTotal','<span id="heroTotalIcon">🚙</span><span aria-hidden="true">🏠</span>');

  cleanMeta('carMeta');
  cleanMeta('homeMeta');
  cleanMeta('totalMeta');
}

rebuildHero();
})();
