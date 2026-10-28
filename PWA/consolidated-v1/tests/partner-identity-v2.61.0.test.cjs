'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const branding=read('public-partner-branding-v1.js');
function harness({auth=null,publicPartner=null,privatePartner=null,cache=null,owner='' }={}){
  const calls=[];
  const local=new Map();
  if(auth)local.set('apptCloudPilotAuthDeviceV1',JSON.stringify(auth));
  if(cache)local.set('apptCompanionPartnerCloudProfileV1',JSON.stringify(cache));
  if(owner)local.set('apptCompanionPartnerCloudOwnerV1',owner);
  const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
  const win={AppointmentCompanionCloud:{
    getPublicPartnerProfile:async id=>{calls.push(['public',id]);if(publicPartner instanceof Error)throw publicPartner;return {partner:typeof publicPartner==='function'?publicPartner(id):publicPartner};},
    getPartnerProfile:async id=>{calls.push(['authenticated',id.partner_id]);if(privatePartner instanceof Error)throw privatePartner;return {partner:privatePartner};}
  },addEventListener:()=>{},dispatchEvent:()=>{},location:{href:'https://example.test/Appointment_Companion/PWA/consolidated-v1/should-i-fix/?public=1'}};
  const seam="  global.addEventListener('ac:ev-public-snapshot'";
  assert.ok(branding.includes(seam));
  const injected=branding.replace(seam,"  global.__identityTest={load,verified,patchOriginalCalculatorLinks,normalise,authPartnerId};\n"+seam);
  vm.runInNewContext(injected,{
    window:win,location:win.location,document:{getElementById:()=>null},
    localStorage:storage(local),sessionStorage:storage(new Map()),
    console:{warn:()=>{}},URL,Promise,Date,encodeURIComponent,
    setInterval:()=>0,clearInterval:()=>{},setTimeout:()=>0,clearTimeout:()=>{},
    innerWidth:360,innerHeight:720
  });
  return {hooks:win.__identityTest,calls,win};
}
test('Public share retrieves only the requested creator Partner profile',async()=>{
  const h=harness({publicPartner:id=>({partner_id:id,name:id==='222'?'Second Partner':'First Partner',partner_slug:'second.partner',mobile:'07700123456',photo_url:'https://example.test/photo2.jpg'})});
  const result=await h.hooks.load('222');
  assert.equal(result.name,'Second Partner');
  assert.equal(result.photo_url,'https://example.test/photo2.jpg');
  assert.equal(result.join,'https://uw.partners/second.partner/join');
  assert.deepEqual(h.calls,[['public','222']]);
});
test('A mismatched public record never substitutes another Partner',async()=>{
  const h=harness({publicPartner:{partner_id:'111',name:'Wrong Owner',photo_url:'https://example.test/wrong.jpg'}});
  const result=await h.hooks.load('222');
  assert.equal(result,null);
});
test('Offline lookup cannot use a different Partner\'s cached identity',async()=>{
  const h=harness({auth:{partner_id:'222',workspace_key:'test-key'},publicPartner:new Error('offline'),privatePartner:new Error('offline'),cache:{partner_id:'111',name:'Old Partner',partner_slug:'old.partner'},owner:'111'});
  assert.equal(await h.hooks.load('222'),null);
});
test('Owner-matched cached profile provides safe offline fallback',async()=>{
  const h=harness({auth:{partner_id:'222',workspace_key:'test-key'},publicPartner:new Error('offline'),privatePartner:new Error('offline'),cache:{partner_id:'222',name:'Second Partner',partner_slug:'second.partner',photo_url:'https://example.test/cached.jpg'},owner:'222'});
  const p=await h.hooks.load('222');assert.equal(p.name,'Second Partner');
});
test('Signed-in Partner can use authenticated profile if public lookup fails',async()=>{
  const h=harness({auth:{partner_id:'222',workspace_key:'test-key'},publicPartner:new Error('unavailable'),privatePartner:{partner_id:'222',name:'Verified Partner',partner_slug:'verified.partner'}});
  assert.equal((await h.hooks.load('222')).name,'Verified Partner');
  assert.ok(h.calls.some(x=>x[0]==='authenticated'&&x[1]==='222'));
});
test('Original calculator marketing links stay disabled until the right Partner loads',()=>{
  const h=harness();const anchor={href:'https://uw.partners/adrian.croft/join',hidden:false,dataset:{},getAttribute(){return this.href;},removeAttribute(){this.href='';}};
  const doc={querySelectorAll:()=>[anchor],getElementById:()=>null};
  h.hooks.patchOriginalCalculatorLinks(doc,null);
  assert.equal(anchor.hidden,true);assert.equal(anchor.href,'');assert.equal(anchor.dataset.acPartnerLink,'join');
  h.hooks.patchOriginalCalculatorLinks(doc,{join:'https://uw.partners/second.partner/join',booking_url:''});
  assert.equal(anchor.hidden,false);assert.equal(anchor.href,'https://uw.partners/second.partner/join');
});
test('Neutral components and modal layering have no Adrian contact fallback',()=>{
  const fix=read('../cloud-test/should-i-fix-pilot-v2.html');
  const ev=read('ev-customer-contact-v2.55.27.js');
  const gate=read('fix-share-gate-v1.js');
  const adapter=read('ev-share-adapter-v2.55.3.js');
  assert.doesNotMatch(fix,/447787400800|alt="Adrian Croft"|Adrian Croft - UW Authorised Partner/);
  assert.doesNotMatch(ev,/447787400800|adrian\.croft\/join|alt="Adrian Croft"/);
  assert.match(fix,/\.sif-profile\{position:fixed;top:12px;right:12px;z-index:1200/);
  assert.match(branding,/installDrag\(wrap,'\.sif-profile-photo'\)/);
  assert.match(branding,/installDrag\(wrap,'\.ac-ev-profile-photo'\)/);
  assert.match(gate,/await identity\.resolve\(\)/);
  assert.match(adapter,/await identity\.resolve\(\)/);
  assert.match(ev,/global\.__AC_EV_PARTNER_QUOTE/);
  for(const file of ['public-partner-branding-v1.js','ev-customer-contact-v2.55.27.js','fix-share-gate-v1.js','ev-share-adapter-v2.55.3.js'])new vm.Script(read(file));
  const match=fix.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);new vm.Script(match[1]);
});
test('All Companion entrypoints, manifest, status and cache use the v2.66.9 release',()=>{
  for(const name of ['index.html','ev/index.html','should-i-fix/index.html','manifest.webmanifest','unified-status-v2.59.0.js','sw.js']){
    const src=read(name);assert.match(src,/v2[.\-]66[.\-]9/i,name);
  }
});
console.log('Partner identity and modal layering v2.61.0 regression checks complete');
