'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('Companion forwards unit-rate scenarios to public customer iframe',()=>{
 const loader=read('should-i-fix/index.html');
 for(const x of ['"um"','"ue"','"ug"'])assert(loader.includes(x),x);
});
test('Companion share guard preserves halfp gas options, 33p electricity, and existing identity controls',()=>{
 const source=read('fix-share-gate-v1.js');
 assert.match(source,/Number\.isFinite\(Number\(manual\.gas\)\)/);
 assert.match(source,/Number\.isFinite\(Number\(manual\.elec\)\)/);
 assert.match(source,/out\.um='1'/);
 assert.match(source,/out\.ug=Number\(manual\.gas\)/);
 assert.match(source,/verifiedPartnerId/);
 assert.match(source,/basketUrl/);
});
test('App, EV and Should I Fix use one v2.66.25',()=>{
 for(const file of ['index.html','ev/index.html','should-i-fix/index.html','manifest.webmanifest','unified-status-v2.59.0.js']){
  assert.match(read(file),/v2\.66\.25/,file);
 }
 assert.match(read('sw.js'),/v2-66-25-financial-precision/);
});
