'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const modal=read('ev-customer-contact-v2.55.26.js');
const sharing=read('ev-sharing-v2.55.26.js');
const evLoader=read('ev/index.html');
const shell=read('index.html');
const sw=read('sw.js');
const screenshot=read('assets/uw-ev-interest-ticked-v1.svg');
new vm.Script(modal);new vm.Script(sharing);new vm.Script(sw);
assert.match(evLoader,/ev-customer-contact-v2\.55\.26\.js/);
assert.match(evLoader,/ev-sharing-v2\.55\.26\.js/);
assert.match(sharing,/ev-customer-contact-v2\.55\.26\.js/);
assert.match(shell,/release-v2\.55\.26\.js/);
assert.match(sw,/assets\/uw-ev-interest-ticked-v1\.svg/);
assert.match(screenshot,/<svg/);
const pngMatch=screenshot.match(/href="data:image\/png;base64,([^"]+)"/);
assert.ok(pngMatch,'The cropped original screenshot must be embedded as PNG');
const png=Buffer.from(pngMatch[1],'base64');
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.ok(png.length>2000);
const show=modal.slice(modal.indexOf('  function showBasket(url,origin){'),modal.indexOf('  function updateBasketNumbers(){'));
const img=show.indexOf('ac-ev-interest-screenshot');
const copy=show.indexOf('ac-ev-interest-confirmation');
assert.ok(img>=0&&copy>img,'Partner reassurance must be below real screenshot');
assert.doesNotMatch(show,/class="ac-ev-interest-choice"/);
assert.match(show,/I've already ticked the EV interest box in your UW basket/);
assert.match(modal,/content:"➜"!important/);
assert.match(modal,/border:2px solid #9c79bc/);
const calc=modal.slice(modal.indexOf('  function updateBasketNumbers(){'),modal.indexOf('  function cardSettings(){'));
assert.doesNotMatch(calc,/monthlyPence/);
for(const vatPercent of [0,5]){
  const factor=vatPercent===5?1.05:1;
  const host={innerHTML:'',textContent:''};
  vm.runInNewContext(calc+'\nupdateBasketNumbers();',{
    document:{getElementById:()=>host},
    lastModel:{
      vatPercent,standard:{total:1971.6*factor},ev:{total:1188*factor},
      dualFuelSelected:false,standardDualFuelDiscountExVatAnnual:0
    }
  });
  assert.match(host.innerHTML,/1\. COMPANION/);
  assert.match(host.innerHTML,/2\. UW QUOTE/);
  assert.match(host.innerHTML,/3\. EV TARIFF/);
  assert.match(host.innerHTML,/£164<\/strong>/);
  assert.match(host.innerHTML,/~£99/);
  assert.doesNotMatch(host.innerHTML,/164\.30/);
}
console.log('EV bridge v2.55.26 screenshot, copy order, arrows and price display tests passed');
