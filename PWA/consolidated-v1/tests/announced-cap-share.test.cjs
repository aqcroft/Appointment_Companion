'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function share(active,unit=false){
 const js=read('fix-share-gate-v1.js'),start=js.indexOf('  function num('),end=js.indexOf('  function basePublicUrl(');
 const fields={region:{value:'11'},elec:{value:'2500'},gas:{value:'9500'},electricHeat:{checked:false},janRise:{value:'25.7'},forecastDefault:{value:'25.7'}};
 const doc={getElementById:id=>fields[id]||null,querySelector:s=>({dataset:s.includes('fuelSeg')?{mode:'dual'}:{tariff:'saver'}})};
 const win={latestCapModel:()=>active,Cap2027:{data:{revision:'20261127'}},ShouldIFixForecastScenario:()=>({mode:unit?'unit':'percent',elec:32.69,gas:10.96})};
 return vm.runInNewContext(js.slice(start,end)+'scenario(doc,win)',{doc,win});
}
test('new PWA shares carry the announced-cap revision and precise unit defaults',()=>{
 const s=share(true,true);assert.equal(s.cr,'20261127');assert.equal(s.ue,32.69);assert.equal(s.ug,10.96);assert(!('j' in s));
});
test('legacy PWA links keep their legacy model',()=>{assert(!('cr' in share(false)));});
test('public iframe forwards the revision',()=>{assert(read('should-i-fix/index.html').includes('"ug","ci","cr"'));});
test('app, EV, Should I Fix, release, manifest and cache versions agree',()=>{
 for(const f of ['index.html','ev/index.html','should-i-fix/index.html','manifest.webmanifest','release-v2.72.js','unified-status-v2.59.0.js'])assert(read(f).includes('v2.72'),f);
 assert(read('sw.js').includes('v2-72-cap-20261127'));
});
