'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8765/PWA/consolidated-v1/ev/';
const sample={v:'16C',n:'EV Regression Customer',am:true,ms:'ev',ap:2275,ao:4800,mi:10000,hk:2500,ve:3.2,ti:2,rg:11,ep:10,vat:'5',away:0};
const snapshot={customer_name:'EV Regression Customer',ev_state:{meter_mode:'meter',meter_source:'ev',meter_peak_kwh:2275,meter_offpeak_kwh:4800,uw_services:3,region:11,vat_percent:5,annual_mileage:10000,vehicle_efficiency_mi_kwh:3.2,ev_offpeak_pct:10}};
async function verify(browser,cloud){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 if(cloud)await page.route('**/consolidated-v1/specialist-share-v1.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.AppointmentCompanionSpecialistShare={read:async()=>({snapshot:'+JSON.stringify(snapshot)+'})};'}));
 await page.route('https://**/*',r=>r.abort());
 const url=base+(cloud?'?s=smoketest&for=ev-test':'?local=1#p2='+Buffer.from(JSON.stringify(sample)).toString('base64url'));
 try{
  await page.goto(url,{waitUntil:'commit',timeout:12000});
  await page.locator('#personalSplashOk').waitFor({state:'visible',timeout:16000});
  await page.waitForTimeout(1600);
  await page.locator('#personalSplashOk').click({timeout:6000});
  await page.waitForTimeout(2000);
  const result=await page.evaluate(()=>{
   const header=document.querySelector('.wrap>header');
   const title=header&&header.querySelector('.title-row');
   const gear=document.getElementById('acV250Gear');
   const day=document.getElementById('acMeterPeak');
   const night=document.getElementById('acMeterNight');
   // Reproduce the detached-gear case that used to throw NotFoundError.
   if(header&&title&&gear&&gear.parentElement===title)header.appendChild(gear);
   document.dispatchEvent(new Event('ac:ev-comparison'));
   return {title:!!title,gear:!!gear,day:day&&day.value,night:night&&night.value,opened:document.documentElement.classList.contains('shared-started')};
  });
  await page.waitForTimeout(2500);
  assert(result.title&&result.gear,'EV shared header and settings should exist');
  assert(result.opened,'Customer EV summary opens');
  assert.equal(result.day,'2275','Peak kWh retained');
  assert.equal(result.night,'4800','Off-peak kWh retained');
  assert.deepEqual(errors,[],'No uncaught JavaScript errors in EV shared view');
  console.log((cloud?'Cloud-backed':'Portable')+' EV shared-link regression passed');
 }finally{await page.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{await verify(browser,false);await verify(browser,true);}finally{await browser.close();}
})().catch(e=>{console.error('EV regression failed',e.stack||e);process.exitCode=1});
