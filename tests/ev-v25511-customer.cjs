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
   fake.tariffLive.push({region_no:11,payment_method:'dd',valid_from:'2026-10-01',tariff_type:'variable_ev',tariff_name:'EV '+suffix,EDSC_Std:52,EUR_EV_Peak:30,EUR_EV_OffPeak:8,EUR_Std:30,EDSC_E7:52,EUR_E7_Day:30,EUR_E7_Night:8});
   fake.tariffLive.push({region_no:11,payment_method:'dd',valid_from:'2026-10-01',tariff_type:'variable',tariff_name:suffix,EDSC_Std:52,EUR_Std:32,EDSC_E7:52,EUR_E7_Day:35,EUR_E7_Night:18});
   fake.tariffLive.push({region_no:11,payment_method:'dd',valid_from:'2026-10-01',tariff_type:'fixed',tariff_name:t===2?'Fixed Saver':t===1?'Fixed':'Fixed Start',EDSC_Std:50,EUR_Std:30,EDSC_E7:50,EUR_E7_Day:31,EUR_E7_Night:15});
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
 await page.waitForSelector('#acV254SourceText',{state:'attached',timeout:12000});
 await page.waitForTimeout(240);
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
   const rects=actions.map(x=>(x.getClientRects()[0]||x.getBoundingClientRect()).toJSON());
   const sub=document.querySelector('.personal-splash-sub');
   return {
     meterInSettings:!!settings&&!!meter&&settings.contains(meter),
     originInSettings:!!settings&&!!origin&&settings.contains(origin),
     sourceValue:origin?.value,
     readings:[document.getElementById('acMeterPeak')?.value,document.getElementById('acMeterNight')?.value],
     meterVisible:!!meter&&meter.checkVisibility(),
     badgeHidden:!!badge&&getComputedStyle(badge).display==='none',
     topLineHidden:!document.getElementById('acEvToplineV2554')||getComputedStyle(document.getElementById('acEvToplineV2554')).display==='none',
     heading:heading?.textContent,
     fiveButtons:actions.map(x=>({label:x.textContent,stress:x.dataset.stress,on:x.classList.contains('on')})),
     positions:rects.map(r=>({x:r.x,y:r.y,width:r.width,height:r.height})),
     btnContainer:{display:getComputedStyle(document.getElementById('stressButtons')).display,columns:getComputedStyle(document.getElementById('stressButtons')).gridTemplateColumns,width:document.getElementById('stressButtons').getBoundingClientRect().width},
     currentNode:(()=>{const node=document.querySelector('#stressButtons [data-stress="0"]');return{html:node?.outerHTML,hidden:node?.hidden,display:getComputedStyle(node).display,visibility:getComputedStyle(node).visibility,opacity:getComputedStyle(node).opacity,transform:getComputedStyle(node).transform,position:getComputedStyle(node).position,scale:getComputedStyle(node).scale,zoom:getComputedStyle(node).zoom,offsetLeft:node?.offsetLeft,offsetTop:node?.offsetTop,offsetHeight:node?.offsetHeight,checkVisibility:node?.checkVisibility(),clipPath:getComputedStyle(node).clipPath,contentVisibility:getComputedStyle(node).contentVisibility,contain:getComputedStyle(node).contain,rects:Array.from(node.getClientRects()).map(r=>r.toJSON()),inlineStyle:node?.getAttribute('style'),offsetWidth:node?.offsetWidth,parentDisplay:getComputedStyle(node.parentElement).display}})(),
     meterTree:{settingsOpen:settings?.open,visibility:meter?.checkVisibility(),style:getComputedStyle(meter).display,parent:meter?.parentNode?.className,bodyStyle:getComputedStyle(settings.querySelector('.ac-ev-customer-settings-body')).display},
     aligned:rects.length===5&&rects.every(r=>Math.abs(r.top-rects[0].top)<=2),
     nonOverlapping:rects.every((r,i)=>i===0||r.left>=rects[i-1].right-1),
     splashSourceHidden:!!sub&&(sub.style.display==='none'||getComputedStyle(sub).display==='none')
   };
 });
 console.log('CUSTOMER CLEAN '+JSON.stringify(compact));
 assert(compact.meterInSettings&&compact.originInSettings,'Annual readings and usage origin relocated into settings');
 const initialHint=await page.evaluate(()=>({
   text:document.getElementById('acEvTwoSimHint')?.textContent,
   visible:document.getElementById('acEvTwoSimHint')?.checkVisibility()&&!document.getElementById('acEvTwoSimHint')?.hidden,
   selected:document.querySelector('#serviceButtons button.on')?.dataset.tier
 }));
 console.log('TWO SIMS '+JSON.stringify(initialHint));
 assert.equal(initialHint.selected,'2','Two extra services selected by default');
 assert(initialHint.visible&&initialHint.text.includes('two £6 mobile SIMs'),'Two-SIM example visible at +2');
 assert(initialHint.text.includes('gas'),'Potential gas savings mentioned, without quoting a number');
 await page.locator('#serviceButtons button[data-tier="1"]').click();
 await page.waitForFunction(()=>document.querySelector('#serviceButtons button.on')?.dataset.tier==='1'&&document.getElementById('acEvTwoSimHint')?.hidden,{timeout:7000});
 await page.locator('#serviceButtons button[data-tier="0"]').click();
 await page.waitForFunction(()=>document.querySelector('#serviceButtons button.on')?.dataset.tier==='0'&&document.getElementById('acEvTwoSimHint')?.hidden,{timeout:7000});
 await page.locator('#serviceButtons button[data-tier="2"]').click();
 await page.waitForFunction(()=>document.querySelector('#serviceButtons button.on')?.dataset.tier==='2'&&!document.getElementById('acEvTwoSimHint')?.hidden,{timeout:7000});

 assert.deepEqual(compact.readings,['2275','4800'],'Real existing-EV annual readings remain unchanged');
 assert.equal(compact.sourceValue,'bill_estimate','Source preserved');
 assert(!compact.meterVisible,'Expanded annual input card is hidden until settings opened');
 assert(compact.badgeHidden&&compact.topLineHidden,'Recipient no longer sees redundant owner slug');
 assert(compact.heading.includes('Home + EV estimated annual consumption'),'Annual usage heading is meaningful');
 assert(compact.splashSourceHidden,'Share launch does not repeat the usage source');
 assert.deepEqual(compact.fiveButtons.map(x=>x.stress),['0','5','15','21','25'],'Five scenarios including forecast');
 assert(compact.fiveButtons[0].on,'Current scenario selected by default');
 assert(compact.aligned&&compact.nonOverlapping,'Five forecast buttons form one non-overlapping row');

 const layout=await page.evaluate(()=>{
  const hero=document.querySelector('.hero'),footer=hero?.querySelector('.hero-footer-v16c');
  const tariff=footer?.querySelector('.hero-tariff'),vat=document.getElementById('acV2482Vat');
  const row=document.getElementById('acEvRateVatRow'),strip=document.querySelector('.strip:has(#rateStrip)');
  const settings=document.getElementById('acEvCustomerSettings'),comparison=document.getElementById('acEvFixedDetails');
  const rate=document.getElementById('rateStrip')?.textContent||'';
  const v=vat?.getBoundingClientRect(),h=hero?.getBoundingClientRect(),r=row?.getBoundingClientRect(),st=strip?.getBoundingClientRect();
  return {
   vatAboveHero:!!h&&!!v&&v.bottom<h.top+1,
   vatInStatusRow:!!vat&&!!row&&vat.parentNode===row,
   stripInStatusRow:!!strip&&!!row&&strip.parentNode===row,
   tariffInHero:!!tariff,
   vatVisible:!!vat&&vat.checkVisibility(),
   vatButtonCount:vat?.querySelectorAll('button[data-ac-vat]').length,
   aligned:!!st&&!!v&&Math.abs((st.top+st.bottom)/2-(v.top+v.bottom)/2)<18,
   nonOverlap:!!st&&!!v&&st.right<=v.left+2,
   fits:!!r&&!!v&&v.right<=r.right+2,
   afterFixed:comparison?.nextElementSibling===settings,
   rates:rate
  };
 });
 console.log('CUSTOMER LAYOUT '+JSON.stringify(layout));
 assert(layout.vatAboveHero&&layout.vatInStatusRow&&layout.stripInStatusRow,'VAT is next to status line above purple hero');
 assert(layout.tariffInHero,'Selected tariff name remains inside hero');
 const ownerFuel=await page.evaluate(()=>{
   const f=document.querySelector('.ac-ev-fuel-button');
   return {hidden:!!f&&(!f.checkVisibility()||f.hidden),absentFromFooter:!!f&&!document.querySelector('.hero-footer-v16c')?.contains(f)};
 });
 assert(ownerFuel.hidden,'Existing EV recipient has no petrol/diesel control');
 assert(ownerFuel.absentFromFooter,'Existing EV recipient has no fuel shortcut alongside Monthly/Yearly');

 assert(layout.vatVisible&&layout.vatButtonCount===2,'Real 5%/0% selector remains');
 assert(layout.aligned&&layout.nonOverlap&&layout.fits,'Status and VAT share a non-overlapping row');
 assert(layout.afterFixed,'Figures/settings remains below fixed-price question');
 assert(layout.rates.includes('EV rates:')&&layout.rates.includes('11 East Mids')&&layout.rates.includes('Direct Debit')&&layout.rates.includes('5% VAT incl'),'Dynamic compact EV rate line unchanged');
 await page.locator('#acEvVatHelp summary').click();
 const help=await page.evaluate(()=>{
  const e=document.getElementById('acEvVatNote'),r=e?.getBoundingClientRect();
  return {open:document.getElementById('acEvVatHelp')?.open,visible:e?.checkVisibility(),left:r?.left,right:r?.right};
 });
 assert(help.open&&help.visible&&help.left>=0&&help.right<=390,'VAT explanation opens within mobile viewport');
 await page.locator('#acEvVatHelp summary').click();
 await page.locator('#acV2482Vat [data-ac-vat="0"]').click();
 await page.waitForFunction(()=>document.getElementById('rateStrip')?.textContent.includes('0% VAT temporary'),null,{timeout:6000});
 assert((await page.locator('#acV2482Vat [data-ac-vat="0"]').getAttribute('aria-pressed'))==='true','Moved 0% VAT control updates calculation');
 await page.locator('#acV2482Vat [data-ac-vat="5"]').click();
 await page.waitForFunction(()=>document.getElementById('rateStrip')?.textContent.includes('5% VAT incl'),null,{timeout:6000});
 assert((await page.locator('#acV2482Vat [data-ac-vat="5"]').getAttribute('aria-pressed'))==='true','Moved 5% VAT control restores default');

 await page.setViewportSize({width:360,height:800});
 await page.waitForTimeout(80);
 const narrow=await page.evaluate(()=>{
   const h=document.querySelector('.hero')?.getBoundingClientRect();
   const row=document.getElementById('acEvRateVatRow'),strip=row?.querySelector('.strip'),vat=row?.querySelector('#acV2482Vat');
   const s=strip?.getBoundingClientRect(),v=vat?.getBoundingClientRect(),r=row?.getBoundingClientRect();
   return {aboveHero:!!h&&!!v&&v.bottom<h.top+1,aligned:!!s&&!!v&&Math.abs((s.top+s.bottom)/2-(v.top+v.bottom)/2)<26,nonOverlap:!!s&&!!v&&s.right<=v.left+2,withinRow:!!r&&!!v&&v.right<=r.right+2};
 });
 console.log('NARROW STATUS/VAT '+JSON.stringify(narrow));
 assert(narrow.aboveHero&&narrow.aligned&&narrow.nonOverlap&&narrow.withinRow,'Status and VAT stay above hero at 360px');
 await page.setViewportSize({width:390,height:844});


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
 assert(await page.locator('#acEvTwoSimHint').isVisible(),'Two-SIM hint also shown for customers considering EV at +2');
 const prospectLayout=await page.evaluate(()=>({
   footer:document.getElementById('acV2482Vat')?.parentNode?.className,
   settingsAfter:document.getElementById('acEvFixedDetails')?.nextElementSibling?.id,
   rate:document.getElementById('rateStrip')?.textContent
 }));
 assert(prospectLayout.footer.includes('ac-ev-rate-vat-row'),'VAT sits beside EV rates in prospective customer view');
 assert.equal(prospectLayout.settingsAfter,'acEvCustomerSettings','Prospective EV settings follow the fixed question');
 assert(prospectLayout.rate.includes('11 East Mids'),'Prospective rate strip shortened');

 async function testFuelRow(width){
   await page.setViewportSize({width,height:844});
   await page.waitForTimeout(120);
   const state=await page.evaluate(()=>{
     const hero=document.querySelector('.hero'),footer=hero?.querySelector('.hero-footer-v16c');
     const fuel=hero?.querySelector('.ac-ev-fuel-button'),period=footer?.querySelector('#periodToggle');
     const top=document.getElementById('acEvToplineV2554');
     const vat=document.getElementById('acV2482Vat'),rateRow=document.getElementById('acEvRateVatRow');
     const f=fuel?.getBoundingClientRect(),p=period?.getBoundingClientRect(),h=hero?.getBoundingClientRect();
     return {
       fuelInFooter:!!fuel&&fuel.parentElement===footer,
       fuelVisible:!!fuel&&fuel.checkVisibility()&&!fuel.hidden,
       periodAfterFuel:!!fuel&&fuel.nextElementSibling===period,
       sameRow:!!f&&!!p&&Math.abs((f.top+f.bottom)/2-(p.top+p.bottom)/2)<10,
       fuelLeftOfPeriod:!!f&&!!p&&f.right<=p.left+3&&p.left-f.right<=14,
       insideHero:!!f&&!!h&&f.left>=h.left-2&&f.right<=h.right+2,
       size: f?{w:f.width,h:f.height}:null,
       emptyTopHidden:!top||getComputedStyle(top).display==='none',
       vatWithRate:vat?.parentElement===rateRow && !!h && vat.getBoundingClientRect().bottom<=h.top+2
     };
   });
   console.log('PROSPECTIVE HERO '+width+'px '+JSON.stringify(state));
   assert(state.fuelInFooter&&state.fuelVisible&&state.periodAfterFuel,'Petrol button is immediately before Monthly/Yearly');
   assert(state.sameRow&&state.fuelLeftOfPeriod&&state.insideHero,'Petrol button visually shares Monthly/Yearly row without overlap');
   assert(state.size.w<=32&&state.size.h<=32,'Petrol button is compact');
   assert(state.emptyTopHidden,'Unused top mode row remains hidden for customer');
   assert(state.vatWithRate,'VAT stays alongside EV rates above the hero');
 }
 await testFuelRow(390);
 await testFuelRow(360);
 await page.setViewportSize({width:390,height:844});
 await page.locator('.hero-footer-v16c > .ac-ev-fuel-button').click();
 assert(await page.locator('#acEvFuelModal').evaluate(n=>n.classList.contains('open')),'Petrol comparison modal opens from relocated shortcut');
 await page.locator('#acEvFuelClose').click();
 assert(!await page.locator('#acEvFuelModal').evaluate(n=>n.classList.contains('open')),'Petrol comparison modal closes');
 await page.locator('#periodToggle button[data-period="year"]').click();
 await page.waitForFunction(()=>document.querySelector('#periodToggle button.on')?.dataset.period==='year',null,{timeout:7000});
 await testFuelRow(390);
 await page.locator('#periodToggle button[data-period="month"]').click();



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
 assert(await page.locator('#acEvTwoSimHint').isVisible(),'Partner can also see the contextual +2 services hint');
 console.log('PARTNER PASS');await page.close();
}
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{await check(browser,false);await check(browser,true);await prospective(browser);await partner(browser)}finally{await browser.close()}})().catch(e=>{console.error('EV CUSTOMER SMOKE FAILURE',e.stack);process.exitCode=1});
