'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('PWA/consolidated-v1/ev-engine-v2.55.5.js','utf8');
const a=source.indexOf('function assumptions(){'),b=source.indexOf('// Shared rate allocation',a);
assert(a>=0&&b>a,'Actual calculator assumptions function is available');
const calculate=new Function('state','$','clamp','input','OFGEM','homeKwh',source.slice(a,b)+'return assumptions()');
const near=(a,b)=>Math.abs(a-b)<0.000001;
function meter(source,pct,day=2275,night=4800,evPct=10){
 const controls={acMeterPeak:{value:String(day)},acMeterNight:{value:String(night)},dualFuel:{checked:true}};
 return calculate({meterMode:true,meterSource:source,evPct,e7NightPct:pct},
   id=>controls[id],(x,l,h)=>Math.min(h,Math.max(l,x)),()=>0,{},()=>0);
}
const expected=4800+(2275/0.9)*0.05;
for(const prior of [15,35,70]){
 const i=meter('ev',prior);
 assert(near(i.e7Night,expected),'Legacy '+prior+'% cannot inflate measured annual E7 overnight kWh');
 assert(near(i.e7Day+i.e7Night,7075),'Annual total is conserved');
 assert(near(i.meterNight,4800),'Supplied EV overnight kWh unchanged');
 assert(near(i.e7Shift,expected-4800),'Only inferred household use shifted');
 assert.equal(i.e7EffectivePct,15,'Fixed extra two-hour assumption');
 console.log('PASS measured EV - previous E7 slider '+prior+'%: '+Math.round(i.e7Night)+' E7 night / '+Math.round(i.e7Day)+' day / '+i.e7Total+' total');
}
const inverse=meter('e7',70);
assert(near(inverse.e7Night,4800),'Actual E7 night figures retained');
assert(near(inverse.e7Day+inverse.e7Night,7075),'Actual E7 annual total unchanged');
assert(near(inverse.meterNight,4800-(2275/0.85)*0.05),'Reverse to EV five-hour period is modest');
console.log('PASS E7-source inverse annual conservation');
const noPeak=meter('ev',70,0,4800);
assert(near(noPeak.e7Night,4800),'No extra transfer when day/peak usage is zero');
assert(near(noPeak.e7Day,0),'No negative daytime use');
const customEv=meter('ev',70,2275,4800,20);
assert(near(customEv.e7Night,4800+2275/0.8*.05),'Customer-adjusted EV household percentage still affects inferred home usage, not total');
assert(near(customEv.e7Night+customEv.e7Day,7075));
const inputs={dualFuel:{checked:true}};
const future=calculate({meterMode:false,considerE7:false,e7Actual:false,e7NightPct:70,evPct:10,eff:3.2},
  id=>inputs[id],(x,l,h)=>Math.min(h,Math.max(l,x)),()=>0,{},()=>2500);
assert(near(future.e7Night,1750),'Prospective EV adjustable 70% E7 setting still works separately');
console.log('PASS 0-day edge, adjusted EV home usage, and separate prospective-EV slider');
assert(source.includes('Allows for 2 extra hours of off-peak usage on Economy 7.'));
console.log('PASS approved concise wording');
