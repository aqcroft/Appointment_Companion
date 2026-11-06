/* v2.60.1 local-to-Cloud save and location presentation regression tests.
   Uses fictional customers only; never contacts a live Google service. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const controller=fs.readFileSync(path.resolve(__dirname,'../consolidated-controller-v2.56.3.js'),'utf8');
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function makeRow(){
  return {local_id:'local-001',cloud_id:'',customer_name:'Synthetic Alice',
    cloud_creation_approved:false,deleted:false,sync_state:'pending',local_revision:2,
    cloud_synced_local_revision:0,client_revision_id:'rev-local-2',
    appointment_state:{canonical:{
      customerName:'Synthetic Alice',energy:{electricityUsageTotalKwh:2000,
      electricityUsageDayKwh:2000,gasUsageKwh:8000},selectedServices:{energy:true},
      basketUrl:'https://example.test/synthetic-basket'}},
    specialist_state:{},basket_url:'https://example.test/synthetic-basket',conflict:null};
}
function harness(options={}){
  let row=makeRow(),saves=0,reads=0,confirmed=0,puts=0,listed=0,timers=[];
  const cloudPeople=options.cloudPeople||[];
  const deviceStore={
    get:async id=>id===row.local_id?clone(row):null,
    put:async value=>{
      puts++;
      // A downloaded Cloud-only customer is a second IndexedDB row, never a
      // replacement for a different local-only profile with the same name.
      if(!value.local_id && value.cloud_id && value.cloud_id!==row.cloud_id)
        return clone({local_id:'imported-cloud-'+value.cloud_id,...value});
      row=clone({...row,...value});return clone(row);
    },
    list:async()=>[clone(row)],
    remove:async()=>{row=null;},
    findCloud:async id=>row&&row.cloud_id===id?clone(row):null
  };
  const service={
    listCustomers:async()=>{listed++;return options.listCustomers?options.listCustomers(listed):{customers:cloudPeople};},
    saveCustomer:async(_auth,payload)=>{
      saves++;assert.equal(payload.customer_name,'Synthetic Alice');
      const saved={customer_id:'cloud-001',customer_name:'Synthetic Alice',
        client_revision_id:payload.client_revision_id||'',cloud_revision:'rev-1',updated_at:'2026-10-14T08:00:00Z'};
      if(!cloudPeople.some(p=>p.customer_id===saved.customer_id))cloudPeople.push(clone(saved));
      return {customer:saved};
    },
    getCustomer:async(_auth,id)=>{reads++;return {customer:{customer_id:id,customer_name:'Synthetic Alice'}};},
    deleteCustomer:async()=>{throw Error('Never delete in this test');}
  };
  let allow=options.confirm!==false;
  const authStore={getItem:key=>key==='apptCloudPilotAuthSession'?
    JSON.stringify({partner_id:'DEMO_PARTNER',workspace_key:'fake-not-a-password'}):null,
    setItem:()=>{},removeItem:()=>{}};
  const window={
    AppointmentCompanionLocalStore:deviceStore,AppointmentCompanionCloud:service,
    AppointmentCompanionCanonical:{capture:()=>clone(row.appointment_state),restore:()=>{}},
    confirm:()=>{confirmed++;return allow;},
    addEventListener:()=>{},dispatchEvent:()=>{},
    __AC_LOCAL_ONLY:false
  };
  const doc={documentElement:{classList:{contains:()=>false}},
    getElementById:()=>null,addEventListener:()=>{}};
  const injected=controller.replace(
    '  global.AppointmentCompanionConsolidated =',
    '  global.__controllerTest = {storageSignals};\n  global.AppointmentCompanionConsolidated =');
  assert.notEqual(injected,controller,'Controller test seam must exist');
  vm.runInNewContext(injected,{window,document:doc,navigator:{onLine:true,userAgent:'Android Mobile'},
    sessionStorage:authStore,localStorage:authStore,
    setInterval:()=>0,setTimeout:(fn,ms)=>{timers.push(ms);return timers.length;},clearTimeout:()=>{},
    CustomEvent:class{},console,Date,Set,Promise}, {filename:'consolidated-controller-v2.56.3.js'});
  return {window,getRow:()=>clone(row),stats:()=>({saves,reads,confirmed,puts,listed}),timers};
}

test('explicit customer Save to Cloud needs acknowledgement and retrieval to report success',async()=>{
  const h=harness();
  assert.equal(h.stats().saves,0,'Simply loading the controller must not upload');
  const result=await h.window.AppointmentCompanionConsolidated.saveLocalToCloud('local-001');
  assert.match(result.message,/saved on this device AND verified in Cloud/);
  assert.equal(h.stats().saves,1);
  assert.equal(h.stats().reads,1);
  assert.equal(h.stats().confirmed,1);
  assert.equal(h.getRow().cloud_id,'cloud-001');
  assert.equal(h.getRow().sync_state,'synced');
  assert.equal(h.getRow().local_revision,h.getRow().cloud_synced_local_revision);
  assert.equal(h.getRow().appointment_state.canonical.basketUrl,'https://example.test/synthetic-basket');
});

test('declining the upload keeps the local draft untouched',async()=>{
  const h=harness({confirm:false});
  const result=await h.window.AppointmentCompanionConsolidated.saveLocalToCloud('local-001');
  assert.match(result.message,/cancelled/);
  assert.equal(h.stats().saves,0);
  assert.equal(h.stats().puts,0);
  assert.equal(h.getRow().cloud_creation_approved,false);
});

test('same-name Cloud match stops accidental duplicate creation',async()=>{
  const h=harness({cloudPeople:[{customer_id:'already-cloud',customer_name:'Synthetic Alice'}]});
  await assert.rejects(()=>h.window.AppointmentCompanionConsolidated.saveLocalToCloud('local-001'),/already exists in Cloud/);
  assert.equal(h.stats().saves,0);
  assert.equal(h.stats().confirmed,1,'manual button confirms before Cloud duplicate checks');
});

test('mobile/laptop/Cloud columns never claim another device is verified',()=>{
  const h=harness(),html=h.window.__controllerTest.storageSignals(true,'yes',true);
  assert.match(html,/📱/);assert.match(html,/💻/);assert.match(html,/☁️/);
  assert.match(html,/Another computer cannot be checked/);
  assert.match(html,/Confirmed in Cloud and current revision synchronised/);
  assert.equal((html.match(/class="ac-location-cell"/g)||[]).length,3);
  assert.equal((html.match(/border-radius:50%/g)||[]).length,3);
  assert.doesNotMatch(html,/<\/span><b style=/);
  assert.match(html,/aria-label/);
});

test('location browser includes explicit filters and prioritises device-only records',()=>{
  assert.match(controller,/On this device only/);
  assert.match(controller,/In Cloud only/);
  assert.match(controller,/Sync conflicts/);
  assert.match(controller,/var difference=priority\(a\)-priority\(b\)/);
  assert.match(controller,/data-local-upload/);
  assert.match(controller,/Save to Cloud/);
  assert.match(controller,/remoteVisible\.map/);
});

test('the combined customer browser opens before awaiting its Cloud fetch',()=>{
  const start=controller.indexOf('  async function customerBrowser(options) {');
  const end=controller.indexOf('  async function markDeleted',start);
  assert.ok(start>=0&&end>start);
  const body=controller.slice(start,end);
  const openAt=body.indexOf("modal.classList.add('open');");
  const localAt=body.indexOf('await store.list(true)');
  const cloudAt=body.indexOf('await api.listCustomers(credentials)');
  const busyAt=body.indexOf("modal.setAttribute('aria-busy','true')");
  assert.ok(openAt>=0&&busyAt>=0&&openAt<localAt&&localAt<cloudAt,
    'Modal and busy indicator must appear before local and Cloud I/O');
  assert.match(body,/Loading customers…/);
  assert.match(body,/modal.removeAttribute\('aria-busy'\)/);
  assert.match(body,/if\(sequence!==customerBrowserSequence\)return/);
});

test('manual mobile upload waits for in-flight automatic sync then saves exactly once',async()=>{
  let releaseBackground;
  const backgroundGate=new Promise(resolve=>{releaseBackground=resolve;});
  const h=harness({listCustomers:async n=>n===1?backgroundGate:{customers:[]}});
  const syncJob=h.window.AppointmentCompanionConsolidated.sync();
  for(let i=0;i<12&&h.stats().listed===0;i++)await Promise.resolve();
  assert.equal(h.stats().listed,1,'background reconciliation should have reached its Cloud listing');
  const manual=h.window.AppointmentCompanionConsolidated.saveLocalToCloud('local-001');
  for(let i=0;i<5;i++)await Promise.resolve();
  assert.equal(h.stats().saves,0,'manual save waits without creating a competing Cloud write');
  assert.equal(h.stats().confirmed,1,'confirmation happens immediately, before the slow Cloud check');
  releaseBackground({customers:[]});
  await syncJob;
  const result=await manual;
  assert.match(result.message,/saved on this device AND verified in Cloud/);
  assert.equal(h.stats().saves,1);
  assert.equal(h.stats().confirmed,1);
  assert.equal(h.getRow().sync_state,'synced');
  assert.equal(h.getRow().cloud_creation_approved,true);
});
test('cancelled queued upload never authorises Cloud creation',async()=>{
  let finish;
  const gate=new Promise(resolve=>finish=resolve);
  const h=harness({confirm:false,listCustomers:async n=>n===1?gate:{customers:[]}});
  const background=h.window.AppointmentCompanionConsolidated.sync();
  for(let i=0;i<12&&h.stats().listed===0;i++)await Promise.resolve();
  const manual=h.window.AppointmentCompanionConsolidated.saveLocalToCloud('local-001');
  finish({customers:[]});
  await background;
  const result=await manual;
  assert.match(result.message,/cancelled/);
  assert.equal(h.stats().saves,0);
  assert.equal(h.getRow().cloud_creation_approved,false);
});

test('a deliberately confirmed customer is locally safe and eligible for automatic Cloud backup',async()=>{
  const h=harness(),engine=h.window.AppointmentCompanionConsolidated;
  await engine.load(h.getRow(),true);
  const saved=await engine.confirmCustomerName();
  assert.equal(saved.cloud_creation_approved,true);
  assert.equal(saved.cloud_id,'');
  assert.equal(h.stats().saves,0,'confirmation must not wait for the network');
  assert.equal(h.timers.at(-1),12000,'deliberate Save schedules one prompt Cloud attempt');
  await engine.sync();
  assert.equal(h.stats().saves,1,'background sync uploads a confirmed named customer');
  assert.equal(h.getRow().cloud_id,'cloud-001');
  assert.equal(h.getRow().sync_state,'synced');
});

test('background Cloud backup refuses to create a duplicate customer name',async()=>{
  const h=harness({cloudPeople:[{customer_id:'existing',customer_name:'Synthetic Alice'}]});
  const engine=h.window.AppointmentCompanionConsolidated;
  await engine.load(h.getRow(),true);
  await engine.confirmCustomerName();
  const result=await engine.sync();
  assert.equal(h.stats().saves,0,'no second Cloud record is written');
  assert.equal(h.getRow().cloud_id,'');
  assert.equal(result.state,'incomplete');
  assert.match(result.error,/already exists in Cloud/);
});

test('manual Save to Cloud from customer list bypasses delayed native confirmation',async()=>{
  const h=harness(),engine=h.window.AppointmentCompanionConsolidated;
  const result=await engine.saveLocalToCloud('local-001',{confirmed:true});
  assert.match(result.message,/verified in Cloud/);
  assert.equal(h.stats().confirmed,0,'one tap is its own explicit authorisation');
  assert.equal(h.stats().saves,1);
});

test('background Cloud checks are now spaced out, while explicit action stays available',()=>{
  const h=harness(),engine=h.window.AppointmentCompanionConsolidated;
  engine.scheduleSync(20);
  assert.equal(h.timers.at(-1),90000,'routine Cloud requests cannot poll every few seconds');
  engine.scheduleSync(2800);
  assert.equal(h.timers.at(-1),90000,'routine form edits are debounced');
  engine.scheduleSync(12000,true);
  assert.equal(h.timers.at(-1),12000,'one early startup or reconnection check remains possible');
  engine.scheduleSync(180000);
  assert.equal(h.timers.at(-1),180000,'longer backoff timing is respected');
  assert.equal(typeof engine.syncNow,'function','users still have an explicit Cloud sync action');
  assert.match(controller,/BACKGROUND_CHECK_MS\s*=\s*15\s*\*\s*60\s*\*\s*1000/);
  assert.match(controller,/lastBackgroundCheckAt < LAST_CHECK_FRESH_MS/);
  assert.match(controller,/document\.hidden\s*\|\|\s*!navigator\.onLine/);
  assert.doesNotMatch(controller,/setInterval\(function \(\) \{ scheduleSync\(0\); \}, 45000\)/);
});
