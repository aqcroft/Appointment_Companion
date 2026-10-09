'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

const launcher=read('specialist-launcher-v2.55.25.js');
const bridge=read('ev-bridge-v2.55.25.js');
const evRoute=read('ev/index.html');
const mainRoute=read('index.html');
const sw=read('sw.js');
new vm.Script(launcher);new vm.Script(bridge);new vm.Script(sw);
assert.match(launcher,/electricity_usage_day_kwh: c\.energy && c\.energy\.electricityUsageDayKwh/);
assert.match(launcher,/electricity_usage_night_kwh: c\.energy && c\.energy\.electricityUsageNightKwh/);
assert.match(mainRoute,/specialist-launcher-v2\.55\.25\.js/);
assert.match(evRoute,/ev-bridge-v2\.55\.25\.js/);
assert.match(sw,/ev-bridge-v2\.55\.25\.js/);
assert.match(sw,/specialist-launcher-v2\.55\.25\.js/);
assert.match(bridge,/meter_split_override: meterSplitOverride/);

const begin=bridge.indexOf("  // Main's canonical peak/off-peak profile");
const end=bridge.indexOf('  function captureState() {',begin);
assert.ok(begin>=0&&end>begin);
const apply=bridge.slice(begin,end);

function scenario(inputs,state){
  const actions=[];
  const fields={};
  const $=id=>fields[id]||(fields[id]={value:'',hidden:false});
  const env={
    linked:true,
    launch:{appointment_state:{inputs}},
    customer:{electricity_usage_kwh:7075,region:11},
    newestStartingState:()=>state,
    global:{},
    document:{querySelector:()=>null,querySelectorAll:()=>[],dispatchEvent:()=>{}},
    setInput:(id,value)=>actions.push({id,value:String(value)}),
    setCanonicalUsage:()=>{},
    trigger:()=>{},
    click:selector=>actions.push({click:selector}),
    $:$
  };
  const sandbox=Object.assign({actions,CustomEvent:function(){}},env);
  vm.runInNewContext("let meterSplitOverride=false;\n"+apply+"\napplyState();",sandbox);
  return actions;
}
const input={electricityProfile:'peak_offpeak',electricityUsageTotalKwh:'7075',electricityUsageDayKwh:'2275',electricityUsageNightKwh:'4800'};
const value=(actions,id)=>actions.find(x=>x.id===id)?.value;
let actions=scenario(input,{meter_mode:'meter'});
assert.equal(value(actions,'acMeterPeak'),'2275');
assert.equal(value(actions,'acMeterNight'),'4800');
assert.equal(value(actions,'e7DayActualInput'),undefined);
assert.ok(actions.some(x=>x.click==='[data-ac-mode="meter"]'));
actions=scenario(input,{meter_mode:'meter',meter_peak_kwh:999,meter_offpeak_kwh:999});
assert.equal(value(actions,'acMeterPeak'),'2275');
actions=scenario(input,{meter_mode:'meter',meter_peak_kwh:3000,meter_offpeak_kwh:4075,meter_split_override:true});
assert.equal(value(actions,'acMeterPeak'),'3000');
assert.equal(value(actions,'acMeterNight'),'4075');
actions=scenario({...input,electricityProfile:'standard'},{meter_mode:'meter'});
assert.equal(value(actions,'acMeterPeak'),undefined);
actions=scenario(input,{meter_mode:'estimate'});
assert.equal(value(actions,'e7DayActualInput'),'2275');
assert.equal(value(actions,'e7NightActualInput'),'4800');
actions=scenario({...input,electricityUsageNightKwh:'9999'},{meter_mode:'meter'});
assert.equal(value(actions,'acMeterPeak'),undefined);

console.log('EV v2.55.25 canonical peak/night handover regression tests passed');
