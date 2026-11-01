/* Public guided EV comparison v2.68.0 - original calculation engines retained. */
(function(){
'use strict';
const d=document,p=new URL(location.href).searchParams;
if(p.has('ac_launch')||p.has('s')||/^(p|p2)=/.test(location.hash.slice(1)))return;
const $=id=>d.getElementById(id);
let screen=null,stage=0,model=null,applying=false,hasCore=false,overlay=null;
let state={region:p.get('region')||'11',fuel:['P','D','EV'].includes(p.get('fuel'))?p.get('fuel'):null,
miles:Math.min(30000,Math.max(1000,Number(p.get('miles'))||10000)),
eff:[3.8,3.2,2.8,2.5].includes(Number(p.get('eff')))?Number(p.get('eff')):3.2,
home:['low','medium','high','custom'].includes(p.get('home'))?p.get('home'):null,
kwh:Number(p.get('kwh'))>0?Number(p.get('kwh')):2500,
uw:['existing','exploring'].includes(p.get('uw'))?p.get('uw'):null,tier:[0,1,2].includes(Number(p.get('tier')))?Number(p.get('tier')):2,day:null,night:null};
const given={region:p.has('region'),fuel:p.has('fuel'),miles:p.has('miles'),eff:p.has('eff'),home:p.has('home'),uw:p.has('uw'),tier:p.has('tier')};
const steps=['region','fuel','miles','eff','home','meter','result','uw','tier','done'];
const $q=s=>d.querySelector(s);
function node(tag,cls,text){const v=d.createElement(tag);if(cls)v.className=cls;if(text!==undefined)v.textContent=text;return v}
function button(txt,fn,cls){const v=node('button',cls||'evw-choice',txt);v.type='button';v.onclick=fn;return v}
function fmt(n){return Number.isFinite(n)?(n<0?'-':'')+'£'+Math.round(Math.abs(n)).toLocaleString('en-GB'):'£—'}
function emit(id,value,type){const el=$(id);if(!el)return;el.value=String(value);el.dispatchEvent(new Event(type||'input',{bubbles:true}))}
function click(s){const el=$q(s);if(el)el.click()}
function visibleStep(name){if(state.fuel==='EV'&&['miles','eff','home'].includes(name))return false;if(state.fuel!=='EV'&&name==='meter')return false;if(state.uw!=='existing'&&name==='tier')return false;return true}
function next(){for(let i=stage+1;i<steps.length;i++)if(visibleStep(steps[i])&&!given[steps[i]])return i;return 9}
function prev(){for(let i=stage-1;i>=0;i--)if(visibleStep(steps[i]))return i;return 0}
function advance(){stage=next();apply();draw()}
function apply(){
 if(applying||!hasCore)return;
 applying=true;
 try{
  emit('region',state.region,'change');
  if(state.fuel==='EV'){
   click('#acMeterModeCard [data-ac-mode="meter"]');
   if(Number.isFinite(state.day)&&Number.isFinite(state.night)){emit('acMeterPeak',state.day);emit('acMeterNight',state.night)}
  }else if(state.fuel){
   click('#acMeterModeCard [data-ac-mode="estimate"]');
   click('#vehiclePills .vpill[data-eff="'+state.eff+'"]');
   emit('miles',state.miles);
   if(state.home)click('#usagePills button[data-use="'+state.home+'"]');
   if(state.home==='custom')emit('houseKwh',state.kwh);
   click('#serviceButtons button[data-tier="'+state.tier+'"]');
   const dual=$('dualFuel');if(dual&&dual.checked){dual.checked=false;dual.dispatchEvent(new Event('change',{bubbles:true}))}
  }
 }finally{applying=false}
}
function heading(txt,sub){screen.appendChild(node('h2','',txt));if(sub)screen.appendChild(node('p','evw-hint',sub))}
function choice(txt,desc,fn){
 const b=button('',fn),label=node('span');label.appendChild(node('strong','',txt));
 if(desc)label.appendChild(node('small','',desc));b.appendChild(label);b.appendChild(node('span','','›'));screen.appendChild(b);
}
function linkButton(txt,fn,cls){screen.appendChild(button(txt,fn,cls||'evw-primary'))}
function input(label,value,fn,attrs){
 const lab=node('label','',label),e=node('input');e.type='number';e.value=value===null?'':String(value);
 Object.entries(attrs||{}).forEach(([k,v])=>e.setAttribute(k,String(v)));
 e.oninput=()=>{if(e.value!==''&&Number.isFinite(Number(e.value)))fn(Number(e.value))};
 screen.appendChild(lab);screen.appendChild(e);return e;
}
function summary(){
 const m=model||window.__AC_EV_TRADEOFF,api=window.AppointmentCompanionEvFuelComparison;
 if(!m||!m.ev||!m.standard){heading('Checking live UW rates…','We cannot show a saving without confirmed tariff data.');linkButton('Try again',()=>{apply();draw()});return}
 let a,b,saving,labelA,labelB,note;
 if(state.fuel==='EV'){
  a=m.standard.total;b=m.ev.total;saving=a-b;labelA='Standard UW';labelB='UW EV tariff';
  note='These compare illustrative UW tariffs using your supplied meter figures, not your actual contract. No extra EV usage has been added.';
 }else{
  const est=api&&api.get?api.get(state.fuel):null;
  if(!est){heading('Loading your comparison…','Waiting for verified EV tariff data.');linkButton('Try again',()=>{apply();draw()});return}
  a=est.currentAnnual;b=est.evAnnual;saving=est.savingAnnual;
  labelA=state.fuel==='P'?'⛽ Petrol now':'⛽ Diesel now';labelB='⚡ Driving EV';
  note='EV cost includes charging at home AND the overall household electricity effect: cheaper overnight use, higher daytime costs and standing-charge differences. Assumes 10% household night usage, a three-service UW EV bundle and 5% VAT. No gas discount is assumed.';
  const details=node('details');details.appendChild(node('summary','','🔎 See the full cost breakdown'));
  const entries=[['Fuel now',a/12],['EV charging',est.chargingAnnual/12]];
  const kwh=Number($('houseKwh')&&$('houseKwh').value)||state.kwh,old=Number(m.standardUnitRateExVatP),day=Number(m.evPeakRateExVatP),night=Number(m.evOffPeakRateExVatP);
  if(old>0&&day>0&&night>=0){
   const pct=(Number(m.evHomePct)||0)/100,hi=kwh*(1-pct)*(day-old)*1.05/100,lo=kwh*pct*(old-night)*1.05/100;
   entries.push(['Daytime household increase',hi/12],['Overnight household saving',-lo/12],['Standing charge and discount difference',(est.homeDifferenceAnnual-hi+lo)/12]);
  }else entries.push(['Net household electricity difference',est.homeDifferenceAnnual/12]);
  entries.push(['EV cost including home effect',b/12]);
  for(const [t,n] of entries){const row=node('div','evw-detail');row.appendChild(node('span','',t));row.appendChild(node('b','',fmt(n)));details.appendChild(row)}
  details.appendChild(node('p','evw-hint','Energy costs only, not purchase, insurance, maintenance or depreciation. Figures are rounded for display.'));
  screen.appendChild(details);
 }
 heading('💷 Your quick EV comparison','Based on the answers you have given.');
 const grid=node('div','evw-grid');
 [[labelA,a],[labelB,b]].forEach(([t,n])=>{
  const box=node('div','evw-price');box.appendChild(node('span','',t));box.appendChild(node('strong','',fmt(n/12)));box.appendChild(node('small','','per month'));grid.appendChild(box);
 });
 screen.appendChild(grid);
 const out=node('div','evw-saving');out.appendChild(node('span','',saving>=0?'Estimated annual saving':'Estimated annual extra cost'));
 out.appendChild(node('strong','',fmt(saving)));screen.appendChild(out);
 screen.appendChild(node('p','evw-note',note));
 if(state.fuel!=='EV'){
  // Move the single detailed explanation underneath the headline.
  const det=screen.querySelector('details');if(det)screen.appendChild(det);
 }
 if(stage===6){linkButton('Continue - check UW options',()=>{stage=7;if(given.uw){state.uw=p.get('uw');stage=state.uw==='existing'&&!given.tier?8:9}draw()});}
 else {linkButton('Explore and customise the full calculator',close);linkButton('Edit my answers',()=>{stage=0;draw()},'evw-secondary')}
}
function draw(){
 if(!overlay)return;
 overlay.querySelector('.evw-card').replaceChildren();
 const card=overlay.querySelector('.evw-card');card.appendChild(node('div','evw-eyebrow','⚡ EV WINDOW SHOPPING • v2.68.0'));
 const prog=node('div','evw-progress');const fill=node('span');fill.style.width=Math.max(12,(stage+1)*10)+'%';prog.appendChild(fill);card.appendChild(prog);
 screen=node('div');card.appendChild(screen);
 const step=steps[stage];
 if(step==='region'){
  heading('📍 Where do you live?','Choose your electricity region so we use the right tariff rates.');
  const sel=node('select');sel.id='evwRegion';Array.from(($('region')||{options:[]}).options).forEach(o=>{
    const opt=node('option','',o.textContent.replace(/^\d+\s+/,''));opt.value=o.value;sel.appendChild(opt)});
  sel.value=state.region;sel.onchange=()=>state.region=sel.value;screen.appendChild(sel);linkButton('Continue',advance);
 }else if(step==='fuel'){
  heading('⛽ What do you drive now?','We will compare your fuel costs with home charging.');
  choice('Petrol','Compare current petrol costs',()=>{state.fuel='P';advance()});
  choice('Diesel','Compare current diesel costs',()=>{state.fuel='D';advance()});
  choice('Already electric','Compare electricity tariffs using actual meter figures',()=>{state.fuel='EV';advance()});
 }else if(step==='miles'){
  heading('🚗 About how many miles per year?','An estimate is fine - you can adjust it later.');
  const val=node('div','evw-value',state.miles.toLocaleString('en-GB')+' miles');
  const s=node('input');s.type='range';s.min='1000';s.max='30000';s.step='500';s.value=String(state.miles);
  s.oninput=()=>{state.miles=Number(s.value);val.textContent=state.miles.toLocaleString('en-GB')+' miles'};
  screen.appendChild(val);screen.appendChild(s);linkButton('Continue',advance);
 }else if(step==='eff'){
  heading('🚙 What sort of EV?','These are the same efficiency presets as in the calculator.');
  [['Family hatchback','3.8 miles/kWh',3.8],['Family SUV','3.2 miles/kWh',3.2],['Large SUV / 7 seats','2.8 miles/kWh',2.8],['Van / less efficient','2.5 miles/kWh',2.5]].forEach(x=>choice(x[0],x[1],()=>{state.eff=x[2];advance()}));
 }else if(step==='home'){
  heading('🏠 How much electricity does your home use?','Includes household savings from cheaper night-time electricity and any higher daytime costs.');
  [['Low','1,600 kWh/year',1600],['Medium','2,500 kWh/year',2500],['High','3,800 kWh/year',3800]].forEach(x=>choice(x[0],x[1],()=>{state.home=x[0].toLowerCase();state.kwh=x[2];advance()}));
  const det=node('details');det.appendChild(node('summary','','I know my actual annual kWh'));
  const x=node('input');x.type='number';x.value=String(state.kwh);x.min='1';x.max='200000';x.oninput=()=>{state.home='custom';state.kwh=Number(x.value)};det.appendChild(x);
  det.appendChild(button('Use my own figures',()=>{if(state.kwh>0){state.home='custom';advance()}},'evw-primary'));screen.appendChild(det);
 }else if(step==='meter'){
  heading('⚡ Annual electricity use from your EV home','Use your bill’s annual daytime and overnight kWh. We will not add extra EV usage.');
  const x=input('Daytime kWh',state.day,v=>state.day=v,{min:0,step:1});
  const y=input('Overnight kWh',state.night,v=>state.night=v,{min:0,step:1});
  linkButton('Show my comparison',()=>{if(x.value!==''&&y.value!==''&&Number(x.value)+Number(y.value)>0){state.day=Number(x.value);state.night=Number(y.value);advance()}});
 }else if(step==='result'||step==='done')summary();
 else if(step==='uw'){
  heading('⚡ Already with Utility Warehouse?','The first estimate assumed the best three-service UW EV rates. Let’s check the right next step.');
  choice('Yes, already with UW','Check how many additional qualifying services you have',()=>{
   state.uw='existing';window.__AC_EV_UW_STATUS='existing';d.documentElement.dataset.evUwStatus='existing';
   d.dispatchEvent(new CustomEvent('ac:ev-uw-change',{detail:{status:'existing'}}));stage=8;draw()});
  choice('Not with UW','Keep the three-service window-shopping rates',()=>{
   state.uw='exploring';state.tier=2;window.__AC_EV_UW_STATUS='exploring';d.documentElement.dataset.evUwStatus='exploring';
   d.dispatchEvent(new CustomEvent('ac:ev-uw-change',{detail:{status:'exploring'}}));stage=9;apply();draw()});
 }else if(step==='tier'){
  heading('⚡ How many other UW services?','Count qualifying services in addition to energy.');
  [['Energy only',0],['Energy + 1 other service',1],['Energy + 2 other services',2]].forEach(x=>choice(x[0],'',()=>{state.tier=x[1];stage=9;apply();draw()}));
 }
 if(stage>0)card.appendChild(button('← Back',()=>{stage=prev();draw()},'evw-back'));
 card.appendChild(node('p','evw-foot','Independent UW Partner calculator • no contact details needed • estimates only.'));
}
function close(){overlay.remove();overlay=null;let btn=$('evwReopen');if(!btn){const hero=$q('.hero');if(hero){btn=button('🔎 Review my quick EV comparison',()=>{mount();stage=9;draw()},'evw-secondary');btn.id='evwReopen';hero.insertAdjacentElement('beforebegin',btn)}}}
function mount(){
 if(overlay)return;
 overlay=node('div','evw-overlay');overlay.id='evwOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
 overlay.appendChild(node('div','evw-card'));d.body.appendChild(overlay);
 draw();
}
const st=node('style');st.textContent=[
 '.evw-overlay{position:fixed;inset:0;z-index:22000;overflow-y:auto;box-sizing:border-box;padding:12px;background:#f1f4f3;color:#233038;font:15px/1.45 system-ui,sans-serif}',
 '.evw-overlay *{box-sizing:border-box}.evw-card{max-width:490px;min-height:calc(100dvh - 24px);margin:auto;background:white;border-radius:18px;padding:22px 17px;box-shadow:0 12px 34px #0001}',
 '.evw-eyebrow{font-size:11px;font-weight:850;color:#23756b;margin-bottom:12px}.evw-progress{height:5px;background:#e8eeeb;border-radius:9px;overflow:hidden;margin-bottom:24px}.evw-progress span{display:block;height:100%;background:#008d7e}',
 '.evw-card h2{font-size:23px;line-height:1.2;letter-spacing:-.035em;margin:0 0 8px}.evw-hint{font-size:13px;color:#62747b;margin:0 0 17px}.evw-choice{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:64px;margin:9px 0;padding:13px;border:1.5px solid #d3e3df;border-radius:13px;background:#f9fcfb;color:#263c3d;text-align:left;font:750 15px system-ui;cursor:pointer}.evw-choice small{display:block;font-size:11px;font-weight:500;margin-top:5px}',
 '.evw-primary{display:block;width:100%;min-height:47px;border:none;border-radius:12px;padding:12px;background:#007e70;color:white;font:800 14px system-ui;margin:15px 0 5px;cursor:pointer}.evw-secondary{display:block;width:100%;border:1px solid #9fcbc1;border-radius:11px;background:#f7fefa;color:#006b62;padding:10px;font:800 13px system-ui;margin:9px 0}',
 '.evw-back{background:none;border:0;color:#527075;text-decoration:underline;padding:12px 3px;font:650 13px system-ui}.evw-foot{font-size:11px;color:#7d8b8d}.evw-card select,.evw-card input[type=number]{display:block;width:100%;padding:10px;border:1.5px solid #cad5d4;border-radius:10px;background:white;min-height:46px;color:#263c3d;font:650 15px system-ui}.evw-card input[type=range]{width:100%;accent-color:#008678;margin:17px 0 26px}.evw-value{text-align:center;font-size:29px;font-weight:900;margin:18px 0;color:#06665b}',
 '.evw-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:17px 0 12px}.evw-price{background:#f0f5f3;text-align:center;border-radius:13px;padding:15px 7px}.evw-price span{font-size:12px;font-weight:750}.evw-price strong{display:block;font-size:clamp(24px,7vw,35px);letter-spacing:-1px;margin:6px 0}.evw-price small{font-size:11px;color:#617179}.evw-saving{background:#e1f6eb;color:#086e50;text-align:center;border-radius:13px;padding:14px}.evw-saving span{display:block;font-size:13px;font-weight:800}.evw-saving strong{display:block;font-size:34px;font-weight:900}',
 '.evw-note{background:#f4f7f5;color:#53666a;border-radius:9px;padding:11px;font-size:12px}.evw-card details{border:1px solid #dbe5e1;padding:11px;border-radius:10px;margin:13px 0}.evw-card summary{font-size:13px;font-weight:800;cursor:pointer}.evw-detail{display:flex;justify-content:space-between;gap:8px;margin:9px 0;font-size:12px}.evw-detail b{text-align:right}.evw-card label{font-size:13px;font-weight:800;margin:10px 0 5px;display:block}',
 '#evwReopen{max-width:580px;margin:10px auto}.evw-card button:focus-visible,.evw-card select:focus-visible,.evw-card input:focus-visible{outline:3px solid #ecbe54;outline-offset:2px}'
 ].join('');
d.head.appendChild(st);
d.addEventListener('ac:ev-core-ready',()=>{hasCore=true;setTimeout(apply,0)});
d.addEventListener('ac:ev-comparison',e=>{model=e.detail;if(overlay&&(stage===6||stage===9))setTimeout(()=>{if(overlay)draw()},0)});
function start(){if(!$('region')||!$('serviceButtons')||!$('acMeterModeCard'))return false;
 stage=given.region?1:0;if(given.fuel){stage=2;while(stage<5&&given[steps[stage]])stage++;if(state.fuel==='EV')stage=5}
 mount();return true}
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start);else if(!start()){let n=0;const t=setInterval(()=>{if(start()||++n>100)clearInterval(t)},100)}
})();
