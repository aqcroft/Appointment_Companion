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
  let row=makeRow(),saves=0,reads=0,confirmed=0,puts=0;
  const cloudPeople=options.cloudPeople||[];
  const deviceStore={
    get:async id=>id===row.local_id?clone(row):null,
    put:async value=>{puts++;row=clone({...row,...value});return clone(row);},
    list:async()=>[clone(row)],
    remove:async()=>{row=null;},
    findCloud:async()=>null
  };
  const service={
    listCustomers:async()=>({customers:cloudPeople}),
    saveCustomer:async(_auth,payload)=>{
      saves++;assert.equal(payload.customer_name,'Synthetic Alice');
      return {customer:{customer_id:'cloud-001',customer_name:'Synthetic Alice',
        cloud_revision:'rev-1',updated_at:'2026-10-14T08:00:00Z'}};
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
    AppointmentCompanionCanonical:{capture:()=>clone(row.appointment_state)},
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
    setInterval:()=>0,setTimeout:()=>0,clearTimeout:()=>{},
    CustomEvent:class{},console,Date,Set,Promise}, {filename:'consolidated-controller-v2.56.3.js'});
  return {window,getRow:()=>clone(row),stats:()=>({saves,reads,confirmed,puts})};
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
  assert.equal(h.stats().confirmed,0);
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
