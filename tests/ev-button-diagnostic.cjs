const { chromium }=require('playwright');
const origin='http://127.0.0.1:8765/PWA/consolidated-v1/ev/';
const sample={v:'16C',n:'Diagnostics',am:true,ms:'ev',ap:2275,ao:4800,mi:10000,hk:2500,ve:3.2,vi:'🚙',ti:2,rg:11,ep:10,vat:'5',aw:0,e7:15,df:true};
const snapshot={customer_name:'Diagnostics',ev_state:{meter_mode:'meter',meter_source:'ev',meter_peak_kwh:2275,meter_offpeak_kwh:4800,uw_services:3,region:11,vat_percent:5,annual_mileage:10000,vehicle_efficiency_mi_kwh:3.2,ev_offpeak_pct:10,away_pct:0}};
function delay(ms){return new Promise(r=>setTimeout(r,ms))}
async function exercise(browser,cloud){
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 // Isolation trial: disable mutation callbacks to detect an infinite DOM observer loop.
 await page.addInitScript(() => {
   const Native=window.MutationObserver;
   window.MutationObserver=class {
     constructor(callback){this.observer=new Native(callback)}
     observe(target,options){
       // Only suppress the hero-subtree observer; allow normal DOM observers.
       if(target && target.classList && target.classList.contains('hero'))return;
       this.observer.observe(target,options)
     }
     disconnect(){this.observer.disconnect()}
     takeRecords(){return this.observer.takeRecords()}
   };
 });
 const errors=[],badrequests=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 page.on('requestfailed',r=>badrequests.push(r.url()+' '+r.failure()?.errorText));
 page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
 // Do not allow production cloud storage to be accessed.
 if(cloud)await page.route('**/consolidated-v1/specialist-share-v1.js*',r=>r.fulfill({contentType:'application/javascript',body:'window.AppointmentCompanionSpecialistShare={read:async()=>({snapshot:'+JSON.stringify(snapshot)+'})};'}));
 const url=origin+(cloud?'?s=browser-diagnostic':('?local=1#p2='+Buffer.from(JSON.stringify(sample)).toString('base64url')));
 console.log('TEST '+(cloud?'CLOUD':'PORTABLE')+' '+url.slice(0,100));
 try{await page.goto(url,{waitUntil:'commit',timeout:9000})}catch(e){console.log('NAV FAILED '+e.message)}
 await delay(4500);
 const get=()=>page.evaluate(()=>{
  const b=document.getElementById('personalSplashOk'),s=document.getElementById('personalSplash');
  const rect=b?.getBoundingClientRect();let elementAtCenter=null;
  if(rect){const element=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);elementAtCenter=element?.id||element?.className||element?.tagName;}
  return {title:document.title,root:document.documentElement.className,button:b?{text:b.textContent,disabled:b.disabled,handler:typeof b.onclick,rect:rect?.toJSON()}:null,elementAtCenter,splash:s?{display:getComputedStyle(s).display,opacity:getComputedStyle(s).opacity,classes:s.className}:null,summary:document.querySelectorAll('#acSharedAssumptions .ac-v254-welcome-stat').length,start:typeof window.AppointmentCompanionEvStart,scriptCount:document.scripts.length,loading:document.getElementById('acEvShareLoading')?.textContent};
 });
 console.log('BEFORE '+JSON.stringify(await Promise.race([get(),delay(7000).then(()=>({error:'MAIN_THREAD_STALLED'}))])));
 await page.evaluate(()=>{window.__diagnosticClicks=0;document.addEventListener('click',e=>{if(e.target.closest('#personalSplashOk'))window.__diagnosticClicks++},true)});
 try{await page.locator('#personalSplashOk').click({timeout:5000})}catch(e){console.log('CLICK ERROR '+e.message.slice(0,1600))}
 await delay(600);
 console.log('AFTER 600ms '+JSON.stringify(await Promise.race([get(),delay(7000).then(()=>({error:'MAIN_THREAD_STALLED'}))])));
 await delay(3600);
 console.log('AFTER 4.2s '+JSON.stringify(await Promise.race([get(),delay(7000).then(()=>({error:'MAIN_THREAD_STALLED'}))])));
 console.log('ERRORS '+JSON.stringify(errors.slice(0,14)));
 console.log('FAILED REQUESTS '+JSON.stringify(badrequests.slice(0,12)));
 await page.close();
}
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{await exercise(browser,false);await exercise(browser,true)}finally{await browser.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
