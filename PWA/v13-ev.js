(function(){
'use strict';
var FEED='https://script.google.com/macros/s/AKfycbw-TllTpk_dbFjHhmojgeai9gKNGRzRaA_BtMooVSLeqvg614mONQyrpElC4M8vqP51/exec';
var VAT=1.05,OFGEM={low:1600,medium:2500,high:3800},REGIONS={10:'Eastern',11:'East Mids',12:'London',13:'Manweb',14:'Midlands',15:'Northern',16:'Norweb',17:'Scottish Hydro',18:'Scottish Power',19:'Seeboard',20:'Southern',21:'Swalec',22:'Sweb',23:'Yorkshire'};
var state={tier:2,region:11,eff:3.2,icon:'🚙',period:'month',usageMode:'medium',stress:0,data:null,status:'loading',evPct:10,e7NightPct:15,e7Actual:false,e7DayActual:null,e7NightActual:null,openDetails:{},timingOpen:false,billProfileOpen:false,heating:'none',fixJan:24.9};
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
function assumptions(){var eff=input('effOverride')||state.eff,miles=input('miles'),known=input('knownEvKwh'),total=known>0?known:(eff>0?miles/eff:0),away=clamp(input('awayPct'),0,100),home=homeKwh();var day,night;if(state.e7Actual&&state.e7DayActual!=null&&state.e7NightActual!=null&&(state.e7DayActual+state.e7NightActual)>0){day=state.e7DayActual;night=state.e7NightActual}else{night=home*state.e7NightPct/100;day=home-night}return{home:home,evHome:total*(1-away/100),evAway:total*away/100,evPct:state.evPct,e7Day:day,e7Night:night,e7Total:day+night,dual:$('dualFuel').checked}}
function calc(r,kind,i){if(!r)return null;var day=r.day*VAT,night=r.night===null?null:r.night*VAT,sc=r.sc*VAT*365/100;if(i.dual&&r.discount)sc-=r.discount*VAT;sc=Math.max(0,sc);var hd=i.home,hn=0,carRate=day,desc='Single-rate tariff';if(kind==='ev'){hn=i.home*i.evPct/100;hd=i.home-hn;carRate=night;desc='EV: '+i.evPct+'% of normal home use off-peak'}else if(kind==='fixedE7'||kind==='variableE7'){hd=i.e7Day;hn=i.e7Night;carRate=night;desc='Economy 7: '+kwh(hd)+' peak / '+kwh(hn)+' off-peak'}var home=(hd*day+hn*(night===null?day:night))/100+sc,car=i.evHome*carRate/100;return{home:home,car:car,total:home+car,day:day,night:night,desc:desc,fixedEnd:r.fixedEnd,sourceRef:r.sourceRef,name:r.name}}
function pack(m,t,k){if(k==='fixed')return rate(m[t].fixed,'fixed');if(k==='variable')return rate(m[t].variable,'variable');if(k==='ev')return rate(m[t].ev,'ev');if(k==='fixedE7')return rate(m[t].fixed,'fixedE7');if(k==='variableE7')return rate(m[t].variable,'variableE7');return null}
function series(m){var r=m[state.tier].fixed;if(r&&r.fixed_series)return String(r.fixed_series).replace(/\D/g,'');for(var t=0;t<3;t++){r=m[t].fixed;if(r&&r.fixed_series)return String(r.fixed_series).replace(/\D/g,'')}return'—'}
function displayName(r,k,t){if(r&&r.name)return(k==='fixedE7'||k==='variableE7')?r.name+' E7':r.name;if(k==='fixed')return t===0?'Fixed Start':t===1?'Fixed':'Fixed Saver';if(k==='variable')return t===0?'Value':t===1?'Gold':'Double Gold';if(k==='ev')return'EV '+(t===0?'Value':t===1?'Gold':'Double Gold');return k==='fixedE7'?'Fixed E7':'Variable E7'}
function isVariableKind(k){return k==='ev'||k==='variable'||k==='variableE7'}
function buildBaseMatrix(m,i){var kinds=['ev','variable','variableE7','fixed','fixedE7'],out={};kinds.forEach(function(k){out[k]=[];for(var t=0;t<3;t++)out[k][t]=calc(pack(m,t,k),k,i)});return out}
function scenarioCalc(base,k){if(!base||!state.stress||!isVariableKind(k))return base;var f=1+state.stress/100;return{home:base.home*f,car:base.car*f,total:base.total*f,day:base.day,night:base.night,desc:base.desc,fixedEnd:base.fixedEnd,sourceRef:base.sourceRef,name:base.name,stress:state.stress}}
function setCustomHomeFromActual(){var day=Number(state.e7DayActual)||0,night=Number(state.e7NightActual)||0,sum=day+night;if(sum<=0)return;state.usageMode='custom';$('houseKwh').value=Math.round(sum);$('customWrap').classList.add('show');$('usageNote').textContent=Math.round(sum).toLocaleString('en-GB')+' kWh/year';document.querySelectorAll('#usagePills button').forEach(function(b){b.classList.toggle('on',b.dataset.use==='custom')});state.e7NightPct=sum?night/sum*100:15}
function usageAndTimeHtml(k,i,c){
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
function detailHtml(m,matrix,k,t,i){var base=matrix[k][t],c=scenarioCalc(base,k),r=pack(m,t,k);if(!c)return'';var type=(k==='fixed'||k==='fixedE7')?'FIXED':'VARIABLE';var note='Standing charge included in Home';if(c.fixedEnd)note+=' · fixed to '+c.fixedEnd;if(state.stress&&isVariableKind(k))note+=' · illustrative +'+state.stress+'% applied to today\'s calculated costs; live rates unchanged';if(c.sourceRef)note+=' · '+c.sourceRef;return '<div class="detail" data-close-kind="'+k+'"><div class="detail-head"><strong>'+displayName(r,k,t)+' · '+(t+1)+' UW service'+(t?'s':'')+'</strong><button type="button" class="compact-btn" data-close-kind="'+k+'">Compact ↑</button></div><div class="detail-grid"><div><div class="k">🏠 Home</div><div class="v">'+money(c.home)+'</div></div><div><div class="k">'+state.icon+' Car</div><div class="v">'+money(c.car)+'</div></div><div><div class="k">⚡ Total</div><div class="v">'+money(c.total)+'</div></div></div>'+usageAndTimeHtml(k,i,c)+'<div class="detail-note">'+note+'</div></div>'}
function renderTable(m,matrix,i){var groups=[{label:'Variable tariffs',cls:'',rows:[['ev','EV tariff'],['variable','Standard'],['variableE7','Economy 7']]},{label:'Fixed tariffs',cls:'fixed',rows:[['fixed','Standard'],['fixedE7','Economy 7']]}],all=[],html='';groups.forEach(function(g){html+='<tr class="group '+g.cls+'"><td colspan="4">'+g.label+'</td></tr>';g.rows.forEach(function(d){var k=d[0];html+='<tr data-row="'+k+'"><td class="tariff-name">'+d[1]+'<small>'+((k==='ev'||k==='variable'||k==='variableE7')?'variable':'fixed')+'</small></td>';for(var t=0;t<3;t++){var c=scenarioCalc(matrix[k][t],k);if(c){all.push({k:k,t:t,c:c});var open=state.openDetails[k]===t,heroSelected=k==='ev'&&t===state.tier;html+='<td class="cell '+(t===state.tier?'sel ':'')+(open?'open ':'')+(heroSelected?'hero-selected ':'')+'" data-kind="'+k+'" data-tier="'+t+'">'+money(c.total)+'</td>'}else html+='<td class="na '+(t===state.tier?'sel ':'')+'">—</td>'}html+='</tr>';if(state.openDetails[k]!==undefined&&state.openDetails[k]!==null){var ot=state.openDetails[k];html+='<tr class="detail-row"><td colspan="4">'+detailHtml(m,matrix,k,ot,i)+'</td></tr>'}})});$('comparison').innerHTML=html;if(all.length){var min=Math.min.apply(null,all.map(function(x){return x.c.total}));document.querySelectorAll('#comparison td.cell').forEach(function(td){var k=td.dataset.kind,t=parseInt(td.dataset.tier,10),c=scenarioCalc(matrix[k][t],k);if(c&&Math.abs(c.total-min)<.5){td.classList.add('best');td.setAttribute('data-best-label',state.stress?'LOWEST IN SCENARIO':'LOWEST TODAY')}td.onclick=function(){if(state.openDetails[k]===t)delete state.openDetails[k];else state.openDetails[k]=t;render()}});document.querySelectorAll('.compact-btn').forEach(function(b){b.onclick=function(e){e.stopPropagation();delete state.openDetails[b.dataset.closeKind];render()}})}}

var PROFILE_BASE=[9.5,9,8.5,7.5,7.5,7.5,8,8,7.5,8.5,9,9.5];
var PROFILE_HEAT=[16.4,12.8,12.7,8.6,4.4,2.7,2.6,2.4,3.2,6.9,12.2,15.1];
var FIX_MONTHS=[{k:'Sep',cal:8,days:30},{k:'Oct',cal:9,days:31},{k:'Nov',cal:10,days:30},{k:'Dec',cal:11,days:31},{k:'Jan',cal:0,days:31},{k:'Feb',cal:1,days:28},{k:'Mar',cal:2,days:31},{k:'Apr',cal:3,days:30},{k:'May',cal:4,days:31},{k:'Jun',cal:5,days:30},{k:'Jul',cal:6,days:31},{k:'Aug',cal:7,days:31}];
function normProfile(a){var s=a.reduce(function(x,y){return x+y},0);return a.map(function(v){return v/s})}
PROFILE_BASE=normProfile(PROFILE_BASE);PROFILE_HEAT=normProfile(PROFILE_HEAT);
function blendProfile(a,b,r){return normProfile(a.map(function(v,i){return v*(1-r)+b[i]*r}))}
function seasonalWeights(kind,night){
  var r=0;
  if(kind==='heatpump')r=night?.65:.55;
  else if(kind==='direct')r=night?.60:.75;
  else if(kind==='storage')r=night?.92:.45;
  return r?blendProfile(PROFILE_BASE,PROFILE_HEAT,r):PROFILE_BASE.slice();
}
function e7ExtraShift(kind){return kind==='heatpump'?.13:kind==='direct'?.08:kind==='storage'?.18:.105}
function daysInMonth(y,m){return new Date(y,m+1,0).getDate()}
function billPeriodFractions(dayW,nightW){
  var mode=$('billPeriodMode').value;
  if(mode==='month'){
    var m=parseInt($('billMonth').value,10);
    return{day:dayW[m],night:nightW[m],days:daysInMonth(2026,m),label:$('billMonth').options[$('billMonth').selectedIndex].text};
  }
  var a=$('billStartDate').value?new Date($('billStartDate').value+'T12:00:00'):null;
  var b=$('billEndDate').value?new Date($('billEndDate').value+'T12:00:00'):null;
  if(!a||!b||isNaN(a)||isNaN(b)||b<a)return null;
  var fd=0,fn=0,days=0,d=new Date(a);
  while(d<=b&&days<400){
    var m=d.getMonth(),dim=daysInMonth(d.getFullYear(),m);
    fd+=dayW[m]/dim;fn+=nightW[m]/dim;days++;
    d.setDate(d.getDate()+1);
  }
  return{day:fd,night:fn,days:days,label:a.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' - '+b.toLocaleDateString('en-GB',{day:'numeric',month:'short'})};
}
function applyBillProfile(){
  var out=$('billProfileResult'),sampleDay=input('billDayKwh'),sampleNight=input('billNightKwh');
  out.hidden=false;
  if(sampleDay+sampleNight<=0){out.innerHTML='<strong>Add the peak and off-peak kWh from the bill first.</strong>';return}
  state.heating=$('heatingProfile').value||'none';
  var dayW=seasonalWeights(state.heating,false),nightW=seasonalWeights(state.heating,true),p=billPeriodFractions(dayW,nightW);
  if(!p||p.day<=0||p.night<=0){out.innerHTML='<strong>Choose a valid bill month or date range.</strong>';return}
  var current=assumptions(),removed=0,homeNightSample=sampleNight;
  if($('billEvIncluded').checked){
    var evSample=current.evHome*(p.days/365);
    removed=Math.min(homeNightSample,evSample);
    homeNightSample=Math.max(0,homeNightSample-removed);
  }
  var annualPeak=sampleDay/p.day,annualOff=homeNightSample/p.night,annualHome=annualPeak+annualOff;
  if(!isFinite(annualHome)||annualHome<=0){out.innerHTML='<strong>Those figures could not be annualised.</strong>';return}
  var shift=e7ExtraShift(state.heating),e7Night=annualOff+annualPeak*shift,e7Day=annualPeak*(1-shift);
  state.evPct=clamp(annualOff/annualHome*100,0,80);
  state.e7NightPct=clamp(e7Night/annualHome*100,0,90);
  state.e7Actual=true;state.e7DayActual=e7Day;state.e7NightActual=e7Night;state.usageMode='custom';
  $('houseKwh').value=Math.round(annualHome);$('customWrap').classList.add('show');$('usageNote').textContent=Math.round(annualHome).toLocaleString('en-GB')+' kWh/year';
  document.querySelectorAll('#usagePills button').forEach(function(b){b.classList.toggle('on',b.dataset.use==='custom')});
  $('e7DayActualInput').value=Math.round(e7Day);$('e7NightActualInput').value=Math.round(e7Night);
  $('evTimingSlider').value=Math.round(state.evPct);$('e7TimingSlider').value=Math.round(state.e7NightPct);
  var heatLabel=$('heatingProfile').options[$('heatingProfile').selectedIndex].text;
  out.innerHTML='<strong>Estimated annual household profile</strong><br>🏠 '+kwh(annualHome)+' home electricity · EV-tariff home off-peak '+Math.round(state.evPct)+'%<br>☀️ E7 day '+kwh(e7Day)+' · 🌙 E7 night '+kwh(e7Night)+' ('+Math.round(state.e7NightPct)+'%)<br><span style="color:var(--muted)">'+p.label+' · '+heatLabel+(removed?' · about '+kwh(removed)+' of EV charging removed from this bill period':'')+'.</span>';
  render();
}
function elecFutureVat(cal){return(cal>=9||cal<=2)?1:1.05}
function fixMonthCost(r,kind,i,mi,uplift){
  if(!r)return null;
  var m=FIX_MONTHS[mi],vat=elecFutureVat(m.cal),dayW=seasonalWeights(state.heating,false),nightW=seasonalWeights(state.heating,true);
  var annualDay=kind==='ev'?i.home*(1-state.evPct/100):i.e7Day;
  var annualNight=kind==='ev'?i.home*state.evPct/100:i.e7Night;
  var hd=annualDay*dayW[m.cal],hn=annualNight*nightW[m.cal],car=i.evHome*m.days/365;
  var standing=r.sc*uplift*vat*m.days/100;
  var usage=(hd*r.day*uplift*vat+(hn+car)*(r.night==null?r.day:r.night)*uplift*vat)/100;
  var discount=i.dual&&r.discount?r.discount*vat/12:0;
  return Math.max(0,standing+usage-discount);
}
function drawFixChart(rows){
  var W=680,H=250,L=38,R=12,T=20,B=31,n=rows.length,max=Math.max.apply(null,[1].concat(rows.map(function(r){return Math.max(r.variable,r.fixed)})))*1.12;
  var x=function(i){return L+(W-L-R)*(i/(n-1))},y=function(v){return T+(H-T-B)*(1-v/max)};
  var vp=rows.map(function(r,i){return[x(i),y(r.variable)]}),fp=rows.map(function(r,i){return[x(i),y(r.fixed)]});
  var line=function(p){return p.map(function(q,i){return(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)}).join(' ')};
  var fill=function(points,kind){return'<path d="'+line(points)+' Z" fill="'+(kind==='fix'?'#f7ddd7':'#d8efe1')+'" opacity=".82"/>'};
  var bands='';
  for(var i=0;i<n-1;i++){
    var s0=rows[i].variable-rows[i].fixed,s1=rows[i+1].variable-rows[i+1].fixed;
    if(Math.abs(s0)<.0001&&Math.abs(s1)<.0001)continue;
    if(s0===0||s1===0||s0*s1>0){bands+=fill([vp[i],vp[i+1],fp[i+1],fp[i]],(Math.abs(s0)>.0001?s0:s1)>=0?'fix':'ev')}
    else{
      var t=s0/(s0-s1),cross=[vp[i][0]+(vp[i+1][0]-vp[i][0])*t,vp[i][1]+(vp[i+1][1]-vp[i][1])*t];
      bands+=fill([vp[i],cross,fp[i]],s0>0?'fix':'ev')+fill([cross,vp[i+1],fp[i+1]],s1>0?'fix':'ev');
    }
  }
  var grid='',step=Math.max(20,Math.ceil(max/4/10)*10);
  for(var v=0;v<=max;v+=step){var yy=y(v);grid+='<line x1="'+L+'" y1="'+yy+'" x2="'+(W-R)+'" y2="'+yy+'" stroke="#eeeaf4"/><text x="'+(L-5)+'" y="'+(yy+3)+'" text-anchor="end" font-size="9" fill="#948ca2" font-weight="700">£'+Math.round(v)+'</text>'}
  var labels=rows.map(function(r,i){return'<text x="'+x(i)+'" y="'+(H-10)+'" text-anchor="middle" font-size="9" fill="#948ca2" font-weight="750">'+r.k+'</text>'}).join('');
  var octX=x(1),janX=x(4);
  $('fixChart').innerHTML='<svg class="fix-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Monthly EV variable versus fixed Economy 7 cost">'+grid+bands+'<line x1="'+octX+'" y1="'+T+'" x2="'+octX+'" y2="'+(H-B)+'" stroke="#d9cfdf" stroke-dasharray="3 3"/><line x1="'+janX+'" y1="'+T+'" x2="'+janX+'" y2="'+(H-B)+'" stroke="#d9cfdf" stroke-dasharray="3 3"/><path d="'+line(vp)+'" fill="none" stroke="#df6b43" stroke-width="2.5" stroke-dasharray="5 4"/><path d="'+line(fp)+'" fill="none" stroke="#7a42c8" stroke-width="2.5"/>'+labels+'<text x="'+(octX+4)+'" y="'+(T+10)+'" font-size="9" fill="#c95b46" font-weight="850">Oct +4%</text><text x="'+(janX+4)+'" y="'+(T+10)+'" font-size="9" fill="#c95b46" font-weight="850">Jan +'+state.fixJan+'%</text></svg>';
}
function renderFixScenario(m,i){
  if(!$('fixChart'))return;
  var t=state.tier,ev=pack(m,t,'ev'),fixed=pack(m,t,'fixedE7');
  if(!ev||!fixed){$('fixHeadline').textContent='Tariff rates unavailable';$('fixHeadlineSub').textContent='The live feed needs both the EV and fixed Economy 7 rows for this service level.';$('fixChart').innerHTML='';return}
  var rows=FIX_MONTHS.map(function(mm,idx){
    var uplift=idx===0?1:(idx<4?1.04:1.04*(1+state.fixJan/100));
    return{k:mm.k,variable:fixMonthCost(ev,'ev',i,idx,uplift),fixed:fixMonthCost(fixed,'fixedE7',i,idx,1)};
  });
  var varTotal=rows.reduce(function(s,r){return s+r.variable},0),fixTotal=rows.reduce(function(s,r){return s+r.fixed},0),diff=varTotal-fixTotal;
  $('fixHeadline').textContent='£'+Math.round(Math.abs(diff)).toLocaleString('en-GB')+' cheaper '+(diff>=0?'to fix':'to stay on EV');
  $('fixHeadlineSub').textContent='September 2026 to August 2027 under the assumptions shown';
  $('fixCompareCopy').textContent=displayName(ev,'ev',t)+' vs '+displayName(fixed,'fixedE7',t)+' · '+(t+1)+' UW service'+(t?'s':'');
  drawFixChart(rows);
}
function renderUsageTiming(i){
  var evOff=i.home*state.evPct/100,evPeak=i.home-evOff,e7Pct=i.e7Total?i.e7Night/i.e7Total*100:state.e7NightPct;
  $('usageTimingPanel').hidden=!state.timingOpen;$('usageTimingToggle').setAttribute('aria-expanded',state.timingOpen?'true':'false');$('usageTimingAction').textContent=state.timingOpen?'Done':'Adjust';
  $('evSplitLabel').textContent=Math.round(state.evPct)+'% off-peak';$('evPeakKwh').textContent=kwh(evPeak);$('evCheapKwh').textContent=kwh(evOff);$('evTimingSlider').value=Math.round(state.evPct);
  $('e7SplitLabelTop').textContent=Math.round(e7Pct)+'% off-peak';$('e7DayDisplay').textContent=kwh(i.e7Day);$('e7NightDisplay').textContent=kwh(i.e7Night);$('e7TimingSlider').value=Math.round(e7Pct);$('e7TimingSlider').disabled=state.e7Actual;
  $('e7ActualWrap').hidden=!state.e7Actual;$('e7ActualToggle').textContent=state.e7Actual?'Use percentage estimate':'Use annual day/night figures';
  $('billProfiler').hidden=!state.billProfileOpen;$('billProfileToggle').textContent=state.billProfileOpen?'Close bill estimator':'Estimate from a recent bill';$('heatingProfile').value=state.heating;
  $('e7TimingHint').textContent=state.e7Actual?'Using annual day/night kWh. You can edit these figures directly or re-estimate from a bill.':'Defaults to 15% off-peak. Economy 7 switching times can vary by meter and region. Use annual figures if known, or estimate them from a recent bill.';
  if(state.e7Actual){$('e7DayActualInput').value=Math.round(i.e7Day);$('e7NightActualInput').value=Math.round(i.e7Night)}
  var changed=Math.round(state.evPct)!==10||Math.round(e7Pct)!==15||state.e7Actual;
  $('usageTimingSummary').textContent=changed?('EV '+Math.round(state.evPct)+'% · E7 '+(state.e7Actual?Math.round(e7Pct)+'% annual':Math.round(e7Pct)+'%')):'Default assumptions applied';
}
function render(){var m=mapped(),i=assumptions(),matrix=buildBaseMatrix(m,i),t=state.tier,ec=matrix.ev[t],er=pack(m,t,'ev');$('heroCarIcon').textContent=$('heroTotalIcon').textContent=state.icon;$('fixedSeries').textContent=series(m);$('heroTitle').textContent='Selected EV tariff · '+(t+1)+' UW service'+(t?'s':'');$('heroTariff').textContent=displayName(er,'ev',t);$('heroCar').textContent=ec?money(ec.car):'£—';$('heroHome').textContent=ec?money(ec.home):'£—';$('heroTotal').textContent=ec?money(ec.total):'£—';$('carMeta').textContent='🔌 '+kwh(i.evHome)+' charging';$('homeMeta').textContent='🏠 '+kwh(i.home)+' home';$('totalMeta').textContent='⚡ '+kwh(i.home+i.evHome)+' total';$('milesDisplay').textContent=Math.round(input('miles')).toLocaleString('en-GB')+' miles';renderUsageTiming(i);for(var x=0;x<3;x++){document.querySelector('#serviceButtons button[data-tier="'+x+'"]').classList.toggle('on',x===t);$('th'+x).classList.toggle('sel',x===t)}$('stressNote').textContent=state.stress?'Illustrative +'+state.stress+'% scenario applied to today\'s calculated Variable, EV and Variable E7 electricity costs. Fixed tariffs and the hero remain on today\'s live rates.':'Directional only. The uplift is applied to today\'s calculated variable electricity costs - it is not an Ofgem forecast or a prediction of how unit rates and standing charges will move.';renderTable(m,matrix,i);renderFixScenario(m,i);status(m);if(!state.stress&&ec&&matrix.ev[t]&&Math.abs(ec.total-matrix.ev[t].total)>.001)console.warn('Hero/table EV mismatch detected')}
function checkedText(info){var d=info&&info.checked_at?new Date(info.checked_at):null;if(!d||isNaN(d.getTime()))return'';var today=new Date(),same=d.toDateString()===today.toDateString();return(same?'today ':d.toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' ')+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
function status(m){$('feedDot').className='dot '+(state.status==='live'?'live':(state.status==='error'||state.status==='stale')?'warn':'');var ev=m[state.tier].ev,from=ev&&ev.valid_from?new Date(ev.valid_from):null,q='';if(from&&!isNaN(from.getTime()))q=['Jan-Mar','Apr-Jun','Jul-Sep','Oct-Dec'][Math.floor(from.getMonth()/3)]+' '+from.getFullYear();$('rateStrip').textContent=(q?'EV rates: '+q:'Tariffs')+' · Region '+state.region+' '+REGIONS[state.region]+' · Direct Debit · VAT incl.';var count=0;for(var t=0;t<3;t++)count+=(m[t].fixed?1:0)+(m[t].variable?1:0)+(m[t].ev?1:0);var checked=checkedText(state.tariffInfo);$('feedNote').textContent=state.status==='live'?'Tariffs checked '+(checked||'just now')+' ✓ · '+count+' of 9 rows recognised · Fixed '+series(m)+' loaded.':state.status==='cached'?'Saved tariffs available immediately'+(checked?' · checked '+checked:'')+' · checking latest data in the background…':state.status==='cached-offline'?'Using saved tariffs'+(checked?' checked '+checked:'')+' · the latest online check could not complete.':state.status==='stale'?'⚠️ Saved tariffs are materially stale'+(checked?' (last checked '+checked+')':'')+' and the latest confirmation is unavailable.':state.status==='error'?'Tariff data could not be reached and no saved snapshot is available. No figures are being guessed.':'Checking the latest tariff data…'}
var loadingFinished=false;
function finishLoading(mode){if(loadingFinished)return;loadingFinished=true;var cached=mode==='cache',ok=mode!=='error';$('loadingTitle').textContent=cached?'Saved tariff data ready':ok?'Latest tariff data ready':'Tariff data unavailable';$('loadingCopy').textContent=cached?'Calculations are ready while the latest data is checked in the background.':ok?'Calculations are ready.':'No saved tariff snapshot was available.';setTimeout(function(){$('loadingModal').classList.add('hide');setTimeout(function(){$('loadingModal').style.display='none'},220)},cached?40:ok?180:700)}
function load(){var cache=window.AppointmentCompanionTariffs;if(cache&&typeof cache.load==='function'){cache.load(FEED,{onData:function(d,info){state.data=d;state.tariffInfo=info||{};state.status=info&&info.source==='live'?'live':info&&info.materially_stale?'stale':'cached';render();finishLoading(info&&info.source==='live'?'live':'cache')},onError:function(err,info){state.tariffInfo=info||{};if(state.data){state.status=info&&info.materially_stale?'stale':'cached-offline';render()}else{state.status='error';render();finishLoading('error')}}}).catch(function(){if(!state.data){state.status='error';render();finishLoading('error')}});return}fetch(FEED,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(function(d){state.data=d;state.status='live';state.tariffInfo={source:'live',checked_at:new Date().toISOString()};render();finishLoading('live')}).catch(function(){state.status='error';render();finishLoading('error')})}
document.querySelectorAll('#vehiclePills .vpill').forEach(function(b){b.onclick=function(){document.querySelectorAll('#vehiclePills .vpill').forEach(function(x){x.classList.remove('on')});b.classList.add('on');state.eff=parseFloat(b.dataset.eff);state.icon=b.dataset.icon;render()}});
$('miles').oninput=render;
document.querySelectorAll('#periodToggle button').forEach(function(b){b.onclick=function(){state.period=b.dataset.period;document.querySelectorAll('#periodToggle button').forEach(function(x){x.classList.toggle('on',x===b)});render()}});
document.querySelectorAll('#usagePills button').forEach(function(b){b.onclick=function(){var u=b.dataset.use;state.usageMode=u;document.querySelectorAll('#usagePills button').forEach(function(x){x.classList.toggle('on',x===b)});if(u==='custom'){$('customWrap').classList.add('show');$('usageNote').textContent=Math.round(homeKwh()).toLocaleString('en-GB')+' kWh/year';$('houseKwh').focus()}else{$('customWrap').classList.remove('show');$('houseKwh').value=OFGEM[u];$('usageNote').textContent=OFGEM[u].toLocaleString('en-GB')+' kWh/year'}state.e7Actual=false;render()}});
$('houseKwh').oninput=function(){state.usageMode='custom';state.e7Actual=false;$('usageNote').textContent=Math.round(homeKwh()).toLocaleString('en-GB')+' kWh/year';render()};
$('usageTimingToggle').onclick=function(){state.timingOpen=!state.timingOpen;render()};
$('evTimingSlider').oninput=function(){state.evPct=clamp(parseFloat(this.value)||0,0,50);render()};
$('e7TimingSlider').oninput=function(){state.e7NightPct=clamp(parseFloat(this.value)||0,0,70);state.e7Actual=false;render()};
$('e7ActualToggle').onclick=function(){if(state.e7Actual){state.e7Actual=false}else{var ii=assumptions();state.e7Actual=true;state.e7DayActual=ii.e7Day;state.e7NightActual=ii.e7Night}render()};
$('billProfileToggle').onclick=function(){state.billProfileOpen=!state.billProfileOpen;state.timingOpen=true;render()};
$('billPeriodMode').onchange=function(){var dates=this.value==='dates';$('billDatesWrap').hidden=!dates;$('billMonthWrap').hidden=dates};
$('heatingProfile').onchange=function(){state.heating=this.value||'none';render()};
$('applyBillProfile').onclick=applyBillProfile;
document.querySelectorAll('#fixJanButtons button').forEach(function(b){b.onclick=function(){state.fixJan=parseFloat(b.dataset.fixjan)||0;document.querySelectorAll('#fixJanButtons button').forEach(function(x){x.classList.toggle('on',x===b)});render()}});

$('e7DayActualInput').onchange=function(){var v=parseFloat(this.value);state.e7DayActual=isNaN(v)?0:v;state.e7Actual=true;setCustomHomeFromActual();render()};
$('e7NightActualInput').onchange=function(){var v=parseFloat(this.value);state.e7NightActual=isNaN(v)?0:v;state.e7Actual=true;setCustomHomeFromActual();render()};
document.querySelectorAll('#serviceButtons button').forEach(function(b){b.onclick=function(){state.tier=parseInt(b.dataset.tier,10);render()}});
document.querySelectorAll('#stressButtons button').forEach(function(b){b.onclick=function(){state.stress=parseInt(b.dataset.stress,10)||0;document.querySelectorAll('#stressButtons button').forEach(function(x){x.classList.toggle('on',x===b)});render()}});
$('region').onchange=function(){state.region=parseInt(this.value,10);render()};
['awayPct','awayRate','effOverride','knownEvKwh'].forEach(function(id){$(id).oninput=render});$('dualFuel').onchange=render;
$('billMonth').value=String(new Date().getMonth());$('billPeriodMode').onchange();render();load();
})();
