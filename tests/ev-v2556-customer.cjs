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
 assert(before.collapsed&&before.allCollapsed&&before.settingsCollapsed,'Three progressive disclosures collapsed');
 assert(before.prepared.includes('Customer sample'),'Compact personal touch');
 assert(before.basketButton.includes('Go to my UW basket'),'Basket CTA available');
 assert(before.current==='Current UW rates','Current price labels');
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
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{await check(browser,false);await check(browser,true);await partner(browser)}finally{await browser.close()}})().catch(e=>{console.error('EV CUSTOMER SMOKE FAILURE',e.stack);process.exitCode=1});
