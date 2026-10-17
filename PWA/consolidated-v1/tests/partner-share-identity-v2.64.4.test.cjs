'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const key='test-companion-password';
function storage(values={}){return{getItem:k=>values[k]||null};}
function harness(partnerId,publicId,options={}){
  const calls=[];
  const profile={partner_id:publicId||partnerId,name:'Test UW Partner'};
  const win={AppointmentCompanionCloud:{
    async getPartnerProfile(auth){calls.push('authenticated');assert.equal(auth.workspace_key,key);if(options.privateError)throw Error('offline');return{partner:options.privateProfile||profile};},
    async getPublicPartnerProfile(id){calls.push('public:'+id);if(options.publicError)throw Error('offline');return{partner:options.publicProfile||profile};}
  }};
  const auth={partner_id:partnerId,workspace_key:key};
  vm.runInNewContext(read('partner-share-identity-v2.64.4.js'),{
    window:win,localStorage:storage({'apptCloudPilotAuthDeviceV1':JSON.stringify(auth)}),
    sessionStorage:storage(),console
  });
  return {resolve:win.AppointmentCompanionShareIdentity.resolve,calls};
}
test('valid UW Partner ID is confirmed by both authenticated and public Cloud profiles',async()=>{
  const h=harness('G16990');assert.equal(await h.resolve(),'G16990');
  assert.deepEqual(h.calls,['authenticated','public:G16990']);
});
test('old random p_ ID is rejected before a share request',async()=>{
  const h=harness('p_a544c810842f48bab89f0d6cb1795c5c');
  await assert.rejects(()=>h.resolve(),/old Partner login/);
  assert.deepEqual(h.calls,[]);
});
test('a mismatched public UW Partner never receives a branded link',async()=>{
  const h=harness('G16990','AM2802');
  await assert.rejects(()=>h.resolve(),/does not match|does not match a valid/i);
});
test('unavailable public Cloud Partner profile stops share creation',async()=>{
  const h=harness('G16990','G16990',{publicError:true});
  await assert.rejects(()=>h.resolve(),/public Partner contact details could not be loaded/);
});
test('Should I Fix requires verified owner and never copies the saved auth ID into new links',()=>{
  const s=read('fix-share-gate-v1.js');
  assert.match(s,/await identity\.resolve\(\)/);
  assert.match(s,/basePublicUrl\(verifiedPartnerId\)/);
  assert.doesNotMatch(s,/function creatorPartnerId\(/);
});
test('EV Cloud and portable links retain the same verified owner',()=>{
  const adapter=read('ev-share-adapter-v2.55.3.js'),portable=read('ev-sharing-v2.55.27.js');
  assert.match(adapter,/verifiedPartnerId = await identity\.resolve\(\)/);
  assert.match(adapter,/partner_id: verifiedPartnerId/);
  assert.match(adapter,/portableMaker\(name, choice\.basket, verifiedPartnerId\)/);
  assert.match(portable,/url\.searchParams\.set\('pid',verifiedPartnerId\)/);
  assert.match(portable,/partner_id:new URL\(location\.href\)\.searchParams\.get\('pid'\)/);
  assert.match(portable,/var verifiedPartnerId=await identity\.resolve\(\)/);
});
test('Companion Earnings launch is gated on verified owner',()=>{
  const s=read('earnings-shortcut-v2.42.js');
  assert.match(s,/var partnerId = await identity\.resolve\(\)/);
  assert.match(s,/window\.location\.assign\(earningsUrl\(partnerId\)\)/);
});
test('public routes skip authenticated share gate and active app surfaces share the release version',()=>{
  const match=read('unified-status-v2.59.0.js').match(/version: '(v\d+\.\d+\.\d+)'/);
  assert.ok(match,'release metadata must declare the app version');
  const version=match[1];
  for(const name of ['index.html','should-i-fix/index.html','manifest.webmanifest'])
    assert.ok(read(name).includes(version),name+' should display '+version);
  assert.ok(read('sw.js').includes(version.replace(/\./g,'-')),'service worker cache should use the release version');
  assert.match(read('should-i-fix/index.html'), /\(publicView \? '' :/);
  assert.match(read('should-i-fix/index.html'), /partner-share-identity-v2\.64\.4\.js/);
  assert.match(read('ev/index.html'),/partner-share-identity-v2\.64\.4\.js/);
  assert.match(read('sw.js'),/partner-share-identity-v2\.64\.4\.js/);
});

test('actual Should I Fix basket share gate enforces live tariff verification before and after basket choice',()=>{
  const gate=read('fix-share-gate-v1.js');
  const matches=gate.match(/doc\.body\.dataset\.tariffDataStatus !== 'verified'/g)||[];
  assert.equal(matches.length,2,'both entry and post-basket checks are required');
  assert.match(gate,/var verifiedPartnerId = await identity\.resolve\(\)/);
  const donor=fs.readFileSync(path.resolve(root,'../cloud-test/should-i-fix-pilot-v2.html'),'utf8');
  assert.match(donor,/doc\.body\.dataset\.tariffDataStatus!=='verified'/);
});
