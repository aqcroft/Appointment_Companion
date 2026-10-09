'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const src=fs.readFileSync('PWA/consolidated-v1/ev-share-adapter-v2.55.3.js','utf8');
const start=src.indexOf('  async function create() {');
const end=src.indexOf('\n  function mount() {',start);
assert(start>0&&end>start,'Extract actual linked-EV sharing handler');
const factory=new Function(
 'chooseBasket','basketCandidate','document','global','store','localId','launch',
 'firstName','state','creatorPartnerId','shareApi','navigator','copy','toast',
 'safeHttps','num','$','location','URL',
 'let sharing=false;\n'+src.slice(start,end)+'\nreturn create;'
);
async function scenario(kind){
 let cloudCalls=0,shown=[],portableCalls=[];
 const row={customer_name:'Test EV customer',appointment_state:{canonical:{customerName:'Test EV customer',energy:{}}}};
 if(kind!=='pending')row.customer_id='cloud123';
 const shareApi={
   currentCustomerId:()=>kind==='pending'?'':'cloud123',
   create:async()=>{cloudCalls++;if(kind==='error')throw Error('Network unavailable');return{token:'cloud-test-token'}}
 };
 const globals={
   AppointmentCompanionEvWorkspace:{saveNow:async()=>{}},
   AppointmentCompanionEvPortableLink:(name,basket)=>{portableCalls.push({name,basket});return'https://example.org/ev/#p2=portable';},
   matchMedia:()=>({matches:true}),
   prompt:()=>''
 };
 const button={disabled:false};
 const create=factory(
   async()=>({cancelled:false,basket:'https://example.org/quote/'}),
   ()=>'',{querySelector:()=>button},globals,{get:async()=>row},'local1',
   {extra:{}},name=>name.split(' ')[0],()=>({annual_mileage:9000}),()=>'',shareApi,
   {share:async obj=>shown.push(obj)},async()=>{},()=>{},x=>x,()=>0,()=>null,
   {href:'https://example.org/ev/?ac_launch=test'},URL
 );
 await create();
 assert.equal(portableCalls.length,1,'Current EV settings provide portable backup');
 assert.equal(portableCalls[0].basket,'https://example.org/quote/');
 assert.equal(shown.length,1,'One share action');
 assert.equal(button.disabled,false,'Share button re-enabled');
 if(kind==='ok'){
   assert.equal(cloudCalls,1);
   assert(shown[0].text.includes('?s=cloud-test-token'),'Linked Cloud customer gets short link');
 }else{
   assert.equal(cloudCalls,kind==='pending'?0:1);
   assert(shown[0].text.includes('#p2=portable'),'Cloud pending/failure uses working portable link');
 }
 console.log('PASS linked EV '+kind+' share: '+shown[0].text.split('\n').at(-1));
}
(async()=>{await scenario('pending');await scenario('error');await scenario('ok');})()
 .catch(err=>{console.error(err);process.exitCode=1});
