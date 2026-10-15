'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const script=fs.readFileSync(path.join(__dirname,'../service-ui-polish-v1.js'),'utf8');
const begin=script.indexOf('  function sync() {'),end=script.indexOf('  function install() {',begin);
assert.ok(begin>=0&&end>begin,'Locate the actual service tile sync function');
const syncSource=script.slice(begin,end);
function harness(){
  let mutations=0;
  const makeClasses=(initial=[])=>{
    const items=new Set(initial);
    return {
      contains:name=>items.has(name),
      add(name){mutations++;items.add(name);},
      remove(name){mutations++;items.delete(name);},
      toggle(name,force){mutations++;if(force)items.add(name);else items.delete(name);}
    };
  };
  const tile={
    classList:makeClasses(['hidden']),
    disabled:false,
    attrs:{'aria-disabled':'false'},
    setAttribute(k,v){this.attrs[k]=v;},
    getAttribute(k){return this.attrs[k]??null;}
  };
  const homeowner={classList:makeClasses(['on'])},tenant={classList:makeClasses([])};
  const elements={pillHomeowner:homeowner,pillTenant:tenant,includeCashback:{checked:false}};
  const pills={classList:makeClasses([])};
  const card={classList:makeClasses([]),querySelector:()=>pills};
  const document={querySelector:selector=>selector==='#servicesCard [data-service="boiler"]'?tile:null};
  const $=id=>id==='servicesCard'?card:elements[id]||null;
  const sync=new Function('document','$','canonicalFuel','canonicalSims',syncSource+'; return sync;')(document,$,()=> 'both',()=>1);
  return {tile,homeowner,tenant,sync,mutationCount:()=>mutations};
}
test('startup boiler observation stabilises and cannot reschedule itself endlessly',()=>{
  const h=harness();
  h.sync();
  const first=h.mutationCount();
  assert.ok(first>0,'initial display update is allowed');
  for(let i=0;i<10;i++)h.sync();
  assert.equal(h.mutationCount(),first,'repeat reads must never write watched class attributes');
  assert.equal(h.tile.disabled,false);
});
test('switching from homeowner to tenant updates appearance once and then stabilises',()=>{
  const h=harness();h.sync();
  h.homeowner.classList.remove('on');
  h.tenant.classList.add('on');
  h.sync();
  assert.equal(h.tile.disabled,true);
  assert.equal(h.tile.attrs['aria-disabled'],'true');
  assert.equal(h.tile.classList.contains('ac-unavailable'),true);
  const after=h.mutationCount();
  for(let i=0;i<10;i++)h.sync();
  assert.equal(h.mutationCount(),after,'tenant display remains stable under repeated observer callbacks');
});
