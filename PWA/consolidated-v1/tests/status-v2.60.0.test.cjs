/* Appointment Companion v2.60.0 - read-only status and tariff tests.
   All customer records and Google Cloud responses below are synthetic. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dir = path.resolve(__dirname, '..');

function storage() { return {getItem:()=>null,setItem:()=>{},removeItem:()=>{}}; }
function fakeDocument() {
  return {documentElement:{classList:{contains:()=>false}},getElementById:()=>null};
}
const names = [
  'Fixed Start 99','Fixed 99','Fixed Saver 99',
  'Tracker Start 7','Tracker Plus 7','Tracker Saver 7',
  'Value','Gold','Double Gold',
  'EV Value','EV Gold','EV Double Gold'
];
function stateWithNames(list) {
  return {tariffLive:list.map((tariff_name,i)=>({
    tariff_name,
    tariff_type:tariff_name.startsWith('Fixed')?'fixed':
      tariff_name.startsWith('Tracker')?'tracker':
      tariff_name.startsWith('EV')?'variable_ev':'variable',
    source_ref:'SYNTHETIC'
  }))};
}
function harness() {
  const win={
    location:{href:'https://example.test/companion'},
    fetch:async()=>({ok:false}),
    addEventListener:()=>{}, dispatchEvent:()=>{}
  };
  const common={
    window:win,document:fakeDocument(),localStorage:storage(),sessionStorage:storage(),
    console,Promise,Date,Set,URL,
    setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{},
    CustomEvent:class{},Response:class{}
  };
  const feedCode=fs.readFileSync(path.join(dir,'tariff-fetch-v1.js'),'utf8');
  vm.runInNewContext(feedCode,common,{filename:'tariff-fetch-v1.js'});
  const summaries=win.AppointmentCompanionTariffsV242;
  let summary=summaries.summary(stateWithNames(names));
  summaries.state=()=>({status:'green',summary,checkedAt:'2026-10-14T12:02:00Z'});
  const seam='  global.AppointmentCompanionUnifiedStatus={';
  const code=fs.readFileSync(path.join(dir,'unified-status-v2.59.0.js'),'utf8');
  assert.ok(code.includes(seam), 'Unified status test seam should exist');
  const injected=code.replace(seam,
    '  global.__statusTest={tariffSection,customerSection,partnerSection,dimensions,signals,appSection,overallStatus,refreshCustomerSync, '+
    'setCloud:function(c){cloud=c;},setSync:function(s){sync=s;}};\n'+seam);
  vm.runInNewContext(injected,common,{filename:'unified-status-v2.59.0.js'});
  return {win,summary,summaries,status:win.__statusTest,changeSummary:data=>{
    summary=summaries.summary(data);
    summaries.state=()=>({status:'green',summary,checkedAt:'2026-10-14T12:02:00Z'});
  }};
}

test('tariff feed retains all 3 real names including Tracker Plus for each of 4 families',()=>{
  const h=harness();
  for(const family of ['fixed','tracker','variable','ev'])
    assert.equal(h.summary[family+'Names'].length,3);
  const html=h.status.tariffSection();
  assert.equal((html.match(/class="ac-us-tariff present"/g)||[]).length,12);
  assert.match(html,/Fixed Saver 99/);
  assert.match(html,/Tracker Saver 7/);
  assert.match(html,/EV Double Gold/);
  assert.match(html,/Take me to the UW TIL/);
  assert.match(html,/uw\.co\.uk\/legal\/terms-conditions\/energy-tariff-information/);
  assert.equal((html.match(/class="ac-us-detail ac-us-tariff-row"/g)||[]).length,4);
});

test('a missing tariff does not receive a false green tick',()=>{
  const h=harness();
  h.changeSummary(stateWithNames(names.filter(n=>n!=='EV Double Gold')));
  const html=h.status.tariffSection();
  assert.equal((html.match(/class="ac-us-tariff present"/g)||[]).length,11);
  assert.match(html,/○ EV Double Gold/);
});

test('T, C, P each have independent traffic lights, with Cloud included under Customers',()=>{
  const h=harness();
  h.status.setCloud({
    connection:'verified',profile:'loaded',customerIds:['id1'],customerCount:1,
    profileName:'Synthetic Partner'
  });
  h.status.setSync({
    mode:'conflict',conflicts:1,pending:0,count:1,localOnly:0,localIds:['id1'],
    current:'Current customer: sync conflict',local:'Saved locally'
  });
  assert.equal(h.status.dimensions().map(d=>d.letter).join(''),'TCP');
  assert.equal(h.status.dimensions().map(d=>d.state).join(','),'green,red,green');
  assert.equal((h.status.signals().match(/class="ac-us-signal"/g)||[]).length,3);
  assert.match(h.status.customerSection(),/Cloud connection/);
  assert.doesNotMatch(h.status.partnerSection(),/Cloud connection/);
  assert.equal(h.status.overallStatus().state,'red');
  const html=h.status.customerSection();
  assert.match(html,/Review 1 conflict/);
  assert.match(html,/data-us-action="review-customers"/);
});

test('local-only drafts are amber, not conflicts, and cloud-only records can be counted',()=>{
  const h=harness();
  h.status.setCloud({connection:'verified',profile:'loaded',customerIds:['id1','id2'],customerCount:2});
  h.status.setSync({mode:'local',count:2,conflicts:0,pending:0,localOnly:1,localIds:['id1'],current:'',local:'Saved'});
  assert.equal(h.status.dimensions()[1].state,'amber');
  const html=h.status.customerSection();
  assert.match(html,/On device only \(not in Cloud\)<\/span><strong>1<\/strong>/);
  assert.match(html,/In Cloud only \(not on this device\)<\/span><strong>1<\/strong>/);
  assert.doesNotMatch(html,/sync conflict\(s\) need attention/);
});

test('Cloud customer drafts are not falsely counted as queued uploads',async()=>{
  const h=harness();
  h.win.AppointmentCompanionConsolidated={
    list:async()=>[{local_id:'draft1',customer_name:'Synthetic draft',sync_state:'pending',
      cloud_id:'',cloud_creation_approved:false,deleted:false}],
    currentRecord:()=>({customer_name:'Synthetic draft',cloud_id:'',cloud_creation_approved:false,sync_state:'pending'})
  };
  await h.status.refreshCustomerSync(0,true);
  assert.equal(h.status.dimensions()[1].state,'amber');
  const html=h.status.customerSection();
  assert.doesNotMatch(html,/Cloud-enabled profile\(s\) waiting to sync/);
  assert.match(html,/On device only \(not in Cloud\)<\/span><strong>1<\/strong>/);
});

test('update history begins collapsed and displays last three versions',()=>{
  const h=harness();
  const html=h.status.appSection();
  assert.match(html,/Last 3 updates/);
  assert.match(html,/v2\.60\.0/);
  assert.doesNotMatch(html,/ac-us-update-history/);
});

test('modal content has exactly three T-C-P sections; updates are compact metadata',()=>{
  const h=harness();
  const sections=[h.status.tariffSection(),h.status.customerSection(),h.status.partnerSection()];
  const html=h.status.appSection()+sections.join('');
  assert.equal((html.match(/<section class="ac-us-section"/g)||[]).length,3);
  assert.equal((h.status.appSection().match(/<section/g)||[]).length,0);
  assert.deepEqual(sections.map(s=>s.match(/<h3[^>]*>[\s\S]*?(Tariffs|Customers|Partner)<\/h3>/)[1]),
    ['Tariffs','Customers','Partner']);
  assert.equal((html.match(/class="ac-us-signal big"/g)||[]).length,3);
  assert.match(h.status.appSection(),/Last 3 updates/);
});

test('Cloud connection failures make Customers red, without adding a fourth indicator',()=>{
  const h=harness();
  h.status.setCloud({connection:'failed',profile:'loaded',customerIds:null,customerCount:null});
  h.status.setSync({mode:'synced',count:1,conflicts:0,pending:0,localOnly:0,localIds:['id1']});
  assert.equal(h.status.dimensions().map(d=>d.state).join(','),'green,red,green');
  assert.equal(h.status.dimensions().map(d=>d.letter).join(''),'TCP');
  assert.match(h.status.customerSection(),/Unavailable/);
  assert.equal(h.status.overallStatus().state,'red');
});
