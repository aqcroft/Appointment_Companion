'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

const modal=read('ev-customer-contact-v2.55.24.js');
const sharing=read('ev-sharing-v2.55.24.js');
const loader=read('ev/index.html');
const shell=read('index.html');
const sw=read('sw.js');
new vm.Script(modal);new vm.Script(sharing);new vm.Script(sw);
assert.match(loader,/ev-sharing-v2\.55\.24\.js/);
assert.match(loader,/ev-customer-contact-v2\.55\.24\.js/);
assert.match(sharing,/loadScript\('consolidated-v1\/ev-customer-contact-v2\.55\.24\.js/);
assert.match(shell,/release-v2\.55\.24\.js/);
assert.match(sw,/ev-customer-contact-v2\.55\.24\.js/);
assert.match(sw,/ev-sharing-v2\.55\.24\.js/);
assert.match(sw,/consolidated-v2-55-24-bridgecopy1/);

const show=modal.slice(modal.indexOf('  function showBasket(url,origin){'),modal.indexOf('  function updateBasketNumbers(){'));
const cards=show.indexOf("'<div id=\"acEvBasketFigures\"></div>'");
const caption=show.indexOf("'<p class=\"ac-ev-basket-caption\">");
const intro=show.indexOf("'<p id=\"acEvBasketIntro\">");
const interest=show.indexOf("'<div class=\"ac-ev-interest-preview\"");
assert.ok(cards>=0&&caption>cards&&intro>caption&&interest>intro,'Figures must appear before concise explanation and interest');
assert.match(show,/I've already ticked the EV interest box in your UW basket/);
assert.match(show,/When creating your UW quote, tick the EV interest box/);
assert.match(show,/Email me with more information about your Electric Vehicle Tariff/);
assert.doesNotMatch(show,/tap <span class="ac-ev-save-chip">Save/);
assert.match(show,/over the next 12 months/);

const a=modal.indexOf('  function updateBasketNumbers(){');
const b=modal.indexOf('  function cardSettings(){',a);
assert.ok(a>=0&&b>a);
const calc=modal.slice(a,b);
for(const vatPercent of [0,5]){
  const f=vatPercent===5?1.05:1,host={innerHTML:'',textContent:''};
  vm.runInNewContext(calc+'\nupdateBasketNumbers();',{document:{getElementById:()=>host},lastModel:{
    vatPercent,standard:{total:1971.6*f},ev:{total:1188*f},dualFuelSelected:false,standardDualFuelDiscountExVatAnnual:0
  }});
  assert.match(host.innerHTML,/1\. COMPANION/);
  assert.match(host.innerHTML,/2\. UW QUOTE/);
  assert.match(host.innerHTML,/3\. EV TARIFF/);
  assert.match(host.innerHTML,/£164\.30/);
  assert.match(host.innerHTML,/~£99/);
}
console.log('EV bridge v2.55.24 modal layout, copy and ex-VAT calculations passed');
