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
  const generated=await p.evaluate(()=>{
    let events=0;
    document.addEventListener('ac:ev-share-name',()=>events++);
    const link=window.AppointmentCompanionEvPortableLink('Example Customer','', 'p_test',
      {smart:true,uwStatus:'existing',partnerRelationship:'adrian'});
    const encoded=new URL(link).hash.slice(4);
    const decoded=JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')));
    return {events,publicName:new URL(link).searchParams.get('for'),sm:decoded.sm,uws:decoded.uws,name:decoded.n,partner:decoded.pr};
  });
  assert.deepEqual(generated,{events:0,publicName:null,sm:1,uws:'existing',name:'you',partner:'adrian'},
   'Smart share does not disclose names or mutate linked profile names');
  await p.close();

  // New smart snapshots open the editable calculator without a splash.
  const smart={v:'16C',n:'you',sm:1,uws:'existing',pr:'adrian',
   am:true,ms:'ev',ap:2275,ao:4800,mi:10000,hk:2500,ve:3.2,ti:2,rg:11,ep:10,vat:'5'};
  p=await pageFor(base+'?local=1#p2='+Buffer.from(JSON.stringify(smart)).toString('base64url'));
  await p.waitForFunction(()=>document.documentElement.classList.contains('shared-started'),{timeout:16000});
  assert.equal(await p.locator('#personalSplash').evaluate(el=>getComputedStyle(el).display),'none');
  await p.locator('#acMeterPeak').waitFor({state:'attached',timeout:16000});
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
  // A linked customer should see the new sharing choices, and sharing must
  // not turn an existing saved name into the generic name used by public links.
  p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errors.push(e.message));
  const launchId='launch_ev_smart_test';
  const envelope={
   bridge_version:1,launch_id:launchId,target_tool_id:'ev',
   created_at:new Date().toISOString(),expires_at:new Date(Date.now()+3600000).toISOString(),
   customer_id:'test-customer-id',appointment_state:{customerName:'Alice Example',inputs:{region:11,electricityUsageTotalKwh:2500}},
   origin:{tool_id:'appointment',url:base,scroll_y:0},
   extra:{local_id:'test-ev-local',customer:{customer_id:'test-customer-id',customer_name:'Alice Example',region:11,electricity_usage_kwh:2500}}
  };
  await p.addInitScript(data=>{
   sessionStorage.setItem('apptCompanionLaunchV1:'+data.launch_id,JSON.stringify(data));
   sessionStorage.setItem('apptCompanionActiveLaunchV1',data.launch_id);
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__acEvClipboard=value}}});
  },envelope);
  await p.route('https://**/*',route=>route.abort());
  await p.goto(base+'?ac_launch='+launchId,{waitUntil:'commit',timeout:12000});
  await p.locator('#evCloudShare').waitFor({state:'visible',timeout:20000});
  await p.evaluate(()=>{window.AppointmentCompanionShareIdentity={resolve:async()=> 'p_testverified'}});
  await p.locator('#evCloudShare').click();
  await p.locator('#acEvUwStatusChoice').waitFor({state:'visible',timeout:12000});
  assert.equal(await p.locator('input[name="acEvLinkKind"]').count(),2);
  await p.locator('#acEvUwStatusChoice').selectOption('existing');
  await p.locator('input[name="acEvLinkKind"][value="blank"]').check();
  await p.locator('[data-choice="plain"]').click();
  await p.waitForFunction(()=>Boolean(window.__acEvClipboard)||Boolean(document.querySelector('#acEvCloudCopyUrl')),{timeout:12000});
  const shared=await p.evaluate(()=>{
   const text=window.__acEvClipboard||document.querySelector('#acEvCloudCopyUrl')?.value||'';
   const url=text.split(/\s+/).find(x=>x.startsWith('http'))||text;
   return {uw:new URL(url).searchParams.get('uw'),hasName:new URL(url).searchParams.has('for'),stored:window.AppointmentCompanionBridge?.getWorkingRecord()?.customer_name||''};
  });
  assert.equal(shared.uw,'existing');
  assert.equal(shared.hasName,false,'Blank link has no recipient name in URL');
  assert.notEqual(shared.stored,'you','Sharing cannot overwrite a linked customer name');
  await p.close();

  assert.deepEqual(errors,[],'No uncaught JS exceptions');
  console.log('EV smart customer journeys and legacy links passed');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1});
