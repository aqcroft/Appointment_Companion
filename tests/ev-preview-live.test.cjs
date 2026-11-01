'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base='https://aqcroft.github.io/Appointment_Companion/PWA/consolidated-v1/ev-preview-v2670/';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const errors=[];
 try{
   let page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   page.on('pageerror',e=>errors.push(e.message));
   let res=await page.goto(base+'?local=1',{waitUntil:'domcontentloaded',timeout:25000});
   assert.equal(res.status(),200,'Preview page must be hosted');
   await page.locator('#acEvPreviewRibbon').waitFor({state:'visible',timeout:20000});
   assert.match(await page.locator('#acEvPreviewRibbon').innerText(),/PREVIEW/);
   await page.locator('#acEvUwStatusDialog').waitFor({state:'visible',timeout:20000});
   assert.equal(await page.locator('.ac-toolstrip').count(),0,'Public page must not expose Partner toolbar');
   await page.locator('[data-uw-status="existing"]').click();
   await page.locator('[data-ev-situation="estimate"]').click();
   await page.locator('#acEvSmartHelp').waitFor({state:'visible',timeout:15000});
   assert.match(await page.locator('#acEvSmartHelp').innerText(),/current tariff/i);
   await page.close();

   const sample={v:'16C',n:'you',sm:1,uws:'existing',pr:'adrian',
     am:true,ms:'ev',ap:2275,ao:4800,mi:10000,hk:2500,ve:3.2,ti:2,rg:11,ep:10,vat:'5'};
   page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   page.on('pageerror',e=>errors.push(e.message));
   res=await page.goto(base+'?local=1#p2='+Buffer.from(JSON.stringify(sample)).toString('base64url'),{waitUntil:'domcontentloaded',timeout:25000});
   assert.equal(res.status(),200);
   await page.waitForFunction(()=>document.documentElement.classList.contains('shared-started'),{timeout:20000});
   await page.waitForFunction(()=>document.querySelector('#acMeterPeak')?.value==='2275',{timeout:20000});
   assert.equal(await page.locator('#acEvUwStatusDialog').count(),0);
   assert.equal(await page.locator('#acEvSituationDialog').count(),0);
   assert.match(await page.locator('#acEvSmartHelp').innerText(),/Adrian is already your UW contact/);
   assert.equal(await page.locator('#acEvPreviewRibbon').count(),1);
   assert.deepEqual(errors,[]);
   console.log('Hosted mobile preview passes: '+base+'?local=1');
 }finally{await browser.close()}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1});
