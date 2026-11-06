"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('PWA iframe refreshes to standalone fuel-aware calculator',()=>{
 const s=read('should-i-fix/index.html');
 assert.ok(s.includes('https://aqcroft.github.io/ShouldIFix/Oct2026.html'));
 assert.ok(s.includes('20261106-sif-mse-precision-v26620'));
 for(const k of ['"f"','"j"','"um"','"ue"','"ug"'])assert.ok(s.includes(k),k);
 assert.ok(s.includes('fix-share-gate-v1.js'));
});
test('Companion, EV and Should I Fix share v2.66.25 release',()=>{
 for(const f of ['index.html','ev/index.html','should-i-fix/index.html','manifest.webmanifest','unified-status-v2.59.0.js'])
  assert.ok(read(f).includes('v2.66.25'),f);
 assert.ok(read('sw.js').includes('v2-66-25-financial-precision'));
 assert.ok(read('docs/CHANGELOG.md').startsWith('## v2.66.25'));
});
test('pence sharing preserves precise reference rates and manual scenarios',()=>{
 const g=read('fix-share-gate-v1.js');
 assert.match(g,/Number\.isFinite\(Number\(manual\.gas\)\)/);
 assert.match(g,/Number\.isFinite\(Number\(manual\.elec\)\)/);
 assert.match(g,/out\.um='1'/);
});
