"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Companion Should I Fix embedded calculator loads new 28.8% approved source and keeps public scenario parameters',()=>{
 const shell=read('should-i-fix/index.html');
 assert.ok(shell.includes('https://aqcroft.github.io/ShouldIFix/Oct2026.html'));
 assert.ok(shell.includes('20261106-sif-mse-precision-v26620'));
 for(const key of ['"j"','"um"','"ue"','"ug"'])assert.ok(shell.includes(key),key);
 assert.ok(shell.includes('fix-share-gate-v1.js'));
 assert.ok(shell.includes('public-partner-branding-v1.js'));
});
test('All Companion tools show matching release and cache for forecast parity',()=>{
 for(const path of ['index.html','ev/index.html','should-i-fix/index.html','manifest.webmanifest','unified-status-v2.59.0.js']){
  assert.ok(read(path).includes('v2.66.23'),path);
 }
 assert.ok(read('sw.js').includes('v2-66-23-customer-bulk'));
 assert.ok(read('docs/CHANGELOG.md').startsWith('## v2.66.23'));
});
test('Shared unit-rate buttons remain six options per fuel including halfp gas',()=>{
 const source=read('fix-share-gate-v1.js');
 assert.match(source,/Number\.isFinite\(Number\(manual\.gas\)\)/);
 assert.match(source,/Number\.isFinite\(Number\(manual\.elec\)\)/);
 assert.match(source,/out\.um='1'/);
});
