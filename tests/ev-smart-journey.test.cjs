'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='http://127.0.0.1:8765/PWA/consolidated-v1/ev/';

async function main(){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const errors=[];
  async function pageFor(url){
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://**/*',route=>route.abort());
   await page.goto(url,{waitUntil:'commit',timeout:12000});
   return page;
  }
  // A public visitor only answers what is unknown, in the right order.
  let p=await pageFor(base+'?local=1');
  await p.locator('#acEvUwStatusDialog').waitFor({state:'visible',timeout:16000});
  await p.locator('[data-uw-status="existing"]').click();
  await p.locator('#acEvSituationDialog').waitFor({state:'visible',timeout:8000});
  await p.locator('[data-ev-situation="estimate"]').click();
  await p.locator('#acEvSmartHelp').waitFor({state:'visible',timeout:10000});
  assert.equal(await p.evaluate(()=>document.documentElement.dataset.evUwStatus),'existing');
  assert.match(await p.locator('#acEvSmartHelp').innerText(),/not a confirmed saving against your own current tariff/i);
  await p.close();

  // An explicitly supplied UW status and EV answer skip both introductions.
  p=await pageFor(base+'?local=1&uw=exploring&ev=meter');
  await p.locator('#acEvSmartHelp').waitFor({state:'visible',timeout:16000});
  assert.equal(await p.locator('#acEvUwStatusDialog').count(),0);
  assert.equal(await p.locator('#acEvSituationDialog').count(),0);
  assert.equal(await p.evaluate(()=>document.documentElement.dataset.evUwStatus),'exploring');
  assert.match(await p.locator('#acEvSmartHelp').innerText(),/Adrian Croft/);
  await p.close();

  // New smart snapshots open the editable calculator without a splash.
  const smart={v:'16C',n:'you',sm:1,uws:'existing',pr:'adrian',
   am:true,ms:'ev',ap:2275,ao:4800,mi:10000,hk:2500,ve:3.2,ti:2,rg:11,ep:10,vat:'5'};
  p=await pageFor(base+'?local=1#p2='+Buffer.from(JSON.stringify(smart)).toString('base64url'));
  await p.waitForFunction(()=>document.documentElement.classList.contains('shared-started'),{timeout:16000});
  assert.equal(await p.locator('#personalSplash').evaluate(el=>getComputedStyle(el).display),'none');
  await p.locator('#acMeterPeak').waitFor({timeout:16000});
  await p.waitForFunction(()=>document.querySelector('#acMeterPeak')?.value==='2275',{timeout:16000});
  assert.equal(await p.locator('#acEvUwStatusDialog').count(),0);
  assert.equal(await p.locator('#acEvSituationDialog').count(),0);
  await p.close();

  // Old links retain their established start screen and require a click.
  const legacy={v:'16C',n:'Regression customer',am:false,mi:8000,hk:2500,ve:3.2,ti:2,rg:11};
  p=await pageFor(base+'?local=1#p2='+Buffer.from(JSON.stringify(legacy)).toString('base64url'));
  await p.locator('#personalSplashOk').waitFor({state:'visible',timeout:16000});
  assert.equal(await p.evaluate(()=>document.documentElement.classList.contains('shared-started')),false);
  await p.close();
  assert.deepEqual(errors,[],'No uncaught JS exceptions');
  console.log('EV smart customer journeys and legacy links passed');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1});
