'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const donor=fs.readFileSync(path.join(root,'../cloud/companion_cloud_pilot.html'),'utf8');
const polish=fs.readFileSync(path.join(root,'service-ui-polish-v1.js'),'utf8');
function segment(start,end){
 const a=donor.indexOf(start);
 const b=donor.indexOf(end,a+start.length);
 assert.ok(a>=0 && b>a,'Missing calculation segment '+start);
 return donor.slice(a,b);
}
const config=segment('const CONFIG = {','/* ============================ /CONFIG');
const stateDecl=segment('const state = {','let previewExtra = false;');
const helper=segment('function monthsUntilApril()','/* ---------- boiler comparison mode ---------- */');
const compute=segment('function compute(previewSims = 0) {','/* Every in-basket service needs BOTH sides');
function harness(){
 const elements=Object.create(null);
 function el(id){
   if(!elements[id]){
     const classes=new Set(id==='bundleRatePanel'?['hidden']:[]);
     elements[id]={value:'0',checked:false,textContent:'',classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,on){if(on)classes.add(k);else classes.delete(k)}}};
   }
   return elements[id];
 }
 el('spendSlider').value='1000';
 const script=[config,
   'const $ = id => element(id);',
   'const num = id => parseInt($(id).value,10)||0;',
   'const numF = id => parseFloat($(id).value)||0;',
   stateDecl,helper,compute,
   'globalThis.evaluate = function(input) {',
   "state.homeowner=input.homeowner;",
   "state.referralRoute=input.route;",
   "state.services={energy:!!input.energy,broadband:!!input.broadband,mobile:!!(input.sims&&input.sims.length)};",
   "state.sims=Object.fromEntries((input.sims||[]).map((plan,i)=>['sim'+(i+1),{include:true,uwPlan:plan,monthlyCost:0,exitFee:0}]));",
   "state.includeCashback=false;",
   "$('boilerCoverToggle').checked=!!input.boiler;",
   "return JSON.parse(JSON.stringify(compute(0)));",
   '};'
 ].join('\n');
 const context={element:el,Date,Math,Number,parseFloat,parseInt,Array,Object,console};
 vm.runInNewContext(script,context,{filename:'referral-calculation'});
 return context.evaluate;
}
test('Essentials SIMs count for welcome once, and the second SIM improves energy not commission',()=>{
 const check=harness();
 const essential=['essentialMax'],two=['essentialMax','essentialMax'];
 let one=check({homeowner:'homeowner',route:'connector',energy:true,sims:essential});
 let twoSims=check({homeowner:'homeowner',route:'connector',energy:true,sims:two});
 assert.equal(one.count,2);
 assert.equal(one.welcomeServiceTypes,2);
 assert.equal(one.welcome,50);
 assert.equal(one.connector,50);
 assert.equal(twoSims.count,2);
 assert.equal(twoSims.welcomeServiceTypes,2);
 assert.equal(twoSims.welcome,50);
 assert.equal(twoSims.connector,50);
 assert.equal(twoSims.includedSimsCount,2);
});
test('two Unlimited SIMs count twice for Connector but only once for Welcome Bonus',()=>{
 const check=harness(),sims=['unlimitedMax','unlimitedMax'];
 const two=check({homeowner:'homeowner',route:'connector',sims});
 assert.equal(two.count,2);
 assert.equal(two.welcomeServiceTypes,1);
 assert.equal(two.connector,50);
 const three=check({homeowner:'homeowner',route:'connector',energy:true,sims});
 assert.equal(three.count,3);
 assert.equal(three.connector,125);
 assert.equal(three.welcomeServiceTypes,2);
 const four=check({homeowner:'homeowner',route:'connector',energy:true,broadband:true,sims});
 assert.equal(four.count,4);
 assert.equal(four.connector,150);
 assert.equal(four.welcomeServiceTypes,3);
});
test('Boiler Cover qualifies homeowners, but a stale tenant checkbox never qualifies',()=>{
 const check=harness();
 const homeowner=check({homeowner:'homeowner',route:'connector',energy:true,boiler:true});
 assert.equal(homeowner.count,2);
 assert.equal(homeowner.connector,50);
 const tenant=check({homeowner:'tenant',route:'connector',energy:true,boiler:true});
 assert.equal(tenant.count,1);
 assert.equal(tenant.connector,0);
});
test('tenants retain referral source with zero commission; NL shirt is worth £65 to both',()=>{
 const check=harness(),base={energy:true,sims:['essentialMax']};
 const tenantFriend=check({...base,homeowner:'tenant',route:'friend'});
 const tenantConnector=check({...base,homeowner:'tenant',route:'connector'});
 const tenantShirt=check({...base,homeowner:'tenant',route:'nationalLeague'});
 const tenantNoRoute=check({...base,homeowner:'tenant',route:'none'});
 assert.equal(tenantFriend.referral,0);
 assert.equal(tenantFriend.referralRoute,'friend');
 assert.equal(tenantConnector.connector,0);
 assert.equal(tenantConnector.referralRoute,'connector');
 assert.equal(tenantShirt.natLeague,65);
 assert.equal(tenantShirt.year1-tenantNoRoute.year1,65);
 assert.equal(check({...base,homeowner:'homeowner',route:'friend'}).referral,50);
 assert.equal(check({...base,homeowner:'homeowner',route:'nationalLeague'}).natLeague,65);
});
test('UI contains the one-row icon selector and persisted/reflected referral route',()=>{
 assert.match(donor,/class="ac-referral-row"/);
 assert.match(donor,/data-referral-route="friend"/);
 assert.match(donor,/data-referral-route="connector"/);
 assert.match(donor,/data-referral-route="nationalLeague"/);
 assert.match(donor,/winwin-referral\.webp/);
 assert.match(donor,/uw-connector\.webp/);
 assert.match(donor,/👕/);
 assert.match(donor,/state\.referralRoute\s*=\s*'none'/);
 assert.match(donor,/selectReferralRoute\(state\.referralRoute\)/);
 assert.match(donor,/cr:r\.connector/);
 assert.match(donor,/g\('cr'\)/);
 assert.match(donor,/Free club shirt/);
});
test('mobile tap cycle and vivid service states are implemented in shared service UI',()=>{
 assert.match(polish,/count>=5/);
 assert.match(polish,/setSims\(count\+1\)/);
 assert.match(polish,/ac-mobile-state/);
 assert.doesNotMatch(polish,/stepper\.addEventListener/);
 for(const colour of ['#32B5D1','#3BBB75','#E44B9C','#F98A32','#9561D7'])assert.ok(polish.includes(colour),colour);
 assert.match(polish,/boiler\.disabled=!homeowner\|\|tenant/);
});
