'use strict';
const { chromium }=require('playwright');
const assert=require('node:assert/strict');

const BASE='http://127.0.0.1:8765/PWA/consolidated-v1/ev/';
const sample={
  v:'16C',n:'Browser test',am:true,ms:'ev',ap:2275,ao:4800,
  mi:12000,hk:2500,ve:3.2,vi:'🚙',ti:2,rg:11,ep:10,
  vat:'5',aw:0,e7:15,df:true
};
const cloudSnapshot={
  customer_name:'Browser test',
  ev_state:{
    meter_mode:'meter',meter_source:'ev',
    meter_peak_kwh:2275,meter_offpeak_kwh:4800,
    uw_services:3,region:11,vat_percent:5,annual_mileage:12000,
    vehicle_efficiency_mi_kwh:3.2,ev_offpeak_pct:10,
    away_pct:0
  }
};
async function test(path,cloud){
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 if(cloud){
   await page.route('**/consolidated-v1/specialist-share-v1.js*',route=>
     route.fulfill({
       contentType:'application/javascript',
       body:'window.AppointmentCompanionSpecialistShare={read:async function(){return {snapshot:'+JSON.stringify(cloudSnapshot)+'}}};'
     }));
 }
 try{
   await page.goto(BASE+path,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#acSharedAssumptions .ac-v254-welcome-stat',{timeout:20000});
   const stats=page.locator('#acSharedAssumptions .ac-v254-welcome-stat');
   assert.equal(await stats.count(),3,'The 3 meter usage cards should appear');
   assert.equal(await page.locator('#acSharedAssumptions .ac-stat-icon').count(),3,'Icons have their own row');
   assert.ok((await page.locator('.ac-v254-welcome-basket li').count())>=2,'Basket copy has bullets');
   const button=page.locator('#personalSplashOk');
   await button.waitFor({state:'visible'});
   await page.waitForFunction(() => {
     const b=document.getElementById('personalSplashOk');
     return b && !b.disabled && b.textContent.includes('Explore');
   },null,{timeout:15000});
   await button.click({timeout:6000});
   await page.waitForFunction(() => {
     const splash=document.getElementById('personalSplash');
     return splash && (splash.classList.contains('fade') || splash.style.display==='none');
   },null,{timeout:1500});
   console.log((cloud?'CLOUD':'PORTABLE')+': click dismisses splash');
   await page.waitForFunction(() => document.documentElement.classList.contains('shared-started'),null,{timeout:4000});
   await page.waitForFunction(() => {
     const p=document.getElementById('acMeterPeak'),n=document.getElementById('acMeterNight');
     return p && n && p.value==='2275' && n.value==='4800';
   },null,{timeout:15000});
   await page.waitForFunction(() => document.getElementById('personalSplash').style.display==='none',null,{timeout:3000});
   console.log((cloud?'CLOUD':'PORTABLE')+': personalised inputs restored and calculator opened');
   if(errors.length)console.log((cloud?'CLOUD':'PORTABLE')+' page errors:',errors.slice(0,5));
 }catch(e){
   console.error((cloud?'CLOUD':'PORTABLE')+' failed: '+e.message);
   console.error('State:',await page.evaluate(() => ({
     title:document.title,button:document.getElementById('personalSplashOk')?.outerHTML,
     root:document.documentElement.className,
     loading:document.getElementById('acEvShareLoading')?.textContent,
     visible:document.getElementById('personalSplash')?.style.display
   })).catch(e=>e.message));
   console.error(errors.slice(0,10));
   throw e;
 }finally{await browser.close()}
}
(async()=>{
  const encoded=Buffer.from(JSON.stringify(sample)).toString('base64url');
  await test('?local=1#p2='+encoded,false);
  await test('?s=smoketest&for=browser-test',true);
  console.log('EV shared-link smoke tests passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
