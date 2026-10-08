(function(){
'use strict';
var FEED='https://script.google.com/macros/s/AKfycbw-TllTpk_dbFjHhmojgeai9gKNGRzRaA_BtMooVSLeqvg614mONQyrpElC4M8vqP51/exec';
var VAT=1.05,OFGEM={low:1600,medium:2500,high:3800},REGIONS={10:'Eastern',11:'East Mids',12:'London',13:'Manweb',14:'Midlands',15:'Northern',16:'Norweb',17:'Scottish Hydro',18:'Scottish Power',19:'Seeboard',20:'Southern',21:'Swalec',22:'Sweb',23:'Yorkshire'};
var state={tier:2,region:11,eff:3.2,icon:'🚙',period:'month',usageMode:'medium',stress:0,data:null,status:'loading',evPct:10,e7NightPct:15,e7Actual:false,e7DayActual:null,e7NightActual:null,openDetails:{},timingOpen:false,meterMode:false};
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
    var peakField=$('acMeterPeak'),nightField=$('acMeterNight');
    var p=parseFloat(peakField.value),n=parseFloat(nightField.value);
    var valid=peakField.value!==''&&nightField.value!==''&&isFinite(p)&&isFinite(n)&&p>=0&&n>=0&&(p+n)>0;
    var total=valid?p+n:0;
    var houseEstimate=valid?p/Math.max(.01,1-state.evPct/100):0;
    var shifted=houseEstimate*(state.e7NightPct-state.evPct)/100;
    var e7Night=clamp(n+shifted,0,total);
    return {meter:true,validMeter:valid,meterPeak:valid?p:0,meterNight:valid?n:0,meterTotal:total,houseAssumed:houseEstimate,e7Shift:valid?e7Night-n:0,
      home:0,evHome:0,evAway:0,evPct:state.evPct,e7Day:Math.max(0,total-e7Night),e7Night:e7Night,e7Total:total,dual:$('dualFuel').checked};
  }
  var eff=input('effOverride')||state.eff,miles=input('miles'),known=input('knownEvKwh'),
      totalEv=known>0?known:(eff>0?miles/eff:0),away=clamp(input('awayPct'),0,100),home=homeKwh();
  var day,night;
  if(state.e7Actual&&state.e7DayActual!=null&&state.e7NightActual!=null&&(state.e7DayActual+state.e7NightActual)>0){
    day=state.e7DayActual;night=state.e7NightActual;
  }else{night=home*state.e7NightPct/100;day=home-night}
  return {meter:false,home:home,evHome:totalEv*(1-away/100),evAway:totalEv*away/100,evPct:state.evPct,e7Day:day,e7Night:night,e7Total:day+night,dual:$('dualFuel').checked};
}
function calc(r,kind,i){
  if(!r||(i.meter&&!i.validMeter))return null;
  var day=r.day*VAT,night=r.night===null?null:r.night*VAT,sc=r.sc*VAT*365/100;
  if(i.dual&&r.discount)sc-=r.discount*VAT;
  sc=Math.max(0,sc);
  if(i.meter){
    var peakKwh=(kind==='fixed'||kind==='variable')?i.meterTotal:(kind==='ev'?i.meterPeak:i.e7Day);
    var offKwh=(kind==='fixed'||kind==='variable')?0:(kind==='ev'?i.meterNight:i.e7Night);
    var peakCost=peakKwh*day/100+sc;
    var offCost=offKwh*(night===null?day:night)/100;
    return {home:peakCost,car:offCost,total:peakCost+offCost,day:day,night:night,
      peakKwh:peakKwh,offKwh:offKwh,standingAnnual:sc,meter:true,
      desc:'Metered electricity: '+kwh(peakKwh)+' peak / '+kwh(offKwh)+' off-peak. Standing charge included in peak.',
      fixedEnd:r.fixedEnd,sourceRef:r.sourceRef,name:r.name};
  }
  var hd=i.home,hn=0,carRate=day,desc='Single-rate tariff';
  if(kind==='ev'){hn=i.home*i.evPct/100;hd=i.home-hn;carRate=night;desc='EV: '+i.evPct+'% of normal home use off-peak'}
  else if(kind==='fixedE7'||kind==='variableE7'){hd=i.e7Day;hn=i.e7Night;carRate=night;desc='Economy 7: '+kwh(hd)+' peak / '+kwh(hn)+' off-peak'}
  var home=(hd*day+hn*(night===null?day:night))/100+sc,car=i.evHome*carRate/100;
  return {home:home,car:car,total:home+car,day:day,night:night,desc:desc,
    fixedEnd:r.fixedEnd,sourceRef:r.sourceRef,name:r.name};
}
function pack(m,t,k){if(k==='fixed')return rate(m[t].fixed,'fixed');if(k==='variable')return rate(m[t].variable,'variable');if(k==='ev')return rate(m[t].ev,'ev');if(k==='fixedE7')return rate(m[t].fixed,'fixedE7');if(k==='variableE7')return rate(m[t].variable,'variableE7');return null}
function series(m){var r=m[state.tier].fixed;if(r&&r.fixed_series)return String(r.fixed_series).replace(/\D/g,'');for(var t=0;t<3;t++){r=m[t].fixed;if(r&&r.fixed_series)return String(r.fixed_series).replace(/\D/g,'')}return'—'}
function displayName(r,k,t){if(r&&r.name)return(k==='fixedE7'||k==='variableE7')?r.name+' E7':r.name;if(k==='fixed')return t===0?'Fixed Start':t===1?'Fixed':'Fixed Saver';if(k==='variable')return t===0?'Value':t===1?'Gold':'Double Gold';if(k==='ev')return'EV '+(t===0?'Value':t===1?'Gold':'Double Gold');return k==='fixedE7'?'Fixed E7':'Variable E7'}
function isVariableKind(k){return k==='ev'||k==='variable'||k==='variableE7'}
function buildBaseMatrix(m,i){var kinds=['ev','variable','variableE7','fixed','fixedE7'],out={};kinds.forEach(function(k){out[k]=[];for(var t=0;t<3;t++)out[k][t]=calc(pack(m,t,k),k,i)});return out}
function scenarioCalc(base,k){if(!base||!state.stress||!isVariableKind(k))return base;var f=1+state.stress/100;return{home:base.home*f,car:base.car*f,total:base.total*f,day:base.day,night:base.night,desc:base.desc,fixedEnd:base.fixedEnd,sourceRef:base.sourceRef,name:base.name,stress:state.stress,peakKwh:base.peakKwh,offKwh:base.offKwh,standingAnnual:base.standingAnnual,meter:base.meter}}
function setCustomHomeFromActual(){var day=Number(state.e7DayActual)||0,night=Number(state.e7NightActual)||0,sum=day+night;if(sum<=0)return;state.usageMode='custom';$('houseKwh').value=Math.round(sum);$('customWrap').classList.add('show');$('usageNote').textContent=Math.round(sum).toLocaleString('en-GB')+' kWh/year';document.querySelectorAll('#usagePills button').forEach(function(b){b.classList.toggle('on',b.dataset.use==='custom')});state.e7NightPct=sum?night/sum*100:15}
function usageAndTimeHtml(k,i,c){
if(i.meter){var m1=k==='ev'?'5-hour EV overnight window':k==='variableE7'||k==='fixedE7'?'7-hour Economy 7 assumption':'Single rate';return '<div class="tod-detail"><div class="tod-title">Metered electricity allocation</div><div class="tod-grid"><div class="tod-box"><div class="tod-period">☀️ Peak</div><div class="tod-usage">'+kwh(c.peakKwh)+'</div><div class="tod-rate">'+c.day.toFixed(2)+'p/kWh</div></div><div class="tod-box off"><div class="tod-period">🌙 Off-peak</div><div class="tod-usage">'+kwh(c.offKwh)+'</div><div class="tod-rate">'+(c.night===null?'Single rate':c.night.toFixed(2)+'p/kWh')+'</div></div></div><div class="tod-note">'+m1+' · All rates shown include 5% VAT. Existing car consumption is already included; no extra mileage has been added.</div></div>';}
var isEv=k==='ev',isE7=k==='fixedE7'||k==='variableE7';
if(!isEv&&!isE7){
  return '<div class="tod-detail"><div class="tod-title">Usage and time-of-day detail</div><div class="tod-grid single"><div class="tod-box"><div class="tod-period">All day</div><div class="tod-hours">24 hours · single rate</div><div class="tod-usage">🏠 '+kwh(i.home)+' home + '+state.icon+' '+kwh(i.evHome)+' car</div><div class="tod-rate">'+c.day.toFixed(2)+'p/kWh</div></div></div></div>';
}
var peakHome=isEv?i.home*(100-state.evPct)/100:i.e7Day;
var offHome=isEv?i.home*state.evPct/100:i.e7Night;
var peakHours=isEv?'19 hours · all other times':'17 hours · remaining hours';
var offHours=isEv?'5 hours · 00:00-05:00 GMT / 01:00-06:00 BST':'7 hours · usually 00:00-07:00*';
var note=isEv?'UW EV off-peak is a five-hour window every night.':'*Economy 7 switching times can vary by meter and region. Some meters remain on GMT year-round.';
return '<div class="tod-detail"><div class="tod-title">Usage and time-of-day detail</div><div class="tod-grid"><div class="tod-box"><div class="tod-period">☀️ Peak</div><div class="tod-hours">'+peakHours+'</div><div class="tod-usage">🏠 '+kwh(peakHome)+' home</div><div class="tod-rate">'+c.day.toFixed(2)+'p/kWh</div></div><div class="tod-box off"><div class="tod-period">🌙 Off-peak</div><div class="tod-hours">'+offHours+'</div><div class="tod-usage">🏠 '+kwh(offHome)+' home + '+state.icon+' '+kwh(i.evHome)+' car</div><div class="tod-rate">'+c.night.toFixed(2)+'p/kWh</div></div></div><div class="tod-note">'+note+(isE7&&state.e7Actual?' Using actual bill kWh split.':'')+'</div></div>';
}
function detailHtml(m,matrix,k,t,i){var base=matrix[k][t],c=scenarioCalc(base,k),r=pack(m,t,k);if(!c)return'';if(i.meter){var mnote='Standing charge included in peak cost; off-peak already includes the cars.';if(k==='fixedE7'||k==='variableE7')mnote+=' Economy 7 household shift estimated using '+state.evPct+'% EV and '+state.e7NightPct+'% E7 household overnight assumptions.';return '<div class="detail" data-close-kind="'+k+'"><div class="detail-head"><strong>'+displayName(r,k,t)+' · '+(t+1)+' UW services</strong><button type="button" class="compact-btn" data-close-kind="'+k+'">Compact ↑</button></div><div class="detail-grid"><div><div class="k">☀️ Peak + standing</div><div class="v">'+money(c.home)+'</div></div><div><div class="k">🌙 Off-peak</div><div class="v">'+money(c.car)+'</div></div><div><div class="k">⚡ Total</div><div class="v">'+money(c.total)+'</div></div></div>'+usageAndTimeHtml(k,i,c)+'<div class="detail-note">'+mnote+'</div></div>'}var type=(k==='fixed'||k==='fixedE7')?'FIXED':'VARIABLE';var note='Standing charge included in Home';if(c.fixedEnd)note+=' · fixed to '+c.fixedEnd;if(state.stress&&isVariableKind(k))note+=' · illustrative +'+state.stress+'% applied to today\'s calculated costs; live rates unchanged';if(c.sourceRef)note+=' · '+c.sourceRef;return '<div class="detail" data-close-kind="'+k+'"><div class="detail-head"><strong>'+displayName(r,k,t)+' · '+(t+1)+' UW service'+(t?'s':'')+'</strong><button type="button" class="compact-btn" data-close-kind="'+k+'">Compact ↑</button></div><div class="detail-grid"><div><div class="k">🏠 Home</div><div class="v">'+money(c.home)+'</div></div><div><div class="k">'+state.icon+' Car</div><div class="v">'+money(c.car)+'</div></div><div><div class="k">⚡ Total</div><div class="v">'+money(c.total)+'</div></div></div>'+usageAndTimeHtml(k,i,c)+'<div class="detail-note">'+note+'</div></div>'}
function renderTable(m,matrix,i){var groups=[{label:'Variable tariffs',cls:'',rows:[['ev','EV tariff'],['variable','Standard'],['variableE7','Economy 7']]},{label:'Fixed tariffs',cls:'fixed',rows:[['fixed','Standard'],['fixedE7','Economy 7']]}],all=[],html='';groups.forEach(function(g){html+='<tr class="group '+g.cls+'"><td colspan="4">'+g.label+'</td></tr>';g.rows.forEach(function(d){var k=d[0];html+='<tr data-row="'+k+'"><td class="tariff-name">'+d[1]+'<small>'+((k==='ev'||k==='variable'||k==='variableE7')?'variable':'fixed')+'</small></td>';for(var t=0;t<3;t++){var c=scenarioCalc(matrix[k][t],k);if(c){all.push({k:k,t:t,c:c});var open=state.openDetails[k]===t,heroSelected=k==='ev'&&t===state.tier;html+='<td class="cell '+(t===state.tier?'sel ':'')+(open?'open ':'')+(heroSelected?'hero-selected ':'')+'" data-kind="'+k+'" data-tier="'+t+'">'+money(c.total)+'</td>'}else html+='<td class="na '+(t===state.tier?'sel ':'')+'">—</td>'}html+='</tr>';if(state.openDetails[k]!==undefined&&state.openDetails[k]!==null){var ot=state.openDetails[k];html+='<tr class="detail-row"><td colspan="4">'+detailHtml(m,matrix,k,ot,i)+'</td></tr>'}})});$('comparison').innerHTML=html;if(all.length){var min=Math.min.apply(null,all.map(function(x){return x.c.total}));document.querySelectorAll('#comparison td.cell').forEach(function(td){var k=td.dataset.kind,t=parseInt(td.dataset.tier,10),c=scenarioCalc(matrix[k][t],k);if(c&&Math.abs(c.total-min)<.5){td.classList.add('best');td.setAttribute('data-best-label',state.stress?'LOWEST IN SCENARIO':'LOWEST TODAY')}td.onclick=function(){if(state.openDetails[k]===t)delete state.openDetails[k];else state.openDetails[k]=t;render()}});document.querySelectorAll('.compact-btn').forEach(function(b){b.onclick=function(e){e.stopPropagation();delete state.openDetails[b.dataset.closeKind];render()}})}}
function renderUsageTiming(i){var evOff=i.home*state.evPct/100,evPeak=i.home-evOff,e7Pct=i.e7Total?i.e7Night/i.e7Total*100:state.e7NightPct;$('usageTimingPanel').hidden=!state.timingOpen;$('usageTimingToggle').setAttribute('aria-expanded',state.timingOpen?'true':'false');$('usageTimingAction').textContent=state.timingOpen?'Done':'Adjust';$('evSplitLabel').textContent=Math.round(state.evPct)+'% off-peak';$('evPeakKwh').textContent=kwh(evPeak);$('evCheapKwh').textContent=kwh(evOff);$('evTimingSlider').value=Math.round(state.evPct);$('e7SplitLabelTop').textContent=Math.round(e7Pct)+'% off-peak';$('e7DayDisplay').textContent=kwh(i.e7Day);$('e7NightDisplay').textContent=kwh(i.e7Night);$('e7TimingSlider').value=Math.round(e7Pct);$('e7TimingSlider').disabled=state.e7Actual;$('e7ActualWrap').hidden=!state.e7Actual;$('e7ActualToggle').textContent=state.e7Actual?'Use percentage estimate':'Use actual bill figures';$('e7TimingHint').textContent=state.e7Actual?'Using the peak/off-peak kWh entered from the bill.':'Defaults to 15% off-peak. *Economy 7 switching times can vary by meter and region, and some meters remain on GMT year-round. Use actual bill figures if known.';if(state.e7Actual){$('e7DayActualInput').value=Math.round(i.e7Day);$('e7NightActualInput').value=Math.round(i.e7Night)}var changed=Math.round(state.evPct)!==10||Math.round(e7Pct)!==15||state.e7Actual;$('usageTimingSummary').textContent=changed?('EV '+Math.round(state.evPct)+'% · E7 '+(state.e7Actual?'actual':Math.round(e7Pct)+'%')):'Default assumptions applied'}
function render(){
  var m=mapped(),i=assumptions(),matrix=buildBaseMatrix(m,i),t=state.tier,ec=matrix.ev[t],er=pack(m,t,'ev');
  $('heroCarIcon').textContent=$('heroTotalIcon').textContent=state.icon;
  $('fixedSeries').textContent=series(m);
  $('heroTitle').textContent='Selected EV tariff · '+(t+1)+' UW service'+(t?'s':'');
  $('heroTariff').textContent=displayName(er,'ev',t);
  var labels=document.querySelectorAll('.hero-grid .hero-box .k');
  document.documentElement.classList.toggle('ac-metered-mode',state.meterMode);
  if(state.meterMode){
    if(labels.length===3){labels[0].textContent='☀️ Peak + standing';labels[1].textContent='🌙 Off-peak';labels[2].textContent='⚡ Total electricity'}
    $('heroCar').textContent=ec?money(ec.home):'£—';
    $('heroHome').textContent=ec?money(ec.car):'£—';
    $('heroTotal').textContent=ec?money(ec.total):'£—';
    $('carMeta').textContent=i.validMeter?kwh(i.meterPeak):'Enter bill usage';
    $('homeMeta').textContent=i.validMeter?kwh(i.meterNight):'Enter bill usage';
    $('totalMeta').textContent=i.validMeter?kwh(i.meterTotal):'Awaiting readings';
    var statusLine=$('acMeterSummary');
    if(statusLine) statusLine.textContent=i.validMeter?'Total '+kwh(i.meterTotal)+' includes all vehicle charging. Economy 7 shifts '+kwh(Math.abs(i.e7Shift))+(i.e7Shift>=0?' more':' fewer')+' household kWh into off-peak.':'Enter both peak and off-peak figures from the same 12-month billing period.';
    var assumptionText=$('acMeterE7Assumptions');
    if(assumptionText)assumptionText.textContent='EV household overnight: '+state.evPct+'% · Economy 7 household overnight: '+state.e7NightPct+'%';
    var economyDetails=$('acMeterAssumptions');
    if(economyDetails){
      $('acMeterEvAssumption').value=state.evPct;
      $('acMeterE7Assumption').value=state.e7NightPct;
      $('acMeterEvPct').textContent=state.evPct+'%';
      $('acMeterE7Pct').textContent=state.e7NightPct+'%';
      $('acMeterE7Shift').textContent=i.validMeter?'Estimated extra E7 off-peak: '+kwh(i.e7Shift)+' · E7 peak '+kwh(i.e7Day)+' / E7 off-peak '+kwh(i.e7Night):'Enter readings to calculate the E7 shift.';
    }
  }else{
    if(labels.length===3){labels[0].textContent='Car charging';labels[1].textContent='Home';labels[2].textContent='Car + home'}
    $('heroCar').textContent=ec?money(ec.car):'£—';
    $('heroHome').textContent=ec?money(ec.home):'£—';
    $('heroTotal').textContent=ec?money(ec.total):'£—';
    $('carMeta').textContent='🔌 '+kwh(i.evHome)+' charging';
    $('homeMeta').textContent='🏠 '+kwh(i.home)+' home';
    $('totalMeta').textContent='⚡ '+kwh(i.home+i.evHome)+' total';
  }
  $('milesDisplay').textContent=Math.round(input('miles')).toLocaleString('en-GB')+' miles';
  renderUsageTiming(i);
  for(var x=0;x<3;x++){
    document.querySelector('#serviceButtons button[data-tier="'+x+'"]').classList.toggle('on',x===t);
    $('th'+x).classList.toggle('sel',x===t)
  }
  $('stressNote').textContent=state.stress?'Illustrative +'+state.stress+'% scenario applied to today\'s calculated Variable, EV and Variable E7 electricity costs. Fixed tariffs and the hero remain on today\'s live rates.':'Directional only. The uplift is applied to today\'s calculated variable electricity costs - it is not an Ofgem forecast or a prediction of how unit rates and standing charges will move.';
  renderTable(m,matrix,i);
  status(m);
  var std=matrix.variable[t],e7=matrix.variableE7[t];
  window.__AC_EV_TRADEOFF={
    meter:state.meterMode,validMeter:!!i.validMeter,meterPeak:i.meterPeak||0,meterNight:i.meterNight||0,meterTotal:i.meterTotal||0,
    ev:ec?{car:ec.car,home:ec.home,total:ec.total}:null,
    standard:std?{car:std.car,home:std.home,total:std.total}:null,
    economy7:e7?{car:e7.car,home:e7.home,total:e7.total}:null,
    standardName:displayName(pack(m,t,'variable'),'variable',t),
    services:t+1,period:state.period,miles:input('miles'),efficiency:input('effOverride')||state.eff,
    awayPct:input('awayPct'),evHomePct:state.evPct,vatBasis:'5%-inclusive annualised electricity costs'
  };
  document.dispatchEvent(new CustomEvent('ac:ev-comparison',{detail:window.__AC_EV_TRADEOFF}));
  if(!state.stress&&ec&&matrix.ev[t]&&Math.abs(ec.total-matrix.ev[t].total)>.001)console.warn('Hero/table EV mismatch detected');
}
function checkedText(info){var d=info&&info.checked_at?new Date(info.checked_at):null;if(!d||isNaN(d.getTime()))return'';var today=new Date(),same=d.toDateString()===today.toDateString();return(same?'today ':d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' ')+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
function status(m){$('feedDot').className='dot '+(state.status==='live'?'live':(state.status==='error'||state.status==='stale')?'warn':'');var ev=m[state.tier].ev,from=ev&&ev.valid_from?new Date(ev.valid_from):null,q='';if(from&&!isNaN(from.getTime()))q=['Jan-Mar','Apr-Jun','Jul-Sep','Oct-Dec'][Math.floor(from.getMonth()/3)]+' '+from.getFullYear();$('rateStrip').textContent=(q?'EV rates: '+q:'Tariffs')+' · Region '+state.region+' '+REGIONS[state.region]+' · Direct Debit · VAT incl.';var count=0;for(var t=0;t<3;t++)count+=(m[t].fixed?1:0)+(m[t].variable?1:0)+(m[t].ev?1:0);var checked=checkedText(state.tariffInfo);$('feedNote').textContent=state.status==='live'?'Tariffs checked '+(checked||'just now')+' ✓ · '+count+' of 9 rows recognised · Fixed '+series(m)+' loaded.':state.status==='cached'?'Saved tariffs available immediately'+(checked?' · checked '+checked:'')+' · checking latest data in the background…':state.status==='cached-offline'?'Using saved tariffs'+(checked?' checked '+checked:'')+' · the latest online check could not complete.':state.status==='stale'?'⚠️ Saved tariffs are materially stale'+(checked?' (last checked '+checked+')':'')+' and the latest confirmation is unavailable.':state.status==='error'?'Tariff data could not be reached and no saved snapshot is available. No figures are being guessed.':'Checking the latest tariff data…'}
var loadingFinished=false, loadingDeadline=null;
function tariffLoadNotice(message) {
  var el=document.getElementById('acEvTariffLoadNotice');
  if(!el) {
    el=document.createElement('div');el.id='acEvTariffLoadNotice';
    el.setAttribute('role','alert');
    el.style.cssText='margin:10px auto;padding:10px;border:1px solid #d4b87b;border-radius:10px;background:#fff8e9;color:#624a19;font:600 12px/1.4 system-ui;max-width:620px;box-sizing:border-box';
    var hero=document.querySelector('.hero');
    if(hero)hero.insertAdjacentElement('beforebegin',el);
    else document.body.appendChild(el);
  }
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
  state.status=info&&info.source==='live'?'live':info&&info.materially_stale?'stale':'cached';
  try {
    render();
    clearTimeout(loadingDeadline);
    clearTariffLoadNotice();
    finishLoading(info&&info.source==='live'?'live':'cache');
  } catch(err) {
    console.error('EV tariff display error:',err);
    clearTimeout(loadingDeadline);
    state.status='error';
    finishLoading('error');
    tariffLoadNotice('Tariff data arrived, but the comparison could not be rendered. No costs should be relied upon. Try again.');
  }
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
    '<div class="ac-meter-question">⚡ Which best describes your situation?</div>'+
    '<div class="ac-meter-choices" role="group" aria-label="Electricity use calculation mode">'+
    '<button type="button" class="on" data-ac-mode="estimate" aria-pressed="true">🚙 Considering an EV</button>'+
    '<button type="button" data-ac-mode="meter" aria-pressed="false">🏠 Already have an EV</button></div>'+
    '<div id="acMeterActual" hidden>'+
    '<p class="ac-meter-hint">Use your annual meter readings, including existing vehicle charging. No mileage-based electricity will be added.</p>'+
    '<div class="ac-meter-fields">'+
    '<label>☀️ Peak kWh/year<input id="acMeterPeak" type="number" min="0" step="1" inputmode="numeric" placeholder="e.g. 2275"></label>'+
    '<label>🌙 Off-peak kWh/year<input id="acMeterNight" type="number" min="0" step="1" inputmode="numeric" placeholder="e.g. 4800"></label></div>'+
    '<div class="ac-meter-summary" id="acMeterSummary">Enter both readings from the same 12-month billing period.</div>'+
    '<details id="acMeterAssumptions" class="ac-meter-details"><summary>⚙️ Economy 7 household assumptions <span id="acMeterE7Assumptions">EV 10% · E7 15%</span></summary>'+
    '<p>The bill already records all EV-window usage. Only the extra household electricity likely to fall in the longer Economy 7 window is estimated. Vehicle charging stays included once.</p>'+
    '<label>Household off-peak under EV <strong id="acMeterEvPct">10%</strong><input id="acMeterEvAssumption" type="range" min="0" max="50" step="1" value="10"></label>'+
    '<label>Household off-peak under Economy 7 <strong id="acMeterE7Pct">15%</strong><input id="acMeterE7Assumption" type="range" min="0" max="70" step="1" value="15"></label>'+
    '<div class="ac-meter-shift" id="acMeterE7Shift">Enter readings to calculate the E7 shift.</div></details>'+
    '<p class="ac-meter-disclaimer">Assumes your existing off-peak meter period matches the UW EV cheap-rate window. If those hours differ, the actual split needs adjusting.</p>'+
    '</div>';
  var st=document.createElement('style');
  st.id='acMeterModeStyles';
  st.textContent=[
    '.ac-meter-card{background:#fff;border:1px solid #dce1e5;border-radius:14px;padding:12px;margin:0 0 10px;color:#29303e}',
    '.ac-meter-question{font-size:12px;font-weight:850;margin-bottom:8px}',
    '.ac-meter-choices{display:grid;grid-template-columns:1fr 1fr;gap:7px}',
    '.ac-meter-choices button{min-height:39px;background:#f6f8f8;border:1px solid #dce3e5;border-radius:10px;font:800 11px system-ui;color:#3e4752;cursor:pointer}',
    '.ac-meter-choices button.on{background:#008c80;border-color:#008c80;color:#fff}',
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
    '.ac-metered-mode .hero-main-icon{display:none!important}',
    '.ac-metered-mode .hero-grid .hero-box .k{white-space:normal}',
    '.ac-metered-mode .hero-value-row{justify-content:flex-start!important}',
    '@media(max-width:390px){.ac-meter-choices button{font-size:10px}.ac-meter-fields input{font-size:14px}}'
  ].join('');
  document.head.appendChild(st);
  hero.insertAdjacentElement('beforebegin',card);
  var carCard=$('vehiclePills').closest('section.card');
  var homeCard=$('usagePills').closest('section.card');
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
document.querySelectorAll('#stressButtons button').forEach(function(b){b.onclick=function(){state.stress=parseInt(b.dataset.stress,10)||0;document.querySelectorAll('#stressButtons button').forEach(function(x){x.classList.toggle('on',x===b)});render()}});
$('region').onchange=function(){state.region=parseInt(this.value,10);render()};
['awayPct','awayRate','effOverride','knownEvKwh'].forEach(function(id){$(id).oninput=render});$('dualFuel').onchange=render;
render();load();
})();
