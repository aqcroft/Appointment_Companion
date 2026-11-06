'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('v2.66.20 across main, EV, specialist, About, manifest and cache; retain v2.66.19 release',()=>{
 for(const p of ['index.html','ev/index.html','should-i-fix/index.html','manifest.webmanifest','unified-status-v2.59.0.js']){
   assert.ok(read(p).includes('v2.66.20'),p);
 }
 assert.match(read('sw.js'),/v2-66-20-sif-precision-20261106/);
 assert.match(read('index.html'),/release-v2\.66\.19\.js/);
 assert.ok(read('docs/CHANGELOG.md').startsWith('## v2.66.20'));
});
test('desktop-only donor title bar is hidden; mobile back and public views remain intact',()=>{
 const shell=read('should-i-fix/index.html');
 assert.ok(shell.includes('20261106-sif-mse-precision-v26620'));
 assert.ok(shell.includes('acSifDesktopCompactBar'));
 assert.match(shell,/min-width: 760px/);
 assert.match(shell,/body:not\(\.public-mode\) > \.bar\{display:none!important\}/);
 assert.ok(shell.includes("if(!publicView) html=html.replace('</head>'"));
 assert.ok(!shell.includes('body > .bar{display:none!important}'));
});
test('Companion passes unit-mode pence with full floating-point precision into shared URL data',()=>{
 const s=read('fix-share-gate-v1.js');
 const a=s.indexOf('  function num(el) {'),b=s.indexOf('  function basePublicUrl(',a);
 assert(a>=0&&b>a);
 const functions=s.slice(a,b);
 const fakeDoc={
   querySelector:x=>x.includes('#fuelSeg')?{dataset:{mode:'dual'}}:{dataset:{tariff:'saver'}},
   getElementById:k=>({region:{value:'11'},elec:{value:'3000'},gas:{value:'12000'},
     electricHeat:{checked:false},janRise:{value:'28.8'},forecastDefault:{value:'28.8'}}[k]||null)
 };
 const gas=11.356258172241859,elec=33.29827983690952;
 const scope={Number,Math,window:{},URL};
 vm.runInNewContext(functions+'\nvar finalScenario=scenario(doc,win);',Object.assign(scope,{
   doc:fakeDoc,win:{ShouldIFixForecastScenario:()=>({mode:'unit',gas,elec})}
 }));
 const out=scope.finalScenario;
 assert.equal(out.um,'1');assert.equal(out.ug,gas);assert.equal(out.ue,elec);
 assert.equal(String(out.ug),String(gas)); // full JS numeric precision survives
});
test('Partner-only shared scenario code does not include retired hardcoded pence allowlists',()=>{
 const s=read('fix-share-gate-v1.js');
 assert.match(s,/Number\.isFinite\(Number\(manual\.elec\)\)/);
 assert.match(s,/Number\.isFinite\(Number\(manual\.gas\)\)/);
 assert.doesNotMatch(s,/\[30,31,32,33,34,35\]\.includes\(Number\(manual\.elec\)\)/);
});
