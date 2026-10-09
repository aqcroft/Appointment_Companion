(function(){
'use strict';
var FEED='https://script.google.com/macros/s/AKfycbw-TllTpk_dbFjHhmojgeai9gKNGRzRaA_BtMooVSLeqvg614mONQyrpElC4M8vqP51/exec';
var VAT=1.05,OFGEM={low:1600,medium:2500,high:3800},REGIONS={10:'Eastern',11:'East Mids',12:'London',13:'Manweb',14:'Midlands',15:'Northern',16:'Norweb',17:'Scottish Hydro',18:'Scottish Power',19:'Seeboard',20:'Southern',21:'Swalec',22:'Sweb',23:'Yorkshire'};
var state={tier:2,region:11,eff:3.2,icon:'🚙',period:'month',usageMode:'medium',stress:0,data:null,status:'loading',evPct:10,e7NightPct:15,e7Actual:false,e7DayActual:null,e7NightActual:null,openDetails:{},timingOpen:false,meterMode:false,vatPercent:5,meterSource:'ev',considerE7:false};
var $=function(id){return document.getElementById(id)};
function number(v){if(v===null||v===undefined||v==='')return null;var x=parseFloat(String(v).replace(/[^0-9.\-]/g,''));return isNaN(x)?null:x}
function input(id){var x=parseFloat($(id).value);return isNaN(x)?0:x}
function lower(v){return String(v||'').trim().toLowerCase()}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function money(a){if(!isFinite(a))return'£—';return'£'+Math.round(state.period==='month'?a/12:a).toLocaleString('en-GB')}
function kwh(v){return Math.round(v).toLocaleString('en-GB')+' kWh'}
function homeKwh(){return input('houseKwh')||OFGEM.medium}
function tierFromName(name,type){var s=lower(name);if(type==='fixed'){if(s.indexOf('fixed saver')>=0)return 2;if(s.indexOf('fixed start')>=0)return 0;if(/^fixed\s+\d+/.test(s)||s==='fixed')return 1}if(type==='variable'){if(s.indexOf('double gold')>=0)return 2;if(/(^|\s)gold(\s|$)/.test(s))return 1;if(/(^|\s)value(\s|$)/.test(s))return 0}if(type==='variable_ev'){if(s.indexOf('double gold')>=0)return 2;if(/(^|\s)gold(\s|$)/.test(s))return 1;if(/(^|\s)value(\s|$)/.test(s))return 0}return null}
function regionRows(){var a=state.data&&Array.isArray(state.data.tariffLive)?state.data.tariffLive:[];return a.filter(function(r){var rg=parseInt(r.region_no!=null?r.region_no:r.regionNo,10),pm=lower(r.payment_method!=null?r.payment_method:r.paymentMethod);return rg===state.region&&(!pm||pm==='dd'||pm==='direct debit')})}
function mapped(){var out={0:{},1:{},2:{}};regionRows().forEach(function(r){var type=lower(r.tariff_type!=null?r.tariff_type:r.tariffType),name=r.tariff_name!=null?r.tariff_name:r.tariffName,t=tierFromName(name,type);if(t===null)return;if(type==='fixed')out[t].fixed=r;else if(type==='variable')out[t].variable=r;else if(type==='variable_ev')out[t].ev=r});return out}
function rate(row,kind){if(!row)return null;var sc,day,night;if(kind==='fixed'||kind==='variable'){sc=number(row.EDSC_Std);day=number(row.EUR_Std);night=null}else if(kind==='fixedE7'||kind==='variableE7'){sc=number(row.EDSC_E7);day=number(row.EUR_E7_Day);night=number(row.EUR_E7_Night)}else{sc=number(row.EDSC_Std);day=number(row.EUR_EV_Peak);night=number(row.EUR_EV_OffPeak)}if(sc===null||day===null||((kind==='ev'||kind.indexOf('E7')>=0)&&night===null))return null;return{sc:sc,day:day,night:night,discount:number(row.dual_fuel_discount_ex_vat)||0,name:String(row.tariff_name||''),series:String(row.fixed_series||''),fixedEnd:String(row.fixed_end_date||row.contract_end_date||''),sourceRef:String(row.source_ref||'')}}
function assumptions(){
 if(state.meterMode){
  var ep=$('acMeterPeak'),en=$('acMeterNight'),p=Number(ep.value),n=Number(en.value);
  var valid=ep.value!==''&&en.value!==''&&isFinite(p)&&isFinite(n)&&p>=0&&n>=0&&p+n>0;
  var total=valid?p+n:0,isE7=state.meterSource==='e7';
  // For readings from Economy 7, the measured off-peak window is seven hours;
  // for EV meter figures it is assumed to correspond to the EV five-hour window.
  var homePct=isE7?state.e7NightPct:state.evPct;
  var house=valid?p/Math.max(.01,1-homePct/100):0;
  var shift=house*(state.e7NightPct-state.evPct)/100;
  var e7Off=clamp(isE7?n:n+shift,0,total);
  var evOff=clamp(isE7?n-shift:n,0,total);
  return {meter:true,validMeter:valid,meterSource:state.meterSource,meterPeak:total-evOff,
   meterNight:evOff,originalPeak:valid?p:0,originalNight:valid?n:0,meterTotal:total,
   houseAssumed:house,e7Shift:valid?e7Off-evOff:0,home:0,evHome:0,evAway:0,evPct:state.evPct,
   e7Day:total-e7Off,e7Night:e7Off,e7Total:total,dual:$('dualFuel').checked};
 }
 var efficiency=input('effOverride')||state.eff,miles=input('miles'),known=input('knownEvKwh'),
  totalEv=known>0?known:(efficiency>0?miles/efficiency:0),away=clamp(input('awayPct'),0,100);
 var home=homeKwh(),day,night,invalidHistorical=false;
 if(state.considerE7){
  var a=$('acE7CurrentDay'),b=$('acE7CurrentNight'),d=Number(a.value),n=Number(b.value);
  invalidHistorical=!(a.value!==''&&b.value!==''&&isFinite(d)&&isFinite(n)&&d>=0&&n>=0&&d+n>0);
  if(!invalidHistorical){home=d+n;day=d;night=n}else{home=0;day=0;night=0}
 }else if(state.e7Actual&&state.e7DayActual!=null&&state.e7NightActual!=null&&state.e7DayActual+state.e7NightActual>0){
  day=state.e7DayActual;night=state.e7NightActual;
 }else{night=home*state.e7NightPct/100;day=home-night}
 return {meter:false,considerE7:state.considerE7,invalidHistorical:invalidHistorical,home:home,
  evHome:totalEv*(1-away/100),evAway:totalEv*away/100,evPct:state.evPct,e7Day:day,
  e7Night:night,e7Total:day+night,dual:$('dualFuel').checked};
}
// Shared rate allocation: the hero always displays overnight electricity,
// daytime electricity including the standing charge, and their exact sum.
// Legacy home/car fields remain separate in the estimated mode for the
// petrol/diesel comparison and the standard-versus-EV educational cards.
function calc(r,kind,i){
 if(!r||(i.meter&&!i.validMeter)||i.invalidHistorical)return null;
 var day=r.day*VAT,night=r.night===null?null:r.night*VAT;
 var standing=r.sc*VAT*365/100;
 if(i.dual&&r.discount)standing-=r.discount*VAT;
 standing=Math.max(0,standing);
 var offKwh=0,peakKwh=0,carChargingKwh=0,houseOffKwh=0,housePeakKwh=0;
 var desc='Single-rate tariff';
 if(i.meter){
   peakKwh=(kind==='fixed'||kind==='variable')?i.meterTotal:(kind==='ev'?i.meterPeak:i.e7Day);
   offKwh=(kind==='fixed'||kind==='variable')?0:(kind==='ev'?i.meterNight:i.e7Night);
   // The meters reveal time of use, not how much was used by the car.
   // Do not fabricate a car/house split for existing EV owners.
   var peakCost=peakKwh*day/100+standing;
   var offpeakCost=offKwh*(night===null?day:night)/100;
   return {home:peakCost,car:offpeakCost,total:peakCost+offpeakCost,
     peakCost:peakCost,offpeakCost:offpeakCost,chargingCost:null,
     day:day,night:night,peakKwh:peakKwh,offKwh:offKwh,
     standingAnnual:standing,meter:true,
     desc:'Your meter: '+kwh(peakKwh)+' daytime and '+kwh(offKwh)+' overnight.',
     fixedEnd:r.fixedEnd,sourceRef:r.sourceRef,name:r.name};
 }
 carChargingKwh=i.evHome;
 var chargeRate=day;
 if(kind==='ev'){
   houseOffKwh=i.home*i.evPct/100;
   housePeakKwh=i.home-houseOffKwh;
   offKwh=houseOffKwh+carChargingKwh;
   peakKwh=housePeakKwh;
   chargeRate=night;
   desc='EV: '+i.evPct+'% of household electricity overnight';
 }else if(kind==='fixedE7'||kind==='variableE7'){
   houseOffKwh=i.e7Night;
   housePeakKwh=i.e7Day;
   offKwh=houseOffKwh+carChargingKwh;
   peakKwh=housePeakKwh;
   chargeRate=night;
   desc='Economy 7: '+kwh(peakKwh)+' daytime / '+kwh(offKwh)+' overnight including EV charging';
 }else{
   housePeakKwh=i.home;
   peakKwh=i.home+carChargingKwh;
 }
 var cheapRate=night===null?day:night;
 var peakCost=peakKwh*day/100+standing;
 var offpeakCost=offKwh*cheapRate/100;
 var chargingCost=carChargingKwh*chargeRate/100;
 var homeCost=housePeakKwh*day/100+houseOffKwh*cheapRate/100+standing;
 // Prohibit rounding before the total: money() handles final display only.
 var total=peakCost+offpeakCost;
 return {home:homeCost,car:chargingCost,total:total,
   peakCost:peakCost,offpeakCost:offpeakCost,chargingCost:chargingCost,
   peakKwh:peakKwh,offKwh:offKwh,carChargingKwh:carChargingKwh,
   housePeakKwh:housePeakKwh,houseOffKwh:houseOffKwh,
   day:day,night:night,standingAnnual:standing,desc:desc,
   fixedEnd:r.fixedEnd,sourceRef:r.sourceRef,name:r.name};
}
function pack(m,t,k){if(k==='fixed')return rate(m[t].fixed,'fixed');if(k==='variable')return rate(m[t].variable,'variable');if(k==='ev')return rate(m[t].ev,'ev');if(k==='fixedE7')return rate(m[t].fixed,'fixedE7');if(k==='variableE7')return rate(m[t].variable,'variableE7');return null}
function series(m){var r=m[state.tier].fixed;if(r&&r.fixed_series)return String(r.fixed_series).replace(/\D/g,'');for(var t=0;t<3;t++){r=m[t].fixed;if(r&&r.fixed_series)return String(r.fixed_series).replace(/\D/g,'')}return'—'}
function displayName(r,k,t){if(r&&r.name)return(k==='fixedE7'||k==='variableE7')?r.name+' E7':r.name;if(k==='fixed')return t===0?'Fixed Start':t===1?'Fixed':'Fixed Saver';if(k==='variable')return t===0?'Value':t===1?'Gold':'Double Gold';if(k==='ev')return'EV '+(t===0?'Value':t===1?'Gold':'Double Gold');return k==='fixedE7'?'Fixed E7':'Variable E7'}
function isVariableKind(k){return k==='ev'||k==='variable'||k==='variableE7'}
function buildBaseMatrix(m,i){var kinds=['ev','variable','variableE7','fixed','fixedE7'],out={};kinds.forEach(function(k){out[k]=[];for(var t=0;t<3;t++)out[k][t]=calc(pack(m,t,k),k,i)});return out}
function scenarioCalc(base,k){
 if(!base||!state.stress||!isVariableKind(k))return base;
 var f=1+state.stress/100,result=Object.assign({},base);
 ['home','car','total','peakCost','offpeakCost','chargingCost','standingAnnual','day','night'].forEach(function(key){
   if(Number.isFinite(result[key]))result[key]*=f;
 });
 result.stress=state.stress;
 return result;
}
function setCustomHomeFromActual(){var day=Number(state.e7DayActual)||0,night=Number(state.e7NightActual)||0,sum=day+night;if(sum<=0)return;state.usageMode='custom';$('houseKwh').value=Math.round(sum);$('customWrap').classList.add('show');$('usageNote').textContent=Math.round(sum).toLocaleString('en-GB')+' kWh/year';document.querySelectorAll('#usagePills button').forEach(function(b){b.classList.toggle('on',b.dataset.use==='custom')});state.e7NightPct=sum?night/sum*100:15}
function usageAndTimeHtml(k,i,c){
  var ev=k==='ev',e7=k==='variableE7'||k==='fixedE7',flat=!ev&&!e7;
  var nightDesc=flat?'No separate overnight rate':ev?'5-hour EV overnight rate':'7-hour Economy 7 night rate';
  var dayDesc=flat?'All electricity billed at one rate':ev?'All other hours':'Economy 7 daytime hours';
  var note=flat?'On a single-rate tariff, every unit is billed at the same price. For this cost comparison all consumption sits in the daytime/standard column.':
    ev?'The overnight column includes car charging and estimated household electricity used during the five-hour EV window.':
    'Economy 7 provides a longer overnight period but a different night rate and daytime rate. Your overall annual cost determines which is better.';
  if(i.meter)note+=' Annual electricity usage already includes home EV charging, so it is not counted twice.';
  if(e7&&i.meter&&i.meterSource==='ev')note+=' The Economy 7 split is estimated from your EV meter readings.';
  if(ev&&i.meter&&i.meterSource==='e7')note+=' The five-hour EV split is estimated from your Economy 7 readings.';
  var nightPrice=c.night===null?c.day:c.night;
  return '<div class="tod-detail ac-v254-tod-detail">'+
    '<div class="tod-title">How the electricity costs are calculated</div>'+
    '<div class="tod-grid ac-v254-tod-grid">'+
      '<div class="tod-box off"><div class="tod-period">🌙 Overnight</div><div class="tod-usage">'+kwh(c.offKwh)+'</div><div class="tod-rate">'+(flat?'Single rate':nightPrice.toFixed(2)+'p/kWh')+'</div></div>'+
      '<div class="tod-box"><div class="tod-period">☀️ Daytime</div><div class="tod-usage">'+kwh(c.peakKwh)+'</div><div class="tod-rate">'+c.day.toFixed(2)+'p/kWh</div></div>'+
      '<div class="tod-box total"><div class="tod-period">⚡ Total</div><div class="tod-usage">'+kwh(c.offKwh+c.peakKwh)+'</div><div class="tod-rate">All electricity</div></div>'+
    '</div><div class="tod-note">'+nightDesc+' · '+dayDesc+'. '+note+'</div></div>';
}
function detailHtml(m,matrix,k,t,i){
  var base=matrix[k][t],c=scenarioCalc(base,k),r=pack(m,t,k);if(!c)return'';
  var flat=k==='fixed'||k==='variable',e7=k==='fixedE7'||k==='variableE7';
  var note=flat?'All electricity is charged at one unit rate; no separate overnight discount applies.':
    e7?'Economy 7 has a seven-hour night-rate window. The night rate can still be higher than an EV tariff night rate.':
    'The five-hour EV rate applies overnight to household electricity and home EV charging.';
  if(c.fixedEnd)note+=' Fixed until '+c.fixedEnd+'.';
  if(c.sourceRef)note+=' Source: '+c.sourceRef+'.';
  if(state.stress&&isVariableKind(k))note+=' Unit rates and standing charge shown are illustrative +'+state.stress+'% scenarios, not current supplier rates or guaranteed future changes.';
  note+=' Daytime figures include the daily standing charge.';
  if(i.meter)note+=' Annual electricity figures already include any home EV charging.';
  return '<div class="detail ac-v254-detail" data-close-kind="'+k+'">'+
    '<div class="detail-head"><strong>'+displayName(r,k,t)+' · '+(['Energy only','Energy + 1 service','Energy + 2 services'][t])+'</strong><button type="button" class="compact-btn" data-close-kind="'+k+'">Close breakdown ↑</button></div>'+
    '<div class="detail-grid ac-v254-detail-grid">'+
      '<div><div class="k">🌙 Overnight</div><div class="v">'+money(c.offpeakCost)+'</div></div>'+
      '<div><div class="k">☀️ Daytime</div><div class="v">'+money(c.peakCost)+'</div></div>'+
      '<div><div class="k">⚡ Total</div><div class="v">'+money(c.total)+'</div></div>'+
    '</div>'+usageAndTimeHtml(k,i,c)+'<div class="detail-note">'+note+'</div></div>';
}
function renderTable(m,matrix,i){var groups=[{label:'Variable tariffs (change every 3 months)',cls:'',rows:[['ev','EV tariff'],['variable','Standard'],['variableE7','Economy 7']]},{label:'Fixed tariffs (unit rates and standing charges are fixed)',cls:'fixed',rows:[['fixed','Standard'],['fixedE7','Economy 7']]}],all=[],html='';groups.forEach(function(g){html+='<tr class="group '+g.cls+'"><td colspan="4">'+g.label+'</td></tr>';g.rows.forEach(function(d){var k=d[0];html+='<tr data-row="'+k+'"><td class="tariff-name">'+d[1]+'<small>'+((k==='ev'||k==='variable'||k==='variableE7')?'variable':'fixed')+'</small></td>';for(var t=0;t<3;t++){var c=scenarioCalc(matrix[k][t],k);if(c){all.push({k:k,t:t,c:c});var open=state.openDetails[k]===t,heroSelected=k==='ev'&&t===state.tier;html+='<td class="cell '+(t===state.tier?'sel ':'')+(open?'open ':'')+(heroSelected?'hero-selected ':'')+'" data-kind="'+k+'" data-tier="'+t+'">'+money(c.total)+'</td>'}else html+='<td class="na '+(t===state.tier?'sel ':'')+'">—</td>'}html+='</tr>';if(state.openDetails[k]!==undefined&&state.openDetails[k]!==null){var ot=state.openDetails[k];html+='<tr class="detail-row"><td colspan="4">'+detailHtml(m,matrix,k,ot,i)+'</td></tr>'}})});$('comparison').innerHTML=html;if(all.length){var min=Math.min.apply(null,all.map(function(x){return x.c.total}));document.querySelectorAll('#comparison td.cell').forEach(function(td){var k=td.dataset.kind,t=parseInt(td.dataset.tier,10),c=scenarioCalc(matrix[k][t],k);if(c&&Math.abs(c.total-min)<.5){td.classList.add('best');td.setAttribute('data-best-label',state.stress?'LOWEST WITH THIS RISE':'LOWEST TODAY')}td.onclick=function(){if(state.openDetails[k]===t)delete state.openDetails[k];else state.openDetails[k]=t;render()}});document.querySelectorAll('.compact-btn').forEach(function(b){b.onclick=function(e){e.stopPropagation();delete state.openDetails[b.dataset.closeKind];render()}})}}
function renderUsageTiming(i){var evOff=i.home*state.evPct/100,evPeak=i.home-evOff,e7Pct=i.e7Total?i.e7Night/i.e7Total*100:state.e7NightPct;$('usageTimingPanel').hidden=!state.timingOpen;$('usageTimingToggle').setAttribute('aria-expanded',state.timingOpen?'true':'false');$('usageTimingAction').textContent=state.timingOpen?'Done':'Adjust';$('evSplitLabel').textContent=Math.round(state.evPct)+'% off-peak';$('evPeakKwh').textContent=kwh(evPeak);$('evCheapKwh').textContent=kwh(evOff);$('evTimingSlider').value=Math.round(state.evPct);$('e7SplitLabelTop').textContent=Math.round(e7Pct)+'% off-peak';$('e7DayDisplay').textContent=kwh(i.e7Day);$('e7NightDisplay').textContent=kwh(i.e7Night);$('e7TimingSlider').value=Math.round(e7Pct);$('e7TimingSlider').disabled=state.e7Actual;$('e7ActualWrap').hidden=!state.e7Actual;$('e7ActualToggle').textContent=state.e7Actual?'Use percentage estimate':'Use actual bill figures';$('e7TimingHint').textContent=state.e7Actual?'Using the peak/off-peak kWh entered from the bill.':'Defaults to 15% off-peak. *Economy 7 switching times can vary by meter and region, and some meters remain on GMT year-round. Use actual bill figures if known.';if(state.e7Actual){$('e7DayActualInput').value=Math.round(i.e7Day);$('e7NightActualInput').value=Math.round(i.e7Night)}var changed=Math.round(state.evPct)!==10||Math.round(e7Pct)!==15||state.e7Actual;$('usageTimingSummary').textContent=changed?('EV '+Math.round(state.evPct)+'% · E7 '+(state.e7Actual?'actual':Math.round(e7Pct)+'%')):'Default assumptions applied'}
function render(){
  var m=mapped(),i=assumptions(),matrix=buildBaseMatrix(m,i),t=state.tier,ec=matrix.ev[t],er=pack(m,t,'ev');
  // These icon spans can be replaced when the compact hero is enhanced.
  // Do not let a missing presentation-only icon abort tariff recalculation.
  var carIcon=$('heroCarIcon'),totalIcon=$('heroTotalIcon');
  if(carIcon)carIcon.textContent=state.icon;
  if(totalIcon)totalIcon.textContent=state.icon;
  $('fixedSeries').textContent=series(m);
  $('heroTitle').textContent='Your estimated electricity costs';
  $('heroTariff').textContent=displayName(er,'ev',t);
  var labels=document.querySelectorAll('.hero-grid .hero-box .k');
  document.documentElement.classList.toggle('ac-metered-mode',state.meterMode);
  // Identical hero definitions and icons regardless of how usage was obtained.
  if(labels.length===3){
    labels[0].textContent='🌙 Overnight';
    labels[1].textContent='☀️ Daytime';
    labels[2].textContent='⚡ Total electricity';
  }
  $('heroCar').textContent=ec?money(ec.offpeakCost):'£—';
  $('heroHome').textContent=ec?money(ec.peakCost):'£—';
  $('heroTotal').textContent=ec?money(ec.total):'£—';
  var validHero=state.meterMode?i.validMeter:!i.invalidHistorical;
  $('carMeta').textContent=validHero&&ec?kwh(ec.offKwh):'Awaiting figures';
  $('homeMeta').textContent=validHero&&ec?kwh(ec.peakKwh):'Awaiting figures';
  $('totalMeta').textContent=validHero&&ec?kwh(ec.peakKwh+ec.offKwh):'Awaiting figures';
  if(state.meterMode){
    var assumptionText=$('acMeterE7Assumptions');
    if(assumptionText)assumptionText.textContent='Home overnight: '+state.evPct+'% EV / '+state.e7NightPct+'% Economy 7';
    var economyDetails=$('acMeterAssumptions');
    if(economyDetails){
      $('acMeterEvAssumption').value=state.evPct;
      $('acMeterE7Assumption').value=state.e7NightPct;
      $('acMeterEvPct').textContent=state.evPct+'%';
      $('acMeterE7Pct').textContent=state.e7NightPct+'%';
      $('acMeterE7Shift').textContent=i.validMeter?'Economy 7: '+kwh(i.e7Day)+' daytime and '+kwh(i.e7Night)+' overnight. '+kwh(Math.abs(i.e7Shift))+' of household use may fall in the extra two cheap-rate hours.':'Enter readings to calculate the difference.';
    }
  }
  $('milesDisplay').textContent=Math.round(input('miles')).toLocaleString('en-GB')+' miles';
  document.documentElement.classList.toggle('ac-e7-considering',!state.meterMode&&state.considerE7);
  var hist=$('acE7ConsideringStatus');if(hist)hist.textContent=i.invalidHistorical?'Please enter both figures from your bill.':state.considerE7?'Your home used '+kwh(i.home)+' last year. The EV charging estimate is added separately.':'';
  renderUsageTiming(i);
  for(var x=0;x<3;x++){
    document.querySelector('#serviceButtons button[data-tier="'+x+'"]').classList.toggle('on',x===t);
    $('th'+x).classList.toggle('sel',x===t)
  }
  $('stressNote').textContent=state.stress?('Illustrative +'+state.stress+'% on variable tariff costs - see ⓘ for assumptions.'):'';
  renderTable(m,matrix,i);
  status(m);
  var std=matrix.variable[t],e7=matrix.variableE7[t];
  window.__AC_EV_TRADEOFF={
    meter:state.meterMode,meterSource:state.meterSource,considerE7:state.considerE7,validMeter:!!i.validMeter,meterPeak:i.meterPeak||0,meterNight:i.meterNight||0,meterTotal:i.meterTotal||0,
    ev:ec?{car:ec.car,home:ec.home,total:ec.total,overnightCost:ec.offpeakCost,daytimeCost:ec.peakCost,chargingCost:ec.chargingCost,overnightKwh:ec.offKwh,daytimeKwh:ec.peakKwh}:null,
    standard:std?{car:std.car,home:std.home,total:std.total,overnightCost:std.offpeakCost,daytimeCost:std.peakCost}:null,
    economy7:e7?{car:e7.car,home:e7.home,total:e7.total,overnightCost:e7.offpeakCost,daytimeCost:e7.peakCost}:null,
    standardName:displayName(pack(m,t,'variable'),'variable',t),
    services:t+1,period:state.period,miles:input('miles'),efficiency:input('effOverride')||state.eff,
    awayPct:input('awayPct'),evHomePct:state.evPct,vatPercent:state.vatPercent,vatBasis:state.vatPercent===5?'5%-inclusive annualised electricity costs':'0% electricity VAT illustration for the temporary relief period'
  };
  document.dispatchEvent(new CustomEvent('ac:ev-comparison',{detail:window.__AC_EV_TRADEOFF}));
  if(!state.stress&&ec&&matrix.ev[t]&&Math.abs(ec.total-matrix.ev[t].total)>.001)console.warn('Hero/table EV mismatch detected');
  // An earlier transient DOM failure may have left an error banner in place.
  // Once the complete tariff table and hero render again, it must not persist.
  var priorWarning=$('acEvTariffLoadNotice');
  if(priorWarning&&priorWarning.dataset.acWarningKind==='render'&&$('comparison').querySelectorAll('tr').length){
    priorWarning.remove();
    state.status=state.tariffInfo&&state.tariffInfo.source==='live'?'live':state.tariffInfo&&state.tariffInfo.materially_stale?'stale':'cached';
    status(m);
  }
}
function checkedText(info){var d=info&&info.checked_at?new Date(info.checked_at):null;if(!d||isNaN(d.getTime()))return'';var today=new Date(),same=d.toDateString()===today.toDateString();return(same?'today ':d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' ')+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
function status(m){$('feedDot').className='dot '+(state.status==='live'?'live':(state.status==='error'||state.status==='stale')?'warn':'');var ev=m[state.tier].ev,from=ev&&ev.valid_from?new Date(ev.valid_from):null,q='';if(from&&!isNaN(from.getTime()))q=['Jan-Mar','Apr-Jun','Jul-Sep','Oct-Dec'][Math.floor(from.getMonth()/3)]+' '+from.getFullYear();$('rateStrip').textContent=(q?'EV rates: '+q:'Tariffs')+' · Region '+state.region+' '+REGIONS[state.region]+' · Direct Debit · '+(state.vatPercent===5?'5% VAT included':'0% VAT illustration');var count=0;for(var t=0;t<3;t++)count+=(m[t].fixed?1:0)+(m[t].variable?1:0)+(m[t].ev?1:0);var checked=checkedText(state.tariffInfo);$('feedNote').textContent=state.status==='live'?'Tariffs checked '+(checked||'just now')+' ✓ · '+count+' of 9 rows recognised · Fixed '+series(m)+' loaded.':state.status==='cached'?'Saved tariffs available immediately'+(checked?' · checked '+checked:'')+' · checking latest data in the background…':state.status==='cached-offline'?'Using saved tariffs'+(checked?' checked '+checked:'')+' · the latest online check could not complete.':state.status==='stale'?'⚠️ Saved tariffs are materially stale'+(checked?' (last checked '+checked+')':'')+' and the latest confirmation is unavailable.':state.status==='error'?'Tariff data could not be reached and no saved snapshot is available. No figures are being guessed.':'Checking the latest tariff data…'}
var loadingFinished=false, loadingDeadline=null;
function tariffLoadNotice(message,kind) {
  var el=document.getElementById('acEvTariffLoadNotice');
  if(!el) {
    el=document.createElement('div');el.id='acEvTariffLoadNotice';
    el.setAttribute('role','alert');
    el.style.cssText='margin:10px auto;padding:10px;border:1px solid #d4b87b;border-radius:10px;background:#fff8e9;color:#624a19;font:600 12px/1.4 system-ui;max-width:620px;box-sizing:border-box';
    var hero=document.querySelector('.hero');
    if(hero)hero.insertAdjacentElement('beforebegin',el);
    else document.body.appendChild(el);
  }
  el.dataset.acWarningKind=kind||'feed';
  el.replaceChildren();
  var msg=document.createElement('span');msg.textContent='⚠️ '+message+' ';
  var retry=document.createElement('button');retry.type='button';retry.textContent='Retry';
  retry.style.cssText='border:1px solid #b39558;border-radius:7px;background:#fff;color:#604817;padding:5px 11px;font:800 12px system-ui;cursor:pointer';
  retry.onclick=function(){location.reload()};
  el.appendChild(msg);el.appendChild(retry);
}
function clearTariffLoadNotice(){var el=document.getElementById('acEvTariffLoadNotice');if(el)el.remove();}
function safeRateRender(data,info) {
  state.data=data;state.tariffInfo=info||{};
  var targetStatus=info&&info.source==='live'?'live':info&&info.materially_stale?'stale':'cached';
  state.status=targetStatus;
  // The cached tariff callback can fire synchronously whilst later hero/layout
  // scripts are still loading. Allow the DOM to settle before declaring that
  // otherwise-valid tariff data cannot be displayed.
  var retryDelays=[80,280,750];
  var attempt=0;
  function paint(){
    try{
      render();
      clearTimeout(loadingDeadline);
      clearTariffLoadNotice();
      finishLoading(info&&info.source==='live'?'live':'cache');
    }catch(err){
      console.error('EV tariff display retry '+(attempt+1)+':',err);
      if(attempt<retryDelays.length){
        setTimeout(paint,retryDelays[attempt++]);
        return;
      }
      clearTimeout(loadingDeadline);
      state.status='error';
      finishLoading('error');
      tariffLoadNotice('Some tariff figures could not be displayed. Please try again.','render');
    }
  }
  paint();
}
function safeRateError(err,info) {
  console.warn('EV tariff retrieval:',err);
  state.tariffInfo=info||{};
  state.status=state.data?(info&&info.materially_stale?'stale':'cached-offline'):'error';
  clearTimeout(loadingDeadline);
  try{render()}catch(renderErr){console.error('EV tariff error view:',renderErr)}
  finishLoading(state.data?'cache':'error');
  tariffLoadNotice(state.data?'Latest tariff check failed; using saved tariffs, which may be out of date.':'Tariff data could not be reached. Figures are unavailable until refreshed.');
}
function finishLoading(mode){if(loadingFinished)return;loadingFinished=true;var cached=mode==='cache',ok=mode!=='error';$('loadingTitle').textContent=cached?'Saved tariff data ready':ok?'Latest tariff data ready':'Tariff data unavailable';$('loadingCopy').textContent=cached?'Calculations are ready while the latest data is checked in the background.':ok?'Calculations are ready.':'No saved tariff snapshot was available.';setTimeout(function(){$('loadingModal').classList.add('hide');setTimeout(function(){$('loadingModal').style.display='none'},220)},cached?40:ok?180:700)}
function load(){
  // A network request can remain pending indefinitely on mobile. Never trap
  // the user behind the loading overlay if Google Apps Script is unresponsive.
  loadingDeadline=setTimeout(function(){
    if(loadingFinished)return;
    state.status=state.data?'cached-offline':'error';
    try{render()}catch(err){console.error('EV tariff timeout render:',err)}
    finishLoading(state.data?'cache':'error');
    tariffLoadNotice(state.data?'The latest tariff check is slow. Saved figures may be out of date.':'Tariff checking took too long. No prices will be guessed.');
  },18000);
  var cache=window.AppointmentCompanionTariffs;
  if(cache&&typeof cache.load==='function'){
    try{
      cache.load(FEED,{
        onData:safeRateRender,
        onError:safeRateError
      }).catch(function(err){if(!loadingFinished)safeRateError(err,{})});
    }catch(err){safeRateError(err,{})}
    return;
  }
  fetch(FEED,{cache:'no-store'}).then(function(r){
    if(!r.ok)throw Error('HTTP '+r.status);
    return r.json();
  }).then(function(d){
    safeRateRender(d,{source:'live',checked_at:new Date().toISOString()});
  }).catch(function(err){safeRateError(err,{})});
}
function installMeterMode(){
  var hero=document.querySelector('.hero');
  if(!hero||$('acMeterModeCard'))return;
  var card=document.createElement('section');
  card.id='acMeterModeCard';card.className='ac-meter-card';
  card.innerHTML=
    '<div class="ac-meter-question">⚡ Are you…</div>'+
    '<div class="ac-meter-choices" role="group" aria-label="Electricity use calculation mode">'+
    '<button type="button" class="on" data-ac-mode="estimate" aria-pressed="true">🚙 Thinking about getting an EV</button>'+
    '<button type="button" data-ac-mode="meter" aria-pressed="false">🚗 Already an EV owner</button></div>'+
    '<div id="acMeterActual" hidden>'+
    ''+
    '<div class="ac-meter-source-label">Which tariff are these figures from?</div>'+
    '<div class="ac-meter-choices ac-source-choices" role="group" aria-label="Current electricity tariff">'+
    '<button type="button" class="on" data-ac-source="ev" aria-pressed="true">5-hour EV tariff</button>'+
    '<button type="button" data-ac-source="e7" aria-pressed="false">Economy 7</button></div>'+
    '<div class="ac-meter-fields">'+
    '<label>☀️ Day / peak (kWh per year)<input id="acMeterPeak" type="number" min="0" step="1" inputmode="numeric" placeholder="e.g. 2275"></label>'+
    '<label>🌙 Night / off-peak (kWh per year)<input id="acMeterNight" type="number" min="0" step="1" inputmode="numeric" placeholder="e.g. 4800"></label></div>'+
    ''+
    '<details id="acMeterAssumptions" class="ac-meter-details"><summary>⚙️ Change overnight household estimates <span id="acMeterE7Assumptions">EV 10% · E7 15%</span></summary>'+
    '<p>Economy 7 typically gives seven hours of cheaper electricity overnight, around midnight to 7 am - two more than UW EV. This tool estimates how much extra household electricity might benefit from those additional hours. You can change the estimate to match your habits.</p>'+
    '<label>Home electricity used overnight on UW EV <strong id="acMeterEvPct">10%</strong><input id="acMeterEvAssumption" type="range" min="0" max="50" step="1" value="10"></label>'+
    '<label>Home electricity used overnight on Economy 7 <strong id="acMeterE7Pct">15%</strong><input id="acMeterE7Assumption" type="range" min="0" max="70" step="1" value="15"></label>'+
    '<div class="ac-meter-shift" id="acMeterE7Shift">Enter readings to calculate the E7 shift.</div></details>'+
    ''+
    '</div>';
  var st=document.createElement('style');
  st.id='acMeterModeStyles';
  st.textContent=[
    '.ac-meter-card{background:#fff;border:1px solid #dce1e5;border-radius:14px;padding:12px;margin:0 0 10px;color:#29303e}',
    '.ac-meter-question{font-size:12px;font-weight:850;margin-bottom:8px}',
    '.ac-meter-choices{display:grid;grid-template-columns:1fr 1fr;gap:7px}',
    '.ac-meter-choices button{min-height:39px;background:#f6f8f8;border:1px solid #dce3e5;border-radius:10px;font:800 11px system-ui;color:#3e4752;cursor:pointer}',
    '.ac-meter-choices button.on{background:#008c80;border-color:#008c80;color:#fff}',
    '.ac-meter-source-label{font-size:11px;font-weight:850;margin:10px 0 7px}',
    '.ac-source-choices button{font-size:11px}',
    '.ac-e7-prior{background:#f0f9f7;border:1px solid #cee6df;border-radius:11px;padding:10px;margin:0 0 12px}',
    '.ac-e7-checkbox{display:flex;gap:8px;align-items:center;font-size:11px;font-weight:800;color:#176458}',
    '.ac-e7-checkbox input{width:17px;height:17px;accent-color:#008c80}',
    '.ac-e7-prior .ac-meter-fields{margin-top:10px}',
    '.ac-e7-considering #usagePills,.ac-e7-considering #usageNote,.ac-e7-considering #customWrap,.ac-e7-considering .usage-timing{display:none!important}',
    '.ac-meter-hint,.ac-meter-disclaimer{font-size:11px;color:#626b73;line-height:1.45;margin:10px 0}',
    '.ac-meter-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px}',
    '.ac-meter-fields label{font-size:11px;font-weight:800;color:#37414a}',
    '.ac-meter-fields input{display:block;width:100%;box-sizing:border-box;border:1px solid #cfdbe0;background:#f4fbfa;border-radius:10px;padding:11px;font:750 16px system-ui;color:#163c38;margin-top:5px}',
    '.ac-meter-summary{padding:9px;background:#ecf7f4;border-radius:9px;color:#126e64;font-size:11px;font-weight:700;margin-top:10px;line-height:1.4}',
    '.ac-meter-details{border-top:1px solid #e0e8e7;margin-top:10px;padding-top:10px}',
    '.ac-meter-details summary{font-size:11px;font-weight:850;cursor:pointer}',
    '.ac-meter-details summary span{font-weight:600;color:#677479}',
    '.ac-meter-details p,.ac-meter-shift{font-size:10px;color:#687178;line-height:1.45}',
    '.ac-meter-details label{display:block;font-size:11px;font-weight:800;margin:10px 0}',
    '.ac-meter-details label strong{float:right;color:#008d80}',
    '.ac-meter-details input[type="range"]{display:block;width:100%;accent-color:#008c80;margin:9px 0}',
    '.ac-metered-mode .ac-ev-estimate-only{display:none!important}',
    '.ac-metered-mode .hero-main-icon{display:flex!important}',
    '.ac-metered-mode .hero-grid .hero-box .k{white-space:normal}',
    '.ac-metered-mode .hero-value-row{justify-content:flex-start!important}',
    '@media(max-width:390px){.ac-meter-choices button{font-size:10px}.ac-meter-fields input{font-size:14px}}'
  ].join('');
  document.head.appendChild(st);
  hero.insertAdjacentElement('beforebegin',card);
  var carCard=$('vehiclePills').closest('section.card');
  var homeCard=$('usagePills').closest('section.card');
  if(homeCard&&!$('acE7Considering')){
   var prior=document.createElement('div');prior.id='acE7Considering';prior.className='ac-e7-prior';
   prior.innerHTML='<label class="ac-e7-checkbox"><input id="acE7ConsideringToggle" type="checkbox"> Already on Economy 7? Use the day and night figures from your bill.</label>'+
    '<div id="acE7ConsideringFields" hidden><div class="ac-meter-fields">'+
    '<label>☀️ Day / peak (kWh per year)<input id="acE7CurrentDay" type="number" min="0" step="1" inputmode="numeric" placeholder="Day figure from your bill"></label>'+
    '<label>🌙 Night / off-peak (kWh per year)<input id="acE7CurrentNight" type="number" min="0" step="1" inputmode="numeric" placeholder="Night figure from your bill"></label></div>'+
    '<p class="ac-meter-summary" id="acE7ConsideringStatus"></p>'+
    '<p class="ac-meter-hint">Your current day/night usage is used for Economy 7. The estimated EV charging is added once, during the cheaper overnight hours.</p></div>';
   homeCard.insertBefore(prior,$('usagePills'));
   $('acE7ConsideringToggle').onchange=function(){state.considerE7=this.checked;$('acE7ConsideringFields').hidden=!state.considerE7;render()};
   ['acE7CurrentDay','acE7CurrentNight'].forEach(function(id){$(id).oninput=render});
  }
  card.querySelectorAll('[data-ac-source]').forEach(function(btn){
   btn.onclick=function(){state.meterSource=btn.dataset.acSource;
    card.querySelectorAll('[data-ac-source]').forEach(function(b){var yes=b===btn;b.classList.toggle('on',yes);b.setAttribute('aria-pressed',String(yes))});
    render()};
  });
  if(carCard)carCard.classList.add('ac-ev-estimate-only');
  if(homeCard)homeCard.classList.add('ac-ev-estimate-only');
  card.querySelectorAll('[data-ac-mode]').forEach(function(button){
    button.onclick=function(){
      state.meterMode=button.dataset.acMode==='meter';
      card.querySelectorAll('[data-ac-mode]').forEach(function(b){var active=(b===button);b.classList.toggle('on',active);b.setAttribute('aria-pressed',active?'true':'false')});
      $('acMeterActual').hidden=!state.meterMode;
      render();
    }
  });
  ['acMeterPeak','acMeterNight'].forEach(function(id){$(id).oninput=render});
  $('acMeterEvAssumption').oninput=function(){state.evPct=Number(this.value);$('evTimingSlider').value=this.value;render()};
  $('acMeterE7Assumption').oninput=function(){state.e7NightPct=Number(this.value);$('e7TimingSlider').value=this.value;render()};
}

installMeterMode();
document.addEventListener('ac:ev-vat-request',function(event){
  var n=Number(event.detail&&event.detail.percent);
  if(n!==0&&n!==5||n===state.vatPercent)return;
  state.vatPercent=n;
  VAT=n===0?1:1.05;
  render();
});
document.querySelectorAll('#vehiclePills .vpill').forEach(function(b){b.onclick=function(){document.querySelectorAll('#vehiclePills .vpill').forEach(function(x){x.classList.remove('on')});b.classList.add('on');state.eff=parseFloat(b.dataset.eff);state.icon=b.dataset.icon;render()}});
$('miles').oninput=render;
document.querySelectorAll('#periodToggle button').forEach(function(b){b.onclick=function(){state.period=b.dataset.period;document.querySelectorAll('#periodToggle button').forEach(function(x){x.classList.toggle('on',x===b)});render()}});
document.querySelectorAll('#usagePills button').forEach(function(b){b.onclick=function(){var u=b.dataset.use;state.usageMode=u;document.querySelectorAll('#usagePills button').forEach(function(x){x.classList.toggle('on',x===b)});if(u==='custom'){$('customWrap').classList.add('show');$('usageNote').textContent=Math.round(homeKwh()).toLocaleString('en-GB')+' kWh/year';$('houseKwh').focus()}else{$('customWrap').classList.remove('show');$('houseKwh').value=OFGEM[u];$('usageNote').textContent=OFGEM[u].toLocaleString('en-GB')+' kWh/year'}state.e7Actual=false;render()}});
$('houseKwh').oninput=function(){state.usageMode='custom';state.e7Actual=false;$('usageNote').textContent=Math.round(homeKwh()).toLocaleString('en-GB')+' kWh/year';render()};
$('usageTimingToggle').onclick=function(){state.timingOpen=!state.timingOpen;render()};
$('evTimingSlider').oninput=function(){state.evPct=clamp(parseFloat(this.value)||0,0,50);render()};
$('e7TimingSlider').oninput=function(){state.e7NightPct=clamp(parseFloat(this.value)||0,0,70);state.e7Actual=false;render()};
$('e7ActualToggle').onclick=function(){if(state.e7Actual){state.e7Actual=false}else{var ii=assumptions();state.e7Actual=true;state.e7DayActual=ii.e7Day;state.e7NightActual=ii.e7Night}render()};
$('e7DayActualInput').onchange=function(){var v=parseFloat(this.value);state.e7DayActual=isNaN(v)?0:v;state.e7Actual=true;setCustomHomeFromActual();render()};
$('e7NightActualInput').onchange=function(){var v=parseFloat(this.value);state.e7NightActual=isNaN(v)?0:v;state.e7Actual=true;setCustomHomeFromActual();render()};
document.querySelectorAll('#serviceButtons button').forEach(function(b){b.onclick=function(){state.tier=parseInt(b.dataset.tier,10);render()}});
// The +21% forecast is an optional illustration, never the default.
(function(){
 var group=$('stressButtons'),buttons=group&&group.querySelectorAll('button');
 if(!group||!buttons||buttons.length<4)return;
 // The donor page starts at 0/5/10/15. Normalise *before* binding handlers.
 [0,5,15,25].forEach(function(n,i){
   var b=buttons[i];b.dataset.stress=String(n);
   b.textContent=n===0?'Today':'+'+n+'%';
   b.title=n===0?'Today’s variable electricity prices':'Illustrative +'+n+'% change';
 });
 var last=buttons[3];
 if(group.querySelector('[data-stress="21"]'))return;
 var btn=document.createElement('button');btn.type='button';btn.dataset.stress='21';
 btn.textContent='+21%';btn.title='Illustrative 21% forecast scenario - not guaranteed';
 group.insertBefore(btn,last);
})();
document.querySelectorAll('#stressButtons button').forEach(function(b){b.onclick=function(){state.stress=parseInt(b.dataset.stress,10)||0;document.querySelectorAll('#stressButtons button').forEach(function(x){x.classList.toggle('on',x===b)});render()}});
$('region').onchange=function(){state.region=parseInt(this.value,10);render()};
['awayPct','awayRate','effOverride','knownEvKwh'].forEach(function(id){$(id).oninput=render});$('dualFuel').onchange=render;
render();load();
})();
