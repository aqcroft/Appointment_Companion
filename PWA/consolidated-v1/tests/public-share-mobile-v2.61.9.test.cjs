'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const donor=read('../cloud/companion_cloud_pilot.html');
const polish=read('service-ui-polish-v1.js');
function entryScript(tool){
 const src=read(tool+'/index.html');
 const scripts=[...src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('src=')&&!m[1].includes('ld+json'));
 assert.equal(scripts.length,1,'one loader inline script for '+tool);
 return scripts[0][2];
}
async function loader(tool,url){
 let written='';
 const loc=new URL(url);
 const context={
   URL,location:{href:loc.href,hash:loc.hash,search:loc.search,pathname:loc.pathname,origin:loc.origin},
   document:{open(){},write(s){written=s},close(){},getElementById(){return {textContent:''}}},
   fetch:async()=>({ok:true,text:async()=>'<html><head><title>Donor</title></head><body><main>Customer calculator</main></body></html>'}),
   console
 };
 vm.runInNewContext(entryScript(tool),context,{filename:tool+'/index.html'});
 for(let i=0;i<20&&!written;i++)await Promise.resolve();
 assert.ok(written,'Customer calculator must load');
 return written;
}
function noPartnerToolbar(html,subject){
 for(const file of ['specialist-features-v1.js','spring-clean-v2.57.0.js','release-v2.3.js','unified-status-v2.59.0.js','specialist-suite-menu-v2.62.2.js'])
   assert.equal(html.includes(file),false,subject+' should not load '+file);
 assert.match(html,/classList\.add\("shared-view"\)/,subject+' must set shared-view before other scripts run');
}
test('Should I Fix ?public=1 is standalone, branded, and lacks Partner menu, toolbar and status',async()=>{
 const html=await loader('should-i-fix','https://example.test/PWA/consolidated-v1/should-i-fix/?public=1&r=11&f=gas');
 noPartnerToolbar(html,'Should I Fix public');
 assert.match(html,/public-partner-branding-v1\.js/,'Customer can still see creating Partner profile');
 assert.match(html,/fix-share-gate-v1\.js/,'Customer public experience remains loaded');
});
test('Should I Fix Partner view retains the full toolbar and TCP',async()=>{
 const html=await loader('should-i-fix','https://example.test/PWA/consolidated-v1/should-i-fix/');
 assert.match(html,/specialist-features-v1\.js/);
 assert.match(html,/specialist-suite-menu-v2\.62\.2\.js/);
 assert.match(html,/unified-status-v2\.59\.0\.js/);
});
test('EV public, Cloud token and portable links are all protected',async()=>{
 const rootUrl='https://example.test/PWA/consolidated-v1/ev/';
 for(const suffix of ['?public=1','?s=sample-token','#p2=sample-data']){
   const html=await loader('ev',rootUrl+suffix);
   noPartnerToolbar(html,'EV '+suffix);
 }
});
test('EV Partner view retains the full toolbar',async()=>{
 const html=await loader('ev','https://example.test/PWA/consolidated-v1/ev/');
 assert.match(html,/specialist-features-v1\.js/);
 assert.match(html,/unified-status-v2\.59\.0\.js/);
});
test('even if a future loader accidentally injects Partner scripts, public links are rejected in each module',()=>{
 for(const file of ['specialist-features-v1.js','unified-status-v2.59.0.js','specialist-suite-menu-v2.62.2.js']){
   const source=read(file);
   assert.match(source,/public=1/,file);
 }
});
test('multi-tap Companion hides old SIM count pills without removing standalone controls',()=>{
 assert.match(donor,/<div class="pills" id="simCountPills">/);
 assert.match(polish,/#mobileCard #simCountPills \{display:none!important;\}/);
 assert.match(polish,/setSims\(count\+1\)/);
 assert.match(donor,/data-count="5"/);
});
test('extra Unlimited months note appears only on subsequent Unlimited SIMs',()=>{
 const start=donor.indexOf('let unlimitedSeen = 0;');
 const end=donor.indexOf('// excluded SIMs: blank price display',start);
 assert.ok(start>0&&end>start,'SIM-specific benefit labelling found');
 const block=donor.slice(start,end);
 function notes(plans){
   const state={sims:Object.fromEntries(plans.map((plan,i)=>['sim'+(i+1),{include:true,uwPlan:plan,monthlyCost:0,exitFee:0}]))};
   const fields={};
   for(let i=0;i<plans.length;i++){fields['plannote_sim'+(i+1)]={textContent:'OLD'};fields['uwCost_sim'+(i+1)]={textContent:'0'};}
   const CONFIG={mobile:{plans:{unlimitedMax:{note:'Additional SIMs free for 3 months'},essentialMax:{note:''}}}};
   const included=Object.entries(state.sims),prices=plans.map(p=>p==='unlimitedMax'?13:6);
   const fn=new Function('included','prices','CONFIG','$',
     'let currentMob=0,mobExit=0,uwMob=0;\n'+block+'\nreturn true;');
   fn(included,prices,CONFIG,id=>fields[id]||null);
   return plans.map((_,i)=>fields['plannote_sim'+(i+1)].textContent);
 }
 assert.deepEqual(notes(['unlimitedMax']),['']);
 assert.deepEqual(notes(['unlimitedMax','unlimitedMax']),['','Additional SIMs free for 3 months']);
 assert.deepEqual(notes(['essentialMax','unlimitedMax']),['','']);
 assert.deepEqual(notes(['essentialMax','unlimitedMax','unlimitedMax']),['','','Additional SIMs free for 3 months']);
 assert.deepEqual(notes(['unlimitedMax','essentialMax']),['','']);
});
test('each UW SIM price moves above its selected tariff button, never beside the UW heading',()=>{
 assert.match(donor,/class="planpills" data-sim=".*?data-selected-plan=".*?sim\.uwPlan/);
 assert.match(donor,/class="sim-uw-amount"[^>]*>£<span id="uwCost_/);
 assert.match(donor,/group\.dataset\.selectedPlan = b\.dataset\.plan/);
 assert.match(donor,/grid-template-rows:18px auto/);
 assert.match(donor,/\[data-selected-plan="essentialMax"\] \.sim-uw-amount \{grid-column:2;\}/);
 assert.match(donor,/\.sim-compare \.planpills \[data-plan="unlimitedMax"\] \{grid-row:2;grid-column:1;\}/);
 assert.match(donor,/\.sim-compare \.planpills \[data-plan="essentialMax"\] \{grid-row:2;grid-column:2;\}/);
 assert.doesNotMatch(donor,/sim-uw-price-row/);
 assert.doesNotMatch(donor,/Go Essentials £6\/m\./);
 assert.doesNotMatch(donor,/Go Unlimited £13\/m\. Additional Unlimited/);
});
