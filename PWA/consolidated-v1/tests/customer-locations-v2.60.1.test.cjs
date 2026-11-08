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
  let row=options.row?clone(options.row):makeRow(),saves=0,reads=0,confirmed=0,puts=0,listed=0,deletes=0,timers=[];
  let formSnapshot=null;
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
    list:async()=>row?[clone(row)]:[],
    remove:async()=>{row=null;},
    findCloud:async id=>row&&row.cloud_id===id?clone(row):null
  };
  const service={
    listCustomers:async()=>{listed++;return options.listCustomers?options.listCustomers(listed):{customers:cloudPeople};},
    saveCustomer:async(_auth,payload)=>{
      saves++;assert.equal(payload.customer_name,'Synthetic Alice');
      const saved={customer_id:'cloud-001',customer_name:'Synthetic Alice',
        appointment_state_json:clone(payload.appointment_state_json),ev_state_json:clone(payload.ev_state_json),
        client_revision_id:payload.client_revision_id||'',cloud_revision:'rev-1',updated_at:'2026-10-14T08:00:00Z'};
      const prior=cloudPeople.findIndex(p=>p.customer_id===saved.customer_id);
      if(prior>=0)cloudPeople[prior]=clone(saved);else cloudPeople.push(clone(saved));
      return {customer:saved};
    },
    getCustomer:async(_auth,id)=>{reads++;const known=cloudPeople.find(p=>p.customer_id===id);return {customer:options.dynamicCloudRead&&known?clone(known):{customer_id:id,customer_name:'Synthetic Alice'}};},
    deleteCustomer:async(_auth,id)=>{
      if(!options.allowDelete)throw Error('Never delete in this test');
      deletes++;const ix=cloudPeople.findIndex(c=>c.customer_id===id);if(ix>=0)cloudPeople.splice(ix,1);
      return {ok:true};
    }
  };
  let allow=options.confirm!==false;
  const authStore={getItem:key=>key==='apptCloudPilotAuthSession'?
    JSON.stringify({partner_id:'DEMO_PARTNER',workspace_key:'fake-not-a-password'}):null,
    setItem:()=>{},removeItem:()=>{}};
  const window={
    AppointmentCompanionLocalStore:deviceStore,AppointmentCompanionCloud:service,
    AppointmentCompanionCanonical:{
      capture:()=>clone(formSnapshot||row.appointment_state),
      restore:saved=>{formSnapshot=clone(saved);},
      normaliseAppointment:saved=>{const data=clone(saved);if(data){delete data.app;delete data.saved_at;}return data;}
    },
    confirm:()=>{confirmed++;return allow;},
    addEventListener:()=>{},dispatchEvent:()=>{},
    __AC_LOCAL_ONLY:false
  };
  const doc={documentElement:{classList:{contains:()=>false}},
    getElementById:()=>null,addEventListener:()=>{}};
  const injected=controller.replace(
    '  global.AppointmentCompanionConsolidated =',
    '  global.__controllerTest = {storageSignals,markDeleted,shouldAskBeforeSwitch};\n  global.AppointmentCompanionConsolidated =');
  assert.notEqual(injected,controller,'Controller test seam must exist');
  vm.runInNewContext(injected,{window,document:doc,navigator:{onLine:options.online!==false,userAgent:'Android Mobile'},
    sessionStorage:authStore,localStorage:authStore,
    setInterval:()=>0,setTimeout:(fn,ms)=>{timers.push(ms);return timers.length;},clearTimeout:()=>{},
    CustomEvent:class{},console,Date,Set,Promise}, {filename:'consolidated-controller-v2.56.3.js'});
  return {window,getRow:()=>clone(row),setForm:snapshot=>{formSnapshot=clone(snapshot);},stats:()=>({saves,reads,confirmed,puts,listed,deletes}),timers};
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

test('customer browser provides filters and sorts Cloud and local records together',()=>{
  assert.match(controller,/data-local-scope="localOnly"/);
  assert.match(controller,/data-local-scope="cloudOnly"/);
  assert.match(controller,/data-local-scope="conflicts"/);
  assert.match(controller,/customerActivityStamp\(a\), bTime=customerActivityStamp\(b\)/);
  assert.doesNotMatch(controller,/var difference=priority\(a\)-priority\(b\)/);
  assert.match(controller,/visible=visible\.concat\(remoteOnly\.filter/);
  assert.match(controller,/data-local-upload/);
  assert.match(controller,/Save to Cloud/);
});

test('the combined customer browser opens before awaiting its Cloud fetch',()=>{
  const start=controller.indexOf('  async function customerBrowser(options) {');
  const end=controller.indexOf('  async function markDeleted',start);
  assert.ok(start>=0&&end>start);
  const body=controller.slice(start,end);
  const openAt=body.indexOf("modal.classList.add('open');");
  const localAt=body.indexOf('await store.list(true)',openAt);
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

test('customer-list actions are visually distinct and expose single-confirm bulk actions',()=>{
  assert.match(controller,/\.ac-customer-action\{/);
  assert.match(controller,/data-local-upload-all/);
  assert.match(controller,/data-local-delete-conflicts/);
  assert.match(controller,/Save all to Cloud/);
  assert.match(controller,/Delete all conflicts/);
  assert.match(controller,/data-local-scope="all"/);
  assert.match(controller,/uploadAll\.disabled=true/);
  assert.match(controller,/deleteAll\.disabled=true/);
  assert.match(controller,/if\(!global\.confirm\('Permanently delete all /);
});

test('one bin confirmation deletes linked conflicting customer locally and in Cloud',async()=>{
  const row={...makeRow(),cloud_id:'cloud-001',sync_state:'conflict',conflict:{local:{},cloud:{customer_id:'cloud-001'}}};
  const h=harness({row,allowDelete:true,cloudPeople:[{customer_id:'cloud-001',customer_name:'Synthetic Alice'}]});
  const deleted=await h.window.__controllerTest.markDeleted('local-001');
  assert.equal(deleted,true);
  assert.equal(h.stats().confirmed,1,'only one deletion confirmation');
  assert.equal(h.stats().deletes,1,'Cloud removed once');
  assert.equal(h.getRow(),null,'local record removed after server acknowledgement');
});

test('offline deletion clears stale conflict without requiring another confirmation',async()=>{
  const row={...makeRow(),cloud_id:'cloud-001',sync_state:'conflict',conflict:{local:{},cloud:{customer_id:'cloud-001'}}};
  const h=harness({row,online:false});
  await h.window.__controllerTest.markDeleted('local-001');
  assert.equal(h.stats().confirmed,1);
  assert.equal(h.stats().deletes,0);
  assert.equal(h.getRow().deleted,true);
  assert.equal(h.getRow().conflict,null);
  assert.equal(h.getRow().sync_state,'pending_delete');
});

test('old already-confirmed deletion migrates and completes without another prompt',async()=>{
  const row={...makeRow(),cloud_id:'cloud-001',deleted:true,tombstone:true,
    sync_state:'conflict',conflict:{local:{},cloud:{customer_id:'cloud-001'}}};
  const h=harness({row,allowDelete:true,cloudPeople:[{customer_id:'cloud-001',customer_name:'Synthetic Alice'}]});
  await h.window.AppointmentCompanionConsolidated.sync();
  assert.equal(h.stats().confirmed,0);
  assert.equal(h.stats().deletes,1);
  assert.equal(h.getRow(),null);
});

test('customer filters are tappable counted buttons and never reload the browser to switch',()=>{
  assert.match(controller,/data-local-scope="all"/);
  assert.match(controller,/data-local-scope="localOnly"/);
  assert.match(controller,/data-local-scope="cloudOnly"/);
  assert.match(controller,/data-local-scope="pending"/);
  assert.match(controller,/data-local-scope="conflicts"/);
  assert.match(controller,/modal\._setCustomerScope=function/);
  assert.match(controller,/aria-pressed/);
  assert.match(controller,/scopeCounts\(\)/);
  assert.doesNotMatch(controller,/id="localFirstCustomerScope"/);
  const body=controller.slice(controller.indexOf('  async function customerBrowser(options) {'),
    controller.indexOf('  async function markDeleted(',controller.indexOf('  async function customerBrowser(options) {')));
  assert.doesNotMatch(body,/if\(filter\).*customerBrowser/);
});

test('deletion stays in the same customer modal and queues Cloud work',()=>{
  const body=controller.slice(controller.indexOf('  async function customerBrowser(options) {'),
    controller.indexOf('  async function markDeleted(',controller.indexOf('  async function customerBrowser(options) {')));
  const single=body.slice(body.indexOf("var del = event.target.closest('[data-local-delete]');"),
    body.indexOf("var choice = event.target.closest('[data-local-conflict]');"));
  assert.match(single,/deferSync:true/);
  assert.match(single,/modal\._refreshLocalCustomerRows/);
  assert.match(single,/scheduleSync\(12000,true\)/);
  assert.doesNotMatch(single,/await customerBrowser\(/);
  assert.match(controller,/browser\._refreshLocalCustomerRows\(\)/);
  assert.doesNotMatch(controller,/dataset\.customerScope==='conflicts'\)customerBrowser/);
});

test('explicit Save immediately pushes and verifies only the selected linked Cloud customer',async()=>{
  const local={...makeRow(),cloud_id:'cloud-001',cloud_creation_approved:true,
    base_cloud_revision:'rev-1',cloud_synced_local_revision:1};
  const remote={customer_id:'cloud-001',customer_name:'Synthetic Alice',
    appointment_state_json:clone(local.appointment_state),client_revision_id:'older',
    cloud_revision:'rev-1',updated_at:'2026-10-14T08:00:00Z'};
  const h=harness({row:local,cloudPeople:[remote],dynamicCloudRead:true});
  const engine=h.window.AppointmentCompanionConsolidated;
  await engine.load(h.getRow(),true);
  const result=await engine.saveCurrentCloudNow();
  assert.equal(h.stats().saves,1,'Save must write the selected Cloud record even if current snapshot is equivalent');
  assert.equal(h.getRow().cloud_id,'cloud-001','does not create a second record');
  assert.equal(h.getRow().sync_state,'synced');
  assert.equal(result.cloud_synced_local_revision,result.local_revision);
  assert.ok(h.stats().reads>=2,'Cloud is read before writing and after for verification');
});

test('explicit Save refuses to overwrite a newer conflicting remote version',async()=>{
  const local={...makeRow(),cloud_id:'cloud-001',cloud_creation_approved:true,
    base_cloud_revision:'rev-1',cloud_synced_local_revision:1};
  const changed=clone(local.appointment_state);
  changed.canonical.customerName='A different remote version';
  const remote={customer_id:'cloud-001',customer_name:'Synthetic Alice',
    appointment_state_json:changed,client_revision_id:'remote-change',
    cloud_revision:'rev-2',updated_at:'2026-10-14T08:10:00Z'};
  const h=harness({row:local,cloudPeople:[remote],dynamicCloudRead:true});
  const engine=h.window.AppointmentCompanionConsolidated;
  await engine.load(h.getRow(),true);
  await engine.saveCurrentCloudNow();
  assert.equal(h.stats().saves,0,'conflicting remote must not be overwritten');
  assert.equal(h.getRow().sync_state,'conflict');
  assert.ok(h.getRow().conflict,'both versions remain available for review');
  assert.equal(h.getRow().appointment_state.canonical.customerName,'Synthetic Alice');
});

test('switching an unchanged saved customer never asks to save again',async()=>{
  const h=harness();
  const engine=h.window.AppointmentCompanionConsolidated;
  await engine.load(h.getRow(),true);
  // The real canonical capture adds volatile metadata that IndexedDB removes.
  const withMetadata={...h.getRow().appointment_state,app:'appointment-companion',
    saved_at:'2026-11-06T20:50:00Z'};
  h.setForm(withMetadata);
  assert.equal(h.window.__controllerTest.shouldAskBeforeSwitch('another-local-id'),false,
    'equivalent data, despite volatile metadata, should not prompt');
});

test('a real unsaved name or notes edit asks once, then a Save clears the prompt',async()=>{
  const h=harness();
  const engine=h.window.AppointmentCompanionConsolidated;
  await engine.load(h.getRow(),true);
  const edited=clone(h.getRow().appointment_state);
  edited.canonical.privateNotes='A genuine unsaved update';
  h.setForm({...edited,app:'appointment-companion',saved_at:'2026-11-06T20:51:00Z'});
  assert.equal(h.window.__controllerTest.shouldAskBeforeSwitch('another-local-id'),true,
    'real unsaved form content should prompt');
  const saved=await engine.saveCurrentCloudNow();
  assert.ok(saved&&saved.local_id,'the same Save operation commits locally first');
  assert.equal(h.window.__controllerTest.shouldAskBeforeSwitch('another-local-id'),false,
    'after saving the changed values, switching should not prompt again');
  const renamed=clone(edited);
  renamed.canonical.customerName='Synthetic Alice Smith';
  h.setForm(renamed);
  assert.equal(h.window.__controllerTest.shouldAskBeforeSwitch('another-local-id'),true,
    'typed but unconfirmed name must not be discarded without warning');
});

test('Save and switch reuse targeted Cloud Save rather than a local-only write',()=>{
  const switchBody=controller.slice(controller.indexOf('  async function requestSwitchRecord('),
    controller.indexOf('  async function switchToLocalId('));
  assert.match(switchBody,/await saveCurrentCloudNow\(\)/);
  assert.doesNotMatch(switchBody,/await persist\(false,false,true\)/);
  const newCustomer=controller.slice(controller.indexOf('  async function startNewCustomer('),
    controller.indexOf('  async function saveCurrentCloudNow('));
  assert.match(newCustomer,/await saveCurrentCloudNow\(\)/);
  assert.doesNotMatch(newCustomer,/editedSinceSwitch\s*\|\|\s*shouldAskBeforeSwitch/);
  assert.match(controller,/Save &amp; switch/);
});

test('customer header shortcut opens the authoritative customer modal, not stale recent cache',()=>{
  const shell=fs.readFileSync(path.resolve(__dirname,'../../../local-first/shell-pilot-v1.js'),'utf8');
  const click=shell.slice(shell.indexOf('      if (profileToggle) {'),
    shell.indexOf('      const profileChoice =',shell.indexOf('      if (profileToggle) {')));
  assert.match(click,/controller\.openCustomerBrowser\(\)/);
  assert.doesNotMatch(click,/toggleQuickProfiles\(\)/);
  assert.match(shell,/title="View all customers" aria-label="View all customers"/);
});

test('v2.68 is a two-part product version shown without status truncation',()=>{
  const base=path.resolve(__dirname,'..');
  const status=fs.readFileSync(path.join(base,'unified-status-v2.59.0.js'),'utf8');
  const shell=fs.readFileSync(path.join(base,'index.html'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.webmanifest'),'utf8'));
  assert.match(status,/version:\s*'v2\.68'/);
  assert.match(status,/esc\(meta\.version\)/);
  assert.doesNotMatch(status,/meta\.version\.replace\(/);
  assert.match(shell,/<title>Appointment Companion v2\.68<\/title>/);
  assert.equal(manifest.name,'Appointment Companion v2.68');
  assert.match(fs.readFileSync(path.join(base,'docs/CHANGELOG.md'),'utf8'),/^## v2\.68 /);
});

test('Most recent uses actual Cloud last update, not the time the mobile imported it',()=>{
  const start=controller.indexOf('  function isSynced(');
  const end=controller.indexOf('  function paint(',start);
  const stamp=vm.runInNewContext(controller.slice(start,end)+'\ncustomerActivityStamp');
  const olderCloud={cloud_id:'cloud-old',sync_state:'synced',local_revision:0,
    cloud_synced_local_revision:0,updated_at:'2026-11-08T12:00:00Z',
    cloud_customer:{updated_at:'2026-11-01T09:00:00Z'}};
  const nirmal={cloud_id:'cloud-new',sync_state:'synced',local_revision:0,
    cloud_synced_local_revision:0,updated_at:'2026-11-08T12:00:05Z',
    cloud_customer:{updated_at:'2026-11-08T07:46:00Z'}};
  const localDraft={cloud_id:'',sync_state:'draft',updated_at:'2026-11-08T08:30:00Z'};
  assert.equal(stamp(olderCloud),'2026-11-01T09:00:00Z');
  const ordered=[olderCloud,nirmal,localDraft].sort((a,b)=>stamp(b).localeCompare(stamp(a)));
  assert.deepEqual(ordered,[localDraft,nirmal,olderCloud]);
  const locallyEdited={...nirmal,sync_state:'pending',local_revision:1,
    updated_at:'2026-11-08T13:00:00Z'};
  assert.equal(stamp(locallyEdited),'2026-11-08T13:00:00Z');
  assert.match(controller,/updatedAt: remote\.updated_at \|\| remote\.created_at/);
  assert.match(controller,/updatedAt: full\.updated_at \|\| full\.created_at/);
});

test('Sync all Cloud customers is separate from opt-in draft uploads',async()=>{
  assert.match(controller,/data-local-sync-all/);
  assert.match(controller,/Sync all Cloud customers now/);
  assert.match(controller,/data-local-upload-all/);
  assert.match(controller,/await syncCloudCustomersNow\(\)/);
  const h=harness();
  const result=await h.window.AppointmentCompanionConsolidated.syncCloudCustomersNow();
  assert.equal(result.state,'completed');
  assert.equal(h.stats().saves,0,'explicitly local drafts must not upload during Cloud refresh');
  assert.ok(h.stats().listed>=1,'a fresh Cloud list is checked');
});

test('manual full Cloud refresh waits for an ongoing background check',async()=>{
  let release;
  const slow=new Promise(resolve=>{release=resolve;});
  const h=harness({listCustomers:async n=>n===1?slow:{customers:[]}});
  const engine=h.window.AppointmentCompanionConsolidated;
  const background=engine.sync();
  for(let i=0;i<15&&h.stats().listed===0;i++)await Promise.resolve();
  assert.equal(h.stats().listed,1);
  const manual=engine.syncCloudCustomersNow();
  for(let i=0;i<5;i++)await Promise.resolve();
  assert.equal(h.stats().listed,1,'does not start a second concurrent Cloud read');
  release({customers:[]});
  await background;
  const result=await manual;
  assert.equal(result.state,'completed');
  assert.ok(h.stats().listed>=2,'manual action performs its own fresh check after waiting');
});
