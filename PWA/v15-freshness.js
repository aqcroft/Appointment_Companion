(function(){
'use strict';
var FEED='https://script.google.com/macros/s/AKfycbw-TllTpk_dbFjHhmojgeai9gKNGRzRaA_BtMooVSLeqvg614mONQyrpElC4M8vqP51/exec';
var $=function(id){return document.getElementById(id)};
var openPanel='';
function iso(v){var s=String(v||'').slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:''}
function londonToday(){var parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),o={};parts.forEach(function(p){o[p.type]=p.value});return o.year+'-'+o.month+'-'+o.day}
function qinfo(s){var p=String(s||'').split('-'),y=+p[0],m=+p[1];if(!y||!m)return null;var q=Math.floor((m-1)/3),d=[['❄️','Winter','Jan-Mar'],['🌱','Spring','Apr-Jun'],['☀️','Summer','Jul-Sep'],['🍂','Autumn','Oct-Dec']],sm=q*3+1,em=sm+2,last=new Date(y,em,0).getDate();return{q:q,year:y,icon:d[q][0],name:d[q][1],short:d[q][2],from:y+'-'+String(sm).padStart(2,'0')+'-01',to:y+'-'+String(em).padStart(2,'0')+'-'+String(last).padStart(2,'0')}}
function fmt(s){if(!s)return'—';var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
function fresh(row,now){if(!row)return null;var f=iso(row.valid_from!=null?row.valid_from:row.validFrom),t=iso(row.valid_to!=null?row.valid_to:row.validTo);if(f&&t)return now>=f&&now<=t;if(f){var a=qinfo(f),b=qinfo(now);return!!(a&&b&&a.q===b.q&&a.year===b.year)}return null}
function fixedSeries(rows){var counts={};rows.forEach(function(r){var type=String(r.tariff_type||r.tariffType||'').toLowerCase();if(type!=='fixed')return;var v=r.fixed_series!=null?r.fixed_series:r.fixedSeries,name=String(r.tariff_name||r.tariffName||'');var s=v==null?'':String(v).replace(/\D/g,'');if(!s){var m=name.match(/fixed(?:\s+saver|\s+start)?\s*(\d+)/i)||name.match(/(\d+)\s*$/);if(m)s=m[1]}if(s)counts[s]=(counts[s]||0)+1});var keys=Object.keys(counts);if(!keys.length)return'—';keys.sort(function(a,b){return counts[b]-counts[a]||(+b)-(+a)});return keys[0]}
function latest(meta){var v=meta&&(meta.latestFixedSeries!=null?meta.latestFixedSeries:meta.latest_fixed_series);return v==null?'':String(v).replace(/\D/g,'')}
function setPanel(which){openPanel=openPanel===which?'':which;$('fixedFreshDetail').hidden=openPanel!=='fixed';$('variableFreshDetail').hidden=openPanel!=='variable';$('fixedFresh').setAttribute('aria-expanded',openPanel==='fixed'?'true':'false');$('variableFresh').setAttribute('aria-expanded',openPanel==='variable'?'true':'false')}
function render(data){var rows=Array.isArray(data.tariffLive)?data.tariffLive:[],meta=data.meta||{},loaded=fixedSeries(rows),last=latest(meta),now=londonToday(),fixedBtn=$('fixedFresh');
  $('fixedTopSeries').textContent=loaded;fixedBtn.classList.remove('good','stale');
  var fixedState=$('fixedDetailState');fixedState.className='';$('fixedDetailTitle').textContent='🔒 Fixed '+loaded;
  if(loaded==='—'){$('fixedDetailText').textContent='No fixed tariff version could be identified in the loaded tariff rows.';fixedState.textContent='Version unavailable';fixedState.className='stale';fixedBtn.classList.add('stale')}
  else if(last&&last!==loaded){$('fixedDetailText').textContent='Fixed '+loaded+' is loaded. Feed metadata reports Fixed '+last+' as the latest published series.';fixedState.textContent='⚠️ Check version';fixedState.className='stale';fixedBtn.classList.add('stale')}
  else{$('fixedDetailText').textContent='Fixed '+loaded+' suite is loaded'+(last?' and matches the latest published series recorded by the feed.':'.');fixedState.textContent='✓ Current';fixedBtn.classList.add('good')}

  var standard=null;for(var i=0;i<rows.length;i++){var typ=String(rows[i].tariff_type||rows[i].tariffType||'').toLowerCase();if(typ==='variable'){standard=rows[i];break}}
  var from=standard?iso(standard.valid_from||standard.validFrom):'',to=standard?iso(standard.valid_to||standard.validTo):'',qi=qinfo(from),cq=qinfo(now),isFresh=fresh(standard,now),btn=$('variableFresh');
  btn.classList.remove('good','stale');if(isFresh===true)btn.classList.add('good');else if(isFresh===false)btn.classList.add('stale');
  $('seasonIcon').textContent=qi?qi.icon:'◷';btn.setAttribute('aria-label',qi?(qi.name+' variable tariff period '+qi.short+' '+qi.year):'Standard variable tariff period');
  $('seasonDetailTitle').textContent=(qi?qi.icon+' '+qi.name+' ':'')+'standard variable period';$('seasonDetailDates').textContent=from&&to?'Rates applied: '+fmt(from)+' to '+fmt(to):(from?'Rates loaded from '+fmt(from):'No validity dates found in the loaded standard variable row.');
  var ds=$('seasonDetailState');ds.className='';if(isFresh===true)ds.textContent='✓ Current';else if(isFresh===false){ds.textContent='⚠️ Out of date';ds.className='stale'}else ds.textContent='Date check unavailable';
  var stale=false;for(i=0;i<rows.length;i++){var t=String(rows[i].tariff_type||rows[i].tariffType||'').toLowerCase();if((t==='variable'||t==='variable_ev')&&fresh(rows[i],now)===false){stale=true;break}}
  var parts=[];if(stale&&qi&&cq)parts.push('<strong>⚠️ VARIABLE TARIFF DATA NEEDS UPDATING</strong>The tool is still using '+qi.name+' ('+fmt(from)+' to '+fmt(to)+') variable data, but today falls in '+cq.name+' ('+fmt(cq.from)+' to '+fmt(cq.to)+'). Variable and EV comparisons may be out of date until UW publishes the new rates and Tariff_Live is refreshed.');if(last&&loaded!=='—'&&last!==loaded)parts.push('<strong>⚠️ FIXED TARIFF VERSION MISMATCH</strong>Fixed '+loaded+' is loaded, but the feed metadata says Fixed '+last+' is the latest published series.');$('freshWarning').innerHTML=parts.join('<br>');$('freshWarning').hidden=!parts.length;
}
$('fixedFresh').addEventListener('click',function(){setPanel('fixed')});
$('variableFresh').addEventListener('click',function(){setPanel('variable')});
fetch(FEED,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error();return r.json()}).then(render).catch(function(){$('fixedTopSeries').textContent='—';$('fixedFresh').classList.add('stale');$('seasonIcon').textContent='⚠️';$('variableFresh').classList.add('stale');$('fixedDetailState').textContent='Unavailable';$('seasonDetailState').textContent='Unavailable';});
})();
