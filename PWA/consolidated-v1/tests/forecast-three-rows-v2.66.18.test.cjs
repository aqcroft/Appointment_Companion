"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('PWA iframe refreshes to standalone fuel-aware calculator',()=>{
 const s=read('should-i-fix/index.html');
 assert.ok(s.includes('https://aqcroft.github.io/ShouldIFix/Oct2026.html'));
 assert.ok(s.includes('20261105-sif-three-rows-v26618'));
 for(const k of ['"f"','"j"','"um"','"ue"','"ug"'])assert.ok(s.includes(k),k);
 assert.ok(s.includes('fix-share-gate-v1.js'));
});
test('Companion, EV and Should I Fix share v2.66.18 release',()=>{
 for(const f of ['index.html','ev/index.html','should-i-fix/index.html','manifest.webmanifest','unified-status-v2.59.0.js'])
  assert.ok(read(f).includes('v2.66.18'),f);
 assert.ok(read('sw.js').includes('v2-66-18-three-rows'));
 assert.ok(read('docs/CHANGELOG.md').startsWith('## v2.66.18'));
});
test('pence sharing preserves halfp gas and all electricity options',()=>{
 const g=read('fix-share-gate-v1.js');
 assert.match(g,/\[10,10\.5,11,11\.5,12,13\]/);
 assert.match(g,/\[30,31,32,33,34,35\]/);
 assert.match(g,/out\.um='1'/);
});
