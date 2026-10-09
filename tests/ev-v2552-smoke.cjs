const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const base='http://127.0.0.1:8765/PWA/consolidated-v1/ev/';
const sample={v:'16C',n:'Browser Test',am:true,ms:'ev',ap:2275,ao:4800,mi:10000,hk:2500,ve:3.2,ti:2,rg:11,ep:10,vat:'5',away:0};
const snapshot={customer_name:'Browser Test',ev_state:{meter_mode:'meter',meter_source:'ev',meter_peak_kwh:2275,meter_offpeak_kwh:4800,uw_services:3,region:11,vat_percent:5,annual_mileage:10000,vehicle_efficiency_mi_kwh:3.2,ev_offpeak_pct:10}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function timed(p,ms){return Promise.race([p,wait(ms).then(()=>{throw Error('JS main thread blocked for '+ms+'ms')})])}
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
  welcome:document.querySelector('#customerWelcome small')?.textContent.trim()
 })),6500);
 console.log('UI '+JSON.stringify(view));
 assert(view.palette.includes('128, 83, 187'),'Purple customer colourway');
 assert.deepEqual(view.headers,['Energy only','Energy + 1 service','Energy + 2 services']);
 assert.deepEqual(view.services,['Energy only','+1','+2']);
 assert(view.welcome.includes('fixed Economy 7'),'Self-service message visible');
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
   welcome:document.querySelector('#customerWelcome small')?.textContent.trim()
 })),6500);
 console.log('PROSPECTIVE OPEN '+JSON.stringify(after));
 assert(after.open&&after.hidden&&!after.mode,'Prospective EV opens estimated mode');
 assert.deepEqual(after.headers,['Energy only','Energy + 1 service','Energy + 2 services']);
 assert(after.welcome.includes('fixed Economy 7'));
 assert.deepEqual(errors,[],'No JS exceptions opening prospective EV');
 await page.close();console.log('PROSPECTIVE SUCCESS');
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

(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{await run(browser,false);await run(browser,true);await newCustomer(browser);await prospective(browser)}finally{await browser.close()}})().catch(e=>{console.error('SMOKE FAILURE',e.stack);process.exitCode=1});
