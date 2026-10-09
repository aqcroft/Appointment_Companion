'use strict';
const { chromium }=require('playwright'),assert=require('node:assert/strict');
const base='http://127.0.0.1:8765/PWA/consolidated-v1/ev/';
const sample={v:'16C',n:'Customer sample',am:true,ms:'ev',ap:2275,ao:4800,mi:10000,hk:2500,ve:3.2,ti:2,rg:11,ep:10,vat:'5',away:0,b:'https://example.org/test-basket'};
const snapshot={customer_name:'Customer sample',basket_url:'https://example.org/test-basket',ev_state:{meter_mode:'meter',meter_source:'ev',meter_peak_kwh:2275,meter_offpeak_kwh:4800,uw_services:3,region:11,vat_percent:5,annual_mileage:10000,vehicle_efficiency_mi_kwh:3.2,ev_offpeak_pct:10,away_pct:0}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function check(browser,cloud){
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 if(cloud)await page.route('**/consolidated-v1/specialist-share-v1.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.AppointmentCompanionSpecialistShare={read:async()=>({snapshot:'+JSON.stringify(snapshot)+'})};'}));
 await page.route('https://**/*',r=>r.abort());
 // Deterministic tariff feed verifies prices from calculator, not hard-coded examples.
 const fake={tariffLive:[]};
 for(const [t,suffix] of [[0,'Value'],[1,'Gold'],[2,'Double Gold']]){
   fake.tariffLive.push({region_no:11,payment_method:'dd',tariff_type:'variable_ev',tariff_name:'EV '+suffix,EDSC_Std:52,EUR_EV_Peak:30,EUR_EV_OffPeak:8,EUR_Std:30,EDSC_E7:52,EUR_E7_Day:30,EUR_E7_Night:8});
   fake.tariffLive.push({region_no:11,payment_method:'dd',tariff_type:'variable',tariff_name:suffix,EDSC_Std:52,EUR_Std:32,EDSC_E7:52,EUR_E7_Day:35,EUR_E7_Night:18});
   fake.tariffLive.push({region_no:11,payment_method:'dd',tariff_type:'fixed',tariff_name:t===2?'Fixed Saver':t===1?'Fixed':'Fixed Start',EDSC_Std:50,EUR_Std:30,EDSC_E7:50,EUR_E7_Day:31,EUR_E7_Night:15});
 }
 await page.route('https://script.google.com/macros/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(fake)}));
 const url=base+(cloud?'?s=test-token&for=customer-sample':'?local=1#p2='+Buffer.from(JSON.stringify(sample)).toString('base64url'));
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:16000});
 await page.locator('#acSharedAssumptions .ac-v254-welcome-stat').first().waitFor({timeout:16000});
 const welcome=await page.locator('#acSharedAssumptions .ac-v254-welcome-basket').innerText();
 assert(welcome.includes('Your comparison starts with:'),'Concise opening heading');
 assert(welcome.includes('EV Double Gold'),'Starting EV tariff');
 assert(welcome.includes('5% electricity VAT included'),'VAT on share opening card');
 await page.waitForFunction(()=>document.getElementById('personalSplashOk')?.disabled===false,null,{timeout:14000});
 await page.locator('#personalSplashOk').click({timeout:6000});
 await page.waitForFunction(()=>document.documentElement.classList.contains('shared-started'),null,{timeout:12000});
 await page.waitForFunction(()=>document.querySelectorAll('#comparison tr[data-row]').length>=5,null,{timeout:18000});
 await page.waitForSelector('#acEvFixedDetails', {timeout:12000});
 await page.waitForSelector('#acEvSimpleRates .ac-ev-simple-rate', {state:'attached',timeout:12000});
 const before=await page.evaluate(()=>({
  collapsed:!document.getElementById('acEvFixedDetails').open,
  allCollapsed:!document.getElementById('acEvAllTariffs').open,
  settingsCollapsed:!document.getElementById('acEvCustomerSettings').open,
  prepared:document.getElementById('acEvPrepared')?.textContent,
  basketButton:document.getElementById('acEvOpenBasket')?.textContent,
  rates:document.getElementById('acEvSimpleRates')?.textContent,
  current:document.querySelector('[data-stress="0"]')?.textContent
 }));
 console.log((cloud?'CLOUD':'PORTABLE')+' START '+JSON.stringify(before));

 const compact=await page.evaluate(()=>{
   const settings=document.getElementById('acEvCustomerSettings'),meter=document.getElementById('acMeterModeCard'),origin=document.getElementById('acEvUsageOrigin');
   const badge=document.getElementById('acEvModeLabel'),heading=document.getElementById('acV254SourceText');
   const actions=[...document.querySelectorAll('#stressButtons button')];
   const rects=actions.map(x=>x.getBoundingClientRect().toJSON());
   const sub=document.querySelector('.personal-splash-sub');
   return {
     meterInSettings:!!settings&&!!meter&&settings.contains(meter),
     originInSettings:!!settings&&!!origin&&settings.contains(origin),
     sourceValue:origin?.value,
     readings:[document.getElementById('acMeterPeak')?.value,document.getElementById('acMeterNight')?.value],
     meterVisible:!!meter&&getComputedStyle(meter).display!=='none'&&meter.getClientRects().length>0,
     badgeHidden:!!badge&&getComputedStyle(badge).display==='none',
     topLineHidden:!document.getElementById('acEvToplineV2554')||getComputedStyle(document.getElementById('acEvToplineV2554')).display==='none',
     heading:heading?.textContent,
     fiveButtons:actions.map(x=>({label:x.textContent,stress:x.dataset.stress,on:x.classList.contains('on')})),
     aligned:rects.length===5&&rects.every(r=>Math.abs(r.top-rects[0].top)<=2),
     nonOverlapping:rects.every((r,i)=>i===0||r.left>=rects[i-1].right-1),
     splashSourceHidden:!!sub&&(sub.style.display==='none'||getComputedStyle(sub).display==='none')
   };
 });
 console.log('CUSTOMER CLEAN '+JSON.stringify(compact));
 assert(compact.meterInSettings&&compact.originInSettings,'Annual readings and usage origin relocated into settings');
 assert.deepEqual(compact.readings,['2275','4800'],'Real existing-EV annual readings remain unchanged');
 assert.equal(compact.sourceValue,'bill_estimate','Source preserved');
 assert(!compact.meterVisible,'Expanded annual input card is hidden until settings opened');
 assert(compact.badgeHidden&&compact.topLineHidden,'Recipient no longer sees redundant owner slug');
 assert(compact.heading.includes('Home + EV estimated annual consumption'),'Annual usage heading is meaningful');
 assert(compact.splashSourceHidden,'Share launch does not repeat the usage source');
 assert.deepEqual(compact.fiveButtons.map(x=>x.stress),['0','5','15','21','25'],'Five scenarios including forecast');
 assert(compact.fiveButtons[0].on,'Current scenario selected by default');
 assert(compact.aligned&&compact.nonOverlapping,'Five forecast buttons form one non-overlapping row');
 await page.locator('#acEvCustomerSettings > summary').click();
 const visibleInputs=await page.evaluate(()=>({
  peak:document.querySelector('#acMeterPeak')?.getBoundingClientRect().height,
  night:document.querySelector('#acMeterNight')?.getBoundingClientRect().height
 }));
 assert(visibleInputs.peak>0&&visibleInputs.night>0,'Original annual readings available after opening settings');
 await page.locator('#acEvCustomerSettings > summary').click();

 assert(before.collapsed&&before.allCollapsed&&before.settingsCollapsed,'Three progressive disclosures collapsed');
 assert(before.prepared.includes('Customer sample'),'Compact personal touch');
 assert(before.basketButton.includes('Go to my UW basket'),'Basket CTA available');
 assert.equal(before.current,'Current','Current is the first selected forecast option');
 assert(before.rates&&before.rates.includes('Economy 7'),'Fixed comparison exists');
 await page.locator('#acEvFixedDetails > summary').click();
 const open=await page.evaluate(()=>({outer:document.getElementById('acEvFixedDetails').open,full:document.getElementById('acEvAllTariffs').open,fore:document.querySelector('#stressButtons [data-stress="21"]')?.textContent}));
 console.log('FIXED '+JSON.stringify(open));
 assert(open.outer&&!open.full,'Only two alternative tariffs shown first');
 await page.locator('#acEvAllTariffs > summary').click();
 assert(await page.locator('#acEvAllTariffs').evaluate(n=>n.open),'Full matrix available');
 await page.locator('#stressButtons button[data-stress="21"]').click();
 assert((await page.locator('#stressButtons button[data-stress="21"]').getAttribute('class')).includes('on'),'Forecast scenario interactive');
 const forecast=await page.locator('#acEvForecastHelp');
 await forecast.locator('summary').click();
 assert((await forecast.locator('a').getAttribute('href')).includes('moneysavingexpert.com'),'Forecast source linked');
 await page.locator('#acEvOpenBasket').click();
 await page.locator('#acEvBasketDialog').waitFor({state:'visible'});
 const quote=await page.locator('#acEvBasketDialog').innerText();
 console.log('BASKET '+quote.slice(0,700).replace(/\n/g,' | '));
 assert(quote.includes('standard variable electricity'),'Initial quote tariff explained');
 assert(quote.includes('EV interest'),'EV application guidance');
 assert(quote.includes('per month'),'Monthly side-by-side numbers');
 const calculated=await page.evaluate(()=>window.__AC_EV_TRADEOFF);
 const initial='£'+Math.round(calculated.standard.total/12).toLocaleString('en-GB');
 const expectedEV='£'+Math.round(calculated.ev.total/12).toLocaleString('en-GB');
 assert(quote.includes(initial),'Initial electricity amount uses the standard variable tariff calculation');
 assert(quote.includes(expectedEV),'EV amount uses the selected EV tariff calculation');
 assert.notEqual(initial,expectedEV,'Two different electricity estimates are compared');
 console.log('CALCULATED electricity '+initial+' standard / '+expectedEV+' EV');
 const basketLink=await page.locator('#acEvBasketContinue').getAttribute('href');
 assert.equal(basketLink,'https://example.org/test-basket','Original customer basket preserved');
 await page.locator('#acEvBasketClose').click();
 assert.equal(await page.locator('#acEvBasketDialog').count(),0,'Closing does not navigate');
 assert.deepEqual(errors,[],'No browser JS errors');
 console.log((cloud?'CLOUD':'PORTABLE')+' PASS');
 await ctx.close();
}

async function prospective(browser){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const entry={v:'16C',n:'Future EV driver',am:false,ms:'ev',mi:10000,hk:2500,ve:3.2,ti:2,rg:11,ep:10,vat:'5',away:0};
 await page.route('https://**/*',r=>r.abort());
 await page.goto(base+'?local=1#p2='+Buffer.from(JSON.stringify(entry)).toString('base64url'),{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#acSharedAssumptions .ac-v254-welcome-stat',{timeout:15000});
 await page.waitForFunction(()=>document.getElementById('personalSplashOk')?.disabled===false,null,{timeout:12000});
 await page.locator('#personalSplashOk').click();
 await page.waitForSelector('#acEvFixedDetails',{timeout:16000});
 assert(await page.locator('#acEvModeLabel').evaluate(n=>getComputedStyle(n).display==='none'),'Prospective mode badge also hidden in customer view');
 const prospectiveButtons=await page.locator('#stressButtons button').allTextContents();
 assert.equal(prospectiveButtons.length,5,'Prospective customer gets five scenario buttons');

 await page.locator('#acEvCustomerSettings > summary').click();
 assert(await page.locator('#acEvCustomerSettings').evaluate(x=>x.open),'Advanced assumptions available for prospective EV');
 await page.locator('#acEvCustomerSettings > summary').click();
 const tiers=await page.locator('#serviceButtons button').count();assert.equal(tiers,3);
 await page.locator('#serviceButtons button[data-tier="1"]').click();
 await page.waitForFunction(()=>document.querySelector('#serviceButtons button.on')?.dataset.tier==='1',null,{timeout:7000});
 await page.locator('#acEvOpenBasket').click();
 assert(await page.locator('#acEvBasketDialog').isVisible(),'Prospective driver can open pre-basket guidance');
 assert((await page.locator('#acEvBasketDialog').innerText()).includes('EV interest'));
 await page.locator('#acEvBasketClose').click();
 assert.deepEqual(errors,[],'Prospective sharing produces no browser errors');
 await page.close();console.log('PROSPECTIVE PASS');
}

async function partner(browser){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await page.route('https://**/*',r=>r.abort());
 await page.goto(base+'?local=1',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('.tablewrap #comparison tr[data-row]',{timeout:16000});
 assert.equal(await page.locator('#acEvFixedDetails').count(),0,'Partner has unchanged full tariff table');
 assert.equal(await page.locator('#acEvCustomerSettings').count(),0,'Partner inputs not collapsed');
 assert(await page.locator('#serviceButtons button').count()===3,'Partner hero intact');
 console.log('PARTNER PASS');await page.close();
}
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{await check(browser,false);await check(browser,true);await prospective(browser);await partner(browser)}finally{await browser.close()}})().catch(e=>{console.error('EV CUSTOMER SMOKE FAILURE',e.stack);process.exitCode=1});
