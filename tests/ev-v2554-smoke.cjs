const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8765/PWA/consolidated-v1/ev/';
const sample={v:'16C',n:'Browser Test',am:true,ms:'ev',ap:2275,ao:4800,mi:10000,hk:2500,ve:3.2,ti:2,rg:11,ep:10,vat:'5',away:0};
const snapshot={customer_name:'Browser Test',ev_state:{meter_mode:'meter',meter_source:'ev',meter_peak_kwh:2275,meter_offpeak_kwh:4800,uw_services:3,region:11,vat_percent:5,annual_mileage:10000,vehicle_efficiency_mi_kwh:3.2,ev_offpeak_pct:10}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function timed(p,ms){return Promise.race([p,wait(ms).then(()=>{throw Error('JS main thread blocked for '+ms+'ms')})])}

function inspectHeroGeometry(){
 const hero=document.querySelector('.hero'),grid=hero?.querySelector('.hero-grid');
 const buttons=document.getElementById('serviceButtons'),period=document.getElementById('periodToggle');
 const fuel=hero?.querySelector('.ac-ev-fuel-button'),topline=document.getElementById('acEvToplineV2554');
 const tariff=hero?.querySelector('.hero-footer-v16c>.hero-tariff');
 const b=buttons?.getBoundingClientRect(),p=period?.getBoundingClientRect(),g=grid?.getBoundingClientRect(),f=fuel?.getBoundingClientRect(),top=topline?.getBoundingClientRect(),t=tariff?.getBoundingClientRect();
 return{
  buttons:b?.toJSON(),period:p?.toJSON(),grid:g?.toJSON(),fuel:f?.toJSON(),topline:top?.toJSON(),tariff:t?.toJSON(),
  fuelVisible:!!fuel&&fuel.checkVisibility()&&!fuel.hidden,
  sharedProspective:document.documentElement.classList.contains('shared-view')&&
    !document.documentElement.classList.contains('ac-metered-mode')&&
    document.documentElement.dataset.evJourney!=='existing',
  fuelInFooter:!!fuel&&fuel.parentNode===hero?.querySelector('.hero-footer-v16c'),
  mainModeHidden:(()=>{let x=document.querySelector('#acMeterModeCard>.ac-meter-choices');return x?getComputedStyle(x).display==='none':null})(),
  settingsChooser:!!document.querySelector('#acV250Modal .ac-v250-body #acEvChangeSituation')
 };
}
function assertHeroGeometry(g,label){
 assert(g&&g.buttons&&g.period&&g.grid&&g.topline&&g.tariff,label+' geometry present');
 assert(Math.abs(g.buttons.bottom-g.period.bottom)<=8,label+' service and period controls share a row');
 assert(g.buttons.right<=g.period.left-3,label+' service and period controls do not overlap');
 assert(g.buttons.top>=g.grid.bottom-3,label+' controls sit below usage cards');
 assert(g.tariff.top>=Math.max(g.buttons.bottom,g.period.bottom)-2,label+' tariff label is below controls');
 assert.equal(g.mainModeHidden,true,label+' mode buttons hidden from main page');
 if(g.fuelVisible){
  if(g.sharedProspective){
   assert(g.fuelInFooter,label+' petrol button is in the customer hero footer');
   assert(g.fuel.right<=g.period.left+3&&g.period.left-g.fuel.right<=14,label+' petrol button immediately left of Monthly/Yearly');
   assert(Math.abs((g.fuel.top+g.fuel.bottom)/2-(g.period.top+g.period.bottom)/2)<10,label+' fuel and period controls aligned');
  }else{
   assert(g.fuel.top>=g.topline.top-2&&g.fuel.bottom<=g.grid.top+1,label+' Partner petrol button above usage cards');
  }
  assert(g.fuel.width<=32&&g.fuel.height<=32,label+' petrol button smaller');
 }
}

async function run(browser,cloud){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 page.on('requestfailed',req=>requests.push(req.url()+' '+(req.failure()?.errorText||'')));
 if(cloud)await page.route('**/consolidated-v1/specialist-share-v1.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.AppointmentCompanionSpecialistShare={read:async()=>({snapshot:'+JSON.stringify(snapshot)+'})};'}));
 await page.route('https://**/*',r=>r.abort());
 const url=base+(cloud?'?s=smoketest&for=browser-test':'?local=1#p2='+Buffer.from(JSON.stringify(sample)).toString('base64url'));
 console.log('START '+(cloud?'CLOUD':'PORTABLE'));
 await page.goto(url,{waitUntil:'commit',timeout:10000});
 await wait(3500);
 const before=await timed(page.evaluate(()=>{
   const b=document.getElementById('personalSplashOk');
   return {button:b?.textContent,disabled:b?.disabled,clickHandler:typeof b?.onclick,summary:document.querySelectorAll('#acSharedAssumptions .ac-v254-welcome-stat').length,classes:document.documentElement.className,scripts:document.scripts.length};
 }),6500);
 console.log('BEFORE '+JSON.stringify(before));
 assert.equal(before.summary,3,'three cards');
 assert.equal(before.disabled,false,'button enabled');
 await page.locator('#personalSplashOk').click({timeout:4500});
 await wait(800);
 const after=await timed(page.evaluate(()=>{
   const s=document.getElementById('personalSplash');
   return {root:document.documentElement.className,hidden:s?.classList.contains('fade')||s?.style.display==='none',button:document.getElementById('personalSplashOk')?.textContent,day:document.getElementById('acMeterPeak')?.value,night:document.getElementById('acMeterNight')?.value};
 }),6500);
 console.log('AFTER '+JSON.stringify(after));
 assert(after.hidden,'welcome should dismiss');
 assert(after.root.includes('shared-started'),'EV engine starts');
 await wait(3000);
 const controls=await timed(page.evaluate(()=>({day:document.getElementById('acMeterPeak')?.value,night:document.getElementById('acMeterNight')?.value,failed:document.getElementById('acEvShareLoading')?.className})),6500);
 console.log('CONTROLS '+JSON.stringify(controls));
 assert.equal(controls.day,'2275');
 assert.equal(controls.night,'4800');
 const view=await timed(page.evaluate(()=>({
  palette:getComputedStyle(document.querySelector('.hero')).backgroundImage,
  headers:[...document.querySelectorAll('#th0,#th1,#th2')].map(x=>x.textContent.trim()),
  services:[...document.querySelectorAll('#serviceButtons button[data-tier]')].map(x=>x.querySelector('.num')?.textContent.trim()),
  welcome:document.querySelector('#customerWelcome small')?.textContent.trim(),
  badge:document.querySelector('#acEvModeLabel')?.textContent,
  journey:document.documentElement.dataset.evJourney,
  serviceGeometry:(()=>{let s=document.querySelector('.hero-service-row')?.getBoundingClientRect(),g=document.querySelector('.hero-grid')?.getBoundingClientRect();return s&&g?{serviceTop:s.top,gridBottom:g.bottom}:null})()
 })),6500);
 console.log('UI '+JSON.stringify(view));
 assert(view.palette.includes('132, 116, 202'),'Cool blue-purple customer colourway');
 assert.deepEqual(view.headers,['Energy only','Energy + 1 service','Energy + 2 services']);
 assert.deepEqual(view.services,['Energy only','+1','+2']);
 assert(view.welcome.includes('fixed Economy 7'),'Self-service message visible');
 assert.equal(view.journey,'existing');
 assert(view.badge.includes('Already owns an EV'));
 assert(view.serviceGeometry && view.serviceGeometry.serviceTop>=view.serviceGeometry.gridBottom-3,'Service buttons sit below usage cards');
 const heroLayout=await timed(page.evaluate(inspectHeroGeometry),6500);
 console.log('HERO LAYOUT '+JSON.stringify(heroLayout));
 assertHeroGeometry(heroLayout,cloud?'Cloud existing EV':'Portable existing EV');
 console.log('ERRORS '+JSON.stringify(errors.slice(0,4)));
 assert.equal(errors.length,0,'No uncaught JavaScript errors after opening the shared calculator');
 console.log((cloud?'CLOUD':'PORTABLE')+' SUCCESS');
 await page.close({runBeforeUnload:false});
}
async function prospective(browser){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>r.abort());
 const state={v:'16C',n:'Prospective customer',am:false,ms:'ev',mi:10000,hk:2500,ve:3.2,vi:'🚙',ti:2,rg:11,ep:10,aw:0,vat:'5'};
 const url=base+'?local=1#p2='+Buffer.from(JSON.stringify(state)).toString('base64url');
 console.log('START PROSPECTIVE EV');
 await page.goto(url,{waitUntil:'commit',timeout:10000});await wait(2800);
 const before=await timed(page.evaluate(()=>({values:[...document.querySelectorAll('#acSharedAssumptions .ac-v254-welcome-stat strong')].map(x=>x.textContent),btn:document.getElementById('personalSplashOk')?.disabled})),6500);
 console.log('PROSPECTIVE CARDS '+JSON.stringify(before));
 assert.deepEqual(before.values,['3,375','2,250','5,625'],'Prospective home + vehicle estimates on three cards');
 assert.equal(before.btn,false);
 await page.locator('#personalSplashOk').click({timeout:4500});await wait(3500);
 const after=await timed(page.evaluate(()=>({
   open:document.documentElement.classList.contains('shared-started'),
   hidden:document.getElementById('personalSplash')?.style.display==='none',
   mode:document.documentElement.classList.contains('ac-metered-mode'),
   headers:[...document.querySelectorAll('#th0,#th1,#th2')].map(x=>x.textContent.trim()),
   welcome:document.querySelector('#customerWelcome small')?.textContent.trim(),
   palette:getComputedStyle(document.querySelector('.hero')).backgroundImage,
   badge:document.querySelector('#acEvModeLabel')?.textContent,
   serviceGeometry:(()=>{let s=document.querySelector('.hero-service-row')?.getBoundingClientRect(),g=document.querySelector('.hero-grid')?.getBoundingClientRect();return s&&g?{serviceTop:s.top,gridBottom:g.bottom}:null})()
 })),6500);
 console.log('PROSPECTIVE OPEN '+JSON.stringify(after));
 assert(after.open&&after.hidden&&!after.mode,'Prospective EV opens estimated mode');
 assert.deepEqual(after.headers,['Energy only','Energy + 1 service','Energy + 2 services']);
 assert(after.welcome.includes('fixed Economy 7'));
 assert(after.palette.includes('181, 106, 167'),'Warm plum customer colourway');
 assert(after.badge.includes('Considering an EV'));
 assert(after.serviceGeometry && after.serviceGeometry.serviceTop>=after.serviceGeometry.gridBottom-3,'Prospective service row sits below cards');
 const heroLayout=await timed(page.evaluate(inspectHeroGeometry),6500);
 console.log('PROSPECTIVE HERO LAYOUT '+JSON.stringify(heroLayout));
 assertHeroGeometry(heroLayout,'Prospective EV');
 assert.deepEqual(errors,[],'No JS exceptions opening prospective EV');
 await page.close();console.log('PROSPECTIVE SUCCESS');
}

async function partnerPalette(browser){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>r.abort());
 await page.goto(base+'?local=1',{waitUntil:'commit',timeout:10000});await wait(3900);
 const current=()=>page.evaluate(()=>({mode:document.documentElement.classList.contains('ac-metered-mode'),palette:getComputedStyle(document.querySelector('.hero')).backgroundImage,badge:document.querySelector('#acEvModeLabel')?.textContent}));
 const before=await timed(current(),6500);
 console.log('PARTNER CONSIDERING',JSON.stringify(before));
 assert(before.palette.includes('199, 104, 117'),'Red Partner mode');
 assert(before.badge.includes('Considering an EV'),'Prospective mode label');
 await page.evaluate(()=>document.querySelector('.ac-ev-fuel-button')?.click());
 await wait(150);
 assert(await page.evaluate(()=>document.querySelector('#acEvFuelModal')?.classList.contains('open')),'Compact petrol button still opens comparison modal');
 await page.evaluate(()=>document.querySelector('#acEvFuelClose')?.click());
 await page.evaluate(()=>{
  document.querySelector('#serviceButtons button[data-tier="1"]')?.click();
  document.querySelector('#periodToggle button[data-period="year"]')?.click();
 });
 await wait(180);
 const changed=await page.evaluate(()=>({
  tier:document.querySelector('#serviceButtons button.on')?.dataset.tier,
  period:document.querySelector('#periodToggle button.on')?.dataset.period
 }));
 assert.deepEqual(changed,{tier:'1',period:'year'},'Moved service and annual controls still work');
 const rearranged=await timed(page.evaluate(inspectHeroGeometry),6500);
 assertHeroGeometry(rearranged,'Partner after selecting +1 and Yearly');

 const pre=await page.evaluate(()=>({
  settingsControl:!!document.querySelector('#acV250Modal .ac-v250-body #acEvChangeSituation'),
  mainToggleHidden:getComputedStyle(document.querySelector('#acMeterModeCard>.ac-meter-choices')).display==='none'
 }));
 assert(pre.settingsControl&&pre.mainToggleHidden,'Situation choices live in Settings only');
 await page.evaluate(()=>{
  const existingDialog=document.getElementById('acEvSituationDialog');
  if(existingDialog)existingDialog.querySelector('[data-ev-situation="estimate"]')?.click();
  document.getElementById('acEvChangeSituation')?.click();
 });
 await wait(130);
 const chooser=await page.evaluate(()=>!!document.getElementById('acEvSituationDialog'));
 assert(chooser,'Settings opens the EV situation chooser');
 await page.evaluate(()=>document.querySelector('#acEvSituationDialog [data-ev-situation="meter"]')?.click());
 await wait(1400);
 const after=await timed(current(),6500);
 console.log('PARTNER EXISTING',JSON.stringify(after));
 assert(after.mode,'Existing owner selected');
 assert(after.palette.includes('54, 143, 202'),'Blue Partner mode');
 assert(after.badge.includes('Already owns an EV'),'Owner mode label');
 assert.deepEqual(errors,[],'No new Partner view JS errors');
 await page.close();
}

async function newCustomer(browser){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.route('https://**/*',r=>r.abort());
 console.log('START NEW CUSTOMER');
 await page.goto('http://127.0.0.1:8765/PWA/consolidated-v1/?local=1',{waitUntil:'commit',timeout:10000});
 await page.locator('#customerName').waitFor({state:'attached',timeout:14000});
 await page.locator('[data-cloud-action="new-customer"]').waitFor({state:'attached',timeout:14000});
 await wait(1300);
 await page.locator('#customerName').fill('Browser Test Customer',{timeout:6000});
 await page.evaluate(()=>{
   document.getElementById('cloudActionMenu').click();
   document.querySelector('[data-cloud-action="new-customer"]').click();
 });
 await wait(650);
 const guard=await timed(page.evaluate(()=>({
   modal:document.getElementById('acProfileSwitchGuard')?.classList.contains('open'),
   menu:document.getElementById('cloudMenuPopover')?.classList.contains('open'),
   name:document.getElementById('customerName')?.value
 })),6000);
 console.log('NEW GUARD '+JSON.stringify(guard));
 assert(guard.modal,'The save-and-close modal must open for edited details');
 assert.equal(guard.menu,false,'New customer closes the action menu');
 assert.equal(guard.name,'Browser Test Customer','Previous customer is not discarded before confirmation');
 await page.evaluate(()=>document.querySelector('[data-switch-choice="stay"]').click());
 await wait(100);
 assert.equal(await page.locator('#customerName').inputValue(),'Browser Test Customer','Stay keeps the unsaved customer visible');
 console.log('NEW CUSTOMER SAFETY SUCCESS');
 await page.close();
}

(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{await run(browser,false);await run(browser,true);await newCustomer(browser);await prospective(browser);await partnerPalette(browser)}finally{await browser.close()}})().catch(e=>{console.error('SMOKE FAILURE',e.stack);process.exitCode=1});
