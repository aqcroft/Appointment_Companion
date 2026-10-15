'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../service-ui-polish-v1.js'),'utf8');
const begin=source.indexOf('  function sync() {');
const end=source.indexOf('  function install() {',begin);
assert.ok(begin>=0&&end>begin);
const body=source.slice(begin,end);
function classes(names=[]){
 const set=new Set(names);
 return {
  contains:name=>set.has(name),
  toggle(name,force){if(force)set.add(name);else set.delete(name);},
  add:name=>set.add(name),
  remove:name=>set.delete(name)
 };
}
function fixture(initialOn=false,initialSims=5){
 let sims=initialSims,active=initialOn;
 const badge={hidden:true,textContent:''};
 const mobileCell={classList:classes([]),querySelector:selector=>selector==='[data-ac-mobile-state]'?badge:null};
 const mobile={
   classList:{contains:name=>name==='on'?active:false},
   closest:selector=>selector==='.ac-mobile-cell'?mobileCell:null,
   setAttribute(name,value){this[name]=value;}
 };
 const pills={classList:classes([])};
 const card={classList:classes([]),querySelector:()=>pills};
 const doc={querySelector:s=>s==='#servicesCard [data-service="mobile"]'?mobile:null};
 const $=id=>id==='servicesCard'?card:id==='includeCashback'?{checked:false}:null;
 const sync=new Function('document','$','canonicalFuel','canonicalSims',body+'; return sync;')(doc,$,()=> 'both',()=>sims);
 return {badge,mobile,mobileCell,sync,setActive:v=>{active=v;},setSims:v=>{sims=v;}};
}
test('greyed-out Mobile does not say 5 SIMs, even when last count is five',()=>{
 const f=fixture(false,5);
 f.sync();
 assert.equal(f.badge.hidden,true);
 assert.equal(f.badge.textContent,'');
 assert.equal(f.mobile['aria-label'],'Mobile SIMs - off');
});
test('count is shown for active SIMs and removed immediately when switched off',()=>{
 const f=fixture(true,5);
 f.sync();
 assert.equal(f.badge.hidden,false);
 assert.equal(f.badge.textContent,'5 SIMs');
 f.setActive(false);f.sync();
 assert.equal(f.badge.hidden,true);
 assert.equal(f.badge.textContent,'');
 f.setActive(true);f.setSims(1);f.sync();
 assert.equal(f.badge.hidden,false);
 assert.equal(f.badge.textContent,'1 SIM');
 assert.equal(f.mobile['aria-label'],'Mobile SIMs - 1 selected');
});
test('the count starts hidden before state has loaded',()=>{
 assert.match(source,/badge\.hidden=true;\s*badge\.textContent=''/);
 assert.match(source,/\.ac-mobile-state\[hidden\]\{display:none!important;\}/);
});
